import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { renderSourceValue } from './pharmacySeedRenderer.mjs';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pharmacyDir = process.env.PHARMACY_SOURCE_DIR || path.resolve(scriptDir, '../../pharmacy');
const targetDir = path.resolve(scriptDir, process.env.PHARMACY_SEED_OUTPUT_DIR || '../src/lib');
const sourceCommit = execFileSync('git', ['-C', pharmacyDir, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

function extractExports(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required source file not found: ${filePath}`);
  }
  const rawCode = fs.readFileSync(filePath, 'utf8').replace(/import\s+[^;]+;/g, '');
  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;
  const moduleObj = { exports: {} };
  new Function('module', 'exports', transpiled)(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

// Some source collections are intentionally module-private. Read only their
// literal initializer instead of evaluating imports or silently dropping them.
function extractLiteralArray(filePath, variableName) {
  if (!fs.existsSync(filePath)) throw new Error(`Required source file not found: ${filePath}`);
  const source = ts.createSourceFile(filePath, fs.readFileSync(filePath, 'utf8'), ts.ScriptTarget.Latest, true);
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (declaration.name.getText(source) !== variableName || !declaration.initializer) continue;
      const expression = declaration.initializer.getText(source);
      const js = ts.transpileModule(`module.exports = ${expression};`, {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
      }).outputText;
      const moduleObj = { exports: null };
      new Function('module', js)(moduleObj);
      if (!Array.isArray(moduleObj.exports)) throw new Error(`${variableName} must be an array`);
      return moduleObj.exports;
    }
  }
  throw new Error(`Required source collection not found: ${variableName} in ${filePath}`);
}

console.log('--- Loading Complete Pharmacy Source Data ---');

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
const handbookSourceFileById = new Map([
  ['src/data/handbook/part1.ts', OTC_HANDBOOK_DATA_PART1 || []],
  ['src/data/handbook/part2.ts', OTC_HANDBOOK_DATA_PART2 || []],
  ['src/data/handbook/part3.ts', OTC_HANDBOOK_DATA_PART3 || []],
].flatMap(([sourceFile, entries]) => entries.map((entry) => [entry.id, sourceFile])));

// 3. Clinical Translations (43 items)
const { OTC_CLINICAL_TRANSLATIONS } = extractExports(path.join(pharmacyDir, 'data/otcClinicalTranslations.ts'));

// 4. CYP Enzymes (6 items) & Common Pairs (9 items)
const { CYP_ENZYMES_DATABASE, COMMON_PAIR_INTERACTIONS } = extractExports(path.join(pharmacyDir, 'data/cypInteractionsData.ts'));
const cypList = Object.values(CYP_ENZYMES_DATABASE || {});

// 5. Mechanism overviews (14 subcategories) and drug-class mechanisms (70 records)
const { SUBCATEGORY_MECHANISMS, DRUG_MECHANISMS_REGISTRY } = extractExports(path.join(pharmacyDir, 'data/mechanismsRegistry.ts'));
const mechanismsList = Object.values(SUBCATEGORY_MECHANISMS || {});
const drugMechanismsList = Object.values(DRUG_MECHANISMS_REGISTRY || {});
if (mechanismsList.length === 0 || drugMechanismsList.length === 0) {
  throw new Error('Both mechanism overview and drug-class registries are required for Pharmacy import.');
}

// 6. Shelf Products (121 items)
const { SHELF_PRODUCTS } = extractExports(path.join(pharmacyDir, 'data/shelf/shelfProducts.ts'));

// 7. CAL Labels (22 items)
const { CAL_LABELS_DICT } = extractExports(path.join(pharmacyDir, 'data/shelf/calLabels.ts'));

// 8. State Storage Rules (8 items)
const { STATE_STORAGE_RULES } = extractExports(path.join(pharmacyDir, 'data/shelf/stateStorageRules.ts'));

// 9. Clinical Concepts (35 items)
const { CLINICAL_CONCEPTS_REGISTRY } = extractExports(path.join(pharmacyDir, 'data/shelf/clinicalConcepts.ts'));

// 10. Scenarios (32 items: 4 slang + 24 clinical + 4 admin)
const { SLANG_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/slangScenarios.ts'));
const { CLINICAL_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/clinicalScenarios.ts'));
const { ADMIN_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/adminScenarios.ts'));

// 11. Realistic Scripts (6 items) & Script Types (7 items)
const { REALISTIC_SCRIPTS_DATABASE } = extractExports(path.join(pharmacyDir, 'data/realisticScriptsData.ts'));
const { AUSTRALIAN_SCRIPT_TYPES_DATA } = extractExports(path.join(pharmacyDir, 'data/scriptTypesData.ts'));

// 12. Source-provided sample Leitner cards (plus disease cards below)
const { INITIAL_SAMPLE_LEITNER_CARDS } = extractExports(path.join(pharmacyDir, 'lib/sample-leitner-cards.ts'));

// Authored source collections omitted by the original 330-document conversion.
const CORE_CLINICAL_DISEASES = extractLiteralArray(path.join(pharmacyDir, 'data/diseasesRegistry.ts'), 'CORE_CLINICAL_DISEASES');
const { CLINICAL_DOMAINS } = extractExports(path.join(pharmacyDir, 'data/shelf/clinicalDomains.ts'));
const { STUDY_TRACKS_DATABASE } = extractExports(path.join(pharmacyDir, 'data/studyTracksData.ts'));
const { SAMPLE_QUIZ_QUESTIONS } = extractExports(path.join(pharmacyDir, 'lib/pharmacy-data.ts'));
for (const [label, rows] of Object.entries({ CORE_CLINICAL_DISEASES, CLINICAL_DOMAINS, STUDY_TRACKS_DATABASE, SAMPLE_QUIZ_QUESTIONS })) {
  if (!Array.isArray(rows) || rows.length === 0) throw new Error(`Required source collection is empty: ${label}`);
}

console.log('--- Defining pharmacy folders with deep hierarchical taxonomy ---');

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
  // PILLAR 1: CLINICAL DISEASE ATLAS (43 diseases)
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
  // PILLAR 2: PHARMACOLOGY, CYP & CONCEPTS (55 docs)
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
  {
    id: 'folder-pharm-concepts',
    name: '⚠️ ۲-۳. مفاهیم بالینی پرتکرار، سمیت و پرچم‌های قرمز (High-Yield Clinical Concepts)',
    icon: 'ShieldAlert',
    color: '#d946ef',
    parent_id: 'folder-pharmacy-cat-pharmacology',
    position: 12
  },

  // -------------------------------------------------------------
  // PILLAR 3: PHARMACY SHELF, PRODUCTS & REGULATIONS (151 docs)
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-monographs',
    name: '📦 ۳. قفسه فرآورده‌های دارویی، برندها و قوانین نگهداری (Pharmacy Shelf & Products)',
    icon: 'Pill',
    color: '#f59e0b',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 13
  },
  {
    id: 'folder-mono-resp',
    name: '🫁 ۳-۱. فرآورده‌های تنفسی، آلرژی، سرفه و سرماخوردگی (Respiratory & Allergy Care)',
    icon: 'Wind',
    color: '#06b6d4',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 14
  },
  {
    id: 'folder-mono-pain',
    name: '🩹 ۳-۲. مسکن‌ها، ضدالتهاب‌ها و ضددردها (Analgesics, NSAIDs & Pain Relief)',
    icon: 'ShieldAlert',
    color: '#ef4444',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 15
  },
  {
    id: 'folder-mono-gi',
    name: '🫄 ۳-۳. فرآورده‌های گوارشی، ضداسید و ملین‌ها (Gastrointestinal Care)',
    icon: 'Layers',
    color: '#f97316',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 16
  },
  {
    id: 'folder-mono-topical',
    name: '🧴 ۳-۴. فرآورده‌های پوستی، ضدقارچ و موضعی (Dermatologicals & Antifungals)',
    icon: 'Sparkle',
    color: '#ec4899',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 17
  },
  {
    id: 'folder-mono-special',
    name: '👁️ ۳-۵. قطره‌های چشمی، گوشی و فرآورده‌های تخصصی (Eye, Ear & Specialty)',
    icon: 'Eye',
    color: '#8b5cf6',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 18
  },
  {
    id: 'folder-mono-cal',
    name: '🏷️ ۳-۶. برچسب‌های هشدار و راهنمای مصرف APF (CAL Labels 1 to 22)',
    icon: 'Tag',
    color: '#eab308',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 19
  },
  {
    id: 'folder-mono-storage',
    name: '🏛️ ۳-۷. قوانین ایالتی نگهداری داروهای S2 و S3 در استرالیا (State Storage Rules)',
    icon: 'Building2',
    color: '#10b981',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 20
  },

  // -------------------------------------------------------------
  // PILLAR 4: CLINICAL TRIAGE, SLANG & SCRIPTS (45 docs)
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-cases-triage',
    name: '⚕️ ۴. سناریوهای بالینی، تریاژ و مهارت‌های دیسپنسینگ (Clinical Triage & Practice)',
    icon: 'ClipboardCheck',
    color: '#ec4899',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 21
  },
  {
    id: 'folder-cases-slang',
    name: '🗣️ ۴-۱. اصطلاحات عامیانه و کوچه بازاری بیماران (Patient Slang & Terminology)',
    icon: 'MessageSquare',
    color: '#f43f5e',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 22
  },
  {
    id: 'folder-cases-clinical',
    name: '📋 ۴-۲. سناریوهای تصمیم‌گیری و تریاژ بالینی داروساز (High-Stakes Clinical Scenarios)',
    icon: 'ClipboardCheck',
    color: '#db2777',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 23
  },
  {
    id: 'folder-cases-admin',
    name: '📑 ۴-۳. مدیریت اداری، بیمه و قوانین نسخه‌نویسی (Administrative & Script Rules)',
    icon: 'FileText',
    color: '#be185d',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 24
  },
  {
    id: 'folder-cases-scripts',
    name: '📝 ۴-۴. نسخه‌های واقعی PBS، چالش‌های قانونی و تحویل دارو (Realistic PBS Scripts)',
    icon: 'FileCheck',
    color: '#9333ea',
    parent_id: 'folder-pharmacy-cat-cases-triage',
    position: 25
  },

  // -------------------------------------------------------------
  // PILLAR 5: ACADEMIC MODULES & HEALTHCARE LEGISLATION (36 docs)
  // -------------------------------------------------------------
  {
    id: 'folder-pharmacy-cat-academic-modules',
    name: '📚 ۵. درس‌های آکادمیک و سیستم سلامت استرالیا (Modules 1-6 Lessons)',
    icon: 'BookOpen',
    color: '#0284c7',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 26
  },
  {
    id: 'folder-mod-health-system',
    name: '🏛️ ۵-۱. سیستم سلامت، ساختار PBS و نهاد TGA (Healthcare System & PBS Structure)',
    icon: 'Landmark',
    color: '#0284c7',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 27
  },
  {
    id: 'folder-mod-dispensing',
    name: '💊 ۵-۲. قوانین نسخه‌پیچی، مشاوره و مراقبت‌های اولیه (Dispensing & Primary Care)',
    icon: 'Pill',
    color: '#0369a1',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 28
  },
  {
    id: 'folder-mod-populations',
    name: '👶 ۵-۳. جمعیت‌های خاص، ایمنی بیمار و فارماکوویژیلانس (Special Populations & Safety)',
    icon: 'HeartHandshake',
    color: '#075985',
    parent_id: 'folder-pharmacy-cat-academic-modules',
    position: 29
  },
  {
    id: 'folder-clinical-core',
    name: 'بیماری‌های اصلی و مزمن (Core Clinical Conditions)',
    icon: 'HeartPulse',
    color: '#0d9488',
    parent_id: 'folder-pharmacy-cat-clinical-atlas',
    position: 30
  },
  {
    id: 'folder-mono-domains',
    name: 'حوزه‌های بالینی و راهنمای قفسه (Clinical Domains)',
    icon: 'Library',
    color: '#d97706',
    parent_id: 'folder-pharmacy-cat-monographs',
    position: 31
  },
  {
    id: 'folder-pharmacy-cat-learning',
    name: 'مسیرهای یادگیری و آزمون‌ها (Study Paths & Quizzes)',
    icon: 'GraduationCap',
    color: '#2563eb',
    parent_id: PHARMACY_ROOT_FOLDER_ID,
    position: 32
  },
  {
    id: 'folder-learning-tracks',
    name: 'مسیرهای یادگیری (Study Tracks)',
    icon: 'Route',
    color: '#3b82f6',
    parent_id: 'folder-pharmacy-cat-learning',
    position: 33
  },
  {
    id: 'folder-learning-quizzes',
    name: 'پرسش‌های تمرینی (Practice Questions)',
    icon: 'ListChecks',
    color: '#6366f1',
    parent_id: 'folder-pharmacy-cat-learning',
    position: 34
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

// Subcategory to Disease mapping
const subcategoryDiseaseMap = {
  'sub-1-1': ['pain_relief', 'dis-migraine', 'dis-soft-tissue-injury', 'dis-gout', 'mouth_ulcers', 'teething'],
  'sub-1-2': ['tinea_infections', 'tinea_versicolor', 'vaginal_thrush', 'oral_thrush', 'worms_pinworms', 'scabies', 'headlice'],
  'sub-1-3': ['bacterial_conjunctivitis', 'blepharitis', 'dry_eyes', 'stye', 'ear_wax', 'swimmers_ear'],
  'sub-1-4': ['dis-asthma', 'dis-copd', 'hayfever', 'nasal_congestion', 'chesty_cough', 'dry_cough', 'sore_throat', 'smoking_cessation'],
  'sub-1-5': ['gord_heartburn', 'constipation', 'diarrhoea', 'haemorrhoids', 'anal_fissure', 'motion_sickness'],
  'sub-1-6': ['eczema', 'acne', 'seborrhoeic_dermatitis', 'nappy_rash', 'cradle_cap', 'burns_sunburn', 'chilblains', 'corns_calluses', 'warts', 'stings_bites', 'cold_sores', 'shingles'],
  'sub-1-7': ['uti_cystitis', 'vaginal_thrush', 'mouth_ulcers', 'dry_mouth', 'teething']
};

// Disease category mapping
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

// Scenario to Disease mapping
const scenarioToDiseaseMap = {
  'cough-triage': 'chesty_cough',
  'hayfever-triage': 'hayfever',
  's3-pseudoephedrine': 'nasal_congestion',
  'coldsore-triage': 'cold_sores',
  'chickenpox-advisory': 'chickenpox',
  'hydrocortisone-triage': 'eczema',
  'pinworm-triage': 'worms_pinworms',
  'thrush-triage': 'vaginal_thrush',
  'shingrix-vaccine': 'shingles',
  'ear-triage': 'ear_wax',
  'dyspepsia-triage': 'gord_heartburn',
  'sunburn-triage': 'burns_sunburn',
  'slang-ibuprofen-brand-vs-generic': 'pain_relief',
  'slang-severe-hayfever-bunged-nose': 'hayfever',
  'slang-motion-sickness-boat': 'motion_sickness',
  'slang-toddler-bark-panadol-baby': 'pain_relief'
};

// Product folder mapping
function getProductFolder(prod) {
  const sub = prod.subcategoryId || '';
  if (sub === 'sub-1-1') return 'folder-mono-pain';
  if (sub === 'sub-1-4') return 'folder-mono-resp';
  if (sub === 'sub-1-5') return 'folder-mono-gi';
  if (sub === 'sub-1-6' || sub === 'sub-1-2') return 'folder-mono-topical';
  return 'folder-mono-special';
}

// Find products matching a disease
function getProductsForDisease(diseaseId, diseaseName) {
  const normalizedId = diseaseId.toLowerCase();
  const normalizedName = diseaseName.toLowerCase();
  return (SHELF_PRODUCTS || []).filter(p => {
    // Check subcategory mapping
    for (const [subId, diseaseList] of Object.entries(subcategoryDiseaseMap)) {
      if (diseaseList.includes(normalizedId) && p.subcategoryId === subId) {
        return true;
      }
    }
    // Check indications text
    const indText = `${p.indications?.en || ''} ${p.indications?.fa || ''} ${p.brandName} ${p.genericName}`.toLowerCase();
    return indText.includes(normalizedId.replace(/_/g, ' ')) || indText.includes(normalizedName);
  });
}

// Find matching scenario for a disease
function getScenarioForDisease(diseaseId) {
  for (const [scId, dId] of Object.entries(scenarioToDiseaseMap)) {
    if (dId === diseaseId) {
      const found = (CLINICAL_SCENARIOS || []).find(s => s.id === scId) ||
                    (SLANG_SCENARIOS || []).find(s => s.id === scId);
      if (found) return applyPseudoephedrineScenarioEditorialCorrection(found);
    }
  }
  return null;
}

const PSEUDOEPHEDRINE_REFERENCE_ACCESS_DATE = '26 September 2026';
const PSEUDOEPHEDRINE_OFFICIAL_REFERENCES = [
  {
    title: { fa: 'NSW Health: الزامات ثبت فروش سودوافدرین', en: 'NSW Health: Requirements for recording pseudoephedrine sales' },
    url: 'https://www.health.nsw.gov.au/pharmaceutical/Pages/recording-of-pseudoephedrine-sales.aspx',
  },
  {
    title: { fa: 'NSW Health: تغییر قوانین دارویی از ۵ نوامبر ۲۰۲۶', en: 'NSW Health: Legislation changes for pharmacists (from 5 November 2026)' },
    url: 'https://www.health.nsw.gov.au/pharmaceutical/Pages/medicine-laws-pharmacists.aspx',
  },
  {
    title: { fa: 'مقررات دارویی Queensland (نسخهٔ ۳۰ آوریل ۲۰۲۶)', en: 'Queensland Medicines and Poisons (Medicines) Regulation 2021 (30 April 2026)' },
    url: 'https://www.legislation.qld.gov.au/view/whole/html/2026-04-30/sl-2021-0140',
  },
  {
    title: { fa: 'استاندارد Queensland Health برای ثبت سودوافدرین، نسخهٔ ۱', en: 'Queensland Health Departmental Standard: Pseudoephedrine recording, version 1' },
    url: 'https://www.health.qld.gov.au/__data/assets/pdf_file/0030/1108938/ds-pseudoephedrine-recording.pdf',
  },
  {
    title: { fa: 'HealthyWA: کار با داروهای S2 و S3', en: 'HealthyWA: Working with Schedule 2 and 3 medicines' },
    url: 'https://www.healthywa.wa.gov.au/sitecore/content/Corporate/Articles/U_Z/Working-with-Schedule-2-and-3-medicines',
  },
  {
    title: { fa: 'استاندارد سموم ژوئن ۲۰۲۶ استرالیا (Poisons Standard)', en: 'Australian Poisons Standard—June 2026' },
    url: 'https://www.legislation.gov.au/F2026L00633',
  },
];

const PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA = 'الزامات ثبت فروش و احراز هویت سودوافدرین S3 به ایالت/قلمرو وابسته است؛ منابع بررسی‌شده الزام یکسان و ملی برای برند Project STOP را تأیید نمی‌کنند. در NSW، در ۲۶ سپتامبر ۲۰۲۶، فروش بدون نسخه باید هنگام عرضه در فرم الکترونیکی آنلاین و بلادرنگِ مورد تأیید ثبت شود؛ Project STOP تنها فرم تأییدشده است. اگر هویت خریدار برای داروساز شناخته‌شده نباشد، شناسهٔ مدرک عکس‌دار ثبت می‌شود. NSW Health اعلام کرده از ۵ نوامبر ۲۰۲۶ ثبت فروش S3 سودوافدرین در NSW لازم نخواهد بود. در Queensland، ثبت آنلاین و بلادرنگ طبق استاندارد ایالتی لازم است، اما استاندارد نام Project STOP را مشخص نمی‌کند. در WA، HealthyWA می‌گوید مدرک عکس‌دار مشاهده و نام/نشانی در سامانهٔ مورد تأیید ثبت شود. برای ACT، Tasmania و هر حوزهٔ دیگر، قانون و سامانهٔ جاری همان محل را بررسی کنید.';
const PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN = 'Pseudoephedrine S3 recording and identity requirements depend on the state or territory; the sources reviewed do not support one Australia-wide mandate for the Project STOP brand. In NSW, as at 26 September 2026, OTC sales must be recorded at supply in the approved online, real-time electronic form; Project STOP is the only approved form. If the purchaser is not known to the pharmacist, the unique reference number of photo identification must be recorded. NSW Health says recording S3 pseudoephedrine sales will no longer be required in NSW from 5 November 2026. Queensland requires online, real-time records under its state standard, which does not specify the Project STOP brand. HealthyWA says to sight photo ID and record purchaser name/address in an approved system in WA. Check current ACT, Tasmania and other applicable local requirements.';
const PSEUDOEPHEDRINE_PACK_SCHEDULE_FA = 'طبق Poisons Standard ژوئن ۲۰۲۶، سودوافدرینِ غیرمحرک و غیرِ کاهندهٔ وزن در بستهٔ اولیه، برای فرآورده‌های غیرمایع تا ۷۲۰ میلی‌گرم و برای مایعات تا ۸۰۰ میلی‌گرم در Schedule 3 قرار می‌گیرد. این آستانه به طبقه‌بندیِ مقدارِ بستهٔ اولیه مربوط است؛ سقف خرید هر فرد یا حد فروش در هر تراکنش نیست.';
const PSEUDOEPHEDRINE_PACK_SCHEDULE_EN = 'Under the June 2026 Poisons Standard, non-stimulant/non-weight-control pseudoephedrine in a primary pack is Schedule 3 at up to 720 mg in other preparations or 800 mg in liquids. This is a primary-pack scheduling threshold, not a per-person purchase or per-transaction limit.';
const PSEUDOEPHEDRINE_EDITORIAL_NOTE = {
  fa: `اصلاح تحریریه بر پایهٔ منابع رسمیِ بررسی‌شده در ${PSEUDOEPHEDRINE_REFERENCE_ACCESS_DATE}؛ بازبینی بالینی واجدصلاحیت هنوز انجام نشده است. این متن جایگزین قانون جاری ایالت/قلمرو، سیاست داروخانه یا ارزیابی بیمار نیست.`,
  en: `Editorial correction based on official sources accessed ${PSEUDOEPHEDRINE_REFERENCE_ACCESS_DATE}; qualified clinical review has not occurred. This does not replace current state/territory law, pharmacy policy, or patient assessment.`,
};

function cloneSourceRecord(value) {
  return JSON.parse(JSON.stringify(value));
}

function replaceRequiredSourceText(value, original, replacement, sourceId) {
  if (typeof value !== 'string' || !value.includes(original)) {
    throw new Error(`Expected pseudoephedrine source text was not found in ${sourceId}.`);
  }
  return value.replace(original, replacement);
}

function renderPseudoephedrineReferenceSection(lang) {
  const isFa = lang === 'fa';
  const key = isFa ? 'fa' : 'en';
  const direction = isFa ? 'rtl' : 'ltr';
  const heading = isFa ? 'یادداشت حوزهٔ قضایی و منابع رسمی' : 'Jurisdiction note & official references';
  const references = PSEUDOEPHEDRINE_OFFICIAL_REFERENCES.map(reference =>
    `<li><a class="text-primary underline underline-offset-2" href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.title[key])}</a></li>`
  ).join('');
  return `<section dir="${direction}" class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-2"><h3 class="text-xs font-bold text-sky-700 dark:text-sky-400">${heading}</h3><p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(PSEUDOEPHEDRINE_EDITORIAL_NOTE[key])}</p><ul class="space-y-1 text-xs">${references}</ul></section>`;
}

