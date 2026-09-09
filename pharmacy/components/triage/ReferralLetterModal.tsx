'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '@/types/pharmacy';
import { FileCheck, User, Award, Building2, Printer, Copy, CheckCircle2, X } from 'lucide-react';

interface ReferralLetterModalProps {
  language: Language;
  showReferralModal: boolean;
  onClose: () => void;
  pharmacistName: string;
  setPharmacistName: (val: string) => void;
  ahpraRegNumber: string;
  setAhpraRegNumber: (val: string) => void;
  pharmacyName: string;
  setPharmacyName: (val: string) => void;
  generateLetterText: () => string;
  onPrintLetter: () => void;
  onCopyLetter: () => void;
  isCopied: boolean;
}

const emptySubscribe = () => () => {};

export const ReferralLetterModal: React.FC<ReferralLetterModalProps> = ({
  language,
  showReferralModal,
  onClose,
  pharmacistName,
  setPharmacistName,
  ahpraRegNumber,
  setAhpraRegNumber,
  pharmacyName,
  setPharmacyName,
  generateLetterText,
  onPrintLetter,
  onCopyLetter,
  isCopied,
}) => {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!showReferralModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showReferralModal]);

  useEffect(() => {
    if (!showReferralModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showReferralModal, onClose]);

  if (!showReferralModal || !isMounted || typeof document === 'undefined') return null;
  const isFa = language === 'fa';

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-rose-500/50 rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl app-text bg-slate-950 animate-in zoom-in-95 duration-200 my-auto max-h-[92vh] overflow-y-auto custom-scrollbar"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-rose-500/30 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <FileCheck className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-rose-300 truncate">
                {isFa ? 'فرم رسمی ارجاع بالینی به پزشک عمومی (GP Referral Note)' : 'Official GP Clinical Referral Note'}
              </h3>
              <p className="text-[11px] text-slate-400">
                PSA / PBA Australian Standard Referral Form
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

        {/* Editable Pharmacist / Pharmacy Settings Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 p-3 rounded-xl bg-black/40 border border-slate-800 text-xs">
          <div>
            <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-sky-400" />
              <span>{isFa ? 'نام داروساز ارجاع‌دهنده:' : 'Referring Pharmacist:'}</span>
            </label>
            <input
              type="text"
              value={pharmacistName}
              onChange={(e) => setPharmacistName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Award className="w-3 h-3 text-amber-400" />
              <span>{isFa ? 'شماره نظام AHPRA:' : 'AHPRA Reg No:'}</span>
            </label>
            <input
              type="text"
              value={ahpraRegNumber}
              onChange={(e) => setAhpraRegNumber(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-1 flex items-center gap-1">
              <Building2 className="w-3 h-3 text-emerald-400" />
              <span>{isFa ? 'نام داروخانه:' : 'Pharmacy Name:'}</span>
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Letter Preview Block */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono whitespace-pre-wrap leading-relaxed text-slate-200 max-h-80 sm:max-h-96 overflow-y-auto ltr text-left custom-scrollbar border-l-4 border-l-rose-500">
          {generateLetterText()}
        </div>

        {/* Modal Action Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
          <span className="text-[11px] text-slate-400">
            {isFa
              ? 'مطابق فرمت استاندارد انجمن داروسازان استرالیا (PSA Referral Note)'
              : 'In accordance with PSA Referral Note standards'}
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onPrintLetter}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer border border-slate-700"
            >
              <Printer className="w-4 h-4 text-sky-400" />
              <span>{isFa ? 'چاپ (Print)' : 'Print'}</span>
            </button>

            <button
              type="button"
              onClick={onCopyLetter}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
                isCopied
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/20'
              }`}
            >
              {isCopied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{isCopied ? (isFa ? 'کپی شد!' : 'Copied!') : (isFa ? 'کپی متن نامه' : 'Copy Letter')}</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
