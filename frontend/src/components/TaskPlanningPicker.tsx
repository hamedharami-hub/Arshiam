import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar, CalendarDays, CalendarRange, Check, Pencil, X } from "lucide-react";
import { currentPeriod, fromLocalISO, getTimeSettings, nextPeriod, periodLabel, type Period } from "@/lib/timeHorizon";
import { getTaskPlanning, planningPatch } from "@/lib/taskPlanning";
import { readSchedule, scheduleLabel } from "@/lib/taskSchedule";
import { toPersianDigits } from "@/lib/persianDigits";
import type { Task } from "@/lib/taskTypes";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "./ui/sheet";
import { InlineDatePicker } from "./InlineDatePicker";
import { IconTip } from "./task-detail/IconTip";

function usePlanningLang() {
  const { i18n } = useTranslation();
  const lang: "fa" | "en" = (i18n.language || "fa").startsWith("en") ? "en" : "fa";
  return { lang, fa: lang === "fa" };
}

/** Clear label of the task's single schedule ("Tomorrow · 15:00", "This week", "10 Jun – 10 Jul"), or null. */
export function useTaskPlanningLabel(task: Task): string | null {
  const { lang } = usePlanningLang();
  return scheduleLabel(readSchedule(task), getTimeSettings(), lang);
}

/** Short date for a day period, in the user's calendar (Jalali or Gregorian). */
function shortDay(iso: string, settings: ReturnType<typeof getTimeSettings>, lang: "fa" | "en"): string {
  const d = fromLocalISO(iso);
  if (settings.calendar === "jalali") {
    return d.toLocaleDateString(lang === "fa" ? "fa-IR-u-ca-persian" : "en-US-u-ca-persian", { day: "numeric", month: "short" }).replace(/\s?AP$/, "");
  }
  return d.toLocaleDateString(lang === "fa" ? "fa-IR-u-ca-gregory" : "en-US", { day: "numeric", month: "short" });
}

/** Muted range text under a period icon. */
function rangeText(period: Period, settings: ReturnType<typeof getTimeSettings>, lang: "fa" | "en"): string {
  if (period.horizon === "day") return shortDay(period.start, settings, lang);
  if (period.horizon === "week") return `${shortDay(period.start, settings, lang)} – ${shortDay(period.end, settings, lang)}`;
  return periodLabel(period, settings, lang);
}

