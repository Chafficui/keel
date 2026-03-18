/**
 * File Uploads Sail Installer
 *
 * Adds a generic file upload system with S3-compatible storage.
 * Supports Cloudflare R2, AWS S3, MinIO, and other S3-compatible providers.
 *
 * Usage:
 *   npx tsx sails/file-uploads/install.ts
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

  // -- Step 1: Welcome -------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log(`  File Uploads Sail Installer (v${manifest.version})`);
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  This sail adds a complete file upload system:");
  console.log("    - S3-compatible storage (R2, S3, MinIO)");
  console.log("    - Presigned URL uploads (files go directly to storage)");
  console.log("    - File management API (list, download, delete)");
  console.log("    - Database tracking of uploaded files");
  console.log("    - React hooks for upload and file management");
  console.log("    - File browser page with drag-and-drop upload");
  console.log();

  const pkgPath = join(PROJECT_ROOT, "package.json");
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
    console.log(`  Template version: ${pkg.version ?? "unknown"}`);
    console.log();
  }

  // -- Step 2: Choose storage provider ---------------------------------------
  const provider = await select({
    message: "Which S3-compatible storage provider will you use?",
    choices: [
      { name: "Cloudflare R2", value: "r2" },
      { name: "AWS S3", value: "s3" },
      { name: "MinIO (self-hosted)", value: "minio" },
      { name: "Other S3-compatible", value: "other" },
    ],
  });

  // -- Provider-specific guidance -------------------------------------------
  if (provider === "r2") {
    console.log();
    console.log("  Cloudflare R2 setup:");
    console.log("  1. Go to https://dash.cloudflare.com/?to=/:account/r2/new");
    console.log("  2. Create a bucket");
    console.log("  3. Go to R2 > Overview > Manage R2 API Tokens");
    console.log("  4. Create a token with Object Read & Write permissions");
    console.log("  5. Note your Account ID, Access Key ID, and Secret Access Key");
    console.log();
  } else if (provider === "s3") {
    console.log();
    console.log("  AWS S3 setup:");
    console.log("  1. Go to https://s3.console.aws.amazon.com/s3/buckets");
    console.log("  2. Create a bucket");
    console.log("  3. Create an IAM user with S3 access");
    console.log("  4. Note the Access Key ID and Secret Access Key");
    console.log("  5. Note your bucket's region (e.g., us-east-1)");
    console.log();
  } else if (provider === "minio") {
    console.log();
    console.log("  MinIO setup:");
    console.log("  1. Start MinIO: docker run -p 9000:9000 -p 9001:9001 minio/minio server /data --console-address ':9001'");
    console.log("  2. Open the console at http://localhost:9001");
    console.log("  3. Create a bucket");
    console.log("  4. Default credentials: minioadmin / minioadmin");
    console.log();
  }

  const hasCredentials = await confirm({
    message: "Do you have your storage credentials ready?",
    default: false,
  });

  if (!hasCredentials) {
    console.log();
    console.log("  Please set up your storage provider and obtain credentials,");
    console.log("  then run this installer again.");
    console.log();

    await confirm({
      message: "I have my credentials ready now, continue",
      default: false,
    });
  }

  // -- Step 3: Collect credentials -------------------------------------------
  console.log();
  console.log("  Enter your storage credentials:");
  console.log();

  // Compute defaults based on provider
  const defaultEndpoint =
    provider === "r2"
      ? "https://<account-id>.r2.cloudflarestorage.com"
      : provider === "s3"
        ? "https://s3.<region>.amazonaws.com"
        : provider === "minio"
          ? "http://localhost:9000"
          : "";

  const defaultRegion =
    provider === "r2" ? "auto" : provider === "s3" ? "us-east-1" : "auto";

  const s3Endpoint = await input({
    message: "S3 Endpoint URL:",
    default: defaultEndpoint,
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Endpoint is required.";
      if (!value.startsWith("http")) return "Endpoint should start with http:// or https://";
      return true;
    },
  });

  const s3AccessKeyId = await input({
    message: "S3 Access Key ID:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Access Key ID is required.";
      return true;
    },
  });

  const s3SecretAccessKey = await input({
    message: "S3 Secret Access Key:",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Secret Access Key is required.";
      return true;
    },
  });

  const s3BucketName = await input({
    message: "S3 Bucket Name:",
    default: "uploads",
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Bucket name is required.";
      return true;
    },
  });

  const s3PublicUrl = await input({
    message: "S3 Public URL for serving files (leave blank if not public):",
    default: "",
  });

  const s3Region = await input({
    message: "S3 Region:",
    default: defaultRegion,
    validate: (value) => {
      if (!value || value.trim().length === 0) return "Region is required.";
      return true;
    },
  });

  // -- Step 4: Max file size -------------------------------------------------
  console.log();
  const maxSizeInput = await input({
    message: "Maximum upload file size in MB:",
    default: "50",
    validate: (value) => {
      const n = Number(value);
      if (isNaN(n) || n <= 0) return "Please enter a positive number.";
      return true;
    },
  });
  const maxSizeMB = Number(maxSizeInput);

  // -- Step 5: Summary -------------------------------------------------------
  console.log();
  console.log("  Summary of changes:");
  console.log("  -------------------");
  console.log("  Files to create (backend):");
  console.log("    + packages/backend/src/services/file-storage.ts");
  console.log("    + packages/backend/src/routes/files.ts");
  console.log("    + packages/backend/src/db/schema/files.ts");
  console.log();
  console.log("  Files to create (frontend):");
  console.log("    + packages/frontend/src/hooks/useFileUpload.ts");
  console.log("    + packages/frontend/src/hooks/useFiles.ts");
  console.log("    + packages/frontend/src/components/files/FileUploadButton.tsx");
  console.log("    + packages/frontend/src/components/files/FileList.tsx");
  console.log("    + packages/frontend/src/pages/Files.tsx");
  console.log();
  console.log("  Files to modify:");
  console.log("    ~ packages/backend/src/index.ts       (import + mount routes)");
  console.log("    ~ packages/backend/src/db/schema/index.ts (export schema)");
  console.log("    ~ packages/backend/src/env.ts          (add env vars)");
  console.log("    ~ packages/frontend/src/router.tsx      (add /files route)");
  console.log("    ~ .env.example / .env");
  console.log();
  console.log("  Environment variables:");
  console.log(`    S3_ENDPOINT=${s3Endpoint.slice(0, 30)}...`);
  console.log(`    S3_ACCESS_KEY_ID=${s3AccessKeyId.slice(0, 8)}...`);
  console.log(`    S3_SECRET_ACCESS_KEY=${s3SecretAccessKey.slice(0, 8)}...`);
  console.log(`    S3_BUCKET_NAME=${s3BucketName}`);
  console.log(`    S3_PUBLIC_URL=${s3PublicUrl || "(not set)"}`);
  console.log(`    S3_REGION=${s3Region}`);
  console.log();
  console.log(`  Max file size: ${maxSizeMB} MB`);
  console.log();

  // -- Step 6: Confirm -------------------------------------------------------
  const proceed = await confirm({ message: "Proceed with installation?", default: true });
  if (!proceed) {
    console.log("\n  Installation cancelled.\n");
    process.exit(0);
  }

  // -- Step 7: Execute -------------------------------------------------------
  console.log();
  console.log("  Installing...");
  console.log();

  // -- Copy backend files ---
  console.log("  Copying backend files...");
  const backendFiles = [
    { src: "backend/services/file-storage.ts", dest: "src/services/file-storage.ts" },
    { src: "backend/routes/files.ts", dest: "src/routes/files.ts" },
    { src: "backend/schema/files.ts", dest: "src/db/schema/files.ts" },
  ];
  for (const f of backendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(BACKEND_ROOT, f.dest), f.dest);
  }

  console.log();
  console.log("  Copying frontend files...");
  const frontendFiles = [
    { src: "frontend/hooks/useFileUpload.ts", dest: "src/hooks/useFileUpload.ts" },
    { src: "frontend/hooks/useFiles.ts", dest: "src/hooks/useFiles.ts" },
    { src: "frontend/components/FileUploadButton.tsx", dest: "src/components/files/FileUploadButton.tsx" },
    { src: "frontend/components/FileList.tsx", dest: "src/components/files/FileList.tsx" },
    { src: "frontend/pages/Files.tsx", dest: "src/pages/Files.tsx" },
  ];
  for (const f of frontendFiles) {
    copyFile(join(SAIL_DIR, "files", f.src), join(FRONTEND_ROOT, f.dest), f.dest);
  }

  // -- Modify backend markers ---
  console.log();
  console.log("  Modifying backend files...");

  insertAtMarker(
    join(BACKEND_ROOT, "src/db/schema/index.ts"),
    "// [SAIL_SCHEMA]",
    'export * from "./files.js";',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_IMPORTS]",
    'import { filesRouter } from "./routes/files.js";',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/index.ts"),
    "// [SAIL_ROUTES]",
    'app.use("/api/files", filesRouter);',
  );

  insertAtMarker(
    join(BACKEND_ROOT, "src/env.ts"),
    "// [SAIL_ENV_VARS]",
    `  S3_ENDPOINT: z.string().min(1, "S3_ENDPOINT is required"),\n  S3_ACCESS_KEY_ID: z.string().min(1, "S3_ACCESS_KEY_ID is required"),\n  S3_SECRET_ACCESS_KEY: z.string().min(1, "S3_SECRET_ACCESS_KEY is required"),\n  S3_BUCKET_NAME: z.string().min(1, "S3_BUCKET_NAME is required"),\n  S3_PUBLIC_URL: z.string().default(""),\n  S3_REGION: z.string().default("auto"),`,
  );

  // -- Modify frontend router ---
  console.log();
  console.log("  Modifying frontend files...");

  const routerPath = join(FRONTEND_ROOT, "src/router.tsx");
  insertAtMarker(
    routerPath,
    "// [SAIL_IMPORTS]",
    'import { FilesPage } from "./pages/Files";',
  );

  // The frontend marker uses JSX comment syntax
  insertAtMarker(
    routerPath,
    "{/* [SAIL_ROUTES] */}",
    `      {\n        path: "/files",\n        element: <FilesPage />,\n      },`,
  );

  // -- Install dependencies ---
  console.log();
  console.log("  Installing dependencies...");
  installDeps(manifest.dependencies.backend, "packages/backend");
  installDeps(manifest.dependencies.frontend, "packages/frontend");

  // -- Generate migrations ---
  console.log();
  console.log("  Generating database migrations...");
  try {
    execSync("npx drizzle-kit generate", { cwd: BACKEND_ROOT, stdio: "inherit" });
  } catch {
    console.warn("  Warning: Could not generate migrations. Run manually:");
    console.warn("    cd packages/backend && npx drizzle-kit generate");
  }

  // -- Update env files ---
  console.log();
  console.log("  Updating environment files...");
  appendToEnvFiles(
    {
      S3_ENDPOINT: s3Endpoint,
      S3_ACCESS_KEY_ID: s3AccessKeyId,
      S3_SECRET_ACCESS_KEY: s3SecretAccessKey,
      S3_BUCKET_NAME: s3BucketName,
      S3_PUBLIC_URL: s3PublicUrl,
      S3_REGION: s3Region,
    },
    "File Uploads (S3-compatible storage)",
  );

  // -- Step 8: Next steps ----------------------------------------------------
  console.log();
  console.log("------------------------------------------------------------");
  console.log("  File Uploads installed successfully!");
  console.log("------------------------------------------------------------");
  console.log();
  console.log("  Next steps:");
  console.log();
  console.log("  1. Run database migrations:");
  console.log("       npm run db:migrate");
  console.log();
  console.log("  2. Configure CORS on your storage bucket.");
  console.log("     Your bucket must allow PUT requests from your frontend origin.");
  console.log();

  if (provider === "r2") {
    console.log("     Cloudflare R2 CORS policy (bucket settings):");
    console.log("     [");
    console.log("       {");
    console.log('         "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],');
    console.log('         "AllowedMethods": ["GET", "PUT"],');
    console.log('         "AllowedHeaders": ["Content-Type"],');
    console.log('         "MaxAgeSeconds": 3600');
    console.log("       }");
    console.log("     ]");
  } else if (provider === "s3") {
    console.log("     AWS S3 CORS configuration (bucket permissions):");
    console.log("     [");
    console.log("       {");
    console.log('         "AllowedHeaders": ["Content-Type"],');
    console.log('         "AllowedMethods": ["GET", "PUT"],');
    console.log('         "AllowedOrigins": ["http://localhost:5173", "https://yourdomain.com"],');
    console.log('         "MaxAgeSeconds": 3600');
    console.log("       }");
    console.log("     ]");
  } else if (provider === "minio") {
    console.log("     MinIO: Set the bucket policy to allow public read");
    console.log("     or configure CORS via mc admin:");
    console.log("       mc admin config set local api cors_allow_origin=http://localhost:5173");
  }

  console.log();
  console.log("  3. Start your dev server:");
  console.log("       npm run dev");
  console.log();
  console.log("  4. Navigate to /files to test the file upload system.");
  console.log();
  console.log(`  Max upload size is set to ${maxSizeMB} MB.`);
  console.log("  To change it, update the maxSize prop on <FileUploadButton />");
  console.log("  in packages/frontend/src/pages/Files.tsx.");
  console.log();
}

main().catch((err) => {
  console.error("Installation failed:", err);
  process.exit(1);
});
