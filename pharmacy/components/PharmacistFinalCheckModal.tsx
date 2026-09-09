'use client';

import React, { useState, useEffect } from 'react';
import { Language } from '@/types/pharmacy';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  FileText,
  Scan,
  BookOpen,
  UserCheck,
  DollarSign,
  AlertCircle,
  Clock,
  Printer,
  Check,
  X,
  Volume2,
  Lock,
  RefreshCw,
  Send,
  Archive,
  Box,
} from 'lucide-react';

interface ScriptScenarioData {
  id: string;
  type: string;
  patientName: string;
  patientDob: string;
  patientAddress?: string;
  medicareNumber: string;
  prescriberName: string;
  prescriberNumber: string;
  prescribedDrug: string;
  pbsCode: string;
  aFlagGenericSubstitute: string;
  schedule: 'S4' | 'S8';
  scriptDate: string;
  quantity: number;
  repeats: number;
  directions: string;
  isExpiredS8?: boolean;
}

interface PharmacistFinalCheckModalProps {
  language: Language;
  scenario: ScriptScenarioData;
  isGenericSubstituted: boolean;
  repeatMode: string;
  brandPreference: 'GS' | 'GB';
  onClose: () => void;
  onCompleteHandout: () => void;
  onOpenLabelingDesk?: () => void;
  onOpenRetentionDesk?: () => void;
  onOpenOdtDosingDesk?: () => void;
  onOpenPbsArchiveDesk?: () => void;
}

