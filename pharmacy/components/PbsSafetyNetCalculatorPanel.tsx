'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  DollarSign,
  CreditCard,
  TrendingUp,
  AlertTriangle,
  Award,
  CheckCircle2,
  Clock,
  ShieldCheck,
  HelpCircle,
  Sparkles,
  Zap,
  Info,
  Calendar,
  Layers,
  Check,
  FileCheck,
} from 'lucide-react';

export type PatientClass =
  | 'general'
  | 'concession'
  | 'ctg_general'
  | 'ctg_concession'
  | 'safety_net_entitlement'
  | 'safety_net_concession';

interface PbsSafetyNetCalculatorPanelProps {
  language: Language;
  defaultPatientClass?: PatientClass;
}

export const PbsSafetyNetCalculatorPanel: React.FC<PbsSafetyNetCalculatorPanelProps> = ({
  language,
  defaultPatientClass = 'general',
}) => {
  const isFa = language === 'fa';

  // State
  const [patientClass, setPatientClass] = useState<PatientClass>(defaultPatientClass);
  const [drugPrice, setDrugPrice] = useState<number>(45.0); // Full PBS price before subsidy
  const [daysSinceLastSupply, setDaysSinceLastSupply] = useState<number>(14); // For Early Supply Rule
  const [isChronicMedication, setIsChronicMedication] = useState<boolean>(true);

  // Safety Net Accumulator State
  const [concessionalAccumulated, setConcessionalAccumulated] = useState<number>(246.40);
  const [generalAccumulated, setGeneralAccumulated] = useState<number>(1280.00);
  const [isPb240ModalOpen, setIsPb240ModalOpen] = useState<boolean>(false);
  const [issuedCardNumber, setIssuedCardNumber] = useState<string | null>(null);

  // Australian PBS Constants (Standard 2026 Rates)
  const GENERAL_MAX_COPAY = 31.60;
  const CONCESSION_MAX_COPAY = 7.70;
  const CONCESSION_SAFETY_NET_THRESHOLD = 277.20; // ~36 scripts at $7.70
  const GENERAL_SAFETY_NET_THRESHOLD = 1563.20;

  // Early Supply Rule Check (<20 days)
  const isEarlySupply = isChronicMedication && daysSinceLastSupply < 20;

  // Calculate Co-payment based on rules
  const calculateCoPayment = () => {
    // If Early Supply Rule is triggered, patient must pay standard co-payment regardless of CTG/Safety Net
    if (isEarlySupply) {
      if (patientClass === 'concession' || patientClass === 'ctg_concession' || patientClass === 'safety_net_concession') {
        return CONCESSION_MAX_COPAY;
      }
      return GENERAL_MAX_COPAY;
    }

    switch (patientClass) {
      case 'general':
        return Math.min(GENERAL_MAX_COPAY, drugPrice);
      case 'concession':
        return Math.min(CONCESSION_MAX_COPAY, drugPrice);
      case 'ctg_general':
        // CTG General pays Concessional Rate ($7.70)
        return Math.min(CONCESSION_MAX_COPAY, drugPrice);
      case 'ctg_concession':
        // CTG Concession pays $0.00
        return 0.0;
      case 'safety_net_entitlement':
        // Safety Net Entitlement (Concession card holder reached SN threshold) pays $0.00
        return 0.0;
      case 'safety_net_concession':
        // Safety Net Concession (General patient reached SN threshold) pays Concessional Rate ($7.70)
        return Math.min(CONCESSION_MAX_COPAY, drugPrice);
      default:
        return GENERAL_MAX_COPAY;
    }
  };

  const currentCoPay = calculateCoPayment();
  const pbsGovernmentSubsidy = Math.max(0, drugPrice - currentCoPay);

  // Active Threshold & Progress based on patient category
  const isConcessionalTrack =
    patientClass === 'concession' ||
    patientClass === 'ctg_concession' ||
    patientClass === 'safety_net_entitlement';

  const activeThreshold = isConcessionalTrack
    ? CONCESSION_SAFETY_NET_THRESHOLD
    : GENERAL_SAFETY_NET_THRESHOLD;

  const currentAccumulated = isConcessionalTrack
    ? concessionalAccumulated
    : generalAccumulated;

  const progressPercent = Math.min(100, Math.round((currentAccumulated / activeThreshold) * 100));
  const remainingToThreshold = Math.max(0, activeThreshold - currentAccumulated);

  // Add prescription cost to Safety Net accumulator
  const handleSimulateDispense = () => {
    // If early supply, cost does NOT count toward Safety Net threshold credit!
    if (isEarlySupply) {
      alert(
        isFa
          ? 'تنبيه: تحویل زودهنگام (Early Supply) شامل اعتبار در صندوق Safety Net نمی‌شود!'
          : 'Early Supply Rule: This supply cost does NOT count towards the Safety Net accumulator credit!'
      );
      return;
    }

    if (isConcessionalTrack) {
      const updated = concessionalAccumulated + currentCoPay;
      setConcessionalAccumulated(updated);
      if (updated >= CONCESSION_SAFETY_NET_THRESHOLD && concessionalAccumulated < CONCESSION_SAFETY_NET_THRESHOLD) {
        setIsPb240ModalOpen(true);
      }
    } else {
      const updated = generalAccumulated + currentCoPay;
      setGeneralAccumulated(updated);
      if (updated >= GENERAL_SAFETY_NET_THRESHOLD && generalAccumulated < GENERAL_SAFETY_NET_THRESHOLD) {
        setIsPb240ModalOpen(true);
      }
    }
  };

  const handleIssuePb240Card = () => {
    const randomCardNo = 'SN-2026-' + Math.floor(100000 + Math.random() * 900000);
    setIssuedCardNumber(randomCardNo);
    setIsPb240ModalOpen(false);
  };

  // Patient Classification Explanations Dictionary for Interactive Tooltips
  const patientClassInfo: Record<
    PatientClass,
    { titleEn: string; titleFa: string; copayEn: string; copayFa: string; descEn: string; descFa: string; badgeColor: string }
  > = {
    general: {
      titleEn: 'General Patient',
      titleFa: 'بیمار عمومی (General)',
      copayEn: 'Up to $31.60 Max Co-payment',
      copayFa: 'حداکثر سهم پرداختی ۳۱.۶۰ دلار',
      descEn: 'Standard general patients pay up to the maximum PBS co-payment of $31.60 per prescription until reaching the $1,563.20 annual threshold.',
      descFa: 'بیماران عمومی استاندارد تا سقف حداکثر ۳۱.۶۰ دلار برای هر نسخه پرداختی دارند تا زمانی که به سقف حد نصاب سالانه ۱۵۶۳.۲۰ دلار برسند.',
      badgeColor: 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200',
    },
    concession: {
      titleEn: 'Concession / Pensioner Cardholder',
      titleFa: 'کارت تخفیف / مستمری‌بگیر (Concession)',
      copayEn: '$7.70 Fixed Co-payment',
      copayFa: 'سهم پرداختی ثابت ۷.۷۰ دلار',
      descEn: 'Government concession cardholders (Pensioner Concession Card, Health Care Card, CSHC) pay $7.70 per PBS prescription.',
      descFa: 'دارندگان کارت‌های تخفیف دولتی (مستمری‌بگیران، کارت مراقبت سلامت HCC و سالمندان) مبلغ ثابت ۷.۷۰ دلار برای هر نسخه می‌پردازند.',
      badgeColor: 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200',
    },
    ctg_general: {
      titleEn: 'Closing the Gap (CTG) General Patient',
      titleFa: 'تسهیلات پر کردن شکاف - عمومی (CTG General)',
      copayEn: 'Drops from $31.60 to $7.70',
      copayFa: 'کاهش سهم پرداختی از ۳۱.۶۰ به ۷.۷۰ دلار',
      descEn: 'Indigenous health benefit dropping co-payment for eligible Aboriginal & Torres Strait Islander General patients from $31.60 down to $7.70.',
      descFa: 'تسهیلات طرح پر کردن شکاف (CTG) سهم پرداختی بیمار عمومی بومی را از ۳۱.۶۰ دلار به نرخ تخفیفی ۷.۷۰ دلار کاهش می‌دهد.',
      badgeColor: 'border-indigo-500/50 bg-indigo-950/80 text-indigo-200',
    },
    ctg_concession: {
      titleEn: 'Closing the Gap (CTG) Concession Patient',
      titleFa: 'تسهیلات پر کردن شکاف - تخفیف‌دار (CTG Concession)',
      copayEn: '$0.00 Free Co-payment',
      copayFa: 'کاملاً رایگان (۰.۰۰ دلار)',
      descEn: 'Indigenous health benefit waiving co-payment entirely ($0.00 Free) for eligible Aboriginal & Torres Strait Islander Concession patients.',
      descFa: 'تسهیلات طرح پر کردن شکاف (CTG) سهم پرداختی بیمار تخفیف‌دار بومی را کاملاً رایگان (۰.۰۰ دلار) می‌سازد.',
      badgeColor: 'border-indigo-500/50 bg-indigo-950/80 text-indigo-200',
    },
    safety_net_entitlement: {
      titleEn: 'Safety Net Entitlement Cardholder (CN)',
      titleFa: 'دارنده کارت سهمیه کامل Safety Net (CN)',
      copayEn: '$0.00 Free PBS Scripts',
      copayFa: 'داروهای PBS کاملاً رایگان (۰.۰۰ دلار)',
      descEn: 'Concession patients who pass the $277.20 annual threshold receive Form PB240 card, granting $0.00 free PBS scripts for the rest of the year.',
      descFa: 'بیماران Concession پس از گذشتن از حد نصاب سالانه ۲۷۷.۲۰ دلار کارت PB240 رایگان دریافت کرده و بقیه نسخه‌های PBS سال ۰.۰۰ دلار می‌شود.',
      badgeColor: 'border-amber-500/50 bg-amber-950/80 text-amber-200',
    },
    safety_net_concession: {
      titleEn: 'Safety Net Concession Cardholder (SN)',
      titleFa: 'دارنده کارت تخفیف Safety Net (SN)',
      copayEn: '$7.70 Concessional Rate',
      copayFa: 'سهم پرداختی تخفیفی ۷.۷۰ دلار',
      descEn: 'General patients who pass the $1,563.20 annual threshold receive Safety Net Concession Card, dropping copays to $7.70 for the rest of the year.',
      descFa: 'بیماران General پس از گذشتن از حد نصاب سالانه ۱۵۶۳.۲۰ دلار کارت تخفیف دریافت کرده و سهم پرداختی بقیه نسخه‌های سال به ۷.۷۰ دلار کاهش می‌یابد.',
      badgeColor: 'border-amber-500/50 bg-amber-950/80 text-amber-200',
    },
  };

  const currentInfo = patientClassInfo[patientClass];

  return (
    <div className="space-y-6">
      <div className="app-card border-2 border-emerald-500/30 rounded-2xl p-4 sm:p-6 bg-slate-900 text-white shadow-xl">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[11px] font-bold border border-emerald-500/30">
                SUB-PHASE 5.2
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                {isFa
                  ? 'موتور محاسبه قیمت گذاری PBS، تخفیف‌ها و قوانین Safety Net'
                  : 'PBS Pricing, Co-payment Rules & Safety Net Accumulator Engine'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-xl bg-emerald-950 text-emerald-300 font-mono text-xs font-bold border border-emerald-700/60 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" />
              PBS Rates 2026
            </span>
          </div>
        </div>

        {/* MAIN ENGINE GRID */}
        <div className="mt-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT 7 COLS: PATIENT CLASS & PRICING SIMULATOR */}
          <div className="lg:col-span-7 space-y-5">
            {/* 1. Patient Class Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300 font-mono uppercase">
                {isFa ? '۱. تعیین رده و کارت پوشش بیمار (Patient Classification):' : '1. Select Patient Classification:'}
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                {/* General */}
                <button
                  onClick={() => setPatientClass('general')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'general'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'بیمار عمومی (General)' : 'General Patient'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Max Co-pay: ${GENERAL_MAX_COPAY.toFixed(2)}</p>
                </button>

                {/* Concession */}
                <button
                  onClick={() => setPatientClass('concession')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'concession'
                      ? 'bg-emerald-600 text-white border-emerald-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'کارت تخفیف (Concession / Pension)' : 'Concession / Pensioner'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Max Co-pay: ${CONCESSION_MAX_COPAY.toFixed(2)}</p>
                </button>

                {/* CTG General */}
                <button
                  onClick={() => setPatientClass('ctg_general')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'ctg_general'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'تسهیلات CTG عمومی' : 'CTG General'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Pays Concessional: ${CONCESSION_MAX_COPAY.toFixed(2)}</p>
                </button>

                {/* CTG Concession */}
                <button
                  onClick={() => setPatientClass('ctg_concession')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'ctg_concession'
                      ? 'bg-indigo-600 text-white border-indigo-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'تسهیلات CTG تخفیف‌دار' : 'CTG Concession'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Pays: $0.00 Free</p>
                </button>

                {/* Safety Net Entitlement Card Holder */}
                <button
                  onClick={() => setPatientClass('safety_net_entitlement')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'safety_net_entitlement'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'دارنده کارت Safety Net CN' : 'SN Entitlement Card'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Pays: $0.00 Free</p>
                </button>

                {/* Safety Net Concession Card Holder */}
                <button
                  onClick={() => setPatientClass('safety_net_concession')}
                  className={`p-3 rounded-xl font-bold transition text-left border ${
                    patientClass === 'safety_net_concession'
                      ? 'bg-amber-600 text-white border-amber-400 shadow-md'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs">{isFa ? 'دارنده کارت Safety Net SN' : 'SN Concession Card'}</p>
                  <p className="text-[10px] opacity-80 mt-0.5">Pays: ${CONCESSION_MAX_COPAY.toFixed(2)}</p>
                </button>
              </div>

              {/* RICH INTERACTIVE PATIENT CLASSIFICATION TOOLTIP EXPLANATION CARD */}
              <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 transition-all animate-in fade-in ${currentInfo.badgeColor}`}>
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <div className="flex items-center gap-2 font-bold">
                    <Info className="w-4 h-4 text-teal-300 shrink-0" />
                    <span>{isFa ? currentInfo.titleFa : currentInfo.titleEn}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-black/40 font-mono text-[10px] font-bold">
                    {isFa ? currentInfo.copayFa : currentInfo.copayEn}
                  </span>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] leading-relaxed opacity-95">
                    {isFa ? currentInfo.descFa : currentInfo.descEn}
                  </p>
                </div>
              </div>
            </div>

            {/* 2. Co-payment Financial Breakdown Display */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-teal-300 font-mono uppercase flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-teal-400" />
                  {isFa ? 'محاسبه شفاف هزینه نسخه (PBS Price Breakdown):' : 'PBS Co-payment Financial Breakdown'}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-[11px]">Full PBS Item Price:</span>
                  <input
                    type="number"
                    value={drugPrice}
                    onChange={(e) => setDrugPrice(parseFloat(e.target.value) || 0)}
                    className="w-20 px-2 py-0.5 bg-black border border-slate-700 rounded text-right font-mono font-bold text-emerald-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 space-y-1">
                  <span className="text-[10px] text-slate-400 block">{isFa ? 'قیمت کل داروی PBS' : 'Full PBS Drug Cost'}</span>
                  <span className="font-mono text-sm font-bold text-white">${drugPrice.toFixed(2)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-emerald-950/80 border border-emerald-500/40 space-y-1">
                  <span className="text-[10px] text-emerald-300 block font-bold">{isFa ? 'پرداختی بیمار (Co-pay)' : 'Patient Final Co-payment'}</span>
                  <span className="font-mono text-base font-bold text-emerald-400">${currentCoPay.toFixed(2)}</span>
                </div>

                <div className="p-2.5 rounded-lg bg-sky-950/80 border border-sky-500/40 space-y-1">
                  <span className="text-[10px] text-sky-300 block font-bold">{isFa ? 'یارانه دولتی PBS' : 'PBS Government Subsidy'}</span>
                  <span className="font-mono text-sm font-bold text-sky-400">${pbsGovernmentSubsidy.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* 3. EARLY SUPPLY RULE ENGINE (<20 Days Rule) */}
            <div className="p-4 rounded-xl bg-slate-950 border border-rose-500/30 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 text-rose-300 font-bold">
                  <Clock className="w-4 h-4 text-rose-400" />
                  <span>{isFa ? 'موتور قانون تحویل زودهنگام (Early Supply 20-Day Rule Engine)' : 'Early Supply Rule Check (<20 Days)'}</span>
                </div>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={isChronicMedication}
                    onChange={(e) => setIsChronicMedication(e.target.checked)}
                    className="w-3.5 h-3.5 rounded text-rose-600 focus:ring-rose-500"
                  />
                  <span>{isFa ? 'داروی مزمن (PBS Chronic List)' : 'PBS Chronic Medication'}</span>
                </label>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300 text-[11px]">
                <div>
                  <p className="font-bold">{isFa ? 'فاصله زمانی از آخرین تحویل نوبت قبل:' : 'Interval Since Last Supply:'}</p>
                  <p className="text-slate-400 text-[10px]">
                    {isFa
                      ? 'در صورت تحویل مجدد داروی مزمن در کمتر از ۲۰ روز، هزینه نسخه شامل اعتبار Safety Net نمی‌شود.'
                      : 'Repeat dispensed within <20 days of last supply does NOT count towards Safety Net accumulator.'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <input
                    type="range"
                    min="1"
                    max="35"
                    value={daysSinceLastSupply}
                    onChange={(e) => setDaysSinceLastSupply(parseInt(e.target.value))}
                    className="w-28 accent-rose-500 cursor-pointer"
                  />
                  <span className="font-mono font-bold text-xs px-2 py-1 rounded bg-slate-900 border border-slate-800 text-rose-300 min-w-[55px] text-center">
                    {daysSinceLastSupply} days
                  </span>
                </div>
              </div>

              {/* Explicit Early Supply 20-Day Rule Explanation Badge */}
              <div className="p-3 rounded-xl bg-slate-900 border-2 border-rose-500/50 text-xs space-y-1">
                <div className="flex items-center gap-2 font-bold text-rose-300">
                  <Clock className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>
                    {isFa ? 'شرح قانون تحویل زودهنگام ۲۰ روزه (Early Supply 20-Day Rule):' : 'Early Supply 20-Day Rule Explanation Badge'}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-slate-200">
                  {isFa
                    ? 'تحویل مجدد داروهای مزمن در کمتر از ۲۰ روز، هزینه نسخه را از صندوق انباشت سالانه Safety Net مستثنی نموده و سهم پرداختی استاندارد بیمار را اعمال می‌کند.'
                    : 'Supplying chronic meds in <20 days excludes the cost from Safety Net accumulators and enforces standard copay.'}
                </p>
              </div>

              {/* Explicit Early Supply Warning Message */}
              {isEarlySupply ? (
                <div className="p-3 rounded-lg bg-rose-950/90 border border-rose-500/60 text-rose-200 space-y-1 animate-pulse">
                  <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>
                      {isFa
                        ? 'هشدار: قانون تحویل زودهنگام فعال گردید! (Early Supply Rule Triggered)'
                        : 'Early Supply Rule Triggered (<20 Days)!'}
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    {isFa
                      ? 'این نوبت در فاصله کمتر از ۲۰ روز از تحویل قبلی دیسپنس شده است. بیمار واجد شرایط اعتبار Safety Net برای این نسخه نبوده و هزینه کامل سهم بیمار (Standard Co-payment) اعمال می‌گردد.'
                      : 'Early Supply Rule Triggered: Patient does not qualify for Safety Net credit for this supply. Standard co-payment applies.'}
                  </p>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    {isFa
                      ? 'فاصله تحویل مجاز است (>۲۰ روز). مبلغ پرداختی به صندوق Safety Net اضافه خواهد شد.'
                      : 'Supply interval is valid (≥20 days). Co-payment will accumulate towards Safety Net.'}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLS: ANNUAL SAFETY NET ACCUMULATOR & PB240 CARD ISSUANCE */}
          <div className="lg:col-span-5 space-y-5">
            {/* Safety Net Visual Progress Accumulator */}
            <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/40 space-y-4 text-xs shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2 font-bold text-emerald-300">
                  <Award className="w-4 h-4 text-emerald-400" />
                  <span>{isFa ? 'صندوق و انباشت سالانه Safety Net' : 'Annual Safety Net Accumulator'}</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-900 text-emerald-200 font-mono font-bold">
                  Year 2026
                </span>
              </div>

              {/* Track Indicator */}
              <div className="flex justify-between items-center text-[11px] text-slate-300">
                <span>{isFa ? 'مسیر محاسبه بیمار:' : 'Active Track:'}</span>
                <strong className="text-teal-300 font-mono">
                  {isConcessionalTrack ? 'Concessional Track ($277.20)' : 'General Track ($1,563.20)'}
                </strong>
              </div>

              {/* Progress Bar Display */}
              <div className="space-y-1.5">
                <div className="flex justify-between text-[11px] font-mono">
                  <span className="text-slate-400">Accumulated Cost:</span>
                  <span className="font-bold text-emerald-400">${currentAccumulated.toFixed(2)} / ${activeThreshold.toFixed(2)}</span>
                </div>

                <div className="w-full bg-slate-900 rounded-full h-4 p-0.5 border border-slate-800 relative overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-emerald-600 via-teal-500 to-amber-400 h-full rounded-full transition-all duration-500"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-0.5">
                  <span>Progress: <strong>{progressPercent}%</strong></span>
                  <span>Remaining: <strong className="text-amber-300">${remainingToThreshold.toFixed(2)}</strong></span>
                </div>
              </div>

              {/* Add Prescription to Accumulator Simulator Button */}
              <button
                onClick={handleSimulateDispense}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-md shadow-emerald-600/30 text-xs"
              >
                <Zap className="w-4 h-4 text-amber-300" />
                <span>
                  {isFa
                    ? `ثبت نسخه و افزودن $${currentCoPay.toFixed(2)} به صندوق`
                    : `Record Supply & Add $${currentCoPay.toFixed(2)} to Safety Net`}
                </span>
              </button>

              {/* Issued Card Alert if active */}
              {issuedCardNumber && (
                <div className="p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 text-amber-200 text-xs space-y-1">
                  <p className="font-bold text-amber-300 flex items-center gap-1.5">
                    <FileCheck className="w-4 h-4 text-amber-400" />
                    {isFa ? 'کارت PB240 صادر گردیده است' : 'Safety Net Card Issued!'}
                  </p>
                  <p className="font-mono text-[11px] text-amber-100">Card No: {issuedCardNumber}</p>
                </div>
              )}
            </div>

            {/* Safety Net Rules Quick Summary Card */}
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-2.5 text-slate-300">
              <span className="font-bold text-indigo-300 block border-b border-slate-800 pb-1.5 font-mono">
                {isFa ? 'راهنمای قوانین سقف Safety Net:' : 'PBS Safety Net Threshold Rules:'}
              </span>
              <ul className="list-disc list-inside space-y-1 text-[11px]">
                <li>
                  {isFa
                    ? 'بیماران Concession پس از رسیدن به $277.20، کارت رایگان دریافت کرده و داروهای بعدی $0.00 می‌شود.'
                    : 'Concession patients crossing $277.20 receive Entitlement Card (All future PBS scripts $0.00).'}
                </li>
                <li>
                  {isFa
                    ? 'بیماران General پس از رسیدن به $1,563.20، کارت تخفیف دریافت کرده و هر نسخه $7.70 می‌شود.'
                    : 'General patients crossing $1,563.20 receive Safety Net Concession Card (Scripts drop to $7.70).'}
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* SAFETY NET THRESHOLD REACHED MODAL (FORM PB240 CARD ISSUANCE) */}
      {isPb240ModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="app-card border-2 border-amber-500/60 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl bg-slate-900 text-white animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-amber-500/40 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-base">
                <Award className="w-6 h-6 text-amber-400 shrink-0" />
                <span>{isFa ? 'حد نصاب Safety Net تکمیل شد! (Form PB240)' : 'Safety Net Threshold Reached!'}</span>
              </div>
              <button
                onClick={() => setIsPb240ModalOpen(false)}
                className="text-slate-400 hover:text-white font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-200">
              <p className="leading-relaxed">
                {isFa
                  ? 'هزینه دارویی بیمار در سال جاری به سقف مقرر در آیین‌نامه رسید. سیستم صدور کارت سهمیه Safety Net (Form PB240) را فعال نموده است.'
                  : 'Cumulative prescription costs have crossed the annual PBS threshold. You are required to issue a Safety Net Entitlement/Concession Card (Form PB240).'}
              </p>

              <div className="p-3.5 rounded-xl bg-amber-950/60 border border-amber-500/40 space-y-2">
                <p className="font-bold text-amber-300 text-sm">Form PB240 Safety Net Card Details:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-300">
                  <div>
                    <span className="text-slate-400 block">Accumulated:</span>
                    <strong className="text-emerald-400">${currentAccumulated.toFixed(2)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Entitlement Type:</span>
                    <strong className="text-amber-300">
                      {isConcessionalTrack ? 'Free Supply ($0.00)' : 'Concessional Supply ($7.70)'}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setIsPb240ModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition"
                >
                  {isFa ? 'انصراف' : 'Cancel'}
                </button>
                <button
                  onClick={handleIssuePb240Card}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold transition flex items-center gap-2 shadow-lg shadow-amber-600/30"
                >
                  <FileCheck className="w-4 h-4" />
                  <span>{isFa ? 'صدور کارت PB240' : 'Issue Safety Net Card (PB240)'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
