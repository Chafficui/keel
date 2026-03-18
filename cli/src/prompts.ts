/**
 * Interactive prompts for project configuration.
 *
 * Uses @inquirer/prompts for a polished CLI experience with validation,
 * defaults, and multi-select support. Implements a comprehensive setup
 * wizard covering project info, database, email, storage, auth, Capacitor,
 * and sail selection.
 */

import { input, select, checkbox, confirm } from "@inquirer/prompts";
import { randomBytes } from "node:crypto";

export interface ProjectConfig {
  projectName: string;
  displayName: string;
  description: string;
  databaseSetup: "docker" | "url" | "skip";
  databaseUrl: string;
  resendApiKey: string;
  emailFrom: string;
  storageSetup: boolean;
  r2AccountId: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2BucketName: string;
  betterAuthSecret: string;
  appId: string;
  platforms: "both" | "ios" | "android" | "none";
  sails: string[];
}

/**
 * Convert a slug like "my-cool-app" to a display name like "My Cool App".
 */
function prettify(slug: string): string {
  return slug
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Sanitize a project name to be a valid npm package / directory name.
 */
function sanitize(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Run all interactive prompts and return the project configuration.
 *
 * @param projectNameArg Optional project name from CLI positional arg.
 */
export async function runPrompts(
  projectNameArg?: string
): Promise<ProjectConfig> {
  // -- Step 1: Project name ----------------------------------------------------
  let projectName: string;

  if (projectNameArg && projectNameArg.length > 0) {
    projectName = sanitize(projectNameArg);
  } else {
    const rawName = await input({
      message: "Project name:",
      default: "my-app",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Project name is required.";
        }
        if (/[^a-zA-Z0-9-_]/.test(value.trim())) {
          return "Only letters, numbers, hyphens, and underscores are allowed.";
        }
        return true;
      },
    });
    projectName = sanitize(rawName);
  }

  // -- Step 2: Display name ----------------------------------------------------
  const displayName = await input({
    message: "Display name:",
    default: prettify(projectName),
  });

  // -- Step 3: Description -----------------------------------------------------
  const description = await input({
    message: "Project description (one line):",
    default: `${displayName} - built with keel`,
  });

  // -- Step 4: Database setup wizard -------------------------------------------
  console.log();
  const databaseSetup = await select<"docker" | "url" | "skip">({
    message: "Database setup:",
    choices: [
      {
        name: "Use Docker (recommended for local development)",
        value: "docker",
      },
      {
        name: "I have a PostgreSQL database URL ready",
        value: "url",
      },
      {
        name: "Skip for now (configure later in .env)",
        value: "skip",
      },
    ],
    default: "docker",
  });

  let databaseUrl = "";

  if (databaseSetup === "docker") {
    console.log();
    console.log("  A docker-compose.yml will be created for local PostgreSQL.");
    console.log("  Make sure Docker is installed: https://docs.docker.com/get-docker/");
    console.log();
    databaseUrl = "postgresql://postgres:postgres@localhost:5432/keel";
  } else if (databaseSetup === "url") {
    databaseUrl = await input({
      message: "PostgreSQL database URL:",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "Database URL is required.";
        }
        if (!value.startsWith("postgresql://") && !value.startsWith("postgres://")) {
          return "URL should start with postgresql:// or postgres://";
        }
        return true;
      },
    });
  } else {
    console.log();
    console.log("  You can set up a database later using one of these services:");
    console.log("    - Railway:  https://railway.app");
    console.log("    - Supabase: https://supabase.com");
    console.log("    - Neon:     https://neon.tech");
    console.log("    - Docker:   Add docker-compose.yml manually");
    console.log();
  }

  // -- Step 5: Email setup wizard ----------------------------------------------
  console.log();
  let resendApiKey = "";
  let emailFrom = "";

  const setupEmail = await confirm({
    message: "Set up email sending with Resend now?",
    default: false,
  });

  if (setupEmail) {
    const hasResend = await confirm({
      message: "Do you have a Resend account?",
      default: false,
    });

    if (!hasResend) {
      console.log();
      console.log("  Sign up for Resend at: https://resend.com");
      console.log("  Then create an API key in the dashboard.");
      console.log();

      await confirm({
        message: "I have created my Resend account and API key",
        default: false,
      });
    }

    resendApiKey = await input({
      message: "Resend API key:",
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return "API key is required.";
        }
        return true;
      },
    });

    emailFrom = await input({
      message: "Email FROM address (e.g., noreply@yourdomain.com):",
      default: "noreply@example.com",
      validate: (value) => {
        if (!value || !value.includes("@")) {
          return "Please enter a valid email address.";
        }
        return true;
      },
    });
  } else {
    console.log("  You can configure email later in .env (RESEND_API_KEY, EMAIL_FROM).");
  }

  // -- Step 6: Storage setup wizard --------------------------------------------
  console.log();
  let storageSetup = false;
  let r2AccountId = "";
  let r2AccessKeyId = "";
  let r2SecretAccessKey = "";
  let r2BucketName = "";

  const wantStorage = await confirm({
    message: "Set up Cloudflare R2 for file storage now?",
    default: false,
  });

  if (wantStorage) {
    storageSetup = true;

    console.log();
    console.log("  Set up an R2 bucket in Cloudflare:");
    console.log("  1. Go to https://dash.cloudflare.com/ > R2 Object Storage");
    console.log("  2. Create a new bucket");
    console.log('  3. Go to "Manage R2 API Tokens" and create a token');
    console.log("  4. Copy the Account ID, Access Key ID, and Secret Access Key");
    console.log();

    r2AccountId = await input({
      message: "Cloudflare Account ID:",
      validate: (val) => val.trim().length > 0 || "Account ID is required.",
    });

    r2AccessKeyId = await input({
      message: "R2 Access Key ID:",
      validate: (val) => val.trim().length > 0 || "Access Key ID is required.",
    });

    r2SecretAccessKey = await input({
      message: "R2 Secret Access Key:",
      validate: (val) => val.trim().length > 0 || "Secret Access Key is required.",
    });

    r2BucketName = await input({
      message: "R2 Bucket name:",
      default: projectName,
      validate: (val) => val.trim().length > 0 || "Bucket name is required.",
    });
  } else {
    console.log("  You can set this up later in .env.");
  }

  // -- Step 7: Auth secret -----------------------------------------------------
  console.log();
  const generatedSecret = randomBytes(32).toString("hex");

  const useGeneratedSecret = await confirm({
    message: `Use auto-generated BETTER_AUTH_SECRET? (${generatedSecret.slice(0, 16)}...)`,
    default: true,
  });

  let betterAuthSecret: string;
  if (useGeneratedSecret) {
    betterAuthSecret = generatedSecret;
  } else {
    betterAuthSecret = await input({
      message: "Custom BETTER_AUTH_SECRET:",
      validate: (value) => {
        if (!value || value.trim().length < 16) {
          return "Secret must be at least 16 characters.";
        }
        return true;
      },
    });
  }

  // -- Step 8: Capacitor setup -------------------------------------------------
  console.log();
  const defaultAppId = `com.keel.${projectName.replace(/-/g, "")}`;

  const appId = await input({
    message: "Capacitor app ID (reverse domain, e.g., com.company.appname):",
    default: defaultAppId,
    validate: (value) => {
      if (!/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/.test(value)) {
        return "Must be a valid reverse domain (e.g., com.example.myapp).";
      }
      return true;
    },
  });

  const platforms = await select<"both" | "ios" | "android" | "none">({
    message: "Include native platforms?",
    choices: [
      { name: "Both iOS and Android", value: "both" },
      { name: "iOS only", value: "ios" },
      { name: "Android only", value: "android" },
      { name: "None (web only for now)", value: "none" },
    ],
    default: "both",
  });

  // -- Step 9: Sail selection --------------------------------------------------
  console.log();
  const sails = await checkbox({
    message: "Select sails to install:",
    choices: [
      {
        name: "Google OAuth  -- Google sign-in button via BetterAuth",
        value: "google-oauth",
      },
      {
        name: "Stripe        -- Subscriptions, checkout, webhooks, portal",
        value: "stripe",
      },
    ],
  });

  // -- Step 10: Summary -------------------------------------------------------
  console.log();
  console.log("  ============================================================");
  console.log("  Project Configuration Summary");
  console.log("  ============================================================");
  console.log();
  console.log(`  Project name:      ${projectName}`);
  console.log(`  Display name:      ${displayName}`);
  console.log(`  Description:       ${description}`);
  console.log(`  Database:          ${databaseSetup === "docker" ? "Docker (local)" : databaseSetup === "url" ? "Custom URL" : "Configure later"}`);
  console.log(`  Email (Resend):    ${resendApiKey ? "Configured" : "Skipped"}`);
  console.log(`  File storage (R2): ${storageSetup ? "Configured" : "Skipped"}`);
  console.log(`  Auth secret:       ${betterAuthSecret.slice(0, 16)}...`);
  console.log(`  App ID:            ${appId}`);
  console.log(`  Platforms:         ${platforms}`);
  console.log(`  Sails:             ${sails.length > 0 ? sails.join(", ") : "none"}`);
  console.log();

  // -- Step 11: Confirm and scaffold -------------------------------------------
  const proceed = await confirm({
    message: "Create project with these settings?",
    default: true,
  });

  if (!proceed) {
    console.log("\n  Cancelled.\n");
    process.exit(0);
  }

  return {
    projectName,
    displayName,
    description,
    databaseSetup,
    databaseUrl,
    resendApiKey,
    emailFrom,
    storageSetup,
    r2AccountId,
    r2AccessKeyId,
    r2SecretAccessKey,
    r2BucketName,
    betterAuthSecret,
    appId,
    platforms,
    sails,
  };
}