function applyPseudoephedrineTranslationEditorialCorrection(id, sourceTranslation) {
  if (id !== 'nasal_congestion' || !sourceTranslation) return sourceTranslation;
  const translation = cloneSourceRecord(sourceTranslation);
  translation.clinicalPearlsFa = (translation.clinicalPearlsFa || []).filter(pearl => !/project\s*stop|pseudoephedrine|سودو/i.test(pearl));
  translation.clinicalPearlsFa.push(PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA);
  translation.clinicalPearlsEn = (translation.clinicalPearlsEn || []).filter(pearl => !/project\s*stop|pseudoephedrine/i.test(pearl));
  translation.clinicalPearlsEn.push(PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN);
  return translation;
}

function applyPseudoephedrineProductEditorialCorrection(sourceProduct) {
  if (sourceProduct.id !== 'prod-sudafed-sinus-decongestant') return sourceProduct;
  const product = cloneSourceRecord(sourceProduct);
  product.counselingPoints = [
    {
      fa: `${PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA} ${PSEUDOEPHEDRINE_PACK_SCHEDULE_FA}`,
      en: `${PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN} ${PSEUDOEPHEDRINE_PACK_SCHEDULE_EN}`,
    },
    ...(product.counselingPoints || []).slice(1),
  ];
  return product;
}

function applyPseudoephedrineConceptEditorialCorrection(sourceConcept) {
  if (sourceConcept.id !== 'concept-project-stop') return sourceConcept;
  const concept = cloneSourceRecord(sourceConcept);
  concept.titleFa = 'ثبت حوزه‌محور سودوافدرین S3 و کاربرد Project STOP در NSW';
  concept.titleEn = 'Jurisdiction-Specific Pseudoephedrine S3 Recording & Project STOP in NSW';
  concept.descriptionFa = `${PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA} ${PSEUDOEPHEDRINE_PACK_SCHEDULE_FA}`;
  concept.descriptionEn = `${PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN} ${PSEUDOEPHEDRINE_PACK_SCHEDULE_EN}`;
  return concept;
}

function applyPseudoephedrineDomainEditorialCorrection(sourceDomain) {
  if (!(sourceDomain.subcategories || []).some(subcategory => subcategory.id === 'sub-1-4')) return sourceDomain;
  const domain = cloneSourceRecord(sourceDomain);
  domain.subcategories = domain.subcategories.map(subcategory => {
    if (subcategory.id !== 'sub-1-4') return subcategory;
    const corrected = cloneSourceRecord(subcategory);
    corrected.clinicalPearlsFa = (corrected.clinicalPearlsFa || []).filter(pearl => !/project\s*stop|pseudoephedrine|سودو/i.test(pearl));
    corrected.clinicalPearlsFa.push(PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA);
    corrected.clinicalPearlsEn = (corrected.clinicalPearlsEn || []).filter(pearl => !/project\s*stop|pseudoephedrine/i.test(pearl));
    corrected.clinicalPearlsEn.push(PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN);
    corrected.schedulingRulesFa = replaceRequiredSourceText(
      corrected.schedulingRulesFa,
      'سودوائفدرین S3 با ثبت Project Stop',
      'سودوافدرین S3 بر پایهٔ مقدار بستهٔ اولیه و با الزامات ثبت حوزه‌محور',
      'sub-1-4 schedulingRulesFa',
    );
    corrected.schedulingRulesEn = replaceRequiredSourceText(
      corrected.schedulingRulesEn,
      'pseudoephedrine is S3 with Project Stop',
      'pseudoephedrine pack scheduling and recording are jurisdiction-specific',
      'sub-1-4 schedulingRulesEn',
    );
    corrected.schedulingRulesFa += ` ${PSEUDOEPHEDRINE_PACK_SCHEDULE_FA}`;
    corrected.schedulingRulesEn += ` ${PSEUDOEPHEDRINE_PACK_SCHEDULE_EN}`;
    return corrected;
  });
  return domain;
}

function applyPseudoephedrineModuleEditorialCorrection(sourceCard) {
  if (!['m2-sec3', 'm3-sec2'].includes(sourceCard.id)) return sourceCard;
  const card = cloneSourceRecord(sourceCard);
  if (card.id === 'm2-sec3') {
    card.detailsHtml.fa = replaceRequiredSourceText(card.detailsHtml.fa,
      'در WA و QLD استفاده از سیستم <strong>Project Stop</strong> کاملاً الزامی است.',
      'WA: مشاهدهٔ مدرک عکس‌دار و ثبت نام/نشانی در سامانهٔ مورد تأیید؛ QLD: ثبت online/real-time در سامانهٔ منطبق با استاندارد Queensland Health؛ نام Project STOP در این استاندارد الزام نشده است.', card.id);
    card.detailsHtml.fa = replaceRequiredSourceText(card.detailsHtml.fa,
      'ارائه کارت شناسایی عکس‌دار الزامی است.',
      'مدارک هویتی و سامانهٔ ثبت را طبق قانون جاری ACT و Tasmania بررسی کنید؛ Project STOP را الزام یکسانِ ملی فرض نکنید.', card.id);
    card.detailsHtml.fa = replaceRequiredSourceText(card.detailsHtml.fa,
      'ثبت با کارت شناسایی عکس‌دار و ترجیحاً Project Stop انجام شود.',
      'تا ۴ نوامبر ۲۰۲۶: ثبت online/real-time در NSW با فرم تأییدشدهٔ Project STOP لازم است؛ اگر هویت خریدار برای داروساز شناخته‌شده نیست، مدرک عکس‌دار لازم است. از ۵ نوامبر ۲۰۲۶ ثبت فروش S3 سودوافدرین در NSW حذف می‌شود؛ قانون جاری آن تاریخ را دوباره بررسی کنید.', card.id);
    card.detailsHtml.en = replaceRequiredSourceText(card.detailsHtml.en,
      'Mandatory real-time electronic recording via <strong>Project Stop</strong> system.',
      'WA: sight photo ID and record purchaser name/address in an approved system; QLD: keep online, real-time records in a system meeting the Queensland Health standard, which does not name Project STOP as the required brand.', card.id);
    card.detailsHtml.en = replaceRequiredSourceText(card.detailsHtml.en,
      'Mandatory photo ID check and record keeping.',
      'Check the current ACT and Tasmania laws for accepted identity documents and recording systems; do not infer a uniform national Project STOP rule.', card.id);
    card.detailsHtml.en = replaceRequiredSourceText(card.detailsHtml.en,
      'Photo ID check required, electronic Project Stop recording recommended.',
      'Until 4 November 2026: NSW requires online, real-time recording in the approved Project STOP form; photo ID is required if the purchaser is not known to the pharmacist. NSW says recording S3 pseudoephedrine sales ends from 5 November 2026; re-check the law in force on that date.', card.id);
  } else {
    card.detailsHtml.fa = replaceRequiredSourceText(card.detailsHtml.fa,
      'S3 یا S4 (۶۰ میلی‌گرم هر ۴-۶ ساعت)؛ ثبت کارت شناسایی عکس‌دار در سیستم Project Stop الزامی است.',
      `${PSEUDOEPHEDRINE_PACK_SCHEDULE_FA} دوز را از برچسب همین فرآورده بررسی کنید؛ ثبت/احراز هویت تابع قانون ایالت/قلمرو است و Project STOP الزام ملی نیست.`, card.id);
    card.detailsHtml.en = replaceRequiredSourceText(card.detailsHtml.en,
      'S3/S4 (60mg q4-6h); mandatory photo ID check and electronic Project Stop recording.',
      `${PSEUDOEPHEDRINE_PACK_SCHEDULE_EN} Check this product’s label for dosing; recording/identity rules depend on jurisdiction and Project STOP is not a national mandate.`, card.id);
  }
  return card;
}

function applyPseudoephedrineLeitnerEditorialCorrection(sourceCard) {
  if (sourceCard.id !== 'sample-card-s3-pseudoephedrine') return sourceCard;
  const card = cloneSourceRecord(sourceCard);
  card.question = {
    fa: 'الزامات ثبت حوزه‌محور، آستانهٔ بسته برای S3 و نکتهٔ ایمنیِ سودوافدرین خوراکی چیست؟',
    en: 'What are the jurisdiction-specific recording rules, primary-pack S3 threshold, and key safety checks for oral pseudoephedrine?',
  };
  card.answer = {
    fa: `۱) پیش از عرضه، نیاز درمانی و مناسب‌بودن دارو را ارزیابی و دستور محصول را بررسی کنید. ۲) ثبت معامله و احراز هویت تابع ایالت/قلمرو است؛ Project STOP الزام ملی نیست. ${PSEUDOEPHEDRINE_RECORDING_CONTEXT_FA} ۳) ${PSEUDOEPHEDRINE_PACK_SCHEDULE_FA} ۴) موارد منع/احتیاط را از برچسب و اطلاعات جاری همان فرآورده و وضعیت بیمار بررسی کنید؛ این کارت فهرست جامع یا راهنمای عرضه نیست.`,
    en: `1) Assess therapeutic need and suitability and check the product directions. 2) Transaction recording and identity requirements vary by jurisdiction; Project STOP is not a national mandate. ${PSEUDOEPHEDRINE_RECORDING_CONTEXT_EN} 3) ${PSEUDOEPHEDRINE_PACK_SCHEDULE_EN} 4) Check contraindications and precautions against the current product information and the patient’s circumstances; this card is not exhaustive or a supply protocol.`,
  };
  card.pearl = {
    fa: PSEUDOEPHEDRINE_PACK_SCHEDULE_FA,
    en: PSEUDOEPHEDRINE_PACK_SCHEDULE_EN,
  };
  card.documentId = 'doc-concept-concept-project-stop';
  card.knowledgeTree.microTopic = {
    fa: 'ثبت فروش حوزه‌محور، Project STOP در NSW و آستانهٔ بستهٔ اولیه',
    en: 'Jurisdiction-specific recording, Project STOP in NSW & primary-pack threshold',
  };
  card.knowledgeTree.clinicalAspect = { ...card.knowledgeTree.microTopic };
  card.knowledgeTree.path = {
    fa: [...card.knowledgeTree.path.fa.slice(0, -1), card.knowledgeTree.microTopic.fa],
    en: [...card.knowledgeTree.path.en.slice(0, -1), card.knowledgeTree.microTopic.en],
  };
  return card;
}

function applyPseudoephedrineScenarioEditorialCorrection(sourceScenario) {
  if (!['s3-pseudoephedrine', 's3-pseudoephedrine-conflict'].includes(sourceScenario.id)) return sourceScenario;

  const scenario = cloneSourceRecord(sourceScenario);
  const isConflict = scenario.id === 's3-pseudoephedrine-conflict';
  const caseContext = {
    fa: 'سناریو در NSW و بر اساس منابع بررسی‌شده در ۲۶ سپتامبر ۲۰۲۶ است؛ خریدار برای داروساز شناخته‌شده نیست.',
    en: 'This scenario is set in NSW and reflects sources checked on 26 September 2026; the purchaser is not known to the pharmacist.',
  };

  scenario.title = isConflict
    ? { fa: 'C1. مدیریت تعارض و ثبت حوزه‌محور سودوافدرین S3 در NSW', en: 'C1. De-escalation & jurisdiction-specific pseudoephedrine S3 recording in NSW' }
    : { fa: '۳. احتقان بینی و ارزیابی سودوافدرین S3 در NSW', en: '3. Nasal congestion & pseudoephedrine S3 assessment in NSW' };
  scenario.category = { fa: 'ارزیابی بالینی و الزامات محلی S3', en: 'Clinical assessment & local S3 requirements' };
  scenario.patientProfile = scenario.patientProfile || {};
  scenario.patientProfile.presentation = {
    fa: `${caseContext.fa} ${scenario.patientProfile.presentation?.fa || ''}`,
    en: `${caseContext.en} ${scenario.patientProfile.presentation?.en || ''}`,
  };
  scenario.whatQuestions = (scenario.whatQuestions || []).map(question => {
    const corrected = cloneSourceRecord(question);
    if (question.key === 'A') {
      corrected.question = {
        fa: 'آیا داروی ضداحتقان یا داروی دیگری، از جمله مهارکنندهٔ MAO، مصرف کرده‌اید؟',
        en: 'Have you used another decongestant or any other medicine, including an MAOI?',
      };
      corrected.answer = {
        fa: 'فقط سرم نمکی استفاده کرده‌ام؛ داروی دیگری یا مهارکنندهٔ MAO مصرف نمی‌کنم.',
        en: 'Only saline; I take no other medicines and no MAOI.',
      };
    }
    if (question.key === 'T') {
      corrected.question = {
        fa: isConflict
          ? 'سابقهٔ فشار خون بالا، بیماری قلبی، پرکاری تیروئید یا مصرف مهارکنندهٔ MAO دارید؟'
          : 'باردار هستید یا سابقهٔ فشار خون بالا، بیماری قلبی، پرکاری تیروئید یا مصرف مهارکنندهٔ MAO دارید؟',
        en: isConflict
          ? 'Do you have hypertension, heart disease, hyperthyroidism or MAOI use?'
          : 'Are you pregnant, or do you have hypertension, heart disease, hyperthyroidism or MAOI use?',
      };
      corrected.answer = {
        fa: isConflict
          ? 'خیر؛ فشار خون، بیماری قلبی یا تیروئید ندارم و مهارکنندهٔ MAO هم مصرف نمی‌کنم.'
          : 'خیر؛ باردار نیستم و فشار خون، بیماری قلبی یا تیروئید ندارم و مهارکنندهٔ MAO هم مصرف نمی‌کنم.',
        en: isConflict
          ? 'No hypertension, heart disease or thyroid disease, and no MAOI use.'
          : 'No pregnancy, hypertension, heart disease or thyroid disease, and no MAOI use.',
      };
    }
    return corrected;
  });

  scenario.redFlags = (scenario.redFlags || []).map(flag => {
    const corrected = cloneSourceRecord(flag);
    const combinedText = `${flag.fa || ''} ${flag.en || ''}`;
    if (/امتناع پرخاشگرانه|aggressive refusal/i.test(combinedText)) {
      corrected.fa = 'خریدهای مکرر یا الگوی نگران‌کننده را بر اساس شواهد و رویهٔ محلی ارزیابی کنید؛ صرفِ ناراحتی یا پرسش دربارهٔ مدرک هویتی اثبات سوءمصرف نیست.';
      corrected.en = 'Assess repeated purchases or a concerning pattern using evidence and local procedures; discomfort or a question about ID alone does not establish misuse.';
    } else if (/خریدهای مکرر|frequent repeat purchases/i.test(combinedText)) {
      corrected.fa = 'درخواست‌های تکراری یا الگوی نگران‌کننده را بی‌طرفانه و بر اساس شواهد و رویهٔ محلی بررسی کنید؛ تکرار خرید به‌تنهایی سوءمصرف را ثابت نمی‌کند.';
      corrected.en = 'Review repeat requests or a concerning pattern impartially using evidence and local procedures; repeat purchasing alone does not prove misuse.';
    } else if (/تحویل داروی S3|S3 Pharmacist-Only supply/i.test(combinedText)) {
      corrected.fa = 'نیاز درمانی، منع مصرف و تناسب فرآورده را ارزیابی کنید؛ احراز هویت و ثبت فروش تابع قانون جاری همان ایالت/قلمرو است.';
      corrected.en = 'Assess therapeutic need, contraindications and product suitability; identity and recording requirements follow current state/territory law.';
    }
    return corrected;
  });

  scenario.dialogueOptions = (scenario.dialogueOptions || []).map(option => {
    const corrected = cloneSourceRecord(option);
    if (option.id === 'p1' || option.id === 'ps1') {
      corrected.text = {
        fa: 'برای پایان‌دادن به گفتگو، بدون ارزیابی درمانی یا رعایت الزام ثبتِ محل عرضه دارو را فوراً تحویل بدهم.',
        en: 'To end the conversation, supply immediately without therapeutic assessment or the recording required at the place of supply.',
      };
      corrected.patientReply = { fa: 'پس لازم نیست وضعیت سلامتی یا مقررات محل را بررسی کنیم؟', en: 'So we do not need to check my health or the local requirements?' };
      corrected.isCorrectAdvice = false;
    }
    if (option.id === 'p2') {
      corrected.text = {
        fa: 'ابتدا نیاز درمانی، علائم هشدار، داروهای هم‌زمان و برچسب فرآورده را ارزیابی کنید. در این موردِ NSW، تا ۴ نوامبر ۲۰۲۶ فروش را هنگام عرضه در Project STOP ثبت کنید؛ چون خریدار برای داروساز ناشناس است، شناسهٔ مدرک عکس‌دار را نیز ثبت کنید. مدت مصرف را از برچسب همان فرآورده بگویید و قانون جاری را دوباره بررسی کنید.',
        en: 'First assess therapeutic need, red flags, concurrent medicines and the product label. In this NSW case, through 4 November 2026, record the sale in Project STOP at supply; because the purchaser is not known to the pharmacist, also record the photo-ID reference. Use this product’s label for duration advice and re-check current law.',
      };
      corrected.patientReply = { fa: 'ممنون که پیش از تصمیم‌گیری هم وضعیت من و هم مقررات NSW را بررسی کردید.', en: 'Thank you for checking both my health and the NSW requirements before deciding.' };
      corrected.isCorrectAdvice = true;
    }
    if (option.id === 'ps2') {
      corrected.text = {
        fa: 'با آرامش همدلی کنید و توضیح دهید که هدف، ارزیابی ایمنی و اجرای مقررات محل عرضه است، نه متهم‌کردن مشتری. در این سناریوی NSW، تا ۴ نوامبر ۲۰۲۶ ثبت آنلاین و بلادرنگ در فرم تأییدشدهٔ Project STOP لازم است؛ چون مشتری برای داروساز ناشناس است، مدرک عکس‌دار و شناسهٔ آن را طبق مقررات بررسی/ثبت کنید. دربارهٔ محرمانگی یا سقف خرید وعدهٔ کلی ندهید؛ به سیاست حریم خصوصی داروخانه و منبع رسمی ارجاع دهید. ارزیابی درمانی را کامل کنید و فقط در صورت مناسب‌بودن، مطابق برچسب فرآورده اقدام کنید.',
        en: 'Respond calmly and explain that the purpose is safety assessment and compliance with the place-of-supply rules, not an accusation. In this NSW case, through 4 November 2026, online real-time recording in the approved Project STOP form is required; because the customer is not known to the pharmacist, check and record photo-ID details as required. Make no blanket promises about privacy or purchase limits; refer to the pharmacy privacy policy and official guidance. Complete the therapeutic assessment and proceed only if appropriate, following the product label.',
      };
      corrected.patientReply = { fa: 'از توضیحتان ممنونم؛ لطفاً سیاست حریم خصوصی داروخانه را هم برایم توضیح دهید.', en: 'Thank you for explaining. Please also explain the pharmacy privacy policy.' };
      corrected.isCorrectAdvice = true;
    }
    return corrected;
  });

  scenario.clinicalOutcome = scenario.clinicalOutcome || {};
  scenario.clinicalOutcome.recommendation = isConflict
    ? { fa: 'مدیریت محترمانهٔ تعارض، ارزیابی درمانی و رعایت الزامات جاری NSW در تاریخ عرضه؛ بدون فرض سقف ملی خرید یا تضمین کلی حریم خصوصی', en: 'Respectful de-escalation, therapeutic assessment and compliance with NSW requirements in force on the supply date; no assumed national purchase cap or blanket privacy assurance' }
    : { fa: 'ارزیابی کامل بیمار؛ در صورت مناسب‌بودن، ثبت فروش و احراز هویت طبق قانون جاری NSW و مشاوره بر اساس برچسب فرآورده', en: 'Complete patient assessment; if appropriate, record the sale and verify identity under current NSW law, then counsel using the product label' };
  scenario.clinicalOutcome.explanation = {
    fa: `${caseContext.fa} NSW Health می‌گوید فروش OTC سودوافدرین تا ۴ نوامبر ۲۰۲۶ باید هنگام عرضه در فرم آنلاین و بلادرنگِ تأییدشده ثبت شود؛ اگر هویت خریدار برای داروساز شناخته‌شده نیست، شناسهٔ مدرک عکس‌دار ثبت می‌شود. از ۵ نوامبر ۲۰۲۶ ثبت فروش S3 سودوافدرین در NSW لازم نخواهد بود؛ این تغییر ارزیابی درمانی و سایر الزامات S3 را حذف نمی‌کند. آستانهٔ مقدار بسته برای طبقه‌بندی Schedule را با سقف خرید فردی/تراکنش اشتباه نگیرید. ${PSEUDOEPHEDRINE_EDITORIAL_NOTE.fa}`,
    en: `${caseContext.en} NSW Health says OTC pseudoephedrine sales must be recorded in the approved online, real-time form at supply through 4 November 2026; the photo-ID reference is recorded when the purchaser is not known to the pharmacist. From 5 November 2026, recording S3 pseudoephedrine sales in NSW will no longer be required; this does not remove therapeutic assessment or other S3 requirements. Do not confuse a primary-pack scheduling threshold with an individual or transaction purchase cap. ${PSEUDOEPHEDRINE_EDITORIAL_NOTE.en}`,
  };

  if (scenario.aussieContext) {
    scenario.aussieContext.fa = 'قانون و رویهٔ ثبت سودوافدرین بین ایالت‌ها و قلمروها تفاوت دارد و ممکن است تغییر کند؛ پاسخ را به محل و تاریخ واقعی عرضه محدود کنید.';
    scenario.aussieContext.en = 'Pseudoephedrine recording rules vary across states and territories and can change; qualify advice by the actual place and date of supply.';
    scenario.aussieContext.keyPhrases = [
      { phrase: 'Project STOP', meaningFa: 'فرم تأییدشدهٔ ثبت فروش در NSW تا ۴ نوامبر ۲۰۲۶؛ الزام یکسان ملی برای این برند نیست.', meaningEn: 'The approved NSW recording form through 4 November 2026; not a uniform Australia-wide brand mandate.' },
      { phrase: 'I am not a criminal', meaningFa: 'همدلانه و بی‌طرفانه هدف ارزیابی و الزام محلی را توضیح دهید؛ از اتهام‌زنی و وعدهٔ حقوقی کلی پرهیز کنید.', meaningEn: 'Explain the local safety and legal process empathetically; avoid accusations or blanket legal/privacy promises.' },
      { phrase: 'Pharmacist-Only (S3)', meaningFa: 'داروی Schedule 3؛ نیاز درمانی و تناسب آن را طبق الزامات جاری ارزیابی کنید.', meaningEn: 'A Schedule 3 medicine; assess therapeutic need and suitability under current requirements.' },
    ];
    scenario.aussieContext.adminRule = {
      fa: 'در NSW تا ۴ نوامبر ۲۰۲۶ ثبت هنگام عرضه در فرم آنلاین تأییدشده لازم است و اگر هویت خریدار برای داروساز شناخته‌شده نباشد، مدرک عکس‌دار لازم است؛ از ۵ نوامبر الزام ثبت S3 سودوافدرین حذف می‌شود. قانون جاری را بررسی کنید.',
      en: 'In NSW through 4 November 2026, record at supply in the approved online form; photo ID is required when the purchaser is not known to the pharmacist. Recording S3 pseudoephedrine sales ends from 5 November; verify current law.',
    };
  }
  return scenario;
}

