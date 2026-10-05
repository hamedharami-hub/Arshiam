import { useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { fromLocalISO, periodFor, nextPeriod, prevPeriod, periodLabel, todayISO, type Horizon, type Period, type TimeSettings } from "@/lib/timeHorizon";
import { periodsWithin } from "@/lib/planCascade";
import { format as gFormat } from "date-fns";
import { format as jFormat } from "date-fns-jalali";
import { toPersianDigits } from "@/lib/jalali";

const PARENT_OF: Record<Horizon, Horizon | "decade"> = { day: "month", week: "month", month: "year", quarter: "year", year: "decade" };

function decade(p: Period, s: TimeSettings): Period[] {
  let start = periodFor("year", fromLocalISO(p.start), s);
  for (let i = 0; i < 3; i++) start = prevPeriod(start, s);
  return Array.from({ length: 7 }, () => { const cur = start; start = nextPeriod(start, s); return cur; });
}

function shortLabel(p: Period, s: TimeSettings, fa: boolean): string {
  const d = fromLocalISO(p.start);
  const jal = s.calendar === "jalali";
  const f = (fmt: string) => (jal ? toPersianDigits(jFormat(d, fmt)) : gFormat(d, fmt));
  if (p.horizon === "day") return f("d");
  if (p.horizon === "month") return f(jal ? "MMMM" : "MMM");
  return periodLabel(p, s, fa ? "fa" : "en");
}

/** Mobile-friendly picker: shows the sibling periods inside the parent period, with parent navigation. */
export function PeriodPicker({ period, settings, fa, onPick, isAllowed }: { period: Period; settings: TimeSettings; fa: boolean; onPick: (p: Period) => void; isAllowed?: (p: Period) => boolean }) {
  const [open, setOpen] = useState(false);
  const parentKind = PARENT_OF[period.horizon];
  const [frame, setFrame] = useState<Period>(() => parentKind === "decade" ? period : periodFor(parentKind, fromLocalISO(period.start), settings));
  const options = parentKind === "decade" ? decade(frame, settings) : periodsWithin(period.horizon, frame, settings);
  const today = todayISO();
  const shift = (dir: 1 | -1) => {
    if (parentKind === "decade") { let f = frame; for (let i = 0; i < 7; i++) f = dir === 1 ? nextPeriod(f, settings) : prevPeriod(f, settings); setFrame(f); }
    else setFrame(dir === 1 ? nextPeriod(frame, settings) : prevPeriod(frame, settings));
  };
  const Prev = fa ? ChevronRight : ChevronLeft;
  const Next = fa ? ChevronLeft : ChevronRight;
  const cols = period.horizon === "day" ? "grid-cols-7" : period.horizon === "week" || period.horizon === "year" ? "grid-cols-1" : "grid-cols-3";

  return (
    <Popover open={open} onOpenChange={(v) => { setOpen(v); if (v) setFrame(parentKind === "decade" ? period : periodFor(parentKind, fromLocalISO(period.start), settings)); }}>
      <PopoverTrigger asChild>
        <button type="button" className="flex min-w-0 items-center justify-center gap-1.5 rounded-full px-3 py-1.5 text-base font-semibold hover:bg-muted" data-testid="planning-period-picker">
          <span className="truncate" data-testid="planning-period-label">{periodLabel(period, settings, fa ? "fa" : "en")}</span>
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-w-[92vw] p-3" dir={fa ? "rtl" : "ltr"} align="center">
        <div className="mb-2 flex items-center justify-between">
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" onClick={() => shift(-1)} aria-label={fa ? "قبلی" : "Previous"}><Prev className="h-4 w-4" /></button>
          <span className="text-sm font-semibold">{parentKind === "decade" ? `${periodLabel(options[0], settings, fa ? "fa" : "en")} – ${periodLabel(options[options.length - 1], settings, fa ? "fa" : "en")}` : periodLabel(frame, settings, fa ? "fa" : "en")}</span>
          <button type="button" className="grid h-9 w-9 place-items-center rounded-full hover:bg-muted" onClick={() => shift(1)} aria-label={fa ? "بعدی" : "Next"}><Next className="h-4 w-4" /></button>
        </div>
        <div className={cn("grid gap-1.5", cols)}>
          {options.map((p) => {
            const active = p.start === period.start;
            const isNow = today >= p.start && today <= p.end;
            const allowed = isAllowed?.(p) ?? true;
            return (
              <button key={p.start} type="button" disabled={!allowed} onClick={() => { onPick(p); setOpen(false); }} data-testid={`planning-pick-${p.start}`}
                className={cn("rounded-lg px-2 py-2 text-sm transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-35", active ? "bg-primary text-primary-foreground" : "hover:bg-muted", isNow && !active && "ring-1 ring-primary/50 font-semibold")}>
                {shortLabel(p, settings, fa)}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
