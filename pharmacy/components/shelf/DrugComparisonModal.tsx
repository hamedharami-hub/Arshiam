'use client';

import React from 'react';
import { Product, CalLabelInfo } from '@/types/shelf';
import { getCalLabelInfo } from '@/data/shelf/calLabels';
import { Language } from '@/types/pharmacy';
import { Scale, ShieldAlert, CheckCircle2, ArrowLeftRight, Trash2 } from 'lucide-react';

interface DrugComparisonModalProps {
  isCompareModalOpen: boolean;
  selectedCompareIds: string[];
  products: Product[];
  calLabelsDict: Record<string, CalLabelInfo>;
  language: Language;
  onClose: () => void;
  onOpen: () => void;
  onToggleProduct: (prodId: string, e?: React.MouseEvent) => void;
  onClear: () => void;
}

export const DrugComparisonFloatingBar: React.FC<{
  selectedCompareIds: string[];
  products: Product[];
  language: Language;
  onOpen: () => void;
  onToggleProduct: (id: string) => void;
  onClear: () => void;
}> = ({ selectedCompareIds, products, language, onOpen, onToggleProduct, onClear }) => {
  if (selectedCompareIds.length === 0) return null;
  const isFa = language === 'fa';

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 border border-amber-500/50 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-4 max-w-2xl w-[92%] sm:w-auto animate-fadeIn">
      <div className="flex items-center gap-2 text-amber-400 font-bold text-xs shrink-0">
        <Scale className="w-5 h-5 shrink-0" />
        <span className="hidden sm:inline">
          {isFa ? 'جدول مقایسه داروها:' : 'Drug Comparison Engine:'}
        </span>
        <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-xs font-mono">
          {selectedCompareIds.length} / 3
        </span>
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {selectedCompareIds.map((id) => {
          const p = products.find((prod) => prod.id === id);
          if (!p) return null;
          return (
            <div
              key={id}
              className="bg-black/60 border border-slate-700 text-slate-200 text-[11px] font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1.5 shrink-0"
            >
              <span className="truncate max-w-[100px]">{p.brandName}</span>
              <button
                onClick={() => onToggleProduct(id)}
                className="text-slate-400 hover:text-rose-400 font-bold"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpen}
          className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg flex items-center gap-1.5"
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          <span>{isFa ? 'مشاهده مقایسه' : 'View Compare'}</span>
        </button>

        <button
          onClick={onClear}
          className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          title={isFa ? 'پاکسازی مقایسه' : 'Clear Comparison'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const DrugComparisonModal: React.FC<DrugComparisonModalProps> = ({
  isCompareModalOpen,
  selectedCompareIds,
  products,
  calLabelsDict,
  language,
  onClose,
  onToggleProduct,
}) => {
  if (!isCompareModalOpen) return null;
  const isFa = language === 'fa';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fadeIn">
      <div className="app-card border border-amber-500/50 rounded-2xl max-w-5xl w-full p-4 sm:p-6 space-y-4 shadow-2xl app-text my-auto max-h-[90vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-amber-500/30 pb-3 shrink-0">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-sm sm:text-base">
            <Scale className="w-5 h-5 shrink-0" />
            <span>
              {isFa
                ? 'جدول مقایسه تطبیقی side-by-side داروها و لیبل‌های CAL'
                : 'Side-by-Side Drug & CAL Label Comparison Table'}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs cursor-pointer"
          >
            ✕ {isFa ? 'بستن' : 'Close'}
          </button>
        </div>

        {/* Australian Brand Substitution & Bioequivalence Protocol Banner */}
        <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5 shrink-0">
          <Scale className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-300 block">
              {isFa
                ? 'پروتکل جایگزینی برند و معادل زیستی در استرالیا (PBS A-Flag vs NTI):'
                : 'Australian Brand Substitution & NTI Protocol:'}
            </span>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isFa
                ? 'داروهای دارای علامت A-Flag در جدول PBS معادل زیستی (Bioequivalent) هستند و تعویض برند بدون هماهنگی مجدد با پزشک مجاز است. اما داروهای با پنجره درمانی باریک (NTI) مانند وارفارین، کاربامازپین، لیتیوم و فنیتوئین به دلیل خطرات حیاتی نوسان دوز نباید بدون تایید مستقیم پزشک تعویض برند شوند.'
                : 'A-Flag drugs on PBS are bioequivalent for pharmacist brand substitution. Narrow Therapeutic Index (NTI) drugs (e.g. Warfarin, Lithium, Carbamazepine, Phenytoin) MUST NOT be substituted without doctor coordination.'}
            </p>
          </div>
        </div>

        {/* Comparison Grid */}
        <div className="overflow-x-auto overflow-y-auto space-y-4 pr-1 text-xs custom-scrollbar">
          {selectedCompareIds.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              {isFa
                ? 'هیچ دارویی برای مقایسه انتخاب نشده است. حداقل یک دارو را روی قفسه علامت بزنید.'
                : 'No drugs selected for comparison. Please select at least one product on the shelf.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 min-w-[650px]">
              {selectedCompareIds.map((id) => {
                const prod = products.find((p) => p.id === id);
                if (!prod) return null;
                const isS3 = prod.schedule === 'S3';
                const isS2 = prod.schedule === 'S2';

                return (
                  <div
                    key={id}
                    className="p-4 rounded-2xl bg-black/50 border border-slate-800 space-y-3.5 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      {/* Top Tag & Remove button */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            isS3
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                              : isS2
                              ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                              : 'bg-slate-500/20 text-slate-300 border-slate-500/40'
                          }`}
                        >
                          {prod.schedule}
                        </span>
                        <button
                          onClick={() => onToggleProduct(id)}
                          className="text-slate-500 hover:text-rose-400 text-xs font-bold"
                        >
                          ✕ {isFa ? 'حذف' : 'Remove'}
                        </button>
                      </div>

                      {/* Brand & Generic */}
                      <div className="border-b border-slate-800 pb-2">
                        <h4 className="font-bold text-sm text-amber-300">{prod.brandName}</h4>
                        <p className="font-mono text-sky-400 text-xs font-semibold">{prod.genericName}</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">Pack: {prod.packSize}</p>
                      </div>

                      {/* Active Ingredients */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                          {isFa ? 'ترکیبات و دوز (Active Ingredients):' : 'Active Ingredients & Strength:'}
                        </span>
                        <p className="font-mono text-slate-200 text-xs leading-snug">{prod.activeIngredients}</p>
                      </div>

                      {/* Indications */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-0.5">
                          {isFa ? 'اندیکاسیون درمانی:' : 'Indication & Clinical Use:'}
                        </span>
                        <p className="text-slate-300 text-xs leading-relaxed">{prod.indications[language]}</p>
                      </div>

                      {/* CAL Warning Badges */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          {isFa ? 'لیبل‌های هشدار (CAL Labels):' : 'CAL Warning Advisory Labels:'}
                        </span>
                        {prod.calLabels.length === 0 ? (
                          <span className="text-slate-500 text-[11px]">
                            {isFa ? 'بدون لیبل CAL الزامی' : 'No mandatory CAL'}
                          </span>
                        ) : (
                          <div className="space-y-1">
                            {prod.calLabels.map((code) => {
                              const info = calLabelsDict[code] || getCalLabelInfo(code);
                              return (
                                <div
                                  key={code}
                                  className={`p-1.5 rounded-lg border text-[11px] ${
                                    info ? info.colorClass : 'bg-slate-800 text-slate-300 border-slate-700'
                                  }`}
                                >
                                  <div className="font-bold">
                                    {code}: {info ? info[isFa ? 'nameFa' : 'nameEn'] : ''}
                                  </div>
                                  <div className="text-[10px] opacity-80 mt-0.5">
                                    {info ? info[isFa ? 'descriptionFa' : 'descriptionEn'] : ''}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Pharmacist Counseling Points */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          {isFa ? 'نکات مشاوره داروساز:' : 'Pharmacist counseling points:'}
                        </span>
                        <ul className="space-y-1">
                          {prod.counselingPoints.map((cp, idx) => (
                            <li
                              key={idx}
                              className="p-1.5 rounded bg-slate-800/80 text-[11px] text-slate-200 border border-slate-700/60 leading-snug"
                            >
                              • {cp[language]}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Brand Substitution & NTI Status */}
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 block mb-1">
                          {isFa ? 'تعویض برند (A-Flag / NTI):' : 'Brand Substitution (A-Flag / NTI):'}
                        </span>
                        {prod.isNarrowTherapeuticIndex ? (
                          <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold space-y-1">
                            <div className="flex items-center gap-1 text-rose-400">
                              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                              <span>🛑 NTI (ممنوعیت تعویض برند)</span>
                            </div>
                            <p className="text-[10px] font-normal text-rose-200/90 leading-tight">
                              {isFa
                                ? 'پنجره درمانی باریک. تعویض برند بدون تایید پزشک ممنوع است.'
                                : 'Narrow Therapeutic Index. Do not substitute without doctor approval.'}
                            </p>
                          </div>
                        ) : prod.aFlagBioequivalent ? (
                          <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-bold space-y-1">
                            <div className="flex items-center gap-1 text-emerald-400">
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                              <span>🟢 A-Flag Bioequivalent</span>
                            </div>
                            {prod.equivalentBrands && prod.equivalentBrands.length > 0 && (
                              <p className="text-[10px] font-mono text-slate-300">
                                {isFa ? 'برندهای معادل:' : 'Equivalent:'} {prod.equivalentBrands.join(', ')}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">
                            {isFa ? 'استاندارد غیر PBS A-Flag' : 'Standard non-A-Flag'}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Footer Requirement */}
                    {prod.requiresProjectStop && (
                      <div className="p-2 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-300 text-[11px] font-bold flex items-center gap-1.5">
                        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                        <span>{isFa ? 'الزام استعلام Project Stop' : 'Project Stop ID Mandatory'}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-amber-500/30 flex items-center justify-between text-xs shrink-0">
          <span className="text-slate-400">
            {isFa
              ? 'بر اساس راهنماهای رسمی APF, PSA & Pharmacy Board of Australia'
              : 'Based on APF, PSA Standards & Pharmacy Board Guidelines'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition cursor-pointer"
          >
            {isFa ? 'تایید و بازگشت به قفسه' : 'Close & Return to Shelf'}
          </button>
        </div>
      </div>
    </div>
  );
};
