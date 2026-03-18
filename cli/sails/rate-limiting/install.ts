/**
 * API Rate Limiting Sail Installer
 *
 * Adds in-memory sliding window rate limiting to your API routes.
 * No external dependencies required.
 *
 * Usage:
 *   npx tsx sails/rate-limiting/install.ts
 */

import {
  readFileSync,
  writeFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { input, confirm, select } from "@inquirer/prompts";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const SAIL_DIR = dirname(new URL(import.meta.url).pathname);
const PROJECT_ROOT = resolve(SAIL_DIR, "../..");
const BACKEND_ROOT = join(PROJECT_ROOT, "packages/backend");

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

function appendToEnvFiles(entries: Record<string, string>, section: string): void {
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

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const manifest = loadManifest();

  // -- Step 1: Welcome -------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  API Rate Limiting Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds rate limiting to protect your API endpoints:");
  console.log("    - In-memory sliding window algorithm (no Redis needed)");
  console.log("    - Per-IP or per-user request tracking");
  console.log("    - Preset limiters for auth, general API, and sensitive routes");
  console.log("    - Automatic 429 Too Many Requests with Retry-After header");
  console.log("    - Periodic cleanup of expired entries");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Configure defaults -------------------------------------------
  console.log("  Configure rate limit defaults:");
  console.log("  (You can always adjust these later in your code or via env vars)");
  console.log();

  const windowInput = await input({
    message: "Default rate limit window in minutes:",
    default: "15",
    validate: (value) => {
      const n = Number(value);
      if (isNaN(n) || n <= 0) return "Please enter a positive number.";
      return true;
    },
  });
  const windowMinutes = Number(windowInput);

  const maxRequestsInput = await input({
    message: "Default max requests per window:",
    default: "100",
    validate: (value) => {
      const n = Number(value);
      if (isNaN(n) || n <= 0) return "Please enter a positive number.";
      return true;
    },
  });
  const maxRequests = Number(maxRequestsInput);

  // -- Step 3: Choose protection scope --------------------------------------
  console.log();

  const scope = await select({
    message: "Which routes should be rate limited?",
    choices: [
      {
        name: "All API routes (recommended)",
        value: "all",
        description: "Apply apiLimiter globally + authLimiter on auth routes",
      },
      {
        name: "Auth routes only",
        value: "auth-only",
        description: "Only protect login, signup, and password reset endpoints",
      },
      {
        name: "Custom (I will configure manually)",
        value: "custom",
        description: "Copy the middleware files; you wire them up yourself",
      },
    ],
  });

  // -- Step 4: Summary ------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to create:");
  console.log("    + packages/backend/src/middleware/rate-limit.ts");
  console.log("    + packages/backend/src/middleware/rate-limit-store.ts");
  console.log();
  console.log("  Files to modify:");

  if (scope !== "custom") {
    console.log("    ~ packages/backend/src/index.ts  (import + apply middleware)");
  }

  if (windowMinutes !== 15 || maxRequests !== 100) {
    console.log("    ~ packages/backend/src/env.ts    (add optional env vars)");
    console.log("    ~ .env.example / .env");
  }

  console.log();
  console.log("  Configuration:");
  console.log(`    Window:        ${windowMinutes} minutes`);
  console.log(`    Max requests:  ${maxRequests} per window`);
  console.log(`    Scope:         ${scope === "all" ? "All API routes" : scope === "auth-only" ? "Auth routes only" : "Manual"}`);
  console.log();

  // -- Step 5: Confirm ------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) {
    console.log("\n  Installation cancelled.\n");
    process.exit(0);
  }

  // -- Step 6: Execute -------------------------------------------------------
  console.log();
  console.log("  Installing...");
  console.log();

  console.log("  Copying backend files...");
  copyFile(
    join(SAIL_DIR, "files/backend/middleware/rate-limit-store.ts"),
    join(BACKEND_ROOT, "src/middleware/rate-limit-store.ts"),
    "src/middleware/rate-limit-store.ts",
  );
  copyFile(
    join(SAIL_DIR, "files/backend/middleware/rate-limit.ts"),
    join(BACKEND_ROOT, "src/middleware/rate-limit.ts"),
    "src/middleware/rate-limit.ts",
  );

  console.log();
  console.log("  Modifying backend files...");

  // Insert imports and route middleware based on scope
  if (scope === "all") {
    insertAtMarker(
      join(BACKEND_ROOT, "src/index.ts"),
      "// [SAIL_IMPORTS]",
      'import { apiLimiter, authLimiter } from "./middleware/rate-limit.js";',
    );
    insertAtMarker(
      join(BACKEND_ROOT, "src/index.ts"),
      "// [SAIL_ROUTES]",
      '// Rate limiting\napp.use("/api/auth", authLimiter);\napp.use("/api", apiLimiter);',
    );
  } else if (scope === "auth-only") {
    insertAtMarker(
      join(BACKEND_ROOT, "src/index.ts"),
      "// [SAIL_IMPORTS]",
      'import { authLimiter } from "./middleware/rate-limit.js";',
    );
    insertAtMarker(
      join(BACKEND_ROOT, "src/index.ts"),
      "// [SAIL_ROUTES]",
      '// Rate limiting (auth routes)\napp.use("/api/auth", authLimiter);',
    );
  }
  // scope === "custom": no marker insertions

  // Add optional env vars if defaults were customised
  if (windowMinutes !== 15 || maxRequests !== 100) {
    insertAtMarker(
      join(BACKEND_ROOT, "src/env.ts"),
      "// [SAIL_ENV_VARS]",
      `  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(${windowMinutes * 60 * 1000}),\n  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().default(${maxRequests}),`,
    );

    console.log();
    console.log("  Updating environment files...");
    appendToEnvFiles(
      {
        RATE_LIMIT_WINDOW_MS: String(windowMinutes * 60 * 1000),
        RATE_LIMIT_MAX_REQUESTS: String(maxRequests),
      },
      "Rate Limiting",
    );
  }

  // -- Step 7: Next steps ----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  API Rate Limiting installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  2. Test rate limiting:");
  console.log("       Make rapid requests to an API endpoint and verify");
  console.log("       you get a 429 response after the limit is exceeded.");
  console.log();
  console.log("  Customising per-route limits:");
  console.log();
  console.log('    import { createRateLimiter } from "./middleware/rate-limit.js";');
  console.log();
  console.log("    const uploadLimiter = createRateLimiter({");
  console.log("      windowMs: 60 * 60 * 1000,  // 1 hour");
  console.log("      maxRequests: 20,");
  console.log("    });");
  console.log('    app.use("/api/uploads", uploadLimiter);');
  console.log();
  console.log("  Swapping to Redis (distributed deployments):");
  console.log();
  console.log("    Implement the RateLimitStore interface from");
  console.log("    rate-limit-store.ts and pass it as the `store` option:");
  console.log();
  console.log("    createRateLimiter({ store: new RedisStore(redisClient) });");
  console.log();
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
