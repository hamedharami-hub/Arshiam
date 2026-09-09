'use client';

import React from 'react';
import { StateStorageRule } from '@/types/shelf';
import { Language } from '@/types/pharmacy';
import { Building2, MapPin, Tag, ShieldCheck } from 'lucide-react';

interface ShelfStateStorageTesterProps {
  selectedState: string;
  onSelectState: (state: string) => void;
  stateStorageRules: StateStorageRule[];
  language: Language;
}

export const ShelfStateStorageTester: React.FC<ShelfStateStorageTesterProps> = ({
  selectedState,
  onSelectState,
  stateStorageRules,
  language,
}) => {
  const isFa = language === 'fa';
  const activeStateRule =
    stateStorageRules.find((r) => r.state === selectedState) || stateStorageRules[0];

  return (
    <div className="app-card border app-border rounded-2xl p-4 sm:p-5 space-y-3 bg-black/30">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b app-border">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm">
          <Building2 className="w-4 h-4 shrink-0" />
          <span>
            {isFa
              ? 'تستر انطباق قوانین نگهداری ایالتی داروهای S2 و S3 (State Storage Laws)'
              : 'State-Based S2 & S3 Storage Compliance Tester'}
          </span>
        </div>

        {/* State Selector Buttons */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[11px]">
          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          {stateStorageRules.map((st) => (
            <button
              key={st.state}
              onClick={() => onSelectState(st.state)}
              className={`px-2.5 py-1 rounded-lg font-bold transition whitespace-nowrap border ${
                selectedState === st.state
                  ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                  : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {st.state}
            </button>
          ))}
        </div>
      </div>

      {/* Selected State Rule Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        {/* S2 Storage Rule */}
        <div
          className={`p-3.5 rounded-xl border space-y-1.5 ${
            activeStateRule.isStrictBehindCounterS2
              ? 'bg-amber-950/20 border-amber-500/40 text-amber-200'
              : 'bg-sky-950/20 border-sky-500/40 text-sky-200'
          }`}
        >
          <div className="flex items-center justify-between font-bold text-xs">
            <span className="flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" />
              {isFa
                ? `قوانین S2 در ایالت ${activeStateRule.nameFa}`
                : `S2 Storage Rule - ${activeStateRule.nameEn}`}
            </span>
            {activeStateRule.isStrictBehindCounterS2 ? (
              <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                {isFa ? 'پشت کانتر (Strict)' : 'Strict Behind-Counter'}
              </span>
            ) : (
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30 font-bold">
                {isFa ? 'دید مستقیم ۴ متری' : '4m Line of Sight'}
              </span>
            )}
          </div>
          <p className="app-muted text-[11px] leading-relaxed">
            {activeStateRule[isFa ? 's2RuleFa' : 's2RuleEn']}
          </p>
        </div>

        {/* S3 Storage Rule */}
        <div className="p-3.5 rounded-xl border bg-emerald-950/20 border-emerald-500/40 text-emerald-200 space-y-1.5">
          <div className="flex items-center justify-between font-bold text-xs">
            <span className="flex items-center gap-1.5 text-emerald-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isFa
                ? `قوانین S3 در ایالت ${activeStateRule.nameFa}`
                : `S3 Storage Rule - ${activeStateRule.nameEn}`}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              {isFa ? 'الزاماً پشت کانتر (All States)' : 'Behind Counter (National)'}
            </span>
          </div>
          <p className="app-muted text-[11px] leading-relaxed">
            {activeStateRule[isFa ? 's3RuleFa' : 's3RuleEn']}
          </p>
        </div>
      </div>
    </div>
  );
};
