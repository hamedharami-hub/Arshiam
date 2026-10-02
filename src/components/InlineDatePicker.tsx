import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import * as G from "date-fns";
import * as J from "date-fns-jalali";
import { getCalendarSystem, toPersianDigits, WEEKDAY_SHORT_FA } from "@/lib/jalali";
import { getTimeSettings, weekStartsOn } from "@/lib/timeHorizon";

const EN_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

// Compact month grid (Jalali or Gregorian) used instead of the native date input.
export function InlineDatePicker({ value, onSelect, isEn }: { value: string; onSelect: (ymd: string) => void; isEn: boolean }) {
  const jalali = getCalendarSystem() === "jalali";
  const L = jalali ? J : G;
  const ws = weekStartsOn(getTimeSettings().weekStart);
  const selected = value ? new Date(`${value}T12:00:00`) : null;
  const [month, setMonth] = useState(() => L.startOfMonth(selected || new Date()));
  const days = L.eachDayOfInterval({
    start: L.startOfWeek(L.startOfMonth(month), { weekStartsOn: ws }),
    end: L.endOfWeek(L.endOfMonth(month), { weekStartsOn: ws }),
  });
  const heads = Array.from({ length: 7 }, (_, i) => (ws + i) % 7);
  const num = (s: string) => (isEn ? s : toPersianDigits(s));
  const dayName = (d: number) => (isEn ? EN_DAYS[d] : WEEKDAY_SHORT_FA[(d + 1) % 7]);
  const today = new Date();

  return (
    <div className="rounded-lg border border-border p-2" data-testid="inline-date-picker">
      <div className="mb-1 flex items-center justify-between">
        <button type="button" className="grid h-7 w-7 place-items-center rounded hover:bg-muted" onClick={() => setMonth(L.addMonths(month, -1))} aria-label="prev" data-testid="inline-date-prev">
          {isEn ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </button>
        <span className="text-xs font-semibold" data-testid="inline-date-month">{num(L.format(month, "MMMM yyyy"))}</span>
        <button type="button" className="grid h-7 w-7 place-items-center rounded hover:bg-muted" onClick={() => setMonth(L.addMonths(month, 1))} aria-label="next" data-testid="inline-date-next">
          {isEn ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
      </div>
      <div className="grid grid-cols-7 text-center text-[10px] text-muted-foreground">
        {heads.map((d) => <span key={d} className="py-1">{dayName(d)}</span>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d) => {
          const ymd = G.format(d, "yyyy-MM-dd");
          const isSel = ymd === value;
          const out = !L.isSameMonth(d, month);
          const isToday = G.isSameDay(d, today);
          return (
            <button
              key={ymd}
              type="button"
              onClick={() => onSelect(ymd)}
              className={`h-8 rounded text-xs tabular-nums transition-colors ${isSel ? "bg-primary font-semibold text-primary-foreground" : isToday ? "bg-muted font-semibold text-primary" : "hover:bg-muted"} ${out && !isSel ? "text-muted-foreground/40" : ""}`}
              data-testid={`inline-date-day-${ymd}`}
            >
              {num(L.format(d, "d"))}
            </button>
          );
        })}
      </div>
    </div>
  );
}
