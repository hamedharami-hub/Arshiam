'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface LocalizedText {
  fa: string;
  en: string;
}

export interface EmptyStateProps {
  icon: LucideIcon;
  title: LocalizedText;
  description?: LocalizedText;
  action?: React.ReactNode;
  language: Language;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="app-card app-border rounded-2xl border border-dashed p-8 sm:p-10 flex flex-col items-center gap-3 text-center">
      <div className="w-12 h-12 rounded-2xl app-card app-border border flex items-center justify-center">
        <Icon className="w-6 h-6 app-muted" />
      </div>
      <h3 className="text-sm font-bold app-text">{isFa ? title.fa : title.en}</h3>
      {description && (
        <p className="text-xs app-muted max-w-md leading-relaxed">
          {isFa ? description.fa : description.en}
        </p>
      )}
      {action}
    </div>
  );
};
