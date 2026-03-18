#!/usr/bin/env node

/**
 * keel CLI — Sail management tool (a codai project)
 *
 * Used from inside a keel project to install, list, and inspect sails.
 * Sail definitions are bundled with this npm package (in the sails/ directory).
 *
 * Usage:
 *   npx keel sail add <sail-name>    — install a sail into the current project
 *   npx keel list                    — list available sails with status
 *   npx keel info <sail-name>        — show sail details
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import chalk from "chalk";
import ora from "ora";
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
}

interface Registry {
  version: string;
  sails: RegistrySail[];
}

interface InstalledJson {
  installed: string[];
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
  return JSON.parse(readFileSync(REGISTRY_PATH, "utf-8"));
}

function getInstalledJsonPath(): string {
  return join(process.cwd(), "sails", "installed.json");
}

function loadInstalled(): InstalledJson {
  const path = getInstalledJsonPath();
  if (!existsSync(path)) {
    return { installed: [] };
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

function saveInstalled(data: InstalledJson): void {
  const path = getInstalledJsonPath();
  writeFileSync(path, JSON.stringify(data, null, 2) + "\n", "utf-8");
}

function isInsideKeelProject(): boolean {
  return existsSync(getInstalledJsonPath());
}

function getSailDir(sailName: string): string {
  return join(BUNDLED_SAILS_DIR, sailName);
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

async function commandAdd(sailName: string): Promise<void> {
  if (!isInsideKeelProject()) {
    console.error(
      chalk.red("\n  Error: Not inside a keel project.")
    );
    console.error(
      chalk.gray("  Run this command from the root of a keel project")
    );
    console.error(
      chalk.gray("  (a directory containing sails/installed.json).\n")
    );
    process.exit(1);
  }

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
  const installed = loadInstalled();
  if (installed.installed.includes(sailName)) {
    console.log(
      chalk.yellow(`\n  Sail "${sailName}" is already installed.\n`)
    );
    process.exit(0);
  }

  // Install the sail
  const projectDir = process.cwd();
  const spinner = ora(`  Installing ${registryEntry.displayName}...`).start();

  try {
    await installSailByName(sailName, sailDir, projectDir);
    spinner.succeed(`  ${registryEntry.displayName} installed successfully`);

    // Update installed.json
    installed.installed.push(sailName);
    saveInstalled(installed);

    console.log();
    console.log(chalk.gray("  Updated sails/installed.json"));
    console.log();
  } catch (error) {
    spinner.fail(`  Failed to install ${sailName}`);
    console.error(chalk.red(`    ${error}`));
    process.exit(1);
  }
}

function commandList(): void {
  const registry = loadRegistry();
  const installed = isInsideKeelProject() ? loadInstalled() : { installed: [] };

  console.log();
  console.log(chalk.bold("  Available sails:"));
  console.log();

  // Column formatting
  const maxName = Math.max(...registry.sails.map((a) => a.displayName.length));

  for (const sail of registry.sails) {
    const isInstalled = installed.installed.includes(sail.name);
    const isPlanned = sail.status === "planned";

    let status: string;
    if (isInstalled) {
      status = chalk.green("installed");
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
  const sailDir = getSailDir(sailName);
  const manifestPath = join(sailDir, "addon.json");

  if (existsSync(manifestPath)) {
    const manifest: SailManifest = JSON.parse(
      readFileSync(manifestPath, "utf-8")
    );

    if (manifest.requiredEnvVars.length > 0) {
      console.log();
      console.log(chalk.bold("  Required environment variables:"));
      for (const envVar of manifest.requiredEnvVars) {
        console.log(`    ${envVar.key}  ${chalk.gray(envVar.description)}`);
      }
    }

    const allAdds = [
      ...manifest.adds.backend.map((f) => `packages/backend/${f}`),
      ...manifest.adds.frontend.map((f) => `packages/frontend/${f}`),
    ];
    if (allAdds.length > 0) {
      console.log();
      console.log(chalk.bold("  Files added:"));
      for (const f of allAdds) {
        console.log(`    + ${f}`);
      }
    }

    const allModifies = [
      ...manifest.modifies.backend.map((f) => `packages/backend/${f}`),
      ...manifest.modifies.frontend.map((f) => `packages/frontend/${f}`),
    ];
    if (allModifies.length > 0) {
      console.log();
      console.log(chalk.bold("  Files modified:"));
      for (const f of allModifies) {
        console.log(`    ~ ${f}`);
      }
    }

    const backendDeps = Object.entries(manifest.dependencies.backend);
    const frontendDeps = Object.entries(manifest.dependencies.frontend);
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
    const installed = loadInstalled();
    const isInstalled = installed.installed.includes(sailName);
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

function printUsage(): void {
  console.log();
  console.log(chalk.blue("  KEEL"));
  console.log(chalk.bold("  keel") + chalk.gray(" — sail management tool (a codai project)"));
  console.log();
  console.log("  Usage:");
  console.log(`    ${chalk.cyan("keel create <name>")}       Create a new keel project`);
  console.log(`    ${chalk.cyan("keel sail add <sail>")}     Install a sail into the current project`);
  console.log(`    ${chalk.cyan("keel list")}                List available sails`);
  console.log(`    ${chalk.cyan("keel info <sail>")}         Show sail details`);
  console.log();
  console.log("  Examples:");
  console.log(chalk.gray("    npx @chafficui/keel create my-app"));
  console.log(chalk.gray("    npx @chafficui/keel sail add google-oauth"));
  console.log(chalk.gray("    npx @chafficui/keel sail add stripe"));
  console.log(chalk.gray("    npx @chafficui/keel list"));
  console.log(chalk.gray("    npx @chafficui/keel info stripe"));
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

    case "create": {
      // Forward to the create CLI
      const { main: createMain } = await import("./create-runner.js");
      await createMain(args.slice(1));
      break;
    }

    default:
      printUsage();
      break;
  }
}

main().catch((err) => {
  console.error(chalk.red("Unexpected error:"), err);
  process.exit(1);
});