export const PharmacistFinalCheckModal: React.FC<PharmacistFinalCheckModalProps> = ({
  language,
  scenario,
  isGenericSubstituted,
  repeatMode,
  brandPreference,
  onClose,
  onCompleteHandout,
  onOpenLabelingDesk,
  onOpenRetentionDesk,
  onOpenOdtDosingDesk,
  onOpenPbsArchiveDesk,
}) => {
  const isFa = language === 'fa';
  const isS8 = scenario.schedule === 'S8';

  // 1. ScanCheck State
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [scanStatus, setScanStatus] = useState<'unscanned' | 'verified' | 'discrepancy'>('unscanned');

  // Correct product barcode mock
  const correctBarcode = '9310000' + scenario.pbsCode.replace(/[^0-9]/g, '').padStart(5, '0');
  const wrongBarcode = '931000099999';

  // 2. S8 Controlled Drug Register Logging State
  const [s8DobVerified, setS8DobVerified] = useState<boolean>(false);
  const [s8EnteredDob, setS8EnteredDob] = useState<string>('');
  const [s8RegisterLogged, setS8RegisterLogged] = useState<boolean>(false);
  const [s8RunningBalance, setS8RunningBalance] = useState<number>(140);

  // 3. 2-Identifier Patient Handout Checklist State
  const [identifier1NameConfirmed, setIdentifier1NameConfirmed] = useState<boolean>(false);
  const [identifier2DobAddressConfirmed, setIdentifier2DobAddressConfirmed] = useState<boolean>(false);
  const [counselingInstructionsExplained, setCounselingInstructionsExplained] = useState<boolean>(false);

  // 4. PBS Online Claiming State
  const [pbsClaimStatus, setPbsClaimStatus] = useState<'approved' | 'rejected' | 'pending'>('approved');
  const [pbsRejectReason, setPbsRejectReason] = useState<string>('Reason Code 102: Patient Concession Card Expired');

  // 5. Final Sign-off
  const [pharmacistSigned, setPharmacistSigned] = useState<boolean>(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const showAlert = (msg: string) => {
    setAlertMessage(msg);
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // Barcode scan handler
  const handleSimulateScan = (barcode: string) => {
    setScannedBarcode(barcode);
    if (barcode === correctBarcode) {
      setScanStatus('verified');
    } else {
      setScanStatus('discrepancy');
    }
  };

  const handleVerifyS8Dob = () => {
    if (s8EnteredDob.trim() === scenario.patientDob) {
      setS8DobVerified(true);
    } else {
      showAlert(
        isFa
          ? `تاریخ تولد وارد شده با پرونده بیمار (${scenario.patientDob}) مطابقت ندارد!`
          : `Entered DOB does not match patient record (${scenario.patientDob})!`
      );
    }
  };

  const handleLogS8Register = () => {
    if (!s8DobVerified) {
      showAlert(
        isFa
          ? 'ابتدا تاریخ تولد بیمار را تایید کنید!'
          : 'Please verify Patient DOB before logging into the S8 Register!'
      );
      return;
    }
    setS8RegisterLogged(true);
  };

  const handleFinalSubmit = () => {
    if (scanStatus !== 'verified') {
      showAlert(
        isFa
          ? 'لطفاً بارکد محصول دارویی را با اسکنر تایید کنید (ScanCheck Verified)!'
          : 'Please complete the Product Barcode ScanCheck before final sign-off!'
      );
      return;
    }

    if (isS8 && (!s8DobVerified || !s8RegisterLogged)) {
      showAlert(
        isFa
          ? 'داروی S8 الزامی است: ثبت تاریخ تولد و ثبت در دفتر ثبت داروهای تحت کنترل (S8 Register) اجباری است!'
          : 'Schedule 8 Controlled Drug requirement: DOB verification and S8 Register logging are mandatory!'
      );
      return;
    }

    if (!identifier1NameConfirmed || !identifier2DobAddressConfirmed) {
      showAlert(
        isFa
          ? 'تایید حداقل ۲ شناسه بیمار (نام کامل + تاریخ تولد/آدرس) قبل از تحویل اجباری است!'
          : 'Cross-verifying at least 2 Patient Identifiers is mandatory before handout!'
      );
      return;
    }

    if (pbsClaimStatus === 'rejected') {
      showAlert(
        isFa
          ? 'خطای ادعای خسارت آنلاین PBS! لطفاً ابتدا نسبت به ارسال مجدد (Retry Claim) اقدام کنید.'
          : 'PBS Online claim rejected! Please retry PBS transmission before completing supply.'
      );
      return;
    }

    onCompleteHandout();
  };

  const dispensedDrugName = isGenericSubstituted
    ? scenario.aFlagGenericSubstitute
    : scenario.prescribedDrug;

  return (
    <div 
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
      onClick={onClose}
    >
      <div 
        className="app-card border-2 border-teal-500/60 rounded-2xl max-w-5xl w-full max-h-[92vh] overflow-y-auto app-text shadow-2xl p-4 sm:p-6 space-y-6 my-auto animate-in fade-in zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        
        {alertMessage && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/20 border-2 border-rose-500/50 text-rose-200 flex items-center justify-between gap-3 animate-in fade-in zoom-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <span className="text-sm font-bold">{alertMessage}</span>
            </div>
            <button onClick={() => setAlertMessage(null)} className="p-1 hover:bg-rose-500/20 rounded-lg transition">
              <X className="w-4 h-4 text-rose-300" />
            </button>
          </div>
        )}

        {/* Modal Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-teal-500/30 pb-4 gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow shrink-0">
              F10
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-500/30">
                  FINAL AUDIT
                </span>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  {isFa
                    ? 'صفحه بازرسی نهایی مسئول فنی داروساز (Pharmacist Final Check)'
                    : 'Pharmacist Final Check & Audit Screen (F10)'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {isFa
                  ? 'تطبیق نسخه با لیبل، اسکن بارکد محصول (ScanCheck)، ثبت دفتر S8 و تایید ۲ شناسه بیمار قبل از تحویل'
                  : 'Side-by-side script vs label audit, ScanCheck barcode verification, S8 Register logging & 2-identifier check'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition self-start sm:self-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* SECTION 1: SIDE-BY-SIDE VISUAL AUDIT COMPARISON */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-teal-300 font-mono uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-teal-400" />
              {isFa ? '۱. مقایسه تطبیقی نسخه اصلی با برچسب دیسپنس شده:' : '1. Side-by-Side Audit: Original Script vs Dispensed Label'}
            </span>
            <span className="text-[11px] text-slate-400 font-mono">
              Patient: <strong className="text-white">{scenario.patientName}</strong> ({scenario.patientDob})
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Left: Original Prescribed Script Details */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-indigo-300 font-mono uppercase text-[11px]">
                  [ORIGINAL PRESCRIPTION DATA]
                </span>
                <span className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 text-[10px] font-mono border border-indigo-800">
                  {scenario.type} Script
                </span>
              </div>

              <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Prescribed Drug:</span>
                  <p className="font-bold text-white text-xs">{scenario.prescribedDrug}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">PBS Code:</span>
                    <p className="font-bold text-teal-300">{scenario.pbsCode}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Schedule:</span>
                    <p className={`font-bold ${isS8 ? 'text-rose-400' : 'text-amber-300'}`}>Schedule {scenario.schedule}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Quantity:</span>
                    <p className="font-bold text-white">{scenario.quantity}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Repeats Auth:</span>
                    <p className="font-bold text-white">{scenario.repeats}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Directions:</span>
                  <p className="font-bold text-amber-200">{scenario.directions}</p>
                </div>
              </div>
            </div>

            {/* Right: Generated Dispensing Label Details */}
            <div className="p-4 rounded-xl bg-slate-900 border border-teal-500/40 space-y-2.5 shadow-md">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-teal-300 font-mono uppercase text-[11px]">
                  [DISPENSED PHARMACY CAL LABEL]
                </span>
                <span className="px-2 py-0.5 rounded bg-teal-950 text-teal-300 text-[10px] font-mono border border-teal-800">
                  {brandPreference === 'GS' ? 'Generic First (GS)' : 'Brand First (GB)'}
                </span>
              </div>

              <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
                <div>
                  <span className="text-slate-500">Dispensed Product:</span>
                  <p className="font-bold text-emerald-300 text-xs">{dispensedDrugName}</p>
                  {isGenericSubstituted && (
                    <span className="inline-block mt-0.5 text-[10px] text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-800">
                      ⚡ A-Flag Generic Substitute
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-500">Dispensed Qty:</span>
                    <p className="font-bold text-white">{scenario.quantity}</p>
                  </div>
                  <div>
                    <span className="text-slate-500">Dispense Mode:</span>
                    <p className="font-bold text-amber-300 uppercase">{repeatMode}</p>
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Label Directions (CAL):</span>
                  <p className="font-bold text-emerald-200">{scenario.directions}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: BARCODE SCAN CHECK (ScanCheck Engine) */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-teal-400" />
              <span className="font-bold text-teal-300 font-mono uppercase">
                {isFa ? '۲. اسکن اعتبارسنجی بارکد محصول (Product Barcode ScanCheck):' : '2. Enhanced Product Barcode ScanCheck'}
              </span>
            </div>

            {scanStatus === 'verified' && (
              <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold font-mono text-[11px] flex items-center gap-1.5 animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ScanCheck Verified ✅
              </span>
            )}

            {scanStatus === 'discrepancy' && (
              <span className="px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 font-bold font-mono text-[11px] flex items-center gap-1.5 animate-pulse">
                <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
                DISCREPANCY DETECTED ⚠️
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 rounded-xl border border-slate-800">
            <div className="space-y-1">
              <p className="text-slate-300 text-[11px]">
                {isFa
                  ? 'بارکد محصول دارویی برداشت شده از قفسه را اسکن یا انتخاب کنید:'
                  : 'Simulate scanning physical item barcode off dispensary shelf:'}
              </p>
              <p className="font-mono text-[10px] text-slate-500">
                Target Barcode: <span className="text-teal-400 font-bold">{correctBarcode}</span>
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => handleSimulateScan(correctBarcode)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition text-xs shadow"
              >
                {isFa ? 'اسکن بارکد درست ✅' : 'Scan Correct Barcode'}
              </button>
              <button
                onClick={() => handleSimulateScan(wrongBarcode)}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold transition text-xs shadow"
              >
                {isFa ? 'اسکن دوز اشتباه ⚠️' : 'Scan Wrong Strength'}
              </button>
            </div>
          </div>

          {/* DISCREPANCY RED ALERT OVERLAY */}
          {scanStatus === 'discrepancy' && (
            <div className="p-3.5 rounded-xl bg-rose-950/90 border-2 border-rose-500 text-rose-100 space-y-1.5 animate-bounce">
              <div className="flex items-center gap-2 font-bold text-rose-300 text-xs">
                <Volume2 className="w-4 h-4 text-rose-400 shrink-0" />
                <span>
                  {isFa
                    ? '⚠️ هشدار عدم تطابق بارکد! محصول اسکن شده با نسخه همخوانی ندارد!'
                    : '⚠️ DISCREPANCY DETECTED: Scanned barcode does not match prescribed product!'}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-rose-200">
                {isFa
                  ? 'قفسه دارو را مجدداً بررسی کنید. دوز، دوزاژ یا فرم دارویی اسکن شده با سفارش پزشک مطابقت ندارد.'
                  : 'Scanned barcode (931000099999) fails physical match. Please return item to shelf and verify correct strength/product.'}
              </p>
            </div>
          )}
        </div>

        {/* SECTION 3: CONTROLLED DRUGS (S8) DOB & REGISTER LOGGING (ONLY IF S8) */}
        {isS8 && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border-2 border-rose-500/50 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
              <div className="flex items-center gap-2 font-bold text-rose-300">
                <Lock className="w-4 h-4 text-rose-400" />
                <span>
                  {isFa
                    ? '۳. ثبت الزامی دفتر داروی تحت کنترل S8 (Schedule 8 Controlled Drug Protocol):'
                    : '3. Controlled Drugs (S8) Mandatory DOB & Register Logging'}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-rose-900 text-rose-200 font-mono text-[10px] font-bold">
                SCHEDULE 8 MANDATORY
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Step 3A: DOB Verification Input */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold text-[11px]">
                  {isFa ? 'الف) ورود و اعتبارسنجی تاریخ تولد بیمار (DOB Check):' : 'A) Enforce Patient DOB Verification:'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={s8EnteredDob}
                    onChange={(e) => setS8EnteredDob(e.target.value)}
                    placeholder={`Type DOB e.g. ${scenario.patientDob}`}
                    className="flex-1 px-3 py-1.5 bg-black border border-slate-700 rounded-lg text-white font-mono text-xs"
                  />
                  <button
                    onClick={handleVerifyS8Dob}
                    className={`px-3 py-1.5 rounded-lg font-bold transition text-xs ${
                      s8DobVerified
                        ? 'bg-emerald-600 text-white'
                        : 'bg-rose-600 hover:bg-rose-500 text-white'
                    }`}
                  >
                    {s8DobVerified ? 'Verified ✅' : 'Verify DOB'}
                  </button>
                </div>
              </div>

              {/* Step 3B: Log in S8 Register Button */}
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 flex flex-col justify-between">
                <div>
                  <span className="block text-slate-300 font-bold text-[11px]">
                    {isFa ? 'ب) ثبت تراکنش در دفتر ثبت دیجیتال S8:' : 'B) Digital S8 Register Entry:'}
                  </span>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                    Qty: {scenario.quantity} | Balance: {s8RunningBalance} ➔ <strong className="text-emerald-400">{s8RunningBalance - scenario.quantity}</strong>
                  </p>
                </div>

                <button
                  onClick={handleLogS8Register}
                  className={`w-full py-2 rounded-lg font-bold transition text-xs flex items-center justify-center gap-1.5 ${
                    s8RegisterLogged
                      ? 'bg-emerald-600 text-white border border-emerald-400'
                      : 'bg-rose-700 hover:bg-rose-600 text-white shadow'
                  }`}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>
                    {s8RegisterLogged
                      ? (isFa ? 'در دفتر S8 ثبت گردید ✅' : 'S8 Register Entry Logged ✅')
                      : (isFa ? 'ثبت تراکنش در دفتر S8' : 'Log in S8 Controlled Drug Register')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: 2-IDENTIFIER PATIENT HANDOUT CHECKLIST */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-teal-500/40 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-teal-300">
              <UserCheck className="w-4 h-4 text-teal-400" />
              <span>
                {isFa ? '۴. تاییدیه ۲ شناسه بیمار قبل از تحویل (2-Identifier Handout Verification):' : '4. 2-Identifier Patient Handout Verification Checklist'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">Pharmacy Guild Safety Standard</span>
          </div>

          <div className="space-y-2 text-slate-200">
            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer">
              <input
                type="checkbox"
                checked={identifier1NameConfirmed}
                onChange={(e) => setIdentifier1NameConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold text-xs">
                {isFa
                  ? `شناسه ۱ (نام کامل بیمار): تایید هویت بیمار "${scenario.patientName}"`
                  : `Identifier 1 (Full Name): Confirm patient name "${scenario.patientName}"`}
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer">
              <input
                type="checkbox"
                checked={identifier2DobAddressConfirmed}
                onChange={(e) => setIdentifier2DobAddressConfirmed(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold text-xs">
                {isFa
                  ? `شناسه ۲ (تاریخ تولد یا آدرس): تایید تاریخ تولد (${scenario.patientDob}) یا شماره مدیکر`
                  : `Identifier 2 (DOB or Address): Cross-verify DOB (${scenario.patientDob}) or Medicare Card`}
              </span>
            </label>

            <label className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-teal-500/50 cursor-pointer">
              <input
                type="checkbox"
                checked={counselingInstructionsExplained}
                onChange={(e) => setCounselingInstructionsExplained(e.target.checked)}
                className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
              />
              <span className="font-bold text-xs text-amber-300">
                {isFa
                  ? 'توضیحات شفاهی دستور مصرف و هشدارهای دارویی به بیمار ارائه گردید (CAL Counseling Given)'
                  : 'Verbal CAL label counseling and cautionary warnings provided to patient'}
              </span>
            </label>
          </div>
        </div>

        {/* SECTION 5: PBS ONLINE CLAIMING ERROR SIMULATOR */}
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2 font-bold text-sky-300">
              <Send className="w-4 h-4 text-sky-400" />
              <span>
                {isFa ? '۵. وضعیت ادعای خسارت آنلاین سیستم PBS Online Claiming:' : '5. PBS Online Claiming Status & Error Simulator'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPbsClaimStatus('approved')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  pbsClaimStatus === 'approved' ? 'bg-emerald-600 text-white border-emerald-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Transmitted ✅
              </button>
              <button
                onClick={() => setPbsClaimStatus('rejected')}
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold border transition ${
                  pbsClaimStatus === 'rejected' ? 'bg-rose-600 text-white border-rose-400' : 'bg-slate-950 text-slate-400 border-slate-800'
                }`}
              >
                Rejected ⚠️
              </button>
            </div>
          </div>

          {pbsClaimStatus === 'approved' ? (
            <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/40 text-emerald-200 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="font-mono">PBS Online Claim Transmitted & Approved (Claim Ref: PBS-2026-98124)</span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">Status: 200 OK</span>
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  PBS Online Transmission Rejected!
                </span>
                <button
                  onClick={() => setPbsClaimStatus('approved')}
                  className="px-3 py-1 rounded bg-rose-700 hover:bg-rose-600 text-white font-bold text-[10px] flex items-center gap-1 transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  Retry Transmission
                </button>
              </div>
              <p className="font-mono text-[11px] text-rose-200">{pbsRejectReason}</p>
            </div>
          )}
        </div>

        {/* MODAL FOOTER & FINAL ACTION BUTTONS */}
        <div className="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-teal-400" />
            <span>Pharmacist Sign-off Station #01</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold transition"
            >
              {isFa ? 'انصراف' : 'Cancel Audit'}
            </button>

            {onOpenLabelingDesk && (
              <button
                onClick={() => {
                  onClose();
                  onOpenLabelingDesk();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-teal-800 hover:bg-teal-700 text-teal-100 border border-teal-500/50 font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Printer className="w-4 h-4 text-teal-300" />
                <span>{isFa ? 'میز لیبل (Labeling)' : 'Open Labeling Desk'}</span>
              </button>
            )}

            {onOpenRetentionDesk && (
              <button
                onClick={() => {
                  onClose();
                  onOpenRetentionDesk();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-800 hover:bg-indigo-700 text-indigo-100 border border-indigo-500/50 font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Archive className="w-4 h-4 text-amber-300" />
                <span>{isFa ? 'میز بایگانی (Retention)' : 'Open Retention Desk'}</span>
              </button>
            )}

            {onOpenOdtDosingDesk && (
              <button
                onClick={() => {
                  onClose();
                  onOpenOdtDosingDesk();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-rose-800 hover:bg-rose-700 text-rose-100 border border-rose-500/50 font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Lock className="w-4 h-4 text-amber-300" />
                <span>{isFa ? 'دفتر ثبت دوز ODT' : 'Open ODT Dosing Desk'}</span>
              </button>
            )}

            {onOpenPbsArchiveDesk && (
              <button
                onClick={() => {
                  onClose();
                  onOpenPbsArchiveDesk();
                }}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-indigo-100 border border-indigo-500/50 font-bold transition flex items-center justify-center gap-1.5 shadow"
              >
                <Box className="w-4 h-4 text-amber-300" />
                <span>{isFa ? 'بایگانی نسخه‌های PBS و تحویل' : 'PBS Archive & POS Desk'}</span>
              </button>
            )}

            <button
              onClick={handleFinalSubmit}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isFa ? 'امضای نهایی مسئول فنی و تحویل دارو' : 'Pharmacist Audit Verified & Complete Handout'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
