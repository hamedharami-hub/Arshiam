'use client';

import React, { useEffect } from 'react';
import { Product, ClinicalDomainCategory, ClinicalSubCategory } from '@/types/shelf';
import { CLINICAL_CONCEPTS_REGISTRY } from '@/data/shelf/clinicalConcepts';
import { getConceptsForProduct, getConceptsForSubCategory } from '@/data/shelf/diseaseHelpers';
import { Language } from '@/types/pharmacy';
import { Sparkles, Info, Boxes, BookOpen, X } from 'lucide-react';

interface ConceptDetailModalProps {
  selectedConceptId: string | null;
  products: Product[];
  domains: ClinicalDomainCategory[];
  language: Language;
  onClose: () => void;
  onSelectProduct: (prod: Product) => void;
  onSelectSubCat: (subCatId: string) => void;
  onApplySearchQuery: (query: string) => void;
}

export const ConceptDetailModal: React.FC<ConceptDetailModalProps> = ({
  selectedConceptId,
  products,
  domains,
  language,
  onClose,
  onSelectProduct,
  onSelectSubCat,
  onApplySearchQuery,
}) => {
  useEffect(() => {
    if (!selectedConceptId) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConceptId, onClose]);

  if (!selectedConceptId || !CLINICAL_CONCEPTS_REGISTRY[selectedConceptId]) return null;
  const isFa = language === 'fa';
  const concept = CLINICAL_CONCEPTS_REGISTRY[selectedConceptId];

  // Find matching products
  const matchingProducts = products.filter((p) =>
    getConceptsForProduct(p).some((c) => c.id === selectedConceptId)
  );

  // Find matching subcategories
  const matchingSubcats: { domainTitle: string; sub: ClinicalSubCategory }[] = [];
  domains.forEach((domain) => {
    domain.subcategories.forEach((sub) => {
      if (getConceptsForSubCategory(sub).some((c) => c.id === selectedConceptId)) {
        matchingSubcats.push({ domainTitle: domain[isFa ? 'titleFa' : 'titleEn'], sub });
      }
    });
  });

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border-2 border-amber-500/50 rounded-2xl max-w-2xl w-full p-4 sm:p-6 space-y-4 shadow-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white my-auto max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-amber-500/30 pb-3 gap-2">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${concept.badgeColor}`}>
                {concept[isFa ? 'categoryFa' : 'categoryEn']}
              </span>
              <span className="text-[10px] font-mono text-amber-400 font-bold">
                ID: {concept.id}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <span className="truncate">{concept[isFa ? 'titleFa' : 'titleEn']}</span>
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clinical Description */}
        <div className="p-3.5 sm:p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-2" dir={isFa ? 'rtl' : 'ltr'}>
          <div className="text-xs sm:text-sm font-bold text-amber-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{isFa ? 'شرح و اهمیت بالینی این نکته مشترک:' : 'Clinical Impact & Rationale:'}</span>
          </div>
          <p className="text-xs sm:text-sm text-slate-100 leading-relaxed font-medium text-right rtl:text-right ltr:text-left">
            {concept[isFa ? 'descriptionFa' : 'descriptionEn']}
          </p>
        </div>

        {/* Matching Products Section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-sky-400 border-b border-slate-800 pb-1.5 gap-2 flex-wrap">
            <span className="flex items-center gap-1.5">
              <Boxes className="w-4 h-4" />
              <span>
                {isFa
                  ? `داروهای قفسه که این نکته بالینی را دارا هستند (${matchingProducts.length} دارو):`
                  : `Matching Shelf Medicines (${matchingProducts.length} Products):`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => {
                onApplySearchQuery(concept[isFa ? 'titleFa' : 'titleEn'].split(' ')[0]);
                onClose();
              }}
              className="text-[11px] text-amber-300 hover:underline font-bold cursor-pointer"
            >
              {isFa ? 'اعمال به عنوان فیلتر قفسه ↵' : 'Apply as Shelf Filter ↵'}
            </button>
          </div>

          {matchingProducts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {isFa ? 'هیچ داروی مستقیمی یافت نشد.' : 'No direct products linked.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
              {matchingProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => {
                    onSelectProduct(p);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-black/40 border border-slate-800 hover:border-sky-500/50 cursor-pointer transition space-y-1"
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate">{p.brandName}</span>
                    <span
                      className={`px-1.5 py-0.2 text-[9px] font-bold rounded ${
                        p.schedule === 'S3'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {p.schedule}
                    </span>
                  </div>
                  <div className="text-[11px] text-sky-300 font-mono truncate">{p.genericName}</div>
                  <div className="text-[10px] text-slate-400 truncate">{p.indications[language]}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matching Subcategories Section */}
        <div className="space-y-2 pt-1">
          <div className="text-xs font-bold text-purple-400 border-b border-slate-800 pb-1.5 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>
              {isFa
                ? `دسته و زیردسته‌های بالینی دارای این موضوع (${matchingSubcats.length} زیردسته):`
                : `Related Clinical Subcategories (${matchingSubcats.length} Subcategories):`}
            </span>
          </div>

          {matchingSubcats.length === 0 ? (
            <p className="text-xs text-slate-400 italic">
              {isFa ? 'هیچ زیردسته مرتبطی یافت نشد.' : 'No subcategories linked.'}
            </p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
              {matchingSubcats.map(({ domainTitle, sub }) => (
                <div
                  key={sub.id}
                  onClick={() => {
                    onSelectSubCat(sub.id);
                    onClose();
                  }}
                  className="p-2.5 rounded-xl bg-black/40 border border-slate-800 hover:border-purple-500/50 cursor-pointer transition space-y-1 text-xs"
                >
                  <div className="text-[10px] text-purple-300 font-semibold">{domainTitle}</div>
                  <div className="font-bold text-white">{sub[isFa ? 'titleFa' : 'titleEn']}</div>
                  {sub[isFa ? 'redFlagsFa' : 'redFlagsEn'].length > 0 && (
                    <div className="text-[10px] text-rose-300 truncate">
                      🚨 {sub[isFa ? 'redFlagsFa' : 'redFlagsEn'][0]}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer Close Button */}
        <div className="pt-2 flex justify-end">
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
