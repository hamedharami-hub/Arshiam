'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { X, ShieldAlert, AlertTriangle, Star } from 'lucide-react';

interface RedFlagsModalProps {
  language: Language;
  scenario: Scenario;
  showRedFlagsModal: boolean;
  onClose: () => void;
  isQnaStarred: (qEn: string) => boolean;
  onToggleStarRedFlags: () => void;
}

const emptySubscribe = () => () => {};

export const RedFlagsModal: React.FC<RedFlagsModalProps> = ({
  language,
  scenario,
  showRedFlagsModal,
  onClose,
  isQnaStarred,
  onToggleStarRedFlags,
}) => {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!showRedFlagsModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showRedFlagsModal]);

  useEffect(() => {
    if (!showRedFlagsModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showRedFlagsModal, onClose]);

  if (!showRedFlagsModal || !isMounted || typeof document === 'undefined') return null;
  const isFa = language === 'fa';
  const isStarred = isQnaStarred(`[Red Flags Check] ${scenario.title.en}`);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-rose-500/40 rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl app-text bg-slate-950 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-rose-500/20 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <ShieldAlert className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{isFa ? 'غربالگری پرچم‌های قرمز و علائم خطر 🚩' : 'Clinical Red Flags & Safety Screening'}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30 shrink-0">
                  Red Flags
                </span>
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isFa ? scenario.title.fa : scenario.title.en}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-800 cursor-pointer shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Screening Question (Pharmacist) */}
        <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-rose-300 font-bold border-b border-rose-500/20 pb-1">
            <span>{isFa ? 'پرسش غربالگری داروساز:' : 'Pharmacist Safety Question:'}</span>
            <span className="font-mono text-[10px] opacity-75">Safety Screen</span>
          </div>
          <div
            className={`text-xs sm:text-[13px] text-slate-100 leading-relaxed font-medium ${
              isFa ? 'text-right' : 'text-left font-sans'
            }`}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            {isFa
              ? 'من باید قبل از هر اقدامی علائم خطرساز را بررسی کنم: آیا تنگی نفس شدید، درد قفسه سینه، بی‌حالی شدید یا علائم هشداردهنده دیگری دارید؟'
              : 'I need to check for any severe clinical red flags before proceeding: Are you experiencing any severe shortness of breath, radiating chest pain, severe systemic malaise, or worsening symptoms?'}
          </div>
        </div>

        {/* Patient Response */}
        <div className="p-3 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5">
          <div className="text-[11px] text-amber-300 font-bold flex items-center justify-between border-b border-white/10 pb-1">
            <span>{isFa ? 'پاسخ و وضعیت بیمار:' : 'Patient Response & Presentation:'}</span>
            <span className="font-mono text-[10px] opacity-75">{scenario.patientProfile.name}</span>
          </div>
          <div
            className={`text-xs text-slate-200 leading-relaxed ${
              isFa ? 'text-right' : 'text-left font-sans'
            }`}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            {isFa ? scenario.patientProfile.presentation.fa : scenario.patientProfile.presentation.en}
          </div>
        </div>

        {/* Red Flags Checklist for this scenario */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>{isFa ? 'چک‌لیست پرچم‌های قرمز اختصاصی این سناریو:' : 'Scenario-Specific Red Flags Checklist:'}</span>
          </span>

          <div className="space-y-1.5 max-h-[180px] overflow-y-auto custom-scrollbar pr-1">
            {scenario.redFlags.map((rf, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs flex items-center justify-between gap-2"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="w-4 h-4 rounded-full bg-rose-500/20 text-rose-400 font-mono text-[10px] flex items-center justify-center font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-rose-100 font-medium truncate">
                    {isFa ? rf.fa : rf.en}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold shrink-0">
                  🚩 {isFa ? 'هشدار' : 'Red Flag'}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          {/* Toggle Star */}
          <button
            type="button"
            onClick={onToggleStarRedFlags}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer border ${
              isStarred
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Star className={`w-4 h-4 ${isStarred ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
            <span>
              {isStarred
                ? isFa ? 'ستاره‌دار شد (حذف ستاره)' : 'Starred (Click to Remove)'
                : isFa ? 'ستاره‌دار کردن چک‌لیست پرچم‌های قرمز ⭐' : 'Star Red Flags Checklist ⭐'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-rose-600/20"
          >
            {isFa ? 'تأیید و بستن' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
