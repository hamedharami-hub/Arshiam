'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface LocalizedText {
  fa: string;
  en: string;
}

export interface PanelProps {
  icon?: LucideIcon;
  title?: LocalizedText;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  language: Language;
}

export const Panel: React.FC<PanelProps> = ({
  icon: Icon,
  title,
  right,
  children,
  className,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <div className={`app-card app-border rounded-2xl border p-3 sm:p-4 space-y-3 ${className || ''}`}>
      {title && (
        <div className="flex items-center justify-between gap-2 text-xs font-bold app-text">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 app-muted" />}
            <span>{isFa ? title.fa : title.en}</span>
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
};
