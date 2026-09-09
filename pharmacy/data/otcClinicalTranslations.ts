export interface StructuredFirstLine {
  drugNameFa: string;
  drugNameEn: string;
  drugClassFa: string;
  drugClassEn: string;
  keyBrands: string[];
  dosingFa: string;
  dosingEn: string;
  onsetCourseFa: string;
  onsetCourseEn: string;
  keyWarningsFa: string;
  keyWarningsEn: string;
  alternativesFa?: string;
  alternativesEn?: string;
}

export interface DiseaseClinicalTranslation {
  cleanFaName: string;
  cleanEnName: string;
  primaryCommonNameFa: string;
  primaryCommonNameEn: string;
  primaryBrand: string;
  commonSynonymsFa: string[];
  commonSynonymsEn: string[];
  australianBrands: { brand: string; generic: string; form?: string }[];
  firstLine: StructuredFirstLine;
  symptomsFa: string[];
  redFlagsFa: string[];
  nonPharmFa: string[];
  clinicalPearlsFa: string[];
}

export const OTC_CLINICAL_TRANSLATIONS: Record<string, DiseaseClinicalTranslation> = {
  acne: {
    cleanFaName: 'آکنه و جوش صورت',
    cleanEnName: 'Acne Vulgaris',
    primaryCommonNameFa: 'جوش و آکنه ولگاریس',
    primaryCommonNameEn: 'Acne Vulgaris',
    primaryBrand: 'Benzac AC 2.5% / 5% Gel',
    commonSynonymsFa: ['جوش غرور جوانی', 'کومدون‌های سرسیاه و سرسفید', 'پاپول و پوست چرب'],
    commonSynonymsEn: ['Pimples', 'Zits', 'Blackheads & Whiteheads', 'Comedonal Acne'],
    australianBrands: [
      { brand: 'Benzac AC 2.5% / 5% / 10%', generic: 'Benzoyl Peroxide', form: 'ژل موضعی / شوینده' },
      { brand: 'Azclear Action Lotion', generic: 'Azelaic Acid 20%', form: 'لوسیون موضعی' },
      { brand: 'Oxy 5 / Oxy 10', generic: 'Benzoyl Peroxide', form: 'کرم محو شونده' },
      { brand: 'Clearasil Ultra', generic: 'Salicylic Acid 2%', form: 'پد و ژل شستشو' },
    ],
    firstLine: {
      drugNameFa: 'بنزوئیل پروکساید ۲.۵٪ یا ۵٪ (Benzoyl Peroxide Gel)',
      drugNameEn: 'Benzoyl Peroxide 2.5% or 5% Topical Gel',
      drugClassFa: 'آنتی‌باکتریال موضعی و لایه‌بردار کومدولیتیک',
      drugClassEn: 'Topical Antibacterial & Comedolytic Agent',
      keyBrands: ['Benzac AC 2.5%', 'Benzac AC 5%', 'Azclear Action 20%'],
      dosingFa: 'روزی ۱ بار شب‌ها روی پوست تمیز و خشک مالیده شود؛ پس از ۱ هفته در صورت تحمل به روزی ۲ بار افزایش یابد. دوره ارزیابی حداقل ۶ تا ۸ هفته است.',
      dosingEn: 'Apply thinly once daily at night on clean dry skin; increase to twice daily after 1 week if tolerated. Evaluate efficacy after 6-8 weeks.',
      onsetCourseFa: 'شروع بهبود بالینی معمولاً پس از ۳ الی ۴ هفته مشاهده می‌شود؛ در هفته‌های اول ممکن است جوش‌ها موقتاً تشدید شوند.',
      onsetCourseEn: 'Initial improvement noticeable after 3-4 weeks. Note that lesions may temporarily worsen during the initial 1-2 weeks.',
      keyWarningsFa: 'غلظت ۲.۵٪ و ۵٪ اثربخشی معادل ۱۰٪ اما با تحریک پوستی بسیار کمتر دارد. باعث رنگ‌زدایی و سفید شدن پارچه‌ها، لباس و مو می‌شود. از تماس با اطراف چشم و لب خودداری شود.',
      keyWarningsEn: '2.5% and 5% are as effective as 10% with significantly less erythema. Bleaches coloured fabrics and hair.',
      alternativesFa: 'اسید آزلائیک ۲۰٪ (Azclear Action) برای افراد با پوست حساس یا مستعد لکه‌های هایپرپیگمانتاسیون.',
      alternativesEn: 'Azelaic Acid 20% (Azclear) for sensitive or darker skin prone to post-inflammatory hyperpigmentation.',
    },
    symptomsFa: ['کومدون‌های سرسیاه و سرسفید', 'پاپول‌ها و پوستول‌های التهابی قرمز', 'پوست چرب و ترشح بیش از حد سبوم'],
    redFlagsFa: ['آکنه ندولار یا کیستیک شدید با درد عمقی', 'بروز اسکار و جای جوش فرورفته یا برجسته', 'عدم پاسخ به درمان‌های OTC پس از ۸ هفته', 'شک به آکنه ناشی از دارو (کورتون‌ها، لیتیوم، آندروژن‌ها)'],
    nonPharmFa: [
      'شستشوی ملایم صورت روزی ۲ بار با پاک‌کننده‌های غیرصابونی بدون بو (Soap-free).',
      'استفاده از مرطوب‌کننده‌ها و ضدآفتاب‌های فاقد چربی (Oil-free / Non-comedogenic).',
      'پرهیز از دستکاری، فشردن یا ترکاندن جوش‌ها برای جلوگیری از ایجاد لک و اسکار.',
      'پرهیز از اسکراب‌ها و لیف‌های زبر و خشن که التهاب را تشدید می‌کنند.',
    ],
    clinicalPearlsFa: [
      'بنزوئیل پروکساید مقاومت باکتریایی ایجاد نمی‌کند و با Cutibacterium acnes مبارزه می‌کند.',
      'هیچ ارتباط علمی اثبات‌شده مستقیمی میان مصرف شکلات یا غذاهای چرب با آکنه وجود ندارد، اما رژیم با نمایه گلایسمی پایین مفید است.',
    ],
  },

  anal_fissure: {
    cleanFaName: 'شقاق و زخم مقعدی',
    cleanEnName: 'Anal Fissure',
    primaryCommonNameFa: 'شقاق مقعدی حاد',
    primaryCommonNameEn: 'Acute Anal Fissure',
    primaryBrand: 'Rectogesic 0.2% Ointment',
    commonSynonymsFa: ['زخم مقعد', 'فیشر آنال', 'درد تیر کشنده هنگام دفع'],
    commonSynonymsEn: ['Anal Tear', 'Fissure-in-Ano', 'Painful Defecation'],
    australianBrands: [
      { brand: 'Rectogesic Ointment', generic: 'Glyceryl Trinitrate (GTN) 0.2%', form: 'پماد موضعی داخل مقعدی' },
      { brand: 'Proctosedyl Ointment / Suppositories', generic: 'Hydrocortisone + Cinchocaine', form: 'پماد و شیاف تسکین موقت' },
      { brand: 'Anusol Ointment', generic: 'Zinc oxide + Balsam Peru', form: 'پماد قابض و محافظ' },
    ],
    firstLine: {
      drugNameFa: 'پماد گلیسریل تری‌نیترات ۰.۲٪ (Rectogesic 0.2% Ointment)',
      drugNameEn: 'Glyceryl Trinitrate 0.2% Rectal Ointment (Rectogesic)',
      drugClassFa: 'اهداکننده نیتریک اکسید و شل‌کننده اسفنکتر داخلی مقعد',
      drugClassEn: 'Nitric Oxide Donor & Internal Anal Sphincter Relaxant',
      keyBrands: ['Rectogesic 0.2%'],
      dosingFa: 'یک نوار ۱ تا ۱.۵ سانتی‌متری از پماد (با استفاده از انگشت‌پوش یا دستکش) هر ۸ ساعت (۳ بار در روز) به داخل کانال مقعد مالیده شود. دوره درمان حداقل ۲ تا ۴ هفته.',
      dosingEn: 'Insert a 1-1.5cm strip of ointment into the anal canal every 8 hours (3 times daily) for at least 2 to 4 weeks.',
      onsetCourseFa: 'تسکین درد ظرف چند روز اول شروع می‌شود، اما ترمیم کامل بافت زخم نیازمند ۲ الی ۶ هفته مصرف مداوم است.',
      onsetCourseEn: 'Pain relief usually precedes complete ulcer healing by several weeks.',
      keyWarningsFa: 'سردرد ضربان‌دار و افت فشار خون شایع‌ترین عارضه است. در صورت مصرف مهارکننده‌های PDE5 (مانند سیلدنافیل/تادالافیل) طی ۲۴ تا ۴۸ ساعت گذشته اکیداً ممنوع است.',
      keyWarningsEn: 'Severe headache and postural hypotension are common. Strictly contraindicated with PDE5 inhibitors (e.g. Sildenafil within 24h).',
      alternativesFa: 'پمادهای بی‌حس‌کننده موضعی حاوی لیدوکائین یا سینکوکائین (Proctosedyl) برای تسکین موقت درد کوتاه‌مدت.',
      alternativesEn: 'Topical local anaesthetics (Lignocaine / Cinchocaine) for short-term pain relief.',
    },
    symptomsFa: ['درد خنجری و شدید مقعد هنگام دفع و تا چند ساعت پس از آن', 'مشاهده خون روشن قرمز روی دستمال توالت یا سطح مدفوع', 'اسپاسم و انقباض دردناک اسفنکتر مقعد'],
    redFlagsFa: ['خونریزی حجیم رکتال یا مدفوع قیری تیره', 'تب و لرز یا ترشحات چرکی (شک به آبسه مقعدی)', 'فیشر عودکننده یا مقاوم به درمان بیش از ۴ هفته', 'محل غیرطبیعی زخم خارج از خط وسط (شک به کرون، کولیت یا بدخیمی)'],
    nonPharmFa: [
      'حمام نشیمن آب گرم (Sitz Bath) به مدت ۱۵ الی ۲۰ دقیقه پس از هر بار دفع.',
      'افزایش مصرف فیبر خوراکی و نوشیدن حداقل ۲ لیتر آب روزانه جهت نرم شدن مدفوع.',
      'استفاده از دستمال مرطوب بدون الکل یا شستشو با آب به جای دستمال توالت زبر.',
      'عدم به تاخیر انداختن احساس دفع مدفوع.',
    ],
    clinicalPearlsFa: [
      'شل کردن اسفنکتر داخلی فشار ایسکمیک را کاهش داده و خون‌رسانی موضعی جهت ترمیم زخم را مهیا می‌سازد.',
      'نرم‌کننده‌های مدفوع مثل لاکتولوز یا پودر ماکروگل در کنار رکتوجزیک توصیه اکید می‌شوند.',
    ],
  },

  blepharitis: {
    cleanFaName: 'بلفاریت و التهاب لبه پلک',
    cleanEnName: 'Blepharitis',
    primaryCommonNameFa: 'بلفاریت قدامی و خلفی',
    primaryCommonNameEn: 'Blepharitis & Meibomian Dysfunction',
    primaryBrand: 'Chlorsig 1% Eye Ointment / Lid Hygiene Kit',
    commonSynonymsFa: ['التهاب پلک', 'پوسته‌ریزی لبه مژه‌ها', 'شوره مژه و خشکی چشم'],
    commonSynonymsEn: ['Eyelid Margin Inflammation', 'Crusty Eyelids', 'MGD'],
    australianBrands: [
      { brand: 'Blephadex / Ocusoft Lid Scrub', generic: 'Tea tree oil & Coconut cleanser', form: 'فوم و پد پاک‌کننده مژه' },
      { brand: 'Chlorsig 1% Eye Ointment', generic: 'Chloramphenicol 1%', form: 'پماد چشمی آنتی‌بیوتیک' },
      { brand: 'Systane / Refresh Tears', generic: 'Lubricant Eye Drops', form: 'قطره اشک مصنوعی' },
    ],
    firstLine: {
      drugNameFa: 'پروتکل بهداشت لبه پلک (Lid Hygiene) + پماد کلرامفنیکل ۱٪ در موارد باکتریایی',
      drugNameEn: 'Eyelid Hygiene Protocol + Chloramphenicol 1% Eye Ointment if staphylococcal',
      drugClassFa: 'پاکسازی مکانیکی لبه پلک و آنتی‌بیوتیک موضعی چشم',
      drugClassEn: 'Mechanical Lid Hygiene & Topical Ocular Antibacterial',
      keyBrands: ['Blephadex Wipes', 'Chlorsig 1% Ointment', 'Systane Balance'],
      dosingFa: 'کمپرس گرم ۵ دقیقه، سپس ماساژ و پاکسازی مژه‌ها با پد یا محلول شامپو بچه رقیق (۵ قطره در ۱۰۰ میلی‌لیتر آب جوشیده سرد). در صورت التهاب باکتریایی: پماد کلرامفنیکل ۱ سانتی‌متر به لبه پلک شب‌ها به مدت ۵ تا ۷ روز.',
      dosingEn: 'Warm compress for 5 min, gentle lash massage and scrub twice daily. Chloramphenicol 1% ointment to lid margins at night if infected.',
      onsetCourseFa: 'بلفاریت یک بیماری مزمن با عود مکرر است؛ بهداشت روزانه پلک باید مداوم ادامه یابد.',
      onsetCourseEn: 'Blepharitis is a chronic relapsing condition requiring long-term daily hygiene.',
      keyWarningsFa: 'از ریختن پماد داخل چشم خودداری شود؛ پماد کلرامفنیکل باز شده پس از ۲۸ روز دور ریخته شود. در لنزهای تماسی منع مصرف دارد.',
      keyWarningsEn: 'Discard opened ointment after 28 days. Avoid wearing contact lenses during active flares.',
      alternativesFa: 'قطره‌های اشک مصنوعی فاقد نگه‌دارنده برای برطرف کردن خشکی و سوزش چشم همراه.',
      alternativesEn: 'Preservative-free artificial tears to relieve associated ocular dryness.',
    },
    symptomsFa: ['قرمزی، تورم و خارش لبه پلک‌ها', 'پوسته‌های چرب یا شوره چسبنده در ریشه مژه‌ها', 'چسبندگی پلک‌ها هنگام بیدار شدن از خواب', 'احساس جسم خارجی و سنگ‌ریزه در چشم'],
    redFlagsFa: ['کاهش یا تاری دید', 'درد شدید و عمیق کره چشم', 'حساسیت شدید به نور (فتوفوبی)', 'تغییر شکل پلک یا ریزش شدید مژه‌ها (مداروز)'],
    nonPharmFa: [
      'کمپرس گرم با حوله تمیز مرطوب روزی ۲ بار به مدت ۵ تا ۱۰ دقیقه جهت ذوب ترشحات روغنی غدد میبومین.',
      'ماساژ عمودی پلک به سمت لبه مژه‌ها.',
      'عدم استفاده از لوازم آرایش چشم در دوره التهاب حاد.',
      'درمان شوره سر همراه با شامپوهای ضدشوره درماتیت سبورئیک.',
    ],
    clinicalPearlsFa: [
      'بهداشت لبه پلک اساس درمان است؛ آنتی‌بیوتیک تنها در صورت شواهد عفونت استافیلوکوکی اضافه می‌شود.',
      'بلفاریت غالباً با روزاسه و درماتیت سبورئیک همبستگی بالینی دارد.',
    ],
  },

  burns_sunburn: {
    cleanFaName: 'سوختگی سطحی و آفتاب‌سوختگی',
    cleanEnName: 'Superficial Burns & Sunburn',
    primaryCommonNameFa: 'سوختگی درجه یک و آفتاب‌سوختگی',
    primaryCommonNameEn: 'Minor Burns & Sunburn',
    primaryBrand: 'Solugel / Solosite Hydrogel',
    commonSynonymsFa: ['آفتاب‌زدگی', 'قرمزی پوست ناشی از آفتاب', 'سوختگی حرارتی سطحی'],
    commonSynonymsEn: ['Sunburn', 'First-degree Thermal Burn', 'Erythema Solare'],
    australianBrands: [
      { brand: 'Solugel Wound Care Gel', generic: 'Propylene Glycol + NaCl Hydrogel', form: 'ژل هیدروژل خنک‌کننده' },
      { brand: 'Solosite Wound Gel', generic: 'Carboxymethylcellulose Hydrogel', form: 'ژل آبرسان سوختگی' },
      { brand: 'Bepanthen Antiseptic', generic: 'Dexpanthenol + Chlorhexidine', form: 'کرم ترمیم‌کننده و ضدعفونی' },
      { brand: 'Burnaid Burn Gel / Dressing', generic: 'Melaleuca Oil + Hydrogel', form: 'پد و ژل سوختگی اورژانس' },
    ],
    firstLine: {
      drugNameFa: 'خنک‌سازی ۲۰ دقیقه‌ای با آب لوله‌کشی + هیدروژل موضعی (Solugel / Solosite)',
      drugNameEn: '20-min cool running tap water + Topical Hydrogel (Solugel / Solosite)',
      drugClassFa: 'کمک‌های اولیه خنک‌کننده و هیدروژل مرطوب‌کننده ترمیم زخم',
      drugClassEn: 'First Aid Cooling & Hydrating Wound Hydrogel',
      keyBrands: ['Solugel', 'Solosite', 'Burnaid Gel', 'Panadol / Nurofen'],
      dosingFa: 'بلافاصله ۲۰ دقیقه زیر آب خنک جاری (نه یخ). سپس ژل Solugel با ضخامت حداقل ۵ میلی‌متر روی پوست تمیز مالیده و باز گذاشته یا با پانسمان نچسب پوشانده شود. تکرار مکرر تا زمان رفع سوزش.',
      dosingEn: 'First aid: 20 mins cool running water. Apply Solugel liberally (min 5mm thickness) without rubbing. Reapply frequently.',
      onsetCourseFa: 'اوج التهاب آفتاب‌سوختگی بین ۲۴ تا ۷۲ ساعت بعد رخ می‌دهد؛ پوسته‌ریزی ظرف ۴ تا ۷ روز ظاهر می‌شود.',
      onsetCourseEn: 'Erythema peaks at 24-72 hours. Desquamation occurs within 4-7 days.',
      keyWarningsFa: 'هرگز از یخ، کره، خمیردندان یا روغن روی سوختگی استفاده نکنید (باعث نکروز و تشدید آسیب حرارتی می‌شود). هرگز تاول‌ها را نترکانید.',
      keyWarningsEn: 'Do NOT use ice, butter, or oils. Do NOT burst intact blisters. Avoid calamine lotion as it dehydrates.',
      alternativesFa: 'مسکن‌های ضدالتهاب خوراکی مثل ایبوپروفن یا پاراستامول در ۲۴ تا ۴۸ ساعت اول برای مهار واسطه‌های التهابی.',
      alternativesEn: 'Oral NSAIDs (Ibuprofen) in the first 24-48 hours to blunt prostaglandin-mediated erythema and pain.',
    },
    symptomsFa: ['قرمزی، سوزش، حرارت موضعی و درد پوست', 'تاول‌های کوچک پوستی (در سوختگی درجه دو سطحی)', 'پوسته‌ریزی و خارش پس از چند روز'],
    redFlagsFa: ['سوختگی بزرگتر از کف دست بیمار', 'هرگونه سوختگی در نوزادان و کودکان خردسال', 'سوختگی صورت، دست‌ها، پاها، مفاصل یا ناحیه تناسلی', 'سوختگی ناشی از مواد شیمیایی یا برق‌گرفتگی', 'بروز تاول‌های وسیع و علائم عفونت چرکی یا تب'],
    nonPharmFa: [
      'کمک‌های اولیه طلایی: ۲۰ دقیقه زیر آب خنک روان (۱۵-۲۰ درجه سانتی‌گراد) ظرف ۳ ساعت اول.',
      'نوشیدن مایعات فراوان جهت جلوگیری از دهیدراتاسیون.',
      'پوشیدن لباس‌های نخی گشاد و محافظت کامل در برابر نور خورشید با ضدآفتاب SPF50+.',
    ],
    clinicalPearlsFa: [
      'آب جاری خنک اثر محافظتی فوق‌العاده‌ای در کاهش عمق سوختگی و نیاز به جراحی دارد.',
      'ضدآفتاب‌های Broad Spectrum SPF50+ تا ۹۸٪ پرتوهای UVB را فیلتر می‌کنند.',
    ],
  },

  hayfever: {
    cleanFaName: 'تب یونجه و رینیت آلرژیک',
    cleanEnName: 'Hayfever & Allergic Rhinitis',
    primaryCommonNameFa: 'رینیت آلرژیک فصلی و دائمی (تب یونجه)',
    primaryCommonNameEn: 'Seasonal & Perennial Allergic Rhinitis',
    primaryBrand: 'Rhinocort 32mcg / Telfast 180mg',
    commonSynonymsFa: ['آلرژی فصلی', 'حساسیت به گرده گیاهان', 'آبریزش حساسیتی بینی', 'خارش چشم و عطسه'],
    commonSynonymsEn: ['Seasonal Allergic Rhinitis', 'Pollen Allergy', 'Rose Fever'],
    australianBrands: [
      { brand: 'Rhinocort 32mcg / 64mcg', generic: 'Budesonide', form: 'اسپری کورتونی بینی' },
      { brand: 'Nasonex Allergy 50mcg', generic: 'Mometasone furoate', form: 'اسپری کورتونی بینی' },
      { brand: 'Telfast 180mg / 120mg / 60mg', generic: 'Fexofenadine', form: 'قرص آنتی‌هیستامین غیرخواب‌آور' },
      { brand: 'Zyrtec 10mg', generic: 'Cetirizine hydrochloride', form: 'قرص و قطره خوراکی' },
      { brand: 'Claratyne 10mg', generic: 'Loratadine', form: 'قرص خوراکی' },
      { brand: 'Flixonase 50mcg', generic: 'Fluticasone propionate', form: 'اسپری کورتونی بینی' },
      { brand: 'Dymista 137/50', generic: 'Azelastine + Fluticasone', form: 'اسپری ترکیبی بینی (S3/S4)' },
      { brand: 'Zaditen Eye Drops', generic: 'Ketotifen 0.025%', form: 'قطره چشمی ضدآلرژی' },
      { brand: 'Livostin Nasal & Eye', generic: 'Levocabastine', form: 'اسپری و قطره آنتی‌هیستامین' },
    ],
    firstLine: {
      drugNameFa: 'اسپری کورتیکواستروئید داخل بینی (INCS: Budesonide یا Mometasone)',
      drugNameEn: 'Intranasal Corticosteroid Spray (INCS: Budesonide / Mometasone)',
      drugClassFa: 'کورتیکواستروئید ضدالتهاب موضعی بینی — خط اول استاندارد طلایی',
      drugClassEn: 'Topical Intranasal Corticosteroid (First-line Gold Standard)',
      keyBrands: ['Rhinocort 32/64mcg', 'Nasonex 50mcg', 'Flixonase 50mcg'],
      dosingFa: 'بزرگسالان و کودکان بالای ۱۲ سال: ۲ پاف در هر سوراخ بینی ۱ بار در روز (صبح‌ها). پس از بهبود علائم به ۱ پاف روزانه کاهش یابد. حداقل سن مجاز: ۱۲ سال برای OTC.',
      dosingEn: 'Adults & Child >12yo: 2 sprays into each nostril once daily (morning). Reduce to 1 spray once daily once controlled.',
      onsetCourseFa: 'شروع اثر ظرف ۳ تا ۷ ساعت، اما حداکثر اثربخشی پس از ۲ تا ۴ روز مصرف منظم و پیوسته ایجاد می‌شود.',
      onsetCourseEn: 'Onset within 3-7 hours; maximum clinical efficacy achieved after 2-4 days of continuous use.',
      keyWarningsFa: 'تکنیک صحیح اسپری: نوک نازل به سمت خارج بینی (به سوی لاله گوش) دور از تیغه میانی گرفته شود تا از خونریزی بینی (Epistaxis) جلوگیری گردد. قبل از مصرف به خوبی تکان دهید.',
      keyWarningsEn: 'Aim nozzle laterally away from nasal septum (towards outer ear) to prevent epistaxis and septal perforation.',
      alternativesFa: 'آنتی‌هیستامین‌های خوراکی نسل دوم (Telfast 180mg یا Zyrtec 10mg) در موارد علائم خفیف/متناوب یا همراهی با خارش شدید و کهیر.',
      alternativesEn: 'Oral non-sedating antihistamines (Fexofenadine 180mg, Cetirizine 10mg) for mild intermittent symptoms.',
    },
    symptomsFa: ['عطسه‌های مکرر و رگباری', 'آبریزش شفاف و آبکی بینی (Rhinorrhea)', 'خارش شدید سقف دهان، گلو و بینی', 'احتقان و گرفتگی بینی', 'خارش و قرمزی چشم‌ها (التهاب ملتحمه آلرژیک)'],
    redFlagsFa: ['انسداد کامل و یک‌طرفه بینی بدون ترشح', 'خونریزی‌های مکرر و خودبه‌خودی از بینی', 'ترشحات چرکی غلیظ و درد شدید فشاری سینوس‌ها (سینوزیت باکتریایی)', 'تنگی نفس، خس‌خس سینه یا تشدید همزمان آسم'],
    nonPharmFa: [
      'شستشوی روزانه مجاری بینی با سرم نمکی ایزوتونیک یا هایپرتونیک (Flo Sinus Care / FESS Spray) قبل از مصرف اسپری دارویی.',
      'بستن پنجره‌ها در روزهای با غلظت بالای گرده و پس از طوفان‌های تندری (Thunderstorm Asthma).',
      'استفاده از عینک آفتابی هنگام خروج از منزل و تعویض لباس پس از بازگشت به خانه.',
      'استفاده از روکش‌های ضد مایت برای بالش و تشک در افراد حساس به گرد و غبار خانگی.',
    ],
    clinicalPearlsFa: [
      'اسپری‌های INCS به تنهایی هم بر علائم بینی و هم بر علائم چشمی آلرژی موثرتر از آنتی‌هیستامین‌های خوراکی هستند.',
      'آنتی‌هیستامین‌های نسل اول (خواب‌آور) به دلیل خطر تصادفات رانندگی و افت هوشیاری نباید برای آلرژی روزمره مصرف شوند.',
    ],
  },

  chickenpox: {
    cleanFaName: 'آبله‌مرغان و عفونت واریسلا',
    cleanEnName: 'Chickenpox / Varicella',
    primaryCommonNameFa: 'آبله‌مرغان',
    primaryCommonNameEn: 'Chickenpox (Varicella Zoster)',
    primaryBrand: 'Phenergan / Polaramine + Panadol',
    commonSynonymsFa: ['آبله مرغان', 'ضایعات تاولی قطره شبنمی', 'واریسلا زوستر'],
    commonSynonymsEn: ['Varicella', 'Dewdrop on Rose Petal Rash'],
    australianBrands: [
      { brand: 'Phenergan (Promethazine)', generic: 'Promethazine HCl', form: 'شربت و قرص ضدخارش خواب‌آور' },
      { brand: 'Polaramine (Dexchlorpheniramine)', generic: 'Dexchlorpheniramine', form: 'شربت و قرص ضدخارش' },
      { brand: 'Panadol Children / Baby', generic: 'Paracetamol', form: 'سوسپانسیون ضدتب' },
      { brand: 'Pinetarsol Solution', generic: 'Pine Tar + Triethanolamine', form: 'محلول حمام ضدخارش' },
    ],
    firstLine: {
      drugNameFa: 'پاراستامول (برای تب) + آنتی‌هیستامین‌های آرام‌بخش (Promethazine برای خارش)',
      drugNameEn: 'Paracetamol (for fever) + Sedating Antihistamines (Promethazine for severe itch)',
      drugClassFa: 'ضدتب و مسکن ساده + آنتی‌هیستامین نسل اول مهارکننده خاراندن شبانه',
      drugClassEn: 'Simple Antipyretic & First-Generation Sedating Antihistamine',
      keyBrands: ['Panadol Infant/Children', 'Phenergan Elixir', 'Pinetarsol'],
      dosingFa: 'پاراستامول: ۱۵ میلی‌گرم بر کیلوگرم هر ۴ تا ۶ ساعت (حداکثر ۶۰ میلی‌گرم بر کیلوگرم در روز یا ۴۰۰۰ میلی‌گرم). پرومتازین در کودکان بالای ۲ سال طبق وزن شب‌ها.',
      dosingEn: 'Paracetamol 15mg/kg every 4-6 hours (max 60mg/kg/day). Promethazine only if >2yo for nocturnal itch.',
      onsetCourseFa: 'دوره کمون ۱۰ تا ۲۱ روز؛ ضایعات ظرف ۵ تا ۷ روز پوسته‌ریزی کرده و خشک می‌شوند.',
      onsetCourseEn: 'Incubation 10-21 days; all blisters typically crust over within 5-7 days.',
      keyWarningsFa: 'مصرف ایبوپروفن و NSAIDها در آبله‌مرغان اکیداً ممنوع است (خطر عفونت‌های باکتریایی مرگبار بافت نرم مانند فاشئیت نکروزان). آسپرین در کودکان به دلیل سندرم ری ممنوع است.',
      keyWarningsEn: 'CRITICAL: Avoid Ibuprofen/NSAIDs due to high risk of severe Necrotising Fasciitis. Avoid Aspirin (Reye Syndrome).',
      alternativesFa: 'لوسیون کالامین توصیه نمی‌شود زیرا باعث خشکی بیش از حد پوست می‌گردد؛ حمام با محلول Pinetarsol یا جو دوسر کلوئیدی مناسب‌تر است.',
      alternativesEn: 'Avoid Calamine lotion (causes cracking). Use colloidal oatmeal or Pinetarsol baths instead.',
    },
    symptomsFa: ['تب خفیف و احساس بی‌حالی و خستگی ۱ تا ۲ روز قبل از راش', 'ضایعات پوستی خارش‌دار شبیه قطره شبنم روی گلبرگ گل سرخ', 'شروع راش از تنه و گسترش به صورت، پوست سر و اندام‌ها', 'تبدیل وزیکول‌ها به پوسته‌های خشک ظرف چند روز'],
    redFlagsFa: ['زنان باردار در هر سن بارداری (خطر سندرم واریسلای مادرزادی)', 'افراد دچار نقص سیستم ایمنی یا مصرف‌کنندگان داروهای سرکوب‌کننده ایمنی', 'نوزادان زیر ۱ ماه', 'عفونت باکتریایی ثانویه با قرمزی شدید، تورم و چرک اطراف تاول‌ها', 'تنگی نفس، سرفه شدید یا اختلالات عصبی و تعادلی (آتاکسی/انسفالیت)'],
    nonPharmFa: [
      'قرنطینه کامل خانگی تا خشک شدن و افتادن آخرین تاول و پوسته‌ها.',
      'کوتاه نگه‌داشتن ناخن‌ها و پوشاندن دستکش نخی به نوزادان برای جلوگیری از خاراندن و ایجاد اسکار.',
      'حمام آب ولرم با بلغور جو دوسر کلوئیدی یا محلول‌های ضدخارش فاقد صابون.',
      'استراحت و مصرف مایعات فراوان جهت پیشگیری از کم‌آبی بدن.',
    ],
    clinicalPearlsFa: [
      'آبله‌مرغان از ۱ تا ۲ روز قبل از بروز بثورات تا زمان دلمه‌بستن کامل تمامی تاول‌ها واگیردار است.',
      'آنتی‌هیستامین‌های غیرخواب‌آور در خارش آبله‌مرغان اثری ندارند چون این خارش با هیستامین واسطه‌گری نمی‌شود.',
    ],
  },

  cold_sores: {
    cleanFaName: 'تبخال لب و دهان',
    cleanEnName: 'Recurrent Cold Sores (Herpes Labialis)',
    primaryCommonNameFa: 'تبخال لبی عودکننده',
    primaryCommonNameEn: 'Herpes Simplex Labialis',
    primaryBrand: 'Famvir for Cold Sores 1500mg / Zovirax Cream',
    commonSynonymsFa: ['تبخال دهان', 'تاول‌های ویروسی لب', 'ویروس هرپس سیمپلکس نوع ۱'],
    commonSynonymsEn: ['Fever Blister', 'Oral Herpes', 'HSV-1 Labialis'],
    australianBrands: [
      { brand: 'Famvir for Cold Sores', generic: 'Famciclovir 1500mg (3 x 500mg)', form: 'قرص خوراکی تک‌دوز (S3)' },
      { brand: 'Zovirax Cold Sore Cream', generic: 'Aciclovir 5%', form: 'کرم موضعی' },
      { brand: 'Virasolve Cream', generic: 'Idoxuridine 0.5% + Lignocaine 2%', form: 'کرم ترکیبی بی‌حس‌کننده' },
      { brand: 'Compeed Cold Sore Patch', generic: 'Hydrocolloid Patch', form: 'چسب نامرئی محافظ تبخال' },
    ],
    firstLine: {
      drugNameFa: 'فام‌سیکلوویر خوراکی ۱۵۰۰ میلی‌گرم تک‌دوز (Famvir 1500mg Stat - S3)',
      drugNameEn: 'Oral Famciclovir 1500mg Single Dose (Famvir - Schedule 3)',
      drugClassFa: 'آنالوگ نوکلئوزیدی ضدویروس هرپس خوراکی با جذب بالا',
      drugClassEn: 'Oral Antiviral Nucleoside Analogue (S3 Pharmacist Only)',
      keyBrands: ['Famvir for Cold Sores', 'Elovax 500mg', 'Zovirax Cream'],
      dosingFa: '۳ قرص ۵۰۰ میلی‌گرم همزمان به صورت یکجا با آب میل شود (مجموعاً ۱۵۰۰ میلی‌گرم). باید در اولین فاز گزگز و مورمور شدن (طی ۲۴ تا ۴۸ ساعت اول) مصرف گردد. سن مجاز: ۱۸ سال به بالا.',
      dosingEn: 'Take 3 x 500mg tablets together as a single stat dose within 48 hours of first tingling/symptoms. Adults ≥18yo only.',
      onsetCourseFa: 'مصرف زودهنگام مدت بیماری را تا ۲ الی ۳ روز کاهش داده و از تاول زدن جلوگیری می‌کند.',
      onsetCourseEn: 'Early stat dosing aborts lesion development or reduces healing time by 2-3 days.',
      keyWarningsFa: 'در نارسایی شدید کلیوی نیاز به تعدیل دوز دارد. در دوران بارداری و شیردهی توصیه به استفاده از کرم‌های موضعی (Aciclovir) می‌شود.',
      keyWarningsEn: 'Dose reduction needed in severe renal impairment. In pregnancy, topical aciclovir is preferred.',
      alternativesFa: 'کرم آسیکلوویر ۵٪ (Zovirax): ۵ بار در روز (هر ۴ ساعت در ساعات بیداری) به مدت ۵ روز.',
      alternativesEn: 'Topical Aciclovir 5% cream applied 5 times daily for 5 days.',
    },
    symptomsFa: ['احساس سوزن‌سوزن شدن، خارش یا گزگز موضعی ۱ تا ۲ روز قبل از بروز ضایعه', 'تشکیل دسته‌ای از تاول‌های کوچک روی زمینه قرمز لب', 'ترکیدن تاول‌ها و ایجاد دلمه و ترشح زرد خردلی'],
    redFlagsFa: ['ضایعه تبخال نزدیک چشم یا روی پلک (خطر کراتیت ویروسی و کوری)', 'بیماران با ضعف سیستم ایمنی، HIV یا شیمی‌درمانی', 'عدم بهبودی تبخال پس از ۱۴ روز', 'عودهای مکرر ماهانه', 'گسترش ضایعات به داخل دهان همراه با تب بالا و ناتوانی در بلع'],
    nonPharmFa: [
      'شستشوی دقیق دست‌ها پس از لمس تبخال برای جلوگیری از انتقال به چشم یا سایر افراد.',
      'پرهیز از بوسیدن و استفاده مشترک از ظروف، قاشق، لیوان و بالم لب.',
      'استفاده از بالم لب حاوی ضدآفتاب SPF30+ جهت پیشگیری از عود ناشی از آفتاب.',
      'پرهیز از کندن دلمه‌های تبخال جهت جلوگیری از عفونت باکتریایی ثانویه.',
    ],
    clinicalPearlsFa: [
      'فام‌سیکلوویر ۱۵۰۰ میلی‌گرم تک‌دوز داروی دسته S3 در استرالیا است و باید پس از ارزیابی کامل توسط داروساز تحویل گردد.',
      'کرم‌های موضعی ضدویروس اگر پس از ترکیدن تاول مصرف شوند اثر درمانی چندانی ندارند.',
    ],
  },

  bacterial_conjunctivitis: {
    cleanFaName: 'کنژنکتیویت باکتریایی و عفونت چشم',
    cleanEnName: 'Bacterial Conjunctivitis',
    primaryCommonNameFa: 'ورم ملتحمه باکتریایی',
    primaryCommonNameEn: 'Acute Bacterial Conjunctivitis',
    primaryBrand: 'Chlorsig 0.5% Drops / 1% Ointment',
    commonSynonymsFa: ['عفونت باکتریایی چشم', 'چشم صورتی چرکی', 'چسبندگی مژه‌ها صبحگاهی'],
    commonSynonymsEn: ['Pink Eye', 'Purulent Eye Infection', 'Sticky Eyes'],
    australianBrands: [
      { brand: 'Chlorsig Eye Drops 0.5%', generic: 'Chloramphenicol 0.5%', form: 'قطره چشمی (S3/S4)' },
      { brand: 'Chlorsig Eye Ointment 1%', generic: 'Chloramphenicol 1%', form: 'پماد چشمی' },
      { brand: 'Brolene Eye Drops', generic: 'Propamidine Isethionate 0.1%', form: 'قطره ضدعفونی‌کننده' },
      { brand: 'Systane / Refresh Drops', generic: 'Ocular Lubricant', form: 'قطره روان‌کننده و شستشو' },
    ],
    firstLine: {
      drugNameFa: 'قطره کلرامفنیکل ۰.۵٪ چشمی (Chlorsig 0.5% Eye Drops - S3)',
      drugNameEn: 'Chloramphenicol 0.5% Eye Drops (Chlorsig - Schedule 3)',
      drugClassFa: 'آنتی‌بیوتیک با طیف اثر گسترده چشمی',
      drugClassEn: 'Broad-Spectrum Ophthalmic Antibacterial',
      keyBrands: ['Chlorsig 0.5% Drops', 'Chlorsig 1% Ointment'],
      dosingFa: 'روزهای ۱ و ۲: ۱ قطره هر ۲ ساعت در چشم مبتلا (در ساعات بیداری). روزهای ۳ تا ۷: ۱ قطره ۴ بار در روز. حداقل دوره درمان ۵ روز کامل است و باید تا ۴۸ ساعت پس از رفع کامل علائم ادامه یابد. سن مجاز OTC: ۲ سال به بالا.',
      dosingEn: 'Days 1-2: 1 drop every 2 hours while awake. Days 3-5+: 1 drop 4 times daily. Continue for 48 hours after symptom resolution (min 5 days). Age ≥2yo.',
      onsetCourseFa: 'بهبودی ترشحات و قرمزی معمولاً ظرف ۲۴ تا ۴۸ ساعت پس از شروع قطره آشکار می‌شود.',
      onsetCourseEn: 'Marked reduction in discharge and hyperemia typically seen within 24-48 hours.',
      keyWarningsFa: 'قطره باز نشده باید در یخچال (۲ تا ۸ درجه) نگهداری شود. پس از باز شدن در دمای اتاق نگهداری و حداکثر پس از ۲۸ روز دور ریخته شود. در لنزهای تماسی منع مصرف دارد.',
      keyWarningsEn: 'Store unopened bottle in fridge (2-8°C). Discard 28 days after opening. Do NOT wear contact lenses during treatment.',
      alternativesFa: 'پماد کلرامفنیکل ۱٪ قبل از خواب جهت ایجاد اثر پایدار شبانه و پیشگیری از چسبندگی مژه‌ها.',
      alternativesEn: 'Chloramphenicol 1% ointment at bedtime for prolonged overnight antibacterial coverage.',
    },
    symptomsFa: ['شروع ناگهانی در یک چشم و سرایت سریع به چشم دیگر', 'ترشحات غلیظ موکوپورولنت زرد یا متمایل به سبز', 'چسبیدن محکم پلک‌ها و مژه‌ها به هم هنگام بیدار شدن', 'قرمزی و پرخونی ملتحمه بدون درد عمقی چشم'],
    redFlagsFa: ['درد شدید، خنجری یا عمقی در کره چشم', 'کاهش و تاری واضح دید', 'حساسیت شدید به نور (فتوفوبی)', 'مردمک‌های نامتقارن یا غیرپاسخگو به نور', 'استفاده‌کنندگان از لنزهای تماسی (خطر کراتیت سودوموناسی و سوراخ شدن قرنیه)', 'کودکان زیر ۲ سال جهت پروتکل OTC داروخانه'],
    nonPharmFa: [
      'پاک کردن ترشحات و دلمه‌های چشم با پنبه آغشته به سرم نمکی یا آب جوشیده سرد از گوشه داخلی به خارج.',
      'هرگز روی چشم عفونی پانسمان یا پد بسته نگذارید (موجب تکثیر سریع باکتری‌ها می‌شود).',
      'پرهیز از استفاده از لنزهای تماسی تا ۲۴ ساعت پس از بهبودی کامل.',
      'شستشوی مکرر دست‌ها و استفاده از حوله و روبالشی کاملاً جداگانه.',
    ],
    clinicalPearlsFa: [
      'کلرامفنیکل چشمی انتخابی اول و استاندارد طلایی در پروتکل OTC داروسازان استرالیا است.',
      'در ترشحات آبکی همراه با علائم سرماخوردگی معمولاً منشا ویروسی (آدنوویروس) است و نیاز به آنتی‌بیوتیک ندارد.',
    ],
  },

  constipation: {
    cleanFaName: 'یبوست حاد و مزمن',
    cleanEnName: 'Constipation',
    primaryCommonNameFa: 'یبوست و کندی حرکات روده',
    primaryCommonNameEn: 'Acute & Chronic Constipation',
    primaryBrand: 'Movicol / Actilax / Coloxyl with Senna',
    commonSynonymsFa: ['سختی دفع مدفوع', 'خشکی مدفوع', 'دفع نامنظم و ناکامل'],
    commonSynonymsEn: ['Bowel Irregularity', 'Hard Stools', 'Slow Transit'],
    australianBrands: [
      { brand: 'Movicol / OsmoLax', generic: 'Macrogol 3350 (PEG)', form: 'ساشه پودر حل‌شونده اسموتیک' },
      { brand: 'Actilax / Duphalac', generic: 'Lactulose', form: 'شربت اسموتیک' },
      { brand: 'Coloxyl with Senna', generic: 'Docusate 50mg + Senna 8mg', form: 'قرص نرم‌کننده و محرک' },
      { brand: 'Metamucil / Fybogel', generic: 'Psyllium Husk', form: 'پودر فیبر حجم‌دهنده' },
      { brand: 'Glycerol Suppositories', generic: 'Glycerol', form: 'شیاف مقعدی سریع‌الاثر' },
      { brand: 'Microlax Enema', generic: 'Sodium Citrate Enema', form: 'میکروانما تخلیه رکتال' },
    ],
    firstLine: {
      drugNameFa: 'ملین اسموتیک ماکروگل (Movicol) یا لاکتولوز (Actilax) + افزایش فیبر و آب',
      drugNameEn: 'Osmotic Laxative: Macrogol (Movicol) or Lactulose (Actilax)',
      drugClassFa: 'ملین اسموتیک ایزواسموتیک نگه‌دارنده آب در روده',
      drugClassEn: 'Iso-osmotic Macrogol / Synthetic Disaccharide Laxative',
      keyBrands: ['Movicol', 'OsmoLax', 'Actilax', 'Coloxyl with Senna'],
      dosingFa: 'بزرگسالان: ۱ تا ۲ ساشه ماکروگل روزانه در ۱۲۵ میلی‌لیتر آب حل شده و میل شود. لاکتولوز: ۱۵ تا ۳۰ میلی‌لیتر روزانه. شروع اثر طی ۱ تا ۳ روز.',
      dosingEn: 'Adults: 1-2 sachets Movicol daily dissolved in 125mL water. Lactulose: 15-30mL daily. Onset: 1-3 days.',
      onsetCourseFa: 'ملین‌های اسموتیک ظرف ۱ تا ۳ روز باعث نرم شدن مدفوع و تسهیل دفع فیزیولوژیک می‌شوند.',
      onsetCourseEn: 'Osmotic laxatives typically produce soft formed stools within 24 to 72 hours.',
      keyWarningsFa: 'در مشکوک بودن به انسداد روده یا دردهای حاد شکمی ناشناخته اکیداً ممنوع است. مصرف ملین‌های محرک (سنا/بیزاکودیل) به بیش از ۷ روز متوالی محدود شود تا وابستگی ایجاد نگردد.',
      keyWarningsEn: 'Contraindicated in mechanical bowel obstruction. Limit stimulant laxatives (Senna) to short-term use to avoid atonic colon.',
      alternativesFa: 'شیاف گلیسرول یا انمای میکرولاکس در صورت نیاز به تخلیه فوری رکتوم ظرف ۱۵ تا ۳۰ دقیقه.',
      alternativesEn: 'Glycerol suppositories or Microlax enemas for rapid rectal evacuation within 15-30 mins.',
    },
    symptomsFa: ['دفع مدفوع کمتر از ۳ بار در هفته', 'مدفوع سفت، گلوله‌ای و خشک (تیپ ۱ و ۲ مقیاس بریستول)', 'فشار آوردن و زور زدن بیش از حد هنگام دفع', 'احساس تخلیه ناکامل و نفخ شکمی'],
    redFlagsFa: ['خون در مدفوع یا مدفوع سیاه قیری', 'یبوست متناوب با اسهال در افراد بالای ۵۰ سال', 'کاهش وزن بدون دلیل و بی‌اشتهایی', 'درد شدید، مداوم یا پیشرونده شکم همراه با استفراغ', 'عدم پاسخ به مصرف ملین‌ها پس از ۷ روز'],
    nonPharmFa: [
      'افزایش تدریجی فیبر غذایی به ۲۵ تا ۳۰ گرم در روز (میوه‌ها، سبزیجات، نان سبوس‌دار و حبوبات).',
      'نوشیدن حداقل ۱.۵ تا ۲ لیتر آب در طول روز.',
      'افزایش فعالیت بدنی و پیاده‌روی روزانه جهت تحریک حرکات دودی روده.',
      'پاسخ سریع به احساس دفع و استفاده از زیرپایی جهت قرارگیری در وضعیت چمباتمه (زاویه ۳۵ درجه).',
    ],
    clinicalPearlsFa: [
      'در دوران بارداری، لاکتولوز، فیبر پسیلیوم و ماکروگل انتخاب‌های اول و کاملاً ایمن هستند.',
      'داروهای مخدر (کدئین/اکسی‌کدون)، مکمل‌های آهن، آنتی‌کولینرژیک‌ها و مسدودکننده‌های کلسیم علل شایع یبوست دارویی هستند.',
    ],
  },

  chesty_cough: {
    cleanFaName: 'سرفه خلط‌دار و احتقان قفسه سینه',
    cleanEnName: 'Chesty Productive Cough',
    primaryCommonNameFa: 'سرفه خلط‌دار',
    primaryCommonNameEn: 'Productive Chesty Cough',
    primaryBrand: 'Bisolvon Chesty Forte / Duro-Tuss Chesty',
    commonSynonymsFa: ['سرفه خلطی', 'احتقان سینه', 'سرفه ترشحی مرطوب'],
    commonSynonymsEn: ['Wet Cough', 'Phlegm Cough', 'Chest Congestion'],
    australianBrands: [
      { brand: 'Bisolvon Chesty Forte (1.6mg/mL)', generic: 'Bromhexine HCl', form: 'محلول و شربت رقیق‌کننده خلط' },
      { brand: 'Duro-Tuss Chesty Forte', generic: 'Bromhexine + Guaifenesin', form: 'شربت اکسپکتورانت' },
      { brand: 'Robitussin Chesty Cough', generic: 'Guaifenesin', form: 'شربت رقیق‌کننده ترشحات' },
      { brand: 'Flo Saline / FESS Inhaler', generic: 'Hypertonic Saline', form: 'بخور و اسپری نمکی' },
    ],
    firstLine: {
      drugNameFa: 'بروم‌هگزین هیدروکلراید (Bisolvon Chesty Forte 8mg/5mL)',
      drugNameEn: 'Bromhexine Hydrochloride (Bisolvon Chesty Forte)',
      drugClassFa: 'موکولیتیک رقیق‌کننده و تجزیه‌کننده موکوس برونش',
      drugClassEn: 'Mucolytic & Secretolytic Agent',
      keyBrands: ['Bisolvon Chesty Forte', 'Duro-Tuss Chesty Forte'],
      dosingFa: 'بزرگسالان و کودکان بالای ۱۲ سال: ۵ تا ۱۰ میلی‌لیتر ۳ بار در روز. کودکان ۶ تا ۱۱ سال: ۵ میلی‌لیتر ۳ بار در روز. سن مجاز: ۶ سال به بالا (در کودکان زیر ۶ سال ممنوع است).',
      dosingEn: 'Adults & Children >12yo: 5-10mL 3 times daily. Children 6-11yo: 5mL 3 times daily. Strictly >6 years.',
      onsetCourseFa: 'کاهش چسبندگی خلط و تسهیل خروج ترشحات ظرف ۲۴ تا ۴۸ ساعت پس از مصرف منظم.',
      onsetCourseEn: 'Facilitates sputum clearance and reduces mucus viscosity within 24-48 hours.',
      keyWarningsFa: 'هرگز داروهای ضدسرفه سرکوب‌کننده (مانند کدئین/دکسترومتورفان) را با اکسپکتورانت‌ها ترکیب نکنید (خطر احتباس خلط و عفونت ریه). در کودکان زیر ۶ سال تمام داروهای سرفه طبق دستور TGA ممنوع هستند.',
      keyWarningsEn: 'CRITICAL: Never combine with cough suppressants. All OTC cough medicines contraindicated in children <6yo (TGA).',
      alternativesFa: 'گوایفنزین (Guaifenesin) برای افزایش حجم و روانی ترشحات مجاری تنفسی.',
      alternativesEn: 'Guaifenesin to enhance mucus volume and promote ciliary clearance.',
    },
    symptomsFa: ['سرفه همراه با تولید و دفع خلط شفاف، سفید یا زرد کم‌رنگ', 'احساس سنگینی، پر بودن و صدای خس‌خس در قفسه سینه', 'تسکین موقت احتقان پس از خروج خلط'],
    redFlagsFa: ['سرفه پایدار بیش از ۳ هفته', 'وجود خون در خلط (هموپتیزی)', 'تنگی نفس، تنفس سریع یا درد تیرکشنده قفسه سینه هنگام دم', 'خلط غلیظ چرکی قهوه‌ای یا زنگاری همراه با تب بالا (شک به پنومونی)', 'کودکان زیر ۶ سال'],
    nonPharmFa: [
      'استراحت کافی و مصرف فراوان مایعات گرم (آب، چای کم‌رنگ و سوپ) جهت رقیق‌سازی طبیعی خلط.',
      'بخور آب گرم یا استفاده از دستگاه‌های بخورساز سرد در اتاق خواب.',
      'پرهیز کامل از دود سیگار و آلاینده‌های تنفسی محیطی.',
      'شربت عسل و آبلیموی گرم (عسل در کودکان زیر ۱ سال به دلیل خطر بوتولیسم ممنوع است).',
    ],
    clinicalPearlsFa: [
      'اکسپکتورانت‌ها ترشحات را شل می‌کنند تا با سرفه خارج شوند، بنابراین افزایش موقت سرفه نشانه عملکرد دارو است.',
      'رنگ خلط به تنهایی نشانه قطعی عفونت باکتریایی نیست و بیشتر سرفه‌های حاد منشا ویروسی دارند.',
    ],
  },

  dry_cough: {
    cleanFaName: 'سرفه خشک و تحریکی',
    cleanEnName: 'Dry Irritating Cough',
    primaryCommonNameFa: 'سرفه خشک بدون خلط',
    primaryCommonNameEn: 'Non-Productive Dry Cough',
    primaryBrand: 'Rikodeine (Dihydrocodeine) / Duro-Tuss Dry Forte',
    commonSynonymsFa: ['سرفه تحریکی', 'سرفه حساسیتی گلو', 'قلقلک گلو و سرفه مداوم'],
    commonSynonymsEn: ['Tickly Cough', 'Hacking Cough', 'Irritant Cough'],
    australianBrands: [
      { brand: 'Rikodeine Liquid (1.9mg/mL)', generic: 'Dihydrocodeine tartrate', form: 'شربت سرکوب‌کننده سرفه (S3)' },
      { brand: 'Duro-Tuss Dry Forte', generic: 'Pholcodine 4mg/mL', form: 'شربت ضدسرفه' },
      { brand: 'Bisolvon Dry Liquid', generic: 'Dextromethorphan', form: 'شربت ضدسرفه' },
      { brand: 'Strepsils / Difflam Lozenges', generic: 'Demulcents & Local Antiseptics', form: 'آبنبات‌های تسکین‌دهنده گلو' },
    ],
    firstLine: {
      drugNameFa: 'شربت ریکودئین دی‌هیدروکدئین (Rikodeine S3) یا دکسترومتورفان',
      drugNameEn: 'Dihydrocodeine 1.9mg/mL (Rikodeine S3) or Dextromethorphan',
      drugClassFa: 'سرکوب‌کننده مرکزی سرفه مشتق اوپیوئیدی / غیر اوپیوئیدی',
      drugClassEn: 'Central Antitussive Agent (S3 Pharmacist Only)',
      keyBrands: ['Rikodeine Oral Liquid', 'Bisolvon Dry', 'Duro-Tuss Dry'],
      dosingFa: 'بزرگسالان و بالای ۱۲ سال: ۵ تا ۱۰ میلی‌لیتر هر ۶ تا ۸ ساعت در صورت نیاز (حداکثر ۴ بار در روز). کودکان ۶ تا ۱۱ سال: ۲.۵ تا ۵ میلی‌لیتر. سن مجاز: بالای ۶ سال.',
      dosingEn: 'Adults & Children >12yo: 5-10mL up to 4 times daily PRN. Children 6-11yo: 2.5-5mL up to 4 times daily. Strictly >6yo.',
      onsetCourseFa: 'شروع اثر ظرف ۲۰ تا ۳۰ دقیقه و ماندگاری اثر ضدسرفه حدود ۴ الی ۶ ساعت.',
      onsetCourseEn: 'Suppresses cough reflex within 20-30 minutes; duration lasts 4-6 hours.',
      keyWarningsFa: 'در بیماران مبتلا به آسم، COPD و نارسایی تنفسی اکیداً ممنوع است. ریکودئین حاوی سوربیتول است و در دوز بالا ممکن است اسهال ایجاد کند. ثبت شناسه در سیستم رصد دارویی استرالیا (SafeScript / Real-Time Prescription Monitoring).',
      keyWarningsEn: 'Strictly contraindicated in Asthma, COPD, and respiratory depression. Monitored under SafeScript.',
      alternativesFa: 'شربت‌های نرم‌کننده موسیلاژی (Glycerol / Honey) و آبنبات‌های گلو برای تسکین سوزش و خارش موضعی گلو.',
      alternativesEn: 'Glycerol-based demulcents and lozenges for soothing throat tickle safely.',
    },
    symptomsFa: ['سرفه‌های خشک، خشن، مقطع و بدون هیچ‌گونه خلط', 'احساس قلقلک و سوزش مداوم در پشت گلو', 'تشدید سرفه در وضعیت درازکش و هنگام خواب شب'],
    redFlagsFa: ['سرفه پایدار بیش از ۳ هفته', 'تنگی نفس، خس‌خس سینه یا احساس خفگی', 'سرفه ناشی از داروهای مهارکننده ACE (مانند کاپتوپریل، انالاپریل، پریندوپریل)', 'سرفه شبانه همراه با کاهش وزن و تعریق شبانه (شک به بدخیمی یا سل)'],
    nonPharmFa: [
      'نوشیدن مخلوط آب گرم، عسل طبیعی و لیموترش تازه جهت پوشش مخاط حلق.',
      'مکیدن آبنبات‌های نرم‌کننده گلو و مرطوب نگه داشتن محیط با بخور سرد.',
      'پرهیز از تغییرات ناگهانی دما، هوای سرد خشک و دود دخانیات.',
    ],
    clinicalPearlsFa: [
      'داروساز در استرالیا باید وضعیت تنفسی بیمار را ارزیابی کرده و قبل از تحویل ریکودئین سوابق هویت بیمار را در سامانه SafeScript چک نماید.',
    ],
  },

  diarrhoea: {
    cleanFaName: 'اسهال حاد و گاستروانتریت',
    cleanEnName: 'Acute Diarrhoea & Gastroenteritis',
    primaryCommonNameFa: 'اسهال حاد بزرگسالان و کودکان',
    primaryCommonNameEn: 'Acute Watery Diarrhoea',
    primaryBrand: 'Gastro-Stop / Imodium 2mg + Hydralyte',
    commonSynonymsFa: ['اسهال آبکی', 'روانی شکم', 'مسمومیت گوارشی و دهیدراتاسیون'],
    commonSynonymsEn: ['Gastroenteritis', 'Loose Stools', 'Traveller’s Diarrhoea'],
    australianBrands: [
      { brand: 'Gastro-Stop / Imodium 2mg', generic: 'Loperamide hydrochloride', form: 'کپسول و قرص ضداسهال' },
      { brand: 'Hydralyte / Gastrolyte', generic: 'Oral Rehydration Salts (ORS)', form: 'ساشه و قرص جوشان ORS' },
      { brand: 'Lomotil', generic: 'Diphenoxylate 2.5mg + Atropine 25mcg', form: 'قرص ضداسهال (S3/S4)' },
    ],
    firstLine: {
      drugNameFa: 'محلول آبرسانی خوراکی الکترولیت‌ها (Hydralyte ORS) + لوپرامید در موارد ضروری',
      drugNameEn: 'Oral Rehydration Therapy (Hydralyte) + Loperamide 2mg if indicated',
      drugClassFa: 'محلول جبران آب و املاح (ORS) + آنالوگ اوپیوئیدی کاهش‌دهنده حرکات دودی روده',
      drugClassEn: 'Oral Electrolyte Replacement & Peripheral Opioid Motility Inhibitor',
      keyBrands: ['Hydralyte', 'Gastro-Stop', 'Imodium'],
      dosingFa: 'هیدراتاسیون: حل کردن ۱ ساشه یا ۲ قرص جوشان در ۲۰۰ میلی‌لیتر آب و نوشیدن پس از هر بار دفع شل. لوپرامید (بزرگسالان بالای ۱۲ سال): ۲ کپسول (۴ میلی‌گرم) در شروع، سپس ۱ کپسول (۲ میلی‌گرم) پس از هر بار دفع شل (حداکثر ۸ کپسول / ۱۶ میلی‌گرم در ۲۴ ساعت).',
      dosingEn: 'Hydration: 200mL ORS after each loose motion. Loperamide (>12yo): 2 caps (4mg) stat, then 1 cap (2mg) after each loose stool (max 16mg/24h).',
      onsetCourseFa: 'لوپرامید ظرف ۱ تا ۲ ساعت حرکات روده را کند می‌کند؛ اسهال حاد ویروسی معمولاً طی ۲ تا ۳ روز خودبه‌خود برطرف می‌شود.',
      onsetCourseEn: 'Loperamide acts within 1-2 hours. Acute viral diarrhoea is typically self-limiting in 2-3 days.',
      keyWarningsFa: 'در اسهال خونی (دیسانتری)، تب شدید یا مشکوک به کولیت باکتریایی تهاجمی لوپرامید اکیداً ممنوع است (خطر مگاکولون توکسیک). مصرف لوپرامید در کودکان زیر ۱۲ سال با گاستروانتریت حاد ممنوع است.',
      keyWarningsEn: 'CRITICAL: Contraindicated in bloody diarrhoea (dysentery), high fever, or acute colitis. Do NOT give loperamide to children.',
      alternativesFa: 'پروبیوتیک‌ها (مانند Saccharomyces boulardii / LactoGG) جهت بازسازی فلور میکروبی روده.',
      alternativesEn: 'Probiotics (e.g. Saccharomyces boulardii) to restore normal intestinal microflora.',
    },
    symptomsFa: ['دفع مکرر مدفوع آبکی یا شل بیش از ۳ بار در روز', 'کرامپ و دردهای پیچشی خفیف شکم', 'احساس فوریت در دفع و تهوع خفیف'],
    redFlagsFa: ['خون یا موکوس واضح در مدفوع', 'اسهال بیش از ۴۸ ساعت در بزرگسالان یا بیش از ۲۴ ساعت در کودکان', 'علائم کم‌آبی شدید (خشکی زبان، گودی چشم‌ها، کاهش ادرار، سرگیجه وضعیتی)', 'تب بالای ۳۸.۵ درجه یا سمیت عمومی', 'تمام نوزادان و کودکان زیر ۶ ماه'],
    nonPharmFa: [
      'جایگزینی مداوم آب و الکترولیت‌ها اصل حیاتی و غیرقابل چشم‌پوشی در درمان اسهال است.',
      'پرهیز از آبمیوه‌های صنعتی، نوشابه‌های قندی و شیر به دلیل خاصیت اسموتیک و تشدید اسهال.',
      'شروع زودهنگام تغذیه نرم (برنج کته، موز، نان تست، سیب‌زمینی پخته) به محض تحمل بیمار.',
    ],
    clinicalPearlsFa: [
      'داروهای ضداسهال مثل لوپرامید عامل بیماری‌زا را در روده نگه می‌دارند و نباید روتین در هر اسهالی مصرف شوند، بلکه برای موارد ضروری (سفر، کار) کاربرد دارند.',
    ],
  },

  dry_eyes: {
    cleanFaName: 'خشکی چشم و خستگی بینایی',
    cleanEnName: 'Dry Eyes & Ocular Lubrication',
    primaryCommonNameFa: 'سندرم خشکی چشم',
    primaryCommonNameEn: 'Dry Eye Syndrome & Keratoconjunctivitis Sicca',
    primaryBrand: 'Systane Ultra / Hylo-Forte 0.2% / Refresh Tears',
    commonSynonymsFa: ['سوزش چشم', 'احساس سنگ‌ریزه در چشم', 'خستگی چشم ناشی از مانیتور'],
    commonSynonymsEn: ['Dry Eye Disease', 'Gritty Eyes', 'Digital Eye Strain'],
    australianBrands: [
      { brand: 'Hylo-Forte 0.2% / Hylo-Fresh', generic: 'Sodium Hyaluronate', form: 'قطره فاقد نگه‌دارنده چنددوز' },
      { brand: 'Systane Ultra / Complete', generic: 'Propylene Glycol + HP-Guar', form: 'قطره مرطوب‌کننده چشم' },
      { brand: 'Refresh Tears Plus', generic: 'Carmellose Sodium 0.5%', form: 'قطره چشمی' },
      { brand: 'Poly-Gel / Systane Nighttime', generic: 'Carbomer / Paraffin', form: 'ژل و پماد چشمی شبانه' },
    ],
    firstLine: {
      drugNameFa: 'قطره‌های اشک مصنوعی سدیم هیالورونات (Hylo-Forte) یا سیستان (Systane)',
      drugNameEn: 'Preservative-Free Ocular Lubricants: Sodium Hyaluronate (Hylo-Forte) or Systane',
      drugClassFa: 'روان‌کننده و مرطوب‌کننده ویسکوالاستیک سطح قرنیه و ملتحمه',
      drugClassEn: 'Viscoelastic Ocular Lubricant & Tear Film Stabilizer',
      keyBrands: ['Hylo-Forte 0.2%', 'Systane Ultra', 'Refresh Tears Plus'],
      dosingFa: '۱ قطره در هر چشم بر حسب نیاز ۳ تا ۶ بار در روز (یا هر ۱ تا ۲ ساعت در موارد شدید). پمادهای چشمی شبانه قبل از خواب.',
      dosingEn: 'Instil 1 drop into affected eye(s) 3-6 times daily as needed (or hourly if severe). Lubricating ointments at bedtime.',
      onsetCourseFa: 'تسکین فوری سوزش و احساس جسم خارجی ظرف چند ثانیه پس از چکاندن قطره.',
      onsetCourseEn: 'Immediate soothing of burning and foreign body sensation within seconds.',
      keyWarningsFa: 'در صورت استفاده همزمان با سایر قطره‌های دارویی، حداقل ۵ تا ۱۰ دقیقه فاصله زمانی رعایت شود (همیشه پماد آخر از همه مصرف شود). در استفاده‌کنندگان از لنزهای تماسی از قطره‌های فاقد ماده نگه‌دارنده (Preservative-Free) استفاده شود.',
      keyWarningsEn: 'Allow 5-10 mins between different eye drops. Use Preservative-Free drops with soft contact lenses.',
      alternativesFa: 'ژل‌های غلیظ‌تر حاوی کربومر (Poly-Gel) یا پمادهای چشمی روغنی در خشکی شبانه شدید.',
      alternativesEn: 'Carbomer-based gels or nighttime lubricating ointments for severe nocturnal exposure.',
    },
    symptomsFa: ['احساس سوزش، خارش و وجود شن‌ریزه در چشم', 'قرمزی و خستگی چشم‌ها در انتهای روز یا حین کار با کامپیوتر', 'آبریزش واکنشی متناقض چشم‌ها در مواجهه با باد'],
    redFlagsFa: ['درد شدید یا ضربان‌دار چشم', 'تاری دید مداوم یا دیدن هاله‌های نوری اطراف چراغ‌ها', 'حساسیت شدید به نور (فتوفوبی)', 'ترشحات چرکی زرد و چسبندگی مژه‌ها (عفونت باکتریایی)'],
    nonPharmFa: [
      'قانون ۲۰-۲۰-۲۰: در حین کار با نمایشگر، هر ۲۰ دقیقه به مدت ۲۰ ثانیه به فاصله‌ای در ۶ متری (۲۰ فوت) نگاه کنید و پلک بزنید.',
      'استفاده از دستگاه رطوبت‌ساز در محیط کار یا منزل و اجتناب از وزش مستقیم باد کولر/بخاری به صورت.',
      'استفاده از عینک آفتابی با پوشش کامل در هوای بادی و خشک.',
    ],
    clinicalPearlsFa: [
      'ماده نگه‌دارنده بنزالکونیوم کلراید (BAK) در مصرف مکرر باعث سمیت اپیتلیوم قرنیه می‌شود؛ بنابراین در مصرف بیش از ۴ بار در روز حتماً فرم‌های Preservative-Free انتخاب گردند.',
    ],
  },

  eczema: {
    cleanFaName: 'اگزما و درماتیت آتوپیک',
    cleanEnName: 'Eczema & Atopic Dermatitis',
    primaryCommonNameFa: 'درماتیت و اگزمای آتوپیک',
    primaryCommonNameEn: 'Atopic Eczema & Dermatitis',
    primaryBrand: 'Dermaid 1% / Sigmacort 1% + QV Flare Up Cream',
    commonSynonymsFa: ['خشکی و خارش پوست', 'اگزمای تماسی و سرشتی', 'التهاب و پوسته‌ریزی پوست'],
    commonSynonymsEn: ['Atopic Dermatitis', 'Dry Itchy Skin', 'Flexural Rash'],
    australianBrands: [
      { brand: 'Dermaid 0.5% / 1% Cream', generic: 'Hydrocortisone (with dissolved formulation)', form: 'کرم کورتونی موضعی (S2/S3)' },
      { brand: 'Sigmacort / Cortic-DS 1%', generic: 'Hydrocortisone acetate 1%', form: 'کرم و پماد کورتونی' },
      { brand: 'QV Intensive Cream / Flare Up', generic: 'Glycerol + Liquid Paraffin', form: 'امولینت و کرم مرطوب‌کننده قوی' },
      { brand: 'Cetraben / Epaderm Ointment', generic: 'Paraffin Emollient', form: 'پماد نرم‌کننده عمقی' },
      { brand: 'Eumovate Cream (0.05%)', generic: 'Clobetasone butyrate', form: 'کورتیکواستروئید با توان متوسط (S3)' },
    ],
    firstLine: {
      drugNameFa: 'مرطوب‌کننده قوی بدون بو (Emollient) + هیدروکورتیزون ۱٪ در زمان شعله‌وری (Flare-up)',
      drugNameEn: 'Liberal Emollient Therapy + Topical Hydrocortisone 1% during acute flare-ups',
      drugClassFa: 'ترمیم‌کننده سد دفاعی پوست + کورتیکواستروئید موضعی خفیف',
      drugClassEn: 'Skin Barrier Repair Emollient & Mild Topical Corticosteroid',
      keyBrands: ['Dermaid 1%', 'QV Intensive / Flare Up', 'Sigmacort 1%'],
      dosingFa: 'هیدروکورتیزون ۱٪: یک لایه بسیار نازک روی نواحی ملتهب ۱ تا ۲ بار در روز به مدت حداکثر ۷ روز. مرطوب‌کننده (QV): مصرف سخاوتمندانه و مکرر حداقل ۳ تا ۴ بار در روز و بلافاصله پس از حمام روی کل پوست.',
      dosingEn: 'Hydrocortisone 1%: Apply thinly 1-2 times daily to inflamed areas for max 7 days. Emollients: Apply liberally 3-4 times daily.',
      onsetCourseFa: 'تسکین خارش و قرمزی ظرف ۲۴ تا ۴۸ ساعت با کورتون موضعی؛ ترمیم سد پوستی نیازمند امولینت مداوم است.',
      onsetCourseEn: 'Redness and pruritus diminish within 24-48h; barrier repair requires ongoing daily emollients.',
      keyWarningsFa: 'واحد بند انگشت (Fingertip Unit - FTU): یک FTU (حدود ۵۰۰ میلی‌گرم) مساحتی معادل دو کف دست فرد بالغ را پوشش می‌دهد. از مصرف کورتون‌های موضعی طولانی‌مدت روی صورت یا کشاله ران بدون دستور پزشک خودداری شود.',
      keyWarningsEn: '1 FTU covers two adult palms. Avoid prolonged use on face or intertriginous skin (risk of skin atrophy).',
      alternativesFa: 'کلوبتاسون بوتیرات ۰.۰۵٪ (Eumovate - S3) برای اگزمای مقاوم به هیدروکورتیزون در افراد بالای ۱۲ سال.',
      alternativesEn: 'Clobetasone butyrate 0.05% (Eumovate S3) for short-term control of moderate eczema in >12yo.',
    },
    symptomsFa: ['پوست خشک، زبر، خارش‌دار و پوسته‌پوسته', 'پلاک‌های قرمز ملتهب در چین‌های پوستی (پشت زانو، چین آرنج و مچ دست)', 'خراشیدگی و ضخیم شدن پوست ناشی از خاراندن مداوم (Lichenification)'],
    redFlagsFa: ['ضایعات دلمه‌بسته زرد رنگ عسلی ناشی از عفونت زردزخمی ثانویه', 'بروز ناگهانی تاول‌های دردناک خوشه‌ای همراه با تب (شک به اگزمای هرپتیکوم اورژانسی)', 'عدم پاسخ به هیدروکورتیزون ۱٪ پس از ۷ روز', 'اگزمای شدید و گسترده در نوزادان زیر ۶ ماه'],
    nonPharmFa: [
      'دوش‌های کوتاه (کمتر از ۵ دقیقه) با آب ولرم (نه داغ) و استفاده از شوینده‌های غیرصابونی روغنی.',
      'مالیدن امولینت روی پوست تا ۳ دقیقه پس از خروج از حمام در حالت نیمه‌مرطوب جهت به دام انداختن رطوبت.',
      'پوشیدن لباس‌های نخی گشاد و پرهیز از لباس‌های پشمی یا الیاف مصنوعی زبر.',
      'استفاده از دستگاه بخورساز در منزل و کوتاه نگه‌داشتن ناخن‌های کودک.',
    ],
    clinicalPearlsFa: [
      'مرطوب‌کننده درمان پایه و دائمی اگزماست و باید حتی در فازهای خاموشی بیماری نیز روزانه ادامه یابد.',
      'ترس از کورتون (Corticophobia) شایع‌ترین علت شکست درمان اگزما در بیماران است؛ مصرف دوره‌ای کوتاه و صحیح کاملاً ایمن است.',
    ],
  },

  gord_heartburn: {
    cleanFaName: 'ریفلاکس معده و سوزش سر دل',
    cleanEnName: 'GORD & Heartburn / Dyspepsia',
    primaryCommonNameFa: 'ریفلاکس اسید و سوزش معده',
    primaryCommonNameEn: 'Gastro-Oesophageal Reflux & Acid Indigestion',
    primaryBrand: 'Somac Heartburn / Nexium 24HR / Gaviscon Dual Action',
    commonSynonymsFa: ['سوزش جناغ سینه', 'ترش کردن معده', 'برگشت اسید به دهان', 'سوء هاضمه اسیدی'],
    commonSynonymsEn: ['Acid Reflux', 'Heartburn', 'Waterbrash', 'Dyspepsia'],
    australianBrands: [
      { brand: 'Somac Heartburn 20mg', generic: 'Pantoprazole 20mg', form: 'قرص مهارکننده پمپ پروتون (S3)' },
      { brand: 'Nexium 24HR 20mg', generic: 'Esomeprazole 20mg', form: 'قرص PPI روزانه (S3)' },
      { brand: 'Gaviscon Dual Action', generic: 'Sodium Alginate + Antacids', form: 'محلول و قرص جویدنی آلژینات' },
      { brand: 'Mylanta / Quick-Eze', generic: 'Aluminium/Magnesium Hydroxide', form: 'قرص جویدنی و شربت آنتی‌اسید' },
      { brand: 'Zantac Relief (Famotidine)', generic: 'Famotidine', form: 'قرص بلوک‌کننده H2' },
    ],
    firstLine: {
      drugNameFa: 'مهارکننده پمپ پروتون (PPI: Pantoprazole 20mg یا Esomeprazole 20mg) یا سوسپانسیون آلژینات (Gaviscon)',
      drugNameEn: 'Proton Pump Inhibitor (PPI: Pantoprazole 20mg) or Alginate Raft (Gaviscon Dual Action)',
      drugClassFa: 'مهارکننده ترشح اسید معده (PPI) / سد مکانیکی ژلی ضدریفلاکس (Alginate)',
      drugClassEn: 'Gastric Acid Proton Pump Inhibitor & Alginate Antireflux Raft',
      keyBrands: ['Somac Heartburn 20mg', 'Nexium 24HR', 'Gaviscon Dual Action'],
      dosingFa: 'پنتوپرازول ۲۰ میلی‌گرم (Somac): ۱ قرص صبح‌ها ناشتا ۳۰ دقیقه قبل از صبحانه به مدت حداکثر ۱۴ روز متوالی. گاوسیکون: ۱۰ تا ۲۰ میلی‌لیتر بعد از غذا و قبل از خواب برای تسکین فوری.',
      dosingEn: 'Pantoprazole 20mg: 1 tablet daily 30 min before breakfast for up to 14 days. Gaviscon: 10-20mL after meals and bedtime.',
      onsetCourseFa: 'آلژینات‌ها و آنتی‌اسیدها ظرف چند دقیقه اثر می‌کنند؛ مهارکننده‌های PPI ظرف ۲۴ تا ۴۸ ساعت مهار کامل اسید را برقرار می‌سازند.',
      onsetCourseEn: 'Antacids/Alginates provide instant relief (<5 mins); PPIs take 1-3 days for maximum acid suppression.',
      keyWarningsFa: 'قرص‌های PPI باید به طور کامل با آب بلعیده شوند (از خرد کردن یا جویدن خودداری شود). در صورت نیاز به مصرف بیش از ۱۴ روز یا عود علائم، ارجاع به پزشک جهت بررسی هلیکوباکتر پیلوری و اندوسکوپی الزامی است.',
      keyWarningsEn: 'Do not crush PPI tablets. Refer if symptoms persist >14 days or relapse quickly after stopping.',
      alternativesFa: 'ترکیبات آنتی‌اسید سریع‌الاثر (Mylanta) برای سوزش سر دل گهگاهی و خفیف.',
      alternativesEn: 'Quick-acting antacids (Mylanta / Quick-Eze) for episodic postprandial heartburn.',
    },
    symptomsFa: ['احساس سوزش پشت جناغ سینه که به سمت گلو تیر می‌کشد', 'طعم ترش یا تلخ مایع اسیدی در دهان (Waterbrash)', 'تشدید علائم پس از غذا خوردن، خم شدن به جلو یا دراز کشیدن'],
    redFlagsFa: ['اشکال یا درد هنگام بلع غذا (دیسفاژی یا اودینوفاژی)', 'استفراغ خونی یا با ظاهر دانه‌های قهوه، یا مدفوع سیاه قیری', 'کاهش وزن ناخواسته و بدون دلیل', 'شروع جدید علائم سوء هاضمه در افراد بالای ۵۵ سال', 'درد قفسه سینه همراه با تنگی نفس یا انتشار به فک و دست چپ (شک به سکته قلبی)'],
    nonPharmFa: [
      'تقسیم وعده‌های غذایی به وعده‌های کوچکتر و مکرر و پرهیز از پرخوری.',
      'عدم دراز کشیدن تا ۳ ساعت پس از صرف غذا.',
      'بالا بردن سر تخت به میزان ۱۰ تا ۱۵ سانتی‌متر (استفاده از بالشتک شیب‌دار).',
      'کاهش وزن در افراد دچار اضافه‌وزن و پرهیز از لباس‌های تنگ در ناحیه شکم.',
      'پرهیز از محرک‌ها: غذاهای چرب و تند، قهوه، شکلات، الکل، نعناع و مرکبات.',
    ],
    clinicalPearlsFa: [
      'Gaviscon با تشکیل لایه ژلی فوم‌مانند از اسید آلژینیک روی محتویات معده، مانع از صعود فیزیکی اسید به مری می‌شود.',
      'در بارداری، آنتی‌اسیدهای حاوی کلسیم/منیزیم و گاوسیکون انتخاب‌های اول و ایمن هستند.',
    ],
  },

  haemorrhoids: {
    cleanFaName: 'بواسیر و هموروئید',
    cleanEnName: 'Haemorrhoids (Piles)',
    primaryCommonNameFa: 'بواسیر داخلی و خارجی',
    primaryCommonNameEn: 'Haemorrhoidal Disease',
    primaryBrand: 'Proctosedyl Ointment / Suppositories / Anusol',
    commonSynonymsFa: ['هموروئید', 'تورم عروق مقعد', 'خونریزی روشن هنگام دفع'],
    commonSynonymsEn: ['Piles', 'Perianal Venous Congestion', 'Rectal Tags'],
    australianBrands: [
      { brand: 'Proctosedyl Ointment / Suppositories', generic: 'Hydrocortisone 5mg + Cinchocaine 5mg', form: 'پماد و شیاف ترکیبی (S2/S3)' },
      { brand: 'Anusol Ointment / Suppositories', generic: 'Zinc Oxide + Balsam Peru', form: 'پماد و شیاف محافظ و ضدسوزش' },
      { brand: 'Scheriproct Ointment', generic: 'Prednisolone + Cinchocaine', form: 'پماد ضدالتهاب هموروئید (S3)' },
      { brand: 'Coloxyl / Movicol', generic: 'Docusate / Macrogol', form: 'ملین و نرم‌کننده مدفوع' },
    ],
    firstLine: {
      drugNameFa: 'پماد یا شیاف پروکتوزدیل (Proctosedyl) به مدت حداکثر ۷ روز + نرم‌کننده مدفوع',
      drugNameEn: 'Topical Corticosteroid + Local Anaesthetic (Proctosedyl) for max 7 days',
      drugClassFa: 'کورتیکواستروئید ضدالتهاب موضعی + بی‌حس‌کننده موضعی آمیدی',
      drugClassEn: 'Topical Anti-inflammatory Corticosteroid & Local Anaesthetic',
      keyBrands: ['Proctosedyl', 'Anusol', 'Scheriproct', 'Movicol'],
      dosingFa: 'پماد: صبح و شب و پس از هر بار دفع مدفوع با اپلیکاتور تمیز مالیده شود (حداکثر ۷ روز متوالی). شیاف: ۱ شیاف صبح و شب پس از تخلیه روده.',
      dosingEn: 'Apply ointment or insert 1 suppository morning, night, and after each bowel motion for up to 7 days maximum.',
      onsetCourseFa: 'تسکین سریع درد و سوزش با بی‌حس‌کننده ظرف ۵ تا ۱۵ دقیقه؛ کاهش تورم ظرف ۲ الی ۳ روز.',
      onsetCourseEn: 'Rapid pain relief within 5-15 minutes; inflammatory swelling subsides in 2-3 days.',
      keyWarningsFa: 'مصرف کورتون‌های موضعی به دلیل خطر نازک شدن و آتروفی پوست حساس پری‌آنال و عفونت‌های قارچی نباید از ۷ روز فراتر رود.',
      keyWarningsEn: 'Strictly limit topical steroid preparations to 7 days to avoid perianal skin atrophy.',
      alternativesFa: 'پمادهای فاقد کورتون مانند آنوسول (Anusol) حاوی زینک اکساید برای مصرف طولانی‌مدت‌تر و در بارداری.',
      alternativesEn: 'Non-steroidal astringent barrier creams (Anusol) for prolonged maintenance or pregnancy.',
    },
    symptomsFa: ['خونریزی بدون درد به رنگ قرمز روشن روی مدفوع یا دستمال توالت', 'احساس برجستگی، توده یا بیرون‌زدگی در ناحیه مقعد', 'خارش و ترشح مرطوب مقعدی'],
    redFlagsFa: ['خونریزی تیره رنگ یا مخلوط با مدفوع، یا مدفوع سیاه قیری', 'درد ناگهانی و بسیار شدید و غیرقابل تحمل (شک به هموروئید ترومبوزه حاد)', 'بی‌اختیاری مدفوع یا ترشحات چرکی مداوم', 'توده غیرقابل جااندازی یا مشکوک به بدخیمی رکتوم'],
    nonPharmFa: [
      'پرهیز از زور زدن و نشستن طولانی‌مدت روی کاسه توالت (حداکثر ۳ تا ۵ دقیقه).',
      'حمام آب گرم نشیمن (Sitz Bath) روزی ۲ تا ۳ بار به مدت ۱۵ دقیقه.',
      'افزایش مصرف فیبر غذایی و مصرف مکمل‌های موسیلاژی (پسیلیوم) همراه با آب فراوان جهت رفع یبوست.',
      'استفاده از کمپرس سرد موضعی جهت کاهش ورم حاد.',
    ],
    clinicalPearlsFa: [
      'هموروئید بدون درمان یبوست ریشه‌کن نمی‌شود؛ تجویز نرم‌کننده‌های مدفوع (مانند Movicol یا Coloxyl) بخش جدایی‌ناپذیر پروتکل است.',
    ],
  },

  headlice: {
    cleanFaName: 'شپش سر و رشک',
    cleanEnName: 'Head Lice (Pediculosis Capitis)',
    primaryCommonNameFa: 'آلودگی با شپش و رشک سر',
    primaryCommonNameEn: 'Head Lice Infestation',
    primaryBrand: 'Hedrin 15 / Lyclear / Moov Head Lice',
    commonSynonymsFa: ['پدیکولوزیس', 'تخم شپش سر', 'خارش شدید پوست سر'],
    commonSynonymsEn: ['Nits', 'Pediculosis Capitis', 'Louse Infestation'],
    australianBrands: [
      { brand: 'Hedrin 15 Lotion / Spray', generic: 'Dimethicone 4% + Nerolidol', form: 'محلول و اسپری فیزیکی خفه‌کننده' },
      { brand: 'Lyclear Treatment Lotion', generic: 'Permethrin 1%', form: 'لوسیون حشره‌کش' },
      { brand: 'Moov Head Lice Shampoo / Lotion', generic: 'Eucalyptus & Tea Tree Oil', form: 'شامپو و لوسیون گیاهی' },
      { brand: 'Licener Single Treatment', generic: 'Neem Extract', form: 'شامپوی گیاهی تک‌مرحله‌ای' },
    ],
    firstLine: {
      drugNameFa: 'دایمتیکون ۴٪ (Hedrin 15) یا پرمترین ۱٪ + شانه دندانه‌ریز فلزی',
      drugNameEn: 'Dimethicone 4% Physical Occlusion (Hedrin) or Permethrin 1% + Fine-Tooth Comb',
      drugClassFa: 'محلول فیزیکی خفه‌کننده منافذ تنفسی شپش و تخم (فاقد سمیت شیمیایی)',
      drugClassEn: 'Physical Occlusive Pediculicide & Ovicidal Agent',
      keyBrands: ['Hedrin 15', 'Lyclear', 'Moov Head Lice'],
      dosingFa: 'هدریل دایمتیکون: روی موهای کاملاً خشک از ریشه تا نوک مو مالیده شود؛ پس از ۱۵ دقیقه شانه زده و شسته شود. تکرار حتمی و اجباری پس از ۷ روز برای کشتن شپش‌های تازه‌متولدشده از تخم‌های باقیمانده.',
      dosingEn: 'Apply to dry hair from roots to ends. Leave for 15 mins, comb thoroughly. MANDATORY REPEAT TREATMENT AFTER 7 DAYS.',
      onsetCourseFa: 'کشتن ۱۰۰٪ شپش‌های زنده در صورت پوشش کامل؛ تکرار روز هفتم چرخه زندگی انگل را متوقف می‌کند.',
      onsetCourseEn: 'Kills mobile lice immediately; day-7 repeat breaks the reproduction life cycle.',
      keyWarningsFa: 'دایمتیکون مو را به شدت قابل اشتعال می‌کند؛ تا زمان شستشوی کامل از آتش، سیگار و سشوار دور بمانید. درمان سایر اعضای خانواده فقط در صورت مشاهده شپش زنده انجام شود.',
      keyWarningsEn: 'Hair remains flammable while product is applied. Treat household contacts only if live lice detected.',
      alternativesFa: 'روش شانه کردن مرطوب با نرم‌کننده مو (Conditioner and Comb Method) هر ۲ تا ۳ روز به مدت ۲ هفته.',
      alternativesEn: 'Conditioner and Wet Combing method every 2-3 days for 2 weeks.',
    },
    symptomsFa: ['خارش شدید و مداوم پوست سر بویژه در پشت گوش‌ها و پشت گردن', 'مشاهده شپش‌های زنده متحرک خاکستری-قهوه‌ای به اندازه دانه کنجد', 'وجود رشک‌ها (تخم‌های سفید چسبیده به ساقه مو در فاصله ۱ سانتی‌متری پوست سر)'],
    redFlagsFa: ['عفونت باکتریایی ثانویه پوست سر با دلمه‌های زرد و چرک ناشی از خاراندن شدید', 'سن زیر ۶ ماه', 'آلودگی مژه‌ها یا ابروها'],
    nonPharmFa: [
      'استفاده از شانه فلزی مخصوص دندانه‌ریز شپش روی موهای آغشته به نرم‌کننده مو.',
      'شستشوی روبالشی‌ها، ملحفه‌ها و کلاه‌های استفاده‌شده در ۴۸ ساعت گذشته با آب داغ بالای ۶۰ درجه.',
      'قرار دادن شانه و برس‌های مو در آب داغ ۶۰ درجه به مدت ۱۰ دقیقه.',
      'نیازی به سمپاشی خانه یا غیبت طولانی از مدرسه نیست؛ پس از شروع اولین درمان حضور در مدرسه بلامانع است.',
    ],
    clinicalPearlsFa: [
      'مقاومت حشره‌کش‌های شیمیایی (پرمترین) رو به افزایش است؛ بنابراین ترکیبات فیزیکی خفه‌کننده مانند دایمتیکون (Hedrin) خط اول ارجح محسوب می‌شوند.',
    ],
  },

  motion_sickness: {
    cleanFaName: 'بیماری حرکت و تهوع سفر',
    cleanEnName: 'Motion Sickness (Kinetosis)',
    primaryCommonNameFa: 'ماشین‌زدگی و تهوع سفر دریایی/هوایی',
    primaryCommonNameEn: 'Motion Sickness & Sea Sickness',
    primaryBrand: 'Kwells / Travacalm Original / Blackmores Ginger',
    commonSynonymsFa: ['ماشین‌زدگی', 'حالت تهوع سفر', 'دریازدگی و سرگیجه حرکتی'],
    commonSynonymsEn: ['Travel Sickness', 'Car Sickness', 'Sea Sickness'],
    australianBrands: [
      { brand: 'Kwells Adults (300mcg) / Kids (150mcg)', generic: 'Hyoscine Hydrobromide', form: 'قرص حل‌شونده در دهان (S2)' },
      { brand: 'Travacalm Original', generic: 'Dimenhydrinate + Hyoscine + Caffeine', form: 'قرص ترکیبی ضدتهوع' },
      { brand: 'Travacalm HO', generic: 'Hyoscine Hydrobromide 300mcg', form: 'قرص تک‌ماده‌ای' },
      { brand: 'Travacalm Natural', generic: 'Zingiber officinale (Ginger)', form: 'کپسول زنجبیل طبیعی' },
      { brand: 'Sea-Band', generic: 'Acupressure Wristband', form: 'مچ‌بند طب فشاری P6' },
    ],
    firstLine: {
      drugNameFa: 'هیوسین هیدروبوماید (Kwells) ۳۰ دقیقه قبل از حرکت یا دیمن‌هیدرینات (Travacalm)',
      drugNameEn: 'Hyoscine Hydrobromide (Kwells) 30 min prior to travel or Dimenhydrinate',
      drugClassFa: 'آنتی‌کولینرژیک مهارکننده مسیرهای دهلیزی وستیبولار گوش داخلی',
      drugClassEn: 'Vestibular Anticholinergic & Antiemetic Agent',
      keyBrands: ['Kwells Adults 300mcg', 'Kwells Kids 150mcg', 'Travacalm Original'],
      dosingFa: 'بزرگسالان: ۱ تا ۲ قرص ۳۰۰ میکروگرم ۳۰ دقیقه قبل از شروع سفر، در صورت لزوم هر ۴ تا ۶ ساعت تکرار شود (حداکثر ۳ قرص در ۲۴ ساعت). کودکان ۷ تا ۱۱ سال: ۱ قرص Kwells Kids (۱۵۰ میکروگرم).',
      dosingEn: 'Adults: 1-2 tablets (300-600mcg) 30 mins before journey, max 3 tablets/24h. Children 7-11yo: 150mcg.',
      onsetCourseFa: 'شروع اثر سریع ظرف ۲۰ تا ۳۰ دقیقه؛ بهترین اثر با مصرف پیشگیرانه قبل از شروع علائم حاصل می‌شود.',
      onsetCourseEn: 'Rapid onset within 20-30 minutes; must be taken prophylactically before onset of nausea.',
      keyWarningsFa: 'عوارض آنتی‌کولینرژیک: خواب‌آلودگی، خشکی دهان و تاری دید. در مبتلایان به گلوکوم زاویه بسته (آب سیاه) و بزرگی پروستات اکیداً ممنوع است. از رانندگی و کار با ماشین‌آلات خودداری شود.',
      keyWarningsEn: 'Causes drowsiness, blurred vision, and dry mouth. Strictly contraindicated in closed-angle glaucoma and urinary retention.',
      alternativesFa: 'کپسول‌های ریشه زنجبیل (Travacalm Natural) و مچ‌بندهای طب فشاری برای زنان باردار و افراد حساس به خواب‌آلودگی.',
      alternativesEn: 'Ginger extract or Sea-Band acupressure bands for pregnant women or those avoiding sedation.',
    },
    symptomsFa: ['رنگ‌پریدگی، عرق سرد و احساس ناخوشی مبهم شکم', 'تهوع پیشرونده و استفراغ در حین حرکت خودرو، کشتی یا هواپیما', 'سرگیجه، خمیازه‌های مکرر و سردرد'],
    redFlagsFa: ['استفراغ شدید مقاوم به درمان همراه با دهیدراتاسیون', 'سرگیجه یا عدم تعادل که ساعت‌ها پس از اتمام سفر ادامه یابد', 'سردرد شدید، دوبینی یا افت هوشیاری'],
    nonPharmFa: [
      'نشستن در صندلی جلو اتومبیل، روی بال هواپیما یا در قسمت میانی کشتی با دید به افق ثابت.',
      'پرهیز از مطالعه، تماشای صفحه گوشی و تماشای اجسام متحرک کناری.',
      'تهویه هوای تازه و باز کردن پنجره یا دریچه کولر به سمت صورت.',
      'خوردن وعده غذایی سبک قبل از سفر و پرهیز از غذاهای پرچرب و الکل.',
    ],
    clinicalPearlsFa: [
      'داروهای ضد بیماری حرکت در صورت مصرف پس از شروع تهوع و استفراغ شدید جذب مناسبی ندارند و پیشگیری کلید موفقیت است.',
    ],
  },

  mouth_ulcers: {
    cleanFaName: 'آفت و زخم‌های دهانی',
    cleanEnName: 'Recurrent Aphthous Ulcers (Mouth Ulcers)',
    primaryCommonNameFa: 'آفت دهانی راجعه (زخم آفتی مینور)',
    primaryCommonNameEn: 'Minor Aphthous Stomatitis',
    primaryBrand: 'Kenalog in Orabase / SM-33 Gel / Bonjela',
    commonSynonymsFa: ['آفت دهان', 'زخم آفتاب دهان', 'التهاب دردناک لثه و مخاط لپ'],
    commonSynonymsEn: ['Canker Sores', 'Aphthous Stomatitis', 'Oral Ulceration'],
    australianBrands: [
      { brand: 'Kenalog in Orabase', generic: 'Triamcinolone Acetonide 0.1%', form: 'خمیر موضعی کورتونی دهان (S2/S3)' },
      { brand: 'SM-33 Gel / Liquid', generic: 'Lignocaine 2% + Salicylic Acid + Tannins', form: 'ژل مسکن و ضدالتهاب دهان' },
      { brand: 'Bonjela Gel', generic: 'Choline Salicylate 8.7%', form: 'ژل ضدالتهاب و تسکین‌دهنده' },
      { brand: 'Curasept / Difflam Mouthwash', generic: 'Chlorhexidine / Benzydamine', form: 'دهانشویه ضدعفونی‌کننده و مسکن' },
    ],
    firstLine: {
      drugNameFa: 'خمیر تریامسینولون در اورابیس (Kenalog in Orabase) یا ژل‌های بی‌حس‌کننده (SM-33)',
      drugNameEn: 'Triamcinolone in Orabase (Kenalog) or Lignocaine gel (SM-33)',
      drugClassFa: 'کورتیکواستروئید ضدالتهاب موضعی خمیری محافظ + بی‌حس‌کننده موضعی',
      drugClassEn: 'Topical Oral Corticosteroid Paste & Local Anaesthetic',
      keyBrands: ['Kenalog in Orabase', 'SM-33 Gel', 'Bonjela', 'Difflam Mouthwash'],
      dosingFa: 'کنالوگ: یک لایه کوچک بدون مالش روی زخم خشک‌شده قرار داده شود تا لایه محافظ تشکیل گردد (۲ تا ۳ بار در روز بعد از غذا و قبل از خواب). ژل SM-33: هر ۳ ساعت قبل از وعده‌های غذایی جهت تسکین درد.',
      dosingEn: 'Kenalog: Dab a small dab onto ulcer after drying without rubbing 2-3 times daily after meals and bedtime. SM-33 before eating.',
      onsetCourseFa: 'تسکین درد ظرف چند دقیقه با ژل‌های بی‌حس‌کننده؛ ترمیم کامل زخم آفتی ظرف ۷ تا ۱۰ روز.',
      onsetCourseEn: 'Local anaesthesia acts immediately; minor ulcers typically heal in 7-10 days.',
      keyWarningsFa: 'در صورت وجود عفونت قارچی (برفک) یا ویروسی (تبخال دهان) نباید از کورتون (Kenalog) استفاده شود. محصولات حاوی سالیسیلات (Bonjela/SM-33) در کودکان زیر ۱۶ سال به دلیل خطر نظری سندرم ری احتیاط دارد.',
      keyWarningsEn: 'Contraindicated in fungal or viral oral lesions. Bonjela salicylate should be avoided in children <16yo.',
      alternativesFa: 'دهانشویه کلرهگزیدین ۰.۲٪ (Savacol / Curasept) جهت ضدعفونی دهان و تسریع التیام.',
      alternativesEn: 'Chlorhexidine 0.2% mouthwash to reduce secondary bacterial colonization.',
    },
    symptomsFa: ['یک یا چند زخم کوچک، گرد و کم‌عمق با مرکز خاکستری/زرد و حاشیه قرمز ملتهب', 'درد شدید و سوزش هنگام غذا خوردن، نوشیدن یا مسواک زدن', 'محل در مخاط متحرک دهان (داخل گونه، لب، زیر زبان و لثه‌ها)'],
    redFlagsFa: ['زخم دهانی پایدار بیش از ۱۴ روز بدون بهبود (نیاز مبرم به ارجاع جهت رد بدخیمی کارسینوم دهان)', 'زخم‌های بزرگتر از ۱ سانتی‌متر (آفت ماژور)', 'زخم‌های همراه با تب، راش پوستی، درد مفاصل یا زخم‌های تناسلی (شک به بیماری بهجت یا IBD)', 'کاهش وزن ناخواسته و لنفادنوپاتی گردنی'],
    nonPharmFa: [
      'پرهیز از غذاهای تند، شور، اسیدی (مرکبات و گوجه‌فرنگی) و نوشیدنی‌های داغ که درد را تحریک می‌کنند.',
      'استفاده از مسواک نرم و خمیردندان‌های فاقد سولفات لوریل سدیم (SLS-Free).',
      'غرغره با آب نمک ولرم رقیق (نصف قاشق چایخوری در یک لیوان آب) چند بار در روز.',
    ],
    clinicalPearlsFa: [
      'کنالوگ نباید روی زخم مالیده شود، بلکه باید با ملایمت گذاشته شود تا بر اثر رطوبت بزاق به ژل چسبنده محافظ تبدیل گردد.',
    ],
  },

  oral_thrush: {
    cleanFaName: 'برفک و کاندیدیازیس دهان',
    cleanEnName: 'Oral Candidiasis (Oral Thrush)',
    primaryCommonNameFa: 'برفک دهانی',
    primaryCommonNameEn: 'Oral Thrush (Candida albicans)',
    primaryBrand: 'Daktarin Oral Gel / Nilstat Drops',
    commonSynonymsFa: ['قارچ دهان', 'پلاک‌های سفید برفکی دهان', 'کاندیدیازیس دهانی'],
    commonSynonymsEn: ['Oral Moniliasis', 'White Tongue Patches', 'Denture Stomatitis'],
    australianBrands: [
      { brand: 'Daktarin Oral Gel (20mg/g)', generic: 'Miconazole', form: 'ژل خوراکی ضدقارچ (S2/S3)' },
      { brand: 'Nilstat Oral Drops (100,000 IU/mL)', generic: 'Nystatin', form: 'قطره سوسپانسیون خوراکی' },
      { brand: 'Difflam-C Solution', generic: 'Benzydamine + Chlorhexidine', form: 'دهانشویه ضدعفونی‌کننده' },
    ],
    firstLine: {
      drugNameFa: 'ژل خوراکی میکونازول (Daktarin Oral Gel) یا قطره نیستاتین (Nilstat)',
      drugNameEn: 'Miconazole Oral Gel (Daktarin) or Nystatin Oral Suspension (Nilstat)',
      drugClassFa: 'ضدقارچ ایمیدازولی موضعی / پلی‌ان کشنده کاندیدا',
      drugClassEn: 'Topical Imidazole & Polyene Antifungal',
      keyBrands: ['Daktarin Oral Gel', 'Nilstat Drops'],
      dosingFa: 'داکتارین (بزرگسالان و کودکان بالای ۲ سال): نصف قاشق مرباخوری (۲.۵ میلی‌لیتر) ۴ بار در روز بعد از غذا. ژل را تا حد ممکن در دهان نگه داشته و سپس ببلعید. درمان باید حداقل ۴۸ ساعت پس از محو کامل ضایعات ادامه یابد.',
      dosingEn: 'Daktarin: 2.5mL 4 times daily after meals; retain in mouth as long as possible. Continue for 48h after clearing.',
      onsetCourseFa: 'پلاک‌های سفید ظرف ۴۸ تا ۷۲ ساعت شروع به پاک شدن می‌کنند؛ دوره استاندارد ۷ تا ۱۴ روز است.',
      onsetCourseEn: 'Plaques clear within 2-3 days; complete treatment course is 7-14 days.',
      keyWarningsFa: 'تداخل دارویی شدید: میکونازول خوراکی مهارکننده قوی CYP2C9 و CYP3A4 است و با وارفارین (افزایش شدید خطر خونریزی مرگبار) و استاتین‌ها تداخل دارد. در بیماران مصرف‌کننده وارفارین حتماً نیستاتین (Nilstat) تجویز شود. خطر خفگی در نوزادان زیر ۶ ماه با ژل غلیظ.',
      keyWarningsEn: 'CRITICAL INTERACTION: Miconazole interacts severely with Warfarin (INR spike / bleed). Use Nystatin in Warfarin patients.',
      alternativesFa: 'قطره نیستاتین (Nilstat): ۱ میلی‌لیتر ۴ بار در روز (انتخاب اول در مصرف‌کنندگان وارفارین و نوزادان).',
      alternativesEn: 'Nystatin oral drops 1mL QID (First-line for warfarin patients and infants).',
    },
    symptomsFa: ['پلاک‌های سفید خامه‌ای یا شیری چسبیده به زبان، سقف دهان و داخل لپ‌ها', 'زیر پلاک‌ها در صورت پاک شدن با گاز، سطحی قرمز و مستعد خونریزی است', 'سوزش دهان، کاهش حس چشایی و درد هنگام بلع'],
    redFlagsFa: ['اشکال یا درد هنگام بلع غذا (شک به کاندیدیاز مری در بیماران دارای نقص ایمنی)', 'برفک‌های مکرر یا غیرپاسخگو به درمان در افراد جوان بدون سابقه مصرف اسپری کورتون (بررسی دیابت یا HIV)', 'بروز برفک در نوزادان کمتر از ۱ ماه'],
    nonPharmFa: [
      'شستشوی کامل دهان با آب و قرقره کردن پس از هر بار مصرف اسپری‌های کورتیکواستروئیدی استنشاقی (مانند سرتاید، سیمبیکورت).',
      'خارج کردن دندان مصنوعی شب‌ها و ضدعفونی کردن آن در محلول‌های ضدعفونی اختصاصی.',
      'ضدعفونی کردن پستانک و سرشیشه نوزادان با جوشاندن روزانه.',
    ],
    clinicalPearlsFa: [
      'استفاده از آسان‌نفس (Spacer) همراه با اسپری‌های کورتونی رسوب دارو در دهان را به شدت کاهش داده و مانع از برفک می‌شود.',
    ],
  },

  vaginal_thrush: {
    cleanFaName: 'کاندیدیازیس و برفک واژینال',
    cleanEnName: 'Vaginal Candidiasis (Vaginal Thrush)',
    primaryCommonNameFa: 'عفونت قارچی و برفک واژینال',
    primaryCommonNameEn: 'Vulvovaginal Candidiasis (VVC)',
    primaryBrand: 'Canesten Clotrimazole / Diflucan Fluconazole 150mg',
    commonSynonymsFa: ['عفونت قارچی زنان', 'خارش واژن', 'ترشحات پنیری تکه‌ای'],
    commonSynonymsEn: ['Yeast Infection', 'Candida Vaginitis', 'Vulval Pruritus'],
    australianBrands: [
      { brand: 'Canesten 1-Day / 3-Day / 6-Day', generic: 'Clotrimazole Cream & Pessaries', form: 'کرم و قرص واژینال' },
      { brand: 'Diflucan / CanesOral 150mg', generic: 'Fluconazole 150mg Stat', form: 'کپسول تک‌دوز خوراکی (S3)' },
      { brand: 'Canesten Duo', generic: 'Fluconazole 150mg + Clotrimazole 1% Cream', form: 'بسته ترکیبی خوراکی + موضعی' },
    ],
    firstLine: {
      drugNameFa: 'فلوکونازول ۱۵۰ میلی‌گرم تک‌دوز خوراکی (CanesOral S3) یا کرم/پماد کلوتریمازول واژینال',
      drugNameEn: 'Oral Fluconazole 150mg Single Dose (S3) or Intravaginal Clotrimazole',
      drugClassFa: 'ضدقارچ سیستمیک تریازول / ضدقارچ موضعی ایمیدازول',
      drugClassEn: 'Systemic Triazole / Topical Imidazole Antifungal',
      keyBrands: ['Diflucan 150mg', 'Canesten 1-Day Cream', 'Canesten Duo'],
      dosingFa: 'فلوکونازول: ۱ کپسول ۱۵۰ میلی‌گرم به صورت یکجا با آب. کلوتریمازول موضعی: کرم واژینال یا شیاف واژینال هنگام خواب در واژن قرار داده شود. کرم موضعی برای خارش فرج روزی ۲ تا ۳ بار.',
      dosingEn: 'Fluconazole 150mg single stat capsule. Topical clotrimazole cream 1-2 times daily for vulval itch.',
      onsetCourseFa: 'تسکین خارش ظرف ۱۲ تا ۲۴ ساعت؛ ریشه‌کنی کامل قارچ ظرف ۳ تا ۵ روز.',
      onsetCourseEn: 'Symptom relief within 12-24 hours; complete mycological cure within 3-5 days.',
      keyWarningsFa: 'در دوران بارداری و شیردهی فلوکونازول خوراکی ممنوع است و فقط کلوتریمازول واژینال (ترجیحاً بدون اپلیکاتور دستی و با احتیاط) مجاز است. کرم‌های واژینال به کاندوم‌های لاتکس آسیب می‌زنند.',
      keyWarningsEn: 'Oral Fluconazole is CONTRAINDICATED in pregnancy (use topical clotrimazole). Weakens latex condoms.',
      alternativesFa: 'کرم واژینال ۳ روزه یا ۶ روزه کلوتریمازول در صورت حساسیت به فرم‌های تک‌دوز غلیظ.',
      alternativesEn: '3-day or 6-day clotrimazole vaginal cream for sensitive mucosa.',
    },
    symptomsFa: ['خارش و سوزش شدید ناحیه واژن و فرج (ولو)', 'ترشحات غلیظ، سفید، بدون بوی بد و شبیه به پنیر دلمه‌شده (Cottage cheese)', 'سوزش هنگام ادرار کردن و درد هنگام مقاربت'],
    redFlagsFa: ['اولین بار بروز علائم در بیمار (نیاز به تایید تشخیص توسط پزشک)', 'بیماران زیر ۱۶ سال یا بالای ۶۰ سال', 'ترشحات بدبو، کف‌آلود یا متمایل به سبز-خاکستری (شک به تریکومونیازیس یا واژینوز باکتریایی)', 'درد زیر شکم، تب، لرز یا خونریزی غیرطبیعی', 'بیش از ۴ بار عود در سال (کاندیدیاز راجعه)'],
    nonPharmFa: [
      'پوشیدن لباس‌های زیر نخی و گشاد و پرهیز از لباس‌های پلاستیکی و تنگ.',
      'پرهیز از دوش واژینال، صابون‌های عطری، ژل‌های معطر و فوم‌های شستشو.',
      'خشک کردن ناحیه تناسلی از جلو به عقب پس از استفاده از توالت.',
    ],
    clinicalPearlsFa: [
      'فلوکونازول ۱۵۰ میلی‌گرم داروی S3 است؛ داروساز باید بارداری و عدم تداخلات دارویی را قبل از تحویل تایید نماید.',
    ],
  },

  worms_pinworms: {
    cleanFaName: 'کرمک و انگل روده (اکسیور)',
    cleanEnName: 'Threadworms & Pinworms (Enterobiasis)',
    primaryCommonNameFa: 'کرمک و اکسیوریازیس',
    primaryCommonNameEn: 'Enterobius vermicularis Infestation',
    primaryBrand: 'Combantrin (Pyrantel) / Vermox (Mebendazole)',
    commonSynonymsFa: ['انگل کرمک', 'خارش شبانه مقعد در کودکان', 'اکسیور'],
    commonSynonymsEn: ['Pinworm', 'Seatworm', 'Enterobiasis'],
    australianBrands: [
      { brand: 'Combantrin Chocolate Squares / Liquid', generic: 'Pyrantel Embonate (10mg/kg)', form: 'شکلات خوراکی و سوسپانسیون' },
      { brand: 'Vermox Tablets / Suspension', generic: 'Mebendazole 100mg', form: 'قرص جویدنی تک‌دوز' },
      { brand: 'Combantrin-1', generic: 'Mebendazole 100mg', form: 'قرص تک‌دوز' },
    ],
    firstLine: {
      drugNameFa: 'پیرانتل امبونات (Combantrin) یا مبندازول ۱۰۰ میلی‌گرم (Vermox) + تکرار حتمی بعد از ۲ هفته',
      drugNameEn: 'Pyrantel (Combantrin) or Mebendazole 100mg (Vermox) + MANDATORY REPEAT AT 2 WEEKS',
      drugClassFa: 'ضدانگل و کشنده کرم‌های روده نماتودی',
      drugClassEn: 'Antihelmintic & Neuromuscular Depolarising Agent',
      keyBrands: ['Combantrin Chocolate Squares', 'Vermox 100mg'],
      dosingFa: 'مبندازول (بالای ۶ ماه): ۱ قرص ۱۰۰ میلی‌گرم تک‌دوز بدون توجه به سن و وزن. پیرانتل (بالای ۱ سال): ۱۰ میلی‌گرم به ازای هر کیلوگرم وزن بدن تک‌دوز (۱ مربع شکلات به ازای هر ۱۰ کیلوگرم). تکرار الزامی دوز دوم پس از ۲ هفته برای ریشه‌کنی تخم‌های جدید.',
      dosingEn: 'Mebendazole 100mg stat (irrespective of weight) OR Pyrantel 10mg/kg stat. MANDATORY REPEAT DOSE AFTER 2 WEEKS.',
      onsetCourseFa: 'کشتن کرم‌های بالغ ظرف ۲۴ تا ۴۸ ساعت؛ تکرار ۲ هفته بعد برای از بین بردن کرم‌های متولد شده از تخم‌ها ضروری است.',
      onsetCourseEn: 'Eliminates adult worms in 24-48h. Day-14 repeat kills worms hatched from surviving eggs.',
      keyWarningsFa: 'درمان همزمان تمام اعضای خانواده الزامی است حتی اگر هیچ علامتی نداشته باشند! در سه ماهه اول بارداری مبندازول ممنوع است (پیرانتل ارجح است).',
      keyWarningsEn: 'CRITICAL: TREAT ALL HOUSEHOLD MEMBERS SIMULTANEOUSLY. Avoid mebendazole in 1st trimester.',
      alternativesFa: 'سوسپانسیون مایع برای خردسالانی که توانایی جویدن شکلات یا قرص را ندارند.',
      alternativesEn: 'Liquid suspensions for younger children unable to chew tablets.',
    },
    symptomsFa: ['خارش شدید شبانه در ناحیه اطراف مقعد (پری‌آنال)', 'بی‌قراری شبانه، بدخوابی و تحریک‌پذیری کودک', 'مشاهده کرم‌های سفید نخ‌مانند باریک به طول حدود ۱ سانتی‌متر روی مدفوع یا اطراف مقعد شب‌ها'],
    redFlagsFa: ['کودکان زیر ۶ ماه برای مبندازول یا زیر ۱ سال برای پیرانتل', 'عفونت باکتریایی ثانویه با زخم و ترشح در ناحیه پری‌آنال', 'شک به سایر انگل‌های روده‌ای (کرم‌های نواری یا آسکاریس با مدفوع خونی)'],
    nonPharmFa: [
      'شستشوی دست‌ها با آب و صابون قبل از غذا و پس از استفاده از توالت.',
      'کوتاه و تمیز نگه داشتن ناخن‌ها و جلوگیری از ناخن جویدن یا خاراندن مقعد.',
      'شستشوی لباس‌های خواب، ملافه‌ها و حوله‌ها با آب داغ (بالای ۶۰ درجه).',
      'دوش گرفتن صبحگاهی جهت شستن تخم‌های ریخته‌شده اطراف مقعد در طول شب.',
    ],
    clinicalPearlsFa: [
      'تخم‌های کرمک تا ۲ هفته در محیط بیرون و زیر ناخن‌ها زنده می‌مانند؛ عدم تکرار دوز بعد از ۱۴ روز علت شماره ۱ عود بیماری است.',
    ],
  },

  scabies: {
    cleanFaName: 'گال و جرب',
    cleanEnName: 'Scabies (Sarcoptes scabiei)',
    primaryCommonNameFa: 'جرب و گال پوستی',
    primaryCommonNameEn: 'Human Sarcoptic Scabies',
    primaryBrand: 'Lyclear Dermal Cream 5% (Permethrin)',
    commonSynonymsFa: ['انگل گال', 'خارش شدید شبانه بین انگشتان', 'نقوب و تونل‌های پوستی'],
    commonSynonymsEn: ['Mite Infestation', 'Itch Mite', 'Sarcoptic Mange'],
    australianBrands: [
      { brand: 'Lyclear Dermal Cream 5%', generic: 'Permethrin 5%', form: 'کرم موضعی تمام بدن' },
      { brand: 'Ascabiol Lotion', generic: 'Benzyl Benzoate 25%', form: 'لوسیون موضعی' },
      { brand: 'Stromectol 3mg (S4)', generic: 'Ivermectin 3mg', form: 'قرص خوراکی' },
    ],
    firstLine: {
      drugNameFa: 'کرم پرمترین ۵٪ (Lyclear Dermal Cream) از گردن تا نوک انگشتان پا + تکرار الزامی بعد از ۷ روز',
      drugNameEn: 'Topical Permethrin 5% (Lyclear) Neck-to-Toes + MANDATORY REPEAT AT DAY 7',
      drugClassFa: 'حشره‌کش و کشنده مایت‌های سارکوپتیک (Scabicide)',
      drugClassEn: 'Topical Scabicide (Gold Standard)',
      keyBrands: ['Lyclear Dermal Cream 5%'],
      dosingFa: 'یک تیوب کامل (۳۰ گرم برای بزرگسال) روی پوست کاملاً خشک و خنک از زیر چانه تا نوک انگشتان پا (شامل زیر ناخن‌ها، بین انگشتان، ناف و اندام تناسلی) مالیده شود. پس از ۸ تا ۱۴ ساعت شسته شود. تکرار حتمی دقیقاً ۷ روز بعد.',
      dosingEn: 'Apply to cool dry skin from jawline down to soles, including subungual areas and genitalia. Leave for 8-14 hours. REPEAT ON DAY 7.',
      onsetCourseFa: 'مایت‌ها پس از اولین بار کشته می‌شوند، اما خارش حساسیتی ناشی از مایت‌های مرده تا ۲ الی ۴ هفته پس از درمان موفق ادامه دارد.',
      onsetCourseEn: 'Mites die immediately; post-scabietic allergic itch may persist for 2-4 weeks.',
      keyWarningsFa: 'درمان همزمان تمام اعضای خانواده و تماس‌های نزدیک الزامی است. لباس‌ها و ملافه‌ها در آب داغ شسته شوند یا در کیسه نایلونی دربسته به مدت ۷۲ ساعت قرنطینه شوند.',
      keyWarningsEn: 'CRITICAL: Treat all household contacts simultaneously. Wash linens in hot water or seal in bags for 72h.',
      alternativesFa: 'قرص ایورمکتین خوراکی (Stromectol) ۲۰۰ میکروگرم بر کیلوگرم با تکرار بعد از ۸ تا ۱۴ روز برای موارد مقاوم یا گال دلمه‌بسته کراستد.',
      alternativesEn: 'Oral Ivermectin 200mcg/kg (S4) repeated on day 8-14 for crusted or refractory scabies.',
    },
    symptomsFa: ['خارش طاقت‌فرسا و تشدید شونده شب‌ها و پس از دوش آب گرم', 'ضایعات و تونل‌های خطی خاکستری کوتاه (Burrows) در وب بین انگشتان دست، مچ، زیر بغل و کشاله ران', 'پاپول‌های خارش‌دار روی آلت تناسلی مردان و آرئول پستان در زنان'],
    redFlagsFa: ['گال دلمه‌دار نروژی (Crusted/Norwegian Scabies) با پوسته‌ریزی شدید و کراست‌های وسیع در افراد مسن یا با ضعف ایمنی', 'عفونت باکتریایی ثانویه شدید با استافیلوکوک و سلولیت پوستی', 'نوزادان زیر ۲ ماه (نیاز به بنزیل بنزوات رقیق یا ارجاع)'],
    nonPharmFa: [
      'استفاده از مرطوب‌کننده‌ها، کرم‌های ضدخارش کالامین/هیدروکورتیزون و آنتی‌هیستامین‌های آرام‌بخش برای مهار خارش بعد از گال.',
      'کوتاه کردن ناخن‌ها و تمیز کردن زیر آن‌ها با فرچه.',
      'شستشوی تمام لباس‌ها و حوله‌های استفاده‌شده در ۳ روز گذشته با آب بالای ۶۰ درجه.',
    ],
    clinicalPearlsFa: [
      'ادامه خارش پس از ۱ هفته به معنای شکست درمان نیست و واکنش ایمنی پس از مرگ مایت است؛ درمان گال نباید مکرراً پشت سر هم مصرف شود چون باعث اگزمای تماسی شدید می‌گردد.',
    ],
  },

  uti_cystitis: {
    cleanFaName: 'عفونت ادراری خفیف و سیستیت',
    cleanEnName: 'Uncomplicated Cystitis / UTI',
    primaryCommonNameFa: 'عفونت مثانه و سوزش ادرار',
    primaryCommonNameEn: 'Acute Uncomplicated Urinary Tract Infection',
    primaryBrand: 'Ural Sachets / Hiprex / Ural Effervescent',
    commonSynonymsFa: ['سوزش ادرار', 'سیستیت حاد', 'تکرر و فوریت ادرار'],
    commonSynonymsEn: ['Bladder Infection', 'Dysuria', 'Cystitis'],
    australianBrands: [
      { brand: 'Ural Effervescent Powder', generic: 'Sodium Citrate + Citric Acid + Tartaric Acid', form: 'ساشه قلیایی‌کننده ادرار' },
      { brand: 'Citravescent Sachets', generic: 'Urinary Alkaliniser', form: 'ساشه قلیایی‌کننده' },
      { brand: 'Hiprex 1g Tablets', generic: 'Methenamine Hippurate', form: 'قرص ضدعفونی‌کننده مجاری ادرار' },
      { brand: 'Cranberry 50,000mg', generic: 'Vaccinium macrocarpon', form: 'کپسول عصاره کرن‌بری' },
    ],
    firstLine: {
      drugNameFa: 'ساشه‌های قلیایی‌کننده ادرار (Ural) جهت تسکین علامتی + ارجاع برای آنتی‌بیوتیک تجویزی',
      drugNameEn: 'Urinary Alkalinisers (Ural) for symptomatic dysuria + GP referral for antibiotics',
      drugClassFa: 'قلیایی‌کننده ادرار و تسکین‌دهنده سوزش مثانه',
      drugClassEn: 'Systemic Urinary Alkaliniser',
      keyBrands: ['Ural Sachets', 'Citravescent', 'Hiprex 1g'],
      dosingFa: '۱ تا ۲ ساشه اورال حل‌شده در یک لیوان آب سرد ۳ تا ۴ بار در روز به مدت حداکثر ۴۸ ساعت. در صورت همراهی با آنتی‌بیوتیک نیتروفورانتوئین مصرف نشود چون اثر آنتی‌بیوتیک در ادرار اسیدی است.',
      dosingEn: 'Dissolve 1-2 sachets in a glass of water 3-4 times daily for max 48h. Do NOT combine with Nitrofurantoin.',
      onsetCourseFa: 'تسکین احساس سوزش و درد مثانه ظرف ۳۰ دقیقه پس از قلیایی شدن ادرار.',
      onsetCourseEn: 'Relief of burning dysuria within 30-60 mins as urine pH increases.',
      keyWarningsFa: 'اورال درمان آنتی‌باکتریال قطعی نیست و عفونت را ریشه‌کن نمی‌کند؛ فقط علائم را تسکین می‌دهد. در بیماران مبتلا به نارسایی کلیه، نارسایی قلبی و فشار خون بالا (به دلیل بار سدیم بالا) با احتیاط مصرف شود.',
      keyWarningsEn: 'Ural does NOT cure bacterial infection. High sodium load—caution in heart/renal failure.',
      alternativesFa: 'هیپرکس (Hiprex 1g) روزی ۲ بار همراه با ویتامین C برای پیشگیری از عود عفونت‌های مکرر در زنان.',
      alternativesEn: 'Methenamine hippurate (Hiprex 1g BD) for long-term suppressive prophylaxis.',
    },
    symptomsFa: ['سوزش و احساس درد خنجری هنگام دفع ادرار (دیس‌یوری)', 'تکرر ادرار شدید و دفع مقادیر کم با احساس فوریت', 'کدر شدن ادرار یا بوی تند و غیرعادی'],
    redFlagsFa: ['تب، لرز، لرزش عضلانی یا تعریق شدید (شک به پیلونفریت و عفونت کلیه)', 'درد پهلو، کمر یا حساسیت زاویه دنده‌ای‌مهره‌ای (CVA tenderness)', 'وجود خون واضح در ادرار (هماچوری)', 'تمام موارد در مردان، کودکان و زنان باردار (ارجاع فوری به پزشک)', 'عدم بهبود سوزش ادرار پس از ۴۸ ساعت'],
    nonPharmFa: [
      'نوشیدن مقادیر فراوان آب (حداقل ۲ تا ۲.۵ لیتر در روز) جهت شستشوی مکانیکی مجاری ادرار.',
      'ادرار کردن بلافاصله پس از رابطه جنسی و پرهیز از نگه داشتن طولانی ادرار.',
      'شستشو و خشک کردن ناحیه تناسلی از جلو به عقب پس از دفع.',
      'پرهیز از مصرف الکل، قهوه و نوشیدنی‌های گازدار قندی تحریک‌کننده مثانه.',
    ],
    clinicalPearlsFa: [
      'در استرالیا، پروتکل‌های تجویز آنتی‌بیوتیک توسط داروساز (UTI Prescribing) برای زنان غیرباردار ۱۸ تا ۶۵ سال با تری‌متوپریم ۳۰۰ میلی‌گرم یا نیتروفورانتوئین در برخی ایالت‌ها (QLD, NSW, VIC, WA) اجرایی است.',
    ],
  },

  shingles: {
    cleanFaName: 'زونا و هرپس زوستر',
    cleanEnName: 'Herpes Zoster (Shingles)',
    primaryCommonNameFa: 'زونا و نورالژی پس از زونا',
    primaryCommonNameEn: 'Acute Herpes Zoster',
    primaryBrand: 'Famvir (Famciclovir) / Valtrex (Valaciclovir)',
    commonSynonymsFa: ['زونا', 'آبله‌مرغان راجعه', 'تاول‌های کمربندی یک‌طرفه'],
    commonSynonymsEn: ['Herpes Zoster', 'Postherpetic Neuralgia', 'Dermatomal Rash'],
    australianBrands: [
      { brand: 'Famvir 250mg / 500mg (S4)', generic: 'Famciclovir', form: 'قرص خوراکی ضدویروس' },
      { brand: 'Valtrex 500mg (S4)', generic: 'Valaciclovir', form: 'قرص خوراکی ضدویروس' },
      { brand: 'Solosite / Solugel', generic: 'Hydrogel Dressing', form: 'ژل مرطوب‌کننده تاول' },
      { brand: 'Capzasin / Zostrix Cream', generic: 'Capsaicin 0.025% / 0.075%', form: 'کرم ضد درد نوروپاتیک' },
    ],
    firstLine: {
      drugNameFa: 'ارجاع فوری به پزشک جهت دریافت داروی ضدویروس خوراکی (Famciclovir یا Valaciclovir) ظرف ۷۲ ساعت',
      drugNameEn: 'Urgent GP Referral for Oral Antiviral (Famciclovir 250mg TDS or Valaciclovir 1g TDS) within 72h',
      drugClassFa: 'ضدویروس سیستمیک آنالوگ گوانوزین + مسکن‌های درد عصبی',
      drugClassEn: 'Systemic Antiviral Agent & Neuropathic Analgesia',
      keyBrands: ['Famvir 250mg', 'Valtrex 1000mg', 'Panadol Osteo'],
      dosingFa: 'فام‌سیکلوویر: ۲۵۰ میلی‌گرم ۳ بار در روز به مدت ۷ روز (یا والاسیکلوویر ۱۰۰۰ میلی‌گرم ۳ بار در روز به مدت ۷ روز). باید ترجیحاً ظرف ۷۲ ساعت اول شروع راش آغاز گردد.',
      dosingEn: 'Famciclovir 250mg TDS or Valaciclovir 1g TDS for 7 days. Must be initiated within 72h of rash onset.',
      onsetCourseFa: 'شروع زودهنگام ضدویروس شدت درد حاد را کم کرده و خطر نورالژی پایدار پس از زونا (PHN) را به نصف کاهش می‌دهد.',
      onsetCourseEn: 'Early antiviral treatment accelerates crusting and halves the risk of debilitating Postherpetic Neuralgia.',
      keyWarningsFa: 'در صورت درگیری نوک بینی یا اطراف چشم (شاخه افتالمیک عصب سه قلو - علامت Hutchinson) ارجاع اورژانسی همان روز به چشم‌پزشک به دلیل خطر نابینایی قطعی.',
      keyWarningsEn: 'CRITICAL: Lesions on tip of nose/eye (Hutchinson sign) require SAME-DAY OPHTHALMIC EMERGENCY REFERRAL.',
      alternativesFa: 'پانسمان‌های هیدروژل خنک‌کننده (Solugel) بدون چسبندگی روی تاول‌های باز و مسکن‌های خوراکی.',
      alternativesEn: 'Non-adherent cool hydrogel dressings and simple analgesics for local comfort.',
    },
    symptomsFa: ['درد سوزشی، تیرکشنده و گزگز حاد در یک درماتوم مشخص یک‌طرفه بدن ۲ تا ۳ روز قبل از راش', 'ضایعات تاولی گروهی با پایه قرمز محدود به یک سمت بدن (خط وسط را رد نمی‌کند)', 'حساسیت شدید به لمس پوست (آلودینیا)'],
    redFlagsFa: ['هرگونه راش زونا در اطراف چشم، پلک، پیشانی یا نوک بینی (خطر زونای چشمی)', 'درگیری کانال گوش، فلج عضلات صورت و سرگیجه (سندرم رمزی هانت)', 'بیماران دارای نقص ایمنی با درگیری چند درماتوم گسترده', 'تاول‌های عفونی با ترشحات چرکی زرد غلیظ'],
    nonPharmFa: [
      'پوشاندن تاول‌ها با گاز نچسب تمیز جهت جلوگیری از پخش شدن ترشحات و انتقال آبله‌مرغان به افراد حساس.',
      'پرهیز از تماس با زنان باردار، نوزادان و افراد دارای نقص ایمنی تا زمان دلمه‌بستن کامل تاول‌ها.',
      'پوشیدن لباس‌های نخی گشاد برای کاهش سایش با پوست.',
    ],
    clinicalPearlsFa: [
      'واکسن زونا (Shingrix) برای افراد بالای ۶۵ سال و بومیان استرالیایی بالای ۵۰ سال در استرالیا رایگان (تحت پوشش NIP) ارائه می‌شود.',
    ],
  },

  tinea_infections: {
    cleanFaName: 'تینه‌آ و عفونت‌های قارچی پوست',
    cleanEnName: 'Tinea Infections (Athlete’s Foot & Jock Itch)',
    primaryCommonNameFa: 'قارچ پای ورزشکاران و کشاله ران',
    primaryCommonNameEn: 'Tinea Pedis, Cruris & Corporis',
    primaryBrand: 'Lamisil 1% (Terbinafine) / Daktarin / Canesten',
    commonSynonymsFa: ['قارچ پوستی', 'پای ورزشکار', 'قارچ لای انگشتان پا', 'خارش ژوک'],
    commonSynonymsEn: ['Athlete’s Foot', 'Jock Itch', 'Ringworm', 'Dermatophytosis'],
    australianBrands: [
      { brand: 'Lamisil Cream / Spray / Gel 1%', generic: 'Terbinafine hydrochloride', form: 'کرم، ژل و اسپری کشنده قارچ' },
      { brand: 'Lamisil Once (1%)', generic: 'Terbinafine film-forming solution', form: 'محلول تک‌مرحله‌ای پا' },
      { brand: 'Canesten Cream (1%)', generic: 'Clotrimazole', form: 'کرم مهارکننده قارچ' },
      { brand: 'Daktarin Tinea Cream / Powder', generic: 'Miconazole nitrate 2%', form: 'کرم و پودر ضدقارچ' },
      { brand: 'SolvEasy Tinea Cream', generic: 'Terbinafine 1%', form: 'کرم ضدقارچ موضعی' },
    ],
    firstLine: {
      drugNameFa: 'کرم تربینافین ۱٪ (Lamisil Cream) روزی ۱ بار به مدت ۷ روز',
      drugNameEn: 'Topical Terbinafine 1% (Lamisil) once daily for 7 days',
      drugClassFa: 'ضدقارچ آلیلامین کشنده قارچ (Fungicidal)',
      drugClassEn: 'Topical Allylamine Fungicidal Agent (Gold Standard)',
      keyBrands: ['Lamisil 1% Cream', 'Lamisil Once', 'Canesten Cream'],
      dosingFa: 'تربینافین ۱٪: روی پوست تمیز و کاملاً خشک روزی ۱ بار به مدت ۷ روز مالیده شود (ناحیه ضایعه به همراه چند سانتی‌متر از حاشیه سالم پوست). کرم‌های آزول (کلوتریمازول): روزی ۲ تا ۳ بار و تا ۲ هفته پس از بهبودی کامل ضایعات باید ادامه یابد.',
      dosingEn: 'Terbinafine 1%: Apply once daily for 7 consecutive days. Azole creams (Clotrimazole) require 2-4 weeks (continue 14 days after clearing).',
      onsetCourseFa: 'تربینافین قارچ‌ها را ظرف چند روز ریشه‌کن می‌کند و به دلیل ذخیره شدن در لایه شاخی تا چند هفته اثر پایدار دارد.',
      onsetCourseEn: 'Terbinafine is fungicidal (kills fungi), clearing infections in 1 week vs 2-4 weeks with azoles.',
      keyWarningsFa: 'از قطع زودهنگام درمان خودداری شود چون عامل اصلی عود قارچ است. از مصرف همزمان کورتون‌های قوی به تنهایی خودداری شود (موجب پنهان شدن علائم قارچ موسوم به Tinea incognito می‌شود).',
      keyWarningsEn: 'Do NOT use topical corticosteroids alone (causes Tinea incognito). Ensure complete 7-day adherence.',
      alternativesFa: 'پودرهای ضدقارچ داکتارین (Daktarin Powder) برای داخل جوراب و کفش جهت جلوگیری از عود مجدد.',
      alternativesEn: 'Antifungal dusting powders in shoes and socks to eliminate fungal reservoirs.',
    },
    symptomsFa: ['خارش، پوسته‌ریزی، سوزش و ترک‌خوردگی دردناک پوست بین انگشتان پا', 'ضایعات حلقوی با حاشیه برجسته فعال پوسته‌دار و مرکز شفاف‌تر (Ringworm)', 'پوست سفید نرم‌شده و رطوبت لای انگشتان'],
    redFlagsFa: ['درگیری بستر و ضخامت ناخن‌ها (اونیکومایکوزیس - نیاز به درمان خوراکی تجویزی یا لاک آمورولفین)', 'سلولیت، قرمزی پیشرونده و تورم گرم ساق پا ناشی از ورود باکتری از شکاف‌های قارچی', 'بیماران دیابتی با زخم پا یا اختلال خون‌رسانی محیطی', 'عفونت قارچی پوست سر (Tinea Capitis - نیازمند داروی خوراکی)'],
    nonPharmFa: [
      'خشک کردن دقیق و کامل بین انگشتان پا با حوله جداگانه پس از هر بار استحمام.',
      'پوشیدن جوراب‌های نخی تمیز و تعویض روزانه آن‌ها و استفاده از صندل در استخرهای عمومی و رختکن‌ها.',
      'هوادهی کفش‌ها و پرهیز از پوشیدن کفش‌های بسته مرطوب به صورت مداوم.',
    ],
    clinicalPearlsFa: [
      'تربینافین (Lamisil) خاصیت کشنده قارچ (Fungicidal) دارد؛ در حالی که کلوتریمازول و میکونازول مهارکننده رشد قارچ (Fungistatic) هستند و نیاز به دوره‌های درمانی بسیار طولانی‌تری دارند.',
    ],
  },

  sore_throat: {
    cleanFaName: 'گلودرد و فارنژیت حاد',
    cleanEnName: 'Acute Sore Throat (Pharyngitis)',
    primaryCommonNameFa: 'گلودرد حاد ویروسی و باکتریایی',
    primaryCommonNameEn: 'Acute Pharyngitis & Tonsillitis',
    primaryBrand: 'Difflam Plus Anaesthetic Lozenges / Strepsils Extra',
    commonSynonymsFa: ['التهاب گلو', 'سوزش گلو', 'درد بلع و فارنژیت'],
    commonSynonymsEn: ['Throat Irritation', 'Odynophagia', 'Tonsillitis'],
    australianBrands: [
      { brand: 'Difflam Plus Lozenges / Spray', generic: 'Benzydamine + Lignocaine + Dichlorobenzyl alcohol', form: 'آبنبات و اسپری بی‌حس‌کننده و ضدالتهاب' },
      { brand: 'Strepsils Extra / Strepsils Plus', generic: 'Hexylresorcinol / Lignocaine', form: 'آبنبات‌های مسکن گلو' },
      { brand: 'Betadine Sore Throat Gargle', generic: 'Povidone-Iodine 1%', form: 'محلول غرغره غلیظ' },
      { brand: 'Panadol / Nurofen', generic: 'Paracetamol / Ibuprofen', form: 'مسکن‌های خوراکی ضدالتهاب' },
    ],
    firstLine: {
      drugNameFa: 'مسکن‌های سیستمیک خوراکی (Ibuprofen یا Paracetamol) + آبنبات‌های دیفلام (Difflam Plus)',
      drugNameEn: 'Oral Systemic Analgesics (Ibuprofen / Paracetamol) + Anaesthetic Lozenges (Difflam Plus)',
      drugClassFa: 'ضدالتهاب غیرکورتونی (NSAID) خوراکی + بی‌حس‌کننده و ضدالتهاب موضعی حلق',
      drugClassEn: 'Systemic NSAID Analgesia & Topical Anti-inflammatory / Anaesthetic',
      keyBrands: ['Difflam Plus Lozenges', 'Panadol 500mg', 'Nurofen 200mg', 'Betadine Gargle'],
      dosingFa: 'ایبوپروفن خوراکی: ۴۰۰ میلی‌گرم هر ۶ تا ۸ ساعت همراه با غذا. آبنبات دیفلام پلاس: هر ۲ تا ۳ ساعت در دهان مکیده شود (حداکثر ۱۲ عدد در روز). محلول بتادین گلو: ۱۵ میلی‌لیتر بدون بلعیدن به مدت ۳۰ ثانیه غرغره شود.',
      dosingEn: 'Ibuprofen 400mg TDS with food. Difflam Plus lozenge dissolved slowly every 2-3 hours (max 12/day). Betadine gargle BD.',
      onsetCourseFa: 'تسکین درد با بی‌حس‌کننده‌های موضعی ظرف ۲ تا ۵ دقیقه؛ بیش از ۸۵٪ گلودردها ویروسی هستند و ظرف ۵ تا ۷ روز خودبه‌خود بهبود می‌یابند.',
      onsetCourseEn: 'Topical anaesthesia numbs pain within 2-5 mins; viral pharyngitis resolves spontaneously within 5-7 days.',
      keyWarningsFa: 'در کودکان زیر ۱۲ سال به دلیل بی‌حسی زبان و خطر اختلال در بلع و خفگی در مصرف آبنبات‌های لیدوکائین‌دار احتیاط شود. بتادین در افراد حساس به ید و بیماری‌های تیروئید منع مصرف دارد.',
      keyWarningsEn: 'Local anaesthetic lozenges may impair swallowing reflex in young children. Betadine contraindicated in thyroid disease.',
      alternativesFa: 'آب نمک ولرم رقیق برای غرغره کردن چند بار در روز جهت کاهش ادم مخاط حلق.',
      alternativesEn: 'Warm saline gargles to reduce pharyngeal oedema and loosen mucus.',
    },
    symptomsFa: ['درد، خشکی و سوزش گلو که هنگام بلعیدن غذا یا آب دهان تشدید می‌شود', 'قرمزی مخاط حلق و لوزه‌ها', 'احساس کوفتگی عمومی و آبریزش ملایم بینی'],
    redFlagsFa: ['اشکال در باز کردن کامل دهان (تریسموس) یا بیرون ریختن بزاق ناشی از ناتوانی در بلع (شک به آبسه دور لوزه)', 'تنگی نفس، صدای خس‌خس خشن تنفسی (استریدور)', 'تب بالا بدون سرفه همراه با اگزودای چرکی روی لوزه‌ها و لنفادنوپاتی حساس قدامی گردن (معیارهای Centor برای استرپتوکوک A)', 'گلودرد شدید پایدار بیش از ۷ روز'],
    nonPharmFa: [
      'غرغره با آب نمک ولرم (نصف قاشق چایخوری نمک در یک لیوان آب گرم) ۳ تا ۴ بار در روز.',
      'نوشیدن مایعات فراوان خنک یا ولرم و پرهیز از آبمیوه‌های اسیدی و تند.',
      'استفاده از شربت عسل و آبلیمو برای نرم کردن مجاری گلو.',
    ],
    clinicalPearlsFa: [
      'آنتی‌بیوتیک‌ها طول مدت گلودرد را تنها حدود ۱۶ ساعت کوتاه می‌کنند و در اکثریت قریب به اتفاق موارد ویروسی غیرضروری هستند.',
    ],
  },

  chilblains: {
    cleanFaName: 'تورم و قرمزی ناشی از سرما (پرنیو)',
    cleanEnName: 'Chilblains (Pernio)',
    primaryCommonNameFa: 'سرمازدگی و التهاب انگشتان ناشی از سرما',
    primaryCommonNameEn: 'Chilblains / Perniosis',
    primaryBrand: 'Lassar’s Paste / Hirudoid / Rectinol',
    commonSynonymsFa: ['پرنیو', 'تورم قرمز انگشتان در سرما', 'سوزش و خارش نوک انگشتان'],
    commonSynonymsEn: ['Pernio', 'Erythema Pernio', 'Cold-induced Swelling'],
    australianBrands: [
      { brand: 'Hirudoid Cream', generic: 'Heparinoid', form: 'کرم ضدالتهاب و گردش خون موضعی' },
      { brand: 'Rectinol / Lassar Paste', generic: 'Zinc Oxide + Starch', form: 'پماد محافظتی و قابض' },
    ],
    firstLine: {
      drugNameFa: 'گرم نگه‌داشتن تدریجی و پوشش محافظتی + کرم هیرودوئید (Hirudoid) موضعی',
      drugNameEn: 'Gradual Rewarming & Protective Layering + Topical Hirudoid Cream',
      drugClassFa: 'محافظت فیزیکی عروقی و بهبوددهنده گردش خون موضعی',
      drugClassEn: 'Microvascular Protective & Topical Circulation Enhancer',
      keyBrands: ['Hirudoid Cream', 'Woollen gloves & thermal socks'],
      dosingFa: 'کرم هیرودوئید یا پماد محافظ زینک اکساید روزی ۲ تا ۳ بار به آرامی روی پوست مالیده شود. از ماساژ محکم و شدید پرهیز شود.',
      dosingEn: 'Apply Hirudoid or protective cream 2-3 times daily gently. Avoid vigorous rubbing or direct heat.',
      onsetCourseFa: 'بهبودی تدریجی ظرف ۱ الی ۳ هفته با حفظ گرمای محیطی دست و پا.',
      onsetCourseEn: 'Gradual resolution over 1-3 weeks with consistent thermal protection.',
      keyWarningsFa: 'از قرار دادن مستقیم دست و پای یخ‌زده در مقابل بخاری یا آب داغ خودداری شود (موجب تشدید اسپاسم و آسیب بافتی می‌گردد).',
      keyWarningsEn: 'Do NOT apply direct intense heat (radiators, boiling water) as it causes rapid vasodilation and tissue damage.',
      alternativesFa: 'مسکن‌های ملایم خوراکی در صورت احساس درد شدید.',
      alternativesEn: 'Oral simple analgesics for pain relief.',
    },
    symptomsFa: ['تورم قرمز تا بنفش، سوزش و خارش شدید در نوک انگشتان دست، پا، لاله گوش یا بینی پس از قرار گرفتن در معرض سرما و رطوبت', 'احساس درد و گزگز با گرم شدن سریع اندام'],
    redFlagsFa: ['ایجاد تاول، زخم پوستی عمیق یا نکروز سیاه در نوک انگشتان', 'علائم پایدار بدون بهبودی بیش از ۳ هفته', 'بیماران دیابتی یا افراد با سابقه بیماری عروق محیطی و پدیده رینود شدید'],
    nonPharmFa: [
      'پوشیدن دستکش‌ها و جوراب‌های پشمی ضخیم و لباس‌های گرم چندلایه پیش از خروج از منزل در هوای سرد.',
      'گرم کردن تدریجی محیط زندگی و پرهیز از تغییرات ناگهانی و شوک دمایی شدید.',
      'ترک سیگار به دلیل اثرات منقبض‌کننده شدید نیکوتین روی عروق محیطی.',
    ],
    clinicalPearlsFa: [
      'پرنیو ناشی از انقباض عروق کوچک پوستی در اثر سرما و گشادی با تأخیر آن‌ها است؛ گرم کردن تدریجی کلید اصلی درمان است.',
    ],
  },

  corns_calluses: {
    cleanFaName: 'میخچه و پینه پا',
    cleanEnName: 'Corns and Calluses',
    primaryCommonNameFa: 'میخچه و پینه فشاری پا',
    primaryCommonNameEn: 'Corns & Calluses (Helomas & Tylomas)',
    primaryBrand: 'Carnation Corn Caps / Scholl Corn Removal / Duofilm',
    commonSynonymsFa: ['میخچه پا', 'پینه کف پا', 'ضخامت پوستی فشاری'],
    commonSynonymsEn: ['Hyperkeratosis', 'Heloma Durum', 'Callus Pads'],
    australianBrands: [
      { brand: 'Carnation Corn Caps / Plasters', generic: 'Salicylic Acid 40%', form: 'چسب میخچه با پد محافظ' },
      { brand: 'Scholl 2-in-1 Corn Treatment', generic: 'Salicylic Acid Liquid', form: 'محلول موضعی لایه‌بردار' },
      { brand: 'Eulactol Heel Balm', generic: 'Urea 25%', form: 'بالم نرم‌کننده کراتولیتیک' },
    ],
    firstLine: {
      drugNameFa: 'چسب یا محلول سالیسیلیک اسید ۴۰٪ (Corn Plaster) + کرم اوره ۲۵٪ (Urea Heel Balm)',
      drugNameEn: 'Salicylic Acid 40% Corn Plasters + High-strength Urea 25% Cream',
      drugClassFa: 'کراتولیتیک و لایه‌بردار قوی بافت شاخی',
      drugClassEn: 'Potent Keratolytic & Desquamating Agent',
      keyBrands: ['Carnation Corn Caps', 'Scholl Corn Treatment', 'Eulactol Heel Balm'],
      dosingFa: 'چسب سالیسیلیک اسید مستقیماً روی مرکز میخچه قرار گرفته و هر ۲ روز یکبار پس از خیساندن پا در آب گرم تعویض شود. بالم اوره روزی ۲ بار برای نرم کردن پینه‌ها استفاده شود.',
      dosingEn: 'Apply corn plaster precisely over the central core. Replace every 48 hours after soaking foot in warm water.',
      onsetCourseFa: 'نرم شدن و جدا شدن هسته میخچه ظرف ۱ تا ۲ هفته.',
      onsetCourseEn: 'Softening and detachment of the hyperkeratotic core within 1-2 weeks.',
      keyWarningsFa: 'در بیماران دیابتی، افراد مبتلا به نوروپاتی یا اختلال گردش خون محیطی مصرف سالیسیلیک اسید و تیغ زدن اکیداً ممنوع است و باید به پودیاتریست ارجاع داده شوند.',
      keyWarningsEn: 'CONTRAINDICATED in diabetes, peripheral vascular disease, or neuropathy due to high risk of ulceration and infection.',
      alternativesFa: 'استفاده از پدهای سیلیکونی محافظ جهت کاهش فشار مکانیکی کفش.',
      alternativesEn: 'Silicone pressure-relieving donut pads and footwear modification.',
    },
    symptomsFa: ['برجستگی کوچک سفت با هسته مرکزی فشرده و دردناک در اثر فشار کفش (میخچه)', 'ضخیم‌شدگی و زبری گسترده و بدون درد پوست کف پا یا پاشنه (پینه)'],
    redFlagsFa: ['بیمار مبتلا به دیابت یا نوروپاتی حسی محیطی', 'هرگونه ترشح چرک، قرمزی منتشر، زخم باز یا التهاب عفونی در اطراف ضایعه', 'ضایعه فاقد هسته با نقاط سیاه مویرگی (شک به زگیل کف پا/Verruca)'],
    nonPharmFa: [
      'پوشیدن کفش‌های طبی راحت با پنجه پهن و پرهیز از کفش‌های پاشنه‌بلند و نوک‌تیز تنگ.',
      'خیساندن پا در آب گرم به مدت ۱۰ دقیقه و ساییدن ملایم لایه‌های مرده با سنگ پا.',
      'استفاده از پدهای فومی یا کفی‌های طبی جهت توزیع یکنواخت وزن بدن.',
    ],
    clinicalPearlsFa: [
      'میخچه یک واکنش فیزیولوژیک به فشار و اصطکاک مزمن است؛ تا زمانی که علت مکانیکی (کفش نامناسب) اصلاح نشود، عود خواهد کرد.',
    ],
  },

  cradle_cap: {
    cleanFaName: 'کلاه گهواره (درماتیت سبورئیک نوزادی)',
    cleanEnName: 'Cradle Cap (Infantile Seborrhoeic Dermatitis)',
    primaryCommonNameFa: 'شوره و پوسته‌های چرب سر نوزاد',
    primaryCommonNameEn: 'Infantile Cradle Cap',
    primaryBrand: 'Egozite Cradle Cap Lotion / Olive Oil & Soft Brush',
    commonSynonymsFa: ['شوره سر شیرخوار', 'پوسته‌های زرد سر نوزاد', 'درماتیت سبورئیک اطفال'],
    commonSynonymsEn: ['Cradle Cap', 'Seborrhoea Neonatorum', 'Infant Scalp Scales'],
    australianBrands: [
      { brand: 'Egozite Cradle Cap Lotion', generic: 'Salicylic Acid 1% + Olive Oil', form: 'لوسیون ملایم نرم‌کننده سر نوزاد' },
      { brand: 'Mustela Foam Shampoo for Newborns', generic: 'Climbazole + Avocado Perseose', form: 'شامپو فوم نوزاد' },
    ],
    firstLine: {
      drugNameFa: 'روغن بادام شیرین یا زیتون تصفیه‌شده + ماساژ با برس نرم نوزاد + شامپوی ملایم اطفال',
      drugNameEn: 'Pure Mineral / Olive Oil Softening + Gentle Soft-Bristle Brushing + Mild Baby Shampoo',
      drugClassFa: 'نرم‌کننده ملایم و برطرف‌کننده فیزیکی پوسته‌های چرب',
      drugClassEn: 'Emollient Keratolytic Softening Protocol',
      keyBrands: ['Egozite Cradle Cap', 'Mustela Foam Shampoo', 'Pure Baby Mineral Oil'],
      dosingFa: 'روغن را روی پوست سر نوزاد مالیده و بگذارید ۳۰ تا ۶۰ دقیقه بماند تا پوسته‌ها نرم شوند؛ سپس با برس نرم به آرامی شانه زده و با شامپوی نوزاد بشویید.',
      dosingEn: 'Massage oil onto infant scalp, leave for 30-60 mins to soften crusts, gently brush with a soft baby brush, then shampoo off.',
      onsetCourseFa: 'بهبودی قابل توجه ظرف ۱ تا ۲ هفته؛ بیماری کاملاً خوش‌خیم و خود‌محدود‌شونده است.',
      onsetCourseEn: 'Visible clearance within 1-2 weeks; benign and self-limiting by 6-12 months of age.',
      keyWarningsFa: 'هرگز پوسته‌ها را با ناخن یا اجسام تیز نکنید زیرا باعث ایجاد زخم و عفونت ثانویه باکتریایی می‌شود. از مصرف کورتون‌های قوی یا لایه‌بردارهای غلیظ در نوزادان اکیداً خودداری شود.',
      keyWarningsEn: 'Do NOT pick or forcefully scratch off crusts. Avoid high-strength keratolytic agents in infants.',
      alternativesFa: 'لوسیون اگوزایت اطفال (Egozite Cradle Cap Lotion) روزی ۲ بار برای موارد مقاوم‌تر.',
      alternativesEn: 'Egozite Cradle Cap lotion for persistent scaling.',
    },
    symptomsFa: ['پوسته‌ها و دلمه‌های چرب، ضخیم و زرد/قهوه‌ای روی پوست سر، ابروها و پشت گوش نوزاد بدون ایجاد خارش یا بی‌قراری'],
    redFlagsFa: ['گسترش ضایعات به تمام بدن، صورت و کشاله ران با قرمزی شدید و ترشح', 'ایجاد بوی نامطبوع، چرک، دلمه عسلی یا بی‌قراری شدید نوزاد (شک به عفونت ثانویه زردزخم یا کاندیدا)', 'عدم بهبودی پس از چند هفته مراقبت استاندارد'],
    nonPharmFa: [
      'شستشوی منظم روزانه سر نوزاد با آب ولرم و شامپوی ملایم بدون عطر.',
      'استفاده از برس مخصوص نرم نوزاد بعد از هر بار روغن‌مالی.',
      'اطمینان‌بخشی به والدین مبنی بر اینکه کلاه گهواره مسری نبوده و ناشی از بهداشت ضعیف نیست.',
    ],
    clinicalPearlsFa: [
      'کلاه گهواره ناشی از فعالیت بیش از حد غدد سباسه تحت تأثیر هورمون‌های مادری است و به هیچ عنوان برای نوزاد دردناک یا خارش‌دار نیست.',
    ],
  },

  dry_mouth: {
    cleanFaName: 'خشکی دهان (زروستومیا)',
    cleanEnName: 'Dry Mouth (Xerostomia)',
    primaryCommonNameFa: 'خشکی شدید مخاط دهان و کمبود بزاق',
    primaryCommonNameEn: 'Xerostomia / Oral Dryness',
    primaryBrand: 'Biotene Oral Balance Gel / Mouthwash / Spray',
    commonSynonymsFa: ['زروستومی', 'کمبود ترشح بزاق', 'سندرم خشکی دهان دارویی'],
    commonSynonymsEn: ['Hyposalivation', 'Oral Dryness', 'Drug-induced Xerostomia'],
    australianBrands: [
      { brand: 'Biotene Oral Balance Gel', generic: 'Salivary Enzymes + Glycerin', form: 'ژل مرطوب‌کننده طولانی‌اثر دهان' },
      { brand: 'Biotene Moisturising Mouthwash', generic: 'Enzyme System + Xylitol', form: 'دهانشویه فاقد الکل' },
      { brand: 'Aquae Dry Mouth Spray', generic: 'Electrolytes + Methylcellulose', form: 'اسپری بزاق مصنوعی' },
      { brand: 'GC Tooth Mousse Plus', generic: 'CPP-ACP + Fluoride 900ppm', form: 'موس محافظ مینای دندان' },
    ],
    firstLine: {
      drugNameFa: 'ژل و دهانشویه بیوتن (Biotene Oral Balance) + آدامس بدون قند زایلیتول (Xylitol Gum)',
      drugNameEn: 'Biotene Oral Balance Moisturising Gel & Mouthwash + Sugar-free Xylitol Chewing Gum',
      drugClassFa: 'بزاق مصنوعی آنزیمی و تحریک‌کننده فیزیولوژیک بزاق',
      drugClassEn: 'Artificial Salivary Replacement & Sialogogue Stimulant',
      keyBrands: ['Biotene Gel', 'Biotene Mouthwash', 'Aquae Spray', 'GC Tooth Mousse'],
      dosingFa: 'ژل بیوتن: مقدار کمی روی زبان و لثه‌ها شب‌ها قبل از خواب یا هنگام نیاز مالیده شود. دهانشویه بیوتن: ۱۵ میلی‌لیتر ۳ تا ۵ بار در روز چرخانده شود.',
      dosingEn: 'Apply 1-2cm of Biotene gel directly onto tongue and spread over gums before sleep and PRN. Rinse with mouthwash TDS-QID.',
      onsetCourseFa: 'تسکین و روان‌سازی فوری مخاط دهان به مدت ۲ تا ۵ ساعت.',
      onsetCourseEn: 'Immediate lubrication and soothing comfort lasting 2-5 hours.',
      keyWarningsFa: 'از دهانشویه‌های حاوی الکل اکیداً پرهیز شود چون خشکی را به شدت تشدید می‌کنند. به دلیل کاهش بزاق، ریسک پوسیدگی دندان و برفک دهان بسیار بالا است (نیازمند خمیردندان پرفلوراید مانند NeutraFluor 5000).',
      keyWarningsEn: 'Avoid alcohol-based mouthwashes. Extreme risk of rampant dental caries; advise high-fluoride toothpaste (NeutraFluor 5000).',
      alternativesFa: 'مصرف مکرر جرعه‌های کوچک آب خنک یا مکیدن قطعات یخ.',
      alternativesEn: 'Frequent sips of cold water, ice chips, and bedside humidifiers.',
    },
    symptomsFa: ['احساس چسبندگی و خشکی در دهان، اشکال در بلع غذاهای خشک و تکلم طولانی', 'سوزش زبان، تغییر چشایی و بوی بد دهان', 'لب‌های ترک‌خورده و چسبیدن لب‌ها به دندان‌ها'],
    redFlagsFa: ['پوسیدگی‌های متعدد و سریع دندانی بویژه در طوق دندان‌ها', 'ضایعات سفید برفی پاک‌شونده در مخاط (برفک کاندیدایی)', 'بزرگی غدد بزاقی، درد شدید غدد بناگوشی، تب یا ترشح چرکی', 'خشکی شدید همزمان چشم‌ها و مفاصل (شک به سندرم شوگرن)'],
    nonPharmFa: [
      'نوشیدن منظم آب در طول روز و همراه داشتن همیشگی بطری آب.',
      'جویدن آدامس‌های بدون قند زایلیتول جهت تحریک رفلکس ترشح بزاق طبیعی.',
      'پرهیز از مصرف دخانیات، قهوه، الکل و غذاهای شور و ادویه‌دار.',
      'رعایت فوق‌العاده بهداشت دهان و دندان با مسواک نرم و خمیردندان حاوی فلوراید.',
    ],
    clinicalPearlsFa: [
      'بیش از ۴۰۰ داروی رایج (از جمله آنتی‌هیستامین‌ها، ضدافسردگی‌های سه‌حلقه‌ای، آنتی‌کولینرژیک‌ها و دیورتیک‌ها) علت اصلی زروستومیا در سالمندان هستند.',
    ],
  },

  ear_wax: {
    cleanFaName: 'جرم و موم گوش (سرومن متراکم)',
    cleanEnName: 'Impacted Ear Wax (Cerumen Impaction)',
    primaryCommonNameFa: 'گرفتگی گوش ناشی از تجمع جرم',
    primaryCommonNameEn: 'Impacted Cerumen',
    primaryBrand: 'Waxsol Ear Drops / Ear Clear (Carbamide Peroxide)',
    commonSynonymsFa: ['جرم گوش', 'موم گوش', 'انسداد مجرای گوش با واکس'],
    commonSynonymsEn: ['Ear Wax Impaction', 'Cerumen Plug', 'Blocked Ear'],
    australianBrands: [
      { brand: 'Waxsol Drops', generic: 'Docusate Sodium 0.5%', form: 'قطره حل‌کننده سریع جرم گوش' },
      { brand: 'Ear Clear Ear Drops', generic: 'Carbamide Peroxide 6.5%', form: 'قطره جوشان آزادکننده اکسیژن' },
      { brand: 'Cerumol Ear Drops', generic: 'Arachis Oil + Chlorobutanol', form: 'قطره روغنی نرم‌کننده' },
      { brand: 'Ear Clear Cleansing Spray', generic: 'Isotonic Saline', form: 'اسپری شستشوی ملایم گوش' },
    ],
    firstLine: {
      drugNameFa: 'قطره دوکوزات سدیم ۰.۵٪ (Waxsol) به مدت ۲ شب متوالی قبل از خواب',
      drugNameEn: 'Docusate Sodium 0.5% (Waxsol Drops) for 2 consecutive nights',
      drugClassFa: 'محلول سورفکتانت نرم‌کننده و تجزیه‌کننده سرومن (Cerumenolytic)',
      drugClassEn: 'Surfactant Cerumenolytic Agent',
      keyBrands: ['Waxsol Ear Drops', 'Ear Clear Carbamide Peroxide', 'Cerumol Drops'],
      dosingFa: 'سر را به یک طرف خم کرده و با قطره‌چکان مجرای گوش را با وکس‌سول پر کنید؛ ۵ تا ۱۰ دقیقه در همان حالت بمانید و با یک تکه پنبه مجرا را ببندید. برای ۲ شب متوالی تکرار شود.',
      dosingEn: 'Fill ear canal with Waxsol drops at bedtime for 2 consecutive nights only. Keep head tilted for 5-10 minutes.',
      onsetCourseFa: 'نرم شدن و تخلیه طبیعی جرم ظرف ۲ تا ۳ روز.',
      onsetCourseEn: 'Disintegration and clearance of wax within 2-3 days.',
      keyWarningsFa: 'در صورت وجود پارگی پرده گوش (Perforated Tympanic Membrane) یا لوله تعبیه شده در گوش (Grommets) یا سابقه جراحی گوش، مصرف هرگونه قطره روغنی/حل‌کننده اکیداً ممنوع است. هرگز از گوش‌پاک‌کن (Cotton Bud) در داخل مجرای گوش استفاده نکنید چون موم را متراکم‌تر می‌کند.',
      keyWarningsEn: 'CONTRAINDICATED if eardrum is perforated, grommets present, or history of ear surgery. NEVER insert cotton buds into ear canal.',
      alternativesFa: 'قطره کاربامید پروکساید (Ear Clear) ۲ بار در روز به مدت ۴ روز.',
      alternativesEn: 'Carbamide Peroxide drops twice daily for up to 4 days.',
    },
    symptomsFa: ['کاهش شنوایی انتقالی تدریجی یا ناگهانی پس از حمام/شنا', 'احساس پری، سنگینی یا انسداد در مجرای گوش', 'وزوز ملایم گوش (Tinnitus) یا اتوفونی (پیچیدن صدای خود در سر)'],
    redFlagsFa: ['درد شدید گوش (Otalgia)', 'ترشح خون‌آلود یا چرکی با بوی بد از مجرا', 'سابقه پارگی پرده گوش، جراحی گوش یا حضور گرومت (Grommet)', 'سرگیجه دورانی واقعی (Vertigo) یا تب'],
    nonPharmFa: [
      'اکیداً از فرو بردن گوش‌پاک‌کن، گیره مو یا هر جسم نوک‌تیز در مجرای گوش خودداری کنید.',
      'پاک کردن منظم لاله و ورودی گوش فقط با گوشه یک حوله نرم و مرطوب.',
      'در صورت باقی ماندن جرم پس از ۲ شب استفاده از وکس‌سول، ارجاع به پزشک عمومی یا پرستار جهت شستشوی حرفه‌ای (Ear Syringing/Suction).',
    ],
    clinicalPearlsFa: [
      'استفاده از وکس‌سول برای بیش از ۲ شب متوالی توصیه نمی‌شود زیرا ممکن است باعث تحریک شیمیایی پوست حساس مجرای گوش شود.',
    ],
  },

  nappy_rash: {
    cleanFaName: 'سوختگی پای نوزاد و راش کهنه (درماتیت نپی)',
    cleanEnName: 'Nappy Rash (Diaper Dermatitis)',
    primaryCommonNameFa: 'سوختگی و راش ناحیه پوشک نوزاد',
    primaryCommonNameEn: 'Diaper Dermatitis / Nappy Rash',
    primaryBrand: 'Sudocrem / Bepanthen Ointment / Daktozin Ointment',
    commonSynonymsFa: ['سوختگی پوشک', 'ادرارسوختگی نوزاد', 'راش نپی کاندیدایی'],
    commonSynonymsEn: ['Diaper Rash', 'Nappy Dermatitis', 'Napkin Rash'],
    australianBrands: [
      { brand: 'Sudocrem Healing Cream', generic: 'Zinc Oxide 15.25% + Benzyl Benzoate + Lanolin', form: 'کرم محافظ و التیام‌بخش ضدسوختگی' },
      { brand: 'Bepanthen Ointment', generic: 'Dexpanthenol (Pro-vitamin B5) 5%', form: 'پماد بازسازی‌کننده سد پوستی' },
      { brand: 'Daktozin Ointment', generic: 'Miconazole 0.25% + Zinc Oxide 15%', form: 'پماد ضدقارچ و محافظ نپی' },
      { brand: 'Curash Anti-Rash Baby Powder', generic: 'Zinc Oxide 25%', form: 'پودر محافظ ضدسوختگی' },
    ],
    firstLine: {
      drugNameFa: 'کرم سد محافظتی زینک اکساید (Sudocrem یا Bepanthen) با هر بار تعویض پوشک',
      drugNameEn: 'Zinc Oxide Barrier Cream (Sudocrem) or Dexpanthenol (Bepanthen) at each nappy change',
      drugClassFa: 'کرم محافظ ضدآب و تسکین‌دهنده سد پوستی (Water-repellent Barrier)',
      drugClassEn: 'Protective Skin Barrier & Soothing Emollient',
      keyBrands: ['Sudocrem', 'Bepanthen Ointment', 'Daktozin Ointment', 'Egozite Baby'],
      dosingFa: 'پس از شستشوی ملایم با آب ولرم و خشک کردن کامل پوست، لایه‌ای ضخیم از پماد محافظ (مانند مالیدن خامه روی کیک) در تمام ناحیه پوشک مالیده شود. در صورت درگیری قارچی کاندیدا: پماد داکتوزین (Daktozin) روزی ۲ تا ۳ بار استفاده شود.',
      dosingEn: 'Apply a thick protective layer to clean, dry nappy area after every change. If fungal signs present, use Daktozin BD-TDS.',
      onsetCourseFa: 'بهبودی راش ساده تماسی ظرف ۲۴ تا ۴۸ ساعت با تعویض مکرر و لایه محافظ.',
      onsetCourseEn: 'Simple irritant contact rash improves within 24-48 hours with frequent changes.',
      keyWarningsFa: 'از مصرف دستمال‌های مرطوب حاوی الکل، عطر یا متیل‌ایزوتیازولینون خودداری شود. در صورت مشاهده ضایعات اقماری قرمز روشن در چین‌های پوستی (کاندیدیاز)، حتماً باید پماد ضدقارچ حاوی میکونازول (Daktozin) اضافه شود.',
      keyWarningsEn: 'Avoid fragranced or alcoholic wipes. If bright red rash involves deep skin flexures with satellite papules, treat for Candida (Daktozin).',
      alternativesFa: 'هیدروکورتیزون ۰.۵٪ تا ۱٪ موضعی حداکثر به مدت ۱ تا ۲ روز در صورت التهاب بسیار شدید تحت نظر داروساز.',
      alternativesEn: 'Hydrocortisone 0.5-1% short-term (1-2 days) for severe acute inflammation.',
    },
    symptomsFa: ['قرمزی، التهاب و سوزش پوست در سطوح برجسته در تماس مستقیم با پوشک (باسن، زیر شکم، ران‌ها)', 'پوسته شدن خفیف و بی‌قراری نوزاد هنگام ادرار یا تمیز کردن'],
    redFlagsFa: ['ضایعات قرمز براق آتشین در عمق چین‌های ران با پاپول‌های اقماری ریز (Satellite lesions) ناشی از عفونت قارچی مقاوم', 'تاول، زخم‌های باز، ترشح چرکی یا دلمه‌های زرد عسلی (عفونت باکتریایی)', 'تب، بی‌حالی، کاهش تغذیه یا خونریزی', 'عدم بهبودی پس از ۳ روز درمان کامل'],
    nonPharmFa: [
      'تعویض فوق‌العاده سریع و مکرر پوشک بلافاصله پس از هر بار دفع ادرار یا مدفوع.',
      'قرار دادن نوزاد در زمان‌های بدون پوشک (Nappy-free time) به مدت طولانی در روز تا هوا بخورد.',
      'شستشو با آب ولرم خالص و پنبه نرم بدون صابون یا مواد معطر.',
      'بستن آزاد و شل پوشک تا از ساییدگی مکانیکی جلوگیری شود.',
    ],
    clinicalPearlsFa: [
      'راش تماسی تحریکی چین‌های عمقی را درگیر نمی‌کند؛ اما راش قارچی کاندیدا دقیقاً چین‌های عمقی کشاله ران را با پاپول‌های اقماری قرمز ملتهب می‌سازد.',
    ],
  },

  nasal_congestion: {
    cleanFaName: 'احتقان و گرفتگی بینی',
    cleanEnName: 'Nasal Congestion (Nasal Obstruction)',
    primaryCommonNameFa: 'کیپ شدن و گرفتگی مجاری تنفسی بینی',
    primaryCommonNameEn: 'Blocked Nose / Sinus Congestion',
    primaryBrand: 'Otrivin 0.1% Nasal Spray / Sudafed Nasal Spray / Fess Saline',
    commonSynonymsFa: ['گرفتگی بینی', 'احتقان سینوس', 'انسداد بینی در سرماخوردگی'],
    commonSynonymsEn: ['Stuffy Nose', 'Nasal Blockage', 'Sinus Pressure'],
    australianBrands: [
      { brand: 'Otrivin 0.1% Adult Nasal Spray', generic: 'Xylometazoline hydrochloride 0.1%', form: 'اسپری دکونژستانت موضعی سریع‌الاثر' },
      { brand: 'Dimetapp 12 Hour Nasal Spray', generic: 'Oxymetazoline hydrochloride 0.05%', form: 'اسپری ضد احتقان ۱۲ ساعته' },
      { brand: 'Fess Nasal Spray / Sinus Wash', generic: 'Hypertonic / Isotonic Saline', form: 'اسپری شستشوی سالین طبیعی' },
      { brand: 'Sudafed Sinus 60mg Tablets', generic: 'Pseudoephedrine hydrochloride', form: 'قرص ضد احتقان سیستمیک خوراکی (S3)' },
    ],
    firstLine: {
      drugNameFa: 'اسپری سالین هایپرتونیک (Fess) + اسپری اکسی‌متازولین/زایلومتازولین موضعی (Otrivin) حداکثر ۳ تا ۵ روز',
      drugNameEn: 'Hypertonic Saline Spray (Fess) + Topical Decongestant (Otrivin/Oxymetazoline) MAX 3-5 DAYS',
      drugClassFa: 'آگونیست آلفا-آدرنرژیک منقبض‌کننده عروق موضعی بینی',
      drugClassEn: 'Topical Alpha-1/Alpha-2 Adrenergic Vasoconstrictor',
      keyBrands: ['Otrivin 0.1%', 'Dimetapp 12hr', 'Fess Saline Spray', 'Sudafed Sinus'],
      dosingFa: 'بزرگسالان و بالای ۱۲ سال: ۱ تا ۲ پاف در هر سوراخ بینی، ۲ تا ۳ بار در روز (حداکثر به مدت ۳ تا ۵ روز متوالی). سالین: بدون محدودیت چند بار در روز جهت شستشو.',
      dosingEn: 'Adults >12yo: 1-2 sprays into each nostril 2-3 times daily (MAX 3-5 CONSECUTIVE DAYS). Saline: Use frequently PRN.',
      onsetCourseFa: 'باز شدن کامل مجرای تنفسی بینی ظرف ۲ تا ۵ دقیقه و تداوم اثر به مدت ۸ تا ۱۲ ساعت.',
      onsetCourseEn: 'Immediate vasoconstriction and airway clearance within 2-5 minutes, lasting 8-12 hours.',
      keyWarningsFa: 'هشدار حیاتی: مصرف بیش از ۳ تا ۵ روز متوالی اکیداً ممنوع است زیرا منجر به احتقان بازگشتی شدید و غیرقابل برگشت مخاطی موسوم به رینیت مدیکامنتوزا (Rhinitis Medicamentosa) و وابستگی شدید می‌شود. در کودکان زیر ۶ سال مصرف دکونژستانت‌های موضعی ممنوع است.',
      keyWarningsEn: 'CRITICAL WARNING: Strictly do NOT exceed 3-5 consecutive days due to severe risk of Rhinitis Medicamentosa (rebound congestion). Contraindicated <6yo.',
      alternativesFa: 'اسپری‌های کورتیکواستروئیدی بینی (Nasonex یا Flixonase) در صورت احتقان مزمن آلرژیک.',
      alternativesEn: 'Intranasal corticosteroids (Nasonex / Flixonase) for chronic or allergic congestion.',
    },
    symptomsFa: ['احساس پری و انسداد دوطرفه یا یکطرفه مجاری بینی، تنفس اجباری از راه دهان', 'کاهش حس بویایی و احساس فشار و سنگینی خفیف در پیشانی و سینوس‌ها'],
    redFlagsFa: ['ترشح یکطرفه خون‌آلود یا ترشح بدبوی چرکی پایدار یکطرفه (شک به جسم خارجی در کودکان یا پولیپ)', 'تب بالا همراه با درد شدید و متمرکز صورت و تورم دور چشم (شک به سینوزیت حاد باکتریایی)', 'گرفتگی مزمن مقاوم به درمان بیش از ۲ هفته', 'سابقه مصرف طولانی‌مدت و وابستگی به اسپری اکسی‌متازولین'],
    nonPharmFa: [
      'شستشوی مکرر مجاری بینی با محلول سالین هایپرتونیک (مانند Fess Sinus Wash) جهت پاکسازی موکوس متراکم.',
      'بخور آب گرم یا قرار گرفتن در حمام با بخار فراوان.',
      'بالا نگه داشتن سر هنگام خوابیدن با یک بالش اضافه جهت کاهش پرخونی وریدی مخاط بینی.',
    ],
    clinicalPearlsFa: [
      'سودوافدرین خوراکی (Sudafed 60mg) داروی جدول ۳ (S3) در استرالیا است و ثبت کارت شناسایی در سیستم Project STOP و ارزیابی فشار خون، گلوکوم و بیماری قلبی بیمار الزامی است.',
    ],
  },

  pain_relief: {
    cleanFaName: 'تسکین دردهای حاد و مسکن‌های عمومی',
    cleanEnName: 'Acute Pain Management (Analgesia)',
    primaryCommonNameFa: 'مدیریت و تسکین دردهای حاد و سردرد',
    primaryCommonNameEn: 'Acute Mild-to-Moderate Pain Relief',
    primaryBrand: 'Panadol 500mg (Paracetamol) / Nurofen 200mg (Ibuprofen)',
    commonSynonymsFa: ['مسکن درد', 'درد عضلانی و سردرد', 'داروهای ضددرد OTC'],
    commonSynonymsEn: ['Analgesics', 'Headache Relief', 'Musculoskeletal Pain', 'Toothache'],
    australianBrands: [
      { brand: 'Panadol / Panadol Optizorb 500mg', generic: 'Paracetamol 500mg', form: 'قرص سریع‌جذب پاراستامول' },
      { brand: 'Nurofen 200mg / 400mg', generic: 'Ibuprofen', form: 'کپسول ژلاتینی و قرص ضدالتهاب' },
      { brand: 'Voltaren Emulgel / Rapid 25mg', generic: 'Diclofenac', form: 'ژل موضعی و قرص ضددرد' },
      { brand: 'Nuromol / Maxigesic', generic: 'Paracetamol 500mg + Ibuprofen 150mg/200mg', form: 'قرص ترکیبی سینرژیک دوگانه' },
    ],
    firstLine: {
      drugNameFa: 'پاراستامول (Panadol) ۵۰۰ تا ۱۰۰۰ میلی‌گرم هر ۴ تا ۶ ساعت (حداکثر ۴۰۰۰ میلی‌گرم در روز) یا ایبوپروفن (Nurofen) ۴۰۰ میلی‌گرم',
      drugNameEn: 'Paracetamol 500-1000mg Q4-6H (max 4g/day) or Ibuprofen 400mg TDS with food',
      drugClassFa: 'مسکن غیرمخدر مرکزی (Paracetamol) و ضدالتهاب غیراستروئیدی محیطی (NSAID)',
      drugClassEn: 'Central Non-opioid Analgesic & Peripheral Non-Steroidal Anti-inflammatory',
      keyBrands: ['Panadol 500mg', 'Nurofen 200mg', 'Maxigesic', 'Voltaren Emulgel'],
      dosingFa: 'بزرگسالان: پاراستامول ۱ تا ۲ قرص ۵۰۰ میلی‌گرم هر ۴ تا ۶ ساعت در صورت نیاز (حداکثر ۸ قرص معادل ۴ گرم در ۲۴ ساعت). کودکان: ۱۵ میلی‌گرم به ازای هر کیلوگرم وزن هر ۴ تا ۶ ساعت (حداکثر ۶۰ میلی‌گرم/کیلوگرم در روز). ایبوپروفن بزرگسالان: ۲۰۰ تا ۴۰۰ میلی‌گرم هر ۶ تا ۸ ساعت همراه با غذا.',
      dosingEn: 'Adults: Paracetamol 0.5-1g Q4-6H PRN (max 4g/24hr). Paediatrics: 15mg/kg Q4-6H (max 60mg/kg/day). Ibuprofen: 200-400mg TDS with meals.',
      onsetCourseFa: 'شروع اثر ظرف ۲۰ الی ۳۰ دقیقه و اوج تسکین در ۱ تا ۲ ساعت.',
      onsetCourseEn: 'Onset of analgesia within 20-30 minutes, peak effect at 1-2 hours.',
      keyWarningsFa: 'پاراستامول: در نارسایی کبدی و الکلیسم مزمن سقف مصرف به ۲ گرم در روز کاهش می‌یابد. مسمومیت کشنده با دوزهای بالای ۷.۵ گرم رخ می‌دهد. NSAIDs (ایبوپروفن): در زخم فعال معده، نارسایی کلیوی شدید، بارداری (سه ماهه سوم)، نارسایی قلبی و آسم حساس به آسپیرین ممنوع است.',
      keyWarningsEn: 'Paracetamol hepatotoxicity risk; strict 4g/day ceiling. NSAIDs contraindicated in active peptic ulcer, severe renal impairment, 3rd trimester pregnancy, and aspirin-sensitive asthma.',
      alternativesFa: 'ترکیب دوگانه پاراستامول + ایبوپروفن (Maxigesic/Nuromol) برای دردهای متوسط تا شدیدتر.',
      alternativesEn: 'Fixed-dose combination Paracetamol + Ibuprofen (Maxigesic / Nuromol) for synergistic efficacy.',
    },
    symptomsFa: ['سردرد تنشی، دندان‌درد، دردهای عضلانی-اسکلتی، کمردرد، پیچ‌خوردگی مفاصل و دیسمنوره (درد قاعدگی)'],
    redFlagsFa: ['سردرد ناگهانی رعدآسا و فوق‌العاده شدید ("بدترین سردرد عمر") با سفتی گردن و تب', 'درد قفسه سینه انتشاریافته به فک یا بازوی چپ با تنگی نفس (شک به ایسکمی قلبی)', 'درد حاد شدید شکمی با سفتی جدار شکم و استفراغ مداوم', 'درد مقاوم بدون پاسخ به درمان پس از ۳ روز متوالی'],
    nonPharmFa: [
      'استفاده از پروتکل RICE (استراحت، یخ، باند کشی فشاری و بالا نگه داشتن عضو) در آسیب‌های ورزشی و پیچ‌خوردگی‌ها در ۴۸ ساعت اول.',
      'کمپرس گرم برای اسپاسم‌ها و گرفتگی‌های عضلانی مزمن.',
      'هیدراتاسیون کافی و استراحت در اتاق تاریک و ساکت در سردردهای تنشی.',
    ],
    clinicalPearlsFa: [
      'مصرف همزمان پاراستامول و ایبوپروفن به دلیل مکانیسم‌های اثر مکمل (مرکزی و محیطی) تسکین دردی قوی‌تر از کدئین‌های با دوز پایین بدون ریسک عوارض یبوست یا وابستگی ایجاد می‌کند.',
    ],
  },

  seborrhoeic_dermatitis: {
    cleanFaName: 'درماتیت سبورئیک و شوره سر',
    cleanEnName: 'Seborrhoeic Dermatitis & Dandruff',
    primaryCommonNameFa: 'شوره چرب و التهاب سبورئیک پوست سر و صورت',
    primaryCommonNameEn: 'Seborrhoeic Dermatitis & Pityriasis Capitis',
    primaryBrand: 'Nizoral 2% Shampoo (Ketoconazole) / Selsun Gold',
    commonSynonymsFa: ['شوره سر', 'درماتیت چرب', 'پوسته‌ریزی و قرمزی پوست سر'],
    commonSynonymsEn: ['Dandruff', 'Seborrhoea', 'Scalp Flaking', 'Malassezia Dermatitis'],
    australianBrands: [
      { brand: 'Nizoral 2% Shampoo', generic: 'Ketoconazole 2%', form: 'شامپو ضدقارچ اختصاصی مالاسزیا' },
      { brand: 'Selsun Gold Shampoo', generic: 'Selenium Sulfide 2.5%', form: 'شامپو دارویی ضدشوره' },
      { brand: 'Sebizole 2% Shampoo', generic: 'Ketoconazole 2%', form: 'شامپوی ضدقارچ کف سر' },
      { brand: 'Ego Sebitar Scalp Cleanser', generic: 'Tar + Salicylic Acid', form: 'شوینده قطران و سالیسیلیک' },
    ],
    firstLine: {
      drugNameFa: 'شامپو کتوکونازول ۲٪ (Nizoral 2%) ۲ بار در هفته به مدت ۴ هفته',
      drugNameEn: 'Ketoconazole 2% Medicated Shampoo (Nizoral) twice weekly for 4 weeks',
      drugClassFa: 'ضدقارچ ایمیدازول موضعی مهارکننده مخمر مالاسزیا (Malassezia)',
      drugClassEn: 'Topical Imidazole Antifungal & Anti-inflammatory Shampoo',
      keyBrands: ['Nizoral 2%', 'Selsun Gold 2.5%', 'Sebizole 2%'],
      dosingFa: 'شامپو را روی مو و پوست سر مرطوب ماساژ دهید تا کف کند؛ اجازه دهید کف شامپو دقیقاً ۳ تا ۵ دقیقه روی پوست سر بماند، سپس کاملاً آبکشی کنید. ۲ بار در هفته به مدت ۴ هفته و سپس هفته‌ای ۱ بار جهت پیشگیری از عود.',
      dosingEn: 'Massage into wet scalp, LEAVE LATHER ON SCALP FOR 3-5 MINUTES before rinsing. Use twice weekly for 4 weeks, then once weekly for maintenance.',
      onsetCourseFa: 'کاهش محسوس خارش و پوسته‌ریزی ظرف ۱ تا ۲ هفته.',
      onsetCourseEn: 'Marked reduction in scaling and pruritus within 1-2 weeks.',
      keyWarningsFa: 'ماندن کف روی پوست سر به مدت ۳ تا ۵ دقیقه برای نفوذ داروی ضدقارچ الزامی است؛ شستشوی سریع اثربخشی را از بین می‌برد. سلنیوم سولفاید (Selsun) ممکن است زیورآلات نقره و موهای رنگ‌شده را کدر یا لکه‌دار کند.',
      keyWarningsEn: 'Lather must remain in contact with scalp for 3-5 minutes. Selenium sulfide may discolour bleached/dyed hair and tarnish silver jewellery.',
      alternativesFa: 'لوسیون هیدروکورتیزون ۱٪ برای پوسته‌های ملتهب و قرمز صورت، لاله گوش یا خط رویش مو حداکثر به مدت ۷ روز.',
      alternativesEn: 'Topical Hydrocortisone 1% lotion for inflamed facial or retroauricular lesions (max 7 days).',
    },
    symptomsFa: ['پوسته‌های چرب سفید یا زرد چسبنده روی کف سر، خارش و قرمزی پوست سر', 'پوسته‌ریزی و لکه‌های قرمز چرب در ابروها، کناره‌های پره بینی، ریش و بالای قفسه سینه'],
    redFlagsFa: ['گسترش اریتم به صورت اریترودرمی منتشر در تمام بدن', 'عفونت باکتریایی ثانویه با ترشح چرک، دلمه زرد عسلی و سوزش شدید', 'عدم پاسخ کامل پس از ۴ هفته درمان با شامپوهای ضدقارچ'],
    nonPharmFa: [
      'شستشوی منظم موها با شامپوهای ملایم روزانه در روزهای بین درمان دارویی.',
      'پرهیز از مصرف ژل‌ها، تافت‌ها و واکس‌های سنگین و چرب مو.',
      'کاهش استرس‌های روحی و قرار گرفتن ملایم در معرض نور خورشید.',
    ],
    clinicalPearlsFa: [
      'درماتیت سبورئیک یک بیماری مزمن و عودکننده ناشی از تکثیر مخمر مالاسزیا در چربی پوست است؛ بنابراین درمان نگهدارنده (هفته‌ای ۱ بار) برای پیشگیری از عود ضروری است.',
    ],
  },

  smoking_cessation: {
    cleanFaName: 'ترک سیگار و درمان جایگزین نیکوتین (NRT)',
    cleanEnName: 'Smoking Cessation & Nicotine Replacement Therapy',
    primaryCommonNameFa: 'درمان جایگزین نیکوتین و ترک دخانیات',
    primaryCommonNameEn: 'Smoking Cessation & NRT Protocol',
    primaryBrand: 'Nicorette QuickMist / Nicabate Patches / Nicorette Gum',
    commonSynonymsFa: ['ترک سیگار', 'چسب نیکوتین', 'اسپری و آدامس ترک دخانیات'],
    commonSynonymsEn: ['NRT', 'Nicotine Dependence', 'Quit Smoking'],
    australianBrands: [
      { brand: 'Nicorette QuickMist Mouth Spray 1mg', generic: 'Nicotine 1mg/spray', form: 'اسپری دهانی فوق‌سریع برای هوس حاد' },
      { brand: 'Nicabate 21mg / 14mg / 7mg Patches', generic: 'Nicotine Transdermal Patch (24hr)', form: 'چسب پوستی ۲۴ ساعته آزادسازی پیوسته' },
      { brand: 'Nicorette 15mg / 10mg Patches', generic: 'Nicotine Transdermal Patch (16hr)', form: 'چسب پوستی ۱۶ ساعته مناسب خواب' },
      { brand: 'Nicorette 2mg / 4mg Chewing Gum', generic: 'Nicotine Polacrilex', form: 'آدامس درمانی جویدنی' },
      { brand: 'Nicorette 1.5mg / 4mg Lozenges', generic: 'Nicotine Lozenge', form: 'آبنبات مکیدنی نیکوتین' },
    ],
    firstLine: {
      drugNameFa: 'درمان ترکیبی: چسب پوستی نیکوتین (Nicotine Patch ۲۱mg) برای کنترل پایه + فرآورده دهانی سریع‌الاثر (اسپری QuickMist یا آدامس) برای هوس‌های حاد',
      drugNameEn: 'Combination NRT: Transdermal Patch (21mg/24hr or 15mg/16hr) + Oral Fast-Acting (Spray/Gum/Lozenge) for Breakthrough Cravings',
      drugClassFa: 'آگونیست انتخابی گیرنده‌های نیکوتینی کولینرژیک (NRT)',
      drugClassEn: 'Nicotinic Acetylcholine Receptor Agonist & Cessation Aid',
      keyBrands: ['Nicorette QuickMist', 'Nicabate Patch 21mg', 'Nicorette Gum 4mg', 'QuitLine 13 78 48'],
      dosingFa: 'افراد با وابستگی بالا (بیش از ۱۰ تا ۲۰ نخ سیگار در روز یا سیگار کشیدن ظرف ۳۰ دقیقه اول بیداری): چسب ۲۱ میلی‌گرم روزانه به مدت ۴ تا ۶ هفته، سپس کاهش تدریجی به ۱۴ میلی‌گرم (۲ تا ۴ هفته) و سپس ۷ میلی‌گرم (۲ تا ۴ هفته). همزمان اسپری دهانی ۱ تا ۲ پاف هنگام احساس هوس شدید (حداکثر ۴ پاف در ساعت و ۶۴ پاف در روز).',
      dosingEn: 'High dependence (>10-20 cigs/day or within 30 min of waking): 21mg/24hr patch daily for 4-6 weeks, step down to 14mg (2-4 wks) then 7mg. Add QuickMist 1-2 sprays for breakthrough cravings.',
      onsetCourseFa: 'اسپری سریع‌جذب ظرف ۶۰ ثانیه هوس نیکوتین را خاموش می‌کند؛ دوره کامل درمان NRT معمولاً ۸ تا ۱۲ هفته است.',
      onsetCourseEn: 'QuickMist oral spray relieves acute cravings within 60 seconds; full course duration is 8-12 weeks.',
      keyWarningsFa: 'روش صحیح جویدن آدامس تکنیک "Bite and Park" است (چند بار جویدن تا طعم تند آزاد شود و سپس قرار دادن کنار لثه؛ جویدن مداوم مانند آدامس معمولی باعث بلعیدن نیکوتین، تهوع، سکسکه و سوزش معده می‌شود). چسب پوستی هر روز در محل بدون مو جدید چسبانده شود. در صورت بی‌خوابی و رویاهای واضح شبانه از چسب ۱۶ ساعته استفاده شود.',
      keyWarningsEn: 'Chew and Park technique required for gum. Rotate patch application sites daily. In pregnancy, oral short-acting NRT is preferred over patches.',
      alternativesFa: 'معرفی بیمار به خط ملی مشاوره رایگان ترک سیگار استرالیا (Quitline 13 78 48).',
      alternativesEn: 'Referral to Quitline (13 78 48) and GP for varenicline/bupropion if NRT insufficient.',
    },
    symptomsFa: ['هوس شدید و وسواس‌گونه به مصرف سیگار، بی‌قراری، اضطراب، تحریک‌پذیری، اختلال تمرکز، بی‌خوابی و افزایش اشتها در ساعات اولیه قطع نیکوتین'],
    redFlagsFa: ['سابقه حمله قلبی حاد (MI) یا سکته مغزی ظرف ۲ تا ۴ هفته گذشته یا آریتمی قلبی ناپایدار شدید (نیازمند نظارت مستقیم پزشک)', 'بارداری یا شیردهی (ارجحیت فرآورده‌های کوتاه‌اثر دهانی پس از ارزیابی سود به زیان)', 'سن زیر ۱۲ سال'],
    nonPharmFa: [
      'مشاوره رفتاری و تماس با خط ملی ترک سیگار (Quitline 13 78 48) که شانس موفقیت را بیش از دو برابر می‌کند.',
      'شناسایی و تغییر محرک‌های رفتاری مصرف سیگار (مانند قهوه صبحگاهی، معاشرت با افراد سیگاری و الکل).',
      'به کار بستن استراتژی ۴D در مواجهه با هوس: Delay (۵ دقیقه تأخیر بندازید)، Deep breath (نفس عمیق بکشید)، Drink water (آب بنوشید)، Distract (حواس خود را پرت کنید).',
    ],
    clinicalPearlsFa: [
      'درمان ترکیبی (چسب پوستی طولانی‌اثر به علاوه یک فرآورده سریع‌الاثر دهانی مانند اسپری یا لوزیج) اثربخشی و شانس ترک موفق را نسبت به تک‌درمانی تا ۷۰٪ افزایش می‌دهد.',
    ],
  },

  stings_bites: {
    cleanFaName: 'نیش زنبور، پشه و گزیدگی حشرات',
    cleanEnName: 'Insect Bites and Stings',
    primaryCommonNameFa: 'گزیدگی حشرات و نیش زنبور',
    primaryCommonNameEn: 'Bee/Wasp Stings & Arthropod Bites',
    primaryBrand: 'SOOV Bite Gel / Eurax / Dermaid 1% / Telfast',
    commonSynonymsFa: ['نیش زنبور عسل', 'نیش پشه', 'گزیدگی کک و ساس', 'حساسیت به نیش حشره'],
    commonSynonymsEn: ['Bee Sting', 'Mosquito Bite', 'Wasp Sting', 'Insect Bite Reaction'],
    australianBrands: [
      { brand: 'SOOV Bite Gel', generic: 'Lignocaine 3% + Cetrimide 0.5%', form: 'ژل بی‌حس‌کننده و ضدعفونی‌کننده موضعی' },
      { brand: 'Dermaid 1% Cream', generic: 'Hydrocortisone 1%', form: 'کرم ضدالتهاب و ضدخارش موضعی' },
      { brand: 'Eurax Cream', generic: 'Crotamiton 10%', form: 'کرم ضدخارش طولانی‌اثر' },
      { brand: 'Telfast 180mg / Zyrtec 10mg', generic: 'Fexofenadine / Cetirizine', form: 'آنتی‌هیستامین غیرخواب‌آور خوراکی' },
      { brand: 'Phenergan 10mg / 25mg', generic: 'Promethazine', form: 'آنتی‌هیستامین آرامبخش شبانه' },
    ],
    firstLine: {
      drugNameFa: 'برداشتن سریع نیش بدون فشردن کیسه زهر + کمپرس یخ + کرم هیدروکورتیزون ۱٪ موضعی و آنتی‌هیستامین خوراکی (Telfast یا Zyrtec)',
      drugNameEn: 'Scrape stinger off immediately + Ice compress + Topical Hydrocortisone 1% & Oral Antihistamine',
      drugClassFa: 'بی‌حس‌کننده، ضدالتهاب کورتونی موضعی و آنتی‌هیستامین H1 سیستمیک',
      drugClassEn: 'Topical Corticosteroid, Local Anaesthetic & Oral H1 Antihistamine',
      keyBrands: ['SOOV Bite Gel', 'Dermaid 1%', 'Telfast 180mg', 'Zyrtec 10mg'],
      dosingFa: 'کمپرس سرد به مدت ۱۰ تا ۱۵ دقیقه. ژل SOOV یا کرم هیدروکورتیزون ۱٪ روزی ۲ تا ۳ بار روی محل گزیدگی مالیده شود. در صورت خارش شدید یا واکنش وسیع: فکسوفنادین ۱۸۰ میلی‌گرم روزی ۱ عدد مصرف شود.',
      dosingEn: 'Apply ice pack for 10-15 mins. Apply SOOV Bite or Hydrocortisone 1% cream BD-TDS for 3-5 days. Oral Fexofenadine 180mg daily for extensive pruritus.',
      onsetCourseFa: 'تسکین سریع درد و سوزش با بی‌حس‌کننده ظرف چند دقیقه؛ رفع ورم موضعی ظرف ۲ تا ۳ روز.',
      onsetCourseEn: 'Rapid local pain relief within minutes; swelling resolves in 2-3 days.',
      keyWarningsFa: 'در صورت نیش زنبور، نیش را با لبه کارت بانکی یا ناخن به صورت افقی بتراشید و خارج کنید؛ هرگز کیسه زهر را با موچین یا انگشت فشار ندهید چون زهر بیشتری تزریق می‌شود.',
      keyWarningsEn: 'Scrape stinger off sideways with a hard edge; do NOT squeeze venom sac with tweezers. Watch for anaphylaxis symptoms.',
      alternativesFa: 'آنتی‌هیستامین سداتیو (پرومتازین/Phenergan) شب‌ها برای کودکان بالای ۲ سال که خارش شدید مانع خوابیدن آن‌ها است.',
      alternativesEn: 'Sedating antihistamine (Promethazine) at night for intense nocturnal pruritus (>2yo).',
    },
    symptomsFa: ['درد تیز و سوزاننده فوری، تورم موضعی قرمز، کهیر و خارش شدید در محل ورود نیش حشره'],
    redFlagsFa: ['علائم آنافیلاکسی حاد سیستمیک: تنگی نفس، خس‌خس سینه، تورم زبان، لب‌ها یا گلو، سرگیجه شدید و غش (نیاز فوری به تزریق EpiPen و تماس با 000)', 'گزیدگی متعدد زنبورها (بیش از ۱۰ تا ۲۰ نیش)', 'نیش در داخل دهان، حلق یا نزدیک چشم‌ها', 'گسترش پیشرونده قرمزی گرم، تب و خطوط قرمز پوستی پس از ۲۴ تا ۴۸ ساعت (سلولیت باکتریایی)'],
    nonPharmFa: [
      'شستشوی محل با آب و صابون ملایم جهت کاهش خطر عفونت ثانویه.',
      'قرار دادن کیسه یخ پیچیده شده در پارچه روی محل نیش به مدت ۱۵ دقیقه جهت کاهش التهاب و جذب زهر.',
      'پرهیز از خاراندن شدید برای جلوگیری از زخم و ورود باکتری‌های استافیلوکوک.',
    ],
    clinicalPearlsFa: [
      'در استرالیا در صورت مشکوک بودن به نیش عنکبوت کشنده قیف‌ساز (Funnel-web Spider) یا مار سمی، بستن باند فشاری بی‌حرکت‌کننده (Pressure Immobilisation Bandage) و تماس فوری با اورژانس 000 حیاتی است.',
    ],
  },

  stye: {
    cleanFaName: 'گل‌مژه و هوردئولوم خارجی',
    cleanEnName: 'Stye (External Hordeolum)',
    primaryCommonNameFa: 'گل‌مژه لبه پلک چشم',
    primaryCommonNameEn: 'Stye / External Hordeolum',
    primaryBrand: 'Warm Moist Compresses Protocol / Bausch & Lomb Eyewash',
    commonSynonymsFa: ['گل‌مژه', 'هوردئولوم', 'آبسه کوچک لبه پلک', 'برجستگی دردناک پلک'],
    commonSynonymsEn: ['Hordeolum', 'Eyelid Boil', 'Marginal Blepharitis lump'],
    australianBrands: [
      { brand: 'Warm Compress System / Blephasteam', generic: 'Thermal Eyelid Compression', form: 'کمپرس گرم مرطوب' },
      { brand: 'Chlorsig 0.5% Eye Drops / 1% Ointment', generic: 'Chloramphenicol', form: 'قطره و پماد چشمی با نسخه یا پروتکل داروساز (S4/S3)' },
      { brand: 'Little Eyes Gentle Eyelid Wipes', generic: 'Sterile Hypoallergenic Wipes', form: 'پدهای استریل تمیزکننده پلک' },
    ],
    firstLine: {
      drugNameFa: 'کمپرس گرم مرطوب تمیز ۳ تا ۴ بار در روز هر بار به مدت ۱۰ دقیقه + رعایت بهداشت لبه پلک',
      drugNameEn: 'Warm Moist Compresses 3-4 times daily (10 mins each) + Eyelid Margin Hygiene',
      drugClassFa: 'درمان فیزیکی حرارتی بازکننده مجرای غدد چربی لبه پلک (Zeis/Moll)',
      drugClassEn: 'Thermal Glandular Evacuation Protocol',
      keyBrands: ['Warm compress with clean cloth', 'Sterile saline eye wash', 'Little Eyes Wipes'],
      dosingFa: 'یک پارچه تمیز یا پد پنبه‌ای را در آب گرم تمیز خیسانده و پس از گرفتن آب اضافی، آن را به مدت ۵ تا ۱۰ دقیقه روی پلک بسته قرار دهید (روزی ۳ تا ۴ بار). پس از تخلیه خودبه‌خودی با آب مقطر تمیز پاک شود.',
      dosingEn: 'Apply warm moist cloth/pad to closed eye for 5-10 mins 3-4 times daily until pointed head drains spontaneously.',
      onsetCourseFa: 'رسیدن به نقطه سرزرد و تخلیه و بهبودی خودبه‌خودی ظرف ۵ تا ۷ روز.',
      onsetCourseEn: 'Spontaneous pointing, drainage, and resolution within 5-7 days.',
      keyWarningsFa: 'هرگز گل‌مژه را با دست فشار ندهید یا سوزن نزنید چون باعث پخش باکتری به بافت‌های عمقی اربیت چشم می‌شود. تا زمان بهبودی کامل از آرایش چشم و لنز تماسی پرهیز شود. آنتی‌بیوتیک‌های موضعی معمولاً برای گل‌مژه ساده خارجی لزومی ندارند.',
      keyWarningsEn: 'NEVER squeeze, pop, or puncture a stye. Cease contact lenses and eye makeup. Topical antibiotics are rarely needed for simple external styes.',
      alternativesFa: 'پماد کلرامفنیکل ۱٪ (Chlorsig) شب‌ها در صورت همراهی با بلفاریت عفونی چرکی فعال.',
      alternativesEn: 'Chloramphenicol 1% eye ointment at bedtime if associated with secondary blepharitis.',
    },
    symptomsFa: ['برجستگی کوچک، بسیار حساس و دردناک با قرمزی و تورم در لبه پلک که به تدریج دارای یک سر زرد چرکی در پایه مژه می‌شود', 'احساس جسم خارجی در چشم و اشک‌ریزش خفیف'],
    redFlagsFa: ['گسترش قرمزی، حرارت و تورم شدید به کل پلک و بافت‌های اطراف کاسه چشم (شک به سلولیت دور چشم/Preseptal Cellulitis)', 'تغییرات در بینایی، دوبینی، تاری دید یا درد هنگام حرکت دادن کره چشم', 'عدم بهبودی یا تبدیل شدن به برآمدگی سفت بدون درد و مزمن (شالازیون/Chalazion)', 'بیماران نقص ایمنی'],
    nonPharmFa: [
      'استفاده مستمر از کمپرس گرم مرطوب که مؤثرترین روش باز کردن انسداد غدد لبه پلک است.',
      'شستشوی دست‌ها قبل و بعد از تماس با چشم.',
      'دور انداختن ریمل‌ها و لوازم آرایشی چشمی آلوده و قدیمی.',
    ],
    clinicalPearlsFa: [
      'گل‌مژه (Hordeolum) یک عفونت حاد و دردناک باکتریایی است، در حالی که شالازیون (Chalazion) یک گرانولومای چربی مزمن، سفت و کاملاً بدون درد است که نیازمند ماساژ طولانی‌مدت یا تخلیه جراحی است.',
    ],
  },

  swimmers_ear: {
    cleanFaName: 'گوش‌درد شناگران (اوتیت خارجی حاد)',
    cleanEnName: "Swimmer's Ear (Otitis Externa)",
    primaryCommonNameFa: 'عفونت و التهاب مجرای گوش خارجی ناشی از آب',
    primaryCommonNameEn: "Otitis Externa / Swimmer's Ear",
    primaryBrand: 'Aquaear / Ear Clear Swimmer’s Ear / Vosol Ear Drops',
    commonSynonymsFa: ['اوتیت اکسترن', 'گوش‌درد بعد از استخر', 'التهاب مجرای گوش'],
    commonSynonymsEn: ['Acute Otitis Externa', 'Swimmer Ear', 'Ear Canal Infection'],
    australianBrands: [
      { brand: 'Aquaear Ear Drops', generic: 'Acetic Acid 1.73% + Isopropyl Alcohol 63.4%', form: 'قطره ضدعفونی‌کننده و خشک‌کننده گوش' },
      { brand: 'Ear Clear Swimmer’s Ear', generic: 'Acetic Acid + Isopropyl Alcohol', form: 'قطره اسیدی‌کننده مجرا' },
      { brand: 'Vosol Ear Drops', generic: 'Acetic Acid 2% + Propylene Glycol', form: 'قطره ضدقارچ و باکتری گوش' },
      { brand: 'Ciprocort / Ciproxin HC', generic: 'Ciprofloxacin + Hydrocortisone', form: 'قطره تجویزی قوی (S4)' },
    ],
    firstLine: {
      drugNameFa: 'قطره استیک اسید + ایزوپروپیل الکل (Aquaear) ۴ تا ۶ قطره پس از هر بار تماس با آب یا شنا',
      drugNameEn: 'Acetic Acid + Isopropyl Alcohol (Aquaear Drops) 4-6 drops after water exposure',
      drugClassFa: 'اسیدی‌کننده آنتی‌باکتریال و خشک‌کننده رطوبت مجرای گوش',
      drugClassEn: 'Topical Acidifying & Astringent / Desiccating Agent',
      keyBrands: ['Aquaear', 'Ear Clear Swimmer’s Ear', 'Vosol'],
      dosingFa: 'پس از شنا یا حمام، ۴ تا ۶ قطره داخل مجرای هر گوش چکانده شود؛ سر را خم نگه دارید تا قطره به عمق مجرا برسد و سپس بگذارید خارج شود.',
      dosingEn: 'Instil 4-6 drops into affected ear canal after swimming or showering. Keep head tilted for 1-2 minutes.',
      onsetCourseFa: 'خشک شدن فوری رطوبت و پیشگیری از رشد باکتری‌ها ظرف ۲۴ تا ۴۸ ساعت.',
      onsetCourseEn: 'Immediate drying and restoration of canal acidity; resolves within 2-3 days.',
      keyWarningsFa: 'در صورت وجود پارگی پرده گوش، لوله‌های گرومت (Grommets) یا خروج ترشحات چرکی/خونی، استفاده از قطره‌های الکلی اکیداً ممنوع و بسیار دردناک است. از دستکاری و خاراندن مجرای گوش با گوش‌پاک‌کن خودداری شود.',
      keyWarningsEn: 'CONTRAINDICATED if tympanic membrane is perforated, grommets present, or severe open ulceration due to extreme stinging and ototoxicity.',
      alternativesFa: 'ارجاع به پزشک عمومی جهت تجویز قطره‌های آنتی‌بیوتیک حاوی کورتون (Ciprocort/Sofradex) در صورت عفونت شدید.',
      alternativesEn: 'GP prescription for topical fluoroquinolone + corticosteroid (Ciprocort) for severe infections.',
    },
    symptomsFa: ['درد شدید گوش که با کشیدن لاله گوش (Pinna) یا فشار روی زبانه گوش (Tragus) به شدت تشدید می‌شود', 'خارش، قرمزی و تورم مجرای گوش همراه با ترشحات زرد یا شفاف آبکی پس از شنا'],
    redFlagsFa: ['تب، تورم و قرمزی منتشر لاله گوش یا بافت پشت گوش (شک به ماستوئیدیت)', 'درد فوق‌العاده شدید مقاوم به مسکن‌های ساده', 'بیماران دیابتی یا نقص ایمنی (خطر اوتیت خارجی بدخیم/Malignant Otitis Externa)', 'کاهش شنوایی شدید یا سرگیجه و ضعف عضلات صورت'],
    nonPharmFa: [
      'خشک نگه‌داشتن دقیق گوش‌ها و استفاده از سشوار با باد ملایم و با فاصله مناسب پس از حمام.',
      'استفاده از کلاه شنا و گوش‌گیرهای سیلیکونی ضدآب هنگام شنا کردن در استخر یا دریا.',
      'پرهیز کامل از شنا و خیس شدن گوش تا زمان بهبودی کامل.',
    ],
    clinicalPearlsFa: [
      'علامت اختصاصی بالینی اوتیت خارجی، درد شدید هنگام کشیدن ملایم لاله گوش به بالا و عقب است؛ در حالی که در اوتیت میانی کشیدن گوش دردی ایجاد نمی‌کند.',
    ],
  },

  teething: {
    cleanFaName: 'دندان درآوردن شیرخواران',
    cleanEnName: 'Infant Teething',
    primaryCommonNameFa: 'بی‌قراری و درد رویش دندان نوزاد',
    primaryCommonNameEn: 'Infantile Teething & Dentition',
    primaryBrand: 'Chilled Teething Rings / Dymadon (Paracetamol) / Bonjela Teething',
    commonSynonymsFa: ['درد دندان شیری نوزاد', 'رویش دندان اطفال', 'لثه‌درد شیرخوار'],
    commonSynonymsEn: ['Teething Troubles', 'Tooth Eruption', 'Gingival Irritation'],
    australianBrands: [
      { brand: 'Chilled (not frozen) Teething Rings', generic: 'Physical Cryotherapy & Chewing Aid', form: 'حلقه و اسباب‌بازی ژله‌ای دندان‌گیر خنک' },
      { brand: 'Dymadon for Babies / Panadol Baby', generic: 'Paracetamol Drops', form: 'قطره و سوسپانسیون مسکن خوراکی' },
      { brand: 'Nurofen for Children Infant Drops', generic: 'Ibuprofen Infant Drops', form: 'سوسپانسیون ضددرد و ضدالتهاب' },
      { brand: 'Bonjela Teething Gel / SM-33 Gel', generic: 'Choline Salicylate 8.7% / Lignocaine', form: 'ژل موضعی تسکین لثه (با احتیاط)' },
    ],
    firstLine: {
      drugNameFa: 'حلقه دندان‌گیر خنک‌شده در یخچال (Chilled Teething Ring) + ماساژ لثه با انگشت تمیز + پاراستامول خوراکی (Dymadon) در صورت بی‌قراری شدید',
      drugNameEn: 'Chilled Teething Rings + Clean Finger Gum Massage + Oral Paracetamol (Dymadon) for severe pain',
      drugClassFa: 'تسکین فیزیکی برودتی و ضددرد مرکزی سیستمیک اطفال',
      drugClassEn: 'Non-pharmacological Cryotherapy & Paediatric Analgesia',
      keyBrands: ['BPA-free Teething Rings', 'Dymadon Drops', 'Baby Panadol', 'SM-33 Gel'],
      dosingFa: 'دندان‌گیر خنک‌شده در یخچال را در اختیار شیرخوار بگذارید تا بجود. پاراستامول خوراکی: ۱۵ میلی‌گرم به ازای هر کیلوگرم وزن هر ۴ تا ۶ ساعت (حداکثر ۴ بار در ۲۴ ساعت). ژل کولین سالیسیلات (Bonjela): در کودکان بالای ۴ ماه، مقدار کمی (اندازه نوک انگشت کوچک) روی لثه ملتهب حداکثر هر ۳ ساعت مالیده شود.',
      dosingEn: 'Provide chilled teething ring. Paracetamol 15mg/kg Q4-6H PRN (max 60mg/kg/day). Bonjela: Apply small dab to tender gums every 3 hours PRN (>4 months).',
      onsetCourseFa: 'تسکین سریع بی‌قراری و خارش لثه؛ علائم رویش هر دندان معمولاً طی یک پنجره ۸ روزه (۴ روز قبل تا ۳ روز بعد از رویش) رخ می‌دهد.',
      onsetCourseEn: 'Immediate cryotherapy soothing; symptoms cluster within an 8-day window per erupting tooth.',
      keyWarningsFa: 'هرگز دندان‌گیر را در فریزر یخ نزنید زیرا سرمای انجماد باعث سوختگی بافتی و آسیب لثه می‌شود. ژل‌های موضعی حاوی سالیسیلات (Bonjela) نباید بیش از حد مصرف شوند (خطر مسمومیت سالیسیلات). استفاده از پستانک‌های آغشته به عسل یا مواد شیرین اکیداً ممنوع است (خطر بوتولیسم و پوسیدگی دندان).',
      keyWarningsEn: 'Do NOT freeze teething rings (causes frostbite to gums). Strictly follow Bonjela dosing intervals. Never dip pacifiers in honey (<12m botulism risk).',
      alternativesFa: 'ایبوپروفن خوراکی اطفال (Nurofen Infant) برای نوزادان بالای ۳ ماه با وزن بالای ۶ کیلوگرم.',
      alternativesEn: 'Oral Paediatric Ibuprofen (>3 months & >6kg) for inflammatory gum pain.',
    },
    symptomsFa: ['افزایش ترشح بزاق و آب‌ریزش دهان (Drooling)، قرمز و متورم شدن لثه، مالیدن لثه به اشیاء، گاز گرفتن، بی‌قراری و تحریک‌پذیری خفیف'],
    redFlagsFa: ['تب بالا بالای ۳۸ درجه سانتی‌گراد (دندان درآوردن هرگز عامل تب بالا نیست؛ حتماً منشأ عفونی دارد)', 'اسهال شدید و آبکی، استفراغ مکرر یا بی‌حالی و خواب‌آلودگی غیرعادی', 'ضایعات تاولی یا زخم‌های آفت‌مانند متعدد در دهان (استوماتیت هرپسی)', 'بی‌قراری و گریه مداوم تسلی‌ناپذیر'],
    nonPharmFa: [
      'ماساژ ملایم لثه متورم با یک انگشت تمیز یا پارچه مرطوب سرد.',
      'پاک کردن منظم آب دهان از روی چانه و سینه برای جلوگیری از ایجاد راش و سوختگی پوستی.',
      'دادن تکه‌های هویج یا خیار خنک و سفت در توری‌های مخصوص میوه‌خوری نوزاد تحت نظارت دقیق والدین.',
    ],
    clinicalPearlsFa: [
      'یک باور غلط رایج، نسبت دادن تب بالا، اسهال شدید یا تشنج به دندان درآوردن است؛ رویش دندان ممکن است کمی حرارت بدن را بالا ببرد اما هرگز تب واقعی ایجاد نمی‌کند و نیازمند بررسی پزشکی است.',
    ],
  },

  tinea_versicolor: {
    cleanFaName: 'تینیا ورسیکالر (پیتریازیس ورسیکالر / قارچ رنگارنگ)',
    cleanEnName: 'Tinea Versicolor (Pityriasis Versicolor)',
    primaryCommonNameFa: 'قارچ رنگارنگ پوست تنه و سینه',
    primaryCommonNameEn: 'Pityriasis Versicolor / Tinea Flava',
    primaryBrand: 'Pevaryl Foaming Solution (Econazole 1%) / Selsun 2.5%',
    commonSynonymsFa: ['پیتریازیس ورسیکالور', 'قارچ آفتابی پوست', 'لکه‌های پوستی قهوه‌ای و سفید تنه'],
    commonSynonymsEn: ['Tinea Versicolor', 'Malassezia Furfur', 'Sun Fungus'],
    australianBrands: [
      { brand: 'Pevaryl Foaming Solution (Pack of 3 sachets)', generic: 'Econazole nitrate 1%', form: 'فوم شوینده ضدقارچ شبانه برای کل بدن' },
      { brand: 'Selsun Gold Shampoo 2.5%', generic: 'Selenium Sulfide 2.5%', form: 'لوسیون ضدقارچ مالاسزیا' },
      { brand: 'Nizoral 2% Shampoo', generic: 'Ketoconazole 2%', form: 'شامپو موضعی ضدقارچ' },
      { brand: 'Canesten / Daktarin Cream', generic: 'Clotrimazole / Miconazole', form: 'کرم برای نواحی موضعی محدود' },
    ],
    firstLine: {
      drugNameFa: 'محلول فوم اکونازول ۱٪ (Pevaryl Foaming Solution) شب‌ها روی پوست مرطوب کل بدن به مدت ۳ شب متوالی',
      drugNameEn: 'Econazole 1% Foaming Solution (Pevaryl) applied overnight for 3 consecutive nights',
      drugClassFa: 'ضدقارچ ایمیدازول با پوشش وسیع سطح پوست',
      drugClassEn: 'Broad-spectrum Topical Imidazole Antifungal Foaming Body Wash',
      keyBrands: ['Pevaryl Foaming Solution', 'Selsun Gold 2.5%', 'Nizoral 2%'],
      dosingFa: 'شب هنگام پس از دوش گرفتن، یک ساشه فوم پوارریل را روی پوست مرطوب از گردن تا زانوها بمالید و بگذارید در طول شب تا صبح خشک شده و بماند؛ صبح شسته شود. این کار را برای ۳ شب متوالی تکرار کنید. یا سلنیوم سولفاید ۲.۵٪ (Selsun): روزی ۱۰ دقیقه به مدت ۱۰ تا ۱۴ روز.',
      dosingEn: 'Apply 1 sachet of Pevaryl to wet skin from neck to knees, allow to dry and leave overnight for 3 consecutive nights. Rinse off in the morning.',
      onsetCourseFa: 'ریشه‌کنی قارچ ظرف ۱ تا ۲ هفته، اما بازگشت رنگدانه طبیعی پوست (Repigmentation) ممکن است چند ماه طول بکشد.',
      onsetCourseEn: 'Fungal clearance in 1-2 weeks; full repigmentation of skin patches takes several months.',
      keyWarningsFa: 'نکته بسیار مهم در مشاوره: لکه‌های سفید یا تیره تا ماه‌ها پس از مرگ کامل قارچ‌ها باقی می‌مانند و این به معنی شکست درمان نیست، بلکه زمان لازم است تا ملانوسیت‌ها با نور خورشید رنگ پوست را هماهنگ کنند.',
      keyWarningsEn: 'CRITICAL COUNSELING: Hypopigmented/hyperpigmented patches persist for months after active fungi are killed; this is not treatment failure.',
      alternativesFa: 'استفاده ماهانه از شامپو کتوکونازول یا پوارریل به عنوان پیشگیری در فصول گرم و مرطوب تابستان.',
      alternativesEn: 'Monthly prophylactic application of Ketoconazole or Pevaryl before hot summer months.',
    },
    symptomsFa: ['لکه‌های متعدد گرد یا بیضی با رنگ‌های متفاوت (سفیدتر، صورتی، برنزه یا قهوه‌ای) با پوسته‌ریزی بسیار ظریف پودری روی سینه، پشت، بازوها و گردن', 'عدم برنزه شدن لکه‌ها در آفتاب و خارش خفیف در گرما و تعریق'],
    redFlagsFa: ['درگیری بسیار گسترده در سراسر بدن همراه با التهاب و قرمزی شدید', 'ضایعات پوستی مقاوم به درمان‌های موضعی متعدد (نیازمند داروی خوراکی ضدقارچ تجویزی مانند ایتراکونازول)', 'تشخیص نامشخص (شک به ویتیلیگو/پیسی یا پیتریازیس روزه‌آ)'],
    nonPharmFa: [
      'پوشیدن لباس‌های نخی گشاد و خنک و پرهیز از لباس‌های نایلونی چسبان.',
      'استحمام سریع پس از تعریق شدید و فعالیت‌های ورزشی.',
      'پرهیز از مصرف روغن‌ها و لوسیون‌های سنگین چرب‌کننده روی تنه.',
    ],
    clinicalPearlsFa: [
      'عامل بیماری قارچ همزیست طبیعی پوست (Malassezia globosa/furfur) است که اسید آزلائیک ترشح کرده و با مهار ساخت ملانین باعث لکه‌های سفید و بی‌رنگ می‌شود.',
    ],
  },

  warts: {
    cleanFaName: 'زگیل‌های پوستی و زگیل کف پا (ورروکا)',
    cleanEnName: 'Warts and Verrucas (Verruca Vulgaris & Plantaris)',
    primaryCommonNameFa: 'زگیل معمولی و زگیل کف پا',
    primaryCommonNameEn: 'Cutaneous Warts & Plantar Verrucas',
    primaryBrand: 'Duofilm Liquid (Salicylic Acid 16.7% + Lactic Acid 16.7%) / Wart-Off Stick',
    commonSynonymsFa: ['زگیل دست و پا', 'ورروکا پلانتر', 'زگیل ویروسی HPV'],
    commonSynonymsEn: ['Common Warts', 'Plantar Warts', 'Verruca Plantaris', 'HPV Warts'],
    australianBrands: [
      { brand: 'Duofilm Liquid', generic: 'Salicylic Acid 16.7% + Lactic Acid 16.7%', form: 'محلول موضعی کراتولیتیک قوی با فرچه' },
      { brand: 'Wart-Off Stick / Paint', generic: 'Salicylic Acid 20% + Lactic Acid', form: 'محلول و استیک متمرکز زگیل' },
      { brand: 'Compound W Freeze Off', generic: 'Dimethyl Ether + Propane (Cryotherapy)', form: 'اسپری انجماد موضعی خانگی' },
      { brand: 'Scholl Verruca & Wart Treatment', generic: 'Salicylic Acid + Occlusive Plasters', form: 'پد و محلول چسبی' },
    ],
    firstLine: {
      drugNameFa: 'محلول اسید سالیسیلیک + اسید لاکتیک (Duofilm Liquid) روزی ۱ بار پس از خیساندن و ساییدن زگیل',
      drugNameEn: 'Salicylic Acid 16.7% + Lactic Acid 16.7% (Duofilm Liquid) applied daily post-soak and occlusion',
      drugClassFa: 'کراتولیتیک سوزاننده و محرک سیستم ایمنی موضعی',
      drugClassEn: 'High-strength Keratolytic & Chemical Ablative Agent',
      keyBrands: ['Duofilm Liquid', 'Wart-Off Paint', 'Compound W'],
      dosingFa: 'پروتکل ۴ مرحله‌ای روزانه: ۱) زگیل را ۵ دقیقه در آب گرم بخیسانید؛ ۲) با سنگ پا یا سوهان یکبارمصرف پوست مرده روی زگیل را به آرامی بسایید؛ ۳) پوست سالم اطراف را با وازلین بپوشانید؛ ۴) ۱ تا ۲ قطره دوئوفیلم را دقیقاً روی زگیل بمالید و بگذارید خشک شود و با چسب بپوشانید. روزانه تا پاکسازی کامل (حداکثر ۱۲ هفته) ادامه دهید.',
      dosingEn: 'Daily 4-step protocol: 1) Soak wart in warm water for 5 mins; 2) Gently pare down dead tissue with pumice; 3) Protect surrounding skin with petroleum jelly; 4) Apply Duofilm directly and cover with tape. Continue daily up to 12 weeks.',
      onsetCourseFa: 'از بین رفتن تدریجی زگیل و بازگشت خطوط طبیعی پوست طی ۴ تا ۱۲ هفته.',
      onsetCourseEn: 'Gradual desquamation and immune clearance over 4-12 weeks.',
      keyWarningsFa: 'در بیماران دیابتی، افراد مبتلا به بیماری‌های عروق محیطی یا نوروپاتی مصرف سالیسیلیک اسید ممنوع است. هرگز روی صورت، لب‌ها، لکه‌های مادرزادی، خال‌های گوشتی یا زگیل‌های تناسلی استفاده نشود.',
      keyWarningsEn: 'CONTRAINDICATED in diabetes, neuropathy, and peripheral arterial disease. Do NOT use on facial, anogenital, or hairy warts.',
      alternativesFa: 'کرایوتراپی با نیتروژن مایع (انجماد) توسط پزشک عمومی در صورت عدم پاسخ پس از ۱۲ هفته.',
      alternativesEn: 'GP Cryotherapy with liquid nitrogen or referral for curettage/laser therapy.',
    },
    symptomsFa: ['ضایعات برجسته زبر، گوشتی و گل‌کلمی روی دست‌ها و انگشتان (زگیل معمولی)', 'پینه‌های صاف و فرو رفته در کف پا که با فشار عمودی هنگام راه رفتن دردناک می‌شوند و نقاط سیاه ریز مویرگی (تخریب مویرگ‌ها) در مرکز دارند (زگیل کف پا/Verruca)'],
    redFlagsFa: ['ضایعات روی صورت، گردن، پلک یا ناحیه تناسلی و مقعدی', 'بیمار مبتلا به دیابت یا نقص سیستم ایمنی', 'خونریزی، خارش شدید، تغییر رنگ ناگهانی به تیره یا تغییر شکل غیرعادی ضایعه', 'زگیل‌های متعدد در افراد بالای ۵۰ سال بدون سابقه قبلی'],
    nonPharmFa: [
      'پوشیدن دمپایی و صندل در استخرها، سالن‌های ورزشی و دوش‌های عمومی برای جلوگیری از انتقال ویروس HPV.',
      'پرهیز از دستکاری، جویدن، کندن یا تراشیدن زگیل با ناخن‌گیر جهت جلوگیری از انتشار ویروس به سایر انگشتان.',
      'پوشاندن زگیل با چسب ضدآب هنگام شنا کردن.',
    ],
    clinicalPearlsFa: [
      'نقاط سیاه ریز در مرکز زگیل ناشی از مویرگ‌های ترومبوزه هستند که زگیل را از پینه معمولی (فاقد نقاط سیاه با خطوط پیوسته پوستی) متمایز می‌کند.',
    ],
  },
};

