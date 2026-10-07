import { CalendarClock } from "lucide-react";
import { formatTaskDueDateDisplay, getLocalDateString } from "@/lib/taskDate";
import { isTaskClosed, supportsTaskDeadline, taskDeadlineStatus } from "@/lib/taskDeadline";
import type { Task } from "@/lib/taskTypes";

type TaskWithDeadline = Task & { deadline_date?: string | null };

/** Small metadata marker only for deadlines that are close or already overdue. */
export function TaskDeadlineIndicator({ task, isEn, T }: {
  task: TaskWithDeadline;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}) {
  if (!supportsTaskDeadline(task)) return null;
  const status = isTaskClosed(task) ? "none" : taskDeadlineStatus(task.deadline_date, getLocalDateString());
  if (status === "none") return null;

  const date = formatTaskDueDateDisplay(task.deadline_date, isEn) || task.deadline_date || "";
  const label = status === "overdue"
    ? T(`مهلت گذشته: ${date}`, `Past deadline: ${date}`)
    : T(`مهلت نزدیک است: ${date}`, `Deadline approaching: ${date}`);

  return (
    <span
      data-testid={`task-deadline-indicator-${task.id}`}
      aria-label={label}
      title={label}
      className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded ${status === "overdue" ? "text-rose-600 dark:text-rose-400" : "text-amber-600 dark:text-amber-400"}`}
    >
      <CalendarClock className="h-3.5 w-3.5" strokeWidth={1.7} />
    </span>
  );
}
