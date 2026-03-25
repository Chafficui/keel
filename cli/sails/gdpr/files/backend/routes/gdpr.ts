import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { consentInputSchema, CONSENT_TYPES } from "@keel/shared";
import { requireAuth } from "../middleware/auth.js";
import { env } from "../env.js";
import { db } from "../db/index.js";
import { accounts } from "../db/schema/index.js";
import {
  exportUserData,
  requestDeletion,
  cancelDeletion,
  processPendingDeletions,
  recordConsent,
  revokeConsent,
  getUserConsents,
  immediatelyDeleteUser,
} from "../services/gdpr.js";

const router = Router();

// POST /process-deletions — internal endpoint for cron job
router.post("/process-deletions", async (req: Request, res: Response) => {
  const secret = req.headers["x-cron-secret"];
  if (secret !== env.DELETION_CRON_SECRET) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const results = await processPendingDeletions();
  res.json({ results });
});

// All routes below require authentication
router.use(requireAuth);

// GET /export — export all user data
router.get("/export", async (req: Request, res: Response) => {
  const data = await exportUserData(req.user!.id);
  res.json(data);
});

// POST /deletion — request account deletion
router.post("/deletion", async (req: Request, res: Response) => {
  const { reason } = req.body as { reason?: string };
  const request = await requestDeletion(req.user!.id, reason);
  res.json({ deletionRequest: request });
});

// POST /deletion/cancel — cancel pending deletion
router.post("/deletion/cancel", async (req: Request, res: Response) => {
  const result = await cancelDeletion(req.user!.id);
  if (!result) {
    res.status(404).json({ error: "No pending deletion request found" });
    return;
  }
  res.json({ deletionRequest: result });
});

// DELETE /account — immediately and permanently delete user account (no grace period)
router.delete("/account", async (req: Request, res: Response) => {
  const { password } = req.body as { password?: string };

  if (!password) {
    res.status(400).json({ error: "Password confirmation is required" });
    return;
  }

  // Look up the credential account and verify the password hash directly
  // (avoids creating a new session just to check the password)
  const account = await db.query.accounts.findFirst({
    where: and(
      eq(accounts.userId, req.user!.id),
      eq(accounts.providerId, "credential"),
    ),
  });

  if (!account?.password) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const valid = await verifyPassword({
    hash: account.password,
    password,
  });

  if (!valid) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }

  const result = await immediatelyDeleteUser(req.user!.id);
  if (!result) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({ message: "Account has been permanently deleted" });
});

// GET /consents — get all user consents
router.get("/consents", async (req: Request, res: Response) => {
  const consents = await getUserConsents(req.user!.id);
  res.json({ consents });
});

// POST /consents — record a new consent
router.post("/consents", async (req: Request, res: Response) => {
  const parsed = consentInputSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() });
    return;
  }

  const ip = req.ip ?? undefined;
  const userAgent = req.headers["user-agent"] ?? undefined;

  const record = await recordConsent(req.user!.id, parsed.data, ip, userAgent);
  res.status(201).json({ consent: record });
});

// DELETE /consents/:consentType — revoke a specific consent
router.delete("/consents/:consentType", async (req: Request, res: Response) => {
  const { consentType } = req.params;

  if (!consentType || !(CONSENT_TYPES as readonly string[]).includes(consentType)) {
    res.status(400).json({ error: `Invalid consentType. Allowed values: ${CONSENT_TYPES.join(", ")}` });
    return;
  }

  const result = await revokeConsent(req.user!.id, consentType);
  if (!result) {
    res.status(404).json({ error: "No active consent found for this type" });
    return;
  }
  res.json({ consent: result });
});

export default router;
