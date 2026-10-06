import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { callAI, getAILanguage, type AILanguage } from "@/lib/ai";
import { AILangToggle } from "@/components/AILangToggle";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";
import { useBilingual } from "@/hooks/useBilingual";
import { compactTasksForAI } from "@/lib/taskSchedule";
import { normalizeTaskPriority } from "@/lib/priority";
import { persistTask } from "@/lib/firestoreDataService";
import { parseNaturalDate } from "@/lib/nlDate";

type SuggestedTask = { id: string; title: string; description?: string };

function newTaskId() {
  return `task_ai_${globalThis.crypto?.randomUUID?.() || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`}`;
}

export function AIPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { T, isEn } = useBilingual();
  const [tab, setTab] = useState("create");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedTask[]>([]);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const [lastResultMeta, setLastResultMeta] = useState<{ provider?: string; model?: string } | null>(null);
  const createIntentRef = useRef<{ input: string; id: string } | null>(null);

  const createTaskFromNL = async () => {
    if (!input.trim() || !user) return;
    const submittedText = input.trim();
    if (createIntentRef.current?.input !== submittedText) {
      createIntentRef.current = { input: submittedText, id: newTaskId() };
    }
    setLoading(true);
    try {
      const r = await callAI("parse_task", submittedText, undefined, undefined, aiLang);
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      if (!r.data?.title) throw new Error(isEn ? "Could not create the task" : "نتوانست تسک بسازد");
      const result = await persistTask(user.id, {
        id: createIntentRef.current.id,
        user_id: user.id,
        title: r.data.title,
        description: r.data.description || null,
        priority: normalizeTaskPriority(r.data.priority),
        // Use only a day/clock the user actually wrote; the model cannot invent one.
        work_date: parseNaturalDate(submittedText).dueDate || null,
        completed: false,
        status: "todo",
      });
      if (result === "failed") throw new Error(isEn ? "Task could not be saved" : "ذخیره تسک انجام نشد");
      toast.success(result === "queued" ? (isEn ? "Task queued to sync" : "تسک برای همگام‌سازی صف شد") : (isEn ? "Task created ✨" : "تسک ساخته شد ✨"));
      createIntentRef.current = null;
      setInput("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const generateNote = async () => {
    if (!input.trim() || !user) return;
    setLoading(true);
    try {
      const r = await callAI("generate_note", input, undefined, undefined, aiLang);
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
    if (!input.trim()) return;
    setLoading(true); setSuggestions([]); setPicked({});
    try {
      const r = await callAI("suggest", input, undefined, undefined, aiLang);
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      if (Array.isArray(r.data?.items)) setSuggestions(r.data.items.map((suggestion: Omit<SuggestedTask, "id">) => ({
        ...suggestion,
        id: newTaskId(),
      })));
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const addPickedAsTasks = async () => {
    if (!user) return;
    const sel = suggestions.filter((_, i) => picked[i]);
    if (!sel.length) return toast.error(isEn ? "Nothing selected" : "چیزی انتخاب نشده");
    const results = await Promise.all(sel.map((s) => persistTask(user.id, {
      id: s.id, user_id: user.id, title: s.title, description: s.description || null,
      priority: "none", completed: false, status: "todo",
    })));
    const failed = results.filter((result) => result === "failed").length;
    if (failed) toast.error(isEn ? `${failed} task(s) could not be saved` : `ذخیرهٔ ${failed} تسک انجام نشد`);
    else toast.success(results.some((result) => result === "queued") ? (isEn ? `${sel.length} tasks queued to sync` : `${sel.length} تسک برای همگام‌سازی صف شد`) : (isEn ? `${sel.length} task(s) added` : `${sel.length} تسک اضافه شد`));
    if (!failed) { setSuggestions([]); setPicked({}); setInput(""); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMsg = { role: "user" as const, content: chatInput };
    setChat((c) => [...c, newMsg]);
    setChatInput("");
    setLoading(true);
    try {
      // Build minimal context
      const { data: tasks } = await firebaseStore.from("tasks").select("*").limit(20);
      const ctx = `Recent tasks: ${JSON.stringify(compactTasksForAI(tasks || []))}`;
      const r = await callAI("chat", [...chat, newMsg], ctx, undefined, aiLang);
      if (r.provider && r.model) setLastResultMeta({ provider: r.provider, model: r.model });
      setChat((c) => [...c, { role: "assistant", content: r.text }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
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
          <p className="text-sm text-muted-foreground">{T("با زبان طبیعی تسک بساز", "Create a task in natural language")}</p>
          <Textarea placeholder={T("مثال: فردا ساعت ۱۰ جلسه تیمی، اولویت بالا", "e.g. Team meeting tomorrow at 10, high priority")} value={input}
            onChange={(e) => setInput(e.target.value)} rows={4} />
          <Button onClick={createTaskFromNL} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : T("ساخت تسک", "Create task")}
          </Button>
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
              {suggestions.map((s, i) => (
                <Card key={s.id} className="p-3 flex gap-3 items-start cursor-pointer hover:bg-accent/30"
                  onClick={() => setPicked((p) => ({ ...p, [i]: !p[i] }))}>
                  <Checkbox checked={picked[i] || false} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
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