// =========================================================================
// SECTION 1: 43 CLINICAL DISEASES (With Linked Products & Scenarios)
// =========================================================================

for (const hb of handbookDiseases) {
  const trans = applyPseudoephedrineTranslationEditorialCorrection(
    hb.id,
    OTC_CLINICAL_TRANSLATIONS ? OTC_CLINICAL_TRANSLATIONS[hb.id] : null,
  );
  const folderId = diseaseCategoryMap[hb.id] || 'folder-clinical-derma';

  const cleanFaName = trans?.cleanFaName || hb.condition;
  const cleanEnName = trans?.cleanEnName || hb.condition.replace(/\s*\([^)]*\)/, '');
  const title = `${cleanFaName} (${cleanEnName})`;
  const titleEn = `${cleanEnName} - OTC Clinical Protocol`;

  const matchingProducts = getProductsForDisease(hb.id, cleanEnName);
  const matchingScenario = getScenarioForDisease(hb.id);

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
  }

  // Linked Shelf Products Grid
  if (matchingProducts.length > 0) {
    htmlFa += `
  <div class="p-4 rounded-2xl bg-card border border-primary/20 space-y-3">
    <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
      <div class="text-xs font-bold text-foreground flex items-center gap-1.5">
        <span>💊 فرآورده‌ها و داروهای قفسه داروخانه (Linked Shelf Products):</span>
      </div>
      <span class="text-[10px] text-muted-foreground font-medium">قابل کلیک جهت مطالعه مونوگراف کامل</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      ${matchingProducts.slice(0, 6).map(p => `
      <div class="p-3 rounded-xl bg-background border border-border/80 hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition flex items-center justify-between gap-2 group" data-doc-link="doc-product-${p.id}">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="font-bold text-foreground group-hover:text-primary transition">${escapeHtml(p.brandName)}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-md font-mono ${p.schedule === 'S3' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : p.schedule === 'S4' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}">${p.schedule}</span>
          </div>
          <div class="text-[11px] text-muted-foreground font-mono" dir="ltr">${escapeHtml(p.genericName)}</div>
        </div>
        <span class="text-[11px] text-primary group-hover:translate-x-[-2px] transition">←</span>
      </div>`).join('')}
    </div>
  </div>`;
  }

  // Linked Triage Scenario Banner
  if (matchingScenario) {
    const scDocId = `doc-scenario-${(SLANG_SCENARIOS || []).some(s => s.id === matchingScenario.id) ? 'slang' : 'clinical'}-${matchingScenario.id}`;
    htmlFa += `
  <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 cursor-pointer hover:bg-rose-500/15 transition group" data-doc-link="${scDocId}">
    <div>
      <div class="text-[10px] font-bold text-rose-600 dark:text-rose-400">🗣️ سناریوی بالینی و مکالمه بیمار در داروخانه:</div>
      <div class="text-xs font-bold text-foreground group-hover:text-rose-600 transition">${escapeHtml(matchingScenario.title?.fa || matchingScenario.title?.en || matchingScenario.id)}</div>
    </div>
    <span class="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-[-2px] transition">مشاهده گفتگوی تریاژ ←</span>
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

  // Non-Pharm & Pearls
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

  if (hb.id === 'nasal_congestion') htmlFa += renderPseudoephedrineReferenceSection('fa');

  htmlFa += `\n</div>`;

  // English HTML
  let htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">Common Condition &amp; Benchmark Originator Brand:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(cleanEnName)} | <span class="font-mono text-primary">${escapeHtml(trans?.primaryBrand || hb.condition)}</span></div>
  </div>

  <div>
    <h3 class="text-sm font-bold text-foreground mb-2">Key Diagnostic Symptoms:</h3>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground ps-2">
      ${(hb.symptoms || []).map(s => `<li>${escapeHtml(s)}</li>`).join('\n      ')}
    </ul>
  </div>`;

  if (trans?.firstLine) {
    const fl = trans.firstLine;
    htmlEn += `
  <div class="p-4 rounded-2xl bg-primary/10 border border-primary/25 space-y-2">
    <div class="text-xs font-bold text-primary">💊 First-line Pharmacotherapy:</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(fl.drugNameEn)} (${escapeHtml(fl.drugClassEn)})</div>
    <div class="text-xs text-muted-foreground"><strong>Dosing Regimen:</strong> ${escapeHtml(fl.dosingEn)}</div>
    <div class="text-xs text-muted-foreground"><strong>Onset &amp; Course:</strong> ${escapeHtml(fl.onsetCourseEn)}</div>
    <div class="text-xs text-amber-600 dark:text-amber-400"><strong>Clinical Cautions:</strong> ${escapeHtml(fl.keyWarningsEn)}</div>
  </div>`;
  }

  if (matchingProducts.length > 0) {
    htmlEn += `
  <div class="p-4 rounded-2xl bg-card border border-primary/20 space-y-3">
    <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
      <div class="text-xs font-bold text-foreground">💊 Linked Shelf Products &amp; Brands:</div>
      <span class="text-[10px] text-muted-foreground">Click to view full monograph</span>
    </div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      ${matchingProducts.slice(0, 6).map(p => `
      <div class="p-3 rounded-xl bg-background border border-border/80 hover:border-primary/50 hover:bg-secondary/40 cursor-pointer transition flex items-center justify-between gap-2 group" data-doc-link="doc-product-${p.id}">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5 mb-0.5">
            <span class="font-bold text-foreground group-hover:text-primary transition">${escapeHtml(p.brandName)}</span>
            <span class="text-[9px] px-1.5 py-0.2 rounded-md font-mono ${p.schedule === 'S3' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : p.schedule === 'S4' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}">${p.schedule}</span>
          </div>
          <div class="text-[11px] text-muted-foreground font-mono">${escapeHtml(p.genericName)}</div>
        </div>
        <span class="text-[11px] text-primary group-hover:translate-x-[2px] transition">→</span>
      </div>`).join('')}
    </div>
  </div>`;
  }

  if (matchingScenario) {
    const scDocId = `doc-scenario-${(SLANG_SCENARIOS || []).some(s => s.id === matchingScenario.id) ? 'slang' : 'clinical'}-${matchingScenario.id}`;
    htmlEn += `
  <div class="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-between gap-2 cursor-pointer hover:bg-rose-500/15 transition group" data-doc-link="${scDocId}">
    <div>
      <div class="text-[10px] font-bold text-rose-600 dark:text-rose-400">🗣️ Linked Triage Scenario:</div>
      <div class="text-xs font-bold text-foreground group-hover:text-rose-600 transition">${escapeHtml(matchingScenario.title?.en || matchingScenario.title?.fa || matchingScenario.id)}</div>
    </div>
    <span class="text-xs font-bold text-rose-600 dark:text-rose-400 group-hover:translate-x-[2px] transition">View Triage Dialogue →</span>
  </div>`;
  }

  const redFlagsEn = hb.referralCriteria || [];
  if (redFlagsEn.length > 0) {
    htmlEn += `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">⚠️ Red Flags &amp; Urgent Referral:</div>
    <ul class="list-disc list-inside space-y-1 text-xs text-rose-700 dark:text-rose-300">
      ${redFlagsEn.map(rf => `<li>${escapeHtml(rf)}</li>`).join('\n      ')}
    </ul>
  </div>`;
  }

  if (hb.id === 'nasal_congestion') htmlEn += renderPseudoephedrineReferenceSection('en');

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
    tags: ['Clinical Atlas', cleanEnName, trans?.firstLine?.drugClassEn || 'OTC Protocol']
  });
}

console.log(`Generated ${handbookDiseases.length} Disease documents across 6 clinical subfolders`);

// =========================================================================
// SECTION 2: CYP, mechanism overviews, and clinical concepts (55 overview documents)
// =========================================================================

// 2.1 6 CYP Enzymes
for (const cyp of cypList) {
  const docId = `doc-cyp-${cyp.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
  const title = `سیتوکروم ${cyp.name}: تداخلات و مهارکننده‌ها`;
  const titleEn = `${cyp.name} Cytochrome P450 Monograph`;

  const relatedPairs = (COMMON_PAIR_INTERACTIONS || []).filter(p => p.enzyme === cyp.id);

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">مسیر متابولیک و اهمیت بالینی:</div>
    <div class="text-base font-bold text-foreground">آنزیم سیتوکروم کبد: ${escapeHtml(cyp.name)}</div>
    <p class="text-xs text-muted-foreground mt-2 leading-relaxed">${escapeHtml(cyp.clinicalSignificance?.fa || cyp.clinicalSignificance?.en || '')}</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
      <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🚫 مهارکننده‌ها (Inhibitors):</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.inhibitors || []).map(i => `<li><strong>${escapeHtml(i.name)}</strong> ${i.potency ? `<span class="text-[10px] text-rose-500">(${i.potency})</span>` : ''}</li>`).join('')}
      </ul>
    </div>

    <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
      <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">⚡ القاکننده‌ها (Inducers):</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.inducers || []).map(i => `<li><strong>${escapeHtml(i.name)}</strong></li>`).join('')}
      </ul>
    </div>

    <div class="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
      <div class="text-xs font-bold text-sky-600 dark:text-sky-400">🎯 سوبستراها (Substrates):</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.substrates || []).map(s => `<li><strong>${escapeHtml(s.name)}</strong></li>`).join('')}
      </ul>
    </div>
  </div>

  ${relatedPairs.length > 0 ? `
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
    <div class="text-xs font-bold text-amber-700 dark:text-amber-400">⚠️ زوج‌های تداخلی پرتکرار در آزمون‌های بالینی:</div>
    <div class="space-y-2 text-xs">
      ${relatedPairs.map(rp => `
      <div class="p-2.5 rounded-xl bg-background/80 border border-amber-500/20">
        <div class="font-bold text-foreground">${escapeHtml(rp.drugA)} + ${escapeHtml(rp.drugB)} (${escapeHtml(rp.severity)})</div>
        <div class="text-muted-foreground mt-0.5">${escapeHtml(rp.effectFa || rp.effectEn)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">Hepatic Metabolic Pathway &amp; Clinical Significance:</div>
    <div class="text-base font-bold text-foreground">Cytochrome P450 Isoenzyme: ${escapeHtml(cyp.name)}</div>
    <p class="text-xs text-muted-foreground mt-2 leading-relaxed">${escapeHtml(cyp.clinicalSignificance?.en || '')}</p>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
    <div class="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 space-y-2">
      <div class="text-xs font-bold text-rose-600 dark:text-rose-400">🚫 Potent Inhibitors:</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.inhibitors || []).map(i => `<li><strong>${escapeHtml(i.name)}</strong> ${i.potency ? `<span class="text-[10px] text-rose-500">(${i.potency})</span>` : ''}</li>`).join('')}
      </ul>
    </div>

    <div class="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
      <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400">⚡ Inducers:</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.inducers || []).map(i => `<li><strong>${escapeHtml(i.name)}</strong></li>`).join('')}
      </ul>
    </div>

    <div class="p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 space-y-2">
      <div class="text-xs font-bold text-sky-600 dark:text-sky-400">🎯 Major Substrates:</div>
      <ul class="text-xs space-y-1 text-muted-foreground">
        ${(cyp.substrates || []).map(s => `<li><strong>${escapeHtml(s.name)}</strong></li>`).join('')}
      </ul>
    </div>
  </div>
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
    tags: ['Pharmacology', 'CYP Interaction', cyp.name]
  });
}

// 2.2 14 Mechanisms
for (const mech of mechanismsList) {
  const code = mech.subcategoryId || mech.classCode || mech.id || `mech-${Math.random()}`;
  const docId = `doc-mechanism-${code.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const title = `مکانیسم سلولی: ${mech.categoryTitleFa || mech.classNameFa || mech.categoryTitleEn || mech.classNameEn}`;
  const titleEn = `Mechanism of Action: ${mech.categoryTitleEn || mech.classNameEn}`;

  // Find products matching this mechanism subcategory or keyClasses
  const keyCodes = new Set((mech.keyClasses || []).map(k => k.classCode));
  const matchingProducts = (SHELF_PRODUCTS || []).filter(p =>
    p.subcategoryId === mech.subcategoryId ||
    (p.mechanism?.classCode && keyCodes.has(p.mechanism.classCode))
  );

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">دسته فارماکولوژیک و بیومولکولی:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(mech.categoryTitleFa || mech.classNameFa || '')} | <span dir="ltr" class="font-mono text-primary">${escapeHtml(mech.categoryTitleEn || mech.classNameEn || '')}</span></div>
    ${mech.targetPathwayFa ? `<div class="text-xs text-muted-foreground mt-1">مسیر بیولوژیک هدف: ${escapeHtml(mech.targetPathwayFa)}</div>` : ''}
  </div>

  <div class="space-y-2">
    <h3 class="text-sm font-bold text-foreground">شرح جامع مکانیسم عمل و فیزیولوژی سلولی:</h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.summaryFa || mech.descriptionFa || '')}</p>
  </div>

  ${mech.primaryActionFa ? `
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
    <div class="text-xs font-bold text-amber-700 dark:text-amber-400">عملکرد بیوشیمیایی اولیه (Primary Action):</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.primaryActionFa)}</p>
  </div>` : ''}

  ${mech.keyClasses && mech.keyClasses.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
    <div class="text-xs font-bold text-foreground">🔬 زیرگروه‌ها و دسته‌های دارویی کلیدی:</div>
    <div class="space-y-2 text-xs">
      ${mech.keyClasses.map(k => `
      <div class="p-3 rounded-xl bg-background border border-border/60">
        <div class="font-bold text-primary">${escapeHtml(k.nameFa)} (${escapeHtml(k.nameEn)})</div>
        <div class="text-muted-foreground mt-1">${escapeHtml(k.mechanismFa)}</div>
        <div class="text-[11px] text-muted-foreground/80 mt-1 font-mono" dir="ltr">Examples: ${escapeHtml(k.examples)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}

  ${matchingProducts.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-primary/20 space-y-3">
    <div class="text-xs font-bold text-foreground">💊 فرآورده‌های دارای این مکانیسم اثر در قفسه داروخانه:</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      ${matchingProducts.map(p => `
      <div class="p-2.5 rounded-xl bg-background border border-border/80 hover:border-primary/50 cursor-pointer transition flex items-center justify-between group" data-doc-link="doc-product-${p.id}">
        <div>
          <span class="font-bold text-foreground group-hover:text-primary transition">${escapeHtml(p.brandName)}</span>
          <span class="text-[10px] text-muted-foreground block" dir="ltr">${escapeHtml(p.genericName)}</span>
        </div>
        <span class="text-primary text-xs">←</span>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">Pharmacological Class &amp; Target Pathway:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(mech.categoryTitleEn || mech.classNameEn || '')}</div>
    ${mech.targetPathwayEn ? `<div class="text-xs text-muted-foreground mt-1">Target Pathway: ${escapeHtml(mech.targetPathwayEn)}</div>` : ''}
  </div>

  <div class="space-y-2">
    <h3 class="text-sm font-bold text-foreground">Molecular Mechanism of Action:</h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.summaryEn || mech.descriptionEn || '')}</p>
  </div>

  ${mech.primaryActionEn ? `
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-1">
    <div class="text-xs font-bold text-amber-700 dark:text-amber-400">Primary Pharmacological Action:</div>
    <p class="text-xs text-muted-foreground leading-relaxed">${escapeHtml(mech.primaryActionEn)}</p>
  </div>` : ''}

  ${mech.keyClasses && mech.keyClasses.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-border/80 space-y-3">
    <div class="text-xs font-bold text-foreground">Key Pharmacological Classes:</div>
    <div class="space-y-2 text-xs">
      ${mech.keyClasses.map(k => `
      <div class="p-3 rounded-xl bg-background border border-border/60">
        <div class="font-bold text-primary">${escapeHtml(k.nameEn)}</div>
        <div class="text-muted-foreground mt-1">${escapeHtml(k.mechanismEn)}</div>
        <div class="text-[11px] text-muted-foreground/80 mt-1 font-mono">Examples: ${escapeHtml(k.examples)}</div>
      </div>`).join('')}
    </div>
  </div>` : ''}
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
    tags: ['Pharmacology', 'Mechanism', mech.categoryTitleEn || mech.classNameEn || 'Class']
  });
}

// 2.3 35 High-Yield Clinical Concepts (Toxicity, Interactions, Red Flags)
for (const [conceptId, sourceConcept] of Object.entries(CLINICAL_CONCEPTS_REGISTRY || {})) {
  const concept = applyPseudoephedrineConceptEditorialCorrection(sourceConcept);
  const docId = `doc-concept-${conceptId.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const title = `نکته بالینی: ${concept.titleFa || conceptId}`;
  const titleEn = `Clinical Concept: ${concept.titleEn || conceptId}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/25">
    <div class="flex items-center justify-between gap-2 mb-1">
      <span class="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">مفهوم پرتکرار بالینی و فارماکولوژی:</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300">${escapeHtml(concept.categoryFa || 'ایمنی')}</span>
    </div>
    <div class="text-base font-bold text-foreground">${escapeHtml(concept.titleFa)}</div>
    <div class="text-xs text-muted-foreground mt-1" dir="ltr">${escapeHtml(concept.titleEn || '')}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <h3 class="text-xs font-bold text-foreground">شرح بالینی و علت سمیت / تداخل:</h3>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(concept.descriptionFa || '')}</p>
  </div>

  ${concept.descriptionEn ? `
  <div class="p-4 rounded-2xl bg-background border border-border space-y-1 text-left" dir="ltr">
    <div class="text-[10px] font-bold text-muted-foreground uppercase">English Clinical Rationale:</div>
    <p class="text-xs text-muted-foreground leading-relaxed italic">${escapeHtml(concept.descriptionEn)}</p>
  </div>` : ''}
</div>${concept.id === 'concept-project-stop' ? renderPseudoephedrineReferenceSection('fa') : ''}`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-fuchsia-500/10 border border-fuchsia-500/25">
    <div class="flex items-center justify-between gap-2 mb-1">
      <span class="text-xs font-bold text-fuchsia-600 dark:text-fuchsia-400">High-Yield Clinical Concept:</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300">${escapeHtml(concept.categoryEn || 'Safety')}</span>
    </div>
    <div class="text-base font-bold text-foreground">${escapeHtml(concept.titleEn)}</div>
    <div class="text-xs text-muted-foreground mt-1" dir="rtl">${escapeHtml(concept.titleFa || '')}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <h3 class="text-xs font-bold text-foreground">Clinical Mechanism &amp; Toxicological Rationale:</h3>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(concept.descriptionEn || '')}</p>
  </div>
</div>${concept.id === 'concept-project-stop' ? renderPseudoephedrineReferenceSection('en') : ''}`;

  documents.push({
    id: docId,
    folder_id: 'folder-pharm-concepts',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Pharmacology', 'Clinical Concept', concept.categoryEn || 'Safety']
  });
}

console.log(`Generated ${cypList.length + mechanismsList.length + Object.keys(CLINICAL_CONCEPTS_REGISTRY || {}).length} Pharmacology overview documents in Pillar 2; ${drugMechanismsList.length} drug-class mechanism documents are added in Section 6.`);

// =========================================================================
// SECTION 3: 121 SHELF PRODUCTS + 22 CAL LABELS + 8 STORAGE LAWS (151 docs)
// =========================================================================

// 3.1 All 121 Shelf Products
for (const sourceProduct of (SHELF_PRODUCTS || [])) {
  const p = applyPseudoephedrineProductEditorialCorrection(sourceProduct);
  const docId = `doc-product-${p.id}`;
  const title = `مونوگراف: ${p.brandName} (${p.genericName})`;
  const titleEn = `${p.brandName} (${p.genericName}) - Product Monograph`;

  const folderId = getProductFolder(p);

  // Equivalent brands on shelf
  const equivalentProducts = (SHELF_PRODUCTS || []).filter(other =>
    other.id !== p.id &&
    other.genericName?.toLowerCase() === p.genericName?.toLowerCase()
  );

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <!-- Brand & Molecule Header -->
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
      <span class="text-xs font-bold text-amber-700 dark:text-amber-400">شناسنامه و مونوگراف فرآورده دارویی:</span>
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full ${p.schedule === 'S3' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : p.schedule === 'S4' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}">${escapeHtml(p.schedule || 'OTC')}</span>
    </div>
    <div class="text-lg font-black text-foreground">${escapeHtml(p.brandName)}</div>
    <div class="text-xs text-muted-foreground font-mono mt-0.5" dir="ltr">${escapeHtml(p.genericName)} (${escapeHtml(p.activeIngredients || '')})</div>
  </div>

  <!-- Indications -->
  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">🎯 موارد مصرف و اندیکاسیون‌های تاییدشده:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(p.indications?.fa || p.indications?.en || '')}</p>
    <div class="text-[11px] text-muted-foreground font-sans mt-1 text-left" dir="ltr">${escapeHtml(p.indications?.en || '')}</div>
  </div>

  <!-- Dosage Instructions -->
  ${p.dosageInstructions?.fa ? `
  <div class="p-4 rounded-2xl bg-primary/10 border border-primary/20 space-y-1.5">
    <div class="text-xs font-bold text-primary">📋 دستور و نحوه مصرف استاندارد:</div>
    <p class="text-xs text-foreground leading-relaxed">${escapeHtml(p.dosageInstructions.fa)}</p>
    ${p.dosageInstructions.en ? `<div class="text-[11px] text-muted-foreground text-left" dir="ltr">${escapeHtml(p.dosageInstructions.en)}</div>` : ''}
  </div>` : ''}

  <!-- CAL Labels & State Storage Badges -->
  <div class="p-4 rounded-2xl bg-card border border-border space-y-3">
    <div class="text-xs font-bold text-foreground">🏷️ برچسب‌های هشدار و راهنمای مصرف APF (CAL Labels):</div>
    <div class="flex items-center gap-1.5 flex-wrap">
      ${(p.calLabels || []).map(calCode => {
        const cal = CAL_LABELS_DICT ? CAL_LABELS_DICT[calCode] : null;
        const calSlug = calCode.toLowerCase().replace(/\s+/g, '-');
        return `
        <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold border cursor-pointer hover:scale-105 transition ${cal?.colorClass || 'bg-muted text-foreground'}" data-doc-link="doc-cal-${calSlug}">
          🏷️ ${escapeHtml(calCode)}: ${escapeHtml(cal?.nameFa || calCode)}
        </span>`;
      }).join('')}
    </div>
  </div>

  <!-- Mechanism Link -->
  ${p.mechanism ? `
  <div class="p-3.5 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-between gap-2 cursor-pointer hover:bg-purple-500/15 transition group" data-doc-link="doc-mechanism-${p.mechanism.classCode.toLowerCase().replace(/[^a-z0-9]/g, '-')}">
    <div>
      <div class="text-[10px] font-bold text-purple-600 dark:text-purple-400">⚡ مکانیسم اثر و دسته دارویی:</div>
      <div class="text-xs font-bold text-foreground group-hover:text-purple-600 transition">${escapeHtml(p.mechanism.classNameFa)} (${escapeHtml(p.mechanism.classNameEn)})</div>
    </div>
    <span class="text-xs font-bold text-purple-600 dark:text-purple-400 group-hover:translate-x-[-2px] transition">مشاهده مکانیسم کامل ←</span>
  </div>` : ''}

  <!-- Counseling Points -->
  ${p.counselingPoints && p.counselingPoints.length > 0 ? `
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
    <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">💡 نکات حیاتی مشاوره داروساز به بیمار (Counseling Pearls):</div>
    <ul class="list-disc list-inside space-y-1.5 text-xs text-muted-foreground">
      ${p.counselingPoints.map(cp => `<li>${escapeHtml(cp.fa || cp.en)}</li>`).join('\n      ')}
    </ul>
  </div>` : ''}

  <!-- Safety Warnings -->
  ${p.safetyWarnings?.fa ? `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">⚠️ موارد منع مصرف و احتیاط‌های ویژه:</div>
    <p class="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">${escapeHtml(p.safetyWarnings.fa)}</p>
  </div>` : ''}

  <!-- Equivalent Brands on Shelf -->
  ${equivalentProducts.length > 0 ? `
  <div class="p-4 rounded-2xl bg-muted/30 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">🔄 برندهای معادل و ژنریک‌های هم‌ارز روی قفسه:</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      ${equivalentProducts.map(eq => `
      <div class="p-2.5 rounded-xl bg-background border border-border hover:border-primary/50 cursor-pointer transition flex items-center justify-between group" data-doc-link="doc-product-${eq.id}">
        <div>
          <span class="font-bold text-foreground group-hover:text-primary transition">${escapeHtml(eq.brandName)}</span>
          <span class="text-[10px] text-muted-foreground block">${escapeHtml(eq.schedule)}</span>
        </div>
        <span class="text-xs text-primary">←</span>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>${p.id === 'prod-sudafed-sinus-decongestant' ? renderPseudoephedrineReferenceSection('fa') : ''}`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
      <span class="text-xs font-bold text-amber-700 dark:text-amber-400">Medicine Monograph &amp; Scheduling:</span>
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-full ${p.schedule === 'S3' ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : p.schedule === 'S4' ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}">${escapeHtml(p.schedule || 'OTC')}</span>
    </div>
    <div class="text-lg font-black text-foreground">${escapeHtml(p.brandName)}</div>
    <div class="text-xs text-muted-foreground font-mono mt-0.5">${escapeHtml(p.genericName)} (${escapeHtml(p.activeIngredients || '')})</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">🎯 Therapeutic Indications:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(p.indications?.en || '')}</p>
  </div>

  ${p.counselingPoints && p.counselingPoints.length > 0 ? `
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2">
    <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">💡 Clinical Counseling Points:</div>
    <ul class="list-disc list-inside space-y-1 text-xs text-muted-foreground">
      ${p.counselingPoints.map(cp => `<li>${escapeHtml(cp.en || cp.fa)}</li>`).join('\n      ')}
    </ul>
  </div>` : ''}
</div>${p.id === 'prod-sudafed-sinus-decongestant' ? renderPseudoephedrineReferenceSection('en') : ''}`;

  documents.push({
    id: docId,
    folder_id: folderId,
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['OTC Monograph', p.schedule ? `Schedule ${p.schedule}` : 'OTC', p.genericName]
  });
}

// 3.2 22 Cautionary Advisory Labels (CAL Labels 1 to 22)
for (const [calCode, cal] of Object.entries(CAL_LABELS_DICT || {})) {
  const calSlug = calCode.toLowerCase().replace(/\s+/g, '-');
  const docId = `doc-cal-${calSlug}`;
  const title = `برچسب هشدار ${cal.code}: ${cal.nameFa}`;
  const titleEn = `${cal.code} - ${cal.nameEn}`;

  // Find all shelf products requiring this CAL label
  const affectedProducts = (SHELF_PRODUCTS || []).filter(p => (p.calLabels || []).includes(cal.code));

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl ${cal.colorClass || 'bg-amber-500/15 border-amber-500/30'} border space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-background/80 text-foreground">APF Standard Label</span>
      <span class="text-xs font-bold">${escapeHtml(cal.code)}</span>
    </div>
    <div class="text-base font-black text-foreground">${escapeHtml(cal.nameFa)}</div>
    <div class="text-xs text-muted-foreground" dir="ltr">${escapeHtml(cal.nameEn)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">متن درج‌شده روی لیبل داروخانه:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">«${escapeHtml(cal.descriptionFa)}»</p>
    <p class="text-xs text-muted-foreground italic font-sans text-left mt-1" dir="ltr">"${escapeHtml(cal.descriptionEn)}"</p>
  </div>

  ${affectedProducts.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-primary/20 space-y-3">
    <div class="text-xs font-bold text-foreground">💊 فرآورده‌های دارای این برچسب هشدار در داروخانه (${affectedProducts.length} مورد):</div>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
      ${affectedProducts.map(p => `
      <div class="p-2.5 rounded-xl bg-background border border-border hover:border-primary/50 cursor-pointer transition flex items-center justify-between group" data-doc-link="doc-product-${p.id}">
        <div>
          <span class="font-bold text-foreground group-hover:text-primary transition">${escapeHtml(p.brandName)}</span>
          <span class="text-[10px] text-muted-foreground block font-mono" dir="ltr">${escapeHtml(p.genericName)}</span>
        </div>
        <span class="text-primary text-xs">←</span>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl ${cal.colorClass || 'bg-amber-500/15 border-amber-500/30'} border space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-background/80 text-foreground">APF Standard Label</span>
      <span class="text-xs font-bold">${escapeHtml(cal.code)}</span>
    </div>
    <div class="text-base font-black text-foreground">${escapeHtml(cal.nameEn)}</div>
    <div class="text-xs text-muted-foreground" dir="rtl">${escapeHtml(cal.nameFa)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">Exact Auxiliary Label Text:</div>
    <p class="text-sm font-semibold text-foreground leading-relaxed">"${escapeHtml(cal.descriptionEn)}"</p>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-mono-cal',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['CAL Labels', 'APF Auxiliary Label', cal.code]
  });
}

// 3.3 8 State Storage Regulations
for (const rule of (STATE_STORAGE_RULES || [])) {
  const docId = `doc-storage-${rule.state.toLowerCase()}`;
  const title = `قوانین نگهداری دارو در ایالت ${rule.nameFa}`;
  const titleEn = `${rule.nameEn} Pharmacy Medicine Storage Regulations`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-xs font-bold text-emerald-600 dark:text-emerald-400 mb-1">قوانین و مقررات ایالتی استرالیا:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(rule.nameFa)} (${escapeHtml(rule.state)})</div>
    <div class="text-xs text-muted-foreground mt-0.5" dir="ltr">${escapeHtml(rule.nameEn)}</div>
  </div>

  <div class="p-4 rounded-2xl ${rule.isStrictBehindCounterS2 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-muted/40 border-border'} border space-y-2">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-bold text-foreground">قانون نگهداری داروهای Pharmacy Medicine (Schedule 2):</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full font-bold ${rule.isStrictBehindCounterS2 ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300' : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300'}">
        ${rule.isStrictBehindCounterS2 ? 'سخت‌گیرانه (پشت کانتر)' : 'آزاد در دید داروساز'}
      </span>
    </div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(rule.s2RuleFa)}</p>
    <p class="text-[11px] text-muted-foreground text-left italic font-sans" dir="ltr">${escapeHtml(rule.s2RuleEn)}</p>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">قانون نگهداری داروهای Pharmacist Only (Schedule 3):</div>
    <p class="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">${escapeHtml(rule.s3RuleFa)}</p>
    <p class="text-[11px] text-muted-foreground text-left italic font-sans" dir="ltr">${escapeHtml(rule.s3RuleEn)}</p>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25">
    <div class="text-base font-bold text-foreground">${escapeHtml(rule.nameEn)} (${escapeHtml(rule.state)})</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">Schedule 2 (Pharmacy Medicine) Storage Law:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(rule.s2RuleEn)}</p>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">Schedule 3 (Pharmacist Only) Storage Law:</div>
    <p class="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">${escapeHtml(rule.s3RuleEn)}</p>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-mono-storage',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Storage Law', 'State Regulation', rule.state]
  });
}

