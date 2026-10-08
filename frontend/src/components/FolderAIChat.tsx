import { MascotCharacter } from "@/components/AngelCompanion";
import { useState, useEffect, useRef } from "react";
import { Send, Loader2, MessageCircleQuestion, MessageSquare, Wand2, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { parseTaskDueDate, taskWorkDate } from "@/lib/taskDate";
import { parseNaturalDate } from "@/lib/nlDate";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "interview" | "free";
type Output = "kanban" | "list" | null;

type ProposedTask = {
  title: string;
  priority?: "none" | "low" | "medium" | "high";
  due_date?: string;
  kanban_column?: "todo" | "doing" | "done";
  description?: string;
};

type FolderTaskRow = {
  id?: string;
  user_id?: string;
  folder_id?: string | null;
  title?: string;
  priority?: string | null;
  completed?: boolean;
  status?: string | null;
  parent_id?: string | null;
  source_type?: string | null;
  work_date?: string | null;
  due_date?: string | null;
  schedule_v?: number | null;
};

/** Compact, owner-checked task context; note contents and other folders are excluded. */
export function buildFolderTaskContext(rows: FolderTaskRow[], ownerId: string, folderId: string) {
  const sameFolderRows = rows.filter((row) => row.user_id === ownerId && row.folder_id === folderId &&
    typeof row.title === "string" && row.title.trim() && !row.parent_id && !row.source_type &&
    !row.completed && row.status !== "done" && row.status !== "wont_do");
  const tasks = sameFolderRows.slice(0, 40).map((task) => ({
    title: task.title!.trim().slice(0, 240),
    priority: task.priority || "none",
    status: task.status || "todo",
    when: taskWorkDate(task as Parameters<typeof taskWorkDate>[0]) || null,
  }));
  return {
    tasks,
    taskCount: sameFolderRows.length,
    truncated: rows.length >= 41 || sameFolderRows.length > tasks.length,
  };
}

/** Validate the model's task proposal schema and allow dates only if the user named that day. */
export function parseFolderTaskProposals(
  value: unknown,
  userTexts: string[],
): { summary: string; tasks: ProposedTask[] } | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (typeof data.summary !== "string" || !data.summary.trim() || data.summary.length > 800 || !Array.isArray(data.tasks) || data.tasks.length > 20) return null;

  const explicitDates = userTexts.map((text) => parseNaturalDate(text).dueDate).filter((date): date is string => Boolean(date));
  const allowedPriority = new Set(["none", "low", "medium", "high"]);
  const allowedColumn = new Set(["todo", "doing", "done"]);
  const tasks: ProposedTask[] = [];
  for (const entry of data.tasks) {
    if (!entry || typeof entry !== "object") continue;
    const item = entry as Record<string, unknown>;
    const title = typeof item.title === "string" ? item.title.trim().slice(0, 240) : "";
    if (!title) continue;
    if (item.priority !== undefined && !allowedPriority.has(String(item.priority))) continue;
    if (item.description !== undefined && typeof item.description !== "string") continue;
    if (item.kanban_column !== undefined && !allowedColumn.has(String(item.kanban_column))) continue;

    const requestedDate = typeof item.due_date === "string" ? item.due_date : "";
    const requestedDay = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(requestedDate) ? requestedDate.slice(0, 10) : "";
    const groundedDate = explicitDates.find((date) => date.slice(0, 10) === requestedDay);
    tasks.push({
      title,
      priority: typeof item.priority === "string" ? item.priority as ProposedTask["priority"] : "none",
      ...(typeof item.description === "string" && item.description.trim() ? { description: item.description.trim().slice(0, 1200) } : {}),
      ...(groundedDate ? { due_date: groundedDate } : {}),
      ...(typeof item.kanban_column === "string" ? { kanban_column: item.kanban_column as ProposedTask["kanban_column"] } : {}),
    });
  }
  return tasks.length ? { summary: data.summary.trim(), tasks } : null;
}

