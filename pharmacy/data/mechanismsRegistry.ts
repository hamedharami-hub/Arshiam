export type ActionClassification =
  | 'fungicidal'
  | 'fungistatic'
  | 'bactericidal'
  | 'bacteriostatic'
  | 'virosuppressive'
  | 'helminthicidal'
  | 'receptor_agonist'
  | 'receptor_antagonist'
  | 'enzyme_inhibitor'
  | 'transporter_inhibitor'
  | 'ion_channel_blocker'
  | 'anti_inflammatory'
  | 'antiresorptive'
  | 'antidote_reversal'
  | 'neutralizer'
  | 'modulator'
  | 'hormone_replacement'
  | 'supplement'
  | 'vaccine'
  | 'barrier_protectant';

export interface CategoryMechanismOverview {
  subcategoryId: string;
  categoryTitleFa: string;
  categoryTitleEn: string;
  targetPathwayFa: string;
  targetPathwayEn: string;
  primaryActionFa: string;
  primaryActionEn: string;
  actionClassification: ActionClassification;
  summaryFa: string;
  summaryEn: string;
  keyClasses: {
    nameFa: string;
    nameEn: string;
    classCode: string;
    actionType: string;
    mechanismFa: string;
    mechanismEn: string;
    examples: string;
  }[];
}

export interface DrugMechanismInfo {
  classCode: string;
  classNameFa: string;
  classNameEn: string;
  actionClassification: ActionClassification;
  actionTypeLabelFa: string;
  actionTypeLabelEn: string;
  targetSiteFa: string;
  targetSiteEn: string;
  cellularEffectFa: string;
  cellularEffectEn: string;
  descriptionFa: string;
  descriptionEn: string;
  clinicalRelevanceFa: string;
  clinicalRelevanceEn: string;
  colorClass: string;
}

