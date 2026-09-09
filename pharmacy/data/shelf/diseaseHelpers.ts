import { Product, ClinicalSubCategory, ClinicalConcept } from '@/types/shelf';
import { CLINICAL_CONCEPTS_REGISTRY } from '@/data/shelf/clinicalConcepts';
import { DiseaseInfo, DISEASES_REGISTRY } from '@/data/diseasesRegistry';

export function getConceptsForProduct(prod: Product): ClinicalConcept[] {
  const explicit = prod.conceptIds || [];
  const autoDetected: string[] = [];

  const text = `${prod.brandName} ${prod.genericName} ${prod.activeIngredients} ${prod.indications.fa} ${prod.indications.en} ${prod.counselingPoints.map((c) => c.fa + ' ' + c.en).join(' ')}`.toLowerCase();

  if (text.includes('hypokalemia') || text.includes('پتاسیم')) autoDetected.push('concept-hypokalemia');
  if (text.includes('dysphagia') || text.includes('دیسفاژی') || text.includes('بلع')) autoDetected.push('concept-dysphagia');
  if (text.includes('pregnancy') || text.includes('بارداری') || text.includes('teratogen') || text.includes('تراتوژن')) autoDetected.push('concept-pregnancy-teratogen');
  if (text.includes('cyp3a4') || text.includes('استاتین') || text.includes('statin') || text.includes('rhabdomyolysis') || text.includes('رابدوومیولیز')) autoDetected.push('concept-cyp3a4-inhibitor');
  if (text.includes('cyp2d6') || text.includes('کدئین') || text.includes('codeine') || text.includes('ترامادول') || text.includes('tramadol')) autoDetected.push('concept-cyp2d6-inhibitor');
  if (text.includes('cyp2c19') || text.includes('clopidogrel') || text.includes('کلپیدوگرل') || text.includes('امپرازول') || text.includes('omeprazole')) autoDetected.push('concept-cyp2c19-inhibitor');
  if (text.includes('cyp inducer') || text.includes('القاکننده') || text.includes('inducer') || text.includes('cyp1a2') || text.includes('سیگار')) autoDetected.push('concept-cyp-inducer');
  if (prod.requiresProjectStop || text.includes('project stop') || text.includes('pseudoephedrine') || text.includes('سودوائفدرین')) autoDetected.push('concept-project-stop');
  if (text.includes('8 weeks') || text.includes('۸ هفته') || text.includes('سرفه مزمن') || text.includes('chronic cough')) autoDetected.push('concept-chronic-cough-8w');
  if (text.includes('ototoxicity') || text.includes('پرده گوش') || text.includes('tympanic') || text.includes('waxsol')) autoDetected.push('concept-ototoxicity');
  if (text.includes('rhabdomyolysis') || text.includes('رابدوومیولیز')) autoDetected.push('concept-rhabdomyolysis');
  if (text.includes('porphyria') || text.includes('پورفیری') || text.includes('thiopental') || text.includes('تیوپنتال')) autoDetected.push('concept-porphyria');
  if (text.includes('tdm') || text.includes('narrow therapeutic') || text.includes('پنجره درمانی') || text.includes('trough')) autoDetected.push('concept-tdm-narrow-nti');
  if (prod.schedule === 'S3' || text.includes('s3') || text.includes('pharmacist only') || text.includes('مشاوره مستقیم')) autoDetected.push('concept-s3-pharmacist-counseling');
  if (prod.calLabels.includes('CAL 4') || text.includes('2-8°c') || text.includes('یخچال') || text.includes('زنجیره سرد') || text.includes('cold chain')) autoDetected.push('concept-cold-chain-storage');
  if (text.includes('bleeding') || text.includes('خونریزی') || text.includes('ulcer') || text.includes('زخم گوارشی') || text.includes('melena')) autoDetected.push('concept-gastrointestinal-bleeding');
  if (text.includes('qtc') || text.includes('torsades') || text.includes('آریتمی')) autoDetected.push('concept-qtc-prolongation');
  if (text.includes('stevens-johnson') || text.includes('sjs') || text.includes('راش پوستی')) autoDetected.push('concept-sjs-ten-rash');
  if (text.includes('fentanyl') || text.includes('فنتانیل') || text.includes('حرارت')) autoDetected.push('concept-fentanyl-heat-hazard');
  if (text.includes('disulfiram') || text.includes('metronidazole') || text.includes('مترونیدازول') || text.includes('الکل')) autoDetected.push('concept-disulfiram-reaction');
  if (text.includes('siadh') || text.includes('hyponatremia') || text.includes('افت سدیم')) autoDetected.push('concept-siadh-hyponatremia');
  if (text.includes('red man') || text.includes('vancomycin') || text.includes('وانکومایسین')) autoDetected.push('concept-red-man-syndrome');
  if (text.includes('chickenpox') || text.includes('varicella') || text.includes('آبله‌مرغان') || text.includes('آبله مرغان') || text.includes('ibuprofen')) autoDetected.push('concept-chickenpox-ibuprofen');
  if (text.includes('triple whammy') || text.includes('سه‌گانه') || text.includes('spironolactone + meloxicam') || text.includes('acei + diuretic')) autoDetected.push('concept-triple-whammy');
  if (text.includes('chew and park') || text.includes('آدامس نیکوتین') || text.includes('park') || text.includes('nrt')) autoDetected.push('concept-chew-and-park');
  if (text.includes('ricer') || text.includes('harm') || text.includes('پیچ‌خوردگی') || text.includes('آسیب نرم')) autoDetected.push('concept-ricer-harm');
  if (text.includes('enterobiasis') || text.includes('pinworm') || text.includes('کرمک') || text.includes('۲ هفته') || text.includes('اعضای خانواده')) autoDetected.push('concept-pinworm-family-repeat');
  if (text.includes('antacid') || text.includes('آنتی‌اسید') || text.includes('mylanta') || text.includes('فاصله ۲ ساعت') || text.includes('2 hours')) autoDetected.push('concept-antacid-2h-separation');
  if (text.includes('naloxone') || text.includes('nyxoid') || text.includes('نالوکسون') || text.includes('اوردوز اپیوئید')) autoDetected.push('concept-naloxone-emergency');
  if (text.includes('mssa') || text.includes('mrsa') || text.includes('بتالاکتاماز') || text.includes('beta-lactamase') || text.includes('cephalexin') || text.includes('flucloxacillin')) autoDetected.push('concept-cephalexin-resistance');
  if (text.includes('acne') || text.includes('آکنه') || text.includes('clindamycin') || text.includes('کلیندامایسین') || text.includes('dalacin')) autoDetected.push('concept-acne-pregnancy-clindamycin');
  if (text.includes('shingrix') || text.includes('vaccine') || text.includes('واکسن') || text.includes('immunisation') || text.includes('فواصل')) autoDetected.push('concept-vaccine-spacing-rules');
  if (text.includes('clozapine') || text.includes('کلوزاپین') || text.includes('clopine') || text.includes('anc') || text.includes('آگرانولوسیتوز')) autoDetected.push('concept-clozapine-anc-monitoring');
  if (text.includes('ogtt') || text.includes('دیابت بارداری') || text.includes('gestational diabetes')) autoDetected.push('concept-ogtt-gestational-diabetes');
  if (text.includes('amiodarone') || text.includes('آمیودارون') || text.includes('cordarone') || text.includes('فیبروز ریوی')) autoDetected.push('concept-amiodarone-monitoring-toxicity');
  if (text.includes('methotrexate') || text.includes('متوترکسات') || text.includes('once weekly') || text.includes('یک بار در هفته')) autoDetected.push('concept-methotrexate-weekly-folic');
  if (text.includes('labetalol') || text.includes('لبتالول') || text.includes('trandate') || text.includes('فشارخون بارداری') || text.includes('pre-eclampsia')) autoDetected.push('concept-hypertension-pregnancy-labetalol');
  if (text.includes('serotonin') || text.includes('سروتونین') || text.includes('hunter') || text.includes('maoi') || text.includes('washout')) autoDetected.push('concept-ssri-serotonin-syndrome');
  if (text.includes('warfarin') || text.includes('وارفارین') || text.includes('coumadin') || text.includes('marevan') || text.includes('inr')) autoDetected.push('concept-warfarin-inr-reversal');

  const allIds = Array.from(new Set([...explicit, ...autoDetected]));
  return allIds.map((id) => CLINICAL_CONCEPTS_REGISTRY[id]).filter(Boolean);
}

