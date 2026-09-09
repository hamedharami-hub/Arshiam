'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import { useStudyTracker } from '@/components/study/StudyTrackerContext';
import { Sparkles, Trophy, CheckCircle2, ChevronUp, ChevronDown, Layers, Award } from 'lucide-react';

interface FloatingStudyProgressPillProps {
  language: Language;
  onOpenLeitner?: () => void;
}

export const FloatingStudyProgressPill: React.FC<FloatingStudyProgressPillProps> = ({
  language,
  onOpenLeitner,
}) => {
  const isFa = language === 'fa';
  const tracker = useStudyTracker();
  const [isExpanded, setIsExpanded] = useState(false);

  const completedMap = tracker?.studyState?.completedMap || {};
  const viewedMap = tracker?.studyState?.viewedMap || {};

  // Calculate activity statistics from study state
  const totalCompleted = Object.values(completedMap).filter(Boolean).length;
  const totalViewed = Object.values(viewedMap).filter(Boolean).length;
  const totalActions = totalCompleted + totalViewed;

  // Breakdown by module key prefix
  const scenarioActions = Object.keys(completedMap).filter((k) => k.startsWith('scenario-') || k.startsWith('triage-')).length;
  const drugActions = Object.keys(completedMap).filter((k) => k.startsWith('drug-') || k.startsWith('prod-')).length;
  const dispenseActions = Object.keys(completedMap).filter((k) => k.startsWith('fred-') || k.startsWith('rx-')).length;
  const leitnerActions = Object.keys(completedMap).filter((k) => k.startsWith('leitner-') || k.startsWith('card-')).length;

  return (
    <div
      className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] start-[calc(1rem+env(safe-area-inset-left,0px))] z-40 select-none animate-in fade-in slide-in-from-bottom-3"
      dir={isFa ? 'rtl' : 'ltr'}
    >
      <div className="relative group">
        {/* Expanded Details Popup Card */}
        {isExpanded && (
          <div className="absolute bottom-full start-0 mb-2 w-64 p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-md text-xs space-y-2.5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-1.5 font-bold text-slate-100">
                <Trophy className="w-4 h-4 text-amber-400" />
                <span>{isFa ? 'پیشرفت مطالعه و تسلط' : 'Study Mastery Progress'}</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {totalCompleted} {isFa ? 'آیتم مسلط' : 'Mastered'} 🔥
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">{isFa ? 'سناریو تریاژ:' : 'Scenarios:'}</span>
                <span className="font-mono font-bold text-emerald-400">{scenarioActions}</span>
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">{isFa ? 'مرور دارو:' : 'Drugs:'}</span>
                <span className="font-mono font-bold text-sky-400">{drugActions}</span>
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">{isFa ? 'نسخه Fred:' : 'Fred Rx:'}</span>
                <span className="font-mono font-bold text-teal-400">{dispenseActions}</span>
              </div>

              <div className="p-2 rounded-xl bg-black/40 border border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">{isFa ? 'کارت لایتنر:' : 'Leitner:'}</span>
                <span className="font-mono font-bold text-purple-400">{leitnerActions}</span>
              </div>
            </div>

            {onOpenLeitner && (
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  onOpenLeitner();
                }}
                className="w-full py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 shadow-md transition cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>{isFa ? 'باز کردن جعبه لایتنر' : 'Open Leitner Spaced Repetition'}</span>
              </button>
            )}
          </div>
        )}

        {/* Floating Capsule Button */}
        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border shadow-xl backdrop-blur-md transition-all cursor-pointer ${
            totalActions > 0
              ? 'bg-slate-900/90 hover:bg-slate-800 border-amber-500/40 text-slate-100 shadow-amber-500/5'
              : 'bg-slate-900/80 hover:bg-slate-800/90 border-slate-700/80 text-slate-300'
          }`}
          title={isFa ? 'مشاهده پیشرفت مطالعه در این نشست' : 'View session study progress'}
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          <span className="text-[11px] font-bold flex items-center gap-1.5">
            <Award className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isFa
                ? `${totalActions} فعالیت امروز`
                : `${totalActions} actions today`}
            </span>
          </span>

          <span className="text-slate-400">
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </span>
        </button>
      </div>
    </div>
  );
};
