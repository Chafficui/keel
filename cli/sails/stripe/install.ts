/**
 * Stripe Payments Sail Installer
 *
 * Adds Stripe subscription management with checkout sessions, webhooks,
 * customer portal, and subscription status tracking.
 * Features a full interactive setup wizard.
 *
 * Usage:
 *   npx tsx sails/stripe/install.ts
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

function appendToEnvExample(entries: Record<string, string>): void {
  const envPath = join(PROJECT_ROOT, ".env.example");
  if (!existsSync(envPath)) return;
  let content = readFileSync(envPath, "utf-8");
  const lines: string[] = [];
  for (const [key, val] of Object.entries(entries)) {
    if (!content.includes(key)) lines.push(`${key}=${val}`);
  }
  if (lines.length > 0) {
    content += `\n# Stripe Payments\n${lines.join("\n")}\n`;
    writeFileSync(envPath, content, "utf-8");
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

  // -- Step 1: Welcome message -------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Stripe Payments Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail integrates Stripe into your project, providing:");
  console.log("    - Subscription management with checkout sessions");
  console.log("    - Webhook handling for payment events");
  console.log("    - Customer portal for self-service billing");
  console.log("    - Subscription status tracking in the database");
  console.log("    - Pricing page and checkout flow components");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Stripe account check --------------------------------------------
  const hasAccount = await confirm({
    message: "Do you already have a Stripe account?",
    default: true,
  });

  if (!hasAccount) {
    console.log();
    console.log("  Create a Stripe account at:");
    console.log("    https://dashboard.stripe.com/register");
    console.log();
    console.log("  Stripe offers a generous test mode so you can develop");
    console.log("  without processing real payments.");
    console.log();

    await confirm({
      message: "I have created my Stripe account and am ready to continue",
      default: false,
    });
  }

  // -- Step 3: API keys -------------------------------------------------------
  console.log();
  console.log("  Get your API keys from:");
  console.log("    https://dashboard.stripe.com/test/apikeys");
  console.log();

  const stripeSecretKey = await input({
    message: "Stripe Secret Key:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Secret Key is required.";
      if (!value.startsWith("sk_")) return "Secret Key should start with 'sk_' (e.g., sk_test_...).";
      return true;
    },
  });

  const stripePublishableKey = await input({
    message: "Stripe Publishable Key:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Publishable Key is required.";
      if (!value.startsWith("pk_")) return "Publishable Key should start with 'pk_' (e.g., pk_test_...).";
      return true;
    },
  });

  // -- Step 4: Webhook setup ---------------------------------------------------
  console.log();
  console.log("  Now set up your webhook endpoint:");
  console.log();
  console.log("  1. Go to https://dashboard.stripe.com/test/webhooks");
  console.log('  2. Click "Add endpoint"');
  console.log("  3. Set the URL to:");
  console.log("       {BACKEND_URL}/api/stripe/webhook");
  console.log("     For local development:");
  console.log("       http://localhost:3000/api/stripe/webhook");
  console.log("  4. Select these events:");
  console.log("       - checkout.session.completed");
  console.log("       - customer.subscription.updated");
  console.log("       - customer.subscription.deleted");
  console.log("  5. Copy the signing secret (starts with whsec_)");
  console.log();

  const stripeWebhookSecret = await input({
    message: "Stripe Webhook Secret:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Webhook Secret is required.";
      if (!value.startsWith("whsec_")) return "Webhook Secret should start with 'whsec_'.";
      return true;
    },
  });

  // -- Step 5: Product setup guidance ------------------------------------------
  console.log();
  const wantProducts = await confirm({
    message: "Would you like guidance on creating test products now?",
    default: false,
  });

  if (wantProducts) {
    console.log();
    console.log("  Create test products in the Stripe Dashboard:");
    console.log();
    console.log("  1. Go to https://dashboard.stripe.com/test/products");
    console.log('  2. Click "Add product"');
    console.log("  3. Set a name (e.g., \"Pro Plan\") and description");
    console.log('  4. Under pricing, select "Recurring"');
    console.log("  5. Set the price (e.g., $19/month)");
    console.log('  6. Click "Save product"');
    console.log("  7. Copy the Price ID (price_...) for use in your Pricing.tsx");
    console.log();
    console.log("  Repeat for each plan (e.g., Basic, Pro, Enterprise).");
    console.log();

    await confirm({ message: "I have finished setting up products (or will do it later)", default: true });
  }

  // -- Step 6: Summary --------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to copy (backend):");
  console.log("    + packages/backend/src/db/schema/stripe.ts");
  console.log("    + packages/backend/src/routes/stripe.ts");
  console.log("    + packages/backend/src/services/stripe.ts");
  console.log();
  console.log("  Files to copy (frontend):");
  console.log("    + packages/frontend/src/pages/Pricing.tsx");
  console.log("    + packages/frontend/src/pages/Checkout.tsx");
  console.log("    + packages/frontend/src/components/stripe/SubscriptionStatus.tsx");
  console.log("    + packages/frontend/src/hooks/useSubscription.ts");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/db/schema/index.ts");
  console.log("    ~ packages/backend/src/index.ts");
  console.log("    ~ packages/backend/src/env.ts");
  console.log("    ~ packages/frontend/src/router.tsx");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    STRIPE_SECRET_KEY=${stripeSecretKey.slice(0, 12)}...`);
  console.log(`    STRIPE_PUBLISHABLE_KEY=${stripePublishableKey.slice(0, 12)}...`);
  console.log(`    STRIPE_WEBHOOK_SECRET=${stripeWebhookSecret.slice(0, 12)}...`);
  console.log();

  // -- Step 7: Confirm and execute ---------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  console.log();
  console.log("  Installing...");
  console.log();

  console.log("  Copying backend files...");
  const backendFiles = [
    { src: "backend/schema/stripe.ts", dest: "src/db/schema/stripe.ts" },
    { src: "backend/routes/stripe.ts", dest: "src/routes/stripe.ts" },
    { src: "backend/services/stripe.ts", dest: "src/services/stripe.ts" },
  ];
  for (const f of backendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(BACKEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/pages/Pricing.tsx", dest: "src/pages/Pricing.tsx" },
    { src: "frontend/pages/Checkout.tsx", dest: "src/pages/Checkout.tsx" },
    { src: "frontend/components/SubscriptionStatus.tsx", dest: "src/components/stripe/SubscriptionStatus.tsx" },
    { src: "frontend/hooks/useSubscription.ts", dest: "src/hooks/useSubscription.ts" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Modifying backend files...");

  insertAtMarker(join(BACKEND_ROOT, "src/db/schema/index.ts"), "// [SAIL_SCHEMA]", 'export * from "./stripe";');
  insertAtMarker(join(BACKEND_ROOT, "src/index.ts"), "// [SAIL_IMPORTS]", 'import { stripeRouter } from "./routes/stripe";');
  insertAtMarker(join(BACKEND_ROOT, "src/index.ts"), "// [SAIL_ROUTES]", 'app.use("/api/stripe", stripeRouter);');

  // Stripe webhook needs the raw body — insert express.raw() BEFORE express.json()
  const indexPath = join(BACKEND_ROOT, "src/index.ts");
  if (existsSync(indexPath)) {
    let indexContent = readFileSync(indexPath, "utf-8");
    const rawMiddleware = 'app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));';
    if (!indexContent.includes(rawMiddleware)) {
      indexContent = indexContent.replace(
        "app.use(express.json());",
        `// Raw body for Stripe webhook signature verification (must be before express.json())\n${rawMiddleware}\n\napp.use(express.json());`,
      );
      writeFileSync(indexPath, indexContent, "utf-8");
      console.log("  Modified -> src/index.ts (added raw body middleware for webhook)");
    }
  }

  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  STRIPE_SECRET_KEY: z.string().min(1, "STRIPE_SECRET_KEY is required"),\n  STRIPE_PUBLISHABLE_KEY: z.string().min(1, "STRIPE_PUBLISHABLE_KEY is required"),\n  STRIPE_WEBHOOK_SECRET: z.string().min(1, "STRIPE_WEBHOOK_SECRET is required"),`
  );

  console.log();
  console.log("  Modifying frontend files...");

  const routerPath = join(FRONTEND_ROOT, "src/router.tsx");
  insertAtMarker(routerPath, "// [SAIL_IMPORTS]", `import { PricingPage } from "./pages/Pricing";\nimport { CheckoutPage } from "./pages/Checkout";`);
  insertAtMarker(
    routerPath,
    "{/* [SAIL_ROUTES] */}",
    `      {\n        path: "/pricing",\n        element: <PricingPage />,\n      },\n      {\n        path: "/checkout/success",\n        element: <CheckoutPage status="success" />,\n      },\n      {\n        path: "/checkout/cancel",\n        element: <CheckoutPage status="cancel" />,\n      },`
  );

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
  appendToEnvExample({ STRIPE_SECRET_KEY: stripeSecretKey, STRIPE_PUBLISHABLE_KEY: stripePublishableKey, STRIPE_WEBHOOK_SECRET: stripeWebhookSecret });

  const dotEnvPath = join(PROJECT_ROOT, ".env");
  if (existsSync(dotEnvPath)) {
    let dotEnv = readFileSync(dotEnvPath, "utf-8");
    if (!dotEnv.includes("STRIPE_SECRET_KEY")) {
      dotEnv += `\n# Stripe Payments\nSTRIPE_SECRET_KEY=${stripeSecretKey}\nSTRIPE_PUBLISHABLE_KEY=${stripePublishableKey}\nSTRIPE_WEBHOOK_SECRET=${stripeWebhookSecret}\n`;
      writeFileSync(dotEnvPath, dotEnv, "utf-8");
      console.log("  Updated .env");
    }
  }

  // -- Step 8: Print test instructions -----------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Stripe Payments installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Run database migrations:");
  console.log("       npm run db:migrate");
  console.log();
  console.log("  2. Create products in Stripe Dashboard:");
  console.log("       https://dashboard.stripe.com/test/products");
  console.log("     Copy the price IDs (price_...) into your Pricing.tsx");
  console.log();
  console.log("  3. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  Testing locally with the Stripe CLI:");
  console.log("    Install:  brew install stripe/stripe-cli/stripe");
  console.log("    Login:    stripe login");
  console.log("    Listen:   stripe listen --forward-to localhost:3000/api/stripe/webhook");
  console.log();
  console.log("  Test card numbers:");
  console.log("    Success:           4242 4242 4242 4242");
  console.log("    Requires auth:     4000 0025 0000 3155");
  console.log("    Declined:          4000 0000 0000 9995");
  console.log("    Use any future expiry date, any CVC, and any postal code.");
  console.log();
  console.log("  Webhook testing:");
  console.log("    Trigger events:    stripe trigger checkout.session.completed");
  console.log("    View events:       stripe events list");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
