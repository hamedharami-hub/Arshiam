import { useEffect, useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Send, Loader2, CalendarDays, ListFilter, Mic, MicOff, X } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { callAI, getAILanguage, type AILanguage } from "@/lib/ai";
import { AILangToggle } from "@/components/AILangToggle";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBilingual } from "@/hooks/useBilingual";
import { normalizeTaskPriority } from "@/lib/priority";
import { persistTask } from "@/lib/firestoreDataService";
import { parseNaturalDate } from "@/lib/nlDate";
import { workDatePatch } from "@/lib/taskDate";
import { getTimeSettings, periodFor, todayISO } from "@/lib/timeHorizon";
import { isOverdueFixedSchedule, parseExplicitWorkDate, safeInboxTasks, safeScheduledTasks, taskScheduleLabel, taskScheduledStart, parseTaskListDrafts, validateInboxSortProposal, type TaskListDraft } from "@/lib/aiTaskPlanning";
import { saveTaskListSort } from "@/lib/taskListSort";
import { SORT_LABELS, type SortLevel } from "@/lib/smartListService";
import type { Task } from "@/lib/taskTypes";

type SuggestedTask = { id: string; title: string; description?: string; priority: "none" | "low" | "medium" | "high" | "urgent" };
type OwnedTaskDraft = TaskListDraft & { id: string };
type ScopeSortProposal = {
  ownerId: string;
  primary: SortLevel;
  secondary: SortLevel;
  reason: string;
  analyzedCount: number;
  matchedCount: number;
  truncated: boolean;
};

type SpeechResultEvent = { resultIndex?: number; results: ArrayLike<{ isFinal: boolean; 0?: { transcript?: string } }> };
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

function newTaskId() {
  return `task_ai_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}`;
}

function parseTaskSuggestions(value: unknown): Omit<SuggestedTask, "id">[] | null {
  if (!value || typeof value !== "object") return null;
  const response = value as Record<string, unknown>;
  if (Object.keys(response).some((key) => key !== "items")) return null;
  const items = response.items;
  if (!Array.isArray(items) || items.length < 1 || items.length > 20) return null;
  const priorities = new Set(["none", "low", "medium", "high", "urgent"]);
  const parsed: Omit<SuggestedTask, "id">[] = [];
  const seen = new Set<string>();
  for (const item of items) {
    if (!item || typeof item !== "object") return null;
    const row = item as Record<string, unknown>;
    if (Object.keys(row).some((key) => key !== "title" && key !== "description" && key !== "priority")) return null;
    const title = typeof row.title === "string" ? row.title.trim().slice(0, 240) : "";
    if (!title || typeof row.priority !== "string" || !priorities.has(row.priority)) return null;
    if (row.description !== undefined && typeof row.description !== "string") return null;
    const key = title.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const description = typeof row.description === "string" ? row.description.trim().slice(0, 1200) : "";
    parsed.push({ title, ...(description ? { description } : {}), priority: row.priority as SuggestedTask["priority"] });
  }
  return parsed.length ? parsed : null;
}

