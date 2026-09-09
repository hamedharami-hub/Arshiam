'use client';

import React from 'react';
import {
  Stethoscope,
  Boxes,
  Monitor,
  Dna,
  Brain,
} from 'lucide-react';
import { Language } from '@/types/pharmacy';
import { haptic } from '@/lib/haptics';

interface BottomNavProps {
  language: Language;
  activeModule: 1 | 2 | 3 | 4 | 5 | 6;
  onSelectModule: (mod: 1 | 2 | 3 | 4 | 5 | 6) => void;
  leitnerDueCount?: number;
  onOpenAiTutor?: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  language,
  activeModule,
  onSelectModule,
  leitnerDueCount = 0,
  onOpenAiTutor,
}) => {
  const isFa = language === 'fa';

  const navItems = [
    {
      id: 1 as const,
      label: { fa: 'تریاژ', en: 'Triage' },
      icon: Stethoscope,
      activeColor: 'text-emerald-500 dark:text-emerald-400',
      activeBg: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 shadow-xs shadow-emerald-950/20',
      glowColor: 'bg-emerald-500 shadow-emerald-500/50',
    },
    {
      id: 2 as const,
      label: { fa: 'قفسه', en: 'Shelf' },
      icon: Boxes,
      activeColor: 'text-sky-500 dark:text-sky-400',
      activeBg: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/30 shadow-xs shadow-sky-950/20',
      glowColor: 'bg-sky-500 shadow-sky-500/50',
    },
    {
      id: 3 as const,
      label: { fa: 'نسخه‌پیچی', en: 'Dispense' },
      icon: Monitor,
      activeColor: 'text-teal-500 dark:text-teal-400',
      activeBg: 'bg-teal-500/12 text-teal-700 dark:text-teal-300 border-teal-500/30 shadow-xs shadow-teal-950/20',
      glowColor: 'bg-teal-500 shadow-teal-500/50',
    },
    {
      id: 4 as const,
      label: { fa: 'دانش', en: 'Knowledge' },
      icon: Dna,
      activeColor: 'text-indigo-500 dark:text-indigo-400',
      activeBg: 'bg-indigo-500/12 text-indigo-700 dark:text-indigo-300 border-indigo-500/30 shadow-xs shadow-indigo-950/20',
      glowColor: 'bg-indigo-500 shadow-indigo-500/50',
    },
    {
      id: 5 as const,
      label: { fa: 'مرور', en: 'Review' },
      icon: Brain,
      activeColor: 'text-purple-500 dark:text-purple-400',
      activeBg: 'bg-purple-500/12 text-purple-700 dark:text-purple-300 border-purple-500/30 shadow-xs shadow-purple-950/20',
      glowColor: 'bg-purple-500 shadow-purple-500/50',
      badge: leitnerDueCount,
    },
  ];

  return (
    <nav
      aria-label={isFa ? 'ناوبری موبایل' : 'Mobile navigation'}
      className="md:hidden fixed bottom-0 inset-x-0 z-40 app-glass-bottom-nav px-1.5 pt-1 pb-[max(0.35rem,calc(env(safe-area-inset-bottom,0px)*0.85))] select-none"
    >
      <div className="flex items-center justify-around gap-1 max-w-md mx-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                haptic.light();
                onSelectModule(item.id);
              }}
              aria-label={isFa ? item.label.fa : item.label.en}
              aria-current={isActive ? 'page' : undefined}
              className={`flex-1 h-11 px-1 rounded-xl flex flex-col items-center justify-center gap-0.5 transition-all duration-200 cursor-pointer relative active:scale-95 border ${
                isActive
                  ? `${item.activeBg} font-black`
                  : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-black/5 dark:hover:bg-white/5 opacity-80 hover:opacity-100'
              }`}
            >
              {/* Active Indicator Top Micro Pill */}
              {isActive && (
                <span
                  className={`absolute -top-1 w-6 h-0.5 rounded-full ${item.glowColor} shadow-[0_0_8px] animate-in fade-in zoom-in-75 duration-200`}
                />
              )}

              <div className="relative">
                <Icon
                  className={`w-[19px] h-[19px] transition-all duration-200 ${
                    isActive ? `${item.activeColor} scale-105 stroke-[2.4]` : 'stroke-[1.8]'
                  }`}
                />
                {typeof item.badge === 'number' && item.badge > 0 && (
                  <span className="absolute -top-1.5 -end-2.5 px-1 min-w-3.5 h-3.5 rounded-full bg-linear-to-r from-rose-500 to-pink-500 text-white font-mono text-[9px] font-black flex items-center justify-center shadow-xs ring-1 ring-black/20 animate-pulse">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>

              <span
                className={`text-[9.5px] sm:text-[10px] tracking-tight leading-none truncate ${
                  isActive ? 'font-black' : 'font-medium'
                }`}
              >
                {isFa ? item.label.fa : item.label.en}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
