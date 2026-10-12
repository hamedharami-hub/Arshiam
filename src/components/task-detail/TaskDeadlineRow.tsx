import { CalendarDays } from "lucide-react";
import type { Task } from "@/lib/taskTypes";
import { deadlinePatch } from "@/lib/taskSchedule";

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Quiet deadline row. Separate from the schedule list: a save is only deadline_date.
 * Passing the date does not complete the task, move work_date, or write a reminder.
 */
export function TaskDeadlineRow({ task, canEdit, save, T }: {
  task: Pick<Task, "deadline_date">;
  canEdit: boolean;
  save: (patch: { deadline_date: string | null }) => void;
  T: (fa: string, en: string) => string;
  isEn?: boolean;
}) {
  const current = task.deadline_date && DATE_ONLY.test(task.deadline_date) && !task.deadline_date.includes("T")
    ? task.deadline_date
    : "";

  const commit = (value: string | null) => {
    if (!canEdit) return;
    const result = deadlinePatch(value);
    if (!result.ok) return;
    save(result.patch);
  };

  return (
    <div
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm"
      data-testid="task-deadline-row"
    >
      <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-start font-medium text-foreground/90">{T("مهلت", "Deadline")}</span>
      <input
        type="date"
        dir="ltr"
        value={current}
        disabled={!canEdit}
        aria-label={T("مهلت", "Deadline")}
        data-testid="task-deadline-input"
        className="h-7 rounded-md bg-muted/60 px-2 text-[11px] text-foreground disabled:opacity-50"
        onChange={(event) => commit(event.target.value ? event.target.value : null)}
      />
      <button
        type="button"
        disabled={!canEdit || !current}
        data-testid="task-deadline-clear"
        onClick={() => commit(null)}
        className="h-7 rounded-md bg-muted/60 px-2.5 text-[11px] transition hover:bg-muted disabled:opacity-50"
      >
        {T("پاک کردن", "Clear")}
      </button>
    </div>
  );
}
