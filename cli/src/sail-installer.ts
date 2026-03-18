/**
 * Sail installer module for the keel CLI (a codai project).
 *
 * Handles reading sail manifests, copying files, inserting code at marker
 * comments, installing dependencies, and running migrations.
 *
 * Works in two modes:
 *   1. During project creation (installSails) — installs sails selected in
 *      the creation wizard. Sail definitions are loaded from the CLI package's
 *      bundled sails directory.
 *   2. Post-creation (installSailByName) — installs a single sail from the
 *      CLI package into an existing project via `keel sail add <name>`.
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import chalk from "chalk";
import ora from "ora";
import type { ProjectConfig } from "./prompts.js";

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
  version: string;
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
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** Directory where sail definitions are bundled (shipped with the npm package). */
function getBundledSailsDir(): string {
  return join(__dirname, "..", "sails");
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Tracks manual steps the user needs to do when auto-insertion fails. */
const manualSteps: string[] = [];

/** Get all accumulated manual steps and clear the list. */
export function getManualSteps(): string[] {
  const steps = [...manualSteps];
  manualSteps.length = 0;
  return steps;
}

/**
 * Insert a code snippet directly below a marker comment in a file.
 *
 * Marker comments follow the pattern:
 *   // [SAIL_IMPORTS]
 *   // [SAIL_ROUTES]
 *   // [SAIL_SCHEMA]
 *   {/* [SAIL_SOCIAL_BUTTONS] * /}   (JSX)
 *
 * The function is idempotent -- it will not insert the same code twice.
 *
 * If the marker is missing (user modified the file), the insertion is skipped
 * and a manual step is recorded with the exact code the user needs to add.
 */
export function insertAtMarker(
  filePath: string,
  marker: string,
  code: string
): boolean {
  if (!existsSync(filePath)) {
    console.log(
      chalk.yellow(`    ⚠ File not found: ${filePath}`)
    );
    manualSteps.push(
      `Create file ${filePath} and add:\n${chalk.cyan(code)}`
    );
    return false;
  }

  let content = readFileSync(filePath, "utf-8");

  // Idempotency: skip if already inserted
  if (content.includes(code.trim())) {
    return true;
  }

  if (!content.includes(marker)) {
    // Marker was removed by user — record manual step
    const relativePath = filePath.replace(process.cwd() + "/", "");
    console.log(
      chalk.yellow(`    ⚠ Marker "${marker}" not found in ${relativePath} — skipping auto-insert`)
    );
    manualSteps.push(
      `In ${chalk.bold(relativePath)}, add the following code:\n\n${chalk.cyan(code)}\n`
    );
    return false;
  }

  content = content.replace(marker, `${marker}\n${code}`);
  writeFileSync(filePath, content, "utf-8");
  return true;
}

/**
 * Install npm packages into a workspace.
 */
function installDeps(
  deps: Record<string, string>,
  workspace: string,
  cwd: string
): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;

  const packages = entries.map(([name, version]) => `${name}@${version}`).join(" ");
  execSync(`npm install ${packages} --workspace=${workspace}`, {
    cwd,
    stdio: "pipe",
  });
}

/**
 * Append environment variables to .env.example (and .env if it exists).
 */
function appendEnvVars(
  projectDir: string,
  section: string,
  vars: Record<string, string>
): void {
  for (const envFile of [".env.example", ".env"]) {
    const envPath = join(projectDir, envFile);
    if (!existsSync(envPath)) continue;

    let content = readFileSync(envPath, "utf-8");
    const lines: string[] = [];

    for (const [key, val] of Object.entries(vars)) {
      if (!content.includes(key)) {
        lines.push(`${key}=${val}`);
      }
    }

    if (lines.length > 0) {
      content += `\n# ${section}\n${lines.join("\n")}\n`;
      writeFileSync(envPath, content, "utf-8");
    }
  }
}

