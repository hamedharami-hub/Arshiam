'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '@/types/pharmacy';
import { StarredPhrase } from './types';
import { Star, X, Search, Trash2, Bookmark, CheckCircle2, Copy } from 'lucide-react';

interface StarredPhrasesModalProps {
  language: Language;
  showStarredModal: boolean;
  onClose: () => void;
  starredPhrases: StarredPhrase[];
  starredSearchTerm: string;
  setStarredSearchTerm: (term: string) => void;
  clearAllStarredPhrases: () => void;
  onCopySinglePhrase: (id: string, textEn?: string, textFa?: string) => void;
  removeStarredPhrase: (id: string) => void;
  copiedPhraseId: string | null;
}

const emptySubscribe = () => () => {};

export const StarredPhrasesModal: React.FC<StarredPhrasesModalProps> = ({
  language,
  showStarredModal,
  onClose,
  starredPhrases,
  starredSearchTerm,
  setStarredSearchTerm,
  clearAllStarredPhrases,
  onCopySinglePhrase,
  removeStarredPhrase,
  copiedPhraseId,
}) => {
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  useEffect(() => {
    if (!showStarredModal) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [showStarredModal]);

  useEffect(() => {
    if (!showStarredModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showStarredModal, onClose]);

  if (!showStarredModal || !isMounted || typeof document === 'undefined') return null;
  const isFa = language === 'fa';

  const term = starredSearchTerm.toLowerCase().trim();
  const filtered = starredPhrases.filter((p) => {
    if (!term) return true;
    return (
      (p.textEn && p.textEn.toLowerCase().includes(term)) ||
      (p.textFa && p.textFa.toLowerCase().includes(term)) ||
      (p.text && p.text.toLowerCase().includes(term)) ||
      (p.secondaryText && p.secondaryText.toLowerCase().includes(term)) ||
      p.scenarioTitle.toLowerCase().includes(term)
    );
  });

  return createPortal(
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-hidden animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-amber-500/40 rounded-2xl max-w-3xl w-full p-4 sm:p-5 space-y-4 shadow-2xl app-text animate-in zoom-in-95 duration-200 max-h-[92vh] overflow-y-auto custom-scrollbar bg-slate-950"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b app-border pb-3 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Star className="w-4.5 h-4.5 fill-amber-400" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-xs sm:text-base text-slate-100 truncate">
                {isFa ? 'جملات و عبارات کلیدی ستاره‌دار (Starred Dialogue)' : 'Starred Dialogue Phrases'}
              </h3>
              <p className="text-[11px] text-slate-400 truncate">
                {isFa
                  ? `${starredPhrases.length} جمله برگزیده جهت مرور و یادگیری اصطلاحات داروسازی`
                  : `${starredPhrases.length} bookmarked phrases for pharmacy practice revision`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border app-border cursor-pointer shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search Bar & Clear All */}
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={starredSearchTerm}
              onChange={(e) => setStarredSearchTerm(e.target.value)}
              placeholder={isFa ? 'جستجو در متن انگلیسی یا فارسی جملات...' : 'Search in starred English or Persian phrases...'}
              className="w-full pl-3 pr-9 py-2 rounded-xl bg-slate-900 border app-border text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
            />
          </div>

          {starredPhrases.length > 0 && (
            <button
              type="button"
              onClick={clearAllStarredPhrases}
              className="px-3 py-2 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{isFa ? 'پاک‌کردن همه' : 'Clear All'}</span>
            </button>
          )}
        </div>

        {/* List of Starred Phrases */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto custom-scrollbar pr-1">
          {filtered.length === 0 ? (
            <div className="p-8 rounded-2xl bg-slate-900/50 border app-border text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400">
                <Bookmark className="w-6 h-6 opacity-60" />
              </div>
              <p className="text-xs text-slate-300 font-semibold">
                {starredPhrases.length === 0
                  ? (isFa ? 'هنوز هیچ جمله‌ای را ستاره‌دار نکرده‌اید.' : 'No starred phrases yet.')
                  : (isFa ? 'موردی مطابق جستجوی شما یافت نشد.' : 'No phrases matching your search.')}
              </p>
              <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                {isFa
                  ? 'در بخش مکالمه با بیمار، می‌توانید با دابل‌کلیک روی هر پیام یا لمس آیکون ⭐، عبارات کاربردی انگلیسی و معادل فارسی آن‌ها را ذخیره نمایید.'
                  : 'During patient conversations, double-click any message bubble or tap the star icon to save important phrases here.'}
              </p>
            </div>
          ) : (
            filtered.map((item) => {
              const isPharm = item.sender === 'pharmacist';
              const isCopied = copiedPhraseId === item.id;

              return (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl bg-slate-900 border app-border hover:border-amber-500/40 transition space-y-2.5 shadow-sm"
                >
                  {/* Meta header */}
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5 text-[10px] font-mono">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md font-bold shrink-0 ${
                          isPharm
                            ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isPharm ? (isFa ? 'داروساز (Rx)' : 'Pharmacist (Rx)') : (isFa ? 'بیمار (Pt)' : 'Patient (Pt)')}
                      </span>
                      <span className="text-slate-400 truncate">
                        {item.scenarioTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Copy button */}
                      <button
                        type="button"
                        onClick={() => onCopySinglePhrase(item.id, item.text, item.secondaryText)}
                        className={`p-1.5 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                          isCopied
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-950 text-slate-300 border-slate-700 hover:text-white hover:border-slate-500'
                        }`}
                        title={isFa ? 'کپی این جمله' : 'Copy phrase'}
                      >
                        {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{isCopied ? (isFa ? 'کپی شد' : 'Copied') : (isFa ? 'کپی' : 'Copy')}</span>
                      </button>

                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={() => removeStarredPhrase(item.id)}
                        className="p-1.5 rounded-lg bg-slate-950 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 transition cursor-pointer"
                        title={isFa ? 'حذف از ستاره‌دارها' : 'Remove star'}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Single text in Active Language */}
                  <div
                    className={`text-xs sm:text-[13px] leading-relaxed text-slate-100 font-medium ${
                      isFa ? 'text-right' : 'text-left font-sans'
                    }`}
                    dir={isFa ? 'rtl' : 'ltr'}
                  >
                    {isFa
                      ? (item.textFa || item.secondaryText || item.textEn || item.text)
                      : (item.textEn || item.text || item.textFa || item.secondaryText)}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t app-border flex items-center justify-between text-xs text-slate-400">
          <span className="text-[11px]">
            {isFa ? 'جملات ذخیره‌شده در مرورگر شما ذخیره و نگهداری می‌شوند.' : 'Starred sentences are saved locally in your browser.'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer border app-border"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
