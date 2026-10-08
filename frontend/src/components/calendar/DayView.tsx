import { useState, useRef } from "react";
import { isSameDay, format } from "date-fns";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { useNavigate } from "react-router-dom";
import { useTapGestures } from "@/lib/useTapGestures";
import { usePinchZoom } from "@/lib/usePinchZoom";
import { ZoomIn } from "lucide-react";
import { parseTaskDueDate } from "@/lib/taskDate";
import { isAllDayCalendarDate, type CalendarTask } from "./CalendarTask";
import DeadlineMarker from "./DeadlineMarker";
import { useBilingual } from "@/hooks/useBilingual";

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_HEIGHT = 56;

function HourSlot({
  date, h, slotDue, onSlotClick, onTaskClick, onQuickCreate, height,
}: {
  date: Date; h: number; slotDue: CalendarTask[]; height: number;
  onSlotClick?: (h: number) => void;
  onTaskClick?: (id: string) => void;
  onQuickCreate: (h: number) => void;
}) {
  const { handlers } = useTapGestures({
    onSingleTap: () => onSlotClick?.(h),
    onDoubleTap: () => onQuickCreate(h),
  });
  return (
    <div
      {...handlers}
      onClick={() => onSlotClick?.(h)}
      className="w-full grid grid-cols-[60px_1fr] gap-2 p-2 text-end hover:bg-accent/30 transition cursor-pointer select-none border-b border-border/50"
      style={{ height }}
    >
      <div className="text-xs text-muted-foreground tabular-nums">
        {toPersianDigits(String(h).padStart(2, "0"))}:۰۰
      </div>
      <div className="space-y-1">
        {slotDue.map((t) => (
          <div
            key={t.id}
            onClick={(e) => { e.stopPropagation(); onTaskClick?.(t.id); }}
            className="bg-card text-foreground/80 text-xs rounded-md px-2 py-1 truncate border border-border/60 hover:border-primary/30 hover:bg-accent/30 transition"
          >
            <span className="inline-flex max-w-full items-center gap-1">
              <span className="truncate">{t.title}</span>
              <DeadlineMarker deadlineDate={t.deadline_date} completed={t.completed} status={t.status} recurrence={t.recurrence} recurrence_rule={t.recurrence_rule} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function DayView({
  date, tasks, system, onSlotClick, onTaskClick,
}: {
  date: Date;
  tasks: CalendarTask[];
  system: CalendarSystem;
  onSlotClick?: (hour: number) => void;
  onTaskClick?: (taskId: string) => void;
}) {
  const navigate = useNavigate();
  const { T } = useBilingual();
  const { scale, handlers: pinchHandlers } = usePinchZoom({ initial: 1, min: 0.6, max: 2.4 });
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<number | null>(null);
  const HOUR_HEIGHT = BASE_HEIGHT * scale;

  const showHint = () => {
    setHint(true);
    if (hintTimer.current) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setHint(false), 700);
  };

  const onPinchStart = (e: React.TouchEvent) => { if (e.touches.length === 2) showHint(); pinchHandlers.onTouchStart(e); };

  const dayTasks = tasks.filter((t) => {
    const ref = t.due_date ? parseTaskDueDate(t.due_date) : null;
    return !!ref && isSameDay(ref, date);
  });
  const allDayTasks = dayTasks.filter((t) => isAllDayCalendarDate(t.due_date, t.schedule_v));
  const timedTasks = dayTasks.filter((t) => t.due_date && !isAllDayCalendarDate(t.due_date, t.schedule_v));

  const quickCreate = (hour: number) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    navigate(`/app/tasks/new?due_date=${encodeURIComponent(d.toISOString())}`);
  };

  return (
    <div className="space-y-2">
      <div className="text-center">
        <h3 className="text-lg md:text-xl font-bold">
          {system === "jalali" ? formatDate(date, "EEEE d MMMM yyyy", "jalali") : format(date, "EEEE, MMMM d, yyyy")}
        </h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          {system === "jalali" ? format(date, "EEEE, MMMM d") : formatDate(date, "EEEE d MMMM yyyy", "jalali")}
        </p>
      </div>

      {allDayTasks.length > 0 && (
        <div className="rounded-xl border border-border/60 bg-card/40 p-2" data-testid="calendar-all-day-tasks">
          <div className="mb-1 px-1 text-[10px] font-medium text-muted-foreground">{T("تمام‌روز", "All day")}</div>
          <div className="space-y-1">
            {allDayTasks.map((t) => (
              <button key={t.id} type="button" onClick={() => onTaskClick ? onTaskClick(t.id) : navigate(`/app/tasks/${t.id}`)}
                className="flex w-full items-center gap-1 rounded-md border border-border/60 bg-card px-2 py-1 text-start text-xs text-foreground/80 hover:bg-accent/30">
                <span className="truncate">{t.title}</span>
                <DeadlineMarker deadlineDate={t.deadline_date} completed={t.completed} status={t.status} recurrence={t.recurrence} recurrence_rule={t.recurrence_rule} />
              </button>
            ))}
          </div>
        </div>
      )}

      <div
        className="relative border border-border/60 rounded-xl overflow-hidden touch-pan-y bg-card/40"
        onTouchStart={onPinchStart}
        onTouchMove={pinchHandlers.onTouchMove}
        onTouchEnd={pinchHandlers.onTouchEnd}
      >
        {hint && (
          <div className="absolute top-2 left-2 z-20 bg-background/90 backdrop-blur border rounded-full px-2 py-1 text-[10px] flex items-center gap-1 shadow">
            <ZoomIn className="w-3 h-3" /> {Math.round(scale * 100)}%
          </div>
        )}
        <div>
          {HOURS.map((h) => {
            const slotDue = timedTasks.filter((t) => parseTaskDueDate(t.due_date!)?.getHours() === h);
            return (
              <HourSlot
                key={h} date={date} h={h} slotDue={slotDue} height={HOUR_HEIGHT}
                onSlotClick={onSlotClick} onTaskClick={onTaskClick} onQuickCreate={quickCreate}
              />
            );
          })}
        </div>

      </div>

      {dayTasks.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border/60 rounded-xl">
          هیچ تسکی برای این روز زمان‌بندی نشده.
        </p>
      )}
    </div>
  );
}
