import React from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { DueDatePicker } from "@/components/DueDatePicker";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";

export interface TaskScheduleBodyProps {
  t: Task;
  canEdit: boolean;
  hasTimeBlock: boolean;
  save: (patch: Partial<Task>) => void;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
  isEn: boolean;
}

const Dot = () => <span className="absolute top-1 end-1 h-1.5 w-1.5 rounded-full bg-primary" />;

/** Date, reminder, repeat, postpone, time block and part-of-day — rendered inline under the task header. */
export function TaskScheduleBody({ t, canEdit, hasTimeBlock, save, postpone, T, isEn }: TaskScheduleBodyProps) {
  const label = "mb-1.5 block text-xs text-muted-foreground";
  return (
    <Tabs defaultValue="date" dir={isEn ? "ltr" : "rtl"} data-testid="task-schedule-body">
      <TabsList className="mb-3 grid h-8 w-full grid-cols-3 rounded-lg bg-muted/60 p-0.5">
        <TabsTrigger value="date" className="relative px-1 text-xs" data-testid="schedule-tab-date">
          {T("تاریخ و تکرار", "Date & repeat")}{(t.due_date || t.reminder_at || t.recurrence_rule) && <Dot />}
        </TabsTrigger>
        <TabsTrigger value="block" className="relative px-1 text-xs" data-testid="schedule-tab-block">
          {T("بازهٔ زمانی", "Time block")}{hasTimeBlock && <Dot />}
        </TabsTrigger>
        <TabsTrigger value="bucket" className="relative px-1 text-xs" data-testid="schedule-tab-bucket">
          {T("بخش روز", "Part of day")}{t.bucket_kind && <Dot />}
        </TabsTrigger>
      </TabsList>
      <TabsContent value="date" className="mt-0 space-y-3">
        <DueDatePicker
          label=""
          value={t.due_date}
          recurrenceValue={t.recurrence_rule || null}
          onRecurrenceChange={(rule) => save({ recurrence_rule: rule, recurrence: rule ? (rule.freq as any) : "none" })}
          reminderValue={t.reminder_at}
          reminderPlan={t.reminder_plan}
          onReminderPlanChange={(plan) => save({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
          onReminderChange={(iso) => save({ reminder_at: iso })}
          onChange={(iso) => save({ due_date: iso })}
        />
        <div className="border-t border-border/60 pt-2.5">
          <span className={label}>{T("عقب انداختن", "Postpone")}</span>
          <div className="flex flex-wrap gap-1.5">
            {[1, 3, 7].map((d) => (
              <Button key={d} type="button" size="sm" variant="ghost" disabled={!canEdit} className="h-8 bg-muted/50 px-2.5 text-xs" onClick={() => postpone(d)} data-testid={`postpone-${d}`}>
                {d === 1 ? T("فردا", "Tomorrow") : d === 3 ? T("۳ روز بعد", "In 3 days") : T("هفتهٔ بعد", "Next week")}
              </Button>
            ))}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="block" className="mt-0 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-muted-foreground">
            {T("شروع", "Start")}
            <Input type="datetime-local" className="mt-1 h-9 text-xs" disabled={!canEdit} value={t.start_at ? t.start_at.slice(0, 16) : ""}
              onChange={(e) => save({ start_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
          </label>
          <label className="text-xs text-muted-foreground">
            {T("پایان", "End")}
            <Input type="datetime-local" className="mt-1 h-9 text-xs" disabled={!canEdit} value={t.end_at ? t.end_at.slice(0, 16) : ""}
              onChange={(e) => save({ end_at: e.target.value ? new Date(e.target.value).toISOString() : null } as any)} />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="whitespace-nowrap text-xs text-muted-foreground">{T("زمان تخمینی (دقیقه)", "Estimate (min)")}</span>
          <Input type="number" placeholder="—" disabled={!canEdit} value={t.estimated_minutes ?? ""}
            onChange={(e) => save({ estimated_minutes: e.target.value ? Number(e.target.value) : null } as any)}
            className="h-8 w-20 text-xs" data-testid="schedule-estimate" />
          <div className="flex gap-1">
            {[15, 30, 60].map((m) => (
              <button key={m} type="button" disabled={!canEdit} onClick={() => save({ estimated_minutes: m } as any)}
                className={`h-7 rounded-md px-2 text-xs ${t.estimated_minutes === m ? "bg-primary text-primary-foreground" : "bg-muted/50 hover:bg-muted"}`}>
                {isEn ? m : toPersianDigits(m)}
              </button>
            ))}
          </div>
        </div>
      </TabsContent>
      <TabsContent value="bucket" className="mt-0">
        <BucketPickerBody subDayOnly
          value={{ kind: (t.bucket_kind as any) || null, calendar: (t.bucket_calendar as any) || null, anchor: (t.bucket_anchor as any) || null }}
          onChange={(v) => save({ bucket_kind: v.kind, bucket_calendar: v.calendar, bucket_anchor: v.anchor } as any)}
          onPickTimeOfDay={(hour) => { const d = new Date(); d.setHours(hour, 0, 0, 0); save({ due_date: d.toISOString() } as any); }}
        />
      </TabsContent>
    </Tabs>
  );
}
