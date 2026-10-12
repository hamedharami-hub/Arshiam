import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import { getTimeSettings } from "@/lib/timeHorizon";
import { getTaskPlanning, planningUnitNumber, planningOffset } from "@/lib/taskPlanning";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { ScheduleChoiceList } from "@/components/task-detail/ScheduleChoiceList";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";

function usePlanningLang() {
  const { i18n } = useTranslation();
  const lang: "fa" | "en" = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  return { lang, fa: lang === "fa" };
}

/** Short human label for a task's planning period, or null when not planned. */
export function useTaskPlanningLabel(task: Task): string | null {
  const { fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  if (!plan || (plan.horizon as string) === "range") return null;
  const unit = planningUnitNumber(plan, settings);
  const offset = planningOffset(plan, settings);
  const code = plan.horizon === "day" ? "D" : plan.horizon === "week" ? "W" : plan.horizon === "month" ? "M" : plan.horizon === "quarter" ? "Q" : "Y";
  const raw = `${code}${offset > 0 ? `+${offset}` : ""}${unit && plan.horizon !== "day" ? `·${unit}` : ""}`;
  return fa ? toPersianDigits(raw) : raw;
}

/** The same operational choices as the schedule list. Every save goes through schedulePatch. */
export function TaskPlanningBody({ task, onPatch, onDone }: { task: Task; onPatch: (patch: Partial<Task>) => void; onDone?: () => void }) {
  const { fa } = usePlanningLang();
  const T = (persian: string, english: string) => (fa ? persian : english);
  return (
    <div className="space-y-0.5" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()} data-testid="task-planning-body">
      <ScheduleChoiceList task={task} canEdit testIdPrefix="planning" T={T} isEn={!fa}
        save={(patch, meta) => { onPatch(patch); if (!meta?.keepOpen) onDone?.(); }} />
    </div>
  );
}

/** Compact chip + popover, used in task rows and subtasks where an inline panel has no room. */
export function TaskPlanningPicker({ task, onPatch, disabled = false, hideWhenEmpty = false }: { task: Task; onPatch: (patch: Partial<Task>) => void; disabled?: boolean; hideWhenEmpty?: boolean }) {
  const { fa } = usePlanningLang();
  const [open, setOpen] = useState(false);
  const planned = useTaskPlanningLabel(task);
  const label = planned || (fa ? "برنامه‌ریزی" : "Plan");
  if (hideWhenEmpty && !planned) return null;
  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>
      <button type="button" disabled={disabled} onClick={e => e.stopPropagation()} data-testid={`task-planning-${task.id}`} title={label} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10 sm:max-w-[260px]">
        <CalendarRange className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span>
      </button>
    </SheetTrigger>
    <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl p-5 pt-9 sm:mx-auto sm:max-w-2xl" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>
      <SheetTitle className="mb-4">{fa ? "بازهٔ برنامه‌ریزی" : "Planning period"}</SheetTitle>
      {open && <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />}
    </SheetContent>
  </Sheet>;
}
