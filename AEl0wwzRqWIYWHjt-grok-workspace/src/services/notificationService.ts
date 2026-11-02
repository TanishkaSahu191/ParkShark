import { useSessionStore } from "@/store/useSessionStore";

/**
 * Service managing Web Push and in-browser Notifications for ParkShark
 */
export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[Notifications] Web Notifications are not supported in this environment");
    return null;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      // In production, this retrieves the token from Firebase Messaging:
      // getToken(messaging, { vapidKey: ... })
      // For this environment, we generate a persistent client FCM device token:
      let token = localStorage.getItem("parkshark_fcm_token");
      if (!token) {
        token = `fcm_token_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
      }

      useSessionStore.getState().setFcmToken(token);
      return token;
    }
  } catch (err) {
    console.warn("[Notifications] Error requesting notification permission:", err);
  }

  return null;
}

export function hasNotificationPermission(): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

export function sendLocalPushNotification(title: string, options: NotificationOptions = {}): boolean {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }

  if (Notification.permission === "granted") {
    try {
      new Notification(title, {
        icon: "/logo.png",
        badge: "/logo.png",
        silent: false,
        ...options,
      });
      return true;
    } catch (err) {
      console.warn("[Notifications] Failed to display notification:", err);
    }
  }
  return false;
}

