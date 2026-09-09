'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { ShieldAlert, AlertTriangle } from 'lucide-react';

interface RedFlagsChecklistCardProps {
  language: Language;
  scenario: Scenario;
}

export const RedFlagsChecklistCard: React.FC<RedFlagsChecklistCardProps> = ({
  language,
  scenario,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="app-card border border-rose-500/40 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm bg-slate-900/70">
      <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs sm:text-sm text-rose-300">
            {isFa ? 'پرچم‌های قرمز بالینی (Red Flags Checklist)' : 'Clinical Red Flags Checklist'}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
          {scenario.redFlags.length} Flags
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] text-rose-200/80 leading-relaxed">
          {isFa
            ? 'در صورت مشاهده هر یک از موارد زیر، ارجاع فوری یا غیرفوری به پزشک عمومی (GP) الزامی است:'
            : 'Immediate or urgent GP referral is required upon identifying any of the following clinical signs:'}
        </p>

        <div className="space-y-1.5">
          {scenario.redFlags.map((flag, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-xs flex items-start gap-2 text-rose-100"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{flag[language] || flag.en}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
