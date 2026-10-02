import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import {
  Activity,
  BookOpen,
  Zap,
  MessageCircleQuestion,
  TrendingUp,
  Heart,
  Brain,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Compass,
  Wind,
  ClipboardCheck,
  Sparkles,
  ShieldAlert,
  Pin,
  PinOff,
  SlidersHorizontal,
  Layers,
  ChevronDown,
} from "lucide-react";
import { loadSettings, type UserSettings } from "@/lib/reminders";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";
import { getLocalDateString } from "@/lib/taskDate";
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
import { MindTrendCharts } from "./mind/MindTrendCharts";

const MIND_SOURCES = ["cbt_thought", "abc_model", "worry_tree"];

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
  const { T, isEn } = useBilingual();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [topDistortions, setTopDistortions] = useState<{ key: string; n: number }[]>([]);
  const [abcCount, setAbcCount] = useState(0);

  const [streak, setStreak] = useState(0);
  const [undatedMindTasks, setUndatedMindTasks] = useState(0);
  const [metric, setMetric] = useState<"mood" | "energy" | "focus" | "stress">("mood");
  const [legacySession, setLegacySession] = useState<{ messages: { role: string; content: string }[]; updated_at?: string } | null>(null);
  const [showStreak, setShowStreak] = useState(true);
  const [latestScreeners, setLatestScreeners] = useState<Record<string, any>>({});
  const [settings, setSettings] = useState<UserSettings | null>(null);

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

  useEffect(() => {
    if (!user) return;
    return subscribeSocraticSession(user.id, (sess) => setLegacySession(sess && sess.messages?.length ? (sess as never) : null));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    loadSettings(user.id).then((s) => {
      setSettings(s);
      if (s?.streak_enabled !== undefined) {
        setShowStreak(s.streak_enabled);
      }
    });
  }, [user]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const since90 = getLocalDateString(new Date(Date.now() - 90 * 86400000));
      const since30iso = new Date(Date.now() - 30 * 86400000).toISOString();
      const since7iso = new Date(Date.now() - 7 * 86400000).toISOString();

      const [
        { data: ck },
        { data: tr },
        { count: ac },
        { data: scr },
        { data: mindTasks },
      ] = await Promise.all([
        firebaseStore
          .from("daily_checkins")
          .select("checkin_date,mood,energy,focus,stress,sleep_quality")
          .eq("user_id", user.id)
          .gte("checkin_date", since90)
          .order("checkin_date"),
        firebaseStore
          .from("thought_records")
          .select("distortions,created_at")
          .eq("user_id", user.id)
          .gte("created_at", since30iso),
        firebaseStore
          .from("abc_records")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", since30iso),
        firebaseStore
          .from("assessment_results")
          .select("assessment_type, scores, analysis, completed_at")
          .eq("user_id", user.id)
          .in("assessment_type", ["phq9", "gad7", "who5", "burnout"])
          .order("completed_at", { ascending: false }),
        firebaseStore
          .from("tasks")
          .select("id, completed, source_type, completed_at, feedback")
          .eq("user_id", user.id)
          .eq("completed", true),
      ]);

      setCheckins((ck || []) as Checkin[]);
      setThoughtCount((tr || []).length);
      setAbcCount(ac || 0);

      // Latest result per screener
      const map: Record<string, any> = {};
      (scr || []).forEach((r: any) => {
        if (!map[r.assessment_type]) map[r.assessment_type] = r;
      });
      setLatestScreeners(map);

      // Top distortions
      const counts: Record<string, number> = {};
      (tr || []).forEach((r: any) =>
        (r.distortions || []).forEach((d: string) => {
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
      const todayLocalDate = getLocalDateString(new Date());
      const hasToday = dates.has(todayLocalDate);
      const startOffset = hasToday ? 0 : 1;
      for (let i = startOffset; i < 90; i++) {
        const d = getLocalDateString(new Date(Date.now() - i * 86400000));
        if (dates.has(d)) s++;
        else break;
      }
      setStreak(s);

      // Weekly tasks & feedback calculation (Client-Side, zero AI)
      const mindCompleted = (mindTasks || []).filter((t: any) => MIND_SOURCES.includes(t.source_type));
      const noTime = mindCompleted.filter((t: any) => !t.completed_at).length;
      setUndatedMindTasks(noTime);
      const completedList = mindCompleted.filter((t: any) => t.completed_at && t.completed_at >= since7iso);
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
    })();
  }, [user]);

  const todayStr = getLocalDateString(new Date());
  const today =
    checkins.find((c) => c.checkin_date === todayStr) ||
    (checkins.length ? checkins[checkins.length - 1] : null);
  const isToday = today?.checkin_date === todayStr;

  const thirtyDaysAgoStr = getLocalDateString(new Date(Date.now() - 30 * 86400000));
  const recentCheckins = useMemo(
    () => checkins.filter((c) => c.checkin_date >= thirtyDaysAgoStr),
    [checkins, thirtyDaysAgoStr]
  );

  const past7DaysLoggedCount = useMemo(() => {
    const sevenDaysAgo = getLocalDateString(new Date(Date.now() - 7 * 86400000));
    return checkins.filter((c) => c.checkin_date >= sevenDaysAgo).length;
  }, [checkins]);

  const trend = useMemo(
    () =>
      recentCheckins.map((c) => {
        const d = new Date(c.checkin_date);
        return {
          rawDate: c.checkin_date,
          date: formatDate(d, "d MMM"),
          fullDate: formatDate(d, "EEEE d MMMM yyyy"),
          mood: c.mood,
          energy: c.energy,
          focus: c.focus,
          stress: c.stress,
        };
      }),
    [recentCheckins]
  );

  // 90-day heatmap aligned to weeks
  const heatmap = useMemo(() => {
    const map = new Map<string, number>();
    checkins.forEach((c) => {
      const avg = [c.mood, c.energy, c.focus].filter((x): x is number => x != null);
      const v = avg.length ? avg.reduce((a, b) => a + b, 0) / avg.length / 10 : 0.4;
      map.set(c.checkin_date, v);
    });
    const days: { date: string; jalaliDate: string; intensity: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const dStr = getLocalDateString(new Date(Date.now() - i * 86400000));
      const dObj = new Date(dStr);
      days.push({
        date: dStr,
        jalaliDate: formatDate(dObj, "EEEE d MMMM"),
        intensity: map.get(dStr) ?? 0,
      });
    }
    return days;
  }, [checkins]);

  function prepareAiPayload() {
    const ctx = createMindAIContext({
      operation: "weekly_insight",
      promptVersion: "weekly_insight_v1.0",
      language: isEn ? "en" : "fa",
      tool: "mind_weekly_review",
      fields: {
        loggedDaysPastWeek: {
          value: `${past7DaysLoggedCount} / 7`,
          provenance: "deterministic_calculation",
        },
        mindTasksCompleted: {
          value: weeklyTasksCompleted,
          provenance: "deterministic_calculation",
        },
        feedback: {
          value: weeklyFeedbackStats,
          provenance: "deterministic_calculation",
        },
        topDistortions: {
          value: topDistortions.map((d) => d.key),
          provenance: "deterministic_calculation",
        },
      },
    });
    setAiPayloadPreview(formatContextForPrompt(ctx));
    setAiPreviewOpen(true);
  }

  async function executeAiAnalysis() {
    setAiAnalysisRunning(true);
    try {
      const ctx = createMindAIContext({
        operation: "weekly_insight",
        promptVersion: "weekly_insight_v1.0",
        language: isEn ? "en" : "fa",
        tool: "mind_weekly_review",
        fields: {
          loggedDaysPastWeek: {
            value: `${past7DaysLoggedCount} / 7`,
            provenance: "deterministic_calculation",
          },
          mindTasksCompleted: {
            value: weeklyTasksCompleted,
            provenance: "deterministic_calculation",
          },
          feedback: {
            value: weeklyFeedbackStats,
            provenance: "deterministic_calculation",
          },
          topDistortions: {
            value: topDistortions.map((d) => d.key),
            provenance: "deterministic_calculation",
          },
        },
      });

      const res = await executeMindAI<WeeklyInsightOutput>(ctx);
      const d = res.data;
      const formatted = `${d.logged_days_summary}\n\n${d.cautious_observation}\n\n• ${d.suggested_reflection_question}`;
      setAiAnalysisResult(formatted);
      setAiPreviewOpen(false);
      toast.success(T("تحلیل هفتگی آماده شد", "Weekly analysis ready"));
    } catch (e: any) {
      toast.error(e.message || T("خطا در ارتباط", "Error"));
    } finally {
      setAiAnalysisRunning(false);
    }
  }

  const metricLabels = { mood: T("خلق", "Mood"), energy: T("انرژی", "Energy"), focus: T("تمرکز", "Focus"), stress: T("استرس", "Stress") } as const;
  const points = trend.map((p) => p[metric]).map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => typeof p.v === "number");
  const W = 320, H = 110;
  const xy = (p: { v: number; i: number }) => `${trend.length > 1 ? (p.i / (trend.length - 1)) * W : W / 2},${H - ((p.v - 1) / 9) * (H - 10) - 5}`;
  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const fmt = (iso?: string) => (iso ? formatDate(new Date(iso), "d MMM yyyy") : "");
  const reviewed = weeklyFeedbackStats.totalWithFeedback;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--lg space-y-5 pb-24 animate-fade-in" data-testid="mind-trends">
      <HeaderTitlePortal title={T("روند و سنجش‌ها", "Trends & check-ups")} />
      <Link to="/app/mind" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        {isEn ? <ArrowLeft className="h-3.5 w-3.5" /> : <ArrowRight className="h-3.5 w-3.5" />}{T("ذهن", "Mind")}
      </Link>

      <Card className="space-y-3 p-4 sm:p-5" data-testid="mind-trend-chart">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{T("روند ۳۰ روز اخیر", "Last 30 days")}</h2>
          <div className="flex gap-1" role="group" aria-label={T("انتخاب شاخص", "Choose metric")}>
            {(Object.keys(metricLabels) as (keyof typeof metricLabels)[]).map((k) => (
              <button key={k} type="button" onClick={() => setMetric(k)} aria-pressed={metric === k} data-testid={`mind-metric-${k}`}
                className={`h-8 rounded-full border px-3 text-xs ${metric === k ? "border-primary bg-primary/10 font-semibold text-primary" : "border-border text-muted-foreground"}`}>
                {metricLabels[k]}
              </button>
            ))}
          </div>
        </div>
        {points.length > 1 ? (
          <svg viewBox={`0 0 ${W} ${H}`} className="h-32 w-full" role="img" aria-label={metricLabels[metric]} preserveAspectRatio="none">
            <polyline fill="none" stroke="hsl(var(--primary))" strokeWidth="2" strokeLinejoin="round" points={points.map(xy).join(" ")} />
            {points.map((p) => { const [x, y] = xy(p).split(","); return <circle key={p.i} cx={x} cy={y} r="2.5" fill="hsl(var(--primary))" />; })}
          </svg>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground" data-testid="mind-trend-empty">
            {T("برای نمایش روند، دست‌کم دو ثبت لازم است.", "At least two entries are needed to show a trend.")}
          </p>
        )}
        <p className="text-[11px] leading-5 text-muted-foreground">{T("این نمودار فقط داده‌های ثبت‌شدهٔ شما را نشان می‌دهد؛ تعداد ثبت‌ها به‌معنای بهتر شدن حال نیست.", "This chart only shows what you logged; more entries do not mean you are doing better.")}</p>
      </Card>

      <Card className="space-y-3 p-4 sm:p-5" data-testid="mind-weekly-review">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold">{T("مرور هفتگی", "Weekly review")}</h2>
          <Button variant="outline" size="sm" onClick={prepareAiPayload} className="h-8 text-xs" data-testid="mind-ai-weekly">
            <Sparkles className="me-1 h-3.5 w-3.5 text-primary" />{T("تحلیل با AI (پس از پیش‌نمایش)", "AI insight (after preview)")}
          </Button>
        </div>
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
        </ul>
        {undatedMindTasks > 0 && (
          <p className="text-[11px] leading-5 text-muted-foreground" data-testid="mind-undated-note">
            {T(`برای ${num(undatedMindTasks)} اقدام قدیمی زمان تکمیل ثبت نشده است؛ در این بازه شمرده نشده‌اند.`, `${undatedMindTasks} older action(s) have no completion time and are not counted here.`)}
          </p>
        )}
        {aiAnalysisResult && <p className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs leading-6 whitespace-pre-line">{aiAnalysisResult}</p>}
      </Card>

      <div data-testid="mind-screeners">
        <MindScreenersGrid latestScreeners={latestScreeners} isEn={isEn} T={T} />
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">{T("این پرسشنامه‌ها ابزار غربالگری هستند و تشخیص قطعی نیستند. برای ارزیابی دقیق با متخصص صحبت کنید.", "These questionnaires are screening aids, not a diagnosis. Talk to a professional for a proper assessment.")}</p>
      </div>

      <details className="surface-card p-4" data-testid="mind-trends-details">
        <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-semibold">
          {T("جزئیات بیشتر", "More details")}<ChevronDown className="h-4 w-4" />
        </summary>
        <div className="mt-4 space-y-4">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={showStreak} onChange={(e) => setShowStreak(e.target.checked)} />
            {T("نمایش روزهای متوالی", "Show consecutive days")}
          </label>
          <MindTrendCharts showStreak={showStreak} streak={streak} thoughtCount={thoughtCount} abcCount={abcCount} trend={trend} heatmap={heatmap} topDistortions={topDistortions} isEn={isEn} T={T} />
        </div>
      </details>

      {legacySession && (
        <details className="surface-card p-4" data-testid="mind-legacy-archive">
          <summary className="cursor-pointer text-sm font-semibold">{T("سوابق گفت‌وگوی قبلی (فقط خواندنی)", "Earlier conversation (read-only)")}</summary>
          <p className="mt-1 text-[11px] text-muted-foreground">{fmt(legacySession.updated_at)}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {legacySession.messages.map((m, i) => (
              <li key={i} className={`rounded-lg p-2 ${m.role === "user" ? "bg-muted/60" : "bg-primary/5"}`} dir="auto">{m.content}</li>
            ))}
          </ul>
        </details>
      )}

      <MindWeeklyInsightsDialog open={aiPreviewOpen} onOpenChange={setAiPreviewOpen} payloadPreview={aiPayloadPreview} onConfirm={executeAiAnalysis} loading={aiAnalysisRunning} T={T} />
    </div>
  );
}
