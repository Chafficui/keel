/**
 * Template Sail Installer
 *
 * This file serves as a reference implementation for creating sail installers.
 * Each sail should have its own install.ts that follows this wizard pattern.
 *
 * The installer is executed by the CLI tool or can be run standalone:
 *   npx tsx sails/<sail-name>/install.ts
 *
 * ============================================================================
 * WIZARD PATTERN
 * ============================================================================
 *
 * Every sail installer should follow this 8-step wizard flow:
 *
 *   Step 1: Welcome          - Explain what the sail does
 *   Step 2: Prerequisites    - Check if the user has required accounts/setup
 *                              If not, provide step-by-step guidance and wait
 *   Step 3: Credentials      - Collect required API keys and secrets
 *                              Validate format where possible (prefixes, etc.)
 *   Step 4: Summary          - Show all files that will be created/modified
 *                              Show collected env vars (masked)
 *   Step 5: Confirm          - Ask user to confirm before making changes
 *   Step 6: Execute          - Copy files, modify markers, update env
 *   Step 7: Dependencies     - Install npm packages, run migrations
 *   Step 8: Next steps       - Print what to do next and how to test
 *
 * Use @inquirer/prompts for all interactive prompts:
 *   - input()    for text/credential entry with validation
 *   - confirm()  for yes/no decisions
 *   - select()   for choosing one option from a list
 *   - checkbox() for selecting multiple options
 *
 * ============================================================================
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { execSync } from "node:child_process";
import { input, confirm, select } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EnvVar {
  key: string;
  description: string;
}

interface SailManifest {
  name: string;
  displayName: string;
  description: string;
  version: string;
  compatibility: string;
  requiredEnvVars: EnvVar[];
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

const SAIL_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(SAIL_DIR, "../..");

function loadManifest(): SailManifest {
  const raw = readFileSync(join(SAIL_DIR, "addon.json"), "utf-8");
  return JSON.parse(raw) as SailManifest;
}

// ---------------------------------------------------------------------------
// Step 1 -- Welcome message
// ---------------------------------------------------------------------------

function printWelcome(manifest: SailManifest): void {
  console.log("\n------------------------------------------------------------");
  console.log(`  ${manifest.displayName} Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log(`  ${manifest.description}`);
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log(`  Required compatibility: ${manifest.compatibility}`);
    console.log();
  }
}

// ---------------------------------------------------------------------------
// Step 2 -- Prerequisites check
// ---------------------------------------------------------------------------

async function checkPrerequisites(): Promise<void> {
  const hasPrereqs = await confirm({
    message: "Do you have the required external service account set up?",
    default: false,
  });

  if (!hasPrereqs) {
    console.log();
    console.log("  Follow these steps to set up the required service:");
    console.log();
    console.log("  1. Go to <service dashboard URL>");
    console.log("  2. Create an account or sign in");
    console.log("  3. Create the required resources (API keys, projects, etc.)");
    console.log("  4. Note down the credentials you will need");
    console.log();

    await confirm({
      message: "I have completed the setup and have my credentials ready",
      default: false,
    });
  }
}

// ---------------------------------------------------------------------------
// Step 3 -- Collect credentials
// ---------------------------------------------------------------------------

async function collectCredentials(
  envVars: EnvVar[]
): Promise<Record<string, string>> {
  const values: Record<string, string> = {};

  console.log();
  for (const v of envVars) {
    const value = await input({
      message: `${v.description}:`,
      validate: (val) => {
        if (!val || val.trim().length === 0) {
          return `${v.key} is required.`;
        }
        return true;
      },
    });
    values[v.key] = value.trim();
  }

  return values;
}

// ---------------------------------------------------------------------------
// Step 4 -- Show summary
// ---------------------------------------------------------------------------

function showSummary(
  manifest: SailManifest,
  envValues: Record<string, string>
): void {
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");

  if (manifest.adds.backend.length > 0 || manifest.adds.frontend.length > 0) {
    console.log("  Files to create:");
    for (const f of manifest.adds.backend) {
      console.log(`    + packages/backend/${f}`);
    }
    for (const f of manifest.adds.frontend) {
      console.log(`    + packages/frontend/${f}`);
    }
    console.log();
  }

  if (manifest.modifies.backend.length > 0 || manifest.modifies.frontend.length > 0) {
    console.log("  Files to modify:");
    for (const f of manifest.modifies.backend) {
      console.log(`    ~ packages/backend/${f}`);
    }
    for (const f of manifest.modifies.frontend) {
      console.log(`    ~ packages/frontend/${f}`);
    }
    console.log();
  }

  console.log("  Environment variables:");
  for (const [key, val] of Object.entries(envValues)) {
    const masked = val.length > 8 ? val.slice(0, 8) + "..." : val;
    console.log(`    ${key}=${masked}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Step 5 -- Confirm
// ---------------------------------------------------------------------------

async function confirmInstallation(): Promise<void> {
  const proceed = await confirm({
    message: "Proceed with installation?",
    default: true,
  });

  if (!proceed) {
    console.log("\n  Installation cancelled.\n");
    process.exit(0);
  }
}

// ---------------------------------------------------------------------------
// Step 6 -- Execute
// ---------------------------------------------------------------------------

function copySailFiles(manifest: SailManifest): void {
  const filesDir = join(SAIL_DIR, "files");
  if (!existsSync(filesDir)) {
    console.log("  No files/ directory -- skipping file copy.");
    return;
  }

  console.log("  Copying files...");

  for (const file of manifest.adds.backend) {
    const src = join(filesDir, "backend", file.replace(/^src\//, ""));
    const dest = join(PROJECT_ROOT, "packages/backend", file);
    if (existsSync(src)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      console.log(`    Copied -> ${file}`);
    }
  }

  for (const file of manifest.adds.frontend) {
    const src = join(filesDir, "frontend", file.replace(/^src\//, ""));
    const dest = join(PROJECT_ROOT, "packages/frontend", file);
    if (existsSync(src)) {
      mkdirSync(dirname(dest), { recursive: true });
      copyFileSync(src, dest);
      console.log(`    Copied -> ${file}`);
    }
  }
}

function insertAtMarker(
  filePath: string,
  marker: string,
  insertion: string
): void {
  if (!existsSync(filePath)) {
    console.warn(`  Warning: File not found: ${filePath} -- skipping.`);
    return;
  }

  const content = readFileSync(filePath, "utf-8");

  if (!content.includes(marker)) {
    console.warn(`  Warning: Marker "${marker}" not found in ${filePath}.`);
    return;
  }

  if (content.includes(insertion.trim())) {
    console.log(`    Skipped (already present) -> ${filePath}`);
    return;
  }

  const updated = content.replace(marker, `${marker}\n${insertion}`);
  writeFileSync(filePath, updated, "utf-8");
  console.log(`    Inserted at ${marker} -> ${filePath}`);
}

function updateEnvFiles(
  sectionName: string,
  envVars: Record<string, string>
): void {
  console.log("  Updating environment files...");

  for (const envFile of [".env.example", ".env"]) {
    const envPath = join(PROJECT_ROOT, envFile);
    if (!existsSync(envPath)) continue;

    let content = readFileSync(envPath, "utf-8");
    const additions: string[] = [];
    for (const [key, value] of Object.entries(envVars)) {
      if (!content.includes(key)) {
        additions.push(`${key}=${value}`);
      }
    }

    if (additions.length > 0) {
      content += `\n# ${sectionName}\n${additions.join("\n")}\n`;
      writeFileSync(envPath, content, "utf-8");
      console.log(`    Updated ${envFile}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 7 -- Install dependencies and run migrations
// ---------------------------------------------------------------------------

function installDependencies(
  deps: Record<string, string>,
  workspace: string
): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;

  const packages = entries.map(([name, version]) => `${name}@${version}`).join(" ");
  const cmd = `npm install ${packages} --workspace=${workspace}`;
  console.log(`    Running: ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
}

function generateMigrations(): void {
  console.log("    Running: npx drizzle-kit generate");
  try {
    execSync("npx drizzle-kit generate", {
      cwd: join(PROJECT_ROOT, "packages/backend"),
      stdio: "inherit",
    });
  } catch {
    console.warn("    Warning: Could not generate migrations. Run manually:");
    console.warn("      cd packages/backend && npx drizzle-kit generate");
  }
}

// ---------------------------------------------------------------------------
// Step 8 -- Print next steps
// ---------------------------------------------------------------------------

function printNextSteps(manifest: SailManifest): void {
  console.log();
  console.log("------------------------------------------------------------");
  console.log(`  ${manifest.displayName} installed successfully!`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log("  1. Fill in any placeholder env vars in .env");
  console.log("  2. Run database migrations: npm run db:migrate");
  console.log("  3. Review the modified files listed in addon.json");
  console.log("  4. Read the sail README for provider-specific setup");
  console.log();
  console.log("  Testing:");
  console.log("  1. Start your dev server: npm run dev");
  console.log("  2. Test the new functionality in the browser");
  console.log("  3. Check server logs for any configuration errors");
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  printWelcome(manifest);
  await checkPrerequisites();
  const envValues = await collectCredentials(manifest.requiredEnvVars);
  showSummary(manifest, envValues);
  await confirmInstallation();

  console.log();
  console.log("  Installing...");
  console.log();
  copySailFiles(manifest);

  console.log();
  console.log("  Modifying existing files...");
  // Sail specific marker insertions go here. Example:
  //   insertAtMarker(
  //     join(PROJECT_ROOT, "packages/backend/src/index.ts"),
  //     "// [SAIL_IMPORTS]",
  //     'import { myRouter } from "./routes/my-route";'
  //   );

  updateEnvFiles(manifest.displayName, envValues);

  console.log();
  console.log("  Installing dependencies...");
  installDependencies(manifest.dependencies.backend, "packages/backend");
  installDependencies(manifest.dependencies.frontend, "packages/frontend");

  if (manifest.adds.backend.some((f) => f.includes("schema"))) {
    console.log();
    console.log("  Generating database migrations...");
    generateMigrations();
  }

  printNextSteps(manifest);
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
