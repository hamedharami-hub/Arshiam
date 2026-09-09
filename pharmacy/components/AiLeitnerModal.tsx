'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Language } from '@/types/pharmacy';
import {
  CandidateCard,
  LeitnerCard,
  KnowledgeTreeItem,
  FlashcardGenerationMode,
  McqOption,
} from '@/types/leitner';
import { getClientAiConfig } from '@/lib/aiConfigStorage';
import { getAiRequestHeaders } from '@/lib/aiClient';
import {
  Sparkles,
  X,
  Bot,
  PenTool,
  CheckSquare,
  Square,
  Plus,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldAlert,
  Tag,
  BookOpen,
  ArrowRight,
  ClipboardPaste,
  Calculator,
  ListChecks,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
  Pencil,
  Eye,
  FileText,
  Layers,
} from 'lucide-react';

interface AiLeitnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  initialText: string;
  initialModule?: 1 | 2 | 3 | 4;
  initialCategory?: string;
  initialTopic?: string;
  initialTab?: 'ai' | 'manual';
  userId?: string;
  onAddCardsToLeitner: (newCards: LeitnerCard[]) => void;
  onOpenLeitnerBox?: () => void;
}

interface AiLeitnerModalInnerProps {
  onClose: () => void;
  language: Language;
  initialText: string;
  initialModule?: 1 | 2 | 3 | 4;
  initialCategory?: string;
  initialTopic?: string;
  initialTab?: 'ai' | 'manual';
  userId?: string;
  onAddCardsToLeitner: (newCards: LeitnerCard[]) => void;
  onOpenLeitnerBox?: () => void;
}

