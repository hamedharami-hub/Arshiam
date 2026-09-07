import { useState, useEffect, useRef } from "react";
import { Sparkles, Send, Loader2, Globe, MessageCircleQuestion, MessageSquare, Wand2, LayoutGrid, List } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { callAI } from "@/lib/ai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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
  const [webSearch, setWebSearch] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [proposed, setProposed] = useState<ProposedTask[] | null>(null);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Reset on open
  useEffect(() => {
    if (open) {
      setMessages([]);
      setProposed(null);
      setOutput(null);
      setMode("interview");
      setInput("");
      setWebSearch(false);
    }
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, proposed]);

  const startWith = (out: Output) => {
    setOutput(out);
    const intro = mode === "interview"
      ? `سلام! می‌خوام به برنامه‌ریزی پروژه «${folderName}» کمک کنم. چند سوال کوتاه می‌پرسم تا تسک‌های ${out === "kanban" ? "Kanban" : "ساده"} رو دقیق پیشنهاد بدم.\n\nسوال اول: هدف اصلی این پروژه چیه و تا کی می‌خوای تمومش کنی؟`
      : `سلام! درباره پروژه «${folderName}» هرچی لازمه برام بنویس. وقتی آماده شدی روی «ساخت تسک‌ها» کلیک کن تا خروجی ${out === "kanban" ? "Kanban" : "لیست"} رو پیشنهاد بدم.`;
    setMessages([{ role: "assistant", content: intro }]);
  };

  const send = async (forceBuild = false) => {
    if (!output) return;
    const text = input.trim();
    if (!text && !forceBuild) return;

    const newMsgs: Msg[] = text ? [...messages, { role: "user" as const, content: text }] : messages;
    if (text) setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const buildNow = forceBuild || (mode === "interview" && newMsgs.filter(m => m.role === "user").length >= 3);
      const systemHint = `Project name: ${folderName}\nMode: ${mode}\nDesired output: ${output}\n${buildNow ? "User has provided enough info OR clicked build. Now CALL propose_tasks tool." : "Continue interview / chat. Ask ONE focused question."}`;

      const res = await callAI(
        "folder_chat",
        newMsgs,
        systemHint,
        undefined,
        undefined,
        { webSearch },
      );

      if (res.data?.tasks?.length) {
        setProposed(res.data.tasks);
        const summary = res.data.summary || `${res.data.tasks.length} تسک پیشنهاد شد.`;
        setMessages([...newMsgs, { role: "assistant", content: summary }]);
      } else if (res.text) {
        setMessages([...newMsgs, { role: "assistant", content: res.text }]);
      }
    } catch (e: any) {
      toast.error(e.message || "خطا در ارتباط با AI");
    } finally {
      setLoading(false);
    }
  };

  const createTasks = async () => {
    if (!user || !proposed) return;
    setCreating(true);
    try {
      // Ensure kanban columns exist if kanban output
      let columnMap: Record<string, string | null> = { todo: null, doing: null, done: null };
      if (output === "kanban") {
        const { data: existing } = await supabase
          .from("folder_columns")
          .select("*")
          .eq("folder_id", folderId)
          .order("position");
        const have = new Set((existing || []).map((c: any) => c.name.toLowerCase()));
        const toCreate = (["todo", "doing", "done"] as const).filter(n => !have.has(n));
        if (toCreate.length) {
          await supabase.from("folder_columns").insert(
            toCreate.map((n, i) => ({
              folder_id: folderId, user_id: user.id, name: n, position: (existing?.length || 0) + i,
            }))
          );
        }
        const { data: cols } = await supabase
          .from("folder_columns").select("*").eq("folder_id", folderId);
        for (const c of cols || []) columnMap[c.name.toLowerCase()] = c.id;
      }

      const rows = proposed.map((t, i) => ({
        user_id: user.id,
        folder_id: folderId,
        title: t.title,
        description: t.description || null,
        priority: (t.priority || "none") as any,
        due_date: t.due_date || null,
        kanban_column_id: output === "kanban" ? columnMap[t.kanban_column || "todo"] : null,
        position: i,
      }));
      const { error } = await supabase.from("tasks").insert(rows);
      if (error) throw error;
      toast.success(`${rows.length} تسک ساخته شد`);
      setProposed(null);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "خطا در ساخت تسک‌ها");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] flex flex-col p-0 gap-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-primary" />
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
                <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                <Label className="text-xs">سرچ اینترنت</Label>
                <Switch checked={webSearch} onCheckedChange={setWebSearch} />
              </div>
              <Badge variant="outline" className="ms-auto">{output === "kanban" ? "Kanban" : "List"}</Badge>
            </div>

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
                              {t.due_date && <Badge variant="outline" className="text-[9px] py-0 h-4">{new Date(t.due_date).toLocaleDateString("fa-IR")}</Badge>}
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
                      <Button size="sm" variant="outline" onClick={() => setProposed(null)} className="h-7">انصراف</Button>
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
