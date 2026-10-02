import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import { ALL_HORIZONS, childPeriods, currentPeriod, fromLocalISO, getTimeSettings, horizonLabel, nextPeriod, periodFor, periodLabel, type Horizon, type Period } from "@/lib/timeHorizon";
import { getTaskPlanning, planningPatch, planningUnitNumber, planningOffset } from "@/lib/taskPlanning";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Button } from "./ui/button";

function usePlanningLang() {
  const { i18n } = useTranslation();
  const lang: "fa" | "en" = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  return { lang, fa: lang === "fa" };
}

const unitNames = (fa: boolean) => ({ day: fa ? "روز" : "days", week: fa ? "هفته" : "weeks", month: fa ? "ماه" : "months", quarter: fa ? "فصل" : "quarters", year: fa ? "سال" : "years" });

/** Short human label for a task's planning period, or null when not planned. */
export function useTaskPlanningLabel(task: Task): string | null {
  const { lang, fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  if (!plan) return null;
  const unit = planningUnitNumber(plan, settings);
  const offset = planningOffset(plan, settings);
  const units = unitNames(fa);
  const raw = `${horizonLabel(plan.horizon, lang)} · ${offset > 0 ? `${offset} ${units[plan.horizon]} ${fa ? "بعد" : "later"} · ` : ""}${unit ? `${plan.horizon === "week" ? (fa ? "هفته" : "W") : plan.horizon === "month" ? (fa ? "ماه" : "M") : (fa ? "فصل" : "Q")} ${unit} · ` : ""}${periodLabel(plan, settings, lang)}`;
  return fa ? toPersianDigits(raw) : raw;
}

/** The planning chooser itself — usable inline (task header panel) or inside a popover. */
export function TaskPlanningBody({ task, onPatch, onDone, scrollable = true }: { task: Task; onPatch: (patch: Partial<Task>) => void; onDone?: () => void; scrollable?: boolean }) {
  const { lang, fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  const [horizon, setHorizon] = useState<Horizon>(plan?.horizon || "week");
  const [anchor, setAnchor] = useState(plan?.start || currentPeriod("week", settings).start);
  const selectedAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : currentPeriod("day", settings).start;
  const choose = (period: Period | null) => { onPatch(planningPatch(period, settings)); onDone?.(); };
  const units = unitNames(fa);
  const num = (s: string | number) => (fa ? toPersianDigits(s) : String(s));
  let option = currentPeriod(horizon, settings);
  const offsets = Array.from({ length: horizon === "month" ? 25 : horizon === "week" ? 13 : 9 }, (_, index) => {
    const value = option; option = nextPeriod(option, settings); return { value, index };
  });
  return (
    <div className="flex min-h-0 flex-col gap-3" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()} data-testid="task-planning-body">
      <div className="grid grid-cols-5 gap-1 rounded-lg bg-muted/60 p-1" role="tablist" aria-label={fa ? "بازهٔ برنامه‌ریزی" : "Planning period"}>
        {ALL_HORIZONS.map(h => <Button key={h} type="button" role="tab" aria-selected={horizon === h} size="sm" variant={horizon === h ? "secondary" : "ghost"} className="h-8 min-w-0 px-1 text-xs font-medium" onClick={() => setHorizon(h)} data-testid={`planning-horizon-${h}`}>{horizonLabel(h, lang)}</Button>)}
      </div>
      <div className={`min-h-0 flex-1 space-y-3 pe-0.5 ${scrollable ? "max-h-[min(46dvh,22rem)] overflow-y-auto overscroll-contain" : ""}`}>
        <label className="block space-y-1 text-xs text-muted-foreground">
          {fa ? "تاریخی داخل بازه" : "A date within the period"}
          <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm text-foreground" />
        </label>
        <Button type="button" variant="outline" className="min-h-9 w-full whitespace-normal text-sm leading-snug" disabled={!anchor} onClick={() => choose(periodFor(horizon, fromLocalISO(selectedAnchor), settings))}>
          {num(periodLabel(periodFor(horizon, fromLocalISO(selectedAnchor), settings), settings, lang))}
        </Button>
        {horizon === "week" && <div className="grid grid-cols-5 gap-1.5" aria-label={fa ? "هفته‌های ماه" : "Weeks of month"}>
          {childPeriods(periodFor("month", fromLocalISO(selectedAnchor), settings), settings).map((p, index) => <Button type="button" size="sm" variant="ghost" className="min-w-0 px-1 text-xs" key={p.start} onClick={() => choose(p)}>{fa ? "هفته" : "Week"} {num(index + 1)}</Button>)}
        </div>}
        <div className="grid grid-cols-2 gap-1.5">
          {offsets.map(({ value, index }) => <button type="button" key={value.start} className="min-h-11 rounded-md px-2.5 py-1.5 text-start text-xs transition hover:bg-muted" onClick={() => choose(value)}>
            <span className="block font-medium text-foreground">{index === 0 ? (fa ? "این دوره" : "This period") : index === 1 ? (fa ? "دورهٔ بعد" : "Next period") : `${num(index)} ${units[horizon]} ${fa ? "بعد" : "later"}`}</span>
            <span className="mt-0.5 block text-muted-foreground">{num(periodLabel(value, settings, lang))}</span>
          </button>)}
        </div>
      </div>
      {plan && <Button type="button" variant="ghost" className="h-8 shrink-0 text-xs text-destructive" onClick={() => choose(null)} data-testid="planning-clear">{fa ? "حذف برنامه‌ریزی" : "Clear planning"}</Button>}
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
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild>
      <button type="button" disabled={disabled} onClick={e => e.stopPropagation()} data-testid={`task-planning-${task.id}`} title={label} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10 sm:max-w-[260px]">
        <CalendarRange className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="w-[min(94vw,27rem)] rounded-2xl p-3 shadow-xl sm:p-4" align="start" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>
      {open && <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />}
    </PopoverContent>
  </Popover>;
}
