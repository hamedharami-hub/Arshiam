import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import { InlineDatePicker } from "@/components/InlineDatePicker";
import { IconTip } from "./IconTip";
import { formatTaskDueDateDisplay, getLocalDateString } from "@/lib/taskDate";
import { isTaskClosed, supportsTaskDeadline, taskDeadlineStatus } from "@/lib/taskDeadline";
import type { Task } from "@/lib/taskTypes";

type TaskWithDeadline = Task & { deadline_date?: string | null };
type DeadlinePatch = Partial<Task> & { deadline_date: string | null };

/** A fixed deadline stays visible through recurrence changes and can be cleared explicitly. */
export function TaskDeadlineControl({
  task,
  canEdit,
  isEn,
  T,
  save,
}: {
  task: TaskWithDeadline;
  canEdit: boolean;
  isEn: boolean;
  T: (fa: string, en: string) => string;
  save: (patch: DeadlinePatch) => void | Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [savingTaskId, setSavingTaskId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState(false);
  const taskGeneration = useRef(0);
  const currentTask = useRef({ id: task.id, userId: task.user_id });
  currentTask.current = { id: task.id, userId: task.user_id };
  const saving = savingTaskId === task.id;
  const deadline = task.deadline_date || null;

  useEffect(() => {
    taskGeneration.current += 1;
    setOpen(false);
    setSaveError(false);
    setSavingTaskId(null);
  }, [task.id, task.user_id]);

  // Completed tasks may retain their date, but should not keep an alert state.
  const status = isTaskClosed(task) ? "none" : taskDeadlineStatus(deadline, getLocalDateString());
  const value = deadline ? formatTaskDueDateDisplay(deadline, isEn) || deadline : null;

  if (!supportsTaskDeadline(task) || (!canEdit && !deadline)) return null;

  const saveDeadline = async (value: string | null) => {
    const target = { id: task.id, userId: task.user_id };
    const generation = taskGeneration.current;
    setSavingTaskId(target.id);
    setSaveError(false);
    try {
      const result = await save({ deadline_date: value });
      if (result === "failed") throw new Error("Deadline save failed");
      if (taskGeneration.current === generation && currentTask.current.id === target.id && currentTask.current.userId === target.userId) setOpen(false);
    } catch {
      if (taskGeneration.current === generation && currentTask.current.id === target.id && currentTask.current.userId === target.userId) {
        setSaveError(true);
        setOpen(true);
      }
    } finally {
      if (taskGeneration.current === generation && currentTask.current.id === target.id && currentTask.current.userId === target.userId) setSavingTaskId(null);
    }
  };

  const label = value ? T(`مهلت: ${value}`, `Deadline: ${value}`) : T("افزودن مهلت", "Add deadline");

  return (
    <div className="space-y-1" data-testid="task-deadline-control">
      <div className="flex items-center gap-1">
        {(canEdit || value) && <IconTip
          label={label}
          onClick={() => { if (!canEdit || saving) return; setSaveError(false); setOpen((current) => !current); }}
          disabled={!canEdit || saving}
          active={!!value || open}
          expanded={open}
          testid="task-deadline-toggle"
          className={`h-9 ${value ? "max-w-36 gap-1.5 px-2" : "w-9"}`}
        >
          <CalendarDays className={`h-4 w-4 shrink-0 ${status === "overdue" ? "text-rose-600 dark:text-rose-400" : status === "upcoming" ? "text-amber-600 dark:text-amber-400" : ""}`} strokeWidth={1.7} />
          {value && <span className="max-w-24 truncate text-[11px] tabular-nums"><bdi>{value}</bdi></span>}
        </IconTip>}
        {canEdit && value && (
          <button
            type="button"
            onClick={() => { void saveDeadline(null); }}
            disabled={saving}
            aria-label={T("پاک‌کردن مهلت", "Clear deadline")}
            title={T("پاک‌کردن مهلت", "Clear deadline")}
            data-testid="task-deadline-clear"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {open && canEdit && (
        <div className="rounded-xl bg-muted/40 p-1.5" data-testid="task-deadline-calendar" aria-busy={saving}>
          {saveError && <p role="alert" className="px-2 py-1 text-xs text-destructive">{T("ذخیره نشد؛ دوباره تلاش کن.", "Could not save. Please try again.")}</p>}
          <InlineDatePicker
            bare
            value={deadline}
            isEn={isEn}
            onSelect={(date) => { void saveDeadline(date); }}
          />
        </div>
      )}
    </div>
  );
}