// ---------------------------------------------------------------------------
// Sail-specific installation logic
// ---------------------------------------------------------------------------

function installGoogleOAuth(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy GoogleButton.tsx
  const destDir = join(frontendDir, "src/components/auth");
  mkdirSync(destDir, { recursive: true });
  copyFileSync(
    join(sailDir, "files/GoogleButton.tsx"),
    join(destDir, "GoogleButton.tsx")
  );

  // Modify backend auth config
  insertAtMarker(
    join(backendDir, "src/auth/index.ts"),
    "// [SAIL_SOCIAL_PROVIDERS]",
    `    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },`
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_CLIENT_SECRET: z.string().min(1, "GOOGLE_CLIENT_SECRET is required"),`
  );

  // Modify login and signup forms
  for (const form of ["LoginForm.tsx", "SignupForm.tsx"]) {
    const formPath = join(frontendDir, "src/components/auth", form);
    insertAtMarker(
      formPath,
      "// [SAIL_IMPORTS]",
      'import { GoogleButton } from "./GoogleButton";'
    );
    insertAtMarker(
      formPath,
      "{/* [SAIL_SOCIAL_BUTTONS] */}",
      "            <GoogleButton />"
    );
  }

  // Add env vars
  appendEnvVars(projectDir, "Google OAuth", {
    GOOGLE_CLIENT_ID: "",
    GOOGLE_CLIENT_SECRET: "",
  });
}

function installPushNotifications(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/schema/notifications.ts", dest: "src/db/schema/notifications.ts" },
    { src: "backend/routes/notifications.ts", dest: "src/routes/notifications.ts" },
    { src: "backend/services/notifications.ts", dest: "src/services/notifications.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/hooks/usePushNotifications.ts", dest: "src/hooks/usePushNotifications.ts" },
    { src: "frontend/components/PushNotificationInit.tsx", dest: "src/components/PushNotificationInit.tsx" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify backend schema index
  insertAtMarker(
    join(backendDir, "src/db/schema/index.ts"),
    "// [SAIL_SCHEMA]",
    'export * from "./notifications.js";'
  );

  // Modify backend index.ts
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { notificationsRouter } from "./routes/notifications.js";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/notifications", notificationsRouter);'
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  FIREBASE_PROJECT_ID: z.string().min(1, "FIREBASE_PROJECT_ID is required"),
  FIREBASE_PRIVATE_KEY: z.string().min(1, "FIREBASE_PRIVATE_KEY is required"),
  FIREBASE_CLIENT_EMAIL: z.string().min(1, "FIREBASE_CLIENT_EMAIL is required"),`
  );

  // Modify Layout.tsx to include PushNotificationInit
  const layoutPath = join(frontendDir, "src/components/layout/Layout.tsx");
  if (existsSync(layoutPath)) {
    let content = readFileSync(layoutPath, "utf-8");
    if (!content.includes("PushNotificationInit")) {
      const importLine = 'import { PushNotificationInit } from "@/components/PushNotificationInit.js";';
      const lastImport = content.lastIndexOf("import ");
      const importLineEnd = content.indexOf("\n", lastImport);
      content =
        content.slice(0, importLineEnd + 1) +
        importLine + "\n" +
        content.slice(importLineEnd + 1);
      content = content.replace(
        '<div className="flex min-h-screen flex-col bg-keel-navy">',
        '<div className="flex min-h-screen flex-col bg-keel-navy">\n      <PushNotificationInit />'
      );
      writeFileSync(layoutPath, content, "utf-8");
    }
  }

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.backend, "packages/backend", projectDir);
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);

  // Generate migrations
  try {
    execSync("npx drizzle-kit generate", {
      cwd: backendDir,
      stdio: "pipe",
    });
  } catch {
    // Migration generation may fail if drizzle-kit is not yet configured
  }

  // Add env vars
  appendEnvVars(projectDir, "Push Notifications (Firebase)", {
    FIREBASE_PROJECT_ID: "",
    FIREBASE_PRIVATE_KEY: "",
    FIREBASE_CLIENT_EMAIL: "",
  });
}

