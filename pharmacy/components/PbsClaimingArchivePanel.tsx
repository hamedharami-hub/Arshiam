'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Archive,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  FileText,
  FolderArchive,
  Layers,
  Sparkles,
  ShoppingBag,
  Info,
  Lock,
  Printer,
  Check,
  Building2,
  Send,
  Zap,
  BarChart3,
  Award,
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

interface PbsClaimingArchivePanelProps {
  language: Language;
  scenario?: ScriptScenarioData;
  isGenericSubstituted?: boolean;
  onPosReleased?: () => void;
}

interface ScriptClaimItem {
  id: string;
  patientName: string;
  pbsCode: string;
  category: 'General' | 'Concession' | 'SafetyNet' | 'RPBS';
  coPayment: number;
  dispensedDate: string;
  status: 'Pending' | 'Batched' | 'Archived';
  scriptType: string;
}

interface ShredLogItem {
  id: string;
  documentTitle: string;
  piiType: string;
  timestamp: string;
  status: 'Shredded';
}

export const PbsClaimingArchivePanel: React.FC<PbsClaimingArchivePanelProps> = ({
  language,
  scenario = {
    id: 'script-1',
    type: 'Paper',
    patientName: 'Sarah Jenkins',
    patientDob: '12/05/1984',
    patientAddress: '14 Station St, Chatswood NSW 2067',
    medicareNumber: '2938 10293 1',
    prescriberName: 'Dr. Michael Chen',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Amoxicillin 500mg capsules',
    pbsCode: '1234B',
    aFlagGenericSubstitute: 'Amoxicillin Sandoz 500mg capsules (A-Flag Substitute)',
    schedule: 'S4',
    scriptDate: '10/08/2026',
    quantity: 20,
    repeats: 1,
    directions: 'Take ONE capsule THREE times daily with meals until finished.',
  },
  isGenericSubstituted = false,
  onPosReleased,
}) => {
  const isFa = language === 'fa';

  // Selected PBS Claim Box Filter
  const [activeBinCategory, setActiveBinCategory] = useState<'General' | 'Concession' | 'SafetyNet' | 'RPBS'>('General');

  // Claiming Batching State
  const [claimBatchNumber, setClaimBatchNumber] = useState<string>('PBS-2026-AUG-042');
  const [isBatchSubmitted, setIsBatchSubmitted] = useState<boolean>(false);

  // Claim Script Pool
  const [claimPool, setClaimPool] = useState<ScriptClaimItem[]>([
    {
      id: 'claim-1',
      patientName: 'Sarah Jenkins',
      pbsCode: scenario.pbsCode || '1234B',
      category: 'General',
      coPayment: 31.60,
      dispensedDate: '13/08/2026',
      status: 'Pending',
      scriptType: scenario.type || 'Paper',
    },
    {
      id: 'claim-2',
      patientName: 'Robert Vance',
      pbsCode: '3120K',
      category: 'Concession',
      coPayment: 7.70,
      dispensedDate: '13/08/2026',
      status: 'Pending',
      scriptType: 'eScript',
    },
    {
      id: 'claim-3',
      patientName: 'Elena Rostova',
      pbsCode: '8210P',
      category: 'SafetyNet',
      coPayment: 0.00,
      dispensedDate: '12/08/2026',
      status: 'Batched',
      scriptType: 'Paper',
    },
    {
      id: 'claim-4',
      patientName: 'Arthur Pendelton (DVA)',
      pbsCode: '5201M',
      category: 'RPBS',
      coPayment: 7.70,
      dispensedDate: '12/08/2026',
      status: 'Batched',
      scriptType: 'Paper',
    },
  ]);

  // Confidential Shredding Bin Simulation State
  const [shredInputDoc, setShredInputDoc] = useState<string>('');
  const [shredPiiType, setShredPiiType] = useState<string>('Misprinted Repeat Form / Label');
  const [shredLogs, setShredLogs] = useState<ShredLogItem[]>([
    {
      id: 'shred-1',
      documentTitle: 'Misprinted Patient Repeat Form - John Doe (DOB 04/02/1975)',
      piiType: 'Medicare No + Address PII',
      timestamp: '13/08/2026 08:45 AM',
      status: 'Shredded',
    },
  ]);
  const [isShreddingActive, setIsShreddingActive] = useState<boolean>(false);

  // Final 5-Point Dispensing Audit Checklist State
  const [checklist, setChecklist] = useState({
    patientAndDrugMatch: true,
    labelPlacementVerified: true,
    repeatHandlingVerified: true,
    s8OdtComplianceVerified: scenario.schedule === 'S8' ? true : true,
    coPayAndSafetyNetUpdated: true,
  });

  const [isPosReleased, setIsPosReleased] = useState<boolean>(false);
  const [posReceiptToken, setPosReceiptToken] = useState<string | null>(null);

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    title: string;
    message: string;
    ruleTip?: string;
  } | null>(null);

  // Handle Add To Claim Batch
  const handleBatchAllPendingClaims = () => {
    setClaimPool((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'Batched',
      }))
    );
    setIsBatchSubmitted(true);

    setFeedback({
      type: 'success',
      title: isFa ? 'دسته‌بندی ماهانه PBS با موفقیت ایجاد شد 📦' : 'PBS Monthly Claim Batch Generated 📦',
      message: isFa
        ? `بسته ادعای مالی شماره ${claimBatchNumber} جهت ارسال الکترونیکی به Medicare / Services Australia بسته‌بندی و کدگذاری شد.`
        : `Claim Batch ${claimBatchNumber} generated and serialized for monthly Medicare Australia submission.`,
      ruleTip: isFa
        ? 'دستورالعمل PBS Australia: نسخه‌های کاغذی بایستی ماهانه بر اساس کلاس بیمار (General, Concession, Safety Net, RPBS) دسته‌بندی و در جعبه‌های استاندارد ارسال گردند.'
        : 'PBS Claiming Rule: Physical paper duplicates must be sorted into dedicated entitlement boxes and batched monthly.',
    });
  };

  // Handle Confidential Document Shredding
  const handlePerformShredding = () => {
    if (!shredInputDoc.trim()) {
      setFeedback({
        type: 'warning',
        title: isFa ? 'عنوان سند امحا را وارد کنید! ⚠️' : 'Document Title Required! ⚠️',
        message: isFa
          ? 'جهت ثبت در دفتر کل امحای محرمانه (Confidential Shredding Audit Log)، نام سند یا لیبل اشتباه را وارد کنید.'
          : 'Please describe the misprinted form or label containing PII to proceed with shredding.',
      });
      return;
    }

    setIsShreddingActive(true);

    setTimeout(() => {
      const newShredLog: ShredLogItem = {
        id: `shred-${Date.now()}`,
        documentTitle: shredInputDoc,
        piiType: shredPiiType,
        timestamp: '13/08/2026 09:45 AM',
        status: 'Shredded',
      };

      setShredLogs([newShredLog, ...shredLogs]);
      setShredInputDoc('');
      setIsShreddingActive(false);

      setFeedback({
        type: 'success',
        title: isFa ? 'سند محرمانه با موفقیت امحا و پودر شد 🔒' : 'Confidential Document Shredded & PII Scrubbed 🔒',
        message: isFa
          ? 'برچسب/فرم حاوی اطلاعات شناسایی بیمار (PII) طبق قانون حریم خصوصی استرالیا (Privacy Act 1988) در سطل امحای قفل‌شده خرد گردید.'
          : 'Document containing Patient Identifiable Information (PII) securely destroyed per Australian Privacy Act 1988 guidelines.',
        ruleTip: isFa
          ? 'قانون Privacy Act 1988 استرالیا: کلیه مدارک، برچسب‌های مرجوعی و تکراری حاوی نام، آدرس و شماره Medicare بیمار باید در سطل‌های ایمن امحا شوند.'
          : 'Privacy Act 1988: All discarded labels & forms with PII must be shredded in lockable confidential destruction bins.',
      });
    }, 1200);
  };

  // Handle Checkbox Toggle in 5-Point Audit Checklist
  const handleToggleChecklist = (key: keyof typeof checklist) => {
    setChecklist((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Check if 100% Checklist Verified
  const isAllChecklistVerified = Object.values(checklist).every(Boolean);

  // Handle Final POS Release
  const handleReleaseToPos = () => {
    if (!isAllChecklistVerified) {
      setFeedback({
        type: 'error',
        title: isFa ? 'چک‌لیست ۵ گانه کامل نشده است! ❌' : '5-Point Audit Checklist Incomplete! ❌',
        message: isFa
          ? 'خطای بالینی: قبل از آزادسازی دارو به صندوق فروش (POS Counter)، کلیه ۵ مورد کنترل کیفیت داروساز باید تایید شده باشند.'
          : 'Clinical Security Alert: All 5 dispensing verification points must be checked before releasing order to POS!',
      });
      return;
    }

    const receipt = `POS-RECEIPT-${Math.floor(100000 + Math.random() * 900000)}`;
    setPosReceiptToken(receipt);
    setIsPosReleased(true);

    setFeedback({
      type: 'success',
      title: isFa ? 'دارو با موفقیت به صندوق فروش (POS Counter) تحویل داده شد 🎉' : 'Order Released to POS Counter Successfully 🎉',
      message: isFa
        ? `رسید تحویل صندوق به شماره ${receipt} صادر گردید. کلیه فرآیندهای نسخه‌پیچی، بایگانی PBS، امحای PII و ثبت S8 تایید شدند.`
        : `POS Dispatch Token ${receipt} issued. Dispense audit complete, PBS claim assigned, and safe hand-over enabled.`,
      ruleTip: isFa
        ? 'استاندارد داروسازی استرالیا: تحویل نهایی دارو مستلزم احراز صلاحیت ۵ مرحله‌ای مهارتی داروساز است.'
        : 'PSA Standards: Final POS release represents complete clinical, legal, and PBS compliance sign-off by the pharmacist.',
    });

    if (onPosReleased) {
      onPosReleased();
    }
  };

  return (
    <div className="app-card border-2 border-indigo-500/50 rounded-2xl p-4 sm:p-6 bg-slate-950 text-white space-y-6 shadow-2xl">
      {/* HEADER BAR: TITLE & MODULE 3 COMPLETION BADGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-indigo-500/30 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <Archive className="w-5 h-5 text-indigo-200" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-mono text-[10px] font-bold border border-indigo-500/30 uppercase">
                SUB-PHASE 5.9 (FINAL)
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isFa
                  ? 'بایگانی ادعای PBS، سطل امحای محرمانه PII و چک‌لیست ۵ گانه تحویل به POS'
                  : 'PBS Claiming Bins, PII Confidential Shredding & 5-Point POS Audit Release'}
              </h3>
            </div>
          </div>
        </div>

        {/* Completion Status Badge */}
        <div className="flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 ${
            isPosReleased
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-amber-500/20 text-amber-300 border-amber-500/50'
          }`}>
            <Award className="w-4 h-4 text-amber-400" />
            <span>
              {isFa
                ? (isPosReleased ? 'تحویل داده شد به POS ✅' : 'در انتظار تایید نهایی POS')
                : (isPosReleased ? 'Released to POS Counter ✅' : 'Pending POS Verification')}
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK BANNER */}
      {feedback && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs shadow-lg transition ${
          feedback.type === 'error'
            ? 'bg-rose-950/90 border-rose-500 text-rose-100'
            : feedback.type === 'warning'
            ? 'bg-amber-950/90 border-amber-500 text-amber-100'
            : 'bg-slate-900 border-indigo-500/50 text-indigo-100'
        }`}>
          {feedback.type === 'error' ? (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          ) : feedback.type === 'warning' ? (
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <div className="space-y-1">
            <p className="font-bold text-sm">{feedback.title}</p>
            <p className="leading-relaxed">{feedback.message}</p>
            {feedback.ruleTip && (
              <p className="text-[11px] font-mono text-indigo-300 border-t border-indigo-500/20 pt-1.5 mt-1">
                📌 {feedback.ruleTip}
              </p>
            )}
          </div>
        </div>
      )}

      {/* SECTION 1: PBS MONTHLY CLAIMING ARCHIVE BINS & BATCHING TOOL */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-500/30 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <FolderArchive className="w-5 h-5 text-indigo-400" />
            <span className="font-bold text-sm text-indigo-300 font-mono">
              {isFa
                ? '1. جعبه‌های بایگانی ادعای ماهانه PBS (PBS Monthly Claiming Archive Bins):'
                : '1. PBS Monthly Claiming Archive Bins & Entitlement Sorting:'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/30">
              Batch ID: {claimBatchNumber}
            </span>
            <button
              onClick={handleBatchAllPendingClaims}
              className="px-3 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow"
            >
              <Box className="w-3.5 h-3.5 text-amber-300" />
              <span>{isFa ? 'دسته‌بندی و بسته‌بندی ادعا' : 'Batch Claims'}</span>
            </button>
          </div>
        </div>

        {/* 4 Categorized PBS Entitlement Filing Boxes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

          {/* BOX 1: GENERAL PATIENTS (RED/WHITE) */}
          <div
            onClick={() => setActiveBinCategory('General')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition relative overflow-hidden ${
              activeBinCategory === 'General'
                ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-950/50 scale-[1.02]'
                : 'bg-slate-950 border-rose-900/60 hover:border-rose-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-rose-500/30 pb-2 mb-2">
              <span className="font-bold text-xs text-rose-300 font-mono flex items-center gap-1.5 uppercase">
                <Box className="w-4 h-4 text-rose-400" />
                {isFa ? 'بیماران عمومی (General)' : 'General Box'}
              </span>
              <span className="px-2 py-0.5 rounded bg-rose-600 text-white text-[10px] font-bold">
                RED / WHITE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isFa ? 'فرانشیز استاندارد (تا $31.60)' : 'Standard Co-Payment ($31.60 max)'}
            </p>
            <div className="mt-3 flex justify-between items-end font-mono">
              <span className="text-xs text-slate-400">{isFa ? 'تعداد نسخ:' : 'Scripts:'}</span>
              <span className="text-lg font-extrabold text-rose-300">
                {claimPool.filter((c) => c.category === 'General').length}
              </span>
            </div>
          </div>

          {/* BOX 2: CONCESSION / PENSIONER (BLUE/WHITE) */}
          <div
            onClick={() => setActiveBinCategory('Concession')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition relative overflow-hidden ${
              activeBinCategory === 'Concession'
                ? 'bg-sky-950/60 border-sky-500 shadow-lg shadow-sky-950/50 scale-[1.02]'
                : 'bg-slate-950 border-sky-900/60 hover:border-sky-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-sky-500/30 pb-2 mb-2">
              <span className="font-bold text-xs text-sky-300 font-mono flex items-center gap-1.5 uppercase">
                <Box className="w-4 h-4 text-sky-400" />
                {isFa ? 'بیماران تخفیف‌دار (Concession)' : 'Concession Box'}
              </span>
              <span className="px-2 py-0.5 rounded bg-sky-600 text-white text-[10px] font-bold">
                BLUE / WHITE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isFa ? 'دارندگان کارت بازنشستگی/مستمری ($7.70)' : 'Pensioner & Concession ($7.70 rate)'}
            </p>
            <div className="mt-3 flex justify-between items-end font-mono">
              <span className="text-xs text-slate-400">{isFa ? 'تعداد نسخ:' : 'Scripts:'}</span>
              <span className="text-lg font-extrabold text-sky-300">
                {claimPool.filter((c) => c.category === 'Concession').length}
              </span>
            </div>
          </div>

          {/* BOX 3: ENTITLEMENT SAFETY NET (GREEN/WHITE) */}
          <div
            onClick={() => setActiveBinCategory('SafetyNet')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition relative overflow-hidden ${
              activeBinCategory === 'SafetyNet'
                ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-950/50 scale-[1.02]'
                : 'bg-slate-950 border-emerald-900/60 hover:border-emerald-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2 mb-2">
              <span className="font-bold text-xs text-emerald-300 font-mono flex items-center gap-1.5 uppercase">
                <Box className="w-4 h-4 text-emerald-400" />
                {isFa ? 'شبکه ایمنی (Safety Net)' : 'Safety Net Box'}
              </span>
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                GREEN / WHITE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isFa ? 'رسیدن به سقف سقف سالانه (رایگان $0.00)' : 'Reached Safety Net Cap ($0.00 rate)'}
            </p>
            <div className="mt-3 flex justify-between items-end font-mono">
              <span className="text-xs text-slate-400">{isFa ? 'تعداد نسخ:' : 'Scripts:'}</span>
              <span className="text-lg font-extrabold text-emerald-300">
                {claimPool.filter((c) => c.category === 'SafetyNet').length}
              </span>
            </div>
          </div>

          {/* BOX 4: RPBS REPATRIATION / VETERANS (ORANGE/WHITE) */}
          <div
            onClick={() => setActiveBinCategory('RPBS')}
            className={`cursor-pointer p-4 rounded-2xl border-2 transition relative overflow-hidden ${
              activeBinCategory === 'RPBS'
                ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-950/50 scale-[1.02]'
                : 'bg-slate-950 border-amber-900/60 hover:border-amber-700'
            }`}
          >
            <div className="flex items-center justify-between border-b border-amber-500/30 pb-2 mb-2">
              <span className="font-bold text-xs text-amber-300 font-mono flex items-center gap-1.5 uppercase">
                <Box className="w-4 h-4 text-amber-400" />
                {isFa ? 'ایثارگران و دامپزشکان (RPBS DVA)' : 'RPBS Box'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-600 text-white text-[10px] font-bold">
                ORANGE / WHITE
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              {isFa ? 'کارت طلایی و سفید DVA ($7.70 rate)' : 'DVA Gold/White Card Holders'}
            </p>
            <div className="mt-3 flex justify-between items-end font-mono">
              <span className="text-xs text-slate-400">{isFa ? 'تعداد نسخ:' : 'Scripts:'}</span>
              <span className="text-lg font-extrabold text-amber-300">
                {claimPool.filter((c) => c.category === 'RPBS').length}
              </span>
            </div>
          </div>

        </div>

        {/* Claim Items Table */}
        <div className="overflow-x-auto bg-slate-950 rounded-xl border border-slate-800 p-3">
          <table className="w-full text-xs font-mono text-left rtl:text-right border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-indigo-300 text-[11px]">
                <th className="p-2">{isFa ? 'نام بیمار' : 'Patient Name'}</th>
                <th className="p-2">{isFa ? 'کد PBS' : 'PBS Item'}</th>
                <th className="p-2">{isFa ? 'دسته‌بندی' : 'Entitlement Bin'}</th>
                <th className="p-2">{isFa ? 'فرانشیز' : 'Co-Payment'}</th>
                <th className="p-2">{isFa ? 'تاریخ تحویل' : 'Dispensed Date'}</th>
                <th className="p-2">{isFa ? 'وضعیت ادعا' : 'Claim Status'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {claimPool
                .filter((item) => item.category === activeBinCategory)
                .map((claim) => (
                  <tr key={claim.id} className="hover:bg-slate-900 transition">
                    <td className="p-2 font-bold text-white">{claim.patientName}</td>
                    <td className="p-2 text-amber-300">{claim.pbsCode}</td>
                    <td className="p-2">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-indigo-300 border border-indigo-500/30 text-[10px]">
                        {claim.category}
                      </span>
                    </td>
                    <td className="p-2 font-bold text-emerald-400">${claim.coPayment.toFixed(2)}</td>
                    <td className="p-2 text-slate-400">{claim.dispensedDate}</td>
                    <td className="p-2 font-bold">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        claim.status === 'Batched' ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30' : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                      }`}>
                        {claim.status}
                      </span>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: CONFIDENTIAL DOCUMENT SHREDDING BIN SIMULATION (PRIVACY ACT 1988) */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-rose-500/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-500/30 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-400" />
            <span className="font-bold text-sm text-rose-300 font-mono">
              {isFa
                ? '2. سطل امحای اسناد محرمانه PII (Confidential Waste & Shredding Engine - Privacy Act 1988):'
                : '2. Confidential PII Shredding Bin Simulation (Privacy Act 1988):'}
            </span>
          </div>
          <span className="text-xs font-mono text-rose-300 bg-rose-950/80 px-2.5 py-0.5 rounded border border-rose-500/30">
            🔒 Locked Destruction Container #SHRED-09
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">

          {/* Shredding Form Controls (6 Cols) */}
          <div className="md:col-span-6 space-y-3 font-mono text-xs">
            <div>
              <label className="text-slate-400 text-[11px] block mb-1 font-bold">
                {isFa ? 'عنوان سند یا برچسب اشتباه حاوی PII:' : 'Misprinted Document / Label Description:'}
              </label>
              <input
                type="text"
                value={shredInputDoc}
                onChange={(e) => setShredInputDoc(e.target.value)}
                placeholder={isFa ? 'مثال: لیبل اشتباه Amoxicillin - Sarah Jenkins (Medicare 2938...)' : 'e.g. Misprinted Repeat PB24 - Sarah Jenkins'}
                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-white font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            <div>
              <label className="text-slate-400 text-[11px] block mb-1 font-bold">
                {isFa ? 'نوع اطلاعات خصوصی بیمار (PII Category):' : 'Patient Identifiable Information (PII) Type:'}
              </label>
              <select
                value={shredPiiType}
                onChange={(e) => setShredPiiType(e.target.value)}
                className="w-full bg-slate-950 border border-rose-500/40 rounded-xl px-3 py-2 text-rose-300 font-bold font-mono text-xs focus:outline-none focus:ring-2 focus:ring-rose-400"
              >
                <option value="Misprinted Repeat Form / Label">Misprinted Repeat Form / PB24 Label</option>
                <option value="Medicare Number & Patient Address">Medicare Number & Patient Address PII</option>
                <option value="S8 Internal Trial Log / Dosing Script">S8 Internal Trial Log / Dosing Script Copy</option>
                <option value="Discarded eScript Token Printout">Discarded eScript Token Printout</option>
              </select>
            </div>

            <button
              onClick={handlePerformShredding}
              disabled={isShreddingActive}
              className="w-full py-2.5 px-4 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-rose-700/30 text-xs"
            >
              <Trash2 className="w-4 h-4 text-amber-300" />
              <span>
                {isShreddingActive
                  ? (isFa ? 'در حال خردکردن و امحای سند...' : 'Shredding & Scrubbing PII...')
                  : (isFa ? 'انتقال به سطل امحای قفل‌شده و پودر کردن' : 'Destroy Document in Confidential Bin')}
              </span>
            </button>
          </div>

          {/* Shredding Audit History Log (6 Cols) */}
          <div className="md:col-span-6 bg-slate-950 p-3.5 rounded-2xl border border-rose-500/40 space-y-2">
            <span className="text-xs font-bold text-rose-300 font-mono flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              {isFa ? 'دفترچه ثبت امحای اسناد محرمانه (Shredding Audit Trail):' : 'Shredding Audit Trail & Destruction Records:'}
            </span>

            <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
              {shredLogs.map((log) => (
                <div key={log.id} className="bg-slate-900 p-2 rounded-xl border border-slate-800 text-[11px] font-mono space-y-0.5">
                  <div className="flex justify-between text-slate-300 font-bold">
                    <span className="text-rose-200 line-through truncate max-w-[200px]">{log.documentTitle}</span>
                    <span className="text-emerald-400 text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-500/30">
                      SHREDDED ✓
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>PII: {log.piiType}</span>
                    <span>{log.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* SECTION 3: FINAL 5-POINT DISPENSING AUDIT CHECKLIST & POS RELEASE MODAL */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/50 space-y-4 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-emerald-500/30 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm text-emerald-300 font-mono">
              {isFa
                ? '3. چک‌لیست ۵ گانه کنترل کیفیت داروساز و تحویل به صندوق (5-Point Audit Checklist & POS Release):'
                : '3. Final 5-Point Dispensing Audit Checklist & POS Release:'}
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-300 bg-emerald-950/80 px-2.5 py-0.5 rounded border border-emerald-500/30">
            {isAllChecklistVerified ? '100% VERIFIED ✓' : 'ACTION REQUIRED'}
          </span>
        </div>

        {/* 5-Point Checklist Items */}
        <div className="space-y-2.5 font-mono text-xs">

          {/* CHECKPOINT 1 */}
          <div
            onClick={() => handleToggleChecklist('patientAndDrugMatch')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              checklist.patientAndDrugMatch ? 'bg-emerald-950/40 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                checklist.patientAndDrugMatch ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {checklist.patientAndDrugMatch ? '✓' : '1'}
              </div>
              <span className="font-bold">
                {isFa
                  ? '1. مطابقت هویت بیمار و مشخصات دارو (Patient Identity & Drug Match Verified)'
                  : '1. Patient Identity & Drug Match Verified (Correct item, strength & form)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">{scenario.patientName} - {scenario.prescribedDrug}</span>
          </div>

          {/* CHECKPOINT 2 */}
          <div
            onClick={() => handleToggleChecklist('labelPlacementVerified')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              checklist.labelPlacementVerified ? 'bg-emerald-950/40 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                checklist.labelPlacementVerified ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {checklist.labelPlacementVerified ? '✓' : '2'}
              </div>
              <span className="font-bold">
                {isFa
                  ? '2. صحت چسباندن لیبل‌ها (Label Placement Verified - Main Label + Audit Sticker)'
                  : '2. Label Placement Verified (Main label on box, PBS Audit sticker on script)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Position & Barcode Clear</span>
          </div>

          {/* CHECKPOINT 3 */}
          <div
            onClick={() => handleToggleChecklist('repeatHandlingVerified')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              checklist.repeatHandlingVerified ? 'bg-emerald-950/40 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                checklist.repeatHandlingVerified ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {checklist.repeatHandlingVerified ? '✓' : '3'}
              </div>
              <span className="font-bold">
                {isFa
                  ? '3. صحت صدور تکرار نسخه (Repeat Handling Verified - PB24 Stapled / Token Dispatched)'
                  : '3. Repeat Handling Verified (PB24 stapled to original OR eScript Token dispatched)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Repeats: {scenario.repeats} Authorized</span>
          </div>

          {/* CHECKPOINT 4 */}
          <div
            onClick={() => handleToggleChecklist('s8OdtComplianceVerified')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              checklist.s8OdtComplianceVerified ? 'bg-emerald-950/40 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                checklist.s8OdtComplianceVerified ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {checklist.s8OdtComplianceVerified ? '✓' : '4'}
              </div>
              <span className="font-bold">
                {isFa
                  ? '4. رعایت قوانین S8 و ODT (S8 / ODT Compliance - Dosing Signed, Strikethrough & S8 Safe)'
                  : '4. S8 / ODT Compliance Verified (Dosing log signed, strikethrough applied, S8 Safe filed)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Schedule: {scenario.schedule} Legal Audit</span>
          </div>

          {/* CHECKPOINT 5 */}
          <div
            onClick={() => handleToggleChecklist('coPayAndSafetyNetUpdated')}
            className={`p-3 rounded-xl border transition cursor-pointer flex items-center justify-between ${
              checklist.coPayAndSafetyNetUpdated ? 'bg-emerald-950/40 border-emerald-500/60 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div className={`w-5 h-5 rounded flex items-center justify-center font-bold text-xs ${
                checklist.coPayAndSafetyNetUpdated ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-500'
              }`}>
                {checklist.coPayAndSafetyNetUpdated ? '✓' : '5'}
              </div>
              <span className="font-bold">
                {isFa
                  ? '5. به‌روزرسانی کارت شبکه ایمنی و فرانشیز (Co-Payment & Safety Net Counter Updated)'
                  : '5. Co-Payment & Safety Net Counter Updated (PBS Safety Net Card Recorded)'}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Co-Pay: $31.60</span>
          </div>

        </div>

        {/* RELEASE TO POS ACTION BUTTON & RECEIPT CARD */}
        <div className="pt-2">
          {!isPosReleased ? (
            <button
              onClick={handleReleaseToPos}
              disabled={!isAllChecklistVerified}
              className={`w-full py-3 px-6 rounded-xl font-extrabold text-sm transition flex items-center justify-center gap-2 shadow-xl ${
                isAllChecklistVerified
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <ShoppingBag className="w-5 h-5 text-amber-300" />
              <span>
                {isFa
                  ? 'تحویل نسخه به صندوق فروش (Release to POS Counter)'
                  : 'Release Order to POS Counter'}
              </span>
            </button>
          ) : (
            <div className="bg-emerald-950/90 border-2 border-emerald-500 p-4 rounded-xl text-center space-y-2 animate-fadeIn">
              <div className="flex items-center justify-center gap-2 text-emerald-300 font-bold text-base">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span>
                  {isFa ? 'دارو با موفقیت تحویل صندوق تحویل گردید (Released to POS)' : 'Order Successfully Released to POS Counter!'}
                </span>
              </div>
              <p className="text-xs font-mono text-slate-200">
                {isFa ? `شماره رسید صندوق POS Token:` : `POS Receipt Dispatch Token:`}{' '}
                <span className="font-extrabold text-amber-300 underline">{posReceiptToken}</span>
              </p>
              <p className="text-[11px] text-emerald-200">
                {isFa
                  ? 'کلیه فرآیندهای ماژول ۳ (Fred Dispense Plus Simulator) با بالاترین کیفیت بالینی به اتمام رسید.'
                  : 'Module 3 (Fred Dispense Plus) dispensing pipeline completed with 100% audit verification.'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
