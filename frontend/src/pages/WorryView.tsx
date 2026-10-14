import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { DraftConflictNotice } from "@/components/mind/DraftConflictNotice";
import { ConcernNav } from "@/components/mind/ConcernNav";
import { DraftPrivacy } from "@/components/mind/DraftPrivacy";
import { readMindSession } from "@/lib/mind/sessionService";
import { useEffect, useRef, useState } from "react";
import { getMindDraft, useMindDraft, type MindDraft } from "@/lib/mindDraft";
import { useWorkspaceDraft } from "@/lib/mind/workspaceDraft";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { getOpConfig } from "@/lib/aiSettings";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { upsertThoughtRecord } from "@/lib/firestoreDataService";
import { createTaskFromMind } from "@/lib/taskFromMind";
import { createMindAIContext, executeMindAI, type WorryBrainstormOutput } from "@/lib/mindAI";

type Stage = "intake" | "triage" | "partial_split" | "solve" | "accept" | "confirm_task" | "done";

/** A fresh id per worry keeps each thought record/task distinct while retries reuse the same id. */
function generateWorrySessionId(): string {
  return `worry_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function WorryView() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const concernId = params.get("session");
  return <WorryWorkspace key={`${user?.id || "guest"}:${concernId || "standalone"}`} concernId={concernId} />;
}
const pendingWorrySaves = new Set<string>();
function aiConfigSignature() {
  const { provider, model, baseUrl } = getOpConfig("suggest");
  return JSON.stringify({ provider, model, baseUrl });
}

function initialWorry() {
  return {
    sessionId: generateWorrySessionId(), revision: 0, stage: "intake" as Stage, worry: "",
    controlBranch: "actionable" as "actionable" | "partial" | "uncontrollable" | null,
    controllablePart: "", uncontrollablePart: "", problem: "", solutions: [""], chosenSolution: null as number | null,
    taskTitle: "", taskDueDateDays: null as number | null, includePrivate: false, taskDescription: "",
    acceptanceText: "", distressBefore: null as number | null, distressAfter: null as number | null,
    legacySeed: null as MindDraft | null, clarification: "",
  };
}

function WorryWorkspace({ concernId }: { concernId: string | null }) {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const [initial] = useState(() => {
    const read = user?.id && concernId ? readMindSession(user.id, concernId) : null;
    return { ...initialWorry(), worry: read?.ok ? read.value?.text || "" : "" };
  });
  const slot = concernId ? `worry:${concernId}` : "worry";
  const workspace = useWorkspaceDraft(user?.id, slot, initial);
  const workspaceStatus = useRef(workspace);
  workspaceStatus.current = workspace;
  const current = useRef(workspace.value);
  current.current = workspace.value;
  const revision = useRef(workspace.value.revision || 0);
  const mountId = useRef(generateWorrySessionId());
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const saveLock = useRef(false);
  const request = useRef<AbortController | null>(null);
  const [saving, setSaving] = useState(false);
  const [aiPreview, setAiPreview] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<WorryBrainstormOutput | null>(null);
  const { stage, worry, controlBranch, controllablePart, uncontrollablePart, problem, solutions, chosenSolution, taskTitle, taskDueDateDays, acceptanceText, distressBefore, distressAfter, includePrivate, taskDescription, clarification } = workspace.value;
  function update(patch: Partial<ReturnType<typeof initialWorry>>) {
    revision.current++;
    request.current?.abort();
    setAiBusy(false);
    if ("worry" in patch || "problem" in patch || "controlBranch" in patch || "controllablePart" in patch || "uncontrollablePart" in patch) setAiSuggestions(null);
    const next = { ...current.current, ...patch, revision: (current.current.revision || 0) + 1 };
    current.current = next;
    return workspace.setValue(next);
  }
  function field<K extends keyof ReturnType<typeof initialWorry>>(key: K) {
    return (value: ReturnType<typeof initialWorry>[K]) => update({ [key]: value });
  }
  const setStage = field("stage"), setWorry = field("worry"), setControlBranch = field("controlBranch");
  const setControllablePart = field("controllablePart"), setUncontrollablePart = field("uncontrollablePart");
  const setProblem = field("problem"), setSolutions = field("solutions"), setChosenSolution = field("chosenSolution");
  const setTaskTitle = field("taskTitle"), setTaskDueDateDays = field("taskDueDateDays");
  const setAcceptanceText = field("acceptanceText"), setDistressBefore = field("distressBefore"), setDistressAfter = field("distressAfter");
  const { draft: mindDraft, clear: clearMindDraft } = useMindDraft(user?.id);
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !mindDraft?.text || (mindDraft.path && mindDraft.path !== "worry")) return;
    seededRef.current = true;
    if (!current.current.worry) update({ worry: mindDraft.text, legacySeed: mindDraft });
  }, [mindDraft]);
  // Branch: "actionable" | "partial" | "uncontrollable"
  const triageChoice = controlBranch;
  const setTriageChoice = setControlBranch;

  const [aiBusy, setAiBusy] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; request.current?.abort(); };
  }, []);
  useEffect(() => {
    if (workspace.conflict) { revision.current++; request.current?.abort(); setAiBusy(false); }
  }, [workspace.conflict]);
  useRecoverableExit(() => !!worry.trim() && stage !== "done" && (!workspace.durable || workspace.conflict), T("پیش‌نویس کامل محفوظ نیست. پیش از خروج متن را کپی کنید. خارج می‌شوید؟", "The full draft is not safely preserved. Copy your text before leaving. Leave?"), { watchSearch: true });
  function clearSeed() {
    const seed = current.current.legacySeed;
    const latest = getMindDraft(user?.id);
    if (seed && latest && seed.text === latest.text && seed.path === latest.path && seed.updatedAt === latest.updatedAt) clearMindDraft();
  }

  async function aiBrainstorm() {
    if (aiBusy || !user) return;
    if (aiPreview !== aiConfigSignature()) {
      setAiPreview(aiConfigSignature());
      toast.error(T("سرویس تغییر کرده؛ پیش‌نمایش تازه را دوباره تأیید کنید", "Provider changed; confirm the refreshed preview"));
      return;
    }
    const targetProblem = problem.trim() || controllablePart.trim() || worry.trim();
    if (!targetProblem) {
      toast.error(T("اول مسئله را بنویس", "Write the problem first"));
      return;
    }
    setAiPreview(null);
    const controller = new AbortController();
    request.current = controller;
    const input = current.current;
    const inputRevision = revision.current;
    const isCurrent = () => mounted.current && !workspaceStatus.current.conflict && current.current === input && request.current === controller && !controller.signal.aborted && revision.current === inputRevision;
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
          clarification: { value: clarification, provenance: "user_report" },
        },
      });

      const res = await executeMindAI<WorryBrainstormOutput>(ctx, { signal: controller.signal, timeoutMs: 15000, cacheScope: `${user.id}:${input.sessionId}:${inputRevision}:${isEn ? "en" : "fa"}:${mountId.current}:${++requestSequence.current}` });
      if (!isCurrent()) return;
      const d = res.data;
      setAiSuggestions(d);
      toast.success(T("پیشنهادها جدا از نوشته شما آماده است", "Suggestions are ready alongside your writing"));
    } catch (e: any) {
      if (isCurrent()) toast.error(e.message || T("خطا", "Error"));
    } finally {
      if (mounted.current && request.current === controller) setAiBusy(false);
    }
  }

  function proceedToTaskConfirmation() {
    const baseTitle =
      chosenSolution != null && solutions[chosenSolution]
        ? solutions[chosenSolution]
        : problem || controllablePart || worry;
    setTaskTitle(baseTitle.slice(0, 120));
    update({ taskDescription: [worry, controllablePart, problem].filter(Boolean).join("\n\n"), includePrivate: false });
    setStage("confirm_task");
  }

  async function saveConfirmedTask() {
    if (!user || saveLock.current || workspace.conflict) return;
    if (!taskTitle.trim()) {
      toast.error(T("عنوان تسک را مشخص کن", "Please enter task title"));
      return;
    }
    const saveKey = `${user.id}:${current.current.sessionId}`;
    if (pendingWorrySaves.has(saveKey)) { toast.error(T("ذخیره قبلی هنوز در جریان است؛ کمی بعد دوباره تلاش کنید", "The previous save is still running; retry shortly")); return; }
    pendingWorrySaves.add(saveKey);
    saveLock.current = true;
    setSaving(true);
    const snapshot = current.current;
    const inputRevision = revision.current;
    const isCurrent = () => mounted.current && !workspaceStatus.current.conflict && current.current === snapshot && revision.current === inputRevision;
    const recordId = snapshot.sessionId;
    try {
    const savedRecord = await upsertThoughtRecord(user.id, {
      id: recordId,
      user_id: user.id,
      situation: isEn ? `Worry: ${worry}` : `نگرانی: ${worry}`,
      automatic_thought: worry,
      emotions: [isEn ? "Anxiety" : "اضطراب"],
      alternative_thought: chosenSolution != null ? solutions[chosenSolution] || null : null,
      next_step: taskTitle.trim(),
      distortions: [],
    });
    if (!mounted.current) return;
    if (!savedRecord) {
      toast.error(T("رکورد نگرانی ذخیره نشد؛ دوباره تلاش کنید.", "Could not save the worry record; please retry."));
      return;
    }

    const res = await createTaskFromMind({
      id: `task_${recordId}`,
      user_id: user.id,
      title: taskTitle.trim(),
      description: includePrivate ? taskDescription : undefined,
      due_in_days: taskDueDateDays,
      source_type: "worry_tree",
      source_id: recordId,
      priority: "medium",
    });

    if (!mounted.current) return;
    if (res.ok) {
      if (!isCurrent()) { toast.success(T("نسخه قبلی ذخیره شد؛ ویرایش تازه حفظ شد", "Earlier version saved; newer edits preserved")); return; }
      if (!workspace.clear()) { toast.error(T("ذخیره شد، اما پاک‌کردن پیش‌نویس ناموفق بود", "Saved, but draft cleanup failed")); return; }
      clearSeed();
      toast.success(T("نگرانی ذخیره و تسک ساخته شد", "Worry saved and task created"), { action: { label: T("بازکردن", "Open"), onClick: () => navigate(`/app/tasks/${encodeURIComponent(res.task!.id)}`) } });
      setStage("done");
    } else {
      toast.error(T("نگرانی ذخیره شد، اما ساخت تسک ناموفق بود. دوباره تلاش کنید؛ تکراری ساخته نمی‌شود.", "Worry saved, but the task could not be created. Retry; no duplicate will be made."));
    }
    } catch {
      if (mounted.current) toast.error(T("ذخیره ناموفق بود؛ دوباره تلاش کنید", "Save failed; please retry"));
    } finally { pendingWorrySaves.delete(saveKey); saveLock.current = false; if (mounted.current) setSaving(false); }
  }

  async function saveAcceptance() {
    if (!user || saveLock.current || workspace.conflict) return;
    const saveKey = `${user.id}:${current.current.sessionId}`;
    if (pendingWorrySaves.has(saveKey)) { toast.error(T("ذخیره قبلی هنوز در جریان است؛ کمی بعد دوباره تلاش کنید", "The previous save is still running; retry shortly")); return; }
    pendingWorrySaves.add(saveKey);
    saveLock.current = true;
    setSaving(true);
    const snapshot = current.current;
    const savedRevision = revision.current;
    const payload = {
      user_id: user.id,
      situation: isEn ? `Worry: ${worry}` : `نگرانی: ${worry}`,
      automatic_thought: worry,
      emotion_intensity_before: distressBefore,
      emotion_intensity_after: distressAfter,
      emotions: [isEn ? "Anxiety" : "اضطراب"],
      alternative_thought: (stage === "solve" && chosenSolution != null ? solutions[chosenSolution]?.trim() : acceptanceText.trim()) || null,
      distortions: [],
    };

    try {
    const savedId = await upsertThoughtRecord(user.id, { ...payload, id: snapshot.sessionId });
    if (!mounted.current) return;
    if (savedId) {
      if (workspaceStatus.current.conflict || revision.current !== savedRevision || current.current !== snapshot) { toast.success(T("نسخه قبلی ذخیره شد؛ ویرایش تازه حفظ شد", "Earlier version saved; newer edits preserved")); return; }
      if (!workspace.clear()) { toast.error(T("ذخیره شد، اما پاک‌کردن پیش‌نویس ناموفق بود", "Saved, but draft cleanup failed")); return; }
      clearSeed();
      toast.success(T("پذیرش ثبت شد", "Acceptance saved"));
      setStage("done");
    } else {
      toast.error(T("خطا در ذخیره یادداشت پذیرش", "Error saving acceptance record"));
    }
    } catch {
      if (mounted.current) toast.error(T("خطا در ذخیره یادداشت پذیرش", "Error saving acceptance record"));
    } finally { pendingWorrySaves.delete(saveKey); saveLock.current = false; if (mounted.current) setSaving(false); }
  }

  /** Deliberately begin a brand-new worry: new session id + full state reset. */
  function resetForNewWorry() {
    if (saveLock.current) return;
    if (!workspace.clear()) { toast.error(T("پاک‌کردن پیش‌نویس ناموفق بود", "Draft cleanup failed")); return; }
    update({ ...initialWorry(), controlBranch: null });
    setAiSuggestions(null);
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="page-shell page-shell--narrow space-y-5 animate-fade-in"
    >
      <Button variant="ghost" size="sm" onClick={() => navigate("/app/mind")}>
        <BackIcon className={`w-4 h-4 ${isEn ? "me-1" : "ms-1"}`} /> {T("ذهن", "Mind")}
      </Button>

      {/* Header Banner */}
      <div className="surface-card p-4 sm:p-5">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
          <Brain className="w-4 h-4" />
          {T("درخت نگرانی و حل مسئله", "Worry Tree & Problem Solving")}
        </div>
        <HeaderTitlePortal title={T("حل نگرانی", "Worry")} />
        <p className="text-sm text-muted-foreground leading-7">
          {T(
            "۳ مسیر تفکیک: دغدغه قابل اقدام، موضوع با کنترل نسبی، یا خارج از کنترل. ذهن با تفکیک عینی از نشخوار فکری رها می‌شود.",
            "3 pathways: actionable worry, partially controllable, or currently uncontrollable. Break the rumination loop."
          )}
        </p>
      </div>

      {worry.trim() && stage !== "done" && <div role="status" className="text-sm text-muted-foreground">
        {workspace.conflict ? T("نسخه دیگری موجود است؛ ویرایش شما حفظ شده", "Another draft exists; your edits are preserved") : workspace.durable ? T("پیش‌نویس روی این دستگاه محفوظ است؛ هنوز در حساب ثبت نشده", "Draft preserved on this device; not yet saved to your account") : T("پیش‌نویس فقط در حافظه است؛ متن را پیش از خروج کپی کنید", "Draft is only in memory; copy your text before leaving")}
        <ConcernNav ownerId={user?.id} concernId={concernId} toolId="worry" slot={slot} />
        <DraftPrivacy {...workspace} />
        <DraftConflictNotice conflict={workspace.conflict} acceptRemote={() => { revision.current++; request.current?.abort(); setAiSuggestions(null); workspace.acceptRemote(); }} keepLocal={workspace.keepLocal} />
      </div>}

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
                  onClick={() => setAiPreview(aiConfigSignature())}
                  disabled={aiBusy}
                >
                  {aiBusy ? (
                    <Loader2 className="w-3.5 h-3.5 ms-1 animate-spin" />
                  ) : (
                    <Sparkles className="w-3.5 h-3.5 ms-1 text-primary" />
                  )}
                  {T("ایده‌پردازی با AI (اختیاری)", "Brainstorm with AI (Optional)")}
                </Button>
                {aiBusy && <Button variant="ghost" onClick={() => { request.current?.abort(); request.current = null; setAiBusy(false); }}>{T("لغو انتظار؛ پردازش سرویس ممکن است ادامه یابد", "Cancel waiting; provider processing may continue")}</Button>}
              </div>
            </div>
            {aiPreview && <div role="dialog" aria-label={T("پیش‌نمایش ارسال AI", "AI sending preview")} className="space-y-2 rounded-lg border p-3">
              <p>{T("فقط متن و پاسخ‌های این جلسه ارسال می‌شود؛ زمینه عمومی اضافه نمی‌شود.", "Only this session's text and answers are sent; no general personalization is added.")}</p>
              <p>{getOpConfig("suggest").provider} / {getOpConfig("suggest").model}</p>
              <pre className="whitespace-pre-wrap text-sm">{JSON.stringify({ worry, control_level: controlBranch || "uncontrollable", controllable_part: controllablePart, uncontrollable_part: uncontrollablePart, problem: problem.trim() || controllablePart.trim() || worry.trim(), clarification }, null, 2)}</pre>
              <Button onClick={aiBrainstorm}>{T("با ارسال این متن موافقم", "I agree to send this text")}</Button><Button variant="ghost" onClick={() => setAiPreview(null)}>{T("بدون ارسال ادامه می‌دهم", "Continue without sending")}</Button>
            </div>}
            {aiSuggestions && <div className="rounded-lg border p-3 space-y-3">
              <h3>{T("برداشت احتمالی AI، نه تصمیم شما", "Possible AI interpretation, not your decision")}</h3>
              <p>{T("برداشت از حدود کنترل:", "Possible control level:")} {aiSuggestions.control_level_recognized}</p>
              {aiSuggestions.clarifying_question && <div><Label htmlFor="worry-clarification">{aiSuggestions.clarifying_question}</Label><Textarea id="worry-clarification" value={clarification} onChange={(e) => update({ clarification: e.target.value })} /><p className="text-xs text-muted-foreground">{T("پاسخ اختیاری است و در درخواست بعدی با پیش‌نمایش ارسال می‌شود", "Answer is optional and included in the next previewed request")}</p></div>}
              {aiSuggestions.suggested_options.map(option => <div key={option.id} className="space-y-1"><p>{option.title}</p><p className="text-xs text-muted-foreground">{option.isWithinUserControl ? T("احتمالاً در کنترل شما", "Possibly within your control") : T("حدود کنترل نیاز به بررسی دارد", "Control boundaries need review")} · {T("تلاش تخمینی:", "Estimated effort:")} {option.estimatedEffort || T("نامعلوم", "Unknown")}</p><Button variant="outline" onClick={() => { const next = [...current.current.solutions, option.title]; update({ solutions: next, chosenSolution: next.length - 1 }); }}>{T("افزودن و انتخاب، بدون جایگزینی نوشته", "Append and choose, without replacing writing")}</Button></div>)}
              {aiSuggestions.acceptance_note && <p>{aiSuggestions.acceptance_note}</p>}
            </div>}

            {chosenSolution != null && solutions[chosenSolution] && (
              <div className="pt-2">
                <Button onClick={proceedToTaskConfirmation} size="lg" className="w-full">
                  {T("بررسی و تایید قبل از ساخت تسک", "Review & Confirm Task")}
                </Button>
              </div>
            )}
            <Button variant="outline" disabled={saving || workspace.conflict} onClick={saveAcceptance}>{T("فعلاً کافی است؛ ثبت بدون ساخت تسک", "Enough for now; save without a task")}</Button>

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
              <Label className="font-semibold text-sm">{T("تاریخ انجام", "Date")}</Label>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant={taskDueDateDays === null ? "default" : "outline"} onClick={() => setTaskDueDateDays(null)}>{T("بدون موعد", "No due date")}</Button>
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

            <label className="flex gap-2"><input type="checkbox" checked={includePrivate} onChange={(e) => update({ includePrivate: e.target.checked })} />{T("متن خصوصی را هم در جزئیات تسک کپی کن", "Also copy private text into task details")}</label>
            {includePrivate && <Textarea aria-label={T("جزئیات خصوصی", "Private details")} value={taskDescription} onChange={(e) => update({ taskDescription: e.target.value })} />}
            <p className="text-xs text-muted-foreground">{T("مقصد: کارها. پیش‌فرض بدون موعد و بدون جزئیات خصوصی؛ عنوان را هم بازبینی کنید.", "Destination: Tasks. Defaults: no due date and no private details; also review the title.")}</p>
            <div className="flex gap-2 pt-2">
              <Button onClick={saveConfirmedTask} size="lg" className="w-full" disabled={saving || workspace.conflict}>
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
              <Button onClick={saveAcceptance} disabled={saving || workspace.conflict}>
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
              <Button onClick={resetForNewWorry}>
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
