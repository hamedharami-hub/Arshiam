import { OTCDiseaseGuide } from './types';
import { OTC_HANDBOOK_DATA_PART1 } from './part1';
import { OTC_HANDBOOK_DATA_PART2 } from './part2';
import { OTC_HANDBOOK_DATA_PART3 } from './part3';

export const ALL_OTC_HANDBOOK_DISEASES: OTCDiseaseGuide[] = [
  ...OTC_HANDBOOK_DATA_PART1,
  ...OTC_HANDBOOK_DATA_PART2,
  ...OTC_HANDBOOK_DATA_PART3
];

export const OTC_HANDBOOK_DATA: OTCDiseaseGuide[] = ALL_OTC_HANDBOOK_DISEASES;

// Explicit Scenario-to-Handbook and Disease-to-Handbook Mapping Matrix
const SCENARIO_OR_DISEASE_MAP: Record<string, string | null> = {
  // Administrative Scenarios (No Clinical OTC Disease Monograph)
  'admin-lost-escript-mysl': null,
  'admin-third-party-pickup': null,
  'admin-medicare-copayment-safetynet': null,
  'admin-tax-invoice-sick-leave': null,
  'emergency-supply-continued-dispensing': null,
  'angry-wait-time-deescalation': null,

  // Clinical Scenarios -> Exact Handbook Disease ID
  'slang-ibuprofen-brand-vs-generic': 'pain_relief',
  'slang-severe-hayfever-bunged-nose': 'hayfever',
  'slang-motion-sickness-boat': 'motion_sickness',
  'slang-toddler-bark-panadol-baby': 'pain_relief',
  'cough-triage': 'chesty_cough',
  'hayfever-triage': 'hayfever',
  's3-pseudoephedrine': 'nasal_congestion',
  's3-pseudoephedrine-conflict': 'nasal_congestion',
  'coldsore-triage': 'cold_sores',
  'chickenpox-advisory': 'chickenpox',
  'hydrocortisone-triage': 'eczema',
  'pinworm-triage': 'worms_pinworms',
  'thrush-triage': 'vaginal_thrush',
  'shingrix-vaccine': 'shingles',
  'ear-triage': 'ear_wax',
  'dyspepsia-triage': 'gord_heartburn',
  'heartburn-gord-triage': 'gord_heartburn',
  'sunburn-triage': 'burns_sunburn',
  'musculoskeletal-triage': 'pain_relief',
  'diarrhea-triage': 'diarrhoea',
  'laxative-triage': 'constipation',
  'panadol-osteo-triage': 'pain_relief',
  'ankle-ricer-protocol': 'pain_relief',
  'nsaid-safety-check': 'pain_relief',
  'smoking-cessation-5as': 'smoking_cessation',
  'safescript-early-refill-s8': 'pain_relief',

  // Disease IDs (dis-* and otc-*)
  'dis-asthma': 'chesty_cough',
  'dis-copd': 'chesty_cough',
  'dis-hypertension': null,
  'dis-heart-failure': null,
  'dis-atrial-fibrillation': null,
  'dis-dyslipidemia': null,
  'dis-diabetes-t2': 'vaginal_thrush',
  'dis-hypothyroidism': null,
  'dis-migraine': 'pain_relief',
  'dis-gout': 'pain_relief',
  'dis-soft-tissue-injury': 'pain_relief',
  'dis-osteoporosis': 'pain_relief',
  'dis-depression-anxiety': null,
  'dis-insomnia': null,
  'dis-neuropathic-pain': 'pain_relief',

  // Direct disease mappings
  'acne': 'acne',
  'anal_fissure': 'anal_fissure',
  'blepharitis': 'blepharitis',
  'burns_sunburn': 'burns_sunburn',
  'chilblains': 'chilblains',
  'chickenpox': 'chickenpox',
  'cold_sores': 'cold_sores',
  'bacterial_conjunctivitis': 'bacterial_conjunctivitis',
  'conjunctivitis': 'bacterial_conjunctivitis',
  'constipation': 'constipation',
  'corns_calluses': 'corns_calluses',
  'chesty_cough': 'chesty_cough',
  'dry_cough': 'dry_cough',
  'cradle_cap': 'cradle_cap',
  'diarrhoea': 'diarrhoea',
  'diarrhea': 'diarrhoea',
  'dry_eyes': 'dry_eyes',
  'dry_mouth': 'dry_mouth',
  'ear_wax': 'ear_wax',
  'eczema': 'eczema',
  'gord_heartburn': 'gord_heartburn',
  'haemorrhoids': 'haemorrhoids',
  'hayfever': 'hayfever',
  'headlice': 'headlice',
  'motion_sickness': 'motion_sickness',
  'mouth_ulcers': 'mouth_ulcers',
  'nappy_rash': 'nappy_rash',
  'nasal_congestion': 'nasal_congestion',
  'pain_relief': 'pain_relief',
  'scabies': 'scabies',
  'seborrhoeic_dermatitis': 'seborrhoeic_dermatitis',
  'shingles': 'shingles',
  'smoking_cessation': 'smoking_cessation',
  'sore_throat': 'sore_throat',
  'stings_bites': 'stings_bites',
  'stye': 'stye',
  'swimmers_ear': 'swimmers_ear',
  'teething': 'teething',
  'oral_thrush': 'oral_thrush',
  'vaginal_thrush': 'vaginal_thrush',
  'tinea_infections': 'tinea_infections',
  'tinea_versicolor': 'tinea_versicolor',
  'uti_cystitis': 'uti_cystitis',
  'warts': 'warts',
  'worms_pinworms': 'worms_pinworms'
};

