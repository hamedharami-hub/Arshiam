export type CypEnzymeType = 'CYP3A4' | 'CYP2D6' | 'CYP2C9' | 'CYP2C19' | 'CYP1A2' | 'P-gp';

export interface CypDrugEntry {
  name: string;
  nameFa?: string;
  category: 'strong_inhibitor' | 'moderate_inhibitor' | 'strong_inducer' | 'moderate_inducer' | 'sensitive_substrate' | 'narrow_therapeutic_substrate';
  notesFa: string;
  notesEn: string;
}

export interface CypEnzymeProfile {
  id: CypEnzymeType;
  name: string;
  titleFa: string;
  titleEn: string;
  badgeColor: string;
  overviewFa: string;
  overviewEn: string;
  clinicalSignificanceFa: string;
  clinicalSignificanceEn: string;
  inhibitors: CypDrugEntry[];
  inducers: CypDrugEntry[];
  substrates: CypDrugEntry[];
  clinicalRules: {
    titleFa: string;
    titleEn: string;
    mechanismFa: string;
    mechanismEn: string;
    recommendationFa: string;
    recommendationEn: string;
    severity: 'contraindicated' | 'critical' | 'major' | 'moderate';
  }[];
}

export interface CypPairInteraction {
  drugA: string;
  drugB: string;
  enzyme: CypEnzymeType;
  type: 'inhibition_toxicity' | 'induction_failure' | 'prodrug_activation_failure';
  severity: 'high' | 'critical' | 'moderate';
  titleFa: string;
  titleEn: string;
  clinicalOutcomeFa: string;
  clinicalOutcomeEn: string;
  managementFa: string;
  managementEn: string;
}

