'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  BookOpen,
  Stethoscope,
  Boxes,
  Monitor,
  Brain,
  Sparkles,
  Command,
  ArrowRight,
  CornerDownLeft,
  Settings,
  Sun,
  Moon,
  X,
} from 'lucide-react';
import { Language, PharmacyCard } from '@/types/pharmacy';
import { ALL_PHARMACY_CARDS } from '@/lib/pharmacy-data';

interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  onSelectModule: (mod: 1 | 2 | 3 | 4 | 5 | 6) => void;
  onOpenAiTutor: (prompt?: string) => void;
  onOpenSettings: () => void;
  onSelectCard?: (cardId: string) => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
  language,
  onSelectModule,
  onOpenAiTutor,
  onOpenSettings,
  onSelectCard,
}) => {
  const isFa = language === 'fa';
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }

  // Focus on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          // Open triggered by parent state or listener
        }
      }
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Quick module jump actions
  const quickActions = useMemo(
    () => [
      {
        id: 'mod-1',
        type: 'action' as const,
        title: { fa: 'ورود به ماژول ۱: تریاژ بالینی OTC و پروتکل‌های WWHAM', en: 'Go to Module 1: OTC Triage & WWHAM Protocols' },
        icon: Stethoscope,
        category: { fa: 'ناوبری ماژول‌ها', en: 'Modules' },
        action: () => {
          onSelectModule(1);
          onClose();
        },
      },
      {
        id: 'mod-2',
        type: 'action' as const,
        title: { fa: 'ورود به ماژول ۲: قفسه داروهای S2/S3 و Project Stop', en: 'Go to Module 2: S2/S3 Product Shelf' },
        icon: Boxes,
        category: { fa: 'ناوبری ماژول‌ها', en: 'Modules' },
        action: () => {
          onSelectModule(2);
          onClose();
        },
      },
      {
        id: 'mod-3',
        type: 'action' as const,
        title: { fa: 'ورود به ماژول ۳: شبیه‌ساز نسخه Fred Dispense Plus', en: 'Go to Module 3: Fred Dispense Plus Terminal' },
        icon: Monitor,
        category: { fa: 'ناوبری ماژول‌ها', en: 'Modules' },
        action: () => {
          onSelectModule(3);
          onClose();
        },
      },
      {
        id: 'mod-4',
        type: 'action' as const,
        title: { fa: 'ورود به ماژول ۴: دانشنامه جامع فارماکولوژی استرالیا', en: 'Go to Module 4: Australian Clinical Knowledge Hub' },
        icon: BookOpen,
        category: { fa: 'ناوبری ماژول‌ها', en: 'Modules' },
        action: () => {
          onSelectModule(4);
          onClose();
        },
      },
      {
        id: 'mod-5',
        type: 'action' as const,
        title: { fa: 'ورود به ماژول ۵: جعبه لایتنر هوشمند و فلش‌کارت‌ها', en: 'Go to Module 5: Leitner Spaced Repetition Decks' },
        icon: Brain,
        category: { fa: 'ناوبری ماژول‌ها', en: 'Modules' },
        action: () => {
          onSelectModule(5);
          onClose();
        },
      },
      {
        id: 'action-ai',
        type: 'action' as const,
        title: { fa: 'پرسش فوری از دستیار هوش مصنوعی بالینی (Gemini)', en: 'Ask Clinical AI Tutor (Gemini)' },
        icon: Sparkles,
        category: { fa: 'ابزارهای هوشمند', en: 'Smart Tools' },
        action: () => {
          onOpenAiTutor();
          onClose();
        },
      },
      {
        id: 'action-settings',
        type: 'action' as const,
        title: { fa: 'تنظیمات برنامه، اندازه فونت و حساب کاربری', en: 'App Settings, Font Size & Account' },
        icon: Settings,
        category: { fa: 'سیستم', en: 'System' },
        action: () => {
          onOpenSettings();
          onClose();
        },
      },
    ],
    [onSelectModule, onOpenAiTutor, onOpenSettings, onClose]
  );

  // Search Results Filtering
  const filteredResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return quickActions;
    }

    // Filter Quick Actions
    const matchedActions = quickActions.filter((a) => {
      const titleFa = a.title.fa.toLowerCase();
      const titleEn = a.title.en.toLowerCase();
      return titleFa.includes(q) || titleEn.includes(q);
    });

    // Filter Drug Cards
    const matchedCards = ALL_PHARMACY_CARDS.filter((c) => {
      const tFa = (c.title.fa || '').toLowerCase();
      const tEn = (c.title.en || '').toLowerCase();
      const pFa = (c.actionPearl.fa || '').toLowerCase();
      const pEn = (c.actionPearl.en || '').toLowerCase();
      const catFa = (c.category.fa || '').toLowerCase();
      const catEn = (c.category.en || '').toLowerCase();
      return tFa.includes(q) || tEn.includes(q) || pFa.includes(q) || pEn.includes(q) || catFa.includes(q) || catEn.includes(q);
    }).slice(0, 12).map((c) => ({
      id: c.id,
      type: 'card' as const,
      title: c.title,
      icon: BookOpen,
      category: c.category,
      card: c,
      action: () => {
        onSelectModule(4);
        if (onSelectCard) onSelectCard(c.id);
        onClose();
      },
    }));

    return [...matchedActions, ...matchedCards];
  }, [query, quickActions, onSelectModule, onSelectCard, onClose]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === 'Enter' && filteredResults[selectedIndex]) {
      e.preventDefault();
      filteredResults[selectedIndex].action();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFa ? 'جستجوی سریع سراسری' : 'Global Command Palette'}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-start justify-center p-3 sm:p-6 pt-[10vh] sm:pt-[15vh] animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[75vh] backdrop-blur-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-800 bg-slate-950/60">
          <Search className="w-5 h-5 text-sky-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              isFa
                ? 'جستجوی سریع دارو، تداخل، پروتکل تریاژ یا ماژول... (یا کلیدهای جهتی را بزنید)'
                : 'Search drugs, clinical interactions, triage or modules...'
            }
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-100 placeholder:text-slate-500 font-sans"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-800/80 border border-slate-700 rounded-md">
              ESC
            </kbd>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition"
              aria-label={isFa ? 'بستن' : 'Close'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1 divide-y divide-slate-800/40">
          {filteredResults.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-1">
              <Search className="w-8 h-8 mx-auto text-slate-600 mb-2" />
              <p className="font-bold">{isFa ? 'موردی یافت نشد' : 'No results found'}</p>
              <p className="text-slate-500 text-[11px]">
                {isFa ? 'عبارت جستجو را تغییر دهید یا نام ژنریک دارو را جستجو کنید.' : 'Try searching for generic drug names or topics.'}
              </p>
            </div>
          ) : (
            filteredResults.map((item, idx) => {
              const Icon = item.icon;
              const isSelected = selectedIndex === idx;

              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.action}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between gap-3 text-start transition cursor-pointer ${
                    isSelected
                      ? 'bg-sky-600/20 text-sky-200 border border-sky-500/40 shadow-sm'
                      : 'text-slate-300 hover:bg-slate-800/50 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-sky-500/30 text-sky-300' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">
                        {isFa ? item.title.fa : item.title.en}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {isFa ? item.category.fa : item.category.en}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 text-slate-500">
                    {isSelected && (
                      <span className="flex items-center gap-1 text-[10px] text-sky-400 font-mono">
                        <span>{isFa ? 'انتخاب' : 'Select'}</span>
                        <CornerDownLeft className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Helper */}
        <div className="px-4 py-2.5 bg-slate-950/80 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px]">↑↓</kbd>
              <span>{isFa ? 'حرکت' : 'Navigate'}</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 font-mono text-[9px]">↵</kbd>
              <span>{isFa ? 'انتخاب' : 'Select'}</span>
            </span>
          </div>
          <span className="text-[10px] text-slate-500 font-mono">Australian Pharmacy Hub</span>
        </div>
      </div>
    </div>
  );
};
