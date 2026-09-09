import { CONCISE_DRUG_DATABASE, ConciseDrugInfo } from '@/components/MechanismPopover';
import { SHELF_PRODUCTS } from '@/data/shelf/shelfProducts';

export interface EnrichedDrugMonograph {
  fullName: {
    fa: string;
    en: string;
  };
  genericName: string;
  brandNames: string[];
  mechanism: {
    fa: string;
    en: string;
  };
  keyPearls: {
    fa: string[];
    en: string[];
  };
  dosageSummary?: {
    fa: string;
    en: string;
  };
  tierLabel: {
    fa: string;
    en: string;
  };
  tierType: 'first-line' | 'second-line' | 'adjunctive';
}

// Comprehensive registry of quick concise mechanisms for all Australian OTC & Guideline Pharmacotherapies
const CLINICAL_MECHANISMS_DICT: Record<string, { fa: string; en: string }> = {
  // Respiratory
  'salbutamol': {
    fa: 'آگونیست انتخابی گیرنده‌های بتا-۲ آدرنرژیک با افزایش cAMP درون‌سلولی، شل شدن عضلات صاف برونش و گشادی سریع مجاری تنفسی.',
    en: 'Selective beta-2 adrenergic agonist stimulating intracellular adenylate cyclase / cAMP, causing rapid bronchial smooth muscle relaxation.',
  },
  'tiotropium': {
    fa: 'آنتاگونیست موسکارینی طولانی‌اثر (LAMA) با مهار گیرنده‌های M3 در عضله صاف راه‌های هوایی و مهار انقباض ناشی از استیل‌کولین.',
    en: 'Long-acting muscarinic antagonist (LAMA) blocking M3 receptors in airway smooth muscle, preventing acetylcholine-induced bronchoconstriction.',
  },
  'ipratropium': {
    fa: 'آنتاگونیست موسکارینی کوتاه‌اثر (SAMA) با بلوک غیرانتخابی گیرنده‌های استیل‌کولینی در برونش و کاهش تون واگ و برونکواسپاسم.',
    en: 'Short-acting muscarinic antagonist (SAMA) competitively blocking acetylcholine receptors in bronchial smooth muscle.',
  },
  'budesonide': {
    fa: 'کورتیکواستروئید استنشاقی با مهار رونویسی سیتوکین‌های پیش‌التهابی، مهار ائوزینوفیل‌ها و کاهش نفوذپذیری عروق راه‌های هوایی.',
    en: 'Inhaled corticosteroid (ICS) inhibiting inflammatory gene expression, decreasing airway hyperresponsiveness and mucosal swelling.',
  },
  'fluticasone': {
    fa: 'گلوکوکورتیکوئید سنتتیک پرقدرت با میل اتصالی بالا به گیرنده‌های استروئیدی، سرکوب مهاجرت سلول‌های التهابی و کاهش مخاط برونش.',
    en: 'Potent synthetic glucocorticoid with high receptor affinity, suppressing mucosal inflammation and reducing airway remodeling.',
  },
  'salmeterol': {
    fa: 'آگونیست بتا-۲ آدرنرژیک طولانی‌اثر (LABA) با تحریک پایدار گیرنده‌های بتا-۲ و اتساع مداوم ۱۲ ساعته برونش‌ها.',
    en: 'Long-acting beta-2 agonist (LABA) providing sustained 12-hour bronchodilation via continuous adenylate cyclase activation.',
  },
  'formoterol': {
    fa: 'آگونیست بتا-۲ با شروع اثر سریع و طول اثر طولانی (Fast & Long acting LABA) جهت گشادی مجاری تنفسی در درمان نگهدارنده و نجات‌بخش.',
    en: 'Rapid- and long-acting beta-2 agonist delivering prompt and sustained bronchodilation suitable for SMART / MART protocols.',
  },
  'montelukast': {
    fa: 'آنتاگونیست انتخابی گیرنده لکوترین D4 (CysLT1) با مهار انقباض برونش ناشی از لکوترین‌ها و مهار التهاب ائوزینوفیلیک.',
    en: 'Selective cysteinyl leukotriene receptor antagonist (CysLT1 blocker) preventing leukotriene-mediated bronchoconstriction and airway edema.',
  },
  'umeclidinium': {
    fa: 'آنتاگونیست موسکارینی طولانی‌اثر (LAMA) با مهار گیرنده‌های M3 راه‌های هوایی و بهبود جریان بازدمی در COPD.',
    en: 'Long-acting muscarinic antagonist providing durable 24-hour bronchodilation in chronic obstructive pulmonary disease.',
  },
  'vilanterol': {
    fa: 'آگونیست بتا-۲ فوق‌طولانی‌اثر (Ultra-LABA) با تحریک مداوم و ۲۴ ساعته گیرنده‌های بتا-۲ در اینهیلرهای ترکیبی سه‌گانه.',
    en: 'Ultra-long-acting beta-2 agonist delivering once-daily bronchodilation when co-formulated in combination inhalers.',
  },

  // Cardiovascular & Hypertension
  'perindopril': {
    fa: 'مهارکننده آنزیم مبدل آنژیوتانسین (ACE inhibitor) با مهار تبدیل آنژیوتانسین I به II، کاهش مقاومت عروق و کاهش بار پس‌قلب.',
    en: 'Angiotensin-Converting Enzyme (ACE) inhibitor decreasing angiotensin II formation, reducing peripheral arterial resistance and afterload.',
  },
  'ramipril': {
    fa: 'مهارکننده پرقدرت ACE با کاهش وازوکنستریکشن بافتی و کاهش بازجذب سدیم و آب، محافظت از عروق کرونر و کلیه.',
    en: 'Potent ACE inhibitor reducing vascular resistance, attenuating cardiac remodeling, and delivering renal protection.',
  },
  'telmisartan': {
    fa: 'مسدودکننده انتخابی گیرنده‌های آنژیوتانسین II (ARB نوع AT1) با نیمه‌عمر طولانی (۲۴ ساعت) و تحریک آگونیستی جزئی گیرنده PPAR-gamma.',
    en: 'Selective Angiotensin II Type-1 (AT1) receptor blocker with 24-hour half-life and partial PPAR-gamma modulation.',
  },
  'valsartan': {
    fa: 'مسدودکننده اختصاصی گیرنده AT1 آنژیوتانسین II با مهار اثرات انقباض عروقی و ترشح آلدوسترون بدون افزایش برادی‌کینین.',
    en: 'Specific AT1 receptor antagonist blocking vasoconstriction and aldosterone release without causing bradykinin accumulation (no dry cough).',
  },
  'sacubitril': {
    fa: 'مهارکننده آنزیم نپری‌لیزین (Neprilysin inhibitor) با افزایش پپتیدهای ناتریورتیک اندوژن (ANP/BNP)، افزایش ناتریورز و اتساع عروقی.',
    en: 'Neprilysin inhibitor preventing degradation of natriuretic peptides (ANP, BNP, bradykinin), promoting vasodilation and natriuresis.',
  },
  'amlodipine': {
    fa: 'مسدودکننده دی‌هیدروپیریدینی کانال‌های کلسیمی نوع L با مهار ورود کلسیم به عضله صاف عروق محیطی و ایجاد وازودیلاتاسیون شریانی.',
    en: 'Dihydropyridine L-type calcium channel blocker relaxing arterial smooth muscle, reducing systemic vascular resistance and blood pressure.',
  },
  'indapamide': {
    fa: 'دیورتیک شبه‌تیازیدی با مهار بازجذب سدیم و کلر در توبول دیستال کلیه و اتساع مستقیم عروق محیطی با اثرات خنثای متابولیک.',
    en: 'Thiazide-like diuretic inhibiting sodium/chloride cotransporter in the distal convoluted tubule and exerting direct arterial vasodilatation.',
  },
  'hydrochlorothiazide': {
    fa: 'دیورتیک تیازیدی با مهار سیمپورتر سدیم-کلر (NCC) در توبول دیستال کلیه، افزایش دفع ادراری سدیم و کاهش حجم داخل عروقی.',
    en: 'Thiazide diuretic inhibiting Na+/Cl- cotransporter in the renal distal tubule, promoting natriuresis and mild volume reduction.',
  },
  'bisoprolol': {
    fa: 'مسدودکننده بسیار انتخابی گیرنده‌های بتا-۱ قلبی (Cardioselective Beta-1 Blocker) با کاهش تعداد ضربان، کاهش کار قلب و کاهش مرگ‌ومیر نارسایی قلبی.',
    en: 'Highly selective beta-1 adrenergic blocker reducing heart rate, myocardial oxygen demand, and mortality in systolic heart failure.',
  },
  'metoprolol': {
    fa: 'مسدودکننده انتخابی بتا-۱ آدرنرژیک با کاهش سرعت هدایت در گره دهلیزی-بطنی (AV Node) و کنترل ضربان در فیبریلاسیون دهلیزی.',
    en: 'Cardioselective beta-1 blocker slowing AV nodal conduction and providing rate control in supraventricular arrhythmias and ischemic heart disease.',
  },
  'spironolactone': {
    fa: 'آنتاگونیست رقابتی گیرنده‌های آلدوسترون (MRA) در لوله جمع‌کننده قشر کلیه، مهار فیبروز میوکارد و حفظ پتاسیم سرم.',
    en: 'Mineralocorticoid receptor antagonist (MRA) blocking aldosterone-dependent Na+/K+ exchange in collecting ducts and attenuating myocardial fibrosis.',
  },
  'frusemide': {
    fa: 'دیورتیک لوپ پرقدرت با مهار سیمپورتر Na+/K+/2Cl- در بخش ضخیم قوس صعودی لوله هنله و دفع سریع آب و نمک در ادم و احتقان ریوی.',
    en: 'High-ceiling loop diuretic inhibiting Na+/K+/2Cl- symporter in the thick ascending limb of Henle, producing potent natriuresis and diuresis.',
  },
  'digoxin': {
    fa: 'مهارکننده پمپ Na+/K+-ATPase در سلول‌های قلبی، افزایش کلسیم درون‌سلولی (افزایش قدرت انقباض اینوتروپیک) و افزایش تون واگ بر گره AV.',
    en: 'Inhibits cardiac Na+/K+-ATPase pump, increasing intracellular calcium for positive inotropy, and increases vagal tone to slow AV nodal rate.',
  },

  // Anticoagulants
  'apixaban': {
    fa: 'مهارکننده مستقیم، انتخابی و برگشت‌پذیر فاکتور انعقادی Xa آزاد و متصل به لخته، بدون نیاز به آنتی‌ترومبین III.',
    en: 'Direct, selective, and reversible inhibitor of free and clot-bound coagulation Factor Xa, suppressing thrombin generation.',
  },
  'rivaroxaban': {
    fa: 'مهارکننده مستقیم فاکتور Xa با فراهمی زیستی وابسته به غذا (برای دوزهای بالا)، مهار تشکیل ترومبین و پیشگیری از آمبولی.',
    en: 'Oral direct Factor Xa inhibitor preventing prothrombinase complex activation and systemic thromboembolism.',
  },
  'warfarin': {
    fa: 'مهارکننده آنزیم ویتامین K اپوکسید ردوکتاز (VKORC1) با توقف سنتز کبدی فاکتورهای انعقادی وابسته به ویتامین K (فاکتورهای II, VII, IX, X).',
    en: 'Vitamin K antagonist inhibiting VKORC1, depleting functional coagulation factors II, VII, IX, and X and anticoagulant proteins C and S.',
  },

  // Dyslipidemia
  'atorvastatin': {
    fa: 'مهارکننده پرقدرت و رقابتی آنزیم HMG-CoA ردوکتاز، کاهش سنتز کلسترول کبدی، افزایش بیان گیرنده‌های LDL و پاکسازی کلسترول از گردش خون.',
    en: 'Potent competitive inhibitor of HMG-CoA reductase, upregulating hepatic LDL receptors and clearing atherogenic ApoB lipoproteins.',
  },
  'rosuvastatin': {
    fa: 'مهارکننده هیدروفیلیک و با توان بالای آنزیم HMG-CoA ردوکتاز با کاهش بیش از ۵۰٪ سطح کلسترول LDL و افزایش کلسترول HDL.',
    en: 'High-intensity hydrophilic statin delivering robust LDL-C reduction with minimal CYP3A4 metabolic drug interactions.',
  },
  'ezetimibe': {
    fa: 'مهارکننده اختصاصی پروتئین ناقل Niemann-Pick C1-Like 1 (NPC1L1) در پرزهای روده باریک و مسدود کردن جذب کلسترول رژیمی و صفراوی.',
    en: 'Inhibits the NPC1L1 cholesterol transport protein at the brush border of the small intestine, reducing dietary and biliary cholesterol absorption.',
  },
  'fenofibrate': {
    fa: 'آگونیست گیرنده هسته‌ای PPAR-alpha، فعال‌کننده لیپوپروتئین لیپاز و اکسیداسیون اسیدهای چرب و کاهش شدید تری‌گلیسریدهای سرم.',
    en: 'Peroxisome proliferator-activated receptor-alpha (PPAR-alpha) agonist accelerating triglyceride clearance and elevating HDL-C.',
  },

  // Diabetes Mellitus
  'metformin': {
    fa: 'بی‌گوانید با فعال‌سازی آنزیم AMPK، مهار گلوکونئوژنز کبدی، بهبود حساسیت به انسولین در بافت‌های محیطی و کاهش جذب روده‌ای گلوکز.',
    en: 'Biguanide activating hepatic AMPK, suppressing gluconeogenesis, enhancing peripheral insulin sensitivity, and slowing intestinal glucose absorption.',
  },
  'empagliflozin': {
    fa: 'مهارکننده انتخابی کوترانسپورتر گلوکز-سدیم نوع ۲ (SGLT2) در توبول پروگزیمال کلیه، دفع قند از ادرار (گلوکوزوری) و کاهش فشار خون و وزن.',
    en: 'Selective SGLT2 inhibitor in the renal proximal tubule, promoting urinary glucose and sodium excretion, lowering HbA1c and cardiorenal events.',
  },
  'dapagliflozin': {
    fa: 'مهارکننده SGLT2 کلیوی با افزایش دفع گلوکز و سدیم، کاهش فشار داخل گلومرولی و بهبود عملکرد بطن قلب و کاهش بستری نارسایی قلبی.',
    en: 'SGLT2 inhibitor reducing renal glucose reabsorption, lowering intraglomerular pressure, and improving heart failure and CKD outcomes.',
  },
  'semaglutide': {
    fa: 'آگونیست طولانی‌اثر گیرنده GLP-1 با تحریک ترشح انسولین وابسته به گلوکز، سرکوب گلوکاگون، تاخیر در تخلیه معده و القای حس سیری مرکزی.',
    en: 'Long-acting GLP-1 receptor agonist stimulating glucose-dependent insulin secretion, suppressing glucagon, delaying gastric emptying, and reducing appetite.',
  },
  'sitagliptin': {
    fa: 'مهارکننده اختصاصی آنزیم دی‌پپتیدیل پپتیداز-۴ (DPP-4i) با حفظ اینکرتین‌های طبیعی اندوژن (GLP-1 و GIP) و تنظیم فیزیولوژیک ترشح انسولین.',
    en: 'Dipeptidyl peptidase-4 (DPP-4) inhibitor preventing incretin degradation, prolonging active GLP-1 and GIP signaling postprandially.',
  },
  'gliclazide': {
    fa: 'سولفونیل‌اوره نسل دوم با اتصال به گیرنده‌های SUR1 در سلول‌های بتای پانکراس، بستن کانال‌های پتاسیمی حساس به ATP و تحریک ترشح انسولین.',
    en: 'Second-generation sulfonylurea binding pancreatic beta-cell SUR1 receptors to close ATP-sensitive potassium channels and trigger insulin release.',
  },

  // Thyroid
  'levothyroxine': {
    fa: 'هورمون تیروکسین سنتتیک (T4) که در بافت‌های محیطی به هورمون فعال T3 تبدیل شده و با اتصال به گیرنده‌های هسته‌ای، متابولیسم سلولی را تنظیم می‌کند.',
    en: 'Synthetic levothyroxine (T4) deiodinated peripherally to active triiodothyronine (T3), binding nuclear receptors to regulate metabolic rate.',
  },

  // Bone & Osteoporosis
  'alendronate': {
    fa: 'بیس‌فسفونات با میل اتصالی قوی به هیدروکسی‌آپاتیت استخوان، مهار آنزیم فارنسیل پیروفسفات سنتاز (FPPS) در استئوکلاست‌ها و مهار بازجذب استخوان.',
    en: 'Nitrogenous bisphosphonate binding bone hydroxyapatite, inhibiting osteoclastic farnesyl pyrophosphate synthase and preventing bone loss.',
  },
  'denosumab': {
    fa: 'آنتی‌بادی مونوکلونال انسانی متصل‌شونده اختصاصی به لیگاند RANK (RANKL)، مهار تمایز و بقای استئوکلاست‌ها و افزایش تراکم معدنی استخوان.',
    en: 'Human monoclonal antibody targeting receptor activator of nuclear factor-kappa B ligand (RANKL), blocking osteoclastogenesis and bone resorption.',
  },
  'zoledronic acid': {
    fa: 'بیس‌فسفونات پرقدرت تزریقی سالانه با جذب سریع در ماتریکس استخوان و مهار طولانی‌مدت بازجذب استخوانی ناشی از استئوکلاست‌ها.',
    en: 'Potent intravenous nitrogenous bisphosphonate delivering durable 12-month osteoclast suppression and fracture risk reduction.',
  },

  // Pain, Gout & Migraine
  'colchicine': {
    fa: 'اتصال به توبولین و مهار پلیمریزاسیون میکروتوبول‌ها، مهار مهاجرت نوتروفیل‌ها و فعال‌سازی اینفلامازوم NLRP3 در پاسخ به کریستال‌های اورات.',
    en: 'Binds to tubulin inhibiting microtubule assembly, neutrophil chemotaxis, and NLRP3 inflammasome activation in gouty synovitis.',
  },
  'allopurinol': {
    fa: 'مهارکننده آنزیم گزانتین اکسیداز با کاهش تولید اسید اوریک از هیپوگزانتین و گزانتین و حل کردن تدریجی کریستال‌های توفوس.',
    en: 'Competitive inhibitor of xanthine oxidase, blocking conversion of hypoxanthine and xanthine to uric acid.',
  },
  'febuxostat': {
    fa: 'مهارکننده غیرپورینی و فوق‌العاده اختصاصی آنزیم گزانتین اکسیداز با کاهش سریع و پایدار اسید اوریک سرم در نقرس مزمن.',
    en: 'Non-purine selective inhibitor of xanthine oxidase providing potent urate reduction in allopurinol-intolerant patients.',
  },
  'sumatriptan': {
    fa: 'آگونیست انتخابی گیرنده‌های سروتونینی 5-HT 1B/1D در عروق کرانیال و اعصاب تری‌ژمینال، انقباض عروق مغزی و مهار رهایش واسطه‌های CGRP.',
    en: 'Selective 5-HT 1B/1D receptor agonist causing cranial vasoconstriction and inhibiting sensory trigeminal neuropeptide (CGRP) release.',
  },
  'naproxen': {
    fa: 'مهارکننده غیراختصاصی COX-1 و COX-2 با نیمه‌عمر طولانی (۱۲ تا ۱۵ ساعت)، کاهش سنتز پروستاگلاندین‌ها و تسکین دردهای التهابی و میگرنی.',
    en: 'Long-acting non-selective NSAID inhibiting COX-1 and COX-2 enzymes to deliver sustained analgesia and anti-inflammatory action.',
  },
  'propranolol': {
    fa: 'بتابلوکر غیراختصاصی با نفوذ عالی به سیستم اعصاب مرکزی، تثبیت تون عروق مغزی و مهار فعال‌سازی سیستم تری‌ژمینواسکولار در پیشگیری از میگرن.',
    en: 'Non-selective beta-blocker with central nervous system penetration modulating cortical spreading depression and vascular tone in migraine.',
  },

  // Central Nervous System & Psychiatric
  'escitalopram': {
    fa: 'مهارکننده اختصاصی بازجذب سروتونین (SSRI) با بالاترین خلوص اتصالی به ناقل SERT، افزایش غلظت سروتونین در سیناپس‌های عصبی و بهبود خلق.',
    en: 'Highly selective serotonin reuptake inhibitor (SSRI) blocking SERT, enhancing synaptic 5-HT neurotransmission with minimal off-target binding.',
  },
  'sertraline': {
    fa: 'مهارکننده انتخابی بازجذب سروتونین (SSRI) همراه با مهار ضعیف بازجذب دوپامین، ایمن در بیماران قلبی و مناسب در دوران شیردهی.',
    en: 'Selective serotonin reuptake inhibitor (SSRI) with minor dopamine transport inhibition, proven safety post-MI and in lactation.',
  },
  'venlafaxine': {
    fa: 'مهارکننده بازجذب سروتونین و نورآدرنالین (SNRI) با اثر دوگانه بر مدارهای خلقی مغز و مسیرهای نزولی مهار درد.',
    en: 'Dual Serotonin and Noradrenaline Reuptake Inhibitor (SNRI) augmenting both monoamines to treat major depression and chronic pain.',
  },
  'mirtazapine': {
    fa: 'آنتاگونیست گیرنده‌های آلفا-۲ آدرنرژیک مرکزی و گیرنده‌های 5-HT2 و 5-HT3 با افزایش رهایش نورآدرنالین و سروتونین و اثر آرام‌بخش وابسته به H1.',
    en: 'Central alpha-2 antagonist and 5-HT2/5-HT3 blocker enhancing noradrenergic and serotonergic release with sedative H1 antihistaminic properties.',
  },
  'melatonin': {
    fa: 'آگونیست انتخابی گیرنده‌های ملاتونرژیک MT1 و MT2 در هسته سوپراکایاسماتیک (SCN) هیپوتالاموس، تنظیم ریتم شبانه‌روزی و تسهیل شروع خواب.',
    en: 'Receptor agonist at MT1 and MT2 in the hypothalamic suprachiasmatic nucleus, synchronizing the circadian sleep-wake cycle.',
  },
  'doxylamine': {
    fa: 'آنتی‌هیستامین نسل اول با عبور از سد خونی-مغزی و مهار گیرنده‌های هیستامینی H1 در سیستم فعال‌کننده مشبک مغز و القای خواب‌آلودگی سریع.',
    en: 'First-generation H1 receptor antagonist penetrating the blood-brain barrier to depress the reticular activating system and induce sedation.',
  },
  'temazepam': {
    fa: 'آگونیست آلوستریک گیرنده‌های GABAA در سیستم عصبی مرکزی با افزایش ورود یون کلرید، هایپرپلاریزاسیون نورونی و القای سریع خواب.',
    en: 'Short-to-intermediate acting benzodiazepine positive allosteric modulator of GABA-A receptors enhancing inhibitory neurotransmission.',
  },
  'pregabalin': {
    fa: 'اتصال به زیرواحد کمکی alpha-2-delta کانال‌های کلسیمی وابسته به ولتاژ در شاخ خلفی نخاع، کاهش ورود کلسیم و مهار رهایش گلوتامات و ماده P.',
    en: 'Binds voltage-gated calcium channel alpha-2-delta auxiliary subunits, decreasing calcium influx and excitatory neurotransmitter release in neuropathic pain.',
  },
  'amitriptyline': {
    fa: 'ضدافسردگی سه‌حلقه‌ای با مهار بازجذب سروتونین و نورآدرنالین و تقویت مسیرهای مهاری نزولی درد در طناب نخاعی.',
    en: 'Tricyclic agent blocking serotonin/noradrenaline transporters and potentiating descending spinal inhibitory pain pathways.',
  },
  'duloxetine': {
    fa: 'مهارکننده متعادل بازجذب سروتونین و نورآدرنالین (SNRI) با اثربخشی اثبات‌شده در کاهش دردهای سوزشی نوروپاتی دیابتی.',
    en: 'Balanced SNRI augmenting spinal descending noradrenergic and serotonergic inhibition to relieve neuropathic pain symptoms.',
  },
  'capsaicin': {
    fa: 'آگونیست گیرنده‌های پتانسیل گذرا TRPV1 در پایانه‌های حسی C، تحریک اولیه و تخلیه طولانی‌مدت ذخایر Substance P و ایجاد بی‌حسی موضعی در درد عصب.',
    en: 'TRPV1 receptor agonist depleting substance P from sensory nociceptors and desensitizing local pain fibers.',
  },

  // OTC & Primary Care Core Mechanisms
  'benzoyl peroxide': {
    fa: 'آنتی‌باکتریال و کومدولیتیک موضعی با آزادسازی رادیکال‌های آزاد اکسیژن و نابودی باکتری Cutibacterium acnes و لایه‌برداری ملایم.',
    en: 'Topical antibacterial and comedolytic agent releasing reactive oxygen species to kill Cutibacterium acnes and promote follicular desquamation.',
  },
  'azelaic acid': {
    fa: 'مهارکننده سنتز پروتئین باکتریایی و کاهش هایپرکراتینیزاسیون فولیکولی همراه با مهار تیروزیناز و کاهش لکه‌های پوستی.',
    en: 'Inhibits follicular hyperkeratinization and microbial cellular protein synthesis, plus competitive tyrosinase inhibition reducing hyperpigmentation.',
  },
  'glyceryl trinitrate': {
    fa: 'اهداکننده اکسید نیتریک (NO) با تحریک گوانین سیکلاز، کاهش کلسیم درون‌سلولی، شل کردن اسفنکتر داخلی مقعد و افزایش خون‌رسانی موضعی.',
    en: 'Nitric oxide (NO) donor that relaxes internal anal sphincter smooth muscle, reduces hypertonicity, and restores microvascular perfusion.',
  },
  'rectogesic': {
    fa: 'اهداکننده اکسید نیتریک (NO) با شل کردن اسفنکتر مقعد و کاهش فشار داخل کانال جهت تسکین درد و ترمیم شقاق.',
    en: 'Nitric oxide (NO) donor relaxing the internal anal sphincter to improve anoderm perfusion and facilitate fissure healing.',
  },
  'hydrocortisone': {
    fa: 'کورتیکواستروئید موضعی با سرکوب مهاجرت لکوسیت‌ها، مهار فسفولیپاز A2 و کاهش سنتز سایتوکاین‌های پیش‌التهابی.',
    en: 'Mild topical corticosteroid inhibiting phospholipase A2 and pro-inflammatory cytokine transcription to relieve itching and swelling.',
  },
  'cinchocaine': {
    fa: 'بی‌حس‌کننده موضعی با بلوک کانال‌های سدیمی وابسته به ولتاژ و مهار هدایت پیام‌های درد در انتهای اعصاب حسی.',
    en: 'Local anesthetic blocking voltage-gated sodium channels, preventing initiation and conduction of sensory pain impulses.',
  },
  'mometasone': {
    fa: 'کورتیکواستروئید قوی داخل بینی با مهار رونویسی میانجی‌های التهابی (لوکوترین‌ها و پروستاگلاندین‌ها) در مخاط بینی.',
    en: 'Potent topical glucocorticosteroid with anti-inflammatory and vasoconstrictive properties on nasal mucosa.',
  },
  'azelastine': {
    fa: 'آنتاگونیست انتخابی گیرنده H1 هیستامینی و پایدارکننده ماست‌سل‌ها با شروع اثر فوق‌العاده سریع (۱۵ دقیقه).',
    en: 'Second-generation histamine H1-receptor antagonist and mast cell stabilizer with rapid onset of action within 15 minutes.',
  },
  'esomeprazole': {
    fa: 'مهارکننده اختصاصی و غیرقابل برگشت پمپ پروتون (H+/K+-ATPase) در سلول‌های پاریتال معده و سرکوب قوی ترشح اسید.',
    en: 'Proton pump inhibitor irreversibly binding to active H+/K+-ATPase sulfhydryl groups in parietal cells, suppressing basal and stimulated acid secretion.',
  },
  'clotrimazole': {
    fa: 'ضدقارچ ایمیدازول با مهار آنزیم سیتوکروم P450 14α-دمتیلاز، توقف ساخت ارگوسترول و ناپایداری غشای سلولی قارچ.',
    en: 'Imidazole antifungal inhibiting fungal cytochrome P450 14-alpha-demethylase, disrupting fungal cell membrane ergosterol synthesis.',
  },
  'fluconazole': {
    fa: 'تری‌آزول سیستمیک انتخابی با نفوذ بافتی عالی و مهار بیوسنتز ارگوسترول قارچی در گونه‌های حساس کاندیدا.',
    en: 'Highly selective systemic triazole inhibitor of fungal CYP51, blocking ergosterol synthesis in Candida species.',
  },
  'terbinafine': {
    fa: 'مهارکننده قوی آنزیم اسکوالن اپوکسیداز با ایجاد سمیت داخل‌سلولی با تجمع اسکوالن و تخریب مستقیم دیواره سلولی قارچ (قارچ‌کش).',
    en: 'Allylamine antifungal inhibiting squalene epoxidase, causing fungicidal accumulation of toxic squalene and ergosterol deficiency.',
  },
  'calcipotriol': {
    fa: 'آنالوگ مصنوعی ویتامین D3 با اتصال به گیرنده‌های VDR و تنظیم تمایز و مهار تکثیر بیش از حد کراتینوسیت‌های پوست.',
    en: 'Synthetic vitamin D3 analogue binding to epidermal VDR to normalize keratinocyte proliferation and differentiation in psoriasis.',
  },
  'betamethasone': {
    fa: 'کورتیکواستروئید قوی با سرکوب رونویسی واسطه‌های پیش‌التهابی، مهار نفوذ سلول‌های ایمنی و رفع ضایعات پسوریازیس.',
    en: 'Potent corticosteroid delivering local immunosuppressive, anti-inflammatory, and vasoconstrictive actions.',
  },
  'paracetamol': {
    fa: 'مهارکننده سنتز پروستاگلاندین‌ها در سیستم عصبی مرکزی (احتمالاً از طریق آنزیم COX-3/COX-1b) و اثر بر مسیرهای سروتونرژیک نزولی درد و مرکز تنظیم دمای هیپوتالاموس.',
    en: 'Inhibits central prostaglandin synthesis in the CNS and modulates descending serotonergic inhibitory pain pathways and hypothalamic thermoregulatory center.',
  },
  'ibuprofen': {
    fa: 'مهارکننده غیراختصاصی آنزیم‌های سیکلواکسیژناز (COX-1 و COX-2) و مهار تبدیل آراشیدونیک اسید به پروستاگلاندین‌های مولد درد و التهاب.',
    en: 'Reversible non-selective inhibitor of cyclooxygenase enzymes (COX-1 and COX-2), reducing synthesis of pro-inflammatory prostaglandins.',
  },
  'loperamide': {
    fa: 'آگونیست انتخابی گیرنده‌های مو-اوپیوئیدی (µ-opioid) در شبکه عصبی روده، مهار حرکات دودی (پریستالسیس)، افزایش زمان ترانزیت و افزایش بازجذب آب و الکترولیت‌ها.',
    en: 'Selective mu-opioid receptor agonist in the myenteric plexus, slowing gastrointestinal motility, increasing transit time, and enhancing fluid absorption.',
  },
  'mebendazole': {
    fa: 'اتصال انتخابی به زیرواحد بتا-توبولین در انگل، مهار پلیمریزاسیون میکروتوبول‌ها و مسدود کردن جذب گلوکز و تخلیه ذخایر گلیکوژن در کرم‌های انگلی.',
    en: 'Binds to helminthic beta-tubulin, selectively inhibiting microtubule polymerization and blocking glucose uptake to starve the parasite.',
  },
  'permethrin': {
    fa: 'تثبیت‌کننده کانال‌های سدیمی در غشای سلول‌های عصبی بندپایان (انگل جرب و شپش)، مهار رپلاریزاسیون، ایجاد فلج اسپاستیک و مرگ حشره.',
    en: 'Neurotoxin stabilizing neuronal voltage-gated sodium channels in arthropods, delaying repolarization, causing paralysis and death.',
  },
  'chloramphenicol': {
    fa: 'اتصال برگشت‌پذیر به زیرواحد 50S ریبوزوم باکتری و مهار تشکیل پیوند پپتیدی توسط پپتیدیل ترانسفراز و توقف سنتز پروتئین باکتریایی.',
    en: 'Binds reversibly to the 50S ribosomal subunit, inhibiting peptidyl transferase and blocking bacterial protein synthesis.',
  },
};

