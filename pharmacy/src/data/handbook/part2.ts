import { OTCDiseaseGuide } from './types';

export const OTC_HANDBOOK_DATA_PART2: OTCDiseaseGuide[] = [
  {
    id: "constipation",
    condition: "Constipation (یبوست)",
    category: "Gastrointestinal",
    symptoms: ["Infrequent bowel motions, hard dry stools, straining, abdominal discomfort, bloating"],
    referralCriteria: ["Blood or mucus in stool", "Constipation alternating with diarrhoea", "Tenesmus", "Severe/persistent abdominal pain", "Duration >1 week after laxative use"],
    medicines: [
      {
        name: "Lactulose (Osmotic)",
        brandExamples: "Actilax, Duphalac, Lac-Dol",
        dosing: "Adults >12yo: 15-45mL daily. Child 7-12yo: 15mL daily. Child 1-7yo: 5-10mL daily. Infant 1-12mo: 5mL daily. Onset: 1-3 days.",
        pregnancySafety: "Safe in pregnancy (First line).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">1 month",
        extraInfo: "Very sweet taste; can mix with fruit juice or milk. Contraindicated in galactosaemia and obstruction."
      },
      {
        name: "Macrogol 3350 (Osmotic)",
        brandExamples: "Movicol, Movicol Junior, OsmoLax",
        dosing: "Adults >12yo: 1-3 sachets daily. Child 6-11yo: 2 sachets Movicol Jr daily. Child 1-5yo: 1 sachet Jr. Infant: Half sachet Jr. Onset: 1-3 days.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">1 month",
        extraInfo: "Contains electrolytes. Do not stop abruptly in chronic constipation; withdraw gradually over 2-4 weeks."
      },
      {
        name: "Docusate Sodium (+/- Senna)",
        brandExamples: "Coloxyl Tablets, Coloxyl with Senna",
        dosing: "Coloxyl: 50-150mg daily (max 500mg). Coloxyl with Senna: 1-2 tablets at night (max 4 daily).",
        pregnancySafety: "Docusate: Safe. Senna: Consider alternative in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "Coloxyl: >3 years. Coloxyl with Senna: >3 years.",
        extraInfo: "Take with plenty of fluid. Onset: 1-3 days."
      },
      {
        name: "Glycerol Suppositories (Osmotic/Stimulant)",
        brandExamples: "Glycerol Suppositories Adult / Child / Infant",
        dosing: "Adults: 2.8g rectally PRN. Child 1-11yo: 1.4g rectally. Infant 1mo-1yo: 700mg rectally. Onset: 5-30 minutes.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">1 month",
        extraInfo: "Fast relief. Push narrow end first; hold for a few minutes to allow dissolution."
      }
    ],
    nonPharmAdvice: [
      "Increase fluid intake (water) and dietary fibre.",
      "Increase daily physical exercise.",
      "Do not suppress the natural urge to defecate."
    ],
    clinicalNotes: ["In pregnancy, Docusate and Lactulose are first choices. Avoid stimulant laxatives."]
  },
  {
    id: "corns_calluses",
    condition: "Corns & Calluses (میخچه و پینه پا)",
    category: "Podiatry & Dermatology",
    symptoms: ["Thickened patch of hard skin on foot", "Hard small bump with central core", "Pain on friction/pressure"],
    referralCriteria: ["Patients with Diabetes", "Peripheral vascular disease", "Impaired peripheral sensation / neuropathy", "Signs of infection"],
    medicines: [
      {
        name: "Salicylic Acid + Lactic Acid",
        brandExamples: "Duofilm Liquid (SA 16.7%, LA 16.7%), Wart Clear Liquid",
        dosing: "Apply 1-2 times daily until cleared. Do not use for more than 2 weeks.",
        pregnancySafety: "Consider alternative (limited data).",
        breastfeedingSafety: "Considered safe on small areas.",
        minAge: ">2 years",
        extraInfo: "Soak in warm water for 5 min, rub with pumice stone, protect surrounding skin with petroleum jelly, apply to lesion only."
      }
    ],
    nonPharmAdvice: [
      "Identify and remove cause of friction/pressure (wear well-fitted, cushioned shoes).",
      "Wash hands immediately after application.",
      "Never cut corns with razor blades."
    ],
    clinicalNotes: ["Salicylic acid is keratolytic; Lactic acid is humectant. Avoid large area application to prevent salicylate toxicity."]
  },
  {
    id: "chesty_cough",
    condition: "Chesty Cough (سرفه خلطدار)",
    category: "Respiratory",
    symptoms: ["Productive wet cough, chest congestion, phlegm clearance"],
    referralCriteria: ["Cough >3 weeks", "Persistent fever", "Shortness of breath / dyspnea", "Discoloured/purulent sputum", "Pain on inspiration", "Suspected adverse drug reaction", "Children <6 years"],
    medicines: [
      {
        name: "Bromhexine (+/- Guaifenesin)",
        brandExamples: "Bisolvon Chesty Forte (1.6mg/mL), Duro-Tuss Chesty Forte, Robitussin Chesty Forte",
        dosing: "Adults >12yo: 5-10mL 3 times daily (or 10mL 4 times daily for combo). Child 6-11yo: 5mL 3-4 times daily.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "No data, considered safe.",
        minAge: ">6 years (TGA contraindication <6 years)",
        extraInfo: "Guaifenesin promotes expectoration; Bromhexine reduces mucus viscosity. Sugar-free formulations."
      }
    ],
    nonPharmAdvice: [
      "Rest and increase fluid intake.",
      "Discourage smoking and encourage removal of sputum.",
      "Steam inhalation or vaporiser.",
      "Do NOT combine expectorants with cough suppressants."
    ],
    clinicalNotes: ["Expectorants, decongestants, and opioid suppressants are contraindicated in children <6 years."]
  },
  {
    id: "dry_cough",
    condition: "Dry Cough (سرفه خشک)",
    category: "Respiratory",
    symptoms: ["Non-productive irritating dry tickly cough, throat tickle"],
    referralCriteria: ["Cough >3 weeks", "Shortness of breath / wheeze", "Pain on inspiration", "Suspected ACE inhibitor cough", "Children <6 years"],
    medicines: [
      {
        name: "Dihydrocodeine 1.9mg/mL",
        brandExamples: "Rikodeine Liquid",
        dosing: "Adults >12yo: 5-10mL 4 times daily. Child 6-11yo: 2.5-5mL 4 times daily.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Considered safe to use.",
        minAge: ">6 years (Contains sugar)",
        extraInfo: "Contraindicated in asthma, COPD, and respiratory failure."
      },
      {
        name: "Pholcodine (3mg/mL, 4mg/mL)",
        brandExamples: "Duro-Tuss Dry Forte, Bisolvon Pholcodine Dry Forte",
        dosing: "Adults >12yo: 5mL 4 times daily (3mg/mL) or 2.5mL 3-4 times daily (4mg/mL). Child 6-11yo: 2.5mL 4 times daily.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "No data, considered safe.",
        minAge: ">6 years",
        extraInfo: "Fewer side effects than dihydrocodeine. Sugar-free."
      },
      {
        name: "Dextromethorphan (2mg/mL)",
        brandExamples: "Bisolvon Dry Liquid",
        dosing: "Adults >12yo: 5-10mL 4 times daily. Child 6-11yo: 5mL 4 times daily.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Considered safe to use.",
        minAge: ">6 years",
        extraInfo: "Potential to increase serotonin levels; caution with SSRIs/MAOIs."
      }
    ],
    nonPharmAdvice: [
      "Rest, increase fluid intake, honey and lemon drinks (Honey contraindicated <1yo).",
      "Demulcent lozenges to soothe throat tickle."
    ],
    clinicalNotes: ["Rule out ACE-inhibitor induced dry cough before starting OTC suppression."]
  },
  {
    id: "cradle_cap",
    condition: "Cradle Cap / Infantile Seborrhoeic Dermatitis (کلاه گهواره / شوره نوزادی)",
    category: "Paediatrics & Dermatology",
    symptoms: ["Diffuse greasy yellowish scales on scalp, hairline, and eyebrows in infants, non-itchy"],
    referralCriteria: ["Severe spreading to body folds", "Secondary infection with oozing or bleeding", "Not responding to treatment"],
    medicines: [
      {
        name: "Emollients (Baby oil, Safflower oil, White soft paraffin)",
        brandExamples: "Ego Baby Oil, Safflower Oil",
        dosing: "Apply emollient to scalp to soften scales, then gently remove with a soft brush.",
        pregnancySafety: "Not applicable.",
        breastfeedingSafety: "Not applicable.",
        minAge: "From birth",
        extraInfo: "Avoid olive oil (disrupts skin barrier) and nut-based oils (sensitisation risk)."
      }
    ],
    nonPharmAdvice: [
      "Avoid picking on crusts to prevent secondary bacterial infection.",
      "Condition is harmless, non-contagious, and resolves spontaneously within a few weeks.",
      "If severe, short-course Hydrocortisone 0.5% may be prescribed by GP."
    ],
    clinicalNotes: ["Most common in infants aged 3-12 weeks; different from adult seborrhoeic dermatitis."]
  },
  {
    id: "diarrhoea",
    condition: "Diarrhoea (اسهال حاد)",
    category: "Gastrointestinal",
    symptoms: ["Frequent loose or watery stools, abdominal cramps, mild nausea"],
    referralCriteria: ["Blood or mucus in stool", "Diarrhoea >10 days", "High fever / systemic toxicity", "Severe dehydration / all infants", "Recent international travel", "Alternating with constipation"],
    medicines: [
      {
        name: "Loperamide 2mg",
        brandExamples: "Imodium, Gastro-Stop, Diareze",
        dosing: "Adults >12yo: Initially 2 capsules, then 1 capsule after each loose motion (max 8 capsules / 16mg in 24 hours).",
        pregnancySafety: "Limited data in pregnancy.",
        breastfeedingSafety: "Considered safe in breastfeeding.",
        minAge: ">12 years",
        extraInfo: "More effective than diphenoxylate. Do not use in acute ulcerative colitis or bacterial enteritis."
      },
      {
        name: "Diphenoxylate 2.5mg + Atropine 25mcg",
        brandExamples: "Lomotil Tablets",
        dosing: "Adults >12yo: Take 2 tablets 3-4 times daily (max 8 tablets in 24 hours).",
        pregnancySafety: "Considered safe, avoid high doses near term.",
        breastfeedingSafety: "No data, short-term unlikely to harm.",
        minAge: ">12 years",
        extraInfo: "May cause drowsiness. Atropine added to discourage abuse."
      },
      {
        name: "Oral Rehydration Salts (ORS)",
        brandExamples: "Hydralyte Sachets / Effervescent",
        dosing: "Dissolve 2 tablets/1 sachet in 200mL water; drink frequently after each loose stool.",
        pregnancySafety: "Safe (First line).",
        breastfeedingSafety: "Safe.",
        minAge: "All ages",
        extraInfo: "Primary mainstay of therapy to prevent dehydration."
      }
    ],
    nonPharmAdvice: [
      "Fluid and electrolyte replacement is the essential first step.",
      "Resume normal food intake as soon as rehydrated.",
      "Use antidiarrhoeals only when strictly necessary (e.g. travel, work) as they delay organism expulsion."
    ],
    clinicalNotes: ["Do not use antidiarrhoeal motility inhibitors in children with acute gastroenteritis."]
  },
  {
    id: "dry_eyes",
    condition: "Dry Eyes (خشکی چشم)",
    category: "Ophthalmology",
    symptoms: ["Stinging, burning, gritty foreign body sensation, tired red eyes, transient blurred vision"],
    referralCriteria: ["Severe eye pain", "Photophobia", "Marked visual impairment", "No improvement with lubricants"],
    medicines: [
      {
        name: "Ocular Lubricants (Sodium Hyaluronate, Carmellose, Hypromellose, Macrogol/Propylene glycol)",
        brandExamples: "Hylo-Fresh/Forte, Refresh Tears Plus, Systane, Poly-Tears",
        dosing: "Instil 1 drop every 1-12 hours as required. Ointments at bedtime.",
        pregnancySafety: "Safe in pregnancy (AMH 2017).",
        breastfeedingSafety: "Safe in breastfeeding (AMH 2017).",
        minAge: ">1 month",
        extraInfo: "Hylo-Fresh/Forte is preservative-free multi-dose. Discard unit dose vials after single use; multi-dose after 28 days."
      }
    ],
    nonPharmAdvice: [
      "Blink frequently; take regular screen breaks (20-20-20 rule).",
      "Avoid air-conditioning, direct fans, and windy environments.",
      "Use room humidifiers.",
      "Remove soft contact lenses before instilling preserved eye drops (wait 15 min before reinserting)."
    ],
    clinicalNotes: ["Benzalkonium chloride is the most irritating preservative. Polyquaternium and unit-dose vials are preferred for sensitive eyes."]
  },
  {
    id: "dry_mouth",
    condition: "Dry Mouth / Xerostomia (خشکی دهان)",
    category: "Oral Health",
    symptoms: ["Cottony mouth feeling, difficulty chewing/swallowing dry food, altered taste, cracked lips"],
    referralCriteria: ["Severe oral ulceration / infection", "Unexplained persistent xerostomia (evaluate for Sjögren's syndrome / medication side effects)"],
    medicines: [
      {
        name: "Artificial Saliva Replacements",
        brandExamples: "Biotène Mouthwash, Oral Gel, Moisturising Spray",
        dosing: "Mouthwash: Rinse 15mL for 30 sec and spit out (max 5 times daily). Gel: Place 1cm on tongue and spread. Spray: PRN.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "Adults & Children",
        extraInfo: "Alcohol-free formulations."
      }
    ],
    nonPharmAdvice: [
      "Sip water frequently throughout the day.",
      "Chew sugar-free gum to stimulate natural salivary flow.",
      "Avoid acidic, sugary, astringent drinks (black tea, coffee, wine).",
      "Avoid alcohol-containing mouthwashes; maintain strict dental hygiene."
    ],
    clinicalNotes: ["Identify drug-induced causes (anticholinergics, tricyclics, antihistamines, diuretics)."]
  },
  {
    id: "ear_wax",
    condition: "Impacted Ear Wax (جرم و موم گوش)",
    category: "Ear, Nose & Throat",
    symptoms: ["Mild conductive hearing loss, ear discomfort, feeling of ear fullness"],
    referralCriteria: ["Severe pain", "Foul discharge", "Perforated eardrum", "History of ear surgery / grommets"],
    medicines: [
      {
        name: "Docusate Sodium 0.5% (Aqueous)",
        brandExamples: "Waxsol Ear Drops",
        dosing: "Fill ear canal with drops on 2 consecutive nights before syringing.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "From birth",
        extraInfo: "Do not use if eardrum is perforated or ear is inflamed."
      },
      {
        name: "Dichlorobenzene + Chlorbutol (Oily)",
        brandExamples: "Cerumol Ear Drops",
        dosing: "Instil 5 drops 10-30 min before syringing or twice daily for a few days.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">2 years",
        extraInfo: "Contains peanut (arachis) oil; check for nut allergies."
      },
      {
        name: "Carbamide Peroxide 6.5%",
        brandExamples: "Ear Clear Ear Wax Removal",
        dosing: "5-10 drops twice daily for up to 4 days.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">12 years",
        extraInfo: "Effervescent action softens and disperses wax."
      }
    ],
    nonPharmAdvice: [
      "Never insert cotton buds (Q-tips), matchsticks, or ear candles into the canal.",
      "Limit cleaning to wiping the outer ear only.",
      "Over 30% of impacted ears clear spontaneously within 5 days."
    ],
    clinicalNotes: ["Contraindicated if tympanic membrane perforation is suspected."]
  },
  {
    id: "eczema",
    condition: "Eczema / Atopic Dermatitis (اگزما و درماتیت آتوپیک)",
    category: "Dermatology",
    symptoms: ["Dry, red, itchy, scaly patches, excoriations in skin flexures"],
    referralCriteria: ["Crusted yellow lesions / suspected Eczema Herpeticum", "Severe widespread flare", "Failed mild topical steroid"],
    medicines: [
      {
        name: "Hydrocortisone 0.5%, 1%",
        brandExamples: "Dermaid 0.5%/1%, Sigmacort, Cortic",
        dosing: "Apply sparingly to affected areas 1-2 times daily.",
        pregnancySafety: "Safe in pregnancy & breastfeeding (Wipe off nipple area before nursing).",
        breastfeedingSafety: "Safe.",
        minAge: "From birth",
        extraInfo: "1 Fingertip Unit (FTU = ~500mg) covers an area of 2 adult hand palms."
      },
      {
        name: "Clobetasone Butyrate 0.05%",
        brandExamples: "Eumovate Cream",
        dosing: "Apply 1-2 times daily for short-term control.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">12 years",
        extraInfo: "Moderately potent topical corticosteroid."
      }
    ],
    nonPharmAdvice: [
      "Moisturise liberally at least twice daily (apply emollients to damp skin).",
      "Bathe in lukewarm water; use soap-free pH balanced cleansers.",
      "Pat skin dry with towel instead of rubbing.",
      "Avoid scratchy wool or synthetic clothing (wear 100% cotton).",
      "Do NOT use moisturiser containing Sodium Lauryl Sulfate (SLS) as it disrupts skin barrier."
    ],
    clinicalNotes: ["Apply moisturiser and steroid with a gap of 15-30 minutes."]
  },
  {
    id: "gord_heartburn",
    condition: "GORD / Heartburn (ریفلاکس معده و سوزش سر دل)",
    category: "Gastrointestinal",
    symptoms: ["Retrosternal burning sensation, acid regurgitation, waterbrash after meals/lying down"],
    referralCriteria: ["Dysphagia / odynophagia (difficulty/pain swallowing)", "Unexplained weight loss", "Tarry black stools / vomiting blood", "Chest pain radiating to arm/jaw", "Patients >55yo with new onset symptoms", "NSAID-induced"],
    medicines: [
      {
        name: "Antacids (AlOH + MgOH + Simethicone / Alginates)",
        brandExamples: "Mylanta Double Strength, Gaviscon Dual Action",
        dosing: "Mylanta: 5-10mL 3-4 times daily (1-3h after meals and at bedtime). Gaviscon: 10-20mL up to 4 times daily.",
        pregnancySafety: "Safe in pregnancy (AMH 2017).",
        breastfeedingSafety: "Safe.",
        minAge: ">6-12 years depending on product",
        extraInfo: "Separate from other oral medications by at least 2 hours. Liquid forms are faster than tablets."
      },
      {
        name: "Ranitidine / Famotidine (H2 Antagonist)",
        brandExamples: "Zantac Relief Tablets",
        dosing: "Take 1 tablet PRN (max 2 daily).",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">12 years",
        extraInfo: "Onset: 30-60 minutes."
      },
      {
        name: "Esomeprazole 20mg / Pantoprazole 20mg (PPI)",
        brandExamples: "Nexium 24HR, Somac Heartburn Relief",
        dosing: "Take 1 tablet daily 30-60 min before breakfast for 7 to 14 days. Swallow whole.",
        pregnancySafety: "Omeprazole preferred in pregnancy.",
        breastfeedingSafety: "Omeprazole preferred.",
        minAge: ">18 years (Schedule 3)",
        extraInfo: "For frequent symptoms (>=2 days/week). Maximum 14 days OTC treatment."
      }
    ],
    nonPharmAdvice: [
      "Eat smaller, more frequent meals; avoid lying down within 2-3 hours of eating.",
      "Avoid dietary triggers: fatty, spicy foods, caffeine, chocolate, alcohol.",
      "Elevate head of bed by 15-20cm.",
      "Avoid tight-fitting clothing and manage body weight."
    ],
    clinicalNotes: ["Aluminium causes constipation; Magnesium causes diarrhoea. Alginates form a physical raft on top of gastric contents."]
  },
  {
    id: "haemorrhoids",
    condition: "Haemorrhoids / Piles (بواسیر و هموروئید)",
    category: "Colorectal & Gastrointestinal",
    symptoms: ["External: painful bluish lump outside anus, swelling, thrombosis discomfort. Internal: painless bright red rectal bleeding, prolapse."],
    referralCriteria: ["Dark blood / blood mixed in stool", "Suspected colorectal cancer", "Severe thrombosed haemorrhoids", "Symptoms >7 days without relief"],
    medicines: [
      {
        name: "Hydrocortisone + Cinchocaine / Lidocaine",
        brandExamples: "Proctosedyl Ointment/Suppositories, SOOV IT Ointment",
        dosing: "Apply to affected area / insert suppository up to 3 times daily after bowel movements (MAXIMUM 7 DAYS).",
        pregnancySafety: "Safe in pregnancy (AMH 2017).",
        breastfeedingSafety: "Safe in breastfeeding (AMH 2017).",
        minAge: "Proctosedyl: >12 years. SOOV IT: >2 years.",
        extraInfo: "Steroid reduces swelling; Local anaesthetic relieves pain/pruritus. Limit to <7 days to prevent skin atrophy/sensitisation."
      },
      {
        name: "Zinc Oxide + Peru Balsam",
        brandExamples: "Anusol Ointment & Suppositories",
        dosing: "Insert 1 suppository / apply ointment up to twice daily after bowel movements.",
        pregnancySafety: "Safe in pregnancy (AMH 2017).",
        breastfeedingSafety: "Safe in breastfeeding (AMH 2017).",
        minAge: "Adults & Children",
        extraInfo: "Zinc oxide acts as astringent to reduce bleeding; Peru balsam acts as mild antiseptic."
      }
    ],
    nonPharmAdvice: [
      "Avoid prolonged straining during defecation.",
      "Manage underlying constipation: increase water, dietary fibre, exercise.",
      "Warm sitz baths to relieve pain.",
      "Use wet wipes instead of dry toilet paper."
    ],
    clinicalNotes: ["Use of local anaesthetics/steroids must be strictly limited to <7 days."]
  },
  {
    id: "hayfever",
    condition: "Hayfever / Allergic Rhinitis (تب یونجه و رینیت آلرژیک)",
    category: "Respiratory & Allergy",
    symptoms: ["Sneezing, watery rhinorrhoea, nasal congestion, itchy eyes/nose, red watery eyes"],
    referralCriteria: ["Unilateral nasal obstruction without discharge", "Purulent infected discharge with facial pain", "Impaired smell", "Unresponsive to OTC intranasal corticosteroids"],
    medicines: [
      {
        name: "Oral Non-Sedating Antihistamines (Cetirizine, Loratadine, Fexofenadine)",
        brandExamples: "Zyrtec 10mg, Claratyne 10mg, Telfast 180mg",
        dosing: "Take 1 tablet once daily.",
        pregnancySafety: "Loratadine/Cetirizine: Safe (Category A). Fexofenadine: Limited data (Category B2).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "Cetirizine/Loratadine: >1 year (liquid). Fexofenadine: >2 years.",
        extraInfo: "Cetirizine is slightly more sedating than fexofenadine/loratadine. Stop 4 days before skin-prick testing."
      },
      {
        name: "Intranasal Corticosteroids (Mometasone, Budesonide, Fluticasone)",
        brandExamples: "Nasonex 50mcg, Rhinocort 32mcg, Flixonase 50mcg",
        dosing: "Initially 2 sprays in each nostril once/twice daily; reduce to 1 spray daily when controlled.",
        pregnancySafety: "Safe in pregnancy (AMH 2017).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "Mometasone: >2 years. Budesonide: >6 years. Fluticasone: >12 years.",
        extraInfo: "First-line therapy for moderate-to-severe allergic rhinitis. Optimum onset requires several days of regular use."
      },
      {
        name: "Topical Antihistamine Eye Drops & Sprays (Ketotifen, Levocabastine, Azelastine)",
        brandExamples: "Zaditen Drops, Livostin Eye Drops & Nasal Spray, Azep Nasal Spray",
        dosing: "Eye drops: 1 drop BD. Nasal sprays: 1 spray BD.",
        pregnancySafety: "Consider alternatives in pregnancy.",
        breastfeedingSafety: "Considered safe.",
        minAge: "Ketotifen: >3 years. Levocabastine/Azelastine: >5-6 years.",
        extraInfo: "Ketotifen has mast-cell stabilising properties."
      }
    ],
    nonPharmAdvice: [
      "Minimise outdoor exposure during high pollen counts/windy days.",
      "Wear wraparound sunglasses and masks outdoors.",
      "Saline nasal rinses (Flo/Fess) to wash away allergens.",
      "Keep car and home windows closed during pollen season."
    ],
    clinicalNotes: ["Intranasal corticosteroids are superior to oral antihistamines for nasal congestion and ocular symptoms."]
  }
];

