import fs from 'fs';
import path from 'path';
import ts from 'typescript';

const pharmacyDir = 'C:/Users/hamed/.gemini/antigravity/scratch/pharmacy';
const targetDir = 'C:/Users/hamed/.gemini/antigravity/scratch/Arshiam/src/lib';

function extractExports(filePath) {
  const rawCode = fs.readFileSync(filePath, 'utf8')
    .replace(/import\s+[^;]+;/g, '');

  const transpiled = ts.transpileModule(rawCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
  }).outputText;

  const moduleObj = { exports: {} };
  const runFunc = new Function('module', 'exports', transpiled);
  runFunc(moduleObj, moduleObj.exports);
  return moduleObj.exports;
}

console.log('--- Reading source files from pharmacy ---');

// 1. Read Module Cards
const { ALL_PHARMACY_CARDS } = extractExports(path.join(pharmacyDir, 'lib/pharmacy-data.ts'));
console.log(`Extracted ${ALL_PHARMACY_CARDS.length} module cards from pharmacy-data.ts`);

// 2. Read Handbook OTC Diseases (part1, part2, part3)
const { OTC_HANDBOOK_DATA_PART1 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part1.ts'));
const { OTC_HANDBOOK_DATA_PART2 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part2.ts'));
const { OTC_HANDBOOK_DATA_PART3 } = extractExports(path.join(pharmacyDir, 'src/data/handbook/part3.ts'));
const allOtcDiseases = [
  ...(OTC_HANDBOOK_DATA_PART1 || []),
  ...(OTC_HANDBOOK_DATA_PART2 || []),
  ...(OTC_HANDBOOK_DATA_PART3 || [])
];
console.log(`Extracted ${allOtcDiseases.length} OTC diseases from handbook parts`);

// 3. Read CYP Enzymes
const { CYP_ENZYMES_DATABASE } = extractExports(path.join(pharmacyDir, 'data/cypInteractionsData.ts'));
const cypList = Object.values(CYP_ENZYMES_DATABASE || {});
console.log(`Extracted ${cypList.length} CYP enzyme profiles`);

// 4. Read Clinical Scenarios
const { CLINICAL_SCENARIOS } = extractExports(path.join(pharmacyDir, 'data/scenarios/clinicalScenarios.ts'));
console.log(`Extracted ${CLINICAL_SCENARIOS ? CLINICAL_SCENARIOS.length : 0} clinical scenarios`);

// 5. Read Sample Leitner Cards
const { INITIAL_SAMPLE_LEITNER_CARDS } = extractExports(path.join(pharmacyDir, 'lib/sample-leitner-cards.ts'));
console.log(`Extracted ${INITIAL_SAMPLE_LEITNER_CARDS ? INITIAL_SAMPLE_LEITNER_CARDS.length : 0} sample flashcards`);

// Folders definition
const PHARMACY_FOLDERS = [
  {
    id: 'folder-pharmacy-root',
    name: '💊 دایره‌المعارف و آموزش دارویی (Pharmacy Knowledge)',
    icon: 'Stethoscope',
    color: '#8b5cf6',
    parent_id: null,
    position: 1
  },
  {
    id: 'folder-pharmacy-modules',
    name: '📚 ۱. درس‌های جامع سیستم سلامت و قوانین (Modules 1-6)',
    icon: 'BookOpen',
    color: '#0284c7',
    parent_id: 'folder-pharmacy-root',
    position: 2
  },
  {
    id: 'folder-pharmacy-diseases',
    name: '🩺 ۲. اطلس بالینی بیماری‌ها و پروتکل‌های درمانی (Clinical Atlas)',
    icon: 'HeartPulse',
    color: '#10b981',
    parent_id: 'folder-pharmacy-root',
    position: 3
  },
  {
    id: 'folder-pharmacy-pharmacology',
    name: '🔬 ۳. مکانیسم‌های اثر و تداخلات آنزیمی (Pharmacology & CYP)',
    icon: 'Sparkles',
    color: '#f59e0b',
    parent_id: 'folder-pharmacy-root',
    position: 4
  },
  {
    id: 'folder-pharmacy-cases',
    name: '⚕️ ۴. تریاژ OTC و سناریوهای بالینی (Clinical Cases & OTC)',
    icon: 'Stethoscope',
    color: '#ec4899',
    parent_id: 'folder-pharmacy-root',
    position: 5
  }
];

const documents = [];

// SUBFOLDER 1: Modules 1-6 Lessons
for (const card of ALL_PHARMACY_CARDS) {
  const docId = `doc-${card.id}`;
  const titleFa = card.title?.fa || 'درس داروسازی';
  const titleEn = card.title?.en || 'Pharmacy Lesson';
  const pearlFa = card.actionPearl?.fa || '';
  const pearlEn = card.actionPearl?.en || '';
  const rawHtmlFa = card.detailsHtml?.fa || '';
  const rawHtmlEn = card.detailsHtml?.en || '';

  const htmlFa = `
<div class="space-y-4">
  ${pearlFa ? `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
    <span class="text-base shrink-0">💡</span>
    <div>
      <div class="font-bold mb-0.5">نکته کلیدی بالینی (Clinical Pearl):</div>
      <div class="leading-relaxed">${pearlFa}</div>
    </div>
  </div>` : ''}
  <div class="knowledge-card-body leading-relaxed">${rawHtmlFa}</div>
</div>`.trim();

  const htmlEn = `
<div class="space-y-4">
  ${pearlEn ? `
  <div class="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-2.5 shadow-2xs">
    <span class="text-base shrink-0">💡</span>
    <div>
      <div class="font-bold mb-0.5">Key Clinical Pearl:</div>
      <div class="leading-relaxed">${pearlEn}</div>
    </div>
  </div>` : ''}
  <div class="knowledge-card-body leading-relaxed">${rawHtmlEn}</div>
</div>`.trim();

  documents.push({
    id: docId,
    folder_id: 'folder-pharmacy-modules',
    title: titleFa,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: [card.category?.en || 'General', card.module || 'mod1', 'Pharmacy', 'Clinical'].filter(Boolean),
  });
}

// SUBFOLDER 2: OTC Disease Guides from Handbook
for (const disease of allOtcDiseases) {
  const docId = `doc-disease-${disease.id}`;
  const conditionStr = disease.condition || disease.id;
  const matchEnFa = conditionStr.match(/^([^(]+)(?:\(([^)]+)\))?/);
  const titleEn = matchEnFa ? matchEnFa[1].trim() : conditionStr;
  const titleFa = matchEnFa && matchEnFa[2] ? matchEnFa[2].trim() : titleEn;

  const symptomsList = (disease.symptoms || []).join(' • ');
  const referralList = (disease.referralCriteria || []);
  const medsList = (disease.medicines || []);
  const nonPharmList = (disease.nonPharmAdvice || []);
  const clinicalNotes = (disease.clinicalNotes || []).join(' ');

  const htmlFa = `
<div class="space-y-4">
  <!-- Symptoms Overview -->
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-foreground flex items-center gap-2">
      <span>🩺 علائم و نشانه‌های بالینی:</span>
    </h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${symptomsList || 'بررسی علائم اولیه مراجعه‌کننده به داروخانه'}</p>
  </div>

  <!-- Red Flags / Referral Criteria -->
  ${referralList.length > 0 ? `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-2 shadow-2xs">
    <div class="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
      <span>⚠️ علائم هشدار قرمز و معیارهای ارجاع به پزشک (Red Flags):</span>
    </div>
    <ul class="list-disc list-inside space-y-1">
      ${referralList.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- Recommended OTC Medicines -->
  ${medsList.length > 0 ? `
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 shadow-2xs">
    <div class="font-bold text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
      <span>💊 گزینه‌های دارویی بدون نسخه (OTC Treatments):</span>
    </div>
    <div class="space-y-2 text-xs">
      ${medsList.map(m => `
        <div class="p-2.5 rounded-xl bg-card/80 border border-emerald-500/20 text-foreground space-y-1">
          <div class="font-bold text-primary">${m.name} ${m.brandExamples ? `<span class="text-muted-foreground font-normal">(${m.brandExamples})</span>` : ''}</div>
          ${m.dosing ? `<div class="text-[11px] text-muted-foreground"><strong>دوز و مصرف:</strong> ${m.dosing}</div>` : ''}
          ${m.extraInfo ? `<div class="text-[11px] text-muted-foreground"><strong>نکات بالینی:</strong> ${m.extraInfo}</div>` : ''}
          <div class="flex flex-wrap gap-2 pt-1 text-[10px] text-muted-foreground">
            ${m.pregnancySafety ? `<span class="px-2 py-0.5 rounded-md bg-muted">بارداری: ${m.pregnancySafety}</span>` : ''}
            ${m.breastfeedingSafety ? `<span class="px-2 py-0.5 rounded-md bg-muted">شیردهی: ${m.breastfeedingSafety}</span>` : ''}
            ${m.minAge ? `<span class="px-2 py-0.5 rounded-md bg-muted">حداقل سن: ${m.minAge}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  <!-- Non-Pharmacological Advice -->
  ${nonPharmList.length > 0 ? `
  <div class="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1.5">
    <div class="font-bold text-foreground">💡 توصیه‌های غیردارویی و مراقبت در منزل:</div>
    <ul class="list-disc list-inside text-muted-foreground space-y-0.5 leading-relaxed">
      ${nonPharmList.map(np => `<li>${np}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${clinicalNotes ? `
  <div class="p-3 rounded-xl bg-secondary/60 border border-border text-xs text-muted-foreground leading-relaxed">
    <strong>نکته فارماسیوتیکال:</strong> ${clinicalNotes}
  </div>` : ''}
</div>`.trim();

  const htmlEn = `
<div class="space-y-4">
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-foreground">Clinical Presentation & Symptoms</h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${symptomsList || 'Initial patient presentation at community pharmacy.'}</p>
  </div>

  ${referralList.length > 0 ? `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-2 shadow-2xs">
    <div class="font-bold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
      <span>⚠️ Red Flags & Mandatory Medical Referral Criteria:</span>
    </div>
    <ul class="list-disc list-inside space-y-1">
      ${referralList.map(r => `<li>${r}</li>`).join('')}
    </ul>
  </div>` : ''}

  ${medsList.length > 0 ? `
  <div class="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-3 shadow-2xs">
    <div class="font-bold text-xs text-emerald-800 dark:text-emerald-300">
      OTC Therapeutic Options:
    </div>
    <div class="space-y-2 text-xs">
      ${medsList.map(m => `
        <div class="p-2.5 rounded-xl bg-card/80 border border-emerald-500/20 text-foreground space-y-1">
          <div class="font-bold text-primary">${m.name} ${m.brandExamples ? `(${m.brandExamples})` : ''}</div>
          ${m.dosing ? `<div class="text-[11px] text-muted-foreground"><strong>Dose:</strong> ${m.dosing}</div>` : ''}
          ${m.extraInfo ? `<div class="text-[11px] text-muted-foreground"><strong>Clinical Notes:</strong> ${m.extraInfo}</div>` : ''}
          <div class="flex flex-wrap gap-2 pt-1 text-[10px] text-muted-foreground">
            ${m.pregnancySafety ? `<span class="px-2 py-0.5 rounded-md bg-muted">Pregnancy: ${m.pregnancySafety}</span>` : ''}
            ${m.breastfeedingSafety ? `<span class="px-2 py-0.5 rounded-md bg-muted">Breastfeeding: ${m.breastfeedingSafety}</span>` : ''}
            ${m.minAge ? `<span class="px-2 py-0.5 rounded-md bg-muted">Min Age: ${m.minAge}</span>` : ''}
          </div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}

  ${nonPharmList.length > 0 ? `
  <div class="p-3.5 rounded-2xl bg-muted/40 border border-border text-xs space-y-1.5">
    <div class="font-bold text-foreground">Non-Pharmacological Guidance:</div>
    <ul class="list-disc list-inside text-muted-foreground space-y-0.5 leading-relaxed">
      ${nonPharmList.map(np => `<li>${np}</li>`).join('')}
    </ul>
  </div>` : ''}
</div>`.trim();

  documents.push({
    id: docId,
    folder_id: 'folder-pharmacy-diseases',
    title: `${titleFa} (${titleEn})`,
    title_en: `${titleEn} Clinical Guide`,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: [disease.category || 'OTC', 'Disease-Atlas', 'Treatment-Protocol'],
  });
}

// SUBFOLDER 3: CYP450 Enzymes Monographs
for (const cyp of cypList) {
  const docId = `doc-cyp-${cyp.id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  const inhibitorsList = (cyp.inhibitors || []).map(i => `${i.name}${i.nameFa ? ` (${i.nameFa})` : ''} [${i.category}]`).join(' • ');
  const inducersList = (cyp.inducers || []).map(i => `${i.name}${i.nameFa ? ` (${i.nameFa})` : ''} [${i.category}]`).join(' • ');
  const substratesList = (cyp.substrates || []).map(s => `${s.name}${s.nameFa ? ` (${s.nameFa})` : ''}`).join(' • ');
  const clinicalRules = cyp.clinicalRules || [];

  const htmlFa = `
<div class="space-y-4">
  <!-- Overview -->
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-foreground">🔬 بررسی آنزیم ${cyp.name}</h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${cyp.overviewFa}</p>
    <div class="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 mt-2">
      <strong>اهمیت بالینی:</strong> ${cyp.clinicalSignificanceFa}
    </div>
  </div>

  <!-- Drug Tables: Inhibitors, Inducers, Substrates -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
    <div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
      <div class="font-bold text-rose-700 dark:text-rose-300">🛑 مهارکننده‌ها (Inhibitors):</div>
      <p class="text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">${inhibitorsList || 'ثبت نشده'}</p>
    </div>
    <div class="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1.5">
      <div class="font-bold text-sky-700 dark:text-sky-300">⚡ القاکننده‌ها (Inducers):</div>
      <p class="text-[11px] leading-relaxed text-sky-900 dark:text-sky-200">${inducersList || 'ثبت نشده'}</p>
    </div>
    <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
      <div class="font-bold text-emerald-700 dark:text-emerald-300">🎯 سوبستراها (Substrates):</div>
      <p class="text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-200">${substratesList || 'ثبت نشده'}</p>
    </div>
  </div>

  <!-- Key Clinical Management Rules -->
  ${clinicalRules.length > 0 ? `
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2.5 shadow-2xs">
    <div class="font-bold text-xs text-primary">قوانین و راهنماهای بالینی مداخله:</div>
    <div class="space-y-2 text-xs">
      ${clinicalRules.map(r => `
        <div class="p-3 rounded-xl bg-muted/30 border border-border space-y-1">
          <div class="font-bold text-foreground flex items-center justify-between">
            <span>${r.titleFa}</span>
            <span class="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full ${r.severity === 'contraindicated' || r.severity === 'critical' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}">${r.severity}</span>
          </div>
          <div class="text-[11px] text-muted-foreground"><strong>مکانیسم:</strong> ${r.mechanismFa}</div>
          <div class="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium"><strong>توصیه داروساز:</strong> ${r.recommendationFa}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}
</div>`.trim();

  const htmlEn = `
<div class="space-y-4">
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-foreground">Cytochrome ${cyp.name} Profile</h3>
    <p class="text-xs text-muted-foreground leading-relaxed">${cyp.overviewEn}</p>
    <div class="text-xs p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-900 dark:text-amber-200 mt-2">
      <strong>Clinical Significance:</strong> ${cyp.clinicalSignificanceEn}
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
    <div class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 space-y-1.5">
      <div class="font-bold text-rose-700 dark:text-rose-300">Potent Inhibitors:</div>
      <p class="text-[11px] leading-relaxed text-rose-900 dark:text-rose-200">${inhibitorsList || 'None'}</p>
    </div>
    <div class="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/30 space-y-1.5">
      <div class="font-bold text-sky-700 dark:text-sky-300">Inducers:</div>
      <p class="text-[11px] leading-relaxed text-sky-900 dark:text-sky-200">${inducersList || 'None'}</p>
    </div>
    <div class="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 space-y-1.5">
      <div class="font-bold text-emerald-700 dark:text-emerald-300">Key Substrates:</div>
      <p class="text-[11px] leading-relaxed text-emerald-900 dark:text-emerald-200">${substratesList || 'None'}</p>
    </div>
  </div>
</div>`.trim();

  documents.push({
    id: docId,
    folder_id: 'folder-pharmacy-pharmacology',
    title: cyp.titleFa,
    title_en: cyp.titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['CYP450', cyp.id, 'Pharmacokinetics', 'Drug-Interactions'],
  });
}

// SUBFOLDER 4: Top Clinical Scenarios
const selectedScenarios = (CLINICAL_SCENARIOS || []).slice(0, 12);
for (const sc of selectedScenarios) {
  const docId = `doc-case-${sc.id}`;
  const titleFa = sc.title?.fa || sc.id;
  const titleEn = sc.title?.en || sc.id;
  const patient = sc.patientProfile;
  const redFlags = sc.redFlags || [];
  const whatQuestions = sc.whatQuestions || [];

  const htmlFa = `
<div class="space-y-4">
  <!-- Patient Profile -->
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-primary flex items-center gap-2">
      <span>👤 پرونده و شرح حال بیمار (${patient?.name || 'مراجعه‌کننده'} - ${patient?.age || 'بزرگسال'} ساله)</span>
    </h3>
    <p class="text-xs text-foreground leading-relaxed">${patient?.presentation?.fa || ''}</p>
  </div>

  <!-- Red Flags -->
  ${redFlags.length > 0 ? `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-1.5 shadow-2xs">
    <div class="font-bold flex items-center gap-1 text-rose-600 dark:text-rose-400">
      <span>⚠️ علائم هشدار قرمز ارجاع:</span>
    </div>
    <ul class="list-disc list-inside space-y-0.5">
      ${redFlags.map(rf => `<li>${rf.fa}</li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- WHAT Protocol Consultation Dialogue -->
  ${whatQuestions.length > 0 ? `
  <div class="p-4 rounded-2xl bg-secondary/40 border border-border space-y-3 shadow-2xs">
    <div class="font-bold text-xs text-foreground">گفتگوی تریاژ و سوالات پروتکل W.H.A.T:</div>
    <div class="space-y-2 text-xs">
      ${whatQuestions.map(q => `
        <div class="p-2.5 rounded-xl bg-card border border-border space-y-1">
          <div class="font-bold text-primary">${q.label?.fa || q.key}: ${q.question?.fa || ''}</div>
          <div class="text-muted-foreground">🗣️ <strong>پاسخ بیمار:</strong> ${q.answer?.fa || ''}</div>
        </div>
      `).join('')}
    </div>
  </div>` : ''}
</div>`.trim();

  const htmlEn = `
<div class="space-y-4">
  <div class="p-4 rounded-2xl bg-card border border-border space-y-2 shadow-2xs">
    <h3 class="text-xs font-bold text-primary">Patient Presentation: ${patient?.name || 'Patient'} (${patient?.age || ''} y/o)</h3>
    <p class="text-xs text-foreground leading-relaxed">${patient?.presentation?.en || ''}</p>
  </div>

  ${redFlags.length > 0 ? `
  <div class="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-200 text-xs space-y-1.5 shadow-2xs">
    <div class="font-bold text-rose-600 dark:text-rose-400">Mandatory Referral Signs:</div>
    <ul class="list-disc list-inside space-y-0.5">
      ${redFlags.map(rf => `<li>${rf.en}</li>`).join('')}
    </ul>
  </div>` : ''}
</div>`.trim();

  documents.push({
    id: docId,
    folder_id: 'folder-pharmacy-cases',
    title: titleFa,
    title_en: titleEn,
    content_html: htmlFa,
    content_en: htmlEn,
    preferred_language: 'bilingual',
    direction: 'rtl',
    tags: ['Clinical-Case', 'Triage', 'WHAT-Protocol', 'Patient-Care'],
  });
}

// LEITNER FLASHCARDS
const baseCards = (INITIAL_SAMPLE_LEITNER_CARDS || []).map((c, idx) => ({
  id: `card-pharma-base-${idx + 1}`,
  front: c.question?.fa || c.question?.en || '',
  back: c.answer?.fa || c.answer?.en || '',
  clue: c.pearl?.fa || c.pearl?.en || '',
  box: c.box || 1,
  folder_id: 'folder-pharmacy-modules',
  document_id: null,
}));

const highYieldCards = [
  {
    id: 'card-pharma-hy-1',
    front: 'تداخل سیمواستاتین با مهارکننده‌های قوی CYP3A4 (مانند کلاریترومایسین یا کتوکونازول) چه خطری دارد و اقدام بالینی چیست؟',
    back: 'مهار شدید متابولیسم کبدی سیمواستاتین منجر به افزایش غلظت پلاسمایی تا چند برابر، تخریب عضلانی اسکلتی شدید (Rhabdomyolysis) و نارسایی حاد کلیه ناشی از میوگلوبینوری می‌گردد. اقدام: سیمواستاتین باید در طول دوره آنتی‌بیوتیک قطع شود یا بیمار به رزوواستاتین (که متابولیسم CYP3A4 ندارد) سوئیچ گردد.',
    clue: 'سیمواستاتین حساس‌ترین استاتین به مهار CYP3A4 است؛ رزوواستاتین یا پراواستاتین ایمن‌تر هستند.',
    box: 1,
    folder_id: 'folder-pharmacy-pharmacology',
  },
  {
    id: 'card-pharma-hy-2',
    front: 'چرا مصرف همزمان کلوپیدوگرل با امپرازول توصیه نمی‌شود و داروی جایگزین چیست؟',
    back: 'کلوپیدوگرل یک پیش‌دارو (Prodrug) است که برای تبدیل به متابولیت فعال ضدپلاکت نیاز به ایزوآنزیم CYP2C19 دارد. امپرازول مهارکننده قوی CYP2C19 است و مانع فعال‌سازی کلوپیدوگرل شده و خطر ترومبوز و سکته مجدد را افزایش می‌دهد. اقدام: پنتوپرازول به دلیل تداخل بسیار کمتر با CYP2C19 جایگزین مناسب است.',
    clue: 'امپرازول مهارکننده قوی CYP2C19 است؛ پنتوپرازول اثر مهاری ناچیزی بر این آنزیم دارد.',
    box: 1,
    folder_id: 'folder-pharmacy-pharmacology',
  },
  {
    id: 'card-pharma-hy-3',
    front: 'تداخل وارفارین با مترونیدازول یا سیپروفلوکساسین چگونه باعث جهش خطرناک INR و خونریزی می‌شود؟',
    back: 'مترونیدازول قوی‌ترین مهارکننده مسیر متابولیکی S-Warfarin (ایزومر ۵ برابر فعال‌تر) از طریق آنزیم CYP2C9 است. مهار کلیرانس آن منجر به تجمع شدید وارفارین، جهش ناگهانی INR و خونریزی‌های تهدیدکننده حیات می‌شود. اقدام: کاهش دوز وارفارین به ۳۰ تا ۵۰ درصد و پایش روزانه INR.',
    clue: 'آنزیم کلیدی متابولیسم S-warfarin آنزیم CYP2C9 است و مترونیدازول آن را مهار می‌کند.',
    box: 1,
    folder_id: 'folder-pharmacy-pharmacology',
  },
  {
    id: 'card-pharma-hy-4',
    front: 'تفاوت قانونی بین داروهای AUST R و AUST L در رگولیشن TGA استرالیا چیست؟',
    back: 'داروهای AUST R (ثبتی - Registered) پرخطر هستند (نسخه‌ای، S3 و S2) و قبل از ورود به بازار از نظر ۳ رکن ایمنی، کیفیت و اثربخشی بالینی (Clinical Efficacy) کاملاً ارزیابی می‌شوند. داروهای AUST L (لیستی - Listed) کم‌خطرند (ویتامین‌ها و مکمل‌ها) و اثربخشی بالینی آن‌ها قبل از ورود بررسی نمی‌شود.',
    clue: 'کد AUST R به معنای تایید رسمی اثربخشی درمانی توسط TGA است.',
    box: 1,
    folder_id: 'folder-pharmacy-modules',
  },
  {
    id: 'card-pharma-hy-5',
    front: 'بر اساس قوانین Continued Dispensing در استرالیا، داروساز چه زمانی مجاز به تحویل داروی یک ماهه بدون نسخه است؟',
    back: 'در شرایط اضطراری که بیمار به پزشک دسترسی ندارد، برای داروهای خوراکی مزمن در لیست PBS، در صورتی که بیمار در ۶ ماه گذشته سابقه مصرف مستمر همان دوز را داشته باشد، داروساز مجاز است حداکثر ۱ بسته استاندارد یک ماهه را تحویل دهد (سالانه ۱ بار برای هر دارو).',
    clue: 'طرح Continued Dispensing برای داروهای مزمن مانند ضد فشارخون، دیابت و استاتین‌ها قابل اجراست.',
    box: 1,
    folder_id: 'folder-pharmacy-modules',
  },
  {
    id: 'card-pharma-hy-6',
    front: 'در صورت سوئیچ از داروی ACEi (مانند رامیپریل) به ساکوبیتریل/والسارتان (Entresto)، چرا دوره شستشوی ۳۶ ساعته الزامی است؟',
    back: 'هر دو آنزیم نپری‌لیزین (Neprilysin) و ACE مسئول تجزیه برادی‌کینین هستند. مهار همزمان هر دو آنزیم منجر به تجمع انفجاری برادی‌کینین و بروز آنژیوادم شدید و انسداد مجاری تنفسی تهدیدکننده حیات می‌شود. رعایت فاصله ۳۶ ساعت پس از آخرین دوز ACEi الزامی است.',
    clue: 'برای سوئیچ از ARB به Entresto نیازی به دوره شستشو نیست، فقط برای ACEi الزامی است.',
    box: 1,
    folder_id: 'folder-pharmacy-modules',
  },
  {
    id: 'card-pharma-hy-7',
    front: 'علائم هشدار قرمز (Red Flags) در بیماری ریفلاکس معده (GORD/Dyspepsia) که نیازمند ارجاع فوری جهت آندوسکوپی است چیست؟',
    back: 'دیسفاژی (اشکال در بلع)، اودینوفاژی (درد هنگام بلع)، استفراغ خونی یا مدفوع سیاه قیرگون (Melena)، کاهش وزن ناخواسته و بدون توجیه، کم‌خونی فقر آهن غیرقابل توضیح، و شروع علائم برای اولین بار در افراد بالای ۵۵ سال.',
    clue: 'وجود دیسفاژی (اشکال در بلع) یا کاهش وزن در سوءهاضمه نشانه خطر بدخیمی است.',
    box: 1,
    folder_id: 'folder-pharmacy-diseases',
  },
  {
    id: 'card-pharma-hy-8',
    front: 'رویکرد درمانی نوین SMART یا AIR در راهنمای آسم استرالیا برای نوجوانان و بزرگسالان چیست؟',
    back: 'استفاده از ترکیب کورتیکواستروئید استنشاقی با فورموترول (مانند بودزوناید/فورموترول - Symbicort) به صورت روزانه جهت نگهداری و همچنین به صورت PRN در هنگام بروز علائم حاد. بر خلاف سالبوتامول، در هر بار تسکین علائم، دوزی از ضدالتهاب به ریه می‌رسد.',
    clue: 'فورموترول بر خلاف سالمترول، هم شروع اثر سریع دارد و هم طول اثر ۱۲ ساعته.',
    box: 1,
    folder_id: 'folder-pharmacy-diseases',
  },
  {
    id: 'card-pharma-hy-9',
    front: 'مکانیسم سمیت کبدی استامینوفن (Paracetamol) در دوز بالا چیست و پادزهر انتخابی آن چیست؟',
    back: 'در دوزهای سمی، مسیرهای گلوکورونیداسیون و سولفاسیون اشباع شده و سیتوکروم CYP2E1 استامینوفن را به متابولیت فوق‌العاده سمی NAPQI تبدیل می‌کند که با تخلیه گلوتاتیون سلولی به هپاتوسیت‌ها متصل و کبد را تخریب می‌کند. پادزهر: ان-استیل‌سیستئین (NAC) که ذخایر گلوتاتیون را احیا می‌کند.',
    clue: 'استیل‌سیستئین سلفیدریل دهنده است که متابولیت سمی NAPQI را خنثی می‌کند.',
    box: 1,
    folder_id: 'folder-pharmacy-cases',
  },
  {
    id: 'card-pharma-hy-10',
    front: 'در صورت مراجعه مادری که نوزاد ۴ ماهه وی تب ۳۸.۵ درجه دارد، آیا مصرف ایبوپروفن مجاز است؟',
    back: 'خیر، ایبوپروفن خوراکی فقط برای نوزادان بالای ۳ ماه با وزن بیش از ۶ کیلوگرم دارای تاییدیه است اما در نوزادان زیر ۶ ماه یا دچار کم‌آبی، داروی خط اول انتخابی منحصراً پاراستامول خوراکی است (۱۵ میلی‌گرم بر کیلوگرم هر ۴ تا ۶ ساعت). همچنین تب در نوزاد زیر ۳ ماه نیاز به ارجاع اورژانسی دارد.',
    clue: 'دوز پاراستامول در اطفال همیشه بر اساس وزن است: 15 mg/kg حداکثر ۴ بار در روز.',
    box: 1,
    folder_id: 'folder-pharmacy-cases',
  }
];

const cards = [...baseCards, ...highYieldCards];

console.log(`Generated ${documents.length} total pharmacy documents.`);
console.log(`Generated ${cards.length} sample Leitner cards.`);

// Write the output file
const fileContent = `/**
 * PHARMACEUTICAL KNOWLEDGE BASE SEED DATA (Generated)
 * Total Folders: ${PHARMACY_FOLDERS.length}
 * Total Documents: ${documents.length}
 * Total Flashcards: ${cards.length}
 */

import type { KnowledgeFolder, KnowledgeDocument } from './knowledgeTypes';
import type { LeitnerCard } from './leitnerTypes';

export interface PharmacyFolderSeed {
  id: string;
  name: string;
  icon: string;
  color: string;
  parent_id: string | null;
  position: number;
}

export interface PharmacyDocSeed {
  id: string;
  folder_id: string;
  title: string;
  title_en: string;
  content_html: string;
  content_en: string;
  preferred_language: 'bilingual';
  direction: 'rtl';
  tags: string[];
}

export interface PharmacyCardSeed {
  id: string;
  front: string;
  back: string;
  clue?: string;
  box: number;
  folder_id?: string | null;
  document_id?: string | null;
}

export const PHARMACY_ROOT_FOLDER_ID = 'folder-pharmacy-root';

export const PHARMACY_SEED_FOLDERS: PharmacyFolderSeed[] = ${JSON.stringify(PHARMACY_FOLDERS, null, 2)};

export const PHARMACY_SEED_DOCUMENTS: PharmacyDocSeed[] = ${JSON.stringify(documents, null, 2)};

export const PHARMACY_SEED_CARDS: PharmacyCardSeed[] = ${JSON.stringify(cards, null, 2)};
`;

fs.writeFileSync(path.join(targetDir, 'pharmacySeedData.ts'), fileContent, 'utf8');
console.log('Successfully written src/lib/pharmacySeedData.ts');
