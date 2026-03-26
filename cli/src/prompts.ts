/**
 * Interactive prompts for project configuration.
 *
 * Streamlined wizard: project name, database, email, sails.
 * Supports --yes flag for fully non-interactive usage.
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
  databaseSetup: "docker" | "url" | "pglite" | "skip";
  databaseUrl: string;
  resendApiKey: string;
  emailFrom: string;
  betterAuthSecret: string;
  sails: string[];
}

/** CLI flags parsed from args like --yes, --db=docker, --sails=stripe,google-oauth */
export interface CreateFlags {
  yes: boolean;
  db?: "docker" | "url" | "pglite" | "skip";
  dbUrl?: string;
  resendKey?: string;
  emailFrom?: string;
  sails?: string[];
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
    return [
      { name: "Google OAuth", value: "google-oauth" },
      { name: "Stripe Payments", value: "stripe" },
    ];
  }
}

/** Parse CLI flags from args array. */
export function parseFlags(args: string[]): { projectName?: string; flags: CreateFlags } {
  const flags: CreateFlags = { yes: false };
  let projectName: string | undefined;

  for (const arg of args) {
    if (arg === "--yes" || arg === "-y") {
      flags.yes = true;
    } else if (arg.startsWith("--db=")) {
      flags.db = arg.slice(5) as "docker" | "url" | "pglite" | "skip";
    } else if (arg.startsWith("--db-url=")) {
      flags.dbUrl = arg.slice(9);
      flags.db = "url";
    } else if (arg.startsWith("--resend-key=")) {
      flags.resendKey = arg.slice(13);
    } else if (arg.startsWith("--email-from=")) {
      flags.emailFrom = arg.slice(13);
    } else if (arg.startsWith("--sails=")) {
      flags.sails = arg.slice(8).split(",").filter(Boolean);
    } else if (!arg.startsWith("-")) {
      projectName = arg;
    }
  }

  return { projectName, flags };
}

// ---------------------------------------------------------------------------
// Main prompt flow
// ---------------------------------------------------------------------------

/**
 * Run prompts (interactive or non-interactive based on flags).
 */
export async function runPrompts(
  projectNameArg?: string,
  flags: CreateFlags = { yes: false }
): Promise<ProjectConfig> {
  // -- 1. Project name -------------------------------------------------------
  let projectName: string;

  if (projectNameArg && projectNameArg.length > 0) {
    projectName = sanitize(projectNameArg);
  } else if (flags.yes) {
    projectName = "my-app";
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

  const displayName = prettify(projectName);
  const description = `${displayName} — built with keel`;

  // -- 2. Database -----------------------------------------------------------
  let databaseSetup: "docker" | "url" | "pglite" | "skip";
  let databaseUrl = "";

  if (flags.db) {
    databaseSetup = flags.db;
  } else if (flags.yes) {
    databaseSetup = "docker";
  } else {
    databaseSetup = await select<"docker" | "url" | "pglite" | "skip">({
      message: "Database:",
      choices: [
        { name: "Docker (recommended for production parity)", value: "docker" },
        { name: "PGlite (zero-config, no Docker needed)", value: "pglite" },
        { name: "Custom PostgreSQL URL", value: "url" },
        { name: "Skip (configure later)", value: "skip" },
      ],
      default: "docker",
    });
  }

  if (databaseSetup === "docker") {
    databaseUrl = `postgresql://postgres:postgres@localhost:5432/${projectName.replace(/-/g, "_")}`;
  } else if (databaseSetup === "pglite") {
    databaseUrl = "pglite://./data/pglite";
  } else if (databaseSetup === "url") {
    if (flags.dbUrl) {
      databaseUrl = flags.dbUrl;
    } else if (!flags.yes) {
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
  }

  // -- 3. Email (optional) ---------------------------------------------------
  let resendApiKey = flags.resendKey ?? "";
  let emailFrom = flags.emailFrom ?? "";

  if (!flags.yes && !flags.resendKey) {
    resendApiKey = await input({
      message: "Resend API key (optional, press Enter to skip):",
      default: "",
    });

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
  }

  // -- 4. Auth secret (auto-generated) ---------------------------------------
  const betterAuthSecret = randomBytes(32).toString("hex");

  // -- 5. Sail selection -----------------------------------------------------
  let sails: string[];

  if (flags.sails !== undefined) {
    sails = flags.sails;
  } else if (flags.yes) {
    sails = [];
  } else {
    const sailChoices = loadSailChoices();
    sails = await checkbox({
      message: "Sails to install:",
      choices: sailChoices,
    });
  }

  // -- Summary ---------------------------------------------------------------
  console.log();
  console.log(`  ${displayName}`);
  const dbLabel = databaseSetup === "docker" ? "Docker" : databaseSetup === "pglite" ? "PGlite (zero-config)" : databaseSetup === "url" ? "Custom URL" : "Later";
  console.log(`  Database: ${dbLabel}  |  Email: ${resendApiKey ? "Configured" : "Later"}  |  Sails: ${sails.length > 0 ? sails.join(", ") : "none"}`);
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
