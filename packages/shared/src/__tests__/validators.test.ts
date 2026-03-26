import { describe, it, expect } from "vitest";
import {
  signupSchema,
  loginSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  updateProfileSchema,
  consentInputSchema,
} from "../validators/index.js";

// ---------------------------------------------------------------------------
// signupSchema
// ---------------------------------------------------------------------------

describe("signupSchema", () => {
  it("accepts valid signup input", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Test User");
      expect(result.data.email).toBe("test@example.com");
      expect(result.data.password).toBe("securepass123");
    }
  });

  it("rejects empty name", () => {
    const result = signupSchema.safeParse({
      name: "",
      email: "test@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErrors = result.error.flatten().fieldErrors["name"];
      expect(nameErrors).toBeDefined();
      expect(nameErrors).toContain("Name is required");
    }
  });

  it("rejects name exceeding 100 characters", () => {
    const result = signupSchema.safeParse({
      name: "a".repeat(101),
      email: "test@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const nameErrors = result.error.flatten().fieldErrors["name"];
      expect(nameErrors).toBeDefined();
      expect(nameErrors).toContain("Name is too long");
    }
  });

  it("rejects invalid email", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "not-an-email",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const emailErrors = result.error.flatten().fieldErrors["email"];
      expect(emailErrors).toBeDefined();
      expect(emailErrors).toContain("Invalid email address");
    }
  });

  it("rejects empty email", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects password shorter than 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors["password"];
      expect(passwordErrors).toBeDefined();
      expect(passwordErrors).toContain("Password must be at least 8 characters");
    }
  });

  it("rejects password longer than 128 characters", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "a".repeat(129),
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const passwordErrors = result.error.flatten().fieldErrors["password"];
      expect(passwordErrors).toBeDefined();
      expect(passwordErrors).toContain("Password must be at most 128 characters");
    }
  });

  it("accepts password with exactly 8 characters", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "12345678",
    });
    expect(result.success).toBe(true);
  });

  it("accepts password with exactly 128 characters", () => {
    const result = signupSchema.safeParse({
      name: "Test User",
      email: "test@example.com",
      password: "a".repeat(128),
    });
    expect(result.success).toBe(true);
  });

  it("rejects missing fields", () => {
    const result = signupSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors["name"]).toBeDefined();
      expect(errors["email"]).toBeDefined();
      expect(errors["password"]).toBeDefined();
    }
  });
});

// ---------------------------------------------------------------------------
// loginSchema
// ---------------------------------------------------------------------------

describe("loginSchema", () => {
  it("accepts valid login input", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "securepass123",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = loginSchema.safeParse({
      email: "bad-email",
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });

  it("rejects short password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing password", () => {
    const result = loginSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing email", () => {
    const result = loginSchema.safeParse({
      password: "securepass123",
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// passwordResetRequestSchema
// ---------------------------------------------------------------------------

describe("passwordResetRequestSchema", () => {
  it("accepts valid email", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "test@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid email", () => {
    const result = passwordResetRequestSchema.safeParse({
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty object", () => {
    const result = passwordResetRequestSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// passwordResetSchema
// ---------------------------------------------------------------------------

describe("passwordResetSchema", () => {
  it("accepts valid reset input", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token-abc",
      newPassword: "newpassword123",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.token).toBe("reset-token-abc");
      expect(result.data.newPassword).toBe("newpassword123");
    }
  });

  it("rejects empty token", () => {
    const result = passwordResetSchema.safeParse({
      token: "",
      newPassword: "newpassword123",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const tokenErrors = result.error.flatten().fieldErrors["token"];
      expect(tokenErrors).toBeDefined();
      expect(tokenErrors).toContain("Token must be at least 10 characters");
    }
  });

  it("rejects short new password", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token",
      newPassword: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects long new password", () => {
    const result = passwordResetSchema.safeParse({
      token: "reset-token",
      newPassword: "a".repeat(129),
    });
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// updateProfileSchema
// ---------------------------------------------------------------------------

describe("updateProfileSchema", () => {
  it("accepts valid name only", () => {
    const result = updateProfileSchema.safeParse({
      name: "New Name",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("New Name");
      expect(result.data.image).toBeUndefined();
    }
  });

  it("accepts valid image only", () => {
    const result = updateProfileSchema.safeParse({
      image: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image).toBe("https://example.com/avatar.png");
    }
  });

  it("accepts both name and image", () => {
    const result = updateProfileSchema.safeParse({
      name: "New Name",
      image: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  it("accepts empty object (all fields optional)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("rejects empty name when provided", () => {
    const result = updateProfileSchema.safeParse({
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects name exceeding 100 characters", () => {
    const result = updateProfileSchema.safeParse({
      name: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("rejects invalid image URL", () => {
    const result = updateProfileSchema.safeParse({
      image: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const imageErrors = result.error.flatten().fieldErrors["image"];
      expect(imageErrors).toBeDefined();
      expect(imageErrors).toContain("Invalid image URL");
    }
  });

  it("strips unknown fields", () => {
    const result = updateProfileSchema.safeParse({
      name: "Test",
      unknownField: "should be stripped",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("unknownField");
    }
  });
});

// ---------------------------------------------------------------------------
// consentInputSchema
// ---------------------------------------------------------------------------

describe("consentInputSchema", () => {
  it("accepts valid consent input — privacy_policy", () => {
    const result = consentInputSchema.safeParse({
      consentType: "privacy_policy",
      granted: true,
      version: "1.0",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid consent input — terms_of_service", () => {
    const result = consentInputSchema.safeParse({
      consentType: "terms_of_service",
      granted: false,
      version: "2.1",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid consent input — marketing_emails", () => {
    const result = consentInputSchema.safeParse({
      consentType: "marketing_emails",
      granted: true,
      version: "1.0",
    });
    expect(result.success).toBe(true);
  });

  it("accepts valid consent input — analytics", () => {
    const result = consentInputSchema.safeParse({
      consentType: "analytics",
      granted: true,
      version: "1.0",
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid consentType", () => {
    const result = consentInputSchema.safeParse({
      consentType: "invalid_type",
      granted: true,
      version: "1.0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing version", () => {
    const result = consentInputSchema.safeParse({
      consentType: "privacy_policy",
      granted: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects empty version", () => {
    const result = consentInputSchema.safeParse({
      consentType: "privacy_policy",
      granted: true,
      version: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const versionErrors = result.error.flatten().fieldErrors["version"];
      expect(versionErrors).toBeDefined();
      expect(versionErrors).toContain("Version is required");
    }
  });

  it("rejects non-boolean granted", () => {
    const result = consentInputSchema.safeParse({
      consentType: "privacy_policy",
      granted: "yes",
      version: "1.0",
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing fields", () => {
    const result = consentInputSchema.safeParse({});
    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      expect(errors["consentType"]).toBeDefined();
      expect(errors["granted"]).toBeDefined();
      expect(errors["version"]).toBeDefined();
    }
  });
});
