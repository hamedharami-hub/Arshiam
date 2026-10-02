import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CornerDownLeft, Sparkles, Target } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/haptics";
import { toPersianDigits } from "@/lib/jalali";
import { upsertTask } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";
import {
  addDaysLocal, currentPeriod, fromLocalISO, nextPeriod, periodFor, periodLabel, prevPeriod, todayISO,
  type Horizon, type Period, type TimeSettings,
} from "@/lib/timeHorizon";
import {
  carryOver, childLevel, childrenMap, defaultChildPeriod, isClosed, itemsInPeriod, levelsFor, parentLevel,
  planOf, planPatch, progressOf, unplanned, weekDays,
} from "@/lib/planCascade";
import { LEVEL_NAME, LEVEL_PURPOSE, LEVEL_THEME, NOW_LABEL, frac } from "./planningTheme";
import { PlanItemCard, ProgressLine } from "./PlanItemCard";
import { PeriodPicker } from "./PeriodPicker";
import { UpperLevelPanel } from "./UpperLevelPanel";
import { CarryOverCard, UnplannedTray } from "./PlanningTrays";
import { PeriodReviewDialog, reviewDue } from "./PeriodReview";
import { ValuesGoalsPanel, domainOf, useMindGoals } from "./ValuesGoalsPanel";
import { format as gFormat } from "date-fns";
import { format as jFormat } from "date-fns-jalali";

const LEVEL_KEY = "arsh_planning_level_v2";
const FA_WEEKDAY = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

export type PlanningBoardProps = {
  tasks: Task[]; settings: TimeSettings; fa: boolean;
  onToggle: (t: Task) => unknown; onUpdate: (id: string, patch: Partial<Task>) => unknown; onOpen: (t: Task) => void;
  defaults?: { folder_id?: string | null }; onCreated?: () => void; compact?: boolean;
};

const newId = () => (crypto?.randomUUID ? crypto.randomUUID() : `t_${Date.now()}_${Math.random().toString(36).slice(2)}`);

