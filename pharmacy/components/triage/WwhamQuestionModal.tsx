'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '@/types/pharmacy';
import { Scenario, WwhamQuestion } from '@/data/otcScenarios';
import { X, Star, HelpCircle, User, Stethoscope } from 'lucide-react';

interface WwhamQuestionModalProps {
  language: Language;
  scenario: Scenario;
  activeWwhamQuestion: WwhamQuestion | null;
  onClose: () => void;
  isQnaStarred: (qEn: string) => boolean;
  onToggleStarQna: (
    questionEn: string,
    questionFa: string,
    answerEn: string,
    answerFa: string,
    title: string
  ) => void;
}

const emptySubscribe = () => () => {};

export const WwhamQuestionModal: React.FC<WwhamQuestionModalProps> = ({
  language,
  scenario,
  activeWwhamQuestion,
  onClose,
  isQnaStarred,
  onToggleStarQna,
}) => {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!activeWwhamQuestion) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeWwhamQuestion]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!activeWwhamQuestion || !isMounted || typeof document === 'undefined') return null;
  const isFa = language === 'fa';
  const isStarred = isQnaStarred(activeWwhamQuestion.question.en);

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-sky-500/40 rounded-2xl max-w-2xl w-full p-4 sm:p-5 space-y-4 shadow-2xl app-text bg-slate-950 max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-sky-500/20 pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/40 flex items-center justify-center text-sky-400 font-mono font-bold text-xs shrink-0">
              {activeWwhamQuestion.key}
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-slate-100 flex items-center gap-2 truncate">
                <span className="truncate">{isFa ? activeWwhamQuestion.label.fa : activeWwhamQuestion.label.en}</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 shrink-0">
                  WWHAM
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

        {/* Question (Pharmacist) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-sky-950/40 border border-sky-500/30 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-sky-300 font-bold border-b border-sky-500/20 pb-1">
            <span className="flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-sky-400" />
              <span>{isFa ? 'پرسش داروساز (Pharmacist):' : 'Pharmacist Question:'}</span>
            </span>
            <span className="font-mono text-[10px] opacity-75">Rx</span>
          </div>
          <div
            className={`text-xs sm:text-[13.5px] text-slate-100 !leading-[1.7] font-medium ${
              isFa ? 'text-right' : 'text-left font-sans'
            }`}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <span className="text-sky-400 font-bold mr-1 rtl:ml-1 rtl:mr-0">Q:</span>
            {isFa ? activeWwhamQuestion.question.fa : activeWwhamQuestion.question.en}
          </div>
        </div>

        {/* Answer (Patient) */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900 border border-slate-700 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] text-amber-300 font-bold border-b border-white/10 pb-1">
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              <span>{isFa ? 'پاسخ بیمار (Patient):' : 'Patient Response:'}</span>
            </span>
            <span className="font-mono text-[10px] opacity-75">{scenario.patientProfile.name}</span>
          </div>
          <div
            className={`text-xs sm:text-[13.5px] text-slate-100 !leading-[1.7] font-medium ${
              isFa ? 'text-right' : 'text-left font-sans'
            }`}
            dir={isFa ? 'rtl' : 'ltr'}
          >
            <span className="text-amber-400 font-bold mr-1 rtl:ml-1 rtl:mr-0">A:</span>
            {isFa ? activeWwhamQuestion.answer.fa : activeWwhamQuestion.answer.en}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="pt-2 border-t border-white/10 flex flex-wrap items-center justify-between gap-2.5">
          {/* Toggle Star */}
          <button
            type="button"
            onClick={() =>
              onToggleStarQna(
                activeWwhamQuestion.question.en,
                activeWwhamQuestion.question.fa,
                activeWwhamQuestion.answer.en,
                activeWwhamQuestion.answer.fa,
                `WWHAM - ${activeWwhamQuestion.key}`
              )
            }
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
                : isFa ? 'ستاره‌دار کردن این سوال و جواب ⭐' : 'Star this Q&A ⭐'}
            </span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer shadow-md shadow-sky-600/20"
          >
            {isFa ? 'تأیید و بستن' : 'Done & Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
