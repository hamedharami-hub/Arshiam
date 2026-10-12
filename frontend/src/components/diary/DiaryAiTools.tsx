import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBilingual } from "@/hooks/useBilingual";
import { callAI, getAILanguage } from "@/lib/ai";
import { plainTextOf } from "@/lib/diary";

type Props = {
  /** Identity of the entry the tools are operating on. Requests are scoped to it. */
  entryId: string;
  /** Monotonic revision of the editor. A result from an older revision is ignored. */
  revision: number;
  content: string;
  title: string;
  onApplyContent: (markdown: string) => void;
  onApplyTitle: (title: string) => void;
};

type RequestScope = { entryId: string; revision: number; content: string };

const TEXT_ACTIONS = [
  { key: "improve", fa: "بهبود نگارش با حفظ لحن شخصی", en: "Polish the writing, keep my voice" },
  { key: "fix_grammar", fa: "اصلاح املا و نگارش", en: "Fix spelling and grammar" },
  { key: "expand", fa: "گسترش با جزئیات حسی بیشتر", en: "Expand with more sensory detail" },
  { key: "summarize", fa: "خلاصهٔ کوتاه این روز", en: "Short summary of this day" },
  { key: "poetic", fa: "بازنویسی ادبی و شاعرانه", en: "Rewrite in a literary, poetic tone" },
  { key: "gratitude", fa: "افزودن بخش «سه چیز که سپاسگزارم»", en: "Append a “three things I'm grateful for” section" },
  { key: "reflect", fa: "افزودن پرسش‌های تأملی برای فردا", en: "Append reflective questions for tomorrow" },
];

export function DiaryAiTools({ entryId, revision, content, title, onApplyContent, onApplyTitle }: Props) {
  const { T, isEn } = useBilingual();
  const [busy, setBusy] = useState<string | null>(null);
  // Undo is scoped to the entry (and the exact AI-produced text it reverts), so it
  // can never be applied to a different entry or clobber newer edits.
  const [previous, setPrevious] = useState<{ entryId: string; applied: string; base: string } | null>(null);
  // A reviewable proposal replaces the old "apply immediately" behaviour.
  const [proposal, setProposal] = useState<{ scope: RequestScope; text: string } | null>(null);
  const scopeRef = useRef<RequestScope>({ entryId, revision, content });
  scopeRef.current = { entryId, revision, content };

  // Reset transient AI state when the open entry changes.
  useEffect(() => {
    setBusy(null);
    setProposal(null);
  }, [entryId]);

  const run = async (key: string, instruction: string, target: "content" | "title") => {
    if (!plainTextOf(content)) { toast.error(T("اول چند خط از روزت را بنویس", "Write a few lines about your day first")); return; }
    const request: RequestScope = { entryId, revision, content };
    setBusy(key);
    try {
      const context = target === "title"
        ? "این متن یک خاطرهٔ روزانهٔ شخصی است. فقط یک عنوان کوتاه (حداکثر ۸ کلمه) بدون علائم اضافه برگردان."
        : "این متن یک خاطرهٔ روزانهٔ شخصی است. نتیجه را به صورت Markdown برگردان و صمیمیت متن اصلی را نگه دار.";
      const result = await callAI("inline_edit", content, context, instruction, getAILanguage());
      const text = (result.text || "").trim();
      if (!text) throw new Error(T("پاسخ خالی بود", "Empty response"));
      // Ignore a result that is no longer about the entry/revision that requested it.
      const current = scopeRef.current;
      if (current.entryId !== request.entryId || current.revision !== request.revision || current.content !== request.content) return;
      if (target === "title") {
        onApplyTitle(text.replace(/^["'«»#\s]+|["'«»\s]+$/g, "").slice(0, 120));
        toast.success(T("اعمال شد ✨", "Applied ✨"));
      } else {
        setProposal({ scope: request, text });
      }
    } catch (error: any) {
      toast.error(error?.message || T("هوش مصنوعی در دسترس نیست", "AI is not available"));
    } finally {
      setBusy(null);
    }
  };

  const discardProposal = () => setProposal(null);

  const applyProposal = () => {
    if (!proposal) return;
    const { scope, text } = proposal;
    // The proposal is only valid while we are still on the same entry/revision.
    if (scope.entryId !== entryId || scope.revision !== revision || scope.content !== content) {
      setProposal(null);
      return;
    }
    setPrevious({ entryId: scope.entryId, applied: text, base: scope.content });
    setProposal(null);
    onApplyContent(text);
    toast.success(T("اعمال شد ✨", "Applied ✨"));
  };

  const undo = () => {
    if (!previous) return;
    if (previous.entryId !== entryId || content !== previous.applied) {
      setPrevious(null);
      return;
    }
    const base = previous.base;
    setPrevious(null);
    onApplyContent(base);
  };

  const canUndo = Boolean(previous && previous.entryId === entryId && content === previous.applied);
  const visibleProposal = proposal && proposal.scope.entryId === entryId && proposal.scope.revision === revision && proposal.scope.content === content ? proposal : null;

  return (
    <div className="flex flex-col items-start gap-1" data-testid="diary-ai-tools">
      <div className="flex items-center gap-1">
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
        {canUndo && (
          <Button type="button" size="sm" variant="ghost" className="gap-1 text-xs" data-testid="diary-ai-undo" onClick={undo}>
            <Undo2 className="h-3.5 w-3.5" />{T("بازگردانی", "Undo")}
          </Button>
        )}
      </div>

      {visibleProposal && (
        <div className="w-full max-w-md rounded-md border border-primary/30 bg-background/90 p-2 text-xs shadow-sm" data-testid="diary-ai-proposal" role="group" aria-label={T("پیشنهاد دستیار نوشتن", "Writing assistant proposal")}>
          <p className="mb-1.5 font-medium text-muted-foreground">{T("پیشنهاد (بازبینی و اعمال)", "Proposal (review and apply)")}</p>
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap break-words leading-relaxed" dir="auto">{visibleProposal.text}</p>
          <div className="mt-2 flex items-center gap-1.5">
            <Button type="button" size="sm" className="h-7 gap-1 text-xs" data-testid="diary-ai-apply" onClick={applyProposal}>
              <Check className="h-3.5 w-3.5" />{T("اعمال", "Apply")}
            </Button>
            <Button type="button" size="sm" variant="ghost" className="h-7 gap-1 text-xs" data-testid="diary-ai-discard" onClick={discardProposal}>
              <X className="h-3.5 w-3.5" />{T("رد", "Discard")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
