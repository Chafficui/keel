/**
 * Push Notifications Sail Installer
 *
 * Adds push notification support via Capacitor + Firebase Cloud Messaging.
 * Includes device token registration, server-side sending with firebase-admin,
 * and a React hook for managing notification lifecycle.
 *
 * Usage:
 *   npx tsx sails/push-notifications/install.ts
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { execSync } from "node:child_process";
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
  dependencies: { backend: Record<string, string>; frontend: Record<string, string> };
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

function copyFile(src: string, dest: string, label: string): void {
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
  console.log(`  Copied -> ${label}`);
}

function appendToEnvFiles(section: string, entries: Record<string, string>): void {
  for (const envFile of [".env.example", ".env"]) {
    const envPath = join(PROJECT_ROOT, envFile);
    if (!existsSync(envPath)) continue;
    let content = readFileSync(envPath, "utf-8");
    const lines: string[] = [];
    for (const [key, val] of Object.entries(entries)) {
      if (!content.includes(key)) lines.push(`${key}=${val}`);
    }
    if (lines.length > 0) {
      content += `\n# ${section}\n${lines.join("\n")}\n`;
      writeFileSync(envPath, content, "utf-8");
      console.log(`  Updated ${envFile}`);
    }
  }
}

function installDeps(deps: Record<string, string>, workspace: string): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;
  const packages = entries.map(([n, v]) => `${n}@${v}`).join(" ");
  const cmd = `npm install ${packages} --workspace=${workspace}`;
  console.log(`  Running: ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome --------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Push Notifications Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds push notification support to your app:");
  console.log("    - Firebase Cloud Messaging (FCM) for delivery");
  console.log("    - Capacitor integration for native iOS/Android");
  console.log("    - Device token registration and management");
  console.log("    - Server-side notification sending with firebase-admin");
  console.log("    - React hook for permission handling and token lifecycle");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Firebase setup guide -------------------------------------------
  const hasFirebase = await confirm({
    message: "Do you already have a Firebase project with Cloud Messaging enabled?",
    default: false,
  });

  if (!hasFirebase) {
    console.log();
    console.log("  Follow these steps to set up Firebase Cloud Messaging:");
    console.log();
    console.log("  1. Go to https://console.firebase.google.com");
    console.log("  2. Click 'Add project' (or select an existing project)");
    console.log("  3. Follow the setup wizard (you can disable Google Analytics)");
    console.log("  4. In the project, go to Project Settings > Cloud Messaging");
    console.log("     Make sure Cloud Messaging API (V1) is enabled");
    console.log("  5. Go to Project Settings > Service Accounts");
    console.log('  6. Click "Generate new private key" to download the JSON file');
    console.log("  7. Open the JSON file — you will need:");
    console.log("     - project_id");
    console.log("     - private_key (the full PEM string)");
    console.log("     - client_email");
    console.log();

    await confirm({
      message: "I have my Firebase project set up and service account JSON ready",
      default: false,
    });
  }

  // -- Step 3: Collect credentials --------------------------------------------
  console.log();
  console.log("  Enter your Firebase service account credentials.");
  console.log("  These are found in the service account JSON file you downloaded.");
  console.log();

  const firebaseProjectId = await input({
    message: "Firebase Project ID (project_id):",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Project ID is required.";
      return true;
    },
  });

  const firebaseClientEmail = await input({
    message: "Firebase Client Email (client_email):",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Client email is required.";
      if (!value.includes("@")) return "Should be a valid service account email.";
      return true;
    },
  });

  console.log();
  console.log("  For the private key, paste the full PEM key from the JSON file.");
  console.log("  It starts with -----BEGIN PRIVATE KEY----- and ends with -----END PRIVATE KEY-----");
  console.log("  You can paste it as a single line with \\n for newlines.");
  console.log();

  const firebasePrivateKey = await input({
    message: "Firebase Private Key (private_key):",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Private key is required.";
      if (!value.includes("PRIVATE KEY")) return "Should contain 'PRIVATE KEY' — paste the full PEM key.";
      return true;
    },
  });

  // -- Step 4: Summary --------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to copy (backend):");
  console.log("    + packages/backend/src/db/schema/notifications.ts");
  console.log("    + packages/backend/src/routes/notifications.ts");
  console.log("    + packages/backend/src/services/notifications.ts");
  console.log();
  console.log("  Files to copy (frontend):");
  console.log("    + packages/frontend/src/hooks/usePushNotifications.ts");
  console.log("    + packages/frontend/src/components/PushNotificationInit.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/db/schema/index.ts");
  console.log("    ~ packages/backend/src/index.ts");
  console.log("    ~ packages/backend/src/env.ts");
  console.log("    ~ packages/frontend/src/components/layout/Layout.tsx");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    FIREBASE_PROJECT_ID=${firebaseProjectId}`);
  console.log(`    FIREBASE_CLIENT_EMAIL=${firebaseClientEmail.slice(0, 20)}...`);
  console.log(`    FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----...`);
  console.log();

  // -- Step 5: Confirm --------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  console.log();
  console.log("  Installing...");
  console.log();

  // -- Step 6: Copy files and insert at markers --------------------------------
  console.log("  Copying backend files...");
  const backendFiles = [
    { src: "backend/schema/notifications.ts", dest: "src/db/schema/notifications.ts" },
    { src: "backend/routes/notifications.ts", dest: "src/routes/notifications.ts" },
    { src: "backend/services/notifications.ts", dest: "src/services/notifications.ts" },
  ];
  for (const f of backendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(BACKEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/hooks/usePushNotifications.ts", dest: "src/hooks/usePushNotifications.ts" },
    { src: "frontend/components/PushNotificationInit.tsx", dest: "src/components/PushNotificationInit.tsx" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Modifying backend files...");

  insertAtMarker(
    join(BACKEND_ROOT, "src/db/schema/index.ts"),
    "// [SAIL_SCHEMA]",
    'export * from "./notifications.js";',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { notificationsRouter } from "./routes/notifications.js";',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/notifications", notificationsRouter);',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),\n  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),\n  FIREBASE_CLIENT_EMAIL: z.string().min(1, "FIREBASE_CLIENT_EMAIL is required"),`,
  );

  console.log();
  console.log("  Modifying frontend files...");

  // Add PushNotificationInit to Layout.tsx
  const layoutPath = join(FRONTEND_ROOT, "src/components/layout/Layout.tsx");
  if (existsSync(layoutPath)) {
    let layoutContent = readFileSync(layoutPath, "utf-8");

    // Add import if not present
    const importLine = 'import { PushNotificationInit } from "@/components/PushNotificationInit.js";';
    if (!layoutContent.includes("PushNotificationInit")) {
      // Insert import after the last import statement
      const lastImportIndex = layoutContent.lastIndexOf("import ");
      const lineEnd = layoutContent.indexOf("\n", lastImportIndex);
      layoutContent =
        layoutContent.slice(0, lineEnd + 1) +
        importLine + "\n" +
        layoutContent.slice(lineEnd + 1);

      // Insert <PushNotificationInit /> after useDeepLinks() call
      layoutContent = layoutContent.replace(
        "useDeepLinks();",
        "useDeepLinks();\n\n  return (\n",
      );

      // Actually, let's just insert the component in the JSX
      // Revert the above — re-read the file cleanly
      layoutContent = readFileSync(layoutPath, "utf-8");

      // Add import at the top after last import
      const lastImport = layoutContent.lastIndexOf("import ");
      const importLineEnd = layoutContent.indexOf("\n", lastImport);
      layoutContent =
        layoutContent.slice(0, importLineEnd + 1) +
        importLine + "\n" +
        layoutContent.slice(importLineEnd + 1);

      // Add component in JSX — insert right after the opening <div>
      layoutContent = layoutContent.replace(
        '<div className="flex min-h-screen flex-col bg-keel-navy">',
        '<div className="flex min-h-screen flex-col bg-keel-navy">\n      <PushNotificationInit />',
      );

      writeFileSync(layoutPath, layoutContent, "utf-8");
      console.log(`  Modified -> Layout.tsx`);
    } else {
      console.log(`  Skipped (already present) -> Layout.tsx`);
    }
  } else {
    console.warn("  Warning: Layout.tsx not found. Add <PushNotificationInit /> manually.");
  }

  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.backend, "packages/backend");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  console.log();
  console.log("  Generating database migrations...");
  try {
    execSync("npx drizzle-kit generate", { cwd: BACKEND_ROOT, stdio: "inherit" });
  } catch {
    console.warn("  Warning: Could not generate migrations. Run manually: cd packages/backend && npx drizzle-kit generate");
  }

  console.log();
  console.log("  Updating environment files...");
  appendToEnvFiles("Push Notifications (Firebase)", {
    FIREBASE_PROJECT_ID: firebaseProjectId,
    FIREBASE_PRIVATE_KEY: firebasePrivateKey,
    FIREBASE_CLIENT_EMAIL: firebaseClientEmail,
  });

  // -- Step 7: Next steps ------------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Push Notifications installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Run database migrations:");
  console.log("       npm run db:migrate");
  console.log();
  console.log("  2. Configure iOS (APNs):");
  console.log("     - Go to https://developer.apple.com/account/resources/authkeys/list");
  console.log('     - Create an APNs authentication key (check "Apple Push Notifications service")');
  console.log("     - Download the .p8 key file");
  console.log("     - In Firebase Console > Project Settings > Cloud Messaging > iOS:");
  console.log("       Upload the APNs key, enter Key ID and Team ID");
  console.log();
  console.log("  3. Configure Android:");
  console.log("     - In Firebase Console, add an Android app to your project");
  console.log("     - Download google-services.json");
  console.log("     - Place it in your Android project: android/app/google-services.json");
  console.log();
  console.log("  4. Sync Capacitor:");
  console.log("       npx cap sync");
  console.log();
  console.log("  5. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  Testing push notifications:");
  console.log("    - Push notifications only work on physical devices (not simulators)");
  console.log("    - Use the Firebase Console > Messaging to send test notifications");
  console.log("    - Or use the POST /api/notifications/send endpoint from your backend");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