console.log(`Generated 121 Products + 22 CAL Labels + 8 Storage Laws in Pillar 3`);

// =========================================================================
// SECTION 4: 32 SCENARIOS + 13 SCRIPTS (45 docs)
// =========================================================================

function renderScenarioEnglishHtml(sc, linkedDiseaseId, correctOption) {
  const patient = sc.patientProfile || {};
  const hasArabic = (value) => Array.from(String(value || '')).some((char) => {
    const codePoint = char.codePointAt(0);
    return codePoint >= 0x0600 && codePoint <= 0x06ff;
  });
  const rawName = typeof patient.name === 'string' ? patient.name : '';
  const nameStart = rawName.lastIndexOf('(');
  const nameEnd = rawName.lastIndexOf(')');
  const nameNote = nameStart >= 0 && nameEnd > nameStart ? rawName.slice(nameStart + 1, nameEnd) : '';
  const patientName = hasArabic(nameNote) ? rawName.slice(0, nameStart).trim() : (rawName || 'Patient');
  const rawGender = typeof patient.gender === 'string' ? patient.gender : patient.gender?.en || '';
  const genderStart = rawGender.lastIndexOf('(');
  const genderEnd = rawGender.lastIndexOf(')');
  const genderNote = genderStart >= 0 && genderEnd > genderStart ? rawGender.slice(genderStart + 1, genderEnd) : '';
  const gender = hasArabic(genderNote)
    ? rawGender.slice(0, genderStart).trim()
    : (genderNote || (hasArabic(rawGender) ? '' : rawGender));
  const questions = sc.whatQuestions || [];
  const redFlags = sc.redFlags || [];
  const keyPhrases = sc.aussieContext?.keyPhrases || [];
  const outcome = sc.clinicalOutcome;
  const referral = outcome?.referralLetterTemplate;
  const referenceScope = sc.aussieContext?.referenceScope || (sc.id === 'admin-lost-escript-mysl' ? 'national' : 'nsw');
  const referenceHeading = referenceScope === 'national' || referenceScope === 'australian'
    ? 'Official Australian references'
    : referenceScope === 'mixed'
      ? 'Official NSW and Australian references'
      : 'Official NSW references';
  const english = (value, fallback = 'English translation unavailable in source data.') => {
    const text = typeof value === 'string' ? value : value?.en;
    return text
      ? escapeHtml(text)
      : '<span class="text-amber-700 dark:text-amber-400">' + escapeHtml(fallback) + '</span>';
  };
  const html = [];

  html.push('<div class="knowledge-card space-y-6 text-left" dir="ltr">');
  html.push('<div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25"><div class="flex items-center justify-between flex-wrap gap-2 mb-2"><span class="text-xs font-bold text-rose-600 dark:text-rose-400">👤 Pharmacy Patient Triage Case</span><span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold font-mono">English study view</span></div><div class="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-2"><div><strong>Patient:</strong> ' + escapeHtml(patientName) + '</div><div><strong>Age:</strong> ' + escapeHtml(patient.age ? String(patient.age) + ' years' : 'Not supplied') + '</div><div><strong>Gender:</strong> ' + escapeHtml(gender || 'Not supplied') + '</div></div></div>');

  if (linkedDiseaseId) {
    html.push('<div class="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-2 cursor-pointer hover:bg-cyan-500/15 transition group" data-doc-link="doc-disease-' + escapeHtml(linkedDiseaseId) + '"><div><div class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">🩺 Related clinical protocol</div><div class="text-xs font-bold text-foreground group-hover:text-cyan-600 transition">Open the related disease and treatment guide</div></div><span class="text-xs font-bold text-cyan-600 dark:text-cyan-400">Open guide →</span></div>');
  }

  html.push('<section class="p-4 rounded-2xl bg-muted/30 border border-border space-y-2"><h3 class="text-sm font-bold text-foreground">🗣️ Patient presentation</h3><p class="p-3.5 rounded-xl bg-background border border-rose-500/30 text-sm font-semibold text-foreground leading-relaxed italic">"' + english(patient.presentation) + '"</p></section>');

  if (sc.aussieContext?.en) {
    html.push('<section class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-2"><h3 class="text-sm font-bold text-sky-700 dark:text-sky-400">🇦🇺 Australian practice context</h3><p class="text-xs text-foreground leading-relaxed">' + english(sc.aussieContext.en) + '</p></section>');
  }

  if (keyPhrases.length) {
    html.push('<section class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3"><h3 class="text-sm font-bold text-amber-700 dark:text-amber-400">Key terms and local language</h3><div class="grid grid-cols-1 md:grid-cols-2 gap-2">');
    for (const phrase of keyPhrases) {
      html.push('<article class="p-3 rounded-xl bg-background/80 border border-amber-500/20 space-y-1"><div class="font-bold text-foreground">' + english(phrase.phrase) + '</div><p class="text-xs text-muted-foreground leading-relaxed">' + english(phrase.meaningEn, 'English definition unavailable in source data.') + '</p></article>');
    }
    html.push('</div></section>');
  }

  if (questions.length) {
    html.push('<section class="space-y-3"><div class="flex items-center justify-between gap-2"><h3 class="text-sm font-bold text-foreground">📋 Pharmacist assessment questions (W-H-A-T-M-A-N)</h3><span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">Question and patient answer</span></div><div class="space-y-2.5">');
    for (const question of questions) {
      html.push('<article class="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2"><div class="flex items-start gap-2.5"><span class="px-2 py-1 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs shrink-0">' + escapeHtml(question.key || '?') + '</span><div class="space-y-1"><div class="text-xs font-bold text-primary">' + english(question.label?.en || question.key) + ': ' + english(question.question) + '</div></div></div><div class="p-2.5 rounded-lg bg-background/80 border border-border text-xs"><span class="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Patient reply</span><span class="text-foreground italic">"' + english(question.answer) + '"</span></div></article>');
    }
    html.push('</div></section>');
  }

  if (correctOption) {
    html.push('<section class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-2"><h3 class="text-sm font-bold text-emerald-700 dark:text-emerald-400">💊 Recommended pharmacist consultation</h3><p class="p-3 rounded-xl bg-background/80 border border-emerald-500/20 text-xs text-foreground leading-relaxed">' + english(correctOption.text) + '</p>');
    if (correctOption.patientReply?.en) {
      html.push('<p class="text-xs text-muted-foreground italic"><strong>Patient reaction:</strong> "' + english(correctOption.patientReply.en) + '"</p>');
    }
    html.push('</section>');
  }

  if (outcome) {
    const outcomeColor = outcome.requiresReferral ? 'rose' : 'emerald';
    const outcomeLabel = outcome.headline?.en || (outcome.requiresReferral ? '🚨 Referral required' : '✅ Pharmacy management pathway');
    html.push('<section class="p-4 rounded-2xl bg-' + outcomeColor + '-500/10 border border-' + outcomeColor + '-500/30 space-y-2"><h3 class="text-sm font-bold text-' + outcomeColor + '-600 dark:text-' + outcomeColor + '-400">' + outcomeLabel + '</h3><p class="text-xs text-foreground leading-relaxed"><strong>Recommendation:</strong> ' + english(outcome.recommendation) + '</p>');
    if (outcome.explanation?.en) {
      html.push('<p class="text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-2"><strong>Clinical rationale:</strong> ' + english(outcome.explanation.en) + '</p>');
    }
    html.push('</section>');
  }

  if (redFlags.length) {
    html.push('<section class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-2"><h3 class="text-sm font-bold text-rose-600 dark:text-rose-400">🚨 Red flags and escalation cues</h3><ul class="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">');
    for (const flag of redFlags) html.push('<li>' + english(flag) + '</li>');
    html.push('</ul></section>');
  }

  if (sc.aussieContext?.adminRule) {
    html.push('<section class="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 space-y-2"><h3 class="text-sm font-bold text-violet-700 dark:text-violet-400">⚖️ Administrative / jurisdiction note</h3><p class="text-xs text-foreground leading-relaxed">' + english(sc.aussieContext.adminRule) + '</p></section>');
  }

  if (referral) {
    html.push('<section class="p-4 rounded-2xl bg-muted/30 border border-border space-y-2"><h3 class="text-sm font-bold text-foreground">📨 Referral handover template</h3><dl class="grid grid-cols-1 gap-2 text-xs"><div><dt class="font-bold text-muted-foreground">To</dt><dd>' + english(referral.to) + '</dd></div><div><dt class="font-bold text-muted-foreground">Reason</dt><dd>' + english(referral.reason) + '</dd></div><div><dt class="font-bold text-muted-foreground">Summary</dt><dd>' + english(referral.symptomSummary) + '</dd></div><div><dt class="font-bold text-muted-foreground">Current medicines</dt><dd>' + english(referral.currentMeds) + '</dd></div><div><dt class="font-bold text-muted-foreground">Suggested action</dt><dd>' + english(referral.suggestedAction) + '</dd></div></dl></section>');
  }

  if (sc.aussieContext?.officialReferences?.length) {
    html.push('<section class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-2"><h3 class="text-sm font-bold text-sky-700 dark:text-sky-400">' + escapeHtml(referenceHeading) + '</h3><p class="text-xs text-muted-foreground">ARSHNAZ editorial adaptation; educational content remains unreviewed. Sources accessed 25 September 2026.</p><ul class="space-y-1 text-xs">');
    for (const reference of sc.aussieContext.officialReferences) {
      html.push('<li><a class="text-primary underline underline-offset-2" href="' + escapeHtml(reference.url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(reference.title.en) + '</a></li>');
    }
    html.push('</ul></section>');
  }

  html.push('</div>');
  return html.join('');
}

function renderOfficialReferencesFa(sc) {
  const references = sc.aussieContext?.officialReferences || [];
  if (!references.length) return '';
  const referenceScope = sc.aussieContext?.referenceScope || (sc.id === 'admin-lost-escript-mysl' ? 'national' : 'nsw');
  const heading = referenceScope === 'national'
    ? 'منابع رسمی استرالیا و یادداشت ویرایشی'
    : referenceScope === 'australian'
      ? 'منابع رسمی استرالیا و یادداشت ویرایشی'
    : referenceScope === 'mixed'
      ? 'منابع رسمی NSW و استرالیا و یادداشت ویرایشی'
      : 'منابع رسمی NSW و یادداشت ویرایشی';
  const editorialNote = referenceScope === 'national'
    ? 'این سناریو با ارجاع به منابع رسمی ملی استرالیا به‌صورت ویرایشی اصلاح شده است؛ بازبینی علمی/بالینی واجدصلاحیت هنوز انجام نشده است. منابع در ۲۵ سپتامبر ۲۰۲۶ بررسی شدند.'
    : referenceScope === 'australian'
      ? 'این سناریو با ارجاع به منابع رسمی ایالتی و ملی استرالیا به‌صورت ویرایشی اصلاح شده است؛ بازبینی علمی/بالینی واجدصلاحیت هنوز انجام نشده است. منابع در ۲۵ سپتامبر ۲۰۲۶ بررسی شدند.'
    : referenceScope === 'mixed'
      ? 'این سناریو با ارجاع به منابع رسمی NSW و استرالیا به‌صورت ویرایشی اصلاح شده است؛ بازبینی علمی/بالینی واجدصلاحیت هنوز انجام نشده است. منابع در ۲۵ سپتامبر ۲۰۲۶ بررسی شدند.'
      : 'این سناریو برای هم‌راستایی با راهنمای رسمی NSW ویرایش شده است؛ محتوای آموزشی همچنان بازبینی‌نشده است. منابع در ۲۵ سپتامبر ۲۰۲۶ بررسی شدند.';
  return `
  <section class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25 space-y-2 text-right">
    <h3 class="text-xs font-bold text-sky-700 dark:text-sky-400">${escapeHtml(heading)}</h3>
    <p class="text-xs text-muted-foreground">${escapeHtml(editorialNote)}</p>
    <ul class="space-y-1 text-xs">${references.map(reference => `
      <li><a class="text-primary underline underline-offset-2" href="${escapeHtml(reference.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(reference.title.fa)}</a><span class="block text-[11px] text-muted-foreground" dir="ltr">${escapeHtml(reference.title.en)}</span></li>`).join('')}
    </ul>
  </section>`;
}

function renderScenarioHtml(sc, { isPrimaryFa = true } = {}) {
  const presEn = sc.patientProfile?.presentation?.en || '';
  const presFa = sc.patientProfile?.presentation?.fa || '';

  const correctOption = (sc.dialogueOptions || []).find(o => o.isCorrectAdvice) || sc.dialogueOptions?.[0];

  // Linked disease for this scenario
  const linkedDiseaseId = scenarioToDiseaseMap[sc.id];

  if (isPrimaryFa) {
    return `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <!-- Patient Demographic Header -->
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
      <span class="text-xs font-bold text-rose-600 dark:text-rose-400">👤 پرونده بیمار و تریاژ داروخانه (Pharmacy Patient Triage)</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold font-mono">Bilingual Triage</span>
    </div>
    <div class="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div><strong>نام بیمار:</strong> ${escapeHtml(sc.patientProfile?.name || 'مراجعه‌کننده')}</div>
      <div><strong>سن:</strong> ${escapeHtml(sc.patientProfile?.age ? `${sc.patientProfile.age} ساله` : '-')}</div>
      <div><strong>جنسیت:</strong> ${escapeHtml(sc.patientProfile?.gender || '-')}</div>
    </div>
  </div>

  ${linkedDiseaseId ? `
  <div class="p-3.5 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-between gap-2 cursor-pointer hover:bg-cyan-500/15 transition group" data-doc-link="doc-disease-${linkedDiseaseId}">
    <div>
      <div class="text-[10px] font-bold text-cyan-600 dark:text-cyan-400">🩺 پروتکل بالینی و درمان مرتبط:</div>
      <div class="text-xs font-bold text-foreground group-hover:text-cyan-600 transition">مشاهده پروتکل کامل بیماری و داروها</div>
    </div>
    <span class="text-xs font-bold text-cyan-600 dark:text-cyan-400 group-hover:translate-x-[-2px] transition">مشاهده گایدلاین ←</span>
  </div>` : ''}

  <!-- Dual Bilingual Triage Dialogue / Presentation -->
  <div class="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
    <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
      <div class="text-xs font-bold text-foreground flex items-center gap-1.5">
        <span>🗣️ گفتگوی تریاژ و شرح حال بیمار (Patient Presentation &amp; Dialogue)</span>
      </div>
      <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">English &amp; فارسی</span>
    </div>

    <!-- Authentic Spoken English Presentation -->
    <div class="p-3.5 rounded-xl bg-background border border-rose-500/30 text-left font-sans shadow-2xs" dir="ltr">
      <div class="flex items-center justify-between gap-2 mb-1">
        <span class="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wide">🗣️ Spoken English Dialogue (Authentic):</span>
        <span class="text-[10px] text-muted-foreground font-mono">Original Speech</span>
      </div>
      <p class="text-sm font-semibold text-foreground leading-relaxed italic">"${escapeHtml(presEn)}"</p>
    </div>

    <!-- Persian Clinical Translation -->
    <div class="p-3 rounded-xl bg-background/60 border border-border text-right" dir="rtl">
      <div class="text-[10px] font-bold text-muted-foreground mb-1">ترجمه و مفهوم بالینی بیمار (فارسی):</div>
      <p class="text-sm text-foreground/90 leading-relaxed font-medium">«${escapeHtml(presFa)}»</p>
    </div>
  </div>

  <!-- Aussie Slang & Key Terminology Decoder -->
  ${(sc.aussieContext?.keyPhrases && sc.aussieContext.keyPhrases.length > 0) ? `
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/25">
    <div class="text-xs font-bold text-amber-700 dark:text-amber-400 mb-2">🇦🇺 اصطلاحات محلی و واژگان کوچه بازاری (Aussie Slang &amp; Context):</div>
    <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
      ${sc.aussieContext.keyPhrases.map(kp => `
      <div class="p-2.5 rounded-xl bg-background/80 border border-amber-500/20 text-right space-y-1">
        <div class="font-bold text-foreground text-left font-mono" dir="ltr">🗣️ ${escapeHtml(kp.phrase)}</div>
        <div class="text-muted-foreground text-xs leading-normal">${escapeHtml(kp.meaningFa)}</div>
        ${kp.meaningEn ? `<div class="text-[11px] text-muted-foreground/80 text-left italic" dir="ltr">${escapeHtml(kp.meaningEn)}</div>` : ''}
      </div>`).join('')}
    </div>
  </div>` : ''}

  <!-- W-H-A-T-M-A-N Protocol Diagnostic Inquiries -->
  <div class="space-y-3">
    <div class="flex items-center justify-between gap-2">
      <h3 class="text-sm font-bold text-foreground">📋 پروتکل ارزیابی تشخیصی داروساز (W-H-A-T-M-A-N Protocol):</h3>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">پرسش و پاسخ دو زبانه</span>
    </div>
    <div class="space-y-2.5">
      ${(sc.whatQuestions || []).map(wq => `
      <div class="p-3.5 rounded-xl bg-muted/40 border border-border space-y-2.5">
        <div class="flex items-start gap-2.5">
          <span class="px-2 py-1 rounded-lg bg-primary text-primary-foreground font-mono font-bold text-xs shrink-0">${escapeHtml(wq.key)}</span>
          <div class="flex-1 space-y-1">
            <div class="text-xs font-bold text-primary text-left font-sans" dir="ltr">
              ${escapeHtml(wq.label?.en || wq.key)}: ${escapeHtml(wq.question?.en || '')}
            </div>
            <div class="text-xs font-semibold text-foreground/90 text-right" dir="rtl">
              ${escapeHtml(wq.label?.fa || wq.key)}: ${escapeHtml(wq.question?.fa || '')}
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50">
          <div class="p-2.5 rounded-lg bg-background/80 border border-border text-left font-sans" dir="ltr">
            <span class="text-[10px] font-bold text-muted-foreground uppercase block mb-0.5">Patient Reply (EN):</span>
            <span class="text-foreground italic">"${escapeHtml(wq.answer?.en || '')}"</span>
          </div>
          <div class="p-2.5 rounded-lg bg-background/80 border border-border text-right" dir="rtl">
            <span class="text-[10px] font-bold text-muted-foreground block mb-0.5">پاسخ بیمار (فارسی):</span>
            <span class="text-foreground font-medium">«${escapeHtml(wq.answer?.fa || '')}»</span>
          </div>
        </div>
      </div>`).join('')}
    </div>
  </div>

  <!-- Pharmacist Consultation -->
  ${correctOption ? `
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-3">
    <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">💊 مشاوره بالینی صحیح داروساز (Recommended Pharmacist Consultation):</div>

    <div class="p-3 rounded-xl bg-background/80 border border-emerald-500/20 text-left font-sans" dir="ltr">
      <div class="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase mb-1">Pharmacist Clinical Advice (EN):</div>
      <p class="text-xs text-foreground leading-relaxed">${escapeHtml(correctOption.text?.en || '')}</p>
      ${correctOption.patientReply?.en ? `
      <div class="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground italic">
        <strong>Patient Reaction:</strong> "${escapeHtml(correctOption.patientReply.en)}"
      </div>` : ''}
    </div>

    <div class="p-3 rounded-xl bg-background/60 border border-border text-right" dir="rtl">
      <div class="text-[10px] font-bold text-muted-foreground mb-1">شرح مشاوره و توصیه بالینی (فارسی):</div>
      <p class="text-xs text-foreground/90 leading-relaxed font-medium">${escapeHtml(correctOption.text?.fa || '')}</p>
      ${correctOption.patientReply?.fa ? `
      <div class="mt-2 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
        <strong>واکنش بیمار:</strong> «${escapeHtml(correctOption.patientReply.fa)}»
      </div>` : ''}
    </div>
  </div>` : ''}

  <!-- Clinical Outcome -->
  ${sc.clinicalOutcome ? `
  <div class="p-4 rounded-2xl ${sc.clinicalOutcome.requiresReferral ? 'bg-rose-500/10 border border-rose-500/30' : 'bg-emerald-500/10 border border-emerald-500/30'} space-y-2">
    <span class="text-xs font-bold ${sc.clinicalOutcome.requiresReferral ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}">
      ${escapeHtml(sc.clinicalOutcome.headline?.fa || (sc.clinicalOutcome.requiresReferral ? '🚨 نیازمند ارجاع فوری به پزشک (Urgent GP/ED Referral)' : '✅ قابل مدیریت در داروخانه با داروی OTC (Manage in Pharmacy)'))}
    </span>
    <div class="text-xs text-foreground space-y-1">
      <div><strong>توصیه نهایی (FA):</strong> ${escapeHtml(sc.clinicalOutcome.recommendation?.fa || '')}</div>
      ${sc.clinicalOutcome.recommendation?.en ? `<div class="text-left font-sans text-muted-foreground" dir="ltr"><strong>Recommendation (EN):</strong> ${escapeHtml(sc.clinicalOutcome.recommendation.en)}</div>` : ''}
      ${sc.clinicalOutcome.explanation?.fa ? `<div class="text-muted-foreground pt-1 border-t border-border/40"><strong>علت بالینی:</strong> ${escapeHtml(sc.clinicalOutcome.explanation.fa)}</div>` : ''}
    </div>
  </div>` : ''}

  <!-- Red Flags -->
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <h3 class="text-xs font-bold text-rose-600 dark:text-rose-400 mb-2">🚨 علائم هشدار و خطوط قرمز ارجاع (Red Flags &amp; Referral):</h3>
    <ul class="space-y-1.5 text-xs text-muted-foreground list-disc list-inside">
      ${(sc.redFlags || []).map(rf => {
        const fa = typeof rf === 'object' ? (rf.fa || rf.en || '') : String(rf);
        const en = typeof rf === 'object' ? (rf.en || '') : '';
        return `<li>
          <span class="font-semibold text-foreground/90">${escapeHtml(fa)}</span>
          ${en ? `<span class="block text-[11px] text-muted-foreground/80 font-sans ml-4 text-left" dir="ltr">• ${escapeHtml(en)}</span>` : ''}
        </li>`;
      }).join('\n      ')}
    </ul>
  </div>${renderOfficialReferencesFa(sc)}
</div>`;
  }

  return renderScenarioEnglishHtml(sc, linkedDiseaseId, correctOption);
}

function buildPracticeScenarioEntry(sc, kind) {
  const idPrefix = kind === 'slang' ? 'doc-scenario-slang-' : `doc-scenario-${kind}-`;
  const sourceFile = kind === 'slang'
    ? 'data/scenarios/slangScenarios.ts'
    : kind === 'clinical'
      ? 'data/scenarios/clinicalScenarios.ts'
      : 'data/scenarios/adminScenarios.ts';
  const normalizeBilingual = (value) => ({ fa: value?.fa || '', en: value?.en || '' });
  const mode = sc.mode || (kind === 'admin'
    ? 'MODE_A_ADMIN'
    : sc.id === 's3-pseudoephedrine' || sc.id === 'emergency-supply' || sc.id.includes('conflict') || sc.id === 'nsaids-triple-whammy'
      ? 'MODE_C_CONFLICT'
      : 'MODE_B_SLANG');
  return {
    id: sc.id,
    documentId: `${idPrefix}${sc.id}`,
    titleFa: sc.title?.fa || sc.id,
    titleEn: sc.title?.en || sc.id,
    mode,
    categoryFa: sc.category?.fa || '',
    categoryEn: sc.category?.en || '',
    presentationFa: sc.patientProfile?.presentation?.fa || '',
    presentationEn: sc.patientProfile?.presentation?.en || '',
    patientName: sc.patientProfile?.name || '',
    patientAge: Number.isFinite(sc.patientProfile?.age) ? sc.patientProfile.age : null,
    patientGender: sc.patientProfile?.gender || '',
    questions: (sc.whatQuestions || []).map((question) => ({
      key: question.key || '',
      labelFa: question.label?.fa || '',
      labelEn: question.label?.en || '',
      questionFa: question.question?.fa || '',
      questionEn: question.question?.en || '',
      answerFa: question.answer?.fa || '',
      answerEn: question.answer?.en || '',
    })),
    redFlags: (sc.redFlags || []).map((flag) => typeof flag === 'string'
      ? { fa: flag, en: '' }
      : normalizeBilingual(flag)),
    dialogueOptions: (sc.dialogueOptions || []).map((option) => ({
      id: option.id,
      textFa: option.text?.fa || '',
      textEn: option.text?.en || '',
      patientReplyFa: option.patientReply?.fa || '',
      patientReplyEn: option.patientReply?.en || '',
      sourceMarksRecommended: Boolean(option.isCorrectAdvice),
      sourceMarksRedFlagResponse: Boolean(option.isRedFlagDetector),
    })),
    outcome: sc.clinicalOutcome ? {
      requiresReferral: Boolean(sc.clinicalOutcome.requiresReferral),
      recommendationFa: sc.clinicalOutcome.recommendation?.fa || '',
      recommendationEn: sc.clinicalOutcome.recommendation?.en || '',
      explanationFa: sc.clinicalOutcome.explanation?.fa || '',
      explanationEn: sc.clinicalOutcome.explanation?.en || '',
    } : null,
    sourceUrl: `https://github.com/hamedharami-hub/pharmacy/blob/${sourceCommit}/${sourceFile}`,
    contentReviewStatus: 'unreviewed',
  };
}

