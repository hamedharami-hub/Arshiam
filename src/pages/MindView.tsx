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
import { MindWeeklyInsightsDialog } from "./mind/MindWeeklyInsightsDialog";
import { MindScreenersGrid } from "./mind/MindScreenersGrid";
import { MindTrendCharts } from "./mind/MindTrendCharts";

type Checkin = {
  checkin_date: string;
  mood: number | null;
  energy: number | null;
  focus: number | null;
  stress: number | null;
  sleep_quality: number | null;
};

export default function MindView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [thoughtCount, setThoughtCount] = useState(0);
  const [topDistortions, setTopDistortions] = useState<{ key: string; n: number }[]>([]);
  const [abcCount, setAbcCount] = useState(0);

  const [streak, setStreak] = useState(0);
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

  const tools = useMemo(
    () => [
      {
        to: "/app/checkin",
        title: T("Check-in روزانه", "Daily Check-in"),
        tag: T("ثبت ۱۰ ثانیه‌ای", "10s Log"),
        desc: T(
          "ثبت سریع خلق و انرژی (حالت سریع) یا تمرکز، استرس و خواب (حالت کامل).",
          "Quick mood & energy log (Quick mode) or full focus, stress & sleep tracking."
        ),
        icon: Activity,
        gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      },
      {
        to: "/app/thoughts",
        title: T("ثبت افکار (CBT)", "CBT Thought Log"),
        tag: T("بازسازی شناختی", "Cognitive Reframing"),
        desc: T(
          "مسیر ۵ مرحله‌ای: اتفاق ← فکر خودکار ← احساس ← شواهد ← برداشت متعادل‌تر.",
          "5-step path: Situation → Automatic thought → Emotion → Evidence → Balanced perspective."
        ),
        icon: BookOpen,
        gradient: "from-violet-500 via-purple-500 to-indigo-500",
        badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      },
      {
        to: "/app/abc",
        title: T("مدل رفتار (ABC)", "ABC Model"),
        tag: T("عادت‌ها و واکنش‌ها", "Habits & Triggers"),
        desc: T(
          "محرک ← باور آنی ← تفکیک احساس و رفتار. کشف الگوهای واقعی و واکنش جایگزین.",
          "Trigger → Immediate belief → Distinct emotion & behavior. Evidence-based patterns."
        ),
        icon: Zap,
        gradient: "from-amber-500 via-orange-500 to-red-500",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      {
        to: "/app/worry",
        title: T("حل نگرانی و مسئله", "Worry & Problem Solving"),
        tag: T("درخت نگرانی", "Worry Tree"),
        desc: T(
          "۳ مسیر: قابل اقدام، کنترل نسبی، یا خارج از کنترل. تایید تسک قبل از ساخت.",
          "3 paths: actionable, partially controllable, or uncontrollable. Explicit task confirmation."
        ),
        icon: Wind,
        gradient: "from-sky-500 via-blue-500 to-indigo-500",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      },
      {
        to: "/app/values",
        title: T("ارزش‌ها و اهداف (ACT)", "Values & Goals (ACT)"),
        tag: T("قطب‌نمای زندگی", "Life Compass"),
        desc: T(
          "شفاف‌سازی ارزش‌ها در ۱۰ حوزه زندگی، بررسی همسویی هفته گذشته و ثبت محدودیت‌ها.",
          "Clarify authentic values across 10 life domains, review past-week alignment & constraints."
        ),
        icon: Compass,
        gradient: "from-emerald-500 via-teal-500 to-cyan-500",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      {
        to: "/app/breathing",
        title: T("تمرین تنفس آرام‌بخش", "3D Breathing Practice"),
        tag: T("تنظیم سیستم عصبی", "Autonomic Relief"),
        desc: T(
          "الگوهای تنفس هدایت‌شده (مربعی، ۴-۷-۸ خواب و ۵-۵) با راهنمای بصری و صوتی.",
          "Guided calming breathing patterns (Box, 4-7-8 for sleep, Coherent 5-5) with sensory guidance."
        ),
        icon: Heart,
        gradient: "from-teal-500 via-cyan-500 to-sky-500",
        badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      },
      {
        to: "/app/socratic",
        title: T("چت و چالش سقراطی", "Socratic Dialogue (AI)"),
        tag: T("پرسشگری منطقی", "Logical Inquiry"),
        desc: T(
          "گفت‌وگوی هدایت‌شده با یک سؤال باز در هر بار، بدون قضاوت و بدون پیش‌فرض تناقض.",
          "Guided inquiry with one open-ended question at a time, curious and non-judgmental."
        ),
        icon: MessageCircleQuestion,
        gradient: "from-cyan-500 via-sky-500 to-blue-500",
        badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      },
    ],
    [T]
  );

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
          .select("id, completed, source_type, updated_at, feedback")
          .eq("user_id", user.id)
          .not("source_type", "is", null)
          .gte("updated_at", since7iso),
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
      const completedList = (mindTasks || []).filter((t: any) => t.completed);
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

  return (
    <div
      className="max-w-5xl mx-auto p-4 md:p-8 space-y-5 pb-20 animate-fade-in"
      dir={isEn ? "ltr" : "rtl"}
    >
      {/* Compact Hero Header */}
      <Card className="p-4 sm:p-5 border-border/70 bg-card/60 backdrop-blur-xs shadow-xs">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid place-items-center h-10 w-10 sm:h-12 sm:w-12 rounded-2xl bg-primary/10 text-primary shrink-0">
              <Brain className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold text-foreground truncate">
                {T("ذهن و بهزیستی روان", "Mind & Mental Well-being")}
              </h1>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {T(
                  "ابزارهای مبتنی بر علم شناختی-رفتاری (CBT و ACT) برای آرامش و وضوح ذهن.",
                  "Evidence-based CBT & ACT tools for clarity, calmness, and intentional living."
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <Link
              to="/app/crisis"
              className="inline-flex items-center gap-1.5 border border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-medium rounded-xl px-3 py-1.5 text-xs hover:bg-rose-500/20 transition shadow-xs"
              data-testid="mind-crisis-link"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>{T("پشتیبانی بحران (SOS)", "Crisis Support (SOS)")}</span>
            </Link>
            {isToday && today ? (
              <div className="flex items-center gap-2 text-xs bg-muted/60 px-3 py-1.5 rounded-full border border-border/60">
                <span className="flex items-center gap-1 text-rose-500 font-medium">
                  <Activity className="w-3.5 h-3.5" />
                  <span>{today.mood ?? "—"}/۱۰</span>
                </span>
                <span className="text-muted-foreground/40">·</span>
                <span className="flex items-center gap-1 text-amber-500 font-medium">
                  <Zap className="w-3.5 h-3.5" />
                  <span>{today.energy ?? "—"}/۱۰</span>
                </span>
                <Link to="/app/checkin" className="text-primary hover:underline font-semibold ms-1">
                  {T("ویرایش", "Edit")}
                </Link>
              </div>
            ) : (
              <Link
                to="/app/checkin"
                className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-medium rounded-xl px-3.5 py-1.5 text-xs sm:text-sm hover:bg-primary/90 transition shadow-xs active:scale-95"
              >
                <Activity className="w-3.5 h-3.5" />
                <span>{T("ثبت Check-in امروز", "Log Today's Check-in")}</span>
              </Link>
            )}
          </div>
        </div>
      </Card>

      {/* 3-Step Mind Pathway: Check-in -> Reframe/Solve -> Micro-action */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Step 1: Check-in */}
        <Link
          to="/app/checkin"
          className="group relative overflow-hidden rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-rose-500/20 grid place-items-center text-xs font-bold">۱</span>
                {T("ثبت حال", "Check-in")}
              </span>
              {isToday ? (
                <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30">
                  {T("ثبت شده ✓", "Logged ✓")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30 animate-pulse">
                  {T("شروع روز", "Start today")}
                </Badge>
              )}
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
              {T("حالم را ثبت کنم", "Log my mood & energy")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {T("۱۰ ثانیه برای آگاهی از خلق، استرس و تمرکز درونی.", "10 seconds to check in on mood, stress, and energy.")}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-rose-500/10 flex items-center justify-between text-xs text-rose-600 dark:text-rose-400 font-medium">
            <span>{isToday ? T("ویرایش یا مشاهده", "View or edit") : T("ثبت الان", "Check in now")}</span>
            {isEn ? <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />}
          </div>
        </Link>

        {/* Step 2: Thought / Worry */}
        <Link
          to="/app/thoughts"
          className="group relative overflow-hidden rounded-2xl border border-violet-500/20 bg-violet-500/5 hover:bg-violet-500/10 p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-violet-500/20 grid place-items-center text-xs font-bold">۲</span>
                {T("بررسی فکر / نگرانی", "Reframe / Solve")}
              </span>
              <Badge variant="outline" className="text-[10px] bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30">
                {T("CBT · نگرانی", "CBT · Worry")}
              </Badge>
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {T("فکری درگیرم کرده", "Something is on my mind")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {T("آزمون واقعیت فکر با شواهد یا تفکیک نگرانی با درخت تصمیم‌گیری.", "Test thoughts with evidence or triage worries with the Worry Tree.")}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-violet-500/10 flex items-center justify-between text-xs text-violet-600 dark:text-violet-400 font-medium">
            <span>{T("ثبت فکر یا نگرانی", "Log thought or worry")}</span>
            {isEn ? <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />}
          </div>
        </Link>

        {/* Step 3: Micro-action & Review */}
        <Link
          to="/app/today"
          className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 p-4 transition-all duration-200 hover:shadow-md flex flex-col justify-between"
        >
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-500/20 grid place-items-center text-xs font-bold">۳</span>
                {T("اقدام کوچک و اثر", "Action & Review")}
              </span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                {T("Today · تسک‌ها", "Today · Tasks")}
              </Badge>
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {T("اقدام کوچک و بررسی نتیجه", "Micro-action & review")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {T("اقدامات برخاسته از ذهن در Today قرار می‌گیرند تا اثربخشی آن‌ها را بسنجید.", "Mind-generated tasks land in Today so you can review their impact.")}
            </p>
          </div>
          <div className="mt-3 pt-2 border-t border-emerald-500/10 flex items-center justify-between text-xs text-emerald-600 dark:text-emerald-400 font-medium">
            <span>{T("مشاهده تسک‌های امروز", "View today's tasks")}</span>
            {isEn ? <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /> : <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />}
          </div>
        </Link>
      </div>

      {/* Segmented Tabs Navigation */}
      <Tabs defaultValue="tools" className="w-full space-y-4">
        <TabsList className="grid grid-cols-3 w-full max-w-md mx-auto h-12 p-1.5 bg-muted/60 dark:bg-muted/30 backdrop-blur-md rounded-2xl border border-border/40 shadow-xs">
          <TabsTrigger
            value="tools"
            className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer rounded-xl transition-all duration-200 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:font-bold"
          >
            <Brain className="w-4 h-4 text-primary" />
            <span>{T("ابزارها", "Tools")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="trends"
            className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer rounded-xl transition-all duration-200 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:font-bold"
          >
            <TrendingUp className="w-4 h-4 text-emerald-500" />
            <span>{T("مرور و روند", "Review & Trends")}</span>
          </TabsTrigger>
          <TabsTrigger
            value="screeners"
            className="text-xs sm:text-sm font-semibold gap-1.5 cursor-pointer rounded-xl transition-all duration-200 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs data-[state=active]:font-bold"
          >
            <ClipboardCheck className="w-4 h-4 text-sky-500" />
            <span>{T("پرسشنامه‌ها", "Screeners")}</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: TOOLS */}
        <TabsContent value="tools" className="space-y-4 mt-0 focus-visible:outline-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {tools.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={t.to}
                  to={t.to}
                  className="group rounded-2xl border border-border/60 bg-card/60 hover:bg-card p-4 sm:p-5 hover:shadow-md hover:border-primary/40 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`grid place-items-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr ${t.gradient} text-white shrink-0 shadow-xs`}>
                        <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                      </div>
                      <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${t.badgeClass}`}>
                        {t.tag}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-bold text-base text-foreground mb-1.5 group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{t.title}</span>
                        {isEn ? (
                          <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
                        ) : (
                          <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-transform shrink-0" />
                        )}
                      </h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </TabsContent>

        {/* Tab 2: TRENDS & WEEKLY REVIEW */}
        <TabsContent value="trends" className="space-y-4 mt-0 focus-visible:outline-none">
          {/* Weekly Review Card (Pure Client-side, zero AI required) */}
          <Card className="p-5 border-border/70 bg-gradient-to-br from-card/90 via-card/60 to-primary/5 shadow-xs space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2 text-foreground">
                  <Calendar className="w-4 h-4 text-primary" />
                  {T("مرور هفتگی (محاسبه ملموس کلاینت)", "Weekly Reflection (Client-Calculated)")}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {T(
                    "گزارش عینی از روزهای دارای ثبت و اقدامات انجام‌شده همراه با بازخورد واقعی شما:",
                    "Objective summary of logged days and completed actions with your actual feedback:"
                  )}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={prepareAiPayload}
                className="text-xs h-8"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary me-1" />
                {T("تحلیل هفتگی با AI (با پیش‌نمایش)", "AI Weekly Insight (with Preview)")}
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-card/70 border border-border/50 text-center space-y-1">
                <span className="text-xs text-muted-foreground">{T("روزهای دارای ثبت (۷ روز اخیر)", "Logged Days (Past 7)")}</span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {isEn ? `${past7DaysLoggedCount} / 7` : `${toPersianDigits(past7DaysLoggedCount)} از ۷ روز`}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/70 border border-border/50 text-center space-y-1">
                <span className="text-xs text-muted-foreground">{T("اقدامات انجام‌شده Mind", "Completed Mind Tasks")}</span>
                <div className="text-2xl font-bold font-mono text-foreground">
                  {isEn ? weeklyTasksCompleted : toPersianDigits(weeklyTasksCompleted)}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-card/70 border border-border/50 text-center space-y-1">
                <span className="text-xs text-muted-foreground">{T("اثربخشی اقدامات (بازخورد)", "Feedback on Actions")}</span>
                <div className="text-sm font-semibold text-foreground pt-1">
                  {weeklyFeedbackStats.totalWithFeedback > 0 ? (
                    isEn ? (
                      `${weeklyFeedbackStats.helpful} of ${weeklyFeedbackStats.totalWithFeedback} rated helpful`
                    ) : (
                      `از ${toPersianDigits(weeklyFeedbackStats.totalWithFeedback)} اقدام با بازخورد، ${toPersianDigits(weeklyFeedbackStats.helpful)} مفید بود`
                    )
                  ) : (
                    <span className="text-xs text-muted-foreground font-normal">
                      {T("هنوز بازخوردی ثبت نشده", "No feedback logged yet")}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {aiAnalysisResult && (
              <div className="p-3.5 rounded-xl bg-primary/5 border border-primary/20 text-xs leading-relaxed space-y-1 animate-fade-in">
                <div className="font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  {T("تحلیل هوش مصنوعی:", "AI Insight:")}
                </div>
                <p className="text-foreground/90">{aiAnalysisResult}</p>
              </div>
            )}
          </Card>

          <MindTrendCharts
            showStreak={showStreak}
            streak={streak}
            thoughtCount={thoughtCount}
            abcCount={abcCount}
            activeToolsCount={tools.length}
            trend={trend}
            heatmap={heatmap}
            topDistortions={topDistortions}
            isEn={isEn}
            T={T}
          />
        </TabsContent>

        {/* Tab 3: ASSESSMENTS / SCREENERS */}
        <TabsContent value="screeners" className="space-y-4 mt-0 focus-visible:outline-none">
          <MindScreenersGrid
            latestScreeners={latestScreeners}
            isEn={isEn}
            T={T}
          />
        </TabsContent>
      </Tabs>

      {/* AI Payload Preview Dialog */}
      <MindWeeklyInsightsDialog
        open={aiPreviewOpen}
        onOpenChange={setAiPreviewOpen}
        payloadPreview={aiPayloadPreview}
        onConfirm={executeAiAnalysis}
        loading={aiAnalysisRunning}
        T={T}
      />
    </div>
  );
}
