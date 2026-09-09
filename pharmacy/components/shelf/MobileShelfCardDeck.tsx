'use client';

import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SubCategory, ClinicalDomain, Product } from '@/types/shelf';
import { Language, DiseaseInfo } from '@/types/pharmacy';
import { FormattedClinicalText } from './FormattedClinicalText';
import { getDiseasesForSubCategory, getConceptsForSubCategory } from '@/data/shelf/diseaseHelpers';
import { getCategoryMechanism, getProductMechanism } from '@/data/mechanismsRegistry';
import { ShelfDrugCard } from './ShelfDrugCard';
import { haptic } from '@/lib/haptics';
import {
  Lightbulb,
  ShieldCheck,
  AlertTriangle,
  Stethoscope,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Pill,
  Activity,
  Layers,
  ArrowLeft,
  Search,
  Dna,
  FlaskConical,
  Tag,
} from 'lucide-react';

import { CAL_LABELS_DICT } from '@/data/shelf/calLabels';

interface MobileShelfCardDeckProps {
  activeDomain: ClinicalDomain;
  activeSubCat: SubCategory;
  products: Product[];
  language: Language;
  onOpenSelector: () => void;
  onSelectDisease: (d: DiseaseInfo) => void;
  onSelectProduct: (p: Product) => void;
  onSelectSchedule?: (schedule: string) => void;
  onSelectMechanism?: (mech: any) => void;
  onSelectCalInfo?: (cal: any) => void;
  onSelectConceptId?: (conceptId: string) => void;
  onOpenProjectStop?: (prod: Product) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
  sortOrder?: 'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE';
  onSelectSortOrder?: (order: 'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE') => void;
}

