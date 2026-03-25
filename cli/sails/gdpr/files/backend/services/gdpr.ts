import { eq, and, isNull, lte } from "drizzle-orm";
import { db } from "../db/index.js";
import { env } from "../env.js";
import {
  users,
  sessions,
  accounts,
  consentRecords,
  deletionRequests,
} from "../db/schema/index.js";
import {
  sendDeletionRequestedEmail,
  sendDeletionCompletedEmail,
  sendDeletionCancelledEmail,
  sendDataExportReadyEmail,
  sendConsentUpdatedEmail,
} from "../auth/email.js";

export async function exportUserData(userId: string) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const userSessions = await db
    .select()
    .from(sessions)
    .where(eq(sessions.userId, userId));
  const userAccounts = await db
    .select({
      id: accounts.id,
      accountId: accounts.accountId,
      providerId: accounts.providerId,
      scope: accounts.scope,
      createdAt: accounts.createdAt,
    })
    .from(accounts)
    .where(eq(accounts.userId, userId));
  const userConsents = await db
    .select()
    .from(consentRecords)
    .where(eq(consentRecords.userId, userId));

  return {
    profile: user
      ? {
          id: user.id,
          name: user.name,
          email: user.email,
          emailVerified: user.emailVerified,
          image: user.image,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        }
      : null,
    sessions: userSessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
    })),
    accounts: userAccounts,
    consents: userConsents,
    exportedAt: new Date().toISOString(),
  };
}

export async function requestDeletion(userId: string, reason?: string) {
  // Check for an existing pending deletion request
  const [existing] = await db
    .select()
    .from(deletionRequests)
    .where(
      and(
        eq(deletionRequests.userId, userId),
        eq(deletionRequests.status, "pending"),
      ),
    );

  if (existing) {
    return existing;
  }

  const scheduledDeletionAt = new Date();
  scheduledDeletionAt.setDate(scheduledDeletionAt.getDate() + 30);

  const [request] = await db
    .insert(deletionRequests)
    .values({
      userId,
      reason: reason ?? null,
      scheduledDeletionAt,
    })
    .returning();

  // Send deletion requested email
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user) {
    const formattedDate = scheduledDeletionAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const cancelUrl = `${env.FRONTEND_URL}/settings/cancel-deletion?requestId=${request.id}`;
    await sendDeletionRequestedEmail(
      user.email,
      user.name,
      formattedDate,
      cancelUrl,
    );
  }

  return request;
}

export async function cancelDeletion(userId: string) {
  const [updated] = await db
    .update(deletionRequests)
    .set({
      status: "cancelled",
      cancelledAt: new Date(),
    })
    .where(
      and(
        eq(deletionRequests.userId, userId),
        eq(deletionRequests.status, "pending"),
      ),
    )
    .returning();

  if (!updated) return null;

  // Send deletion cancelled email
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user) {
    await sendDeletionCancelledEmail(
      user.email,
      user.name,
      `${env.FRONTEND_URL}/dashboard`,
    );
  }

  return updated;
}

export async function processPendingDeletions() {
  const now = new Date();

  const expiredRequests = await db
    .select()
    .from(deletionRequests)
    .where(
      and(
        eq(deletionRequests.status, "pending"),
        lte(deletionRequests.scheduledDeletionAt, now),
      ),
    );

  const results: Array<{ userId: string; success: boolean; error?: string }> =
    [];

  for (const request of expiredRequests) {
    try {
      // Fetch user info before deletion so we can send the email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, request.userId));

      // Delete user data (cascades handle related records)
      await db.delete(users).where(eq(users.id, request.userId));

      // Mark deletion as completed
      await db
        .update(deletionRequests)
        .set({
          status: "completed",
          completedAt: new Date(),
        })
        .where(eq(deletionRequests.id, request.id));

      // Send deletion completed email
      if (user) {
        await sendDeletionCompletedEmail(user.email, user.name);
      }

      results.push({ userId: request.userId, success: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      results.push({ userId: request.userId, success: false, error: message });
    }
  }

  return results;
}

export async function sendExportReadyNotification(
  userId: string,
  downloadUrl: string,
  expiresIn: string,
) {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user) {
    await sendDataExportReadyEmail(user.email, user.name, downloadUrl, expiresIn);
  }
}

export async function recordConsent(
  userId: string,
  input: { consentType: string; granted: boolean; version: string },
  ip?: string,
  userAgent?: string,
) {
  const [record] = await db
    .insert(consentRecords)
    .values({
      userId,
      consentType: input.consentType,
      granted: input.granted,
      version: input.version,
      ipAddress: ip ?? null,
      userAgent: userAgent ?? null,
    })
    .returning();

  // Send consent updated email
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user) {
    await sendConsentUpdatedEmail(user.email, user.name, [
      {
        type: input.consentType,
        action: input.granted ? "granted" : "revoked",
      },
    ]);
  }

  return record;
}

export async function revokeConsent(userId: string, consentType: string) {
  const [updated] = await db
    .update(consentRecords)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(consentRecords.userId, userId),
        eq(consentRecords.consentType, consentType),
        isNull(consentRecords.revokedAt),
      ),
    )
    .returning();

  if (!updated) return null;

  // Send consent updated email
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (user) {
    await sendConsentUpdatedEmail(user.email, user.name, [
      { type: consentType, action: "revoked" },
    ]);
  }

  return updated;
}

export async function getUserConsents(userId: string) {
  return db
    .select()
    .from(consentRecords)
    .where(
      and(
        eq(consentRecords.userId, userId),
        isNull(consentRecords.revokedAt),
      ),
    );
}

export async function immediatelyDeleteUser(userId: string) {
  // Fetch user info before deletion
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) {
    return null;
  }

  const email = user.email;
  const name = user.name;

  // Delete user data (cascades handle related records)
  await db.delete(users).where(eq(users.id, userId));

  // Send deletion completed email
  await sendDeletionCompletedEmail(email, name);

  return { userId, email };
}
