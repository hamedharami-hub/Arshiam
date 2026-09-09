'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { ListFilter, ChevronDown, Layers, ShieldCheck, Scale, Check } from 'lucide-react';

interface ShelfGroupingAccordionProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  isGroupedByMechanism: boolean;
  onToggleGroupedByMechanism: () => void;
  sortOrder: 'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE';
  setSortOrder: (order: 'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE') => void;
  selectedSchedule: string;
  setSelectedSchedule: (sched: any) => void;
  substitutionFilter: 'ALL' | 'A_FLAG' | 'NTI';
  setSubstitutionFilter: (val: 'ALL' | 'A_FLAG' | 'NTI') => void;
  language: Language;
}

export const ShelfGroupingAccordion: React.FC<ShelfGroupingAccordionProps> = ({
  isOpen,
  onToggleOpen,
  isGroupedByMechanism,
  onToggleGroupedByMechanism,
  sortOrder,
  setSortOrder,
  selectedSchedule,
  setSelectedSchedule,
  substitutionFilter,
  setSubstitutionFilter,
  language,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="app-card border app-border rounded-2xl overflow-hidden shadow-xs transition-all">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full py-2.5 px-3 sm:px-4 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-between gap-2 text-right rtl:text-right cursor-pointer transition-colors border-b app-border"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="p-1 rounded-lg bg-indigo-500/15 text-indigo-400 shrink-0">
            <ListFilter className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
            {isFa ? '۲. گروه‌بندی و ترتیب نمایش داروها' : '2. Drug Grouping & Display Order'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-300 font-mono font-bold">
            {isGroupedByMechanism
              ? isFa
                ? 'مکانیسم فعال'
                : 'Mechanism Grouping'
              : isFa
              ? 'عادی'
              : 'Standard'}
          </span>
          <span className="text-[10px] text-slate-400 hidden sm:inline">
            ({isFa ? (sortOrder === 'MECHANISM' ? 'مکانیسم اثر' : sortOrder === 'SUBCATEGORY' ? 'زیردسته‌ها' : sortOrder === 'ALPHABETICAL' ? 'الفبایی' : 'Schedule') : sortOrder}
            {selectedSchedule !== 'ALL' ? ` | ${selectedSchedule}` : ''})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-indigo-400 hidden sm:inline">
            {isOpen
              ? isFa
                ? 'بستن'
                : 'Collapse'
              : isFa
              ? 'تنظیم فیلتر و چیدمان'
              : 'Configure'}
          </span>
          <div className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-indigo-400' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 sm:p-3.5 space-y-3 bg-slate-950/40 animate-fadeIn">
          {/* Mechanism Grouping Toggle & Sort Dropdown */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 p-2.5 rounded-xl bg-slate-900/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onToggleGroupedByMechanism}
                className={`text-xs px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                  isGroupedByMechanism
                    ? 'bg-indigo-500 text-white font-black'
                    : 'bg-slate-800 hover:bg-slate-700 text-indigo-300'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>
                  {isGroupedByMechanism
                    ? isFa
                      ? '✓ گروه‌بندی بر اساس مکانیسم فعال'
                      : '✓ Grouped by Mechanism'
                    : isFa
                    ? 'فعال‌سازی گروه‌بندی بر اساس مکانیسم مشترک'
                    : 'Group Shelf by Mechanism'}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-300 font-semibold">
                {isFa ? 'ترتیب مرتب‌سازی داروها:' : 'Sort Order:'}
              </span>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                className="px-2.5 py-1 rounded-lg bg-black/60 border border-slate-700 text-xs text-sky-300 focus:outline-none cursor-pointer"
              >
                <option value="MECHANISM">
                  {isFa ? '🧬 بر اساس مکانیسم اثر (Mechanism)' : '🧬 By Mechanism of Action'}
                </option>
                <option value="SUBCATEGORY">
                  {isFa ? '🏷️ بر اساس زیردسته‌های اصلی' : '🏷️ By Subcategories'}
                </option>
                <option value="ALPHABETICAL">
                  {isFa ? '🔤 به ترتیب الفبا (A-Z)' : '🔤 Alphabetical (A-Z)'}
                </option>
                <option value="SCHEDULE">
                  {isFa ? '🛡️ بر اساس زمان‌بندی (S8->S2)' : '🛡️ By Schedule (S8->S2)'}
                </option>
              </select>
            </div>
          </div>

          {/* Quick Schedule Filter Buttons Row */}
          <div className="pt-2 border-t app-border flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-sky-400 flex items-center gap-1 ml-1 rtl:ml-1 rtl:mr-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              {isFa ? 'فیلتر زمان‌بندی (SUSMP Schedules):' : 'Filter by Schedule:'}
            </span>
            {[
              {
                id: 'ALL',
                labelFa: 'همه داروها (All)',
                labelEn: 'All Schedules',
                color: 'bg-slate-700 text-white',
              },
              {
                id: 'S2',
                labelFa: 'S2 - داروی داروخانه‌ای',
                labelEn: 'S2 - Pharmacy Medicine',
                color: 'bg-sky-500 text-white',
              },
              {
                id: 'S3',
                labelFa: 'S3 - با نظر داروساز',
                labelEn: 'S3 - Pharmacist Only',
                color: 'bg-emerald-500 text-white',
              },
              {
                id: 'S4',
                labelFa: 'S4 - نیازمند نسخه پزشک',
                labelEn: 'S4 - Prescription Only',
                color: 'bg-indigo-500 text-white',
              },
              {
                id: 'S8',
                labelFa: 'S8 - داروی تحت کنترل',
                labelEn: 'S8 - Controlled Drug',
                color: 'bg-rose-500 text-white',
              },
              {
                id: 'Unscheduled',
                labelFa: 'S0/عام - بدون نسخه',
                labelEn: 'S0 / Unscheduled',
                color: 'bg-slate-600 text-white',
              },
            ].map((sched) => {
              const isSel = selectedSchedule === sched.id;
              return (
                <button
                  key={sched.id}
                  onClick={() => setSelectedSchedule(sched.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isSel
                      ? `${sched.color} ring-2 ring-white/40 shadow-md font-black`
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSel && <Check className="w-3 h-3" />}
                  <span>{isFa ? sched.labelFa : sched.labelEn}</span>
                </button>
              );
            })}
          </div>

          {/* Substitution / Bioequivalence Filter */}
          <div className="pt-2 border-t app-border flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-amber-400 flex items-center gap-1 ml-1 rtl:ml-1 rtl:mr-0">
              <Scale className="w-3.5 h-3.5" />
              {isFa
                ? 'فیلتر جایگزینی برند و برابری زیستی (Bioequivalence):'
                : 'Brand Substitution Filter:'}
            </span>
            {[
              {
                id: 'ALL',
                labelFa: 'همه وضعیت‌ها',
                labelEn: 'All Brands',
                color: 'bg-slate-700 text-white',
              },
              {
                id: 'A_FLAG',
                labelFa: 'فقط برابری زیستی A-Flag (قابل جایگزینی)',
                labelEn: 'A-Flag Bioequivalent Only',
                color: 'bg-emerald-600 text-white',
              },
              {
                id: 'NTI',
                labelFa: 'فقط داروهای با پنجره درمانی باریک (NTI)',
                labelEn: 'Narrow Therapeutic Index (NTI)',
                color: 'bg-rose-600 text-white',
              },
            ].map((subFilter) => {
              const isSel = substitutionFilter === subFilter.id;
              return (
                <button
                  key={subFilter.id}
                  type="button"
                  onClick={() => setSubstitutionFilter(subFilter.id as any)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                    isSel
                      ? `${subFilter.color} ring-2 ring-white/40 shadow-md font-black`
                      : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  {isSel && <Check className="w-3 h-3" />}
                  <span>{isFa ? subFilter.labelFa : subFilter.labelEn}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
