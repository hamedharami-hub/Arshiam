import { OTCDiseaseGuide } from './types';

export const OTC_HANDBOOK_DATA_PART3: OTCDiseaseGuide[] = [
  {
    id: "headlice",
    condition: "Head Lice / Pediculosis (شپش سر)",
    category: "Dermatology & Parasitology",
    symptoms: ["Scalp itching (behind ears/nape), tickling sensation, visible crawling live lice, nits within 1cm of scalp"],
    referralCriteria: ["Unclear diagnosis / no live lice found", "Signs of secondary bacterial infection", "Treatment failure after 2 full courses"],
    medicines: [
      {
        name: "Permethrin 1% Lotion",
        brandExamples: "Quellada Lotion",
        dosing: "Apply to damp shampooed hair, leave for 10 minutes, rinse and fine-tooth comb. MANDATORY REPEAT AFTER 7 DAYS.",
        pregnancySafety: "Safe in pregnancy (First line).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">2 months",
        extraInfo: "Preferred in pregnancy/breastfeeding. Repeat at Day 7 kills newly hatched lice before they lay eggs."
      },
      {
        name: "Malathion / Maldison (0.5% Lotion, 1% Foam)",
        brandExamples: "KP24 Lotion / Foam",
        dosing: "Lotion: Apply to dry hair, leave 12 hours, rinse and comb. Foam: Leave 30 min. Repeat after 7 days.",
        pregnancySafety: "Consider alternative (Permethrin preferred).",
        breastfeedingSafety: "Consider alternative.",
        minAge: ">6 months",
        extraInfo: "Strong odor. Do not use hairdryer after application (heat inactives drug)."
      },
      {
        name: "Pyrethrins + Piperonyl Butoxide / Benzyl Alcohol 5%",
        brandExamples: "Banlice Mousse/Spray, Neutralice Advance Lotion",
        dosing: "Banlice: Leave on dry hair 10-30 min, rinse and comb; repeat Day 7. Neutralice: Leave 10 min; repeat at Day 7 & 14.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "Banlice: From birth. Neutralice: >6 months.",
        extraInfo: "Physical pediculicides have zero chemical resistance risk."
      }
    ],
    nonPharmAdvice: [
      "Wet combing technique with hair conditioner and nit comb every 2-3 days.",
      "Check all family members; treat ONLY those with confirmed live lice.",
      "Wash pillowcases, brushes, and hats in hot water (>60°C).",
      "Do not share hats, combs, or hairbrushes."
    ],
    clinicalNotes: ["Eggs >1cm from scalp are empty casings (hatched/dead). Active infestation confirmed only by finding moving lice."]
  },
  {
    id: "motion_sickness",
    condition: "Motion Sickness (بیماری حرکت و دریازدگی)",
    category: "Neurology & Travel Health",
    symptoms: ["Nausea, vomiting, pallor, cold sweats, dizziness, malaise during travel"],
    referralCriteria: ["Severe persistent vomiting causing dehydration", "Vertigo unrelated to motion"],
    medicines: [
      {
        name: "Hyoscine Hydrobromide (Anticholinergic)",
        brandExamples: "Travacalm HO (300mcg)",
        dosing: "Adults >12yo: 1 tablet 4 times daily. Child 8-11yo: 1/2 tab. Child 2-7yo: 1/4 tab. Take first dose 30 min before travel.",
        pregnancySafety: "Safe in pregnancy (avoid in labor).",
        breastfeedingSafety: "Unlikely concern short-term.",
        minAge: ">2 years",
        extraInfo: "More effective than antihistamines. Anticholinergic side effects (dry mouth, blurred vision, drowsiness)."
      },
      {
        name: "Hyoscine + Dimenhydrinate + Caffeine",
        brandExamples: "Travacalm Original",
        dosing: "Adults >12yo: 1 tablet QID. Child 8-11yo: 1/2 tab. Child 2-7yo: 1/4 tab. Take 30 min before travel.",
        pregnancySafety: "Safe in pregnancy (avoid in labor).",
        breastfeedingSafety: "Limited data.",
        minAge: ">2 years",
        extraInfo: "Dual-action combination for superior efficacy; caffeine reduces drowsiness."
      },
      {
        name: "Promethazine Hydrochloride 25mg / Pheniramine 45.3mg",
        brandExamples: "Phenergan, Avil",
        dosing: "Promethazine: Take 1 tablet 1-2 hours before travel (repeat after 6-8h PRN). Pheniramine: 1-2 tablets up to TDS.",
        pregnancySafety: "Safe in pregnancy (avoid near delivery).",
        breastfeedingSafety: "Consider alternative.",
        minAge: "Promethazine: >2 years. Pheniramine: >5 years.",
        extraInfo: "Marked sedation; warning CAL 1."
      }
    ],
    nonPharmAdvice: [
      "Sit facing direction of travel; look at a fixed point on the horizon.",
      "Ensure adequate fresh ventilation; close eyes to reduce sensory conflict.",
      "Avoid large heavy meals or alcohol 24h prior to journey.",
      "Keep vomit bags and oral rehydration salts handy."
    ],
    clinicalNotes: ["Motion sickness medications are significantly more effective when taken BEFORE symptoms develop."]
  },
  {
    id: "mouth_ulcers",
    condition: "Mouth Ulcers / Aphthous Stomatitis (آفت و زخم دهان)",
    category: "Oral Health",
    symptoms: ["Small round/oval painful ulcers (5-10mm), grey-yellow base, erythematous inflamed border, heals in 7-14 days"],
    referralCriteria: ["Ulcers >10mm in diameter", "Duration >3 weeks (rule out malignancy)", "Multiple crop clusters", "Severe pain preventing eating/hydration", "Systemic symptoms (fever)", "Infant <2 years"],
    medicines: [
      {
        name: "Choline Salicylate 8.7%",
        brandExamples: "Bonjela Gel, Bonjela Teething Gel",
        dosing: "Apply small dab to ulcer every 3 hours PRN.",
        pregnancySafety: "Safety not mentioned (APF).",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: ">4 months",
        extraInfo: "Theoretical risk of Reye's syndrome with excessive dosage in viral illness."
      },
      {
        name: "Salicylic Acid + Lidocaine + Tannic Acid + Menthol",
        brandExamples: "SM-33 Gel / Liquid",
        dosing: "Apply to ulcer every 3 hours PRN.",
        pregnancySafety: "Safe in pregnancy (APF22).",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: ">6 months",
        extraInfo: "Lidocaine provides local anaesthesia; Tannic acid acts as astringent; Salicylic acid/alcohol provides antibacterial action."
      },
      {
        name: "Triamcinolone Acetonide 0.1% in Orabase",
        brandExamples: "Kenalog in Orabase",
        dosing: "Press a small dab onto ulcer at bedtime until thin film forms (do NOT rub in). Apply up to TDS if severe.",
        pregnancySafety: "Safe at recommended doses (APF22).",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: "Adults & Children",
        extraInfo: "Potent anti-inflammatory paste adheres to wet oral mucosa."
      }
    ],
    nonPharmAdvice: [
      "Maintain good oral hygiene; rinse with warm salt water.",
      "Avoid spicy, acidic, salty foods and rough textured snacks.",
      "Use soft-bristled toothbrush."
    ],
    clinicalNotes: ["Aphthous ulcers are non-infectious; Kenalog in Orabase accelerates healing by suppressing local inflammation."]
  },
  {
    id: "nappy_rash",
    condition: "Nappy Rash (سوختگی پای نوزاد و راش کهنه)",
    category: "Paediatrics & Dermatology",
    symptoms: ["Erythema, maceration, and skin discomfort on convex surfaces. Candida signs: bright red rash, skin flexures involved, satellite lesions."],
    referralCriteria: ["Severe broken ulcerated skin", "Spreading infection with fever", "Unresponsive to barrier creams after 7 days"],
    medicines: [
      {
        name: "Zinc Oxide Barrier Creams / Dimethicone",
        brandExamples: "Sudocrem (Zinc 15.25%), Ego Silic 15",
        dosing: "Apply generously to nappy region after every nappy change.",
        pregnancySafety: "Not applicable.",
        breastfeedingSafety: "Not applicable.",
        minAge: ">1 month",
        extraInfo: "Sudocrem provides soothing barrier; Dimethicone provides water-repellent barrier."
      },
      {
        name: "Hydrocortisone 0.5%, 1%",
        brandExamples: "Dermaid 0.5%/1%",
        dosing: "Apply thinly 1-2 times daily for 3-5 days for severe inflammation.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "From birth",
        extraInfo: "Short-term use only for marked erythema and distress."
      },
      {
        name: "Antifungals (Clotrimazole 1%, Miconazole 2%) +/- Hydrocortisone",
        brandExamples: "Canesten, Daktarin, Canesten Plus, Resolve Plus 1.0",
        dosing: "Apply 2-3 times daily. Continue for 2 weeks after symptoms resolve.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "From birth",
        extraInfo: "First-line when candidal superinfection is present (bright beefy red with satellite pustules)."
      }
    ],
    nonPharmAdvice: [
      "Allow frequent nappy-free periods (air drying).",
      "Change wet/soiled nappies frequently.",
      "Cleanse with warm water and soft wipes; avoid fragrant soaps."
    ],
    clinicalNotes: ["Uncomplicated nappy rash spares skin folds; Candida involves skin creases with satellite pustules."]
  },
  {
    id: "nasal_congestion",
    condition: "Nasal Congestion (احتقان و گرفتگی بینی)",
    category: "Respiratory",
    symptoms: ["Stuffy blocked nose, mouth breathing, sinus pressure"],
    referralCriteria: ["Symptoms lasting >7-10 days", "Purulent nasal discharge with high fever and facial tenderness", "Infants with feeding difficulties"],
    medicines: [
      {
        name: "Intranasal Decongestants (Xylometazoline, Oxymetazoline)",
        brandExamples: "Otrivin 0.1%/0.05%, Sudafed Nasal Spray, Dimetapp 12hr Spray",
        dosing: "Adults >12yo: 1-2 sprays 2-3 times daily (MAXIMUM 3-5 CONSECUTIVE DAYS). Child 6-11yo: Paediatric strength.",
        pregnancySafety: "Limited data, considered safe short-term.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">6 years",
        extraInfo: "STRICT WARNING: Do not exceed 3-5 days due to severe risk of Rhinitis Medicamentosa (rebound congestion)."
      },
      {
        name: "Oral Decongestants (Pseudoephedrine 60mg, Phenylephrine 10mg)",
        brandExamples: "Sudafed Sinus & Nasal (S3 - Project Stop), Sudafed PE (S2)",
        dosing: "Pseudoephedrine: 60mg every 4-6 hours (max 4 daily). Phenylephrine: 10mg every 4 hours.",
        pregnancySafety: "Contraindicated in pregnancy (avoid).",
        breastfeedingSafety: "Contraindicated / avoid.",
        minAge: "Pseudoephedrine: >12 years (Schedule 3). Phenylephrine: >6 years.",
        extraInfo: "Caution in hypertension, hyperthyroidism, glaucoma, diabetes, prostate enlargement, or MAOIs."
      },
      {
        name: "Intranasal Ipratropium 44mcg/dose",
        brandExamples: "Atrovent Nasal Forte",
        dosing: "1 spray 3-4 times daily for up to 4 days.",
        pregnancySafety: "Considered safe (AMH).",
        breastfeedingSafety: "Considered safe (AMH 2017).",
        minAge: ">5 years",
        extraInfo: "Highly effective for watery rhinorrhoea."
      }
    ],
    nonPharmAdvice: [
      "Saline nasal sprays or sinus douches (Fess/Flo).",
      "Steam inhalation and adequate hydration.",
      "Elevate head during sleep."
    ],
    clinicalNotes: ["Intranasal decongestants are much more effective than oral decongestants but carry rebound risk if used >5 days."]
  },
  {
    id: "pain_relief",
    condition: "Acute Pain Relief (مسکن‌ها و تسکین درد حاد)",
    category: "Analgesia & Musculoskeletal",
    symptoms: ["Nociceptive headache, dental pain, musculoskeletal aches, dysmenorrhoea"],
    referralCriteria: ["Severe unremitting pain", "Headache with neck stiffness/photophobia", "Suspected myocardial or visceral pain", "Chronic pain >3 months"],
    medicines: [
      {
        name: "Paracetamol 500mg",
        brandExamples: "Panadol, Herron, Dymadon",
        dosing: "Adults >12yo: 500-1000mg every 4-6 hours (max 4000mg in 24 hours). Child: 15mg/kg Q4-6H (max 60mg/kg/day).",
        pregnancySafety: "Safe in pregnancy (Category A - First Line).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">1 month",
        extraInfo: "First-line analgesic. Negligible anti-inflammatory effect. Onset: ~30 minutes."
      },
      {
        name: "NSAIDs (Ibuprofen, Diclofenac, Naproxen, Mefenamic Acid)",
        brandExamples: "Nurofen 200mg, Voltaren Rapid 25, Naprogesic 275mg, Ponstan 250mg",
        dosing: "Ibuprofen: 200-400mg TDS/QID (max 1200mg OTC). Naproxen: 550mg stat then 275mg Q6-8H. Mefenamic: 500mg TDS.",
        pregnancySafety: "CONTRAINDICATED in pregnancy (especially 3rd trimester - premature ductus closure).",
        breastfeedingSafety: "Ibuprofen & Diclofenac safe in breastfeeding.",
        minAge: "Ibuprofen: >3 months. Diclofenac: >12 months. Naproxen: >12 years.",
        extraInfo: "Take with food. Caution in asthma, renal impairment, peptic ulcers, heart failure, or anticoagulants."
      },
      {
        name: "Aspirin 300mg",
        brandExamples: "Solprin, Aspro Clear",
        dosing: "Take 1-3 tablets every 4-6 hours (max 4 doses in 24 hours).",
        pregnancySafety: "Avoid in pregnancy.",
        breastfeedingSafety: "Consider alternative.",
        minAge: ">16 years",
        extraInfo: "STRICT CONTRAINDICATION in children <16 years due to fatal Reye's Syndrome."
      }
    ],
    nonPharmAdvice: [
      "Rest, heat/cold packs, gentle massage, physical therapy.",
      "Adequate hydration and relaxation techniques."
    ],
    clinicalNotes: ["No rationale for combining multiple NSAIDs simultaneously. Enteric coating does NOT reduce GI bleeding risk."]
  },
  {
    id: "scabies",
    condition: "Scabies (گال / جرب)",
    category: "Dermatology & Parasitology",
    symptoms: ["Intense nocturnal itching, burrows in finger webs, wrist flexures, axillae, groin, genitalia"],
    referralCriteria: ["Crusted (Norwegian) scabies", "Atypical presentation", "Secondary bacterial cellulitis"],
    medicines: [
      {
        name: "Permethrin 5% Cream",
        brandExamples: "Lyclear Scabies Cream",
        dosing: "Apply from chin down covering whole body. Wash off with warm soapy water after 8-14 hours. MANDATORY REPEAT AFTER 7 DAYS.",
        pregnancySafety: "Safe in pregnancy (First line).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">2 months",
        extraInfo: "In children <2yo, elderly, or immunocompromised, also apply to scalp, neck, face, and ears."
      },
      {
        name: "Benzyl Benzoate 25% Lotion",
        brandExamples: "Ascabiol Lotion",
        dosing: "Apply from chin down; leave 24 hours. Repeat after 5 days. Dilute 1:1 for children; 1:3 for infants.",
        pregnancySafety: "Considered safe, Permethrin preferred.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">1 month",
        extraInfo: "Stings on application; dilute with water for paediatric use."
      }
    ],
    nonPharmAdvice: [
      "TREAT ALL HOUSEHOLD AND SEXUAL CONTACTS SIMULTANEOUSLY, even if asymptomatic.",
      "Wash clothing, bedding, and towels used in past 3 days in hot cycle (>60°C) or seal in plastic bag for 3 days.",
      "Inform patient that ITCH PERSISTS FOR 2-4 WEEKS after successful mite eradication (immune reaction to dead mites)."
    ],
    clinicalNotes: ["Re-evaluate if itch persists longer than 4 weeks."]
  },
  {
    id: "seborrhoeic_dermatitis",
    condition: "Seborrhoeic Dermatitis & Dandruff (درماتیت سبورئیک و شوره سر)",
    category: "Dermatology",
    symptoms: ["Greasy skin with flaky white/yellow scales and redness on scalp, face, eyebrows, ears, upper chest, itchy"],
    referralCriteria: ["Severe spreading erythroderma", "Secondary infection with purulent crusts", "Unresponsive to OTC medicated shampoos"],
    medicines: [
      {
        name: "Ketoconazole 2% Shampoo",
        brandExamples: "Nizoral 2% Shampoo",
        dosing: "Use twice weekly for 4 weeks; maintenance once weekly or fortnightly.",
        pregnancySafety: "Considered safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">2 years",
        extraInfo: "Leave lather on scalp for 3-5 minutes before rinsing."
      },
      {
        name: "Selenium Sulfide 2.5%",
        brandExamples: "Selsun Gold Shampoo",
        dosing: "Lather into wet hair for 2-3 mins, repeat and rinse thoroughly; twice weekly initially, then PRN.",
        pregnancySafety: "Safety not mentioned.",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: "Adults & Children",
        extraInfo: "Rinse thoroughly to prevent hair discoloration."
      },
      {
        name: "Salicylic Acid 2% + Coal Tar 5%",
        brandExamples: "Ionil T Scalp Shampoo",
        dosing: "Massage into scalp, rinse, reapply thick lather for 5 minutes, rinse thoroughly. Repeat 1-2 times weekly.",
        pregnancySafety: "Not recommended in pregnancy.",
        breastfeedingSafety: "Considered safe on small areas.",
        minAge: ">2 years",
        extraInfo: "Coal tar reduces scaling and cell turnover."
      }
    ],
    nonPharmAdvice: [
      "Gentle skin cleansing with soap-free wash.",
      "Soften and remove scales with mineral oil or olive oil before brushing.",
      "Avoid alcohol-containing hair products."
    ],
    clinicalNotes: ["Adult seborrhoeic dermatitis is a chronic relapsing condition associated with Malassezia yeast."]
  },
  {
    id: "shingles",
    condition: "Shingles / Herpes Zoster (زونا)",
    category: "Infectious Diseases & Neurology",
    symptoms: ["Dermatomal unilateral burning nerve pain, band-like erythematous rash with fluid-filled vesicles on torso"],
    referralCriteria: ["Ophthalmic involvement (rash near eye/tip of nose -> urgent ophthalmologist)", "Immunocompromised", "Motor weakness", "Rash present <72 hours (GP referral for oral antivirals)"],
    medicines: [
      {
        name: "Paracetamol 500mg",
        brandExamples: "Panadol",
        dosing: "1-2 tablets QID PRN for acute pain.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: ">1 month",
        extraInfo: "First-line baseline analgesia."
      },
      {
        name: "Capsaicin 0.025%, 0.075% Cream",
        brandExamples: "Zostrix, Zostrix HP",
        dosing: "Apply small amount to affected areas 3-4 times daily. Use continuously for 6 weeks for Post-Herpetic Neuralgia.",
        pregnancySafety: "Safety not mentioned.",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: ">2 years",
        extraInfo: "For Post-Herpetic Neuralgia ONLY after all active blisters have fully healed. Wash hands thoroughly."
      },
      {
        name: "Hydrogels (Solugel / Solosite)",
        brandExamples: "Solugel",
        dosing: "Apply liberally to soothe lesions during acute blister stage.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "All ages",
        extraInfo: "Keep in fridge for extra soothing effect."
      }
    ],
    nonPharmAdvice: [
      "Rest, increase fluid intake, wear loose cotton clothing.",
      "Keep rash clean and dry to prevent secondary bacterial infection.",
      "Avoid contact with pregnant women, newborns, and non-immune individuals (virus can transmit chickenpox from vesicles)."
    ],
    clinicalNotes: ["Oral antivirals (Famciclovir/Valaciclovir) must be started within 72 hours of rash onset to reduce neuralgia and ocular complications."]
  },
  {
    id: "smoking_cessation",
    condition: "Smoking Cessation & NRT (ترک سیگار و درمان جایگزین نیکوتین)",
    category: "Preventative Health & Addiction",
    symptoms: ["Nicotine craving, withdrawal symptoms (irritability, anxiety, insomnia, increased appetite)"],
    referralCriteria: ["Severe unstable cardiovascular disease (recent MI, unstable angina, severe arrhythmias)", "Pregnancy (GP counseling)"],
    medicines: [
      {
        name: "Nicotine Transdermal Patches (21mg, 14mg, 7mg / 24hr or 15mg, 10mg / 16hr)",
        brandExamples: "Nicabate, Nicorette Patch",
        dosing: "Moderate-High Dependence (>20 cigs/day or smoke within 30 min of waking): 21mg/24hr patch daily for 4-8 weeks, then step down. 16hr patches for night insomnia.",
        pregnancySafety: "Short-acting oral NRT preferred over patches in pregnancy.",
        breastfeedingSafety: "Short-acting oral NRT preferred.",
        minAge: ">12 years",
        extraInfo: "Apply to clean, dry, hairless skin on upper body/arm; rotate site daily. Dispose folded safely."
      },
      {
        name: "Nicotine Gums & Lozenges (2mg, 4mg) & QuickMist Oral Spray 1mg",
        brandExamples: "Nicorette Gum, Nicabate Lozenges, Nicorette QuickMist Spray",
        dosing: "Gum: Chew slowly until tingling, park between cheek and gum for 30 min. Lozenge: Suck slowly without chewing. Spray: 1-2 sprays into mouth (max 4/hr).",
        pregnancySafety: "Intermittent oral NRT preferred.",
        breastfeedingSafety: "Delay nursing for 2-3 hours after oral dose.",
        minAge: ">12 years",
        extraInfo: "Combination therapy (Patch + fast-acting Gum/Spray) provides highest cessation success rates."
      }
    ],
    nonPharmAdvice: [
      "The '4Ds' strategy: Delay urge, Deep breath, Drink water, Do something else.",
      "Identify triggers and change daily routines.",
      "Call Quitline (13 7848) for structured behavioral coaching."
    ],
    clinicalNotes: ["Smoking induces CYP1A2. Sudden cessation without dose adjustment can trigger Clozapine or Olanzapine toxicity."]
  },
  {
    id: "sore_throat",
    condition: "Sore Throat / Pharyngitis (گلودرد و فارنژیت)",
    category: "Ear, Nose & Throat",
    symptoms: ["Throat pain, discomfort on swallowing, pharyngeal erythema"],
    referralCriteria: ["Difficulty breathing / stridor", "Inability to swallow fluids/saliva (drooling -> Epiglottitis/Quinsy)", "Duration >7 days", "High fever with tender anterior cervical lymph nodes (Centor score criteria)"],
    medicines: [
      {
        name: "Povidone-Iodine Sore Throat Gargle 1%",
        brandExamples: "Betadine Sore Throat Gargle (Ready to use / Concentrated)",
        dosing: "Gargle 15mL for 30 seconds every 3-4 hours PRN (do NOT swallow). Dilute concentrated form 1:20.",
        pregnancySafety: "Not recommended in pregnancy (MIMS 2017).",
        breastfeedingSafety: "Not recommended in breastfeeding.",
        minAge: ">6 months (if able to gargle and spit)",
        extraInfo: "Avoid in thyroid disorders."
      },
      {
        name: "Benzydamine Anti-inflammatory (Spray / Gargle / Lozenges)",
        brandExamples: "Difflam Spray (1.5mg/mL), Difflam C Gargle, Difflam Anaesthetic Lozenges",
        dosing: "Spray: Adults >12yo: 4-8 sprays every 1.5-3h (Child 6-11yo: 4 sprays). Lozenges: 1 lozenge slowly Q2-3H (max 12 daily).",
        pregnancySafety: "Consider alternatives in pregnancy.",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: ">6 years",
        extraInfo: "Benzydamine provides NSAID-like local anti-inflammatory action; Lignocaine numbs pain."
      },
      {
        name: "Antiseptic / Anaesthetic Lozenges",
        brandExamples: "Strepsils Plus (Dichlorobenzyl alcohol + Amylmetacresol + Lignocaine)",
        dosing: "Dissolve 1 lozenge slowly every 2-3 hours.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: ">6 years",
        extraInfo: "Soothes irritated pharyngeal mucosa."
      }
    ],
    nonPharmAdvice: [
      "Rest, increase warm/cold fluids, minimise speaking.",
      "Gargle with warm salt water (1/2 tsp salt in warm water).",
      "Humidify indoor air; avoid smoking."
    ],
    clinicalNotes: ["Over 85% of sore throats are viral; antibacterials provide no meaningful clinical benefit."]
  },
  {
    id: "stings_bites",
    condition: "Bee & Wasp Stings / Insect Bites (نیش زنبور و حشرات)",
    category: "Toxicology & Allergy",
    symptoms: ["Sharp burning pain, localised swelling, erythema, red welt, itching"],
    referralCriteria: ["Anaphylaxis signs: facial/lip swelling, wheeze/dyspnea, hypotension, collapse (URGENT 000 + Adrenaline)", "Multiple stings (>10-20)", "Stings inside mouth/throat"],
    medicines: [
      {
        name: "Antihistamines & Topical Hydrocortisone 1%",
        brandExamples: "Telfast, Zyrtec, Dermaid 1%",
        dosing: "Oral antihistamine daily for itch/swelling; apply Hydrocortisone 1% BD for 3-5 days.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "Antihistamines: >1-2yo. Steroids: From birth.",
        extraInfo: "Sedating antihistamine (Phenergan) can be used at night for severe itch."
      },
      {
        name: "Adrenaline / Epinephrine Auto-Injector (Emergency)",
        brandExamples: "EpiPen 300mcg / EpiPen Jr 150mcg",
        dosing: "Administer IM into anterolateral mid-thigh immediately for systemic anaphylaxis; call 000; repeat in 5 min if no response.",
        pregnancySafety: "LIFE SAVING - DO NOT WITHHOLD IN ANAPHYLAXIS.",
        breastfeedingSafety: "Life saving.",
        minAge: "EpiPen Jr: 10-20kg. EpiPen: >20kg.",
        extraInfo: "Immediate emergency intervention."
      }
    ],
    nonPharmAdvice: [
      "Remove bee stinger IMMEDIATELY by scraping horizontally with a fingernail or credit card (do NOT squeeze venom sac).",
      "Wash area with soap and water; apply ice pack for 15-20 min to reduce swelling.",
      "Honeybees die after stinging; Wasps can sting repeatedly."
    ],
    clinicalNotes: ["Prompt stinger removal within seconds reduces total venom load injected."]
  },
  {
    id: "stye",
    condition: "Stye / External Hordeolum (گل‌مژه)",
    category: "Ophthalmology",
    symptoms: ["Painful, tender, red inflammatory lump on eyelid margin (pointing with yellow pus head), foreign body sensation"],
    referralCriteria: ["Entire eyelid swollen and erythematous (preseptal cellulitis)", "Visual disturbance", "Not improving after 5-7 days", "Internal hordeolum / chalazion"],
    medicines: [
      {
        name: "Hot Compresses Protocol",
        brandExamples: "Warm moist compresses",
        dosing: "Apply hot compress (as warm as comfortably tolerated) for 5-10 minutes 3-4 times daily.",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: "All ages",
        extraInfo: "Topical antibacterials are usually NOT indicated for simple external styes."
      }
    ],
    nonPharmAdvice: [
      "Never squeeze, pop, or puncture the stye (risks spreading infection into deep eyelid tissues).",
      "Wash hands frequently; dispose of used compresses cleanly.",
      "Avoid wearing eye makeup or contact lenses until fully resolved."
    ],
    clinicalNotes: ["Styes usually point and drain spontaneously within a few days under regular warm compresses."]
  },
  {
    id: "swimmers_ear",
    condition: "Swimmer's Ear / Otitis Externa (گوش‌درد شناگر و التهاب گوش خارجی)",
    category: "Ear, Nose & Throat",
    symptoms: ["Ear canal pain, itchiness, fullness, scaling, yellowish/green discharge following water exposure"],
    referralCriteria: ["Severe pain on pulling tragus/pinna", "Fever / spreading cellulitis", "Perforated eardrum", "History of grommets/ear surgery"],
    medicines: [
      {
        name: "Acetic Acid + Isopropyl Alcohol",
        brandExamples: "Aquaear, Ear Clear Swimmer's Ear, VoSol",
        dosing: "Instil 4-6 drops into each ear after swimming or bathing.",
        pregnancySafety: "Considered safe for short term.",
        breastfeedingSafety: "Considered safe.",
        minAge: ">2 years",
        extraInfo: "Acetic acid restores acidic pH (antimicrobial); Isopropyl alcohol dries moisture. CONTRAINDICATED IF EARDRUM IS PERFORATED."
      }
    ],
    nonPharmAdvice: [
      "Meticulous ear toilet: gently dry outer canal with rolled tissue paper.",
      "Use earplugs or petroleum-jelly coated cotton wool when showering.",
      "Avoid swimming until completely healed.",
      "Dry ears with cool hairdryer held away from ear."
    ],
    clinicalNotes: ["Acetic acid ear drops are prophylactic and therapeutic for mild otitis externa."]
  },
  {
    id: "teething",
    condition: "Teething (دندان درآوردن شیرخواران)",
    category: "Paediatrics & Oral Health",
    symptoms: ["Gum tenderness and redness, increased drooling, chewing objects, irritability (8-day window)"],
    referralCriteria: ["High fever (>38.5°C) - rule out other infections", "Persistent diarrhoea/vomiting", "Severe lethargy"],
    medicines: [
      {
        name: "Choline Salicylate 8.7% / SM-33 Gel",
        brandExamples: "Bonjela Teething Gel, SM-33 Gel",
        dosing: "Apply small dab to tender gums every 3 hours PRN (max 6 doses in 24 hours).",
        pregnancySafety: "Not applicable.",
        breastfeedingSafety: "Not applicable.",
        minAge: "Bonjela: >4 months. SM-33: >6 months.",
        extraInfo: "Do not exceed recommended dose."
      },
      {
        name: "Paracetamol / Ibuprofen Paediatric Suspension",
        brandExamples: "Children's Panadol, Dymadon, Nurofen for Children",
        dosing: "Weight-based dosing: Paracetamol 15mg/kg Q4-6H (max 60mg/kg/day); Ibuprofen 10mg/kg TDS.",
        pregnancySafety: "Not applicable.",
        breastfeedingSafety: "Not applicable.",
        minAge: "Paracetamol: >1 month. Ibuprofen: >3 months.",
        extraInfo: "For sleep disruption and distress."
      }
    ],
    nonPharmAdvice: [
      "Gently massage gum with clean finger or cool soft wet cloth.",
      "Offer chilled (NOT frozen) teething rings or sugar-free teething rusks.",
      "Gently wipe away drool from chin to prevent drool rash."
    ],
    clinicalNotes: ["Teething takes about 8 days (4 days before and 3 days after tooth erupts). Teething does NOT cause high fever or severe diarrhoea."]
  },
  {
    id: "oral_thrush",
    condition: "Oral Thrush / Candidiasis (برفک دهان)",
    category: "Oral Health & Antifungals",
    symptoms: ["Curdy milky-white plaques on tongue/mucosa that easily wipe off leaving raw red bleeding base, sore cottony mouth, loss of taste"],
    referralCriteria: ["Immunocompromised / HIV risk", "Dysphagia (difficulty swallowing -> esophageal involvement)", "Unresponsive after 7 days of treatment"],
    medicines: [
      {
        name: "Nystatin Oral Liquid 100,000 units/mL",
        brandExamples: "Nilstat Oral Liquid",
        dosing: "Adults & Infants from birth: 1mL swished in mouth after food 4 times daily for 7-14 days. Continue for 48h after resolution.",
        pregnancySafety: "Safe in pregnancy (Category A).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "From birth",
        extraInfo: "Hold in mouth as long as possible before swallowing. Administer after feeds."
      },
      {
        name: "Miconazole 2% Oral Gel",
        brandExamples: "Daktarin Oral Gel",
        dosing: "Adults & Child >2yo: 2.5mL QID. Infants 6mo-2yo: 1.25mL QID. Smear in front of mouth to prevent choking.",
        pregnancySafety: "Considered safe (AMH 2017).",
        breastfeedingSafety: "Not recommended (MIMS 2017).",
        minAge: ">6 months (Contraindicated <6mo due to infant choking hazard)",
        extraInfo: "Potent inhibitor of CYP2C9; major interaction with Warfarin."
      }
    ],
    nonPharmAdvice: [
      "Sterilise baby bottles, teats, and dummies frequently.",
      "Rinse mouth with water and spit out after using steroid inhalers (e.g. Seretide/Flixotide).",
      "Treat breastfeeding mother's nipples simultaneously if infected."
    ],
    clinicalNotes: ["Common secondary to broad-spectrum antibiotics, dentures, corticosteroids, and diabetes."]
  },
  {
    id: "vaginal_thrush",
    condition: "Vaginal Thrush / Candidiasis (عفونت قارچی واژن)",
    category: "Women's Health",
    symptoms: ["Intense vulvovaginal pruritus, burning, thick white curd-like discharge, dysuria, superficial dyspareunia, no offensive odor"],
    referralCriteria: ["First episode ever", "Pregnant patient (requires GP confirmation / 7-day topical only)", "Recurrent (>4 episodes/year)", "Abnormal vaginal bleeding / pelvic pain", "Foul smelling discharge (bacterial vaginosis)", "Under 18 years"],
    medicines: [
      {
        name: "Clotrimazole (Vaginal Pessaries & Cream)",
        brandExamples: "Canesten 1-Day (500mg/10%), 3-Day (2%), 6-Day (100mg/1%)",
        dosing: "Insert 1 pessary or 1 applicatorful of cream high into vagina at bedtime.",
        pregnancySafety: "Safe in pregnancy (Use 6-7 day course; insert by finger WITHOUT plastic applicator).",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">18 years (Schedule 3)",
        extraInfo: "Weakens latex condoms and diaphragms. Continue during menstruation."
      },
      {
        name: "Nystatin Vaginal Cream (100,000 units/5g)",
        brandExamples: "Nilstat Vaginal Cream",
        dosing: "Insert 1 full applicator 1-2 times daily for 14 days.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "Adults",
        extraInfo: "Virtual non-toxic and well-tolerated."
      },
      {
        name: "Fluconazole 150mg Single Oral Dose",
        brandExamples: "Diflucan One (Schedule 3)",
        dosing: "Take 1 capsule stat.",
        pregnancySafety: "STRICTLY CONTRAINDICATED IN PREGNANCY.",
        breastfeedingSafety: "Single dose considered safe.",
        minAge: ">18 years (Schedule 3)",
        extraInfo: "Convenient oral alternative when topical therapy fails."
      }
    ],
    nonPharmAdvice: [
      "Wipe from front to back.",
      "Avoid soap, bubble baths, and scented washes in genital area.",
      "Wear loose breathable cotton underwear.",
      "Treatment of asymptomatic sexual partners is NOT required."
    ],
    clinicalNotes: ["Vaginal thrush is not an STI; single oral Fluconazole 150mg is contraindicated in pregnancy."]
  },
  {
    id: "tinea_infections",
    condition: "Tinea / Athlete's Foot / Ringworm / Jock Itch (قارچ‌های پوستی تینیا)",
    category: "Dermatology & Antifungals",
    symptoms: ["Tinea Pedis: peeling, itchy macerated toe webs. Tinea Corporis: ring-shaped rash with raised scaly edge and clear centre. Tinea Cruris: groin rash sparing scrotum."],
    referralCriteria: ["Nail involvement (Onychomycosis)", "Scalp involvement (Tinea Capitis - requires systemic therapy)", "Secondary bacterial cellulitis", "Diabetic foot infection"],
    medicines: [
      {
        name: "Terbinafine 1% Cream/Gel",
        brandExamples: "Lamisil Cream, Lamisil DermGel",
        dosing: "Apply once or twice daily. Tinea pedis: 1 week; Corporis/Cruris: 1-2 weeks.",
        pregnancySafety: "Considered safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">1 year",
        extraInfo: "Fungicidal mechanism; shorter treatment duration and lower relapse rates than azoles."
      },
      {
        name: "Topical Azoles (Clotrimazole 1%, Miconazole 2%, Bifonazole 1%)",
        brandExamples: "Canesten Cream, Daktarin, Canesten Once Daily Bifonazole",
        dosing: "Apply 1-2 times daily. Continue for 2 WEEKS AFTER clinical resolution.",
        pregnancySafety: "Clotrimazole & Miconazole safe. Bifonazole not recommended.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: "Azoles: From birth. Bifonazole: >2 years.",
        extraInfo: "Fungistatic; requires prolonged course."
      }
    ],
    nonPharmAdvice: [
      "Dry thoroughly between toes after showering.",
      "Wear thongs in public showers, gyms, and pool areas.",
      "Change socks daily; use separate towel for infected areas."
    ],
    clinicalNotes: ["Never treat tinea with topical steroids alone (causes Tinea Incognito)."]
  },
  {
    id: "tinea_versicolor",
    condition: "Tinea Versicolor / Pityriasis Versicolor (تینیا ورسیکالر / قارچ رنگارنگ)",
    category: "Dermatology & Antifungals",
    symptoms: ["Discoloured patches (tan, brown, pink, white) with fine dust-like scale on chest, back, upper arms, mild itch"],
    referralCriteria: ["Widespread atypical lesions", "Unresponsive to OTC topical antifungals (requires systemic therapy)"],
    medicines: [
      {
        name: "Econazole 1% Foaming Solution",
        brandExamples: "Pevaryl Foaming Solution",
        dosing: "Apply to wet skin, allow to dry and leave overnight for 3 consecutive nights.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Safe in breastfeeding.",
        minAge: ">2 years",
        extraInfo: "Convenient for large trunk body surface area."
      },
      {
        name: "Ketoconazole 2% Shampoo",
        brandExamples: "Nizoral 2% Shampoo",
        dosing: "Apply, leave for 5 minutes, rinse off daily for 5 consecutive days.",
        pregnancySafety: "Considered safe.",
        breastfeedingSafety: "Safe.",
        minAge: ">2 years",
        extraInfo: "Active against Malassezia yeast."
      },
      {
        name: "Selenium Sulfide 2.5%",
        brandExamples: "Selsun Gold Shampoo",
        dosing: "Apply to wet skin, leave on 10 min or overnight for 7-10 consecutive days.",
        pregnancySafety: "Safety not mentioned.",
        breastfeedingSafety: "Safety not mentioned.",
        minAge: "Adults",
        extraInfo: "Inhibits Malassezia proliferation."
      }
    ],
    nonPharmAdvice: [
      "Reassure patient that normal skin pigmentation may take several months to return after yeast eradication.",
      "Wear loose breathable cotton clothing.",
      "Avoid excessive heat and heavy sweating."
    ],
    clinicalNotes: ["Malassezia produces azelaic acid which inhibits tyrosinase, leading to skin hypopigmentation."]
  },
  {
    id: "uti_cystitis",
    condition: "UTI / Cystitis (عفونت ادراری و سوزش مثانه)",
    category: "Urinary & Renal",
    symptoms: ["Dysuria (burning on urination), frequency, urgency, cloudy urine, suprapubic ache"],
    referralCriteria: ["All men and children with UTI symptoms (MANDATORY GP REFERRAL)", "Systemic signs: Fever, rigors, flank pain, vomiting (Pyelonephritis)", "Visible hematuria (blood in urine)", "Pregnancy", "Symptoms >48 hours"],
    medicines: [
      {
        name: "Urinary Alkalinisers (Sodium Bicarbonate, Citric Acid, Tartaric Acid)",
        brandExamples: "Ural Sachets, Citravescent",
        dosing: "Dissolve 1-2 sachets in cold water 3-4 times daily.",
        pregnancySafety: "Use with caution.",
        breastfeedingSafety: "Use with caution.",
        minAge: "Children only under doctor supervision",
        extraInfo: "Symptomatic dysuria relief only; DOES NOT TREAT BACTERIAL INFECTION. High sodium content (caution in hypertension/heart failure/renal disease). Reduces efficacy of Hiprex."
      },
      {
        name: "Methenamine Hippurate 1g",
        brandExamples: "Hiprex Tablets",
        dosing: "Adults >12yo: 1 tablet BD. Child 6-11yo: 1/2 to 1 tablet BD.",
        pregnancySafety: "Safe in pregnancy.",
        breastfeedingSafety: "Considered safe in breastfeeding.",
        minAge: ">6 years",
        extraInfo: "For UTI PROPHYLAXIS ONLY (not acute treatment). Requires acidic urine pH <5.5 to release formaldehyde. DO NOT COMBINE WITH URAL."
      }
    ],
    nonPharmAdvice: [
      "Drink plenty of water (2-3L/day) to flush out bacteria.",
      "Wipe from front to back; empty bladder immediately after intercourse.",
      "Do not hold in urine."
    ],
    clinicalNotes: ["Ural alkalises urine, which inactivates Hiprex and reduces Nitrofurantoin efficacy."]
  },
  {
    id: "warts",
    condition: "Warts & Verrucas (زگیل و زگیل کف پا)",
    category: "Dermatology",
    symptoms: ["Small raised hyperkeratotic rough papules (1-10mm), plantar warts have tiny pinpoint black dots (thrombosed capillaries)"],
    referralCriteria: ["Facial, anogenital, or mucosal warts", "Diabetic patients / peripheral neuropathy", "Immunocompromised", "Multiple widespread recalcitrant lesions"],
    medicines: [
      {
        name: "Salicylic Acid + Lactic Acid Paints",
        brandExamples: "Duofilm Liquid (SA 16.7%, LA 16.7%), Wart Clear Liquid",
        dosing: "Apply 1-2 times daily until wart is completely cleared and skin ridge lines are restored (up to 12 weeks).",
        pregnancySafety: "Consider alternative (limited data).",
        breastfeedingSafety: "Considered safe on small areas.",
        minAge: ">2 years",
        extraInfo: "Soak in warm water for 5 min, pare down with pumice stone, protect healthy skin with petroleum jelly, apply to wart and cover with plaster."
      },
      {
        name: "Cryotherapy (Dimethyl Ether + Propane)",
        brandExamples: "Wartner Cryotherapy",
        dosing: "Apply foam applicator for 10-20 seconds directly on wart (single treatment; repeat after 2 weeks if needed).",
        pregnancySafety: "Safe.",
        breastfeedingSafety: "Safe.",
        minAge: ">4 years",
        extraInfo: "Freezes core of wart."
      }
    ],
    nonPharmAdvice: [
      "Warts are caused by HPV and spread by direct contact; avoid scratching or picking.",
      "Dispose of pumice stones / emery boards after wart clears to avoid re-infection.",
      "Use separate towels; wear flip-flops around communal pools."
    ],
    clinicalNotes: ["Podophyllotoxin is strictly contraindicated in pregnancy. 30% of warts resolve spontaneously in 6 months."]
  },
  {
    id: "worms_pinworms",
    condition: "Pinworms / Threadworms (کرمک و انگل روده)",
    category: "Gastrointestinal & Parasitology",
    symptoms: ["Nocturnal perianal itching, disturbed sleep, irritability, visible white thread-like worms (~1cm) in stool/around anus"],
    referralCriteria: ["Recent international tropical travel", "Infant <6 months", "Severe secondary skin infection"],
    medicines: [
      {
        name: "Mebendazole 100mg",
        brandExamples: "Combantrin-1, Vermox Tablets/Suspension",
        dosing: "Adults & Infants >6mo (>10kg): 1 tablet (100mg) stat. MANDATORY REPEAT AFTER 2 WEEKS.",
        pregnancySafety: "Avoid in 1st trimester.",
        breastfeedingSafety: "Considered safe in breastfeeding.",
        minAge: ">6 months",
        extraInfo: "Single 100mg dose regardless of weight/age. Repeat at 2 weeks is essential to kill worms hatched from surviving eggs."
      },
      {
        name: "Pyrantel Embonate (10mg/kg)",
        brandExamples: "Combantrin Liquid / Chocolate Squares (100mg/square)",
        dosing: "Adults & Children >1yo: 10mg/kg (max 1g) stat. MANDATORY REPEAT AFTER 2 WEEKS.",
        pregnancySafety: "Considered safe in pregnancy (Preferred over mebendazole).",
        breastfeedingSafety: "Considered safe in breastfeeding.",
        minAge: ">1 year",
        extraInfo: "Weight-based dosing. Repeat after 2 weeks."
      }
    ],
    nonPharmAdvice: [
      "TREAT ALL HOUSEHOLD FAMILY MEMBERS SIMULTANEOUSLY, even if asymptomatic.",
      "Wash hands frequently and keep fingernails short; discourage nail biting.",
      "Wash sleepwear, bed linen, and towels in hot water (>60°C).",
      "Morning showers help wash away eggs laid around anus overnight."
    ],
    clinicalNotes: ["Adult pinworms are slender, white, and about 1cm long. Major route of transmission is faecal-oral."]
  }
];

