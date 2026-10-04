import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import { ALL_HORIZONS, currentPeriod, fromLocalISO, getTimeSettings, horizonLabel, nextPeriod, periodFor, periodLabel, type Horizon, type Period } from "@/lib/timeHorizon";
import { getTaskPlanning, planningPatch, planningUnitNumber, planningOffset } from "@/lib/taskPlanning";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { Button } from "./ui/button";

function usePlanningLang() {
  const { i18n } = useTranslation();
  const lang: "fa" | "en" = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  return { lang, fa: lang === "fa" };
}

/** Short human label for a task's planning period, or null when not planned. */
export function useTaskPlanningLabel(task: Task): string | null {
  const { lang, fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  if (!plan) return null;
  const unit = planningUnitNumber(plan, settings);
  const offset = planningOffset(plan, settings);
  const code = plan.horizon === "day" ? "D" : plan.horizon === "week" ? "W" : plan.horizon === "month" ? "M" : plan.horizon === "quarter" ? "Q" : "Y";
  const raw = `${code}${offset > 0 ? `+${offset}` : ""}${unit && plan.horizon !== "day" ? `·${unit}` : ""}`;
  return fa ? toPersianDigits(raw) : raw;
}

/** The planning chooser itself — usable inline (task header panel) or inside a popover. */
export function TaskPlanningBody({ task, onPatch, onDone }: { task: Task; onPatch: (patch: Partial<Task>) => void; onDone?: () => void }) {
  const { lang, fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  const [horizon, setHorizon] = useState<Horizon>(plan?.horizon || "week");
  const [anchor, setAnchor] = useState(plan?.start || currentPeriod("week", settings).start);
  const selectedAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : currentPeriod("day", settings).start;
  const choose = (period: Period | null) => { onPatch(planningPatch(period, settings)); onDone?.(); };
  const num = (s: string | number) => (fa ? toPersianDigits(s) : String(s));
  let option = currentPeriod(horizon, settings);
  const offsets = Array.from({ length: horizon === "month" ? 25 : horizon === "week" ? 13 : 9 }, (_, index) => {
    const value = option; option = nextPeriod(option, settings); return { value, index };
  });
  return (
    <div className="flex min-h-0 flex-col gap-2" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()} data-testid="task-planning-body">
      <div className="grid grid-cols-5 gap-1 rounded-lg bg-muted/60 p-0.5" role="tablist" aria-label={fa ? "بازهٔ برنامه‌ریزی" : "Planning period"}>
        {ALL_HORIZONS.map(h => <Button key={h} type="button" role="tab" aria-selected={horizon === h} size="sm" variant={horizon === h ? "secondary" : "ghost"} className="h-7 min-w-0 px-1 text-xs font-medium" onClick={() => setHorizon(h)} data-testid={`planning-horizon-${h}`}>{horizonLabel(h, lang)}</Button>)}
      </div>
      {/* One scrollable chip row instead of a tall grid — compact by design. */}
      <div className="flex gap-1 overflow-x-auto no-scrollbar pb-0.5" role="listbox" aria-label={fa ? "دوره‌ها" : "Periods"}>
        {offsets.map(({ value, index }) => {
          const selected = plan?.horizon === value.horizon && plan?.start === value.start;
          return (
            <button key={value.start} type="button" role="option" aria-selected={selected}
              title={periodLabel(value, settings, lang)} onClick={() => choose(value)} data-testid={`planning-period-${index}`}
              className={`h-8 shrink-0 rounded-lg border px-2.5 text-xs transition ${selected ? "border-primary/60 bg-primary/10 font-semibold text-primary" : "border-border/60 bg-card text-foreground/80 hover:bg-muted"}`}>
              {index === 0 ? (fa ? "این دوره" : "This") : index === 1 ? (fa ? "بعدی" : "Next") : `+${num(index)}`}
            </button>
          );
        })}
      </div>
      <div className="flex items-center gap-1.5">
        <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)}
          className="h-8 min-w-0 flex-1 rounded-md border border-border/60 bg-background px-2 text-xs text-foreground"
          aria-label={fa ? "تاریخی داخل بازه" : "A date within the period"} />
        <Button type="button" variant="outline" size="sm" className="h-8 shrink-0 px-2.5 text-xs" disabled={!anchor}
          onClick={() => choose(periodFor(horizon, fromLocalISO(selectedAnchor), settings))} data-testid="planning-apply-date">
          {fa ? "اعمال" : "Apply"}
        </Button>
      </div>
      {plan && <button type="button" className="h-7 self-start rounded-md px-2 text-xs text-destructive transition hover:bg-destructive/10" onClick={() => choose(null)} data-testid="planning-clear">{fa ? "حذف برنامه‌ریزی" : "Clear planning"}</button>}
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
