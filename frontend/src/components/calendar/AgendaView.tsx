import { isSameDay, format, compareAsc } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, dominantKind, HOLIDAY_TONE, type Holiday } from "@/lib/holidays";
import { parseTaskDueDate } from "@/lib/taskDate";
import { isAllDayCalendarDate, type CalendarTask } from "./CalendarTask";
import DeadlineMarker from "./DeadlineMarker";
import { useBilingual } from "@/hooks/useBilingual";

export default function AgendaView({
  start, end, tasks, holidays, system,
}: {
  start: Date;
  end: Date;
  tasks: CalendarTask[];
  holidays: Holiday[];
  system: CalendarSystem;
}) {
  const navigate = useNavigate();
  const { T } = useBilingual();
  const items = tasks
    .flatMap((t) => {
      const _d = t.due_date ? parseTaskDueDate(t.due_date) : null;
      return _d && _d >= start && _d <= end ? [{ ...t, _d }] : [];
    })
    .sort((a, b) => compareAsc(a._d, b._d));

  // Group by day
  const groups: Record<string, typeof items> = {};
  items.forEach((it) => {
    const k = format(it._d, "yyyy-MM-dd");
    (groups[k] ||= []).push(it);
  });

  const keys = Object.keys(groups).sort();

  if (keys.length === 0) {
    return <div className="text-center text-muted-foreground py-8 text-sm border border-dashed border-border/60 rounded-xl">برنامه‌ای در این بازه نیست</div>;
  }

  return (
    <div className="space-y-3">
      {keys.map((k) => {
        const d = parseTaskDueDate(k)!;
        const hol = isHoliday(d, holidays);
        return (
          <div key={k} className="border border-border/60 rounded-xl overflow-hidden bg-card/40">
            <div className={`px-4 py-2.5 text-sm font-medium flex justify-between ${hol.length ? `${HOLIDAY_TONE[dominantKind(hol)!].bg} ${HOLIDAY_TONE[dominantKind(hol)!].text}` : "bg-muted/30"}`}>
              <span>
                {system === "jalali" ? formatDate(d, "EEEE d MMMM", "jalali") : format(d, "EEEE, MMM d")}
              </span>
              {hol.length > 0 && <span className="text-xs">{hol[0].local_name || hol[0].name}</span>}
            </div>
            <div className="divide-y">
              {groups[k].map((t) => (
                <button
                  key={t.id}
                  onClick={() => navigate(`/app/tasks/${t.id}`)}
                  className="w-full px-4 py-2.5 flex items-center gap-3 text-sm text-end hover:bg-accent/30 transition"
                >
                  <span className="text-xs text-muted-foreground tabular-nums w-12">
                    {isAllDayCalendarDate(t.due_date, t.schedule_v)
                      ? T("تمام‌روز", "All day")
                      : toPersianDigits(format(t._d, "HH:mm"))}
                  </span>
                  <span className="flex-1 truncate text-foreground/90">{t.title}</span>
                  <DeadlineMarker deadlineDate={t.deadline_date} completed={t.completed} status={t.status} recurrence={t.recurrence} recurrence_rule={t.recurrence_rule} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