// 4.1 4 Slang Scenarios
const pharmacyPracticeScenarios = [];
for (const sc of (SLANG_SCENARIOS || [])) {
  pharmacyPracticeScenarios.push(buildPracticeScenarioEntry(sc, 'slang'));
  const docId = `doc-scenario-slang-${sc.id}`;
  const title = `مکالمه بیمار: ${sc.title?.fa || sc.id}`;
  const titleEn = `Patient Case: ${sc.title?.en || sc.id}`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-slang',
    title,
    title_en: titleEn,
    content_html: renderScenarioHtml(sc, { isPrimaryFa: true }),
    content_en: renderScenarioHtml(sc, { isPrimaryFa: false }),
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Patient Slang', 'OTC Consultation', 'Communication', 'Bilingual Triage']
  });
}

function applySafeScriptEditorialCorrection(sourceScenario) {
  if (sourceScenario.id !== 'safescript-early-refill-s8') return sourceScenario;

  // Keep the Pharmacy source and stable IDs as provenance; this local editorial
  // correction is grounded in the linked NSW guidance and remains unreviewed.
  const sc = JSON.parse(JSON.stringify(sourceScenario));
  sc.title = {
    fa: 'C4. هشدار SafeScript و درخواست جایگزینی زودهنگام داروی S8/S4 (NSW)',
    en: 'C4. SafeScript Alert & Early Replacement Request (NSW; S8/S4)',
  };
  sc.redFlags = [
    {
      fa: 'هشدار SafeScript یک علامت برای بررسی است، نه دستور یا منع خودکار عرضه. متن واقعی هشدار و سابقهٔ ثبت‌شده را بررسی کنید؛ درخواست زودهنگام به‌تنهایی وجود هشدار قرمز را ثابت نمی‌کند.',
      en: 'A SafeScript alert is a prompt for review, not an instruction or automatic prohibition on supply. Check the actual alert and recorded history; an early request alone does not establish a red alert.',
    },
    {
      fa: 'مصرف هم‌زمان اکسی‌کودون و تمازپام می‌تواند خطر سرکوب تنفسی و آسیب جدی را افزایش دهد. مقدار و زمان مصرف، هم‌زمانی داروها، سطح هوشیاری و تنفس بیمار را ارزیابی کنید.',
      en: 'Concurrent oxycodone and temazepam can increase the risk of respiratory depression and serious harm. Assess doses, timing, co-use, alertness, and breathing.',
    },
    {
      fa: 'خواب‌آلودگی شدید، دشواری تنفس، بیدار نشدن یا کاهش هوشیاری نشانهٔ نیاز به ارزیابی اورژانسی است؛ این سناریو جایگزین قضاوت بالینی نیست.',
      en: 'Marked sedation, difficulty breathing, inability to wake, or reduced consciousness requires urgent emergency assessment; this scenario does not replace clinical judgment.',
    },
  ];
  const alertQuestion = {
    key: 'A',
    label: { fa: 'A - جزئیات هشدار و ارزیابی مصرف هم‌زمان؟', en: 'A - Alert details and co-use assessment?' },
    question: {
      fa: 'لطفاً جزئیات هشدار ثبت‌شده را بررسی کنیم: آخرین بار چه زمانی اکسی‌کودون و تمازپام مصرف کردید و آیا اکنون خواب‌آلودگی غیرعادی یا دشواری تنفس دارید؟',
      en: 'Can we review the actual alert and check when you last took oxycodone and temazepam, and whether you have unusual drowsiness or breathing difficulty now?',
    },
    answer: {
      fa: 'شب‌ها تمازپام مصرف می‌کنم؛ باید زمان دقیق آخرین مصرف اکسی‌کودون را بررسی کنم. هنوز دربارهٔ علائم فعلی از من سؤال نشده است.',
      en: 'I take temazepam at night; I need to check exactly when I last took oxycodone. I have not yet been asked about current symptoms.',
    },
  };
  sc.whatQuestions = (sc.whatQuestions || []).map(question => question.key === 'A' ? alertQuestion : question);
  sc.dialogueOptions = (sc.dialogueOptions || []).map(option => option.id !== 'ss2' ? option : ({
    ...option,
    text: {
      fa: 'مدیریت بی‌قضاوت و مبتنی بر ارزیابی موردی: ۱) نگرانی بیمار را با همدلی بشنوید و او را متهم نکنید. ۲) جزئیات هشدار واقعی SafeScript، نسخه و دستور مصرف معتبر، سوابق تحویل و زمان‌بندی را بررسی کنید؛ صرف درخواست زودهنگام را با وجود هشدار قرمز یا ممنوعیت قانونی یکی ندانید. ۳) در این پرونده، ادعای مفقودی، دریافت اخیر دارو و مصرف هم‌زمان اکسی‌کودون و تمازپام، ارزیابی دقیق خطر و تماس با نسخه‌نویس را در صورت اقتضای بالینی مهم می‌کند. هوشیاری، تنفس، دوزها و زمان مصرف را بسنجید و در علائم حاد، ارجاع اورژانسی دهید. ۴) راهنمای NSW می‌گوید بیمار لازم نیست مفقودی داروی تحویلی را به Pharmaceutical Services گزارش کند؛ گزارش پلیس الزام همگانی یا پیش‌شرط خودکار جایگزینی نیست و فرد می‌تواند در صورت نگرانی با پلیس تماس بگیرد. داروساز ممکن است بسته به نوع دارو، سابقه و شرایط بتواند یا نتواند جایگزین بدهد. بدون بررسی نسخه، مقررات جاری NSW و شرایط بیمار، دربارهٔ تحویل یا مسکن جایگزین وعده ندهید؛ تصمیم و علت را مستند کنید.',
      en: 'Use a non-judgmental, case-specific safety assessment: 1) Acknowledge the patient’s concern without treating them as a suspect. 2) Review the actual SafeScript alert, valid prescription and directions, dispensing history, and timing; do not equate an early request with proof of a red alert or a legal prohibition. 3) In this case, the reported loss, recent supply, and oxycodone–temazepam combination warrant careful risk assessment and prescriber liaison when clinically indicated. Check alertness, breathing, doses, and timing; escalate urgently if acute symptoms are present. 4) NSW patient guidance says a person does not need to notify Pharmaceutical Services about lost or stolen dispensed medicine. A police report is not a universal prerequisite for replacement; the patient may contact police if concerned. Depending on the medicine, history, and circumstances, a pharmacist may or may not be able to provide a replacement. Do not promise supply or interim analgesia before checking the prescription, current NSW requirements, and individual suitability; document the decision and rationale.',
    },
    patientReply: {
      fa: 'متوجه شدم؛ ممنون که موضوع را بدون قضاوت بررسی می‌کنید. لطفاً هشدار و سابقه را ببینید و اگر لازم بود با پزشکم هماهنگ کنید.',
      en: 'I understand. Thank you for reviewing this without judgment. Please check the alert and history, and contact my prescriber if needed.',
    },
  }));
  sc.clinicalOutcome = {
    ...sc.clinicalOutcome,
    requiresReferral: false,
    headline: {
      fa: 'تصمیم فردی پس از بررسی ایمنی',
      en: 'Individual decision after safety review',
    },
    recommendation: {
      fa: 'پیش از تصمیم دربارهٔ جایگزینی، هشدار و سوابق واقعی، نسخه و دستور مصرف و خطر مصرف هم‌زمان را بررسی کنید؛ در صورت نیاز بالینی با نسخه‌نویس هماهنگ و تصمیم را مستند کنید.',
      en: 'Before deciding about replacement, review the actual alert and dispensing history, prescription and directions, and co-use risks; liaise with the prescriber when clinically indicated and document the decision.',
    },
    explanation: {
      fa: 'طبق راهنمای NSW، هشدار SafeScript به‌تنهایی دستور یا منع عرضه نیست و تصمیم را باید متخصص با توجه به ایمنی و تناسب بالینی بگیرد. در این پرونده، ترکیب اپیوئید و بنزودیازپین یک خطر بالینی مهم است؛ اما نه مفقودی ادعاشده و نه نبود گزارش پلیس به‌تنهایی پاسخ قانونی یا بالینی را تعیین نمی‌کند.',
      en: 'NSW guidance states that a SafeScript alert is not itself an order or prohibition; the practitioner decides whether supply is clinically safe and appropriate. The opioid–benzodiazepine combination is a material clinical risk in this case, but neither a reported loss nor the absence of a police report alone determines the legal or clinical decision.',
    },
    referralLetterTemplate: {
      ...sc.clinicalOutcome.referralLetterTemplate,
      reason: 'Case-specific SafeScript alert review and early replacement request',
      symptomSummary: '39-year-old requests replacement of oxycodone and temazepam reported lost; recent supply and possible concurrent use require review of the actual alert, prescription directions, timing, and current symptoms.',
      suggestedAction: 'Review the actual SafeScript alert and dispensing history, verify prescription validity and directions, assess opioid–benzodiazepine co-use and acute symptoms, clarify the reported loss, and advise on replacement under current NSW requirements. Escalate urgently if acute overdose symptoms are present. A police report is not a universal prerequisite.',
    },
  };
  sc.aussieContext = {
    ...sc.aussieContext,
    fa: 'SafeScript در NSW ابزار پایش و ارائهٔ هشدار برای کمک به ارزیابی است؛ خود هشدار به‌تنهایی عرضه را ممنوع یا مجاز نمی‌کند. تصمیم موردی با داروساز/نسخه‌نویس و بر پایهٔ وضعیت بالینی، مقررات جاری و اطلاعات واقعی است.',
    en: 'In NSW, SafeScript provides monitoring information and alerts to support assessment; an alert alone neither prohibits nor authorises supply. Decisions are case-specific and depend on clinical circumstances, current requirements, and the actual record.',
    adminRule: {
      fa: 'راهنمای بیمار NSW: برای مفقودی یا سرقت داروی تحویلی، بیمار لازم نیست به Pharmaceutical Services گزارش دهد؛ تماس با پلیس اختیاری است و گزارش پلیس پیش‌شرط همگانی جایگزینی نیست. داروساز بسته به دارو، سابقه و شرایط ممکن است بتواند یا نتواند جایگزین عرضه کند. الزامات جاری NSW و سیاست محل کار را جداگانه بررسی کنید.',
      en: 'NSW patient guidance: a patient does not need to notify Pharmaceutical Services about lost or stolen dispensed medicine. Contacting police is optional, not a universal prerequisite for replacement. A pharmacist may or may not be able to replace it depending on the medicine, history, and circumstances. Check current NSW requirements and workplace policy.',
    },
    keyPhrases: [
      { phrase: 'SafeScript / RTPM', meaningFa: 'سامانه پایش برخط نسخه‌های مشمول در NSW؛ دامنهٔ داروها و هشدارها را از راهنمای جاری سامانه بررسی کنید.', meaningEn: 'NSW real-time prescription monitoring for in-scope medicines; check current system guidance for scope and alerts.' },
      { phrase: 'SafeScript alert', meaningFa: 'نشانه‌ای برای بررسی سوابق و ارزیابی موردی؛ به‌تنهایی دستور یا منع خودکار عرضه نیست.', meaningEn: 'A prompt to review records and assess the case; not by itself an order or automatic prohibition on supply.' },
      { phrase: 'Schedule 8 (S8)', meaningFa: 'رده‌ای از داروهای تحت کنترل؛ تکالیف به دارو، نسخه، شرایط و مقررات جاری ایالت بستگی دارد.', meaningEn: 'A category of controlled medicines; obligations depend on the medicine, prescription, circumstances, and current state requirements.' },
    ],
    officialReferences: [
      {
        title: { fa: 'اعلان‌ها و هشدارهای SafeScript برای متخصصان', en: 'SafeScript pop-up notifications and alerts' },
        url: 'https://www.health.nsw.gov.au/pharmaceutical/safescript/practitioners/Pages/pop-up-notifications-and-alerts.aspx',
      },
      {
        title: { fa: 'راهنمای بیمار دربارهٔ داروی گم‌شده یا سرقت‌شده', en: 'If a patient has lost or had medicines stolen' },
        url: 'https://www.health.nsw.gov.au/pharmaceutical/patients/Pages/lost-stolen-return-medicines.aspx',
      },
    ],
  };
  return sc;
}

