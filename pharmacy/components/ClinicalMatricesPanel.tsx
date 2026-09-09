'use client';

import React, { useState } from 'react';
import { Language } from '@/types/pharmacy';
import {
  ShieldAlert,
  Sparkles,
  Activity,
  Syringe,
  ThermometerSnowflake,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  HeartPulse,
  Eye,
  FileText,
  Scale,
  RefreshCw,
  Baby,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
} from 'lucide-react';
import {
  MatrixSectionSelector,
  MatrixSection,
  MatrixSectionId,
  MatrixTopic,
} from '@/components/shelf/MatrixSectionSelector';
import { MatrixTopicsAccordion } from '@/components/shelf/MatrixTopicsAccordion';

interface ClinicalMatricesPanelProps {
  language: Language;
  onFilterShelfByConcept?: (conceptId: string) => void;
  searchQuery?: string;
  onSearchQueryChange?: (query: string) => void;
}

type ActiveTab = MatrixSectionId;

// 1. Antimicrobial Matrix Data
interface PathogenCoverage {
  pathogen: string;
  nameFa: string;
  gram: 'Gram+' | 'Gram-' | 'Atypical' | 'Anaerobe';
  mechanism: string;
  activeDrugs: string[];
  resistantDrugs: string[];
  tgNotesFa: string;
  tgNotesEn: string;
}

const PATHOGEN_MATRIX: PathogenCoverage[] = [
  {
    pathogen: 'Staphylococcus aureus (MSSA)',
    nameFa: 'استافیلوکوک اورئوس حساس به متی‌سیلین (MSSA)',
    gram: 'Gram+',
    mechanism: 'تولید آنزیم بتالاکتاماز (Penicillinase) که پنی‌سیلین و آموکسی‌سیلین ساده را هیدرولیز و بی‌اثر می‌کند.',
    activeDrugs: ['Flucloxacillin', 'Cephalexin', 'Augmentin Duo Forte', 'Cefazolin IV'],
    resistantDrugs: ['Amoxicillin (Plain)', 'Penicillin V', 'Ampicillin'],
    tgNotesFa: 'فلوکلوگزاسیلین (Flucloxacillin) و سفالکسین (Cephalexin) به دلیل ساختار شیمیایی ویژه در برابر بتالاکتاماز پایدار هستند و خط اول درمان پوست/بافت نرم در MSSA می‌باشند.',
    tgNotesEn: 'Flucloxacillin and Cephalexin are penicillinase-stable and represent standard 1st-line therapy for MSSA skin infections.',
  },
  {
    pathogen: 'MRSA (Methicillin-Resistant S. aureus)',
    nameFa: 'استافیلوکوک اورئوس مقاوم به متی‌سیلین (MRSA)',
    gram: 'Gram+',
    mechanism: 'تغییر ساختار پروتئین متصل‌شونده به پنی‌سیلین (PBP2a) از طریق ژن mecA؛ بتالاکتام‌ها به گیرنده متصل نمی‌شوند.',
    activeDrugs: ['Vancomycin IV', 'Daptomycin', 'Linezolid', 'Trimethoprim+Sulfamethoxazole (Community MRSA)'],
    resistantDrugs: ['Flucloxacillin', 'Cephalexin', 'Augmentin', 'Cefazolin', 'Piperacillin-Tazobactam', 'Meropenem'],
    tgNotesFa: 'تمامی داروهای بتالاکتام (حتی فلوکلوگزاسیلین و سفالکسین) در برابر MRSA بی‌اثر مطلق هستند. ونکومایسین خط اول درمان بیمارستانی است.',
    tgNotesEn: 'ALL standard beta-lactams are clinically ineffective due to PBP2a conformational change. IV Vancomycin is standard inpatient therapy.',
  },
  {
    pathogen: 'Pseudomonas aeruginosa',
    nameFa: 'سودوموناس آئروژینوزا (Pseudomonas)',
    gram: 'Gram-',
    mechanism: 'پمپ‌های افلاکس غشایی، کاهش نفوذپذیری پورین‌ها و تولید آمپ‌سی بتالاکتاماز کروموزومی.',
    activeDrugs: ['Piperacillin-Tazobactam (Tazocin)', 'Ceftazidime', 'Meropenem', 'Ciprofloxacin', 'Gentamicin'],
    resistantDrugs: ['Cephalexin', 'Ceftriaxone', 'Amoxicillin-Clavulanate', 'Doxycycline'],
    tgNotesFa: 'سفالکسین و سفتریاکسون بر روی سودوموناس هیچ اثری ندارند. نیازمند بتالاکتام‌های ضدسودوموناس یا سیپروفلوکساسین است.',
    tgNotesEn: 'Cephalexin and Ceftriaxone completely lack anti-pseudomonal activity. Requires anti-pseudomonal agents (Tazocin, Ceftazidime, Ciprofloxacin).',
  },
  {
    pathogen: 'Enterococcus faecalis',
    nameFa: 'انتروکوکوس فکالیس (Enterococcus)',
    gram: 'Gram+',
    mechanism: 'مقاومت ذاتی به تمامی سفالوسپورین‌ها از طریق PBPهای کم تمایل.',
    activeDrugs: ['Amoxicillin', 'Ampicillin IV', 'Vancomycin (VRE 제외)', 'Nitrofurantoin (UTI)'],
    resistantDrugs: ['Cephalexin', 'Cefazolin', 'Ceftriaxone', 'Ceftazidime (All Cephalosporins)'],
    tgNotesFa: 'تمامی سفالوسپورین‌ها بر روی انتروکوک بی‌اثر هستند. آموکسی‌سیلین یا وانکومایسین درمان خط اول است.',
    tgNotesEn: 'All cephalosporins have zero inherent clinical activity against Enterococci. Amoxicillin or Vancomycin are required.',
  },
  {
    pathogen: 'Mycoplasma / Chlamydia (Atypicals)',
    nameFa: 'عفونت‌های آتیپیک (مایکوپلاسما و کلامیدیا)',
    gram: 'Atypical',
    mechanism: 'عدم وجود دیواره پپتیدوگلیکانی در پاتوژن؛ بنابراین آنتی‌بیوتیک‌های مهارکننده دیواره سلولی کاملاً بی‌اثرند.',
    activeDrugs: ['Doxycycline', 'Azithromycin', 'Clarithromycin', 'Levofloxacin'],
    resistantDrugs: ['All Penicillins', 'All Cephalosporins', 'Vancomycin', 'Carbapenems'],
    tgNotesFa: 'هیچ داروی بتالاکتامی روی پاتوژن‌های آتیپیک موثر نیست. ماکرولیدها و تتراسایکلین‌ها خط اول درمان می‌باشند.',
    tgNotesEn: 'Lacks cell wall; all beta-lactams and vancomycin are intrinsically inactive. Macrolides and Doxycycline are mandatory.',
  },
  {
    pathogen: 'Escherichia coli (Uncomplicated UTI)',
    nameFa: 'اشریشیا کلی در عفونت ادراری ساده',
    gram: 'Gram-',
    mechanism: 'تولید بتالاکتامازهای پلاسمیدی وسیع‌الطیف (ESBL در موارد مقاوم).',
    activeDrugs: ['Trimethoprim (300mg ONCE daily at night)', 'Cephalexin 500mg', 'Nitrofurantoin', 'Amoxicillin-Clavulanate'],
    resistantDrugs: ['Plain Amoxicillin (>50% resistance rate in Australia)'],
    tgNotesFa: 'آموکسی‌سیلین ساده به دلیل مقاومت بالای ۵۰٪ در استرالیا نباید به صورت تجربی برای UTI تجویز شود. تری‌متوپریم ۳۰۰mg شب‌ها یا سفالکسین/نیتروفورانتوئین خط اول هستند.',
    tgNotesEn: 'Plain Amoxicillin empiric therapy is inappropriate due to >50% resistance in Australia. Trimethoprim 300mg nocte or Cephalexin is 1st-line.',
  },
];