export function PlanningBoard({ tasks, settings, fa, onToggle, onUpdate, onOpen, defaults, onCreated, compact }: PlanningBoardProps) {
  const { user } = useAuth();
  const lang = fa ? "fa" : "en";
  const levels = levelsFor(settings);
  const [level, setLevelState] = useState<Horizon>(() => {
    const saved = localStorage.getItem(LEVEL_KEY) as Horizon | null;
    return saved && levels.includes(saved) ? saved : "week";
  });
  const lv: Horizon = levels.includes(level) ? level : "month";
  const [anchor, setAnchor] = useState<string | null>(null);
  const [pane, setPane] = useState<"main" | "upper" | "unplanned">("main");
  const [draft, setDraft] = useState("");
  const touch = useRef<{ x: number; y: number } | null>(null);

  const period: Period = useMemo(() => (anchor ? periodFor(lv, fromLocalISO(anchor), settings) : currentPeriod(lv, settings)), [anchor, lv, settings]);
  const nowP = currentPeriod(lv, settings);
  const isCurrent = period.start === nowP.start;
  const up = parentLevel(lv, settings);
  const down = childLevel(lv, settings);
  const parentPeriod = up ? periodFor(up, addDaysLocal(fromLocalISO(period.start), lv === "week" ? 3 : 0), settings) : null;

  const live = tasks;
  const byId = useMemo(() => new Map(live.map((t) => [t.id, t])), [live]);
  const kids = useMemo(() => childrenMap(live), [live]);
  const order = (list: Task[]) => [...list].sort((a, b) => Number(isClosed(a)) - Number(isClosed(b)) || String(a.created_at || "").localeCompare(String(b.created_at || "")));
  const items = useMemo(() => order(itemsInPeriod(live, period, settings)), [live, period, settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const carried = useMemo(() => (isCurrent ? carryOver(live, period, settings) : []), [live, period, settings, isCurrent]);
  const upperItems = useMemo(() => (parentPeriod ? order(itemsInPeriod(live, parentPeriod, settings)) : []), [live, parentPeriod?.start, settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const loose = useMemo(() => unplanned(live, settings), [live, settings]);
  const goals = useMindGoals();
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const valueLabel = (t: Task) => {
    if (t.source_type !== "values_goal") return undefined;
    const d = domainOf(goalById.get(t.source_id || "")?.domain);
    return d ? `${d.icon} ${fa ? d.label : d.label_en}` : (fa ? "ارزش‌ها و اهداف" : "Values & Goals");
  };
  const [reviewP, setReviewP] = useState<Period | null>(null);
  const [reviewTick, setReviewTick] = useState(0);
  useEffect(() => { const on = () => setReviewTick((n) => n + 1); window.addEventListener("arsh:plan-reviewed", on); return () => window.removeEventListener("arsh:plan-reviewed", on); }, []);
  const prevP = prevPeriod(period, settings);
  const due = useMemo(() => (isCurrent ? reviewDue(user?.id, period, prevP, itemsInPeriod(live, prevP, settings).length > 0) : null), [isCurrent, user?.id, period, live, settings, reviewTick]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewItems = useMemo(() => (reviewP ? itemsInPeriod(live, reviewP, settings) : []), [reviewP, live, settings]);

  const ratio = items.length ? items.reduce((s, t) => s + progressOf(t, kids).ratio, 0) / items.length : 0;
  const doneCount = items.filter(isClosed).length;
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const nowName = NOW_LABEL[lv][lang];
  const targetName = isCurrent ? nowName : periodLabel(period, settings, lang);

  const setLevel = (h: Horizon) => {
    const focus = isCurrent ? new Date() : fromLocalISO(period.start);
    setAnchor(isCurrent ? null : periodFor(h, focus, settings).start);
    setLevelState(h); localStorage.setItem(LEVEL_KEY, h); setPane("main"); haptic("light");
  };
  const go = (dir: 1 | -1) => { setAnchor((dir === 1 ? nextPeriod(period, settings) : prevPeriod(period, settings)).start); haptic("light"); };

  const create = async (title: string, p: Period, parent?: Task, extra?: Partial<Task>) => {
    if (!user?.id || !title.trim()) return;
    const now = new Date().toISOString();
    const task = {
      id: newId(), user_id: user.id, title: title.trim(), priority: "none", completed: false, status: "todo",
      parent_id: null, position: 0, created_at: now, updated_at: now,
      folder_id: parent ? parent.folder_id ?? null : defaults?.folder_id ?? null,
      ...planPatch(p, settings, parent ? parent.id : null),
      ...extra,
    } as Task;
    const ok = await upsertTask(user.id, task);
    if (!ok) { toast.error(fa ? "ذخیره نشد؛ دوباره تلاش کن" : "Not saved, please retry"); return; }
    window.dispatchEvent(new Event("tasks-changed"));
    onCreated?.();
    haptic("light");
    toast.success(fa ? `به «${periodLabel(p, settings, lang)}» اضافه شد` : `Added to ${periodLabel(p, settings, lang)}`);
  };
  const plan = (t: Task, p: Period | null, parentId?: string | null) => { void onUpdate(t.id, planPatch(p, settings, parentId)); haptic("light"); };
  const moveNext = (t: Task) => { const p = planOf(t, settings) || period; plan(t, nextPeriod(p, settings)); toast.success(fa ? "به دورهٔ بعد رفت" : "Moved to next period"); };
  const complete = (t: Task) => void onUpdate(t.id, { completed: true, status: "done", completed_at: new Date().toISOString() });

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touch.current; touch.current = null;
    if (!start) return;
    const dx = e.changedTouches[0].clientX - start.x; const dy = e.changedTouches[0].clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dy) > 45) return;
    go((fa ? dx > 0 : dx < 0) ? 1 : -1);
  };

  const Prev = fa ? ChevronRight : ChevronLeft;
  const Next = fa ? ChevronLeft : ChevronRight;

  return (
    <div className="space-y-3" dir={fa ? "rtl" : "ltr"} data-testid="planning-board">
      <div className={cn("space-y-2.5", !compact && "lg:sticky lg:top-0 lg:z-20 lg:-mx-3 lg:bg-background/95 lg:px-3 lg:pb-2 lg:pt-1 lg:backdrop-blur")}>
        <div role="tablist" aria-label={fa ? "سطح برنامه‌ریزی" : "Planning level"} className="grid gap-1 rounded-2xl bg-muted/70 p-1" style={{ gridTemplateColumns: `repeat(${levels.length}, minmax(0, 1fr))` }}>
          {levels.map((h) => (
            <button key={h} role="tab" aria-selected={h === lv} type="button" onClick={() => setLevel(h)} data-testid={`planning-level-${h}`}
              className={cn("flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm transition-colors duration-150", h === lv ? "bg-background font-semibold shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              <span className={cn("h-2 w-2 rounded-full", LEVEL_THEME[h].dot)} />{LEVEL_NAME[h][lang]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => go(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label={fa ? "دورهٔ قبل" : "Previous period"} data-testid="planning-prev"><Prev className="h-5 w-5" /></button>
          <div className="flex min-w-0 flex-1 justify-center"><PeriodPicker key={`${lv}:${period.start}`} period={period} settings={settings} fa={fa} onPick={(p) => setAnchor(p.start)} /></div>
          <button type="button" onClick={() => go(1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-full hover:bg-muted" aria-label={fa ? "دورهٔ بعد" : "Next period"} data-testid="planning-next"><Next className="h-5 w-5" /></button>
          <button type="button" onClick={() => setReviewP(period)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:bg-muted" title={fa ? "مرور این دوره" : "Review this period"} data-testid="planning-review-open">
            <Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">{fa ? "مرور" : "Review"}</span>
          </button>
          {!isCurrent && (
            <button type="button" onClick={() => setAnchor(null)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-border px-3 text-xs font-medium hover:bg-muted" data-testid="planning-now">
              <Target className="h-3.5 w-3.5" />{nowName}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground" data-testid="planning-purpose">{LEVEL_PURPOSE[lv][lang]}</p>
          <div className="flex w-36 shrink-0 items-center gap-2" title={fa ? "پیشرفت این دوره" : "Progress of this period"}>
            <ProgressLine ratio={ratio} level={lv} />
            <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground" data-testid="planning-progress-text">{frac(doneCount, items.length, fa)}</span>
          </div>
        </div>
        <div className="flex gap-1 lg:hidden" role="tablist">
          {([["main", fa ? "این دوره" : "This period", items.length], ...(up ? [["upper", fa ? `از ${LEVEL_NAME[up].fa}` : `From ${LEVEL_NAME[up].en}`, upperItems.length]] : [["upper", fa ? "از ارزش‌ها" : "From values", goals.length]]), ["unplanned", fa ? "برنامه‌ریزی‌نشده" : "Unplanned", loose.length]] as [typeof pane, string, number][]).map(([id, label, n]) => (
            <button key={id} type="button" role="tab" aria-selected={pane === id} onClick={() => setPane(id)} data-testid={`planning-pane-${id}`}
              className={cn("h-9 flex-1 rounded-full text-xs transition-colors duration-150", pane === id ? "bg-foreground text-background font-semibold" : "bg-muted/60 text-muted-foreground")}>
              {label} <span className="tabular-nums opacity-70">{num(n)}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cn("space-y-3", pane !== "main" && "hidden lg:block")} onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd} data-testid="planning-main">
          {due && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent p-3" data-testid="planning-review-banner">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="min-w-0 flex-1 text-sm">{fa ? `وقت مرور «${periodLabel(due, settings, lang)}» است — کمتر از دو دقیقه.` : `Time to review ${periodLabel(due, settings, lang)} — under two minutes.`}</p>
              <button type="button" onClick={() => setReviewP(due)} className="h-8 shrink-0 rounded-full bg-foreground px-3 text-xs font-medium text-background" data-testid="planning-review-start">{fa ? "شروع مرور" : "Start"}</button>
            </div>
          )}
          <CarryOverCard tasks={carried} settings={settings} fa={fa} onMoveHere={(t) => plan(t, period)} onComplete={complete}
            onDrop={(t) => plan(t, null, null)} onMoveAll={() => carried.forEach((t) => plan(t, period))} />
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void create(draft, period); setDraft(""); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="planning-quick-add"
              placeholder={fa ? `افزودن به ${targetName}…` : `Add to ${targetName}…`}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30" />
            <button type="submit" disabled={!draft.trim()} className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40" aria-label={fa ? "افزودن" : "Add"} data-testid="planning-quick-add-submit"><CornerDownLeft className="h-4 w-4" /></button>
          </form>
          {items.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm leading-7 text-muted-foreground" data-testid="planning-empty">
              {fa ? `برای ${targetName} هنوز چیزی برنامه‌ریزی نشده.` : `Nothing planned for ${targetName} yet.`}
              {up && <span className="block text-xs">{fa ? `از ستون «از ${LEVEL_NAME[up].fa}» یک هدف بیاور، یا بالا یک مورد تازه بنویس.` : `Pull a goal from the ${LEVEL_NAME[up].en.toLowerCase()} column, or type a new item above.`}</span>}
            </div>
          ) : (
            <div className="space-y-2" data-testid="planning-items">
              {items.map((t) => (
                <PlanItemCard key={t.id} task={t} kids={kids} byId={byId} settings={settings} fa={fa} childLevelName={down} valueLabel={valueLabel(t)}
                  onToggle={(x) => void onToggle(x)} onOpen={onOpen} onMoveNext={moveNext} onUnplan={(x) => plan(x, null, null)}
                  onAddChild={down ? (parent, title) => void create(title, defaultChildPeriod(planOf(parent, settings) || period, down, settings), parent) : undefined} />
              ))}
            </div>
          )}
          {lv === "week" && <WeekDays period={period} tasks={live} settings={settings} fa={fa} onPick={(d) => { setLevelState("day"); localStorage.setItem(LEVEL_KEY, "day"); setAnchor(d); }} />}
        </div>
        <PeriodReviewDialog key={reviewP ? `${reviewP.horizon}:${reviewP.start}` : "none"} period={reviewP} items={reviewItems} settings={settings} fa={fa} onClose={() => setReviewP(null)}
          onMove={(t, p) => plan(t, p)} onDrop={(t) => plan(t, null, null)} onComplete={complete} onAdd={(title, p) => void create(title, p)} />
        <aside className={cn("space-y-3", pane === "main" && "hidden lg:block")}>
          {up && parentPeriod && (
            <div className={cn(pane === "unplanned" && "hidden lg:block")}>
              <UpperLevelPanel parentPeriod={parentPeriod} items={upperItems} kids={kids} current={period} settings={settings} fa={fa} onOpen={onOpen}
                onPull={(parent, title) => void create(title, period, parent)} onMoveHere={(t) => plan(t, period)} />
            </div>
          )}
          {lv === "year" && (
            <div className={cn(pane === "unplanned" && "hidden lg:block")}>
              <ValuesGoalsPanel goals={goals} tasks={live} fa={fa} onAdd={(g) => void create(g.text, period, undefined, { source_type: "values_goal", source_id: g.id })} />
            </div>
          )}
          <div className={cn(pane === "upper" && "hidden lg:block")}>
            <UnplannedTray tasks={loose} fa={fa} targetName={targetName} onOpen={onOpen} onAssign={(t) => { plan(t, period); toast.success(fa ? `به «${targetName}» اضافه شد` : `Added to ${targetName}`); }} />
          </div>
        </aside>
      </div>
    </div>
  );
}

function WeekDays({ period, tasks, settings, fa, onPick }: { period: Period; tasks: Task[]; settings: TimeSettings; fa: boolean; onPick: (day: string) => void }) {
  const today = todayISO();
  const jal = settings.calendar === "jalali";
  return (
    <section className="surface-card p-3" data-testid="planning-week-days">
      <h3 className="mb-2 text-xs font-semibold text-muted-foreground">{fa ? "پخش کارها بین روزها — روی هر روز بزن" : "Spread over the days — tap a day"}</h3>
      <div className="grid grid-cols-7 gap-1">
        {weekDays(period).map((d) => {
          const day = periodFor("day", fromLocalISO(d), settings);
          const list = itemsInPeriod(tasks, day, settings);
          const done = list.filter(isClosed).length;
          const date = fromLocalISO(d);
          return (
            <button key={d} type="button" onClick={() => onPick(d)} data-testid={`planning-week-day-${d}`}
              className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition-colors duration-150 hover:bg-muted", d === today && "bg-rose-500/10 ring-1 ring-rose-500/40")}>
              <span className="text-[10px] text-muted-foreground">{fa ? FA_WEEKDAY[date.getDay()] : gFormat(date, "EEEEE")}</span>
              <span className="text-sm font-semibold">{jal ? toPersianDigits(jFormat(date, "d")) : gFormat(date, "d")}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{list.length ? frac(done, list.length, fa) : "·"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
