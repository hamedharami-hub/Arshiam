import { Capacitor, registerPlugin } from "@capacitor/core";
import type { Task } from "@/lib/taskTypes";

type NativePlugin = {
  addCalendarEvent(options: { title: string; startMillis: number; endMillis?: number }): Promise<{ opened: boolean }>;
  getSystemTheme(): Promise<{ dark: boolean }>;
};

const Native = registerPlugin<NativePlugin>("ArshnazWidget");

export async function addTaskToAndroidCalendar(task: Pick<Task, "title" | "start_at" | "due_date" | "estimated_minutes">) {
  if (!Capacitor.isNativePlatform()) return false;
  const start = new Date(task.start_at || task.due_date || Date.now());
  const end = task.estimated_minutes ? new Date(start.getTime() + task.estimated_minutes * 60_000) : undefined;
  await Native.addCalendarEvent({ title: task.title, startMillis: start.getTime(), endMillis: end?.getTime() });
  return true;
}

export async function getAndroidSystemDarkMode(): Promise<boolean | null> {
  if (!Capacitor.isNativePlatform()) return null;
  return (await Native.getSystemTheme()).dark;
}
