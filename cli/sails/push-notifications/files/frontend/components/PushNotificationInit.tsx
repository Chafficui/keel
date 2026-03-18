import { usePushNotifications } from "@/hooks/usePushNotifications.js";

/**
 * Invisible component that initializes push notification registration.
 *
 * Place this inside Layout.tsx so that push notifications are set up as soon
 * as the app mounts on a native device. Renders nothing visible.
 */
export function PushNotificationInit() {
  usePushNotifications();
  return null;
}
