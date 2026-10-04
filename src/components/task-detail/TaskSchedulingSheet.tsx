import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DueDatePicker } from "@/components/DueDatePicker";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { InlineDatePicker } from "@/components/InlineDatePicker";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { taskWorkDate, workDatePatch, deadlinePatch, formatTaskDueDateDisplay, getLocalDateString } from "@/lib/taskDate";
import { kindLabel, bucketLabel } from "@/lib/timeBuckets";
import { describeRule } from "@/lib/recurrence";
import { AlarmClock, Bell, CalendarDays, Check, ChevronDown, Clock, Repeat, Sunrise, Timer } from "lucide-react";

export interface TaskScheduleBodyProps {
  t: Task;
  canEdit: boolean;
  save: (patch: Partial<Task>) => void;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
}

type ScheduleSection = "date" | "time" | "repeat" | "reminder" | "deadline" | "bucket" | "block";

/** One quiet, uniform row — the exact list language of the tags/folder panels. */
function PropRow({ icon: Icon, label, summary, active, open, onClick, disabled, testid }: {
  icon: any; label: string; summary?: string | null; active?: boolean; open?: boolean;
  onClick: () => void; disabled?: boolean; testid?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      aria-pressed={open === undefined ? Boolean(active) : undefined}
      aria-expanded={open === undefined ? undefined : open}
      data-testid={testid}
      className={`flex min-h-9 w-full items-center gap-2 rounded-lg px-2.5 text-xs transition disabled:cursor-not-allowed disabled:opacity-50 ${active ? "bg-primary/10" : "hover:bg-muted/60"}`}>
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

/** Compact scheduling panel — one quiet, uniform list; details fold open on demand. */
export function TaskScheduleBody({ t, canEdit, save, postpone, T, isEn }: TaskScheduleBodyProps) {
  const [openSection, setOpenSection] = useState<ScheduleSection | null>(null);
  const toggle = (key: ScheduleSection) => setOpenSection((cur) => (cur === key ? null : key));

  const workDate = taskWorkDate(t);
  const workDay = workDate ? workDate.slice(0, 10) : null;
  const todayKey = getLocalDateString();
  const tomorrowKey = getLocalDateString(new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() + 1));
  const isToday = workDay === todayKey;
  const isTomorrow = workDay === tomorrowKey;
  const timePart = workDate && workDate.includes("T") ? workDate.slice(11, 16) : null;
  const deadlineValue = t.work_date === undefined ? null : (t.due_date || null);
  const reminderOn = !!(t.reminder_plan || t.reminder_at);
  const repeatSummary = t.recurrence_rule ? describeRule(t.recurrence_rule, isEn) : T("بدون تکرار", "Does not repeat");
  const blockSummary = [t.start_at || t.end_at ? T("تنظیم‌شده", "Set") : null, t.estimated_minutes ? `${t.estimated_minutes} ${T("دقیقه", "min")}` : null].filter(Boolean).join(" · ") || null;
  const bucketSummary = t.bucket_kind
    ? `${kindLabel(t.bucket_kind, isEn ? "en" : "fa")}${t.bucket_anchor ? ` · ${bucketLabel(t.bucket_kind, (t.bucket_calendar as any) || "gregorian", t.bucket_anchor, isEn ? "en" : "fa")}` : ""}`
    : null;
  const applyTime = (hhmm: string) => {
    const base = workDay || todayKey;
    const [y, m, d] = base.split("-").map(Number);
    const [h, min] = hhmm.split(":").map(Number);
    save(workDatePatch(t, new Date(y, m - 1, d, h, min).toISOString()));
  };
  const clearTime = () => { if (workDay) save(workDatePatch(t, workDay)); };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-0.5" data-testid="task-schedule-body">
      {/* Work day — one quick list; a pick closes the panel (tag behaviour) */}
      <PropRow icon={CalendarDays} label={T("امروز", "Today")} active={isToday} disabled={!canEdit}
        onClick={() => save(workDatePatch(t, todayKey))} testid="schedule-quick-today" />
      <PropRow icon={CalendarDays} label={T("فردا", "Tomorrow")} active={isTomorrow} disabled={!canEdit}
        onClick={() => save(workDatePatch(t, tomorrowKey))} testid="schedule-quick-tomorrow" />
      {workDay && !isToday && !isTomorrow && (
        <PropRow icon={CalendarDays} label={formatTaskDueDateDisplay(workDay, isEn)} active open={openSection === "date"}
          onClick={() => toggle("date")} disabled={!canEdit} testid="schedule-custom-date" />
      )}
      <PropRow icon={CalendarDays} label={T("انتخاب تاریخ…", "Pick a date…")} open={openSection === "date"}
        onClick={() => toggle("date")} disabled={!canEdit} testid="schedule-pick-date" />
      {openSection === "date" && canEdit && (
        <InlineDatePicker value={workDay} isEn={isEn}
          onSelect={(ymd) => { save(workDatePatch(t, ymd)); setOpenSection(null); }} />
      )}

      {/* Time — only meaningful once a day is set */}
      {workDay && (
        <>
          <PropRow icon={Clock} label={T("ساعت", "Time")} summary={timePart || T("بدون ساعت", "No time")} open={openSection === "time"}
            onClick={() => toggle("time")} disabled={!canEdit} testid="schedule-time" />
          {openSection === "time" && (
            <div className="flex items-center gap-1.5 rounded-lg bg-muted/40 p-1.5" data-testid="schedule-time-body">
              <Input type="time" className="h-8 flex-1 text-xs" disabled={!canEdit} value={timePart || "09:00"}
                onChange={(e) => e.target.value && applyTime(e.target.value)} />
              <button type="button" onClick={clearTime} disabled={!canEdit}
                className="h-8 shrink-0 rounded-md px-2 text-[11px] text-muted-foreground transition hover:text-destructive disabled:opacity-50">
                {T("حذف ساعت", "No time")}
              </button>
            </div>
          )}
        </>
      )}

      <div className="my-1.5 border-t border-border/60" />
      {/* Details — folded until asked, one at a time */}
      <PropRow icon={Repeat} label={T("تکرار", "Repeat")} summary={repeatSummary} open={openSection === "repeat"}
        onClick={() => toggle("repeat")} disabled={!canEdit} testid="schedule-repeat" />
      {openSection === "repeat" && (
        <div className="rounded-lg bg-muted/40 p-1.5" data-testid="schedule-repeat-body">
          <RecurrenceEditor value={t.recurrence_rule || null}
            onChange={(rule) => save({ recurrence_rule: rule, recurrence: rule ? (rule.freq as any) : "none" })}
            defaultTime={timePart} />
        </div>
      )}
      <PropRow icon={Bell} label={T("یادآور", "Reminder")} summary={reminderOn ? T("روشن", "On") : T("خاموش", "Off")} open={openSection === "reminder"}
        onClick={() => toggle("reminder")} disabled={!canEdit} testid="schedule-reminder" />
      {openSection === "reminder" && (
        <div className="rounded-lg bg-muted/40 p-1.5" data-testid="schedule-reminder-body">
          <DueDatePicker dateControls={false} label="" value={workDate} reminderValue={t.reminder_at} reminderPlan={t.reminder_plan}
            onReminderPlanChange={(plan) => save({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
            onReminderChange={(iso) => save({ reminder_at: iso })}
            onChange={() => {}} />
        </div>
      )}
      <PropRow icon={AlarmClock} label={T("مهلت نهایی", "Deadline")}
        summary={deadlineValue ? formatTaskDueDateDisplay(deadlineValue, isEn) : null}
        open={openSection === "deadline"} onClick={() => toggle("deadline")} disabled={!canEdit} testid="schedule-deadline" />
      {openSection === "deadline" && canEdit && (
        <InlineDatePicker value={deadlineValue ? deadlineValue.slice(0, 10) : null} isEn={isEn}
          onSelect={(ymd) => { save(deadlinePatch(t, ymd)); setOpenSection(null); }} />
      )}
      <PropRow icon={Sunrise} label={T("بخش روز", "Part of day")} summary={bucketSummary} open={openSection === "bucket"}
        onClick={() => toggle("bucket")} disabled={!canEdit} testid="schedule-bucket" />
      {openSection === "bucket" && (
        <div className="rounded-lg bg-muted/40 p-1.5" data-testid="schedule-bucket-body">
          <BucketPickerBody subDayOnly
            value={{ kind: (t.bucket_kind as any) || null, calendar: (t.bucket_calendar as any) || null, anchor: (t.bucket_anchor as any) || null }}
            onChange={(v) => save({ bucket_kind: v.kind, bucket_calendar: v.calendar, bucket_anchor: v.anchor } as any)}
            onPickTimeOfDay={(hour) => { const d = new Date(); d.setHours(hour, 0, 0, 0); save({ due_date: d.toISOString() } as any); }}
          />
        </div>
      )}
      <PropRow icon={Timer} label={T("بازهٔ زمانی", "Time block")} summary={blockSummary} open={openSection === "block"}
        onClick={() => toggle("block")} disabled={!canEdit} testid="schedule-block" />
      {openSection === "block" && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-1.5" data-testid="schedule-block-body">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[10px] text-muted-foreground">
              {T("شروع", "Start")}
              <Input type="datetime-local" className="mt-1 h-8 text-xs" disabled={!canEdit} value={t.start_at ? t.start_at.slice(0, 16) : ""}
                onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
            </label>
            <label className="text-[10px] text-muted-foreground">
              {T("پایان", "End")}
              <Input type="datetime-local" className="mt-1 h-8 text-xs" disabled={!canEdit} value={t.end_at ? t.end_at.slice(0, 16) : ""}
                onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="whitespace-nowrap text-[10px] text-muted-foreground">{T("تخمین (دقیقه)", "Estimate (min)")}</span>
            <Input type="number" placeholder="—" disabled={!canEdit} value={t.estimated_minutes ?? ""}
              onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
              className="h-7 w-16 text-xs" data-testid="schedule-estimate" />
            <div className="flex gap-1">
              {[15, 30, 60].map((m) => (
                <button key={m} type="button" disabled={!canEdit} onClick={() => save({ estimated_minutes: m } as any)}
                  className={`h-7 rounded-md px-2 text-xs transition ${t.estimated_minutes === m ? "bg-primary text-primary-foreground" : "bg-muted/60 hover:bg-muted"}`}>
                  {isEn ? m : toPersianDigits(m)}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="my-1.5 border-t border-border/60" />

      {/* Postpone — one slim chip row */}
      <div className="flex items-center gap-1.5 px-2.5 pt-0.5" data-testid="schedule-postpone-row">
        <span className="shrink-0 text-[10px] text-muted-foreground">{T("عقب انداختن", "Postpone")}</span>
        <div className="flex flex-wrap gap-1">
          {[1, 3, 7].map((d) => (
            <button key={d} type="button" disabled={!canEdit} onClick={() => postpone(d)}
              className="h-7 rounded-md bg-muted/60 px-2.5 text-[11px] transition hover:bg-muted disabled:opacity-50" data-testid={`postpone-${d}`}>
              {d === 1 ? T("فردا", "Tomorrow") : d === 3 ? T("۳ روز بعد", "In 3 days") : T("هفتهٔ بعد", "Next week")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
