import { format, eachDayOfInterval, isSameDay, isSameMonth, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from "date-fns";
import { formatDate, toPersianDigits, WEEKDAY_SHORT_FA, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, dominantKind, HOLIDAY_TONE, type Holiday } from "@/lib/holidays";
import { getTimeSettings, periodFor, fromLocalISO, toLocalISO, weekStartsOn as weekStartsOnFor } from "@/lib/timeHorizon";
import { parseTaskDueDate } from "@/lib/taskDate";
import { computePhase, type CycleProfile, type CycleLog, PHASE_META } from "@/lib/cycle";
import type { CalendarTask } from "./CalendarTask";
import DeadlineMarker from "./DeadlineMarker";
import { PRIORITY_META, normalizeTaskPriority } from "@/lib/priority";
import { useBilingual } from "@/hooks/useBilingual";
type WeekStartsOn = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export default function MonthGrid({
  month, tasks, holidays, system, onDayClick, cycleProfile, cycleLogs,
}: {
  month: Date;
  tasks: CalendarTask[];
  holidays: Holiday[];
  system: CalendarSystem;
  onDayClick: (d: Date) => void;
  cycleProfile?: CycleProfile | null;
  cycleLogs?: CycleLog[];
}) {
  const { T } = useBilingual();
  // Calendar-aware month (Jalali month in Jalali mode) + the user's week start (Sat/Mon).
  const settings = { ...getTimeSettings(), calendar: system };
  const weekStartsOn: WeekStartsOn = weekStartsOnFor(settings.weekStart);
  const mp = periodFor("month", month, settings);
  const days = eachDayOfInterval({
    start: startOfWeek(fromLocalISO(mp.start), { weekStartsOn }),
    end: endOfWeek(fromLocalISO(mp.end), { weekStartsOn }),
  });
  const inMonth = (d: Date) => { const k = toLocalISO(d); return k >= mp.start && k <= mp.end; };
  // Derive the seven column labels from the actual week start. JS weekday index is
  // 0=Sunday…6=Saturday; the Persian short names are ordered 0=Saturday…6=Friday,
  // so a JS weekday maps to Persian index (day + 1) % 7.
  const EN_WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];
  const weekdayLabels = Array.from({ length: 7 }, (_, i) => {
    const day = (weekStartsOn + i) % 7;
    return system === "jalali" ? WEEKDAY_SHORT_FA[(day + 1) % 7] : EN_WEEKDAYS[day];
  });
  return (
    <div>
      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
        {weekdayLabels.map((d, i) => (
          <div key={i} className="p-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((d) => {
          const dayTasks = tasks.filter((t) => {
            const due = t.due_date ? parseTaskDueDate(t.due_date) : null;
            return !!due && isSameDay(due, d);
          });
          const dayHolidays = isHoliday(d, holidays);
          const isFriday = d.getDay() === 5;
          const isOff = dayHolidays.length > 0 || (system === "jalali" && isFriday);
          const isHolidayDay = dayHolidays.length > 0;
          const kind = dominantKind(dayHolidays);
          const tone = kind ? HOLIDAY_TONE[kind] : null;
          const dayLabel = system === "jalali"
            ? toPersianDigits(formatDate(d, "d", "jalali"))
            : format(d, "d");
          const phase = cycleProfile && cycleLogs ? computePhase(d, cycleLogs, cycleProfile) : null;
          const phaseColor = phase && phase.phase !== "unknown" ? PHASE_META[phase.phase].color : null;
          const phaseStyle = phaseColor
            ? { borderColor: `${phaseColor}30`, background: `${phaseColor}${phase?.predicted ? "08" : "12"}` }
            : undefined;
          return (
            <button
              key={d.toISOString()}
              onClick={() => onDayClick(d)}
              style={phaseStyle}
              className={`aspect-square border rounded-lg p-1.5 text-xs flex flex-col text-end transition hover:bg-accent/40 hover:border-primary/30
                ${inMonth(d) ? "" : "opacity-30"}
                ${isSameDay(d, new Date()) ? "ring-1 ring-primary bg-primary/5" : ""}
                ${tone && !phaseColor ? `${tone.bg} ${tone.border}` : ""}
                ${isFriday && !isHolidayDay && !phaseColor ? "text-muted-foreground" : ""}`}
            >
              <div className={`font-medium flex items-center justify-between ${tone ? tone.text : ""}`} data-testid={kind ? `month-day-holiday-${kind}` : undefined}>
                <span>{dayLabel}</span>
                {isHolidayDay && (
                  <span className="text-[9px] font-medium text-muted-foreground" aria-hidden>{dayHolidays[0].country_code}</span>
                )}
              </div>
              <div className="flex-1 overflow-hidden space-y-0.5 mt-0.5">
                {dayHolidays.slice(0, 1).map((h) => (
                  <div key={h.id} className={`text-[10px] truncate ${HOLIDAY_TONE[h.kind].text}`} title={h.local_name || h.name}>
                    {h.local_name || h.name}{h.approximate ? (system === "jalali" ? " (تقریبی)" : " (approx.)") : ""}
                  </div>
                ))}
                {dayTasks.length > 0 && (
                  <div className="flex flex-col gap-0.5 mt-auto">
                    {dayTasks.slice(0, 2).map((t) => (
                      <div key={t.id} className="flex min-w-0 items-center gap-1 text-[10px] leading-tight">
                        <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full shrink-0 bg-current ${PRIORITY_META[normalizeTaskPriority(t.priority)].flagClass}`} />
                        <span className="truncate text-foreground/80">{t.title}</span>
                        <span className={`shrink-0 ${PRIORITY_META[normalizeTaskPriority(t.priority)].textClass}`}>{T(PRIORITY_META[normalizeTaskPriority(t.priority)].label, PRIORITY_META[normalizeTaskPriority(t.priority)].labelEn)}</span>
                        <DeadlineMarker deadlineDate={t.deadline_date} completed={t.completed} status={t.status} recurrence={t.recurrence} recurrence_rule={t.recurrence_rule} />
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <span className="text-[10px] text-muted-foreground px-2">+{toPersianDigits(dayTasks.length - 2)}</span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