export function AIPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { T, isEn } = useBilingual();
  const [tab, setTab] = useState("create");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [taskDrafts, setTaskDrafts] = useState<OwnedTaskDraft[]>([]);
  const [taskDraftPicked, setTaskDraftPicked] = useState<Record<string, boolean>>({});
  const taskDraftOwnerRef = useRef<string | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const suggestionOwnerRef = useRef<string | null>(null);
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const [lastResultMeta, setLastResultMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const activeScopeRef = useRef("");
  const requestIdRef = useRef(0);
  const [taskContext, setTaskContext] = useState<{ ownerId: string; label: string; context: string } | null>(null);
  const [sortProposal, setSortProposal] = useState<ScopeSortProposal | null>(null);

  activeUserIdRef.current = user?.id || null;
  activeScopeRef.current = `${user?.id || "anonymous"}:${open ? "open" : "closed"}`;

  useEffect(() => {
    requestIdRef.current += 1;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setInput("");
    setChatInput("");
    setTaskDrafts([]);
    setTaskDraftPicked({});
    taskDraftOwnerRef.current = null;
    setSuggestions([]);
    setPicked({});
    suggestionOwnerRef.current = null;
    setChat([]);
    setTaskContext(null);
    setSortProposal(null);
    setLastResultMeta(null);
    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (open) return;
    requestIdRef.current += 1;
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  }, [open]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  const startVoiceCapture = () => {
    const Speech = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
    if (!Speech) {
      toast.error(T("تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود", "Speech recognition is not supported in this browser"));
      return;
    }
    recognitionRef.current?.stop();
    const recognition = new Speech();
    recognition.lang = aiLang === "en" || (aiLang === "auto" && isEn) ? "en-US" : "fa-IR";
    recognition.interimResults = false;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const transcript = Array.from({ length: Math.max(0, event.results.length - (event.resultIndex || 0)) }, (_, index) => event.results[index + (event.resultIndex || 0)])
        .filter((result) => result?.isFinal)
        .map((result) => result?.[0]?.transcript || "")
        .join(" ")
        .trim();
      if (transcript) setInput((current) => `${current.trim()}${current.trim() ? "\n" : ""}${transcript}`);
    };
    recognition.onerror = () => {
      setListening(false);
      recognitionRef.current = null;
      toast.error(T("گفتار دریافت نشد؛ دوباره تلاش کن", "Speech input failed; try again"));
    };
    recognition.onend = () => {
      setListening(false);
      if (recognitionRef.current === recognition) recognitionRef.current = null;
    };
    recognitionRef.current = recognition;
    setListening(true);
    try { recognition.start(); }
    catch {
      recognitionRef.current = null;
      setListening(false);
      toast.error(T("شروع دریافت گفتار ممکن نشد", "Could not start speech recognition"));
    }
  };

  const stopVoiceCapture = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
  };

  const beginRequest = () => ({ id: ++requestIdRef.current, scope: activeScopeRef.current, ownerId: user?.id || null });
  const isCurrentRequest = (request: { id: number; scope: string; ownerId: string | null }) =>
    request.id === requestIdRef.current && request.scope === activeScopeRef.current &&
    (!request.ownerId || request.ownerId === activeUserIdRef.current);

  const responseData = (response: unknown): unknown => {
    if (!response || typeof response !== "object") return null;
    const result = response as { data?: unknown; text?: string };
    if (result.data && typeof result.data === "object") return result.data;
    const text = (result.text || "").trim();
    const candidates = [text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")];
    const objectStart = text.indexOf("{");
    const objectEnd = text.lastIndexOf("}");
    if (objectStart >= 0 && objectEnd > objectStart) candidates.push(text.slice(objectStart, objectEnd + 1));
    for (const candidate of candidates) {
      try { return JSON.parse(candidate); } catch { /* Try the next bounded JSON candidate. */ }
    }
    return null;
  };

  const draftTasksFromNL = async () => {
    if (!input.trim() || !user) return;
    const submittedText = input.trim();
    const request = beginRequest();
    const ownerId = user.id;
    setLoading(true);
    try {
      const r = await callAI("parse_task_list", submittedText, undefined, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      const parsed = parseTaskListDrafts(responseData(r), submittedText,
        (source) => parseExplicitWorkDate(source, (text) => parseNaturalDate(text).dueDate));
      if (!parsed.length) throw new Error(isEn ? "No task drafts matched the supplied text" : "پیش‌نویس قابل اتکایی از متن پیدا نشد");
      const nextDrafts = parsed.map((draft) => ({ ...draft, id: newTaskId() }));
      setTaskDrafts(nextDrafts);
      setTaskDraftPicked(Object.fromEntries(nextDrafts.map((draft) => [draft.id, true])));
      taskDraftOwnerRef.current = ownerId;
      toast.success(T("پیش‌نویس‌ها آماده‌اند؛ پیش از ذخیره آن‌ها را بازبینی کن", "Drafts are ready; review them before saving"));
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const addTaskDrafts = async () => {
    const ownerId = user?.id;
    if (!ownerId || taskDraftOwnerRef.current !== ownerId) {
      return toast.error(T("پیش‌نویس‌ها به حساب فعلی تعلق ندارند؛ دوباره بسازشان", "These drafts belong to another account; generate them again"));
    }
    const selected = taskDrafts.filter((draft) => taskDraftPicked[draft.id]);
    if (!selected.length) return toast.error(T("چیزی انتخاب نشده", "Nothing selected"));
    if (selected.some((draft) => !draft.title.trim())) return toast.error(T("عنوان هر پیش‌نویس باید پر باشد", "Each selected draft needs a title"));
    setLoading(true);
    let queued = 0;
    let saved = 0;
    const failedIds: string[] = [];
    try {
      for (const draft of selected) {
        if (activeUserIdRef.current !== ownerId || taskDraftOwnerRef.current !== ownerId) break;
        let result: Awaited<ReturnType<typeof persistTask>>;
        try {
          result = await persistTask(ownerId, {
            id: draft.id,
            user_id: ownerId,
            title: draft.title.trim(),
            description: draft.description || null,
            priority: normalizeTaskPriority(draft.priority),
            ...workDatePatch({}, draft.work_date),
            completed: false,
            status: "todo",
          });
        } catch {
          failedIds.push(draft.id);
          continue;
        }
        if (activeUserIdRef.current !== ownerId) break;
        if (result === "failed") failedIds.push(draft.id);
        else if (result === "queued") queued += 1;
        else saved += 1;
      }
      if (activeUserIdRef.current !== ownerId) return;
      setTaskDrafts((current) => current.filter((draft) => failedIds.includes(draft.id)));
      setTaskDraftPicked((current) => Object.fromEntries(Object.entries(current).filter(([id]) => failedIds.includes(id))));
      if (failedIds.length) toast.error(T(`${failedIds.length} تسک ذخیره نشد؛ دوباره تلاش کن`, `${failedIds.length} task(s) failed to save; you can retry`));
      else {
        toast.success(queued ? T(`${saved + queued} تسک برای همگام‌سازی صف شد`, `${saved + queued} task(s) queued to sync`) : T(`${saved} تسک ساخته شد`, `${saved} task(s) created`));
        setInput("");
        taskDraftOwnerRef.current = null;
      }
    } finally {
      if (activeUserIdRef.current === ownerId) setLoading(false);
    }
  };

  const generateNote = async () => {
    if (!input.trim() || !user) return;
    setLoading(true);
    try {
      const r = await callAI("generate_note", input, undefined, undefined, aiLang, { skipPersonalization: true });
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      const { error } = await firebaseStore.from("notes").insert({
        user_id: user.id,
        title: input.slice(0, 60),
        content: r.text,
      });
      if (error) throw error;
      toast.success(isEn ? "Note created ✨" : "نوت ساخته شد ✨");
      setInput("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const getSuggestions = async () => {
    if (!input.trim() || !user) return;
    const request = beginRequest();
    const ownerId = user.id;
    setLoading(true); setSuggestions([]); setPicked({});
    suggestionOwnerRef.current = null;
    try {
      const r = await callAI("suggest", input, undefined, undefined, aiLang, { skipPersonalization: true });
      if (!isCurrentRequest(request)) return;
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      const items = parseTaskSuggestions(r.data);
      if (!items) {
        toast.error(T("پاسخ پیشنهادها ساختار معتبری نداشت", "The AI returned an invalid suggestion list"));
        return;
      }
      suggestionOwnerRef.current = ownerId;
      setSuggestions(items.map((suggestion) => ({ ...suggestion, id: newTaskId() })));
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const addPickedAsTasks = async () => {
    if (!user || suggestionOwnerRef.current !== user.id) return;
    const sel = suggestions.filter((suggestion) => picked[suggestion.id]);
    if (!sel.length) return toast.error(isEn ? "Nothing selected" : "چیزی انتخاب نشده");
    if (sel.some((suggestion) => !suggestion.title.trim())) return toast.error(T("عنوان هر تسک باید پر باشد", "Each task needs a title"));
    const ownerId = user.id;
    setLoading(true);
    let queued = 0;
    let saved = 0;
    const failedIds: string[] = [];
    try {
      for (const suggestion of sel) {
        if (activeUserIdRef.current !== ownerId || suggestionOwnerRef.current !== ownerId) break;
        let result: Awaited<ReturnType<typeof persistTask>>;
        try {
          result = await persistTask(ownerId, {
            id: suggestion.id, user_id: ownerId, title: suggestion.title.trim(), description: suggestion.description || null,
            priority: normalizeTaskPriority(suggestion.priority), completed: false, status: "todo",
          });
        } catch {
          failedIds.push(suggestion.id);
          continue;
        }
        if (activeUserIdRef.current !== ownerId) break;
        if (result === "failed") failedIds.push(suggestion.id);
        else if (result === "queued") queued += 1;
        else saved += 1;
      }
      if (activeUserIdRef.current !== ownerId) return;
      setSuggestions((current) => current.filter((suggestion) => failedIds.includes(suggestion.id)));
      setPicked(Object.fromEntries(failedIds.map((id) => [id, true])));
      if (failedIds.length) toast.error(isEn ? `${failedIds.length} task(s) could not be saved` : `ذخیرهٔ ${failedIds.length} تسک انجام نشد`);
      else {
        toast.success(queued ? T(`${saved + queued} تسک برای همگام‌سازی صف شد`, `${saved + queued} task(s) queued to sync`) : T(`${saved} تسک اضافه شد`, `${saved} task(s) added`));
        setInput("");
        suggestionOwnerRef.current = null;
      }
    } finally { if (activeUserIdRef.current === ownerId) setLoading(false); }
  };

  const runChat = async (message: string, context?: string, systemPromptOverride?: string, contextLabel?: string, replyBasis?: string) => {
    if (!message.trim() || !user) return;
    const ownerId = user.id;
    const request = beginRequest();
    const newMsg = { role: "user" as const, content: message.trim() };
    const nextChat = [...chat, newMsg];
    setChat(nextChat);
    setChatInput("");
    setLoading(true);
    try {
      const r = await callAI("chat", nextChat, context, undefined, aiLang, {
        skipPersonalization: true,
        ...(systemPromptOverride ? { systemPromptOverride } : {}),
      });
      if (!isCurrentRequest(request)) return;
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      const replyText = (r.text || "").trim();
      const response = replyBasis
        ? (replyText.startsWith(replyBasis) ? replyText : `${replyBasis}\n\n${replyText}`)
        : replyText;
      setChat((c) => [...c, { role: "assistant", content: response }]);
      if (context && contextLabel) setTaskContext({ ownerId, label: contextLabel, context });
    } catch (e: any) { if (isCurrentRequest(request)) toast.error(e.message); }
    finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const askPlan = async (kind: "day" | "week") => {
    if (!user) return;
    const request = beginRequest();
    const ownerId = user.id;
    setLoading(true);
    try {
      const now = new Date();
      const today = todayISO(now);
      const period = periodFor("week", now, getTimeSettings());
      const start = kind === "day" ? today : period.start;
      const end = kind === "day" ? today : period.end;
      const { data, error } = await firebaseStore.from("tasks")
        .select("id,user_id,title,priority,completed,status,parent_id,source_type,folder_id,work_date,due_date,schedule_v,planning_horizon,planning_start,planning_end,planning_calendar,schedule_timezone")
        .eq("user_id", ownerId).limit(500);
      if (error) throw error;
      if (!isCurrentRequest(request)) return;
      const sourceLimitReached = (data?.length || 0) >= 500;
      const rows = safeScheduledTasks((data || []) as Array<Partial<Task>>, ownerId, start, end, kind);
      const overdueRows = kind === "day"
        ? rows.filter((task) => isOverdueFixedSchedule(task, today)).sort((a, b) => (taskScheduledStart(b) || "").localeCompare(taskScheduledStart(a) || ""))
        : [];
      const scheduledRows = kind === "day" ? rows.filter((task) => (taskScheduledStart(task) || "") >= today) : rows;
      const overdue = overdueRows.slice(0, 30);
      const scheduled = scheduledRows.slice(0, kind === "day" ? 30 : 60);
      const omittedCount = overdueRows.length - overdue.length + scheduledRows.length - scheduled.length;
      const dataStatus = omittedCount > 0 ? "truncated" : "complete";
      const compactTask = (task: Partial<Task>, isOverdue = false) => ({
        title: task.title,
        priority: task.priority || "none",
        when: taskScheduleLabel(task),
        ...(isOverdue ? { overdue: true } : {}),
      });
      const label = kind === "day" ? T("برنامهٔ امروز", "Today's plan") : T("برنامهٔ این هفته", "This week's plan");
      const shown = overdue.length + scheduled.length;
      const isTruncated = dataStatus === "truncated" || sourceLimitReached;
      const basisRange = kind === "day" ? T(`${start} به‌علاوهٔ کارهای عقب‌افتاده`, `${start} plus overdue tasks`) : `${start} تا ${end}`;
      const sourceLimitNote = sourceLimitReached ? T("؛ خواندن داده به سقف ۵۰۰ رسید و شاید تسک‌های بیشتری وجود داشته باشد", "; query reached the 500-task limit, so more matches may exist") : "";
      const basis = isTruncated
        ? T(`مبنای پاسخ: ${basisRange} · فهرست بریده‌شده؛ ${shown} مورد از ${rows.length} مورد خوانده‌شده نمایش داده شد${sourceLimitNote}.`, `Basis: ${basisRange} · truncated; showing ${shown} of ${rows.length} loaded matches${sourceLimitNote}.`)
        : T(`مبنای پاسخ: ${basisRange} · فهرست کامل (${shown} مورد).`, `Basis: ${basisRange} · complete list (${shown} tasks).`);
      const ctx = JSON.stringify({
        window: kind,
        basisLine: basis,
        basis: {
          range: { start, end },
          overdueCount: overdueRows.length,
          overdueShown: overdue.length,
          scheduledCount: scheduledRows.length,
          scheduledShown: scheduled.length,
          omittedCount,
          sourceLimitReached,
          dataStatus: isTruncated ? "truncated" : "complete",
        },
        overdueTasks: overdue.map((task) => compactTask(task, true)),
        scheduledTasks: scheduled.map((task) => compactTask(task)),
      });
      const message = kind === "day"
        ? T("بر اساس کارهای بخش‌بندی‌شدهٔ امروز، یک برنامهٔ واقع‌بینانه پیشنهاد بده. پاسخ را با تاریخ مبنا و کامل یا بریده بودن فهرست شروع کن. هیچ تغییری ذخیره نکن و زمان تازه‌ای نساز.", "Suggest a realistic plan from today's grouped tasks. Start with the basis date and whether the list is complete or truncated. Do not save changes or invent times.")
        : T("بر اساس کارهای این بازه، برنامهٔ هفته را اولویت‌بندی و خلاصه کن. پاسخ را با بازهٔ دقیق و کامل یا بریده بودن فهرست شروع کن. هیچ تغییری ذخیره نکن و زمان تازه‌ای نساز.", "Prioritize and summarize the tasks in this week. Start with the exact date range and whether the list is complete or truncated. Do not save changes or invent times.");
      const systemPrompt = "You are a read-only planning assistant. Use only the supplied compact task summaries. Your answer must begin by copying the exact `basisLine` from the supplied context, including its date range and complete/truncated status. Then give the plan. Distinguish overdueTasks from scheduledTasks. Do not create, reschedule, complete, or modify tasks. Do not infer times, deadlines, recurrence, or missing commitments. If lists are empty, say so. Reply in the user's language.";
      await runChat(message, ctx, systemPrompt, label, basis);
    } catch (error: any) {
      if (isCurrentRequest(request)) toast.error(error?.message || T("خواندن برنامه ممکن نشد", "Could not read the plan"));
    } finally {
      if (isCurrentRequest(request)) setLoading(false);
    }
  };

  const recommendInboxSort = async () => {
    if (!user) return;
    const request = beginRequest();
    const ownerId = user.id;
    setLoading(true);
    setSortProposal(null);
    try {
      const { data, error } = await firebaseStore.from("tasks")
        .select("id,user_id,title,priority,completed,status,parent_id,source_type,folder_id,work_date,due_date,schedule_v,planning_horizon,planning_start,planning_end,planning_calendar,schedule_timezone,created_at")
        .eq("user_id", ownerId).limit(500);
      if (error) throw error;
      if (!isCurrentRequest(request)) return;
      const sourceLimitReached = (data?.length || 0) >= 500;
      const rows = safeInboxTasks((data || []) as Array<Partial<Task>>, ownerId);
      if (!rows.length) throw new Error(T("تسک فعالی در صندوق ورودی پیدا نشد", "No active tasks found in Inbox"));
      const visible = rows.slice(0, 60);
      const context = JSON.stringify({
        matchingTaskCount: rows.length,
        analyzedTaskCount: visible.length,
        truncated: rows.length > visible.length || sourceLimitReached,
        sourceLimitReached,
        tasks: visible.map((task, index) => ({
          ref: `T${index + 1}`,
          title: task.title,
          priority: task.priority || "none",
          when: taskScheduleLabel(task),
        })),
      });
      const systemPrompt = "Recommend two supported task-list sort levels for this user's Inbox. Return ONLY JSON: {\"primary\":{\"key\":\"due|priority|created|title|time_bucket|goal\",\"dir\":\"asc|desc\"},\"secondary\":{\"key\":\"due|priority|created|title|time_bucket|goal\",\"dir\":\"asc|desc\"},\"reason\":\"brief reason\"}. Use only the supplied task summaries, do not identify tasks by text in the output, and do not claim to modify anything. Match the user's language.";
      const r = await callAI("chat", T("برای صندوق ورودی من دو معیار مرتب‌سازی مناسب پیشنهاد بده.", "Recommend two useful sort criteria for my Inbox."), context, undefined, aiLang, { systemPromptOverride: systemPrompt });
      if (!isCurrentRequest(request)) return;
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      const proposal = validateInboxSortProposal(responseData(r));
      if (!proposal) throw new Error(T("پیشنهاد مرتب‌سازی معتبر دریافت نشد", "The AI returned an invalid sort suggestion"));
      setSortProposal({ ownerId, primary: proposal.primary, secondary: proposal.secondary, reason: proposal.reason,
        analyzedCount: visible.length, matchedCount: rows.length, truncated: rows.length > visible.length || sourceLimitReached });
    } catch (error: any) {
      if (isCurrentRequest(request)) toast.error(error?.message || T("پیشنهاد مرتب‌سازی آماده نشد", "Could not prepare a sort suggestion"));
    } finally { if (isCurrentRequest(request)) setLoading(false); }
  };

  const applyInboxSort = () => {
    if (!user || !sortProposal || sortProposal.ownerId !== user.id || activeUserIdRef.current !== sortProposal.ownerId) {
      return toast.error(T("پیشنهاد به حساب فعلی تعلق ندارد", "This suggestion belongs to another account"));
    }
    const saved = saveTaskListSort("inbox:_", { sort_primary: sortProposal.primary, sort_secondary: sortProposal.secondary });
    if (!saved) return toast.error(T("ذخیرهٔ ترتیب صندوق انجام نشد", "Could not save the Inbox order"));
    setSortProposal(null);
    toast.success(T("ترتیب صندوق ورودی به‌روز شد", "Inbox sort order updated"));
  };

  const sendChat = () => {
    const selectedContext = taskContext?.ownerId === user?.id ? taskContext.context : undefined;
    void runChat(chatInput, selectedContext,
      selectedContext ? "You are a read-only assistant for the user's explicitly selected task context. Use only the supplied task summaries and conversation. Do not create, reschedule, complete, or modify tasks, and never invent missing schedule details. Reply in the user's language." : undefined);
  };

  const body = (
    <>
      <div className="mt-1 flex items-center justify-between p-2 rounded-lg border bg-accent/20">
        <span className="text-sm">{T("زبان پاسخ AI", "AI response language")}</span>
        <AILangToggle value={aiLang} onChange={setAiLang} />
      </div>

      {lastResultMeta?.model && (
        <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground px-2.5 py-1 bg-muted/40 rounded-md border border-border/40">
          <span>{T("مدل آخرین پاسخ:", "Model used:")}</span>
          <span className="font-mono font-medium text-foreground">
            {lastResultMeta.provider} / {lastResultMeta.model}
          </span>
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="create">{T("تسک", "Task")}</TabsTrigger>
          <TabsTrigger value="note">{T("نوت", "Note")}</TabsTrigger>
          <TabsTrigger value="suggest">{T("پیشنهاد", "Suggest")}</TabsTrigger>
          <TabsTrigger value="chat">{T("چت", "Chat")}</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">{T("متن یا گفتار را به پیش‌نویس کارها تبدیل کن؛ تاریخ فقط از عبارت صریح خودت برداشته می‌شود.", "Turn text or speech into task drafts. Dates are extracted only from your own explicit wording.")}</p>
          <Textarea placeholder={T("مثال: گزارش را بررسی کن\nبا سارا تماس بگیر؛ فردا", "e.g. Review the report\nCall Sara tomorrow")} value={input}
            onChange={(e) => setInput(e.target.value)} rows={4} />
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="icon" aria-label={listening ? T("توقف دریافت گفتار", "Stop voice input") : T("افزودن با گفتار", "Add by voice")}
              onClick={listening ? stopVoiceCapture : startVoiceCapture} disabled={loading}>
              {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </Button>
            <Button onClick={draftTasksFromNL} disabled={loading || !input.trim() || !user} className="flex-1">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {T("آماده‌سازی پیش‌نویس‌ها", "Prepare task drafts")}
            </Button>
          </div>

          {taskDrafts.length > 0 && taskDraftOwnerRef.current === user?.id && (
            <div className="space-y-2 pt-1" data-testid="ai-task-drafts">
              <p className="text-xs text-muted-foreground">{T("هر مورد را ویرایش یا انتخاب کن؛ چیزی تا زدن دکمهٔ ذخیره ساخته نمی‌شود.", "Edit or select drafts. Nothing is created until you choose Save.")}</p>
              {taskDrafts.map((draft) => (
                <Card key={draft.id} className="p-3 space-y-2">
                  <div className="flex items-start gap-2">
                    <Checkbox aria-label={T(`انتخاب ${draft.title}`, `Select ${draft.title}`)} checked={!!taskDraftPicked[draft.id]}
                      onCheckedChange={(checked) => setTaskDraftPicked((current) => ({ ...current, [draft.id]: checked === true }))} className="mt-2" />
                    <Input aria-label={T("عنوان پیش‌نویس", "Draft title")} value={draft.title}
                      onChange={(event) => setTaskDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, title: event.target.value } : item))} />
                  </div>
                  <Textarea aria-label={T("جزئیات پیش‌نویس", "Draft details")} value={draft.description || ""} rows={2}
                    onChange={(event) => setTaskDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, description: event.target.value || null } : item))} />
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">{T("اهمیت", "Priority")}</Label>
                    <select aria-label={T("اهمیت پیش‌نویس", "Draft priority")} value={draft.priority}
                      onChange={(event) => setTaskDrafts((current) => current.map((item) => item.id === draft.id ? { ...item, priority: event.target.value as TaskListDraft["priority"] } : item))}
                      className="h-8 min-w-32 rounded-md border bg-background px-2 text-xs">
                      <option value="none">{T("عادی", "None")}</option><option value="low">{T("کم", "Low")}</option>
                      <option value="medium">{T("متوسط", "Medium")}</option><option value="high">{T("بالا", "High")}</option>
                      <option value="urgent">{T("فوری", "Urgent")}</option>
                    </select>
                    {draft.work_date && <span className="text-xs text-muted-foreground">{T("تاریخ از متن:", "Date from text:")} {draft.work_date}</span>}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{T("عبارت مبنا:", "Source:")} {draft.source_text}</p>
                </Card>
              ))}
              <Button onClick={addTaskDrafts} disabled={loading || !taskDrafts.some((draft) => taskDraftPicked[draft.id])} className="w-full">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{T("ذخیرهٔ انتخاب‌شده‌ها", "Save selected drafts")}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="note" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">{T("موضوع نوت رو بگو", "Tell me the note topic")}</p>
          <Textarea placeholder={T("مثال: راهنمای شروع یوگا برای مبتدی", "e.g. Beginner's guide to starting yoga")} value={input}
            onChange={(e) => setInput(e.target.value)} rows={4} />
          <Button onClick={generateNote} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("تولید نوت Markdown", "Generate Markdown note")}
          </Button>
        </TabsContent>

        <TabsContent value="suggest" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">{T("یک موضوع بده، پیشنهاد می‌گیریم", "Give a topic and get suggestions")}</p>
          <Textarea placeholder={T("مثال: راه‌اندازی کسب‌وکار آنلاین", "e.g. Starting an online business")} value={input}
            onChange={(e) => setInput(e.target.value)} rows={3} />
          <Button onClick={getSuggestions} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("پیشنهاد بگیر", "Get suggestions")}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-2 mt-4">
                {suggestions.map((s) => (
                  <Card key={s.id} className="p-3 flex gap-3 items-start cursor-pointer hover:bg-accent/30"
                  onClick={() => setPicked((p) => ({ ...p, [s.id]: !p[s.id] }))}>
                  <Checkbox checked={picked[s.id] || false} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                    {s.priority !== "none" && <p className="text-[10px] text-muted-foreground mt-0.5">{T("اولویت", "Priority")}: {s.priority}</p>}
                  </div>
                </Card>
              ))}
              <Button onClick={addPickedAsTasks} className="w-full mt-2" variant="default">
                {T("افزودن انتخاب‌شده‌ها به تسک‌ها", "Add selected to tasks")}
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4 flex flex-col h-[55vh]">
          <div className="flex flex-wrap gap-1.5 mb-2">
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => void askPlan("day")} disabled={loading || !user}>
              <CalendarDays className="h-3.5 w-3.5" />{T("برنامهٔ امروز", "Today")}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => void askPlan("week")} disabled={loading || !user}>
              <CalendarDays className="h-3.5 w-3.5" />{T("این هفته", "This week")}
            </Button>
            <Button type="button" size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => void recommendInboxSort()} disabled={loading || !user}>
              <ListFilter className="h-3.5 w-3.5" />{T("ترتیب صندوق", "Inbox sort")}
            </Button>
          </div>
          {taskContext && user?.id && taskContext.ownerId === user.id && (
            <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border bg-accent/20 px-2.5 py-1.5 text-xs">
              <span>{T(`زمینهٔ فعال: ${taskContext.label}`, `Active context: ${taskContext.label}`)}</span>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2" aria-label={T("پاک‌کردن زمینه", "Clear context")}
                onClick={() => setTaskContext(null)}><X className="h-3.5 w-3.5" /></Button>
            </div>
          )}
          {sortProposal && user?.id && sortProposal.ownerId === user.id && (
            <Card className="mb-2 p-3 space-y-2" data-testid="ai-inbox-sort-preview">
              <p className="text-sm font-medium">{T("پیشنهاد ترتیب صندوق ورودی", "Inbox sort suggestion")}</p>
              <p className="text-xs">{T("اول:", "Primary:")} {T(SORT_LABELS[sortProposal.primary.key].fa, SORT_LABELS[sortProposal.primary.key].en)} · {sortProposal.primary.dir === "asc" ? T("صعودی", "ascending") : T("نزولی", "descending")}</p>
              <p className="text-xs">{T("بعد:", "Secondary:")} {T(SORT_LABELS[sortProposal.secondary.key].fa, SORT_LABELS[sortProposal.secondary.key].en)} · {sortProposal.secondary.dir === "asc" ? T("صعودی", "ascending") : T("نزولی", "descending")}</p>
              <p className="text-[11px] text-muted-foreground">
                {sortProposal.truncated
                  ? T(`این پیشنهاد بر پایهٔ ${sortProposal.analyzedCount} مورد از دست‌کم ${sortProposal.matchedCount} تسک صندوق ساخته شده است.`, `Based on ${sortProposal.analyzedCount} of at least ${sortProposal.matchedCount} Inbox tasks.`)
                  : T(`این پیشنهاد بر پایهٔ هر ${sortProposal.matchedCount} تسک فعال صندوق ساخته شده است.`, `Based on all ${sortProposal.matchedCount} active Inbox tasks.`)}
              </p>
              {sortProposal.reason && <p className="text-xs text-muted-foreground">{sortProposal.reason}</p>}
              <div className="flex gap-2">
                <Button type="button" size="sm" className="flex-1" onClick={applyInboxSort}>{T("اعمال ترتیب", "Apply order")}</Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setSortProposal(null)}>{T("لغو", "Cancel")}</Button>
              </div>
            </Card>
          )}
          <div dir={isEn ? "ltr" : "rtl"} className="flex-1 overflow-y-auto space-y-2 mb-2">
            {chat.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">{T("سؤالی درباره تسک‌هات بپرس", "Ask a question about your tasks")}</p>}
            {chat.map((m, i) => (
              <div key={i} dir={isEn ? "ltr" : "rtl"} className={`p-3 rounded-2xl text-end leading-7 ${m.role === "user" ? "bg-primary/10 ms-8" : "bg-muted me-8"}`}>
                <div className="text-xs prose-note">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
          </div>
          <div className="flex gap-2">
            <Input dir={isEn ? "ltr" : "rtl"} value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder={T("بپرس...", "Ask...")} />
            <Button size="icon" onClick={sendChat} disabled={loading}><Send className="w-4 h-4" /></Button>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );

  return isMobile ? (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> {T("دستیار AI", "AI Assistant")}
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-4 overflow-y-auto">{body}</div>
      </DrawerContent>
    </Drawer>
  ) : (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" /> {T("دستیار AI", "AI Assistant")}
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}