const MONITORING_SEARCH_TEXT: Record<string, string> = {
  clozapine:
    'clozapine کلوزاپین ANC WBC agranulocytosis آگرانولوسیتوز myocarditis میوکاردیت CPN CPMS CYP1A2 smoking سیگار blood register monitoring پایش',
  amiodarone:
    'amiodarone آمیودارون thyroid تیروئید TFT liver کبد LFT lungs ریه CXR ophthalmology چشم Slit-lamp pulmonary fibrosis فیبروز',
  methotrexate:
    'methotrexate متوترکسات once weekly یک بار در هفته rheumatoid arthritis آرتریت روماتوئید psoriasis پسوریازیس folic acid اسید فولیک FBC eGFR LFT',
  warfarin:
    'warfarin وارفارین Coumadin Marevan INR brand reversal خونریزی vitamin K فیتومنادیون Prothrombinex DVT PE',
};

const PREGNANCY_SEARCH_TEXT: Record<string, string> = {
  hypertension:
    'hypertension فشارخون بارداری pregnancy Labetalol Trandate Nifedipine Adalat Methyldopa ACE inhibitors Perindopril Ramipril ARBs',
  gestationalDiabetes:
    'gestational diabetes GDM دیابت بارداری OGTT Fasting insulin انسولین metformin متفورمین glucose گلوکز',
  acne:
    'acne آکنه dermatology پوست Clindamycin Dalacin Duac Erythromycin Benzoyl Peroxide Azelaic Acid Isotretinoin Roaccutane Differin Retin-A Doxycycline',
};

const VACCINE_SEARCH_TEXT: Record<string, string> = {
  spacing:
    'vaccine واکسن spacing calculator محاسبه‌گر interval فاصله live زنده inactivated غیرزنده MMR Varicella Shingrix DTPa Yellow Fever BCG Flu Hepatitis B',
  shingrix:
    'Shingrix زونا Zostavax NIP National Immunisation Program immunocompromised نقص ایمنی cold chain زنجیره سرد Strive for 5 temperature دما',
};

const pathogenToTopic = (item: PathogenCoverage): MatrixTopic => ({
  id: item.pathogen,
  titleFa: item.nameFa,
  titleEn: item.pathogen,
  searchText: [
    item.pathogen,
    item.nameFa,
    item.gram,
    item.mechanism,
    ...item.activeDrugs,
    ...item.resistantDrugs,
    item.tgNotesFa,
    item.tgNotesEn,
  ].join(' '),
});

export const MATRIX_SECTIONS: MatrixSection[] = [
  {
    id: 'ANTIMICROBIAL',
    titleFa: 'ماتریکس مقاومت میکروبی',
    titleEn: 'Antimicrobial Resistance',
    icon: ShieldAlert,
    palette: 'sky',
    topics: PATHOGEN_MATRIX.map(pathogenToTopic),
  },
  {
    id: 'VACCINE',
    titleFa: 'واکسیناسیون و زنجیره سرد',
    titleEn: 'Vaccines & Cold Chain',
    icon: Syringe,
    palette: 'purple',
    topics: [
      {
        id: 'ALL',
        titleFa: 'همه موارد این سرفصل',
        titleEn: 'All Topics in Section',
        searchText: '',
      },
      {
        id: 'spacing',
        titleFa: 'محاسبه‌گر فواصل واکسن',
        titleEn: 'Vaccine Spacing Calculator',
        searchText: VACCINE_SEARCH_TEXT.spacing,
      },
      {
        id: 'shingrix',
        titleFa: 'شینگریکس و زنجیره سرد',
        titleEn: 'Shingrix & Cold Chain',
        searchText: VACCINE_SEARCH_TEXT.shingrix,
      },
    ],
  },
  {
    id: 'MONITORING_TDM',
    titleFa: 'پایش بالینی و رجیستری TDM',
    titleEn: 'Clinical Monitoring & TDM',
    icon: Activity,
    palette: 'emerald',
    topics: [
      {
        id: 'ALL',
        titleFa: 'همه موارد این سرفصل',
        titleEn: 'All Topics in Section',
        searchText: '',
      },
      ...(['clozapine', 'amiodarone', 'methotrexate', 'warfarin'] as const).map((id) => ({
        id,
        titleFa:
          id === 'clozapine'
            ? 'کلوزاپین (رجیستری ANC)'
            : id === 'amiodarone'
              ? 'آمیودارون'
              : id === 'methotrexate'
                ? 'متوترکسات'
                : 'وارفارین و INR',
        titleEn:
          id === 'clozapine'
            ? 'Clozapine (ANC Registry)'
            : id === 'amiodarone'
              ? 'Amiodarone'
              : id === 'methotrexate'
                ? 'Methotrexate'
                : 'Warfarin & INR',
        searchText: MONITORING_SEARCH_TEXT[id],
      })),
    ],
  },
  {
    id: 'PREGNANCY_SAFETY',
    titleFa: 'ایمنی در بارداری و زنان',
    titleEn: 'Pregnancy & Women Safety',
    icon: Baby,
    palette: 'amber',
    topics: [
      {
        id: 'ALL',
        titleFa: 'همه موارد این سرفصل',
        titleEn: 'All Topics in Section',
        searchText: '',
      },
      {
        id: 'hypertension',
        titleFa: 'فشارخون در بارداری',
        titleEn: 'Hypertension in Pregnancy',
        searchText: PREGNANCY_SEARCH_TEXT.hypertension,
      },
      {
        id: 'gestationalDiabetes',
        titleFa: 'دیابت بارداری',
        titleEn: 'Gestational Diabetes',
        searchText: PREGNANCY_SEARCH_TEXT.gestationalDiabetes,
      },
      {
        id: 'acne',
        titleFa: 'آکنه و پوست',
        titleEn: 'Acne & Dermatology',
        searchText: PREGNANCY_SEARCH_TEXT.acne,
      },
    ],
  },
];