export const SUBCATEGORY_MECHANISMS: Record<string, CategoryMechanismOverview> = {
  // SUB-1-2: Parasitic & Fungal Infections (Antifungals & Anthelmintics)
  'sub-1-2': {
    subcategoryId: 'sub-1-2',
    categoryTitleFa: 'داروهای ضد قارچ و ضد انگل (Antifungals & Anthelmintics)',
    categoryTitleEn: 'Antifungal & Anthelmintic Agents',
    targetPathwayFa: 'بیوسنتز ارگوسترول غشای سلولی قارچ / سیستم میکروتوبول و جذب گلوکز انگل',
    targetPathwayEn: 'Fungal ergosterol biosynthesis pathway / Helminth beta-tubulin & glucose uptake',
    primaryActionFa: 'آزول‌ها: قارچ‌ایستا (Fungistatic) | آلیل‌آمین‌ها: قارچ‌کش (Fungicidal) | مبندازول: کشنده انگل (Vermicidal)',
    primaryActionEn: 'Azoles: Fungistatic | Allylamines: Fungicidal | Mebendazole: Vermicidal / Helminthicidal',
    actionClassification: 'fungicidal',
    summaryFa:
      'داروهای ضد قارچ 주로 با هدف‌گیری غشای سلولی قارچ عمل می‌کنند: مشتقات آزول (فلوکونازول، کلوتریمازول، میکونازول) آنزیم سیتوکروم 14α-دمتیلاز را مهار کرده و رشد قارچ را متوقف می‌کنند (Fungistatic)، در حالی که آلیل‌آمین‌ها (تربینافین) با مهار اسکوالن اپوکسیداز و تجمع پیش‌ساز سمی، باعث تخریب سریع و مرگ دیواره قارچی می‌شوند (Fungicidal). داروی ضد انگل مبندازول نیز با اتصال به بتا-توبولین و مهار جذب گلوکز، انگل را فلج و نابود می‌سازد.',
    summaryEn:
      'Antifungal agents selectively disrupt the fungal cell membrane: Azoles (Fluconazole, Clotrimazole, Miconazole) inhibit fungal CYP51 14α-demethylase preventing ergosterol synthesis (fungistatic), whereas Allylamines (Terbinafine) inhibit squalene epoxidase causing toxic squalene accumulation and rapid membrane lysis (fungicidal). Anthelmintics like Mebendazole bind nematode beta-tubulin to block glucose uptake, starving the pinworm.',
    keyClasses: [
      {
        nameFa: 'مشتقات ایمیدازول و تری‌آزول (Azoles)',
        nameEn: 'Azole Antifungals (Imidazoles & Triazoles)',
        classCode: 'mech-azoles',
        actionType: 'Fungistatic (قارچ‌ایستا)',
        mechanismFa: 'مهار آنزیم 14α-لانوسـترول دمتیلاز وابسته به سیتوکروم P450 و جلوگیری از تبدیل لانوسترول به ارگوسترول.',
        mechanismEn: 'Inhibits fungal cytochrome P450 14α-lanosterol demethylase, preventing conversion of lanosterol to ergosterol.',
        examples: 'Fluconazole, Clotrimazole, Miconazole, Ketoconazole',
      },
      {
        nameFa: 'مشتقات آلیل‌آمین (Allylamines)',
        nameEn: 'Allylamine Antifungals',
        classCode: 'mech-allylamines',
        actionType: 'Fungicidal (قارچ‌کش مستقیم)',
        mechanismFa: 'مهار زودرس آنزیم اسکوالن اپوکسیداز، کاهش ارگوسترول و تجمع مقادیر سمی درون‌سلولی اسکوالن.',
        mechanismEn: 'Inhibits squalene epoxidase, leading to intracellular toxic accumulation of squalene and rapid fungal death.',
        examples: 'Terbinafine (Lamisil)',
      },
      {
        nameFa: 'پلی‌ان‌ها (Polyenes)',
        nameEn: 'Polyene Antifungals',
        classCode: 'mech-polyenes',
        actionType: 'Fungicidal / Fungistatic (بر اساس دوز)',
        mechanismFa: 'اتصال مستقیم به ارگوسترول غشا، ایجاد حفرات نشت یونی و تخلیه پتاسیم داخل سلول قارچ.',
        mechanismEn: 'Binds directly to fungal ergosterol, forming transmembrane channels and causing lethal ion leakage.',
        examples: 'Nystatin, Amphotericin B',
      },
      {
        nameFa: 'بنزایمیدازول‌های ضد انگل (Benzimidazoles)',
        nameEn: 'Benzimidazole Anthelmintics',
        classCode: 'mech-benzimidazoles',
        actionType: 'Helminthicidal (کشنده انگل کرمک)',
        mechanismFa: 'اتصال انتخابی به بتاتوبولین انگل، جلوگیری از پلیمریزاسیون میکروتوبول‌ها و مهار جذب گلوکز.',
        mechanismEn: 'Selectively binds nematode beta-tubulin, disrupting microtubule assembly and blocking glucose uptake.',
        examples: 'Mebendazole (Vermox)',
      },
    ],
  },

  // SUB-5-3: Antifungal Therapy (Systemic & Deep Mycoses)
  'sub-5-3': {
    subcategoryId: 'sub-5-3',
    categoryTitleFa: 'درمان‌های سیستمیک و تخصصی ضد قارچ (Systemic Antifungal Therapy)',
    categoryTitleEn: 'Systemic Antifungal Therapy',
    targetPathwayFa: 'سنتز ارگوسترول غشای سلولی / بیوسنتز بتا-گلوکان دیواره سلولی قارچی',
    targetPathwayEn: 'Ergosterol biosynthesis / Fungal cell wall 1,3-beta-D-glucan synthesis',
    primaryActionFa: 'آزول‌ها: Fungistatic (مهار رشد) | اکینوکاندین‌ها: Fungicidal در کاندیدا | آمفوتریسین B: Fungicidal',
    primaryActionEn: 'Azoles: Fungistatic | Echinocandins: Fungicidal for Candida | Amphotericin B: Fungicidal',
    actionClassification: 'fungicidal',
    summaryFa:
      'درمان‌های سیستمیک ضد قارچ به سه دسته بزرگ فارماکولوژیک تقسیم می‌شوند: ۱) تریازول‌ها (فلوکونازول، وریکونازول، ایتراکونازول، پوساکونازول) که آنزیم CYP51 را مهار می‌کنند و تداخلات متابولیک وسیع کبدی دارند؛ ۲) اکینوکاندین‌ها (کاسپوفانجین) که مهارکننده سنتز دیواره سلولی گلوکان بوده و قارچ‌کش هستند؛ ۳) پلی‌ان‌ها (آمفوتریسین B) که غشای سلول را مستقیماً لیز می‌کنند.',
    summaryEn:
      'Systemic antifungal pharmacology targets fungal survival via triazoles (CYP51 inhibition, broad CYP interactions), echinocandins (1,3-beta-D-glucan synthase inhibitors for candidemia), and polyenes (direct membrane pore formation with nephrotoxicity risk).',
    keyClasses: [
      {
        nameFa: 'تریازول‌های نسل دوم و سوم (Triazoles)',
        nameEn: 'Systemic Triazoles',
        classCode: 'mech-azoles',
        actionType: 'Fungistatic / Broad Spectrum',
        mechanismFa: 'مهار اختصاصی سنتز ارگوسترول با مهار قوی CYP51A1 و تداخل شدید با آنزیم‌های CYP3A4/CYP2C9/CYP2C19.',
        mechanismEn: 'Potent inhibition of fungal CYP51A1 with extensive CYP3A4/2C9 interaction profile.',
        examples: 'Fluconazole, Voriconazole, Itraconazole, Posaconazole',
      },
      {
        nameFa: 'اکینوکاندین‌ها (Echinocandins)',
        nameEn: 'Echinocandins',
        classCode: 'mech-echinocandins',
        actionType: 'Fungicidal (Candida) / Fungistatic (Aspergillus)',
        mechanismFa: 'مهار غیررقابتی آنزیم بتا-(۱،۳)-دی-گلوکان سنتاز و تخریب یکپارچگی ساختاری دیواره سلولی قارچ.',
        mechanismEn: 'Non-competitive inhibition of 1,3-beta-D-glucan synthase disrupting cell wall integrity.',
        examples: 'Caspofungin, Micafungin, Anidulafungin',
      },
      {
        nameFa: 'پلی‌ان‌های سیستمیک (Systemic Polyenes)',
        nameEn: 'Polyene Antifungals',
        classCode: 'mech-polyenes',
        actionType: 'Fungicidal (کشنده وسیع‌الطیف)',
        mechanismFa: 'تشکیل پیوند مستقیم با ارگوسترول غشای قارچ، ایجاد کانال‌های خروج یون و لیز اسمزی.',
        mechanismEn: 'Binds fungal ergosterol directly, creating pores that leak ions and nutrients.',
        examples: 'Amphotericin B (Liposomal / Deoxycholate)',
      },
    ],
  },

  // SUB-1-1: Viral Skin Conditions & Topical Antivirals
  'sub-1-1': {
    subcategoryId: 'sub-1-1',
    categoryTitleFa: 'عفونت‌های ویروسی و ضدالتهاب‌های موضعی (Viral Skin & Topical Corticosteroids)',
    categoryTitleEn: 'Viral Skin Conditions & Topical Corticosteroids',
    targetPathwayFa: 'تیمیدین کیناز ویروسی و مهار DNA پلیمراز / گیرنده‌های گلوکوکورتیکوئیدی هسته‌ای',
    targetPathwayEn: 'Viral thymidine kinase & DNA polymerase termination / Nuclear glucocorticoid receptors',
    primaryActionFa: 'آسیکلوویر/فام‌سیکلوویر: مهارکننده همانندسازی ویروس (Virosuppressive) | استروئیدها: ضدالتهاب و مهار سایتوکاین',
    primaryActionEn: 'Acyclovir/Famciclovir: Virosuppressive chain terminators | Steroids: Anti-inflammatory & immunosuppressive',
    actionClassification: 'virosuppressive',
    summaryFa:
      'داروهای ضد ویروس تبخال (آسیکلوویر، فام‌سیکلوویر، وال‌آسیکلوویر) آنالوگ‌های گوانوزین هستند که اختصاصاً توسط آنزیم تیمیدین کیناز ویروس فسفوریله شده و به عنوان خاتمه‌دهنده زنجیره DNA پلیمراز ویروسی عمل می‌کنند (Virosuppressive). کورتیکواستروئیدهای موضعی (هیدروکورتیزون) با اتصال به گیرنده‌های سیتوزولی و هسته‌ای، تولید فسفولیپاز A2 و سایتوکاین‌های التهابی را مهار کرده و خارش و قرمزی را سرکوب می‌نمایند.',
    summaryEn:
      'Herpetic antivirals are nucleoside guanosine analogues selectively phosphorylated by viral thymidine kinase, competitively inhibiting viral DNA polymerase as obligatory chain terminators. Topical corticosteroids bind intracellular glucocorticoid receptors to suppress inflammatory gene transcription and cytokine release.',
    keyClasses: [
      {
        nameFa: 'آنالوگ‌های نوکلئوزیدی ضد ویروس (Nucleoside Analogues)',
        nameEn: 'Nucleoside Guanosine Analogues',
        classCode: 'mech-nucleoside-antiviral',
        actionType: 'Virosuppressive / Chain Terminator',
        mechanismFa: 'فسفوریلاسیون توسط تیمیدین کیناز ویروسی، مهار رقابتی DNA پلیمراز ویروسی و توقف همانندسازی ژنوم ویروس.',
        mechanismEn: 'Monophosphorylated by viral thymidine kinase, triphosphate competitively inhibits viral DNA polymerase.',
        examples: 'Acyclovir, Famciclovir, Valacyclovir',
      },
      {
        nameFa: 'کورتیکواستروئیدهای موضعی (Topical Corticosteroids)',
        nameEn: 'Topical Corticosteroids (Class I to IV)',
        classCode: 'mech-topical-steroid',
        actionType: 'Anti-inflammatory / Antipruritic',
        mechanismFa: 'اتصال به گیرنده‌های گلوکوکورتیکوئیدی، القای سنتز لیپوکورتین-۱ و مهار فسفولیپاز A2 و آبشار اسید آراشیدونیک.',
        mechanismEn: 'Binds glucocorticoid receptors, induces lipocortin-1 synthesis, inhibiting phospholipase A2 and arachidonic cascade.',
        examples: 'Hydrocortisone 0.5%/1%, Methylprednisolone, Clobetasol',
      },
    ],
  },

  // SUB-5-1: Penicillins & Beta-lactams
  'sub-5-1': {
    subcategoryId: 'sub-5-1',
    categoryTitleFa: 'پنی‌سیلین‌ها و بتالاکتام‌ها (Penicillins & Beta-lactam Antibiotics)',
    categoryTitleEn: 'Penicillins & Beta-lactam Antibiotics',
    targetPathwayFa: 'سنتز دیواره سلولی پپتیدوگلیکان باکتری از طریق اتصال به PBPs',
    targetPathwayEn: 'Bacterial peptidoglycan cell wall transpeptidation (PBPs)',
    primaryActionFa: 'باکتریوسید (Bactericidal - کشنده باکتری وابسته به زمان T > MIC)',
    primaryActionEn: 'Bactericidal (Time-dependent killing, %T > MIC)',
    actionClassification: 'bactericidal',
    summaryFa:
      'تمام آنتی‌بیوتیک‌های بتالاکتام (پنی‌سیلین‌ها، سفالوسپورین‌ها، کارباپنم‌ها) باکتریوسید هستند. این داروها به پروتئین‌های متصل‌شونده به پنی‌سیلین (PBPs) متصل شده و آنزیم ترنس‌پپتیداز را مهار می‌کنند؛ در نتیجه اتصال متقاطع رشته‌های پپتیدوگلیکان در دیواره باکتری متوقف شده و باکتری تحت فشار اسمزی اتولیز و متلاشی می‌گردد. مهارکننده‌های بتالاکتاماز (کلاوولانیک اسید) آنزیم‌های مقاومت باکتری را خنثی می‌کنند.',
    summaryEn:
      'Beta-lactam antibiotics are bactericidal agents that bind bacterial Penicillin-Binding Proteins (PBPs), inhibiting the transpeptidation cross-linking of peptidoglycan chains. This causes osmotic instability and cell lysis. Beta-lactamase inhibitors (Clavulanic acid) protect the beta-lactam ring from enzymatic hydrolytic degradation.',
    keyClasses: [
      {
        nameFa: 'آمینوپنی‌سیلین‌ها + مهارکننده بتالاکتاماز',
        nameEn: 'Aminopenicillins + Beta-lactamase Inhibitor',
        classCode: 'mech-betalactams',
        actionType: 'Bactericidal (کشنده دیواره باکتری)',
        mechanismFa: 'اتصال به PBP-1A/2/3 و مهار ساخت پپتیدوگلیکان + مهار غیرقابل برگشت بتالاکتاماز توسط کلاوولانات.',
        mechanismEn: 'Binds PBPs to halt peptidoglycan cross-linking plus irreversible beta-lactamase enzyme inactivation.',
        examples: 'Amoxicillin, Amoxicillin + Clavulanic Acid (Augmentin)',
      },
      {
        nameFa: 'پنی‌سیلین‌های ضد استافیلوکوک (Isoxazolyl Penicillins)',
        nameEn: 'Anti-staphylococcal Penicillins',
        classCode: 'mech-betalactams',
        actionType: 'Bactericidal (مقاوم به پنی‌سیلیناز)',
        mechanismFa: 'مقاومت ساختاری در برابر هیدرولیز توسط بتالاکتاماز استافیلوکوک و لیز دیواره سلولی MSSA.',
        mechanismEn: 'Sterically hinders staphylococcal penicillinase while inhibiting bacterial cell wall transpeptidase.',
        examples: 'Flucloxacillin, Dicloxacillin',
      },
      {
        nameFa: 'سفالوسپورین‌ها (Cephalosporins)',
        nameEn: 'Cephalosporins (1st to 4th Gen)',
        classCode: 'mech-cephalosporins',
        actionType: 'Bactericidal (کشنده دیواره)',
        mechanismFa: 'اتصال به PBPs اختصاصی دیواره باکتری و القای اتولیزین‌های درونی جهت تخریب پپتیدوگلیکان.',
        mechanismEn: 'Inhibits transpeptidation via PBP binding and activates bacterial autolytic enzymes.',
        examples: 'Cephalexin, Cefazolin, Ceftriaxone, Cefotaxime',
      },
    ],
  },

  // SUB-5-2: Macrolides & Quinolones
  'sub-5-2': {
    subcategoryId: 'sub-5-2',
    categoryTitleFa: 'ماکرولیدها و فلوروکینولون‌ها (Macrolides & Fluoroquinolones)',
    categoryTitleEn: 'Macrolides & Fluoroquinolones',
    targetPathwayFa: 'زیرواحد 50S ریبوزوم باکتری (ماکرولیدها) / آنزیم‌های DNA ژیراز و توپوایزومراز ۴ (کینولون‌ها)',
    targetPathwayEn: 'Bacterial 50S ribosomal subunit / DNA Gyrase (Topoisomerase II) & Topoisomerase IV',
    primaryActionFa: 'ماکرولیدها: باکتریواستاتیک (Bacteriostatic) | فلوروکینولون‌ها: باکتریوسید (Bactericidal)',
    primaryActionEn: 'Macrolides: Bacteriostatic | Fluoroquinolones: Bactericidal (Concentration-dependent)',
    actionClassification: 'bacteriostatic',
    summaryFa:
      'ماکرولیدها (آزیترومایسین، کلاریترومایسین، اریترومایسین) باکتریواستاتیک هستند و با اتصال برگشت‌پذیر به زیرواحد 50S ریبوزومی، مانع ترانس‌پپتیداسیون و سنتز پروتئین باکتری می‌شوند (پوشش عالی بر روی باکتری‌های آتیپیکال). در مقابل، فلوروکینولون‌ها (سیپروفلوکساسین، موکسی‌فلوکساسین) باکتریوسید مستقیم بوده و با مهار آنزیم‌های DNA ژیراز و توپوایزومراز ۴، باعث شکست دورشته‌ای DNA و مرگ سریع باکتری می‌گردند.',
    summaryEn:
      'Macrolides reversibly bind the 23S rRNA in the bacterial 50S ribosomal subunit, halting peptide elongation (bacteriostatic, atypical coverage). Fluoroquinolones target DNA Gyrase (Gram-negatives) and Topoisomerase IV (Gram-positives), causing lethal double-stranded DNA breaks (concentration-dependent bactericidal).',
    keyClasses: [
      {
        nameFa: 'ماکرولیدها (Macrolides)',
        nameEn: 'Macrolide Antibiotics',
        classCode: 'mech-macrolides',
        actionType: 'Bacteriostatic (مهار سنتز پروتئین 50S)',
        mechanismFa: 'اتصال به زیرواحد 50S ریبوزوم، مهار ترنسلوکاسیون پپتید و مهار سنتز پروتئین باکتری.',
        mechanismEn: 'Binds reversibly to 50S ribosomal subunit, preventing protein synthesis and chain elongation.',
        examples: 'Azithromycin, Clarithromycin, Erythromycin, Roxithromycin',
      },
      {
        nameFa: 'فلوروکینولون‌ها (Fluoroquinolones)',
        nameEn: 'Fluoroquinolones',
        classCode: 'mech-quinolones',
        actionType: 'Bactericidal (شکست DNA ژیروزوم)',
        mechanismFa: 'مهار DNA ژیراز (Topoisomerase II) و توپوایزومراز IV و جلوگیری از رپلیکاسیون DNA باکتری.',
        mechanismEn: 'Inhibits bacterial DNA gyrase and topoisomerase IV, preventing DNA supercoiling and replication.',
        examples: 'Ciprofloxacin, Moxifloxacin, Norfloxacin',
      },
    ],
  },

  // SUB-2-1: Antihypertensives (ACEi, ARB, CCBs & Diuretics)
  'sub-2-1': {
    subcategoryId: 'sub-2-1',
    categoryTitleFa: 'داروهای کاهنده فشار خون (Antihypertensive Classes: RAAS & CCBs)',
    categoryTitleEn: 'Antihypertensive Agents (RAAS Inhibitors & CCBs)',
    targetPathwayFa: 'محور رنین-آنژیوتانسین-آلدوسترون (RAAS) / کانال‌های کلسیمی وابسته به ولتاژ L-Type',
    targetPathwayEn: 'Renin-Angiotensin-Aldosterone System (RAAS) / L-type Voltage-gated Calcium channels',
    primaryActionFa: 'مهار سنتز آنژیوتانسین II / مهار گیرنده AT1 / مهار ورود کلسیم و اتساع شریانی',
    primaryActionEn: 'ACE inhibition / AT1 Receptor Blockade / Calcium Influx Inhibition & Vasodilation',
    actionClassification: 'enzyme_inhibitor',
    summaryFa:
      'داروهای خط اول فشار خون شامل: ۱) مهارکننده‌های ACE (پریندوپریل، رامیپریل) که مانع تبدیل آنژیوتانسین I به II شده و سطح برادی‌کینین را افزایش می‌دهند؛ ۲) بلوک‌کننده‌های گیرنده آنژیوتانسین ARB (کاندسارتان، تلمیسارتان) که اختصاصاً گیرنده AT1 را مهار می‌کنند؛ ۳) بلوک‌کننده‌های کانال کلسیم CCB (آملودیپین) که با مهار ورود کلسیم به عضله صاف عروق، مقاومت محیطی را کاهش می‌دهند.',
    summaryEn:
      'First-line antihypertensives comprise: ACE inhibitors (block Ang I to Ang II conversion and bradykinin breakdown), ARBs (selectively block AT1 receptors without cough), and Dihydropyridine CCBs (block vascular L-type calcium channels causing arterial vasodilation).',
    keyClasses: [
      {
        nameFa: 'مهارکننده‌های آنزیم مبدل آنژیوتانسین (ACE Inhibitors)',
        nameEn: 'ACE Inhibitors',
        classCode: 'mech-acei',
        actionType: 'Enzyme Inhibitor / Vasodilator',
        mechanismFa: 'مهار تبدیل Ang I به Ang II، کاهش ترشح آلدوسترون و مهار تجزیه برادی‌کینین (ایجاد سرفه خشک).',
        mechanismEn: 'Inhibits ACE converting enzyme, decreasing circulating Ang II and increasing bradykinin.',
        examples: 'Perindopril, Ramipril, Enalapril',
      },
      {
        nameFa: 'آنتاگونیست‌های گیرنده آنژیوتانسین II (ARBs)',
        nameEn: 'Angiotensin Receptor Blockers (ARBs)',
        classCode: 'mech-arbs',
        actionType: 'Receptor Antagonist / Vasodilator',
        mechanismFa: 'بلوک رقابتی و انتخابی گیرنده AT1 آنژیوتانسین II بدون تأثیر بر برادی‌کینین (بدون عارضه سرفه).',
        mechanismEn: 'Selectively blocks AT1 receptors, preventing vasoconstriction and aldosterone release without cough.',
        examples: 'Candesartan, Telmisartan, Irbesartan, Valsartan',
      },
      {
        nameFa: 'مسدودکننده‌های کانال کلسیم دی‌هیدروپیریدینی (DHP-CCBs)',
        nameEn: 'Dihydropyridine Calcium Channel Blockers',
        classCode: 'mech-ccbs',
        actionType: 'Ion Channel Blocker / Arterial Dilator',
        mechanismFa: 'مهار ورود کلسیم از طریق کانال‌های ولتاژی L-Type در عضلات صاف عروقی و اتساع شریان‌ها.',
        mechanismEn: 'Blocks L-type voltage-gated calcium channels in vascular smooth muscle, reducing systemic resistance.',
        examples: 'Amlodipine, Lercanidipine, Nifedipine',
      },
    ],
  },

  // SUB-2-2: Anticoagulants (DOACs, Warfarin, Heparins)
  'sub-2-2': {
    subcategoryId: 'sub-2-2',
    categoryTitleFa: 'داروهای ضد انعقاد خون (Anticoagulants: DOACs & Warfarin)',
    categoryTitleEn: 'Anticoagulants: Direct Oral (DOACs) & Warfarin',
    targetPathwayFa: 'فاکتور فعال Xa / فاکتور ترومبین IIa / آنزیم ویتامین K اپوکسید ردوکتاز (VKORC1)',
    targetPathwayEn: 'Factor Xa / Thrombin (Factor IIa) / Vitamin K Epoxide Reductase (VKORC1)',
    primaryActionFa: 'مهار مستقیم فاکتورهای انعقادی (DOACs) / مهار سنتز فاکتورهای وابسته به ویتامین K (وارفارین)',
    primaryActionEn: 'Direct Factor Xa/IIa Inhibition (DOACs) / Vitamin K-dependent clotting factor depletion',
    actionClassification: 'enzyme_inhibitor',
    summaryFa:
      'داروهای ضدانعقاد مانع تشکیل لخته فیبرینی می‌شوند: ۱) مهارکننده‌های مستقیم فاکتور Xa (ریواروکسابان، آپیکسابان) که مسیر مشترک انعقاد را در جایگاه فاکتور Xa مهار می‌کنند؛ ۲) مهارکننده مستقیم ترومبین (دابیگاتران) که تبدیل فیبرینوژن به فیبرین را متوقف می‌سازد؛ ۳) وارفارین که با مهار آنزیم VKORC1، سنتز کبدی فاکتورهای II, VII, IX, X و پروتئین‌های C و S را مختل می‌کند.',
    summaryEn:
      'Anticoagulants prevent thrombus formation via direct Factor Xa inhibition (Rivaroxaban, Apixaban), direct Thrombin IIa inhibition (Dabigatran), or VKORC1 inhibition (Warfarin, preventing gamma-carboxylation of factors II, VII, IX, X and proteins C/S).',
    keyClasses: [
      {
        nameFa: 'مهارکننده‌های مستقیم فاکتور Xa (Direct Factor Xa Inhibitors)',
        nameEn: 'Direct Factor Xa Inhibitors (DOACs)',
        classCode: 'mech-factor-xa',
        actionType: 'Direct Factor Inhibitor',
        mechanismFa: 'مهار مستقیم و انتخابی فاکتور Xa فعال هم به صورت آزاد و هم در لخته متصل به پروترومبیناز.',
        mechanismEn: 'Directly and reversibly inhibits free and clot-bound Factor Xa, preventing thrombin generation.',
        examples: 'Rivaroxaban, Apixaban',
      },
      {
        nameFa: 'مهارکننده‌های مستقیم ترومبین (Direct Thrombin Inhibitors)',
        nameEn: 'Direct Thrombin (Factor IIa) Inhibitor',
        classCode: 'mech-thrombin-inhibitor',
        actionType: 'Direct Factor Inhibitor',
        mechanismFa: 'اتصال مستقیم به جایگاه فعال ترومبین آزاد و متصل به فیبرین و مهار تبدیل فیبرینوژن به فیبرین.',
        mechanismEn: 'Competitively and reversibly binds the active catalytic site of free and clot-bound thrombin.',
        examples: 'Dabigatran',
      },
      {
        nameFa: 'آنتاگونیست‌های ویتامین K (Vitamin K Antagonists)',
        nameEn: 'Vitamin K Antagonists (Coumarins)',
        classCode: 'mech-vka',
        actionType: 'Synthesis Inhibitor (NTI Drug)',
        mechanismFa: 'مهار آنزیم VKORC1 و مهار چرخه بازیافت ویتامین K، کاهش فاکتورهای II, VII, IX, X و مانیتورینگ INR.',
        mechanismEn: 'Inhibits VKORC1, depleting active Vitamin K required for gamma-carboxylation of factors II, VII, IX, X.',
        examples: 'Warfarin (Coumadin / Marevan)',
      },
    ],
  },

  // SUB-2-4: Lipid-Lowering Agents & Statins
  'sub-2-4': {
    subcategoryId: 'sub-2-4',
    categoryTitleFa: 'داروهای کاهنده چربی و استاتین‌ها (Lipid-Lowering Therapy & Statins)',
    categoryTitleEn: 'Lipid-Lowering Therapy & Statins',
    targetPathwayFa: 'آنزیم HMG-CoA ردوکتاز کبد / ناقل NPC1L1 جذب کلسترول روده / آنزیم PCSK9',
    targetPathwayEn: 'Hepatic HMG-CoA Reductase / Intestinal NPC1L1 sterol transporter / PCSK9',
    primaryActionFa: 'مهار رقابتی سنتز درون‌سلولی کلسترول و افزایش بیان گیرنده‌های LDL کبدی',
    primaryActionEn: 'Competitive inhibition of de novo cholesterol biosynthesis & upregulation of LDL clearance receptors',
    actionClassification: 'enzyme_inhibitor',
    summaryFa:
      'استاتین‌ها (آتورواستاتین، رزوواستاتین) با مهار رقابتی آنزیم محدودکننده سرعت سنتز کلسترول (HMG-CoA Reductase) در هپاتوسیت‌ها، سطح کلسترول درون‌سلولی را کاهش می‌دهند؛ در پاسخ، کبد گیرنده‌های LDL را افزایش داده و کلسترول بد (LDL-C) را به شدت از گردش خون پاکسازی می‌کند. ازتیمایب نیز با مهار ناقل NPC1L1، جذب کلسترول از پرزهای روده را متوقف می‌سازد.',
    summaryEn:
      'Statins competitively inhibit HMG-CoA reductase, the rate-limiting enzyme in hepatic cholesterol biosynthesis, upregulating hepatic LDL receptors for systemic LDL-C clearance. Ezetimibe selectively inhibits the Niemann-Pick C1-Like 1 (NPC1L1) transporter in enterocytes.',
    keyClasses: [
      {
        nameFa: 'استاتین‌ها / مهارکننده‌های HMG-CoA ردوکتاز',
        nameEn: 'HMG-CoA Reductase Inhibitors (Statins)',
        classCode: 'mech-statins',
        actionType: 'Competitive Enzyme Inhibitor',
        mechanismFa: 'مهار HMG-CoA ردوکتاز، افزایش بیان گیرنده‌های LDL کبد و کاهش چشمگیر LDL و تری‌گلیسرید.',
        mechanismEn: 'Competitively inhibits HMG-CoA reductase, upregulating hepatic LDL receptors to clear circulating LDL.',
        examples: 'Atorvastatin, Rosuvastatin, Simvastatin, Pravastatin',
      },
      {
        nameFa: 'مهارکننده‌های جذب کلسترول روده',
        nameEn: 'Cholesterol Absorption Inhibitors',
        classCode: 'mech-ezetimibe',
        actionType: 'Transporter Inhibitor',
        mechanismFa: 'اتصال به ناقل NPC1L1 در مخاط روده و مهار انتخابی جذب کلسترول غذایی و صفراوی.',
        mechanismEn: 'Selectively inhibits NPC1L1 transporter on brush border of enterocytes, blocking sterol absorption.',
        examples: 'Ezetimibe',
      },
    ],
  },

  // SUB-1-5: Gastrointestinal & Heartburn PPIs
  'sub-1-5': {
    subcategoryId: 'sub-1-5',
    categoryTitleFa: 'داروهای گوارشی، ضد اسید و PPIها (Gastrointestinal & PPIs)',
    categoryTitleEn: 'Gastrointestinal & Acid Suppressive Agents',
    targetPathwayFa: 'پمپ پروتون H+/K+ ATPase سلول‌های پاریتال معده / خنثی‌سازی اسید لومن',
    targetPathwayEn: 'Gastric parietal cell H+/K+ ATPase proton pump / Chemical luminal neutralization',
    primaryActionFa: 'مهار غیرقابل برگشت پمپ پروتون / خنثی‌سازی شیمیایی اسید و سد مکانیکی آلژینات',
    primaryActionEn: 'Irreversible covalent H+/K+ ATPase proton pump inhibition / Chemical acid buffering & alginate raft',
    actionClassification: 'enzyme_inhibitor',
    summaryFa:
      'مهارکننده‌های پمپ پروتون (اس‌امپرازول، پانتوپرازول، امپرازول) پیش‌داروهایی هستند که در کانالیکول اسیدی سلول پاریتال فعال شده و با تشکیل پیوند دی‌سولفیدی پایدار با پمپ H+/K+ ATPase، مرحله نهایی ترشح اسید معده را به طور کامل مسدود می‌کنند (مهار ۲۴ ساعته تا سنتز پمپ جدید). آنتی‌اسیدها (هیدروکسید منیزیم/آلومینیوم) مستقیماً اسید آزاد لومن را خنثی می‌کنند و آلژینات سد ژلی شناور ضد ریفلاکس ایجاد می‌کند.',
    summaryEn:
      'Proton Pump Inhibitors (Esomeprazole, Pantoprazole, Omeprazole) are prodrugs that accumulate in the acidic secretory canaliculi of parietal cells, forming covalent disulfide bonds with H+/K+ ATPase to shut down final acid secretion. Antacids chemically neutralize gastric HCl while alginates form a mechanical raft.',
    keyClasses: [
      {
        nameFa: 'مهارکننده‌های پمپ پروتون (PPIs)',
        nameEn: 'Proton Pump Inhibitors (PPIs)',
        classCode: 'mech-ppis',
        actionType: 'Irreversible Enzyme Inhibitor',
        mechanismFa: 'تشکیل پیوند دی‌سولفیدی کووالانسی با آنزیم H+/K+ ATPase و مهار نهایی ترشح اسید هیدروکلریک.',
        mechanismEn: 'Covalently binds and irreversibly inhibits active H+/K+ ATPase pump at the secretory surface of parietal cells.',
        examples: 'Esomeprazole, Pantoprazole, Omeprazole, Rabeprazole',
      },
      {
        nameFa: 'آنتی‌اسیدها و سدهای آلژینات (Antacids & Alginates)',
        nameEn: 'Antacids & Alginate Raft Formers',
        classCode: 'mech-antacids',
        actionType: 'Chemical Neutralizer & Physical Barrier',
        mechanismFa: 'خنثی‌سازی اسید معده با نمک‌های قلیایی و ایجاد سد کف‌آلود آلژینات روی محتویات معده.',
        mechanismEn: 'Chemically neutralizes luminal hydrochloric acid and forms a viscous protective floating gel raft.',
        examples: 'Mylanta, Gaviscon, Calcium Carbonate',
      },
    ],
  },

  // SUB-1-4: Respiratory, Inhalers & Decongestants
  'sub-1-4': {
    subcategoryId: 'sub-1-4',
    categoryTitleFa: 'داروهای تنفسی، اسپری‌ها و ضداحتقان‌ها (Respiratory, Inhalers & Decongestants)',
    categoryTitleEn: 'Respiratory Inhalers & Sympathomimetic Decongestants',
    targetPathwayFa: 'گیرنده‌های بتا-۲ آدرنرژیک برونش / گیرنده‌های گلوکوکورتیکوئیدی / گیرنده‌های آلفا-۱ عروق مخاطی',
    targetPathwayEn: 'Bronchial Beta-2 adrenergic receptors / Nuclear Glucocorticoid Receptors / Vascular Alpha-1 adrenoceptors',
    primaryActionFa: 'اتساع سریع برونش با cAMP (SABA) / مهار رونویسی ژن‌های التهابی (ICS) / انقباض عروق بینی (آلفا-۱)',
    primaryActionEn: 'Beta-2 Gs-cAMP smooth muscle relaxation (SABA) / Anti-inflammatory gene regulation (ICS) / Mucosal vasoconstriction',
    actionClassification: 'receptor_agonist',
    summaryFa:
      'درمان‌های تنفسی بر دو اصل متکی هستند: ۱) برونکودیلاتورهای بتا-۲ آگونیست (سالبوتامول) که با تحریک گیرنده بتا-۲ و افزایش cAMP درون‌سلولی، ظرف ۵ دقیقه عضلات صاف مجاری تنفسی را شل می‌کنند؛ ۲) کورتیکواستروئیدهای استنشاقی (فلوتیکازون، بودزوناید) که با مهار NF-kB و سرکوب ائوزینوفیل‌ها التهاب زمینه‌ای آسم را مهار می‌کنند؛ ۳) ضداحتقان‌های سمپاتومیمتیک (سودوافدرین) که با تحریک آلفا-۱ عروق مخاط بینی را منقبض می‌سازند.',
    summaryEn:
      'Respiratory management pairs fast-acting Beta-2 agonists (Salbutamol, increasing intracellular cAMP for rapid bronchodilation) with Inhaled Corticosteroids (Fluticasone, suppressing eosinophilic airway inflammation via nuclear receptors). Systemic decongestants (Pseudoephedrine) activate vascular alpha-1 receptors to shrink nasal mucosal engorgement.',
    keyClasses: [
      {
        nameFa: 'آگونیست‌های گیرنده بتا-۲ کوتاه‌اثر (SABA)',
        nameEn: 'Short-Acting Beta-2 Agonists (SABA)',
        classCode: 'mech-saba',
        actionType: 'Receptor Agonist / Bronchodilator',
        mechanismFa: 'تحریک گیرنده‌های بتا-۲، فعال‌سازی آدنیلات سیکلاز، افزایش cAMP و شل شدن عضلات صاف برونش.',
        mechanismEn: 'Selectively stimulates beta-2 receptors, raising cAMP to relax airway smooth muscle within minutes.',
        examples: 'Salbutamol (Ventolin, Asmol)',
      },
      {
        nameFa: 'کورتیکواستروئیدهای استنشاقی (ICS)',
        nameEn: 'Inhaled Corticosteroids (ICS)',
        classCode: 'mech-ics',
        actionType: 'Nuclear Receptor Modulator / Anti-inflammatory',
        mechanismFa: 'مهار سایتوکاین‌های Th2، کاهش ائوزینوفیل‌های مجاری هوایی و کاهش بیش‌فعالی برونش.',
        mechanismEn: 'Suppresses inflammatory gene transcription (NF-kB), reducing airway hyperresponsiveness and mucosal swelling.',
        examples: 'Fluticasone, Budesonide, Beclomethasone',
      },
      {
        nameFa: 'ضداحتقان‌های آدرنرژیک (Sympathomimetic Decongestants)',
        nameEn: 'Alpha-1 Adrenergic Decongestants',
        classCode: 'mech-decongestants',
        actionType: 'Vasoconstrictor / S3 Restricted',
        mechanismFa: 'تحریک گیرنده‌های آلفا-۱ در شریانچه‌های مخاط بینی و کاهش ادم و احتقان مجاری تنفسی.',
        mechanismEn: 'Direct and indirect stimulation of alpha-1 adrenoceptors causing mucosal vasoconstriction.',
        examples: 'Pseudoephedrine (Sudafed), Phenylephrine',
      },
    ],
  },

  // SUB-3-1: SSRIs & Antidepressants
  'sub-3-1': {
    subcategoryId: 'sub-3-1',
    categoryTitleFa: 'داروهای ضد افسردگی و مهارکننده بازجذب سروتونین (SSRIs & Antidepressants)',
    categoryTitleEn: 'SSRIs & Psychotropic Antidepressants',
    targetPathwayFa: 'ناقل بازجذب سروتونین (SERT / SLC6A4) در پایانه پیش‌سیناپسی نورون‌های مغز',
    targetPathwayEn: 'Presynaptic Serotonin Transporter (SERT / SLC6A4)',
    primaryActionFa: 'مهار انتخابی بازجذب سروتونین و افزایش غلظت آن در شکاف سیناپسی',
    primaryActionEn: 'Selective inhibition of serotonin reuptake, enhancing synaptic 5-HT signaling',
    actionClassification: 'transporter_inhibitor',
    summaryFa:
      'مهارکننده‌های انتخابی بازجذب سروتونین (فلوکستین، سرترالین، اس‌سیتالوپرام) با اتصال اختصاصی به ناقل بازجذب سروتونین (SERT)، مانع ورود مجدد سروتونین به پایانه پیش‌سیناپسی می‌شوند. این عمل باعث ماندگاری و افزایش غلظت سروتونین در شکاف سیناپسی شده و در طی چند هفته، حساسیت‌زدایی گیرنده‌های خودکار 5-HT1A و بهبود خلق و تسکین اضطراب را به همراه دارد.',
    summaryEn:
      'SSRIs selectively inhibit the presynaptic serotonin reuptake transporter (SERT), prolonging 5-HT dwell time in the synaptic cleft. Over 2-4 weeks, this induces 5-HT1A autoreceptor desensitization and neurotrophic signaling for antidepressant and anxiolytic efficacy.',
    keyClasses: [
      {
        nameFa: 'مهارکننده‌های انتخابی بازجذب سروتونین (SSRIs)',
        nameEn: 'Selective Serotonin Reuptake Inhibitors (SSRIs)',
        classCode: 'mech-ssri',
        actionType: 'Transporter Inhibitor',
        mechanismFa: 'مهار اختصاصی ناقل SERT، افزایش سروتونین در سیناپس و تعدیل مسیرهای عصبی خلقی و اضطرابی.',
        mechanismEn: 'Selectively inhibits SERT, preventing serotonin reuptake and boosting synaptic neurotransmission.',
        examples: 'Sertraline, Fluoxetine, Escitalopram, Citalopram',
      },
    ],
  },

  // SUB-4-1: Diabetes & Glycaemic Control
  'sub-4-1': {
    subcategoryId: 'sub-4-1',
    categoryTitleFa: 'داروهای ضد دیابت و کنترل گلایسمیک (Antidiabetic Agents & SGLT2i)',
    categoryTitleEn: 'Antidiabetic Therapy & Glycaemic Control',
    targetPathwayFa: 'ناقل SGLT2 توبول پروگزیمال کلیه / کیناز فعال‌شده با AMP کبد (AMPK) / گیرنده‌های GLP-1',
    targetPathwayEn: 'Renal proximal tubule SGLT2 co-transporter / Hepatic AMPK activation / GLP-1 receptor',
    primaryActionFa: 'مهار بازجذب کلیوی گلوکز و گلوکوزوری / کاهش گلوکونئوژنز کبد و افزایش حساسیت به انسولین',
    primaryActionEn: 'Inhibition of renal glucose reabsorption & hepatic gluconeogenesis suppression',
    actionClassification: 'transporter_inhibitor',
    summaryFa:
      'درمان مدرن دیابت نوع ۲ شامل مکانیسم‌های هدفمند است: ۱) مهارکننده‌های SGLT2 (امپاگلیفلوزین، داپاگلیفلوزین) که بازجذب گلوکز در کلیه را مهار کرده و گلوکز اضافی را بدون وابسته بودن به ترشح انسولین در ادرار دفع می‌کنند (با مزایای قلبی-عروقی و کلیوی)؛ ۲) بی‌گوانیدها (متفورمین) که با فعال‌سازی AMPK در کبد تولید گلوکز (گلوکونئوژنز) را مهار کرده و حساسیت عضلات به انسولین را افزایش می‌دهند.',
    summaryEn:
      'SGLT2 inhibitors (Empagliflozin, Dapagliflozin) block the sodium-glucose cotransporter 2 in the renal proximal tubule, causing insulin-independent glucosuria and cardiorenal protection. Metformin activates hepatic AMPK to suppress gluconeogenesis and enhance peripheral insulin sensitivity.',
    keyClasses: [
      {
        nameFa: 'مهارکننده‌های SGLT2 کلیوی (SGLT2 Inhibitors)',
        nameEn: 'Sodium-Glucose Cotransporter 2 (SGLT2) Inhibitors',
        classCode: 'mech-sglt2',
        actionType: 'Renal Transporter Inhibitor / Cardiorenal',
        mechanismFa: 'مهار بازجذب گلوکز در کلیه، افزایش دفع ادراری قند، کاهش فشار خون و محافظت از نارسایی قلبی و کلیوی.',
        mechanismEn: 'Blocks SGLT2 in renal proximal convoluted tubules, promoting glucosuria independently of beta-cell function.',
        examples: 'Empagliflozin (Jardiance), Dapagliflozin (Forxiga)',
      },
      {
        nameFa: 'بی‌گوانیدها (Biguanides)',
        nameEn: 'Biguanides',
        classCode: 'mech-metformin',
        actionType: 'Hepatic AMPK Activator / Insulin Sensitizer',
        mechanismFa: 'فعال‌سازی AMPK، مهار گلوکونئوژنز کبد، کاهش جذب روده‌ای گلوکز و افزایش برداشت عضلانی قند.',
        mechanismEn: 'Activates hepatic AMPK to decrease hepatic gluconeogenesis and increase peripheral glucose uptake.',
        examples: 'Metformin (Diabex, Diaformin)',
      },
    ],
  },

  // SUB-3-4: Opioid Analgesics & S8 Rules
  'sub-3-4': {
    subcategoryId: 'sub-3-4',
    categoryTitleFa: 'ضد دردهای اپیوئیدی و داروهای تحت کنترل S8 (Opioid Analgesics & Antagonists)',
    categoryTitleEn: 'Opioid Analgesics & Receptor Antagonists',
    targetPathwayFa: 'گیرنده‌های مو-اپیوئیدی (MOR) سیستم اعصاب مرکزی و شاخ خلفی نخاع',
    targetPathwayEn: 'Mu-Opioid Receptors (MOR) in CNS & Dorsal Horn of Spinal Cord',
    primaryActionFa: 'آگونیست کامل گیرنده مو (تسکین درد مرکزی) / آنتاگونیست رقابتی گیرنده مو (نالوکسان - برگشت دپرسیون تنفسی)',
    primaryActionEn: 'Full MOR agonist analgesia / Competitive MOR antagonism (Naloxone reversal of respiratory depression)',
    actionClassification: 'receptor_agonist',
    summaryFa:
      'اپیوئیدها (مورفین، اکسی‌کدون، فنتانیل) آگونیست‌های پرقدرت گیرنده مو (MOR) هستند که با اتصال به پروتئین Gi، آدنیلات سیکلاز را مهار، کانال‌های کلسیمی ولتاژی را بسته و کانال‌های پتاسیمی را باز می‌کنند؛ این امر هدایت پیام درد در نخاع و درک درد در قشر مغز را به شدت سرکوب می‌نماید. آنتاگونیست اپیوئیدی (نالوکسان) با تمایل اتصالی بالا گیرنده را اشغال کرده و دپرسیون تنفسی کشنده را خنثی می‌کند.',
    summaryEn:
      'Opioid agonists (Morphine, Oxycodone, Fentanyl) activate Gi protein-coupled Mu-Opioid Receptors (MOR), inhibiting adenylyl cyclase, closing presynaptic Ca2+ channels, and opening postsynaptic K+ channels to block nociceptive transmission. Naloxone is a pure competitive MOR antagonist that rapidly reverses life-threatening respiratory depression.',
    keyClasses: [
      {
        nameFa: 'آگونیست‌های گیرنده مو-اپیوئید (Mu-Opioid Agonists)',
        nameEn: 'Full Mu-Opioid Receptor Agonists (S8)',
        classCode: 'mech-opioids',
        actionType: 'Receptor Agonist / S8 Controlled Analgesic',
        mechanismFa: 'تحریک گیرنده‌های MOR، هایپرپلاریزاسیون نورونی و مهار آزادسازی سابستنس P و گلوتامات در نخاع.',
        mechanismEn: 'Stimulates MOR receptors, closing presynaptic N-type calcium channels and opening inward-rectifying K+ channels.',
        examples: 'Oxycodone (Endone, OxyContin), Morphine, Fentanyl',
      },
      {
        nameFa: 'آنتاگونیست‌های رقابتی اپیوئید / پادزهر (Opioid Antagonists)',
        nameEn: 'Pure Opioid Receptor Antagonists',
        classCode: 'mech-naloxone',
        actionType: 'Antidote / Emergency Reversal',
        mechanismFa: 'اتصال رقابتی با تمایل بالا به گیرنده‌های مو، کاپا و دلتا و خنثی‌سازی فوری مسمومیت و تنگی نفس اپیوئیدی.',
        mechanismEn: 'High-affinity competitive antagonist at mu, kappa, and delta receptors, immediately reversing opioid toxicity.',
        examples: 'Naloxone (Nyxoid Nasal Spray, Narcan)',
      },
    ],
  },

  // SUB-1-3: Ophthalmic & Otology
  'sub-1-3': {
    subcategoryId: 'sub-1-3',
    categoryTitleFa: 'قطره‌های چشمی، گلوکوم و گوش (Ophthalmic & Otology Protocols)',
    categoryTitleEn: 'Ophthalmic, Glaucoma & Otology Protocols',
    targetPathwayFa: 'گیرنده‌های پروستاگلاندین FP عضله مژگانی / گیرنده‌های بتا آدرنرژیک / پپتیدیل ترانسفراز باکتری',
    targetPathwayEn: 'Prostanoid FP receptors / Ciliary beta adrenoceptors / Bacterial 50S peptidyl transferase',
    primaryActionFa: 'افزایش خروج مایع زلالیه (پروستاگلاندین‌ها) / کاهش ترشح زلالیه (تیمولول) / آنتی‌بیوتیک موضعی چشم',
    primaryActionEn: 'Uveoscleral outflow increase (PGAs) / Aqueous humor inflow reduction (Beta blockers) / Topical ocular antibiotic',
    actionClassification: 'receptor_agonist',
    summaryFa:
      'داروهای گلوکوم فشار داخل چشم (IOP) را کنترل می‌کنند: آنالوگ‌های پروستاگلاندین (لاتانوپروست) با تحریک گیرنده‌های FP خروج زلالیه از مسیر یووواسکلرال را افزایش می‌دهند؛ بتابلوکرهای چشمی (تیمولول) با مهار گیرنده‌های بتای جسم مژگانی ترشح مایع زلالیه را کم می‌کنند. در ورم ملتحمه باکتریایی، کلرامفنیکل با مهار زیرواحد 50S باکتریایی، عفونت چشمی را درمان می‌نماید.',
    summaryEn:
      'Glaucoma therapy reduces Intraocular Pressure (IOP): Prostaglandin analogues (Latanoprost) increase uveoscleral outflow via FP receptor activation; topical beta-blockers (Timolol) suppress ciliary aqueous humor secretion. Chloramphenicol 0.5% eye drops inhibit bacterial 50S peptidyl transferase to resolve acute conjunctivitis.',
    keyClasses: [
      {
        nameFa: 'آنالوگ‌های پروستاگلاندین چشمی (Prostaglandin Analogues)',
        nameEn: 'Ophthalmic Prostaglandin F2α Analogues',
        classCode: 'mech-pgas',
        actionType: 'Receptor Agonist / Outflow Enhancer',
        mechanismFa: 'تحریک گیرنده FP، بازآرایی ماتریکس عضله مژگانی و تسهیل خروج یووواسکلرال مایع زلالیه.',
        mechanismEn: 'Selective FP prostanoid receptor agonist that increases uveoscleral outflow to lower intraocular pressure.',
        examples: 'Latanoprost (Xalatan), Bimatoprost, Travoprost',
      },
      {
        nameFa: 'آنتی‌بیوتیک‌های موضعی چشم (Ophthalmic Antibiotics)',
        nameEn: 'Ophthalmic Chloramphenicol',
        classCode: 'mech-chloramphenicol',
        actionType: 'Bacteriostatic (S3 Pharmacist Only)',
        mechanismFa: 'اتصال به زیرواحد 50S ریبوزوم باکتری ملتحمه و مهار سنتز پروتئین باکتریایی.',
        mechanismEn: 'Binds 50S ribosomal subunit inhibiting peptidyl transferase in susceptible ocular pathogens.',
        examples: 'Chloramphenicol (Chlorsig 0.5%)',
      },
    ],
  },
};

