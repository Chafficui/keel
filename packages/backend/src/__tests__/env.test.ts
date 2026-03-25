import { describe, it, expect } from "vitest";
import { z } from "zod";

// We test the env schema directly rather than importing env.ts,
// because env.ts runs process.env parsing + process.exit(1) at module level.
// Duplicate the schema here to test its validation logic in isolation.

const envSchema = z.object({
  PORT: z.coerce.number().default(3005),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  BACKEND_URL: z.string().url().default("http://localhost:3005"),
  FRONTEND_URL: z.string().url().default("http://localhost:5173"),
  DATABASE_URL: z
    .string()
    .default("postgresql://postgres:postgres@localhost:5432/keel"),
  BETTER_AUTH_SECRET: z
    .string()
    .default("dev-secret-change-me-in-production"),
  RESEND_API_KEY: z.string().default(""),
  EMAIL_FROM: z.string().default("noreply@localhost"),
});

describe("env schema", () => {
  it("provides sensible defaults when no env vars are set", () => {
    const result = envSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(3005);
      expect(result.data.NODE_ENV).toBe("development");
      expect(result.data.BACKEND_URL).toBe("http://localhost:3005");
      expect(result.data.FRONTEND_URL).toBe("http://localhost:5173");
      expect(result.data.DATABASE_URL).toBe(
        "postgresql://postgres:postgres@localhost:5432/keel"
      );
      expect(result.data.BETTER_AUTH_SECRET).toBe(
        "dev-secret-change-me-in-production"
      );
      expect(result.data.RESEND_API_KEY).toBe("");
      expect(result.data.EMAIL_FROM).toBe("noreply@localhost");
    }
  });

  it("coerces PORT from string to number", () => {
    const result = envSchema.safeParse({ PORT: "8080" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(8080);
    }
  });

  it("accepts valid NODE_ENV values", () => {
    for (const env of ["development", "production", "test"]) {
      const result = envSchema.safeParse({ NODE_ENV: env });
      expect(result.success).toBe(true);
    }
  });

  it("rejects invalid NODE_ENV values", () => {
    const result = envSchema.safeParse({ NODE_ENV: "staging" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid BACKEND_URL", () => {
    const result = envSchema.safeParse({ BACKEND_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid FRONTEND_URL", () => {
    const result = envSchema.safeParse({ FRONTEND_URL: "not-a-url" });
    expect(result.success).toBe(false);
  });

  it("accepts custom configuration", () => {
    const result = envSchema.safeParse({
      PORT: "4000",
      NODE_ENV: "production",
      BACKEND_URL: "https://api.example.com",
      FRONTEND_URL: "https://app.example.com",
      DATABASE_URL: "postgresql://user:pass@db.example.com:5432/myapp",
      BETTER_AUTH_SECRET: "prod-secret-very-long-string",
      RESEND_API_KEY: "re_test_123",
      EMAIL_FROM: "noreply@example.com",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.PORT).toBe(4000);
      expect(result.data.NODE_ENV).toBe("production");
      expect(result.data.BACKEND_URL).toBe("https://api.example.com");
      expect(result.data.RESEND_API_KEY).toBe("re_test_123");
    }
  });

  it("rejects non-numeric PORT", () => {
    const result = envSchema.safeParse({ PORT: "not-a-number" });
    expect(result.success).toBe(false);
  });
});
