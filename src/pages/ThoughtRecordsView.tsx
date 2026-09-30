import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import {
  Plus,
  X,
  Sparkles,
  Brain,
  BookOpen,
  Loader2,
  ListPlus,
  Check,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  DISTORTION_LABELS,
  DISTORTION_HINTS,
  getDistortionLabel,
  getDistortionHint,
  type Distortion,
} from "@/lib/distortions";
import { createMindAIContext, executeMindAI, type CbtAnalysisOutput } from "@/lib/mindAI";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  subscribeThoughtRecords,
  upsertThoughtRecord,
  type ThoughtRecordItem,
} from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

const EMOTIONS_FA = [
  "اضطراب",
  "خشم",
  "غم",
  "شرم",
  "گناه",
  "ناامیدی",
  "سردرگمی",
  "تنهایی",
];
const EMOTIONS_EN = [
  "Anxiety",
  "Anger",
  "Sadness",
  "Shame",
  "Guilt",
  "Hopelessness",
  "Confusion",
  "Loneliness",
];

export default function ThoughtRecordsView() {
  const { isEn, T } = useBilingual();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [records, setRecords] = useState<ThoughtRecordItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [form, setForm] = useState(emptyForm());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiAlternative, setAiAlternative] = useState("");
  const [aiObservations, setAiObservations] = useState<CbtAnalysisOutput["observations"]>([]);
  const [aiMissingInfo, setAiMissingInfo] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  const emotionsList = isEn ? EMOTIONS_EN : EMOTIONS_FA;

  function emptyForm() {
    return {
      situation: "",
      automatic_thought: "",
      emotions: [] as string[],
      emotion_intensity_before: null as number | null,
      emotion_intensity_after: null as number | null,
      evidence_for: [""],
      evidence_against: [""],
      alternative_thought: "",
      takeaway: "",
      next_step: "",
      distortions: [] as Distortion[],
    };
  }

  // Stale AI suggestion invalidator when inputs change
  function updateFormField<K extends keyof ReturnType<typeof emptyForm>>(key: K, value: ReturnType<typeof emptyForm>[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === "automatic_thought" || key === "situation") {
      if (aiAlternative || Object.keys(aiExplanations).length > 0) {
        setAiAlternative("");
        setAiExplanations({});
        setAiObservations([]);
        setAiMissingInfo([]);
      }
    }
  }

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeThoughtRecords(user.id, (data) => {
      setRecords(data);
    });
    return () => unsub();
  }, [user]);

  async function detect() {
    if (!form.automatic_thought.trim()) {
      toast.error(T("اول فکر خودکار را بنویس", "Write the automatic thought first"));
      return;
    }
    setAiBusy(true);
    try {
      const ctx = createMindAIContext({
        operation: "cbt_analysis",
        promptVersion: "cbt_v2.0",
        language: isEn ? "en" : "fa",
        tool: "thought_records",
        fields: {
          situation: { value: form.situation, provenance: "user_report" },
          automatic_thought: { value: form.automatic_thought, provenance: "user_report" },
          evidence_for: {
            value: form.evidence_for.filter((x: string) => x.trim()),
            provenance: "user_report",
          },
          evidence_against: {
            value: form.evidence_against.filter((x: string) => x.trim()),
            provenance: "user_report",
          },
        },
      });

      const res = await executeMindAI<CbtAnalysisOutput>(ctx);
      const d = res.data;

      const explMap: Record<string, string> = {};
      d.possible_patterns.forEach((p) => {
        explMap[p.distortionKey] = p.confidenceExplanation;
      });

      setAiExplanations(explMap);
      setAiAlternative(d.alternative_perspective || "");
      setAiObservations(d.observations || []);
      setAiMissingInfo(d.missing_information || []);

      toast.success(
        d.possible_patterns.length
          ? isEn
            ? `${d.possible_patterns.length} pattern(s) suggested`
            : `${d.possible_patterns.length} الگوی پیشنهادی شناسایی شد`
          : T("الگوی مشخصی پیدا نشد (افکار واقع‌بینانه)", "No clear pattern found (realistic thought)")
      );
    } catch (e: any) {
      toast.error(e.message || T("خطا در تشخیص", "Detection error"));
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!user || !form.situation.trim() || !form.automatic_thought.trim()) {
      toast.error(T("موقعیت و فکر خودکار را پر کن", "Please fill in situation and automatic thought"));
      return;
    }
    const payload = {
      user_id: user.id,
      situation: form.situation.trim(),
      automatic_thought: form.automatic_thought.trim(),
      emotion_intensity_before: form.emotion_intensity_before,
      emotion_intensity_after: form.emotion_intensity_after,
      emotions: form.emotions,
      evidence_for: form.evidence_for.filter((x: string) => x.trim()),
      evidence_against: form.evidence_against.filter((x: string) => x.trim()),
      alternative_thought: form.alternative_thought.trim() || null,
      takeaway: form.takeaway?.trim() || null,
      next_step: form.next_step?.trim() || null,
      distortions: form.distortions,
    };

    const savedId = await upsertThoughtRecord(user.id, payload);
    if (savedId) {
      firebaseStore
        .from("thought_records")
        .upsert({ ...payload, id: savedId }, { onConflict: "id" })
        .catch(() => {});

      // If user provided a next step and wants it as a task
      if (form.next_step?.trim()) {
        await createTaskFromMind({
          user_id: user.id,
          title: form.next_step.trim().slice(0, 140),
          description: isEn
            ? `Source: CBT Thought Record\nSituation: ${form.situation}\nBalanced Thought: ${form.alternative_thought || "—"}`
            : `منبع: ثبت فکر CBT\nموقعیت: ${form.situation}\nفکر متعادل: ${form.alternative_thought || "—"}`,
          due_in_days: 1,
          source_type: "cbt_thought",
          source_id: savedId,
        });
      }

      toast.success(T("ثبت شد ✨", "Saved ✨"));
      setEditing(false);
      setForm(emptyForm());
      setAiAlternative("");
      setAiExplanations({});
    } else {
      toast.error(T("خطا در ذخیره رکورد", "Error saving record"));
    }
  }

  // Monthly stats
  const distortionFreq: Record<string, number> = {};
  records.forEach((r) =>
    (r.distortions || []).forEach((d: string) => {
      distortionFreq[d] = (distortionFreq[d] || 0) + 1;
    })
  );

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1.5">{T("ثبت افکار (CBT)", "Thought Records (CBT)")}</h1>
          <p className="text-muted-foreground text-sm">
            {T(
              "مسیر ۵ مرحله‌ای: اتفاق ← فکر خودکار ← احساس ← شواهد ← برداشت متعادل‌تر.",
              "5-step path: Situation → Automatic Thought → Emotion → Evidence → Balanced Perspective."
            )}
          </p>
        </div>
        {!editing && (
          <Button onClick={() => setEditing(true)}>
            <Plus className="w-4 h-4 ms-1" /> {T("ثبت جدید", "New Record")}
          </Button>
        )}
      </div>

      {/* Guide Accordion */}
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-start">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium">
                    {T("راهنمای تمرین CBT: چگونه از این فرم استفاده کنم؟", "CBT Guide: How to use this framework?")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("🧠 اصول روان‌شناختی CBT", "🧠 Principles of CBT")}
                  </div>
                  <p className="text-muted-foreground">
                    {T(
                      "در درمان شناختی-رفتاری، احساسات شدید ناخوشایند معمولاً ناشی از تفسیرهای خودکار و تک‌بعدی از وقایع هستند. این ابزار برای «آزمون واقعیت» افکار است، نه سرکوب آن‌ها. هیچ تضمینی برای کاهش ناگهانی احساس وجود ندارد؛ مشاهده و ثبت آگاهانه شواهد خود گامی ارزشمند است.",
                      "In Cognitive Behavioral Therapy, intense distress often arises from automatic, rigid interpretations rather than the events themselves. This framework is a tool for reality-testing thoughts, not suppressing them."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("📝 مراحل ۵ گانه", "📝 The 5 Steps")}
                  </div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-1.5">
                    <li><strong className="text-foreground">{T("۱. چه اتفاقی افتاد؟", "1. What happened?")}</strong> {T("فقط واقعیت بیرونی، عینی و بدون قضاوت.", "Objective facts only, without interpretations.")}</li>
                    <li><strong className="text-foreground">{T("۲. چه فکری از ذهنت گذشت؟", "2. What thought crossed your mind?")}</strong> {T("جمله اولیه ذهنی همان‌طور که حس شد.", "The verbatim automatic thought.")}</li>
                    <li><strong className="text-foreground">{T("۳. چه احساسی داشتی؟", "3. What did you feel?")}</strong> {T("نام‌گذاری احساس و شدت اختیاری (۰ تا ۱۰۰).", "Naming the emotion and optional intensity (0-100).")}</li>
                    <li><strong className="text-foreground">{T("۴. شواهد موافق و مخالف:", "4. Evidence for & against:")}</strong> {T("وزن‌دهی واقع‌بینانه به داده‌های واقعی.", "Objective facts supporting and contradicting the thought.")}</li>
                    <li><strong className="text-foreground">{T("۵. برداشت متعادل‌تر:", "5. Balanced perspective:")}</strong> {T("دیدگاهی واقع‌بینانه که تمام شواهد را ببیند.", "A realistic alternative accounting for all facts.")}</li>
                  </ol>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Editing Form */}
      {editing && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle>{T("ثبت فکر جدید", "New Thought Record")}</CardTitle>
            <CardDescription>
              {T("تمام مراحل را با آرامش و صداقت پر کن. شدت احساس اختیاری است.", "Take your time. Emotion rating is optional.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Step 1: Situation */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۱. چه اتفاقی افتاد؟ (فقط فکت عینی)", "1. What happened? (Objective facts only)")}
              </Label>
              <Textarea
                maxLength={300}
                value={form.situation}
                onChange={(e) => updateFormField("situation", e.target.value)}
                rows={2}
                placeholder={T("کجا بودی، چه ساعتی بود، چه کسی چه گفت؟ بدون تفسیر...", "Where were you, who was there, what happened objectively...")}
              />
            </div>

            {/* Step 2: Automatic Thought */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۲. چه فکری از ذهنت گذشت؟ (فکر خودکار)", "2. What thought popped into your mind? (Automatic thought)")}
              </Label>
              <Textarea
                maxLength={250}
                value={form.automatic_thought}
                onChange={(e) => updateFormField("automatic_thought", e.target.value)}
                rows={2}
                placeholder={T("اولین فکری که از ذهنت رد شد، عیناً...", "The immediate sentence that crossed your mind...")}
              />
            </div>

            {/* Step 3: Emotion & Optional Intensity */}
            <div className="space-y-3 p-3.5 rounded-xl border border-border/60 bg-muted/20">
              <Label className="font-semibold text-sm">
                {T("۳. چه احساسی داشتی؟", "3. What emotion did you feel?")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {emotionsList.map((e) => {
                  const selected = form.emotions.includes(e);
                  return (
                    <Badge
                      key={e}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1 px-2.5 transition"
                      onClick={() =>
                        setForm({
                          ...form,
                          emotions: selected
                            ? form.emotions.filter((x: string) => x !== e)
                            : [...form.emotions, e],
                        })
                      }
                    >
                      {e}
                    </Badge>
                  );
                })}
              </div>

              {/* Intensity Before (Optional, NO default 50) */}
              <div className="pt-2 border-t border-border/40 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-muted-foreground">
                    {T("شدت احساس در لحظه رخداد (اختیاری):", "Emotion intensity at the moment (optional):")}
                  </span>
                  <div className="flex items-center gap-2 font-mono font-semibold">
                    <span>
                      {form.emotion_intensity_before != null
                        ? `${form.emotion_intensity_before} / 100`
                        : T("ثبت نشده", "Not rated")}
                    </span>
                    {form.emotion_intensity_before != null && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5"
                        onClick={() => setForm({ ...form, emotion_intensity_before: null })}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <Slider
                  value={[form.emotion_intensity_before ?? 0]}
                  onValueChange={(v) => setForm({ ...form, emotion_intensity_before: v[0] })}
                  max={100}
                  step={5}
                />
              </div>
            </div>

            {/* Step 4: Evidence For & Against */}
            <div className="space-y-4">
              <Label className="font-semibold text-sm">
                {T("۴. چه شواهدی موافق یا مخالف این فکر داری؟", "4. What evidence supports or contradicts this thought?")}
              </Label>
              <ListField
                label={T("شواهد موافق (دلایل عینی که فکر را تایید می‌کنند)", "Evidence Supporting (Objective facts supporting the thought)")}
                items={form.evidence_for}
                onChange={(items) => setForm({ ...form, evidence_for: items })}
                addLabel={T("افزودن شاهد", "Add Evidence")}
              />
              <ListField
                label={T("شواهد مخالف (فکت‌های عینی که با فکر ناهمخوانند)", "Evidence Against (Objective facts contradicting the thought)")}
                items={form.evidence_against}
                onChange={(items) => setForm({ ...form, evidence_against: items })}
                addLabel={T("افزودن شاهد", "Add Evidence")}
              />
            </div>

            {/* AI Suggestion Box */}
            <div className="space-y-3 pt-2">
              <Button variant="outline" size="sm" onClick={detect} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="w-4 h-4 ms-1 animate-spin" /> : <Sparkles className="w-4 h-4 ms-1 text-primary" />}
                {T("پیشنهاد الگو و فکر جایگزین با AI (اختیاری)", "Suggest Distortions & Alternative with AI (Optional)")}
              </Button>

              {aiAlternative && (
                <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      {T("پیشنهاد هوش مصنوعی:", "AI Suggestion:")}
                    </span>
                    <Button
                      size="sm"
                      variant="default"
                      className="h-7 text-xs"
                      onClick={() => {
                        setForm({ ...form, alternative_thought: aiAlternative });
                        toast.success(T("در فکر جایگزین درج شد", "Copied to alternative thought"));
                      }}
                    >
                      <Check className="w-3.5 h-3.5 me-1" />
                      {T("پذیرش و درج در فرم", "Accept & Insert")}
                    </Button>
                  </div>
                  <p className="text-sm text-foreground/90 leading-relaxed italic">
                    «{aiAlternative}»
                  </p>
                </div>
              )}
            </div>

            {/* Step 5: Balanced Perspective */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("۵. چه برداشت متعادلتری ممکن است؟ (فکر جایگزین)", "5. What more balanced perspective is possible? (Alternative thought)")}
              </Label>
              <Textarea
                rows={3}
                value={form.alternative_thought}
                onChange={(e) => setForm({ ...form, alternative_thought: e.target.value })}
                placeholder={T("جمله‌ای که هر دو دسته شواهد را منصفانه و واقع‌بینانه در بر بگیرد...", "A realistic statement that accounts for both sets of facts...")}
              />
            </div>

            {/* Intensity After (Optional, NO default 50) */}
            <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">
                  {T("شدت احساس پس از بازنگری (اختیاری):", "Emotion intensity after reframing (optional):")}
                </span>
                <div className="flex items-center gap-2 font-mono font-semibold">
                  <span>
                    {form.emotion_intensity_after != null
                      ? `${form.emotion_intensity_after} / 100`
                      : T("ثبت نشده", "Not rated")}
                  </span>
                  {form.emotion_intensity_after != null && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => setForm({ ...form, emotion_intensity_after: null })}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              </div>
              <Slider
                value={[form.emotion_intensity_after ?? 0]}
                onValueChange={(v) => setForm({ ...form, emotion_intensity_after: v[0] })}
                max={100}
                step={5}
              />
              {form.emotion_intensity_before != null && form.emotion_intensity_after != null && (
                <div className="text-xs pt-1 flex justify-between font-medium">
                  <span>{T("تغییر شدت:", "Intensity shift:")}</span>
                  <span
                    className={
                      form.emotion_intensity_before > form.emotion_intensity_after
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground"
                    }
                  >
                    {form.emotion_intensity_before > form.emotion_intensity_after
                      ? `-${form.emotion_intensity_before - form.emotion_intensity_after} ${isEn ? "points" : "واحد کاهش"}`
                      : form.emotion_intensity_before === form.emotion_intensity_after
                      ? T("بدون تغییر — ثبت احساس خود ارزشمند است", "No change — observing feelings is valuable")
                      : `+${form.emotion_intensity_after - form.emotion_intensity_before} ${isEn ? "points" : "واحد افزایش"}`}
                  </span>
                </div>
              )}
            </div>

            {/* Final Takeaway & Next Step */}
            <div className="grid sm:grid-cols-2 gap-3 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {T("برداشت من (اختیاری)", "My Takeaway (Optional)")}
                </Label>
                <Input
                  value={form.takeaway}
                  onChange={(e) => setForm({ ...form, takeaway: e.target.value })}
                  placeholder={T("نکته‌ای برای به خاطر سپردن...", "Key insight to remember...")}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  {T("قدم بعدی، اگر لازم است (تبدیل خودکار به Task)", "Next Step, if needed (Auto-added to Tasks)")}
                </Label>
                <Input
                  value={form.next_step}
                  onChange={(e) => setForm({ ...form, next_step: e.target.value })}
                  placeholder={T("یک اقدام کوچک فردا...", "A small action step for tomorrow...")}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={save} size="lg">
                {T("ذخیره رکورد", "Save Record")}
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => {
                  setEditing(false);
                  setForm(emptyForm());
                  setAiAlternative("");
                }}
              >
                {T("انصراف", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Records List */}
      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="font-semibold text-foreground">{r.situation}</div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "fa-IR")}
                </div>
              </div>

              <div className="text-muted-foreground bg-muted/30 p-2.5 rounded-lg text-xs leading-relaxed">
                <strong className="text-foreground">{T("فکر خودکار: ", "Automatic Thought: ")}</strong>
                «{r.automatic_thought}»
              </div>

              {r.alternative_thought && (
                <div className="text-foreground/90 bg-primary/5 border border-primary/20 p-2.5 rounded-lg text-xs leading-relaxed">
                  <strong className="text-primary">{T("برداشت متعادل: ", "Balanced Thought: ")}</strong>
                  «{r.alternative_thought}»
                </div>
              )}

              <div className="flex gap-2 text-xs flex-wrap items-center pt-1">
                {(r.emotions || []).map((e: string) => (
                  <Badge key={e} variant="secondary" className="text-[10px]">
                    {e}
                  </Badge>
                ))}
                {r.emotion_intensity_before != null && (
                  <span className="text-muted-foreground">
                    {isEn ? `Before: ${r.emotion_intensity_before}` : `شدت قبل: ${r.emotion_intensity_before}`}
                  </span>
                )}
                {r.emotion_intensity_after != null && (
                  <span className="text-primary font-medium">
                    {isEn ? `→ After: ${r.emotion_intensity_after}` : `→ بعد: ${r.emotion_intensity_after}`}
                  </span>
                )}
              </div>

              {r.alternative_thought && (
                <div className="pt-1">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={async () => {
                      const res = await createTaskFromMind({
                        user_id: user!.id,
                        title: (isEn
                          ? `Practice balanced thought: ${r.alternative_thought}`
                          : `تمرین فکر متعادل: ${r.alternative_thought}`
                        ).slice(0, 120),
                        description: isEn
                          ? `Situation: ${r.situation}\nAutomatic: ${r.automatic_thought}\nBalanced: ${r.alternative_thought}`
                          : `موقعیت: ${r.situation}\nفکر خودکار: ${r.automatic_thought}\nبرداشت متعادل: ${r.alternative_thought}`,
                        due_in_days: 1,
                        source_type: "cbt_thought",
                        source_id: r.id,
                      });
                      if (res.ok) {
                        toast.success(T("به تسک‌های فردا اضافه شد", "Added to tomorrow's tasks"));
                      } else {
                        toast.error(res.error || T("خطا", "Error"));
                      }
                    }}
                  >
                    <ListPlus className="w-3.5 h-3.5 ms-1" />
                    {T("افزودن به عنوان تسک فردا", "Add as Tomorrow's Task")}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {T("هنوز ثبتی وجود ندارد. اولین Thought Record را ثبت کن.", "No records yet. Create your first Thought Record.")}
          </div>
        )}
      </div>
    </div>
  );
}

function ListField({
  label,
  items,
  onChange,
  addLabel = "افزودن",
}: {
  label: string;
  items: string[];
  onChange: (i: string[]) => void;
  addLabel?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={v}
            onChange={(e) => {
              const a = [...items];
              a[i] = e.target.value;
              onChange(a);
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange(items.filter((_, j) => j !== i))}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onChange([...items, ""])}
      >
        <Plus className="w-3 h-3 ms-1" /> {addLabel}
      </Button>
    </div>
  );
}
