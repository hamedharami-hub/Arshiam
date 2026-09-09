'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Archive,
  ShieldAlert,
  ShoppingBag,
  Trash2,
  FileText,
  QrCode,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Printer,
  Smartphone,
  Paperclip,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  Send,
  Check,
  Package,
  Pill,
  ShieldCheck,
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

interface DocumentRetentionSortingPanelProps {
  language: Language;
  scenario?: ScriptScenarioData;
  isGenericSubstituted?: boolean;
  onSortingComplete?: () => void;
}

export type SortableItemType = 'patientHandoutItem' | 'pbsClaimDuplicate' | 'odtS8Record' | 'discardedPrint';
export type RetentionZoneType = 'zoneA_PatientBag' | 'zoneB_PbsClaimBox' | 'zoneC_S8Safe' | 'zoneD_ShredderBin';

export const DocumentRetentionSortingPanel: React.FC<DocumentRetentionSortingPanelProps> = ({
  language,
  scenario = {
    id: 'script-1',
    type: 'Paper',
    patientName: 'David Miller',
    patientDob: '14/08/1968',
    patientAddress: '42 Oxford St, Paddington NSW 2021',
    medicareNumber: '2983 10928 1',
    prescriberName: 'Dr. Sarah Jenkins',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Atorvastatin 20mg Tablets',
    pbsCode: '2018H',
    aFlagGenericSubstitute: 'Atorvastatin 20mg (A-Flag Brand Substitute)',
    schedule: 'S4',
    scriptDate: '01/08/2026',
    quantity: 30,
    repeats: 5,
    directions: 'Take ONE tablet daily at bedtime.',
  },
  isGenericSubstituted = false,
  onSortingComplete,
}) => {
  const isFa = language === 'fa';
  const isOdtS8 = scenario.schedule === 'S8' || scenario.id === 'script-5';
  const isEScript = scenario.type === 'eScript' || scenario.id === 'script-3';

  // PB24 Stapling & eScript Token States
  const [isPB24Stapled, setIsPB24Stapled] = useState<boolean>(false);
  const [isDigitalTokenSent, setIsDigitalTokenSent] = useState<boolean>(false);
  const [digitalTokenChannel, setDigitalTokenChannel] = useState<'sms' | 'email' | 'mysl'>('sms');

  // Currently Selected Item to Sort
  const [selectedItem, setSelectedItem] = useState<SortableItemType | null>(null);

  // Sorting Placement Record
  const [placements, setPlacements] = useState<Record<SortableItemType, RetentionZoneType | null>>({
    patientHandoutItem: null,
    pbsClaimDuplicate: null,
    odtS8Record: null,
    discardedPrint: null,
  });

  // Real-time Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    title: string;
    message: string;
    ruleTip?: string;
  } | null>(null);

  const displayedDrugName = isGenericSubstituted
    ? scenario.aFlagGenericSubstitute
    : scenario.prescribedDrug;

  // Total required items to sort depends on script type
  const requiredItemKeys: SortableItemType[] = isOdtS8
    ? ['patientHandoutItem', 'odtS8Record', 'discardedPrint']
    : ['patientHandoutItem', 'pbsClaimDuplicate', 'discardedPrint'];

  const placedCount = requiredItemKeys.filter((key) => placements[key] !== null).length;
  const isAllSorted = placedCount === requiredItemKeys.length;

  // Reset Sorting Workspace
  const handleResetWorkspace = () => {
    setPlacements({
      patientHandoutItem: null,
      pbsClaimDuplicate: null,
      odtS8Record: null,
      discardedPrint: null,
    });
    setSelectedItem(null);
    setIsPB24Stapled(false);
    setIsDigitalTokenSent(false);
    setFeedback({
      type: 'success',
      title: isFa ? 'میز تفکیک اسناد بازنشانی شد' : 'Document Desk Reset',
      message: isFa
        ? 'تمامی اسناد به سینی اولیه بازگشتند. می‌توانید مراحل منگنه‌کردن PB24 و بایگانی را مجدداً مرور کنید.'
        : 'All documents returned to tray. You can repeat the PB24 stapling & retention workflow.',
    });
  };

  // Handle PB24 Stapling Action
  const handleStaplePB24 = () => {
    setIsPB24Stapled(true);
    setFeedback({
      type: 'success',
      title: isFa ? 'منگنه‌شدن برگه تکرار PB24 روی نسخه ✅' : 'PB24 Yellow Repeat Stapled ✅',
      message: isFa
        ? 'برگه زرد رنگ تکرار دستور (PB24 Yellow Repeat Authorization Form) با منگنه روی برگه تکرار نسخه قرار گرفت. اکنون آماده تحویل به بیمار است.'
        : 'The official PB24 Yellow Repeat Authorization Form has been stapled on top of the prescription. Ready for patient handout.',
      ruleTip: isFa
        ? 'الزام داروسازی استرالیا (PBA Standard): برگه تکرار PB24 صادر شده باید منگنه شده همراه با دارو به بیمار تحویل داده شود، اما نسخه اصلی کاغذی در داروسازی باقی می‌ماند.'
        : 'PBA Standard: The issued PB24 Yellow Repeat form must be stapled and given to the patient, while the original paper script copy is retained by the pharmacy for PBS claim auditing.',
    });
  };

  // Handle eScript Digital Token Dispatch
  const handleSendDigitalToken = () => {
    setIsDigitalTokenSent(true);
    setFeedback({
      type: 'success',
      title: isFa ? 'ارسال توکن دیجیتال eScript ✅' : 'Digital Token Dispatched ✅',
      message: isFa
        ? `توکن دیجیتال جدید eScript از طریق ${
            digitalTokenChannel === 'sms' ? 'پیامک (SMS)' : digitalTokenChannel === 'email' ? 'ایمیل (Email)' : 'سامانه MySL'
          } برای بیمار ارسال گردید.`
        : `New eScript digital token dispatched to patient via ${digitalTokenChannel.toUpperCase()}.`,
      ruleTip: isFa
        ? 'فرآیند نسخه الکترونیک (eScript): در نسخه‌های الکترونیک نیازی به برگه کاغذی PB24 نیست؛ توکن جایگزین به صورت دیجیتال برای بیمار صادر می‌شود.'
        : 'ePrescription Workflow: Digital eScript tokens replace paper PB24 repeat forms and are delivered directly to patient mobile devices or Active Script List (ASL).',
    });
  };

  // Attempt Document Placement into Target Zone
  const handlePlaceItem = (targetZone: RetentionZoneType) => {
    if (!selectedItem) {
      setFeedback({
        type: 'error',
        title: isFa ? 'سندی انتخاب نشده است!' : 'No Document Selected!',
        message: isFa
          ? 'لطفاً ابتدا روی یکی از اسناد موجود در سینی سمت چپ کلیک کنید تا انتخاب شود، سپس روی زون بایگانی هدف کلیک کنید.'
          : 'Please click a document from the left tray first to select it, then click the target retention zone.',
      });
      return;
    }

    // Check pre-requisite: if patientHandoutItem requires stapling/token first
    if (selectedItem === 'patientHandoutItem' && scenario.repeats > 0) {
      if (!isEScript && !isPB24Stapled) {
        setFeedback({
          type: 'error',
          title: isFa ? 'برگه PB24 منگنه نشده است! ⚠️' : 'PB24 Repeat Not Stapled! ⚠️',
          message: isFa
            ? 'خطا: پیش از قرار دادن دارو در کیسه تحویل به بیمار، باید روی دکمه "منگنه‌کردن برگه تکرار PB24" کلیک کنید تا برگه زرد رنگ به نسخه متصل شود.'
            : 'Error: You must staple the PB24 Yellow Repeat Form before sorting the medication into the Patient Handout Bag!',
          ruleTip: isFa
            ? 'قانون تحویل دارو: بیمار برای دریافت نوبت‌های بعدی به برگه PB24 منگنه شده نیاز دارد.'
            : 'Handout Rule: The patient requires the stapled PB24 Repeat Authorization Form for future repeat dispenses.',
        });
        return;
      }
      if (isEScript && !isDigitalTokenSent) {
        setFeedback({
          type: 'error',
          title: isFa ? 'توکن eScript ارسال نشده است! ⚠️' : 'eScript Token Not Dispatched! ⚠️',
          message: isFa
            ? 'خطا: پیش از تحویل دارو، باید توکن دیجیتال جدید eScript را برای بیمار ارسال کنید.'
            : 'Error: You must dispatch the new eScript digital token before handing out the medication!',
        });
        return;
      }
    }

    // Validate Placement Correctness
    let isValidMatch = false;
    let ruleExplanationFa = '';
    let ruleExplanationEn = '';

    if (selectedItem === 'patientHandoutItem' && targetZone === 'zoneA_PatientBag') {
      isValidMatch = true;
      ruleExplanationFa = 'تحویل به بیمار (Patient Handout): بسته اصلی دارو همراه با برگه تکرار PB24 منگنه شده (یا توکن دیجیتال eScript) درون کیسه تحویل به بیمار قرار می‌گیرد.';
      ruleExplanationEn = 'Patient Handout Bag: The dispensed medication box plus the stapled PB24 repeat form (or eToken) are safely placed in the patient delivery bag.';
    } else if (selectedItem === 'pbsClaimDuplicate' && targetZone === 'zoneB_PbsClaimBox') {
      isValidMatch = true;
      ruleExplanationFa = 'بایگانی قانونی داروخانه (PBS & AHPRA 2-Year Physical Archive): نسخه اصلی کاغذی به همراه برچسب اختصاصی ثبت دیسپنس (Store Copy) که پشت آن چسبانده می‌شود، طبق الزامات قانونی PBS و AHPRA به مدت حداقل ۲ سال در بایگانی فیزیکی داروخانه نگهداری می‌گردد.';
      ruleExplanationEn = 'Pharmacy Physical Archives (PBS & AHPRA): The original paper prescription bearing the Store Copy label on its back is archived for at least 2 years in compliance with PBS and AHPRA auditing standards.';
    } else if (selectedItem === 'odtS8Record' && targetZone === 'zoneC_S8Safe') {
      isValidMatch = true;
      ruleExplanationFa = 'گاوصندوق S8 و مقررات بهداشت NSW: کلیه نسخه‌های ODT داروهای مخدر تحت کنترل (Schedule 8) و ثبت روزانه دوزها باید اجباراً در گاوصندوق قفل‌دار S8 نگهداری شوند.';
      ruleExplanationEn = 'NSW Health S8 Safe Rule: All Schedule 8 controlled drug ODT permits and daily dosing registers MUST be locked inside the S8 Drug Safe.';
    } else if (selectedItem === 'discardedPrint' && targetZone === 'zoneD_ShredderBin') {
      isValidMatch = true;
      ruleExplanationFa = 'امحای محرمانه (Confidential Shredding): پرینت‌های آزمایشی، استیکرهای اشتباه و اطلاعات دارای شناسه بیمار باید طبق قوانین حریم خصوصی بیمار (Privacy Act) درون سطل امحای محرمانه ریزریز شوند.';
      ruleExplanationEn = 'Confidential Shredding: Any test printouts or discarded labels containing patient identifiers must be deposited into the confidential shredding bin.';
    }

    if (isValidMatch) {
      const updated = { ...placements, [selectedItem]: targetZone };
      setPlacements(updated);
      setSelectedItem(null);

      setFeedback({
        type: 'success',
        title: isFa ? 'بایگانی صحیح سند ✅' : 'Document Sorted Successfully ✅',
        message: isFa ? 'سند با موفقیت در زون قانونی مربوطه بایگانی گردید.' : 'Document successfully stored in compliant zone.',
        ruleTip: isFa ? ruleExplanationFa : ruleExplanationEn,
      });

      // Check if all sorted
      const newPlacedCount = requiredItemKeys.filter((k) => updated[k] !== null).length;
      if (newPlacedCount === requiredItemKeys.length && onSortingComplete) {
        onSortingComplete();
      }
    } else {
      // Misplacement error handling
      let errFa = '';
      let errEn = '';

      if (selectedItem === 'pbsClaimDuplicate' && targetZone === 'zoneA_PatientBag') {
        errFa = '❌ خطای بحرانی: نسخه اصلی کاغذی کپی داروساز هرگز نباید به بیمار داده شود! این نسخه باید برای ادعای خسارت مالی PBS در داروسازی بایگانی گردد.';
        errEn = '❌ CRITICAL ERROR: Original paper duplicate scripts MUST NEVER be given to the patient! They are legally required for PBS Medicare claim auditing.';
      } else if (selectedItem === 'odtS8Record' && targetZone !== 'zoneC_S8Safe') {
        errFa = '❌ خطای قانونی: فرم‌های ODT و نسخه‌های مخدر Schedule 8 طبق قوانین نیو ساوت ولز اجباراً باید درون گاوصندوق S8 Safe قرار گیرند.';
        errEn = '❌ LEGAL VIOLATION: S8 ODT forms and registers MUST be stored inside the locked Schedule 8 Safe under NSW Poisons regulations.';
      } else if (selectedItem === 'patientHandoutItem' && targetZone !== 'zoneA_PatientBag') {
        errFa = '❌ خطا: داروی آماده شده بیمار و برگه PB24 باید درون کیسه تحویل به بیمار (Zone A) قرار گیرد.';
        errEn = '❌ Misplaced: The dispensed medication and PB24 form belong in Zone A (Patient Handout Bag).';
      } else if (selectedItem === 'discardedPrint' && targetZone !== 'zoneD_ShredderBin') {
        errFa = '❌ خطا: پرینت‌های ضایعاتی حاوی شناسه بیمار باید در سطل امحای محرمانه (Zone D) قرار گیرند تا اطلاعات بیمار افشا نشود.';
        errEn = '❌ Misplaced: Discarded prints containing patient details belong in Zone D (Confidential Shredding Bin).';
      }

      setFeedback({
        type: 'error',
        title: isFa ? 'خطای تفکیک اسناد ⚠️' : 'Incorrect Retention Zone ⚠️',
        message: isFa ? errFa : errEn,
        ruleTip: isFa
          ? 'توصیه بازرسی PBA: تحویل نسخه اصلی کاغذی به بیمار یا عدم نگهداری نسخه‌های S8 در گاوصندوق موجب جریمه سنگین یا لغو پروانه داروسازی می‌شود.'
          : 'PBA Audit Warning: Giving original paper scripts to patients or failing to lock S8 records in the safe leads to severe compliance penalties.',
      });
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, item: SortableItemType) => {
    e.dataTransfer.setData('text/plain', item);
    setSelectedItem(item);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetZone: RetentionZoneType) => {
    e.preventDefault();
    const item = (e.dataTransfer.getData('text/plain') as SortableItemType) || selectedItem;
    if (item) {
      setSelectedItem(item);
      setTimeout(() => handlePlaceItem(targetZone), 50);
    }
  };

  return (
    <div className="app-card border-2 border-indigo-500/50 rounded-2xl p-4 sm:p-6 bg-slate-950 text-white space-y-6 shadow-2xl">
      {/* HEADER BAR: TITLE, STATUS & RESET CONTROL */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-500/30 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <Archive className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30 uppercase">
                SUB-PHASE 5.7
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isFa
                  ? 'موتور منگنه‌کردن برگه تکرار PB24 و زون‌های ۴گانه تفکیک و بایگانی اسناد (Document Retention Desk)'
                  : 'PB24 Yellow Repeat Stapling & Document Retention Sorting Desk'}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Controls & Progress */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleResetWorkspace}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-xs font-bold flex items-center gap-1.5"
            title="Reset Workspace"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isFa ? 'بازنشانی' : 'Reset Desk'}</span>
          </button>

          <div className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold border flex items-center gap-1.5 ${
            isAllSorted
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
              : 'bg-slate-900 text-indigo-300 border-indigo-500/40'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {isFa
                ? `تکمیل بایگانی: ${placedCount} از ${requiredItemKeys.length}`
                : `Sorting: ${placedCount}/${requiredItemKeys.length}`}
            </span>
          </div>
        </div>
      </div>

      {/* PB24 STAPLING / ESCRIPT TOKEN DISPATCH INTERACTIVE SECTION */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 p-4 rounded-2xl border border-indigo-500/40 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-indigo-500/20 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm text-white font-mono">
              {isEScript
                ? (isFa ? '۱. صدور و ارسال توکن دیجیتال eScript:' : '1. Digital eScript Token Dispatch:')
                : (isFa ? '۱. آماده‌سازی و منگنه‌کردن برگه تکرار زرد رنگ PB24:' : '1. PB24 Yellow Repeat Form Stapling Engine:')}
            </span>
          </div>
          <span className="text-[11px] font-mono font-bold text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/30">
            {scenario.repeats > 0 ? (isFa ? `تعداد نوبت‌های تکرار مجاز: ${scenario.repeats} نوبت` : `Remaining Repeats: ${scenario.repeats}`) : (isFa ? 'نسخه بدون تکرار (Nil Repeats)' : 'Nil Repeats')}
          </span>
        </div>

        {!isEScript ? (
          /* PAPER SCRIPT PB24 STAPLE INTERACTION */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* Visual PB24 Mockup */}
            <div className="md:col-span-7 bg-amber-100/90 text-amber-950 p-3 rounded-xl border-2 border-amber-400 shadow-md relative font-mono text-xs space-y-1">
              {/* Metallic Staple Visual Effect Overlay */}
              {isPB24Stapled && (
                <div className="absolute top-2 left-3 z-10 flex items-center gap-1 bg-slate-800 text-amber-300 px-2 py-0.5 rounded text-[10px] font-bold shadow-lg border border-slate-600 animate-bounce">
                  <Paperclip className="w-3.5 h-3.5 text-amber-400" />
                  <span>{isFa ? 'منگنه شده به نسخه اصلی (Stapled)' : 'STAPLED TO SCRIPT'}</span>
                </div>
              )}

              <div className="flex justify-between items-center border-b border-amber-300 pb-1 text-[10px] font-bold">
                <span className="text-amber-900 uppercase">FORM PB 24 - REPEAT AUTHORISATION</span>
                <span className="bg-amber-300 text-black px-1.5 py-0.5 rounded">PBS YELLOW COPY</span>
              </div>
              <p className="font-extrabold text-sm text-slate-900">{displayedDrugName}</p>
              <div className="flex justify-between text-[10px] text-amber-900 font-medium">
                <span>Patient: <strong>{scenario.patientName}</strong></span>
                <span>Repeats Remaining: <strong className="text-rose-800 text-xs">{scenario.repeats}</strong></span>
              </div>
              <p className="text-[9px] text-slate-700 italic border-t border-amber-200 pt-1">
                This Repeat Authorisation must be presented when obtaining the next repeat supply.
              </p>
            </div>

            {/* Staple Action Button */}
            <div className="md:col-span-5 flex flex-col justify-center space-y-2">
              <button
                onClick={handleStaplePB24}
                disabled={isPB24Stapled || scenario.repeats === 0}
                className={`w-full py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                  isPB24Stapled
                    ? 'bg-emerald-600 text-white cursor-default'
                    : scenario.repeats === 0
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-amber-500 hover:bg-amber-400 text-slate-950 hover:scale-102 shadow-amber-500/20'
                }`}
              >
                {isPB24Stapled ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-white" />
                    <span>{isFa ? 'فرم PB24 با موفقیت منگنه شد ✅' : 'PB24 Form Stapled ✅'}</span>
                  </>
                ) : (
                  <>
                    <Paperclip className="w-5 h-5" />
                    <span>{isFa ? 'منگنه‌کردن برگه تکرار PB24 روی نسخه' : 'Staple Repeat PB24 to Script'}</span>
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-400 text-center font-mono">
                {isFa ? 'برگه تکرار PB24 روی نسخه اصلی منگنه شده و همراه دارو به بیمار تحویل می‌گردد.' : 'PB24 repeat form is stapled to script copy and handed to patient.'}
              </p>
            </div>
          </div>
        ) : (
          /* ESCRIPT DIGITAL TOKEN INTERACTION */
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            <div className="md:col-span-7 bg-slate-900 p-3 rounded-xl border border-indigo-500/50 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-indigo-300 font-mono flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-indigo-400" />
                  <span>{isFa ? 'کانال ارسال توکن دیجیتال eScript:' : 'Select Digital Token Delivery Channel:'}</span>
                </span>
                <span className="text-[10px] text-emerald-400 font-mono font-bold">ASL Active Script List</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs font-mono">
                <button
                  onClick={() => setDigitalTokenChannel('sms')}
                  className={`p-2 rounded-lg border transition font-bold text-[11px] ${
                    digitalTokenChannel === 'sms' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  📱 SMS ({scenario.patientName})
                </button>
                <button
                  onClick={() => setDigitalTokenChannel('email')}
                  className={`p-2 rounded-lg border transition font-bold text-[11px] ${
                    digitalTokenChannel === 'email' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  📧 Email Notification
                </button>
                <button
                  onClick={() => setDigitalTokenChannel('mysl')}
                  className={`p-2 rounded-lg border transition font-bold text-[11px] ${
                    digitalTokenChannel === 'mysl' ? 'bg-indigo-600 border-indigo-400 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  🌐 MySL Auto-Push
                </button>
              </div>
            </div>

            <div className="md:col-span-5">
              <button
                onClick={handleSendDigitalToken}
                disabled={isDigitalTokenSent}
                className={`w-full py-3 px-4 rounded-xl font-bold transition flex items-center justify-center gap-2 shadow-lg ${
                  isDigitalTokenSent
                    ? 'bg-emerald-600 text-white cursor-default'
                    : 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-102 shadow-indigo-600/30'
                }`}
              >
                {isDigitalTokenSent ? (
                  <>
                    <CheckCircle2 className="w-5 h-5" />
                    <span>{isFa ? 'توکن eScript ارسال شد ✅' : 'eScript Token Dispatched ✅'}</span>
                  </>
                ) : (
                  <>
                    <Send className="w-5 h-5" />
                    <span>{isFa ? 'ارسال توکن دیجیتال eScript' : 'Dispatch eScript Digital Token'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MAIN DOCUMENT SORTING WORKSPACE: LEFT TRAY (4 COLS) | RIGHT 4 RETENTION ZONES (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT PANEL: ITEMS TRAY READY TO SORT */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-indigo-300 uppercase flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-indigo-400" />
              {isFa ? 'سینی اسناد آماده تفکیک:' : 'Documents Ready for Sorting'}
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {isFa ? 'انتخاب یا درگ' : 'Click or Drag'}
            </span>
          </div>

          <div className="space-y-3">
            {/* SORTABLE ITEM 1: PATIENT HANDOUT ITEM (BOX + STAPLED PB24 / ETOKEN) */}
            <div
              draggable={!placements.patientHandoutItem}
              onDragStart={(e) => handleDragStart(e, 'patientHandoutItem')}
              onClick={() => !placements.patientHandoutItem && setSelectedItem('patientHandoutItem')}
              className={`p-3 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-1.5 ${
                placements.patientHandoutItem
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  : selectedItem === 'patientHandoutItem'
                  ? 'bg-amber-950 border-amber-400 text-white shadow-lg shadow-amber-500/20 ring-2 ring-amber-400'
                  : 'bg-gradient-to-r from-amber-950/80 to-slate-900 text-amber-100 border-amber-500 hover:border-amber-300 shadow-md'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold border-b border-amber-700/60 pb-1">
                <span className="text-amber-300 font-sans">
                  {isFa ? 'آیتم ۱. داروی برچسب خورده + برگه PB24 منگنه شده' : 'Item 1: Labeled Med + Stapled PB24'}
                </span>
                {placements.patientHandoutItem ? (
                  <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px]">
                    {isFa ? 'بایگانی شد ✅' : 'Sorted ✅'}
                  </span>
                ) : (
                  <span className="bg-amber-800 text-amber-200 px-1.5 py-0.5 rounded text-[9px]">
                    {selectedItem === 'patientHandoutItem' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده تفکیک' : 'Ready')}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[11px] font-sans">
                <p className="font-extrabold text-white">{displayedDrugName}</p>
                <div className="flex justify-between text-[10px] text-amber-200 font-mono">
                  <span>Patient: <strong>{scenario.patientName}</strong></span>
                  <span>{isPB24Stapled ? 'PB24 Stapled ✓' : 'Need PB24 Stapling'}</span>
                </div>
              </div>

              {!placements.patientHandoutItem && (
                <div className="text-center pt-1 text-[9px] text-amber-300 font-bold font-mono">
                  {isFa ? '👈 کلیک کنید یا به کیسه تحویل بیمار (Zone A) بکشید' : '👈 Drag to Patient Handout Bag (Zone A)'}
                </div>
              )}
            </div>

            {/* SORTABLE ITEM 2: PBS CLAIM DUPLICATE (PARCHMENT COPY FOR MEDICARE AUDIT) */}
            {!isOdtS8 && (
              <div
                draggable={!placements.pbsClaimDuplicate}
                onDragStart={(e) => handleDragStart(e, 'pbsClaimDuplicate')}
                onClick={() => !placements.pbsClaimDuplicate && setSelectedItem('pbsClaimDuplicate')}
                className={`p-3 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-1.5 ${
                  placements.pbsClaimDuplicate
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    : selectedItem === 'pbsClaimDuplicate'
                    ? 'bg-teal-950 border-teal-400 text-white shadow-lg shadow-teal-500/20 ring-2 ring-teal-400'
                    : 'bg-slate-900 text-teal-100 border-teal-500 hover:border-teal-300 shadow-md'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-teal-700/60 pb-1">
                  <span className="text-teal-300 font-sans">
                    {isFa ? 'آیتم ۲. نسخه اصلی کاغذی (Original Script) + برچسب Store Copy' : 'Item 2: Original Script + Store Copy Label'}
                  </span>
                  {placements.pbsClaimDuplicate ? (
                    <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px]">
                      {isFa ? 'بایگانی شد ✅' : 'Sorted ✅'}
                    </span>
                  ) : (
                    <span className="bg-teal-800 text-teal-200 px-1.5 py-0.5 rounded text-[9px]">
                      {selectedItem === 'pbsClaimDuplicate' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده تفکیک' : 'Ready')}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px] font-sans">
                  <p className="font-extrabold text-teal-200">Original Script with Store Copy Label on Back</p>
                  <p className="text-[10px] text-slate-300 font-mono">Prescriber: {scenario.prescriberName} | PBS Item: {scenario.pbsCode}</p>
                </div>

                {!placements.pbsClaimDuplicate && (
                  <div className="text-center pt-1 text-[9px] text-teal-300 font-bold font-mono">
                    {isFa ? '👈 کلیک کنید یا به جعبه بایگانی قانونی داروخانه (Zone B) بکشید' : '👈 Drag to Pharmacy Archive Box (Zone B)'}
                  </div>
                )}
              </div>
            )}

            {/* SORTABLE ITEM 3: NSW ODT S8 SCRIPT & DOSING LOG (ACTIVE IN ODT MODE) */}
            {isOdtS8 && (
              <div
                draggable={!placements.odtS8Record}
                onDragStart={(e) => handleDragStart(e, 'odtS8Record')}
                onClick={() => !placements.odtS8Record && setSelectedItem('odtS8Record')}
                className={`p-3 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-1.5 ${
                  placements.odtS8Record
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    : selectedItem === 'odtS8Record'
                    ? 'bg-rose-950 border-rose-400 text-white shadow-lg shadow-rose-500/20 ring-2 ring-rose-400'
                    : 'bg-rose-950/80 text-rose-100 border-rose-500 hover:border-rose-300 shadow-md'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-rose-700/60 pb-1">
                  <span className="text-rose-300 font-sans">
                    {isFa ? 'آیتم ۳. فرم رسمی ODT بهداشت NSW + دفترچه دوز روزانه S8' : 'Item 3: NSW Health ODT Form & S8 Log'}
                  </span>
                  {placements.odtS8Record ? (
                    <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px]">
                      {isFa ? 'بایگانی شد ✅' : 'Sorted ✅'}
                    </span>
                  ) : (
                    <span className="bg-rose-800 text-rose-200 px-1.5 py-0.5 rounded text-[9px]">
                      {selectedItem === 'odtS8Record' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده تفکیک' : 'Ready')}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[11px] font-sans">
                  <p className="font-extrabold text-amber-300">Schedule 8 Controlled Drug OTP Permit & Dosing Register</p>
                  <p className="text-[10px] text-slate-300 font-mono">Patient: {scenario.patientName} | Reg No: #NSW-OTP-88120</p>
                </div>

                {!placements.odtS8Record && (
                  <div className="text-center pt-1 text-[9px] text-rose-300 font-bold font-mono">
                    {isFa ? '👈 کلیک کنید یا به گاوصندوق S8 Safe (Zone C) بکشید' : '👈 Drag to Schedule 8 Safe (Zone C)'}
                  </div>
                )}
              </div>
            )}

            {/* SORTABLE ITEM 4: DISCARDED TRIAL PRINT / SENSITIVE LABEL WASTE */}
            <div
              draggable={!placements.discardedPrint}
              onDragStart={(e) => handleDragStart(e, 'discardedPrint')}
              onClick={() => !placements.discardedPrint && setSelectedItem('discardedPrint')}
              className={`p-3 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-1.5 ${
                placements.discardedPrint
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  : selectedItem === 'discardedPrint'
                  ? 'bg-slate-800 border-slate-400 text-white shadow-lg ring-2 ring-slate-400'
                  : 'bg-slate-900 text-slate-300 border-slate-700 hover:border-slate-500 shadow-md'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-700/60 pb-1">
                <span className="text-slate-300 font-sans">
                  {isFa ? 'آیتم ۴. پرینت اشتباه / استیکر ضایعاتی حاوی شناسه بیمار' : 'Item 4: Discarded Sensitive Printout'}
                </span>
                {placements.discardedPrint ? (
                  <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[9px]">
                    {isFa ? 'امحا شد ✅' : 'Shredded ✅'}
                  </span>
                ) : (
                  <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[9px]">
                    {selectedItem === 'discardedPrint' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده تفکیک' : 'Ready')}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[11px] font-sans">
                <p className="font-extrabold text-slate-300">Misprinted Label / Trial Draft containing Medicare Details</p>
              </div>

              {!placements.discardedPrint && (
                <div className="text-center pt-1 text-[9px] text-slate-400 font-bold font-mono">
                  {isFa ? '👈 کلیک کنید یا به سطل امحای محرمانه (Zone D) بکشید' : '👈 Drag to Shredding Bin (Zone D)'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL: 4 DESIGNATED RETENTION ZONES (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-indigo-500/30 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-indigo-300 uppercase flex items-center gap-1.5">
              <Archive className="w-4 h-4 text-indigo-400" />
              {isFa ? 'زون‌های ۴گانه بایگانی و نگهداری اسناد داروسازی:' : 'Designated Statutory Retention Zones'}
            </span>
            <span className="text-[10px] text-slate-400">
              {isFa ? 'برای چسباندن اسناد روی زون هدف کلیک کنید' : 'Click zone to store selected document'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* ZONE A: PATIENT HANDOUT BAG */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'zoneA_PatientBag')}
              onClick={() => handlePlaceItem('zoneA_PatientBag')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[170px] shadow-lg ${
                placements.patientHandoutItem
                  ? 'bg-slate-900/90 border-emerald-500'
                  : selectedItem === 'patientHandoutItem'
                  ? 'bg-amber-950/80 border-amber-400 ring-2 ring-amber-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-amber-300 flex items-center gap-1.5 font-mono">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>{isFa ? 'زون A: کیسه تحویل دارو به بیمار' : 'Zone A: Patient Handout Bag'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Patient Delivery</span>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                {isFa
                  ? 'محتویات: داروهای برچسب‌خورده + برگه تکرار زرد رنگ PB24 منگنه‌شده (یا توکن eScript).'
                  : 'Contents: Dispensed medication container + stapled PB24 repeat form or eToken.'}
              </p>

              <div className={`border-2 border-dashed p-3 rounded-xl text-center transition ${
                placements.patientHandoutItem
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'border-amber-500/60 bg-amber-950/30 text-amber-300'
              }`}>
                {placements.patientHandoutItem ? (
                  <span className="font-bold text-xs block">✅ {isFa ? 'دارو و برگه PB24 درون کیسه بیمار قرار گرفت' : 'Medication & PB24 Form Placed in Bag'}</span>
                ) : (
                  <span className="font-bold text-xs font-mono block">
                    {isFa ? '🎯 زون A: کیسه تحویل به بیمار (Patient Handout Bag)' : '🎯 Drop Zone A: Patient Handout Bag'}
                  </span>
                )}
              </div>
            </div>

            {/* ZONE B: PBS CLAIMING BOX (PARCHMENT COPIES) */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'zoneB_PbsClaimBox')}
              onClick={() => handlePlaceItem('zoneB_PbsClaimBox')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[170px] shadow-lg ${
                placements.pbsClaimDuplicate
                  ? 'bg-slate-900/90 border-emerald-500'
                  : selectedItem === 'pbsClaimDuplicate'
                  ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-teal-300 flex items-center gap-1.5 font-mono">
                  <Archive className="w-4 h-4 text-teal-400" />
                  <span>{isFa ? 'زون B: جعبه بایگانی فیزیکی داروخانه (۲ سال)' : 'Zone B: Pharmacy Physical Archive (2 Yrs)'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">PBS & AHPRA Audit</span>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                {isFa
                  ? 'محتویات: نسخه اصلی کاغذی به همراه برچسب اختصاصی Store Copy چسبانده‌شده پشت آن برای نگهداری ۲ ساله قانونی و ممیزی‌های PBS و AHPRA.'
                  : 'Contents: Original paper prescription bearing the Store Copy label on its back for mandatory 2-year PBS & AHPRA physical audit retention.'}
              </p>

              <div className={`border-2 border-dashed p-3 rounded-xl text-center transition ${
                placements.pbsClaimDuplicate
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'border-teal-500/60 bg-teal-950/30 text-teal-300'
              }`}>
                {placements.pbsClaimDuplicate ? (
                  <span className="font-bold text-xs block">✅ {isFa ? 'نسخه اصلی + برچسب Store Copy در بایگانی داروخانه ذخیره شد' : 'Original Script + Store Copy Saved in Archive'}</span>
                ) : (
                  <span className="font-bold text-xs font-mono block">
                    {isFa ? '🎯 زون B: بایگانی فیزیکی داروخانه (Pharmacy Archive Box)' : '🎯 Drop Zone B: Pharmacy Archive Box'}
                  </span>
                )}
              </div>
            </div>

            {/* ZONE C: SCHEDULE 8 SAFE (NSW ODT PERMITS & REGISTERS) */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'zoneC_S8Safe')}
              onClick={() => handlePlaceItem('zoneC_S8Safe')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[170px] shadow-lg ${
                placements.odtS8Record
                  ? 'bg-slate-900/90 border-emerald-500'
                  : selectedItem === 'odtS8Record'
                  ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-rose-300 flex items-center gap-1.5 font-mono">
                  <Lock className="w-4 h-4 text-rose-400" />
                  <span>{isFa ? 'زون C: گاوصندوق نگهداری داروی S8' : 'Zone C: Schedule 8 Safe'}</span>
                </span>
                <span className="text-[10px] text-rose-300 font-mono">NSW Health S8 Drug Safe</span>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                {isFa
                  ? 'محتویات: فرم‌های مجاز نسخه ODT داروهای مخدر تحت کنترل (Schedule 8) و دفاتر ثبت دوزهای تحویلی.'
                  : 'Contents: Schedule 8 controlled drug ODT prescription permits & daily dispensing registers locked per NSW law.'}
              </p>

              <div className={`border-2 border-dashed p-3 rounded-xl text-center transition ${
                placements.odtS8Record
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'border-rose-500/60 bg-rose-950/30 text-rose-300'
              }`}>
                {placements.odtS8Record ? (
                  <span className="font-bold text-xs block">✅ {isFa ? 'نسخه و دفترچه S8 درون گاوصندوق قفل گردید' : 'S8 Script & Register Locked in Safe'}</span>
                ) : (
                  <span className="font-bold text-xs font-mono block">
                    {isFa ? '🎯 زون C: گاوصندوق قفل‌دار S8 Safe' : '🎯 Drop Zone C: Schedule 8 Safe'}
                  </span>
                )}
              </div>
            </div>

            {/* ZONE D: CONFIDENTIAL SHREDDING BIN */}
            <div
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, 'zoneD_ShredderBin')}
              onClick={() => handlePlaceItem('zoneD_ShredderBin')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[170px] shadow-lg ${
                placements.discardedPrint
                  ? 'bg-slate-900/90 border-emerald-500'
                  : selectedItem === 'discardedPrint'
                  ? 'bg-slate-800 border-slate-400 ring-2 ring-slate-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-800 hover:border-slate-600'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-slate-300 flex items-center gap-1.5 font-mono">
                  <Trash2 className="w-4 h-4 text-slate-400" />
                  <span>{isFa ? 'زون D: سطل امحای محرمانه' : 'Zone D: Confidential Shredding Bin'}</span>
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Privacy Shredder</span>
              </div>

              <p className="text-[10px] text-slate-300 leading-relaxed font-sans">
                {isFa
                  ? 'محتویات: پرینت‌های اشتباه و برچسب‌های ضایعاتی حاوی شناسه بیمار جهت خرد شدن طبق قانون حریم خصوصی.'
                  : 'Contents: Discarded prints or misprinted labels bearing patient identifiers destroyed per Privacy Act.'}
              </p>

              <div className={`border-2 border-dashed p-3 rounded-xl text-center transition ${
                placements.discardedPrint
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200'
                  : 'border-slate-600 bg-slate-950/50 text-slate-300'
              }`}>
                {placements.discardedPrint ? (
                  <span className="font-bold text-xs block">✅ {isFa ? 'پرینت‌های ضایعاتی در سطل امحای محرمانه خرد شدند' : 'Sensitive Printouts Shredded'}</span>
                ) : (
                  <span className="font-bold text-xs font-mono block">
                    {isFa ? '🎯 زون D: سطل امحای محرمانه (Shredding Bin)' : '🎯 Drop Zone D: Confidential Shredding Bin'}
                  </span>
                )}
              </div>
            </div>

          </div>

          {/* REAL-TIME RETENTION VALIDATOR & CLINICAL FEEDBACK BANNER */}
          {feedback && (
            <div className={`p-4 rounded-2xl border-2 space-y-2 animate-in fade-in slide-in-from-bottom-2 shadow-xl ${
              feedback.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500 text-emerald-100'
                : 'bg-rose-950/90 border-rose-500 text-rose-100'
            }`}>
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2 font-bold text-sm">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
                  )}
                  <span>{feedback.title}</span>
                </div>
                <span className="text-[10px] font-mono opacity-80 uppercase">
                  {feedback.type === 'success' ? 'Retention Compliant' : 'Audit Penalty Warning'}
                </span>
              </div>

              <p className="text-xs font-medium leading-relaxed">{feedback.message}</p>

              {feedback.ruleTip && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] leading-relaxed space-y-1 font-sans">
                  <span className="font-bold text-amber-300 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFa ? 'نکته قانونی بایگانی اسناد (PBA & Services Australia Regulations):' : 'PBA Statutory Retention Rule:'}</span>
                  </span>
                  <p className="text-slate-200">{feedback.ruleTip}</p>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
