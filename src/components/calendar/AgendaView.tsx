import { isSameDay, format, compareAsc } from "date-fns";
import { useNavigate } from "react-router-dom";
import { formatDate, toPersianDigits, type CalendarSystem } from "@/lib/jalali";
import { isHoliday, dominantKind, HOLIDAY_TONE, type Holiday } from "@/lib/holidays";
import { parseTaskDueDate } from "@/lib/taskDate";
import { fromLocalISO } from "@/lib/timeHorizon";
import { DEADLINE_MARK_TEXT, isLiteralDeadlineDay } from "@/lib/taskSchedule";

type Task = { id: string; title: string; work_date: string | null; priority: string; deadline_date?: string | null };

export default function AgendaView({
  start, end, tasks, holidays, system,
}: {
  start: Date;
  end: Date;
  tasks: Task[];
  holidays: Holiday[];
  system: CalendarSystem;
}) {
  const navigate = useNavigate();
  const items = tasks
    .flatMap((t) => {
      const work = t.work_date ? parseTaskDueDate(t.work_date) : null;
      const workIn = !!work && work >= start && work <= end;
      const deadline = isLiteralDeadlineDay(t.deadline_date, t.deadline_date || "") ? fromLocalISO(t.deadline_date!) : null;
      const deadlineIn = !!deadline && deadline >= start && deadline <= end;
      const same = workIn && deadlineIn && !!work && !!deadline && isSameDay(work, deadline);
      const rows: Array<Task & { _d: Date; _mark: string; _deadlineOnly?: boolean }> = [];
      if (workIn && work) rows.push({ ...t, _d: work, _mark: same ? DEADLINE_MARK_TEXT : "" });
      if (deadlineIn && deadline && !same) rows.push({ ...t, _d: deadline, _mark: DEADLINE_MARK_TEXT, _deadlineOnly: true });
      return rows;
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
                  <span className={t._deadlineOnly ? "shrink-0 text-xs" : "text-xs text-muted-foreground tabular-nums w-12"} data-testid={t._deadlineOnly ? "calendar-deadline-mark" : undefined}>
                    {t._deadlineOnly ? DEADLINE_MARK_TEXT : toPersianDigits(format(t._d, "HH:mm"))}
                  </span>
                  <span className="flex-1 truncate text-foreground/90">
                    {t.title}
                    {t._mark && !t._deadlineOnly ? <span data-testid="calendar-deadline-mark"> {t._mark}</span> : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
