'use client';

import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { DiseaseInfo, DISEASE_CATEGORIES } from '@/data/diseasesRegistry';
import { Language } from '@/types/pharmacy';
import { findHandbookGuide, OTCDrugInfo } from '@/src/data/otcHandbookData';
import { getOtcClinicalTranslation, translateMedicineAttribute, translateClinicalText } from '@/data/otcClinicalTranslations';
import { resolveDrugMonographDetails, extractSpecificAlternativeDrug } from '@/lib/clinicalDrugEnricher';
import { useStudyTrackerContext } from './study/StudyTrackerContext';
import { StudyStatusBadge } from './study/StudyStatusBadge';
import {
  X,
  Stethoscope,
  Activity,
  Pill,
  ShieldAlert,
  Sparkles,
  Dna,
  Award,
  Info,
  Baby,
  HeartPulse,
  Clock,
  ArrowRight,
  BookmarkCheck,
  Tag,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  UserCheck,
  AlertCircle,
  Check,
  FileText,
} from 'lucide-react';

interface DiseaseDetailModalProps {
  disease: DiseaseInfo | null;
  language: Language;
  onClose: () => void;
  onNavigateToModule?: (moduleNumber: 1 | 2 | 3, scenarioId?: string) => void;
}

export interface ParsedDosingSegment {
  type: 'adult' | 'child' | 'infant' | 'max' | 'schedule' | 'note';
  icon: string;
  labelEn: string;
  labelFa: string;
  text: string;
}

/**
 * Intelligent parser that splits continuous dosing text into separated, population-specific lines.
 */
export function parseDosingToSegments(rawDosing: string, isFa: boolean): ParsedDosingSegment[] {
  if (!rawDosing) return [];

  const clean = rawDosing.trim();
  const segments: ParsedDosingSegment[] = [];

  // Pattern 1: Check for explicit Adult / Child / Infant markers
  const hasAdult = /adults?|بزرگسال/i.test(clean);
  const hasChild = /child(ren)?|paediatric|پدیاتریک|کودک/i.test(clean);
  const hasInfant = /infants?|نوزاد/i.test(clean);

  if (hasAdult || hasChild || hasInfant) {
    const adultMatch = clean.match(/(?:Adults?(?:\s*(?:>|over)\s*\d+\s*(?:yo|y|years))?|بزرگسالان?)\s*[:—\-]?\s*([^.]+(?:\([^)]+\))?[^.]*?)(?=(?:Child(?:ren)?|Infants?|کودکان?|نوزادان?)|$)/i);
    const childMatch = clean.match(/(?:Child(?:ren)?(?:\s*(?:>|under|\d+-\d+)?\s*(?:yo|y|years|m|months))?|کودکان?|پدیاتریک)\s*[:—\-]?\s*([^.]+(?:\([^)]+\))?[^.]*?)(?=(?:Infants?|Adults?|نوزادان?)|$)/i);
    const infantMatch = clean.match(/(?:Infants?(?:\s*\d+-\d+\s*m)?|نوزادان?)\s*[:—\-]?\s*([^.]+(?:\([^)]+\))?[^.]*?)(?=(?:Adults?|Child(?:ren)?)|$)/i);

    if (adultMatch && adultMatch[1]?.trim()) {
      segments.push({
        type: 'adult',
        icon: '👨',
        labelEn: 'Adults (>12 yrs)',
        labelFa: 'بزرگسالان و بالای ۱۲ سال',
        text: adultMatch[1].trim().replace(/^[;,\s]+|[;,\s]+$/g, ''),
      });
    }
    if (childMatch && childMatch[1]?.trim()) {
      segments.push({
        type: 'child',
        icon: '🧒',
        labelEn: 'Children / Paediatric',
        labelFa: 'کودکان و اطفال',
        text: childMatch[1].trim().replace(/^[;,\s]+|[;,\s]+$/g, ''),
      });
    }
    if (infantMatch && infantMatch[1]?.trim()) {
      segments.push({
        type: 'infant',
        icon: '👶',
        labelEn: 'Infants & Neonates',
        labelFa: 'نوزادان و خردسالان',
        text: infantMatch[1].trim().replace(/^[;,\s]+|[;,\s]+$/g, ''),
      });
    }

    if (segments.length > 0) {
      return segments;
    }
  }

  // Pattern 2: Numbered steps like "1) ... 2) ..." or "۱) ... ۲) ..."
  if (/(?:[1-9]\)|\([1-9]\)|[۱-۹]\)|\([۱-۹]\))/.test(clean)) {
    const parts = clean.split(/(?:[1-9]\)|\([1-9]\)|[۱-۹]\)|\([۱-۹]\))/g).map(p => p.trim()).filter(Boolean);
    parts.forEach((p, idx) => {
      segments.push({
        type: 'schedule',
        icon: idx === 0 ? '①' : idx === 1 ? '②' : idx === 2 ? '③' : '④',
        labelEn: `${idx + 1}`,
        labelFa: `${idx + 1}`,
        text: p,
      });
    });
    return segments;
  }

  // Pattern 3: Multi-sentence or semicolon-separated clauses
  const sentences = clean.split(/(?<=[.؛;])\s+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 1) {
    sentences.forEach((s, idx) => {
      const isWarning = /caution|warning|contraindicated|avoid|ممنوع|هشدار|پرهیز/i.test(s);
      const isMax = /max|maximum|حداکثر/i.test(s);
      segments.push({
        type: isWarning ? 'note' : isMax ? 'max' : 'schedule',
        icon: isWarning ? '⚠️' : isMax ? '🛑' : '⏱️',
        labelEn: isWarning ? 'Precaution' : isMax ? 'Max Daily Limit' : `${idx + 1}`,
        labelFa: isWarning ? 'احتیاط و منع مصرف' : isMax ? 'سقف مجاز روزانه' : `${idx + 1}`,
        text: s,
      });
    });
    return segments;
  }

  // Default single item
  return [
    {
      type: 'schedule',
      icon: '⏱️',
      labelEn: 'Administration & Dosage',
      labelFa: 'دوز و شیوه مصرف استاندارد',
      text: clean,
    },
  ];
}

/**
 * Splits extra clinical pearls into distinct bullet lines
 */
