import { Capacitor } from "@capacitor/core";
import { registerPlugin } from "@capacitor/core";
import type { Task } from "@/lib/taskTypes";
import { auth } from "@/lib/firebase";

type WidgetPlugin = {
  syncWidgetData(options: { activeCount: number; nextTaskId?: string; nextTaskTitle?: string; userId?: string; idToken?: string }): Promise<void>;
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
    const user = auth.currentUser;
    const idToken = user ? await user.getIdToken() : undefined;
    await ArshnazWidget.syncWidgetData({
      activeCount: activeToday.length,
      nextTaskId: activeToday[0]?.id,
      nextTaskTitle: activeToday.slice(0, 3).map((task) => `• ${task.title}`).join("\n"),
      userId: user?.uid,
      idToken,
    });
  } catch (error) {
    console.warn("Android widget sync notice:", error);
  }
}
