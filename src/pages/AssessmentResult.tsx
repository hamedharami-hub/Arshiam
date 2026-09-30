import { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Loader2,
  Plus,
  Compass,
  Target,
  Brain,
  Zap,
  Shield,
  Heart,
  CheckCircle2,
  Check,
  Flame,
  ExternalLink,
  User,
} from "lucide-react";
import { HEXACO_LABELS, HEXACO_LABELS_EN, type HexacoFactor } from "@/lib/assessments/hexaco";
import { VIA_LABELS, VIA_LABELS_EN, VIA_VIRTUES_EN, type ViaStrength } from "@/lib/assessments/via";
import {
  QUADRANT_LABELS,
  QUADRANT_LABELS_EN,
  QUADRANT_DESC,
  QUADRANT_DESC_EN,
  QUADRANT_PROFILES,
  type AttachmentQuadrant,
} from "@/lib/assessments/ecr";
import { markdownToHtml } from "@/lib/markdown";
import { sanitizeKnowledgeHtml } from "@/lib/knowledgeBeautifier";
import { streamAI } from "@/lib/aiStream";
import { toast } from "sonner";
import { subscribeAssessmentResults } from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

export default function AssessmentResult() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;
  const [data, setData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [addedHabitKeys, setAddedHabitKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user || !type) return;
    const unsub = subscribeAssessmentResults(user.id, type, (results) => {
      if (results && results.length > 0) {
        setData(results[0]);
        const docId = results[0].id || results[0].created_at || "latest";
        const cachedKey = `assessment_ai_${type}_${docId}_${isEn ? "en" : "fa"}`;
        const cached = localStorage.getItem(cachedKey);
        if (cached) setAiAnalysis(cached);
      }
    });
    return () => unsub();
  }, [user, type, isEn]);

  async function handleAddHabit(habitName: string, habitDesc: string, key: string) {
    if (!user) return;
    try {
      await firebaseStore.from("habits").insert({
        user_id: user.id,
        name: habitName,
        description: habitDesc,
        frequency: "daily",
        target_days: [0, 1, 2, 3, 4, 5, 6],
      } as any);
      window.dispatchEvent(new Event("habits-changed"));
      setAddedHabitKeys((prev) => new Set(prev).add(key));
      toast.success(T("عادت پیشنهادی با موفقیت به برنامه شما افزوده شد ✨", "Habit successfully added to your habits ✨"));
    } catch (e: any) {
      toast.error(e.message || T("خطا در افزودن عادت", "Failed to add habit"));
    }
  }

  async function handleSyncWithAboutMe() {
    if (!user || !data) return;
    try {
      const summaryText =
        type === "hexaco"
          ? `کهن‌الگوی شخصیتی: ${data.analysis?.archetype?.titleFa || "HEXACO"} (لحن: ${data.analysis?.ai_tone})`
          : type === "via"
          ? `نقاط قوت امضا: ${(data.analysis?.signature || []).map((s: any) => VIA_LABELS[s as ViaStrength] || s).join("، ")} (فضیلت غالب: ${data.analysis?.dominant_virtue})`
          : `سبک دلبستگی روابط: ${QUADRANT_LABELS[data.analysis?.quadrant as AttachmentQuadrant] || data.analysis?.quadrant}`;

      const { data: existing } = await firebaseStore
        .from("about_me" as any)
        .select("ai_analysis")
        .eq("user_id", user.id)
        .maybeSingle();

      const existingAnalysis = existing?.ai_analysis || {};
      const updatedStrengths = Array.from(
        new Set([
          ...(existingAnalysis.strengths || []),
          ...(data.analysis?.signature?.map((s: any) => VIA_LABELS[s as ViaStrength] || s) || []),
        ])
      );

      await firebaseStore.from("about_me" as any).upsert(
        {
          user_id: user.id,
          ai_analysis: {
            ...existingAnalysis,
            summary: existingAnalysis.summary ? `${existingAnalysis.summary} | ${summaryText}` : summaryText,
            strengths: updatedStrengths.length > 0 ? updatedStrengths : existingAnalysis.strengths,
          },
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );

      toast.success(T("بینش‌های خودشناسی با بخش «درباره من» همگام شد ✨", "Self-knowledge synced with About Me ✨"));
    } catch (e: any) {
      toast.error(e.message || T("خطا در همگام‌سازی با درباره من", "Failed to sync with About Me"));
    }
  }

  async function generateAiAnalysis() {
    if (!data || !type) return;
    setLoadingAi(true);
    setAiAnalysis("");
    const labelMap: Record<string, string> = isEn
      ? {
          hexaco: "HEXACO-60 (Six personality dimensions: H/E/X/A/C/O, 10..50 each)",
          via: "VIA-72 (24 character strengths, 3..15 each)",
          ecr: "ECR-R (Two attachment dimensions: anxiety and avoidance, 1..7)",
        }
      : {
          hexaco: "HEXACO-60 (شش بُعد شخصیت: H/E/X/A/C/O، هر بُعد 10..50)",
          via: "VIA-72 (24 نقطه قوت، هر کدام 3..15)",
          ecr: "ECR-R (دو بُعد دلبستگی: anxiety و avoidance، 1..7)",
        };
    const payload = {
      instrument: labelMap[type] || type,
      scores: data.scores,
      analysis: data.analysis,
    };
    let accumulated = "";
    try {
      await streamAI({
        mode: "assessment_analysis",
        input: JSON.stringify(payload),
        language: isEn ? "en" : "fa",
        onDelta: (chunk) => {
          accumulated += chunk;
          setAiAnalysis(accumulated);
        },
        onDone: () => {
          const docId = data.id || data.created_at || "latest";
          localStorage.setItem(`assessment_ai_${type}_${docId}_${isEn ? "en" : "fa"}`, accumulated);
          toast.success(T("تحلیل جامع آماده شد", "Comprehensive analysis ready"));
        },
      });
    } catch (e: any) {
      toast.error(e.message || T("خطا در دریافت تحلیل آنلاین", "Failed to generate online analysis"));
      if (!accumulated) {
        // Fallback rule-based comprehensive synthesis
        const fallbackText =
          type === "hexaco"
            ? `## تحلیل تفصیلی شخصیت HEXACO\n\n**کهن‌الگوی شما:** ${data.analysis?.archetype?.titleFa}\n\n${data.analysis?.archetype?.descFa}\n\n### سبک کار و بهره‌وری:\n${data.analysis?.successRoadmap?.workStyleFa}\n\n### روابط و کار تیمی:\n${data.analysis?.successRoadmap?.relationshipsFa}\n\n### مدیریت استرس:\n${data.analysis?.successRoadmap?.stressManagementFa}`
            : type === "via"
            ? `## تحلیل امضای نقاط قوت VIA\n\n**فضیلت غالب شما:** ${data.analysis?.dominant_virtue}\n\n### نقاط قوت پنج‌گانه شما:\n${(data.analysis?.signatureDetails || []).map((s: any) => `- **${s.nameFa}** (فضیلت ${s.virtueFa}): ${s.dailyApplicationFa}`).join("\n")}`
            : `## تحلیل سبک دلبستگی ECR-R\n\n**سبک شما:** ${QUADRANT_LABELS[data.analysis?.quadrant as AttachmentQuadrant]}\n\n${QUADRANT_PROFILES[data.analysis?.quadrant as AttachmentQuadrant]?.summaryFa}`;
        setAiAnalysis(fallbackText);
      }
    } finally {
      setLoadingAi(false);
    }
  }

  if (!data)
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="p-8 text-center text-muted-foreground">
        {T("در حال بارگذاری…", "Loading…")}
      </div>
    );

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/self")}>
          <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("بازگشت به خودشناسی", "Back to Self-Knowledge")}
        </Button>
        <Badge variant="outline" className="text-primary border-primary/30">
          {T("گزارش نتایج و نقشه موفقیت", "Result & Success Roadmap")}
        </Badge>
      </div>

      {type === "hexaco" && <HexacoReport scores={data.scores} analysis={data.analysis} isEn={isEn} T={T} />}
      {type === "via" && (
        <ViaReport
          scores={data.scores}
          analysis={data.analysis}
          isEn={isEn}
          T={T}
          onAddHabit={handleAddHabit}
          addedHabitKeys={addedHabitKeys}
        />
      )}
      {type === "ecr" && (
        <EcrReport
          scores={data.scores}
          analysis={data.analysis}
          isEn={isEn}
          T={T}
          onAddHabit={handleAddHabit}
          addedHabitKeys={addedHabitKeys}
        />
      )}

      {/* CONNECTED SUCCESS ROADMAP HUB */}
      <Card className="border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card shadow-md space-y-4 p-5 sm:p-6 rounded-3xl">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 text-primary flex items-center justify-center shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-base text-foreground">
              {T("پیوند خودشناسی با برنامه و سیستم موفقیت شما", "Connect Insights to Your Success System")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {T(
                "خودشناسی نقطه آغاز است؛ با این کلیدهای سریع، بینش‌های این آزمون را به عادت‌ها، اهداف و تصمیمات روزمره‌تان متصل کنید.",
                "Turn self-awareness into action: integrate these insights into your goals, habits, and daily rhythm."
              )}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <Button
            asChild
            variant="outline"
            className="h-auto p-3 text-start justify-start border-border/70 hover:border-primary/60 rounded-2xl bg-card/60"
          >
            <Link to="/app/life-architect">
              <Compass className="w-4 h-4 text-primary shrink-0 me-2" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("معمار زندگی", "Life Architect")}</div>
                <div className="text-[10px] text-muted-foreground">{T("چیدمان پوشه‌ها و اهداف بر پایه شخصیت", "Align life OS with your profile")}</div>
              </div>
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-auto p-3 text-start justify-start border-border/70 hover:border-primary/60 rounded-2xl bg-card/60"
          >
            <Link to="/app/mind">
              <Heart className="w-4 h-4 text-rose-500 shrink-0 me-2" />
              <div>
                <div className="text-xs font-bold text-foreground">{T("ارزش‌ها و اهداف ACT", "Values & ACT Goals")}</div>
                <div className="text-[10px] text-muted-foreground">{T("همراستایی اهداف با نقاط قوت درون", "Anchor goals in core strengths")}</div>
              </div>
            </Link>
          </Button>

          <Button
            onClick={handleSyncWithAboutMe}
            variant="outline"
            className="h-auto p-3 text-start justify-start border-border/70 hover:border-primary/60 rounded-2xl bg-card/60"
          >
            <User className="w-4 h-4 text-amber-500 shrink-0 me-2" />
            <div>
              <div className="text-xs font-bold text-foreground">{T("همگام با درباره من", "Sync with About Me")}</div>
              <div className="text-[10px] text-muted-foreground">{T("ذخیره در بیوگرافی شخصی شما", "Store in personal biography")}</div>
            </div>
          </Button>
        </div>
      </Card>

      {/* COMPREHENSIVE AI REPORT */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent rounded-3xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {T("تحلیل جامع شخصی‌سازی‌شده AI", "Personalized Comprehensive AI Analysis")}
          </CardTitle>
          <CardDescription className="leading-7">
            {T(
              "یک گزارش تفصیلی بالینی بر اساس نمره‌های دقیق شما — تحلیل ابعاد، نقاط قوت و سایه‌هایشان، الگوهای ریسک و تمرین‌های هفتگی.",
              "An in-depth clinical report grounded in your exact scores — dimension breakdown, shadow sides, risk patterns, and targeted practices."
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiAnalysis === null && (
            <Button onClick={generateAiAnalysis} disabled={loadingAi} size="lg" className="w-full sm:w-auto font-bold rounded-xl shadow-md shadow-primary/20">
              {loadingAi ? (
                <>
                  <Loader2 className={`w-4 h-4 ${isEn ? "me-2" : "ms-2"} animate-spin`} />
                  {T("در حال تحلیل عمیق…", "Deep analysis in progress…")}
                </>
              ) : (
                <>
                  <Sparkles className={`w-4 h-4 ${isEn ? "me-2" : "ms-2"}`} />
                  {T("دریافت تحلیل جامع AI", "Get Comprehensive AI Analysis")}
                </>
              )}
            </Button>
          )}
          {aiAnalysis !== null && (
            <>
              {loadingAi && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  {T("در حال نوشتن لحظه‌به‌لحظه…", "Streaming real-time analysis…")}
                </div>
              )}
              <article
                dir={isEn ? "ltr" : "rtl"}
                className={`prose prose-sm md:prose-base dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-primary/20
                  prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-primary
                  prose-p:leading-8 prose-p:my-3
                  prose-li:leading-7 prose-li:my-1
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-hr:my-6 prose-hr:border-primary/15
                  prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-3 prose-blockquote:rounded
                  ${isEn ? "text-start" : "text-end"}`}
                dangerouslySetInnerHTML={{
                  __html: sanitizeKnowledgeHtml(markdownToHtml(aiAnalysis)),
                }}
              />
              {!loadingAi && aiAnalysis && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={generateAiAnalysis} disabled={loadingAi}>
                    <Sparkles className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
                    {T("تولید مجدد", "Regenerate")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      try {
                        if (navigator?.clipboard?.writeText) {
                          await navigator.clipboard.writeText(aiAnalysis);
                          toast.success(T("به کلیپ‌بورد کپی شد", "Copied to clipboard"));
                        } else {
                          toast.error(T("عدم دسترسی به کلیپ‌بورد", "Clipboard not accessible"));
                        }
                      } catch {
                        toast.error(T("خطا در کپی متن", "Failed to copy text"));
                      }
                    }}
                  >
                    {T("کپی متن کامل", "Copy Full Text")}
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Bar({ label, value, max, isEn }: { label: string; value: number; max: number; isEn?: boolean }) {
  const pct = (value / max) * 100;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-sm">
        <span>{label}</span>
        <span className="font-mono font-medium">
          {value}/{max}
        </span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HexacoReport({
  scores,
  analysis,
  isEn,
  T,
}: {
  scores: Record<HexacoFactor, number>;
  analysis: any;
  isEn: boolean;
  T: (fa: string, en: string) => string;
}) {
  const labels = isEn ? HEXACO_LABELS_EN : HEXACO_LABELS;
  const archetype = analysis?.archetype;
  const roadmap = analysis?.successRoadmap;
  const factorDetails = analysis?.factorDetails;

  return (
    <div className="space-y-6">
      {/* Archetype Hero Card */}
      {archetype && (
        <Card className="p-5 rounded-3xl bg-gradient-to-br from-primary/15 via-card to-card border-primary/30 shadow-md space-y-2">
          <Badge variant="outline" className="text-primary border-primary/40 text-xs px-2.5 py-0.5">
            {T("کهن‌الگوی رفتاری و شخصیتی", "Behavioral Personality Archetype")}
          </Badge>
          <h2 className="text-xl sm:text-2xl font-black text-foreground">
            {isEn && archetype.titleEn ? archetype.titleEn : archetype.titleFa}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {isEn && archetype.descEn ? archetype.descEn : archetype.descFa}
          </p>
        </Card>
      )}

      {/* 6 Dimensions Overview */}
      <Card className="rounded-3xl border-border/80">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{T("۶ محور اساسی شخصیت (HEXACO)", "6 Core Personality Dimensions")}</CardTitle>
          <CardDescription>
            {T("نمره‌دهی استاندارد ۱۰ تا ۵۰ در هر بُعد شخصیتی", "Standardized scoring 10 to 50 per factor")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          {(Object.keys(labels) as HexacoFactor[]).map((f) => (
            <Bar key={f} label={labels[f]} value={scores[f]} max={50} isEn={isEn} />
          ))}
        </CardContent>
      </Card>

      {/* Factor Interpretations Breakdown */}
      {factorDetails && (
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {T("تحلیل و کاربرد اختصاصی هر بُعد:", "Dimension-by-Dimension Analysis:")}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {(Object.keys(labels) as HexacoFactor[]).map((f) => {
              const det = factorDetails[f];
              if (!det) return null;
              return (
                <Card key={f} className="p-4 rounded-2xl border border-border/70 bg-card/70 space-y-2 text-start">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-foreground">{labels[f]}</span>
                    <Badge
                      variant={det.level === "high" ? "default" : det.level === "low" ? "secondary" : "outline"}
                      className="text-[10px] py-0 px-1.5"
                    >
                      {det.level === "high" ? T("بالا", "High") : det.level === "low" ? T("پایین", "Low") : T("متوسط", "Moderate")}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{isEn ? det.summaryEn : det.summaryFa}</p>
                  <div className="text-[11px] pt-1 border-t border-border/40 text-primary font-medium">
                    <span className="font-bold">{T("نقطه قوت: ", "Strength: ")}</span>
                    {isEn ? det.strengthEn : det.strengthFa}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Success Roadmap Snippet */}
      {roadmap && (
        <Card className="rounded-3xl border-primary/20 bg-primary/5 space-y-3 p-5">
          <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <Zap className="w-4 h-4" />
            {T("برنامه موفقیت و سبک کاری متناسب با شخصیت شما:", "Your Personality-Informed Success Playbook:")}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
            <div className="p-3 rounded-2xl bg-card/80 border border-border/60 space-y-1">
              <span className="font-bold text-foreground">💼 {T("سبک کار و بهره‌وری", "Work & Productivity")}</span>
              <p className="text-muted-foreground leading-relaxed">{isEn ? roadmap.workStyleEn : roadmap.workStyleFa}</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/80 border border-border/60 space-y-1">
              <span className="font-bold text-foreground">🤝 {T("روابط و کار تیمی", "Relationships & Teams")}</span>
              <p className="text-muted-foreground leading-relaxed">{isEn ? roadmap.relationshipsEn : roadmap.relationshipsFa}</p>
            </div>
            <div className="p-3 rounded-2xl bg-card/80 border border-border/60 space-y-1">
              <span className="font-bold text-foreground">🧘 {T("مدیریت استرس و انرژی", "Stress Management")}</span>
              <p className="text-muted-foreground leading-relaxed">{isEn ? roadmap.stressManagementEn : roadmap.stressManagementFa}</p>
            </div>
          </div>
        </Card>
      )}

      {/* AI Tone Card */}
      {analysis?.ai_tone && (
        <Card className="bg-muted/40 rounded-2xl border-border/60 p-4 text-xs">
          <strong>{T("لحن هوش مصنوعی اختصاصی تنظیم شد:", "Calibrated AI Tone:")}</strong>{" "}
          {analysis.ai_tone === "data_driven" && (isEn ? "Data-Driven Minimal — direct facts, no fluff." : "داده‌محور و صریح — تمرکز روی ارقام و واقعیت‌های عینی.")}
          {analysis.ai_tone === "gentle_analytical" && (isEn ? "Gentle Analytical — warm, empathetic yet rigorously factual." : "همدلانه و تحلیلی — ارائه حقایق با بسته‌بندی نرم و همدلانه.")}
          {analysis.ai_tone === "exploratory" && (isEn ? "Exploratory — presenting diverse creative viewpoints." : "کاوشگرانه — ارائه زوایای دید خلاقانه و نوآورانه.")}
          {analysis.ai_tone === "neutral" && (isEn ? "Neutral and balanced." : "متعادل و خنثی.")}
        </Card>
      )}
    </div>
  );
}

function ViaReport({
  scores,
  analysis,
  isEn,
  T,
  onAddHabit,
  addedHabitKeys,
}: {
  scores: Record<ViaStrength, number>;
  analysis: any;
  isEn: boolean;
  T: (fa: string, en: string) => string;
  onAddHabit: (name: string, desc: string, key: string) => void;
  addedHabitKeys: Set<string>;
}) {
  const labels = isEn ? VIA_LABELS_EN : VIA_LABELS;
  const dominantVirtue = isEn && analysis?.dominant_virtue_en ? analysis.dominant_virtue_en : analysis?.dominant_virtue;
  const signatureDetails = analysis?.signatureDetails || [];

  return (
    <div className="space-y-6">
      {/* Signature Strengths Hero */}
      <Card className="rounded-3xl border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-card to-card p-5 sm:p-6 space-y-3">
        <div className="flex items-center justify-between">
          <Badge variant="outline" className="text-amber-600 dark:text-amber-400 border-amber-500/30 text-xs px-2.5 py-0.5">
            {T("امضای شخصیتی شما (Signature Strengths)", "Your Signature Strengths")}
          </Badge>
          {dominantVirtue && (
            <Badge variant="secondary" className="text-xs">
              {T("فضیلت غالب: ", "Dominant Virtue: ")} {dominantVirtue}
            </Badge>
          )}
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-foreground">
          {T("۵ نقطه قوت کلیدی که در آنها شکوفا می‌شوید", "5 Core Strengths Where You Naturally Flourish")}
        </h2>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {T(
            "بر اساس روانشناسی مثبت‌گرا، پیشرفت سریع و احساس نشاط واقعی زمانی رخ می‌دهد که وظایف روزمره‌تان را حول این نقاط قوت بچینید، نه اینکه صرفاً روی ترمیم نقاط ضعف تمرکز کنید.",
            "Positive psychology proves that peak performance and vitality emerge from compounding your signature strengths."
          )}
        </p>
      </Card>

      {/* 5 Signature Strengths Detailed Cards */}
      <div className="space-y-3">
        {signatureDetails.map((s: any, i: number) => {
          const habitKey = `via_habit_${s.strength}`;
          const isAdded = addedHabitKeys.has(habitKey);

          return (
            <Card key={s.strength} className="p-4 rounded-2xl border border-border/80 bg-card/80 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold text-xs flex items-center justify-center">
                    {i + 1}
                  </span>
                  <span className="font-bold text-sm text-foreground">{isEn ? s.nameEn : s.nameFa}</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-normal">
                    {isEn ? s.virtueEn : s.virtueFa}
                  </Badge>
                </div>
                <span className="font-mono text-xs font-bold text-primary">{s.score}/۱۵</span>
              </div>

              <div className="text-xs text-foreground/90 leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/40">
                <strong className="text-primary">{T("💡 کاربرد روزمره در کار و زندگی: ", "💡 Daily Application: ")}</strong>
                {isEn ? s.dailyApplicationEn : s.dailyApplicationFa}
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-1 text-[11px] text-muted-foreground">
                <div className="flex-1">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{T("سایه افراط: ", "Shadow/Overuse: ")}</span>
                  {isEn ? s.shadowWarningEn : s.shadowWarningFa}
                </div>

                {s.recommendedHabitFa && (
                  <Button
                    size="sm"
                    variant={isAdded ? "secondary" : "outline"}
                    disabled={isAdded}
                    onClick={() =>
                      onAddHabit(
                        isEn ? s.recommendedHabitEn : s.recommendedHabitFa,
                        isEn ? s.dailyApplicationEn : s.dailyApplicationFa,
                        habitKey
                      )
                    }
                    className="shrink-0 text-xs h-7 gap-1 rounded-xl"
                  >
                    {isAdded ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-500" />
                        {T("عادت اضافه شد", "Habit Added")}
                      </>
                    ) : (
                      <>
                        <Plus className="w-3 h-3 text-primary" />
                        {T("افزودن عادت", "Add as Habit")}
                      </>
                    )}
                  </Button>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Complete 24 Ranking */}
      <Card className="rounded-3xl border-border/70">
        <CardHeader>
          <CardTitle className="text-base">{T("رتبه‌بندی کامل ۲۴ نقطه قوت", "Complete 24 Strengths Ranking")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis?.ranking?.map((r: any, i: number) => (
            <div
              key={r.strength}
              className="flex items-center justify-between text-xs py-1.5 border-b border-border/40 last:border-0"
            >
              <span className="text-muted-foreground">
                {i + 1}. {labels[r.strength as ViaStrength]}
              </span>
              <span className="font-mono font-medium">{r.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EcrReport({
  scores,
  analysis,
  isEn,
  T,
  onAddHabit,
  addedHabitKeys,
}: {
  scores: { anxiety: number; avoidance: number };
  analysis: any;
  isEn: boolean;
  T: (fa: string, en: string) => string;
  onAddHabit: (name: string, desc: string, key: string) => void;
  addedHabitKeys: Set<string>;
}) {
  const q = analysis?.quadrant as AttachmentQuadrant;
  const qLabels = isEn ? QUADRANT_LABELS_EN : QUADRANT_LABELS;
  const profile = QUADRANT_PROFILES[q];
  const habitKey = `ecr_habit_${q}`;
  const isAdded = addedHabitKeys.has(habitKey);

  return (
    <div className="space-y-6">
      {/* 2 Dimensions Bars */}
      <Card className="rounded-3xl border-border/80">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">{T("دو بعد بنیادی دلبستگی بزرگسالان", "Two Core Attachment Dimensions")}</CardTitle>
          <CardDescription>{T("مقیاس ۱ تا ۷ (مرز تفکیک استاندارد: ۳.۵)", "Scale 1 to 7 (Cutoff threshold: 3.5)")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3.5">
          <Bar label={T("اضطراب دلبستگی (ترس از رهاشدگی)", "Attachment Anxiety (Fear of Rejection)")} value={scores.anxiety} max={7} isEn={isEn} />
          <Bar label={T("اجتناب دلبستگی (ترس از صمیمیت)", "Attachment Avoidance (Fear of Intimacy)")} value={scores.avoidance} max={7} isEn={isEn} />
        </CardContent>
      </Card>

      {/* Quadrant Profile Deep Dive */}
      {profile && (
        <Card className="rounded-3xl border-rose-500/30 bg-gradient-to-br from-rose-500/10 via-card to-card p-5 sm:p-6 space-y-4 shadow-md">
          <div className="flex items-center justify-between">
            <Badge variant="outline" className="text-rose-600 dark:text-rose-400 border-rose-500/30 text-xs px-2.5 py-0.5">
              {T("سبک دلبستگی غالب شما", "Your Primary Attachment Style")}
            </Badge>
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-foreground mb-1">
              {isEn ? profile.titleEn : profile.titleFa}
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
              {isEn ? profile.summaryEn : profile.summaryFa}
            </p>
          </div>

          {/* Strengths & Triggers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                {T("نقاط قوت رابطه و کار شما:", "Relational & Work Strengths:")}
              </h4>
              <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside leading-relaxed">
                {(isEn ? profile.strengthsEn : profile.strengthsFa).map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>

            <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-2">
              <h4 className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5" />
                {T("محرک‌ها و زنگ خطرهای احساسی:", "Emotional Triggers:")}
              </h4>
              <ul className="text-xs text-foreground/80 space-y-1 list-disc list-inside leading-relaxed">
                {(isEn ? profile.triggersEn : profile.triggersFa).map((t, idx) => (
                  <li key={idx}>{t}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Self-Regulation Protocol */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 space-y-2">
            <div className="text-xs text-foreground font-medium leading-relaxed">
              <strong className="text-primary">{T("راهبرد خودتنظیمی هیجانی: ", "Self-Regulation Strategy: ")}</strong>
              {isEn ? profile.regulationTipEn : profile.regulationTipFa}
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 pt-2 border-t border-border/40 text-xs">
              <span className="text-muted-foreground">{isEn ? profile.recommendedPracticeEn : profile.recommendedPracticeFa}</span>
              <Button
                size="sm"
                variant={isAdded ? "secondary" : "outline"}
                disabled={isAdded}
                onClick={() =>
                  onAddHabit(
                    isEn ? "Emotional Grounding Check-in" : "چک‌این خودآرام‌بخشی و حضور ذهن",
                    isEn ? profile.recommendedPracticeEn : profile.recommendedPracticeFa,
                    habitKey
                  )
                }
                className="shrink-0 text-xs h-7 gap-1 rounded-xl"
              >
                {isAdded ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-500" />
                    {T("عادت اضافه شد", "Habit Added")}
                  </>
                ) : (
                  <>
                    <Plus className="w-3 h-3 text-primary" />
                    {T("افزودن تمرین به عادات", "Add Practice as Habit")}
                  </>
                )}
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
