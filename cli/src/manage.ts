#!/usr/bin/env node

/**
 * keel CLI — Project management & sail tool (a codai project)
 *
 * Used from inside a keel project to manage sails, generate code,
 * run database operations, and perform health checks.
 *
 * Usage:
 *   npx @codaijs/keel sail add <name>        — install a sail into the current project
 *   npx @codaijs/keel sail remove <name>     — remove a sail from the current project
 *   npx @codaijs/keel list                   — list available sails with status
 *   npx @codaijs/keel info <name>            — show sail details
 *   npx @codaijs/keel doctor                 — run project health checks
 *   npx @codaijs/keel generate route <name>  — scaffold a new API route
 *   npx @codaijs/keel generate page <name>   — scaffold a new React page
 *   npx @codaijs/keel generate email <name>  — scaffold a new email template
 *   npx @codaijs/keel db:reset               — drop and recreate database schema
 *   npx @codaijs/keel db:studio              — open Drizzle Studio
 *   npx @codaijs/keel db:seed                — run database seed file
 *   npx @codaijs/keel env                    — check environment variables
 *   npx @codaijs/keel upgrade                — upgrade keel CLI to latest version
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync, spawn } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import { confirm } from "@inquirer/prompts";
import { installSailByName } from "./sail-installer.js";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Directory where sail definitions are bundled (shipped with the npm package). */
const BUNDLED_SAILS_DIR = join(__dirname, "..", "sails");

/** Path to the registry of all available sails. */
const REGISTRY_PATH = join(BUNDLED_SAILS_DIR, "registry.json");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegistrySail {
  name: string;
  displayName: string;
  description: string;
  category: string;
  version: string;
  status?: string;
  routes?: string[];
  envVars?: string[];
  conflicts?: string[];
}

interface Registry {
  version: string;
  sails: RegistrySail[];
}

interface InstalledSailEntry {
  name: string;
  version: string;
  installedAt: string;
}

interface InstalledJson {
  version?: number;
  installed: (string | InstalledSailEntry)[];
}

interface SailManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  compatibility: string;
  requiredEnvVars: { key: string; description: string }[];
  dependencies: {
    backend: Record<string, string>;
    frontend: Record<string, string>;
  };
  modifies: {
    backend: string[];
    frontend: string[];
  };
  adds: {
    backend: string[];
    frontend: string[];
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadRegistry(): Registry {
  try {
    return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
  } catch (error) {
    throw new Error(`Failed to parse sail registry at ${REGISTRY_PATH}: ${(error as Error).message}`);
  }
}

function getInstalledJsonPath(): string {
  return join(process.cwd(), "sails", "installed.json");
}

function loadInstalled(): InstalledJson {
  const path = getInstalledJsonPath();
  if (!existsSync(path)) {
    return { installed: [] };
  }
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch (error) {
    throw new Error(`Failed to parse installed.json at ${path}: ${(error as Error).message}`);
  }
}

function saveInstalled(data: InstalledJson): void {
  const path = getInstalledJsonPath();
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function isInsideKeelProject(): boolean {
  return existsSync(getInstalledJsonPath());
}

/** Normalize installed entries — handles both legacy string[] and new object[] formats. */
function getInstalledNames(data: InstalledJson): string[] {
  return data.installed.map((entry) =>
    typeof entry === "string" ? entry : entry.name
  );
}

/** Get the installed version of a sail, or null if not tracked. */
function getInstalledVersion(data: InstalledJson, sailName: string): string | null {
  for (const entry of data.installed) {
    if (typeof entry === "object" && entry.name === sailName) {
      return entry.version;
    }
  }
  return null;
}

/** Migrate legacy string[] format to new object[] format. */
function migrateInstalledJson(data: InstalledJson): InstalledJson {
  if (data.version === 2) return data;
  const migrated: InstalledJson = {
    version: 2,
    installed: data.installed.map((entry) => {
      if (typeof entry === "string") {
        return { name: entry, version: "unknown", installedAt: new Date().toISOString() };
      }
      return entry;
    }),
  };
  saveInstalled(migrated);
  return migrated;
}

function getSailDir(sailName: string): string {
  if (/[./\\]/.test(sailName)) {
    throw new Error(`Invalid sail name: "${sailName}" — must not contain ".", "/", or "\\".`);
  }
  const resolved = resolve(BUNDLED_SAILS_DIR, sailName);
  if (!resolved.startsWith(BUNDLED_SAILS_DIR + "/") && resolved !== BUNDLED_SAILS_DIR) {
    throw new Error(`Invalid sail name: "${sailName}" — resolved path escapes sails directory.`);
  }
  return resolved;
}

function requireKeelProject(): void {
  if (!isInsideKeelProject()) {
    console.error(chalk.red("\n  Error: Not inside a keel project."));
    console.error(
      chalk.gray("  Run this command from the root of a keel project")
    );
    console.error(
      chalk.gray("  (a directory containing sails/installed.json).\n")
    );
    process.exit(1);
  }
}

function loadSailManifest(sailName: string): SailManifest | null {
  const manifestPath = join(getSailDir(sailName), "addon.json");
  if (!existsSync(manifestPath)) return null;
  try {
    return JSON.parse(readFileSync(manifestPath, "utf-8"));
  } catch (error) {
    throw new Error(`Failed to parse sail manifest at ${manifestPath}: ${(error as Error).message}`);
  }
}

/**
 * Try to find and parse the project .env file.
 * Checks project root and packages/backend/.env.
 */
function loadEnvFile(): Record<string, string> {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "packages", "backend", ".env"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      const content = readFileSync(candidate, "utf-8");
      const vars: Record<string, string> = {};
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;
        const eqIndex = trimmed.indexOf("=");
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        let value = trimmed.slice(eqIndex + 1).trim();
        // Remove surrounding quotes
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        vars[key] = value;
      }
      return vars;
    }
  }
  return {};
}

function getEnvFilePath(): string | null {
  const candidates = [
    join(process.cwd(), ".env"),
    join(process.cwd(), "packages", "backend", ".env"),
  ];
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function toPascalCase(str: string): string {
  return str
    .split(/[-_]/)
    .map((s) => capitalize(s))
    .join("");
}

function validateGeneratorName(name: string): string {
  if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
    console.error(chalk.red("  Error: Name must start with a letter and contain only letters, numbers, hyphens, and underscores."));
    process.exit(1);
  }
  const pascal = toPascalCase(name);
  if (!/^[A-Z][a-zA-Z0-9]*$/.test(pascal)) {
    console.error(chalk.red("  Error: Name produces an invalid identifier after transformation."));
    process.exit(1);
  }
  return name;
}

// ---------------------------------------------------------------------------
// Commands — Sail Management
// ---------------------------------------------------------------------------

