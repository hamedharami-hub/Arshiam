import { useEffect, useRef, useState } from "react";
import { Check, Loader2, Sparkles, Undo2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useBilingual } from "@/hooks/useBilingual";
import { callAI, getAILanguage } from "@/lib/ai";
import { plainTextOf } from "@/lib/diary";
import { useAuth } from "@/hooks/useAuth";

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

type RequestScope = { ownerId: string | null; entryId: string; revision: number; content: string; title: string };

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
  const { user } = useAuth();
  const ownerId = user?.id ?? null;
  const [busy, setBusy] = useState<string | null>(null);
  // Undo is scoped to the entry (and the exact AI-produced text it reverts), so it
  // can never be applied to a different entry or clobber newer edits.
  const [previous, setPrevious] = useState<{ ownerId: string | null; entryId: string; target: "content" | "title"; applied: string; base: string } | null>(null);
  // A reviewable proposal replaces the old "apply immediately" behaviour.
  const [proposal, setProposal] = useState<{ scope: RequestScope; text: string; target: "content" | "title" } | null>(null);
  const scopeRef = useRef<RequestScope>({ ownerId, entryId, revision, content, title });
  scopeRef.current = { ownerId, entryId, revision, content, title };
  const requestRef = useRef(0);
  const matchesScope = (scope: RequestScope) => {
    const current = scopeRef.current;
    return current.ownerId === scope.ownerId && current.entryId === scope.entryId && current.revision === scope.revision && current.content === scope.content && current.title === scope.title;
  };

  // Reset transient AI state when the open entry changes.
  useEffect(() => {
    setBusy(null);
    setProposal(null);
    setPrevious(null);
    requestRef.current += 1;
    return () => { requestRef.current += 1; };
  }, [entryId, ownerId]);

  const run = async (key: string, instruction: string, target: "content" | "title") => {
    if (!plainTextOf(content)) { toast.error(T("اول چند خط از روزت را بنویس", "Write a few lines about your day first")); return; }
    const request: RequestScope = { ownerId, entryId, revision, content, title };
    const requestId = ++requestRef.current;
    setBusy(key);
    try {
      const context = target === "title"
        ? "این متن یک خاطرهٔ روزانهٔ شخصی است. فقط یک عنوان کوتاه (حداکثر ۸ کلمه) بدون علائم اضافه برگردان."
        : "این متن یک خاطرهٔ روزانهٔ شخصی است. نتیجه را به صورت Markdown برگردان و صمیمیت متن اصلی را نگه دار.";
      const result = await callAI("inline_edit", content, context, instruction, getAILanguage());
      const text = (result.text || "").trim();
      if (!text) throw new Error(T("پاسخ خالی بود", "Empty response"));
      // Ignore a result that is no longer about the entry/revision that requested it.
      if (requestRef.current !== requestId || !matchesScope(request)) return;
      setProposal({ scope: request, target, text: target === "title" ? text.replace(/^["'«»#\s]+|["'«»\s]+$/g, "").slice(0, 120) : text });
    } catch (error: any) {
      if (requestRef.current === requestId && matchesScope(request)) toast.error(error?.message || T("هوش مصنوعی در دسترس نیست", "AI is not available"));
    } finally {
      if (requestRef.current === requestId) setBusy(null);
    }
  };

  const discardProposal = () => setProposal(null);

  const applyProposal = () => {
    if (!proposal) return;
    const { scope, text, target } = proposal;
    // The proposal is only valid while we are still on the same entry/revision.
    if (!matchesScope(scope)) {
      setProposal(null);
      return;
    }
    setPrevious({ ownerId, entryId: scope.entryId, target, applied: text, base: target === "title" ? scope.title : scope.content });
    setProposal(null);
    if (target === "title") onApplyTitle(text);
    else onApplyContent(text);
    toast.success(T("اعمال شد ✨", "Applied ✨"));
  };

  const undo = () => {
    if (!previous) return;
    if (previous.ownerId !== ownerId || previous.entryId !== entryId || (previous.target === "title" ? title : content) !== previous.applied) {
      setPrevious(null);
      return;
    }
    const base = previous.base;
    setPrevious(null);
    if (previous.target === "title") onApplyTitle(base);
    else onApplyContent(base);
  };

  const canUndo = Boolean(previous && previous.ownerId === ownerId && previous.entryId === entryId && (previous.target === "title" ? title : content) === previous.applied);
  const visibleProposal = proposal && matchesScope(proposal.scope) ? proposal : null;

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
