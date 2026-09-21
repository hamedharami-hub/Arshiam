import React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Clock } from "lucide-react";
import { DueDatePicker } from "@/components/DueDatePicker";
import { RecurrenceEditor } from "@/components/RecurrenceEditor";
import { BucketPickerBody } from "@/components/BucketPickerInline";
import type { Task } from "@/lib/taskTypes";

export interface TaskSchedulingSheetProps {
  t: Task;
  scheduleOpen: boolean;
  setScheduleOpen: (open: boolean) => void;
  canEdit: boolean;
  isScheduled: boolean;
  scheduleLabel: string | null;
  hasTimeBlock: boolean;
  save: (patch: Partial<Task>) => void;
  postpone: (days: number) => void;
  T: (fa: string, en: string) => string;
}

export function TaskSchedulingSheet({
  t,
  scheduleOpen,
  setScheduleOpen,
  canEdit,
  isScheduled,
  scheduleLabel,
  hasTimeBlock,
  save,
  postpone,
  T,
}: TaskSchedulingSheetProps) {
  return (
    <Sheet open={scheduleOpen} onOpenChange={setScheduleOpen}>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={!canEdit}
          title={scheduleLabel ?? T("زمان‌بندی", "Schedule")}
          aria-label={scheduleLabel ?? T("زمان‌بندی", "Schedule")}
          className={`w-full min-w-0 h-9 rounded-xl relative flex items-center justify-center px-1 transition-all duration-150 ${
            isScheduled
              ? "bg-primary/15 text-primary border-primary/35 shadow-2xs font-semibold"
              : "bg-muted/30 text-foreground/80 hover:bg-muted/60 border-border/60"
          }`}
        >
          <Clock className={`w-4 h-4 shrink-0 ${isScheduled ? "text-primary" : "text-muted-foreground"}`} />
          {isScheduled && (
            <span className="absolute top-1.5 end-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </Button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className="w-full max-w-2xl mx-auto rounded-t-2xl p-4 max-h-[85vh] overflow-y-auto"
        aria-describedby="schedule-sheet-desc"
      >
        <SheetHeader className="mb-3">
          <SheetTitle className="text-base">{T("زمان‌بندی تسک", "Task schedule")}</SheetTitle>
        </SheetHeader>
        <Tabs defaultValue="date">
          <TabsList className="grid grid-cols-4 w-full mb-2">
            <TabsTrigger value="date" className="text-[11px] px-1 relative">
              {T("تاریخ", "Date")}
              {(t.due_date || t.reminder_at) && (
                <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="block" className="text-[11px] px-1 relative">
              {T("تایم‌بلاک", "Block")}
              {hasTimeBlock && (
                <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="repeat" className="text-[11px] px-1 relative">
              {T("تکرار", "Repeat")}
              {t.recurrence_rule && (
                <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
            <TabsTrigger value="bucket" className="text-[11px] px-1 relative">
              {T("بازه", "Bucket")}
              {t.bucket_kind && (
                <span className="absolute top-1 end-1 w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="date" className="mt-0 space-y-3">
            <DueDatePicker
              label=""
              value={t.due_date}
              reminderValue={t.reminder_at}
              onReminderChange={(iso) => save({ reminder_at: iso })}
              onChange={(iso) => save({ due_date: iso })}
            />
            <div className="border-t pt-2">
              <label className="text-[10px] text-muted-foreground mb-1.5 block">
                {T("به تعویق انداختن", "Postpone")}
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[1, 3, 7].map((d) => (
                  <Button
                    key={d}
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs px-2.5"
                    onClick={() => postpone(d)}
                  >
                    {d === 1
                      ? T("فردا", "Tomorrow")
                      : d === 3
                        ? T("۳ روز دیگر", "+3 days")
                        : T("هفته آینده", "Next week")}
                  </Button>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="block" className="mt-0 space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground">{T("شروع", "Start")}</label>
                <Input
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={t.start_at ? t.start_at.slice(0, 16) : ""}
                  onChange={(e) =>
                    save({
                      start_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    } as any)
                  }
                />
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground">{T("پایان", "End")}</label>
                <Input
                  type="datetime-local"
                  className="h-9 text-xs"
                  value={t.end_at ? t.end_at.slice(0, 16) : ""}
                  onChange={(e) =>
                    save({
                      end_at: e.target.value ? new Date(e.target.value).toISOString() : null,
                    } as any)
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <label className="text-[10px] text-muted-foreground whitespace-nowrap">
                {T("تخمین (دقیقه):", "Estimate:")}
              </label>
              <Input
                type="number"
                placeholder="—"
                value={t.estimated_minutes ?? ""}
                onChange={(e) =>
                  save({
                    estimated_minutes: e.target.value ? Number(e.target.value) : null,
                  } as any)
                }
                className="h-8 w-20 text-xs"
              />
              <div className="flex gap-1">
                {[15, 30, 60].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => save({ estimated_minutes: m } as any)}
                    className={`px-2 h-7 text-[10px] rounded-lg border ${
                      t.estimated_minutes === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-accent"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="repeat" className="mt-0">
            <RecurrenceEditor
              value={t.recurrence_rule}
              onChange={(rule) => save({ recurrence_rule: rule } as any)}
            />
          </TabsContent>
          <TabsContent value="bucket" className="mt-0">
            <p className="text-[10px] text-muted-foreground mb-1.5 px-1">
              {T(
                "بدون زمان دقیق — فقط بازه‌ای که کار باید توش انجام بشه.",
                "Fuzzy schedule — pick a period instead of an exact time.",
              )}
            </p>
            <BucketPickerBody
              value={{
                kind: (t.bucket_kind as any) || null,
                calendar: (t.bucket_calendar as any) || null,
                anchor: (t.bucket_anchor as any) || null,
              }}
              onChange={(v) =>
                save({
                  bucket_kind: v.kind,
                  bucket_calendar: v.calendar,
                  bucket_anchor: v.anchor,
                } as any)
              }
              onPickTimeOfDay={(hour) => {
                const d = new Date();
                d.setHours(hour, 0, 0, 0);
                save({ due_date: d.toISOString() } as any);
              }}
            />
          </TabsContent>
        </Tabs>
        <p id="schedule-sheet-desc" className="sr-only">
          {T("زمان‌بندی تسک", "Task scheduling")}
        </p>
      </SheetContent>
    </Sheet>
  );
}
