import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Sparkles, Loader2 } from "lucide-react";
import { HEXACO_LABELS, type HexacoFactor } from "@/lib/assessments/hexaco";
import { VIA_LABELS, type ViaStrength } from "@/lib/assessments/via";
import { QUADRANT_LABELS, QUADRANT_DESC, type AttachmentQuadrant } from "@/lib/assessments/ecr";
import { markdownToHtml } from "@/lib/markdown";
import { streamAI } from "@/lib/aiStream";
import { toast } from "sonner";

export default function AssessmentResult() {
  const { type } = useParams<{ type: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<any>(null);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  useEffect(() => {
    if (!user || !type) return;
    (async () => {
      const { data } = await supabase
        .from("assessment_results")
        .select("*")
        .eq("user_id", user.id)
        .eq("assessment_type", type)
        .order("completed_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      setData(data);
      // Restore cached AI analysis if any
      const cachedKey = `assessment_ai_${type}_${data?.id}`;
      const cached = localStorage.getItem(cachedKey);
      if (cached) setAiAnalysis(cached);
    })();
  }, [user, type]);

  async function generateAiAnalysis() {
    if (!data || !type) return;
    setLoadingAi(true);
    setAiAnalysis(""); // start empty so streamed tokens render progressively
    const labelMap: Record<string, string> = {
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
        language: "fa",
        onDelta: (chunk) => {
          accumulated += chunk;
          setAiAnalysis(accumulated);
        },
        onDone: () => {
          localStorage.setItem(`assessment_ai_${type}_${data.id}`, accumulated);
          toast.success("تحلیل جامع آماده شد");
        },
      });
    } catch (e: any) {
      toast.error(e.message || "خطا در دریافت تحلیل");
      if (!accumulated) setAiAnalysis(null);
    } finally {
      setLoadingAi(false);
    }
  }

  if (!data) return <div className="p-8 text-center text-muted-foreground">در حال بارگذاری…</div>;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-4 md:p-8 space-y-6">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/self")}>
        <ArrowRight className="w-4 h-4 ms-1" /> بازگشت
      </Button>

      {type === "hexaco" && <HexacoReport scores={data.scores} analysis={data.analysis} />}
      {type === "via" && <ViaReport scores={data.scores} analysis={data.analysis} />}
      {type === "ecr" && <EcrReport scores={data.scores} analysis={data.analysis} />}

      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-primary" />
            تحلیل جامع شخصی‌سازی‌شده
          </CardTitle>
          <CardDescription className="leading-7">
            یک گزارش بالینی عمیق (۱۵۰۰+ کلمه) بر اساس نمره‌های دقیق تو — تحلیل بُعد به بُعد،
            نقاط قوت و سایه‌هایشان، الگوهای ریسک، توصیه‌های شخصی و یک آزمایش هفتگی.
            <br />
            <span className="text-xs text-muted-foreground">⏱ زمان تولید: حدود ۳۰–۶۰ ثانیه — صبور باش.</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {aiAnalysis === null && (
            <Button onClick={generateAiAnalysis} disabled={loadingAi} size="lg" className="w-full sm:w-auto">
              {loadingAi ? (
                <><Loader2 className="w-4 h-4 ms-2 animate-spin" /> در حال تحلیل عمیق…</>
              ) : (
                <><Sparkles className="w-4 h-4 ms-2" /> دریافت تحلیل جامع</>
              )}
            </Button>
          )}
          {aiAnalysis !== null && (
            <>
              {loadingAi && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  در حال نوشتن لحظه‌به‌لحظه…
                </div>
              )}
              <article
                dir="rtl"
                className="prose prose-sm md:prose-base dark:prose-invert max-w-none
                  prose-headings:font-bold prose-headings:text-foreground
                  prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:pb-2 prose-h2:border-b prose-h2:border-primary/20
                  prose-h3:text-base prose-h3:mt-5 prose-h3:mb-2 prose-h3:text-primary
                  prose-p:leading-8 prose-p:my-3
                  prose-li:leading-7 prose-li:my-1
                  prose-strong:text-foreground prose-strong:font-semibold
                  prose-hr:my-6 prose-hr:border-primary/15
                  prose-blockquote:border-primary prose-blockquote:bg-muted/30 prose-blockquote:py-2 prose-blockquote:px-3 prose-blockquote:rounded
                  text-end"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(aiAnalysis) }}
              />
              {!loadingAi && aiAnalysis && (
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" size="sm" onClick={generateAiAnalysis} disabled={loadingAi}>
                    <Sparkles className="w-4 h-4 ms-1" />
                    تولید مجدد
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      navigator.clipboard.writeText(aiAnalysis);
                      toast.success("به کلیپ‌بورد کپی شد");
                    }}
                  >
                    کپی متن کامل
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

function Bar({ label, value, max }: { label: string; value: number; max: number }) {
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

function HexacoReport({ scores, analysis }: { scores: Record<HexacoFactor, number>; analysis: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>۶ محور شخصیت</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(HEXACO_LABELS) as HexacoFactor[]).map((f) => (
            <Bar key={f} label={HEXACO_LABELS[f]} value={scores[f]} max={50} />
          ))}
        </CardContent>
      </Card>

      {analysis?.patterns?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>الگوهای ترکیبی</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {analysis.patterns.map((p: string) => <Badge key={p} variant="secondary">{p}</Badge>)}
          </CardContent>
        </Card>
      )}

      {analysis?.attention_points?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>نکات کلیدی پروفایل تو</CardTitle></CardHeader>
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
            <strong>لحن AI تنظیم شد:</strong>{" "}
            {analysis.ai_tone === "data_driven" && "Data-Driven Minimal — بدون جملات همدلانه، فقط داده."}
            {analysis.ai_tone === "gentle_analytical" && "Gentle Analytical — داده با Framing نرم‌تر."}
            {analysis.ai_tone === "exploratory" && "Exploratory — ارائه چند زاویه دید."}
            {analysis.ai_tone === "neutral" && "خنثی."}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ViaReport({ scores, analysis }: { scores: Record<ViaStrength, number>; analysis: any }) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>۵ نقطه قوت اصلی (Signature Strengths)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {analysis?.signature?.map((s: ViaStrength, i: number) => (
            <div key={s} className="flex items-center justify-between p-3 rounded-lg bg-primary/5">
              <span className="font-medium">{i + 1}. {VIA_LABELS[s]}</span>
              <span className="font-mono text-sm">{scores[s]}/15</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {analysis?.dominant_virtue && (
        <Card>
          <CardContent className="p-5 text-sm">
            <strong>فضیلت غالب:</strong> {analysis.dominant_virtue}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>رتبه‌بندی کامل</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {analysis?.ranking?.map((r: any, i: number) => (
            <div key={r.strength} className="flex items-center justify-between text-sm py-1 border-b border-border/50 last:border-0">
              <span className="text-muted-foreground">{i + 1}. {VIA_LABELS[r.strength as ViaStrength]}</span>
              <span className="font-mono">{r.score}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function EcrReport({ scores, analysis }: { scores: { anxiety: number; avoidance: number }; analysis: any }) {
  const q = analysis?.quadrant as AttachmentQuadrant;
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader><CardTitle>دو بعد دلبستگی</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Bar label="اضطراب دلبستگی" value={scores.anxiety} max={7} />
          <Bar label="اجتناب دلبستگی" value={scores.avoidance} max={7} />
        </CardContent>
      </Card>

      {q && (
        <Card>
          <CardHeader>
            <CardTitle>سبک: {QUADRANT_LABELS[q]}</CardTitle>
          </CardHeader>
          <CardContent className="text-sm leading-relaxed text-muted-foreground">
            {QUADRANT_DESC[q]}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
