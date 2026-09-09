import { OTCDiseaseGuide } from './types';

export const OTC_HANDBOOK_DATA_PART1: OTCDiseaseGuide[] = [
  {
    id: "acne",
    condition: "Acne (آکنه و جوش صورت)",
    category: "Dermatology",
    symptoms: ["Comedones, papules, pustules, oily skin"],
    referralCriteria: ["Severe nodular/cystic acne", "Scarring", "Failed OTC treatment after 6-8 weeks", "Suspected drug-induced acne"],
    medicines: [
      {
        name: "Benzoyl Peroxide (2.5%, 5%, 10%)",
        brandExamples: "Benzac AC Gel, Oxy Vanishing Cream",
        dosing: "Apply once or twice daily. Continue for at least 6 weeks before assessing efficacy.",
        pregnancySafety: "No data, considered safe to use.",
        breastfeedingSafety: "No data, considered safe to use.",
        minAge: ">2 years",
        extraInfo: "2.5% and 5% are as effective as 10% with less irritation. Avoid contact with hair/coloured fabrics (bleaching). Benzac Gel contains propylene glycol."
      },
      {
        name: "Azelaic Acid 20%",
        brandExamples: "Azclear Action Lotion",
        dosing: "Apply once or twice daily. Improvement apparent after 4 weeks; optimum results after 6 months.",
        pregnancySafety: "No data, considered safe to use.",
        breastfeedingSafety: "No data, considered safe to use.",
        minAge: ">2 years",
        extraInfo: "Less irritating than Benzoyl Peroxide. May cause hypo-pigmentation in darker complexions."
      }
    ],
    nonPharmAdvice: [
      "Condition usually gets worse before it gets better.",
      "Use a gentle soap-free cleanser and non-comedogenic moisturiser.",
      "Avoid toners, harsh scrubbing, squeezing, or picking lesions.",
      "Avoid waxing treated areas."
    ],
    clinicalNotes: ["Possesses antibacterial and comedolytic properties. No proven link between specific foods and acne."]
  },
  {
    id: "anal_fissure",
    condition: "Anal Fissure (شقاق مقعدی)",
    category: "Colorectal & Gastrointestinal",
    symptoms: ["Anal pain worsening during and after defecation", "Small volume of bright red blood from rectum / on toilet paper"],
    referralCriteria: ["Large volume rectal bleeding", "Fever", "Severe intractable pain", "Fissure lasting >4 weeks"],
    medicines: [
      {
        name: "Glyceryl Trinitrate 0.2% Ointment",
        brandExamples: "Rectogesic Ointment",
        dosing: "Insert a 1-1.5cm strip of ointment into the anal canal 3 times daily for at least 2 weeks (up to 4 weeks).",
        pregnancySafety: "Safety not established (AMH 2017).",
        breastfeedingSafety: "Considered safe (AMH 2017).",
        minAge: ">18 years (Adults only)",
        extraInfo: "Contraindicated if taking PDE5 inhibitors (e.g. Sildenafil) within 24h or if hypotensive. Common side effect: Severe headache/dizziness."
      }
    ],
    nonPharmAdvice: [
      "Increase water intake, dietary fibre, and regular exercise to soften stools.",
      "Do not suppress the urge to defecate.",
      "Soak in warm bath for 20 minutes after bowel movements to soothe the area.",
      "Use baby wipes instead of dry toilet paper."
    ],
    clinicalNotes: ["Relaxes internal anal sphincter to reduce anal pressure and improve blood flow. Pain relief often occurs before complete healing."]
  },
  {
    id: "blepharitis",
    condition: "Blepharitis (بلفاریت / التهاب لبه پلک)",
    category: "Ophthalmology",
    symptoms: ["Burning, itchy, gritty eyes", "Sticky morning discharge", "Red lid margins", "Greasy scales or adherent crusts on lashes"],
    referralCriteria: ["Impaired vision", "Severe eye pain", "Photophobia", "Unresponsive to lid hygiene"],
    medicines: [
      {
        name: "Lid Hygiene Protocol / Chloramphenicol 1% Eye Ointment",
        brandExamples: "Chlorsig Eye Ointment (adjunct for staphylococcal blepharitis)",
        dosing: "Warm compresses for 2-5 min, gentle lash scrub with diluted sodium bicarb solution (1 tsp in 500mL cooled boiled water) or baby shampoo (5 drops in 100mL).",
        pregnancySafety: "Lid hygiene: Safe. Chloramphenicol: Safe.",
        breastfeedingSafety: "Safe.",
        minAge: ">2 years for Chloramphenicol OTC supply",
        extraInfo: "Chloramphenicol ointment used only if hygiene alone fails in staphylococcal blepharitis."
      }
    ],
    nonPharmAdvice: [
      "Daily lid hygiene and eyelid massage towards lash margins are the mainstay of treatment.",
      "Remove all eye makeup daily; avoid irritants.",
      "Use anti-dandruff shampoo if associated with seborrhoeic dermatitis.",
      "Keep underlying conditions controlled (diabetes, rosacea)."
    ],
    clinicalNotes: ["Often chronic and relapsing. Associated with seborrhoeic dermatitis, rosacea, and eczema."]
  },
  {
    id: "burns_sunburn",
    condition: "Burns & Sunburn (سوختگی سطحی و آفتابسوختگی)",
    category: "Dermatology",
    symptoms: ["Erythema, heat, stinging pain, peeling skin after 4-7 days"],
    referralCriteria: ["Burns larger than patient's palm", "Blistering on face, hands, feet, or groin", "Chemical/electrical burns", "Signs of secondary infection"],
    medicines: [
      {
        name: "Hydrogel (Propylene glycol, NaCl / Allantoin, Glycerol)",
        brandExamples: "Solugel, Solosite Gel",
        dosing: "Apply liberally (min 5mm depth) without rubbing in. Apply as frequently as possible; do not allow to dry out.",
        pregnancySafety: "Safe for topical small areas.",
        breastfeedingSafety: "Safe.",
        minAge: "All ages",
        extraInfo: "Store in fridge for extra cooling effect. Discard 3 months after opening."
      }
    ],
    nonPharmAdvice: [
      "First aid: 20 minutes under cool running tap water.",
      "Drink plenty of water to rehydrate.",
      "Take cool shower or apply cold compresses.",
      "Do NOT pop blisters; cover with non-adherent dressing.",
      "Do NOT use butter, oils, or ice directly on burns.",
      "Use broad-spectrum SPF50+ sunscreen and protective clothing."
    ],
    clinicalNotes: ["Sunburnt skin color develops in 2-6 hours, peaking up to 72 hours. SPF50 filters 98% of UVB radiation."]
  },
  {
    id: "chilblains",
    condition: "Chilblains / Pernio (تورم و قرمزی ناشی از سرما)",
    category: "Dermatology & Vascular",
    symptoms: ["Burning and itching sensation (worse on entering warm room)", "Red or blue swollen patches on extremities (toes, fingers, ears, nose)"],
    referralCriteria: ["Broken skin with severe ulceration / infection", "Underlying systemic conditions (Lupus, Raynaud's)", "Not healing after a few weeks"],
    medicines: [
      {
        name: "McGloin's Chilblain Ointment (Camphor 68mg, Benzocaine 20mg, Balsam-Peru 20mg, Phenol 9mg)",
        brandExamples: "McGloin's Chilblain Ointment",
        dosing: "Apply 2-3 times daily as required.",
        pregnancySafety: "Safety not mentioned.",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: ">1 year",
        extraInfo: "Camphor improves circulation; Benzocaine numbs pain; Balsam-Peru acts as antiseptic; Lanolin/paraffin retains heat."
      }
    ],
    nonPharmAdvice: [
      "Soak affected areas in warm (NOT hot) water to improve circulation.",
      "Avoid rapid changes in temperature.",
      "Wear warm socks, gloves, and avoid tight-fitting footwear.",
      "Apply moisturisers containing lanolin or paraffin to retain heat."
    ],
    clinicalNotes: ["Develops several hours after cold exposure; usually self-limiting in 1-2 weeks."]
  },
  {
    id: "chickenpox",
    condition: "Chickenpox / Varicella (آبلهمرغان)",
    category: "Infectious Diseases & Dermatology",
    symptoms: ["Fever, malaise, intensely itchy rash starting on body spreading to head/limbs, small dewdrop blisters"],
    referralCriteria: ["Pregnant women (risk of Congenital Varicella)", "Immunocompromised individuals", "Secondary bacterial skin infection", "Neurological or chest symptoms"],
    medicines: [
      {
        name: "Promethazine Hydrochloride / Dexchlorpheniramine",
        brandExamples: "Phenergan, Polaramine",
        dosing: "Take as directed when required. Sedating antihistamines reduce itch via sedation.",
        pregnancySafety: "Safe, but avoid close to delivery.",
        breastfeedingSafety: "Consider alternative.",
        minAge: ">2 years",
        extraInfo: "Non-sedating antihistamines are INEFFECTIVE because chickenpox itch is not histamine-mediated."
      },
      {
        name: "Paracetamol",
        brandExamples: "Panadol, Dymadon",
        dosing: "15mg/kg every 4-6 hours (max 60mg/kg/day or 4000mg/day).",
        pregnancySafety: "Safe (Category A).",
        breastfeedingSafety: "Safe.",
        minAge: ">1 month",
        extraInfo: "Avoid Ibuprofen/NSAIDs in chickenpox due to risk of necrotising soft tissue infections."
      }
    ],
    nonPharmAdvice: [
      "Rest, increase fluid intake, and take lukewarm baths.",
      "Keep nails trimmed short; put cotton mittens on babies to prevent scratching.",
      "Avoid Calamine lotion as it excessively dries the skin.",
      "Strict home exclusion until the VERY LAST blister has completely dried and crusted (incubation 14-16 days)."
    ],
    clinicalNotes: ["Contagious from 5 days BEFORE rash appears until all vesicles have crusted over."]
  },
  {
    id: "cold_sores",
    condition: "Recurrent Cold Sores / Herpes Labialis (تبخال لب)",
    category: "Oral & Dermatology",
    symptoms: ["Localised tingling, burning, or pain 1-2 days before vesicles, clusters of small blisters on lips that burst and crust"],
    referralCriteria: ["Lesion near the eye", "Immunocompromised patient", "Not healed after 14 days", "Severe difficulty eating/swallowing", "Frequent monthly recurrences"],
    medicines: [
      {
        name: "Famciclovir 1500mg (3 x 500mg Stat)",
        brandExamples: "Famvir for Cold Sores, Elovax",
        dosing: "Take 3 tablets together as a single dose within 48 hours of symptom onset.",
        pregnancySafety: "Limited data, consider alternative in pregnancy (Category B3).",
        breastfeedingSafety: "No data, consider alternative.",
        minAge: ">18 years (Schedule 3 Pharmacist Only)",
        extraInfo: "Treatment effective if started within 48 hours of symptoms developing."
      },
      {
        name: "Aciclovir 5% Cream",
        brandExamples: "Zovirax Cold Sore Cream",
        dosing: "Apply 5 times daily (every 3-4 hours while awake) for 4-5 days.",
        pregnancySafety: "Considered safe to use.",
        breastfeedingSafety: "Safe.",
        minAge: ">3 months",
        extraInfo: "Commence at earliest tingling stage. Using longer than recommended has no benefit."
      },
      {
        name: "Idoxuridine 0.5% + Lidocaine 2% Cream",
        brandExamples: "Virasolve",
        dosing: "Apply every hour for the first day, then every 4 hours until lesion disappears.",
        pregnancySafety: "No data, consider alternative.",
        breastfeedingSafety: "Considered safe to use.",
        minAge: ">12 years",
        extraInfo: "Avoid contact with eyes and inside mouth."
      }
    ],
    nonPharmAdvice: [
      "Wash hands thoroughly after touching cold sore to reduce transmission and prevent eye infection.",
      "Avoid kissing, sharing cutleries, cups, or lip balms.",
      "Avoid known triggers: UV sunlight (use lip sunscreen), stress, fatigue.",
      "Exclude children from daycare until blisters have stopped weeping."
    ],
    clinicalNotes: ["Primary infection in children can cause severe fever and gingivostomatitis lasting up to 2 weeks."]
  },
  {
    id: "bacterial_conjunctivitis",
    condition: "Bacterial Conjunctivitis (کنژنکتیویت باکتریایی / عفونت چشم)",
    category: "Ophthalmology",
    symptoms: ["Rapid onset, usually begins in one eye, mucopurulent yellow-green discharge, red eye, eyelids glued in morning"],
    referralCriteria: ["Severe eye pain", "Photophobia", "Visual disturbances", "Restricted eye movement", "Copious purulent discharge", "Contact lens wearers", "Infant <2 years for OTC"],
    medicines: [
      {
        name: "Chloramphenicol 0.5% Drops / 1% Ointment",
        brandExamples: "Chlorsig Drops & Ointment",
        dosing: "Drops: 1 drop every 2h for first 2 days, then QID for 5 days. Ointment: 1.5cm in lower lid TID for 5-7 days.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">2 years (Pharmacist OTC protocol)",
        extraInfo: "Store unopened drops in fridge (2-8°C). Discard 28 days after opening. Not active against Pseudomonas."
      },
      {
        name: "Propamidine Isethionate 0.1%",
        brandExamples: "Brolene Eye Drops",
        dosing: "Instil 1-2 drops 3-4 times daily for 7 days.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">2 years",
        extraInfo: "Indicated for mild bacterial conjunctivitis."
      }
    ],
    nonPharmAdvice: [
      "Never pad or cover a discharging eye.",
      "Clear away debris/mucus using saline or cooled boiled water and cotton wipes before instilling drops.",
      "Refrain from wearing contact lenses until 24 hours after infection has completely resolved.",
      "Strict hand hygiene; keep children home until eye discharge stops."
    ],
    clinicalNotes: ["Usually self-limiting in 5 days; antibacterial drops hasten recovery and limit spread."]
  }
];

