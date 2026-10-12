import { useRef } from "react";
import type { Task } from "@/lib/taskTypes";
import { legacySchedulePreview } from "@/lib/taskScheduleMigration";
import { taskScheduleApplyWrite } from "@/lib/taskScheduleWrite";

/**
 * One quiet row for a single legacy task. Shown only when a preview is needed.
 * Apply runs from the click handler, never from render, an effect, or a list.
 */
export function TaskScheduleLegacyRow({ task, canEdit, save, T }: {
  task: Task;
  canEdit: boolean;
  save: (patch: Record<string, unknown>) => void;
  T: (fa: string, en: string) => string;
}) {
  const preview = legacySchedulePreview(task);
  const sent = useRef(false);
  if (!preview.needed) return null;
  const disabled = !canEdit || preview.conflict || preview.patch == null || sent.current;

  return (
    <div
      className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm"
      data-testid="task-schedule-legacy-row"
    >
      <span className="min-w-0 flex-1 text-start text-muted-foreground">{T(preview.labelFa, preview.labelEn)}</span>
      <button
        type="button"
        disabled={disabled}
        data-testid="task-schedule-legacy-apply"
        onClick={() => {
          if (sent.current || !canEdit || preview.conflict || preview.patch == null) return;
          const written = taskScheduleApplyWrite(task);
          if (!written) return;
          sent.current = true;
          save(written);
        }}
        className="h-7 shrink-0 rounded-md bg-muted/60 px-2.5 text-[11px] transition hover:bg-muted disabled:opacity-50"
      >
        {T("اعمال", "Apply")}
      </button>
    </div>
  );
}
