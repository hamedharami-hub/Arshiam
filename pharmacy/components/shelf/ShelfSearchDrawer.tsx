'use client';

import React from 'react';
import { ClinicalDomain, CalLabelInfo } from '@/types/shelf';
import { Language } from '@/types/pharmacy';
import { Search, Tag, Check, AlertTriangle, ShieldCheck, Scale, RotateCcw } from 'lucide-react';

interface ShelfSearchDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  searchInputText: string;
  setSearchInputText: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchDomainScope: string;
  setSearchDomainScope: (val: string) => void;
  searchSubCatScope: string;
  setSearchSubCatScope: (val: string) => void;
  clinicalDomains: ClinicalDomain[];
  calLabelsDict: Record<string, CalLabelInfo>;
  activeScheduleTags: string[];
  toggleScheduleTag: (tag: string) => void;
  activeCalTags: string[];
  toggleCalTag: (tag: string) => void;
  activeSafetyTags: string[];
  toggleSafetyTag: (tag: string) => void;
  substitutionFilter: 'ALL' | 'A_FLAG' | 'NTI';
  setSubstitutionFilter: (val: 'ALL' | 'A_FLAG' | 'NTI') => void;
  selectedSchedule: string;
  setSelectedSchedule: (val: any) => void;
  filteredProductsCount: number;
  resetAllFilters: () => void;
}

