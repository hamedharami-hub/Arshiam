'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { User, BookOpen, AlertCircle, Sparkles, ExternalLink } from 'lucide-react';
import { DiseaseInfo, DISEASE_CATEGORIES } from '@/data/diseasesRegistry';
import { getOtcClinicalTranslation } from '@/data/otcClinicalTranslations';

interface PatientDemographicsCardProps {
  language: Language;
  scenario: Scenario;
  linkedHandbookDisease: DiseaseInfo | any | null;
  onOpenDiseaseModal: (disease: DiseaseInfo) => void;
}

export const PatientDemographicsCard: React.FC<PatientDemographicsCardProps> = ({
  language,
  scenario,
  linkedHandbookDisease,
  onOpenDiseaseModal,
}) => {
  const isFa = language === 'fa';

  const clinicalTrans = linkedHandbookDisease ? getOtcClinicalTranslation(linkedHandbookDisease.id) : null;
  const diseaseNameFa =
    clinicalTrans?.cleanFaName ||
    linkedHandbookDisease?.name?.fa ||
    linkedHandbookDisease?.nameFa ||
    linkedHandbookDisease?.condition ||
    '';
  const diseaseNameEn =
    clinicalTrans?.cleanEnName ||
    linkedHandbookDisease?.name?.en ||
    linkedHandbookDisease?.nameEn ||
    linkedHandbookDisease?.condition ||
    '';

  const categoryObj = DISEASE_CATEGORIES.find((c) => c.id === linkedHandbookDisease?.categoryId);
  const categoryName = categoryObj
    ? (categoryObj.name[language] || categoryObj.name.en)
    : (linkedHandbookDisease?.category || linkedHandbookDisease?.categoryId || (isFa ? 'راهنمای بالینی OTC' : 'OTC Clinical Guide'));

  const primaryDrugHint = isFa
    ? (clinicalTrans?.firstLine?.drugNameFa || clinicalTrans?.primaryBrand || linkedHandbookDisease?.medicines?.[0]?.brandExamples || '')
    : (clinicalTrans?.firstLine?.drugNameEn || clinicalTrans?.primaryBrand || linkedHandbookDisease?.medicines?.[0]?.brandExamples || '');

  return (
    <div className="app-card border app-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm bg-slate-900/70">
      <div className="flex items-center justify-between border-b app-border pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-500/30">
            <User className="w-4 h-4" />
          </div>
          <span className="font-bold text-xs sm:text-sm app-text">
            {isFa ? 'مشخصات بالینی و پرونده بیمار' : 'Patient Clinical Profile'}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
          ID: {scenario.id}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-black/40 border app-border space-y-1">
          <span className="text-[10px] app-muted block">{isFa ? 'نام بیمار:' : 'Patient Name:'}</span>
          <span className="font-bold app-text">{scenario.patientProfile.name}</span>
        </div>
        <div className="p-2.5 rounded-xl bg-black/40 border app-border space-y-1">
          <span className="text-[10px] app-muted block">{isFa ? 'سن و جنسیت:' : 'Age & Gender:'}</span>
          <span className="font-bold app-text">
            {scenario.patientProfile.age} {isFa ? 'ساله' : 'yo'} ({scenario.patientProfile.gender})
          </span>
        </div>
      </div>

      {/* Linked Clinical OTC Monograph Card */}
      {linkedHandbookDisease && (
        <div className="p-3 sm:p-3.5 rounded-xl bg-gradient-to-r from-emerald-950/70 via-slate-900 to-teal-950/70 border border-emerald-500/40 space-y-2.5 shadow-md">
          <div className="flex items-center justify-between flex-wrap gap-1.5">
            <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>{isFa ? 'مونوگراف دارویی مرتبط (APF & PBA)' : 'Linked OTC Monograph (APF & PBA)'}</span>
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-200 border border-emerald-500/30">
              {categoryName}
            </span>
          </div>

          <div className="bg-slate-950/80 p-2.5 rounded-lg border border-emerald-500/20 space-y-1">
            <div className="text-xs sm:text-sm font-bold text-emerald-100">
              {isFa ? diseaseNameFa : diseaseNameEn}
            </div>
            {primaryDrugHint && (
              <div className="text-[11px] text-sky-300 flex items-center gap-1">
                <span className="text-slate-400">{isFa ? 'خط اول درمان:' : 'First-line:'}</span>
                <span className="font-semibold">{primaryDrugHint}</span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => onOpenDiseaseModal(linkedHandbookDisease)}
            className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 active:scale-[0.99]"
          >
            <BookOpen className="w-4 h-4" />
            <span>
              {isFa
                ? `مشاهده راهنمای بالینی و دوزینگ: ${diseaseNameFa}`
                : `Open Clinical Guide & Dosing: ${diseaseNameEn}`}
            </span>
            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
          </button>
        </div>
      )}

      {/* Medical History */}
      {scenario.patientProfile.medicalHistory && scenario.patientProfile.medicalHistory.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-300 block">
            {isFa ? 'سوابق پزشکی و بیماری‌های زمینه‌ای:' : 'Medical History & Conditions:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {scenario.patientProfile.medicalHistory.map((hist, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
              >
                {hist}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Current Medications */}
      {scenario.patientProfile.currentMedications && scenario.patientProfile.currentMedications.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-[11px] font-semibold text-slate-300 block">
            {isFa ? 'داروهای مصرفی فعلی:' : 'Current Medications:'}
          </span>
          <div className="flex flex-wrap gap-1.5">
            {scenario.patientProfile.currentMedications.map((med, idx) => (
              <span
                key={idx}
                className="text-[11px] px-2 py-0.5 rounded-lg bg-sky-950/60 border border-sky-500/30 text-sky-200 font-mono"
              >
                {med}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergies */}
      <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
        <div className="space-x-1">
          <span className="font-bold text-rose-300">{isFa ? 'حساسیت دارویی:' : 'Allergies:'}</span>
          <span className="text-rose-100 font-medium">
            {scenario.patientProfile.allergies?.join(', ') || (isFa ? 'هیچ موردی گزارش نشده (NKDA)' : 'No Known Drug Allergies (NKDA)')}
          </span>
        </div>
      </div>
    </div>
  );
};
