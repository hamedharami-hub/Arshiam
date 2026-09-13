import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeStatus = {
  notificationsAllowed: boolean;
  exactAllowed: boolean;
  panelEnabled: boolean;
  remindersEnabled: boolean;
  scheduledCount: number;
};
export type NativeAppInfo = { versionName: string; versionCode: number };
export const nativeExperience = registerPlugin<{
  haptic(options: { kind: string }): Promise<{ performed: boolean }>;
  status(): Promise<NativeStatus>;
  appInfo(): Promise<NativeAppInfo>;
  configure(options: {
    panelEnabled?: boolean;
    remindersEnabled?: boolean;
  }): Promise<NativeStatus>;
  openNotificationSettings(): Promise<void>;
  openExactSettings(): Promise<void>;
}>("NativeExperience");
export const isAndroid = () => Capacitor.getPlatform() === "android";