async function commandAdd(sailName: string): Promise<void> {
  requireKeelProject();

  // Check sail exists in registry
  const registry = loadRegistry();
  const registryEntry = registry.sails.find((a) => a.name === sailName);

  if (!registryEntry) {
    console.error(chalk.red(`\n  Error: Unknown sail "${sailName}".`));
    console.error(chalk.gray("  Run 'keel list' to see available sails.\n"));
    process.exit(1);
  }

  if (registryEntry.status === "planned") {
    console.error(
      chalk.yellow(`\n  Sail "${sailName}" is planned but not yet available.`)
    );
    console.error(chalk.gray("  Check back in a future release.\n"));
    process.exit(1);
  }

  // Check sail definition exists in bundled sails
  const sailDir = getSailDir(sailName);
  if (!existsSync(join(sailDir, "addon.json"))) {
    console.error(
      chalk.red(`\n  Error: Sail definition not found for "${sailName}".`)
    );
    console.error(
      chalk.gray("  The sail may not be bundled in this version of keel.\n")
    );
    process.exit(1);
  }

  // Check if already installed
  const installed = migrateInstalledJson(loadInstalled());
  const installedNames = getInstalledNames(installed);
  if (installedNames.includes(sailName)) {
    console.log(
      chalk.yellow(`\n  Sail "${sailName}" is already installed.\n`)
    );
    process.exit(0);
  }

  // Check sail compatibility — warn about conflicts with installed sails
  if (registryEntry.conflicts && registryEntry.conflicts.length > 0) {
    const conflicting = registryEntry.conflicts.filter((c) =>
      installedNames.includes(c)
    );
    if (conflicting.length > 0) {
      const conflictNames = conflicting
        .map((c) => {
          const entry = registry.sails.find((s) => s.name === c);
          return entry ? entry.displayName : c;
        })
        .join(", ");
      console.error(
        chalk.red(`\n  Error: "${sailName}" conflicts with installed sail(s): ${conflictNames}`)
      );
      console.error(
        chalk.gray(`  These sails modify the same areas and cannot be used together.`)
      );
      console.error(
        chalk.gray(`  Remove the conflicting sail first with: keel sail remove <name>\n`)
      );
      process.exit(1);
    }
  }

  // Check for route collisions with installed sails
  if (registryEntry.routes && registryEntry.routes.length > 0) {
    for (const installedSailName of installedNames) {
      const installedEntry = registry.sails.find((s) => s.name === installedSailName);
      if (installedEntry?.routes) {
        const overlapping = registryEntry.routes.filter((r) =>
          installedEntry.routes!.includes(r)
        );
        if (overlapping.length > 0) {
          console.log(
            chalk.yellow(`\n  Warning: "${sailName}" adds route(s) ${overlapping.join(", ")} which overlap with "${installedSailName}".`)
          );
          console.log(
            chalk.gray(`  You may need to resolve route conflicts manually.\n`)
          );
        }
      }
    }
  }

  // Check for env var collisions with installed sails
  if (registryEntry.envVars && registryEntry.envVars.length > 0) {
    for (const installedSailName of installedNames) {
      const installedEntry = registry.sails.find((s) => s.name === installedSailName);
      if (installedEntry?.envVars) {
        const overlapping = registryEntry.envVars.filter((e) =>
          installedEntry.envVars!.includes(e)
        );
        if (overlapping.length > 0) {
          console.log(
            chalk.yellow(`\n  Warning: "${sailName}" uses env var(s) ${overlapping.join(", ")} which are also used by "${installedSailName}".`)
          );
        }
      }
    }
  }

  // Install the sail
  const projectDir = process.cwd();
  const spinner = ora(`  Installing ${registryEntry.displayName}...`).start();

  try {
    await installSailByName(sailName, sailDir, projectDir);
    spinner.succeed(`  ${registryEntry.displayName} installed successfully`);

    // Update installed.json with version tracking
    installed.installed.push({
      name: sailName,
      version: registryEntry.version,
      installedAt: new Date().toISOString(),
    });
    saveInstalled(installed);

    console.log();
    console.log(chalk.gray(`  Updated sails/installed.json (${sailName}@${registryEntry.version})`));
    console.log();
  } catch (error) {
    spinner.fail(`  Failed to install ${sailName}`);
    console.error(chalk.red(`    ${error}`));
    process.exit(1);
  }
}

async function commandRemove(sailName: string): Promise<void> {
  requireKeelProject();

  const installed = migrateInstalledJson(loadInstalled());
  const installedNames = getInstalledNames(installed);
  if (!installedNames.includes(sailName)) {
    console.error(chalk.red(`\n  Error: Sail "${sailName}" is not installed.`));
    console.error(chalk.gray("  Run 'keel list' to see installed sails.\n"));
    process.exit(1);
  }

  const manifest = loadSailManifest(sailName);

  console.log();
  console.log(chalk.bold(`  Removing sail: ${sailName}`));
  console.log();

  // Show files that were added
  const addedFiles: string[] = [];
  if (manifest) {
    if (manifest.adds.backend) {
      for (const f of manifest.adds.backend) {
        addedFiles.push(join("packages", "backend", f));
      }
    }
    if (manifest.adds.frontend) {
      for (const f of manifest.adds.frontend) {
        addedFiles.push(join("packages", "frontend", f));
      }
    }
  }

  if (addedFiles.length > 0) {
    console.log(chalk.bold("  Files that will be removed:"));
    for (const f of addedFiles) {
      console.log(`    ${chalk.red("-")} ${f}`);
    }
    console.log();
  }

  // Show modified files
  const modifiedFiles: string[] = [];
  if (manifest) {
    if (manifest.modifies.backend) {
      for (const f of manifest.modifies.backend) {
        modifiedFiles.push(join("packages", "backend", f));
      }
    }
    if (manifest.modifies.frontend) {
      for (const f of manifest.modifies.frontend) {
        modifiedFiles.push(join("packages", "frontend", f));
      }
    }
  }

  if (modifiedFiles.length > 0) {
    console.log(chalk.bold("  Files that were modified (need manual cleanup):"));
    for (const f of modifiedFiles) {
      console.log(`    ${chalk.yellow("~")} ${f}`);
    }
    console.log();
  }

  // Confirm removal
  const shouldRemove = await confirm({
    message: "  Proceed with removal?",
    default: false,
  });

  if (!shouldRemove) {
    console.log(chalk.gray("\n  Removal cancelled.\n"));
    return;
  }

  // Remove added files
  let removedCount = 0;
  for (const f of addedFiles) {
    const fullPath = join(process.cwd(), f);
    if (existsSync(fullPath)) {
      unlinkSync(fullPath);
      removedCount++;
    }
  }

  if (removedCount > 0) {
    console.log(chalk.green(`\n  Removed ${removedCount} file(s).`));
  }

  // Print manual cleanup instructions
  if (modifiedFiles.length > 0) {
    console.log();
    console.log(chalk.yellow("  Manual cleanup required:"));
    console.log(chalk.gray("  The following files had code injected by this sail."));
    console.log(chalk.gray("  You need to manually remove the sail-related code:\n"));
    for (const f of modifiedFiles) {
      console.log(`    ${chalk.cyan(f)}`);
    }
    console.log();
    console.log(chalk.gray("  Look for code between sail marker comments and remove"));
    console.log(chalk.gray("  the lines that were added by this sail."));
  }

  // Update installed.json
  installed.installed = installed.installed.filter((entry) =>
    typeof entry === "string" ? entry !== sailName : entry.name !== sailName
  );
  saveInstalled(installed);

  console.log();
  console.log(chalk.green(`  Sail "${sailName}" removed from installed.json.`));
  console.log();
}

