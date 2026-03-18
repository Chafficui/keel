/**
 * Google OAuth Sail Installer
 *
 * Adds Google OAuth sign-in via BetterAuth social provider.
 * Features a full interactive setup wizard that guides the user through
 * Google Cloud project configuration, credential collection, and installation.
 *
 * Usage:
 *   npx tsx sails/google-oauth/install.ts
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { input, confirm } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SAIL_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(SAIL_DIR, "../..");
const BACKEND_ROOT = join(PROJECT_ROOT, "packages/backend");
const FRONTEND_ROOT = join(PROJECT_ROOT, "packages/frontend");

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface SailManifest {
  name: string;
  displayName: string;
  version: string;
  requiredEnvVars: { key: string; description: string }[];
}

function loadManifest(): SailManifest {
  return JSON.parse(readFileSync(join(SAIL_DIR, "addon.json"), "utf-8"));
}

function insertAtMarker(filePath: string, marker: string, code: string): void {
  if (!existsSync(filePath)) {
    console.warn(`  Warning: File not found: ${filePath}`);
    return;
  }
  let content = readFileSync(filePath, "utf-8");
  if (!content.includes(marker)) {
    console.warn(`  Warning: Marker "${marker}" not found in ${filePath}`);
    return;
  }
  if (content.includes(code.trim())) {
    console.log(`  Skipped (already present) -> ${filePath}`);
    return;
  }
  content = content.replace(marker, `${marker}\n${code}`);
  writeFileSync(filePath, content, "utf-8");
  console.log(`  Modified -> ${filePath}`);
}

function appendToEnvExample(entries: Record<string, string>): void {
  const envPath = join(PROJECT_ROOT, ".env.example");
  if (!existsSync(envPath)) {
    console.warn("  Warning: .env.example not found");
    return;
  }
  let content = readFileSync(envPath, "utf-8");
  const lines: string[] = [];
  for (const [key, val] of Object.entries(entries)) {
    if (!content.includes(key)) {
      lines.push(`${key}=${val}`);
    }
  }
  if (lines.length > 0) {
    content += `\n# Google OAuth\n${lines.join("\n")}\n`;
    writeFileSync(envPath, content, "utf-8");
    console.log("  Updated .env.example");
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome message -------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Google OAuth Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail integrates Google sign-in into your project");
  console.log("  using BetterAuth's social provider system. After installation,");
  console.log("  users will be able to sign in with their Google account via a");
  console.log('  "Sign in with Google" button on your login and signup pages.');
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Prerequisites check ---------------------------------------------
  const hasProject = await confirm({
    message: "Do you already have a Google Cloud project with OAuth configured?",
    default: false,
  });

  if (!hasProject) {
    console.log();
    console.log("  Follow these steps to create a Google OAuth client:");
    console.log();
    console.log("  1. Go to https://console.cloud.google.com/");
    console.log("  2. Create a new project (or select an existing one)");
    console.log("  3. Go to APIs & Services > Credentials");
    console.log('  4. Click "Create Credentials" > "OAuth client ID"');
    console.log('  5. Set application type to "Web application"');
    console.log("  6. Add authorized redirect URI:");
    console.log("       {BACKEND_URL}/api/auth/callback/google");
    console.log("     For local development, use:");
    console.log("       http://localhost:3000/api/auth/callback/google");
    console.log("  7. Copy the Client ID and Client Secret");
    console.log();

    await confirm({
      message: "I have completed the steps above and have my credentials ready",
      default: false,
    });
  }

  const googleClientId = await input({
    message: "Google OAuth Client ID:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Client ID is required.";
      return true;
    },
  });

  const googleClientSecret = await input({
    message: "Google OAuth Client Secret:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Client Secret is required.";
      return true;
    },
  });

  // -- Step 5: Show summary ----------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to copy:");
  console.log("    + packages/frontend/src/components/auth/GoogleButton.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/auth/index.ts  (add Google provider)");
  console.log("    ~ packages/backend/src/env.ts         (add env validation)");
  console.log("    ~ packages/frontend/src/components/auth/LoginForm.tsx");
  console.log("    ~ packages/frontend/src/components/auth/SignupForm.tsx");
  console.log("    ~ .env.example");
  console.log("    ~ .env (if exists)");
  console.log();
  console.log("  Environment variables:");
  console.log(`    GOOGLE_CLIENT_ID=${googleClientId}`);
  console.log(`    GOOGLE_CLIENT_SECRET=${googleClientSecret.slice(0, 8)}...`);
  console.log();

  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  // -- Step 7: Execute installation --------------------------------------------
  console.log();
  console.log("  Installing...");
  console.log();

  console.log("  Copying files...");
  const srcFile = join(SAIL_DIR, "files/GoogleButton.tsx");
  const destDir = join(FRONTEND_ROOT, "src/components/auth");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(srcFile, join(destDir, "GoogleButton.tsx"));
  console.log("  Copied -> src/components/auth/GoogleButton.tsx");

  console.log();
  console.log("  Modifying backend files...");

  insertAtMarker(
    join(BACKEND_ROOT, "src/auth/index.ts"),
    "// [SAIL_SOCIAL_PROVIDERS]",
    `    google: {\n      clientId: process.env.GOOGLE_CLIENT_ID!,\n      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,\n    },`
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),\n  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),`
  );

  console.log();
  console.log("  Modifying frontend files...");

  for (const form of ["LoginForm.tsx", "SignupForm.tsx"]) {
    const formPath = join(FRONTEND_ROOT, "src/components/auth", form);
    insertAtMarker(formPath, "// [SAIL_IMPORTS]", 'import { GoogleButton } from "./GoogleButton";');
    insertAtMarker(formPath, "{/* [SAIL_SOCIAL_BUTTONS] */}", "            <GoogleButton />");
  }

  console.log();
  console.log("  Updating environment files...");
  appendToEnvExample({ GOOGLE_CLIENT_ID: googleClientId, GOOGLE_CLIENT_SECRET: googleClientSecret });

  const dotEnvPath = join(PROJECT_ROOT, ".env");
  if (existsSync(dotEnvPath)) {
    let dotEnv = readFileSync(dotEnvPath, "utf-8");
    if (!dotEnv.includes("GOOGLE_CLIENT_ID")) {
      dotEnv += `\n# Google OAuth\nGOOGLE_CLIENT_ID=${googleClientId}\nGOOGLE_CLIENT_SECRET=${googleClientSecret}\n`;
      writeFileSync(dotEnvPath, dotEnv, "utf-8");
      console.log("  Updated .env");
    }
  }

  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Google OAuth installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Verify your Google Cloud Console settings:");
  console.log("     https://console.cloud.google.com/apis/credentials");
  console.log();
  console.log("  2. Ensure these redirect URIs are configured:");
  console.log("     Development: http://localhost:3000/api/auth/callback/google");
  console.log("     Production:  https://yourdomain.com/api/auth/callback/google");
  console.log();
  console.log("  3. Restart your dev server:");
  console.log("     npm run dev");
  console.log();
  console.log("  Testing:");
  console.log('  - Visit your login page and click "Sign in with Google"');
  console.log("  - You should be redirected to Google's consent screen");
  console.log("  - After authorizing, you should be redirected back and signed in");
  console.log("  - Check the users table in your database for the new account");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
