import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Brain,
  Send,
  BookOpen,
  RotateCcw,
  CheckCircle2,
  FileText,
  ListPlus,
  Loader2,
  Download,
  ShieldAlert,
} from "lucide-react";
import { detectCrisis } from "@/lib/crisisDetection";
import { resolveSupportRegion } from "@/lib/crisisResources";
import { useBilingual } from "@/hooks/useBilingual";
import { useAuth } from "@/hooks/useAuth";
import { createTaskFromMind } from "@/lib/taskFromMind";
import { toast } from "sonner";
import { createMindAIContext } from "@/lib/mindAI/contextBuilder";
import { executeMindAI } from "@/lib/mindAI/executor";
import type { SocraticDialogueOutput, SocraticSummaryOutput } from "@/lib/mindAI/types";
import {
  subscribeSocraticSession,
  saveSocraticSession,
  clearSocraticSession,
  type SocraticMessageItem,
} from "@/lib/firestoreDataService";

export default function SocraticView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const chatKey = `socratic_chat_${user?.id || "guest"}`;

  const defaultGreeting: SocraticMessageItem = {
    role: "assistant",
    content: isEn
      ? "What thought or situation is on your mind right now?"
      : "چه فکر، موضوع یا تصمیمی الان ذهن تو را به خود مشغول کرده است؟",
    timestamp: new Date().toISOString(),
    provenance: "ai_suggestion",
  };

  const [messages, setMessages] = useState<SocraticMessageItem[]>([defaultGreeting]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [summarizing, setSummarizing] = useState(false);
  const [migrated, setMigrated] = useState(false);
  const [crisisInterrupted, setCrisisInterrupted] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const draftTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Subscribe to Firebase Firestore session
  useEffect(() => {
    if (!user) {
      // Guest mode: fallback to localStorage
      try {
        const stored = localStorage.getItem(chatKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) setMessages(parsed);
        }
      } catch {}
      return;
    }

    const unsub = subscribeSocraticSession(user.id, (session) => {
      if (session) {
        if (Array.isArray(session.messages) && session.messages.length > 0) {
          setMessages(session.messages);
        } else {
          setMessages([defaultGreeting]);
        }
        setSummary(session.summary ?? null);
        if (session.draft_text) {
          setInput((prev) => (!prev ? session.draft_text! : prev));
        }
      } else if (!migrated) {
        // Initial migration from localStorage if exists
        try {
          const stored = localStorage.getItem(chatKey);
          if (stored) {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed) && parsed.length > 0) {
              setMessages(parsed);
              saveSocraticSession(user.id, { messages: parsed });
              setMigrated(true);
              return;
            }
          }
        } catch {}
        setMessages([defaultGreeting]);
      }
    });

    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, chatKey]);

  // Keep localStorage as local offline backup
  useEffect(() => {
    try {
      localStorage.setItem(chatKey, JSON.stringify(messages));
    } catch {}
  }, [messages, chatKey]);

  // Debounced draft save to Firestore
  function handleInputChange(val: string) {
    setInput(val);
    if (!user) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      saveSocraticSession(user.id, { draft_text: val });
    }, 1500);
  }

  async function resetChat() {
    const initial = [defaultGreeting];
    setMessages(initial);
    setSummary(null);
    setInput("");
    try {
      localStorage.setItem(chatKey, JSON.stringify(initial));
    } catch {}
    if (user) {
      await clearSocraticSession(user.id);
    }
    toast.success(T("گفتگو پاک شد", "Conversation cleared"));
  }

  function exportDialogue() {
    if (messages.length <= 1) {
      toast.info(T("گفتگویی برای خروجی وجود ندارد", "No conversation to export"));
      return;
    }
    const lines = [
      `# ${isEn ? "Socratic Dialogue Export" : "خروجی گفتگوی سقراطی"}`,
      `_${new Date().toLocaleString(isEn ? "en-US" : "fa-IR")}_\n`,
    ];
    if (summary) {
      lines.push(`## ${isEn ? "Summary" : "جمع‌بندی"}`);
      lines.push(`${summary}\n`);
    }
    lines.push(`## ${isEn ? "Dialogue" : "گفتگو"}`);
    for (const m of messages) {
      const sender = m.role === "user" ? (isEn ? "You" : "شما") : (isEn ? "Socratic Guide" : "راهنمای سقراطی");
      lines.push(`**${sender}:** ${m.content}\n`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `socratic-dialogue-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(T("فایل با موفقیت دانلود شد", "Export downloaded"));
  }

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();

    if (detectCrisis(text)) {
      setCrisisInterrupted(true);
      const region = resolveSupportRegion(isEn ? "en" : "fa");
      let crisisWarning = "";
      if (region === "au") {
        crisisWarning = isEn
          ? "What you shared is very important and you do not have to carry this alone. Please connect with free, 24/7 crisis support: Lifeline Australia on 13 11 14, or call Triple Zero (000) if you are in immediate danger."
          : "این چیزی که گفتی بسیار مهمه و تنها نیستی. لطفاً بلافاصله با خطوط حمایتی رایگان تماس بگیر: لایف‌لاین استرالیا (13 11 14) یا در صورت خطر فوری با اورژانس (000).";
      } else if (region === "ir") {
        crisisWarning = isEn
          ? "What you shared is very important and you do not have to carry this alone. Please reach out to social emergency services (123), welfare counseling (1480), or medical emergency (115) immediately."
          : "این چیزی که گفتی بسیار مهمه و تنها نیستی. لطفاً بلافاصله با خطوط حمایتی تماس بگیر: اورژانس اجتماعی (۱۲۳)، صدای مشاور بهزیستی (۱۴۸۰)، یا در شرایط خطر فوری با اورژانس (۱۱۵).";
      } else {
        crisisWarning = isEn
          ? "What you shared is very important and you do not have to carry this alone. Please connect with free, confidential crisis support right away: 988 Suicide & Crisis Lifeline, or emergency services (911 / 112)."
          : "این چیزی که گفتی بسیار مهمه و تنها نیستی. لطفاً بلافاصله با خطوط حمایتی و اورژانس محلی خود تماس بگیر (۹۸۸ یا ۱۱۲).";
      }
      const updated: SocraticMessageItem[] = [
        ...messages,
        { role: "user", content: text, timestamp: new Date().toISOString(), provenance: "user_report" },
        { role: "assistant", content: crisisWarning, timestamp: new Date().toISOString(), provenance: "ai_suggestion" },
      ];
      setMessages(updated);
      setInput("");
      if (user) {
        saveSocraticSession(user.id, { messages: updated, draft_text: "" });
      }
      return;
    }

    const userMsg: SocraticMessageItem = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
      provenance: "user_report",
    };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    if (user) {
      saveSocraticSession(user.id, { messages: newMsgs, draft_text: "" });
    }

    try {
      const ctx = createMindAIContext({
        operation: "socratic_dialogue",
        promptVersion: "socratic_v2.0",
        language: isEn ? "en" : "fa",
        tool: "socratic",
        fields: {
          user_message: { value: text, provenance: "user_report" },
        },
        relevantHistory: newMsgs.slice(-10).map((m) => ({
          tool: "socratic",
          timestamp: m.timestamp || new Date().toISOString(),
          summary: `${m.role === "user" ? "User" : "Socratic"}: ${m.content}`,
          provenance: m.provenance || (m.role === "user" ? "user_report" : "ai_suggestion"),
        })),
      });

      const res = await executeMindAI<SocraticDialogueOutput>(ctx);
      const d = res.data;
      const replyText = d.observationOrEmpathy
        ? `${d.observationOrEmpathy} ${d.question}`
        : d.question;

      const assistantMsg: SocraticMessageItem = {
        role: "assistant",
        content: replyText,
        timestamp: new Date().toISOString(),
        provenance: "ai_suggestion",
      };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs);
      if (user) {
        saveSocraticSession(user.id, { messages: finalMsgs });
      }
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 100);
    } catch (e: any) {
      toast.error(e.message || T("خطا در برقراری ارتباط", "Connection error"));
    } finally {
      setLoading(false);
    }
  }

  async function handleSummarize() {
    if (messages.length <= 2) {
      toast.error(T("برای جمع‌بندی حداقل چند پیام لازم است", "A few messages are needed for a summary"));
      return;
    }
    setSummarizing(true);
    try {
      const ctx = createMindAIContext({
        operation: "socratic_summary",
        promptVersion: "socratic_summary_v1.0",
        language: isEn ? "en" : "fa",
        tool: "socratic",
        fields: {
          conversation: {
            value: messages.map((m) => `${m.role === "user" ? "User" : "Socratic"}: ${m.content}`).join("\n"),
            provenance: "user_report",
          },
        },
      });

      const res = await executeMindAI<SocraticSummaryOutput>(ctx);
      const d = res.data;
      const bulletText = [
        ...d.key_insights.map((k) => `• ${k}`),
        d.potential_next_step
          ? isEn
            ? `• Next step: ${d.potential_next_step}`
            : `• اقدام بعدی: ${d.potential_next_step}`
          : null,
        d.user_agency_note ? `\n_${d.user_agency_note}_` : null,
      ]
        .filter(Boolean)
        .join("\n");

      setSummary(bulletText);
      if (user) {
        saveSocraticSession(user.id, { summary: bulletText });
      }
      toast.success(T("جمع‌بندی آماده شد", "Summary ready"));
    } catch (e: any) {
      toast.error(e.message || T("خطا در جمع‌بندی", "Summary error"));
    } finally {
      setSummarizing(false);
    }
  }

  return (
    <div
      dir={isEn ? "ltr" : "rtl"}
      className="max-w-3xl mx-auto p-4 md:p-8 space-y-4 h-[calc(100dvh-2rem)] flex flex-col"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-500" />
            {T("چت و چالش سقراطی", "Socratic Dialogue")}
          </h1>
          <p className="text-muted-foreground text-xs">
            {T(
              "پرسشگری هدایت‌شده: هر بار فقط یک سؤال باز، بدون قضاوت و بدون پیش‌فرض تناقض.",
              "Guided inquiry: One open question at a time, curious and non-judgmental."
            )}
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          {messages.length > 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSummarize}
              disabled={summarizing}
              className="text-xs"
            >
              {summarizing ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin me-1" />
              ) : (
                <FileText className="w-3.5 h-3.5 me-1" />
              )}
              {T("جمع‌بندی", "Summarize")}
            </Button>
          )}
          {messages.length > 1 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={exportDialogue}
                title={T("خروجی گرفتن", "Export dialogue")}
                className="text-xs"
              >
                <Download className="w-3.5 h-3.5 me-1" />
                {T("خروجی", "Export")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetChat}
                title={T("شروع دوباره", "Start fresh")}
              >
                <RotateCcw className="w-4 h-4 me-1" />
                <span className="text-xs">{T("پاک کردن", "Reset")}</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Guide Accordion */}
      <Card className="border-primary/20 shrink-0">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-4 py-2.5 hover:no-underline text-xs">
                <div className="flex items-center gap-2 text-start">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium">
                    {T("روش سقراطی در اینجا چگونه کار می‌کند؟", "How does this Socratic dialogue work?")}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3 space-y-2 text-xs leading-relaxed text-muted-foreground">
                <p>
                  {T(
                    "در این بخش، هوش مصنوعی راه‌حل یا نصیحت ارائه نمی‌دهد و فرض نمی‌کند فکر شما اشتباه است. هدف، شفاف‌سازی فرضیات درونی با پاسخ به سؤال‌های باز است. شما در هر لحظه می‌توانید گفتگو را پایان دهید یا جمع‌بندی کنید.",
                    "Here, the AI never dispenses advice or presumes your thought is faulty. It merely asks open-ended questions so you explore your own assumptions. You can conclude or summarize at any time."
                  )}
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Summary Box (if generated) */}
      {summary && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 text-xs space-y-2 shrink-0 animate-fade-in">
          <div className="flex items-center justify-between font-semibold text-primary">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              {T("جمع‌بندی گفت‌وگو:", "Dialogue Summary:")}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-[11px]"
              onClick={async () => {
                if (!user) return;
                const res = await createTaskFromMind({
                  user_id: user.id,
                  title: (isEn ? "Action from Socratic Dialogue" : "اقدام حاصل از گفتگوی سقراطی").slice(0, 120),
                  description: summary,
                  due_in_days: 1,
                  source_type: "cbt_thought",
                });
                if (res.ok) toast.success(T("تسک ایجاد شد", "Task created"));
              }}
            >
              <ListPlus className="w-3 h-3 me-1" />
              {T("تبدیل به تسک", "Convert to Task")}
            </Button>
          </div>
          <p className="leading-relaxed whitespace-pre-line text-foreground/90">{summary}</p>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 p-3 rounded-2xl border bg-card/40"
      >
        {messages.map((m, idx) => {
          const isUser = m.role === "user";
          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
            >
              <div
                className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${
                  isUser
                    ? "bg-primary text-primary-foreground rounded-ee-xs"
                    : "bg-muted/80 text-foreground border border-border/60 rounded-es-xs"
                }`}
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl p-3 bg-muted/60 text-xs text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
              <span>{T("در حال تأمل و طرح سؤال...", "Thinking...")}</span>
            </div>
          </div>
        )}
      </div>

      {/* Crisis Interruption Banner */}
      {crisisInterrupted && (
        <div
          className="p-3.5 rounded-xl border-2 border-rose-500/70 bg-rose-500/10 flex items-center justify-between gap-3 shrink-0 animate-fade-in shadow-xs"
          data-testid="socratic-crisis-banner"
        >
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
            <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
            <span>
              {T(
                "پشتیبانی فوری و خطوط امداد بحران در دسترس است. تنها نیستی.",
                "Immediate crisis support and emergency helplines are available. You are not alone."
              )}
            </span>
          </div>
          <Button asChild size="sm" variant="destructive" className="h-8 text-xs shrink-0 font-bold gap-1 shadow-xs">
            <Link to="/app/crisis">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{T("مشاهده خطوط بحران (SOS)", "Open Crisis Page (SOS)")}</span>
            </Link>
          </Button>
        </div>
      )}

      {/* Input Field */}
      <div className="flex gap-2 shrink-0 pt-1">
        <Input
          value={input}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          placeholder={T("پاسخ یا فکرت را بنویس...", "Type your response...")}
          className="text-sm"
          disabled={loading}
        />
        <Button onClick={send} disabled={!input.trim() || loading} size="icon" className="shrink-0">
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
