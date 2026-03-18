/**
 * Cloudflare R2 Storage Sail Installer
 *
 * Adds file uploads via Cloudflare R2 with presigned URLs.
 * Includes profile picture upload component and avatar management endpoints.
 *
 * Usage:
 *   npx tsx sails/r2-storage/install.ts
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

  // -- Step 1: Welcome message ------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  Cloudflare R2 Storage Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds file upload support via Cloudflare R2:");
  console.log("    - Presigned URL generation for direct browser uploads");
  console.log("    - Profile picture upload component");
  console.log("    - Avatar management API endpoints (upload URL + delete)");
  console.log("    - S3-compatible storage via Cloudflare R2");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: R2 bucket setup ------------------------------------------------
  const hasBucket = await confirm({
    message: "Do you already have a Cloudflare R2 bucket set up?",
    default: false,
  });

  if (!hasBucket) {
    console.log();
    console.log("  Create a Cloudflare R2 bucket:");
    console.log();
    console.log("  1. Go to the Cloudflare dashboard:");
    console.log("       https://dash.cloudflare.com/?to=/:account/r2/new");
    console.log("  2. Click 'Create bucket'");
    console.log("  3. Choose a bucket name (e.g., 'avatars' or 'uploads')");
    console.log("  4. Select a location hint closest to your users");
    console.log("  5. Click 'Create bucket'");
    console.log();
    console.log("  Then create an API token:");
    console.log("  1. Go to R2 > Overview > Manage R2 API Tokens");
    console.log("  2. Click 'Create API token'");
    console.log("  3. Give it 'Object Read & Write' permissions");
    console.log("  4. Copy the Access Key ID and Secret Access Key");
    console.log();

    await confirm({
      message: "I have created my R2 bucket and API token, ready to continue",
      default: false,
    });
  }

  // -- Step 3: Collect env vars -----------------------------------------------
  console.log();
  console.log("  Enter your Cloudflare R2 credentials:");
  console.log("  (Find your Account ID in the Cloudflare dashboard URL or R2 overview page)");
  console.log();

  const r2AccountId = await input({
    message: "R2 Account ID:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Account ID is required.";
      return true;
    },
  });

  const r2AccessKeyId = await input({
    message: "R2 Access Key ID:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Access Key ID is required.";
      return true;
    },
  });

  const r2SecretAccessKey = await input({
    message: "R2 Secret Access Key:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Secret Access Key is required.";
      return true;
    },
  });

  const r2BucketName = await input({
    message: "R2 Bucket Name:",
    default: "avatars",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Bucket name is required.";
      return true;
    },
  });

  const r2PublicUrl = await input({
    message: "R2 Public URL (e.g., https://pub-xxx.r2.dev):",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Public URL is required.";
      if (!value.startsWith("http")) return "Public URL should start with http:// or https://";
      return true;
    },
  });

  // -- Step 4: CORS reminder --------------------------------------------------
  console.log();
  console.log("  Important: Configure CORS on your R2 bucket!");
  console.log();
  console.log("  Go to your bucket settings and add a CORS policy:");
  console.log("  [");
  console.log('    {');
  console.log('      "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],');
  console.log('      "AllowedMethods": ["GET", "PUT"],');
  console.log('      "AllowedHeaders": ["Content-Type"],');
  console.log('      "MaxAgeSeconds": 3600');
  console.log("    }");
  console.log("  ]");
  console.log();

  await confirm({
    message: "I have configured CORS (or will do it later)",
    default: true,
  });

  // -- Step 5: Summary --------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to copy (backend):");
  console.log("    + packages/backend/src/services/storage.ts");
  console.log();
  console.log("  Files to copy (frontend):");
  console.log("    + packages/frontend/src/components/profile/ProfilePictureUpload.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/routes/profile.ts  (add avatar endpoints)");
  console.log("    ~ packages/backend/src/env.ts             (add R2 env vars)");
  console.log("    ~ packages/frontend/src/components/profile/ProfilePage.tsx (add upload component)");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    R2_ACCOUNT_ID=${r2AccountId.slice(0, 8)}...`);
  console.log(`    R2_ACCESS_KEY_ID=${r2AccessKeyId.slice(0, 8)}...`);
  console.log(`    R2_SECRET_ACCESS_KEY=${r2SecretAccessKey.slice(0, 8)}...`);
  console.log(`    R2_BUCKET_NAME=${r2BucketName}`);
  console.log(`    R2_PUBLIC_URL=${r2PublicUrl}`);
  console.log();

  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) { console.log("\n  Installation cancelled.\n"); process.exit(0); }

  // -- Step 6: Execute --------------------------------------------------------
  console.log();
  console.log("  Installing...");
  console.log();

  console.log("  Copying backend files...");
  copyFile(
    join(SAIL_DIR, "files/backend/services/storage.ts"),
    join(BACKEND_ROOT, "src/services/storage.ts"),
    "src/services/storage.ts",
  );

  console.log();
  console.log("  Copying frontend files...");
  copyFile(
    join(SAIL_DIR, "files/frontend/components/ProfilePictureUpload.tsx"),
    join(FRONTEND_ROOT, "src/components/profile/ProfilePictureUpload.tsx"),
    "src/components/profile/ProfilePictureUpload.tsx",
  );

  console.log();
  console.log("  Modifying backend files...");

  // Add R2 env vars to env.ts
  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  R2_ACCOUNT_ID: z.string().default(""),\n  R2_ACCESS_KEY_ID: z.string().default(""),\n  R2_SECRET_ACCESS_KEY: z.string().default(""),\n  R2_BUCKET_NAME: z.string().default("avatars"),\n  R2_PUBLIC_URL: z.string().default(""),`,
  );

  // Add avatar routes to profile.ts — insert import and route blocks
  const profilePath = join(BACKEND_ROOT, "src/routes/profile.ts");
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

      // Insert before "export default router"
      profileContent = profileContent.replace(
        "export default router;",
        `${avatarRoutes}\n\nexport default router;`,
      );
    }

    writeFileSync(profilePath, profileContent, "utf-8");
    console.log(`  Modified -> ${profilePath}`);
  }

  console.log();
  console.log("  Modifying frontend files...");

  // Add ProfilePictureUpload to ProfilePage.tsx
  const profilePagePath = join(FRONTEND_ROOT, "src/components/profile/ProfilePage.tsx");
  if (existsSync(profilePagePath)) {
    let pageContent = readFileSync(profilePagePath, "utf-8");

    // Add import if not present
    if (!pageContent.includes("ProfilePictureUpload")) {
      pageContent = pageContent.replace(
        'import { apiPatch } from "@/lib/api";',
        'import { apiPatch } from "@/lib/api";\nimport ProfilePictureUpload from "./ProfilePictureUpload";',
      );

      // Add the component in the profile card layout
      pageContent = pageContent.replace(
        '<div className="flex flex-col items-start gap-6 sm:flex-row">',
        '<div className="flex flex-col items-start gap-6 sm:flex-row">\n          <ProfilePictureUpload />',
      );
    }

    writeFileSync(profilePagePath, pageContent, "utf-8");
    console.log(`  Modified -> ${profilePagePath}`);
  }

  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.backend, "packages/backend");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  console.log();
  console.log("  Updating environment files...");
  appendToEnvFiles(
    {
      R2_ACCOUNT_ID: r2AccountId,
      R2_ACCESS_KEY_ID: r2AccessKeyId,
      R2_SECRET_ACCESS_KEY: r2SecretAccessKey,
      R2_BUCKET_NAME: r2BucketName,
      R2_PUBLIC_URL: r2PublicUrl,
    },
    "Cloudflare R2 Storage",
  );

  // -- Step 7: Next steps -----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  Cloudflare R2 Storage installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Make sure CORS is configured on your R2 bucket");
  console.log("     (allow PUT from your frontend origin)");
  console.log();
  console.log("  2. If using a custom domain for R2 public access,");
  console.log("     set R2_PUBLIC_URL to that domain in your .env");
  console.log();
  console.log("  3. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  4. Navigate to your profile page and try uploading");
  console.log("     a profile picture to verify the integration works.");
  console.log();
  console.log("  Troubleshooting:");
  console.log("    - CORS errors: Check your R2 bucket CORS configuration");
  console.log("    - 403 errors: Verify your API token has read/write permissions");
  console.log("    - Upload fails: Check that R2_ACCOUNT_ID is correct");
  console.log();
}

main().catch((err) => { console.error("Installation failed:", err); process.exit(1); });
