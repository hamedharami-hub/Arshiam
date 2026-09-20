import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Brain, Send, AlertCircle, BookOpen, RotateCcw } from "lucide-react";
import { detectCrisis } from "@/lib/crisisDetection";
import { useBilingual } from "@/hooks/useBilingual";
import { useAuth } from "@/hooks/useAuth";
import { callAI } from "@/lib/ai";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM_FA = `You are a Socratic questioner in Persian (Farsi). Strict rules:
1. NEVER give conclusions, advice, or recommendations.
2. ONLY ask open-ended questions.
3. Maximum 2 sentences per response.
4. Help the user discover logical contradictions in their own thinking through questions.
5. Focus on evidence, not emotions.
6. If user shows crisis signals (self-harm, hopelessness), STOP questioning and respond: "این چیزی که گفتی مهمه. لطفاً همین الان با اورژانس اجتماعی ۱۲۳ یا یک متخصص سلامت روان تماس بگیر."`;

const SYSTEM_EN = `You are a Socratic questioner in English. Strict rules:
1. NEVER give conclusions, advice, or recommendations.
2. ONLY ask open-ended questions.
3. Maximum 2 sentences per response.
4. Help the user discover logical contradictions in their own thinking through questions.
5. Focus on evidence, not emotions.
6. If user shows crisis signals (self-harm, hopelessness), STOP questioning and respond: "What you shared is very important. Please reach out right now to a crisis helpline (such as 988 or your local emergency services) or a mental health professional."`;