function applyChickenpoxEditorialCorrection(sourceScenario) {
  if (sourceScenario.id !== 'chickenpox-advisory') return sourceScenario;

  // Keep the source record and stable mapping. Australian guidance on NSAIDs
  // is not uniform, so expose the conflict and leave clinical sign-off open.
  const sc = JSON.parse(JSON.stringify(sourceScenario));
  sc.title = {
    fa: '۵. آبله‌مرغان کودک: تسکین علائم و تفاوت راهنماهای ایبوپروفن',
    en: '5. Childhood Chickenpox: Symptom Relief & Conflicting Ibuprofen Advice',
  };
  sc.redFlags = [
    {
      fa: 'تفاوت راهنمای NSAID: راهنمای RCH و Healthdirect از مصرف ایبوپروفن/NSAID در آبله‌مرغان پرهیز می‌دهند؛ برگهٔ به‌روز شبکهٔ بیمارستان‌های کودکان NSW (۱۳ آوریل ۲۰۲۶) ایبوپروفن یا پاراستامول را برای تب/درد ذکر می‌کند. از تعمیم یک حکم مطلق بدون بررسی راهنمای بالینی محلی پرهیز کنید.',
      en: 'NSAID guidance differs: RCH and Healthdirect advise avoiding ibuprofen/NSAIDs in chickenpox; the Sydney Children’s Hospitals Network factsheet (13 April 2026) lists ibuprofen or paracetamol for fever/pain. Do not generalise a blanket rule without checking current local clinical guidance.',
    },
    {
      fa: 'مناطق بزرگ، دردناک و قرمز اطراف تاول‌ها؛ تب بالا، بدحالی یا خواب‌آلودگی فزاینده، تنفس دشوار، کم‌آبی، درد گردن، درد/تغییر بینایی یا ناتوانی در نوشیدن نیازمند ارزیابی پزشکی است؛ در علائم شدید، کمک فوری بگیرید.',
      en: 'Large, sore, red areas around blisters; high fever, worsening illness or drowsiness, breathing difficulty, dehydration, neck pain, eye pain/vision changes, or inability to drink need medical assessment; seek urgent care for severe symptoms.',
    },
    {
      fa: 'حمام و فرآورده‌های پوستی را بر پایهٔ راحتی و راهنمای محصول انتخاب کنید؛ منابع بررسی‌شده از ادعای اینکه هر روغن حمام گرما را حبس می‌کند یا عفونت باکتریایی ایجاد می‌کند پشتیبانی نمی‌کنند. آب بسیار داغ را اگر ناراحتی را بدتر می‌کند به‌کار نبرید.',
      en: 'Choose bathing and skin products based on comfort and product guidance; the sources reviewed do not support a claim that all bath oils trap heat or cause bacterial infection. Avoid very hot water if it worsens discomfort.',
    },
  ];
  sc.dialogueOptions = (sc.dialogueOptions || []).map(option => option.id !== 'cp2' ? option : ({
    ...option,
    text: {
      fa: '۱) راهنمای مناسب سن کودک و محل کار را بررسی کنید: RCH و Healthdirect در آبله‌مرغان از NSAIDها مثل ایبوپروفن پرهیز می‌دهند، اما برگهٔ به‌روز Sydney Children’s Hospitals Network در NSW، ایبوپروفن یا پاراستامول را برای تب/درد فهرست می‌کند. چون راهنمای رسمی اختلاف دارد، فقط با اتکا به این سناریو ایبوپروفن ندهید؛ راهنمای جاری محل و سابقهٔ کودک را با پزشک/داروساز بررسی کنید. ۲) اگر کودک به‌دلیل درد یا تب ناراحت است، پاراستامول را فقط طبق دوز سنی/وزنی و برچسب محصول در نظر بگیرید؛ به کودک آسپیرین ندهید. ۳) برای خارش از فرآوردهٔ تسکین‌دهندهٔ مناسب با راهنمایی داروساز استفاده کنید؛ Healthdirect لوسیون‌های تسکین‌دهنده را ذکر می‌کند و Better Health Channel می‌گوید حمام جو دوسر کلوئیدی ممکن است کمک کند. حمام و روغن را منع مطلق ندانید و ادعای افزایش عفونت باکتریایی به‌علت روغن را تکرار نکنید. ۴) مایعات و استراحت را تشویق کنید و ناخن‌ها را کوتاه نگه دارید. برای قرمزی/درد گسترده اطراف تاول، تب بالا، بی‌حالی، تنفس دشوار، کم‌آبی یا علائم چشم/گردن ارزیابی فوری بگیرید.',
      en: '1) Check age-appropriate guidance for the child and your jurisdiction: RCH and Healthdirect advise avoiding NSAIDs such as ibuprofen in chickenpox, while the updated Sydney Children’s Hospitals Network factsheet in NSW lists ibuprofen or paracetamol for fever/pain. Because official guidance differs, do not give ibuprofen based on this scenario alone; check current local guidance and the child’s history with a doctor/pharmacist. 2) If fever or pain is making the child uncomfortable, consider paracetamol only according to the age/weight directions and product label; do not give aspirin. 3) For itch, choose a suitable soothing product with pharmacist advice; Healthdirect mentions soothing lotions and Better Health Channel says colloidal oatmeal baths may help. Do not describe all baths or oils as absolutely prohibited, and do not repeat the unsupported claim that oils increase bacterial infection. 4) Encourage fluids and rest and keep nails short. Seek urgent assessment for extensive painful redness around blisters, high fever, drowsiness, breathing difficulty, dehydration, or eye/neck symptoms.',
    },
    patientReply: {
      fa: 'متوجه شدم؛ دربارهٔ ایبوپروفن راهنماها یکسان نیستند، پس پیش از تصمیم از داروساز یا پزشک می‌پرسم و برای خارش از گزینهٔ تسکین‌دهندهٔ مناسب راهنمایی می‌گیرم.',
      en: 'I understand. The guidance on ibuprofen differs, so I will check with a pharmacist or doctor before deciding and ask about a suitable soothing option for the itch.',
    },
  }));
  sc.clinicalOutcome = {
    ...sc.clinicalOutcome,
    requiresReferral: false,
    headline: { fa: 'تسکین علائم؛ راهنمای محلی را برای NSAID بررسی کنید', en: 'Symptom relief; check local NSAID guidance' },
    recommendation: {
      fa: 'ایبوپروفن را فقط بر پایهٔ این سناریو توصیه نکنید: منابع استرالیایی بررسی‌شده در توصیهٔ مربوط به آبله‌مرغان اختلاف دارند. تا تأیید راهنمای جاری و وضعیت کودک، با GP/داروساز مشورت کنید؛ برای ناراحتی، پاراستامول را فقط طبق برچسب در نظر بگیرید و آسپیرین ندهید. برای خارش از روش تسکین‌دهندهٔ مناسب استفاده کنید و علائم هشدار را پایش کنید.',
      en: 'Do not recommend ibuprofen from this scenario alone: the Australian sources reviewed differ in their chickenpox advice. Check current local guidance and the child’s situation with a GP/pharmacist; for discomfort, consider paracetamol only as labelled and do not give aspirin. Use an appropriate itch-relief measure and monitor for red flags.',
    },
    explanation: {
      fa: 'Healthdirect (بازبینی مه ۲۰۲۵) و RCH (بازبینی ژوئیهٔ ۲۰۲۱) توصیه می‌کنند در آبله‌مرغان از NSAID/ایبوپروفن پرهیز شود و به افزایش خطر عوارض اشاره می‌کنند. در مقابل، برگهٔ Sydney Children’s Hospitals Network در NSW که ۱۳ آوریل ۲۰۲۶ به‌روز شده، داروی بدون نسخه مثل پاراستامول یا ایبوپروفن را برای تب/درد ذکر می‌کند. بنابراین عبارت «ایبوپروفن در همهٔ موارد منع قطعی است» یا ادعای خطر اثبات‌شدهٔ نکروز فاشیا برای هر مصرف، بدون حل این اختلاف دقیق نیست. دربارهٔ حمام و روغن نیز منابع این ممیزی می‌گویند لوسیون تسکین‌دهنده و حمام جو دوسر ممکن است به خارش کمک کند؛ آن‌ها ادعای حبس گرما/ایجاد عفونت به‌وسیلهٔ همهٔ روغن‌ها را تأیید نمی‌کنند. این اختلاف باید پیش از ارتقای محتوا توسط بازبین بالینی و با تعیین حوزهٔ قضایی حل شود.',
      en: 'Healthdirect (reviewed May 2025) and RCH advise avoiding NSAIDs/ibuprofen in chickenpox and note increased complication risk. The RCH parent factsheet was reviewed in July 2021 and updated in July 2025; its clinical practice guideline (last updated July 2021) says to avoid NSAIDs because of increased invasive group A Streptococcus risk. In contrast, the Sydney Children’s Hospitals Network NSW factsheet, updated 13 April 2026, lists OTC medicine such as paracetamol or ibuprofen for fever/pain. Therefore, “ibuprofen is absolutely contraindicated in every case” or a proven risk of necrotising fasciitis from any use is not accurate without resolving this discrepancy. For bathing and oils, the reviewed sources say soothing lotions and colloidal oatmeal baths may help itching; they do not support a claim that all oils trap heat or cause infection. A qualified clinical reviewer must resolve this conflict and define jurisdiction before the content can be upgraded.',
    },
  };
  sc.aussieContext = {
    ...sc.aussieContext,
    referenceScope: 'australian',
    fa: 'راهنماهای استرالیایی دربارهٔ ایبوپروفن در آبله‌مرغان هم‌نظر نیستند: Healthdirect و RCH توصیه به پرهیز دارند، اما برگهٔ جدیدتر Sydney Children’s Hospitals Network در NSW ایبوپروفن یا پاراستامول را ذکر می‌کند. تا بازبینی بالینی، راهنمای محلی و وضعیت کودک را با پزشک/داروساز بررسی کنید. برای خارش، لوسیون تسکین‌دهنده یا حمام جو دوسر کلوئیدی ممکن است کمک کند.',
    en: 'Australian guidance on ibuprofen in chickenpox is not uniform: Healthdirect and RCH advise avoidance, while the newer Sydney Children’s Hospitals Network NSW factsheet lists ibuprofen or paracetamol. Until clinical review, check local guidance and the child’s situation with a doctor/pharmacist. For itch, soothing lotions or a colloidal oatmeal bath may help.',
    adminRule: {
      fa: 'برای کودک ۵ساله، Healthdirect و RCH پرهیز از NSAID/ایبوپروفن را توصیه می‌کنند؛ منبع به‌روز NSW خلاف آن را در گزینه‌های OTC می‌آورد. این سناریو عمداً اختلاف را نشان می‌دهد و قانون عرضه تعیین نمی‌کند. راهنمای جاری محل، محصول، سن/وزن و سابقهٔ کودک باید توسط متخصص بررسی شود.',
      en: 'For this 5-year-old, Healthdirect and RCH advise avoiding NSAIDs/ibuprofen; a more recent NSW source lists it among OTC options. This scenario intentionally exposes the discrepancy and does not determine supply. A clinician should review current jurisdictional guidance, product, age/weight, and child history.',
    },
    keyPhrases: [
      { phrase: 'NSAID / Ibuprofen', meaningFa: 'داروهای ضدالتهاب غیراستروئیدی؛ منابع رسمی دربارهٔ آبله‌مرغان اختلاف دارند و باید راهنمای محلی بررسی شود.', meaningEn: 'Australian sources differ on NSAIDs in chickenpox; check current local guidance.' },
      { phrase: 'Colloidal oatmeal bath', meaningFa: 'حمام جو دوسر کلوئیدی؛ ممکن است برای کاهش خارش کمک کند، اما درمان ویروس نیست.', meaningEn: 'May help soothe itch; it does not treat the virus.' },
    ],
    officialReferences: [
      {
        title: { fa: 'Healthdirect Australia: آبله‌مرغان (بازبینی مهٔ ۲۰۲۵)', en: 'Healthdirect Australia: Chickenpox (reviewed May 2025)' },
        url: 'https://www.healthdirect.gov.au/amp/article/chickenpox',
      },
      {
        title: { fa: 'Royal Children’s Hospital Melbourne: برگهٔ والدین آبله‌مرغان (بازبینی ژوئیهٔ ۲۰۲۱؛ به‌روزرسانی ژوئیهٔ ۲۰۲۵)', en: 'Royal Children’s Hospital Melbourne: Chickenpox parent fact sheet (reviewed July 2021; updated July 2025)' },
        url: 'https://www.rch.org.au/kidsinfo/fact_sheets/Chickenpox/',
      },
      {
        title: { fa: 'Royal Children’s Hospital Melbourne: راهنمای بالینی آبله‌مرغان (آخرین به‌روزرسانی ژوئیهٔ ۲۰۲۱)', en: 'Royal Children’s Hospital Melbourne: Chickenpox clinical practice guideline (last updated July 2021)' },
        url: 'https://www.rch.org.au/clinicalguide/guideline_index/Chickenpox_varicella/',
      },
      {
        title: { fa: 'Sydney Children’s Hospitals Network NSW: برگهٔ آبله‌مرغان (به‌روزرسانی ۱۳ آوریل ۲۰۲۶؛ توصیهٔ متفاوت)', en: 'Sydney Children’s Hospitals Network NSW: Chickenpox factsheet (updated 13 April 2026; differing advice)' },
        url: 'https://www.schn.health.nsw.gov.au/factsheets/chickenpox',
      },
      {
        title: { fa: 'Better Health Channel Victoria: مراقبت از آبله‌مرغان (بازبینی ۲۳ اکتبر ۲۰۲۳)', en: 'Better Health Channel Victoria: Chickenpox care (reviewed 23 October 2023)' },
        url: 'https://www.betterhealth.vic.gov.au/health/conditionsandtreatments/chickenpox',
      },
    ],
  };
  return sc;
}

function applyPregnancyThrushEditorialCorrection(sourceScenario) {
  if (sourceScenario.id !== 'thrush-triage') return sourceScenario;

  // Preserve the Pharmacy scenario/source IDs. This sourced local edit remains
  // educational draft content and must not be promoted to clinically reviewed.
  const sc = JSON.parse(JSON.stringify(sourceScenario));
  sc.title = {
    fa: '۸. برفک واژینال در بارداری: تأیید تشخیص و انتخاب درمان',
    en: '8. Vaginal Thrush in Pregnancy: Confirm Diagnosis & Individualise Treatment',
  };
  sc.redFlags = [
    {
      fa: 'بارداری (هفتهٔ ۱۴) و نخستین بروز علائم: خودتشخیصی قابل اتکا نیست؛ پیش از شروع درمان، تشخیص را با پزشک یا ماما تأیید کنید و در صورت نیاز بررسی/سواب انجام شود.',
      en: 'Pregnancy (14 weeks) with a first episode: self-diagnosis is unreliable; confirm the diagnosis with a doctor or midwife before treatment, with testing or a swab if needed.',
    },
    {
      fa: 'فلوکونازول خوراکی را برای خوددرمانی توصیه یا عرضه نکنید. Healthdirect می‌گوید در بارداری از آن پرهیز شود مگر پزشک توصیه کند؛ MotherSafe آن را پس از سه‌ماههٔ اول، فقط در شرایط مشخص، گزینهٔ خط دوم می‌داند.',
      en: 'Do not recommend or supply oral fluconazole for self-treatment. Healthdirect advises avoiding it in pregnancy unless a doctor recommends it; MotherSafe considers it a possible second-line option after the first trimester in specific circumstances.',
    },
    {
      fa: 'درد لگنی، خونریزی غیرطبیعی، عود یا عدم پاسخ به درمان نیازمند ارزیابی پزشکی است؛ علائم مشابه ممکن است علت دیگری داشته باشند.',
      en: 'Pelvic pain, abnormal bleeding, recurrence, or failure to improve needs medical assessment; similar symptoms can have another cause.',
    },
  ];
  sc.whatQuestions = [
    ...(sc.whatQuestions || []),
    {
      key: 'N',
      label: { fa: 'N - نخستین بروز یا سابقهٔ تشخیص؟', en: 'N - First episode or previously diagnosed?' },
      question: {
        fa: 'آیا پیش از این توسط پزشک تشخیص برفک گرفته‌اید یا این نخستین بار است؟',
        en: 'Have you previously had thrush diagnosed by a doctor, or is this your first episode?',
      },
      answer: {
        fa: 'این نخستین بار است و قبلاً تشخیص پزشکی نداشته‌ام.',
        en: 'This is my first episode and I have not had a previous medical diagnosis.',
      },
    },
  ];
  sc.dialogueOptions = (sc.dialogueOptions || []).map(option => option.id !== 'vt2' ? option : ({
    ...option,
    text: {
      fa: '۱) چون باردارید و این نخستین بروز علائم است، ظاهر ترشحات به‌تنهایی تشخیص را قطعی نمی‌کند؛ پیش از درمان با GP یا ماما مشورت کنید، چون ممکن است معاینه یا سواب لازم باشد. ۲) فلوکونازول خوراکی را برای خوددرمانی توصیه یا عرضه نکنید؛ Healthdirect می‌گوید در بارداری از آن پرهیز شود مگر پزشک توصیه کند. ۳) ضدقارچ واژینال مانند کلوتریمازول یا نیستاتین معمولاً گزینهٔ ترجیحی بارداری است. MotherSafe NSW برای کلوتریمازول ۱٪ کرم یا پِساری ۱۰۰ میلی‌گرم، شبانه به‌مدت ۶ روز را ذکر می‌کند و می‌گوید اپلیکاتور با احتیاط قابل استفاده است. انتخاب محصول را با ارزیابی فردی و راهنمای جاری انجام دهید. ۴) ممنوعیت مطلق برای هر تک‌دوز فلوکونازول بیان نکنید: MotherSafe آن را پس از سه‌ماههٔ اول، در صورت شکست یا عدم تحمل درمان موضعی، گزینهٔ خط دوم می‌داند؛ این به معنی خوددرمانی یا عرضه بدون توصیهٔ حرفه‌ای نیست. ۵) برای درد لگنی، خونریزی غیرطبیعی، عود یا عدم پاسخ، ارزیابی پزشکی لازم است.',
      en: '1) Because you are pregnant and this is your first episode, symptoms alone cannot confirm thrush; speak with your GP or midwife before treatment because examination or a swab may be needed. 2) Do not recommend or supply oral fluconazole for self-treatment; Healthdirect advises avoiding it in pregnancy unless a doctor recommends it. 3) Vaginal antifungals such as clotrimazole or nystatin are generally preferred in pregnancy. MotherSafe NSW lists clotrimazole 1% cream or a 100 mg pessary nightly for 6 days and says vaginal applicators may be used with care. Select a product after individual assessment and against current guidance. 4) Do not describe every single fluconazole dose as absolutely contraindicated: MotherSafe considers it a possible second-line option after the first trimester if topical treatment fails or is not tolerated; this does not mean self-treatment or supply without professional advice. 5) Pelvic pain, abnormal bleeding, recurrence, or failure to improve needs medical assessment.',
    },
    patientReply: {
      fa: 'متوجه شدم؛ پیش از شروع درمان با پزشک یا ماما دربارهٔ تأیید تشخیص و گزینهٔ مناسب بارداری صحبت می‌کنم.',
      en: 'I understand. I will speak with my doctor or midwife to confirm the diagnosis and choose an appropriate treatment in pregnancy before starting therapy.',
    },
  }));
  sc.clinicalOutcome = {
    ...sc.clinicalOutcome,
    requiresReferral: true,
    headline: { fa: 'ارزیابی غیرفوری پزشک/ماما پیش از درمان', en: 'Non-urgent GP/midwife review before treatment' },
    recommendation: {
      fa: 'به‌دلیل بارداری و نخستین بروز علائم، بیمار را برای تأیید تشخیص و انتخاب درمان به GP یا ماما ارجاع دهید. فلوکونازول را برای خوددرمانی توصیه نکنید؛ درمان موضعی معمولاً ترجیح دارد و هر گزینه باید طبق راهنمای جاری و ارزیابی فردی انتخاب شود.',
      en: 'Because the patient is pregnant and this is a first episode, arrange GP or midwife review to confirm the diagnosis and select treatment. Do not recommend fluconazole for self-treatment; topical therapy is generally preferred and any option requires individual assessment under current guidance.',
    },
    explanation: {
      fa: 'Healthdirect توصیه می‌کند فرد باردار پیش از شروع درمان با پزشک یا داروساز مشورت کند و برای برفک در بارداری از فلوکونازول پرهیز کند مگر پزشک توصیه کرده باشد. MotherSafe NSW درمان واژینال را ترجیح می‌دهد، اما فلوکونازول را پس از سه‌ماههٔ اول در صورت شکست یا عدم تحمل درمان موضعی خط دوم می‌داند؛ همچنین اپلیکاتور را با احتیاط قابل استفاده می‌داند. پایگاه TGA گزارش‌های مربوط به ۱۵۰ میلی‌گرم در سه‌ماههٔ اول و خطر دوزهای مکرر بالا را ذکر می‌کند. بنابراین عبارت «منع مطلق برای هر تک‌دوز» یا «افزایش اثبات‌شدهٔ خطر در همهٔ موارد» دقیق نیست. این سناریو بازبینی‌نشده است و جایگزین ارزیابی بالینی، اطلاعات محصول یا راهنمای جاری نیست.',
      en: 'Healthdirect advises pregnant people to speak with a doctor or pharmacist before starting treatment and to avoid fluconazole unless advised by a doctor. MotherSafe NSW prefers vaginal treatment but considers oral fluconazole a possible second-line option after the first trimester if topical treatment fails or is not tolerated; it also says applicators may be used with care. The TGA database notes reports involving 150 mg in the first trimester and concerns with repeated high doses. Therefore, “absolutely contraindicated for every single dose” or “proven increased risk in every case” is not accurate. This scenario remains unreviewed and does not replace clinical assessment, product information, or current guidance.',
    },
  };
  sc.aussieContext = {
    ...sc.aussieContext,
    referenceScope: 'mixed',
    fa: 'در بارداری، تشخیص برفک را پیش از درمان با پزشک/ماما تأیید کنید. Healthdirect درمان موضعی کلوتریمازول یا نیستاتین را ذکر می‌کند و توصیه می‌کند فلوکونازول فقط با توصیهٔ پزشک مصرف شود. MotherSafe NSW درمان واژینال را ترجیح می‌دهد و فلوکونازول خوراکی را پس از سه‌ماههٔ اول، در صورت شکست یا عدم تحمل درمان موضعی، خط دوم می‌داند. اپلیکاتور واژینال با احتیاط قابل استفاده است؛ محدودیت‌های نامستند را به شکل منع مطلق آموزش ندهید.',
    en: 'In pregnancy, confirm the diagnosis with a doctor or midwife before treatment. Healthdirect lists topical clotrimazole or nystatin and advises using fluconazole only if a doctor recommends it. MotherSafe NSW prefers vaginal treatment and considers oral fluconazole second line after the first trimester if topical treatment fails or is not tolerated. Vaginal applicators may be used with care; do not teach unsupported absolute restrictions.',
    adminRule: {
      fa: 'این پرونده مربوط به بیمار باردار ۱۴ هفته‌ای با نخستین بروز علائم است؛ تشخیص ممکن است به معاینه یا سواب نیاز داشته باشد. پیش از شروع درمان به GP یا ماما ارجاع دهید. از راهنمای جاری محصول و الزامات محلی پیروی کنید و وضعیت Schedule 3 را جایگزین ارزیابی بارداری و تشخیص ندانید.',
      en: 'This case concerns a 14-week pregnant patient with a first episode; diagnosis may require examination or a swab. Refer to a GP or midwife before treatment. Follow current product guidance and local requirements; Schedule 3 status does not replace pregnancy assessment or diagnostic review.',
    },
    keyPhrases: [
      { phrase: 'Vulvovaginal candidiasis', meaningFa: 'کاندیدیازیس واژینال؛ علائم به‌تنهایی تشخیص را در نخستین بروز قطعی نمی‌کند.', meaningEn: 'Symptoms alone do not confirm the diagnosis in a first episode.' },
      { phrase: 'Second-line treatment', meaningFa: 'گزینهٔ درمانی بعدی در شرایط مشخص، نه انتخاب خودکار یا خوددرمانی.', meaningEn: 'A later option in specific circumstances, not an automatic choice or self-treatment.' },
    ],
    officialReferences: [
      {
        title: { fa: 'MotherSafe NSW: برفک واژینال در بارداری (ژوئیهٔ ۲۰۲۴)', en: 'MotherSafe NSW: Thrush in pregnancy (July 2024)' },
        url: 'https://www.seslhd.health.nsw.gov.au/sites/default/files/groups/Royal_Hospital_for_Women/Mothersafe/documents/Factsheets/ThrushinPregnancyJuly152024.pdf',
      },
      {
        title: { fa: 'Healthdirect Australia: برفک واژینال (بازبینی نوامبر ۲۰۲۵)', en: 'Healthdirect Australia: Vaginal thrush (reviewed November 2025)' },
        url: 'https://www.healthdirect.gov.au/vaginal-thrush',
      },
      {
        title: { fa: 'Healthdirect Australia: داروها در بارداری (بازبینی ژوئن ۲۰۲۴)', en: 'Healthdirect Australia: Medicines during pregnancy (reviewed June 2024)' },
        url: 'https://www.healthdirect.gov.au/medicines-during-pregnancy',
      },
      {
        title: { fa: 'TGA: پایگاه داروهای بارداری (به‌روزرسانی ۱۹ مهٔ ۲۰۲۶)', en: 'TGA: Prescribing medicines in pregnancy database (updated 19 May 2026)' },
        url: 'https://www.tga.gov.au/resources/health-professional-information-and-resources/australian-categorisation-system-prescribing-medicines-pregnancy/prescribing-medicines-pregnancy-database',
      },
    ],
  };
  return sc;
}