export function getConceptsForSubCategory(sub: ClinicalSubCategory): ClinicalConcept[] {
  const explicit = sub.conceptIds || [];
  const autoDetected: string[] = [];

  const text = `${sub.titleFa} ${sub.titleEn} ${sub.clinicalPearlsFa.join(' ')} ${sub.clinicalPearlsEn.join(' ')} ${sub.redFlagsFa.join(' ')} ${sub.redFlagsEn.join(' ')}`.toLowerCase();

  if (text.includes('hypokalemia') || text.includes('پتاسیم')) autoDetected.push('concept-hypokalemia');
  if (text.includes('dysphagia') || text.includes('دیسفاژی') || text.includes('بلع')) autoDetected.push('concept-dysphagia');
  if (text.includes('pregnancy') || text.includes('بارداری') || text.includes('teratogen') || text.includes('تراتوژن')) autoDetected.push('concept-pregnancy-teratogen');
  if (text.includes('cyp3a4') || text.includes('استاتین') || text.includes('statin') || text.includes('rhabdomyolysis') || text.includes('رابدوومیولیز')) autoDetected.push('concept-cyp3a4-inhibitor');
  if (text.includes('cyp2d6') || text.includes('کدئین') || text.includes('codeine') || text.includes('ترامادول') || text.includes('tramadol')) autoDetected.push('concept-cyp2d6-inhibitor');
  if (text.includes('cyp2c19') || text.includes('clopidogrel') || text.includes('کلپیدوگرل') || text.includes('امپرازول') || text.includes('omeprazole')) autoDetected.push('concept-cyp2c19-inhibitor');
  if (text.includes('cyp inducer') || text.includes('القاکننده') || text.includes('inducer') || text.includes('cyp1a2') || text.includes('سیگار')) autoDetected.push('concept-cyp-inducer');
  if (text.includes('project stop') || text.includes('pseudoephedrine') || text.includes('سودوائفدرین')) autoDetected.push('concept-project-stop');
  if (text.includes('8 weeks') || text.includes('۸ هفته') || text.includes('سرفه مزمن') || text.includes('chronic cough')) autoDetected.push('concept-chronic-cough-8w');
  if (text.includes('ototoxicity') || text.includes('پرده گوش') || text.includes('tympanic') || text.includes('waxsol')) autoDetected.push('concept-ototoxicity');
  if (text.includes('rhabdomyolysis') || text.includes('رابدوومیولیز')) autoDetected.push('concept-rhabdomyolysis');
  if (text.includes('porphyria') || text.includes('پورفیری') || text.includes('thiopental') || text.includes('تیوپنتال')) autoDetected.push('concept-porphyria');
  if (text.includes('tdm') || text.includes('narrow therapeutic') || text.includes('پنجره درمانی') || text.includes('trough')) autoDetected.push('concept-tdm-narrow-nti');
  if (text.includes('s3') || text.includes('pharmacist only') || text.includes('مشاوره مستقیم')) autoDetected.push('concept-s3-pharmacist-counseling');
  if (text.includes('2-8°c') || text.includes('یخچال') || text.includes('زنجیره سرد') || text.includes('cold chain')) autoDetected.push('concept-cold-chain-storage');
  if (text.includes('bleeding') || text.includes('خونریزی') || text.includes('ulcer') || text.includes('زخم گوارشی') || text.includes('melena')) autoDetected.push('concept-gastrointestinal-bleeding');
  if (text.includes('qtc') || text.includes('torsades') || text.includes('آریتمی')) autoDetected.push('concept-qtc-prolongation');
  if (text.includes('stevens-johnson') || text.includes('sjs') || text.includes('راش پوستی')) autoDetected.push('concept-sjs-ten-rash');
  if (text.includes('fentanyl') || text.includes('فنتانیل') || text.includes('حرارت')) autoDetected.push('concept-fentanyl-heat-hazard');
  if (text.includes('disulfiram') || text.includes('metronidazole') || text.includes('مترونیدازول') || text.includes('الکل')) autoDetected.push('concept-disulfiram-reaction');
  if (text.includes('siadh') || text.includes('hyponatremia') || text.includes('افت سدیم')) autoDetected.push('concept-siadh-hyponatremia');
  if (text.includes('red man') || text.includes('vancomycin') || text.includes('وانکومایسین')) autoDetected.push('concept-red-man-syndrome');
  if (text.includes('chickenpox') || text.includes('varicella') || text.includes('آبله‌مرغان') || text.includes('آبله مرغان') || text.includes('ibuprofen')) autoDetected.push('concept-chickenpox-ibuprofen');
  if (text.includes('triple whammy') || text.includes('سه‌گانه') || text.includes('spironolactone + meloxicam') || text.includes('acei + diuretic')) autoDetected.push('concept-triple-whammy');
  if (text.includes('chew and park') || text.includes('آدامس نیکوتین') || text.includes('park') || text.includes('nrt')) autoDetected.push('concept-chew-and-park');
  if (text.includes('ricer') || text.includes('harm') || text.includes('پیچ‌خوردگی') || text.includes('آسیب نرم')) autoDetected.push('concept-ricer-harm');
  if (text.includes('enterobiasis') || text.includes('pinworm') || text.includes('کرمک') || text.includes('۲ هفته') || text.includes('اعضای خانواده')) autoDetected.push('concept-pinworm-family-repeat');
  if (text.includes('antacid') || text.includes('آنتی‌اسید') || text.includes('mylanta') || text.includes('فاصله ۲ ساعت') || text.includes('2 hours')) autoDetected.push('concept-antacid-2h-separation');
  if (text.includes('naloxone') || text.includes('nyxoid') || text.includes('نالوکسون') || text.includes('اوردوز اپیوئید')) autoDetected.push('concept-naloxone-emergency');

  const allIds = Array.from(new Set([...explicit, ...autoDetected]));
  return allIds.map((id) => CLINICAL_CONCEPTS_REGISTRY[id]).filter(Boolean);
}

