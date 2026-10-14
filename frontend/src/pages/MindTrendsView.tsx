import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { HelpfulTools } from "@/components/mind/HelpfulTools";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft,
  ArrowRight,
  Sparkles,
  ChevronDown,
} from "lucide-react";
import { loadSettings } from "@/lib/reminders";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toPersianDigits } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";
import { calendarCoordinate, datesInRange, localDateKey, mindDateLabel, mindDateRange, parseLocalDate, shiftLocalDay, timestampInRange, uniqueCheckins, validRating, validTimestamp, weeklyMindActions, MIND_ACTION_SOURCES, type MindRange, type MindMetric } from "@/lib/mind/dateRanges";
import {
  createMindAIContext,
  executeMindAI,
  formatContextForPrompt,
  type WeeklyInsightOutput,
} from "@/lib/mindAI";
import { toast } from "sonner";
import { subscribeSocraticSession } from "@/lib/firestoreDataService";
import { MindWeeklyInsightsDialog } from "./mind/MindWeeklyInsightsDialog";
import { MindScreenersGrid } from "./mind/MindScreenersGrid";
import { MindTrendCharts, MindMetricTable, heatmapScore, metricSegments, type MindHeatmapDay } from "./mind/MindTrendCharts";

type Checkin = {
  checkin_date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  stress: number | null;
  sleep_quality: number | null;
};

export default function MindTrendsView() {
  const { user } = useAuth();
  return <MindTrendsHome key={user?.id || "guest"} />;
}

