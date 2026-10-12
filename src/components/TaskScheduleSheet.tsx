import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarRange } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TaskScheduleBody } from "@/components/task-detail/TaskSchedulingSheet";
import { TaskPlanningBody } from "@/components/TaskPlanningPicker";
import type { Task } from "@/lib/taskTypes";
import { postponeSchedule, type ScheduleSaveMeta } from "@/lib/taskScheduleChoices";

type Props = { task: Task; onPatch: (patch: Partial<Task>) => void; children: ReactNode; initialTab?: "date" | "planning" };

/** Task rows share the same choices as the task detail panel. */
export function TaskScheduleSheet({ task, onPatch, children, initialTab = "date" }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const { i18n } = useTranslation();
  const en = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, english: string) => en ? english : fa;
  const save = (patch: Partial<Task>, meta?: ScheduleSaveMeta) => {
    onPatch(patch);
    if (!meta?.keepOpen && ("work_date" in patch || "recurrence_rule" in patch)) setOpen(false);
  };
  const postpone = (days: number) => {
    const patch = postponeSchedule(task, days);
    if (patch) save(patch);
  };
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{children}</SheetTrigger>
      <SheetContent side="bottom" dir={en ? "ltr" : "rtl"} className="max-h-[88dvh] overflow-y-auto rounded-t-3xl p-5 pt-9 sm:mx-auto sm:max-w-lg" onClick={event => event.stopPropagation()}>
        <SheetTitle className="sr-only">{T("زمان‌بندی تسک", "Schedule task")}</SheetTitle>
        <div className="mb-3 grid grid-cols-2 gap-1 rounded-lg bg-muted/60 p-1">
          <button type="button" onClick={() => setTab("date")} className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm ${tab === "date" ? "bg-background font-medium" : "text-muted-foreground"}`}><CalendarDays className="h-4 w-4" />{T("زمان", "When")}</button>
          <button type="button" onClick={() => setTab("planning")} className={`flex min-h-10 items-center justify-center gap-2 rounded-md text-sm ${tab === "planning" ? "bg-background font-medium" : "text-muted-foreground"}`}><CalendarRange className="h-4 w-4" />{T("برنامه‌ریزی", "Planning")}</button>
        </div>
        {open && (tab === "date" ? <TaskScheduleBody key={task.id} t={task} canEdit save={save} postpone={postpone} T={T} isEn={en} /> : <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />)}
      </SheetContent>
    </Sheet>
  );
}