export function getDiseasesForSubCategory(subcategoryIdOrDomainId: string): DiseaseInfo[] {
  const id = (subcategoryIdOrDomainId || '').toLowerCase().trim();
  
  // Comprehensive mappings for each subcategory and domain linking to registry disease entries
  const subcategoryDiseaseMap: Record<string, string[]> = {
    // ================= Category 1: Primary Care, OTC & First Aid =================
    // sub-1-1: Analgesics & Antipyretics (ضد درد و تب)
    'sub-1-1': [
      'otc-pain_relief',
      'dis-migraine',
      'dis-soft-tissue-injury',
      'dis-gout',
      'otc-mouth_ulcers',
      'otc-teething'
    ],
    // sub-1-2: Antifungals & Anthelmintics (داروهای ضد قارچ و ضد انگل)
    'sub-1-2': [
      'otc-tinea_infections',
      'otc-tinea_versicolor',
      'otc-vaginal_thrush',
      'otc-oral_thrush',
      'otc-worms_pinworms',
      'otc-scabies',
      'otc-headlice'
    ],
    // sub-1-3: Eye & Ear Conditions (بیماری‌های چشم و گوش)
    'sub-1-3': [
      'otc-bacterial_conjunctivitis',
      'otc-blepharitis',
      'otc-dry_eyes',
      'otc-stye',
      'otc-ear_wax',
      'otc-swimmers_ear'
    ],
    // sub-1-4: Respiratory, Cough, Cold & Allergy (دستگاه تنفس، سرماخوردگی، سرفه و آلرژی)
    'sub-1-4': [
      'dis-asthma',
      'dis-copd',
      'otc-hayfever',
      'otc-nasal_congestion',
      'otc-chesty_cough',
      'otc-dry_cough',
      'otc-sore_throat',
      'otc-smoking_cessation'
    ],
    // sub-1-5: Gastrointestinal, Acid, IBS, Constipation (دستگاه گوارش، اسید معده، ریفلاکس، یبوست و اسهال)
    'sub-1-5': [
      'otc-gord_heartburn',
      'otc-constipation',
      'otc-diarrhoea',
      'otc-haemorrhoids',
      'otc-anal_fissure',
      'otc-motion_sickness'
    ],
    // sub-1-6: Dermatology, Eczema & Skin Care (مراقبت‌های پوستی، درماتیت و اگزما)
    'sub-1-6': [
      'otc-eczema',
      'otc-acne',
      'otc-seborrhoeic_dermatitis',
      'otc-nappy_rash',
      'otc-cradle_cap',
      'otc-burns_sunburn',
      'otc-chilblains',
      'otc-corns_calluses',
      'otc-warts',
      'otc-stings_bites',
      'otc-cold_sores',
      'otc-shingles'
    ],
    // sub-1-7: Women's & Men's Health, Emergency Contraception, UTI & Oral Health (سلامت زنان و مردان، پیشگیری اضطراری و UTI)
    'sub-1-7': [
      'otc-uti_cystitis',
      'otc-vaginal_thrush',
      'otc-mouth_ulcers',
      'otc-dry_mouth',
      'otc-teething'
    ],

    // ================= Category 2: Cardiovascular & Renal Pharmacology =================
    // sub-2-1: Hypertension & RAAS (پرفشاری خون و سیستم رنین-آنژیوتانسین)
    'sub-2-1': [
      'dis-hypertension',
      'dis-heart-failure',
      'dis-diabetes-t2'
    ],
    // sub-2-2: Anticoagulants, Antiplatelets & Thrombosis (ضدانعقادها، ضدپلاکت‌ها و ترومبوز)
    'sub-2-2': [
      'dis-atrial-fibrillation',
      'dis-hypertension',
      'dis-dyslipidemia'
    ],
    // sub-2-3: Heart Failure & Antiarrhythmics (نارسایی قلبی و داروهای ضدآریتمی)
    'sub-2-3': [
      'dis-heart-failure',
      'dis-atrial-fibrillation',
      'dis-hypertension'
    ],
    // sub-2-4: Lipid-Lowering & Statins (کاهنده چربی خون و استاتین‌ها)
    'sub-2-4': [
      'dis-dyslipidemia',
      'dis-hypertension',
      'dis-diabetes-t2'
    ],

    // ================= Category 3: Central Nervous System & Mental Health =================
    // sub-3-1: Antidepressants & Mood Disorders (ضدافسردگی‌ها و اختلالات خلقی)
    'sub-3-1': [
      'dis-depression-anxiety',
      'dis-insomnia',
      'dis-neuropathic-pain'
    ],
    // sub-3-2: Antiepileptics & Neuropathic Pain (داروهای ضدتشنج و دردهای نوروپاتیک)
    'sub-3-2': [
      'dis-neuropathic-pain',
      'dis-migraine',
      'otc-shingles'
    ],
    // sub-3-3: Sedatives, Hypnotics & Anxiolytics (آرام‌بخش‌ها، خواب‌آورها و بنزودیازپین‌ها)
    'sub-3-3': [
      'dis-insomnia',
      'dis-depression-anxiety'
    ],
    // sub-3-4: Opioid Analgesia & Pain Management (مسکن‌های اپیوئیدی و مدیریت درد)
    'sub-3-4': [
      'dis-neuropathic-pain',
      'dis-migraine',
      'dis-gout',
      'dis-soft-tissue-injury',
      'otc-pain_relief'
    ],

    // ================= Category 4: Endocrine, Bone & Metabolic Diseases =================
    // sub-4-1: Diabetes Mellitus, Insulin, SGLT2i & GLP-1 (دیابت ملیتوس، انسولین و داروهای قند خون)
    'sub-4-1': [
      'dis-diabetes-t2',
      'dis-dyslipidemia',
      'dis-hypertension',
      'dis-neuropathic-pain'
    ],
    // sub-4-2: Osteoporosis & Bone Metabolism (پوکی استخوان و متابولیسم استخوان)
    'sub-4-2': [
      'dis-osteoporosis',
      'dis-gout',
      'dis-soft-tissue-injury'
    ],
    // sub-4-3: Thyroid Disorders & Hormone Replacement (اختلالات تیروئید و درمان جایگزینی هورمون)
    'sub-4-3': [
      'dis-hypothyroidism',
      'dis-dyslipidemia',
      'dis-osteoporosis'
    ],

    // ================= Category 5: Anti-Infectives & Immunisation =================
    // sub-5-1: Antibacterial Agents (آنتی‌بیوتیک‌های باکتریایی)
    'sub-5-1': [
      'otc-uti_cystitis',
      'otc-bacterial_conjunctivitis',
      'otc-blepharitis',
      'otc-swimmers_ear',
      'otc-sore_throat',
      'otc-acne'
    ],
    // sub-5-2: Antiviral Agents & Vaccines (داروهای ضدویروس و واکسن‌ها)
    'sub-5-2': [
      'otc-cold_sores',
      'otc-shingles',
      'otc-chickenpox',
      'dis-asthma',
      'dis-copd',
      'otc-sore_throat'
    ],

    // Domain ID aggregations when "All Subcategories / Domain Overview" is active
    'cat-1': [
      'otc-pain_relief',
      'dis-asthma',
      'dis-copd',
      'otc-hayfever',
      'otc-nasal_congestion',
      'otc-sore_throat',
      'otc-chesty_cough',
      'otc-dry_cough',
      'otc-gord_heartburn',
      'otc-constipation',
      'otc-diarrhoea',
      'otc-eczema',
      'otc-tinea_infections',
      'otc-vaginal_thrush',
      'otc-uti_cystitis',
      'otc-bacterial_conjunctivitis',
      'otc-swimmers_ear',
      'otc-mouth_ulcers',
      'dis-soft-tissue-injury',
      'dis-migraine'
    ],
    'cat-2': [
      'dis-hypertension',
      'dis-heart-failure',
      'dis-atrial-fibrillation',
      'dis-dyslipidemia',
      'dis-diabetes-t2'
    ],
    'cat-3': [
      'dis-depression-anxiety',
      'dis-insomnia',
      'dis-neuropathic-pain',
      'dis-migraine',
      'otc-pain_relief'
    ],
    'cat-4': [
      'dis-diabetes-t2',
      'dis-osteoporosis',
      'dis-hypothyroidism',
      'dis-dyslipidemia',
      'dis-gout'
    ],
    'cat-5': [
      'otc-uti_cystitis',
      'otc-cold_sores',
      'otc-shingles',
      'otc-bacterial_conjunctivitis',
      'otc-swimmers_ear',
      'otc-sore_throat',
      'dis-asthma',
      'dis-copd'
    ],
  };

  const matchedIds = subcategoryDiseaseMap[id] || [];
  if (matchedIds.length > 0) {
    const list = matchedIds
      .map((mId) => DISEASES_REGISTRY.find((d) => d.id === mId))
      .filter((d): d is DiseaseInfo => !!d);
    if (list.length > 0) return list;
  }

  // Smart fallback: search by category keyword in registry
  const keywordFallback = DISEASES_REGISTRY.filter((d) => {
    return (
      d.id.includes(id) ||
      d.categoryId.includes(id) ||
      (d.synonyms && d.synonyms.some((s) => s.toLowerCase().includes(id)))
    );
  });

  if (keywordFallback.length > 0) {
    return keywordFallback.slice(0, 6);
  }

  return DISEASES_REGISTRY.slice(0, 4);
}
