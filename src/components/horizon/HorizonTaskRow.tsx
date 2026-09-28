import { useNavigate } from "react-router-dom";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, Clock, GripVertical, Repeat2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { PRIORITY_META } from "@/lib/priority";
import type { Task } from "@/lib/taskTypes";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { getTaskTime, periodLabel, type TimeSettings } from "@/lib/timeHorizon";

export function HorizonTaskRow({ task, settings, lang, overdue, showPeriod, onToggle, onPostpone }: {
  task: Task;
  settings: TimeSettings;
  lang: "fa" | "en";
  overdue?: boolean;
  showPeriod?: boolean;
  onToggle: () => void;
  onPostpone: () => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: task.id, data: { task } });
  const tf = getTaskTime(task, settings);
  const pm = PRIORITY_META[task.priority || "none"];
  const fa = lang === "fa";
  const num = (s: string | number) => (fa ? toPersianDigits(s) : String(s));

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`group flex items-center gap-2 rounded-xl border bg-card px-2 py-1.5 transition-shadow ${isDragging ? "shadow-lg ring-2 ring-primary/40 opacity-90 relative z-10" : ""} ${task.completed ? "opacity-60" : ""} ${overdue ? "border-destructive/40" : "border-border/60"}`}
      data-testid={`horizon-task-${task.id}`}
    >
      <button type="button" className="touch-none cursor-grab text-muted-foreground/60 hover:text-foreground p-1 -m-1" aria-label={fa ? "جابه‌جایی" : "Drag"} {...listeners} {...attributes} data-testid={`horizon-task-drag-${task.id}`}>
        <GripVertical className="w-3.5 h-3.5" />
      </button>
      <Checkbox checked={!!task.completed} onCheckedChange={onToggle} aria-label={fa ? "انجام شد" : "Done"} data-testid={`horizon-task-check-${task.id}`} />
      <button type="button" onClick={() => navigate(`/app/tasks/${task.id}`)} className="flex-1 min-w-0 text-start">
        <div className={`text-sm leading-5 truncate ${task.completed ? "line-through" : ""}`} dir="auto">{task.title}</div>
        <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mt-0.5">
          {task.priority && task.priority !== "none" && <span className={`font-semibold ${pm.textClass}`}>{fa ? pm.label : pm.labelEn}</span>}
          {tf?.is_exact && tf.due_at && (
            <span className="inline-flex items-center gap-0.5"><Clock className="w-2.5 h-2.5" />{formatDate(tf.due_at, showPeriod ? "d MMM HH:mm" : "HH:mm", settings.calendar)}</span>
          )}
          {showPeriod && tf && !tf.is_exact && <span>{periodLabel({ horizon: tf.horizon, start: tf.period_start, end: tf.period_end }, settings, lang)}</span>}
          {tf && tf.postpone_count > 0 && (
            <span className="inline-flex items-center gap-0.5 text-amber-600 dark:text-amber-400" data-testid={`horizon-task-postponed-${task.id}`}>
              <Repeat2 className="w-2.5 h-2.5" />{num(tf.postpone_count)}
            </span>
          )}
          {overdue && <span className="text-destructive font-semibold">{fa ? "عقب‌افتاده" : "Overdue"}</span>}
        </div>
      </button>
      {!task.completed && tf && (
        <button type="button" onClick={onPostpone} className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={fa ? "تعویق به دورهٔ بعد" : "Postpone to next period"} title={fa ? "تعویق به دورهٔ بعد" : "Postpone"} data-testid={`horizon-task-postpone-${task.id}`}>
          <CalendarClock className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
