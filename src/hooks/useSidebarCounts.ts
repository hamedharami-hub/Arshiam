import { useEffect, useState } from "react";
import { endOfDay } from "date-fns";
import { getCachedTasks } from "@/features/tasks/taskService";
import type { Task } from "@/lib/taskTypes";
import { taskDueTimestamp } from "@/lib/taskDate";
import { getTaskPlanning, isTaskOverdue } from "@/lib/taskPlanning";
import { getTimeSettings, todayISO } from "@/lib/timeHorizon";

// Counts come from the local task cache only — no extra Firestore reads.
export function computeSidebarCounts(tasks: Task[], now = new Date()): Record<string, number> {
  const end = endOfDay(now).getTime();
  const settings = getTimeSettings();
  const today = todayISO(now);
  const counts: Record<string, number> = {};
  const bump = (key: string) => { counts[key] = (counts[key] || 0) + 1; };
  for (const t of tasks) {
    if (!t || t.completed || t.parent_id) continue;
    if (!t.folder_id) bump("/app/inbox");
    else bump(`folder:${t.folder_id}`);
    const dueDate = t.due_date || t.due_at;
    const ts = dueDate ? taskDueTimestamp(dueDate) : Number.POSITIVE_INFINITY;
    const plan = getTaskPlanning(t, settings);
    if ((Number.isFinite(ts) && ts <= end) || isTaskOverdue(t, settings, now) || (plan?.horizon === "day" && plan.start <= today)) bump("/app/today");
  }
  return counts;
}

export function useSidebarCounts(userId: string | null | undefined) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  useEffect(() => {
    if (!userId) { setCounts({}); return; }
    let active = true;
    const refresh = () => {
      getCachedTasks(userId)
        .then((tasks) => { if (active) setCounts(computeSidebarCounts(tasks)); })
        .catch(() => undefined);
    };
    refresh();
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener("tasks-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener("tasks-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, [userId]);
  return counts;
}