/**
 * Universal Clinical Field Translator for Medicine Monograph Fields
 */
export function translateMedicineAttribute(text: string | undefined, type: 'minAge' | 'pregnancy' | 'lactation' | 'dosing' | 'extra'): string {
  if (!text) return '';
  const trimmed = text.trim();

  if (type === 'minAge') {
    let res = trimmed
      .replace(/From birth/gi, 'از بدو تولد')
      .replace(/All ages/gi, 'تمامی سنین')
      .replace(/Adults? only/gi, 'فقط بزرگسالان')
      .replace(/Adults? and children over (\d+)\s*(?:years?|yo)/gi, 'بزرگسالان و کودکان بالای $1 سال')
      .replace(/>\s*(\d+)\s*(?:months?|m)/gi, 'بالای $1 ماه')
      .replace(/>\s*(\d+)\s*(?:years?|yo|y)/gi, 'بالای $1 سال')
      .replace(/(\d+)\s*-\s*(\d+)\s*(?:years?|yo)/gi, '$1 تا $2 سال')
      .replace(/Paediatrics?:?\s*/gi, 'اطفال: ')
      .replace(/Adults?:?\s*/gi, 'بزرگسالان: ')
      .replace(/paediatric drops\/suspensions available/gi, 'قطره/شربت اطفال موجود است');
    return res;
  }

  if (type === 'pregnancy' || type === 'lactation') {
    let res = trimmed
      .replace(/^Safe\b/gi, 'ایمن (Safe)')
      .replace(/Safe in pregnancy\b/gi, 'ایمن در بارداری (Category A)')
      .replace(/Safe in breastfeeding\b/gi, 'ایمن در دوران شیردهی')
      .replace(/Safe for short-term localized use/gi, 'ایمن برای مصرف موضعی کوتاه‌مدت')
      .replace(/Considered safe\b/gi, 'ایمن تلقی می‌شود')
      .replace(/Consider alternative\b/gi, 'ترجیح داروی جایگزین')
      .replace(/Avoid in 3rd trimester/gi, 'در سه ماهه سوم پرهیز شود')
      .replace(/Avoid\b/gi, 'پرهیز شود / غیرمجاز')
      .replace(/Caution\b/gi, 'با احتیاط')
      .replace(/Consult doctor\b/gi, 'مشورت با پزشک')
      .replace(/Not applicable\.?/gi, 'مورد مصرف ندارد')
      .replace(/Limited data\b/gi, 'اطلاعات محدود')
      .replace(/Category A/gi, 'دسته A (کاملاً ایمن)')
      .replace(/Category B1/gi, 'دسته B1')
      .replace(/Category B2/gi, 'دسته B2')
      .replace(/Category B3/gi, 'دسته B3')
      .replace(/Category C/gi, 'دسته C (با احتیاط)')
      .replace(/Category D/gi, 'دسته D (ممنوع)')
      .replace(/Category X/gi, 'دسته X (اکیداً ممنوع)');
    return res;
  }

  if (type === 'dosing') {
    let res = trimmed
      .replace(/Leave on dry hair 10-30 min, rinse and comb/gi, 'روی موهای خشک ۱۰ تا ۳۰ دقیقه بماند، سپس آبکشی و شانه شود')
      .replace(/Leave 10 min/gi, '۱۰ دقیقه بماند')
      .replace(/repeat at Day 7 & 14/gi, 'تکرار در روزهای ۷ و ۱۴')
      .replace(/repeat Day 7/gi, 'تکرار حتمی در روز هفتم')
      .replace(/Apply generously to nappy region after every nappy change/gi, 'پس از هر بار تعویض پوشک به مقدار کافی روی پوست مالیده شود')
      .replace(/Apply 1-2 sprays 2-3 times daily/gi, '۱ تا ۲ پاف ۲ تا ۳ بار در روز چکانده شود')
      .replace(/MAXIMUM 3-5 CONSECUTIVE DAYS/gi, 'حداکثر ۳ تا ۵ روز متوالی')
      .replace(/every 4-6 hours/gi, 'هر ۴ تا ۶ ساعت')
      .replace(/max 4000mg in 24 hours/gi, 'حداکثر ۴۰۰۰ میلی‌گرم در ۲۴ ساعت')
      .replace(/maximum 4000mg per 24 hours/gi, 'حداکثر ۴۰۰۰ میلی‌گرم در ۲۴ ساعت')
      .replace(/Use twice weekly for 4 weeks/gi, '۲ بار در هفته به مدت ۴ هفته')
      .replace(/once daily/gi, 'روزی ۱ بار')
      .replace(/twice daily/gi, 'روزی ۲ بار')
      .replace(/3-4 times daily/gi, '۳ تا ۴ بار در روز')
      .replace(/2-3 times daily/gi, '۲ تا ۳ بار در روز')
      .replace(/at bedtime/gi, 'قبل از خواب')
      .replace(/with food/gi, 'همراه با غذا')
      .replace(/after swimming or bathing/gi, 'پس از شنا یا استحمام')
      .replace(/every 2-3 days/gi, 'هر ۲ تا ۳ روز یکبار')
      .replace(/for 2 consecutive nights/gi, 'برای ۲ شب متوالی')
      .replace(/for 3 consecutive nights/gi, 'برای ۳ شب متوالی')
      .replace(/for up to 7-14 days/gi, 'حداکثر به مدت ۷ تا ۱۴ روز')
      .replace(/Apply thinly/gi, 'به صورت یک لایه نازک مالیده شود')
      .replace(/Rub gently/gi, 'به آرامی مالش دهید')
      .replace(/Apply 2-4g \(cherry to walnut size\) to affected area/gi, 'مقدار ۲ تا ۴ گرم (به اندازه گیلاس تا گردو) روی موضع مالیده شود')
      .replace(/Adults?:?\s*/gi, 'بزرگسالان: ')
      .replace(/Child(?:ren)?:?\s*/gi, 'کودکان: ');
    return res;
  }

  if (type === 'extra') {
    // If multiple phrases separated by semicolon or period
    const phrases: Record<string, string> = {
      'Camphor improves circulation': 'کافور گردش خون موضعی را بهبود می‌بخشد',
      'Benzocaine numbs pain': 'بنزوکائین حس درد را تسکین و بی‌حس می‌کند',
      'Balsam-Peru acts as antiseptic': 'بالسام پرو اثر ضدعفونی‌کننده و آنتی‌سپتیک دارد',
      'Balsam Peru acts as antiseptic': 'بالسام پرو اثر ضدعفونی‌کننده و آنتی‌سپتیک دارد',
      'Lanolin/paraffin retains heat': 'لانولین و پارافین حرارت طبیعی بافت را حفظ می‌کنند',
      'Guaifenesin promotes expectoration': 'گوایفنزین خروج خلط و ترشحات تنفسی را تسهیل می‌کند',
      'Bromhexine reduces mucus viscosity': 'برومهگزین ویسکوزیته و چسبندگی موکوس را کاهش می‌دهد',
      'Sugar-free formulations': 'فرمولاسیون‌های فاقد قند',
      'Sugar-free': 'فاقد قند',
      'Contraindicated in asthma, COPD, and respiratory failure.': 'در آسم، COPD و نارسایی تنفسی ممنوع است.',
      'Contraindicated in asthma, COPD, and respiratory failure': 'در آسم، COPD و نارسایی تنفسی ممنوع است',
      'Fewer side effects than dihydrocodeine.': 'عوارض جانبی کمتر نسبت به دی‌هیدروکدئین.',
      'Fewer side effects than dihydrocodeine': 'عوارض جانبی کمتر نسبت به دی‌هیدروکدئین',
      'Potential to increase serotonin levels; caution with SSRIs/MAOIs.': 'احتمال افزایش سطح سروتونین؛ احتیاط با SSRIها و MAOIها.',
      'Potential to increase serotonin levels; caution with SSRIs/MAOIs': 'احتمال افزایش سطح سروتونین؛ احتیاط با SSRIها و MAOIها',
      'Avoid olive oil (disrupts skin barrier) and nut-based oils (sensitisation risk).': 'از روغن زیتون (تخریب سد پوستی) و روغن‌های آجیل (حساسیت‌زایی) پرهیز شود.',
      'Avoid olive oil (disrupts skin barrier) and nut-based oils (sensitisation risk)': 'از روغن زیتون (تخریب سد پوستی) و روغن‌های آجیل (حساسیت‌زایی) پرهیز شود',
      'More effective than diphenoxylate. Do not use in acute ulcerative colitis or bacterial enteritis.': 'موثرتر از دیفنوکسیلات. در کولیت اولسراتیو حاد و انتریت باکتریایی مصرف نشود.',
      'More effective than diphenoxylate': 'موثرتر از دیفنوکسیلات',
      'Do not use in acute ulcerative colitis or bacterial enteritis': 'در کولیت اولسراتیو حاد و انتریت باکتریایی مصرف نشود',
      'May cause drowsiness. Atropine added to discourage abuse.': 'ممکن است خواب‌آلودگی ایجاد کند. آتروپین جهت پیشگیری از سوءمصرف اضافه شده است.',
      'May cause drowsiness': 'ممکن است سبب خواب‌آلودگی شود',
      'Atropine added to discourage abuse': 'آتروپین جهت پیشگیری از سوءمصرف اضافه شده است',
      'Primary mainstay of therapy to prevent dehydration.': 'اساس اصلی درمان برای جلوگیری از کم‌آبی بدن (دهیدراتاسیون).',
      'Primary mainstay of therapy to prevent dehydration': 'اساس اصلی درمان برای جلوگیری از کم‌آبی بدن (دهیدراتاسیون)',
      'Hylo-Fresh/Forte is preservative-free multi-dose. Discard unit dose vials after single use; multi-dose after 28 days.': 'قطره‌های هایلو فاقد ماده نگهدارنده هستند. ویال‌های تک‌دوز پس از یکبار مصرف و چنددوز پس از ۲۸ روز دور انداخته شوند.',
      'Alcohol-free formulations.': 'فرمولاسیون‌های فاقد الکل.',
      'Alcohol-free formulations': 'فرمولاسیون‌های فاقد الکل',
      'Do not use if eardrum is perforated or ear is inflamed.': 'در صورت پارگی پرده گوش یا التهاب حاد مجرا استفاده نشود.',
      'Do not use if eardrum is perforated or ear is inflamed': 'در صورت پارگی پرده گوش یا التهاب حاد مجرا استفاده نشود',
      'Contains peanut (arachis) oil; check for nut allergies.': 'حاوی روغن بادام زمینی؛ بررسی حساسیت به مغزها و بادام زمینی.',
      'Contains peanut (arachis) oil; check for nut allergies': 'حاوی روغن بادام زمینی؛ بررسی حساسیت به مغزها و بادام زمینی',
      'Effervescent action softens and disperses wax.': 'عملکرد جوشان و حباب‌زا جرم گوش را نرم و حل می‌کند.',
      'Effervescent action softens and disperses wax': 'عملکرد جوشان و حباب‌زا جرم گوش را نرم و حل می‌کند',
      '1 Fingertip Unit (FTU = ~500mg) covers an area of 2 adult hand palms.': 'یک واحد بند انگشت (FTU حدود ۵۰۰ میلی‌گرم) ناحیه‌ای به اندازه ۲ کف دست بزرگسال را پوشش می‌دهد.',
      'Moderately potent topical corticosteroid.': 'کورتیکواستروئید موضعی با قدرت متوسط.',
      'Moderately potent topical corticosteroid': 'کورتیکواستروئید موضعی با قدرت متوسط',
      'Separate from other oral medications by at least 2 hours. Liquid forms are faster than tablets.': 'حداقل ۲ ساعت با سایر داروهای خوراکی فاصله داده شود. فرم مایع سریع‌تر از قرص اثر می‌کند.',
      'Onset: 30-60 minutes.': 'شروع اثر: ۳۰ تا ۶۰ دقیقه.',
      'Onset: 30-60 minutes': 'شروع اثر: ۳۰ تا ۶۰ دقیقه',
      'Onset: ~30 minutes.': 'شروع اثر: حدود ۳۰ دقیقه.',
      'Onset: ~30 minutes': 'شروع اثر: حدود ۳۰ دقیقه',
      'Onset: 1-3 days.': 'شروع اثر: ۱ تا ۳ روز.',
      'Onset: 1-3 days': 'شروع اثر: ۱ تا ۳ روز',
      'For frequent symptoms (>=2 days/week). Maximum 14 days OTC treatment.': 'برای علائم مکرر (۲ روز یا بیشتر در هفته). حداکثر ۱۴ روز درمان بدون نسخه.',
      'Steroid reduces swelling; Local anaesthetic relieves pain/pruritus. Limit to <7 days to prevent skin atrophy/sensitisation.': 'استروئید تورم را کاهش می‌دهد؛ بی‌حس‌کننده درد/خارش را تسکین می‌دهد. حداکثر ۷ روز جهت پیشگیری از نازکی پوست.',
      'Steroid reduces swelling': 'استروئید تورم و التهاب را کاهش می‌دهد',
      'Local anaesthetic relieves pain/pruritus': 'بی‌حس‌کننده موضعی درد و خارش را تسکین می‌دهد',
      'Limit to <7 days to prevent skin atrophy/sensitisation': 'حداکثر ۷ روز جهت پیشگیری از نازکی و حساسیت پوست',
      'Zinc oxide acts as astringent to reduce bleeding; Peru balsam acts as mild antiseptic.': 'زینک اکساید به عنوان قابض خونریزی را کاهش می‌دهد؛ بالسام پرو اثر ضدعفونی‌کننده ملایم دارد.',
      'Zinc oxide acts as astringent to reduce bleeding': 'زینک اکساید به عنوان قابض خونریزی را کاهش می‌دهد',
      'Peru balsam acts as mild antiseptic': 'بالسام پرو اثر ضدعفونی‌کننده ملایم دارد',
      'Cetirizine is slightly more sedating than fexofenadine/loratadine. Stop 4 days before skin-prick testing.': 'ستیریزین کمی خواب‌آورتر از فکسوفنادین/لوراتادین است. ۴ روز قبل از تست حساسیت پوستی قطع شود.',
      'First-line therapy for moderate-to-severe allergic rhinitis. Optimum onset requires several days of regular use.': 'خط اول در رینیت آلرژیک متوسط تا شدید. شروع اثر مطلوب نیازمند چند روز مصرف مداوم است.',
      'Ketotifen has mast-cell stabilising properties.': 'کتوتیفن دارای خاصیت تثبیت‌کنندگی ماست‌سل‌ها است.',
      'Ketotifen has mast-cell stabilising properties': 'کتوتیفن دارای خاصیت تثبیت‌کنندگی ماست‌سل‌ها است',
      'Preferred in pregnancy/breastfeeding. Repeat at Day 7 kills newly hatched lice before they lay eggs.': 'در بارداری و شیردهی ارجح است. تکرار در روز هفتم شپش‌های تازه‌متولدشده را قبل از تخم‌گذاری از بین می‌برد.',
      'Strong odor. Do not use hairdryer after application (heat inactives drug).': 'بوی تند دارد. پس از استعمال از سشوار استفاده نشود (حرارت دارو را بی‌اثر می‌کند).',
      'Physical pediculicides have zero chemical resistance risk.': 'داروهای فیزیکی کشنده شپش هیچ‌گونه ریسک مقاومت دارویی شیمیایی ندارند.',
      'More effective than antihistamines. Anticholinergic side effects (dry mouth, blurred vision, drowsiness).': 'موثرتر از آنتی‌هیستامین‌ها. دارای عوارض آنتی‌کولینرژیک (خشکی دهان، تاری دید، خواب‌آلودگی).',
      'Dual-action combination for superior efficacy; caffeine reduces drowsiness.': 'ترکیب دوگانه برای اثربخشی بیشتر؛ کافئین خواب‌آلودگی را کاهش می‌دهد.',
      'Marked sedation; warning CAL 1.': 'خواب‌آلودگی شدید؛ برچسب هشدار خواب‌آلودگی CAL 1.',
      'Marked sedation; warning CAL 1': 'خواب‌آلودگی شدید؛ برچسب هشدار خواب‌آلودگی CAL 1',
      "Theoretical risk of Reye's syndrome with excessive dosage in viral illness.": "ریسک تئوریک سندرم ری در مصرف دوزهای بالا در بیماری‌های ویروسی کودکان.",
      "Theoretical risk of Reye's syndrome with excessive dosage in viral illness": "ریسک تئوریک سندرم ری در مصرف دوزهای بالا در بیماری‌های ویروسی کودکان",
      'Lidocaine provides local anaesthesia; Tannic acid acts as astringent; Salicylic acid/alcohol provides antibacterial action.': 'لیدوکائین بی‌حسی موضعی؛ تانیک اسید اثر قابض؛ و اسید سالیسیلیک/الکل اثر ضدباکتری ایجاد می‌کنند.',
      'Lidocaine provides local anaesthesia': 'لیدوکائین بی‌حسی موضعی ایجاد می‌کند',
      'Tannic acid acts as astringent': 'تانیک اسید اثر قابض دارد',
      'Salicylic acid/alcohol provides antibacterial action': 'سالیسیلیک اسید و الکل اثر ضدباکتری ایجاد می‌کنند',
      'Potent anti-inflammatory paste adheres to wet oral mucosa.': 'خمیر ضدالتهاب قوی که به مخاط مرطوب دهان می‌چسبد.',
      'Potent anti-inflammatory paste adheres to wet oral mucosa': 'خمیر ضدالتهاب قوی که به مخاط مرطوب دهان می‌چسبد',
      'Sudocrem provides soothing barrier; Dimethicone provides water-repellent barrier.': 'سودوکرم سد محافظ تسکین‌دهنده و دایمتیکون سد محافظ ضدآب ایجاد می‌کند.',
      'Sudocrem provides soothing barrier': 'سودوکرم سد محافظ تسکین‌دهنده ایجاد می‌کند',
      'Dimethicone provides water-repellent barrier': 'دایمتیکون سد محافظ ضدآب در برابر رطوبت ایجاد می‌کند',
      'Short-term use only for marked erythema and distress.': 'فقط برای مصرف کوتاه‌مدت در قرمزی شدید و بی‌قراری کودک.',
      'Short-term use only for marked erythema and distress': 'فقط برای مصرف کوتاه‌مدت در قرمزی شدید و بی‌قراری کودک',
      'First-line when candidal superinfection is present (bright beefy red with satellite pustules).': 'خط اول در صورت عفونت قارچی کاندیدایی همزمان (قرمزی گوشتی با جوش‌های اقماری).',
      'STRICT WARNING: Do not exceed 3-5 days due to severe risk of Rhinitis Medicamentosa (rebound congestion).': 'هشدار جدی: بیش از ۳ تا ۵ روز مصرف نشود به دلیل خطر احتقان بازگشتی شدید (رینیت مدیکامنتوزا).',
      'Caution in hypertension, hyperthyroidism, glaucoma, diabetes, prostate enlargement, or MAOIs.': 'احتیاط در فشار خون بالا، پرکاری تیروئید، گلوکوم، دیابت، بزرگی پروستات یا مصرف MAOIها.',
      'Caution in hypertension, hyperthyroidism, glaucoma, diabetes, prostate enlargement, or MAOIs': 'احتیاط در فشار خون بالا، پرکاری تیروئید، گلوکوم، دیابت، بزرگی پروستات یا مصرف MAOIها',
      'Highly effective for watery rhinorrhoea.': 'بسیار موثر برای آبریزش بینی شدید و شفاف.',
      'Highly effective for watery rhinorrhoea': 'بسیار موثر برای آبریزش بینی شدید و شفاف',
      'First-line analgesic. Negligible anti-inflammatory effect. Onset: ~30 minutes.': 'مسکن خط اول. اثر ضدالتهابی ناچیز. شروع اثر حدود ۳۰ دقیقه.',
      'First-line analgesic': 'مسکن خط اول',
      'Negligible anti-inflammatory effect': 'اثر ضدالتهابی ناچیز',
      'Take with food. Caution in asthma, renal impairment, peptic ulcers, heart failure, or anticoagulants.': 'همراه با غذا مصرف شود. احتیاط در آسم، نارسایی کلیه، زخم معده، نارسایی قلبی یا داروهای ضدانعقاد.',
      'Take with food': 'همراه با غذا میل شود',
      'Take with plenty of fluid. Onset: 1-3 days.': 'همراه با مایعات فراوان مصرف شود. شروع اثر: ۱ تا ۳ روز.',
      'Take with plenty of fluid': 'همراه با مایعات فراوان مصرف شود',
      "STRICT CONTRAINDICATION in children <16 years due to fatal Reye's Syndrome.": "ممنوعیت مطلق در کودکان زیر ۱۶ سال به دلیل خطر مرگبار سندرم ری (Reye).",
      "STRICT CONTRAINDICATION in children <16 years due to fatal Reye's Syndrome": "ممنوعیت مطلق در کودکان زیر ۱۶ سال به دلیل خطر مرگبار سندرم ری (Reye)",
      'In children <2yo, elderly, or immunocompromised, also apply to scalp, neck, face, and ears.': 'در کودکان زیر ۲ سال، سالمندان یا نقص ایمنی روی پوست سر، گردن، صورت و گوش‌ها نیز مالیده شود.',
      'Stings on application; dilute with water for paediatric use.': 'هنگام مصرف سوزش دارد؛ برای اطفال با آب رقیق شود.',
      'Stings on application': 'هنگام مصرف سوزش دارد',
      'dilute with water for paediatric use': 'برای اطفال با آب رقیق شود',
      'Leave lather on scalp for 3-5 minutes before rinsing.': 'کف شامپو ۳ تا ۵ دقیقه قبل از آبکشی روی سر بماند.',
      'Leave lather on scalp for 3-5 minutes before rinsing': 'کف شامپو ۳ تا ۵ دقیقه قبل از آبکشی روی سر بماند',
      'Rinse thoroughly to prevent hair discoloration.': 'کاملاً آبکشی شود تا از تغییر رنگ موها جلوگیری گردد.',
      'Rinse thoroughly to prevent hair discoloration': 'کاملاً آبکشی شود تا از تغییر رنگ موها جلوگیری گردد',
      'Coal tar reduces scaling and cell turnover.': 'کول تار پوسته‌ریزی و تکثیر سلول‌های پوستی را کاهش می‌دهد.',
      'Coal tar reduces scaling and cell turnover': 'کول تار پوسته‌ریزی و تکثیر سلول‌های پوستی را کاهش می‌دهد',
      'First-line baseline analgesia.': 'مسکن پایه و خط اول کنترل درد.',
      'First-line baseline analgesia': 'مسکن پایه و خط اول کنترل درد',
      'For Post-Herpetic Neuralgia ONLY after all active blisters have fully healed. Wash hands thoroughly.': 'برای نورالژی پس از زونا فقط پس از بهبود کامل تاول‌های فعال. دست‌ها کاملاً شسته شوند.',
      'Keep in fridge for extra soothing effect.': 'برای اثر التیام‌بخش بیشتر در یخچال نگهداری شود.',
      'Keep in fridge for extra soothing effect': 'برای اثر التیام‌بخش بیشتر در یخچال نگهداری شود',
      'Apply to clean, dry, hairless skin on upper body/arm; rotate site daily. Dispose folded safely.': 'روی پوست تمیز، خشک و بدون مو در بالاتنه/بازو چسبانده شود؛ محل چسباندن روزانه تغییر کند.',
      'Combination therapy (Patch + fast-acting Gum/Spray) provides highest cessation success rates.': 'درمان ترکیبی (پچ + آدامس/اسپری سریع‌الاثر) بیشترین نرخ موفقیت ترک سیگار را دارد.',
      'Avoid in thyroid disorders.': 'در اختلالات تیروئید پرهیز شود.',
      'Avoid in thyroid disorders': 'در اختلالات تیروئید پرهیز شود',
      'Benzydamine provides NSAID-like local anti-inflammatory action; Lignocaine numbs pain.': 'بنزیدامین اثر ضدالتهابی موضعی دارد؛ لیگنوکائین درد را بی‌حس می‌کند.',
      'Benzydamine provides NSAID-like local anti-inflammatory action': 'بنزیدامین اثر ضدالتهابی موضعی مشابه مسکن‌ها دارد',
      'Lignocaine numbs pain': 'لیگنوکائین درد را بی‌حس و تسکین می‌دهد',
      'Soothes irritated pharyngeal mucosa.': 'مخاط تحریک‌شده حلق را التیام می‌بخشد.',
      'Soothes irritated pharyngeal mucosa': 'مخاط تحریک‌شده حلق را التیام می‌بخشد',
      'Sedating antihistamine (Phenergan) can be used at night for severe itch.': 'آنتی‌هیستامین خواب‌آور (فنرگان) شب‌ها برای خارش شدید قابل استفاده است.',
      'Immediate emergency intervention.': 'مداخله اورژانسی و فوری.',
      'Immediate emergency intervention': 'مداخله اورژانسی و فوری',
      'Topical antibacterials are usually NOT indicated for simple external styes.': 'آنتی‌باکتریال‌های موضعی معمولاً برای گل‌مژه ساده خارجی لزومی ندارند.',
      'Acetic acid restores acidic pH (antimicrobial); Isopropyl alcohol dries moisture. CONTRAINDICATED IF EARDRUM IS PERFORATED.': 'استیک اسید پی‌اچ اسیدی را بازمی‌گرداند؛ ایزوپروپیل الکل رطوبت را خشک می‌کند. در پارگی پرده گوش ممنوع است.',
      'Do not exceed recommended dose.': 'از دوز مجاز تجاوز نشود.',
      'Do not exceed recommended dose': 'از دوز مجاز تجاوز نشود',
      'For sleep disruption and distress.': 'برای تسکین بی‌قراری و اختلال خواب کودک.',
      'For sleep disruption and distress': 'برای تسکین بی‌قراری و اختلال خواب کودک',
      'Hold in mouth as long as possible before swallowing. Administer after feeds.': 'تا حد امکان پیش از بلعیدن در دهان نگه داشته شود. پس از شیردهی تجویز گردد.',
      'Potent inhibitor of CYP2C9; major interaction with Warfarin.': 'مهارکننده قوی آنزیم CYP2C9؛ تداخل دارویی شدید با وارفارین.',
      'Weakens latex condoms and diaphragms. Continue during menstruation.': 'کاندوم‌ها و دیافراگم‌های لاتکس را تضعیف می‌کند. در دوران قاعدگی درمان ادامه یابد.',
      'Virtual non-toxic and well-tolerated.': 'عملاً فاقد سمیت و بسیار خوش‌تحمل.',
      'Convenient oral alternative when topical therapy fails.': 'جایگزین خوراکی مناسب در صورت عدم موفقیت درمان موضعی.',
      'Fungicidal mechanism; shorter treatment duration and lower relapse rates than azoles.': 'مکانیسم قارچ‌کشی (Fungicidal)؛ دوره درمانی کوتاه‌تر و نرخ عود کمتر.',
      'Fungistatic; requires prolonged course.': 'مکانیسم مهار رشد قارچ (Fungistatic)؛ نیازمند دوره درمانی طولانی‌تر.',
      'Convenient for large trunk body surface area.': 'فرمولاسیون فوم برای پوشش سطوح بزرگ تنه بسیار مناسب است.',
      'Active against Malassezia yeast.': 'فعال علیه مخمر مالاسزیا.',
      'Active against Malassezia yeast': 'فعال علیه مخمر مالاسزیا',
      'Inhibits Malassezia proliferation.': 'از تکثیر مخمر مالاسزیا جلوگیری می‌کند.',
      'Inhibits Malassezia proliferation': 'از تکثیر مخمر مالاسزیا جلوگیری می‌کند',
      'Symptomatic dysuria relief only; DOES NOT TREAT BACTERIAL INFECTION. High sodium content (caution in hypertension/heart failure/renal disease). Reduces efficacy of Hiprex.': 'صرفاً تسکین علامتی سوزش ادرار؛ عفونت باکتریایی را درمان نمی‌کند. سدیم بالا (احتیاط در فشار خون/نارسایی قلبی/کلیوی). اثر هیپرکس را کاهش می‌دهد.',
      'For UTI PROPHYLAXIS ONLY (not acute treatment). Requires acidic urine pH <5.5 to release formaldehyde. DO NOT COMBINE WITH URAL.': 'فقط برای پیشگیری از عود عفونت ادراری (نه درمان حاد). نیازمند pH اسیدی ادرار کمتر از ۵.۵ برای آزادسازی فرمالدئید. با اورال مصرف نشود.',
      'Soak in warm water for 5 min, pare down with pumice stone, protect healthy skin with petroleum jelly, apply to wart and cover with plaster.': '۵ دقیقه در آب گرم بخیسانید، با سنگ پا بسایید، پوست سالم را با وازلین بپوشانید، دارو را روی زگیل بمالید و با چسب ببندید.',
      'Soak in warm water for 5 min, rub with pumice stone, protect surrounding skin with petroleum jelly, apply to lesion only.': '۵ دقیقه در آب گرم بخیسانید، با سنگ پا بسایید، پوست سالم را با وازلین بپوشانید و دارو را فقط روی ضایعه بمالید.',
      'Freezes core of wart.': 'هسته مرکزی زگیل را منجمد می‌کند.',
      'Freezes core of wart': 'هسته مرکزی زگیل را منجمد می‌کند',
      'Single 100mg dose regardless of weight/age. Repeat at 2 weeks is essential to kill worms hatched from surviving eggs.': 'تک دوز ۱۰۰ میلی‌گرم بدون وابستگی به وزن/سن. تکرار پس از ۲ هفته برای کشتن کرم‌های حاصل از تخم‌های باقیمانده الزامی است.',
      'Weight-based dosing. Repeat after 2 weeks.': 'دوزبندی بر اساس وزن بیمار. تکرار پس از ۲ هفته.',
      'Weight-based dosing': 'دوزبندی بر اساس وزن بیمار',
      'Repeat after 2 weeks': 'تکرار پس از ۲ هفته',
      'Apply at tingling/erythema stage before blisters appear.': 'در مرحله سوزن‌سوزن شدن و قرمزی اولیه پیش از بروز تاول‌ها مالیده شود.',
      'Do not use under occlusive dressings or on broken skin.': 'زیر پانسمان بسته یا روی پوست بریده و زخمی مصرف نشود.',
      'Do not use under occlusive dressings or on broken skin': 'زیر پانسمان بسته یا روی پوست بریده و زخمی مصرف نشود',
      'Avoid contact with eyes and inside mouth.': 'از تماس با چشم‌ها و داخل دهان خودداری شود.',
      'Avoid contact with eyes and inside mouth': 'از تماس با چشم‌ها و داخل دهان خودداری شود',
      'Store unopened drops in fridge (2-8°C). Discard 28 days after opening. Not active against Pseudomonas.': 'قطره بازنشده در یخچال (۲ تا ۸ درجه) نگهداری شود. ۲۸ روز پس از باز شدن دور ریخته شود. بر سودوموناس بی‌اثر است.',
      'Indicated for mild bacterial conjunctivitis.': 'اندیکاسیون برای ورم ملتحمه باکتریایی خفیف.',
      'Indicated for mild bacterial conjunctivitis': 'اندیکاسیون برای ورم ملتحمه باکتریایی خفیف',
      'Very sweet taste; can mix with fruit juice or milk. Contraindicated in galactosaemia and obstruction.': 'طعم بسیار شیرین؛ قابل مخلوط با آبمیوه یا شیر. در گالاکتوزمی و انسداد روده ممنوع است.',
      'Contains electrolytes. Do not stop abruptly in chronic constipation; withdraw gradually over 2-4 weeks.': 'حاوی الکترولیت‌ها. در یبوست مزمن ناگهانی قطع نشود؛ طی ۲ تا ۴ هفته به تدریج قطع گردد.',
      'Fast relief. Push narrow end first; hold for a few minutes to allow dissolution.': 'تسکین سریع. سر باریک شیاف اول وارد شود؛ چند دقیقه نگه داشته تا حل شود.',
      'First-line oral analgesic for mild-to-moderate musculoskeletal discomfort.': 'مسکن خوراکی خط اول برای دردهای خفیف تا متوسط عضلانی‌اسکلتی.',
      'First-line oral analgesic for mild-to-moderate musculoskeletal discomfort': 'مسکن خوراکی خط اول برای دردهای خفیف تا متوسط عضلانی‌اسکلتی'
    };

    if (phrases[trimmed]) {
      return phrases[trimmed];
    }

    // Try segment split by ';'
    if (trimmed.includes(';')) {
      const parts = trimmed.split(';').map((p) => p.trim());
      const translatedParts = parts.map((p) => phrases[p] || phrases[p.replace(/\.$/, '')] || translateMedicineAttribute(p, 'extra'));
      return translatedParts.join('؛ ');
    }

    // Direct match without period
    const noDot = trimmed.replace(/\.$/, '');
    if (phrases[noDot]) {
      return phrases[noDot];
    }
  }

  return trimmed;
}

