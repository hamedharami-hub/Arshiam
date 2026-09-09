'use client';

import React, { useEffect, useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Tag,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Pill,
  RotateCcw,
  Sparkles,
  ShieldCheck,
  Package,
  QrCode,
  DollarSign,
  AlertCircle,
  HelpCircle,
  ArrowRight,
  Info,
  Check,
  Maximize2,
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

interface DispensingDeskLabelingPanelProps {
  language: Language;
  scenario?: ScriptScenarioData;
  isGenericSubstituted?: boolean;
  onAllStickersPlaced?: () => void;
}

export type StickerType = 'mainLabel' | 'storeCopy' | 'odtTakeaway';
export type TargetZone = 'medicationBox' | 'scriptBackStoreCopy' | 'odtTakeawayBottle';

const TARGET_STICKERS: Record<TargetZone, StickerType> = {
  medicationBox: 'mainLabel',
  scriptBackStoreCopy: 'storeCopy',
  odtTakeawayBottle: 'odtTakeaway',
};

export const DispensingDeskLabelingPanel: React.FC<DispensingDeskLabelingPanelProps> = ({
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
  onAllStickersPlaced,
}) => {
  const isFa = language === 'fa';

  const isOdtMode = scenario.schedule === 'S8' || scenario.id === 'script-5';

  // Currently picked up / selected sticker
  const [selectedSticker, setSelectedSticker] = useState<StickerType | null>(null);
  const [previewTarget, setPreviewTarget] = useState<TargetZone | null>(null);

  // Sticker Placement Record
  const [placements, setPlacements] = useState<Record<StickerType, TargetZone | null>>({
    mainLabel: null,
    storeCopy: null,
    odtTakeaway: null,
  });

  // Feedback State
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | null;
    title: string;
    message: string;
    ruleTip?: string;
  } | null>(null);

  const displayedDrugName = isGenericSubstituted
    ? scenario.aFlagGenericSubstitute
    : scenario.prescribedDrug;

  // Active required stickers count (Standard = 2: Main Label + Store Copy, ODT = 3: + ODT Takeaway)
  const requiredStickerCount = isOdtMode ? 3 : 2;
  const placedCount = Object.entries(placements).filter(([key, value]) => {
    if (!isOdtMode && key === 'odtTakeaway') return false;
    return value !== null;
  }).length;

  const isCompleted = placedCount === requiredStickerCount;

  // Reset Desk
  const handleResetDesk = () => {
    setPlacements({
      mainLabel: null,
      storeCopy: null,
      odtTakeaway: null,
    });
    setSelectedSticker(null);
    setFeedback({
      type: 'success',
      title: isFa ? 'میز برچسب‌گذاری بازنشانی شد' : 'Workspace Reset',
      message: isFa
        ? 'تمامی برچسب‌ها به سینی چاپگر بازگشتند. می‌توانید فرایند برچسب‌گذاری را مجدداً انجام دهید.'
        : 'All labels returned to tray. You can restart the labeling workflow.',
    });
  };

  useEffect(() => {
    if (!previewTarget) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPreviewTarget(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [previewTarget]);

  const getRuleExplanation = (sticker: StickerType, target: TargetZone) => {
    if (sticker === 'mainLabel' && target === 'medicationBox') {
      return {
        fa: 'الزام PBA: برچسب اصلی دیسپنسینگ (Main CAL Dispensing Label) باید کاملاً خوانا روی بسته یا قوطی اصلی دارو چسبانده شود (با رعایت اینکه روی تاریخ انقضا EXP و شماره Batch را نپوشاند) تا بیمار دوز صحیح و هشدارهای CAL را هنگام مصرف در منزل ببیند.',
        en: 'PBA Standard: Main CAL dispensing label must be affixed directly onto the primary container (ensuring Batch & Expiry dates are not obscured) so the patient reads correct dosage directions & CAL warnings.',
      };
    }

    if (sticker === 'storeCopy' && target === 'scriptBackStoreCopy') {
      return {
        fa: 'الزام قانونی و مالی داروخانه (Store Copy / ثبت قانونی و اسکن صندوق): این برچسب پشت برگه نسخه اصلی کاغذی (در کنار کادر امضای تأیید دریافت بیمار Patient Declaration) چسبانده می‌شود. این برچسب دارای دو کارکرد اصلی است: ۱) ثبت قانونی و بایگانی با مشخصات کامل دیسپنس (شماره نسخه Script No، کد PBS، تاریخ، نام داروساز) برای ممیزی‌های قانونی، ۲) بارکد POS برای اسکن صندوق‌دار و ثبت قیمت نسخه در صندوق.',
        en: 'Pharmacy Store Copy Standard: The Store Copy label belongs on the BACK of the original paper prescription (alongside the Patient Declaration signature box). It serves dual functions: 1) Full legal audit record (Script No, PBS code, date, pharmacist) for compliance inspections, 2) POS barcode for cash register scanning.',
      };
    }

    if (sticker === 'odtTakeaway' && target === 'odtTakeawayBottle') {
      return {
        fa: 'الزام بهداشت نیو ساوت ولز (NSW Health ODT Guidelines): هر دوز خانگی (Takeaway) باید دارای برچسب اختصاصی حاوی تاریخ دقیق مصرف، دوزاژ و عبارت اجباری "KEEP OUT OF REACH OF CHILDREN" باشد.',
        en: 'NSW Health ODT Standard: Every takeaway dose bottle must bear a dedicated label stating exact consumption date, dose, and mandatory child safety warnings.',
      };
    }

    return null;
  };

  // Attempt Sticker Placement
  const handlePlaceSticker = (target: TargetZone, sticker = selectedSticker) => {
    if (!sticker) {
      setFeedback({
        type: 'error',
        title: isFa ? 'برچسبی انتخاب نشده است!' : 'No Label Selected!',
        message: isFa
          ? 'لطفاً ابتدا روی یکی از برچسب‌های چاپ شده در سینی چپ کلیک کنید تا انتخاب شود، سپس روی محل هدف کلیک کنید.'
          : 'Please click a printed label in the left tray first to pick it up, then click the target location.',
      });
      return;
    }

    const ruleExplanation = getRuleExplanation(sticker, target);
    const isValidMatch = !!ruleExplanation;

    if (isValidMatch) {
      const updated = { ...placements, [sticker]: target };
      setPlacements(updated);
      setSelectedSticker(null);

      setFeedback({
        type: 'success',
        title: isFa ? 'چسباندن صحیح برچسب ✅' : 'Correct Label Placement ✅',
        message: isFa
          ? `برچسب با موفقیت در محل قانونی و استاندارد خود قرار گرفت.`
          : `Label successfully placed in its compliant target zone.`,
        ruleTip: isFa ? ruleExplanation.fa : ruleExplanation.en,
      });

      // Check if all placed
      const newPlacedCount = Object.entries(updated).filter(([key, value]) => {
        if (!isOdtMode && key === 'odtTakeaway') return false;
        return value !== null;
      }).length;

      if (newPlacedCount === (isOdtMode ? 3 : 2) && onAllStickersPlaced) {
        onAllStickersPlaced();
      }
    } else {
      // Mismatch handling
      let mismatchMsgFa = '';
      let mismatchMsgEn = '';

      if (sticker === 'mainLabel') {
        mismatchMsgFa = '❌ خطا: برچسب اصلی دستور مصرف (Main Label) نباید روی نسخه کاغذی چسبانده شود! این برچسب باید مستقیماً روی قوطی یا بسته فیزیکی دارو (بدون پوشاندن Batch/EXP) قرار گیرد.';
        mismatchMsgEn = '❌ Misplaced: Main CAL dispensing label belongs directly on the physical medication container, NOT on the prescription paper!';
      } else if (sticker === 'storeCopy') {
        mismatchMsgFa = '❌ خطا: برچسب Store Copy (بایگانی و اسکن صندوق) باید پشت نسخه اصلی کاغذی (در مجاورت کادر امضای بیمار) قرار گیرد تا صندوق‌دار بتواند بارکد آن را اسکن کند و نسخه برای ممیزی قانونی بایگانی شود.';
        mismatchMsgEn = '❌ Misplaced: Store Copy label belongs on the BACK of the paper prescription (adjacent to Patient Declaration) for legal archiving and POS till scanning!';
      } else if (sticker === 'odtTakeaway') {
        mismatchMsgFa = '❌ خطا: برچسب دوز خانگی ODT باید روی بطری دوز خانگی چسبانده شود!';
        mismatchMsgEn = '❌ Misplaced: ODT Takeaway label belongs on the Takeaway Bottle/Pack!';
      }

      setFeedback({
        type: 'error',
        title: isFa ? 'خطای جانمایی برچسب ⚠️' : 'Incorrect Placement ⚠️',
        message: isFa ? mismatchMsgFa : mismatchMsgEn,
        ruleTip: isFa
          ? 'راهنمای بالینی و استانداردهای نوین داروخانه: در سیستم‌های مدرن استرالیا (Online Claiming)، هیچ برچسبی روی گوشه برگه Duplicate چسبانده نمی‌شود و برچسب Store Copy جهت بایگانی قانونی و اسکن صندوق، پشت نسخه کاغذی قرار می‌گیرد.'
          : 'Clinical Tip: In modern Australian online claiming, no stickers are placed on duplicate script corners. The Store Copy label is affixed to the back of the original paper script for legal audit & POS till scanning.',
      });
    }
  };

  const renderStickerPreview = (sticker: StickerType) => {
    if (sticker === 'mainLabel') {
      return (
        <div className="bg-white text-slate-900 p-4 rounded-xl border-2 border-teal-500 shadow-lg font-mono space-y-2 max-w-sm">
          <div className="flex justify-between items-center text-xs font-bold border-b border-slate-200 pb-2">
            <span className="text-teal-900 uppercase flex items-center gap-1.5">
              <Pill className="w-4 h-4 text-teal-700" />
              {isFa ? 'برچسب اصلی دیسپنسینگ' : 'Main CAL Dispensing Label'}
            </span>
            <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[10px]">CAL</span>
          </div>
          <p className="font-extrabold text-sm">{displayedDrugName}</p>
          <p className="text-xs text-slate-700">
            Patient: <strong className="text-black">{scenario.patientName}</strong>
          </p>
          <p className="text-xs text-teal-950 italic font-semibold bg-amber-50 p-2 rounded border border-amber-200">
            <strong>Sig:</strong> {scenario.directions}
          </p>
          <div className="flex justify-between text-[10px] text-slate-500">
            <span>Batch visible</span>
            <span>EXP visible</span>
          </div>
        </div>
      );
    }

    if (sticker === 'storeCopy') {
      return (
        <div className="bg-slate-900 text-sky-100 p-4 rounded-xl border-2 border-sky-500 shadow-lg font-mono space-y-2 max-w-sm">
          <div className="flex justify-between items-center text-xs font-bold border-b border-sky-700 pb-2">
            <span className="text-sky-300">METRO SYDNEY PHARMACY</span>
            <span className="text-amber-300">STORE COPY</span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>Script: <strong className="text-white">#2026-9901A</strong></span>
            <span>Date: <strong className="text-slate-200">{scenario.scriptDate}</strong></span>
          </div>
          <div className="flex justify-between text-xs text-slate-300">
            <span>PBS: <strong className="text-emerald-400">{scenario.pbsCode}</strong></span>
            <span>Copay: <strong className="text-amber-300">$31.60</strong></span>
          </div>
          <div className="bg-white text-black p-2 rounded text-center">
            <div className="h-5 text-[10px] tracking-tighter font-mono flex items-center justify-center">
              |||| | ||| |||| | |||| ||| ||
            </div>
            <span className="text-[10px] font-mono font-bold block">POS TILL SCAN: *202699013160*</span>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-rose-900 text-rose-100 p-4 rounded-xl border-2 border-rose-500 shadow-lg font-mono space-y-2 max-w-sm">
        <div className="flex items-center justify-between text-xs font-bold border-b border-rose-700 pb-2">
          <span className="flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-amber-300" />
            {isFa ? 'برچسب دوز خانگی ODT' : 'ODT Takeaway Dose Label'}
          </span>
          <span className="bg-rose-800 text-rose-200 px-2 py-0.5 rounded text-[10px]">S8</span>
        </div>
        <p className="font-extrabold text-amber-300">Methadone 60mg Oral Liquid</p>
        <p className="text-xs text-white">Consumption Date: <strong className="text-amber-200">17/08/2026</strong></p>
        <p className="text-xs text-rose-200 font-bold bg-rose-950 p-2 rounded border border-rose-800 uppercase text-center">
          ⚠️ KEEP OUT OF REACH OF CHILDREN
        </p>
      </div>
    );
  };

  const renderTargetPreview = (target: TargetZone, sticker: StickerType) => {
    if (target === 'medicationBox') {
      return (
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 rounded-2xl border border-teal-700 shadow-inner space-y-4">
          <div className="flex items-center justify-center gap-4">
            <div className="w-20 h-28 rounded-xl bg-teal-600 text-white font-mono text-xs font-bold flex flex-col items-center justify-center p-2 text-center shadow-md">
              <Pill className="w-8 h-8 text-amber-300 mb-2" />
              <span>30 TAB</span>
            </div>
            <div className="space-y-2">
              <strong className="text-lg font-extrabold text-white font-mono block">{displayedDrugName}</strong>
              <span className="text-xs text-teal-300 font-mono block">Schedule {scenario.schedule} | PBS #{scenario.pbsCode}</span>
              <div className="bg-slate-950/80 px-3 py-1 rounded border border-slate-700 flex gap-3 text-xs font-mono text-amber-300">
                <span>Batch: #B-2026-881</span>
                <span>•</span>
                <span>Exp: 08/2028</span>
              </div>
            </div>
          </div>
          <div className="border-2 border-dashed border-teal-400/70 bg-teal-950/30 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-teal-300 block text-center">
              {isFa ? 'محل الصاق برچسب اصلی روی قوطی' : 'Main Label Affixed to Container'}
            </span>
            {renderStickerPreview(sticker)}
          </div>
        </div>
      );
    }

    if (target === 'scriptBackStoreCopy') {
      return (
        <div className="bg-slate-100 text-slate-900 p-5 rounded-xl border-2 border-slate-300 text-xs space-y-3 font-sans">
          <div className="text-center font-bold text-slate-800 border-b border-slate-300 pb-2 font-mono">
            --- BACK OF ORIGINAL PRESCRIPTION PAPER ---
          </div>
          <div className="p-3 rounded bg-amber-50/80 border border-amber-200 space-y-1">
            <span className="font-bold text-slate-800 flex items-center justify-between">
              <span>✍️ Patient / Agent Declaration</span>
              <span className="text-slate-500 font-mono">PBS Supply Confirmation</span>
            </span>
            <p className="text-slate-600 italic">I certify that I have received this medication under Medicare / PBS.</p>
            <p className="font-mono text-slate-700">Signature: <i>D. Miller</i> | Date: {scenario.scriptDate}</p>
          </div>
          <div className="border-2 border-dashed border-sky-500/70 bg-sky-950/20 p-4 rounded-xl space-y-2">
            <span className="text-xs font-bold text-sky-300 block text-center">
              {isFa ? 'محل الصاق برچسب Store Copy پشت نسخه' : 'Store Copy Affixed to Back of Script'}
            </span>
            {renderStickerPreview(sticker)}
          </div>
        </div>
      );
    }

    return (
      <div className="bg-rose-950/60 p-5 rounded-xl border-2 border-rose-800 text-xs space-y-3 font-mono">
        <div className="flex justify-between items-center text-amber-300 font-bold border-b border-rose-800 pb-2">
          <span>METHADONE TAKEAWAY BOTTLE</span>
          <span className="text-xs bg-rose-900 px-2 py-0.5 text-white rounded">S8 NARCOTIC</span>
        </div>
        <div className="border-2 border-dashed border-rose-500/70 bg-rose-900/30 p-4 rounded-xl space-y-2">
          <span className="text-xs font-bold text-rose-300 block text-center">
            {isFa ? 'محل الصاق برچسب روی بطری Takeaway' : 'ODT Label Affixed to Takeaway Bottle'}
          </span>
          {renderStickerPreview(sticker)}
        </div>
      </div>
    );
  };

  const previewSticker = previewTarget ? TARGET_STICKERS[previewTarget] : null;
  const previewRule = previewTarget && previewSticker
    ? getRuleExplanation(previewSticker, previewTarget)
    : null;
  const previewIsPlaced = previewTarget && previewSticker
    ? placements[previewSticker] !== null
    : false;

  return (
    <div className="app-card border-2 border-teal-500/50 rounded-2xl p-4 sm:p-6 bg-slate-950 text-white space-y-6 shadow-2xl">
      {/* HEADER BAR: TITLE, STATUS COUNTER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-teal-500/30 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono text-[10px] font-bold border border-teal-500/30 uppercase">
                SUB-PHASE 5.6
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isFa
                  ? 'میز تعاملی برچسب‌گذاری دیسپنسینگ (Dispensing & Labeling Desk)'
                  : 'Interactive Physical Labeling & Dispensing Desk Engine'}
              </h3>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Reset Desk Button */}
          <button
            onClick={handleResetDesk}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition text-xs font-bold flex items-center gap-1.5"
            title="Reset All Stickers"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{isFa ? 'بازنشانی میز' : 'Reset Desk'}</span>
          </button>

          {/* Progress Status Badge */}
          <div className={`px-3.5 py-2 rounded-xl font-mono text-xs font-bold border flex items-center gap-1.5 ${
            isCompleted
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 animate-pulse'
              : 'bg-slate-900 text-teal-300 border-teal-500/40'
          }`}>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>
              {isFa
                ? `تکمیل: ${placedCount} از ${requiredStickerCount}`
                : `Progress: ${placedCount}/${requiredStickerCount}`}
            </span>
          </div>
        </div>
      </div>

      {/* MODERN AUSTRALIAN WORKFLOW EDUCATION CALLOUT */}
      <div className="bg-teal-950/40 border border-teal-500/40 rounded-xl p-3.5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-start gap-2.5">
          <Info className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-teal-200 block">
              {isFa ? '💡 راهنمای استانداردهای نوین دیسپنسینگ استرالیا (Online Claiming Workflow):' : '💡 Modern Australian Dispensing Workflow Guide:'}
            </span>
            <p className="text-slate-300 leading-relaxed text-[11px]">
              {isFa ? (
                <>
                  <strong>۱. روی جعبه دارو:</strong> برچسب اصلی دیسپنسینگ (Main Label) با هشدارهای CAL (بدون پوشاندن Batch/EXP) •{' '}
                  <strong>۲. پشت نسخه کاغذی:</strong> برچسب Store Copy جهت بایگانی قانونی و اسکن بارکد در صندوق POS (کنار کادر امضای بیمار) •{' '}
                  <strong>۳. برگه کپی (Duplicate):</strong> در سیستم آنلاین هیچ استیکری روی گوشه نسخه چسبانده نمی‌شود و تمیز همراه با فرم زرد تکرار تحویل بیمار می‌گردد.
                </>
              ) : (
                <>
                  <strong>1. Container:</strong> Main CAL Dispense Label (Batch & Exp visible) •{' '}
                  <strong>2. Back of Script:</strong> Store Copy Label for legal audit & POS till scan (beside Patient Declaration) •{' '}
                  <strong>3. Duplicate:</strong> Clean copy without corner stickers, stapled to Repeat Form PB 24 for patient.
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* WORKSPACE MAIN GRID: LEFT PRINTED TRAY (4 COLS) | RIGHT PHYSICAL TARGETS (8 COLS) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: PRINTED STICKERS TRAY (SPOOLER OUTPUT) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-teal-500/30 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-teal-300 uppercase flex items-center gap-1.5">
              <Tag className="w-4 h-4 text-teal-400" />
              {isFa ? 'سینی خروجی برچسب‌های چاپ شده:' : 'Printed Labels Spooler Tray'}
            </span>
            <span className="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {isFa ? 'برای انتخاب کلیک کنید' : 'Click to Select'}
            </span>
          </div>

          <div className="space-y-3">
            {/* STICKER 1: MAIN DISPENSING CAL LABEL */}
            <div
              onClick={() => !placements.mainLabel && setSelectedSticker('mainLabel')}
              className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-2 ${
                placements.mainLabel
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  : selectedSticker === 'mainLabel'
                  ? 'bg-teal-950 border-teal-400 text-white shadow-lg shadow-teal-500/20 scale-102 ring-2 ring-teal-400'
                  : 'bg-white text-slate-900 border-teal-500 hover:border-teal-300 shadow-md'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold border-b border-slate-200/80 pb-1.5">
                <span className="text-teal-900 uppercase font-sans flex items-center gap-1">
                  <Pill className="w-3.5 h-3.5 text-teal-700" />
                  {isFa ? '۱. برچسب اصلی دیسپنسینگ (Main CAL Label)' : '1. Main CAL Dispensing Label'}
                </span>
                {placements.mainLabel ? (
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-mono">
                    {isFa ? 'چسبانده شد ✅' : 'Placed ✅'}
                  </span>
                ) : (
                  <span className="bg-teal-100 text-teal-900 px-2 py-0.5 rounded text-[9px]">
                    {selectedSticker === 'mainLabel' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده چسباندن' : 'Ready')}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[11px] font-sans">
                <p className="font-extrabold text-slate-950 text-xs">{displayedDrugName}</p>
                <p className="text-[10px] text-slate-700">Patient: <strong className="text-black">{scenario.patientName}</strong> ({scenario.patientDob})</p>
                <p className="text-[10px] text-teal-950 italic font-semibold bg-amber-50 p-1.5 rounded border border-amber-200">
                  <strong>Sig:</strong> {scenario.directions}
                </p>
                <div className="flex justify-between text-[9px] text-slate-500 font-mono pt-0.5">
                  <span>Rx: #2026-9901A</span>
                  <span>Qty: {scenario.quantity} | Reps: {scenario.repeats}</span>
                  <span>CAL: 1, 13</span>
                </div>
              </div>

              {!placements.mainLabel && (
                <div className="text-center pt-1 text-[9px] text-teal-800 font-bold font-mono">
                  {isFa ? '👈 برای انتخاب برچسب کلیک کنید' : '👈 Click to select this label'}
                </div>
              )}
              <p className="text-[9px] leading-relaxed text-teal-900 bg-teal-50/80 border border-teal-200 rounded p-1.5 font-sans">
                {isFa
                  ? getRuleExplanation('mainLabel', 'medicationBox')?.fa
                  : getRuleExplanation('mainLabel', 'medicationBox')?.en}
              </p>
            </div>

            {/* STICKER 2: STORE COPY / AUDIT & POS BARCODE LABEL */}
            <div
              onClick={() => !placements.storeCopy && setSelectedSticker('storeCopy')}
              className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-2 ${
                placements.storeCopy
                  ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                  : selectedSticker === 'storeCopy'
                  ? 'bg-sky-950 border-sky-400 text-white shadow-lg shadow-sky-500/20 scale-102 ring-2 ring-sky-400'
                  : 'bg-slate-900 text-sky-100 border-sky-500 hover:border-sky-300 shadow-md'
              }`}
            >
              <div className="flex justify-between items-center text-[10px] font-bold border-b border-sky-700/80 pb-1.5">
                <span className="text-sky-300 font-sans flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5 text-amber-300" />
                  {isFa ? '۲. برچسب Store Copy (بایگانی و اسکن صندوق)' : '2. Store Copy / Audit & POS Label'}
                </span>
                {placements.storeCopy ? (
                  <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-mono">
                    {isFa ? 'چسبانده شد ✅' : 'Placed ✅'}
                  </span>
                ) : (
                  <span className="bg-sky-800 text-sky-200 px-2 py-0.5 rounded text-[9px]">
                    {selectedSticker === 'storeCopy' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده چسباندن' : 'Ready')}
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[10px]">
                <div className="flex justify-between text-sky-200 font-bold border-b border-slate-800 pb-0.5">
                  <span>METRO SYDNEY PHARMACY</span>
                  <span className="text-amber-300">STORE COPY</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Script: <strong className="text-white">#2026-9901A</strong></span>
                  <span>Date: <strong className="text-slate-200">{scenario.scriptDate}</strong></span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>PBS: <strong className="text-emerald-400">{scenario.pbsCode}</strong></span>
                  <span>Copay: <strong className="text-amber-300">$31.60</strong></span>
                </div>
                <p className="text-[9px] text-slate-400">Dispensed by: Ph. Jenkins | Patient: {scenario.patientName}</p>
                
                {/* POS Barcode simulation */}
                <div className="bg-white text-black p-1 rounded text-center space-y-0.5 mt-1">
                  <div className="h-3 text-[7px] tracking-tighter font-mono flex items-center justify-center">
                    |||| | ||| |||| | |||| ||| ||
                  </div>
                  <span className="text-[8px] font-mono font-bold block text-slate-900">POS TILL SCAN: *202699013160*</span>
                </div>
              </div>

              {!placements.storeCopy && (
                <div className="text-center pt-1 text-[9px] text-sky-300 font-bold font-mono">
                  {isFa ? '👈 برای انتخاب برچسب کلیک کنید' : '👈 Click to select this label'}
                </div>
              )}
              <p className="text-[9px] leading-relaxed text-sky-200 bg-sky-950/50 border border-sky-700 rounded p-1.5 font-sans">
                {isFa
                  ? getRuleExplanation('storeCopy', 'scriptBackStoreCopy')?.fa
                  : getRuleExplanation('storeCopy', 'scriptBackStoreCopy')?.en}
              </p>
            </div>

            {/* STICKER 3: ODT TAKEAWAY BOTTLE LABEL (ACTIVE IN ODT MODE) */}
            {isOdtMode && (
              <div
                onClick={() => !placements.odtTakeaway && setSelectedSticker('odtTakeaway')}
                className={`p-3.5 rounded-xl border-2 transition cursor-pointer relative font-mono text-xs space-y-2 ${
                  placements.odtTakeaway
                    ? 'bg-slate-900/40 border-slate-800 text-slate-500 opacity-50 cursor-not-allowed'
                    : selectedSticker === 'odtTakeaway'
                    ? 'bg-rose-950 border-rose-400 text-white shadow-lg shadow-rose-500/20 scale-102 ring-2 ring-rose-400'
                    : 'bg-rose-900 text-rose-100 border-rose-500 hover:border-rose-300 shadow-md'
                }`}
              >
                <div className="flex justify-between items-center text-[10px] font-bold border-b border-rose-700 pb-1.5">
                  <span className="text-rose-300 font-sans flex items-center gap-1">
                    <Pill className="w-3.5 h-3.5 text-amber-300" />
                    {isFa ? '۳. برچسب دوز خانگی ODT Takeaway' : '3. ODT Takeaway Dose Label'}
                  </span>
                  {placements.odtTakeaway ? (
                    <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-mono">
                      {isFa ? 'چسبانده شد ✅' : 'Placed ✅'}
                    </span>
                  ) : (
                    <span className="bg-rose-800 text-rose-200 px-2 py-0.5 rounded text-[9px]">
                      {selectedSticker === 'odtTakeaway' ? (isFa ? 'انتخاب شده 🎯' : 'Selected') : (isFa ? 'آماده چسباندن' : 'Ready')}
                    </span>
                  )}
                </div>

                <div className="space-y-1 text-[10px] font-sans">
                  <p className="font-extrabold text-amber-300">Methadone 60mg Oral Liquid</p>
                  <p className="text-[9px] text-white">Consumption Date: <strong className="text-amber-200 font-mono">17/08/2026</strong></p>
                  <p className="text-[9px] text-rose-200 font-bold bg-rose-950 p-1.5 rounded border border-rose-800 uppercase text-center">
                    ⚠️ KEEP OUT OF REACH OF CHILDREN
                  </p>
                </div>

                {!placements.odtTakeaway && (
                  <div className="text-center pt-1 text-[9px] text-rose-300 font-bold font-mono">
                    {isFa ? '👈 برای انتخاب برچسب کلیک کنید' : '👈 Click to select this label'}
                  </div>
                )}
                <p className="text-[9px] leading-relaxed text-rose-200 bg-rose-950/60 border border-rose-700 rounded p-1.5 font-sans">
                  {isFa
                    ? getRuleExplanation('odtTakeaway', 'odtTakeawayBottle')?.fa
                    : getRuleExplanation('odtTakeaway', 'odtTakeawayBottle')?.en}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: PHYSICAL DISPENSING TARGETS DESK (8 COLS) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-slate-900 p-3 rounded-xl border border-teal-500/30 flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-teal-300 uppercase flex items-center gap-1.5">
              <Package className="w-4 h-4 text-teal-400" />
              {isFa ? 'میز تحویل فیزیکی دارو و نسخه‌ها (Drop Target Desk):' : 'Physical Dispensing Target Workspace'}
            </span>
            <span className="text-[10px] text-slate-400">
              {isFa ? 'روی هدف کلیک کنید تا برچسب الصاق شود' : 'Click target to paste selected label'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* TARGET 1: PHYSICAL MEDICATION BOX / BOTTLE */}
            <div
              onClick={() => handlePlaceSticker('medicationBox')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[210px] shadow-lg ${
                placements.mainLabel
                  ? 'bg-slate-900/90 border-emerald-500/80'
                  : selectedSticker === 'mainLabel'
                  ? 'bg-teal-950/80 border-teal-400 ring-2 ring-teal-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5 font-mono">
                  <Package className="w-4 h-4 text-teal-400" />
                  <span>{isFa ? 'هدف ۱: قوطی / بسته فیزیکی دارو' : 'Target 1: Physical Medication Container'}</span>
                </span>
                <span className="text-[10px] text-teal-300 font-mono">Main Label Target</span>
              </div>

              {/* Physical Box Mockup Design */}
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-3 rounded-xl border border-slate-700 shadow-inner flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-teal-600 text-white font-mono text-[10px] font-bold flex flex-col items-center justify-center p-1 text-center shrink-0 shadow-md">
                  <Pill className="w-5 h-5 text-amber-300 mb-1" />
                  <span>30 TAB</span>
                </div>
                <div className="space-y-1">
                  <strong className="text-sm font-extrabold text-white font-mono block">{displayedDrugName}</strong>
                  <span className="text-[10px] text-teal-300 font-mono block">Schedule {scenario.schedule} | PBS #{scenario.pbsCode}</span>
                  <div className="bg-slate-950/80 px-2 py-0.5 rounded border border-slate-700 flex gap-2 text-[9px] font-mono text-amber-300">
                    <span>Batch: #B-2026-881</span>
                    <span>•</span>
                    <span>Exp: 08/2028</span>
                  </div>
                </div>
              </div>

              {/* Drop Target Zone for Main Label */}
              <div
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation();
                  setPreviewTarget('medicationBox');
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    event.stopPropagation();
                    setPreviewTarget('medicationBox');
                  }
                }}
                className={`border-2 border-dashed p-2.5 rounded-xl transition text-center cursor-pointer ${
                  placements.mainLabel
                    ? 'bg-emerald-950/60 border-emerald-500 text-emerald-200'
                    : 'border-teal-500/60 bg-teal-950/30 text-teal-300'
                }`}
              >
                {placements.mainLabel ? (
                  <div className="text-xs space-y-0.5">
                    <span className="font-bold text-emerald-300 block">✅ {isFa ? 'برچسب اصلی دیسپنسینگ روی قوطی چسبانده شد' : 'Main Label Affixed to Container'}</span>
                    <span className="text-[10px] text-slate-300 font-mono">CAL Warning: {scenario.directions} (Batch & Exp visible)</span>
                  </div>
                ) : (
                  <span className="text-[11px] font-mono font-bold block">
                    {isFa ? '🎯 برای مشاهده محل الصاق برچسب اصلی کلیک کنید' : '🎯 Click to preview Main CAL Label placement'}
                  </span>
                )}
              </div>
            </div>

            {/* TARGET 2: BACK OF PRESCRIPTION PAPER (PATIENT DECLARATION & STORE COPY ARCHIVE) */}
            <div
              onClick={() => handlePlaceSticker('scriptBackStoreCopy')}
              className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[210px] shadow-lg ${
                placements.storeCopy
                  ? 'bg-slate-900/90 border-emerald-500/80'
                  : selectedSticker === 'storeCopy'
                  ? 'bg-sky-950/80 border-sky-400 ring-2 ring-sky-400/50 animate-pulse cursor-pointer'
                  : 'bg-slate-900 border-slate-700 hover:border-slate-500'
              }`}
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-white flex items-center gap-1.5 font-mono">
                  <DollarSign className="w-4 h-4 text-sky-400" />
                  <span>{isFa ? 'هدف ۲: پشت نسخه کاغذی (Store Copy & اسکن صندوق)' : 'Target 2: Back of Script (Store Copy & POS)'}</span>
                </span>
                <span className="text-[10px] text-amber-300 font-mono">Store Copy & Audit</span>
              </div>

              {/* Back of Script Visualizer */}
              <div className="bg-slate-100 text-slate-900 p-2.5 rounded-lg border border-slate-300 text-[10px] space-y-1.5 font-sans">
                <div className="text-center font-bold text-slate-800 border-b border-slate-300 pb-1 font-mono text-[9px]">
                  --- BACK OF ORIGINAL PRESCRIPTION PAPER ---
                </div>
                
                {/* Patient Signature Declaration Box */}
                <div className="p-1.5 rounded bg-amber-50/80 border border-amber-200 text-[9px] space-y-0.5">
                  <span className="font-bold text-slate-800 flex items-center justify-between">
                    <span>✍️ Patient / Agent Declaration</span>
                    <span className="text-[8px] text-slate-500 font-mono">PBS Supply Confirmation</span>
                  </span>
                  <p className="text-[8px] text-slate-600 italic">I certify that I have received this medication under Medicare / PBS.</p>
                  <p className="text-[8px] font-mono text-slate-700">Signature: <i>D. Miller</i> | Date: {scenario.scriptDate}</p>
                </div>

                {/* Placement Zone for Store Copy Label */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewTarget('scriptBackStoreCopy');
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      event.stopPropagation();
                      setPreviewTarget('scriptBackStoreCopy');
                    }
                  }}
                  className={`border-2 border-dashed p-2 rounded-lg text-center transition cursor-pointer ${
                    placements.storeCopy
                      ? 'bg-emerald-950 text-emerald-200 border-emerald-500'
                      : 'border-sky-600 bg-sky-50 text-sky-950'
                  }`}
                >
                  {placements.storeCopy ? (
                    <div className="space-y-0.5">
                      <span className="font-bold text-[10px] text-emerald-300 block">
                        ✅ {isFa ? 'برچسب Store Copy (بایگانی و بارکد اسکن صندوق) الصاق شد' : 'Store Copy (Audit & POS Barcode) Affixed'}
                      </span>
                      <span className="text-[8px] font-mono text-slate-300 block">Script #2026-9901A | Ready for POS Register Scan</span>
                    </div>
                  ) : (
                    <span className="font-bold text-[10px] block">
                      {isFa ? '🎯 برای مشاهده محل الصاق برچسب Store Copy کلیک کنید' : '🎯 Click to preview Store Copy placement'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* INFORMATIONAL CLEAN DUPLICATE CARD (EXPLAINS MODERN WORKFLOW) */}
            <div className="p-4 rounded-2xl border-2 border-emerald-500/30 bg-slate-900/90 flex flex-col justify-between space-y-2 min-h-[170px] shadow-lg">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-xs text-emerald-300 flex items-center gap-1.5 font-mono">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{isFa ? 'برگه کپی نسخه (Form PB 82 Duplicate)' : 'Prescription Duplicate (Form PB 82)'}</span>
                </span>
                <span className="bg-emerald-900/60 text-emerald-200 px-2 py-0.5 rounded text-[9px] font-mono border border-emerald-700">
                  {isFa ? 'نسخه تمیز بیمار' : 'Clean Patient Copy'}
                </span>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] space-y-1 font-sans">
                <div className="flex justify-between font-bold text-slate-300 border-b border-slate-800 pb-0.5">
                  <span>PATIENT COPY (DUPLICATE)</span>
                  <span className="text-emerald-400 font-mono">ONLINE CLAIMING</span>
                </div>
                <p className="text-[10px] text-slate-300">{scenario.patientName} (Medicare: {scenario.medicareNumber})</p>
                <p className="text-[9px] text-teal-300 leading-relaxed font-sans mt-1">
                  {isFa
                    ? '✨ در سیستم‌های امروزی آنلاین، هیچ برچسبی روی گوشه کپی نسخه چسبانده نمی‌شود. این برگه تمیز مانده و با منگنه به فرم زرد تکرار (Repeat Form PB 24) وصل و تحویل بیمار می‌گردد.'
                    : '✨ In modern Online Claiming, no stickers are placed on the duplicate copy. It remains clean and is stapled with the yellow repeat form (PB 24) to hand to the patient.'}
                </p>
              </div>

              <div className="p-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-[9px] text-emerald-300 font-mono text-center flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isFa ? 'روال مدرن: بدون برچسب روی گوشه نسخه' : 'Modern Standard: No sticker on duplicate corner'}</span>
              </div>
            </div>

            {/* TARGET 3: ODT TAKEAWAY BOTTLE (RENDERED IN ODT MODE) */}
            {isOdtMode && (
              <div
                onClick={() => handlePlaceSticker('odtTakeawayBottle')}
                className={`p-4 rounded-2xl border-2 transition relative flex flex-col justify-between space-y-3 min-h-[170px] shadow-lg ${
                  placements.odtTakeaway
                    ? 'bg-slate-900/90 border-emerald-500/80'
                    : selectedSticker === 'odtTakeaway'
                    ? 'bg-rose-950/80 border-rose-400 ring-2 ring-rose-400/50 animate-pulse cursor-pointer'
                    : 'bg-slate-900 border-slate-700 hover:border-slate-500'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-xs text-white flex items-center gap-1.5 font-mono">
                    <Pill className="w-4 h-4 text-rose-400" />
                    <span>{isFa ? 'هدف ۳: بطری دوز خانگی ODT Takeaway' : 'Target 3: ODT Takeaway Bottle / Pack'}</span>
                  </span>
                  <span className="text-[10px] text-rose-300 font-mono">NSW Health ODT Bottle</span>
                </div>

                {/* ODT Bottle Visual */}
                <div className="bg-rose-950/60 p-2.5 rounded-lg border border-rose-800 text-[10px] space-y-1.5 font-mono">
                  <div className="flex justify-between items-center text-amber-300 font-bold border-b border-rose-800 pb-1">
                    <span>METHADONE TAKEAWAY BOTTLE</span>
                    <span className="text-[9px] bg-rose-900 px-1 text-white rounded">S8 NARCOTIC</span>
                  </div>

                  {/* Placement Zone */}
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(event) => {
                      event.stopPropagation();
                      setPreviewTarget('odtTakeawayBottle');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        event.stopPropagation();
                        setPreviewTarget('odtTakeawayBottle');
                      }
                    }}
                    className={`border-2 border-dashed p-2.5 rounded-lg text-center transition cursor-pointer ${
                      placements.odtTakeaway
                        ? 'bg-emerald-950 text-emerald-200 border-emerald-500'
                        : 'border-rose-500 bg-rose-900/40 text-rose-200'
                    }`}
                  >
                    {placements.odtTakeaway ? (
                      <span className="font-bold text-[10px] block">✅ {isFa ? 'برچسب دوز خانگی ODT روی بطری چسبانده شد' : 'ODT Takeaway Label Affixed'}</span>
                    ) : (
                      <span className="font-bold text-[10px] block">
                        {isFa ? '🎯 برای مشاهده محل الصاق برچسب ODT کلیک کنید' : '🎯 Click to preview ODT Takeaway placement'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>

          {/* REAL-TIME FEEDBACK & CLINICAL AUDIT TIP BANNER */}
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
                  {feedback.type === 'success' ? 'Validation Passed' : 'Rule Violation'}
                </span>
              </div>

              <p className="text-xs font-medium leading-relaxed">{feedback.message}</p>

              {feedback.ruleTip && (
                <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 text-[11px] leading-relaxed space-y-1 font-sans">
                  <span className="font-bold text-amber-300 flex items-center gap-1 font-mono">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFa ? 'نکته آموزشی و الزامات قانونی PBA و بهداشت NSW:' : 'Clinical & Legal PBA / NSW Health Tip:'}</span>
                  </span>
                  <p className="text-slate-200">{feedback.ruleTip}</p>
                </div>
              )}
            </div>
          )}

        </div>
      </div>

      {previewTarget && previewSticker && previewRule && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          role="presentation"
          onClick={() => setPreviewTarget(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="placement-preview-title"
            className={`app-card border rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-5 space-y-4 shadow-2xl bg-slate-950 text-white ${
              previewTarget === 'medicationBox'
                ? 'border-teal-500/50'
                : previewTarget === 'scriptBackStoreCopy'
                ? 'border-sky-500/50'
                : 'border-rose-500/50'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className={`flex items-center justify-between border-b pb-3 ${
              previewTarget === 'medicationBox'
                ? 'border-teal-500/30'
                : previewTarget === 'scriptBackStoreCopy'
                ? 'border-sky-500/30'
                : 'border-rose-500/30'
            }`}>
              <div className={`flex items-center gap-2 font-bold text-sm ${
                previewTarget === 'medicationBox'
                  ? 'text-teal-300'
                  : previewTarget === 'scriptBackStoreCopy'
                  ? 'text-sky-300'
                  : 'text-rose-300'
              }`}>
                <Maximize2 className={`w-5 h-5 ${
                  previewTarget === 'medicationBox'
                    ? 'text-teal-400'
                    : previewTarget === 'scriptBackStoreCopy'
                    ? 'text-sky-400'
                    : 'text-rose-400'
                }`} />
                <span id="placement-preview-title">
                  {isFa ? 'نمایش بزرگ محل الصاق برچسب' : 'Enlarged Label Placement Preview'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="text-slate-400 hover:text-white text-lg leading-none"
                aria-label={isFa ? 'بستن' : 'Close'}
              >
                ✕
              </button>
            </div>

            <div className="rounded-2xl bg-black/30 border border-slate-800 p-4">
              {renderTargetPreview(previewTarget, previewSticker)}
            </div>

            <div className={`rounded-xl p-3 text-xs leading-relaxed ${
              previewTarget === 'medicationBox'
                ? 'bg-teal-950/40 border border-teal-500/30'
                : previewTarget === 'scriptBackStoreCopy'
                ? 'bg-sky-950/30 border border-sky-500/30'
                : 'bg-rose-950/30 border border-rose-500/30'
            }`}>
              <p className={`font-bold mb-1 ${
                previewTarget === 'medicationBox'
                  ? 'text-teal-300'
                  : previewTarget === 'scriptBackStoreCopy'
                  ? 'text-sky-300'
                  : 'text-rose-300'
              }`}>
                {isFa ? 'چه چیزی اینجا قرار می‌گیرد و چرا؟' : 'What goes here and why'}
              </p>
              <p className="text-slate-200">{isFa ? previewRule.fa : previewRule.en}</p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2">
              <button
                type="button"
                onClick={() => setPreviewTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold transition"
              >
                {isFa ? 'بستن' : 'Close'}
              </button>
              <button
                type="button"
                disabled={previewIsPlaced}
                onClick={() => {
                  handlePlaceSticker(previewTarget, previewSticker);
                  setPreviewTarget(null);
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                  previewIsPlaced
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40 cursor-not-allowed'
                    : 'bg-teal-600 hover:bg-teal-500 text-white border border-teal-400 cursor-pointer'
                }`}
              >
                {previewIsPlaced
                  ? (isFa ? 'قبلاً الصاق شده است' : 'Already Affixed')
                  : (isFa ? 'تایید و الصاق برچسب' : 'Confirm & Affix Label')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
