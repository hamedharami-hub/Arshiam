'use client';

import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface LocalizedLabel {
  fa: string;
  en: string;
}

export interface StageEnterButtonProps {
  label: LocalizedLabel;
  onClick: () => void;
  disabled?: boolean;
  icon?: LucideIcon;
  language: Language;
}

export const StageEnterButton: React.FC<StageEnterButtonProps> = ({
  label,
  onClick,
  disabled = false,
  icon: Icon,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full rounded-2xl py-3 text-sm font-extrabold text-white bg-gradient-to-r from-teal-600 to-indigo-600 hover:opacity-95 active:scale-[0.99] transition disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {Icon && <Icon className="w-5 h-5 text-amber-300" />}
      <span>{isFa ? label.fa : label.en}</span>
    </button>
  );
};