function installAnalytics(sailDir: string, projectDir: string): void {
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/lib/analytics.ts", dest: "src/lib/analytics.ts" },
    { src: "frontend/hooks/useAnalytics.ts", dest: "src/hooks/useAnalytics.ts" },
    { src: "frontend/components/AnalyticsProvider.tsx", dest: "src/components/AnalyticsProvider.tsx" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify App.tsx to wrap with AnalyticsProvider
  const appPath = join(frontendDir, "src/App.tsx");
  if (existsSync(appPath)) {
    let content = readFileSync(appPath, "utf-8");
    if (!content.includes("AnalyticsProvider")) {
      const importLine = 'import { AnalyticsProvider } from "./components/AnalyticsProvider.js";';
      const lastImport = content.lastIndexOf("import ");
      const importLineEnd = content.indexOf("\n", lastImport);
      content =
        content.slice(0, importLineEnd + 1) +
        importLine + "\n" +
        content.slice(importLineEnd + 1);
      content = content.replace(
        "<AppRouter />",
        "<AnalyticsProvider>\n      <AppRouter />\n    </AnalyticsProvider>"
      );
      writeFileSync(appPath, content, "utf-8");
    }
  }

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);

  // Add env vars
  appendEnvVars(projectDir, "PostHog Analytics", {
    VITE_POSTHOG_KEY: "",
    VITE_POSTHOG_HOST: "https://us.i.posthog.com",
  });
}

function installStripe(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/schema/stripe.ts", dest: "src/db/schema/stripe.ts" },
    { src: "backend/routes/stripe.ts", dest: "src/routes/stripe.ts" },
    { src: "backend/services/stripe.ts", dest: "src/services/stripe.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/pages/Pricing.tsx", dest: "src/pages/Pricing.tsx" },
    { src: "frontend/pages/Checkout.tsx", dest: "src/pages/Checkout.tsx" },
    {
      src: "frontend/components/SubscriptionStatus.tsx",
      dest: "src/components/stripe/SubscriptionStatus.tsx",
    },
    { src: "frontend/hooks/useSubscription.ts", dest: "src/hooks/useSubscription.ts" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify backend schema index
  insertAtMarker(
    join(backendDir, "src/db/schema/index.ts"),
    "// [SAIL_SCHEMA]",
    'export * from "./stripe";'
  );

  // Modify backend index.ts
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { stripeRouter } from "./routes/stripe";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/stripe", stripeRouter);'
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),
  STRIPE_PUBLISHABLE_KEY: z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),
  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),`
  );

  // Modify frontend router
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "// [SAIL_IMPORTS]",
    `import { PricingPage } from "./pages/Pricing";
import { CheckoutPage } from "./pages/Checkout";`
  );
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "// [SAIL_ROUTES]",
    `      {
        path: "/pricing",
        element: <PricingPage />,
      },
      {
        path: "/checkout/success",
        element: <CheckoutPage status="success" />,
      },
      {
        path: "/checkout/cancel",
        element: <CheckoutPage status="cancel" />,
      },`
  );

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.backend, "packages/backend", projectDir);
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);

  // Generate migrations
  try {
    execSync("npx drizzle-kit generate", {
      cwd: backendDir,
      stdio: "pipe",
    });
  } catch {
    // Migration generation may fail if drizzle-kit is not yet configured
  }

  // Add env vars
  appendEnvVars(projectDir, "Stripe Payments", {
    STRIPE_SECRET_KEY: "",
    STRIPE_PUBLISHABLE_KEY: "",
    STRIPE_WEBHOOK_SECRET: "",
  });
}

function installAdminDashboard(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/middleware/admin.ts", dest: "src/middleware/admin.ts" },
    { src: "backend/routes/admin.ts", dest: "src/routes/admin.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/pages/admin/Dashboard.tsx", dest: "src/pages/admin/Dashboard.tsx" },
    { src: "frontend/pages/admin/UserDetail.tsx", dest: "src/pages/admin/UserDetail.tsx" },
    { src: "frontend/components/admin/StatsCard.tsx", dest: "src/components/admin/StatsCard.tsx" },
    { src: "frontend/components/admin/UsersTable.tsx", dest: "src/components/admin/UsersTable.tsx" },
    { src: "frontend/hooks/useAdmin.ts", dest: "src/hooks/useAdmin.ts" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify backend index.ts
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { adminRouter } from "./routes/admin.js";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/admin", adminRouter);'
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    '  ADMIN_EMAILS: z.string().default(""),'
  );

  // Add frontend routes
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "{/* [SAIL_ROUTES] */}",
    `          <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users/:id" element={<ProtectedRoute><AdminUserDetail /></ProtectedRoute>} />`
  );

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);

  // Add env vars
  appendEnvVars(projectDir, "Admin Dashboard", {
    ADMIN_EMAILS: "",
  });
}

