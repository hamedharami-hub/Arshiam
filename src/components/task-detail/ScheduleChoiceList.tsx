import { useState } from "react";
import { CalendarDays, CalendarRange, Check, ChevronDown, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { InlineDatePicker } from "@/components/InlineDatePicker";
import type { Task } from "@/lib/taskTypes";
import { formatTaskDueDateDisplay, getLocalDateString } from "@/lib/taskDate";
import { isScheduledToday, readTaskSchedule, scheduleCalendarDay } from "@/lib/taskSchedule";
import {
  clockFromWorkDate,
  commitSchedule,
  dayOrClock,
  periodChoice,
  rangeChoice,
  type ScheduleSaveMeta,
} from "@/lib/taskScheduleChoices";
import { currentPeriod, getTimeSettings, nextPeriod, type Period } from "@/lib/timeHorizon";

type ScheduleSection = "date" | "time";

/** One quiet, uniform row — the exact list language of the tags/folder panels. */
export function PropRow({ icon: Icon, label, summary, active, open, onClick, disabled, testid }: {
  icon: any; label: string; summary?: string | null; active?: boolean; open?: boolean;
  onClick: () => void; disabled?: boolean; testid?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-pressed={open === undefined ? Boolean(active) : undefined}
      aria-expanded={open === undefined ? undefined : open}
      data-testid={testid}
      className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-2.5 text-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-primary/10" : "hover:bg-muted/60"}`}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`} />
      <span className="min-w-0 flex-1 truncate text-start font-medium text-foreground/90">{label}</span>
      {summary && <span className="min-w-0 max-w-[45%] truncate text-[10px] text-muted-foreground">{summary}</span>}
      {open !== undefined ? (
        <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      ) : active ? (
        <Check className="h-4 w-4 shrink-0 text-primary" />
      ) : null}
    </button>
  );
}

export function ScheduleChoiceList({ task, canEdit, save, T, isEn, testIdPrefix = "schedule" }: {
  task: Task;
  canEdit: boolean;
  save: (patch: Partial<Task>, meta?: ScheduleSaveMeta) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
  testIdPrefix?: string;
}) {
  const [openSection, setOpenSection] = useState<ScheduleSection | null>(null);
  const schedule = readTaskSchedule(task);
  const settings = getTimeSettings();
  const workDay = scheduleCalendarDay(schedule);
  const todayKey = getLocalDateString();
  const tomorrowKey = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1));
  const isToday = isScheduledToday(schedule, todayKey);
  const isTomorrow = (schedule.mode === "day" || schedule.mode === "clock") && workDay === tomorrowKey;
  const timePart = schedule.mode === "clock" ? clockFromWorkDate(schedule.workDate, schedule.timezone) : null;
  const [timeDraft, setTimeDraft] = useState(timePart || "09:00");
  const rangeActive = schedule.mode === "horizon" && schedule.horizon === "range";
  const [rangeStart, setRangeStart] = useState(rangeActive ? schedule.start || "" : "");
  const [rangeEnd, setRangeEnd] = useState(rangeActive ? schedule.end || "" : "");

  const week = currentPeriod("week", settings);
  const nextWeek = nextPeriod(week, settings);
  const month = currentPeriod("month", settings);
  const nextMonth = nextPeriod(month, settings);
  const id = (suffix: string) => `${testIdPrefix}-${suffix}`;
  const horizonActive = (horizon: "week" | "month", period: Period) =>
    schedule.mode === "horizon" && schedule.horizon === horizon && schedule.start === period.start && schedule.end === period.end;

  const commit = (input: Parameters<typeof commitSchedule>[0] | null, meta?: ScheduleSaveMeta) => {
    if (!canEdit || !input) return;
    const patch = commitSchedule(input);
    if (patch) save(patch, meta);
  };

  const chooseDay = (ymd: string | null) => {
    if (!canEdit) return;
    if (!ymd) {
      commit({ mode: "none" });
      setOpenSection(null);
      return;
    }
    commit(dayOrClock(ymd, timePart));
    setOpenSection(null);
  };

  const choosePeriod = (kind: "week" | "next-week" | "month" | "next-month") => {
    commit(periodChoice(kind, settings));
    setOpenSection(null);
  };

  const applyRange = (start: string, end: string) => {
    const input = rangeChoice(start, end, settings, true);
    if (!input) return;
    commit(input, input.mode === "day" ? { keepOpen: true } : undefined);
  };

  const applyTime = (hhmm: string) => {
    if (!workDay || !hhmm) return;
    commit(dayOrClock(workDay, hhmm));
  };
  const clearTime = () => {
    if (!workDay) return;
    commit({ mode: "day", date: workDay });
  };

  const toggle = (key: ScheduleSection) => {
    if (!canEdit) return;
    if (key === "time") setTimeDraft(timePart || "09:00");
    setOpenSection((cur) => (cur === key ? null : key));
  };

  const periods: Array<{ key: "week" | "next-week" | "month" | "next-month"; label: string; period: Period; horizon: "week" | "month" }> = [
    { key: "week", label: T("این هفته", "This week"), period: week, horizon: "week" },
    { key: "next-week", label: T("هفتهٔ بعد", "Next week"), period: nextWeek, horizon: "week" },
    { key: "month", label: T("این ماه", "This month"), period: month, horizon: "month" },
    { key: "next-month", label: T("ماه بعد", "Next month"), period: nextMonth, horizon: "month" },
  ];

  return (
    <>
      <PropRow icon={CalendarDays} label={T("امروز", "Today")} active={isToday} disabled={!canEdit}
        onClick={() => chooseDay(todayKey)} testid={id("quick-today")} />
      <PropRow icon={CalendarDays} label={T("فردا", "Tomorrow")} active={isTomorrow} disabled={!canEdit}
        onClick={() => chooseDay(tomorrowKey)} testid={id("quick-tomorrow")} />
      {periods.map((row) => (
        <PropRow key={row.key} icon={CalendarRange} label={row.label} active={horizonActive(row.horizon, row.period)} disabled={!canEdit}
          onClick={() => choosePeriod(row.key)} testid={id(`quick-${row.key}`)} />
      ))}
      <PropRow icon={CalendarDays}
        label={workDay && !isToday && !isTomorrow ? formatTaskDueDateDisplay(workDay, isEn) : T("انتخاب تاریخ…", "Pick a date…")}
        summary={rangeActive && schedule.start && schedule.end ? `${formatTaskDueDateDisplay(schedule.start, isEn)} – ${formatTaskDueDateDisplay(schedule.end, isEn)}` : undefined}
        active={(!!workDay && !isToday && !isTomorrow) || rangeActive} open={openSection === "date"}
        onClick={() => toggle("date")} disabled={!canEdit} testid={id("pick-date")} />
      {openSection === "date" && canEdit && (
        <>
          <InlineDatePicker value={workDay || ""} isEn={isEn} onSelect={chooseDay} />
          <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 p-1.5" data-testid={id("range")}>
            <Input type="date" className="h-8 flex-1 text-xs" disabled={!canEdit} value={rangeStart}
              aria-label={T("شروع", "Start")} data-testid={id("range-start")}
              onChange={(e) => { setRangeStart(e.target.value); applyRange(e.target.value, rangeEnd); }} />
            <Input type="date" className="h-8 flex-1 text-xs" disabled={!canEdit} value={rangeEnd}
              aria-label={T("پایان", "End")} data-testid={id("range-end")}
              onChange={(e) => { setRangeEnd(e.target.value); applyRange(rangeStart, e.target.value); }} />
          </div>
        </>
      )}

      {canEdit && (
        <>
          <PropRow icon={Clock} label={T("ساعت دقیق", "Time")} summary={timePart || T("بدون ساعت", "No time")} open={openSection === "time"}
            onClick={() => toggle("time")} disabled={!canEdit} testid={id("time")} />
          {openSection === "time" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 p-1.5" data-testid={id("time-body")}>
              <Input type="time" className="h-8 flex-1 text-xs" disabled={!canEdit || !workDay}
                aria-label={T("ساعت دقیق", "Time")} value={timeDraft}
                onChange={(e) => setTimeDraft(e.target.value)} />
              <button type="button" onClick={() => timeDraft && applyTime(timeDraft)} disabled={!canEdit || !timeDraft || !workDay}
                className="h-9 rounded-md bg-primary px-3 text-xs text-primary-foreground disabled:opacity-50" data-testid={id("time-apply")}>
                {T("ثبت", "Apply")}
              </button>
              <button type="button" onClick={clearTime} disabled={!canEdit || !workDay}
                className="h-8 shrink-0 rounded-md px-2 text-[11px] text-muted-foreground transition hover:text-destructive disabled:opacity-50">
                {T("حذف ساعت", "No time")}
              </button>
            </div>
          )}
        </>
      )}

      {schedule.mode !== "none" && (
        <button type="button" onClick={() => chooseDay(null)} disabled={!canEdit}
          className="min-h-10 w-full rounded-lg px-2.5 text-start text-xs text-muted-foreground hover:text-destructive"
          data-testid={testIdPrefix === "schedule" ? "schedule-clear-date" : `${testIdPrefix}-clear`}>
          {T("حذف تاریخ", "Clear date")}
        </button>
      )}
    </>
  );
}
