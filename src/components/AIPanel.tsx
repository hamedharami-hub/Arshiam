import { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useIsMobile } from "@/hooks/use-mobile";

export function AIPanel({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("create");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ title: string; description?: string }[]>([]);
  const [picked, setPicked] = useState<Record<number, boolean>>({});
  const [chat, setChat] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());

  const createTaskFromNL = async () => {
    if (!input.trim() || !user) return;
    setLoading(true);
    try {
      const r = await callAI("parse_task", input, undefined, undefined, aiLang);
      if (!r.data?.title) throw new Error("نتوانست تسک بسازد");
      const { error } = await supabase.from("tasks").insert({
        user_id: user.id,
        title: r.data.title,
        description: r.data.description || null,
        priority: r.data.priority || "none",
        due_date: r.data.due_date || null,
        start_at: r.data.start_at || null,
        end_at: r.data.end_at || null,
      });
      if (error) throw error;
      toast.success("تسک ساخته شد ✨");
      setInput("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const generateNote = async () => {
    if (!input.trim() || !user) return;
    setLoading(true);
    try {
      const r = await callAI("generate_note", input, undefined, undefined, aiLang);
      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        title: input.slice(0, 60),
        content: r.text,
      });
      if (error) throw error;
      toast.success("نوت ساخته شد ✨");
      setInput("");
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const getSuggestions = async () => {
    if (!input.trim()) return;
    setLoading(true); setSuggestions([]); setPicked({});
    try {
      const r = await callAI("suggest", input, undefined, undefined, aiLang);
      if (r.data?.items) setSuggestions(r.data.items);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const addPickedAsTasks = async () => {
    if (!user) return;
    const sel = suggestions.filter((_, i) => picked[i]);
    if (!sel.length) return toast.error("چیزی انتخاب نشده");
    const rows = sel.map((s) => ({ user_id: user.id, title: s.title, description: s.description || null }));
    const { error } = await supabase.from("tasks").insert(rows);
    if (error) toast.error(error.message);
    else { toast.success(`${sel.length} تسک اضافه شد`); setSuggestions([]); setPicked({}); setInput(""); }
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const newMsg = { role: "user" as const, content: chatInput };
    setChat((c) => [...c, newMsg]);
    setChatInput("");
    setLoading(true);
    try {
      // Build minimal context
      const { data: tasks } = await supabase.from("tasks").select("title,priority,due_date,completed").limit(20);
      const ctx = `Recent tasks: ${JSON.stringify(tasks || [])}`;
      const r = await callAI("chat", [...chat, newMsg], ctx, undefined, aiLang);
      setChat((c) => [...c, { role: "assistant", content: r.text }]);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  const body = (
    <>
      <div className="mt-1 flex items-center justify-between p-2 rounded-lg border bg-accent/20">
        <span className="text-sm">زبان پاسخ AI</span>
        <AILangToggle value={aiLang} onChange={setAiLang} />
      </div>

      <Tabs value={tab} onValueChange={setTab} className="mt-4">
        <TabsList className="grid grid-cols-4">
          <TabsTrigger value="create">تسک</TabsTrigger>
          <TabsTrigger value="note">نوت</TabsTrigger>
          <TabsTrigger value="suggest">پیشنهاد</TabsTrigger>
          <TabsTrigger value="chat">چت</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">با زبان طبیعی تسک بساز</p>
          <Textarea placeholder="مثال: فردا ساعت ۱۰ جلسه تیمی، اولویت بالا" value={input}
            onChange={(e) => setInput(e.target.value)} rows={4} />
          <Button onClick={createTaskFromNL} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "ساخت تسک"}
          </Button>
        </TabsContent>

        <TabsContent value="note" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">موضوع نوت رو بگو</p>
          <Textarea placeholder="مثال: راهنمای شروع یوگا برای مبتدی" value={input}
            onChange={(e) => setInput(e.target.value)} rows={4} />
          <Button onClick={generateNote} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تولید نوت Markdown"}
          </Button>
        </TabsContent>

        <TabsContent value="suggest" className="space-y-3 mt-4">
          <p className="text-sm text-muted-foreground">یک موضوع بده، پیشنهاد می‌گیریم</p>
          <Textarea placeholder="مثال: راه‌اندازی کسب‌وکار آنلاین" value={input}
            onChange={(e) => setInput(e.target.value)} rows={3} />
          <Button onClick={getSuggestions} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "پیشنهاد بگیر"}
          </Button>

          {suggestions.length > 0 && (
            <div className="space-y-2 mt-4">
              {suggestions.map((s, i) => (
                <Card key={i} className="p-3 flex gap-3 items-start cursor-pointer hover:bg-accent/30"
                  onClick={() => setPicked((p) => ({ ...p, [i]: !p[i] }))}>
                  <Checkbox checked={picked[i] || false} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{s.title}</p>
                    {s.description && <p className="text-xs text-muted-foreground mt-0.5">{s.description}</p>}
                  </div>
                </Card>
              ))}
              <Button onClick={addPickedAsTasks} className="w-full mt-2" variant="default">
                افزودن انتخاب‌شده‌ها به تسک‌ها
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="chat" className="mt-4 flex flex-col h-[55vh]">
          <div dir="rtl" className="flex-1 overflow-y-auto space-y-2 mb-2">
            {chat.length === 0 && <p className="text-sm text-muted-foreground text-center mt-8">سؤالی درباره تسک‌هات بپرس</p>}
            {chat.map((m, i) => (
              <div key={i} dir="rtl" className={`p-3 rounded-2xl text-end leading-7 ${m.role === "user" ? "bg-primary/10 ms-8" : "bg-muted me-8"}`}>
                <div className="text-xs prose-note">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              </div>
            ))}
            {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
          </div>
          <div className="flex gap-2">
            <Input dir="rtl" value={chatInput} onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="بپرس..." />
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
            <Sparkles className="w-5 h-5 text-primary" /> دستیار AI
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
            <Sparkles className="w-5 h-5 text-primary" /> دستیار AI
          </SheetTitle>
        </SheetHeader>
        {body}
      </SheetContent>
    </Sheet>
  );
}

