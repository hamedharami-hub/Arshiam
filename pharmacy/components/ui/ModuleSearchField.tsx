'use client';

import React from 'react';
import { Search, X } from 'lucide-react';
import { Language } from '@/types/pharmacy';

interface LocalizedPlaceholder {
  fa: string;
  en: string;
}

export interface ModuleSearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: LocalizedPlaceholder;
  language: Language;
  trailing?: React.ReactNode;
}

export const ModuleSearchField: React.FC<ModuleSearchFieldProps> = ({
  value,
  onChange,
  placeholder,
  language,
  trailing,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 app-card app-border rounded-2xl border px-3 py-2 flex items-center gap-2">
        <Search className="w-4 h-4 app-muted shrink-0" />
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={isFa ? placeholder.fa : placeholder.en}
          className="flex-1 bg-transparent outline-none text-sm app-text"
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="app-muted hover:opacity-70 cursor-pointer"
            aria-label={isFa ? 'پاک کردن جستجو' : 'Clear search'}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      {trailing}
    </div>
  );
};