export const CYP_ENZYMES_DATABASE: Record<CypEnzymeType, CypEnzymeProfile> = {
  CYP3A4: {
    id: 'CYP3A4',
    name: 'CYP3A4 / CYP3A5',
    titleFa: 'سیتوکروم CYP3A4 (اصلی‌ترین مسیر متابولیسم بیش از ۵۰٪ داروها)',
    titleEn: 'Cytochrome CYP3A4 (Major pathway for >50% of all prescription drugs)',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
    overviewFa: 'ایزوآنزیم CYP3A4 فراوان‌ترین سیتوکروم کبدی و روده‌ای است و مسئول متابولیسم بیش از نیمی از داروهای بالینی است. مهار آن باعث تجمع سریع دارو و سمیت شدید می‌شود، در حالی که القای آن منجر به شکست درمانی می‌گردد.',
    overviewEn: 'CYP3A4 is the most abundant hepatic and intestinal cytochrome P450 enzyme, responsible for the phase I metabolism of over 50% of prescription medications.',
    clinicalSignificanceFa: 'تداخلات مهارکننده‌های قوی CYP3A4 با استاتین‌ها (سیمواستاتین/آتورواستاتین) خطر رابدومیولیز و نارسایی حاد کلیه را شدیداً افزایش می‌دهد. همچنین تداخل با داروهای سرکوب‌کننده ایمنی (تاکرولیموس/سیکلوسپورین) نیازمند پایش فوری TDM است.',
    clinicalSignificanceEn: 'Co-administration of potent CYP3A4 inhibitors with statins dramatically increases rhabdomyolysis risk. Interactions with DOACs (Apixaban/Rivaroxaban) or immunosuppressants require urgent management.',
    inhibitors: [
      {
        name: 'Clarithromycin / Erythromycin',
        nameFa: 'کلاریترومایسین / اریترومایسین',
        category: 'strong_inhibitor',
        notesFa: 'ماکرولیدهای مهارکننده قوی CYP3A4؛ تداخل شدید با سیمواستاتین (منع مصرف همزمان)، کلشی‌سین و دیگوکسین.',
        notesEn: 'Potent CYP3A4 inhibitor macrolides; contraindicated with simvastatin and colchicine.',
      },
      {
        name: 'Ketoconazole / Itraconazole / Voriconazole / Posaconazole',
        nameFa: 'کتوکونازول / ایتراکونازول / وریکونازول',
        category: 'strong_inhibitor',
        notesFa: 'ضدقارچ‌های آزول خوراکی؛ مهارکننده بسیار قوی CYP3A4 با خطر بالای سمیت سوبستراها.',
        notesEn: 'Potent azole antifungal inhibitors; drastically increase systemic exposure of CYP3A4 substrates.',
      },
      {
        name: 'Ritonavir / Cobicistat',
        nameFa: 'ریتوناویر / کوبیسیستات (Booster)',
        category: 'strong_inhibitor',
        notesFa: 'قوی‌ترین مهارکننده فارماکوکینتیک CYP3A4 که در درمان HIV و Paxlovid (Nirmatrelvir/Ritonavir) استفاده می‌شود.',
        notesEn: 'Strongest known CYP3A4 inhibitors used as pharmacokinetic boosters.',
      },
      {
        name: 'Grapefruit Juice',
        nameFa: 'آب گریپ‌فروت',
        category: 'moderate_inhibitor',
        notesFa: 'مهارکننده اختصاصی CYP3A4 در سلول‌های مخاط روده (Enterocytes)؛ فراهمی زیستی خوراکی داروها را چند برابر می‌کند.',
        notesEn: 'Intestinal CYP3A4 inhibitor; markedly increases oral bioavailability of affected drugs.',
      },
      {
        name: 'Diltiazem / Verapamil',
        nameFa: 'دیلتیازم / وراپامیل',
        category: 'moderate_inhibitor',
        notesFa: 'مسدودکننده‌های کانال کلسیم غیر دی‌هیدروپیریدینی؛ مهارکننده متوسط CYP3A4 و P-gp.',
        notesEn: 'Non-DHP CCBs; moderate CYP3A4 and P-gp inhibitors.',
      },
      {
        name: 'Fluconazole',
        nameFa: 'فلوکونازول',
        category: 'moderate_inhibitor',
        notesFa: 'مهارکننده متوسط CYP3A4 و مهارکننده قوی CYP2C9؛ افزایش شدید غلظت وارفارین و استاتین‌ها.',
        notesEn: 'Moderate CYP3A4 inhibitor and potent CYP2C9 inhibitor.',
      },
      {
        name: 'Amiodarone',
        nameFa: 'آمیودارون',
        category: 'moderate_inhibitor',
        notesFa: 'داروی ضد آریتمی با نیمه‌عمر بسیار طولانی (ماه‌ها)؛ مهارکننده CYP3A4، CYP2C9، CYP2D6 و P-gp.',
        notesEn: 'Multi-enzyme inhibitor with multi-month half-life; strongly inhibits CYP3A4, CYP2C9, and P-gp.',
      },
    ],
    inducers: [
      {
        name: 'Rifampicin (Rifampin)',
        nameFa: 'ریفامپیسین',
        category: 'strong_inducer',
        notesFa: 'قوی‌ترین القاکننده شناخته‌شده CYP3A4 و P-gp؛ غلظت داروها و قرص‌های ضدبارداری خوراکی (COCP) را به شدت افت می‌دهد.',
        notesEn: 'Most potent known CYP3A4 and P-gp inducer; causes severe therapeutic failure of substrates & oral contraceptives.',
      },
      {
        name: 'Carbamazepine',
        nameFa: 'کاربامازپین',
        category: 'strong_inducer',
        notesFa: 'ضد صرع القاکننده قوی با خاصیت خودالقایی (Auto-induction) در ۴ تا ۶ هفته اول مصرف.',
        notesEn: 'Potent inducer exhibiting auto-induction of its own metabolism.',
      },
      {
        name: 'Phenytoin',
        nameFa: 'فنی‌توئین',
        category: 'strong_inducer',
        notesFa: 'ضد صرع با فارماکوکینتیک غیرخطی میکائیلیس-منتن و القاکننده قوی CYP3A4 و CYP2C9.',
        notesEn: 'Non-linear kinetic antiepileptic and potent CYP3A4/CYP2C9 inducer.',
      },
      {
        name: 'St John’s Wort (Hypericum perforatum)',
        nameFa: 'علف چای / هوفاریقون (داروی گیاهی)',
        category: 'strong_inducer',
        notesFa: 'فرآورده گیاهی OTC ضد افسردگی؛ القاکننده قوی CYP3A4 و P-gp (رد پیوند با سیکلوسپورین، بارداری ناخواسته).',
        notesEn: 'Herbal OTC antidepressant; strong CYP3A4/P-gp inducer causing organ rejection and contraceptive failure.',
      },
      {
        name: 'Phenobarbital / Primidone',
        nameFa: 'فنوباربیتال / پریمیدون',
        category: 'strong_inducer',
        notesFa: 'باربیتورات‌های القاکننده قوی تمام ایزوفرم‌های سیتوکروم کبدی.',
        notesEn: 'Barbiturates with broad potent hepatic enzyme induction.',
      },
    ],
    substrates: [
      {
        name: 'Simvastatin / Atorvastatin',
        nameFa: 'سیمواستاتین / آتورواستاتین',
        category: 'sensitive_substrate',
        notesFa: 'استاتین‌های حساس به CYP3A4؛ همراهی با کلاریترومایسین یا کتوکونازول خطر رابدومیولیز کشنده دارد (روزوواستاتین جایگزین امن‌تر است).',
        notesEn: 'CYP3A4 sensitive statins; high rhabdomyolysis risk with strong inhibitors (Rosuvastatin is safer alternative).',
      },
      {
        name: 'Apixaban / Rivaroxaban (DOACs)',
        nameFa: 'آپیکسابان / ریواروکسابان',
        category: 'sensitive_substrate',
        notesFa: 'ضد انعقادهای خوراکی مستقیم؛ همراهی با مهارکننده‌های دوگانه CYP3A4/P-gp خطر خونریزی ماژور دارد.',
        notesEn: 'Direct oral anticoagulants; increased major bleeding risk with dual CYP3A4/P-gp inhibitors.',
      },
      {
        name: 'Tacrolimus / Cyclosporine',
        nameFa: 'تاکرولیموس / سیکلوسپورین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'داروهای سرکوب‌کننده ایمنی با پنجره درمانی بسیار باریک (NTI)؛ نیازمند پایش مستمر سطح خونی.',
        notesEn: 'Narrow therapeutic index immunosuppressants requiring close therapeutic drug monitoring (TDM).',
      },
      {
        name: 'Combined Oral Contraceptives (Ethinylestradiol)',
        nameFa: 'قرص‌های ترکیبی ضدبارداری (COCP)',
        category: 'sensitive_substrate',
        notesFa: 'القاکننده‌ها متابولیسم استروژن را تسریع کرده و باعث شکست پیشگیری از بارداری ناخواسته می‌شوند.',
        notesEn: 'Enzyme inducers accelerate estrogen breakdown leading to contraceptive failure.',
      },
      {
        name: 'Calcium Channel Blockers (Amlodipine, Felodipine, Nifedipine)',
        nameFa: 'مسدودکننده‌های کانال کلسیم DHP',
        category: 'sensitive_substrate',
        notesFa: 'مهارکننده‌های CYP3A4 (مانند آب گریپ‌فروت) غلظت آن‌ها را بالا برده و افت شدید فشار خون ایجاد می‌کنند.',
        notesEn: 'Inhibitors increase plasma levels causing marked hypotension and peripheral edema.',
      },
      {
        name: 'Colchicine',
        nameFa: 'کلشی‌سین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'داروی نقرس با پنجره باریک؛ تداخل با مهارکننده‌های قوی CYP3A4/P-gp در بیماران با اختلال کلیه/کبد کشنده است.',
        notesEn: 'Fatal toxicity reported with strong CYP3A4/P-gp inhibitors in renal or hepatic impairment.',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'سیمواستاتین + کلاریترومایسین (منع مصرف مطلق)',
        titleEn: 'Simvastatin + Clarithromycin (Contraindicated)',
        mechanismFa: 'کلاریترومایسین CYP3A4 را به شدت مهار کرده و غلظت سیمواستاتین را بیش از ۱۰ برابر افزایش می‌دهد.',
        mechanismEn: 'Clarithromycin potent CYP3A4 inhibition elevates simvastatin AUC by >10-fold.',
        recommendationFa: 'مصرف همزمان اکیداً ممنوع است. سیمواستاتین در طول دوره آنتی‌بیوتیک قطع شود یا از رزوواستاتین/آزیترومایسین استفاده گردد.',
        recommendationEn: 'Withhold simvastatin during clarithromycin therapy, or substitute with azithromycin/rosuvastatin.',
        severity: 'contraindicated',
      },
      {
        titleFa: 'داروهای ضد صرع القاکننده + قرص‌های ضد بارداری (شکست درمانی)',
        titleEn: 'Enzyme-Inducing AEDs + Oral Contraceptives',
        mechanismFa: 'کاربامازپین، فنی‌توئین و ریفامپیسین کلیرانس اتینیل‌استرادیول و پروژستین‌ها را به شدت افزایش می‌دهند.',
        mechanismEn: 'Inducers increase hepatic clearance of synthetic estrogens and progestogens.',
        recommendationFa: 'استفاده از روش‌های غیرخوراکی یا غیرحساس (مانند IUD مسی یا Mirena، یا دوز دوبرابر پروژسترون) الزامی است.',
        recommendationEn: 'Advise long-acting reversible contraception (LARC like copper or levonorgestrel IUD).',
        severity: 'major',
      },
    ],
  },

  CYP2D6: {
    id: 'CYP2D6',
    name: 'CYP2D6',
    titleFa: 'سیتوکروم CYP2D6 (پلی‌مورفیسم ژنتیکی و پیش‌داروها)',
    titleEn: 'Cytochrome CYP2D6 (Genetic Polymorphism & Prodrug Activation)',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    overviewFa: 'آنزیم CYP2D6 غیرقابل القا است اما تنوع ژنتیکی شدیدی دارد (Poor, Intermediate, Extensive, Ultra-rapid Metabolizers). این آنزیم مسئول تبدیل پیش‌داروهایی مانند کدئین و ترامادول به متابولیت فعال، و متابولیسم بتابلاکرها و ضدافسردگی‌ها است.',
    overviewEn: 'CYP2D6 is not inducible, but subject to extreme genetic polymorphism and responsible for activating prodrugs (codeine, tramoxifen) and clearing beta-blockers/antidepressants.',
    clinicalSignificanceFa: 'در افراد Ultra-rapid metabolizer، تبدیل کدئین به مورفین بسیار سریع بوده و خطر سمیت کشنده نوزادی در شیردهی دارد. برعکس، مهار CYP2D6 توسط فلوکستین/پاروکستین اثر ضددرد کدئین و ترامادول را خنثی می‌کند.',
    clinicalSignificanceEn: 'Ultra-rapid metabolizers generate dangerously high morphine levels from codeine. Potent inhibitors (Fluoxetine) block codeine analgesia and tamoxifen activation.',
    inhibitors: [
      {
        name: 'Fluoxetine / Paroxetine',
        nameFa: 'فلوکستین / پاروکستین',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده‌های بسیار قوی CYP2D6؛ تبدیل کدئین/ترامادول به مسکن فعال و تاموکسیفن به اندوکسیفن را مسدود می‌کنند.',
        notesEn: 'Potent CYP2D6 inhibitors; completely block bioactivation of codeine, tramadol, and tamoxifen.',
      },
      {
        name: 'Bupropion',
        nameFa: 'بوپروپیون',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده قوی CYP2D6؛ افزایش غلظت ضدافسردگی‌های سه‌حلقه‌ای و متوپرولول.',
        notesEn: 'Potent CYP2D6 inhibitor; increases metoprolol and TCA exposure.',
      },
      {
        name: 'Duloxetine',
        nameFa: 'دولوکستین',
        category: 'moderate_inhibitor',
        notesFa: 'مهارکننده متوسط CYP2D6.',
        notesEn: 'Moderate CYP2D6 inhibitor.',
      },
      {
        name: 'Amiodarone / Quinidine',
        nameFa: 'آمیودارون / کینیدین',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده قوی آنزیم CYP2D6.',
        notesEn: 'Strong inhibitors of CYP2D6 pathways.',
      },
    ],
    inducers: [],
    substrates: [
      {
        name: 'Codeine / Tramadol',
        nameFa: 'کدئین / ترامادول',
        category: 'sensitive_substrate',
        notesFa: 'پیش‌داروهایی که برای اثر تسکین درد باید توسط CYP2D6 به مورفین و O-desmethyltramadol تبدیل شوند.',
        notesEn: 'Prodrugs requiring CYP2D6 bioactivation for analgesic efficacy.',
      },
      {
        name: 'Metoprolol / Carvedilol',
        nameFa: 'متوپرولول / کارودیلول',
        category: 'sensitive_substrate',
        notesFa: 'بتابلاکرهای قلبی؛ مهار CYP2D6 غلظت آن‌ها را تا ۴ برابر بالا برده و برادی‌کاردی و افت فشار شدید می‌دهد.',
        notesEn: 'Cardioselective beta-blockers; inhibitors cause marked bradycardia and hypotension.',
      },
      {
        name: 'Tricyclic Antidepressants (Amitriptyline, Nortriptyline)',
        nameFa: 'ضدافسردگی‌های سه‌حلقه‌ای (TCA)',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'مهار CYP2D6 باعث تجمع TCAها و سمیت قلبی (طولانی شدن QT و آریتمی) می‌شود.',
        notesEn: 'Substrates with narrow margin; inhibitors trigger cardiotoxicity and QT prolongation.',
      },
      {
        name: 'Tamoxifen',
        nameFa: 'تاموکسیفن',
        category: 'sensitive_substrate',
        notesFa: 'داروی سرطان سینه؛ برای اثربخشی باید به متابولیت فعال Endoxifen تبدیل شود. مهار توسط فلوکستین شانس عود سرطان را بالا می‌برد.',
        notesEn: 'Breast cancer agent requiring CYP2D6 activation to endoxifen; avoid fluoxetine/paroxetine.',
      },
      {
        name: 'Antipsychotics (Risperidone, Haloperidol, Aripiprazole)',
        nameFa: 'آنتی‌سایکوتیک‌ها',
        category: 'sensitive_substrate',
        notesFa: 'افزایش خطر عوارض خارج هرمی (EPS) و سمیت در صورت مصرف همزمان با مهارکننده‌های CYP2D6.',
        notesEn: 'Increased risk of extrapyramidal side effects when combined with CYP2D6 inhibitors.',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'تاموکسیفن + فلوکستین/پاروکستین (کاهش اثر ضدسرطان)',
        titleEn: 'Tamoxifen + Fluoxetine/Paroxetine',
        mechanismFa: 'فلوکستین تبدیل تاموکسیفن به متابولیت فعال اندوکسیفن را مهار می‌کند.',
        mechanismEn: 'Potent CYP2D6 inhibition prevents conversion of tamoxifen to active endoxifen.',
        recommendationFa: 'از فلوکستین/پاروکستین پرهیز شود؛ سیتالوپرام، ونلافاکسین یا اس‌سیتالوپرام به عنوان جایگزین ایمن انتخاب شوند.',
        recommendationEn: 'Avoid fluoxetine/paroxetine in tamoxifen patients; use venlafaxine or citalopram instead.',
        severity: 'major',
      },
      {
        titleFa: 'کدئین در مادران شیرده فوق‌سریع (Ultra-rapid metabolizers)',
        titleEn: 'Codeine in Ultra-rapid Metabolizer Nursing Mothers',
        mechanismFa: 'تولید بیش از حد مورفین و ترشح در شیر مادر.',
        mechanismEn: 'Excessive conversion of codeine to morphine entering breast milk.',
        recommendationFa: 'کدئین در دوران شیردهی اکیداً ممنوع است (خطر دپرسیون تنفسی کشنده نوزاد). پاراستامول یا ایبوپروفن جایگزین شود.',
        recommendationEn: 'Codeine is contraindicated during breastfeeding due to fatal infant morphine toxicity risks.',
        severity: 'contraindicated',
      },
    ],
  },

  CYP2C9: {
    id: 'CYP2C9',
    name: 'CYP2C9',
    titleFa: 'سیتوکروم CYP2C9 (محور وارفارین، فنی‌توئین و ضدالتهاب‌ها)',
    titleEn: 'Cytochrome CYP2C9 (Warfarin, Phenytoin & NSAID clearance)',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    overviewFa: 'ایزوآنزیم CYP2C9 مسئول متابولیسم ایزومر فعال‌تر وارفارین (S-Warfarin)، فنی‌توئین، سولفونیل‌اوره‌ها و اکثر NSAIDها است. مهار آن باعث جهش ناگهانی INR و خونریزی‌های تهدیدکننده حیات می‌شود.',
    overviewEn: 'CYP2C9 metabolizes the more potent S-enantiomer of warfarin, phenytoin, sulfonylureas, and most NSAIDs. Inhibition results in sharp INR spikes and life-threatening bleeding.',
    clinicalSignificanceFa: 'شایع‌ترین علت بستری اورژانسی تداخلات دارویی در استرالیا، تداخل وارفارین با مهارکننده‌های CYP2C9 (مانند مترونیدازول، فلوکونازول، کوتریموکسازول و آمیودارون) است.',
    clinicalSignificanceEn: 'A leading cause of preventable hospital admissions in Australia due to acute warfarin over-anticoagulation and major hemorrhages.',
    inhibitors: [
      {
        name: 'Metronidazole',
        nameFa: 'مترونیدازول',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده شدید متابولیسم S-warfarin؛ افزایش شدید و سریع INR ظرف ۴۸ تا ۷۲ ساعت.',
        notesEn: 'Selectively inhibits S-warfarin clearance, drastically elevating INR within 48-72h.',
      },
      {
        name: 'Fluconazole / Miconazole',
        nameFa: 'فلوکونازول / میکونازول (حتی ژل دهانی)',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده قوی CYP2C9؛ حتی ژل دهانی Daktarin جذب سیستمیک داشته و INR وارفارین را شدیداً بالا می‌برد.',
        notesEn: 'Potent CYP2C9 inhibitor; even topical/oral gel miconazole (Daktarin) triggers severe bleeding.',
      },
      {
        name: 'Trimethoprim + Sulfamethoxazole (Bactrim)',
        nameFa: 'کوتریموکسازول (باکتریم)',
        category: 'strong_inhibitor',
        notesFa: 'آنتی‌بیوتیک با تداخل ماژور؛ مهار متابولیسم وارفارین و جابجایی از اتصال پروتئینی.',
        notesEn: 'Strong CYP2C9 inhibitor and protein-binding displacer causing massive INR spikes.',
      },
      {
        name: 'Amiodarone',
        nameFa: 'آمیودارون',
        category: 'moderate_inhibitor',
        notesFa: 'کاهش کلیرانس وارفارین به میزان ۳۰ تا ۵۰ درصد؛ نیازمند کاهش دوز پیش‌دستانه وارفارین.',
        notesEn: 'Decreases warfarin clearance by 30-50%; preemptive warfarin dose reduction required.',
      },
    ],
    inducers: [
      {
        name: 'Rifampicin',
        nameFa: 'ریفامپیسین',
        category: 'strong_inducer',
        notesFa: 'القای قوی CYP2C9 و افت چشمگیر سطح وارفارین و فنی‌توئین.',
        notesEn: 'Potent inducer causing warfarin resistance and subtherapeutic INR.',
      },
      {
        name: 'Carbamazepine / Phenobarbital',
        nameFa: 'کاربامازپین / فنوباربیتال',
        category: 'strong_inducer',
        notesFa: 'القاکننده‌های آنزیمی قوی با کاهش سطح سرمی وارفارین.',
        notesEn: 'Strong inducers reducing anticoagulant efficacy.',
      },
      {
        name: 'St John’s Wort',
        nameFa: 'علف چای (داروی گیاهی)',
        category: 'moderate_inducer',
        notesFa: 'کاهش اثر وارفارین و افزایش خطر ترومبوز.',
        notesEn: 'Herbal inducer reducing warfarin INR.',
      },
    ],
    substrates: [
      {
        name: 'Warfarin (S-enantiomer)',
        nameFa: 'وارفارین (ایزومر فعال S)',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'داروی NTI با پایش الزامی INR؛ مهارکننده‌ها خطر خونریزی کشنده و القاکننده‌ها خطر سکته/ترومبوز دارند.',
        notesEn: 'Narrow therapeutic index anticoagulant; mandatory INR monitoring.',
      },
      {
        name: 'Phenytoin',
        nameFa: 'فنی‌توئین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'داروی NTI ضد تشنج؛ مهارکننده‌های CYP2C9 سمیت آتاکسی، نیستاگموس و سرگیجه می‌دهند.',
        notesEn: 'NTI antiepileptic; inhibitors cause ataxia, nystagmus, and mental confusion.',
      },
      {
        name: 'Sulfonylureas (Gliclazide, Glimepiride)',
        nameFa: 'سولفونیل‌اوره‌ها (گلیکلازید/گلیمپیرید)',
        category: 'sensitive_substrate',
        notesFa: 'مهار متابولیسم باعث افت شدید و طولانی قند خون (هیپوگلیسمی شدید) می‌شود.',
        notesEn: 'Inhibitors cause prolonged, severe hypoglycemia.',
      },
      {
        name: 'NSAIDs (Celecoxib, Meloxicam, Ibuprofen, Diclofenac)',
        nameFa: 'داروهای ضدالتهاب غیراستروئیدی',
        category: 'sensitive_substrate',
        notesFa: 'متابولیزه شونده توسط CYP2C9.',
        notesEn: 'Primary metabolic clearance via CYP2C9.',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'وارفارین + مترونیدازول / باکتریم (خطر خونریزی شدید)',
        titleEn: 'Warfarin + Metronidazole / Bactrim',
        mechanismFa: 'مهار شدید کلیرانس S-warfarin و جابجایی پروتئینی.',
        mechanismEn: 'Profound inhibition of S-warfarin elimination leading to rapid INR surge.',
        recommendationFa: 'دوز وارفارین ۳۰ تا ۵۰ درصد کاهش یابد و INR ظرف ۳ روز اول کنترل شود. در صورت امکان از آنتی‌بیوتیک جایگزین استفاده گردد.',
        recommendationEn: 'Empirically reduce warfarin dose by 30-50% and check INR at day 3, or select alternative antibiotic.',
        severity: 'critical',
      },
      {
        titleFa: 'وارفارین + ژل دهانی میکونازول (Daktarin Oral Gel)',
        titleEn: 'Warfarin + Miconazole Oral Gel (Daktarin)',
        mechanismFa: 'میکونازول با جذب سیستمیک قوی CYP2C9 را به شدت مهار می‌کند.',
        mechanismEn: 'Systemic absorption of oral miconazole causes potent CYP2C9 blockade.',
        recommendationFa: 'منع مصرف همزمان؛ برای برفک دهان در بیمار وارفارینی از قطره نیستاتین (Nystatin Drops) استفاده شود.',
        recommendationEn: 'Avoid miconazole gel with warfarin; use nystatin oral suspension as safe alternative.',
        severity: 'critical',
      },
    ],
  },

  CYP2C19: {
    id: 'CYP2C19',
    name: 'CYP2C19',
    titleFa: 'سیتوکروم CYP2C19 (فعال‌سازی کلوپیدوگرل و متابولیسم PPIها)',
    titleEn: 'Cytochrome CYP2C19 (Clopidogrel Bioactivation & PPI Metabolism)',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    overviewFa: 'آنزیم CYP2C19 نقش حیاتی در تبدیل پیش‌داروی ضدپلاکتی کلوپیدوگرل (Plavix) به شکل فعال آن و همچنین کلیرانس داروهای مهارکننده پمپ پروتون (PPIs) دارد.',
    overviewEn: 'CYP2C19 is critical for bioactivating the antiplatelet prodrug clopidogrel and metabolizing proton pump inhibitors.',
    clinicalSignificanceFa: 'مهار CYP2C19 توسط امپرازول یا اس‌امپرازول مانع فعال شدن کلوپیدوگرل شده و خطر ترومبوز استنت قلبی و سکته مجدد را افزایش می‌دهد. پانتوپرازول جایگزین مناسب‌تری است.',
    clinicalSignificanceEn: 'Omeprazole/Esomeprazole inhibit clopidogrel activation, increasing stent thrombosis risk. Pantoprazole has lower CYP2C19 affinity and is preferred.',
    inhibitors: [
      {
        name: 'Omeprazole / Esomeprazole',
        nameFa: 'امپرازول / اس‌امپرازول',
        category: 'moderate_inhibitor',
        notesFa: 'مهارکننده رقابتی CYP2C19؛ کاهش اثربخشی ضدپلاکتی کلوپیدوگرل.',
        notesEn: 'Inhibits clopidogrel bioactivation; switch to pantoprazole.',
      },
      {
        name: 'Fluoxetine / Fluvoxamine',
        nameFa: 'فلوکستین / فلووکسامین',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده‌های قوی CYP2C19.',
        notesEn: 'Potent CYP2C19 inhibitors.',
      },
      {
        name: 'Fluconazole / Voriconazole',
        nameFa: 'فلوکونازول / وریکونازول',
        category: 'strong_inhibitor',
        notesFa: 'ضدقارچ‌های مهارکننده CYP2C19 و CYP3A4.',
        notesEn: 'Azole antifungals inhibiting CYP2C19.',
      },
    ],
    inducers: [
      {
        name: 'Rifampicin',
        nameFa: 'ریفامپیسین',
        category: 'strong_inducer',
        notesFa: 'القای متابولیسم داروهای سوبسترای CYP2C19.',
        notesEn: 'Strong inducer of CYP2C19.',
      },
    ],
    substrates: [
      {
        name: 'Clopidogrel',
        nameFa: 'کلوپیدوگرل (Plavix)',
        category: 'sensitive_substrate',
        notesFa: 'پیش‌داروی ضدپلاکت؛ نیازمند فعال‌سازی دو مرحله‌ای توسط CYP2C19.',
        notesEn: 'Antiplatelet prodrug requiring CYP2C19 activation.',
      },
      {
        name: 'Proton Pump Inhibitors (Omeprazole, Lansoprazole)',
        nameFa: 'داروهای مهارکننده پمپ پروتون',
        category: 'sensitive_substrate',
        notesFa: 'کلیرانس کبدی وابسته به CYP2C19.',
        notesEn: 'Metabolized by CYP2C19.',
      },
      {
        name: 'Diazepam',
        nameFa: 'دیازپام',
        category: 'sensitive_substrate',
        notesFa: 'بنزودیازپین طولانی‌اثر؛ مهارکننده‌ها نیمه‌عمر و خواب‌آلودگی آن را به شدت طولانی می‌کنند.',
        notesEn: 'Long-acting benzodiazepine; clearance reduced by inhibitors.',
      },
      {
        name: 'Citalopram / Escitalopram',
        nameFa: 'سیتالوپرام / اس‌سیتالوپرام',
        category: 'sensitive_substrate',
        notesFa: 'در افراد با نقص آنزیمی یا همراهی با مهارکننده‌ها دوز دارو به دلیل خطر طولانی شدن QT به نصف کاهش می‌یابد.',
        notesEn: 'Inhibitors increase plasma levels and QT prolongation risk (max 20mg citalopram recommended).',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'کلوپیدوگرل + امپرازول (خطر ترومبوز استنت)',
        titleEn: 'Clopidogrel + Omeprazole / Esomeprazole',
        mechanismFa: 'امپرازول آنزیم CYP2C19 را مهار کرده و مانع تولید متابولیت فعال ضدپلاکتی کلوپیدوگرل می‌شود.',
        mechanismEn: 'Omeprazole competitively inhibits the CYP2C19 conversion of clopidogrel to active thiol metabolite.',
        recommendationFa: 'امپرازول با پانتوپرازول (Pantoprazole) که کمترین تداخل آنزیمی را دارد یا H2RA جایگزین شود.',
        recommendationEn: 'Switch PPI to pantoprazole (least CYP2C19 inhibition) or famotidine.',
        severity: 'major',
      },
    ],
  },

  CYP1A2: {
    id: 'CYP1A2',
    name: 'CYP1A2',
    titleFa: 'سیتوکروم CYP1A2 (تئوفیلین، کلوزاپین و القای دود سیگار)',
    titleEn: 'Cytochrome CYP1A2 (Theophylline, Clozapine & Tobacco Smoke Induction)',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    overviewFa: 'آنزیم CYP1A2 مسئول متابولیسم تئوفیلین، کلوزاپین، اولانزاپین، تیزانیدین و کافئین است. هیدروکربن‌های آروماتیک چندحلقه‌ای موجود در دود تنباکو (سیگار) القاکننده بسیار قوی این آنزیم هستند.',
    overviewEn: 'CYP1A2 metabolizes theophylline, clozapine, olanzapine, tizanidine, and caffeine. Polycyclic aromatic hydrocarbons in tobacco smoke strongly induce CYP1A2.',
    clinicalSignificanceFa: 'ترک ناگهانی سیگار باعث افت سریع القای CYP1A2 و افزایش چشمگیر (تا ۵۰٪) غلظت کلوزاپین یا تئوفیلین و سمیت شدید (تشنج، سدیشن شدید و آریتمی) می‌شود.',
    clinicalSignificanceEn: 'Smoking cessation stops CYP1A2 induction, causing toxic surges in clozapine and theophylline levels.',
    inhibitors: [
      {
        name: 'Fluvoxamine',
        nameFa: 'فلووکسامین (Luvox)',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده بسیار قوی CYP1A2؛ غلظت تئوفیلین و کلوزاپین را تا ۵ تا ۱۰ برابر بالا می‌برد (منع مصرف همزمان).',
        notesEn: 'Extremely potent CYP1A2 inhibitor; markedly increases theophylline and clozapine exposure.',
      },
      {
        name: 'Ciprofloxacin',
        nameFa: 'سیپروفلوکساسین',
        category: 'strong_inhibitor',
        notesFa: 'فلوروکینولون مهارکننده قوی CYP1A2؛ افزایش سمیت تئوفیلین و کلوزاپین.',
        notesEn: 'Fluoroquinolone inhibitor of CYP1A2; toxicity with theophylline and tizanidine.',
      },
      {
        name: 'Oral Contraceptive Pills (Ethinylestradiol)',
        nameFa: 'قرص‌های ضدبارداری خوراکی',
        category: 'moderate_inhibitor',
        notesFa: 'کاهش کلیرانس تئوفیلین و کافئین.',
        notesEn: 'Moderate inhibitor increasing theophylline half-life.',
      },
    ],
    inducers: [
      {
        name: 'Tobacco Smoke (Polycyclic Hydrocarbons)',
        nameFa: 'دود تنباکو و سیگار',
        category: 'strong_inducer',
        notesFa: 'القاکننده قوی CYP1A2 (نیکوتین خالص مانند NRT القاکننده نیست، بلکه دود تنباکو عامل القا است).',
        notesEn: 'Potent inducer via polycyclic aromatic hydrocarbons (not nicotine itself).',
      },
      {
        name: 'Rifampicin',
        nameFa: 'ریفامپیسین',
        category: 'strong_inducer',
        notesFa: 'القای متابولیسم سوبستراهای CYP1A2.',
        notesEn: 'Potent CYP1A2 inducer.',
      },
      {
        name: 'Charcoal-grilled meats',
        nameFa: 'گوشت‌های کباب‌شده روی زغال',
        category: 'moderate_inducer',
        notesFa: 'حاوی هیدروکربن‌های القاکننده CYP1A2.',
        notesEn: 'Dietary inducer of CYP1A2.',
      },
    ],
    substrates: [
      {
        name: 'Clozapine / Olanzapine',
        nameFa: 'کلوزاپین / اولانزاپین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'آنتی‌سایکوتیک‌های NTI؛ تغییرات مصرف سیگار یا مصرف سیپروفلوکساسین/فلووکسامین باعث سمیت یا عود اسکیزوفرنی می‌شود.',
        notesEn: 'Atypical antipsychotics requiring strict dose adjustment upon smoking cessation/initiation.',
      },
      {
        name: 'Theophylline / Aminophylline',
        nameFa: 'تئوفیلین / آمینوفیلین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'برونکودیلاتور NTI (محدوده درمانی ۱۰-۲۰ mcg/mL)؛ سمیت شامل تشنج و تاکیکاردی بطنی کشنده.',
        notesEn: 'Narrow therapeutic index bronchodilator with severe seizure and arrhythmia risks.',
      },
      {
        name: 'Tizanidine',
        nameFa: 'تیزانیدین',
        category: 'sensitive_substrate',
        notesFa: 'شل‌کننده عضلانی؛ همراهی با سیپروفلوکساسین یا فلووکسامین به دلیل افت فشار و سدیشن عمیق منع مصرف مطلق دارد.',
        notesEn: 'Centrally acting muscle relaxant; strictly contraindicated with ciprofloxacin/fluvoxamine.',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'کلوزاپین و ترک سیگار (خطر مسمومیت و تشنج)',
        titleEn: 'Clozapine & Smoking Cessation',
        mechanismFa: 'با قطع سیگار، القای آنزیمی CYP1A2 متوقف شده و کلیرانس کلوزاپین تا ۵۰٪ کاهش می‌یابد.',
        mechanismEn: 'Cessation of tobacco smoke removes CYP1A2 induction, causing toxic clozapine accumulation.',
        recommendationFa: 'هنگام ترک سیگار، دوز کلوزاپین ظرف ۲ تا ۴ روز باید حدود ۳۰ تا ۵۰ درصد کاهش یابد و سطح خونی پایش شود.',
        recommendationEn: 'Reduce clozapine dose by 30-50% upon smoking cessation and monitor plasma levels closely.',
        severity: 'critical',
      },
      {
        titleFa: 'سیپروفلوکساسین + تیزانیدین (منع مصرف مطلق)',
        titleEn: 'Ciprofloxacin + Tizanidine (Contraindicated)',
        mechanismFa: 'سیپروفلوکساسین غلظت تیزانیدین را تا ۱۰ برابر افزایش می‌دهد.',
        mechanismEn: 'Profound CYP1A2 inhibition leads to 10-fold increase in tizanidine AUC.',
        recommendationFa: 'منع مصرف همزمان مطلق به دلیل افت شدید فشار خون، سنکوپ و خواب‌آلودگی فلج‌کننده.',
        recommendationEn: 'Strictly contraindicated due to severe hypotension, somnolence, and psychomotor impairment.',
        severity: 'contraindicated',
      },
    ],
  },

  'P-gp': {
    id: 'P-gp',
    name: 'P-glycoprotein (ABCB1 Transporter)',
    titleFa: 'ناقل پی-گلیکوپروتئین P-gp (تلمبه برون‌ریزنده دارو در روده، کلیه و سد خونی-مغزی)',
    titleEn: 'P-glycoprotein Efflux Pump (Intestine, Kidney, Liver & Blood-Brain Barrier)',
    badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    overviewFa: 'پی-گلیکوپروتئین یک پمپ ترانسپورتر خروج دارو (Efflux pump) وابسته به ATP است که در روده (محدود کردن جذب)، کبد و کلیه (تسریع دفع) و سد خونی-مغزی (محافظت از مغز) قرار دارد. مهار P-gp جذب دارو را چند برابر می‌کند.',
    overviewEn: 'P-glycoprotein is an ATP-dependent efflux pump located in the intestinal enterocytes, hepatocytes, renal proximal tubules, and blood-brain barrier.',
    clinicalSignificanceFa: 'مهار P-gp توسط آمیودارون، وراپامیل، کلاریترومایسین یا کینیدین باعث جهش ناگهانی غلظت دیگوکسین (خطر مسمومیت کشنده قلبی) و افزایش غلظت داروی ضد انعقاد دابیگاتران (Dabigatran) و کلشی‌سین می‌شود.',
    clinicalSignificanceEn: 'P-gp inhibitors (amiodarone, verapamil) double digoxin serum levels, triggering fatal arrhythmias, and increase dabigatran bleeding risks.',
    inhibitors: [
      {
        name: 'Amiodarone / Dronedarone',
        nameFa: 'آمیودارون / دروندارون',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده بسیار قوی P-gp؛ غلظت دیگوکسین را ۲ برابر می‌کند.',
        notesEn: 'Potent P-gp inhibitor; doubles digoxin plasma levels.',
      },
      {
        name: 'Verapamil / Diltiazem',
        nameFa: 'وراپامیل / دیلتیازم',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده قوی P-gp در روده و کلیه.',
        notesEn: 'Strong intestinal and renal P-gp inhibitor.',
      },
      {
        name: 'Clarithromycin / Erythromycin',
        nameFa: 'کلاریترومایسین',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده دوگانه قوی CYP3A4 و P-gp.',
        notesEn: 'Dual potent CYP3A4 and P-gp inhibitor.',
      },
      {
        name: 'Cyclosporine / Itraconazole',
        nameFa: 'سیکلوسپورین / ایتراکونازول',
        category: 'strong_inhibitor',
        notesFa: 'مهارکننده‌های قدرتمند پمپ P-gp.',
        notesEn: 'Potent P-gp efflux pump inhibitors.',
      },
    ],
    inducers: [
      {
        name: 'Rifampicin',
        nameFa: 'ریفامپیسین',
        category: 'strong_inducer',
        notesFa: 'القاکننده قوی P-gp؛ دفع دیگوکسین و دابیگاتران را به شدت افزایش می‌دهد.',
        notesEn: 'Potent P-gp inducer lowering substrate levels.',
      },
      {
        name: 'St John’s Wort',
        nameFa: 'علف چای (داروی گیاهی)',
        category: 'strong_inducer',
        notesFa: 'القای پمپ P-gp و کاهش شدید سطح خونی دیگوکسین و سیکلوسپورین.',
        notesEn: 'Herbal P-gp inducer causing subtherapeutic levels.',
      },
    ],
    substrates: [
      {
        name: 'Digoxin',
        nameFa: 'دیگوکسین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'داروی NTI قلبی (محدوده درمانی 0.5 - 0.9 ng/mL)؛ مهار P-gp باعث تهوع، دید زرد، بلوک قلبی و آریتمی کشنده می‌شود.',
        notesEn: 'Narrow therapeutic cardiac glycoside; toxicity triggers xanthopsia and fatal arrhythmias.',
      },
      {
        name: 'Dabigatran Etexilate (Pradaxa)',
        nameFa: 'دابیگاتران',
        category: 'sensitive_substrate',
        notesFa: 'ضد انعقاد مستقیم ترومبین؛ فراهمی زیستی آن شدیداً وابسته به پمپ P-gp روده و کلیه است.',
        notesEn: 'Direct thrombin inhibitor whose bioavailability is regulated by P-gp.',
      },
      {
        name: 'Colchicine',
        nameFa: 'کلشی‌سین',
        category: 'narrow_therapeutic_substrate',
        notesFa: 'سوبسترای مشترک CYP3A4 و P-gp.',
        notesEn: 'Dual CYP3A4 and P-gp substrate.',
      },
      {
        name: 'Loperamide (at extreme doses)',
        nameFa: 'لوپرامید',
        category: 'sensitive_substrate',
        notesFa: 'در شرایط نرمال توسط P-gp از سد خونی-مغزی بیرون رانده می‌شود؛ در صورت مهار P-gp وارد CNS شده و اثر اوپیوئیدی و سمیت قلبی می‌دهد.',
        notesEn: 'Kept out of brain by P-gp; enters CNS if P-gp is blocked.',
      },
    ],
    clinicalRules: [
      {
        titleFa: 'دیگوکسین + آمیودارون یا وراپامیل (سمیت دیگوکسین)',
        titleEn: 'Digoxin + Amiodarone / Verapamil',
        mechanismFa: 'آمیودارون و وراپامیل ترشح کلیوی و روده ای دیگوکسین توسط P-gp را مهار کرده و سطح خونی آن را ۷۰ تا ۱۰۰ درصد بالا می‌برند.',
        mechanismEn: 'Inhibition of renal tubular and intestinal P-gp efflux decreases digoxin clearance by 50%.',
        recommendationFa: 'دوز دیگوکسین هنگام شروع آمیودارون یا وراپامیل باید ۵۰٪ کاهش یابد و سطح سرمی پایش شود.',
        recommendationEn: 'Halve digoxin dose immediately upon initiating amiodarone/verapamil and monitor serum levels.',
        severity: 'critical',
      },
      {
        titleFa: 'دابیگاتران + مهارکننده‌های قوی P-gp در نارسایی کلیه',
        titleEn: 'Dabigatran + Strong P-gp Inhibitors in Renal Impairment',
        mechanismFa: 'افزایش چشمگیر جذب دابیگاتران به دلیل مهار پمپ روده و کاهش دفع کلیوی.',
        mechanismEn: 'Marked increase in dabigatran exposure due to dual absorption increase and reduced renal clearance.',
        recommendationFa: 'در بیماران با CrCl زیر ۵۰ mL/min همراهی دابیگاتران با وراپامیل نیازمند کاهش دوز یا منع مصرف با دروندارون است.',
        recommendationEn: 'Dose reduce dabigatran (to 110mg BD) or avoid with strong P-gp inhibitors in moderate-to-severe renal impairment.',
        severity: 'major',
      },
    ],
  },
};

