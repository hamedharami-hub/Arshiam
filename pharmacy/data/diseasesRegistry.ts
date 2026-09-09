import { ALL_OTC_HANDBOOK_DISEASES, OTCDiseaseGuide, OTCMedicine, findHandbookGuide } from '@/src/data/otcHandbookData';
import { getOtcClinicalTranslation, translateMedicineAttribute, translateClinicalText } from '@/data/otcClinicalTranslations';

export interface DiseaseCategory {
  id: string;
  name: {
    fa: string;
    en: string;
  };
  color: string; // Tailwind color class for badges/headers
  iconName: string;
}

export interface DiseaseInfo {
  id: string;
  categoryId: string;
  name: {
    fa: string;
    en: string;
  };
  synonyms: string[];
  overview: {
    fa: string;
    en: string;
  };
  pathophysiology: {
    fa: string;
    en: string;
  };
  treatment: {
    otcOptions: { fa: string; en: string };
    rxOptions: { fa: string; en: string };
    firstLine: { fa: string; en: string };
  };
  medicines?: OTCMedicine[];
  nonPharmAdvice?: string[];
  clinicalNotes?: string[];
  symptoms?: string[];
  referralCriteria?: string[];
  instructions: {
    fa: string;
    en: string;
  };
  redFlags: {
    fa: string[];
    en: string[];
  };
  relatedShelfProducts?: string[];
  pbsNotes?: {
    fa: string;
    en: string;
  };
}

export const DISEASE_CATEGORIES: DiseaseCategory[] = [
  {
    id: 'resp',
    name: { fa: 'دستگاه تنفس و گوش و حلق و بینی', en: 'Respiratory & ENT' },
    color: 'emerald',
    iconName: 'Wind',
  },
  {
    id: 'gi',
    name: { fa: 'دستگاه گوارش و کبد', en: 'Gastrointestinal & Hepatic' },
    color: 'amber',
    iconName: 'Activity',
  },
  {
    id: 'derma',
    name: { fa: 'پوست، مو و سوختگی', en: 'Dermatology & Skin' },
    color: 'rose',
    iconName: 'Sparkles',
  },
  {
    id: 'pain',
    name: { fa: 'درد، عضلانی اسکلتی و سردرد', en: 'Pain & Musculoskeletal' },
    color: 'purple',
    iconName: 'Zap',
  },
  {
    id: 'cardio',
    name: { fa: 'قلب و عروق، کلیه و متابولیک', en: 'Cardiovascular, Renal & Metabolic' },
    color: 'sky',
    iconName: 'Heart',
  },
  {
    id: 'neuro',
    name: { fa: 'مغز و اعصاب، خواب و ترک سیگار', en: 'Neurology, Sleep & Addiction' },
    color: 'indigo',
    iconName: 'Brain',
  },
  {
    id: 'infect',
    name: { fa: 'عفونت‌ها و بیماری‌های انگل‌شناسی', en: 'Infections & Parasitic' },
    color: 'teal',
    iconName: 'ShieldAlert',
  },
  {
    id: 'eye_ear',
    name: { fa: 'چشم، پلک و مجرای گوش', en: 'Ophthalmic & Otic' },
    color: 'cyan',
    iconName: 'Eye',
  },
  {
    id: 'women_men',
    name: { fa: 'سلامت زنان، اورولوژی و مخاط دهان', en: "Women's, Oral & Urological" },
    color: 'pink',
    iconName: 'User',
  },
];

// Helper to categorize OTC guide into one of the 9 categories
function determineCategoryId(guide: OTCDiseaseGuide): string {
  const cat = (guide.category || '').toLowerCase();
  const id = guide.id.toLowerCase();

  if (cat.includes('respiratory') || cat.includes('ent') || id.includes('rhinitis') || id.includes('sinus') || id.includes('cough') || id.includes('sore_throat') || id.includes('nasal')) {
    return 'resp';
  }
  if (cat.includes('gastro') || id.includes('constipation') || id.includes('diarrhoea') || id.includes('reflux') || id.includes('haemorrhoids') || id.includes('fissure')) {
    return 'gi';
  }
  if (cat.includes('eye') || cat.includes('ear') || cat.includes('ophthalm') || cat.includes('otic') || id.includes('conjunctivitis') || id.includes('blepharitis') || id.includes('dry_eye') || id.includes('ear_wax') || id.includes('hordeolum')) {
    return 'eye_ear';
  }
  if (cat.includes('women') || cat.includes('uro') || cat.includes('oral') || cat.includes('dental') || id.includes('uti') || id.includes('thrush') || id.includes('candidiasis') || id.includes('dysmenorrhoea') || id.includes('mouth_ulcers') || id.includes('gingivitis') || id.includes('cold_sores')) {
    return 'women_men';
  }
  if (cat.includes('pain') || cat.includes('headache') || cat.includes('musculo') || id.includes('gout') || id.includes('migraine') || id.includes('headache') || id.includes('pain')) {
    return 'pain';
  }
  if (cat.includes('cardio') || cat.includes('metabolic') || id.includes('hypertension') || id.includes('diabetes')) {
    return 'cardio';
  }
  if (cat.includes('sleep') || cat.includes('neuro') || cat.includes('smoking') || id.includes('insomnia') || id.includes('sleep') || id.includes('smoking')) {
    return 'neuro';
  }
  if (cat.includes('parasit') || cat.includes('infect') || id.includes('pinworm') || id.includes('worms') || id.includes('chickenpox') || id.includes('shingles')) {
    return 'infect';
  }
  return 'derma';
}

// Convert all 43 OTC Handbook Guides into rich DiseaseInfo items
const CONVERTED_OTC_DISEASES: DiseaseInfo[] = ALL_OTC_HANDBOOK_DISEASES.map((guide) => {
  const clinTrans = getOtcClinicalTranslation(guide.id);
  const parenMatch = guide.condition.match(/^(.*?)\s*\((.*?)\)$/);
  const enName = clinTrans?.cleanEnName || (parenMatch ? parenMatch[1].trim() : guide.condition);
  const faName = clinTrans?.cleanFaName || (parenMatch ? parenMatch[2].trim() : guide.condition);

  const firstMed = guide.medicines[0];
  const firstLineEn = firstMed
    ? `${firstMed.name} (${firstMed.brandExamples}) — Dosing: ${firstMed.dosing}`
    : 'Refer to Australian Pharmacy Formulary Guidelines.';
  const firstLineFa = clinTrans?.firstLine
    ? `خط اول درمان: ${clinTrans.firstLine.drugNameFa} (برندهای کلیدی: ${clinTrans.firstLine.keyBrands.join(' / ')}) — ${clinTrans.firstLine.dosingFa}`
    : (firstMed
      ? `خط اول درمان: ${firstMed.name} (برندهای استرالیایی: ${firstMed.brandExamples}) — نحوه مصرف و دوزینگ: ${translateMedicineAttribute(firstMed.dosing, 'dosing')}`
      : 'درمان حمایتی و مشاوره بر اساس استانداردهای APF و PBA استرالیا.');

  const otcEn = guide.medicines
    .map(
      (m, idx) =>
        `${idx + 1}. ${m.name} (Brands: ${m.brandExamples})\n   • Dosing: ${m.dosing}\n   • Min Age: ${m.minAge} | Pregnancy: ${m.pregnancySafety} | Lactation: ${m.breastfeedingSafety}\n   • Note: ${m.extraInfo || 'N/A'}`
    )
    .join('\n\n');

  const otcFa = guide.medicines
    .map(
      (m, idx) =>
        `${idx + 1}. ${m.name} (برندهای رایج: ${m.brandExamples})\n   • دوزینگ: ${translateMedicineAttribute(m.dosing, 'dosing')}\n   • حداقل سن مجاز: ${translateMedicineAttribute(m.minAge, 'minAge')} | ایمنی بارداری: ${translateMedicineAttribute(m.pregnancySafety, 'pregnancy')} | ایمنی شیردهی: ${translateMedicineAttribute(m.breastfeedingSafety, 'lactation')}\n   • نکته کلیدی: ${translateMedicineAttribute(m.extraInfo, 'extra') || 'ندارد'}`
    )
    .join('\n\n');

  const instructionsFa = clinTrans?.nonPharmFa && clinTrans.nonPharmFa.length > 0
    ? clinTrans.nonPharmFa.map((a, i) => `${i + 1}) ${a}`).join('\n')
    : guide.nonPharmAdvice.map((a, i) => `${i + 1}) ${translateClinicalText(a)}`).join('\n');
  const instructionsEn = guide.nonPharmAdvice.map((a, i) => `${i + 1}) ${a}`).join('\n');

  const symptomsFa = clinTrans?.symptomsFa && clinTrans.symptomsFa.length > 0
    ? clinTrans.symptomsFa
    : guide.symptoms;

  const redFlagsFa = clinTrans?.redFlagsFa && clinTrans.redFlagsFa.length > 0
    ? clinTrans.redFlagsFa
    : guide.referralCriteria;

  const clinicalNotesFa = clinTrans?.clinicalPearlsFa && clinTrans.clinicalPearlsFa.length > 0
    ? clinTrans.clinicalPearlsFa
    : guide.clinicalNotes;

  return {
    id: `otc-${guide.id}`,
    categoryId: determineCategoryId(guide),
    name: {
      fa: `${faName} (${enName})`,
      en: guide.condition,
    },
    synonyms: [
      enName,
      faName,
      ...guide.medicines.flatMap((m) => m.brandExamples.split(',').map((b) => b.trim())),
    ],
    overview: {
      fa: `راهنمای بالینی و مونوگراف دوزینگ OTC برای ${faName}.`,
      en: `Clinical OTC management guide for ${enName}.`,
    },
    pathophysiology: {
      fa: symptomsFa.length > 0 ? `علائم بالینی: ${symptomsFa.join(' • ')}` : '',
      en: guide.symptoms.length > 0 ? `Clinical Symptoms: ${guide.symptoms.join(' • ')}` : '',
    },
    treatment: {
      firstLine: {
        fa: firstLineFa,
        en: firstLineEn,
      },
      otcOptions: {
        fa: otcFa,
        en: otcEn,
      },
      rxOptions: {
        fa: 'در صورت عدم بهبودی پس از دوره استاندارد بدون نسخه، تشدید علائم یا بروز پرچم‌های قرمز، ارجاع فوری به پزشک خانواده (GP) جهت تجویز تجویز داروهای نسخه‌ای (S4).',
        en: 'Refer to GP for Schedule 4 prescription therapies if red flags emerge or symptoms fail to resolve within the recommended OTC timeframe.',
      },
    },
    instructions: {
      fa: instructionsFa,
      en: instructionsEn,
    },
    redFlags: {
      fa: redFlagsFa,
      en: guide.referralCriteria,
    },
    medicines: guide.medicines,
    nonPharmAdvice: guide.nonPharmAdvice,
    clinicalNotes: guide.clinicalNotes,
    symptoms: guide.symptoms,
    referralCriteria: guide.referralCriteria,
    relatedShelfProducts: [],
  };
});

