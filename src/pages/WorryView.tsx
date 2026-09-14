import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Brain, Lightbulb, Wind, CheckCircle2, Save, Plus, Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";
import { upsertTask, upsertThoughtRecord } from "@/lib/firestoreDataService";

type Stage = "intake" | "triage" | "solve" | "accept" | "done";

export default function WorryView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;
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
      toast.error(T("اول مسئله را بنویس", "Write the problem first"));
      return;
    }
    setAiBusy(true);
    try {
      const prompt = isEn
        ? `A worry has been framed for structured problem-solving. Suggest 5 actionable and distinct solutions, each on a single concise line. Only the list, no commentary.\n\nProblem: ${problem}`
        : `یک نگرانی برای حل مسئله ساختاریافته آمده. ۵ راه‌حل عملی و متفاوت پیشنهاد کن، هر کدام در یک خط کوتاه. فقط فهرست بدون توضیح.\n\nمسئله: ${problem}`;
      const res = await callAI("general" as any, prompt);
      const text = typeof res === "string" ? res : (res?.text || "");
      const lines = text.split("\n").map((s) => s.replace(/^[\d\-\.\)\*\s]+/, "").trim()).filter(Boolean).slice(0, 5);
      if (lines.length) setSolutions([...lines, ""]);
      else toast.error(T("پاسخی دریافت نشد", "No response received"));
    } catch (e: any) {
      toast.error(e.message || T("خطا", "Error"));
    } finally {
      setAiBusy(false);
    }
  }

  async function saveAsTask() {
    if (!user) return;
    const title = firstStep.trim() || (chosen != null ? solutions[chosen] : "");
    if (!title) {
      toast.error(T("اول قدم بعدی را مشخص کن", "Define the next step first"));
      return;
    }
    const desc = isEn
      ? [
          `Original Worry: ${worry}`,
          `Actionable Problem: ${problem}`,
          chosen != null ? `Selected Solution: ${solutions[chosen]}` : "",
        ].filter(Boolean).join("\n\n")
      : [
          `نگرانی اصلی: ${worry}`,
          `مسئله قابل‌حل: ${problem}`,
          chosen != null ? `راه‌حل انتخابی: ${solutions[chosen]}` : "",
        ].filter(Boolean).join("\n\n");

    const newTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      user_id: user.id,
      title,
      description: desc,
      due_date: new Date(Date.now() + 86400000).toISOString(),
      completed: false,
      priority: "medium" as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const ok = await upsertTask(user.id, newTask);
    // Mirror to firebaseStore
    firebaseStore.from("tasks").insert(newTask).catch(() => {});

    if (ok) {
      toast.success(T("به Task فردا اضافه شد ✨", "Added to tomorrow's tasks ✨"));
      setStage("done");
    } else {
      toast.error(T("خطا در افزودن وظیفه", "Error adding task"));
    }
  }

  async function saveAcceptance() {
    if (!user) return;
    const defaultAcceptance = isEn
      ? "This matter is outside my control; I choose to redirect my energy to what I can change."
      : "این موضوع خارج از کنترل من است؛ انرژی‌ام را به آنچه می‌توانم تغییر دهم می‌دهم.";

    const payload = {
      user_id: user.id,
      situation: isEn ? `Uncontrollable worry: ${worry}` : `نگرانی غیرقابل‌حل: ${worry}`,
      automatic_thought: worry,
      emotion_intensity_before: 70,
      emotion_intensity_after: 50,
      emotions: [isEn ? "Anxiety" : "اضطراب"],
      alternative_thought: acceptanceText || defaultAcceptance,
      distortions: [],
    };
    const savedId = await upsertThoughtRecord(user.id, payload);
    // Mirror to firebaseStore
    firebaseStore.from("thought_records").insert({ ...payload, id: savedId }).catch(() => {});

    if (savedId) {
      toast.success(T("در Thought Records ثبت شد ✨", "Saved to Thought Records ✨"));
      setStage("done");
    } else {
      toast.error(T("خطا در ذخیره یادداشت پذیرش", "Error saving acceptance record"));
    }
  }

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in">
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <BackIcon className="w-4 h-4 ms-1" /> {T("ذهن", "Mind")}
      </Button>

      <div className="rounded-3xl p-6 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-80 mb-2"><Brain className="w-4 h-4" /> {T("نگرانی / حل مسئله", "Worry / Problem-Solving")}</div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">{T("نگرانی‌ت قابل‌حل است یا نه؟", "Is your worry solvable or not?")}</h1>
        <p className="text-sm opacity-90 leading-7">
          {T(
            "یک گام ساختاریافته: ابتدا نگرانی را تفکیک کن، بعد یا حلش کن، یا با آن کنار بیا. ذهن وقتی در حلقه نگرانی گیر می‌کند، این مدل آن را می‌شکند.",
            "A structured framework: first triage the worry, then either solve it actionably or practice radical acceptance. Breaks the rumination loop."
          )}
        </p>
      </div>

      {stage === "intake" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T("۱) نگرانی الان چیست؟", "1) What is your current worry?")}</CardTitle>
            <CardDescription>{T("یک یا دو جمله، عینی", "One or two sentences, objective")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea rows={3} value={worry} onChange={(e) => setWorry(e.target.value)} placeholder={T("مثلاً: نگرانم که در پروژه شکست بخورم...", "E.g., I'm worried that I might fail on this project...")} />
            <Button disabled={!worry.trim()} onClick={() => setStage("triage")}>{T("ادامه", "Continue")}</Button>
          </CardContent>
        </Card>
      )}

      {stage === "triage" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T("۲) آیا الان کاری از دستت برمی‌آید؟", "2) Can you do anything about it right now?")}</CardTitle>
            <CardDescription>{T("سؤال کلیدی: می‌توانی ظرف یک هفته قدمی برداری که این را تغییر دهد؟", "Key question: Can you take a tangible step within a week to influence this?")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-lg bg-muted/50 text-sm">«{worry}»</div>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button variant={solvable === true ? "default" : "outline"} onClick={() => { setSolvable(true); setProblem(worry); setStage("solve"); }}>
                <Lightbulb className="w-4 h-4 ms-1" /> {T("بله، قابل‌حل است", "Yes, it is solvable")}
              </Button>
              <Button variant={solvable === false ? "default" : "outline"} onClick={() => { setSolvable(false); setStage("accept"); }}>
                <Wind className="w-4 h-4 ms-1" /> {T("نه، خارج از کنترل من", "No, it's outside my control")}
              </Button>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setStage("intake")}>{T("قبلی", "Back")}</Button>
          </CardContent>
        </Card>
      )}

      {stage === "solve" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T("۳) Problem-Solving — راه‌حل‌ها را فهرست کن", "3) Problem-Solving — List Solutions")}</CardTitle>
            <CardDescription>{T("کمیت قبل از کیفیت — هر چه بیشتر، بهتر. حتی ایده‌های عجیب.", "Quantity over quality — brainstorm as many as possible, even unusual ones.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>{T("تعریف دقیق مسئله (تک‌جمله، عملیاتی)", "Clear Problem Statement (Single actionable sentence)")}</Label>
              <Input value={problem} onChange={(e) => setProblem(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>{T("راه‌حل‌های ممکن", "Possible Solutions")}</Label>
              {solutions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <button
                    onClick={() => setChosen(i)}
                    className={`shrink-0 w-9 rounded-md border-2 ${chosen === i ? "border-primary bg-primary/10" : "border-border"}`}
                    title={T("انتخاب راه‌حل", "Select solution")}
                  >
                    <CheckCircle2 className={`w-4 h-4 mx-auto ${chosen === i ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <Input value={s} onChange={(e) => { const a = [...solutions]; a[i] = e.target.value; setSolutions(a); }} placeholder={isEn ? `Solution ${i + 1}` : `راه‌حل ${i + 1}`} />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setSolutions([...solutions, ""])}>
                  <Plus className="w-3 h-3 ms-1" /> {T("افزودن", "Add")}
                </Button>
                <Button size="sm" variant="outline" onClick={aiBrainstorm} disabled={aiBusy}>
                  {aiBusy ? <Loader2 className="w-3 h-3 ms-1 animate-spin" /> : <Sparkles className="w-3 h-3 ms-1" />}
                  {T("Brainstorm با AI", "Brainstorm with AI")}
                </Button>
              </div>
            </div>

            {chosen != null && solutions[chosen] && (
              <div className="space-y-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
                <Label>{T("۴) کوچک‌ترین قدم بعدی (در ۲۴ ساعت)", "4) Smallest Next Step (Within 24 hours)")}</Label>
                <Input value={firstStep} onChange={(e) => setFirstStep(e.target.value)} placeholder={T("یک قدم خیلی کوچک و انجام‌پذیر", "A tiny, very achievable action step")} />
                <Button onClick={saveAsTask} className="w-full">
                  <Save className="w-4 h-4 ms-1" /> {T("ذخیره به‌عنوان Task", "Save as Task")}
                </Button>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => setStage("triage")}>{T("قبلی", "Back")}</Button>
          </CardContent>
        </Card>
      )}

      {stage === "accept" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{T("۳) پذیرش و رهاسازی", "3) Acceptance and Letting Go")}</CardTitle>
            <CardDescription>{T("وقتی موضوع بیرون از کنترل توست، تلاش برای حل، نگرانی را تشدید می‌کند", "When something is outside your control, trying to solve it only amplifies anxiety")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3 rounded-lg bg-muted/50">«{worry}»</div>
            <div className="space-y-2">
              <p className="leading-7 text-muted-foreground">
                {T(
                  "یک تمرین کوتاه: ۳ نفس عمیق بکش. اعتراف کن این مسئله الان قابل‌حل نیست. یک جمله بنویس که به خودت یادآوری کند انرژی‌ات را به چیزی بدهی که قابل کنترل است.",
                  "A brief exercise: take 3 deep breaths. Acknowledge that this matter cannot be solved right now. Write down a reminder to refocus your energy on what you can control."
                )}
              </p>
              <Textarea rows={3} value={acceptanceText} onChange={(e) => setAcceptanceText(e.target.value)}
                placeholder={T(
                  "مثلاً: این موضوع از کنترل من خارج است. تمرکزم را به فعالیت‌های ارزشمند امروز معطوف می‌کنم.",
                  "E.g., This is beyond my control. I choose to channel my attention into meaningful actions today."
                )} />
            </div>
            <div className="flex gap-2">
              <Button onClick={saveAcceptance}><Save className="w-4 h-4 ms-1" /> {T("ذخیره در Thought Records", "Save to Thought Records")}</Button>
              <Button variant="ghost" size="sm" onClick={() => setStage("triage")}>{T("قبلی", "Back")}</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === "done" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <h2 className="font-bold text-lg">{T("تمام شد", "Completed")}</h2>
            <p className="text-sm text-muted-foreground">{T("یک قدم برداشتی. این کافی است.", "You took a conscious step. That is enough.")}</p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => { setStage("intake"); setWorry(""); setSolvable(null); setProblem(""); setSolutions([""]); setChosen(null); setFirstStep(""); setAcceptanceText(""); }}>
                {T("نگرانی جدید", "New Worry")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/app/mind")}>{T("بازگشت به Mind", "Back to Mind")}</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
