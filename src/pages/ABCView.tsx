import { useEffect, useState, useMemo } from "react";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { Plus, TrendingUp, BookOpen, ListPlus, Trash2 } from "lucide-react";
import { createTaskFromMind } from "@/lib/taskFromMind";
import {
  subscribeAbcRecords,
  upsertAbcRecord,
  deleteAbcRecord,
  type AbcRecordItem,
} from "@/lib/firestoreDataService";
import { useBilingual } from "@/hooks/useBilingual";

const TRIGGERS_FA = ["دریافت پیام", "خستگی فیزیکی", "گیر کردن روی مسئله", "گرسنگی", "نویز", "فکر مزاحم", "کافئین", "کمبود خواب", "سایر"];
const TRIGGERS_EN = ["Incoming message", "Physical fatigue", "Stuck on a problem", "Hunger", "Noise/Distraction", "Intrusive thought", "Caffeine crash", "Sleep deprivation", "Other"];

const CONSEQUENCES_FA = ["باز کردن شبکه اجتماعی", "خوردن ناسالم", "تعویق", "خشم", "گریه", "ترک میز", "خوابیدن بی‌موقع", "سایر"];
const CONSEQUENCES_EN = ["Opening social media", "Junk food snacking", "Procrastination", "Anger/Outburst", "Crying", "Leaving the desk", "Untimely sleeping", "Other"];

const TRIGGERS = TRIGGERS_FA;
const CONSEQUENCES = CONSEQUENCES_FA;

