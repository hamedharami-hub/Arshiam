import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, CornerDownLeft, Sparkles, Target, CalendarClock } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { haptic } from "@/lib/haptics";
import { toPersianDigits } from "@/lib/jalali";
import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { reportSave, toSaveStatus } from "@/lib/saveFeedback";
import { clearTaskCreateIntent, getTaskCreateIntent, type TaskCreateIntent } from "@/lib/taskCreateIntent";
import { nextPlanPeriod, scheduleLabel, readSchedule } from "@/lib/taskSchedule";
import type { Task } from "@/lib/taskTypes";
import {
  addDaysLocal, currentPeriod, fromLocalISO, nextPeriod, periodFor, periodLabel, prevPeriod, todayISO,
  type Horizon, type Period, type TimeSettings,
} from "@/lib/timeHorizon";
import {
  carryOver, childLevel, childrenMap, defaultChildPeriod, isClosed, isDone, itemsInPeriod, levelsFor, parentLevel,
  planOf, planPatch, progressOf, topLevelItems, unplanned, weekDays,
} from "@/lib/planCascade";
import { LEVEL_NAME, LEVEL_PURPOSE, LEVEL_THEME, NOW_LABEL, frac } from "./planningTheme";
import { PlanItemCard, ProgressLine } from "./PlanItemCard";
import { PeriodPicker } from "./PeriodPicker";
import { UpperLevelPanel } from "./UpperLevelPanel";
import { CarryOverCard, UnplannedTray } from "./PlanningTrays";
import { PeriodReviewDialog, reviewDue } from "./PeriodReview";
import { ValuesGoalsPanel, domainOf, useMindGoalsState } from "./ValuesGoalsPanel";
import { usePlanReviews } from "@/lib/planReviewService";
import { applyTaskScheduleMigration, previewTaskScheduleMigration, type MigrationApplyStatus, type MigrationIssue, type ScheduleMigrationPlan } from "@/lib/taskScheduleMigration";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format as gFormat } from "date-fns";
import { format as jFormat } from "date-fns-jalali";
import { validateTaskParentLink } from "@/lib/taskRelations";

const LEVEL_KEY = "arsh_planning_level_v2";
const FA_WEEKDAY = ["ی", "د", "س", "چ", "پ", "ج", "ش"];

