'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { CheckCircle2, BookOpen, Flag, Award, TrendingUp } from 'lucide-react';
import { useStudyTrackerContext } from './study/StudyTrackerContext';

interface StatsBarProps {
  language: Language;
  totalCards: number;
  reviewedCount: number;
  flaggedCount: number;
  quizScorePct: number;
  onOpenAnalytics?: () => void;
}

export const StatsBar: React.FC<StatsBarProps> = ({
  language,
  totalCards,
  reviewedCount,
  flaggedCount,
  quizScorePct,
  onOpenAnalytics,
}) => {
  const isFa = language === 'fa';
  const { getOverallStats, isLoaded } = useStudyTrackerContext();
  const centralStats = getOverallStats();
  const effectiveReviewedCount = isLoaded ? centralStats.completedCount : reviewedCount;
  const effectiveFlaggedCount = isLoaded ? centralStats.flaggedCount : flaggedCount;
  const progressPct = totalCards > 0 ? Math.round((effectiveReviewedCount / totalCards) * 100) : 0;
  const cardClass = 'app-card border app-border rounded-2xl p-2.5 sm:p-3.5 flex items-center justify-between shrink-0 w-[calc(50vw-0.9rem)] min-w-[150px] md:w-auto md:min-w-0 snap-start';
  const clickable = onOpenAnalytics ? 'cursor-pointer transition hover:border-emerald-500/50 hover:bg-emerald-500/5 group' : '';

  return (
    <div className="flex md:grid md:grid-cols-4 gap-2.5 sm:gap-3 overflow-x-auto md:overflow-visible snap-x snap-mandatory no-scrollbar pb-1 md:pb-0">
      <div
        onClick={onOpenAnalytics}
        className={`${cardClass} ${clickable}`}
        title={isFa ? 'برای مشاهده نمودارهای تحلیلی تسلط کلیک کنید' : 'Click to view study mastery analytics'}
      >
        <div>
          <span className="text-[10.5px] sm:text-[11px] font-bold app-muted block flex items-center gap-1">
            <span>{isFa ? 'پیشرفت مطالعه' : 'Study Progress'}</span>
            {onOpenAnalytics && <TrendingUp className="w-3 h-3 text-emerald-400 opacity-70 group-hover:opacity-100 transition" />}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-emerald-400 font-mono">{progressPct}%</span>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
          <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className={cardClass}>
        <div>
          <span className="text-[10.5px] sm:text-[11px] font-bold app-muted block">{isFa ? 'کل مباحث' : 'Total Topics'}</span>
          <span className="text-base sm:text-lg font-extrabold app-text font-mono">{totalCards}</span>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center shrink-0">
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div className={cardClass}>
        <div>
          <span className="text-[10.5px] sm:text-[11px] font-bold app-muted block">{isFa ? 'نکات پرچمدار' : 'Flagged Notes'}</span>
          <span className="text-base sm:text-lg font-extrabold text-rose-400 font-mono">{effectiveFlaggedCount}</span>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
          <Flag className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>

      <div
        onClick={onOpenAnalytics}
        className={`${cardClass} ${clickable.replace('emerald', 'purple')}`}
        title={isFa ? 'برای مشاهده نمودار روند آزمون کلیک کنید' : 'Click to view quiz history trend'}
      >
        <div>
          <span className="text-[10.5px] sm:text-[11px] font-bold app-muted block flex items-center gap-1">
            <span>{isFa ? 'نمره آزمون' : 'Quiz Score'}</span>
            {onOpenAnalytics && <TrendingUp className="w-3 h-3 text-purple-400 opacity-70 group-hover:opacity-100 transition" />}
          </span>
          <span className="text-base sm:text-lg font-extrabold text-purple-400 font-mono">{quizScorePct}%</span>
        </div>
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition">
          <Award className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
      </div>
    </div>
  );
};
