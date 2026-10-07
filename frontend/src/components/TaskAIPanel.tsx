import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Sparkles, Loader2, Send, Check, Timer } from "lucide-react";
import PomodoroTimer from "@/components/PomodoroTimer";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { callAI, getAILanguage, type AILanguage } from "@/lib/ai";
import { AILangToggle } from "@/components/AILangToggle";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeTaskPriority, PRIORITY_META, type Priority } from "@/lib/priority";
import { describeRule, type RecurrenceRule } from "@/lib/recurrence";
import { formatTaskDueDateDisplay, taskWorkDate, workDatePatch } from "@/lib/taskDate";
import { compactTasksForAI, readSchedule, scheduleFromDateValue, scheduleLabel as getScheduleLabel } from "@/lib/taskSchedule";
import { getTimeSettings } from "@/lib/timeHorizon";
import { hasExplicitRecurrenceText, parseNaturalDate } from "@/lib/nlDate";
import { persistTask, type TaskPersistenceStatus } from "@/lib/firestoreDataService";
import type { Task } from "@/lib/taskTypes";

type TaskLite = {
  id: string; title: string; description?: string | null;
  priority: Priority; due_date?: string | null; work_date?: string | null; schedule_v?: number | null;
  recurrence_rule?: RecurrenceRule | null; planning_horizon?: Task["planning_horizon"];
  planning_start?: string | null; planning_end?: string | null; planning_calendar?: Task["planning_calendar"];
};
type MetadataProposal = {
  title?: string;
  small_step?: string;
  if_then?: { if: string; then: string };
  priority?: Priority;
  work_date?: string | null;
  recurrence_rule?: RecurrenceRule;
  reason?: string;
  schedule_reason?: string;
};

type ClarifyQ = { question: string; options: string[] };

const WEEKDAYS = new Set(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);
function explicitRecurrenceRule(text: string, value: unknown): RecurrenceRule | undefined {
  if (!hasExplicitRecurrenceText(text) || !value || typeof value !== "object") return undefined;
  const rule = value as Record<string, unknown>;
  if (!["daily", "weekly", "monthly", "yearly"].includes(String(rule.freq))) return undefined;
  if (!Number.isInteger(rule.interval) || (rule.interval as number) < 1 || (rule.interval as number) > 365) return undefined;
  if (rule.byweekday !== undefined && (!Array.isArray(rule.byweekday) || rule.byweekday.length < 1 || rule.byweekday.length > 7 ||
    rule.byweekday.some((day) => typeof day !== "string" || !WEEKDAYS.has(day)) || new Set(rule.byweekday).size !== rule.byweekday.length)) return undefined;
  if (rule.byhour !== undefined && (!Number.isInteger(rule.byhour) || (rule.byhour as number) < 0 || (rule.byhour as number) > 23)) return undefined;
  if (rule.byminute !== undefined && (!Number.isInteger(rule.byminute) || (rule.byminute as number) < 0 || (rule.byminute as number) > 59)) return undefined;
  if (rule.byminute !== undefined && rule.byhour === undefined) return undefined;
  return {
    freq: rule.freq as RecurrenceRule["freq"],
    interval: rule.interval as number,
    ...(rule.byweekday ? { byweekday: rule.byweekday as RecurrenceRule["byweekday"] } : {}),
    ...(rule.byhour !== undefined ? { byhour: rule.byhour as number } : {}),
    ...(rule.byminute !== undefined ? { byminute: rule.byminute as number } : {}),
  };
}

function newSuggestedTaskId() {
  return `task_ai_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}`;
}

