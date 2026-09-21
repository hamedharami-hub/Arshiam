import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeStatus = {
  notificationsAllowed: boolean;
  exactAllowed: boolean;
  ignoringBattery?: boolean;
  panelEnabled: boolean;
  remindersEnabled: boolean;
  scheduledCount: number;
  appFunctionsSupported?: boolean;
  appFunctionsEnabled?: boolean;
  appFunctionsPreview?: boolean;
};

export type NativeLedgerItem = {
  taskId: string;
  owner: string;
  title: string;
  mode: string;
  importance: string;
  originalAt: number;
  at: number;
  intervalMs: number;
  repeatCount: number;
  fireCount: number;
  maxWindowMs: number;
  status: string;
  notificationId: number;
  version: number;
  snoozeUntil?: number;
};

export type NativeAppInfo = { versionName: string; versionCode: number };

export const nativeExperience = registerPlugin<{
  haptic(options: { kind: string }): Promise<{ performed: boolean }>;
  status(): Promise<NativeStatus>;
  appInfo(): Promise<NativeAppInfo>;
  configure(options: {
    panelEnabled?: boolean;
    remindersEnabled?: boolean;
    appFunctionsEnabled?: boolean;
  }): Promise<NativeStatus>;
  getReminderLedger(): Promise<{ ledger: NativeLedgerItem[] }>;
  cancelReminder(options: { taskId: string }): Promise<{ cancelled: boolean }>;
  snoozeReminder(options: { taskId: string; minutes: number }): Promise<{ snoozed: boolean }>;
  testNotification(): Promise<{ sent: boolean }>;
  openNotificationSettings(): Promise<void>;
  openExactSettings(): Promise<void>;
  openBatterySettings(): Promise<void>;
}>("NativeExperience");

export const isAndroid = () => Capacitor.getPlatform() === "android";
