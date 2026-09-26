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
  List,
  ListTree,
  Maximize2,
  Minimize2,
  Moon,
  Sun,
} from "lucide-react";
import { useBilingual } from "@/hooks/useBilingual";
import type {
  LeitnerCard,
  LeitnerBoxStats,
  LeitnerRating,
  LeitnerSchedulingAlgorithm,
} from "@/lib/leitnerTypes";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
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
import {
  getNextLeitnerReviewAt,
  rescheduleLeitnerStudyTaskAfterSession,
} from "@/lib/taskStudyService";
import { getKnowledgeDocuments, getKnowledgeFolders } from "@/lib/knowledgeService";
import {
  buildLeitnerOutline,
  filterLeitnerCards,
  getKnowledgeFolderBreadcrumb,
  getLeitnerCardsForFolderBranch,
} from "@/lib/leitnerOutline";
import { LeitnerOutlineView } from "@/components/review/LeitnerOutlineView";
import { isPersianText } from "@/lib/bilingualHelper";
import { resolveLeitnerCardContent, type StudyContentLanguage } from "@/lib/leitnerCardLanguage";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StudyTaskScheduleModal } from "@/components/knowledge/StudyTaskScheduleModal";
import { toast } from "sonner";

interface LeitnerDeckViewProps {
  userId: string;
  cardLanguage?: StudyContentLanguage;
  onOpenDocument?: (docId: string) => void;
  initialStudyDocumentId?: string;
  initialStudyFolderId?: string;
  initialStudyTaskId?: string;
}

interface StudyStartOptions {
  queue?: LeitnerCard[];
  scopeLabel?: string;
  rescheduleLinkedTask?: boolean;
}

