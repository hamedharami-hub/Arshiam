import { useState, useRef } from "react";
import { isSameDay, format } from "date-fns";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { useNavigate } from "react-router-dom";
import { useTapGestures } from "@/lib/useTapGestures";
import { usePinchZoom } from "@/lib/usePinchZoom";
import { ZoomIn } from "lucide-react";
import { parseTaskDueDate } from "@/lib/taskDate";
import { toLocalISO } from "@/lib/timeHorizon";
import { isLiteralDeadlineDay } from "@/lib/taskSchedule";
import { DeadlineMark } from "./DeadlineMark";

type Task = {
  id: string;
  title: string;
  work_date: string | null;
  priority: string;
  description?: string | null;
  deadline_date?: string | null;
};

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_HEIGHT = 56;

function HourSlot({
  date, h, slotDue, onSlotClick, onTaskClick, onQuickCreate, height,
}: {
  date: Date; h: number; slotDue: Task[]; height: number;
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
            <span className="truncate">{t.title}</span>
            {isLiteralDeadlineDay(t.deadline_date, toLocalISO(date)) && <> <DeadlineMark /></>}
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
  tasks: Task[];
  system: CalendarSystem;
  onSlotClick?: (hour: number) => void;
  onTaskClick?: (taskId: string) => void;
}) {
  const navigate = useNavigate();
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

  const dayKey = toLocalISO(date);
  const dayTasks = tasks.filter((t) => {
    const ref = t.work_date ? parseTaskDueDate(t.work_date) : null;
    return !!ref && isSameDay(ref, date);
  });
  const drawn = new Set(dayTasks.map((t) => t.id));
  const deadlineOnly = tasks.filter((t) => isLiteralDeadlineDay(t.deadline_date, dayKey) && !drawn.has(t.id));

  const dueOnly = dayTasks;

  const quickCreate = (hour: number) => {
    const d = new Date(date);
    d.setHours(hour, 0, 0, 0);
    navigate(`/app/tasks/new?work_date=${encodeURIComponent(d.toISOString())}`);
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

      {deadlineOnly.length > 0 && (
        <div className="space-y-1 rounded-xl border border-border/60 bg-card/40 p-2">
          {deadlineOnly.map((t) => (
            <button key={t.id} type="button" onClick={() => onTaskClick?.(t.id)} className="flex w-full items-center gap-2 text-start text-xs text-foreground/80">
              <span className="truncate">{t.title}</span>
              <DeadlineMark />
            </button>
          ))}
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
            const slotDue = dueOnly.filter((t) => parseTaskDueDate(t.work_date!)?.getHours() === h);
            return (
              <HourSlot
                key={h} date={date} h={h} slotDue={slotDue} height={HOUR_HEIGHT}
                onSlotClick={onSlotClick} onTaskClick={onTaskClick} onQuickCreate={quickCreate}
              />
            );
          })}
        </div>

      </div>

      {dueOnly.length === 0 && deadlineOnly.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8 border border-dashed border-border/60 rounded-xl">
          هیچ تسکی برای این روز زمان‌بندی نشده.
        </p>
      )}
    </div>
  );
}