function installI18n(sailDir: string, projectDir: string): void {
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/lib/i18n.ts", dest: "src/lib/i18n.ts" },
    { src: "frontend/hooks/useLanguage.ts", dest: "src/hooks/useLanguage.ts" },
    { src: "frontend/components/LanguageSwitcher.tsx", dest: "src/components/LanguageSwitcher.tsx" },
    { src: "frontend/locales/en/common.json", dest: "src/locales/en/common.json" },
    { src: "frontend/locales/de/common.json", dest: "src/locales/de/common.json" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify main.tsx to import i18n
  const mainPath = join(frontendDir, "src/main.tsx");
  if (existsSync(mainPath)) {
    let content = readFileSync(mainPath, "utf-8");
    if (!content.includes("./lib/i18n")) {
      content = 'import "./lib/i18n.js";\n' + content;
      writeFileSync(mainPath, content, "utf-8");
    }
  }

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);
}

function installRateLimiting(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/middleware/rate-limit.ts", dest: "src/middleware/rate-limit.ts" },
    { src: "backend/middleware/rate-limit-store.ts", dest: "src/middleware/rate-limit-store.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Add rate limiter import and apply globally
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { apiLimiter, authLimiter } from "./middleware/rate-limit.js";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api", apiLimiter);'
  );
}