export function parseExtraInfoToNotes(rawInfo?: string): string[] {
  if (!rawInfo) return [];
  return rawInfo
    .split(/(?<=[.!؟?])\s+|\s*[;؛—]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 2);
}

/**
 * Splits general text into bullet items
 */
export function parseTextToBulletList(rawText?: string): string[] {
  if (!rawText) return [];
  if (/(?:[1-9]\)|\([1-9]\)|[۱-۹]\)|\([۱-۹]\))/.test(rawText)) {
    return rawText
      .split(/(?:[1-9]\)|\([1-9]\)|[۱-۹]\)|\([۱-۹]\))/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 1);
  }
  return rawText
    .split(/(?<=[.؛!؟?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

const emptySubscribe = () => () => {};

export const DiseaseDetailModal: React.FC<DiseaseDetailModalProps> = ({
  disease,
  language,
  onClose,
  onNavigateToModule,
}) => {
  const isFa = language === 'fa';
  const isMounted = React.useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [expandedMedIds, setExpandedMedIds] = useState<Record<number, boolean>>({});
  const [isSynonymsOpen, setIsSynonymsOpen] = useState<boolean>(false);
  const [activePhaseTab, setActivePhaseTab] = useState<'profile' | 'treatment' | 'medicines'>('profile');

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const { markItemViewed, toggleItemCompleted, isViewed, isCompleted } = useStudyTrackerContext();

  const toggleMedExpand = (idx: number) => {
    setExpandedMedIds((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  if (!disease || !isMounted || typeof document === 'undefined') return null;

  const category =
    DISEASE_CATEGORIES.find((c) => c.id === disease.categoryId) || DISEASE_CATEGORIES[0];

  const viewed = isViewed(disease.id);
  const completed = isCompleted(disease.id);

  // Resolve rich clinical translation
  const clinicalTranslation = getOtcClinicalTranslation(disease.id);

  // Resolve medicines & monograph data (from disease object or fallback helper)
  const fallbackGuide = findHandbookGuide(disease);
  const baseMedicines: OTCDrugInfo[] = disease.medicines || fallbackGuide?.medicines || [];

  // Full Clean Primary Display Name (Complete name without truncated words or broken text)
  let diseaseTitle = '';
  if (isFa) {
    diseaseTitle = disease.name.fa || clinicalTranslation?.cleanFaName || disease.name.en || '';
  } else {
    diseaseTitle = disease.name.en || clinicalTranslation?.cleanEnName || disease.name.fa || 'Clinical Condition';
  }

  // Layman terms, patient expressions and clinical synonyms
  const laymanTerms: string[] = isFa
    ? (clinicalTranslation?.commonSynonymsFa && clinicalTranslation.commonSynonymsFa.length > 0
        ? clinicalTranslation.commonSynonymsFa
        : (disease.synonyms || []))
    : (clinicalTranslation?.commonSynonymsEn && clinicalTranslation.commonSynonymsEn.length > 0
        ? clinicalTranslation.commonSynonymsEn
        : (disease.synonyms ? disease.synonyms.filter(s => /^[a-zA-Z0-9\s.,!?:;()\-]+$/.test(s.trim())) : []));

  const altLanguageTitle = isFa
    ? (disease.name.en || clinicalTranslation?.cleanEnName || '')
    : (disease.name.fa || clinicalTranslation?.cleanFaName || '');

  // Primary Common Name & Brand
  const primaryCommonName = isFa
    ? (clinicalTranslation?.primaryCommonNameFa || disease.synonyms?.[0] || disease.name.fa)
    : (clinicalTranslation?.primaryCommonNameEn || disease.synonyms?.[0] || disease.name.en);

  const primaryBrand = clinicalTranslation?.primaryBrand || (baseMedicines[0]?.brandExamples || disease.synonyms?.[1] || 'Standard OTC');

  // Full Brand List & Synonyms for Popup
  const australianBrands = clinicalTranslation?.australianBrands || baseMedicines.map(m => ({
    brand: m.brandExamples,
    generic: m.name,
    form: m.dosing || 'Standard formulation',
  }));

  const allSynonyms = isFa
    ? (clinicalTranslation?.commonSynonymsFa || disease.synonyms || [])
    : (clinicalTranslation?.commonSynonymsEn || (disease.synonyms ? disease.synonyms.filter(s => /^[a-zA-Z0-9\s.,!?:;()\-]+$/.test(s.trim())) : []));

  const totalExtraBrands = Math.max(0, (australianBrands.length > 1 ? australianBrands.length - 1 : 0) + (allSynonyms.length > 1 ? allSynonyms.length - 1 : 0));

  // First-Line structured data extraction & cleansing
  const firstLineData = clinicalTranslation?.firstLine;
  
  let rawDrug = isFa
    ? (firstLineData?.drugNameFa || disease.treatment?.firstLine?.fa || (fallbackGuide?.medicines?.[0] ? fallbackGuide.medicines[0].name : ''))
    : (firstLineData?.drugNameEn || disease.treatment?.firstLine?.en || (fallbackGuide?.medicines?.[0] ? fallbackGuide.medicines[0].name : ''));

  let rawDosing = isFa
    ? (firstLineData?.dosingFa || (fallbackGuide?.medicines?.[0] ? fallbackGuide.medicines[0].dosing : disease.instructions?.fa))
    : (firstLineData?.dosingEn || (fallbackGuide?.medicines?.[0] ? fallbackGuide.medicines[0].dosing : disease.instructions?.en));

  // Clean rawDrug if it contains concatenated dosing or prefixes
  if (rawDrug.includes('— نحوه مصرف') || rawDrug.includes('— Dosing:')) {
    const parts = rawDrug.split(/—\s*(?:نحوه مصرف(?: و دوزینگ)?|Dosing):\s*/i);
    if (parts[0]) rawDrug = parts[0].replace(/^خط اول درمان:\s*/i, '').trim();
    if (parts[1] && (!firstLineData?.dosingFa || rawDosing === disease.instructions?.fa)) {
      rawDosing = parts[1].trim();
    }
  } else {
    rawDrug = rawDrug.replace(/^خط اول درمان:\s*/i, '').trim();
  }

  const firstLineDrug = rawDrug || (isFa ? 'درمان دارویی استاندارد' : 'Standard Pharmacotherapy');

  const firstLineClass = isFa
    ? (firstLineData?.drugClassFa || 'داروی استاندارد خط اول (First-Line Pharmacotherapy)')
    : (firstLineData?.drugClassEn || 'Standard First-Line Pharmacotherapy');

  // Build Comprehensive Medicines Deck (First-Line + Second-Line Alternatives + Approved Options)
  const medicines: (OTCDrugInfo & {
    tier: 'first-line' | 'second-line' | 'adjunctive';
    roleExplanation?: { fa: string; en: string };
    drugClass?: string;
  })[] = [];
  const addedNames = new Set<string>();

  // 1. If baseMedicines has rich structured monographs, use them with full priority
  if (baseMedicines.length > 0) {
    baseMedicines.forEach((m, idx) => {
      const norm = m.name.toLowerCase();
      if (!addedNames.has(norm)) {
        const tier = idx === 0 ? 'first-line' : (idx === 1 ? 'second-line' : 'adjunctive');
        const roleExp = tier === 'first-line'
          ? {
              fa: '🥇 خط اول درمان استاندارد طلایی (Gold Standard) بر اساس فارماکوپه داروسازی استرالیا (APF) و گایدلاین‌های بالینی PSA/AMH.',
              en: '🥇 First-Line Gold Standard Pharmacotherapy per Australian Pharmacy Formulary (APF) & PSA/AMH clinical guidelines.',
            }
          : tier === 'second-line'
          ? {
              fa: '🥈 خط دوم / درمان جایگزین بالینی در صورت عدم پاسخ به خط اول یا وجود کنترااندیکاسیون.',
              en: '🥈 Second-Line / Alternative clinical therapy for inadequate response or contraindications.',
            }
          : {
              fa: '💊 داروی کمکی / گزینه درمانی تکمیلی تأییدشده در پروتکل‌های درمانی استرالیا.',
              en: '💊 Adjunctive / Approved supplementary therapy in Australian clinical protocols.',
            };

        medicines.push({
          ...m,
          tier,
          roleExplanation: roleExp,
        });
        addedNames.add(norm);
      }
    });
  } else {
    // Fallback: If no baseMedicines defined, synthesize from firstLineData & translations
    if (firstLineDrug) {
      medicines.push({
        name: firstLineDrug,
        brandExamples: firstLineData?.keyBrands?.join(', ') || primaryBrand,
        dosing: rawDosing || (isFa ? 'مطابق با پروتکل استاندارد دوزینگ بالینی استرالیا.' : 'Follow Australian standard clinical dosing protocol.'),
        minAge: 'Adults & Children >12y',
        pregnancySafety: 'Check Category',
        breastfeedingSafety: 'Compatible',
        extraInfo: firstLineData?.keyWarningsFa || firstLineData?.keyWarningsEn || '',
        tier: 'first-line',
        drugClass: firstLineClass,
        roleExplanation: {
          fa: '🥇 خط اول درمان استاندارد طلایی (Gold Standard) بر اساس فارماکوپه داروسازی استرالیا (APF) و انجمن داروسازان (PSA).',
          en: '🥇 First-Line Gold Standard Pharmacotherapy according to Australian Pharmacy Formulary (APF) & PSA guidelines.',
        },
      });
      addedNames.add(firstLineDrug.toLowerCase());
    }

    const altDrugParsed = extractSpecificAlternativeDrug(
      firstLineData?.alternativesFa,
      firstLineData?.alternativesEn,
      australianBrands
    );

    if (altDrugParsed) {
      const altDrugName = isFa ? altDrugParsed.nameFa : altDrugParsed.nameEn;
      const normAltName = altDrugName.toLowerCase();
      
      const isDup = Array.from(addedNames).some(name => normAltName.includes(name) || name.includes(normAltName));
      if (!isDup) {
        medicines.push({
          name: altDrugName,
          brandExamples: altDrugParsed.brandExamples,
          dosing: isFa ? altDrugParsed.dosingFa : altDrugParsed.dosingEn,
          minAge: 'Standard age range',
          pregnancySafety: 'Consult Pharmacist',
          breastfeedingSafety: 'Compatible with monitoring',
          extraInfo: isFa ? altDrugParsed.reasonFa : altDrugParsed.reasonEn,
          tier: 'second-line',
          roleExplanation: {
            fa: `🥈 خط دوم / درمان جایگزین بالینی: ${altDrugParsed.reasonFa}`,
            en: `🥈 Second-Line / Clinical Alternative: ${altDrugParsed.reasonEn}`,
          },
        });
        addedNames.add(normAltName);
      }
    }
  }

  // 2. Add any additional unique commercial brands that are not yet covered
  for (const b of australianBrands) {
    const normGeneric = (b.generic || '').toLowerCase();
    if (normGeneric && !Array.from(addedNames).some(name => normGeneric.includes(name) || name.includes(normGeneric))) {
      medicines.push({
        name: b.generic,
        brandExamples: b.brand,
        dosing: b.form || (isFa ? 'طبق فرمولاسیون دارویی و برچسب بسته‌بندی استرالیا.' : 'As per Australian TGA approved product pack.'),
        minAge: 'Standard clinical age range',
        pregnancySafety: 'Refer to product monograph',
        breastfeedingSafety: 'Compatible with monitoring',
        extraInfo: isFa ? `فرم دارویی رایج در استرالیا: ${b.form || 'استاندارد'}` : `Australian formulation: ${b.form || 'Standard'}`,
        tier: 'adjunctive',
        roleExplanation: {
          fa: `📦 فرمولاسیون تجاری مجاز در داروخانه‌های استرالیا (${b.brand}).`,
          en: `📦 TGA approved commercial formulation in Australian pharmacies (${b.brand}).`,
        },
      });
      addedNames.add(normGeneric);
    }
  }

  const firstLineDosingSegments = parseDosingToSegments(rawDosing, isFa);

  const firstLineOnset = isFa
    ? (firstLineData?.onsetCourseFa || 'تسکین علامتی سریع مطابق با دوزبندی استاندارد.')
    : (firstLineData?.onsetCourseEn || 'Rapid symptomatic relief following standard dosage schedule.');
  const onsetBullets = parseTextToBulletList(firstLineOnset);

  const firstLineWarnings = isFa
    ? (firstLineData?.keyWarningsFa || 'قبل از مصرف به منع مصرف‌ها، تداخلات و شرایط بیمار توجه شود.')
    : (firstLineData?.keyWarningsEn || 'Check contraindications, drug interactions, and special patient populations prior to supply.');
  const warningsBullets = parseTextToBulletList(firstLineWarnings);

  // Symptoms extraction strictly adhering to current language
  let resolvedSymptoms: string[] = [];
  if (isFa) {
    if (clinicalTranslation?.symptomsFa && clinicalTranslation.symptomsFa.length > 0) {
      resolvedSymptoms = clinicalTranslation.symptomsFa;
    } else if (fallbackGuide?.symptoms && fallbackGuide.symptoms.length > 0) {
      resolvedSymptoms = fallbackGuide.symptoms.map((s: string) => translateClinicalText(s));
    } else if (disease.symptoms && disease.symptoms.length > 0) {
      resolvedSymptoms = disease.symptoms.map(s => translateClinicalText(s));
    }
  } else {
    // Strictly English
    if (fallbackGuide?.symptoms && fallbackGuide.symptoms.length > 0) {
      resolvedSymptoms = fallbackGuide.symptoms.flatMap((s: string) => s.split(/[,;•]/).map(t => t.trim()).filter(Boolean));
    } else if (disease.symptoms && disease.symptoms.length > 0) {
      resolvedSymptoms = disease.symptoms.flatMap((s) => s.split(/[,;•]/).map(t => t.trim()).filter(Boolean));
    } else if (disease.pathophysiology?.en) {
      resolvedSymptoms = [disease.pathophysiology.en];
    }
  }

  // Clinical & Diagnostic Notes extraction strictly adhering to current language
  let resolvedClinicalNotes: string[] = [];
  if (isFa) {
    if (clinicalTranslation?.clinicalPearlsFa && clinicalTranslation.clinicalPearlsFa.length > 0) {
      resolvedClinicalNotes = clinicalTranslation.clinicalPearlsFa;
    } else if (fallbackGuide?.clinicalNotes && fallbackGuide.clinicalNotes.length > 0) {
      resolvedClinicalNotes = fallbackGuide.clinicalNotes.map((n: string) => translateClinicalText(n));
    } else if (disease.clinicalNotes && disease.clinicalNotes.length > 0) {
      resolvedClinicalNotes = disease.clinicalNotes.map(n => translateClinicalText(n));
    }
  } else {
    // Strictly English
    if (fallbackGuide?.clinicalNotes && fallbackGuide.clinicalNotes.length > 0) {
      resolvedClinicalNotes = fallbackGuide.clinicalNotes;
    } else if (disease.clinicalNotes && disease.clinicalNotes.length > 0) {
      resolvedClinicalNotes = disease.clinicalNotes;
    }
  }

  // Red Flags extraction strictly adhering to current language
  const redFlagsList: string[] = isFa
    ? (clinicalTranslation?.redFlagsFa || disease.redFlags?.fa || (fallbackGuide?.referralCriteria?.map(r => translateClinicalText(r))) || [])
    : (fallbackGuide?.referralCriteria || disease.redFlags?.en || []);

  // Pharmacist Counseling & Non-pharm advice strictly adhering to current language
  let pharmacistInstructions = '';
  if (isFa) {
    if (clinicalTranslation?.nonPharmFa && clinicalTranslation.nonPharmFa.length > 0) {
      pharmacistInstructions = clinicalTranslation.nonPharmFa.map((a, i) => `${i + 1}) ${a}`).join('\n');
    } else if (disease.instructions?.fa && !/^[a-zA-Z0-9\s.,!?:;()\-]+$/.test(disease.instructions.fa.trim())) {
      pharmacistInstructions = disease.instructions.fa;
    } else if (fallbackGuide?.nonPharmAdvice && fallbackGuide.nonPharmAdvice.length > 0) {
      pharmacistInstructions = fallbackGuide.nonPharmAdvice.map((a: string, i: number) => `${i + 1}) ${translateClinicalText(a)}`).join('\n');
    } else if (disease.nonPharmAdvice && disease.nonPharmAdvice.length > 0) {
      pharmacistInstructions = disease.nonPharmAdvice.map((a, i) => `${i + 1}) ${translateClinicalText(a)}`).join('\n');
    }
  } else {
    // Strictly English
    if (fallbackGuide?.nonPharmAdvice && fallbackGuide.nonPharmAdvice.length > 0) {
      pharmacistInstructions = fallbackGuide.nonPharmAdvice.map((a: string, i: number) => `${i + 1}) ${a}`).join('\n');
    } else if (disease.instructions?.en) {
      pharmacistInstructions = disease.instructions.en;
    } else if (disease.nonPharmAdvice && disease.nonPharmAdvice.length > 0) {
      pharmacistInstructions = disease.nonPharmAdvice.map((a, i) => `${i + 1}) ${a}`).join('\n');
    }
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={diseaseTitle}
      className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-3 md:p-5 bg-black/85 backdrop-blur-md animate-fadeIn overflow-hidden"
      onClick={onClose}
    >
      <div
        className="relative w-full h-[100dvh] sm:h-[94vh] sm:max-h-[880px] max-w-5xl lg:max-w-6xl xl:max-w-7xl rounded-none sm:rounded-3xl app-card border-0 sm:border app-border shadow-2xl app-text overflow-hidden flex flex-col bg-slate-900 select-text"
        onClick={(e) => e.stopPropagation()}
      >
        {/* FIXED COMPACT TOP HEADER */}
        <div className="flex items-center justify-between px-3.5 sm:px-6 py-2.5 sm:py-3 border-b app-border bg-slate-950/95 backdrop-blur-md shrink-0 z-20 gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 overflow-hidden min-w-0 flex-1">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
              <Stethoscope className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
            </div>

            <div className="min-w-0 flex-1 flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setIsSynonymsOpen((prev) => !prev)}
                className="text-start rtl:text-right group flex items-center gap-1.5 cursor-pointer hover:opacity-90 transition min-w-0 max-w-full"
                title={isFa ? 'کلیک برای مشاهده اصطلاحات عامیانه و سایر نام‌ها' : 'Click to view patient terms & synonyms'}
              >
                <h2 className="text-sm sm:text-base md:text-lg font-black text-slate-100 group-hover:text-emerald-400 transition leading-tight truncate">
                  {diseaseTitle}
                </h2>
                {(laymanTerms.length > 0 || altLanguageTitle) && (
                  <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold shrink-0 flex items-center gap-1">
                    <Sparkles className="w-2.5 h-2.5 text-amber-400" />
                    <span>
                      {isSynonymsOpen
                        ? (isFa ? 'بستن اصطلاحات' : 'Close Terms')
                        : (isFa ? 'اصطلاحات بیماران' : 'Layman Terms')}
                    </span>
                    <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isSynonymsOpen ? 'rotate-180' : ''}`} />
                  </span>
                )}
              </button>

              <StudyStatusBadge
                language={language}
                viewed={viewed}
                completed={completed}
                size="sm"
                onToggleComplete={(e) => {
                  e.stopPropagation();
                  toggleItemCompleted(
                    4,
                    disease.id,
                    { fa: disease.name.fa || disease.name.en, en: disease.name.en || disease.name.fa },
                    { fa: category.name.fa || category.name.en, en: category.name.en || category.name.fa }
                  );
                }}
              />
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 sm:p-2 rounded-xl bg-slate-800/90 hover:bg-rose-900/90 text-slate-300 hover:text-white border border-slate-700 shadow-md backdrop-blur-md transition cursor-pointer flex items-center justify-center shrink-0"
            title={isFa ? 'بستن (Esc)' : 'Close (Esc)'}
            aria-label={isFa ? 'بستن' : 'Close'}
          >
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* EXPANDING LAYMAN TERMS & SYNONYMS PANEL */}
        {isSynonymsOpen && (
          <div className="px-4 sm:px-6 py-3 bg-slate-950/95 border-b border-emerald-500/25 space-y-2.5 animate-fadeIn shrink-0 z-15 select-text shadow-lg">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>{isFa ? 'اصطلاحات عامیانه بیماران و نام‌های دیگر بیماری:' : 'Patient Layman Terms & Synonyms:'}</span>
              </span>
              <button
                type="button"
                onClick={() => setIsSynonymsOpen(false)}
                className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
              >
                {isFa ? 'بستن ×' : 'Close ×'}
              </button>
            </div>

            {/* Alternative Title */}
            {altLanguageTitle && (
              <div className="text-xs text-slate-300 flex items-center gap-2">
                <span className="text-slate-500 font-medium">{isFa ? 'نام علمی / انگلیسی:' : 'Scientific / Alternative Name:'}</span>
                <span className="font-bold text-white font-mono bg-slate-900 px-2 py-0.5 rounded-lg border border-slate-800">
                  {altLanguageTitle}
                </span>
              </div>
            )}

            {/* Layman terms chips */}
            {laymanTerms.length > 0 && (
              <div className="space-y-1">
                <span className="text-[11px] text-slate-400 block font-medium">
                  {isFa ? '🗣️ کلمات و اصطلاحاتی که بیماران در داروخانه به کار می‌برند:' : '🗣️ Terms and expressions used by patients:'}
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {laymanTerms.map((term, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/30 text-emerald-200 text-xs font-bold shadow-2xs"
                    >
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Australian brands quick list */}
            {australianBrands.length > 0 && (
              <div className="pt-1.5 border-t border-slate-800/80 flex items-center gap-2 flex-wrap text-[11px]">
                <span className="text-slate-500 font-medium">{isFa ? '📦 برندهای مطرح استرالیا:' : '📦 Key Brands:'}</span>
                {australianBrands.slice(0, 4).map((b, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-slate-300 font-mono">
                    {b.brand}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3-PHASE TAB BAR */}
        <div className="grid grid-cols-3 gap-1 p-1.5 sm:p-2 bg-slate-950/90 border-b border-slate-800 text-xs shrink-0">
          <button
            type="button"
            onClick={() => setActivePhaseTab('profile')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activePhaseTab === 'profile'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span className="truncate">{isFa ? '۱. علائم و خط قرمزها' : '1. Signs & Red Flags'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhaseTab('treatment')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activePhaseTab === 'treatment'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Pill className="w-3.5 h-3.5" />
            <span className="truncate">{isFa ? '۲. پروتکل درمان و دوزاژ' : '2. Treatment & Dosing'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePhaseTab('medicines')}
            className={`py-2 rounded-xl font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
              activePhaseTab === 'medicines'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="truncate">
              {isFa ? `۳. داروهای قفسه (${medicines.length})` : `3. Medicines (${medicines.length})`}
            </span>
          </button>
        </div>

        {/* SINGLE SCROLLABLE BODY */}
        <div className="p-3 sm:p-5 md:p-6 overflow-y-auto space-y-3.5 sm:space-y-4 md:space-y-5 text-xs sm:text-sm leading-relaxed custom-scrollbar flex-1 min-h-0 select-text">

          {/* ============================================================ */}
          {/* PHASE 1: SIGNS, SYMPTOMS & RED FLAGS                         */}
          {/* ============================================================ */}
          {activePhaseTab === 'profile' && (
            <div className="space-y-4 animate-fadeIn">
              {/* 1. Pathophysiology & Clinical Presentations (Symptoms Grid) */}
              {resolvedSymptoms.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl app-card border app-border space-y-2.5 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-sky-700 dark:text-sky-300">
                      <Activity className="w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0" />
                      <span>{isFa ? 'پاتوفیزیولوژی و علائم بالینی شایع:' : 'Pathophysiology & Clinical Presentations:'}</span>
                    </div>
                    <span className="text-[10px] font-mono text-sky-400 font-bold">
                      {resolvedSymptoms.length} {isFa ? 'علامت' : 'symptoms'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {resolvedSymptoms.map((sym, sIdx) => (
                      <div
                        key={sIdx}
                        dir="auto"
                        className="p-2.5 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-900 dark:text-sky-200 text-xs font-bold flex items-center gap-2"
                      >
                        <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
                        <span className="truncate">{sym}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. URGENT REFERRAL CRITERIA / RED FLAGS */}
              {redFlagsList.length > 0 && (
                <div className="p-4 sm:p-5 rounded-2xl bg-rose-950/40 border border-rose-500/35 space-y-3 shadow-md">
                  <div className="flex items-center justify-between border-b border-rose-500/25 pb-2">
                    <div className="flex items-center gap-2 text-rose-400 font-black text-xs sm:text-sm">
                      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{isFa ? '🚨 معیارهای ارجاع فوری به پزشک و خط قرمزها (Red Flags):' : '🚨 Urgent Referral Criteria (Red Flags):'}</span>
                    </div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                      {redFlagsList.length} {isFa ? 'هشدار' : 'flags'}
                    </span>
                  </div>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm text-rose-200 font-medium">
                    {redFlagsList.map((ref, idx) => (
                      <li key={idx} className="flex items-start gap-2 bg-rose-950/40 p-2.5 sm:p-3 rounded-xl border border-rose-500/25">
                        <span className="text-rose-400 font-bold shrink-0 mt-0.5">🚩</span>
                        <span className="leading-relaxed">{ref}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* 4. Clinical & Diagnostic Notes */}
              {resolvedClinicalNotes.length > 0 && (
                <div className="p-3.5 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-300">
                    <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>{isFa ? '💡 نکات عملکردی و تشخیصی داروساز (Clinical Pearls):' : '💡 Clinical Pearls:'}</span>
                  </div>
                  <ul className="space-y-1.5 text-xs sm:text-sm text-amber-950 dark:text-amber-100 font-medium">
                    {resolvedClinicalNotes.map((note, nIdx) => (
                      <li key={nIdx} dir="auto" className="flex items-start gap-2 leading-relaxed">
                        <span className="text-amber-500 font-bold shrink-0 mt-1">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Jump to Phase 2 Button */}
              <button
                type="button"
                onClick={() => setActivePhaseTab('treatment')}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer transition"
              >
                <span>{isFa ? 'مشاهده پروتکل خط اول درمان و دوزاژ سنی ➜' : 'View First-Line Treatment & Dosing ➜'}</span>
              </button>
            </div>
          )}

          {/* ============================================================ */}
          {/* PHASE 2: TREATMENT PROTOCOL & DOSING                         */}
          {/* ============================================================ */}
          {activePhaseTab === 'treatment' && (
            <div className="space-y-4 animate-fadeIn">
              {/* First-Line Treatment Protocol Card */}
              <div className="p-3.5 sm:p-5 rounded-2xl app-card border border-emerald-500/35 space-y-3.5 shadow-md bg-emerald-500/5 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                  <h3 className="font-black text-xs sm:text-sm text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-500 shrink-0" />
                    <span>{isFa ? 'پروتکل خط اول درمان (APF & PSA First-Line):' : 'First-Line Pharmacotherapy:'}</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                    APF First-Line
                  </span>
                </div>

                <div className="p-3 sm:p-4 rounded-xl app-card border border-emerald-500/25 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2 border-b app-border pb-2.5">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-black text-xs border border-emerald-500/30 flex items-center justify-center font-mono shrink-0">
                          1
                        </span>
                        <span className="text-sm sm:text-base font-black text-emerald-800 dark:text-emerald-200">
                          {firstLineDrug}
                        </span>
                      </div>
                      <div className="text-xs text-sky-700 dark:text-sky-300 font-medium flex items-center gap-1.5 pt-0.5">
                        <Tag className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                        <span>{isFa ? 'طبقه‌بندی دارویی:' : 'Class:'} {firstLineClass}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dosing Section: Population Segments Breakdown */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-1.5 text-sky-700 dark:text-sky-400 font-bold text-xs sm:text-sm">
                      <Clock className="w-4 h-4 shrink-0 text-sky-600 dark:text-sky-400" />
                      <span>{isFa ? 'دوزبندی و نحوه مصرف استرالیا (تفکیک رده‌های سنی):' : 'Australian Dosage & Administration by Age Group:'}</span>
                    </div>

                    <div className="grid grid-cols-1 gap-2">
                      {firstLineDosingSegments.map((seg, sIdx) => (
                        <div
                          key={sIdx}
                          className="p-2.5 sm:p-3 rounded-xl app-bg border app-border flex items-start gap-2.5 text-xs sm:text-sm"
                        >
                          <span className="text-base sm:text-lg leading-none shrink-0 mt-0.5">{seg.icon}</span>
                          <div className="space-y-0.5 flex-1">
                            <span className="font-bold text-sky-700 dark:text-sky-300 text-[11px] block">
                              {isFa ? seg.labelFa : seg.labelEn}:
                            </span>
                            <p className="text-xs sm:text-sm app-text font-medium leading-relaxed">
                              {seg.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Grid 2-cols: Onset & Warnings */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold text-xs sm:text-sm">
                        <Activity className="w-3.5 h-3.5 shrink-0" />
                        <span>{isFa ? '⚡ شروع اثر و طول دوره:' : '⚡ Onset & Duration:'}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-amber-950 dark:text-amber-100">
                        {onsetBullets.map((b, bIdx) => (
                          <li key={bIdx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 shrink-0">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-rose-700 dark:text-rose-400 font-bold text-xs sm:text-sm">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>{isFa ? '⚠️ هشدارهای کلیدی و احتیاطات:' : '⚠️ Key Warnings:'}</span>
                      </div>
                      <ul className="space-y-1 text-xs text-rose-950 dark:text-rose-100">
                        {warningsBullets.map((w, wIdx) => (
                          <li key={wIdx} className="flex items-start gap-1.5">
                            <span className="text-rose-500 shrink-0">•</span>
                            <span>{w}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pharmacist Counseling & Non-Pharm Instructions */}
              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-900/80 border app-border space-y-2">
                <div className="flex items-center gap-2 text-sky-400 font-bold text-xs sm:text-sm border-b app-border pb-1.5">
                  <Activity className="w-4 h-4 shrink-0" />
                  <span>{isFa ? 'دستورالعمل مشاوره و توصیه‌های غیردارویی داروساز:' : 'Pharmacist Counseling & Lifestyle Protocol:'}</span>
                </div>
                <p className="text-xs sm:text-sm text-slate-200 whitespace-pre-line leading-relaxed">
                  {pharmacistInstructions}
                </p>
              </div>

              {/* Next/Back Navigation */}
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setActivePhaseTab('profile')}
                  className="flex-1 py-3 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-1.5 border border-slate-700 cursor-pointer"
                >
                  <span>{isFa ? '← بازگشت به علائم' : '← Back to Signs'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActivePhaseTab('medicines')}
                  className="flex-1 py-3 rounded-xl bg-teal-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
                >
                  <span>{isFa ? `مشاهده داروهای قفسه (${medicines.length}) ➜` : `View Medicines (${medicines.length}) ➜`}</span>
                </button>
              </div>
            </div>
          )}

          {/* ============================================================ */}
          {/* PHASE 3: APPROVED OTC MEDICINES & SHELF LINKING              */}
          {/* ============================================================ */}
          {activePhaseTab === 'medicines' && (
            <div className="space-y-4 animate-fadeIn">
              {medicines.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b app-border pb-2">
                    <h4 className="font-bold text-xs sm:text-sm app-text flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300">
                      <Pill className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                      <span>{isFa ? 'داروهای درمانی، برندهای استرالیایی و مونوگراف بالینی:' : 'Clinical Pharmacotherapies, Australian Brands & Dosing:'}</span>
                    </h4>
                    
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const allOpen = medicines.every((_, i) => expandedMedIds[i]);
                          const nextState: Record<number, boolean> = {};
                          medicines.forEach((_, i) => {
                            nextState[i] = !allOpen;
                          });
                          setExpandedMedIds(nextState);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-500/30 text-[11px] font-bold transition cursor-pointer"
                      >
                        {medicines.every((_, i) => expandedMedIds[i]) 
                          ? (isFa ? 'بستن همه' : 'Collapse All') 
                          : (isFa ? 'باز کردن همه' : 'Expand All')}
                      </button>
                      <span className="text-[11px] app-muted font-mono font-bold bg-slate-500/10 px-2 py-0.5 rounded-md">
                        {medicines.length} {isFa ? 'دارو' : 'options'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
                    {medicines.map((med: any, idx: number) => {
                      const isExpanded = expandedMedIds[idx] ?? true;
                      const enriched = resolveDrugMonographDetails(med.name, med.brandExamples, med.dosing, med.extraInfo, med.tier);
                      const medDosingSegments = parseDosingToSegments(med.dosing, isFa);
                      const medNotes = parseExtraInfoToNotes(med.extraInfo);

                      // Combine extra notes with enriched pearls without duplicate lines
                      const combinedPearlsFa = Array.from(new Set([
                        ...(medNotes.map(n => translateMedicineAttribute(n, 'extra'))),
                        ...enriched.keyPearls.fa
                      ])).filter(Boolean);

                      const combinedPearlsEn = Array.from(new Set([
                        ...medNotes,
                        ...enriched.keyPearls.en
                      ])).filter(Boolean);

                      const displayPearls = isFa ? combinedPearlsFa : combinedPearlsEn;
                      const isFirstLine = med.tier === 'first-line';
                      const isSecondLine = med.tier === 'second-line';

                      return (
                        <div
                          key={idx}
                          className={`rounded-2xl border transition-all duration-200 shadow-xs overflow-hidden ${
                            isExpanded
                              ? isFirstLine
                                ? 'app-card border-emerald-500/60 ring-2 ring-emerald-500/20'
                                : isSecondLine
                                ? 'app-card border-purple-500/60 ring-2 ring-purple-500/20'
                                : 'app-card border-indigo-500/60 ring-2 ring-indigo-500/20'
                              : 'app-card border-slate-300 dark:border-slate-800 hover:border-indigo-400/50'
                          }`}
                        >
                          {/* Accordion Header */}
                          <div
                            onClick={() => toggleMedExpand(idx)}
                            className="p-3 sm:p-3.5 flex items-center justify-between gap-3 cursor-pointer select-none"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 flex-1">
                              <span className={`w-6 h-6 rounded-lg font-bold text-xs border flex items-center justify-center font-mono shrink-0 ${
                                isFirstLine
                                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                  : isSecondLine
                                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                                  : 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
                              }`}>
                                {idx + 1}
                              </span>
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <div className="font-black text-xs sm:text-sm text-sky-700 dark:text-sky-400 truncate">
                                    {isFa ? enriched.fullName.fa : enriched.fullName.en}
                                  </div>
                                  
                                  {/* Clear Treatment Tier Badge */}
                                  {isFirstLine ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-xs">
                                      <Award className="w-3 h-3 text-emerald-500 shrink-0" />
                                      <span>{isFa ? '🥇 خط اول درمان استاندارد' : '🥇 First-Line Standard'}</span>
                                    </span>
                                  ) : isSecondLine ? (
                                    <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/40 text-[10px] sm:text-[11px] font-black flex items-center gap-1 shadow-xs">
                                      <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                                      <span>{isFa ? '🥈 خط دوم / جایگزین بالینی' : '🥈 Second-Line / Alternative'}</span>
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full bg-slate-500/15 text-slate-700 dark:text-slate-300 border border-slate-500/30 text-[10px] font-bold">
                                      {isFa ? '💊 داروی کمکی / OTC' : '💊 Adjunctive / OTC'}
                                    </span>
                                  )}
                                </div>

                                {!isExpanded && (
                                  <div className="text-[10px] sm:text-[11px] app-muted truncate mt-0.5 flex items-center gap-1.5">
                                    <Tag className="w-3 h-3 text-amber-600 dark:text-amber-400 shrink-0" />
                                    <span className="text-amber-700 dark:text-amber-200/90 truncate font-semibold">
                                      {isFa ? `برندها: ${med.brandExamples}` : `Brands: ${med.brandExamples}`}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20 hidden sm:inline-block">
                                {isExpanded ? (isFa ? 'بستن' : 'Close') : (isFa ? 'مشاهده مشخصات و مکانیسم' : 'View Monograph')}
                              </span>
                              <div className={`p-1.5 rounded-lg border transition ${isExpanded ? 'bg-indigo-600 text-white border-indigo-500' : 'app-bg app-muted border-slate-300 dark:border-slate-700'}`}>
                                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              </div>
                            </div>
                          </div>

                          {/* Expanded Details */}
                          {isExpanded && (
                            <div className="p-3 sm:p-4 pt-2 border-t app-border space-y-3 bg-black/5 dark:bg-slate-950/40 animate-fadeIn">
                              {/* Brand and Safety Badges */}
                              <div className="flex flex-wrap items-center justify-between gap-2 border-b app-border pb-2.5">
                                <div className="text-xs sm:text-sm text-amber-800 dark:text-amber-300/90 font-medium flex items-center gap-1.5">
                                  <Tag className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                                  <span>
                                    {isFa ? 'برندهای رایج استرالیا:' : 'Australian Brands:'}{' '}
                                    <span className="font-black text-amber-900 dark:text-amber-200">{med.brandExamples}</span>
                                  </span>
                                </div>

                                <div className="flex flex-wrap items-center gap-1.5 text-[10px] sm:text-[11px]">
                                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-800 dark:text-sky-300 border border-sky-500/30 flex items-center gap-1 font-bold">
                                    <Baby className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                                    <span>
                                      {isFa ? translateMedicineAttribute(med.minAge, 'minAge') : med.minAge}
                                    </span>
                                  </span>
                                  <span className="px-2.5 py-1 rounded-lg bg-purple-500/15 text-purple-800 dark:text-purple-300 border border-purple-500/30 flex items-center gap-1 font-bold">
                                    <HeartPulse className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                                    <span>
                                      {isFa ? translateMedicineAttribute(med.pregnancySafety, 'pregnancy') : med.pregnancySafety}
                                    </span>
                                  </span>
                                </div>
                              </div>

                              {/* 1. CLINICAL LINE & ROLE BOX */}
                              {med.roleExplanation && (
                                <div className={`p-2.5 sm:p-3 rounded-xl border space-y-1 ${
                                  isFirstLine
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200'
                                    : isSecondLine
                                    ? 'bg-purple-500/10 border-purple-500/30 text-purple-950 dark:text-purple-200'
                                    : 'bg-slate-500/10 border-slate-500/30 app-text'
                                }`}>
                                  <div className="flex items-center gap-1.5 text-xs font-bold">
                                    <Award className={`w-3.5 h-3.5 shrink-0 ${isFirstLine ? 'text-emerald-500' : isSecondLine ? 'text-purple-500' : 'text-slate-400'}`} />
                                    <span>{isFa ? 'جایگاه در الگوریتم درمان (Treatment Line & Role):' : 'Clinical Treatment Line & Role:'}</span>
                                  </div>
                                  <p className="text-xs sm:text-sm leading-relaxed font-semibold">
                                    {isFa ? med.roleExplanation.fa : med.roleExplanation.en}
                                  </p>
                                </div>
                              )}

                              {/* 2. MECHANISM OF ACTION SECTION */}
                              <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                                <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-400 text-xs font-bold">
                                  <Dna className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                  <span>{isFa ? 'مکانیسم اثر دارو (Mechanism of Action):' : 'Mechanism of Action:'}</span>
                                </div>
                                <p className="text-xs sm:text-sm text-indigo-950 dark:text-indigo-200 leading-relaxed font-medium">
                                  {isFa ? enriched.mechanism.fa : enriched.mechanism.en}
                                </p>
                              </div>

                              {/* 3. DOSING BREAKDOWN SECTION */}
                              <div className="p-2.5 sm:p-3 rounded-xl app-card border app-border space-y-2">
                                <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 text-xs sm:text-sm font-bold">
                                  <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                  <span>{isFa ? 'دوزبندی تفکیک‌شده و نحوه مصرف استرالیا:' : 'Australian Dosage Breakdown:'}</span>
                                </div>

                                <div className="grid grid-cols-1 gap-1.5">
                                  {medDosingSegments.map((seg, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-2 rounded-lg app-bg border app-border flex items-start gap-2 text-xs sm:text-sm"
                                    >
                                      <span className="text-base leading-none shrink-0 mt-0.5">{seg.icon}</span>
                                      <div className="space-y-0.5 flex-1">
                                        <span className="font-bold text-emerald-700 dark:text-emerald-300 text-[10px] sm:text-[11px] block">
                                          {isFa ? seg.labelFa : seg.labelEn}:
                                        </span>
                                        <p className="text-xs sm:text-sm app-text font-medium leading-relaxed">
                                          {isFa ? translateMedicineAttribute(seg.text, 'dosing') : seg.text}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* 4. CLINICAL PEARLS & EXTRACTED TEXT NOTES */}
                              {displayPearls.length > 0 && (
                                <div className="text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 bg-amber-500/10 border border-amber-500/20 p-2.5 sm:p-3 rounded-xl space-y-1.5">
                                  <div className="flex items-center gap-1 text-amber-700 dark:text-amber-400 font-bold text-xs">
                                    <span>💡</span>
                                    <span>{isFa ? 'نکات مهم بالینی، مشاوره‌ای و هشدارهای دارو:' : 'Clinical Pearls, Safety & Counseling Notes:'}</span>
                                  </div>
                                  <ul className="space-y-1.5 text-xs sm:text-sm text-amber-950 dark:text-amber-200/90 pr-2">
                                    {displayPearls.map((note, nIdx) => (
                                      <li key={nIdx} className="flex items-start gap-1.5 leading-relaxed">
                                        <span className="text-amber-400 shrink-0 mt-0.5">•</span>
                                        <span>{note}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 rounded-2xl app-card border app-border text-center app-muted text-xs space-y-2">
                  <Pill className="w-8 h-8 mx-auto text-slate-600" />
                  <p>{isFa ? 'داروی بدون نسخه اختصاصی در مونوگراف ثبت نشده است.' : 'No OTC medicines registered.'}</p>
                </div>
              )}

              {/* Jump to Module 2 Shelf */}
              {onNavigateToModule && (
                <div className="pt-2 flex justify-between items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePhaseTab('treatment')}
                    className="py-2.5 px-4 rounded-xl bg-slate-800 text-slate-300 font-bold text-xs flex items-center gap-1 border border-slate-700 cursor-pointer"
                  >
                    <span>{isFa ? '← بازگشت به پروتکل درمان' : '← Back to Protocol'}</span>
                  </button>

                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToModule(2);
                    }}
                    className="py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1.5 shadow-md cursor-pointer"
                  >
                    <span>{isFa ? 'مشاهده در قفسه محصولات (ماژول ۲)' : 'View in Shelf (Module 2)'}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
};


