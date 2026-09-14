import { useEffect, useState, useMemo } from "react";
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
import { Plus, X, Sparkles, Brain, BookOpen, Loader2, ListPlus } from "lucide-react";
import { DISTORTION_LABELS, DISTORTION_HINTS, getDistortionLabel, getDistortionHint, type Distortion } from "@/lib/distortions";
import { callAI } from "@/lib/ai";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  subscribeThoughtRecords,
  upsertThoughtRecord,
  deleteThoughtRecord,
  type ThoughtRecordItem,
} from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

const EMOTIONS_FA = ["اضطراب", "خشم", "غم", "شرم", "گناه", "ترس", "نومیدی", "سرخوردگی"];
const EMOTIONS_EN = ["Anxiety", "Anger", "Sadness", "Shame", "Guilt", "Fear", "Hopelessness", "Frustration"];

export default function ThoughtRecordsView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [records, setRecords] = useState<ThoughtRecordItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<any>(initial());
  const [aiBusy, setAiBusy] = useState(false);
  const [aiExplanations, setAiExplanations] = useState<Record<string, string>>({});
  const [aiAlternative, setAiAlternative] = useState<string>("");

  const emotionsList = isEn ? EMOTIONS_EN : EMOTIONS_FA;

  function initial() {
    return {
      situation: "", automatic_thought: "",
      emotion_intensity_before: 50, emotion_intensity_after: null,
      emotions: [] as string[],
      evidence_for: [""], evidence_against: [""],
      alternative_thought: "",
      distortions: [] as Distortion[],
    };
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
      const payload = isEn
        ? [
            `Situation: ${form.situation || "—"}`,
            `Automatic Thought: ${form.automatic_thought}`,
            form.evidence_for.filter((x: string) => x.trim()).length
              ? `Evidence For: ${form.evidence_for.filter((x: string) => x.trim()).join(" | ")}`
              : "",
            form.evidence_against.filter((x: string) => x.trim()).length
              ? `Evidence Against: ${form.evidence_against.filter((x: string) => x.trim()).join(" | ")}`
              : "",
          ].filter(Boolean).join("\n")
        : [
            `موقعیت: ${form.situation || "—"}`,
            `فکر خودکار: ${form.automatic_thought}`,
            form.evidence_for.filter((x: string) => x.trim()).length
              ? `شواهد تاییدکننده: ${form.evidence_for.filter((x: string) => x.trim()).join(" | ")}`
              : "",
            form.evidence_against.filter((x: string) => x.trim()).length
              ? `شواهد ردکننده: ${form.evidence_against.filter((x: string) => x.trim()).join(" | ")}`
              : "",
          ].filter(Boolean).join("\n");
      const r = await callAI("distortion_detect", payload);
      const d = r.data;
      if (!d || !Array.isArray(d.distortions)) {
        throw new Error(T("پاسخ AI ساختاری نبود", "AI response was not structured"));
      }
      const keys = d.distortions.map((x: any) => x.key as Distortion);
      const explMap: Record<string, string> = {};
      d.distortions.forEach((x: any) => { explMap[x.key] = x.explanation; });
      setAiExplanations(explMap);
      setAiAlternative(d.alternative_thought || "");
      setForm({
        ...form,
        distortions: keys,
        alternative_thought: form.alternative_thought || d.alternative_thought || "",
      });
      toast.success(keys.length ? (isEn ? `${keys.length} patterns identified` : `${keys.length} الگو شناسایی شد`) : T("الگوی واضحی پیدا نشد", "No clear pattern found"));
    } catch (e: any) {
      toast.error(e.message || T("خطا در تشخیص", "Detection error"));
    } finally {
      setAiBusy(false);
    }
  }

  async function save() {
    if (!user || !form.situation || !form.automatic_thought) {
      toast.error(T("موقعیت و فکر خودکار را پر کن", "Please fill in situation and automatic thought"));
      return;
    }
    const payload = {
      user_id: user.id,
      situation: form.situation,
      automatic_thought: form.automatic_thought,
      emotion_intensity_before: form.emotion_intensity_before,
      emotion_intensity_after: form.emotion_intensity_after,
      emotions: form.emotions,
      evidence_for: form.evidence_for.filter((x: string) => x.trim()),
      evidence_against: form.evidence_against.filter((x: string) => x.trim()),
      alternative_thought: form.alternative_thought || null,
      distortions: form.distortions,
    };
    const savedId = await upsertThoughtRecord(user.id, payload);
    // Mirror to firebaseStore if accessible
    firebaseStore.from("thought_records").insert({ ...payload, id: savedId }).catch(() => {});

    if (savedId) {
      toast.success(T("ثبت شد ✨", "Saved ✨"));
      setEditing(false);
      setForm(initial());
    } else {
      toast.error(T("خطا در ذخیره رکورد", "Error saving record"));
    }
  }

  // Monthly stats
  const distortionFreq: Record<string, number> = {};
  records.forEach((r) => (r.distortions || []).forEach((d: string) => { distortionFreq[d] = (distortionFreq[d] || 0) + 1; }));
  const avgReduction = records.filter((r) => r.emotion_intensity_after != null)
    .reduce((s, r) => s + (r.emotion_intensity_before - r.emotion_intensity_after), 0) / Math.max(1, records.filter((r) => r.emotion_intensity_after != null).length);

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">{T("ثبت افکار (CBT)", "Thought Records (CBT)")}</h1>
          <p className="text-muted-foreground text-sm">{T("شکستن چرخه فکر خودکار ← احساس ← رفتار با فرم ساختاریافته", "Break the cycle of automatic thoughts → feelings → behavior with a structured framework")}</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}><Plus className="w-4 h-4 ms-1" /> {T("ثبت جدید", "New Record")}</Button>}
      </div>

      {/* راهنمای کامل */}
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-start">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium">{T("راهنمای کامل: Thought Record چیست؟", "Complete Guide: What is a Thought Record?")}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🧠 CBT چیست؟", "🧠 What is CBT?")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "درمان شناختی-رفتاری (CBT) می‌گوید: احساسات منفی شدید معمولاً از خود اتفاق نمی‌آیند، از «تفسیر ما» از اتفاق می‌آیند. اگر فکر خودکار را شناسایی و آزمون کنی، شدت احساس عملاً کم می‌شود — این یک یافته‌ی تجربی پایدار است.",
                      "Cognitive Behavioral Therapy (CBT) posits that intense negative emotions usually stem from our interpretation of an event, rather than the event itself. Identifying and evaluating automatic thoughts demonstrably reduces emotional intensity."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🎯 این فرم برای چه چیزی است؟", "🎯 What is this form for?")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "وقتی احساس می‌کنی موجی از اضطراب، خشم، شرم یا غم تو را گرفته، این فرم کمک می‌کند با ساختار «شواهد له و علیه فکر» از موج بیرون بیایی و یک «فکر متعادل» بسازی که همان داده‌ها را بهتر توضیح می‌دهد.",
                      "When overwhelmed by anxiety, anger, shame, or grief, this structured tool helps you weigh the evidence for and against your thoughts, enabling you to construct a balanced alternative that fits reality."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("📝 چگونه پر کنم؟", "📝 How to complete it?")}</div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-2">
                    <li><strong className="text-foreground">{T("موقعیت:", "Situation:")}</strong> {T("فقط فکت بیرونی (کجا، کی، با چه کسی).", "Objective facts only (where, when, with whom).")}</li>
                    <li><strong className="text-foreground">{T("فکر خودکار:", "Automatic Thought:")}</strong> {T("اولین جمله‌ی ذهنی، عیناً همان‌طور که از ذهن گذشت.", "The immediate sentence that crossed your mind, verbatim.")}</li>
                    <li><strong className="text-foreground">{T("شدت احساس قبل (۰–۱۰۰):", "Emotion Intensity Before (0–100):")}</strong> {T("بنچمارک شروع.", "Starting benchmark.")}</li>
                    <li><strong className="text-foreground">{T("نوع احساس:", "Emotion Type:")}</strong> {T("چند تا را می‌توانی انتخاب کنی.", "You can select one or more emotions.")}</li>
                    <li><strong className="text-foreground">{T("شواهد تاییدکننده:", "Evidence For:")}</strong> {T("دلایل واقعی که فکرت را پشتیبانی می‌کنند.", "Factual reasons that support the thought.")}</li>
                    <li><strong className="text-foreground">{T("شواهد ردکننده:", "Evidence Against:")}</strong> {T("فکت‌هایی که با فکر همخوان نیستند (سخت‌ترین قسمت).", "Facts that contradict the thought (the most crucial part).")}</li>
                    <li><strong className="text-foreground">{T("تشخیص خطاهای شناختی:", "Cognitive Distortions:")}</strong> {T("دکمه‌اش الگوهای فکری کلاسیک (مثل فاجعه‌سازی، سیاه-سفید) را پیدا می‌کند.", "AI detection identifies classic cognitive distortion patterns.")}</li>
                    <li><strong className="text-foreground">{T("فکر جایگزین:", "Alternative Thought:")}</strong> {T("یک جمله که هر دو دسته شواهد را در نظر بگیرد.", "A balanced statement accounting for both sides of the evidence.")}</li>
                    <li><strong className="text-foreground">{T("شدت احساس بعد:", "Emotion Intensity After:")}</strong> {T("اگر کاهش ≥۲۵ بود، تکنیک برای تو کار می‌کند.", "If relief is ≥25 points, the technique is working effectively.")}</li>
                  </ol>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("📊 تحلیل بلندمدت", "📊 Long-Term Analysis")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "بعد از چند ثبت، توزیع خطاهای شناختی غالبت را می‌بینی و میانگین کاهش شدت احساس نشان می‌دهد آیا این تکنیک برای تو موثر است یا نه.",
                      "After several entries, you will uncover your most frequent cognitive distortions and track your average emotional relief."
                    )}
                  </p>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {editing && (
        <Card>
          <CardHeader><CardTitle>{T("ثبت جدید", "New Record")}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label>{T("۱. موقعیت — فقط فکت، بدون تفسیر", "1. Situation — Facts only, no interpretation")}</Label>
              <Textarea maxLength={200} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{T("۲. فکر خودکار — اولین فکری که از ذهنت گذشت", "2. Automatic Thought — The first thought that popped up")}</Label>
              <Textarea maxLength={150} value={form.automatic_thought} onChange={(e) => setForm({ ...form, automatic_thought: e.target.value })} rows={2} />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? `3. Emotion Intensity Before: ${form.emotion_intensity_before}/100` : `۳. شدت احساس قبل: ${form.emotion_intensity_before}/100`}</Label>
              <Slider value={[form.emotion_intensity_before]} onValueChange={(v) => setForm({ ...form, emotion_intensity_before: v[0] })} max={100} step={5} />
            </div>
            <div className="space-y-2">
              <Label>{T("۴. نوع احساس", "4. Emotion Type")}</Label>
              <div className="flex flex-wrap gap-2">
                {emotionsList.map((e) => (
                  <Badge key={e} variant={form.emotions.includes(e) ? "default" : "outline"}
                    className="cursor-pointer" onClick={() => setForm({ ...form, emotions: form.emotions.includes(e) ? form.emotions.filter((x: string) => x !== e) : [...form.emotions, e] })}>
                    {e}
                  </Badge>
                ))}
              </div>
            </div>
            <ListField label={T("۵. شواهد تاییدکننده فکر", "5. Evidence Supporting the Thought")} items={form.evidence_for} onChange={(items) => setForm({ ...form, evidence_for: items })} addLabel={T("افزودن", "Add")} />
            <ListField label={T("۶. شواهد ردکننده فکر", "6. Evidence Against the Thought")} items={form.evidence_against} onChange={(items) => setForm({ ...form, evidence_against: items })} addLabel={T("افزودن", "Add")} />
            <div className="flex gap-2">
              <Button variant="outline" onClick={detect} disabled={aiBusy}>
                {aiBusy ? <Loader2 className="w-4 h-4 ms-1 animate-spin" /> : <Sparkles className="w-4 h-4 ms-1" />}
                {T("تشخیص با هوش مصنوعی", "Detect with AI")}
              </Button>
            </div>
            {form.distortions.length > 0 && (
              <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                <div className="font-medium text-sm">{T("خطاهای شناسایی‌شده توسط AI:", "AI Detected Distortions:")}</div>
                {form.distortions.map((d: Distortion) => (
                  <div key={d} className="text-sm space-y-1">
                    <Badge variant="secondary">{getDistortionLabel(d, isEn)}</Badge>
                    <p className="text-muted-foreground leading-6">
                      {aiExplanations[d] || getDistortionHint(d, isEn)}
                    </p>
                  </div>
                ))}
                {aiAlternative && (
                  <div className="border-t pt-3 mt-2">
                    <div className="font-medium text-sm mb-1">{T("💡 فکر جایگزین پیشنهادی AI:", "💡 AI Suggested Alternative Thought:")}</div>
                    <p className="text-sm text-muted-foreground leading-7">{aiAlternative}</p>
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label>{T("۷. فکر جایگزین متعادل", "7. Balanced Alternative Thought")}</Label>
              <Textarea value={form.alternative_thought} onChange={(e) => setForm({ ...form, alternative_thought: e.target.value })} rows={2} placeholder={T("بر اساس هر دو دسته شواهد...", "Based on both sets of evidence...")} />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? `8. Emotion Intensity After: ${form.emotion_intensity_after ?? "—"}/100` : `۸. شدت احساس بعد: ${form.emotion_intensity_after ?? "—"}/100`}</Label>
              <Slider value={[form.emotion_intensity_after ?? 50]} onValueChange={(v) => setForm({ ...form, emotion_intensity_after: v[0] })} max={100} step={5} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>{T("ذخیره", "Save")}</Button>
              <Button variant="ghost" onClick={() => { setEditing(false); setForm(initial()); }}>{T("انصراف", "Cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {records.length >= 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><Brain className="w-5 h-5" /> {T("تحلیل روند", "Trend Analysis")}</CardTitle>
            <CardDescription>{isEn ? `n = ${records.length} recent entries` : `n = ${records.length} ثبت اخیر`}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {!isNaN(avgReduction) && (
              <div>
                {isEn ? (
                  <>Average emotion reduction: <strong>{avgReduction.toFixed(1)} points</strong> {avgReduction > 25 && "— technique is working well for you"}</>
                ) : (
                  <>میانگین کاهش شدت احساس: <strong>{avgReduction.toFixed(1)} واحد</strong> {avgReduction > 25 && "— تکنیک برای تو موثر است"}</>
                )}
              </div>
            )}
            {Object.keys(distortionFreq).length > 0 && (
              <div>
                <div className="mb-2">{T("توزیع خطاهای شناختی:", "Distortion Distribution:")}</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(distortionFreq).sort((a, b) => b[1] - a[1]).map(([d, n]) => (
                    <Badge key={d} variant="outline">{getDistortionLabel(d as Distortion, isEn)} · {n}</Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-start">
                <div className="font-medium">{r.situation}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "fa-IR")}</div>
              </div>
              <div className="text-muted-foreground">«{r.automatic_thought}»</div>
              <div className="flex gap-2 text-xs flex-wrap">
                <span>{isEn ? `Before: ${r.emotion_intensity_before}` : `قبل: ${r.emotion_intensity_before}`}</span>
                {r.emotion_intensity_after != null && <span className="text-primary">{isEn ? `→ After: ${r.emotion_intensity_after}` : `→ بعد: ${r.emotion_intensity_after}`}</span>}
                {(r.distortions || []).map((d: string) => <Badge key={d} variant="outline" className="text-xs">{getDistortionLabel(d as Distortion, isEn)}</Badge>)}
              </div>
              {r.alternative_thought && (
                <Button size="sm" variant="outline" className="mt-1"
                  onClick={async () => {
                    const res = await createTaskFromMind({
                      user_id: user!.id,
                      title: (isEn ? `Practice alternative thought: ${r.alternative_thought}` : `تمرین فکر جایگزین: ${r.alternative_thought}`).slice(0, 120),
                      description: isEn
                        ? `Situation: ${r.situation}\nAutomatic Thought: ${r.automatic_thought}\nAlternative Thought: ${r.alternative_thought}`
                        : `موقعیت: ${r.situation}\nفکر خودکار: ${r.automatic_thought}\nفکر جایگزین: ${r.alternative_thought}`,
                      due_in_days: 1,
                    });
                    if (res.ok) toast.success(T("به Task فردا اضافه شد", "Added to tomorrow's tasks"));
                    else toast.error(res.error || T("خطا", "Error"));
                  }}>
                  <ListPlus className="w-3.5 h-3.5 ms-1" /> {T("به Task تبدیل کن", "Convert to Task")}
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">{T("هنوز ثبتی نیست. اولین Thought Record را بساز.", "No records yet. Create your first Thought Record.")}</div>
        )}
      </div>
    </div>
  );
}

function ListField({ label, items, onChange, addLabel = "افزودن" }: { label: string; items: string[]; onChange: (i: string[]) => void; addLabel?: string }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((v, i) => (
        <div key={i} className="flex gap-2">
          <Input value={v} onChange={(e) => { const a = [...items]; a[i] = e.target.value; onChange(a); }} />
          <Button variant="ghost" size="icon" onClick={() => onChange(items.filter((_, j) => j !== i))}><X className="w-4 h-4" /></Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => onChange([...items, ""])}><Plus className="w-3 h-3 ms-1" /> {addLabel}</Button>
    </div>
  );
}
