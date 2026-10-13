import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, RotateCw, Save } from "lucide-react";
import { HEXACO_ITEMS, scoreHexaco, analyzeHexaco } from "@/lib/assessments/hexaco";
import { VIA_ITEMS, scoreVia, analyzeVia, VIA_LABELS, type ViaStrength } from "@/lib/assessments/via";
import { ECR_ITEMS, scoreEcr, attachmentQuadrant, QUADRANT_LABELS, type AttachmentQuadrant } from "@/lib/assessments/ecr";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";
import {
  getAssessmentProgress,
  saveAssessmentProgress,
  upsertAssessmentResult,
} from "@/lib/firestoreDataService";

type Type = "hexaco" | "via" | "ecr";

/** Clamp a persisted/restored cursor into the valid item range `[0, total - 1]`. */
function clampIndex(raw: unknown, total: number): number {
  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.min(Math.floor(parsed), Math.max(0, total - 1));
}

const META: Record<Type, {
  title: string;
  title_en: string;
  scale: number;
  labels: string[];
  labels_en: string[];
  items: { id: number; text: string; text_en?: string }[];
}> = {
  hexaco: {
    title: "HEXACO-60 — ساختار شخصیت",
    title_en: "HEXACO-60 — Personality Structure",
    scale: 5,
    labels: ["کاملاً مخالف", "مخالف", "خنثی", "موافق", "کاملاً موافق"],
    labels_en: ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"],
    items: HEXACO_ITEMS,
  },
  via: {
    title: "VIA — نقاط قوت شخصیتی",
    title_en: "VIA — Character Strengths",
    scale: 5,
    labels: ["اصلاً شبیه من نیست", "کم", "تا حدی", "زیاد", "کاملاً شبیه من"],
    labels_en: ["Very Much Unlike Me", "Unlike Me", "Neutral", "Like Me", "Very Much Like Me"],
    items: VIA_ITEMS,
  },
  ecr: {
    title: "ECR-R — سبک دلبستگی",
    title_en: "ECR-R — Attachment Style",
    scale: 7,
    labels: ["۱ کاملاً مخالف", "۲", "۳", "۴ خنثی", "۵", "۶", "۷ کاملاً موافق"],
    labels_en: ["1 Strongly Disagree", "2", "3", "4 Neutral", "5", "6", "7 Strongly Agree"],
    items: ECR_ITEMS,
  },
};

export default function AssessmentRunner() {
  const { type } = useParams<{ type: Type }>();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  if (!type || !Object.prototype.hasOwnProperty.call(META, type)) {
    return <div dir={isEn ? "ltr" : "rtl"} className="p-8">{T("تست نامعتبر", "Invalid assessment")}</div>;
  }
  if (!user) {
    return <div dir={isEn ? "ltr" : "rtl"} className="p-8">{T("برای ادامه وارد حساب شوید.", "Sign in to continue.")}</div>;
  }
  // Answers, pending operations and retry identities belong to this owner/type only.
  return <AssessmentSession key={JSON.stringify([user.id, type])} owner={user.id} type={type} />;
}

