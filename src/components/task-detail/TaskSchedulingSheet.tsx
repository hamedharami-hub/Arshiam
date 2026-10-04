import { useState } from "react";
import { Input } from "@/components/ui/input";
import { DueDatePicker } from "@/components/DueDatePicker";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { InlineDatePicker } from "@/components/InlineDatePicker";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { taskWorkDate, workDatePatch, deadlinePatch, formatTaskDueDateDisplay } from "@/lib/taskDate";
import { kindLabel, bucketLabel } from "@/lib/timeBuckets";
import { ChevronDown, Clock, Sunrise, Timer, X } from "lucide-react";

export interface TaskScheduleBodyProps {
  t: Task;
  canEdit: boolean;
  save: (patch: Partial<Task>) => void;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
}

/** One compact accordion row — folded sections keep the whole panel minimal. */
function SectionRow({ icon: Icon, label, summary, open, onClick, disabled, testid }: {
  icon: any; label: string; summary?: string | null; open: boolean; onClick: () => void; disabled?: boolean; testid?: string;
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-expanded={open} data-testid={testid}
      className={`flex h-9 w-full items-center gap-2 rounded-lg border border-border/60 px-2.5 text-xs transition hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50 ${open ? "bg-muted/40" : "bg-card"}`}>
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="min-w-0 flex-1 truncate text-start text-foreground/85">
        {label}
        {summary && <span className="ms-2 text-[10px] text-muted-foreground">{summary}</span>}
      </span>
      <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
    </button>
  );
}

/** Compact scheduling panel: work-day picker, one-row deadline and folded time-block / part-of-day sections. */
export function TaskScheduleBody({ t, canEdit, save, postpone, T, isEn }: TaskScheduleBodyProps) {
  const [openSection, setOpenSection] = useState<null | "deadline" | "block" | "bucket">(null);
  const toggleSection = (key: "deadline" | "block" | "bucket") => setOpenSection((cur) => (cur === key ? null : key));
  const deadlineValue = t.work_date === undefined ? null : (t.due_date || null);
  const blockSummary = [t.start_at || t.end_at ? T("تنظیم‌شده", "Set") : null, t.estimated_minutes ? `${t.estimated_minutes} ${T("دقیقه", "min")}` : null].filter(Boolean).join(" · ") || null;
  const bucketSummary = t.bucket_kind
    ? `${kindLabel(t.bucket_kind, isEn ? "en" : "fa")}${t.bucket_anchor ? ` · ${bucketLabel(t.bucket_kind, (t.bucket_calendar as any) || "gregorian", t.bucket_anchor, isEn ? "en" : "fa")}` : ""}`
    : null;
  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-2.5" data-testid="task-schedule-body">
      {/* Work day — quick chips + on-demand calendar + time + repeat + smart reminder */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-foreground/80">{T("روز انجام · نمایش در امروز", "Work day · shown in Today")}</p>
        <DueDatePicker
          label=""
          value={taskWorkDate(t)}
          recurrenceValue={t.recurrence_rule || null}
          onRecurrenceChange={(rule) => save({ recurrence_rule: rule, recurrence: rule ? (rule.freq as any) : "none" })}
          reminderValue={t.reminder_at}
          reminderPlan={t.reminder_plan}
          onReminderPlanChange={(plan) => save({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
          onReminderChange={(iso) => save({ reminder_at: iso })}
          onChange={(iso) => save(workDatePatch(t, iso))}
        />
      </div>

      {/* Deadline — a single row; the compact calendar appears only on demand */}
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => toggleSection("deadline")} disabled={!canEdit} aria-expanded={openSection === "deadline"}
            className={`flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border px-2.5 text-xs transition hover:bg-muted/60 disabled:opacity-50 ${deadlineValue ? "border-rose-500/25 bg-rose-500/5 text-rose-700 dark:text-rose-300" : "border-dashed border-border/60 text-muted-foreground"}`}
            data-testid="schedule-deadline-row">
            <Clock className="h-3.5 w-3.5 shrink-0" />
            <span className="min-w-0 flex-1 truncate text-start">{deadlineValue ? formatTaskDueDateDisplay(deadlineValue, isEn) : T("افزودن مهلت نهایی", "Add deadline")}</span>
            <ChevronDown className={`h-3.5 w-3.5 shrink-0 transition-transform ${openSection === "deadline" ? "rotate-180" : ""}`} />
          </button>
          {deadlineValue && (
            <button type="button" onClick={() => { save(deadlinePatch(t, null)); setOpenSection(null); }} disabled={!canEdit}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 text-muted-foreground transition hover:text-destructive disabled:opacity-50"
              aria-label={T("حذف مهلت", "Clear deadline")} data-testid="schedule-deadline-clear">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        {openSection === "deadline" && canEdit && (
          <InlineDatePicker value={deadlineValue ? deadlineValue.slice(0, 10) : null} isEn={isEn}
            onSelect={(ymd) => { save(deadlinePatch(t, ymd)); setOpenSection(null); }} />
        )}
      </div>

      {/* Folded sections — open only when needed */}
      <div className="space-y-1.5 border-t border-border/60 pt-2.5">
        <SectionRow icon={Timer} label={T("بازهٔ زمانی", "Time block")} summary={blockSummary} open={openSection === "block"} onClick={() => toggleSection("block")} disabled={!canEdit} testid="schedule-block-row" />
        {openSection === "block" && (
          <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-2" data-testid="schedule-block-body">
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
                    className={`h-7 rounded-md px-2 text-xs transition ${t.estimated_minutes === m ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                    {isEn ? m : toPersianDigits(m)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        <SectionRow icon={Sunrise} label={T("بخش روز", "Part of day")} summary={bucketSummary} open={openSection === "bucket"} onClick={() => toggleSection("bucket")} disabled={!canEdit} testid="schedule-bucket-row" />
        {openSection === "bucket" && (
          <div className="rounded-lg border border-border/60 bg-muted/20 p-1.5" data-testid="schedule-bucket-body">
            <BucketPickerBody subDayOnly
              value={{ kind: (t.bucket_kind as any) || null, calendar: (t.bucket_calendar as any) || null, anchor: (t.bucket_anchor as any) || null }}
              onChange={(v) => save({ bucket_kind: v.kind, bucket_calendar: v.calendar, bucket_anchor: v.anchor } as any)}
              onPickTimeOfDay={(hour) => { const d = new Date(); d.setHours(hour, 0, 0, 0); save({ due_date: d.toISOString() } as any); }}
            />
          </div>
        )}
      </div>

      {/* Postpone — one compact chip row */}
      <div className="flex items-center gap-1.5 pt-0.5" data-testid="schedule-postpone-row">
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
