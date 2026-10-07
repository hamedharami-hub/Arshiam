import { useCallback, useEffect, useRef, useState } from "react";
import {
  Ban, Bell, BellOff, Check, Clock, Repeat, SlidersHorizontal, X,
} from "lucide-react";
import { DueDatePicker } from "@/components/DueDatePicker";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { InlineDatePicker } from "@/components/InlineDatePicker";
import { TimeWheel } from "@/components/TimeWheel";
import { IconTip } from "./IconTip";
import { TaskPlanningBody } from "@/components/TaskPlanningPicker";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { taskWorkDate, workDatePatch } from "@/lib/taskDate";
import { describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { dateTimeSchedule, readSchedule } from "@/lib/taskSchedule";
import { TaskDeadlineControl } from "./TaskDeadlineControl";

export interface TaskScheduleBodyProps {
  t: Task;
  canEdit: boolean;
  save: (patch: Partial<Task>) => void | Promise<unknown>;
  /** Kept for API compatibility with the task header; the quick day buttons replace the old postpone chips. */
  postpone?: (days: number) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
  /** Called when the intent is complete (a day was chosen, or the check button was pressed). */
  onDone?: () => void;
}

type SubPanel = "time" | "repeat" | "custom-repeat" | "reminder" | null;
type RepeatKey = "none" | "daily" | "weekly" | "monthly" | "yearly" | "custom";

const REPEAT_KEYS: Array<{ key: Exclude<RepeatKey, "none" | "custom">; fa: string; en: string; faLetter: string; enLetter: string }> = [
  { key: "daily", fa: "هر روز", en: "Daily", faLetter: "ر", enLetter: "D" },
  { key: "weekly", fa: "هر هفته", en: "Weekly", faLetter: "ه", enLetter: "W" },
  { key: "monthly", fa: "هر ماه", en: "Monthly", faLetter: "م", enLetter: "M" },
  { key: "yearly", fa: "هر سال", en: "Yearly", faLetter: "س", enLetter: "Y" },
];

function repeatKeyOf(rule: RecurrenceRule | null | undefined): RepeatKey {
  if (!rule) return "none";
  const simple = (rule.interval || 1) === 1 && !(rule.byweekday && rule.byweekday.length);
  return simple ? rule.freq : "custom";
}

/** A quiet icon + value row (no heading text). */
function ValueRow({ icon: Icon, value, placeholder, open, disabled, onClick, onClear, clearLabel, testid, clearTestid, active }: {
  icon: any; value: string | null; placeholder?: string; open: boolean; disabled?: boolean; active?: boolean;
  onClick: () => void; onClear?: () => void; clearLabel?: string; testid: string; clearTestid?: string;
}) {
  return (
    <div className={`flex min-h-10 items-center gap-1 rounded-xl transition-colors ${open ? "bg-[hsl(var(--rose-gold)/0.08)]" : ""}`}>
      <button type="button" onClick={onClick} disabled={disabled} aria-expanded={open} data-testid={testid}
        className="flex min-h-10 min-w-0 flex-1 items-center gap-2.5 rounded-xl px-2.5 text-start transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-40">
        <Icon className={`h-[18px] w-[18px] shrink-0 ${active || open ? "text-[hsl(var(--rose-gold))]" : "text-muted-foreground"}`} strokeWidth={1.6} />
        <span className={`min-w-0 flex-1 truncate text-sm tabular-nums ${value ? "font-medium text-foreground" : "text-muted-foreground/60"}`}>
          <bdi>{value || placeholder || "—"}</bdi>
        </span>
      </button>
      {onClear && value && !disabled && (
        <button type="button" onClick={onClear} aria-label={clearLabel} title={clearLabel} data-testid={clearTestid}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Icon-led "When" panel: quick days, a month calendar, then time / repeat / reminder rows. */
export function TaskScheduleBody({ t, canEdit, save, T, isEn, onDone }: TaskScheduleBodyProps) {
  const [sub, setSub] = useState<SubPanel>(null);
  const [invalidLocalTime, setInvalidLocalTime] = useState(false);
  const [scheduleSaveError, setScheduleSaveError] = useState(false);
  const toggleSub = (key: Exclude<SubPanel, null>) => setSub((cur) => (cur === key ? null : key));
  const fa = !isEn;
  const num = (s: string) => (fa ? toPersianDigits(s) : s);

  const schedule = readSchedule(t);
  const workDate = taskWorkDate(t);
  const workDay = schedule.kind === "day" || schedule.kind === "datetime" ? schedule.date : null;
  const clockDate = schedule.kind === "datetime" ? new Date(schedule.at) : null;
  const timePart = clockDate && !Number.isNaN(clockDate.getTime())
    ? `${String(clockDate.getHours()).padStart(2, "0")}:${String(clockDate.getMinutes()).padStart(2, "0")}`
    : null;

  const compose = (ymd: string, hhmm: string | null) => {
    const schedule = dateTimeSchedule(ymd, hhmm);
    if (schedule.kind === "datetime") return schedule.at;
    if (schedule.kind === "day") return schedule.date;
    throw new Error("A selected day must produce a day or datetime schedule");
  };
  const timeSaver = useRef<number | null>(null);
  const timeIntent = useRef(0);
  const pendingTime = useRef<{ intent: number; taskId: string; day: string; workDate: string | null; hhmm: string } | null>(null);
  const currentTarget = useRef({ taskId: t.id, workDay, workDate, canEdit });
  currentTarget.current = { taskId: t.id, workDay, workDate, canEdit };
  const currentTask = useRef(t);
  currentTask.current = t;
  const saveRef = useRef(save);
  saveRef.current = save;
  const cancelPendingTime = useCallback(() => {
    timeIntent.current += 1;
    pendingTime.current = null;
    if (timeSaver.current !== null) {
      window.clearTimeout(timeSaver.current);
      timeSaver.current = null;
    }
  }, []);
  useEffect(() => cancelPendingTime, [cancelPendingTime, t.id, workDay, workDate, canEdit]);

  // Choosing a day keeps the panel open so a time can follow; the check button closes it.
  const pickDay = async (ymd: string | null) => {
    if (!canEdit) return;
    cancelPendingTime();
    let selectedDate: string | null;
    let preservedDayAfterDstGap = false;
    try {
      selectedDate = ymd ? compose(ymd, timePart) : null;
    } catch {
      // Keep the selected day, but do not silently roll the previously chosen
      // clock forward across a daylight-saving gap.
      if (!ymd) return;
      selectedDate = ymd;
      preservedDayAfterDstGap = true;
    }
    const taskId = t.id;
    setScheduleSaveError(false);
    try {
      const result = await save(workDatePatch(t, selectedDate));
      if (result === "failed") throw new Error("Schedule save failed");
      if (currentTarget.current.taskId !== taskId) return;
      setInvalidLocalTime(preservedDayAfterDstGap);
      if (preservedDayAfterDstGap) setSub("time");
      else if (!ymd) setSub(null);
    } catch {
      // Do not claim the fallback day was saved when the write failed. Keep the
      // time panel open so the user can retry the date or choose another time.
      if (currentTarget.current.taskId !== taskId) return;
      setScheduleSaveError(true);
      if (preservedDayAfterDstGap) setSub("time");
    }
  };
  const applyTime = (day: string, hhmm: string) => {
    if (!currentTarget.current.canEdit || !day) return;
    let selectedDate: string;
    try {
      selectedDate = compose(day, hhmm);
    } catch {
      setInvalidLocalTime(true);
      return;
    }
    saveRef.current(workDatePatch(currentTask.current, selectedDate));
    setInvalidLocalTime(false);
  };
  const flushPendingTime = () => {
    const pending = pendingTime.current;
    if (!pending) return;
    const target = currentTarget.current;
    const isCurrent = pending.intent === timeIntent.current
      && target.taskId === pending.taskId
      && target.workDay === pending.day
      && target.workDate === pending.workDate
      && target.canEdit;
    cancelPendingTime();
    if (isCurrent) applyTime(pending.day, pending.hhmm);
  };
  const queueTime = (hhmm: string) => {
    if (!workDay || !canEdit) return;
    cancelPendingTime();
    const intent = timeIntent.current;
    const taskId = t.id;
    const day = workDay;
    const scheduledValue = workDate;
    pendingTime.current = { intent, taskId, day, workDate: scheduledValue, hhmm };
    timeSaver.current = window.setTimeout(() => {
      timeSaver.current = null;
      const target = currentTarget.current;
      const pending = pendingTime.current;
      if (!pending || pending.intent !== intent || intent !== timeIntent.current
        || target.taskId !== taskId || target.workDay !== day || target.workDate !== scheduledValue || !target.canEdit) return;
      pendingTime.current = null;
      applyTime(day, hhmm);
    }, 120);
  };
  const clearTime = () => {
    cancelPendingTime();
    if (workDay) save(workDatePatch(t, workDay));
    setSub((cur) => (cur === "time" ? null : cur));
  };
  const openTime = () => {
    if (!workDay || !canEdit) return;
    if (sub === "time") { setSub(null); return; }
    setSub("time");
  };

  const rule = t.recurrence_rule || null;
  const repeatKey = repeatKeyOf(rule);
  const repeatValue = rule ? describeRule(rule, isEn) : null;
  const setRule = (next: RecurrenceRule | null) => save({ recurrence_rule: next, recurrence: next ? (next.freq as Task["recurrence"]) : "none" });
  const chooseRepeat = (key: RepeatKey) => {
    if (!canEdit) return;
    if (key === "none") { setRule(null); setSub(null); return; }
    if (key === "custom") { if (!rule) setRule({ freq: "daily", interval: 1, ...(timePart ? { byhour: Number(timePart.slice(0, 2)), byminute: Number(timePart.slice(3)) } : {}) }); setSub("custom-repeat"); return; }
    const [h, m] = timePart ? timePart.split(":").map(Number) : [];
    setRule({ freq: key, interval: 1, ...(timePart ? { byhour: h, byminute: m } : {}) });
    setSub("repeat");
  };

  const reminderOn = !!(t.reminder_plan?.enabled || t.reminder_at);
  const reminderTime = (() => {
    const iso = t.reminder_plan?.trigger_at || t.reminder_at;
    const d = iso ? new Date(iso) : null;
    return d && !Number.isNaN(d.getTime()) ? `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : null;
  })();
  const showReminder = !!timePart || reminderOn;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-2.5" data-testid="task-schedule-body">
      {/* One schedule: quick days and periods, a custom range, and clearing */}
      {canEdit && <TaskPlanningBody task={t} onPatch={(patch) => { cancelPendingTime(); save(patch); setSub(null); }} onPickDay={(ymd) => pickDay(ymd)} />}

      {/* Month calendar, always visible */}
      <div className="rounded-xl border border-border/60 p-1.5">
        {canEdit
          ? <InlineDatePicker bare value={workDay} isEn={isEn} onSelect={(ymd) => pickDay(ymd)} />
          : <div className="pointer-events-none opacity-60"><InlineDatePicker bare value={workDay} isEn={isEn} onSelect={() => {}} /></div>}
      </div>

      <div className="space-y-0.5">
        {/* Time */}
        <ValueRow icon={Clock} value={timePart ? num(timePart) : null} open={sub === "time"} active={!!timePart}
          disabled={!canEdit || !workDay} onClick={openTime} onClear={clearTime} clearLabel={T("حذف ساعت", "Clear time")}
          testid="schedule-time" clearTestid="schedule-time-clear" />
        {sub === "time" && workDay && (
          <div className="rounded-xl bg-muted/40 py-2" data-testid="schedule-time-body">
            <TimeWheel value={timePart || "09:00"} fa={fa} onChange={queueTime} />
            {scheduleSaveError && <p role="alert" data-testid="schedule-save-error" className="px-3 pt-1 text-xs text-destructive">
              {T("ذخیره نشد؛ دوباره تلاش کن.", "Could not save. Please try again.")}
            </p>}
            {invalidLocalTime && <p role="alert" data-testid="schedule-invalid-local-time" className="px-3 pt-1 text-xs text-destructive">
              {T("این ساعت محلی در روز انتخاب‌شده وجود ندارد؛ ساعت دیگری انتخاب کن.", "This local time does not exist on the selected day. Choose another time.")}
            </p>}
          </div>
        )}

        {/* Repeat */}
        <ValueRow icon={Repeat} value={repeatValue} open={sub === "repeat" || sub === "custom-repeat"} active={!!rule}
          disabled={!canEdit} onClick={() => setSub((cur) => (cur === "repeat" || cur === "custom-repeat" ? null : "repeat"))}
          testid="schedule-repeat" />
        {(sub === "repeat" || sub === "custom-repeat") && canEdit && (
          <div className="space-y-1.5 rounded-xl bg-muted/40 p-1.5" data-testid="schedule-repeat-body">
            <div className="grid grid-cols-6 gap-1">
              <IconTip label={T("بدون تکرار", "Does not repeat")} active={repeatKey === "none"} pressed={repeatKey === "none"}
                onClick={() => chooseRepeat("none")} testid="repeat-none" className="h-10 w-full">
                <Ban className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </IconTip>
              {REPEAT_KEYS.map((r) => (
                <IconTip key={r.key} label={T(r.fa, r.en)} active={repeatKey === r.key} pressed={repeatKey === r.key}
                  onClick={() => chooseRepeat(r.key)} testid={`repeat-${r.key}`} className="relative h-10 w-full">
                  <Repeat className="h-[18px] w-[18px]" strokeWidth={1.6} />
                  <span className="absolute bottom-0.5 end-1 text-[9px] font-bold leading-none opacity-80">{isEn ? r.enLetter : r.faLetter}</span>
                </IconTip>
              ))}
              <IconTip label={T("سفارشی", "Custom")} active={repeatKey === "custom"} pressed={repeatKey === "custom"}
                onClick={() => chooseRepeat("custom")} testid="repeat-custom" className="h-10 w-full">
                <SlidersHorizontal className="h-[18px] w-[18px]" strokeWidth={1.6} />
              </IconTip>
            </div>
            {(sub === "custom-repeat" || repeatKey === "custom") && (
              <div data-testid="schedule-repeat-custom-body">
                <RecurrenceEditor value={rule} onChange={(next) => setRule(next)} defaultTime={timePart} />
              </div>
            )}
          </div>
        )}

        {/* Reminder — only once a time is set */}
        {showReminder && (
          <>
            <ValueRow icon={reminderOn ? Bell : BellOff} value={reminderOn ? (reminderTime ? num(reminderTime) : T("روشن", "On")) : null}
              open={sub === "reminder"} active={reminderOn} disabled={!canEdit} onClick={() => toggleSub("reminder")}
              testid="schedule-reminder" />
            {sub === "reminder" && canEdit && (
              <div className="rounded-xl bg-muted/40 p-1.5" data-testid="schedule-reminder-body">
                <DueDatePicker dateControls={false} label="" value={workDate} reminderValue={t.reminder_at} reminderPlan={t.reminder_plan}
                  onReminderPlanChange={(plan) => save({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
                  onReminderChange={(iso) => save({ reminder_at: iso })}
                  onChange={() => {}} />
              </div>
            )}
          </>
        )}
      </div>

      {/* Finish */}
      <div className="flex items-start justify-end gap-1">
        {/* A deadline is independent from the one operational schedule above. */}
        <TaskDeadlineControl task={t} canEdit={canEdit} isEn={isEn} T={T} save={(patch) => save(patch)} />
        <IconTip label={T("تأیید", "Done")} onClick={() => { flushPendingTime(); onDone?.(); }} testid="schedule-done" className="h-9 w-12 when-icon-btn--solid">
          <Check className="h-5 w-5" strokeWidth={2} />
        </IconTip>
      </div>
    </div>
  );
}