export const ShelfSearchDrawer: React.FC<ShelfSearchDrawerProps> = ({
  isOpen,
  onClose,
  language,
  searchInputText,
  setSearchInputText,
  searchQuery,
  setSearchQuery,
  searchDomainScope,
  setSearchDomainScope,
  searchSubCatScope,
  setSearchSubCatScope,
  clinicalDomains,
  calLabelsDict,
  activeScheduleTags,
  toggleScheduleTag,
  activeCalTags,
  toggleCalTag,
  activeSafetyTags,
  toggleSafetyTag,
  substitutionFilter,
  setSubstitutionFilter,
  selectedSchedule,
  setSelectedSchedule,
  filteredProductsCount,
  resetAllFilters,
}) => {
  if (!isOpen) return null;
  const isFa = language === 'fa';

  return (
    <div className="app-card border-2 border-sky-500/50 rounded-2xl p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950/60 shadow-2xl space-y-4 animate-fadeIn">
      <div className="flex items-center justify-between border-b border-sky-500/30 pb-3">
        <div className="flex items-center gap-2 text-sky-400 font-bold text-sm">
          <Search className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            {isFa
              ? 'جستجوی هوشمند در دسته‌ها و زیردسته‌های دارویی'
              : 'Smart Medicine Search Engine'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold"
        >
          ✕ {isFa ? 'بستن پنل جستجو' : 'Close Search'}
        </button>
      </div>

      {/* Search Inputs & Scope Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* 1. Text Query Input with Explicit Search Button */}
        <div className="relative md:col-span-6">
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            {isFa
              ? 'عبارت جستجو (نام دارو، برند، ژنریک، ماده موثره، کاربرد بالینی):'
              : 'Search Query (Brand, Generic, Active Ingredient, Indication):'}
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute right-3 rtl:right-3 rtl:left-auto left-3 rtl:left-auto top-3 text-sky-400 pointer-events-none" />
              <input
                type="text"
                value={searchInputText}
                onChange={(e) => setSearchInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setSearchQuery(searchInputText);
                  }
                }}
                placeholder={
                  isFa
                    ? 'مثال: Sudafed, Paracetamol, سرفه, عفونت, دیابت...'
                    : 'e.g. Sudafed, Paracetamol, Cough, Infection...'
                }
                className="w-full pl-9 rtl:pr-9 rtl:pl-3 pr-3 py-2 rounded-xl border border-sky-500/40 bg-black/60 text-xs text-white focus:outline-none focus:border-sky-400 placeholder:text-slate-500"
                autoFocus
              />
              {searchInputText && (
                <button
                  onClick={() => {
                    setSearchInputText('');
                    setSearchQuery('');
                  }}
                  className="absolute left-3 rtl:left-3 rtl:right-auto right-3 rtl:right-auto top-2.5 text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSearchQuery(searchInputText)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-bold text-xs transition shadow-md shadow-sky-500/20 flex items-center gap-1.5 shrink-0 cursor-pointer"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isFa ? 'جستجو' : 'Search'}</span>
            </button>
          </div>
        </div>

        {/* 2. Domain Scope Selector */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            {isFa ? 'محدوده جستجو در دسته اصلی:' : 'Search Scope (Clinical Domain):'}
          </label>
          <select
            value={searchDomainScope}
            onChange={(e) => {
              setSearchDomainScope(e.target.value);
              setSearchSubCatScope('ALL');
            }}
            className="w-full px-3 py-2 rounded-xl border border-sky-500/40 bg-black/60 text-xs text-white focus:outline-none focus:border-sky-400"
          >
            <option value="ALL">
              {isFa ? '🌐 همه دسته‌های اصلی (All Domains)' : '🌐 All Domains'}
            </option>
            {clinicalDomains.map((domain) => (
              <option key={domain.id} value={domain.id}>
                {isFa ? domain.titleFa : domain.titleEn}
              </option>
            ))}
          </select>
        </div>

        {/* 3. Subcategory Scope Selector */}
        <div className="md:col-span-3">
          <label className="block text-[11px] font-semibold text-slate-300 mb-1">
            {isFa ? 'محدوده جستجو در زیردسته:' : 'Search Scope (Subcategory):'}
          </label>
          <select
            value={searchSubCatScope}
            onChange={(e) => setSearchSubCatScope(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-sky-500/40 bg-black/60 text-xs text-white focus:outline-none focus:border-sky-400"
          >
            <option value="ALL">
              {isFa ? '📂 همه زیردسته‌ها (All Subcategories)' : '📂 All Subcategories'}
            </option>
            {(searchDomainScope === 'ALL'
              ? clinicalDomains.flatMap((d) => d.subcategories)
              : clinicalDomains.find((d) => d.id === searchDomainScope)?.subcategories || []
            ).map((sub) => (
              <option key={sub.id} value={sub.id}>
                {isFa ? sub.titleFa : sub.titleEn}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Clinical & CAL Multi-Attribute Tag Filters inside Search */}
      <div className="pt-3 border-t border-sky-500/20 space-y-2.5">
        {/* Tag Group 1: SUSMP Schedule */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-300 font-semibold flex items-center gap-1 text-[11px] min-w-[120px]">
            <Tag className="w-3 h-3 text-sky-400" />
            {isFa ? 'جداول SUSMP:' : 'SUSMP Schedules:'}
          </span>
          {['S0', 'S2', 'S3', 'S4', 'S8', 'Project Stop'].map((tag) => {
            const isActive = activeScheduleTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleScheduleTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {isActive && <Check className="w-3 h-3" />}
                <span>{tag}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Group 2: CAL Advisory Badges */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-300 font-semibold flex items-center gap-1 text-[11px] min-w-[120px]">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            {isFa ? 'لیبل‌های هشدار CAL:' : 'CAL Advisory Badges:'}
          </span>
          {['CAL 1', 'CAL 4', 'CAL 8', 'CAL 10', 'CAL 12', 'CAL 13', 'CAL A', 'CAL B'].map((calCode) => {
            const isActive = activeCalTags.includes(calCode);
            const info = calLabelsDict[calCode];
            return (
              <button
                key={calCode}
                onClick={() => toggleCalTag(calCode)}
                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm'
                    : 'bg-black/30 border-slate-800 text-amber-400/80 hover:text-amber-300 hover:border-slate-700'
                }`}
                title={info ? info[isFa ? 'nameFa' : 'nameEn'] : calCode}
              >
                {isActive && <Check className="w-2.5 h-2.5" />}
                <span>{calCode}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Group 3: Safety & Clinical Toggles */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-300 font-semibold flex items-center gap-1 text-[11px] min-w-[120px]">
            <ShieldCheck className="w-3 h-3 text-emerald-400" />
            {isFa ? 'فیلترهای بالینی و ایمنی:' : 'Safety & Clinical Toggles:'}
          </span>
          {[
            { key: 'Pregnancy Safe', fa: 'ایمنی در بارداری (Cat A)', en: 'Pregnancy Safe (Cat A)' },
            { key: 'Paediatric Restricted', fa: 'محدودیت کودکان (<6 سال)', en: 'Paediatric Restricted (<6 yrs)' },
            { key: 'TDM Required', fa: 'پایش سطح خونی (TDM Required)', en: 'TDM Required (Narrow NTI)' },
            { key: 'CYP Inhibitor', fa: 'مهارکننده CYP450', en: 'CYP Inhibitor' },
            { key: 'CYP Inducer', fa: 'القاکننده CYP450', en: 'CYP Inducer' },
          ].map((st) => {
            const isActive = activeSafetyTags.includes(st.key);
            return (
              <button
                key={st.key}
                onClick={() => toggleSafetyTag(st.key)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                  isActive
                    ? 'bg-emerald-500 text-white border-emerald-400 shadow-sm'
                    : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {isActive && <Check className="w-3 h-3" />}
                <span>{isFa ? st.fa : st.en}</span>
              </button>
            );
          })}
        </div>

        {/* Tag Group 4: Brand Substitution & Bioequivalence Matrix (A-Flag vs NTI) */}
        <div className="flex items-center gap-2 text-xs flex-wrap pt-2 border-t border-slate-800/80">
          <span className="text-slate-300 font-semibold flex items-center gap-1 text-[11px] min-w-[120px]">
            <Scale className="w-3 h-3 text-amber-400" />
            {isFa ? 'تعویض برند و زیست‌دسترس‌پذیری:' : 'Brand Substitution & Bioequivalence:'}
          </span>
          {[
            { id: 'ALL', fa: 'همه داروها', en: 'All Products' },
            { id: 'A_FLAG', fa: '🟢 A-Flag (جایگزینی ژنریک مجاز)', en: '🟢 A-Flag Bioequivalent' },
            {
              id: 'NTI',
              fa: '🛑 NTI (پنجره باریک درمانی - ممنوعیت تعویض)',
              en: '🛑 NTI (Narrow Therapeutic Index)',
            },
          ].map((subItem) => (
            <button
              key={subItem.id}
              onClick={() => setSubstitutionFilter(subItem.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition flex items-center gap-1 ${
                substitutionFilter === subItem.id
                  ? subItem.id === 'NTI'
                    ? 'bg-rose-600 text-white border-rose-400 shadow-sm'
                    : subItem.id === 'A_FLAG'
                    ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                    : 'bg-sky-600 text-white border-sky-400 shadow-sm'
                  : 'bg-black/30 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
              }`}
            >
              {substitutionFilter === subItem.id && <Check className="w-3 h-3" />}
              <span>{isFa ? subItem.fa : subItem.en}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Schedule Filter Buttons & Status Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-sky-500/20 text-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[11px] text-slate-400 font-semibold">
            {isFa ? 'فیلتر Schedule:' : 'Schedule:'}
          </span>
          {[
            { id: 'ALL', label: 'همه (All)' },
            { id: 'S2', label: 'S2 (Pharmacy)' },
            { id: 'S3', label: 'S3 (Pharmacist Only)' },
            { id: 'S4', label: 'S4 (Prescription)' },
            { id: 'S8', label: 'S8 (Controlled)' },
            { id: 'Unscheduled', label: 'S0 / OTC عام' },
          ].map((sched) => (
            <button
              key={sched.id}
              onClick={() => setSelectedSchedule(sched.id as any)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition border ${
                selectedSchedule === sched.id
                  ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                  : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {sched.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-sky-300 font-mono">
            {isFa
              ? `تعداد یافته‌ها: ${filteredProductsCount} دارو`
              : `Results: ${filteredProductsCount} items`}
          </span>
          <button
            onClick={resetAllFilters}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-[11px] transition flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>{isFa ? 'بازنشانی تمام فیلترها' : 'Reset All Filters'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
