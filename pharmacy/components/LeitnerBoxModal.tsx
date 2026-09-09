'use client';

import React, { useState, useMemo, useRef } from 'react';
import { Language } from '@/types/pharmacy';
import {
  LeitnerCard,
  LeitnerCardType,
  LEITNER_INTERVALS,
  LEITNER_BOX_NAMES,
} from '@/types/leitner';
import {
  X,
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
  ArrowRight,
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
  Flame as FireIcon,
  Check,
} from 'lucide-react';

interface LeitnerBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  cards: LeitnerCard[];
  onUpdateCards: (updatedCards: LeitnerCard[]) => void;
  onOpenCreateModal?: () => void;
}

export const LeitnerBoxModal: React.FC<LeitnerBoxModalProps> = ({
  isOpen,
  onClose,
  language,
  cards,
  onUpdateCards,
  onOpenCreateModal,
}) => {
  const isFa = language === 'fa';
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tabs: Study, Hierarchical Tree & Management, Analytics & Backup
  const [activeTab, setActiveTab] = useState<'study' | 'tree' | 'analytics'>('study');

  // Review & Study Configuration
  const [isCramMode, setIsCramMode] = useState(false);
  const [showHierarchyGlobal, setShowHierarchyGlobal] = useState(false); // Default hidden as user specified!
  const [showHierarchyCard, setShowHierarchyCard] = useState<Record<string, boolean>>({});

  // MCQ Selection during study
  const [selectedMcqOption, setSelectedMcqOption] = useState<string | null>(null);

  // Tree & Filter states
  const [selectedModuleFilter, setSelectedModuleFilter] = useState<number | 'ALL'>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedDomainFilter, setSelectedDomainFilter] = useState<string>('ALL');
  const [selectedSystemFilter, setSelectedSystemFilter] = useState<string>('ALL');
  const [selectedSubsystemFilter, setSelectedSubsystemFilter] = useState<string>('ALL');
  const [selectedBoxFilter, setSelectedBoxFilter] = useState<number | 'ALL'>('ALL');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<LeitnerCardType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({});

  // Study Session State
  const [studyQueueIndex, setStudyQueueIndex] = useState(0);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);
  const [boxCardLang, setBoxCardLang] = useState<'bilingual' | 'fa' | 'en'>('bilingual');
  const [sessionStats, setSessionStats] = useState({
    again: 0,
    hard: 0,
    good: 0,
    easy: 0,
    promotedToMaster: 0,
  });

  // Text access helpers
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
        label: isFa ? '📝 تست چهارگزینه‌ای' : '📝 Multiple-choice question',
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
      triage_wwham: {
        label: isFa ? '❓ پروتکل WWHAM' : '❓ WWHAM',
        bg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
        icon: HelpCircle,
      },
      scheduling_legal: {
        label: isFa ? '⚖️ قوانین S2/S3/S4' : '⚖️ Law & Sched',
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: Tag,
      },
      matrix_comparison: {
        label: isFa ? '📊 مقایسه داروها' : '📊 Comparison',
        bg: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
        icon: Layers,
      },
      clinical_pearl: {
        label: isFa ? '💎 نکته طلایی' : '💎 Clinical Pearl',
        bg: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        icon: Sparkles,
      },
      custom: {
        label: isFa ? '📌 کارت سفارشی' : '📌 Custom',
        bg: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
        icon: Tag,
      },
    };
    const item = map[type] || map.clinical_pearl;
    return (
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${item.bg}`}>
        <span>{item.label}</span>
      </span>
    );
  };

  // Filter cards due for review
  const dueCards = useMemo(() => {
    const nowIso = new Date().toISOString();
    return cards.filter((c) => {
      return !c.nextReviewDate || c.nextReviewDate <= nowIso;
    });
  }, [cards]);

  // Hierarchical Domains, Systems & Subsystems derived from KnowledgeTree
  const hierarchyTreeData = useMemo(() => {
    const domains: Record<string, { count: number; systems: Record<string, { count: number; subsystems: Record<string, number> }> }> = {};

    cards.forEach((c) => {
      const dName = isFa
        ? c.knowledgeTree?.domain?.fa || c.category || 'عمومی'
        : c.knowledgeTree?.domain?.en || c.category || 'General';
      const sName = isFa
        ? c.knowledgeTree?.system?.fa || c.topic || 'سایر'
        : c.knowledgeTree?.system?.en || c.topic || 'Other';
      const subName = isFa
        ? c.knowledgeTree?.subsystem?.fa || 'مفاهیم پایه'
        : c.knowledgeTree?.subsystem?.en || 'Core Concepts';

      if (!domains[dName]) domains[dName] = { count: 0, systems: {} };
      domains[dName].count++;

      if (!domains[dName].systems[sName]) domains[dName].systems[sName] = { count: 0, subsystems: {} };
      domains[dName].systems[sName].count++;

      domains[dName].systems[sName].subsystems[subName] = (domains[dName].systems[sName].subsystems[subName] || 0) + 1;
    });

    return domains;
  }, [cards, isFa]);

  // Filtered cards for Tree & List View
  const filteredCards = useMemo(() => {
    return cards.filter((c) => {
      if (selectedModuleFilter !== 'ALL' && c.module !== selectedModuleFilter) return false;
      if (selectedCategoryFilter !== 'ALL' && c.category !== selectedCategoryFilter) return false;
      if (selectedBoxFilter !== 'ALL' && c.box !== selectedBoxFilter) return false;
      if (selectedTypeFilter !== 'ALL' && c.type !== selectedTypeFilter) return false;

      // Knowledge tree filters
      if (selectedDomainFilter !== 'ALL') {
        const d = isFa ? c.knowledgeTree?.domain?.fa : c.knowledgeTree?.domain?.en;
        if (d !== selectedDomainFilter && c.category !== selectedDomainFilter) return false;
      }
      if (selectedSystemFilter !== 'ALL') {
        const s = isFa ? c.knowledgeTree?.system?.fa : c.knowledgeTree?.system?.en;
        if (s !== selectedSystemFilter && c.topic !== selectedSystemFilter) return false;
      }
      if (selectedSubsystemFilter !== 'ALL') {
        const sub = isFa ? c.knowledgeTree?.subsystem?.fa : c.knowledgeTree?.subsystem?.en;
        if (sub !== selectedSubsystemFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const qText = (
          typeof c.question === 'object' && c.question
            ? (c.question.fa || '') + ' ' + (c.question.en || '')
            : String(c.question || '')
        ).toLowerCase();
        const aText = (
          typeof c.answer === 'object' && c.answer
            ? (c.answer.fa || '') + ' ' + (c.answer.en || '')
            : String(c.answer || '')
        ).toLowerCase();
        const topicText = ((c.topic || '') + ' ' + (c.category || '')).toLowerCase();
        const pathText = c.knowledgeTree?.path
          ? ((c.knowledgeTree.path.fa || []).join(' ') + ' ' + (c.knowledgeTree.path.en || []).join(' ')).toLowerCase()
          : '';
        if (!qText.includes(q) && !aText.includes(q) && !topicText.includes(q) && !pathText.includes(q)) {
          return false;
        }
      }
      return true;
    });
  }, [
    cards,
    selectedModuleFilter,
    selectedCategoryFilter,
    selectedBoxFilter,
    selectedTypeFilter,
    selectedDomainFilter,
    selectedSystemFilter,
    selectedSubsystemFilter,
    searchQuery,
    isFa,
  ]);

  // Counts by Box
  const boxCounts = useMemo(() => {
    const counts: Record<1 | 2 | 3 | 4 | 5, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    cards.forEach((c) => {
      counts[c.box] = (counts[c.box] || 0) + 1;
    });
    return counts;
  }, [cards]);

  // Mastery percentage (Boxes 4 & 5 are mastered)
  const masteryPercentage = useMemo(() => {
    if (cards.length === 0) return 0;
    const mastered = (boxCounts[4] || 0) + (boxCounts[5] || 0);
    return Math.round((mastered / cards.length) * 100);
  }, [cards.length, boxCounts]);

  // Active study cards
  const studyCardsList = useMemo(() => {
    if (isCramMode) {
      return filteredCards.length > 0 ? filteredCards : cards;
    }
    return dueCards.length > 0 ? dueCards : filteredCards;
  }, [isCramMode, dueCards, filteredCards, cards]);

  const currentStudyCard = studyCardsList[studyQueueIndex] || null;

  if (!isOpen) return null;

  // Handle 4-Grade Spaced Repetition (Again, Hard, Good, Easy)
  const handleGradeAnswer = (grade: 'again' | 'hard' | 'good' | 'easy') => {
    if (!currentStudyCard) return;

    let nextBox: 1 | 2 | 3 | 4 | 5 = currentStudyCard.box;
    let daysToAdd = 1;

    if (isCramMode) {
      // In cram mode, we do not permanently change the box unless desired
      setSessionStats((prev) => ({
        ...prev,
        [grade]: prev[grade] + 1,
      }));
    } else {
      switch (grade) {
        case 'again':
          nextBox = 1;
          daysToAdd = LEITNER_INTERVALS[1];
          setSessionStats((prev) => ({ ...prev, again: prev.again + 1 }));
          break;
        case 'hard':
          // Stay in current box or review sooner (+1 day)
          nextBox = currentStudyCard.box;
          daysToAdd = Math.max(1, Math.floor(LEITNER_INTERVALS[currentStudyCard.box] / 2));
          setSessionStats((prev) => ({ ...prev, hard: prev.hard + 1 }));
          break;
        case 'good':
          // Advance to next box (+1)
          nextBox = Math.min(5, currentStudyCard.box + 1) as 1 | 2 | 3 | 4 | 5;
          daysToAdd = LEITNER_INTERVALS[nextBox];
          setSessionStats((prev) => ({
            ...prev,
            good: prev.good + 1,
            promotedToMaster: nextBox === 5 ? prev.promotedToMaster + 1 : prev.promotedToMaster,
          }));
          break;
        case 'easy':
          // Fast advance (+2 boxes or straight to 5)
          nextBox = Math.min(5, currentStudyCard.box + 2) as 1 | 2 | 3 | 4 | 5;
          daysToAdd = LEITNER_INTERVALS[nextBox] + 15;
          setSessionStats((prev) => ({
            ...prev,
            easy: prev.easy + 1,
            promotedToMaster: nextBox >= 4 ? prev.promotedToMaster + 1 : prev.promotedToMaster,
          }));
          break;
      }

      const nextDate = new Date();
      nextDate.setDate(nextDate.getDate() + daysToAdd);

      const updatedCard: LeitnerCard = {
        ...currentStudyCard,
        box: nextBox,
        nextReviewDate: nextDate.toISOString(),
        lastReviewedDate: new Date().toISOString(),
        reviewCount: (currentStudyCard.reviewCount || 0) + 1,
        successCount:
          grade === 'good' || grade === 'easy'
            ? (currentStudyCard.successCount || 0) + 1
            : currentStudyCard.successCount || 0,
      };

      const updatedAllCards = cards.map((c) => (c.id === currentStudyCard.id ? updatedCard : c));
      onUpdateCards(updatedAllCards);
    }

    // Advance queue
    setIsAnswerRevealed(false);
    setSelectedMcqOption(null);
    if (studyQueueIndex + 1 < studyCardsList.length) {
      setStudyQueueIndex((prev) => prev + 1);
    } else {
      setSessionCompleted(true);
    }
  };

  const handleDeleteCard = (cardId: string) => {
    const updated = cards.filter((c) => c.id !== cardId);
    onUpdateCards(updated);
  };

  const handleResetCardBox = (cardId: string) => {
    const updated = cards.map((c) => {
      if (c.id === cardId) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return { ...c, box: 1 as const, nextReviewDate: tomorrow.toISOString() };
      }
      return c;
    });
    onUpdateCards(updated);
  };

  const restartStudySession = (cram = false) => {
    setIsCramMode(cram);
    setStudyQueueIndex(0);
    setIsAnswerRevealed(false);
    setSelectedMcqOption(null);
    setSessionCompleted(false);
    setSessionStats({ again: 0, hard: 0, good: 0, easy: 0, promotedToMaster: 0 });
  };

  // Export & Backup
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(cards, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacy-leitner-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          const existingIds = new Set(cards.map((c) => c.id));
          const newCards: LeitnerCard[] = [];
          imported.forEach((card) => {
            if (card && card.question && card.answer) {
              if (!existingIds.has(card.id)) {
                newCards.push(card);
              }
            }
          });
          onUpdateCards([...cards, ...newCards]);
          alert(
            isFa
              ? `✅ ${newCards.length} کارت جدید با موفقیت بازیابی شد!`
              : `✅ Successfully imported ${newCards.length} new cards!`
          );
        }
      } catch (err) {
        alert(isFa ? 'خطا در بارگذاری فایل JSON' : 'Invalid JSON file format');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleFolder = (folderKey: string) => {
    setExpandedFolders((prev) => ({ ...prev, [folderKey]: !prev[folderKey] }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="app-card border border-purple-500/40 rounded-2xl w-full max-w-4xl h-[95vh] flex flex-col shadow-2xl bg-slate-900 text-white overflow-hidden"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* TOP MODAL HEADER */}
        <div className="p-3.5 sm:p-4 border-b border-slate-800 flex items-center justify-between gap-3 bg-linear-to-r from-purple-950/70 via-slate-900 to-indigo-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shrink-0">
              <Layers className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {isFa ? 'جعبه لایتنر هوشمند فارماکولوژی (Leitner Spaced Repetition)' : 'Smart Clinical Leitner Box'}
                </h2>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {cards.length} {isFa ? 'کارت' : 'Cards'}
                </span>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-bold">
                  <Award className="w-3 h-3 text-emerald-400" />
                  <span>{isFa ? `تسلط: ${masteryPercentage}٪` : `Mastery: ${masteryPercentage}%`}</span>
                </span>
              </div>
              <p className="text-xs text-purple-300/80">
                {isFa
                  ? `${dueCards.length} کارت آماده مرور امروز طبق الگوریتم فاصله‌دار SM-2`
                  : `${dueCards.length} cards due today for spaced repetition review`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onOpenCreateModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCreateModal();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                <span>{isFa ? 'تولید با هوش مصنوعی' : 'AI Studio'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 5-BOX VISUAL PROGRESS BAR */}
        <div className="grid grid-cols-5 gap-1.5 p-2 sm:p-2.5 bg-slate-950/60 border-b border-slate-800 text-center">
          {[1, 2, 3, 4, 5].map((bNum) => {
            const b = bNum as 1 | 2 | 3 | 4 | 5;
            const bInfo = LEITNER_BOX_NAMES[b];
            return (
              <button
                key={b}
                type="button"
                onClick={() => {
                  setSelectedBoxFilter(selectedBoxFilter === b ? 'ALL' : b);
                  setActiveTab('tree');
                }}
                className={`p-1.5 sm:p-2 rounded-xl border text-center transition cursor-pointer ${
                  selectedBoxFilter === b
                    ? 'ring-2 ring-purple-400 ' + bInfo.color
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-bold truncate">
                  {isFa ? `جعبه ${b}` : `Box ${b}`}
                </div>
                <div className="text-xs sm:text-sm font-mono font-bold text-white">
                  {boxCounts[b]}
                </div>
                <div className="text-[9px] text-slate-400 truncate hidden sm:block">
                  {isFa ? `${LEITNER_INTERVALS[b]} روز` : `${LEITNER_INTERVALS[b]}d`}
                </div>
              </button>
            );
          })}
        </div>

        {/* TAB SWITCHER */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950/40 px-3 pt-2 text-xs font-bold flex-wrap gap-2">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('study')}
              className={`pb-2 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'study'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>{isFa ? 'مرور فعال (Study)' : 'Active Study'}</span>
              {dueCards.length > 0 && !isCramMode && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px]">
                  {dueCards.length}
                </span>
              )}
              {isCramMode && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] flex items-center gap-0.5">
                  <Zap className="w-2.5 h-2.5" />
                  <span>{isFa ? 'کرام مد' : 'Cram'}</span>
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tree')}
              className={`pb-2 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tree'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{isFa ? 'درخت موضوعی و کارت‌ها' : 'Hierarchy & Tree'}</span>
              <span className="text-[10px] text-slate-500 font-mono">({filteredCards.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('analytics')}
              className={`pb-2 px-3 sm:px-4 border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'analytics'
                  ? 'border-purple-500 text-purple-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span>{isFa ? 'آمار تسلط و پشتیبان' : 'Stats & Backup'}</span>
            </button>
          </div>

          {/* GLOBAL TOOLBAR CONTROLS */}
          <div className="flex items-center gap-1.5 pb-1 text-[11px]">
            {/* Toggle Hidden Hierarchy */}
            <button
              type="button"
              onClick={() => setShowHierarchyGlobal((prev) => !prev)}
              className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                showHierarchyGlobal
                  ? 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 font-bold'
                  : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
              title={isFa ? 'نمایش/پنهان‌سازی مسیر فولدرهای درخت دانش در کارت‌ها' : 'Toggle Knowledge Tree Breadcrumbs'}
            >
              {showHierarchyGlobal ? <FolderTree className="w-3 h-3 text-indigo-400" /> : <Folder className="w-3 h-3" />}
              <span>{isFa ? (showHierarchyGlobal ? 'پوشه‌ها: نمایان' : 'نمایش مسیر فولدر') : (showHierarchyGlobal ? 'Tree: Shown' : 'Show Folders')}</span>
            </button>

            {/* Toggle Cram Mode */}
            {activeTab === 'study' && (
              <button
                type="button"
                onClick={() => restartStudySession(!isCramMode)}
                className={`px-2.5 py-1 rounded-lg border flex items-center gap-1 transition cursor-pointer ${
                  isCramMode
                    ? 'bg-amber-500/20 text-amber-200 border-amber-500/40 font-bold'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                }`}
                title={isFa ? 'حالت جمع‌بندی فشرده قبل امتحان (بدون تغییر روزهای مرور)' : 'Cram Mode: Practice all cards'}
              >
                <Zap className="w-3 h-3 text-amber-400" />
                <span>{isFa ? (isCramMode ? '⚡ حالت فشرده (فعال)' : 'حالت جمع‌بندی') : (isCramMode ? '⚡ Cram Mode' : 'Cram Mode')}</span>
              </button>
            )}
          </div>
        </div>

        {/* TAB 1: ACTIVE STUDY SESSION */}
        {activeTab === 'study' && (
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 flex flex-col justify-between">
            {cards.length === 0 ? (
              <div className="m-auto text-center space-y-3 p-8">
                <div className="w-14 h-14 rounded-2xl bg-purple-500/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto">
                  <Sparkles className="w-7 h-7 text-amber-300" />
                </div>
                <h3 className="text-base font-bold text-white">
                  {isFa ? 'هنوز هیچ کارتی در جعبه لایتنر شما وجود ندارد.' : 'Your Leitner box is empty.'}
                </h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  {isFa
                    ? 'در ماژول‌های ۱، ۲ و ۴ متنی را هایلایت کنید یا دکمه «تولید با هوش مصنوعی» را بزنید تا کارت‌های تخصصی به لایتنر اضافه شوند.'
                    : 'Highlight any text or click "AI Studio" to create clinical flashcards.'}
                </p>
                {onOpenCreateModal && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenCreateModal();
                    }}
                    className="px-4 py-2 rounded-xl bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition shadow-md cursor-pointer"
                  >
                    {isFa ? '✨ ساخت کارت با هوش مصنوعی' : 'Create AI Flashcards'}
                  </button>
                )}
              </div>
            ) : sessionCompleted ? (
              /* SESSION FINISHED STATE */
              <div className="m-auto text-center space-y-4 p-6 sm:p-8 max-w-md bg-slate-950/70 rounded-2xl border border-purple-500/30 animate-in zoom-in-95">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mx-auto">
                  <Award className="w-8 h-8 text-emerald-400 animate-bounce" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {isFa ? '🎉 جلسه مرور لایتنر به پایان رسید!' : 'Session Complete!'}
                  </h3>
                  <p className="text-xs text-slate-300 mt-1">
                    {isFa
                      ? isCramMode
                        ? 'جلسه مرور سرعتی پایان یافت.'
                        : 'کارت‌ها بر اساس درجه پاسخ در فواصل زمانی مناسب زمان‌بندی شدند.'
                      : 'Cards updated according to spaced repetition algorithm.'}
                  </p>
                </div>

                {/* 4-GRADE STATS */}
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  <div className="p-2 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300">
                    <div className="text-base font-mono font-bold">{sessionStats.again}</div>
                    <div className="text-[10px]">{isFa ? 'ضعیف' : 'Again'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-300">
                    <div className="text-base font-mono font-bold">{sessionStats.hard}</div>
                    <div className="text-[10px]">{isFa ? 'سخت' : 'Hard'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-300">
                    <div className="text-base font-mono font-bold">{sessionStats.good}</div>
                    <div className="text-[10px]">{isFa ? 'خوب' : 'Good'}</div>
                  </div>
                  <div className="p-2 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-300">
                    <div className="text-base font-mono font-bold">{sessionStats.easy}</div>
                    <div className="text-[10px]">{isFa ? 'عالی' : 'Easy'}</div>
                  </div>
                </div>

                <div className="flex gap-2 justify-center pt-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => restartStudySession(false)}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>{isFa ? 'مرور مجدد کارت‌های امروز' : 'Review Due Cards'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => restartStudySession(true)}
                    className="px-4 py-2 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{isFa ? 'تمرین فشرده (همه کارت‌ها)' : 'Cram All'}</span>
                  </button>
                </div>
              </div>
            ) : currentStudyCard ? (
              /* ACTIVE STUDY CARD */
              <div className="space-y-3.5 max-w-2xl mx-auto w-full my-auto">
                {/* PROGRESS & HEADER */}
                <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-purple-300">
                      {isFa ? 'کارت' : 'Card'} {studyQueueIndex + 1} {isFa ? 'از' : 'of'} {studyCardsList.length}
                    </span>
                    <span>•</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10.5px]">
                      {getModuleName(currentStudyCard)}
                    </span>
                    {getTypeBadge(currentStudyCard.type)}
                  </div>

                  <span
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-md border ${
                      LEITNER_BOX_NAMES[currentStudyCard.box].color
                    }`}
                  >
                    {LEITNER_BOX_NAMES[currentStudyCard.box][isFa ? 'fa' : 'en']}
                  </span>
                </div>

                {/* THE FLASHCARD SURFACE */}
                <div
                  className={`app-card border rounded-2xl p-4 sm:p-5 transition-all duration-200 space-y-4 shadow-xl relative min-h-[300px] flex flex-col justify-between ${
                    isAnswerRevealed
                      ? 'bg-slate-900/95 border-purple-500/50 ring-1 ring-purple-500/30'
                      : 'bg-slate-900 border-slate-700 hover:border-purple-500/40'
                  }`}
                >
                  {/* CARD TOP INFO */}
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-400 border-b border-slate-800 pb-2.5 flex-wrap">
                    <div className="flex items-center gap-1.5 font-bold text-slate-300 truncate">
                      <span>{currentStudyCard.category}</span>
                      <span className="text-slate-500">/</span>
                      <span className="truncate">{currentStudyCard.topic}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Bilingual Switcher */}
                      <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-[10.5px] font-bold">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxCardLang('bilingual');
                          }}
                          className={`px-2 py-0.5 rounded transition flex items-center gap-1 cursor-pointer ${
                            boxCardLang === 'bilingual' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                          title={isFa ? 'نمایش همزمان هر دو زبان' : 'Show both Persian & English'}
                        >
                          <span>🌐</span>
                          <span>{isFa ? 'دوزبانه' : 'Dual'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxCardLang('fa');
                          }}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                            boxCardLang === 'fa' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          FA
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setBoxCardLang('en');
                          }}
                          className={`px-1.5 py-0.5 rounded transition cursor-pointer ${
                            boxCardLang === 'en' ? 'bg-purple-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          EN
                        </button>
                      </div>

                      {/* HIDDEN HIERARCHY TOGGLE PER CARD */}
                      {currentStudyCard.knowledgeTree && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowHierarchyCard((prev) => ({
                              ...prev,
                              [currentStudyCard.id]: !prev[currentStudyCard.id],
                            }));
                          }}
                          className="text-[11px] px-2 py-0.5 rounded-md bg-indigo-950/60 hover:bg-indigo-900/80 text-indigo-300 border border-indigo-500/30 flex items-center gap-1 transition cursor-pointer"
                          title={isFa ? 'نمایش مسیر دسته‌بندی و درخت دانش' : 'Toggle Knowledge Tree'}
                        >
                          <FolderTree className="w-3 h-3 text-indigo-400" />
                          <span>
                            {showHierarchyGlobal || showHierarchyCard[currentStudyCard.id]
                              ? isFa ? 'بستن فولدر' : 'Hide Tree'
                              : isFa ? 'نمایش فولدر' : 'Folder Path'}
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* KNOWLEDGE TREE HIERARCHY (HIDDEN BY DEFAULT, SHOWN ON DEMAND) */}
                  {(showHierarchyGlobal || showHierarchyCard[currentStudyCard.id]) && currentStudyCard.knowledgeTree && (
                    <div className="text-[11px] p-2.5 rounded-xl bg-indigo-950/50 border border-indigo-500/30 space-y-1 text-indigo-200 animate-in fade-in duration-150">
                      <div className="text-[10px] font-bold text-indigo-300 flex items-center gap-1">
                        <FolderTree className="w-3 h-3 text-indigo-400" />
                        <span>{isFa ? 'مسیر کامل درخت دانش (۴ لایه):' : 'Knowledge Hierarchy Path:'}</span>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap font-medium">
                        {currentStudyCard.knowledgeTree.domain && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-200 border border-purple-500/30">
                            {isFa ? currentStudyCard.knowledgeTree.domain.fa : currentStudyCard.knowledgeTree.domain.en}
                          </span>
                        )}
                        <span className="text-slate-500">›</span>
                        {currentStudyCard.knowledgeTree.system && (
                          <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-200 border border-blue-500/30">
                            {isFa ? currentStudyCard.knowledgeTree.system.fa : currentStudyCard.knowledgeTree.system.en}
                          </span>
                        )}
                        <span className="text-slate-500">›</span>
                        {currentStudyCard.knowledgeTree.subsystem && (
                          <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
                            {isFa ? currentStudyCard.knowledgeTree.subsystem.fa : currentStudyCard.knowledgeTree.subsystem.en}
                          </span>
                        )}
                        {currentStudyCard.knowledgeTree.microTopic && (
                          <>
                            <span className="text-slate-500">›</span>
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                              {isFa ? currentStudyCard.knowledgeTree.microTopic.fa : currentStudyCard.knowledgeTree.microTopic.en}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* QUESTION (FRONT) */}
                  {(() => {
                    const qFa = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.fa || currentStudyCard.question.en : currentStudyCard.question;
                    const qEn = typeof currentStudyCard.question === 'object' ? currentStudyCard.question.en || currentStudyCard.question.fa : currentStudyCard.question;

                    return (
                      <div className="space-y-2 py-1">
                        <div className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                          <HelpCircle className="w-4 h-4 text-amber-400" />
                          <span>{isFa ? 'پرسش بالینی / سناریوی آزمون:' : 'Clinical Question / Scenario:'}</span>
                        </div>
                        
                        {boxCardLang === 'bilingual' ? (
                          <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800">
                            {qFa && (
                              <div className="text-sm sm:text-base text-white leading-relaxed font-bold" dir="rtl">
                                <span className="text-[10px] text-amber-400 font-mono font-bold ml-1.5 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">FA</span>
                                {qFa}
                              </div>
                            )}
                            {qEn && (
                              <div className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed border-t border-slate-800 pt-2 font-sans" dir="ltr">
                                <span className="text-[10px] text-sky-400 font-mono font-bold mr-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">EN</span>
                                {qEn}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm sm:text-base text-white leading-relaxed font-semibold">
                            {boxCardLang === 'fa' ? qFa : qEn}
                          </p>
                        )}
                      </div>
                    );
                  })()}

                  {/* SPECIALIZED RENDER: MCQ OPTIONS (IF MCQ TYPE) */}
                  {currentStudyCard.type === 'mcq' && currentStudyCard.mcqOptions && currentStudyCard.mcqOptions.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[11px] font-bold text-slate-400 block">
                        {isFa ? 'گزینه‌ها (روی گزینه کلیک کنید):' : 'Options (Click to choose):'}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        {currentStudyCard.mcqOptions.map((opt, oIdx) => {
                          const optLetter = String.fromCharCode(65 + oIdx);
                          const isSelected = selectedMcqOption === opt.id;
                          const optFa = opt.text?.fa || opt.text?.en || '';
                          const optEn = opt.text?.en || opt.text?.fa || '';
                          let optStyle = 'bg-slate-800/80 border-slate-700 text-slate-200 hover:bg-slate-800';

                          if (isAnswerRevealed) {
                            if (opt.isCorrect) {
                              optStyle = 'bg-emerald-950/70 border-emerald-500 text-emerald-200 ring-1 ring-emerald-500 font-bold';
                            } else if (isSelected && !opt.isCorrect) {
                              optStyle = 'bg-rose-950/70 border-rose-500 text-rose-200 ring-1 ring-rose-500 line-through';
                            }
                          } else if (isSelected) {
                            optStyle = 'bg-purple-900/60 border-purple-500 text-purple-200 ring-1 ring-purple-500 font-bold';
                          }

                          return (
                            <button
                              key={opt.id || oIdx}
                              type="button"
                              onClick={() => {
                                setSelectedMcqOption(opt.id);
                                if (!isAnswerRevealed) setIsAnswerRevealed(true);
                              }}
                              className={`p-2.5 rounded-xl border text-start transition cursor-pointer flex items-start gap-2 ${optStyle}`}
                            >
                              <span className="w-5 h-5 rounded-full bg-black/40 border border-white/20 flex items-center justify-center font-bold text-[11px] shrink-0 mt-0.5">
                                {optLetter}
                              </span>
                              <div className="leading-relaxed flex-1 space-y-1">
                                {boxCardLang === 'bilingual' ? (
                                  <>
                                    {optFa && <div dir="rtl">{optFa}</div>}
                                    {optEn && <div className="text-[11px] text-slate-300 font-sans opacity-90 border-t border-slate-700/60 pt-1" dir="ltr">{optEn}</div>}
                                  </>
                                ) : (
                                  <div>{boxCardLang === 'fa' ? optFa : optEn}</div>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* SPECIALIZED RENDER: CAL LABELS (IF CAL TYPE) */}
                  {currentStudyCard.type === 'cal_warning' && currentStudyCard.calLabels && currentStudyCard.calLabels.length > 0 && (
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      <span className="text-[11px] font-bold text-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                        <span>{isFa ? 'برچسب‌های استرالیایی CAL:' : 'Australian CAL Labels:'}</span>
                      </span>
                      {currentStudyCard.calLabels.map((lbl, lIdx) => (
                        <span
                          key={lIdx}
                          className="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-200 border border-amber-500/50 font-bold text-xs shadow-sm"
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

                  {/* SPECIALIZED RENDER: CALCULATION FORMULA */}
                  {currentStudyCard.type === 'calculation' && currentStudyCard.calculationFormula && (
                    <div className="p-2.5 rounded-lg bg-cyan-950/40 border border-cyan-500/30 text-cyan-200 text-xs font-mono">
                      <span className="font-bold text-cyan-300 block text-[10.5px] mb-0.5">
                        {isFa ? 'فرمول و متغیرها:' : 'Formula & Method:'}
                      </span>
                      <span>
                        {isFa
                          ? currentStudyCard.calculationFormula.fa || currentStudyCard.calculationFormula.en
                          : currentStudyCard.calculationFormula.en || currentStudyCard.calculationFormula.fa}
                      </span>
                    </div>
                  )}

                  {/* ANSWER (BACK) */}
                  {isAnswerRevealed ? (
                    <div className="space-y-3 pt-3 border-t border-slate-800 animate-in fade-in duration-150">
                      {(() => {
                        const aFa = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.fa || currentStudyCard.answer.en : currentStudyCard.answer;
                        const aEn = typeof currentStudyCard.answer === 'object' ? currentStudyCard.answer.en || currentStudyCard.answer.fa : currentStudyCard.answer;
                        return (
                          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-emerald-500/30 space-y-1.5">
                            <div className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                              <span>{isFa ? 'پاسخ و تحلیل بالینی جامع:' : 'Clinical Rationale & Answer:'}</span>
                            </div>
                            {boxCardLang === 'bilingual' ? (
                              <div className="space-y-2">
                                {aFa && (
                                  <div className="text-xs sm:text-sm text-slate-100 leading-relaxed" dir="rtl">
                                    <span className="text-[10px] text-emerald-400 font-mono font-bold ml-1.5 px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">FA</span>
                                    {aFa}
                                  </div>
                                )}
                                {aEn && (
                                  <div className="text-xs sm:text-sm text-slate-300 font-sans leading-relaxed border-t border-slate-800 pt-2" dir="ltr">
                                    <span className="text-[10px] text-sky-400 font-mono font-bold mr-1.5 px-1.5 py-0.5 rounded bg-sky-500/10 border border-sky-500/20">EN</span>
                                    {aEn}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                {boxCardLang === 'fa' ? aFa : aEn}
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      {/* DISTRACTOR RATIONALE FOR MCQ */}
                      {currentStudyCard.distractorRationale && (
                        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-300 text-xs space-y-1">
                          <span className="font-bold text-rose-300 text-[11px] block">
                            {isFa ? 'چرا سایر گزینه‌ها نادرست هستند (دام‌های تستی):' : 'Distractor Analysis (Exam Traps):'}
                          </span>
                          {boxCardLang === 'bilingual' ? (
                            <div className="space-y-1">
                              {currentStudyCard.distractorRationale.fa && (
                                <p dir="rtl" className="text-slate-200">{currentStudyCard.distractorRationale.fa}</p>
                              )}
                              {currentStudyCard.distractorRationale.en && (
                                <p dir="ltr" className="text-slate-300 font-sans text-[11px] border-t border-rose-900/40 pt-1">{currentStudyCard.distractorRationale.en}</p>
                              )}
                            </div>
                          ) : (
                            <p className="leading-relaxed text-[11.5px]">
                              {boxCardLang === 'fa'
                                ? currentStudyCard.distractorRationale.fa || currentStudyCard.distractorRationale.en
                                : currentStudyCard.distractorRationale.en || currentStudyCard.distractorRationale.fa}
                            </p>
                          )}
                        </div>
                      )}

                      {/* HIGH-YIELD PEARL */}
                      {(currentStudyCard.pearl?.fa || currentStudyCard.pearl?.en || typeof currentStudyCard.pearl === 'string') && (
                        <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2">
                          <Sparkles className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                          <div className="leading-relaxed flex-1 space-y-1">
                            <span className="font-bold text-amber-300">
                              {isFa ? 'نکته طلایی فارماکولوژی: ' : 'High-Yield Pearl: '}
                            </span>
                            {boxCardLang === 'bilingual' ? (
                              <div className="space-y-1">
                                {currentStudyCard.pearl?.fa && <div dir="rtl">{currentStudyCard.pearl.fa}</div>}
                                {currentStudyCard.pearl?.en && <div dir="ltr" className="text-slate-300 font-sans text-xs border-t border-purple-900/40 pt-1">{currentStudyCard.pearl.en}</div>}
                              </div>
                            ) : (
                              <span>{getPearlText(currentStudyCard)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsAnswerRevealed(true)}
                      className="w-full py-3 rounded-xl bg-slate-800/80 hover:bg-purple-900/40 border border-purple-500/30 text-xs text-purple-300 font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isFa ? '👆 برای مشاهده پاسخ و تحلیل کلیک کنید' : '👆 Click to Reveal Rationale'}</span>
                    </button>
                  )}

                  {/* BOTTOM INTERVAL INDICATION */}
                  <div className="text-[10.5px] text-slate-500 text-end pt-1 flex items-center justify-between">
                    <span>
                      {isFa
                        ? `دفعات مرور: ${currentStudyCard.reviewCount || 0} بار`
                        : `Reviewed: ${currentStudyCard.reviewCount || 0} times`}
                    </span>
                    {isCramMode && (
                      <span className="text-amber-400 font-bold">
                        {isFa ? '⚡ حالت تمرین فشرده' : '⚡ Cram Practice'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 4-GRADE SM-2 RESPONSE BUTTONS */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                  {/* AGAIN */}
                  <button
                    type="button"
                    onClick={() => handleGradeAnswer('again')}
                    className="py-2.5 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-rose-300 font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>{isFa ? 'ضعیف / فراموشی' : 'Again'}</span>
                    </div>
                    <div className="text-[10px] text-rose-400/80 font-normal">
                      {isFa ? 'جعبه ۱ (فردا)' : 'Box 1 (1d)'}
                    </div>
                  </button>

                  {/* HARD */}
                  <button
                    type="button"
                    onClick={() => handleGradeAnswer('hard')}
                    className="py-2.5 px-3 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-1">
                      <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isFa ? 'سخت بود' : 'Hard'}</span>
                    </div>
                    <div className="text-[10px] text-amber-400/80 font-normal">
                      {isFa ? 'تکرار زودتر' : 'Repeat soon'}
                    </div>
                  </button>

                  {/* GOOD */}
                  <button
                    type="button"
                    onClick={() => handleGradeAnswer('good')}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>{isFa ? 'خوب بود' : 'Good'}</span>
                    </div>
                    <div className="text-[10px] text-emerald-400/80 font-normal">
                      {isFa ? `ارتقا به جعبه ${Math.min(5, currentStudyCard.box + 1)}` : `Box +1`}
                    </div>
                  </button>

                  {/* EASY */}
                  <button
                    type="button"
                    onClick={() => handleGradeAnswer('easy')}
                    className="py-2.5 px-3 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/40 text-sky-300 font-bold text-xs transition flex flex-col items-center justify-center gap-0.5 cursor-pointer shadow-md hover:scale-[1.02]"
                  >
                    <div className="flex items-center gap-1">
                      <Zap className="w-3.5 h-3.5 text-sky-400" />
                      <span>{isFa ? 'آسان و مسلط' : 'Easy'}</span>
                    </div>
                    <div className="text-[10px] text-sky-400/80 font-normal">
                      {isFa ? 'ارتقای سریع (+۲)' : 'Box +2'}
                    </div>
                  </button>
                </div>
              </div>
            ) : (
              /* NO CARDS AVAILABLE FALLBACK */
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 my-auto">
                <div className="w-16 h-16 rounded-full bg-slate-800/60 border border-slate-700 flex items-center justify-center mb-4">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-base font-bold app-text mb-1.5">
                  {isFa ? 'هیچ کارتی برای مرور وجود ندارد' : 'No Cards Due for Review'}
                </h3>
                <p className="text-xs app-muted max-w-sm mb-4">
                  {isFa
                    ? 'در حال حاضر کارتی برای مرور در صف نیست. می‌توانید کارت‌های جدید اضافه کنید یا تمرین فشرده را شروع کنید.'
                    : 'There are no cards currently due. You can add new cards or start a cram session to review all cards.'}
                </p>
                <button
                  type="button"
                  onClick={() => restartStudySession(true)}
                  className="px-4 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isFa ? 'تمرین فشرده (همه کارت‌ها)' : 'Cram All Cards'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: HIERARCHICAL TREE VIEW & MANAGEMENT */}
        {activeTab === 'tree' && (
          <div className="flex-1 flex flex-col sm:flex-row overflow-hidden">
            {/* LEFT FILTER & FOLDER SIDEBAR */}
            <div className="w-full sm:w-72 border-b sm:border-b-0 sm:border-r border-slate-800 bg-slate-950/70 p-3 space-y-3 overflow-y-auto">
              {/* SEARCH */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute right-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isFa ? 'جستجو در کارت‌ها و پوشه‌ها...' : 'Search cards & topics...'}
                  className="w-full pl-2 pr-8 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                />
              </div>

              {/* CARD TYPE FILTER */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  {isFa ? 'فیلتر بر اساس نوع کارت:' : 'Card Type Filter:'}
                </span>
                <select
                  value={selectedTypeFilter}
                  onChange={(e) => setSelectedTypeFilter(e.target.value as any)}
                  className="w-full p-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-purple-500"
                >
                  <option value="ALL">{isFa ? 'همه فرمت‌های کارت' : 'All Card Types'}</option>
                  <option value="mcq">{isFa ? '📝 تست چهارگزینه‌ای (MCQ)' : '📝 Multiple-choice question'}</option>
                  <option value="triage_redflag">{isFa ? '🚨 تریاژ رد فلگ (Red Flags)' : '🚨 OTC Red Flag'}</option>
                  <option value="calculation">{isFa ? '🧮 محاسبات دوزاژ (Calculation)' : '🧮 Dosage Calculation'}</option>
                  <option value="cal_warning">{isFa ? '⚠️ برچسب‌های احتیاطی CAL' : '⚠️ Australian CAL'}</option>
                  <option value="interaction">{isFa ? '⚡ تداخلات دارویی' : '⚡ Drug Interactions'}</option>
                  <option value="conversation">{isFa ? '💬 دیالوگ بیمار' : '💬 Patient Dialogue'}</option>
                  <option value="clinical_pearl">{isFa ? '💎 نکته طلایی فارماکولوژی' : '💎 Clinical Pearl'}</option>
                </select>
              </div>

              {/* MODULE FILTER */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-400 block px-1">
                  {isFa ? 'ماژول‌های آموزشی:' : 'Modules:'}
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-1 gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter('ALL')}
                    className={`px-2.5 py-1.5 rounded-lg text-start transition flex items-center justify-between cursor-pointer ${
                      selectedModuleFilter === 'ALL'
                        ? 'bg-purple-600/30 text-purple-200 font-bold border border-purple-500/40'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{isFa ? 'همه ماژول‌ها' : 'All Modules'}</span>
                    <span className="text-[10px] font-mono">{cards.length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter(1)}
                    className={`px-2.5 py-1.5 rounded-lg text-start transition flex items-center justify-between cursor-pointer ${
                      selectedModuleFilter === 1
                        ? 'bg-emerald-600/30 text-emerald-200 font-bold border border-emerald-500/40'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{isFa ? 'ماژول ۱: تریاژ و مکالمه' : 'Mod 1: Triage'}</span>
                    <span className="text-[10px] font-mono">{cards.filter((c) => c.module === 1).length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter(2)}
                    className={`px-2.5 py-1.5 rounded-lg text-start transition flex items-center justify-between cursor-pointer ${
                      selectedModuleFilter === 2
                        ? 'bg-amber-600/30 text-amber-200 font-bold border border-amber-500/40'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{isFa ? 'ماژول ۲: قفسه دارو' : 'Mod 2: Drug Shelf'}</span>
                    <span className="text-[10px] font-mono">{cards.filter((c) => c.module === 2).length}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedModuleFilter(4)}
                    className={`px-2.5 py-1.5 rounded-lg text-start transition flex items-center justify-between cursor-pointer ${
                      selectedModuleFilter === 4
                        ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40'
                        : 'text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <span>{isFa ? 'ماژول ۴: بانک بالینی' : 'Mod 4: Clinical'}</span>
                    <span className="text-[10px] font-mono">{cards.filter((c) => c.module === 4).length}</span>
                  </button>
                </div>
              </div>

              {/* HIERARCHICAL FOLDERS TREE */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                    <FolderTree className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{isFa ? 'پوشه‌های درختی دانش:' : 'Knowledge Folders:'}</span>
                  </span>
                  {(selectedDomainFilter !== 'ALL' || selectedSystemFilter !== 'ALL' || selectedSubsystemFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDomainFilter('ALL');
                        setSelectedSystemFilter('ALL');
                        setSelectedSubsystemFilter('ALL');
                      }}
                      className="text-[10px] text-purple-400 hover:text-purple-300 underline"
                    >
                      {isFa ? 'حذف فیلتر' : 'Reset'}
                    </button>
                  )}
                </div>

                <div className="space-y-1 text-xs max-h-56 overflow-y-auto">
                  {Object.entries(hierarchyTreeData).map(([domainName, dData]) => {
                    const isDomainOpen = expandedFolders[domainName];
                    const isDomainSelected = selectedDomainFilter === domainName;

                    return (
                      <div key={domainName} className="space-y-0.5">
                        <div
                          className={`px-2 py-1 rounded-lg flex items-center justify-between transition cursor-pointer ${
                            isDomainSelected
                              ? 'bg-indigo-600/30 text-indigo-200 font-bold border border-indigo-500/40'
                              : 'text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <div
                            className="flex items-center gap-1.5 flex-1 truncate"
                            onClick={() => {
                              setSelectedDomainFilter(isDomainSelected ? 'ALL' : domainName);
                              setSelectedSystemFilter('ALL');
                              setSelectedSubsystemFilter('ALL');
                            }}
                          >
                            <Folder className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <span className="truncate">{domainName}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] font-mono text-slate-400">{dData.count}</span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFolder(domainName);
                              }}
                              className="p-0.5 hover:bg-slate-700 rounded text-slate-400"
                            >
                              {isDomainOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>

                        {/* SYSTEMS UNDER DOMAIN */}
                        {isDomainOpen && (
                          <div className="pl-4 pr-1 space-y-0.5 border-l border-indigo-500/20 ml-2">
                            {Object.entries(dData.systems).map(([sysName, sData]) => {
                              const sysKey = `${domainName}-${sysName}`;
                              const isSysOpen = expandedFolders[sysKey];
                              const isSysSelected = selectedSystemFilter === sysName;

                              return (
                                <div key={sysName} className="space-y-0.5">
                                  <div
                                    className={`px-2 py-0.5 rounded flex items-center justify-between transition cursor-pointer ${
                                      isSysSelected
                                        ? 'bg-blue-600/30 text-blue-200 font-bold'
                                        : 'text-slate-400 hover:bg-slate-800'
                                    }`}
                                  >
                                    <div
                                      className="flex items-center gap-1 flex-1 truncate text-[11px]"
                                      onClick={() => {
                                        setSelectedDomainFilter(domainName);
                                        setSelectedSystemFilter(isSysSelected ? 'ALL' : sysName);
                                        setSelectedSubsystemFilter('ALL');
                                      }}
                                    >
                                      <Folder className="w-3 h-3 text-blue-400 shrink-0" />
                                      <span className="truncate">{sysName}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-[9.5px] font-mono text-slate-400">{sData.count}</span>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleFolder(sysKey);
                                        }}
                                        className="p-0.5 hover:bg-slate-700 rounded text-slate-400"
                                      >
                                        {isSysOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                      </button>
                                    </div>
                                  </div>

                                  {/* SUBSYSTEMS */}
                                  {isSysOpen && (
                                    <div className="pl-3 pr-1 space-y-0.5 border-l border-blue-500/20 ml-1 text-[10.5px]">
                                      {Object.entries(sData.subsystems).map(([subName, subCount]) => (
                                        <div
                                          key={subName}
                                          onClick={() => {
                                            setSelectedDomainFilter(domainName);
                                            setSelectedSystemFilter(sysName);
                                            setSelectedSubsystemFilter(
                                              selectedSubsystemFilter === subName ? 'ALL' : subName
                                            );
                                          }}
                                          className={`px-2 py-0.5 rounded flex items-center justify-between cursor-pointer ${
                                            selectedSubsystemFilter === subName
                                              ? 'bg-emerald-600/30 text-emerald-200 font-bold'
                                              : 'text-slate-500 hover:text-slate-300'
                                          }`}
                                        >
                                          <span className="truncate">{subName}</span>
                                          <span className="font-mono text-[9px]">{subCount}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* RIGHT CARD LIST */}
            <div className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3">
              {/* LIST HEADER ACTIONS */}
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-2">
                <span>
                  {isFa
                    ? `${filteredCards.length} کارت مطابق فیلتر یافت شد`
                    : `${filteredCards.length} cards matching filter`}
                </span>
                {filteredCards.length > 0 && (
                  <button
                    type="button"
                    onClick={() => restartStudySession(true)}
                    className="px-3 py-1 rounded-lg bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition"
                  >
                    <Play className="w-3 h-3" />
                    <span>{isFa ? 'مرور همین دسته‌بندی (Cram)' : 'Study Filtered Set'}</span>
                  </button>
                )}
              </div>

              {filteredCards.length === 0 ? (
                <div className="text-center p-8 text-slate-400 text-xs">
                  {isFa ? 'هیچ کارتی با فیلترهای انتخابی یافت نشد.' : 'No cards found matching active filters.'}
                </div>
              ) : (
                filteredCards.map((card) => (
                  <div
                    key={card.id}
                    className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:border-slate-700 transition space-y-2 relative"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap text-xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            LEITNER_BOX_NAMES[card.box].color
                          }`}
                        >
                          {LEITNER_BOX_NAMES[card.box][isFa ? 'fa' : 'en']}
                        </span>
                        {getTypeBadge(card.type)}
                        <span className="text-slate-400 font-mono text-[11px]">
                          {card.category} • {card.topic}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        {card.knowledgeTree && (
                          <button
                            type="button"
                            onClick={() =>
                              setShowHierarchyCard((prev) => ({
                                ...prev,
                                [card.id]: !prev[card.id],
                              }))
                            }
                            className="p-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 text-[10px] transition cursor-pointer"
                            title={isFa ? 'نمایش مسیر درخت موضوعی' : 'Toggle Tree Path'}
                          >
                            <FolderTree className="w-3 h-3" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleResetCardBox(card.id)}
                          className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition cursor-pointer"
                          title={isFa ? 'بازنشانی به جعبه ۱' : 'Reset to Box 1'}
                        >
                          <RotateCw className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCard(card.id)}
                          className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-[10px] transition cursor-pointer"
                          title={isFa ? 'حذف کارت' : 'Delete Card'}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* QUESTION & ANSWER */}
                    <div className="space-y-1.5">
                      <p className="text-xs sm:text-sm font-bold text-slate-100 leading-snug">
                        {getQuestionText(card)}
                      </p>
                      <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/50 p-2 rounded-lg border border-slate-800/80">
                        {getAnswerText(card)}
                      </p>
                    </div>

                    {/* KNOWLEDGE TREE TAG IN LIST (COLLAPSIBLE / ON DEMAND) */}
                    {(showHierarchyGlobal || showHierarchyCard[card.id]) && card.knowledgeTree && (
                      <div className="text-[10px] p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-indigo-200 flex items-center gap-1 font-mono flex-wrap animate-in fade-in">
                        <FolderTree className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span>
                          {[
                            card.knowledgeTree.domain?.[isFa ? 'fa' : 'en'],
                            card.knowledgeTree.system?.[isFa ? 'fa' : 'en'],
                            card.knowledgeTree.subsystem?.[isFa ? 'fa' : 'en'],
                            card.knowledgeTree.microTopic?.[isFa ? 'fa' : 'en'],
                          ]
                            .filter(Boolean)
                            .join(' › ')}
                        </span>
                      </div>
                    )}

                    {getPearlText(card) && (
                      <div className="text-[11px] text-purple-300 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />
                        <span className="truncate">{getPearlText(card)}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: ANALYTICS, MASTERY & BACKUP */}
        {activeTab === 'analytics' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
            {/* MASTERY OVERVIEW HERO */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-4 rounded-2xl bg-linear-to-br from-purple-950/60 to-slate-900 border border-purple-500/30 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300">
                  <Award className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-white">{masteryPercentage}٪</div>
                  <div className="text-xs text-purple-300 font-medium">
                    {isFa ? 'میزان تسلط کلی (جعبه ۴ و ۵)' : 'Mastery Score'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-br from-emerald-950/60 to-slate-900 border border-emerald-500/30 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-300">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-white">{boxCounts[5]}</div>
                  <div className="text-xs text-emerald-300 font-medium">
                    {isFa ? 'کارت‌های کاملاً تثبیت‌شده (جعبه ۵)' : 'Mastered Cards'}
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-linear-to-br from-rose-950/60 to-slate-900 border border-rose-500/30 flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-300">
                  <Calendar className="w-6 h-6 text-rose-400" />
                </div>
                <div>
                  <div className="text-2xl font-black font-mono text-white">{dueCards.length}</div>
                  <div className="text-xs text-rose-300 font-medium">
                    {isFa ? 'کارت‌های موعد مرور امروز' : 'Due for Review Today'}
                  </div>
                </div>
              </div>
            </div>

            {/* BOX DISTRIBUTION */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>{isFa ? 'توزیع کارت‌ها در ۵ سطح لایتنر:' : 'Leitner 5-Box Distribution:'}</span>
              </h3>

              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((bNum) => {
                  const b = bNum as 1 | 2 | 3 | 4 | 5;
                  const count = boxCounts[b];
                  const pct = cards.length > 0 ? Math.round((count / cards.length) * 100) : 0;
                  const bInfo = LEITNER_BOX_NAMES[b];

                  return (
                    <div key={b} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">
                          {bInfo[isFa ? 'fa' : 'en']}
                        </span>
                        <span className="font-mono text-slate-400">
                          {count} {isFa ? 'کارت' : 'cards'} ({pct}٪)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 ${
                            b === 1
                              ? 'bg-rose-500'
                              : b === 2
                              ? 'bg-amber-500'
                              : b === 3
                              ? 'bg-sky-500'
                              : b === 4
                              ? 'bg-indigo-500'
                              : 'bg-emerald-500'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* DATA BACKUP & EXPORT/IMPORT */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <span>{isFa ? 'پشتیبان‌گیری و انتقال کارت‌ها:' : 'Backup & Export/Import Flashcards:'}</span>
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                {isFa
                  ? 'می‌توانید تمامی کارت‌های لایتنر و ساختار درختی آن‌ها را در قالب فایل JSON ذخیره کرده و در هر زمان یا دستگاه دیگر بازیابی کنید.'
                  : 'Export all your flashcards and 4-tier knowledge trees as JSON backup or restore them anytime.'}
              </p>

              <div className="flex items-center gap-3 flex-wrap pt-1">
                <button
                  type="button"
                  disabled={cards.length === 0}
                  onClick={handleExportJson}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
                >
                  <Download className="w-4 h-4" />
                  <span>{isFa ? 'دانلود پشتیبان JSON' : 'Export JSON Backup'}</span>
                </button>

                <label className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700">
                  <Upload className="w-4 h-4 text-purple-400" />
                  <span>{isFa ? 'بارگذاری فایل پشتیبان JSON' : 'Import JSON Backup'}</span>
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
          </div>
        )}

        {/* MODAL FOOTER */}
        <div className="p-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 bg-slate-950/80">
          <span>
            {isFa
              ? `مجموع: ${cards.length} کارت | آماده مرور: ${dueCards.length}`
              : `Total: ${cards.length} cards | Due: ${dueCards.length}`}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
