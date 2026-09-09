'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Language } from '@/types/pharmacy';
import {
  LeitnerCard,
  LeitnerCardType,
  LEITNER_INTERVALS,
  LEITNER_BOX_NAMES,
} from '@/types/leitner';
import {
  Sparkles,
  Layers,
  CheckCircle2,
  XCircle,
  RotateCw,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Trash2,
  Play,
  Filter,
  Search,
  BookOpen,
  Tag,
  MessageSquare,
  HelpCircle,
  AlertCircle,
  Calendar,
  Award,
  Zap,
  FolderTree,
  Calculator,
  AlertTriangle,
  Flame,
  ShieldAlert,
  BarChart2,
  Download,
  Upload,
  Shuffle,
  Eye,
  EyeOff,
  Plus,
  ArrowLeft,
  ArrowRight,
  Maximize2,
  SlidersHorizontal,
  FileText,
  Volume2,
  X,
  Copy,
  Check,
  PanelRightClose,
  PanelRightOpen,
  CornerUpLeft,
  Network,
  Share2,
  Activity,
  Clock,
  ThumbsUp,
  RotateCcw,
  Compass,
  Sun,
  Moon,
  Settings,
  Star,
  Brain,
} from 'lucide-react';
import { formatBidiText } from '@/lib/bidiFormatter';
import { createPortal } from 'react-dom';
import {
  calculateFSRSRetention,
  scheduleFSRSNextReview,
  getFSRSEstimatedIntervals,
  FSRSRating,
} from '@/lib/fsrs';
import { INITIAL_SAMPLE_LEITNER_CARDS } from '@/lib/sample-leitner-cards';
import { haptic } from '@/lib/haptics';
import {
  LeitnerStudySettingsModal,
  LeitnerStudySettings,
  getStoredLeitnerSettings,
  saveStoredLeitnerSettings,
  DEFAULT_LEITNER_SETTINGS,
} from '@/components/LeitnerStudySettingsModal';

interface LeitnerDeckModuleProps {
  language: Language;
  cards: LeitnerCard[];
  onUpdateCards: (updatedCards: LeitnerCard[]) => void;
  initialView?: 'anki_study' | 'decks_manager';
  onOpenAiGenerator?: (snippetText?: string) => void;
  onOpenAiLeitner?: (snippetText?: string, moduleNum?: 1 | 2 | 4) => void;
}

