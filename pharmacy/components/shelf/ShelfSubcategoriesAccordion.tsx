'use client';

import React from 'react';
import { ClinicalDomain, SubCategory } from '@/types/shelf';
import { Language, DiseaseInfo } from '@/types/pharmacy';
import { FormattedClinicalText } from './FormattedClinicalText';
import { getDiseasesForSubCategory } from '@/data/shelf/diseaseHelpers';
import {
  Layers,
  ChevronDown,
  Check,
  Sparkles,
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  Activity,
} from 'lucide-react';

interface ShelfSubcategoriesAccordionProps {
  activeDomain: ClinicalDomain;
  activeSubCat: SubCategory;
  isOpen: boolean;
  onToggleOpen: () => void;
  onSelectSubCatId: (id: string) => void;
  onSelectDisease: (d: DiseaseInfo) => void;
  language: Language;
  hideClinicalProfile?: boolean;
}

export const ShelfSubcategoriesAccordion: React.FC<ShelfSubcategoriesAccordionProps> = ({
  activeDomain,
  activeSubCat,
  isOpen,
  onToggleOpen,
  onSelectSubCatId,
  onSelectDisease,
  language,
  hideClinicalProfile = false,
}) => {
  const isFa = language === 'fa';
  const relatedDiseases = getDiseasesForSubCategory(activeSubCat.id);

  return (
    <div className="space-y-3">
      {/* 1. CLEAN SUBCATEGORY SELECTION CARD */}
      <div className="app-card border app-border rounded-2xl overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={onToggleOpen}
          className="w-full p-3 sm:p-3.5 app-bg hover:bg-black/5 dark:hover:bg-slate-900 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-black app-text truncate">
                {isFa ? activeSubCat.titleFa : activeSubCat.titleEn}
              </h4>
              <p className="text-[10px] app-muted truncate opacity-80 mt-0.5" dir="ltr">
                {activeSubCat.titleEn}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 transition">
              <span>{isOpen ? (isFa ? 'بستن' : 'Close') : (isFa ? 'تغییر زیرمجموعه' : 'Change')}</span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  isOpen ? 'rotate-180 text-sky-500' : ''
                }`}
              />
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="p-3 sm:p-4 border-t app-border bg-black/5 dark:bg-slate-950/40 animate-fadeIn space-y-2.5">
            {/* Wide and spacious subcategory selection grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {activeDomain.subcategories.map((sub) => {
                const isSubSelected = sub.id === activeSubCat.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => {
                      onSelectSubCatId(sub.id);
                      onToggleOpen(); // Collapse back cleanly after selection
                    }}
                    className={`p-2.5 rounded-xl text-start transition-all flex items-center gap-2 cursor-pointer ${
                      isSubSelected
                        ? 'bg-sky-600 text-white border-2 border-sky-400 shadow-xs font-bold'
                        : 'app-bg app-border app-muted hover:app-text hover:bg-black/10 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div
                      className={`p-1.5 rounded-lg shrink-0 ${
                        isSubSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-black/10 dark:bg-slate-800 text-sky-500'
                      }`}
                    >
                      {isSubSelected ? <Check className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs leading-snug truncate">
                        {isFa ? sub.titleFa : sub.titleEn}
                      </div>
                      <div className="text-[10px] opacity-75 truncate" dir="ltr">
                        {sub.titleEn}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* 2. COMPREHENSIVE CLINICAL SPECIFICATIONS, PEARLS & RULES (Only shown when not hidden) */}
      {!hideClinicalProfile && (
        <div className="app-card border app-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm bg-slate-950/40 transition-all">
          <div className="flex items-center justify-between gap-3 border-b app-border pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black app-text flex items-center gap-2">
                  <span>
                    {isFa
                      ? `مشخصات و نکات بالینی: ${activeSubCat.titleFa}`
                      : `Clinical Profile: ${activeSubCat.titleEn}`}
                  </span>
                </h3>
                <p className="text-[11px] text-amber-500/90 dark:text-amber-300/80 mt-0.5" dir="ltr">
                  {activeSubCat.titleEn}
                </p>
              </div>
            </div>
            <span className="text-xs text-sky-500 dark:text-sky-400 font-mono font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 border border-sky-500/30">
              {activeSubCat.id}
            </span>
          </div>

          {/* Wide and readable 3-section clinical columns */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 w-full">
            {/* 1. Clinical Pearls (6 cols on lg) */}
            <div className="col-span-1 lg:col-span-6 rounded-xl border border-sky-500/30 bg-sky-500/5 p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between text-sky-600 dark:text-sky-300 font-bold text-xs sm:text-sm border-b border-sky-500/20 pb-2">
                <span className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  {isFa ? '💡 نکات کلیدی بالینی (Clinical Pearls)' : '💡 Clinical Pearls'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-600 dark:text-sky-300 font-mono font-bold">
                  {(isFa ? activeSubCat.clinicalPearlsFa : activeSubCat.clinicalPearlsEn).length}{' '}
                  {isFa ? 'مورد' : 'items'}
                </span>
              </div>
              <div className="space-y-2 text-xs sm:text-sm app-text">
                {(isFa ? activeSubCat.clinicalPearlsFa : activeSubCat.clinicalPearlsEn).map(
                  (pearl, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 sm:p-3 rounded-xl app-card border border-sky-500/20 flex items-start gap-2.5 leading-relaxed shadow-xs"
                    >
                      <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                      <div className="flex-1 leading-relaxed">
                        <FormattedClinicalText text={pearl} />
                      </div>
                    </div>
                  )
                )}
              </div>
            </div>

            {/* 2. Scheduling Rules (3 cols on lg) */}
            <div className="col-span-1 lg:col-span-3 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-300 font-bold text-xs sm:text-sm border-b border-indigo-500/20 pb-2">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-400" />
                  {isFa ? '🛡️ قوانین جدول‌بندی' : '🛡️ Scheduling Rules'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 font-mono font-bold">
                  SUSMP
                </span>
              </div>
              <div className="p-3 rounded-xl app-card border border-indigo-500/20 text-xs sm:text-sm app-text leading-relaxed shadow-xs">
                <FormattedClinicalText
                  text={isFa ? activeSubCat.schedulingRulesFa : activeSubCat.schedulingRulesEn}
                />
              </div>
            </div>

            {/* 3. Red Flags (3 cols on lg) */}
            <div className="col-span-1 lg:col-span-3 rounded-xl border border-rose-500/30 bg-rose-500/5 p-3.5 sm:p-4 space-y-2.5">
              <div className="flex items-center justify-between text-rose-600 dark:text-rose-300 font-bold text-xs sm:text-sm border-b border-rose-500/20 pb-2">
                <span className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  {isFa ? '🚨 علائم هشدار و ارجاع' : '🚨 Red Flags'}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-600 dark:text-rose-300 font-mono font-bold">
                  {(isFa ? activeSubCat.redFlagsFa : activeSubCat.redFlagsEn).length}{' '}
                  {isFa ? 'مورد' : 'flags'}
                </span>
              </div>
              <div className="space-y-2 text-xs sm:text-sm text-rose-300 dark:text-rose-200">
                {(isFa ? activeSubCat.redFlagsFa : activeSubCat.redFlagsEn).map((flag, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 sm:p-3 rounded-xl bg-rose-950/40 border border-rose-500/25 flex items-start gap-2.5 leading-relaxed shadow-xs"
                  >
                    <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                    <div className="flex-1 leading-relaxed">
                      <FormattedClinicalText text={flag} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Related Diseases Banner */}
          {relatedDiseases.length > 0 && (
            <div className="pt-3 border-t app-border flex flex-wrap items-center gap-2.5">
              <span className="text-xs font-bold text-emerald-500 dark:text-emerald-400 flex items-center gap-1.5 shrink-0">
                <Stethoscope className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{isFa ? 'بیماری‌های مرتبط با این زیرمجموعه:' : 'Related Diseases:'}</span>
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {relatedDiseases.map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    onClick={() => onSelectDisease(d)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-950/50 hover:bg-emerald-900/70 border border-emerald-500/30 text-emerald-200 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer hover:scale-[1.02] shadow-xs"
                  >
                    <Activity className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>
                      {isFa
                        ? d.name.fa.split('(')[0].trim()
                        : d.name.en.split('(')[0].trim()}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