/**
 * Translate general clinical non-pharmacological advice & instructions to Persian
 */
export function translateClinicalText(text: string | undefined): string {
  if (!text) return '';
  const trimmed = text.trim();
  
  const map: Record<string, string> = {
    'Soak affected areas in warm (NOT hot) water to improve circulation.': 'نواحی درگیر را در آب گرم (نه داغ) قرار دهید تا گردش خون بهبود یابد.',
    'Avoid rapid changes in temperature.': 'از تغییرات ناگهانی و شوک دمایی پرهیز کنید.',
    'Wear warm socks, gloves, and avoid tight-fitting footwear.': 'جوراب‌ها و دستکش‌های گرم بپوشید و از پوشیدن کفش‌های تنگ خودداری کنید.',
    'Apply moisturisers containing lanolin or paraffin to retain heat.': 'از مرطوب‌کننده‌های حاوی لانولین یا پارافین جهت حفظ گرمای بافتی استفاده کنید.',
    'Rest, increase fluid intake, and take lukewarm baths.': 'استراحت کنید، مصرف مایعات را افزایش دهید و حمام با آب ولرم بگیرید.',
    'Keep nails trimmed short; put cotton mittens on babies to prevent scratching.': 'ناخن‌ها را کوتاه نگه دارید؛ برای نوزادان دستکش نخی بپوشانید تا از خاراندن جلوگیری شود.',
    'First aid: 20 minutes under cool running tap water.': 'کمک‌های اولیه: ۲۰ دقیقه زیر آب خنک روان شیر آب بگیرید.',
    'Drink plenty of water to rehydrate.': 'آب فراوان بنوشید تا آب بدن تامین شود.',
    'Wash hands thoroughly after touching cold sore to reduce transmission and prevent eye infection.': 'پس از لمس تبخال دست‌ها را با آب و صابون بشویید تا از انتقال به چشم جلوگیری شود.',
    'Avoid kissing, sharing cutleries, cups, or lip balms.': 'از بوسیدن و استفاده مشترک از قاشق، لیوان یا بالم لب خودداری کنید.',
    'Never pad or cover a discharging eye.': 'هرگز روی چشمی که ترشح دارد پد یا پانسمان نبندید.',
    'Increase fluid intake (water) and dietary fibre.': 'مصرف مایعات (آب) و فیبر غذایی را افزایش دهید.',
    'Increase daily physical exercise.': 'فعالیت بدنی و ورزش روزانه را افزایش دهید.',
    'Rest and increase fluid intake.': 'استراحت کنید و مصرف مایعات را افزایش دهید.',
    'Discourage smoking and encourage removal of sputum.': 'از کشیدن سیگار پرهیز کنید و خروج خلط را تسهیل نمایید.',
    'Demulcent lozenges to soothe throat tickle.': 'از آب‌نبات‌های مکیدنی التیام‌بخش برای تسکین سوزش گلو استفاده کنید.',
    'Blink frequently; take regular screen breaks (20-20-20 rule).': 'مرتب پلک بزنید و طبق قانون ۲۰-۲۰-۲۰ به چشمان خود استراحت دهید.',
    'Avoid air-conditioning, direct fans, and windy environments.': 'از باد مستقیم کولر، پنکه و محیط‌های بادخیز دوری کنید.',
    'Sip water frequently throughout the day.': 'طول روز جرعه‌جرعه آب بنوشید.',
    'Chew sugar-free gum to stimulate natural salivary flow.': 'برای تحریک ترشح بزاق آدامس فاقد قند بجوید.',
    'Never insert cotton buds (Q-tips), matchsticks, or ear candles into the canal.': 'هرگز گوش‌پاک‌کن، چوب کبریت یا شمع گوش وارد مجرای گوش نکنید.',
    'Limit cleaning to wiping the outer ear only.': 'تمیز کردن گوش را فقط به پاک کردن لاله و دهانه بیرونی گوش محدود کنید.',
    'Eat smaller, more frequent meals; avoid lying down within 2-3 hours of eating.': 'وعده‌های غذایی کم‌حجم و مکرر میل کنید؛ تا ۲ الی ۳ ساعت بعد از غذا دراز نکشید.',
    'Avoid dietary triggers: fatty, spicy foods, caffeine, chocolate, alcohol.': 'از محرک‌های غذایی: غذاهای چرب، تند، کافئین، شکلات و الکل پرهیز کنید.',
    'Avoid prolonged straining during defecation.': 'از زور زدن طولانی‌مدت هنگام اجابت مزاج خودداری کنید.',
    'Manage underlying constipation: increase water, dietary fibre, exercise.': 'یبوست زمینه‌ای را با مصرف آب، فیبر و ورزش کنترل نمایید.',
    'Minimise outdoor exposure during high pollen counts/windy days.': 'در روزهای پرگرده و بادخیز از خروج غیرضروری از منزل خودداری کنید.',
    'Wear wraparound sunglasses and masks outdoors.': 'در فضای باز از عینک آفتابی محافظ و ماسک استفاده کنید.',
    'Allow frequent nappy-free periods (air drying).': 'اجازه دهید در طول روز پوست نوزاد برای مدتی بدون پوشک در معرض هوا خشک شود.',
    'Change wet/soiled nappies frequently.': 'پوشک‌های مرطوب و آلوده را سریعاً تعویض نمایید.',
    'Saline nasal sprays or sinus douches (Fess/Flo).': 'از اسپری‌های سالین یا شستشوی سینوس استفاده کنید.',
    'Steam inhalation and adequate hydration.': 'بخور آب گرم و تامین آب کافی بدن را رعایت کنید.',
    'Drink plenty of water (2-3L/day) to flush out bacteria.': 'برای شستشوی باکتری‌ها روزانه ۲ تا ۳ لیتر آب بنوشید.',
    'Wipe from front to back; empty bladder immediately after intercourse.': 'شستشو از جلو به عقب انجام شود؛ مثانه را بلافاصله پس از نزدیکی تخلیه کنید.',
    'Dry thoroughly between toes after showering.': 'پس از حمام لای انگشتان پا را کاملاً خشک کنید.',
    'Wear thongs in public showers, gyms, and pool areas.': 'در استخرها، باشگاه‌ها و دوش‌های عمومی صندل بپوشید.'
  };

  if (map[trimmed]) return map[trimmed];
  const noDot = trimmed.replace(/\.$/, '');
  if (map[noDot]) return map[noDot];

  return trimmed;
}

/**
 * Universal Lookup Helper for Disease Translations & Structured Data
 */
export function getOtcClinicalTranslation(diseaseIdOrCondition: string): DiseaseClinicalTranslation | null {
  if (!diseaseIdOrCondition) return null;
  const key = diseaseIdOrCondition.toLowerCase().replace(/^(dis-|otc-)/, '').replace(/[^a-z0-9_]/g, '_');
  
  if (OTC_CLINICAL_TRANSLATIONS[key]) {
    return OTC_CLINICAL_TRANSLATIONS[key];
  }
  
  // Fuzzy match on keys
  for (const k of Object.keys(OTC_CLINICAL_TRANSLATIONS)) {
    if (key.includes(k) || k.includes(key)) {
      return OTC_CLINICAL_TRANSLATIONS[k];
    }
  }
  
  return null;
}


