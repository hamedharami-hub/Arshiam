import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Phone,
  Plus,
  History,
  Sparkles,
  CheckCircle2,
  FileEdit,
  ExternalLink,
  BookOpen,
  Info,
} from "lucide-react";
import { toast } from "sonner";
import {
  SCREENERS,
  scoreScreener,
  validateScreenerAnswers,
  severityColor,
  type ScreenerType,
} from "@/lib/assessments/screeners";
import { CRISIS_RESOURCES } from "@/lib/crisisDetection";
import {
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  Area,
  AreaChart,
} from "recharts";
import { formatDate, toPersianDigits } from "@/lib/jalali";
import { useBilingual } from "@/hooks/useBilingual";

import {
  subscribeAssessmentResults,
  upsertAssessmentResult,
  type AssessmentResultItem,
} from "@/lib/firestoreDataService";

function ScreenerTrendTooltip({ active, payload, isEn }: any) {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div
      className="rounded-2xl border border-border/80 bg-popover/95 backdrop-blur-md p-3 shadow-xl text-xs space-y-1 min-w-[160px]"
      dir={isEn ? "ltr" : "rtl"}
    >
      <div className="font-semibold text-foreground border-b border-border/60 pb-1 text-[13px]">
        {data.fullDate || data.date}
      </div>
      <div className="flex items-center justify-between gap-3 text-muted-foreground pt-1">
        <span>{isEn ? "Raw score:" : "نمره خام:"}</span>
        <span className="font-bold text-foreground font-mono">
          {isEn ? data.raw : toPersianDigits(data.raw)}
        </span>
      </div>
      {data.severity && (
        <div className="flex items-center justify-between gap-3 text-muted-foreground">
          <span>{isEn ? "Interpretation:" : "تفسیر:"}</span>
          <span className="font-bold text-primary">{data.severity}</span>
        </div>
      )}
      {data.version && (
        <div className="text-[10px] text-muted-foreground/80">
          v{data.version}
        </div>
      )}
    </div>
  );
}

export function deduplicateAssessmentHistory(
  history: AssessmentResultItem[]
): AssessmentResultItem[] {
  const unique: AssessmentResultItem[] = [];
  for (const h of history) {
    const timeMs = new Date(h.completed_at || h.created_at || Date.now()).getTime();
    const isDuplicate = unique.some((existing) => {
      if (existing.assessment_type !== h.assessment_type) return false;
      if (existing.scores?.raw !== h.scores?.raw) return false;
      const existingTimeMs = new Date(existing.completed_at || existing.created_at || 0).getTime();
      return Math.abs(timeMs - existingTimeMs) < 10000;
    });
    if (!isDuplicate) {
      unique.push(h);
    }
  }
  return unique;
}

