import { SharedTaskRow } from "@/components/SharedTaskRow";
import { useNavigate } from "react-router-dom";
import { useDraggable } from "@dnd-kit/core";
import { CalendarClock, Clock, GripVertical, Repeat2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import type { Task } from "@/lib/taskTypes";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { getTaskTime, periodLabel, type TimeSettings } from "@/lib/timeHorizon";

export function HorizonTaskRow({ task, settings, lang, overdue, showPeriod, goal, onToggle, onPostpone, onClick }: {
  task: Task;
  settings: TimeSettings;
  lang: "fa" | "en";
  overdue?: boolean;
  showPeriod?: boolean;
  goal?: { title: string; icon?: string } | null;
  onToggle: () => void;
  onPostpone: () => void;
  onClick?: () => void;
}) {
  const navigate = useNavigate();
  const { attributes, listeners, setNodeRef, isDragging, transform } = useDraggable({ id: task.id, data: { task } });
  const tf = getTaskTime(task, settings);
  const fa = lang === "fa";
  const num = (s: string | number) => (fa ? toPersianDigits(s) : String(s));

  return (
    <div
      ref={setNodeRef}
      style={transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined}
      className={`group flex items-start gap-2 rounded-xl transition-shadow ${isDragging ? "shadow-lg ring-2 ring-primary/40 opacity-90 relative z-10" : ""} ${task.completed ? "opacity-60" : ""} ${overdue ? "border-destructive/40" : "border-border/60"}`}
      data-testid={`horizon-task-${task.id}`}
    >
      <div className="flex-1 min-w-0"><SharedTaskRow task={task} externalDragHandle={{ ...listeners, ...attributes }} />
        <div className="flex flex-wrap gap-2 px-2 text-[10px] text-muted-foreground">
          {goal && <span>{goal.icon || "🎯"} {goal.title}</span>}
          {showPeriod && tf && !tf.is_exact && <span>{periodLabel({ horizon: tf.horizon, start: tf.period_start, end: tf.period_end }, settings, lang)}</span>}
          {tf && tf.postpone_count > 0 && <span data-testid={`horizon-task-postponed-${task.id}`}>{num(tf.postpone_count)}</span>}
          {overdue && <span className="text-destructive">{fa ? "عقب‌افتاده" : "Overdue"}</span>}
        </div>
      </div>
      {!task.completed && tf && (
        <button type="button" onClick={onPostpone} className="h-9 w-9 shrink-0 rounded-lg flex items-center justify-center text-muted-foreground hover:bg-muted hover:text-foreground" aria-label={fa ? "تعویق به دورهٔ بعد" : "Postpone to next period"} title={fa ? "تعویق به دورهٔ بعد" : "Postpone"} data-testid={`horizon-task-postpone-${task.id}`}>
          <CalendarClock className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