export function resolveDrugMonographDetails(
  rawName: string,
  rawBrands: string,
  rawDosing?: string,
  rawExtra?: string,
  tier: 'first-line' | 'second-line' | 'adjunctive' = 'adjunctive'
): EnrichedDrugMonograph {
  const norm = (rawName || '').toLowerCase().trim();
  const brandsNorm = (rawBrands || '').toLowerCase().trim();

  // 1. Search shelf products for exact matching
  const matchingShelfProd = SHELF_PRODUCTS.find(p => {
    const pGeneric = p.genericName.toLowerCase();
    const pBrand = p.brandName.toLowerCase();
    return norm.includes(pGeneric) || pGeneric.includes(norm) ||
           brandsNorm.includes(pBrand) || pBrand.includes(brandsNorm);
  });

  // 2. Search concise database
  let conciseInfo: ConciseDrugInfo | undefined;
  for (const key of Object.keys(CONCISE_DRUG_DATABASE)) {
    if (norm.includes(key) || brandsNorm.includes(key) || key.includes(norm)) {
      conciseInfo = CONCISE_DRUG_DATABASE[key];
      break;
    }
  }

  // 3. Search clinical mechanisms dict
  let customMech: { fa: string; en: string } | undefined;
  for (const key of Object.keys(CLINICAL_MECHANISMS_DICT)) {
    if (norm.includes(key) || brandsNorm.includes(key) || key.includes(norm)) {
      customMech = CLINICAL_MECHANISMS_DICT[key];
      break;
    }
  }

  // Resolve Mechanism
  const mechanismFa = customMech?.fa || conciseInfo?.mechanismFa || (
    matchingShelfProd
      ? `داروی اختصاصی شاخه درمانی استرالیا با اثر تنظیمی بر گیرنده‌ها و واسطه‌های بیولوژیک مرتبط.`
      : 'مهار یا تعدیل فرآیندهای پاتوفیزیولوژیک بیماری مطابق با فارماکوپه داروسازی استرالیا (APF).'
  );

  const mechanismEn = customMech?.en || conciseInfo?.mechanismEn || (
    matchingShelfProd
      ? `Pharmacotherapeutic agent modulating biological targets and inflammatory pathways per Australian standards.`
      : 'Modulates disease pathophysiology in accordance with Australian Pharmacy Formulary (APF).'
  );

  // Resolve Key Pearls / Points
  const keyPearlsFa: string[] = [];
  const keyPearlsEn: string[] = [];

  if (matchingShelfProd?.counselingPoints) {
    matchingShelfProd.counselingPoints.forEach(cp => {
      if (cp.fa) keyPearlsFa.push(cp.fa);
      if (cp.en) keyPearlsEn.push(cp.en);
    });
  }

  if (conciseInfo?.cautionFa && !keyPearlsFa.includes(conciseInfo.cautionFa)) {
    keyPearlsFa.push(conciseInfo.cautionFa);
  }
  if (conciseInfo?.cautionEn && !keyPearlsEn.includes(conciseInfo.cautionEn)) {
    keyPearlsEn.push(conciseInfo.cautionEn);
  }

  if (rawExtra) {
    const rawLines = rawExtra.split(/\n|\.\s+/).map(l => l.trim()).filter(l => l.length > 5);
    rawLines.forEach(l => {
      if (!keyPearlsFa.includes(l) && !keyPearlsEn.includes(l)) {
        keyPearlsFa.push(l);
      }
    });
  }

  // Resolve Tier Labels
  let tierLabelFa = '💊 داروی کمکی / OTC مجاز';
  let tierLabelEn = '💊 Adjunctive / Approved OTC';

  if (tier === 'first-line') {
    tierLabelFa = '🥇 خط اول درمان استاندارد (First-Line Standard)';
    tierLabelEn = '🥇 First-Line Standard Pharmacotherapy';
  } else if (tier === 'second-line') {
    tierLabelFa = '🥈 خط دوم / درمان جایگزین (Second-Line / Alternative)';
    tierLabelEn = '🥈 Second-Line / Alternative Therapy';
  }

  // Resolve Full Clean Names
  const fullEn = matchingShelfProd?.brandName 
    ? `${rawName} (${matchingShelfProd.brandName})` 
    : (conciseInfo?.nameEn || rawName);
    
  const fullFa = conciseInfo?.nameFa 
    ? conciseInfo.nameFa 
    : `${rawName} ${rawBrands ? `(برند: ${rawBrands})` : ''}`;

  return {
    fullName: {
      fa: fullFa,
      en: fullEn,
    },
    genericName: matchingShelfProd?.genericName || conciseInfo?.genericName || rawName,
    brandNames: matchingShelfProd?.equivalentBrands 
      ? [matchingShelfProd.brandName, ...matchingShelfProd.equivalentBrands] 
      : (conciseInfo?.brandNames || (rawBrands ? rawBrands.split(',').map(s => s.trim()) : [])),
    mechanism: {
      fa: mechanismFa,
      en: mechanismEn,
    },
    keyPearls: {
      fa: keyPearlsFa.length > 0 ? keyPearlsFa : ['مطابق با دستور داروساز و برچسب بسته‌بندی استرالیا مصرف شود.'],
      en: keyPearlsEn.length > 0 ? keyPearlsEn : ['Take strictly as directed by pharmacist and follow Australian product label.'],
    },
    dosageSummary: {
      fa: rawDosing || matchingShelfProd?.counselingPoints?.[0]?.fa || conciseInfo?.doseFa || 'دوزبندی استاندارد بالینی',
      en: rawDosing || matchingShelfProd?.counselingPoints?.[0]?.en || conciseInfo?.doseEn || 'Standard clinical dosing',
    },
    tierLabel: {
      fa: tierLabelFa,
      en: tierLabelEn,
    },
    tierType: tier,
  };
}

