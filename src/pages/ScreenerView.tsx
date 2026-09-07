import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, AlertTriangle, Phone, Plus, History, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { SCREENERS, scoreScreener, severityColor, type ScreenerType } from "@/lib/assessments/screeners";
import { CRISIS_RESOURCES } from "@/lib/crisisDetection";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceArea, Area, AreaChart,
} from "recharts";
import { formatDate, toPersianDigits } from "@/lib/jalali";

import {
  subscribeAssessmentResults,
  upsertAssessmentResult,
  type AssessmentResultItem,
} from "@/lib/firestoreDataService";

function ScreenerTrendTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1 min-w-[150px]" dir="rtl">
      <div className="font-semibold text-foreground border-b border-border/60 pb-1 text-[13px]">{data.fullDate || data.date}</div>
      <div className="flex items-center justify-between gap-3 text-muted-foreground pt-1">
        <span>نمره خام:</span>
        <span className="font-bold text-foreground font-mono">{toPersianDigits(data.raw)}</span>
      </div>
      {data.severity && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>شدت:</span>
          <span className="font-bold text-primary">{data.severity}</span>
        </div>
      )}
    </div>
  );
}

export default function ScreenerView() {
  const { type } = useParams<{ type: ScreenerType }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const meta = type ? SCREENERS[type] : null;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"intro" | "run" | "result">("intro");
  const [history, setHistory] = useState<AssessmentResultItem[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);

  useEffect(() => {
    if (!user || !type) return;
    const unsub = subscribeAssessmentResults(user.id, type, (items) => {
      setHistory(items);
    });
    return () => unsub();
  }, [user, type, stage]);

  const trend = useMemo(() => history.slice().reverse().map((h: any) => {
    const d = new Date(h.completed_at || h.created_at || Date.now());
    return {
      date: formatDate(d, "d MMM"),
      fullDate: formatDate(d, "EEEE d MMMM yyyy"),
      score: h.scores?.normalized ?? 0,
      raw: h.scores?.raw ?? 0,
      severity: h.analysis?.severityLabel ?? "",
    };
  }), [history]);

  if (!meta) return <div className="p-8 text-center text-muted-foreground">تست نامعتبر</div>;
  const item = meta.items[index];
  const progress = ((index + 1) / meta.items.length) * 100;
  const answered = answers[item?.id];

  async function answer(v: number) {
    if (!item) return;
    const next = { ...answers, [item.id]: v };
    setAnswers(next);
    if (index < meta!.items.length - 1) {
      setIndex(index + 1);
    } else {
      await finish(next);
    }
  }

  async function finish(final: Record<number, number>) {
    if (!user || !type) return;
    const result = scoreScreener(type, final);
    const payload = {
      assessment_type: type,
      scores: { raw: result.raw, normalized: result.normalized, answers: final },
      analysis: {
        severity: result.severity,
        severityLabel: result.severityLabel,
        recommendation: result.recommendation,
        flags: result.flags,
      },
    };

    const saved = await upsertAssessmentResult(user.id, payload);
    // Mirror to firebaseStore if accessible
    firebaseStore.from("assessment_results").insert({
      user_id: user.id,
      ...payload,
    }).catch(() => {});

    if (saved) {
      setLatestResult(saved);
      setStage("result");
      toast.success("نتیجه ذخیره شد ✨");
    } else {
      toast.error("خطا در ذخیره نتیجه ارزیابی");
    }
  }

  const lastResult = latestResult || history[0];
  const lastAnalysis = lastResult?.analysis as any;

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
          <ArrowRight className="w-4 h-4 ms-1" /> Mind
        </Button>
        {stage === "run" && <span className="text-xs text-muted-foreground">{index + 1} / {meta.items.length}</span>}
      </div>

      {stage === "intro" && (
        <>
          <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border">
            <h1 className="text-2xl font-bold mb-1">{meta.title}</h1>
            <p className="text-sm text-muted-foreground leading-7">{meta.subtitle}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">{meta.items.length} سوال</Badge>
              <Badge variant="secondary">~{Math.ceil(meta.items.length * 10 / 60)} دقیقه</Badge>
              <Badge variant="outline">برای ردیابی شخصی، نه تشخیص بالینی</Badge>
            </div>
            <Button className="mt-5" size="lg" onClick={() => { setAnswers({}); setIndex(0); setStage("run"); }}>
              <Plus className="w-4 h-4 ms-1" /> شروع تست جدید
            </Button>
          </div>

          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" /> روند نمره
                </CardTitle>
                <CardDescription>{history.length} ثبت اخیر</CardDescription>
              </CardHeader>
              <CardContent>
                {trend.length >= 2 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <AreaChart data={trend}>
                      <defs>
                        <linearGradient id="screenerG" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                      <YAxis domain={[0, 100]} fontSize={10} tickLine={false} axisLine={false} width={28} />
                      <Tooltip content={<ScreenerTrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="score"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2.5}
                        fill="url(#screenerG)"
                        dot={{ r: 3.5, fill: "hsl(var(--primary))" }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground">حداقل ۲ ثبت برای نمودار لازم است.</p>
                )}
                <div className="space-y-1 mt-3">
                  {history.slice(0, 5).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/40 text-sm">
                      <span className="text-muted-foreground">{new Date(h.completed_at).toLocaleString("fa-IR", { dateStyle: "medium", timeStyle: "short" })}</span>
                      <span className="font-mono tabular-nums" style={{ color: severityColor(h.analysis?.severity) }}>
                        {h.scores?.raw} ({h.analysis?.severityLabel})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {stage === "run" && item && (
        <>
          <Progress value={progress} className="h-2" />
          <Card>
            <CardContent className="p-6 space-y-5">
              <p className="text-lg leading-relaxed font-medium">{item.text}</p>
              <div className="grid grid-cols-1 gap-2">
                {meta.labels.map((label, i) => {
                  const v = i + meta.scaleStart;
                  const selected = answered === v;
                  return (
                    <button
                      key={i}
                      onClick={() => answer(v)}
                      className={`w-full text-start p-3 rounded-lg border-2 transition text-sm font-medium flex items-center justify-between ${
                        selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
                      }`}
                    >
                      <span>{label}</span>
                      <span className="font-mono text-xs text-muted-foreground">{v}</span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
          <div className="flex justify-between">
            <Button variant="outline" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
              <ArrowRight className="w-4 h-4 ms-1" /> قبلی
            </Button>
            <Button variant="ghost" onClick={() => setStage("intro")}>انصراف</Button>
            <Button variant="outline" disabled={answered == null || index === meta.items.length - 1} onClick={() => setIndex((i) => i + 1)}>
              بعدی <ArrowLeft className="w-4 h-4 me-1" />
            </Button>
          </div>
        </>
      )}

      {stage === "result" && lastResult && (
        <>
          <Card className="border-2" style={{ borderColor: severityColor(lastAnalysis.severity) }}>
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>نتیجه</CardTitle>
                  <CardDescription>{meta.title}</CardDescription>
                </div>
                <div className="text-end">
                  <div className="text-3xl font-bold tabular-nums" style={{ color: severityColor(lastAnalysis.severity) }}>
                    {lastResult.scores?.raw}
                  </div>
                  <div className="text-xs text-muted-foreground">از {meta.items.length * (meta.scale - 1 + meta.scaleStart)}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <Badge style={{ background: severityColor(lastAnalysis.severity), color: "white" }}>{lastAnalysis.severityLabel}</Badge>
              <p className="text-sm leading-7">{lastAnalysis.recommendation}</p>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full transition-all" style={{ width: `${lastResult.scores?.normalized}%`, background: severityColor(lastAnalysis.severity) }} />
              </div>
            </CardContent>
          </Card>

          {lastAnalysis.flags?.includes("suicidal_ideation") && (
            <Card className="border-2 border-destructive bg-destructive/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="w-5 h-5" /> مهم — لطفاً بخوان
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7">
                <p>پاسخ تو به سوال آخر نشان می‌دهد افکار آسیب به خود را تجربه می‌کنی. این جدی است و تنها نیستی.</p>
                <div className="grid gap-2">
                  {CRISIS_RESOURCES.fa.map((r) => (
                    <a key={r.phone} href={`tel:${r.phone}`} className="flex items-center justify-between p-3 bg-background rounded-lg border hover:bg-muted">
                      <span>{r.label}</span>
                      <span className="font-mono flex items-center gap-1"><Phone className="w-3 h-3" /> {r.phone}</span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {(lastAnalysis.severity === "moderate" || lastAnalysis.severity === "moderately_severe" || lastAnalysis.severity === "severe") && (
            <Card>
              <CardHeader><CardTitle className="text-base">قدم‌های پیشنهادی</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Button asChild variant="outline" size="sm"><Link to="/app/checkin">Check-in امروز</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/app/thoughts">ثبت فکر CBT</Link></Button>
                <Button asChild variant="outline" size="sm"><Link to="/app/worry">Worry/Problem-Solving</Link></Button>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-2">
            <Button onClick={() => { setAnswers({}); setIndex(0); setStage("intro"); setLatestResult(null); }} variant="outline">
              بازگشت به مرور
            </Button>
            <Button onClick={() => { setAnswers({}); setIndex(0); setStage("run"); setLatestResult(null); }}>
              <Sparkles className="w-4 h-4 ms-1" /> ثبت جدید
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
