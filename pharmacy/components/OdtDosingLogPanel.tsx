'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Language } from '@/types/pharmacy';
import {
  Lock,
  FileText,
  CheckCircle2,
  AlertTriangle,
  PenTool,
  ShieldCheck,
  Calendar,
  Clock,
  Printer,
  Ban,
  RotateCcw,
  Sparkles,
  Info,
  Pill,
  Check,
  ShieldAlert,
  Send,
  Layers,
  Database,
  Tag,
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

interface OdtDosingLogPanelProps {
  language: Language;
  scenario?: ScriptScenarioData;
  isGenericSubstituted?: boolean;
  onDosingComplete?: () => void;
}

interface DosingLogRow {
  id: string;
  date: string;
  time: string;
  prescribedDoseMg: number;
  administeredDoseMg: number;
  dosingType: 'Supervised' | 'Takeaway';
  consumptionDate?: string;
  patientSigned: boolean;
  pharmacistVerified: boolean;
  isStruckThrough: boolean;
}

export const OdtDosingLogPanel: React.FC<OdtDosingLogPanelProps> = ({
  language,
  scenario = {
    id: 'script-5',
    type: 'Paper',
    patientName: 'David Miller',
    patientDob: '14/08/1968',
    patientAddress: '42 Oxford St, Paddington NSW 2021',
    medicareNumber: '2983 10928 1',
    prescriberName: 'Dr. Sarah Jenkins',
    prescriberNumber: '2938471A',
    prescribedDrug: 'Methadone Oral Liquid 5mg/mL (NSW OTP)',
    pbsCode: '8210P',
    aFlagGenericSubstitute: 'Methadone 5mg/mL (A-Flag Substitute)',
    schedule: 'S8',
    scriptDate: '01/08/2026',
    quantity: 1,
    repeats: 0,
    directions: 'Supervised 60mg Mon-Fri, 2 Takeaway bottles Sat-Sun.',
  },
  isGenericSubstituted = false,
  onDosingComplete,
}) => {
  const isFa = language === 'fa';

  // Active Dosing Form Input State
  const [dosingType, setDosingType] = useState<'Supervised' | 'Takeaway'>('Supervised');
  const [administeredDose, setAdministeredDose] = useState<number>(60);
  const [takeawayConsumptionDate, setTakeawayConsumptionDate] = useState<string>('16/08/2026');
  const [patientSignatureData, setPatientSignatureData] = useState<boolean>(false);
  const [pharmacistVerified, setPharmacistVerified] = useState<boolean>(true);
  
  // Signature Canvas Drawing Ref
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Takeaway Bottle Label State
  const [isTakeawayLabelPrinted, setIsTakeawayLabelPrinted] = useState<boolean>(false);

  // Controlled Drug S8 Register State
  const [s8PreviousStock, setS8PreviousStock] = useState<number>(1420); // in mL
  const [s8RegisterUpdated, setS8RegisterUpdated] = useState<boolean>(false);
  const [isScriptFiledInS8Safe, setIsScriptFiledInS8Safe] = useState<boolean>(false);

  // Log Rows State
  const [dosingLogs, setDosingLogs] = useState<DosingLogRow[]>([
    {
      id: 'log-1',
      date: '11/08/2026',
      time: '09:15 AM',
      prescribedDoseMg: 60,
      administeredDoseMg: 60,
      dosingType: 'Supervised',
      patientSigned: true,
      pharmacistVerified: true,
      isStruckThrough: true,
    },
    {
      id: 'log-2',
      date: '12/08/2026',
      time: '09:20 AM',
      prescribedDoseMg: 60,
      administeredDoseMg: 60,
      dosingType: 'Supervised',
      patientSigned: true,
      pharmacistVerified: true,
      isStruckThrough: true,
    },
  ]);

  // Selected Row for Strikethrough Tool
  const [selectedLogRowId, setSelectedLogRowId] = useState<string | null>(null);

  // Feedback Banner
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error' | 'warning' | null;
    title: string;
    message: string;
    ruleTip?: string;
  }>({
    type: 'success',
    title: isFa ? 'سیستم مدیریت دوز روزانه ODT نیو ساوت ولز (NSW Health OTP)' : 'NSW Health ODT Daily Dosing System',
    message: isFa
      ? 'نسخه S8 فعال مربوط به برنامه درمان وابستگی به اپیوئیدها (ODT/OTP) آماده ثبت دوز روزانه و دوز خانگی (Takeaway) است.'
      : 'Active S8 Opioid Dependency Treatment (ODT) prescription loaded. Ready for daily supervised intake & takeaway logging.',
  });

  const displayedDrugName = isGenericSubstituted
    ? scenario.aFlagGenericSubstitute
    : scenario.prescribedDrug;

  // Handle Canvas Clear & Signature Capture
  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setPatientSignatureData(false);
  };

  // Canvas drawing handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    setPatientSignatureData(true);
    draw(e);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#0284c7'; // Sky blue signature ink

    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  // Auto-generate realistic sample signature on button click for convenience
  const handleQuickSign = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.beginPath();
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.moveTo(20, 25);
        ctx.bezierCurveTo(40, 5, 60, 45, 80, 20);
        ctx.bezierCurveTo(100, 35, 120, 10, 150, 25);
        ctx.stroke();
      }
    }
    setPatientSignatureData(true);
  };

  // Record New Daily Dosing Entry
  const handleAddDosingEntry = () => {
    if (!patientSignatureData) {
      setFeedback({
        type: 'error',
        title: isFa ? 'امضای بیمار الزامی است! ⚠️' : 'Patient Signature Required! ⚠️',
        message: isFa
          ? 'دستورالعمل بهداشت NSW: تحویل دوز ODT (چه تحت نظارت Supervised و چه خانگی Takeaway) مستلزم اخذ امضای دیجیتال/کتبی بیمار روی دفترچه ثبت دوز است.'
          : 'NSW Health Guidelines: Dosing requires verified patient signature before administration or takeaway release.',
      });
      return;
    }

    if (dosingType === 'Takeaway' && !isTakeawayLabelPrinted) {
      setFeedback({
        type: 'warning',
        title: isFa ? 'چاپ لیبل دوز خانگی S8 الزامی است! 🏷️' : 'Takeaway S8 Label Required! 🏷️',
        message: isFa
          ? 'خطای بالینی: برای تحویل دوز خانگی (Takeaway) باید ابتدا برچسب ایمنی حاوی تاریخ مصرف اختصاصی و هشدار قرمز رنگ "KEEP OUT OF REACH OF CHILDREN" چاپ و روی بطری چسبانده شود.'
          : 'Clinical Alert: You must print the S8 Takeaway label with consumption date and poison warning before releasing home doses!',
      });
      return;
    }

    const newLog: DosingLogRow = {
      id: `log-${Date.now()}`,
      date: '13/08/2026',
      time: '09:30 AM',
      prescribedDoseMg: 60,
      administeredDoseMg: administeredDose,
      dosingType,
      consumptionDate: dosingType === 'Takeaway' ? takeawayConsumptionDate : undefined,
      patientSigned: true,
      pharmacistVerified: true,
      isStruckThrough: false,
    };

    setDosingLogs([newLog, ...dosingLogs]);

    // Update S8 Register Log
    const volumeUsedMl = administeredDose; // 5mg/mL -> 60mg = 12mL or 60mL dependent on solution
    setS8PreviousStock((prev) => prev - volumeUsedMl);
    setS8RegisterUpdated(true);
    setIsScriptFiledInS8Safe(true);

    setFeedback({
      type: 'success',
      title: isFa ? 'ثبت دوز روزانه و به‌روزرسانی دفتر کل S8 با موفقیت انجام شد ✅' : 'Daily Dose Administered & S8 Register Updated ✅',
      message: isFa
        ? `دوز ${administeredDose}mg (${dosingType === 'Supervised' ? 'تحت نظارت مستقیم داروساز' : 'دوز خانگی Takeaway'}) ثبت گردید. موجودی دفتر ثبت داروهای تحت کنترل (S8 Register) به روز شد و نسخه در گاوصندوق S8 Safe بایگانی گردید.`
        : `Dose of ${administeredDose}mg (${dosingType}) successfully recorded. Controlled Drug Register balance adjusted and script locked in S8 Safe.`,
      ruleTip: isFa
        ? 'مقررات بهداشت نیو ساوت ولز (NSW OTP Rules): کلیه دوزهای مصرفی و باقی‌مانده دفترچه S8 باید متقابلاً با موجودی فیزیکی گاوصندوق مطابقت داشته باشند.'
        : 'NSW OTP Regulation: All administered & takeaway doses must immediately adjust the physical & digital S8 register balance.',
    });

    if (onDosingComplete) {
      onDosingComplete();
    }
  };

  // Double-Line Strikethrough Action Tool
  const handleApplyStrikethrough = (logId: string) => {
    setDosingLogs((prev) =>
      prev.map((row) =>
        row.id === logId ? { ...row, isStruckThrough: !row.isStruckThrough } : row
      )
    );

    setFeedback({
      type: 'success',
      title: isFa ? 'خط کشیدن دوتایی (Double-Line Strikethrough) اعمال شد 🖊️' : 'Double-Line Strikethrough Applied 🖊️',
      message: isFa
        ? 'خط کشیدن موازی دوتایی (Double-Line Strikethrough) طبق دستورالعمل بهداشت NSW روی ردیف دوز مصرف‌شده قرار گرفت تا از دریافت مجدد یا جعل جلوگیری شود.'
        : 'Two parallel blue lines have been struck through the completed dosing record per NSW Health OTP regulations to prevent duplicate dosing.',
      ruleTip: isFa
        ? 'استاندارد NSW Health OTP: داروساز موظف است بلافاصله پس از دریافت دوز، روی ردیف مربوطه خط دوتایی بکشد.'
        : 'NSW Health OTP Rule: Pharmacists must double-line strikethrough completed or skipped dosing rows immediately upon intake.',
    });
  };

  return (
    <div className="app-card border-2 border-rose-500/50 rounded-2xl p-4 sm:p-6 bg-slate-950 text-white space-y-6 shadow-2xl">
      {/* HEADER BAR: TITLE, STATUS & S8 REGISTER BADGE */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-rose-500/30 pb-4 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold text-lg shadow-md shrink-0">
            <Lock className="w-5 h-5 text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30 uppercase">
                SUB-PHASE 5.8
              </span>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {isFa
                  ? 'ثبت دوز روزانه ODT، ابزار خط کشیدن دوتایی (Strikethrough)، امضای بیمار و بایگانی S8 Safe'
                  : 'NSW ODT Daily Dosing Log, Strikethrough Tool, Signature & S8 Register Audit'}
              </h3>
            </div>
          </div>
        </div>

        {/* S8 Safe & Register Status */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900 border border-rose-500/40 text-rose-300 font-mono text-xs flex items-center gap-1.5 font-bold">
            <Database className="w-3.5 h-3.5 text-amber-400" />
            <span>{isFa ? `موجودی دفتر S8: ${s8PreviousStock}mL` : `S8 Register: ${s8PreviousStock}mL`}</span>
          </div>

          <div className={`px-3 py-1.5 rounded-xl border font-mono text-xs font-bold flex items-center gap-1.5 ${
            isScriptFiledInS8Safe
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
              : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
          }`}>
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>
              {isFa
                ? (isScriptFiledInS8Safe ? 'نسخه بایگانی شده در G8 Safe ✅' : 'نیازمند بایگانی در G8 Safe')
                : (isScriptFiledInS8Safe ? 'Filed in S8 Safe ✅' : 'Pending S8 Safe Deposit')}
            </span>
          </div>
        </div>
      </div>

      {/* FEEDBACK & CLINICAL ALERT BANNER */}
      {feedback.title && (
        <div className={`p-4 rounded-xl border flex items-start gap-3 text-xs shadow-lg transition ${
          feedback.type === 'error'
            ? 'bg-rose-950/90 border-rose-500 text-rose-100'
            : feedback.type === 'warning'
            ? 'bg-amber-950/90 border-amber-500 text-amber-100'
            : 'bg-slate-900 border-indigo-500/50 text-indigo-100'
        }`}>
          {feedback.type === 'error' ? (
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
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

      {/* TOP SECTION: ACTIVE S8 ODT PRESCRIPTION OVERVIEW & TAKEAWAY LABEL PRINTER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* LEFT: S8 ODT PRESCRIPTION SPECIFICATION CARD (5 COLS) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-rose-950/40 to-slate-900 p-4 rounded-2xl border border-rose-500/40 space-y-3 font-mono text-xs shadow-xl">
          <div className="flex items-center justify-between border-b border-rose-500/30 pb-2">
            <span className="font-bold text-rose-300 flex items-center gap-1.5 uppercase">
              <FileText className="w-4 h-4 text-rose-400" />
              {isFa ? 'دستورالعمل نسخه S8 بهداشت NSW OTP:' : 'NSW OTP Prescription Specifications:'}
            </span>
            <span className="px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-500/40 text-[10px]">
              SCHEDULE 8 DRUG
            </span>
          </div>

          <div className="space-y-2 font-sans">
            <div>
              <span className="text-slate-400 text-[10px] block">{isFa ? 'نام بیمار:' : 'Patient Name:'}</span>
              <span className="font-extrabold text-sm text-white">{scenario.patientName} (DOB: {scenario.patientDob})</span>
            </div>

            <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1">
              <span className="text-amber-300 font-bold font-mono text-[11px] block">
                💊 {displayedDrugName}
              </span>
              <p className="text-xs text-rose-200 font-mono font-bold">{scenario.directions}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-300 pt-1">
              <div>
                <span className="text-slate-500 block">Prescriber:</span>
                <span>{scenario.prescriberName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Reg Permit No:</span>
                <span>#NSW-OTP-2026-99</span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: TAKEAWAY S8 BOTTLE LABEL GENERATOR (7 COLS) */}
        <div className="lg:col-span-7 bg-slate-900 p-4 rounded-2xl border border-amber-500/40 space-y-3 shadow-xl">
          <div className="flex items-center justify-between border-b border-amber-500/30 pb-2">
            <span className="font-bold text-amber-300 text-xs flex items-center gap-1.5 font-mono uppercase">
              <Tag className="w-4 h-4 text-amber-400" />
              {isFa ? 'مولد برچسب دوز خانگی S8 Takeaway Label:' : 'Schedule 8 Takeaway Bottle Label Generator:'}
            </span>
            <button
              onClick={() => setIsTakeawayLabelPrinted(true)}
              className="px-3 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition flex items-center gap-1 shadow"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>{isFa ? 'چاپ برچسب Takeaway' : 'Print Takeaway Label'}</span>
            </button>
          </div>

          {/* S8 Takeaway Bottle Label Mockup */}
          <div className="bg-amber-50 text-slate-900 p-3 rounded-xl border-2 border-amber-400 font-mono text-xs space-y-1.5 relative shadow-inner">
            {/* Red Warning Header Banner */}
            <div className="bg-rose-600 text-white font-extrabold text-[10px] text-center py-0.5 rounded tracking-wider uppercase">
              PRESCRIPTION ONLY MEDICINE - KEEP OUT OF REACH OF CHILDREN
            </div>

            <div className="flex justify-between items-start text-[10px] font-bold text-slate-800 border-b border-amber-300 pb-1">
              <span>ROYAL SYDNEY COMMUNITY PHARMACY</span>
              <span>PH: (02) 9384 1029</span>
            </div>

            <div className="space-y-0.5">
              <p className="font-extrabold text-sm text-slate-950">Patient: {scenario.patientName}</p>
              <p className="font-bold text-rose-900 text-xs">
                METHADONE ORAL LIQUID 5mg/mL - TAKEAWAY DOSE ({administeredDose}mg / 12mL)
              </p>
              <div className="bg-amber-200/80 p-1 rounded font-bold text-xs text-rose-950 text-center border border-amber-300">
                FOR CONSUMPTION ON SPECIFIC DATE: <span className="underline uppercase">{takeawayConsumptionDate} ONLY</span>
              </div>
            </div>

            <div className="flex justify-between text-[9px] text-slate-700 font-bold border-t border-amber-300 pt-1">
              <span>Dispensed By: Pharmacist #39201</span>
              <span>Date: 13/08/2026 | S8 Safe Reg</span>
            </div>

            {isTakeawayLabelPrinted && (
              <div className="absolute top-2 right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                PRINTED & VERIFIED ✓
              </div>
            )}
          </div>
        </div>

      </div>

      {/* MIDDLE SECTION: DAILY DOSING INPUT FORM & PATIENT SIGNATURE WORKSPACE */}
      <div className="bg-slate-900 p-4 sm:p-5 rounded-2xl border border-indigo-500/40 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-indigo-500/30 pb-3 gap-2">
          <span className="font-bold text-sm text-indigo-300 font-mono flex items-center gap-2">
            <PenTool className="w-4 h-4 text-indigo-400" />
            {isFa ? 'ثبت دوز روزانه و اخذ امضای بیمار (Daily Administration Workspace):' : 'Record Daily Administration & Patient Signature:'}
          </span>
          <span className="text-[11px] font-mono text-amber-300 bg-amber-950/80 px-2.5 py-0.5 rounded border border-amber-500/30">
            {isFa ? 'تاریخ ثبت: پنج‌شنبه 13/08/2026 - ساعت 09:30 AM' : 'Timestamp: Thu 13/08/2026 - 09:30 AM'}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">

          {/* Dosing Parameters Controls (6 Cols) */}
          <div className="md:col-span-6 space-y-3 font-mono text-xs">
            {/* Dosing Type Toggle */}
            <div>
              <label className="text-slate-400 text-[11px] block mb-1 font-bold">
                {isFa ? 'نوع تحویل دوز (Dosing Type):' : 'Dosing Delivery Mode:'}
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setDosingType('Supervised')}
                  className={`p-2.5 rounded-xl border transition font-bold text-xs flex items-center justify-center gap-1.5 ${
                    dosingType === 'Supervised'
                      ? 'bg-emerald-600 border-emerald-400 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-emerald-300" />
                  <span>{isFa ? 'مصرف تحت نظارت (Supervised Intake)' : 'Supervised Intake'}</span>
                </button>

                <button
                  onClick={() => setDosingType('Takeaway')}
                  className={`p-2.5 rounded-xl border transition font-bold text-xs flex items-center justify-center gap-1.5 ${
                    dosingType === 'Takeaway'
                      ? 'bg-amber-600 border-amber-400 text-white shadow-lg shadow-amber-600/30'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <Tag className="w-4 h-4 text-amber-300" />
                  <span>{isFa ? 'دوز خانگی (Takeaway Bottle)' : 'Takeaway Bottle'}</span>
                </button>
              </div>
            </div>

            {/* Administered Dose Input */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-slate-400 text-[11px] block mb-1 font-bold">
                  {isFa ? 'دوز تجویزی / مصرفی (mg):' : 'Administered Dose (mg):'}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={administeredDose}
                    onChange={(e) => setAdministeredDose(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-indigo-500/50 rounded-xl px-3 py-2 text-white font-bold font-mono text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                  <span className="text-slate-400 text-xs font-bold">mg</span>
                </div>
              </div>

              {dosingType === 'Takeaway' && (
                <div>
                  <label className="text-slate-400 text-[11px] block mb-1 font-bold">
                    {isFa ? 'تاریخ مصرف خانگی:' : 'Consumption Date:'}
                  </label>
                  <input
                    type="text"
                    value={takeawayConsumptionDate}
                    onChange={(e) => setTakeawayConsumptionDate(e.target.value)}
                    placeholder="DD/MM/YYYY"
                    className="w-full bg-slate-950 border border-amber-500/50 rounded-xl px-3 py-2 text-amber-300 font-bold font-mono text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Interactive Signature Canvas Workspace (6 Cols) */}
          <div className="md:col-span-6 bg-slate-950 p-3 rounded-2xl border border-indigo-500/40 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-indigo-300 font-bold flex items-center gap-1">
                <PenTool className="w-3.5 h-3.5 text-indigo-400" />
                {isFa ? 'امضای دیجیتال بیمار روی دفترچه S8:' : 'Patient Digital Signature Pad:'}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleQuickSign}
                  className="px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 text-[10px] font-bold hover:bg-indigo-900"
                >
                  {isFa ? 'امضای سریع' : 'Quick Sign'}
                </button>
                <button
                  onClick={handleClearSignature}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px] font-bold hover:bg-slate-700"
                >
                  {isFa ? 'پاک‌کردن' : 'Clear'}
                </button>
              </div>
            </div>

            {/* Signature Canvas Box */}
            <div className="bg-slate-900 rounded-xl border-2 border-dashed border-indigo-500/50 relative h-24 overflow-hidden">
              <canvas
                ref={canvasRef}
                width={380}
                height={96}
                onMouseDown={startDrawing}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                onMouseMove={draw}
                onTouchStart={startDrawing}
                onTouchEnd={stopDrawing}
                onTouchMove={draw}
                className="w-full h-full cursor-crosshair touch-none"
              />

              {!patientSignatureData && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-xs font-mono pointer-events-none">
                  ✍️ {isFa ? 'جهت امضا با ماوس/لمس روی این کادر رسم کنید' : 'Sign here with mouse or touch gesture'}
                </div>
              )}

              {patientSignatureData && (
                <div className="absolute top-1.5 right-1.5 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow">
                  SIGNED ✓
                </div>
              )}
            </div>

            {/* Submit Action Button */}
            <button
              onClick={handleAddDosingEntry}
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 text-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isFa
                  ? 'ثبت نهایی دوز، کسر از دفتر S8 و بایگانی در G8 Safe'
                  : 'Submit Daily Dose, Update S8 Register & Lock in Safe'}
              </span>
            </button>
          </div>

        </div>
      </div>

      {/* BOTTOM SECTION: DAILY DOSING LOG TABLE WITH DOUBLE-LINE STRIKETHROUGH TOOL */}
      <div className="bg-slate-900 rounded-2xl border border-rose-500/40 p-4 space-y-3 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-500/30 pb-2 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-rose-400" />
            <span className="font-bold text-sm text-white font-mono">
              {isFa
                ? 'دفترچه ثبت دوزهای تحویلی ODT و ابزار خط کشیدن دوتایی (Double-Line Strikethrough Tool):'
                : 'NSW OTP Dosing History Table & Strikethrough Tool:'}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            {isFa
              ? 'برای ابطال یا تأیید ردیف‌ها روی دکمه Strikethrough کلیک کنید.'
              : 'Click Strikethrough on completed rows per NSW Health rules.'}
          </p>
        </div>

        {/* Dosing History Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono text-left rtl:text-right border-collapse">
            <thead>
              <tr className="bg-slate-950 text-indigo-300 border-b border-slate-800 text-[11px]">
                <th className="p-2.5">{isFa ? 'تاریخ و زمان' : 'Date & Time'}</th>
                <th className="p-2.5">{isFa ? 'دوز تجویزی' : 'Prescribed'}</th>
                <th className="p-2.5">{isFa ? 'دوز تحویلی' : 'Administered'}</th>
                <th className="p-2.5">{isFa ? 'نوع تحویل' : 'Dosing Mode'}</th>
                <th className="p-2.5">{isFa ? 'امضای بیمار' : 'Patient Signed'}</th>
                <th className="p-2.5">{isFa ? 'تأیید داروساز' : 'Pharmacist'}</th>
                <th className="p-2.5 text-center">{isFa ? 'خط کشیدن دوتایی' : 'Strikethrough Action'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dosingLogs.map((log) => (
                <tr
                  key={log.id}
                  className={`transition relative ${
                    log.isStruckThrough ? 'bg-slate-950/80 text-slate-400' : 'bg-slate-900 text-white hover:bg-slate-800/80'
                  }`}
                >
                  <td className="p-2.5 relative">
                    {/* Visual Parallel Double-Line Strikethrough Overlay */}
                    {log.isStruckThrough && (
                      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 pointer-events-none px-1">
                        <div className="h-[2px] bg-sky-500 w-full shadow-sm"></div>
                        <div className="h-[2px] bg-sky-500 w-full shadow-sm"></div>
                      </div>
                    )}
                    <span className="font-bold">{log.date}</span>
                    <span className="text-[10px] text-slate-400 block">{log.time}</span>
                  </td>

                  <td className="p-2.5 font-bold text-amber-300">{log.prescribedDoseMg} mg</td>

                  <td className="p-2.5 font-bold text-emerald-400">{log.administeredDoseMg} mg</td>

                  <td className="p-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      log.dosingType === 'Supervised'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/30'
                        : 'bg-amber-950 text-amber-300 border border-amber-500/30'
                    }`}>
                      {log.dosingType}
                      {log.consumptionDate && ` (${log.consumptionDate})`}
                    </span>
                  </td>

                  <td className="p-2.5 font-bold text-indigo-300">
                    {log.patientSigned ? 'Signed ✓' : 'Pending'}
                  </td>

                  <td className="p-2.5 font-bold text-emerald-400">
                    {log.pharmacistVerified ? 'Verified ✓' : 'Pending'}
                  </td>

                  <td className="p-2.5 text-center">
                    <button
                      onClick={() => handleApplyStrikethrough(log.id)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 mx-auto border ${
                        log.isStruckThrough
                          ? 'bg-sky-950 text-sky-300 border-sky-500/50 hover:bg-sky-900'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
                      }`}
                    >
                      <Ban className="w-3 h-3 text-sky-400" />
                      <span>
                        {log.isStruckThrough
                          ? (isFa ? 'پاک‌کردن Strikethrough' : 'Clear Lines')
                          : (isFa ? 'اعمال Strikethrough دوتایی' : 'Double Strikethrough')}
                      </span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
