import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { CalendarDays, CalendarRange } from "lucide-react";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TaskScheduleBody } from "@/components/task-detail/TaskSchedulingSheet";
import { TaskPlanningBody } from "@/components/TaskPlanningPicker";
import type { Task } from "@/lib/taskTypes";

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
        <button type="button" onClick={() => setTab("date")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm ${tab === "date" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}><CalendarDays className="h-4 w-4" />{en ? "When" : "زمان"}</button>
        <button type="button" onClick={() => setTab("planning")} className={`flex min-h-10 items-center justify-center gap-2 rounded-lg text-sm ${tab === "planning" ? "bg-background font-semibold shadow-sm" : "text-muted-foreground"}`}><CalendarRange className="h-4 w-4" />{en ? "Planning" : "برنامه‌ریزی"}</button>
      </div>
      {tab === "date"
        ? <TaskScheduleBody t={task} canEdit save={onPatch} T={(faText, enText) => (en ? enText : faText)} isEn={en} onDone={() => setOpen(false)} />
        : <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />}
    </SheetContent>
  </Sheet>;
}