/** The planning chooser — icon-led period tiles, plus a custom range. Usable inline or inside a sheet. */
export function TaskPlanningBody({ task, onPatch, onDone, onPickDay }: {
  task: Task; onPatch: (patch: Partial<Task>) => void; onDone?: () => void;
  /** When set, a single-day choice goes through the caller (so an existing time can be kept). */
  onPickDay?: (ymd: string) => void;
}) {
  const { lang, fa } = usePlanningLang();
  const settings = getTimeSettings();
  const plan = getTaskPlanning(task, settings);
  const num = (s: string | number) => (fa ? toPersianDigits(s) : String(s));
  const [customOpen, setCustomOpen] = useState(false);
  const [rangeStart, setRangeStart] = useState<string | null>(plan?.start || null);
  const [rangeEnd, setRangeEnd] = useState<string | null>(plan?.end || null);
  useEffect(() => {
    setRangeStart(plan?.start || null);
    setRangeEnd(plan?.end || null);
  }, [task.id, plan?.start, plan?.end]);
  const choose = (period: Period | null) => {
    if (period && period.horizon === "day" && period.start === period.end && onPickDay) { onPickDay(period.start); return; }
    onPatch(planningPatch(period, settings)); onDone?.();
  };

  const pickRangeDay = (ymd: string) => {
    if (!rangeStart || rangeEnd) { setRangeStart(ymd); setRangeEnd(null); return; }
    if (ymd < rangeStart) { setRangeEnd(rangeStart); setRangeStart(ymd); } else setRangeEnd(ymd);
  };
  const applyRange = () => {
    if (!rangeStart) return;
    const end = rangeEnd || rangeStart;
    // A one-day range is a daily plan; anything longer is stored as a custom span.
    choose({ horizon: end === rangeStart ? "day" : "week", start: rangeStart, end });
  };

  const today = currentPeriod("day", settings);
  const thisWeek = currentPeriod("week", settings);
  const thisMonth = currentPeriod("month", settings);
  const rows: Array<{ key: string; icon: any; label: string; period: Period }> = [
    { key: "today", icon: CalendarDays, label: fa ? "امروز" : "Today", period: today },
    { key: "tomorrow", icon: CalendarDays, label: fa ? "فردا" : "Tomorrow", period: nextPeriod(today, settings) },
    { key: "week", icon: CalendarRange, label: fa ? "این هفته" : "This week", period: thisWeek },
    { key: "next-week", icon: CalendarRange, label: fa ? "هفتهٔ بعد" : "Next week", period: nextPeriod(thisWeek, settings) },
    { key: "month", icon: Calendar, label: fa ? "این ماه" : "This month", period: thisMonth },
    { key: "next-month", icon: Calendar, label: fa ? "ماه بعد" : "Next month", period: nextPeriod(thisMonth, settings) },
  ];
  const customActive = !!plan && !rows.some(({ period }) => plan.horizon === period.horizon && plan.start === period.start && plan.end === period.end);
  return (
    <div className="space-y-2.5" dir={fa ? "rtl" : "ltr"} onClick={e => e.stopPropagation()} data-testid="task-planning-body">
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {rows.map(({ key, icon: Icon, label, period }) => {
          const active = !!plan && plan.horizon === period.horizon && plan.start === period.start && plan.end === period.end;
          return (
            <button key={key} type="button" aria-pressed={active} onClick={() => choose(period)} data-testid={`planning-quick-${key}`}
              className={`when-icon-btn ${active ? "when-icon-btn--active" : ""} min-h-[4.5rem] flex-col gap-0.5 px-1 py-2`}>
              <Icon className="h-5 w-5" strokeWidth={1.6} />
              <span className="max-w-full truncate text-[11px] font-medium leading-tight text-foreground/90">{label}</span>
              <span className="max-w-full truncate text-[9.5px] leading-tight text-muted-foreground" dir="auto"><bdi>{num(rangeText(period, settings, lang))}</bdi></span>
            </button>
          );
        })}
        <IconTip label={fa ? "بازهٔ دلخواه" : "Custom range"} active={customActive || customOpen} expanded={customOpen}
          onClick={() => setCustomOpen(v => !v)} testid="planning-custom-toggle" className="min-h-[4.5rem] flex-col gap-0.5 px-1 py-2">
          <span className="relative">
            <CalendarRange className="h-5 w-5" strokeWidth={1.6} />
            <Pencil className="absolute -bottom-1 -end-1.5 h-3 w-3 rounded-full bg-card p-px" strokeWidth={2} />
          </span>
          {customActive && plan
            ? <span className="max-w-full truncate text-[9.5px] leading-tight" dir="auto"><bdi>{num(rangeText(plan, settings, lang))}</bdi></span>
            : <span className="h-[1.1rem]" aria-hidden />}
        </IconTip>
      </div>
      {customOpen && (
        <div className="space-y-2 rounded-xl border border-border/60 p-1.5" data-testid="planning-custom-body">
          <InlineDatePicker bare value={null} isEn={!fa} rangeStart={rangeStart} rangeEnd={rangeEnd} onSelect={pickRangeDay} />
          <div className="flex items-center justify-between gap-2 px-1">
            <span className="min-w-0 truncate text-xs text-muted-foreground" dir="auto" data-testid="planning-range-summary">
              <bdi>{rangeStart ? num(`${shortDay(rangeStart, settings, lang)}${rangeEnd && rangeEnd !== rangeStart ? ` – ${shortDay(rangeEnd, settings, lang)}` : ""}`) : "—"}</bdi>
            </span>
            <IconTip label={fa ? "اعمال" : "Apply"} disabled={!rangeStart} onClick={applyRange} testid="planning-apply-range" className="when-icon-btn--solid h-9 w-12 shrink-0">
              <Check className="h-5 w-5" strokeWidth={2} />
            </IconTip>
          </div>
        </div>
      )}
      {plan && (
        <div className="flex justify-end">
          <IconTip label={fa ? "پاک‌کردن زمان‌بندی" : "Clear schedule"} onClick={() => choose(null)} testid="planning-clear" className="h-8 w-8">
            <X className="h-4 w-4" />
          </IconTip>
        </div>
      )}
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
      <SheetTitle className="mb-4">{fa ? "زمان" : "When"}</SheetTitle>
      {open && <TaskPlanningBody task={task} onPatch={onPatch} onDone={() => setOpen(false)} />}
    </SheetContent>
  </Sheet>;
}
