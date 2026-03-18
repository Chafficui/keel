import { Router, type Request, type Response } from "express";
import { eq, and } from "drizzle-orm";
import { db } from "../db/index.js";
import { pushTokens } from "../db/schema/notifications.js";
import {
  sendPushNotification,
  sendMultiplePushNotifications,
} from "../services/notifications.js";
import { requireAuth } from "../middleware/auth.js";

export const notificationsRouter = Router();

// ---------------------------------------------------------------------------
// POST /register — Register a device push token
// ---------------------------------------------------------------------------

notificationsRouter.post(
  "/register",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { token, platform } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "token is required" });
      }

      const userId = req.user!.id;

      // Check if this token is already registered for this user
      const existing = await db.query.pushTokens.findFirst({
        where: and(
          eq(pushTokens.userId, userId),
          eq(pushTokens.token, token),
        ),
      });

      if (existing) {
        return res.json({ message: "Token already registered", id: existing.id });
      }

      // Insert the new token
      const [inserted] = await db
        .insert(pushTokens)
        .values({
          userId,
          token,
          platform: platform ?? null,
        })
        .returning({ id: pushTokens.id });

      return res.status(201).json({ message: "Token registered", id: inserted.id });
    } catch (error) {
      console.error("Error registering push token:", error);
      return res.status(500).json({ error: "Failed to register push token" });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /unregister — Remove a device push token
// ---------------------------------------------------------------------------

notificationsRouter.delete(
  "/unregister",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { token } = req.body;

      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "token is required" });
      }

      const userId = req.user!.id;

      await db
        .delete(pushTokens)
        .where(
          and(
            eq(pushTokens.userId, userId),
            eq(pushTokens.token, token),
          ),
        );

      return res.json({ message: "Token unregistered" });
    } catch (error) {
      console.error("Error unregistering push token:", error);
      return res.status(500).json({ error: "Failed to unregister push token" });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /send — Send a notification to a user (admin/internal use)
// ---------------------------------------------------------------------------

notificationsRouter.post(
  "/send",
  requireAuth,
  async (req: Request, res: Response) => {
    try {
      const { userId, title, body, data } = req.body;

      if (!userId || typeof userId !== "string") {
        return res.status(400).json({ error: "userId is required" });
      }
      if (!title || typeof title !== "string") {
        return res.status(400).json({ error: "title is required" });
      }
      if (!body || typeof body !== "string") {
        return res.status(400).json({ error: "body is required" });
      }

      // Fetch all tokens for the target user
      const tokens = await db.query.pushTokens.findMany({
        where: eq(pushTokens.userId, userId),
      });

      if (tokens.length === 0) {
        return res.status(404).json({ error: "No push tokens found for user" });
      }

      const tokenStrings = tokens.map((t) => t.token);

      if (tokenStrings.length === 1) {
        const messageId = await sendPushNotification(
          tokenStrings[0],
          title,
          body,
          data,
        );
        return res.json({ message: "Notification sent", messageId });
      }

      const result = await sendMultiplePushNotifications(
        tokenStrings,
        title,
        body,
        data,
      );

      return res.json({
        message: "Notifications sent",
        successCount: result.successCount,
        failureCount: result.failureCount,
      });
    } catch (error) {
      console.error("Error sending push notification:", error);
      return res.status(500).json({ error: "Failed to send notification" });
    }
  },
);