export const COMMON_PAIR_INTERACTIONS: CypPairInteraction[] = [
  {
    drugA: 'Simvastatin',
    drugB: 'Clarithromycin',
    enzyme: 'CYP3A4',
    type: 'inhibition_toxicity',
    severity: 'critical',
    titleFa: 'سیمواستاتین + کلاریترومایسین (منع مصرف مطلق)',
    titleEn: 'Simvastatin + Clarithromycin (Contraindicated)',
    clinicalOutcomeFa: 'افزایش ۱۰ برابری غلظت سیمواستاتین، ایجاد رابدومیولیز شدید، میوگلوبینوری و نارسایی حاد کلیه.',
    clinicalOutcomeEn: '>10-fold surge in simvastatin AUC, severe rhabdomyolysis and acute kidney injury.',
    managementFa: 'سیمواستاتین در طول دوره کلاریترومایسین قطع شود یا آنتی‌بیوتیک به آزیترومایسین تغییر یابد.',
    managementEn: 'Withhold simvastatin during course or switch to azithromycin.',
  },
  {
    drugA: 'Warfarin',
    drugB: 'Fluconazole',
    enzyme: 'CYP2C9',
    type: 'inhibition_toxicity',
    severity: 'critical',
    titleFa: 'وارفارین + فلوکونازول (افزایش شدید INR و خونریزی)',
    titleEn: 'Warfarin + Fluconazole (Severe INR Surge & Bleeding)',
    clinicalOutcomeFa: 'مهار شدید ایزومر فعال S-warfarin، افزایش چشمگیر INR ظرف ۴۸ ساعت و خطر خونریزی‌های تهدیدکننده حیات.',
    clinicalOutcomeEn: 'Potent CYP2C9 inhibition impairs S-warfarin clearance, causing major bleeding.',
    managementFa: 'دوز وارفارین ۵۰٪ کاهش یابد؛ پایش مکرر INR از روز دوم یا سوم شروع شود.',
    managementEn: 'Reduce warfarin dose by 50% and check INR on day 2-3.',
  },
  {
    drugA: 'Warfarin',
    drugB: 'Metronidazole',
    enzyme: 'CYP2C9',
    type: 'inhibition_toxicity',
    severity: 'critical',
    titleFa: 'وارفارین + مترونیدازول (جهش INR)',
    titleEn: 'Warfarin + Metronidazole (Marked INR Spike)',
    clinicalOutcomeFa: 'مهار اختصاصی متابولیسم S-warfarin و خطر خونریزی گوارشی یا مغزی.',
    clinicalOutcomeEn: 'Selective inhibition of S-warfarin metabolism causing acute over-anticoagulation.',
    managementFa: 'دوز وارفارین ۳۰ تا ۵۰ درصد کاهش داده شود و INR روز سوم چک گردد.',
    managementEn: 'Proactively reduce warfarin dose by 30-50% and recheck INR.',
  },
  {
    drugA: 'Clopidogrel',
    drugB: 'Omeprazole',
    enzyme: 'CYP2C19',
    type: 'prodrug_activation_failure',
    severity: 'high',
    titleFa: 'کلوپیدوگرل + امپرازول (شکست ضدپلاکتی و ترومبوز استنت)',
    titleEn: 'Clopidogrel + Omeprazole (Antiplatelet Attenuation & Stent Thrombosis)',
    clinicalOutcomeFa: 'مهار فعال‌سازی کلوپیدوگرل به فرم فعال، کاهش مهار پلاکتی و افزایش ریسک ترومبوز مجدد عروق کرونر.',
    clinicalOutcomeEn: 'Reduced clopidogrel active metabolite formation; increased recurrent cardiovascular events.',
    managementFa: 'امپرازول با پانتوپرازول (Pantoprazole) که کمترین تداخل CYP2C19 را دارد جایگزین شود.',
    managementEn: 'Substitute omeprazole with pantoprazole.',
  },
  {
    drugA: 'Digoxin',
    drugB: 'Amiodarone',
    enzyme: 'P-gp',
    type: 'inhibition_toxicity',
    severity: 'critical',
    titleFa: 'دیگوکسین + آمیودارون (مسمومیت دیگوکسین و آریتمی)',
    titleEn: 'Digoxin + Amiodarone (Digoxin Toxicity & Cardiac Arrest)',
    clinicalOutcomeFa: 'کاهش ۵۰ درصدی کلیرانس دیگوکسین ناشی از مهار پمپ P-gp، تهوع، اختلال بینایی (دید زرد) و بلوک قلبی شدید.',
    clinicalOutcomeEn: '50% reduction in digoxin clearance via P-gp blockade; triggers fatal ventricular arrhythmias.',
    managementFa: 'دوز دیگوکسین بلافاصله به نصف کاهش یابد و سطح سرمی TDM و الکترولیت‌ها (پتاسیم) پایش شود.',
    managementEn: 'Halve digoxin dose immediately and monitor serum digoxin levels & potassium.',
  },
  {
    drugA: 'Clozapine',
    drugB: 'Ciprofloxacin',
    enzyme: 'CYP1A2',
    type: 'inhibition_toxicity',
    severity: 'critical',
    titleFa: 'کلوزاپین + سیپروفلوکساسین (سمیت کلوزاپین و تشنج)',
    titleEn: 'Clozapine + Ciprofloxacin (Clozapine Toxicity & Seizures)',
    clinicalOutcomeFa: 'افزایش چند برابری غلظت کلوزاپین ناشی از مهار CYP1A2، خواب‌آلودگی شدید، تشنج و آریتمی قلبی.',
    clinicalOutcomeEn: 'Profound CYP1A2 inhibition elevates clozapine levels, causing coma and seizures.',
    managementFa: 'از تجویز سیپروفلوکساسین پرهیز شود؛ در صورت لزوم دوز کلوزاپین باید تا ۵۰-۷۵٪ کاهش یابد.',
    managementEn: 'Avoid ciprofloxacin; choose alternative antibiotic or reduce clozapine by 50-75%.',
  },
  {
    drugA: 'Tamoxifen',
    drugB: 'Fluoxetine',
    enzyme: 'CYP2D6',
    type: 'prodrug_activation_failure',
    severity: 'high',
    titleFa: 'تاموکسیفن + فلوکستین (کاهش اثر ضد سرطانی)',
    titleEn: 'Tamoxifen + Fluoxetine (Impaired Endoxifen Bioactivation)',
    clinicalOutcomeFa: 'مهار تبدیل تاموکسیفن به متابولیت فعال اندوکسیفن و افزایش احتمال عود سرطان پستان.',
    clinicalOutcomeEn: 'Blocks endoxifen generation, compromising anticancer efficacy and survival.',
    managementFa: 'فلوکستین/پاروکستین قطع شود؛ ونلافاکسین یا سیتالوپرام که تداخل CYP2D6 ندارند جایگزین گردد.',
    managementEn: 'Switch antidepressant to venlafaxine or citalopram.',
  },
  {
    drugA: 'Oral Contraceptive Pill',
    drugB: 'Rifampicin',
    enzyme: 'CYP3A4',
    type: 'induction_failure',
    severity: 'critical',
    titleFa: 'قرص ضدبارداری + ریفامپیسین (بارداری ناخواسته)',
    titleEn: 'Oral Contraceptives + Rifampicin (Contraceptive Failure)',
    clinicalOutcomeFa: 'القای شدید CYP3A4، تسریع متابولیسم اتینیل‌استرادیول و پروژستین‌ها و شکست پیشگیری از بارداری.',
    clinicalOutcomeEn: 'Massive induction of hepatic estrogen/progestin metabolism leading to unplanned pregnancy.',
    managementFa: 'استفاده از روش‌های غیرخوراکی مطمئن (مانند IUD مسی یا Mirena) در طول درمان و تا ۲۸ روز پس از قطع ریفامپیسین الزامی است.',
    managementEn: 'Use non-hormonal or intrauterine barrier methods (IUD) during and for 28 days post-therapy.',
  },
  {
    drugA: 'Metoprolol',
    drugB: 'Fluoxetine',
    enzyme: 'CYP2D6',
    type: 'inhibition_toxicity',
    severity: 'moderate',
    titleFa: 'متوپرولول + فلوکستین (برادی‌کاردی و افت شدید فشار خون)',
    titleEn: 'Metoprolol + Fluoxetine (Severe Bradycardia & Hypotension)',
    clinicalOutcomeFa: 'افزایش ۳ تا ۵ برابری سطح خونی متوپرولول، برادی‌کاردی علامت‌دار و خستگی مفرط.',
    clinicalOutcomeEn: '3-5 fold increase in metoprolol exposure causing marked bradycardia and heart block.',
    managementFa: 'پایش ضربان قلب و فشار خون؛ در صورت نیاز کاهش دوز متوپرولول یا جایگزینی با آتنولول/بیزوپرولول.',
    managementEn: 'Monitor HR and BP; consider atenolol or bisoprolol which have minimal CYP2D6 clearance.',
  },
];
