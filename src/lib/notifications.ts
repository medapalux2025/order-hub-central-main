import type { Order } from "@/lib/data";

const NOTIFICATIONS_KEY = "orderhub.notifications";

export function areNotificationsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(NOTIFICATIONS_KEY) === "granted";
}

export function setNotificationsEnabled(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATIONS_KEY, enabled ? "granted" : "denied");
}

export function isNotificationGranted(): boolean {
  return (
    typeof window !== "undefined" &&
    "Notification" in window &&
    Notification.permission === "granted"
  );
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    setNotificationsEnabled(false);
    return false;
  }

  const permission = await Notification.requestPermission();
  const granted = permission === "granted";
  setNotificationsEnabled(granted);
  return granted;
}

export async function showOrderNotification(title: string, order: Order) {
  if (!isNotificationGranted() || !areNotificationsEnabled()) return;

  const body = `#${order.order_number} · ${order.customer_name}`;
  const icon = "/icons/icon-192.png";
  const badge = "/icons/icon-96.png";

  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.ready;
    await registration.showNotification(title, {
      body,
      icon,
      badge,
      tag: `order-${order.id}`,
      renotify: true,
      data: { url: "/new-orders" },
    } as NotificationOptions);
  } else {
    new Notification(title, { body, icon });
  }
}

export function updateAppBadge(count: number) {
  if (typeof navigator === "undefined" || !("setAppBadge" in navigator)) return;
  if (count > 0) {
    navigator.setAppBadge(count).catch(() => {
      /* ignore */
    });
  } else {
    navigator.clearAppBadge().catch(() => {
      /* ignore */
    });
  }
}
