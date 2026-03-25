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
import { execFileSync } from "node:child_process";
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
/**
 * Find a marker in file content using whitespace-tolerant matching.
 *
 * Handles variations like:
 *   // [SAIL_IMPORTS]
 *   //  [SAIL_IMPORTS]
 *   //[SAIL_IMPORTS]
 *   {/* [SAIL_IMPORTS] * /}   (JSX)
 *
 * Returns the exact string found in the file, or null if not present.
 */
function findMarker(content: string, marker: string): string | null {
  // First try an exact match
  if (content.includes(marker)) {
    return marker;
  }

  // Extract the marker name (e.g. "SAIL_IMPORTS" from "// [SAIL_IMPORTS]")
  const markerNameMatch = marker.match(/\[(\w+)\]/);
  if (!markerNameMatch) {
    return null;
  }
  const markerName = markerNameMatch[1];

  // Build a flexible regex that tolerates whitespace differences
  // Matches both JS comments (// [NAME]) and JSX comments ({/* [NAME] */})
  const flexiblePattern = new RegExp(
    `(?:\\/\\/\\s*\\[${markerName}\\]|\\{\\s*\\/\\*\\s*\\[${markerName}\\]\\s*\\*\\/\\s*\\})`,
  );
  const match = content.match(flexiblePattern);
  return match ? match[0] : null;
}

export function insertAtMarker(
  filePath: string,
  marker: string,
  code: string
): boolean {
  const relativePath = filePath.replace(process.cwd() + "/", "");

  if (!existsSync(filePath)) {
    console.log(
      chalk.yellow(`    ⚠ File not found: ${relativePath}`)
    );
    manualSteps.push(
      `Create file ${chalk.bold(relativePath)} and add the following code:\n\n${chalk.cyan(code)}\n`
    );
    return false;
  }

  let content = readFileSync(filePath, "utf-8");

  // Idempotency: skip if already inserted
  if (content.includes(code.trim())) {
    return true;
  }

  // Use whitespace-tolerant marker matching
  const foundMarker = findMarker(content, marker);

  if (!foundMarker) {
    // Marker was removed or reformatted beyond recognition
    console.log(
      chalk.yellow(`    ⚠ Marker "${marker}" not found in ${relativePath} — skipping auto-insert`)
    );
    console.log(
      chalk.gray(`      The marker may have been removed or reformatted.`)
    );
    manualSteps.push(
      `In ${chalk.bold(relativePath)}, add the following code (near where the marker "${marker}" would be):\n\n${chalk.cyan(code)}\n`
    );
    return false;
  }

  content = content.replace(foundMarker, `${foundMarker}\n${code}`);
  writeFileSync(filePath, content, "utf-8");
  return true;
}

/**
 * Install npm packages into a workspace.
 */
