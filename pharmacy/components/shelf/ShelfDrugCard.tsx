'use client';

import React, { useState } from 'react';
import { Product, CalLabelInfo } from '@/types/shelf';
import { DrugMechanismInfo, getProductMechanism } from '@/data/mechanismsRegistry';
import { getConceptsForProduct } from '@/data/shelf/diseaseHelpers';
import { getCalLabelInfo } from '@/data/shelf/calLabels';
import { Language } from '@/types/pharmacy';
import {
  ShieldAlert,
  Dna,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Tag,
  Pill,
  BookOpen,
} from 'lucide-react';
import { haptic } from '@/lib/haptics';

export interface ShelfDrugCardProps {
  prod: Product;
  language: Language;
  calLabelsDict: Record<string, CalLabelInfo>;
  onSelectSchedule: (schedule: string) => void;
  onSelectMechanism: (mech: DrugMechanismInfo) => void;
  onSelectCalInfo: (cal: CalLabelInfo) => void;
  onSelectConceptId: (conceptId: string) => void;
  onOpenProjectStop: () => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
  isExpanded?: boolean;
  isCompared?: boolean;
  onToggleExpand?: () => void;
  onCloseExpand?: () => void;
  onToggleCompare?: (e?: React.MouseEvent) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
}

export const ShelfDrugCard: React.FC<ShelfDrugCardProps> = ({
  prod,
  language,
  calLabelsDict,
  onSelectSchedule,
  onSelectMechanism,
  onSelectCalInfo,
  onSelectConceptId,
  onOpenProjectStop,
  onOpenAiLeitner,
  isExpanded: externalIsExpanded,
  isCompared = false,
  onToggleExpand: externalOnToggleExpand,
  onToggleCompare,
  onNavigateToModule,
}) => {
  const isFa = language === 'fa';
  const prodMech = getProductMechanism(prod);
  const concepts = getConceptsForProduct(prod);

  // Local state for expandable card (default compact/collapsed)
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpandedState = externalIsExpanded !== undefined ? externalIsExpanded : internalExpanded;

  const toggleExpand = () => {
    haptic.light();
    if (externalOnToggleExpand) {
      externalOnToggleExpand();
    } else {
      setInternalExpanded((prev) => !prev);
    }
  };

  const getScheduleBadge = (isCompact = false) => {
    const colorMap = {
      S8: 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30',
      S4: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 hover:bg-indigo-500/30',
      S3: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30',
      S2: 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30',
      Unscheduled: 'bg-slate-500/20 text-slate-300 border-slate-500/40 hover:bg-slate-500/30',
    };

    const labelMap = {
      S8: isCompact ? '🔴 S8 (Controlled)' : '🔴 Schedule 8 (Controlled Drug)',
      S4: isCompact ? '🔵 S4 (Rx Only)' : '🔵 Schedule 4 (Prescription Only)',
      S3: isCompact ? '🟢 S3 (Pharmacist Only)' : '🟢 Schedule 3 (Pharmacist Only)',
      S2: isCompact ? '🔷 S2 (Pharmacy Medicine)' : '🔷 Schedule 2 (Pharmacy Medicine)',
      Unscheduled: isCompact ? '⚪ General Sale' : '⚪ Unscheduled (General Sale)',
    };

    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onSelectSchedule(prod.schedule);
        }}
        className={`text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-md border transition flex items-center gap-1 cursor-pointer shrink-0 ${
          colorMap[prod.schedule] || colorMap.Unscheduled
        }`}
        title={
          isFa
            ? `کلیک جهت فیلتر و مشاهده همه داروهای این دسته (${prod.schedule})`
            : `Click to filter all ${prod.schedule} medicines`
        }
      >
        <span>{labelMap[prod.schedule] || prod.schedule}</span>
      </button>
    );
  };

  const getPregnancyBadge = (compact = false) => {
    if (!prod.tgaPregnancyCategory) return null;
    const cat = prod.tgaPregnancyCategory;
    const badgeStyles: Record<string, string> = {
      A: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      B1: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
      B2: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      B3: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      C: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
      D: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      X: 'bg-red-600/30 text-red-200 border-red-500/60 animate-pulse',
    };

    return (
      <span
        className={`text-[9.5px] sm:text-[10.5px] font-mono font-bold px-1.5 py-0.5 rounded border flex items-center gap-1 shrink-0 ${
          badgeStyles[cat] || badgeStyles.A
        }`}
        title={
          isFa
            ? `رده‌بندی ایمنی در بارداری استرالیا: رده ${cat} TGA`
            : `Australian TGA Pregnancy Category ${cat}`
        }
      >
        <span>🤰 {compact ? `TGA ${cat}` : `TGA Category ${cat}`}</span>
      </span>
    );
  };

  return (
    <div
      onClick={toggleExpand}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleExpand(); } }}
      className={`app-card border rounded-2xl p-3 sm:p-4 transition-all duration-200 flex flex-col justify-between group relative bg-slate-900/90 text-white cursor-pointer shadow-sm hover:shadow-md ${
        isExpandedState
          ? 'border-sky-500/60 ring-1 ring-sky-500/20 space-y-3'
          : 'app-border hover:border-sky-500/40 space-y-2'
      }`}
    >
      {/* 1. TOP HEADER: LEFT-ALIGNED ENGLISH DRUG IDENTITY & EXPAND TOGGLE */}
      <div className="flex items-start justify-between gap-2.5">
        {/* English Drug Identity - Always LTR and Left-Aligned on the Left */}
        <div className="space-y-0.5 text-left flex-1 min-w-0" dir="ltr">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3 className="font-bold text-sm sm:text-base text-white group-hover:text-sky-300 transition leading-snug">
              {prod.brandName}
            </h3>
            {/* Integrated Schedule Badge */}
            {getScheduleBadge(true)}
            {/* TGA Pregnancy Badge */}
            {getPregnancyBadge(true)}
            {prod.requiresProjectStop && (
              <span className="text-[9.5px] sm:text-[10.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold flex items-center gap-1 shrink-0">
                <ShieldAlert className="w-3 h-3 shrink-0" />
                <span>Project Stop</span>
              </span>
            )}
            {prod.isNarrowTherapeuticIndex && (
              <span className="text-[9.5px] sm:text-[10.5px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold flex items-center gap-0.5 shrink-0">
                🛑 NTI
              </span>
            )}
            {prod.aFlagBioequivalent && (
              <span className="text-[9.5px] sm:text-[10.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold flex items-center gap-0.5 shrink-0">
                🟢 A-Flag
              </span>
            )}
          </div>

          <div className="text-xs text-sky-400 font-mono font-medium truncate">
            {prod.genericName} <span className="text-slate-400 font-normal">({prod.packSize})</span>
          </div>
        </div>

        {/* Actions: AI Card Generator & Expand / Collapse Button */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onOpenAiLeitner && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const counselingStr = Array.isArray(prod.counselingPoints)
                  ? prod.counselingPoints.map((c) => (typeof c === 'object' && c ? (isFa ? (c.fa || c.en) : (c.en || c.fa)) : String(c))).join('; ')
                  : '';
                const indFa = typeof prod.indications === 'object' && prod.indications ? prod.indications.fa : String(prod.indications || '');
                const indEn = typeof prod.indications === 'object' && prod.indications ? prod.indications.en : String(prod.indications || '');
                const calStr = Array.isArray(prod.calLabels) ? prod.calLabels.join(', ') : '';
                const drugSnippet = `Drug: ${prod.brandName} (${prod.genericName} ${prod.packSize}). Schedule: ${prod.schedule}. Indications: ${indEn} / ${indFa}. Active Ingredients: ${prod.activeIngredients || ''}. CAL Labels: ${calStr}. NTI: ${prod.isNarrowTherapeuticIndex ? 'Yes' : 'No'}. A-Flag: ${prod.aFlagBioequivalent ? 'Yes' : 'No'}. Counseling: ${counselingStr}`;
                onOpenAiLeitner(
                  drugSnippet,
                  2,
                  `Schedule ${prod.schedule} Medicines`,
                  `${prod.brandName} (${prod.genericName})`
                );
              }}
              className="p-1 sm:p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 text-purple-300 hover:text-white border border-purple-500/40 transition cursor-pointer flex items-center gap-1 text-[10.5px] font-bold"
              title={isFa ? '✨ ساخت کارت لایتنر هوشمند از این دارو' : '✨ Generate AI Leitner Card'}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span className="hidden sm:inline">{isFa ? 'کارت AI' : 'AI Card'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              toggleExpand();
            }}
            className="p-1 sm:p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer shrink-0 flex items-center gap-1 text-[10.5px] font-bold"
            title={isExpandedState ? (isFa ? 'بستن جزئیات' : 'Collapse') : (isFa ? 'مشاهده جزئیات کامل' : 'Expand')}
          >
            <span className="hidden xs:inline">
              {isExpandedState ? (isFa ? 'بستن' : 'Collapse') : (isFa ? 'جزئیات' : 'Details')}
            </span>
            {isExpandedState ? (
              <ChevronUp className="w-3.5 h-3.5 text-sky-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* 2. COMPACT / INITIAL SUMMARY (MINIMAL WORDS & KEYWORDS) */}
      {!isExpandedState ? (
        <div className="space-y-2 pt-0.5">
          {/* Key Indication snippet (Concise) */}
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">
            {(typeof prod.indications === 'object' && prod.indications ? prod.indications[language] : String(prod.indications || ''))}
          </p>

          {/* Quick Tags: Mechanism & CAL Codes */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Mechanism Pill */}
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/15 text-teal-300 border border-teal-500/30 flex items-center gap-1">
                <Dna className="w-3 h-3 text-teal-400 shrink-0" />
                <span className="truncate max-w-[170px] sm:max-w-[220px]">
                  {isFa ? prodMech.classNameFa : prodMech.classNameEn}
                </span>
              </span>

              {/* CAL Codes Badges */}
              {prod.calLabels.length > 0 && (
                <div className="flex items-center gap-1">
                  {prod.calLabels.slice(0, 3).map((calCode) => (
                    <span
                      key={calCode}
                      className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                    >
                      {calCode}
                    </span>
                  ))}
                  {prod.calLabels.length > 3 && (
                    <span className="text-[9px] text-slate-400">+{prod.calLabels.length - 3}</span>
                  )}
                </div>
              )}
            </div>

            <span className="text-[10.5px] text-sky-400 font-bold flex items-center gap-0.5 shrink-0 group-hover:underline">
              <span>{isFa ? 'مشاهده بیشتر' : 'Open'}</span>
              <ChevronDown className="w-3 h-3" />
            </span>
          </div>
        </div>
      ) : (
        /* 3. EXPANDED STATE (FULL DETAILED CARD) */
        <div className="space-y-3 pt-1 border-t border-slate-800 animate-fadeIn">
          {/* Active Ingredients in LTR */}
          <div className="text-left text-xs text-slate-300 font-mono bg-black/40 p-2 rounded-lg border border-slate-800" dir="ltr">
            <span className="text-slate-400 font-semibold">{isFa ? 'ماده موثره:' : 'Active Substance:'} </span>
            <span>{prod.activeIngredients}</span>
          </div>

          {/* Full Indications */}
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-200">
              {isFa ? 'کاربردها و اندیکاسیون‌های بالینی:' : 'Clinical Indications:'}
            </span>
            <p className="text-xs sm:text-[13px] text-slate-300 leading-relaxed">
              {(typeof prod.indications === 'object' && prod.indications ? prod.indications[language] : String(prod.indications || ''))}
            </p>
          </div>

          {/* Interactive Mechanism of Action Button */}
          <div className="w-full">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelectMechanism(prodMech);
              }}
              dir={isFa ? 'rtl' : 'ltr'}
              className="w-full text-start px-3 py-2 rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/35 text-teal-200 text-xs sm:text-sm transition flex items-start justify-between gap-2 group/mech cursor-pointer shadow-xs"
              title={isFa ? 'برای مشاهده جزئیات بیشتر مکانیسم کلیک کنید' : 'Click for more mechanism details'}
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Dna className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span className="text-start leading-relaxed text-xs sm:text-sm font-semibold text-slate-100 flex-1 text-right rtl:text-right ltr:text-left">
                  {isFa ? prodMech.classNameFa : prodMech.classNameEn}
                </span>
              </div>
              <span className="text-xs text-teal-400 font-medium shrink-0 flex items-center gap-0.5 mt-0.5 opacity-90 group-hover/mech:opacity-100 group-hover/mech:underline">
                {isFa ? 'مکانیسم کامل' : 'Details'} ↗
              </span>
            </button>
          </div>

          {/* Brand Substitution & NTI Badges */}
          {(prod.isNarrowTherapeuticIndex || prod.aFlagBioequivalent) && (
            <div className="w-full space-y-1.5">
              {prod.isNarrowTherapeuticIndex ? (
                <div className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {isFa ? '🛑 NTI (ممنوعیت تعویض برند / پایش TDM)' : '🛑 NTI (Narrow Therapeutic Index - Do Not Substitute)'}
                  </span>
                </div>
              ) : prod.aFlagBioequivalent ? (
                <div className="w-full text-xs font-bold px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isFa ? '🟢 A-Flag (جایگزینی ژنریک مجاز)' : '🟢 A-Flag Bioequivalent (Substitution Permitted)'}
                  </span>
                </div>
              ) : null}

              {prod.brandSubstitutionNotice && (
                <p className="text-xs leading-relaxed text-amber-300/90 bg-amber-950/20 p-2 rounded-lg border border-amber-500/20">
                  {(typeof prod.brandSubstitutionNotice === 'object' && prod.brandSubstitutionNotice ? prod.brandSubstitutionNotice[language] : String(prod.brandSubstitutionNotice || ''))}
                </p>
              )}

              {prod.equivalentBrands && prod.equivalentBrands.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 text-xs">
                  <span className="text-slate-400 font-medium">{isFa ? 'برندهای معادل:' : 'Equivalents:'}</span>
                  {prod.equivalentBrands.map((b, i) => (
                    <span
                      key={i}
                      className="px-2 py-0.5 rounded bg-black/40 border border-slate-700 text-sky-300 text-xs font-mono font-bold"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TGA Pregnancy Category Box */}
          {prod.tgaPregnancyCategory && (
            <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                  <span>🤰</span>
                  <span>{isFa ? 'رده‌بندی مصرف در بارداری (TGA Pregnancy Category):' : 'TGA Pregnancy Safety Category:'}</span>
                </span>
                {getPregnancyBadge(false)}
              </div>
              {prod.pregnancyAdvice && (
                <p className="text-xs leading-relaxed text-slate-300 pt-0.5">
                  {typeof prod.pregnancyAdvice === 'object' && prod.pregnancyAdvice
                    ? (isFa ? prod.pregnancyAdvice.fa : prod.pregnancyAdvice.en)
                    : String(prod.pregnancyAdvice || '')}
                </p>
              )}
            </div>
          )}

          {/* CAL Warning Labels */}
          {prod.calLabels.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFa ? 'برچسب‌های هشدار اختصاصی (CAL Labels):' : 'Cautionary Advisory Labels (CAL):'}</span>
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                {prod.calLabels.map((calCode) => {
                  const calInfo = calLabelsDict[calCode] || getCalLabelInfo(calCode);
                  return (
                    <button
                      key={calCode}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (calInfo) onSelectCalInfo(calInfo);
                      }}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 flex items-center gap-1.5 transition cursor-pointer"
                      title={calInfo ? calInfo[isFa ? 'nameFa' : 'nameEn'] : calCode}
                    >
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                      <span>{calCode}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shared Clinical Concepts */}
          {concepts.length > 0 && (
            <div className="space-y-1.5 w-full">
              {concepts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectConceptId(c.id);
                  }}
                  dir={isFa ? 'rtl' : 'ltr'}
                  className="w-full text-start px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/35 text-indigo-100 text-xs sm:text-sm font-medium transition flex items-start gap-2.5 cursor-pointer shadow-xs group/concept"
                >
                  <Sparkles className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5 group-hover/concept:text-amber-300 transition" />
                  <span className="flex-1 text-start leading-relaxed text-right rtl:text-right ltr:text-left font-medium">
                    {isFa ? c.titleFa : c.titleEn}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Key Counseling & Dispensing Points */}
          {prod.counselingPoints && prod.counselingPoints.length > 0 && (
            <div className="space-y-1.5 w-full">
              <span className="text-xs font-bold text-emerald-300">
                {isFa ? 'نکات کلیدی مشاوره و تحویل به بیمار:' : 'Key Counseling & Dispensing Points:'}
              </span>
              {prod.counselingPoints.map((cp, idx) => (
                <div
                  key={idx}
                  dir={isFa ? 'rtl' : 'ltr'}
                  className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/25 flex items-start gap-2 text-xs sm:text-sm text-slate-200 text-right rtl:text-right ltr:text-left shadow-xs"
                >
                  <span className="text-emerald-400 font-bold shrink-0 mt-0.5">•</span>
                  <span className="leading-relaxed flex-1">{cp[language]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Project Stop Action Trigger */}
          {prod.requiresProjectStop && (
            <div className="pt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProjectStop();
                }}
                className="w-full py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white text-xs sm:text-sm transition shadow-md flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShieldAlert className="w-4 h-4" />
                <span>{isFa ? 'اجرای استعلام Project Stop' : 'Run Project Stop Verification'}</span>
              </button>
            </div>
          )}

          {/* Interactive Cross-Module Practice Launcher */}
          {onNavigateToModule && (
            <div className="pt-1 flex flex-wrap items-center gap-2 text-[11px] p-2.5 rounded-xl bg-black/40 border border-slate-700/60">
              <span className="text-slate-400 font-bold">{isFa ? 'تمرین تعاملی این دارو:' : 'Practice Links:'}</span>
              
              {/* If S2 or S3 or OTC indication -> Link to Module 1 */}
              {(prod.schedule === 'S2' || prod.schedule === 'S3' || prod.schedule === 'Unscheduled') && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToModule(1, prod.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-bold hover:bg-emerald-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  🩺 {isFa ? 'تریاژ سرپایی OTC (Module 1)' : 'OTC Triage Scenario (Mod 1)'}
                </button>
              )}

              {/* If Rx S4 or S8 or related to prescription -> Link to Module 4 */}
              {(prod.schedule === 'S4' || prod.schedule === 'S8' || prod.isNarrowTherapeuticIndex || prod.aFlagBioequivalent) && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onNavigateToModule(4);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-teal-600/30 text-teal-300 border border-teal-500/40 font-bold hover:bg-teal-600 hover:text-white transition flex items-center gap-1 cursor-pointer"
                >
                  🖥️ {isFa ? 'شبیه‌ساز نسخه پیچی Fred (Module 4)' : 'Fred Dispense Simulator (Mod 4)'}
                </button>
              )}
            </div>
          )}

          {/* Close / Collapse footer bar */}
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand();
              }}
              className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
            >
              <span>{isFa ? 'بستن جزئیات' : 'Collapse Details'}</span>
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

