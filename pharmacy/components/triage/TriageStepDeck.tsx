'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Scenario, WwhamQuestion, DialogueOption } from '@/data/otcScenarios';
import { Language, DiseaseInfo } from '@/types/pharmacy';
import { FormattedClinicalText } from './FormattedClinicalText';
import { AussieContextCard } from './AussieContextCard';
import { OutcomeFeedbackCard } from './OutcomeFeedbackCard';
import { ChatMessage, StarredPhrase } from './types';
import { haptic } from '@/lib/haptics';
import {
  UserRound,
  Pill,
  MessagesSquare,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  Info,
  CheckCircle2,
  AlertTriangle,
  X,
  Copy,
  Check,
  HelpCircle,
  Lightbulb,
  Stethoscope,
  HeartPulse,
  BookOpen,
} from 'lucide-react';

interface TriageStepDeckProps {
  language: Language;
  scenario: Scenario;
  linkedHandbookDisease: any;
  onOpenDiseaseModal: (d: DiseaseInfo) => void;
  // Framework props
  activeFrameworkTab: 'wwham' | 'redflags' | 'decision';
  setActiveFrameworkTab: (tab: 'wwham' | 'redflags' | 'decision') => void;
  wwhamCount: number;
  askedQuestions: Record<string, boolean>;
  isQnaStarred: (qEn: string) => boolean;
  onAskWwhamQuestion: (q: WwhamQuestion) => void;
  askedRedFlagChecks: Record<string, boolean>;
  onCheckRedFlags: () => void;
  allWwhamAsked: boolean;
  selectedDialogueId: string | null;
  selectedOption: DialogueOption | null | undefined;
  onSelectDialogueOption: (opt: DialogueOption) => void;
  // Chat & Starred props
  chatMessages: ChatMessage[];
  isChatExpanded: boolean;
  setIsChatExpanded: React.Dispatch<React.SetStateAction<boolean>>;
  starredPhrases: StarredPhrase[];
  showStarredBelow: boolean;
  setShowStarredBelow: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStarredModal: React.Dispatch<React.SetStateAction<boolean>>;
  toggleStarMessage: (msg: ChatMessage) => void;
  isMessageStarred: (text: string) => boolean;
  removeStarredPhrase: (textEn: string) => void;
  onCopySinglePhrase: (id: string, textEn?: string, textFa?: string) => void;
  copiedPhraseId: string | null;
  onReset: () => void;
  // Outcome props
  showOutcome: boolean;
  onOpenReferralModal: () => void;
  onNavigateToFred?: (scenarioId?: string) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
}