/**
 * Universal matcher for OTC Handbook Diseases
 * Accepts:
 *  - string (e.g., disease id, scenario id, keyword)
 *  - Scenario or Disease object
 */
export function findHandbookGuide(
  target: string | { id?: string; name?: { en?: string; fa?: string }; title?: { en?: string; fa?: string }; category?: { en?: string; fa?: string }; patientProfile?: { presentation?: { en?: string; fa?: string } } } | null | undefined
): OTCDiseaseGuide | null {
  if (!target) return null;

  // If string passed
  if (typeof target === 'string') {
    const clean = target.trim().toLowerCase().replace(/^otc-/, '');
    
    if (clean in SCENARIO_OR_DISEASE_MAP) {
      const targetId = SCENARIO_OR_DISEASE_MAP[clean];
      if (!targetId) return null;
      const found = ALL_OTC_HANDBOOK_DISEASES.find((h) => h.id === targetId);
      if (found) return found;
    }

    const direct = ALL_OTC_HANDBOOK_DISEASES.find((h) => h.id === clean);
    if (direct) return direct;

    // Substring match in condition or category
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => {
      const cond = d.condition.toLowerCase();
      const cat = d.category.toLowerCase();
      return cond.includes(clean) || cat.includes(clean);
    }) || null;
  }

  // Object handling (Scenario or DiseaseInfo)
  const objId = (target.id || '').trim().toLowerCase().replace(/^otc-/, '');
  
  if (objId in SCENARIO_OR_DISEASE_MAP) {
    const mappedId = SCENARIO_OR_DISEASE_MAP[objId];
    if (!mappedId) return null;
    const found = ALL_OTC_HANDBOOK_DISEASES.find((h) => h.id === mappedId);
    if (found) return found;
  }

  const directMatch = ALL_OTC_HANDBOOK_DISEASES.find((h) => h.id === objId);
  if (directMatch) return directMatch;

  const searchCorpus = `${target.id || ''} ${target.name?.en || ''} ${target.name?.fa || ''} ${target.title?.en || ''} ${target.title?.fa || ''} ${target.category?.en || ''} ${target.category?.fa || ''} ${target.patientProfile?.presentation?.en || ''} ${target.patientProfile?.presentation?.fa || ''}`.toLowerCase();

  // Clinical Keywords
  if (searchCorpus.includes('chesty cough') || searchCorpus.includes('خلطدار') || searchCorpus.includes('bisolvon chesty') || searchCorpus.includes('productive cough')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'chesty_cough') || null;
  }
  if (searchCorpus.includes('dry cough') || searchCorpus.includes('سرفه خشک') || searchCorpus.includes('rikodeine') || searchCorpus.includes('pholcodine') || searchCorpus.includes('dextromethorphan')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'dry_cough') || null;
  }
  if (searchCorpus.includes('cough') || searchCorpus.includes('سرفه')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'chesty_cough') || null;
  }
  if (searchCorpus.includes('hayfever') || searchCorpus.includes('allergic rhinitis') || searchCorpus.includes('آلرژی') || searchCorpus.includes('یونجه') || searchCorpus.includes('telfast') || searchCorpus.includes('zyrtec')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'hayfever') || null;
  }
  if (searchCorpus.includes('pseudoephedrine') || searchCorpus.includes('sudafed') || searchCorpus.includes('bunged') || searchCorpus.includes('congestion') || searchCorpus.includes('احتقان') || searchCorpus.includes('گرفتگی بینی')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'nasal_congestion') || null;
  }
  if (searchCorpus.includes('cold sore') || searchCorpus.includes('تبخال') || searchCorpus.includes('zovirax') || searchCorpus.includes('aciclovir')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'cold_sores') || null;
  }
  if (searchCorpus.includes('chickenpox') || searchCorpus.includes('آبله مرغان') || searchCorpus.includes('varicella')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'chickenpox') || null;
  }
  if (searchCorpus.includes('hydrocortisone') || searchCorpus.includes('eczema') || searchCorpus.includes('dermatitis') || searchCorpus.includes('اگزما')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'eczema') || null;
  }
  if (searchCorpus.includes('pinworm') || searchCorpus.includes('threadworm') || searchCorpus.includes('کرمک') || searchCorpus.includes('combantrin') || searchCorpus.includes('انگل')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'worms_pinworms') || null;
  }
  if (searchCorpus.includes('thrush') || searchCorpus.includes('canesten') || searchCorpus.includes('clotrimazole') || searchCorpus.includes('برفک') || searchCorpus.includes('کاندیدا')) {
    if (searchCorpus.includes('oral') || searchCorpus.includes('دهان')) {
      return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'oral_thrush') || null;
    }
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'vaginal_thrush') || null;
  }
  if (searchCorpus.includes('shingles') || searchCorpus.includes('زونا') || searchCorpus.includes('shingrix')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'shingles') || null;
  }
  if (searchCorpus.includes('wax') || searchCorpus.includes('cerumol') || searchCorpus.includes('ear') || searchCorpus.includes('گوش')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'ear_wax') || ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'swimmers_ear') || null;
  }
  if (searchCorpus.includes('reflux') || searchCorpus.includes('heartburn') || searchCorpus.includes('gord') || searchCorpus.includes('dyspepsia') || searchCorpus.includes('سوزش سر دل') || searchCorpus.includes('ریفلاکس') || searchCorpus.includes('سوء هاضمه')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'gord_heartburn') || null;
  }
  if (searchCorpus.includes('sunburn') || searchCorpus.includes('سوختگی') || searchCorpus.includes('آفتاب‌سوختگی')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'burns_sunburn') || null;
  }
  if (searchCorpus.includes('constipation') || searchCorpus.includes('یبوست') || searchCorpus.includes('laxative') || searchCorpus.includes('movicol') || searchCorpus.includes('senna')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'constipation') || null;
  }
  if (searchCorpus.includes('diarrhea') || searchCorpus.includes('diarrhoea') || searchCorpus.includes('اسهال') || searchCorpus.includes('imodium') || searchCorpus.includes('gastro-stop')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'diarrhoea') || null;
  }
  if (searchCorpus.includes('motion sickness') || searchCorpus.includes('تهوع سفر') || searchCorpus.includes('kwells') || searchCorpus.includes('travacalm')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'motion_sickness') || null;
  }
  if (searchCorpus.includes('scabies') || searchCorpus.includes('گال') || searchCorpus.includes('lyclear') || searchCorpus.includes('permethrin')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'scabies') || null;
  }
  if (searchCorpus.includes('lice') || searchCorpus.includes('شپش') || searchCorpus.includes('headlice') || searchCorpus.includes('hedrin')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'headlice') || null;
  }
  if (searchCorpus.includes('tinea') || searchCorpus.includes('athlete') || searchCorpus.includes('قارچ') || searchCorpus.includes('daktarin')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'tinea_infections') || null;
  }
  if (searchCorpus.includes('smoking') || searchCorpus.includes('سیگار') || searchCorpus.includes('nicorette') || searchCorpus.includes('nicotine')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'smoking_cessation') || null;
  }
  if (searchCorpus.includes('ulcer') || searchCorpus.includes('آفت دهان') || searchCorpus.includes('bonjela') || searchCorpus.includes('sm-33')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'mouth_ulcers') || null;
  }
  if (searchCorpus.includes('sore throat') || searchCorpus.includes('گلودرد') || searchCorpus.includes('strepsils') || searchCorpus.includes('difflam') || searchCorpus.includes('betadine throat')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'sore_throat') || null;
  }
  if (searchCorpus.includes('eye') || searchCorpus.includes('conjunctivitis') || searchCorpus.includes('چشم') || searchCorpus.includes('chlorsig')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'bacterial_conjunctivitis') || ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'dry_eyes') || null;
  }
  if (searchCorpus.includes('pain') || searchCorpus.includes('paracetamol') || searchCorpus.includes('ibuprofen') || searchCorpus.includes('panadol') || searchCorpus.includes('nurofen') || searchCorpus.includes('osteo') || searchCorpus.includes('درد') || searchCorpus.includes('مسکن') || searchCorpus.includes('sprain') || searchCorpus.includes('پیچ‌خوردگی')) {
    return ALL_OTC_HANDBOOK_DISEASES.find((d) => d.id === 'pain_relief') || null;
  }

  return null;
}