const SAFE_PACKAGE_NAME = /^(@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/;

function installDeps(
  deps: Record<string, string>,
  workspace: string,
  cwd: string
): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;

  for (const [name] of entries) {
    if (!SAFE_PACKAGE_NAME.test(name)) {
      throw new Error(`Invalid package name: ${name}`);
    }
  }

  const packageList = entries.map(([name, version]) => `${name}@${version}`);
  execFileSync("npm", ["install", ...packageList, `--workspace=${workspace}`], {
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
    `  GOOGLE_CLIENT_ID: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "GOOGLE_CLIENT_ID is required in production").default(""),
  GOOGLE_CLIENT_SECRET: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "GOOGLE_CLIENT_SECRET is required in production").default(""),`
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
    `  FIREBASE_PROJECT_ID: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "FIREBASE_PROJECT_ID is required in production").default(""),
  FIREBASE_PRIVATE_KEY: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "FIREBASE_PRIVATE_KEY is required in production").default(""),
  FIREBASE_CLIENT_EMAIL: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "FIREBASE_CLIENT_EMAIL is required in production").default(""),`
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
    execFileSync("npx", ["drizzle-kit", "generate"], {
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

  // Stripe webhook needs the raw body — insert express.raw() BEFORE express.json()
  const indexPath = join(backendDir, "src/index.ts");
  if (existsSync(indexPath)) {
    let indexContent = readFileSync(indexPath, "utf-8");
    const rawMiddleware = 'app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));';
    if (!indexContent.includes(rawMiddleware)) {
      indexContent = indexContent.replace(
        "app.use(express.json());",
        `// Raw body for Stripe webhook signature verification (must be before express.json())\n${rawMiddleware}\n\napp.use(express.json());`,
      );
      writeFileSync(indexPath, indexContent, "utf-8");
    }
  }

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  STRIPE_SECRET_KEY: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "STRIPE_SECRET_KEY is required in production").default(""),
  STRIPE_PUBLISHABLE_KEY: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "STRIPE_PUBLISHABLE_KEY is required in production").default(""),
  STRIPE_WEBHOOK_SECRET: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "STRIPE_WEBHOOK_SECRET is required in production").default(""),`
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
    execFileSync("npx", ["drizzle-kit", "generate"], {
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
    '  ADMIN_EMAILS: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "ADMIN_EMAILS is required in production").default(""),'
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

function installGdpr(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const backendMappings = [
    { src: "backend/services/gdpr.ts", dest: "src/services/gdpr.ts" },
    { src: "backend/routes/gdpr.ts", dest: "src/routes/gdpr.ts" },
  ];
  for (const m of backendMappings) {
    const destPath = join(backendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Copy frontend files
  const frontendMappings = [
    { src: "frontend/components/gdpr/DataExportButton.tsx", dest: "src/components/gdpr/DataExportButton.tsx" },
    { src: "frontend/components/gdpr/AccountDeletionRequest.tsx", dest: "src/components/gdpr/AccountDeletionRequest.tsx" },
    { src: "frontend/components/auth/ConsentCheckboxes.tsx", dest: "src/components/auth/ConsentCheckboxes.tsx" },
    { src: "frontend/pages/PrivacyPolicy.tsx", dest: "src/pages/PrivacyPolicy.tsx" },
  ];
  for (const m of frontendMappings) {
    const destPath = join(frontendDir, m.dest);
    mkdirSync(dirname(destPath), { recursive: true });
    copyFileSync(join(sailDir, "files", m.src), destPath);
  }

  // Add GDPR schema tables to schema.ts (inline, since there is no separate schema file)
  const schemaPath = join(backendDir, "src/db/schema.ts");
  if (existsSync(schemaPath)) {
    let schemaContent = readFileSync(schemaPath, "utf-8");

    // Ensure varchar import is present
    if (!schemaContent.includes("varchar")) {
      schemaContent = schemaContent.replace(
        /import\s*\{([^}]*)\}\s*from\s*"drizzle-orm\/pg-core"/,
        (match, imports) => {
          const trimmed = imports.trim().replace(/,\s*$/, "");
          return `import { ${trimmed}, varchar } from "drizzle-orm/pg-core"`;
        }
      );
    }

    // Insert GDPR table definitions at the SAIL_SCHEMA marker
    if (schemaContent.includes("// [SAIL_SCHEMA]") && !schemaContent.includes("consentRecords")) {
      const gdprSchema = `
export const consentRecords = pgTable("consent_records", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  consentType: varchar("consent_type", { length: 50 }).notNull(),
  granted: boolean("granted").notNull(),
  version: varchar("version", { length: 20 }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  grantedAt: timestamp("granted_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at"),
});

export const deletionRequests = pgTable("deletion_requests", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 20 }).default("pending").notNull(),
  reason: text("reason"),
  requestedAt: timestamp("requested_at").defaultNow().notNull(),
  scheduledDeletionAt: timestamp("scheduled_deletion_at").notNull(),
  cancelledAt: timestamp("cancelled_at"),
  completedAt: timestamp("completed_at"),
});

export const consentRecordsRelations = relations(consentRecords, ({ one }) => ({
  user: one(users, { fields: [consentRecords.userId], references: [users.id] }),
}));

