/**
 * Admin Dashboard Sail Installer
 *
 * Adds an admin dashboard for user management and basic metrics.
 * Includes user listing, user detail, stats cards, and a signup chart.
 *
 * Usage:
 *   npx tsx sails/admin-dashboard/install.ts
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

function installDeps(deps: Record<string, string>, workspace: string): void {
  const entries = Object.entries(deps);
  if (entries.length === 0) return;
  const packages = entries.map(([n, v]) => `${n}@${v}`).join(" ");
  const cmd = `npm install ${packages} --workspace=${workspace}`;
  console.log(`  Running: ${cmd}`);
  execSync(cmd, { cwd: PROJECT_ROOT, stdio: "inherit" });
}

// ---------------------------------------------------------------------------
// Email validation helper
// ---------------------------------------------------------------------------

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validateAdminEmails(value: string): true | string {
  if (!value || value.trim().length === 0) {
    return "At least one admin email is required.";
  }
  const emails = value.split(",").map((e) => e.trim()).filter(Boolean);
  if (emails.length === 0) {
    return "At least one admin email is required.";
  }
  for (const email of emails) {
    if (!isValidEmail(email)) {
      return `Invalid email format: "${email}". Please provide valid email addresses separated by commas.`;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome --------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Admin Dashboard Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds an admin dashboard to your project:");
  console.log("    - Dashboard with stats cards and signup chart");
  console.log("    - User management (list, search, view details)");
  console.log("    - Admin actions (verify email, delete user)");
  console.log("    - Access controlled via ADMIN_EMAILS env var");
  console.log("    - Charts powered by recharts");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Collect admin emails -------------------------------------------
  console.log("  The admin dashboard restricts access based on email addresses.");
  console.log("  Only users whose email is in the ADMIN_EMAILS list can access");
  console.log("  the /admin routes.");
  console.log();

  const adminEmails = await input({
    message: "Admin email addresses (comma-separated):",
    validate: validateAdminEmails,
  });

  const emails = adminEmails.split(",").map((e) => e.trim()).filter(Boolean);

  console.log();
  console.log(`  Admin emails: ${emails.join(", ")}`);
  console.log();

  // -- Step 3: Summary --------------------------------------------------------
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to create (backend):");
  console.log("    + packages/backend/src/middleware/admin.ts");
  console.log("    + packages/backend/src/routes/admin.ts");
  console.log();
  console.log("  Files to create (frontend):");
  console.log("    + packages/frontend/src/pages/admin/Dashboard.tsx");
  console.log("    + packages/frontend/src/pages/admin/UserDetail.tsx");
  console.log("    + packages/frontend/src/components/admin/StatsCard.tsx");
  console.log("    + packages/frontend/src/components/admin/UsersTable.tsx");
  console.log("    + packages/frontend/src/hooks/useAdmin.ts");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/index.ts (add admin routes)");
  console.log("    ~ packages/backend/src/env.ts (add ADMIN_EMAILS)");
  console.log("    ~ packages/frontend/src/router.tsx (add admin pages)");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    ADMIN_EMAILS=${emails.join(",")}`);
  console.log();

  // -- Step 4: Confirm --------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) {
    console.log("\n  Installation cancelled.\n");
    process.exit(0);
  }

  console.log();
  console.log("  Installing...");
  console.log();

  // -- Step 5: Copy files -----------------------------------------------------
  console.log("  Copying backend files...");
  const backendFiles = [
    { src: "backend/middleware/admin.ts", dest: "src/middleware/admin.ts" },
    { src: "backend/routes/admin.ts", dest: "src/routes/admin.ts" },
  ];
  for (const f of backendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(BACKEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/pages/admin/Dashboard.tsx", dest: "src/pages/admin/Dashboard.tsx" },
    { src: "frontend/pages/admin/UserDetail.tsx", dest: "src/pages/admin/UserDetail.tsx" },
    { src: "frontend/components/admin/StatsCard.tsx", dest: "src/components/admin/StatsCard.tsx" },
    { src: "frontend/components/admin/UsersTable.tsx", dest: "src/components/admin/UsersTable.tsx" },
    { src: "frontend/hooks/useAdmin.ts", dest: "src/hooks/useAdmin.ts" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  // -- Step 6: Modify existing files ------------------------------------------
  console.log();
  console.log("  Modifying backend files...");

  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import adminRoutes from "./routes/admin.js";',
  );
  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/admin", adminRoutes);',
  );
  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    '  ADMIN_EMAILS: z.string().min(1, "ADMIN_EMAILS is required (comma-separated admin emails)"),',
  );

  console.log();
  console.log("  Modifying frontend files...");

  const routerPath = join(FRONTEND_ROOT, "src/router.tsx");
  if (existsSync(routerPath)) {
    let routerContent = readFileSync(routerPath, "utf-8");

    // Add imports if not present
    if (!routerContent.includes("AdminDashboard")) {
      routerContent = routerContent.replace(
        "export function AppRouter() {",
        'import AdminDashboard from "./pages/admin/Dashboard";\nimport AdminUserDetail from "./pages/admin/UserDetail";\n\nexport function AppRouter() {',
      );
    }

    // Add admin routes before the SAIL_ROUTES marker
    if (!routerContent.includes('path="/admin"')) {
      routerContent = routerContent.replace(
        "{/* [SAIL_ROUTES] */}",
        `<Route element={<ProtectedRoute />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/users/:id" element={<AdminUserDetail />} />
        </Route>
        {/* [SAIL_ROUTES] */}`,
      );
    }

    writeFileSync(routerPath, routerContent, "utf-8");
    console.log("  Modified -> src/router.tsx");
  }

  // -- Step 7: Update env files -----------------------------------------------
  console.log();
  console.log("  Updating environment files...");

  for (const envFile of [".env.example", ".env"]) {
    const envPath = join(PROJECT_ROOT, envFile);
    if (!existsSync(envPath)) continue;

    let content = readFileSync(envPath, "utf-8");
    if (!content.includes("ADMIN_EMAILS")) {
      content += `\n# Admin Dashboard\nADMIN_EMAILS=${emails.join(",")}\n`;
      writeFileSync(envPath, content, "utf-8");
      console.log(`  Updated ${envFile}`);
    }
  }

  // -- Step 8: Install dependencies -------------------------------------------
  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.backend, "packages/backend");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  // -- Step 9: Next steps -----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Admin Dashboard installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  2. Navigate to /admin in your browser");
  console.log("     (you must be logged in with an admin email)");
  console.log();
  console.log("  3. To add/remove admin users, update ADMIN_EMAILS in .env:");
  console.log(`       ADMIN_EMAILS=${emails.join(",")}`);
  console.log();
  console.log("  4. Optionally add an admin link to your Header component");
  console.log("     for users with admin privileges.");
  console.log();
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
