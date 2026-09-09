'use client';

import React, { useState } from 'react';
import { LastStudiedItem, MainStudyModuleId } from '@/types/studyTrack';
import { Language } from '@/types/pharmacy';
import { Compass, ArrowRight, ArrowLeft, Clock, X, ChevronDown, ChevronUp, Sparkles, Play } from 'lucide-react';
import { useStudyTrackerContext } from './StudyTrackerContext';
import { haptic } from '@/lib/haptics';

interface ResumeStudyBannerProps {
  language: Language;
  lastStudied?: LastStudiedItem | null;
  currentModuleId?: MainStudyModuleId;
  onResume: (item: LastStudiedItem) => void;
  className?: string;
}

export const ResumeStudyBanner: React.FC<ResumeStudyBannerProps> = ({
  language,
  lastStudied: propLastStudied,
  currentModuleId,
  onResume,
  className = '',
}) => {
  const [isDismissed, setIsDismissed] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const isFa = language === 'fa';
  const tracker = useStudyTrackerContext();

  const activeLastStudied = propLastStudied !== undefined ? propLastStudied : tracker?.studyState?.lastStudiedGlobal;

  // Do not show resume banner on module 5 (Learning Tools & Mind Map)
  if (currentModuleId === 5 || currentModuleId === (6 as any)) return null;

  if (!tracker?.isLoaded || !activeLastStudied || isDismissed) return null;

  const lastStudied = activeLastStudied;

  // Module Names dictionary
  const moduleNames: Record<number, { fa: string; en: string }> = {
    1: { fa: 'ماژول ۱: تریاژ OTC', en: 'Mod 1: OTC Triage' },
    2: { fa: 'ماژول ۲: قفسه داروها', en: 'Mod 2: Product Shelf' },
    3: { fa: 'ماژول ۳: نسخه پیچی Fred', en: 'Mod 3: Fred Dispense' },
    4: { fa: 'ماژول ۴: فارماکولوژی بالینی', en: 'Mod 4: Clinical Knowledge' },
    5: { fa: 'ماژول ۵: جعبه لایتنر', en: 'Mod 5: Leitner Box' },
  };

  const modBadge = moduleNames[lastStudied.moduleId] || {
    fa: `ماژول ${lastStudied.moduleId}`,
    en: `Module ${lastStudied.moduleId}`,
  };

  const handleQuickResume = () => {
    haptic.success();
    onResume(lastStudied);
  };

  return (
    <div dir={isFa ? 'rtl' : 'ltr'} className={`transition-all animate-fadeIn ${className}`}>
      {/* Compact Micro-Pill Trigger */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <div className="inline-flex items-center gap-1.5 p-1 ps-2.5 pe-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/15 backdrop-blur-md shadow-xs transition-all duration-200">
          <button
            type="button"
            onClick={() => {
              haptic.light();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:text-sky-900 dark:hover:text-white transition cursor-pointer"
          >
            <Compass className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-bold">
              {isFa ? 'ادامه از قبل:' : 'Resume:'}
            </span>
            <span className="text-[11px] font-mono font-black text-sky-800 dark:text-sky-200 truncate max-w-[140px] sm:max-w-[220px]">
              {isFa ? lastStudied.title.fa : lastStudied.title.en}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3 h-3 text-sky-500" />
            ) : (
              <ChevronDown className="w-3 h-3 text-sky-500" />
            )}
          </button>

          {/* Instant Quick Resume Button */}
          <button
            type="button"
            onClick={handleQuickResume}
            className="px-2 py-0.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white text-[10px] font-black flex items-center gap-1 shadow-xs transition cursor-pointer active:scale-95 shrink-0"
            title={isFa ? 'پرش به آخرین مبحث' : 'Jump to last studied'}
          >
            <Play className="w-2.5 h-2.5 fill-white" />
            <span>{isFa ? 'ادامه' : 'Go'}</span>
          </button>

          {/* Dismiss button */}
          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            className="p-0.5 rounded-full text-slate-400 hover:text-slate-200 hover:bg-black/20 transition cursor-pointer shrink-0"
            title={isFa ? 'بستن' : 'Dismiss'}
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Expandable Detail Card (Only visible when user taps the badge) */}
      {isExpanded && (
        <div className="mt-2 p-3 rounded-2xl border border-sky-500/30 app-card shadow-lg bg-slate-900/90 backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-150 space-y-2.5 max-w-lg">
          <div className="flex items-start justify-between gap-2 border-b app-border pb-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-bold text-[10px] border border-sky-500/30 shrink-0">
                {isFa ? modBadge.fa : modBadge.en}
              </span>
              {lastStudied.category && (
                <span className="text-[10px] app-muted truncate">
                  {isFa ? lastStudied.category.fa : lastStudied.category.en}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="text-slate-400 hover:text-white p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          <h4 className="text-xs sm:text-sm font-black app-text leading-snug">
            {isFa ? lastStudied.title.fa : lastStudied.title.en}
          </h4>

          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-[10px] app-muted flex items-center gap-1">
              <Clock className="w-3 h-3 text-sky-400" />
              {isFa ? 'ثبت شده در حافظه مطالعه' : 'Saved in study tracker'}
            </span>

            <button
              type="button"
              onClick={handleQuickResume}
              className="px-3 py-1 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white text-xs font-black shadow-md transition flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>{isFa ? 'ورود به مبحث' : 'Open Topic'}</span>
              {isFa ? (
                <ArrowLeft className="w-3 h-3" />
              ) : (
                <ArrowRight className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
