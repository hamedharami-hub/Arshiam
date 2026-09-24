import React, { useState, useEffect, useMemo, useCallback } from "react";
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
  Volume2,
  VolumeX,
  Edit3,
  Search,
  Filter,
  Flame,
  TrendingUp,
  BarChart3,
  Calendar,
  AlertTriangle,
  Keyboard,
  Shuffle,
  CalendarPlus,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type {
  LeitnerCard,
  LeitnerBoxStats,
  LeitnerRating,
  LeitnerSchedulingAlgorithm,
} from "@/lib/leitnerTypes";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
import {
  getLeitnerCards,
  getDueLeitnerCards,
  createLeitnerCard,
  reviewLeitnerCardWithRating,
  previewNextInterval,
  updateLeitnerCard,
  deleteLeitnerCard,
  getLeitnerBoxStats,
  getCramCards,
  getLeitnerSchedulingAlgorithm,
  type CramFilterOptions,
} from "@/lib/leitnerService";
import { getKnowledgeDocuments } from "@/lib/knowledgeService";
import { isPersianText } from "@/lib/bilingualHelper";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudyTaskScheduleModal } from "@/components/knowledge/StudyTaskScheduleModal";
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
    retentionRate: 100,
    lapsedCardsCount: 0,
    upcomingForecast: { today: 0, tomorrow: 0, next3Days: 0, next7Days: 0 },
    streakDays: 0,
  });
  const [documents, setDocuments] = useState<KnowledgeDocument[]>([]);

  // Mode: "due" (Scheduled Spaced Repetition) vs "cram" (Free Practice / Custom Cram)
  const [studyMode, setStudyMode] = useState<"due" | "cram">("due");
  const [cramBoxFilter, setCramBoxFilter] = useState<number | "all">("all");
  const [cramDocFilter, setCramDocFilter] = useState<string>("all");
  const [cramLapsedOnly, setCramLapsedOnly] = useState<boolean>(false);

  // Study Session State
  const [isStudying, setIsStudying] = useState(false);
  const [activeQueue, setActiveQueue] = useState<LeitnerCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const ratingSubmissionRef = React.useRef(false);
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);
  const [showClue, setShowClue] = useState(false);
  const [cardDirectionOverride, setCardDirectionOverride] = useState<"rtl" | "ltr" | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Quick Edit Modal (in-session or from table)
  const [editingCard, setEditingCard] = useState<LeitnerCard | null>(null);
  const [editFront, setEditFront] = useState("");
  const [editBack, setEditBack] = useState("");
  const [editClue, setEditClue] = useState("");
  const [editBox, setEditBox] = useState<number>(1);

  // New Card Modal
  const [openNewCard, setOpenNewCard] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [frontInput, setFrontInput] = useState("");
  const [backInput, setBackInput] = useState("");
  const [clueInput, setClueInput] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [newCardAlgorithm, setNewCardAlgorithm] = useState<LeitnerSchedulingAlgorithm>("fsrs6");

  // Card List Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBoxTab, setSelectedBoxTab] = useState<number | "all">("all");

  const loadData = useCallback(async () => {
    try {
      const [allCards, due, s, docs] = await Promise.all([
        getLeitnerCards(userId),
        getDueLeitnerCards(userId),
        getLeitnerBoxStats(userId),
        getKnowledgeDocuments(userId),
      ]);
      setCards(allCards);
      setDueCards(due);
      setStats({
        box1: s?.box1 ?? 0,
        box2: s?.box2 ?? 0,
        box3: s?.box3 ?? 0,
        box4: s?.box4 ?? 0,
        box5: s?.box5 ?? 0,
        dueToday: s?.dueToday ?? 0,
        totalCards: s?.totalCards ?? 0,
        masteredCount: s?.masteredCount ?? 0,
        retentionRate: s?.retentionRate ?? 100,
        lapsedCardsCount: s?.lapsedCardsCount ?? 0,
        upcomingForecast: s?.upcomingForecast || {
          today: s?.dueToday ?? 0,
          tomorrow: 0,
          next3Days: 0,
          next7Days: 0,
        },
        streakDays: s?.streakDays ?? 0,
      });
      setDocuments(docs);
    } catch (e) {
      console.error("Error loading Leitner data", e);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cram cards calculation based on active filters
  const cramCards = useMemo(() => {
    return cards.filter((c) => {
      if (cramBoxFilter !== "all" && c.box !== cramBoxFilter) return false;
      if (cramDocFilter !== "all" && c.document_id !== cramDocFilter) return false;
      if (cramLapsedOnly && (c.lapse_count || 0) === 0) return false;
      return true;
    });
  }, [cards, cramBoxFilter, cramDocFilter, cramLapsedOnly]);

  const activeCard = activeQueue[currentIndex] || null;

  // Text to Speech
  const handleSpeak = useCallback(
    (text: string) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        toast.info(
          isEn
            ? "Speech synthesis not supported in this browser"
            : "مرورگر شما از قابلیت خوانش صوتی پشتیبانی نمی‌کند"
        );
        return;
      }

      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        const isPersian = isPersianText(text);
        utterance.lang = isPersian ? "fa-IR" : "en-US";
        utterance.rate = 0.95;
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);
      } catch {
        setIsSpeaking(false);
      }
    },
    [isEn]
  );

  // Start study session
  const handleStartStudy = (mode: "due" | "cram" = studyMode) => {
    const queue = mode === "due" ? [...dueCards] : [...cramCards];
    if (queue.length === 0) {
      toast.info(
        mode === "due"
          ? isEn
            ? "No cards due for review today!"
            : "امروز کارتی برای مرور ندارید!"
          : isEn
          ? "No cards match the selected practice filter"
          : "کارتی با فیلتر انتخابی برای تمرین آزاد پیدا نشد"
      );
      return;
    }
    setActiveQueue(queue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowClue(false);
    setCardDirectionOverride(null);
    setIsStudying(true);
  };

  // Apply the card's persisted scheduler using the same four recall ratings.
  const handleReviewAnswer = useCallback(async (rating: LeitnerRating) => {
    if (!activeCard || !isFlipped || ratingSubmissionRef.current) return;
    ratingSubmissionRef.current = true;
    setIsSubmittingRating(true);
    try {
      await reviewLeitnerCardWithRating(userId, activeCard.id, rating);

      const usesFsrs = getLeitnerSchedulingAlgorithm(activeCard) === "fsrs6";
      if (rating === 1) {
        toast.error(
          isEn
            ? usesFsrs ? "Again — scheduled soon (re-queued at session end)" : "Reset to Box 1 (re-queued in session)"
            : usesFsrs ? "دوباره — زمان مرور دوباره تنظیم شد (در پایان جلسه تکرار می‌شود)" : "به جعبه ۱ بازگشت (در پایان جلسه تکرار می‌شود)"
        );
      } else if (rating === 2) {
        toast.info(
          isEn
            ? usesFsrs ? "Hard — FSRS scheduled a shorter interval" : "Hard - Interval gently increased"
            : usesFsrs ? "سخت — زمان‌بندی FSRS با فاصله کوتاه‌تر" : "سخت - تمدید با فاصله کوتاه‌تر"
        );
      } else if (rating === 3) {
        toast.success(
          isEn
            ? usesFsrs ? "Good — next review scheduled by FSRS" : "Good! Moved to next box"
            : usesFsrs ? "خوب — زمان مرور بعدی با FSRS تنظیم شد" : "آفرین! به جعبه بعدی منتقل شد."
        );
      } else if (rating === 4) {
        toast.success(
          isEn
            ? usesFsrs ? "Easy — next review scheduled by FSRS" : "Easy! Rapid mastery leap"
            : usesFsrs ? "آسان — زمان مرور بعدی با FSRS تنظیم شد" : "عالی! جهش سریع به جعبه‌های بالاتر."
        );
      }

      setIsFlipped(false);
      setShowClue(false);
      setCardDirectionOverride(null);

      // Re-queue card at the end of the session if lapsed/again
      const nextQueue = [...activeQueue];
      if (rating === 1) {
        nextQueue.push(activeCard);
        setActiveQueue(nextQueue);
      }

      if (currentIndex + 1 < nextQueue.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setIsStudying(false);
        toast.success(
          isEn ? "Review session completed!" : "جلسه مرور امروز به پایان رسید!"
        );
      }
      await loadData();
    } catch (e) {
      toast.error("Error updating review");
    } finally {
      ratingSubmissionRef.current = false;
      setIsSubmittingRating(false);
    }
  }, [activeCard, activeQueue, currentIndex, isEn, isFlipped, loadData, userId]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isStudying || !activeCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "1") {
        e.preventDefault();
        if (isFlipped) handleReviewAnswer(1);
      } else if (e.key === "2") {
        e.preventDefault();
        if (isFlipped) handleReviewAnswer(2);
      } else if (e.key === "3") {
        e.preventDefault();
        if (isFlipped) handleReviewAnswer(3);
      } else if (e.key === "4") {
        e.preventDefault();
        if (isFlipped) handleReviewAnswer(4);
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        setShowClue((c) => !c);
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        const currentText = isFlipped ? activeCard.back : activeCard.front;
        handleSpeak(currentText);
      } else if (e.key.toLowerCase() === "r") {
        e.preventDefault();
        setCardDirectionOverride((curr) => (curr === "rtl" ? "ltr" : "rtl"));
      } else if (e.key.toLowerCase() === "e") {
        e.preventDefault();
        openEditModal(activeCard);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isStudying, activeCard, isFlipped, handleSpeak, handleReviewAnswer, activeQueue, currentIndex]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;

    try {
      await createLeitnerCard(userId, {
        front: frontInput.trim(),
        back: backInput.trim(),
        clue: clueInput.trim() || undefined,
        document_id: selectedDocId || null,
        scheduling_algorithm: newCardAlgorithm,
      });
      setFrontInput("");
      setBackInput("");
      setClueInput("");
      setSelectedDocId("");
      setNewCardAlgorithm("fsrs6");
      setOpenNewCard(false);
      toast.success(isEn ? "Flashcard created" : "فلش‌کارت لایتنر ساخته شد");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Error creating card");
    }
  };

  const openEditModal = (card: LeitnerCard) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditClue(card.clue || "");
    setEditBox(card.box);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const updated = await updateLeitnerCard(userId, editingCard.id, {
        front: editFront.trim(),
        back: editBack.trim(),
        clue: editClue.trim() || "",
        box: editBox,
      });

      // Update in active study queue if studying
      if (isStudying) {
        setActiveQueue((prev) =>
          prev.map((c) => (c.id === updated.id ? updated : c))
        );
      }

      setEditingCard(null);
      toast.success(isEn ? "Card updated" : "کارت ویرایش شد");
      await loadData();
    } catch (e: any) {
      toast.error(e.message || "Error updating card");
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

  // Filtered card list for the bottom table
  const displayedCards = useMemo(() => {
    return cards.filter((c) => {
      if (selectedBoxTab !== "all" && c.box !== selectedBoxTab) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchFront = c.front.toLowerCase().includes(q);
        const matchBack = c.back.toLowerCase().includes(q);
        const matchClue = c.clue?.toLowerCase().includes(q);
        if (!matchFront && !matchBack && !matchClue) return false;
      }
      return true;
    });
  }, [cards, selectedBoxTab, searchQuery]);

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
            onClick={() => setScheduleModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-semibold border border-border transition cursor-pointer"
            title={isEn ? "Schedule a Leitner review task in Tasks" : "برنامه‌ریزی تسک مرور کارت‌ها در بخش تسک‌ها"}
          >
            <CalendarPlus className="w-4 h-4 text-amber-500" />
            <span className="hidden sm:inline">{isEn ? "Schedule Task" : "برنامه‌ریزی مرور (تسک)"}</span>
          </button>

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
            onClick={() => handleStartStudy("due")}
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

      {/* Modern Memory Health & Spaced Repetition Analytics Dashboard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Retention Rate Gauge */}
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-xs">
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Retention Rate" : "نرخ یادآوری حافظه"}
            </div>
            <div className="text-lg font-black text-foreground">
              {stats.retentionRate}%
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 mr-2 font-normal">
                {stats.retentionRate >= 85
                  ? isEn ? "Mastery" : "عالی"
                  : stats.retentionRate >= 70
                  ? isEn ? "Good" : "مطلوب"
                  : isEn ? "Review needed" : "نیاز به تقویت"}
              </span>
            </div>
          </div>
        </div>

        {/* Daily Streak Counter */}
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-xs">
          <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <Flame className="w-5 h-5" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Study Streak" : "توالی روزهای مرور"}
            </div>
            <div className="text-lg font-black text-foreground">
              {stats.streakDays}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                {isEn ? "days" : "روز متوالی"}
              </span>
            </div>
          </div>
        </div>

        {/* Upcoming Reviews Forecast */}
        <div className="p-4 rounded-2xl bg-card border border-border flex items-center gap-3 shadow-xs">
          <div className="p-3 rounded-xl bg-primary/10 text-primary">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="space-y-0.5 min-w-0 flex-1">
            <div className="text-[11px] text-muted-foreground font-medium">
              {isEn ? "Upcoming Reviews" : "پیش‌بینی مرور روزهای آتی"}
            </div>
            <div className="flex items-center gap-2 text-xs font-bold text-foreground">
              <span>{isEn ? `Tomorrow: ${stats.upcomingForecast?.tomorrow ?? 0}` : `فردا: ${stats.upcomingForecast?.tomorrow ?? 0}`}</span>
              <span className="text-border">•</span>
              <span>{isEn ? `7d: ${stats.upcomingForecast?.next7Days ?? 0}` : `هفته: ${stats.upcomingForecast?.next7Days ?? 0}`}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mode Switcher: Scheduled Review vs Cram Practice */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-muted/40 border border-border">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setStudyMode("due")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              studyMode === "due"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{isEn ? `Scheduled Due (${dueCards.length})` : `مرورهای موعد رسیده (${dueCards.length})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setStudyMode("cram")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
              studyMode === "cram"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>{isEn ? `Cram / Free Practice (${cramCards.length})` : `مرور تقویتی و آزاد (${cramCards.length})`}</span>
          </button>
        </div>

        {/* Cram Mode Filter Chips */}
        {studyMode === "cram" && (
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] text-muted-foreground">{isEn ? "Filter:" : "فیلتر:"}</span>
            <select
              value={cramBoxFilter}
              onChange={(e) =>
                setCramBoxFilter(e.target.value === "all" ? "all" : Number(e.target.value))
              }
              className="py-1 px-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none"
            >
              <option value="all">{isEn ? "All Boxes" : "تمامی جعبه‌ها"}</option>
              <option value="1">{isEn ? "Box 1" : "جعبه ۱"}</option>
              <option value="2">{isEn ? "Box 2" : "جعبه ۲"}</option>
              <option value="3">{isEn ? "Box 3" : "جعبه ۳"}</option>
              <option value="4">{isEn ? "Box 4" : "جعبه ۴"}</option>
              <option value="5">{isEn ? "Box 5" : "جعبه ۵"}</option>
            </select>

            {documents.length > 0 && (
              <select
                value={cramDocFilter}
                onChange={(e) => setCramDocFilter(e.target.value)}
                className="py-1 px-2 rounded-lg bg-card border border-border text-xs text-foreground focus:outline-none max-w-[140px] truncate"
              >
                <option value="all">{isEn ? "All Docs" : "تمامی اسناد"}</option>
                {documents.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title}
                  </option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={() => setCramLapsedOnly((l) => !l)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                cramLapsedOnly
                  ? "bg-rose-500/10 border-rose-500/40 text-rose-600 dark:text-rose-400"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEn ? "Lapsed Only" : "فقط پرچالش‌ها"}
            </button>

            <button
              type="button"
              onClick={() => handleStartStudy("cram")}
              className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition cursor-pointer"
            >
              {isEn ? "Start Practice" : "شروع تمرین"}
            </button>
          </div>
        )}
      </div>

      {/* Active Study Session Runner */}
      {isStudying && activeCard ? (() => {
        const currentText = isFlipped ? activeCard.back : activeCard.front;
        const isCardRtl = cardDirectionOverride ? cardDirectionOverride === "rtl" : isPersianText(currentText);

        const preview1 = previewNextInterval(activeCard, 1);
        const preview2 = previewNextInterval(activeCard, 2);
        const preview3 = previewNextInterval(activeCard, 3);
        const preview4 = previewNextInterval(activeCard, 4);

        return (
          <div className="p-6 rounded-3xl bg-card border-2 border-primary/50 shadow-xl flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200 max-w-2xl mx-auto w-full">
            {/* Session Top Bar */}
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
              <span className="font-mono text-primary font-bold">
                {currentIndex + 1} / {activeQueue.length}
              </span>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(activeCard)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title={isEn ? "Quick edit card (E)" : "ویرایش سریع کارت (E)"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCardDirectionOverride((curr) =>
                      curr ? (curr === "rtl" ? "ltr" : "rtl") : isCardRtl ? "ltr" : "rtl"
                    )
                  }
                  className="px-2 py-0.5 rounded-lg bg-secondary hover:bg-secondary/80 text-[10px] text-muted-foreground hover:text-foreground font-semibold transition cursor-pointer"
                  title={isEn ? "Toggle RTL / LTR direction (R)" : "تغییر جهت راست‌چین / چپ‌چین (R)"}
                >
                  {isCardRtl ? "🇮🇷 RTL" : "🇬🇧 LTR"}
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
              className="w-full min-h-[220px] p-6 rounded-2xl bg-muted/40 border border-border flex flex-col items-center justify-center cursor-pointer select-none transition-all duration-300 hover:border-primary/50 hover:shadow-md relative"
            >
              {/* Header Label and TTS Button */}
              <div className="w-full flex items-center justify-between mb-3">
                <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">
                  {isFlipped
                    ? isEn
                      ? "Answer / Explanation"
                      : "پاسخ / توضیحات"
                    : isEn
                    ? "Question / Concept (Click or Space to flip)"
                    : "پرسش / مفهوم (کلیک یا Space برای چرخاندن)"}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSpeak(currentText);
                  }}
                  className="p-1 rounded-lg text-muted-foreground hover:text-primary transition cursor-pointer"
                  title={isEn ? "Pronounce / Read aloud (S)" : "تلفظ و خوانش صوتی (S)"}
                >
                  {isSpeaking ? (
                    <VolumeX className="w-4 h-4 text-primary animate-pulse" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Card Question / Answer Text */}
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
                      <span>{isEn ? "Show Hint (H)" : "نمایش سرنخ (H)"}</span>
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

            <div className="flex justify-center">
              <span className="px-2 py-0.5 rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                {getLeitnerSchedulingAlgorithm(activeCard) === "fsrs6" ? "FSRS 6" : "SM-2"}
              </span>
            </div>

            {/* Four ratings are shared by the selected per-card scheduler. */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full">
              {/* Rating 1: Again */}
              <button
                type="button"
                disabled={!isFlipped || isSubmittingRating}
                onClick={() => handleReviewAnswer(1)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-rose-600 hover:bg-rose-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs shadow-md shadow-rose-600/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <XCircle className="w-3.5 h-3.5" />
                  <span>{getLeitnerSchedulingAlgorithm(activeCard) === "fsrs6"
                    ? (isEn ? "Again" : "دوباره")
                    : (isEn ? "Forgot (Box 1)" : "فراموش کردم (جعبه ۱)")}</span>
                </div>
                <span className="text-[10px] opacity-80 mt-0.5 font-mono">
                  {isEn ? preview1.textEn : preview1.textFa} • [1]
                </span>
              </button>

              {/* Rating 2: Hard */}
              <button
                type="button"
                disabled={!isFlipped || isSubmittingRating}
                onClick={() => handleReviewAnswer(2)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs shadow-md shadow-amber-600/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isEn ? "Hard" : "سخت"}</span>
                </div>
                <span className="text-[10px] opacity-80 mt-0.5 font-mono">
                  +{isEn ? preview2.textEn : preview2.textFa} • [2]
                </span>
              </button>

              {/* Rating 3: Good */}
              <button
                type="button"
                disabled={!isFlipped || isSubmittingRating}
                onClick={() => handleReviewAnswer(3)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-sky-600 hover:bg-sky-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs shadow-md shadow-sky-600/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{getLeitnerSchedulingAlgorithm(activeCard) === "fsrs6"
                    ? (isEn ? "Good" : "خوب")
                    : (isEn ? "Remembered (+1 Box)" : "بلدم (انتقال به جعبه بعدی)")}</span>
                </div>
                <span className="text-[10px] opacity-80 mt-0.5 font-mono">
                  +{isEn ? preview3.textEn : preview3.textFa} • [3]
                </span>
              </button>

              {/* Rating 4: Easy */}
              <button
                type="button"
                disabled={!isFlipped || isSubmittingRating}
                onClick={() => handleReviewAnswer(4)}
                className="flex flex-col items-center justify-center p-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <div className="flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  <span>{getLeitnerSchedulingAlgorithm(activeCard) === "fsrs6"
                    ? (isEn ? "Easy" : "آسان")
                    : (isEn ? "Easy (Master)" : "آسان (جهش سریع)")}</span>
                </div>
                <span className="text-[10px] opacity-80 mt-0.5 font-mono">
                  +{isEn ? preview4.textEn : preview4.textFa} • [4]
                </span>
              </button>
            </div>
          </div>
        );
      })() : null}

      {/* Cards Table / List with Search and Box Filtering */}
      <div className="p-4 rounded-3xl bg-card border border-border space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-foreground">
              {isEn ? "All Flashcards" : "تمامی فلش‌کارت‌ها"} ({displayedCards.length})
            </h3>
            <span className="text-[11px] text-muted-foreground">
              {stats.masteredCount} {isEn ? "Mastered" : "مسلط شده"}
            </span>
          </div>

          {/* Quick Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isEn ? "Search cards..." : "جستجو در کارت‌ها..."}
              className="pl-8 pr-3 py-1.5 w-full sm:w-56 rounded-xl bg-background border border-border text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
        </div>

        {/* Box Filter Tab Chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <button
            type="button"
            onClick={() => setSelectedBoxTab("all")}
            className={`px-3 py-1 rounded-xl font-semibold border transition cursor-pointer shrink-0 ${
              selectedBoxTab === "all"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {isEn ? "All" : "همه"} ({cards.length})
          </button>
          {[1, 2, 3, 4, 5].map((bx) => (
            <button
              key={bx}
              type="button"
              onClick={() => setSelectedBoxTab(bx)}
              className={`px-2.5 py-1 rounded-xl font-semibold border transition cursor-pointer shrink-0 ${
                selectedBoxTab === bx
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/40 border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {isEn ? `Box ${bx}` : `جعبه ${bx}`} ({(stats as any)[`box${bx}`] || 0})
            </button>
          ))}
        </div>

        {displayedCards.length === 0 ? (
          <div className="p-8 text-center text-xs text-muted-foreground">
            {isEn
              ? "No flashcards match your criteria."
              : "کارتی با معیارهای انتخابی یافت نشد."}
          </div>
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {displayedCards.map((c) => {
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
                      onClick={() => openEditModal(c)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground transition cursor-pointer"
                      title={isEn ? "Edit card" : "ویرایش کارت"}
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteCard(c.id)}
                      className="p-1 rounded text-muted-foreground hover:text-rose-500 transition cursor-pointer"
                      title={isEn ? "Delete card" : "حذف کارت"}
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

      {/* Quick Edit Card Modal */}
      <Dialog open={!!editingCard} onOpenChange={(open) => !open && setEditingCard(null)}>
        <DialogContent className="max-w-md bg-card border border-border text-foreground rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-primary" />
              <span>{isEn ? "Edit Flashcard" : "ویرایش فلش‌کارت"}</span>
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveEdit} className="space-y-3 pt-2">
            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Front (Question / Prompt)" : "روی کارت (پرسش)"}
              </label>
              <textarea
                required
                rows={2}
                dir="auto"
                value={editFront}
                onChange={(e) => setEditFront(e.target.value)}
                className="w-full p-2.5 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Back (Answer / Clinical Key)" : "پشت کارت (پاسخ)"}
              </label>
              <textarea
                required
                rows={3}
                dir="auto"
                value={editBack}
                onChange={(e) => setEditBack(e.target.value)}
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
                value={editClue}
                onChange={(e) => setEditClue(e.target.value)}
                className="w-full py-1.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <div>
              <label className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Leitner Box" : "جعبه لایتنر"}
              </label>
              <select
                value={editBox}
                onChange={(e) => setEditBox(Number(e.target.value))}
                className="w-full py-1.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value={1}>{isEn ? "Box 1 (Daily)" : "جعبه ۱ (روزانه)"}</option>
                <option value={2}>{isEn ? "Box 2 (3 Days)" : "جعبه ۲ (۳ روز)"}</option>
                <option value={3}>{isEn ? "Box 3 (7 Days)" : "جعبه ۳ (۷ روز)"}</option>
                <option value={4}>{isEn ? "Box 4 (14 Days)" : "جعبه ۴ (۱۴ روز)"}</option>
                <option value={5}>{isEn ? "Box 5 (Mastered)" : "جعبه ۵ (تسلط کامل)"}</option>
              </select>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingCard(null)}
                className="px-3 py-1.5 rounded-xl text-xs text-muted-foreground hover:text-foreground transition cursor-pointer"
              >
                {isEn ? "Cancel" : "انصراف"}
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold shadow-sm transition cursor-pointer"
              >
                {isEn ? "Save Changes" : "ذخیره تغییرات"}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

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

            <div>
              <label htmlFor="new-card-scheduler" className="block text-[11px] text-muted-foreground mb-1">
                {isEn ? "Review scheduling" : "روش زمان‌بندی مرور"}
              </label>
              <select
                id="new-card-scheduler"
                value={newCardAlgorithm}
                onChange={(event) => setNewCardAlgorithm(event.target.value as LeitnerSchedulingAlgorithm)}
                className="w-full py-1.5 px-3 bg-background border border-border rounded-xl text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="fsrs6">{isEn ? "FSRS 6 (recommended)" : "FSRS 6 (پیشنهادی)"}</option>
                <option value="sm2">{isEn ? "SM-2 (legacy)" : "SM-2 (قدیمی)"}</option>
              </select>
              <p className="mt-1 text-[10px] text-muted-foreground">
                {isEn
                  ? "Applies only to this new card; existing cards and review dates remain unchanged."
                  : "فقط روی همین کارت تازه اعمال می‌شود؛ کارت‌ها و تاریخ‌های مرور قبلی تغییر نمی‌کنند."}
              </p>
            </div>

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

      {/* Study Task Schedule Modal */}
      {scheduleModalOpen && (
        <StudyTaskScheduleModal
          open={scheduleModalOpen}
          onOpenChange={setScheduleModalOpen}
          targetType="leitner"
          targetId="all"
          targetTitle={isEn ? "Leitner Flashcard Review" : "مرور کارت‌های لایتنر"}
        />
      )}
    </div>
  );
};

export default LeitnerDeckView;
