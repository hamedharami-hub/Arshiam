import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { toast } from "sonner";
import {
  Sparkles,
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  RefreshCw,
  Zap,
  Target,
  Folder,
  Brain,
  Clock,
  ShieldCheck,
  Flame,
  Award,
  ChevronRight,
  Activity,
  Heart,
  Gauge,
  Sliders,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  WIZARD_QUESTIONS,
  CORE_VALUES_LIST,
  ENERGY_CAPACITY_OPTIONS,
  LIFE_DOMAINS_INFO,
  generateDeterministicBlueprint,
  enhanceBlueprintWithAI,
  auditExistingSystem,
  deployLifeBlueprint,
  type UserAnswers,
  type LifeBlueprint,
  type SystemAuditResult,
  type LifeDomainKey,
  type CoreValueKey,
  type EnergyCapacity,
} from "@/lib/lifeArchitect";

const WIZARD_STAGES = [
  { id: "role", labelFa: "نقش و زیست‌بوم", labelEn: "Role & Archetype", icon: Compass },
  { id: "wheel", labelFa: "چرخ توازن زندگی", labelEn: "Wheel of Life", icon: Activity },
  { id: "domains", labelFa: "تمرکز فصلی", labelEn: "Focus Domains", icon: Target },
  { id: "values", labelFa: "ارزش‌های قطب‌نما", labelEn: "Core Values", icon: Heart },
  { id: "obstacle", labelFa: "مهار اصطکاک", labelEn: "Obstacle Antidote", icon: Zap },
  { id: "capacity", labelFa: "ظرفیت و ریتم", labelEn: "Energy & Pace", icon: Gauge },
  { id: "vision", labelFa: "ستاره قطبی و ریتم", labelEn: "Rhythm & Vision", icon: Sparkles },
];

