'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { ChevronDown } from 'lucide-react';
import { haptic } from '@/lib/haptics';
import { Language } from '@/types/pharmacy';

interface LocalizedLabel {
  fa: string;
  en: string;
}

export interface StageSelectorCardProps {
  icon: LucideIcon;
  title: LocalizedLabel;
  subtitleEn?: string;
  badge?: React.ReactNode;
  count?: number;
  changeLabel: LocalizedLabel;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  language: Language;
}

export const StageSelectorCard: React.FC<StageSelectorCardProps> = ({
  icon: Icon,
  title,
  subtitleEn,
  badge,
  count,
  changeLabel,
  isOpen,
  onToggle,
  children,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <div>
      <button
        type="button"
        onClick={() => {
          haptic.light();
          onToggle();
        }}
        className="w-full app-card app-border rounded-2xl border p-3 flex items-center justify-between gap-3 text-start"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-500 flex items-center justify-center shrink-0">
            <Icon className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-bold app-text truncate">
              {isFa ? title.fa : title.en}
            </h4>
            {subtitleEn && (
              <p className="text-[11px] app-muted truncate" dir="ltr">
                {subtitleEn}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {badge}
          {typeof count === 'number' && (
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full app-border border app-muted">
              {count}
            </span>
          )}
          <span className="text-[11px] font-semibold app-muted inline-flex items-center gap-1 rounded-full app-border border px-2 py-0.5">
            {isFa ? changeLabel.fa : changeLabel.en}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </span>
        </div>
      </button>
      {isOpen && <div className="mt-2 space-y-2">{children}</div>}
    </div>
  );
};
