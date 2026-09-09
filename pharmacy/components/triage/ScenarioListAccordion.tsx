'use client';

import React from 'react';
import { Language } from '@/types/pharmacy';
import { Scenario } from '@/data/otcScenarios';
import { getScenarioMode } from './types';
import { Check, ChevronDown, Layers, MessageSquare } from 'lucide-react';
import { haptic } from '@/lib/haptics';

export interface ScenarioListAccordionProps {
  scenario: Scenario;
  filteredScenarios: Scenario[];
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
  language: Language;
}

export const cleanLocalizedText = (text: string, isFa: boolean): string => {
  if (!text) return '';
  if (!isFa) return text;
  return text.replace(/\s*\([a-zA-Z0-9\s/&,.:'?!-]+\)/g, '').trim();
};

export const ScenarioListAccordion: React.FC<ScenarioListAccordionProps> = ({
  scenario,
  filteredScenarios,
  selectedScenarioId,
  onSelectScenario,
  isOpen,
  onToggleOpen,
  language,
}) => {
  const isFa = language === 'fa';
  const getCleanTitle = (sc: Scenario) =>
    isFa ? cleanLocalizedText(sc.title.fa || sc.title.en, true) : sc.title.en;
  const getCleanPresentation = (sc: Scenario) =>
    isFa
      ? cleanLocalizedText(sc.patientProfile.presentation.fa || sc.patientProfile.presentation.en, true)
      : sc.patientProfile.presentation.en;
  const getCleanCategory = (sc: Scenario) =>
    isFa ? cleanLocalizedText(sc.category.fa || sc.category.en, true) : sc.category.en;

  return (
    <div className="space-y-3">
      <div className="app-card border app-border rounded-2xl overflow-hidden shadow-sm transition-all">
        <button
          type="button"
          onClick={onToggleOpen}
          className="w-full p-3 sm:p-3.5 app-bg hover:bg-black/5 dark:hover:bg-slate-900 flex items-center justify-between gap-3 text-start cursor-pointer transition-colors"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="p-2 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30 shrink-0">
              <Layers className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs sm:text-sm font-black app-text truncate">
                {getCleanTitle(scenario)}
              </h4>
              <p className="text-[10px] app-muted truncate opacity-80 mt-0.5" dir="ltr">
                {scenario.title.en}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="px-2 py-1 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 text-[11px] font-bold flex items-center gap-1 transition">
              <span>{isOpen ? (isFa ? 'بستن' : 'Close') : (isFa ? 'تغییر سناریو' : 'Change Scenario')}</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-sky-500' : ''}`} />
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="p-3 sm:p-4 border-t app-border bg-black/5 dark:bg-slate-950/40 animate-fadeIn space-y-2.5">
            <div className="flex items-center justify-between gap-2 pb-1.5 border-b app-border">
              <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                <Layers className="w-4 h-4" />
                <span>{isFa ? 'فهرست سناریوها' : 'Scenario List'}</span>
                <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 text-[10px] font-mono border border-sky-500/30">
                  {filteredScenarios.length} {isFa ? 'مورد' : 'items'}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredScenarios.length > 0 ? (
                filteredScenarios.map((sc, idx) => {
                  const isSelected = selectedScenarioId === sc.id;
                  const scMode = getScenarioMode(sc);
                  const modeBadge =
                    scMode === 'MODE_A_ADMIN'
                      ? { label: isFa ? 'اداری (A)' : 'Admin (A)', bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30' }
                      : scMode === 'MODE_C_CONFLICT'
                        ? { label: isFa ? 'تعارض و اخلاق (C)' : 'Conflict (C)', bg: 'bg-purple-500/15 text-purple-300 border-purple-500/30' }
                        : { label: isFa ? 'عامیانه و OTC (B)' : 'OTC / Slang (B)', bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' };

                  return (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => {
                        haptic.light();
                        onSelectScenario(sc.id);
                        onToggleOpen();
                      }}
                      className={`p-3 rounded-xl border text-right transition flex items-start justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-sky-600/25 border-sky-500 text-white shadow-md ring-1 ring-sky-500/60'
                          : 'bg-slate-900/60 hover:bg-slate-800/80 border-slate-800/90 text-slate-300 hover:border-sky-500/40'
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden flex-1">
                        <div className="font-bold text-xs text-slate-100 leading-snug line-clamp-1">
                          <span className="text-sky-400 ml-1 font-mono">{idx + 1}.</span>
                          {getCleanTitle(sc)}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">
                          <span className="text-sky-300 font-medium">{sc.patientProfile.name}</span>
                          <span className="mx-1 text-slate-600">•</span>
                          <span>{getCleanPresentation(sc)}</span>
                        </div>
                        <span className={`inline-block text-[9px] px-1.5 py-0.5 rounded-md border font-mono font-bold ${modeBadge.bg}`}>
                          {modeBadge.label}
                        </span>
                      </div>

                      <div className="shrink-0 pt-0.5">
                        {isSelected ? (
                          <div className="w-5 h-5 rounded-full bg-sky-500 text-black flex items-center justify-center font-bold shadow-sm">
                            <Check className="w-3 h-3 stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border border-slate-700 flex items-center justify-center text-slate-500">
                            <MessageSquare className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="col-span-full p-6 text-center text-xs app-muted">
                  {isFa ? 'هیچ سناریویی یافت نشد.' : 'No matching scenarios found.'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
