import { Capacitor } from "@capacitor/core";
import { arshnazNativePlugin } from "@/lib/arshnazNativePlugin";
import type { Task } from "@/lib/taskTypes";
import { parseTaskDueDate, taskWorkDate } from "@/lib/taskDate";

type NativePlugin = {
  addCalendarEvent(options: { title: string; startMillis: number; endMillis?: number }): Promise<{ opened: boolean }>;
  getSystemTheme(): Promise<{ dark: boolean }>;
};

const Native = arshnazNativePlugin as unknown as NativePlugin;

export async function addTaskToAndroidCalendar(task: Pick<Task, "title" | "due_date" | "work_date">) {
  if (!Capacitor.isNativePlatform()) return false;
  const scheduled = taskWorkDate(task);
  const start = scheduled ? parseTaskDueDate(scheduled) || new Date() : new Date();
  await Native.addCalendarEvent({ title: task.title, startMillis: start.getTime() });
  return true;
}

export async function getAndroidSystemDarkMode(): Promise<boolean | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return (await Native.getSystemTheme()).dark;
}