export default function LifeArchitectView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);

  const [mode, setMode] = useState<"welcome" | "wizard" | "audit" | "generating" | "review">("welcome");
  const [stageIdx, setStageIdx] = useState(0);

  const [answers, setAnswers] = useState<UserAnswers>({
    role: "freelancer",
    wheelRatings: {
      career: 6,
      health: 5,
      mind: 5,
      growth: 7,
      finance: 6,
      relationships: 6,
    },
    domains: ["career", "health", "growth"],
    coreValues: ["peace", "freedom", "growth"],
    obstacle: "procrastination",
    energyCapacity: "steady",
    chronotype: "morning",
    customGoals: "",
  });

  const [blueprint, setBlueprint] = useState<LifeBlueprint | null>(null);
  const [auditResult, setAuditResult] = useState<SystemAuditResult | null>(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);

  const [selectedFolderIds, setSelectedFolderIds] = useState<Set<string>>(new Set());
  const [selectedHabitNames, setSelectedHabitNames] = useState<Set<string>>(new Set());
  const [selectedTaskTitles, setSelectedTaskTitles] = useState<Set<string>>(new Set());

  const currentStage = WIZARD_STAGES[stageIdx];
  const isLastStage = stageIdx === WIZARD_STAGES.length - 1;

  const startWizard = (initialStage: number = 0) => {
    setStageIdx(initialStage);
    setMode("wizard");
  };

  const startAudit = async () => {
    if (!user) return toast.error(T("لطفاً ابتدا وارد حساب خود شوید", "Please sign in first"));
    setIsAuditing(true);
    setMode("audit");
    try {
      const res = await auditExistingSystem(user.id);
      setAuditResult(res);
    } catch (err: any) {
      toast.error(err.message || T("خطا در ممیزی سیستم", "Error auditing system"));
      setMode("welcome");
    } finally {
      setIsAuditing(false);
    }
  };

  const handleNextStage = async () => {
    if (stageIdx === 2 && answers.domains.length === 0) {
      toast.warning(T("حداقل یک حوزه را برای تمرکز انتخاب کنید", "Select at least 1 domain for focus"));
      return;
    }

    if (stageIdx === 3 && (!answers.coreValues || answers.coreValues.length === 0)) {
      toast.warning(T("حداقل یک ارزش هدایت‌گر را انتخاب کنید", "Select at least 1 core value"));
      return;
    }

    if (!isLastStage) {
      setStageIdx((prev) => prev + 1);
    } else {
      setMode("generating");
      const baseBp = generateDeterministicBlueprint(answers);
      const finalBp = await enhanceBlueprintWithAI(answers, baseBp);
      setBlueprint(finalBp);

      setSelectedFolderIds(new Set(finalBp.folders.map((f) => f.id)));
      setSelectedHabitNames(new Set(finalBp.habits.map((h) => h.name)));
      setSelectedTaskTitles(new Set(finalBp.tasks.map((t) => t.title)));

      setMode("review");
    }
  };

  const handlePrevStage = () => {
    if (stageIdx > 0) setStageIdx((prev) => prev - 1);
    else setMode("welcome");
  };

  const handleToggleDomain = (domainKey: LifeDomainKey) => {
    const current = answers.domains || [];
    if (current.includes(domainKey)) {
      if (current.length <= 1) {
        toast.warning(T("حداقل ۱ حوزه باید انتخاب شود", "Keep at least 1 domain"));
        return;
      }
      setAnswers((prev) => ({ ...prev, domains: prev.domains.filter((d) => d !== domainKey) }));
    } else {
      if (current.length >= 3) {
        toast.info(T("قانون طلایی تمرکز: حداکثر ۳ حوزه اصلی", "Golden Rule of Focus: Maximum 3 domains"));
        return;
      }
      setAnswers((prev) => ({ ...prev, domains: [...current, domainKey] }));
    }
  };

  const handleToggleValue = (valueKey: CoreValueKey) => {
    const current = answers.coreValues || [];
    if (current.includes(valueKey)) {
      if (current.length <= 1) {
        toast.warning(T("حداقل ۱ ارزش هدایت‌گر لازم است", "At least 1 value is required"));
        return;
      }
      setAnswers((prev) => ({ ...prev, coreValues: (prev.coreValues || []).filter((v) => v !== valueKey) }));
    } else {
      if (current.length >= 3) {
        toast.info(T("حداکثر ۳ ارزش قطب‌نما برای وضوح تصمیم‌گیری", "Maximum 3 values for decision clarity"));
        return;
      }
      setAnswers((prev) => ({ ...prev, coreValues: [...current, valueKey] }));
    }
  };

  const handleWheelScoreChange = (domainKey: LifeDomainKey, val: number) => {
    setAnswers((prev) => ({
      ...prev,
      wheelRatings: {
        ...(prev.wheelRatings || {
          career: 6,
          health: 6,
          mind: 6,
          growth: 6,
          finance: 6,
          relationships: 6,
        }),
        [domainKey]: val,
      },
    }));
  };

  const handleDeploy = async () => {
    if (!user || !blueprint) return;
    setIsDeploying(true);
    try {
      const { foldersCount, habitsCount, tasksCount } = await deployLifeBlueprint(
        blueprint,
        user.id,
        selectedFolderIds,
        selectedHabitNames,
        selectedTaskTitles
      );

      toast.success(
        T(
          `معماری زندگی با موفقیت مستقر شد! (${foldersCount} پوشه، ${habitsCount} عادت، ${tasksCount} تسک)`,
          `Life Blueprint deployed! (${foldersCount} folders, ${habitsCount} habits, ${tasksCount} tasks)`
        )
      );

      setTimeout(() => navigate("/app/today"), 1200);
    } catch (err: any) {
      toast.error(err.message || T("خطا در استقرار سیستم", "Error deploying blueprint"));
    } finally {
      setIsDeploying(false);
    }
  };

  const handleDeployAuditRecommendations = async () => {
    if (!user || !auditResult) return;
    setIsDeploying(true);
    try {
      const auditBp: LifeBlueprint = {
        title: "پچ‌های بهینه‌سازی سیستم",
        summary: "ارتقای توازن زندگی و سازمان‌دهی اینباکس",
        scientificInsight: "تکمیل حلقه‌های باز ذهنی با پوشه‌ها و عادات گمشده.",
        folders: auditResult.recommendations.addFolders,
        goals: auditResult.recommendations.addGoals,
        habits: auditResult.recommendations.addHabits,
        tasks: [],
        recommendedWorkflow: "list",
      };

      const res = await deployLifeBlueprint(auditBp, user.id);
      toast.success(
        T(
          `بهینه‌سازی با موفقیت اعمال شد (${res.foldersCount} پوشه جدید، ${res.habitsCount} عادت)`,
          `Optimizations applied (${res.foldersCount} new folders, ${res.habitsCount} habits)`
        )
      );
      setTimeout(() => navigate("/app/today"), 1200);
    } catch (err: any) {
      toast.error(err.message || T("خطا در اعمال تغییرات", "Error applying changes"));
    } finally {
      setIsDeploying(false);
    }
  };

  // Wheel statistics
  const currentWheel = answers.wheelRatings || {
    career: 6,
    health: 6,
    mind: 6,
    growth: 6,
    finance: 6,
    relationships: 6,
  };
  const wheelEntries = Object.entries(currentWheel) as [LifeDomainKey, number][];
  const avgSatisfaction = (
    wheelEntries.reduce((acc, [, score]) => acc + score, 0) / wheelEntries.length
  ).toFixed(1);
  const lowestDomainEntry = [...wheelEntries].sort((a, b) => a[1] - b[1])[0];
  const highestDomainEntry = [...wheelEntries].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 pb-28 min-h-[85vh] flex flex-col justify-center" dir={isEn ? "ltr" : "rtl"}>
      {/* MODE 1: WELCOME SCREEN */}
      {mode === "welcome" && (
        <div className="space-y-6 text-center animate-fade-in py-6">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-gradient-to-tr from-primary via-primary/80 to-amber-500/80 text-primary-foreground flex items-center justify-center shadow-xl shadow-primary/25 ring-8 ring-primary/10">
            <Compass className="w-10 h-10 animate-spin-slow" />
          </div>

          <div className="space-y-2 max-w-xl mx-auto">
            <Badge variant="outline" className="px-3 py-1 gap-1 text-xs border-primary/30 text-primary">
              <Sparkles className="w-3.5 h-3.5" />
              {T("معمار هوشمند سیستم زندگی ۲.۰", "Smart Life Architect 2.0")}
            </Badge>
            <h1 className="text-2xl sm:text-3xl font-black text-foreground">
              {T("سیستم‌عامل اختصاصی زندگی‌ات را معماری کن", "Architect Your Personal Life Operating System")}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {T(
                "پیوندِ علم طراحی زندگی استنفورد، روانشناسی رفتاری ACT و عصب‌شناسی عادت‌ها؛ پوشه‌ها، اهداف چندسطحی، عادات کلیدی و تسک‌های آغازین خود را در چند گام متصل و هماهنگ بسازید.",
                "Blending Stanford Life Design, ACT behavioral therapy, and habit neuroscience to structure your folders, multi-tier goals, and keystone habits."
              )}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto pt-4 text-start">
            <Card
              onClick={() => startWizard(0)}
              className="p-5 cursor-pointer hover:border-primary/60 hover:shadow-lg transition-all group relative overflow-hidden bg-card/80 border-border/80"
            >
              <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1 text-foreground flex items-center gap-1.5">
                {T("شروع معماری کامل", "Full Life Architecture")}
                <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground group-hover:translate-x-[-4px] transition-transform rtl:rotate-180" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {T(
                  "سفر ۷ مرحله‌ای: نقش، چرخ توازن زندگی، تمرکز فصلی، ارزش‌ها، مهار اصطکاک و ستاره قطبی.",
                  "7-stage journey: role, wheel of life, focus domains, core values, friction antidote, and north star."
                )}
              </p>
            </Card>

            <Card
              onClick={startAudit}
              className="p-5 cursor-pointer hover:border-amber-500/60 hover:shadow-lg transition-all group relative overflow-hidden bg-card/80 border-border/80"
            >
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <RefreshCw className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1 text-foreground flex items-center gap-1.5">
                {T("عارضه‌یابی و تکمیل برنامه", "Audit & Upgrade")}
                <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground group-hover:translate-x-[-4px] transition-transform rtl:rotate-180" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {T(
                  "تحلیل تسک‌ها و پوشه‌های فعلی شما، نمره سلامت سیستم و پیشنهاد پوشه و عادت‌های مکمل بدون حذف دیتای قبلی.",
                  "Inspect your current tasks & folders, assess balance score, and upgrade additively."
                )}
              </p>
            </Card>

            <Card
              onClick={() => startWizard(5)}
              className="p-5 cursor-pointer hover:border-emerald-500/60 hover:shadow-lg transition-all group relative overflow-hidden bg-card/80 border-border/80"
            >
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <Gauge className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-sm sm:text-base mb-1 text-foreground flex items-center gap-1.5">
                {T("تنظیم ریتم و ضرب‌آهنگ", "Quick Pace Tuning")}
                <ChevronRight className="w-4 h-4 ms-auto text-muted-foreground group-hover:translate-x-[-4px] transition-transform rtl:rotate-180" />
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {T(
                  "تنظیم مجدد ظرفیت انرژی (بازیابی، تعادل یا اسپرینت) برای زمان‌های تغییر شرایط یا احساس خستگی.",
                  "Quickly adjust energy mode (recovery, steady, sprint) to match your current bandwidth."
                )}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* MODE 2: WIZARD */}
      {mode === "wizard" && (
        <div className="space-y-6 animate-fade-in">
          {/* Top Header Bar */}
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={handlePrevStage} className="gap-1 text-xs">
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              {T("مرحله قبلی", "Back")}
            </Button>

            {/* Stepper Dots & Stage Names */}
            <div className="flex items-center gap-1.5">
              {WIZARD_STAGES.map((stg, idx) => (
                <div
                  key={stg.id}
                  onClick={() => setStageIdx(idx)}
                  className={`h-2 rounded-full cursor-pointer transition-all duration-300 ${
                    idx === stageIdx
                      ? "w-8 bg-primary"
                      : idx < stageIdx
                      ? "w-2.5 bg-primary/40 hover:bg-primary/60"
                      : "w-2 bg-muted hover:bg-muted-foreground/30"
                  }`}
                  title={isEn ? stg.labelEn : stg.labelFa}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <span className="hidden sm:inline-block font-medium text-foreground">
                {isEn ? currentStage.labelEn : currentStage.labelFa}
              </span>
              <span>
                ({stageIdx + 1} / {WIZARD_STAGES.length})
              </span>
            </div>
          </div>

          {/* STAGE 0: ROLE ARCHETYPE */}
          {stageIdx === 0 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {T("نقش و سبک زندگی اصلی شما در این روزها چیست؟", "What is your primary role and lifestyle these days?")}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "این بخش اسکلت‌بندی پوشه‌ها، ریتم کاری و افق برنامه‌ریزی شما را تعیین می‌کند.",
                    "This establishes the core structure of your folders and planning horizons."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-primary ms-1">{T("بینش آزمایشگاه استنفورد:", "Stanford Lab Insight:")}</span>
                  {T(
                    "تطابق ساختار ابزار با نقش زیستی واقعی، خستگی تصمیم‌گیری (Decision Fatigue) را تا ۴۰٪ کاهش داده و ظرفیت تمرکز عمیق را آزاد می‌سازد.",
                    "Aligning tools with your actual lifestyle cuts decision fatigue by up to 40% and frees cognitive bandwidth."
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {WIZARD_QUESTIONS.find((q) => q.id === "role")?.options.map((opt) => {
                  const isSelected = answers.role === opt.value;
                  return (
                    <Card
                      key={opt.value}
                      onClick={() => setAnswers((prev) => ({ ...prev, role: opt.value as any }))}
                      className={`p-3.5 cursor-pointer rounded-2xl border transition-all text-start flex items-start gap-3 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-accent/40 bg-card/60"
                      }`}
                    >
                      <span className="text-2xl shrink-0 select-none p-1">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="font-bold text-sm text-foreground truncate">
                            {isEn && opt.labelEn ? opt.labelEn : opt.labelFa}
                          </span>
                          {opt.badge && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-1.5 font-normal">
                              {isEn && opt.badgeEn ? opt.badgeEn : opt.badge}
                            </Badge>
                          )}
                          {isSelected && <Check className="w-4 h-4 ms-auto text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isEn && opt.descEn ? opt.descEn : opt.descFa}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 1: WHEEL OF LIFE SATISFACTION RATING */}
          {stageIdx === 1 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {T("چرخ رضایت و توازن زندگی (Wheel of Life)", "Wheel of Life Satisfaction & Balance")}
                  </h2>
                  <Badge variant="outline" className="text-primary border-primary/30 font-mono text-xs px-2.5 py-0.5">
                    {T("میانگین رضایت: ", "Avg Satisfaction: ")} {avgSatisfaction} / ۱۰
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "میزان کیفیت و رضایت جاری خود را در هر یک از ۶ بعد کلیدی زندگی از ۱ (بحرانی) تا ۱۰ (بسیار عالی) مشخص کنید.",
                    "Rate your current experience and satisfaction in each domain from 1 (critical) to 10 (thriving)."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-primary ms-1">{T("روانشناسی توازن رفتاری:", "Behavioral Balance:")}</span>
                  {T(
                    "چرخ نامتوازن نمی‌چرخد! سیستم با تشخیص حوزه‌های کم‌نمره، به‌جای سرزنش، «پروتکل احیا و مراقبت ویژه» در برنامه‌تان قرار می‌دهد.",
                    "An uneven wheel cannot roll! Identifying low-scoring areas allows the system to embed restorative recovery actions."
                  )}
                </div>
              </div>

              {/* Sliders Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {(Object.entries(LIFE_DOMAINS_INFO) as [LifeDomainKey, typeof LIFE_DOMAINS_INFO[LifeDomainKey]][]).map(
                  ([domKey, info]) => {
                    const score = currentWheel[domKey] ?? 6;
                    const isLow = score <= 4;
                    const isHigh = score >= 8;

                    return (
                      <Card
                        key={domKey}
                        className="p-4 rounded-2xl border border-border/70 bg-card/70 space-y-3 hover:border-border transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{info.icon}</span>
                            <div>
                              <div className="font-bold text-sm text-foreground">
                                {isEn ? info.nameEn : info.nameFa}
                              </div>
                              <div className="text-[11px] text-muted-foreground line-clamp-1">
                                {isEn ? info.reflectionEn : info.reflectionFa}
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={isLow ? "destructive" : isHigh ? "default" : "secondary"}
                            className="font-mono text-xs px-2 py-0.5"
                          >
                            {score} / ۱۰
                          </Badge>
                        </div>

                        <div className="pt-1">
                          <Slider
                            value={[score]}
                            min={1}
                            max={10}
                            step={1}
                            onValueChange={(vals) => handleWheelScoreChange(domKey, vals[0])}
                            className="cursor-pointer"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>{T("۱ = نیازمند احیا", "1 = Needs Recovery")}</span>
                          <span className={isLow ? "text-destructive font-bold" : isHigh ? "text-emerald-500 font-bold" : ""}>
                            {isLow
                              ? T("نیاز به احیای فوری", "Needs Revitalization")
                              : isHigh
                              ? T("ستون قدرت و شکوفایی", "Thriving Strength")
                              : T("نسبتاً پایدار", "Stable & Growing")}
                          </span>
                          <span>{T("۱۰ = رضایت کامل", "10 = Thriving")}</span>
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>

              {/* Quick Summary Pill */}
              <div className="p-3 rounded-2xl bg-muted/40 border border-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    {T("حوزه نیازمند بیشترین توجه و احیا:", "Domain needing most care: ")}
                    <strong className="text-foreground ms-1">
                      {isEn
                        ? LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameEn
                        : LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameFa}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>
                    {T("ستون قوت جاری شما:", "Current strong pillar: ")}
                    <strong className="text-foreground ms-1">
                      {isEn
                        ? LIFE_DOMAINS_INFO[highestDomainEntry[0]]?.nameEn
                        : LIFE_DOMAINS_INFO[highestDomainEntry[0]]?.nameFa}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* STAGE 2: SEASONAL FOCUS DOMAINS */}
          {stageIdx === 2 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {T("حداکثر ۳ حوزه اصلی را برای تمرکز این فصل انتخاب کنید", "Select up to 3 focus domains this season")}
                  </h2>
                  <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                    {answers.domains.length} / ۳ {T("انتخاب شده", "Selected")}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "قانون طلایی تمرکز: تلاش برای پیروزی در همه جبهه‌ها به صورت همزمان، یعنی ناتوانی در به ثمر رساندن هیچ‌کدام.",
                    "The Golden Rule of Focus: Trying to conquer everything simultaneously leads to conquering nothing."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Zap className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-amber-600 dark:text-amber-400 ms-1">
                    {T("توصیه هوشمند معمار:", "Architect Recommendation:")}
                  </span>
                  {T(
                    `بر اساس ارزیابی چرخ زندگی شما، پیشنهاد می‌شود حوزه «${
                      isEn ? LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameEn : LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameFa
                    }» را برای احیا در کنار حوزه شغلی خود بگنجانید.`,
                    `Based on your wheel ratings, we recommend including "${
                      isEn ? LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameEn : LIFE_DOMAINS_INFO[lowestDomainEntry[0]]?.nameFa
                    }" for revitalization alongside your career front.`
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {(Object.entries(LIFE_DOMAINS_INFO) as [LifeDomainKey, typeof LIFE_DOMAINS_INFO[LifeDomainKey]][]).map(
                  ([domKey, info]) => {
                    const isSelected = answers.domains.includes(domKey);
                    const score = currentWheel[domKey] ?? 6;

                    return (
                      <Card
                        key={domKey}
                        onClick={() => handleToggleDomain(domKey)}
                        className={`p-4 cursor-pointer rounded-2xl border transition-all text-start flex flex-col justify-between ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                            : "border-border/60 hover:bg-accent/40 bg-card/60"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-2xl">{info.icon}</span>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5">
                              {score}/۱۰
                            </Badge>
                            {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                          </div>
                        </div>

                        <div>
                          <div className="font-bold text-sm text-foreground mb-1">
                            {isEn ? info.nameEn : info.nameFa}
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                            {isEn ? info.descEn : info.descFa}
                          </p>
                        </div>
                      </Card>
                    );
                  }
                )}
              </div>
            </div>
          )}

          {/* STAGE 3: CORE GUIDING VALUES (ACT THERAPY) */}
          {stageIdx === 3 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl sm:text-2xl font-black text-foreground">
                    {T("ارزش‌های بنیادی و قطب‌نمای درون شما چیست؟", "What are your core guiding values & inner compass?")}
                  </h2>
                  <Badge variant="outline" className="text-primary border-primary/30 text-xs">
                    {(answers.coreValues || []).length} / ۳ {T("انتخاب شده", "Selected")}
                  </Badge>
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "۲ تا ۳ ارزش محرک رفتاری را که دوست دارید ستون فقرات اهداف و تصمیمات این روزهای شما باشند برگزینید.",
                    "Select 2 to 3 core drivers that you want as the backbone of your goals and daily decisions."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Heart className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-primary ms-1">{T("روانشناسی تعهد و ارزش (ACT):", "ACT Values Psychology:")}</span>
                  {T(
                    "اهداف بدون ارزش، زود به پوچی و فرسودگی می‌انجامند؛ اما هدف‌هایی که به ارزش‌های درونی گره خورده‌اند، چشمه بی‌پایان انگیزه و تاب‌آوری در روزهای سخت هستند.",
                    "Goals disconnected from values lead to burnout. Goals anchored in deep values fuel lifelong resilience."
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {CORE_VALUES_LIST.map((val) => {
                  const isSelected = (answers.coreValues || []).includes(val.key);
                  return (
                    <Card
                      key={val.key}
                      onClick={() => handleToggleValue(val.key)}
                      className={`p-4 cursor-pointer rounded-2xl border transition-all text-start flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-accent/40 bg-card/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">{val.icon}</span>
                            <span className="font-bold text-sm text-foreground">
                              {isEn ? val.labelEn : val.labelFa}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed mb-2">
                          {isEn ? val.descEn : val.descFa}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 text-[11px] text-primary/80 italic font-serif">
                        {isEn ? val.quoteEn : val.quoteFa}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 4: OBSTACLE & FRICTION ANTIDOTE */}
          {stageIdx === 4 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {T("بزرگ‌ترین مانع یا نقطه اصطکاک شما در اجرای برنامه‌ها چیست؟", "What is your biggest obstacle or point of friction?")}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "سیستم پادزهر رفتاری مناسب برای حل این اصطکاک را در تاروپود برنامه‌تان جای‌گذاری می‌کند.",
                    "The system embeds targeted behavioral antidotes to neutralize this initiation friction."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-primary ms-1">{T("روانشناسی شناختی-رفتاری (CBT):", "CBT Principle:")}</span>
                  {T(
                    "شکست در عمل به دلیل نبود اراده نیست، بلکه ناشی از بالا بودن اصطکاک در لحظه شروع است. پادزهر رفتاری اصطکاک را می‌شکند.",
                    "Action failure is caused by start-friction rather than lack of willpower. Behavioral antidotes lower the initiation barrier to zero."
                  )}
                </div>
              </div>

              <div className="space-y-2.5">
                {WIZARD_QUESTIONS.find((q) => q.id === "obstacle")?.options.map((opt) => {
                  const isSelected = answers.obstacle === opt.value;
                  return (
                    <Card
                      key={opt.value}
                      onClick={() => setAnswers((prev) => ({ ...prev, obstacle: opt.value as any }))}
                      className={`p-4 cursor-pointer rounded-2xl border transition-all text-start flex items-start gap-3.5 ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-accent/40 bg-card/60"
                      }`}
                    >
                      <span className="text-2xl shrink-0 select-none p-1">{opt.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-bold text-sm text-foreground">
                            {isEn && opt.labelEn ? opt.labelEn : opt.labelFa}
                          </span>
                          {opt.badge && (
                            <Badge variant="secondary" className="text-[10px] py-0 px-2 font-medium bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                              {isEn && opt.badgeEn ? opt.badgeEn : opt.badge}
                            </Badge>
                          )}
                          {isSelected && <Check className="w-4 h-4 ms-auto text-primary shrink-0" />}
                        </div>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          {isEn && opt.descEn ? opt.descEn : opt.descFa}
                        </p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 5: ENERGY CAPACITY & PACE */}
          {stageIdx === 5 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {T("سطح ظرفیت انرژی و زمان شما در این روزها چقدر است؟", "What is your energy capacity and bandwidth right now?")}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "معمار هوشمند برای جلوگیری از احساس گناه و فرسودگی، حجم تکالیف و عادات را دقیقاً با توان جاری شما هماهنگ می‌کند.",
                    "The system scales task volume and habit intensity to prevent burnout and guilt."
                  )}
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground/90">
                <Gauge className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold text-primary ms-1">{T("مدیریت انرژی، نه زمان:", "Energy Management:")}</span>
                  {T(
                    "تحقیقات جیم لوهر اثبات می‌کند تحمیل اهداف سنگین به ذهن خسته یا پرمشغله، رهاسازی کل سیستم را در پی دارد. تنظیم ریتم، رمز پیوستگی ماندگار است.",
                    "Imposing heavy loads on an exhausted mind leads to total abandonment. Pacing is the secret to enduring consistency."
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {ENERGY_CAPACITY_OPTIONS.map((opt) => {
                  const isSelected = (answers.energyCapacity || "steady") === opt.key;
                  return (
                    <Card
                      key={opt.key}
                      onClick={() => setAnswers((prev) => ({ ...prev, energyCapacity: opt.key }))}
                      className={`p-4 cursor-pointer rounded-2xl border transition-all text-start flex flex-col justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                          : "border-border/60 hover:bg-accent/40 bg-card/60"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-3xl">{opt.icon}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>

                        <div className="font-bold text-sm text-foreground mb-1">
                          {isEn ? opt.labelEn : opt.labelFa}
                        </div>
                        <Badge variant="secondary" className="text-[10px] mb-2 font-normal">
                          {isEn ? opt.badgeEn : opt.badgeFa}
                        </Badge>
                        <p className="text-xs text-muted-foreground leading-relaxed mb-3">
                          {isEn ? opt.descEn : opt.descFa}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-border/40 text-[11px] text-primary/90 font-medium">
                        <span className="font-bold">{T("استراتژی: ", "Strategy: ")}</span>
                        {isEn ? opt.strategyEn : opt.strategyFa}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* STAGE 6: CHRONOTYPE & NORTH STAR VISION */}
          {stageIdx === 6 && (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-2">
                <h2 className="text-xl sm:text-2xl font-black text-foreground">
                  {T("ساعت اوج انرژی و چشم‌انداز ستاره قطبی", "Peak Chronotype & North Star Vision")}
                </h2>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  {T(
                    "کارهای عمیق شما دقیقا در بازه پرانرژی روز قرار گرفته و چشم‌انداز سالانه شما به گام‌های ملموس تبدیل می‌شود.",
                    "Deep work will be scheduled to your biological clock, translating your vision into concrete milestones."
                  )}
                </p>
              </div>

              {/* Chronotype Cards */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  {T("ساعت طلایی و اوج تمرکز شبانه‌روزی شما چه زمانی است؟", "When is your peak cognitive window?")}
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
                  {WIZARD_QUESTIONS.find((q) => q.id === "chronotype")?.options.map((opt) => {
                    const isSelected = answers.chronotype === opt.value;
                    return (
                      <Card
                        key={opt.value}
                        onClick={() => setAnswers((prev) => ({ ...prev, chronotype: opt.value as any }))}
                        className={`p-3 cursor-pointer rounded-2xl border transition-all text-start ${
                          isSelected
                            ? "border-primary bg-primary/10 shadow-sm ring-2 ring-primary/20"
                            : "border-border/60 hover:bg-accent/40 bg-card/60"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-2xl">{opt.icon}</span>
                          {isSelected && <Check className="w-4 h-4 text-primary" />}
                        </div>
                        <div className="font-bold text-xs text-foreground mb-0.5">
                          {isEn && opt.labelEn ? opt.labelEn : opt.labelFa}
                        </div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2">
                          {isEn && opt.descEn ? opt.descEn : opt.descFa}
                        </p>
                      </Card>
                    );
                  })}
                </div>
              </div>

              {/* North Star Vision Textarea */}
              <div className="p-4 rounded-2xl bg-gradient-to-tr from-card to-primary/5 border border-primary/20 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    {T(
                      "چشم‌انداز ستاره قطبی یا هدف خاص شما در این فصل چیست؟ (اختیاری)",
                      "North Star Vision or specific project in mind? (Optional)"
                    )}
                  </label>
                  <VoiceInputButton
                    onTranscript={(text) =>
                      setAnswers((prev) => ({
                        ...prev,
                        customGoals: prev.customGoals ? prev.customGoals + " " + text : text,
                      }))
                    }
                    size="sm"
                    className="h-8 text-xs"
                  />
                </div>
                <AutoTextarea
                  value={answers.customGoals || ""}
                  onChange={(e) => setAnswers((prev) => ({ ...prev, customGoals: e.target.value }))}
                  placeholder={T(
                    "مثلاً: می‌خواهم تا پایان تابستان نسخه اول فروشگاه آنلاینم را به درآمد برسانم و روزانه نیم ساعت با آرامش ورزش کنم...",
                    "e.g., I want to launch my online store and monetize it by Q3, while maintaining 30 mins of daily joyful movement..."
                  )}
                  className="text-xs bg-muted/30 min-h-[70px]"
                  rows={2}
                  dir="auto"
                />
                <p className="text-[11px] text-muted-foreground">
                  {T(
                    "💡 هوش مصنوعی و موتور معمار این هدف را به گام‌های اجرایی هفته اول تبدیل خواهند کرد.",
                    "💡 AI & the architecture engine will directly convert this into first-week starter tasks."
                  )}
                </p>
              </div>
            </div>
          )}

          {/* Bottom Navigation Bar */}
          <div className="pt-4 flex items-center justify-between border-t border-border/50">
            <Button variant="ghost" size="sm" onClick={handlePrevStage} className="gap-1 text-xs">
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              {T("مرحله قبل", "Previous")}
            </Button>

            <Button onClick={handleNextStage} className="gap-2 px-6 rounded-xl shadow-md shadow-primary/25 font-bold">
              {isLastStage ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  {T("خلق نقشه معماری زندگی من", "Generate My Life Blueprint")}
                </>
              ) : (
                <>
                  {T("مرحله بعدی", "Next Step")}
                  <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* MODE 3: GENERATING BLUEPRINT */}
      {mode === "generating" && (
        <div className="text-center py-16 space-y-5 animate-fade-in">
          <div className="w-20 h-20 mx-auto rounded-3xl bg-primary/10 text-primary flex items-center justify-center animate-pulse">
            <Sparkles className="w-10 h-10 animate-spin-slow" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              {T("در حال معماری و تلفیق روانشناختی سیستم شما...", "Synthesizing your personal architecture...")}
            </h2>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              {T(
                "هوش مصنوعی و الگوریتم‌های رفتاری در حال هماهنگ‌سازی پوشه‌ها، اهداف چندسطحی، عادات کلیدی و تسک‌های آغازین بر اساس ارزش‌ها و ظرفیت انرژی شما هستند.",
                "AI and behavioral algorithms are structuring your folders, goals, and daily rhythms based on your values and bandwidth."
              )}
            </p>
          </div>
        </div>
      )}

      {/* MODE 4: AUDIT SYSTEM */}
      {mode === "audit" && (
        <div className="space-y-6 animate-fade-in">
          {isAuditing ? (
            <div className="text-center py-16 space-y-4">
              <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mx-auto" />
              <h3 className="text-lg font-bold">{T("در حال ممیزی سیستم و تسک‌های شما...", "Auditing your system...")}</h3>
            </div>
          ) : auditResult ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <Button variant="ghost" size="sm" onClick={() => setMode("welcome")} className="gap-1 text-xs">
                  <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
                  {T("بازگشت", "Back")}
                </Button>
                <Badge variant="outline" className="text-amber-500 border-amber-500/30">
                  {T("گزارش سلامت سیستم", "System Health Report")}
                </Badge>
              </div>

              <Card className="p-5 rounded-2xl bg-gradient-to-tr from-card to-accent/20 border-border/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-foreground">{T("نمره تعادل سیستم شما", "System Balance Score")}</h2>
                    <p className="text-xs text-muted-foreground">
                      {T(
                        `بر اساس ${auditResult.totalTasks} تسک، ${auditResult.totalFolders} پوشه و ${auditResult.totalHabits} عادت فعلی`,
                        `Based on ${auditResult.totalTasks} tasks, ${auditResult.totalFolders} folders, ${auditResult.totalHabits} habits`
                      )}
                    </p>
                  </div>
                  <div className="text-3xl font-black text-primary font-mono">{auditResult.healthScore}%</div>
                </div>

                <div className="space-y-2 pt-2 border-t border-border/50">
                  <h4 className="text-xs font-semibold text-muted-foreground">{T("توازن چرخ زندگی (Wheel of Life):", "Wheel of Life Balance:")}</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    {Object.entries(auditResult.wheelBalance).map(([key, val]) => (
                      <div key={key} className="p-2 rounded-xl bg-background/70 border border-border/40">
                        <div className="flex justify-between mb-1">
                          <span className="font-medium">
                            {isEn ? LIFE_DOMAINS_INFO[key as LifeDomainKey]?.nameEn || key : LIFE_DOMAINS_INFO[key as LifeDomainKey]?.nameFa || key}
                          </span>
                          <span className="text-muted-foreground font-mono">{val}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${Math.max(5, val)}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Card className="p-4 rounded-2xl bg-emerald-500/5 border-emerald-500/20 space-y-2">
                  <h3 className="text-sm font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4" />
                    {T("نقاط قوت سیستم فعلی", "System Strengths")}
                  </h3>
                  <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                    {auditResult.strengths.map((s, idx) => (
                      <li key={idx}>{s}</li>
                    ))}
                  </ul>
                </Card>

                <Card className="p-4 rounded-2xl bg-amber-500/5 border-amber-500/20 space-y-2">
                  <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                    <Zap className="w-4 h-4" />
                    {T("حلقه‌های باز و موارد نیازمند ارتقا", "Improvement Opportunities")}
                  </h3>
                  <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside">
                    {auditResult.gaps.map((g, idx) => (
                      <li key={idx}>{g}</li>
                    ))}
                  </ul>
                </Card>
              </div>

              {(auditResult.recommendations.addFolders.length > 0 || auditResult.recommendations.addHabits.length > 0) && (
                <Card className="p-4 rounded-2xl border-primary/30 bg-primary/5 space-y-3">
                  <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4" />
                    {T("بسته‌ی پیشنهادی برای تکمیل سیستم (بدون حذف داده‌های قبلی):", "Recommended Additions (Additive only):")}
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {auditResult.recommendations.addFolders.map((f) => (
                      <Badge key={f.id} variant="secondary" className="px-2.5 py-1 text-xs gap-1">
                        <Folder className="w-3 h-3 text-primary" /> {f.name}
                      </Badge>
                    ))}
                    {auditResult.recommendations.addHabits.map((h, i) => (
                      <Badge key={i} variant="outline" className="px-2.5 py-1 text-xs gap-1 border-primary/40">
                        <Flame className="w-3 h-3 text-amber-500" /> {h.name}
                      </Badge>
                    ))}
                  </div>
                  <Button
                    onClick={handleDeployAuditRecommendations}
                    disabled={isDeploying}
                    className="w-full sm:w-auto gap-2 rounded-xl mt-2 shadow-md shadow-primary/20 font-bold"
                  >
                    <Check className="w-4 h-4" />
                    {T("اعمال بسته‌ی بهینه‌سازی به سیستم من", "Apply Recommendations to My System")}
                  </Button>
                </Card>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* MODE 5: BLUEPRINT REVIEW & DEPLOY */}
      {mode === "review" && blueprint && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setMode("wizard")} className="gap-1 text-xs">
              <ArrowRight className="w-3.5 h-3.5 rtl:rotate-180" />
              {T("ویرایش پاسخ‌ها و مراحل", "Edit Answers")}
            </Button>
            <Badge variant="outline" className="text-primary border-primary/30 gap-1 text-xs px-2.5 py-1">
              <Award className="w-3.5 h-3.5" />
              {T("طرح مهندسی‌شده معمار زندگی", "Architect Life Blueprint")}
            </Badge>
          </div>

          {/* Hero Banner */}
          <Card className="p-5 sm:p-6 rounded-3xl bg-gradient-to-br from-card via-card/90 to-primary/10 border-primary/30 shadow-lg space-y-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-foreground">{blueprint.title}</h2>
              {blueprint.energyCapacity && (
                <Badge variant="secondary" className="text-xs bg-primary/10 text-primary border border-primary/20">
                  {ENERGY_CAPACITY_OPTIONS.find((e) => e.key === blueprint.energyCapacity)?.labelFa}
                </Badge>
              )}
            </div>

            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">{blueprint.summary}</p>

            {/* Core Values Anchor Chips */}
            {blueprint.coreValues && blueprint.coreValues.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-xs font-semibold text-muted-foreground me-1">
                  {T("لنگرهای ارزشی:", "Anchor Values:")}
                </span>
                {blueprint.coreValues.map((vKey) => {
                  const meta = CORE_VALUES_LIST.find((v) => v.key === vKey);
                  return (
                    <Badge key={vKey} variant="outline" className="text-xs gap-1 border-primary/30">
                      <span>{meta?.icon}</span>
                      <span>{isEn ? meta?.labelEn : meta?.labelFa}</span>
                    </Badge>
                  );
                })}
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-2.5 text-xs text-foreground">
              <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <div className="leading-relaxed font-medium">{blueprint.scientificInsight}</div>
            </div>
          </Card>

          {/* Sections */}
          <div className="space-y-5">
            {/* 1. Folders */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Folder className="w-3.5 h-3.5 text-primary" />
                {T("پوشه‌های اصلی زندگی (Folders):", "Core Life Folders:")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                {blueprint.folders.map((f) => {
                  const isChecked = selectedFolderIds.has(f.id);
                  return (
                    <Card
                      key={f.id}
                      onClick={() => {
                        const next = new Set(selectedFolderIds);
                        if (isChecked) next.delete(f.id);
                        else next.add(f.id);
                        setSelectedFolderIds(next);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked ? "bg-card border-primary/50 shadow-xs" : "opacity-50 bg-muted/30"
                      }`}
                    >
                      <Checkbox checked={isChecked} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm text-foreground truncate">{f.name}</div>
                        <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{f.description}</p>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 2. Habits */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Flame className="w-3.5 h-3.5 text-amber-500" />
                {T("عادت‌های ریتم روزانه (Keystone Habits):", "Daily Rhythm Keystone Habits:")}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {blueprint.habits.map((h, idx) => {
                  const isChecked = selectedHabitNames.has(h.name);
                  return (
                    <Card
                      key={idx}
                      onClick={() => {
                        const next = new Set(selectedHabitNames);
                        if (isChecked) next.delete(h.name);
                        else next.add(h.name);
                        setSelectedHabitNames(next);
                      }}
                      className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-start gap-2.5 ${
                        isChecked ? "bg-card border-amber-500/50 shadow-xs" : "opacity-50 bg-muted/30"
                      }`}
                    >
                      <Checkbox checked={isChecked} className="mt-1" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs text-foreground">{h.name}</span>
                          {h.reminder_time && (
                            <Badge variant="secondary" className="text-[9px] py-0 px-1 font-mono">
                              <Clock className="w-2.5 h-2.5 me-0.5" />
                              {h.reminder_time}
                            </Badge>
                          )}
                        </div>
                        {h.description && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">{h.description}</p>
                        )}
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>

            {/* 3. Starter Tasks */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5 uppercase tracking-wider">
                <Target className="w-3.5 h-3.5 text-blue-500" />
                {T("تسک‌های هفته اول برای شکستن یخ شروع:", "First-Week Starter Action Tasks:")}
              </h3>
              <div className="space-y-1.5">
                {blueprint.tasks.map((t, idx) => {
                  const isChecked = selectedTaskTitles.has(t.title);
                  return (
                    <Card
                      key={idx}
                      onClick={() => {
                        const next = new Set(selectedTaskTitles);
                        if (isChecked) next.delete(t.title);
                        else next.add(t.title);
                        setSelectedTaskTitles(next);
                      }}
                      className={`p-2.5 px-3 rounded-xl border cursor-pointer transition-all flex items-center gap-2.5 ${
                        isChecked ? "bg-card border-border/70" : "opacity-50 bg-muted/30"
                      }`}
                    >
                      <Checkbox checked={isChecked} />
                      <span className="text-xs font-medium text-foreground flex-1 truncate">{t.title}</span>
                      {t.priority && (
                        <Badge
                          variant={t.priority === "urgent" ? "destructive" : "outline"}
                          className="text-[10px] py-0 px-1.5 font-normal"
                        >
                          {t.priority}
                        </Badge>
                      )}
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Deploy Action Bar */}
          <div className="pt-4 border-t border-border/60 flex flex-col sm:flex-row items-center justify-between gap-3 sticky bottom-0 bg-background/95 backdrop-blur py-3">
            <div className="text-xs text-muted-foreground">
              {T(
                "آیتم‌های تیک‌خورده به صورت خودکار در ساختار برنامه شما مستقر می‌شوند.",
                "Selected items will be automatically created in your app workspace."
              )}
            </div>
            <Button
              size="lg"
              onClick={handleDeploy}
              disabled={isDeploying}
              className="w-full sm:w-auto gap-2 px-8 rounded-2xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/30 font-bold"
            >
              <Sparkles className="w-5 h-5" />
              {isDeploying
                ? T("در حال استقرار سیستم...", "Deploying System...")
                : T("استقرار و ساخت سیستم در برنامه", "Deploy System into My App")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
