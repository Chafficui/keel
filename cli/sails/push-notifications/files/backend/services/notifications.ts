import admin from "firebase-admin";
import { env } from "../env.js";

// ---------------------------------------------------------------------------
// Firebase Admin initialization
// ---------------------------------------------------------------------------

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
    }),
  });
}

const messaging = admin.messaging();

// ---------------------------------------------------------------------------
// Send a push notification to a single device
// ---------------------------------------------------------------------------

/**
 * Send a push notification to a single device token.
 *
 * @param token  - The FCM device token
 * @param title  - Notification title
 * @param body   - Notification body text
 * @param data   - Optional key-value data payload (for deep linking, etc.)
 * @returns The message ID from Firebase
 */
export async function sendPushNotification(
  token: string,
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<string> {
  const message: admin.messaging.Message = {
    token,
    notification: {
      title,
      body,
    },
    data,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  return messaging.send(message);
}

// ---------------------------------------------------------------------------
// Send push notifications to multiple devices
// ---------------------------------------------------------------------------

/**
 * Send a push notification to multiple device tokens.
 *
 * Uses `sendEachForMulticast` to handle per-token delivery. Returns the
 * batch response so callers can check individual success/failure.
 *
 * @param tokens - Array of FCM device tokens
 * @param title  - Notification title
 * @param body   - Notification body text
 * @param data   - Optional key-value data payload
 * @returns The batch response from Firebase
 */
export async function sendMultiplePushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data?: Record<string, string>,
): Promise<admin.messaging.BatchResponse> {
  if (tokens.length === 0) {
    return { responses: [], successCount: 0, failureCount: 0 };
  }

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title,
      body,
    },
    data,
    android: {
      priority: "high",
      notification: {
        sound: "default",
        channelId: "default",
      },
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
          badge: 1,
        },
      },
    },
  };

  return messaging.sendEachForMulticast(message);
}
