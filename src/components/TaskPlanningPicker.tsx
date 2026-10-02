import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CalendarRange } from "lucide-react";
import { ALL_HORIZONS, childPeriods, currentPeriod, fromLocalISO, getTimeSettings, horizonLabel, nextPeriod, periodFor, periodLabel, type Horizon, type Period } from "@/lib/timeHorizon";
import { getTaskPlanning, planningPatch, planningUnitNumber, planningOffset } from "@/lib/taskPlanning";
import type { Task } from "@/lib/taskTypes";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { Button } from "./ui/button";

export function TaskPlanningPicker({ task, onPatch, disabled = false }: { task: Task; onPatch: (patch: Partial<Task>) => void; disabled?: boolean }) {
  const { i18n } = useTranslation(); const lang = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  const fa = lang === "fa"; const settings = getTimeSettings(); const plan = getTaskPlanning(task, settings);
  const [open, setOpen] = useState(false); const [horizon, setHorizon] = useState<Horizon>(plan?.horizon || "week");
  const [anchor, setAnchor] = useState(plan?.start || currentPeriod("week", settings).start);
  const selectedAnchor = /^\d{4}-\d{2}-\d{2}$/.test(anchor) ? anchor : currentPeriod("day", settings).start;
  const choose = (period: Period | null) => { onPatch(planningPatch(period, settings)); setOpen(false); };
  const unit = plan ? planningUnitNumber(plan, settings) : null;
  const offset = plan ? planningOffset(plan, settings) : 0;
  const units = { day: fa ? "روز" : "days", week: fa ? "هفته" : "weeks", month: fa ? "ماه" : "months", quarter: fa ? "فصل" : "quarters", year: fa ? "سال" : "years" };
  const label = plan ? `${horizonLabel(plan.horizon, lang)} · ${offset > 0 ? `${offset} ${units[plan.horizon]} ${fa ? "بعد" : "later"} · ` : ""}${unit ? `${plan.horizon === "week" ? (fa ? "هفته" : "W") : plan.horizon === "month" ? (fa ? "ماه" : "M") : (fa ? "فصل" : "Q")} ${unit} · ` : ""}${periodLabel(plan, settings, lang)}` : (fa ? "برنامه‌ریزی" : "Plan");
  let option = currentPeriod(horizon, settings);
  const offsets = Array.from({ length: horizon === "month" ? 25 : horizon === "week" ? 13 : 9 }, (_, index) => {
    const value = option; option = nextPeriod(option, settings); return { value, index };
  });
  return <Popover open={open} onOpenChange={value => { setOpen(value); if (value) { setHorizon(plan?.horizon || "week"); setAnchor(plan?.start || currentPeriod("week", settings).start); } }}>
    <PopoverTrigger asChild>
      <button type="button" disabled={disabled} onClick={e => e.stopPropagation()} data-testid={`task-planning-${task.id}`} title={label} className="inline-flex max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary hover:bg-primary/10 sm:max-w-[260px]">
        <CalendarRange className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span>
      </button>
    </PopoverTrigger>
    <PopoverContent className="flex max-h-[min(82dvh,44rem)] w-[min(94vw,27rem)] flex-col gap-3 overflow-hidden rounded-2xl p-3 shadow-xl sm:p-4" align="start" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>
      <div className="grid grid-cols-5 gap-1 rounded-xl bg-muted/60 p-1" role="tablist" aria-label={fa ? "بازهٔ برنامه‌ریزی" : "Planning period"}>
        {ALL_HORIZONS.map(h => <Button key={h} type="button" role="tab" aria-selected={horizon === h} size="sm" variant={horizon === h ? "secondary" : "ghost"} className="h-9 min-w-0 px-1 text-[10px] font-medium sm:px-2 sm:text-xs" onClick={() => setHorizon(h)}>{horizonLabel(h, lang)}</Button>)}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pe-0.5">
        <label className="block space-y-1 text-[11px] font-medium text-muted-foreground">
          {fa ? "انتخاب تاریخِ داخل بازه" : "Choose a date within the period"}
          <input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} className="h-10 w-full rounded-lg border bg-background px-3 text-sm text-foreground" />
        </label>
        <Button type="button" className="min-h-10 w-full whitespace-normal leading-snug" disabled={!anchor} onClick={() => choose(periodFor(horizon, fromLocalISO(selectedAnchor), settings))}>
          {periodLabel(periodFor(horizon, fromLocalISO(selectedAnchor), settings), settings, lang)}
        </Button>
        {horizon === "week" && <div className="grid grid-cols-5 gap-1.5" aria-label={fa ? "هفته‌های ماه" : "Weeks of month"}>
          {childPeriods(periodFor("month", fromLocalISO(selectedAnchor), settings), settings).map((p, index) => <Button type="button" size="sm" variant="outline" className="min-w-0 px-1 text-[10px] sm:text-xs" key={p.start} onClick={() => choose(p)}>{fa ? "هفته" : "Week"} {index + 1}</Button>)}
        </div>}
        <div className="grid grid-cols-2 gap-1.5">
          {offsets.map(({ value, index }) => <button type="button" key={value.start} className="min-h-12 rounded-xl border border-border/60 bg-background px-2.5 py-2 text-start text-[11px] transition hover:border-primary/30 hover:bg-muted/60 sm:text-xs" onClick={() => choose(value)}>
            <span className="block font-medium">{index === 0 ? (fa ? "این دوره" : "This period") : index === 1 ? (fa ? "دورهٔ بعد" : "Next period") : `${index} ${units[horizon]} ${fa ? "بعد" : "later"}`}</span>
            <span className="mt-0.5 block text-muted-foreground">{periodLabel(value, settings, lang)}</span>
          </button>)}
        </div>
      </div>
      {plan && <Button type="button" variant="ghost" className="h-9 shrink-0 text-destructive" onClick={() => choose(null)}>{fa ? "حذف برنامه‌ریزی" : "Clear planning"}</Button>}
    </PopoverContent>
  </Popover>;
}