export const MobileShelfCardDeck: React.FC<MobileShelfCardDeckProps> = ({
  activeDomain,
  activeSubCat,
  products,
  language,
  onOpenSelector,
  onSelectDisease,
  onSelectProduct,
  onSelectSchedule,
  onSelectMechanism,
  onSelectCalInfo,
  onSelectConceptId,
  onOpenProjectStop,
  onNavigateToModule,
  onOpenAiLeitner,
  sortOrder: externalSortOrder,
  onSelectSortOrder,
}) => {
  const isFa = language === 'fa';
  const relatedDiseases = getDiseasesForSubCategory(activeSubCat.id);
  const categoryMech = getCategoryMechanism(activeSubCat.id);
  const concepts = getConceptsForSubCategory(activeSubCat);

  // Deck State:
  // Step 0: Clinical Specifications (Tabs: Pearls=0, Rules=1, RedFlags=2, Mechanism=3)
  // Step 1: Related Diseases & Treatment Matrix
  // Step 2: Medicines / Drugs on the Shelf
  const [verticalStep, setVerticalStep] = useState<0 | 1 | 2>(0);
  const [horizontalSpecTab, setHorizontalSpecTab] = useState<0 | 1 | 2 | 3>(0); // 0: Pearls, 1: Rules, 2: Red Flags, 3: Mechanism
  const [isQuickMechOpen, setIsQuickMechOpen] = useState<boolean>(false);
  const [internalSortOrder, setInternalSortOrder] = useState<'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE'>('SUBCATEGORY');

  const currentSortOrder = externalSortOrder || internalSortOrder;
  const handleSortChange = (order: 'SUBCATEGORY' | 'MECHANISM' | 'ALPHABETICAL' | 'SCHEDULE') => {
    haptic.light();
    setInternalSortOrder(order);
    if (onSelectSortOrder) onSelectSortOrder(order);
  };

  const sortedProducts = React.useMemo(() => {
    const list = [...products];
    if (currentSortOrder === 'MECHANISM') {
      return list.sort((a, b) => {
        const mechA = getProductMechanism(a).classNameEn || '';
        const mechB = getProductMechanism(b).classNameEn || '';
        const comp = mechA.localeCompare(mechB);
        if (comp !== 0) return comp;
        return a.genericName.localeCompare(b.genericName);
      });
    }
    if (currentSortOrder === 'ALPHABETICAL') {
      return list.sort((a, b) => a.genericName.localeCompare(b.genericName));
    }
    if (currentSortOrder === 'SCHEDULE') {
      const schedWeight: Record<string, number> = { S8: 4, S4: 3, S3: 2, S2: 1, Unscheduled: 0 };
      return list.sort((a, b) => (schedWeight[b.schedule] || 0) - (schedWeight[a.schedule] || 0));
    }
    return list;
  }, [products, currentSortOrder]);

  const pearls = isFa ? activeSubCat.clinicalPearlsFa : activeSubCat.clinicalPearlsEn;
  const rules = isFa ? activeSubCat.schedulingRulesFa : activeSubCat.schedulingRulesEn;
  const flags = isFa ? activeSubCat.redFlagsFa : activeSubCat.redFlagsEn;

  return (
    <div
      data-module="2"
      data-category={activeDomain.titleEn}
      data-topic={activeSubCat.titleEn}
      className="space-y-3 pb-6"
    >
      {/* 1. COMPACT TOP CONTROLLER BAR */}
      <div className="app-card border app-border rounded-2xl p-2.5 flex items-center justify-between gap-2 shadow-xs">
        {/* Active Title Pill */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div className="p-1.5 rounded-lg bg-teal-500/15 text-teal-600 dark:text-teal-400 shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-xs font-black app-text truncate leading-tight">
              {isFa ? activeSubCat.titleFa : activeSubCat.titleEn}
            </h3>
            <p className="text-[10px] app-muted truncate" dir="ltr">
              {activeDomain.titleEn}
            </p>
          </div>
        </div>

        {/* Change Selector Button */}
        <button
          type="button"
          onClick={() => {
            haptic.light();
            onOpenSelector();
          }}
          className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
        >
          <Search className="w-3.5 h-3.5" />
          <span>{isFa ? 'تغییر سرفصل' : 'Change'}</span>
        </button>
      </div>

      {/* 2. VERTICAL STEPPER TABS (3 MAIN PHASES) */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-black/20 dark:bg-slate-900 border app-border text-xs">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(0);
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            verticalStep === 0
              ? 'bg-sky-600 text-white shadow-xs'
              : 'app-muted hover:app-text'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{isFa ? '۱. مشخصات سرفصل' : '1. Profile'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(1);
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            verticalStep === 1
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'app-muted hover:app-text'
          }`}
        >
          <Stethoscope className="w-3.5 h-3.5" />
          <span>{isFa ? '۲. بیماری‌ها' : '2. Diseases'}</span>
          <span className="text-[10px] font-mono opacity-80">({relatedDiseases.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(2);
          }}
          className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
            verticalStep === 2
              ? 'bg-teal-600 text-white shadow-xs'
              : 'app-muted hover:app-text'
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          <span>{isFa ? '۳. قفسه داروها' : '3. Shelf'}</span>
          <span className="text-[10px] font-mono opacity-80">({products.length})</span>
        </button>
      </div>

      {/* 3. CARD VIEW CONTAINER WITH SMOOTH ANIMATIONS */}
      <div className="relative min-h-[380px]">
        <AnimatePresence mode="wait">
          {/* STEP 0: CLINICAL SPECIFICATIONS CARDS (PEARLS, MECHANISM, RULES, RED FLAGS) */}
          {verticalStep === 0 && (
            <motion.div
              key={`spec-step-${horizontalSpecTab}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="space-y-3"
            >
              {/* Horizontal Tabs: [ 💡 نکات | 🛡️ قوانین | 🚨 علائم هشدار | 🧬 مکانیسم ] */}
              <div className="grid grid-cols-4 gap-1 p-1 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setHorizontalSpecTab(0);
                  }}
                  className={`py-1.5 rounded-lg font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                    horizontalSpecTab === 0
                      ? 'bg-sky-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Lightbulb className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? 'نکات بالینی' : 'Pearls'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setHorizontalSpecTab(1);
                  }}
                  className={`py-1.5 rounded-lg font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                    horizontalSpecTab === 1
                      ? 'bg-indigo-500 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? 'قوانین' : 'Rules'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setHorizontalSpecTab(2);
                  }}
                  className={`py-1.5 rounded-lg font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                    horizontalSpecTab === 2
                      ? 'bg-rose-600 text-white font-bold shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? 'هشدارها' : 'Red Flags'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setHorizontalSpecTab(3);
                  }}
                  className={`py-1.5 rounded-lg font-bold transition flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer ${
                    horizontalSpecTab === 3
                      ? 'bg-teal-500 text-slate-950 font-black shadow-xs'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Dna className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? 'مکانیسم' : 'Mechanism'}</span>
                </button>
              </div>

              {/* CARD 0: Clinical Pearls */}
              {horizontalSpecTab === 0 && (
                <div className="app-card border border-sky-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md bg-linear-to-b from-sky-950/20 to-transparent">
                  <div className="flex items-center justify-between border-b border-sky-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-sky-400 font-black text-sm">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      <span>{isFa ? 'نکات کلیدی بالینی (Clinical Pearls)' : 'Clinical Pearls'}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300">
                      {pearls.length} {isFa ? 'نکته' : 'items'}
                    </span>
                  </div>

                  <div className="space-y-2.5 select-text">
                    {pearls.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl app-card border border-sky-500/20 flex items-start gap-2.5 leading-relaxed text-xs sm:text-sm app-text shadow-xs select-text"
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                        <div className="flex-1 leading-relaxed select-text">
                          <FormattedClinicalText text={item} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tab Navigation Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t app-border">
                    <span className="text-slate-500 font-mono text-[11px]">1 / 4</span>
                    <button
                      type="button"
                      onClick={() => {
                        haptic.light();
                        setHorizontalSpecTab(1);
                      }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold flex items-center gap-1 cursor-pointer"
                    >
                      <span>{isFa ? 'قوانین SUSMP →' : 'SUSMP Rules →'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* CARD 3: Common Mechanism of Action & Cellular Targets */}
              {horizontalSpecTab === 3 && (
                <div className="app-card border border-teal-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md bg-linear-to-b from-teal-950/20 to-transparent select-text">
                  <div className="flex items-center justify-between border-b border-teal-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-teal-400 font-black text-sm">
                      <Dna className="w-4 h-4 text-teal-400" />
                      <span>{isFa ? 'مکانیسم مشترک و تارگت‌های سلولی' : 'Common Mechanism & Targets'}</span>
                    </div>
                    {categoryMech?.actionClassification && (
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                        {categoryMech.actionClassification}
                      </span>
                    )}
                  </div>

                  {categoryMech ? (
                    <div className="space-y-3">
                      {/* Summary */}
                      <div className="p-3 rounded-xl bg-black/30 border border-teal-500/20 text-xs sm:text-sm text-slate-200 leading-relaxed">
                        <p>{isFa ? categoryMech.summaryFa : categoryMech.summaryEn}</p>
                        {categoryMech.targetPathwayEn && (
                          <div className="mt-2 pt-2 border-t border-teal-500/15 text-[11px] text-teal-300/90 font-mono flex items-center gap-1.5">
                            <span className="text-teal-400 font-bold">🎯 {isFa ? 'مسیر بیولوژیک:' : 'Pathway:'}</span>
                            <span>{isFa ? categoryMech.targetPathwayFa : categoryMech.targetPathwayEn}</span>
                          </div>
                        )}
                      </div>

                      {/* Key Classes & Specific Targets */}
                      {categoryMech.keyClasses && categoryMech.keyClasses.length > 0 && (
                        <div className="space-y-2">
                          <div className="text-xs font-bold text-teal-300 flex items-center gap-1">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                            <span>{isFa ? 'کلاس‌های دارویی و تارگت‌ها:' : 'Drug Sub-Classes & Targets:'}</span>
                          </div>

                          <div className="grid grid-cols-1 gap-2">
                            {categoryMech.keyClasses.map((kc, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs space-y-1"
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-bold text-white text-xs">
                                    {isFa ? kc.nameFa : kc.nameEn}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-teal-500/15 text-teal-300 font-mono font-bold">
                                    {kc.actionType.split(' ')[0]}
                                  </span>
                                </div>
                                <p className="text-[11px] text-teal-200/90 leading-tight">
                                  🎯 {isFa ? kc.mechanismFa : kc.mechanismEn}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  <span className="text-slate-500 font-medium">{isFa ? 'نمونه داروها:' : 'Drugs:'}</span> {kc.examples}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Shared Clinical Concepts */}
                      {concepts.length > 0 && (
                        <div className="pt-2 border-t border-teal-500/15 space-y-1.5">
                          <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{isFa ? 'مفاهیم و عوارض بالینی مشترک:' : 'Shared Clinical Concepts:'}</span>
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {concepts.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                onClick={() => onSelectConceptId && onSelectConceptId(c.id)}
                                className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs ${c.badgeColor}`}
                              >
                                <Tag className="w-3 h-3 opacity-80" />
                                <span>{isFa ? c.titleFa : c.titleEn}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-slate-900/60 text-center text-xs text-slate-400">
                      <p>{isFa ? 'اطلاعات مکانیسم تفصیلی برای این دسته در حال تکمیل است.' : 'Detailed mechanism profile loading.'}</p>
                    </div>
                  )}

                  {/* Tab Navigation Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t app-border">
                    <button
                      type="button"
                      onClick={() => setHorizontalSpecTab(2)}
                      className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      {isFa ? '← علائم هشدار' : '← Red Flags'}
                    </button>
                    <span className="text-slate-500 font-mono text-[11px]">4 / 4</span>
                  </div>
                </div>
              )}
              {horizontalSpecTab === 1 && (
                <div className="app-card border border-indigo-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md bg-linear-to-b from-indigo-950/20 to-transparent select-text">
                  <div className="flex items-center justify-between border-b border-indigo-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-indigo-400 font-black text-sm">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>{isFa ? 'قوانین جدول‌بندی دارویی (SUSMP)' : 'Scheduling Rules'}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                      SUSMP
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl app-card border border-indigo-500/20 text-xs sm:text-sm app-text leading-relaxed shadow-xs select-text">
                    <FormattedClinicalText text={rules} />
                  </div>

                  {/* Tab Navigation Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t app-border">
                    <button
                      type="button"
                      onClick={() => setHorizontalSpecTab(0)}
                      className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
                    >
                      {isFa ? '← نکات بالینی' : '← Pearls'}
                    </button>
                    <span className="text-slate-500 font-mono text-[11px]">2 / 4</span>
                    <button
                      type="button"
                      onClick={() => setHorizontalSpecTab(2)}
                      className="text-rose-400 hover:text-rose-300 font-bold cursor-pointer"
                    >
                      {isFa ? 'علائم هشدار →' : 'Red Flags →'}
                    </button>
                  </div>
                </div>
              )}

              {/* CARD 2: Red Flags */}
              {horizontalSpecTab === 2 && (
                <div className="app-card border border-rose-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-md bg-linear-to-b from-rose-950/20 to-transparent select-text">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-rose-400 font-black text-sm">
                      <AlertTriangle className="w-4 h-4 text-rose-400" />
                      <span>{isFa ? 'علائم خط قرمز و ارجاع فوری (Red Flags)' : 'Red Flags & Referrals'}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                      {flags.length} {isFa ? 'مورد' : 'flags'}
                    </span>
                  </div>

                  <div className="space-y-2.5 select-text">
                    {flags.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/25 flex items-start gap-2.5 leading-relaxed text-xs sm:text-sm text-rose-200 shadow-xs select-text"
                      >
                        <span className="w-2 h-2 rounded-full bg-rose-400 mt-1.5 shrink-0" />
                        <div className="flex-1 leading-relaxed select-text">
                          <FormattedClinicalText text={item} />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Tab Navigation Footer */}
                  <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t app-border">
                    <button
                      type="button"
                      onClick={() => setHorizontalSpecTab(1)}
                      className="text-indigo-400 hover:text-indigo-300 font-bold cursor-pointer"
                    >
                      {isFa ? '← قوانین SUSMP' : '← SUSMP Rules'}
                    </button>
                    <span className="text-slate-500 font-mono text-[11px]">3 / 4</span>
                    <button
                      type="button"
                      onClick={() => setHorizontalSpecTab(3)}
                      className="text-teal-400 hover:text-teal-300 font-bold cursor-pointer"
                    >
                      {isFa ? 'مکانیسم اثر →' : 'Mechanism →'}
                    </button>
                  </div>
                </div>
              )}

              {/* Bottom Quick Jump Button to Step 1 */}
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setVerticalStep(1);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md hover:scale-[1.01] transition cursor-pointer"
              >
                <span>{isFa ? 'مشاهده بیماری‌های مرتبط و پروتکل‌ها' : 'View Related Diseases & Protocols'}</span>
                <ChevronDown className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* STEP 1: RELATED DISEASES & TREATMENT PROTOCOLS */}
          {verticalStep === 1 && (
            <motion.div
              key="diseases-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              <div className="app-card border border-emerald-500/30 rounded-2xl p-4 space-y-3 shadow-md">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-black text-sm">
                    <Stethoscope className="w-4 h-4 text-emerald-400" />
                    <span>{isFa ? 'بیماری‌های مرتبط با این سرفصل' : 'Related Clinical Diseases'}</span>
                  </div>
                  <span className="text-[11px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300">
                    {relatedDiseases.length} {isFa ? 'بیماری' : 'diseases'}
                  </span>
                </div>

                {relatedDiseases.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {isFa ? 'هیچ پروتکل بیماری مستقیمی ثبت نشده است.' : 'No direct clinical diseases mapped.'}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {relatedDiseases.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => {
                          haptic.light();
                          onSelectDisease(d);
                        }}
                        className="w-full p-3 rounded-xl bg-slate-900/80 hover:bg-emerald-950/60 border border-slate-700/60 hover:border-emerald-500/50 text-start transition flex items-center justify-between gap-2.5 cursor-pointer group shadow-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div className="p-2 rounded-lg bg-emerald-500/15 text-emerald-400 shrink-0">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-bold text-xs text-white group-hover:text-emerald-300 truncate">
                              {isFa ? d.name.fa : d.name.en}
                            </h4>
                            <p className="text-[10px] text-slate-400 truncate mt-0.5" dir="ltr">
                              {d.name.en}
                            </p>
                          </div>
                        </div>

                        <div className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 text-[11px] font-bold shrink-0 flex items-center gap-1 group-hover:bg-emerald-600 group-hover:text-white transition">
                          <span>{isFa ? 'پروتکل' : 'View'}</span>
                          <ArrowLeft className="w-3.5 h-3.5 rtl:rotate-0 rotate-180" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Navigation Actions */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setVerticalStep(0)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                  <span>{isFa ? 'بازگشت به نکات بالینی' : 'Back to Profile'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setVerticalStep(2)}
                  className="flex-1 py-2.5 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1 shadow-md cursor-pointer"
                >
                  <span>{isFa ? 'رفتن به قفسه داروها' : 'Go to Medicines'}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: MEDICINES ON THE SHELF (ORGANIZED LIST VIEW) */}
          {verticalStep === 2 && (
            <motion.div
              key="medicines-step"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22 }}
              className="space-y-3"
            >
              {/* QUICK MECHANISM & TARGETS BANNER IN MEDICINES VIEW */}
              {categoryMech && (
                <div className="app-card border border-teal-500/30 rounded-2xl overflow-hidden shadow-xs bg-linear-to-r from-teal-950/30 via-slate-900/40 to-slate-950/60">
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setIsQuickMechOpen((prev) => !prev);
                    }}
                    className="w-full p-2.5 sm:p-3 flex items-center justify-between gap-2 text-start cursor-pointer hover:bg-teal-500/10 transition"
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <div className="p-1.5 rounded-lg bg-teal-500/20 text-teal-400 shrink-0">
                        <Dna className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs font-black text-white">
                            {isFa ? 'مکانیسم مشترک و تارگت‌های دسته دارویی' : 'Common Mechanism & Targets'}
                          </span>
                          {categoryMech.actionClassification && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/20 text-teal-300 font-mono font-bold">
                              {categoryMech.actionClassification}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-teal-300/80 truncate">
                          {isFa ? categoryMech.summaryFa : categoryMech.summaryEn}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-[10px] font-bold text-teal-400">
                        {isQuickMechOpen ? (isFa ? 'بستن' : 'Close') : (isFa ? 'مشاهده مکانیسم' : 'View')}
                      </span>
                      <ChevronDown className={`w-3.5 h-3.5 text-teal-400 transition-transform duration-200 ${isQuickMechOpen ? 'rotate-180' : ''}`} />
                    </div>
                  </button>

                  {isQuickMechOpen && (
                    <div className="p-3 pt-1 border-t border-teal-500/20 space-y-2.5 text-xs animate-fadeIn select-text">
                      <p className="text-slate-200 leading-relaxed text-xs sm:text-[13px]">
                        {isFa ? categoryMech.summaryFa : categoryMech.summaryEn}
                      </p>

                      {categoryMech.keyClasses && categoryMech.keyClasses.length > 0 && (
                        <div className="space-y-1.5 pt-1">
                          <span className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                            <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                            <span>{isFa ? 'کلاس‌ها و زیرمکانیسم‌ها:' : 'Sub-classes & Targets:'}</span>
                          </span>
                          <div className="grid grid-cols-1 gap-1.5">
                            {categoryMech.keyClasses.map((kc, idx) => (
                              <div key={idx} className="p-2 rounded-xl bg-black/40 border border-slate-800 space-y-0.5">
                                <div className="flex items-center justify-between text-xs font-bold text-white">
                                  <span>{isFa ? kc.nameFa : kc.nameEn}</span>
                                  <span className="text-[9px] px-1 rounded bg-teal-500/15 text-teal-300 font-mono">
                                    {kc.actionType}
                                  </span>
                                </div>
                                <div className="text-[11px] text-teal-200/90 leading-tight">
                                  🎯 {isFa ? kc.mechanismFa : kc.mechanismEn}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  <span className="text-slate-500 font-medium">{isFa ? 'داروها:' : 'Drugs:'}</span> {kc.examples}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-2 p-1">
                <div className="flex items-center justify-between text-xs font-bold app-text">
                  <span className="flex items-center gap-1.5 text-teal-400">
                    <Pill className="w-4 h-4" />
                    <span>
                      {isFa
                        ? `لیست داروهای سرفصل (${sortedProducts.length} دارو)`
                        : `Medicines List (${sortedProducts.length})`}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setVerticalStep(0);
                    }}
                    className="text-xs text-sky-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                  >
                    <ChevronUp className="w-3.5 h-3.5" />
                    <span>{isFa ? 'مشخصات کامل' : 'Profile'}</span>
                  </button>
                </div>

                {/* Quick Sorting Pills */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10.5px]">
                  <span className="text-slate-400 font-medium shrink-0 flex items-center gap-0.5">
                    {isFa ? 'مرتب‌سازی:' : 'Sort:'}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSortChange('MECHANISM')}
                    className={`px-2.5 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      currentSortOrder === 'MECHANISM'
                        ? 'bg-teal-500 text-slate-950 border-teal-400 font-black shadow-xs'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-teal-300 border-teal-500/30'
                    }`}
                  >
                    <Dna className="w-3 h-3 shrink-0" />
                    <span>{isFa ? '🧬 مکانیسم اثر' : '🧬 Mechanism'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSortChange('ALPHABETICAL')}
                    className={`px-2 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      currentSortOrder === 'ALPHABETICAL'
                        ? 'bg-sky-500 text-slate-950 border-sky-400 font-black shadow-xs'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{isFa ? '🔤 الفبا (A-Z)' : '🔤 A-Z'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSortChange('SCHEDULE')}
                    className={`px-2 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      currentSortOrder === 'SCHEDULE'
                        ? 'bg-indigo-500 text-white border-indigo-400 font-black shadow-xs'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    <span>{isFa ? '🛡️ زمان‌بندی (S8->S2)' : '🛡️ Schedule'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSortChange('SUBCATEGORY')}
                    className={`px-2 py-1 rounded-lg border font-bold transition shrink-0 flex items-center gap-1 cursor-pointer ${
                      currentSortOrder === 'SUBCATEGORY'
                        ? 'bg-slate-700 text-white border-slate-500 font-bold shadow-xs'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-400 border-slate-800'
                    }`}
                  >
                    <span>{isFa ? 'پیش‌فرض' : 'Default'}</span>
                  </button>
                </div>
              </div>

              {sortedProducts.length === 0 ? (
                <div className="app-card border app-border rounded-2xl p-8 text-center app-muted text-xs space-y-2">
                  <Pill className="w-8 h-8 mx-auto text-slate-600" />
                  <p>{isFa ? 'دارویی در این زیرمجموعه یافت نشد.' : 'No medicines in this subcategory.'}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Clean List of All Drug Cards */}
                  <div className="space-y-3">
                    {sortedProducts.map((prod) => (
                      <ShelfDrugCard
                        key={prod.id}
                        prod={prod}
                        language={language}
                        calLabelsDict={CAL_LABELS_DICT}
                        onSelectSchedule={onSelectSchedule || (() => {})}
                        onSelectMechanism={onSelectMechanism || (() => {})}
                        onSelectCalInfo={onSelectCalInfo || (() => {})}
                        onSelectConceptId={onSelectConceptId || (() => {})}
                        onOpenProjectStop={() => onOpenProjectStop && onOpenProjectStop(prod)}
                        onOpenAiLeitner={onOpenAiLeitner}
                        onNavigateToModule={onNavigateToModule}
                      />
                    ))}
                  </div>

                  {/* Return to specifications button */}
                  <button
                    type="button"
                    onClick={() => {
                      haptic.light();
                      setVerticalStep(0);
                    }}
                    className="w-full py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 hover:bg-slate-800 transition cursor-pointer shadow-xs"
                  >
                    <ChevronUp className="w-4 h-4" />
                    <span>{isFa ? 'بازگشت به نکات بالینی سرفصل' : 'Return to Clinical Profile'}</span>
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
