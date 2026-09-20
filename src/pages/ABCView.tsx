import { useEffect, useState, useMemo } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, TrendingUp, BookOpen, ListPlus, Trash2, X, CheckCircle2 } from "lucide-react";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  subscribeAbcRecords,
  upsertAbcRecord,
  deleteAbcRecord,
  type AbcRecordItem,
} from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

export interface AbcOption {
  id: string;
  fa: string;
  en: string;
}

export const ABC_TRIGGERS: AbcOption[] = [
  { id: "message", fa: "دریافت پیام", en: "Incoming message" },
  { id: "fatigue", fa: "خستگی فیزیکی", en: "Physical fatigue" },
  { id: "stuck", fa: "گیر کردن روی مسئله", en: "Stuck on a problem" },
  { id: "hunger", fa: "گرسنگی", en: "Hunger" },
  { id: "noise", fa: "نویز / حواس‌پرتی", en: "Noise / Distraction" },
  { id: "intrusive_thought", fa: "فکر مزاحم", en: "Intrusive thought" },
  { id: "work_pressure", fa: "فشار کاری", en: "Work pressure" },
  { id: "conflict", fa: "بحث و تعارض", en: "Conflict / Argument" },
  { id: "other", fa: "سایر", en: "Other" },
];

export const ABC_EMOTIONS: AbcOption[] = [
  { id: "anxiety", fa: "اضطراب / دلشوره", en: "Anxiety" },
  { id: "anger", fa: "خشم / عصبانیت", en: "Anger" },
  { id: "sadness", fa: "غم / ناامیدی", en: "Sadness" },
  { id: "shame", fa: "شرم / خجالت", en: "Shame" },
  { id: "frustration", fa: "سرخوردگی / کلافگی", en: "Frustration" },
  { id: "calm", fa: "آرامش / آسودگی", en: "Calmness / Relief" },
];

export const ABC_CONSEQUENCES: AbcOption[] = [
  // Behaviors
  { id: "social_media", fa: "باز کردن شبکه اجتماعی", en: "Opening social media" },
  { id: "junk_food", fa: "خوردن ناسالم / پرخوری", en: "Junk food snacking" },
  { id: "procrastination", fa: "تعویق", en: "Procrastination" },
  { id: "anger", fa: "خشم / واکنش تند", en: "Anger / Outburst" },
  { id: "crying", fa: "گریه / تخلیه هیجانی", en: "Crying" },
  { id: "leaving_desk", fa: "ترک میز", en: "Leaving the desk" },
  { id: "sleep", fa: "خوابیدن بی‌موقع", en: "Untimely sleeping" },
  { id: "rumination", fa: "نشخوار فکری مداوم", en: "Continuous rumination" },
  // Helpful / Neutral behaviors
  { id: "deep_breath", fa: "چند نفس عمیق و مکث", en: "Deep breathing / pausing" },
  { id: "dialogue", fa: "گفت‌وگوی آرام یا مشورت", en: "Calm dialogue / consultation" },
  { id: "rest", fa: "استراحت کوتاه هدفمند", en: "Short deliberate rest" },
  { id: "note_taking", fa: "یادداشت کردن فکر", en: "Writing down the thought" },
  { id: "other", fa: "سایر", en: "Other" },
];

export const ABC_BEHAVIORS = ABC_CONSEQUENCES;

export const REACTION_EFFECTS: AbcOption[] = [
  { id: "helpful", fa: "مفید و کمک‌کننده بود", en: "Helpful" },
  { id: "neutral", fa: "خنثی یا اثر خاصی نداشت", en: "Neutral / No effect" },
  { id: "unhelpful", fa: "چالش‌برانگیز یا نامطلوب بود", en: "Unhelpful / Challenging" },
];

export function getTriggerLabel(idOrText: string, isEn: boolean): string {
  const match = ABC_TRIGGERS.find((t) => t.id === idOrText || t.fa === idOrText || t.en === idOrText);
  if (match) return isEn ? match.en : match.fa;
  return idOrText;
}

