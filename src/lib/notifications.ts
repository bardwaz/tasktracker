// PWA Notification Manager

export function isNotificationSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getNotificationPermission(): NotificationPermission {
  if (!isNotificationSupported()) return "denied";
  return Notification.permission;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js", {
      scope: "/",
    });
    return registration;
  } catch (error) {
    console.warn("[PWA SW] Service worker registration error:", error);
    return null;
  }
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) {
    console.warn("[PWA] Web Notifications not supported in this browser");
    return "denied";
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      await registerServiceWorker();
    }
    return permission;
  } catch (err) {
    console.error("[PWA] Notification permission request error:", err);
    return "denied";
  }
}

export interface ShowNotificationOptions {
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  url?: string;
}

export async function showPWANotification(
  title: string,
  options?: ShowNotificationOptions
): Promise<boolean> {
  if (!isNotificationSupported() || Notification.permission !== "granted") {
    return false;
  }

  const defaultIcon = "/icons/icon-192.png";
  const notificationOptions: NotificationOptions = {
    body: options?.body || "You have an update in TaskTracker.",
    icon: options?.icon || defaultIcon,
    badge: options?.badge || defaultIcon,
    tag: options?.tag || `tasktracker-${Date.now()}`,
    data: {
      url: options?.url || "/tasks",
    },
  };

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && "showNotification" in reg) {
        await reg.showNotification(title, notificationOptions);
        return true;
      }
    }

    new Notification(title, notificationOptions);
    return true;
  } catch (err) {
    console.error("[PWA] Error displaying notification:", err);
    return false;
  }
}