export default function FolderAIChat({
  open, onOpenChange, folderId, folderName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  folderId: string;
  folderName: string;
}) {
  const { user } = useAuth();
  const [mode, setMode] = useState<Mode>("interview");
  const [output, setOutput] = useState<Output>(null); // chosen at start
  const [includeFolderTasks, setIncludeFolderTasks] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [conversationOwnerId, setConversationOwnerId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposed, setProposed] = useState<ProposedTask[] | null>(null);
  const [proposalOwnerId, setProposalOwnerId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeUserIdRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);
  activeUserIdRef.current = user?.id || null;

  const isCurrentRequest = (requestId: number, ownerId: string) =>
    requestId === requestIdRef.current && activeUserIdRef.current === ownerId;

  // Reset on open
  useEffect(() => {
    requestIdRef.current += 1;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setLoading(false);
    if (open) {
      setMessages([]);
      setProposed(null);
      setProposalOwnerId(null);
      setConversationOwnerId(null);
      setOutput(null);
      setMode("interview");
      setInput("");
      setIncludeFolderTasks(false);
    }
  }, [open, user?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, proposed]);

  const startWith = (out: Output) => {
    if (!user?.id) return;
    setOutput(out);
    setConversationOwnerId(user.id);
    const intro = mode === "interview"
      ? `سلام! می‌خوام به برنامه‌ریزی پروژه «${folderName}» کمک کنم. چند سوال کوتاه می‌پرسم تا تسک‌های ${out === "kanban" ? "Kanban" : "ساده"} رو دقیق پیشنهاد بدم.\n\nسوال اول: هدف اصلی این پروژه چیه و تا کی می‌خوای تمومش کنی؟`
      : `سلام! درباره پروژه «${folderName}» هرچی لازمه برام بنویس. وقتی آماده شدی روی «ساخت تسک‌ها» کلیک کن تا خروجی ${out === "kanban" ? "Kanban" : "لیست"} رو پیشنهاد بدم.`;
    setMessages([{ role: "assistant", content: intro }]);
  };

  const send = async (forceBuild = false) => {
    const ownerId = user?.id;
    if (!ownerId || !output || conversationOwnerId !== ownerId) return;
    const text = input.trim();
    if (!text && !forceBuild) return;

    const newMsgs: Msg[] = text ? [...messages, { role: "user" as const, content: text }] : messages;
    if (text) setMessages(newMsgs);
    setInput("");
    setLoading(true);
    activeRequestRef.current?.abort();
    const controller = new AbortController();
    activeRequestRef.current = controller;
    const requestId = ++requestIdRef.current;

    try {
      const buildNow = forceBuild || (mode === "interview" && newMsgs.filter(m => m.role === "user").length >= 3);
      const folderTaskContext = includeFolderTasks
        ? await loadFolderTasks(ownerId, requestId)
        : null;
      if (!isCurrentRequest(requestId, ownerId)) return;
      const context = JSON.stringify({
        projectName: folderName,
        mode,
        desiredOutput: output,
        folderContextScope: folderTaskContext ? "up to 40 open task titles, priorities, statuses, and schedules from this folder only" : "project name and conversation only",
        folderTasks: folderTaskContext,
      });
      const systemPrompt = buildNow
        ? `You are helping plan the project named ${JSON.stringify(folderName)}. Use only the conversation and the bounded folder context supplied with this request. Return only JSON with this exact shape: {"summary":"brief summary","tasks":[{"title":"actionable task title","description":"optional detail","priority":"none|low|medium|high","due_date":"YYYY-MM-DD or explicit ISO datetime, otherwise null","kanban_column":"todo|doing|done"}]}. Return at most 20 tasks. Only suggest a due date if the user's messages explicitly name that day or clock time; never infer dates or times. Set kanban_column to a sensible value only for Kanban output. Never claim that tasks were saved.`
        : `You are helping plan the project named ${JSON.stringify(folderName)}. Use only the conversation and the bounded folder context supplied with this request. Ask one focused follow-up question in normal text. Do not claim access to notes or other folders, and never claim any task was saved.`;

      const res = await callAI(
        "folder_chat",
        newMsgs,
        context,
        undefined,
        undefined,
        { systemPromptOverride: systemPrompt, signal: controller.signal },
      );
      if (!isCurrentRequest(requestId, ownerId)) return;

      if (buildNow) {
        const structured = parseFolderTaskProposals(res.data, newMsgs.filter((m) => m.role === "user").map((m) => m.content));
        if (!structured) {
          setMessages([...newMsgs, { role: "assistant", content: res.text || "پیشنهاد ساختاریافته دریافت نشد." }]);
          toast.info("پیشنهاد ساختاریافته دریافت نشد؛ دوباره تلاش کن.");
          return;
        }
        setProposed(structured.tasks);
        setProposalOwnerId(ownerId);
        setMessages([...newMsgs, { role: "assistant", content: structured.summary }]);
      } else if (res.text) {
        setMessages([...newMsgs, { role: "assistant", content: res.text }]);
      }
    } catch (e: any) {
      if (isCurrentRequest(requestId, ownerId) && e?.name !== "AbortError") toast.error(e.message || "خطا در ارتباط با AI");
    } finally {
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
        if (isCurrentRequest(requestId, ownerId)) setLoading(false);
      }
    }
  };

  const loadFolderTasks = async (ownerId: string, requestId: number) => {
    const { data, error } = await firebaseStore.from("tasks", ownerId)
      .select("id,user_id,folder_id,title,priority,completed,status,parent_id,source_type,work_date,due_date,schedule_v")
      .eq("user_id", ownerId)
      .eq("folder_id", folderId)
      .limit(41);
    if (error) throw error;
    if (!isCurrentRequest(requestId, ownerId)) return null;
    return buildFolderTaskContext((data || []) as FolderTaskRow[], ownerId, folderId);
  };

  const createTasks = async () => {
    const ownerId = user?.id;
    if (!ownerId || !proposed || proposalOwnerId !== ownerId || activeUserIdRef.current !== ownerId) return;
    setCreating(true);
    try {
      // Ensure kanban columns exist if kanban output
      let columnMap: Record<string, string | null> = { todo: null, doing: null, done: null };
      if (output === "kanban") {
        const { data: existing } = await firebaseStore
          .from("folder_columns", ownerId)
          .select("*")
          .eq("folder_id", folderId)
          .order("position");
        const have = new Set((existing || []).map((c: any) => c.name.toLowerCase()));
        const toCreate = (["todo", "doing", "done"] as const).filter(n => !have.has(n));
        if (toCreate.length) {
          await firebaseStore.from("folder_columns", ownerId).insert(
            toCreate.map((n, i) => ({
              folder_id: folderId, user_id: ownerId, name: n, position: (existing?.length || 0) + i,
            }))
          );
        }
        const { data: cols } = await firebaseStore
          .from("folder_columns", ownerId).select("*").eq("folder_id", folderId);
        for (const c of cols || []) columnMap[c.name.toLowerCase()] = c.id;
      }

      const rows = proposed.map((t, i) => ({
        user_id: ownerId,
        folder_id: folderId,
        title: t.title,
        description: t.description || null,
        priority: (t.priority || "none") as any,
        due_date: taskWorkDate(t) || null,
        kanban_column_id: output === "kanban" ? columnMap[t.kanban_column || "todo"] : null,
        position: i,
      }));
      const { error } = await firebaseStore.from("tasks", ownerId).insert(rows);
      if (activeUserIdRef.current !== ownerId) return;
      if (error) throw error;
      toast.success(`${rows.length} تسک ساخته شد`);
      setProposed(null);
      onOpenChange(false);
    } catch (e: any) {
      if (activeUserIdRef.current === ownerId) toast.error(e.message || "خطا در ساخت تسک‌ها");
    } finally {
      if (activeUserIdRef.current === ownerId) setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <MascotCharacter pose="thinking" busy={loading} size={48} />
            چت AI روی فولدر «{folderName}»
          </DialogTitle>
        </DialogHeader>

        {!output ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6 gap-6">
            <p className="text-sm text-muted-foreground text-center">خروجی این چت چی باشه؟</p>
            <div className="grid grid-cols-2 gap-3 w-full max-w-md">
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => startWith("kanban")}>
                <LayoutGrid className="w-6 h-6 text-primary" />
                <span>Kanban</span>
                <span className="text-[10px] text-muted-foreground">ستون‌های To Do / Doing / Done</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2" onClick={() => startWith("list")}>
                <List className="w-6 h-6 text-primary" />
                <span>لیست ساده</span>
                <span className="text-[10px] text-muted-foreground">با priority + due date</span>
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Toolbar */}
            <div className="px-4 py-2 border-b flex items-center gap-3 flex-wrap text-xs">
              <div className="flex items-center gap-1.5 bg-muted rounded-md p-0.5">
                <Button size="sm" variant={mode === "interview" ? "default" : "ghost"} className="h-7 gap-1" onClick={() => setMode("interview")}>
                  <MessageCircleQuestion className="w-3 h-3" /> Interview
                </Button>
                <Button size="sm" variant={mode === "free" ? "default" : "ghost"} className="h-7 gap-1" onClick={() => setMode("free")}>
                  <MessageSquare className="w-3 h-3" /> Free
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor="folder-ai-task-context" className="text-xs">زمینهٔ تسک‌های همین فولدر</Label>
                <Switch id="folder-ai-task-context" checked={includeFolderTasks} onCheckedChange={setIncludeFolderTasks} />
              </div>
              <Badge variant="outline" className="ms-auto">{output === "kanban" ? "Kanban" : "List"}</Badge>
            </div>
            <p className="px-4 py-1 text-[10px] text-muted-foreground">
              {includeFolderTasks
                ? "با رضایت شما، حداکثر ۴۰ تسک باز همین فولدر (عنوان، اولویت، وضعیت و برنامه) فرستاده می‌شود؛ متن نوت‌ها ارسال نمی‌شود."
                : "به‌طور پیش‌فرض فقط نام پروژه و گفت‌وگو استفاده می‌شود؛ اطلاعات تسک‌ها و متن نوت‌ها فرستاده نمی‌شوند."}
            </p>

            {/* Messages */}
            <ScrollArea className="flex-1" ref={scrollRef as any}>
              <div dir="rtl" className="p-4 space-y-3">
                {messages.map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div dir="rtl" className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap leading-7 text-end ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
                {loading && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> در حال فکر کردن…
                  </div>
                )}
                {proposed && (
                  <div className="border rounded-lg p-3 bg-card space-y-2">
                    <div className="text-xs font-semibold flex items-center gap-1.5">
                      <Wand2 className="w-3.5 h-3.5 text-primary" /> تسک‌های پیشنهادی ({proposed.length})
                    </div>
                    <ul className="space-y-1.5">
                      {proposed.map((t, i) => (
                        <li key={i} className="text-xs flex items-start gap-2">
                          <span className="text-muted-foreground">{i + 1}.</span>
                          <div className="flex-1">
                            <div className="font-medium">{t.title}</div>
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {t.priority && t.priority !== "none" && <Badge variant="outline" className="text-[9px] py-0 h-4">{t.priority}</Badge>}
                              {taskWorkDate(t) && <Badge variant="outline" className="text-[9px] py-0 h-4">{parseTaskDueDate(taskWorkDate(t))?.toLocaleDateString("fa-IR") || taskWorkDate(t)}</Badge>}
                              {output === "kanban" && t.kanban_column && <Badge variant="outline" className="text-[9px] py-0 h-4">{t.kanban_column}</Badge>}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" onClick={createTasks} disabled={creating} className="gap-1 h-7">
                        {creating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                        ساخت همه
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => { setProposed(null); setProposalOwnerId(null); }} className="h-7">انصراف</Button>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Input */}
            <div className="border-t p-3 space-y-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={mode === "interview" ? "پاسخ به سوال AI…" : "هر چی می‌خوای بگو…"}
                className="min-h-[60px] resize-none text-sm"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); send(); }
                }}
              />
              <div className="flex gap-2">
                <Button onClick={() => send(false)} disabled={loading || !input.trim()} className="gap-1 flex-1">
                  <Send className="w-3.5 h-3.5" /> ارسال
                </Button>
                {mode === "free" && (
                  <Button variant="secondary" onClick={() => send(true)} disabled={loading} className="gap-1">
                    <Wand2 className="w-3.5 h-3.5" /> ساخت تسک‌ها
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
