import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const pharmacyDir = process.env.PHARMACY_SOURCE_DIR || path.resolve(scriptDir, '../../pharmacy');
const targetDir = path.resolve(scriptDir, '../src/lib');
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
      if (found) return found;
    }
  }
  return null;
}

// =========================================================================
// SECTION 1: 43 CLINICAL DISEASES (With Linked Products & Scenarios)
// =========================================================================

for (const hb of handbookDiseases) {
  const trans = OTC_CLINICAL_TRANSLATIONS ? OTC_CLINICAL_TRANSLATIONS[hb.id] : null;
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
for (const [conceptId, concept] of Object.entries(CLINICAL_CONCEPTS_REGISTRY || {})) {
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
</div>`;

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
</div>`;

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
for (const p of (SHELF_PRODUCTS || [])) {
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
</div>`;

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
</div>`;

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
      ${sc.clinicalOutcome.requiresReferral ? '🚨 نیازمند ارجاع فوری به پزشک (Urgent GP/ED Referral)' : '✅ قابل مدیریت در داروخانه با داروی OTC (Manage in Pharmacy)'}
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
  </div>
</div>`;
  }

  // English Primary View
  return `
<div class="knowledge-card space-y-6 text-left" dir="ltr">
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/25">
    <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
      <span class="text-xs font-bold text-rose-600 dark:text-rose-400">👤 Pharmacy Patient Triage Case</span>
      <span class="text-[10px] px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 font-semibold font-mono">Bilingual Triage</span>
    </div>
    <div class="text-xs text-muted-foreground grid grid-cols-1 sm:grid-cols-3 gap-2">
      <div><strong>Patient Name:</strong> ${escapeHtml(sc.patientProfile?.name || 'Patient')}</div>
      <div><strong>Age:</strong> ${escapeHtml(sc.patientProfile?.age ? `${sc.patientProfile.age} yrs` : '-')}</div>
      <div><strong>Gender:</strong> ${escapeHtml(sc.patientProfile?.gender || '-')}</div>
    </div>
  </div>

  <div class="p-4 rounded-2xl bg-muted/30 border border-border space-y-3">
    <div class="flex items-center justify-between gap-2 border-b border-border/60 pb-2">
      <div class="text-xs font-bold text-foreground">🗣️ Patient Presentation &amp; Triage Dialogue</div>
      <span class="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">EN &amp; FA</span>
    </div>

    <div class="p-3.5 rounded-xl bg-background border border-rose-500/30 text-left font-sans shadow-2xs" dir="ltr">
      <p class="text-sm font-semibold text-foreground leading-relaxed italic">"${escapeHtml(presEn)}"</p>
    </div>

    <div class="p-3 rounded-xl bg-background/60 border border-border text-right" dir="rtl">
      <p class="text-sm text-foreground/90 leading-relaxed font-medium">«${escapeHtml(presFa)}»</p>
    </div>
  </div>
</div>`;
}

// 4.1 4 Slang Scenarios
for (const sc of (SLANG_SCENARIOS || [])) {
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

// 4.2 All 24 Clinical Scenarios
for (const sc of (CLINICAL_SCENARIOS || [])) {
  const docId = `doc-scenario-clinical-${sc.id}`;
  const title = `تریاژ بالینی: ${sc.title?.fa || sc.id}`;
  const titleEn = `Clinical Triage: ${sc.title?.en || sc.id}`;

  documents.push({
    id: docId,
    folder_id: 'folder-cases-clinical',
    title,
    title_en: titleEn,
    content_html: renderScenarioHtml(sc, { isPrimaryFa: true }),
    content_en: renderScenarioHtml(sc, { isPrimaryFa: false }),
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Clinical Triage', 'Emergency Case', sc.category?.en || 'Triage', 'Bilingual Triage']
  });
}

// 4.3 4 Admin Scenarios
for (const sc of (ADMIN_SCENARIOS || [])) {
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
  <div class="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-1">
    <div class="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
      <span>💡</span>
      <span>نکته کلیدی و مروارید اجرایی داروساز (Action Pearl):</span>
    </div>
    <p class="text-xs font-semibold text-foreground leading-relaxed">${escapeHtml(pearlFa)}</p>
  </div>` : ''}

  ${detailsHtmlFa ? `<div class="prose dark:prose-invert max-w-none text-xs leading-relaxed">${detailsHtmlFa}</div>` : ''}
</div>`;

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
</div>`;

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
  title: ['عنوان', 'Title'],
  subtitle: ['زیرعنوان', 'Subtitle'],
  description: ['توضیح', 'Description'],
  overview: ['نمای کلی', 'Overview'],
  pathophysiology: ['پاتوفیزیولوژی و نشانه‌ها', 'Pathophysiology & symptoms'],
  treatment: ['درمان', 'Treatment'],
  firstLine: ['درمان خط اول', 'First-line treatment'],
  otcOptions: ['گزینه‌های بدون نسخه', 'OTC options'],
  rxOptions: ['گزینه‌های نسخه‌ای', 'Prescription options'],
  instructions: ['دستورالعمل و مشاوره', 'Instructions & counselling'],
  redFlags: ['علائم هشدار', 'Red flags'],
  medicines: ['داروها', 'Medicines'],
  nonPharmAdvice: ['مراقبت غیردارویی', 'Non-pharmacological advice'],
  clinicalNotes: ['نکات بالینی', 'Clinical notes'],
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

function labelFor(key, lang) {
  return sourceLabels[key]?.[lang === 'fa' ? 0 : 1] || key.replace(/([a-z])([A-Z])/g, '$1 $2');
}

function renderSourceValue(value, lang, depth = 0) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value !== 'object') return `<span>${escapeHtml(value)}</span>`;
  if (Array.isArray(value)) {
    return `<ul class="space-y-2 ps-5 list-disc">${value.map(item => `<li class="leading-relaxed">${renderSourceValue(item, lang, depth + 1)}</li>`).join('')}</ul>`;
  }
  if (typeof value[lang] === 'string' && Object.keys(value).every(key => key === 'fa' || key === 'en')) {
    return `<span>${escapeHtml(value[lang] || value.fa || value.en)}</span>`;
  }
  return `<dl class="space-y-2">${Object.entries(value).map(([key, item]) => {
    const suffix = key.match(/(Fa|En)$/);
    const pairedKey = suffix ? `${key.slice(0, -2)}${suffix[1] === 'Fa' ? 'En' : 'Fa'}` : null;
    if (pairedKey && Object.hasOwn(value, pairedKey) && suffix[1] !== (lang === 'fa' ? 'Fa' : 'En')) return '';
    const body = renderSourceValue(item, lang, depth + 1);
    if (!body) return '';
    const displayKey = pairedKey && Object.hasOwn(value, pairedKey) ? key.slice(0, -2) : key;
    return `<div class="rounded-xl border border-border/60 bg-card/50 p-3 leading-relaxed"><dt class="font-semibold text-foreground mb-1">${escapeHtml(labelFor(displayKey, lang))}</dt><dd class="text-foreground/85">${body}</dd></div>`;
  }).join('')}</dl>`;
}

function sourceDocument({ id, folderId, titleFa, titleEn, data, sourceFile, tags }) {
  const render = (lang) => `<article class="knowledge-card mx-auto max-w-3xl space-y-5 text-sm leading-7" dir="${lang === 'fa' ? 'rtl' : 'ltr'}">
    <header class="rounded-2xl border border-primary/20 bg-primary/5 p-5">
      <h2 class="text-xl font-bold leading-8">${escapeHtml(lang === 'fa' ? titleFa : titleEn)}</h2>
      <p class="mt-2 text-xs text-muted-foreground" dir="ltr">Source: ${escapeHtml(sourceFile)}</p>
    </header>
    ${renderSourceValue(data, lang)}
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
for (const domain of CLINICAL_DOMAINS) {
  sourceDocument({
    id: `doc-clinical-domain-${domain.id}`,
    folderId: 'folder-mono-domains',
    titleFa: domain.titleFa || domain.id,
    titleEn: domain.titleEn || domain.id,
    data: domain,
    sourceFile: 'data/shelf/clinicalDomains.ts',
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

const cards = (INITIAL_SAMPLE_LEITNER_CARDS || []).map((card, idx) => ({
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
