'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  X,
  PhoneCall,
  User,
  Clock,
  Calendar,
  Pill,
  ExternalLink,
  Lock,
  FileText,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { haptic } from '@/lib/haptics';

export type SafeScriptAlertLevel = 'GREEN' | 'AMBER' | 'RED';

export interface SafeScriptDrugDetails {
  drugName: string;
  brandName?: string;
  schedule: 'S8' | 'S4D';
  patientName: string;
  patientDob: string;
  prescriberName: string;
  alertLevel: SafeScriptAlertLevel;
  omedDose?: number; // Oral Morphine Equivalent Dose in mg/day
  dispenseHistory: Array<{
    date: string;
    drug: string;
    quantity: number;
    prescriber: string;
    pharmacy: string;
  }>;
  reasons: {
    fa: string[];
    en: string[];
  };
  pharmacistActionRequired: {
    fa: string;
    en: string;
  };
}

interface SafeScriptAlertModalProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  drugDetails?: SafeScriptDrugDetails;
  onConfirmDispense?: () => void;
}

export const SafeScriptAlertModal: React.FC<SafeScriptAlertModalProps> = ({
  language,
  isOpen,
  onClose,
  drugDetails,
  onConfirmDispense,
}) => {
  const isFa = language === 'fa';
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'protocol'>('overview');
  const [acknowledged, setAcknowledged] = useState(false);
  const [gpContactNote, setGpContactNote] = useState('');

  if (!isOpen || !drugDetails) return null;

  const isRed = drugDetails.alertLevel === 'RED';
  const isAmber = drugDetails.alertLevel === 'AMBER';
  const isGreen = drugDetails.alertLevel === 'GREEN';

  const badgeColor = isRed
    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
    : isAmber
    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

  const headerBg = isRed
    ? 'bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-slate-900 border-rose-500/40'
    : isAmber
    ? 'bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-slate-900 border-amber-500/40'
    : 'bg-gradient-to-r from-emerald-950/80 via-emerald-900/60 to-slate-900 border-emerald-500/40';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2.5 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className={`p-4 border-b ${headerBg} flex items-center justify-between shrink-0`}>
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isRed
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/40 animate-pulse'
                  : isAmber
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/40'
                  : 'bg-emerald-600 text-white'
              }`}
            >
              {isRed ? (
                <ShieldAlert className="w-6 h-6" />
              ) : isAmber ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <CheckCircle2 className="w-6 h-6" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black tracking-wider uppercase text-slate-300">
                  SafeScript / QScript RTPM
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${badgeColor}`}>
                  {isRed
                    ? isFa ? '🔴 هشدار قرمز ریسک بالا (Red Alert)' : '🔴 High Risk Red Alert'
                    : isAmber
                    ? isFa ? '🟡 هشدار زرد احتیاط (Amber Alert)' : '🟡 Amber Caution Alert'
                    : isFa ? '🟢 سابقه عادی (Green Standard)' : '🟢 Normal History'}
                </span>
              </div>
              <h2 className="text-sm sm:text-base font-bold text-white leading-snug">
                {isFa ? 'سامانه رسمی مانیتورینگ بلادرنگ نسخه‌های کنترل‌شده استرالیا' : 'National Real-Time Prescription Monitoring System'}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient & Drug Summary Ribbon */}
        <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
          <div>
            <span className="text-slate-400 block text-[10px]">{isFa ? 'بیمار:' : 'Patient:'}</span>
            <span className="font-bold text-white truncate block">{drugDetails.patientName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isFa ? 'تاریخ تولد:' : 'DOB:'}</span>
            <span className="font-mono text-slate-200">{drugDetails.patientDob}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isFa ? 'داروی درخواستی:' : 'Requested Drug:'}</span>
            <span className="font-bold text-amber-300 truncate block">{drugDetails.drugName}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">{isFa ? 'رده دارو:' : 'Schedule:'}</span>
            <span className="font-bold text-rose-400">{drugDetails.schedule} Controlled</span>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 px-4 gap-2 bg-slate-950/40 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-2.5 px-3 border-b-2 font-bold transition cursor-pointer ${
              activeTab === 'overview'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFa ? 'تحلیل ریسک و دلایل' : 'Risk Reasons & Analysis'}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`py-2.5 px-3 border-b-2 font-bold transition cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>{isFa ? 'تاریخچه ۹۰ روزه نسخه‌ها' : '90-Day History'}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
              {drugDetails.dispenseHistory.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('protocol')}
            className={`py-2.5 px-3 border-b-2 font-bold transition cursor-pointer ${
              activeTab === 'protocol'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            {isFa ? 'اقدامات قانونی داروساز' : 'Pharmacist Protocol'}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs leading-relaxed">
          {activeTab === 'overview' && (
            <div className="space-y-3.5">
              {/* Alert Reason Cards */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
                <div className="font-bold text-slate-200 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-amber-400" />
                  <span>{isFa ? 'شاخص‌های ریسک شناسایی‌شده توسط الگوریتم SafeScript:' : 'Triggered Clinical Risk Criteria:'}</span>
                </div>
                <ul className="space-y-1.5">
                  {(isFa ? drugDetails.reasons.fa : drugDetails.reasons.en).map((reason, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2 p-2 rounded-lg bg-slate-900/90 border border-slate-800 text-slate-200"
                    >
                      <span className="text-rose-400 mt-0.5">⚠️</span>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* OMED Indicator */}
              {drugDetails.omedDose !== undefined && (
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <span className="text-slate-400 block text-[11px]">
                      {isFa ? 'دوز روزانه معادل مورفین خوراکی (OMED):' : 'Oral Morphine Equivalent Dose (OMED):'}
                    </span>
                    <span className="text-lg font-black text-amber-400">
                      {drugDetails.omedDose} mg / day
                    </span>
                  </div>
                  <div className="text-right text-[11px] text-slate-400">
                    <span className="block font-semibold text-slate-300">
                      {drugDetails.omedDose >= 100
                        ? isFa ? '🔴 دوز بحرانی (> 100mg/day)' : '🔴 Critical Dose (>100mg/day)'
                        : drugDetails.omedDose >= 50
                        ? isFa ? '🟡 دوز احتیاطی (50-99mg/day)' : '🟡 Caution Dose (50-99mg/day)'
                        : isFa ? '🟢 دوز استاندارد (< 50mg/day)' : '🟢 Standard Dose (<50mg/day)'}
                    </span>
                    <span>{isFa ? 'حد مجاز گایدلاین استرالیا: 50mg' : 'APF / Faculty of Pain Medicine benchmark: 50mg'}</span>
                  </div>
                </div>
              )}

              {/* Action Required Box */}
              <div
                className={`p-3.5 rounded-xl border space-y-1.5 ${
                  isRed
                    ? 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    : isAmber
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                    : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                }`}
              >
                <span className="font-bold flex items-center gap-1.5 text-xs">
                  <PhoneCall className="w-4 h-4" />
                  {isFa ? 'الزام قانونی داروساز مسئول:' : 'Mandatory Pharmacist Clinical Action:'}
                </span>
                <p>
                  {isFa
                    ? drugDetails.pharmacistActionRequired.fa
                    : drugDetails.pharmacistActionRequired.en}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-2">
              <div className="text-[11px] text-slate-400 flex items-center justify-between pb-1">
                <span>{isFa ? 'سوابق ثبت‌شده در تمامی داروخانه‌ها و مطب‌ها:' : 'Dispensing history across all Australian pharmacies:'}</span>
                <span className="font-mono text-slate-500">Source: RTPM Hub</span>
              </div>
              <div className="space-y-2">
                {drugDetails.dispenseHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-xs">{item.drug}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                        {item.date}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <div>
                        <span className="text-slate-500">{isFa ? 'تعداد: ' : 'Qty: '}</span>
                        <span className="text-slate-200 font-mono font-bold">{item.quantity}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">{isFa ? 'پزشک: ' : 'Dr: '}</span>
                        <span className="text-slate-200">{item.prescriber}</span>
                      </div>
                      <div className="truncate">
                        <span className="text-slate-500">{isFa ? 'داروخانه: ' : 'Pharm: '}</span>
                        <span className="text-slate-200">{item.pharmacy}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'protocol' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-sky-400 flex items-center gap-1.5">
                  <FileText className="w-4 h-4" />
                  {isFa ? 'چک‌لیست الزامات قانونی دیسپنسینگ طبق قوانین Poisons Act:' : 'Legal Obligations under State Poisons Regulations:'}
                </span>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 pl-1">
                  <li>{isFa ? 'بررسی الزامی سامانه SafeScript قبل از تحویل هرگونه داروی S8 یا بنزودیازپین.' : 'Mandatory SafeScript check before dispensing any Schedule 8 or monitored medicine.'}</li>
                  <li>{isFa ? 'در صورت وجود هشدار قرمز، تماس تلفنی مستقیم با پزشک معالج جهت استعلام ضرورت و دوز دارو.' : 'If Red Alert triggers, directly phone the prescriber to confirm clinical indication and safety.'}</li>
                  <li>{isFa ? 'ثبت یادداشت بالینی (Clinical Note) در پرونده بیمار و درج شماره تماس و نام پزشک تاییدکننده.' : 'Record a permanent clinical note in the dispensary system documenting the discussion.'}</li>
                  <li>{isFa ? 'در صورت رد تحویل، ارائه مشاوره با احترام و معرفی بیمار به خدمات کاهش آسیب (Harm Reduction) یا پزشک معالج.' : 'If supply is refused, counsel the patient professionally and refer them back to their primary care prescriber.'}</li>
                </ol>
              </div>

              {/* GP Contact Note Input */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold text-slate-300">
                  {isFa ? 'یادداشت تماس با پزشک (Clinical Audit Note):' : 'Prescriber Consultation Audit Note:'}
                </label>
                <textarea
                  value={gpContactNote}
                  onChange={(e) => setGpContactNote(e.target.value)}
                  placeholder={
                    isFa
                      ? 'مثال: با مطب دکتر اسمیت تماس گرفته شد. ایشان از سابقه مصرف همزمان بنزودیازپین مطلع بوده و با دوز کاهشی ۱۰ روزه موافقت فرمودند.'
                      : 'e.g., Spoke with Dr. Smith; prescriber is aware of concurrent Diazepam and confirmed reducing regimen.'
                  }
                  rows={2}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-700 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>
            </div>
          )}

          {/* Pharmacist Acknowledgment Checkbox */}
          <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="ack-safescript"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 rounded accent-sky-500 w-4 h-4 cursor-pointer"
            />
            <label htmlFor="ack-safescript" className="text-[11px] text-slate-300 cursor-pointer select-none">
              {isFa
                ? 'من به عنوان داروساز مسئول استرالیا، سوابق مانیتورینگ SafeScript را بررسی کرده و مسئولیت بالینی و قانونی دیسپنس این دارو را می‌پذیرم.'
                : 'As the Responsible Pharmacist, I have reviewed SafeScript RTPM clinical history and take professional accountability.'}
            </label>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-3.5 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            {isFa ? 'بستن / رد تحویل دارو' : 'Cancel / Refuse Supply'}
          </button>

          {onConfirmDispense && (
            <button
              type="button"
              disabled={!acknowledged}
              onClick={() => {
                haptic.success();
                onConfirmDispense();
                onClose();
              }}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                acknowledged
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isFa ? 'تایید بالینی و دیسپنس دارو' : 'Clinically Authorize & Dispense'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
