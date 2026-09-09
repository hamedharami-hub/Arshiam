'use client';

import React, { useEffect } from 'react';
import { Product } from '@/types/shelf';
import { Language } from '@/types/pharmacy';
import { ShieldAlert, UserCheck, CheckCircle2, XCircle, X } from 'lucide-react';

interface ProjectStopModalProps {
  isOpen: boolean;
  activeProduct: Product | null;
  language: Language;
  patientName: string;
  setPatientName: (val: string) => void;
  idType: 'Driver License' | 'Passport' | 'Proof of Age';
  setIdType: (val: 'Driver License' | 'Passport' | 'Proof of Age') => void;
  patientId: string;
  setPatientId: (val: string) => void;
  counselingCompleted: boolean;
  setCounselingCompleted: (val: boolean) => void;
  isApproved: boolean | null;
  approvalCode: string;
  onVerify: (e: React.FormEvent) => void;
  onClose: () => void;
}

export const ProjectStopModal: React.FC<ProjectStopModalProps> = ({
  isOpen,
  activeProduct,
  language,
  patientName,
  setPatientName,
  idType,
  setIdType,
  patientId,
  setPatientId,
  counselingCompleted,
  setCounselingCompleted,
  isApproved,
  approvalCode,
  onVerify,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  const isFa = language === 'fa';

  const productName = activeProduct
    ? `${activeProduct.brandName} (${activeProduct.genericName})`
    : (isFa ? 'سودوافدرین ۶۰ میلی‌گرم (Sudafed Decongestant S3)' : 'Sudafed Decongestant 60mg (Pseudoephedrine HCl - S3)');

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="app-card border border-rose-500/40 rounded-2xl max-w-lg w-full p-4 sm:p-5 space-y-4 shadow-2xl bg-slate-900 text-white my-auto max-h-[92vh] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-rose-500/30 pb-3 gap-2">
          <div className="flex items-center gap-2 text-rose-400 font-bold text-xs sm:text-sm min-w-0">
            <ShieldAlert className="w-5 h-5 shrink-0" />
            <span className="truncate">
              {isFa
                ? 'سامانه استعلام ملی Project Stop (S3 Pseudoephedrine)'
                : 'Project Stop Real-Time Verification'}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition border border-slate-800 cursor-pointer shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <span className="text-slate-300 font-semibold">{isFa ? 'داروی در حال تحویل:' : 'Dispensing Drug:'}</span>
          <span className="font-mono font-bold text-rose-300 truncate">{productName}</span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {isFa
            ? 'به موجب قانون Poison Standard استرالیا، تحویل فرآورده‌های حاوی Pseudoephedrine الزامی به احراز هویت با کارت شناسایی عکس‌دار و ثبت آنلاین جهت جلوگیری از انحراف غیرقانونی دارد.'
            : 'Poisons law mandates photo ID checking and real-time electronic recording via Project Stop for all S3 pseudoephedrine sales.'}
        </p>

        <form onSubmit={onVerify} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                {isFa ? 'نام و نام خانوادگی بیمار:' : 'Patient Full Name:'}
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 mb-1 font-semibold">
                {isFa ? 'نوع مدرک شناسایی:' : 'Photo ID Type:'}
              </label>
              <select
                value={idType}
                onChange={(e) => setIdType(e.target.value as any)}
                className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Driver License">Driver License (گواهینامه)</option>
                <option value="Passport">Passport (پاسپورت)</option>
                <option value="Proof of Age">Proof of Age Card</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 mb-1 font-semibold">
              {isFa ? 'شماره مدرک شناسایی:' : 'Photo ID Number:'}
            </label>
            <input
              type="text"
              required
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              placeholder="e.g. DL-98347201"
              className="w-full px-3 py-2 rounded-xl bg-black/50 border border-slate-700 text-white focus:outline-none focus:border-rose-500 font-mono"
            />
          </div>

          {/* Mandatory Pharmacist Counseling Checkbox */}
          <label className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-800/80 border border-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={counselingCompleted}
              onChange={(e) => setCounselingCompleted(e.target.checked)}
              className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4"
            />
            <span className="text-[11px] text-slate-200 leading-snug">
              <strong className="text-rose-400 block mb-0.5">
                {isFa
                  ? 'چک‌لیست مشاوره داروساز (Mandatory Counseling):'
                  : 'Mandatory Pharmacist Assessment:'}
              </strong>
              {isFa
                ? 'ارزیابی نیاز درمانی انجام شد، عدم ابتلا به فشار خون بالا/MAOI بررسی شد و دوزاژ (حداکثر ۵ روز) به بیمار آموزش داده شد.'
                : 'Therapeutic need confirmed, hypertension/MAOI contraindications excluded & max 5-day duration counseled.'}
            </span>
          </label>

          <button
            type="submit"
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 font-bold text-white transition flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 cursor-pointer"
          >
            <UserCheck className="w-4 h-4" />
            <span>
              {isFa
                ? 'استعلام در سامانه ملی Project Stop'
                : 'Verify in Project Stop Database'}
            </span>
          </button>
        </form>

        {isApproved === true && (
          <div className="p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-emerald-300">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  {isFa
                    ? 'استعلام موفق - تحویل S3 مجاز است'
                    : 'Verification Passed - S3 Supply Approved'}
                </span>
              </div>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                {approvalCode}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {isFa
                ? '✅ هیچ سابقه خرید مشکوک در ۲۴ ساعت گذشته در سراسر داروخانه‌های استرالیا ثبت نشده است. مدرک شناسایی ثبت و استعلام تایید گردید.'
                : '✅ No purchase frequency alerts found in national database within last 24 hours across all Australian pharmacies. Photo ID recorded.'}
            </p>
          </div>
        )}

        {isApproved === false && (
          <div className="p-3.5 rounded-xl bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>
              {isFa
                ? '⚠️ تایید نشد! لطفاً شماره مدرک شناسایی معتبر وارد کرده و چک‌لیست مشاوره داروساز را علامت بزنید.'
                : '⚠️ Verification failed! Please enter a valid ID number and check the Pharmacist Counseling box.'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
