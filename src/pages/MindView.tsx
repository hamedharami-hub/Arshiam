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

export interface MindToolItem {
  id: string;
  to: string;
  category: "cognitive" | "somatic" | "life";
  title: string;
  tag: string;
  desc: string;
  details?: string;
  icon: any;
  gradient: string;
  badgeClass: string;
}

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

  // Pinned tools state
  const PINNED_STORAGE_KEY = `mind_pinned_tools_v2_${user?.id || "guest"}`;
  const DEFAULT_PINNED_IDS = ["checkin", "thoughts", "breathing", "socratic"];

  const [pinnedIds, setPinnedIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(PINNED_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return DEFAULT_PINNED_IDS;
  });

  const [selectedCategory, setSelectedCategory] = useState<"all" | "cognitive" | "somatic" | "life">("all");

  const togglePin = (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setPinnedIds((prev) => {
      const isPinned = prev.includes(id);
      const next = isPinned ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(next));
      } catch {}
      toast.success(
        isPinned
          ? T("ابزار از بالای صفحه برداشته شد", "Tool unpinned from top")
          : T("ابزار به بالای صفحه پین شد 📌", "Tool pinned to top 📌")
      );
      return next;
    });
  };

  const tools: MindToolItem[] = useMemo(
    () => [
      {
        id: "checkin",
        category: "somatic",
        to: "/app/checkin",
        title: T("Check-in روزانه و سنجش حال", "Daily Mood & Energy Check-in"),
        tag: T("۱۰ ثانیه · ردیابی خلق", "10s Log"),
        desc: T(
          "ثبت سریع خلق و انرژی (حالت سریع) یا بررسی استرس، کیفیت و ساعات خواب (کامل). برای هوشیاری نسبت به نوسانات بدنی و ذهنی بدون قضاوت.",
          "Quick mood & energy log (Quick mode) or full focus, stress & sleep tracking."
        ),
        details: T(
          "به شما کمک می‌کند نوسانات انرژی و خلق را قبل از تبدیل شدن به خستگی مفرط متوجه شوید.",
          "Helps spot energy and mood dips before they turn into burnout."
        ),
        icon: Activity,
        gradient: "from-rose-500 via-pink-500 to-fuchsia-500",
        badgeClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
      },
      {
        id: "thoughts",
        category: "cognitive",
        to: "/app/thoughts",
        title: T("ثبت و بازسازی افکار (CBT)", "CBT Thought Log"),
        tag: T("۵ مرحله · آزمون شواهد", "Cognitive Reframing"),
        desc: T(
          "مسیر ۵ مرحله‌ای: اتفاق ← فکر خودکار ← احساس ← شواهد موافق و مخالف ← برداشت متعادل جایگزین و پیشنهاد اقدام عملی.",
          "5-step path: Situation → Automatic thought → Emotion → Evidence → Balanced perspective & next step."
        ),
        details: T(
          "کشف خطاهای شناختی رایج مانند کمال‌گرایی یا فاجعه‌سازی و مهار آن‌ها با شواهد عینی.",
          "Detect cognitive distortions and challenge them with balanced reality checks."
        ),
        icon: BookOpen,
        gradient: "from-violet-500 via-purple-500 to-indigo-500",
        badgeClass: "bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/20",
      },
      {
        id: "abc",
        category: "cognitive",
        to: "/app/abc",
        title: T("مدل رفتار و عادت‌ها (ABC)", "ABC Behavioral Model"),
        tag: T("رفتاردرمانی · مهار عادات", "Habits & Triggers"),
        desc: T(
          "محرک‌ها (Antecedent)، باورهای آنی (Belief) و تفکیک پیامدها (Consequence) برای شکستن چرخه‌های تعویق، پرخوری یا واکنش‌های تند.",
          "Trigger → Immediate belief → Distinct emotion & behavior. Break habits of procrastination or emotional reactions."
        ),
        details: T(
          "شناسایی نقاط ورود برای تغییر عادات خودکار ناخواسته.",
          "Pinpoints behavioral trigger points to cultivate deliberate alternate habits."
        ),
        icon: Zap,
        gradient: "from-amber-500 via-orange-500 to-red-500",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      {
        id: "worry",
        category: "cognitive",
        to: "/app/worry",
        title: T("درخت تفکیک و حل نگرانی", "Worry Tree & Problem Solving"),
        tag: T("۳ مسیر · حل مسئله", "Worry Tree"),
        desc: T(
          "تفکیک هوشمند نگرانی‌های قابل اقدام از نگرانی‌های فرضی و خارج از کنترل. طوفان فکری راهکار با هوش مصنوعی و ساخت تسک مشخص در امروز.",
          "3 paths: actionable, partially controllable, or uncontrollable. AI brainstorming & task confirmation."
        ),
        details: T(
          "پایان دادن به نشخوار ذهنی با تبدیل نگرانی به تسک‌های خرد یا پذیرش رهاساز.",
          "Stops anxiety loops by turning concerns into actionable micro-steps or mindful letting-go."
        ),
        icon: Wind,
        gradient: "from-sky-500 via-blue-500 to-indigo-500",
        badgeClass: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
      },
      {
        id: "values",
        category: "life",
        to: "/app/values",
        title: T("ارزش‌ها و قطب‌نمای زندگی (ACT)", "Values & Goals (ACT)"),
        tag: T("قطب‌نما · تعهد و معنا", "Life Compass"),
        desc: T(
          "شفاف‌سازی ارزش‌های اصیل در ۱۰ حوزه زندگی (روابط، کار، سلامت، معنویت) و بررسی میزان همسویی اقدامات هفتگی با این ارزش‌ها.",
          "Clarify authentic values across 10 life domains, review past-week alignment & constraints."
        ),
        details: T(
          "اطمینان از اینکه اهداف کاری روزمره شما هم‌راستا با ارزش‌های عمیق درونیتان هستند.",
          "Ensures daily work aligns meaningfully with what matters most to your soul."
        ),
        icon: Compass,
        gradient: "from-emerald-500 via-teal-500 to-cyan-500",
        badgeClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      },
      {
        id: "breathing",
        category: "somatic",
        to: "/app/breathing",
        title: T("تنفس ریتمیک ۳بعدی و آرامش", "3D Breathing Practice"),
        tag: T("تنظیم سیستم عصبی · فوری", "Autonomic Relief"),
        desc: T(
          "تمرینات تنفس هماهنگ (جعبه‌ای ۴-۴-۴-۴، خواب ۴-۷-۸ و ریتم آرامش ۵-۵) با راهنمای بصری زنده برای کاهش فوری ترشح کورتیزول و تپش قلب.",
          "Guided calming breathing patterns (Box, 4-7-8 for sleep, Coherent 5-5) with sensory visual guidance."
        ),
        details: T(
          "روش بیوفیدبک تنفسی برای خروج از حالت استرس حاد در کمتر از ۲ دقیقه.",
          "Physiological sigh & paced breathing to reset your nervous system in under 2 minutes."
        ),
        icon: Heart,
        gradient: "from-teal-500 via-cyan-500 to-sky-500",
        badgeClass: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/20",
      },
      {
        id: "socratic",
        category: "cognitive",
        to: "/app/socratic",
        title: T("گفت‌وگوی سقراطی با هوش مصنوعی", "Socratic Dialogue (AI)"),
        tag: T("پرسشگری عمیق · بدون قضاوت", "Logical Inquiry"),
        desc: T(
          "همراهی هوشمند با پرسیدن سوالات باز و عمیق، بدون قضاوت یا پند مستقیم؛ برای اینکه خودتان به وضوح و ریشه تصمیم‌ها برسید.",
          "Guided inquiry with one open-ended question at a time, curious and non-judgmental."
        ),
        details: T(
          "رویکرد کشف هدایت‌شده برای خروج از بن‌بست‌های فکری و تصمیم‌گیری‌های پیچیده.",
          "Guided discovery coaching to unlock clarity without someone lecturing you."
        ),
        icon: MessageCircleQuestion,
        gradient: "from-cyan-500 via-sky-500 to-blue-500",
        badgeClass: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20",
      },
      {
        id: "self",
        category: "life",
        to: "/app/self",
        title: T("خودشناسی و نیم‌رخ روان علمی", "Self-Knowledge & Personality"),
        tag: T("HEXACO · VIA · ECR", "Psych Profile"),
        desc: T(
          "شناخت علمی تیپ شخصیتی، ۲۴ فضیلت بنیادین، سبک دلبستگی در روابط، و کالیبراسیون لحن هوش مصنوعی متناسب با سرشت شما.",
          "Scientific personality archetype, 24 VIA character strengths, attachment styles, and AI tone calibration."
        ),
        details: T(
          "آزمون‌های استاندارد روان‌شناختی با ترجمه دوزبانه و نقشه راه اختصاصی رشد.",
          "Comprehensive bilingual personality scales and tailored action roadmaps."
        ),
        icon: Brain,
        gradient: "from-fuchsia-500 via-purple-500 to-pink-500",
        badgeClass: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20",
      },
      {
        id: "life_architect",
        category: "life",
        to: "/app/life-architect",
        title: T("مهندسی جامع زندگی (Life Architect)", "Life Architect 2.0"),
        tag: T("۷ گام · طراحی استراتژیک", "Masterclass Wizard"),
        desc: T(
          "سنجش رضایت در چرخ زندگی، ریتم ظرفیت انرژی (Recovery / Steady / Sprint) و ساخت خودکار تسک‌ها و عادات سازنده در برنامه اصلی.",
          "Balance the Wheel of Life, energy capacity pacing, and direct deployment of actions and habits."
        ),
        details: T(
          "طراحی چارچوب زندگی متناسب با ظرفیت واقعی، نه کمال‌گرایی طاقت‌فرسا.",
          "Architect an authentic lifestyle aligned with genuine capacity, not burnout."
        ),
        icon: TrendingUp,
        gradient: "from-blue-600 via-indigo-600 to-violet-600",
        badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      },
      {
        id: "about_me",
        category: "life",
        to: "/app/about-me",
        title: T("پروفایل درباره من و ریتم انرژی", "About Me & Life Profile"),
        tag: T("همگام با هوش مصنوعی · اهداف", "Personalized Context"),
        desc: T(
          "ثبت شغل، زمان اوج انرژی، موانع روانی، ارزش‌ها و اهداف بلندمدت برای هدایت مستقیم تصمیم‌گیری‌های هوش مصنوعی در سرتاسر برنامه.",
          "Record occupation, peak energy hours, psychological blockers, and vision to steer AI coaching across the app."
        ),
        details: T(
          "هسته شخصی‌سازی و زمینه فکری هوش مصنوعی که مانع توصیه‌های کلیشه‌ای و عمومی می‌شود.",
          "Powers AI personalization so coaching adapts to your real context and daily rhythm."
        ),
        icon: Sparkles,
        gradient: "from-amber-500 via-rose-500 to-pink-500",
        badgeClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      },
      {
        id: "cycle",
        category: "somatic",
        to: "/app/cycle",
        title: T("رصد چرخه سلامت و ریتم بیولوژیک", "Cycle & Biological Rhythm"),
        tag: T("ریتم فیزیولوژیک · تعادل بدن", "Cycle Health"),
        desc: T(
          "ثبت و رهگیری دوره‌های فیزیولوژیک، پیش‌بینی نوسانات خلق و سازگار کردن حجم کار روزانه با سطوح انرژی جسمانی بدن.",
          "Track biological rhythms, forecast mood fluctuations, and align daily workload with somatic capacity."
        ),
        details: T(
          "هماهنگی کار با ریتم طبیعی هورمون‌ها و انرژی بدن برای جلوگیری از فرسودگی.",
          "Harmonizes work pace with natural biological phases to prevent burnout."
        ),
        icon: Activity,
        gradient: "from-pink-500 via-rose-500 to-red-500",
        badgeClass: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500/20",
      },
      {
        id: "crisis",
        category: "somatic",
        to: "/app/crisis",
        title: T("پشتیبانی بحران روانی و جعبه نجات (SOS)", "Crisis Protocol & Emergency SOS"),
        tag: T("جعبه نجات فوری · شماره‌های تماس", "Grounding & Safety"),
        desc: T(
          "دسترسی فوری به خطوط رایگان مشاوره (۱۲۳ و ۱۴۸۰)، تکنیک حس‌های پنجگانه ۵-۴-۳-۲-۱ و راهنمای خروج سریع برای ایمنی کامل.",
          "Immediate crisis hotlines (123, 1480), 5-4-3-2-1 sensory grounding, and emergency safety instructions."
        ),
        details: T(
          "اقدامات نجات فوری در لحظات اضطراب شدید، حملات پانیک یا احساس ناتوانی مفرط.",
          "Immediate rescue strategies during severe panic, acute distress, or crisis."
        ),
        icon: ShieldAlert,
        gradient: "from-red-600 via-rose-600 to-orange-600",
        badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      },
    ],
    [T]
  );

  const pinnedTools = useMemo(() => {
    return tools.filter((t) => pinnedIds.includes(t.id));
  }, [tools, pinnedIds]);

  const filteredTools = useMemo(() => {
    if (selectedCategory === "all") return tools;
    return tools.filter((t) => t.category === selectedCategory);
  }, [tools, selectedCategory]);

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

      {/* Pinned & Most Frequent Tools Section */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Pin className="w-4 h-4 text-primary fill-primary/20" />
            <h2 className="text-sm sm:text-base font-bold text-foreground">
              {T("ابزارهای پین‌شده و پرکاربرد شما", "Your Pinned & Frequent Tools")}
            </h2>
            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-mono">
              {isEn ? pinnedTools.length : toPersianDigits(pinnedTools.length)}
            </Badge>
          </div>
          <span className="text-[11px] text-muted-foreground hidden sm:inline">
            {T("برای دسترسی سریع‌تر، ابزارها را با علامت 📌 پین کنید", "Click 📌 on any tool to pin or unpin")}
          </span>
        </div>

        {pinnedTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {pinnedTools.map((t) => {
              const Icon = t.icon;
              return (
                <Link
                  key={`pinned-${t.id}`}
                  to={t.to}
                  className="group relative rounded-2xl border border-primary/25 bg-gradient-to-br from-card via-card to-primary/5 p-3.5 shadow-xs hover:shadow-md hover:border-primary/50 hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-1">
                      <div className={`grid place-items-center h-8 w-8 rounded-xl bg-gradient-to-tr ${t.gradient} text-white shrink-0 shadow-2xs`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border ${t.badgeClass}`}>
                          {t.tag}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => togglePin(t.id, e)}
                          title={T("برداشتن پین", "Unpin")}
                          className="h-6 w-6 text-primary hover:text-destructive hover:bg-destructive/10 rounded-full"
                        >
                          <PinOff className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        <span>{t.title}</span>
                        {isEn ? <ArrowRight className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" /> : <ArrowLeft className="w-3 h-3 opacity-60 group-hover:opacity-100 group-hover:-translate-x-0.5 transition-all" />}
                      </h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                        {t.desc}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-4 border-dashed border-border/80 bg-muted/20 text-center space-y-2">
            <p className="text-xs text-muted-foreground">
              {T("هیچ ابزاری در حال حاضر پین نشده است. روی علامت 📌 در کارت‌های زیر کلیک کنید تا ابزارهای دلخواه در اینجا قرار گیرند.", "No tools are currently pinned. Click 📌 on any tool card below to pin it here.")}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPinnedIds(DEFAULT_PINNED_IDS);
                localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(DEFAULT_PINNED_IDS));
                toast.success(T("ابزارهای پیش‌فرض پین شدند", "Default tools pinned"));
              }}
              className="text-xs h-7 gap-1"
            >
              <Pin className="w-3 h-3 text-primary" />
              {T("بازگردانی پین‌های پیش‌فرض", "Restore Default Pins")}
            </Button>
          </Card>
        )}
      </div>

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
              {isToday && today
                ? `${T("آخرین ثبت امروز:", "Today's log:")} ${T("خلق", "Mood")} ${today.mood ?? "—"}/۱۰ · ${T("انرژی", "Energy")} ${today.energy ?? "—"}/۱۰`
                : T("۱۰ ثانیه برای آگاهی از خلق، استرس و تمرکز درونی.", "10 seconds to check in on mood, stress, and energy.")}
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
                {thoughtCount > 0
                  ? isEn
                    ? `${thoughtCount} thoughts`
                    : `${toPersianDigits(thoughtCount)} فکر ثبت‌شده`
                  : T("CBT · نگرانی", "CBT · Worry")}
              </Badge>
            </div>
            <h3 className="font-bold text-sm text-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
              {T("فکری درگیرم کرده", "Something is on my mind")}
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {topDistortions.length > 0
                ? `${T("الگوی غالب شناختی:", "Top distortion pattern:")} ${topDistortions[0].key}`
                : T("آزمون واقعیت فکر با شواهد یا تفکیک نگرانی با درخت تصمیم‌گیری.", "Test thoughts with evidence or triage worries with the Worry Tree.")}
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
                {weeklyTasksCompleted > 0
                  ? isEn
                    ? `${weeklyTasksCompleted} completed`
                    : `${toPersianDigits(weeklyTasksCompleted)} اقدام انجام‌شده`
                  : T("Today · تسک‌ها", "Today · Tasks")}
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
          {/* Category Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            <Button
              variant={selectedCategory === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("all")}
              className="text-xs h-7 rounded-full gap-1 shrink-0"
            >
              <span>{T("همه ابزارها", "All Tools")}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                {isEn ? tools.length : toPersianDigits(tools.length)}
              </Badge>
            </Button>
            <Button
              variant={selectedCategory === "cognitive" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("cognitive")}
              className="text-xs h-7 rounded-full gap-1 shrink-0"
            >
              <Zap className="w-3 h-3 text-amber-500" />
              <span>{T("شناختی و حل مسئله", "Cognitive & CBT")}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                {isEn ? tools.filter((t) => t.category === "cognitive").length : toPersianDigits(tools.filter((t) => t.category === "cognitive").length)}
              </Badge>
            </Button>
            <Button
              variant={selectedCategory === "somatic" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("somatic")}
              className="text-xs h-7 rounded-full gap-1 shrink-0"
            >
              <Heart className="w-3 h-3 text-rose-500" />
              <span>{T("آرامش و ریتم بدن", "Somatic & Calming")}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                {isEn ? tools.filter((t) => t.category === "somatic").length : toPersianDigits(tools.filter((t) => t.category === "somatic").length)}
              </Badge>
            </Button>
            <Button
              variant={selectedCategory === "life" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory("life")}
              className="text-xs h-7 rounded-full gap-1 shrink-0"
            >
              <Compass className="w-3 h-3 text-emerald-500" />
              <span>{T("معنا، اهداف و خودشناسی", "Meaning & Life")}</span>
              <Badge variant="secondary" className="text-[10px] py-0 px-1 font-mono">
                {isEn ? tools.filter((t) => t.category === "life").length : toPersianDigits(tools.filter((t) => t.category === "life").length)}
              </Badge>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {filteredTools.map((t) => {
              const Icon = t.icon;
              const isPinned = pinnedIds.includes(t.id);
              return (
                <div
                  key={t.id}
                  className={`group rounded-2xl border bg-card/60 hover:bg-card p-4 sm:p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between relative ${
                    isPinned ? "border-primary/40 shadow-xs bg-primary/[0.02]" : "border-border/60"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className={`grid place-items-center h-10 w-10 sm:h-11 sm:w-11 rounded-xl bg-gradient-to-tr ${t.gradient} text-white shrink-0 shadow-xs`}>
                        <Icon className="w-5 h-5 sm:w-5.5 sm:h-5.5" />
                      </div>
                      <div className="flex items-center gap-1.5">
                        {isPinned && (
                          <Badge variant="default" className="text-[10px] py-0 px-1.5 gap-0.5 bg-primary/90 text-primary-foreground">
                            <Pin className="w-2.5 h-2.5 fill-current" />
                            <span>{T("پین‌شده", "Pinned")}</span>
                          </Badge>
                        )}
                        <Badge variant="outline" className={`text-[11px] font-medium px-2 py-0.5 border ${t.badgeClass}`}>
                          {t.tag}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => togglePin(t.id, e)}
                          title={isPinned ? T("برداشتن پین از بالا", "Unpin from top") : T("پین کردن در بالا", "Pin to top")}
                          className={`h-7 w-7 rounded-full transition-colors ${
                            isPinned
                              ? "text-primary hover:text-destructive hover:bg-destructive/10"
                              : "text-muted-foreground/60 hover:text-primary hover:bg-primary/10"
                          }`}
                        >
                          {isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </div>
                    <div>
                      <Link to={t.to} className="block">
                        <h3 className="font-bold text-base text-foreground mb-1.5 group-hover:text-primary transition-colors flex items-center justify-between">
                          <span>{t.title}</span>
                          {isEn ? (
                            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-transform shrink-0" />
                          ) : (
                            <ArrowLeft className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:-translate-x-0.5 transition-transform shrink-0" />
                          )}
                        </h3>
                      </Link>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {t.desc}
                      </p>
                      {t.details && (
                        <p className="text-[11px] text-primary/80 mt-1.5 pt-1.5 border-t border-border/30 leading-relaxed">
                          💡 {t.details}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-border/40 flex items-center justify-between">
                    <Link
                      to={t.to}
                      className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                    >
                      <span>{T("ورود به ابزار", "Open Tool")}</span>
                      {isEn ? <ArrowRight className="w-3 h-3" /> : <ArrowLeft className="w-3 h-3" />}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {t.category === "cognitive"
                        ? T("شناختی", "Cognitive")
                        : t.category === "somatic"
                        ? T("ریتم بدن", "Somatic")
                        : T("طراحی زندگی", "Life & Values")}
                    </span>
                  </div>
                </div>
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