export const TriageStepDeck: React.FC<TriageStepDeckProps> = ({
  language,
  scenario,
  linkedHandbookDisease,
  onOpenDiseaseModal,
  activeFrameworkTab,
  setActiveFrameworkTab,
  wwhamCount,
  askedQuestions,
  isQnaStarred,
  onAskWwhamQuestion,
  askedRedFlagChecks,
  onCheckRedFlags,
  allWwhamAsked,
  selectedDialogueId,
  selectedOption,
  onSelectDialogueOption,
  chatMessages,
  starredPhrases,
  toggleStarMessage,
  isMessageStarred,
  onCopySinglePhrase,
  copiedPhraseId,
  onReset,
  showOutcome,
  onOpenReferralModal,
  onNavigateToFred,
  onNavigateToModule,
  onOpenAiLeitner,
}) => {
  const isFa = language === 'fa';

  // 3 Steps:
  // 0: مشخصات و شرایط بالینی بیمار (Patient Profile & Direct Request)
  // 1: داروهای قفسه OTC و پاپ‌آپ دارو (OTC Shelf Medicines & In-Page Modal)
  // 2: مشاوره، عبارات پرکاربرد انگلیسی و سوالات بالینی (Consultation, Phrases & Clinical Framework)
  const [verticalStep, setVerticalStep] = useState<0 | 1 | 2>(0);
  const [consultSubTab, setConsultSubTab] = useState<0 | 1 | 2 | 3>(0);

  // In-Page Drug Monograph Modal State (allows viewing drug and closing without leaving page)
  const [selectedMedicineModal, setSelectedMedicineModal] = useState<any | null>(null);

  // Local state for copy feedback inside phrases list
  const [copiedPhraseText, setCopiedPhraseText] = useState<string | null>(null);

  const handleCopyPhrase = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedPhraseText(text);
      haptic.success();
      setTimeout(() => setCopiedPhraseText(null), 2000);
    } catch {
      // Fallback
    }
  };

  const medicinesList = linkedHandbookDisease?.medicines || [];

  return (
    <div className="space-y-4">
      {/* 1. TOP 3-STEP NAVIGATION DECK BAR */}
      <div className="grid grid-cols-3 gap-1.5 p-1.5 rounded-2xl bg-slate-950/90 border border-slate-800 shadow-md text-xs">
        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(0);
          }}
          className={`py-2 px-2 sm:px-3 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
            verticalStep === 0
              ? 'bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-md shadow-sky-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <UserRound className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isFa ? '۱. مشخصات و شرح حال' : '1. Patient Profile'}</span>
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(1);
          }}
          className={`py-2 px-2 sm:px-3 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
            verticalStep === 1
              ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <Pill className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isFa ? '۲. داروهای قفسه OTC' : '2. OTC Medicines'}</span>
          {medicinesList.length > 0 && (
            <span className="text-[9.5px] font-mono opacity-80">({medicinesList.length})</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => {
            haptic.light();
            setVerticalStep(2);
          }}
          className={`py-2 px-2 sm:px-3 rounded-xl font-black transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
            verticalStep === 2
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md shadow-purple-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-900'
          }`}
        >
          <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">{isFa ? '۳. مشاوره و اصطلاحات' : '3. Consultation & Phrases'}</span>
        </button>
      </div>

      {/* 2. MAIN CARD VIEW CONTAINER */}
      <div className="relative min-h-[350px]">
        <AnimatePresence mode="wait">
          {/* ========================================================================= */}
          {/* STEP 0: PATIENT PROFILE, DIRECT REQUEST & CLINICAL CONTEXT */}
          {/* ========================================================================= */}
          {verticalStep === 0 && (
            <motion.div
              key="triage-step-0-patient-profile"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-4 select-text"
            >
              {/* Main Patient Presentation & Request Card */}
              <div className="app-card border border-sky-500/30 rounded-2xl p-4 sm:p-5 shadow-lg bg-gradient-to-b from-sky-950/20 via-slate-900/90 to-slate-950/90 space-y-4">
                <div className="flex items-center justify-between border-b border-sky-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
                      <UserRound className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white leading-tight">
                        {scenario.patientProfile.name}
                      </h3>
                      <p className="text-xs text-sky-300 font-mono mt-0.5">
                        {scenario.patientProfile.age} {isFa ? 'ساله' : 'yo'} • {scenario.patientProfile.gender}
                      </p>
                    </div>
                  </div>

                  {linkedHandbookDisease && (
                    <button
                      type="button"
                      onClick={() => onOpenDiseaseModal(linkedHandbookDisease)}
                      className="px-3 py-1.5 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{isFa ? 'راهنمای بالینی بیماری' : 'Disease Guide'}</span>
                    </button>
                  )}
                </div>

                {/* Primary Patient Presentation & Request */}
                <div className="p-4 rounded-2xl bg-sky-950/30 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-sky-300">
                    <span className="flex items-center gap-1.5">
                      <MessagesSquare className="w-4 h-4 text-sky-400" />
                      <span>{isFa ? 'شرح حال، سوال و خواسته اصلی بیمار:' : 'Chief Presentation & Patient Request:'}</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200">
                      Direct Request
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm font-semibold text-white leading-relaxed bg-black/40 p-3 rounded-xl border border-sky-500/20">
                    {isFa ? scenario.patientProfile.presentation.fa : scenario.patientProfile.presentation.en}
                  </p>

                  {isFa && scenario.patientProfile.presentation.en && (
                    <p className="text-xs text-sky-300/90 font-mono leading-relaxed px-1" dir="ltr">
                      &ldquo;{scenario.patientProfile.presentation.en}&rdquo;
                    </p>
                  )}
                </div>

                {/* Demographics & Medical History Grid (Rendered only when patient has specific data) */}
                {(scenario.patientProfile.medicalHistory?.length ||
                  scenario.patientProfile.currentMedications?.length ||
                  scenario.patientProfile.allergies?.length) ? (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    {scenario.patientProfile.medicalHistory && scenario.patientProfile.medicalHistory.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <HeartPulse className="w-3.5 h-3.5 text-rose-400" />
                          <span>{isFa ? 'سوابق پزشکی (History):' : 'Medical History:'}</span>
                        </span>
                        <p className="text-slate-200 font-medium">
                          {scenario.patientProfile.medicalHistory.join(' • ')}
                        </p>
                      </div>
                    )}

                    {scenario.patientProfile.currentMedications && scenario.patientProfile.currentMedications.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <Pill className="w-3.5 h-3.5 text-teal-400" />
                          <span>{isFa ? 'داروهای مصرفی فعلی:' : 'Current Medications:'}</span>
                        </span>
                        <p className="text-slate-200 font-medium">
                          {scenario.patientProfile.currentMedications.join(' • ')}
                        </p>
                      </div>
                    )}

                    {scenario.patientProfile.allergies && scenario.patientProfile.allergies.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-bold flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                          <span>{isFa ? 'حساسیت‌های دارویی (Allergies):' : 'Allergies:'}</span>
                        </span>
                        <p className="text-slate-200 font-medium">
                          {scenario.patientProfile.allergies.join(' • ')}
                        </p>
                      </div>
                    )}
                  </div>
                ) : null}

                {/* Aussie Slang in this Presentation (if available) */}
                {scenario.aussieContext && (
                  <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                      <span>🦘</span>
                      <span>{isFa ? 'اصطلاحات عامیانه استرالیایی و زمینه فرهنگی بیمار:' : 'Aussie Slang & Cultural Context:'}</span>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed bg-black/40 p-2.5 rounded-xl border border-amber-500/20">
                      {isFa ? scenario.aussieContext.fa : scenario.aussieContext.en}
                    </p>
                  </div>
                )}

                {/* Non-Pharmacological & Self-Care Advice (Categorized & Structured Items) */}
                {(() => {
                  let items: string[] = [];
                  if (Array.isArray(linkedHandbookDisease?.nonPharmAdvice) && linkedHandbookDisease.nonPharmAdvice.length > 0) {
                    items = linkedHandbookDisease.nonPharmAdvice;
                  } else {
                    const raw = isFa
                      ? (scenario.clinicalOutcome?.explanation?.fa || scenario.clinicalOutcome?.recommendation?.fa || '')
                      : (scenario.clinicalOutcome?.explanation?.en || scenario.clinicalOutcome?.recommendation?.en || '');
                    if (raw) {
                      items = raw
                        .split(/(?:\r?\n|[.;]\s+)/)
                        .map((s) => s.trim())
                        .filter((s) => s.length > 3);
                    }
                  }

                  if (items.length === 0) return null;

                  return (
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 space-y-3">
                      <div className="flex items-center justify-between text-xs font-bold text-emerald-300 border-b border-emerald-500/20 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Sparkles className="w-4 h-4 text-emerald-400" />
                          <span>{isFa ? 'توصیه‌های خودمراقبتی و اقدامات غیردارویی (دسته‌بندی‌شده):' : 'Non-Pharmacological & Supportive Care:'}</span>
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-bold">
                          {items.length} {isFa ? 'راهکار' : 'Points'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {items.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 sm:p-3 rounded-xl bg-black/40 border border-emerald-500/20 flex items-start gap-2.5 text-xs sm:text-[12.5px] text-slate-200 shadow-xs"
                          >
                            <span className="w-5 h-5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-mono font-bold text-[10px] shrink-0 mt-0.5">
                              {idx + 1}
                            </span>
                            <p className="leading-relaxed flex-1 text-slate-200">
                              {item.endsWith('.') ? item : `${item}.`}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Bottom Quick Navigation to OTC Medicines */}
              <button
                type="button"
                onClick={() => {
                  haptic.light();
                  setVerticalStep(1);
                }}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md shadow-emerald-950/50 cursor-pointer transition"
              >
                <Pill className="w-4 h-4" />
                <span>{isFa ? 'مشاهده داروهای پیشنهادی قفسه OTC ←' : 'View Recommended OTC Medicines →'}</span>
              </button>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 1: OTC MEDICINES WITH IN-PAGE MONOGRAPH MODAL */}
          {/* ========================================================================= */}
          {verticalStep === 1 && (
            <motion.div
              key="triage-step-1-otc-medicines"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3 select-text"
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-teal-400 flex items-center gap-1.5">
                  <Pill className="w-4 h-4" />
                  <span>
                    {isFa
                      ? `داروهای پیشنهادی OTC برای این سناریو (${medicinesList.length} دارو):`
                      : `Recommended OTC Medicines (${medicinesList.length}):`}
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">
                  {isFa ? 'برای مشاهده جزئیات روی هر دارو کلیک کنید' : 'Click on any drug to view monograph'}
                </span>
              </div>

              {medicinesList.length === 0 ? (
                <div className="app-card border app-border rounded-2xl p-6 text-center app-muted text-xs space-y-2 bg-slate-900/60">
                  <Pill className="w-8 h-8 mx-auto text-slate-600" />
                  <p>{isFa ? 'داروی بدون نسخه اختصاصی برای این سناریو ثبت نشده است.' : 'No specific OTC medicine listed for this scenario.'}</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {medicinesList.map((med: any, idx: number) => (
                    <div
                      key={idx}
                      onClick={() => {
                        haptic.light();
                        setSelectedMedicineModal(med);
                      }}
                      className="p-3.5 rounded-2xl app-card border border-teal-500/30 hover:border-teal-400 bg-slate-900/80 hover:bg-slate-800/80 space-y-2 transition cursor-pointer shadow-xs group"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30 flex items-center justify-center text-xs font-bold group-hover:scale-105 transition">
                            {idx + 1}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-white leading-tight group-hover:text-teal-300 transition">
                              {med.name}
                            </h4>
                            <p className="text-[11px] text-teal-400/90 font-mono">
                              {med.brandExamples}
                            </p>
                          </div>
                        </div>

                        <span className="text-xs px-2.5 py-1 rounded-xl bg-teal-500/15 text-teal-300 font-bold border border-teal-500/30 flex items-center gap-1 group-hover:bg-teal-500/25">
                          <span>{isFa ? 'مشاهده مونوگراف' : 'View Profile'}</span>
                          <ExternalLink className="w-3 h-3" />
                        </span>
                      </div>

                      {/* Brief preview */}
                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 text-xs text-slate-300">
                        <span className="text-teal-400 font-bold">💊 {isFa ? 'دوز مصرف:' : 'Dose:'} </span>
                        <span>{med.dosing}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* In-Page Medicine Monograph Popup Modal */}
              <AnimatePresence>
                {selectedMedicineModal && (
                  <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: 15 }}
                      className="w-full max-w-lg max-h-[85vh] overflow-y-auto app-card border border-teal-500/40 rounded-3xl p-5 sm:p-6 shadow-2xl bg-slate-950 space-y-4 select-text"
                    >
                      {/* Modal Header */}
                      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 rounded-2xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                            <Pill className="w-5 h-5" />
                          </div>
                          <div>
                            <h3 className="text-base font-black text-white leading-tight">
                              {selectedMedicineModal.name}
                            </h3>
                            <p className="text-xs text-teal-300 font-mono mt-0.5">
                              {selectedMedicineModal.brandExamples}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setSelectedMedicineModal(null)}
                          className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 cursor-pointer transition"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Modal Content */}
                      <div className="space-y-3 text-xs sm:text-sm text-slate-200">
                        {/* Dosing */}
                        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-teal-500/20 space-y-1">
                          <span className="text-teal-400 font-bold flex items-center gap-1.5">
                            <Pill className="w-4 h-4" />
                            <span>{isFa ? 'دوزینگ و دستور مصرف استاندارد:' : 'Standard Dosing & Administration:'}</span>
                          </span>
                          <p className="text-slate-300 text-xs sm:text-[13px] leading-relaxed">
                            {selectedMedicineModal.dosing}
                          </p>
                        </div>

                        {/* Counseling & Pearls */}
                        {selectedMedicineModal.counselingPoints && selectedMedicineModal.counselingPoints.length > 0 && (
                          <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                            <span className="text-amber-300 font-bold flex items-center gap-1.5">
                              <Lightbulb className="w-4 h-4 text-amber-400" />
                              <span>{isFa ? 'نکات مهم مشاوره‌ای و مصرف:' : 'Key Clinical Pearls:'}</span>
                            </span>
                            <ul className="space-y-1 text-xs sm:text-[12.5px] text-slate-300 list-disc list-inside leading-relaxed">
                              {selectedMedicineModal.counselingPoints.map((pt: string, pIdx: number) => (
                                <li key={pIdx}>{pt}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* CAL Warning Labels (if any) */}
                        {selectedMedicineModal.calLabels && selectedMedicineModal.calLabels.length > 0 && (
                          <div className="p-3 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
                            <span className="text-amber-300 font-bold flex items-center gap-1">
                              <AlertTriangle className="w-4 h-4 text-amber-400" />
                              <span>{isFa ? 'برچسب‌های هشدار اختصاصی (CAL Labels):' : 'Cautionary Advisory Labels (CAL):'}</span>
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {selectedMedicineModal.calLabels.map((c: string) => (
                                <span key={c} className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                  {c}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Modal Footer */}
                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                        {onNavigateToModule && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedMedicineModal(null);
                              onNavigateToModule(2);
                            }}
                            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <span>{isFa ? 'مشاهده در قفسه اصلی' : 'Open in Shelf'}</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setSelectedMedicineModal(null)}
                          className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition cursor-pointer shadow-md"
                        >
                          {isFa ? 'بستن' : 'Close'}
                        </button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>

              {/* Bottom Quick Navigation */}
              <div className="pt-2 flex items-center justify-between text-xs text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setVerticalStep(0);
                  }}
                  className="text-sky-400 hover:text-sky-300 font-bold cursor-pointer"
                >
                  {isFa ? '← بازگشت به مشخصات بیمار' : '← Patient Profile'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setVerticalStep(2);
                  }}
                  className="text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>{isFa ? 'مشاوره و عبارات پرکاربرد ←' : 'Consultation & Phrases →'}</span>
                </button>
              </div>
            </motion.div>
          )}

          {/* ========================================================================= */}
          {/* STEP 2: CONSULTATION (WITH 4 HORIZONTAL SUB-TABS) */}
          {/* ========================================================================= */}
          {verticalStep === 2 && (
            <motion.div
              key="triage-step-2-consultation"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="space-y-3.5 select-text"
            >
              {/* 4 HORIZONTAL SUB-TABS NAVIGATION BAR */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1.5 rounded-2xl bg-slate-950/80 border border-purple-500/25 shadow-inner text-xs">
                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setConsultSubTab(0);
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                    consultSubTab === 0
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <MessagesSquare className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? '۱. سوالات WWHAM' : '1. WWHAM'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setConsultSubTab(1);
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                    consultSubTab === 1
                      ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? '۲. پرچم‌های قرمز 🚩' : '2. Red Flags 🚩'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setConsultSubTab(2);
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                    consultSubTab === 2
                      ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <Stethoscope className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{isFa ? '۳. تصمیم داروساز 🎯' : '3. Decision 🎯'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setConsultSubTab(3);
                  }}
                  className={`py-2 px-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer text-[11px] sm:text-xs ${
                    consultSubTab === 3
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 font-black'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900'
                  }`}
                >
                  <span>🦘</span>
                  <span className="truncate">{isFa ? '۴. بافت استرالیایی' : '4. Aussie Slang'}</span>
                </button>
              </div>

              {/* SUB-TAB 0: WWHAM QUESTIONS & KEY ENGLISH PHRASES */}
              {consultSubTab === 0 && (
                <motion.div
                  key="consult-subtab-0"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="app-card border border-purple-500/30 rounded-2xl p-4 sm:p-5 shadow-lg bg-gradient-to-b from-purple-950/20 via-slate-900/90 to-slate-950/90 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-purple-500/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
                          <MessagesSquare className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {isFa ? 'کلمات و عبارات پرکاربرد انگلیسی در این باره (WWHAM)' : 'Key English Consultation Phrases'}
                          </h3>
                          <p className="text-[11px] text-purple-300">
                            {isFa ? 'جملات طلایی و سوالات کلیدی داروساز (کلیک روی کارت: مشاهده پاسخ بیمار | دکمه کپی: کپی متن):' : 'Essential pharmacist consultation phrases (click to view answer):'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
                        High Yield
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {scenario.whatQuestions.map((q) => {
                        const isAsked = !!askedQuestions[q.key];
                        const isStarred = isQnaStarred(q.question.en);
                        return (
                          <div
                            key={q.key}
                            onClick={() => onAskWwhamQuestion(q)}
                            className={`p-3.5 rounded-2xl border transition cursor-pointer space-y-2 shadow-xs group ${
                              isAsked
                                ? 'bg-purple-950/40 border-purple-500/50 hover:border-purple-400'
                                : 'bg-slate-900/90 hover:bg-slate-800/90 border-purple-500/20 hover:border-purple-400/50'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-purple-300 font-bold text-xs px-2 py-0.5 rounded-md bg-purple-500/20 border border-purple-500/30">
                                  [{q.key}]
                                </span>
                                <span className="text-[11.5px] text-slate-300 font-semibold">
                                  {q.label[language] || q.label.en}
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {isStarred && <span className="text-amber-400 text-xs">⭐</span>}
                                {isAsked && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
                                    <Check className="w-3 h-3" /> {isFa ? 'پاسخ داده شد' : 'Answered'}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCopyPhrase(q.question.en);
                                  }}
                                  className="text-[11px] text-slate-400 hover:text-white px-2.5 py-1 rounded-lg bg-black/40 hover:bg-purple-600/40 border border-slate-700 hover:border-purple-400 transition flex items-center gap-1 cursor-pointer"
                                >
                                  {copiedPhraseText === q.question.en ? (
                                    <span className="text-emerald-400 font-bold flex items-center gap-0.5">
                                      <Check className="w-3 h-3" /> {isFa ? 'کپی شد' : 'Copied'}
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-0.5">
                                      <Copy className="w-3 h-3" /> Copy
                                    </span>
                                  )}
                                </button>
                              </div>
                            </div>

                            <p className="font-medium text-white text-xs sm:text-sm leading-relaxed" dir="ltr">
                              &ldquo;{q.question.en}&rdquo;
                            </p>

                            {isFa && (
                              <p className="text-[12px] text-purple-200/90 leading-relaxed border-t border-purple-500/15 pt-1.5">
                                {q.question.fa}
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SUB-TAB 1: RED FLAGS & GP REFERRAL */}
              {consultSubTab === 1 && (
                <motion.div
                  key="consult-subtab-1"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="app-card border border-rose-500/30 rounded-2xl p-4 sm:p-5 shadow-lg bg-gradient-to-b from-rose-950/20 via-slate-900/90 to-slate-950/90 space-y-3">
                    <div className="flex items-center justify-between border-b border-rose-500/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          <ShieldAlert className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {isFa ? 'پرچم‌های قرمز بالینی و علائم هشدار (Red Flags)' : 'Clinical Red Flags & Safety Screening'}
                          </h3>
                          <p className="text-[11px] text-rose-300">
                            {isFa ? 'علائمی که در صورت مشاهده، ارجاع به پزشک (GP) الزامی است:' : 'Symptoms requiring immediate medical referral:'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                        {scenario.redFlags.length} Flags
                      </span>
                    </div>

                    <div className="space-y-2">
                      {scenario.redFlags.map((rf, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-rose-100 flex items-start gap-2.5"
                        >
                          <span className="text-rose-400 font-bold shrink-0 mt-0.5">🚩</span>
                          <div className="flex-1 space-y-0.5">
                            <p className="font-bold text-rose-200 text-xs sm:text-[12.5px]">
                              {isFa ? rf.fa : rf.en}
                            </p>
                            {isFa && rf.en && (
                              <p className="text-[11px] text-slate-400 font-mono" dir="ltr">
                                {rf.en}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="pt-2 border-t border-rose-500/20 flex flex-col sm:flex-row gap-2">
                      <button
                        type="button"
                        onClick={onCheckRedFlags}
                        className="flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer bg-rose-600 hover:bg-rose-500 text-white border-rose-400 shadow-md shadow-rose-600/30"
                      >
                        <ShieldAlert className="w-4 h-4" />
                        <span>
                          {askedRedFlagChecks['rf-check']
                            ? (isFa ? 'مشاهده مجدد پاپ‌آپ پرچم‌های قرمز 🚩' : 'Re-open Red Flags Modal 🚩')
                            : (isFa ? 'پاپ‌آپ تفصیلی پرچم‌های قرمز' : 'Detailed Red Flags Modal')}
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={onOpenReferralModal}
                        className="py-2.5 px-4 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer bg-slate-900 hover:bg-slate-800 text-rose-300 border-rose-500/40"
                      >
                        <BookOpen className="w-4 h-4 text-rose-400" />
                        <span>{isFa ? '📄 صدور برگه ارجاع به GP' : '📄 Generate GP Referral'}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* SUB-TAB 2: PHARMACIST CLINICAL DECISION */}
              {consultSubTab === 2 && (
                <motion.div
                  key="consult-subtab-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <div className="app-card border border-teal-500/30 rounded-2xl p-4 sm:p-5 shadow-lg bg-gradient-to-b from-teal-950/20 via-slate-900/90 to-slate-950/90 space-y-3.5">
                    <div className="flex items-center justify-between border-b border-teal-500/20 pb-2.5">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30">
                          <Stethoscope className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm sm:text-base font-black text-white">
                            {isFa ? 'تصمیم‌گیری بالینی و اقدام نهایی داروساز' : 'Pharmacist Clinical Decision & Action'}
                          </h3>
                          <p className="text-[11px] text-teal-300">
                            {isFa ? 'کدام توصیه بالینی یا اقدام داروساز برای این بیمار صحیح است؟' : 'Select the appropriate pharmacist action:'}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300">
                        {scenario.dialogueOptions.length} Actions
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {scenario.dialogueOptions.map((opt, optIdx) => {
                        const isSelected = selectedDialogueId === opt.id;
                        const optText = opt.text[language] || opt.text.en;
                        return (
                          <div
                            key={opt.id}
                            onClick={() => onSelectDialogueOption(opt)}
                            className={`p-3.5 rounded-2xl border text-xs transition cursor-pointer space-y-2 shadow-xs ${
                              isSelected
                                ? opt.isCorrectAdvice
                                  ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500/40 text-emerald-100'
                                  : 'bg-rose-950/70 border-rose-500 ring-1 ring-rose-500/40 text-rose-100'
                                : 'bg-slate-950/80 border-slate-800 hover:border-teal-500/60 hover:bg-slate-900 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                              <span className="font-bold text-[11px] text-teal-300 flex items-center gap-1.5">
                                <span className="w-5 h-5 rounded-full bg-teal-500/20 border border-teal-500/30 inline-flex items-center justify-center font-mono text-[10px]">
                                  {optIdx + 1}
                                </span>
                                <span>{isFa ? `گزینه اقدام ${optIdx + 1}` : `Decision Option ${optIdx + 1}`}</span>
                              </span>
                              {isSelected && (
                                <span
                                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-bold border ${
                                    opt.isCorrectAdvice
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                                  }`}
                                >
                                  {opt.isCorrectAdvice
                                    ? isFa ? '✅ پاسخ صحیح و منطبق با گایدلاین' : '✅ Correct Practice Guideline'
                                    : isFa ? '❌ هشدار اقدام نامناسب' : '❌ Inappropriate Action'}
                                </span>
                              )}
                            </div>

                            <FormattedClinicalText text={optText} language={language} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Outcome Feedback Card */}
                  {showOutcome && (
                    <OutcomeFeedbackCard
                      language={language}
                      scenario={scenario}
                      selectedOption={selectedOption || undefined}
                      onOpenReferralModal={onOpenReferralModal}
                      onNavigateToFred={onNavigateToFred}
                      onNavigateToModule={onNavigateToModule}
                      onOpenAiLeitner={onOpenAiLeitner}
                    />
                  )}
                </motion.div>
              )}

              {/* SUB-TAB 3: AUSSIE PRACTICE CONTEXT, LOCAL SLANG & REGULATIONS */}
              {consultSubTab === 3 && (
                <motion.div
                  key="consult-subtab-3"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-3"
                >
                  <AussieContextCard
                    language={language}
                    scenario={scenario}
                  />
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