export const deletionRequestsRelations = relations(deletionRequests, ({ one }) => ({
  user: one(users, { fields: [deletionRequests.userId], references: [users.id] }),
}));
`;
      schemaContent = schemaContent.replace(
        "// [SAIL_SCHEMA]",
        `// [SAIL_SCHEMA]\n${gdprSchema}`
      );
    }

    // Add GDPR relations to usersRelations
    if (schemaContent.includes("usersRelations") && !schemaContent.includes("consentRecords: many(consentRecords)")) {
      schemaContent = schemaContent.replace(
        /export const usersRelations = relations\(users, \(\{ many \}\) => \(\{/,
        `export const usersRelations = relations(users, ({ many }) => ({\n  consentRecords: many(consentRecords),\n  deletionRequests: many(deletionRequests),`
      );
    }

    writeFileSync(schemaPath, schemaContent, "utf-8");
  }

  // Modify backend index.ts
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import gdprRoutes from "./routes/gdpr.js";'
  );
  insertAtMarker(
    join(backendDir, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/gdpr", gdprRoutes);'
  );

  // Add env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    '  DELETION_CRON_SECRET: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "DELETION_CRON_SECRET is required in production").default("dev-cron-secret"),'
  );

  // Add privacy policy route to frontend router
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "// [SAIL_IMPORTS]",
    'import PrivacyPolicy from "./pages/PrivacyPolicy";'
  );
  insertAtMarker(
    join(frontendDir, "src/router.tsx"),
    "{/* [SAIL_ROUTES] */}",
    '          <Route path="/privacy-policy" element={<PrivacyPolicy />} />'
  );

  // Modify SignupForm to include ConsentCheckboxes
  const signupPath = join(frontendDir, "src/components/auth/SignupForm.tsx");
  if (existsSync(signupPath)) {
    let signupContent = readFileSync(signupPath, "utf-8");

    if (!signupContent.includes("ConsentCheckboxes")) {
      signupContent = signupContent.replace(
        'import { useAuth } from "@/hooks/useAuth";',
        'import { useAuth } from "@/hooks/useAuth";\nimport { apiPost } from "@/lib/api";\nimport ConsentCheckboxes, { type ConsentState } from "./ConsentCheckboxes";'
      );

      signupContent = signupContent.replace(
        '  const [confirmPassword, setConfirmPassword] = useState("");',
        '  const [confirmPassword, setConfirmPassword] = useState("");\n  const [consent, setConsent] = useState<ConsentState>({\n    privacyPolicy: false,\n    termsOfService: false,\n    marketingEmails: false,\n    analytics: false,\n  });'
      );

      signupContent = signupContent.replace(
        "    setIsSubmitting(true);\n\n    try {\n      await signup(email, password, name);\n\n      setSuccess(true);",
        `    if (!consent.privacyPolicy || !consent.termsOfService) {
      setError("You must accept the Privacy Policy and Terms of Service.");
      return;
    }

    setIsSubmitting(true);

    try {
      await signup(email, password, name);

      // Record consent after successful signup
      try {
        await apiPost("/api/gdpr/consent", {
          privacyPolicy: consent.privacyPolicy,
          termsOfService: consent.termsOfService,
          marketingEmails: consent.marketingEmails,
          analytics: consent.analytics,
        });
      } catch {
        // Non-critical: consent recording failure shouldn't block signup
      }

      setSuccess(true);`
      );

      signupContent = signupContent.replace(
        "          <button\n            type=\"submit\"",
        "          <ConsentCheckboxes value={consent} onChange={setConsent} />\n\n          <button\n            type=\"submit\""
      );

      writeFileSync(signupPath, signupContent, "utf-8");
    }
  }

  // Modify AccountSettings to include GDPR section
  const settingsPath = join(frontendDir, "src/components/profile/AccountSettings.tsx");
  if (existsSync(settingsPath)) {
    let settingsContent = readFileSync(settingsPath, "utf-8");

    if (!settingsContent.includes("DataExportButton")) {
      settingsContent = settingsContent.replace(
        'import { apiGet } from "@/lib/api";',
        'import { apiGet, apiPost } from "@/lib/api";\nimport DataExportButton from "../gdpr/DataExportButton";\nimport AccountDeletionRequest from "../gdpr/AccountDeletionRequest";'
      );

      settingsContent = settingsContent.replace(
        "interface Session {",
        `interface ConsentSettings {
  marketingEmails: boolean;
  analytics: boolean;
}

interface Session {`
      );

      settingsContent = settingsContent.replace(
        "  const [sessions, setSessions] = useState<Session[]>([]);",
        `  const [consent, setConsent] = useState<ConsentSettings>({
    marketingEmails: false,
    analytics: false,
  });
  const [sessions, setSessions] = useState<Session[]>([]);
  const [consentLoading, setConsentLoading] = useState(true);
  const [consentSaving, setConsentSaving] = useState(false);`
      );

      settingsContent = settingsContent.replace(
        `    async function loadSettings() {
      try {
        const sessionsData = await apiGet<Session[]>("/api/auth/sessions");
        setSessions(sessionsData);
      } catch {
        // Settings may not exist yet
      }
    }`,
        `    async function loadSettings() {
      try {
        const [consentData, sessionsData] = await Promise.all([
          apiGet<ConsentSettings>("/api/gdpr/consent"),
          apiGet<Session[]>("/api/auth/sessions"),
        ]);
        setConsent(consentData);
        setSessions(sessionsData);
      } catch {
        // Settings may not exist yet
      } finally {
        setConsentLoading(false);
      }
    }`
      );

      settingsContent = settingsContent.replace(
        "  return (",
        `  const handleConsentChange = async (
    field: keyof ConsentSettings,
    value: boolean,
  ) => {
    const updated = { ...consent, [field]: value };
    setConsent(updated);
    setConsentSaving(true);

    try {
      await apiPost("/api/gdpr/consent", updated);
    } catch {
      // Revert on error
      setConsent(consent);
    } finally {
      setConsentSaving(false);
    }
  };

  return (`
      );

      writeFileSync(settingsPath, settingsContent, "utf-8");
    }
  }

  // Generate migrations
  try {
    execFileSync("npx", ["drizzle-kit", "generate"], {
      cwd: backendDir,
      stdio: "pipe",
    });
  } catch {
    // Migration generation may fail if drizzle-kit is not yet configured
  }

  // Add env vars
  appendEnvVars(projectDir, "GDPR", {
    DELETION_CRON_SECRET: "",
  });
}