function MindTrendsHome() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [topDistortions, setTopDistortions] = useState<{ key: string; n: number }[]>([]);
  const [abcCount, setAbcCount] = useState(0);

  const [streak, setStreak] = useState(0);
  const [undatedMindTasks, setUndatedMindTasks] = useState(0);
  const [searchParams, setSearchParams] = useSearchParams();
  const metric: MindMetric = ["mood", "energy", "focus", "stress"].includes(searchParams.get("metric") || "") ? searchParams.get("metric") as MindMetric : "mood";
  const rangeDays: MindRange = [7, 30, 90].includes(Number(searchParams.get("range"))) ? Number(searchParams.get("range")) as MindRange : 30;
  const updateFilter = (key: "metric" | "range", value: string) => setSearchParams((params) => { params.set(key, value); return params; }, { replace: true });
  const [loadState, setLoadState] = useState<"loading" | "ready" | "cache" | "failed" | "bounded">("loading");
  const [retry, setRetry] = useState(0);
  const clockKey = () => `${localDateKey(new Date())}|${Intl.DateTimeFormat().resolvedOptions().timeZone}|${new Date().getTimezoneOffset()}`;
  const [clock, setClock] = useState(clockKey);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLimit, setHistoryLimit] = useState(20);
  const [selectedChartDay, setSelectedChartDay] = useState<number | null>(null);
  const [legacySession, setLegacySession] = useState<{ messages: { role: string; content: string }[]; updated_at?: string } | null>(null);
  const [showStreak, setShowStreak] = useState(() => {
    try { return localStorage.getItem(`mind:show-streak:${user?.id}`) !== "0"; } catch { return true; }
  });
  const [streakSaveFailed, setStreakSaveFailed] = useState(false);
  const [latestScreeners, setLatestScreeners] = useState<Record<string, any>>({});
  const [invalidRecords, setInvalidRecords] = useState(0);
  const [statsNow, setStatsNow] = useState(() => new Date());

  // Weekly review client-side metrics
  const [weeklyTasksCompleted, setWeeklyTasksCompleted] = useState<number>(0);
  const [weeklyFeedbackStats, setWeeklyFeedbackStats] = useState<{
    helpful: number;
    somewhat: number;
    notHelpful: number;
    totalWithFeedback: number;
  }>({ helpful: 0, somewhat: 0, notHelpful: 0, totalWithFeedback: 0 });

  // AI payload preview modal
  const [aiPreviewOpen, setAiPreviewOpen] = useState(false);
  const [aiPayloadPreview, setAiPayloadPreview] = useState("");
  const [aiAnalysisRunning, setAiAnalysisRunning] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const approvedContextRef = useRef<{ owner: string; context: ReturnType<typeof createMindAIContext> } | null>(null);
  const ownerRef = useRef(user?.id);
  ownerRef.current = user?.id;
  const analysisRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const refresh = () => setClock(clockKey());
    const timer = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", refresh); document.removeEventListener("visibilitychange", refresh); };
  }, []);

  useEffect(() => {
    approvedContextRef.current = null;
    analysisRequestRef.current?.abort();
    analysisRequestRef.current = null;
    setAiPreviewOpen(false);
    setAiAnalysisRunning(false);
    setAiAnalysisResult(null);
    return () => analysisRequestRef.current?.abort();
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const unsubscribe = subscribeSocraticSession(user.id, (sess) => { if (active) setLegacySession(sess && sess.messages?.length ? (sess as never) : null); });
    return () => { active = false; unsubscribe(); };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    loadSettings(user.id).then((s) => {
      if (!active) return;
      try {
        const local = localStorage.getItem(`mind:show-streak:${user.id}`);
        setShowStreak(local === null ? s?.streak_enabled !== false : local === "1");
      } catch { setShowStreak(s?.streak_enabled !== false); }
    }).catch(() => { /* Keep the independently loaded device preference. */ });
    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) { setLoadState("failed"); return; }
    const controller = new AbortController();
    setLoadState("loading");
    approvedContextRef.current = null;
    analysisRequestRef.current?.abort();
    analysisRequestRef.current = null;
    setAiAnalysisRunning(false);
    setAiPreviewOpen(false);
    setAiAnalysisResult(null);
    setCheckins([]);
    setTopDistortions([]);
    setWeeklyTasksCompleted(0);
    setWeeklyFeedbackStats({ helpful: 0, somewhat: 0, notHelpful: 0, totalWithFeedback: 0 });
    (async () => {
      const now = new Date();
      const range90 = mindDateRange(90, now);
      const range30 = mindDateRange(30, now);
      const source = retry ? "server" as const : "default" as const;
      const results = await Promise.all([
        firebaseStore
          .from("daily_checkins")
          .select("checkin_date,mood,energy,focus,stress,sleep_quality", { source })
          .eq("user_id", user.id)
          .gte("checkin_date", range90.start)
          .lte("checkin_date", range90.end)
          .order("checkin_date").limit(1001),
        firebaseStore
          .from("thought_records")
          .select("distortions,created_at", { source })
          .eq("user_id", user.id)
          .gte("created_at", range30.startISO).lte("created_at", now.toISOString()).limit(1001),
        firebaseStore
          .from("abc_records")
          .select("*", { source })
          .eq("user_id", user.id)
          .gte("created_at", range30.startISO).lte("created_at", now.toISOString()).limit(1001),
        firebaseStore
          .from("assessment_results")
          .select("assessment_type, scores, analysis, completed_at", { source })
          .eq("user_id", user.id)
          .in("assessment_type", ["phq9", "gad7", "who5", "burnout"])
          .lte("completed_at", now.toISOString())
          .order("completed_at", { ascending: false }).limit(1001),
        firebaseStore
          .from("tasks")
          .select("id, completed, source_type, completed_at, feedback", { source })
          .eq("user_id", user.id)
          .eq("completed", true).in("source_type", [...MIND_ACTION_SOURCES]).limit(1001),
      ]);

      if (controller.signal.aborted) return;
      if (results.some((result) => result.error || !Array.isArray(result.data))) { setLoadState("failed"); return; }
      if (results.some((result) => (result.data?.length || 0) >= 1001)) { setLoadState("bounded"); return; }
      const [ckResult, trResult, abcResult, scrResult, tasksResult] = results;
      const ck = uniqueCheckins((ckResult.data || []) as Checkin[], range90).map((row) => ({ ...row, mood: validRating(row.mood) ? row.mood : null, energy: validRating(row.energy) ? row.energy : null, focus: validRating(row.focus) ? row.focus : null, stress: validRating(row.stress) ? row.stress : null }));
      const tr = (trResult.data || []).filter((row) => timestampInRange(row.created_at, range30));
      const abc = (abcResult.data || []).filter((row) => timestampInRange(row.created_at, range30));
      const scr = (scrResult.data || []).filter((row) => validTimestamp(row.completed_at) && Date.parse(row.completed_at) <= now.getTime());
      const mindTasks = tasksResult.data || [];
      setInvalidRecords((ckResult.data || []).filter((row) => !parseLocalDate(row.checkin_date || "")).length + (trResult.data || []).filter((row) => !validTimestamp(row.created_at)).length + (abcResult.data || []).filter((row) => !validTimestamp(row.created_at)).length + (scrResult.data || []).filter((row) => !validTimestamp(row.completed_at)).length);
      setStatsNow(now);
      setCheckins(ck);
      setThoughtCount((tr || []).length);
      setAbcCount(abc.length);

      // Latest result per screener
      const map: Record<string, any> = {};
      (scr || []).forEach((r: any) => {
        if (!map[r.assessment_type]) map[r.assessment_type] = r;
      });
      setLatestScreeners(map);

      // Top distortions
      const counts: Record<string, number> = {};
      (tr || []).forEach((r: any) =>
        (Array.isArray(r.distortions) ? r.distortions : []).forEach((d: string) => {
          counts[d] = (counts[d] || 0) + 1;
        })
      );
      setTopDistortions(
        Object.entries(counts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([key, n]) => ({ key, n }))
      );

      // Streak calculation (purely positive, no guilt)
      const dates = new Set((ck || []).map((c: any) => c.checkin_date));
      let s = 0;
      const todayLocalDate = localDateKey(now);
      const hasToday = dates.has(todayLocalDate);
      const startOffset = hasToday ? 0 : 1;
      for (let i = startOffset; i < 90; i++) {
        const d = localDateKey(shiftLocalDay(now, -i));
        if (dates.has(d)) s++;
        else break;
      }
      setStreak(s);

      // Weekly tasks & feedback calculation (Client-Side, zero AI)
      const { completed: completedList, undated } = weeklyMindActions(mindTasks, now);
      setUndatedMindTasks(undated);
      setWeeklyTasksCompleted(completedList.length);

      let h = 0,
        sw = 0,
        nh = 0,
        tot = 0;
      completedList.forEach((t: any) => {
        if (t.feedback === "helpful") {
          h++;
          tot++;
        } else if (t.feedback === "somewhat") {
          sw++;
          tot++;
        } else if (t.feedback === "not_helpful") {
          nh++;
          tot++;
        }
      });
      setWeeklyFeedbackStats({
        helpful: h,
        somewhat: sw,
        notHelpful: nh,
        totalWithFeedback: tot,
      });
      // Live-store results can lack freshness metadata: never treat unknown as verified server data.
      setLoadState(results.some((result) => result.fromCache !== false) ? "cache" : "ready");
    })().catch(() => { if (!controller.signal.aborted) setLoadState("failed"); });
    return () => { controller.abort(); };
  }, [user?.id, retry, clock]);

  const selectedRange = mindDateRange(rangeDays, statsNow);
  const recentCheckins = useMemo(
    () => uniqueCheckins(checkins, selectedRange),
    [checkins, selectedRange.start, selectedRange.end]
  );

  const past7DaysLoggedCount = useMemo(() => {
    return uniqueCheckins(checkins, mindDateRange(7, statsNow)).length;
  }, [checkins, statsNow]);

  const trend = useMemo(
    () =>
      recentCheckins.map((c) => {
        const d = parseLocalDate(c.checkin_date)!;
        return {
          rawDate: c.checkin_date,
          date: mindDateLabel(d, isEn),
          fullDate: mindDateLabel(d, isEn, true),
          mood: c.mood,
          energy: c.energy,
          focus: c.focus,
          stress: c.stress,
        };
      }),
    [recentCheckins, isEn]
  );

  // Selected range aligned to actual calendar weeks.
  const heatmap = useMemo(() => {
    const map = new Map(checkins.map((checkin) => [checkin.checkin_date, checkin]));
    const days: MindHeatmapDay[] = [];
    for (const dStr of datesInRange(selectedRange.start, selectedRange.end)) {
      const dObj = parseLocalDate(dStr)!;
      days.push({
        date: dStr,
        jalaliDate: mindDateLabel(dObj, isEn, true),
        ...heatmapScore(map.get(dStr), metric),
      });
    }
    return days;
  }, [checkins, metric, selectedRange.start, selectedRange.end, isEn]);

  function prepareAiPayload() {
    if (!user || aiAnalysisRunning || loadState !== "ready" || !past7DaysLoggedCount && !weeklyTasksCompleted) return;
    const ctx = createMindAIContext({
      operation: "weekly_insight",
      promptVersion: "weekly_insight_v1.0",
      language: isEn ? "en" : "fa",
      tool: "mind_weekly_review",
      fields: {
        reviewedRange: { value: { start: mindDateRange(7, statsNow).start, end: mindDateRange(7, statsNow).end }, provenance: "deterministic_calculation" },
        excludedUndatedActions: { value: undatedMindTasks, provenance: "deterministic_calculation" },
        excludedInvalidDates: { value: invalidRecords, provenance: "deterministic_calculation" },
        loggedDaysPastWeek: {
          value: `${past7DaysLoggedCount} / 7`,
          provenance: "deterministic_calculation",
        },
        mindTasksCompleted: {
          value: weeklyTasksCompleted,
          provenance: "deterministic_calculation",
        },
        feedback: {
          value: { ...weeklyFeedbackStats },
          provenance: "deterministic_calculation",
        },
      },
    });
    approvedContextRef.current = { owner: user.id, context: ctx };
    setAiPayloadPreview(formatContextForPrompt(ctx));
    setAiPreviewOpen(true);
  }

  async function executeAiAnalysis() {
    const approved = approvedContextRef.current;
    if (!approved || approved.owner !== ownerRef.current || analysisRequestRef.current || loadState !== "ready") return;
    const controller = new AbortController();
    analysisRequestRef.current = controller;
    setAiAnalysisRunning(true);
    try {
      const res = await executeMindAI<WeeklyInsightOutput>(approved.context, { signal: controller.signal, cacheScope: approved.owner });
      if (controller.signal.aborted || approved.owner !== ownerRef.current) return;
      const d = res.data;
      const formatted = [d.logged_days_summary, d.action_feedback_summary, d.cautious_observation, `• ${d.suggested_reflection_question}`].filter(Boolean).join("\n\n");
      setAiAnalysisResult(formatted);
      setAiPreviewOpen(false);
      toast.success(T("تحلیل هفتگی آماده شد", "Weekly analysis ready"));
    } catch (e: any) {
      if (!controller.signal.aborted && approved.owner === ownerRef.current) toast.error(e.message || T("خطا در ارتباط", "Error"));
    } finally {
      if (analysisRequestRef.current === controller) {
        analysisRequestRef.current = null;
        if (approved.owner === ownerRef.current) setAiAnalysisRunning(false);
      }
    }
  }

  const metricLabels = { mood: T("خلق", "Mood"), energy: T("انرژی", "Energy"), focus: T("تمرکز", "Focus"), stress: T("استرس", "Stress") } as const;
  const segments = metricSegments(trend, metric);
  const points = segments.flat();
  const W = 320, H = 110;
  const firstDate = calendarCoordinate(selectedRange.start);
  const lastDate = calendarCoordinate(selectedRange.end);
  const xy = (p: { timestamp: number; value: number }) => `${lastDate > firstDate ? ((p.timestamp - firstDate) / (lastDate - firstDate)) * W : W / 2},${H - ((p.value - 1) / 9) * (H - 10) - 5}`;
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const fmt = (iso?: string) => (iso && Number.isFinite(Date.parse(iso)) ? mindDateLabel(new Date(iso), isEn, true) : "");
  const reviewed = weeklyFeedbackStats.totalWithFeedback;
  const loaded = loadState === "ready" || loadState === "cache";

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-safe-bottom animate-fade-in" data-testid="mind-trends">
      <HeaderTitlePortal title={T("روند و سنجش‌ها", "Trends & check-ups")} />
      <Link to="/app/mind" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {isEn ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{T("ذهن", "Mind")}
      </Link>

      <div role="status" aria-live="polite" className="text-sm" data-testid="mind-load-status">
        {loadState === "loading" && T("در حال بارگذاری آمار…", "Loading your statistics…")}
        {loadState === "failed" && T("دریافت آمار ناموفق بود؛ این وضعیت به معنی نبود ثبت نیست.", "Statistics could not be loaded; this does not mean you have no entries.")}
        {loadState === "bounded" && T("حجم سوابق از حد این مرور بیشتر است؛ آمار ناقص نمایش داده نمی‌شود. مرور صفحه‌بندی‌شده هنوز در دسترس نیست.", "History exceeds this review’s read limit; incomplete totals are not shown. Paginated review is not yet available.")}
        {loadState === "cache" && T("این آمار از نسخهٔ ذخیره‌شده است یا تازه‌بودن آن تأیید نشده است. برای AI ابتدا دریافت تازه را امتحان کنید.", "These statistics are cached or their freshness is unverified. Refresh before requesting AI insight.")}
        {loadState === "ready" && !checkins.length && T("در ۹۰ روز اخیر ثبت حالی پیدا نشد.", "No check-ins found in the last 90 days.")}
        {loadState !== "loading" && <Button variant="outline" size="sm" className="ms-2" onClick={() => setRetry((value) => value + 1)}>{T("دریافت دوباره", "Retry")}</Button>}
      </div>
      {loaded && invalidRecords > 0 && <p role="status" className="text-xs">{T(`تاریخ ${num(invalidRecords)} رکورد ناقص یا نامعتبر است؛ در آمار تاریخ‌دار شمرده نشده‌اند.`, `${invalidRecords} record(s) have missing or invalid dates and are excluded from dated statistics.`)}</p>}

      {loaded && <Card className="space-y-3 p-4 sm:p-5" data-testid="mind-trend-chart">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{T(`روند ${toPersianDigits(rangeDays)} روز اخیر`, `Last ${rangeDays} days`)}</h2>
          <div className="flex gap-1" role="group" aria-label={T("بازهٔ مرور", "Review range")}>{([7, 30, 90] as const).map((days) => <button key={days} type="button" className="min-h-11 rounded border px-3 text-xs" aria-pressed={rangeDays === days} onClick={() => updateFilter("range", String(days))}>{num(days)} {T("روز", "days")}</button>)}</div>
          <div className="flex gap-1" role="group" aria-label={T("انتخاب شاخص", "Choose metric")}>
            {(Object.keys(metricLabels) as (keyof typeof metricLabels)[]).map((k) => (
              <button key={k} type="button" onClick={() => { updateFilter("metric", k); setSelectedChartDay(null); }} aria-pressed={metric === k} data-testid={`mind-metric-${k}`}
                className={`min-h-11 rounded-full border px-3 text-xs ${metric === k ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground"}`}>
                {metricLabels[k]}
              </button>
            ))}
          </div>
        </div>
        {points.length > 1 ? (
          <svg viewBox={`-20 -5 ${W + 30} ${H + 15}`} className="h-40 w-full" aria-label={`${metricLabels[metric]} · ${T("امتیاز ۱ تا ۱۰", "Ratings 1 to 10")}`} data-testid="mind-metric-chart">
            {[1, 5, 10].map((value) => <g key={value}><line x1="0" x2={W} y1={H - ((value - 1) / 9) * (H - 10) - 5} y2={H - ((value - 1) / 9) * (H - 10) - 5} stroke="hsl(var(--border))" /><text x="-18" y={H - ((value - 1) / 9) * (H - 10) - 2} fontSize="9" fill="currentColor">{num(value)}</text></g>)}
            {segments.filter((segment) => segment.length > 1).map((segment) => <polyline key={segment[0].timestamp} fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" points={segment.map(xy).join(" ")} />)}
            {points.map((p) => { const [x, y] = xy(p).split(","); const day = trend.find((entry) => calendarCoordinate(entry.rawDate) === p.timestamp); return <g key={p.timestamp}><circle cx={x} cy={y} r="3" fill="hsl(var(--primary))" /><circle cx={x} cy={y} r="10" fill="transparent" role="button" tabIndex={0} aria-label={`${day?.fullDate} · ${metricLabels[metric]}: ${num(p.value)}/10`} onClick={() => setSelectedChartDay(p.timestamp)} onFocus={() => setSelectedChartDay(p.timestamp)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedChartDay(p.timestamp); } }} className="cursor-pointer focus-visible:stroke-primary" /></g>; })}
          </svg>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="mind-trend-empty">
            {T("برای نمایش روند، دست‌کم دو ثبت لازم است.", "At least two entries are needed to show a trend.")}
          </p>
        )}
        <div className="flex justify-between text-[11px] text-muted-foreground"><span>{mindDateLabel(parseLocalDate(selectedRange.start)!, isEn)}</span><span>{mindDateLabel(parseLocalDate(selectedRange.end)!, isEn)}</span></div>
        {points.length > 0 && <label className="block space-y-1 text-xs">
          <span>{T("انتخاب روز نمودار", "Choose a chart day")}</span>
          <select className="block min-h-11 w-full rounded-md border bg-background px-2" value={selectedChartDay === null ? "" : String(selectedChartDay)} onChange={(event) => setSelectedChartDay(event.target.value ? Number(event.target.value) : null)}>
            <option value="">{T("یک روز را انتخاب کنید", "Select a day")}</option>
            {points.map((point) => <option key={point.timestamp} value={point.timestamp}>{trend.find((day) => calendarCoordinate(day.rawDate) === point.timestamp)?.fullDate} · {metricLabels[metric]}: {num(point.value)}/10</option>)}
          </select>
        </label>}
        <p aria-live="polite" className="text-xs">{selectedChartDay !== null && (() => { const day = trend.find((entry) => calendarCoordinate(entry.rawDate) === selectedChartDay); return day ? `${day.fullDate} · ${metricLabels[metric]}: ${num(day[metric]!)}/10` : ""; })()}</p>
        <MindMetricTable trend={trend} metrics={[metric]} isEn={isEn} T={T} />
        <p className="text-[11px] leading-5 text-muted-foreground">{T("این نمودار فقط داده‌های ثبت‌شدهٔ شما را نشان می‌دهد؛ تعداد ثبت‌ها به‌معنای بهتر شدن حال نیست.", "This chart only shows what you logged; more entries do not mean you are doing better.")}</p>
      </Card>}

      {loaded && <Card className="space-y-3 p-4 sm:p-5" data-testid="mind-weekly-review">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{T("مرور هفتگی", "Weekly review")}</h2>
          <Button variant="outline" size="sm" onClick={prepareAiPayload} disabled={loadState !== "ready" || aiAnalysisRunning || !past7DaysLoggedCount && !weeklyTasksCompleted} className="h-8 text-xs" data-testid="mind-ai-weekly">
            <Sparkles className="me-1 h-3.5 w-3.5 text-primary" />{T("تحلیل با AI (پس از پیش‌نمایش)", "AI insight (after preview)")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">{mindDateLabel(parseLocalDate(mindDateRange(7, statsNow).start)!, isEn)} — {mindDateLabel(parseLocalDate(mindDateRange(7, statsNow).end)!, isEn)}</p>
        <ul className="space-y-1.5 text-sm">
          <li data-testid="mind-weekly-days">{T("روزهای دارای ثبت", "Days with entries")}: <b>{num(past7DaysLoggedCount)}/{num(7)}</b></li>
          <li data-testid="mind-weekly-actions">
            {T("اقدام‌های انجام‌شدهٔ مرتبط با ذهن (۷ روز اخیر)", "Mind-related actions completed (7 days)")}: <b>{num(weeklyTasksCompleted)}</b>
            {" · "}
            <Link to="/app/smart?source=mind" className="text-primary hover:underline" data-testid="mind-actions-link">{T("مشاهده فهرست", "View list")}</Link>
          </li>
          <li>
            {T("بازخورد شما دربارهٔ مفیدبودن", "Your feedback on usefulness")}: {reviewed > 0
              ? <b>{T(`${num(weeklyFeedbackStats.helpful)} از ${num(reviewed)} مفید بود`, `${weeklyFeedbackStats.helpful} of ${reviewed} helpful`)}</b>
              : <span className="text-muted-foreground">{T("هنوز بازخوردی ثبت نشده", "No feedback yet")}</span>}
          </li>
          {reviewed > 0 && <li className="text-xs">{T("تاحدی مفید", "Somewhat helpful")}: {num(weeklyFeedbackStats.somewhat)} · {T("نامفید", "Not helpful")}: {num(weeklyFeedbackStats.notHelpful)}</li>}
        </ul>
        <p className="text-[11px] text-muted-foreground">{T("این بازخورد مربوط به اقدام‌های انجام‌شده است، نه اثربخشی ابزار یا بهبود حال؛ بی‌پاسخی به معنای مفیدبودن نیست.", "This feedback concerns completed actions, not tool effectiveness or improved wellbeing; no response does not mean helpful.")}</p>
        {undatedMindTasks > 0 && (
          <p className="text-[11px] leading-5 text-muted-foreground" data-testid="mind-undated-note">
            {T(`برای ${num(undatedMindTasks)} اقدام قدیمی زمان تکمیل ثبت نشده است؛ در این بازه شمرده نشده‌اند.`, `${undatedMindTasks} older action(s) have no completion time and are not counted here.`)}
          </p>
        )}
        {aiAnalysisResult && <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-6 whitespace-pre-line">{aiAnalysisResult}</p>}
      </Card>}

      <HelpfulTools key={user?.id || "guest"} ownerId={user?.id} />

      {loaded && <div data-testid="mind-screeners">
        <MindScreenersGrid latestScreeners={latestScreeners} isEn={isEn} T={T} />
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{T("این پرسشنامه‌ها ابزار غربالگری هستند و تشخیص قطعی نیستند. برای ارزیابی دقیق با متخصص صحبت کنید.", "These questionnaires are screening aids, not a diagnosis. Talk to a professional for a proper assessment.")}</p>
      </div>}

      {loaded && <details className="surface-card p-4" data-testid="mind-trends-details">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          {T("جزئیات بیشتر", "More details")}<ChevronDown className="h-4 w-4" />
        </summary>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={showStreak} onChange={(e) => {
              setShowStreak(e.target.checked);
              try { localStorage.setItem(`mind:show-streak:${user?.id}`, e.target.checked ? "1" : "0"); setStreakSaveFailed(false); }
              catch { setStreakSaveFailed(true); }
            }} />
            {T("نمایش روزهای متوالی (تنظیم این حساب روی این دستگاه)", "Show consecutive days (this account on this device)")}
          </label>
          {streakSaveFailed && <p role="status" className="text-xs">{T("تنظیم فقط برای این بار تغییر کرد؛ ذخیره روی دستگاه ناموفق بود.", "Changed for this visit only; the device setting could not be saved.")}</p>}
          <MindTrendCharts showStreak={showStreak} streak={streak} thoughtCount={thoughtCount} abcCount={abcCount} trend={trend} heatmap={heatmap} metric={metric} topDistortions={topDistortions} isEn={isEn} T={T} />
        </div>
      </details>}

      {legacySession && (
        <details className="surface-card p-4" data-testid="mind-legacy-archive" onToggle={(event) => setHistoryOpen(event.currentTarget.open)}>
          <summary className="cursor-pointer text-sm font-semibold">{T("سوابق گفت‌وگوی قبلی (فقط خواندنی)", "Earlier conversation (read-only)")}</summary>
          <p className="mt-1 text-[11px] text-muted-foreground">{fmt(legacySession.updated_at)}</p>
          {historyOpen && <><ul className="mt-3 space-y-2 text-sm">
            {legacySession.messages.slice(-historyLimit).map((m, i) => (
              <li key={i} className={`rounded-lg p-2 ${m.role === "user" ? "bg-muted/60" : "bg-primary/5"}`} dir="auto">{m.content}</li>
            ))}
          </ul>{legacySession.messages.length > historyLimit && <Button variant="outline" size="sm" onClick={() => setHistoryLimit((limit) => limit + 20)}>{T("نمایش ۲۰ پیام قدیمی‌تر", "Show 20 earlier messages")}</Button>}</>}
        </details>
      )}

      <MindWeeklyInsightsDialog open={aiPreviewOpen} onOpenChange={(open) => {
        if (!open) {
          analysisRequestRef.current?.abort();
          analysisRequestRef.current = null;
          setAiAnalysisRunning(false);
        }
        setAiPreviewOpen(open);
        if (!open) approvedContextRef.current = null;
      }} payloadPreview={aiPayloadPreview} onConfirm={executeAiAnalysis} loading={aiAnalysisRunning} T={T} />
    </div>
  );
}
