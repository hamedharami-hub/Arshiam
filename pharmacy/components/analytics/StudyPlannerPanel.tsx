'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlarmClock, Bell, BookOpenCheck, CalendarDays, CircleGauge, Play, RotateCcw, Target, Timer, TriangleAlert } from 'lucide-react';
import { LeitnerCard } from '@/types/leitner';
import { useStudyTracker } from '@/components/study/StudyTrackerContext';
import type { QuizHistoryRecord } from './StudyMasteryDashboard';

const PLAN_STORAGE_KEY = 'AU_PHARMACY_STUDY_PLAN_V2';
const QUIZ_HISTORY_STORAGE_KEY = 'AU_PHARMACY_QUIZ_HISTORY_V2';
const REVIEW_QUEUE_KEY = 'AU_PHARMACY_REVIEW_QUEUE_V1';
const SESSION_OPTIONS = [
  { minutes: 5, questions: 3 },
  { minutes: 15, questions: 8 },
  { minutes: 30, questions: 15 },
] as const;

interface StudyPlannerPanelProps {
  language: 'fa' | 'en';
  leitnerCards: LeitnerCard[];
  onExamComplete: () => void;
  onOpenLeitnerBox?: () => void;
}

interface StoredPlan {
  dailyTarget?: number;
  weeklyTarget?: number;
  masteryTarget?: number;
  reminderEnabled?: boolean;
  reminderHour?: number;
}

