import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { DndContext, PointerSensor, TouchSensor, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { AlertTriangle, ChevronLeft, ChevronRight, CalendarClock, Settings2, Target } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { useHorizonData, type NewTaskInput } from "@/hooks/useHorizonData";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HorizonTimeline } from "@/components/horizon/HorizonTimeline";
import { HorizonTaskRow } from "@/components/horizon/HorizonTaskRow";
import { HorizonFilterBar } from "@/components/horizon/HorizonFilterBar";
import { HorizonSmartAdd } from "@/components/horizon/HorizonSmartAdd";
import { TimeSettingsFields } from "@/components/horizon/TimeSettingsFields";
import { WeatherWeekStrip } from "@/components/weather/WeatherWeekStrip";
import { toPersianDigits } from "@/lib/jalali";
import { haptic } from "@/lib/haptics";
import { filterTasksForVisibility, useShowCompletedTasks } from "@/lib/completedTaskVisibility";
import type { Task } from "@/lib/taskTypes";
import {
  childPeriods, currentPeriod, enabledHorizons, fieldsForPeriod, fromLocalISO, getTaskTime, getTimeSettings,
  isOverdue, nextPeriod, periodFor, periodLabel, postponeFields, prevPeriod, taskInPeriod, type ChildPeriod, type Horizon, type Period, type TimeSettings,
} from "@/lib/timeHorizon";
import { applyFilter, inheritFromFilter, loadFilter, saveFilter, sortTasks, type HorizonFilter } from "@/lib/horizonFilters";

const LEVEL_KEY = "arsh_horizon_level_v1";
const LEGACY_KIND: Record<string, Horizon> = { morning: "day", noon: "day", afternoon: "day", night: "day", day: "day", week: "week", month: "month", quarter: "quarter", year: "year" };

function useTimeSettings(): [TimeSettings, () => void] {
  const [s, setS] = useState<TimeSettings>(getTimeSettings);
  useEffect(() => {
    const on = () => setS(getTimeSettings());
    window.addEventListener("arsh:time-settings", on);
    window.addEventListener("storage", on);
    return () => { window.removeEventListener("arsh:time-settings", on); window.removeEventListener("storage", on); };
  }, []);
  return [s, () => setS(getTimeSettings())];
}