export default function ScreenerView() {
  const { type } = useParams<{ type: ScreenerType }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;
  const meta = type ? SCREENERS[type] : null;

  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<"intro" | "run" | "review" | "result">("intro");
  const [history, setHistory] = useState<AssessmentResultItem[]>([]);
  const [latestResult, setLatestResult] = useState<any>(null);

  // Local draft key
  const draftKey = `screener_draft_${user?.id || "guest"}_${type || ""}`;

  useEffect(() => {
    if (!user || !type) return;
    const unsub = subscribeAssessmentResults(user.id, type, (items) => {
      setHistory(items);
    });
    return () => unsub();
  }, [user, type, stage]);

  // Load saved local draft on start
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.answers && Object.keys(parsed.answers).length > 0) {
          setAnswers(parsed.answers);
        }
      }
    } catch {}
  }, [draftKey]);

  // Auto-save draft on answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0 && stage === "run") {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ answers, index, updatedAt: Date.now() })
        );
      } catch {}
    }
  }, [answers, index, stage, draftKey]);

  const uniqueHistory = useMemo(
    () => deduplicateAssessmentHistory(history),
    [history]
  );

  const trend = useMemo(() => {
    return uniqueHistory
      .slice()
      .reverse()
      .filter((h: any) => h.scores?.raw != null)
      .map((h: any) => {
        const d = new Date(h.completed_at || h.created_at || Date.now());
        return {
          date: isEn
            ? d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : formatDate(d, "d MMM"),
          fullDate: isEn
            ? d.toLocaleDateString("en-US", {
                weekday: "short",
                year: "numeric",
                month: "short",
                day: "numeric",
              })
            : formatDate(d, "EEEE d MMMM yyyy"),
          score: h.scores?.normalized ?? 0,
          raw: h.scores?.raw ?? 0,
          severity: isEn
            ? h.analysis?.severityLabel_en || h.analysis?.severityLabel || ""
            : h.analysis?.severityLabel ?? "",
          version: h.scores?.instrument_version,
        };
      });
  }, [uniqueHistory, isEn]);

  if (!meta) {
    return (
      <div dir={isEn ? "ltr" : "rtl"} className="p-8 text-center text-muted-foreground">
        {T("ابزار نامعتبر", "Invalid assessment")}
      </div>
    );
  }

  const item = meta.items[index];
  const progress = ((index + 1) / meta.items.length) * 100;
  const answered = answers[item?.id];
  const validation = validateScreenerAnswers(type!, answers);

  function handleSelectOption(v: number) {
    if (!item) return;
    const next = { ...answers, [item.id]: v };
    setAnswers(next);
    if (index < meta!.items.length - 1) {
      setIndex(index + 1);
    } else {
      // Reached the end: open review stage
      setStage("review");
    }
  }

  const [submitting, setSubmitting] = useState(false);
  const [submissionId, setSubmissionId] = useState<string | null>(null);

  async function submitFinal() {
    if (!user || !type || submitting) return;
    setSubmitting(true);
    const result = scoreScreener(type, answers);
    const currentId = submissionId || `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    if (!submissionId) setSubmissionId(currentId);

    const payload = {
      id: currentId,
      assessment_type: type,
      completed_at: new Date().toISOString(),
      scores: {
        raw: result.raw,
        normalized: result.normalized,
        answers,
        is_complete: result.isComplete,
        answered_count: result.answeredCount,
        total_count: result.totalCount,
        instrument_version: result.instrumentVersion,
        scoring_version: result.scoringVersion,
        language: isEn ? "en" : "fa",
        timeframe: isEn ? result.timeframe_en : result.timeframe,
      },
      analysis: {
        severity: result.severity,
        severityLabel: result.severityLabel,
        severityLabel_en: result.severityLabel_en,
        recommendation: result.recommendation,
        recommendation_en: result.recommendation_en,
        flags: result.flags,
        source_citation: result.sourceCitation,
        source_url: result.sourceUrl,
      },
    };

    try {
      const saved = await upsertAssessmentResult(user.id, payload);
      if (saved) {
        // Clear draft
        try {
          localStorage.removeItem(draftKey);
        } catch {}

        setLatestResult(saved);
        setStage("result");
        setSubmissionId(null);
        toast.success(T("نتیجه با موفقیت ثبت شد ✨", "Result successfully logged ✨"));
      } else {
        toast.error(T("خطا در ذخیره نتیجه ارزیابی", "Failed to save assessment result"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  function clearDraftAndReset() {
    try {
      localStorage.removeItem(draftKey);
    } catch {}
    setAnswers({});
    setIndex(0);
    setStage("intro");
    setLatestResult(null);
  }

  const lastResult = latestResult || history[0];
  const lastAnalysis = lastResult?.analysis as any;
  const title = isEn ? meta.title_en : meta.title;
  const subtitle = isEn ? meta.subtitle_en : meta.subtitle;
  const labels = isEn ? meta.labels_en : meta.labels;
  const itemText = isEn && item?.text_en ? item.text_en : item?.text;
  const timeframe = isEn ? meta.timeframe_en : meta.timeframe;
  const crisisResources = isEn ? CRISIS_RESOURCES.en : CRISIS_RESOURCES.fa;

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
          <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> Mind
        </Button>
        {stage === "run" && (
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs bg-muted/50">
              <Info className="w-3 h-3 me-1 text-primary" /> {timeframe}
            </Badge>
            <span className="text-xs text-muted-foreground font-mono">
              {isEn
                ? `${index + 1} / ${meta.items.length}`
                : `${toPersianDigits(index + 1)} / ${toPersianDigits(meta.items.length)}`}
            </span>
          </div>
        )}
      </div>

      {/* Stage 1: INTRO */}
      {stage === "intro" && (
        <>
          <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h1 className="text-2xl font-bold">{title}</h1>
              {meta.isStandardized ? (
                <Badge variant="secondary" className="text-xs">
                  {T("مقیاس استاندارد بالینی", "Standardized Clinical Scale")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {T("فرم خودارزیابی شخصی", "Personal Self-Reflection")}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-7">{subtitle}</p>

            <div className="flex flex-wrap gap-2 text-xs pt-1">
              <Badge variant="secondary">
                {isEn
                  ? `${meta.items.length} questions`
                  : `${toPersianDigits(meta.items.length)} سؤال`}
              </Badge>
              <Badge variant="secondary">
                {isEn ? `Timeframe: ${timeframe}` : `بازه: ${timeframe}`}
              </Badge>
              <Badge variant="outline">
                {T(
                  "برای ردیابی فردی و آگاهی؛ نه تشخیص بالینی قطعی",
                  "For self-monitoring; not a definitive clinical diagnosis"
                )}
              </Badge>
            </div>

            {meta.sourceCitation && (
              <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 pt-1">
                <BookOpen className="w-3.5 h-3.5 shrink-0 text-primary" />
                <span>{meta.sourceCitation}</span>
                {meta.sourceUrl && (
                  <a
                    href={meta.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline inline-flex items-center gap-0.5 ms-1"
                  >
                    <span>{T("منبع رسمی", "Official Source")}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            )}

            <div className="pt-3 flex gap-2">
              <Button
                size="lg"
                onClick={() => {
                  setIndex(0);
                  setStage("run");
                }}
              >
                <Plus className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
                {Object.keys(answers).length > 0
                  ? T("ادامه تکمیل تست", "Continue Screener")
                  : T("شروع تست جدید", "Start New Screener")}
              </Button>
              {Object.keys(answers).length > 0 && (
                <Button variant="ghost" size="lg" onClick={clearDraftAndReset}>
                  {T("شروع از ابتدا", "Reset Draft")}
                </Button>
              )}
            </div>
          </div>

          {/* History Trend Card */}
          {history.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <History className="w-4 h-4 text-primary" />
                  {T("سوابق و روند نمره", "Score Trend & History")}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? `${history.length} recent entries`
                    : `${toPersianDigits(history.length)} ثبت اخیر`}
                </CardDescription>
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
                      <Tooltip content={<ScreenerTrendTooltip isEn={isEn} />} />
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
                  <p className="text-sm text-muted-foreground">
                    {T(
                      "حداقل ۲ ثبت کامل برای رسم نمودار روند لازم است.",
                      "At least 2 complete entries required for trend chart."
                    )}
                  </p>
                )}

                <div className="space-y-1.5 mt-3">
                  {uniqueHistory.slice(0, 5).map((h: any) => {
                    const sevLabel = isEn
                      ? h.analysis?.severityLabel_en || h.analysis?.severityLabel
                      : h.analysis?.severityLabel;
                    const dateStr = isEn
                      ? new Date(h.completed_at || h.created_at).toLocaleString("en-US", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : new Date(h.completed_at || h.created_at).toLocaleString("fa-IR", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        });
                    const rawStr =
                      h.scores?.raw != null
                        ? isEn
                          ? h.scores.raw
                          : toPersianDigits(h.scores.raw)
                        : T("ناقص", "Incomplete");

                    return (
                      <div
                        key={h.id}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-xs">{dateStr}</span>
                          {h.scores?.is_complete === false && (
                            <Badge variant="outline" className="text-[10px]">
                              {T("پیش‌نویس", "Draft")}
                            </Badge>
                          )}
                        </div>
                        <span
                          className="font-mono tabular-nums text-xs font-semibold"
                          style={{ color: severityColor(h.analysis?.severity) }}
                        >
                          {rawStr} {sevLabel ? `(${sevLabel})` : ""}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Stage 2: RUN (Question by Question) */}
      {stage === "run" && item && (
        <>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{isEn ? `Question ${index + 1} of ${meta.items.length}` : `سؤال ${toPersianDigits(index + 1)} از ${toPersianDigits(meta.items.length)}`}</span>
              <span className="font-semibold text-primary">{timeframe}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="space-y-1">
                <p className="text-lg leading-relaxed font-semibold text-foreground">
                  {itemText}
                </p>
                <p className="text-xs text-muted-foreground">
                  {isEn
                    ? `Over the last 2 weeks, how often have you experienced this?`
                    : `در ۲ هفته گذشته، چقدر این مورد را تجربه کردی؟`}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {labels.map((label, i) => {
                  const v = i + meta.scaleStart;
                  const selected = answered === v;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleSelectOption(v)}
                      className={`w-full text-start p-3.5 rounded-xl border-2 transition text-sm font-medium flex items-center justify-between ${
                        selected
                          ? "border-primary bg-primary/10 shadow-xs"
                          : "border-border hover:border-primary/40 bg-card/60"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center text-[10px] ${
                            selected
                              ? "border-primary bg-primary text-primary-foreground font-bold"
                              : "border-muted-foreground/40"
                          }`}
                        >
                          {selected ? "✓" : ""}
                        </span>
                        <span>{label}</span>
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {isEn ? v : toPersianDigits(v)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              disabled={index === 0}
              onClick={() => setIndex((i) => i - 1)}
            >
              {isEn ? (
                <>
                  <ArrowLeft className="w-4 h-4 me-1" /> Previous
                </>
              ) : (
                <>
                  <ArrowRight className="w-4 h-4 ms-1" /> قبلی
                </>
              )}
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setStage("intro")}>
                {T("انصراف موقت", "Save Draft & Exit")}
              </Button>
              <Button
                variant="outline"
                onClick={() => setStage("review")}
              >
                <FileEdit className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
                {T("مرور پاسخ‌ها", "Review Answers")}
              </Button>
            </div>

            <Button
              variant="outline"
              disabled={answered == null || index === meta.items.length - 1}
              onClick={() => setIndex((i) => i + 1)}
            >
              {isEn ? (
                <>
                  Next <ArrowRight className="w-4 h-4 ms-1" />
                </>
              ) : (
                <>
                  بعدی <ArrowLeft className="w-4 h-4 me-1" />
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Stage 3: REVIEW (Review answers before final submission) */}
      {stage === "review" && (
        <Card className="space-y-4">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">
                  {T("مرور پاسخ‌ها قبل از ثبت نهایی", "Review Answers Before Submitting")}
                </CardTitle>
                <CardDescription>
                  {isEn
                    ? `Answered ${validation.answeredCount} of ${validation.totalCount} items.`
                    : `${toPersianDigits(validation.answeredCount)} از ${toPersianDigits(validation.totalCount)} سؤال پاسخ داده شده است.`}
                </CardDescription>
              </div>
              <Badge variant={validation.isComplete ? "default" : "destructive"}>
                {validation.isComplete
                  ? T("آماده ثبت نهایی ✓", "Ready to Submit ✓")
                  : T("ناقص (پیش‌نویس)", "Incomplete Draft")}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {!validation.isComplete && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {T(
                    "برخی سؤالات بی‌پاسخ مانده‌اند. طبق استانداردهای رسمی روان‌سنجی، فرم ناقص نمره معتبر بالینی دریافت نخواهد کرد، اما می‌توانید آن را به عنوان پیش‌نویس ذخیره کنید.",
                    "Some items are unanswered. Standardized clinical rules require all items for an interpretable score. You may still save this as a draft."
                  )}
                </span>
              </div>
            )}

            <div className="space-y-2 divide-y divide-border/40">
              {meta.items.map((it, idx) => {
                const val = answers[it.id];
                const label = val != null ? labels[val - meta.scaleStart] : null;

                return (
                  <div
                    key={it.id}
                    className="pt-2 flex items-center justify-between gap-3 text-sm"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-muted-foreground">
                        {isEn ? `Item ${idx + 1}` : `سؤال ${toPersianDigits(idx + 1)}`}
                      </div>
                      <div className="truncate text-foreground/90">
                        {isEn && it.text_en ? it.text_en : it.text}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {label ? (
                        <span className="text-xs font-semibold px-2 py-1 rounded-md bg-primary/10 text-primary">
                          {label} ({val})
                        </span>
                      ) : (
                        <span className="text-xs text-destructive font-medium">
                          {T("بی‌پاسخ", "Unanswered")}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-2 text-xs"
                        onClick={() => {
                          setIndex(idx);
                          setStage("run");
                        }}
                      >
                        {T("ویرایش", "Edit")}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-2 pt-4 border-t">
              <Button
                className="w-full"
                size="lg"
                onClick={submitFinal}
              >
                <CheckCircle2 className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
                {validation.isComplete
                  ? T("ثبت نهایی و دریافت نتیجه", "Submit & View Result")
                  : T("ذخیره به عنوان پیش‌نویس ناقص", "Save Incomplete Draft")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setStage("run")}
              >
                {T("بازگشت به سؤالات", "Back to Questions")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stage 4: RESULT */}
      {stage === "result" && lastResult && (
        <>
          <Card
            className="border-2"
            style={{
              borderColor: lastAnalysis?.severity
                ? severityColor(lastAnalysis.severity)
                : undefined,
            }}
          >
            <CardHeader>
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <CardTitle>{T("نتیجه ارزیابی", "Assessment Summary")}</CardTitle>
                    {lastResult.scores?.is_complete === false ? (
                      <Badge variant="outline" className="text-xs">
                        {T("فرم ناقص", "Incomplete Form")}
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">
                        {T("کامل شده ✓", "Complete ✓")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {title} · {timeframe}
                  </CardDescription>
                </div>

                {lastResult.scores?.raw != null && (
                  <div className={isEn ? "text-end" : "text-start"}>
                    <div
                      className="text-3xl font-bold tabular-nums"
                      style={{ color: severityColor(lastAnalysis?.severity) }}
                    >
                      {isEn
                        ? lastResult.scores.raw
                        : toPersianDigits(lastResult.scores.raw)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {isEn
                        ? `out of ${meta.items.length * (meta.scale - 1 + meta.scaleStart)}`
                        : `از ${toPersianDigits(meta.items.length * (meta.scale - 1 + meta.scaleStart))}`}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge
                  style={{
                    background: severityColor(lastAnalysis?.severity),
                    color: "white",
                  }}
                >
                  {isEn
                    ? lastAnalysis?.severityLabel_en || lastAnalysis?.severityLabel
                    : lastAnalysis?.severityLabel}
                </Badge>
                {type === "who5" && lastResult.scores?.normalized != null && (
                  <Badge variant="outline" className="text-xs">
                    {isEn
                      ? `Wellbeing Index: ${lastResult.scores.normalized}% (Higher = Better)`
                      : `شاخص رفاه: ${toPersianDigits(lastResult.scores.normalized)}٪ (بالاتر = رفاه بهتر)`}
                  </Badge>
                )}
              </div>

              <p className="text-sm leading-7 text-foreground/90">
                {isEn
                  ? lastAnalysis?.recommendation_en || lastAnalysis?.recommendation
                  : lastAnalysis?.recommendation}
              </p>

              {lastResult.scores?.normalized != null && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {type === "who5"
                        ? T("سطح رفاه ذهنی (جهت مثبت)", "Wellbeing level (higher = better)")
                        : T("سطح شدت گزارش‌شده", "Reported severity level")}
                    </span>
                    <span className="font-mono">
                      {isEn
                        ? `${lastResult.scores.normalized}%`
                        : `${toPersianDigits(lastResult.scores.normalized)}٪`}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${lastResult.scores.normalized}%`,
                        background: severityColor(lastAnalysis?.severity),
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Source & Citation Transparency */}
              {meta.sourceCitation && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground/80 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>{T("منبع علمی و اعتبار ابزار:", "Scientific Source & Tool Provenance:")}</span>
                  </div>
                  <p>{meta.sourceCitation}</p>
                  <p className="text-[11px] text-muted-foreground/80">
                    {isEn
                      ? `Instrument version: ${meta.instrumentVersion} | Scoring algorithm: ${meta.scoringVersion}`
                      : `نسخه ابزار: ${meta.instrumentVersion} | الگوریتم نمره‌دهی: ${meta.scoringVersion}`}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* CRITICAL SAFETY CARD: Independent of total score */}
          {lastAnalysis?.flags?.includes("suicidal_ideation") && (
            <Card className="border-2 border-destructive bg-destructive/5 animate-pulse">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive text-base">
                  <AlertTriangle className="w-5 h-5" />
                  {T("پیام حمایت و همیاری — لطفاً بخوان", "Support & Helpline Message — Please Read")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-7">
                <p>
                  {T(
                    "پاسخ تو به پرسش مرتبط با افکار آسیب به خود یا مرگ نشان‌دهندهٔ فشاری است که تجربه می‌کنی. تجربه این افکار نیازمند شنیده شدن و همراهی است و تنها نیستی. کمک تخصصی و محرمانه همواره در دسترس است:",
                    "Your response to the question regarding thoughts of self-harm or distress indicates that you may be going through a very challenging time. You do not have to carry this alone. Free, confidential support is available:"
                  )}
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {crisisResources.map((r: any) => (
                    <a
                      key={r.phone}
                      href={`tel:${r.phone}`}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border hover:bg-muted transition"
                    >
                      <span className="font-medium text-xs">{r.label}</span>
                      <span className="font-mono text-xs flex items-center gap-1 text-primary font-bold">
                        <Phone className="w-3.5 h-3.5" /> {r.phone}
                      </span>
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Optional Action Next Steps */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {T("اقدامات کوچک پیشنهادی (اختیاری)", "Suggested Micro-Actions (Optional)")}
              </CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/app/checkin">{T("Check-in امروز", "Today's Check-in")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/thoughts">{T("ثبت فکر CBT", "CBT Thought Record")}</Link>
              </Button>
              <Button asChild variant="outline" size="sm">
                <Link to="/app/worry">{T("درخت نگرانی", "Worry Tree")}</Link>
              </Button>
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button
              onClick={() => {
                setAnswers({});
                setIndex(0);
                setStage("intro");
                setLatestResult(null);
              }}
              variant="outline"
            >
              {T("بازگشت به مرور", "Back to Overview")}
            </Button>
            <Button
              onClick={() => {
                setAnswers({});
                setIndex(0);
                setStage("run");
                setLatestResult(null);
              }}
            >
              <Sparkles className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
              {T("ثبت جدید", "Take Again")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
