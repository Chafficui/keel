/**
 * Interactive prompts for project configuration.
 *
 * Streamlined wizard: project name, database, email, sails.
 * Most values are auto-derived or use sensible defaults so the
 * common case requires only a few key-presses.
 */

import { input, select, checkbox } from "@inquirer/prompts";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export interface ProjectConfig {
  projectName: string;
  displayName: string;
  description: string;
  databaseSetup: "docker" | "url" | "skip";
  databaseUrl: string;
  resendApiKey: string;
  emailFrom: string;
  betterAuthSecret: string;
  sails: string[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert a slug like "my-cool-app" to "My Cool App". */
function prettify(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Sanitize a project name to a valid npm package / directory name. */
function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Load available (non-planned) sails from the bundled registry. */
function loadSailChoices(): { name: string; value: string }[] {
  try {
    const cliRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
    const registry = JSON.parse(
      readFileSync(join(cliRoot, "sails", "registry.json"), "utf-8")
    );
    return (registry.sails ?? [])
      .filter((s: { status?: string }) => s.status !== "planned")
      .map((s: { name: string; displayName: string; description: string }) => ({
        name: `${s.displayName.padEnd(24)} ${s.description}`,
        value: s.name,
      }));
  } catch {
    // Fallback if registry can't be read
    return [
      { name: "Google OAuth", value: "google-oauth" },
      { name: "Stripe Payments", value: "stripe" },
    ];
  }
}

// ---------------------------------------------------------------------------
// Main prompt flow
// ---------------------------------------------------------------------------

/**
 * Run all interactive prompts and return the project configuration.
 *
 * @param projectNameArg Optional project name from CLI positional arg.
 */
export async function runPrompts(
  projectNameArg?: string
): Promise<ProjectConfig> {
  // -- 1. Project name -------------------------------------------------------
  let projectName: string;

  if (projectNameArg && projectNameArg.length > 0) {
    projectName = sanitize(projectNameArg);
  } else {
    const rawName = await input({
      message: "Project name:",
      default: "my-app",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Project name is required.";
        if (/[^a-zA-Z0-9-_]/.test(value.trim()))
          return "Only letters, numbers, hyphens, and underscores.";
        return true;
      },
    });
    projectName = sanitize(rawName);
  }

  // Auto-derive display name and description
  const displayName = prettify(projectName);
  const description = `${displayName} — built with keel`;

  // -- 2. Database -----------------------------------------------------------
  const databaseSetup = await select<"docker" | "url" | "skip">({
    message: "Database:",
    choices: [
      { name: "Docker (recommended)", value: "docker" },
      { name: "Custom PostgreSQL URL", value: "url" },
      { name: "Skip (configure later)", value: "skip" },
    ],
    default: "docker",
  });

  let databaseUrl = "";
  if (databaseSetup === "docker") {
    databaseUrl = "postgresql://postgres:postgres@localhost:5432/keel";
  } else if (databaseSetup === "url") {
    databaseUrl = await input({
      message: "PostgreSQL URL:",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Database URL is required.";
        if (!value.startsWith("postgresql://") && !value.startsWith("postgres://"))
          return "URL should start with postgresql:// or postgres://";
        return true;
      },
    });
  }

  // -- 3. Email (optional) ---------------------------------------------------
  const resendApiKey = await input({
    message: "Resend API key (optional, press Enter to skip):",
    default: "",
  });

  let emailFrom = "";
  if (resendApiKey) {
    emailFrom = await input({
      message: "Email FROM address:",
      default: "noreply@example.com",
      validate: (value) => {
        if (!value || !value.includes("@")) return "Enter a valid email address.";
        return true;
      },
    });
  }

  // -- 4. Auth secret (auto-generated) ---------------------------------------
  const betterAuthSecret = randomBytes(32).toString("hex");

  // -- 5. Sail selection -----------------------------------------------------
  const sailChoices = loadSailChoices();

  const sails = await checkbox({
    message: "Sails to install:",
    choices: sailChoices,
  });

  // -- Summary ---------------------------------------------------------------
  console.log();
  console.log(`  ${displayName}`);
  console.log(`  Database: ${databaseSetup === "docker" ? "Docker" : databaseSetup === "url" ? "Custom URL" : "Later"}  |  Email: ${resendApiKey ? "Configured" : "Later"}  |  Sails: ${sails.length > 0 ? sails.join(", ") : "none"}`);
  console.log();

  return {
    projectName,
    displayName,
    description,
    databaseSetup,
    databaseUrl,
    resendApiKey,
    emailFrom,
    betterAuthSecret,
    sails,
  };
}
