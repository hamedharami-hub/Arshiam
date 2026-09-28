import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Save } from "lucide-react";
import { HEXACO_ITEMS, scoreHexaco, analyzeHexaco } from "@/lib/assessments/hexaco";
import { VIA_ITEMS, scoreVia, analyzeVia } from "@/lib/assessments/via";
import { ECR_ITEMS, scoreEcr, attachmentQuadrant } from "@/lib/assessments/ecr";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/persianDigits";
import {
  getAssessmentProgress,
  saveAssessmentProgress,
  upsertAssessmentResult,
} from "@/lib/firestoreDataService";

type Type = "hexaco" | "via" | "ecr";

const META: Record<Type, {
  title: string;
  title_en: string;
  scale: number;
  labels: string[];
  labels_en: string[];
  items: { id: number; text: string }[];
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
  const navigate = useNavigate();
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const meta = type ? META[type as Type] : null;

  useEffect(() => {
    if (!user || !type) return;
    (async () => {
      // Check Firestore progress
      const progress = await getAssessmentProgress(user.id, type);
      if (progress && !progress.completed) {
        setResponses(progress.responses || {});
        setIndex(progress.currentIndex || 0);
      } else {
        // Fallback check firebaseStore
        const { data } = await firebaseStore
          .from("assessment_responses")
          .select("*")
          .eq("user_id", user.id)
          .eq("assessment_type", type)
          .maybeSingle();
        if (data && !data.completed) {
          setResponses((data.responses as Record<number, number>) || {});
          setIndex(data.current_index || 0);
        }
      }
      setLoading(false);
    })();
  }, [user, type]);

  const total = meta?.items.length ?? 0;
  const item = meta?.items[index];
  const progress = total ? ((index + 1) / total) * 100 : 0;

  async function persist(newResp: Record<number, number>, newIdx: number, completed = false) {
    if (!user || !type) return;
    await saveAssessmentProgress(user.id, type, newResp, newIdx, completed);
    firebaseStore.from("assessment_responses").upsert({
      user_id: user.id,
      assessment_type: type,
      responses: newResp,
      current_index: newIdx,
      completed,
    }, { onConflict: "user_id,assessment_type" }).catch(() => {});
  }

  async function answer(val: number) {
    if (!item) return;
    const next = { ...responses, [item.id]: val };
    setResponses(next);
    if (index < total - 1) {
      const nextIdx = index + 1;
      setIndex(nextIdx);
      await persist(next, nextIdx);
    } else {
      await finish(next);
    }
  }

  async function finish(final: Record<number, number>) {
    if (!user || !type) return;
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

      await upsertAssessmentResult(user.id, {
        assessment_type: type,
        scores,
        analysis,
      });

      // Mirror to firebaseStore if accessible
      firebaseStore.from("assessment_results").insert({
        user_id: user.id,
        assessment_type: type,
        scores,
        analysis,
      }).catch(() => {});

      await persist(final, total - 1, true);

      // Update mh_profile
      const profileUpdate: any = { user_id: user.id };
      if (type === "hexaco") {
        profileUpdate.ai_tone = analysis.ai_tone;
        profileUpdate.hexaco_pattern = analysis.patterns?.[0] ?? null;
        profileUpdate.attention_points = analysis.attention_points ?? [];
      } else if (type === "via") {
        profileUpdate.signature_strengths = analysis.signature ?? [];
      } else if (type === "ecr") {
        profileUpdate.attachment_quadrant = analysis.quadrant ?? null;
      }
      await firebaseStore.from("mh_profile").upsert(profileUpdate, { onConflict: "user_id" }).catch(() => {});

      toast.success(T("تست تکمیل شد ✨", "Assessment Completed ✨"));
      navigate(`/app/self/result/${type}`);
    } catch (e: any) {
      toast.error(e.message || T("خطا در ذخیره", "Failed to save"));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div dir={isEn ? "ltr" : "rtl"} className="p-8 text-center text-muted-foreground">{T("در حال بارگذاری…", "Loading…")}</div>;
  if (!meta || !item) return <div dir={isEn ? "ltr" : "rtl"} className="p-8">{T("تست نامعتبر", "Invalid assessment")}</div>;

  const current = responses[item.id];
  const labels = isEn ? meta.labels_en : meta.labels;
  const title = isEn ? meta.title_en : meta.title;
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-2xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate("/app/self")}>
          <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("بازگشت", "Back")}
        </Button>
        <span className="text-sm text-muted-foreground">
          {isEn ? `${index + 1} / ${total}` : `${toPersianDigits(index + 1)} / ${toPersianDigits(total)}`}
        </span>
      </div>

      <div>
        <h1 className="text-xl font-semibold mb-2">{title}</h1>
        <Progress value={progress} className="h-2" />
      </div>

      <Card>
        <CardContent className="p-6 space-y-6">
          <p className="text-lg leading-relaxed">{item.text}</p>
          <div className={`grid gap-2 ${meta.scale === 5 ? "grid-cols-5" : "grid-cols-7"}`}>
            {Array.from({ length: meta.scale }, (_, i) => i + 1).map((n) => (
              <button
                key={n}
                onClick={() => answer(n)}
                className={`h-14 rounded-lg border-2 transition text-sm font-medium ${
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
        <Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => Math.max(0, i - 1))}>
          {isEn ? (
            <><ArrowLeft className="w-4 h-4 me-1" /> Previous</>
          ) : (
            <><ArrowRight className="w-4 h-4 ms-1" /> قبلی</>
          )}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            toast.success(T("ذخیره شد. هر زمان ادامه بده.", "Saved. Continue anytime."));
            navigate("/app/self");
          }}
        >
          <Save className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("ذخیره و ادامه بعداً", "Save & Continue Later")}
        </Button>
        <Button disabled={!current || index === total - 1} onClick={() => setIndex(i => Math.min(total - 1, i + 1))}>
          {isEn ? (
            <>Next <ArrowRight className="w-4 h-4 ms-1" /></>
          ) : (
            <>بعدی <ArrowLeft className="w-4 h-4 me-1" /></>
          )}
        </Button>
      </div>

      {saving && <div className="text-center text-sm text-muted-foreground">{T("در حال ذخیره نتایج…", "Saving results…")}</div>}
    </div>
  );
}
