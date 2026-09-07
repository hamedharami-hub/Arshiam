import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, TrendingUp, BookOpen, ListPlus } from "lucide-react";
import { createTaskFromMind } from "@/lib/taskFromMind";

const TRIGGERS = ["دریافت پیام", "خستگی فیزیکی", "گیر کردن روی مسئله", "گرسنگی", "نویز", "فکر مزاحم", "کافئین", "کمبود خواب", "سایر"];
const CONSEQUENCES = ["باز کردن شبکه اجتماعی", "خوردن ناسالم", "تعویق", "خشم", "گریه", "ترک میز", "خوابیدن بی‌موقع", "سایر"];

export default function ABCView() {
  const { user } = useAuth();
  const [records, setRecords] = useState<any[]>([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ trigger: "", belief: "", consequences: [] as string[], duration_minutes: "", regret_level: 5 });

  useEffect(() => { if (user) load(); }, [user]);

  async function load() {
    const { data } = await supabase.from("abc_records").select("*").eq("user_id", user!.id)
      .gte("created_at", new Date(Date.now() - 30 * 86400000).toISOString())
      .order("created_at", { ascending: false });
    setRecords(data || []);
  }

  async function save() {
    if (!user || !form.trigger || !form.belief) { toast.error("محرک و باور را پر کن"); return; }
    const { error } = await supabase.from("abc_records").insert({
      user_id: user.id,
      trigger: form.trigger, belief: form.belief, consequences: form.consequences,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      regret_level: form.regret_level,
    });
    if (error) toast.error(error.message);
    else { toast.success("ثبت شد"); setEditing(false); setForm({ trigger: "", belief: "", consequences: [], duration_minutes: "", regret_level: 5 }); load(); }
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
    avgDuration: number; avgRegret: number; confidence: "قوی" | "متوسط" | "ضعیف";
    sampleSize: number;
  };
  const strongPatterns: Pattern[] = [];
  const weakPatterns: Pattern[] = [];
  Object.values(map).forEach((m: any) => {
    const tCount = triggerCounts[m.trigger] || 1;
    const frequency = m.count / tCount;
    const p: Pattern = {
      trigger: m.trigger, consequence: m.consequence, count: m.count, frequency,
      avgDuration: m.durN ? m.totalDur / m.durN : 0,
      avgRegret: m.regretN ? m.totalRegret / m.regretN : 0,
      sampleSize: tCount,
      confidence: m.count >= 7 && frequency >= 0.6 ? "قوی" : m.count >= 4 ? "متوسط" : "ضعیف",
    };
    if (m.count >= 7 && frequency >= 0.6) strongPatterns.push(p);
    else if (m.count >= 3) weakPatterns.push(p);
  });
  strongPatterns.sort((a, b) => b.count - a.count);
  weakPatterns.sort((a, b) => b.count - a.count);
  const patterns = [...strongPatterns, ...weakPatterns];

  return (
    <div dir="rtl" className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold mb-2">مدل ABC</h1>
          <p className="text-muted-foreground text-sm">محرک ← باور ← پیامد. کشف الگوهای تکراری برای پیدا کردن نقطه مداخله.</p>
        </div>
        {!editing && <Button onClick={() => setEditing(true)}><Plus className="w-4 h-4 ms-1" /> ثبت جدید</Button>}
      </div>

      {/* راهنمای کامل */}
      <Card className="border-primary/20">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-5 py-4 hover:no-underline">
                <div className="flex items-center gap-2 text-end">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <span className="font-medium">راهنمای کامل: مدل ABC چیست و چگونه پر کنم؟</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 space-y-4 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">🎯 این روش چیست؟</div>
                  <p className="text-muted-foreground">
                    مدل ABC از روان‌شناسی شناختی-رفتاری (CBT) آلبرت الیس می‌آید. ایده ساده ولی قدرتمند است:
                    رفتار ناخواسته‌ی تو (مثل پرخوری، تعویق، خشم) فقط نتیجه «اتفاق بیرونی» نیست —
                    بلکه نتیجه «باوری» است که در آن لحظه از ذهنت می‌گذرد. اگر فقط محرک‌ها را ببینی،
                    گیر می‌کنی؛ اما اگر باور وسط را شناسایی کنی، می‌توانی همان‌جا مداخله کنی.
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">🧩 چه زمانی استفاده کنم؟</div>
                  <ul className="text-muted-foreground list-disc pe-5 space-y-1">
                    <li>وقتی متوجه می‌شوی رفتار خاصی را تکرار می‌کنی و بعد پشیمان می‌شوی.</li>
                    <li>وقتی نمی‌فهمی چرا یک محرک ساده تو را به واکنش بزرگ می‌رساند.</li>
                    <li>برای الگوهایی مثل: گوشی‌گردی شبانه، خوردن استرسی، تعویق، انفجارهای خشم.</li>
                  </ul>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">📝 چگونه فرم را پر کنم؟</div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-2">
                    <li>
                      <strong className="text-foreground">A — محرک (Activating event):</strong> فقط فکت بیرونی.
                      مثال خوب: «ساعت ۲۳ پیامی از همکار رسید». مثال بد: «همکارم دوباره مزاحم شد».
                    </li>
                    <li>
                      <strong className="text-foreground">B — باور لحظه‌ای (Belief):</strong> آن جمله‌ای که
                      دقیقاً در کسری از ثانیه از ذهنت گذشت. مثال: «اگه جواب ندم فکر می‌کنه بی‌مسئولیتم».
                      صادق باش، حتی اگر باور غیرمنطقی به نظر می‌رسد.
                    </li>
                    <li>
                      <strong className="text-foreground">C — پیامد رفتاری (Consequence):</strong> چه کاری
                      عملاً انجام دادی؟ یک یا چند گزینه را علامت بزن.
                    </li>
                    <li>
                      <strong className="text-foreground">D — مدت:</strong> چقدر طول کشید؟ این عدد به الگویابی
                      کمک می‌کند تا ببینی کدام محرک‌ها بیشترین زمان را می‌سوزانند.
                    </li>
                    <li>
                      <strong className="text-foreground">E — پشیمانی (۰ تا ۱۰):</strong> الان که نگاه می‌کنی،
                      چقدر از این رفتار پشیمانی؟ این عدد ارزش مداخله را مشخص می‌کند.
                    </li>
                  </ol>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">📊 تحلیلی که دریافت می‌کنی</div>
                  <p className="text-muted-foreground">
                    بعد از حدود ۷ ثبت از یک محرک، الگوریتم «الگوی قوی» را شناسایی می‌کند:
                    «وقتی X رخ می‌دهد، در ۷۰٪ موارد به Y می‌رسی». این دقیقاً نقطه‌ای است
                    که می‌توانی یک «جایگزین رفتاری» طراحی کنی و تست کنی.
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
              <Label>A — محرک</Label>
              <Select value={form.trigger} onValueChange={(v) => setForm({ ...form, trigger: v })}>
                <SelectTrigger><SelectValue placeholder="انتخاب کن" /></SelectTrigger>
                <SelectContent>{TRIGGERS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>B — باور لحظه‌ای</Label>
              <Textarea rows={2} value={form.belief} onChange={(e) => setForm({ ...form, belief: e.target.value })} placeholder="چه فکری در آن لحظه از ذهنت گذشت؟" />
            </div>
            <div className="space-y-2">
              <Label>C — پیامد رفتاری</Label>
              <div className="flex flex-wrap gap-2">
                {CONSEQUENCES.map((c) => (
                  <Badge key={c} variant={form.consequences.includes(c) ? "default" : "outline"} className="cursor-pointer"
                    onClick={() => setForm({ ...form, consequences: form.consequences.includes(c) ? form.consequences.filter((x) => x !== c) : [...form.consequences, c] })}>
                    {c}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>D — مدت پیامد (دقیقه)</Label>
              <Input type="number" value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} className="w-32" />
            </div>
            <div className="space-y-2">
              <Label>E — پشیمانی: {form.regret_level}/10</Label>
              <Slider value={[form.regret_level]} onValueChange={(v) => setForm({ ...form, regret_level: v[0] })} max={10} step={1} />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>ذخیره</Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>انصراف</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {patterns.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="w-5 h-5" /> الگوهای شناسایی‌شده</CardTitle>
            <CardDescription>
              n = {records.length} ثبت در ۳۰ روز اخیر
              {strongPatterns.length > 0 && <> · <span className="text-primary font-medium">{strongPatterns.length} الگوی قوی</span></>}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {patterns.slice(0, 8).map((p, i) => {
              const isStrong = p.confidence === "قوی";
              return (
                <div key={i} className={`p-3 rounded-lg text-sm space-y-1.5 ${isStrong ? "bg-primary/10 border border-primary/30" : "bg-muted/30"}`}>
                  <div className="flex justify-between items-start gap-2">
                    <span><strong>{p.trigger}</strong> → <strong className="text-primary">{p.consequence}</strong></span>
                    <Badge variant={isStrong ? "default" : "secondary"} className="shrink-0">اعتماد: {p.confidence}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {p.count} بار از {p.sampleSize} (فراوانی {(p.frequency * 100).toFixed(0)}٪) · میانگین {p.avgDuration.toFixed(0)} دقیقه · پشیمانی {p.avgRegret.toFixed(1)}/10
                  </div>
                  {isStrong && (
                    <div className="text-xs text-primary mt-1">
                      💡 وقتی «{p.trigger}» رخ می‌دهد، در {(p.frequency * 100).toFixed(0)}٪ موارد به «{p.consequence}» می‌رسی. نقطه مداخله را اینجا قرار بده.
                    </div>
                  )}
                </div>
              );
            })}
            {strongPatterns.length === 0 && (
              <div className="text-xs text-muted-foreground text-center pt-2">
                برای الگوی «قوی» نیاز به ≥۷ نمونه و فراوانی ≥۶۰٪ است. ادامه بده.
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
                <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("fa-IR")}</div>
                <Button size="sm" variant="outline"
                  onClick={async () => {
                    const res = await createTaskFromMind({
                      user_id: user!.id,
                      title: `جایگزین رفتاری برای «${r.trigger}»`,
                      description: `محرک: ${r.trigger}\nباور: ${r.belief}\nنتیجه: ${(r.consequences || []).join(", ")}\n\nقدم بعدی: یک رفتار جایگزین برای دفعه بعد طراحی کن.`,
                      due_in_days: 1,
                    });
                    if (res.ok) toast.success("به Task اضافه شد");
                    else toast.error(res.error || "خطا");
                  }}>
                  <ListPlus className="w-3.5 h-3.5 ms-1" /> Task
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
