import { useRef, useState } from "react";
import { eachDayOfInterval, startOfWeek, endOfWeek, isSameDay, format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, type Holiday } from "@/lib/holidays";
import { useTapGestures } from "@/lib/useTapGestures";
import { usePinchZoom } from "@/lib/usePinchZoom";
import { ZoomIn } from "lucide-react";

type Task = { id: string; title: string; due_date: string | null; priority: string };

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_ROW = 36;

function Slot({
  d, h, slotTasks, onClick, onDouble, height,
}: {
  d: Date; h: number; slotTasks: Task[]; onClick: () => void; onDouble: () => void; height: number;
}) {
  const navigate = useNavigate();
  const { handlers } = useTapGestures({ onSingleTap: onClick, onDoubleTap: onDouble });
  return (
    <div
      {...handlers}
      onClick={onClick}
      className="bg-card border-t p-0.5 text-end hover:bg-accent/30 transition cursor-pointer select-none"
      style={{ minHeight: height }}
    >
      {slotTasks.map((t) => (
        <div
          key={t.id}
          onClick={(e) => { e.stopPropagation(); navigate(`/app/tasks/${t.id}`); }}
          className="bg-muted text-foreground/80 text-[10px] truncate rounded-md px-2 py-1 mb-1 border border-border/60 cursor-pointer hover:bg-accent/60 transition"
        >
          {t.title}
        </div>
      ))}
    </div>
  );
}

export default function WeekView({
  date, tasks, holidays, system, onDayClick, onSlotClick,
}: {
  date: Date;
  tasks: Task[];
  holidays: Holiday[];
  system: CalendarSystem;
  onDayClick: (d: Date) => void;
  onSlotClick?: (d: Date, hour: number) => void;
}) {
  const navigate = useNavigate();
  const weekStartsOn: 0 | 6 = system === "jalali" ? 6 : 0;
  const days = eachDayOfInterval({ start: startOfWeek(date, { weekStartsOn }), end: endOfWeek(date, { weekStartsOn }) });
  const { scale, handlers: pinchHandlers } = usePinchZoom({ initial: 1, min: 0.6, max: 2.4 });
  const [hint, setHint] = useState(false);
  const hintTimer = useRef<number | null>(null);
  const ROW_H = BASE_ROW * scale;

  const onPinchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      setHint(true);
      if (hintTimer.current) window.clearTimeout(hintTimer.current);
      hintTimer.current = window.setTimeout(() => setHint(false), 700);
    }
    pinchHandlers.onTouchStart(e);
  };

  const quickCreate = (d: Date, h: number) => {
    const dt = new Date(d); dt.setHours(h, 0, 0, 0);
    navigate(`/app/tasks/new?due_date=${encodeURIComponent(dt.toISOString())}`);
  };

  return (
    <div
      className="overflow-x-auto relative"
      onTouchStart={onPinchStart}
      onTouchMove={pinchHandlers.onTouchMove}
      onTouchEnd={pinchHandlers.onTouchEnd}
    >
      {hint && (
        <div className="absolute top-2 left-2 z-20 bg-background/90 backdrop-blur border rounded-full px-2 py-1 text-[10px] flex items-center gap-1 shadow">
          <ZoomIn className="w-3 h-3" /> {Math.round(scale * 100)}%
        </div>
      )}
      <div className="min-w-[700px]">
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border sticky top-0 z-10">
          <div className="bg-card" />
          {days.map((d) => {
            const off = isHoliday(d, holidays).length > 0 || (system === "jalali" && d.getDay() === 5);
            return (
              <button
                key={d.toISOString()}
                onClick={() => onDayClick(d)}
                className={`bg-card p-2 text-center text-xs hover:bg-accent/40 transition ${off ? "text-amber-600 dark:text-amber-400" : ""} ${isSameDay(d, new Date()) ? "bg-primary/5 ring-1 ring-primary/20" : ""}`}
              >
                <div className="font-semibold">
                  {system === "jalali" ? toPersianDigits(formatDate(d, "d", "jalali")) : format(d, "d")}
                </div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  {system === "jalali" ? formatDate(d, "EEEEEE", "jalali") : format(d, "EEE")}
                </div>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[48px_repeat(7,1fr)] gap-px bg-border">
          {HOURS.map((h) => (
            <div key={`row-${h}`} className="contents">
              <div className="bg-card text-[10px] text-muted-foreground p-1 text-center border-t" style={{ minHeight: ROW_H }}>
                {toPersianDigits(String(h).padStart(2, "0"))}
              </div>
              {days.map((d) => {
                const slotTasks = tasks.filter((t) => {
                  if (!t.due_date) return false;
                  const dt = new Date(t.due_date);
                  return isSameDay(dt, d) && dt.getHours() === h;
                });
                return (
                  <Slot
                    key={`${d.toISOString()}-${h}`}
                    d={d} h={h} slotTasks={slotTasks} height={ROW_H}
                    onClick={() => onSlotClick?.(d, h)}
                    onDouble={() => quickCreate(d, h)}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
