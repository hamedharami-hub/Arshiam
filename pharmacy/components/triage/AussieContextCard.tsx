'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { Globe, Award } from 'lucide-react';
import { FormattedClinicalText } from './FormattedClinicalText';

interface AussieContextCardProps {
  language: Language;
  scenario: Scenario;
}

export const AussieContextCard: React.FC<AussieContextCardProps> = ({
  language,
  scenario,
}) => {
  const isFa = language === 'fa';
  const context = scenario.aussieContext;

  if (!context) return null;

  const contextText = isFa ? (context.fa || context.en) : (context.en || context.fa);

  const adminRuleText = context.adminRule
    ? typeof context.adminRule === 'string'
      ? context.adminRule
      : isFa
      ? context.adminRule.fa || context.adminRule.en
      : context.adminRule.en || context.adminRule.fa
    : null;

  return (
    <div className="app-card border app-border rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-sm bg-slate-900/70">
      <div className="flex items-center justify-between border-b app-border pb-2.5">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-emerald-400" />
          <span className="font-bold text-xs sm:text-sm app-text">
            {isFa ? 'بافت محلی و اصطلاحات استرالیایی' : 'Australian Practice Context & Slang'}
          </span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
          🇦🇺 Aussie Context
        </span>
      </div>

      <div className="space-y-2.5 text-xs">
        {/* Cultural & Practice Nuance */}
        {contextText && (
          <div className="p-3 rounded-xl bg-black/40 border app-border space-y-1">
            <span className="text-[10px] font-bold text-amber-400 block">
              {isFa ? 'نکات فرهنگی و بومی داروخانه‌های استرالیا:' : 'Australian Cultural & Local Practice Nuances:'}
            </span>
            <FormattedClinicalText
              text={contextText}
              language={language}
            />
          </div>
        )}

        {/* Key Phrases in Australian Practice */}
        {context.keyPhrases && context.keyPhrases.length > 0 && (
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-300 block">
              {isFa ? 'اصطلاحات و عبارات کلیدی در این سناریو:' : 'Key Australian Phrases & Slang in this scenario:'}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {context.keyPhrases.map((item, idx) => {
                if (typeof item === 'string') {
                  return (
                    <span
                      key={idx}
                      className="inline-block text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 font-mono"
                    >
                      {item}
                    </span>
                  );
                }
                return (
                  <div
                    key={idx}
                    className="w-full p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-[11px] space-y-0.5"
                  >
                    <div className="font-bold text-emerald-300 font-mono">
                      &ldquo;{item.phrase}&rdquo;
                    </div>
                    <div className="text-slate-300">
                      {isFa ? item.meaningFa : item.meaningEn}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Legal & Practice Standards (PBA, PSA, SUSMP / TGA) */}
        {adminRuleText && (
          <div className="p-3 rounded-xl bg-sky-950/30 border border-sky-500/30 space-y-1">
            <div className="flex items-center gap-1.5 text-sky-400 font-bold text-[11px]">
              <Award className="w-3.5 h-3.5" />
              <span>{isFa ? 'استاندارد قانونی و آیین‌نامه داروسازی (SUSMP / PSA / TGA):' : 'Statutory & Regulatory Practice Standards:'}</span>
            </div>
            <p className="text-sky-100 font-mono text-[11px] leading-relaxed">
              {adminRuleText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