// 4.2 All 24 Clinical Scenarios
for (const sourceScenario of (CLINICAL_SCENARIOS || [])) {
  const sc = applyPseudoephedrineScenarioEditorialCorrection(
    applyChickenpoxEditorialCorrection(
      applyPregnancyThrushEditorialCorrection(applySafeScriptEditorialCorrection(sourceScenario)),
    ),
  );
  pharmacyPracticeScenarios.push(buildPracticeScenarioEntry(sc, 'clinical'));
  const docId = `doc-scenario-clinical-${sc.id}`;
  const title = `تریاژ بالینی: ${sc.title?.fa || sc.id}`;
  const titleEn = `Clinical Triage: ${sc.title?.en || sc.id}`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-clinical',
    title,
    title_en: titleEn,
    content_html: `${renderScenarioHtml(sc, { isPrimaryFa: true })}${['s3-pseudoephedrine', 's3-pseudoephedrine-conflict'].includes(sc.id) ? renderPseudoephedrineReferenceSection('fa') : ''}`,
    content_en: `${renderScenarioHtml(sc, { isPrimaryFa: false })}${['s3-pseudoephedrine', 's3-pseudoephedrine-conflict'].includes(sc.id) ? renderPseudoephedrineReferenceSection('en') : ''}`,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Clinical Triage', 'Emergency Case', sc.category?.en || 'Triage', 'Bilingual Triage']
  });
}

function applyActiveScriptListEditorialCorrection(sourceScenario) {
  if (sourceScenario.id !== 'admin-lost-escript-mysl') return sourceScenario;

  // Retain the Pharmacy source and stable IDs; clarify ASL eligibility,
  // identity and consent using current Australian Government guidance.
  const sc = JSON.parse(JSON.stringify(sourceScenario));
  sc.title = {
    fa: 'A1. توکن نسخهٔ الکترونیک گم‌شده: مسیر ASL/MySL و بازیابی',
    en: 'A1. Lost eScript Token: ASL/MySL Eligibility & Recovery',
  };
  sc.whatQuestions = [
    {
      key: 'W',
      label: { fa: 'W - هویت و ثبت‌نام ASL؟', en: 'W - Identity and ASL registration?' },
      question: {
        fa: 'طبق روند احراز هویت داروخانه، آیا قبلاً برای Active Script List (ASL/MySL) ثبت‌نام کرده‌اید؟',
        en: 'After we verify your identity under pharmacy policy, have you already registered for an Active Script List (ASL/MySL)?',
      },
      answer: {
        fa: 'کارت مدیکر و مدرک شناسایی دارم، اما تا حالا فقط توکن‌ها را با پیامک گرفته‌ام و مطمئن نیستم ASL داشته باشم.',
        en: 'I have my Medicare card and photo ID, but I have only received prescription tokens by SMS and do not think I have registered for an ASL.',
      },
    },
    (sc.whatQuestions || []).find(question => question.key === 'H'),
    {
      key: 'A',
      label: { fa: 'A - دسترسی قبلی داروخانه به ASL؟', en: 'A - Has this pharmacy been granted ASL access?' },
      question: {
        fa: 'اگر ASL دارید، آیا قبلاً این داروخانه را برای دسترسی انتخاب کرده‌اید یا درخواست دسترسی جدید را در برنامه تأیید کرده‌اید؟',
        en: 'If you have an ASL, has this pharmacy already been granted access, or have you confirmed a new access request in the system?',
      },
      answer: {
        fa: 'فکر نمی‌کنم ASL ثبت‌نام کرده باشم و درخواست دسترسی پیامکی یا ایمیلی را هم تأیید نکرده‌ام.',
        en: 'I do not think I have an ASL, and I have not confirmed an access request by SMS or email.',
      },
    },
    {
      key: 'T',
      label: { fa: 'T - توکن اصلی یا تکرار نسخه؟', en: 'T - Original or repeat token?' },
      question: {
        fa: 'این توکن مربوط به نسخهٔ اصلیِ تازه‌صادرشده است یا توکن تکراری که داروخانه‌ای قبلاً صادر کرده؟',
        en: 'Is this the original token for a newly issued prescription, or a repeat token previously issued by a pharmacy?',
      },
      answer: {
        fa: 'نسخهٔ اصلی را پزشکم همین امروز صادر کرد؛ تکرار نسخه نیست.',
        en: 'My GP issued the original prescription this morning; it is not a repeat.',
      },
    },
  ];
  sc.redFlags = [
    {
      fa: 'باز کردن ASL پیش از احراز هویت مصرف‌کننده و تأیید ثبت‌نام/دسترسی مجاز و رضایت لازم در workflow نرم‌افزار.',
      en: 'Opening an ASL before identity checks and confirmation of registration, authorised access and required consent in the dispensing-software workflow.',
    },
    {
      fa: 'فرض اینکه هر توکن پیامکیِ حذف‌شده، حتی بدون ثبت‌نام ASL، خودکار در MySL قابل بازیابی است.',
      en: 'Assuming every deleted SMS token is automatically retrievable in MySL even when the consumer is not registered for an ASL.',
    },
    {
      fa: 'دیسپنس پیش از بازیابی واقعی، اعتبارسنجی نسخه و بررسی الزامات مرتبط.',
      en: 'Dispensing before the prescription is retrieved, validated and checked against applicable requirements.',
    },
  ];
  sc.dialogueOptions = (sc.dialogueOptions || []).map(option => {
    if (option.id === 'a1_opt1') return {
      ...option,
      patientReply: {
        fa: 'متوجه شدم. می‌توانید اول بررسی کنید آیا برای ASL ثبت‌نام کرده‌ام و داروخانه به فهرستم دسترسی مجاز دارد؟ اگر نه، برای همین نسخه چه راهی دارم؟',
        en: 'I understand. Could you first check whether I am registered for an ASL and whether your pharmacy has authorised access? If not, what can I do for this prescription?',
      },
    };
    if (option.id !== 'a1_opt2') return option;
    return {
    ...option,
    text: {
      fa: 'مسیر درست را بدون وعدهٔ بازیابی خودکار توضیح دهید: ۱) ابتدا هویت بیمار را طبق سیاست جاری داروخانه احراز کنید. ASL/MySL فقط وقتی جای توکن را می‌گیرد که مصرف‌کننده برای ASL ثبت شده و نسخهٔ فعالِ واجدشرایط در آن قابل مشاهده باشد. ۲) اگر ASL ثبت است و داروخانه قبلاً دسترسی مجاز دارد، جزئیات نسخه را از نرم‌افزار دیسپنسینگ بررسی کنید. اگر دسترسی ندارید، درخواست دسترسی را از workflow نرم‌افزار ارسال کنید و فقط پس از تأیید رضایت مصرف‌کننده از مسیر پیامک/ایمیل و اعطای دسترسی، فهرست را باز کنید. رضایت شفاهی به‌تنهایی جای این تأیید سامانه‌ای را نمی‌گیرد. ۳) اگر بیمار ASL ندارد—همان‌طور که در این پرونده می‌گوید—فرض نکنید توکن پیامکیِ حذف‌شده اکنون در MySL قابل بازیابی است. برای توکن نسخهٔ اصلیِ گم‌شده، با نسخه‌نویس تماس بگیرید تا توکن را دوباره ارسال کند؛ برای توکن تکرار، با داروخانهٔ صادرکننده تماس بگیرید. ۴) می‌توانید برای آینده، در صورت تمایل بیمار، ثبت‌نام ASL را از راه نرم‌افزار و با احراز هویت، دریافت/تأیید IHI از HI Service و رضایت‌های لازم توضیح دهید؛ ثبت‌نام یا دسترسی را کامل‌شده فرض نکنید. نسخه را فقط پس از بازیابی و اعتبارسنجی واقعی و رعایت مقررات مرتبط دیسپنس کنید.',
      en: 'Explain the correct path without promising automatic recovery: 1) First verify the consumer’s identity under current pharmacy policy. ASL/MySL replaces the need to present a token only when the consumer is registered for an ASL and the active prescription is available there. 2) If an ASL is already registered and this pharmacy has authorised access, check the prescription in the dispensing software. If access is not already granted, request it through the software workflow and open the list only after the consumer confirms consent through the required SMS/email process and access is granted; verbal consent alone does not replace this system confirmation. 3) This patient says they do not have an ASL, so do not assume the deleted SMS token is now retrievable from MySL. For a lost token for an original prescription, contact the prescriber to resend it; for a repeat token, contact the pharmacy that issued it. 4) If the patient wishes, explain assisted ASL registration for future use. The dispensing software must complete the identity, IHI/HI Service and consent steps; do not imply registration or access is already complete. Dispense only after the prescription has actually been retrieved and validated and all applicable requirements are met.',
    },
    patientReply: {
      fa: 'متوجه شدم. لطفاً برای همین نسخه با پزشکم تماس بگیرید و اگر بخواهم، مراحل ثبت‌نام ASL را هم برای دفعات بعد توضیح دهید.',
      en: 'I understand. Please contact my GP about this prescription, and explain ASL registration for future prescriptions if I choose to use it.',
    },
    };
  });
  sc.clinicalOutcome = {
    ...sc.clinicalOutcome,
    headline: { fa: 'اول مسیر بازیابی را تأیید کنید', en: 'Confirm the recovery pathway first' },
    recommendation: {
      fa: 'برای این نسخهٔ اصلیِ فاقد توکن، با نسخه‌نویس تماس بگیرید؛ ASL را فقط پس از تأیید ثبت‌نام، هویت و دسترسی مجاز بررسی کنید. پیش از بازیابی و اعتبارسنجی نسخه، دیسپنس نکنید.',
      en: 'For this original prescription with no token and no registered ASL, contact the prescriber. Use ASL only after confirming registration, identity and authorised access. Do not dispense until the prescription is retrieved and validated.',
    },
    explanation: {
      fa: 'راهنمای ADHA می‌گوید ASL یک راهکار مدیریت توکن است. دسترسی به نسخهٔ فعال به ثبت ASL و دسترسی/رضایت لازم وابسته است؛ اگر دسترسی جدید درخواست شود، مصرف‌کننده باید تأیید پیامکی/ایمیلی مقرر را انجام دهد. راهنمای مصرف‌کننده برای توکنِ نسخهٔ اصلیِ گم‌شده، تماس با نسخه‌نویس و برای توکن تکرار، تماس با داروخانهٔ صادرکننده را پیشنهاد می‌کند. این سناریو بازبینی‌نشده است و جایگزین راهنمای نرم‌افزار، سیاست محل کار یا مقررات جاری نیست.',
      en: 'ADHA describes an ASL as a token-management solution. Access to an active prescription depends on ASL registration and the required access/consent; if new access is requested, the consumer must complete the required SMS/email confirmation. ADHA consumer guidance says to contact the prescriber for a lost original token and the issuing pharmacy for a lost repeat token. This scenario remains unreviewed and does not replace dispensing-software guidance, workplace policy or current requirements.',
    },
  };
  sc.aussieContext = {
    ...sc.aussieContext,
    fa: 'Active Script List (ASL/MySL) راهکار مدیریت توکن‌های نسخه‌های الکترونیک فعال است، نه فهرستی که هر نسخهٔ پیامکیِ گم‌شده را بدون ثبت‌نام و دسترسی مجاز خودکار بازیابی کند. هویت، ثبت ASL، دسترسی و رضایت لازم باید از طریق workflow نرم‌افزار بررسی شود.',
    en: 'An Active Script List (ASL/MySL) is a token-management solution for eligible active ePrescriptions, not a universal lookup that automatically recovers every lost SMS token. Verify identity, ASL registration, access and required consent through the dispensing-software workflow.',
    adminRule: {
      fa: 'برای ASL موجود، هویت بیمار را طبق سیاست جاری بررسی کنید؛ اگر دسترسی داروخانه موجود نیست، از نرم‌افزار درخواست دهید و تا تأیید رضایت مصرف‌کننده در workflow مقرر پیامکی/ایمیلی، به فهرست دسترسی نگیرید. ثبت‌نام ASL از مسیر جداگانهٔ احراز هویت و IHI/HI Service می‌گذرد. توکن اصلیِ گم‌شده: نسخه‌نویس؛ توکن تکرار: داروخانهٔ صادرکننده. قبل از بازیابی/اعتبارسنجی نسخه، وعدهٔ دیسپنس ندهید.',
      en: 'For an existing ASL, verify the consumer under current identity policy. If pharmacy access is not already granted, request it in the dispensing software and do not access the list until the required consumer SMS/email consent is confirmed. ASL registration is a separate identity and IHI/HI Service workflow. Lost original token: contact the prescriber; lost repeat token: contact the issuing pharmacy. Do not promise dispensing before retrieval and validation.',
    },
    keyPhrases: [
      { phrase: 'Active Script List (ASL/MySL)', meaningFa: 'فهرست/راهکار مدیریت توکن نسخه‌های الکترونیک فعال؛ ثبت‌نام و اعطای دسترسی لازم است.', meaningEn: 'A token-management list for active ePrescriptions; registration and authorised access are required.' },
      { phrase: 'IHI (Individual Healthcare Identifier)', meaningFa: 'شناسهٔ سلامت یکتای فرد؛ نرم‌افزار ثبت ASL آن را از HI Service دریافت یا تأیید می‌کند. خود شمارهٔ IHI همان شمارهٔ کارت Medicare نیست.', meaningEn: 'A unique healthcare identifier obtained or verified through the HI Service in the ASL registration workflow; it is not the Medicare card number itself.' },
      { phrase: 'eScript token', meaningFa: 'توکنِ ارائه‌شده با پیامک/ایمیل برای دسترسی به نسخه؛ برای توکن اصلیِ گم‌شده با نسخه‌نویس و برای تکرار با داروخانهٔ صادرکننده پیگیری کنید.', meaningEn: 'A token delivered by SMS/email to access an ePrescription; contact the prescriber for a lost original token or the issuing pharmacy for a lost repeat.' },
    ],
    officialReferences: [
      {
        title: { fa: 'راهنمای ADHA برای دیسپنسرها: توکن نسخه و ASL', en: 'ADHA: Electronic prescribing for dispensers' },
        url: 'https://www.digitalhealth.gov.au/healthcare-providers/initiatives-and-programs/electronic-prescribing/for-dispensers',
      },
      {
        title: { fa: 'راهنمای مصرف‌کننده: نسخهٔ الکترونیک و توکن گم‌شده', en: 'ADHA: Electronic prescriptions and lost tokens' },
        url: 'https://www.digitalhealth.gov.au/initiatives-and-programs/electronic-prescriptions',
      },
      {
        title: { fa: 'چارچوب حریم خصوصی ASL، نسخه‌های ۱ و ۲', en: 'Australian Government: Active Script List Privacy Framework' },
        url: 'https://www.health.gov.au/sites/default/files/2025-08/electronic-prescribing-active-script-list-privacy-framework.pdf',
      },
    ],
  };
  return sc;
}

// 4.3 4 Admin Scenarios
for (const sourceScenario of (ADMIN_SCENARIOS || [])) {
  const sc = applyActiveScriptListEditorialCorrection(sourceScenario);
  pharmacyPracticeScenarios.push(buildPracticeScenarioEntry(sc, 'admin'));
  const docId = `doc-scenario-admin-${sc.id}`;
  const title = `قوانین نسخه و بیمه: ${sc.title?.fa || sc.id}`;
  const titleEn = `Administrative Script Case: ${sc.title?.en || sc.id}`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-admin',
    title,
    title_en: titleEn,
    content_html: renderScenarioHtml(sc, { isPrimaryFa: true }),
    content_en: renderScenarioHtml(sc, { isPrimaryFa: false }),
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Script Law', 'PBS Insurance', 'Administrative', 'Bilingual Triage']
  });
}

