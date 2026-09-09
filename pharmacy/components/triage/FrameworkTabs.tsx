'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario, WwhamQuestion, DialogueOption } from '@/data/otcScenarios';
import {
  Layers,
  CheckCircle2,
  HelpCircle,
  ShieldAlert,
  AlertTriangle,
  Star,
} from 'lucide-react';
import { FormattedClinicalText } from './FormattedClinicalText';

interface FrameworkTabsProps {
  language: Language;
  scenario: Scenario;
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
  selectedOption: DialogueOption | undefined;
  onSelectDialogueOption: (opt: DialogueOption) => void;
}

export const FrameworkTabs: React.FC<FrameworkTabsProps> = ({
  language,
  scenario,
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
}) => {
  const isFa = language === 'fa';

  return (
    <div className="p-3.5 rounded-2xl bg-slate-900/80 border app-border space-y-3 shadow-inner">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5" />
          <span>{isFa ? 'مراحل گام‌به‌گام تریاژ و پرسش‌های بالینی داروساز:' : 'Clinical Triage Steps & Action Selection:'}</span>
        </span>
        <span className="text-[10px] text-slate-400 font-medium">
          {isFa ? 'برای مشاهده سوال و جواب، روی هر مرحله کلیک کنید (پاپ‌آپ)' : 'Click to view Q&A popup modal'}
        </span>
      </div>

      {/* Step Tabs Navigation - 3 Streamlined Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => setActiveFrameworkTab('wwham')}
          className={`p-2.5 rounded-xl border transition text-center cursor-pointer ${
            activeFrameworkTab === 'wwham'
              ? 'bg-sky-600 text-white border-sky-400 shadow-md shadow-sky-600/20 font-bold'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="text-[11px] leading-tight truncate">
            {isFa ? '۱. پروتکل WWHAM' : '1. WWHAM Protocol'}
          </div>
          <div className="text-[10px] opacity-85 font-mono mt-0.5">
            ({wwhamCount}/4) • {isFa ? '۴۰٪' : '40%'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFrameworkTab('redflags')}
          className={`p-2.5 rounded-xl border transition text-center cursor-pointer ${
            activeFrameworkTab === 'redflags'
              ? 'bg-rose-600 text-white border-rose-400 shadow-md shadow-rose-600/20 font-bold'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="text-[11px] leading-tight truncate">
            {isFa ? '۲. پرچم‌های قرمز بالینی 🚩' : '2. Clinical Red Flags'}
          </div>
          <div className="text-[10px] opacity-85 font-mono mt-0.5">
            {askedRedFlagChecks['rf-check'] ? (isFa ? 'بررسی شد' : 'Done') : (isFa ? 'نشده' : 'Pending')} • {isFa ? '۲۰٪' : '20%'}
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveFrameworkTab('decision')}
          className={`p-2.5 rounded-xl border transition text-center cursor-pointer ${
            activeFrameworkTab === 'decision'
              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/20 font-bold'
              : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200 font-medium'
          }`}
        >
          <div className="text-[11px] leading-tight truncate">
            {isFa ? '۳. تصمیم و توصیه داروساز 🎯' : '3. Pharmacist Decision'}
          </div>
          <div className="text-[10px] opacity-85 font-mono mt-0.5">
            {selectedOption ? (isFa ? 'انتخاب شد' : 'Selected') : (isFa ? 'اقدام' : 'Action')} • {isFa ? '۴۰٪' : '40%'}
          </div>
        </button>
      </div>

      {/* Action Buttons for Active Tab */}
      <div className="pt-2 border-t border-white/10">
        {/* Tab 1: WWHAM Questions (Opens Popup with Q&A and Star) */}
        {activeFrameworkTab === 'wwham' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[11px] text-sky-300 px-1">
              <span>{isFa ? 'برای باز شدن پاپ‌آپ، مشاهده پاسخ و ستاره‌دار کردن روی هر سوال کلیک کنید:' : 'Click any question to open Q&A popup & star:'}</span>
              <span className="text-[10px] font-mono opacity-80 font-bold">{wwhamCount}/4 {isFa ? 'مشاهده شده' : 'viewed'}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {scenario.whatQuestions.map((q) => {
                const isAsked = !!askedQuestions[q.key];
                const isStarred = isQnaStarred(q.question.en);
                return (
                  <button
                    key={q.key}
                    type="button"
                    onClick={() => onAskWwhamQuestion(q)}
                    className={`p-3 rounded-xl border text-right text-xs transition font-semibold flex items-center justify-between gap-2 cursor-pointer shadow-sm ${
                      isAsked
                        ? 'bg-sky-950/60 border-sky-500/50 text-sky-100 hover:border-sky-400'
                        : 'bg-slate-900/90 border-slate-700 text-slate-200 hover:bg-sky-950/40 hover:border-sky-500/40'
                    }`}
                  >
                    <div className="truncate flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 border border-sky-500/40 text-sky-300 font-mono font-bold text-[10px] flex items-center justify-center shrink-0">
                        {q.key}
                      </span>
                      <span className="text-slate-100 font-bold truncate">
                        {q.label[language] || q.label.en}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {isStarred && <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />}
                      {isAsked ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <HelpCircle className="w-4 h-4 text-sky-400" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Red Flags Screen & Explicit List */}
        {activeFrameworkTab === 'redflags' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-rose-300 font-bold flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <span>{isFa ? 'علائم هشدار بالینی و پرچم‌های قرمز (Red Flags) این سناریو:' : 'Clinical Red Flags for this Scenario:'}</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-bold">
                  {scenario.redFlags.length} {isFa ? 'پرچم قرمز' : 'Flags'}
                </span>
              </div>

              {/* Explicit Red Flags List */}
              <div className="space-y-2">
                {scenario.redFlags.map((rf, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-black/40 border border-rose-500/30 text-xs text-rose-100 flex items-start gap-2"
                  >
                    <span className="text-rose-400 font-bold shrink-0 mt-0.5">🚩</span>
                    <div className="flex-1 space-y-0.5">
                      <p className="font-bold text-rose-200">
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
                      ? (isFa ? 'مشاهده پاپ‌آپ پرچم‌های قرمز 🚩' : 'Re-open Red Flags Modal 🚩')
                      : (isFa ? 'اجرای غربالگری پرچم‌های قرمز' : 'Open Red Flags Modal')}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Pharmacist Decision */}
        {activeFrameworkTab === 'decision' && (
          <div className="space-y-3">
            {!allWwhamAsked && (
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {isFa
                    ? 'نکته: توصیه می‌شود ابتدا سؤالات WWHAM و پرچم‌های قرمز را بررسی فرمایید.'
                    : 'Tip: It is recommended to complete WWHAM questions & red flags first.'}
                </span>
              </div>
            )}

            <div className="text-xs app-muted font-medium flex items-center justify-between">
              <span>{isFa ? 'کدام توصیه بالینی یا اقدام داروساز برای این بیمار صحیح است؟' : 'Select the appropriate pharmacist clinical action or advice:'}</span>
              <span className="text-[10px] text-purple-400 font-mono font-bold">
                {scenario.dialogueOptions.length} {isFa ? 'گزینه تصمیم' : 'Options'}
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
                    className={`p-3.5 rounded-xl border text-xs transition cursor-pointer space-y-2 shadow-sm ${
                      isSelected
                        ? opt.isCorrectAdvice
                          ? 'bg-emerald-950/70 border-emerald-500 ring-1 ring-emerald-500/40 text-emerald-100'
                          : 'bg-rose-950/70 border-rose-500 ring-1 ring-rose-500/40 text-rose-100'
                        : 'bg-slate-950/80 border-slate-800 hover:border-purple-500/60 hover:bg-slate-900 text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-1.5">
                      <span className="font-bold text-[11px] text-purple-300 flex items-center gap-1.5">
                        <span className="w-4.5 h-4.5 rounded-full bg-purple-500/20 border border-purple-500/30 inline-flex items-center justify-center font-mono text-[10px]">
                          {optIdx + 1}
                        </span>
                        <span>{isFa ? `گزینه تصمیم ${optIdx + 1}` : `Action Option ${optIdx + 1}`}</span>
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
        )}
      </div>
    </div>
  );
};