export const DRUG_MECHANISMS_REGISTRY: Record<string, DrugMechanismInfo> = {
  'mech-azoles': {
    classCode: 'mech-azoles',
    classNameFa: 'مشتقات آزول (مهار سنتز ارگوسترول)',
    classNameEn: 'Azoles (Ergosterol Synthesis Inhibitor)',
    actionClassification: 'fungistatic',
    actionTypeLabelFa: 'قارچ‌ایستا (Fungistatic)',
    actionTypeLabelEn: 'Fungistatic',
    targetSiteFa: 'آنزیم 14α-دمتیلاز سیتوکروم قارچی (CYP51)',
    targetSiteEn: 'Fungal CYP51 (14α-demethylase)',
    cellularEffectFa: 'کاهش ارگوسترول، آسیب به غشای سلولی و توقف رشد قارچ.',
    cellularEffectEn: 'Ergosterol depletion, disrupting fungal membrane and halting growth.',
    descriptionFa:
      'مهار آنزیم CYP51 قارچی و جلوگیری از تبدیل لانوسترول به ارگوسترول در غشا، که رشد قارچ را متوقف می‌سازد.',
    descriptionEn:
      'Inhibits fungal CYP51, blocking ergosterol synthesis in the cell membrane and arresting fungal growth.',
    clinicalRelevanceFa: 'خط اول کاندیدیازیس واژینال و برفک. در بارداری ممنوع است و با وارفارین تداخل دارد.',
    clinicalRelevanceEn: 'First-line for candidiasis. Contraindicated in pregnancy; interacts with warfarin.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-allylamines': {
    classCode: 'mech-allylamines',
    classNameFa: 'آلیل‌آمین‌ها (مهار اسکوالن اپوکسیداز)',
    classNameEn: 'Allylamines (Squalene Epoxidase Inhibitor)',
    actionClassification: 'fungicidal',
    actionTypeLabelFa: 'قارچ‌کش (Fungicidal)',
    actionTypeLabelEn: 'Fungicidal',
    targetSiteFa: 'آنزیم اسکوالن اپوکسیداز قارچی',
    targetSiteEn: 'Fungal Squalene Epoxidase',
    cellularEffectFa: 'تجمع اسکوالن سمی و لیز سریع دیواره سلولی قارچ.',
    cellularEffectEn: 'Toxic squalene accumulation and rapid fungal membrane lysis.',
    descriptionFa:
      'مهار زودرس آنزیم اسکوالن اپوکسیداز، تجمع سمی اسکوالن و مرگ سریع قارچ (دوره درمان کوتاه).',
    descriptionEn:
      'Inhibits squalene epoxidase, accumulating toxic squalene and killing the fungus rapidly.',
    clinicalRelevanceFa: 'داروی انتخابی عفونت‌های تینئا و پای ورزشکاران (Tinea Pedis). دوره مصرف موضعی ۷ روز.',
    clinicalRelevanceEn: 'Treatment of choice for tinea pedis and dermatophytes in a short 7-day course.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-polyenes': {
    classCode: 'mech-polyenes',
    classNameFa: 'پلی‌ان‌ها (ایجاد منفذ در غشای ارگوسترول)',
    classNameEn: 'Polyenes (Ergosterol Membrane Disruptor)',
    actionClassification: 'fungicidal',
    actionTypeLabelFa: 'تخریب غشا (Membrane Disruptor)',
    actionTypeLabelEn: 'Membrane Disruptor',
    targetSiteFa: 'ارگوسترول موجود در غشای قارچ',
    targetSiteEn: 'Fungal membrane ergosterol',
    cellularEffectFa: 'ایجاد منافذ غشایی، خروج پتاسیم و متلاشی شدن سلول قارچ.',
    cellularEffectEn: 'Forms membrane pores, leaking potassium and lysing the fungal cell.',
    descriptionFa:
      'اتصال مستقیم به ارگوسترول غشا و ایجاد حفراتی که باعث نشت املاح و مرگ سلول قارچ می‌شود.',
    descriptionEn:
      'Binds directly to fungal ergosterol, forming pores that leak cellular contents and kill the fungus.',
    clinicalRelevanceFa: 'نیستاتین جذب سیستمیک ندارد و داروی ایمن برفک دهان نوزادان و کودکان است.',
    clinicalRelevanceEn: 'Nystatin has no systemic absorption, making it safe for oral infant thrush.',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },

  'mech-benzimidazoles': {
    classCode: 'mech-benzimidazoles',
    classNameFa: 'بنزایمیدازول‌ها (مهار میکروتوبول کرمک)',
    classNameEn: 'Benzimidazoles (Tubulin Inhibitor)',
    actionClassification: 'helminthicidal',
    actionTypeLabelFa: 'کشنده انگل (Vermicidal)',
    actionTypeLabelEn: 'Vermicidal',
    targetSiteFa: 'بتا-توبولین در سلول‌های روده انگل',
    targetSiteEn: 'Nematode beta-tubulin subunits',
    cellularEffectFa: 'مهار جذب گلوکز، تخلیه ذخایر انرژی و دفع انگل از روده.',
    cellularEffectEn: 'Disrupts microtubules and blocks glucose uptake, starving the worm.',
    descriptionFa:
      'اتصال به بتا-توبولین انگل، قطع جذب قند و گرسنگی و فلج انگل تا دفع کامل از مدفوع.',
    descriptionEn:
      'Binds nematode beta-tubulin to block glucose uptake, starving and expelling the pinworm.',
    clinicalRelevanceFa: 'داروی خط اول کرمک (Vermox). دوز دوم بعد از ۱۴ روز و درمان همزمان کل خانواده الزامی است.',
    clinicalRelevanceEn: 'Drug of choice for pinworm. Repeat dose in 14 days and treat entire household.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-nucleoside-antiviral': {
    classCode: 'mech-nucleoside-antiviral',
    classNameFa: 'آنالوگ‌های گوانوزین (مهار DNA پلیمراز ویروس)',
    classNameEn: 'Nucleoside Analogues (Viral DNA Inhibitor)',
    actionClassification: 'virosuppressive',
    actionTypeLabelFa: 'مهار تکثیر ویروس (Virosuppressive)',
    actionTypeLabelEn: 'Virosuppressive',
    targetSiteFa: 'تیمیدین کیناز و DNA پلیمراز ویروس هرپس',
    targetSiteEn: 'Viral Thymidine Kinase & DNA Polymerase',
    cellularEffectFa: 'خاتمه ساخت زنجیره DNA ویروسی و توقف تکثیر.',
    cellularEffectEn: 'Obligate viral DNA chain termination.',
    descriptionFa:
      'فسفوریلاسیون توسط تیمیدین کیناز ویروس و مهار رقابتی DNA پلیمراز ویروسی که تکثیر ویروس را متوقف می‌کند.',
    descriptionEn:
      'Phosphorylated by viral thymidine kinase to inhibit viral DNA polymerase and terminate replication.',
    clinicalRelevanceFa: 'خط اول تبخال لب (HSV-1) و زونا. مصرف در اولین علائم خارش/سوزش بیشترین اثر را دارد.',
    clinicalRelevanceEn: 'First-line for HSV-1 cold sores and zoster. Most effective at prodromal tingling onset.',
    colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },

  'mech-topical-steroid': {
    classCode: 'mech-topical-steroid',
    classNameFa: 'کورتیکواستروئید موضعی (ضدالتهاب و خارش)',
    classNameEn: 'Topical Corticosteroids (Anti-inflammatory)',
    actionClassification: 'anti_inflammatory',
    actionTypeLabelFa: 'ضدالتهاب (Anti-inflammatory)',
    actionTypeLabelEn: 'Anti-inflammatory',
    targetSiteFa: 'گیرنده‌های گلوکوکورتیکوئیدی داخل سلولی',
    targetSiteEn: 'Intracellular Glucocorticoid Receptors',
    cellularEffectFa: 'مهار فسفولیپاز A2 و کاهش سایتوکاین‌های التهابی و قرمزی.',
    cellularEffectEn: 'Inhibits phospholipase A2 and inflammatory cytokines.',
    descriptionFa:
      'القا لیپوکورتین-۱، مهار اسید آراشیدونیک و انقباض عروق موضعی برای رفع سریع خارش و التهاب پوست.',
    descriptionEn:
      'Induces lipocortin-1 to inhibit the arachidonic cascade, reducing swelling and itching.',
    clinicalRelevanceFa: 'تسکین اگزما، درماتیت و نیش حشرات. روی عفونت قارچی درمان‌نشده منع مصرف دارد.',
    clinicalRelevanceEn: 'Relief of eczema and dermatitis. Contraindicated on untreated fungal infections.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-betalactams': {
    classCode: 'mech-betalactams',
    classNameFa: 'بتالاکتام‌ها (مهار دیواره پپتیدوگلیکان باکتری)',
    classNameEn: 'Beta-lactams (Cell Wall Inhibitor)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'باکتریوسید (Bactericidal)',
    actionTypeLabelEn: 'Bactericidal',
    targetSiteFa: 'پروتئین‌های PBPs (ترنس‌پپتیداز دیواره باکتری)',
    targetSiteEn: 'Bacterial Penicillin-Binding Proteins (PBPs)',
    cellularEffectFa: 'مهار اتصال پپتیدوگلیکان، ناپایداری اسمزی و لیز باکتری.',
    cellularEffectEn: 'Inhibits cell wall cross-linking, causing osmotic lysis.',
    descriptionFa:
      'اتصال به PBPs و مهار ساخت دیواره سلولی در باکتری‌های در حال رشد که باعث تخریب و مرگ باکتری می‌شود.',
    descriptionEn:
      'Binds PBPs to block peptidoglycan cross-linking and trigger bactericidal lysis.',
    clinicalRelevanceFa: 'آنتی‌بیوتیک خط اول عفونت‌های گوش و گلو. کلاوولانات در آگمنتین مانع تخریب بتالاکتاماز می‌شود.',
    clinicalRelevanceEn: 'First-line for ENT/respiratory infections. Clavulanate protects against beta-lactamase.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-macrolides': {
    classCode: 'mech-macrolides',
    classNameFa: 'ماکرولیدها (مهار سنتز پروتئین ریبوزوم 50S)',
    classNameEn: 'Macrolides (50S Ribosomal Inhibitor)',
    actionClassification: 'bacteriostatic',
    actionTypeLabelFa: 'باکتریواستاتیک (Bacteriostatic)',
    actionTypeLabelEn: 'Bacteriostatic',
    targetSiteFa: 'زیرواحد 50S ریبوزوم باکتریایی',
    targetSiteEn: 'Bacterial 50S ribosomal subunit',
    cellularEffectFa: 'توقف طویل‌سازی زنجیره پپتیدی و مهار سنتز پروتئین.',
    cellularEffectEn: 'Halts peptide chain elongation and protein synthesis.',
    descriptionFa:
      'اتصال برگشت‌پذیر به زیرواحد 50S ریبوزوم و توقف سنتز پروتئین و رشد باکتری‌های معمولی و آتیپیکال.',
    descriptionEn:
      'Reversibly binds the 50S ribosomal subunit to arrest bacterial protein translation.',
    clinicalRelevanceFa: 'جایگزین در حساسیت به پنی‌سیلین. کلاریترومایسین با استاتین‌ها تداخل شدید دارد.',
    clinicalRelevanceEn: 'Alternative in penicillin allergy. Clarithromycin has severe statin CYP interactions.',
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },

  'mech-ppis': {
    classCode: 'mech-ppis',
    classNameFa: 'مهارکننده‌های پمپ پروتون (PPIs / H+/K+ ATPase)',
    classNameEn: 'Proton Pump Inhibitors (H+/K+ ATPase)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'مهارکننده اسید معده (Acid Suppressor)',
    actionTypeLabelEn: 'Acid Suppressor',
    targetSiteFa: 'پمپ H+/K+ ATPase سلول‌های پاریتال معده',
    targetSiteEn: 'Gastric parietal cell H+/K+ ATPase',
    cellularEffectFa: 'مهار کامل مرحله نهایی ترشح اسید هیدروکلریک معده.',
    cellularEffectEn: 'Irreversible blockade of final acid secretion step.',
    descriptionFa:
      'پیوند کووالانسی پایدار با پمپ H+/K+ ATPase و مهار طولانی‌مدت ترشح اسید معده تا سنتز پمپ جدید.',
    descriptionEn:
      'Covalently binds and irreversibly inactivates the H+/K+ ATPase proton pump.',
    clinicalRelevanceFa: 'خط اول ریفلاکس (GORD) و زخم پپتیک. نحوه مصرف: ۳۰ تا ۶۰ دقیقه قبل از صبحانه.',
    clinicalRelevanceEn: 'Gold standard for GORD and ulcers. Take 30-60 minutes before breakfast.',
    colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },

  'mech-saba': {
    classCode: 'mech-saba',
    classNameFa: 'آگونیست‌های بتا-۲ کوتاه‌اثر (SABA)',
    classNameEn: 'Short-Acting Beta-2 Agonists (SABA)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'گشادکننده سریع برونش (Bronchodilator)',
    actionTypeLabelEn: 'Bronchodilator',
    targetSiteFa: 'گیرنده‌های بتا-۲ آدرنرژیک عضلات صاف برونش',
    targetSiteEn: 'Bronchial smooth muscle Beta-2 adrenoceptors',
    cellularEffectFa: 'افزایش cAMP، کاهش کلسیم آزاد و اتساع برونش ظرف ۵ دقیقه.',
    cellularEffectEn: 'Increases cAMP to relax bronchial smooth muscle in 5 mins.',
    descriptionFa:
      'تحریک گیرنده بتا-۲ ریه، افزایش cAMP درون سلولی و شل شدن سریع عضلات مجاری هوایی.',
    descriptionEn:
      'Stimulates beta-2 receptors, elevating cAMP to rapidly dilate constricted airways.',
    clinicalRelevanceFa: 'اسپری نجات‌بخش تنگی نفس در آسم. مصرف بیش از ۲ بار در هفته نشان‌دهنده نیاز به کورتون استنشاقی است.',
    clinicalRelevanceEn: 'Reliever inhaler for acute asthma. Overuse indicates need for preventer steroid.',
    colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },

  'mech-opioids': {
    classCode: 'mech-opioids',
    classNameFa: 'آگونیست‌های گیرنده مو-اپیوئید (S8 Opioids)',
    classNameEn: 'Mu-Opioid Receptor Agonists (S8)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'ضد درد مخدر مرکزی (Analgesic)',
    actionTypeLabelEn: 'Analgesic',
    targetSiteFa: 'گیرنده‌های مو-اپیوئیدی (MOR) در نخاع و مغز',
    targetSiteEn: 'Central Mu-Opioid Receptors (MOR)',
    cellularEffectFa: 'مهار آزادسازی پیام‌رسان‌های درد (سابستنس P) و تسکین درد.',
    cellularEffectEn: 'Inhibits pain neurotransmitters and blocks spinal transmission.',
    descriptionFa:
      'تحریک گیرنده‌های مو، مهار انتقال سیگنال درد در نخاع و تغییر درک مغز از درد.',
    descriptionEn:
      'Stimulates MOR receptors, suppressing pain signal conduction in spinal pathways.',
    clinicalRelevanceFa: 'کنترل دردهای شدید (جدول S8). عوارض: یبوست (تجویز همزمان ملین محرک الزامی است) و خواب‌آلودگی.',
    clinicalRelevanceEn: 'Schedule 8 for severe pain. Co-prescribe stimulant laxative to prevent constipation.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-sglt2': {
    classCode: 'mech-sglt2',
    classNameFa: 'مهارکننده‌های SGLT2 کلیه',
    classNameEn: 'SGLT2 Inhibitors',
    actionClassification: 'transporter_inhibitor',
    actionTypeLabelFa: 'دفع گلوکز در ادرار (Glucosuric)',
    actionTypeLabelEn: 'Glucosuric',
    targetSiteFa: 'هم‌ناقل سدیم-گلوکز نوع ۲ در توبول پروگزیمال کلیه',
    targetSiteEn: 'Renal proximal tubule SGLT2 co-transporter',
    cellularEffectFa: 'مهار بازجذب قند و سدیم و دفع گلوکز در ادرار.',
    cellularEffectEn: 'Blocks glucose reabsorption, promoting urinary glucose excretion.',
    descriptionFa:
      'مهار بازجذب قند در کلیه و دفع گلوکز اضافی از طریق ادرار با اثر محافظت قلبی و کلیوی.',
    descriptionEn:
      'Inhibits renal glucose reabsorption to lower blood sugar and provide cardiorenal protection.',
    clinicalRelevanceFa: 'داروی خط اول دیابت همراه با نارسایی قلبی/کلیوی. هشدار: نوشیدن آب کافی جهت پیشگیری از عفونت ادراری.',
    clinicalRelevanceEn: 'First-line for diabetes with CKD/heart failure. Maintain good hydration.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-statins': {
    classCode: 'mech-statins',
    classNameFa: 'استاتین‌ها (مهارکننده HMG-CoA ردوکتاز)',
    classNameEn: 'Statins (HMG-CoA Reductase Inhibitors)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'کاهنده چربی خون (Lipid-Lowering)',
    actionTypeLabelEn: 'Lipid-Lowering',
    targetSiteFa: 'آنزیم HMG-CoA ردوکتاز در کبد',
    targetSiteEn: 'Hepatic HMG-CoA Reductase',
    cellularEffectFa: 'کاهش ساخت کلسترول کبد و افزایش پاکسازی LDL از خون.',
    cellularEffectEn: 'Depletes hepatic cholesterol and upregulates LDL clearance receptors.',
    descriptionFa:
      'مهار آنزیم کلیدی ساخت کلسترول در کبد که باعث افزایش برداشت LDL-C از گردش خون می‌شود.',
    descriptionEn:
      'Inhibits cholesterol synthesis in hepatocytes, upregulating LDL receptors to clear blood LDL.',
    clinicalRelevanceFa: 'کاهش خطر سکته قلبی و مغزی. در صورت درد عضلانی غیرعادی به پزشک اطلاع داده شود.',
    clinicalRelevanceEn: 'Key for cardiovascular protection. Advise reporting unexplained muscle pain.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-decongestants': {
    classCode: 'mech-decongestants',
    classNameFa: 'ضداحتقان‌های آلفا-۱ (انقباض عروق بینی)',
    classNameEn: 'Decongestants (Alpha-1 Agonist)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'منقبض‌کننده عروق مخاط (Vasoconstrictor)',
    actionTypeLabelEn: 'Vasoconstrictor',
    targetSiteFa: 'گیرنده‌های آلفا-۱ آدرنرژیک در مخاط بینی',
    targetSiteEn: 'Nasal mucosa Alpha-1 adrenoceptors',
    cellularEffectFa: 'انقباض مویرگ‌های متورم بینی و کاهش گرفتگی تنفس.',
    cellularEffectEn: 'Constricts nasal mucosal blood vessels, relieving congestion.',
    descriptionFa:
      'تحریک گیرنده آلفا-۱، انقباض عروق خونی بینی و باز شدن سریع مجاری تنفسی.',
    descriptionEn:
      'Stimulates alpha-1 receptors to constrict dilated mucosal vessels and restore airflow.',
    clinicalRelevanceFa: 'تسکین گرفتگی بینی در سرماخوردگی (جدول S3 ثبت Project Stop). در فشار خون بالا احتیاط شود.',
    clinicalRelevanceEn: 'Relief of acute congestion (S3 Project Stop). Caution in uncontrolled hypertension.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-paracetamol': {
    classCode: 'mech-paracetamol',
    classNameFa: 'پاراستامول (مهار سنتز پروستاگلاندین مرکزی)',
    classNameEn: 'Paracetamol (Central Prostaglandin Synthesis Inhibitor)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'ضد درد و تب مرکزی (Antipyretic / Analgesic)',
    actionTypeLabelEn: 'Central Analgesic & Antipyretic',
    targetSiteFa: 'سنتز پروستاگلاندین در سیستم عصبی مرکزی (CNS) و تعدیل مسیر سروتونرژیک نزولی',
    targetSiteEn: 'Central nervous system prostaglandin synthesis & descending serotonergic pathways',
    cellularEffectFa: 'کاهش حساسیت گیرنده‌های درد مرکزی و تنظیم مرکز کنترل دمای بدن در هیپوتالاموس.',
    cellularEffectEn: 'Reduces central pain signal perception and resets hypothalamic thermoregulatory set-point.',
    descriptionFa: 'مهار انتخابی تولید پروستاگلاندین‌ها در مغز بدون اثرات ضدالتهابی یا عوارض گوارشی محیطی.',
    descriptionEn: 'Selectively inhibits central prostaglandin synthesis, providing effective pain and fever reduction with minimal GI risk.',
    clinicalRelevanceFa: 'خط اول تسکین درد و تب در تمام گروه‌های سنی و بارداری. حداکثر ۴ گرم در ۲۴ ساعت در بزرگسالان.',
    clinicalRelevanceEn: 'First-line analgesic/antipyretic. Strict maximum 4g daily in adults to prevent hepatotoxicity.',
    colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },

  'mech-nsaids': {
    classCode: 'mech-nsaids',
    classNameFa: 'مهارکننده‌های سیکلواکسیژناز COX (ضدالتهاب غیراستروئیدی NSAID)',
    classNameEn: 'Cyclooxygenase (COX-1/COX-2) Inhibitors (NSAIDs)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'ضدالتهاب و ضددرد محیطی (NSAID)',
    actionTypeLabelEn: 'Anti-inflammatory & Peripheral Analgesic',
    targetSiteFa: 'آنزیم‌های سیکلواکسیژناز ۱ و ۲ (COX-1 و COX-2)',
    targetSiteEn: 'Cyclooxygenase isoenzymes (COX-1 and COX-2)',
    cellularEffectFa: 'مهار سنتز پروستاگلاندین‌های التهابی E2 و I2 در بافت‌های محیطی.',
    cellularEffectEn: 'Inhibits conversion of arachidonic acid to pro-inflammatory prostaglandins.',
    descriptionFa: 'کاهش تورم، درد و التهاب محیطی مفاصل و عضلات از طریق مسدود کردن مسیر سنتز پروستاگلاندین.',
    descriptionEn: 'Blocks COX enzymes to attenuate peripheral inflammation, pain, and tissue swelling.',
    clinicalRelevanceFa: 'موثر در دردهای التهابی و آرتروز. همراه غذا مصرف شود؛ در زخم معده، نارسایی کلیه و آسم احتیاط شود.',
    clinicalRelevanceEn: 'Effective for inflammatory pain. Take with food; caution with peptic ulcers, renal impairment, and asthma.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-antihistamines': {
    classCode: 'mech-antihistamines',
    classNameFa: 'آنتاگونیست‌های انتخابی گیرنده H1 هیستامین (آنتی‌هیستامین نسل جدید)',
    classNameEn: 'Selective Histamine H1 Receptor Antagonists (Non-sedating Antihistamines)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'ضدحساسیت و آلرژی (Antiallergic)',
    actionTypeLabelEn: 'Antihistamine / Antiallergic',
    targetSiteFa: 'گیرنده‌های H1 هیستامین در عروق خونی و اعصاب حسی محیطی',
    targetSiteEn: 'Peripheral Histamine H1 Receptors',
    cellularEffectFa: 'مهار گشادی عروق، نشت پلاسما و خارش ناشی از آزادسازی هیستامین از ماست‌سل‌ها.',
    cellularEffectEn: 'Blocks histamine-mediated vascular permeability, pruritus, and mucosal edema.',
    descriptionFa: 'اتصال رقابتی به گیرنده‌های H1 و رفع خارش، آبریزش بینی، عطسه و کهیر بدون خواب‌آلودگی چشمگیر.',
    descriptionEn: 'Competitively blocks H1 receptors to control allergic rhinitis, conjunctivitis, and urticaria with minimal sedation.',
    clinicalRelevanceFa: 'درمان خط اول رینیت آلرژیک، تب یونجه و کهیرهای پوستی.',
    clinicalRelevanceEn: 'First-line for allergic rhinitis, hay fever, and acute urticaria.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-antacids': {
    classCode: 'mech-antacids',
    classNameFa: 'آنتی‌اسیدها و سد محافظ آلژینات (خنثی‌سازی اسید و سد فیزیکی)',
    classNameEn: 'Antacids & Alginate Barrier (Direct Acid Neutralisation)',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'خنثی‌کننده اسید معده (Acid Neutraliser & Barrier)',
    actionTypeLabelEn: 'Acid Neutraliser & Physical Raft',
    targetSiteFa: 'اسید کلریدریک لومن معده و محل اتصال مری به معده',
    targetSiteEn: 'Gastric acid lumen & gastroesophageal junction',
    cellularEffectFa: 'افزایش فوری pH معده و ایجاد سد فوم غوطه‌ور برای جلوگیری از بازگشت اسید به مری.',
    cellularEffectEn: 'Rapidly neutralises HCl and forms a floating raft barrier above gastric contents.',
    descriptionFa: 'ترکیب شیمیایی املاح خنثی‌کننده و آلژینات سدیم که تسکین سریع و موضعی سوزش سر دل ایجاد می‌کند.',
    descriptionEn: 'Provides immediate symptomatic relief by buffering gastric acidity and forming a mechanical barrier.',
    clinicalRelevanceFa: 'تسکین سریع پس از غذا. رعایت فاصله حداقل ۲ ساعته با سایر داروها برای جلوگیری از کاهش جذب الزامی است.',
    clinicalRelevanceEn: 'Rapid postprandial relief. Space at least 2 hours apart from other oral medications.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-nrt': {
    classCode: 'mech-nrt',
    classNameFa: 'آگونیست گیرنده‌های نیکوتینی nAChR (درمان جایگزین نیکوتین NRT)',
    classNameEn: 'Nicotinic Acetylcholine Receptor Agonists (NRT)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'تسکین وسوسه نیکوتین (Smoking Cessation)',
    actionTypeLabelEn: 'Smoking Cessation Aid',
    targetSiteFa: 'گیرنده‌های کولینرژیک نیکوتینی (nAChRs) در مغز',
    targetSiteEn: 'Neuronal Nicotinic Acetylcholine Receptors',
    cellularEffectFa: 'تحریک رهایش دوپامین در مسیر پاداش مغز و مهار علائم ترک سیگار.',
    cellularEffectEn: 'Maintains baseline dopamine tone to attenuate acute nicotine withdrawal cravings.',
    descriptionFa: 'تامین کنترل‌شده نیکوتین بدون سموم و دود سیگار جهت کمک به ترک تدریجی دخانیات.',
    descriptionEn: 'Delivers controlled nicotine levels without harmful tobacco combustion products.',
    clinicalRelevanceFa: 'آدامس و پچ نیکوتین؛ رعایت تکنیک Chew and Park در آدامس الزامی است.',
    clinicalRelevanceEn: 'Nicotine gum/patches; follow Chew & Park technique to optimize buccal absorption.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-acei': {
    classCode: 'mech-acei',
    classNameFa: 'مهارکننده‌های آنزیم مبدل آنژیوتانسین (ACE Inhibitors)',
    classNameEn: 'Angiotensin Converting Enzyme Inhibitors (ACEIs)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'کاهنده فشار خون و محافظ قلبی-کلیوی',
    actionTypeLabelEn: 'Antihypertensive & Cardiorenal Protective',
    targetSiteFa: 'آنزیم مبدل آنژیوتانسین (ACE) در اندوتلیوم عروق و ریه',
    targetSiteEn: 'Vascular & pulmonary Angiotensin Converting Enzyme (ACE)',
    cellularEffectFa: 'مهار تبدیل آنژیوتانسین I به II (منقبض‌کننده قوی) و جلوگیری از تجزیه برادی‌کینین گشادکننده عروق.',
    cellularEffectEn: 'Inhibits Ang I to Ang II conversion and blocks bradykinin degradation.',
    descriptionFa: 'کاهش مقاومت عروق محیطی، کاهش بار پس‌بار قلب و محافظت از کلیه در دیابت و فشار خون بالا.',
    descriptionEn: 'Reduces systemic vascular resistance and provides target organ protection in hypertension and heart failure.',
    clinicalRelevanceFa: 'خط اول فشار خون و نارسایی قلبی. عارضه جانبی شایع: سرفه خشک ناشی از تجمع برادی‌کینین.',
    clinicalRelevanceEn: 'First-line for hypertension/HF. Common adverse effect: dry cough due to bradykinin accumulation.',
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },

  'mech-arb': {
    classCode: 'mech-arb',
    classNameFa: 'آنتاگونیست‌های گیرنده آنژیوتانسین II (ARBs)',
    classNameEn: 'Angiotensin II Receptor Blockers (ARBs)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'مسدودکننده گیرنده AT1 آنژیوتانسین',
    actionTypeLabelEn: 'Selective AT1 Receptor Antagonist',
    targetSiteFa: 'گیرنده‌های نوع ۱ آنژیوتانسین II (AT1 receptors) در عضلات صاف عروق',
    targetSiteEn: 'Vascular Smooth Muscle AT1 Receptors',
    cellularEffectFa: 'مهار انقباض عروقی و مهار ترشح آلدوسترون ناشی از آنژیوتانسین II بدون افزایش برادی‌کینین.',
    cellularEffectEn: 'Blocks Ang II-mediated vasoconstriction and aldosterone release without increasing bradykinin.',
    descriptionFa: 'بلوک اختصاصی گیرنده AT1 که باعث گشادی عروق، کاهش فشار خون و دفع سدیم و آب می‌گردد.',
    descriptionEn: 'Selectively displaces Ang II from AT1 receptors, lowering blood pressure without causing dry cough.',
    clinicalRelevanceFa: 'جایگزین ایده‌آل ACEI در صورت بروز سرفه خشک. در بارداری اکیداً منع مصرف دارد.',
    clinicalRelevanceEn: 'Ideal alternative when ACEI cough occurs. Strictly contraindicated in pregnancy.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-dhp-ccb': {
    classCode: 'mech-dhp-ccb',
    classNameFa: 'مسدودکننده‌های کانال کلسیم دی‌هیدروپیریدینی (DHP-CCBs)',
    classNameEn: 'Dihydropyridine Calcium Channel Blockers (DHP-CCBs)',
    actionClassification: 'ion_channel_blocker',
    actionTypeLabelFa: 'گشادکننده اختصاصی عروق شریانی (Arteriolar Vasodilator)',
    actionTypeLabelEn: 'Arteriolar Vasodilator',
    targetSiteFa: 'کانال‌های کلسیمی وابسته به ولتاژ نوع L در عضلات صاف شریان‌ها',
    targetSiteEn: 'Voltage-gated L-type calcium channels in arterial smooth muscle',
    cellularEffectFa: 'مهار ورود کلسیم به سلول‌های عضلانی شریان‌ها، شل شدن عروق و کاهش مقاومت محیطی.',
    cellularEffectEn: 'Inhibits transmembrane calcium influx, causing peripheral vasodilation.',
    descriptionFa: 'کاهش فشار خون شریانی از طریق اتساع انتخابی شریان‌های محیطی با حداقل اثر روی هدایت قلبی.',
    descriptionEn: 'Selectively dilates peripheral arterioles to lower systemic vascular resistance.',
    clinicalRelevanceFa: 'موثر در فشار خون بالا و آنژین پایدار. عارضه جانبی شایع: ادم مچ پا ناشی از اتساع پره‌کاپیلری.',
    clinicalRelevanceEn: 'First-line for hypertension. Common side effect: peripheral ankle edema.',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },

  'mech-non-dhp-ccb': {
    classCode: 'mech-non-dhp-ccb',
    classNameFa: 'مسدودکننده‌های کانال کلسیم غیر دی‌هیدروپیریدینی (Non-DHP CCBs)',
    classNameEn: 'Non-Dihydropyridine Calcium Channel Blockers',
    actionClassification: 'ion_channel_blocker',
    actionTypeLabelFa: 'کاهنده سرعت هدایت قلبی و فشار خون (Cardiodepressant CCB)',
    actionTypeLabelEn: 'Cardiodepressant & Vasodilator',
    targetSiteFa: 'کانال‌های کلسیمی نوع L در میوکارد و گره‌های SA و AV قلب',
    targetSiteEn: 'Cardiac SA/AV nodal and myocardial L-type calcium channels',
    cellularEffectFa: 'کاهش سرعت هدایت گره دهلیزی-بطنی، کاهش ضربان قلب و کاهش قدرت انقباضی میوکارد.',
    cellularEffectEn: 'Slows AV nodal conduction and reduces myocardial contractility and heart rate.',
    descriptionFa: 'کنترل ریتم قلب و کاهش فشار خون با مهار ورود کلسیم به بافت هدایتی و عضلانی قلب.',
    descriptionEn: 'Slows AV node conduction and cardiac chronotropy for rate control and angina relief.',
    clinicalRelevanceFa: 'کنترل ریتم در فیبریلاسیون دهلیزی و آنژین. احتیاط: تداخل شدید با بتابلوکرها (خطر برادی‌کاردی شدید).',
    clinicalRelevanceEn: 'Rate control in AF and angina. Caution: severe bradycardia risk if combined with beta-blockers.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-alpha-beta-blocker': {
    classCode: 'mech-alpha-beta-blocker',
    classNameFa: 'مسدودکننده‌های همزمان گیرنده آلفا و بتا (Combined Alpha/Beta Blockers)',
    classNameEn: 'Combined Alpha-1 and Beta-Adrenoceptor Antagonists',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'کاهنده فشار خون شریانی با گشادی عروق محیطی',
    actionTypeLabelEn: 'Vasodilating Beta-Blocker',
    targetSiteFa: 'گیرنده‌های بتا-۱، بتا-۲ و آلفا-۱ آدرنرژیک',
    targetSiteEn: 'Alpha-1, Beta-1, and Beta-2 adrenoceptors',
    cellularEffectFa: 'بلوک آلفا-۱ باعث اتساع عروق محیطی و بلوک بتا مانع از تاکیکاردی واکنشی ناشی از افت فشار می‌شود.',
    cellularEffectEn: 'Alpha-1 antagonism induces vasodilation while beta-blockade prevents reflex tachycardia.',
    descriptionFa: 'کنترل سریع و ایمن فشار خون بالا بدون افزایش مقاومت عروقی یا ضربان قلب جهشی.',
    descriptionEn: 'Provides balanced blood pressure reduction with peripheral vasodilation and cardiac rate modulation.',
    clinicalRelevanceFa: 'داروی انتخابی فشار خون بارداری (پره‌اکلامپسی) و بحران‌های حاد فشار خون.',
    clinicalRelevanceEn: 'Drug of choice for pregnancy-induced hypertension and hypertensive urgency.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-mra': {
    classCode: 'mech-mra',
    classNameFa: 'آنتاگونیست‌های گیرنده مینرالوکورتیکوئید (MRA / دیورتیک نگه‌دارنده پتاسیم)',
    classNameEn: 'Mineralocorticoid (Aldosterone) Receptor Antagonists (MRAs)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'ضد آلدوسترون و نگه‌دارنده پتاسیم (Potassium-Sparing Diuretic)',
    actionTypeLabelEn: 'Aldosterone Antagonist / K+-Sparing Diuretic',
    targetSiteFa: 'گیرنده‌های داخل سلولی آلدوسترون در لوله جمع‌کننده قشر کلیه',
    targetSiteEn: 'Cortical collecting duct mineralocorticoid receptors',
    cellularEffectFa: 'مهار کانال‌های ENaC، مهار بازجذب سدیم و آب و مهار دفع پتاسیم و منیزیم در ادرار.',
    cellularEffectEn: 'Inhibits aldosterone-induced ENaC channels, excreting Na+/water while sparing K+.',
    descriptionFa: 'مهار رقابتی اثرات آلدوسترون، کاهش ادم و فشار خون و جلوگیری از فیبروز قلبی در نارسایی قلب.',
    descriptionEn: 'Competitively inhibits aldosterone to reduce fluid retention and cardiorenal remodeling.',
    clinicalRelevanceFa: 'کاهش مرگ‌ومیر در نارسایی قلبی (HFrEF) و درمان هایپرآلدوسترونیسم. پایش منظم پتاسیم خون الزامی است.',
    clinicalRelevanceEn: 'Improves survival in HFrEF. Monitor serum potassium and renal function closely.',
    colorClass: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
  },

  'mech-vka': {
    classCode: 'mech-vka',
    classNameFa: 'آنتاگونیست‌های ویتامین K (وارفارین)',
    classNameEn: 'Vitamin K Antagonists (Warfarin)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'ضدانعقاد خوراکی پایش‌شونده با INR',
    actionTypeLabelEn: 'Oral Anticoagulant (VKORC1 Inhibitor)',
    targetSiteFa: 'آنزیم ویتامین K اپوکسید ردوکتاز (VKORC1) در کبد',
    targetSiteEn: 'Hepatic Vitamin K Epoxide Reductase Complex 1 (VKORC1)',
    cellularEffectFa: 'مهار احیای ویتامین K و توقف گاما-کربوکسیلاسیون فاکتورهای انعقادی II, VII, IX, X و پروتئین‌های C و S.',
    cellularEffectEn: 'Blocks vitamin K recycling, preventing gamma-carboxylation of clotting factors II, VII, IX, X.',
    descriptionFa: 'کاهش ساخت فاکتورهای انعقادی فعال در کبد و پیشگیری از تشکیل و گسترش لخته‌های ترومبوآمبولیک.',
    descriptionEn: 'Inhibits synthesis of functional vitamin K-dependent coagulation factors to prevent thrombosis.',
    clinicalRelevanceFa: 'داروی با پنجره درمانی باریک (NTI). پایش منظم INR، عدم تغییر برند و توجه به تداخلات غذایی/دارویی الزامی است.',
    clinicalRelevanceEn: 'Narrow Therapeutic Index (NTI). Requires strict INR monitoring and consistent brand/diet.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-p2y12': {
    classCode: 'mech-p2y12',
    classNameFa: 'مهارکننده‌های گیرنده P2Y12 پلاکت (کلوپیدوگرل)',
    classNameEn: 'Platelet P2Y12 Receptor Antagonists (Thienopyridines)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'ضدتجمع پلاکت (Antiplatelet)',
    actionTypeLabelEn: 'Antiplatelet / ADP Receptor Antagonist',
    targetSiteFa: 'گیرنده پورینرژیک P2Y12 روی سطح پلاکت‌های خون',
    targetSiteEn: 'Platelet surface purinergic P2Y12 receptors',
    cellularEffectFa: 'مهار غیرقابل برگشت اتصال ADP به گیرنده P2Y12 و جلوگیری از فعال‌سازی کمپلکس گلیکوپروتئین GPIIb/IIIa.',
    cellularEffectEn: 'Irreversibly blocks ADP binding to P2Y12 receptors, preventing platelet aggregation for their lifespan.',
    descriptionFa: 'مهار چسبندگی و تجمع پلاکت‌ها در تمام طول عمر پلاکت (۷ الی ۱۰ روز) جهت پیشگیری از سکته مجدد.',
    descriptionEn: 'Irreversibly blocks platelet aggregation to prevent atherothrombotic events post-stent/ACS.',
    clinicalRelevanceFa: 'پیشگیری ثانویه پس از استنت‌گذاری و سکته قلبی. تبدیل به فرم فعال نیازمند آنزیم کبدی CYP2C19 است.',
    clinicalRelevanceEn: 'Secondary prevention after ACS/stenting. Prodrug activated by hepatic CYP2C19.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-doac-thrombin': {
    classCode: 'mech-doac-thrombin',
    classNameFa: 'مهارکننده‌های مستقیم ترومبین (دابیگاتران / DOAC)',
    classNameEn: 'Direct Thrombin Inhibitors (DTI / DOAC)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'ضدانعقاد خوراکی نوین با اثر مستقیم (DOAC)',
    actionTypeLabelEn: 'Direct Oral Anticoagulant (Factor IIa Inhibitor)',
    targetSiteFa: 'جایگاه فعال ترومبین آزاد و متصل به لخته (فاکتور IIa)',
    targetSiteEn: 'Active catalytic site of free and clot-bound Thrombin (Factor IIa)',
    cellularEffectFa: 'مهار مستقیم تبدیل فیبرینوژن به فیبرین و توقف آبشار انعقادی بدون نیاز به کوفاکتور آنتی‌ترومبین.',
    cellularEffectEn: 'Potently and reversibly inhibits thrombin-mediated fibrin formation.',
    descriptionFa: 'مهار اختصاصی و مستقیم ترومبین جهت پیشگیری از سکته مغزی در AF و درمان ترومبوز ورید عمقی (DVT/PE).',
    descriptionEn: 'Directly and reversibly inhibits thrombin to prevent thromboembolism with predictable kinetics.',
    clinicalRelevanceFa: 'عدم نیاز به پایش آزمایشگاهی روتین. کپسول‌ها باید در قوطی اصلی نگهداری شده و دست‌نخورده بلعیده شوند.',
    clinicalRelevanceEn: 'No routine INR monitoring required. Keep in original packaging to protect from moisture.',
    colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },

  'mech-ssri': {
    classCode: 'mech-ssri',
    classNameFa: 'مهارکننده‌های انتخابی بازجذب سروتونین (SSRIs)',
    classNameEn: 'Selective Serotonin Reuptake Inhibitors (SSRIs)',
    actionClassification: 'transporter_inhibitor',
    actionTypeLabelFa: 'ضدافسردگی و ضداضطراب (Antidepressant)',
    actionTypeLabelEn: 'Antidepressant / SERT Inhibitor',
    targetSiteFa: 'ناقل اختصاصی بازجذب سروتونین (SERT) در پایانه پیش‌سیناپسی نورون‌های مغز',
    targetSiteEn: 'Presynaptic Serotonin Transporter (SERT)',
    cellularEffectFa: 'مهار بازجذب سروتونین، افزایش غلظت آن در شکاف سیناپسی و تنظیم گیرنده‌های سروتونرژیک پس‌سیناپسی.',
    cellularEffectEn: 'Inhibits SERT to increase synaptic serotonin concentration and promote neuroplasticity.',
    descriptionFa: 'بهبود خلق، کاهش اضطراب و تثبیت انتقال پیام‌های سروتونرژیک مغزی با عوارض آنتی‌کولینرژیک بسیار کمتر.',
    descriptionEn: 'Blocks serotonin reuptake to enhance serotonergic neurotransmission in depressive and anxiety disorders.',
    clinicalRelevanceFa: 'خط اول درمان افسردگی و اضطراب. شروع اثر درمانی نیازمند ۲ تا ۴ هفته مصرف مداوم است.',
    clinicalRelevanceEn: 'First-line for depression and anxiety. Full therapeutic response requires 2-4 weeks.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-lithium': {
    classCode: 'mech-lithium',
    classNameFa: 'نمک‌های لیتیوم (تثبیت‌کننده خلق / مهار اینوزیتول مونوفسفاتاز)',
    classNameEn: 'Lithium Salts (Mood Stabilizer)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'تثبیت‌کننده خلق در اختلال دوقطبی (Mood Stabilizer)',
    actionTypeLabelEn: 'Mood Stabilizer / Second Messenger Modulator',
    targetSiteFa: 'آنزیم‌های اینوزیتول مونوفسفاتاز (IMPase) و گلیکوژن سنتاز کیناز-۳ (GSK-3)',
    targetSiteEn: 'Inositol monophosphatase (IMPase) & Glycogen Synthase Kinase-3 (GSK-3)',
    cellularEffectFa: 'کاهش تخلیه اینوزیتول آزاد در مغز، تعدیل انتقال پیام گلوتامات و دوپامین و افزایش نوروپروتکشن.',
    cellularEffectEn: 'Depletes neuronal inositol and inhibits GSK-3 to stabilize neurotransmission.',
    descriptionFa: 'تثبیت نوسانات خلقی و پیشگیری از فازهای مانیا و افسردگی شدید در اختلال دوقطبی.',
    descriptionEn: 'Stabilizes mood swings and prevents manic/depressive relapses in bipolar disorder.',
    clinicalRelevanceFa: 'داروی با پنجره درمانی باریک (NTI). سطح سرمی هدف ۰.۶ تا ۰.۸ میلی‌مول بر لیتر؛ پایش عملکرد تیروئید و کلیه الزامی است.',
    clinicalRelevanceEn: 'Strict Narrow Therapeutic Index (NTI). Maintain target range 0.6-0.8 mmol/L.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-valproate': {
    classCode: 'mech-valproate',
    classNameFa: 'سدیم والپروات (تقویت GABA و مهار کانال‌های سدیمی/کلسیمی)',
    classNameEn: 'Sodium Valproate (GABA Enhancer & Ion Channel Blocker)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'ضدصرع و تثبیت‌کننده خلق وسیع‌الطیف',
    actionTypeLabelEn: 'Broad-Spectrum Anticonvulsant & Mood Stabilizer',
    targetSiteFa: 'آنزیم GABA ترانس‌آمیناز، کانال‌های سدیمی ولتاژی و کانال‌های کلسیمی نوع T',
    targetSiteEn: 'GABA transaminase, voltage-gated Na+ channels & T-type Ca2+ channels',
    cellularEffectFa: 'افزایش غلظت GABA مهاری در مغز، مهار شلیک مکرر نورون‌ها و فرونشاندن کانون‌های صرعی.',
    cellularEffectEn: 'Elevates inhibitory GABA levels and blocks repetitive high-frequency neuronal firing.',
    descriptionFa: 'کنترل حملات تشنجی جنرالیزه و فوکال و پیشگیری از حملات حاد مانیا در اختلال دو قطبی.',
    descriptionEn: 'Broad-spectrum anticonvulsant that prevents seizure propagation and mood instability.',
    clinicalRelevanceFa: 'پنجره درمانی باریک. تراتوژن شدید (منع مصرف در سنین باروری مگر با برنامه پیشگیری از بارداری تاییدشده).',
    clinicalRelevanceEn: 'Highly teratogenic. Avoid in females of childbearing potential unless under strict pregnancy prevention.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-atypical-antipsychotic': {
    classCode: 'mech-atypical-antipsychotic',
    classNameFa: 'آنتی‌سایکوتیک‌های آتیپیک (کلوزاپین / آنتاگونیست D4 و 5-HT2A)',
    classNameEn: 'Atypical Antipsychotics (Clozapine)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'ضدجنون آتیپیک در اسکیزوفرنی مقاوم به درمان',
    actionTypeLabelEn: 'Atypical Antipsychotic for Treatment-Resistant Schizophrenia',
    targetSiteFa: 'گیرنده‌های دوپامین D4 و D2 و گیرنده‌های سروتونین 5-HT2A در مغز',
    targetSiteEn: 'Limbic Dopamine D4/D2 and Serotonin 5-HT2A receptors',
    cellularEffectFa: 'تعدیل انتخابی مسیر مزولیمبیک با کمترین اثر روی مسیر حرکتی اکستراپیرامیدال (EPS).',
    cellularEffectEn: 'Selectively modulates limbic dopaminergic pathways with minimal extrapyramidal motor liability.',
    descriptionFa: 'مهار علائم مثبت و منفی اسکیزوفرنی در بیماران مقاوم به سایر داروهای آنتی‌سایکوتیک.',
    descriptionEn: 'Gold standard for treatment-resistant schizophrenia, resolving refractory psychotic symptoms.',
    clinicalRelevanceFa: 'داروی تحت کنترل ویژه با سیستم ثبت ملی کلوزاپین (CPN). پایش مداوم شمارش گلبول‌های سفید و نوتروفیل‌ها الزامی است.',
    clinicalRelevanceEn: 'Mandatory registry dispensing. Regular absolute neutrophil count (ANC) monitoring required.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-levothyroxine': {
    classCode: 'mech-levothyroxine',
    classNameFa: 'لووتیروکسین سدیم (هورمون تیروئیدی صناعی T4)',
    classNameEn: 'Levothyroxine Sodium (Synthetic Thyroid Hormone T4)',
    actionClassification: 'hormone_replacement',
    actionTypeLabelFa: 'جایگزین هورمون تیروئید (Thyroid Hormone Replacement)',
    actionTypeLabelEn: 'Thyroid Hormone Replacement',
    targetSiteFa: 'گیرنده‌های هسته‌ای هورمون تیروئید (TR) در تمام بافت‌های بدن پس از تبدیل به T3',
    targetSiteEn: 'Nuclear Thyroid Receptors (TRα/TRβ) across target tissues',
    cellularEffectFa: 'تبدیل به تری‌یدوتیرونین (T3) فعال، تنظیم بیان ژن‌های متابولیک و تنظیم متابولیسم پایه سلول‌ها.',
    cellularEffectEn: 'Deiodinated to active T3, activating nuclear transcription to regulate basal metabolic rate.',
    descriptionFa: 'تامین هورمون تیروئید کمبودیافته در کم‌کاری تیروئید (هیپوتیروئیدیسم) و نرمال‌سازی TSH.',
    descriptionEn: 'Restores physiological thyroid hormone levels, normalizing cellular metabolism and TSH.',
    clinicalRelevanceFa: 'داروی با پنجره درمانی باریک (NTI). نحوه مصرف: صبح ناشتا حداقل ۳۰ تا ۶۰ دقیقه قبل از صبحانه با آب خالی.',
    clinicalRelevanceEn: 'Narrow Therapeutic Index (NTI). Take on an empty stomach 30-60 minutes before breakfast with plain water.',
    colorClass: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
  },

  'mech-metformin': {
    classCode: 'mech-metformin',
    classNameFa: 'بی‌گوانیدها (متفورمین / فعال‌کننده AMPK کبدی)',
    classNameEn: 'Biguanides (Metformin / Hepatic AMPK Activator)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'حساس‌کننده به انسولین و کاهنده قند خون (Euglycaemic Agent)',
    actionTypeLabelEn: 'Insulin Sensitizer / AMPK Activator',
    targetSiteFa: 'کیناز فعال‌شده با AMP (AMPK) در سلول‌های کبد و میتوکندری',
    targetSiteEn: 'Hepatic AMP-activated protein kinase (AMPK) & complex I',
    cellularEffectFa: 'مهار گلوکونئوژنز کبد، کاهش جذب روده‌ای گلوکز و افزایش برداشت و مصرف گلوکز در عضلات اسکلتی.',
    cellularEffectEn: 'Suppresses hepatic gluconeogenesis and stimulates peripheral glucose uptake in skeletal muscle.',
    descriptionFa: 'کاهش تولید قند در کبد و افزایش حساسیت بافت‌ها به انسولین بدون ایجاد هیپوگلیسمی یا افزایش وزن.',
    descriptionEn: 'First-line oral hypoglycemic that reduces hepatic glucose output without hypoglycemia risk.',
    clinicalRelevanceFa: 'خط اول درمان دیابت نوع ۲. همراه غذا مصرف شود؛ در نارسایی شدید کلیه (eGFR<30) منع مصرف دارد.',
    clinicalRelevanceEn: 'First-line for type 2 diabetes. Take with meals; contraindicated in severe renal impairment.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-bisphosphonates': {
    classCode: 'mech-bisphosphonates',
    classNameFa: 'بیس‌فسفونات‌ها (مهارکننده فارنسیل پیروفسفات سنتاز / ضدتحلیل استخوان)',
    classNameEn: 'Bisphosphonates (FPPS Inhibitors / Antiresorptive)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'مهارکننده بازجذب استخوان و ضدپوکی استخوان',
    actionTypeLabelEn: 'Bone Antiresorptive Agent',
    targetSiteFa: 'آنزیم فارنسیل پیروفسفات سنتاز (FPPS) در استئوکلاست‌ها و هیدروکسی‌آپاتیت استخوان',
    targetSiteEn: 'Osteoclast Farnesyl Pyrophosphate Synthase (FPPS) & Bone Hydroxyapatite',
    cellularEffectFa: 'اتصال محکم به ماتریکس معدنی استخوان، القای آپوپتوز در استئوکلاست‌ها و توقف تخریب استخوان.',
    cellularEffectEn: 'Binds bone mineral, disrupts osteoclast ruffled border prenylation and triggers osteoclast apoptosis.',
    descriptionFa: 'کاهش سرعت تحلیل استخوان، افزایش تراکم معدنی استخوان (BMD) و کاهش چشمگیر شکستگی‌های فشاری.',
    descriptionEn: 'Inhibits osteoclastic bone resorption to increase bone mineral density and reduce fracture risk.',
    clinicalRelevanceFa: 'خط اول پوکی استخوان (Osteoporosis). مصرف ناشتا با یک لیوان پر آب و باقی ماندن در حالت ایستاده/نشسته به مدت ۳۰ دقیقه.',
    clinicalRelevanceEn: 'First-line for osteoporosis. Take fasting with a full glass of plain water; remain upright for 30 minutes.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-systemic-steroid': {
    classCode: 'mech-systemic-steroid',
    classNameFa: 'کورتیکواستروئیدهای سیستمیک (پردنیزولون)',
    classNameEn: 'Systemic Glucocorticoids (Prednisolone)',
    actionClassification: 'anti_inflammatory',
    actionTypeLabelFa: 'ضدالتهاب و سرکوب‌کننده ایمنی سیستمیک',
    actionTypeLabelEn: 'Systemic Anti-inflammatory & Immunosuppressant',
    targetSiteFa: 'گیرنده‌های گلوکوکورتیکوئیدی سیتوپلاسمی (GR) در تمام سلول‌های ایمنی',
    targetSiteEn: 'Cytoplasmic Glucocorticoid Receptors (GR)',
    cellularEffectFa: 'مهار فاکتور رونویسی NF-κB، مهار تولید سایتوکاین‌های التهابی (IL-1, IL-6, TNF-α) و مهار فسفولیپاز A2.',
    cellularEffectEn: 'Inhibits NF-κB transcription factor and suppresses pro-inflammatory cytokines and arachidonic acid cascade.',
    descriptionFa: 'سرکوب سریع و قدرتمند پاسخ‌های التهابی و خودایمنی در شعله‌ور شدن بیماری‌های حاد.',
    descriptionEn: 'Provides potent systemic anti-inflammatory and immunosuppressive action for acute flare-ups.',
    clinicalRelevanceFa: 'حملات حاد آسم، بیماری‌های خودایمنی و التهابی. مصرف صبح‌ها همراه غذا؛ قطع دارو در دوره‌های طولانی باید تدریجی باشد.',
    clinicalRelevanceEn: 'Acute asthma exacerbations and autoimmune flares. Take in the morning with food; taper off gradually if used >2 weeks.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-isoxazolyl-penicillin': {
    classCode: 'mech-isoxazolyl-penicillin',
    classNameFa: 'پنی‌سیلین‌های ضد استافیلوکوک (فلوکلوگزاسیلین)',
    classNameEn: 'Anti-Staphylococcal Penicillins (Flucloxacillin)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'آنتی‌بیوتیک باکتریوسید مقاوم به پنی‌سیلیناز',
    actionTypeLabelEn: 'Penicillinase-Resistant Bactericidal Antibiotic',
    targetSiteFa: 'پروتئین‌های متصل‌شونده به پنی‌سیلین (PBPs) در دیواره باکتری‌های گرم مثبت',
    targetSiteEn: 'Bacterial cell wall Penicillin-Binding Proteins (PBPs)',
    cellularEffectFa: 'مهار اتصالات پپتیدوگلیکان دیواره باکتری با مقاومت در برابر هیدرولیز توسط آنزیم بتالاکتاماز استافیلوکوک.',
    cellularEffectEn: 'Inhibits peptidoglycan cell wall synthesis while resisting staphylococcal beta-lactamase degradation.',
    descriptionFa: 'داروی انتخابی عفونت‌های پوستی و بافت نرم ناشی از استافیلوکوکوس اورئوس حساس به متی‌سیلین (MSSA).',
    descriptionEn: 'First-line treatment for MSSA skin and soft tissue infections (cellulitis, wound infections).',
    clinicalRelevanceFa: 'خط اول سلولیت و عفونت‌های چرکی پوست. با معده خالی (۱ ساعت قبل یا ۲ ساعت بعد از غذا) مصرف شود.',
    clinicalRelevanceEn: 'First-line for cellulitis. Must be taken on an empty stomach (1 hour before or 2 hours after meals).',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-glycopeptide': {
    classCode: 'mech-glycopeptide',
    classNameFa: 'گلیکوپپتیدها (ونکومایسین / مهار D-Ala-D-Ala دیواره باکتری)',
    classNameEn: 'Glycopeptides (Vancomycin)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'آنتی‌بیوتیک باکتریوسید گلیکوپپتیدی علیه گرم مثبت‌های مقاوم',
    actionTypeLabelEn: 'Bactericidal Glycopeptide Antibacterial',
    targetSiteFa: 'پایانه D-Alanyl-D-Alanine در زنجیره‌های پپتیدوگلیکان دیواره باکتری',
    targetSiteEn: 'D-Alanyl-D-Alanine terminal residues of bacterial peptidoglycan',
    cellularEffectFa: 'تشکیل پیوند هیدروژنی با D-Ala-D-Ala، مهار پلیمریزاسیون گلیکان و لیز سریع باکتری‌های گرم مثبت.',
    cellularEffectEn: 'Sterically blocks transglycosylase cross-linking, causing bacterial wall disruption and lysis.',
    descriptionFa: 'درمان عفونت‌های شدید و مقاوم گرم مثبت از جمله MRSA و کولیت با غشای کاذب ناشی از کلستریدیوم دیفیسیل.',
    descriptionEn: 'Essential antibiotic for MRSA infections and severe Clostridioides difficile colitis.',
    clinicalRelevanceFa: 'داروی با پنجره درمانی باریک (NTI). نیازمند پایش سطح سرمی (TDM) و انفوزیون آهسته جهت پیشگیری از سندرم مرد قرمز.',
    clinicalRelevanceEn: 'Strict Narrow Therapeutic Index (NTI). Requires TDM and slow IV infusion (>60 min) to avoid Red Man Syndrome.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-aminoglycoside': {
    classCode: 'mech-aminoglycoside',
    classNameFa: 'آمینوگلیکوزیدها (جنتامایسین / مهار زیرواحد 30S ریبوزوم باکتری)',
    classNameEn: 'Aminoglycosides (Gentamicin)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'آنتی‌بیوتیک باکتریوسید غلظت‌وابسته علیه باسیل‌های گرم منفی',
    actionTypeLabelEn: 'Concentration-Dependent Bactericidal Aminoglycoside',
    targetSiteFa: 'زیرواحد 30S ریبوزوم باکتریایی',
    targetSiteEn: 'Bacterial 30S ribosomal subunit',
    cellularEffectFa: 'ایجاد خطای خواندن در کد ژنتیکی mRNA، تولید پروتئین‌های معیوب و تخریب غشای سلولی باکتری.',
    cellularEffectEn: 'Causes misreading of mRNA genetic code and disrupts bacterial outer membrane integrity.',
    descriptionFa: 'کشتن سریع و غلظت‌وابسته باکتری‌های پاتوژن گرم منفی در سپسیس و عفونت‌های شدید بیمارستانی.',
    descriptionEn: 'Potent concentration-dependent bactericidal action for severe Gram-negative systemic infections.',
    clinicalRelevanceFa: 'داروی با پنجره درمانی باریک (NTI). پایش دقیق غلظت پیک و تراف و ارزیابی عملکرد کلیه جهت پیشگیری از سمیت کلیوی و شنوایی الزامی است.',
    clinicalRelevanceEn: 'Strict NTI requiring TDM. High risk of nephrotoxicity and ototoxicity with elevated trough levels.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-fluoroquinolone': {
    classCode: 'mech-fluoroquinolone',
    classNameFa: 'فلوروکینولون‌ها (سیپروفلوکساسین / مهار DNA جیراز و توپوایزومراز IV)',
    classNameEn: 'Fluoroquinolones (Ciprofloxacin)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'باکتریوسید با مهار همانندسازی DNA باکتری',
    actionTypeLabelEn: 'Bactericidal DNA Gyrase Inhibitor',
    targetSiteFa: 'آنزیم‌های DNA جیراز (توپوایزومراز II) و توپوایزومراز IV باکتریایی',
    targetSiteEn: 'Bacterial DNA Gyrase & Topoisomerase IV',
    cellularEffectFa: 'جلوگیری از سوپرکویلینگ DNA باکتری، ایجاد شکست‌های دو رشته‌ای در DNA و مرگ باکتری.',
    cellularEffectEn: 'Inhibits DNA uncoiling and induces fatal double-stranded DNA breaks.',
    descriptionFa: 'آنتی‌بیوتیک وسیع‌الطیف با نفوذ بافتی عالی جهت درمان عفونت‌های ادراری پیچیده، تنفسی و گوارشی.',
    descriptionEn: 'Broad-spectrum antibacterial targeting Gram-negative and atypical pathogens with high bioavailability.',
    clinicalRelevanceFa: 'عفونت‌های پیچیده ادراری و سودومونا. احتیاط: تداخل کلات‌شدن با آنتی‌اسیدها و آهن؛ خطر تاندونیت آشیل.',
    clinicalRelevanceEn: 'Complex UTIs and Pseudomonas. Chelates with polyvalent cations (Fe/Ca/Mg); tendonitis risk.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-nitroimidazole': {
    classCode: 'mech-nitroimidazole',
    classNameFa: 'نیتروایمیدازول‌ها (مترونیدازول / تخریب ساختار DNA بی‌هوازی‌ها)',
    classNameEn: 'Nitroimidazoles (Metronidazole)',
    actionClassification: 'bactericidal',
    actionTypeLabelFa: 'ضدبی‌هوازی و ضدانگل باکتریوسید',
    actionTypeLabelEn: 'Antianaerobic & Antiprotozoal Bactericidal Agent',
    targetSiteFa: 'پروتئین‌های فرودوکسین باکتری‌های بی‌هوازی و ساختار مارپیچ DNA',
    targetSiteEn: 'Anaerobic ferredoxin electron transport proteins & helical DNA structure',
    cellularEffectFa: 'احیای گروه نیترو به رادیکال‌های آزاد سمی ناپایدار که به مارپیچ DNA متصل شده و رشته‌های آن را می‌کند.',
    cellularEffectEn: 'Reduced intracellularly to toxic nitro radicals that induce fatal DNA strand breakage in anaerobes.',
    descriptionFa: 'ریشه‌کنی اختصاصی باکتری‌های بی‌هوازی و تک‌یاخته‌های بیماری‌زا (تریکوموناس، ژیاردیا، آمیب).',
    descriptionEn: 'Highly effective against anaerobic bacteria (Bacteroides, Clostridioides) and protozoa.',
    clinicalRelevanceFa: 'عفونت‌های دندانی، واژینوز باکتریایی و ژیاردیا. هشدار حیاتی: پرهیز مطلق از الکل تا ۲۴ ساعت پس از قطع دارو (واکنش شبه دی‌سولفیرام).',
    clinicalRelevanceEn: 'Dental infections and anaerobic pelvic infections. Strictly avoid alcohol during and 24h post-therapy.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-barbiturate': {
    classCode: 'mech-barbiturate',
    classNameFa: 'باربیتورات‌ها (تیوپنتال / مدولاتور آلوستریک GABAA)',
    classNameEn: 'Barbiturates (Thiopental Sodium)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'بیهوش‌کننده عمومی و مهارکننده CNS',
    actionTypeLabelEn: 'Ultrashort-Acting General Anaesthetic',
    targetSiteFa: 'گیرنده‌های GABAA در سیستم عصبی مرکزی',
    targetSiteEn: 'Neuronal GABAA receptor chloride ionophore complex',
    cellularEffectFa: 'افزایش مدت‌زمان باز بودن کانال کلراید، هایپرپلاریزاسیون نورونی و فرونشاندن فعالیت قشر مغز.',
    cellularEffectEn: 'Prolongs GABAA chloride channel opening time, hyperpolarizing neuronal membranes.',
    descriptionFa: 'القا سریع بیهوشی عمومی ظرف چند ثانیه و کاهش فشار درون‌جمجمه‌ای.',
    descriptionEn: 'Ultrashort-acting intravenous anaesthetic that rapidly induces loss of consciousness.',
    clinicalRelevanceFa: 'القا بیهوشی و وضعیت صرعی مقاوم. منع مصرف مطلق در پورفیری حاد (تحریک سنتز ALA سنتاز).',
    clinicalRelevanceEn: 'Anaesthetic induction. Absolute contraindication in acute intermittent porphyria.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-antiarrhythmic-class3': {
    classCode: 'mech-antiarrhythmic-class3',
    classNameFa: 'ضد آریتمی‌های کلاس III (آمیودارون / مسدودکننده کانال‌های پتاسیمی)',
    classNameEn: 'Class III Antiarrhythmics (Amiodarone)',
    actionClassification: 'ion_channel_blocker',
    actionTypeLabelFa: 'ضدآریتمی طولانی‌کننده پتانسیل عمل قلب',
    actionTypeLabelEn: 'Class III Antiarrhythmic / Multi-Channel Blocker',
    targetSiteFa: 'کانال‌های پتاسیمی تاخیری (IKr/IKs)، کانال‌های سدیم و گیرنده‌های بتا در قلب',
    targetSiteEn: 'Cardiac voltage-gated potassium channels (IKr) & cardiac myocyte ionophores',
    cellularEffectFa: 'طولانی کردن مدت پتانسیل عمل و دوره تحریک‌ناپذیری موثر دهلیزها و بطن‌ها بدون کاهش شیب هدایت.',
    cellularEffectEn: 'Prolongs action potential duration and refractory period across all cardiac tissues.',
    descriptionFa: 'سرکوب و پیشگیری از آریتمی‌های کشنده بطنی و دهلیزی (فیبریلاسیون دهلیزی و بطنی).',
    descriptionEn: 'Broad-spectrum antiarrhythmic suppressing refractory ventricular and supraventricular arrhythmias.',
    clinicalRelevanceFa: 'داروی با نیمه‌عمر بسیار طولانی (چند هفته). پایش عملکرد تیروئید، کبد، چشم و ریه در مصرف درازمدت الزامی است.',
    clinicalRelevanceEn: 'Extremely long half-life (~50 days). Requires baseline and ongoing thyroid, liver, lung, and eye monitoring.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-dhfr-inhibitor': {
    classCode: 'mech-dhfr-inhibitor',
    classNameFa: 'مهارکننده‌های دی‌هیدروفولات ردوکتاز (متوترکسات / ضد اسید فولیک)',
    classNameEn: 'Dihydrofolate Reductase Inhibitors (Methotrexate / DMARD)',
    actionClassification: 'enzyme_inhibitor',
    actionTypeLabelFa: 'تعدیل‌کننده سیستم ایمنی و ضد روماتیسم (DMARD)',
    actionTypeLabelEn: 'Immunomodulating Antimetabolite / DMARD',
    targetSiteFa: 'آنزیم دی‌هیدروفولات ردوکتاز (DHFR) و آنزیم AICAR ترانسفورمیلاز',
    targetSiteEn: 'Dihydrofolate Reductase (DHFR) & AICAR transformylase',
    cellularEffectFa: 'مهار سنتز تیمیدین و پورین‌ها، تجمع آدنوزین ضدالتهابی خارج‌سلولی و توقف تکثیر لنفوسیت‌های T فعال.',
    cellularEffectEn: 'Inhibits purine/pyrimidine synthesis and increases extracellular anti-inflammatory adenosine.',
    descriptionFa: 'مهار تکثیر سلول‌های التهابی و کنترل بیماری‌های خودایمنی مزمن (آرتریت روماتوئید و پسوریازیس).',
    descriptionEn: 'Gold standard DMARD that attenuates systemic inflammation and joint destruction.',
    clinicalRelevanceFa: 'دوز مصرفی: اکیداً فقط «یک‌بار در هفته»؛ مصرف روزانه کشنده است. تجویز مکمل اسید فولیک در روزهای دیگر الزامی است.',
    clinicalRelevanceEn: 'Strict ONCE-WEEKLY oral dosing. Prescribe folic acid on non-methotrexate days to prevent toxicity.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-progestin-contraceptive': {
    classCode: 'mech-progestin-contraceptive',
    classNameFa: 'پروژستین‌های ضدبارداری (لوونورژسترل / پیشگیری اضطراری)',
    classNameEn: 'Progestin Contraceptives (Levonorgestrel / EHC)',
    actionClassification: 'hormone_replacement',
    actionTypeLabelFa: 'پیشگیری از بارداری و مهار تخمک‌گذاری (Contraceptive)',
    actionTypeLabelEn: 'Emergency Hormonal Contraceptive / Progestin',
    targetSiteFa: 'گیرنده‌های پروژسترون در محور هیپوتالاموس-هیپوفیز و اندومتر رحم',
    targetSiteEn: 'Hypothalamic-pituitary progesterone receptors & cervical endometrium',
    cellularEffectFa: 'مهار ترشح هورمون لوتئینه‌کننده (LH)، به تاخیر انداختن تخمک‌گذاری و غلیظ کردن ترشحات موکوس دهانه رحم.',
    cellularEffectEn: 'Suppresses mid-cycle LH surge to postpone follicular rupture and thickens cervical mucus.',
    descriptionFa: 'پیشگیری اضطراری از بارداری ناخواسته پس از رابطه جنسی محافظت‌نشده ظرف ۷۲ ساعت.',
    descriptionEn: 'Delivers high-dose progestin to reliably prevent ovulation within 72 hours of unprotected intercourse.',
    clinicalRelevanceFa: 'قرص اورژانسی پیشگیری از بارداری (EHC). مصرف در کوتاه‌ترین زمان ممکن حداکثر کارایی را دارد. در صورت استفراغ ظرف ۲ ساعت دوز باید تکرار شود.',
    clinicalRelevanceEn: 'Schedule 3 Pharmacist Only. Take as early as possible within 72h. Repeat dose if vomiting within 2h.',
    colorClass: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
  },

  'mech-sprm': {
    classCode: 'mech-sprm',
    classNameFa: 'تعدیل‌کننده‌های انتخابی گیرنده پروژسترون (یولی‌پریستال / EllaOne)',
    classNameEn: 'Selective Progesterone Receptor Modulators (SPRM / Ulipristal)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'پیشگیری اضطراری از بارداری پیشرفته تا ۱۲۰ ساعت',
    actionTypeLabelEn: 'Selective Progesterone Receptor Modulator (EHC up to 120h)',
    targetSiteFa: 'گیرنده‌های هسته‌ای پروژسترون در فولیکول‌های تخمدانی و آندومتر',
    targetSiteEn: 'Ovarian follicular progesterone receptors',
    cellularEffectFa: 'مهار یا به تاخیر انداختن پارگی فولیکول و تخمک‌گذاری حتی در زمان آغاز ترشح و افزایش پیک LH.',
    cellularEffectEn: 'Inhibits or delays follicular rupture even when LH levels have already started to rise.',
    descriptionFa: 'پیشگیری اضطراری از بارداری تا ۱۲۰ ساعت (۵ روز) پس از رابطه جنسی با کارایی بالاتر در روزهای پایانی.',
    descriptionEn: 'Maintains efficacy for up to 120 hours (5 days) post-coitus by delaying ovulation even after LH surge begins.',
    clinicalRelevanceFa: 'اثربخشی تا ۵ روز بعد از تماس جنسی. در صورت نیاز به ادامه قرص‌های معمول ضدبارداری، باید ۵ روز تا شروع مجدد فاصله انداخته شود.',
    clinicalRelevanceEn: 'Effective up to 120 hours (5 days). Wait 5 days before resuming regular hormonal contraception.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-pgas': {
    classCode: 'mech-pgas',
    classNameFa: 'آنالوگ‌های پروستاگلاندین چشمی (لاتانوپروست / کاهش فشار چشم)',
    classNameEn: 'Ophthalmic Prostaglandin F2α Analogues (Latanoprost)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'کاهنده فشار داخل چشم در گلوکوم (IOP Lowering)',
    actionTypeLabelEn: 'Uveoscleral Outflow Enhancer',
    targetSiteFa: 'گیرنده‌های پروستانوئید FP در عضله مژگانی چشم',
    targetSiteEn: 'Ciliary muscle prostanoid FP receptors',
    cellularEffectFa: 'تعدیل ماتریس متالوروپروتئینازها و افزایش چشمگیر خروج مایع زلالیه از مسیر یووواسکلرال.',
    cellularEffectEn: 'Increases uveoscleral outflow of aqueous humor by remodeling the ciliary extracellular matrix.',
    descriptionFa: 'کاهش مؤثر فشار داخل کره چشم (IOP) جهت پیشگیری از آسیب به عصب بینایی در گلوکوم زاویه باز.',
    descriptionEn: 'First-line therapy for open-angle glaucoma, reducing intraocular pressure safely.',
    clinicalRelevanceFa: 'یک قطره در شب‌ها. عوارض موضعی: تیره شدن رنگ عنبیه، بلند شدن مژه‌ها و پرخونی خفیف ملتحمه.',
    clinicalRelevanceEn: 'Instil once daily at night. Side effects: iris hyperpigmentation and eyelash growth.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-ocular-beta-blocker': {
    classCode: 'mech-ocular-beta-blocker',
    classNameFa: 'بتابلوکرهای موضعی چشمی (تیمولول)',
    classNameEn: 'Ophthalmic Beta-Adrenoceptor Antagonists (Timolol)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'کاهنده تولید مایع زلالیه در گلوکوم',
    actionTypeLabelEn: 'Aqueous Inflow Suppressor',
    targetSiteFa: 'گیرنده‌های بتا-۲ آدرنرژیک اپیتلیوم ترشحی جسم مژگانی چشم',
    targetSiteEn: 'Ciliary body beta-2 adrenoceptors',
    cellularEffectFa: 'مهار ساخت cAMP در اپیتلیوم مژگانی و کاهش ترشح مایع زلالیه به اتاق قدامی چشم.',
    cellularEffectEn: 'Decreases ciliary cAMP production, suppressing aqueous humor synthesis.',
    descriptionFa: 'کاهش فشار داخل کره چشم از طریق کاهش مستقیم تولید مایع زلالیه.',
    descriptionEn: 'Reduces intraocular pressure by decreasing the rate of aqueous humor formation.',
    clinicalRelevanceFa: 'گلوکوم زاویه باز. هشدار: انسداد مجرای اشکی (Punctal occlusion) پس از چکاندن قطره جهت پیشگیری از جذب سیستمیک و اسپاسم تنفسی در آسم الزامی است.',
    clinicalRelevanceEn: 'Apply punctal occlusion for 1-2 min to prevent systemic absorption. Contraindicated in severe asthma.',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },

  'mech-ics-laba': {
    classCode: 'mech-ics-laba',
    classNameFa: 'ترکیب کورتیکواستروئید استنشاقی و برونکودیلاتور طولانی‌اثر (ICS / LABA)',
    classNameEn: 'Inhaled Corticosteroid & Long-Acting Beta-2 Agonist (ICS/LABA)',
    actionClassification: 'anti_inflammatory',
    actionTypeLabelFa: 'پیشگیری‌کننده و کنترل‌کننده آسم و COPD',
    actionTypeLabelEn: 'Maintenance & Reliever Inhaled Combination',
    targetSiteFa: 'گیرنده‌های گلوکوکورتیکوئید و گیرنده‌های بتا-۲ آدرنرژیک در عضلات صاف مجاری تنفسی',
    targetSiteEn: 'Bronchial smooth muscle beta-2 receptors & mucosal glucocorticoid receptors',
    cellularEffectFa: 'سرکوب التهاب ائوزینوفیلی مجاری تنفسی همراه با شل کردن مداوم عضلات صاف برونش برای بیش از ۱۲ ساعت.',
    cellularEffectEn: 'Suppresses airway inflammation and provides sustained 12-24h bronchodilation.',
    descriptionFa: 'کنترل پایدار آسم و COPD و پیشگیری از حملات حاد تنگی نفس و کاهش نیاز به بستری.',
    descriptionEn: 'Gold standard maintenance and preventer therapy for moderate-to-severe asthma and COPD.',
    clinicalRelevanceFa: 'شستشوی دهان و غرغره با آب پس از هر بار استنشاق جهت پیشگیری از برفک دهانی و خشونت صدا الزامی است.',
    clinicalRelevanceEn: 'Rinse mouth and gargle with water after inhalation to prevent oral candidiasis and dysphonia.',
    colorClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
  },

  'mech-laba': {
    classCode: 'mech-laba',
    classNameFa: 'آگونیست‌های بتا-۲ طولانی‌اثر (LABA)',
    classNameEn: 'Long-Acting Beta-2 Agonists (LABA)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'گشادکننده طولانی‌مدت برونش (Long-acting Bronchodilator)',
    actionTypeLabelEn: 'Long-acting Bronchodilator',
    targetSiteFa: 'گیرنده‌های بتا-۲ آدرنرژیک عضلات صاف ریه',
    targetSiteEn: 'Bronchial smooth muscle Beta-2 adrenoceptors',
    cellularEffectFa: 'اتصال پایدار و لیپوفیل به اگزوسایت گیرنده بتا-۲ و گشادی مداوم مجاری تنفسی به مدت حداقل ۱۲ ساعت.',
    cellularEffectEn: 'Lipophilic side-chain anchors to beta-2 exosite, providing sustained >12h relaxation.',
    descriptionFa: 'گشاد نگه داشتن مجاری هوایی و پیشگیری از تنگی نفس شبانه در آسم و انسداد مزمن ریه (COPD).',
    descriptionEn: 'Provides prolonged bronchodilation for maintenance therapy in chronic respiratory disease.',
    clinicalRelevanceFa: 'در آسم هرگز نباید به عنوان تک‌دارو مصرف شود (باید حتماً همراه با کورتون استنشاقی ICS باشد).',
    clinicalRelevanceEn: 'Never use as monotherapy in asthma; must always be co-prescribed with an ICS.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-nitrates': {
    classCode: 'mech-nitrates',
    classNameFa: 'نیترات‌های آلی (گلیسریل تری‌نیترات / نیتروگلیسیرین)',
    classNameEn: 'Organic Nitrates (Glyceryl Trinitrate / GTN)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'گشادکننده عروق کرونر و وریدی (Antianginal Vasodilator)',
    actionTypeLabelEn: 'Coronary & Venous Vasodilator',
    targetSiteFa: 'آنزیم میتوکندریایی آلدهید دهیدروژناز (ALDH2) و گوانیلات سیکلاز محلول (sGC)',
    targetSiteEn: 'Mitochondrial ALDH2 & soluble guanylyl cyclase (sGC)',
    cellularEffectFa: 'آزادسازی نیتریک اکسید (NO)، افزایش cGMP داخل سلولی، اتساع وریدی و کاهش پیش‌بار قلب و مصرف اکسیژن میوکارد.',
    cellularEffectEn: 'Donates nitric oxide (NO) to activate cGMP, causing venodilation and reduced cardiac preload.',
    descriptionFa: 'تسکین فوری درد قفسه سینه در آنژین صدری از طریق کاهش فشار روی قلب و گشادی عروق کرونر.',
    descriptionEn: 'Rapid sublingual relief of acute angina by reducing myocardial oxygen demand and dilating collaterals.',
    clinicalRelevanceFa: 'اسپری یا قرص زیرزبانی در حالت نشسته مصرف شود. منع مصرف مطلق و کشنده با مهارکننده‌های PDE5 (سیلدنافیل/تادالافیل).',
    clinicalRelevanceEn: 'Use sublingually while seated. Absolute fatal contraindication with PDE5 inhibitors (Viagra/Cialis).',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-antitussive': {
    classCode: 'mech-antitussive',
    classNameFa: 'ضدسرفه‌های مرکزی (دکسترومتورفان)',
    classNameEn: 'Central Antitussives (Dextromethorphan)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'سرکوب‌کننده مرکز سرفه (Cough Suppressant)',
    actionTypeLabelEn: 'Central Cough Suppressant / Sigma-1 Agonist',
    targetSiteFa: 'گیرنده‌های سیگما-۱ و مرکز سرفه در بصل‌النخاع مغز',
    targetSiteEn: 'Medullary cough center Sigma-1 receptors',
    cellularEffectFa: 'افزایش آستانه تحریک مرکز سرفه در مغز و مهار انتقال سیگنال‌های واگال سرفه خشک.',
    cellularEffectEn: 'Elevates the sensory threshold of the medullary cough center to attenuate dry non-productive cough.',
    descriptionFa: 'تسکین و قطع سرفه‌های خشک، تحریکی و آزاردهنده بدون اثرات خواب‌آلودگی شدید یا سرکوب تنفسی.',
    descriptionEn: 'Suppresses dry hacking cough spasms by acting directly on central brainstem centers.',
    clinicalRelevanceFa: 'سرفه‌های خشک و آزاردهنده سرماخوردگی. در سرفه‌های خلط‌دار یا همراه با مهارکننده‌های MAOI منع مصرف دارد.',
    clinicalRelevanceEn: 'Indicated for dry irritating cough. Contraindicated with MAOIs or in productive chesty cough.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-stool-softener': {
    classCode: 'mech-stool-softener',
    classNameFa: 'نرم‌کننده‌های مدفوع و سرومنولیتیک (دوکوزات سدیم)',
    classNameEn: 'Stool Softeners & Cerumenolytics (Docusate Sodium)',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'سورفکتانت آنیونی کاهنده کشش سطحی (Surfactant)',
    actionTypeLabelEn: 'Anionic Surfactant Stool Softener & Ear Wax Drops',
    targetSiteFa: 'کشش سطحی لایه چربی و آب در مدفوع و جرم گوش (Cerumen)',
    targetSiteEn: 'Fecal lipid-water interface and auditory canal cerumen',
    cellularEffectFa: 'کاهش کشش سطحی، تسهیل نفوذ آب و چربی به توده خشک مدفوع یا جرم گوش و نرم ساختن آن.',
    cellularEffectEn: 'Lowers surface tension to allow water and lipids to penetrate and soften hard fecal or cerumen masses.',
    descriptionFa: 'جلوگیری از زور زدن هنگام دفع در هموروئید و رفع گرفتگی و نرم کردن جرم گوش.',
    descriptionEn: 'Facilitates gentle bowel evacuation and disintegrates impacted cerumen plugs in ears.',
    clinicalRelevanceFa: 'ملین بدون تحریک روده برای بعد از جراحی و هموروئید؛ قطره گوش دوکوزات برای رفع جرم فشرده قبل از شستشو.',
    clinicalRelevanceEn: 'Ideal for post-operative recovery and hemorrhoids. Ear drops soften impacted wax.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-zoster-vaccine': {
    classCode: 'mech-zoster-vaccine',
    classNameFa: 'واکسن نوترکیب زیرواحد زوستر (Shingrix / ادجوانت AS01B)',
    classNameEn: 'Recombinant Varicella Zoster Subunit Vaccine',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'تحریک ایمنی اختصاصی ضد ویروس زوستر (Immunisation)',
    actionTypeLabelEn: 'Recombinant Subunit Vaccine / Immunostimulant',
    targetSiteFa: 'لنفوسیت‌های T کمکی CD4+ و سلول‌های B ترشح‌کننده آنتی‌بادی',
    targetSiteEn: 'Host CD4+ T-lymphocytes & antibody-producing B cells',
    cellularEffectFa: 'القای پاسخ ایمنی سلولی قدرتمند و پایدار علیه گلیکوپروتئین E ویروس واریسلا زوستر (VZV).',
    cellularEffectEn: 'Induces robust, long-lasting gE-specific cellular and humoral immunity against VZV reactivation.',
    descriptionFa: 'پیشگیری موثر از بیماری زونا و درد مزمن عصبی پس از زونا (Post-herpetic Neuralgia) در بزرگسالان بالای ۵۰ سال.',
    descriptionEn: 'High-efficacy prevention of herpes zoster (shingles) and post-herpetic neuralgia in adults 50+.',
    clinicalRelevanceFa: 'تزریق عضلانی دو دوز به فاصله ۲ تا ۶ ماه. واکسن غیرزنده است و در افراد با نقص ایمنی نیز قابل استفاده است.',
    clinicalRelevanceEn: '2-dose intramuscular schedule (months 0 and 2-6). Safe in immunocompromised patients.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-iron': {
    classCode: 'mech-iron',
    classNameFa: 'املاح آهن و کمپلکس پلی‌مالتوز (خون‌ساز / درمان کم‌خونی)',
    classNameEn: 'Oral Iron Salts & Iron Polymaltose Complex (Hematinic)',
    actionClassification: 'hormone_replacement',
    actionTypeLabelFa: 'جایگزین عنصر آهن و ساخت هموگلوبین (Hematinic)',
    actionTypeLabelEn: 'Essential Mineral / Hemoglobin Precursor',
    targetSiteFa: 'مغز استخوان و پیش‌سازهای اریتروئید در فرآیند اریتروپوئز',
    targetSiteEn: 'Bone marrow erythroid precursors and ferritin storage depots',
    cellularEffectFa: 'ترکیب با پروتوپورفیرین IX جهت تشکیل گروه هِم و ساخت هموگلوبین، میوگلوبین و آنزیم‌های سیتوکروم.',
    cellularEffectEn: 'Incorporated into protoporphyrin IX to synthesize functional heme, hemoglobin and cytochromes.',
    descriptionFa: 'جبران کمبود آهن، پر کردن ذخایر فریتین و درمان کم‌خونی فقر آهن (Iron Deficiency Anemia).',
    descriptionEn: 'Replenishes systemic iron stores and restores oxygen transport capacity in iron deficiency.',
    clinicalRelevanceFa: 'همراه با ویتامین C جذب آهن فروس بیشتر می‌شود. کمپلکس پلی‌مالتوز (Maltofer) عوارض گوارشی کمتری دارد.',
    clinicalRelevanceEn: 'Take with Vitamin C to enhance absorption. Maltofer provides lower GI irritation.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-magnesium': {
    classCode: 'mech-magnesium',
    classNameFa: 'یون منیزیم و کلات‌های آمینواسیدی (کوفاکتور آنزیمی و شل‌کننده عضلانی)',
    classNameEn: 'Magnesium Amino Acid Chelates (Enzyme Cofactor)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'تعدیل‌کننده انقباض عضلانی و عملکرد عصبی',
    actionTypeLabelEn: 'Neuromuscular Modulator & Cofactor',
    targetSiteFa: 'بیش از ۳۰۰ سیستم آنزیمی وابسته به ATP و کانال‌های کلسیمی و NMDA نورونی',
    targetSiteEn: 'ATP-dependent enzymatic pathways, NMDA channels and calcium transporters',
    cellularEffectFa: 'بلوک فیزیولوژیک کانال‌های کلسیم و NMDA، کاهش تحریک‌پذیری عصبی-عضلانی و ریلکسیشن عضلات صاف و اسکلتی.',
    cellularEffectEn: 'Acts as natural calcium antagonist, regulating muscle contraction and neuronal excitability.',
    descriptionFa: 'رفع گرفتگی عضلات، بهبود کیفیت خواب و حمایت از عملکرد سیستم عصبی در خستگی مزمن.',
    descriptionEn: 'Relieves muscle cramps, supports muscle relaxation and maintains nervous system function.',
    clinicalRelevanceFa: 'ملح بیس‌گلیسینات جذب بالاتری دارد و کمترین عارضه گوارشی (اسهال) را ایجاد می‌کند.',
    clinicalRelevanceEn: 'Chelated bisglycinate offers superior absorption with minimal laxative side effects.',
    colorClass: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },

  'mech-vitamins-d-b12': {
    classCode: 'mech-vitamins-d-b12',
    classNameFa: 'ویتامین‌های D3 و B12 (تنظیم هومئوستاز کلسیم و متیلاسیون سلولی)',
    classNameEn: 'Vitamins D3 & B12 (Cellular Cofactors)',
    actionClassification: 'hormone_replacement',
    actionTypeLabelFa: 'ویتامین‌های ضروری سلامت استخوان و سیستم عصبی',
    actionTypeLabelEn: 'Essential Metabolic Vitamins',
    targetSiteFa: 'گیرنده‌های هسته‌ای ویتامین D (VDR) در روده و آنزیم متیونین سنتاز در سلول‌های عصبی',
    targetSiteEn: 'Intestinal nuclear VDR receptors & neuronal methionine synthase',
    cellularEffectFa: 'افزایش جذب روده‌ای کلسیم و فسفات توسط D3؛ ساخت غلاف میلین اعصاب و سنتز DNA توسط B12.',
    cellularEffectEn: 'Promotes intestinal calcium absorption and maintains neuronal myelin sheath synthesis.',
    descriptionFa: 'حفظ تراکم استخوان، پیشگیری از پوکی استخوان و حفظ سلامت اعصاب و خون‌سازی.',
    descriptionEn: 'Essential for bone mineralization, hematopoiesis, and nervous system integrity.',
    clinicalRelevanceFa: 'ویتامین D محلول در چربی است و بهتر است همراه با غذای حاوی چربی میل شود.',
    clinicalRelevanceEn: 'Take Vitamin D with a fat-containing meal for optimal absorption.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-folate': {
    classCode: 'mech-folate',
    classNameFa: 'اسید فولیک (ویتامین B9 / کوفاکتور سنتز DNA و تکثیر سلولی)',
    classNameEn: 'Folic Acid (Vitamin B9 / DNA Synthesis Cofactor)',
    actionClassification: 'hormone_replacement',
    actionTypeLabelFa: 'پیشگیری از نقایص لوله عصبی جنین (Neural Tube Defect Prevention)',
    actionTypeLabelEn: 'Essential Folate Cofactor',
    targetSiteFa: 'آنزیم‌های چرخه انتقال یک‌کربنه و سنتز بازهای پورین و تیمیدین DNA',
    targetSiteEn: 'Cellular one-carbon transfer enzymes & thymidylate synthase',
    cellularEffectFa: 'تامین گروه‌های متیل برای سنتز DNA و تقسیم طبیعی سلول‌های جنینی و خون‌ساز.',
    cellularEffectEn: 'Supplies one-carbon units for purine/thymidine biosynthesis and fetal neural crest development.',
    descriptionFa: 'پیشگیری از نقایص لوله عصبی جنین (اسپینا بیفیدا) و درمان کم‌خونی مگالوبلاستیک.',
    descriptionEn: 'Essential peri-conceptional nutrient to prevent neural tube defects and megaloblastic anemia.',
    clinicalRelevanceFa: 'مصرف ۵۰۰ میکروگرم روزانه از حداقل ۱ ماه قبل از بارداری تا انتهای سه ماهه اول الزامی است.',
    clinicalRelevanceEn: 'Take 500mcg daily at least 1 month prior to conception through the 1st trimester.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-st-johns-wort': {
    classCode: 'mech-st-johns-wort',
    classNameFa: 'عصاره علف چای (هایپرفورین / هایپریسین / مهار بازجذب منوآمین‌ها)',
    classNameEn: 'St John’s Wort Extract (Hypericum perforatum)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'ضدافسردگی گیاهی و القاکننده قوی CYP3A4',
    actionTypeLabelEn: 'Herbal Monoamine Modulator & Potent CYP3A4 Inducer',
    targetSiteFa: 'ناقل‌های بازجذب سروتونین، نورآدرنالین، دوپامین و گیرنده PXR کبدی',
    targetSiteEn: 'Neuronal monoamine transporters (SERT/NET/DAT) & Hepatic PXR',
    cellularEffectFa: 'مهار غیراختصاصی بازجذب نوروترانسمیترها در مغز همراه با القای شدید آنزیم سیتوکروم CYP3A4 و P-gp در کبد و روده.',
    cellularEffectEn: 'Inhibits monoamine reuptake while potently upregulating CYP3A4 and P-glycoprotein efflux pumps.',
    descriptionFa: 'تسکین افسردگی خفیف تا متوسط؛ دارای شدیدترین تداخلات دارویی در میان مکمل‌های گیاهی.',
    descriptionEn: 'Herbal antidepressant with profound pharmacokinetic enzyme induction risks.',
    clinicalRelevanceFa: 'هشدار حیاتی: کاهش شدید سطح خونی داروهای ضدبارداری (OCP)، وارفارین، سیکلوسپورین، دیگوکسین و ریسک سندرم سروتونین با SSRIs.',
    clinicalRelevanceEn: 'High interaction risk: reduces efficacy of OCPs, warfarin, cyclosporin, and causes serotonin syndrome with SSRIs.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-ginkgo': {
    classCode: 'mech-ginkgo',
    classNameFa: 'عصاره برگ جینکو بیلوبا (EGb 761 / مهار PAF و آنتی‌اکسیدان)',
    classNameEn: 'Ginkgo Biloba Extract (EGb 761)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'بهبود گردش خون محیطی و مغزی',
    actionTypeLabelEn: 'Circulatory Modulator & PAF Antagonist',
    targetSiteFa: 'گیرنده‌های فاکتور فعال‌کننده پلاکت (PAF) و رادیکال‌های آزاد اندوتلیوم عروق',
    targetSiteEn: 'Platelet-Activating Factor (PAF) receptors & vascular endothelium',
    cellularEffectFa: 'مهار تجمع پلاکتی ناشی از PAF، کاهش ویسکوزیته خون، محافظت از نورون‌ها در برابر استرس اکسیداتیو و اتساع میکروسیرکولاسیون.',
    cellularEffectEn: 'Antagonizes PAF, scavenges free radicals and enhances peripheral microvascular perfusion.',
    descriptionFa: 'حمایت از عملکرد شناختی، حافظه و بهبود علائم اختلال گردش خون محیطی (سردی دست و پا).',
    descriptionEn: 'Improves peripheral microcirculation and provides neuroprotective free radical scavenging.',
    clinicalRelevanceFa: 'احتیاط در مصرف همزمان با داروهای ضدانعقاد و ضدپلاکت (وارفارین، آسپرین) به دلیل افزایش خطر خونریزی.',
    clinicalRelevanceEn: 'Caution with anticoagulants and antiplatelets due to increased bleeding risk.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-cranberry': {
    classCode: 'mech-cranberry',
    classNameFa: 'پروآنتوسیانیدین‌های عصاره کرنبری (PAC-A / ضدچسبندگی باکتری به مثانه)',
    classNameEn: 'Cranberry Proanthocyanidins (PAC Type-A / Anti-Adhesion)',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'ضدچسبندگی باکتری در مجاری ادراری (Anti-adherence)',
    actionTypeLabelEn: 'Bacterial Anti-Adhesion Agent',
    targetSiteFa: 'فیمبریه‌های نوع ۱ و نوع P در باکتری اشریشیا کلی (Uropathogenic E. coli)',
    targetSiteEn: 'P-fimbriae of uropathogenic Escherichia coli (UPEC)',
    cellularEffectFa: 'اتصال انتخابی به فیمبریه‌های باکتری E. coli و مهار چسبیدن آن به سلول‌های اپیتلیوم مخاط مثانه.',
    cellularEffectEn: 'Binds P-fimbriae to block UPEC adhesion to uroepithelial cell receptors.',
    descriptionFa: 'پیشگیری از عود عفونت‌های مجاری ادراری (سیستیت) با شسته‌شدن باکتری‌ها در جریان ادرار.',
    descriptionEn: 'Prevents recurrent urinary tract infections by promoting mechanical bacterial clearance.',
    clinicalRelevanceFa: 'پیشگیری از عفونت ادراری مکرر. جایگزین آنتی‌بیوتیک در عفونت فعال حاد کلیه یا مثانه نیست.',
    clinicalRelevanceEn: 'For prophylaxis of recurrent cystitis; not a substitute for antibiotics in acute infection.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-probiotics': {
    classCode: 'mech-probiotics',
    classNameFa: 'پروبیوتیک‌ها (لاکتوباسیلوس و بیفیدوباکتریوم / ترمیم فلور میکروبی)',
    classNameEn: 'Probiotics (Lactobacillus & Bifidobacterium)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'ترمیم فلور طبیعی روده و مهار پاتوژن‌ها',
    actionTypeLabelEn: 'Gut Microbiome Restorative',
    targetSiteFa: 'مخاط پوششی روده و اکوسیستم میکروبیوم گوارش',
    targetSiteEn: 'Intestinal mucosal barrier and luminal gut microbiota',
    cellularEffectFa: 'تولید اسید لاکتیک و اسیدهای چرب کوتاه‌زنجیر (SCFA)، کاهش pH لومن، تولید باکتریوسین و تقویت اتصالات محکم مخاطی.',
    cellularEffectEn: 'Lowers luminal pH, secretes antimicrobial bacteriocins and reinforces epithelial tight junctions.',
    descriptionFa: 'بهبود علائم سندرم روده تحریک‌پذیر (IBS) و پیشگیری از اسهال ناشی از مصرف آنتی‌بیوتیک.',
    descriptionEn: 'Restores healthy microbial balance, reducing antibiotic-associated diarrhea and IBS discomfort.',
    clinicalRelevanceFa: 'در صورت مصرف همزمان با آنتی‌بیوتیک، حداقل ۲ تا ۳ ساعت فاصله زمانی رعایت شود.',
    clinicalRelevanceEn: 'Space at least 2-3 hours apart from oral antibiotic doses.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-glucosamine': {
    classCode: 'mech-glucosamine',
    classNameFa: 'گلوکوزآمین سولفات (پیش‌ساز سنتز گلیکوزآمینوگلیکان‌های غضروف)',
    classNameEn: 'Glucosamine Sulfate (Cartilage Matrix Precursor)',
    actionClassification: 'modulator',
    actionTypeLabelFa: 'محافظت از غضروف مفصلی در آرتروز (Chondroprotective)',
    actionTypeLabelEn: 'Cartilage Chondroprotective Precursor',
    targetSiteFa: 'کندروسیت‌های غضروف مفصلی و مایع سینوویال',
    targetSiteEn: 'Articular chondrocytes & synovial extracellular matrix',
    cellularEffectFa: 'فراهم ساختن سوبسترای بیوسنتز گلیکوزآمینوگلیکان‌ها، پروتئوگلیکان‌ها و هیالورونان در ماتریکس غضروف.',
    cellularEffectEn: 'Serves as building block for glycosaminoglycan and proteoglycan cartilage synthesis.',
    descriptionFa: 'کاهش تخریب غضروف و تسکین درد و خشکی مفاصل در آرتروز خفیف تا متوسط زانو.',
    descriptionEn: 'Supplements essential cartilage matrix building blocks to support joint mobility in osteoarthritis.',
    clinicalRelevanceFa: 'ملح سولفات شواهد بالینی بهتری دارد. در افراد با حساسیت شدید به صدف/سخت‌پوستان دریایی احتیاط شود.',
    clinicalRelevanceEn: 'Sulfate formulation preferred. Caution in severe shellfish allergy.',
    colorClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },

  'mech-minoxidil': {
    classCode: 'mech-minoxidil',
    classNameFa: 'ماینوکسیدیل موضعی ۵٪ (بازکننده کانال پتاسیم / محرک رشد مو)',
    classNameEn: 'Topical Minoxidil (KATP Channel Opener / Hair Stimulator)',
    actionClassification: 'ion_channel_blocker',
    actionTypeLabelFa: 'محرک فاز آناژن و خون‌رسانی فولیکول مو (Hair Growth Stimulant)',
    actionTypeLabelEn: 'Follicular Vascular & Anagen Stimulant',
    targetSiteFa: 'کانال‌های پتاسیمی حساس به ATP عروق پوست سر و سلول‌های پاپیلای درمال فولیکول مو',
    targetSiteEn: 'ATP-sensitive K+ channels in scalp arterioles & follicular dermal papillae',
    cellularEffectFa: 'افزایش خون‌رسانی موضعی، القای فاکتور رشد اندوتلیال عروقی (VEGF) و طولانی کردن فاز رشد فعال (آناژن) مو.',
    cellularEffectEn: 'Opens KATP channels, enhances scalp microcirculation and prolongs follicular anagen growth phase.',
    descriptionFa: 'درمان ریزش موی آندروژنیک (طاسی با الگوی مردانه و زنانه) و افزایش ضخامت و تراکم تارهای مو.',
    descriptionEn: 'Clinically proven topical therapy to stimulate hair follicle regrowth in androgenetic alopecia.',
    clinicalRelevanceFa: 'مصرف مداوم روزانه روی پوست سر کاملاً خشک. ریزش اولیه در ۲ تا ۶ هفته اول طبیعی و نشانه ورود به فاز رشد جدید است.',
    clinicalRelevanceEn: 'Apply twice daily to dry scalp. Initial shedding in weeks 2-6 is normal (telogen shedding).',
    colorClass: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },

  'mech-chloramphenicol': {
    classCode: 'mech-chloramphenicol',
    classNameFa: 'کلرامفنیکل چشمی (مهارکننده سنتز پروتئین باکتری / اتصال به 50S)',
    classNameEn: 'Ophthalmic Chloramphenicol (50S Ribosomal Inhibitor)',
    actionClassification: 'bacteriostatic',
    actionTypeLabelFa: 'آنتی‌بیوتیک باکتریواستاتیک وسیع‌الطیف چشمی',
    actionTypeLabelEn: 'Broad-Spectrum Ophthalmic Antibacterial',
    targetSiteFa: 'زیرواحد 50S ریبوزوم باکتریایی و آنزیم پپتیدیل ترانسفراز',
    targetSiteEn: 'Bacterial 50S ribosomal subunit & peptidyl transferase',
    cellularEffectFa: 'مهار انتقال پپتیدیل و جلوگیری از طویل‌سازی زنجیره پلی‌پپتیدی پروتئین‌های باکتری.',
    cellularEffectEn: 'Inhibits peptidyl transferase to arrest bacterial protein synthesis.',
    descriptionFa: 'درمان خط اول کنژنکتیویت حاد چرکی باکتریایی (Bacterial Conjunctivitis) در چشم.',
    descriptionEn: 'First-line topical treatment for acute bacterial conjunctivitis and surface eye infections.',
    clinicalRelevanceFa: 'قطره یا پماد چشمی. نگهداری در یخچال (۲ تا ۸ درجه)؛ پس از باز شدن حداکثر ۴ هفته قابل استفاده است.',
    clinicalRelevanceEn: 'Store in refrigerator (2-8°C). Discard 28 days after opening.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-naloxone': {
    classCode: 'mech-naloxone',
    classNameFa: 'نالوکسان هیدروکلراید (آنتاگونیست خالص گیرنده‌های مو-اپیوئید / پادزهر اورژانس)',
    classNameEn: 'Naloxone Hydrochloride (Pure Opioid Antagonist / Emergency Antidote)',
    actionClassification: 'receptor_antagonist',
    actionTypeLabelFa: 'پادزهر اورژانس مسمومیت و دپرسیون تنفسی اپیوئیدها',
    actionTypeLabelEn: 'Emergency Opioid Antidote / MOR Antagonist',
    targetSiteFa: 'گیرنده‌های مو (MOR)، کاپا (KOR) و دلتا (DOR) در سیستم عصبی مرکزی',
    targetSiteEn: 'Central Mu (MOR), Kappa (KOR) and Delta (DOR) opioid receptors',
    cellularEffectFa: 'جدا کردن فوری مولکول‌های اپیوئید از گیرنده‌های مو، بازگشت هدایت تنفسی بصل‌النخاع و هوشیاری بیمار ظرف ۲ تا ۵ دقیقه.',
    cellularEffectEn: 'Competitively displaces opioids from MOR receptors, rapidly restoring respiratory drive.',
    descriptionFa: 'درمان اورژانسی نجات‌بخش در اوردوز و تنگی نفس حاد کشنده ناشی از مصرف مورفین، اکسی‌کدون، متادون و هروئین.',
    descriptionEn: 'First-line emergency antidote for reversing opioid-induced life-threatening respiratory depression.',
    clinicalRelevanceFa: 'اسپری بینی Nyxoid یا آمپول تزریقی (برنامه دسترسی رایگان استرالیا). نیمه‌عمر نالوکسان کوتاه‌تر از اکثر اپیوئیدهاست و تماس با اورژانس (000) الزامی است.',
    clinicalRelevanceEn: 'Nyxoid nasal spray. Call 000 immediately; naloxone duration is shorter than most opioids.',
    colorClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },

  'mech-glucagon-antidote': {
    classCode: 'mech-glucagon-antidote',
    classNameFa: 'گلوکاگون تزریقی (پادزهر مسمومیت بتابلوکرها و CCB / افزایش cAMP مستقل از بتا)',
    classNameEn: 'Glucagon (Beta-Blocker / CCB Toxicity Antidote)',
    actionClassification: 'receptor_agonist',
    actionTypeLabelFa: 'پادزهر اینوتروپ مثبت مستقل از گیرنده بتا',
    actionTypeLabelEn: 'Inotropic Antidote / Non-Adrenergic cAMP Activator',
    targetSiteFa: 'گیرنده‌های اختصاصی گلوکاگون در غشای سلول‌های عضلانی قلب (میوکارد)',
    targetSiteEn: 'Myocardial specific glucagon G-protein coupled receptors',
    cellularEffectFa: 'فعال‌سازی آدنیلات سیکلاز و افزایش cAMP درون‌سلولی میوکارد بدون نیاز به اتصال به گیرنده‌های بتا آدرنرژیک مسدودشده.',
    cellularEffectEn: 'Directly stimulates adenylyl cyclase via Gs protein, bypassing blocked beta-adrenoceptors to raise cAMP.',
    descriptionFa: 'افزایش ضربان قلب و قدرت انقباضی میوکارد در مسمومیت شدید و شوک ناشی از اوردوز بتابلوکرها و مسدودکننده‌های کانال کلسیم.',
    descriptionEn: 'Restores cardiac chronotropy and inotropy in severe beta-blocker and calcium channel blocker overdoses.',
    clinicalRelevanceFa: 'پادزهر بیمارستانی خط اول برادی‌کاردی و کلاپس قلبی ناشی از اوردوز مسدودکننده‌های بتا و کلسیم.',
    clinicalRelevanceEn: 'Emergency inotrope for beta-blocker/CCB overdose refractory to atropine.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },

  'mech-bicarbonate-alkalinisation': {
    classCode: 'mech-bicarbonate-alkalinisation',
    classNameFa: 'بی‌کربنات سدیم (قلیایی‌سازی ادرار و پلاسما / به دام انداختن یونی سالیسیلات‌ها)',
    classNameEn: 'Sodium Bicarbonate (Urinary Alkalinisation & Ion Trapping)',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'قلیایی‌کننده پلاسما و افزایش دفع کلیوی اسیدهای ضعیف',
    actionTypeLabelEn: 'Systemic Alkaliniser / Salicylate Clearance Accelerator',
    targetSiteFa: 'لوله‌های کلیوی و مایع خارج سلولی پلاسما',
    targetSiteEn: 'Renal tubular lumen and extracellular plasma compartment',
    cellularEffectFa: 'افزایش pH ادرار (>7.5)، تبدیل اسید سالیسیلیک به فرم یونیزه باردار (Salicylate-)، مهار بازجذب توبولار و دفع سریع کلیوی.',
    cellularEffectEn: 'Elevates urinary pH to ionize weak acids (salicylates), preventing tubular reabsorption and accelerating clearance.',
    descriptionFa: 'درمان اورژانسی مسمومیت حاد با آسپرین و سالیسیلات‌ها از طریق فرآیند Ion Trapping در کلیه‌ها.',
    descriptionEn: 'Emergency treatment for salicylate poisoning that forces renal excretion via urinary ion trapping.',
    clinicalRelevanceFa: 'پروتکل اورژانس مسمومیت با آسپرین. پایش همزمان پتاسیم سرم و گازهای خونی شریانی (ABG) الزامی است.',
    clinicalRelevanceEn: 'Critical for moderate-to-severe salicylate toxicity. Monitor arterial blood gases and potassium.',
    colorClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },

  'mech-emollient': {
    classCode: 'mech-emollient',
    classNameFa: 'امولینت‌ها و سرامیدها (سد محافظ چربی و ترمیم هیدراتاسیون پوست)',
    classNameEn: 'Emollients & Barrier Repair Lipids (Ceramides / Glycerol)',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'ترمیم سد دفاعی پوست و آبرسانی لایه شاخی',
    actionTypeLabelEn: 'Epidermal Barrier Restorative',
    targetSiteFa: 'لایه شاخی اپیدرم (Stratum Corneum) و اتصالات بین‌سلولی پوست',
    targetSiteEn: 'Stratum corneum intercellular lipid matrix',
    cellularEffectFa: 'ایجاد لایه انسدادی هیدروفوبیک، کاهش تبخیر نامحسوس آب (TEWL) و بازسازی ماتریکس سرامید و اسیدهای چرب پوست.',
    cellularEffectEn: 'Forms an occlusive lipid film, reducing transepidermal water loss (TEWL) and restoring skin barrier integrity.',
    descriptionFa: 'درمان پایه اگزما، درماتیت و خشکی شدید پوست با حفظ رطوبت و جلوگیری از نفوذ آلرژن‌ها و محرک‌ها.',
    descriptionEn: 'Foundational daily management for atopic eczema and xerosis, locking in moisture and shielding from irritants.',
    clinicalRelevanceFa: 'پایه اصلی درمان اگزما؛ استفاده سخاوتمندانه بلافاصله پس از استحمام (ظرف ۳ دقیقه) جهت حبس رطوبت پوست.',
    clinicalRelevanceEn: 'Apply generously within 3 minutes of bathing to trap moisture. Essential for eczema management.',
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  },

  'mech-sunscreen': {
    classCode: 'mech-sunscreen',
    classNameFa: 'فیلترهای ضدآفتاب وسیع‌الطیف SPF 50+ (جذب و بازتاب اشعه‌های UV-A و UV-B)',
    classNameEn: 'Broad-Spectrum Therapeutic Sunscreen SPF 50+',
    actionClassification: 'neutralizer',
    actionTypeLabelFa: 'سپر فوتوپروتکتیو محافظت از DNA پوست در برابر اشعه فرابنفش',
    actionTypeLabelEn: 'Broad-Spectrum Photoprotective Barrier',
    targetSiteFa: 'سطح اپیدرم پوست در برابر فوتون‌های تابشی نور خورشید (۲۹۰ تا ۴۰۰ نانومتر)',
    targetSiteEn: 'Skin epidermal surface against solar UV-A and UV-B radiation',
    cellularEffectFa: 'جذب فوتون‌های پرانرژی UV و تبدیل آن به گرمای بی‌ضرر و بازتاب امواج ماوراء بنفش جهت جلوگیری از ایجاد دایمرهای تیمین در DNA سلولی.',
    cellularEffectEn: 'Absorbs and scatters UV photons, preventing DNA thymine dimer mutations and photoaging.',
    descriptionFa: 'پیشگیری از سرطان‌های پوست (ملانوما، BCC، SCC)، آفتاب‌سوختگی حاد و پیری زودرس ناشی از نور خورشید.',
    descriptionEn: 'High-level protection against skin cancers, solar keratosis, sunburn and premature photoaging.',
    clinicalRelevanceFa: '۲۰ دقیقه قبل از خروج به مقدار کافی (یک قاشق چای‌خوری برای هر اندام) مالیده شود و هر ۲ ساعت تجدید گردد.',
    clinicalRelevanceEn: 'Apply liberally 20 minutes before sun exposure; reapply every 2 hours and after swimming.',
    colorClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
};

/**
 * Fallback generator that produces an accurate, medically sound mechanism
 * profile for any product based on its generic name or therapeutic context.
 */
export function getProductMechanism(product: {
  id: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  subcategoryId?: string;
}): DrugMechanismInfo {
  const g = `${product.genericName} ${product.activeIngredients} ${product.brandName}`.toLowerCase();
  const sub = product.subcategoryId || '';

  // 1. Antifungals: Azoles
  if (
    g.includes('fluconazole') ||
    g.includes('clotrimazole') ||
    g.includes('miconazole') ||
    g.includes('ketoconazole') ||
    g.includes('itraconazole') ||
    g.includes('voriconazole') ||
    g.includes('diflucan') ||
    g.includes('canesten') ||
    g.includes('daktarin') ||
    g.includes('hydrozole')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-azoles'];
  }

  // 2. Antifungals: Allylamines (Terbinafine)
  if (g.includes('terbinafine') || g.includes('lamisil')) {
    return DRUG_MECHANISMS_REGISTRY['mech-allylamines'];
  }

  // 3. Antifungals: Polyenes (Nystatin)
  if (g.includes('nystatin') || g.includes('amphotericin') || g.includes('nilstat')) {
    return DRUG_MECHANISMS_REGISTRY['mech-polyenes'];
  }

  // 4. Anthelmintic: Mebendazole
  if (g.includes('mebendazole') || g.includes('vermox') || g.includes('pyrantel')) {
    return DRUG_MECHANISMS_REGISTRY['mech-benzimidazoles'];
  }

  // 5. Antivirals: Acyclovir / Famciclovir
  if (
    g.includes('acyclovir') ||
    g.includes('aciclovir') ||
    g.includes('famciclovir') ||
    g.includes('valaciclovir') ||
    g.includes('valacyclovir') ||
    g.includes('zovirax') ||
    g.includes('famvir')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-nucleoside-antiviral'];
  }

  // 6. Topical Steroids
  if (
    g.includes('hydrocortisone') ||
    g.includes('dermaid') ||
    g.includes('sigmacort') ||
    g.includes('clobetasol') ||
    g.includes('betamethasone')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-topical-steroid'];
  }

  // 7. Antibacterials: Penicillins / Cephalosporins
  if (
    g.includes('amoxicillin') ||
    g.includes('augmentin') ||
    g.includes('clavulan') ||
    g.includes('flucloxacillin') ||
    g.includes('cephalexin') ||
    g.includes('cefaclor') ||
    g.includes('penicillin') ||
    sub === 'sub-5-1'
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-betalactams'];
  }

  // 8. Macrolides
  if (
    g.includes('azithromycin') ||
    g.includes('clarithromycin') ||
    g.includes('erythromycin') ||
    g.includes('roxithromycin') ||
    g.includes('zithromax') ||
    g.includes('klacid') ||
    sub === 'sub-5-2'
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-macrolides'];
  }

  // 9. PPIs & GI Acid Suppressors
  if (
    g.includes('esomeprazole') ||
    g.includes('pantoprazole') ||
    g.includes('omeprazole') ||
    g.includes('rabeprazole') ||
    g.includes('nexium') ||
    g.includes('somac') ||
    sub === 'sub-1-5'
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-ppis'];
  }

  // 10. Respiratory SABA
  if (
    g.includes('salbutamol') ||
    g.includes('ventolin') ||
    g.includes('asmol') ||
    g.includes('terbutaline')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-saba'];
  }

  // 11. Opioids
  if (
    g.includes('oxycodone') ||
    g.includes('morphine') ||
    g.includes('fentanyl') ||
    g.includes('endone') ||
    g.includes('oxycontin') ||
    g.includes('targin') ||
    sub === 'sub-3-4'
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-opioids'];
  }

  // 12. Diabetes: SGLT2
  if (
    g.includes('empagliflozin') ||
    g.includes('dapagliflozin') ||
    g.includes('jardiance') ||
    g.includes('forxiga')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-sglt2'];
  }

  // 13. Statins
  if (
    g.includes('atorvastatin') ||
    g.includes('rosuvastatin') ||
    g.includes('simvastatin') ||
    g.includes('pravastatin') ||
    g.includes('lipitor') ||
    g.includes('crestor') ||
    sub === 'sub-2-4'
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-statins'];
  }

  // 14. Decongestants
  if (
    g.includes('pseudoephedrine') ||
    g.includes('sudafed') ||
    g.includes('phenylephrine') ||
    g.includes('oxymetazoline')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-decongestants'];
  }

  // 15. Paracetamol
  if (g.includes('paracetamol') || g.includes('panadol') || g.includes('acetaminophen')) {
    return DRUG_MECHANISMS_REGISTRY['mech-paracetamol'];
  }

  // 16. NSAIDs
  if (
    g.includes('ibuprofen') ||
    g.includes('nurofen') ||
    g.includes('naproxen') ||
    g.includes('naprogesic') ||
    g.includes('diclofenac') ||
    g.includes('voltaren') ||
    g.includes('mefenamic') ||
    g.includes('ponstan') ||
    g.includes('aspirin') ||
    g.includes('celecoxib') ||
    g.includes('meloxicam')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-nsaids'];
  }

  // 17. Antihistamines
  if (
    g.includes('cetirizine') ||
    g.includes('zyrtec') ||
    g.includes('loratadine') ||
    g.includes('claratyne') ||
    g.includes('fexofenadine') ||
    g.includes('telfast') ||
    g.includes('promethazine') ||
    g.includes('phenergan') ||
    g.includes('dexchlorpheniramine') ||
    g.includes('polaramine')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-antihistamines'];
  }

  // 18. Antacids & Alginates
  if (
    g.includes('mylanta') ||
    g.includes('gaviscon') ||
    g.includes('rennie') ||
    g.includes('antacid') ||
    g.includes('alginate') ||
    g.includes('aluminium hydroxide') ||
    g.includes('magnesium hydroxide')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-antacids'];
  }

  // 19. NRT (Smoking Cessation)
  if (g.includes('nicotine') || g.includes('nicorette') || g.includes('nicotinell') || g.includes('quit')) {
    return DRUG_MECHANISMS_REGISTRY['mech-nrt'];
  }

  // 20. ACE Inhibitors
  if (
    g.includes('perindopril') ||
    g.includes('ramipril') ||
    g.includes('enalapril') ||
    g.includes('captopril') ||
    g.includes('lisinopril') ||
    g.includes('coversyl') ||
    g.includes('tritace')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-acei'];
  }

  // 21. ARBs
  if (
    g.includes('candesartan') ||
    g.includes('irbesartan') ||
    g.includes('losartan') ||
    g.includes('valsartan') ||
    g.includes('telmisartan') ||
    g.includes('atacand') ||
    g.includes('avapro') ||
    g.includes('micardis')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-arb'];
  }

  // 22. Dihydropyridine Calcium Channel Blockers (DHP-CCBs)
  if (
    g.includes('amlodipine') ||
    g.includes('norvasc') ||
    g.includes('felodipine') ||
    g.includes('plendil') ||
    g.includes('lercanidipine') ||
    g.includes('zanidip') ||
    g.includes('nifedipine') ||
    g.includes('adalat')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-dhp-ccb'];
  }

  // 23. Non-DHP Calcium Channel Blockers
  if (
    g.includes('verapamil') ||
    g.includes('isoptin') ||
    g.includes('diltiazem') ||
    g.includes('cardizem')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-non-dhp-ccb'];
  }

  // 24. Alpha/Beta Blockers
  if (
    g.includes('labetalol') ||
    g.includes('trandate') ||
    g.includes('carvedilol') ||
    g.includes('dilatrend')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-alpha-beta-blocker'];
  }

  // 25. Mineralocorticoid Receptor Antagonists (MRAs)
  if (
    g.includes('spironolactone') ||
    g.includes('aldactone') ||
    g.includes('spiractin') ||
    g.includes('eplerenone') ||
    g.includes('inspra')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-mra'];
  }

  // 26. Vitamin K Antagonists (Warfarin)
  if (g.includes('warfarin') || g.includes('marevan') || g.includes('coumadin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-vka'];
  }

  // 27. Platelet P2Y12 Inhibitors
  if (
    g.includes('clopidogrel') ||
    g.includes('plavix') ||
    g.includes('iscover') ||
    g.includes('ticagrelor') ||
    g.includes('brilinta') ||
    g.includes('prasugrel')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-p2y12'];
  }

  // 28. Direct Thrombin Inhibitors (Dabigatran)
  if (g.includes('dabigatran') || g.includes('pradaxa')) {
    return DRUG_MECHANISMS_REGISTRY['mech-doac-thrombin'];
  }

  // 29. SSRIs
  if (
    g.includes('escitalopram') ||
    g.includes('lexapro') ||
    g.includes('sertraline') ||
    g.includes('zoloft') ||
    g.includes('fluoxetine') ||
    g.includes('prozac') ||
    g.includes('citalopram') ||
    g.includes('cipramil') ||
    g.includes('paroxetine') ||
    g.includes('aropax')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-ssri'];
  }

  // 30. Lithium
  if (g.includes('lithium') || g.includes('lithicarb') || g.includes('quilonum')) {
    return DRUG_MECHANISMS_REGISTRY['mech-lithium'];
  }

  // 31. Sodium Valproate
  if (g.includes('valproat') || g.includes('valproic') || g.includes('epilim')) {
    return DRUG_MECHANISMS_REGISTRY['mech-valproate'];
  }

  // 32. Atypical Antipsychotics (Clozapine)
  if (
    g.includes('clozapine') ||
    g.includes('clozaril') ||
    g.includes('clopine') ||
    g.includes('olanzapine') ||
    g.includes('risperidone') ||
    g.includes('quetiapine')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-atypical-antipsychotic'];
  }

  // 33. Levothyroxine
  if (
    g.includes('levothyroxine') ||
    g.includes('thyroxine') ||
    g.includes('eltroxin') ||
    g.includes('eutroxsig') ||
    g.includes('synthroid')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-levothyroxine'];
  }

  // 34. Metformin
  if (g.includes('metformin') || g.includes('diabex') || g.includes('diaformin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-metformin'];
  }

  // 35. Bisphosphonates
  if (
    g.includes('alendronate') ||
    g.includes('fosamax') ||
    g.includes('risedronate') ||
    g.includes('actonel') ||
    g.includes('zoledronic') ||
    g.includes('aclasta')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-bisphosphonates'];
  }

  // 36. Systemic Glucocorticoids
  if (
    g.includes('prednisolone') ||
    g.includes('prednisone') ||
    g.includes('panafcort') ||
    g.includes('panafcortelone') ||
    g.includes('dexamethasone')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-systemic-steroid'];
  }

  // 37. Anti-Staphylococcal Penicillins (Flucloxacillin)
  if (g.includes('flucloxacillin') || g.includes('flopen') || g.includes('dicloxacillin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-isoxazolyl-penicillin'];
  }

  // 38. Glycopeptides (Vancomycin)
  if (g.includes('vancomycin') || g.includes('vancocin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-glycopeptide'];
  }

  // 39. Aminoglycosides (Gentamicin)
  if (
    g.includes('gentamicin') ||
    g.includes('gentam') ||
    g.includes('tobramycin') ||
    g.includes('amikacin')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-aminoglycoside'];
  }

  // 40. Fluoroquinolones (Ciprofloxacin)
  if (
    g.includes('ciprofloxacin') ||
    g.includes('ciproxin') ||
    g.includes('norfloxacin') ||
    g.includes('moxifloxacin')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-fluoroquinolone'];
  }

  // 41. Nitroimidazoles (Metronidazole)
  if (g.includes('metronidazole') || g.includes('flagyl')) {
    return DRUG_MECHANISMS_REGISTRY['mech-nitroimidazole'];
  }

  // 42. Barbiturates (Thiopental)
  if (g.includes('thiopental') || g.includes('pentothal')) {
    return DRUG_MECHANISMS_REGISTRY['mech-barbiturate'];
  }

  // 43. Class III Antiarrhythmics (Amiodarone)
  if (g.includes('amiodarone') || g.includes('cordarone')) {
    return DRUG_MECHANISMS_REGISTRY['mech-antiarrhythmic-class3'];
  }

  // 44. Dihydrofolate Reductase Inhibitors (Methotrexate)
  if (g.includes('methotrexate') || g.includes('methoblastin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-dhfr-inhibitor'];
  }

  // 45. Emergency Contraception - Progestin (Levonorgestrel)
  if (
    g.includes('levonorgestrel') ||
    g.includes('postinor') ||
    g.includes('norlevo') ||
    g.includes('escelle')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-progestin-contraceptive'];
  }

  // 46. Emergency Contraception - SPRM (Ulipristal)
  if (g.includes('ulipristal') || g.includes('ellaone')) {
    return DRUG_MECHANISMS_REGISTRY['mech-sprm'];
  }

  // 47. Ophthalmic PGAs (Latanoprost)
  if (
    g.includes('latanoprost') ||
    g.includes('xalatan') ||
    g.includes('bimatoprost') ||
    g.includes('lumigan') ||
    g.includes('travoprost') ||
    g.includes('travatan')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-pgas'];
  }

  // 48. Ophthalmic Beta Blockers (Timolol)
  if (g.includes('timolol') || g.includes('timoptol') || g.includes('nyolol')) {
    return DRUG_MECHANISMS_REGISTRY['mech-ocular-beta-blocker'];
  }

  // 49. ICS + LABA Combination
  if (
    g.includes('seretide') ||
    g.includes('symbicort') ||
    g.includes('flutiform') ||
    g.includes('fostair') ||
    (g.includes('fluticasone') && g.includes('salmeterol')) ||
    (g.includes('budesonide') && g.includes('formoterol'))
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-ics-laba'];
  }

  // 50. LABA (Salmeterol, Formoterol)
  if (
    g.includes('salmeterol') ||
    g.includes('serevent') ||
    g.includes('formoterol') ||
    g.includes('oxis') ||
    g.includes('indacaterol')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-laba'];
  }

  // 51. Organic Nitrates (GTN)
  if (
    g.includes('glyceryl trinitrate') ||
    g.includes('nitroglycerin') ||
    g.includes('anginine') ||
    g.includes('nitrolingual') ||
    g.includes('isosorbide') ||
    g.includes('imdur')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-nitrates'];
  }

  // 52. Central Antitussives (Dextromethorphan)
  if (
    g.includes('dextromethorphan') ||
    g.includes('bisolvon dry') ||
    g.includes('robitussin dry') ||
    g.includes('pholcodine') ||
    g.includes('duro-tuss dry')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-antitussive'];
  }

  // 53. Stool Softeners & Cerumenolytics (Docusate)
  if (
    g.includes('docusate') ||
    g.includes('coloxyl') ||
    g.includes('waxsol') ||
    g.includes('ear wax')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-stool-softener'];
  }

  // 54. Recombinant Zoster Vaccine
  if (g.includes('shingrix') || g.includes('zoster') || g.includes('shingles')) {
    return DRUG_MECHANISMS_REGISTRY['mech-zoster-vaccine'];
  }

  // 55. Iron Supplements
  if (
    g.includes('ferrous') ||
    g.includes('iron') ||
    g.includes('ferro') ||
    g.includes('maltofer') ||
    g.includes('fefol')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-iron'];
  }

  // 56. Magnesium
  if (g.includes('magnesium') || g.includes('magmin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-magnesium'];
  }

  // 57. Vitamins D & B12
  if (
    g.includes('colecalciferol') ||
    g.includes('ostelin') ||
    g.includes('vitamin d') ||
    g.includes('cyanocobalamin') ||
    g.includes('vitamin b12')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-vitamins-d-b12'];
  }

  // 58. Folic Acid
  if (g.includes('folic') || g.includes('folt') || g.includes('folate')) {
    return DRUG_MECHANISMS_REGISTRY['mech-folate'];
  }

  // 59. St John's Wort
  if (g.includes('st john') || g.includes('hypericum') || g.includes('remotiv')) {
    return DRUG_MECHANISMS_REGISTRY['mech-st-johns-wort'];
  }

  // 60. Ginkgo Biloba
  if (g.includes('ginkgo') || g.includes('tebonin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-ginkgo'];
  }

  // 61. Cranberry
  if (g.includes('cranberry') || g.includes('uracran') || g.includes('cystitis')) {
    return DRUG_MECHANISMS_REGISTRY['mech-cranberry'];
  }

  // 62. Probiotics
  if (
    g.includes('probiotic') ||
    g.includes('lactobacillus') ||
    g.includes('bifidobacterium') ||
    g.includes('inner health') ||
    g.includes('life space')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-probiotics'];
  }

  // 63. Glucosamine
  if (g.includes('glucosamine') || g.includes('chondroitin')) {
    return DRUG_MECHANISMS_REGISTRY['mech-glucosamine'];
  }

  // 64. Minoxidil
  if (g.includes('minoxidil') || g.includes('regaine')) {
    return DRUG_MECHANISMS_REGISTRY['mech-minoxidil'];
  }

  // 65. Chloramphenicol
  if (g.includes('chloramphenicol') || g.includes('chlorsig')) {
    return DRUG_MECHANISMS_REGISTRY['mech-chloramphenicol'];
  }

  // 66. Naloxone
  if (g.includes('naloxone') || g.includes('nyxoid') || g.includes('prenoxad')) {
    return DRUG_MECHANISMS_REGISTRY['mech-naloxone'];
  }

  // 67. Glucagon
  if (g.includes('glucagon') || g.includes('glucagen')) {
    return DRUG_MECHANISMS_REGISTRY['mech-glucagon-antidote'];
  }

  // 68. Sodium Bicarbonate
  if (g.includes('bicarbonate') || g.includes('soda mint') || g.includes('bicarb')) {
    return DRUG_MECHANISMS_REGISTRY['mech-bicarbonate-alkalinisation'];
  }

  // 69. Emollients & Ceramide Moisturizers
  if (
    g.includes('cerave') ||
    g.includes('cetaphil') ||
    g.includes('qv ') ||
    g.includes('dermeze') ||
    g.includes('sorbolene') ||
    g.includes('emollient') ||
    g.includes('aqueous cream')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-emollient'];
  }

  // 70. Sunscreens SPF 50+
  if (
    g.includes('sunscreen') ||
    g.includes('hamilton') ||
    g.includes('invisible zinc') ||
    g.includes('cancer council') ||
    g.includes('spf 50')
  ) {
    return DRUG_MECHANISMS_REGISTRY['mech-sunscreen'];
  }

  // Default clean dynamic fallback (no repetitive generic boilerplate)
  return {
    classCode: `mech-${product.id}`,
    classNameFa: product.genericName,
    classNameEn: product.genericName,
    actionClassification: 'modulator',
    actionTypeLabelFa: product.genericName,
    actionTypeLabelEn: product.genericName,
    targetSiteFa: `گیرنده‌ها و بافت‌های هدف ${product.genericName}`,
    targetSiteEn: `Target physiological receptors for ${product.genericName}`,
    cellularEffectFa: `تعدیل عملکرد سلولی و تنظیم پاسخ‌های بیوشیمیایی در بافت هدف.`,
    cellularEffectEn: `Modulation of cellular pathway responses in target tissues.`,
    descriptionFa: `اثر درمانی بر اساس مونوگراف رسمی استانداردهای دارودرمانی استرالیا (AMH/APF).`,
    descriptionEn: `Therapeutic action guided by Australian Medicines Handbook (AMH) monographs.`,
    clinicalRelevanceFa: `مصرف و مشاوره طبق دستورالعمل‌های رسمی داروسازی استرالیا.`,
    clinicalRelevanceEn: `Dispense and counsel per standard Australian Pharmacy Board guidelines.`,
    colorClass: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
  };
}

/**
 * Retrieve the subcategory mechanism overview, falling back to a synthesized
 * clinical overview if not directly mapped.
 */
export function getCategoryMechanism(
  subcategoryId: string,
  titleFa?: string,
  titleEn?: string
): CategoryMechanismOverview {
  if (SUBCATEGORY_MECHANISMS[subcategoryId]) {
    return SUBCATEGORY_MECHANISMS[subcategoryId];
  }

  const fallbackFa = titleFa || 'دسته دارویی بالینی';
  const fallbackEn = titleEn || 'Clinical Drug Category';

  return {
    subcategoryId,
    categoryTitleFa: fallbackFa,
    categoryTitleEn: fallbackEn,
    targetPathwayFa: `مسیرهای سلولی، آنزیمی و گیرنده‌های هدف مرتبط با دسته ${fallbackFa}`,
    targetPathwayEn: `Target cellular enzymes, pathways and receptors for ${fallbackEn}`,
    primaryActionFa: 'تعدیل اختصاصی فارماکولوژیک بر اساس مونوگراف AMH/APF',
    primaryActionEn: 'Targeted pharmacological modulation per AMH/APF guidelines',
    actionClassification: 'modulator',
    summaryFa: `داروهای این دسته با هدف‌گیری گیرنده‌ها و مسیرهای بیوشیمیایی مشخص عمل می‌کنند و بر اساس ویژگی‌های فارماکوکینتیک و زمان‌بندی SUSMP دسته‌بندی شده‌اند.`,
    summaryEn: `Medicines in this category selectively target specific physiological receptors and biochemical pathways according to Australian clinical standards.`,
    keyClasses: [
      {
        nameFa: `دسته اصلی داروهای ${fallbackFa}`,
        nameEn: `${fallbackEn} Core Class`,
        classCode: `mech-cat-${subcategoryId}`,
        actionType: 'Pharmacological Modulator',
        mechanismFa: `اتصال به گیرنده‌ها و آنزیم‌های اختصاصی و تنظیم فرآیندهای فیزیولوژیک.`,
        mechanismEn: `Binds targeted physiological receptors to modulate therapeutic biochemical cascades.`,
        examples: fallbackEn,
      },
    ],
  };
}
