import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3005),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  BACKEND_URL: z.string().url().default("http://localhost:3005"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // Database — supports PostgreSQL (postgresql://...) or PGlite (pglite://./data)
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/keel"),

  // Auth
  BETTER_AUTH_SECRET: z.string().default("dev-secret-change-me-in-production"),

  // Email (Resend) — optional in dev, required in production
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("noreply@localhost"),

  // Mobile (Capacitor) — set to "true" to allow Capacitor origins in CORS
  ENABLE_CAPACITOR: z
    .string()
    .transform((v) => v === "true")
    .default(false),

  // [SAIL_ENV_VARS]
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const formatted = parsed.error.format();
  console.error("Invalid environment variables:");
  console.error(JSON.stringify(formatted, null, 2));
  process.exit(1);
}

export const env = parsed.data;

// Block startup in production if BETTER_AUTH_SECRET is insecure
if (env.NODE_ENV === "production") {
  const secret = env.BETTER_AUTH_SECRET;
  if (secret === "dev-secret-change-me-in-production") {
    console.error(
      "FATAL: BETTER_AUTH_SECRET is set to the default dev value. " +
        "Set a unique, random secret (at least 32 characters) before running in production.",
    );
    process.exit(1);
  }
  if (secret.length < 32) {
    console.error(
      "FATAL: BETTER_AUTH_SECRET must be at least 32 characters long in production. " +
        `Current length: ${secret.length}`,
    );
    process.exit(1);
  }
}

// Warn about weak auth secret in non-production
if (env.NODE_ENV !== "production" && env.BETTER_AUTH_SECRET.length < 32) {
  console.warn(
    `WARNING: BETTER_AUTH_SECRET is only ${env.BETTER_AUTH_SECRET.length} characters long. ` +
      "Use at least 32 characters for adequate security.",
  );
}

// Warn about missing services in development
if (env.NODE_ENV === "development") {
  const warnings: string[] = [];
  if (!env.RESEND_API_KEY)
    warnings.push("RESEND_API_KEY not set — emails will be logged to console");
  if (env.DATABASE_URL.startsWith("pglite://")) {
    warnings.push("Using PGlite (embedded PostgreSQL) — no Docker needed, data stored locally");
  } else if (!env.DATABASE_URL || env.DATABASE_URL.includes("localhost")) {
    warnings.push("Using local database — make sure PostgreSQL is running");
  }
  if (warnings.length > 0) {
    console.warn("\n⚠ Development warnings:");
    warnings.forEach((w) => console.warn(`  → ${w}`));
    console.warn("");
  }
}