export default function BucketsView() {
  const { user } = useAuth();
  const { isEn } = useBilingual();
  const lang: "fa" | "en" = isEn ? "en" : "fa";
  const fa = !isEn;
  const reduce = useReducedMotion();
  const [params] = useSearchParams();
  const [settings, refreshSettings] = useTimeSettings();
  const showCompletedTasks = useShowCompletedTasks();
  const levels = enabledHorizons(settings);

  const [horizon, setHorizon] = useState<Horizon>(() => {
    const q = params.get("kind");
    const fromUrl = q ? LEGACY_KIND[q] : undefined;
    const saved = localStorage.getItem(LEVEL_KEY) as Horizon | null;
    return fromUrl || saved || "week";
  });
  const effectiveHorizon: Horizon = levels.includes(horizon) ? horizon : "month";
  const [anchor, setAnchor] = useState<string | null>(null); // period_start of the viewed period (null = current)
  const [zoomDir, setZoomDir] = useState<1 | -1>(1);
  const period: Period = useMemo(
    () => (anchor ? periodFor(effectiveHorizon, fromLocalISO(anchor), settings) : currentPeriod(effectiveHorizon, settings)),
    [anchor, effectiveHorizon, settings],
  );
  const isCurrent = period.start === currentPeriod(effectiveHorizon, settings).start;

  const [filter, setFilterState] = useState<HorizonFilter>(() => loadFilter(effectiveHorizon));
  useEffect(() => { setFilterState(loadFilter(effectiveHorizon)); }, [effectiveHorizon]);
  const setFilter = (f: HorizonFilter) => { setFilterState(f); saveFilter(effectiveHorizon, f); };

  const { tasks, loading, folders, tags, taskTags, setTime, toggleDone, createTask } = useHorizonData(user?.id, settings);

  const changeLevel = (h: Horizon) => {
    const from = levels.indexOf(effectiveHorizon);
    setZoomDir(levels.indexOf(h) < from ? -1 : 1);
    // keep the viewed moment: zoom into / out of the same date
    const focus = isCurrent ? new Date() : fromLocalISO(period.start);
    setAnchor(isCurrent ? null : periodFor(h, focus, settings).start);
    setHorizon(h);
    localStorage.setItem(LEVEL_KEY, h);
    haptic("light");
  };

  const now = new Date();
  const withTime = useMemo(() => tasks.map((t) => ({ t, tf: getTaskTime(t, settings) })).filter((x) => x.tf), [tasks, settings]);
  const filtered = useMemo(() => {
    const ok = new Set(applyFilter(withTime.map((x) => x.t), filter, taskTags).map((t) => t.id));
    return withTime.filter((x) => ok.has(x.t.id));
  }, [withTime, filter, taskTags]);

  const overdue = useMemo(() => sortTasks(filtered.filter((x) => isOverdue(x.t, settings, now)).map((x) => x.t), filter.sort), [filtered, settings, filter.sort]); // eslint-disable-line react-hooks/exhaustive-deps
  const overdueIds = useMemo(() => new Set(overdue.map((t) => t.id)), [overdue]);

  const inPeriod = filtered.filter((x) => taskInPeriod(x.tf!, period));
  const children = childPeriods(period, settings);
  const wholePeriodAll = sortTasks(inPeriod.filter((x) => x.tf!.horizon === effectiveHorizon).map((x) => x.t), filter.sort);
  const wholePeriod = filterTasksForVisibility(wholePeriodAll, showCompletedTasks);
  const childGroupsAll = children.map((cp) => ({
    cp,
    tasks: sortTasks(filtered.filter((x) => x.tf!.horizon !== effectiveHorizon && taskInPeriod(x.tf!, cp)).map((x) => x.t), filter.sort),
  }));
  const childGroups = childGroupsAll.map((group) => ({ ...group, visibleTasks: filterTasksForVisibility(group.tasks, showCompletedTasks) }));
  const progressTasks = [...wholePeriodAll, ...childGroupsAll.flatMap((g) => g.tasks.filter((t) => taskInPeriod(getTaskTime(t, settings)!, period)))];
  const uniqueProgress = [...new Map(progressTasks.map((t) => [t.id, t])).values()];
  const doneCount = uniqueProgress.filter((t) => t.completed).length;
  const pct = uniqueProgress.length ? Math.round((doneCount / uniqueProgress.length) * 100) : 0;

  const postpone = async (list: Task[]) => {
    let n = 0;
    for (const t of list) {
      const next = postponeFields(t, settings);
      if (next && (await setTime(t.id, next))) n++;
    }
    haptic("medium");
    toast.success(fa ? `${toPersianDigits(n)} تسک به دورهٔ بعد رفت` : `${n} task(s) moved to the next period`);
  };

  const onCreate = async (inputs: NewTaskInput[]) => {
    let ok = 0;
    for (const input of inputs) if (await createTask(input)) ok++;
    haptic("success");
    toast.success(fa ? `${toPersianDigits(ok)} تسک اضافه شد` : `${ok} task(s) added`);
  };

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );
  const onDragEnd = (e: DragEndEvent) => {
    const task = e.active.data.current?.task as Task | undefined;
    const target = e.over?.data.current?.period as Period | undefined;
    if (!task || !target) return;
    const tf = getTaskTime(task, settings);
    if (tf && tf.horizon === target.horizon && tf.period_start === target.start) return;
    void setTime(task.id, fieldsForPeriod(target, tf?.postpone_count || 0));
    haptic("light");
    toast.success(fa ? `منتقل شد به ${periodLabel(target, settings, lang)}` : `Moved to ${periodLabel(target, settings, lang)}`);
  };

  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const PrevIcon = fa ? ChevronRight : ChevronLeft;
  const NextIcon = fa ? ChevronLeft : ChevronRight;

  return (
    <div className="mx-auto w-full max-w-3xl px-3 sm:px-4 pb-24 pt-2 space-y-3" dir={fa ? "rtl" : "ltr"} data-testid="horizon-view">
      {/* sticky header: title, timeline, period nav, progress */}
      <div className="sticky top-0 z-20 -mx-3 sm:-mx-4 px-3 sm:px-4 pt-1 pb-2 bg-background/95 backdrop-blur space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-bold">{fa ? "بازه‌های زمانی" : "Time Buckets"}</h1>
          <TimeSettingsPopover settings={settings} fa={fa} onChanged={refreshSettings} />
        </div>
        <HorizonTimeline levels={levels} value={effectiveHorizon} onChange={changeLevel} lang={lang} />
        <div className="flex items-center gap-2">
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => setAnchor(prevPeriod(period, settings).start)} aria-label={fa ? "دورهٔ قبل" : "Previous"} data-testid="horizon-prev-period">
            <PrevIcon className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0 text-center">
            <div className="text-sm font-semibold truncate" data-testid="horizon-period-label">{periodLabel(period, settings, lang)}</div>
            <div className="flex items-center gap-2 mt-1">
              <Progress value={pct} className="h-1.5" data-testid="horizon-period-progress" />
              <span className="text-[10px] tabular-nums text-muted-foreground whitespace-nowrap" data-testid="horizon-period-progress-text">
                {num(doneCount)}/{num(uniqueProgress.length)}
              </span>
            </div>
          </div>
          <Button size="icon" variant="ghost" className="h-10 w-10 shrink-0" onClick={() => setAnchor(nextPeriod(period, settings).start)} aria-label={fa ? "دورهٔ بعد" : "Next"} data-testid="horizon-next-period">
            <NextIcon className="w-5 h-5" />
          </Button>
          {!isCurrent && (
            <Button size="sm" variant="outline" className="h-8 rounded-full shrink-0 gap-1" onClick={() => setAnchor(null)} data-testid="horizon-go-current">
              <Target className="w-3.5 h-3.5" />{fa ? "اکنون" : "Now"}
            </Button>
          )}
        </div>
        {effectiveHorizon === "week" && <WeatherWeekStrip start={period.start} />}
        <HorizonFilterBar filter={filter} onChange={setFilter} folders={folders} tags={tags} lang={lang} />
      </div>

      <HorizonSmartAdd period={period} inherited={inheritFromFilter(filter)} settings={settings} folders={folders} tags={tags} lang={lang} onCreate={onCreate} />

      {loading ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-12 rounded-xl" />)}</div>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDragEnd}>
          {overdue.length > 0 && (
            <section className="rounded-2xl border border-destructive/30 bg-destructive/5 p-2.5 space-y-2" data-testid="horizon-overdue-section">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-sm font-semibold text-destructive">
                  <AlertTriangle className="w-4 h-4" /> {fa ? "عقب‌افتاده" : "Overdue"} <span className="text-xs" data-testid="horizon-overdue-count">({num(overdue.length)})</span>
                </div>
                <Button size="sm" variant="outline" className="h-8 rounded-full gap-1 border-destructive/40" onClick={() => postpone(overdue)} data-testid="horizon-postpone-all">
                  <CalendarClock className="w-3.5 h-3.5" /> {fa ? "تعویق همه" : "Postpone all"}
                </Button>
              </div>
              {overdue.map((t) => (
                <HorizonTaskRow key={t.id} task={t} settings={settings} lang={lang} overdue showPeriod onToggle={() => toggleDone(t)} onPostpone={() => postpone([t])} />
              ))}
            </section>
          )}

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={`${effectiveHorizon}:${period.start}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: zoomDir === 1 ? 0.97 : 1.03 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: zoomDir === 1 ? 1.03 : 0.97 }}
              transition={{ duration: reduce ? 0.1 : 0.22, ease: "easeOut" }}
              className="space-y-3"
            >
              <PeriodSection
                id={`whole-${period.start}`}
                period={period}
                title={`${fa ? "کلِ دوره" : "Whole period"} · ${periodLabel(period, settings, lang)}`}
                tasks={wholePeriodAll}
                visibleTasks={wholePeriod}
                emptyText={children.length ? (fa ? "تسک کلیِ این دوره اینجا می‌آید" : "Tasks for the whole period go here") : (fa ? "برای این روز تسکی نیست" : "Nothing for this day")}
                render={(t) => <HorizonTaskRow key={t.id} task={t} settings={settings} lang={lang} overdue={overdueIds.has(t.id)} onToggle={() => toggleDone(t)} onPostpone={() => postpone([t])} />}
                fa={fa}
                testId="horizon-whole-period"
              />
              {childGroups.map(({ cp, tasks: allGroupTasks, visibleTasks: list }) => (
                <PeriodSection
                  key={cp.start}
                  id={`child-${cp.horizon}-${cp.start}`}
                  period={cp}
                  child={cp}
                  title={periodLabel(cp, settings, lang)}
                  tasks={allGroupTasks}
                  visibleTasks={list}
                  emptyText={fa ? "خالی — تسک را اینجا رها کن" : "Empty — drop a task here"}
                  render={(t) => <HorizonTaskRow key={t.id} task={t} settings={settings} lang={lang} overdue={overdueIds.has(t.id)} showPeriod={getTaskTime(t, settings)?.horizon !== cp.horizon} onToggle={() => toggleDone(t)} onPostpone={() => postpone([t])} />}
                  fa={fa}
                  testId={`horizon-child-${cp.start}`}
                />
              ))}
            </motion.div>
          </AnimatePresence>
        </DndContext>
      )}
    </div>
  );
}

function PeriodSection({ id, period, child, title, tasks, visibleTasks, emptyText, render, fa, testId }: {
  id: string; period: Period; child?: ChildPeriod; title: string; tasks: Task[]; emptyText: string;
  visibleTasks: Task[];
  render: (t: Task) => React.ReactNode; fa: boolean; testId: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id, data: { period: { horizon: period.horizon, start: period.start, end: period.end } } });
  const done = tasks.filter((t) => t.completed).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  return (
    <section ref={setNodeRef} className={`rounded-2xl border p-2.5 space-y-2 transition-colors ${isOver ? "border-primary bg-primary/5" : "border-border/60 bg-card/50"}`} data-testid={testId}>
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-bold flex-1 min-w-0 truncate">{title}</h2>
        {child?.shared && (
          <span className="shrink-0 text-[10px] rounded-full px-2 py-0.5 bg-amber-500/15 text-amber-700 dark:text-amber-300" data-testid={`${testId}-shared`}>
            {fa ? "مشترک" : "Shared"}
          </span>
        )}
        {tasks.length > 0 && (
          <div className="flex items-center gap-1.5 w-24 shrink-0">
            <Progress value={pct} className="h-1" />
            <span className="text-[10px] tabular-nums text-muted-foreground">{num(done)}/{num(tasks.length)}</span>
          </div>
        )}
      </div>
      {visibleTasks.length ? <div className="space-y-1.5">{visibleTasks.map(render)}</div> : <p className="text-[11px] text-muted-foreground py-1">{emptyText}</p>}
    </section>
  );
}

function TimeSettingsPopover({ settings, fa, onChanged }: { settings: TimeSettings; fa: boolean; onChanged: () => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className="h-10 w-10" aria-label={fa ? "تنظیمات زمان" : "Time settings"} data-testid="horizon-settings-btn">
          <Settings2 className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 space-y-3">
        <TimeSettingsFields settings={settings} fa={fa} onChanged={onChanged} />
      </PopoverContent>
    </Popover>
  );
}
