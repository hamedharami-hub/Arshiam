'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Language } from '@/types/pharmacy';
import {
  ALL_OTC_HANDBOOK_DISEASES,
  OTCDiseaseGuide,
  OTCDrugInfo,
  findHandbookGuide,
} from '@/src/data/otcHandbookData';
import {
  BookOpen,
  Search,
  X,
  Pill,
  Baby,
  ShieldAlert,
  Sparkles,
  HeartPulse,
  Info,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Printer,
  ChevronDown,
  ChevronUp,
  Filter,
  Stethoscope,
  Clock,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ClinicalHandbookDrawerProps {
  language: Language;
  isOpen: boolean;
  onClose: () => void;
  initialDiseaseIdOrGuide?: string | OTCDiseaseGuide | { id: string; [key: string]: any } | null;
  className?: string;
}

const emptySubscribe = () => () => {};

export const ClinicalHandbookDrawer: React.FC<ClinicalHandbookDrawerProps> = ({
  language,
  isOpen,
  onClose,
  initialDiseaseIdOrGuide,
  className = '',
}) => {
  const isFa = language === 'fa';
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);

  // Helper to resolve initial selection safely
  const getInitialGuide = (): OTCDiseaseGuide => {
    if (!initialDiseaseIdOrGuide) return ALL_OTC_HANDBOOK_DISEASES[0];
    if (typeof initialDiseaseIdOrGuide === 'object' && 'id' in initialDiseaseIdOrGuide) {
      const found = ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === initialDiseaseIdOrGuide.id);
      return found || ALL_OTC_HANDBOOK_DISEASES[0];
    }
    const found = ALL_OTC_HANDBOOK_DISEASES.find(
      (d) =>
        d.id === initialDiseaseIdOrGuide ||
        d.condition.toLowerCase() === String(initialDiseaseIdOrGuide).toLowerCase()
    );
    return found || ALL_OTC_HANDBOOK_DISEASES[0];
  };

  const [prevInitial, setPrevInitial] = useState(initialDiseaseIdOrGuide);
  const [selectedGuideId, setSelectedGuideId] = useState<string>(() => getInitialGuide().id);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeTab, setActiveTab] = useState<'medicines' | 'nonpharm' | 'referral' | 'notes'>('medicines');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedMedIds, setExpandedMedIds] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

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

  const toggleMedExpand = (idx: number) => {
    setExpandedMedIds((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  // Sync if initialDiseaseIdOrGuide changes during render
  if (initialDiseaseIdOrGuide !== prevInitial) {
    setPrevInitial(initialDiseaseIdOrGuide);
    const newGuide = getInitialGuide();
    setSelectedGuideId(newGuide.id);
  }

  // Extract categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    ALL_OTC_HANDBOOK_DISEASES.forEach((item) => cats.add(item.category));
    return ['ALL', ...Array.from(cats)];
  }, []);

  // Filtered conditions list
  const filteredConditions = useMemo(() => {
    return ALL_OTC_HANDBOOK_DISEASES.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.condition.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.medicines.some(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.brandExamples.toLowerCase().includes(q) ||
            m.dosing.toLowerCase().includes(q)
        )
      );
    });
  }, [searchQuery, selectedCategory]);

  const currentGuide = useMemo(() => {
    return (
      ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === selectedGuideId) ||
      filteredConditions[0] ||
      ALL_OTC_HANDBOOK_DISEASES[0]
    );
  }, [selectedGuideId, filteredConditions]);

  const handleCopySummary = (guide: OTCDiseaseGuide) => {
    const medSummary = guide.medicines
      .map(
        (m, idx) =>
          `${idx + 1}. ${m.name} [Brands: ${m.brandExamples}]\n   • Dosing: ${m.dosing}\n   • Min Age: ${m.minAge} | Pregnancy: ${m.pregnancySafety} | Lactation: ${m.breastfeedingSafety}\n   • Pearls: ${m.extraInfo || 'N/A'}`
      )
      .join('\n\n');

    const fullText = `CLINICAL OTC HANDBOOK MONOGRAPH
Condition: ${guide.condition} (${guide.category})

---------------- MEDICINES & DOSING ----------------
${medSummary}

---------------- RED FLAGS & REFERRAL ----------------
${guide.referralCriteria.map((r) => `• ${r}`).join('\n')}

---------------- NON-PHARMACOLOGICAL ADVICE ----------------
${guide.nonPharmAdvice.map((n) => `• ${n}`).join('\n')}

---------------- CLINICAL PRACTICE PEARLS ----------------
${guide.clinicalNotes.map((c) => `• ${c}`).join('\n')}
`;

    navigator.clipboard.writeText(fullText);
    setCopiedId(guide.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handlePrintMonograph = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${currentGuide.condition} - Clinical OTC Monograph</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 24px; color: #1e293b; line-height: 1.5; }
            h1 { color: #0f172a; border-bottom: 2px solid #0284c7; padding-bottom: 8px; font-size: 20px; }
            h2 { color: #0369a1; font-size: 15px; margin-top: 18px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
            .med-card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 12px; margin-bottom: 10px; background: #f8fafc; }
            .med-title { font-weight: bold; color: #0f172a; font-size: 14px; }
            .badge { display: inline-block; padding: 2px 8px; font-size: 11px; background: #e0f2fe; color: #0369a1; border-radius: 4px; margin-right: 6px; }
            ul { padding-left: 20px; margin: 6px 0; }
            li { margin-bottom: 4px; font-size: 12px; }
          </style>
        </head>
        <body>
          <h1>Australian Community Pharmacy — OTC Clinical Monograph</h1>
          <p><strong>Condition:</strong> ${currentGuide.condition} | <strong>Category:</strong> ${currentGuide.category}</p>
          
          <h2>1. Medicines, Australian Brands & Dosing</h2>
          ${currentGuide.medicines
            .map(
              (m) => `
            <div class="med-card">
              <div class="med-title">${m.name}</div>
              <div style="margin: 4px 0;"><span class="badge">Brands: ${m.brandExamples}</span><span class="badge">Min Age: ${m.minAge}</span></div>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Dosing:</strong> ${m.dosing}</p>
              <p style="font-size: 12px; margin: 4px 0;"><strong>Pregnancy:</strong> ${m.pregnancySafety} | <strong>Lactation:</strong> ${m.breastfeedingSafety}</p>
              ${m.extraInfo ? `<p style="font-size: 11px; color: #475569; margin: 4px 0;"><em>Clinical Pearls:</em> ${m.extraInfo}</p>` : ''}
            </div>
          `
            )
            .join('')}

          <h2>2. Urgent Referral Criteria & Red Flags</h2>
          <ul>${currentGuide.referralCriteria.map((r) => `<li>${r}</li>`).join('')}</ul>

          <h2>3. Non-Pharmacological Advice & Patient Counseling</h2>
          <ul>${currentGuide.nonPharmAdvice.map((n) => `<li>${n}</li>`).join('')}</ul>

          <h2>4. Key Clinical Practice Pearls</h2>
          <ul>${currentGuide.clinicalNotes.map((c) => `<li>${c}</li>`).join('')}</ul>
          
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  if (!isOpen || !isMounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isFa ? 'راهنمای بالینی OTC استرالیا' : 'Australian OTC Clinical Monograph'}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/80 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className={`relative w-full sm:w-[680px] md:w-[780px] lg:w-[860px] max-w-full h-full app-card border-0 sm:border-l app-border shadow-2xl app-text overflow-hidden flex flex-col ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b app-border bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-lg shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black app-text">
                  {isFa ? 'کتابچه راهنمای بالینی OTC استرالیا' : 'Australian OTC Clinical Monograph'}
                </h2>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {ALL_OTC_HANDBOOK_DISEASES.length} {isFa ? 'وضعیت بالینی' : 'Conditions'}
                </span>
              </div>
              <p className="text-[11px] app-muted">
                {isFa
                  ? 'دوزینگ دقیق اطفال و بزرگسالان، ایمنی بارداری/شیردهی، برندهای استرالیایی و پرچم‌های قرمز'
                  : 'Dosing, Min Age, Pregnancy/Lactation Safety, Aussie Brands & Red Flags'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrintMonograph}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border app-border cursor-pointer"
              title={isFa ? 'چاپ مونوگراف' : 'Print Monograph'}
            >
              <Printer className="w-4 h-4" />
            </button>

            <button
              onClick={() => handleCopySummary(currentGuide)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                copiedId === currentGuide.id
                  ? 'bg-emerald-600 text-white border-emerald-500'
                  : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700'
              }`}
            >
              {copiedId === currentGuide.id ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedId === currentGuide.id ? (isFa ? 'کپی شد!' : 'Copied!') : (isFa ? 'کپی خلاصه' : 'Copy')}</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition border app-border cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Search & Category Bar */}
        <div className="p-3 border-b app-border bg-black/30 space-y-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isFa ? 'جستجو در نام بیماری، دارو، برند استرالیایی یا علامت...' : 'Search disease, drug, brand or symptom...'}
                className="w-full pl-3 pr-9 py-1.5 rounded-xl bg-slate-950 border app-border text-xs app-text placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Quick condition selector dropdown */}
            <select
              value={currentGuide.id}
              onChange={(e) => setSelectedGuideId(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-950 border app-border text-xs app-text focus:outline-none focus:border-emerald-500/50 font-bold max-w-[220px]"
            >
              {ALL_OTC_HANDBOOK_DISEASES.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.condition}
                </option>
              ))}
            </select>
          </div>

          {/* Quick horizontal categories chip list */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar text-[11px]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded-lg font-medium whitespace-nowrap transition cursor-pointer shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-emerald-600 text-white font-bold shadow-sm'
                    : 'bg-slate-900/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {cat === 'ALL' ? (isFa ? 'تمام گروه‌ها' : 'All Categories') : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Selected Condition Header Banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border-b app-border shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  {currentGuide.category}
                </span>
                <span className="text-[10px] app-muted font-mono">ID: {currentGuide.id}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black app-text flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>{currentGuide.condition}</span>
              </h3>
            </div>

            {/* Symptoms Tags */}
            <div className="flex flex-wrap items-center gap-1 text-[10px]">
              {currentGuide.symptoms.map((sym, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700"
                >
                  {sym}
                </span>
              ))}
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
            <button
              onClick={() => setActiveTab('medicines')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'medicines'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Pill className="w-3.5 h-3.5" />
              <span>{isFa ? `داروها و دوزینگ (${currentGuide.medicines.length})` : `Medicines & Dosing (${currentGuide.medicines.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('referral')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'referral'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span>{isFa ? `پرچم‌های قرمز و ارجاع (${currentGuide.referralCriteria.length})` : `Red Flags (${currentGuide.referralCriteria.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('nonpharm')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'nonpharm'
                  ? 'bg-sky-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              <span>{isFa ? `توصیه‌های غیردارویی (${currentGuide.nonPharmAdvice.length})` : `Non-Pharm Advice (${currentGuide.nonPharmAdvice.length})`}</span>
            </button>

            <button
              onClick={() => setActiveTab('notes')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'notes'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <Info className="w-3.5 h-3.5 text-amber-400" />
              <span>{isFa ? `نکات بورد داروسازی (${currentGuide.clinicalNotes.length})` : `Practice Pearls (${currentGuide.clinicalNotes.length})`}</span>
            </button>
          </div>
        </div>

        {/* Scrollable Content Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
          {/* TAB 1: MEDICINES & DOSING */}
          {activeTab === 'medicines' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>{isFa ? 'فرآورده‌های دارویی با برندهای معتبر استرالیا و راهنمای دوزینگ:' : 'Approved Australian medicines, brands & exact dosing rules:'}</span>
                <span className="font-mono text-[11px] text-emerald-400">{currentGuide.medicines.length} Options</span>
              </div>

              <div className="space-y-3">
                {currentGuide.medicines.map((med, idx) => {
                  const isExpanded = !!expandedMedIds[idx];

                  return (
                    <div
                      key={idx}
                      className={`rounded-2xl border transition-all duration-200 shadow-md overflow-hidden ${
                        isExpanded
                          ? 'bg-slate-950/95 border-emerald-500/60 ring-1 ring-emerald-500/20'
                          : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/40'
                      }`}
                    >
                      {/* Drug Header - Clickable Accordion Row */}
                      <div
                        onClick={() => toggleMedExpand(idx)}
                        className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-mono text-xs font-bold shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-sm sm:text-base text-emerald-300 truncate">
                              {med.name}
                            </h4>
                            {!isExpanded && (
                              <div className="text-xs text-slate-400 font-medium flex items-center gap-1.5 truncate mt-0.5">
                                <span className="text-amber-400 font-bold">{isFa ? 'برند:' : 'Brand:'}</span>
                                <span className="text-slate-200 truncate">{med.brandExamples}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Right Pill & Chevron */}
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 hidden sm:inline-block">
                            {isExpanded ? (isFa ? 'بستن' : 'Close') : (isFa ? 'مشاهده مشخصات' : 'View Details')}
                          </span>
                          <div className={`p-1.5 rounded-lg border transition ${isExpanded ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Details */}
                      {isExpanded && (
                        <div className="p-4 pt-2 border-t border-slate-800/80 space-y-3 bg-slate-900/30 animate-fadeIn">
                          {/* Aussie Brands & Badges */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                            <div className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
                              <span className="text-amber-400 font-bold">{isFa ? 'برندهای رایج استرالیا:' : 'Aussie Brands:'}</span>
                              <span className="font-bold text-slate-100">{med.brandExamples}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center gap-1">
                                <Baby className="w-3 h-3" />
                                <span>{med.minAge}</span>
                              </span>
                              <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-1">
                                <HeartPulse className="w-3 h-3" />
                                <span>Preg: {med.pregnancySafety}</span>
                              </span>
                            </div>
                          </div>

                          {/* Dosing Section */}
                          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                              <Clock className="w-3.5 h-3.5" />
                              <span>{isFa ? 'دستور و دوزینگ بالینی (Adult & Paediatric Dosing):' : 'Clinical Dosing Protocol:'}</span>
                            </div>
                            <p className="text-xs text-slate-200 font-medium leading-relaxed font-mono pl-5">
                              {med.dosing}
                            </p>
                          </div>

                          {/* Safety Details: Pregnancy & Breastfeeding */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-0.5">
                              <span className="font-bold text-purple-300 block text-[11px]">
                                {isFa ? 'ایمنی در بارداری (Pregnancy Category):' : 'Pregnancy Safety:'}
                              </span>
                              <p className="text-slate-200 text-[11px] leading-relaxed">{med.pregnancySafety}</p>
                            </div>

                            <div className="p-2.5 rounded-xl bg-teal-950/40 border border-teal-500/30 space-y-0.5">
                              <span className="font-bold text-teal-300 block text-[11px]">
                                {isFa ? 'ایمنی در دوران شیردهی (Lactation):' : 'Breastfeeding Safety:'}
                              </span>
                              <p className="text-slate-200 text-[11px] leading-relaxed">{med.breastfeedingSafety}</p>
                            </div>
                          </div>

                          {/* Extra Pearls */}
                          {med.extraInfo && (
                            <div className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-0.5 text-amber-200">
                              <span className="font-bold text-amber-400 block text-[11px] flex items-center gap-1">
                                <Sparkles className="w-3.5 h-3.5" />
                                <span>{isFa ? 'نکات کلیدی مشاوره داروساز (Key Pearls & Counseling):' : 'Clinical Pearl & Counseling:'}</span>
                              </span>
                              <p className="leading-relaxed text-[11px]">{med.extraInfo}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: RED FLAGS & REFERRAL */}
          {activeTab === 'referral' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-rose-950/50 border border-rose-500/40 space-y-3">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm border-b border-rose-500/30 pb-2">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <span>{isFa ? 'معیارهای قطعی ارجاع به پزشک (Mandatory GP Referral Criteria)' : 'Mandatory GP Referral Criteria & Red Flags'}</span>
                </div>

                <p className="text-xs text-rose-200 leading-relaxed">
                  {isFa
                    ? 'در صورت حضور هر یک از موارد زیر، از تحویل داروی OTC خودداری کرده و بیمار را جهت ارزیابی تشخیصی فوری به پزشک عمومی ارجاع دهید:'
                    : 'If any of the following clinical indicators are present, withhold OTC treatment and initiate urgent medical referral:'}
                </p>

                <ul className="space-y-2 pt-1">
                  {currentGuide.referralCriteria.map((ref, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/40 border border-rose-500/20 text-xs text-rose-100 font-medium"
                    >
                      <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        🚩
                      </span>
                      <span className="leading-relaxed">{ref}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: NON-PHARM ADVICE */}
          {activeTab === 'nonpharm' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-sky-950/50 border border-sky-500/40 space-y-3">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-sm border-b border-sky-500/30 pb-2">
                  <Sparkles className="w-5 h-5 shrink-0" />
                  <span>{isFa ? 'توصیه‌ها و اقدامات غیردارویی (Non-Pharmacological Measures)' : 'Non-Pharmacological Measures & Lifestyle Guidance'}</span>
                </div>

                <p className="text-xs text-sky-200 leading-relaxed">
                  {isFa
                    ? 'اقدامات غیردارویی خط اول یا مکمل حیاتی در تسریع بهبودی و پیشگیری از عود مجدد هستند:'
                    : 'Non-pharmacological interventions form the cornerstone of supportive care and prevent relapse:'}
                </p>

                <ul className="space-y-2 pt-1">
                  {currentGuide.nonPharmAdvice.map((adv, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-2.5 rounded-xl bg-black/40 border border-sky-500/20 text-xs text-sky-100 font-medium"
                    >
                      <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        ✓
                      </span>
                      <span className="leading-relaxed">{adv}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: CLINICAL PRACTICE NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-3">
              <div className="p-4 rounded-2xl bg-amber-950/50 border border-amber-500/40 space-y-3">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm border-b border-amber-500/30 pb-2">
                  <Info className="w-5 h-5 shrink-0" />
                  <span>{isFa ? 'نکات اختصاصی هیئت داروسازی (Pharmacy Board & APF Clinical Pearls)' : 'Australian Pharmacy Practice Pearls & APF Notes'}</span>
                </div>

                <ul className="space-y-2 pt-1">
                  {currentGuide.clinicalNotes.map((note, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 p-3 rounded-xl bg-black/40 border border-amber-500/20 text-xs text-amber-100 font-medium leading-relaxed"
                    >
                      <span className="text-amber-400 font-bold text-sm shrink-0">💡</span>
                      <span>{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t app-border bg-black/40 flex items-center justify-between gap-3 text-xs shrink-0">
          <span className="text-[11px] app-muted truncate">
            {isFa
              ? 'بر اساس راهنماهای استاندارد APF و کتابچه مرجع OTC داروسازان استرالیا'
              : 'Based on Australian Pharmaceutical Formulary (APF) & OTC Guidelines'}
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold transition cursor-pointer border app-border"
          >
            {isFa ? 'بستن' : 'Close'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
