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
    <PopoverTrigger asChild><button type="button" disabled={disabled} onClick={e => e.stopPropagation()} data-testid={`task-planning-${task.id}`} title={label} className="inline-flex max-w-full sm:max-w-[260px] items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-0.5 text-[10px] text-primary"><CalendarRange className="h-3 w-3 shrink-0" /><span className="truncate">{label}</span></button></PopoverTrigger>
    <PopoverContent className="w-80 max-w-[90vw] space-y-3" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()}>
      <div className="flex gap-1 overflow-x-auto" role="tablist">{ALL_HORIZONS.map(h => <Button key={h} type="button" size="sm" variant={horizon === h ? "secondary" : "ghost"} onClick={() => setHorizon(h)}>{horizonLabel(h, lang)}</Button>)}</div>
      <label className="block text-xs">{fa ? "انتخاب تاریخِ داخل بازه" : "Choose a date within the period"}<input type="date" value={anchor} onChange={e => setAnchor(e.target.value)} className="mt-1 w-full rounded-md border bg-background p-2" /></label>
      <Button type="button" className="w-full" disabled={!anchor} onClick={() => choose(periodFor(horizon, fromLocalISO(selectedAnchor), settings))}>{periodLabel(periodFor(horizon, fromLocalISO(selectedAnchor), settings), settings, lang)}</Button>
      {horizon === "week" && <div className="flex flex-wrap gap-1">{childPeriods(periodFor("month", fromLocalISO(selectedAnchor), settings), settings).map((p, index) => <Button type="button" size="sm" variant="outline" key={p.start} onClick={() => choose(p)}>{fa ? "هفته" : "Week"} {index + 1}</Button>)}</div>}
      <div className="max-h-48 space-y-1 overflow-y-auto">{offsets.map(({ value, index }) => <button type="button" key={value.start} className="block w-full rounded-md p-2 text-start text-xs hover:bg-muted" onClick={() => choose(value)}>{index === 0 ? (fa ? "این دوره" : "This period") : index === 1 ? (fa ? "دورهٔ بعد" : "Next period") : `${index} ${units[horizon]} ${fa ? "بعد" : "later"}`} · {periodLabel(value, settings, lang)}</button>)}</div>
      {plan && <Button type="button" variant="ghost" className="w-full text-destructive" onClick={() => choose(null)}>{fa ? "حذف برنامه‌ریزی" : "Clear planning"}</Button>}
    </PopoverContent>
  </Popover>;
}
