import { TaskGroupHeader } from "@/components/tasks/TaskGroupHeader";
import React from "react";
import { startOfDay, endOfDay, addDays, format } from "date-fns";
import { parseTaskDueDate, taskDueTimestamp } from "@/lib/taskDate";
import { getTaskPlanning, isTaskOverdue } from "@/lib/taskPlanning";
import { getTimeSettings } from "@/lib/timeHorizon";
import { PRIORITY_META } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";

export type TaskGroup = { key: string; label: string; tasks: Task[] };

export function buildGroupedTasks(
  topLevel: Task[],
  scope: string,
  isEn: boolean,
  T: (fa: string, en: string) => string,
): TaskGroup[] | null {
  if (scope !== "today" && scope !== "next7") return null;
  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const todayEnd = endOfDay(now).getTime();
  const tomorrowEnd = endOfDay(addDays(now, 1)).getTime();
  const settings = getTimeSettings();
  const dateForGrouping = (task: Task) => {
    if (task.due_date || task.due_at) return task.due_date || task.due_at!;
    const plan = getTaskPlanning(task, settings);
    return plan?.horizon === "day" ? plan.start : null;
  };
  const sorted = [...topLevel].sort((a, b) => {
    const da = taskDueTimestamp(dateForGrouping(a));
    const db = taskDueTimestamp(dateForGrouping(b));
    if (da !== db) return da - db;
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    return (PRIORITY_META[a.priority]?.rank ?? 3) - (PRIORITY_META[b.priority]?.rank ?? 3);
  });
  const groups = new Map<string, TaskGroup>();
  for (const task of sorted) {
    const dueValue = dateForGrouping(task);
    if (!dueValue) continue;
    const due = taskDueTimestamp(dueValue);
    let key: string;
    let label: string;
    if (due < todayStart || isTaskOverdue(task, settings, now)) {
      key = "overdue";
      label = T("عقب‌افتاده", "Overdue");
    } else if (due <= todayEnd) {
      key = "today";
      label = T("امروز", "Today");
    } else if (due <= tomorrowEnd) {
      key = "tomorrow";
      label = T("فردا", "Tomorrow");
    } else {
      const d = parseTaskDueDate(dueValue)!;
      key = format(d, "yyyy-MM-dd");
      label = d.toLocaleDateString(isEn ? "en-US" : "fa-IR", {
        weekday: "long",
        month: "short",
        day: "numeric",
      });
    }
    if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
    groups.get(key)!.tasks.push(task);
  }
  // Keep today's tasks first; overdue is still visible, but below today's work.
  const orderedKeys: string[] = [];
  if (groups.has("today")) orderedKeys.push("today");
  if (groups.has("overdue")) orderedKeys.push("overdue");
  if (groups.has("tomorrow")) orderedKeys.push("tomorrow");
  [...groups.keys()]
    .filter((k) => !["overdue", "today", "tomorrow"].includes(k))
    .sort()
    .forEach((k) => orderedKeys.push(k));
  return orderedKeys.map((k) => groups.get(k)!);
}

export interface TaskDueDateGroupsProps {
  groupedTasks: TaskGroup[];
  renderTaskItem: (task: Task) => React.ReactNode;
}

export function TaskDueDateGroups({ groupedTasks, renderTaskItem }: TaskDueDateGroupsProps) {
  return (
    <div className="space-y-3">
      {groupedTasks.map((group) => (
        <div key={group.key}>
          <TaskGroupHeader label={group.label} count={group.tasks.length} tone={group.key === "overdue" ? "overdue" : "default"} testid={`task-group-${group.key}`} />
          <div className="space-y-1">{group.tasks.map((t) => renderTaskItem(t))}</div>
        </div>
      ))}
    </div>
  );
}
