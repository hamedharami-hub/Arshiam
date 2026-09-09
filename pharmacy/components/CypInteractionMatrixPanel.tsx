'use client';

import React, { useState, useMemo } from 'react';
import {
  CYP_ENZYMES_DATABASE,
  COMMON_PAIR_INTERACTIONS,
  CypEnzymeType,
  CypEnzymeProfile,
  CypPairInteraction,
  CypDrugEntry,
} from '@/data/cypInteractionsData';
import { Language } from '@/types/pharmacy';
import {
  Dna,
  ShieldAlert,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Sparkles,
  Search,
  ArrowRightLeft,
  BookOpen,
  Info,
  ChevronDown,
  ChevronUp,
  XCircle,
  Pill,
} from 'lucide-react';
import { haptic } from '@/lib/haptics';

export interface CypInteractionMatrixPanelProps {
  language: Language;
  onOpenAiLeitner?: (text: string, module: 1 | 2 | 4, category?: string, topic?: string) => void;
  onClose?: () => void;
}

export const CypInteractionMatrixPanel: React.FC<CypInteractionMatrixPanelProps> = ({
  language,
  onOpenAiLeitner,
  onClose,
}) => {
  const isFa = language === 'fa';

  // Active Enzyme Tab
  const [activeEnzyme, setActiveEnzyme] = useState<CypEnzymeType | 'ALL'>('CYP3A4');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'inhibitor' | 'inducer' | 'substrate'>('all');

  // Pair Checker States
  const [drugA, setDrugA] = useState<string>('Simvastatin');
  const [drugB, setDrugB] = useState<string>('Clarithromycin');

  // List of all distinct drug names for pair selector
  const allDrugNames = useMemo(() => {
    const set = new Set<string>();
    COMMON_PAIR_INTERACTIONS.forEach((p) => {
      set.add(p.drugA);
      set.add(p.drugB);
    });
    Object.values(CYP_ENZYMES_DATABASE).forEach((enz) => {
      enz.inhibitors.forEach((d) => set.add(d.name.split('/')[0].trim()));
      enz.inducers.forEach((d) => set.add(d.name.split('/')[0].trim()));
      enz.substrates.forEach((d) => set.add(d.name.split('/')[0].trim()));
    });
    return Array.from(set).sort();
  }, []);

  // Check matching interaction for selected Drug A and Drug B
  const evaluatedInteraction = useMemo(() => {
    if (!drugA || !drugB || drugA === drugB) return null;
    const match = COMMON_PAIR_INTERACTIONS.find(
      (p) =>
        (p.drugA.toLowerCase().includes(drugA.toLowerCase()) && p.drugB.toLowerCase().includes(drugB.toLowerCase())) ||
        (p.drugA.toLowerCase().includes(drugB.toLowerCase()) && p.drugB.toLowerCase().includes(drugA.toLowerCase()))
    );
    return match || null;
  }, [drugA, drugB]);

  const currentEnzymes: CypEnzymeProfile[] = useMemo(() => {
    if (activeEnzyme === 'ALL') {
      return Object.values(CYP_ENZYMES_DATABASE);
    }
    return [CYP_ENZYMES_DATABASE[activeEnzyme]];
  }, [activeEnzyme]);

  // Filtered drug items based on search and type
  const filterDrugEntries = (entries: CypDrugEntry[]) => {
    if (!searchQuery) return entries;
    const q = searchQuery.toLowerCase();
    return entries.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        (d.nameFa && d.nameFa.toLowerCase().includes(q)) ||
        d.notesEn.toLowerCase().includes(q) ||
        d.notesFa.toLowerCase().includes(q)
    );
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
      case 'contraindicated':
        return (
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3 text-rose-400" />
            <span>{isFa ? 'منع مصرف مطلق / بحرانی' : 'Contraindicated / Critical'}</span>
          </span>
        );
      case 'high':
      case 'major':
        return (
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3 text-amber-400" />
            <span>{isFa ? 'تداخل ماژور (نیازمند تنظیم دوز/پایش)' : 'Major Interaction'}</span>
          </span>
        );
      default:
        return (
          <span className="text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1">
            <Info className="w-3 h-3 text-sky-400" />
            <span>{isFa ? 'متوسط / پایش بالینی' : 'Moderate'}</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 text-slate-100 animate-fadeIn" dir={isFa ? 'rtl' : 'ltr'}>
      {/* 1. HEADER & TOP BANNER */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-br from-indigo-950/80 via-slate-900/90 to-purple-950/80 border border-indigo-500/30 shadow-lg space-y-3 relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                <Dna className="w-5 h-5 text-indigo-400" />
              </span>
              <h2 className="text-lg sm:text-xl font-black text-white">
                {isFa
                  ? 'ماتریس تعاملی تداخلات دارویی سیتوکروم P450 و P-gp'
                  : 'Interactive Cytochrome P450 & P-gp Interaction Matrix'}
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-3xl">
              {isFa
                ? 'راهنمای جامع بالینی فارماکوکینتیک استرالیا (مطابق AMH): بررسی مهارکننده‌های آنزیمی قوی، القاکننده‌ها و سوبستراهای با پنجره درمانی باریک (NTI) همراه با ابزار شبیه‌ساز تداخل دوتایی داروها.'
                : 'Comprehensive Australian clinical pharmacokinetics guide (AMH compliant): Master strong inhibitors, inducers, and narrow therapeutic index (NTI) substrates with real-time pair interaction checker.'}
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title={isFa ? 'بستن' : 'Close'}
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 3 Core Rules Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-800/80 text-xs">
          <div className="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-rose-300 block">
                {isFa ? '🛑 مهارکننده (Inhibitor):' : '🛑 Inhibitor:'}
              </span>
              <span className="text-slate-300 text-[11px] leading-snug">
                {isFa
                  ? 'کاهش متابولیسم سوبسترا ➔ تجمع دارو در پلاسما ➔ افزایش ریسک سمیت حاد (Toxicity).'
                  : 'Blocks substrate clearance ➔ toxic drug accumulation.'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2">
            <Zap className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-cyan-300 block">
                {isFa ? '⚡ القاکننده (Inducer):' : '⚡ Inducer:'}
              </span>
              <span className="text-slate-300 text-[11px] leading-snug">
                {isFa
                  ? 'تسریع متابولیسم سوبسترا ➔ افت شدید سطح خونی ➔ شکست درمانی و عود بیماری (Failure).'
                  : 'Accelerates substrate metabolism ➔ subtherapeutic failure.'}
              </span>
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 flex items-start gap-2">
            <ArrowRightLeft className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-amber-300 block">
                {isFa ? '🔄 استثنای پیش‌داروها (Prodrugs):' : '🔄 Prodrugs Rule:'}
              </span>
              <span className="text-slate-300 text-[11px] leading-snug">
                {isFa
                  ? 'در کدئین/کلوپیدوگرل/تاموکسیفن: مهار آنزیم مانع تبدیل به فرم فعال شده و اثربخشی دارو خنثی می‌شود.'
                  : 'Inhibition prevents bioactivation (Codeine, Clopidogrel, Tamoxifen).'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE DRUG-TO-DRUG PAIR CHECKER TOOL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-sky-500/30 shadow-md space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-sm sm:text-base text-white">
              {isFa ? '🔍 ابزار بررسی فوری تداخل دارویی (CYP / P-gp Pair Checker)' : 'CYP / P-gp Pair Interaction Checker'}
            </h3>
          </div>
          <span className="text-xs text-sky-400 font-mono font-medium">
            {isFa ? 'شبیه‌ساز فارماکوکینتیک بالینی' : 'Clinical PK Simulator'}
          </span>
        </div>

        {/* Drug Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">
              {isFa ? 'داروی اول (سوبسترا یا مهارکننده/القا کننده):' : 'Drug A:'}
            </label>
            <select
              value={drugA}
              onChange={(e) => {
                haptic.light();
                setDrugA(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-sky-500 focus:outline-none"
            >
              {allDrugNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">
              {isFa ? 'داروی دوم (برای بررسی تداخل):' : 'Drug B:'}
            </label>
            <select
              value={drugB}
              onChange={(e) => {
                haptic.light();
                setDrugB(e.target.value);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:border-sky-500 focus:outline-none"
            >
              {allDrugNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Evaluated Interaction Card */}
        {evaluatedInteraction ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/40 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                  {evaluatedInteraction.enzyme}
                </span>
                <h4 className="font-bold text-sm sm:text-base text-white">
                  {isFa ? evaluatedInteraction.titleFa : evaluatedInteraction.titleEn}
                </h4>
              </div>
              {getSeverityBadge(evaluatedInteraction.severity)}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg bg-rose-950/30 border border-rose-500/20 space-y-1">
                <span className="font-bold text-rose-300 block">
                  {isFa ? '💥 پیامد بالینی و فارماکوکینتیک:' : '💥 Clinical Consequence:'}
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {isFa ? evaluatedInteraction.clinicalOutcomeFa : evaluatedInteraction.clinicalOutcomeEn}
                </p>
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/20 space-y-1">
                <span className="font-bold text-emerald-300 block">
                  {isFa ? '📋 پروتکل مدیریت بالینی و جایگزین ایمن (AMH):' : '📋 AMH Management Protocol:'}
                </span>
                <p className="text-slate-300 leading-relaxed">
                  {isFa ? evaluatedInteraction.managementFa : evaluatedInteraction.managementEn}
                </p>
              </div>
            </div>

            {/* Flashcard action */}
            {onOpenAiLeitner && (
              <div className="flex justify-end pt-1">
                <button
                  type="button"
                  onClick={() => {
                    const cardText = `CYP Interaction: ${evaluatedInteraction.titleEn} (${evaluatedInteraction.titleFa}). Enzyme: ${evaluatedInteraction.enzyme}. Outcome: ${evaluatedInteraction.clinicalOutcomeEn} / ${evaluatedInteraction.clinicalOutcomeFa}. Management: ${evaluatedInteraction.managementEn} / ${evaluatedInteraction.managementFa}`;
                    onOpenAiLeitner(
                      cardText,
                      4,
                      'Pharmacokinetics & Drug Interactions',
                      `${evaluatedInteraction.drugA} + ${evaluatedInteraction.drugB}`
                    );
                  }}
                  className="px-3 py-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/35 border border-purple-500/40 text-purple-300 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>{isFa ? '✨ ساخت کارت لایتنر از این تداخل' : 'Create Flashcard'}</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-400 flex items-center justify-between">
            <span>
              {isFa
                ? '💡 ترکیب دیگری را انتخاب کنید یا از جدول‌های ایزوآنزیم‌های زیر استفاده نمایید.'
                : '💡 Select a known interaction pair or explore specific enzyme profiles below.'}
            </span>
            <span className="text-slate-500 text-[11px]">
              {drugA} + {drugB}
            </span>
          </div>
        )}
      </div>

      {/* 3. ENZYME SELECTOR TABS & SEARCH */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          {/* Enzyme Pill Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            {(['CYP3A4', 'CYP2D6', 'CYP2C9', 'CYP2C19', 'CYP1A2', 'P-gp', 'ALL'] as const).map((enz) => {
              const isActive = activeEnzyme === enz;
              return (
                <button
                  key={enz}
                  type="button"
                  onClick={() => {
                    haptic.light();
                    setActiveEnzyme(enz);
                  }}
                  className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer border ${
                    isActive
                      ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-md shadow-sky-500/20'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {enz === 'ALL' ? (isFa ? '🌐 تمام مسیرها' : '🌐 All Pathways') : enz}
                </button>
              );
            })}
          </div>

          {/* Search bar */}
          <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
            <Search className="w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 start-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={isFa ? 'جستجوی نام دارو یا تداخل...' : 'Search drug or interaction...'}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl ps-8 pe-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* 4. ENZYME PROFILES & DRUG MATRICES */}
      <div className="space-y-6">
        {currentEnzymes.map((profile) => {
          const filteredInhibitors = filterDrugEntries(profile.inhibitors);
          const filteredInducers = filterDrugEntries(profile.inducers);
          const filteredSubstrates = filterDrugEntries(profile.substrates);

          return (
            <div
              key={profile.id}
              className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-md space-y-4"
            >
              {/* Enzyme Header */}
              <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3 flex-wrap">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md border ${profile.badgeColor}`}>
                      {profile.name}
                    </span>
                    <h3 className="font-bold text-base sm:text-lg text-white">
                      {isFa ? profile.titleFa : profile.titleEn}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {isFa ? profile.overviewFa : profile.overviewEn}
                  </p>
                </div>
              </div>

              {/* 3-Column Grid for Inhibitors, Inducers, Substrates */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* 1. INHIBITORS (RED/ROSE) */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-rose-500/30 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                    <span className="font-bold text-xs sm:text-sm text-rose-300 flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-400" />
                      <span>{isFa ? '🛑 مهارکننده‌ها (Inhibitors)' : '🛑 Inhibitors'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20">
                      {filteredInhibitors.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pe-1">
                    {filteredInhibitors.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        {isFa ? 'موردی یافت نشد.' : 'No items.'}
                      </p>
                    ) : (
                      filteredInhibitors.map((d, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-rose-950/20 border border-rose-500/15 space-y-1 hover:border-rose-500/40 transition"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-white">{d.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300">
                              {d.category === 'strong_inhibitor' ? 'Strong' : 'Mod'}
                            </span>
                          </div>
                          {d.nameFa && isFa && (
                            <span className="text-[11px] text-rose-300/80 block font-medium">{d.nameFa}</span>
                          )}
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {isFa ? d.notesFa : d.notesEn}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. INDUCERS (CYAN/BLUE) */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-cyan-500/30 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                    <span className="font-bold text-xs sm:text-sm text-cyan-300 flex items-center gap-1.5">
                      <Zap className="w-4 h-4 text-cyan-400" />
                      <span>{isFa ? '⚡ القاکننده‌ها (Inducers)' : '⚡ Inducers'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                      {filteredInducers.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pe-1">
                    {filteredInducers.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        {isFa ? 'فاقد القاکننده عمده بالینی (یا غیرقابل القا).' : 'No major clinical inducers.'}
                      </p>
                    ) : (
                      filteredInducers.map((d, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-cyan-950/20 border border-cyan-500/15 space-y-1 hover:border-cyan-500/40 transition"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-white">{d.name}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                              {d.category === 'strong_inducer' ? 'Strong' : 'Mod'}
                            </span>
                          </div>
                          {d.nameFa && isFa && (
                            <span className="text-[11px] text-cyan-300/80 block font-medium">{d.nameFa}</span>
                          )}
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {isFa ? d.notesFa : d.notesEn}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. SUBSTRATES (EMERALD/GREEN) */}
                <div className="p-3 rounded-xl bg-slate-950/60 border border-emerald-500/30 space-y-2.5">
                  <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
                    <span className="font-bold text-xs sm:text-sm text-emerald-300 flex items-center gap-1.5">
                      <Pill className="w-4 h-4 text-emerald-400" />
                      <span>{isFa ? '💊 سوبستراهای حساس و NTI' : '💊 Sensitive & NTI Substrates'}</span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.2 rounded border border-emerald-500/20">
                      {filteredSubstrates.length}
                    </span>
                  </div>

                  <div className="space-y-2 max-h-[360px] overflow-y-auto pe-1">
                    {filteredSubstrates.length === 0 ? (
                      <p className="text-xs text-slate-500 italic py-2">
                        {isFa ? 'موردی یافت نشد.' : 'No items.'}
                      </p>
                    ) : (
                      filteredSubstrates.map((d, i) => (
                        <div
                          key={i}
                          className="p-2 rounded-lg bg-emerald-950/20 border border-emerald-500/15 space-y-1 hover:border-emerald-500/40 transition"
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-mono font-bold text-xs text-white">{d.name}</span>
                            {d.category === 'narrow_therapeutic_substrate' && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                🛑 NTI
                              </span>
                            )}
                          </div>
                          {d.nameFa && isFa && (
                            <span className="text-[11px] text-emerald-300/80 block font-medium">{d.nameFa}</span>
                          )}
                          <p className="text-[11px] text-slate-300 leading-snug">
                            {isFa ? d.notesFa : d.notesEn}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Clinical Exam Pearls & Rules */}
              {profile.clinicalRules && profile.clinicalRules.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>{isFa ? 'نکات کلیدی بالینی و حرفه‌ای:' : 'Clinical and professional learning points:'}</span>
                  </span>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {profile.clinicalRules.map((rule, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-slate-950/50 border border-amber-500/20 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-white">
                            {isFa ? rule.titleFa : rule.titleEn}
                          </span>
                          {getSeverityBadge(rule.severity)}
                        </div>
                        <p className="text-slate-300 leading-relaxed text-[11.5px]">
                          <strong className="text-slate-200">{isFa ? 'مکانیسم: ' : 'Mechanism: '}</strong>
                          {isFa ? rule.mechanismFa : rule.mechanismEn}
                        </p>
                        <p className="text-emerald-300 leading-relaxed text-[11.5px] bg-emerald-950/20 p-1.5 rounded border border-emerald-500/20">
                          <strong className="text-emerald-200">{isFa ? 'توصیه و اقدام: ' : 'Action: '}</strong>
                          {isFa ? rule.recommendationFa : rule.recommendationEn}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