async function commandSailUpdate(sailName?: string): Promise<void> {
  requireKeelProject();

  const registry = loadRegistry();
  const installed = migrateInstalledJson(loadInstalled());
  const installedNames = getInstalledNames(installed);

  console.log();
  console.log(chalk.bold.blue("  ⛵ Sail Update Check"));
  console.log();

  // Find sails with available updates
  const updatable: { name: string; current: string; latest: string; displayName: string }[] = [];

  const sailsToCheck = sailName ? [sailName] : installedNames;

  for (const name of sailsToCheck) {
    if (!installedNames.includes(name)) {
      console.log(chalk.red(`  Sail "${name}" is not installed.`));
      console.log();
      return;
    }

    const registryEntry = registry.sails.find((s) => s.name === name);
    if (!registryEntry) continue;

    const currentVersion = getInstalledVersion(installed, name);
    if (!currentVersion || currentVersion === "unknown") {
      updatable.push({ name, current: "unknown", latest: registryEntry.version, displayName: registryEntry.displayName });
    } else if (currentVersion !== registryEntry.version) {
      updatable.push({ name, current: currentVersion, latest: registryEntry.version, displayName: registryEntry.displayName });
    }
  }

  if (updatable.length === 0) {
    console.log(chalk.green("  All sails are up to date."));
    console.log();
    return;
  }

  console.log(chalk.bold("  Updates available:"));
  console.log();

  for (const sail of updatable) {
    console.log(`    ${sail.displayName.padEnd(24)} ${chalk.yellow(sail.current)} → ${chalk.green(sail.latest)}`);
  }

  console.log();
  console.log(chalk.bold("  How to update sails:"));
  console.log();
  console.log(chalk.gray("  Sails inject code directly into your project files. To update:"));
  console.log();
  console.log(`    1. Review the changelog for the sail in the keel repository`);
  console.log(`    2. ${chalk.cyan("keel sail remove <name>")}   — remove the old version`);
  console.log(`    3. ${chalk.cyan("keel sail add <name>")}      — reinstall the latest version`);
  console.log(`    4. Resolve any conflicts with your custom changes`);
  console.log();
  console.log(chalk.gray("  Tip: Commit your changes before updating so you can compare diffs."));
  console.log();

  // Do not mutate installed versions here — the actual code hasn't been
  // updated yet. Versions only change when the user reinstalls the sail.
}

function commandList(): void {
  const registry = loadRegistry();
  const installed = isInsideKeelProject() ? migrateInstalledJson(loadInstalled()) : { version: 2, installed: [] };
  const installedNames = getInstalledNames(installed);

  console.log();
  console.log(chalk.bold("  Available sails:"));
  console.log();

  // Column formatting
  const maxName = Math.max(...registry.sails.map((a) => a.displayName.length));

  for (const sail of registry.sails) {
    const isInstalled = installedNames.includes(sail.name);
    const isPlanned = sail.status === "planned";
    const installedVersion = isInstalled ? getInstalledVersion(installed, sail.name) : null;
    const hasUpdate = isInstalled && installedVersion && installedVersion !== "unknown" && installedVersion !== sail.version;

    let status: string;
    if (isInstalled && hasUpdate) {
      status = chalk.yellow(`installed (${installedVersion} → ${sail.version})`);
    } else if (isInstalled) {
      status = chalk.green(`installed${installedVersion && installedVersion !== "unknown" ? ` (${installedVersion})` : ""}`);
    } else if (isPlanned) {
      status = chalk.gray("planned");
    } else {
      status = chalk.blue("available");
    }

    const name = sail.displayName.padEnd(maxName + 2);
    console.log(`    ${name} ${status}  ${chalk.gray(sail.description)}`);
  }

  console.log();

  if (!isInsideKeelProject()) {
    console.log(
      chalk.gray("  Note: Not inside a keel project. Install status not shown.\n")
    );
  }
}

function commandInfo(sailName: string): void {
  const registry = loadRegistry();
  const registryEntry = registry.sails.find((a) => a.name === sailName);

  if (!registryEntry) {
    console.error(chalk.red(`\n  Error: Unknown sail "${sailName}".`));
    console.error(chalk.gray("  Run 'keel list' to see available sails.\n"));
    process.exit(1);
  }

  console.log();
  console.log(chalk.bold(`  ${registryEntry.displayName}`));
  console.log(chalk.gray(`  ${registryEntry.description}`));
  console.log();
  console.log(`  Category: ${registryEntry.category}`);
  console.log(`  Version:  ${registryEntry.version}`);

  if (registryEntry.status === "planned") {
    console.log(`  Status:   ${chalk.yellow("planned (not yet available)")}`);
    console.log();
    return;
  }

  // Load full manifest if available
  const manifest = loadSailManifest(sailName);

  if (manifest) {
    if (manifest.requiredEnvVars.length > 0) {
      console.log();
      console.log(chalk.bold("  Required environment variables:"));
      for (const envVar of manifest.requiredEnvVars) {
        console.log(`    ${envVar.key}  ${chalk.gray(envVar.description)}`);
      }
    }

    const allAdds = [
      ...(manifest.adds.backend || []).map((f) => `packages/backend/${f}`),
      ...(manifest.adds.frontend || []).map((f) => `packages/frontend/${f}`),
    ];
    if (allAdds.length > 0) {
      console.log();
      console.log(chalk.bold("  Files added:"));
      for (const f of allAdds) {
        console.log(`    + ${f}`);
      }
    }

    const allModifies = [
      ...(manifest.modifies.backend || []).map((f) => `packages/backend/${f}`),
      ...(manifest.modifies.frontend || []).map((f) => `packages/frontend/${f}`),
    ];
    if (allModifies.length > 0) {
      console.log();
      console.log(chalk.bold("  Files modified:"));
      for (const f of allModifies) {
        console.log(`    ~ ${f}`);
      }
    }

    const backendDeps = Object.entries(manifest.dependencies.backend || {});
    const frontendDeps = Object.entries(manifest.dependencies.frontend || {});
    if (backendDeps.length > 0 || frontendDeps.length > 0) {
      console.log();
      console.log(chalk.bold("  Dependencies:"));
      for (const [name, version] of backendDeps) {
        console.log(`    backend:  ${name}@${version}`);
      }
      for (const [name, version] of frontendDeps) {
        console.log(`    frontend: ${name}@${version}`);
      }
    }
  }

  // Check installation status
  if (isInsideKeelProject()) {
    const installed = migrateInstalledJson(loadInstalled());
    const isInstalled = getInstalledNames(installed).includes(sailName);
    console.log();
    console.log(
      `  Status: ${isInstalled ? chalk.green("installed") : chalk.blue("not installed")}`
    );
    if (!isInstalled) {
      console.log(
        chalk.gray(`  Install with: keel sail add ${sailName}`)
      );
    }
  }

  console.log();
}

