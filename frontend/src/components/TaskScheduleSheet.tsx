import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TaskScheduleBody } from "@/components/task-detail/TaskSchedulingSheet";
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
  void initialTab;
  const { i18n } = useTranslation();
  const en = (i18n.language || "fa").startsWith("en");
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>{children}</SheetTrigger>
    <SheetContent side="bottom" dir={en ? "ltr" : "rtl"} className="max-h-[88dvh] overflow-y-auto rounded-t-3xl p-5 pt-9 sm:mx-auto sm:max-w-2xl" onClick={event => event.stopPropagation()}>
      <SheetTitle className="mb-4">{en ? "When" : "زمان"}</SheetTitle>
      {/* One schedule per task: days, periods, custom range, time, repeat and reminder in a single panel */}
      <TaskScheduleBody t={task} canEdit save={onPatch} T={(faText, enText) => (en ? enText : faText)} isEn={en} onDone={() => setOpen(false)} />
    </SheetContent>
  </Sheet>;
}