export type PlanningBoardProps = {
  tasks: Task[]; settings: TimeSettings; fa: boolean;
  onToggle: (t: Task) => unknown; onUpdate: (id: string, patch: Partial<Task>) => Promise<TaskPersistenceStatus>; onOpen: (t: Task) => void;
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
  const quickAddIntent = useRef<TaskCreateIntent | null>(null);
  const busyRef = useRef(false);
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
  const rows = useMemo(() => topLevelItems(items), [items]);
  const counted = useMemo(() => items.filter((t) => t.status !== "wont_do"), [items]);
  const carried = useMemo(() => (isCurrent ? carryOver(live, period, settings) : []), [live, period, settings, isCurrent]);
  // The upper column shows the bigger goals of the parent level only (finer items already live in this view).
  const upperItems = useMemo(() => (parentPeriod && up ? order(itemsInPeriod(live, parentPeriod, settings).filter((t) => planOf(t, settings)?.horizon === up)) : []), [live, parentPeriod?.start, up, settings]); // eslint-disable-line react-hooks/exhaustive-deps
  const loose = useMemo(() => unplanned(live, settings), [live, settings]);
  const { goals, status: goalsStatus } = useMindGoalsState();
  const goalById = useMemo(() => new Map(goals.map((g) => [g.id, g])), [goals]);
  const valueLabel = (t: Task) => {
    if (t.source_type !== "values_goal") return undefined;
    const d = domainOf(goalById.get(t.source_id || "")?.domain);
    return d ? `${d.icon} ${fa ? d.label : d.label_en}` : (fa ? "ارزش‌ها و اهداف" : "Values & Goals");
  };
  const [reviewP, setReviewP] = useState<Period | null>(null);
  const [migrationOpen, setMigrationOpen] = useState(false);
  const [migrationBusy, setMigrationBusy] = useState<string | null>(null);
  const migrationBusyRef = useRef(false);
  const [migrationResults, setMigrationResults] = useState<Record<string, MigrationApplyStatus>>({});
  const [dismissedMigrations, setDismissedMigrations] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    setMigrationOpen(false);
    setMigrationResults({});
    setDismissedMigrations(new Set());
  }, [user?.id]);
  const migrationPlans = useMemo(() => user?.id ? previewTaskScheduleMigration(user.id, live) : [], [user?.id, live, settings]);
  const reviewableMigrations = migrationPlans.filter((p) => p.state === "ready" || p.state === "conflict");
  const { reviews, loaded: reviewsLoaded } = usePlanReviews(user?.id);
  const prevP = prevPeriod(period, settings);
  const due = useMemo(() => (isCurrent ? reviewDue(reviews, !!user?.id && reviewsLoaded, period, prevP, itemsInPeriod(live, prevP, settings).length > 0, new Date(), settings.calendar) : null), [isCurrent, user?.id, reviewsLoaded, period, live, settings, reviews]); // eslint-disable-line react-hooks/exhaustive-deps
  const reviewItems = useMemo(() => (reviewP ? itemsInPeriod(live, reviewP, settings) : []), [reviewP, live, settings]);

  const ratio = counted.length ? counted.filter(isDone).length / counted.length : 0;
  const doneCount = counted.filter(isDone).length;
  const [busy, setBusy] = useState(false);
  const num = (n: number) => (fa ? toPersianDigits(n) : String(n));
  const nowName = NOW_LABEL[lv][lang];
  const targetName = isCurrent ? nowName : periodLabel(period, settings, lang);
  const unresolvedMigrations = reviewableMigrations.filter((p) => {
    const key = `${p.uid}:${p.taskId}`;
    return !dismissedMigrations.has(key) && migrationResults[key] !== "saved" && migrationResults[key] !== "already_migrated";
  });

  const migrationIssueText = (issue: MigrationIssue) => {
    const faText: Record<MigrationIssue, string> = {
      conflicting_exact_values: "چند مقدار قدیمیِ روز یا ساعت با هم فرق دارند.",
      conflicting_period_values: "چند بازهٔ قدیمی با هم سازگار نیستند.",
      ambiguous_legacy_time: "ساعت مرزی قدیمی ممکن است روز باشد یا ساعت دقیق.",
      ambiguous_due_at_flag: "پرچم زمان قدیمی برای تعیین معنای ساعت کافی نیست.",
      outside_period: "روز یا ساعت بیرون از بازهٔ برنامه‌ریزی است.",
      unknown_timezone: "منطقهٔ زمانی این ساعت مشخص نیست.",
      invalid_timezone: "منطقهٔ زمانی ذخیره‌شده معتبر نیست.",
      invalid_calendar: "تقویم ذخیره‌شده معتبر نیست.",
      invalid_schedule_value: "یکی از فیلدهای تاریخ یا بازه مقدار نامعتبر دارد.",
      unsupported_schedule_version: "نسخهٔ مدل زمان‌بندی پشتیبانی نمی‌شود.",
    };
    const enText: Record<MigrationIssue, string> = {
      conflicting_exact_values: "Legacy day/time values disagree.",
      conflicting_period_values: "Legacy planning ranges disagree.",
      ambiguous_legacy_time: "A boundary time could mean an all-day task or an exact time.",
      ambiguous_due_at_flag: "The legacy time flag does not establish the meaning of this value.",
      outside_period: "The day or time falls outside its planning period.",
      unknown_timezone: "The time zone for this instant is unknown.",
      invalid_timezone: "The stored time zone is invalid.",
      invalid_calendar: "The stored calendar is invalid.",
      invalid_schedule_value: "A legacy date or range field is malformed.",
      unsupported_schedule_version: "This schedule version is not supported for migration.",
    };
    return (fa ? faText : enText)[issue];
  };
  const applyMigration = async (migration: ScheduleMigrationPlan) => {
    if (migrationBusyRef.current || !user?.id || migration.uid !== user.id) return;
    migrationBusyRef.current = true;
    const migrationKey = `${migration.uid}:${migration.taskId}`;
    setMigrationBusy(migrationKey);
    try {
      const status = await applyTaskScheduleMigration(migration);
      setMigrationResults((all) => ({ ...all, [migrationKey]: status }));
      if (status === "saved" || status === "already_migrated") {
        toast.success(fa ? "زمان‌بندی این تسک به‌روزرسانی شد" : "Task schedule updated");
        window.dispatchEvent(new Event("tasks-changed"));
        onCreated?.();
      } else if (status === "conflict") {
        toast.error(fa ? "تسک تغییر کرده؛ پیش‌نمایش را دوباره بازبینی کن" : "Task changed; review its preview again");
        window.dispatchEvent(new Event("tasks-changed"));
        onCreated?.();
      } else if (status === "offline") {
        toast.info(fa ? "برای اجرای تبدیل به اینترنت وصل شو؛ چیزی در صف قرار نگرفت" : "Reconnect to apply this conversion; nothing was queued");
      } else {
        toast.error(fa ? "تبدیل ذخیره نشد؛ دوباره تلاش کن" : "Conversion failed; retry when ready");
      }
    } finally { migrationBusyRef.current = false; setMigrationBusy(null); }
  };

  const setLevel = (h: Horizon) => {
    const focus = isCurrent ? new Date() : fromLocalISO(period.start);
    setAnchor(isCurrent ? null : periodFor(h, focus, settings).start);
    setLevelState(h); localStorage.setItem(LEVEL_KEY, h); setPane("main"); haptic("light");
  };
  const go = (dir: 1 | -1) => { setAnchor((dir === 1 ? nextPeriod(period, settings) : prevPeriod(period, settings)).start); haptic("light"); };

  const create = async (title: string, p: Period, parent?: Task, extra?: Partial<Task>, intentId = newId()): Promise<TaskPersistenceStatus> => {
    if (!user?.id || !title.trim()) return "failed";
    if (parent && !validateTaskParentLink(live, intentId, parent.id, "plan_parent_id").valid) {
      toast.error(fa ? "ارتباط هدف نامعتبر است؛ این تسک به هدف پیوند نخورد." : "Invalid planning-goal link; the task was not attached.");
      return "failed";
    }
    const now = new Date().toISOString();
    const task = {
      id: intentId, user_id: user.id, title: title.trim(), priority: "none", completed: false, status: "todo",
      parent_id: null, position: 0, created_at: now, updated_at: now,
      folder_id: parent ? parent.folder_id ?? null : defaults?.folder_id ?? null,
      ...planPatch(p, settings, parent ? parent.id : null),
      ...extra,
    } as Task;
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await persistTask(user.id, task)); }
    catch { status = "failed"; }
    const where = readSchedule(task, settings);
    reportSave(status, fa, fa ? `به «${scheduleLabel(where, settings, lang)}» اضافه شد` : `Added to ${scheduleLabel(where, settings, lang)}`);
    if (status === "failed") return status;
    window.dispatchEvent(new Event("tasks-changed"));
    onCreated?.();
    haptic("light");
    return status;
  };
  const plan = async (t: Task, p: Period | null, parentId?: string | null, success?: string): Promise<TaskPersistenceStatus> => {
    if (parentId !== undefined && !validateTaskParentLink(live, t.id, parentId, "plan_parent_id").valid) {
      toast.error(fa ? "این پیوند هدف باعث چرخه می‌شود و ذخیره نشد." : "This planning-goal link would create a cycle and was not saved.");
      return "failed";
    }
    haptic("light");
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onUpdate(t.id, planPatch(p, settings, parentId))); }
    catch { status = "failed"; }
    reportSave(status, fa, success);
    return status;
  };
  /** Next period of the same kind; a custom range keeps its length and starts the day after it ends. */
  const moveNext = (t: Task): Promise<TaskPersistenceStatus> => { const p = planOf(t, settings) || period; return plan(t, nextPlanPeriod(p, settings), undefined, fa ? "به دورهٔ بعد رفت" : "Moved to next period"); };
  const moveAll = async (list: Task[]) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    const results: TaskPersistenceStatus[] = [];
    try {
      for (const t of list) {
        try { results.push(toSaveStatus(await onUpdate(t.id, planPatch(period, settings)))); }
        catch { results.push("failed"); }
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
    const failed = results.filter((r) => r === "failed").length;
    const queued = results.filter((r) => r === "queued").length;
    const saved = results.filter((r) => r === "saved").length;
    if (failed || queued) {
      const summary = fa
        ? `${toPersianDigits(saved)} ذخیره شد، ${toPersianDigits(queued)} در صف همگام‌سازی، ${toPersianDigits(failed)} ناموفق`
        : `${saved} saved, ${queued} queued to sync, ${failed} failed`;
      if (failed) toast.error(summary);
      else toast.info(summary);
    } else toast.success(fa ? `${toPersianDigits(saved)} مورد به «${targetName}» آمد` : `${saved} item(s) moved to ${targetName}`);
  };
  const submitDraft = async () => {
    const title = draft.trim();
    if (!title || busyRef.current) return;
    const intent = getTaskCreateIntent(quickAddIntent, `quick:${user?.id || ""}:${period.horizon}:${period.start}:${period.end}:${title}`);
    busyRef.current = true;
    setBusy(true);
    let status: TaskPersistenceStatus;
    try { status = await create(title, period, undefined, undefined, intent.id); }
    catch { status = "failed"; }
    finally { busyRef.current = false; setBusy(false); }
    if (status !== "failed") {
      clearTaskCreateIntent(quickAddIntent, intent);
      setDraft((cur) => (cur.trim() === title ? "" : cur));
    }
  };
  const complete = (t: Task) => { if (!isClosed(t)) void onToggle(t); };
  const continueTask = async (t: Task): Promise<TaskPersistenceStatus> => {
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onUpdate(t.id, { status: "in_progress", completed: false, waiting_reason: null })); }
    catch { status = "failed"; }
    reportSave(status, fa, fa ? "ادامهٔ کار ثبت شد" : "Work continued");
    return status;
  };
  const markWaiting = async (t: Task, reason?: string): Promise<TaskPersistenceStatus> => {
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onUpdate(t.id, { status: "waiting", completed: false, waiting_reason: reason?.trim() || null })); }
    catch { status = "failed"; }
    reportSave(status, fa, fa ? "در انتظار ثبت شد" : "Marked waiting");
    return status;
  };
  const setAside = async (t: Task): Promise<TaskPersistenceStatus> => {
    let status: TaskPersistenceStatus;
    try { status = toSaveStatus(await onUpdate(t.id, { status: "wont_do", completed: false })); }
    catch { status = "failed"; }
    reportSave(status, fa, fa ? "کنار گذاشته شد" : "Set aside");
    return status;
  };

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
          {unresolvedMigrations.length > 0 && <button type="button" onClick={() => setMigrationOpen(true)} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs text-amber-700 hover:bg-amber-500/10 dark:text-amber-300" title={fa ? "بررسی زمان‌بندی قدیمی در محدودهٔ همین نما" : "Review legacy schedules in this view"} aria-label={fa ? `بررسی زمان‌بندی قدیمی، ${num(unresolvedMigrations.length)} مورد` : `Review ${unresolvedMigrations.length} legacy schedules`} data-testid="planning-schedule-migration-open">
            <CalendarClock className="h-3.5 w-3.5" /><span className="hidden md:inline">{fa ? "زمان قدیمی" : "Legacy time"}</span><span className="rounded-full bg-amber-500/15 px-1.5 tabular-nums">{num(unresolvedMigrations.length)}</span>
          </button>}
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
            <span className="whitespace-nowrap text-[11px] tabular-nums text-muted-foreground" data-testid="planning-progress-text">{frac(doneCount, counted.length, fa)}</span>
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
        <div className={cn("min-w-0 space-y-3", pane !== "main" && "hidden lg:block")} onTouchStart={(e) => { touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }} onTouchEnd={onTouchEnd} data-testid="planning-main">
          {due && (
            <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-gradient-to-l from-amber-500/10 to-transparent p-3" data-testid="planning-review-banner">
              <Sparkles className="h-4 w-4 shrink-0 text-amber-500" />
              <p className="min-w-0 flex-1 text-sm">{fa ? `وقت مرور «${periodLabel(due, settings, lang)}» است — کمتر از دو دقیقه.` : `Time to review ${periodLabel(due, settings, lang)} — under two minutes.`}</p>
              <button type="button" onClick={() => setReviewP(due)} className="h-8 shrink-0 rounded-full bg-foreground px-3 text-xs font-medium text-background" data-testid="planning-review-start">{fa ? "شروع مرور" : "Start"}</button>
            </div>
          )}
          <CarryOverCard tasks={carried} settings={settings} fa={fa} onMoveHere={(t) => plan(t, period, undefined, fa ? `به «${targetName}» آمد` : `Moved to ${targetName}`)} onComplete={complete}
            onDrop={(t) => plan(t, null)} onMoveAll={() => void moveAll(carried)} busy={busy} />
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); void submitDraft(); }}>
            <input value={draft} onChange={(e) => setDraft(e.target.value)} data-testid="planning-quick-add"
              placeholder={fa ? `افزودن به ${targetName}…` : `Add to ${targetName}…`}
              className="h-11 min-w-0 flex-1 rounded-xl border border-border bg-card px-4 text-sm outline-none transition-shadow focus:ring-2 focus:ring-primary/30" />
            <button type="submit" disabled={!draft.trim() || busy} className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-primary-foreground disabled:opacity-40" aria-label={fa ? "افزودن" : "Add"} data-testid="planning-quick-add-submit"><CornerDownLeft className="h-4 w-4" /></button>
          </form>
          {rows.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm leading-7 text-muted-foreground" data-testid="planning-empty">
              {fa ? `برای ${targetName} هنوز چیزی برنامه‌ریزی نشده.` : `Nothing planned for ${targetName} yet.`}
              {up && <span className="block text-xs">{fa ? `از ستون «از ${LEVEL_NAME[up].fa}» یک هدف بیاور، یا بالا یک مورد تازه بنویس.` : `Pull a goal from the ${LEVEL_NAME[up].en.toLowerCase()} column, or type a new item above.`}</span>}
            </div>
          ) : (
            <div className="space-y-2" data-testid="planning-items">
              {rows.map((t) => (
                <PlanItemCard key={t.id} task={t} kids={kids} byId={byId} settings={settings} fa={fa} childLevelName={down} valueLabel={valueLabel(t)}
                onToggle={(x) => void onToggle(x)} onOpen={onOpen} onMoveNext={moveNext} onUnplan={(x) => plan(x, null, undefined, fa ? "از برنامه برداشته شد" : "Removed from the plan")}
                  onSetFinishCriterion={async (x, criterion) => {
                    try { return toSaveStatus(await onUpdate(x.id, { finish_criterion: criterion })); }
                    catch { return "failed"; }
                  }}
                  onAddChild={down ? (parent, title, intentId) => create(title, defaultChildPeriod(planOf(parent, settings) || period, down, settings), parent, undefined, intentId) : undefined} />
              ))}
            </div>
          )}
          {lv === "week" && <WeekDays period={period} tasks={live} settings={settings} fa={fa} onPick={(d) => { setLevelState("day"); localStorage.setItem(LEVEL_KEY, "day"); setAnchor(d); }} />}
        </div>
        <PeriodReviewDialog key={reviewP ? `${user?.id}:${reviewP.horizon}:${reviewP.start}:${reviewP.end}:${settings.calendar}` : "none"} period={reviewP} items={reviewItems} settings={settings} fa={fa} onClose={() => setReviewP(null)} reviews={reviews}
          onMove={(t, p) => plan(t, p, undefined, fa ? "منتقل شد" : "Moved")} onDrop={(t) => plan(t, null)} onComplete={complete} onAdd={(title, p, intentId) => create(title, p, undefined, undefined, intentId)}
          onContinue={continueTask} onWaiting={markWaiting} onSetAside={setAside} />
        <Dialog open={migrationOpen} onOpenChange={setMigrationOpen}>
          <DialogContent className="max-h-[82vh] max-w-xl overflow-y-auto rounded-3xl" dir={fa ? "rtl" : "ltr"} data-testid="planning-schedule-migration-dialog">
            <DialogHeader className="space-y-1 text-start">
              <DialogTitle className="flex items-center gap-2 text-lg"><CalendarClock className="h-4 w-4 text-amber-500" />{fa ? "بررسی زمان‌بندی‌های قدیمی" : "Review legacy schedules"}</DialogTitle>
              <DialogDescription>{fa ? "محدودهٔ همین نمای برنامه‌ریزی؛ فقط موارد آماده را جداگانه تبدیل کن. موردهای مبهم را می‌توانی باز کنی یا فعلاً رد کنی." : "Scoped to tasks loaded in this planning view. Apply ready items one at a time; open or dismiss ambiguous items."}</DialogDescription>
            </DialogHeader>
            <p className="text-xs text-muted-foreground" data-testid="planning-schedule-migration-scope">{fa ? `آماده: ${num(unresolvedMigrations.filter((p) => p.state === "ready").length)} · نیازمند بررسی: ${num(unresolvedMigrations.filter((p) => p.state === "conflict").length)}` : `${unresolvedMigrations.filter((p) => p.state === "ready").length} ready · ${unresolvedMigrations.filter((p) => p.state === "conflict").length} need review`}</p>
            {unresolvedMigrations.length === 0 ? <p className="rounded-xl bg-muted/40 p-3 text-sm text-muted-foreground">{fa ? "مورد بازی برای بررسی در این نما نیست." : "No open items in this view."}</p> : (
              <div className="space-y-2">
                {unresolvedMigrations.map((migration) => {
                  const migrationKey = `${migration.uid}:${migration.taskId}`;
                  const task = byId.get(migration.taskId);
                  const result = migrationResults[migrationKey];
                  const title = task?.title || migration.taskId;
                  return <article key={`${migration.uid}:${migration.taskId}`} className="space-y-2 rounded-2xl border border-border/70 p-3" data-testid={`planning-schedule-migration-${migration.taskId}`}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{title}</p>
                      <p className="text-[11px] text-muted-foreground">{migration.proposed ? (fa ? `پیشنهاد خواندنی: ${scheduleLabel(migration.proposed, settings, lang)}` : `Read-only proposal: ${scheduleLabel(migration.proposed, settings, lang)}`) : (fa ? "مقدار خودکار پیشنهاد نمی‌شود" : "No automatic value is proposed")}</p>
                    </div>
                    {migration.state === "conflict" && <ul className="space-y-1 text-xs text-amber-800 dark:text-amber-200">{migration.issues.map((issue) => <li key={issue}>{migrationIssueText(issue)}</li>)}</ul>}
                    {result === "saved" || result === "already_migrated" ? <p role="status" className="text-xs text-emerald-700 dark:text-emerald-300">{fa ? "تبدیل شد؛ فهرست تسک‌ها در حال تازه‌شدن است." : "Applied; task list is refreshing."}</p>
                      : result === "offline" ? <p role="status" className="text-xs text-muted-foreground">{fa ? "آفلاین هستی؛ تبدیل در صف قرار نگرفت." : "Offline; the migration was not queued."}</p>
                        : result === "failed" || result === "conflict" ? <p role="status" className="text-xs text-destructive">{fa ? "ذخیره نشد یا تسک تغییر کرده؛ دوباره پیش‌نمایش بگیر." : "Save failed or the task changed; refresh the preview."}</p> : null}
                    <div className="flex flex-wrap gap-2">
                      {migration.state === "ready" && <button type="button" disabled={migrationBusy !== null} className="h-8 rounded-full bg-primary px-3 text-xs font-medium text-primary-foreground disabled:opacity-50" onClick={() => void applyMigration(migration)} data-testid={`planning-schedule-migration-apply-${migration.taskId}`}>
                        {migrationBusy === migrationKey ? (fa ? "در حال ذخیره…" : "Saving…") : result === "failed" || result === "offline" || result === "conflict" ? (fa ? "تلاش دوباره" : "Retry") : (fa ? "تبدیل همین تسک" : "Apply this task")}
                      </button>}
                      {migration.state === "conflict" && <button type="button" disabled={!task} className="h-8 rounded-full border border-border px-3 text-xs hover:bg-muted disabled:opacity-50" onClick={() => { setMigrationOpen(false); if (task) onOpen(task); }} data-testid={`planning-schedule-migration-open-task-${migration.taskId}`}>{fa ? "بازکردن تسک برای اصلاح" : "Open task to resolve"}</button>}
                      {migration.state === "conflict" && <button type="button" className="h-8 rounded-full px-3 text-xs text-muted-foreground hover:bg-muted" onClick={() => setDismissedMigrations((all) => new Set(all).add(migrationKey))} data-testid={`planning-schedule-migration-dismiss-${migration.taskId}`}>{fa ? "فعلاً رد کردن" : "Dismiss for now"}</button>}
                    </div>
                  </article>;
                })}
              </div>
            )}
          </DialogContent>
        </Dialog>
        <aside className={cn("space-y-3", pane === "main" && "hidden lg:block")}>
          {up && parentPeriod && (
            <div className={cn(pane === "unplanned" && "hidden lg:block")}>
              <UpperLevelPanel parentPeriod={parentPeriod} items={upperItems} kids={kids} current={period} settings={settings} fa={fa} onOpen={onOpen}
                onPull={(parent, title, intentId) => create(title, period, parent, undefined, intentId)} onMoveHere={(t) => plan(t, period)} />
            </div>
          )}
          {lv === "year" && (
            <div className={cn(pane === "unplanned" && "hidden lg:block")}>
              <ValuesGoalsPanel goals={goals} status={goalsStatus} tasks={live} year={period} settings={settings} fa={fa} onAdd={(g, intentId) => create(g.text, period, undefined, { source_type: "values_goal", source_id: g.id }, intentId)} />
            </div>
          )}
          <div className={cn(pane === "upper" && "hidden lg:block")}>
            <UnplannedTray tasks={loose} fa={fa} targetName={targetName} onOpen={onOpen} onAssign={(t) => plan(t, period, undefined, fa ? `به «${targetName}» اضافه شد` : `Added to ${targetName}`)} />
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
          const counted = list.filter((task) => task.status !== "wont_do");
          const done = counted.filter(isDone).length;
          const date = fromLocalISO(d);
          return (
            <button key={d} type="button" onClick={() => onPick(d)} data-testid={`planning-week-day-${d}`}
              className={cn("flex flex-col items-center gap-0.5 rounded-xl py-2 text-xs transition-colors duration-150 hover:bg-muted", d === today && "bg-rose-500/10 ring-1 ring-rose-500/40")}>
              <span className="text-[10px] text-muted-foreground">{fa ? FA_WEEKDAY[date.getDay()] : gFormat(date, "EEEEE")}</span>
              <span className="text-sm font-semibold">{jal ? toPersianDigits(jFormat(date, "d")) : gFormat(date, "d")}</span>
              <span className="text-[10px] tabular-nums text-muted-foreground">{counted.length ? frac(done, counted.length, fa) : "·"}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
