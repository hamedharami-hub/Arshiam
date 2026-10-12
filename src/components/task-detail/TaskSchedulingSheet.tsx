import { useState } from "react";
import { DueDatePicker } from "@/components/DueDatePicker";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import type { Task } from "@/lib/taskTypes";
import { describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { Bell, Repeat } from "lucide-react";
import { PropRow, ScheduleChoiceList } from "./ScheduleChoiceList";
import type { ScheduleSaveMeta } from "@/lib/taskScheduleChoices";

export interface TaskScheduleBodyProps {
  t: Task;
  canEdit: boolean;
  save: (patch: Partial<Task>, meta?: ScheduleSaveMeta) => void;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
}

type ScheduleSection = "repeat" | "reminder";

/** Compact scheduling panel — one quiet, uniform list; details fold open on demand. */
export function TaskScheduleBody({ t, canEdit, save, postpone, T, isEn }: TaskScheduleBodyProps) {
  const [openSection, setOpenSection] = useState<ScheduleSection | null>(null);
  const [repeatDraft, setRepeatDraft] = useState<RecurrenceRule | null>(t.recurrence_rule || null);
  const timePart = t.work_date?.includes("T") ? t.work_date.slice(t.work_date.indexOf("T") + 1, t.work_date.indexOf("T") + 6) : null;

  const toggle = (key: ScheduleSection) => {
    if (!canEdit) return;
    if (key === "repeat") setRepeatDraft(t.recurrence_rule || null);
    setOpenSection((cur) => (cur === key ? null : key));
  };

  const reminderOn = !!(t.reminder_plan || t.reminder_at);
  const repeatSummary = t.recurrence_rule ? describeRule(t.recurrence_rule, isEn) : T("بدون تکرار", "Does not repeat");

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="space-y-0.5" data-testid="task-schedule-body">
      <ScheduleChoiceList task={t} canEdit={canEdit} save={save} T={T} isEn={isEn} />

      <div className="my-1.5 border-t border-border/60" />
      <PropRow icon={Repeat} label={T("تکرار", "Repeat")} summary={repeatSummary} open={openSection === "repeat"}
        onClick={() => toggle("repeat")} disabled={!canEdit} testid="schedule-repeat" />
      {openSection === "repeat" && (
        <div className="rounded-lg bg-muted/40 p-1.5" data-testid="schedule-repeat-body">
          <RecurrenceEditor value={repeatDraft} onChange={setRepeatDraft} defaultTime={timePart} compact />
          <button type="button" onClick={() => save({ recurrence_rule: repeatDraft, recurrence: repeatDraft && repeatDraft.freq !== "yearly" ? repeatDraft.freq : "none" })}
            className="mt-2 h-9 w-full rounded-md bg-primary text-sm text-primary-foreground" data-testid="schedule-repeat-apply">
            {T("ثبت", "Apply")}
          </button>
        </div>
      )}
      <PropRow icon={Bell} label={T("یادآور", "Reminder")} summary={reminderOn ? T("روشن", "On") : T("خاموش", "Off")} open={openSection === "reminder"}
        onClick={() => toggle("reminder")} disabled={!canEdit} testid="schedule-reminder" />
      {openSection === "reminder" && (
        <div className="rounded-lg bg-muted/40 p-1.5" data-testid="schedule-reminder-body">
          <DueDatePicker dateControls={false} label="" value={t.work_date} reminderValue={t.reminder_at} reminderPlan={t.reminder_plan}
            onReminderPlanChange={(plan) => save({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
            onReminderChange={(iso) => save({ reminder_at: iso })}
            onChange={() => {}} />
        </div>
      )}

      <div className="my-1.5 border-t border-border/60" />

      <div className="flex items-center gap-1.5 px-2.5 pt-0.5" data-testid="schedule-postpone-row">
        <span className="shrink-0 text-[10px] text-muted-foreground">{T("عقب انداختن", "Postpone")}</span>
        <div className="flex flex-wrap gap-1">
          {[1, 3, 7].map((d) => (
            <button key={d} type="button" disabled={!canEdit} onClick={() => canEdit && postpone(d)}
              className="h-7 rounded-md bg-muted/60 px-2.5 text-[11px] transition hover:bg-muted disabled:opacity-50" data-testid={`postpone-${d}`}>
              {d === 1 ? T("فردا", "Tomorrow") : d === 3 ? T("۳ روز بعد", "In 3 days") : T("هفتهٔ بعد", "Next week")}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
