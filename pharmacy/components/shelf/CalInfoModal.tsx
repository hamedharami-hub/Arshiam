'use client';

import React, { useEffect } from 'react';
import { CalLabelInfo } from '@/types/shelf';
import { Language } from '@/types/pharmacy';
import { AlertTriangle, Check, X } from 'lucide-react';

interface CalInfoModalProps {
  selectedCalInfo: CalLabelInfo | null;
  language: Language;
  onClose: () => void;
}

export const CalInfoModal: React.FC<CalInfoModalProps> = ({
  selectedCalInfo,
  language,
  onClose,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!selectedCalInfo) return null;
  const isFa = language === 'fa';

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-amber-500/40 rounded-2xl max-w-sm w-full p-4 space-y-3 shadow-2xl bg-slate-900 text-white animate-scaleIn ring-1 ring-amber-500/20"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
          <div className="flex items-center gap-2 min-w-0">
            <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-400 font-mono font-bold text-xs shrink-0">
              {selectedCalInfo.code}
            </span>
            <h4 className="font-bold text-xs sm:text-sm text-amber-200 truncate">
              {selectedCalInfo[isFa ? 'nameFa' : 'nameEn']}
            </h4>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer text-xs shrink-0"
            title={isFa ? 'بستن' : 'Close'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Concise Meaning & Instruction Sentence */}
        <div className="py-1">
          <p
            className="text-xs sm:text-[13px] text-slate-100 leading-relaxed font-medium text-right rtl:text-right ltr:text-left"
            dir={isFa ? 'rtl' : 'ltr'}
          >
            {selectedCalInfo[isFa ? 'descriptionFa' : 'descriptionEn']}
          </p>
        </div>

        {/* Quick Close Button */}
        <div className="pt-1">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-1.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isFa ? 'متوجه شدم' : 'Understood'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

