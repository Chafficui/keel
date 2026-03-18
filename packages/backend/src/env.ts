import { z } from "zod";

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3005),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BACKEND_URL: z.string().url().default("http://localhost:3005"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),

  // Database
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/keel"),

  // Auth
  BETTER_AUTH_SECRET: z
    .string()
    .default("dev-secret-change-me-in-production"),

  // Email (Resend) — optional in dev, required in production
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("noreply@localhost"),

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

// Warn about missing services in development
if (env.NODE_ENV === "development") {
  const warnings: string[] = [];
  if (!env.RESEND_API_KEY) warnings.push("RESEND_API_KEY not set — emails will be logged to console");
  if (!env.DATABASE_URL || env.DATABASE_URL.includes("localhost")) {
    warnings.push("Using local database — make sure PostgreSQL is running");
  }
  if (warnings.length > 0) {
    console.warn("\n⚠ Development warnings:");
    warnings.forEach((w) => console.warn(`  → ${w}`));
    console.warn("");
  }
}
