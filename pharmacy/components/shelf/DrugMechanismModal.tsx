'use client';

import React, { useEffect } from 'react';
import { Product } from '@/types/shelf';
import { DrugMechanismInfo, getProductMechanism } from '@/data/mechanismsRegistry';
import { Language } from '@/types/pharmacy';
import { Dna, FlaskConical, Target, Zap, Lightbulb, Pill, Layers, X } from 'lucide-react';

interface DrugMechanismModalProps {
  selectedMechanismInfo: DrugMechanismInfo | null;
  products: Product[];
  language: Language;
  onClose: () => void;
  onSelectProduct: (prod: Product) => void;
  onApplyMechanismFilter: (classCode: string) => void;
}

export const DrugMechanismModal: React.FC<DrugMechanismModalProps> = ({
  selectedMechanismInfo,
  products,
  language,
  onClose,
  onSelectProduct,
  onApplyMechanismFilter,
}) => {
  useEffect(() => {
    if (!selectedMechanismInfo) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMechanismInfo, onClose]);

  if (!selectedMechanismInfo) return null;
  const isFa = language === 'fa';

  const sharedProducts = products.filter(
    (p) => getProductMechanism(p).classCode === selectedMechanismInfo.classCode
  );

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-teal-500/50 rounded-2xl max-w-3xl w-full p-4 sm:p-6 space-y-4 shadow-2xl app-text my-auto max-h-[92vh] flex flex-col bg-slate-950/95 text-white animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-teal-500/30 pb-3 shrink-0 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
              <Dna className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white truncate">
                  {isFa ? selectedMechanismInfo.classNameFa : selectedMechanismInfo.classNameEn}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/40 font-mono font-bold shrink-0">
                  {selectedMechanismInfo.actionClassification}
                </span>
              </div>
              <p className="text-xs text-teal-300/80 font-mono mt-0.5 truncate">
                {selectedMechanismInfo.classNameEn}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-700 cursor-pointer shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body with Mechanism Details and Shared Products */}
        <div className="overflow-y-auto space-y-3.5 pr-1 text-xs sm:text-sm custom-scrollbar" dir={isFa ? 'rtl' : 'ltr'}>
          {/* Simple Clean Mechanism Description */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-900/90 border border-teal-500/30 space-y-2">
            <span className="text-xs sm:text-sm font-bold text-teal-300 flex items-center gap-2">
              <FlaskConical className="w-4 h-4 text-teal-400" />
              <span>{isFa ? 'نحوه اثر و مکانیسم فارماکولوژی:' : 'Mechanism of Action:'}</span>
            </span>
            <p className="text-slate-100 text-xs sm:text-sm leading-relaxed font-medium text-right rtl:text-right ltr:text-left">
              {isFa ? selectedMechanismInfo.descriptionFa : selectedMechanismInfo.descriptionEn}
            </p>
          </div>

          {/* Target & Effect in a concise 2-column strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-black/40 border border-slate-700/70 space-y-1.5 text-right rtl:text-right ltr:text-left">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-400" />
                <span>{isFa ? 'هدف / آنزیم:' : 'Target:'}</span>
              </span>
              <p className="text-xs sm:text-[13px] text-slate-200 font-mono font-medium">
                {isFa ? selectedMechanismInfo.targetSiteFa : selectedMechanismInfo.targetSiteEn}
              </p>
            </div>

            <div className="p-3 rounded-xl bg-black/40 border border-slate-700/70 space-y-1.5 text-right rtl:text-right ltr:text-left">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-teal-400" />
                <span>{isFa ? 'اثر سلولی:' : 'Cellular Effect:'}</span>
              </span>
              <p className="text-xs sm:text-[13px] text-slate-200 font-medium">
                {isFa ? selectedMechanismInfo.cellularEffectFa : selectedMechanismInfo.cellularEffectEn}
              </p>
            </div>
          </div>

          {/* Australian Clinical Pearl (Concise) */}
          {(selectedMechanismInfo.clinicalRelevanceFa || selectedMechanismInfo.clinicalRelevanceEn) && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-200 flex items-start gap-2.5 text-right rtl:text-right ltr:text-left">
              <Lightbulb className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-xs sm:text-sm leading-relaxed">
                <span className="font-bold text-amber-300">
                  {isFa ? 'نکته بالینی: ' : 'Clinical Pearl: '}
                </span>
                <span className="text-slate-100 font-medium">
                  {isFa ? selectedMechanismInfo.clinicalRelevanceFa : selectedMechanismInfo.clinicalRelevanceEn}
                </span>
              </div>
            </div>
          )}

          {/* Shared Medicines in Shelf List (داروهای مشترک با این مکانیسم) */}
          <div className="space-y-2.5 pt-1">
            <div className="flex items-center justify-between border-b border-teal-500/25 pb-1.5 flex-wrap gap-2">
              <span className="text-xs font-bold text-teal-300 flex items-center gap-1.5">
                <Pill className="w-4 h-4 text-teal-400" />
                <span>
                  {isFa
                    ? `داروهای مشترک در قفسه با این مکانیسم (${sharedProducts.length} محصول):`
                    : `Shared Shelf Medicines with this Mechanism (${sharedProducts.length}):`}
                </span>
              </span>

              <button
                type="button"
                onClick={() => {
                  onApplyMechanismFilter(selectedMechanismInfo.classCode);
                  onClose();
                }}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-bold transition flex items-center gap-1 cursor-pointer"
              >
                <Layers className="w-3 h-3" />
                <span>{isFa ? 'فیلتر قفسه با این مکانیسم ↵' : 'Filter Shelf by this Mechanism ↵'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {sharedProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="p-3 rounded-xl bg-slate-900/80 border border-teal-500/20 hover:border-teal-400/60 hover:bg-slate-900 cursor-pointer transition space-y-1.5 shadow-xs group"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white group-hover:text-teal-300 transition truncate">
                      {p.brandName}
                    </span>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                        p.schedule === 'S3'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : p.schedule === 'S2'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-indigo-500/20 text-indigo-300'
                      }`}
                    >
                      {p.schedule}
                    </span>
                  </div>
                  <div className="text-[11px] text-teal-300 font-mono truncate">
                    {p.genericName} ({p.packSize})
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{p.indications[language]}</div>
                  <div className="text-[10px] text-sky-400 pt-0.5 flex justify-end font-semibold">
                    {isFa ? 'مشاهده جزئیات دارو در قفسه ↵' : 'View Drug on Shelf ↵'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-teal-500/30 shrink-0">
          <button
            type="button"
            onClick={() => {
              onApplyMechanismFilter(selectedMechanismInfo.classCode);
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow-md"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{isFa ? 'اعمال به عنوان فیلتر قفسه دارو' : 'Apply as Shelf Filter'}</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