function installR2Storage(sailDir: string, projectDir: string): void {
  const backendDir = join(projectDir, "packages/backend");
  const frontendDir = join(projectDir, "packages/frontend");

  // Copy backend files
  const destStoragePath = join(backendDir, "src/services/storage.ts");
  mkdirSync(dirname(destStoragePath), { recursive: true });
  copyFileSync(
    join(sailDir, "files/backend/services/storage.ts"),
    destStoragePath
  );

  // Copy frontend files
  const destUploadPath = join(frontendDir, "src/components/profile/ProfilePictureUpload.tsx");
  mkdirSync(dirname(destUploadPath), { recursive: true });
  copyFileSync(
    join(sailDir, "files/frontend/components/ProfilePictureUpload.tsx"),
    destUploadPath
  );

  // Add R2 env var validation
  insertAtMarker(
    join(backendDir, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  R2_ACCOUNT_ID: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "R2_ACCOUNT_ID is required in production").default(""),
  R2_ACCESS_KEY_ID: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "R2_ACCESS_KEY_ID is required in production").default(""),
  R2_SECRET_ACCESS_KEY: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "R2_SECRET_ACCESS_KEY is required in production").default(""),
  R2_BUCKET_NAME: z.string().default("avatars"),
  R2_PUBLIC_URL: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "R2_PUBLIC_URL is required in production").default(""),`
  );

  // Add avatar routes to profile.ts
  const profilePath = join(backendDir, "src/routes/profile.ts");
  if (existsSync(profilePath)) {
    let profileContent = readFileSync(profilePath, "utf-8");

    // Add storage import if not present
    if (!profileContent.includes("storage")) {
      profileContent = profileContent.replace(
        'import { db } from "../db/index.js";',
        'import { db } from "../db/index.js";\nimport { generateUploadUrl, deleteObject } from "../services/storage.js";',
      );
    }

    // Add avatar routes if not present
    if (!profileContent.includes("/avatar/upload-url")) {
      const avatarRoutes = `