// 4.4 6 Realistic Dispensing Dilemmas + 7 Australian Script Formats (13 docs)
for (const script of (REALISTIC_SCRIPTS_DATABASE || [])) {
  const docId = `doc-script-case-${script.id}`;
  const title = `چالش قانونی و دیسپنسینگ: ${script.title_fa || script.title_en}`;
  const titleEn = `Dispensing Dilemma: ${script.title_en}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-xs font-bold text-purple-600 dark:text-purple-400 mb-1">پرونده واقعی نسخه و چالش قانونی داروخانه:</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(script.title_fa)}</div>
    <div class="text-xs text-muted-foreground mt-0.5" dir="ltr">${escapeHtml(script.title_en)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">شرح نسخه و درخواست بیمار:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(script.scenario_narrative_fa || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">⚠️ خطای تجویز یا ابهام قانونی (Clinical &amp; Legal Red Flag):</div>
    <p class="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">${escapeHtml(script.dilemma_description_fa || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
    <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">✅ اقدام الزامی و مداخله داروساز (Pharmacist Action):</div>
    <p class="text-xs text-foreground leading-relaxed">${escapeHtml(script.correct_action_fa || '')}</p>
  </div>
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-purple-500/10 border border-purple-500/25">
    <div class="text-base font-bold text-foreground">${escapeHtml(script.title_en)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">Dispensing Narrative:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(script.scenario_narrative_en || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25 space-y-1.5">
    <div class="text-xs font-bold text-rose-600 dark:text-rose-400">Prescription Dilemma / Red Flag:</div>
    <p class="text-xs text-rose-700 dark:text-rose-300 leading-relaxed">${escapeHtml(script.dilemma_description_en || '')}</p>
  </div>

  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 space-y-1.5">
    <div class="text-xs font-bold text-emerald-700 dark:text-emerald-400">Correct Pharmacist Intervention:</div>
    <p class="text-xs text-foreground leading-relaxed">${escapeHtml(script.correct_action_en || '')}</p>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-scripts',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['PBS Script', 'Dispensing Dilemma', 'Legal Practice']
  });
}

for (const st of (AUSTRALIAN_SCRIPT_TYPES_DATA || [])) {
  const docId = `doc-script-type-${st.id}`;
  const title = `راهنمای فرم نسخه: ${st.title_fa}`;
  const titleEn = `Script Template: ${st.title_en}`;

  const htmlFa = `
<div class="knowledge-card space-y-6 text-right" dir="rtl">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-1">فرمت نسخه رسمی استرالیا (PBS / State Regulation):</div>
    <div class="text-base font-bold text-foreground">${escapeHtml(st.title_fa)} | <span class="font-mono text-primary">${escapeHtml(st.badge)}</span></div>
    <div class="text-xs text-muted-foreground mt-0.5" dir="ltr">${escapeHtml(st.title_en)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">خلاصه مقررات و اعتبار قانونی:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(st.short_summary_fa || '')}</p>
    <div class="text-xs text-primary font-bold">مدت اعتبار قانونی: ${escapeHtml(st.legal_expiry_months)} ماه</div>
  </div>

  ${st.hotspots && st.hotspots.length > 0 ? `
  <div class="space-y-2">
    <div class="text-xs font-bold text-foreground">نقاط کلیدی بررسی اعتبار قانونی توسط داروساز:</div>
    <div class="space-y-2 text-xs">
      ${st.hotspots.map(hs => `
      <div class="p-3 rounded-xl bg-background border border-border space-y-1">
        <div class="font-bold text-primary flex items-center justify-between">
          <span>${escapeHtml(hs.title_fa)}</span>
          <span class="text-[10px] font-mono text-muted-foreground">${escapeHtml(hs.type)}</span>
        </div>
        <p class="text-muted-foreground">${escapeHtml(hs.summary_fa)}</p>
      </div>`).join('')}
    </div>
  </div>` : ''}
</div>`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/25">
    <div class="text-base font-bold text-foreground">${escapeHtml(st.title_en)}</div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/40 border border-border space-y-2">
    <div class="text-xs font-bold text-foreground">Legal Expiry &amp; PBS Guidelines:</div>
    <p class="text-xs text-foreground/90 leading-relaxed">${escapeHtml(st.short_summary_en || '')}</p>
    <div class="text-xs text-primary font-bold">Validity Period: ${escapeHtml(st.legal_expiry_months)} months</div>
  </div>
</div>`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-scripts',
    title,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['PBS Script', 'Script Form', st.badge || 'Format']
  });
}

console.log(`Generated 32 Scenarios + 13 Scripts in Pillar 4`);

// =========================================================================
// SECTION 5: 36 ACADEMIC MODULE LESSONS (Mapped to 3 Module Subfolders)
// =========================================================================

for (const sourceCard of (ALL_PHARMACY_CARDS || [])) {
  const card = applyPseudoephedrineModuleEditorialCorrection(sourceCard);
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
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      <span>💡</span>
      <span>نکته کلیدی و مروارید اجرایی داروساز (Action Pearl):</span>
    </div>
    <p class="text-xs font-semibold text-foreground leading-relaxed">${escapeHtml(pearlFa)}</p>
  </div>` : ''}

  ${detailsHtmlFa ? `<div class="prose dark:prose-invert max-w-none text-xs leading-relaxed">${detailsHtmlFa}</div>` : ''}
</div>${['m2-sec3', 'm3-sec2'].includes(card.id) ? renderPseudoephedrineReferenceSection('fa') : ''}`;

  const htmlEn = `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-sky-500/10 border border-sky-500/25">
    <div class="text-xs font-bold text-sky-600 dark:text-sky-400 mb-1">Module ${escapeHtml(modNum)}: ${escapeHtml(categoryEn)}</div>
    <div class="text-sm font-bold text-foreground">${escapeHtml(titleEn)}</div>
  </div>

  ${pearlEn ? `
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400">💡 Action Pearl:</div>
    <p class="text-xs font-semibold text-foreground leading-relaxed">${escapeHtml(pearlEn)}</p>
  </div>` : ''}

  ${detailsHtmlEn ? `<div class="prose dark:prose-invert max-w-none text-xs leading-relaxed">${detailsHtmlEn}</div>` : ''}
</div>${['m2-sec3', 'm3-sec2'].includes(card.id) ? renderPseudoephedrineReferenceSection('en') : ''}`;

  documents.push({
    id: docId,
    folder_id: modFolder,
    title: titleFa,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: [`Module ${modNum}`, categoryEn, 'Academic Lesson']
  });
}

console.log(`Generated ${ALL_PHARMACY_CARDS.length} Module Lessons in Pillar 5`);

// =========================================================================
// SECTION 6: SOURCE COLLECTIONS OMITTED BY THE FIRST CONVERSION
// =========================================================================

const sourceLabels = {
  id: ['شناسه', 'ID'],
  title: ['عنوان', 'Title'],
  subtitle: ['زیرعنوان', 'Subtitle'],
  description: ['توضیح', 'Description'],
  name: ['نام', 'Name'],
  categoryId: ['شناسهٔ دسته‌بندی', 'Category ID'],
  moduleId: ['شناسهٔ درس', 'Module ID'],
  conceptIds: ['شناسه‌های مفهوم مرتبط', 'Related concept IDs'],
  synonyms: ['نام‌ها و کلیدواژه‌های مرتبط', 'Related names and keywords'],
  text: ['متن', 'Text'],
  question: ['پرسش', 'Question'],
  correctOptionId: ['شناسهٔ گزینهٔ درست', 'Correct option ID'],
  overview: ['نمای کلی', 'Overview'],
  pathophysiology: ['پاتوفیزیولوژی و نشانه‌ها', 'Pathophysiology & symptoms'],
  treatment: ['درمان', 'Treatment'],
  firstLine: ['درمان خط اول', 'First-line treatment'],
  dosing: ['مقدار و روش مصرف', 'Dose and directions'],
  brandExamples: ['نمونه‌های نام تجاری', 'Brand examples'],
  pregnancySafety: ['ایمنی در بارداری', 'Pregnancy safety'],
  breastfeedingSafety: ['ایمنی در شیردهی', 'Breastfeeding safety'],
  minAge: ['حداقل سن', 'Minimum age'],
  extraInfo: ['اطلاعات تکمیلی', 'Additional information'],
  otcOptions: ['گزینه‌های بدون نسخه', 'OTC options'],
  rxOptions: ['گزینه‌های نسخه‌ای', 'Prescription options'],
  instructions: ['دستورالعمل و مشاوره', 'Instructions & counselling'],
  redFlags: ['علائم هشدار', 'Red flags'],
  medicines: ['داروها', 'Medicines'],
  nonPharmAdvice: ['مراقبت غیردارویی', 'Non-pharmacological advice'],
  clinicalNotes: ['نکات بالینی', 'Clinical notes'],
  clinicalRelevance: ['کاربرد بالینی', 'Clinical relevance'],
  actionClassification: ['رده‌بندی عملکرد', 'Action classification'],
  actionTypeLabel: ['نوع اثر', 'Action type'],
  cellularEffect: ['اثر سلولی', 'Cellular effect'],
  targetSite: ['محل اثر', 'Target site'],
  className: ['نام ردهٔ دارویی', 'Class name'],
  classCode: ['شناسهٔ ردهٔ دارویی', 'Class code'],
  colorClass: ['ردهٔ رنگ', 'Color class'],
  badge: ['برچسب', 'Badge'],
  badgeColor: ['رنگ برچسب', 'Badge color'],
  iconName: ['نام آیکون', 'Icon name'],
  iconType: ['نوع آیکون', 'Icon type'],
  primaryModule: ['درس اصلی', 'Primary module'],
  trackNumber: ['شمارهٔ مسیر', 'Track number'],
  currentMedicines: ['داروهای فعلی', 'Current medicines'],
  suggestedAction: ['اقدام پیشنهادی', 'Suggested action'],
  to: ['گیرنده', 'To'],
  reason: ['دلیل', 'Reason'],
  summary: ['خلاصه', 'Summary'],
  relatedShelfProducts: ['محصولات مرتبط', 'Related shelf products'],
  subcategories: ['زیرگروه‌ها', 'Subcategories'],
  clinicalPearls: ['نکات بالینی', 'Clinical pearls'],
  schedulingRules: ['قوانین طبقه‌بندی و عرضه', 'Scheduling rules'],
  targetFocus: ['هدف یادگیری', 'Learning focus'],
  targetItemIds: ['شناسهٔ مطالب مرتبط', 'Related study items'],
  milestones: ['مراحل یادگیری', 'Milestones'],
  options: ['گزینه‌ها', 'Options'],
  explanation: ['توضیح پاسخ', 'Answer explanation'],
};

function sourceDocument({ id, folderId, titleFa, titleEn, data, sourceFile, tags, additionalHtml = {} }) {
  const render = (lang) => `<article class="knowledge-card mx-auto max-w-3xl space-y-5 text-sm leading-7" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">
    <header class="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h2 class="text-xl font-bold leading-8">${escapeHtml(lang === 'fa' ? titleFa : titleEn)}</h2>
      <p class="mt-2 text-xs text-muted-foreground" dir="ltr">Source: ${escapeHtml(sourceFile)}</p>
    </header>
    ${renderSourceValue(data, lang, sourceLabels)}${additionalHtml[lang] || ''}
  </article>`;
  documents.push({
    id, folder_id: folderId, title: titleFa, title_en: titleEn,
    content_html: render('fa'), content_en: render('en'),
    preferred_language: 'bilingual', direction: 'rtl', tags,
    source_url: `https://github.com/hamedharami-hub/pharmacy/blob/${sourceCommit}/${sourceFile}`
  });
}

for (const mechanism of drugMechanismsList) {
  const mechanismId = String(mechanism.classCode || mechanism.id || 'unknown')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-');
  sourceDocument({
    // Product monographs already link to this stable class-code document ID.
    id: `doc-mechanism-${mechanismId}`,
    folderId: 'folder-pharm-mechanisms',
    titleFa: mechanism.classNameFa || mechanism.classNameEn || mechanismId,
    titleEn: mechanism.classNameEn || mechanism.classNameFa || mechanismId,
    data: mechanism,
    sourceFile: 'data/mechanismsRegistry.ts',
    tags: ['Pharmacology', 'Mechanism', mechanism.classCode || mechanismId],
  });
}

for (const disease of CORE_CLINICAL_DISEASES) {
  sourceDocument({
    id: `doc-core-disease-${disease.id}`,
    folderId: 'folder-clinical-core',
    titleFa: disease.name?.fa || disease.id,
    titleEn: disease.name?.en || disease.id,
    data: disease,
    sourceFile: 'data/diseasesRegistry.ts',
    tags: ['Core Clinical', disease.categoryId || 'Disease']
  });
}
for (const sourceDomain of CLINICAL_DOMAINS) {
  const domain = applyPseudoephedrineDomainEditorialCorrection(sourceDomain);
  sourceDocument({
    id: `doc-clinical-domain-${domain.id}`,
    folderId: 'folder-mono-domains',
    titleFa: domain.titleFa || domain.id,
    titleEn: domain.titleEn || domain.id,
    data: domain,
    sourceFile: 'data/shelf/clinicalDomains.ts',
    additionalHtml: (domain.subcategories || []).some(subcategory => subcategory.id === 'sub-1-4')
      ? { fa: renderPseudoephedrineReferenceSection('fa'), en: renderPseudoephedrineReferenceSection('en') }
      : {},
    tags: ['Clinical Domain', domain.badgeEn || 'Shelf']
  });
}
for (const track of STUDY_TRACKS_DATABASE) {
  sourceDocument({
    id: `doc-study-track-${track.id}`,
    folderId: 'folder-learning-tracks',
    titleFa: track.title?.fa || track.id,
    titleEn: track.title?.en || track.id,
    data: track,
    sourceFile: 'data/studyTracksData.ts',
    tags: ['Study Track', `Module ${track.primaryModule || ''}`]
  });
}
for (const question of SAMPLE_QUIZ_QUESTIONS) {
  sourceDocument({
    id: `doc-practice-question-${question.id}`,
    folderId: 'folder-learning-quizzes',
    titleFa: question.question?.fa || question.id,
    titleEn: question.question?.en || question.id,
    data: question,
    sourceFile: 'lib/pharmacy-data.ts',
    tags: ['Practice Question', question.moduleId || 'Quiz']
  });
}
console.log(`Generated ${CORE_CLINICAL_DISEASES.length} core diseases, ${CLINICAL_DOMAINS.length} domains, ${STUDY_TRACKS_DATABASE.length} study tracks and ${SAMPLE_QUIZ_QUESTIONS.length} questions`);

// =========================================================================
// SECTION 7: CURATED HIGH-YIELD LEITNER CARDS (35 items)
// =========================================================================

function extractText(val) {
  if (!val) return '';
  if (typeof val === 'string') return val;
  if (typeof val === 'object') {
    if (val.fa && val.en) return `${val.fa} (${val.en})`;
    if (val.fa) return val.fa;
    if (val.en) return val.en;
    return JSON.stringify(val);
  }
  return String(val);
}

const cards = (INITIAL_SAMPLE_LEITNER_CARDS || [])
  .map(applyPseudoephedrineLeitnerEditorialCorrection)
  .map((card, idx) => ({
  id: `card-pharmacy-${card.id || idx + 1}`,
  user_id: 'guest',
  front: extractText(card.front || card.question || card.title || `Flashcard ${idx + 1}`),
  back: extractText(card.back || card.answer || card.pearl || ''),
  clue: extractText(card.clue || card.topic || 'Pharmacy Pearl'),
  document_id: card.documentId || null,
  folder_id: PHARMACY_ROOT_FOLDER_ID,
  box: 1,
  next_review_at: '2026-03-20T00:00:00.000Z',
  last_reviewed_at: null,
  review_count: 0,
  lapse_count: 0,
  interval_days: 1,
  ease_factor: 2.5,
  created_at: '2026-03-20T00:00:00.000Z',
  updated_at: '2026-03-20T00:00:00.000Z'
}));

// Add rich clinical flashcards from diseases
const diseaseCards = handbookDiseases.slice(0, 28).map((hb, idx) => {
  const trans = OTC_CLINICAL_TRANSLATIONS ? OTC_CLINICAL_TRANSLATIONS[hb.id] : null;
  const cleanFa = trans?.cleanFaName || hb.condition;
  const cleanEn = trans?.cleanEnName || hb.condition;
  const fl = trans?.firstLine;

  const front = `خط اول درمان OTC برای «${cleanFa}» (${cleanEn}) چیست؟`;
  const back = fl
    ? `داروی خط اول: ${fl.drugNameFa} (${fl.drugNameEn})\nدوز: ${fl.dosingFa}\nنکته مهم: ${fl.keyWarningsFa}`
    : `درمان‌های استاندارد OTC: ${hb.medicines?.map(m => m.name).join('، ') || 'مشاوره داروساز'}`;

  return {
    id: `card-disease-${hb.id}`,
    user_id: 'guest',
    front,
    back,
    clue: cleanEn,
    document_id: `doc-disease-${hb.id}`,
    folder_id: diseaseCategoryMap[hb.id] || 'folder-clinical-derma',
    box: 1,
    next_review_at: '2026-03-20T00:00:00.000Z',
    last_reviewed_at: null,
    review_count: 0,
    lapse_count: 0,
    interval_days: 1,
    ease_factor: 2.5,
    created_at: '2026-03-20T00:00:00.000Z',
    updated_at: '2026-03-20T00:00:00.000Z'
  };
});

const finalCards = [...cards, ...diseaseCards];

const finalizedFolders = PHARMACY_FOLDERS.map((f, idx) => ({
  id: f.id,
  user_id: 'guest',
  parent_id: f.parent_id,
  name: f.name,
  icon: f.icon || 'Folder',
  color: f.color || '#6366f1',
  position: f.position ?? idx + 1,
  created_at: '2026-03-20T00:00:00.000Z',
  updated_at: '2026-03-20T00:00:00.000Z'
}));

function sourceFileForDocument(document) {
  const { id } = document;
  if (id.startsWith('doc-disease-')) return handbookSourceFileById.get(id.slice('doc-disease-'.length));
  if (id.startsWith('doc-product-')) return 'data/shelf/shelfProducts.ts';
  if (id.startsWith('doc-concept-')) return 'data/shelf/clinicalConcepts.ts';
  if (id.startsWith('doc-scenario-slang-')) return 'data/scenarios/slangScenarios.ts';
  if (id.startsWith('doc-scenario-clinical-')) return 'data/scenarios/clinicalScenarios.ts';
  if (id.startsWith('doc-scenario-admin-')) return 'data/scenarios/adminScenarios.ts';
  if (id.startsWith('doc-cal-')) return 'data/shelf/calLabels.ts';
  if (id.startsWith('doc-mechanism-sub-')) return 'data/mechanismsRegistry.ts';
  if (id.startsWith('doc-cyp-')) return 'data/cypInteractionsData.ts';
  if (id.startsWith('doc-storage-')) return 'data/shelf/stateStorageRules.ts';
  if (id.startsWith('doc-script-type-')) return 'data/scriptTypesData.ts';
  if (id.startsWith('doc-script-')) return 'data/realisticScriptsData.ts';
  if (/^doc-m[1-6]-/.test(id)) return 'lib/pharmacy-data.ts';
  return undefined;
}

const finalizedDocuments = documents.map(d => ({
  id: d.id,
  user_id: 'guest',
  folder_id: d.folder_id,
  title: d.title,
  title_en: d.title_en || d.title,
  content_html: d.content_html,
  content_en: d.content_en || '',
  preferred_language: d.preferred_language || 'bilingual',
  direction: d.direction || 'rtl',
  tags: d.tags || [],
  source_url: d.source_url || (() => {
    const sourceFile = sourceFileForDocument(d);
    if (!sourceFile) throw new Error(`Missing source provenance for ${d.id}`);
    if (!fs.existsSync(path.join(pharmacyDir, sourceFile))) throw new Error(`Missing source file ${sourceFile} for ${d.id}`);
    return `https://github.com/hamedharami-hub/pharmacy/blob/${sourceCommit}/${sourceFile}`;
  })(),
  content_review_status: 'unreviewed',
  created_at: '2026-03-20T00:00:00.000Z',
  updated_at: '2026-03-20T00:00:00.000Z'
}));

console.log(`Total Generated Documents: ${finalizedDocuments.length}`);
console.log(`Total Generated Flashcards: ${finalCards.length}`);
console.log(`Total Folders: ${finalizedFolders.length}`);

// Write out to src/lib/pharmacySeedData.ts
const code = `/**
 * Complete Australian Pharmacy Knowledge & Clinical Encyclopedia Seed Data
 * Auto-generated with complete interconnected graph across:
 * - 43 Clinical Diseases
 * - 121 Shelf Products & Brand Monographs
 * - 32 Triage Scenarios & Slang Dialogues
 * - 6 CYP Enzymes & 9 High-Stakes Pairs
 * - 14 Cellular Mechanisms
 * - 35 High-Yield Clinical Concepts & Toxicity Red Flags
 * - 22 APF Cautionary Advisory Labels (CAL Labels 1-22)
 * - 8 Australian State Storage Laws
 * - 13 Realistic PBS Scripts & Legal Dispensary Formats
 * - 36 Academic Module Lessons
 * - Core clinical diseases, domain guides, study tracks and questions
 */

import type { KnowledgeFolder, KnowledgeDocument } from './knowledgeTypes';
import type { LeitnerCard } from './leitnerTypes';

export { PHARMACY_ROOT_FOLDER_ID } from './pharmacyConstants';

export const PHARMACY_SEED_FOLDERS: KnowledgeFolder[] = ${JSON.stringify(finalizedFolders, null, 2)};

export const PHARMACY_SEED_DOCUMENTS: KnowledgeDocument[] = ${JSON.stringify(finalizedDocuments, null, 2)};

export const PHARMACY_SEED_CARDS: LeitnerCard[] = ${JSON.stringify(finalCards, null, 2)};
`;

fs.writeFileSync(path.join(targetDir, 'pharmacySeedData.ts'), code, 'utf8');
console.log('Successfully written to src/lib/pharmacySeedData.ts!');

const pharmacyProductCatalog = SHELF_PRODUCTS.map((product) => {
  const category = CLINICAL_DOMAINS.find((item) => item.id === product.categoryId);
  const subcategory = category?.subcategories.find((item) => item.id === product.subcategoryId);
  return {
    id: product.id,
    documentId: `doc-product-${product.id}`,
    brandName: product.brandName,
    genericName: product.genericName,
    activeIngredients: product.activeIngredients || '',
    packSize: product.packSize || '',
    schedule: product.schedule,
    categoryId: product.categoryId || null,
    categoryFa: category?.titleFa || '',
    categoryEn: category?.titleEn || '',
    subcategoryId: product.subcategoryId || null,
    subcategoryFa: subcategory?.titleFa || '',
    subcategoryEn: subcategory?.titleEn || '',
    sourceUrl: `https://github.com/hamedharami-hub/pharmacy/blob/${sourceCommit}/data/shelf/shelfProducts.ts`,
    contentReviewStatus: 'unreviewed',
  };
});

const productCatalogCode = `// Generated from Pharmacy main at ${sourceCommit}; do not edit by hand.
import type { PharmacyProductCatalogEntry } from './pharmacyProductCatalog';

export const PHARMACY_PRODUCT_CATALOG: PharmacyProductCatalogEntry[] = ${JSON.stringify(pharmacyProductCatalog, null, 2)};
`;
fs.writeFileSync(path.join(targetDir, 'pharmacyProductCatalogData.ts'), productCatalogCode, 'utf8');
console.log(`Successfully written ${pharmacyProductCatalog.length} metadata-only product index entries to src/lib/pharmacyProductCatalogData.ts!`);

if (pharmacyPracticeScenarios.length !== 32) {
  throw new Error(`Expected 32 Pharmacy practice scenarios, got ${pharmacyPracticeScenarios.length}`);
}
const scenarioIds = pharmacyPracticeScenarios.map((scenario) => scenario.id);
if (new Set(scenarioIds).size !== scenarioIds.length) throw new Error('Duplicate Pharmacy scenario IDs');

const scenarioPracticeCode = `// Generated from Pharmacy main at ${sourceCommit}; do not edit by hand.
import type { PharmacyPracticeScenario } from './pharmacyScenarioPractice';

export const PHARMACY_PRACTICE_SCENARIOS: PharmacyPracticeScenario[] = ${JSON.stringify(pharmacyPracticeScenarios, null, 2)};
`;
fs.writeFileSync(path.join(targetDir, 'pharmacyScenarioPracticeData.ts'), scenarioPracticeCode, 'utf8');
console.log(`Successfully written ${pharmacyPracticeScenarios.length} structured, unreviewed practice scenarios to src/lib/pharmacyScenarioPracticeData.ts!`);
