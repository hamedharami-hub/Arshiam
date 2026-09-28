import { useState } from "react";
import { Loader2, Sparkles, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBilingual } from "@/hooks/useBilingual";
import { callAI, getAILanguage } from "@/lib/ai";
import { plainTextOf } from "@/lib/diary";

type Props = {
  content: string;
  title: string;
  onApplyContent: (markdown: string) => void;
  onApplyTitle: (title: string) => void;
};

const TEXT_ACTIONS = [
  { key: "improve", fa: "بهبود نگارش با حفظ لحن شخصی", en: "Polish the writing, keep my voice" },
  { key: "fix_grammar", fa: "اصلاح املا و نگارش", en: "Fix spelling and grammar" },
  { key: "expand", fa: "گسترش با جزئیات حسی بیشتر", en: "Expand with more sensory detail" },
  { key: "summarize", fa: "خلاصهٔ کوتاه این روز", en: "Short summary of this day" },
  { key: "poetic", fa: "بازنویسی ادبی و شاعرانه", en: "Rewrite in a literary, poetic tone" },
  { key: "gratitude", fa: "افزودن بخش «سه چیز که سپاسگزارم»", en: "Append a “three things I'm grateful for” section" },
  { key: "reflect", fa: "افزودن پرسش‌های تأملی برای فردا", en: "Append reflective questions for tomorrow" },
];

export function DiaryAiTools({ content, title, onApplyContent, onApplyTitle }: Props) {
  const { T, isEn } = useBilingual();
  const [busy, setBusy] = useState<string | null>(null);
  const [previous, setPrevious] = useState<string | null>(null);

  const run = async (key: string, instruction: string, target: "content" | "title") => {
    if (!plainTextOf(content)) { toast.error(T("اول چند خط از روزت را بنویس", "Write a few lines about your day first")); return; }
    setBusy(key);
    try {
      const context = target === "title"
        ? "این متن یک خاطرهٔ روزانهٔ شخصی است. فقط یک عنوان کوتاه (حداکثر ۸ کلمه) بدون علائم اضافه برگردان."
        : "این متن یک خاطرهٔ روزانهٔ شخصی است. نتیجه را به صورت Markdown برگردان و صمیمیت متن اصلی را نگه دار.";
      const result = await callAI("inline_edit", content, context, instruction, getAILanguage());
      const text = (result.text || "").trim();
      if (!text) throw new Error(T("پاسخ خالی بود", "Empty response"));
      if (target === "title") {
        onApplyTitle(text.replace(/^["'«»#\s]+|["'«»\s]+$/g, "").slice(0, 120));
      } else {
        setPrevious(content);
        onApplyContent(text);
      }
      toast.success(T("اعمال شد ✨", "Applied ✨"));
    } catch (error: any) {
      toast.error(error?.message || T("هوش مصنوعی در دسترس نیست", "AI is not available"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex items-center gap-1" data-testid="diary-ai-tools">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline" className="gap-1.5 bg-background/80" disabled={Boolean(busy)} data-testid="diary-ai-menu">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4 text-primary" />}
            {T("دستیار نوشتن", "Writing assistant")}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-72">
          <DropdownMenuLabel className="text-xs text-muted-foreground">{T("روی کل متن خاطره", "On the whole entry")}</DropdownMenuLabel>
          {TEXT_ACTIONS.map((action) => (
            <DropdownMenuItem key={action.key} data-testid={`diary-ai-${action.key}`} onClick={() => void run(action.key, isEn ? action.en : action.fa, "content")}>
              {isEn ? action.en : action.fa}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem data-testid="diary-ai-title" onClick={() => void run("title", isEn ? "Suggest a short evocative title for this diary entry" : "یک عنوان کوتاه و حسی برای این خاطره پیشنهاد بده", "title")}>
            {T(title ? "پیشنهاد عنوان تازه" : "پیشنهاد عنوان", title ? "Suggest a fresh title" : "Suggest a title")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {previous !== null && (
        <Button type="button" size="sm" variant="ghost" className="gap-1 text-xs" data-testid="diary-ai-undo" onClick={() => { onApplyContent(previous); setPrevious(null); }}>
          <Undo2 className="h-3.5 w-3.5" />{T("بازگردانی", "Undo")}
        </Button>
      )}
    </div>
  );
}
