import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router";
import { PushNotifications } from "@capacitor/push-notifications";
import { isNative, platform } from "@/lib/capacitor.js";
import { useAuth } from "@/hooks/useAuth.js";

type PermissionStatus = "prompt" | "granted" | "denied" | "unknown";

interface UsePushNotificationsResult {
  isRegistered: boolean;
  permissionStatus: PermissionStatus;
  register: () => Promise<void>;
  unregister: () => Promise<void>;
}

/**
 * Hook to manage push notification registration and handling.
 *
 * On mount (if running on a native platform), requests push permission,
 * registers the device token with the backend, and sets up listeners for
 * incoming notifications and token refreshes.
 *
 * On notification tap, navigates to the route specified in the notification
 * data payload (data.route).
 */
export function usePushNotifications(): UsePushNotificationsResult {
  const [isRegistered, setIsRegistered] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus>("unknown");
  const currentTokenRef = useRef<string | null>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  // Register token with backend
  const registerTokenWithBackend = useCallback(
    async (token: string) => {
      try {
        const response = await fetch("/api/notifications/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            token,
            platform: platform,
          }),
        });

        if (response.ok) {
          currentTokenRef.current = token;
          setIsRegistered(true);
        }
      } catch (error) {
        console.error("Failed to register push token with backend:", error);
      }
    },
    [],
  );

  // Unregister token from backend
  const unregisterTokenFromBackend = useCallback(async () => {
    if (!currentTokenRef.current) return;

    try {
      await fetch("/api/notifications/unregister", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: currentTokenRef.current }),
      });

      currentTokenRef.current = null;
      setIsRegistered(false);
    } catch (error) {
      console.error("Failed to unregister push token:", error);
    }
  }, []);

  // Request permission and register
  const register = useCallback(async () => {
    if (!isNative) return;

    const permResult = await PushNotifications.requestPermissions();
    setPermissionStatus(permResult.receive as PermissionStatus);

    if (permResult.receive === "granted") {
      await PushNotifications.register();
    }
  }, []);

  // Unregister
  const unregister = useCallback(async () => {
    await unregisterTokenFromBackend();
  }, [unregisterTokenFromBackend]);

  useEffect(() => {
    if (!isNative || !user) return;

    // Check current permission status
    PushNotifications.checkPermissions().then((result) => {
      setPermissionStatus(result.receive as PermissionStatus);
    });

    // Listen for successful registration (we receive the FCM token)
    const registrationListener = PushNotifications.addListener(
      "registration",
      (token) => {
        registerTokenWithBackend(token.value);
      },
    );

    // Listen for registration errors
    const registrationErrorListener = PushNotifications.addListener(
      "registrationError",
      (error) => {
        console.error("Push notification registration error:", error);
      },
    );

    // Listen for incoming push notifications (app in foreground)
    const pushReceivedListener = PushNotifications.addListener(
      "pushNotificationReceived",
      (notification) => {
        console.log("Push notification received in foreground:", notification);
      },
    );

    // Listen for notification taps (app opened from notification)
    const pushActionListener = PushNotifications.addListener(
      "pushNotificationActionPerformed",
      (action) => {
        const data = action.notification.data;
        if (data?.route && typeof data.route === "string") {
          navigate(data.route);
        }
      },
    );

    // Request permissions and register on mount
    register();

    return () => {
      registrationListener.then((l) => l.remove());
      registrationErrorListener.then((l) => l.remove());
      pushReceivedListener.then((l) => l.remove());
      pushActionListener.then((l) => l.remove());
    };
  }, [user, register, registerTokenWithBackend, navigate]);

  return {
    isRegistered,
    permissionStatus,
    register,
    unregister,
  };
}