export function getConsequenceLabel(idOrText: string, isEn: boolean): string {
  const match = ABC_CONSEQUENCES.find((c) => c.id === idOrText || c.fa === idOrText || c.en === idOrText);
  if (match) return isEn ? match.en : match.fa;
  return idOrText;
}

export const getBehaviorLabel = getConsequenceLabel;

export function normalizeTriggerId(text: string): string {
  const match = ABC_TRIGGERS.find((t) => t.id === text || t.fa === text || t.en === text);
  return match ? match.id : text;
}

export function normalizeConsequenceId(text: string): string {
  const match = ABC_CONSEQUENCES.find((c) => c.id === text || c.fa === text || c.en === text);
  return match ? match.id : text;
}

export const normalizeBehaviorId = normalizeConsequenceId;

export default function ABCView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [records, setRecords] = useState<AbcRecordItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [customTrigger, setCustomTrigger] = useState("");
  const [customBehavior, setCustomBehavior] = useState("");

  const [form, setForm] = useState<{
    trigger: string;
    belief: string;
    emotions: string[];
    behaviors: string[];
    duration_minutes: string;
    reaction_effect: string | null;
    next_reaction: string;
  }>({
    trigger: "",
    belief: "",
    emotions: [],
    behaviors: [],
    duration_minutes: "",
    reaction_effect: null,
    next_reaction: "",
  });

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAbcRecords(user.id, (data) => {
      setRecords(data);
    });
    return () => unsub();
  }, [user]);

  async function save() {
    const finalTrigger = form.trigger === "other" ? customTrigger.trim() || "other" : form.trigger;
    const finalBehaviors = [...form.behaviors];
    if (customBehavior.trim() && !finalBehaviors.includes(customBehavior.trim())) {
      finalBehaviors.push(customBehavior.trim());
    }

    if (!user || !finalTrigger || !form.belief.trim()) {
      toast.error(T("محرک و باور را پر کن", "Please enter trigger and belief"));
      return;
    }

    // Combine behaviors & emotions into consequences array for DB backwards-compatibility
    const combinedConsequences = [...finalBehaviors, ...form.emotions.map((e) => `emotion:${e}`)];

    const payload: any = {
      user_id: user.id,
      trigger: finalTrigger,
      belief: form.belief.trim(),
      consequences: combinedConsequences,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      reaction_effect: form.reaction_effect || null,
      next_reaction: form.next_reaction.trim() || null,
    };

    const savedId = await upsertAbcRecord(user.id, payload);
    if (savedId) {
      firebaseStore
        .from("abc_records")
        .upsert({ ...payload, id: savedId }, { onConflict: "id" })
        .catch(() => {});

      // If user provided an intended reaction for next time, convert to Task
      if (form.next_reaction.trim()) {
        await createTaskFromMind({
          user_id: user.id,
          title: (isEn
            ? `Try alternative reaction: ${form.next_reaction.trim()}`
            : `امتحان واکنش جایگزین: ${form.next_reaction.trim()}`
          ).slice(0, 140),
          description: isEn
            ? `Source: ABC Model\nTrigger: ${finalTrigger}\nBelief: ${form.belief}\nIntended Reaction: ${form.next_reaction}`
            : `منبع: مدل ABC\nمحرک: ${finalTrigger}\nباور لحظه‌ای: ${form.belief}\nواکنش مدنظر: ${form.next_reaction}`,
          due_in_days: 1,
          source_type: "abc_model",
          source_id: savedId,
        });
      }

      toast.success(T("ثبت شد ✨", "Saved ✨"));
      setEditing(false);
      setCustomTrigger("");
      setCustomBehavior("");
      setForm({
        trigger: "",
        belief: "",
        emotions: [],
        behaviors: [],
        duration_minutes: "",
        reaction_effect: null,
        next_reaction: "",
      });
    } else {
      toast.error(T("خطا در ذخیره رکورد ABC", "Error saving ABC record"));
    }
  }

  // Pattern Detection with exact numerator & denominator (e.g. X out of Y logs)
  const triggerCounts: Record<string, number> = {};
  records.forEach((r) => {
    const tId = normalizeTriggerId(r.trigger);
    triggerCounts[tId] = (triggerCounts[tId] || 0) + 1;
  });

  const map: Record<string, any> = {};
  records.forEach((r) => {
    const tId = normalizeTriggerId(r.trigger);
    (r.consequences || []).forEach((c: string) => {
      // Filter out emotion tags from behavior patterns
      if (c.startsWith("emotion:")) return;
      const bId = normalizeBehaviorId(c);
      const key = `${tId}|${bId}`;
      if (!map[key]) {
        map[key] = {
          trigger: tId,
          behavior: bId,
          count: 0,
          totalDur: 0,
          durN: 0,
        };
      }
      map[key].count++;
      if (r.duration_minutes != null) {
        map[key].totalDur += r.duration_minutes;
        map[key].durN++;
      }
    });
  });

  type Pattern = {
    trigger: string;
    behavior: string;
    count: number;
    sampleSize: number;
    percentage: number;
    avgDuration: number;
  };

  const patterns: Pattern[] = Object.values(map)
    .map((m: any) => {
      const tCount = triggerCounts[m.trigger] || 1;
      const pct = Math.round((m.count / tCount) * 100);
      return {
        trigger: m.trigger,
        behavior: m.behavior,
        count: m.count,
        sampleSize: tCount,
        percentage: pct,
        avgDuration: m.durN ? Math.round(m.totalDur / m.durN) : 0,
      };
    })
    .filter((p) => p.count >= 2)
    .sort((a, b) => b.count - a.count);

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-1.5">{T("مدل رفتار (ABC)", "ABC Model")}</h1>
          <p className="text-muted-foreground text-sm">
            {T(
              "محرک (A) ← باور آنی (B) ← احساس و رفتار (C). کشف الگوهای واقعی برای اقدام آگاهانه.",
              "Activating event (A) → Belief (B) → Emotion & Behavior (C). Evidence-based pattern discovery."
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
                    {T("راهنمای کامل: مدل ABC چیست و چگونه پر کنم؟", "Complete Guide: What is ABC & How to Use It?")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("🎯 منطق مدل ABC", "🎯 Logic of the ABC Model")}
                  </div>
                  <p className="text-muted-foreground">
                    {T(
                      "واکنش ما فقط حاصل اتفاق بیرونی (A) نیست، بلکه ناشی از باوری (B) است که در آن لحظه از ذهنمان می‌گذرد. با تفکیک احساس از رفتار (C)، می‌توانیم ببینیم چه الگویی تکرار می‌شود و دفعه بعد چه رفتار جایگزینی را می‌توان امتحان کرد.",
                      "Our reactions are driven by our immediate beliefs (B) about events (A), not just the events themselves. By distinguishing emotions from behaviors (C), we spot recurring loops and test intentional alternatives."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">
                    {T("📊 نمایش الگوها", "📊 Pattern Observations")}
                  </div>
                  <p className="text-muted-foreground">
                    {T(
                      "الگوها با نسبت دقیق نشان داده می‌شوند (مثلاً «در ۳ مورد از ۴ ثبت»). این یک مشاهده تجربی از داده‌های خودت است، نه نتیجه‌گیری قطعی یا برچسب بالینی.",
                      "Patterns are displayed with exact sample counts (e.g. 'In 3 out of 4 logs'). These are descriptive observations of your self-reported data."
                    )}
                  </p>
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
            <CardTitle>{T("ثبت رخداد و واکنش (ABC)", "New ABC Log")}</CardTitle>
            <CardDescription>
              {T("محرک عینی، باور لحظه‌ای و واکنش‌های رفتاری/هیجانی را وارد کن.", "Log objective trigger, immediate thought, and behavioral/emotional reactions.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* A: Trigger */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">
                {T("A — محرک (اتفاق بیرونی)", "A — Trigger (Activating Event)")}
              </Label>
              <Select
                value={form.trigger}
                onValueChange={(v) => setForm({ ...form, trigger: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder={T("انتخاب محرک...", "Select trigger...")} />
                </SelectTrigger>
                <SelectContent>
                  {ABC_TRIGGERS.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {isEn ? t.en : t.fa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.trigger === "other" && (
                <Input
                  placeholder={T("محرک خاص را بنویس...", "Describe specific trigger...")}
                  value={customTrigger}
                  onChange={(e) => setCustomTrigger(e.target.value)}
                  className="mt-2"
                />
              )}
            </div>

            {/* B: Immediate Belief */}
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("B — باور لحظه‌ای (فکری که در کسری از ثانیه از ذهنت گذشت)", "B — Immediate Belief (The thought that flashed through your mind)")}
              </Label>
              <Textarea
                rows={2}
                value={form.belief}
                onChange={(e) => setForm({ ...form, belief: e.target.value })}
                placeholder={T("مثلاً: اگه فوراً جواب ندم فکر می‌کنه کار رو جدی نگرفتم...", "e.g. If I don't reply immediately, they'll think I'm irresponsible...")}
              />
            </div>

            {/* C1: Emotions */}
            <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
              <Label className="font-semibold text-sm">
                {T("C۱ — احساسات تجربه شده", "C1 — Experienced Emotions")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ABC_EMOTIONS.map((em) => {
                  const selected = form.emotions.includes(em.id);
                  return (
                    <Badge
                      key={em.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1 px-2.5 transition"
                      onClick={() =>
                        setForm({
                          ...form,
                          emotions: selected
                            ? form.emotions.filter((x) => x !== em.id)
                            : [...form.emotions, em.id],
                        })
                      }
                    >
                      {isEn ? em.en : em.fa}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* C2: Behaviors */}
            <div className="space-y-2 p-3 rounded-xl border border-border/60 bg-muted/20">
              <Label className="font-semibold text-sm">
                {T("C۲ — رفتارها و واکنش‌های عملی (شامل رفتارهای مفید، خنثی یا چالشی)", "C2 — Actions & Behaviors (Helpful, Neutral, or Challenging)")}
              </Label>
              <div className="flex flex-wrap gap-2">
                {ABC_BEHAVIORS.map((b) => {
                  const selected = form.behaviors.includes(b.id);
                  return (
                    <Badge
                      key={b.id}
                      variant={selected ? "default" : "outline"}
                      className="cursor-pointer text-xs py-1 px-2.5 transition"
                      onClick={() =>
                        setForm({
                          ...form,
                          behaviors: selected
                            ? form.behaviors.filter((x) => x !== b.id)
                            : [...form.behaviors, b.id],
                        })
                      }
                    >
                      {isEn ? b.en : b.fa}
                    </Badge>
                  );
                })}
              </div>
              <div className="pt-2 flex gap-2 items-center">
                <Input
                  placeholder={T("ثبت رفتار سفارشی دیگر...", "Add custom behavior...")}
                  value={customBehavior}
                  onChange={(e) => setCustomBehavior(e.target.value)}
                  className="text-xs h-8"
                />
              </div>
            </div>

            {/* Effect of Reaction (NO default regret 5) */}
            <div className="space-y-2">
              <Label className="font-semibold text-sm">
                {T("این واکنش چه اثری برایت داشت؟ (اختیاری)", "What effect did this reaction have for you? (Optional)")}
              </Label>
              <div className="grid sm:grid-cols-3 gap-2">
                {REACTION_EFFECTS.map((eff) => {
                  const isSelected = form.reaction_effect === eff.id;
                  return (
                    <button
                      key={eff.id}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          reaction_effect: isSelected ? null : eff.id,
                        })
                      }
                      className={`p-2.5 rounded-xl border text-xs font-medium text-start transition flex items-center justify-between ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-2xs"
                          : "border-border/70 hover:border-primary/40 bg-card/60"
                      }`}
                    >
                      <span>{isEn ? eff.en : eff.fa}</span>
                      {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Next time intended reaction */}
            <div className="space-y-1.5 p-3 rounded-xl border border-primary/20 bg-primary/5">
              <Label className="font-semibold text-xs text-primary">
                {T("دفعهٔ بعد چه واکنشی را می‌خواهی امتحان کنی؟ (اختیاری — تبدیل به تسک)", "What reaction do you want to try next time? (Optional — creates Task)")}
              </Label>
              <Input
                value={form.next_reaction}
                onChange={(e) => setForm({ ...form, next_reaction: e.target.value })}
                placeholder={T("مثلاً: قبل از پاسخ، یک دقیقه تنفس عمیق بکشم...", "e.g. Take 1 minute of deep breaths before replying...")}
              />
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
                  setForm({
                    trigger: "",
                    belief: "",
                    emotions: [],
                    behaviors: [],
                    duration_minutes: "",
                    reaction_effect: null,
                    next_reaction: "",
                  });
                }}
              >
                {T("انصراف", "Cancel")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pattern Detection Observations */}
      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              {T("الگوهای مشاهده‌شده در ثبت‌ها", "Observed Behavior Patterns")}
            </CardTitle>
            <CardDescription>
              {records.length < 5
                ? T(
                    "تعداد کل ثبت‌ها اندک است (کمتر از ۵ مورد)؛ این موارد صرفاً جنبهٔ مشاهده‌ای داده‌های ثبت‌شده را دارند.",
                    "Sample size is small (< 5 entries); these are descriptive observations of logged data."
                  )
                : T(
                    "فراوانی همزمانی محرک‌ها و رفتارها بر اساس موارد ثبت‌شده توسط شما:",
                    "Co-occurrence frequency of triggers and behaviors based on your logs:"
                  )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2.5">
            {patterns.map((p, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-semibold text-foreground">
                    {getTriggerLabel(p.trigger, isEn)}
                  </span>
                  <span className="text-muted-foreground mx-1.5">←</span>
                  <span className="text-primary font-medium">
                    {getBehaviorLabel(p.behavior, isEn)}
                  </span>
                </div>
                <div className="font-mono text-muted-foreground shrink-0">
                  {isEn
                    ? `in ${p.count} of ${p.sampleSize} logs (${p.percentage}%)`
                    : `در ${toPersianDigits(p.count)} مورد از ${toPersianDigits(p.sampleSize)} ثبت (${toPersianDigits(p.percentage)}٪)`}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Records History */}
      <div className="space-y-3">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-4 space-y-2 text-sm">
              <div className="flex justify-between items-start gap-2">
                <div className="font-semibold text-foreground">
                  {getTriggerLabel(r.trigger, isEn)}
                </div>
                <div className="text-xs text-muted-foreground shrink-0">
                  {new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "fa-IR")}
                </div>
              </div>

              <div className="text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg">
                <strong className="text-foreground">{T("باور: ", "Belief: ")}</strong>
                «{r.belief}»
              </div>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {(r.consequences || []).map((c: string) => {
                  const isEm = c.startsWith("emotion:");
                  const clean = isEm ? c.replace("emotion:", "") : c;
                  return (
                    <Badge
                      key={c}
                      variant={isEm ? "secondary" : "outline"}
                      className="text-[10px]"
                    >
                      {isEm ? clean : getBehaviorLabel(clean, isEn)}
                    </Badge>
                  );
                })}
              </div>

              {(r as any).next_reaction && (
                <div className="text-xs text-primary bg-primary/5 p-2 rounded-lg border border-primary/20 mt-1">
                  <strong>{T("واکنش جایگزین برای دفعه بعد: ", "Next time reaction: ")}</strong>
                  «{(r as any).next_reaction}»
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {T("هنوز ثبتی نیست. اولین رکورد ABC را ایجاد کن.", "No records yet. Log your first ABC reaction.")}
          </div>
        )}
      </div>
    </div>
  );
}
