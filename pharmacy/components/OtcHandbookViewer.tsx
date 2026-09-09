'use client';

import React, { useState, useMemo } from 'react';
import {
  OTC_HANDBOOK_DATA,
  OTCDiseaseGuide,
  OTCDrugInfo,
} from '@/src/data/otcHandbookData';
import { Language } from '@/types/pharmacy';
import {
  BookOpen,
  Search,
  AlertTriangle,
  Pill,
  Baby,
  HeartPulse,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Info,
  ChevronDown,
  ChevronUp,
  Tag,
  ExternalLink,
  Printer,
  Copy,
  Check,
  X,
  Stethoscope,
  Clock,
  Filter,
} from 'lucide-react';

interface OtcHandbookViewerProps {
  language: Language;
  onClose?: () => void;
  isModal?: boolean;
}

export const OtcHandbookViewer: React.FC<OtcHandbookViewerProps> = ({
  language,
  onClose,
  isModal = false,
}) => {
  const isFa = language === 'fa';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedConditionId, setExpandedConditionId] = useState<string | null>(
    OTC_HANDBOOK_DATA[0]?.id || null
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedMedKeys, setExpandedMedKeys] = useState<Record<string, boolean>>({});

  const toggleMedExpand = (key: string) => {
    setExpandedMedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>();
    OTC_HANDBOOK_DATA.forEach((item) => cats.add(item.category));
    return ['ALL', ...Array.from(cats)];
  }, []);

  // Filter conditions
  const filteredConditions = useMemo(() => {
    return OTC_HANDBOOK_DATA.filter((item) => {
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase();
      const matchCondition = item.condition.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      const matchSymptoms = item.symptoms.some((s) => s.toLowerCase().includes(q));
      const matchReferral = item.referralCriteria.some((r) => r.toLowerCase().includes(q));
      const matchNonPharm = item.nonPharmAdvice.some((n) => n.toLowerCase().includes(q));
      const matchNotes = item.clinicalNotes.some((c) => c.toLowerCase().includes(q));
      const matchMedicines = item.medicines.some(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.brandExamples.toLowerCase().includes(q) ||
          m.dosing.toLowerCase().includes(q) ||
          (m.extraInfo && m.extraInfo.toLowerCase().includes(q))
      );

      return (
        matchCondition ||
        matchCategory ||
        matchSymptoms ||
        matchReferral ||
        matchNonPharm ||
        matchNotes ||
        matchMedicines
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleCopySummary = (guide: OTCDiseaseGuide) => {
    const medSummary = guide.medicines
      .map(
        (m) =>
          `• ${m.name} (${m.brandExamples}): ${m.dosing} [Age: ${m.minAge}, Preg: ${m.pregnancySafety}, Lact: ${m.breastfeedingSafety}]`
      )
      .join('\n');

    const text = `=== OTC HANDBOOK: ${guide.condition} ===\nCategory: ${guide.category}\n\n[Symptoms]\n${guide.symptoms.join('\n')}\n\n[Red Flags / Referral]\n${guide.referralCriteria.join('\n')}\n\n[Medicines]\n${medSummary}\n\n[Non-Pharm Advice]\n${guide.nonPharmAdvice.join('\n')}\n\n[Clinical Notes]\n${guide.clinicalNotes.join('\n')}`;

    navigator.clipboard.writeText(text);
    setCopiedId(guide.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const content = (
    <div className="flex flex-col h-full space-y-4">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900/60 via-teal-900/50 to-slate-900/80 p-5 rounded-2xl border border-emerald-500/30 backdrop-blur-md shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-emerald-500/20 text-emerald-300 rounded-xl border border-emerald-500/40 shadow-inner">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  {isFa ? 'کتابچه مرجع درمان‌های OTC استرالیا' : 'Australian OTC Clinical Handbook'}
                </h2>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 rounded-full">
                  {OTC_HANDBOOK_DATA.length} / 26 {isFa ? 'بیماری بالینی' : 'Conditions'}
                </span>
              </div>
              <p className="text-xs text-emerald-200/80 mt-1">
                {isFa
                  ? 'پروتکل‌های بالینی خط اول، دارودرمانی OTC، دوزبندی، ایمنی بارداری/شیردهی و علائم خطر ارجاع به پزشک'
                  : 'First-line OTC protocols, dosing, pregnancy/breastfeeding safety, brand examples, and red-flag referrals'}
              </p>
            </div>
          </div>

          {isModal && onClose && (
            <button
              onClick={onClose}
              className="self-end md:self-center p-2 text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 rounded-xl border border-slate-700 transition"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search & Category Filter */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-4 pt-4 border-t border-emerald-500/20">
          <div className="md:col-span-7 relative">
            <Search className="w-4 h-4 text-emerald-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                isFa
                  ? 'جستجو بر اساس بیماری، دارو، برند (مثل Rectogesic, Chlorsig, Benzac)، علائم...'
                  : 'Search by condition, medicine, brand (e.g. Rectogesic, Chlorsig, Benzac), symptom...'
              }
              className="w-full pl-4 pr-10 py-2 text-sm bg-slate-950/80 border border-emerald-500/30 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
              >
                {isFa ? 'پاک کردن' : 'Clear'}
              </button>
            )}
          </div>

          <div className="md:col-span-5 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
            <Filter className="w-4 h-4 text-emerald-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-950/80 border border-emerald-500/30 rounded-xl text-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/50"
            >
              <option value="ALL">{isFa ? 'همه دسته‌بندی‌ها (All Categories)' : 'All Categories'}</option>
              {categories
                .filter((c) => c !== 'ALL')
                .map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      {/* Conditions List */}
      <div className="space-y-4 overflow-y-auto max-h-[calc(85vh-160px)] pr-1">
        {filteredConditions.length === 0 ? (
          <div className="p-8 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
            <Stethoscope className="w-10 h-10 mx-auto mb-2 text-slate-500 opacity-60" />
            <p className="text-sm font-medium">
              {isFa ? 'هیچ موردی مطابق با جستجوی شما یافت نشد.' : 'No clinical guides match your search.'}
            </p>
          </div>
        ) : (
          filteredConditions.map((item) => {
            const isExpanded = expandedConditionId === item.id;
            return (
              <div
                key={item.id}
                id={`otc-guide-${item.id}`}
                className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
                  isExpanded
                    ? 'bg-slate-900/95 border-emerald-500/50 ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 hover:bg-slate-900/80 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Condition Summary Header */}
                <div
                  onClick={() => setExpandedConditionId(isExpanded ? null : item.id)}
                  className="p-4 cursor-pointer flex items-start sm:items-center justify-between gap-3 select-none"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2.5 rounded-xl border transition ${
                        isExpanded
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-slate-800 text-slate-300 border-slate-700'
                      }`}
                    >
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-bold text-white tracking-wide">
                          {item.condition}
                        </h3>
                        <span className="px-2 py-0.5 text-[11px] font-medium bg-slate-800 text-slate-300 rounded-md border border-slate-700">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        <strong className="text-slate-300">{isFa ? 'علائم:' : 'Symptoms:'}</strong>{' '}
                        {item.symptoms.join(' • ')}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopySummary(item);
                      }}
                      className="p-1.5 text-xs text-slate-400 hover:text-emerald-300 bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition"
                      title={isFa ? 'کپی خلاصه بالینی' : 'Copy clinical summary'}
                    >
                      {copiedId === item.id ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <div className="p-1 text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-5 pt-2 border-t border-slate-800/80 space-y-5 bg-black/20 text-sm">
                    {/* Symptoms & Red Flags Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Symptoms */}
                      <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800/90">
                        <div className="flex items-center gap-2 text-sky-400 font-semibold mb-2">
                          <Stethoscope className="w-4 h-4" />
                          <span>{isFa ? 'علائم و تظاهرات بالینی (Symptoms)' : 'Clinical Symptoms'}</span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-slate-200">
                          {item.symptoms.map((sym, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                              <span>{sym}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Referral Criteria */}
                      <div className="p-4 rounded-xl bg-rose-950/30 border border-rose-500/30">
                        <div className="flex items-center gap-2 text-rose-300 font-semibold mb-2">
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <span>
                            {isFa
                              ? 'معیارهای ارجاع به پزشک (Referral Red Flags)'
                              : 'Medical Referral Criteria'}
                          </span>
                        </div>
                        <ul className="space-y-1.5 text-xs text-rose-100/90">
                          {item.referralCriteria.map((ref, idx) => (
                            <li key={idx} className="flex items-start gap-2">
                              <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>{ref}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Medicines Section */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                        <Pill className="w-4 h-4" />
                        <span>
                          {isFa
                            ? 'دارودرمانی و گزینه‌های بدون نسخه (OTC Medicines & Dosing)'
                            : 'Pharmacological Options & Dosing'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        {item.medicines.map((med, mIdx) => {
                          const medKey = `${item.id}-${mIdx}`;
                          const isExpanded = !!expandedMedKeys[medKey];

                          return (
                            <div
                              key={mIdx}
                              className={`rounded-xl border transition-all duration-200 shadow-sm overflow-hidden ${
                                isExpanded
                                  ? 'bg-slate-950/95 border-emerald-500/50 ring-1 ring-emerald-500/20'
                                  : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              {/* Clickable Accordion Header */}
                              <div
                                onClick={() => toggleMedExpand(medKey)}
                                className="p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                              >
                                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                                  <span className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center font-mono shrink-0">
                                    {mIdx + 1}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <h4 className="text-sm font-bold text-emerald-300 truncate">
                                      {med.name}
                                    </h4>
                                    {!isExpanded && (
                                      <p className="text-xs text-slate-400 truncate mt-0.5">
                                        <strong className="text-slate-300">
                                          {isFa ? 'برند:' : 'Brand:'}
                                        </strong>{' '}
                                        <span className="text-amber-200 font-medium">{med.brandExamples}</span>
                                      </p>
                                    )}
                                  </div>
                                </div>

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
                                  {/* Brands & Age */}
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
                                    <div>
                                      <p className="text-xs text-slate-400">
                                        <strong className="text-slate-300">
                                          {isFa ? 'برندهای استرالیا:' : 'AU Brands:'}
                                        </strong>{' '}
                                        <span className="text-amber-200 font-medium">{med.brandExamples}</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-lg">
                                        Age: {med.minAge}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Dosing */}
                                  <div className="text-xs text-slate-200">
                                    <span className="text-slate-400 font-medium">
                                      {isFa ? 'دستور و دوز مصرف:' : 'Dosing & Protocol:'}{' '}
                                    </span>
                                    <span className="text-white font-medium">{med.dosing}</span>
                                  </div>

                                  {/* Safety Badges Grid */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                                      <Baby className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="text-slate-400 font-medium">
                                          {isFa ? 'بارداری (Pregnancy):' : 'Pregnancy:'}{' '}
                                        </span>
                                        <span className="text-purple-200">{med.pregnancySafety}</span>
                                      </div>
                                    </div>
                                    <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-800 flex items-start gap-2">
                                      <HeartPulse className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                                      <div>
                                        <span className="text-slate-400 font-medium">
                                          {isFa ? 'شیردهی (Breastfeeding):' : 'Breastfeeding:'}{' '}
                                        </span>
                                        <span className="text-pink-200">{med.breastfeedingSafety}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Extra Info */}
                                  {med.extraInfo && (
                                    <div className="p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200/90 flex items-start gap-2">
                                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                      <span>{med.extraInfo}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Non-Pharmacological Advice */}
                    <div className="p-4 rounded-xl bg-slate-950/70 border border-teal-500/20">
                      <div className="flex items-center gap-2 text-teal-300 font-semibold mb-2 text-xs">
                        <CheckCircle2 className="w-4 h-4 text-teal-400" />
                        <span>
                          {isFa
                            ? 'توصیه‌های غیردارویی و تغییر سبک زندگی (Non-Pharmacological Advice)'
                            : 'Non-Pharmacological Advice'}
                        </span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-slate-200">
                        {item.nonPharmAdvice.map((adv, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-teal-400 font-bold">•</span>
                            <span>{adv}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Clinical Notes */}
                    {item.clinicalNotes.length > 0 && (
                      <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-amber-300">
                            {isFa ? 'نکات کلیدی بالینی (Clinical Pearls):' : 'Clinical Pearls:'}{' '}
                          </strong>
                          {item.clinicalNotes.join(' ')}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/80 backdrop-blur-md animate-in fade-in">
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-slate-950 border border-emerald-500/30 rounded-3xl p-4 md:p-6 shadow-2xl overflow-hidden">
          {content}
        </div>
      </div>
    );
  }

  return content;
};
