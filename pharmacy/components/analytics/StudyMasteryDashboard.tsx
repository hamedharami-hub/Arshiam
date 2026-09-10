'use client';

import React, { useState, useMemo, useSyncExternalStore } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  Award,
  CheckCircle2,
  Target,
  Layers,
  Zap,
  ArrowUpRight,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Language, UserProgress } from '@/types/pharmacy';
import { LeitnerCard } from '@/types/leitner';
import { useStudyTracker } from '@/components/study/StudyTrackerContext';
import { StudyPlannerPanel } from './StudyPlannerPanel';
import { getCatalogStats } from '@/data/studyCatalog';

interface StudyMasteryDashboardProps {
  language: Language;
  userProgress: UserProgress;
  leitnerCards?: LeitnerCard[];
  onOpenLeitnerBox?: () => void;
}

export interface QuizHistoryRecord {
  id: string;
  sessionName: string;
  sessionNameFa: string;
  date: string;
  displayDate: string;
  totalQuestions: number;
  correctAnswers: number;
  scorePct: number;
  timeSpentMinutes: number;
}

const STORAGE_QUIZ_HISTORY_KEY = 'AU_PHARMACY_QUIZ_HISTORY_V2';

const LEITNER_BOX_COLORS = ['#f43f5e', '#f59e0b', '#0ea5e9', '#6366f1', '#10b981'];

