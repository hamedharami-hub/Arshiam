import { Capacitor } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";
import type { Task } from "@/lib/taskTypes";

type WidgetPlugin = {
  syncWidgetData(options: { activeCount: number; nextTaskId?: string; nextTaskTitle?: string }): Promise<void>;
};

const ArshnazWidget = registerPlugin<WidgetPlugin>("ArshnazWidget");

export async function syncAndroidWidget(tasks: Task[]): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  const today = new Date();
  const activeToday = tasks
    .filter((task) => {
      if (task.completed || task.status === "done") return false;
      if (!task.due_date) return false;
      const due = new Date(task.due_date);
      return due.getFullYear() === today.getFullYear()
        && due.getMonth() === today.getMonth()
        && due.getDate() === today.getDate();
    })
    .sort((a, b) => new Date(a.due_date || 0).getTime() - new Date(b.due_date || 0).getTime());
  try {
    await ArshnazWidget.syncWidgetData({
      activeCount: activeToday.length,
      nextTaskId: activeToday[0]?.id,
      nextTaskTitle: activeToday[0]?.title,
    });
  } catch (error) {
    console.warn("Android widget sync notice:", error);
  }
}
