import React, { useState, useEffect, useCallback } from "react";
import {
  Sparkles,
  X,
  Bot,
  PenTool,
  CheckSquare,
  Square,
  CheckCircle2,
  AlertCircle,
  FileText,
  ListChecks,
  ArrowRight,
  Plus,
  Trash2,
  BrainCircuit,
  BookOpen,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import {
  generateQuestionsFromText,
  type GeneratedQuestionItem,
} from "@/lib/knowledgeQuestionGenerator";
import { createLeitnerCard } from "@/lib/leitnerService";
import { toast } from "sonner";

interface AiQuestionGeneratorModalProps {
  open: boolean;
  onClose: () => void;
  initialText: string;
  documentId?: string | null;
  documentTitle?: string;
  folderId?: string | null;
  userId: string;
  onCardsSaved?: (count: number) => void;
  onOpenReview?: () => void;
}

export const AiQuestionGeneratorModal: React.FC<AiQuestionGeneratorModalProps> = ({
  open,
  onClose,
  initialText,
  documentId,
  documentTitle,
  folderId,
  userId,
  onCardsSaved,
  onOpenReview,
}) => {
  const { isEn } = useBilingual();
  const [activeTab, setActiveTab] = useState<"ai" | "manual">("ai");
  const [snippetText, setSnippetText] = useState(initialText);
  const [generationMode, setGenerationMode] = useState<
    "auto" | "clinical_pearl" | "warning" | "dosing"
  >("auto");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateCards, setCandidateCards] = useState<GeneratedQuestionItem[]>([]);
  const [successSavedCount, setSuccessSavedCount] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Manual Tab Form State
  const [manualFront, setManualFront] = useState("");
  const [manualBack, setManualBack] = useState("");
  const [manualClue, setManualClue] = useState("");

  // Sync initialText when modal opens
  useEffect(() => {
    if (open) {
      setSnippetText(initialText || "");
      setErrorMsg(null);
      setSuccessSavedCount(null);
      // Auto-trigger generation if there's substantial text and no cards yet
      if (initialText && initialText.trim().length > 15 && candidateCards.length === 0) {
        handleGenerate(initialText);
      }
    }
  }, [open, initialText]);

  const handleGenerate = useCallback(
    async (textToUse: string) => {
      const targetText = textToUse || snippetText;
      if (!targetText || !targetText.trim()) {
        setErrorMsg(
          isEn
            ? "Please enter or select text to generate questions from."
            : "لطفاً متن یا عبارتی را برای تولید سوالات وارد کنید."
        );
        return;
      }

      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessSavedCount(null);

      try {
        const cards = await generateQuestionsFromText({
          text: targetText,
          documentTitle,
          mode: generationMode,
          customPrompt,
          count: 4,
        });

        if (!cards || cards.length === 0) {
          throw new Error(
            isEn
              ? "No questions could be extracted. Please try selecting a different text segment."
              : "سوالی از این متن استخراج نشد. لطفاً بخش طولانی‌تر یا متفاوتی از متن را انتخاب فرمایید."
          );
        }

        setCandidateCards(cards);
      } catch (err: any) {
        console.error("Error generating questions:", err);
        setErrorMsg(err.message || (isEn ? "Failed to generate questions" : "خطا در تولید سوالات هوشمند"));
      } finally {
        setIsGenerating(false);
      }
    },
    [snippetText, documentTitle, generationMode, customPrompt, isEn]
  );

  const handleSelectAll = (select: boolean) => {
    setCandidateCards((prev) => prev.map((c) => ({ ...c, selected: select })));
  };

  const handleCardFieldChange = (
    index: number,
    field: "front" | "back" | "clue",
    value: string
  ) => {
    setCandidateCards((prev) =>
      prev.map((c, i) => (i === index ? { ...c, [field]: value } : c))
    );
  };

  const handleDeleteCard = (index: number) => {
    setCandidateCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveSelectedCards = async () => {
    const selected = candidateCards.filter((c) => c.selected && c.front.trim() && c.back.trim());
    if (selected.length === 0) {
      setErrorMsg(
        isEn
          ? "No valid cards selected to save."
          : "هیچ کارتی با پرسش و پاسخ معتبر برای ذخیره انتخاب نشده است."
      );
      return;
    }

    if (!userId) {
      setErrorMsg(isEn ? "User not authenticated" : "کاربر شناسایی نشد");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      let saved = 0;
      for (const card of selected) {
        await createLeitnerCard(userId, {
          front: card.front,
          back: card.back,
          clue: card.clue,
          document_id: documentId || null,
          folder_id: folderId || null,
          box: 1,
        });
        saved++;
      }

      setSuccessSavedCount(saved);
      setCandidateCards([]);
      toast.success(
        isEn
          ? `${saved} card(s) added to Leitner Box and Mind Map!`
          : `${saved} کارت با موفقیت به جعبه لایتنر و نقشه ذهنی افزوده شد!`
      );
      if (onCardsSaved) onCardsSaved(saved);
    } catch (err: any) {
      console.error("Error saving Leitner cards:", err);
      setErrorMsg(err.message || (isEn ? "Failed to save cards" : "خطا در ذخیره کارت‌ها"));
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveManualCard = async () => {
    if (!manualFront.trim() || !manualBack.trim()) {
      setErrorMsg(
        isEn
          ? "Please provide both question (Front) and answer (Back)."
          : "لطفاً صورت سوال و پاسخ را وارد کنید."
      );
      return;
    }

    if (!userId) {
      setErrorMsg(isEn ? "User not authenticated" : "کاربر شناسایی نشد");
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);

    try {
      await createLeitnerCard(userId, {
        front: manualFront,
        back: manualBack,
        clue: manualClue,
        document_id: documentId || null,
        folder_id: folderId || null,
        box: 1,
      });

      setSuccessSavedCount(1);
      setManualFront("");
      setManualBack("");
      setManualClue("");
      toast.success(
        isEn
          ? "Card added to Leitner Box and Mind Map!"
          : "کارت جدید با موفقیت به جعبه لایتنر و نقشه ذهنی افزوده شد!"
      );
      if (onCardsSaved) onCardsSaved(1);
    } catch (err: any) {
      console.error("Error saving manual card:", err);
      setErrorMsg(err.message || (isEn ? "Failed to save card" : "خطا در ثبت کارت دستی"));
    } finally {
      setIsSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-card border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-card-foreground ring-1 ring-primary/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-card flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-primary animate-pulse" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-foreground flex items-center gap-2 truncate">
                <span>
                  {isEn ? "AI Leitner & Mind Map Flashcard Generator" : "تولید هوشمند سوالات لایتنر و نقشه ذهنی"}
                </span>
              </h2>
              <p className="text-xs text-muted-foreground truncate">
                {documentTitle
                  ? `${isEn ? "Source:" : "سند منبع:"} ${documentTitle}`
                  : isEn
                  ? "Extract high-yield study cards directly to Leitner and Mind Map"
                  : "استخراج سوالات کلیدی و ثبت مستقیم در جعبه لایتنر و نقشه ذهنی"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition cursor-pointer shrink-0"
            title={isEn ? "Close" : "بستن"}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: [ 🤖 تولید هوشمند ] vs [ ✍️ ثبت دستی کارت ] */}
        <div className="p-2 bg-muted/30 border-b border-border flex items-center justify-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              setActiveTab("ai");
              setErrorMsg(null);
            }}
            className={`flex-1 max-w-xs flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "ai"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{isEn ? "🤖 AI Generator" : "🤖 تولید با هوش مصنوعی"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("manual");
              setErrorMsg(null);
            }}
            className={`flex-1 max-w-xs flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === "manual"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-card text-muted-foreground hover:text-foreground border border-border"
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>{isEn ? "✍️ Create Manually" : "✍️ افزودن دستی کارت"}</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Success Banner */}
          {successSavedCount !== null && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center justify-between gap-3 animate-in fade-in">
              <div className="flex items-center gap-2 font-bold min-w-0">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="truncate">
                  {isEn
                    ? `${successSavedCount} flashcard(s) saved to Leitner and Mind Map!`
                    : `تعداد ${successSavedCount} کارت با موفقیت به جعبه لایتنر و نقشه ذهنی افزوده شد!`}
                </span>
              </div>
              {onOpenReview && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenReview();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <BrainCircuit className="w-3.5 h-3.5" />
                  <span>{isEn ? "Go to Review" : "مشاهده در مرور"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* TAB 1: AI GENERATOR */}
          {activeTab === "ai" && (
            <div className="space-y-4">
              {/* Context Textarea Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-foreground">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    <span>{isEn ? "Study Text Snippet:" : "متن انتخابی جهت استخراج سوالات:"}</span>
                  </span>
                  <span className="text-[11px] text-muted-foreground font-mono">
                    {snippetText.length} {isEn ? "chars" : "کاراکتر"}
                  </span>
                </div>
                <textarea
                  value={snippetText}
                  onChange={(e) => setSnippetText(e.target.value)}
                  rows={3}
                  placeholder={
                    isEn
                      ? "Paste or select excerpt to generate cards..."
                      : "متن یا گزیده درسی را اینجا قرار دهید..."
                  }
                  className="w-full p-3 rounded-2xl bg-background border border-border text-foreground text-xs leading-relaxed focus:outline-hidden focus:border-primary transition resize-y"
                />
              </div>

              {/* Mode and Prompt Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isEn ? "Question Style:" : "سبک سوالات:"}
                  </label>
                  <select
                    value={generationMode}
                    onChange={(e) => setGenerationMode(e.target.value as any)}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs font-medium focus:outline-hidden focus:border-primary cursor-pointer"
                  >
                    <option value="auto">
                      {isEn ? "🌟 High-Yield Mix" : "🌟 جامع و هوشمند (ترکیبی)"}
                    </option>
                    <option value="clinical_pearl">
                      {isEn ? "✨ Clinical Pearls" : "✨ نکات طلایی بالینی"}
                    </option>
                    <option value="warning">
                      {isEn ? "⚠️ Warnings & Contraindications" : "⚠️ هشدارها و موارد منع مصرف"}
                    </option>
                    <option value="dosing">
                      {isEn ? "💊 Dosing & Indications" : "💊 دوز و اندیکاسیون"}
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isEn ? "Focus / Custom Note (Optional):" : "تاکید خاص برای هوش مصنوعی (اختیاری):"}
                  </label>
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Focus on adverse effects..."
                        : "مثال: تمرکز بر روی عوارض یا تداخلات..."
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary"
                  />
                </div>
              </div>

              {/* Generate Button */}
              <button
                type="button"
                disabled={isGenerating || !snippetText.trim()}
                onClick={() => handleGenerate(snippetText)}
                className="w-full py-2.5 px-4 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60 transition cursor-pointer"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                    <span>{isEn ? "Generating Questions..." : "در حال تولید سوالات هوشمند..."}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 animate-pulse" />
                    <span>{isEn ? "Generate Questions with AI" : "تولید سوالات با هوش مصنوعی"}</span>
                  </>
                )}
              </button>

              {/* Candidate Cards List */}
              {candidateCards.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-primary" />
                      <span>{isEn ? "Generated Flashcards:" : "کارت‌های پیشنهادی هوش مصنوعی:"}</span>
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          handleSelectAll(
                            candidateCards.some((c) => !c.selected) ? true : false
                          )
                        }
                        className="text-[11px] text-primary hover:underline font-semibold cursor-pointer"
                      >
                        {candidateCards.some((c) => !c.selected)
                          ? isEn
                            ? "Select All"
                            : "انتخاب همه"
                          : isEn
                          ? "Deselect All"
                          : "لغو همه"}
                      </button>
                      <span className="text-[11px] text-muted-foreground font-mono">
                        ({candidateCards.filter((c) => c.selected).length}/{candidateCards.length})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {candidateCards.map((card, idx) => (
                      <div
                        key={card.id || idx}
                        className={`p-3 rounded-2xl border transition space-y-2 ${
                          card.selected
                            ? "bg-card border-primary/40 shadow-xs"
                            : "bg-muted/20 border-border opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={card.selected}
                              onChange={() =>
                                setCandidateCards((prev) =>
                                  prev.map((c, i) =>
                                    i === idx ? { ...c, selected: !c.selected } : c
                                  )
                                )
                              }
                              className="w-4 h-4 rounded text-primary focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-foreground">
                              {isEn ? `Question ${idx + 1}` : `سوال ${idx + 1}`}
                            </span>
                            {card.type && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                                {card.type}
                              </span>
                            )}
                          </label>

                          <button
                            type="button"
                            onClick={() => handleDeleteCard(idx)}
                            className="p-1 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                            title={isEn ? "Remove card" : "حذف کارت"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Front (Question) */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-primary block">
                            {isEn ? "Front (Question):" : "روی کارت (صورت سوال):"}
                          </span>
                          <input
                            type="text"
                            value={card.front}
                            onChange={(e) => handleCardFieldChange(idx, "front", e.target.value)}
                            className="w-full p-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary"
                          />
                        </div>

                        {/* Back (Answer) */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 block">
                            {isEn ? "Back (Answer):" : "پشت کارت (پاسخ):"}
                          </span>
                          <textarea
                            rows={2}
                            value={card.back}
                            onChange={(e) => handleCardFieldChange(idx, "back", e.target.value)}
                            className="w-full p-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary resize-y"
                          />
                        </div>

                        {/* Clue (Optional Hint) */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block">
                            {isEn ? "Clue / Clinical Hint (Optional):" : "راهنما / نکته کلیدی (اختیاری):"}
                          </span>
                          <input
                            type="text"
                            value={card.clue || ""}
                            onChange={(e) => handleCardFieldChange(idx, "clue", e.target.value)}
                            placeholder={isEn ? "Short hint..." : "نکته یا خلاصه کوتاه..."}
                            className="w-full p-2 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Selected Cards to Leitner Box & Mind Map */}
                  <button
                    type="button"
                    disabled={isSaving || candidateCards.filter((c) => c.selected).length === 0}
                    onClick={handleSaveSelectedCards}
                    className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60 transition cursor-pointer"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>{isEn ? "Saving to Leitner & Mind Map..." : "در حال افزودن به لایتنر و نقشه ذهنی..."}</span>
                      </>
                    ) : (
                      <>
                        <BrainCircuit className="w-4 h-4" />
                        <span>
                          {isEn
                            ? `Add (${candidateCards.filter((c) => c.selected).length}) Cards to Leitner & Mind Map`
                            : `افزودن (${candidateCards.filter((c) => c.selected).length}) کارت به لایتنر و نقشه ذهنی`}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: MANUAL CARD CREATION */}
          {activeTab === "manual" && (
            <div className="space-y-4">
              {snippetText.trim() && (
                <div className="p-3 rounded-2xl bg-muted/30 border border-border space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-primary font-bold">
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>{isEn ? "Reference Excerpt:" : "متن گزیده مرجع جهت یادآوری:"}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed max-h-24 overflow-y-auto">
                    {snippetText}
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isEn ? "Question (Front):" : "صورت سوال (روی کارت):"}
                  </label>
                  <input
                    type="text"
                    value={manualFront}
                    onChange={(e) => setManualFront(e.target.value)}
                    placeholder={isEn ? "e.g. Mechanism of Fluoxetine?" : "مثال: مکانیسم اثر فلوکستین چیست؟"}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isEn ? "Answer (Back):" : "پاسخ (پشت کارت):"}
                  </label>
                  <textarea
                    rows={3}
                    value={manualBack}
                    onChange={(e) => setManualBack(e.target.value)}
                    placeholder={
                      isEn
                        ? "e.g. Selective Serotonin Reuptake Inhibitor (SSRI)"
                        : "مثال: مهارکننده انتخابی بازجذب سروتونین (SSRI)"
                    }
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary resize-y"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">
                    {isEn ? "Clinical Hint / Clue (Optional):" : "نکته کمکی یا راهنما (اختیاری):"}
                  </label>
                  <input
                    type="text"
                    value={manualClue}
                    onChange={(e) => setManualClue(e.target.value)}
                    placeholder={isEn ? "Optional hint..." : "نکته تکمیلی..."}
                    className="w-full p-2.5 rounded-xl bg-background border border-border text-foreground text-xs focus:outline-hidden focus:border-primary"
                  />
                </div>

                <button
                  type="button"
                  disabled={isSaving || !manualFront.trim() || !manualBack.trim()}
                  onClick={handleSaveManualCard}
                  className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 disabled:opacity-60 transition cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>{isEn ? "Saving..." : "در حال ثبت کارت..."}</span>
                    </>
                  ) : (
                    <>
                      <BrainCircuit className="w-4 h-4" />
                      <span>{isEn ? "Add Card to Leitner & Mind Map" : "افزودن کارت به لایتنر و نقشه ذهنی"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
