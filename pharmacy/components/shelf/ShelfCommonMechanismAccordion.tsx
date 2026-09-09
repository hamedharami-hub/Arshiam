'use client';

import React from 'react';
import { SubCategory } from '@/types/shelf';
import { Language } from '@/types/pharmacy';
import { getCategoryMechanism } from '@/data/mechanismsRegistry';
import { getConceptsForSubCategory } from '@/data/shelf/diseaseHelpers';
import { i18n, t } from '@/lib/i18n';
import { Dna, ChevronDown, FlaskConical, Sparkles, Tag } from 'lucide-react';

interface ShelfCommonMechanismAccordionProps {
  targetId: string;
  activeSubCat: SubCategory;
  isOpen: boolean;
  onToggleOpen: () => void;
  activeMechanismFilter: string;
  onToggleMechanismFilter: (nameEn: string) => void;
  onSelectConceptId: (id: string) => void;
  language: Language;
}

export const ShelfCommonMechanismAccordion: React.FC<ShelfCommonMechanismAccordionProps> = ({
  targetId,
  activeSubCat,
  isOpen,
  onToggleOpen,
  activeMechanismFilter,
  onToggleMechanismFilter,
  onSelectConceptId,
  language,
}) => {
  const isFa = language === 'fa';
  const categoryMech = getCategoryMechanism(targetId);
  if (!categoryMech) return null;

  const concepts = getConceptsForSubCategory(activeSubCat);

  return (
    <div className="app-card border app-border rounded-2xl overflow-hidden shadow-xs transition-all">
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full py-2.5 px-3 sm:px-4 bg-slate-900/60 hover:bg-slate-900/80 flex items-center justify-between gap-2 text-right rtl:text-right cursor-pointer transition-colors border-b app-border"
      >
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <div className="p-1 rounded-lg bg-teal-500/15 text-teal-400 shrink-0">
            <Dna className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs sm:text-sm font-bold text-white whitespace-nowrap">
            {isFa ? '۱. مکانیسم مشترک و تارگت سلولی' : '1. Common Mechanism & Cellular Target'}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-mono font-bold">
            {categoryMech.actionClassification}
          </span>
          <span className="text-[10px] text-teal-300/80 font-mono hidden md:inline truncate max-w-xs">
            ({isFa ? categoryMech.targetPathwayFa : categoryMech.targetPathwayEn})
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[11px] font-semibold text-teal-400 hidden sm:inline">
            {isOpen
              ? isFa
                ? 'بستن'
                : 'Collapse'
              : isFa
              ? 'مشاهده جزئیات'
              : 'Details'}
          </span>
          <div className="p-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300">
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isOpen ? 'rotate-180 text-teal-400' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="p-3 sm:p-3.5 space-y-3 bg-gradient-to-r from-teal-950/20 via-slate-900/40 to-slate-950/60 animate-fadeIn">
          {/* Summary */}
          <div className="text-xs sm:text-[13px] text-slate-200 leading-relaxed bg-black/20 p-2.5 rounded-xl">
            <p>{isFa ? categoryMech.summaryFa : categoryMech.summaryEn}</p>
          </div>

          {/* Key Sub-classes & Enzymes */}
          {categoryMech.keyClasses && categoryMech.keyClasses.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[11px] font-bold text-teal-300 flex items-center gap-1">
                <FlaskConical className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  {isFa
                    ? 'کلاس‌های دارویی و زیر-مکانیسم‌های این دسته (کلیک برای فیلتر سریع یا جزئیات):'
                    : 'Key Drug Sub-Classes & Targets (Click to filter):'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {categoryMech.keyClasses.map((kc, idx) => {
                  const isClassActive = activeMechanismFilter === kc.nameEn;
                  return (
                    <div
                      key={idx}
                      onClick={() => onToggleMechanismFilter(kc.nameEn)}
                      className={`p-2.5 rounded-xl border text-xs transition cursor-pointer flex flex-col justify-between gap-1 shadow-xs ${
                        isClassActive
                          ? 'bg-teal-500/20 border-teal-400 ring-1 ring-teal-400/40'
                          : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 hover:border-teal-500/40'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-white text-xs">
                          {isFa ? kc.nameFa : kc.nameEn}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-teal-500/15 text-teal-300 font-mono font-bold">
                          {kc.actionType.split(' ')[0]}
                        </span>
                      </div>
                      <div className="text-[10px] text-teal-300/90 leading-tight">
                        🎯 {isFa ? kc.mechanismFa : kc.mechanismEn}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate flex items-center justify-between">
                        <span>{t(i18n.common.drugs, language)} {kc.examples}</span>
                        {isClassActive && (
                          <span className="text-teal-300 font-bold">{t(i18n.shelf.activeFilter, language)}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Shared Clinical Concepts */}
          {concepts.length > 0 && (
            <div className="pt-2.5 border-t app-border flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
                {isFa
                  ? 'مفاهیم و عوارض مشترک بالینی (برای ردیابی سایر داروها کلیک کنید):'
                  : 'Shared Clinical Concepts:'}
              </span>
              {concepts.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectConceptId(c.id)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs ${c.badgeColor}`}
                >
                  <Tag className="w-3.5 h-3.5 opacity-80" />
                  <span>{isFa ? c.titleFa : c.titleEn}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