export function TaskAIPanel({
  task, open, onOpenChange, onMetaApplied, onApplyPatch,
}: {
  task: TaskLite;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onMetaApplied?: () => void;
  onApplyPatch: (patch: Partial<Task>) => Promise<TaskPersistenceStatus>;
}) {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const scheduleBeforeLabel = getScheduleLabel(readSchedule(task as Partial<Task>), getTimeSettings(), isEn ? "en" : "fa")
    || T("بدون برنامه", "Unscheduled");
  const [tab, setTab] = useState("subtasks");
  const [globalCtx, setGlobalCtx] = useState(false);
  const [loading, setLoading] = useState(false);
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const activeScopeRef = useRef("");
  const activeUserIdRef = useRef<string | null>(null);
  const activeTaskIdRef = useRef(task.id);
  const requestIdRef = useRef(0);
  activeScopeRef.current = `${open ? "open" : "closed"}:${user?.id || "anonymous"}:${task.id}`;
  activeUserIdRef.current = user?.id || null;
  activeTaskIdRef.current = task.id;

  const beginRequest = () => ({ id: ++requestIdRef.current, scope: activeScopeRef.current, userId: user?.id || null, taskId: task.id });
  const isCurrentRequest = (request: { id: number; scope: string; userId: string | null; taskId: string }) =>
    request.id === requestIdRef.current && request.scope === activeScopeRef.current &&
    request.userId === activeUserIdRef.current && request.taskId === activeTaskIdRef.current;

  // Subtasks
  const [subSugs, setSubSugs] = useState<string[]>([]);
  const [subPicked, setSubPicked] = useState<Record<number, boolean>>({});
  const subtaskIdsRef = useRef<string[]>([]);
  const [questions, setQuestions] = useState<ClarifyQ[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});

  // Metadata
  const [meta, setMeta] = useState<MetadataProposal | null>(null);
  const [applying, setApplying] = useState(false);
  const smallStepIdRef = useRef<string | null>(null);

  // Chat
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    requestIdRef.current += 1;
    setLoading(false);
    setGlobalCtx(false);
    setSubSugs([]); setSubPicked({}); setQuestions([]); setAnswers({});
    setMeta(null); setChat([]); setChatInput("");
    subtaskIdsRef.current = [];
    smallStepIdRef.current = null;
  }, [open, user?.id, task.id]);

  const buildContext = async (request: ReturnType<typeof beginRequest>): Promise<string | null> => {
    const taskSnapshot = task;
    let ctx = `Current task:\nTitle: ${taskSnapshot.title}\nDescription: ${taskSnapshot.description || "(none)"}\nPriority: ${taskSnapshot.priority}\nDate: ${taskWorkDate(taskSnapshot) || "(none)"}\nRecurrence: ${describeRule(taskSnapshot.recurrence_rule || null, true)}`;
    if (globalCtx && request.userId) {
      const { data: rows, error } = await firebaseStore.from("tasks")
        .select("id,title,priority,completed,work_date,due_date,schedule_v,planning_horizon,planning_start,planning_end,planning_calendar,schedule_timezone,user_id,source_type")
        .eq("user_id", request.userId).limit(40);
      if (error) throw error;
      if (!isCurrentRequest(request)) return null;
      const tasks = (rows || []).filter((row: Partial<Task>) => row.user_id === request.userId && !row.source_type && row.id !== taskSnapshot.id);
      ctx += `\n\nOther selected work tasks (titles and schedule only): ${JSON.stringify(compactTasksForAI(tasks))}`;
    }
    return ctx;
  };

  // ====== Subtasks ======
  const genSubtasks = async (extra?: string) => {
    const request = beginRequest();
    setLoading(true);
    try {
      const ctx = await buildContext(request);
      if (!ctx || !isCurrentRequest(request)) return;
      const promptInput = extra
        ? `Task: "${task.title}"\nClarifications:\n${extra}`
        : `Task: "${task.title}"`;
      const r = await callAI("task_subtasks", promptInput, ctx, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      const d = r.data;
      if (d?.mode === "questions" && d.questions?.length) {
        setQuestions(d.questions);
        setSubSugs([]); setSubPicked({});
        subtaskIdsRef.current = [];
      } else {
        const suggestions: string[] = Array.isArray(d?.subtasks) ? d.subtasks : [];
        subtaskIdsRef.current = suggestions.map(() => newSuggestedTaskId());
        setSubSugs(suggestions);
        setSubPicked(Object.fromEntries(suggestions.map((_: string, i: number) => [i, true])));
        setQuestions([]);
      }
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const submitAnswers = () => {
    const ans = questions.map((q, i) => `${q.question}: ${answers[i] || "—"}`).join("\n");
    genSubtasks(ans);
  };

  const addPickedSubtasks = async () => {
    if (!user || applying) return;
    const ownerId = user.id;
    const taskId = task.id;
    const picked = subSugs.map((title, index) => ({ title, index })).filter(({ index }) => subPicked[index]);
    if (!picked.length) return toast.error(T("چیزی انتخاب نشده", "Nothing selected"));
    setApplying(true);
    try {
      const results: TaskPersistenceStatus[] = [];
      for (const { title, index } of picked) {
        if (activeUserIdRef.current !== ownerId || activeTaskIdRef.current !== taskId || !open) return;
        results.push(await persistTask(ownerId, {
          // Keep one ID per proposal row so a partial failure can be retried safely.
          id: subtaskIdsRef.current[index] || (subtaskIdsRef.current[index] = newSuggestedTaskId()),
          user_id: ownerId, title, parent_id: taskId, priority: "none", status: "todo", completed: false,
        }));
        if (activeUserIdRef.current !== ownerId || activeTaskIdRef.current !== taskId) return;
      }
      if (results.some((result) => result === "failed")) throw new Error(T("برخی زیرتسک‌ها ذخیره نشدند", "Some subtasks could not be saved"));
      toast.success(results.some((result) => result === "queued")
        ? T(`${picked.length} زیرتسک برای همگام‌سازی صف شد`, `${picked.length} subtasks queued to sync`)
        : T(`${picked.length} زیرتسک اضافه شد ✨`, `${picked.length} subtasks added ✨`));
      setSubSugs([]); setSubPicked({});
      subtaskIdsRef.current = [];
      if (activeUserIdRef.current === ownerId && activeTaskIdRef.current === taskId) onMetaApplied?.();
    } catch (error: any) {
      if (activeUserIdRef.current === ownerId && activeTaskIdRef.current === taskId) toast.error(error?.message || T("ذخیره نشد", "Could not save"));
    }
    finally { setApplying(false); }
  };

  // ====== Metadata ======
  const suggestMeta = async () => {
    const request = beginRequest();
    setLoading(true);
    try {
      const ctx = await buildContext(request);
      if (!ctx || !isCurrentRequest(request)) return;
      const r = await callAI("task_metadata_suggest",
        `Title: ${task.title}\nDescription: ${task.description || ""}`, ctx, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      const data = r.data || {};
      const intent = data.if_then && typeof data.if_then.if === "string" && typeof data.if_then.then === "string"
        ? { if: data.if_then.if.trim(), then: data.if_then.then.trim() }
        : undefined;
      const taskText = `${task.title} ${task.description || ""}`;
      const explicitWorkDate = hasExplicitRecurrenceText(taskText) ? null : parseNaturalDate(taskText).dueDate;
      const modelWorkDate = typeof data.work_date === "string" ? data.work_date : typeof data.due_date === "string" ? data.due_date : null;
      const matchingModelDate = explicitWorkDate && modelWorkDate && (
        explicitWorkDate === modelWorkDate || (explicitWorkDate.includes("T") && !Number.isNaN(Date.parse(modelWorkDate)) &&
          Date.parse(explicitWorkDate) === Date.parse(modelWorkDate))
      );
      setMeta({
        title: typeof data.title === "string" ? data.title.trim() : undefined,
        small_step: typeof data.small_step === "string" ? data.small_step.trim() : undefined,
        if_then: intent,
        priority: data.priority ? normalizeTaskPriority(data.priority) : undefined,
        // A proposal can only set a schedule parsed from an explicit day or clock
        // in the task text. AI context alone cannot invent a calendar day.
        work_date: explicitWorkDate && (!modelWorkDate || matchingModelDate) ? explicitWorkDate : undefined,
        // Only accept a well-formed recurrence proposal when the user's own task text
        // explicitly says it repeats. Otherwise the current recurrence remains untouched.
        recurrence_rule: explicitRecurrenceRule(taskText, data.recurrence_rule),
        reason: typeof data.reason === "string" ? data.reason : undefined,
        schedule_reason: typeof data.schedule_reason === "string" ? data.schedule_reason : undefined,
      });
      smallStepIdRef.current = typeof data.small_step === "string" && data.small_step.trim()
        ? newSuggestedTaskId()
        : null;
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const applyMeta = async () => {
    if (!meta || applying) return;
    const request = beginRequest();
    const patch: Partial<Task> = {};
    const title = meta.title?.trim();
    if (title && title !== task.title) patch.title = title;
    if (meta.priority) patch.priority = meta.priority;
    if (meta.work_date) {
      // `meta.work_date` is the immutable, text-validated schedule snapshot shown
      // to the user. Do not re-resolve relative words like “tomorrow” at apply time.
      if (scheduleFromDateValue(meta.work_date).kind !== "none") Object.assign(patch, workDatePatch(task, meta.work_date));
    }
    if (meta.recurrence_rule) patch.recurrence_rule = meta.recurrence_rule;
    if (meta.if_then?.if && meta.if_then.then) patch.implementation_intention = meta.if_then;
    if (!Object.keys(patch).length) return toast.error(T("پیشنهاد قابل اعمالی وجود ندارد", "There are no applicable suggestions"));
    setApplying(true);
    try {
      const result = await onApplyPatch(patch);
      if (!isCurrentRequest(request)) return;
      if (result === "failed") throw new Error(T("ذخیره انجام نشد", "The changes were not saved"));
      toast.success(result === "queued" ? T("برای همگام‌سازی صف شد", "Queued to sync") : T("اعمال شد ✨", "Applied ✨"));
      onMetaApplied?.();
      setMeta(null);
    } catch (error: any) {
      if (isCurrentRequest(request)) toast.error(error?.message || T("ذخیره انجام نشد", "The changes were not saved"));
    } finally { if (isCurrentRequest(request)) setApplying(false); }
  };

  const addSuggestedStep = async () => {
    if (!user || !meta?.small_step?.trim() || applying) return;
    const request = beginRequest();
    const ownerId = user.id;
    setApplying(true);
    try {
      const id = smallStepIdRef.current || (smallStepIdRef.current = newSuggestedTaskId());
      const result = await persistTask(ownerId, {
        id, user_id: ownerId, title: meta.small_step.trim(), description: null,
        parent_id: task.id, priority: "none", status: "todo", completed: false,
      });
      if (!isCurrentRequest(request)) return;
      if (result === "failed") throw new Error(T("زیرتسک ذخیره نشد", "The subtask was not saved"));
      toast.success(result === "queued" ? T("زیرتسک برای همگام‌سازی صف شد", "Subtask queued to sync") : T("گام بعدی اضافه شد", "Next step added"));
      onMetaApplied?.();
      smallStepIdRef.current = null;
      setMeta((current) => current ? { ...current, small_step: undefined } : null);
    } catch (error: any) { if (isCurrentRequest(request)) toast.error(error?.message || T("ذخیره نشد", "Could not save")); }
    finally { if (isCurrentRequest(request)) setApplying(false); }
  };

  // ====== Note generation ======
  const genNote = async () => {
    if (!user) return;
    const request = beginRequest();
    const ownerId = user.id;
    const taskId = task.id;
    setLoading(true);
    try {
      const ctx = await buildContext(request);
      if (!ctx || !isCurrentRequest(request)) return;
      const r = await callAI("generate_note", task.title, ctx, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      const { error } = await firebaseStore.from("notes").insert({
        user_id: ownerId, task_id: taskId, title: task.title, content: r.text,
      });
      if (error) throw error;
      if (!isCurrentRequest(request)) return;
      toast.success(T("نوت برای این تسک ساخته شد ✨", "Note created for this task ✨"));
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  // ====== Chat ======
  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const request = beginRequest();
    const newMsg = { role: "user" as const, content: chatInput };
    setChat((c) => [...c, newMsg]);
    setChatInput("");
    setLoading(true);
    try {
      const ctx = await buildContext(request);
      if (!ctx || !isCurrentRequest(request)) return;
      const r = await callAI("task_chat", [...chat, newMsg], ctx, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      setChat((c) => [...c, { role: "assistant", content: r.text }]);
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> {T("AI برای این تسک", "AI for this task")}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-lg border bg-accent/20">
            <Label htmlFor="global-ctx" className="text-sm cursor-pointer flex-1">
              🌐 {T("افزودن عنوان و برنامهٔ کارهای عادی من به زمینه", "Include my regular task titles and schedules as context")}
            </Label>
            <Switch id="global-ctx" checked={globalCtx} onCheckedChange={(checked) => {
              requestIdRef.current += 1;
              setLoading(false);
              setGlobalCtx(checked);
            }} />
          </div>
          <p className="px-2 text-[11px] text-muted-foreground">
            {T("فقط با انتخاب تو خوانده می‌شود؛ نوت‌ها، خاطرات روزانه و اطلاعات بخش ذهن وارد زمینه نمی‌شوند.", "Read only after your choice. Notes, diary entries, and Mind data are excluded.")}
          </p>
          <div className="flex items-center justify-between p-2 rounded-lg border bg-accent/20">
            <span className="text-sm">{T("زبان پاسخ AI", "AI response language")}</span>
            <AILangToggle value={aiLang} onChange={setAiLang} />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab} className="mt-3">
          <TabsList className="grid grid-cols-5 w-full">
            <TabsTrigger value="subtasks">{T("مراحل", "Steps")}</TabsTrigger>
            <TabsTrigger value="meta">{T("پیشنهاد", "Suggest")}</TabsTrigger>
            <TabsTrigger value="note">{T("نوت", "Note")}</TabsTrigger>
            <TabsTrigger value="pomodoro"><Timer className="w-3.5 h-3.5" /></TabsTrigger>
            <TabsTrigger value="chat">{T("چت", "Chat")}</TabsTrigger>
          </TabsList>

          <TabsContent value="pomodoro" className="mt-4">
            <PomodoroTimer taskId={task.id} taskTitle={task.title} compact />
            <p className="text-[11px] text-muted-foreground text-center mt-3">
              {T("زمان ثبت‌شده زیر این تسک حساب می‌شود.", "Logged time is counted under this task.")}
            </p>
          </TabsContent>

          {/* Subtasks */}
          <TabsContent value="subtasks" className="space-y-3 mt-4">
            <Button onClick={() => genSubtasks()} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {T("تولید مراحل (Subtasks)", "Generate steps (Subtasks)")}
            </Button>

            {questions.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{T("برای پیشنهاد بهتر، لطفاً پاسخ بدید:", "For a better suggestion, please answer:")}</p>
                {questions.map((q, i) => (
                  <Card key={i} className="p-3 space-y-2">
                    <p className="text-sm font-medium">{q.question}</p>
                    <div className="flex flex-wrap gap-1">
                      {q.options.map((o) => (
                        <button key={o} type="button"
                          onClick={() => setAnswers((a) => ({ ...a, [i]: o }))}
                          className={`text-xs px-2 py-1 rounded border transition ${answers[i] === o ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"}`}>
                          {o}
                        </button>
                      ))}
                    </div>
                  </Card>
                ))}
                <Button onClick={submitAnswers} disabled={loading} className="w-full" variant="secondary">
                  {T("ارسال پاسخ‌ها", "Send answers")}
                </Button>
              </div>
            )}

            {subSugs.length > 0 && (
              <div className="space-y-2">
                {subSugs.map((s, i) => (
                  <Card key={i} className="p-2 flex gap-2 items-start cursor-pointer hover:bg-accent/30"
                    onClick={() => setSubPicked((p) => ({ ...p, [i]: !p[i] }))}>
                    <Checkbox checked={subPicked[i] || false} className="mt-0.5" />
                    <p className="text-sm flex-1">{s}</p>
                  </Card>
                ))}
                <Button onClick={addPickedSubtasks} className="w-full">
                  {T("افزودن انتخاب‌شده‌ها", "Add selected")}
                </Button>
              </div>
            )}
          </TabsContent>

          {/* Meta */}
          <TabsContent value="meta" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">{T("AI عنوان روشن‌تر، گام بعدی، اولویت و برنامهٔ پیشنهادی را آماده می‌کند. هیچ تغییری تا انتخاب شما ذخیره نمی‌شود.", "AI drafts a clearer title, next step, priority, and schedule. Nothing is saved until you choose an action.")}</p>
            <Button onClick={suggestMeta} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {T("پیشنهاد بگیر", "Suggest")}
            </Button>
            {meta && (
              <Card className="p-3 space-y-2">
                {meta.title && meta.title !== task.title && (
                  <div className="text-sm"><span className="text-muted-foreground">{T("عنوان پیشنهادی:", "Suggested title:")}</span> {meta.title}</div>
                )}
                {meta.priority && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">{T("اولویت:", "Priority:")}</span>
                    <span className={PRIORITY_META[normalizeTaskPriority(meta.priority)].textClass}>
                      {PRIORITY_META[normalizeTaskPriority(meta.priority)].emoji} {T(PRIORITY_META[normalizeTaskPriority(meta.priority)].label, PRIORITY_META[normalizeTaskPriority(meta.priority)].labelEn)}
                    </span>
                  </div>
                )}
                {meta.work_date && (
                  <div className="text-sm space-y-1">
                    <div><span className="text-muted-foreground">{T("اثر روی برنامه:", "Schedule change:")}</span> {scheduleBeforeLabel} → {formatTaskDueDateDisplay(meta.work_date, isEn, 2) || meta.work_date}</div>
                    {meta.schedule_reason && <p className="text-xs text-muted-foreground">{meta.schedule_reason}</p>}
                  </div>
                )}
                {meta.small_step && <div className="text-sm"><span className="text-muted-foreground">{T("گام کوچک بعدی:", "Next small step:")}</span> {meta.small_step}</div>}
                {meta.if_then && <div className="text-sm"><span className="text-muted-foreground">{T("اگر–آنگاه:", "If–then:")}</span> {T("اگر", "If")} {meta.if_then.if}، {T("آنگاه", "then")} {meta.if_then.then}</div>}
                {meta.recurrence_rule && (
                  <div className="text-sm"><span className="text-muted-foreground">{T("تکرار:", "Repeat:")}</span> {describeRule(meta.recurrence_rule, isEn)}</div>
                )}
                {meta.reason && <p className="text-xs text-muted-foreground italic">💡 {meta.reason}</p>}
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Button onClick={applyMeta} disabled={applying} className="gap-2" size="sm">
                    {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {T("اعمال پیشنهادها", "Apply suggestions")}
                  </Button>
                  {meta.small_step && <Button onClick={addSuggestedStep} disabled={applying || !user} variant="outline" size="sm">{T("افزودن گام به‌عنوان زیرتسک", "Add step as subtask")}</Button>}
                </div>
              </Card>
            )}
          </TabsContent>

          {/* Note */}
          <TabsContent value="note" className="space-y-3 mt-4">
            <p className="text-sm text-muted-foreground">{T("یک نوت کامل برای این تسک تولید می‌کند.", "Generates a full note for this task.")}</p>
            <Button onClick={genNote} disabled={loading} className="w-full gap-2">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {T("تولید نوت", "Generate note")}
            </Button>
          </TabsContent>

          {/* Chat */}
          <TabsContent value="chat" className="mt-4 flex flex-col h-[55vh]">
            <div className="flex-1 overflow-y-auto space-y-2 mb-2 pe-1">
              {chat.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">{T("درباره این تسک سوال بپرس", "Ask about this task")}</p>}
              {chat.map((m, i) => (
                <div key={i} className={`p-2 rounded-lg text-sm ${m.role === "user" ? "bg-primary/10 ms-6" : "bg-muted me-6"}`}>
                  <div className="prose-note text-xs">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                  </div>
                </div>
              ))}
              {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
            </div>
            <div className="flex gap-2">
              <Input value={chatInput} onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={T("بپرس...", "Ask...")} />
              <Button size="icon" onClick={sendChat} disabled={loading}><Send className="w-4 h-4" /></Button>
            </div>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
