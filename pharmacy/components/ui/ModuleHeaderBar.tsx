'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface LocalizedText {
  fa: string;
  en: string;
}

export interface ModuleHeaderBarProps {
  icon: LucideIcon;
  title: LocalizedText;
  subtitle?: LocalizedText;
  accent?: 'teal' | 'sky' | 'emerald' | 'purple';
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  language: Language;
}

const ACCENT_STYLES: Record<NonNullable<ModuleHeaderBarProps['accent']>, string> = {
  teal: 'bg-teal-500/10 text-teal-500',
  sky: 'bg-sky-500/10 text-sky-500',
  emerald: 'bg-emerald-500/10 text-emerald-500',
  purple: 'bg-purple-500/10 text-purple-500',
};

export const ModuleHeaderBar: React.FC<ModuleHeaderBarProps> = ({
  icon: Icon,
  title,
  subtitle,
  accent = 'teal',
  badge,
  actions,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="app-card app-border rounded-2xl border p-3 sm:p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ACCENT_STYLES[accent]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-sm sm:text-base font-extrabold app-text truncate">
              {isFa ? title.fa : title.en}
            </h2>
            {badge}
          </div>
          {subtitle && (
            <p className="text-[11px] app-muted mt-0.5">
              {isFa ? subtitle.fa : subtitle.en}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
};