export const ClinicalMatricesPanel: React.FC<ClinicalMatricesPanelProps> = ({
  language,
  onFilterShelfByConcept,
  searchQuery,
  onSearchQueryChange,
}) => {
  const isFa = language === 'fa';
  const [activeTab, setActiveTab] = useState<ActiveTab>('ANTIMICROBIAL');
  const [selectedTopics, setSelectedTopics] = useState<Record<ActiveTab, string>>({
    ANTIMICROBIAL: PATHOGEN_MATRIX[0].pathogen,
    VACCINE: 'ALL',
    MONITORING_TDM: 'ALL',
    PREGNANCY_SAFETY: 'ALL',
  });
  const [isBrowseOpen, setIsBrowseOpen] = useState(false);
  const [isTopicsAccordionOpen, setIsTopicsAccordionOpen] = useState(false);

  // Vaccine Calculator State
  const [vaccine1Type, setVaccine1Type] = useState<'LIVE' | 'INACTIVATED'>('LIVE');
  const [vaccine2Type, setVaccine2Type] = useState<'LIVE' | 'INACTIVATED'>('LIVE');
  const [sameDay, setSameDay] = useState<boolean>(true);

  // Monitoring Open Detail Accordions
  const [openMonitoringId, setOpenMonitoringId] = useState<string>('clozapine');

  const query = (searchQuery || '').trim().toLowerCase();
  const matches = (...texts: string[]) =>
    !query || texts.some((text) => (text || '').toLowerCase().includes(query));
  const filteredPathogens = PATHOGEN_MATRIX.filter((item) =>
    matches(
      item.pathogen,
      item.nameFa,
      item.gram,
      item.mechanism,
      ...item.activeDrugs,
      ...item.resistantDrugs,
      item.tgNotesFa,
      item.tgNotesEn
    )
  );
  const tabMatchCounts: Record<ActiveTab, number> = {
    ANTIMICROBIAL: query ? filteredPathogens.length : 0,
    VACCINE: query ? Object.values(VACCINE_SEARCH_TEXT).filter((text) => matches(text)).length : 0,
    MONITORING_TDM: query ? Object.values(MONITORING_SEARCH_TEXT).filter((text) => matches(text)).length : 0,
    PREGNANCY_SAFETY: query ? Object.values(PREGNANCY_SEARCH_TEXT).filter((text) => matches(text)).length : 0,
  };
  const monitoringMatches = tabMatchCounts.MONITORING_TDM > 0;
  const pregnancyMatches = tabMatchCounts.PREGNANCY_SAFETY > 0;
  const vaccineMatches = tabMatchCounts.VACCINE > 0;
  const activeSection = MATRIX_SECTIONS.find((section) => section.id === activeTab) || MATRIX_SECTIONS[0];
  const visibleTopics =
    activeTab === 'ANTIMICROBIAL'
      ? filteredPathogens.map(pathogenToTopic)
      : activeSection.topics.filter((topic) => topic.id === 'ALL' || !query || matches(topic.searchText));
  const selectedTopicId =
    visibleTopics.find((topic) => topic.id === selectedTopics[activeTab])?.id ||
    visibleTopics.find((topic) => topic.id === 'ALL')?.id ||
    visibleTopics[0]?.id ||
    selectedTopics[activeTab];
  const activeTopic = activeSection.topics.find((topic) => topic.id === selectedTopicId) || activeSection.topics[0];
  const currentPathogen =
    filteredPathogens.find((p) => p.pathogen === selectedTopicId) || filteredPathogens[0] || PATHOGEN_MATRIX[0];
  const browseOpen = isBrowseOpen || !!query;

  const renderEmptyState = (currentTab: ActiveTab) => {
    const matchingTabs = (Object.keys(tabMatchCounts) as ActiveTab[]).filter(
      (tab) => tab !== currentTab && tabMatchCounts[tab] > 0
    );
    return (
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 text-center text-xs text-slate-400">
        <p>{isFa ? 'موردی برای این جستجو یافت نشد.' : 'No matching protocols found.'}</p>
        {matchingTabs.length > 0 && (
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
            {matchingTabs.map((tab) => {
              const matchingSection = MATRIX_SECTIONS.find((section) => section.id === tab);
              if (!matchingSection) return null;

              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab);
                    setIsBrowseOpen(true);
                    setIsTopicsAccordionOpen(false);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold"
                >
                  {isFa ? matchingSection.titleFa : matchingSection.titleEn} ({tabMatchCounts[tab]})
                </button>
              );
            })}
          </div>
        )}
        {onSearchQueryChange && (
          <button
            type="button"
            onClick={() => onSearchQueryChange('')}
            className="mt-3 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-bold transition cursor-pointer"
          >
            {isFa ? 'پاک کردن جستجو' : 'Clear search'}
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 text-slate-200 animate-fadeIn">
      {!browseOpen ? (
        <div className="app-card border border-teal-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-lg bg-linear-to-b from-teal-950/20 to-transparent animate-fadeIn">
          <div className="border-b app-border pb-3 flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black app-text">
                {isFa ? 'سرفصل و زیرفصل پروتکل‌های بالینی' : 'Protocol Sections & Topics'}
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            <MatrixSectionSelector
              sections={MATRIX_SECTIONS}
              selectedSectionId={activeTab}
              onSelectSection={(id) => {
                setActiveTab(id);
                setIsTopicsAccordionOpen(false);
              }}
              language={language}
              queryActive={!!query}
              matchCounts={tabMatchCounts}
            />
            <MatrixTopicsAccordion
              topics={visibleTopics}
              selectedTopicId={selectedTopicId}
              isOpen={isTopicsAccordionOpen}
              onToggleOpen={() => setIsTopicsAccordionOpen((prev) => !prev)}
              onSelectTopicId={(id) => {
                setSelectedTopics((previous) => ({ ...previous, [activeTab]: id }));
              }}
              language={language}
            />
          </div>

          <button
            type="button"
            onClick={() => setIsBrowseOpen(true)}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-teal-600 via-sky-600 to-indigo-600 hover:from-teal-500 hover:to-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-teal-950/50 cursor-pointer transition hover:scale-[1.005] active:scale-99"
          >
            <Sparkles className="w-5 h-5 text-amber-300" />
            <span>{isFa ? '✨ مشاهده و مطالعه پروتکل‌ها (View Protocols)' : '✨ View & Study Protocols'}</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 animate-fadeIn">
          <div className="app-card border app-border rounded-2xl p-3.5 flex items-center justify-between gap-4 shadow-sm bg-linear-to-r from-slate-900/60 to-transparent">
            <div className="flex items-center gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black app-text truncate">
                    {isFa ? activeTopic.titleFa : activeTopic.titleEn}
                  </h2>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-500/15 text-teal-300 font-mono font-bold">
                    {activeSection.titleEn}
                  </span>
                </div>
                <p className="text-xs app-muted mt-0.5" dir="ltr">
                  {activeTopic.titleEn}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setIsBrowseOpen(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 border border-teal-500/30 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>{isFa ? 'تغییر سرفصل و جستجو' : 'Change Topic'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {browseOpen && (
        <>
      {/* TAB 1: ANTIMICROBIAL RESISTANCE & SPECTRUM MATRIX */}
      {activeTab === 'ANTIMICROBIAL' && (
        <div className="space-y-4">
          {/* Pathogen Detail Card */}
          {filteredPathogens.length > 0 ? (
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-900/90 border border-slate-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-base text-amber-300 flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-amber-400" />
                  <span>{currentPathogen.pathogen}</span>
                </h3>
                <p className="text-xs text-sky-300 mt-0.5">{isFa ? currentPathogen.nameFa : currentPathogen.gram}</p>
              </div>

              {onFilterShelfByConcept && (
                <button
                  onClick={() => onFilterShelfByConcept('concept-cephalexin-resistance')}
                  className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition flex items-center gap-1.5 w-fit cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{isFa ? 'مشاهده داروهای مرتبط در قفسه' : 'View Linked Shelf Drugs'}</span>
                </button>
              )}
            </div>

            {/* Mechanism of Resistance */}
            <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-xs">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-purple-400" />
                {isFa ? 'مکانیزم مقاومت و فیزیوپاتولوژی میکروبی:' : 'Resistance Mechanism & Pathophysiology:'}
              </span>
              <p className="text-slate-300 leading-relaxed">{currentPathogen.mechanism}</p>
            </div>

            {/* Two-Column Matrix: Active vs Resistant Drugs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Active Regimens */}
              <div className="p-3.5 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 text-emerald-200">
                <div className="font-bold flex items-center gap-2 text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{isFa ? 'داروهای موثر و خط اول درمان (Active Regimens):' : 'Effective & Active Antibiotics:'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPathogen.activeDrugs.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono font-bold text-[11px]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>

              {/* Resistant / Ineffective Regimens */}
              <div className="p-3.5 rounded-xl bg-rose-950/30 border border-rose-500/40 space-y-2 text-rose-200">
                <div className="font-bold flex items-center gap-2 text-rose-300">
                  <XCircle className="w-4 h-4 text-rose-400" />
                  <span>{isFa ? 'داروهای بی‌اثر و ممنوعه (Clinically Ineffective):' : 'Resistant & Ineffective Drugs:'}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPathogen.resistantDrugs.map((d) => (
                    <span
                      key={d}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/30 font-mono font-bold text-[11px]"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* TG Clinical Pearls Note */}
            <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-200 text-xs space-y-1">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                {isFa ? 'نکته بالینی کلیدی (eTG Guidelines):' : 'Key Clinical Pearl (eTG):'}
              </span>
              <p className="text-slate-200 leading-relaxed">
                {isFa ? currentPathogen.tgNotesFa : currentPathogen.tgNotesEn}
              </p>
            </div>
            </div>
          ) : (
            renderEmptyState('ANTIMICROBIAL')
          )}
        </div>
      )}

      {/* TAB 2: VACCINES & COLD CHAIN */}
      {activeTab === 'VACCINE' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Interactive Vaccine Spacing Calculator */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'spacing') && matches(VACCINE_SEARCH_TEXT.spacing) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-purple-500/40 space-y-4 text-xs">
                <div className="flex items-center gap-2 text-purple-300 font-bold text-sm border-b border-slate-800 pb-2">
                  <Syringe className="w-5 h-5 text-purple-400" />
                  <span>{isFa ? 'محاسبه‌گر قانون فواصل تزریق واکسن‌ها (Australian Immunisation Handbook)' : 'Vaccine Spacing Rule Calculator'}</span>
                </div>

                {/* Vaccine 1 Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">{isFa ? 'نوع واکسن اول:' : 'Vaccine 1 Type:'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setVaccine1Type('LIVE')}
                      className={`py-2 px-3 rounded-xl border font-bold transition ${
                        vaccine1Type === 'LIVE'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? '🔴 واکسن زنده (Live Attenuated)' : '🔴 Live Vaccine (e.g. MMR, Varicella)'}
                    </button>
                    <button
                      onClick={() => setVaccine1Type('INACTIVATED')}
                      className={`py-2 px-3 rounded-xl border font-bold transition ${
                        vaccine1Type === 'INACTIVATED'
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? '🔵 واکسن غیرزنده (Inactivated/Subunit)' : '🔵 Inactivated (e.g. Shingrix, DTPa)'}
                    </button>
                  </div>
                </div>

                {/* Vaccine 2 Selector */}
                <div className="space-y-1.5">
                  <label className="text-slate-300 font-bold">{isFa ? 'نوع واکسن دوم:' : 'Vaccine 2 Type:'}</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setVaccine2Type('LIVE')}
                      className={`py-2 px-3 rounded-xl border font-bold transition ${
                        vaccine2Type === 'LIVE'
                          ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? '🔴 واکسن زنده (Live Attenuated)' : '🔴 Live Vaccine (e.g. Yellow Fever, BCG)'}
                    </button>
                    <button
                      onClick={() => setVaccine2Type('INACTIVATED')}
                      className={`py-2 px-3 rounded-xl border font-bold transition ${
                        vaccine2Type === 'INACTIVATED'
                          ? 'bg-sky-600 text-white border-sky-400 shadow-sm'
                          : 'bg-black/40 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? '🔵 واکسن غیرزنده (Inactivated/Subunit)' : '🔵 Inactivated (e.g. Flu, Hepatitis B)'}
                    </button>
                  </div>
                </div>

                {/* Same Day Administration Toggle */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-xl bg-black/40 border border-slate-800">
                  <span className="text-slate-300 font-semibold text-xs sm:text-sm">{isFa ? 'تزریق در همان روز (Same-day administration):' : 'Administered simultaneously on the same day?'}</span>
                  <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
                    <button
                      onClick={() => setSameDay(true)}
                      className={`py-2 px-3 sm:py-1 rounded-lg font-bold border transition text-xs sm:text-sm text-center ${
                        sameDay ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? 'بله (همان روز)' : 'Yes (Same Day)'}
                    </button>
                    <button
                      onClick={() => setSameDay(false)}
                      className={`py-2 px-3 sm:py-1 rounded-lg font-bold border transition text-xs sm:text-sm text-center ${
                        !sameDay ? 'bg-amber-600 text-white border-amber-400 shadow-sm' : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {isFa ? 'خیر (روزهای مجزا)' : 'No (Separate Days)'}
                    </button>
                  </div>
                </div>

                {/* Dynamic Result Banner */}
                {(() => {
                  const isLiveToLive = vaccine1Type === 'LIVE' && vaccine2Type === 'LIVE';

                  if (sameDay) {
                    return (
                      <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 space-y-1.5">
                        <div className="font-bold text-emerald-300 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>{isFa ? 'مجاز: تزریق همزمان در دو محل آناتومیک مجزا' : 'PERMITTED: Simultaneous Administration'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {isFa
                            ? 'طبق گایدلاین استرالیا، تمامی واکسن‌ها (چه زنده و چه غیرزنده) در صورت تزریق در یک روز، مشروط بر استفاده از سرنگ‌های جداگانه و محل‌های تزریق مختلف (Separate anatomical sites)، کاملاً ایمن و موثر هستند.'
                            : 'All vaccines (live or inactivated) may be given simultaneously on the same day at separate anatomical injection sites without interference.'}
                        </p>
                      </div>
                    );
                  }

                  if (isLiveToLive) {
                    return (
                      <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 space-y-1.5">
                        <div className="font-bold text-rose-300 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          <span>{isFa ? 'قانون حیاتی ۴ هفته (۲۸ روز): رعایت فاصله الزامی است' : 'STRICT 4-WEEK (28 DAYS) MINIMUM INTERVAL REQUIRED'}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 leading-relaxed">
                          {isFa
                            ? '⚠️ دو واکسن زنده تزریقی اگر در یک روز تزریق نشوند، الزماً باید حداقل ۴ هفته (۲۸ روز) از یکدیگر فاصله داشته باشند تا تداخل اینترفرونی باعث مهار پاسخ ایمنی واکسن دوم نشود.'
                            : '⚠️ Two parenteral live vaccines not administered on the same day MUST be separated by at least 4 weeks (28 days) to avoid immune interference via interferon.'}
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="p-3.5 rounded-xl bg-sky-950/40 border border-sky-500/40 text-sky-200 space-y-1.5">
                      <div className="font-bold text-sky-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-sky-400" />
                        <span>{isFa ? 'بدون محدودیت زمانی: در هر زمان قابل تزریق است' : 'NO INTERVAL RESTRICTION'}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isFa
                          ? 'واکسن‌های غیرزنده هیچ‌گونه تداخلی با واکسن‌های دیگر ایجاد نمی‌کنند و در هر زمان قبل یا بعد از واکسن‌های زنده/غیرزنده قابل تجویز هستند.'
                          : 'Inactivated vaccines do not interfere with other vaccines and can be administered at any interval before or after other vaccines.'}
                      </p>
                    </div>
                  );
                })()}
                </div>
            )}

            {/* Shingrix & Cold Chain Guidelines */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'shingrix') && matches(VACCINE_SEARCH_TEXT.shingrix) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-cyan-500/40 space-y-4 text-xs">
                <div className="flex items-center gap-2 text-cyan-300 font-bold text-sm border-b border-slate-800 pb-2">
                  <ThermometerSnowflake className="w-5 h-5 text-cyan-400" />
                  <span>{isFa ? 'پروتکل Shingrix و مدیریت زنجیره سرد (Strive for 5)' : 'Shingrix NIP Schedule & Cold Chain Management'}</span>
                </div>

                {/* Shingrix NIP Schedule */}
                <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/30 space-y-1.5">
                  <span className="font-bold text-cyan-300 block">
                    {isFa ? 'برنامه کشوری واکسیناسیون زونا در استرالیا (NIP Shingrix):' : 'National Immunisation Program (NIP) Shingrix Protocol:'}
                  </span>
                  <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-1">
                    <li>
                      {isFa
                        ? 'واکسن Shingrix از نوع نوترکیب زیرواحد غیرزنده (Recombinant Non-live) است و جایگزین واکسن زنده Zostavax شده است.'
                        : 'Shingrix is a non-live recombinant subunit vaccine and fully replaced live Zostavax on the NIP.'}
                    </li>
                    <li>
                      {isFa
                        ? 'واجد شرایط NIP رایگان: تمام افراد سن ۶۵ سال و بالاتر، و بومیان استرالیا (ATSI) سن ۵۰ سال و بالاتر، و افراد با نقص ایمنی سن ۱۸ سال و بالاتر.'
                        : 'NIP Eligible: All adults >=65 years, First Nations adults >=50 years, and immunocompromised adults >=18 years.'}
                    </li>
                    <li>
                      {isFa
                        ? 'دوزینگ: سری ۲ دوزه به صورت عضلانی با فاصله زمانی ۲ تا ۶ ماه (افراد با ضعف شدید ایمنی فاصله ۱ تا ۲ ماه).'
                        : 'Dosing: 2 doses given 2 to 6 months apart (1-2 months apart for severe immunocompromise).'}
                    </li>
                  </ul>
                </div>

                {/* Strive for 5 Cold Chain Breach Alert */}
                <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5 text-amber-200">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    {isFa ? 'پروتکل نقض زنجیره سرد (Cold Chain Breach Protocol):' : 'Cold Chain Breach Protocol (National Strive for 5):'}
                  </span>
                  <p className="text-[11px] text-slate-300 leading-relaxed">
                    {isFa
                      ? 'دمای استاندارد یخچال واکسن باید اکیداً بین ۲°C تا ۸°C باشد. در صورت بروز نقض دما (زیر ۲ درجه یا بالای ۸ درجه): ۱) درب یخچال بسته بماند ۲) برچسب "DO NOT USE" نصب شود ۳) فوراً به واحد بهداشت عمومی ایالتی (Public Health Unit) گزارش شده و تا تعیین تکلیف واکسن‌ها توزیع نشوند.'
                      : 'Maintain 2°C to 8°C. Upon temperature breach: 1) Keep fridge closed 2) Tag "DO NOT USE" 3) Immediately report to State Public Health Unit and quarantine stock until assessed.'}
                  </p>
                </div>
                </div>
            )}
          </div>
          {query && !vaccineMatches && renderEmptyState('VACCINE')}
        </div>
      )}

      {/* TAB 3: HIGH-YIELD CLINICAL MONITORING & TDM PROTOCOLS */}
      {activeTab === 'MONITORING_TDM' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-xs space-y-1">
            <span className="font-bold text-emerald-300 block">
              {isFa
                ? 'پروتکل‌های الزامی پایش آزمایشگاهی و رجیستری داروها در استرالیا:'
                : 'Mandatory Clinical Laboratory Monitoring Protocols & Australian Registries:'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isFa
                ? 'داروهای زیر بیشترین الزامات پایش آزمایشگاهی و دیسپنسینگ ایمن را دارند. برای مشاهده جزئیات هر دارو کلیک کنید:'
                : 'High-yield clinical monitoring protocols and safety registers. Click any protocol to view timeline, thresholds, and emergency reversal rules.'}
            </p>
          </div>

          {/* Protocols Accordion Grid */}
          <div className="space-y-3">
            {/* Protocol 1: Clozapine ANC Monitoring */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'clozapine') && matches(MONITORING_SEARCH_TEXT.clozapine) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div
                  onClick={() => setOpenMonitoringId(openMonitoringId === 'clozapine' ? '' : 'clozapine')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-sky-300 font-bold text-sm">
                    <ShieldAlert className="w-5 h-5 text-sky-400" />
                    <span>
                      {isFa
                        ? '۱. پروتکل کلوزاپین و رجیستری CPN (Clozapine Patient Monitoring System)'
                        : '1. Clozapine Blood Register & ANC Monitoring Protocol'}
                    </span>
                  </div>
                  {openMonitoringId === 'clozapine' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {openMonitoringId === 'clozapine' && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1">
                        <span className="font-bold text-sky-400">{isFa ? 'برنامه زمانی پایش:' : 'Timeline:'}</span>
                        <p className="text-slate-300 text-[11px]">
                          {isFa
                            ? 'هفتگی برای ۱۸ هفته اول، سپس هر ۴ هفته در طول کل مدت درمان.'
                            : 'Weekly for first 18 weeks, then 4-weekly indefinitely.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1">
                        <span className="font-bold text-emerald-400">{isFa ? 'حد مجاز خونی (Green):' : 'Valid Threshold:'}</span>
                        <p className="text-slate-300 text-[11px]">
                          ANC ≥ 1.5 × 10⁹/L و WBC ≥ 3.0 × 10⁹/L جهت تحویل نسخه.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1">
                        <span className="font-bold text-rose-400">{isFa ? 'تداخل دود سیگار (CYP1A2):' : 'Smoking Alert:'}</span>
                        <p className="text-slate-300 text-[11px]">
                          {isFa
                            ? 'ترک سیگار باعث مهار القای CYP1A2 و افزایش شدید غلظت کلوزاپین تا حد سمیت می‌شود.'
                            : 'Smoking cessation removes CYP1A2 induction, causing toxic blood spikes.'}
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 text-rose-200 space-y-1 text-[11px]">
                      <span className="font-bold text-rose-300">🚨 هشدار آگرانولوسیتوز و میوکاردیت:</span>
                      <p className="leading-relaxed text-slate-300">
                        افت ANC به زیر 1.0 × 10⁹/L به عنوان وضعیت قرمز (Red Alert) محسوب شده و مستلزم قطع فوری دارو، ایزوله بیمار و منع دائمی شروع مجدد کلوزاپین است. تب، تاکی‌کاردی و درد قفسه سینه در ماه‌های اول علامت میوکاردیت است.
                      </p>
                    </div>
                  </div>
                )}
                </div>
            )}

            {/* Protocol 2: Amiodarone Multi-Organ Monitoring */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'amiodarone') && matches(MONITORING_SEARCH_TEXT.amiodarone) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div
                  onClick={() => setOpenMonitoringId(openMonitoringId === 'amiodarone' ? '' : 'amiodarone')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                    <HeartPulse className="w-5 h-5 text-amber-400" />
                    <span>
                      {isFa
                        ? '۲. پروتکل پایش چندارگانی آمیودارون (Amiodarone Multi-Organ Protocol)'
                        : '2. Amiodarone Multi-Organ Safety Protocol'}
                    </span>
                  </div>
                  {openMonitoringId === 'amiodarone' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {openMonitoringId === 'amiodarone' && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-[11px]">
                        <span className="font-bold text-amber-400 flex items-center gap-1">
                          <Activity className="w-3.5 h-3.5" /> {isFa ? 'تیروئید (TFT):' : 'Thyroid (TFT):'}
                        </span>
                        <p className="text-slate-300">پایه و هر ۶ ماه (خطر هایپوتیروئیدی یا هایپرتیروئیدی القایی).</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-[11px]">
                        <span className="font-bold text-emerald-400 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5" /> {isFa ? 'کبد (LFT):' : 'Liver (LFT):'}
                        </span>
                        <p className="text-slate-300">پایه و هر ۶ ماه (خطر سمیت هپاتوسلولار).</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-[11px]">
                        <span className="font-bold text-rose-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" /> {isFa ? 'ریه (CXR):' : 'Lungs (CXR):'}
                        </span>
                        <p className="text-slate-300">سالانه عکس قفسه سینه و تست تنفسی (خطر فیبروز ریوی).</p>
                      </div>

                      <div className="p-2.5 rounded-xl bg-black/40 border border-slate-800 space-y-1 text-[11px]">
                        <span className="font-bold text-sky-400 flex items-center gap-1">
                          <Eye className="w-3.5 h-3.5" /> {isFa ? 'چشم‌پزشکی:' : 'Ophthalmology:'}
                        </span>
                        <p className="text-slate-300">سالانه با Slit-lamp (رسوب میکروقرنیه و نوروپاتی اپتیک).</p>
                      </div>
                    </div>

                    <p className="text-[11px] text-amber-200 bg-amber-950/20 p-2.5 rounded-xl border border-amber-500/30">
                      💡 <strong>نیمه‌عمر طولانی:</strong> نیمه‌عمر دفعی آمیودارون حدود ۳۰ تا ۶۰ روز است؛ بنابراین عوارض و تداخلات آن تا ماه‌ها پس از قطع دارو باقی می‌ماند.
                    </p>
                  </div>
                )}
                </div>
            )}

            {/* Protocol 3: Once-Weekly Methotrexate Safety */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'methotrexate') && matches(MONITORING_SEARCH_TEXT.methotrexate) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div
                  onClick={() => setOpenMonitoringId(openMonitoringId === 'methotrexate' ? '' : 'methotrexate')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-purple-300 font-bold text-sm">
                    <Clock className="w-5 h-5 text-purple-400" />
                    <span>
                      {isFa
                        ? '۳. پروتکل مصرف یک‌بار در هفته متوترکسات خوراکی (Methotrexate Once-Weekly Safety)'
                        : '3. Oral Methotrexate Once-Weekly Safety Protocol'}
                    </span>
                  </div>
                  {openMonitoringId === 'methotrexate' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {openMonitoringId === 'methotrexate' && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                    <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-200 space-y-1.5">
                      <span className="font-bold text-rose-300 flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4" />
                        {isFa ? 'قانون طلایی دیسپنسینگ استرالیا: الزماً یک روز مشخص در هفته' : 'AUSTRALIAN DISPENSING MANDATE: STRICTLY ONCE A WEEK'}
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {isFa
                          ? 'مصرف متوترکسات در آرتریت روماتوئید و پسوریازیس فقط و فقط یک روز در هفته (ONCE WEEKLY) است. برچسب داروخانه باید روز مشخص را ذکر کند. مصرف روزانه خطای مهلک داروسازی است و منجر به سرکوب مغز استخوان و مرگ می‌شود.'
                          : 'Methotrexate for inflammatory disease is strictly ONCE WEEKLY. Dispensing label must clearly specify the chosen day of the week. Daily dosing is a fatal medication error.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1">
                        <span className="font-bold text-purple-300">{isFa ? 'پروتکل اسید فولیک کمکی:' : 'Folic Acid Rescue:'}</span>
                        <p className="text-slate-300">
                          {isFa
                            ? 'مصرف ۵ میلی‌گرم اسید فولیک در روزهای غیر از روز مصرف متوترکسات (۱ تا ۲ روز پس از متوترکسات) جهت کاهش سمیت گوارشی و خونی.'
                            : 'Folic acid 5mg once weekly on a non-methotrexate day reduces GI and hematological toxicity.'}
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-1">
                        <span className="font-bold text-sky-300">{isFa ? 'پایش آزمایشگاهی:' : 'Lab Monitoring:'}</span>
                        <p className="text-slate-300">
                          {isFa
                            ? 'شمارش کامل سلول‌های خونی (FBC)، عملکرد کلیه (eGFR) و آنزیم‌های کبد (LFT) هر ۲ تا ۳ ماه.'
                            : 'FBC, renal function, and LFTs every 2-3 months.'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                </div>
            )}

            {/* Protocol 4: Warfarin Brand Invariability & Reversal */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'warfarin') && matches(MONITORING_SEARCH_TEXT.warfarin) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div
                  onClick={() => setOpenMonitoringId(openMonitoringId === 'warfarin' ? '' : 'warfarin')}
                  className="flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                    <Scale className="w-5 h-5 text-rose-400" />
                    <span>
                      {isFa
                        ? '۴. پروتکل عدم تعویض برندهای وارفارین و مدیریت نوسان INR'
                        : '4. Warfarin Brand Non-Interchangeability & INR Reversal'}
                    </span>
                  </div>
                  {openMonitoringId === 'warfarin' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </div>

                {openMonitoringId === 'warfarin' && (
                  <div className="pt-2 border-t border-slate-800 space-y-3 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                      <div className="p-3 rounded-xl bg-rose-950/30 border border-rose-500/30 space-y-1 text-rose-200">
                        <span className="font-bold text-rose-300">🚫 عدم تعویض برند Coumadin و Marevan:</span>
                        <p className="text-slate-300">
                          این دو برند در استرالیا دارای فراهمی زیستی متفاوت هستند و هرگز نباید جایگزین یکدیگر شوند.
                        </p>
                      </div>

                      <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1 text-emerald-200">
                        <span className="font-bold text-emerald-300">🎯 هدف استاندارد INR:</span>
                        <p className="text-slate-300">
                          در فیبریلاسیون دهلیزی و ترومبوز وریدی (DVT/PE) هدف ۲.۰ تا ۳.۰ است. دریچه مصنوعی مکانیکی هدف ۲.۵ تا ۳.۵.
                        </p>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/40 border border-slate-800 space-y-2 text-[11px]">
                      <span className="font-bold text-amber-300">پروتکل مدیریت افزایش INR و خونریزی:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        <li><strong>INR بین 4.5 تا 10 بدون خونریزی:</strong> قطع ۱ تا ۲ دوز وارفارین و ارزیابی مجدد.</li>
                        <li><strong>INR بالای 10 بدون خونریزی:</strong> قطع وارفارین + فیتومنادیون خوراکی (ویتامین K) به میزان ۱ تا ۲.۵ میلی‌گرم.</li>
                        <li><strong>خونریزی ماژور تهدیدکننده حیات:</strong> فیتومنادیون وریدی (IV Vitamin K 5-10mg) + کنسانتره کمپلکس پروترومبین (Prothrombinex-VF).</li>
                      </ul>
                    </div>
                  </div>
                )}
                </div>
            )}
          </div>
          {query && !monitoringMatches && renderEmptyState('MONITORING_TDM')}
        </div>
      )}

      {/* TAB 4: PREGNANCY & WOMEN SAFETY */}
      {activeTab === 'PREGNANCY_SAFETY' && (
        <div className="space-y-4">
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-xs space-y-1">
            <span className="font-bold text-amber-300 block">
              {isFa
                ? 'پروتکل‌های حیاتی دارودرمانی در بارداری و شیردهی (TGA Pregnancy Categories):'
                : 'High-Yield Pregnancy & Women Health Practice Protocols (TGA Safety Categories):'}
            </span>
            <p className="text-slate-300 leading-relaxed">
              {isFa
                ? 'تطبیق داروهای ایمن (خط اول) در برابر تراتوژن‌های اکیداً ممنوعه در سه حوزه پرتکرار بالینی:'
                : 'Compare 1st-line safe medications against strictly contraindicated teratogens across key obstetric domains.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Domain 1: Hypertension in Pregnancy */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'hypertension') && matches(PREGNANCY_SEARCH_TEXT.hypertension) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sky-300 text-sm">
                    <Stethoscope className="w-4 h-4 text-sky-400" />
                    <span>{isFa ? 'فشارخون بارداری' : 'Hypertension in Pregnancy'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-emerald-300">✅ خط اول ایمن (Safe 1st-Line):</span>
                    <p className="text-slate-300">Labetalol (Trandate), Nifedipine CR (Adalat), Methyldopa</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-rose-300">🚫 ممنوعیت مطلق (Contraindicated):</span>
                    <p className="text-slate-300">ACE inhibitors (Perindopril, Ramipril) & ARBs (خطر نارسایی کلیه جنین و الیگوهیدرآمنیوس)</p>
                  </div>
                </div>
                </div>
            )}

            {/* Domain 2: Gestational Diabetes & OGTT */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'gestationalDiabetes') && matches(PREGNANCY_SEARCH_TEXT.gestationalDiabetes) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-purple-300 text-sm">
                    <Activity className="w-4 h-4 text-purple-400" />
                    <span>{isFa ? 'دیابت بارداری (GDM)' : 'Gestational Diabetes (GDM)'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-purple-300">📋 غربالگری OGTT (هفته ۲۴-۲۸):</span>
                    <ul className="list-disc list-inside text-slate-300 text-[10px] space-y-0.5">
                      <li>ناشتا (Fasting) ≥ 5.1 mmol/L</li>
                      <li>یک ساعت بعد (1-hour) ≥ 10.0 mmol/L</li>
                      <li>دو ساعت بعد (2-hour) ≥ 8.5 mmol/L</li>
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-emerald-300">✅ درمان دارویی:</span>
                    <p className="text-slate-300">تغییر سبک زندگی سپس انسولین تزریقی (یا متفورمین خوراکی طبق پروتکل استرالیا).</p>
                  </div>
                </div>
                </div>
            )}

            {/* Domain 3: Acne & Dermatology in Pregnancy */}
            {(selectedTopicId === 'ALL' || selectedTopicId === 'acne') && matches(PREGNANCY_SEARCH_TEXT.acne) && (
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-bold text-amber-300 text-sm">
                    <Baby className="w-4 h-4 text-amber-400" />
                    <span>{isFa ? 'آکنه و پوست در بارداری' : 'Acne in Pregnancy'}</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-emerald-300">✅ خط اول ایمن (Category A):</span>
                    <p className="text-slate-300">Topical Clindamycin 1% (Dalacin T / Duac), Topical Erythromycin, Benzoyl Peroxide, Azelaic Acid</p>
                  </div>

                  <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-[11px] space-y-1">
                    <span className="font-bold text-rose-300">🚫 تراتوژن‌های ممنوع (Category X/D):</span>
                    <p className="text-slate-300">Oral Isotretinoin (Roaccutane), Topical Retinoids (Differin, Retin-A), Oral Tetracyclines (Doxycycline)</p>
                  </div>
                </div>
                </div>
            )}
          </div>
          {query && !pregnancyMatches && renderEmptyState('PREGNANCY_SAFETY')}
        </div>
      )}
        </>
      )}
    </div>
  );
};