export default function SocraticView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const chatKey = `socratic_chat_${user?.id || "guest"}`;

  const defaultGreeting: Msg = {
    role: "assistant",
    content: isEn ? "What thought or situation is on your mind right now?" : "چه فکر یا موقعیتی الان ذهن تو را مشغول کرده؟",
  };

  const [messages, setMessages] = useState<Msg[]>(() => {
    try {
      const stored = localStorage.getItem(chatKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [defaultGreeting];
  });

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(chatKey, JSON.stringify(messages));
    } catch {}
  }, [messages, chatKey]);

  function resetChat() {
    const initial = [defaultGreeting];
    setMessages(initial);
    try {
      localStorage.setItem(chatKey, JSON.stringify(initial));
    } catch {}
    toast.success(T("گفتگو پاک شد", "Conversation cleared"));
  }

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();

    if (detectCrisis(text)) {
      const crisisWarning = isEn
        ? "What you shared is important. Please connect with a mental health professional or call your local crisis helpline (e.g. 988)."
        : "این چیزی که گفتی مهمه. لطفاً با یک متخصص یا خط اورژانس اجتماعی (۱۲۳) صحبت کن.";
      setMessages((m) => [...m, { role: "user", content: text },
        { role: "assistant", content: crisisWarning }]);
      setInput("");
      return;
    }

    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const historyContext = newMsgs
        .slice(-8)
        .map((m) => `${m.role === "user" ? (isEn ? "User" : "کاربر") : (isEn ? "Socratic Guide" : "راهنمای سقراطی")}: ${m.content}`)
        .join("\n");

      const res = await callAI(
        "socratic",
        text,
        historyContext,
        undefined,
        isEn ? "en" : "fa"
      );
      const replyText = typeof res === "string" ? res : (res?.text || "...");
      setMessages((m) => [...m, { role: "assistant", content: replyText }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 100);
    } catch (e: any) {
      toast.error(e.message || T("خطا در برقراری ارتباط", "Connection error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="max-w-3xl mx-auto p-4 md:p-8 space-y-4 h-[calc(100dvh-2rem)] flex flex-col">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-500" /> {T("چت سقراطی", "Socratic Dialogue")}</h1>
          <p className="text-muted-foreground text-xs">{T("AI فقط سؤال می‌پرسد — تو خودت به بینش می‌رسی.", "AI only asks questions — guiding you to your own insights.")}</p>
        </div>
        {messages.length > 1 && (
          <Button variant="ghost" size="sm" onClick={resetChat} title={T("شروع دوباره", "Start fresh")}>
            <RotateCcw className="w-4 h-4 me-1" />
            <span className="text-xs">{T("پاک کردن", "Reset")}</span>
          </Button>
        )}
      </div>

      {/* راهنمای کامل */}
      <Card className="border-primary/20 shrink-0">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-start text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium">{T("راهنمای کامل: روش سقراطی چیست و چگونه استفاده کنم؟", "Complete Guide: What is the Socratic Method & How to Use It?")}</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🏛️ روش سقراطی چیست؟", "🏛️ What is the Socratic Method?")}</div>
                  <p className="text-muted-foreground">
                    {T(
                      "۲۴۰۰ سال پیش سقراط متوجه شد بهترین یادگیری وقتی اتفاق می‌افتد که فردی به‌جای دادن جواب، سؤال درست بپرسد. در روان‌درمانی شناختی، این روش پایه‌ی «گفت‌وگوی هدایت‌شده» است: AI پاسخ نمی‌دهد، فقط سؤال‌هایی می‌پرسد که خودت تناقض‌ها و فرض‌های پنهان فکرت را ببینی.",
                      "2,400 years ago, Socrates discovered that profound learning occurs when one is prompted with insightful questions rather than fed direct answers. In cognitive therapy, this forms the foundation of 'Guided Discovery': AI asks targeted questions so you uncover implicit assumptions and contradictions on your own."
                    )}
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("🎯 چه زمانی استفاده کنم؟", "🎯 When should I use it?")}</div>
                  <ul className="text-muted-foreground list-disc pe-5 space-y-1">
                    <li>{T("وقتی یک فکر اذیت‌کننده گیرت کرده و نمی‌توانی از زاویه‌ی دیگری ببینی.", "When trapped in a distressing thought loop and struggling to see other angles.")}</li>
                    <li>{T("وقتی بین دو تصمیم گیر کرده‌ای و فرض‌های ضمنی‌ات را نمی‌شناسی.", "When torn between decisions and wanting to clarify implicit assumptions.")}</li>
                    <li>{T("وقتی می‌خواهی یک «باور قطعی» را آزمایش کنی: واقعاً این درست است؟", "When testing a rigid belief: is it objectively accurate?")}</li>
                    <li>{T("برای پردازش احساسات بدون توصیه گرفتن؛ خودت باید به بینش برسی.", "To process feelings without unrequested advice; arriving at your own clarity.")}</li>
                  </ul>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">{T("💡 چگونه بهترین نتیجه را بگیرم؟", "💡 How to get the best outcome?")}</div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-1">
                    <li>{T("با یک «فکر یا موقعیت مشخص» شروع کن، نه پرسش کلی.", "Start with a specific thought or situation, not a broad philosophical query.")}</li>
                    <li>{T("به سؤال‌های AI صادقانه پاسخ بده، حتی اگر اول دفاعی شدی.", "Answer questions candidly, even if initial defensiveness arises.")}</li>
                    <li>{T("اگر سؤالی برایت سخت بود، همان لحظه‌ی سکوت، نقطه‌ی بینش است.", "If a question feels difficult, that hesitation is often where insight blooms.")}</li>
                    <li>{T("۱۰ تا ۱۵ پیام معمولاً برای رسیدن به یک «دیدِ تازه» کافی است.", "10 to 15 exchanges are usually sufficient to reach a breakthrough.")}</li>
                  </ol>
                </section>
                <section className="bg-muted/40 rounded-lg p-3">
                  <div className="font-semibold text-foreground mb-1">{T("⚠️ این روش جایگزین درمان نیست", "⚠️ Not a Substitute for Therapy")}</div>
                  <p className="text-muted-foreground text-xs">
                    {T(
                      "اگر حال روحی‌ات بحرانی است یا افکار آسیب به خود داری، با اورژانس اجتماعی ۱۲۳ تماس بگیر.",
                      "If you are in distress or having thoughts of self-harm, please reach out immediately to a local crisis lifeline (e.g. 988 or 123)."
                    )}
                  </p>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div dir={isEn ? "ltr" : "rtl"} className="space-y-4">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  dir="auto"
                  style={{ unicodeBidi: "plaintext" }}
                  className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm leading-7 whitespace-pre-wrap break-words ${
                    m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                  }`}
                >{m.content}</div>
              </div>
            ))}
            {loading && <div className="text-xs text-muted-foreground">{T("در حال فکر کردن…", "Thinking…")}</div>}
          </div>
        </ScrollArea>
        <div className="border-t p-3 flex gap-2">
          <Input dir="auto" style={{ unicodeBidi: "plaintext" } as any} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} placeholder={T("پاسخ تو…", "Your response…")} disabled={loading} />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3 text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            {T(
              "این روش کمک به خودکاوی است، نه درمان. در صورت نیاز فوری به کمک با اورژانس اجتماعی ۱۲۳ تماس بگیر.",
              "This tool promotes self-reflection, not clinical treatment. If in urgent need of assistance, contact your local emergency or mental health helpline."
            )}
          </span>
        </CardContent>
      </Card>
    </div>
  );
}