/**
 * Intelligent parser for Second-Line / Alternative Therapies
 */
export function extractSpecificAlternativeDrug(
  altFa?: string,
  altEn?: string,
  australianBrands?: { brand: string; generic: string; form?: string }[]
): {
  nameFa: string;
  nameEn: string;
  brandExamples: string;
  dosingFa: string;
  dosingEn: string;
  reasonFa: string;
  reasonEn: string;
} | null {
  if (!altFa && !altEn) return null;

  const rawFa = (altFa || '').trim();
  const rawEn = (altEn || '').trim();

  // Look for specific drug matches in australianBrands list
  const matchedBrand = australianBrands?.find(b =>
    (b.generic && rawFa.toLowerCase().includes(b.generic.toLowerCase())) ||
    (b.brand && rawFa.toLowerCase().includes(b.brand.toLowerCase())) ||
    (b.generic && rawEn.toLowerCase().includes(b.generic.toLowerCase())) ||
    (b.brand && rawEn.toLowerCase().includes(b.brand.toLowerCase()))
  );

  let cleanNameFa = '';
  let cleanNameEn = '';
  let brandName = matchedBrand?.brand || '';

  if (matchedBrand) {
    cleanNameFa = `${matchedBrand.generic} (${matchedBrand.brand})`;
    cleanNameEn = `${matchedBrand.generic} (${matchedBrand.brand})`;
  } else {
    const parenMatchFa = rawFa.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (parenMatchFa) {
      cleanNameFa = `${parenMatchFa[1].trim()} (${parenMatchFa[2].trim()})`;
      brandName = parenMatchFa[2].trim();
    } else {
      const parts = rawFa.split(/برای|جهت|در صورت|یا/);
      cleanNameFa = parts[0]?.trim() || rawFa;
    }

    const parenMatchEn = rawEn.match(/^([^(]+)\s*\(([^)]+)\)/);
    if (parenMatchEn) {
      cleanNameEn = `${parenMatchEn[1].trim()} (${parenMatchEn[2].trim()})`;
      if (!brandName) brandName = parenMatchEn[2].trim();
    } else {
      const parts = rawEn.split(/for|in case of|or/i);
      cleanNameEn = parts[0]?.trim() || rawEn;
    }
  }

  return {
    nameFa: cleanNameFa || 'داروی خط دوم و جایگزین بالینی',
    nameEn: cleanNameEn || 'Second-Line Alternative Pharmacotherapy',
    brandExamples: brandName || 'Australian Equivalent Brands',
    dosingFa: matchedBrand?.form ? `فرم دارویی: ${matchedBrand.form}` : 'طبق پروتکل دوزینگ و برچسب بسته‌بندی استرالیا.',
    dosingEn: matchedBrand?.form ? `Formulation: ${matchedBrand.form}` : 'As per Australian dosage protocol.',
    reasonFa: rawFa,
    reasonEn: rawEn,
  };
}
