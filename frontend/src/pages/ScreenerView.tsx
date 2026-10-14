import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
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
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";
import {
  SCREENERS,
  scoreScreener,
  validateScreenerAnswers,
  severityColor,
  SCREENER_PROVENANCE,
  SCREENER_CONTENT_REVIEW_VERSION,
  SCREENER_INTERPRETATION_VERSION,
  type ScreenerType,
} from "@/lib/assessments/screeners";
import {
  getCrisisResources,
  resolveSupportRegion,
} from "@/lib/crisisResources";
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
  // Equal totals close in time do not prove equal answers or duplicate writes.
  // Only repeated document identities can safely be collapsed for display.
  const seen = new Set<string>();
  return history.filter((h) => {
    const key = JSON.stringify([h.user_id, h.assessment_type, h.id]);
    if (!h.id) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function assessmentCompletedLabel(record: AssessmentResultItem, isEn: boolean): string {
  const date = record.completed_at ? new Date(record.completed_at) : null;
  if (!date || !Number.isFinite(date.getTime())) return isEn ? "Completion date unknown" : "تاریخ انجام نامعلوم";
  return date.toLocaleString(isEn ? "en-US" : "fa-IR", { dateStyle: "medium", timeStyle: "short" });
}

export default function ScreenerView() {
  const { type } = useParams<{ type: ScreenerType }>();
  const { user } = useAuth();
  // Account/type transitions remount the existing runner instead of migrating
  // its working copy or pending submission into another owner's session.
  return <ScreenerSession key={JSON.stringify([user?.id ?? null, type ?? null])} />;
}

function ScreenerSession() {
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
  const [reflectionItem, setReflectionItem] = useState<number | null>(null);
  const active = useRef(true);
  const submitLock = useRef(false);
  const pendingSubmission = useRef<{ signature: string; id: string; completedAt: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"unknown" | "saved" | "failed">("unknown");

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  // Local draft key
  const draftKey = `screener_draft_${user?.id || "guest"}_${type || ""}`;

  useEffect(() => {
    if (!user || !type) return;
    const unsub = subscribeAssessmentResults(user.id, type, (items) => {
      if (active.current) setHistory(items.filter((h) => h.assessment_type === type && (!h.user_id || h.user_id === user.id)));
    });
    return () => unsub();
  }, [user?.id, type]);

  // Load saved local draft on start
  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (type && SCREENERS[type] && parsed.answers && typeof parsed.answers === "object") {
          setAnswers(validateScreenerAnswers(type, parsed.answers).cleanAnswers);
          setDraftStatus("saved");
        }
      }
    } catch { setDraftStatus("failed"); }
  }, [draftKey]);

  // Auto-save draft on answers change
  useEffect(() => {
    if (Object.keys(answers).length > 0 && (stage === "run" || stage === "review")) {
      try {
        localStorage.setItem(
          draftKey,
          JSON.stringify({ answers, index, updatedAt: Date.now() })
        );
        setDraftStatus("saved");
      } catch { setDraftStatus("failed"); }
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
       .filter((h: any) => typeof h.scores?.raw === "number" && Number.isFinite(h.scores.raw) &&
         typeof h.scores?.normalized === "number" && Number.isFinite(h.scores.normalized) &&
         h.scores?.is_complete !== false && h.completed_at && Number.isFinite(new Date(h.completed_at).getTime()))
      .map((h: any) => {
        const d = new Date(h.completed_at);
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
          score: h.scores.normalized,
          raw: h.scores.raw,
          severity: type === "who5" || type === "burnout" ? "" : isEn
            ? h.analysis?.severityLabel_en || h.analysis?.severityLabel || ""
            : h.analysis?.severityLabel ?? "",
          version: h.scores?.instrument_version,
        };
      });
  }, [uniqueHistory, isEn, type]);

  // Live self-harm flag derived from the answers already selected — available
  // before final submission and independent of whether saving succeeds.
  const liveFlags = useMemo(
    () => (type && SCREENERS[type] ? scoreScreener(type, answers).flags : []),
    [type, answers]
  );

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
    if (!item || submitLock.current) return;
    const next = { ...answers, [item.id]: v };
    setAnswers(next);
    if (index < meta!.items.length - 1) {
      setIndex(index + 1);
    } else {
      // Reached the end: open review stage
      setStage("review");
    }
  }

  async function submitFinal() {
    if (!user || !type || submitLock.current || !validation.isValid) return;
    submitLock.current = true;
    setSubmitting(true);
    const answerSnapshot = { ...answers };
    const result = scoreScreener(type, answerSnapshot);
    const signature = JSON.stringify([user.id, type, isEn, meta!.items.map((it) => answerSnapshot[it.id] ?? null)]);
    if (pendingSubmission.current?.signature !== signature) {
      pendingSubmission.current = { signature, id: `result_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`, completedAt: new Date().toISOString() };
    }
    const pending = pendingSubmission.current!;

    const payload = {
      id: pending.id,
      assessment_type: type,
      completed_at: pending.completedAt,
      scores: {
        raw: result.raw,
        normalized: result.normalized,
        answers: answerSnapshot,
        is_complete: result.isComplete,
        answered_count: result.answeredCount,
        total_count: result.totalCount,
        instrument_version: result.instrumentVersion,
        scoring_version: result.scoringVersion,
        language: isEn ? "en" : "fa",
        timeframe: isEn ? result.timeframe_en : result.timeframe,
        content_review_version: SCREENER_CONTENT_REVIEW_VERSION,
        interpretation_version: SCREENER_INTERPRETATION_VERSION,
        translation_validation: "unknown",
        permission_status: "unknown",
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
      if (!active.current) return;
      if (saved && saved.id === payload.id && saved.assessment_type === type && saved.user_id === user.id) {
        // An incomplete account record is not a completed attempt: keep its
        // working copy available for continuation. Never discard on clear failure.
        if (result.isComplete) {
          try {
            localStorage.removeItem(draftKey);
            setAnswers({});
            setIndex(0);
            setDraftStatus("unknown");
          } catch {
            setDraftStatus("failed");
            toast.error(T("نتیجه در حساب ثبت شد، اما پاک‌کردن پیش‌نویس دستگاه ممکن نشد.", "Result saved to your account, but the device draft could not be cleared."));
          }
        }

        setLatestResult(saved);
        setStage("result");
        pendingSubmission.current = null;
        toast.success(result.isComplete
          ? T("نتیجه در حساب ثبت شد", "Result saved to your account")
          : T("فرم ناقص در حساب ثبت شد؛ نمرهٔ کامل ندارد", "Incomplete form saved to your account; no complete score"));
      } else {
        toast.error(T("خطا در ذخیره نتیجه ارزیابی", "Failed to save assessment result"));
      }
    } catch {
      if (active.current) toast.error(T("خطا در ذخیره نتیجه ارزیابی؛ پاسخ‌ها برای تلاش دوباره در این صفحه حفظ شده‌اند.", "Failed to save assessment result; your answers remain on this page for retry."));
    } finally {
      submitLock.current = false;
      if (active.current) setSubmitting(false);
    }
  }

  function clearDraftAndReset() {
    if (submitLock.current) return;
    try {
      localStorage.removeItem(draftKey);
    } catch {
      setDraftStatus("failed");
      toast.error(T("پیش‌نویس پاک نشد؛ پاسخ‌های این صفحه حفظ شدند.", "The draft could not be cleared; answers on this page were kept."));
      return;
    }
    setAnswers({});
    setIndex(0);
    setStage("intro");
    setLatestResult(null);
    pendingSubmission.current = null;
    setReflectionItem(null);
    setDraftStatus("unknown");
  }

  const lastResult = latestResult || history[0];
  const lastAnalysis = lastResult?.analysis as any;
  const title = isEn ? meta.title_en : meta.title;
  const subtitle = isEn ? meta.subtitle_en : meta.subtitle;
  const labels = isEn ? meta.labels_en : meta.labels;
  const itemText = isEn && item?.text_en ? item.text_en : item?.text;
  const timeframe = isEn ? meta.timeframe_en : meta.timeframe;
  const provenance = SCREENER_PROVENANCE[type!];
  const reviewedResult = lastResult?.scores?.interpretation_version === SCREENER_INTERPRETATION_VERSION;
  const standardScoreBand = reviewedResult && (type === "phq9" || type === "gad7");
  const activeRegion = resolveSupportRegion(isEn ? "en" : "fa");
  const crisisResources = getCrisisResources(activeRegion);

  // Combined self-harm signal: the live answer selection and/or the last saved
  // result. This keeps support visible during review and even if saving fails.
  const hasSelfHarmFlag =
    liveFlags.includes("suicidal_ideation") ||
    Boolean(lastAnalysis?.flags?.includes("suicidal_ideation"));

  // Shared safety card, reused in both review and result stages.
  const selfHarmSupportCard = (
    <Card className="border-2 border-destructive bg-destructive/5" data-testid="self-harm-support-card" role="status">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-destructive text-base">
          <AlertTriangle className="w-5 h-5" />
          {T("پیام حمایت و همیاری — لطفاً بخوان", "Support & Helpline Message — Please Read")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm leading-7">
        <p>
          {T(
            "در پاسخ فعلی یا یک نتیجهٔ ثبت‌شده، افکار مرگ یا آسیب به خود گزارش شده است؛ این پاسخ به‌تنهایی میزان خطر فوری را تعیین نمی‌کند. اگر اکنون ممکن است به خود آسیب برسانی، با خدمات اضطراری محل یا فردی امن تماس بگیر. برای گزینه‌های حمایتی و محدودیت دسترسی، صفحهٔ حمایت را ببین:",
            "Thoughts of death or self-harm were reported in the current answers or a saved result; this answer alone does not determine immediate risk. If you might harm yourself now, contact local emergency services or a trusted person. See the support page for options and availability limits:"
          )}
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {crisisResources.filter((r) => Boolean(r.phone)).map((r) => (
            <a
              key={r.id || r.phone}
              href={`tel:${r.phone}`}
              className="flex items-center justify-between p-3 bg-background rounded-lg border hover:bg-muted transition"
            >
              <span className="font-medium text-xs">{isEn ? r.name_en : r.name}</span>
              <span className="font-mono text-xs flex items-center gap-1 text-primary font-bold">
                <Phone className="w-3.5 h-3.5" /> {r.displayPhone}
              </span>
            </a>
          ))}
        </div>

        <div className="pt-2 flex justify-end">
          <Button asChild variant="destructive" size="sm" className="gap-1.5 font-bold shadow-xs">
            <Link to="/app/crisis">
              <ShieldAlert className="w-4 h-4" />
              <span>{T("مشاهده صفحه پشتیبانی بحران و خطوط کامل (SOS)", "Open Crisis Support & Helplines (SOS)")}</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="page-shell page-shell--narrow space-y-5 animate-fade-in"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
          <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> Mind
        </Button>
        <div className="flex items-center gap-2">
          {stage === "run" && (
            <>
              <Badge variant="outline" className="text-xs bg-muted/50">
                <Info className="w-3 h-3 me-1 text-primary" /> {timeframe}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {isEn
                  ? `${index + 1} / ${meta.items.length}`
                  : `${toPersianDigits(index + 1)} / ${toPersianDigits(meta.items.length)}`}
              </span>
            </>
          )}
          {/* Persistent SOS action, always reachable in any stage */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
            data-testid="sos-button"
          >
            <Link to="/app/crisis">
              <ShieldAlert className="w-4 h-4" />
              <span>{T("SOS", "SOS")}</span>
            </Link>
          </Button>
        </div>
      </div>

      <HeaderTitlePortal title={title} />
      {Object.keys(answers).length > 0 && stage !== "result" && (
        <p className="text-xs text-muted-foreground" role="status" data-testid="screener-draft-status">
          {draftStatus === "saved"
            ? T("پیش‌نویس روی این دستگاه ذخیره شده؛ این پیام تأیید ثبت در حساب نیست.", "Draft saved on this device; this is not an account-save confirmation.")
            : T("ذخیرهٔ پایدار پیش‌نویس روی دستگاه تأیید نشده؛ پاسخ‌ها فعلاً در این صفحه‌اند.", "Durable device draft storage is not confirmed; answers are currently on this page.")}
        </p>
      )}
      {stage === "run" && liveFlags.includes("suicidal_ideation") && selfHarmSupportCard}
      {/* Stage 1: INTRO */}
      {stage === "intro" && (
        <>
          <div className="rounded-3xl p-6 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent border space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              {meta.isStandardized ? (
                <Badge variant="secondary" className="text-xs">
                  {T("نسخهٔ اصلی: مقیاس استاندارد", "Original instrument: standardized scale")}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {T("فرم خودارزیابی شخصی", "Personal Self-Reflection")}
                </Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground leading-7">{subtitle}</p>
            <div className="text-xs text-muted-foreground leading-6 space-y-1" data-testid="screener-provenance">
              <p>{isEn ? provenance.originalVersion_en : provenance.originalVersion}</p>
              <p>{T("منشأ و اعتبار ترجمهٔ فارسی و تطبیق متن انگلیسی فعلی تأیید نشده‌اند. مجوز استفاده/بازنشر نیازمند بررسی است؛ استانداردبودن نسخهٔ اصلی، اعتبار متن داخل برنامه را ثابت نمی‌کند.", "The Persian translation's provenance/validation and the current English wording's equivalence have not been verified. Use/republication permissions require review; standardization of the original does not validate this app's text.")}</p>
              <p>{isEn ? provenance.scoringNote_en : provenance.scoringNote}</p>
              <p>{isEn ? `App instrument ID: ${meta.instrumentVersion}; scoring ID: ${meta.scoringVersion}` : `شناسهٔ ابزار در برنامه: ${meta.instrumentVersion}؛ شناسهٔ نمره‌دهی: ${meta.scoringVersion}`}</p>
            </div>

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
                   "برای ردیابی فردی و آگاهی؛ نه تشخیص بالینی",
                   "For self-monitoring; not a clinical diagnosis"
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
                    <span>{T("منبع ثبت‌شده", "Listed reference")}</span>
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
                 {type !== "burnout" && trend.length >= 2 ? (
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
                       "نمودار فقط برای مقیاس‌های استاندارد و ثبت‌های دارای تاریخ انجام و نمرهٔ موجود نمایش داده می‌شود؛ ثبت‌های نامعلوم در فهرست حفظ می‌شوند.",
                       "Charts require a standardized scale and entries with recorded completion dates and scores; unknown entries remain in the list."
                     )}
                   </p>
                 )}
                <p className="text-xs text-muted-foreground mt-2">{T("این اعداد گزارش‌های زمان ثبت‌اند، نه وضعیت فعلی یا اثبات بهبود؛ نسخه/زبان متفاوت یا نامعلوم ممکن است قابل مقایسه نباشند. درصد PHQ/GAD فقط تبدیل عددی جمع است، نه درصد بیماری.", "These numbers describe reports at the time of recording, not your current state or proof of improvement. Different or unknown versions/languages may not be comparable. PHQ/GAD percentages are only rescaled totals, not disease percentages.")}</p>

                <div className="space-y-1.5 mt-3">
                  {uniqueHistory.slice(0, 5).map((h: any) => {
                    const sevLabel = isEn
                      ? h.analysis?.severityLabel_en || h.analysis?.severityLabel
                      : h.analysis?.severityLabel;
                    const dateStr = assessmentCompletedLabel(h, isEn);
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
                          style={{ color: type === "burnout" || type === "who5" ? undefined : severityColor(h.analysis?.severity) }}
                        >
                          {rawStr} {type !== "burnout" && type !== "who5" && sevLabel ? `(${T("تفسیر ثبت‌شده", "stored interpretation")}: ${sevLabel})` : ""}
                        </span>
                        <Button variant="ghost" size="sm" onClick={() => { setLatestResult(h); setReflectionItem(null); setStage("result"); }}>
                          {T("مشاهدهٔ نتیجهٔ ثبت‌شده", "View saved result")}
                        </Button>
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
                   {isEn ? `Reference period: ${timeframe}` : `بازهٔ پاسخ: ${timeframe}`}
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
                      disabled={submitting}
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
                {T("انصراف موقت", "Exit for now")}
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
            {/* Immediate support as soon as a self-harm-related answer is selected */}
            {hasSelfHarmFlag && selfHarmSupportCard}

            {!validation.isComplete && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs text-amber-700 dark:text-amber-300 leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  {T(
                     "برخی سؤالات بی‌پاسخ مانده‌اند. برنامه برای فرم ناقص نمرهٔ کامل نمی‌سازد. می‌توانید پاسخ‌های موجود را به‌عنوان فرم ناقص در حساب ثبت کنید؛ این کار اعتبار بالینی ایجاد نمی‌کند.",
                     "Some items are unanswered. This app does not calculate a complete score for incomplete forms. You can save the available responses to your account as an incomplete form; saving does not establish clinical validity."
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
                        disabled={submitting}
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
                disabled={submitting || !user || !validation.isValid}
              >
                <CheckCircle2 className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
                {validation.isComplete
                  ? T("ثبت نهایی و دریافت نتیجه", "Submit & View Result")
                   : T("ثبت فرم ناقص در حساب", "Save Incomplete Form to Account")}
              </Button>
              <Button
                variant="outline"
                size="lg"
                disabled={submitting}
                onClick={() => setStage("run")}
              >
                {T("بازگشت به سؤالات", "Back to Questions")}
              </Button>
            </div>
            {!user && <p className="text-xs text-muted-foreground">{T("برای ثبت در حساب وارد شوید؛ پاسخ‌های این صفحه ثبت حسابی نشده‌اند.", "Sign in to save to your account; these answers have not been saved to an account.")}</p>}
          </CardContent>
        </Card>
      )}

      {/* Stage 4: RESULT */}
      {stage === "result" && lastResult && (
        <>
          <Card
            className="border-2"
            style={{
               borderColor: standardScoreBand && lastAnalysis?.severity
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
                        {lastResult.scores?.is_complete === true ? T("کامل شده ✓", "Complete ✓") : T("کامل‌بودن نامعلوم", "Completeness unknown")}
                      </Badge>
                    )}
                  </div>
                  <CardDescription className="mt-1">
                    {title} · {lastResult.scores?.timeframe || T("بازهٔ ثبت‌شده نامعلوم", "Recorded timeframe unknown")}
                    <br />{assessmentCompletedLabel(lastResult, isEn)}
                  </CardDescription>
                </div>

                {lastResult.scores?.raw != null && (
                  <div className={isEn ? "text-end" : "text-start"}>
                    <div
                      className="text-3xl font-bold tabular-nums"
                       style={{ color: standardScoreBand ? severityColor(lastAnalysis?.severity) : undefined }}
                    >
                      {isEn
                        ? lastResult.scores.raw
                        : toPersianDigits(lastResult.scores.raw)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                       {T("نمرهٔ خام ثبت‌شده", "Recorded raw score")}
                       <br />{isEn
                         ? `Current scale range: 0–${meta.items.length * (meta.scale - 1 + meta.scaleStart)}`
                         : `بازهٔ مقیاس فعلی: ۰–${toPersianDigits(meta.items.length * (meta.scale - 1 + meta.scaleStart))}`}
                       {!lastResult.scores?.instrument_version && <p>{T("نسخهٔ تاریخی نامعلوم؛ بازهٔ فعلی به این رکورد نسبت داده نمی‌شود.", "Historical version unknown; the current range is not attributed to this record.")}</p>}
                    </div>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 flex-wrap">
                {standardScoreBand && <Badge
                  style={{
                    background: severityColor(lastAnalysis?.severity),
                    color: "white",
                  }}
                >
                  {isEn
                    ? lastAnalysis?.severityLabel_en || lastAnalysis?.severityLabel
                    : lastAnalysis?.severityLabel}
                </Badge>}
                {type === "who5" && reviewedResult && lastResult.scores?.normalized != null && (
                  <Badge variant="outline" className="text-xs">
                    {isEn
                       ? `WHO-5: ${lastResult.scores.normalized} / 100 (higher = greater reported wellbeing)`
                       : `WHO-5: ${toPersianDigits(lastResult.scores.normalized)} از ۱۰۰ (بالاتر = رفاه گزارش‌شدهٔ بیشتر)`}
                  </Badge>
                )}
              </div>

              <p className="text-sm leading-7 text-foreground/90">
                {type === "burnout"
                  ? T("این فرم شخصی MBI یا CBI نیست؛ از جمع پاسخ‌ها شدت پزشکی فرسودگی استنتاج نمی‌شود. پاسخ‌های ثبت‌شده را مرور کن و اگر خواستی یک موضوع برای تأمل انتخاب کن. خستگی مداوم یا مختل‌کنندهٔ زندگی می‌تواند نیازمند بررسی توسط متخصص سلامت باشد.", "This personal form is not MBI or CBI; the total does not establish medical burnout severity. Review the recorded responses and optionally choose a reflection topic. Persistent fatigue or fatigue affecting daily life may warrant a healthcare assessment.")
                  : type === "who5"
                    ? T("نمرهٔ WHO-5 خلاصه‌ای از رفاه گزارش‌شده در زمان پاسخ است، نه تشخیص یا تأیید سلامت. دسته‌های قدیمی برنامه مبنای این مرور نیستند. اگر دربارهٔ حال خود نگرانی داری، مستقل از نمره می‌توانی با متخصص سلامت صحبت کنی.", "WHO-5 summarizes wellbeing reported at the time of answering; it is not a diagnosis or confirmation of health. Legacy app categories are not the basis of this summary. If you are concerned about how you feel, you can speak with a healthcare professional regardless of the score.")
                    : T("این دسته فقط محدودهٔ نمرهٔ نشانه‌های گزارش‌شده را بیان می‌کند؛ نمرهٔ پایین نبود مشکل را ثابت نمی‌کند و نمرهٔ بالا تشخیص نیست. برای نشانه‌های مداوم، مختل‌کننده یا نگران‌کننده، ارزیابی متخصص سلامت می‌تواند قدم بعدی باشد؛ ابزارهای اختیاری برنامه جای آن را نمی‌گیرند.", "This band only describes the reported symptom score range. A low score does not prove there is no problem and a high score is not a diagnosis. Persistent, disruptive, or concerning symptoms may warrant professional assessment; optional app tools do not replace it.")}
              </p>

              <p className="text-xs text-muted-foreground">{T("این نتیجه مربوط به زمان ثبت است، نه ارزیابی وضعیت فعلی تو.", "This result describes the time of recording, not your current state.")}</p>

              {type === "burnout" && (
                <div className="space-y-2" data-testid="burnout-reported-responses">
                  <h3 className="font-semibold text-sm">{T("پاسخ‌های ثبت‌شده؛ موضوع تأمل اختیاری", "Recorded responses; optional reflection topic")}</h3>
                  <p className="text-xs text-muted-foreground">{T("انتخاب موضوع فقط در این صفحه است؛ در حساب ذخیره نمی‌شود و کاری ایجاد نمی‌کند.", "Topic selection stays on this page; it is not saved to your account and creates no task.")}</p>
                  {meta.items.map((it) => {
                    const value = lastResult.scores?.answers?.[it.id] ?? lastResult.answers?.[it.id];
                    const known = typeof value === "number" && Number.isInteger(value) && value >= 0 && value < meta.scale;
                    const knownVersion = lastResult.scores?.instrument_version === meta.instrumentVersion;
                    return <button key={it.id} type="button" className="w-full rounded-lg border p-3 text-start text-sm" aria-pressed={reflectionItem === it.id} onClick={() => setReflectionItem(reflectionItem === it.id ? null : it.id)}>
                      {knownVersion ? (isEn && it.text_en ? it.text_en : it.text) : T(`پاسخ ذخیره‌شدهٔ ${toPersianDigits(it.id)}؛ متن نسخهٔ تاریخی نامعلوم`, `Stored response ${it.id}; historical item wording unknown`)}
                      <span className="block text-xs text-muted-foreground">{known ? (knownVersion ? labels[value] : String(value)) : T("پاسخ نامعلوم", "Response unknown")}</span>
                    </button>;
                  })}
                </div>
              )}

              {/* Source & Citation Transparency */}
              <div className="text-xs text-muted-foreground space-y-1" data-testid="screener-record-metadata">
                <p>{T("نسخه/زبان/نمره‌دهی ثبت‌شده:", "Recorded version / language / scoring:")} {lastResult.scores?.instrument_version || T("نامعلوم", "unknown")} / {lastResult.scores?.language || T("نامعلوم", "unknown")} / {lastResult.scores?.scoring_version || T("نامعلوم", "unknown")}</p>
                <p>{T("نسخهٔ مرور ثبت‌شده:", "Recorded interpretation version:")} {lastResult.scores?.interpretation_version || T("نامعلوم", "unknown")}</p>
                <p>{T("اعتبار همین ترجمه/مجوز بازنشر تأیید نشده است.", "Validation of this translation / republication permission has not been confirmed.")}</p>
              </div>
              {lastAnalysis?.source_citation && (
                <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs text-muted-foreground space-y-1">
                  <div className="font-semibold text-foreground/80 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-primary" />
                    <span>{T("ارجاع ثبت‌شده با نتیجه (نه تأیید متن فعلی):", "Reference recorded with result (not validation of current wording):")}</span>
                  </div>
                  <p>{lastAnalysis.source_citation}</p>
                </div>
              )}
              {(!reviewedResult || type === "who5" || type === "burnout") && lastAnalysis && (
                <details className="text-xs text-muted-foreground space-y-2" data-testid="screener-legacy-interpretation">
                  <summary className="cursor-pointer">{T("متن تفسیر تاریخی ثبت‌شده (بدون بازنویسی؛ تأیید پزشکی نیست)", "Stored legacy interpretation (unchanged; not medical validation)")}</summary>
                  <p>{isEn ? lastAnalysis.severityLabel_en || lastAnalysis.severityLabel : lastAnalysis.severityLabel}</p>
                  <p>{isEn ? lastAnalysis.recommendation_en || lastAnalysis.recommendation : lastAnalysis.recommendation}</p>
                </details>
              )}
            </CardContent>
          </Card>

          {/* CRITICAL SAFETY CARD: Independent of total score */}
          {hasSelfHarmFlag && selfHarmSupportCard}

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
                setStage("intro");
                setLatestResult(null);
                setReflectionItem(null);
              }}
              variant="outline"
            >
              {T("بازگشت به مرور", "Back to Overview")}
            </Button>
            <Button
              onClick={() => {
                clearDraftAndReset();
              }}
            >
              <Sparkles className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />
              {T("شروع دوباره (پاک‌کردن پیش‌نویس)", "Start again (clear draft)")}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