export const LeitnerDeckView: React.FC<LeitnerDeckViewProps> = ({
  userId,
  cardLanguage = "fa",
  onOpenDocument,
  initialStudyDocumentId,
  initialStudyFolderId,
  initialStudyTaskId,
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
  const [folders, setFolders] = useState<KnowledgeFolder[]>([]);

  // Mode: "due" (Scheduled Spaced Repetition) vs "cram" (Free Practice / Custom Cram)
  const [studyMode, setStudyMode] = useState<"due" | "cram">("due");
  const [cramBoxFilter, setCramBoxFilter] = useState<number | "all">("all");
  const [cramDocFilter, setCramDocFilter] = useState<string>("all");
  const [cramLapsedOnly, setCramLapsedOnly] = useState<boolean>(false);

  const scheduledReviewCards = useMemo(() => {
    if (initialStudyFolderId) {
      return getLeitnerCardsForFolderBranch(dueCards, folders, documents, initialStudyFolderId);
    }
    return initialStudyDocumentId
      ? dueCards.filter((card) => card.document_id === initialStudyDocumentId)
      : dueCards;
  }, [documents, dueCards, folders, initialStudyDocumentId, initialStudyFolderId]);
  const eligibleStudyCardIds = useMemo(
    () => new Set(scheduledReviewCards.map((card) => card.id)),
    [scheduledReviewCards],
  );
  const scheduledReviewDocument = documents.find((document) => document.id === initialStudyDocumentId);
  const scheduledReviewFolder = folders.find((folder) => folder.id === initialStudyFolderId);

  // Study Session State
  const [isStudying, setIsStudying] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [focusTheme, setFocusTheme] = useState<"oled" | "paper">("oled");
  const [activeQueue, setActiveQueue] = useState<LeitnerCard[]>([]);
  const [activeStudyScopeLabel, setActiveStudyScopeLabel] = useState<string | null>(null);
  const [shouldRescheduleLinkedTask, setShouldRescheduleLinkedTask] = useState(false);
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
  const [editFrontFa, setEditFrontFa] = useState("");
  const [editBackFa, setEditBackFa] = useState("");
  const [editFrontEn, setEditFrontEn] = useState("");
  const [editBackEn, setEditBackEn] = useState("");
  const [editClue, setEditClue] = useState("");
  const [editBox, setEditBox] = useState<number>(1);

  // New Card Modal
  const [openNewCard, setOpenNewCard] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [frontInput, setFrontInput] = useState("");
  const [backInput, setBackInput] = useState("");
  const [frontFaInput, setFrontFaInput] = useState("");
  const [backFaInput, setBackFaInput] = useState("");
  const [frontEnInput, setFrontEnInput] = useState("");
  const [backEnInput, setBackEnInput] = useState("");
  const [clueInput, setClueInput] = useState("");
  const [selectedDocId, setSelectedDocId] = useState<string>("");
  const [newCardAlgorithm, setNewCardAlgorithm] = useState<LeitnerSchedulingAlgorithm>("fsrs6");

  // Card List Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBoxTab, setSelectedBoxTab] = useState<number | "all">("all");
  const [dueFilter, setDueFilter] = useState<"all" | "due" | "not-due">("all");
  const [lapsedOnly, setLapsedOnly] = useState(false);
  const [cardViewMode, setCardViewMode] = useState<"list" | "outline">("list");

  const loadData = useCallback(async () => {
    try {
      const allCards = await getLeitnerCards(userId);
      const evaluatedAt = new Date();
      const [due, s] = await Promise.all([
        getDueLeitnerCards(userId, allCards, evaluatedAt),
        getLeitnerBoxStats(userId, allCards, evaluatedAt),
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
    } catch (e) {
      console.error("Error loading Leitner data", e);
    }
  }, [userId]);

  const loadKnowledgeStructure = useCallback(async () => {
    try {
      const [docs, knowledgeFolders] = await Promise.all([
        getKnowledgeDocuments(userId),
        getKnowledgeFolders(userId).catch(() => []),
      ]);
      setDocuments(docs);
      setFolders(knowledgeFolders);
    } catch (e) {
      console.error("Error loading Leitner outline structure", e);
    }
  }, [userId]);

  useEffect(() => {
    loadData();
    loadKnowledgeStructure();
  }, [loadData, loadKnowledgeStructure]);

  useEffect(() => {
    setCramDocFilter(initialStudyDocumentId || "all");
  }, [initialStudyDocumentId]);

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
  const handleStartStudy = useCallback((mode: "due" | "cram" = studyMode, options: StudyStartOptions = {}) => {
    const queue = options.queue ? [...options.queue] : mode === "due" ? [...scheduledReviewCards] : [...cramCards];
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
    setStudyMode(mode);
    setShouldRescheduleLinkedTask(
      options.rescheduleLinkedTask ?? (mode === "due" && Boolean(initialStudyTaskId) && !options.queue),
    );
    setActiveStudyScopeLabel(options.scopeLabel ?? null);
    setActiveQueue(queue);
    setCurrentIndex(0);
    setIsFlipped(false);
    setShowClue(false);
    setCardDirectionOverride(null);
    setIsFocusMode(false);
    setIsStudying(true);
  }, [cramCards, initialStudyTaskId, isEn, scheduledReviewCards, studyMode]);

  const handleStudyOutlineCards = useCallback((branchCards: LeitnerCard[], scopeLabel: string) => {
    const currentCardsById = new Map(cards.map((card) => [card.id, card]));
    const queue = branchCards
      .map((card) => currentCardsById.get(card.id))
      .filter((card): card is LeitnerCard => Boolean(card) && eligibleStudyCardIds.has(card.id));

    handleStartStudy("due", {
      queue,
      scopeLabel,
      rescheduleLinkedTask: false,
    });
  }, [cards, eligibleStudyCardIds, handleStartStudy]);

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
        setIsFocusMode(false);
        if (initialStudyTaskId && shouldRescheduleLinkedTask) {
          try {
            const latestCards = await getLeitnerCards(userId);
            const targetId = initialStudyFolderId || initialStudyDocumentId || "all";
            const scopedCards = initialStudyFolderId
              ? getLeitnerCardsForFolderBranch(latestCards, folders, documents, initialStudyFolderId)
              : latestCards;
            const nextReviewAt = getNextLeitnerReviewAt(
              scopedCards,
              initialStudyFolderId ? "all" : targetId,
            );

            if (!nextReviewAt) {
              toast.info(
                isEn
                  ? "Session finished, but no next review date was found; the task was left unchanged."
                  : "جلسه تمام شد، اما موعد مرور بعدی پیدا نشد؛ تاریخ تسک تغییر نکرد."
              );
            } else {
              const result = await rescheduleLeitnerStudyTaskAfterSession({
                userId,
                taskId: initialStudyTaskId,
                targetType: initialStudyFolderId ? "leitner_folder" : "leitner",
                targetId,
                nextReviewAt,
              });

              if (!result.ok) {
                toast.info(
                  isEn
                    ? "Session finished, but the review task could not be moved to its next date."
                    : "جلسه تمام شد، اما انتقال تسک مرور به موعد بعدی ذخیره نشد."
                );
              } else if (result.status === "queued") {
                toast.info(
                  isEn
                    ? "Session completed; the next review date is saved locally and will sync online."
                    : "جلسه تمام شد؛ موعد بعدی محلی ذخیره شد و با اتصال همگام می‌شود."
                );
              } else {
                toast.success(
                  isEn
                    ? "Review session completed; the task moved to the next scheduled review."
                    : "جلسه مرور تمام شد؛ تسک به موعد مرور بعدی منتقل شد."
                );
              }
            }
          } catch {
            toast.info(
              isEn
                ? "Session finished, but the next review date could not be read; the task was left unchanged."
                : "جلسه تمام شد، اما موعد بعدی خوانده نشد؛ تاریخ تسک تغییر نکرد."
            );
          }
        } else {
          toast.success(
            isEn
              ? activeStudyScopeLabel ? `Review completed: ${activeStudyScopeLabel}` : "Review session completed!"
              : activeStudyScopeLabel ? `مرور «${activeStudyScopeLabel}» تمام شد.` : "جلسه مرور امروز به پایان رسید!"
          );
        }
      }
      await loadData();
    } catch (e) {
      toast.error("Error updating review");
    } finally {
      ratingSubmissionRef.current = false;
      setIsSubmittingRating(false);
    }
  }, [
    activeCard,
    activeQueue,
    activeStudyScopeLabel,
    currentIndex,
    documents,
    initialStudyDocumentId,
    initialStudyFolderId,
    initialStudyTaskId,
    isEn,
    isFlipped,
    loadData,
    folders,
    shouldRescheduleLinkedTask,
    userId,
  ]);

  const openEditModal = useCallback((card: LeitnerCard) => {
    setEditingCard(card);
    setEditFront(card.front);
    setEditBack(card.back);
    setEditFrontFa(card.front_fa || "");
    setEditBackFa(card.back_fa || "");
    setEditFrontEn(card.front_en || "");
    setEditBackEn(card.back_en || "");
    setEditClue(card.clue || "");
    setEditBox(card.box);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (!isStudying || !activeCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;

      if (e.code === "Space" || e.code === "Enter") {
        e.preventDefault();
        setIsFlipped((f) => !f);
      } else if (e.key === "Escape" && isFocusMode) {
        e.preventDefault();
        setIsFocusMode(false);
      } else if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        setIsFocusMode((focused) => !focused);
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
        const localizedCard = resolveLeitnerCardContent(activeCard, cardLanguage);
        const currentSide = isFlipped ? localizedCard.back : localizedCard.front;
        const currentText = currentSide.text;
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
  }, [isStudying, activeCard, isFlipped, isFocusMode, handleSpeak, handleReviewAnswer, activeQueue, currentIndex, openEditModal, cardLanguage]);

  const handleCreateCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontInput.trim() || !backInput.trim()) return;

    try {
      await createLeitnerCard(userId, {
        front: frontInput.trim(),
        back: backInput.trim(),
        ...(frontFaInput.trim() ? { front_fa: frontFaInput.trim() } : {}),
        ...(backFaInput.trim() ? { back_fa: backFaInput.trim() } : {}),
        ...(frontEnInput.trim() ? { front_en: frontEnInput.trim() } : {}),
        ...(backEnInput.trim() ? { back_en: backEnInput.trim() } : {}),
        clue: clueInput.trim() || undefined,
        document_id: selectedDocId || null,
        scheduling_algorithm: newCardAlgorithm,
      });
      setFrontInput("");
      setBackInput("");
      setFrontFaInput("");
      setBackFaInput("");
      setFrontEnInput("");
      setBackEnInput("");
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

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCard) return;

    try {
      const updated = await updateLeitnerCard(userId, editingCard.id, {
        front: editFront.trim(),
        back: editBack.trim(),
        front_fa: editFrontFa.trim(),
        back_fa: editBackFa.trim(),
        front_en: editFrontEn.trim(),
        back_en: editBackEn.trim(),
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

  const handleDeleteCard = useCallback(async (cardId: string) => {
    try {
      await deleteLeitnerCard(userId, cardId);
      toast.success(isEn ? "Card deleted" : "کارت حذف شد");
      await loadData();
    } catch (e) {
      toast.error("Error deleting card");
    }
  }, [isEn, loadData, userId]);

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
  const scopedInventoryCards = useMemo(() => {
    if (initialStudyFolderId) {
      return getLeitnerCardsForFolderBranch(cards, folders, documents, initialStudyFolderId);
    }
    return initialStudyDocumentId
      ? cards.filter((card) => card.document_id === initialStudyDocumentId)
      : cards;
  }, [cards, documents, folders, initialStudyDocumentId, initialStudyFolderId]);
  const dueCardIds = useMemo(
    () => new Set((initialStudyFolderId || initialStudyDocumentId ? scheduledReviewCards : dueCards).map((card) => card.id)),
    [dueCards, initialStudyDocumentId, initialStudyFolderId, scheduledReviewCards],
  );
  const displayedCards = useMemo(
    () => filterLeitnerCards(scopedInventoryCards, {
      query: searchQuery,
      box: selectedBoxTab,
      due: dueFilter,
      lapsedOnly,
      dueCardIds,
    }),
    [scopedInventoryCards, dueCardIds, dueFilter, lapsedOnly, searchQuery, selectedBoxTab],
  );
  const displayedOutline = useMemo(
    () => buildLeitnerOutline(displayedCards, folders, documents, eligibleStudyCardIds),
    [displayedCards, documents, eligibleStudyCardIds, folders],
  );
  const scheduleTargetOptions = useMemo(() => {
    const folderOptions = folders
      .filter((folder) => getLeitnerCardsForFolderBranch(cards, folders, documents, folder.id).length > 0)
      .map((folder) => ({
        id: folder.id,
        title: getKnowledgeFolderBreadcrumb(folders, folder.id, isEn ? " › " : " ← "),
        targetType: "leitner_folder" as const,
      }));
    const linkedDocumentIds = new Set(cards.flatMap((card) => card.document_id ? [card.document_id] : []));
    const documentOptions = documents
      .filter((document) => linkedDocumentIds.has(document.id))
      .map((document) => ({
        id: document.id,
        title: isEn ? document.title_en || document.title : document.title,
        targetType: "leitner" as const,
      }));
    return [...folderOptions, ...documentOptions];
  }, [cards, documents, folders, isEn]);

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
              {isEn ? `Study (${scheduledReviewCards.length})` : `شروع مرور (${scheduledReviewCards.length} آماده)`}
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

      {(initialStudyDocumentId || initialStudyFolderId) && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground">
          {initialStudyFolderId
            ? (isEn ? "This review task includes due cards in this folder and its subfolders:" : "این تسک کارت‌های موعددارِ این پوشه و زیرپوشه‌هایش را مرور می‌کند:")
            : (isEn ? "This review task is limited to due cards for:" : "این تسک فقط کارت‌های موعددارِ درس زیر را مرور می‌کند:")}{" "}
          <span className="font-semibold text-foreground">
            {initialStudyFolderId
              ? (scheduledReviewFolder
                ? getKnowledgeFolderBreadcrumb(folders, scheduledReviewFolder.id, isEn ? " › " : " ← ")
                : initialStudyFolderId)
              : scheduledReviewDocument
                ? (isEn ? scheduledReviewDocument.title_en || scheduledReviewDocument.title : scheduledReviewDocument.title)
                : initialStudyDocumentId}
          </span>
        </div>
      )}

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
            <span>{isEn ? `Scheduled Due (${scheduledReviewCards.length})` : `مرورهای موعد رسیده (${scheduledReviewCards.length})`}</span>
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
        const localizedCard = resolveLeitnerCardContent(activeCard, cardLanguage);
        const currentSide = isFlipped ? localizedCard.back : localizedCard.front;
        const currentText = currentSide.text;
        const isCardRtl = cardDirectionOverride ? cardDirectionOverride === "rtl" : isPersianText(currentText);

        const preview1 = previewNextInterval(activeCard, 1);
        const preview2 = previewNextInterval(activeCard, 2);
        const preview3 = previewNextInterval(activeCard, 3);
        const preview4 = previewNextInterval(activeCard, 4);

        const sessionCard = (
          <div className={isFocusMode
            ? "mx-auto flex min-h-full w-full max-w-4xl flex-col items-center justify-center space-y-6 p-4 text-center sm:p-8"
            : "p-6 rounded-3xl bg-card border-2 border-primary/50 shadow-xl flex flex-col items-center justify-center text-center space-y-6 animate-in zoom-in-95 duration-200 max-w-2xl mx-auto w-full"}
          >
            {/* Session Top Bar */}
            <div className="w-full flex items-center justify-between text-xs text-muted-foreground border-b border-border pb-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 font-mono font-bold text-primary">
                  {currentIndex + 1} / {activeQueue.length}
                </span>
                {activeStudyScopeLabel && (
                  <span className="max-w-[35vw] truncate text-muted-foreground" title={activeStudyScopeLabel}>
                    {activeStudyScopeLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEditModal(activeCard)}
                  className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                  title={isEn ? "Quick edit card (E)" : "ویرایش سریع کارت (E)"}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </button>

                {!isFocusMode && (
                  <button
                    type="button"
                    aria-label={isEn ? "Enter focus mode" : "حالت مطالعهٔ متمرکز"}
                    title={isEn ? "Distraction-free focus mode (Z)" : "حالت مطالعهٔ بدون حواس‌پرتی (Z)"}
                    onClick={() => setIsFocusMode(true)}
                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground transition cursor-pointer"
                  >
                    <Maximize2 aria-hidden="true" className="w-3.5 h-3.5" />
                  </button>
                )}

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
                onClick={() => {
                  setIsFocusMode(false);
                  setIsStudying(false);
                }}
                className="text-muted-foreground hover:text-foreground transition cursor-pointer text-xs"
              >
                {isEn ? "Exit" : "خروج"}
              </button>
            </div>

            {isFocusMode && (
              <div className="flex w-full flex-wrap items-center justify-between gap-3">
                <div
                  role="group"
                  aria-label={isEn ? "Focus reading theme" : "تم مطالعهٔ متمرکز"}
                  className="inline-flex items-center gap-1 rounded-xl border border-border bg-muted/50 p-1"
                >
                  <button
                    type="button"
                    aria-label={isEn ? "OLED dark theme" : "تم تیرهٔ OLED"}
                    aria-pressed={focusTheme === "oled"}
                    onClick={() => setFocusTheme("oled")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${focusTheme === "oled" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Moon aria-hidden="true" className="h-3.5 w-3.5" />
                    OLED
                  </button>
                  <button
                    type="button"
                    aria-label={isEn ? "Warm paper theme" : "تم کاغذی گرم"}
                    aria-pressed={focusTheme === "paper"}
                    onClick={() => setFocusTheme("paper")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition ${focusTheme === "paper" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    <Sun aria-hidden="true" className="h-3.5 w-3.5" />
                    {isEn ? "Paper" : "کاغذی"}
                  </button>
                </div>

                <button
                  type="button"
                  aria-label={isEn ? "Exit focus mode" : "خروج از حالت متمرکز"}
                  onClick={() => setIsFocusMode(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-muted/50 px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:text-foreground"
                >
                  <Minimize2 aria-hidden="true" className="h-3.5 w-3.5" />
                  {isEn ? "Exit focus (Esc)" : "خروج از تمرکز (Esc)"}
                </button>
              </div>
            )}

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
                dir={cardDirectionOverride ? cardDirectionOverride : "auto"}
                className="text-base sm:text-lg font-bold text-foreground leading-relaxed max-w-lg w-full text-start"
              >
                <span className="block whitespace-pre-wrap">{currentText}</span>
                {currentSide.secondaryText && (
                  <span
                    dir="auto"
                    className="mt-2 block border-t border-border/70 pt-2 text-sm font-medium text-muted-foreground text-start"
                  >
                    {currentSide.secondaryText}
                  </span>
                )}
              </div>

              {currentSide.translationMissing && (
                <p role="status" className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-[10px] leading-4 text-amber-800 dark:text-amber-200">
                  {cardLanguage === "bilingual"
                    ? isEn
                      ? "One language version is missing; showing the available card text."
                      : "یکی از نسخه‌های زبانی موجود نیست؛ متن موجود نمایش داده شده است."
                    : isEn
                      ? `${cardLanguage === "fa" ? "Persian" : "English"} version is not available; showing the original text (${currentSide.language === "fa" ? "Persian" : "English"}).`
                      : `نسخهٔ ${cardLanguage === "fa" ? "فارسی" : "انگلیسی"} موجود نیست؛ متن اصلی ${currentSide.language === "fa" ? "فارسی" : "انگلیسی"} نمایش داده شده است.`}
                </p>
              )}

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

        if (!isFocusMode) return sessionCard;

        return (
          <Dialog open onOpenChange={setIsFocusMode}>
            <DialogContent
              data-study-theme={focusTheme}
              className="leitner-focus-dialog h-[100dvh] max-h-[100dvh] w-screen max-w-none gap-0 overflow-y-auto rounded-none border-0 p-0 shadow-none sm:rounded-none"
            >
              <DialogTitle className="sr-only">
                {isEn ? "Leitner focus study" : "مطالعهٔ متمرکز لایتنر"}
              </DialogTitle>
              {sessionCard}
            </DialogContent>
          </Dialog>
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

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div role="group" aria-label={isEn ? "Card inventory view" : "نمای فهرست کارت‌ها"} className="inline-flex rounded-xl border border-border bg-muted/40 p-1">
            <button
              type="button"
              aria-label={isEn ? "List view" : "نمای فهرستی"}
              aria-pressed={cardViewMode === "list"}
              onClick={() => setCardViewMode("list")}
              className={`rounded-lg p-2 transition ${cardViewMode === "list" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <List aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label={isEn ? "Outline view" : "نمای درختی"}
              aria-pressed={cardViewMode === "outline"}
              onClick={() => setCardViewMode("outline")}
              className={`rounded-lg p-2 transition ${cardViewMode === "outline" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
            >
              <ListTree aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {([
              ["all", isEn ? "All dates" : "همه موعدها"],
              ["due", isEn ? "Due now" : "موعد مرور"],
              ["not-due", isEn ? "Upcoming" : "موعدهای بعدی"],
            ] as const).map(([filter, label]) => (
              <button
                key={filter}
                type="button"
                aria-pressed={dueFilter === filter}
                onClick={() => setDueFilter(filter)}
                className={`shrink-0 rounded-xl border px-3 py-1.5 font-semibold transition ${dueFilter === filter ? "border-primary bg-primary text-primary-foreground" : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              aria-pressed={lapsedOnly}
              onClick={() => setLapsedOnly((current) => !current)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 font-semibold transition ${lapsedOnly ? "border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-300" : "border-border bg-muted/40 text-muted-foreground hover:text-foreground"}`}
            >
              <Filter aria-hidden="true" className="h-3.5 w-3.5" />
              {isEn ? "Lapsed only" : "فقط کارت‌های نیازمند تقویت"}
            </button>
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
        ) : cardViewMode === "outline" ? (
          <LeitnerOutlineView
            outline={displayedOutline}
            dueCardIds={dueCardIds}
            eligibleStudyCardIds={eligibleStudyCardIds}
            isEn={isEn}
            cardLanguage={cardLanguage}
            onEdit={openEditModal}
            onDelete={handleDeleteCard}
            onStudyDueCards={handleStudyOutlineCards}
          />
        ) : (
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {displayedCards.map((c) => {
              const localized = resolveLeitnerCardContent(c, cardLanguage);
              const isFrontRtl = isPersianText(localized.front.text);
              const isBackRtl = isPersianText(localized.back.text);
              return (
                <div
                  key={c.id}
                  className="p-3 rounded-xl bg-muted/40 border border-border flex items-center justify-between gap-3 text-xs hover:bg-muted/70 transition"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div
                      dir="auto"
                      className="font-bold text-foreground break-words text-start"
                    >
                      {localized.front.text}
                    </div>
                    {localized.front.secondaryText && (
                      <div dir="auto" className="break-words text-[11px] text-muted-foreground text-start">
                        {localized.front.secondaryText}
                      </div>
                    )}
                    <div
                      dir="auto"
                      className="text-[11px] text-muted-foreground break-words text-start"
                    >
                      {localized.back.text}
                    </div>
                    {localized.back.secondaryText && (
                      <div dir="auto" className="break-words text-[10px] text-muted-foreground/80 text-start">
                        {localized.back.secondaryText}
                      </div>
                    )}
                    {(localized.front.translationMissing || localized.back.translationMissing) && (
                      <span className="inline-block text-[10px] leading-4 text-amber-700 dark:text-amber-300">
                        {isEn ? "Translation missing; original shown" : "ترجمه موجود نیست؛ متن اصلی نمایش داده می‌شود"}
                      </span>
                    )}
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

            <details className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-primary">
                {isEn ? "Persian / English versions" : "نسخه‌های فارسی و انگلیسی"}
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Question — فارسی" : "پرسش — فارسی"}</span>
                  <textarea dir="rtl" rows={2} value={editFrontFa} onChange={(e) => setEditFrontFa(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Answer — فارسی" : "پاسخ — فارسی"}</span>
                  <textarea dir="rtl" rows={2} value={editBackFa} onChange={(e) => setEditBackFa(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Question — English" : "پرسش — English"}</span>
                  <textarea dir="ltr" rows={2} value={editFrontEn} onChange={(e) => setEditFrontEn(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Answer — English" : "پاسخ — English"}</span>
                  <textarea dir="ltr" rows={2} value={editBackEn} onChange={(e) => setEditBackEn(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
              </div>
            </details>

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

            <details className="rounded-xl border border-border bg-muted/20 px-3 py-2">
              <summary className="cursor-pointer text-[11px] font-semibold text-primary">
                {isEn ? "Optional Persian / English versions" : "نسخه‌های فارسی و انگلیسی (اختیاری)"}
              </summary>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Question — فارسی" : "پرسش — فارسی"}</span>
                  <textarea dir="rtl" rows={2} value={frontFaInput} onChange={(e) => setFrontFaInput(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Answer — فارسی" : "پاسخ — فارسی"}</span>
                  <textarea dir="rtl" rows={2} value={backFaInput} onChange={(e) => setBackFaInput(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Question — English" : "پرسش — English"}</span>
                  <textarea dir="ltr" rows={2} value={frontEnInput} onChange={(e) => setFrontEnInput(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
                <label className="space-y-1 text-[10px] font-semibold text-muted-foreground">
                  <span>{isEn ? "Answer — English" : "پاسخ — English"}</span>
                  <textarea dir="ltr" rows={2} value={backEnInput} onChange={(e) => setBackEnInput(e.target.value)} className="w-full rounded-lg border border-border bg-background p-2 text-xs font-normal text-foreground" />
                </label>
              </div>
            </details>

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
          targetOptions={scheduleTargetOptions}
        />
      )}
    </div>
  );
};

export default LeitnerDeckView;
