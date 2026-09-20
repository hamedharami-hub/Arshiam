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
import { Slider } from "@/components/ui/slider";
import {
  ArrowRight,
  ArrowLeft,
  Brain,
  Lightbulb,
  Wind,
  CheckCircle2,
  Save,
  Plus,
  Sparkles,
  Loader2,
  Calendar,
  Split,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";
import { upsertThoughtRecord } from "@/lib/firestoreDataService";
import { createTaskFromMind } from "@/lib/taskFromMind";

type Stage = "intake" | "triage" | "partial_split" | "solve" | "accept" | "confirm_task" | "done";

export default function WorryView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const [stage, setStage] = useState<Stage>("intake");
  const [worry, setWorry] = useState("");
  // Branch: "actionable" | "partial" | "uncontrollable"
  const [controlBranch, setControlBranch] = useState<"actionable" | "partial" | "uncontrollable">("actionable");

  // For partial control split
  const [controllablePart, setControllablePart] = useState("");
  const [uncontrollablePart, setUncontrollablePart] = useState("");

  // Problem solving
  const [problem, setProblem] = useState("");
  const [solutions, setSolutions] = useState<string[]>([""]);
  const [chosenSolution, setChosenSolution] = useState<number | null>(null);

  // Task creation details (confirmed by user)
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDateDays, setTaskDueDateDays] = useState(1);

  // Acceptance
  const [acceptanceText, setAcceptanceText] = useState("");
  const [distressBefore, setDistressBefore] = useState<number | null>(null);
  const [distressAfter, setDistressAfter] = useState<number | null>(null);

  const [aiBusy, setAiBusy] = useState(false);

  async function aiBrainstorm() {
    const targetProblem = problem.trim() || controllablePart.trim() || worry.trim();
    if (!targetProblem) {
      toast.error(T("اول مسئله را بنویس", "Write the problem first"));
      return;
    }
    setAiBusy(true);
    try {
      const ctx = createMindAIContext({
        operation: "worry_brainstorm",
        promptVersion: "worry_v2.0",
        language: isEn ? "en" : "fa",
        tool: "worry_tree",
        fields: {
          worry: { value: worry, provenance: "user_report" },
          control_level: {
            value: controlBranch === "actionable" ? "actionable" : controlBranch === "partial" ? "partial" : "uncontrollable",
            provenance: "user_report",
          },
          controllable_part: { value: controllablePart, provenance: "user_report" },
          uncontrollable_part: { value: uncontrollablePart, provenance: "user_report" },
          problem: { value: targetProblem, provenance: "user_report" },
        },
      });

      const res = await executeMindAI<WorryBrainstormOutput>(ctx);
      const d = res.data;
      const optionTitles = d.suggested_options.map((o) => o.title).filter(Boolean);

      if (optionTitles.length) {
        setSolutions([...optionTitles, ""]);
        toast.success(T("پیشنهادها دریافت شد", "Suggestions received"));
      } else {
        toast.error(T("پاسخی دریافت نشد", "No response received"));
      }
    } catch (e: any) {
      toast.error(e.message || T("خطا", "Error"));
    } finally {
      setAiBusy(false);
    }
  }

  function proceedToTaskConfirmation() {
    const baseTitle =
      chosenSolution != null && solutions[chosenSolution]
        ? solutions[chosenSolution]
        : problem || controllablePart || worry;
    setTaskTitle(baseTitle.slice(0, 120));
    setStage("confirm_task");
  }

  async function saveConfirmedTask() {
    if (!user) return;
    if (!taskTitle.trim()) {
      toast.error(T("عنوان تسک را مشخص کن", "Please enter task title"));
      return;
    }

    const desc = isEn
      ? [
          `Original Worry: ${worry}`,
          controllablePart ? `Controllable Part: ${controllablePart}` : "",
          problem ? `Problem Statement: ${problem}` : "",
        ]
          .filter(Boolean)
          .join("\n\n")
      : [
          `نگرانی اولیه: ${worry}`,
          controllablePart ? `بخش در کنترل: ${controllablePart}` : "",
          problem ? `تعریف مسئله: ${problem}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");

    const res = await createTaskFromMind({
      user_id: user.id,
      title: taskTitle.trim(),
      description: desc,
      due_in_days: taskDueDateDays,
      source_type: "worry_tree",
      priority: "medium",
    });

    if (res.ok) {
      toast.success(T("تسک با موفقیت اضافه شد ✨", "Task successfully added ✨"));
      setStage("done");
    } else {
      toast.error(res.error || T("خطا در ایجاد تسک", "Error creating task"));
    }
  }

  async function saveAcceptance() {
    if (!user) return;
    const defaultAcceptance = isEn
      ? "This matter is outside my control; I choose to redirect my energy to what I can meaningfully influence."
      : "این موضوع در کنترل من نیست؛ انرژی‌ام را به آنچه می‌توانم تغییر دهم هدایت می‌کنم.";

    const payload = {
      user_id: user.id,
      situation: isEn ? `Worry: ${worry}` : `نگرانی: ${worry}`,
      automatic_thought: worry,
      emotion_intensity_before: distressBefore,
      emotion_intensity_after: distressAfter,
      emotions: [isEn ? "Anxiety" : "اضطراب"],
      alternative_thought: acceptanceText.trim() || defaultAcceptance,
      distortions: [],
    };

    const savedId = await upsertThoughtRecord(user.id, payload);
    if (savedId) {
      firebaseStore
        .from("thought_records")
        .upsert({ ...payload, id: savedId }, { onConflict: "id" })
        .catch(() => {});
      toast.success(T("یادداشت در Thought Records ثبت شد ✨", "Saved to Thought Records ✨"));
      setStage("done");
    } else {
      toast.error(T("خطا در ذخیره یادداشت پذیرش", "Error saving acceptance record"));
    }
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-5 animate-fade-in"
    >
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("ذهن", "Mind")}
      </Button>

      {/* Header Banner */}
      <div className="rounded-3xl p-6 bg-gradient-to-br from-sky-500 via-blue-500 to-indigo-500 text-white shadow-md">
        <div className="flex items-center gap-2 text-xs opacity-85 mb-1.5">
          <Brain className="w-4 h-4" />
          {T("درخت نگرانی و حل مسئله", "Worry Tree & Problem Solving")}
        </div>
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          {T("تفکیک دغدغه و اقدام هدفمند", "Triage & Targeted Action")}
        </h1>
        <p className="text-sm opacity-90 leading-7">
          {T(
            "۳ مسیر تفکیک: دغدغه قابل اقدام، موضوع با کنترل نسبی، یا خارج از کنترل. ذهن با تفکیک عینی از نشخوار فکری رها می‌شود.",
            "3 pathways: actionable worry, partially controllable, or currently uncontrollable. Break the rumination loop."
          )}
        </p>
      </div>

      {/* Step 1: INTAKE */}
      {stage === "intake" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {T("۱) نگرانی الان چیست؟", "1) What is on your mind right now?")}
            </CardTitle>
            <CardDescription>
              {T("نگرانی‌ات را در یک یا دو جمله ساده بنویس.", "Express the worry in 1-2 objective sentences.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea
              rows={3}
              value={worry}
              onChange={(e) => setWorry(e.target.value)}
              placeholder={T(
                "مثلاً: نگرانم که در ارائه فردا مسلط نباشم و نتیجه خوبی نگیرم...",
                "e.g. I am worried that I will stumble during tomorrow's presentation..."
              )}
            />
            <Button
              disabled={!worry.trim()}
              onClick={() => setStage("triage")}
              size="lg"
            >
              {T("ادامه و بررسی مسیرها", "Continue to Triage")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 2: TRIAGE (3 branches) */}
      {stage === "triage" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {T("۲) میزان کنترل تو بر این موضوع چقدر است؟", "2) How much control do you have over this?")}
            </CardTitle>
            <CardDescription>
              {T("یکی از سه مسیر زیر را متناسب با واقعیت انتخاب کن:", "Select the pathway that fits reality:")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3.5 rounded-xl bg-muted/40 text-sm leading-relaxed border border-border/60">
              «{worry}»
            </div>

            <div className="grid gap-2.5 sm:grid-cols-3">
              {/* Branch 1 */}
              <button
                type="button"
                onClick={() => {
                  setTriageChoice("actionable");
                  setProblem(worry);
                  setStage("solve");
                }}
                className="p-3.5 rounded-xl border-2 border-border/70 hover:border-primary/60 bg-card/60 hover:bg-primary/5 transition text-start flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2 text-primary font-bold text-sm">
                  <Lightbulb className="w-4 h-4" />
                  <span>{T("می‌توانم اقدامی کنم", "Actionable")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {T("موضوع کاملاً در کنترل من است و قدم مشخصی برایش دارم.", "Fully in my control; I can take concrete action.")}
                </p>
              </button>

              {/* Branch 2 */}
              <button
                type="button"
                onClick={() => {
                  setTriageChoice("partial");
                  setStage("partial_split");
                }}
                className="p-3.5 rounded-xl border-2 border-border/70 hover:border-primary/60 bg-card/60 hover:bg-primary/5 transition text-start flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2 text-sky-500 font-bold text-sm">
                  <Split className="w-4 h-4" />
                  <span>{T("بخشی در کنترل من است", "Partially Controllable")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {T("قسمتی را می‌توانم اقدام کنم، اما قسمتی دست من نیست.", "Some parts are actionable, some are outside my control.")}
                </p>
              </button>

              {/* Branch 3 */}
              <button
                type="button"
                onClick={() => {
                  setTriageChoice("uncontrollable");
                  setStage("accept");
                }}
                className="p-3.5 rounded-xl border-2 border-border/70 hover:border-primary/60 bg-card/60 hover:bg-primary/5 transition text-start flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                  <Wind className="w-4 h-4" />
                  <span>{T("خارج از کنترل / نامطمئن", "Uncontrollable / Unsure")}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {T("فعلاً اقدامی در کنترلم نیست یا ابهام بیرونی وجود دارد.", "Currently outside my control; practicing letting go.")}
                </p>
              </button>
            </div>

            <Button variant="ghost" size="sm" onClick={() => setStage("intake")}>
              {T("قبلی", "Back")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 3: PARTIAL SPLIT (Branch 2) */}
      {stage === "partial_split" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Split className="w-4 h-4 text-sky-500" />
              {T("تفکیک دغدغه به دو بخش", "Isolate Controllable vs Uncontrollable Parts")}
            </CardTitle>
            <CardDescription>
              {T("مشخص کن کدام قسمت در کنترل توست و کدام قسمت خارج از کنترل:", "Clarify what you can influence vs what you cannot:")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm text-primary">
                {T("الف) قسمتی که در کنترل من است و می‌توانم برایش کاری کنم:", "A) Part I can control and take action on:")}
              </Label>
              <Textarea
                rows={2}
                value={controllablePart}
                onChange={(e) => setControllablePart(e.target.value)}
                placeholder={T("مثلاً: تمرین کردن اسلایدها و آماده‌سازی نکات کلیدی...", "e.g. Practicing the slides and preparing notes...")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-sm text-muted-foreground">
                {T("ب) قسمتی که خارج از کنترل من است:", "B) Part outside of my control:")}
              </Label>
              <Textarea
                rows={2}
                value={uncontrollablePart}
                onChange={(e) => setUncontrollablePart(e.target.value)}
                placeholder={T("مثلاً: نظر نهایی داور یا سوالات غیرمنتظره دیگران...", "e.g. The final decision of the reviewers...")}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                disabled={!controllablePart.trim()}
                onClick={() => {
                  setProblem(controllablePart);
                  setStage("solve");
                }}
              >
                {T("ادامه با بخش قابل اقدام", "Proceed with Controllable Part")}
              </Button>
              <Button variant="ghost" onClick={() => setStage("triage")}>
                {T("قبلی", "Back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: SOLVE (Problem Solving) */}
      {stage === "solve" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {T("۳) حل مسئله — راه‌حل‌های ممکن", "3) Problem-Solving — Brainstorm Solutions")}
            </CardTitle>
            <CardDescription>
              {T("چند راه‌حل عملی بنویس یا از هوش مصنوعی ایده بگیر. سپس یکی را انتخاب کن.", "Write concrete solutions or brainstorm with AI. Pick one to test.")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">
                {T("تعریف مسئله (تک‌جمله، عملیاتی)", "Problem Statement (Concise, actionable)")}
              </Label>
              <Input value={problem} onChange={(e) => setProblem(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label className="font-semibold text-sm">{T("راه‌حل‌ها", "Solutions")}</Label>
              {solutions.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setChosenSolution(i)}
                    className={`shrink-0 w-9 rounded-md border-2 transition ${
                      chosenSolution === i
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/40"
                    }`}
                    title={T("انتخاب راه‌حل", "Select solution")}
                  >
                    <CheckCircle2
                      className={`w-4 h-4 mx-auto ${
                        chosenSolution === i ? "text-primary" : "text-muted-foreground/50"
                      }`}
                    />
                  </button>
                  <Input
                    value={s}
                    onChange={(e) => {
                      const a = [...solutions];
                      a[i] = e.target.value;
                      setSolutions(a);
                    }}
                    placeholder={isEn ? `Solution ${i + 1}` : `راه‌حل ${i + 1}`}
                  />
                </div>
              ))}

              <div className="flex gap-2 pt-1 flex-wrap">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSolutions([...solutions, ""])}
                >
                  <Plus className="w-3.5 h-3.5 ms-1" /> {T("افزودن راه‌حل", "Add Solution")}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={aiBrainstorm}
                  disabled={aiBusy}
                >
                  {aiBusy ? (
                    <Loader2 className="w-3.5 h-3.5 ms-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 ms-1 text-primary" />
                  )}
                  {T("ایده‌پردازی با AI (اختیاری)", "Brainstorm with AI (Optional)")}
                </Button>
              </div>
            </div>

            {chosenSolution != null && solutions[chosenSolution] && (
              <div className="pt-2">
                <Button onClick={proceedToTaskConfirmation} size="lg" className="w-full">
                  {T("بررسی و تایید قبل از ساخت تسک", "Review & Confirm Task")}
                </Button>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStage(triageChoice === "partial" ? "partial_split" : "triage")}
            >
              {T("قبلی", "Back")}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Step 5: CONFIRM TASK (User confirms title & due date before creation) */}
      {stage === "confirm_task" && (
        <Card className="border-2 border-primary/30">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              {T("تایید عنوان و زمان تسک", "Confirm Task Details")}
            </CardTitle>
            <CardDescription>
              {T("قبل از اضافه شدن به فهرست کارها، می‌توانید عنوان و تاریخ را اصلاح کنید:", "Edit title and due date before adding to your task list:")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">{T("عنوان تسک", "Task Title")}</Label>
              <Input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder={T("اقدام مشخص...", "Actionable step...")}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="font-semibold text-sm">{T("مهلت انجام", "Due Date")}</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={taskDueDateDays === 0 ? "default" : "outline"}
                  onClick={() => setTaskDueDateDays(0)}
                >
                  {T("امروز", "Today")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taskDueDateDays === 1 ? "default" : "outline"}
                  onClick={() => setTaskDueDateDays(1)}
                >
                  {T("فردا", "Tomorrow")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taskDueDateDays === 3 ? "default" : "outline"}
                  onClick={() => setTaskDueDateDays(3)}
                >
                  {T("۳ روز آینده", "In 3 days")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={taskDueDateDays === 7 ? "default" : "outline"}
                  onClick={() => setTaskDueDateDays(7)}
                >
                  {T("هفته آینده", "Next week")}
                </Button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveConfirmedTask} size="lg" className="w-full">
                <Save className="w-4 h-4 ms-1" />
                {T("تایید و ذخیره در Tasks", "Confirm & Save as Task")}
              </Button>
              <Button variant="ghost" onClick={() => setStage("solve")}>
                {T("انصراف / ویرایش راه‌حل", "Cancel / Edit Solution")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 6: ACCEPT (Radical Acceptance & Letting Go) */}
      {stage === "accept" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Wind className="w-4 h-4 text-amber-500" />
              {T("پذیرش و هدایت انرژی", "Acceptance & Energy Redirection")}
            </CardTitle>
            <CardDescription>
              {T(
                "وقتی موضوعی فعلاً در کنترلت نیست، رها کردن تلاش‌های بی‌اثر به آرامش ذهن کمک می‌کند. پذیرش اختیاری است.",
                "When a matter is currently outside your control, redirecting energy eases rumination. Acceptance is optional."
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="p-3.5 rounded-xl bg-muted/40 border border-border/60">
              «{worry}»
            </div>

            <div className="space-y-2">
              <p className="leading-7 text-muted-foreground">
                {T(
                  "یک تمرین اختیاری: چند نفس آرام بکش. یک یادداشت بنویس که به خودت یادآوری کند انرژی‌ات را روی چه فعالیت ارزشمندی متمرکز کنی.",
                  "Optional practice: Take a few deep breaths. Write a note to remind yourself where you choose to invest your energy instead."
                )}
              </p>
              <Textarea
                rows={3}
                value={acceptanceText}
                onChange={(e) => setAcceptanceText(e.target.value)}
                placeholder={T(
                  "مثلاً: نتیجه این موضوع در دست من نیست؛ تمرکزم را به کارهای ارزشمند امروز معطوف می‌کنم.",
                  "e.g. The outcome is not in my hands; I redirect my focus to what matters today."
                )}
              />
            </div>

            {/* Optional Distress Rating (NO default 20% reduction!) */}
            <div className="space-y-3 pt-2 border-t border-border/50">
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="text-muted-foreground">
                    {T("شدت اضطراب قبل از تأمل (اختیاری):", "Distress before reflection (optional):")}
                  </Label>
                  <span className="font-mono">
                    {distressBefore != null ? `${distressBefore}%` : T("ثبت نشده", "Not set")}
                  </span>
                </div>
                <Slider
                  value={[distressBefore ?? 0]}
                  max={100}
                  step={5}
                  onValueChange={(v) => setDistressBefore(v[0])}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <Label className="text-muted-foreground">
                    {T("شدت اضطراب بعد از تأمل (اختیاری):", "Distress after reflection (optional):")}
                  </Label>
                  <span className="font-mono">
                    {distressAfter != null ? `${distressAfter}%` : T("ثبت نشده", "Not set")}
                  </span>
                </div>
                <Slider
                  value={[distressAfter ?? 0]}
                  max={100}
                  step={5}
                  onValueChange={(v) => setDistressAfter(v[0])}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={saveAcceptance}>
                <Save className="w-4 h-4 ms-1" />
                {T("ذخیره در Thought Records", "Save to Thought Records")}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setStage("triage")}>
                {T("قبلی", "Back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Done Stage */}
      {stage === "done" && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardContent className="p-6 text-center space-y-4">
            <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
            <h2 className="font-bold text-lg">{T("پایان تمرین", "Exercise Completed")}</h2>
            <p className="text-sm text-muted-foreground">
              {T(
                "یک گام هوشیارانه برای سامان دادن به فکر برداشتی. این اقدام ارزشمند است.",
                "You took a mindful step to process your worry. That is meaningful."
              )}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <Button
                onClick={() => {
                  setStage("intake");
                  setWorry("");
                  setTriageChoice(null);
                  setProblem("");
                  setControllablePart("");
                  setUncontrollablePart("");
                  setSolutions([""]);
                  setChosenSolution(null);
                  setTaskTitle("");
                  setAcceptanceText("");
                  setDistressBefore(null);
                  setDistressAfter(null);
                }}
              >
                {T("بررسی نگرانی دیگر", "Process Another Worry")}
              </Button>
              <Button variant="outline" onClick={() => navigate("/app/mind")}>
                {T("بازگشت به Mind", "Back to Mind")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