// ---------------------------------------------------------------------------
// Commands — Dev & Start
// ---------------------------------------------------------------------------

function runSync(cmd: string, label: string): boolean {
  const spinner = ora(`  ${label}...`).start();
  try {
    const [bin, ...args] = cmd.split(" ");
    execFileSync(bin, args, { cwd: process.cwd(), stdio: "pipe" });
    spinner.succeed(`  ${label}`);
    return true;
  } catch {
    spinner.fail(`  ${label} — failed`);
    return false;
  }
}

function hasDockerCompose(): boolean {
  return existsSync(join(process.cwd(), "docker-compose.yml"));
}

function hasDocker(): boolean {
  try {
    execFileSync("docker", ["info"], { stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Start database via docker compose. Treats "already running" as success.
 */
function startDatabase(): void {
  const spinner = ora("  Starting database...").start();
  try {
    const output = execFileSync("docker", ["compose", "up", "-d"], {
      cwd: process.cwd(),
      stdio: "pipe",
    }).toString();
    // Check if output mentions "running" or "Started" — both mean success
    if (output.includes("Running") || output.includes("Started") || output.includes("running")) {
      spinner.succeed("  Database running");
    } else {
      spinner.succeed("  Database running");
    }
  } catch (error: unknown) {
    const stderr = (error as { stderr?: Buffer }).stderr?.toString() ?? "";
    // Port already allocated = DB is already running from a previous session
    if (stderr.includes("port is already allocated") || stderr.includes("already in use")) {
      spinner.succeed("  Database already running");
    } else {
      spinner.fail("  Failed to start database");
      if (stderr) console.log(chalk.gray(`    ${stderr.trim()}`));
    }
  }
}

/**
 * Replace the current process with the given command.
 * Uses spawn with inherited stdio so Ctrl+C / SIGINT propagates correctly.
 * The child is spawned in a detached process group so that SIGTERM can
 * reliably kill the entire tree (e.g. concurrently-managed dev servers).
 */
function replaceProcess(cmd: string, args: string[]): void {
  const child = spawn(cmd, args, {
    cwd: process.cwd(),
    stdio: "inherit",
    detached: true,
  });

  // Prevent the parent ref from keeping Node alive after child exits
  child.unref();

  // Re-ref so we can wait for the close event
  child.ref();

  /**
   * Kill the entire process group. Using -pid sends the signal to every
   * process in the group, which covers forked dev servers, Vite, tsx, etc.
   */
  function killTree(signal: NodeJS.Signals): void {
    if (child.pid) {
      try {
        process.kill(-child.pid, signal);
      } catch {
        // Process group may already be gone
        child.kill(signal);
      }
    }
  }

  // Strip terminal escape sequences from child output is handled by
  // inheriting stdio directly — no extra processing needed.

  process.on("SIGINT", () => {
    killTree("SIGTERM");
    // Give child processes a moment to clean up, then force exit
    setTimeout(() => process.exit(0), 1000);
  });
  process.on("SIGTERM", () => {
    killTree("SIGTERM");
    setTimeout(() => process.exit(0), 1000);
  });

  child.on("close", (code) => {
    process.exit(code ?? 0);
  });
}

async function commandDev(): Promise<void> {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.blue("  ⛵ keel dev"));
  console.log();

  // Check if using PGlite (no Docker needed)
  const envVars = loadEnvFile();
  const usingPGlite = envVars.DATABASE_URL?.startsWith("pglite://");

  // Step 1: Start Docker database if docker-compose exists (skip for PGlite)
  if (usingPGlite) {
    console.log(chalk.green("  ✔ Using PGlite (embedded PostgreSQL) — no Docker needed"));
  } else if (hasDockerCompose()) {
    if (hasDocker()) {
      startDatabase();
    } else {
      console.log(chalk.yellow("  ⚠ docker-compose.yml found but Docker is not running"));
      console.log(chalk.gray("    Make sure your database is accessible via DATABASE_URL\n"));
    }
  }

  // Step 2: Run migrations
  runSync("npm run db:migrate", "Running migrations");

  // Step 3: Start dev servers
  console.log();
  console.log(chalk.bold("  Starting dev servers...\n"));

  replaceProcess("npm", ["run", "dev"]);
}

async function commandStart(): Promise<void> {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.blue("  ⛵ keel start"));
  console.log();

  // Step 1: Start Docker database if docker-compose exists
  if (hasDockerCompose()) {
    if (hasDocker()) {
      startDatabase();
    } else {
      console.log(chalk.yellow("  ⚠ docker-compose.yml found but Docker is not running"));
      console.log(chalk.gray("    Make sure your database is accessible via DATABASE_URL\n"));
    }
  }

  // Step 2: Run migrations
  runSync("npm run db:migrate", "Running migrations");

  // Step 3: Build all packages
  if (!runSync("npm run build", "Building packages")) {
    console.error(chalk.red("\n  Build failed. Fix errors and try again.\n"));
    process.exit(1);
  }

  // Step 4: Start production server
  console.log();
  console.log(chalk.bold("  Starting production server...\n"));

  replaceProcess("node", ["packages/backend/dist/index.js"]);
}

// ---------------------------------------------------------------------------
// Commands — Doctor (Health Check)
// ---------------------------------------------------------------------------

async function commandDoctor(): Promise<void> {
  console.log();
  console.log(chalk.bold.blue("  ⛵ keel doctor"));
  console.log();

  const pass = (msg: string) => console.log(`  ${chalk.green("✔")} ${msg}`);
  const fail = (msg: string) => console.log(`  ${chalk.red("✘")} ${msg}`);
  const warn = (msg: string) => console.log(`  ${chalk.yellow("⚠")} ${msg}`);

  // Node.js version
  const nodeVersion = process.version;
  const nodeMajor = parseInt(nodeVersion.slice(1).split(".")[0], 10);
  if (nodeMajor >= 22) {
    pass(`Node.js ${nodeVersion}`);
  } else {
    fail(`Node.js ${nodeVersion} — version 22+ required`);
  }

  // npm version
  try {
    const npmVersion = execFileSync("npm", ["--version"], { stdio: "pipe" }).toString().trim();
    pass(`npm ${npmVersion}`);
  } catch {
    fail("npm — not found");
  }

  // Docker available and running
  try {
    execFileSync("docker", ["info"], { stdio: "pipe" });
    pass("Docker is running");
  } catch {
    try {
      execFileSync("docker", ["--version"], { stdio: "pipe" });
      fail("Docker is installed but not running");
    } catch {
      fail("Docker is not installed");
    }
  }

  // PostgreSQL reachable via DATABASE_URL
  const envVars = loadEnvFile();
  if (envVars.DATABASE_URL) {
    try {
      execFileSync("node", [
        "-e",
        `const { Client } = require('pg'); const c = new Client(process.env.DATABASE_URL); c.connect().then(() => { c.end(); process.exit(0); }).catch(() => process.exit(1))`,
      ], { stdio: "pipe", timeout: 5000, env: { ...process.env, DATABASE_URL: envVars.DATABASE_URL } });
      pass("PostgreSQL is reachable");
    } catch {
      // Try a simpler check — see if psql is available via Docker
      try {
        execFileSync("docker", [
          "exec", "-i",
          execFileSync("docker", ["ps", "-q", "--filter", "ancestor=postgres"], { stdio: "pipe", timeout: 5000 }).toString().trim().split("\n")[0],
          "pg_isready",
        ], { stdio: "pipe", timeout: 5000 });
        pass("PostgreSQL is reachable (via Docker)");
      } catch {
        warn("PostgreSQL — could not verify connection (DATABASE_URL is set)");
      }
    }
  } else {
    fail("PostgreSQL — DATABASE_URL not set in .env");
  }

  // .env file exists with required vars
  const envPath = getEnvFilePath();
  if (envPath) {
    pass(`.env file found (${envPath})`);
  } else {
    fail(".env file not found");
  }

  if (envVars.DATABASE_URL) {
    pass("DATABASE_URL is set");
  } else {
    fail("DATABASE_URL is missing");
  }

  if (envVars.BETTER_AUTH_SECRET) {
    pass("BETTER_AUTH_SECRET is set");
  } else {
    fail("BETTER_AUTH_SECRET is missing");
  }

  // node_modules exists
  if (existsSync(join(process.cwd(), "node_modules"))) {
    pass("node_modules exists (dependencies installed)");
  } else {
    fail("node_modules not found — run 'npm install'");
  }

  // TypeScript (optional)
  try {
    const tscVersion = execFileSync("npx", ["tsc", "--version"], { stdio: "pipe", timeout: 10000 }).toString().trim();
    pass(`TypeScript ${tscVersion}`);
  } catch {
    warn("TypeScript — tsc not found (optional)");
  }

  console.log();
}

// ---------------------------------------------------------------------------
// Commands — Code Generators
// ---------------------------------------------------------------------------

function commandGenerateRoute(name: string): void {
  requireKeelProject();
  validateGeneratorName(name);

  const filePath = join(process.cwd(), "packages", "backend", "src", "routes", `${name}.ts`);

  if (existsSync(filePath)) {
    console.error(chalk.red(`\n  Error: Route file already exists at ${filePath}\n`));
    process.exit(1);
  }

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = `import { Router } from "express";
import type { Request, Response } from "express";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  res.json({ message: "${name} route" });
});

export default router;
`;

  writeFileSync(filePath, content, "utf-8");

  // Auto-mount the route in index.ts
  const indexPath = join(process.cwd(), "packages", "backend", "src", "index.ts");
  const importLine = `import ${name}Router from "./routes/${name}.js";`;
  const mountLine = `app.use("/api/${name}", ${name}Router);`;
  let autoMounted = false;

  if (existsSync(indexPath)) {
    let indexContent = readFileSync(indexPath, "utf-8");

    // Add import after SAIL_IMPORTS marker
    if (indexContent.includes("// [SAIL_IMPORTS]") && !indexContent.includes(importLine)) {
      indexContent = indexContent.replace("// [SAIL_IMPORTS]", `// [SAIL_IMPORTS]\n${importLine}`);
    }

    // Add mount before SAIL_ROUTES marker
    if (indexContent.includes("// [SAIL_ROUTES]") && !indexContent.includes(mountLine)) {
      indexContent = indexContent.replace("// [SAIL_ROUTES]", `${mountLine}\n// [SAIL_ROUTES]`);
    }

    writeFileSync(indexPath, indexContent, "utf-8");
    autoMounted = true;
  }

  console.log();
  console.log(chalk.green(`  Created: packages/backend/src/routes/${name}.ts`));
  if (autoMounted) {
    console.log(chalk.green(`  Mounted: app.use("/api/${name}", ${name}Router) in index.ts`));
    console.log();
    console.log(chalk.gray(`  Ready at: /api/${name}`));
  } else {
    console.log();
    console.log(chalk.yellow("  Could not auto-mount. Manually add to packages/backend/src/index.ts:"));
    console.log(chalk.cyan(`    ${importLine}`));
    console.log(chalk.cyan(`    ${mountLine}`));
  }
  console.log();
}

function commandGeneratePage(name: string): void {
  requireKeelProject();
  validateGeneratorName(name);

  const pascalName = toPascalCase(name);
  const filePath = join(process.cwd(), "packages", "frontend", "src", "pages", `${pascalName}.tsx`);

  if (existsSync(filePath)) {
    console.error(chalk.red(`\n  Error: Page file already exists at ${filePath}\n`));
    process.exit(1);
  }

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = `export default function ${pascalName}() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">${pascalName}</h1>
      <p className="mt-4 text-gray-600">This is the ${pascalName} page.</p>
    </div>
  );
}
`;

  writeFileSync(filePath, content, "utf-8");

  // Auto-add route to router.tsx
  const routerPath = join(process.cwd(), "packages", "frontend", "src", "router.tsx");
  const importLine = `import ${pascalName} from "./pages/${pascalName}";`;
  const routeLine = `        <Route path="/${name}" element={<${pascalName} />} />`;
  let autoRouted = false;

  if (existsSync(routerPath)) {
    let routerContent = readFileSync(routerPath, "utf-8");

    // Add import if not already present
    if (!routerContent.includes(importLine)) {
      // Insert after the SAIL_IMPORTS marker (or after the last import if marker missing)
      if (routerContent.includes("// [SAIL_IMPORTS]")) {
        routerContent = routerContent.replace("// [SAIL_IMPORTS]", `// [SAIL_IMPORTS]\n${importLine}`);
      } else {
        const lastImportIdx = routerContent.lastIndexOf("import ");
        const nextNewline = routerContent.indexOf("\n", lastImportIdx);
        routerContent = routerContent.slice(0, nextNewline + 1) + importLine + "\n" + routerContent.slice(nextNewline + 1);
      }
    }

    // Add route before SAIL_ROUTES marker
    if (!routerContent.includes(`path="/${name}"`)) {
      if (routerContent.includes("{/* [SAIL_ROUTES] */}")) {
        routerContent = routerContent.replace("{/* [SAIL_ROUTES] */}", `${routeLine}\n        {/* [SAIL_ROUTES] */}`);
      }
    }

    writeFileSync(routerPath, routerContent, "utf-8");
    autoRouted = true;
  }

  console.log();
  console.log(chalk.green(`  Created: packages/frontend/src/pages/${pascalName}.tsx`));
  if (autoRouted) {
    console.log(chalk.green(`  Routed:  <Route path="/${name}" /> added to router.tsx`));
    console.log();
    console.log(chalk.gray(`  Ready at: /${name}`));
  } else {
    console.log();
    console.log(chalk.yellow("  Could not auto-route. Manually add to packages/frontend/src/router.tsx:"));
    console.log(chalk.cyan(`    ${importLine}`));
    console.log(chalk.cyan(`    <Route path="/${name}" element={<${pascalName} />} />`));
  }
  console.log();
}

function commandGenerateEmail(name: string): void {
  requireKeelProject();
  validateGeneratorName(name);

  const pascalName = toPascalCase(name);
  const filePath = join(process.cwd(), "packages", "email", "src", `${name}.tsx`);

  if (existsSync(filePath)) {
    console.error(chalk.red(`\n  Error: Email template already exists at ${filePath}\n`));
    process.exit(1);
  }

  // Ensure directory exists
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  const content = `import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

interface ${pascalName}EmailProps {
  name: string;
}

export default function ${pascalName}Email({ name }: ${pascalName}EmailProps) {
  return (
    <Html>
      <Head />
      <Preview>${pascalName}</Preview>
      <Body style={{ backgroundColor: "#f6f9fc", fontFamily: "sans-serif" }}>
        <Container style={{ margin: "0 auto", padding: "40px 20px", maxWidth: "560px" }}>
          <Section style={{ backgroundColor: "#ffffff", borderRadius: "8px", padding: "32px" }}>
            <Heading style={{ fontSize: "24px", marginBottom: "16px" }}>
              ${pascalName}
            </Heading>
            <Text style={{ fontSize: "16px", color: "#333" }}>
              Hello {name},
            </Text>
            <Text style={{ fontSize: "16px", color: "#555" }}>
              This is the ${name} email template.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}
`;

  writeFileSync(filePath, content, "utf-8");

  // Auto-export from email index
  const emailIndexPath = join(process.cwd(), "packages", "email", "src", "index.ts");
  const exportLine = `export { default as ${pascalName}Email } from "./${name}.js";`;
  let autoExported = false;

  if (existsSync(emailIndexPath)) {
    let emailIndex = readFileSync(emailIndexPath, "utf-8");

    if (!emailIndex.includes(exportLine)) {
      // Ensure file ends with a newline before appending
      if (!emailIndex.endsWith("\n")) {
        emailIndex += "\n";
      }
      emailIndex += `${exportLine}\n`;
      writeFileSync(emailIndexPath, emailIndex, "utf-8");
      autoExported = true;
    }
  }

  console.log();
  console.log(chalk.green(`  Created: packages/email/src/${name}.tsx`));
  if (autoExported) {
    console.log(chalk.green(`  Exported: ${pascalName}Email added to email/src/index.ts`));
  } else if (!existsSync(emailIndexPath)) {
    console.log();
    console.log(chalk.yellow("  Could not auto-export. Manually add to packages/email/src/index.ts:"));
    console.log(chalk.cyan(`    ${exportLine}`));
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Commands — Database
// ---------------------------------------------------------------------------

async function commandDbReset(): Promise<void> {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.red("  ⚠ Database Reset"));
  console.log(chalk.gray("  This will DROP all tables and recreate the schema."));
  console.log(chalk.gray("  All data will be permanently lost."));
  console.log();

  const shouldReset = await confirm({
    message: "  Are you sure you want to reset the database?",
    default: false,
  });

  if (!shouldReset) {
    console.log(chalk.gray("\n  Cancelled.\n"));
    return;
  }

  console.log();

  // Find the postgres container
  const spinner = ora("  Resetting database schema...").start();

  try {
    // Try to find a running postgres container
    const containerId = execFileSync(
      "docker", ["ps", "-q", "--filter", "ancestor=postgres"],
      { stdio: "pipe" }
    ).toString().trim().split("\n")[0];

    if (!containerId) {
      spinner.fail("  No running PostgreSQL Docker container found");
      console.log(chalk.gray("  Make sure your database container is running (docker compose up -d)\n"));
      return;
    }

    // Parse database name from DATABASE_URL in .env
    let dbName = "keel";
    try {
      const envPath = join(process.cwd(), "packages", "backend", ".env");
      if (existsSync(envPath)) {
        const envContent = readFileSync(envPath, "utf-8");
        const dbUrlMatch = envContent.match(/^DATABASE_URL\s*=\s*(.+)$/m);
        if (dbUrlMatch) {
          const dbUrl = dbUrlMatch[1].replace(/^["']|["']$/g, "");
          const parsed = new URL(dbUrl);
          const pathName = parsed.pathname.replace(/^\//, "");
          if (pathName) dbName = pathName;
        }
      }
    } catch {
      // Fall back to default "keel" if parsing fails
    }

    execFileSync("docker", [
      "exec", containerId, "psql", "-U", "postgres", "-d", dbName,
      "-c", "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
    ], { stdio: "pipe" });
    spinner.succeed("  Database schema reset");
  } catch (error) {
    spinner.fail("  Failed to reset database schema");
    console.error(chalk.gray(`  ${error}`));
    console.log();
    return;
  }

  // Run migrations
  runSync("npm run db:migrate", "Running migrations");
  console.log();
  console.log(chalk.green("  Database reset complete.\n"));
}

function commandDbStudio(): void {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.blue("  ⛵ Opening Drizzle Studio..."));
  console.log();

  replaceProcess("npm", ["run", "db:studio"]);
}

function commandDbSeed(): void {
  requireKeelProject();

  const seedPath = join(process.cwd(), "packages", "backend", "src", "db", "seed.ts");

  if (!existsSync(seedPath)) {
    console.log();
    console.log(chalk.yellow("  No seed file found."));
    console.log(chalk.gray("  Create packages/backend/src/db/seed.ts to use this command."));
    console.log();
    return;
  }

  console.log();
  console.log(chalk.bold.blue("  ⛵ Running database seed..."));
  console.log();

  replaceProcess("npx", ["tsx", "packages/backend/src/db/seed.ts"]);
}

// ---------------------------------------------------------------------------
// Commands — Deploy
// ---------------------------------------------------------------------------

function commandDeploy(): void {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.blue("  ⛵ keel deploy"));
  console.log();
  console.log(chalk.bold("  Choose a deployment target:\n"));

  console.log(chalk.bold("  1. Docker (self-hosted)"));
  console.log(chalk.gray("     Deploy anywhere that runs Docker — VPS, AWS ECS, DigitalOcean, etc."));
  console.log();
  console.log(`     ${chalk.cyan("docker compose -f docker-compose.prod.yml up -d")}`);
  console.log();

  console.log(chalk.bold("  2. Fly.io"));
  console.log(chalk.gray("     Global edge deployment with automatic SSL and scaling."));
  console.log();
  console.log(`     ${chalk.cyan("fly launch --copy-config")}    ${chalk.gray("# First time")}`);
  console.log(`     ${chalk.cyan("fly deploy")}                  ${chalk.gray("# Subsequent deploys")}`);
  console.log(`     ${chalk.cyan("fly secrets set DATABASE_URL=\"postgres://...\"")}  ${chalk.gray("# Set env vars")}`);
  console.log();

  console.log(chalk.bold("  3. Railway"));
  console.log(chalk.gray("     One-click deploy from GitHub with built-in PostgreSQL."));
  console.log();
  console.log(`     ${chalk.cyan("railway up")}                  ${chalk.gray("# Deploy from CLI")}`);
  console.log(chalk.gray("     Or connect your GitHub repo at railway.com"));
  console.log();

  console.log(chalk.bold("  4. Vercel (frontend only)"));
  console.log(chalk.gray("     Static frontend deployment with edge CDN."));
  console.log();
  console.log(`     ${chalk.cyan("vercel --cwd packages/frontend")}`);
  console.log();

  console.log(chalk.bold("  5. Manual / AWS / GCP"));
  console.log(chalk.gray("     Use the Dockerfile at packages/backend/Dockerfile"));
  console.log(chalk.gray("     to build a container image for any platform:"));
  console.log();
  console.log(`     ${chalk.cyan("docker build -f packages/backend/Dockerfile -t my-app .")}`);
  console.log(`     ${chalk.cyan("docker run -p 3005:3005 --env-file .env my-app")}`);
  console.log();

  console.log(chalk.bold("  Configuration files included:"));
  console.log(`    ${chalk.green("✔")} packages/backend/Dockerfile     ${chalk.gray("Multi-stage production build")}`);
  console.log(`    ${chalk.green("✔")} docker-compose.prod.yml         ${chalk.gray("Full-stack self-hosted")}`);
  console.log(`    ${chalk.green("✔")} fly.toml                        ${chalk.gray("Fly.io config")}`);
  console.log(`    ${chalk.green("✔")} packages/backend/railway.json   ${chalk.gray("Railway config")}`);
  console.log(`    ${chalk.green("✔")} packages/frontend/vercel.json   ${chalk.gray("Vercel frontend config")}`);
  console.log();

  console.log(chalk.bold("  Required environment variables for production:"));
  console.log(chalk.gray("    DATABASE_URL, BETTER_AUTH_SECRET (32+ chars),"));
  console.log(chalk.gray("    FRONTEND_URL, BACKEND_URL, RESEND_API_KEY, EMAIL_FROM"));
  console.log();
  console.log(chalk.gray("  Run 'keel env' to check your current configuration."));
  console.log();
}

// ---------------------------------------------------------------------------
// Commands — Upgrade
// ---------------------------------------------------------------------------

async function commandUpgrade(): Promise<void> {
  console.log();
  console.log(chalk.bold.blue("  ⛵ keel upgrade"));
  console.log();

  // Show current version
  try {
    const pkgPath = join(__dirname, "..", "package.json");
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      console.log(`  Current version: ${chalk.cyan(pkg.version)}`);
    }
  } catch {
    // Ignore
  }

  // Check latest version
  try {
    const latest = execFileSync("npm", ["view", "keel", "version"], { stdio: "pipe" }).toString().trim();
    console.log(`  Latest version:  ${chalk.cyan(latest)}`);
  } catch {
    console.log(chalk.gray("  Could not check latest version."));
  }

  console.log();
  console.log(chalk.bold("  To upgrade, run:"));
  console.log(chalk.cyan("    npm install -g keel@latest"));
  console.log();
  console.log(chalk.gray("  Or use npx to always run the latest:"));
  console.log(chalk.cyan("    npx keel@latest <command>"));
  console.log();
}

// ---------------------------------------------------------------------------
// Commands — Env Check
// ---------------------------------------------------------------------------

function commandEnv(): void {
  requireKeelProject();

  console.log();
  console.log(chalk.bold.blue("  ⛵ Environment Variables"));
  console.log();

  const envPath = getEnvFilePath();
  if (!envPath) {
    console.log(chalk.red("  No .env file found."));
    console.log(chalk.gray("  Create a .env file in the project root or packages/backend/.\n"));
    return;
  }

  console.log(chalk.gray(`  Reading from: ${envPath}`));
  console.log();

  const envVars = loadEnvFile();
  const installed = migrateInstalledJson(loadInstalled());
  const installedNames = getInstalledNames(installed);

  // Define required and optional vars
  const required: string[] = ["DATABASE_URL", "BETTER_AUTH_SECRET"];
  const optional: string[] = [
    "RESEND_API_KEY", "EMAIL_FROM", "PORT", "NODE_ENV",
    "FRONTEND_URL", "BACKEND_URL",
  ];

  // Add sail-specific required vars
  if (installedNames.includes("gdpr")) {
    required.push("DELETION_CRON_SECRET");
  }
  if (installedNames.includes("r2-storage")) {
    required.push("R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET_NAME", "R2_PUBLIC_URL");
  }

  // Add env vars from installed sails
  for (const sailName of installedNames) {
    const manifest = loadSailManifest(sailName);
    if (manifest) {
      for (const envVar of manifest.requiredEnvVars) {
        if (!required.includes(envVar.key) && !optional.includes(envVar.key)) {
          required.push(envVar.key);
        }
      }
    }
  }

  // Calculate column width
  const allVars = [...required, ...optional];
  const maxLen = Math.max(...allVars.map((v) => v.length));

  // Print required vars
  console.log(chalk.bold("  Required:"));
  for (const key of required) {
    const value = envVars[key];
    const paddedKey = key.padEnd(maxLen + 2);
    if (value) {
      const preview = value.length > 10 ? value.slice(0, 10) + "..." : value;
      console.log(`    ${paddedKey} ${chalk.green("set")}      ${chalk.gray(preview)}`);
    } else {
      console.log(`    ${paddedKey} ${chalk.red("missing")}`);
    }
  }

  console.log();

  // Print optional vars
  console.log(chalk.bold("  Optional:"));
  for (const key of optional) {
    const value = envVars[key];
    const paddedKey = key.padEnd(maxLen + 2);
    if (value) {
      const preview = value.length > 10 ? value.slice(0, 10) + "..." : value;
      console.log(`    ${paddedKey} ${chalk.green("set")}      ${chalk.gray(preview)}`);
    } else {
      console.log(`    ${paddedKey} ${chalk.yellow("not set")}`);
    }
  }

  console.log();
}

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

function printUsage(): void {
  console.log();
  console.log(chalk.blue("  KEEL"));
  console.log(chalk.bold("  keel") + chalk.gray(" — project management & sail tool (a codai project)"));
  console.log();

  console.log(chalk.bold("  Project:"));
  console.log(`    ${chalk.cyan("keel create <name>")}            Create a new keel project`);
  console.log(`    ${chalk.cyan("keel dev")}                      Start dev (database + migrations + servers)`);
  console.log(`    ${chalk.cyan("keel start")}                    Start production (build + serve)`);
  console.log(`    ${chalk.cyan("keel doctor")}                   Run project health checks`);
  console.log(`    ${chalk.cyan("keel env")}                      Check environment variables`);
  console.log(`    ${chalk.cyan("keel deploy")}                   Show deployment guides`);
  console.log(`    ${chalk.cyan("keel upgrade")}                  Check for CLI updates`);
  console.log();

  console.log(chalk.bold("  Sails:"));
  console.log(`    ${chalk.cyan("keel sail add <name>")}          Install a sail`);
  console.log(`    ${chalk.cyan("keel sail remove <name>")}       Remove a sail`);
  console.log(`    ${chalk.cyan("keel sail update [name]")}       Check for sail updates`);
  console.log(`    ${chalk.cyan("keel list")}                     List available sails`);
  console.log(`    ${chalk.cyan("keel info <name>")}              Show sail details`);
  console.log();

  console.log(chalk.bold("  Generators:"));
  console.log(`    ${chalk.cyan("keel generate route <name>")}    Scaffold an API route`);
  console.log(`    ${chalk.cyan("keel generate page <name>")}     Scaffold a React page`);
  console.log(`    ${chalk.cyan("keel generate email <name>")}    Scaffold an email template`);
  console.log();

  console.log(chalk.bold("  Database:"));
  console.log(`    ${chalk.cyan("keel db:reset")}                 Drop & recreate schema + migrate`);
  console.log(`    ${chalk.cyan("keel db:studio")}                Open Drizzle Studio`);
  console.log(`    ${chalk.cyan("keel db:seed")}                  Run seed file`);
  console.log();

  console.log("  Examples:");
  console.log(chalk.gray("    npx @codaijs/keel create my-app"));
  console.log(chalk.gray("    npx @codaijs/keel dev"));
  console.log(chalk.gray("    npx @codaijs/keel sail add google-oauth"));
  console.log(chalk.gray("    npx @codaijs/keel generate route users"));
  console.log(chalk.gray("    npx @codaijs/keel doctor"));
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];
  const target = args[1];

  switch (command) {
    // -- Sail commands --
    case "sail": {
      const subcommand = args[1];
      const sailTarget = args[2];
      if (subcommand === "add") {
        if (!sailTarget) {
          console.error(chalk.red("\n  Error: Please specify a sail name."));
          console.error(chalk.gray("  Usage: keel sail add <sail-name>\n"));
          process.exit(1);
        }
        await commandAdd(sailTarget);
      } else if (subcommand === "remove") {
        if (!sailTarget) {
          console.error(chalk.red("\n  Error: Please specify a sail name."));
          console.error(chalk.gray("  Usage: keel sail remove <sail-name>\n"));
          process.exit(1);
        }
        await commandRemove(sailTarget);
      } else if (subcommand === "update") {
        await commandSailUpdate(sailTarget);
      } else {
        printUsage();
      }
      break;
    }

    case "add":
      if (!target) {
        console.error(chalk.red("\n  Error: Please specify a sail name."));
        console.error(chalk.gray("  Usage: keel sail add <sail-name>\n"));
        process.exit(1);
      }
      await commandAdd(target);
      break;

    case "remove":
      if (!target) {
        console.error(chalk.red("\n  Error: Please specify a sail name."));
        console.error(chalk.gray("  Usage: keel sail remove <sail-name>\n"));
        process.exit(1);
      }
      await commandRemove(target);
      break;

    case "list":
      commandList();
      break;

    case "info":
      if (!target) {
        console.error(chalk.red("\n  Error: Please specify a sail name."));
        console.error(chalk.gray("  Usage: keel info <sail-name>\n"));
        process.exit(1);
      }
      commandInfo(target);
      break;

    // -- Dev & Start --
    case "dev":
      await commandDev();
      break;

    case "start":
      await commandStart();
      break;

    // -- Create --
    case "create": {
      const { main: createMain } = await import("./create-runner.js");
      await createMain(args.slice(1));
      break;
    }

    // -- Doctor --
    case "doctor":
      await commandDoctor();
      break;

    // -- Generators --
    case "generate":
    case "g": {
      const genType = args[1];
      const genName = args[2];
      if (!genType || !genName) {
        console.error(chalk.red("\n  Error: Please specify a type and name."));
        console.error(chalk.gray("  Usage: keel generate <route|page|email> <name>\n"));
        process.exit(1);
      }
      switch (genType) {
        case "route":
          commandGenerateRoute(genName);
          break;
        case "page":
          commandGeneratePage(genName);
          break;
        case "email":
          commandGenerateEmail(genName);
          break;
        default:
          console.error(chalk.red(`\n  Error: Unknown generator "${genType}".`));
          console.error(chalk.gray("  Available: route, page, email\n"));
          process.exit(1);
      }
      break;
    }

    // -- Database --
    case "db:reset":
      await commandDbReset();
      break;

    case "db:studio":
      commandDbStudio();
      break;

    case "db:seed":
      commandDbSeed();
      break;

    // -- Env --
    case "env":
      commandEnv();
      break;

    // -- Deploy --
    case "deploy":
      commandDeploy();
      break;

    // -- Upgrade --
    case "upgrade":
      await commandUpgrade();
      break;

    // -- Help / Default --
    default:
      printUsage();
      break;
  }
}

main().catch((err) => {
  console.error(chalk.red("Unexpected error:"), err);
  process.exit(1);
});