const AiLeitnerModalContent: React.FC<AiLeitnerModalInnerProps> = ({
  onClose,
  language,
  initialText,
  initialModule = 4,
  initialCategory = 'Clinical Knowledge',
  initialTopic = 'Pharmacy Topic',
  initialTab = 'ai',
  userId = 'guest',
  onAddCardsToLeitner,
  onOpenLeitnerBox,
}) => {
  const isFa = language === 'fa';

  // Active Tab: 'ai' (Online AI Generation) or 'manual' (Manual Card Creation)
  const [activeTab, setActiveTab] = useState<'ai' | 'manual'>(initialTab);

  // Common metadata state
  const [selectedModule, setSelectedModule] = useState<1 | 2 | 3 | 4>(initialModule);
  const [category, setCategory] = useState(initialCategory || 'Clinical Knowledge');
  const [topic, setTopic] = useState(initialTopic || 'Pharmacy Topic');
  const [snippetText, setSnippetText] = useState(initialText);

  // AI Tab specific state
  const [generationMode, setGenerationMode] = useState<FlashcardGenerationMode>('auto');
  const [customPrompt, setCustomPrompt] = useState('');
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [candidateCards, setCandidateCards] = useState<CandidateCard[]>([]);
  const [previewLang, setPreviewLang] = useState<'bilingual' | 'fa' | 'en'>('bilingual');

  // Manual Tab specific state
  const [manualType, setManualType] = useState<
    'clinical_pearl' | 'mcq' | 'cal_warning' | 'triage_redflag' | 'calculation'
  >('clinical_pearl');
  const [manualQuestionFa, setManualQuestionFa] = useState('');
  const [manualQuestionEn, setManualQuestionEn] = useState('');
  const [manualAnswerFa, setManualAnswerFa] = useState('');
  const [manualAnswerEn, setManualAnswerEn] = useState('');
  const [manualPearlFa, setManualPearlFa] = useState('');
  const [manualPearlEn, setManualPearlEn] = useState('');
  const [manualCalLabels, setManualCalLabels] = useState('');
  const [manualMcqOptions, setManualMcqOptions] = useState<
    Array<{ id: string; textFa: string; textEn: string; isCorrect: boolean; explanationFa?: string }>
  >([
    { id: 'A', textFa: '', textEn: '', isCorrect: true, explanationFa: '' },
    { id: 'B', textFa: '', textEn: '', isCorrect: false, explanationFa: '' },
    { id: 'C', textFa: '', textEn: '', isCorrect: false, explanationFa: '' },
    { id: 'D', textFa: '', textEn: '', isCorrect: false, explanationFa: '' },
  ]);

  const [successSavedCount, setSuccessSavedCount] = useState<number | null>(null);

  // Online AI Flashcard Generation handler
  const handleGenerateCards = useCallback(
    async (
      textToUse: string,
      mod: 1 | 2 | 3 | 4,
      cat: string,
      top: string,
      prompt: string,
      mode: FlashcardGenerationMode
    ) => {
      if (!textToUse || !textToUse.trim()) {
        setErrorMsg(isFa ? 'لطفاً متن یا مبحثی برای تولید کارت وارد کنید.' : 'Please enter context or text.');
        return;
      }

      setIsGenerating(true);
      setErrorMsg(null);
      setSuccessSavedCount(null);

      try {
        const aiCfg = getClientAiConfig();
        const activeModel = aiCfg.flashcardModel || 'gemini-2.5-flash';
        let activeProvider = aiCfg.preferredProvider || 'gemini';

        if (
          activeModel.startsWith('llama') ||
          activeModel.startsWith('deepseek') ||
          activeModel.startsWith('qwen') ||
          activeModel.startsWith('mixtral')
        ) {
          activeProvider = 'groq';
        } else if (activeModel.startsWith('grok')) {
          activeProvider = 'xai';
        }

        const customKey =
          activeProvider === 'groq'
            ? aiCfg.groqApiKey
            : activeProvider === 'xai'
            ? aiCfg.xaiApiKey
            : aiCfg.geminiApiKey;

        const res = await fetch('/api/gemini/generate-flashcards', {
          method: 'POST',
          headers: await getAiRequestHeaders(),
          body: JSON.stringify({
            contextSnippet: textToUse,
            moduleNumber: mod,
            category: cat,
            topic: top,
            customPrompt: prompt,
            generationMode: mode,
            language,
            provider: activeProvider,
            model: activeModel,
            apiKey: customKey || undefined,
            temperature: aiCfg.temperature ?? 0.2,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error || 'Failed to generate flashcards');
        }

        const rawCards = data.cards || [];

        if (Array.isArray(rawCards) && rawCards.length > 0) {
          const mappedCards: CandidateCard[] = rawCards.map((c: any, idx: number) => {
            const rawTree = c.knowledgeTree;
            const ktDomainFa = rawTree?.domain?.fa || c.category || cat;
            const ktDomainEn = rawTree?.domain?.en || c.category || cat;
            const ktSystemFa = rawTree?.system?.fa || c.topic || top;
            const ktSystemEn = rawTree?.system?.en || c.topic || top;
            const ktSubsystemFa = rawTree?.subsystem?.fa || (c.type ? String(c.type).replace('_', ' ') : 'نکات درمانی');
            const ktSubsystemEn = rawTree?.subsystem?.en || (c.type ? String(c.type).replace('_', ' ') : 'Clinical Pearls');
            const ktMicroTopicFa = rawTree?.microTopic?.fa || (typeof c.pearl === 'object' ? c.pearl?.fa : '') || 'مفهوم آزمون';
            const ktMicroTopicEn = rawTree?.microTopic?.en || (typeof c.pearl === 'object' ? c.pearl?.en : '') || 'Exam Node';

            const ktPathFa = Array.isArray(rawTree?.path?.fa) && rawTree.path.fa.length > 0
              ? rawTree.path.fa
              : [ktDomainFa, ktSystemFa, ktSubsystemFa, ktMicroTopicFa].filter(Boolean);

            const ktPathEn = Array.isArray(rawTree?.path?.en) && rawTree.path.en.length > 0
              ? rawTree.path.en
              : [ktDomainEn, ktSystemEn, ktSubsystemEn, ktMicroTopicEn].filter(Boolean);

            const ktSubClassFa = rawTree?.subClass?.fa || rawTree?.drugGroup?.fa || '';
            const ktSubClassEn = rawTree?.subClass?.en || rawTree?.drugGroup?.en || '';

            const knowledgeTree: KnowledgeTreeItem = {
              domain: { fa: ktDomainFa, en: ktDomainEn },
              system: { fa: ktSystemFa, en: ktSystemEn },
              subsystem: { fa: ktSubsystemFa, en: ktSubsystemEn },
              subClass: ktSubClassFa || ktSubClassEn ? { fa: ktSubClassFa, en: ktSubClassEn } : undefined,
              microTopic: { fa: ktMicroTopicFa, en: ktMicroTopicEn },
              path: { fa: ktPathFa, en: ktPathEn },
            };

            return {
              id: `cand-${Date.now()}-${idx}`,
              question: {
                fa: c.question?.fa || c.question || '',
                en: c.question?.en || c.question || '',
              },
              answer: {
                fa: c.answer?.fa || c.answer || '',
                en: c.answer?.en || c.answer || '',
              },
              pearl: {
                fa: c.pearl?.fa || c.pearl || '',
                en: c.pearl?.en || c.pearl || '',
              },
              type: c.type || (mode === 'mcq' ? 'mcq' : mode === 'triage_redflag' ? 'triage_redflag' : mode === 'calculation' ? 'calculation' : 'clinical_pearl'),
              category: c.category || cat,
              topic: c.topic || top,
              tags: Array.isArray(c.tags) ? c.tags : [cat, top],
              knowledgeTree,
              sourceSnippet: c.sourceSnippet || snippetText || textToUse,
              mcqOptions: Array.isArray(c.mcqOptions) ? c.mcqOptions : undefined,
              distractorRationale: c.distractorRationale || undefined,
              calculationFormula: c.calculationFormula || undefined,
              calLabels: Array.isArray(c.calLabels) ? c.calLabels : undefined,
              triageOutcome: c.triageOutcome || undefined,
              selected: true,
            };
          });

          setCandidateCards(mappedCards);
          setIsInputCollapsed(true);
        } else {
          throw new Error('No flashcards were returned by the AI service.');
        }
      } catch (err: any) {
        console.error('Error generating Leitner cards:', err);
        setErrorMsg(err.message || (isFa ? 'خطا در ارتباط با هوش مصنوعی آنلاین. لطفاً اتصال اینترنت یا کلید API را بررسی فرمایید.' : 'Error generating flashcards.'));
      } finally {
        setIsGenerating(false);
      }
    },
    [isFa, language, snippetText]
  );

  // Manual Card Creation handler
  const handleSaveManualCard = () => {
    if (!manualQuestionFa.trim() && !manualQuestionEn.trim()) {
      setErrorMsg(isFa ? 'لطفاً صورت سوال را وارد کنید.' : 'Please enter the question text.');
      return;
    }
    if (!manualAnswerFa.trim() && !manualAnswerEn.trim()) {
      setErrorMsg(isFa ? 'لطفاً پاسخ کارت را وارد کنید.' : 'Please enter the answer text.');
      return;
    }

    const now = new Date().toISOString();

    let mcqOptionsFormatted: McqOption[] | undefined = undefined;
    if (manualType === 'mcq') {
      mcqOptionsFormatted = manualMcqOptions
        .filter((o) => o.textFa.trim() || o.textEn.trim())
        .map((o) => ({
          id: o.id,
          text: {
            fa: o.textFa.trim() || o.textEn.trim(),
            en: o.textEn.trim() || o.textFa.trim(),
          },
          isCorrect: o.isCorrect,
          explanation: o.explanationFa ? { fa: o.explanationFa, en: o.explanationFa } : undefined,
        }));
    }

    const calLabelsArray = manualCalLabels
      .split(/[,،]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    const newCard: LeitnerCard = {
      id: `manual-card-${Date.now()}`,
      userId,
      question: {
        fa: manualQuestionFa.trim() || manualQuestionEn.trim(),
        en: manualQuestionEn.trim() || manualQuestionFa.trim(),
      },
      answer: {
        fa: manualAnswerFa.trim() || manualAnswerEn.trim(),
        en: manualAnswerEn.trim() || manualAnswerFa.trim(),
      },
      pearl: {
        fa: manualPearlFa.trim() || manualPearlEn.trim() || undefined,
        en: manualPearlEn.trim() || manualPearlFa.trim() || undefined,
      },
      type: manualType,
      category: category || 'Clinical Knowledge',
      topic: topic || 'Pharmacy Topic',
      tags: [category, topic].filter(Boolean),
      sourceSnippet: snippetText,
      mcqOptions: mcqOptionsFormatted,
      calLabels: calLabelsArray.length > 0 ? calLabelsArray : undefined,
      module: selectedModule,
      moduleName:
        selectedModule === 1
          ? { fa: 'تریاژ و مشاوره OTC', en: 'OTC Triage' }
          : selectedModule === 2
          ? { fa: 'قفسه فرآورده‌های S2/S3', en: 'S2/S3 Shelf' }
          : selectedModule === 3
          ? { fa: 'نسخه‌پیچی Fred Dispense', en: 'Fred Dispense' }
          : { fa: 'دانش جامع بالینی داروسازی', en: 'Clinical Knowledge' },
      box: 1,
      intervalDays: 1,
      easeFactor: 2.5,
      reviewCount: 0,
      successCount: 0,
      consecutiveCorrect: 0,
      nextReviewDate: now,
      createdAt: now,
    };

    onAddCardsToLeitner([newCard]);
    setSuccessSavedCount(1);
    setErrorMsg(null);

    // Reset manual form inputs
    setManualQuestionFa('');
    setManualQuestionEn('');
    setManualAnswerFa('');
    setManualAnswerEn('');
    setManualPearlFa('');
    setManualPearlEn('');
  };

  // Add AI candidate cards to Leitner
  const handleSaveSelectedCards = () => {
    const selected = candidateCards.filter((c) => c.selected);
    if (selected.length === 0) {
      setErrorMsg(isFa ? 'هیچ کارتی برای افزودن انتخاب نشده است.' : 'No cards selected.');
      return;
    }

    const now = new Date().toISOString();
    const newCards: LeitnerCard[] = selected.map((c) => {
      const cardModule = c.module || selectedModule;
      return {
        id: `card-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
        userId,
        question: c.question,
        answer: c.answer,
        pearl: c.pearl,
        type: c.type,
        category: c.category,
        topic: c.topic,
        tags: c.tags,
        knowledgeTree: c.knowledgeTree,
        sourceSnippet: c.sourceSnippet,
        mcqOptions: c.mcqOptions,
        distractorRationale: c.distractorRationale,
        calculationFormula: c.calculationFormula,
        calLabels: c.calLabels,
        triageOutcome: c.triageOutcome,
        module: cardModule,
        moduleName:
          cardModule === 1
            ? { fa: 'تریاژ و مشاوره OTC', en: 'OTC Triage' }
            : cardModule === 2
            ? { fa: 'قفسه فرآورده‌های S2/S3', en: 'S2/S3 Shelf' }
            : cardModule === 3
            ? { fa: 'نسخه‌پیچی Fred Dispense', en: 'Fred Dispense' }
            : { fa: 'دانش جامع بالینی داروسازی', en: 'Clinical Knowledge' },
        box: 1,
        intervalDays: 1,
        easeFactor: 2.5,
        reviewCount: 0,
        successCount: 0,
        consecutiveCorrect: 0,
        nextReviewDate: now,
        createdAt: now,
      };
    });

    onAddCardsToLeitner(newCards);
    setSuccessSavedCount(newCards.length);
    setCandidateCards([]);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-100 ring-1 ring-purple-500/20"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-900/95 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/25">
              <Sparkles className="w-5 h-5 text-white animate-pulse" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>{isFa ? 'ایجاد فلش‌کارت جعبه لایتنر' : 'Leitner Flashcard Creator'}</span>
              </h2>
              <p className="text-xs text-slate-400">
                {isFa
                  ? 'تولید هوشمند با هوش مصنوعی آنلاین یا ثبت مستقیم و دستی کارت'
                  : 'Generate via Online AI or create manually from selected study text'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher: [ 🤖 تولید با هوش مصنوعی آنلاین ] vs [ ✍️ ایجاد دستی کارت ] */}
        <div className="p-2.5 sm:px-5 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab('ai');
              setErrorMsg(null);
              setSuccessSavedCount(null);
            }}
            className={`flex-1 max-w-xs flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'ai'
                ? 'bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bot className="w-4 h-4 text-purple-300" />
            <span>{isFa ? '🤖 تولید با هوش مصنوعی (آنلاین)' : '🤖 Online AI Generator'}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              setErrorMsg(null);
              setSuccessSavedCount(null);
            }}
            className={`flex-1 max-w-xs flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
              activeTab === 'manual'
                ? 'bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-500/30'
                : 'bg-slate-900 text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <PenTool className="w-4 h-4 text-emerald-300" />
            <span>{isFa ? '✍️ ایجاد دستی کارت' : '✍️ Create Manually'}</span>
          </button>
        </div>

        {/* Modal Body Container */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Notification / Success State */}
          {successSavedCount !== null && (
            <div className="p-4 rounded-2xl bg-emerald-950/50 border border-emerald-500/50 text-emerald-200 text-xs sm:text-sm flex items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2 font-bold">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>
                  {isFa
                    ? `تعداد ${successSavedCount} کارت با موفقیت به جعبه لایتنر شما افزوده شد!`
                    : `${successSavedCount} flashcard(s) added successfully to your Leitner box!`}
                </span>
              </div>
              {onOpenLeitnerBox && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenLeitnerBox();
                  }}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shrink-0"
                >
                  <span>{isFa ? 'مشاهده جعبه لایتنر' : 'Open Leitner Box'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* ==================== TAB 1: ONLINE AI GENERATOR ==================== */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              {/* Context Textarea Box */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-bold flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <span>{isFa ? 'متن منبع انتخابی برای استخراج کارت:' : 'Selected Source Study Text:'}</span>
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {snippetText.length} {isFa ? 'کاراکتر' : 'chars'}
                  </span>
                </div>
                <textarea
                  value={snippetText}
                  onChange={(e) => setSnippetText(e.target.value)}
                  rows={4}
                  placeholder={isFa ? 'متن درسی یا دارویی را اینجا وارد فرمایید...' : 'Paste or type study text here...'}
                  className="w-full p-3 rounded-2xl bg-black/40 border border-slate-700/80 text-slate-100 text-xs leading-relaxed focus:outline-hidden focus:border-purple-500 transition resize-y"
                />
              </div>

              {/* Mode & Module Selector Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    {isFa ? 'سبک سوالات مورد نظر:' : 'Flashcard Question Mode:'}
                  </label>
                  <select
                    value={generationMode}
                    onChange={(e) => setGenerationMode(e.target.value as FlashcardGenerationMode)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value="auto">{isFa ? '🌟 ترکیب هوشمند و جامع (پیش‌فرض)' : '🌟 Comprehensive High-Yield Mix'}</option>
                    <option value="mcq">{isFa ? '📝 سناریوی تستی ۴ گزینه‌ای (MCQ)' : '📝 4-Option Clinical MCQ'}</option>
                    <option value="cal_warning">{isFa ? '⚠️ برچسب‌های هشدار دارویی (CALs)' : '⚠️ Australian CAL Warning'}</option>
                    <option value="triage_redflag">{isFa ? '🚨 تریاژ OTC و علائم هشدار حیاتی' : '🚨 OTC Triage & Red Flags'}</option>
                    <option value="calculation">{isFa ? '🧮 فرمول و محاسبات دوزاژ بالینی' : '🧮 Dosing & Pharmacokinetics'}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    {isFa ? 'بخش و ماژول آموزشی:' : 'Target Pharmacy Module:'}
                  </label>
                  <select
                    value={selectedModule}
                    onChange={(e) => setSelectedModule(Number(e.target.value) as 1 | 2 | 3 | 4)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-xs font-bold focus:outline-hidden focus:border-purple-500 cursor-pointer"
                  >
                    <option value={1}>{isFa ? 'ماژول ۱: تریاژ و مشاوره OTC' : 'Module 1: OTC Triage & Consultation'}</option>
                    <option value={2}>{isFa ? 'ماژول ۲: قفسه و فرآورده‌های S2/S3' : 'Module 2: S2/S3 Pharmacy Shelf'}</option>
                    <option value={3}>{isFa ? 'ماژول ۳: نسخه‌پیچی و Fred Dispense' : 'Module 3: Fred Dispense Simulation'}</option>
                    <option value={4}>{isFa ? 'ماژول ۴: دانش بالینی استرالیا' : 'Module 4: Clinical Knowledge'}</option>
                  </select>
                </div>
              </div>

              {/* Custom Prompt Toggle */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                  className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 transition cursor-pointer"
                >
                  <span>{isFa ? 'دستورالعمل و تاکید اختصاصی شما برای هوش مصنوعی (اختیاری)' : 'Custom AI Directives (Optional)'}</span>
                  {showAdvancedSettings ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvancedSettings && (
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    placeholder={isFa ? 'مثال: روی تداخلات با داروهای قلبی یا دوز سالمندان تمرکز کن...' : 'e.g. Focus on elderly dosing or renal monitoring...'}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-purple-500"
                  />
                )}
              </div>

              {/* Generate Action Button */}
              <button
                type="button"
                disabled={isGenerating}
                onClick={() =>
                  handleGenerateCards(
                    snippetText,
                    selectedModule,
                    category,
                    topic,
                    customPrompt,
                    generationMode
                  )
                }
                className="w-full py-3 px-4 rounded-2xl bg-linear-to-r from-purple-600 via-indigo-600 to-sky-600 hover:from-purple-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-purple-500/25 flex items-center justify-center gap-2 disabled:opacity-60 transition cursor-pointer active:scale-98"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>{isFa ? 'در حال نگارش و اعتبارسنجی با استانداردهای استرالیا...' : 'Generating Clinical Flashcards...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                    <span>{isFa ? 'تولید هوشمند کارت‌های لایتنر' : 'Generate High-Yield Cards'}</span>
                  </>
                )}
              </button>

              {/* Candidate Cards List (After Generation) */}
              {candidateCards.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-emerald-400" />
                      <span>{isFa ? 'پیش‌نمایش کارت‌های تولیدشده:' : 'Generated Flashcard Candidates:'}</span>
                    </span>
                    <span className="text-[11px] text-slate-400">
                      {candidateCards.filter((c) => c.selected).length} {isFa ? 'کارت انتخاب‌شده' : 'selected'}
                    </span>
                  </div>

                  <div className="space-y-3">
                    {candidateCards.map((c, idx) => (
                      <div
                        key={c.id || idx}
                        className={`p-3.5 rounded-2xl border transition space-y-2.5 ${
                          c.selected
                            ? 'bg-slate-800/80 border-purple-500/50 shadow-md'
                            : 'bg-black/30 border-slate-800 opacity-60'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={c.selected}
                              onChange={() => {
                                setCandidateCards((prev) =>
                                  prev.map((card, i) =>
                                    i === idx ? { ...card, selected: !card.selected } : card
                                  )
                                );
                              }}
                              className="w-4 h-4 rounded text-purple-600 focus:ring-0 cursor-pointer"
                            />
                            <span className="text-xs font-bold text-purple-300">
                              {isFa ? `کارت ${idx + 1}` : `Card ${idx + 1}`} ({c.type})
                            </span>
                          </label>
                        </div>

                        <div className="space-y-1.5 text-xs">
                          <div className="p-2.5 rounded-xl bg-black/40 border border-slate-700/60 font-medium text-slate-100">
                            <span className="text-purple-400 font-bold text-[11px] block mb-0.5">
                              {isFa ? '❓ صورت سوال:' : '❓ Question:'}
                            </span>
                            {c.question.fa}
                            {c.question.en && c.question.en !== c.question.fa && (
                              <div className="text-[11px] text-slate-400 mt-1 pt-1 border-t border-slate-800 font-sans">
                                {c.question.en}
                              </div>
                            )}
                          </div>

                          <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200">
                            <span className="text-emerald-400 font-bold text-[11px] block mb-0.5">
                              {isFa ? '💡 پاسخ تشریحی:' : '💡 Answer:'}
                            </span>
                            {c.answer.fa}
                          </div>

                          {c.pearl?.fa && (
                            <div className="p-2 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 text-[11px]">
                              <span className="text-amber-400 font-bold">✨ {isFa ? 'نکته طلایی:' : 'Clinical Pearl:'} </span>
                              {c.pearl.fa}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Add Selected Cards to Leitner Box Button */}
                  <button
                    type="button"
                    onClick={handleSaveSelectedCards}
                    className="w-full py-3 px-4 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
                  >
                    <CheckSquare className="w-4 h-4 text-emerald-200" />
                    <span>{isFa ? 'افزودن کارت‌های انتخاب‌شده به جعبه لایتنر' : 'Add Selected Cards to Leitner Box'}</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ==================== TAB 2: MANUAL CARD CREATOR ==================== */}
          {activeTab === 'manual' && (
            <div className="space-y-4 animate-fadeIn">
              {/* Context Preview Container */}
              {snippetText && snippetText.trim() && (
                <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-purple-300 font-bold">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-purple-400" />
                      <span>{isFa ? 'متن انتخابی شما (جهت مشاهده و ارجاع حین نگارش سوال):' : 'Selected Source Reference:'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(snippetText)}
                      className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white text-[10px] cursor-pointer"
                    >
                      {isFa ? 'کپی متن' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed max-h-32 overflow-y-auto bg-black/30 p-2.5 rounded-xl border border-slate-800/80">
                    {snippetText}
                  </p>
                </div>
              )}

              {/* Card Type Selector */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-300">
                  {isFa ? 'نوع کارت لایتنر:' : 'Card Type:'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    { id: 'clinical_pearl', labelFa: '🌟 نکته طلایی بالینی', labelEn: 'Clinical Pearl' },
                    { id: 'mcq', labelFa: '📝 چهارگزینه‌ای (MCQ)', labelEn: 'Multiple Choice' },
                    { id: 'cal_warning', labelFa: '⚠️ برچسب هشدار (CAL)', labelEn: 'CAL Warning' },
                    { id: 'triage_redflag', labelFa: '🚨 تریاژ و ارجاع فوری', labelEn: 'OTC Triage' },
                    { id: 'calculation', labelFa: '🧮 محاسبه دوز و بالینی', labelEn: 'Calculation' },
                  ].map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setManualType(t.id as any)}
                      className={`p-2.5 rounded-xl text-xs font-bold border transition text-center cursor-pointer ${
                        manualType === t.id
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 shadow-md ring-1 ring-emerald-500/40'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {isFa ? t.labelFa : t.labelEn}
                    </button>
                  ))}
                </div>
              </div>

              {/* Question Inputs */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-black/30 border border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                    <span>{isFa ? 'صورت سوال به فارسی (اجباری):' : 'Question (Persian):'}</span>
                    <span className="text-[10px] text-amber-400 font-normal">
                      {isFa ? '* حتماً نام دقیق دارو یا بیماری را در صورت سوال قید فرمایید' : '* Include specific drug name'}
                    </span>
                  </label>
                  <textarea
                    value={manualQuestionFa}
                    onChange={(e) => setManualQuestionFa(e.target.value)}
                    rows={2}
                    placeholder={isFa ? 'مثال: در بیمار تحت درمان با متوترکسات برای آرتریت روماتوئید، دوزاژ و نحوه مصرف اسید فولیک چیست؟' : 'Enter question in Persian...'}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    {isFa ? 'صورت سوال به انگلیسی (اختیاری):' : 'Question in English (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={manualQuestionEn}
                    onChange={(e) => setManualQuestionEn(e.target.value)}
                    placeholder="e.g. What is the standard folic acid dosing regimen for a patient on methotrexate?"
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* If MCQ: Options Editor */}
              {manualType === 'mcq' && (
                <div className="p-3.5 rounded-2xl bg-purple-950/20 border border-purple-500/30 space-y-2.5">
                  <span className="text-xs font-bold text-purple-300 block">
                    {isFa ? 'گزینه‌های تستی (گزینه صحیح را تیک بزنید):' : 'MCQ Options (Check the correct option):'}
                  </span>
                  <div className="space-y-2">
                    {manualMcqOptions.map((opt, oIdx) => (
                      <div key={opt.id} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setManualMcqOptions((prev) =>
                              prev.map((o, i) => ({ ...o, isCorrect: i === oIdx }))
                            );
                          }}
                          className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition cursor-pointer shrink-0 ${
                            opt.isCorrect
                              ? 'bg-emerald-500 text-white border-emerald-400 shadow-md'
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}
                        >
                          {opt.id} {opt.isCorrect ? '✓' : ''}
                        </button>
                        <input
                          type="text"
                          value={opt.textFa}
                          onChange={(e) => {
                            const val = e.target.value;
                            setManualMcqOptions((prev) =>
                              prev.map((o, i) => (i === oIdx ? { ...o, textFa: val } : o))
                            );
                          }}
                          placeholder={isFa ? `متن گزینه ${opt.id}...` : `Option ${opt.id}...`}
                          className="flex-1 p-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer Inputs */}
              <div className="space-y-3 p-3.5 rounded-2xl bg-black/30 border border-slate-800">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-200">
                    {isFa ? 'پاسخ تشریحی و کامل به فارسی (اجباری):' : 'Answer (Persian):'}
                  </label>
                  <textarea
                    value={manualAnswerFa}
                    onChange={(e) => setManualAnswerFa(e.target.value)}
                    rows={3}
                    placeholder={isFa ? 'پاسخ کامل، مستند و راهنمای بالینی را اینجا بنویسید...' : 'Enter complete clinical answer...'}
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-300">
                    {isFa ? 'پاسخ به انگلیسی (اختیاری):' : 'Answer in English (Optional):'}
                  </label>
                  <input
                    type="text"
                    value={manualAnswerEn}
                    onChange={(e) => setManualAnswerEn(e.target.value)}
                    placeholder="Enter English clinical rationale..."
                    className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Clinical Pearl Input */}
              <div className="space-y-1 p-3.5 rounded-2xl bg-black/30 border border-slate-800">
                <label className="text-xs font-bold text-amber-300 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isFa ? 'نکته طلایی بالینی / Pearl (اختیاری):' : 'High-Yield Pearl (Optional):'}</span>
                </label>
                <input
                  type="text"
                  value={manualPearlFa}
                  onChange={(e) => setManualPearlFa(e.target.value)}
                  placeholder={isFa ? 'نکته کلیدی و خلاصه جهت مرور سریع...' : 'Quick takeaway rule...'}
                  className="w-full p-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Add Manual Card Button */}
              <button
                type="button"
                onClick={handleSaveManualCard}
                className="w-full py-3.5 px-4 rounded-2xl bg-linear-to-r from-emerald-600 via-teal-600 to-sky-600 hover:from-emerald-500 hover:to-sky-500 text-white font-bold text-sm shadow-xl shadow-emerald-500/25 flex items-center justify-center gap-2 transition cursor-pointer active:scale-98"
              >
                <Plus className="w-4 h-4 text-emerald-200" />
                <span>{isFa ? '➕ ثبت کارت و افزودن به جعبه لایتنر' : '➕ Save Card to Leitner Box'}</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const AiLeitnerModal: React.FC<AiLeitnerModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <AiLeitnerModalContent {...props} />;
};
