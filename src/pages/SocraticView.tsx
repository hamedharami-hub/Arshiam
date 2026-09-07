import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { Brain, Send, AlertCircle, BookOpen } from "lucide-react";
import { detectCrisis } from "@/lib/crisisDetection";

import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const SYSTEM = `You are a Socratic questioner in Persian (Farsi). Strict rules:
1. NEVER give conclusions, advice, or recommendations.
2. ONLY ask open-ended questions.
3. Maximum 2 sentences per response.
4. Help the user discover logical contradictions in their own thinking through questions.
5. Focus on evidence, not emotions.
6. If user shows crisis signals (self-harm, hopelessness), STOP questioning and respond: "این چیزی که گفتی مهمه. لطفاً همین الان با اورژانس اجتماعی ۱۲۳ یا یک متخصص سلامت روان تماس بگیر."`;

export default function SocraticView() {
  const { user } = { user: null as any };
  const [messages, setMessages] = useState<Msg[]>([
    { role: "assistant", content: "چه فکر یا موقعیتی الان ذهن تو را مشغول کرده؟" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  async function send() {
    if (!input.trim() || loading) return;
    const text = input.trim();

    if (detectCrisis(text)) {
      setMessages((m) => [...m, { role: "user", content: text },
        { role: "assistant", content: "این چیزی که گفتی مهمه. لطفاً با یک متخصص یا خط اورژانس اجتماعی (۱۲۳) صحبت کن." }]);
      setInput("");
      return;
    }

    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("ai-assistant", {
        body: {
          mode: "chat",
          input: [{ role: "system", content: SYSTEM }, ...newMsgs.map((m) => ({ role: m.role, content: m.content }))],
          language: "fa",
        },
      });
      if (error) throw error;
      setMessages((m) => [...m, { role: "assistant", content: data?.text || "..." }]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: 999999, behavior: "smooth" }), 100);
    } catch (e: any) {
      toast.error(e.message || "خطا");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="max-w-3xl mx-auto p-4 md:p-8 space-y-4 h-[calc(100dvh-2rem)] flex flex-col">
      <div>
        <h1 className="text-2xl font-bold mb-1 flex items-center gap-2"><Brain className="w-6 h-6 text-purple-500" /> چت سقراطی</h1>
        <p className="text-muted-foreground text-xs">AI فقط سؤال می‌پرسد — تو خودت به بینش می‌رسی.</p>
      </div>

      {/* راهنمای کامل */}
      <Card className="border-primary/20 shrink-0">
        <CardContent className="p-0">
          <Accordion type="single" collapsible>
            <AccordionItem value="guide" className="border-0">
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-end text-sm">
                  <BookOpen className="w-4 h-4 text-primary" />
                  <span className="font-medium">راهنمای کامل: روش سقراطی چیست و چگونه استفاده کنم؟</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 space-y-3 text-sm leading-7">
                <section>
                  <div className="font-semibold text-foreground mb-1">🏛️ روش سقراطی چیست؟</div>
                  <p className="text-muted-foreground">
                    ۲۴۰۰ سال پیش سقراط متوجه شد بهترین یادگیری وقتی اتفاق می‌افتد که فردی به‌جای دادن
                    جواب، سؤال درست بپرسد. در روان‌درمانی شناختی، این روش پایه‌ی «گفت‌وگوی هدایت‌شده»
                    است: AI پاسخ نمی‌دهد، فقط سؤال‌هایی می‌پرسد که خودت تناقض‌ها و فرض‌های پنهان فکرت
                    را ببینی.
                  </p>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">🎯 چه زمانی استفاده کنم؟</div>
                  <ul className="text-muted-foreground list-disc pe-5 space-y-1">
                    <li>وقتی یک فکر اذیت‌کننده گیرت کرده و نمی‌توانی از زاویه‌ی دیگری ببینی.</li>
                    <li>وقتی بین دو تصمیم گیر کرده‌ای و فرض‌های ضمنی‌ات را نمی‌شناسی.</li>
                    <li>وقتی می‌خواهی یک «باور قطعی» را آزمایش کنی: واقعاً این درست است؟</li>
                    <li>برای پردازش احساسات بدون توصیه گرفتن؛ خودت باید به بینش برسی.</li>
                  </ul>
                </section>
                <section>
                  <div className="font-semibold text-foreground mb-1">💡 چگونه بهترین نتیجه را بگیرم؟</div>
                  <ol className="text-muted-foreground list-decimal pe-5 space-y-1">
                    <li>با یک «فکر یا موقعیت مشخص» شروع کن، نه پرسش کلی.</li>
                    <li>به سؤال‌های AI صادقانه پاسخ بده، حتی اگر اول دفاعی شدی.</li>
                    <li>اگر سؤالی برایت سخت بود، همان لحظه‌ی سکوت، نقطه‌ی بینش است.</li>
                    <li>۱۰ تا ۱۵ پیام معمولاً برای رسیدن به یک «دیدِ تازه» کافی است.</li>
                  </ol>
                </section>
                <section className="bg-muted/40 rounded-lg p-3">
                  <div className="font-semibold text-foreground mb-1">⚠️ این روش جایگزین درمان نیست</div>
                  <p className="text-muted-foreground text-xs">
                    اگر حال روحی‌ات بحرانی است یا افکار آسیب به خود داری، با اورژانس اجتماعی <span className="ltr">۱۲۳</span> تماس بگیر.
                  </p>
                </section>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef as any}>
          <div dir="rtl" className="space-y-4">
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
            {loading && <div className="text-xs text-muted-foreground">در حال فکر کردن…</div>}
          </div>
        </ScrollArea>
        <div className="border-t p-3 flex gap-2">
          <Input dir="auto" style={{ unicodeBidi: "plaintext" } as any} value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()} placeholder="پاسخ تو…" disabled={loading} />
          <Button onClick={send} disabled={loading || !input.trim()} size="icon"><Send className="w-4 h-4" /></Button>
        </div>
      </Card>

      <Card className="bg-muted/30">
        <CardContent className="p-3 text-xs flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>این روش کمک به خودکاوی است، نه درمان. در صورت نیاز فوری به کمک با اورژانس اجتماعی <span className="ltr">۱۲۳</span> تماس بگیر.</span>
        </CardContent>
      </Card>
    </div>
  );
}
