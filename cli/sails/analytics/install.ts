/**
 * PostHog Analytics Sail Installer
 *
 * Adds privacy-friendly analytics with PostHog — automatic page views,
 * user identification, and custom event tracking.
 *
 * PostHog can be used as a cloud service or self-hosted.
 *
 * Usage:
 *   npx tsx sails/analytics/install.ts
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
import { input, confirm, select } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SAIL_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(SAIL_DIR, "../..");
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
  console.log(`  PostHog Analytics Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds PostHog analytics to your app:");
  console.log("    - Automatic page view tracking on SPA route changes");
  console.log("    - User identification tied to your auth system");
  console.log("    - Custom event tracking for feature usage");
  console.log("    - Session recording and heatmaps (configurable in PostHog)");
  console.log();
  console.log("  PostHog is privacy-friendly, open-source, and GDPR-compatible.");
  console.log("  You can use PostHog Cloud or self-host it.");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Hosting choice -------------------------------------------------
  const hostingChoice = await select({
    message: "How will you use PostHog?",
    choices: [
      {
        name: "PostHog Cloud (US)",
        value: "cloud-us",
        description: "Hosted by PostHog at us.i.posthog.com — easiest setup",
      },
      {
        name: "PostHog Cloud (EU)",
        value: "cloud-eu",
        description: "Hosted by PostHog at eu.i.posthog.com — EU data residency",
      },
      {
        name: "Self-hosted",
        value: "self-hosted",
        description: "Your own PostHog instance — full data control",
      },
    ],
  });

  let posthogHost: string;

  if (hostingChoice === "cloud-us") {
    posthogHost = "https://us.i.posthog.com";
    console.log();
    console.log("  To get your API key:");
    console.log("  1. Sign up or log in at https://app.posthog.com");
    console.log("  2. Create a project (or select existing)");
    console.log("  3. Go to Project Settings");
    console.log("  4. Copy the Project API Key");
    console.log();
  } else if (hostingChoice === "cloud-eu") {
    posthogHost = "https://eu.i.posthog.com";
    console.log();
    console.log("  To get your API key:");
    console.log("  1. Sign up or log in at https://eu.posthog.com");
    console.log("  2. Create a project (or select existing)");
    console.log("  3. Go to Project Settings");
    console.log("  4. Copy the Project API Key");
    console.log();
  } else {
    console.log();
    posthogHost = await input({
      message: "PostHog instance URL (e.g., https://posthog.yourdomain.com):",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Host URL is required.";
        if (!value.startsWith("http")) return "Should start with http:// or https://";
        return true;
      },
    });
    posthogHost = posthogHost.replace(/\/+$/, ""); // Remove trailing slashes
    console.log();
  }

  // -- Step 3: Collect API key ------------------------------------------------
  const posthogKey = await input({
    message: "PostHog Project API Key:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "API key is required.";
      if (value.startsWith("phx_")) return "This looks like a personal API key. Use the Project API key (starts with 'phc_').";
      return true;
    },
  });

  // -- Step 4: Summary --------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to create (frontend):");
  console.log("    + packages/frontend/src/lib/analytics.ts");
  console.log("    + packages/frontend/src/hooks/useAnalytics.ts");
  console.log("    + packages/frontend/src/components/AnalyticsProvider.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/frontend/src/App.tsx");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    VITE_POSTHOG_KEY=${posthogKey.slice(0, 12)}...`);
  console.log(`    VITE_POSTHOG_HOST=${posthogHost}`);
  console.log();

  // -- Step 5: Confirm --------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  console.log();
  console.log("  Installing...");
  console.log();

  // -- Step 6: Copy files and modify App.tsx ----------------------------------
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/lib/analytics.ts", dest: "src/lib/analytics.ts" },
    { src: "frontend/hooks/useAnalytics.ts", dest: "src/hooks/useAnalytics.ts" },
    { src: "frontend/components/AnalyticsProvider.tsx", dest: "src/components/AnalyticsProvider.tsx" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Modifying App.tsx...");

  const appPath = join(FRONTEND_ROOT, "src/App.tsx");
  if (existsSync(appPath)) {
    let appContent = readFileSync(appPath, "utf-8");

    if (!appContent.includes("AnalyticsProvider")) {
      // Add import
      const importLine = 'import { AnalyticsProvider } from "./components/AnalyticsProvider.js";';
      // Find the last import line and add after it
      const lastImport = appContent.lastIndexOf("import ");
      const importLineEnd = appContent.indexOf("\n", lastImport);
      appContent =
        appContent.slice(0, importLineEnd + 1) +
        importLine + "\n" +
        appContent.slice(importLineEnd + 1);

      // Wrap <AppRouter /> with <AnalyticsProvider>
      appContent = appContent.replace(
        "<AppRouter />",
        "<AnalyticsProvider>\n      <AppRouter />\n    </AnalyticsProvider>",
      );

      writeFileSync(appPath, appContent, "utf-8");
      console.log("  Modified -> App.tsx");
    } else {
      console.log("  Skipped (already present) -> App.tsx");
    }
  } else {
    console.warn("  Warning: App.tsx not found. Wrap your app with <AnalyticsProvider> manually.");
  }

  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  console.log();
  console.log("  Updating environment files...");
  appendToEnvFiles("PostHog Analytics", {
    VITE_POSTHOG_KEY: posthogKey.trim(),
    VITE_POSTHOG_HOST: posthogHost,
  });

  // -- Step 7: Next steps ------------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  PostHog Analytics installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  2. Verify analytics is working:");
  console.log("     - Open your app in the browser");
  console.log("     - Log in and navigate between pages");
  console.log("     - Check PostHog dashboard for events");
  console.log();
  console.log("  3. Configure PostHog features (optional):");
  console.log("     - Session Recording: enable in PostHog project settings");
  console.log("     - Feature Flags: use posthog.isFeatureEnabled('flag-name')");
  console.log("     - Surveys: create in-app surveys from the PostHog dashboard");
  console.log();
  console.log("  4. Track custom events in your components:");
  console.log();
  console.log("     import { useAnalytics } from '@/hooks/useAnalytics';");
  console.log();
  console.log("     function MyComponent() {");
  console.log("       const { trackEvent } = useAnalytics();");
  console.log("       return (");
  console.log("         <button onClick={() => trackEvent('button_clicked', { label: 'cta' })}>");
  console.log("           Click me");
  console.log("         </button>");
  console.log("       );");
  console.log("     }");
  console.log();
  console.log("  GDPR note:");
  console.log("    PostHog supports cookie-less tracking and consent management.");
  console.log("    If you have the GDPR sail installed, consider integrating");
  console.log("    analytics consent with your consent tracking system.");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