function AssessmentSession({ owner, type }: { owner: string; type: Type }) {
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  /** True when the last progress/finish write failed and has not been retried. */
  const [saveError, setSaveError] = useState(false);
  /** Distinguishes a failed final result write from a failed incremental progress write. */
  const [failedFinish, setFailedFinish] = useState(false);
  // One result identity per mounted assessment attempt: retries must not mint
  // another result when only the final progress acknowledgement failed.
  const finishAttempt = useRef<{ owner: string; type: Type; id: string; completedAt: string } | null>(null);
  const operation = useRef(false);
  const active = useRef(false);

  useLayoutEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);

  const meta = META[type];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    const itemCount = meta.items.length;
    const maxIndex = Math.max(0, itemCount - 1);
    (async () => {
      try {
        // Check Firestore progress (service normalizes current_index -> currentIndex + clamps)
        const progress = await getAssessmentProgress(owner, type, maxIndex);
        if (cancelled) return;
        if (progress && !progress.completed) {
          setResponses(progress.responses || {});
          setIndex(clampIndex(progress.currentIndex, itemCount));
        } else if (!progress) {
          // Only missing primary progress may fall back. A completed primary doc
          // must not resurrect an older incomplete mirror as a new attempt.
          const { data, error } = await firebaseStore
            .from("assessment_responses")
            .select("*")
            .eq("user_id", owner)
            .eq("assessment_type", type)
            .maybeSingle();
          if (cancelled) return;
          if (error) throw error;
          if (data && !data.completed) {
            setResponses((data.responses as Record<number, number>) || {});
            const raw = (data as any).currentIndex ?? (data as any).current_index ?? 0;
            setIndex(clampIndex(raw, itemCount));
          }
        }
      } catch {
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [owner, type, meta, loadAttempt]);

  const total = meta?.items.length ?? 0;
  const item = meta?.items[index];
  const progress = total ? ((index + 1) / total) * 100 : 0;

  async function persist(newResp: Record<number, number>, newIdx: number, completed = false): Promise<boolean> {
    if (!active.current) return false;
    let ok = false;
    try {
      ok = await saveAssessmentProgress(owner, type, newResp, newIdx, completed);
    } catch {
      return false;
    }
    if (!ok || !active.current) return false;
    // Best-effort mirror; the progress doc is the source of truth for resume.
    // Await it too: an older mirror must not overtake a later progress write.
    try {
      await firebaseStore.from("assessment_responses").upsert({
        user_id: owner,
        assessment_type: type,
        responses: newResp,
        current_index: newIdx,
        completed,
      }, { onConflict: "user_id,assessment_type" });
    } catch { /* best-effort mirror */ }
    return ok;
  }

  function beginOperation() {
    if (!active.current || operation.current || loading || loadError) return false;
    operation.current = true;
    setBusy(true);
    return true;
  }

  function endOperation() {
    operation.current = false;
    if (active.current) setBusy(false);
  }

  async function answer(val: number) {
    if (!item || failedFinish || !beginOperation()) return;
    try {
      const next = { ...responses, [item.id]: val };
      setResponses(next);
      if (index < total - 1) {
        const nextIdx = index + 1;
        setIndex(nextIdx);
        setSaveError(false);
        setFailedFinish(false);
        const ok = await persist(next, nextIdx);
        if (active.current) setSaveError(!ok);
      } else {
        await finish(next);
      }
    } finally {
      endOperation();
    }
  }

  /** Re-attempt whichever write failed without discarding the user's answers. */
  async function retrySave() {
    if (!beginOperation()) return;
    try {
      if (failedFinish) {
        await finish(responses);
        return;
      }
      setSaveError(false);
      const ok = await persist(responses, index);
      if (active.current) setSaveError(!ok);
    } finally {
      endOperation();
    }
  }

  /** Persist the current cursor before leaving; never claim success on failure. */
  async function handleSaveAndExit() {
    // A partially saved final result must be retried, not downgraded to a draft.
    if (failedFinish || !beginOperation()) return;
    setExiting(true);
    try {
      const ok = await persist(responses, index);
      if (!active.current) return;
      if (!ok) {
        setFailedFinish(false);
        setSaveError(true);
        toast.error(T("پیشرفت ذخیره نشد؛ پاسخهای شما حفظ شده است. دوباره تلاش کنید.", "Progress was not saved; your answers are kept. Please retry."));
        return;
      }
      setSaveError(false);
      toast.success(T("ذخیره شد. هر زمان ادامه بده.", "Saved. Continue anytime."));
      navigate("/app/self");
    } finally {
      if (active.current) setExiting(false);
      endOperation();
    }
  }

  async function finish(final: Record<number, number>) {
    if (!active.current) return;
    if (!finishAttempt.current) {
      finishAttempt.current = { owner, type, id: `result_${crypto.randomUUID()}`, completedAt: new Date().toISOString() };
    }
    const attempt = finishAttempt.current;
    setSaving(true);
    try {
      let scores: any, analysis: any = {};
      if (type === "hexaco") {
        scores = scoreHexaco(final);
        analysis = analyzeHexaco(scores);
      } else if (type === "via") {
        scores = scoreVia(final);
        analysis = analyzeVia(scores);
      } else {
        scores = scoreEcr(final);
        analysis = { quadrant: attachmentQuadrant(scores) };
      }

      const savedResult = await upsertAssessmentResult(owner, {
        id: attempt.id,
        completed_at: attempt.completedAt,
        assessment_type: type,
        scores,
        analysis,
      });
      if (!active.current) return;
      if (!savedResult) {
        setFailedFinish(true);
        setSaveError(true);
        return;
      }

      // Mirror to firebaseStore if accessible
      await firebaseStore.from("assessment_results").upsert({
        id: attempt.id,
        user_id: owner,
        assessment_type: type,
        scores,
        analysis,
        completed_at: attempt.completedAt,
      }, { onConflict: "id" }).catch(() => {});
      if (!active.current) return;

      const progressSaved = await persist(final, total - 1, true);
      if (!active.current) return;

      if (!progressSaved) {
        // Keep the user's answers in place and let them retry; do not navigate or
        // announce success when the result/progress could not be persisted.
        setFailedFinish(true);
        setSaveError(true);
        return;
      }

      // Update mh_profile with rich fields and human summary
      const profileUpdate: any = { user_id: owner };
      if (type === "hexaco") {
        profileUpdate.ai_tone = analysis.ai_tone;
        profileUpdate.hexaco_pattern = (analysis.archetype?.titleFa || analysis.patterns?.[0]) ?? null;
        profileUpdate.attention_points = analysis.attention_points ?? [];
        profileUpdate.summary = `شخصیت: ${analysis.archetype?.titleFa || "HEXACO"} (لحن: ${analysis.ai_tone})`;
        profileUpdate.communication_style = analysis.ai_tone;
      } else if (type === "via") {
        profileUpdate.signature_strengths = analysis.signature ?? [];
        const top3 = (analysis.signature || []).slice(0, 3).map((s: string) => VIA_LABELS[s as ViaStrength] || s).join("، ");
        profileUpdate.summary = `نقاط قوت امضا: ${top3} (فضیلت غالب: ${analysis.dominant_virtue || "خرد"})`;
      } else if (type === "ecr") {
        profileUpdate.attachment_quadrant = analysis.quadrant ?? null;
        profileUpdate.summary = `سبک دلبستگی روابط: ${QUADRANT_LABELS[analysis.quadrant as AttachmentQuadrant] || analysis.quadrant}`;
      }
      await firebaseStore.from("mh_profile").upsert(profileUpdate, { onConflict: "user_id" }).catch(() => {});
      if (!active.current) return;

      setSaveError(false);
      setFailedFinish(false);
      toast.success(T("تست تکمیل شد ✨", "Assessment Completed ✨"));
      navigate(`/app/self/result/${type}`);
    } catch (e: any) {
      if (!active.current) return;
      setFailedFinish(true);
      setSaveError(true);
      toast.error(e?.message || T("خطا در ذخیره", "Failed to save"));
    } finally {
      if (active.current) setSaving(false);
    }
  }

  if (loading) return <div dir={isEn ? "ltr" : "rtl"} className="p-8 text-center text-muted-foreground">{T("در حال بارگذاری…", "Loading…")}</div>;
  if (loadError) return (
    <div dir={isEn ? "ltr" : "rtl"} className="p-8 space-y-4" role="alert">
      <p>{T("پیشرفت بارگذاری نشد. برای حفظ پاسخ‌های قبلی دوباره تلاش کنید.", "Progress could not be loaded. Retry to protect your previous answers.")}</p>
      <Button onClick={() => setLoadAttempt(n => n + 1)}>{T("تلاش دوباره", "Retry")}</Button>
    </div>
  );
  if (!meta || !item) return <div dir={isEn ? "ltr" : "rtl"} className="p-8">{T("تست نامعتبر", "Invalid assessment")}</div>;

  const current = responses[item.id];
  const labels = isEn ? meta.labels_en : meta.labels;
  const title = isEn ? meta.title_en : meta.title;
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" disabled={busy || failedFinish} onClick={handleSaveAndExit}>
          <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("بازگشت", "Back")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {isEn ? `${index + 1} / ${total}` : `${toPersianDigits(index + 1)} / ${toPersianDigits(total)}`}
        </span>
      </div>

      <div>
        <HeaderTitlePortal title={title} />
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <p className="text-lg leading-relaxed">{isEn && item.text_en ? item.text_en : item.text}</p>
          <div className={`grid gap-2 ${meta.scale === 5 ? "grid-cols-5" : "grid-cols-7"}`}>
            {Array.from({ length: meta.scale }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                type="button"
                aria-label={`${isEn ? n : toPersianDigits(n)} — ${labels[n - 1]}`}
                aria-pressed={current === n}
                disabled={busy || failedFinish}
                onClick={() => answer(n)}
                className={`h-14 rounded-lg border-2 transition text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  current === n
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:border-primary/50 bg-background"
                }`}
              >
                {isEn ? n : toPersianDigits(n)}
              </button>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{labels[0]}</span>
            <span>{labels[labels.length - 1]}</span>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" disabled={busy || failedFinish || index === 0} onClick={() => { if (!operation.current) setIndex(i => Math.max(0, i - 1)); }}>
          {isEn ? (
            <><ArrowLeft className="w-4 h-4 me-1" /> Previous</>
          ) : (
            <><ArrowRight className="w-4 h-4 ms-1" /> قبلی</>
          )}
        </Button>
        <Button
          variant="outline"
          disabled={busy || failedFinish}
          onClick={handleSaveAndExit}
        >
          <Save className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} />{" "}
          {exiting ? T("در حال ذخیره…", "Saving…") : T("ذخیره و ادامه بعداً", "Save & Continue Later")}
        </Button>
        <Button disabled={busy || failedFinish || !current || index === total - 1} onClick={() => { if (!operation.current) setIndex(i => Math.min(total - 1, i + 1)); }}>
          {isEn ? (
            <>Next <ArrowRight className="w-4 h-4 ms-1" /></>
          ) : (
            <>بعدی <ArrowLeft className="w-4 h-4 me-1" /></>
          )}
        </Button>
      </div>

      {saveError && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-destructive/50 bg-destructive/5 p-3 text-sm"
        >
          <span className="text-destructive">
            {failedFinish
              ? T("نتیجه ذخیره نشد؛ پاسخ‌های شما حفظ شده است. دوباره تلاش کنید.", "Results were not saved; your answers are kept. Please retry.")
              : T("پیشرفت ذخیره نشد؛ پاسخ‌های شما حفظ شده است. دوباره تلاش کنید.", "Progress was not saved; your answers are kept. Please retry.")}
          </span>
          <Button size="sm" variant="outline" onClick={() => void retrySave()} disabled={busy}>
            <RotateCw className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("تلاش دوباره", "Retry")}
          </Button>
        </div>
      )}

      {saving && <div className="text-center text-sm text-muted-foreground">{T("در حال ذخیره نتایج…", "Saving results…")}</div>}
    </div>
  );
}
