import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import { nativeExperience, isAndroid } from "@/lib/nativeExperience";
import { ensureNotificationPermission } from "@/lib/notify";

const NOTIFICATION_ID = 870025;
let tapListenerRegistered = false;

export type FocusNotificationState = {
  active: boolean;
  running: boolean;
  completed: boolean;
  sessionId: string;
  title: string;
  mode: "work" | "short" | "long";
  endAt: number;
  remainingSeconds: number;
};

export type FocusBackgroundPlatform = "android" | "ios" | "web";

export function focusBackgroundDisclosure(platform: FocusBackgroundPlatform) {
  if (platform === "android") return {
    descriptionFa: "زمان پایان جلسه ذخیره می‌ماند و در صورت مجازبودن اعلان‌ها، اندروید شمارش معکوس را نشان می‌دهد. اعلان پایان ممکن است به‌خاطر زنگ تقریبی، Doze یا محدودیت باتری دیر برسد.",
    descriptionEn: "The session end time is saved and Android can show a countdown when notifications are allowed. The finish alert may arrive late because of inexact alarms, Doze, or battery restrictions.",
    actionFa: "ادامه در پس‌زمینه",
    actionEn: "Continue in background",
  };
  if (platform === "ios") return {
    descriptionFa: "با خروج از برنامه، iOS ممکن است اجرای آن را متوقف کند. زمان پایان ذخیره می‌ماند و با بازگشت تایمر به‌روز می‌شود؛ با اجازهٔ اعلان‌ها، یک اعلان پایان زمان‌بندی‌شده فرستاده می‌شود، اما شمارش زنده نمایش داده نمی‌شود.",
    descriptionEn: "iOS may pause the app in the background. The saved end time lets the timer catch up when reopened; with notification access, iOS can send a scheduled finish alert, but it will not show a live countdown.",
    actionFa: "ادامه",
    actionEn: "Continue",
  };
  return {
    descriptionFa: "مرورگر ممکن است صفحه را در پس‌زمینه متوقف کند و اعلان پس‌زمینه تضمین‌شده نیست. زمان پایان ذخیره می‌ماند تا با بازگشت به صفحه تایمر به‌روز شود.",
    descriptionEn: "The browser may suspend this page in the background, and background alerts are not guaranteed. The saved end time lets the timer catch up when you return.",
    actionFa: "ادامه",
    actionEn: "Continue",
  };
}

if (Capacitor.isNativePlatform() && !tapListenerRegistered) {
  tapListenerRegistered = true;
  void LocalNotifications.addListener("localNotificationActionPerformed", (event) => {
    if (event.notification.id === NOTIFICATION_ID) window.dispatchEvent(new Event("arshnaz:open-focus-timer"));
  }).catch(() => {});
}

/** Call from a user gesture before starting; timer operation itself never depends on permission. */
export async function requestFocusNotificationPermission(): Promise<boolean> {
  try { return await ensureNotificationPermission(); }
  catch { return false; }
}

async function cancelScheduledNotification() {
  if (!Capacitor.isNativePlatform()) return;
  try { await LocalNotifications.cancel({ notifications: [{ id: NOTIFICATION_ID }] }); }
  catch { /* Permission may have been revoked; the timer remains usable. */ }
}

/**
 * Android uses a native ongoing notification with the OS chronometer and an alarm that survives
 * WebView/process suspension. iOS gets a scheduled completion alert; web gets a best-effort
 * notification only while its page process is alive.
 */
export async function syncFocusNotification(state: FocusNotificationState): Promise<void> {
  if (isAndroid()) {
    try {
      await nativeExperience.syncPomodoroNotification(state);
      return;
    } catch {
      // Capacitor builds without the companion native bridge use the scheduled-notification fallback.
    }
  }

  if (Capacitor.isNativePlatform()) {
    await cancelScheduledNotification();
    if (state.completed) {
      try {
        await LocalNotifications.schedule({ notifications: [{
          id: NOTIFICATION_ID,
          title: state.mode === "work" ? "زمان تمرکز تمام شد" : "زمان استراحت تمام شد",
          body: state.title || "جلسهٔ پومودورو به پایان رسید",
          schedule: { at: new Date(Date.now() + 500) },
          extra: { route: "pomodoro", sessionId: state.sessionId },
          isExactNotification: false,
          foreground: false,
        }] });
      } catch { /* Notification permission is optional. */ }
      return;
    }
    if (!state.active || !state.running || state.endAt <= Date.now()) return;
    try {
      await LocalNotifications.schedule({ notifications: [{
        id: NOTIFICATION_ID,
        title: state.mode === "work" ? "جلسهٔ تمرکز فعال است" : "زمان استراحت",
        body: state.title ? `${state.title} · ${state.mode === "work" ? "تمرکز" : "استراحت"}` : "تمرکز آزاد",
        schedule: { at: new Date(state.endAt) },
        extra: { route: "pomodoro", sessionId: state.sessionId },
        isExactNotification: false,
        foreground: false,
      }] });
    } catch { /* On iOS this is the best supported lock-screen/background notification. */ }
    return;
  }

  if (state.completed && typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      new Notification(state.mode === "work" ? "زمان تمرکز تمام شد" : "زمان استراحت تمام شد", {
        body: state.title || "جلسهٔ پومودورو به پایان رسید",
        tag: `pomodoro-${state.sessionId}`,
        icon: "/pwa-192x192.png",
      });
    } catch { /* A browser may disallow notifications from a background tab. */ }
  }
}