const startOfDay = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate());
const startOfWeek = (value: Date) => {
  const date = startOfDay(value);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return date;
};
const formatMinutes = (seconds: number) => `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

export const StudyPlannerPanel: React.FC<StudyPlannerPanelProps> = ({ language, leitnerCards, onExamComplete, onOpenLeitnerBox }) => {
  const isFa = language === 'fa';
  const tracker = useStudyTracker();
  const [dailyTarget, setDailyTarget] = useState(15);
  const [weeklyTarget, setWeeklyTarget] = useState(75);
  const [masteryTarget, setMasteryTarget] = useState(75);
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderHour, setReminderHour] = useState(19);
  const [isPlanLoaded, setIsPlanLoaded] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [sessionMinutes, setSessionMinutes] = useState<number>(15);
  const [queuedCardIds, setQueuedCardIds] = useState<string[]>([]);
  const [examCards, setExamCards] = useState<LeitnerCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15 * 60);
  const [isExamRunning, setIsExamRunning] = useState(false);
  const [isExamComplete, setIsExamComplete] = useState(false);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [examSaved, setExamSaved] = useState(false);

  useEffect(() => {
    try {
      const plan = JSON.parse(localStorage.getItem(PLAN_STORAGE_KEY) || '{}') as StoredPlan;
      if (typeof plan.dailyTarget === 'number') setDailyTarget(Math.max(5, Math.min(50, plan.dailyTarget)));
      if (typeof plan.weeklyTarget === 'number') setWeeklyTarget(Math.max(25, Math.min(200, plan.weeklyTarget)));
      if (typeof plan.masteryTarget === 'number') setMasteryTarget(Math.max(50, Math.min(95, plan.masteryTarget)));
      if (typeof plan.reminderEnabled === 'boolean') setReminderEnabled(plan.reminderEnabled);
      if (typeof plan.reminderHour === 'number') setReminderHour(Math.max(0, Math.min(23, plan.reminderHour)));
      const queue = JSON.parse(localStorage.getItem(REVIEW_QUEUE_KEY) || '[]');
      if (Array.isArray(queue)) setQueuedCardIds(queue.filter((id): id is string => typeof id === 'string'));
    } catch {
      // Defaults keep the planner usable when browser storage is unavailable.
    } finally {
      setIsPlanLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!isPlanLoaded) return;
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify({ dailyTarget, weeklyTarget, masteryTarget, reminderEnabled, reminderHour }));
  }, [dailyTarget, isPlanLoaded, masteryTarget, reminderEnabled, reminderHour, weeklyTarget]);

  useEffect(() => {
    if (isPlanLoaded) localStorage.setItem(REVIEW_QUEUE_KEY, JSON.stringify(queuedCardIds.slice(-100)));
  }, [isPlanLoaded, queuedCardIds]);

  useEffect(() => {
    if (!reminderEnabled || !('Notification' in window) || Notification.permission !== 'granted') return;
    const notifyIfDue = () => {
      const now = new Date();
      const day = now.toISOString().slice(0, 10);
      const reminderKey = 'AU_PHARMACY_LAST_REMINDER_V1';
      if (now.getHours() !== reminderHour || localStorage.getItem(reminderKey) === day) return;
      new Notification(isFa ? 'زمان مرور داروسازی' : 'Pharmacy review time', {
        body: isFa ? 'کارت‌های موعددار و هدف روزانه‌تان آماده است.' : 'Your due cards and daily goal are ready.',
      });
      localStorage.setItem(reminderKey, day);
    };
    notifyIfDue();
    const interval = window.setInterval(notifyIfDue, 60_000);
    return () => window.clearInterval(interval);
  }, [isFa, reminderEnabled, reminderHour]);

  const progress = useMemo(() => {
    const today = startOfDay(new Date());
    const week = startOfWeek(new Date());
    const records = Object.values(tracker.studyState.itemRecords || {});
    const completedToday = records.filter((record) => record.completedAt && new Date(record.completedAt) >= today).length;
    const completedWeek = records.filter((record) => record.completedAt && new Date(record.completedAt) >= week).length;
    const completedByModule = records.reduce<Record<number, number>>((totals, record) => {
      if (record.completed) totals[record.moduleId] = (totals[record.moduleId] || 0) + 1;
      return totals;
    }, {});
    return { completedToday, completedWeek, completedByModule };
  }, [tracker.studyState.itemRecords]);

  const dueCards = useMemo(() => {
    const now = Date.now();
    return leitnerCards.filter((card) => !card.nextReviewDate || Number.isNaN(new Date(card.nextReviewDate).getTime()) || new Date(card.nextReviewDate).getTime() <= now);
  }, [leitnerCards]);

  const topics = useMemo(() => {
    const stats = new Map<string, { cards: LeitnerCard[]; incorrect: number; reviewed: number }>();
    leitnerCards.forEach((card) => {
      const label = card.knowledgeTree?.system?.[language] || card.topic || card.category || (isFa ? 'بدون موضوع' : 'Uncategorised');
      const value = stats.get(label) || { cards: [], incorrect: 0, reviewed: 0 };
      value.cards.push(card);
      value.reviewed += card.history?.length || 0;
      value.incorrect += card.history?.filter((item) => item.result === 'incorrect').length || 0;
      stats.set(label, value);
    });
    return [...stats.entries()].map(([label, value]) => ({
      label,
      cards: value.cards,
      incorrect: value.incorrect,
      mastery: value.reviewed ? Math.round(((value.reviewed - value.incorrect) / value.reviewed) * 100) : 0,
      priority: value.incorrect * 4 + value.cards.filter((card) => card.box <= 2).length * 2 + value.cards.filter((card) => queuedCardIds.includes(card.id)).length * 5,
    })).sort((a, b) => b.priority - a.priority || a.mastery - b.mastery);
  }, [isFa, language, leitnerCards, queuedCardIds]);

  const selectedCards = useMemo(() => selectedTopic === 'all' ? leitnerCards : (topics.find((topic) => topic.label === selectedTopic)?.cards || []), [leitnerCards, selectedTopic, topics]);
  const weakTopics = topics.filter((topic) => topic.priority > 0 || topic.mastery < masteryTarget).slice(0, 3);
  const queuedCards = leitnerCards.filter((card) => queuedCardIds.includes(card.id));
  const currentCard = examCards[currentIndex];
  const selectedSession = SESSION_OPTIONS.find((option) => option.minutes === sessionMinutes) || SESSION_OPTIONS[1];

  const requestReminder = async () => {
    if (!('Notification' in window)) return;
    const permission = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission();
    setReminderEnabled(permission === 'granted');
  };

  const persistExam = useCallback((cards: LeitnerCard[], correct: number, secondsLeft: number) => {
    if (!cards.length || examSaved) return;
    const now = new Date();
    const record: QuizHistoryRecord = {
      id: `timed-review-${now.getTime()}`,
      sessionName: 'Focused Review',
      sessionNameFa: 'مرور هدفمند',
      date: now.toISOString().slice(0, 10),
      displayDate: `${now.getMonth() + 1}/${now.getDate()}`,
      totalQuestions: cards.length,
      correctAnswers: correct,
      scorePct: Math.round((correct / cards.length) * 100),
      timeSpentMinutes: Math.max(1, Math.round((sessionMinutes * 60 - secondsLeft) / 60)),
    };
    try {
      const history = JSON.parse(localStorage.getItem(QUIZ_HISTORY_STORAGE_KEY) || '[]');
      localStorage.setItem(QUIZ_HISTORY_STORAGE_KEY, JSON.stringify([...(Array.isArray(history) ? history : []), record].slice(-100)));
    } catch { /* Result remains visible even when storage is unavailable. */ }
    setExamSaved(true);
    onExamComplete();
  }, [examSaved, onExamComplete, sessionMinutes]);

  const finishExam = useCallback(() => {
    setIsExamRunning(false);
    setIsExamComplete(true);
    persistExam(examCards, correctCount, timeLeft);
  }, [correctCount, examCards, persistExam, timeLeft]);

  useEffect(() => {
    if (!isExamRunning || timeLeft <= 0) return;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [isExamRunning, timeLeft]);
  useEffect(() => { if (isExamRunning && timeLeft === 0) finishExam(); }, [finishExam, isExamRunning, timeLeft]);

  const startSession = (minutes = sessionMinutes) => {
    const config = SESSION_OPTIONS.find((option) => option.minutes === minutes) || SESSION_OPTIONS[1];
    const selectedIds = new Set(selectedCards.map((card) => card.id));
    const ordered = [
      ...queuedCards.filter((card) => selectedIds.has(card.id)),
      ...dueCards.filter((card) => selectedIds.has(card.id)),
      ...selectedCards,
    ].filter((card, index, all) => all.findIndex((item) => item.id === card.id) === index)
      .filter((card) => card.question?.[language] && card.answer?.[language])
      .slice(0, config.questions);
    setSessionMinutes(minutes);
    setExamCards(ordered);
    setCurrentIndex(0);
    setCorrectCount(0);
    setTimeLeft(minutes * 60);
    setSelectedOptionId(null);
    setExamSaved(false);
    setIsExamComplete(false);
    setIsExamRunning(ordered.length > 0);
  };

  const answerCurrentCard = (isCorrect: boolean) => {
    if (!currentCard) return;
    const nextCorrect = correctCount + (isCorrect ? 1 : 0);
    setCorrectCount(nextCorrect);
    if (!isCorrect) setQueuedCardIds((ids) => ids.includes(currentCard.id) ? ids : [...ids, currentCard.id]);
    else setQueuedCardIds((ids) => ids.filter((id) => id !== currentCard.id));
    setSelectedOptionId(null);
    if (currentIndex + 1 >= examCards.length) {
      setIsExamRunning(false);
      setIsExamComplete(true);
      persistExam(examCards, nextCorrect, timeLeft);
    } else setCurrentIndex((index) => index + 1);
  };

  return <section className="p-4 rounded-3xl bg-slate-900/90 border border-slate-700/80 shadow-md space-y-4">
    <div className="flex items-start justify-between gap-3"><div><h4 className="text-sm font-extrabold text-slate-100 flex items-center gap-2"><CalendarDays className="w-4 h-4 text-emerald-400" />{isFa ? 'برنامهٔ مطالعه و مرور فصل‌ها' : 'Study plan & chapter review'}</h4><p className="text-[11px] text-slate-400 mt-1">{isFa ? 'برنامه بر پایهٔ فعالیت ثبت‌شده، کارت‌های موعددار و پاسخ‌های غلط شما تنظیم می‌شود.' : 'Your plan uses recorded activity, due cards, and missed answers.'}</p></div><div className="text-[11px] font-mono px-2 py-1 rounded-lg bg-slate-950 text-amber-300 border border-amber-500/20 flex items-center gap-1"><Timer className="w-3.5 h-3.5" />{formatMinutes(timeLeft)}</div></div>

    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
      {[[isFa ? 'هدف امروز' : 'Daily target', progress.completedToday, dailyTarget, setDailyTarget, 5, 50, 5, 'emerald'], [isFa ? 'هدف هفته' : 'Weekly target', progress.completedWeek, weeklyTarget, setWeeklyTarget, 25, 200, 25, 'sky'], [isFa ? 'هدف تسلط' : 'Mastery target', weakTopics.length ? Math.round(weakTopics.reduce((sum, topic) => sum + topic.mastery, 0) / weakTopics.length) : 0, masteryTarget, setMasteryTarget, 50, 95, 5, 'violet']].map(([label, current, target, setter, min, max, step, color]) => <div key={String(label)} className="rounded-2xl p-3 bg-black/35 border border-slate-800 space-y-2"><div className="flex justify-between text-xs font-bold text-slate-200"><span>{String(label)}</span><span className={`text-${color}-400`}>{Number(current)}/{Number(target)}{String(label).includes('تسلط') || String(label).includes('Mastery') ? '%' : ''}</span></div><input aria-label={String(label)} type="range" min={Number(min)} max={Number(max)} step={Number(step)} value={Number(target)} onChange={(event) => (setter as React.Dispatch<React.SetStateAction<number>>)(Number(event.target.value))} className={`w-full accent-${color}-500`} /><div className="h-1.5 rounded-full bg-slate-800 overflow-hidden"><div className={`h-full bg-${color}-500`} style={{ width: `${Math.min(100, Number(current) / Number(target) * 100)}%` }} /></div></div>)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div className="rounded-2xl p-3 bg-amber-500/5 border border-amber-500/20"><div className="flex items-center gap-2 text-xs font-bold text-amber-200"><AlarmClock className="w-4 h-4" />{isFa ? `${dueCards.length} کارت موعددار` : `${dueCards.length} cards due`}</div><p className="mt-1 text-[11px] text-slate-400">{dueCards.length ? (isFa ? 'مرور آن‌ها در جلسهٔ بعدی اولویت دارد.' : 'They are prioritised in your next session.') : (isFa ? 'مرور عقب‌افتاده‌ای ندارید.' : 'No reviews are overdue.')}</p></div>
      <div className="rounded-2xl p-3 bg-rose-500/5 border border-rose-500/20"><div className="flex items-center gap-2 text-xs font-bold text-rose-200"><TriangleAlert className="w-4 h-4" />{isFa ? `صف خطاها: ${queuedCards.length}` : `Missed-answer queue: ${queuedCards.length}`}</div><button type="button" onClick={() => { setSelectedTopic('all'); startSession(5); }} disabled={!queuedCards.length} className="mt-2 text-[11px] text-rose-200 hover:text-white disabled:opacity-40">{isFa ? 'مرور فوری خطاها' : 'Review missed answers'}</button></div>
      <div className="rounded-2xl p-3 bg-sky-500/5 border border-sky-500/20"><div className="flex items-center gap-2 text-xs font-bold text-sky-200"><Bell className="w-4 h-4" />{isFa ? 'یادآور روزانه' : 'Daily reminder'}</div><div className="mt-2 flex items-center gap-2"><button type="button" onClick={requestReminder} className="text-[11px] text-sky-200 hover:text-white">{reminderEnabled ? (isFa ? 'فعال' : 'Enabled') : (isFa ? 'فعال‌سازی' : 'Enable')}</button><input aria-label={isFa ? 'ساعت یادآوری' : 'Reminder hour'} type="number" min="0" max="23" value={reminderHour} onChange={(event) => setReminderHour(Number(event.target.value))} className="w-12 bg-slate-950 border border-slate-700 rounded-lg px-1 py-0.5 text-xs text-slate-200" /><span className="text-[10px] text-slate-400">{isFa ? 'ساعت محلی' : 'local time'}</span></div></div>
    </div>

    <div className="rounded-2xl p-3 bg-black/30 border border-slate-800 space-y-2"><div className="flex items-center gap-2 text-xs font-bold text-slate-200"><BookOpenCheck className="w-4 h-4 text-indigo-300" />{isFa ? 'مرور بر اساس فصل' : 'Review by chapter'}</div><div className="flex gap-2 overflow-x-auto pb-1">{[{ label: isFa ? 'همه فصل‌ها' : 'All chapters', value: 'all' }, ...topics.slice(0, 8).map((topic) => ({ label: `${topic.label} · ${topic.mastery}%`, value: topic.label }))].map((topic) => <button key={topic.value} type="button" onClick={() => setSelectedTopic(topic.value)} className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] border ${selectedTopic === topic.value ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 text-slate-300 hover:border-slate-500'}`}>{topic.label}</button>)}</div>{weakTopics.length > 0 && <p className="text-[11px] text-slate-400">{isFa ? `پیشنهاد این هفته: ${weakTopics.map((topic) => topic.label).join(' • ')}` : `This week's focus: ${weakTopics.map((topic) => topic.label).join(' • ')}`}</p>}</div>

    <div className="rounded-2xl p-3 bg-emerald-500/5 border border-emerald-500/20 flex flex-wrap items-center justify-between gap-3"><div><div className="text-xs font-bold text-emerald-200 flex items-center gap-2"><Target className="w-4 h-4" />{isFa ? 'گزارش هفتگی' : 'Weekly report'}</div><p className="text-[11px] text-slate-400 mt-1">{isFa ? `${progress.completedWeek} مورد تکمیل‌شده؛ ${dueCards.length} مرور در صف؛ ${queuedCards.length} پاسخ برای تثبیت.` : `${progress.completedWeek} items completed; ${dueCards.length} reviews due; ${queuedCards.length} answers to reinforce.`}</p></div>{onOpenLeitnerBox && <button type="button" onClick={onOpenLeitnerBox} className="text-[11px] font-bold text-emerald-200 hover:text-white">{isFa ? 'باز کردن مرور کارت‌ها' : 'Open card review'}</button>}</div>

    {!isExamRunning && !isExamComplete && <div className="grid grid-cols-3 gap-2">{SESSION_OPTIONS.map((option) => <button key={option.minutes} type="button" onClick={() => startSession(option.minutes)} disabled={!selectedCards.length} className={`rounded-xl py-2 text-xs font-bold border ${sessionMinutes === option.minutes ? 'bg-indigo-600 border-indigo-400 text-white' : 'border-slate-700 text-slate-300 hover:border-indigo-400'} disabled:opacity-40`}>{isFa ? `${option.minutes} دقیقه` : `${option.minutes} min`}</button>)}</div>}
    {isExamRunning && currentCard ? <div className="rounded-2xl p-4 bg-indigo-500/10 border border-indigo-500/30 space-y-3"><div className="flex justify-between text-[11px] text-slate-400"><span>{isFa ? `کارت ${currentIndex + 1} از ${examCards.length}` : `Card ${currentIndex + 1} of ${examCards.length}`}</span><span>{currentCard.knowledgeTree?.system?.[language] || currentCard.topic}</span></div><p className="text-sm font-bold text-slate-100 leading-6">{currentCard.question[language]}</p>{currentCard.mcqOptions?.length ? <div className="grid gap-2">{currentCard.mcqOptions.map((option) => <button key={option.id} type="button" onClick={() => setSelectedOptionId(option.id)} className={`text-start p-2 rounded-xl border text-xs ${selectedOptionId === option.id ? 'border-indigo-400 bg-indigo-500/20 text-white' : 'border-slate-700 text-slate-300'}`}>{option.text[language]}</button>)}</div> : <details className="text-xs text-slate-300"><summary className="cursor-pointer text-sky-300">{isFa ? 'نمایش پاسخ' : 'Show answer'}</summary><p className="mt-2">{currentCard.answer[language]}</p></details>}<div className="flex gap-2"><button type="button" onClick={() => answerCurrentCard(Boolean(currentCard.mcqOptions?.find((option) => option.id === selectedOptionId)?.isCorrect))} disabled={Boolean(currentCard.mcqOptions?.length && !selectedOptionId)} className="px-3 py-2 rounded-xl bg-emerald-600 disabled:opacity-40 text-xs font-bold text-white">{isFa ? 'درست بود' : 'Correct'}</button><button type="button" onClick={() => answerCurrentCard(false)} className="px-3 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white">{isFa ? 'نیاز به مرور' : 'Needs review'}</button></div></div> : isExamComplete ? <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/30 text-center space-y-1"><CircleGauge className="w-5 h-5 mx-auto text-emerald-400" /><p className="text-sm font-bold text-slate-100">{isFa ? `نتیجه: ${correctCount} از ${examCards.length}` : `Result: ${correctCount} of ${examCards.length}`}</p><button type="button" onClick={() => { setIsExamComplete(false); startSession(sessionMinutes); }} className="text-[11px] text-emerald-200 hover:text-white flex items-center gap-1 mx-auto"><RotateCcw className="w-3.5 h-3.5" />{isFa ? 'مرور دوباره' : 'Review again'}</button></div> : <button type="button" onClick={() => startSession(selectedSession.minutes)} disabled={!selectedCards.length} className="w-full rounded-2xl py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-extrabold flex justify-center items-center gap-2"><Play className="w-4 h-4" />{isFa ? 'شروع جلسهٔ انتخاب‌شده' : 'Start selected session'}</button>}
  </section>;
};
