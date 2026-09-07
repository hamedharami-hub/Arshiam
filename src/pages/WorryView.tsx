import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Brain, Lightbulb, Wind, CheckCircle2, Save, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";

type Stage = "intake" | "triage" | "solve" | "accept" | "done";

export default function WorryView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stage, setStage] = useState<Stage>("intake");
  const [worry, setWorry] = useState("");
  const [solvable, setSolvable] = useState<boolean | null>(null);
  const [problem, setProblem] = useState("");
  const [solutions, setSolutions] = useState<string[]>([""]);
  const [chosen, setChosen] = useState<number | null>(null);
  const [firstStep, setFirstStep] = useState("");
  const [acceptanceText, setAcceptanceText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);

  async function aiBrainstorm() {
    if (!problem.trim()) {
      toast.error("اول مسئله را بنویس");
      return;
    }
    setAiBusy(true);
    try {
      const res = await callAI(
        "general" as any,
        `یک نگرانی برای حل مسئله ساختاریافته آمده. ۵ راه‌حل عملی و متفاوت پیشنهاد کن، هر کدام در یک خط کوتاه. فقط فهرست بدون توضیح.\n\nمسئله: ${problem}`,
      );
      const text = typeof res === "string" ? res : (res?.text || "");
      const lines = text.split("\n").map((s) => s.replace(/^[\d\-\.\)\*\s]+/, "").trim()).filter(Boolean).slice(0, 5);
      if (lines.length) setSolutions([...lines, ""]);
      else toast.error("پاسخی دریافت نشد");
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setAiBusy(false);
    }
  }

  async function saveAsTask() {
    if (!user) return;
    const title = firstStep.trim() || (chosen != null ? solutions[chosen] : "");
    if (!title) {
      toast.error("اول قدم بعدی را مشخص کن");
      return;
    }
    const desc = [
      `نگرانی اصلی: ${worry}`,
      `مسئله قابل‌حل: ${problem}`,
      chosen != null ? `راه‌حل انتخابی: ${solutions[chosen]}` : "",
    ].filter(Boolean).join("\n\n");
    const { error } = await supabase.from("tasks").insert({
      user_id: user.id,
      title,
      description: desc,
      due_date: new Date(Date.now() + 86400000).toISOString(),
    });
    if (error) toast.error(error.message);
    else {
      toast.success("به Task فردا اضافه شد");
      setStage("done");
    }
  }

  async function saveAcceptance() {
    if (!user) return;
    const { error } = await supabase.from("thought_records").insert({
      user_id: user.id,
      situation: `نگرانی غیرقابل‌حل: ${worry}`,
      automatic_thought: worry,
      emotion_intensity_before: 70,
      emotion_intensity_after: 50,
      emotions: ["اضطراب"],
      alternative_thought: acceptanceText || "این موضوع خارج از کنترل من است؛ انرژی‌ام را به آنچه می‌توانم تغییر دهم می‌دهم.",
      distortions: [],
    });
    if (error) toast.error(error.message);
    else {
      toast.success("در Thought Records ثبت شد");
      setStage("done");
    }
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <ArrowRight className="w-4 h-4 ms-1" /> Mind
      </Button>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-80 mb-2"><Brain className="w-4 h-4" /> Worry / Problem-Solving</div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">نگرانی‌ت قابل‌حل است یا نه؟</h1>
        <p className="text-sm opacity-90 leading-7">
          یک گام ساختاریافته: ابتدا نگرانی را تفکیک کن، بعد یا حلش کن، یا با آن کنار بیا.
          ذهن وقتی در حلقه نگرانی گیر می‌کند، این مدل آن را می‌شکند.
        </p>
      </div>

      {stage === "intake" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">۱) نگرانی الان چیست؟</CardTitle>
            <CardDescription>یک یا دو جمله، عینی</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={3} value={worry} onChange={(e) => setWorry(e.target.value)} placeholder="مثلاً: نگرانم که در پروژه شکست بخورم..." />
            <Button disabled={!worry.trim()} onClick={() => setStage("triage")}>ادامه</Button>
          </CardContent>
        </Card>
      )}

      {stage === "triage" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">۲) آیا الان کاری از دستت برمی‌آید؟</CardTitle>
            <CardDescription>سؤال کلیدی: می‌توانی ظرف یک هفته قدمی برداری که این را تغییر دهد؟</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">«{worry}»</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button variant={solvable === true ? "default" : "outline"} onClick={() => { setSolvable(true); setProblem(worry); setStage("solve"); }}>
                <Lightbulb className="w-4 h-4 ms-1" /> بله، قابل‌حل است
              </Button>
              <Button variant={solvable === false ? "default" : "outline"} onClick={() => { setSolvable(false); setStage("accept"); }}>
                <Wind className="w-4 h-4 ms-1" /> نه، خارج از کنترل من
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStage("intake")}>قبلی</Button>
          </CardContent>
        </Card>
      )}

      {stage === "solve" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">۳) Problem-Solving — راه‌حل‌ها را فهرست کن</CardTitle>
            <CardDescription>کمیت قبل از کیفیت — هر چه بیشتر، بهتر. حتی ایده‌های عجیب.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>تعریف دقیق مسئله (تک‌جمله، عملیاتی)</Label>
              <Input value={problem} onChange={(e) => setProblem(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>راه‌حل‌های ممکن</Label>
              {solutions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <button
                    onClick={() => setChosen(i)}
                    className={`shrink-0 w-9 rounded-md border-2 ${chosen === i ? "border-primary bg-primary/10" : "border-border"}`}
                    title="انتخاب راه‌حل"
                  >
                    <CheckCircle2 className={`w-4 h-4 mx-auto ${chosen === i ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <Input value={s} onChange={(e) => { const a = [...solutions]; a[i] = e.target.value; setSolutions(a); }} placeholder={`راه‌حل ${i + 1}`} />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSolutions([...solutions, ""])}>
                  <Plus className="w-3 h-3 ms-1" /> افزودن
                </Button>
                <Button size="sm" variant="outline" onClick={aiBrainstorm} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="w-3 h-3 ms-1 animate-spin" /> : <Sparkles className="w-3 h-3 ms-1" />}
                  Brainstorm با AI
                </Button>
              </div>
            </div>

            {chosen != null && solutions[chosen] && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Label>۴) کوچک‌ترین قدم بعدی (در ۲۴ ساعت)</Label>
                <Input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} placeholder="یک قدم خیلی کوچک و انجام‌پذیر" />
                <Button onClick={saveAsTask} className="w-full">
                  <Save className="w-4 h-4 ms-1" /> ذخیره به‌عنوان Task
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setStage("triage")}>قبلی</Button>
          </CardContent>
        </Card>
      )}

      {stage === "accept" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">۳) پذیرش و رهاسازی</CardTitle>
            <CardDescription>وقتی موضوع بیرون از کنترل توست، تلاش برای حل، نگرانی را تشدید می‌کند</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">«{worry}»</div>
            <div className="space-y-2">
              <p className="leading-7 text-muted-foreground">
                یک تمرین کوتاه: ۳ نفس عمیق بکش. اعتراف کن این مسئله الان قابل‌حل نیست. یک جمله بنویس
                که به خودت یادآوری کند انرژی‌ات را به چیزی بدهی که قابل کنترل است.
              </p>
              <Textarea rows={3} value={acceptanceText} onChange={(e) => setAcceptanceText(e.target.value)}
                placeholder="مثلاً: این موضوع از کنترل من خارج است. تمرکزم را به فعالیت‌های ارزشمند امروز معطوف می‌کنم." />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveAcceptance}><Save className="w-4 h-4 ms-1" /> ذخیره در Thought Records</Button>
              <Button variant="ghost" size="sm" onClick={() => setStage("triage")}>قبلی</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "done" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <h2 className="font-bold text-lg">تمام شد</h2>
            <p className="text-sm text-muted-foreground">یک قدم برداشتی. این کافی است.</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setStage("intake"); setWorry(""); setSolvable(null); setProblem(""); setSolutions([""]); setChosen(null); setFirstStep(""); setAcceptanceText(""); }}>
                نگرانی جدید
              </Button>
              <Button variant="outline" onClick={() => navigate("/app/mind")}>بازگشت به Mind</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