function installFileUploads(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/services/file-storage.ts", dest: "src/services/file-storage.ts" },
    { src: "backend/routes/files.ts", dest: "src/routes/files.ts" },
    { src: "backend/schema/files.ts", dest: "src/db/schema/files.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/hooks/useFileUpload.ts", dest: "src/hooks/useFileUpload.ts" },
    { src: "frontend/hooks/useFiles.ts", dest: "src/hooks/useFiles.ts" },
    { src: "frontend/components/FileUploadButton.tsx", dest: "src/components/files/FileUploadButton.tsx" },
    { src: "frontend/components/FileList.tsx", dest: "src/components/files/FileList.tsx" },
    { src: "frontend/pages/Files.tsx", dest: "src/pages/Files.tsx" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Modify backend schema index
  insertAtMarker(
    join(backendDir, "src/db/schema/index.ts"),
    "// [SAIL_SCHEMA]",
    'export * from "./files.js";'
  );

  // Modify backend index.ts
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { filesRouter } from "./routes/files.js";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/files", filesRouter);'
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  S3_ENDPOINT: z.string().default(""),
  S3_ACCESS_KEY_ID: z.string().default(""),
  S3_SECRET_ACCESS_KEY: z.string().default(""),
  S3_BUCKET_NAME: z.string().default("uploads"),
  S3_PUBLIC_URL: z.string().default(""),
  S3_REGION: z.string().default("auto"),`
  );

  // Add frontend route
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "{/* [SAIL_ROUTES] */}",
    '          <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />'
  );

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.backend, "packages/backend", projectDir);

  // Generate migrations
  try {
    execSync("npx drizzle-kit generate", {
      cwd: backendDir,
      stdio: "pipe",
    });
  } catch {
    // Migration generation may fail if drizzle-kit is not yet configured
  }

  // Add env vars
  appendEnvVars(projectDir, "File Uploads (S3-compatible)", {
    S3_ENDPOINT: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    S3_BUCKET_NAME: "uploads",
    S3_PUBLIC_URL: "",
    S3_REGION: "auto",
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Install a single sail by name into a target project directory.
 *
 * Used by `keel sail add <name>` (the manage.ts entry point).
 *
 * If any marker comments are missing (user modified files), the installer
 * skips those auto-insertions and prints clear manual instructions instead.
 *
 * @param sailName - The sail identifier (e.g., "google-oauth", "stripe")
 * @param sailDir  - Path to the sail definition (from the CLI package's bundled sails)
 * @param projectDir - Path to the target project (cwd by default)
 */
export async function installSailByName(
  sailName: string,
  sailDir: string,
  projectDir: string
): Promise<void> {
  // Clear any previous manual steps
  getManualSteps();

  switch (sailName) {
    case "google-oauth":
      installGoogleOAuth(sailDir, projectDir);
      break;

    case "stripe":
      installStripe(sailDir, projectDir);
      break;

    case "push-notifications":
      installPushNotifications(sailDir, projectDir);
      break;

    case "analytics":
      installAnalytics(sailDir, projectDir);
      break;

    case "admin-dashboard":
      installAdminDashboard(sailDir, projectDir);
      break;

    case "i18n":
      installI18n(sailDir, projectDir);
      break;

    case "rate-limiting":
      installRateLimiting(sailDir, projectDir);
      break;

    case "file-uploads":
      installFileUploads(sailDir, projectDir);
      break;

    case "gdpr":
    case "r2-storage":
      // These sails have their own install.ts with setup wizards
      // They are invoked directly from manage.ts, not through this switch
      break;

    default:
      throw new Error(`Unknown sail: ${sailName}`);
  }

  // Print manual steps if any markers were missing
  const steps = getManualSteps();
  if (steps.length > 0) {
    console.log();
    console.log(chalk.yellow.bold("  ⚠ Some auto-insertions were skipped because marker comments were missing."));
    console.log(chalk.yellow("  This usually means you've customized those files. Please add the following manually:\n"));
    steps.forEach((step, i) => {
      console.log(chalk.white(`  ${i + 1}. ${step}`));
    });
    console.log();
  }
}

/**
 * Install all selected sails into the scaffolded project.
 *
 * Used during project creation (the create.ts entry point).
 */
export async function installSails(config: ProjectConfig): Promise<void> {
  const projectDir = resolve(process.cwd(), config.projectName);
  const bundledSailsDir = getBundledSailsDir();

  for (const sail of config.sails) {
    const spinner = ora(`  Installing ${sail}...`).start();
    const sailDir = join(bundledSailsDir, sail);

    try {
      await installSailByName(sail, sailDir, projectDir);

      const steps = getManualSteps();
      if (steps.length > 0) {
        spinner.warn(`  ${sail} installed (some manual steps needed)`);
      } else {
        spinner.succeed(`  ${sail} installed`);
      }

      // Update installed.json in the new project
      const installedPath = join(projectDir, "sails", "installed.json");
      if (existsSync(installedPath)) {
        const installed = JSON.parse(readFileSync(installedPath, "utf-8"));
        if (!installed.installed.includes(sail)) {
          installed.installed.push(sail);
          writeFileSync(
            installedPath,
            JSON.stringify(installed, null, 2) + "\n",
            "utf-8"
          );
        }
      }
    } catch (error) {
      spinner.fail(`  Failed to install ${sail}`);
      console.error(chalk.red(`    ${error}`));
    }
  }
}