export const StudyMasteryDashboard: React.FC<StudyMasteryDashboardProps> = ({
  language,
  userProgress,
  leitnerCards = [],
  onOpenLeitnerBox,
}) => {
  const isFa = language === 'fa';
  const tracker = useStudyTracker();
  const isMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  const [selectedTimeframe, setSelectedTimeframe] = useState<'7d' | '30d' | 'all'>('30d');
  const [activeChartTab, setActiveChartTab] = useState<'trends' | 'modules' | 'leitner'>('trends');
  const [plannerRevision, setPlannerRevision] = useState(0);

  const totalLeitnerCards = leitnerCards.length;

  // Breakdown by the real central study catalog, including OTC scenarios and Shelf products.
  const moduleMasteryData = useMemo(() => {
    const state = tracker?.studyState || { viewedMap: {}, completedMap: {}, flagMap: {} };
    const catalogStats = getCatalogStats(state);
    const modulesDef = [
      {
        id: 'mod1',
        num: 1,
        nameFa: 'تریاژ سرپایی و علائم خطر',
        nameEn: 'OTC Triage & Red Flags',
        color: '#059669',
      },
      {
        id: 'mod2',
        num: 2,
        nameFa: 'قفسه داروها و زمانبندی SUSMP',
        nameEn: 'Product Shelf & Scheduling',
        color: '#0284c7',
      },
      {
        id: 'mod3',
        num: 3,
        nameFa: 'نسخه‌پیچی فرد و برچسب‌های CAL',
        nameEn: 'FRED Dispense & Legal CALs',
        color: '#0d9488',
      },
      {
        id: 'mod4',
        num: 4,
        nameFa: 'فارماکولوژی بالینی',
        nameEn: 'Clinical Pharmacology',
        color: '#4f46e5',
      },
      {
        id: 'mod5',
        num: 5,
        nameFa: 'جعبه لایتنر و تکرار فاصله‌دار',
        nameEn: 'Leitner Spaced Repetition',
        color: '#7c3aed',
      },
    ];

    return modulesDef.map((m) => {
      const central = catalogStats.find((stat) => stat.moduleId === m.num);
      let completed = central?.completed || 0;
      let target = central?.total || 0;
      if (m.num === 5) {
        completed = leitnerCards.filter((c) => c.box >= 4).length;
        target = Math.max(totalLeitnerCards, completed);
      }
      const total = Math.max(target, completed);
      const masteryPct = total > 0 ? Math.min(100, Math.round((completed / total) * 100)) : 0;

      return {
        key: m.id,
        name: isFa ? m.nameFa : m.nameEn,
        shortName: isFa ? `ماژول ${m.num}` : `Mod ${m.num}`,
        completed,
        target: total,
        viewed: central?.viewed || 0,
        flagged: central?.flagged || 0,
        masteryPct,
        fill: m.color,
      };
    });
  }, [isFa, leitnerCards, totalLeitnerCards, tracker?.studyState]);

  // Overall study mastery percentage calculation
  const overallMasteryPct = useMemo(() => {
    if (moduleMasteryData.length === 0) return 0;
    const sumPct = moduleMasteryData.reduce((acc, curr) => acc + curr.masteryPct, 0);
    return Math.min(100, Math.round(sumPct / moduleMasteryData.length));
  }, [moduleMasteryData]);

  // Leitner retention distribution (Box 1 to 5)
  const leitnerDistributionData = useMemo(() => {
    const boxCounts = [0, 0, 0, 0, 0];
    leitnerCards.forEach((c) => {
      const b = Math.min(5, Math.max(1, c.box || 1));
      boxCounts[b - 1]++;
    });

    const boxLabels = [
      { fa: 'جعبه ۱ (روزانه)', en: 'Box 1 (Daily)' },
      { fa: 'جعبه ۲ (۳ روزه)', en: 'Box 2 (3 Days)' },
      { fa: 'جعبه ۳ (هفتگی)', en: 'Box 3 (Weekly)' },
      { fa: 'جعبه ۴ (دو هفته)', en: 'Box 4 (Fortnightly)' },
      { fa: 'جعبه ۵ (تثبیت دائم)', en: 'Box 5 (Permanent)' },
    ];

    return boxCounts.map((count, idx) => ({
      box: idx + 1,
      label: isFa ? boxLabels[idx].fa : boxLabels[idx].en,
      shortLabel: isFa ? `ج${idx + 1}` : `B${idx + 1}`,
      cards: count,
      fill: LEITNER_BOX_COLORS[idx],
    }));
  }, [isFa, leitnerCards]);

  // 2. Chronological Quiz Performance Trend Data
  const quizHistory = useMemo<QuizHistoryRecord[]>(() => {
    let historyRecords: QuizHistoryRecord[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_QUIZ_HISTORY_KEY);
        if (stored) {
          historyRecords = JSON.parse(stored);
        }
      } catch {
        historyRecords = [];
      }
    }

    // Extract history entries from leitnerCards if present
    if (leitnerCards.length > 0) {
      const extractedReviews: Record<string, { total: number; correct: number }> = {};
      leitnerCards.forEach((c) => {
        (c.history || []).forEach((h) => {
          const dayKey = (h.date || '').slice(0, 10);
          if (!dayKey) return;
          if (!extractedReviews[dayKey]) {
            extractedReviews[dayKey] = { total: 0, correct: 0 };
          }
          extractedReviews[dayKey].total++;
          if (h.result === 'correct') {
            extractedReviews[dayKey].correct++;
          }
        });
      });

      Object.entries(extractedReviews).forEach(([day, stat]) => {
        if (!historyRecords.some((r) => r.date === day) && stat.total >= 3) {
          historyRecords.push({
            id: `leitner-history-${day}`,
            sessionName: 'Spaced Review Session',
            sessionNameFa: 'مرور فواصل لایتنر',
            date: day,
            displayDate: day.slice(5),
            totalQuestions: stat.total,
            correctAnswers: stat.correct,
            scorePct: Math.round((stat.correct / stat.total) * 100),
            timeSpentMinutes: Math.max(3, Math.round(stat.total * 0.8)),
          });
        }
      });
    }

    // Sort chronologically ascending
    historyRecords.sort((a, b) => a.date.localeCompare(b.date));
    return historyRecords;
  }, [leitnerCards, plannerRevision]);

  // Filtered Quiz History based on timeframe
  const filteredQuizHistory = useMemo(() => {
    if (selectedTimeframe === 'all') return quizHistory;
    const daysLimit = selectedTimeframe === '7d' ? 7 : 30;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysLimit);
    const cutoffIso = cutoffDate.toISOString().slice(0, 10);
    const filtered = quizHistory.filter((r) => r.date >= cutoffIso);
    return filtered.length > 0 ? filtered : quizHistory.slice(-5);
  }, [quizHistory, selectedTimeframe]);

  // Statistics calculation
  const averageQuizScore = useMemo(() => {
    if (filteredQuizHistory.length === 0) return 0;
    const sum = filteredQuizHistory.reduce((acc, curr) => acc + curr.scorePct, 0);
    return Math.round(sum / filteredQuizHistory.length);
  }, [filteredQuizHistory]);

  const totalQuestionsAnswered = useMemo(() => {
    return filteredQuizHistory.reduce((acc, curr) => acc + curr.totalQuestions, 0);
  }, [filteredQuizHistory]);

  const highestScore = useMemo(() => {
    if (filteredQuizHistory.length === 0) return 0;
    return Math.max(...filteredQuizHistory.map((r) => r.scorePct));
  }, [filteredQuizHistory]);

  if (!isMounted) {
    return (
      <div className="p-8 text-center app-card border app-border rounded-2xl">
        <div className="w-8 h-8 mx-auto border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
        <span className="text-xs app-muted block mt-2">{isFa ? 'در حال بارگذاری داده‌های آماری...' : 'Loading analytics...'}</span>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-start min-w-0">
      {/* 1. Header Banner & High-Level KPIs */}
      <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-lg space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                <TrendingUp className="w-4 h-4" />
              </span>
              <h3 className="font-extrabold text-sm sm:text-base text-slate-100">
                {isFa ? 'داشبورد جامع تسلط و تحلیل پیشرفت مطالعه' : 'Study Mastery & Performance Analytics'}
              </h3>
            </div>
            <p className="text-[11px] text-slate-400">
              {isFa
                ? 'ارزیابی دقیق مهارت‌های بالینی، تریاژ سرپایی و نگهداری حافظه لایتنر'
                : 'Real-time analytics for Australian Pharmacy practice and Leitner retention.'}
            </p>
          </div>

          {/* Timeframe Selector */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-slate-800 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedTimeframe('7d')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedTimeframe === '7d'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? '۷ روز اخیر' : '7 Days'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeframe('30d')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedTimeframe === '30d'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? '۳۰ روز اخیر' : '30 Days'}
            </button>
            <button
              type="button"
              onClick={() => setSelectedTimeframe('all')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                selectedTimeframe === 'all'
                  ? 'bg-sky-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {isFa ? 'کل دوره' : 'All Time'}
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Card 1: Overall Mastery */}
          <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                {isFa ? 'میزان تسلط کل' : 'Overall Mastery'}
              </span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">
                {overallMasteryPct}%
              </span>
              <span className="text-[9px] text-emerald-400/80 block">
                {overallMasteryPct >= 75
                  ? isFa ? '✓ تسلط خوب' : '✓ Strong mastery'
                  : isFa ? 'نیاز به تثبیت بیشتر' : 'Building Mastery'}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* Card 2: Average Quiz Accuracy */}
          <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                {isFa ? 'میانگین نمرات آزمون' : 'Avg Quiz Score'}
              </span>
              <span className="text-xl font-extrabold text-sky-400 font-mono">
                {averageQuizScore}%
              </span>
              <span className="text-[9px] text-sky-400/80 block">
                {isFa ? `بالاترین: ${highestScore}%` : `Peak: ${highestScore}%`}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center shrink-0">
              <Award className="w-5 h-5" />
            </div>
          </div>

          {/* Card 3: Questions Answered */}
          <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                {isFa ? 'تست‌های پاسخ‌داده' : 'Questions Tested'}
              </span>
              <span className="text-xl font-extrabold text-indigo-400 font-mono">
                {totalQuestionsAnswered}
              </span>
              <span className="text-[9px] text-indigo-400/80 block">
                {isFa ? `${filteredQuizHistory.length} جلسه تمرین` : `${filteredQuizHistory.length} sessions`}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          {/* Card 4: Leitner Retained Cards */}
          <div className="p-3 rounded-2xl bg-black/40 border border-slate-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[10px] font-bold text-slate-400 block">
                {isFa ? 'کارت‌های تثبیت‌شده' : 'Permanent Leitner'}
              </span>
              <span className="text-xl font-extrabold text-purple-400 font-mono">
                {leitnerDistributionData[4]?.cards || 0}
              </span>
              <span className="text-[9px] text-purple-400/80 block">
                {isFa ? `از کل ${totalLeitnerCards} کارت` : `of ${totalLeitnerCards} cards`}
              </span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 text-purple-400 flex items-center justify-center shrink-0">
              <Layers className="w-5 h-5" />
            </div>
          </div>
        </div>
      </div>

      <StudyPlannerPanel
        language={language}
        leitnerCards={leitnerCards}
        onExamComplete={() => setPlannerRevision((revision) => revision + 1)}
        onOpenLeitnerBox={onOpenLeitnerBox}
      />

      {/* 2. Visual View Switcher (Tabs for different Recharts Views) */}
      <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto custom-scrollbar">
        <button
          type="button"
          onClick={() => setActiveChartTab('trends')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeChartTab === 'trends'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{isFa ? 'روند نمرات و تاریخچه آزمون' : 'Quiz Performance Trend'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab('modules')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeChartTab === 'modules'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>{isFa ? 'درصد تسلط به تفکیک ماژول‌ها' : 'Module Mastery %'}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveChartTab('leitner')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
            activeChartTab === 'leitner'
              ? 'bg-purple-600 text-white shadow-md'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>{isFa ? 'منحنی توزیع لایتنر (جعبه ۱ تا ۵)' : 'Leitner Retention'}</span>
        </button>
      </div>

      {/* 3. Main Chart Display View */}
      {activeChartTab === 'trends' && (
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-sky-400" />
                <span>{isFa ? 'نمودار روند دقت و نمرات آزمون‌ها در طول زمان' : 'Quiz Accuracy & Score Trends Over Time'}</span>
              </h4>
              <p className="text-[10px] text-slate-400">
                {isFa
                  ? 'خط‌چین سبز یک هدف پیشنهادی ۷۵٪ برای مطالعه است.'
                  : 'The dashed line marks a suggested 75% study target.'}
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] text-slate-300">
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-500"></span>
                <span>{isFa ? 'نمره کسب شده (درصد)' : 'Score %'}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2.5 h-0.5 bg-emerald-500"></span>
                <span>{isFa ? 'حدنصاب قبولی (۷۵٪)' : 'Pass Mark (75%)'}</span>
              </span>
            </div>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredQuizHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="scoreTrendGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.45} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                <XAxis
                  dataKey="displayDate"
                  stroke="#94a3b8"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(val) => `${val}%`}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as QuizHistoryRecord;
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl text-[11px] space-y-1 z-50 text-start">
                          <p className="font-bold text-slate-100 flex items-center justify-between gap-3 border-b border-slate-800 pb-1">
                            <span>{isFa ? data.sessionNameFa : data.sessionName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{data.date}</span>
                          </p>
                          <div className="flex items-center justify-between gap-4 text-sky-400 font-bold">
                            <span>{isFa ? 'نمره نهایی:' : 'Score:'}</span>
                            <span className="font-mono text-sm">{data.scorePct}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300 text-[10px]">
                            <span>{isFa ? 'پاسخ صحیح:' : 'Correct:'}</span>
                            <span className="font-mono">
                              {data.correctAnswers} / {data.totalQuestions}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px]">
                            <span>{isFa ? 'وضعیت قبولی:' : 'Status:'}</span>
                            <span className={data.scorePct >= 75 ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                              {data.scorePct >= 75 ? (isFa ? 'قبول (Pass)' : 'Pass') : (isFa ? 'نیاز به مرور' : 'Review Needed')}
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={75}
                  stroke="#10b981"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                />
                <Area
                  type="monotone"
                  dataKey="scorePct"
                  name={isFa ? 'نمره آزمون (%)' : 'Score %'}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#scoreTrendGradient)"
                  dot={{ r: 4, fill: '#38bdf8', stroke: '#0f172a', strokeWidth: 2 }}
                  activeDot={{ r: 6, fill: '#0284c7', stroke: '#ffffff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeChartTab === 'modules' && (
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Target className="w-4 h-4 text-emerald-400" />
                <span>{isFa ? 'درصد پیشرفت و تسلط به تفکیک ۵ حوزه کلینیکی' : 'Clinical Domain Mastery Breakdown'}</span>
              </h4>
              <p className="text-[10px] text-slate-400">
                {isFa
                  ? 'نمایش سهم مباحث تکمیل‌شده در مقایسه با تارگت استاندارد هر ماژول'
                  : 'Mastery progress across core domains against target curricular objectives.'}
              </p>
            </div>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold self-start sm:self-auto">
              {isFa ? `تسلط کل: ${overallMasteryPct}٪` : `Overall: ${overallMasteryPct}%`}
            </span>
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={moduleMasteryData}
                layout="vertical"
                margin={{ top: 10, right: 20, left: 10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} horizontal={false} />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(val) => `${val}%`}
                  stroke="#94a3b8"
                  fontSize={10}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  type="category"
                  dataKey="shortName"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  width={60}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl text-[11px] space-y-1 text-start z-50">
                          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            {data.name}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-emerald-400 font-bold">
                            <span>{isFa ? 'درصد تسلط:' : 'Mastery:'}</span>
                            <span className="font-mono text-sm">{data.masteryPct}%</span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-300 text-[10px]">
                            <span>{isFa ? 'مباحث مسلط شده:' : 'Mastered:'}</span>
                            <span className="font-mono">
                              {data.completed} / {data.target}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-4 text-slate-400 text-[10px]">
                            <span>{isFa ? 'مشاهده / فلگ:' : 'Viewed / Flagged:'}</span>
                            <span className="font-mono">{data.viewed} / {data.flagged}</span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="masteryPct"
                  name={isFa ? 'درصد تسلط' : 'Mastery %'}
                  radius={[0, 8, 8, 0]}
                >
                  {moduleMasteryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeChartTab === 'leitner' && (
        <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-md space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-800 pb-2">
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-200 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-purple-400" />
                <span>{isFa ? 'توزیع کارت‌ها در ۵ خانه لایتنر بر اساس تکرار فاصله‌دار' : 'Leitner Spaced Repetition Box Distribution'}</span>
              </h4>
              <p className="text-[10px] text-slate-400">
                {isFa
                  ? 'جعبه ۱: مرور روزانه ← جعبه ۵: انتقال کامل به حافظه پایدار بلندمدت'
                  : 'Box 1: Daily recall reinforcement → Box 5: Long-term consolidated memory.'}
              </p>
            </div>

            {onOpenLeitnerBox && (
              <button
                type="button"
                onClick={onOpenLeitnerBox}
                className="px-2.5 py-1 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-purple-300 border border-purple-500/40 text-[11px] font-bold transition flex items-center gap-1 self-start sm:self-auto cursor-pointer"
              >
                <span>{isFa ? 'ورود به جعبه لایتنر' : 'Open Leitner'}</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-64 sm:h-72 w-full pt-2 min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={leitnerDistributionData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false} />
                <XAxis
                  dataKey="shortLabel"
                  stroke="#94a3b8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="p-2.5 rounded-xl bg-slate-950/95 border border-slate-700 shadow-2xl text-[11px] space-y-1 text-start z-50">
                          <p className="font-bold text-slate-100 border-b border-slate-800 pb-1">
                            {data.label}
                          </p>
                          <div className="flex items-center justify-between gap-4 text-purple-400 font-bold">
                            <span>{isFa ? 'تعداد کارت‌ها:' : 'Cards Count:'}</span>
                            <span className="font-mono text-sm">{data.cards}</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            {data.box === 5
                              ? isFa ? 'کاملاً در حافظه بلندمدت تثبیت شده است' : 'Fully consolidated in long-term memory'
                              : isFa ? 'نیازمند استمرار در جلسات مرور روزانه' : 'Active review required'}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="cards"
                  name={isFa ? 'تعداد کارت' : 'Card Count'}
                  radius={[8, 8, 0, 0]}
                >
                  {leitnerDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 4. Mini Study Recommendation / Action Card */}
      <div className="p-3.5 rounded-2xl bg-black/35 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-bold text-slate-200 text-xs">
              {isFa ? 'پیشنهاد هوشمند مطالعه بر اساس نمودار تسلط:' : 'Smart Study Recommendation:'}
            </h5>
            <p className="text-[11px] text-slate-400">
              {overallMasteryPct < 75
                ? isFa
                  ? 'توصیه می‌شود بر ماژول‌های تریاژ و فارماکولوژی بالینی تمرکز نموده تا نمره میانگین به حدنصاب ۷۵٪ برسد.'
                  : 'Focus on OTC Triage and Pharmacology to raise your score past the 75% examination pass mark.'
                : isFa
                  ? 'عالی! نمرات شما در بازه ایمن قبولی قرار دارد. مرور منظم کارت‌های جعبه‌های ۳ و ۴ را برای تثبیت ادامه دهید.'
                  : 'Excellent! Scores are in the passing band. Maintain retention with Box 3 & 4 reviews.'}
            </p>
          </div>
        </div>

        {onOpenLeitnerBox && (
          <button
            type="button"
            onClick={onOpenLeitnerBox}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition shadow-sm flex items-center justify-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>{isFa ? 'شروع جلسه مرور هوشمند' : 'Start Review'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
};