// POST /avatar/upload-url — generate presigned upload URL
router.post("/avatar/upload-url", async (req, res) => {
  const { fileType } = req.body as { fileType?: string };

  if (!fileType || typeof fileType !== "string") {
    res.status(400).json({ error: "fileType is required" });
    return;
  }

  const result = await generateUploadUrl(req.user!.id, fileType);
  res.json(result);
});

// DELETE /avatar — delete current avatar
router.delete("/avatar", async (req, res) => {
  const user = req.user!;

  if (user.image) {
    try {
      // Extract key from the image URL or stored key
      await deleteObject(user.image);
    } catch {
      // Continue even if R2 deletion fails
    }
  }

  const [updated] = await db
    .update(users)
    .set({ image: null, updatedAt: new Date() })
    .where(eq(users.id, user.id))
    .returning();

  res.json({ user: updated });
});`;

      profileContent = profileContent.replace(
        "export default router;",
        `${avatarRoutes}\n\nexport default router;`,
      );
    }

    writeFileSync(profilePath, profileContent, "utf-8");
  }

  // Add ProfilePictureUpload to ProfilePage.tsx
  const profilePagePath = join(frontendDir, "src/components/profile/ProfilePage.tsx");
  if (existsSync(profilePagePath)) {
    let pageContent = readFileSync(profilePagePath, "utf-8");

    if (!pageContent.includes("ProfilePictureUpload")) {
      pageContent = pageContent.replace(
        'import { apiPatch } from "@/lib/api";',
        'import { apiPatch } from "@/lib/api";\nimport ProfilePictureUpload from "./ProfilePictureUpload";',
      );

      pageContent = pageContent.replace(
        '<div className="flex flex-col items-start gap-6 sm:flex-row">',
        '<div className="flex flex-col items-start gap-6 sm:flex-row">\n          <ProfilePictureUpload />',
      );
    }

    writeFileSync(profilePagePath, pageContent, "utf-8");
  }

  // Install dependencies
  const manifest: SailManifest = JSON.parse(
    readFileSync(join(sailDir, "addon.json"), "utf-8")
  );
  installDeps(manifest.dependencies.backend, "packages/backend", projectDir);
  installDeps(manifest.dependencies.frontend, "packages/frontend", projectDir);

  // Add env vars
  appendEnvVars(projectDir, "Cloudflare R2 Storage", {
    R2_ACCOUNT_ID: "",
    R2_ACCESS_KEY_ID: "",
    R2_SECRET_ACCESS_KEY: "",
    R2_BUCKET_NAME: "avatars",
    R2_PUBLIC_URL: "",
  });
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
    `  S3_ENDPOINT: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "S3_ENDPOINT is required in production").default(""),
  S3_ACCESS_KEY_ID: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "S3_ACCESS_KEY_ID is required in production").default(""),
  S3_SECRET_ACCESS_KEY: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "S3_SECRET_ACCESS_KEY is required in production").default(""),
  S3_BUCKET_NAME: z.string().default("uploads"),
  S3_PUBLIC_URL: z.string().min(process.env.NODE_ENV === "production" ? 1 : 0, "S3_PUBLIC_URL is required in production").default(""),
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
    execFileSync("npx", ["drizzle-kit", "generate"], {
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
      installGdpr(sailDir, projectDir);
      break;

    case "r2-storage":
      installR2Storage(sailDir, projectDir);
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
  // Clear any leftover manual steps from previous calls
  manualSteps.length = 0;

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
