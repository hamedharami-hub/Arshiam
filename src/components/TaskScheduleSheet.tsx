import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarRange } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { DueDatePicker } from "@/components/DueDatePicker";
import { TaskPlanningBody } from "@/components/TaskPlanningPicker";
import type { Task } from "@/lib/taskTypes";
import { taskWorkDate, workDatePatch, deadlinePatch } from "@/lib/taskDate";

type Props = {
  task: Task;
  onPatch: (patch: Partial<Task>) => void;
  children: ReactNode;
  initialTab?: "date" | "planning";
};

/** The same scheduling surface for task rows, regardless of their parent view. */
export function TaskScheduleSheet({ task, onPatch, children, initialTab = "date" }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const { i18n } = useTranslation();
  const en = (i18n.language || "fa").startsWith("en");
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>{children}</SheetTrigger>
    <SheetContent side="bottom" dir={en ? "ltr" : "rtl"} className="max-h-[88dvh] overflow-y-auto rounded-t-3xl p-5 pt-9 sm:mx-auto sm:max-w-2xl" onClick={event => event.stopPropagation()}>
      <SheetTitle className="mb-4">{en ? "Schedule task" : "زمان‌بندی تسک"}</SheetTitle>
      <div className="mb-4 grid grid-cols-2 gap-2 rounded-xl bg-muted/60 p-1">
        <button type="button" onClick={() => setTab("date")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm ${tab === "date" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}><CalendarDays className="h-4 w-4" />{en ? "Day and repeat" : "روز و تکرار"}</button>
        <button type="button" onClick={() => setTab("planning")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm ${tab === "planning" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}><CalendarRange className="h-4 w-4" />{en ? "Planning" : "برنامه‌ریزی"}</button>
      </div>
      {tab === "date" ? <div className="space-y-5">
        <div className="rounded-2xl border p-3"><h3 className="mb-3 text-sm font-semibold">{en ? "Work day · shown in Today" : "روز انجام · نمایش در امروز"}</h3><DueDatePicker
        value={taskWorkDate(task)}
        onChange={work_date => onPatch(workDatePatch(task, work_date))}
        recurrenceValue={task.recurrence_rule || null}
        onRecurrenceChange={rule => onPatch({ recurrence_rule: rule, recurrence: rule ? (rule.freq as Task["recurrence"]) : "none" })}
        reminderValue={task.reminder_at}
        reminderPlan={task.reminder_plan}
        onReminderPlanChange={plan => onPatch({ reminder_plan: plan, reminder_at: plan?.trigger_at ?? null })}
        onReminderChange={reminder_at => onPatch({ reminder_at })}
        label=""
      /></div>
        <div className="rounded-2xl border p-3"><h3 className="mb-3 text-sm font-semibold">{en ? "Deadline · becomes overdue after this day" : "مهلت نهایی · پس از این روز عقب‌افتاده می‌شود"}</h3><DueDatePicker
          value={task.work_date === undefined ? null : task.due_date}
          onChange={due_date => onPatch(deadlinePatch(task, due_date))}
          label=""
        /></div>
      </div> : <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />}
    </SheetContent>
  </Sheet>;
}
