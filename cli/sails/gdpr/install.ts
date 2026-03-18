/**
 * GDPR/DSGVO Compliance Sail Installer
 *
 * Adds full GDPR compliance to your keel project:
 * consent tracking, data export, account deletion (30-day grace period),
 * consent checkboxes on signup, and a privacy policy page.
 *
 * Usage:
 *   npx tsx sails/gdpr/install.ts
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
import { randomBytes } from "node:crypto";
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
  content = content.replace(marker, `${code}\n${marker}`);
  writeFileSync(filePath, content, "utf-8");
  console.log(`  Modified -> ${filePath}`);
}

function insertAfterMarker(filePath: string, marker: string, code: string): void {
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

function appendToEnvExample(entries: Record<string, string>): void {
  const envPath = join(BACKEND_ROOT, ".env.example");
  if (!existsSync(envPath)) return;
  let content = readFileSync(envPath, "utf-8");
  const lines: string[] = [];
  for (const [key, val] of Object.entries(entries)) {
    if (!content.includes(key)) lines.push(`${key}=${val}`);
  }
  if (lines.length > 0) {
    content += `\n# GDPR\n${lines.join("\n")}\n`;
    writeFileSync(envPath, content, "utf-8");
  }
}

function insertBeforeClosingParen(filePath: string, searchString: string, insertion: string): void {
  if (!existsSync(filePath)) {
    console.warn(`  Warning: File not found: ${filePath}`);
    return;
  }
  let content = readFileSync(filePath, "utf-8");
  if (!content.includes(searchString)) {
    console.warn(`  Warning: "${searchString}" not found in ${filePath}`);
    return;
  }
  if (content.includes(insertion.trim())) {
    console.log(`  Skipped (already present) -> ${filePath}`);
    return;
  }
  content = content.replace(searchString, insertion + searchString);
  writeFileSync(filePath, content, "utf-8");
  console.log(`  Modified -> ${filePath}`);
}

// ---------------------------------------------------------------------------
// Schema definitions to insert
// ---------------------------------------------------------------------------

const SCHEMA_IMPORTS_ADDITION = `import { pgTable, text, boolean, varchar, timestamp } from "drizzle-orm/pg-core";`;

const CONSENT_RECORDS_SCHEMA = `
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

const USERS_RELATIONS_GDPR = `  consentRecords: many(consentRecords),
  deletionRequests: many(deletionRequests),
`;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome message ------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  GDPR/DSGVO Compliance Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds full GDPR compliance to your project:");
  console.log("    - Consent tracking (privacy policy, ToS, marketing, analytics)");
  console.log("    - Data export (download all personal data as JSON)");
  console.log("    - Account deletion with 30-day grace period");
  console.log("    - Immediate account deletion (with password confirmation)");
  console.log("    - Consent checkboxes on signup form");
  console.log("    - Privacy policy page");
  console.log("    - Consent management in account settings");
  console.log("    - GDPR-compliant email notifications");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: EU users check -------------------------------------------------
  const servesEU = await confirm({
    message: "Do you serve (or plan to serve) users in the EU?",
    default: true,
  });

  if (!servesEU) {
    console.log();
    console.log("  Note: GDPR applies if you process data of EU residents,");
    console.log("  regardless of where your company is based. Even if you");
    console.log("  don't specifically target EU users, GDPR compliance is");
    console.log("  recommended as a privacy best practice.");
    console.log();

    const continueAnyway = await confirm({
      message: "Continue with GDPR sail installation anyway?",
      default: true,
    });

    if (!continueAnyway) {
      console.log("\n  Installation cancelled.\n");
      process.exit(0);
    }
  }

  // -- Step 3: Deletion cron secret -------------------------------------------
  console.log();
  console.log("  The GDPR sail includes a cron endpoint for processing");
  console.log("  scheduled account deletions (30-day grace period).");
  console.log("  This endpoint requires a secret to prevent unauthorized access.");
  console.log();

  const autoGenerate = await confirm({
    message: "Auto-generate a secure DELETION_CRON_SECRET?",
    default: true,
  });

  let cronSecret: string;
  if (autoGenerate) {
    cronSecret = randomBytes(32).toString("hex");
    console.log();
    console.log(`  Generated: ${cronSecret.slice(0, 16)}...`);
  } else {
    cronSecret = await input({
      message: "DELETION_CRON_SECRET:",
      validate: (value) => {
        if (!value || value.trim().length === 0) return "Secret is required.";
        if (value.length < 16) return "Secret should be at least 16 characters.";
        return true;
      },
    });
  }

  // -- Step 4: Cron job explanation -------------------------------------------
  console.log();
  console.log("  To process scheduled deletions, set up a cron job that calls:");
  console.log();
  console.log("    POST {BACKEND_URL}/api/gdpr/process-deletions");
  console.log("    Header: x-cron-secret: {DELETION_CRON_SECRET}");
  console.log();
  console.log("  Recommended schedule: once daily (e.g., 2:00 AM).");
  console.log("  Services like cron-job.org, Vercel Cron, or Railway Cron work well.");
  console.log();

  await confirm({
    message: "I understand the cron job requirement. Continue?",
    default: true,
  });

  // -- Step 5: Summary --------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to copy (backend):");
  console.log("    + packages/backend/src/services/gdpr.ts");
  console.log("    + packages/backend/src/routes/gdpr.ts");
  console.log();
  console.log("  Files to copy (frontend):");
  console.log("    + packages/frontend/src/components/gdpr/DataExportButton.tsx");
  console.log("    + packages/frontend/src/components/gdpr/AccountDeletionRequest.tsx");
  console.log("    + packages/frontend/src/components/auth/ConsentCheckboxes.tsx");
  console.log("    + packages/frontend/src/pages/PrivacyPolicy.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/db/schema.ts (add consent_records, deletion_requests tables)");
  console.log("    ~ packages/backend/src/index.ts (add GDPR routes)");
  console.log("    ~ packages/backend/src/env.ts (add DELETION_CRON_SECRET)");
  console.log("    ~ packages/frontend/src/router.tsx (add /privacy-policy route)");
  console.log("    ~ packages/frontend/src/components/auth/SignupForm.tsx (add consent checkboxes)");
  console.log("    ~ packages/frontend/src/components/profile/AccountSettings.tsx (add GDPR section)");
  console.log("    ~ .env.example");
  console.log();
  console.log("  Environment variables:");
  console.log(`    DELETION_CRON_SECRET=${cronSecret.slice(0, 16)}...`);
  console.log();

  // -- Step 6: Confirm and execute --------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  console.log();
  console.log("  Installing...");
  console.log();

  // Copy backend files
  console.log("  Copying backend files...");
  const backendFiles = [
    { src: "backend/services/gdpr.ts", dest: "src/services/gdpr.ts" },
    { src: "backend/routes/gdpr.ts", dest: "src/routes/gdpr.ts" },
  ];
  for (const f of backendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(BACKEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/components/gdpr/DataExportButton.tsx", dest: "src/components/gdpr/DataExportButton.tsx" },
    { src: "frontend/components/gdpr/AccountDeletionRequest.tsx", dest: "src/components/gdpr/AccountDeletionRequest.tsx" },
    { src: "frontend/components/auth/ConsentCheckboxes.tsx", dest: "src/components/auth/ConsentCheckboxes.tsx" },
    { src: "frontend/pages/PrivacyPolicy.tsx", dest: "src/pages/PrivacyPolicy.tsx" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Modifying backend files...");

  // Add GDPR schema tables to schema.ts
  const schemaPath = join(BACKEND_ROOT, "src/db/schema.ts");
  if (existsSync(schemaPath)) {
    let schemaContent = readFileSync(schemaPath, "utf-8");

    // Ensure necessary imports are present (varchar may not be imported yet)
    if (!schemaContent.includes("varchar")) {
      // Add varchar to the drizzle-orm/pg-core import line
      schemaContent = schemaContent.replace(
        /import\s*\{([^}]*)\}\s*from\s*"drizzle-orm\/pg-core"/,
        (match, imports) => {
          const trimmed = imports.trim().replace(/,\s*$/, "");
          return `import { ${trimmed}, varchar } from "drizzle-orm/pg-core"`;
        }
      );
    }

    // Insert table definitions before the [SAIL_SCHEMA] marker
    if (schemaContent.includes("// [SAIL_SCHEMA]") && !schemaContent.includes("consentRecords")) {
      schemaContent = schemaContent.replace(
        "// [SAIL_SCHEMA]",
        CONSENT_RECORDS_SCHEMA + "\n// [SAIL_SCHEMA]"
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
    console.log(`  Modified -> src/db/schema.ts`);
  }

  // Add route import and mount
  insertAfterMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import gdprRoutes from "./routes/gdpr.js";'
  );
  insertAfterMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/gdpr", gdprRoutes);'
  );

  // Add env var to env.ts
  const envPath = join(BACKEND_ROOT, "src/env.ts");
  if (existsSync(envPath)) {
    let envContent = readFileSync(envPath, "utf-8");
    if (!envContent.includes("DELETION_CRON_SECRET")) {
      // Insert before the closing of the envSchema object
      envContent = envContent.replace(
        /}\);(\s*\nconst parsed)/,
        `\n  // GDPR\n  DELETION_CRON_SECRET: z.string().default("dev-cron-secret"),\n});$1`
      );
      writeFileSync(envPath, envContent, "utf-8");
      console.log(`  Modified -> src/env.ts`);
    }
  }

  console.log();
  console.log("  Modifying frontend files...");

  // Add privacy policy route to router.tsx
  const routerPath = join(FRONTEND_ROOT, "src/router.tsx");
  if (existsSync(routerPath)) {
    let routerContent = readFileSync(routerPath, "utf-8");

    // Add PrivacyPolicy import
    if (!routerContent.includes("PrivacyPolicy")) {
      routerContent = routerContent.replace(
        "export function AppRouter() {",
        'import PrivacyPolicy from "./pages/PrivacyPolicy";\n\nexport function AppRouter() {'
      );
    }

    // Add the route before the ProtectedRoute
    if (!routerContent.includes("/privacy-policy")) {
      routerContent = routerContent.replace(
        "<Route element={<ProtectedRoute />}>",
        '<Route path="/privacy-policy" element={<PrivacyPolicy />} />\n        <Route element={<ProtectedRoute />}>'
      );
    }

    writeFileSync(routerPath, routerContent, "utf-8");
    console.log(`  Modified -> src/router.tsx`);
  }

  // Modify SignupForm to include ConsentCheckboxes
  const signupPath = join(FRONTEND_ROOT, "src/components/auth/SignupForm.tsx");
  if (existsSync(signupPath)) {
    let signupContent = readFileSync(signupPath, "utf-8");

    if (!signupContent.includes("ConsentCheckboxes")) {
      // Add import
      signupContent = signupContent.replace(
        'import { useAuth } from "@/hooks/useAuth";',
        'import { useAuth } from "@/hooks/useAuth";\nimport { apiPost } from "@/lib/api";\nimport ConsentCheckboxes, { type ConsentState } from "./ConsentCheckboxes";'
      );

      // Add consent state
      signupContent = signupContent.replace(
        '  const [confirmPassword, setConfirmPassword] = useState("");',
        '  const [confirmPassword, setConfirmPassword] = useState("");\n  const [consent, setConsent] = useState<ConsentState>({\n    privacyPolicy: false,\n    termsOfService: false,\n    marketingEmails: false,\n    analytics: false,\n  });'
      );

      // Add consent validation before setIsSubmitting
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

      // Add ConsentCheckboxes component before submit button
      signupContent = signupContent.replace(
        "          <button\n            type=\"submit\"",
        "          <ConsentCheckboxes value={consent} onChange={setConsent} />\n\n          <button\n            type=\"submit\""
      );

      writeFileSync(signupPath, signupContent, "utf-8");
      console.log(`  Modified -> src/components/auth/SignupForm.tsx`);
    }
  }

  // Modify AccountSettings to include GDPR section
  const settingsPath = join(FRONTEND_ROOT, "src/components/profile/AccountSettings.tsx");
  if (existsSync(settingsPath)) {
    let settingsContent = readFileSync(settingsPath, "utf-8");

    if (!settingsContent.includes("DataExportButton")) {
      // Add imports
      settingsContent = settingsContent.replace(
        'import { apiGet } from "@/lib/api";',
        'import { apiGet, apiPost } from "@/lib/api";\nimport DataExportButton from "../gdpr/DataExportButton";\nimport AccountDeletionRequest from "../gdpr/AccountDeletionRequest";'
      );

      // Add consent state and types
      settingsContent = settingsContent.replace(
        "interface Session {",
        `interface ConsentSettings {
  marketingEmails: boolean;
  analytics: boolean;
}

interface Session {`
      );

      // Add consent state
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

      // Update loadSettings to include consent
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

      // Add consent change handler before return
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

      // Add consent management and GDPR sections after ProfilePage and before Active Sessions
      settingsContent = settingsContent.replace(
        "      {/* Active Sessions */}",
        `      {/* Consent Management */}
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Consent Preferences
        </h2>

        {consentLoading ? (
          <div className="flex items-center gap-2 py-4">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-keel-gray-800 border-t-keel-blue" />
            <span className="text-sm text-keel-gray-400">Loading...</span>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-keel-gray-100">
                  Marketing emails
                </p>
                <p className="text-xs text-keel-gray-400">
                  Receive product updates and promotional content
                </p>
              </div>
              <button
                onClick={() =>
                  handleConsentChange(
                    "marketingEmails",
                    !consent.marketingEmails,
                  )
                }
                disabled={consentSaving}
                className={\`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 \${
                  consent.marketingEmails ? "bg-keel-blue" : "bg-keel-gray-800"
                } disabled:opacity-50\`}
              >
                <span
                  className={\`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 \${
                    consent.marketingEmails
                      ? "translate-x-5"
                      : "translate-x-0"
                  }\`}
                />
              </button>
            </label>

            <label className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-keel-gray-100">
                  Usage analytics
                </p>
                <p className="text-xs text-keel-gray-400">
                  Help us improve by sharing anonymous usage data
                </p>
              </div>
              <button
                onClick={() =>
                  handleConsentChange("analytics", !consent.analytics)
                }
                disabled={consentSaving}
                className={\`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 \${
                  consent.analytics ? "bg-keel-blue" : "bg-keel-gray-800"
                } disabled:opacity-50\`}
              >
                <span
                  className={\`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200 \${
                    consent.analytics ? "translate-x-5" : "translate-x-0"
                  }\`}
                />
              </button>
            </label>
          </div>
        )}
      </div>

      {/* Active Sessions */}`
      );

      // Add GDPR section at the end (before closing </div>)
      settingsContent = settingsContent.replace(
        "    </div>\n  );\n}",
        `
      {/* GDPR Section */}
      <div className="rounded-xl border border-keel-gray-800 bg-keel-gray-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-white">
          Data & Privacy
        </h2>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-keel-gray-100">
              Export your data
            </h3>
            <p className="mb-3 text-xs text-keel-gray-400">
              Download a copy of all your personal data.
            </p>
            <DataExportButton />
          </div>

          <hr className="border-keel-gray-800" />

          <div>
            <h3 className="text-sm font-medium text-keel-gray-100">
              Delete account
            </h3>
            <p className="mb-3 text-xs text-keel-gray-400">
              Permanently delete your account and all associated data.
            </p>
            <AccountDeletionRequest />
          </div>
        </div>
      </div>
    </div>
  );
}`
      );

      writeFileSync(settingsPath, settingsContent, "utf-8");
      console.log(`  Modified -> src/components/profile/AccountSettings.tsx`);
    }
  }

  console.log();
  console.log("  Updating environment files...");
  appendToEnvExample({ DELETION_CRON_SECRET: cronSecret });

  const dotEnvPath = join(BACKEND_ROOT, ".env");
  if (existsSync(dotEnvPath)) {
    let dotEnv = readFileSync(dotEnvPath, "utf-8");
    if (!dotEnv.includes("DELETION_CRON_SECRET")) {
      dotEnv += `\n# GDPR\nDELETION_CRON_SECRET=${cronSecret}\n`;
      writeFileSync(dotEnvPath, dotEnv, "utf-8");
      console.log("  Updated .env");
    }
  }

  // -- Step 7: Generate database migrations -----------------------------------
  console.log();
  console.log("  Generating database migrations...");
  try {
    execSync("npx drizzle-kit generate", { cwd: BACKEND_ROOT, stdio: "inherit" });
  } catch {
    console.warn("  Warning: Could not generate migrations. Run manually: cd packages/backend && npx drizzle-kit generate");
  }

  // -- Step 8: Next steps -----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  GDPR/DSGVO Compliance installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Run database migrations:");
  console.log("       npm run db:migrate");
  console.log();
  console.log("  2. Set up a cron job for processing deletions:");
  console.log("       Schedule: daily (e.g., 2:00 AM)");
  console.log("       POST {BACKEND_URL}/api/gdpr/process-deletions");
  console.log("       Header: x-cron-secret: {DELETION_CRON_SECRET}");
  console.log();
  console.log("  3. Customize the privacy policy:");
  console.log("       Edit packages/frontend/src/pages/PrivacyPolicy.tsx");
  console.log("       Update contact information and company details");
  console.log();
  console.log("  4. Review email templates:");
  console.log("       The GDPR sail uses these email functions from @keel/email:");
  console.log("         - sendDeletionRequestedEmail");
  console.log("         - sendDeletionCompletedEmail");
  console.log("         - sendDeletionCancelledEmail");
  console.log("         - sendDataExportReadyEmail");
  console.log("         - sendConsentUpdatedEmail");
  console.log("       Customize them in packages/email/src/ as needed.");
  console.log();
  console.log("  5. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  GDPR features available at:");
  console.log("    - Signup: consent checkboxes on registration form");
  console.log("    - Settings: consent toggles, data export, account deletion");
  console.log("    - /privacy-policy: public privacy policy page");
  console.log("    - /api/gdpr/*: backend API endpoints");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