export default function ABCView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [records, setRecords] = useState<AbcRecordItem[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ trigger: "", belief: "", consequences: [] as string[], duration_minutes: "", regret_level: 5 });

  const triggersList = isEn ? TRIGGERS_EN : TRIGGERS_FA;
  const consequencesList = isEn ? CONSEQUENCES_EN : CONSEQUENCES_FA;

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeAbcRecords(user.id, (data) => {
      setRecords(data);
    });
    return () => unsub();
  }, [user]);

  async function save() {
    if (!user || !form.trigger || !form.belief) {
      toast.error(T("محرک و باور را پر کن", "Please enter trigger and belief"));
      return;
    }
    const payload = {
      user_id: user.id,
      trigger: form.trigger,
      belief: form.belief,
      consequences: form.consequences,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      regret_level: form.regret_level,
    };
    const savedId = await upsertAbcRecord(user.id, payload);
    // Mirror to firebaseStore in background
    firebaseStore.from("abc_records").insert({ ...payload, id: savedId }).catch(() => {});

    if (savedId) {
      toast.success(T("ثبت شد ✨", "Saved ✨"));
      setEditing(false);
      setForm({ trigger: "", belief: "", consequences: [], duration_minutes: "", regret_level: 5 });
    } else {
      toast.error(T("خطا در ذخیره رکورد ABC", "Error saving ABC record"));
    }
  }

  // Pattern Detection v2 — threshold ≥7 samples & frequency ≥0.6
  // For each trigger T and consequence C: frequency = count(T→C) / count(T)
  const triggerCounts: Record<string, number> = {};
  records.forEach((r) => { triggerCounts[r.trigger] = (triggerCounts[r.trigger] || 0) + 1; });

  const map: Record<string, any> = {};
  records.forEach((r) => {
    (r.consequences || []).forEach((c: string) => {
      const key = `${r.trigger}|${c}`;
      if (!map[key]) map[key] = { trigger: r.trigger, consequence: c, count: 0, totalDur: 0, durN: 0, totalRegret: 0, regretN: 0 };
      map[key].count++;
      if (r.duration_minutes != null) { map[key].totalDur += r.duration_minutes; map[key].durN++; }
      if (r.regret_level != null) { map[key].totalRegret += r.regret_level; map[key].regretN++; }
    });
  });

  type Pattern = {
    trigger: string; consequence: string; count: number; frequency: number;
    avgDuration: number; avgRegret: number; confidence: string;
    sampleSize: number;
  };
  const strongPatterns: Pattern[] = [];
  const weakPatterns: Pattern[] = [];
  Object.values(map).forEach((m: any) => {
    const tCount = triggerCounts[m.trigger] || 1;
    const frequency = m.count / tCount;
    const isStrong = m.count >= 7 && frequency >= 0.6;
    const isMed = m.count >= 4;
    const conf = isEn ? (isStrong ? "Strong" : isMed ? "Moderate" : "Weak") : (isStrong ? "قوی" : isMed ? "متوسط" : "ضعیف");
    const p: Pattern = {
      trigger: m.trigger, consequence: m.consequence, count: m.count, frequency,
      avgDuration: m.durN ? m.totalDur / m.durN : 0,
      avgRegret: m.regretN ? m.totalRegret / m.regretN : 0,
      sampleSize: tCount,
      confidence: conf,
    };
    if (isStrong) strongPatterns.push(p);
    else if (m.count >= 3) weakPatterns.push(p);
  });
  strongPatterns.sort((a, b) => b.count - a.count);
  weakPatterns.sort((a, b) => b.count - a.count);
  const patterns = [...strongPatterns, ...weakPatterns];

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">{T("مدل ABC", "ABC Model")}</h1>
          <p className="text-muted-foreground text-sm">{T("محرک ← باور ← پیامد. کشف الگوهای تکراری برای پیدا کردن نقطه مداخله.", "Activating event → Belief → Consequence. Discover recurring patterns to pinpoint intervention points.")}</p>
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
                  <span className="font-medium">{T("راهنمای کامل: مدل ABC چیست و چگونه پر کنم؟", "Complete Guide: What is the ABC Model & How to Use It?")}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🎯 این روش چیست؟", "🎯 What is this method?")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "مدل ABC از روان‌شناسی شناختی-رفتاری (CBT) آلبرت الیس می‌آید. ایده ساده ولی قدرتمند است: رفتار ناخواسته‌ی تو (مثل پرخوری، تعویق، خشم) فقط نتیجه «اتفاق بیرونی» نیست — بلکه نتیجه «باوری» است که در آن لحظه از ذهنت می‌گذرد. اگر فقط محرک‌ها را ببینی، گیر می‌کنی؛ اما اگر باور وسط را شناسایی کنی، می‌توانی همان‌جا مداخله کنی.",
                      "The ABC model stems from Albert Ellis's Cognitive Behavioral Therapy (CBT). The premise is simple yet powerful: an unwanted reaction (e.g., overeating, procrastination, anger) is not solely triggered by an external event — it is driven by the immediate belief passing through your mind. Identifying that pivotal belief empowers you to intervene."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🧩 چه زمانی استفاده کنم؟", "🧩 When to use it?")}</div>
                  <ul className="text-muted-foreground list-disc pe-5 space-y-1">
                    <li>{T("وقتی متوجه می‌شوی رفتار خاصی را تکرار می‌کنی و بعد پشیمان می‌شوی.", "When you notice repeating a behavior and feeling regret afterwards.")}</li>
                    <li>{T("وقتی نمی‌فهمی چرا یک محرک ساده تو را به واکنش بزرگ می‌رساند.", "When you don't understand why a minor trigger sparked an intense reaction.")}</li>
                    <li>{T("برای الگوهایی مثل: گوشی‌گردی شبانه، خوردن استرسی، تعویق، انفجارهای خشم.", "For patterns like: late-night doomscrolling, stress eating, procrastination, anger outbursts.")}</li>
                  </ul>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("📝 چگونه فرم را پر کنم؟", "📝 How to fill this form?")}</div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-2">
                    <li>
                      <strong className="text-foreground">{T("A — محرک (Activating event):", "A — Trigger (Activating event):")}</strong> {T("فقط فکت بیرونی. مثال: «ساعت ۲۳ پیامی از همکار رسید».", "Objective facts only. Example: 'At 11 PM a message arrived from a coworker'.")}
                    </li>
                    <li>
                      <strong className="text-foreground">{T("B — باور لحظه‌ای (Belief):", "B — Immediate Belief:")}</strong> {T("آن جمله‌ای که دقیقاً در کسری از ثانیه از ذهنت گذشت. مثال: «اگه جواب ندم فکر می‌کنه بی‌مسئولیتم».", "The exact thought that flashed through your mind. Example: 'If I don't reply, they'll think I'm irresponsible'.")}
                    </li>
                    <li>
                      <strong className="text-foreground">{T("C — پیامد رفتاری (Consequence):", "C — Consequence / Reaction:")}</strong> {T("چه کاری عملاً انجام دادی؟ یک یا چند گزینه را علامت بزن.", "What did you actually do? Select one or more options.")}
                    </li>
                    <li>
                      <strong className="text-foreground">{T("D — مدت:", "D — Duration:")}</strong> {T("چقدر طول کشید؟ این عدد به الگویابی کمک می‌کند.", "How long did it last? Helps identify time sinks.")}
                    </li>
                    <li>
                      <strong className="text-foreground">{T("E — پشیمانی (۰ تا ۱۰):", "E — Regret (0 to 10):")}</strong> {T("الان که نگاه می‌کنی، چقدر از این رفتار پشیمانی؟", "Looking back, how much do you regret this behavior?")}
                    </li>
                  </ol>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("📊 تحلیلی که دریافت می‌کنی", "📊 Insights You Receive")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "بعد از حدود ۷ ثبت از یک محرک، الگوریتم «الگوی قوی» را شناسایی می‌کند: «وقتی X رخ می‌دهد، در ۷۰٪ موارد به Y می‌رسی». این دقیقاً نقطه‌ای است که می‌توانی یک «جایگزین رفتاری» طراحی کنی و تست کنی.",
                      "After around 7 entries of a trigger, the system highlights strong recurring patterns: 'When X happens, 70% of the time it leads to Y'. This pinpointed moment is where you can install a healthy behavioral alternative."
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
          <CardContent className="p-5 space-y-4">
            <div className="space-y-2">
              <Label>{T("A — محرک", "A — Trigger")}</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                <SelectTrigger><SelectValue placeholder={T("انتخاب کن", "Select a trigger")} /></SelectTrigger>
                <SelectContent>{triggersList.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
              {(form.trigger === "سایر" || form.trigger === "Other" || (!triggersList.includes(form.trigger) && form.trigger)) && (
                <Input
                  placeholder={T("محرک خاص را بنویس...", "Enter specific trigger...")}
                  value={form.trigger === "سایر" || form.trigger === "Other" ? "" : form.trigger}
                  onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                  className="mt-1.5"
                />
              )}
            </div>
            <div className="space-y-2">
              <Label>{T("B — باور لحظه‌ای", "B — Immediate Belief")}</Label>
              <Textarea rows={2} value={form.belief} onChange={(e) => setForm({ ...form, belief: e.target.value })} placeholder={T("چه فکری در آن لحظه از ذهنت گذشت؟", "What thought passed through your mind at that instant?")} />
            </div>
            <div className="space-y-2">
              <Label>{T("C — پیامد رفتاری", "C — Behavioral Consequence")}</Label>
              <div className="flex flex-wrap gap-2">
                {consequencesList.map((c) => (
                  <Badge key={c} variant={form.consequences.includes(c) ? "default" : "outline"} className="cursor-pointer text-xs py-1 px-2.5 transition-all"
                    onClick={() => setForm({ ...form, consequences: form.consequences.includes(c) ? form.consequences.filter((x) => x !== c) : [...form.consequences, c] })}>
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>{T("D — مدت پیامد (دقیقه)", "D — Duration of Consequence (minutes)")}</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label>{isEn ? `E — Regret Level: ${form.regret_level}/10` : `E — پشیمانی: ${form.regret_level}/۱۰`}</Label>
              <Slider value={[form.regret_level]} onValueChange={(v) => setForm({ ...form, regret_level: v[0] })} max={10} step={1} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>{T("ذخیره", "Save")}</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>{T("انصراف", "Cancel")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> {T("الگوهای شناسایی‌شده", "Identified Patterns")}</CardTitle>
            <CardDescription>
              {isEn ? `n = ${records.length} entries in the last 30 days` : `n = ${records.length} ثبت در ۳۰ روز اخیر`}
              {strongPatterns.length > 0 && <> · <span className="text-primary font-medium">{isEn ? `${strongPatterns.length} strong pattern(s)` : `${strongPatterns.length} الگوی قوی`}</span></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.slice(0, 8).map((p, i) => {
              const isStrong = p.confidence === (isEn ? "Strong" : "قوی");
              return (
                <div key={i} className={`p-3 rounded-lg text-sm space-y-1.5 ${isStrong ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span><strong>{p.trigger}</strong> → <strong className="text-primary">{p.consequence}</strong></span>
                    <Badge variant={isStrong ? "default" : "secondary"} className="shrink-0">{T("اعتماد:", "Confidence:")} {p.confidence}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isEn
                      ? `${p.count} times out of ${p.sampleSize} (${(p.frequency * 100).toFixed(0)}% frequency) · avg ${p.avgDuration.toFixed(0)} min · regret ${p.avgRegret.toFixed(1)}/10`
                      : `${p.count} بار از ${p.sampleSize} (فراوانی ${(p.frequency * 100).toFixed(0)}٪) · میانگین ${p.avgDuration.toFixed(0)} دقیقه · پشیمانی ${p.avgRegret.toFixed(1)}/۱۰`
                    }
                  </div>
                  {isStrong && (
                    <div className="text-xs text-primary mt-1">
                      {isEn
                        ? `💡 When "${p.trigger}" occurs, ${(p.frequency * 100).toFixed(0)}% of the time it leads to "${p.consequence}". Place your behavioral intervention here.`
                        : `💡 وقتی «${p.trigger}» رخ می‌دهد، در ${(p.frequency * 100).toFixed(0)}٪ موارد به «${p.consequence}» می‌رسی. نقطه مداخله را اینجا قرار بده.`
                      }
                    </div>
                  )}
                </div>
              );
            })}
            {strongPatterns.length === 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                {T("برای الگوی «قوی» نیاز به ≥۷ نمونه و فراوانی ≥۶۰٪ است. ادامه بده.", "A 'Strong' pattern requires ≥7 samples and ≥60% frequency. Keep tracking.")}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        {records.map((r) => (
          <Card key={r.id}>
            <CardContent className="p-3 text-sm flex justify-between gap-4 items-start">
              <div className="flex-1">
                <div><strong>{r.trigger}</strong> → {(r.consequences || []).join(", ")}</div>
                <div className="text-muted-foreground text-xs mt-1">«{r.belief}»</div>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString(isEn ? "en-US" : "fa-IR")}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer"
                    title={T("حذف رکورد", "Delete record")}
                    onClick={async () => {
                      if (!user) return;
                      const ok = await deleteAbcRecord(user.id, r.id);
                      if (ok) {
                        setRecords((prev) => prev.filter((x) => x.id !== r.id));
                        toast.success(T("رکورد حذف شد", "Record deleted"));
                      } else {
                        toast.error(T("خطا در حذف رکورد", "Error deleting record"));
                      }
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const res = await createTaskFromMind({
                      user_id: user!.id,
                      title: isEn ? `Behavioral alternative for "${r.trigger}"` : `جایگزین رفتاری برای «${r.trigger}»`,
                      description: isEn
                        ? `Trigger: ${r.trigger}\nBelief: ${r.belief}\nConsequence: ${(r.consequences || []).join(", ")}\n\nNext step: Design an alternative healthy response for next time.`
                        : `محرک: ${r.trigger}\nباور: ${r.belief}\nنتیجه: ${(r.consequences || []).join(", ")}\n\nقدم بعدی: یک رفتار جایگزین برای دفعه بعد طراحی کن.`,
                      due_in_days: 1,
                    });
                    if (res.ok) toast.success(T("به Task اضافه شد", "Added to Tasks"));
                    else toast.error(res.error || T("خطا", "Error"));
                  }}>
                  <ListPlus className="w-3.5 h-3.5 ms-1" /> {T("به Task تبدیل کن", "Convert to Task")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {records.length === 0 && !editing && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            {T("هنوز ثبتی نیست. اولین مدل ABC را ثبت کن.", "No entries yet. Record your first ABC model.")}
          </div>
        )}
      </div>
    </div>
  );
}
