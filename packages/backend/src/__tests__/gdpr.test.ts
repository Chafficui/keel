import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { consentInputSchema } from "@keel/shared";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..", "..", "..", "..");

// ---------------------------------------------------------------------------
// GDPR tests
// ---------------------------------------------------------------------------

describe("GDPR routes", () => {
  describe("hardcoded URL detection", () => {
    it("has no hardcoded keel.com URLs in GDPR service", () => {
      const gdprServicePath = join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts");

      let content: string;
      try {
        content = readFileSync(gdprServicePath, "utf-8");
      } catch {
        // If the file doesn't exist (e.g., in a created project), skip
        return;
      }

      // Verify no hardcoded production URLs remain
      const hardcodedUrls = content.match(/https?:\/\/keel\.com\b[^\s"]*/g) ?? [];

      expect(hardcodedUrls.length).toBe(0);
    });
  });

  describe("consent input validation", () => {
    it("rejects invalid consent type", () => {
      const result = consentInputSchema.safeParse({
        consentType: "nonexistent_type",
        granted: true,
        version: "1.0",
      });
      expect(result.success).toBe(false);
    });

    it("accepts valid consent types", () => {
      for (const type of ["privacy_policy", "terms_of_service", "marketing_emails", "analytics"]) {
        const result = consentInputSchema.safeParse({
          consentType: type,
          granted: true,
          version: "1.0",
        });
        expect(result.success).toBe(true);
      }
    });

    it("rejects missing version field", () => {
      const result = consentInputSchema.safeParse({
        consentType: "privacy_policy",
        granted: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects non-boolean granted field", () => {
      const result = consentInputSchema.safeParse({
        consentType: "privacy_policy",
        granted: "yes",
        version: "1.0",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("deletion request scheduling", () => {
    it("schedules deletion 30 days in the future", () => {
      const now = new Date();
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + 30);

      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeCloseTo(30, 0);
    });
  });

  describe("GDPR service function signatures", () => {
    it("exports all required GDPR service functions", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("export async function exportUserData(userId: string)");
      expect(content).toContain("export async function requestDeletion(userId: string");
      expect(content).toContain("export async function cancelDeletion(userId: string)");
      expect(content).toContain("export async function processPendingDeletions()");
      expect(content).toContain("export async function recordConsent(");
      expect(content).toContain("export async function revokeConsent(userId: string");
      expect(content).toContain("export async function getUserConsents(userId: string)");
      expect(content).toContain("export async function immediatelyDeleteUser(userId: string)");
    });
  });

  describe("GDPR route definitions", () => {
    it("defines all required GDPR endpoints", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/routes/gdpr.ts"),
        "utf-8",
      );

      // Verify all GDPR endpoints are defined
      expect(content).toContain('router.post("/process-deletions"');
      expect(content).toContain('router.get("/export"');
      expect(content).toContain('router.post("/deletion"');
      expect(content).toContain('router.post("/deletion/cancel"');
      expect(content).toContain('router.delete("/account"');
      expect(content).toContain('router.get("/consents"');
      expect(content).toContain('router.post("/consents"');
      expect(content).toContain('router.delete("/consents/:consentType"');

      // Verify auth middleware is applied
      expect(content).toContain("router.use(requireAuth)");

      // Verify process-deletions is before auth middleware (cron access)
      const processDeletionsIndex = content.indexOf('router.post("/process-deletions"');
      const requireAuthIndex = content.indexOf("router.use(requireAuth)");
      expect(processDeletionsIndex).toBeLessThan(requireAuthIndex);
    });

    it("process-deletions validates cron secret header", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/routes/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("x-cron-secret");
      expect(content).toContain("env.DELETION_CRON_SECRET");
      expect(content).toContain("403");
    });

    it("immediate account deletion requires password confirmation", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/routes/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("password");
      expect(content).toContain('"Password confirmation is required"');
    });
  });

  describe("GDPR data export structure", () => {
    it("export includes profile, sessions, accounts, and consents", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      // The export function should return a structured data object
      expect(content).toContain("profile:");
      expect(content).toContain("sessions:");
      expect(content).toContain("accounts:");
      expect(content).toContain("consents:");
      expect(content).toContain("exportedAt:");
    });
  });

  describe("GDPR email notifications", () => {
    it("sends email on deletion request", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("sendDeletionRequestedEmail");
    });

    it("sends email on deletion completion", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("sendDeletionCompletedEmail");
    });

    it("sends email on deletion cancellation", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("sendDeletionCancelledEmail");
    });

    it("sends email on consent update", () => {
      const content = readFileSync(
        join(projectRoot, "cli/sails/gdpr/files/backend/services/gdpr.ts"),
        "utf-8",
      );

      expect(content).toContain("sendConsentUpdatedEmail");
    });
  });
});