export const LeitnerDeckModule: React.FC<LeitnerDeckModuleProps> = ({
  language,
  cards,
  onUpdateCards,
  initialView = 'anki_study',
  onOpenAiGenerator,
  onOpenAiLeitner,
}) => {
  const triggerAiGenerator = onOpenAiGenerator || onOpenAiLeitner || (() => {});
  const isFa = language === 'fa';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // View state: 'anki_study' (minimalist AnkiDroid review) | 'decks_manager' (folders, settings, analytics)
  const [internalView, setInternalView] = useState<'anki_study' | 'decks_manager' | null>(null);
  const [prevPropView, setPrevPropView] = useState<'anki_study' | 'decks_manager'>(initialView);

  if (initialView !== prevPropView) {
    setPrevPropView(initialView);
    setInternalView(initialView);
  }

  const currentView = internalView ?? initialView;
  const setCurrentView = (v: 'anki_study' | 'decks_manager') => setInternalView(v);

  // Study Configuration & Filter Scope
  const [studyScopeName, setStudyScopeName] = useState<string>('همه کارت‌های امروز (Due)');
  const [studyFilterDomain, setStudyFilterDomain] = useState<string>('ALL');
  const [studyFilterSystem, setStudyFilterSystem] = useState<string>('ALL');
  const [studyFilterSubsystem, setStudyFilterSubsystem] = useState<string>('ALL');
  const [studyFilterBox, setStudyFilterBox] = useState<number | 'ALL'>('ALL');
  const [studyFilterSingleCardId, setStudyFilterSingleCardId] = useState<string | null>(null);
  const [isCramMode, setIsCramMode] = useState<boolean>(false);

  // Leitner Study Settings State
  const [studySettings, setStudySettings] = useState<LeitnerStudySettings>(getStoredLeitnerSettings);
  const [isStudySettingsOpen, setIsStudySettingsOpen] = useState<boolean>(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'study' | 'fsrs' | 'display' | 'advanced' | 'backup'>('study');

  // Countdown timer for study
  const [timeLeft, setTimeLeft] = useState<number>(0);

  // Card Language Display Mode (bilingual | fa | en)
  const [cardLanguageMode, setCardLanguageMode] = useState<'bilingual' | 'fa' | 'en'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('leitner_card_lang_mode');
      if (saved === 'bilingual' || saved === 'fa' || saved === 'en') return saved;
    }
    return 'bilingual';
  });

  const handleSetCardLangMode = (mode: 'bilingual' | 'fa' | 'en') => {
    setCardLanguageMode(mode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('leitner_card_lang_mode', mode);
    }
  };

  // Anki Study Session State
  const [studyQueueIndex, setStudyQueueIndex] = useState<number>(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState<boolean>(false);
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);
  const [sessionCompleted, setSessionCompleted] = useState<boolean>(false);
  const [showSourceViewer, setShowSourceViewer] = useState<boolean>(false);
  const [copiedSourceSnippet, setCopiedSourceSnippet] = useState<boolean>(false);
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
  });

  // Zen / Deep Focus Mode state
  const [isZenMode, setIsZenMode] = useState<boolean>(false);
  const [zenTheme, setZenTheme] = useState<'oled' | 'paper'>('oled');

  // Tinder-Style Touch & Drag Swipe State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  // Manager state: search, folder expansion, filters
  const [searchQuery, setSearchQuery] = useState('');
  const [managerActiveTab, setManagerActiveTab] = useState<'folders' | 'all_cards' | 'boxes' | 'add_card' | 'stats'>('folders');
  const [managerFilterDomain, setManagerFilterDomain] = useState<string>('ALL');
  const [managerFilterBox, setManagerFilterBox] = useState<number | 'ALL'>('ALL');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});
  const [newCardForm, setNewCardForm] = useState<{
    domain: string;
    system: string;
    subsystem: string;
    question: string;
    answer: string;
    pearl: string;
    type: LeitnerCardType;
  }>({
    domain: 'داروسازی بالینی',
    system: 'قلب و عروق (Cardiovascular)',
    subsystem: 'داروهای فشار خون و نارسایی قلبی',
    question: '',
    answer: '',
    pearl: '',
    type: 'clinical_pearl',
  });

  // Reset timer on card change via render-time sync
  const [prevQueueIndexForTimer, setPrevQueueIndexForTimer] = useState(studyQueueIndex);
  if (studyQueueIndex !== prevQueueIndexForTimer) {
    setPrevQueueIndexForTimer(studyQueueIndex);
    setTimeLeft(studySettings.countdownTimer);
  }

  useEffect(() => {
    if (studySettings.countdownTimer > 0 && !isAnswerRevealed && !sessionCompleted) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [studyQueueIndex, isAnswerRevealed, sessionCompleted, studySettings.countdownTimer]);

  // Filter and order cards for active study session
  const activeStudyQueue = useMemo(() => {
    const nowIso = new Date().toISOString();
    const isCramActive = isCramMode || studySettings.algorithm === 'cram';

    let filtered = cards.filter((c) => {
      // Single card direct study
      if (studyFilterSingleCardId && c.id !== studyFilterSingleCardId) return false;

      // Scope filters based on Knowledge Tree and Leitner Box
      if (studyFilterBox !== 'ALL' && c.box !== studyFilterBox) return false;
      if (studyFilterDomain !== 'ALL') {
        const domainText = c.knowledgeTree?.domain
          ? isFa ? c.knowledgeTree.domain.fa || c.knowledgeTree.domain.en : c.knowledgeTree.domain.en || c.knowledgeTree.domain.fa
          : c.category;
        if (domainText !== studyFilterDomain) return false;
      }
      if (studyFilterSystem !== 'ALL') {
        const systemText = c.knowledgeTree?.system
          ? isFa ? c.knowledgeTree.system.fa || c.knowledgeTree.system.en : c.knowledgeTree.system.en || c.knowledgeTree.system.fa
          : c.topic;
        if (systemText !== studyFilterSystem) return false;
      }
      if (studyFilterSubsystem !== 'ALL') {
        const subText = c.knowledgeTree?.subsystem
          ? isFa ? c.knowledgeTree.subsystem.fa || c.knowledgeTree.subsystem.en : c.knowledgeTree.subsystem.en || c.knowledgeTree.subsystem.fa
          : c.knowledgeTree?.subClass
          ? isFa ? c.knowledgeTree.subClass.fa || c.knowledgeTree.subClass.en : c.knowledgeTree.subClass.en || c.knowledgeTree.subClass.fa
          : '';
        if (subText && subText !== studyFilterSubsystem) return false;
      }

      // If cram mode or single card mode, include all matching cards regardless of date
      if (isCramActive || studyFilterSingleCardId) return true;

      // Otherwise only include due cards
      if (!c.nextReviewDate) return true;
      return c.nextReviewDate <= nowIso;
    });

    // Apply Queue Ordering
    if (studySettings.cardOrder === 'random') {
      // Deterministic stable shuffle based on card ID hash (avoids impure Math.random in render)
      filtered = [...filtered].sort((a, b) => {
        let ha = 0;
        let hb = 0;
        for (let i = 0; i < a.id.length; i++) ha = (Math.imul(31, ha) + a.id.charCodeAt(i)) | 0;
        for (let i = 0; i < b.id.length; i++) hb = (Math.imul(31, hb) + b.id.charCodeAt(i)) | 0;
        return ha - hb;
      });
    } else if (studySettings.cardOrder === 'hardest_first') {
      filtered = [...filtered].sort((a, b) => (a.box - b.box) || ((a.fsrsStability || 1) - (b.fsrsStability || 1)));
    } else if (studySettings.cardOrder === 'due_first') {
      filtered = [...filtered].sort((a, b) => {
        const dateA = a.nextReviewDate ? new Date(a.nextReviewDate).getTime() : 0;
        const dateB = b.nextReviewDate ? new Date(b.nextReviewDate).getTime() : 0;
        return dateA - dateB;
      });
    }

    // Apply Daily Review Limit
    if (typeof studySettings.dailyLimit === 'number' && studySettings.dailyLimit > 0) {
      filtered = filtered.slice(0, studySettings.dailyLimit);
    }

    return filtered;
  }, [
    cards,
    studyFilterSingleCardId,
    studyFilterBox,
    studyFilterDomain,
    studyFilterSystem,
    studyFilterSubsystem,
    isCramMode,
    studySettings,
    isFa,
  ]);

  const currentStudyCard = activeStudyQueue[studyQueueIndex] || null;

  // Text helpers
  const getQuestionText = (c: LeitnerCard) => {
    if (!c || !c.question) return '';
    if (typeof c.question === 'string') return c.question;
    return isFa ? c.question.fa || c.question.en || '' : c.question.en || c.question.fa || '';
  };

  const getAnswerText = (c: LeitnerCard) => {
    if (!c || !c.answer) return '';
    if (typeof c.answer === 'string') return c.answer;
    return isFa ? c.answer.fa || c.answer.en || '' : c.answer.en || c.answer.fa || '';
  };

  const getPearlText = (c: LeitnerCard) => {
    if (!c || !c.pearl) return '';
    if (typeof c.pearl === 'string') return c.pearl;
    return isFa ? c.pearl.fa || c.pearl.en || '' : c.pearl.en || c.pearl.fa || '';
  };

  const getModuleName = (c: LeitnerCard) => {
    if (!c) return '';
    if (typeof c.moduleName === 'string') return c.moduleName;
    if (c.moduleName) {
      return isFa
        ? c.moduleName.fa || c.moduleName.en || `ماژول ${c.module}`
        : c.moduleName.en || c.moduleName.fa || `Module ${c.module}`;
    }
    return isFa ? `ماژول ${c.module}` : `Module ${c.module}`;
  };

  // Type metadata badge helper
  const getTypeBadge = (type: LeitnerCardType) => {
    const map: Record<string, { label: string; bg: string; icon: any }> = {
      mcq: {
        label: isFa ? '📝 تست ۴ گزینه‌ای' : '📝 Multiple-choice question',
        bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: HelpCircle,
      },
      triage_redflag: {
        label: isFa ? '🚨 تریاژ و رد فلگ' : '🚨 OTC Red Flag',
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: ShieldAlert,
      },
      calculation: {
        label: isFa ? '🧮 محاسبات بالینی' : '🧮 Calculation',
        bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
        icon: Calculator,
      },
      cal_warning: {
        label: isFa ? '⚠️ برچسب‌های CAL' : '⚠️ CAL Labels',
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: AlertTriangle,
      },
      interaction: {
        label: isFa ? '⚡ تداخل دارویی' : '⚡ Interaction',
        bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        icon: Flame,
      },
      conversation: {
        label: isFa ? '💬 دیالوگ بیمار' : '💬 Dialogue',
        bg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        icon: MessageSquare,
      },
      clinical_pearl: {
        label: isFa ? '💡 نکته کلیدی بالینی' : '💡 Clinical Pearl',
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: Sparkles,
      },
    };

    const item = map[type] || {
      label: type,
      bg: 'bg-slate-800 text-slate-300 border-slate-700',
      icon: Sparkles,
    };
    const IconComp = item.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-bold border ${item.bg}`}>
        <IconComp className="w-3 h-3" />
        <span>{item.label}</span>
      </span>
    );
  };

  // Available unique Knowledge Domains from cards for filtering
  const uniqueDomains = useMemo(() => {
    const set = new Set<string>();
    cards.forEach((c) => {
      const dName = c.knowledgeTree?.domain
        ? isFa ? c.knowledgeTree.domain.fa || c.knowledgeTree.domain.en : c.knowledgeTree.domain.en || c.knowledgeTree.domain.fa
        : c.category || (isFa ? 'داروسازی بالینی' : 'Clinical Knowledge');
      if (dName) set.add(dName);
    });
    return Array.from(set);
  }, [cards, isFa]);

  // Filtered cards for the Management -> All Cards Tab
  const filteredManagerCards = useMemo(() => {
    return cards.filter((c) => {
      if (managerFilterDomain !== 'ALL') {
        const domainText = c.knowledgeTree?.domain
          ? isFa ? c.knowledgeTree.domain.fa || c.knowledgeTree.domain.en : c.knowledgeTree.domain.en || c.knowledgeTree.domain.fa
        : c.category || (isFa ? 'داروسازی بالینی' : 'Clinical Knowledge');
        if (domainText !== managerFilterDomain) return false;
      }
      if (managerFilterBox !== 'ALL' && c.box !== managerFilterBox) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const questionFa = (c.question.fa || '').toLowerCase();
        const questionEn = (c.question.en || '').toLowerCase();
        const answerFa = (c.answer.fa || '').toLowerCase();
        const answerEn = (c.answer.en || '').toLowerCase();
        const pearlFa = (c.pearl?.fa || '').toLowerCase();
        const pearlEn = (c.pearl?.en || '').toLowerCase();
        const cat = (c.category || '').toLowerCase();
        const top = (c.topic || '').toLowerCase();
        const dom = (c.knowledgeTree?.domain?.fa || c.knowledgeTree?.domain?.en || '').toLowerCase();
        const sys = (c.knowledgeTree?.system?.fa || c.knowledgeTree?.system?.en || '').toLowerCase();

        const match =
          questionFa.includes(q) ||
          questionEn.includes(q) ||
          answerFa.includes(q) ||
          answerEn.includes(q) ||
          pearlFa.includes(q) ||
          pearlEn.includes(q) ||
          cat.includes(q) ||
          top.includes(q) ||
          dom.includes(q) ||
          sys.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [cards, managerFilterDomain, managerFilterBox, searchQuery, isFa]);

  // Due counts for stats bar
  const nowIso = new Date().toISOString();
  const totalDueCount = cards.filter((c) => !c.nextReviewDate || c.nextReviewDate <= nowIso).length;
  const boxCounts = useMemo(() => {
    const counts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    cards.forEach((c) => {
      if (c.box >= 1 && c.box <= 5) counts[c.box as 1 | 2 | 3 | 4 | 5]++;
    });
    return counts;
  }, [cards]);

  // Hierarchical Knowledge Tree computation (Level 1: Domain -> Level 2: System -> Level 3: Subsystem/Topic)
  const folderTree = useMemo(() => {
    const tree: Record<
      string,
      {
        count: number;
        dueCount: number;
        systems: Record<
          string,
          {
            count: number;
            dueCount: number;
            subsystems: Record<
              string,
              {
                count: number;
                dueCount: number;
                cards: LeitnerCard[];
              }
            >;
          }
        >;
      }
    > = {};

    const now = new Date().toISOString();

    cards.forEach((card) => {
      const isDue = !card.nextReviewDate || card.nextReviewDate <= now;

      const dName = card.knowledgeTree?.domain
        ? isFa ? card.knowledgeTree.domain.fa || card.knowledgeTree.domain.en : card.knowledgeTree.domain.en || card.knowledgeTree.domain.fa
        : card.category || (isFa ? 'داروسازی بالینی' : 'Clinical Knowledge');

      const sName = card.knowledgeTree?.system
        ? isFa ? card.knowledgeTree.system.fa || card.knowledgeTree.system.en : card.knowledgeTree.system.en || card.knowledgeTree.system.fa
        : card.topic || (isFa ? 'مباحث بالینی عمومی' : 'General Clinical');

      const subName = card.knowledgeTree?.subsystem
        ? isFa ? card.knowledgeTree.subsystem.fa || card.knowledgeTree.subsystem.en : card.knowledgeTree.subsystem.en || card.knowledgeTree.subsystem.fa
        : card.knowledgeTree?.subClass
        ? isFa ? card.knowledgeTree.subClass.fa || card.knowledgeTree.subClass.en : card.knowledgeTree.subClass.en || card.knowledgeTree.subClass.fa
        : isFa ? 'نکات کلیدی و داروها' : 'Key Concepts & Drugs';

      if (!tree[dName]) {
        tree[dName] = { count: 0, dueCount: 0, systems: {} };
      }
      tree[dName].count++;
      if (isDue) tree[dName].dueCount++;

      if (!tree[dName].systems[sName]) {
        tree[dName].systems[sName] = { count: 0, dueCount: 0, subsystems: {} };
      }
      tree[dName].systems[sName].count++;
      if (isDue) tree[dName].systems[sName].dueCount++;

      if (!tree[dName].systems[sName].subsystems[subName]) {
        tree[dName].systems[sName].subsystems[subName] = { count: 0, dueCount: 0, cards: [] };
      }
      tree[dName].systems[sName].subsystems[subName].count++;
      if (isDue) tree[dName].systems[sName].subsystems[subName].dueCount++;
      tree[dName].systems[sName].subsystems[subName].cards.push(card);
    });

    return tree;
  }, [cards, isFa]);

  // Launch study session for a specific target folder or cram
  const startStudyForScope = (params: {
    title: string;
    domain?: string;
    system?: string;
    subsystem?: string;
    box?: number | 'ALL';
    singleCardId?: string;
    cram?: boolean;
  }) => {
    setStudyScopeName(params.title);
    setStudyFilterDomain(params.domain ?? 'ALL');
    setStudyFilterSystem(params.system ?? 'ALL');
    setStudyFilterSubsystem(params.subsystem ?? 'ALL');
    setStudyFilterBox(params.box ?? 'ALL');
    setStudyFilterSingleCardId(params.singleCardId ?? null);
    setIsCramMode(params.cram ?? false);
    setStudyQueueIndex(0);
    setIsAnswerRevealed(false);
    setSelectedMcqOption(null);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0 });
    setCurrentView('anki_study');
  };

  // Shared helper for calculating Leitner box, interval, and FSRS parameters
  const calculateNextLeitnerState = useCallback((
    card: LeitnerCard,
    rating: 'again' | 'hard' | 'good' | 'easy'
  ) => {
    const fsrsState = {
      stability: card.fsrsStability || (card.box === 1 ? 1.0 : card.box === 2 ? 3.0 : card.box === 3 ? 7.0 : card.box === 4 ? 14.0 : 30.0),
      difficulty: card.fsrsDifficulty || 4.5,
      lapses: card.fsrsLapses || 0,
      lastReviewedDate: card.lastReviewed || card.lastReviewedDate,
      reps: card.fsrsReps || card.reviewCount || 0,
    };

    const fsrsResult = scheduleFSRSNextReview(fsrsState, rating, card.box, studySettings.fsrsConfig);

    let targetBox: 1 | 2 | 3 | 4 | 5 = card.box;
    if (rating === 'again') {
      targetBox = 1;
    } else if (rating === 'hard') {
      targetBox = Math.max(1, Math.min(5, card.box)) as 1 | 2 | 3 | 4 | 5;
    } else if (rating === 'good') {
      targetBox = Math.min(5, Math.max(1, card.box + 1)) as 1 | 2 | 3 | 4 | 5;
    } else if (rating === 'easy') {
      targetBox = Math.min(5, Math.max(1, card.box + 2)) as 1 | 2 | 3 | 4 | 5;
    }

    return {
      targetBox,
      nextReviewDate: fsrsResult.nextReviewDate,
      fsrsStability: fsrsResult.newStability,
      fsrsDifficulty: fsrsResult.newDifficulty,
      fsrsLapses: fsrsResult.lapses,
      fsrsReps: (card.fsrsReps || 0) + 1,
    };
  }, [studySettings.fsrsConfig]);

  // Handle SM-2 & FSRS Rating: Again (1), Hard (2), Good (3), Easy (4)
  const handleRateCard = useCallback((rating: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentStudyCard) return;

    if (rating === 'again') {
      haptic.warning();
    } else if (rating === 'easy') {
      haptic.success();
    } else {
      haptic.medium();
    }

    const { targetBox, nextReviewDate, fsrsStability, fsrsDifficulty, fsrsLapses, fsrsReps } =
      calculateNextLeitnerState(currentStudyCard, rating);

    const updated = cards.map((c) => {
      if (c.id === currentStudyCard.id) {
        return {
          ...c,
          box: targetBox as 1 | 2 | 3 | 4 | 5,
          lastReviewed: new Date().toISOString(),
          nextReviewDate: nextReviewDate,
          fsrsStability,
          fsrsDifficulty,
          fsrsLapses,
          fsrsReps,
          reviewCount: (c.reviewCount || 0) + 1,
          successCount: rating !== 'again' ? (c.successCount || 0) + 1 : (c.successCount || 0),
          consecutiveCorrect: rating === 'again' ? 0 : (c.consecutiveCorrect || 0) + 1,
          history: [
            ...(c.history || []),
            {
              date: new Date().toISOString(),
              result: (rating === 'again' ? 'incorrect' : 'correct') as 'correct' | 'incorrect',
              rating,
              boxFrom: c.box,
              boxTo: targetBox,
            },
          ],
        };
      }
      return c;
    });

    onUpdateCards(updated);

    setSessionStats((prev) => ({
      ...prev,
      [rating]: prev[rating] + 1,
    }));

    if (studyQueueIndex + 1 < activeStudyQueue.length) {
      setStudyQueueIndex((prev) => prev + 1);
      setIsAnswerRevealed(false);
      setSelectedMcqOption(null);
    } else {
      haptic.success();
      setSessionCompleted(true);
    }
  }, [currentStudyCard, calculateNextLeitnerState, cards, onUpdateCards, studyQueueIndex, activeStudyQueue.length]);

  // Rate a specific card directly by ID (used by Mind Map modals)
  const handleRateSpecificCard = useCallback((cardId: string, rating: 'again' | 'hard' | 'good' | 'easy') => {
    const targetCard = cards.find((c) => c.id === cardId);
    if (!targetCard) return;

    const { targetBox, nextReviewDate, fsrsStability, fsrsDifficulty, fsrsLapses, fsrsReps } =
      calculateNextLeitnerState(targetCard, rating);

    const updated = cards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          box: targetBox,
          lastReviewed: new Date().toISOString(),
          nextReviewDate: nextReviewDate,
          fsrsStability,
          fsrsDifficulty,
          fsrsLapses,
          fsrsReps,
          reviewCount: (c.reviewCount || 0) + 1,
          successCount: rating !== 'again' ? (c.successCount || 0) + 1 : (c.successCount || 0),
          consecutiveCorrect: rating === 'again' ? 0 : (c.consecutiveCorrect || 0) + 1,
          history: [
            ...(c.history || []),
            {
              date: new Date().toISOString(),
              result: (rating === 'again' ? 'incorrect' : 'correct') as 'correct' | 'incorrect',
              rating,
              boxFrom: c.box,
              boxTo: targetBox,
            },
          ],
        };
      }
      return c;
    });

    onUpdateCards(updated);
  }, [cards, calculateNextLeitnerState, onUpdateCards]);

  // Direct move card to specific box
  const handleMoveCardToBox = useCallback((cardId: string, targetBox: 1 | 2 | 3 | 4 | 5) => {
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + (LEITNER_INTERVALS[targetBox] || 1));

    const updated = cards.map((c) => {
      if (c.id === cardId) {
        return {
          ...c,
          box: targetBox,
          lastReviewed: new Date().toISOString(),
          nextReviewDate: nextDate.toISOString(),
        };
      }
      return c;
    });

    onUpdateCards(updated);
  }, [cards, onUpdateCards]);

  // Keyboard shortcuts listener for AnkiDroid experience:
  // Space / Enter => Reveal Answer
  // 1 => Again, 2 => Hard, 3 => Good, 4 => Easy
  useEffect(() => {
    if (currentView !== 'anki_study' || sessionCompleted || !currentStudyCard) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input/textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      } else if (e.key === 'Escape' && isZenMode) {
        e.preventDefault();
        setIsZenMode(false);
      } else if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (!isAnswerRevealed) {
          setIsAnswerRevealed(true);
        }
      } else if (isAnswerRevealed) {
        if (e.key === '1') {
          e.preventDefault();
          handleRateCard('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleRateCard('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleRateCard('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleRateCard('easy');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView, isAnswerRevealed, sessionCompleted, currentStudyCard, handleRateCard, isZenMode]);

  // 4-Way Touch & Drag Gesture Handlers
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('a') || target.closest('input')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    dragStartRef.current = { x: clientX, y: clientY, time: Date.now() };
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragStartRef.current || !isDragging) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const deltaX = clientX - dragStartRef.current.x;
    const deltaY = clientY - dragStartRef.current.y;
    setDragOffset({ x: deltaX, y: deltaY });
  };

  const handleTouchEnd = () => {
    if (!dragStartRef.current || !isDragging) return;
    const deltaX = dragOffset.x;
    const deltaY = dragOffset.y;
    const thresholdX = Math.min(100, window.innerWidth * 0.22);
    const thresholdY = 50;

    setIsDragging(false);

    // 1. VERTICAL SWIPES
    if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > thresholdY) {
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try { navigator.vibrate(20); } catch {}
      }
      if (!isAnswerRevealed) {
        // When on Question face: Swiping Up or Down reveals the Answer
        setIsAnswerRevealed(true);
      } else {
        // When on Answer face: Swiping Up (pulling bottom-to-top) shows Question again
        if (deltaY < -thresholdY) {
          setIsAnswerRevealed(false);
        }
      }
      setDragOffset({ x: 0, y: 0 });
    } else if (deltaX > thresholdX) {
      // SWIPED RIGHT -> SELECT BETWEEN EASY (TOP-RIGHT) & GOOD (BOTTOM-RIGHT / HORIZONTAL)
      const isEasy = deltaY < -15; // Swiping towards top-right triggers EASY
      const rating = isEasy ? 'easy' : 'good';
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try { navigator.vibrate(isEasy ? [10, 20, 10] : 15); } catch {}
      }
      setDragOffset({ x: window.innerWidth, y: isEasy ? -window.innerHeight * 0.3 : dragOffset.y });
      setTimeout(() => {
        handleRateCard(rating);
        setDragOffset({ x: 0, y: 0 });
      }, 150);
    } else if (deltaX < -thresholdX) {
      // SWIPED LEFT -> SELECT BETWEEN HARD (TOP-LEFT) & AGAIN (BOTTOM-LEFT / HORIZONTAL)
      const isHard = deltaY < -15; // Swiping towards top-left triggers HARD
      const rating = isHard ? 'hard' : 'again';
      if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
        try { navigator.vibrate(isHard ? 20 : 30); } catch {}
      }
      setDragOffset({ x: -window.innerWidth, y: isHard ? -window.innerHeight * 0.3 : dragOffset.y });
      setTimeout(() => {
        handleRateCard(rating);
        setDragOffset({ x: 0, y: 0 });
      }, 150);
    } else {
      // Snap back smoothly
      setDragOffset({ x: 0, y: 0 });
    }
    dragStartRef.current = null;
  };

  // Export JSON
  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(cards, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `leitner_anki_cards_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(cards.map((c) => c.id));
          const newOnes = parsed.filter((p: any) => p.id && !existingIds.has(p.id));
          onUpdateCards([...newOnes, ...cards]);
          alert(isFa ? `✅ تعداد ${newOnes.length} کارت جدید وارد شد.` : `✅ Imported ${newOnes.length} new cards.`);
        }
      } catch {
        alert(isFa ? '❌ فایل نامعتبر است.' : '❌ Invalid JSON file.');
      }
    };
    reader.readAsText(file);
  };

  // Add default sample cards with 6-level taxonomy
  const handleAddSampleCards = () => {
    const existingIds = new Set(cards.map((c) => c.id));
    const newOnes = INITIAL_SAMPLE_LEITNER_CARDS.filter((c) => !existingIds.has(c.id));
    if (newOnes.length > 0) {
      onUpdateCards([...cards, ...newOnes]);
    }
  };

  // Add custom manual card
  const handleAddManualCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCardForm.question.trim() || !newCardForm.answer.trim()) return;

    const domainName = newCardForm.domain.trim() || (isFa ? 'داروسازی بالینی' : 'Clinical Knowledge');
    const systemName = newCardForm.system.trim() || (isFa ? 'مباحث بالینی عمومی' : 'General Clinical');
    const subName = newCardForm.subsystem.trim() || (isFa ? 'نکات کلیدی و داروها' : 'Key Concepts & Drugs');

    const newCard: LeitnerCard = {
      id: `custom_${Date.now()}`,
      userId: 'user-local',
      module: 4,
      moduleName: {
        fa: domainName,
        en: domainName,
      },
      category: domainName,
      topic: systemName,
      knowledgeTree: {
        domain: { fa: domainName, en: domainName },
        system: { fa: systemName, en: systemName },
        subsystem: { fa: subName, en: subName },
        path: {
          fa: [domainName, systemName, subName],
          en: [domainName, systemName, subName],
        },
      },
      box: 1,
      nextReviewDate: new Date().toISOString(),
      reviewCount: 0,
      successCount: 0,
      tags: ['Manual', domainName, systemName],
      createdAt: new Date().toISOString(),
      type: newCardForm.type,
      question: {
        fa: newCardForm.question,
        en: newCardForm.question,
      },
      answer: {
        fa: newCardForm.answer,
        en: newCardForm.answer,
      },
      pearl: newCardForm.pearl ? { fa: newCardForm.pearl, en: newCardForm.pearl } : undefined,
    };

    onUpdateCards([newCard, ...cards]);
    setNewCardForm({
      domain: domainName,
      system: systemName,
      subsystem: subName,
      question: '',
      answer: '',
      pearl: '',
      type: 'clinical_pearl',
    });
    alert(isFa ? '✅ کارت جدید بر اساس درخت دانش با موفقیت ذخیره شد.' : '✅ New knowledge tree card created successfully.');
  };

  const handleDeleteCard = (cardId: string) => {
    const targetCard = cards.find((c) => c.id === cardId);
    const cardQ = targetCard
      ? isFa
        ? targetCard.question.fa || targetCard.question.en
        : targetCard.question.en || targetCard.question.fa
      : '';
    const preview = cardQ.length > 80 ? cardQ.slice(0, 80) + '...' : cardQ;
    const confirmMsg = isFa
      ? `آیا از حذف این فلش‌کارت از جعبه لایتنر اطمینان دارید؟\n\n"${preview}"`
      : `Are you sure you want to delete this card from Leitner?\n\n"${preview}"`;

    if (window.confirm(confirmMsg)) {
      const updated = cards.filter((c) => c.id !== cardId);
      onUpdateCards(updated);
      setIsAnswerRevealed(false);
      setSelectedMcqOption(null);
    }
  };

  const handleDeleteAllCards = () => {
    if (
      window.confirm(
        isFa
          ? '⚠️ آیا مطمئن هستید که می‌خواهید تمام کارت‌های لایتنر را پاکسازی کنید؟ این عمل غیرقابل بازگشت است.'
          : '⚠️ Are you sure you want to clear all Leitner cards? This action cannot be undone.'
      )
    ) {
      onUpdateCards([]);
      setIsAnswerRevealed(false);
      setSelectedMcqOption(null);
    }
  };

  // Session Progress Calculations
  const totalInQueue = activeStudyQueue.length;
  const currentCardNum = Math.min(totalInQueue, studyQueueIndex + 1);
  const remainingCount = Math.max(0, totalInQueue - studyQueueIndex);
  const estimatedMinsRemaining = Math.max(1, Math.ceil((remainingCount * 18) / 60));
  const totalReviewedSoFar = sessionStats.again + sessionStats.hard + sessionStats.good + sessionStats.easy;
  const correctSoFar = sessionStats.good + sessionStats.easy;
  const accuracyPercent = totalReviewedSoFar > 0 ? Math.round((correctSoFar / totalReviewedSoFar) * 100) : 100;

  // Current Card FSRS & Recall Metrics
  const recallProbability = currentStudyCard
    ? calculateFSRSRetention(
        currentStudyCard.fsrsStability,
        currentStudyCard.lastReviewed || currentStudyCard.lastReviewedDate,
        currentStudyCard.box
      )
    : 100;

  const fsrsIntervals = currentStudyCard
    ? getFSRSEstimatedIntervals(
        currentStudyCard.fsrsStability,
        currentStudyCard.fsrsDifficulty,
        currentStudyCard.lastReviewed || currentStudyCard.lastReviewedDate,
        currentStudyCard.box,
        isFa,
        studySettings.fsrsConfig
      )
    : { again: '< 10m', hard: '3d', good: '7d', easy: '15d' };

  return (
    <div className="space-y-3 min-w-0" dir={isFa ? 'rtl' : 'ltr'}>
      {/* 1. TOP HEADER & SWITCH BAR (Minimal, Centered & Clean) */}
      <div className="max-w-3xl mx-auto w-full flex items-center justify-between gap-2 p-1 bg-slate-900/60 backdrop-blur-md rounded-2xl border app-border shadow-xs">
        {/* Left Side: Deck Scope Indicator / Title */}
        <div className="flex items-center gap-2 px-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse shrink-0" />
          <span className="text-xs font-bold text-slate-300 truncate max-w-[150px] sm:max-w-xs">
            {studyScopeName}
          </span>
        </div>

        {/* View Switcher: Single Unified Tab Row with Settings Gear Button */}
        <div className="flex items-center gap-1 app-bg p-1 rounded-xl border app-border overflow-x-auto no-scrollbar shrink-0">
          <button
            type="button"
            onClick={() => setCurrentView('anki_study')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentView === 'anki_study'
                ? 'bg-purple-600 text-white shadow-xs ring-1 ring-purple-400/30'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800/60'
            }`}
          >
            <Play className="w-3.5 h-3.5" />
            <span>{isFa ? 'مرور کارت‌ها' : 'Study Mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => setCurrentView('decks_manager')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
              currentView === 'decks_manager'
                ? 'bg-indigo-600 text-white shadow-xs ring-1 ring-indigo-400/30'
                : 'app-muted hover:app-text hover:bg-black/5 dark:hover:bg-slate-800/60'
            }`}
          >
            <FolderTree className="w-3.5 h-3.5" />
            <span>{isFa ? 'دسته‌ها و پوشه‌ها' : 'Decks'}</span>
          </button>

          <button
            type="button"
            onClick={() => triggerAiGenerator()}
            className="px-2 py-1.5 rounded-lg bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap"
            title={isFa ? 'تولید کارت جدید با هوش مصنوعی (AI Studio)' : 'Generate flashcards with AI'}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[11px] font-bold">AI</span>
          </button>

          {/* 🧠 FSRS v5 Model Indicator & Quick Settings Button */}
          {studySettings.algorithm === 'fsrs' && (
            <button
              type="button"
              onClick={() => {
                setSettingsInitialTab('fsrs');
                setIsStudySettingsOpen(true);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs whitespace-nowrap"
              title={isFa ? 'پیکربندی دقیق و پیشرفته الگوریتم FSRS v5 (هدف یادآوری، ضرایب و فواصل)' : 'Configure FSRS v5 Algorithm Parameters'}
            >
              <Brain className="w-3.5 h-3.5 text-purple-400" />
              <span className="font-mono text-[11px]">
                FSRS ({Math.round((studySettings.fsrsConfig?.requestRetention || 0.90) * 100)}%)
              </span>
            </button>
          )}

          {/* ⚙️ Unified Leitner Study Settings Gear Button */}
          <button
            type="button"
            onClick={() => {
              setSettingsInitialTab('study');
              setIsStudySettingsOpen(true);
            }}
            className="px-2 py-1.5 rounded-lg app-bg hover:bg-black/5 dark:hover:bg-slate-800 app-text border app-border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title={isFa ? 'تنظیمات پیشرفته مطالعه، الگوریتم مرور و زمان‌بندی' : 'Review & Algorithm Settings'}
          >
            <Settings className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span className="hidden sm:inline">{isFa ? 'تنظیمات' : 'Settings'}</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN VIEW SWITCHER */}
      {currentView === 'anki_study' ? (
        /* ========================================================================= */
        /* ANKIDROID MINIMALIST STUDY CANVAS                                         */
        /* ========================================================================= */
        <div className="space-y-3 max-w-3xl mx-auto w-full">
          {/* Top Controls for Study Mode (Ultra Minimal) */}
          {(studySettings.countdownTimer > 0 || (activeStudyQueue.length > 0 && !sessionCompleted)) && (
            <div className="flex items-center justify-end text-xs px-2 app-muted gap-2">
              {/* Countdown Timer Badge when enabled */}
              {studySettings.countdownTimer > 0 && !sessionCompleted && !isAnswerRevealed && (
                <div
                  className={`px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold flex items-center gap-1.5 shadow-xs transition-colors ${
                    timeLeft <= 5
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                      : timeLeft <= 15
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                  title={isFa ? 'تایمر معکوس تفکر و پاسخ' : 'Thinking countdown timer'}
                >
                  <Clock className={`w-3.5 h-3.5 ${timeLeft <= 5 ? 'text-rose-400' : 'text-amber-400'}`} />
                  <span>{timeLeft}s</span>
                </div>
              )}

              {/* Zen Focus Button */}
              {activeStudyQueue.length > 0 && !sessionCompleted && (
                <button
                  type="button"
                  onClick={() => setIsZenMode(true)}
                  className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/25 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title={isFa ? 'ورود به حالت تمرکز کامل بدون حواس‌پرتی (کلید Z)' : 'Enter Zen Deep Focus Mode (Z)'}
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                  <span>{isFa ? 'تمرکز کامل' : 'Zen'}</span>
                </button>
              )}
            </div>
          )}

          {/* LIVE SESSION PROGRESS BAR */}
          {activeStudyQueue.length > 0 && !sessionCompleted && (
            <div className="p-3 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-2 shadow-md max-w-3xl mx-auto w-full">
              <div className="flex items-center justify-between text-xs font-semibold gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[11px] font-mono font-bold">
                    {isFa ? `کارت ${currentCardNum} از ${totalInQueue}` : `Card ${currentCardNum} of ${totalInQueue}`}
                  </span>
                  <span className="text-slate-400 text-[11px] flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFa ? `زمان تخمینی: ~${estimatedMinsRemaining} دقیقه` : `~${estimatedMinsRemaining}m left`}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-emerald-400 font-mono font-bold flex items-center gap-1" title={isFa ? 'پاسخ درست' : 'Correct'}>
                    <Check className="w-3.5 h-3.5" />
                    <span>{correctSoFar}</span>
                  </span>
                  <span className="text-slate-600">|</span>
                  <span className="text-rose-400 font-mono font-bold flex items-center gap-1" title={isFa ? 'تکرار مجدد' : 'Again'}>
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{sessionStats.again}</span>
                  </span>
                  <span className="text-slate-400 font-mono text-[10.5px]">
                    ({accuracyPercent}%)
                  </span>
                </div>
              </div>

              {/* Multi-segment visual progress track */}
              <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden flex shadow-inner">
                <div
                  className="bg-emerald-500 transition-all duration-300"
                  style={{ width: `${totalInQueue > 0 ? (correctSoFar / totalInQueue) * 100 : 0}%` }}
                  title={isFa ? `درست: ${correctSoFar}` : `Correct: ${correctSoFar}`}
                />
                <div
                  className="bg-rose-500 transition-all duration-300"
                  style={{ width: `${totalInQueue > 0 ? (sessionStats.again / totalInQueue) * 100 : 0}%` }}
                  title={isFa ? `تکرار: ${sessionStats.again}` : `Again: ${sessionStats.again}`}
                />
                <div
                  className="bg-amber-500 transition-all duration-300"
                  style={{ width: `${totalInQueue > 0 ? (sessionStats.hard / totalInQueue) * 100 : 0}%` }}
                  title={isFa ? `سخت: ${sessionStats.hard}` : `Hard: ${sessionStats.hard}`}
                />
              </div>
            </div>
          )}

          {/* EMPTY QUEUE OR SESSION COMPLETE */}
          {activeStudyQueue.length === 0 ? (
            <div className="app-card border border-slate-800 rounded-2xl p-8 sm:p-12 text-center space-y-4 max-w-xl mx-auto my-6 bg-slate-900/90 shadow-xl">
              <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300 mx-auto animate-bounce">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-white">
                  {isFa ? '🎉 عالیه! هیچ کارتی برای مرور امروز باقی نمانده است.' : '🎉 All Caught Up! No Cards Due Today.'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isFa
                    ? 'تمام کارت‌های موعددار برای این دسته مرور شدند. می‌توانید به ساخت کارت‌های بیشتر بپردازید یا حالت تمرین فشرده را فعال کنید.'
                    : 'You have reviewed all due cards in this deck. You can generate new cards or switch to Cram mode.'}
                </p>
              </div>

              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    startStudyForScope({
                      title: isFa ? 'تمرین فشرده (همه کارت‌ها)' : 'Cram All Cards',
                      cram: true,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isFa ? 'تمرین فشرده (مرور همه کارت‌ها)' : 'Cram All Flashcards'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => triggerAiGenerator()}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isFa ? 'تولید کارت جدید با AI' : 'Generate More Cards'}</span>
                </button>
              </div>
            </div>
          ) : sessionCompleted ? (
            /* SESSION STATS SUMMARY */
            <div className="app-card border border-purple-500/40 rounded-2xl p-6 sm:p-8 text-center space-y-4 max-w-xl mx-auto my-6 bg-slate-900/95 shadow-2xl animate-in zoom-in-95">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 mx-auto">
                <Award className="w-8 h-8 text-amber-300" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-bold text-white">
                  {isFa ? 'جلسه مرور با موفقیت به پایان رسید!' : 'Study Session Completed!'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isFa
                    ? `تعداد ${activeStudyQueue.length} کارت طبق الگوریتم هوشمند FSRS / SM-2 زمان‌بندی شدند.`
                    : `${activeStudyQueue.length} cards scheduled according to FSRS v5 & Anki SM-2 algorithms.`}
                </p>
              </div>

              {/* 4-GRADE STATS GRID */}
              <div className="grid grid-cols-4 gap-2 text-xs py-2">
                <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
                  <div className="text-lg font-mono font-bold">{sessionStats.again}</div>
                  <div className="text-[10.5px]">{isFa ? 'تکرار (Again)' : 'Again'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
                  <div className="text-lg font-mono font-bold">{sessionStats.hard}</div>
                  <div className="text-[10.5px]">{isFa ? 'سخت (Hard)' : 'Hard'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                  <div className="text-lg font-mono font-bold">{sessionStats.good}</div>
                  <div className="text-[10.5px]">{isFa ? 'خوب (Good)' : 'Good'}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300">
                  <div className="text-lg font-mono font-bold">{sessionStats.easy}</div>
                  <div className="text-[10.5px]">{isFa ? 'آسان (Easy)' : 'Easy'}</div>
                </div>
              </div>

              <div className="flex gap-2 justify-center pt-2 flex-wrap">
                <button
                  type="button"
                  onClick={() =>
                    startStudyForScope({
                      title: studyScopeName,
                      domain: studyFilterDomain,
                      system: studyFilterSystem,
                      box: studyFilterBox,
                      cram: false,
                    })
                  }
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  <span>{isFa ? 'شروع دوباره مرور' : 'Review Again'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCurrentView('decks_manager')}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition cursor-pointer"
                >
                  {isFa ? 'مشاهده دسته‌ها و پوشه‌ها' : 'View Decks'}
                </button>
              </div>
            </div>
          ) : currentStudyCard ? (
            /* =============================================================== */
            /* ANKIDROID ACTIVE FLASHCARD SURFACE (WITH TINDER SWIPE & FSRS)   */
            /* =============================================================== */
            <div className="w-full mx-auto max-w-3xl transition-all duration-200">
              <div className="w-full space-y-3">
                {/* ACTIVE CARD & CONTROLS */}
                <div className="space-y-3 w-full relative">
                  {/* TINDER & GESTURE SWIPE STAMP OVERLAYS */}
                  {/* 1. SWIPED RIGHT -> EASY (TOP-RIGHT) vs GOOD (BOTTOM-RIGHT) */}
                  {dragOffset.x > 35 && Math.abs(dragOffset.x) > Math.abs(dragOffset.y) && (
                    <div className="absolute top-4 end-4 z-30 flex flex-col gap-2 pointer-events-none">
                      {/* EASY STAMP (ACTIVE WHEN DRAGGING TOWARDS TOP-RIGHT) */}
                      <div
                        className={`px-3.5 py-1.5 rounded-2xl border-3 transition-all flex items-center gap-1.5 shadow-2xl ${
                          dragOffset.y < -15
                            ? 'scale-110 border-sky-400 bg-sky-950/95 text-sky-200 ring-4 ring-sky-400/40 shadow-sky-500/40'
                            : 'opacity-50 border-sky-600/60 bg-sky-950/70 text-sky-400'
                        }`}
                        style={{ opacity: Math.max(0.4, Math.min(1, dragOffset.x / 90)) }}
                      >
                        <Zap className="w-4 h-4 text-sky-300 animate-pulse" />
                        <span className="font-black text-xs sm:text-sm tracking-wide">
                          {isFa ? '⚡ آسان (EASY)' : '⚡ EASY'}
                        </span>
                      </div>

                      {/* GOOD STAMP (ACTIVE WHEN DRAGGING HORIZONTALLY / BOTTOM-RIGHT) */}
                      <div
                        className={`px-3.5 py-1.5 rounded-2xl border-3 transition-all flex items-center gap-1.5 shadow-2xl ${
                          dragOffset.y >= -15
                            ? 'scale-110 border-emerald-400 bg-emerald-950/95 text-emerald-200 ring-4 ring-emerald-400/40 shadow-emerald-500/40'
                            : 'opacity-50 border-emerald-600/60 bg-emerald-950/70 text-emerald-400'
                        }`}
                        style={{ opacity: Math.max(0.4, Math.min(1, dragOffset.x / 90)) }}
                      >
                        <ThumbsUp className="w-4 h-4 text-emerald-300" />
                        <span className="font-black text-xs sm:text-sm tracking-wide">
                          {isFa ? '👍 خوب (GOOD)' : '👍 GOOD'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. SWIPED LEFT -> HARD (TOP-LEFT) vs AGAIN (BOTTOM-LEFT) */}
                  {dragOffset.x < -35 && Math.abs(dragOffset.x) > Math.abs(dragOffset.y) && (
                    <div className="absolute top-4 start-4 z-30 flex flex-col gap-2 pointer-events-none">
                      {/* HARD STAMP (ACTIVE WHEN DRAGGING TOWARDS TOP-LEFT) */}
                      <div
                        className={`px-3.5 py-1.5 rounded-2xl border-3 transition-all flex items-center gap-1.5 shadow-2xl ${
                          dragOffset.y < -15
                            ? 'scale-110 border-amber-400 bg-amber-950/95 text-amber-200 ring-4 ring-amber-400/40 shadow-amber-500/40'
                            : 'opacity-50 border-amber-600/60 bg-amber-950/70 text-amber-400'
                        }`}
                        style={{ opacity: Math.max(0.4, Math.min(1, Math.abs(dragOffset.x) / 90)) }}
                      >
                        <AlertCircle className="w-4 h-4 text-amber-300 animate-pulse" />
                        <span className="font-black text-xs sm:text-sm tracking-wide">
                          {isFa ? '⚠️ سخت (HARD)' : '⚠️ HARD'}
                        </span>
                      </div>

                      {/* AGAIN STAMP (ACTIVE WHEN DRAGGING HORIZONTALLY / BOTTOM-LEFT) */}
                      <div
                        className={`px-3.5 py-1.5 rounded-2xl border-3 transition-all flex items-center gap-1.5 shadow-2xl ${
                          dragOffset.y >= -15
                            ? 'scale-110 border-rose-500 bg-rose-950/95 text-rose-200 ring-4 ring-rose-500/40 shadow-rose-500/40'
                            : 'opacity-50 border-rose-600/60 bg-rose-950/70 text-rose-400'
                        }`}
                        style={{ opacity: Math.max(0.4, Math.min(1, Math.abs(dragOffset.x) / 90)) }}
                      >
                        <RotateCcw className="w-4 h-4 text-rose-300" />
                        <span className="font-black text-xs sm:text-sm tracking-wide">
                          {isFa ? '🔄 تکرار (AGAIN)' : '🔄 AGAIN'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 3. VERTICAL SWIPES (BOTH PULL DOWN & PULL UP REVEAL ANSWER) */}
                  {Math.abs(dragOffset.y) > 35 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x) && !isAnswerRevealed && (
                    <div
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-5 py-3 rounded-2xl border-2 border-cyan-400 bg-slate-950/95 text-cyan-200 font-black text-sm sm:text-base tracking-wider uppercase shadow-2xl flex items-center gap-2.5 pointer-events-none animate-in fade-in zoom-in-90 backdrop-blur-md"
                      style={{ opacity: Math.min(1, Math.abs(dragOffset.y) / 70) }}
                    >
                      <Eye className="w-5 h-5 text-cyan-300 animate-pulse" />
                      <span>{isFa ? '✨ رها کنید: نمایش پاسخ ✨' : '✨ Release to Reveal Answer ✨'}</span>
                    </div>
                  )}

                  {/* THE CARD (WITH TOUCH / DRAG PHYSICS) */}
                  <div
                    ref={cardRef}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    onMouseDown={handleTouchStart}
                    onMouseMove={handleTouchMove}
                    onMouseUp={handleTouchEnd}
                    style={{
                      transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y * 0.12}px) rotate(${dragOffset.x * 0.04}deg)`,
                      transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                      touchAction: 'pan-y',
                      cursor: isDragging ? 'grabbing' : 'grab',
                    }}
                    className={`app-card border rounded-2xl p-5 sm:p-7 space-y-5 shadow-2xl relative min-h-[340px] flex flex-col justify-between select-none ${
                      isAnswerRevealed
                        ? 'bg-slate-900 border-emerald-500/50 ring-1 ring-emerald-500/30'
                        : 'bg-slate-900 border-slate-700 hover:border-purple-500/40'
                    }`}
                  >
                    {/* CARD TOP BAR: FLAGS-ONLY LANGUAGE SWITCHER & ACTIONS */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2">
                      {/* 🌐 Flags-Only Language Switcher */}
                      <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-700/80 text-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCardLangMode('bilingual');
                          }}
                          className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                            cardLanguageMode === 'bilingual' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                          }`}
                          title="Bilingual (🌐)"
                        >
                          <span className="text-base leading-none">🌐</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCardLangMode('fa');
                          }}
                          className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                            cardLanguageMode === 'fa' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                          }`}
                          title="Persian (🇮🇷)"
                        >
                          <span className="text-base leading-none">🇮🇷</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCardLangMode('en');
                          }}
                          className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                            cardLanguageMode === 'en' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                          }`}
                          title="English (🇬🇧)"
                        >
                          <span className="text-base leading-none">🇬🇧</span>
                        </button>
                      </div>

                      {/* Right Action: Question/Answer Toggle & Delete Button */}
                      <div className="flex items-center gap-1.5">
                        {isAnswerRevealed && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setIsAnswerRevealed(false);
                            }}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-300 transition flex items-center gap-1 cursor-pointer"
                            title={isFa ? 'مشاهده مجدد سوال' : 'Show Question'}
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>{isFa ? 'سوال' : 'Question'}</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCard(currentStudyCard.id);
                          }}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition cursor-pointer"
                          title={isFa ? 'حذف این کارت' : 'Delete card'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* CARD BODY: EXCLUSIVE FRONT (QUESTION) OR BACK (ANSWER) */}
                    {(() => {
                      const qFa = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.fa || currentStudyCard.question.en : currentStudyCard.question;
                      const qEn = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.en || currentStudyCard.question.fa : currentStudyCard.question;
                      const aFa = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.fa || currentStudyCard.answer.en : currentStudyCard.answer;
                      const aEn = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.en || currentStudyCard.answer.fa : currentStudyCard.answer;
                      const pFa = currentStudyCard.pearl ? (typeof currentStudyCard.pearl === 'object' ? currentStudyCard.pearl.fa : currentStudyCard.pearl) : '';
                      const pEn = currentStudyCard.pearl ? (typeof currentStudyCard.pearl === 'object' ? currentStudyCard.pearl.en : currentStudyCard.pearl) : '';

                      return (
                        <div className="space-y-4 py-1 flex-1">
                          {/* ================= QUESTION SECTION (ALWAYS VISIBLE & CLICKABLE WITH MOUSE) ================= */}
                          <div
                            onClick={() => {
                              if (!isAnswerRevealed) {
                                haptic.light();
                                setIsAnswerRevealed(true);
                              }
                            }}
                            className={`space-y-3 transition-all ${
                              !isAnswerRevealed
                                ? 'cursor-pointer group'
                                : ''
                            }`}
                            title={!isAnswerRevealed ? (isFa ? 'برای مشاهده پاسخ روی سوال کلیک کنید' : 'Click question to reveal answer') : undefined}
                          >
                            {/* Render Question based on cardLanguageMode */}
                            {cardLanguageMode === 'bilingual' ? (
                              <div
                                className={`space-y-2.5 p-3.5 sm:p-4 rounded-xl border transition-all ${
                                  !isAnswerRevealed
                                    ? 'bg-slate-950/60 border-slate-800 group-hover:border-purple-500/50 group-hover:bg-slate-950/80 shadow-xs'
                                    : 'bg-slate-950/60 border-slate-800'
                                }`}
                              >
                                {qFa && (
                                  <div className="text-base sm:text-lg text-white leading-relaxed font-bold [unicode-bidi:isolate]" dir="rtl">
                                    {formatBidiText(qFa, true)}
                                  </div>
                                )}
                                {qEn && (
                                  <div className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed border-t border-slate-800/80 pt-2 font-sans [unicode-bidi:isolate]" dir="ltr">
                                    {qEn}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div
                                className={`p-3.5 sm:p-4 rounded-xl border transition-all ${
                                  !isAnswerRevealed
                                    ? 'bg-slate-950/60 border-slate-800 group-hover:border-purple-500/50 group-hover:bg-slate-950/80 shadow-xs'
                                    : 'bg-slate-950/60 border-slate-800'
                                }`}
                              >
                                <div className="text-base sm:text-lg text-white leading-relaxed font-semibold [unicode-bidi:isolate]" dir={cardLanguageMode === 'fa' ? 'rtl' : 'ltr'}>
                                  {formatBidiText(cardLanguageMode === 'fa' ? qFa : qEn, cardLanguageMode === 'fa')}
                                </div>
                              </div>
                            )}

                            {/* SPECIALIZED RENDER: MCQ OPTIONS */}
                            {currentStudyCard.type === 'mcq' && currentStudyCard.mcqOptions && currentStudyCard.mcqOptions.length > 0 && (
                              <div className="space-y-2 pt-1">
                                <span className="text-[11px] font-bold text-slate-400 block">
                                  {isFa ? 'گزینه‌ها (یک گزینه را انتخاب کنید):' : 'Choose an option:'}
                                </span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                  {currentStudyCard.mcqOptions.map((opt, oIdx) => {
                                    const optLetter = String.fromCharCode(65 + oIdx);
                                    const isSelected = selectedMcqOption === opt.id;
                                    const optFa = opt.text?.fa || opt.text?.en || '';
                                    const optEn = opt.text?.en || opt.text?.fa || '';
                                    const optStyle = isAnswerRevealed && opt.isCorrect
                                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500 font-bold'
                                      : isAnswerRevealed && isSelected && !opt.isCorrect
                                      ? 'bg-rose-950/70 border-rose-500 text-rose-200 line-through'
                                      : isSelected
                                      ? 'bg-purple-900/60 border-purple-500 text-purple-200 ring-1 ring-purple-500 font-bold'
                                      : 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800';

                                    return (
                                      <button
                                        key={opt.id || oIdx}
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedMcqOption(opt.id);
                                          if (!isAnswerRevealed) {
                                            haptic.light();
                                            setIsAnswerRevealed(true);
                                          }
                                        }}
                                        className={`p-3 rounded-xl border text-start transition cursor-pointer flex items-start gap-2.5 ${optStyle}`}
                                      >
                                        <span className="w-5 h-5 rounded-full bg-black/50 border border-white/20 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                          {optLetter}
                                        </span>
                                        <div className="leading-relaxed text-xs sm:text-[13px] flex-1 space-y-1">
                                          {cardLanguageMode === 'bilingual' ? (
                                            <>
                                              {optFa && <div dir="rtl" className="[unicode-bidi:isolate]">{formatBidiText(optFa, true)}</div>}
                                              {optEn && <div className="text-[11.5px] text-slate-300 font-sans opacity-90 border-t border-slate-700/60 pt-1 [unicode-bidi:isolate]" dir="ltr">{optEn}</div>}
                                            </>
                                          ) : (
                                            <div dir={cardLanguageMode === 'fa' ? 'rtl' : 'ltr'} className="[unicode-bidi:isolate]">
                                              {formatBidiText(cardLanguageMode === 'fa' ? optFa : optEn, cardLanguageMode === 'fa')}
                                            </div>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            {/* SPECIALIZED RENDER: CAL LABELS */}
                            {currentStudyCard.type === 'cal_warning' && currentStudyCard.calLabels && currentStudyCard.calLabels.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                                <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                                  <span>{isFa ? 'برچسب‌های استرالیایی CAL:' : 'Australian CAL Labels:'}</span>
                                </span>
                                {currentStudyCard.calLabels.map((lbl, lIdx) => (
                                  <span
                                    key={lIdx}
                                    className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/50 font-bold text-xs shadow-sm font-sans"
                                    dir="ltr"
                                  >
                                    {lbl}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* SPECIALIZED RENDER: TRIAGE OUTCOME BADGE */}
                            {currentStudyCard.type === 'triage_redflag' && currentStudyCard.triageOutcome && (
                              <div className="pt-1">
                                <span
                                  className={`text-xs font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${
                                    currentStudyCard.triageOutcome === 'urgent_referral'
                                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                                      : currentStudyCard.triageOutcome === 'gp_referral'
                                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                                      : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                                  }`}
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>
                                    {currentStudyCard.triageOutcome === 'urgent_referral'
                                      ? isFa ? '🚨 ارجاع اورژانسی (ED / 000)' : '🚨 Urgent Referral (Emergency)'
                                      : currentStudyCard.triageOutcome === 'gp_referral'
                                      ? isFa ? '⚠️ ارجاع به پزشک عمومی (GP)' : '⚠️ GP Referral Required'
                                      : isFa ? '🟢 درمان در داروخانه (OTC Treatment)' : '🟢 Pharmacy OTC Supply'}
                                  </span>
                                </span>
                              </div>
                            )}

                            {/* SPECIALIZED RENDER: CALCULATION METHOD */}
                            {currentStudyCard.type === 'calculation' && currentStudyCard.calculationFormula && (
                              <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs font-mono" dir="ltr">
                                <span className="font-bold text-cyan-300 block text-[11px] mb-1">
                                  {isFa ? '📐 فرمول و متغیرهای محاسبه:' : '📐 Formula & Variables:'}
                                </span>
                                <span>
                                  {isFa
                                    ? currentStudyCard.calculationFormula.fa || currentStudyCard.calculationFormula.en
                                    : currentStudyCard.calculationFormula.en || currentStudyCard.calculationFormula.fa}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* ================= HINT BAR WHEN ANSWER IS HIDDEN ================= */}
                          {!isAnswerRevealed && (
                            <div
                              onClick={() => {
                                haptic.light();
                                setIsAnswerRevealed(true);
                              }}
                              className="py-2.5 px-4 rounded-xl bg-purple-950/30 hover:bg-purple-900/40 border border-purple-500/30 hover:border-purple-400/60 text-purple-200 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-xs group animate-in fade-in"
                            >
                              <Eye className="w-4 h-4 text-purple-400 group-hover:scale-110 transition animate-pulse" />
                              <span>{isFa ? '✨ برای نمایش پاسخ کلیک کنید (یا کلید Space)' : '✨ Click to Reveal Answer (or Space)'}</span>
                            </div>
                          )}

                          {/* ================= SMOOTH SLIDE-DOWN ANSWER SECTION UNDER QUESTION ================= */}
                          {isAnswerRevealed && (
                            <div className="space-y-3 pt-3 border-t border-emerald-500/40 animate-in slide-in-from-top-4 fade-in duration-300 ease-out">
                              {/* Answer Header Badge */}
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold flex items-center gap-1.5 text-[11px]">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>{isFa ? 'پاسخ و تحلیل بالینی:' : 'Clinical Answer:'}</span>
                                </span>
                              </div>

                              {/* Answer Content */}
                              <div className="space-y-1.5">
                                {cardLanguageMode === 'bilingual' ? (
                                  <div className="space-y-2.5 bg-emerald-950/30 border border-emerald-500/30 p-3.5 sm:p-4 rounded-xl text-sm sm:text-base leading-relaxed">
                                    {aFa && (
                                      <div dir="rtl" className="text-emerald-100 font-medium [unicode-bidi:isolate]">
                                        {formatBidiText(aFa, true)}
                                      </div>
                                    )}
                                    {aEn && (
                                      <div dir="ltr" className="text-slate-200 font-sans text-xs sm:text-sm border-t border-emerald-900/50 pt-2 opacity-95 [unicode-bidi:isolate]">
                                        {aEn}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-sm sm:text-base text-slate-100 leading-relaxed bg-emerald-950/30 border border-emerald-500/30 p-3.5 rounded-xl [unicode-bidi:isolate]" dir={cardLanguageMode === 'fa' ? 'rtl' : 'ltr'}>
                                    {formatBidiText(cardLanguageMode === 'fa' ? aFa : aEn, cardLanguageMode === 'fa')}
                                  </div>
                                )}
                              </div>

                              {/* Distractor rationale and clinical distinctions */}
                              {currentStudyCard.distractorRationale && (
                                <div className="text-xs p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-slate-300 space-y-1">
                                  <span className="font-bold text-amber-300 flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                                    <span>{isFa ? 'نکات تمایز گزینه‌ها و تحلیل بالینی:' : 'Clinical Distinctions & Pitfalls:'}</span>
                                  </span>
                                  {cardLanguageMode === 'bilingual' ? (
                                    <div className="space-y-1.5 pt-1">
                                      {currentStudyCard.distractorRationale.fa && (
                                        <div dir="rtl" className="text-slate-200 [unicode-bidi:isolate]">{formatBidiText(currentStudyCard.distractorRationale.fa, true)}</div>
                                      )}
                                      {currentStudyCard.distractorRationale.en && (
                                        <div dir="ltr" className="text-slate-300 font-sans text-[11px] border-t border-slate-800 pt-1 [unicode-bidi:isolate]">{currentStudyCard.distractorRationale.en}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="leading-relaxed [unicode-bidi:isolate]" dir={cardLanguageMode === 'fa' ? 'rtl' : 'ltr'}>
                                      {formatBidiText(
                                        cardLanguageMode === 'fa'
                                          ? currentStudyCard.distractorRationale.fa || currentStudyCard.distractorRationale.en
                                          : currentStudyCard.distractorRationale.en || currentStudyCard.distractorRationale.fa,
                                        cardLanguageMode === 'fa'
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* High Yield Clinical Pearl */}
                              {(pFa || pEn) && (
                                <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2">
                                  <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                                  <div className="space-y-1 flex-1">
                                    <span className="font-bold text-amber-300">{isFa ? 'نکته طلایی بالینی: ' : 'Key Clinical Point: '}</span>
                                    {cardLanguageMode === 'bilingual' ? (
                                      <div className="space-y-1">
                                        {pFa && <div dir="rtl" className="text-purple-100 [unicode-bidi:isolate]">{formatBidiText(pFa, true)}</div>}
                                        {pEn && <div dir="ltr" className="text-slate-300 font-sans text-xs border-t border-purple-900/40 pt-1 [unicode-bidi:isolate]">{pEn}</div>}
                                      </div>
                                    ) : (
                                      <div dir={cardLanguageMode === 'fa' ? 'rtl' : 'ltr'} className="[unicode-bidi:isolate]">
                                        {formatBidiText(cardLanguageMode === 'fa' ? pFa : pEn, cardLanguageMode === 'fa')}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* ANKIDROID BOTTOM CONTROLS & GESTURE BAR */}
                  {!isAnswerRevealed ? (
                    /* SLEEK INTERACTIVE REVEAL & GESTURE BAR */
                    <div
                      onClick={() => setIsAnswerRevealed(true)}
                      className="w-full py-3 px-4 rounded-2xl bg-slate-900/90 hover:bg-slate-850 border border-slate-700/80 hover:border-purple-500/50 text-slate-200 text-xs font-bold shadow-md transition flex flex-col sm:flex-row items-center justify-between gap-2 cursor-pointer group select-none backdrop-blur-md"
                    >
                      <div className="flex items-center gap-2 text-purple-300">
                        <Eye className="w-4 h-4 text-purple-400 group-hover:scale-110 transition" />
                        <span>{isFa ? 'لمس برای پاسخ' : 'Tap for answer'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[10.5px] text-slate-400 font-normal flex-wrap">
                        <span className="text-cyan-300 font-medium">{isFa ? '↕ بالا / پایین: پاسخ' : '↕ Up/Down: Answer'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-emerald-300 font-medium">{isFa ? '→ راست: خوب / آسان' : '→ Right: Good/Easy'}</span>
                        <span className="text-slate-600">•</span>
                        <span className="text-rose-300 font-medium">{isFa ? '← چپ: تکرار / سخت' : '← Left: Again/Hard'}</span>
                      </div>
                    </div>
                  ) : (
                    /* ANKI & FSRS 4-RATING BUTTON BAR */
                    <div className="space-y-1.5">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {/* 1. AGAIN */}
                        <button
                          type="button"
                          onClick={() => handleRateCard('again')}
                          className="p-3 sm:p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md group"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold">
                            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono">1</span>
                            <span>{isFa ? 'تکرار مجدد' : 'Again'}</span>
                          </div>
                          <span className="text-[10px] text-rose-200/90 font-mono">{fsrsIntervals.again}</span>
                        </button>

                        {/* 2. HARD */}
                        <button
                          type="button"
                          onClick={() => handleRateCard('hard')}
                          className="p-3 sm:p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md group"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold">
                            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono">2</span>
                            <span>{isFa ? 'سخت بود' : 'Hard'}</span>
                          </div>
                          <span className="text-[10px] text-amber-200/90 font-mono">{fsrsIntervals.hard}</span>
                        </button>

                        {/* 3. GOOD */}
                        <button
                          type="button"
                          onClick={() => handleRateCard('good')}
                          className="p-3 sm:p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md group"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold">
                            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono">3</span>
                            <span>{isFa ? 'خوب بود' : 'Good'}</span>
                          </div>
                          <span className="text-[10px] text-emerald-200/90 font-mono">{fsrsIntervals.good}</span>
                        </button>

                        {/* 4. EASY */}
                        <button
                          type="button"
                          onClick={() => handleRateCard('easy')}
                          className="p-3 sm:p-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md group"
                        >
                          <div className="flex items-center gap-1 text-xs font-bold">
                            <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px] font-mono">4</span>
                            <span>{isFa ? 'آسان (عالی)' : 'Easy'}</span>
                          </div>
                          <span className="text-[10px] text-sky-200/90 font-mono">{fsrsIntervals.easy}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[10.5px] text-slate-500 px-1 pt-1">
                        <span>{isFa ? '📱 راهنمای سوایپ: کشیدن به راست = بلدم | کشیدن به چپ = تکرار' : '📱 Swipe Right = Good | Swipe Left = Again'}</span>
                        <span className="hidden sm:inline">{isFa ? '⌨️ کلیدها: ۱، ۲، ۳، ۴ | کلید Z: تمرکز کامل' : '⌨️ Hotkeys: 1, 2, 3, 4 | Z: Zen Mode'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      ) : (
        /* ========================================================================= */
        /* DECKS / KNOWLEDGE TREE FOLDERS VIEW (DIRECT & MAXIMAL HEADLINE SPACE)     */
        /* ========================================================================= */
        <div className="space-y-3 max-w-4xl mx-auto w-full">
          {/* Sub Navigation & Actions Bar */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {isFa ? 'دسته‌بندی موضوعی درخت دانش' : 'Knowledge Tree Decks'}
              </span>
              <span className="text-[10.5px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono">
                {Object.keys(folderTree).length} {isFa ? 'شاخه' : 'Domains'}
              </span>
            </div>

            {/* Quick Actions: Expand/Collapse All & Backup */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const allExpanded = Object.keys(folderTree).every((k) => expandedFolders[k]);
                  const next: Record<string, boolean> = {};
                  Object.keys(folderTree).forEach((k) => {
                    next[k] = !allExpanded;
                  });
                  setExpandedFolders(next);
                }}
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold transition cursor-pointer"
              >
                {Object.keys(folderTree).every((k) => expandedFolders[k])
                  ? isFa ? 'بستن همه' : 'Collapse All'
                  : isFa ? 'باز کردن همه' : 'Expand All'}
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700"
                title={isFa ? 'پشتیبان‌گیری از تمام کارت‌ها در قالب JSON' : 'Export all flashcards to JSON'}
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <label className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer border border-slate-700">
                <Upload className="w-3.5 h-3.5" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* KNOWLEDGE FOLDER ACCORDION TREE */}
          <div className="space-y-2">
            {Object.entries(folderTree).map(([domainName, domainData]) => {
              const isExpanded = !!expandedFolders[domainName];

              return (
                <div key={domainName} className="rounded-xl border border-slate-800 bg-slate-950/70 overflow-hidden shadow-xs">
                  {/* Level 1: Domain Row (Maximal Headline Space) */}
                  <div
                    onClick={() =>
                      setExpandedFolders((prev) => ({ ...prev, [domainName]: !prev[domainName] }))
                    }
                    className="p-3 flex items-center justify-between gap-3 hover:bg-slate-900 cursor-pointer transition select-none"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4 text-purple-400 shrink-0" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                      )}
                      <span className="text-sm font-black text-white truncate leading-normal">{domainName}</span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono font-bold">
                        {domainData.count}
                        {domainData.dueCount > 0 && (
                          <span className="ms-1 text-amber-400">({domainData.dueCount}!)</span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          startStudyForScope({
                            title: domainName,
                            domain: domainName,
                            cram: domainData.dueCount === 0,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        <Play className="w-2.5 h-2.5 text-amber-300" />
                        <span>{domainData.dueCount > 0 ? (isFa ? 'مرور' : 'Study') : (isFa ? 'فشرده' : 'Cram')}</span>
                      </button>
                    </div>
                  </div>

                  {/* Level 2: Systems inside Domain */}
                  {isExpanded && (
                    <div className="p-2.5 bg-slate-900/90 border-t border-slate-800/80 space-y-2">
                      {Object.entries(domainData.systems).map(([systemName, systemData]) => (
                        <div
                          key={systemName}
                          className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/70 flex flex-col gap-1.5"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-slate-200 flex-1 min-w-0">
                              <span className="text-xs font-bold text-slate-100 truncate">{systemName}</span>
                              <span className="text-[9.5px] px-1 py-0.2 rounded bg-slate-800 text-slate-400 font-mono shrink-0">
                                {systemData.count}
                                {systemData.dueCount > 0 && (
                                  <span className="text-amber-400 ms-0.5">({systemData.dueCount})</span>
                                )}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                startStudyForScope({
                                  title: `${domainName} / ${systemName}`,
                                  domain: domainName,
                                  system: systemName,
                                  cram: systemData.dueCount === 0,
                                })
                              }
                              className="px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shrink-0"
                            >
                              <Play className="w-2 h-2 text-amber-300" />
                              <span>{systemData.dueCount > 0 ? (isFa ? 'مرور' : 'Study') : (isFa ? 'فشرده' : 'Cram')}</span>
                            </button>
                          </div>

                          {/* Level 3: Subsystems / Topics Chips (Full width & readable) */}
                          <div className="flex items-center gap-1 flex-wrap pt-0.5">
                            {Object.entries(systemData.subsystems).map(([subName, subData]) => (
                              <button
                                key={subName}
                                type="button"
                                onClick={() =>
                                  startStudyForScope({
                                    title: `${domainName} > ${systemName} > ${subName}`,
                                    domain: domainName,
                                    system: systemName,
                                    subsystem: subName,
                                    cram: subData.dueCount === 0,
                                  })
                                }
                                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-850 border border-slate-800/80 text-[10px] text-slate-300 hover:text-white transition flex items-center gap-1 cursor-pointer"
                              >
                                <span>{subName}</span>
                                <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400 font-mono">
                                  {subData.count}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ZEN / DEEP FOCUS MODE FULLSCREEN PORTAL */}
      {isZenMode && typeof document !== 'undefined' && createPortal(
        <div
          className={`fixed inset-0 z-50 overflow-y-auto flex flex-col justify-between p-4 sm:p-8 transition-colors duration-300 ${
            zenTheme === 'oled'
              ? 'bg-black text-slate-100'
              : 'bg-[#F5EFE6] text-[#1F1B18]'
          }`}
          dir={isFa ? 'rtl' : 'ltr'}
        >
          {/* Top Zen HUD Toolbar */}
          <div
            className="max-w-3xl w-full mx-auto flex items-center justify-between gap-3 text-xs border-b pb-3 mb-3 shrink-0"
            style={{ borderColor: zenTheme === 'oled' ? '#27272a' : '#dcd1c4' }}
          >
            <div className="flex items-center gap-3">
              <span
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold border ${
                  zenTheme === 'oled'
                    ? 'bg-purple-950/60 border-purple-500/40 text-purple-300'
                    : 'bg-[#e8ded0] border-[#cbbca9] text-[#4a3f35]'
                }`}
              >
                {isFa ? `کارت ${currentCardNum} از ${totalInQueue}` : `Card ${currentCardNum} / ${totalInQueue}`}
              </span>
              <span className="text-[11px] flex items-center gap-1 opacity-70">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>{isFa ? `~${estimatedMinsRemaining} د باقی‌مانده` : `~${estimatedMinsRemaining}m left`}</span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Exit Zen Mode */}
              <button
                type="button"
                onClick={() => setIsZenMode(false)}
                className={`p-2 rounded-xl border transition cursor-pointer flex items-center gap-1 font-bold ${
                  zenTheme === 'oled'
                    ? 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                    : 'bg-[#e2d5c2] border-[#ccbea9] text-[#332a22] hover:bg-[#d6c7b2]'
                }`}
                title={isFa ? 'خروج از تمرکز مطلق (Esc / Z)' : 'Exit Zen Mode (Esc / Z)'}
              >
                <X className="w-4 h-4" />
                <span className="hidden sm:inline text-xs">{isFa ? 'خروج' : 'Exit'}</span>
              </button>
            </div>
          </div>

          {/* Center: Fullscreen Flashcard Canvas with Swipe Physics */}
          {currentStudyCard && !sessionCompleted ? (
            <div className="max-w-3xl w-full mx-auto flex-1 flex flex-col justify-center py-2 sm:py-6">
              <div className="relative w-full">
                {/* 1. RIGHT SWIPES: EASY (TOP-RIGHT) VS GOOD (BOTTOM-RIGHT / HORIZONTAL) */}
                {dragOffset.x > 25 && (
                  <div className="absolute top-6 end-6 z-30 flex flex-col gap-2 pointer-events-none rotate-6 transition-all duration-150">
                    {/* EASY STAMP (ACTIVE WHEN DRAGGING TOWARDS TOP-RIGHT) */}
                    <div
                      className={`px-4 py-2 rounded-2xl border-3 transition-all flex items-center gap-2 shadow-2xl ${
                        dragOffset.y < -15
                          ? 'scale-110 border-cyan-400 bg-cyan-950/95 text-cyan-200 ring-4 ring-cyan-400/40 shadow-cyan-500/40'
                          : 'opacity-40 border-cyan-600/60 bg-cyan-950/70 text-cyan-400'
                      }`}
                      style={{ opacity: Math.max(0.3, Math.min(1, dragOffset.x / 90)) }}
                    >
                      <Zap className="w-5 h-5 text-cyan-300 animate-bounce" />
                      <span className="font-black text-sm sm:text-base tracking-wide">
                        {isFa ? '✨ آسان (EASY)' : '✨ EASY'}
                      </span>
                    </div>

                    {/* GOOD STAMP (ACTIVE WHEN DRAGGING HORIZONTALLY / BOTTOM-RIGHT) */}
                    <div
                      className={`px-4 py-2 rounded-2xl border-3 transition-all flex items-center gap-2 shadow-2xl ${
                        dragOffset.y >= -15
                          ? 'scale-110 border-emerald-400 bg-emerald-950/95 text-emerald-200 ring-4 ring-emerald-400/40 shadow-emerald-500/40'
                          : 'opacity-40 border-emerald-600/60 bg-emerald-950/70 text-emerald-400'
                      }`}
                      style={{ opacity: Math.max(0.3, Math.min(1, dragOffset.x / 90)) }}
                    >
                      <ThumbsUp className="w-5 h-5 text-emerald-300" />
                      <span className="font-black text-sm sm:text-base tracking-wide">
                        {isFa ? '👍 بلدم (GOOD)' : '👍 GOOD'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 2. LEFT SWIPES: HARD (TOP-LEFT) VS AGAIN (BOTTOM-LEFT / HORIZONTAL) */}
                {dragOffset.x < -25 && (
                  <div className="absolute top-6 start-6 z-30 flex flex-col gap-2 pointer-events-none -rotate-6 transition-all duration-150">
                    {/* HARD STAMP (ACTIVE WHEN DRAGGING TOWARDS TOP-LEFT) */}
                    <div
                      className={`px-4 py-2 rounded-2xl border-3 transition-all flex items-center gap-2 shadow-2xl ${
                        dragOffset.y < -15
                          ? 'scale-110 border-amber-400 bg-amber-950/95 text-amber-200 ring-4 ring-amber-400/40 shadow-amber-500/40'
                          : 'opacity-40 border-amber-600/60 bg-amber-950/70 text-amber-400'
                      }`}
                      style={{ opacity: Math.max(0.3, Math.min(1, Math.abs(dragOffset.x) / 90)) }}
                    >
                      <AlertCircle className="w-5 h-5 text-amber-300 animate-pulse" />
                      <span className="font-black text-sm sm:text-base tracking-wide">
                        {isFa ? '⚠️ سخت (HARD)' : '⚠️ HARD'}
                      </span>
                    </div>

                    {/* AGAIN STAMP (ACTIVE WHEN DRAGGING HORIZONTALLY / BOTTOM-LEFT) */}
                    <div
                      className={`px-4 py-2 rounded-2xl border-3 transition-all flex items-center gap-2 shadow-2xl ${
                        dragOffset.y >= -15
                          ? 'scale-110 border-rose-500 bg-rose-950/95 text-rose-200 ring-4 ring-rose-500/40 shadow-rose-500/40'
                          : 'opacity-40 border-rose-600/60 bg-rose-950/70 text-rose-400'
                      }`}
                      style={{ opacity: Math.max(0.3, Math.min(1, Math.abs(dragOffset.x) / 90)) }}
                    >
                      <RotateCcw className="w-5 h-5 text-rose-300" />
                      <span className="font-black text-sm sm:text-base tracking-wide">
                        {isFa ? '🔄 تکرار (AGAIN)' : '🔄 AGAIN'}
                      </span>
                    </div>
                  </div>
                )}

                {/* 3. VERTICAL SWIPES (BOTH PULL DOWN & PULL UP REVEAL ANSWER) */}
                {Math.abs(dragOffset.y) > 35 && Math.abs(dragOffset.y) > Math.abs(dragOffset.x) && !isAnswerRevealed && (
                  <div
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 px-5 py-3 rounded-2xl border-2 border-cyan-400 bg-slate-950/95 text-cyan-200 font-black text-sm sm:text-base tracking-wider uppercase shadow-2xl flex items-center gap-2.5 pointer-events-none animate-in fade-in zoom-in-90 backdrop-blur-md"
                    style={{ opacity: Math.min(1, Math.abs(dragOffset.y) / 70) }}
                  >
                    <Eye className="w-5 h-5 text-cyan-300 animate-pulse" />
                    <span>{isFa ? '✨ رها کنید: نمایش پاسخ ✨' : '✨ Release to Reveal Answer ✨'}</span>
                  </div>
                )}

                {/* Zen Card Body */}
                <div
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                  onMouseDown={handleTouchStart}
                  onMouseMove={handleTouchMove}
                  onMouseUp={handleTouchEnd}
                  style={{
                    transform: `translateX(${dragOffset.x}px) translateY(${dragOffset.y * 0.12}px) rotate(${dragOffset.x * 0.04}deg)`,
                    transition: isDragging ? 'none' : 'transform 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
                    touchAction: 'pan-y',
                    cursor: isDragging ? 'grabbing' : 'grab',
                  }}
                  className={`rounded-3xl p-6 sm:p-10 border shadow-2xl space-y-6 select-none transition-colors ${
                    zenTheme === 'oled'
                      ? isAnswerRevealed
                        ? 'bg-zinc-950 border-purple-500/50 ring-1 ring-purple-500/30'
                        : 'bg-zinc-950 border-zinc-800'
                      : isAnswerRevealed
                      ? 'bg-[#FCF9F2] border-amber-600/50 ring-1 ring-amber-600/30 shadow-[#e0d3be]'
                      : 'bg-[#FCF9F2] border-[#D9CEBF] shadow-[#e0d3be]'
                  }`}
                >
                  {/* Top Card Info: Language Switcher Only */}
                  <div
                    className="flex items-center justify-center text-xs pb-2.5 border-b border-opacity-30"
                    style={{ borderColor: zenTheme === 'oled' ? '#27272a' : '#e0d3be' }}
                  >
                    {/* 🌐 Zen Mode Flags-Only Switcher */}
                    <div
                      className={`p-0.5 rounded-xl flex items-center gap-1 border text-sm ${
                        zenTheme === 'oled' ? 'bg-slate-950 border-slate-800' : 'bg-[#e4d8c7] border-[#ccbea9]'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSetCardLangMode('bilingual')}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                          cardLanguageMode === 'bilingual' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                        }`}
                        title="Bilingual (🌐)"
                      >
                        <span className="text-base leading-none">🌐</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCardLangMode('fa')}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                          cardLanguageMode === 'fa' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                        }`}
                        title="Persian (🇮🇷)"
                      >
                        <span className="text-base leading-none">🇮🇷</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetCardLangMode('en')}
                        className={`w-7 h-7 rounded-lg transition flex items-center justify-center cursor-pointer ${
                          cardLanguageMode === 'en' ? 'bg-purple-600 shadow-xs ring-1 ring-purple-400/40' : 'opacity-50 hover:opacity-100'
                        }`}
                        title="English (🇬🇧)"
                      >
                        <span className="text-base leading-none">🇬🇧</span>
                      </button>
                    </div>
                  </div>

                  {/* Question */}
                  {(() => {
                    const qFa = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.fa || currentStudyCard.question.en : currentStudyCard.question;
                    const qEn = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.en || currentStudyCard.question.fa : currentStudyCard.question;
                    const aFa = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.fa || currentStudyCard.answer.en : currentStudyCard.answer;
                    const aEn = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.en || currentStudyCard.answer.fa : currentStudyCard.answer;
                    const pFa = currentStudyCard.pearl ? (typeof currentStudyCard.pearl === 'object' ? currentStudyCard.pearl.fa : currentStudyCard.pearl) : '';
                    const pEn = currentStudyCard.pearl ? (typeof currentStudyCard.pearl === 'object' ? currentStudyCard.pearl.en : currentStudyCard.pearl) : '';

                    return (
                      <>
                        <div
                          onClick={() => {
                            if (!isAnswerRevealed) {
                              haptic.light();
                              setIsAnswerRevealed(true);
                            }
                          }}
                          className={`space-y-3 ${!isAnswerRevealed ? 'cursor-pointer' : ''}`}
                        >
                          {cardLanguageMode === 'bilingual' ? (
                            <div className="space-y-3">
                              {qFa && (
                                <p
                                  dir="rtl"
                                  className={`text-lg sm:text-2xl font-bold leading-relaxed ${
                                    zenTheme === 'oled' ? 'text-white' : 'text-[#1A1412]'
                                  }`}
                                >
                                  <span className="text-xs text-amber-400 font-mono font-bold ml-2 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">FA</span>
                                  {qFa}
                                </p>
                              )}
                              {qEn && (
                                <p
                                  dir="ltr"
                                  className={`text-base sm:text-xl font-medium leading-relaxed border-t pt-2.5 font-sans ${
                                    zenTheme === 'oled' ? 'text-slate-300 border-zinc-800' : 'text-[#3E342B] border-[#dcd1c4]'
                                  }`}
                                >
                                  <span className="text-xs text-sky-400 font-mono font-bold mr-2 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">EN</span>
                                  {qEn}
                                </p>
                              )}
                            </div>
                          ) : (
                            <p
                              className={`text-lg sm:text-2xl font-bold leading-relaxed ${
                                zenTheme === 'oled' ? 'text-white' : 'text-[#1A1412]'
                              }`}
                            >
                              {cardLanguageMode === 'fa' ? qFa : qEn}
                            </p>
                          )}

                          {/* MCQ Options if available */}
                          {currentStudyCard.type === 'mcq' && currentStudyCard.mcqOptions && (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 text-xs sm:text-sm">
                              {currentStudyCard.mcqOptions.map((opt, oIdx) => {
                                const optLetter = String.fromCharCode(65 + oIdx);
                                const isSelected = selectedMcqOption === opt.id;
                                const optFa = opt.text?.fa || opt.text?.en || '';
                                const optEn = opt.text?.en || opt.text?.fa || '';

                                return (
                                  <button
                                    key={opt.id || oIdx}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedMcqOption(opt.id);
                                      if (!isAnswerRevealed) setIsAnswerRevealed(true);
                                    }}
                                    className={`p-3.5 rounded-2xl border text-start transition cursor-pointer flex items-start gap-2.5 ${
                                      isAnswerRevealed && opt.isCorrect
                                        ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 font-bold'
                                        : isAnswerRevealed && isSelected && !opt.isCorrect
                                        ? 'bg-rose-950/60 border-rose-500 text-rose-300 line-through'
                                        : isSelected
                                        ? 'bg-purple-900/40 border-purple-500 text-purple-300 font-bold'
                                        : zenTheme === 'oled'
                                        ? 'bg-zinc-900/80 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                                        : 'bg-[#F2E8D8] border-[#D9CEBF] text-[#2C241E] hover:bg-[#EBDDCA]'
                                    }`}
                                  >
                                    <span className="w-5 h-5 rounded-full bg-black/40 border border-white/20 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                      {optLetter}
                                    </span>
                                    <div className="leading-relaxed flex-1 space-y-1">
                                      {cardLanguageMode === 'bilingual' ? (
                                        <>
                                          {optFa && <div dir="rtl">{optFa}</div>}
                                          {optEn && <div className="text-[11.5px] opacity-80 border-t border-current/20 pt-1 font-sans" dir="ltr">{optEn}</div>}
                                        </>
                                      ) : (
                                        <div>{cardLanguageMode === 'fa' ? optFa : optEn}</div>
                                      )}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>

                        {/* Revealed Answer in Zen Mode */}
                        {isAnswerRevealed && (
                          <div className="pt-4 border-t border-purple-500/30 space-y-4 animate-in fade-in duration-200">
                            <div className="space-y-1">
                              <div className="text-xs font-bold text-emerald-500 flex items-center gap-1.5">
                                <CheckCircle2 className="w-4 h-4" />
                                <span>{isFa ? 'پاسخ صحیح و تحلیل بالینی:' : 'Correct Rationale:'}</span>
                              </div>
                              
                              {cardLanguageMode === 'bilingual' ? (
                                <div
                                  className={`space-y-2 p-4 rounded-2xl border ${
                                    zenTheme === 'oled'
                                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                                      : 'bg-[#EBF7EE] border-emerald-400 text-[#144723]'
                                  }`}
                                >
                                  {aFa && (
                                    <div dir="rtl" className="text-base sm:text-lg leading-relaxed">
                                      <span className="text-xs text-emerald-400 font-mono font-bold ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">FA</span>
                                      {aFa}
                                    </div>
                                  )}
                                  {aEn && (
                                    <div dir="ltr" className="text-sm sm:text-base leading-relaxed border-t border-emerald-500/20 pt-2 font-sans opacity-95">
                                      <span className="text-xs text-sky-400 font-mono font-bold mr-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">EN</span>
                                      {aEn}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <p
                                  className={`text-base sm:text-lg leading-relaxed p-4 rounded-2xl border ${
                                    zenTheme === 'oled'
                                      ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-100'
                                      : 'bg-[#EBF7EE] border-emerald-400 text-[#144723]'
                                  }`}
                                >
                                  {cardLanguageMode === 'fa' ? aFa : aEn}
                                </p>
                              )}
                            </div>

                            {(pFa || pEn) && (
                              <div
                                className={`p-3.5 rounded-2xl border text-xs flex items-start gap-2 ${
                                  zenTheme === 'oled'
                                    ? 'bg-purple-950/30 border-purple-500/30 text-purple-200'
                                    : 'bg-[#F5EFFB] border-purple-300 text-[#432360]'
                                }`}
                              >
                                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div className="flex-1 space-y-1">
                                  <span className="font-bold text-amber-500">{isFa ? 'نکته کلیدی: ' : 'Key Point: '}</span>
                                  {cardLanguageMode === 'bilingual' ? (
                                    <div className="space-y-1">
                                      {pFa && <div dir="rtl">{pFa}</div>}
                                      {pEn && <div dir="ltr" className="font-sans opacity-90 border-t border-current/20 pt-1">{pEn}</div>}
                                    </div>
                                  ) : (
                                    <span>{cardLanguageMode === 'fa' ? pFa : pEn}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          ) : null}

          {/* Bottom Controls in Zen Mode */}
          <div className="max-w-3xl w-full mx-auto shrink-0 pt-2">
            {!isAnswerRevealed ? (
              <button
                type="button"
                onClick={() => setIsAnswerRevealed(true)}
                className="w-full py-4 rounded-2xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-base font-bold shadow-2xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Eye className="w-5 h-5" />
                <span>{isFa ? 'نمایش پاسخ (Space / Swipe)' : 'Show Answer (Space / Swipe)'}</span>
              </button>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleRateCard('again')}
                  className="p-3.5 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">1</span>
                    <span>{isFa ? 'تکرار' : 'Again'}</span>
                  </div>
                  <span className="text-[10px] opacity-90">{fsrsIntervals.again}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('hard')}
                  className="p-3.5 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">2</span>
                    <span>{isFa ? 'سخت' : 'Hard'}</span>
                  </div>
                  <span className="text-[10px] opacity-90">{fsrsIntervals.hard}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('good')}
                  className="p-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">3</span>
                    <span>{isFa ? 'خوب' : 'Good'}</span>
                  </div>
                  <span className="text-[10px] opacity-90">{fsrsIntervals.good}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRateCard('easy')}
                  className="p-3.5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-lg"
                >
                  <div className="flex items-center gap-1 text-xs font-bold">
                    <span className="w-4 h-4 rounded-full bg-black/30 flex items-center justify-center text-[10px]">4</span>
                    <span>{isFa ? 'آسان' : 'Easy'}</span>
                  </div>
                  <span className="text-[10px] opacity-90">{fsrsIntervals.easy}</span>
                </button>
              </div>
            )}

            {/* Gesture Hints in Zen Mode */}
            <div className="flex items-center justify-center gap-3 pt-2 text-[10.5px] opacity-60 flex-wrap select-none font-mono">
              <span className="text-amber-400 font-bold">{isFa ? '↖️ بالا-چپ: سخت (Hard)' : '↖️ Top-Left: Hard'}</span>
              <span>•</span>
              <span className="text-rose-400 font-bold">{isFa ? '⬅️ چپ: تکرار (Again)' : '⬅️ Left: Again'}</span>
              <span>•</span>
              <span className="text-cyan-400 font-bold">{isFa ? '↗️ بالا-راست: آسان (Easy)' : '↗️ Top-Right: Easy'}</span>
              <span>•</span>
              <span className="text-emerald-400 font-bold">{isFa ? '➡️ راست: خوب (Good)' : '➡️ Right: Good'}</span>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ⚙️ LEITNER STUDY SETTINGS MODAL */}
      <LeitnerStudySettingsModal
        isOpen={isStudySettingsOpen}
        onClose={() => setIsStudySettingsOpen(false)}
        language={language}
        settings={studySettings}
        onUpdateSettings={(newSettings) => setStudySettings(newSettings)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onClearCards={handleDeleteAllCards}
        onLoadSamples={handleAddSampleCards}
        totalCardsCount={cards.length}
        initialTab={settingsInitialTab}
      />
    </div>
  );
};
