import { describe, it, expect } from "vitest";
import { CONSENT_TYPES } from "../types/consent.js";

describe("CONSENT_TYPES", () => {
  it("contains the expected consent types", () => {
    expect(CONSENT_TYPES).toEqual([
      "privacy_policy",
      "terms_of_service",
      "marketing_emails",
      "analytics",
    ]);
  });

  it("has exactly 4 entries", () => {
    expect(CONSENT_TYPES.length).toBe(4);
  });

  it("includes privacy_policy", () => {
    expect(CONSENT_TYPES).toContain("privacy_policy");
  });

  it("includes terms_of_service", () => {
    expect(CONSENT_TYPES).toContain("terms_of_service");
  });

  it("includes marketing_emails", () => {
    expect(CONSENT_TYPES).toContain("marketing_emails");
  });

  it("includes analytics", () => {
    expect(CONSENT_TYPES).toContain("analytics");
  });
});
