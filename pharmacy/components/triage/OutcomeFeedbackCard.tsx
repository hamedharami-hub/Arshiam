'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario, DialogueOption } from '@/data/otcScenarios';
import { Sparkles, Info, BookOpen, ShieldAlert, FileCheck, ArrowRight } from 'lucide-react';
import { FormattedClinicalText } from './FormattedClinicalText';

interface OutcomeFeedbackCardProps {
  language: Language;
  scenario: Scenario;
  selectedOption: DialogueOption | undefined;
  onOpenReferralModal: () => void;
  onNavigateToFred?: (scenarioId?: string) => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3 | 4 | 5 | 6, contextId?: string) => void;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
}

export const OutcomeFeedbackCard: React.FC<OutcomeFeedbackCardProps> = ({
  language,
  scenario,
  selectedOption,
  onOpenReferralModal,
  onNavigateToFred,
  onNavigateToModule,
  onOpenAiLeitner,
}) => {
  const isFa = language === 'fa';

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Primary Feedback Card */}
      <div
        className={`app-card border rounded-2xl p-4 sm:p-5 space-y-3.5 ${
          selectedOption?.isCorrectAdvice
            ? 'border-emerald-500/50 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
            : 'border-rose-500/50 bg-rose-950/20 shadow-lg shadow-rose-950/30'
        }`}
      >
        <div className="flex items-center justify-between border-b app-border pb-2.5">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm app-text">
              {isFa ? 'تحلیل و بازخورد بالینی داروساز (Instant Pharmacist Feedback Engine)' : 'Instant Pharmacist Clinical Feedback Engine'}
            </span>
          </div>
          <span
            className={`text-[11px] px-3 py-1 rounded-full font-bold border ${
              selectedOption?.isCorrectAdvice
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
            }`}
          >
            {selectedOption?.isCorrectAdvice
              ? isFa ? '✅ تصمیم بالینی صحیح و ایمن' : '✅ Correct Clinical Decision'
              : isFa ? '❌ نیاز به اصلاح و ارزیابی مجدد' : '❌ Re-evaluation Required'}
          </span>
        </div>

        {/* Recommendation Summary */}
        <div className="p-3.5 rounded-xl bg-black/40 border app-border space-y-1.5">
          <div className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
            <Info className="w-4 h-4" />
            <span>{isFa ? 'توصیه و نتیجه نهایی سناریو:' : 'Scenario Outcome & Recommendation:'}</span>
          </div>
          <FormattedClinicalText
            text={scenario.clinicalOutcome.recommendation[language] || scenario.clinicalOutcome.recommendation.en}
            language={language}
          />
        </div>

        {/* Key Clinical Pearls Checklist */}
        <div className="space-y-2">
          <div className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
            <BookOpen className="w-4 h-4" />
            <span>{isFa ? 'نکات متمایز بالینی و توجیه آیین‌نامه‌ای (Clinical Pearls & Practice Standards):' : 'Key Clinical Pearls & Guidelines Justification:'}</span>
          </div>

          <div className="bg-black/30 p-3.5 rounded-xl border app-border">
            <FormattedClinicalText
              text={scenario.clinicalOutcome.explanation[language] || scenario.clinicalOutcome.explanation.en}
              language={language}
            />
          </div>
        </div>

        {/* Safety Warning Panel for Incorrect OTC Supply */}
        {(!selectedOption?.isCorrectAdvice || scenario.clinicalOutcome.requiresReferral) && (
          <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/50 space-y-2 text-xs text-rose-200">
            <div className="flex items-center gap-2 text-rose-400 font-bold">
              <ShieldAlert className="w-5 h-5 shrink-0" />
              <span>{isFa ? 'هشدار بورد داروسازی استرالیا (PBA / APF Practice Warning):' : 'Pharmacy Board of Australia Practice Warning:'}</span>
            </div>
            <p className="leading-relaxed">
              {isFa
                ? 'در صورت وجود پرچم‌های قرمز (Red Flags) یا ضرورت ارجاع پزشکی، هرگونه تحویل فرآورده بدون نسخه (OTC) ممکن است منجر به تاخیر در تشخیص بیماری‌های خطرناک گردد و مغایر با استانداردهای هیئت داروسازی استرالیا (PBA Practice Standards) می‌باشد.'
                : 'Where Red Flags exist or medical referral is warranted, supplying any over-the-counter (OTC) product may cause critical diagnostic delay and breaches Pharmacy Board of Australia (PBA) Practice Standards.'}
            </p>
          </div>
        )}

        {/* Cross-Module Practice & Action Buttons */}
        <div className="pt-2 border-t app-border flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenReferralModal}
              className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer"
            >
              <FileCheck className="w-4 h-4" />
              <span>{isFa ? 'صدور نامه ارجاع GP' : 'GP Referral Letter'}</span>
            </button>

            {onNavigateToModule && (
              <button
                type="button"
                onClick={() => onNavigateToModule(2, scenario.id)}
                className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-sky-600/30 cursor-pointer"
              >
                <span>🏷️</span>
                <span>{isFa ? 'مشاهده در قفسه محصولات (Module 2)' : 'View in Product Shelf (Mod 2)'}</span>
              </button>
            )}

            {onNavigateToModule && (
              <button
                type="button"
                onClick={() => onNavigateToModule(3)}
                className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-teal-600/30 cursor-pointer"
              >
                <span>🖥️</span>
                <span>{isFa ? 'تمرین نسخه در Fred (ماژول ۳)' : 'Fred Dispense Simulator (Mod 3)'}</span>
              </button>
            )}
          </div>

          {onOpenAiLeitner && (
            <button
              type="button"
              onClick={() => {
                const topic = scenario.title[language] || scenario.title.en;
                const rec = scenario.clinicalOutcome.recommendation[language] || scenario.clinicalOutcome.recommendation.en;
                const exp = scenario.clinicalOutcome.explanation[language] || scenario.clinicalOutcome.explanation.en;
                const snippet = `OTC Scenario: ${topic}. Recommendation: ${rec}. Guidelines Explanation: ${exp}`;
                onOpenAiLeitner(snippet, 1, 'OTC Triage Clinical Scenarios', topic);
              }}
              className="px-3 py-2 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>{isFa ? 'افزودن این نکته به لایتنر' : 'Add to Leitner'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
