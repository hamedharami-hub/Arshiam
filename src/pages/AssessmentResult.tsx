import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Sparkles, Loader2 } from "lucide-react";
import { HEXACO_LABELS, HEXACO_LABELS_EN, type HexacoFactor } from "@/lib/assessments/hexaco";
import { VIA_LABELS, VIA_LABELS_EN, VIA_VIRTUES_EN, type ViaStrength } from "@/lib/assessments/via";
import { QUADRANT_LABELS, QUADRANT_LABELS_EN, QUADRANT_DESC, QUADRANT_DESC_EN, type AttachmentQuadrant } from "@/lib/assessments/ecr";
import { markdownToHtml } from "@/lib/markdown";
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

  useEffect(() => {
    if (!user || !type) return;
    const unsub = subscribeAssessmentResults(user.id, type, (results) => {
      if (results && results.length > 0) {
        setData(results[0]);
        const cachedKey = `assessment_ai_${type}_${results[0].id}_${isEn ? "en" : "fa"}`;
        const cached = localStorage.getItem(cachedKey);
        if (cached) setAiAnalysis(cached);
      }
    });
    return () => unsub();
  }, [user, type, isEn]);

  async function generateAiAnalysis() {
    if (!data || !type) return;
    setLoadingAi(true);
    setAiAnalysis(""); // start empty so streamed tokens render progressively
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
          localStorage.setItem(`assessment_ai_${type}_${data.id}_${isEn ? "en" : "fa"}`, accumulated);
          toast.success(T("تحلیل جامع آماده شد", "Comprehensive analysis ready"));
        },
      });
    } catch (e: any) {
      toast.error(e.message || T("خطا در دریافت تحلیل", "Failed to generate analysis"));
      if (!accumulated) setAiAnalysis(null);
    } finally {
      setLoadingAi(false);
    }
  }

  if (!data) return <div dir={isEn ? "ltr" : "rtl"} className="p-8 text-center text-muted-foreground">{T("در حال بارگذاری…", "Loading…")}</div>;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/self")}>
        <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("بازگشت", "Back")}
      </Button>

      {type === "hexaco" && <HexacoReport scores={data.scores} analysis={data.analysis} isEn={isEn} T={T} />}
      {type === "via" && <ViaReport scores={data.scores} analysis={data.analysis} isEn={isEn} T={T} />}
      {type === "ecr" && <EcrReport scores={data.scores} analysis={data.analysis} isEn={isEn} T={T} />}

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            {T("تحلیل جامع شخصی‌سازی‌شده", "Personalized Comprehensive Analysis")}
          </CardTitle>
          <CardDescription className="leading-7">
            {T(
              "یک گزارش بالینی عمیق (۱۵۰۰+ کلمه) بر اساس نمره‌های دقیق تو — تحلیل بُعد به بُعد، نقاط قوت و سایه‌هایشان، الگوهای ریسک، توصیه‌های شخصی و یک آزمایش هفتگی.",
              "An in-depth clinical report (1500+ words) grounded in your exact scores — dimension-by-dimension breakdown, strengths and their shadow sides, risk patterns, tailored insights, and a 7-day experiment."
            )}
            <br />
            <span className="text-xs text-muted-foreground">
              {T("⏱ زمان تولید: حدود ۳۰–۶۰ ثانیه — صبور باش.", "⏱ Generation time: ~30–60 seconds — please be patient.")}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiAnalysis === null && (
            <Button onClick={generateAiAnalysis} disabled={loadingAi} size="lg" className="w-full sm:w-auto">
              {loadingAi ? (
                <><Loader2 className={`w-4 h-4 ${isEn ? "me-2" : "ms-2"} animate-spin`} /> {T("در حال تحلیل عمیق…", "Deep analysis in progress…")}</>
              ) : (
                <><Sparkles className={`w-4 h-4 ${isEn ? "me-2" : "ms-2"} `} /> {T("دریافت تحلیل جامع", "Get Comprehensive Analysis")}</>
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
                dangerouslySetInnerHTML={{ __html: markdownToHtml(aiAnalysis) }}
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
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysis);
                      toast.success(T("به کلیپ‌بورد کپی شد", "Copied to clipboard"));
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
        <span className="font-mono">{value}/{max}</span>
      </div>
      <div className="h-3 bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function HexacoReport({ scores, analysis, isEn, T }: { scores: Record<HexacoFactor, number>; analysis: any; isEn: boolean; T: (fa: string, en: string) => string }) {
  const labels = isEn ? HEXACO_LABELS_EN : HEXACO_LABELS;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{T("۶ محور شخصیت", "6 Personality Dimensions")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(labels) as HexacoFactor[]).map((f) => (
            <Bar key={f} label={labels[f]} value={scores[f]} max={50} isEn={isEn} />
          ))}
        </CardContent>
      </Card>

      {analysis?.patterns?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{T("الگوهای ترکیبی", "Blended Patterns")}</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.patterns.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
          </CardContent>
        </Card>
      )}

      {analysis?.attention_points?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>{T("نکات کلیدی پروفایل تو", "Key Profile Points")}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm leading-relaxed">
              {analysis.attention_points.map((a: string, i: number) => (
                <li key={i} className="flex gap-2"><span className="text-primary">●</span><span>{a}</span></li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {analysis?.ai_tone && (
        <Card className="bg-muted/30">
          <CardContent className="p-5 text-sm">
            <strong>{T("لحن AI تنظیم شد:", "AI Tone calibrated:")}</strong>{" "}
            {analysis.ai_tone === "data_driven" && (isEn ? "Data-Driven Minimal — direct facts, no empathetic filler." : "Data-Driven Minimal — بدون جملات همدلانه، فقط داده.")}
            {analysis.ai_tone === "gentle_analytical" && (isEn ? "Gentle Analytical — factual insight with softer framing." : "Gentle Analytical — داده با Framing نرم‌تر.")}
            {analysis.ai_tone === "exploratory" && (isEn ? "Exploratory — presenting multiple perspectives." : "Exploratory — ارائه چند زاویه دید.")}
            {analysis.ai_tone === "neutral" && (isEn ? "Neutral." : "خنثی.")}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ViaReport({ scores, analysis, isEn, T }: { scores: Record<ViaStrength, number>; analysis: any; isEn: boolean; T: (fa: string, en: string) => string }) {
  const labels = isEn ? VIA_LABELS_EN : VIA_LABELS;
  const virtueMap = isEn ? VIA_VIRTUES_EN : {};
  const dominantVirtue = isEn && analysis?.dominant_virtue ? (virtueMap[analysis.dominant_virtue] || analysis.dominant_virtue) : analysis?.dominant_virtue;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{T("۵ نقطه قوت اصلی (Signature Strengths)", "Top 5 Signature Strengths")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis?.signature?.map((s: ViaStrength, i: number) => (
            <div key={s} className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <span className="font-medium">{i + 1}. {labels[s]}</span>
              <span className="font-mono text-sm">{scores[s]}/15</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {dominantVirtue && (
        <Card>
          <CardContent className="p-5 text-sm">
            <strong>{T("فضیلت غالب:", "Dominant Virtue:")}</strong> {dominantVirtue}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>{T("رتبه‌بندی کامل", "Complete Ranking")}</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {analysis?.ranking?.map((r: any, i: number) => (
            <div key={r.strength} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{i + 1}. {labels[r.strength as ViaStrength]}</span>
              <span className="font-mono">{r.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EcrReport({ scores, analysis, isEn, T }: { scores: { anxiety: number; avoidance: number }; analysis: any; isEn: boolean; T: (fa: string, en: string) => string }) {
  const q = analysis?.quadrant as AttachmentQuadrant;
  const qLabels = isEn ? QUADRANT_LABELS_EN : QUADRANT_LABELS;
  const qDesc = isEn ? QUADRANT_DESC_EN : QUADRANT_DESC;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>{T("دو بعد دلبستگی", "Two Attachment Dimensions")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Bar label={T("اضطراب دلبستگی", "Attachment Anxiety")} value={scores.anxiety} max={7} isEn={isEn} />
          <Bar label={T("اجتناب دلبستگی", "Attachment Avoidance")} value={scores.avoidance} max={7} isEn={isEn} />
        </CardContent>
      </Card>

      {q && (
        <Card>
          <CardHeader>
            <CardTitle>{T(`سبک: ${qLabels[q]}`, `Style: ${qLabels[q]}`)}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {qDesc[q]}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