// Dedicated Chronic & Complex Clinical Practice Diseases
const CORE_CLINICAL_DISEASES: DiseaseInfo[] = [
  {
    id: 'dis-asthma',
    categoryId: 'resp',
    name: {
      fa: 'آسم و اسپاسم برونش (Asthma & Bronchospasm)',
      en: 'Asthma & Airway Hyper-responsiveness',
    },
    synonyms: ['حمله آسم', 'تنگی نفس', 'خس‌خس سینه', 'Wheezing', 'Bronchospasm', 'Ventolin', 'Asmol'],
    overview: {
      fa: 'بیماری التهابی مزمن مجاری هوایی همراه با انقباض برگشت‌پذیر برونش‌ها، انسداد مجاری و افزایش حساسیتی به محرک‌های محیطی.',
      en: 'Chronic inflammatory disorder of the airways characterized by reversible bronchial constriction, mucosal edema, and bronchial hyper-responsiveness.',
    },
    pathophysiology: {
      fa: 'علائم شامل خس‌خس سینه (Wheezing)، سرفه شبانه یا پس از ورزش، احساس فشار در قفسه سینه و تنگی نفس حاد.',
      en: 'Key symptoms include expiratory wheezing, nocturnal or exercise-induced cough, chest tightness, and shortness of breath.',
    },
    treatment: {
      firstLine: {
        fa: 'داروی تسکین‌دهنده سریع (SABA مثل Salbutamol 100mcg) + کورتیکواستروئید استنشاقی ترکیبی (ICS-Formoterol) طبق راهنمای GINA.',
        en: 'Short-acting beta-2 agonist (Salbutamol S3) or anti-inflammatory reliever (ICS-Formoterol) as per GINA Guidelines.',
      },
      otcOptions: {
        fa: 'اسپری سالبوتامول (Ventolin / Asmol) در داروخانه‌های استرالیا تحت طبقه S3 (Pharmacist Only) با مشاوره اجباری داروساز ارائه می‌شود.',
        en: 'Salbutamol MDI (Ventolin) is classified as Schedule 3 (Pharmacist Only) requiring mandatory pharmacist counseling.',
      },
      rxOptions: {
        fa: 'کورتیکواستروئیدهای استنشاقی (Fluticasone, Budesonide) و ترکیب با LABA (Seretide, Symbicort) با نسخه S4.',
        en: 'Inhaled Corticosteroids (ICS) and combination ICS/LABA inhalers (Seretide, Symbicort) with S4 prescription.',
      },
    },
    instructions: {
      fa: '۱) بررسی تکنیک صحیح استفاده از اسپری و استفاده اجباری از آسان‌نفس (Spacer).\n۲) شستشوی دهان پس از مصرف اسپری‌های کورتونی برای پیشگیری از برفک.\n۳) تنظیم برنامه اقدام حاد آسم (Asthma Action Plan) و ارجاع در صورت نیاز به بیش از ۳ بار مصرف Ventolin در هفته.',
      en: '1) Verify inhaler technique and recommend a Spacer device.\n2) Counsel patient to rinse mouth after ICS use to prevent oral candidiasis.\n3) Review Asthma Action Plan and refer if SABA needed >3 times per week.',
    },
    redFlags: {
      fa: ['استفاده از عضلات فرعی تنفس و ناتوانی در صحبت کردن در جملات کامل', 'عدم پاسخ به دوزهای متوالی سالبوتامول (پروتکل ۴x۴x۴)', 'سیانوز (کبودی لب‌ها و ناخن‌ها) و افت هوشیاری'],
      en: ['Inability to complete sentences in one breath, tachypnea', 'Failure to respond to 4x4x4 reliever protocol', 'Central cyanosis, silent chest, or altered consciousness'],
    },
    medicines: [
      {
        name: 'Salbutamol 100mcg MDI',
        brandExamples: 'Ventolin, Asmol',
        dosing: 'Adults & Children: 1-2 puffs as required for symptom relief. In acute asthma: 4 puffs (with spacer), wait 4 mins, repeat if needed.',
        pregnancySafety: 'Category A (Safe in pregnancy).',
        breastfeedingSafety: 'Safe in breastfeeding.',
        minAge: 'All ages',
        extraInfo: 'S3 Pharmacist Only supply. Always recommend use with a Spacer.'
      }
    ],
    nonPharmAdvice: [
      'Always use a Spacer device with Metered Dose Inhalers to increase lung deposition.',
      'Rinse mouth with water and spit out after using inhaled corticosteroids.',
      'Maintain an up-to-date Written Asthma Action Plan.'
    ],
    clinicalNotes: ['If patient uses SABA >2 days per week (excluding pre-exercise), asthma is poorly controlled and requires GP review for preventer step-up.'],
    relatedShelfProducts: ['prod-ventolin-s3', 'prod-spacer-device'],
  },
  {
    id: 'dis-copd',
    categoryId: 'resp',
    name: {
      fa: 'بیماری انسدادی مزمن ریه (COPD)',
      en: 'Chronic Obstructive Pulmonary Disease (COPD)',
    },
    synonyms: ['برونشیت مزمن', 'آمفیزم', 'تنگی نفس مزمن', 'Emphysema', 'Chronic Bronchitis', 'Spiriva', 'Trelegy'],
    overview: {
      fa: 'محدودیت پیشرونده و غیرقابل برگشت کامل جریان هوا در ریه‌ها که معمولاً ناشی از تماس طولانی با دود سیگار یا آلاینده‌ها است.',
      en: 'Progressive, non-fully reversible airflow limitation associated with chronic inflammatory airway and alveolar damage.',
    },
    pathophysiology: {
      fa: 'تخریب پارانشیم ریه (آمفیزم) و التهاب مزمن مجاری برونشیولار منجر به تنگی نفس پیشرونده فعالیتی و سرفه مزمن خلط‌دار می‌شود.',
      en: 'Alveolar wall destruction and small-airway fibrosis leading to air trapping, hyperinflation, and persistent exertional dyspnea.',
    },
    treatment: {
      firstLine: {
        fa: 'برونکودیلاتورهای طولانی‌اثر (LAMA مثل Tiotropium + LABA مثل Olodaterol/Vilanterol) و ترک کامل دخانیات.',
        en: 'Long-acting bronchodilators (LAMA + LABA dual therapy) alongside strict smoking cessation.',
      },
      otcOptions: {
        fa: 'درمان‌های حمایتی OTC شامل واکسیناسیون سالانه آنفولانزا، واکسن پنوموکوک و محصولات NRT ترک سیگار.',
        en: 'Annual Influenza and Pneumococcal vaccination, along with S2/S3 Nicotine Replacement Therapy (NRT).',
      },
      rxOptions: {
        fa: 'ترکیبات استنشاقی سه‌گانه (Trelegy, Breztri: ICS/LAMA/LABA) و آنتی‌بیوتیک‌های تشدید حاد با نسخه S4.',
        en: 'Triple inhaled therapies (ICS/LABA/LAMA), systemic steroids and antibiotics for acute exacerbations (S4).',
      },
    },
    instructions: {
      fa: '۱) ترک فوری و کامل مصرف دخانیات مهم‌ترین اقدام متوقف‌کننده افت عملکرد ریه است.\n۲) تزریق سالانه واکسن آنفلوانزا و واکسن کونژوگه پنوموکوک.\n۳) آموزش صحیح استفاده از دستگاه‌های اینهیلر (HandiHaler, Ellipta, Respimat).',
      en: '1) Immediate smoking cessation is paramount to slow FEV1 decline.\n2) Ensure influenza, COVID-19, and pneumococcal immunisation.\n3) Review inhaler technique across different device designs regularly.',
    },
    redFlags: {
      fa: ['تشدید حاد تنفسی با ترشحات چرکی سبز/قهوه‌ای', 'افت اشباع اکسیژن خون کمتر از ۸۸٪', 'سیانوز، خواب‌آلودگی یا هیپرکاپنی'],
      en: ['Acute exacerbation with increased sputum volume and purulence', 'Oxygen saturation falling below 88%', 'Drowsiness, cyanosis, or acute respiratory failure'],
    },
    medicines: [
      {
        name: 'Tiotropium Bromide 18mcg Inhalation Powder',
        brandExamples: 'Spiriva HandiHaler, Spiriva Respimat',
        dosing: 'Inhale contents of 1 capsule (18mcg) once daily at the same time each day using HandiHaler device.',
        pregnancySafety: 'Category B1.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'Adults',
        extraInfo: 'LAMA bronchodilator. Capsules must never be swallowed; rinse mouth after use.'
      },
      {
        name: 'Fluticasone Furoate / Umeclidinium / Vilanterol',
        brandExamples: 'Trelegy Ellipta 100/62.5/25mcg',
        dosing: 'Inhale 1 blister once daily in the morning using Ellipta inhaler.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Caution advised.',
        minAge: 'Adults',
        extraInfo: 'Single-inhaler triple therapy (ICS/LAMA/LABA) for frequent exacerbators.'
      },
      {
        name: 'Salmeterol / Fluticasone 50/250mcg',
        brandExamples: 'Seretide Accuhaler',
        dosing: 'Inhale 1 inhalation twice daily (morning and evening).',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'Adults',
        extraInfo: 'Combination LABA/ICS. Rinse and spit after every dose to avoid candidiasis.'
      },
      {
        name: 'Ipratropium Bromide 21mcg MDI',
        brandExamples: 'Atrovent MDI',
        dosing: '2 puffs 3-4 times daily as required (max 12 puffs/day).',
        pregnancySafety: 'Category B1.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'All ages',
        extraInfo: 'Short-acting muscarinic antagonist (SAMA). Use with spacer.'
      }
    ],
    nonPharmAdvice: [
      'Enroll in Pulmonary Rehabilitation programs.',
      'Practice pursed-lip breathing to relieve exertional breathlessness.',
      'Avoid sudden exposure to cold air and indoor smoke/pollutants.'
    ],
    clinicalNotes: ['Patients with frequent exacerbations require triple therapy (ICS/LABA/LAMA) under specialist/GP guidance.'],
    relatedShelfProducts: ['prod-spiriva-s4', 'prod-nicorette-gum'],
  },
  {
    id: 'dis-hypertension',
    categoryId: 'cardio',
    name: {
      fa: 'فشار خون بالا (Essential Hypertension)',
      en: 'Essential Hypertension & BP Management',
    },
    synonyms: ['فشار خون', 'هایپرتانسیون', 'High Blood Pressure', 'HTN', 'Coversyl', 'Norvasc'],
    overview: {
      fa: 'افزایش مزمن و پایدار فشار خون شریانی (فشار سیستولی ≥۱۴۰ mmHg یا دیاستولی ≥۹۰ mmHg) که عامل اصلی سکته مغزی و قلبی است.',
      en: 'Persistent elevation of systemic arterial blood pressure (SBP ≥140 mmHg or DBP ≥90 mmHg), a major risk factor for CVD and stroke.',
    },
    pathophysiology: {
      fa: 'افزایش مقاومت عروق محیطی و اختلال در تنظیم حجم مایعات توسط کلیه‌ها. اغلب بدون علامت (قاتل خاموش).',
      en: 'Increased systemic vascular resistance and impaired renal sodium excretion. Usually asymptomatic ("Silent Killer").',
    },
    treatment: {
      firstLine: {
        fa: 'اصلاح سبک زندگی (کاهش نمک، ورزش) + داروهای خط اول: ACEi/ARB (مثل Perindopril, Telmisartan)، CCB (Amlodipine) یا دیورتیک تیاژیدی.',
        en: 'Lifestyle intervention + First-line antihypertensives: ACEi/ARB (Perindopril, Telmisartan), CCB (Amlodipine), or Thiazide diuretic.',
      },
      otcOptions: {
        fa: 'فشار خون یک بیماری نیازمند پایش پزشکی است؛ داروهای ضد فشار خون کلاً با نسخه S4 ارائه می‌شوند. پایش فشار خون در داروخانه (BP Checks).',
        en: 'Antihypertensives are strictly S4 Prescription medicines. Community pharmacies provide blood pressure monitoring services.',
      },
      rxOptions: {
        fa: 'مهارکننده‌های ACE، مسدودکننده‌های ARB، کانال‌های کلسیمی، دیورتیک‌ها و بتاپلوکرها با نسخه S4.',
        en: 'S4 Prescription ACE inhibitors, ARBs, Calcium Channel Blockers, Thiazides, and Beta-blockers.',
      },
    },
    instructions: {
      fa: '۱) پرهیز از قطع خودسرانه داروها حتی در صورت نرمال شدن فشار خون.\n۲) پرهیز از مصرف ترکیبات OTC حاوی سودوافدرین یا NSAIDهای مداوم که باعث افزایش فشار خون می‌شوند.\n۳) پایش دقیق تداخل خطرناک سه‌گانه کلیوی (Triple Whammy: ACEi/ARB + دیورتیک + NSAID).',
      en: '1) Counsel adherence; antihypertensives must not be stopped abruptly when BP normalizes.\n2) Avoid OTC decongestants (pseudoephedrine) and systemic NSAIDs which elevate blood pressure.\n3) Monitor for "Triple Whammy" AKI risk when combined with diuretics and NSAIDs.',
    },
    redFlags: {
      fa: ['بحران فشار خون (فشار سیستولی >۱۸۰ یا دیاستولی >۱۲۰) همراه با درد قفسه سینه، تاری دید یا سردرد شدید', 'علائم سکته مغزی (FAST: افتادگی صورت، ضعف دست، اختلال تکلم)'],
      en: ['Hypertensive Crisis (SBP >180 or DBP >120) with chest pain, vision changes, or severe headache', 'Acute stroke symptoms (FAST protocol: Facial droop, Arm weakness, Speech difficulty)'],
    },
    medicines: [
      {
        name: 'Perindopril Arginine 5mg - 10mg Tablets',
        brandExamples: 'Coversyl',
        dosing: '5mg once daily in the morning; increase to 10mg once daily after 4 weeks if needed.',
        pregnancySafety: 'Category D (Strictly contraindicated in pregnancy - fetal toxicity).',
        breastfeedingSafety: 'Caution advised; Enalapril preferred in lactation.',
        minAge: 'Adults',
        extraInfo: 'ACE inhibitor. Monitor for persistent dry cough and hyperkalemia. Avoid potassium supplements.'
      },
      {
        name: 'Telmisartan 40mg - 80mg Tablets',
        brandExamples: 'Micardis',
        dosing: '40mg once daily; may increase to 80mg once daily for resistant hypertension.',
        pregnancySafety: 'Category D (Contraindicated in pregnancy).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'Angiotensin II Receptor Blocker (ARB). Ideal first-line alternative if ACEi dry cough occurs.'
      },
      {
        name: 'Amlodipine Besylate 5mg - 10mg Tablets',
        brandExamples: 'Norvasc',
        dosing: '5mg once daily; may increase to 10mg once daily after 1-2 weeks.',
        pregnancySafety: 'Category C (Avoid unless essential).',
        breastfeedingSafety: 'Compatible.',
        minAge: 'Adults',
        extraInfo: 'Dihydropyridine Calcium Channel Blocker (CCB). Monitor for dose-dependent peripheral ankle edema.'
      },
      {
        name: 'Indapamide 1.5mg SR Tablets',
        brandExamples: 'Natrilix SR',
        dosing: '1 tablet (1.5mg) once daily in the morning with food.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Avoid (may suppress lactation).',
        minAge: 'Adults',
        extraInfo: 'Thiazide-like diuretic. Monitor serum electrolytes (potassium, sodium) and uric acid.'
      }
    ],
    nonPharmAdvice: [
      'Reduce dietary sodium intake (<2000mg/day).',
      'Engage in regular aerobic exercise (30 minutes most days).',
      'Limit alcohol and caffeine intake.',
      'Maintain regular home BP monitoring log.'
    ],
    clinicalNotes: ['Beware of the "Triple Whammy" (ACEi/ARB + Diuretic + NSAID) causing acute renal failure in elderly patients.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-heart-failure',
    categoryId: 'cardio',
    name: {
      fa: 'نارسایی احتقانی قلب (Heart Failure & HFrEF)',
      en: 'Congestive Heart Failure (HFrEF & HFpEF)',
    },
    synonyms: ['نارسایی قلبی', 'ادم ریوی', 'تنگی نفس قلبی', 'HFrEF', 'CHF', 'Entresto', 'Spironolactone'],
    overview: {
      fa: 'ناتوانی قلب در پمپاژ کافی خون برای برآوردن نیازهای متابولیک بافت‌ها، همراه با احتباس مایعات و تنگی نفس فعالیتی.',
      en: 'Complex clinical syndrome resulting from structural or functional cardiac impairment leading to reduced cardiac output and elevated filling pressures.',
    },
    pathophysiology: {
      fa: 'کاهش کسر تخلیه‌ای بطن چپ (LVEF) یا نقص در پرشدگی دیاستولی باعث احتقان وریدی، ادم محیطی پاها و ارتوپنه می‌شود.',
      en: 'Impaired ventricular contractility or relaxation triggering neurohormonal activation (RAAS and SNS) and venous congestion.',
    },
    treatment: {
      firstLine: {
        fa: 'درمان چهارگانه استاندارد (Fantastic Four): ARNI/ACEi + بتابلوکر اختصاصی (Bisoprolol/Carvedilol) + آنتاگونیست MRA (Spironolactone) + مهارکننده SGLT2 (Dapagliflozin/Empagliflozin).',
        en: 'Guideline-directed medical therapy (GDMT): ARNI (Sacubitril/Valsartan) + Beta-blocker + MRA (Spironolactone) + SGLT2i (Dapagliflozin).',
      },
      otcOptions: {
        fa: 'داروهای OTC نارسایی قلبی وجود ندارد؛ پایش وزن روزانه با ترازوی خانگی جهت تشخیص زودهنگام احتباس مایعات الزامی است.',
        en: 'No OTC treatment; daily weight monitoring is the vital self-management protocol.',
      },
      rxOptions: {
        fa: 'داروهای دیورتیک لوپ (Frusemide)، ترکیبات ARNI، دیگوکسین و وازوپرسورها با نسخه S4.',
        en: 'Loop diuretics (Frusemide), ARNI, Ivabradine, Digoxin (S4).',
      },
    },
    instructions: {
      fa: '۱) وزن‌کشی روزانه اول صبح پس از تخلیه ادرار و ثبت در دفترچه.\n۲) مراجعه فوری در صورت افزایش وزن بیش از ۲ کیلوگرم در ۲ روز متوالی.\n۳) پرهیز اکید از NSAIDها و داروهای محتوی سدیم بالا (آنتی‌اسیدهای جوشان).',
      en: '1) Daily morning weight logging after voiding.\n2) Report weight gain >2kg in 2 days (indicates fluid retention).\n3) Strictly avoid NSAIDs and high-sodium effervescent products.',
    },
    redFlags: {
      fa: ['تنگی نفس حاد استراحتی یا حمله‌ای شبانه (PND)', 'ادم شدید بالا رونده پاها تا بالای زانو', 'سبکی سر، سرگیجه وضعیتی شدید یا سنکوپ'],
      en: ['Acute pulmonary edema, orthopnea, or Paroxysmal Nocturnal Dyspnea', 'Rapidly worsening peripheral edema to thighs', 'Syncope, acute confusion, or profound hypotension'],
    },
    medicines: [
      {
        name: 'Sacubitril / Valsartan 24/26mg, 49/51mg, 97/103mg',
        brandExamples: 'Entresto',
        dosing: 'Start 49/51mg twice daily (or 24/26mg if low baseline BP); target dose 97/103mg twice daily.',
        pregnancySafety: 'Category D (Strictly contraindicated).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'ARNI (Angiotensin Receptor-Neprilysin Inhibitor). Requires mandatory 36-hour washout when switching from ACE inhibitors to avoid angioedema.'
      },
      {
        name: 'Bisoprolol Fumarate 1.25mg - 10mg Tablets',
        brandExamples: 'Cardicor, Bisoprolol Sandoz',
        dosing: 'Start 1.25mg once daily morning; titrate slowly every 2-4 weeks to target 10mg daily.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Monitor infant for bradycardia.',
        minAge: 'Adults',
        extraInfo: 'Cardioselective beta-1 blocker with proven mortality reduction in HFrEF. Do not stop abruptly.'
      },
      {
        name: 'Spironolactone 25mg - 50mg Tablets',
        brandExamples: 'Aldactone',
        dosing: '25mg once daily with morning meal; titrate to 50mg daily based on potassium/eGFR.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'Adults',
        extraInfo: 'Mineralocorticoid receptor antagonist (MRA). Monitor serum potassium and creatinine at 1, 4, and 12 weeks.'
      },
      {
        name: 'Dapagliflozin 10mg Tablets',
        brandExamples: 'Forxiga',
        dosing: '10mg once daily in the morning with or without food.',
        pregnancySafety: 'Category D.',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'SGLT2 inhibitor for HFrEF and HFpEF. Counsel on genital perineal hygiene and hydration.'
      },
      {
        name: 'Frusemide 40mg Tablets',
        brandExamples: 'Lasix, Urex',
        dosing: '20-40mg once or twice daily (morning/midday to avoid nocturia); adjust per weight changes.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'All ages',
        extraInfo: 'Loop diuretic for symptomatic congestion relief. Flexible self-dosing based on daily weight.'
      }
    ],
    nonPharmAdvice: [
      'Fluid restriction (typically 1.5-2L daily) in symptomatic fluid overload.',
      'Low sodium diet (<2g daily).',
      'Daily morning weight monitoring.'
    ],
    clinicalNotes: ['NSAIDs are strictly contraindicated as they cause fluid retention and blunt diuretic efficacy.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-atrial-fibrillation',
    categoryId: 'cardio',
    name: {
      fa: 'فیبریلاسیون دهلیزی و پیشگیری از لخته (Atrial Fibrillation)',
      en: 'Atrial Fibrillation & Anticoagulation Prophylaxis',
    },
    synonyms: ['AF', 'آریتمی قلبی', 'تپش قلب نامنظم', 'وارفارین', 'Eliquis', 'Xarelto', 'Pradaxa'],
    overview: {
      fa: 'شایع‌ترین آریتمی قلبی پایدار مشخص‌شده با فعالیت الکتریکی نامنظم و سریع دهلیزها و افزایش ۵ برابری خطر سکته مغزی ناشی از ترومبوآمبولی.',
      en: 'Supraventricular tachyarrhythmia with uncoordinated atrial activation leading to ineffective atrial contraction and high stroke risk.',
    },
    pathophysiology: {
      fa: 'انقباض ناقص دهلیز چپ باعث رکود خون در دهلیز و تشکیل لخته در گوشک دهلیزی چپ (LAA) می‌شود.',
      en: 'Stasis of blood in the left atrial appendage increases thromboembolism risk, calculated by CHA2DS2-VA score.',
    },
    treatment: {
      firstLine: {
        fa: 'ضدانعقادهای خوراکی مستقیم (DOACها مثل Apixaban, Rivaroxaban) به عنوان خط اول پیشگیری از ترومبوآمبولی + کنترل ریتم/تعداد ضربان.',
        en: 'Direct Oral Anticoagulants (DOACs: Apixaban, Rivaroxaban, Dabigatran) or Warfarin for stroke prevention + rate/rhythm control.',
      },
      otcOptions: {
        fa: 'داروهای DOAC و وارفارین منحصراً S4 هستند. پایش تداخلات دارویی OTC با ضددردها و گیاهان دارویی (Ginkgo, St John’s wort) در داروخانه.',
        en: 'All systemic anticoagulants are S4. Pharmacists monitor OTC interaction risks (NSAIDs, St John\'s Wort).',
      },
      rxOptions: {
        fa: 'DOACها، وارفارین، داروهای کنترل ریت ضربان (Metoprolol, Sotalol, Amiodarone) با نسخه S4.',
        en: 'S4 DOACs, Warfarin, Beta-blockers, Calcium Channel Blockers, Amiodarone.',
      },
    },
    instructions: {
      fa: '۱) مصرف دقیق و سر وقت ضدانعقادها بدون فراموش کردن دوزها.\n۲) پرهیز از مصرف همزمان مسکن‌های NSAID (ایبوپروفن/ناپروکسن) به دلیل خطر بالای خونریزی داخلی.\n۳) گزارش هرگونه خونریزی غیرمعمول، مدفوع سیاه یا کبودی‌های گسترده.',
      en: '1) Strict compliance with DOAC/Warfarin dosing schedules.\n2) Avoid concurrent OTC NSAID use due to extreme bleeding hazards.\n3) Immediately report black tarry stools, epistaxis, or severe bruising.',
    },
    redFlags: {
      fa: ['علائم سکته مغزی ایسکمیک (فلج نیمی از بدن، تاری دید، تکلم نامفهوم)', 'خونریزی ماژور گوارشی یا استفراغ خونی', 'سردرد شدید ناگهانی (شک به خونریزی مغزی)'],
      en: ['FAST stroke signs: facial drooping, arm weakness, slurred speech', 'Major hemorrhage or coffee-ground hematemesis', 'Sudden severe thunderclap headache'],
    },
    medicines: [
      {
        name: 'Apixaban 2.5mg / 5mg Tablets',
        brandExamples: 'Eliquis',
        dosing: '5mg twice daily with or without food. Reduce to 2.5mg twice daily if ≥2 criteria: age ≥80y, weight ≤60kg, serum creatinine ≥133µmol/L.',
        pregnancySafety: 'Category C (Avoid).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'Direct Factor Xa inhibitor (DOAC). High adherence critical due to short 12h half-life. No routine INR required.'
      },
      {
        name: 'Rivaroxaban 15mg / 20mg Tablets',
        brandExamples: 'Xarelto',
        dosing: '20mg once daily with the evening meal (15mg once daily if CrCl 30-49 mL/min).',
        pregnancySafety: 'Category C (Avoid).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'Factor Xa inhibitor. Must be taken WITH FOOD to ensure adequate bioavailability for 15mg and 20mg tablets.'
      },
      {
        name: 'Warfarin Sodium 1mg, 2mg, 3mg, 5mg Tablets',
        brandExamples: 'Coumadin, Marevan (Do not interchange brands)',
        dosing: 'Individualised based on INR monitoring (target INR 2.0 - 3.0 for non-valvular AF). Taken at 6:00 PM daily.',
        pregnancySafety: 'Category D (Teratogenic - strictly contraindicated).',
        breastfeedingSafety: 'Compatible with infant monitoring.',
        minAge: 'All ages',
        extraInfo: 'Vitamin K antagonist. Brands Coumadin and Marevan are NOT bioequivalent and must NOT be substituted. Maintain stable dietary vitamin K.'
      },
      {
        name: 'Metoprolol Succinate 23.75mg - 190mg Tablets',
        brandExamples: 'Betaloc CR, Minax',
        dosing: '50-100mg once daily morning for ventricular rate control in AF.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'Adults',
        extraInfo: 'Cardioselective beta-blocker for ventricular rate control. Swallow whole, do not chew.'
      },
      {
        name: 'Digoxin 62.5mcg - 250mcg Tablets',
        brandExamples: 'Lanoxin PG (62.5mcg), Lanoxin (250mcg)',
        dosing: '125-250mcg once daily (62.5mcg in renal impairment / elderly).',
        pregnancySafety: 'Category A.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'All ages',
        extraInfo: 'Cardiac glycoside for rate control in sedentary AF patients. Narrow therapeutic index (target level 0.5-0.9 ng/mL).'
      }
    ],
    nonPharmAdvice: [
      'Carry an Anticoagulant Alert Card or Medical Alert bracelet.',
      'Limit alcohol consumption.',
      'Avoid high-impact contact sports.'
    ],
    clinicalNotes: ['DOACs require baseline and regular renal function checks (Cockcroft-Gault CrCl) to determine appropriate dosing.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-dyslipidemia',
    categoryId: 'cardio',
    name: {
      fa: 'اختلالات چربی خون و هیپرکلسترولمی (Dyslipidemia & Hypercholesterolemia)',
      en: 'Dyslipidemia, Hypercholesterolemia & CVD Prevention',
    },
    synonyms: ['کلسترول بالا', 'چربی خون', 'تری‌گلیسرید', 'Statin', 'Lipitor', 'Crestor', 'Ezetimibe'],
    overview: {
      fa: 'افزایش غیرطبیعی سطح کلسترول LDL، تری‌گلیسریدها یا کاهش کلسترول HDL که منجر به تشکیل پلاک‌های آترواسکلروزی در دیواره عروق می‌شود.',
      en: 'Abnormal serum lipid profile predisposing to atherosclerosis, coronary artery disease, and peripheral vascular disease.',
    },
    pathophysiology: {
      fa: 'اکسیداسیون ذرات LDL در لایه اینتیمای عروق باعث جذب ماکروفاژها، تشکیل سلول‌های فوم و پیشرفت پلاک فیبروزی می‌گردد.',
      en: 'Subendothelial retention of apolipoprotein B-containing lipoproteins causing inflammatory atherosclerotic plaque formation.',
    },
    treatment: {
      firstLine: {
        fa: 'استاتین‌های با توان بالا (Atorvastatin 20-80mg یا Rosuvastatin 10-40mg) و در صورت عدم دستیابی به هدف افزودن Ezetimibe.',
        en: 'High-intensity HMG-CoA reductase inhibitor (Atorvastatin, Rosuvastatin) + Ezetimibe for targets.',
      },
      otcOptions: {
        fa: 'مکمل‌های OTC روغن ماهی اومیگا-۳ و استرول‌های گیاهی به عنوان مکمل سبک زندگی، اما جایگزین استاتین در پیشگیری اولیه/ثانویه نمی‌باشند.',
        en: 'OTC Plant sterols, Omega-3 Fish Oils; cannot replace statins in high-risk cardiovascular patients.',
      },
      rxOptions: {
        fa: 'استاتین‌ها، ازتیمایب، مهارکننده‌های PCSK9 (Evolocumab) و مشتقات فیبرات با نسخه S4.',
        en: 'Statins, Ezetimibe, PCSK9 inhibitors, Fibrates (S4).',
      },
    },
    instructions: {
      fa: '۱) مصرف منظم استاتین ترجیحاً هنگام عصر یا شب (به ویژه سیمواستاتین و پراواستاتین).\n۲) گزارش دردهای عضلانی غیرعادی، ضعف شدید یا تیره شدن رنگ ادرار.\n۳) پرهیز از مصرف مقادیر زیاد آب گریپ‌فروت به دلیل تداخل با CYP3A4.',
      en: '1) Take short-acting statins at night to align with peak hepatic cholesterol synthesis.\n2) Report unexplained muscle pain, tenderness, or weakness.\n3) Avoid excessive grapefruit juice with simvastatin/atorvastatin (CYP3A4 inhibition).',
    },
    redFlags: {
      fa: ['میوپاتی شدید و رابدوومیولیز با ادرار چای‌مانند و نارسایی حاد کلیه', 'زردی پوست و چشم‌ها و تهوع شدید ناشی از سمیت کبدی'],
      en: ['Rhabdomyolysis presenting with severe proximal muscle weakness and dark tea-colored urine', 'Jaundice and markedly elevated hepatic transaminases (>3x ULN)'],
    },
    medicines: [
      {
        name: 'Atorvastatin 10mg, 20mg, 40mg, 80mg Tablets',
        brandExamples: 'Lipitor, Lorstat, Atorvachol',
        dosing: '20-80mg once daily at any time of day with or without food. Titrate after 4 weeks.',
        pregnancySafety: 'Category D (Strictly contraindicated in pregnancy and breastfeeding).',
        breastfeedingSafety: 'Contraindicated.',
        minAge: 'Adults & Children >10y',
        extraInfo: 'HMG-CoA reductase inhibitor. Potent LDL-C reduction (>50% with 40-80mg). Report unexplained muscle aches or dark urine.'
      },
      {
        name: 'Rosuvastatin 5mg, 10mg, 20mg, 40mg Tablets',
        brandExamples: 'Crestor, Rosumed',
        dosing: '10-20mg once daily; max 40mg daily (max 20mg in Asian patients or severe renal impairment).',
        pregnancySafety: 'Category D (Contraindicated).',
        breastfeedingSafety: 'Contraindicated.',
        minAge: 'Adults & Children >10y',
        extraInfo: 'Hydrophilic high-intensity statin with lower risk of CYP-mediated drug interactions.'
      },
      {
        name: 'Ezetimibe 10mg Tablets',
        brandExamples: 'Ezetrol',
        dosing: '10mg once daily with or without food, alone or combined with a statin.',
        pregnancySafety: 'Category B3 (Avoid with statins).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults & Children >10y',
        extraInfo: 'Niemann-Pick C1-Like 1 (NPC1L1) inhibitor. Blocks intestinal cholesterol absorption; provides extra 15-20% LDL reduction when added to statin.'
      },
      {
        name: 'Fenofibrate 145mg Tablets',
        brandExamples: 'Lipanthyl 145mg',
        dosing: '145mg once daily with or without food.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'PPAR-alpha agonist. First-line for severe hypertriglyceridemia (TG >10 mmol/L) to prevent acute pancreatitis.'
      }
    ],
    nonPharmAdvice: [
      'Adopt a Mediterranean-style diet rich in vegetables, legumes, whole grains, and healthy fats.',
      'Reduce saturated and trans fat intake.',
      'Achieve 150 minutes of moderate-intensity physical activity weekly.'
    ],
    clinicalNotes: ['If statin intolerance occurs, consider alternate-day dosing or switching from lipophilic (atorvastatin) to hydrophilic (rosuvastatin/pravastatin).'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-diabetes-t2',
    categoryId: 'cardio',
    name: {
      fa: 'دیابت نوع ۲ (Type 2 Diabetes Mellitus)',
      en: 'Type 2 Diabetes Mellitus & Glycemic Control',
    },
    synonyms: ['دیابت', 'قند خون بالا', 'دیابت نوع دو', 'T2DM', 'Hyperglycemia', 'Metformin', 'Jardiance'],
    overview: {
      fa: 'اختلال برنامه‌ریزی‌شده و مزمن متابولیسم کربوهیدرات مشخص‌شده با مقاومت به انسولین و نقص نسبی در ترشح انسولین.',
      en: 'Progressive metabolic disorder characterized by peripheral insulin resistance and relative pancreatic beta-cell dysfunction.',
    },
    pathophysiology: {
      fa: 'افزایش گلوکز خون باعث پرنوشی (Polydipsia)، پرادراری (Polyuria)، خستگی و آسیب عروق کوچک و بزرگ (میکرو و ماکروواسکولار) می‌شود.',
      en: 'Hyperglycemia leads to polyuria, polydipsia, fatigue, and long-term microvascular and macrovascular complications.',
    },
    treatment: {
      firstLine: {
        fa: 'آموزش دیابت و رژیم غذایی + Metformin (خط اول) و در صورت عدم کنترل افزودن SGLT2i (Empagliflozin) یا GLP-1 RA (Semaglutide).',
        en: 'Lifestyle & Diabetes Education + Metformin (1st line), supplemented with SGLT2i (Empagliflozin) or GLP-1 RA (Semaglutide).',
      },
      otcOptions: {
        fa: 'دستگاه‌های تست قند خون (BGL Monitors)، نوار تست قند و سوزن لانست (طرح NDSS). ارائه خدمات Diabetes MedsCheck در داروخانه.',
        en: 'Blood glucose meters, lancets, test strips (NDSS subsidized scheme). Pharmacist-led Diabetes MedsCheck reviews.',
      },
      rxOptions: {
        fa: 'متفورمین، مهارکننده‌های SGLT2، اگونیست‌های GLP-1، مهارکننده‌های DPP-4، سولفونیل‌اوره‌ها و انسولین با نسخه S4.',
        en: 'Metformin, SGLT2 inhibitors, GLP-1 Receptor Agonists, DPP-4 inhibitors, Sulfonylureas, and Insulin (S4).',
      },
    },
    instructions: {
      fa: '۱) بررسی شیوه‌های مراقبت از پا و معاینه سالانه چشم جهت پیشگیری از رتینوپاتی و پای دیابتی.\n۲) آگاهی از علائم افت قند خون (Hypoglycemia: تعریق، لرزش، گیجی) و درمان با قاعده ۱۵-۱۵ (۱۵ گرم قند سریع‌الجذب).\n۳) قطع SGLT2i در ایام روزه‌داری یا بیماری‌های حاد/جراحی جهت پیشگیری از کتواسیدوز دیابتی با قند نرمال (eDKA).',
      en: '1) Emphasize foot care and annual eye examinations for retinopathy screening.\n2) Train on hypoglycemia recognition and "Rule of 15" (15g fast-acting carbs).\n3) Hold SGLT2 inhibitors during acute illness or perioperative fasting to prevent eDKA.',
    },
    redFlags: {
      fa: ['کتواسیدوز دیابتی (DKA) همراه با بوی تنفس میوه‌ای (استون)، تهوع، استفراغ و تنفس کوسمال', 'افت شدید قند خون و از دست رفتن هوشیاری', 'زخم‌های پوستی بهبودنیابنده در پاها'],
      en: ['Diabetic Ketoacidosis (DKA) with fruity breath, Kussmaul breathing, and confusion', 'Severe hypoglycemia causing loss of consciousness or seizures', 'Non-healing foot ulcers or signs of gangrene'],
    },
    medicines: [
      {
        name: 'Metformin Hydrochloride 500mg, 850mg, 1000mg / XR 500mg, 1000mg',
        brandExamples: 'Diabex, Diaformin, Diabex XR',
        dosing: 'Start 500mg once daily with dinner; titrate weekly by 500mg to target 2000mg daily in divided doses (with meals).',
        pregnancySafety: 'Category C (Commonly used under specialist guidance).',
        breastfeedingSafety: 'Compatible.',
        minAge: 'Adults & Children >10y',
        extraInfo: 'Biguanide. First-line gold standard for T2DM. Must be taken WITH MEALS to minimize GI distress. Temporarily withhold before IV iodinated contrast.'
      },
      {
        name: 'Empagliflozin 10mg, 25mg Tablets',
        brandExamples: 'Jardiance',
        dosing: '10mg once daily in the morning; may increase to 25mg daily for additional glycemic control.',
        pregnancySafety: 'Category D (Contraindicated).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'SGLT2 inhibitor. Proven cardiovascular and renal risk reduction. Counsel on mycotic genital infections and holding during fasting/surgery.'
      },
      {
        name: 'Semaglutide 0.25mg, 0.5mg, 1mg Subcutaneous Pen',
        brandExamples: 'Ozempic',
        dosing: 'Start 0.25mg SC once weekly for 4 weeks, then increase to 0.5mg weekly. May increase to 1mg weekly after ≥4 weeks if needed.',
        pregnancySafety: 'Category D (Discontinue at least 2 months prior to planned pregnancy).',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'GLP-1 Receptor Agonist. Delays gastric emptying and promotes satiety. Robust HbA1c and weight reduction. Store unused pens in refrigerator (2°C-8°C).'
      },
      {
        name: 'Sitagliptin 100mg Tablets',
        brandExamples: 'Januvia',
        dosing: '100mg once daily with or without food (reduce dose if CrCl <50 mL/min).',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'DPP-4 inhibitor. Weight-neutral, low intrinsic hypoglycemia risk. Do not combine with GLP-1 agonists.'
      },
      {
        name: 'Gliclazide 30mg, 60mg Modified Release Tablets',
        brandExamples: 'Diamicron 60mg MR',
        dosing: '30-120mg once daily with breakfast.',
        pregnancySafety: 'Category C (Avoid - insulin preferred in pregnancy).',
        breastfeedingSafety: 'Avoid (risk of infant hypoglycemia).',
        minAge: 'Adults',
        extraInfo: 'Sulfonylurea insulin secretagogue. Educate patient on hypoglycemia symptoms and management (Rule of 15).'
      }
    ],
    nonPharmAdvice: [
      'Daily foot inspections for cuts, blisters, redness, or swelling.',
      'Annual dilated eye examinations for diabetic retinopathy.',
      'Regular HbA1c testing every 3-6 months (target <7% for most adults).'
    ],
    clinicalNotes: ['Hold SGLT2 inhibitors (Jardiance, Forxiga) 3 days prior to major surgery or during severe dehydrating illness to prevent euglycemic DKA.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-hypothyroidism',
    categoryId: 'cardio',
    name: {
      fa: 'کم‌کاری تیروئید (Hypothyroidism & Hashimoto’s)',
      en: 'Hypothyroidism, Hashimoto’s & Thyroid Replacement',
    },
    synonyms: ['تیروئید کم‌کار', 'هاشیموتو', 'لووتیروکسین', 'Thyroid', 'Levothyroxine', 'Oroxine', 'Eutroxsig'],
    overview: {
      fa: 'کمبود هورمون‌های تیروئیدی ناشی از نارسایی اولیه تیروئید (عمدتاً تیروئیدیت خودایمنی هاشیموتو) همراه با کندی متابولیسم عمومی بدن.',
      en: 'Systemic deficiency of thyroid hormones leading to generalized slowing of metabolic processes, fatigue, and cold intolerance.',
    },
    pathophysiology: {
      fa: 'کاهش سنتز هورمون‌های T4 و T3 منجر به افزایش فیدبک منفی و ترشح بیش از حد TSH از هیپوفیز می‌گردد.',
      en: 'Reduced circulating free T4 triggers elevated serum TSH. Symptoms include weight gain, dry skin, constipation, and bradycardia.',
    },
    treatment: {
      firstLine: {
        fa: 'لووتیروکسین سدیم خوراکی (Levothyroxine 50-150mcg daily) به صورت ناشتا صبحگاهی.',
        en: 'Levothyroxine sodium (T4) oral monotherapy, titrated to normalise serum TSH.',
      },
      otcOptions: {
        fa: 'مکمل‌های تیروئید OTC توصیه نمی‌شوند؛ لووتیروکسین یک داروی با پنجره باریک درمانی (NTI) است و تغییر برند نیازمند پایش TSH است.',
        en: 'Avoid unstandardized OTC thyroid glandulars. Levothyroxine is an NTI medicine requiring brand consistency.',
      },
      rxOptions: {
        fa: 'قرص‌های لووتیروکسین (Oroxine, Eutroxsig S4) با نگهداری در یخچال (۲ الی ۸ درجه در استرالیا).',
        en: 'Levothyroxine tablets (S4) requiring 2°C-8°C cold chain storage in Australia.',
      },
    },
    instructions: {
      fa: '۱) مصرف قرص‌ها صبح ناشتا همراه با آب معمولی حداقل ۳۰ تا ۶۰ دقیقه قبل از صبحانه یا چای/قهوه.\n۲) رعایت فاصله زمانی حداقل ۴ ساعت با مکمل‌های کلسیم، آهن و آنتی‌اسیدها (خطر شلاتاسیون و عدم جذب).\n۳) نگهداری قرص‌های لووتیروکسین در یخچال.',
      en: '1) Take with plain water upon waking, 30-60 minutes before breakfast or coffee.\n2) Separate by at least 4 hours from calcium, iron, and antacids.\n3) Store tablets in refrigerator (2°C-8°C).',
    },
    redFlags: {
      fa: ['کومای میکزدم (افت شدید دمای بدن، برادی‌کاردی شدید و کاهش سطح هوشیاری)', 'درد قفسه سینه یا تاکی‌آریتمی حاد پس از شروع یا افزایش دوز لووتیروکسین'],
      en: ['Myxedema coma (severe hypothermia, hypoventilation, altered mental state)', 'New onset angina or tachyarrhythmias after initiating thyroxine'],
    },
    medicines: [
      {
        name: 'Levothyroxine Sodium 25mcg, 50mcg, 75mcg, 100mcg, 125mcg, 200mcg',
        brandExamples: 'Eutroxsig, Oroxine (Store refrigerated 2°C - 8°C in Australia)',
        dosing: 'Adults: 50-100mcg daily; elderly/cardiac: 25mcg daily. Take once daily upon waking, 30-60 min before food with water.',
        pregnancySafety: 'Category A (Essential in pregnancy - doses often increase by 30-50%).',
        breastfeedingSafety: 'Compatible.',
        minAge: 'All ages (neonatal drops/liquid available)',
        extraInfo: 'Synthetic T4. Narrow therapeutic index. Store in refrigerator (2°C-8°C). Separate by ≥4h from calcium, iron, and antacids.'
      }
    ],
    nonPharmAdvice: [
      'Maintain consistent brand of levothyroxine to prevent bioavailability fluctuations.',
      'Check thyroid function tests (TSH) every 6-12 months once stabilized.'
    ],
    clinicalNotes: ['In elderly patients or those with ischemic heart disease, start with low doses (25mcg daily) and titrate slowly.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-migraine',
    categoryId: 'pain',
    name: {
      fa: 'میگرن و سردردهای عروقی (Migraine & Vascular Headache)',
      en: 'Migraine, Aura & Acute Cephalea',
    },
    synonyms: ['سردرد میگرنی', 'اورای میگرنی', 'فتوفوبی', 'Imigran', 'Sumatriptan', 'Zomig', 'Propranolol'],
    overview: {
      fa: 'اختلال سردرد نوروواسکولار عودکننده همراه با دردهای ضربان‌دار یک‌طرفه، تهوع، حساسیت شدید به نور و صدا و گاهی پیش‌درآمد عصبی (اورا).',
      en: 'Complex neurovascular disorder characterized by recurrent attacks of severe throbbing unilateral headache, nausea, photophobia, and phonophobia.',
    },
    pathophysiology: {
      fa: 'فعال‌شدن سیستم تری‌ژمینواسکولار و ترشح نوروپپتیدهای وازواکتیو مانند CGRP منجر به گشادی و التهاب نوروژنیک عروق مننژ می‌گردد.',
      en: 'Trigeminovascular system activation with release of inflammatory neuropeptides (CGRP, substance P) triggering sterile meningeal inflammation.',
    },
    treatment: {
      firstLine: {
        fa: 'درمان حاد: NSAIDهای سریع‌الاثر (Ibuprofen, Naproxen) + تریپتان‌ها (Sumatriptan 50mg S3 / Zolmitriptan S4) در شروع فاز سردرد.',
        en: 'Acute therapy: Simple analgesics/NSAIDs or 5-HT1B/1D agonists (Triptans: Sumatriptan S3, Zolmitriptan).',
      },
      otcOptions: {
        fa: 'سوماتریپتان ۵۰ میلی‌گرم تحت شرایط خاص به عنوان داروی S3 (Pharmacist Only) پس از تایید تشخیص قبلی پزشک توسط داروساز قابل تحویل است.',
        en: 'Sumatriptan 50mg is available as S3 Pharmacist Only for patients with a confirmed previous GP diagnosis of migraine.',
      },
      rxOptions: {
        fa: 'تریپتان‌های نسخه‌ای، داروهای پیشگیری‌کننده (Propranolol, Topiramate, Amitriptyline) و آنتی‌بادی‌های ضد CGRP (Aimovig, Emgality).',
        en: 'Prescription triptans, preventive therapies (Propranolol, Topiramate, Candesartan), and CGRP monoclonal antibodies (S4).',
      },
    },
    instructions: {
      fa: '۱) مصرف داروهای ضد میگرن در اولین نشانه‌های شروع سردرد (نه در فاز اورا برای تریپتان‌ها).\n۲) استراحت در اتاقی تاریک، خنک و ساکت.\n۳) محدود کردن مصرف مسکن‌ها به کمتر از ۱۰ تا ۱۵ روز در ماه جهت پیشگیری از سردرد ناشی از مصرف بیش از حد دارو (MOH).',
      en: '1) Take acute therapies at the earliest onset of headache phase.\n2) Rest in a dark, quiet room with cold compress.\n3) Limit analgesic use to <10-15 days/month to avoid Medication Overuse Headache (MOH).',
    },
    redFlags: {
      fa: ['سردرد صاعقه‌ای ناگهانی بسیار شدید (Thunderclap Headache)', 'سردرد همراه با تب، سفتی گردن، راش یا نقص عصبی کانونی', 'تغییر ناگهانی در الگوی همیشگی سردرد در افراد بالای ۵۰ سال'],
      en: ['Sudden explosive thunderclap headache reaching maximum intensity within seconds', 'Headache with fever, meningism, or focal neurological deficits', 'New onset headache in individuals >50 years (suspect Giant Cell Arteritis)'],
    },
    medicines: [
      {
        name: 'Sumatriptan 50mg, 100mg Tablets',
        brandExamples: 'Imigran, Sumagran',
        dosing: '50-100mg at onset of headache; may repeat after 2 hours if headache recurs (max 300mg in 24 hours).',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Withhold breastfeeding for 12 hours after dose.',
        minAge: '18 - 65 years',
        extraInfo: '5-HT1B/1D receptor agonist (Triptan). Take at earliest onset of headache (not aura). Contraindicated in ischemic heart disease and uncontrolled hypertension.'
      },
      {
        name: 'Naproxen Sodium 275mg, 550mg Tablets',
        brandExamples: 'Naprogesic, Naprosyn',
        dosing: '550-825mg at onset of headache, followed by 275mg every 6-8 hours as needed (max 1375mg/day).',
        pregnancySafety: 'Category C (Avoid in 3rd trimester).',
        breastfeedingSafety: 'Compatible for short-term use.',
        minAge: '>12 years',
        extraInfo: 'Potent long-acting NSAID for acute migraine attacks. Take with food.'
      },
      {
        name: 'Propranolol Hydrochloride 40mg, 100mg Tablets',
        brandExamples: 'Inderal, Deralin',
        dosing: '40mg 2-3 times daily; titrate up to 160-240mg daily in divided doses for migraine prophylaxis.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible with infant monitoring.',
        minAge: 'Adults',
        extraInfo: 'Non-cardioselective beta-blocker for migraine prophylaxis. Contraindicated in asthma and severe peripheral vascular disease.'
      }
    ],
    nonPharmAdvice: [
      'Keep a migraine trigger diary (sleep irregularity, stress, aged cheeses, nitrates, dehydration).',
      'Maintain regular sleep schedules and hydration.'
    ],
    clinicalNotes: ['Triptans are strictly contraindicated in uncontrolled hypertension, ischemic heart disease, and previous stroke/TIA.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-gout',
    categoryId: 'pain',
    name: {
      fa: 'نقرس و آرتریت حاد نقرسی (Gout & Acute Hyperuricemia)',
      en: 'Gout, Hyperuricemia & Crystal Arthritis',
    },
    synonyms: ['حمله نقرس', 'اسید اوریک بالا', 'پوداگرا', 'Colchicine', 'Allopurinol', 'Uric Acid'],
    overview: {
      fa: 'آرتریت التهابی حاد و فوق‌العاده دردناک ناشی از رسوب کریستال‌های مونو سدیم اورات در مفاصل (بویژه مفصل شست پا / Podagra).',
      en: 'Intensely painful inflammatory arthritis caused by monosodium urate crystal deposition in synovial fluid and periarticular tissues.',
    },
    pathophysiology: {
      fa: 'هیپراوریسمی مزمن (اسید اوریک سرم بالای ۰.۳۶ میلی‌مول) باعث کریستالیزاسیون و فاگوسیتوز توسط نوتروفیل‌ها و ایجاد التهاب حاد می‌گردد.',
      en: 'Super-saturation of serum urate (>0.36 mmol/L) precipitating crystal phagocytosis by macrophages and inflammasome activation.',
    },
    treatment: {
      firstLine: {
        fa: 'حمله حاد: کلشی‌سین دوز پایین (Colchicine 1mg و سپس 0.5mg بعد از ۶ ساعت) یا NSAIDs پرقدرت (Naproxen / Indomethacin) + آلوپورینول در فاز مزمن.',
        en: 'Acute flare: Low-dose Colchicine (1mg stat then 0.5mg 1h later) or potent NSAIDs. Chronic: Allopurinol (target urate <0.30 mmol/L).',
      },
      otcOptions: {
        fa: 'مسکن‌های OTC در حمله حاد موثر نیستند یا در صورت مصرف آسپرین کم‌دوز می‌توانند تداخل داشته باشند. کمپرس یخ موضعی.',
        en: 'Topical ice application. Note: Low-dose aspirin inhibits renal urate excretion and may prolong flares.',
      },
      rxOptions: {
        fa: 'کلشی‌سین (S4)، ناپروکسن/ایندومتاسین، گلوکوکورتیکوئیدهای خوراکی و آلوپورینول / فبوکسوستات با نسخه S4.',
        en: 'Colchicine (S4), systemic corticosteroids, Allopurinol, Febuxostat (S4).',
      },
    },
    instructions: {
      fa: '۱) شروع درمان حمله حاد در ۲۴ ساعت اول برای حداکثر اثربخشی.\n۲) عدم قطع یا شروع ناگهانی آلوپورینول در اوج حمله حاد بدون پوشش داروی ضدالتهاب.\n۳) کاهش مصرف الکل (به ویژه آبجو)، گوشت قرمز، غذاهای دریایی پرپورین و نوشیدنی‌های شیرین شده با فروکتوز.',
      en: '1) Initiate flare treatment within 24 hours of symptom onset.\n2) Do not abruptly stop or start Allopurinol during an acute flare without anti-inflammatory cover.\n3) Limit alcohol (especially beer), red meat, shellfish, and high-fructose corn syrup.',
    },
    redFlags: {
      fa: ['مفصل گرم، متورم با تب بالا و لرز (نیاز به آسپیراسیون جهت رد آرتریت سپتیک چرکی)', 'توفوس‌های پوستی زخمی شده و عفونی'],
      en: ['Hot swollen joint with systemic fever/chills (must exclude septic arthritis via joint aspiration)', 'Ulcerated or infected gouty tophi'],
    },
    medicines: [
      {
        name: 'Colchicine 500mcg Tablets',
        brandExamples: 'Colgout, Lengout',
        dosing: 'Acute attack: 1000mcg (1mg) stat, then 500mcg 1 hour later (max 1.5mg per course). Prophylaxis: 500mcg once or twice daily.',
        pregnancySafety: 'Category D (Contraindicated in pregnancy).',
        breastfeedingSafety: 'Caution advised.',
        minAge: 'Adults',
        extraInfo: 'Tubulin inhibitor. High-dose regimens are toxic and abandoned. Stop immediately if severe diarrhea or vomiting occurs. Major CYP3A4 / P-gp interactions.'
      },
      {
        name: 'Allopurinol 100mg, 300mg Tablets',
        brandExamples: 'Zyloprim, Progout',
        dosing: 'Start 100mg once daily (50mg in renal impairment); titrate every 2-4 weeks by 100mg to achieve serum urate <0.30 mmol/L (max 900mg/day).',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'Adults',
        extraInfo: 'Xanthine oxidase inhibitor for long-term urate-lowering therapy. Co-prescribe Colchicine 500mcg daily prophylaxis for first 3-6 months. Screen for HLA-B*5801 in high-risk Asian ancestry.'
      },
      {
        name: 'Febuxostat 80mg, 120mg Tablets',
        brandExamples: 'Adenuric',
        dosing: '80mg once daily; may increase to 120mg daily if serum urate remains >0.35 mmol/L after 2-4 weeks.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'Non-purine selective xanthine oxidase inhibitor. Potent alternative for patients intolerant or allergic to Allopurinol.'
      }
    ],
    nonPharmAdvice: [
      'Apply ice packs wrapped in a towel for 20 minutes to reduce local inflammation.',
      'Maintain vigorous hydration (>2-3L water daily) to facilitate renal urate clearance.'
    ],
    clinicalNotes: ['Allopurinol should be started at 50-100mg daily and titrated gradually while maintaining Colchicine prophylaxis for 3-6 months.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-soft-tissue-injury',
    categoryId: 'pain',
    name: {
      fa: 'آسیب بافت نرم و پیچ‌خوردگی مفصل (Soft Tissue Injury & Sprain)',
      en: 'Soft Tissue Injury, Sprains & Strains (RICER Protocol)',
    },
    synonyms: ['پیچ‌خوردگی', 'کشیدگی رباط', 'رگ‌به‌رگ شدن', 'Sprain', 'Strain', 'Voltaren', 'Ice Pack'],
    overview: {
      fa: 'آسیب مکانیکی حاد به رباط‌ها، تاندون‌ها یا فیبرهای عضلانی ناشی از چرخش ناگهانی یا ضربه همراه با درد موضعی و ادم بافتی.',
      en: 'Acute mechanical injury to ligaments, tendons, or muscle fibers resulting in localized pain, swelling, and hematoma formation.',
    },
    pathophysiology: {
      fa: 'پارگی میکروسکوپی فیبرهای بافتی منجر به پاسخ التهابی حاد، تجمع مایع عروقی و فعال شدن گیرنده‌های درد می‌شود.',
      en: 'Microscopic tearing of collagen fibers triggering acute capillary leakage, inflammatory edema, and nociceptor activation.',
    },
    treatment: {
      firstLine: {
        fa: 'پروتکل RICER در ۴۸ ساعت اول + مسکن‌های خوراکی کوتاه مدت (Paracetamol / Ibuprofen) یا ژل‌های NSAID موضعی (Voltaren Emulgel).',
        en: 'RICER protocol for first 48 hours + oral analgesics (Paracetamol, short-term Ibuprofen) or topical Voltaren gel.',
      },
      otcOptions: {
        fa: 'ژل‌های ولتارن (Diclofenac Gel S2)، باند کمپرس، پدهای یخ، پاراستامول و ایبوپروفن (S2).',
        en: 'Topical Diclofenac Emulgel (S2), Compression bandages, Ice packs, Paracetamol & Ibuprofen.',
      },
      rxOptions: {
        fa: 'ارزیابی رادیولوژی (X-Ray / MRI) جهت نفی شکستگی و ارجاع به فیزیوتراپیست.',
        en: 'Diagnostic imaging (X-Ray / MRI) to exclude fractures, and physiotherapy referral.',
      },
    },
    instructions: {
      fa: '۱) اجرای کامل ۴۸ ساعت اول RICER: استراحت (Rest)، یخ (Ice ۱۵ دقیقه هر ۲ ساعت)، کمپرس (Compression)، بالا نگه‌داشتن (Elevation) و ارجاع (Referral).\n۲) پرهیز مطلق از عوامل HARM در ۴۸ ساعت اول: گرما (Heat)، الکل (Alcohol)، دویدن (Running) و ماساژ (Massage).',
      en: '1) Implement RICER protocol rigorously for the first 48 hours (Rest, Ice 15m q2h, Compression, Elevation, Referral).\n2) Strictly avoid HARM factors in first 48h: Heat, Alcohol, Running, Massage.',
    },
    redFlags: {
      fa: ['ناتوانی مطلق در تحمل وزن روی عضو (Weight-bearing inability - قوانین Ottawa Ankle Rules)', 'دفرمیتی و تغییر شکل واضح استخوان', 'بی‌حسی یا سردی ناشی از اختلال خون‌رسانی'],
      en: ['Inability to bear weight immediately and for 4 steps (Ottawa Ankle Rules)', 'Visible bony deformity or crepitus', 'Distal neurovascular compromise'],
    },
    medicines: [
      {
        name: 'Diclofenac Diethylammonium 1.16% Gel',
        brandExamples: 'Voltaren Emulgel',
        dosing: 'Apply 2-4g (cherry to walnut size) to affected area 3-4 times daily for up to 7-14 days. Rub gently.',
        pregnancySafety: 'Category C (Avoid in 3rd trimester).',
        breastfeedingSafety: 'Safe for short-term localized use.',
        minAge: '>12 years',
        extraInfo: 'Do not use under occlusive dressings or on broken skin.'
      },
      {
        name: 'Paracetamol 500mg Tablets',
        brandExamples: 'Panadol, Panamax',
        dosing: '500-1000mg every 4-6 hours as needed (maximum 4000mg per 24 hours).',
        pregnancySafety: 'Category A (Safe in pregnancy).',
        breastfeedingSafety: 'Safe in breastfeeding.',
        minAge: '>1 month (paediatric drops/suspensions available)',
        extraInfo: 'First-line oral analgesic for mild-to-moderate musculoskeletal discomfort.'
      }
    ],
    nonPharmAdvice: [
      'RICER: Rest the limb, Ice for 15-20 min every 2 hours, Compress with elastic bandage, Elevate above heart level.',
      'Avoid NO-HARM: No Heat, No Alcohol, No Running/Exercise, No Massage in the first 48-72 hours.'
    ],
    clinicalNotes: ['Topical NSAIDs have comparable efficacy to oral NSAIDs for acute sprains with significantly reduced systemic GI adverse effects.'],
    relatedShelfProducts: ['prod-voltaren-gel', 'prod-panadol-500'],
  },
  {
    id: 'dis-osteoporosis',
    categoryId: 'pain',
    name: {
      fa: 'پوکی استخوان و پیشگیری از شکستگی (Osteoporosis & Bone Density)',
      en: 'Osteoporosis, Fragility Fractures & Bone Health',
    },
    synonyms: ['استئوپوروز', 'تراکم استخوان', 'سنجش تراکم استخوان', 'Prolia', 'Fosamax', 'Denosumab'],
    overview: {
      fa: 'بیماری اسکلتی سیستمیک مشخص‌شده با کاهش توده استخوانی و تخریب ریزساختار استخوان که منجر به افزایش شکنندگی استخوان‌ها می‌شود.',
      en: 'Systemic skeletal disorder characterized by low bone mineral density (T-score ≤ -2.5) and microarchitectural deterioration predisposing to fragility fractures.',
    },
    pathophysiology: {
      fa: 'عدم تعادل بین بازجذب استخوانی توسط استئوکلاست‌ها و تشکیل استخوان توسط استئوبلاست‌ها (بویژه پس از یائسگی با افت استروژن).',
      en: 'Osteoclastic bone resorption exceeding osteoblastic bone formation, markedly accelerated by postmenopausal estrogen decline.',
    },
    treatment: {
      firstLine: {
        fa: 'بیس‌فسفونات‌های خوراکی (Alendronate 70mg weekly) یا تزریقی (Zoledronic Acid) یا دنوزوماب (Prolia 60mg زیرجلدی هر ۶ ماه) + کلسیم و ویتامین D.',
        en: 'Antiresorptive therapy: Oral Bisphosphonates (Alendronate weekly) or Denosumab 60mg SC 6-monthly + Calcium & Vitamin D3.',
      },
      otcOptions: {
        fa: 'مکمل‌های کلسیم کربنات/سیترات (۶۰۰ الی ۱۲۰۰ میلی‌گرم) و ویتامین D3 (1000 IU روزانه) OTC (S2/Unscheduled).',
        en: 'OTC Calcium carbonate/citrate (600-1200mg) and Vitamin D3 (1000 IU/day) supplementation.',
      },
      rxOptions: {
        fa: 'بیس‌فسفونات‌ها، دنوزوماب، تری‌پاراتاید و رالوکسیفن با نسخه S4.',
        en: 'Prescription bisphosphonates, Denosumab, Teriparatide (anabolic), Raloxifene (S4).',
      },
    },
    instructions: {
      fa: '۱) بیس‌فسفونات‌های خوراکی باید صبح ناشتا با یک لیوان کامل آب معمولی مصرف شده و بیمار حداقل ۳۰ دقیقه در وضعیت کاملاً ایستاده بماند.\n۲) تزریق منظم دنوزوماب هر ۶ ماه سر موعد (تاخیر در تزریق باعث افت شدید تراکم استخوان و شکستگی مهره‌ها می‌شود).\n۳) انجام معاینات منظم دندانپزشکی قبل از شروع داروهای ضد بازجذب جهت پیشگیری از استئونکروز فک (ONJ).',
      en: '1) Oral bisphosphonates: take with a full glass of tap water on an empty stomach upon waking; remain upright for ≥30 min.\n2) Strict adherence to 6-monthly Denosumab injections (rebound vertebral fractures occur if delayed).\n3) Dental review prior to antiresorptive therapy to minimize Osteonecrosis of the Jaw (ONJ) risk.',
    },
    redFlags: {
      fa: ['درد ناگهانی و شدید ستون فقرات پس از خم شدن یا سرفه (شک به شکستگی فشاری مهره)', 'درد مبهم و مداوم در ران یا کشاله ران (شک به شکستگی غیرمعمول فمور AFF)', 'استخوان فک اکسپوز شده و غیرقابل ترمیم پس از کشیدن دندان'],
      en: ['Sudden severe thoracic/lumbar back pain indicating acute vertebral compression fracture', 'Dull aching groin or thigh pain (atypical femoral fracture warning)', 'Exposed necrotic jaw bone following dental extraction (ONJ)'],
    },
    medicines: [
      {
        name: 'Alendronate Sodium 70mg Once-Weekly Tablets',
        brandExamples: 'Fosamax 70mg, Alendro 70mg',
        dosing: '70mg once weekly in the morning upon waking with a full glass of plain tap water (>200mL). Remain upright for ≥30 min.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'Oral bisphosphonate antiresorptive. Strict dosing: swallow whole with water on empty stomach, stay upright ≥30 min to prevent esophageal ulceration.'
      },
      {
        name: 'Denosumab 60mg / 1mL Solution in Pre-filled Syringe',
        brandExamples: 'Prolia',
        dosing: '60mg administered as a single subcutaneous injection into thigh, abdomen, or upper arm once every 6 months.',
        pregnancySafety: 'Category D (Contraindicated).',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'RANKL monoclonal antibody inhibitor. Must receive dose strictly every 6 months (rebound rapid bone loss occurs if delayed). Ensure adequate calcium & Vit D.'
      },
      {
        name: 'Zoledronic Acid 5mg / 100mL IV Infusion',
        brandExamples: 'Aclasta',
        dosing: '5mg administered as a single intravenous infusion over ≥15 minutes once every 12 months.',
        pregnancySafety: 'Category D.',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'Potent annual IV bisphosphonate. Ensure hydration before infusion to reduce acute phase reaction (flu-like symptoms).'
      },
      {
        name: 'Calcium Carbonate 600mg + Colecalciferol 500 IU Tablets',
        brandExamples: 'Caltrate + Vitamin D',
        dosing: '1-2 tablets daily with food.',
        pregnancySafety: 'Category A.',
        breastfeedingSafety: 'Compatible.',
        minAge: 'All ages',
        extraInfo: 'Essential mineral and vitamin co-therapy for all patients receiving antiresorptive treatments.'
      }
    ],
    nonPharmAdvice: [
      'Engage in regular weight-bearing exercises and resistance training.',
      'Implement fall-prevention measures in the home (remove loose rugs, install bathroom rails).',
      'Maintain adequate dietary dairy and protein intake.'
    ],
    clinicalNotes: ['Patients taking bisphosphonates must maintain adequate vitamin D and calcium levels to prevent hypocalcemia.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-depression-anxiety',
    categoryId: 'neuro',
    name: {
      fa: 'اختلالات افسردگی و اضطراب فراگیر (Depression & Generalized Anxiety)',
      en: 'Major Depressive Disorder & Generalized Anxiety (MDD & GAD)',
    },
    synonyms: ['افسردگی', 'اضطراب', 'پانیک', 'SSRI', 'Lexapro', 'Zoloft', 'Escitalopram', 'Sertraline'],
    overview: {
      fa: 'اختلالات شایع خلقی و روانپزشکی مشخص‌شده با خلق پایین پایدار، کاهش انگیزه، افکار منفی، تحریک‌پذیری و تنش مداوم اضطرابی.',
      en: 'Prevalent mental health disorders characterized by persistent low mood, anhedonia, fatigue, pervasive worry, and autonomic arousal.',
    },
    pathophysiology: {
      fa: 'نقص در انتقال عصبی منوآمین‌ها (سروتونین، نورآدرنالین و دوپامین) در مدارهای کورتیکولیمبیک مغز و اختلال محور HPA.',
      en: 'Dysregulation of monoaminergic neurotransmission (5-HT, NA) in cortico-limbic circuits alongside neuroendocrine stress axis hyperactivation.',
    },
    treatment: {
      firstLine: {
        fa: 'روان‌درمانی شناختی-رفتاری (CBT) + داروهای SSRI (مانند Escitalopram, Sertraline) به عنوان خط اول فارماکوتراپی.',
        en: 'Psychological therapy (CBT) + First-line SSRIs (Escitalopram, Sertraline) or SNRIs (Venlafaxine, Duloxetine).',
      },
      otcOptions: {
        fa: 'مکمل‌های گیاهی مثل St John’s Wort به دلیل القای آنزیمی قوی و تداخلات شدید و خطر سندرم سروتونین نباید با ضدافسردگی‌ها مصرف شوند.',
        en: 'Caution against OTC St John’s Wort due to severe CYP3A4 induction and fatal Serotonin Syndrome risks with prescription SSRIs.',
      },
      rxOptions: {
        fa: 'تمامی داروهای ضدافسردگی SSRI/SNRI، میرتازاپین، بوپروپیون و بنزودیازپین‌های کوتاه‌مدت با نسخه S4.',
        en: 'Prescription SSRIs, SNRIs, Mirtazapine, Bupropion, and adjunctive short-term anxiolytics (S4).',
      },
    },
    instructions: {
      fa: '۱) اثرات درمانی داروهای ضدافسردگی معمولاً ۲ تا ۴ هفته پس از شروع درمان آغاز می‌شود و نباید زودتر قطع شوند.\n۲) پرهیز از قطع ناگهانی دارو (خطر سندرم قطع و بازگشت شدید علائم).\n۳) پایش دقیق هرگونه افکار خودآسیب‌رسان بویژه در سنین زیر ۲۵ سال در هفته‌های ابتدایی.',
      en: '1) SSRIs require 2-4 weeks to demonstrate clinical benefits; adherence is critical.\n2) Do not discontinue abruptly; taper gradually to prevent discontinuation symptoms.\n3) Closely monitor for emergence of suicidal ideation during the first few weeks in young adults.',
    },
    redFlags: {
      fa: ['افکار خودکشی فعال یا اقدام به خودآسیبی (ارجاع اورژانسی به Lifeline 13 11 14 یا بیمارستان)', 'سندرم سروتونین: تب بالا، کلونوس عضلانی، لرزش و هذیان', 'سندرم مانیا و پرحرفی/کم‌خوابی شدید ناشی از سوئیچ دوقطبی'],
      en: ['Active suicidal ideation or intent (immediate crisis intervention: Lifeline 13 11 14 or 000)', 'Serotonin Syndrome triad: neuromuscular excitability, autonomic storms, altered mental state', 'Manic switch with grandiosity, racing thoughts, and sleep reduction'],
    },
    medicines: [
      {
        name: 'Escitalopram Oxalate 10mg, 20mg Tablets',
        brandExamples: 'Lexapro, Esipram',
        dosing: 'Start 10mg once daily (morning or evening); may increase to 20mg once daily after 2-4 weeks.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible with infant monitoring.',
        minAge: 'Adults',
        extraInfo: 'Highly selective SSRI. Fastest onset among SSRIs. Do not discontinue abruptly; taper gradually. Low risk of CYP interactions.'
      },
      {
        name: 'Sertraline Hydrochloride 50mg, 100mg Tablets',
        brandExamples: 'Zoloft, Setrona',
        dosing: 'Start 50mg once daily with breakfast; titrate by 50mg increments every 2-4 weeks (max 200mg/day).',
        pregnancySafety: 'Category C (Preferred first-line SSRI in pregnancy and breastfeeding).',
        breastfeedingSafety: 'Preferred first-line antidepressant in lactation.',
        minAge: 'Adults & Children >6y (for OCD)',
        extraInfo: 'SSRI of choice for post-myocardial infarction and in postpartum depression/breastfeeding.'
      },
      {
        name: 'Venlafaxine XR 75mg, 150mg Extended-Release Capsules',
        brandExamples: 'Efexor-XR',
        dosing: 'Start 75mg once daily with food; titrate to 150-225mg daily for dual 5-HT/NA inhibition.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'Adults',
        extraInfo: 'Serotonin and Noradrenaline Reuptake Inhibitor (SNRI). Monitor blood pressure periodically at higher doses (>150mg).'
      },
      {
        name: 'Mirtazapine 15mg, 30mg, 45mg Orally Disintegrating Tablets',
        brandExamples: 'Avanza SolTab, Mirtazon',
        dosing: 'Start 15mg once daily at bedtime; titrate to 30-45mg at bedtime.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'Adults',
        extraInfo: 'Noradrenergic and specific serotonergic antidepressant (NaSSA). Promotes appetite and sleep (sedative H1 antagonism at lower doses).'
      }
    ],
    nonPharmAdvice: [
      'Maintain regular physical activity (walking, jogging) which elevates brain BDNF levels.',
      'Practice mindfulness meditation and good sleep hygiene.',
      'Access Medicare Better Access Mental Health Care Plan through GP.'
    ],
    clinicalNotes: ['When switching antidepressants, always adhere to recommended washout periods (e.g. 5 weeks for Fluoxetine to MAOI).'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-insomnia',
    categoryId: 'neuro',
    name: {
      fa: 'بی‌خوابی و اختلالات خواب (Insomnia & Sleep Disturbances)',
      en: 'Insomnia, Circadian Rhythm Disorders & Sleep Hygiene',
    },
    synonyms: ['کم‌خوابی', 'بی‌خوابی مزمن', 'ملاتونین', 'Circadin', 'Doxylamine', 'Restavit', 'Temazepam'],
    overview: {
      fa: 'اشکال در شروع، تداوم یا کیفیت خواب علی‌رغم فراهم بودن شرایط مناسب، که منجر به اختلال در عملکرد روزانه می‌شود.',
      en: 'Persistent difficulty with sleep initiation, duration, consolidation, or quality, resulting in daytime cognitive or occupational impairment.',
    },
    pathophysiology: {
      fa: 'هایپرآروزال فیزیولوژیک و شناختی همراه با اختلال در ریتم ترشح ملاتونین اندوژن از غده پینه‌آل.',
      en: 'State of hyperarousal interacting with circadian rhythm disruption and impaired pineal melatonin secretion.',
    },
    treatment: {
      firstLine: {
        fa: 'آموزش بهداشت خواب و رفتاردرمانی شناختی بی‌خوابی (CBT-I) به عنوان خط اول، ملاتونین آهسته‌رهش (Circadin 2mg S3) در افراد بالای ۵۵ سال.',
        en: 'Cognitive Behavioral Therapy for Insomnia (CBT-I) is 1st line. Prolonged-release Melatonin 2mg (S3) for adults ≥55 years.',
      },
      otcOptions: {
        fa: 'آنتی‌هیستامین‌های سداتیو (Doxylamine مثل Restavit S3) برای مصرف بسیار کوتاه‌مدت (حداکثر چند روز)، ملاتونین ۲ میلی‌گرم آهسته‌رهش (S3) برای سنین بالای ۵۵ سال.',
        en: 'Short-term sedating antihistamines (Doxylamine S3) or prolonged-release Melatonin 2mg (S3 Pharmacist Only for ≥55 years).',
      },
      rxOptions: {
        fa: 'بنزودیازپین‌ها (Temazepam)، آگونیست‌های گیرنده بنزودیازپین Z-drugs (Zolpidem, Zopiclone) و آنتاگونیست‌های اورکسین (Suvorexant) با نسخه S4.',
        en: 'Z-drugs (Zolpidem), dual orexin receptor antagonists (Suvorexant), Temazepam (S4 short-term).',
      },
    },
    instructions: {
      fa: '۱) استفاده از رختخواب صرفاً برای خواب و روابط زناشویی؛ در صورت عدم به ثمر رسیدن خواب پس از ۲۰ دقیقه، ترک اتاق خواب.\n۲) پرهیز از نگاه کردن به صفحات نمایشگر (نور آبی) و پرهیز از کافئین و الکل قبل از خواب.\n۳) محدود کردن مصرف داروهای خواب‌آور به کمتر از ۱ الی ۲ هفته جهت پیشگیری از وابستگی و تحمل.',
      en: '1) Use bedroom only for sleep; if not asleep after 20 minutes, get out of bed.\n2) Avoid blue light screens, caffeine after midday, and evening alcohol.\n3) Restrict pharmacotherapy to 1-2 weeks maximum to prevent tolerance and rebound insomnia.',
    },
    redFlags: {
      fa: ['آپنه انسدادی خواب (خروپف شدید همراه با وقفه‌های تنفسی و خواب‌آلودگی مفرط روزانه)', 'سوء مصرف یا وابستگی شدید به بنزودیازپین‌ها'],
      en: ['Obstructive Sleep Apnea (OSA) with witnessed apneas and daytime somnolence', 'Severe dependence or escalation of hypnotic dosages'],
    },
    medicines: [
      {
        name: 'Melatonin 2mg Prolonged-Release Tablets',
        brandExamples: 'Circadin',
        dosing: '1 tablet (2mg) once daily 1-2 hours before bedtime after food for up to 13 weeks.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Avoid.',
        minAge: '≥55 years (S3 Pharmacist Only without prescription)',
        extraInfo: 'Mimics endogenous melatonin secretion. Non-addictive, preserves sleep architecture. Available as S3 Pharmacist Only for adults ≥55y.'
      },
      {
        name: 'Doxylamine Succinate 25mg Tablets',
        brandExamples: 'Restavit, Dozile',
        dosing: '1-2 tablets (25-50mg) 20-30 minutes before bedtime with water for a maximum of 3-7 consecutive days.',
        pregnancySafety: 'Category A.',
        breastfeedingSafety: 'Caution (may cause infant drowsiness and suppress lactation).',
        minAge: '>12 years',
        extraInfo: 'First-generation sedating H1 antihistamine (S3). For short-term temporary insomnia only; anticholinergic side effects (dry mouth, morning drowsiness).'
      },
      {
        name: 'Temazepam 10mg Tablets',
        brandExamples: 'Normison, Temaze',
        dosing: '10-20mg once daily 30 minutes before bedtime for max 1-2 weeks.',
        pregnancySafety: 'Category C (Avoid in pregnancy).',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'Schedule 4 Benzodiazepine hypnotic. High risk of tolerance, dependence, and next-day residual hangover. Restrict to short courses.'
      }
    ],
    nonPharmAdvice: [
      'Maintain fixed wake-up times 7 days a week, regardless of sleep duration.',
      'Ensure morning sunlight exposure to anchor circadian rhythm.',
      'Avoid daytime naps.'
    ],
    clinicalNotes: ['Doxylamine and diphenhydramine cause anticholinergic side effects (confusion, urinary retention, dry mouth) and should be avoided in the elderly.'],
    relatedShelfProducts: [],
  },
  {
    id: 'dis-neuropathic-pain',
    categoryId: 'neuro',
    name: {
      fa: 'دردهای نوروپاتیک و نوروپاتی محیطی (Neuropathic Pain & Neuralgia)',
      en: 'Neuropathic Pain, Post-Herpetic Neuralgia & Sciatica',
    },
    synonyms: ['درد عصب', 'سوزش پا', 'نوروپاتی دیابتی', 'سیاتیک', 'Lyrica', 'Pregabalin', 'Gabapentin', 'Endep'],
    overview: {
      fa: 'درد ناشی از ضایعه یا بیماری اولیه در سیستم عصبی سوماتوسنسوری، مشخص‌شده با سوزش مداوم، شوک‌های الکتریکی و آلودینیا (درد ناشی از لمس ملایم).',
      en: 'Pain arising as a direct consequence of a lesion or disease affecting the somatosensory nervous system, presenting with burning, shooting, or electric shock sensations.',
    },
    pathophysiology: {
      fa: 'افزایش بیان کانال‌های سدیمی و کلسیمی ولتاژدار در فیبرهای عصبی آسیب‌دیده منجر به شلیک خودبه‌خودی و حساس‌شدگی مرکزی و محیطی می‌گردد.',
      en: 'Ectopic pacemaker activity in injured axons and upregulation of alpha-2-delta calcium channel subunits causing central sensitization.',
    },
    treatment: {
      firstLine: {
        fa: 'گاباپنتینوئیدها (Pregabalin / Gabapentin)، ضدافسردگی‌های سه‌حلقه‌ای (Amitriptyline) یا SNRIها (Duloxetine).',
        en: 'First-line: Gabapentinoids (Pregabalin, Gabapentin), TCAs (Amitriptyline), or SNRIs (Duloxetine).',
      },
      otcOptions: {
        fa: 'کرم‌های کپسایسین موضعی (Zostrix S2) و پچ‌های لیدوکائین موضعی برای دردهای متمرکز سطحی (مثل نورالژی پس از زونا).',
        en: 'Topical Capsaicin cream (Zostrix S2) and Lidocaine patches for localized peripheral neuropathies.',
      },
      rxOptions: {
        fa: 'پرگابالین، گاباپنتین، دولوکستین، آمی‌تریپتیلین و پچ‌های لیدوکائین ۵٪ با نسخه S4 (تحت نظارت SafeScript).',
        en: 'Pregabalin, Gabapentin, Duloxetine, Amitriptyline, Lidocaine 5% patches (S4 / SafeScript monitored).',
      },
    },
    instructions: {
      fa: '۱) شروع داروها با دوز بسیار پایین شبانه و افزایش تدریجی جهت به حداقل رساندن سرگیجه و خواب‌آلودگی.\n۲) کرم کپسایسین در ابتدای مصرف سوزش ایجاد می‌کند که با تکرار مداوم (۳ تا ۴ بار روزانه) پس از چند هفته کاهش می‌یابد.\n۳) شستشوی دقیق دست‌ها پس از مصرف کرم کپسایسین و پرهیز از تماس با چشم.',
      en: '1) Titrate oral medications slowly to mitigate dizziness and sedation.\n2) Capsaicin causes initial burning that diminishes with regular 3-4 times daily application over 2-4 weeks.\n3) Wash hands thoroughly after capsaicin application; avoid eyes and mucous membranes.',
    },
    redFlags: {
      fa: ['سندرم دم اسب (Cauda Equina: بی‌اختیاری ادرار یا مدفوع، بی‌حسی زین‌مانند مقعد)', 'ضعف حرکتی حاد و افتادگی مچ پا (Foot drop)', 'نوروپاتی سریع‌پیشرونده با علائم سیستمیک'],
      en: ['Cauda Equina Syndrome: saddle anesthesia, acute urinary retention or fecal incontinence', 'Acute motor weakness or progressive foot drop', 'Rapidly ascending peripheral weakness (Guillain-Barré warning)'],
    },
    medicines: [
      {
        name: 'Pregabalin 25mg, 75mg, 150mg, 300mg Capsules',
        brandExamples: 'Lyrica',
        dosing: 'Start 75mg twice daily; titrate after 3-7 days to 150mg twice daily (max 600mg/day).',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Not recommended.',
        minAge: 'Adults',
        extraInfo: 'Alpha-2-delta calcium channel subunit ligand. First-line for diabetic peripheral neuropathy and post-herpetic neuralgia. Counsel on dizziness, weight gain, and peripheral edema.'
      },
      {
        name: 'Amitriptyline Hydrochloride 10mg, 25mg, 50mg Tablets',
        brandExamples: 'Endep',
        dosing: 'Start 10-25mg once daily at bedtime; increase by 10-25mg weekly to 50-75mg at bedtime.',
        pregnancySafety: 'Category C.',
        breastfeedingSafety: 'Compatible with monitoring.',
        minAge: 'Adults',
        extraInfo: 'Tricyclic antidepressant for chronic neuropathic pain. High anticholinergic effects (dry mouth, blurred vision, urinary retention). Avoid in cardiac conduction block.'
      },
      {
        name: 'Duloxetine Hydrochloride 30mg, 60mg Capsules',
        brandExamples: 'Cymbalta',
        dosing: '30mg once daily with food for 1 week, then increase to 60mg once daily.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Avoid.',
        minAge: 'Adults',
        extraInfo: 'SNRI indicated for painful diabetic peripheral neuropathy. Swallow whole with food to avoid nausea.'
      },
      {
        name: 'Capsaicin 0.075% Cream',
        brandExamples: 'Zostrix HP',
        dosing: 'Apply a small amount to painful area 3-4 times daily. Wash hands thoroughly after application.',
        pregnancySafety: 'Category B3.',
        breastfeedingSafety: 'Compatible.',
        minAge: '>18 years',
        extraInfo: 'Depletes Substance P in peripheral nociceptors. Transient burning sensation upon initial applications (declines with regular use).'
      }
    ],
    nonPharmAdvice: [
      'Inspect feet daily in diabetic peripheral neuropathy.',
      'Wear protective, well-cushioned footwear.',
      'Consider Transcutaneous Electrical Nerve Stimulation (TENS).'
    ],
    clinicalNotes: ['Simple analgesics (Paracetamol) and standard NSAIDs have minimal efficacy in purely neuropathic pain.'],
    relatedShelfProducts: [],
  }
];

// Unified Master Diseases Registry containing ALL 43 OTC diseases + Core Chronic Conditions
export const DISEASES_REGISTRY: DiseaseInfo[] = [
  ...CORE_CLINICAL_DISEASES,
  ...CONVERTED_OTC_DISEASES.filter(
    (otc) => !CORE_CLINICAL_DISEASES.some((core) => core.id === otc.id)
  ),
];

export { CONVERTED_OTC_DISEASES };

export function findDiseaseGuide(
  target: string | { id?: string; name?: { en?: string; fa?: string }; title?: { en?: string; fa?: string }; category?: { en?: string; fa?: string }; patientProfile?: { presentation?: { en?: string; fa?: string } } } | null | undefined
): DiseaseInfo | null {
  if (!target) return null;
  const guide = findHandbookGuide(target);
  if (guide) {
    const found = DISEASES_REGISTRY.find(
      (d) => d.id === guide.id || d.id === `otc-${guide.id}` || d.id === `dis-${guide.id}`
    );
    if (found) return found;
  }
  if (typeof target === 'string') {
    const clean = target.trim().toLowerCase();
    return (
      DISEASES_REGISTRY.find(
        (d) => d.id === clean || d.name.en.toLowerCase().includes(clean) || d.name.fa.toLowerCase().includes(clean)
      ) || null
    );
  }
  const objId = (target.id || '').trim().toLowerCase();
  return DISEASES_REGISTRY.find((d) => d.id === objId) || null;
}
