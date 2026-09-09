import { StudyTrackDefinition } from '@/types/studyTrack';

export const STUDY_TRACKS_DATABASE: StudyTrackDefinition[] = [
  // 1. مسیر پیشرفت علمی و آزمون جامع OTC
  {
    id: 'track_1_otc_exam',
    trackNumber: 1,
    title: {
      fa: '۱. مسیر پیشرفت علمی و آزمون جامع OTC',
      en: 'Track 1: OTC Comprehensive Clinical Exam Pathway',
    },
    subtitle: {
      fa: 'پروتکل‌های تریاژ، الگوریتم‌های ارجاع اورژانسی، چارچوب WWHAM و پرچم‌های قرمز',
      en: 'Triage protocols, urgent referral algorithms, WWHAM framework & Red Flags',
    },
    description: {
      fa: 'این مسیر به طور ویژه برای تسلط بر مهارت‌های تریاژ بالینی OTC، شناسایی سریع علائم خطرناک (Red Flags)، تفکیک بیماری‌های جزئی از موارد ارجاعی و استراتژی‌های مدیریت بیمار در آزمون‌های ارزیابی داروسازی استرالیا طراحی شده است.',
      en: 'Specially designed for mastering OTC clinical triage skills, rapid identification of Red Flags, differentiating minor ailments from referral conditions, and patient management strategies for Australian pharmacy exams.',
    },
    iconName: 'Stethoscope',
    badge: {
      fa: 'جامع OTC & Triage',
      en: 'Comprehensive OTC',
    },
    badgeColor: 'from-teal-500 to-emerald-600',
    primaryModule: 1,
    targetFocus: {
      fa: 'تسلط بر تریاژ، شناسایی شرایط ارجاع به پزشک و سوالات پروتکلی WWHAM',
      en: 'Mastery in clinical triage, urgent referral criteria, and structured WWHAM interrogation',
    },
    milestones: [
      {
        id: 'm1_triage_resp',
        title: {
          fa: 'تریاژ بیماری‌های تنفسی و سرفه (Respiratory & Asthma Triage)',
          en: 'Respiratory & Cough Triage Management',
        },
        description: {
          fa: 'تشخیص افتراقی سرفه خشک/خلط‌دار، علائم هشدار آسم شبانه، هموپتیزی و پروتکل‌های تهویه.',
          en: 'Differential diagnosis of productive vs dry cough, nocturnal asthma warning signs, and hemoptysis.',
        },
        moduleId: 1,
        targetItemIds: ['scen_resp_cough_01', 'scen_resp_asthma_01', 'scen_resp_rhinitis_01'],
      },
      {
        id: 'm1_triage_gi',
        title: {
          fa: 'تریاژ سیستم گوارش (Gastrointestinal Alimentary Triage)',
          en: 'Gastrointestinal & Reflux Triage',
        },
        description: {
          fa: 'مدیریت GERD، زخم‌های گوارشی، اسهال حاد و پرچم‌های خطر ملنا و دیسفاژی.',
          en: 'Management of GERD, peptic symptoms, acute gastroenteritis, dysphagia, and melena red flags.',
        },
        moduleId: 1,
        targetItemIds: ['scen_gi_gerd_01', 'scen_gi_diarrhea_01', 'scen_gi_constipation_01'],
      },
      {
        id: 'm1_triage_pain',
        title: {
          fa: 'تریاژ درد و میگرن (Pain, Migraine & Analgesia Triage)',
          en: 'Pain & Headache Triage Pathways',
        },
        description: {
          fa: 'سردردهای ناگهانی تندرکلپ، تداخلات NSAIDs، مصرف بیش از حد مسکن‌ها (MOH).',
          en: 'Thunderclap headaches, NSAID contraindications, Medication Overuse Headache (MOH).',
        },
        moduleId: 1,
        targetItemIds: ['scen_pain_migraine_01', 'scen_pain_back_01', 'scen_pain_fever_01'],
      },
      {
        id: 'm1_triage_dermatology',
        title: {
          fa: 'تریاژ پوست، چشم و گوش (Dermatology, Ocular & Ear)',
          en: 'Skin, Eye & Ear Triage Protocols',
        },
        description: {
          fa: 'عفونت‌های قارچی در برابر باکتریایی، ملتحمه چشم و ارجاع فوری درد چشم و تاری دید.',
          en: 'Fungal vs bacterial rashes, conjunctivitis, corneal pain, and urgent visual loss.',
        },
        moduleId: 1,
        targetItemIds: ['scen_skin_fungal_01', 'scen_eye_conjunct_01', 'scen_ear_otitis_01'],
      },
    ],
  },

  // 2. مسیر مقدماتی و پرکتیس عمومی داروخانه
  {
    id: 'track_2_general_practice',
    trackNumber: 2,
    title: {
      fa: '۲. مسیر مقدماتی و پرکتیس عمومی داروخانه',
      en: 'Track 2: General Community Pharmacy Practice',
    },
    subtitle: {
      fa: 'مهارت‌های پایه روزمره داروخانه بدون سناریوهای پیچیده و پرچالش آزمون تخصصی',
      en: 'Foundational community pharmacy workflows without overwhelming complex exam cases',
    },
    description: {
      fa: 'این مسیر روی فرآیندهای رایج روزانه، مشاوره‌های مقدماتی خط اول، مکمل‌ها، لوازم اولیه و ارتباط روزمره با مراجعین داروخانه تمرکز دارد تا پایه‌ای استوار برای کار در محیط واقعی داروخانه فراهم شود.',
      en: 'Focuses on routine frontline consultations, fundamental OTC products, first-aid essentials, and smooth day-to-day patient communications for community pharmacy baseline competence.',
    },
    iconName: 'Store',
    badge: {
      fa: 'پرکتیس مقدماتی',
      en: 'General Practice',
    },
    badgeColor: 'from-sky-500 to-blue-600',
    primaryModule: 2,
    targetFocus: {
      fa: 'مفاهیم پایه OTC، انتخاب داروهای خط اول و راهنمایی شفاف بیمار',
      en: 'First-line OTC products, basic dosing advice, and daily customer interaction',
    },
    milestones: [
      {
        id: 'm2_analgesics_basics',
        title: {
          fa: 'مسکن‌های خط اول و ضدتب‌ها (First-Line Analgesics)',
          en: 'Paracetamol & First-Line Pain Management',
        },
        description: {
          fa: 'دوزهای استاندارد پاراستامول، ایبوپروفن در کودکان و هشدارهای عمومی مصرف.',
          en: 'Standard dosing of paracetamol, pediatric ibuprofen safety, and general usage instructions.',
        },
        moduleId: 2,
        targetItemIds: ['prod_panadol_500', 'prod_nurofen_200', 'prod_daktarin_gel'],
      },
      {
        id: 'm2_colds_allergies',
        title: {
          fa: 'سرماخوردگی، آنتی‌هیستامین‌ها و دکونژستانت‌ها (Colds & Allergies)',
          en: 'Cold, Flu & Antihistamine Selection',
        },
        description: {
          fa: 'تفاوت آنتی‌هیستامین‌های نسل اول و دوم، اسپری‌های استروئیدی بینی و شستشوی نمکی.',
          en: 'First vs second generation antihistamines, intranasal corticosteroids, and saline rinses.',
        },
        moduleId: 2,
        targetItemIds: ['prod_telfast_180', 'prod_nasonex', 'prod_bisolvon_chesty'],
      },
      {
        id: 'm2_topical_care',
        title: {
          fa: 'مراقبت‌های پوستی و کرم‌های هیدروکورتیزون S2/S3 (Skin Care)',
          en: 'Topical Hydrocortisone & Antifungals',
        },
        description: {
          fa: 'اصول مصرف کلوتریمازول، کرم‌های نرم‌کننده اگزما و کرم هیدروکورتیزون ۰.۵٪ و ۱٪.',
          en: 'Clotrimazole guidelines, emollient therapy for eczema, and hydrocortisone 0.5% vs 1%.',
        },
        moduleId: 2,
        targetItemIds: ['prod_canesten_cream', 'prod_dermaid_1', 'prod_solosite_gel'],
      },
    ],
  },

  // 3. مسیر شبیه‌ساز سوالات شفاهی (Oral / Viva Q&A)
  {
    id: 'track_3_oral_viva',
    trackNumber: 3,
    title: {
      fa: '۳. مسیر شبیه‌ساز سوالات شفاهی (Oral / Viva Q&A)',
      en: 'Track 3: Pharmacist Oral & Viva Q&A Simulator',
    },
    subtitle: {
      fa: 'پرسش‌های متداول ممتحن آزمون شفاهی استرالیا و چارچوب پاسخ استاندارد داوطلب',
      en: 'Common Australian Oral Exam examiner inquiries and structured candidate response scripts',
    },
    description: {
      fa: 'شبیه‌سازی کامل سناریوهای پرسش و پاسخ شفاهی که در آن ممتحن با پرسش‌های چالش‌برانگیز داوطلب را به چالش می‌کشد؛ شامل نحوه بیان لحن حرفه‌ای، توضیح به زبان ساده به بیمار و استدلال بالینی.',
      en: 'Comprehensive oral exam simulation featuring examiner probing questions and model candidate responses with clinical reasoning, counseling articulation, and professional tone.',
    },
    iconName: 'MessagesSquare',
    badge: {
      fa: 'آزمون شفاهی Viva',
      en: 'Oral / Viva Exam',
    },
    badgeColor: 'from-amber-500 to-orange-600',
    primaryModule: 1,
    targetFocus: {
      fa: 'تسلط بر مکالمه شفاهی، نحوه پاسخ به سوالات تله‌ای ممتحن و بیان آرام نکات ایمنی',
      en: 'Oral articulacy, addressing examiner trap questions, and calm communication of safety limits',
    },
    milestones: [
      {
        id: 'm3_slang_comprehension',
        title: {
          fa: 'اصطلاحات عامیانه استرالیایی و تعامل با بیمار (Aussie Slang & Culture)',
          en: 'Aussie Slang & Cultural Communication',
        },
        description: {
          fa: 'درک اصطلاحات محلی (مثل chuck a sickie, agro, mozzies, reg 24) و پاسخ به زبان معیار.',
          en: 'Interpreting local colloquials and maintaining empathetic, culturally safe communication.',
        },
        moduleId: 1,
        targetItemIds: ['scen_slang_tradie_01', 'scen_slang_bush_01', 'scen_slang_elderly_01'],
      },
      {
        id: 'm3_conflict_resolution',
        title: {
          fa: 'مدیریت درخواست‌های غیرقانونی و تهاجمی (Conflict & Supply Refusal)',
          en: 'Refusal to Supply & Conflict Management',
        },
        description: {
          fa: 'نحوه امتناع مودبانه از تحویل زودهنگام S3/S8، مدیریت بیماران پرخاشگر و جایگزین‌های ایمن.',
          en: 'Polite refusal for early S3/S8 requests, de-escalating aggressive patients, and safe alternatives.',
        },
        moduleId: 1,
        targetItemIds: ['scen_conflict_pseudo_01', 'scen_conflict_codeine_01', 'scen_conflict_early_s8'],
      },
      {
        id: 'm3_oral_counseling_pearls',
        title: {
          fa: 'مشاوره شفاهی داروهای حساس و هشدار داروها (Oral Counseling Gems)',
          en: 'High-Risk Drug Oral Counseling Pearls',
        },
        description: {
          fa: 'توضیح شفاهی متوترکسات هفتگی، وارفارین و رژیم‌های ترکیبی در آزمون شفاهی.',
          en: 'Verbal delivery for weekly methotrexate, warfarin INR monitoring, and combined inhalers.',
        },
        moduleId: 4,
        targetItemIds: ['card_mod4_methotrexate', 'card_mod4_warfarin', 'card_mod4_inhalers'],
      },
    ],
  },

  // 4. مبانی علمی OTC و فارماکولوژی
  {
    id: 'track_4_otc_pharma',
    trackNumber: 4,
    title: {
      fa: '۴. مبانی علمی OTC و فارماکولوژی',
      en: 'Track 4: OTC Pharmacology & Drug Mechanisms',
    },
    subtitle: {
      fa: 'داروشناسی بالینی، مکانیسم‌های سلولی، برچسب‌های CAL، تداخلات و شاخص‌های درمانی باریک',
      en: 'Clinical pharmacology, cellular mechanisms, CAL cautionary labels, NTI & interactions',
    },
    description: {
      fa: 'مطالعه عمیق ساختار فارماکولوژی، گیرنده‌ها، نیمه‌عمر داروها، متابولیسم کبدی سیتوکروم P450، کدهای برچسب هشدار استرالیا (CAL Labels) و مقایسه بالینی دسته‌های دارویی هم‌گروه.',
      en: 'In-depth study of pharmacology, receptors, drug half-lives, CYP450 metabolism, Australian Cautionary Advisory Labels (CAL), and comparative analysis of drug classes.',
    },
    iconName: 'Pill',
    badge: {
      fa: 'فارماکولوژی & CAL',
      en: 'Pharmacology & CAL',
    },
    badgeColor: 'from-purple-500 to-indigo-600',
    primaryModule: 4,
    targetFocus: {
      fa: 'مکانیسم‌های دارویی، برچسب‌های احتیاطی CAL، داروهای NTI و فارماکوکینتیک بالینی',
      en: 'Drug mechanisms of action, mandatory CAL label assignments, NTI rules, and PK/PD',
    },
    milestones: [
      {
        id: 'm4_cardiovascular_pharma',
        title: {
          fa: 'فارماکولوژی قلب و عروق و فشارخون (Cardiovascular Pharmacology)',
          en: 'CVD, Antihypertensives & Lipid Lowering',
        },
        description: {
          fa: 'مهارکننده‌های ACE vs ARBs، مسدودکننده‌های بتا و کانال کلسیم، استاتین‌ها و رابدومیولیز.',
          en: 'ACE inhibitors vs ARBs, beta & calcium channel blockers, statins and myopathy risks.',
        },
        moduleId: 4,
        targetItemIds: ['card_mod4_cvd_acei', 'card_mod4_cvd_bb', 'card_mod4_cvd_statins'],
      },
      {
        id: 'm4_cal_labels_mastery',
        title: {
          fa: 'تسلط کامل بر برچسب‌های اخطار استرالیا (Australian CAL Labels)',
          en: 'Australian Cautionary Advisory Labels (CAL)',
        },
        description: {
          fa: 'برچسب‌های حیاتی: CAL 1 (خواب‌آلودگی)، CAL 12 (نور خورشید)، CAL 13 (شیر/آنتی‌اسید)، CAL A.',
          en: 'Crucial labels: CAL 1 (drowsiness), CAL 12 (photosensitivity), CAL 13 (calcium chelation), CAL A.',
        },
        moduleId: 2,
        targetItemIds: ['cal_label_1', 'cal_label_12', 'cal_label_13', 'cal_label_a', 'cal_label_16'],
      },
      {
        id: 'm4_endocrine_antimicrobials',
        title: {
          fa: 'غدد درون‌ریز، دیابت و ضدباکتری‌ها (Endocrine & Antimicrobials)',
          en: 'Diabetes Pharmacology & Antimicrobial Stewardship',
        },
        description: {
          fa: 'متفورمین، مهارکننده‌های SGLT2، مهارکننده‌های DPP-4 و طیف اثر آنتی‌بیوتیک‌های کلیدی.',
          en: 'Metformin, SGLT2 inhibitors, DPP-4 inhibitors, and spectrum of key antimicrobials.',
        },
        moduleId: 4,
        targetItemIds: ['card_mod4_endo_sglt2', 'card_mod4_micro_penicillins', 'card_mod4_micro_macrolides'],
      },
    ],
  },

  // 5. قوانین، مقررات و فرآیندها
  {
    id: 'track_5_laws_dispense',
    trackNumber: 5,
    title: {
      fa: '۵. قوانین، مقررات و فرآیندهای نسخه پیچی',
      en: 'Track 5: Pharmacy Legislation, PBS Rules & Dispensing Flow',
    },
    subtitle: {
      fa: 'قوانین جدول‌بندی SUSMP (S2/S3/S4/S8)، فرآیند نرم‌افزار Fred، فرم‌های PB 82/PB 24 و Reg 24',
      en: 'SUSMP Scheduling (S2/S3/S4/S8), Fred Dispense workflow, PB 82/PB 24 forms, and Reg 24',
    },
    description: {
      fa: 'آشنایی جامع با ساختار قانونی داروخانه‌های استرالیا، اعتبارسنجی نسخه‌های کاغذی و الکترونیکی (eScript Tokens)، قوانین نگهداری و ثبت سوابق داروهای تحت کنترل (S8 Register) و محاسبات Safety Net و PBS.',
      en: 'In-depth mastery of Australian pharmacy law, paper vs eScript tokens validation, S8 Controlled Drug Register requirements, state storage variations, and PBS Safety Net thresholds.',
    },
    iconName: 'Scale',
    badge: {
      fa: 'قوانین & Fred Dispense',
      en: 'Law & Dispensing',
    },
    badgeColor: 'from-rose-500 to-pink-600',
    primaryModule: 3,
    targetFocus: {
      fa: 'اعتبارسنجی قانونی نسخه‌ها، فرم‌های PBS، قوانین S8 و ثبت نرم‌افزاری در Fred',
      en: 'Legal prescription validation, PBS entitlement forms, S8 safe storage, and Fred software entries',
    },
    milestones: [
      {
        id: 'm5_pbs_scripts_validation',
        title: {
          fa: 'اعتبارسنجی نسخه‌های PB 82 و PB 24 تکرار (PBS Script Validation)',
          en: 'PBS PB 82 & PB 24 Repeat Forms Validation',
        },
        description: {
          fa: 'بررسی Provider Number، تاریخ انقضای ۱۲ ماهه، منگنه فرم تکرار زرد و Store Copy.',
          en: 'Checking Provider Number, 12-month validity, Yellow Repeat PB 24 stapling, and Store Copy.',
        },
        moduleId: 3,
        targetItemIds: ['script_pb82', 'script_repeat_pb24', 'script_handwritten'],
      },
      {
        id: 'm5_s8_controlled_drugs',
        title: {
          fa: 'قوانین و ثبت دفاتر داروهای تحت کنترل S8 (S8 Controlled Drugs Law)',
          en: 'S8 Controlled Drugs Compliance & Register',
        },
        description: {
          fa: 'شماره مجوز در نسخه‌های بیش از ۲ ماه، گاوصندوق مجزا، ثبت ورودی/خروجی و اعتبارسنجی هویت.',
          en: 'State authority numbers for >2 months supply, approved safe storage, daily register balance.',
        },
        moduleId: 3,
        targetItemIds: ['script_s8_nsw', 'script_odt_racf'],
      },
      {
        id: 'm5_state_storage_reg24',
        title: {
          fa: 'تفاوت قوانین ایالت‌ها، بایگانی اسناد و ماده ۲۴ (Regulation 24 & Storage)',
          en: 'Regulation 24, Document Retention & State Storage',
        },
        description: {
          fa: 'تحویل همزمان همه تکرارها در شرایط خاص (Reg 24)، بایگانی ۲ تا ۷ سال و قوانین پشت‌کانتر S3.',
          en: 'Simultaneous repeat supply (Regulation 24), 2-7 year record retention, and behind-counter S3 rules.',
        },
        moduleId: 3,
        targetItemIds: ['rule_state_storage_vic', 'rule_state_storage_nsw', 'panel_pbs_safety_net'],
      },
    ],
  },
];
