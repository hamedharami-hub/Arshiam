'use client';

import React from 'react';
import { Eye, Check, CheckCircle2, Sparkles } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface StudyStatusBadgeProps {
  language: Language;
  viewed: boolean;
  completed: boolean;
  onToggleComplete?: (e: React.MouseEvent) => void;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export const StudyStatusBadge: React.FC<StudyStatusBadgeProps> = ({
  language,
  viewed,
  completed,
  onToggleComplete,
  size = 'md',
  showLabels = false,
  className = '',
}) => {
  const isFa = language === 'fa';

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  const padSizes = {
    sm: 'px-1.5 py-0.5 text-[10px]',
    md: 'px-2 py-1 text-[11px]',
    lg: 'px-2.5 py-1.5 text-xs',
  };

  return (
    <div
      className={`inline-flex items-center gap-1.5 select-none ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      {/* 1. Viewed / Seen Indicator (Automatic) */}
      <span
        title={
          viewed
            ? isFa
              ? 'این بخش مشاهده و مرور شده است'
              : 'This topic has been viewed'
            : isFa
              ? 'هنوز باز و مشاهده نشده'
              : 'Not viewed yet'
        }
        className={`inline-flex items-center gap-1 rounded-lg font-medium transition-all ${
          padSizes[size]
        } ${
          viewed
            ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30'
            : 'bg-slate-800/60 text-slate-500 border border-slate-700/40'
        }`}
      >
        <Eye className={`${iconSizes[size]} ${viewed ? 'text-sky-400' : 'text-slate-500'}`} />
        {showLabels && (
          <span>
            {viewed
              ? isFa
                ? 'دیده شده'
                : 'Viewed'
              : isFa
                ? 'دیده‌نشده'
                : 'Unseen'}
          </span>
        )}
      </span>

      {/* 2. Completed / Mastered Checkbox Button (Manual Click) */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (onToggleComplete) onToggleComplete(e);
        }}
        title={
          completed
            ? isFa
              ? 'تسلط کامل: برای لغو تیک کلیک کنید'
              : 'Mastered! Click to unmark'
            : isFa
              ? 'کلیک کنید: ثبت به عنوان خوانده‌شده و تسلط کامل'
              : 'Click to mark as Mastered / Completed'
        }
        className={`inline-flex items-center gap-1 rounded-lg font-semibold transition-all duration-200 cursor-pointer ${
          padSizes[size]
        } ${
          completed
            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-950 hover:bg-emerald-500/30 active:scale-95'
            : 'bg-slate-800/80 text-slate-400 border border-slate-700/60 hover:text-emerald-300 hover:border-emerald-500/40 hover:bg-emerald-950/30 active:scale-95'
        }`}
      >
        {completed ? (
          <CheckCircle2 className={`${iconSizes[size]} text-emerald-400`} />
        ) : (
          <div
            className={`rounded-full border border-slate-500/70 ${
              size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3 h-3' : 'w-3.5 h-3.5'
            }`}
          />
        )}
        {showLabels && (
          <span>
            {completed
              ? isFa
                ? 'خوانده شد'
                : 'Mastered'
              : isFa
                ? 'ثبت تسلط'
                : 'Mark Read'}
          </span>
        )}
      </button>
    </div>
  );
};
