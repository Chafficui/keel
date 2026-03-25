import { describe, it, expect } from "vitest";
import { updateProfileSchema } from "../profile.js";

describe("updateProfileSchema", () => {
  it("accepts valid name update", () => {
    const result = updateProfileSchema.safeParse({ name: "New Name" });
    expect(result.success).toBe(true);
  });

  it("accepts valid image URL", () => {
    const result = updateProfileSchema.safeParse({
      image: "https://example.com/avatar.png",
    });
    expect(result.success).toBe(true);
  });

  it("rejects name that is too long", () => {
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
  });

  it("accepts empty object (all fields optional)", () => {
    const result = updateProfileSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("accepts null image to clear avatar", () => {
    const result = updateProfileSchema.safeParse({ image: null });
    expect(result.success).toBe(true);
  });
});
