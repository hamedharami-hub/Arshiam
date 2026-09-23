import React, { useState, useEffect, useMemo } from "react";
import {
  Layers,
  Sparkles,
  Plus,
  RotateCw,
  CheckCircle2,
  XCircle,
  HelpCircle,
  BookOpen,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Award,
  Zap,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type { LeitnerCard, LeitnerBoxStats } from "@/lib/leitnerTypes";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import {
  getLeitnerCards,
  getDueLeitnerCards,
  createLeitnerCard,
  reviewLeitnerCard,
  deleteLeitnerCard,
  getLeitnerBoxStats,
} from "@/lib/leitnerService";
import { getKnowledgeDocuments } from "@/lib/knowledgeService";
import { isPersianText } from "@/lib/bilingualHelper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";

interface LeitnerDeckViewProps {
  userId: string;
  onOpenDocument?: (docId: string) => void;
}

export const LeitnerDeckView: React.FC<LeitnerDeckViewProps> = ({
  userId,
  onOpenDocument,
}) => {
  const { isEn } = useBilingual();
  const [cards, setCards] = useState<LeitnerCard[]>([]);
  const [dueCards, setDueCards] = useState<LeitnerCard[]>([]);
  const [stats, setStats] = useState<LeitnerBoxStats>({
    box1: 0,
    box2: 0,
    box3: 0,
    box4: 0,
    box5: 0,
    dueToday: 0,
    totalCards: 0,
    masteredCount: 0,
  });
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // Study Session State
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showClue, setShowClue] = useState(false);
  const [cardDirectionOverride, setCardDirectionOverride] = useState<"rtl" | "ltr" | null>(null);

  // New Card Modal
  const [openNewCard, setOpenNewCard] = useState(false);
  const [frontInput, setFrontInput] = useState("");
  const [backInput, setBackInput] = useState("");
  const [clueInput, setClueInput] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");

  const loadData = async () => {
    try {
      const [allCards, due, s, docs] = await Promise.all([
        getLeitnerCards(userId),
        getDueLeitnerCards(userId),
        getLeitnerBoxStats(userId),
        getKnowledgeDocuments(userId),
      ]);
      setCards(allCards);
      setDueCards(due);
      setStats(s);
      setDocuments(docs);
    } catch (e) {
      console.error("Error loading Leitner data", e);
    }
  };

  useEffect(() => {
    loadData();
  }, [userId]);

  const activeCard = dueCards[currentIndex] || null;

  const handleStartStudy = () => {
    if (dueCards.length === 0) {
      toast.info(isEn ? "No cards due for review today!" : "امروز کارتی برای مرور ندارید!");
      return;
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowClue(false);
    setIsStudying(true);
  };

  const handleReviewAnswer = async (isSuccess: boolean) => {
    if (!activeCard) return;
    try {
      await reviewLeitnerCard(userId, activeCard.id, isSuccess);
      if (isSuccess) {
        toast.success(isEn ? "Moved to next box!" : "آفرین! به جعبه بعدی منتقل شد.");
      } else {
        toast.error(isEn ? "Reset to Box 1" : "به جعبه ۱ بازگشت.");
      }

      setIsFlipped(false);
      setShowClue(false);

      if (currentIndex + 1 < dueCards.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsStudying(false);
        toast.success(isEn ? "Review session completed!" : "جلسه مرور امروز به پایان رسید!");
      }
      await loadData();
    } catch (e) {
      toast.error("Error updating review");
    }
  };

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;

    try {
      await createLeitnerCard(userId, {
        front: frontInput.trim(),
        back: backInput.trim(),
        clue: clueInput.trim() || undefined,
        document_id: selectedDocId || null,
      });
      setFrontInput("");
      setBackInput("");
      setClueInput("");
      setSelectedDocId("");
      setOpenNewCard(false);
      toast.success(isEn ? "Flashcard created" : "فلش‌کارت لایتنر ساخته شد");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Error creating card");
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await deleteLeitnerCard(userId, cardId);
      toast.success(isEn ? "Card deleted" : "کارت حذف شد");
      await loadData();
    } catch (e) {
      toast.error("Error deleting card");
    }
  };

  const boxesConfig = useMemo(
    () => [
      {
        box: 1,
        label: isEn ? "Box 1 (1d)" : "جعبه ۱ (۱ روز)",
        count: stats.box1,
        color: "border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400",
        accent: "bg-rose-500",
      },
      {
        box: 2,
        label: isEn ? "Box 2 (3d)" : "جعبه ۲ (۳ روز)",
        count: stats.box2,
        color: "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        accent: "bg-amber-500",
      },
      {
        box: 3,
        label: isEn ? "Box 3 (7d)" : "جعبه ۳ (۷ روز)",
        count: stats.box3,
        color: "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400",
        accent: "bg-sky-500",
      },
      {
        box: 4,
        label: isEn ? "Box 4 (14d)" : "جعبه ۴ (۱۴ روز)",
        count: stats.box4,
        color: "border-indigo-500/30 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
        accent: "bg-indigo-500",
      },
      {
        box: 5,
        label: isEn ? "Box 5 (Mastered)" : "جعبه ۵ (تسلط کامل)",
        count: stats.box5,
        color: "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        accent: "bg-emerald-500",
      },
    ],
    [stats, isEn]
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto p-4 md:p-6 space-y-6">
      {/* Header & Stats Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-card border border-border shadow-sm backdrop-blur-md">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            <h2 className="text-base sm:text-lg font-bold text-foreground">
              {isEn ? "Leitner Spaced Repetition" : "سیستم جعبه لایتنر و مرور هوشمند"}
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {isEn
              ? "Review concepts at scientifically proven intervals for long-term memory mastery."
              : "مفاهیم و داروها را بر اساس فواصل زمانی اثبات‌شده مرور کنید تا به حافظهٔ بلندمدت منتقل شوند."}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setOpenNewCard(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>{isEn ? "New Card" : "کارت جدید"}</span>
          </button>

          <button
            type="button"
            onClick={handleStartStudy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-md shadow-primary/25 transition cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>
              {isEn ? `Study (${dueCards.length})` : `شروع مرور (${dueCards.length} آماده)`}
            </span>
          </button>
        </div>
      </div>

      {/* 5 Boxes Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
        {boxesConfig.map((b) => (
          <div
            key={b.box}
            className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-2 transition relative overflow-hidden ${b.color}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold truncate">{b.label}</span>
              <span className={`w-2 h-2 rounded-full ${b.accent}`} />
            </div>
            <div className="flex items-baseline justify-between mt-1">
              <span className="text-2xl font-black">{b.count}</span>
              <span className="text-[10px] opacity-75 font-medium">{isEn ? "cards" : "کارت"}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Active Study Session Runner */}
      {isStudying && activeCard ? (() => {
        const currentText = isFlipped ? activeCard.back : activeCard.front;
        const isCardRtl = cardDirectionOverride ? cardDirectionOverride === "rtl" : isPersianText(currentText);

        return (
        <div className="p-6 rounded-3xl bg-card border-2 border-primary/50 shadow-xl flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200 max-w-2xl mx-auto w-full">
          <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
            <span className="font-mono text-primary font-bold">
              {currentIndex + 1} / {dueCards.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  setCardDirectionOverride((curr) =>
                    curr ? (curr === "rtl" ? "ltr" : "rtl") : isCardRtl ? "ltr" : "rtl"
                  )
                }
                className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[10px] text-muted-foreground hover:text-foreground font-semibold transition cursor-pointer"
                title={isEn ? "Toggle RTL / LTR direction" : "تغییر جهت راست‌چین / چپ‌چین"}
              >
                {isCardRtl ? "🇮🇷 راست‌چین (RTL)" : "🇬🇧 چپ‌چین (LTR)"}
              </button>
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary font-bold font-mono text-[11px]">
                Box {activeCard.box}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStudying(false)}
              className="text-muted-foreground hover:text-foreground transition cursor-pointer text-xs"
            >
              {isEn ? "Exit" : "خروج"}
            </button>
          </div>

          {/* Flip Card Body */}
          <div
            data-testid="flip-card"
            onClick={() => setIsFlipped(!isFlipped)}
            className="w-full min-h-[220px] p-6 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 hover:border-primary/50 hover:shadow-md"
          >
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground mb-3 font-bold">
              {isFlipped
                ? isEn
                  ? "Answer / Explanation"
                  : "پاسخ / توضیحات"
                : isEn
                ? "Question / Concept (Click to flip)"
                : "پرسش / مفهوم (کلیک برای چرخاندن کارت)"}
            </div>

            <div
              dir={isCardRtl ? "rtl" : "ltr"}
              className={`text-base sm:text-lg font-bold text-foreground leading-relaxed max-w-lg w-full ${
                isCardRtl ? "text-right" : "text-left"
              }`}
            >
              {currentText}
            </div>

            {/* Clue button */}
            {!isFlipped && activeCard.clue && (
              <div className="mt-4">
                {showClue ? (
                  <span
                    dir={isPersianText(activeCard.clue) ? "rtl" : "ltr"}
                    className={`text-xs text-amber-700 dark:text-amber-300 bg-amber-500/10 px-3 py-1 rounded-xl border border-amber-500/20 inline-block ${
                      isPersianText(activeCard.clue) ? "text-right" : "text-left"
                    }`}
                  >
                    💡 {activeCard.clue}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowClue(true);
                    }}
                    className="text-xs text-muted-foreground hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 cursor-pointer transition"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>{isEn ? "Show Hint" : "نمایش سرنخ"}</span>
                  </button>
                )}
              </div>
            )}

            {/* Attached document link */}
            {isFlipped && activeCard.document_id && onOpenDocument && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenDocument(activeCard.document_id!);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 text-xs font-medium transition cursor-pointer"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{isEn ? "View Source Document" : "مشاهده سند مرجع"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 w-full">
            <button
              type="button"
              onClick={() => handleReviewAnswer(false)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>{isEn ? "Forgot (Box 1)" : "فراموش کردم (جعبه ۱)"}</span>
            </button>

            <button
              type="button"
              onClick={() => handleReviewAnswer(true)}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isEn ? "Remembered (+1 Box)" : "بلدم (انتقال به جعبه بعدی)"}</span>
            </button>
          </div>
        </div>
        );
      })() : null}

      {/* Cards Table / List */}
      <div className="p-4 rounded-3xl bg-card border border-border space-y-3 shadow-sm">
        <div className="flex items-center justify-between pb-2 border-b border-border">
          <h3 className="text-xs font-bold text-foreground">
            {isEn ? "All Flashcards" : "تمامی فلش‌کارت‌ها"} ({cards.length})
          </h3>
          <span className="text-[11px] text-muted-foreground">
            {stats.masteredCount} {isEn ? "Mastered" : "مسلط شده"}
          </span>
        </div>

        {cards.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {isEn
              ? "No flashcards yet. Click 'New Card' to create your first Leitner card."
              : "هنوز کارتی ثبت نشده است. روی 'کارت جدید' کلیک کنید تا اولین کارت لایتنر خود را بسازید."}
          </div>
        ) : (
          <div className="space-y-2">
            {cards.map((c) => {
              const isFrontRtl = isPersianText(c.front);
              const isBackRtl = isPersianText(c.back);
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs hover:bg-muted/70 transition"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div
                      dir={isFrontRtl ? "rtl" : "ltr"}
                      className={`font-bold text-foreground truncate ${isFrontRtl ? "text-right" : "text-left"}`}
                    >
                      {c.front}
                    </div>
                    <div
                      dir={isBackRtl ? "rtl" : "ltr"}
                      className={`text-[11px] text-muted-foreground truncate ${isBackRtl ? "text-right" : "text-left"}`}
                    >
                      {c.back}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary font-mono font-bold text-[10px]">
                      B{c.box}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(c.id)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Card Modal */}
      <Dialog open={openNewCard} onOpenChange={setOpenNewCard}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>{isEn ? "Create Flashcard" : "افزودن فلش‌کارت جدید"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateCard} className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Front (Question / Prompt)" : "روی کارت (پرسش یا مفهوم)"}
              </label>
              <textarea
                required
                rows={2}
                dir="auto"
                value={frontInput}
                onChange={(e) => setFrontInput(e.target.value)}
                placeholder={isEn ? "e.g. Mechanism of Fluoxetine" : "مثلاً مکانیسم اثر فلوکستین..."}
                className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Back (Answer / Clinical Key)" : "پشت کارت (پاسخ یا نکته بالینی)"}
              </label>
              <textarea
                required
                rows={3}
                dir="auto"
                value={backInput}
                onChange={(e) => setBackInput(e.target.value)}
                placeholder={isEn ? "e.g. Selective Serotonin Reuptake Inhibitor (SSRI)" : "مثلاً مهارکننده انتخابی بازجذب سروتونین (SSRI)..."}
                className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Clue / Hint (optional)" : "سرنخ یا راهنمایی (اختیاری)"}
              </label>
              <input
                type="text"
                dir="auto"
                value={clueInput}
                onChange={(e) => setClueInput(e.target.value)}
                placeholder={isEn ? "e.g. Longest half-life" : "مثلاً بیشترین نیمه‌عمر"}
                className="w-full py-1.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            {documents.length > 0 && (
              <div>
                <label className="block text-[11px] text-muted-foreground mb-1">
                  {isEn ? "Link to Knowledge Document (optional)" : "اتصال به سند آموزشی مرجع (اختیاری)"}
                </label>
                <select
                  value={selectedDocId}
                  onChange={(e) => setSelectedDocId(e.target.value)}
                  className="w-full py-1.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">{isEn ? "(None)" : "(بدون اتصال)"}</option>
                  {documents.map((d) => (
                    <option key={d.id} value={d.id}>
                      📄 {d.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setOpenNewCard(false)}
                className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {isEn ? "Cancel" : "انصراف"}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {isEn ? "Create Card" : "ایجاد کارت"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};
