import React from 'react';
import { ShieldCheck, CheckCircle2, AlertTriangle, BookOpen, X, Scale } from 'lucide-react';
import { HotspotDetail } from '../data/realisticScriptsData';

interface HotspotDetailModalProps {
  hotspot: HotspotDetail | null;
  language: 'fa' | 'en';
  onClose: () => void;
}

export const HotspotDetailModal: React.FC<HotspotDetailModalProps> = ({
  hotspot,
  language,
  onClose
}) => {
  if (!hotspot) return null;
  const isFa = language === 'fa';

  const getCategoryBadge = () => {
    switch (hotspot.category) {
      case 'PRESCRIBER':
        return { label: isFa ? 'مشخصات و صلاحیت پزشک' : 'Prescriber Scope & ID', color: 'bg-sky-900/80 text-sky-200 border-sky-500' };
      case 'PATIENT':
        return { label: isFa ? 'هویت بیمار و مدیکر' : 'Patient & Medicare ID', color: 'bg-teal-900/80 text-teal-200 border-teal-500' };
      case 'MEDICATION':
        return { label: isFa ? 'دارو، کد PBS و ژنریک' : 'Item, PBS & Generics', color: 'bg-indigo-900/80 text-indigo-200 border-indigo-500' };
      case 'SIGNATURE':
        return { label: isFa ? 'الزام امضای قانونی' : 'Legal Signature Mandate', color: 'bg-emerald-900/80 text-emerald-200 border-emerald-500' };
      case 'LEGAL_EXPIRY':
        return { label: isFa ? 'اعتبار زمانی و فواصل تکرار' : 'Validity & Intervals', color: 'bg-amber-900/80 text-amber-200 border-amber-500' };
      case 'STAPLE':
        return { label: isFa ? 'الزام اتصال منگنه PB 24' : 'PB 24 Mandatory Staple', color: 'bg-amber-800/80 text-amber-100 border-amber-400' };
      case 'S8_COMPLIANCE':
        return { label: isFa ? 'قوانین سخت‌گیرانه S8' : 'S8 Controlled Compliance', color: 'bg-rose-900/80 text-rose-200 border-rose-500' };
      case 'ODT_DOSING':
        return { label: isFa ? 'پروتکل درمان اعتیاد OTP' : 'OTP Dosing Protocol', color: 'bg-purple-900/80 text-purple-200 border-purple-500' };
      default:
        return { label: isFa ? 'الزام قانونی' : 'Legal Requirement', color: 'bg-slate-800 text-slate-200 border-slate-600' };
    }
  };

  const badge = getCategoryBadge();

  return (
    <div
      id="hotspot_modal_backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="hotspot_modal_container"
        className="bg-slate-950 border border-indigo-500/50 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl text-slate-100 flex flex-col"
        dir={isFa ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/80 sticky top-0 z-10">
          <div className="space-y-1.5 pr-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.color}`}>
                {badge.label}
              </span>
              <span className="text-xs text-slate-400 font-mono" dir="ltr">
                ID: #{hotspot.id}
              </span>
            </div>
            <h3 className="font-extrabold text-base sm:text-lg text-white">
              {isFa ? hotspot.title_fa : hotspot.title_en}
            </h3>
          </div>
          <button
            id="close_hotspot_modal_btn"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/80 text-slate-300 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-4 text-xs sm:text-sm">
          {/* Section 1: Legal Laws & AHPRA/PBS Directives */}
          <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2">
            <h4 className="font-bold text-indigo-300 flex items-center gap-2 text-xs sm:text-sm">
              <Scale className="w-4 h-4 text-indigo-400" />
              {isFa ? 'الزامات قانونی رسمی (PBS & AHPRA Legal Standards)' : 'Official Statutory Requirements (PBS & AHPRA)'}
            </h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-200 text-xs leading-relaxed">
              {(isFa ? hotspot.laws_fa : hotspot.laws_en).map((law, idx) => (
                <li key={idx}>{law}</li>
              ))}
            </ul>
          </div>

          {/* Section 2: Dos & Don'ts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Dos */}
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-2">
              <h4 className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                {isFa ? 'بایدهای دیسپنسینگ (Dos)' : 'Dispensing Best Practices (Dos)'}
              </h4>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-emerald-100">
                {(isFa ? hotspot.dos_and_donts_fa.dos : hotspot.dos_and_donts_en.dos).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Don'ts */}
            <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/30 space-y-2">
              <h4 className="font-bold text-rose-300 flex items-center gap-1.5 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                {isFa ? 'نبایدها و خطاهای بحرانی (Don\'ts)' : 'Critical Dispensing Don\'ts'}
              </h4>
              <ul className="space-y-1.5 text-[11px] sm:text-xs text-rose-100">
                {(isFa ? hotspot.dos_and_donts_fa.donts : hotspot.dos_and_donts_en.donts).map((item, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-rose-400 font-bold">✕</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Section 3: Clinical & Practical Note */}
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 space-y-2">
            <h4 className="font-bold text-amber-300 flex items-center gap-2 text-xs sm:text-sm">
              <BookOpen className="w-4 h-4 text-amber-400" />
              {isFa ? 'نکات مهم بالینی و اعتبارسنجی عملی (Clinical Practice Notes)' : 'Clinical Practice & Dispensing Notes'}
            </h4>
            <p className="text-amber-100 text-xs sm:text-xs leading-relaxed">
              {isFa ? hotspot.clinical_tip_fa : hotspot.clinical_tip_en}
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between mt-auto">
          <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            {isFa ? 'راهنمای قانون‌گذاری دارویی استرالیا' : 'Australian Pharmacy Practice Standards'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition"
          >
            {isFa ? 'متوجه شدم (بستن)' : 'Understood (Close)'}
          </button>
        </div>
      </div>
    </div>
  );
};
