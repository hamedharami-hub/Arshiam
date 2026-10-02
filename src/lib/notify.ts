import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

const isNative = Capacitor.isNativePlatform();

let nativeActionsRegistered = false;
let nativeActionListenerRegistered = false;
async function registerNativeActions() {
  if (!isNative || nativeActionsRegistered) return;
  try {
    await LocalNotifications.registerActionTypes({
      types: [{
        id: "ARSHNAZ_TASK_REMINDER",
        actions: [
          { id: "complete", title: "انجام شد", foreground: true },
          { id: "snooze10", title: "تعویق ۱۰ دقیقه" },
        ],
      }],
    });
    nativeActionsRegistered = true;
    if (!nativeActionListenerRegistered) {
      nativeActionListenerRegistered = true;
      await LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
        if (event.actionId !== "snooze10") return;
        const extra = event.notification.extra as { tag?: string } | undefined;
        const tag = extra?.tag || `notification-${event.notification.id}`;
        void scheduleNotificationAt(
          event.notification.title || "یادآور ARSHNAZ",
          event.notification.body || "",
          `${tag}-snooze`,
          new Date(Date.now() + 10 * 60 * 1000),
        );
      });
    }
  } catch {}
}

function hashTag(tag: string): number {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (Math.imul(31, h) + tag.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isNative) {
    await registerNativeActions();
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    if (status.display === "denied") return false;
    const res = await LocalNotifications.requestPermissions();
    return res.display === "granted";
  }
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const res = await Notification.requestPermission();
  return res === "granted";
}

export async function hasNotificationPermission(): Promise<boolean> {
  if (isNative) {
    const status = await LocalNotifications.checkPermissions();
    return status.display === "granted";
  }
  return typeof Notification !== "undefined" && Notification.permission === "granted";
}

export function fireNotification(title: string, body: string, tag: string) {
  if (isNative) {
    LocalNotifications.schedule({
      notifications: [{ id: hashTag(tag), title, body }],
    }).catch(() => {
      /* ignore */
    });
    return;
  }
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, tag, icon: "/pwa-192x192.png" });
  } catch {
    /* ignore */
  }
}

export async function scheduleNotificationAt(
  title: string,
  body: string,
  tag: string,
  at: Date
): Promise<boolean> {
  if (at.getTime() <= Date.now()) return false;
  const id = hashTag(tag);
  if (isNative) {
    try {
      await registerNativeActions();
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            title,
            body,
            schedule: { at },
            sound: "default",
            actionTypeId: "ARSHNAZ_TASK_REMINDER",
            extra: { tag },
          },
        ],
      });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export async function cancelNotification(tag: string): Promise<boolean> {
  const id = hashTag(tag);
  if (isNative) {
    try {
      await LocalNotifications.cancel({ notifications: [{ id }] });
      return true;
    } catch {
      return false;
    }
  }
  return false;
}
