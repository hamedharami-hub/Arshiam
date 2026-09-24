import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const pharmacyDir = 'C:/Users/hamed/.gemini/antigravity/scratch/pharmacy';
const targetDir = 'C:/Users/hamed/.gemini/antigravity/scratch/Arshiam/src/lib';

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    return {};
  }
  const rawCode = fs.readFileSync(filePath, 'utf8').replace(/import\s+[^;]+;/g, '');
  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('module', 'exports', transpiled)(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

console.log('--- Loading pharmacy source data ---');

// 1. Modules (36 cards)
const { ALL_PHARMACY_CARDS } = extractExports(path.join(pharmacyDir, 'lib/pharmacy-data.ts'));

// 2. Handbook Diseases (43 items)
const { OTC_HANDBOOK_DATA_PART1 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part1.ts'));
const { OTC_HANDBOOK_DATA_PART2 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part2.ts'));
const { OTC_HANDBOOK_DATA_PART3 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part3.ts'));
const handbookDiseases = [
  ...(OTC_HANDBOOK_DATA_PART1 || []),
  ...(OTC_HANDBOOK_DATA_PART2 || []),
  ...(OTC_HANDBOOK_DATA_PART3 || [])
];

// 3. Clinical Translations (43 items)
const { OTC_CLINICAL_TRANSLATIONS } = extractExports(path.join(pharmacyDir, 'data/otcClinicalTranslations.ts'));

// 4. CYP Enzymes (6 items)
const { CYP_ENZYMES_DATABASE } = extractExports(path.join(pharmacyDir, 'data/cypInteractionsData.ts'));
const cypList = Object.values(CYP_ENZYMES_DATABASE || {});

// 5. Mechanisms Registry (14 items)
const { SUBCATEGORY_MECHANISMS } = extractExports(path.join(pharmacyDir, 'data/mechanismsRegistry.ts'));
const mechanismsList = Object.values(SUBCATEGORY_MECHANISMS || {});

// 6. Shelf Products (121 items)
const { SHELF_PRODUCTS } = extractExports(path.join(pharmacyDir, 'data/shelf/shelfProducts.ts'));

// 7. Scenarios
const { SLANG_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/slangScenarios.ts'));
const { CLINICAL_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/clinicalScenarios.ts'));
const { ADMIN_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/adminScenarios.ts'));

// 8. Sample Leitner Cards
const { INITIAL_SAMPLE_LEITNER_CARDS } = extractExports(path.join(pharmacyDir, 'lib/sample-leitner-cards.ts'));

console.log('--- Defining Folders & Deep Hierarchical Taxonomy ---');

const PHARMACY_ROOT_FOLDER_ID = 'folder-pharmacy-root';

const PHARMACY_FOLDERS = [
  // ROOT
  {
    id: PHARMACY_ROOT_FOLDER_ID,
    name: '💊 دایره‌المعارف و مرجع جامع دارویی (Pharmacy Knowledge Hub)',
    icon: 'Stethoscope',
    color: '#8b5cf6',
    parent_id: null,
    position: 1
  },

  // -------------------------------------------------------------
  // PILLAR 1: CLINICAL DISEASE ATLAS & OTC
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-clinical-atlas',
    name: '🩺 ۱. اطلس بالینی بیماری‌ها و پروتکل‌های OTC (Clinical Disease Atlas)',
    icon: 'Stethoscope',
    color: '#10b981',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 2
  },
  {
    id: 'folder-clinical-resp',
    name: '🫁 ۱-۱. بیماری‌های تنفسی، آسم و آلرژی (Respiratory & Allergy)',
    icon: 'Wind',
    color: '#06b6d4',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 3
  },
  {
    id: 'folder-clinical-gi',
    name: '🫄 ۱-۲. بیماری‌های گوارش، معده و آنورکتال (Gastrointestinal & Anorectal)',
    icon: 'Flame',
    color: '#f97316',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 4
  },
  {
    id: 'folder-clinical-derma',
    name: '🧴 ۱-۳. درماتولوژی، پوست و مو (Dermatology & Skin Disorders)',
    icon: 'Shield',
    color: '#ec4899',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 5
  },
  {
    id: 'folder-clinical-pain',
    name: '⚡ ۱-۴. درد، التهاب و سیستم اسکلتی عضلانی (Pain & Musculoskeletal)',
    icon: 'Activity',
    color: '#ef4444',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 6
  },
  {
    id: 'folder-clinical-eyes-ears',
    name: '👁️ ۱-۵. چشم، گوش، دهان و دندان (Eyes, Ears, Oral & Dental)',
    icon: 'Eye',
    color: '#8b5cf6',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 7
  },
  {
    id: 'folder-clinical-women-uro',
    name: '🤰 ۱-۶. سلامت زنان، عفونت‌ها و اورولوژی (Women\'s Health & Urology)',
    icon: 'Heart',
    color: '#f43f5e',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 8
  },

  // -------------------------------------------------------------
  // PILLAR 2: PHARMACOLOGY, CYP & MECHANISMS
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-pharmacology',
    name: '🔬 ۲. فارماکولوژی، مکانیسم اثر و تداخلات آنزیمی (Pharmacology & CYP)',
    icon: 'Sparkles',
    color: '#8b5cf6',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 9
  },
  {
    id: 'folder-pharm-cyp',
    name: '🧬 ۲-۱. بیوکروماتوگرافی و تداخلات سیتوکروم P450 (CYP Monographs)',
    icon: 'Dna',
    color: '#6366f1',
    parent_id: 'folder-pharmacy-cat-pharmacology',
    position: 10
  },
  {
    id: 'folder-pharm-mechanisms',
    name: '🧪 ۲-۲. مکانیسم‌های سلولی و مسیرهای سیگنالینگ (Cellular Mechanisms & Pathways)',
    icon: 'Atom',
    color: '#a855f7',
    parent_id: 'folder-pharmacy-cat-pharmacology',
    position: 11
  },

  // -------------------------------------------------------------
  // PILLAR 3: PHARMACOPEIA & DRUG MONOGRAPHS
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-monographs',
    name: '💊 ۳. فارماکوپه و اطلس مونوگراف فرآورده‌های دارویی (Pharmacopeia & Monographs)',
    icon: 'Pill',
    color: '#f59e0b',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 12
  },
  {
    id: 'folder-mono-analgesics',
    name: '📦 ۳-۱. فرآورده‌های مسکن، ضدالتهاب و تب‌بر (Analgesics & NSAIDs)',
    icon: 'ShieldAlert',
    color: '#eab308',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 13
  },
  {
    id: 'folder-mono-resp-allergy',
    name: '🫁 ۳-۲. فرآورده‌های تنفسی، آلرژی و سرماخوردگی (Respiratory & Allergy)',
    icon: 'Wind',
    color: '#14b8a6',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 14
  },
  {
    id: 'folder-mono-gi',
    name: '🫄 ۳-۳. فرآورده‌های گوارشی و معده‌ای (Gastrointestinal Care)',
    icon: 'Layers',
    color: '#f97316',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 15
  },
  {
    id: 'folder-mono-topical',
    name: '🧴 ۳-۴. فرآورده‌های پوستی، ضدقارچ و موضعی (Dermatologicals & Antifungals)',
    icon: 'Sparkle',
    color: '#ec4899',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 16
  },

  // -------------------------------------------------------------
  // PILLAR 4: CLINICAL TRIAGE, SLANG & SCENARIOS
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-cases-triage',
    name: '⚕️ ۴. سناریوهای بالینی، تریاژ و مشاوره بیمار (Clinical Triage & Practice)',
    icon: 'ShieldAlert',
    color: '#ec4899',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 17
  },
  {
    id: 'folder-cases-slang',
    name: '🗣️ ۴-۱. اصطلاحات عامیانه و کوچه بازاری بیماران (Patient Slang & Terminology)',
    icon: 'MessageSquare',
    color: '#f43f5e',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 18
  },
  {
    id: 'folder-cases-clinical',
    name: '📋 ۴-۲. سناریوهای تصمیم‌گیری و تریاژ بالینی (High-Stakes Clinical Scenarios)',
    icon: 'ClipboardCheck',
    color: '#db2777',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 19
  },
  {
    id: 'folder-cases-admin',
    name: '📑 ۴-۳. مدیریت اداری، بیمه و قوانین نسخه‌نویسی (Administrative & Script Rules)',
    icon: 'FileText',
    color: '#be185d',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 20
  },

  // -------------------------------------------------------------
  // PILLAR 5: ACADEMIC MODULES & HEALTHCARE LEGISLATION
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-academic-modules',
    name: '📚 ۵. درس‌های آکادمیک، قوانین داروخانه و سیستم سلامت (Modules 1-6 Lessons)',
    icon: 'BookOpen',
    color: '#0284c7',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 21
  },
  {
    id: 'folder-mod-health-system',
    name: '🏛️ ۵-۱. ساختار سیستم سلامت، قوانین دارویی و زمان‌بندی (Health System & Scheduling)',
    icon: 'Landmark',
    color: '#0284c7',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 22
  },
  {
    id: 'folder-mod-dispensing',
    name: '📜 ۵-۲. فرآیند نسخه‌پیچی، استانداردهای ثبت و مشاوره (Dispensing, Records & Counseling)',
    icon: 'ScrollText',
    color: '#0369a1',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 23
  },
  {
    id: 'folder-mod-populations',
    name: '👶 ۵-۳. جمعیت‌های خاص، ایمنی بیمار و فارماکوویژیلانس (Special Populations & Clinical Governance)',
    icon: 'HeartHandshake',
    color: '#075985',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 24
  }
];

const documents = [];

// Helper to escape HTML safely
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// =========================================================================
// SECTION 1: 43 CLINICAL DISEASES (Fully Bilingual: Persian + English)
// =========================================================================

const diseaseCategoryMap = {
  // Respiratory
  chesty_cough: 'folder-clinical-resp',
  dry_cough: 'folder-clinical-resp',
  sore_throat: 'folder-clinical-resp',
  hayfever: 'folder-clinical-resp',
  nasal_congestion: 'folder-clinical-resp',

  // GI
  gord_heartburn: 'folder-clinical-gi',
  constipation: 'folder-clinical-gi',
  diarrhoea: 'folder-clinical-gi',
  haemorrhoids: 'folder-clinical-gi',
  anal_fissure: 'folder-clinical-gi',
  motion_sickness: 'folder-clinical-gi',

  // Dermatology
  acne: 'folder-clinical-derma',
  eczema: 'folder-clinical-derma',
  seborrhoeic_dermatitis: 'folder-clinical-derma',
  cradle_cap: 'folder-clinical-derma',
  nappy_rash: 'folder-clinical-derma',
  tinea_infections: 'folder-clinical-derma',
  tinea_versicolor: 'folder-clinical-derma',
  headlice: 'folder-clinical-derma',
  scabies: 'folder-clinical-derma',
  warts: 'folder-clinical-derma',
  corns_calluses: 'folder-clinical-derma',
  burns_sunburn: 'folder-clinical-derma',
  stings_bites: 'folder-clinical-derma',
  chilblains: 'folder-clinical-derma',

  // Pain
  pain_relief: 'folder-clinical-pain',

  // Eyes, Ears, Oral
  bacterial_conjunctivitis: 'folder-clinical-eyes-ears',
  blepharitis: 'folder-clinical-eyes-ears',
  dry_eyes: 'folder-clinical-eyes-ears',
  stye: 'folder-clinical-eyes-ears',
  ear_wax: 'folder-clinical-eyes-ears',
  swimmers_ear: 'folder-clinical-eyes-ears',
  cold_sores: 'folder-clinical-eyes-ears',
  mouth_ulcers: 'folder-clinical-eyes-ears',
  oral_thrush: 'folder-clinical-eyes-ears',
  dry_mouth: 'folder-clinical-eyes-ears',
  teething: 'folder-clinical-eyes-ears',

  // Women's Health & Infections
  vaginal_thrush: 'folder-clinical-women-uro',
  uti_cystitis: 'folder-clinical-women-uro',
  worms_pinworms: 'folder-clinical-women-uro',
  chickenpox: 'folder-clinical-women-uro',
  shingles: 'folder-clinical-women-uro',
  smoking_cessation: 'folder-clinical-women-uro'
};

for (const hb of handbookDiseases) {
  const trans = OTC_CLINICAL_TRANSLATIONS ? OTC_CLINICAL_TRANSLATIONS[hb.id] : null;
  const folderId = diseaseCategoryMap[hb.id] || 'folder-clinical-derma';

  const cleanFaName = trans?.cleanFaName || hb.condition;
  const cleanEnName = trans?.cleanEnName || hb.condition.replace(/\s*\([^)]*\)/, '');
  const title = `${cleanFaName} (${cleanEnName})`;
  const titleEn = `${cleanEnName} - OTC Clinical Protocol`;

  // Build Rich Persian HTML
  let htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">نام متداول و برند اصلی در استرالیا و جهان:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(cleanFaName)} | <span dir="ltr" class="font-mono text-primary">${escapeHtml(trans?.primaryBrand || hb.condition)}</span></div>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
      علائم و نشانه‌های تشخیصی:
    </h3>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground pe-2">
      ${(trans?.symptomsFa || hb.symptoms || []).map(s => `<li>${escapeHtml(s)}</li>`).join('\n      ')}
    </ul>
  </div>`;

  if (trans?.firstLine) {
    const fl = trans.firstLine;
    htmlFa += `
  <div class="p-4 rounded-2xl bg-primary/10 border border-primary/25 space-y-2">
    <div class="text-xs font-bold text-primary flex items-center gap-1.5">
      <span>💊</span>
      <span>درمان دارویی خط اول (First-line OTC Pharmacotherapy):</span>
    </div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(fl.drugNameFa)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">دسته دارویی:</strong> ${escapeHtml(fl.drugClassFa)} (${escapeHtml(fl.drugClassEn)})</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">دوز و نحوه مصرف:</strong> ${escapeHtml(fl.dosingFa)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">سرعت اثر و دوره درمان:</strong> ${escapeHtml(fl.onsetCourseFa)}</div>
    <div class="text-xs text-amber-600 dark:text-amber-400"><strong class="text-foreground">احتیاط‌های مهم:</strong> ${escapeHtml(fl.keyWarningsFa)}</div>
    ${fl.alternativesFa ? `<div class="text-xs text-muted-foreground"><strong class="text-foreground">داروی جایگزین:</strong> ${escapeHtml(fl.alternativesFa)}</div>` : ''}
  </div>`;
  } else if (hb.medicines && hb.medicines.length > 0) {
    htmlFa += `
  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">داروهای قابل توصیه در داروخانه:</h3>
    <div class="space-y-3">
      ${hb.medicines.map(m => `
      <div class="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs">
        <div class="font-bold text-primary">${escapeHtml(m.name)} <span class="text-muted-foreground">(${escapeHtml(m.brandExamples)})</span></div>
        <div><strong class="text-foreground">دوزینگ:</strong> ${escapeHtml(m.dosing)}</div>
        <div class="text-muted-foreground"><strong class="text-foreground">ایمنی بارداری:</strong> ${escapeHtml(m.pregnancySafety)} | <strong class="text-foreground">شیردهی:</strong> ${escapeHtml(m.breastfeedingSafety)}</div>
        ${m.extraInfo ? `<div class="text-amber-600 dark:text-amber-400 font-medium">${escapeHtml(m.extraInfo)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>`;
  }

  // Red Flags
  const redFlags = trans?.redFlagsFa || hb.referralCriteria || [];
  if (redFlags.length > 0) {
    htmlFa += `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
      <span>⚠️</span>
      <span>علائم خطر و معیارهای ارجاع فوری به پزشک (Red Flags):</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
      ${redFlags.map(rf => `<li>${escapeHtml(rf)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // Non-Pharm
  const nonPharm = trans?.nonPharmFa || hb.nonPharmAdvice || [];
  if (nonPharm.length > 0) {
    htmlFa += `
  <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-1.5">
    <div class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
      <span>🌿</span>
      <span>مراقبت‌های غیردارویی و توصیه‌های سبک زندگی:</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
      ${nonPharm.map(np => `<li>${escapeHtml(np)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // Pearls
  const pearls = trans?.clinicalPearlsFa || hb.clinicalNotes || [];
  if (pearls.length > 0) {
    htmlFa += `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      <span>💡</span>
      <span>نکات کلیدی و مرواریدهای بالینی داروساز:</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
      ${pearls.map(cp => `<li>${escapeHtml(cp)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // Australian Brands Table
  if (trans?.australianBrands && trans.australianBrands.length > 0) {
    htmlFa += `
  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">برندهای ژنریک و تجاری معادل در استرالیا:</h3>
    <div class="overflow-x-auto rounded-xl border border-border">
      <table class="w-full text-xs text-right">
        <thead class="bg-muted/60 text-muted-foreground">
          <tr>
            <th class="p-2.5">نام برند (Brand)</th>
            <th class="p-2.5">نام ژنریک (Generic)</th>
            <th class="p-2.5">شکل دارویی (Form)</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          ${trans.australianBrands.map(b => `
          <tr class="hover:bg-muted/20">
            <td class="p-2.5 font-bold text-primary" dir="ltr">${escapeHtml(b.brand)}</td>
            <td class="p-2.5 text-foreground" dir="ltr">${escapeHtml(b.generic)}</td>
            <td class="p-2.5 text-muted-foreground">${escapeHtml(b.form || '-')}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  </div>`;
  }

  htmlFa += `\n</div>`;

  // Build Rich English HTML
  let htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Condition & Australian Benchmark Brand:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(cleanEnName)} | <span class="font-mono text-primary">${escapeHtml(trans?.primaryBrand || hb.condition)}</span></div>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
      <span class="w-2 h-2 rounded-full bg-primary inline-block"></span>
      Diagnostic Symptoms & Clinical Presentation:
    </h3>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground ps-2">
      ${(hb.symptoms || []).map(s => `<li>${escapeHtml(s)}</li>`).join('\n      ')}
    </ul>
  </div>`;

  if (trans?.firstLine) {
    const fl = trans.firstLine;
    htmlEn += `
  <div class="p-4 rounded-2xl bg-primary/10 border border-primary/25 space-y-2">
    <div class="text-xs font-bold text-primary flex items-center gap-1.5">
      <span>💊</span>
      <span>First-Line OTC Pharmacotherapy:</span>
    </div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(fl.drugNameEn)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">Drug Class:</strong> ${escapeHtml(fl.drugClassEn)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">Dosing & Regimen:</strong> ${escapeHtml(fl.dosingEn)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">Onset & Course:</strong> ${escapeHtml(fl.onsetCourseEn)}</div>
    <div class="text-xs text-amber-600 dark:text-amber-400"><strong class="text-foreground">Important Warnings:</strong> ${escapeHtml(fl.keyWarningsEn)}</div>
    ${fl.alternativesEn ? `<div class="text-xs text-muted-foreground"><strong class="text-foreground">Alternative:</strong> ${escapeHtml(fl.alternativesEn)}</div>` : ''}
  </div>`;
  } else if (hb.medicines && hb.medicines.length > 0) {
    htmlEn += `
  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">Recommended OTC Medicines:</h3>
    <div class="space-y-3">
      ${hb.medicines.map(m => `
      <div class="p-3.5 rounded-2xl bg-muted/40 border border-border space-y-1.5 text-xs">
        <div class="font-bold text-primary">${escapeHtml(m.name)} <span class="text-muted-foreground">(${escapeHtml(m.brandExamples)})</span></div>
        <div><strong class="text-foreground">Dosing:</strong> ${escapeHtml(m.dosing)}</div>
        <div class="text-muted-foreground"><strong class="text-foreground">Pregnancy:</strong> ${escapeHtml(m.pregnancySafety)} | <strong class="text-foreground">Lactation:</strong> ${escapeHtml(m.breastfeedingSafety)}</div>
        ${m.extraInfo ? `<div class="text-amber-600 dark:text-amber-400 font-medium">${escapeHtml(m.extraInfo)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>`;
  }

  // English Red Flags
  const refCriteria = hb.referralCriteria || [];
  if (refCriteria.length > 0) {
    htmlEn += `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
      <span>⚠️</span>
      <span>Red Flags & Urgent Referral Criteria:</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
      ${refCriteria.map(rf => `<li>${escapeHtml(rf)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // English Non-Pharm
  const npAdvice = hb.nonPharmAdvice || [];
  if (npAdvice.length > 0) {
    htmlEn += `
  <div class="p-3.5 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-1.5">
    <div class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
      <span>🌿</span>
      <span>Non-Pharmacological Care & Patient Advice:</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
      ${npAdvice.map(np => `<li>${escapeHtml(np)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  // English Pearls
  const cNotes = hb.clinicalNotes || [];
  if (cNotes.length > 0) {
    htmlEn += `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1.5">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      <span>💡</span>
      <span>Clinical Pearls & Counseling Tips:</span>
    </div>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
      ${cNotes.map(cp => `<li>${escapeHtml(cp)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  htmlEn += `\n</div>`;

  documents.push({
    id: `doc-disease-${hb.id}`,
    folder_id: folderId,
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Clinical Atlas', 'OTC', hb.category || 'Primary Care', cleanEnName]
  });
}

console.log(`Generated ${handbookDiseases.length} disease documents across 6 clinical subfolders`);

// =========================================================================
// SECTION 2: 6 CYP ENZYMES & 14 PHARMACOLOGY MECHANISMS
// =========================================================================

for (const cyp of cypList) {
  const cypCode = (cyp.id || 'CYP').toUpperCase();
  const docId = `doc-cyp-${(cyp.id || 'cyp').toLowerCase()}`;
  const title = `آنزیم ${cypCode}: ${cyp.nameFa || cypCode} (${cypCode} Cytochrome Profile)`;
  const titleEn = `${cypCode} Cytochrome P450 - Metabolic Profile & DDIs`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">موقعیت و اهمیت آنزیمی:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(cypCode)}: ${escapeHtml(cyp.nameFa || cypCode)}</div>
    <div class="text-xs text-muted-foreground mt-1">${escapeHtml(cyp.overviewFa || '')}</div>
  </div>

  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">اهمیت بالینی و فارماکوکینتیک:</div>
    <div class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(cyp.clinicalSignificanceFa || '')}</div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
      <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🛑 مهارکننده‌های کلیدی (Inhibitors):</div>
      <div class="space-y-1.5">
        ${(cyp.inhibitors || []).map(inh => `
        <div class="text-xs">
          <span class="font-bold text-foreground">${escapeHtml(inh.nameFa || inh.name)}</span>
          <span class="text-[11px] text-muted-foreground font-mono" dir="ltr">(${escapeHtml(inh.name)})</span>
          ${inh.notesFa ? `<div class="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">${escapeHtml(inh.notesFa)}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>

    <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-2">
      <div class="text-xs font-bold text-blue-600 dark:text-blue-400">⚡ القاکننده‌های کلیدی (Inducers):</div>
      <div class="space-y-1.5">
        ${(cyp.inducers || []).map(ind => `
        <div class="text-xs">
          <span class="font-bold text-foreground">${escapeHtml(ind.nameFa || ind.name)}</span>
          <span class="text-[11px] text-muted-foreground font-mono" dir="ltr">(${escapeHtml(ind.name)})</span>
          ${ind.notesFa ? `<div class="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">${escapeHtml(ind.notesFa)}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">🎯 سوبستراهای حساس و با پنجره درمانی باریک (Substrates):</div>
    <div class="space-y-1.5">
      ${(cyp.substrates || []).map(sub => `
      <div class="text-xs">
        <span class="font-bold text-foreground">${escapeHtml(sub.nameFa || sub.name)}</span>
        <span class="text-[11px] text-muted-foreground font-mono" dir="ltr">(${escapeHtml(sub.name)})</span>
        ${sub.notesFa ? `<div class="text-[11px] text-muted-foreground mt-0.5">${escapeHtml(sub.notesFa)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>

  ${cyp.clinicalRules && cyp.clinicalRules.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2">
    <div class="text-xs font-bold text-primary mb-2">قوانین و تداخلات طلایی بالینی:</div>
    <div class="space-y-2">
      ${cyp.clinicalRules.map(cr => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
        <div class="font-bold text-foreground">${escapeHtml(cr.titleFa)}</div>
        <div class="text-muted-foreground"><strong>مکانیسم:</strong> ${escapeHtml(cr.mechanismFa)}</div>
        <div class="text-emerald-600 dark:text-emerald-400"><strong>توصیه بالینی:</strong> ${escapeHtml(cr.recommendationFa)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Enzyme Identity & Share of Metabolism:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(cypCode)}: ${escapeHtml(cyp.nameEn || cypCode)}</div>
    <div class="text-xs text-muted-foreground mt-1">${escapeHtml(cyp.overviewEn || '')}</div>
  </div>

  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">Clinical Significance:</div>
    <div class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(cyp.clinicalSignificanceEn || '')}</div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
    <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
      <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🛑 Key Inhibitors:</div>
      <div class="space-y-1.5">
        ${(cyp.inhibitors || []).map(inh => `
        <div class="text-xs">
          <span class="font-bold text-foreground">${escapeHtml(inh.name)}</span>
          ${inh.notesEn ? `<div class="text-[11px] text-rose-700 dark:text-rose-300 mt-0.5">${escapeHtml(inh.notesEn)}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>

    <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25 space-y-2">
      <div class="text-xs font-bold text-blue-600 dark:text-blue-400">⚡ Key Inducers:</div>
      <div class="space-y-1.5">
        ${(cyp.inducers || []).map(ind => `
        <div class="text-xs">
          <span class="font-bold text-foreground">${escapeHtml(ind.name)}</span>
          ${ind.notesEn ? `<div class="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">${escapeHtml(ind.notesEn)}</div>` : ''}
        </div>`).join('')}
      </div>
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">🎯 Sensitive Substrates & Narrow Therapeutic Index:</div>
    <div class="space-y-1.5">
      ${(cyp.substrates || []).map(sub => `
      <div class="text-xs">
        <span class="font-bold text-foreground">${escapeHtml(sub.name)}</span>
        ${sub.notesEn ? `<div class="text-[11px] text-muted-foreground mt-0.5">${escapeHtml(sub.notesEn)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>

  ${cyp.clinicalRules && cyp.clinicalRules.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2">
    <div class="text-xs font-bold text-primary mb-2">High-Yield Clinical Drug Interaction Rules:</div>
    <div class="space-y-2">
      ${cyp.clinicalRules.map(cr => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border space-y-1 text-xs">
        <div class="font-bold text-foreground">${escapeHtml(cr.titleEn)}</div>
        <div class="text-muted-foreground"><strong>Mechanism:</strong> ${escapeHtml(cr.mechanismEn)}</div>
        <div class="text-emerald-600 dark:text-emerald-400"><strong>Recommendation:</strong> ${escapeHtml(cr.recommendationEn)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-pharm-cyp',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Pharmacology', 'CYP450', 'Drug Interactions', cypCode]
  });
}

// 14 Mechanisms from mechanismsRegistry
for (const mech of mechanismsList) {
  const docId = `doc-mech-${mech.subcategoryId}`;
  const title = `مکانیسم اثر: ${mech.categoryTitleFa}`;
  const titleEn = `Mechanism of Action: ${mech.categoryTitleEn}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">مسیر زیستی و هدف مولکولی (Target Pathway):</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(mech.targetPathwayFa)}</div>
    <div class="text-xs text-muted-foreground mt-1"><strong class="text-foreground">عملکرد اولیه:</strong> ${escapeHtml(mech.primaryActionFa)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border">
    <div class="text-xs font-bold text-foreground mb-1">خلاصه فارماکودینامیک بالینی:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.summaryFa)}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-3">کلاس‌های دارویی کلیدی و مکانیسم عمل سلولی:</h3>
    <div class="space-y-3">
      ${(mech.keyClasses || []).map(cls => `
      <div class="p-3.5 rounded-2xl bg-card border border-border space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-primary">${escapeHtml(cls.nameFa)} <span class="text-muted-foreground text-[11px]" dir="ltr">(${escapeHtml(cls.nameEn)})</span></div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-mono">${escapeHtml(cls.actionType)}</span>
        </div>
        <div class="text-xs text-muted-foreground leading-relaxed"><strong class="text-foreground">مکانیسم سلولی:</strong> ${escapeHtml(cls.mechanismFa)}</div>
        <div class="text-xs text-muted-foreground font-mono" dir="ltr"><strong class="text-foreground" dir="rtl">داروهای نمونه:</strong> ${escapeHtml(cls.examples)}</div>
      </div>`).join('')}
    </div>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">Target Pathway & Cellular Site:</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(mech.targetPathwayEn)}</div>
    <div class="text-xs text-muted-foreground mt-1"><strong class="text-foreground">Primary Action:</strong> ${escapeHtml(mech.primaryActionEn)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border">
    <div class="text-xs font-bold text-foreground mb-1">Clinical Pharmacodynamic Summary:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.summaryEn)}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-3">Key Drug Classes & Cellular Actions:</h3>
    <div class="space-y-3">
      ${(mech.keyClasses || []).map(cls => `
      <div class="p-3.5 rounded-2xl bg-card border border-border space-y-2">
        <div class="flex items-center justify-between">
          <div class="text-xs font-bold text-primary">${escapeHtml(cls.nameEn)}</div>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-secondary font-mono">${escapeHtml(cls.actionType)}</span>
        </div>
        <div class="text-xs text-muted-foreground leading-relaxed"><strong class="text-foreground">Cellular Mechanism:</strong> ${escapeHtml(cls.mechanismEn)}</div>
        <div class="text-xs text-muted-foreground font-mono"><strong class="text-foreground">Examples:</strong> ${escapeHtml(cls.examples)}</div>
      </div>`).join('')}
    </div>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-pharm-mechanisms',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Pharmacology', 'Mechanism of Action', mech.categoryTitleEn]
  });
}

console.log(`Generated 6 CYP + ${mechanismsList.length} Mechanism documents in Pharmacology Pillar`);

// =========================================================================
// SECTION 3: 25 ESSENTIAL SHELF DRUG MONOGRAPHS (Pharmacopeia)
// =========================================================================

const selectedProducts = (SHELF_PRODUCTS || []).slice(0, 25);

for (const prod of selectedProducts) {
  let monoFolder = 'folder-mono-analgesics';
  if (prod.subcategoryId === 'sub-1-1') monoFolder = 'folder-mono-analgesics';
  else if (prod.subcategoryId === 'sub-1-3' || prod.subcategoryId === 'sub-1-4' || prod.categoryId === 'cat-3') monoFolder = 'folder-mono-resp-allergy';
  else if (prod.subcategoryId === 'sub-1-5') monoFolder = 'folder-mono-gi';
  else if (prod.subcategoryId === 'sub-1-2' || prod.categoryId === 'cat-1') monoFolder = 'folder-mono-topical';

  const title = `مونوگراف دارویی: ${prod.brandName} (${prod.genericName})`;
  const titleEn = `Monograph: ${prod.brandName} (${prod.genericName})`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-base font-bold text-foreground">${escapeHtml(prod.brandName)}</div>
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">${escapeHtml(prod.schedule)}</span>
    </div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">ماده مؤثره:</strong> ${escapeHtml(prod.activeIngredients)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">بسته‌بندی:</strong> ${escapeHtml(prod.packSize)}</div>
  </div>

  <div class="p-3.5 rounded-2xl bg-muted/40 border border-border">
    <div class="text-xs font-bold text-foreground mb-1">موارد مصرف بالینی (Indications):</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(prod.indications?.fa || prod.indications?.en || '-')}</p>
  </div>

  <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🤰 ایمنی در بارداری و شیردهی: رده ${escapeHtml(prod.tgaPregnancyCategory || 'A')}</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(prod.pregnancyAdvice?.fa || prod.pregnancyAdvice?.en || '-')}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">نکات مشاوره داروساز به بیمار (Counseling Points):</h3>
    <ul class="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
      ${(prod.counselingPoints || []).map(cp => `<li>${escapeHtml(cp.fa || cp.en)}</li>`).join('\n      ')}
    </ul>
  </div>

  ${prod.equivalentBrands && prod.equivalentBrands.length > 0 ? `
  <div class="p-3 rounded-2xl bg-secondary border border-border text-xs">
    <strong class="text-foreground">برندهای ژنریک معادل (Bioequivalent):</strong>
    <span class="font-mono text-primary" dir="ltr">${escapeHtml(prod.equivalentBrands.join(', '))}</span>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
    <div class="flex items-center justify-between flex-wrap gap-2">
      <div class="text-base font-bold text-foreground">${escapeHtml(prod.brandName)}</div>
      <span class="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-300 font-mono font-bold">${escapeHtml(prod.schedule)}</span>
    </div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">Active Ingredients:</strong> ${escapeHtml(prod.activeIngredients)}</div>
    <div class="text-xs text-muted-foreground"><strong class="text-foreground">Pack Size:</strong> ${escapeHtml(prod.packSize)}</div>
  </div>

  <div class="p-3.5 rounded-2xl bg-muted/40 border border-border">
    <div class="text-xs font-bold text-foreground mb-1">Clinical Indications:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(prod.indications?.en || '-')}</p>
  </div>

  <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🤰 TGA Pregnancy Category ${escapeHtml(prod.tgaPregnancyCategory || 'A')}:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(prod.pregnancyAdvice?.en || '-')}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">Pharmacist Counseling Points:</h3>
    <ul class="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
      ${(prod.counselingPoints || []).map(cp => `<li>${escapeHtml(cp.en)}</li>`).join('\n      ')}
    </ul>
  </div>

  ${prod.equivalentBrands && prod.equivalentBrands.length > 0 ? `
  <div class="p-3 rounded-2xl bg-secondary border border-border text-xs">
    <strong class="text-foreground">Bioequivalent Brands:</strong>
    <span class="font-mono text-primary">${escapeHtml(prod.equivalentBrands.join(', '))}</span>
  </div>` : ''}
</div>`;

  documents.push({
    id: `doc-mono-${prod.id}`,
    folder_id: monoFolder,
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Monograph', prod.genericName, prod.schedule]
  });
}

console.log(`Generated ${selectedProducts.length} Product Monograph documents in Pharmacopeia Pillar`);

// =========================================================================
// SECTION 4: 20 CLINICAL SCENARIOS (Slang, High-Stakes Triage, Admin)
// =========================================================================

// 4.1 Slang Scenarios
for (const sc of (SLANG_SCENARIOS || [])) {
  const docId = `doc-scenario-slang-${sc.id}`;
  const title = `مکالمه بیمار: ${sc.title?.fa || sc.id}`;
  const titleEn = `Patient Case: ${sc.title?.en || sc.id}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">شرح صحبت و ابهام بیمار در داروخانه:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">«${escapeHtml(sc.patientProfile?.presentation?.fa || '')}»</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">پروتکل پرسش‌های تشخیصی W-H-A-T-M-A-N:</h3>
    <div class="space-y-2">
      ${(sc.whatQuestions || []).map(wq => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border text-xs">
        <div class="font-bold text-primary mb-1">${escapeHtml(wq.label?.fa || wq.key)}: ${escapeHtml(wq.question?.fa || '')}</div>
        <div class="text-muted-foreground">پاسخ بیمار: ${escapeHtml(wq.answer?.fa || '')}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">⚠️ علائم هشدار و موارد رد دارو:</div>
    <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.fa || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">Patient Presentation & Slang Query:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">"${escapeHtml(sc.patientProfile?.presentation?.en || '')}"</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">W-H-A-T-M-A-N Consultation Protocol:</h3>
    <div class="space-y-2">
      ${(sc.whatQuestions || []).map(wq => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border text-xs">
        <div class="font-bold text-primary mb-1">${escapeHtml(wq.label?.en || wq.key)}: ${escapeHtml(wq.question?.en || '')}</div>
        <div class="text-muted-foreground">Patient response: ${escapeHtml(wq.answer?.en || '')}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">⚠️ Red Flags & Referral Criteria:</div>
    <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.en || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-slang',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Patient Slang', 'OTC Consultation', 'Communication']
  });
}

// 4.2 Top 12 Clinical Scenarios
const selectedClinical = (CLINICAL_SCENARIOS || []).slice(0, 12);
for (const sc of selectedClinical) {
  const docId = `doc-scenario-clinical-${sc.id}`;
  const title = `تریاژ بالینی: ${sc.title?.fa || sc.id}`;
  const titleEn = `Clinical Triage: ${sc.title?.en || sc.id}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">پرونده بیمار و شرح حال اولیه:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">${escapeHtml(sc.patientProfile?.presentation?.fa || '')}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">پرسش‌های ارزیابی تشخیصی داروساز:</h3>
    <div class="space-y-2">
      ${(sc.whatQuestions || []).map(wq => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border text-xs">
        <div class="font-bold text-primary mb-1">${escapeHtml(wq.label?.fa || wq.key)}: ${escapeHtml(wq.question?.fa || '')}</div>
        <div class="text-muted-foreground">${escapeHtml(wq.answer?.fa || '')}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">🚨 خطوط قرمز ارجاع اورژانسی:</div>
    <ul class="list-disc list-inside text-xs text-rose-700 dark:text-rose-300 space-y-1">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.fa || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Patient Presentation & History:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">${escapeHtml(sc.patientProfile?.presentation?.en || '')}</p>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">Pharmacist Diagnostic Inquiries:</h3>
    <div class="space-y-2">
      ${(sc.whatQuestions || []).map(wq => `
      <div class="p-3 rounded-xl bg-muted/40 border border-border text-xs">
        <div class="font-bold text-primary mb-1">${escapeHtml(wq.label?.en || wq.key)}: ${escapeHtml(wq.question?.en || '')}</div>
        <div class="text-muted-foreground">${escapeHtml(wq.answer?.en || '')}</div>
      </div>`).join('')}
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400 mb-1">🚨 Red Flags & Emergency Referral:</div>
    <ul class="list-disc list-inside text-xs text-rose-700 dark:text-rose-300 space-y-1">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.en || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-clinical',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Clinical Triage', 'Emergency Case', sc.category?.en || 'Triage']
  });
}

// 4.3 4 Admin Scenarios
for (const sc of (ADMIN_SCENARIOS || [])) {
  const docId = `doc-scenario-admin-${sc.id}`;
  const title = `قوانین نسخه و بیمه: ${sc.title?.fa || sc.id}`;
  const titleEn = `Administrative Script Case: ${sc.title?.en || sc.id}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25">
    <div class="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">مسئله قانونی و بیمه‌ای:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">${escapeHtml(sc.patientProfile?.presentation?.fa || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border">
    <h3 class="text-xs font-bold text-foreground mb-2">اقدامات قانونی داروساز:</h3>
    <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1.5">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.fa || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/25">
    <div class="text-xs font-bold text-blue-600 dark:text-blue-400 mb-1">Administrative & PBS Dilemma:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">${escapeHtml(sc.patientProfile?.presentation?.en || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border">
    <h3 class="text-xs font-bold text-foreground mb-2">Legal Compliance Action:</h3>
    <ul class="list-disc list-inside text-xs text-muted-foreground space-y-1.5">
      ${(sc.redFlags || []).map(rf => `<li>${escapeHtml(rf.en || rf)}</li>`).join('\n      ')}
    </ul>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-admin',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Script Law', 'PBS Insurance', 'Administrative']
  });
}

console.log('Generated 20 Scenarios across Slang, Clinical, and Admin subfolders');

// =========================================================================
// SECTION 5: 36 ACADEMIC MODULE LESSONS (Mapped to 3 Module Subfolders)
// =========================================================================

for (const card of (ALL_PHARMACY_CARDS || [])) {
  const docId = `doc-${card.id}`;
  let modFolder = 'folder-mod-health-system';
  const modNum = String(card.module || '').replace('mod', '');
  if (modNum === '3' || modNum === '4') modFolder = 'folder-mod-dispensing';
  else if (modNum === '5' || modNum === '6') modFolder = 'folder-mod-populations';

  const titleFa = card.title?.fa || card.id;
  const titleEn = card.title?.en || card.id;
  const categoryFa = card.category?.fa || 'سیستم سلامت و دارویی';
  const categoryEn = card.category?.en || 'Healthcare & Practice';
  const pearlFa = card.actionPearl?.fa || '';
  const pearlEn = card.actionPearl?.en || '';
  const detailsHtmlFa = card.detailsHtml?.fa || '';
  const detailsHtmlEn = card.detailsHtml?.en || '';

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25">
    <div class="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">ماژول ${escapeHtml(modNum)}: ${escapeHtml(categoryFa)}</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(titleFa)}</div>
  </div>

  ${pearlFa ? `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">💡 نکته کلیدی بالینی و اجرایی:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(pearlFa)}</p>
  </div>` : ''}

  <div class="p-4 rounded-2xl bg-card border border-border">
    <div class="knowledge-html-content text-xs leading-relaxed text-foreground">
      ${detailsHtmlFa}
    </div>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25">
    <div class="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">Module ${escapeHtml(modNum)}: ${escapeHtml(categoryEn)}</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(titleEn)}</div>
  </div>

  ${pearlEn ? `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 mb-1">💡 Clinical / Governance Pearl:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(pearlEn)}</p>
  </div>` : ''}

  <div class="p-4 rounded-2xl bg-card border border-border">
    <div class="knowledge-html-content text-xs leading-relaxed text-foreground">
      ${detailsHtmlEn}
    </div>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: modFolder,
    title: `درس ماژول ${modNum}: ${titleFa}`,
    title_en: `Module ${modNum}: ${titleEn}`,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Academic Module', `Module ${modNum}`, categoryEn]
  });
}

console.log(`Total Generated Documents: ${documents.length}`);

// =========================================================================
// SECTION 6: 35 HIGH-YIELD BILINGUAL LEITNER FLASHCARDS
// =========================================================================

const leitnerCards = [];

// Sample cards from pharmacy
for (const sc of (INITIAL_SAMPLE_LEITNER_CARDS || [])) {
  leitnerCards.push({
    id: `card-${sc.id}`,
    front: sc.question.fa,
    back: sc.answer.fa,
    clue: sc.pearl ? sc.pearl.fa : undefined,
    box: 1,
    folder_id: 'folder-mod-dispensing',
    document_id: null
  });
}

// Cards from CYP
for (const cyp of cypList) {
  const cypCode = (cyp.id || 'CYP').toUpperCase();
  const cypInhibitors = (cyp.inhibitors || []).slice(0, 3).map(i => i.nameFa || i.name).join('، ');
  const cypSubstrates = (cyp.substrates || []).slice(0, 3).map(s => s.nameFa || s.name).join('، ');
  leitnerCards.push({
    id: `card-cyp-${(cyp.id || 'cyp').toLowerCase()}`,
    front: `مهم‌ترین مهارکننده‌ها و سوبستراهای آنزیم ${cypCode} کدامند و خطر اصلی تداخل چیست؟`,
    back: `مهارکننده‌ها: ${cypInhibitors || '-'}\nسوبستراها: ${cypSubstrates || '-'}\nخطر: مهار این آنزیم مانع کلیرانس دارو شده و غلظت پلاسمایی سوبسترا را تا حد سمیت شدید افزایش می‌دهد.`,
    clue: (cyp.clinicalSignificanceFa || '').slice(0, 100) + '...',
    box: 1,
    folder_id: 'folder-pharm-cyp',
    document_id: `doc-cyp-${(cyp.id || 'cyp').toLowerCase()}`
  });
}

// Cards from Diseases (Red flags and first-line)
const sampleDiseaseCards = [
  {
    id: 'card-disease-anal-fissure',
    front: 'منع مصرف حیاتی پماد رکتوجزیک (گلیسریل تری‌نیترات ۰.۲٪) در شقاق مقعد چیست؟',
    back: 'مصرف همزمان یا طی ۲۴ تا ۴۸ ساعت گذشته از مهارکننده‌های PDE5 (مانند سیلدنافیل، تادالافیل) به دلیل خطر افت فشار خون شدید و کلاپس قلبی-عروقی اکیداً ممنوع است.',
    clue: 'تداخل خطرناک نیترات با داروهای ناتوانی جنسی',
    box: 1,
    folder_id: 'folder-clinical-gi',
    document_id: 'doc-disease-anal_fissure'
  },
  {
    id: 'card-disease-acne-bp',
    front: 'تفاوت غلظت‌های ۲.۵٪، ۵٪ و ۱۰٪ بنزوئیل پروکساید در آکنه چیست و چه هشداری به بیمار ضروری است؟',
    back: 'غلظت‌های ۲.۵٪ و ۵٪ اثربخشی کاملاً مشابه ۱۰٪ دارند اما عوارض تحریک و قرمزی پوست در آن‌ها بسیار کمتر است. هشدار مهم: این دارو رنگ لباس، ملافه و مو را سفید می‌کند.',
    clue: 'اثربخشی معادل با عارضه کمتر و سفید شدن پارچه‌ها',
    box: 1,
    folder_id: 'folder-clinical-derma',
    document_id: 'doc-disease-acne'
  },
  {
    id: 'card-disease-gord-ppi',
    front: 'بهترین زمان مصرف پنتوپرازول یا ازومپرازول برای سوزش سردل و ریفلاکس چیست؟',
    back: '۳۰ تا ۶۰ دقیقه قبل از اولین وعده غذایی روز (صبحانه) با یک لیوان آب، زیرا پمپ‌های پروتون در هنگام غذا خوردن فعال می‌شوند و بیشترین مهار اتفاق می‌افتد.',
    clue: 'نیاز به فعال شدن پمپ‌ها با تحریک غذا',
    box: 1,
    folder_id: 'folder-clinical-gi',
    document_id: 'doc-disease-gord_heartburn'
  },
  {
    id: 'card-disease-vaginal-thrush',
    front: 'معیارهای ارجاع فوری بیمار با علائم کاندیدیازیس واژینال (Thrush) به پزشک چیست؟',
    back: '۱. بارداری یا سن زیر ۱۶ / بالای ۶۰ سال\n۲. بیش از ۲ بار عود در ۶ ماه گذشته\n۳. ترشحات بدبو یا خون‌آلود\n۴. درد زیر شکم یا تب\n۵. عدم بهبود پس از ۷ روز از درمان OTC.',
    clue: 'بارداری، عود مکرر، ترشح بدبو و درد شکمی',
    box: 1,
    folder_id: 'folder-clinical-women-uro',
    document_id: 'doc-disease-vaginal_thrush'
  },
  {
    id: 'card-disease-conjunctivitis',
    front: 'تفاوت تشخیصی کنژونکتیویت باکتریایی، ویروسی و آلرژیک چیست؟',
    back: 'باکتریایی: ترشح چرکی غلیظ زرد/سبز و چسبندگی شدید پلک‌ها در صبح.\nویروسی: ترشح آبکی، قرمزی و درگیری دوطرفه با علائم سرماخوردگی.\nآلرژیک: خارش شدید دوطرفه چشم همراه با رینیت و عطسه.',
    clue: 'خارش (آلرژیک) در برابر ترشح چرکی (باکتریایی)',
    box: 1,
    folder_id: 'folder-clinical-eyes-ears',
    document_id: 'doc-disease-bacterial_conjunctivitis'
  },
  {
    id: 'card-disease-headlice',
    front: 'روش صحیح استفاده از لوسیون پرمترین ۱٪ در درمان شپش سر چیست؟',
    back: 'روی موهای شسته شده و با حوله خشک شده مالیده شود، پس از ۱۰ دقیقه با آب گرم شسته شود. تکرار درمان دقیقاً پس از ۷ روز برای کشتن لاروهای تازه از تخم درآمده الزامی است.',
    clue: 'تکرار الزامی بعد از ۷ روز',
    box: 1,
    folder_id: 'folder-clinical-derma',
    document_id: 'doc-disease-headlice'
  }
];

for (const c of sampleDiseaseCards) {
  leitnerCards.push(c);
}

// Cards from Mechanisms
const sampleMechanismCards = [
  {
    id: 'card-mech-cox',
    front: 'چرا مهارکننده‌های انتخابی COX-2 (مثل سلکوکسیب) خطر ترومبوز قلبی-عروقی دارند؟',
    back: 'سلکوکسیب با مهار اختصاصی COX-2 مانع تولید پروستاسایکلین اندوتلیال (PGI2 گشادکننده عروق و مهارکننده تجمع پلاکت) می‌شود، در حالی که ترومبوکسان A2 پلاکتی (تولیدشده توسط COX-1) مهار نشده باقی می‌ماند و کفه ترازو به سمت ترومبوز و تنگی عروق سنگین می‌شود.',
    clue: 'بهم خوردن تعادل پروستاسایکلین و ترومبوکسان',
    box: 1,
    folder_id: 'folder-pharm-mechanisms',
    document_id: 'doc-mech-sub-1-1'
  },
  {
    id: 'card-mech-antifungals',
    front: 'تفاوت مکانیسم قارچ‌کشی آلیل‌آمین‌ها (تربینافین) با آزول‌ها (فلوکونازول) چیست؟',
    back: 'آزول‌ها آنزیم 14α-دمتیلاز را مهار کرده و سنتز ارگوسترول را متوقف می‌کنند (Fungistatic)، اما تربینافین آنزیم اسکوالن اپوکسیداز را مهار می‌کند که منجر به تجمع مقادیر سمی اسکوالن در سلول قارچ و لیز سریع دیواره می‌شود (Fungicidal).',
    clue: 'مهار اسکوالن اپوکسیداز و سمیت تجمعی',
    box: 1,
    folder_id: 'folder-pharm-mechanisms',
    document_id: 'doc-mech-sub-1-2'
  },
  {
    id: 'card-mech-antihistamines',
    front: 'چرا آنتی‌هیستامین‌های نسل دوم (فکسوفنادین، لوراتادین) خواب‌آلودگی کمتری نسبت به نسل اول دارند؟',
    back: 'نسل دوم مولکول‌های بزرگتر و قطبی‌تری هستند، سوبسترای پمپ P-glycoprotein هستند و از سد خونی مغزی (BBB) عبور نمی‌کنند، بنابراین گیرنده‌های H1 سیستم عصبی مرکزی را مسدود نمی‌کنند.',
    clue: 'عدم عبور از سد خونی مغزی (BBB)',
    box: 1,
    folder_id: 'folder-pharm-mechanisms',
    document_id: 'doc-mech-sub-1-4'
  }
];

for (const c of sampleMechanismCards) {
  leitnerCards.push(c);
}

// Cards from Slang & Triage
const sampleTriageCards = [
  {
    id: 'card-triage-thunderclap',
    front: 'اقدام حیاتی در مواجهه با بیماری که از سردرد ناگهانی شدید «مثل رعد و برق» شکایت دارد چیست؟',
    back: 'ارجاع فوری به اورژانس (تماس با ۱۱۵). سردرد رعدآسا (Thunderclap Headache) که در عرض ثانیه‌ها به اوج شدت می‌رسد نشانه پاتوقنومیک خونریزی زیر عنکبوتیه (SAH) ناشی از پارگی آنوریسم مغزی است.',
    clue: 'خونریزی زیر عنکبوتیه (SAH) و اورژانس مطلق',
    box: 1,
    folder_id: 'folder-cases-clinical',
    document_id: 'doc-scenario-clinical-sc-01-thunderclap-headache'
  },
  {
    id: 'card-triage-warfarin-bleeding',
    front: 'چه تداخلی بین وارفارین و آنتی‌بیوتیک‌های خوراکی (مثل مترونیدازول یا سیپروفلوکساسین) رخ می‌دهد؟',
    back: 'آنتی‌بیوتیک‌ها با مهار متابولیسم کبدی وارفارین (مهار CYP2C9 توسط مترونیدازول) و کشتن باکتری‌های روده‌ای تولیدکننده ویتامین K، باعث افزایش شدید INR و خونریزی‌های تهدیدکننده حیات می‌شوند.',
    clue: 'مهار CYP2C9 و کاهش ویتامین K روده',
    box: 1,
    folder_id: 'folder-cases-clinical',
    document_id: 'doc-scenario-clinical-sc-04-warfarin-interaction'
  },
  {
    id: 'card-triage-emergency-contraception',
    front: 'تفاوت پنجره زمانی اثربخشی لوونورژسترل (Postinor) با اولی‌پریستال (Ella) در اورژانس پیشگیری چیست؟',
    back: 'لوونورژسترل تا ۷۲ ساعت (۳ روز) پس از رابطه محافظت‌نشده اثربخش است (با افت تدریجی اثربخشی). اولی‌پریستال تا ۱۲۰ ساعت (۵ روز) اثربخشی پایدار خود را حفظ می‌کند و مهار تخمک‌گذاری را حتی پس از شروع موج LH انجام می‌دهد.',
    clue: '۷۲ ساعت (لوونورژسترل) در برابر ۱۲۰ ساعت (اولی‌پریستال)',
    box: 1,
    folder_id: 'folder-cases-clinical',
    document_id: 'doc-scenario-clinical-sc-05-emergency-contraception'
  },
  {
    id: 'card-clinical-simvastatin-macrolide',
    front: 'چرا مصرف همزمان سیمواستاتین با کلاریترومایسین یا اریترومایسین اکیداً ممنوع (Contraindicated) است؟',
    back: 'ماکرولیدها مهارکننده بسیار قوی CYP3A4 هستند و سطح خونی سیمواستاتین را بیش از ۱۰ برابر افزایش می‌دهند که منجر به رابدومیولیز شدید (تخریب بافت عضلانی)، میوگلوبینوری و نارسایی حاد کلیه می‌شود.',
    clue: 'خطر رابدومیولیز کشنده و نارسایی حاد کلیه',
    box: 1,
    folder_id: 'folder-pharm-cyp',
    document_id: 'doc-cyp-cyp3a4'
  },
  {
    id: 'card-clinical-codeine-cyp2d6',
    front: 'چرا در افراد با فنوتیپ Poor Metabolizer آنزیم CYP2D6 مصرف استامینوفن کدئین هیچ‌گونه اثر ضد دردی ایجاد نمی‌کند؟',
    back: 'کدئین یک پیش‌دارو (Prodrug) غیرفعال است و برای تبدیل به مورفین فعال به ایزوآنزیم CYP2D6 نیاز دارد. در افراد فاقد این آنزیم، تبدیل به مورفین رخ نداده و تنها عوارض جانبی ایجاد می‌شود.',
    clue: 'نیاز به تبدیل کدئین به مورفین توسط CYP2D6',
    box: 1,
    folder_id: 'folder-pharm-cyp',
    document_id: 'doc-cyp-cyp2d6'
  },
  {
    id: 'card-clinical-clopidogrel-omeprazole',
    front: 'تداخل بالینی مهم بین کلوپیدوگرل (Plavix) و امپرازول چیست و گایدلاین استرالیا چه جایگزینی پیشنهاد می‌دهد؟',
    back: 'کلوپیدوگرل پیش‌دارویی است که برای فعال‌سازی ضد پلاکتی به CYP2C19 نیاز دارد. امپرازول این آنزیم را مهار کرده و اثربخشی محافظتی در برابر لخته را به شدت کاهش می‌دهد. در صورت نیاز به PPI، پنتوپرازول جایگزین امن‌تری است.',
    clue: 'کاهش اثر ضدپلاکتی کلوپیدوگرل و جایگزینی با پنتوپرازول',
    box: 1,
    folder_id: 'folder-pharm-cyp',
    document_id: 'doc-cyp-cyp2c19'
  },
  {
    id: 'card-clinical-paracetamol-nac',
    front: 'پادزهر اختصاصی مسمومیت حاد با استامینوفن (Paracetamol Overdose) چیست و مکانیسم محافظت کبدی آن چیست؟',
    back: 'ان-استیل سیستئین (NAC). با بازسازی ذخایر گلوتاتیون کبدی و اتصال مستقیم به متابولیت سمی NAPQI (تولید شده توسط CYP2E1)، مانع از نکروز سلول‌های کبدی می‌شود. بهترین زمان شروع ظرف ۸ ساعت اول مسمومیت است.',
    clue: 'بازسازی گلوتاتیون و خنثی‌سازی NAPQI',
    box: 1,
    folder_id: 'folder-pharm-cyp',
    document_id: 'doc-cyp-cyp2e1'
  },
  {
    id: 'card-clinical-gout-allopurinol',
    front: 'چرا آلوپورینول هرگز نباید در حین یک حمله حاد نقرس (Acute Gout Attack) آغاز شود؟',
    back: 'تغییر ناگهانی و افت سریع اسید اوریک سرم باعث حل شدن کریستال‌های اورات از مفاصل و ایجاد یک فاز تشدید التهابی شدید و طولانی‌مدت می‌شود. آلوپورینول باید حداقل ۲ تا ۴ هفته پس از فروکش کامل حمله آغاز شود.',
    clue: 'تحریک مجدد حمله با نوسان ناگهانی سطح اسید اوریک',
    box: 1,
    folder_id: 'folder-clinical-pain',
    document_id: 'doc-disease-pain_relief'
  },
  {
    id: 'card-clinical-asthma-cal',
    front: 'برچسب احتیاطی الزامی (CAL Label) پس از مصرف اسپری‌های کورتیکواستروئید استنشاقی (ICS) چیست و دلیل آن چیست؟',
    back: '«پس از مصرف، دهان را با آب بشویید و آب را بیرون بریزید». دلیل: جلوگیری از رسوب دارو در مخاط دهان و حلق که می‌تواند باعث برفک دهانی (Oral Candidiasis) و خشونت صدا (Dysphonia) شود.',
    clue: 'پیشگیری از برفک دهانی و تغییر صدا',
    box: 1,
    folder_id: 'folder-mono-resp-allergy',
    document_id: 'doc-mono-prod-ventolin-inhaler'
  },
  {
    id: 'card-clinical-s8-regulations',
    front: 'بر اساس قوانین داروسازی استرالیا، حداکثر اعتبار قانونی نسخه داروهای مخدر Schedule 8 چقدر است و نگهداری آن چگونه باید باشد؟',
    back: 'حداکثر ۶ ماه از تاریخ صدور نسخه توسط پزشک. این داروها باید حتماً در گاوصندوق فولادی مقاوم به سرقت و متصل به زمین یا دیوار (S8 Safe) نگهداری شوند و ورود و خروج آن‌ها در دفتر ثبت مخدر (S8 Register) ثبت گردد.',
    clue: 'اعتبار ۶ ماه و نگهداری در گاوصندوق فولادی',
    box: 1,
    folder_id: 'folder-mod-dispensing',
    document_id: null
  },
  {
    id: 'card-clinical-warfarin-inr',
    front: 'محدوده هدف استاندارد INR برای بیمار مبتلا به فیبریلاسیون دهلیزی (AF) چقدر است و پادزهر سریع وارفارین چیست؟',
    back: 'محدوده هدف ۲.۰ تا ۳.۰ است. پادزهر دارویی خوراکی/وریدی فیتومنادیون (ویتامین K1) است و در خونریزی‌های تهدیدکننده حیات کنسانتره کمپلکس پروترومبین (Prothrombinex-VF) تزریق می‌شود.',
    clue: 'INR هدف ۲ تا ۳ و ویتامین K1',
    box: 1,
    folder_id: 'folder-pharm-mechanisms',
    document_id: 'doc-mech-sub-2-4'
  },
  {
    id: 'card-clinical-cal-sedation',
    front: 'برچسب CAL 1 (هشدار خواب‌آلودگی و الکل) الزامی برای چه داروهایی است؟',
    back: 'برای آنتی‌هیستامین‌های نسل اول (کلرفنیرامین، پرومتازین، دیفن‌هیدرامین)، بنزودیازپین‌ها، شل‌کننده‌های عضلانی و مسکن‌های اپیوئیدی. به بیمار هشدار می‌دهد که این دارو باعث گیجی شده و با الکل تشدید می‌شود.',
    clue: 'هشدار رانندگی و هم‌افزایی با الکل',
    box: 1,
    folder_id: 'folder-mod-dispensing',
    document_id: null
  },
  {
    id: 'card-clinical-reg49',
    front: 'قانون مقررات ۴۹ (Regulation 49 / Emergency Supply) در استرالیا چیست؟',
    back: 'به داروساز اجازه می‌دهد در شرایط اضطراری که بیمار به دلیل فاصله جغرافیایی یا اورژانس پزشکی قادر به دریافت داروی حیاتی مزمن نیست، تمام تکرارهای نسخه (Original + Repeats) را به صورت یکجا به بیمار تحویل دهد.',
    clue: 'تحویل یکجای تکرارها در شرایط اضطراری',
    box: 1,
    folder_id: 'folder-cases-admin',
    document_id: null
  }
];

for (const c of sampleTriageCards) {
  leitnerCards.push(c);
}

console.log(`Total Generated Flashcards: ${leitnerCards.length}`);

// Output compiled dataset to src/lib/pharmacySeedData.ts
const fileContent = `/**
 * Complete Pharmacy Knowledge Base & Encyclopedia Seed Data
 * Automatically compiled from pharmacy source repositories with full bilingual depth.
 * Contains:
 * - 23 Folders (1 Root + 5 Main Pillars + 17 Specialized Clinical Subcategories)
 * - ${documents.length} Comprehensive Bilingual Documents (Diseases, CYP Enzymes, Mechanisms, Monographs, Scenarios, Lessons)
 * - ${leitnerCards.length} High-Yield Clinical Leitner Spaced-Repetition Cards
 */

export const PHARMACY_ROOT_FOLDER_ID = '${PHARMACY_ROOT_FOLDER_ID}';

export const PHARMACY_SEED_FOLDERS = ${JSON.stringify(PHARMACY_FOLDERS, null, 2)};

export const PHARMACY_SEED_DOCUMENTS = ${JSON.stringify(documents, null, 2)};

export const PHARMACY_SEED_CARDS = ${JSON.stringify(leitnerCards, null, 2)};
`;

fs.writeFileSync(path.join(targetDir, 'pharmacySeedData.ts'), fileContent, 'utf8');
console.log('Successfully written to src/lib/pharmacySeedData.ts!');
