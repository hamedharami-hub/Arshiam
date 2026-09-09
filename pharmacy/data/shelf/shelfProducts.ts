import { Product } from '@/types/shelf';

export const SHELF_PRODUCTS: Product[] = [
  // CAT 1: Primary Care & OTC
  // -------------------------------------------------------------
  // sub-1-1: Analgesics & Antipyretics (ضد درد و تب)
  // -------------------------------------------------------------
  {
    id: 'prod-panadol-500',
    brandName: 'Panadol 500mg',
    genericName: 'Paracetamol',
    activeIngredients: 'Paracetamol 500mg per tablet',
    packSize: '20 Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Panamax', 'Dymadon', 'Chemist Own Paracetamol'],
    calLabels: ['CAL-A', 'CAL-12'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'داروی ضددرد و تب‌بر انتخابی و کاملاً ایمن در تمام مراحل بارداری و شیردهی در دوزهای مجاز.',
      en: 'Analgesic and antipyretic of choice in all trimesters of pregnancy and during breastfeeding at recommended doses.',
    },
    indications: {
      en: 'Temporary relief of pain and fever in headaches, tension headaches, toothache, arthritis, and cold & flu symptoms.',
      fa: 'تسکین موقت درد و تب در سردرد، دندان‌درد، آرتروز و علائم سرماخوردگی و آنفلوآنزا.',
    },
    counselingPoints: [
      {
        en: 'Adult dose: 1-2 tablets every 4-6 hours as required (maximum 8 tablets / 4000mg in 24 hours).',
        fa: 'دوز بزرگسالان: ۱ تا ۲ قرص هر ۴ تا ۶ ساعت در صورت نیاز (حداکثر ۸ قرص یا ۴۰۰۰ میلی‌گرم در ۲۴ ساعت).',
      },
      {
        en: 'Check other cough, cold, or sinus products to prevent accidental paracetamol overdose.',
        fa: 'سایر داروهای سرماخوردگی و ضدسرفه همزمان را بررسی کنید تا از مسمومیت ناخواسته با پاراستامول جلوگیری شود.',
      },
    ],
  },
  {
    id: 'prod-panadol-osteo',
    brandName: 'Panadol Osteo 665mg',
    genericName: 'Paracetamol (Modified Release)',
    activeIngredients: 'Paracetamol 665mg modified release tablet',
    packSize: '96 Modified Release Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['OsteoMol 665', 'Chemist Own Osteo Relief'],
    calLabels: ['CAL-A', 'CAL-6', 'CAL-12'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'داروی ایمن در بارداری؛ قرص‌ها باید کامل بلعیده شوند و خرد نشوند.',
      en: 'Safe in pregnancy; tablets must be swallowed whole and not crushed.',
    },
    indications: {
      en: 'Persistent pain associated with osteoarthritis and musculoskeletal conditions.',
      fa: 'تسکین دردهای پایدار و مداوم ناشی از استئوآرتریت و آرتروز مفاصل.',
    },
    counselingPoints: [
      {
        en: 'Dose: 2 tablets swallowed whole three times a day, every 6-8 hours (maximum 6 tablets daily). Do not crush.',
        fa: 'دوز: ۲ قرص ۳ بار در روز (هر ۶ تا ۸ ساعت)، به صورت کامل بلعیده شود و جویده یا خرد نشود (حداکثر ۶ قرص روزانه).',
      },
    ],
  },
  {
    id: 'prod-nurofen-200',
    brandName: 'Nurofen 200mg',
    genericName: 'Ibuprofen',
    activeIngredients: 'Ibuprofen 200mg per capsule',
    packSize: '24 Liquid Capsules',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Advil', 'Rafan', 'Chemist Own Ibuprofen'],
    calLabels: ['CAL-A', 'CAL-12'],
    tgaPregnancyCategory: 'C',
    pregnancyAdvice: {
      fa: 'در سه‌ماهه اول و دوم با احتیاط؛ در سه‌ماهه سوم به دلیل خطر بسته شدن زودرس مجرای شریانی جنین (PDA) و اولیگوهیدرآمنیوس اکیداً ممنوع است (Category D).',
      en: 'Avoid in pregnancy; strictly contraindicated in 3rd trimester due to premature closure of fetal ductus arteriosus and oligohydramnios (Category D).',
    },
    indications: {
      en: 'Relief of mild to moderate pain, inflammation, headache, dental pain, backache, and dysmenorrhea.',
      fa: 'کاهش درد و التهاب خفیف تا متوسط، سردرد، دندان‌درد، کمردرد، دردهای عضلانی و دیسمنوره.',
    },
    counselingPoints: [
      {
        en: 'Take with food or milk to minimize gastrointestinal discomfort.',
        fa: 'همراه با غذا یا یک لیوان شیر مصرف شود تا عوارض گوارشی به حداقل برسد.',
      },
      {
        en: 'Caution in patients with active GI ulcers, renal impairment, heart failure, or asthma.',
        fa: 'در بیماران مبتلا به زخم فعال گوارشی، نارسایی کلیه، نارسایی قلبی و آسم احتیاط شود.',
      },
    ],
  },
  {
    id: 'prod-voltaren-rapid-25',
    brandName: 'Voltaren Rapid 25',
    genericName: 'Diclofenac Potassium',
    activeIngredients: 'Diclofenac potassium 25mg tablet',
    packSize: '30 Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Diclofenac Sandoz', 'Chemist Own Diclofenac'],
    calLabels: ['CAL-A', 'CAL-12'],
    tgaPregnancyCategory: 'C',
    pregnancyAdvice: {
      fa: 'منع مصرف در سه‌ماهه سوم بارداری (خطر مهار انقباضات رحمی، تاخیر زایمان و عوارض قلبی-عروقی جنین).',
      en: 'Contraindicated in 3rd trimester of pregnancy (risk of ductus arteriosus closure, prolonged labour and renal dysfunction).',
    },
    indications: {
      en: 'Short-term treatment of acute painful inflammatory conditions such as dental pain, sprains, and dysmenorrhea.',
      fa: 'درمان کوتاه‌مدت دردهای حاد التهابی، کشیدگی تاندون، دندان‌درد حاد و دردهای قاعدگی.',
    },
    counselingPoints: [
      {
        en: 'Initial dose 50mg, then 25-50mg every 8 hours if needed (maximum 150mg daily). Take with food.',
        fa: 'دوز شروع ۵۰ میلی‌گرم، سپس در صورت نیاز ۲۵ الی ۵۰ میلی‌گرم هر ۸ ساعت همراه با غذا.',
      },
    ],
  },
  {
    id: 'prod-nuromol-tablets',
    brandName: 'Nuromol Tablets',
    genericName: 'Paracetamol + Ibuprofen',
    activeIngredients: 'Paracetamol 500mg + Ibuprofen 200mg',
    packSize: '24 Tablets',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A', 'CAL-C', 'CAL-12'],
    tgaPregnancyCategory: 'C',
    pregnancyAdvice: {
      fa: 'به دلیل وجود جزء ایبوپروفن، در سه‌ماهه سوم بارداری اکیداً ممنوع است.',
      en: 'Strictly contraindicated in the 3rd trimester of pregnancy due to the ibuprofen component.',
    },
    indications: {
      en: 'Strong, synergistic relief of acute pain not responding to single active ingredient alone (dental, migraine).',
      fa: 'تسکین هم‌افزا و قوی دردهای حاد پس از دندانپزشکی، میگرن و دردهای اسکلتی-عضلانی شدید.',
    },
    counselingPoints: [
      {
        en: '1 tablet (max 2) up to three times daily with meals. Do not take other paracetamol or NSAID products simultaneously.',
        fa: '۱ قرص (حداکثر ۲ قرص) تا ۳ بار در روز همراه با غذا؛ مصرف همزمان سایر فراورده‌های پاراستامول یا NSAID ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-aspirin-300',
    brandName: 'Aspro Clear 300mg',
    genericName: 'Aspirin (Soluble / Effervescent)',
    activeIngredients: 'Aspirin 300mg effervescent tablet',
    packSize: '24 Soluble Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-7', 'CAL-A', 'CAL-12'],
    tgaPregnancyCategory: 'C',
    pregnancyAdvice: {
      fa: 'دوزهای کامل ضددرد در سه‌ماهه سوم اکیداً ممنوع است (خطر خونریزی مادر و نوزاد و بسته شدن زودرس مجرای شریانی).',
      en: 'Avoid full analgesic doses in pregnancy; strictly contraindicated in 3rd trimester (maternal/neonatal bleeding risk).',
    },
    indications: {
      en: 'Relief of headache, sore throat, toothache, and fever in adults.',
      fa: 'تسکین سریع سردرد، گلودرد، دندان‌درد و تب در بزرگسالان.',
    },
    counselingPoints: [
      {
        en: 'Dissolve in a glass of water and drink after food. Strictly contraindicated in children under 16 years (Reye syndrome).',
        fa: 'در آب حل شده و پس از غذا میل شود. در افراد زیر ۱۶ سال به دلیل خطر سندرم ری (Reye) اکیداً ممنوع است.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-2: Antifungals & Anthelmintics (داروهای ضد قارچ و ضد انگل)
  // -------------------------------------------------------------
  {
    id: 'prod-diflucan-150',
    brandName: 'Diflucan One 150mg',
    genericName: 'Fluconazole',
    activeIngredients: 'Fluconazole 150mg capsule',
    packSize: '1 Oral Capsule',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Canesten Clotrimazole/Fluconazole', 'Chemist Own Fluconazole'],
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'D',
    pregnancyAdvice: {
      fa: 'رده D در بارداری؛ فلوکونازول خوراکی در بارداری ممنوع است. در کاندیدیاز واژینال بارداری، کلوتریمازول موضعی (Category A) خط اول درمان است.',
      en: 'Category D. Oral fluconazole is contraindicated in pregnancy; use topical clotrimazole (Category A) instead.',
    },
    indications: {
      en: 'Single-dose oral treatment for acute vaginal candidiasis (thrush).',
      fa: 'درمان خوراکی تک‌دوز عفونت قارچی کاندیدیازیس واژینال (برفک).',
    },
    counselingPoints: [
      {
        en: 'Contraindicated in pregnancy; confirm non-pregnant status before supply.',
        fa: 'در دوران بارداری اکیداً ممنوع است؛ بررسی عدم بارداری قبل از تحویل الزامی است.',
      },
      {
        en: 'Potent CYP3A4/CYP2C9 inhibitor: check for interactions with warfarin, statins, and sulfonylureas.',
        fa: 'مهارکننده آنزیمی قوی: پایش تداخل با وارفارین، استاتین‌ها و داروهای ضددیابت خوراکی.',
      },
    ],
  },
  {
    id: 'prod-canesten-cream',
    brandName: 'Canesten Topical Cream 1%',
    genericName: 'Clotrimazole',
    activeIngredients: 'Clotrimazole 10mg/g (1%)',
    packSize: '20g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Clonea', 'Chemist Own Clotrimazole'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'داروی انتخابی و ایمن (Category A) برای درمان عفونت‌های قارچی موضعی در دوران بارداری.',
      en: 'First-line topical antifungal of choice in pregnancy (Category A).',
    },
    indications: {
      en: 'Topical fungal skin infections: tinea pedis (athlete foot), tinea cruris (jock itch), and cutaneous candidiasis.',
      fa: 'عفونت‌های قارچی پوست: تینه‌آ پدیس (پای ورزشکاران)، تینه‌آ کروریس، تینه‌آ کورپوریس و برفک جلدی.',
    },
    counselingPoints: [
      {
        en: 'Apply thinly to affected areas 2-3 times daily and continue for 2 weeks after symptoms resolve to prevent recurrence.',
        fa: '۲ تا ۳ بار در روز مالیده شود و درمان تا ۲ هفته پس از رفع کامل علائم ادامه یابد تا از عود جلوگیری شود.',
      },
    ],
  },
  {
    id: 'prod-lamisil-cream',
    brandName: 'Lamisil Cream 1%',
    genericName: 'Terbinafine Hydrochloride',
    activeIngredients: 'Terbinafine HCl 10mg/g (1%)',
    packSize: '15g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['SolvEasy Tinea', 'Chemist Own Terbinafine'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B1',
    pregnancyAdvice: {
      fa: 'مصرف موضعی با جذب سیستمیک بسیار ناچیز؛ در بارداری با ارزیابی پزشک قابل استفاده است.',
      en: 'Topical application has minimal systemic absorption; use with caution in pregnancy.',
    },
    indications: {
      en: 'Fast fungicidal treatment of athlete foot, jock itch, and ringworm with short 7-day course.',
      fa: 'درمان قارچ‌کش سریع پای ورزشکاران و کچلی با دوره کوتاه ۷ روزه.',
    },
    counselingPoints: [
      {
        en: 'Apply once daily for 1 week for tinea pedis/cruris. Clean and thoroughly dry area before application.',
        fa: 'روزی یک بار به مدت ۱ هفته مصرف شود؛ قبل از مصرف پوست را کاملاً تمیز و خشک نمایید.',
      },
    ],
  },
  {
    id: 'prod-loceryl-nail-lacquer',
    brandName: 'Loceryl Nail Lacquer 5%',
    genericName: 'Amorolfine',
    activeIngredients: 'Amorolfine 5% w/v nail lacquer',
    packSize: '5 mL Bottle with Applicator & Files',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'به دلیل کمبود داده‌های ایمنی، در دوران بارداری و شیردهی توصیه نمی‌شود.',
      en: 'Avoid in pregnancy and lactation due to limited clinical safety data.',
    },
    indications: {
      en: 'Treatment of distal and lateral subungual onychomycosis affecting up to 2 nails without lunula involvement.',
      fa: 'درمان عفونت قارچی ناخن (انیکومایکوزیس) بدون درگیری ریشه ناخن (حداکثر تا ۲ ناخن).',
    },
    counselingPoints: [
      {
        en: 'File infected nail surface, clean with swab, and apply once or twice weekly. Fingers: 6 months, Toes: 9-12 months.',
        fa: 'هفته‌ای ۱ یا ۲ بار پس از سوهان‌کشی و الکل استفاده شود. دوره درمان دست ۶ ماه و پا ۹ تا ۱۲ ماه است.',
      },
    ],
  },
  {
    id: 'prod-combantrin-choc-squares',
    brandName: 'Combantrin Chocolate Squares',
    genericName: 'Pyrantel Embonate',
    activeIngredients: 'Pyrantel embonate equivalent to 100mg pyrantel per square',
    packSize: '24 Chocolate Squares',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'در سه‌ماهه اول بارداری توصیه نمی‌شود؛ رعایت بهداشت دست‌ها و ناخن‌ها خط اول درمان است.',
      en: 'Avoid in 1st trimester; strict hygiene measures are first-line during early pregnancy.',
    },
    indications: {
      en: 'Treatment of threadworm (pinworm) infections in adults and children.',
      fa: 'درمان عفونت‌های ناشی از انگل اکسیور (کرمک یا Pinworm) در کودکان و بزرگسالان.',
    },
    counselingPoints: [
      {
        en: 'Treat all household members at the same time, regardless of whether symptoms are present.',
        fa: 'تمام افراد خانواده باید در یک روز واحد درمان شوند، حتی در صورت عدم وجود علائم.',
      },
      {
        en: 'Repeat the exact dose after 2 to 4 weeks to eradicate newly hatched worms.',
        fa: 'دوز درمان دقیقاً پس از ۲ تا ۴ هفته مجدداً تکرار شود تا کرم‌های تازه‌متولدشده ریشه‌کن شوند.',
      },
    ],
  },
  {
    id: 'prod-vermox-tablets',
    brandName: 'Vermox 100mg Tablets',
    genericName: 'Mebendazole',
    activeIngredients: 'Mebendazole 100mg chewable tablet',
    packSize: '6 Chewable Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Combantrin-1 (Mebendazole)'],
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'در بارداری به ویژه سه‌ماهه اول به دلیل پتانسیل تراتوژنیک در مطالعات حیوانی اکیداً ممنوع است.',
      en: 'Contraindicated in pregnancy, especially 1st trimester (teratogenic in animal studies).',
    },
    indications: {
      en: 'Single-dose treatment of threadworm (Enterobius vermicularis) in adults and children over 2 years.',
      fa: 'درمان تک‌دوز کرمک (اکسیور) و کرم‌های لوله‌ای در بزرگسالان و کودکان بالای ۲ سال.',
    },
    counselingPoints: [
      {
        en: '1 tablet (100mg) single dose for all ages >2 years; repeat dose in 2 weeks. Contraindicated in pregnancy.',
        fa: '۱ قرص جویدنی تک‌دوز برای تمام سنین بالای ۲ سال؛ تکرار الزامی پس از ۲ هفته. در بارداری ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-lyclear-scabies-cream',
    brandName: 'Lyclear Scabies Cream 5%',
    genericName: 'Permethrin',
    activeIngredients: 'Permethrin 5% w/w cream',
    packSize: '30g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'درمان خط اول و ایمن گال (Scabies) در دوران بارداری و شیردهی.',
      en: 'First-line topical treatment for scabies during pregnancy and breastfeeding.',
    },
    indications: {
      en: 'First-line treatment of scabies infestation and crab lice in adults and children over 2 months.',
      fa: 'خط اول درمان گال (اسکابیس) و شپش در بزرگسالان و اطفال بالای ۲ ماه.',
    },
    counselingPoints: [
      {
        en: 'Apply to entire body from neck down (including face/scalp in elderly/infants). Leave on for 8-14 hours before washing off. Repeat in 7 days.',
        fa: 'از گردن به پایین به تمام بدن مالیده شود و ۸ تا ۱۴ ساعت روی پوست بماند سپس شسته شود. تکرار پس از ۷ روز الزامی است.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-3: Eye & Ear Conditions (بیماری‌های چشم و گوش)
  // -------------------------------------------------------------
  {
    id: 'prod-chlorsig-eye-drops',
    brandName: 'Chlorsig 0.5% Eye Drops',
    genericName: 'Chloramphenicol',
    activeIngredients: 'Chloramphenicol 5mg/mL (0.5%)',
    packSize: '10 mL Dropper Bottle',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-4', 'CAL-10', 'CAL-16'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'مصرف موضعی چشمی با جذب سیستمیک بسیار ناچیز در بارداری ایمن است (Category A).',
      en: 'Topical ophthalmic administration has minimal systemic absorption and is Category A in pregnancy.',
    },
    indications: {
      en: 'Treatment of acute bacterial conjunctivitis in adults and children aged 2 years and older.',
      fa: 'درمان کونژونکتیویت باکتریایی حاد در بزرگسالان و کودکان بالای ۲ سال.',
    },
    counselingPoints: [
      {
        en: 'Store unopened and in-use bottle in refrigerator (2°C - 8°C). Discard after 28 days of opening.',
        fa: 'در یخچال در دمای ۲ الی ۸ درجه سانتی‌گراد نگهداری شود. پس از ۲۸ روز از باز شدن دور ریخته شود.',
      },
      {
        en: 'Instill 1 drop into the affected eye(s) every 2 hours for first 48 hours, then 4 times daily for 5 days.',
        fa: '۱ قطره هر ۲ ساعت در ۴۸ ساعت اول، سپس ۴ بار در روز تا ۴۸ ساعت پس از بهبودی کامل.',
      },
    ],
  },
  {
    id: 'prod-systane-ultra-drops',
    brandName: 'Systane Ultra Lubricant Eye Drops',
    genericName: 'Polyethylene Glycol + Propylene Glycol',
    activeIngredients: 'PEG-400 0.4% + Propylene glycol 0.3% + HP-Guar',
    packSize: '10 mL Dropper Bottle',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-16'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'اشک مصنوعی؛ کاملاً ایمن در بارداری و شیردهی.',
      en: 'Artificial tears; completely safe throughout pregnancy and lactation.',
    },
    indications: {
      en: 'Fast, long-lasting relief from dry eye symptoms, burning, irritation, and screen fatigue.',
      fa: 'تسکین سریع و ماندگار خشکی چشم، سوزش، احساس شن‌ریزه و خستگی ناشی از مانیتور.',
    },
    counselingPoints: [
      {
        en: 'Instill 1-2 drops in affected eye(s) as needed. Compatible with contact lenses.',
        fa: '۱ تا ۲ قطره در طول روز بر حسب نیاز در چشم چکانده شود. سازگار با لنز تماسی.',
      },
    ],
  },
  {
    id: 'prod-zaditen-eye-drops',
    brandName: 'Zaditen Eye Drops 0.025%',
    genericName: 'Ketotifen Fumarate',
    activeIngredients: 'Ketotifen fumarate 0.25mg/mL',
    packSize: '5 mL Bottle',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-16'],
    tgaPregnancyCategory: 'B1',
    pregnancyAdvice: {
      fa: 'در بارداری با ارزیابی سود به زیان بالینی مصرف شود.',
      en: 'Use with caution in pregnancy only if clinically needed.',
    },
    indications: {
      en: 'Treatment of seasonal and perennial allergic conjunctivitis (itchy, watery, red eyes).',
      fa: 'تسکین و پیشگیری از خارش، قرمزی و آبریزش چشم ناشی از آلرژی فصلی (رینیت آلرژیک چشم).',
    },
    counselingPoints: [
      {
        en: 'Instill 1 drop twice daily (every 12 hours). Provides rapid antihistaminic and mast-cell stabilization.',
        fa: '۱ قطره هر ۱۲ ساعت (۲ بار در روز) چکانده شود. اثر دوگانه آنتی‌هیستامینی و تثبیت ماست‌سل دارد.',
      },
    ],
  },
  {
    id: 'prod-waxsol-ear-drops',
    brandName: 'Waxsol Ear Drops',
    genericName: 'Docusate Sodium (Otic)',
    activeIngredients: 'Docusate sodium 0.5% w/v',
    packSize: '10 mL Dropper Bottle',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'قطره موم گوش؛ کاملاً ایمن در بارداری در صورت سلامت پرده صماخ.',
      en: 'Ear wax drop; safe during pregnancy with intact tympanic membrane.',
    },
    indications: {
      en: 'Cerumenolytic agent to soften and facilitate natural clearance of hardened ear wax plugs.',
      fa: 'نرم‌کننده و حل‌کننده توده‌های فشرده و خشک‌شده موم گوش (جرم گوش).',
    },
    counselingPoints: [
      {
        en: 'Fill ear canal on 2 consecutive nights at bedtime. Strictly contraindicated if perforated tympanic membrane or grommets.',
        fa: '۲ شب متوالی هنگام خواب در مجرای گوش چکانده شود. در صورت پارگی پرده گوش یا گرومت اکیداً ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-aqua-ear-drops',
    brandName: 'Aqua Ear Solution',
    genericName: 'Acetic Acid + Isopropyl Alcohol',
    activeIngredients: 'Acetic acid 1.73% + Isopropyl alcohol 63.4%',
    packSize: '35 mL Bottle',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'ایمن در بارداری؛ در پرده گوش پاره یا ملتهب مصرف نشود.',
      en: 'Safe in pregnancy; do not use in perforated or acutely inflamed ear drums.',
    },
    indications: {
      en: 'Prevention and supportive drying aid for swimmer ear (otitis externa) after swimming or showering.',
      fa: 'پیشگیری و خشک‌کننده رطوبت گوش پس از شنا جهت جلوگیری از عفونت گوش شناگران (اوتیت خارجی).',
    },
    counselingPoints: [
      {
        en: 'Instill 3-5 drops into ear canal after swimming or bathing. Do not use in inflamed, broken, or perforated ear drums.',
        fa: '۳ تا ۵ قطره پس از استخر چکانده شود. در گوش ملتهب یا پرده پاره مصرف نشود.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-4: Respiratory, Cough, Cold & Allergy (دستگاه تنفس و آلرژی)
  // -------------------------------------------------------------
  {
    id: 'prod-sudafed-sinus-decongestant',
    brandName: 'Sudafed Sinus Decongestant',
    genericName: 'Pseudoephedrine Hydrochloride',
    activeIngredients: 'Pseudoephedrine HCl 60mg per tablet',
    packSize: '12 Tablets',
    schedule: 'S3',
    requiresProjectStop: true,
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-14', 'CAL-12'],
    tgaPregnancyCategory: 'B2',
    pregnancyAdvice: {
      fa: 'در سه‌ماهه اول به دلیل خطر نقص دیواره شکم جنین (Gastroschisis) ممنوع است و در کل بارداری توصیه نمی‌شود.',
      en: 'Avoid throughout pregnancy, especially in 1st trimester due to vascular disruption and gastroschisis risks.',
    },
    indications: {
      en: 'Fast, effective relief from sinus and nasal congestion due to colds, flu, and allergies.',
      fa: 'تسکین سریع احتقان بینی و سینوس‌ها ناشی از سرماخوردگی، آنفلوآنزا و آلرژی.',
    },
    counselingPoints: [
      {
        en: 'Mandatory Project Stop ID recording and direct clinical assessment by the pharmacist.',
        fa: 'ثبت اجباری در سامانه آنلاین Project Stop با کارت شناسایی عکس‌دار و مشاوره مستقیم داروساز.',
      },
      {
        en: 'Avoid in uncontrolled hypertension, severe coronary artery disease, MAOIs, or glaucoma.',
        fa: 'در فشار خون کنترل‌نشده، بیماری شدید عروق کرونر، مصرف مهارکننده‌های MAO و گلوکوم ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-telfast-180',
    brandName: 'Telfast 180mg',
    genericName: 'Fexofenadine Hydrochloride',
    activeIngredients: 'Fexofenadine HCl 180mg tablet',
    packSize: '30 Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Xergic', 'Fexo 180', 'Chemist Own Fexofenadine'],
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B2',
    pregnancyAdvice: {
      fa: 'در بارداری آنتی‌هیستامین‌های رده A مانند ستیریزین یا لوراتادین ارجح هستند.',
      en: 'Category B2; Category A antihistamines (loratadine or cetirizine) are preferred in pregnancy.',
    },
    indications: {
      en: '24-hour non-drowsy relief of seasonal allergic rhinitis (hayfever) and chronic idiopathic urticaria.',
      fa: 'تسکین ۲۴ ساعته و بدون خواب‌آلودگی علائم رینیت آلرژیک (تب یونجه) و کهیر مزمن.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet daily with a glass of water. Avoid taking with fruit juices (grapefruit/apple) which reduce absorption.',
        fa: 'روزی ۱ قرص همراه آب میل شود؛ از مصرف همزمان با آبمیوه‌های گریپ‌فروت و سیب خودداری شود.',
      },
    ],
  },
  {
    id: 'prod-zyrtec-10',
    brandName: 'Zyrtec 10mg',
    genericName: 'Cetirizine Hydrochloride',
    activeIngredients: 'Cetirizine HCl 10mg tablet',
    packSize: '30 Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Alerid', 'Chemist Own Cetirizine'],
    calLabels: ['CAL-3', 'CAL-12'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'داروی انتخابی و ایمن (Category A) برای رینیت آلرژیک و کهیر در دوران بارداری.',
      en: 'Antihistamine of choice in pregnancy for allergic rhinitis and urticaria (Category A).',
    },
    indications: {
      en: 'Rapid relief of hayfever, sneezing, itchy runny nose, itchy watery eyes, and hives.',
      fa: 'تسکین سریع عطسه، خارش و آبریزش بینی، اشک‌ریزش و کهیر ناشی از آلرژی.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet daily. May cause mild drowsiness in a small percentage of individuals.',
        fa: 'روزی ۱ قرص مصرف شود؛ در درصد کمی از افراد ممکن است خواب‌آلودگی خفیف ایجاد کند.',
      },
    ],
  },
  {
    id: 'prod-rhinocort-hayfever',
    brandName: 'Rhinocort Hayfever 64mcg',
    genericName: 'Budesonide (Nasal)',
    activeIngredients: 'Budesonide 64mcg per dose',
    packSize: '120 Doses Nasal Spray',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-17'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'کورتیکواستروئید بینی انتخابی و کاملاً ایمن در بارداری برای کنترل تب یونجه (Category A).',
      en: 'Intranasal corticosteroid of choice in pregnancy for allergic rhinitis (Category A).',
    },
    indications: {
      en: 'Prevention and treatment of moderate-to-severe allergic rhinitis and nasal polyps.',
      fa: 'پیشگیری و درمان خط اول رینیت آلرژیک فصلی و دائمی و پولیپ بینی.',
    },
    counselingPoints: [
      {
        en: '1-2 sprays into each nostril once daily in the morning. Point spray nozzle away from nasal septum. Takes 2-3 days for full effect.',
        fa: '۱ تا ۲ پاف در هر سوراخ بینی صبح‌ها؛ سر اسپری به سمت دیواره خارجی بینی باشد نه تیغه میانی.',
      },
    ],
  },
  {
    id: 'prod-dimetapp-nasal-spray',
    brandName: 'Dimetapp 12 Hour Nasal Spray',
    genericName: 'Oxymetazoline Hydrochloride',
    activeIngredients: 'Oxymetazoline HCl 0.05% w/v',
    packSize: '20 mL Spray',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B1',
    pregnancyAdvice: {
      fa: 'حداکثر ۳ تا ۵ روز متوالی؛ در بارداری قطره‌های سالین نمکی ارجح هستند.',
      en: 'Limit use to maximum 3-5 days to avoid rhinitis medicamentosa; saline spray preferred in pregnancy.',
    },
    indications: {
      en: 'Fast temporary nasal decongestion for acute blocked nose due to common cold or sinusitis.',
      fa: 'بازکننده فوری گرفتگی و احتقان بینی ناشی از سرماخوردگی و سینوزیت حاد.',
    },
    counselingPoints: [
      {
        en: '1-2 sprays per nostril every 10-12 hours. Do not use for more than 3 to 5 consecutive days (rebound congestion risk).',
        fa: 'هر ۱۰ تا ۱۲ ساعت ۱ تا ۲ پاف؛ مصرف نباید بیش از ۳ تا ۵ روز متوالی ادامه یابد (خطر احتقان بازگشتی شدید).',
      },
    ],
  },
  {
    id: 'prod-robitussin-dry-cough',
    brandName: 'Robitussin Dry Cough Forte',
    genericName: 'Dextromethorphan Hydrobromide',
    activeIngredients: 'Dextromethorphan HBr 15mg/5mL',
    packSize: '200 mL Liquid',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-2', 'CAL-12'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'در دوزهای مجاز در بارداری قابل مصرف است (Category A).',
      en: 'Acceptable for short-term use at recommended therapeutic doses in pregnancy (Category A).',
    },
    indications: {
      en: 'Cough suppressant for non-productive, dry irritating tickly coughs.',
      fa: 'ضدسرفه مرکزی برای سرفه‌های خشک، تحریکی و بدون خلط.',
    },
    counselingPoints: [
      {
        en: '10mL every 6-8 hours as required (max 40mL daily). Avoid taking with MAOIs or strong SSRIs (serotonin syndrome risk).',
        fa: '۱۰ میلی‌لیتر هر ۶ تا ۸ ساعت بر حسب نیاز؛ با داروهای ضد افسردگی MAOI یا SSRI قوی تداخل دارد.',
      },
    ],
  },
  {
    id: 'prod-bisolvon-chesty-forte',
    brandName: 'Bisolvon Chesty Forte Liquid',
    genericName: 'Bromhexine Hydrochloride',
    activeIngredients: 'Bromhexine HCl 8mg/5mL',
    packSize: '200 mL Liquid',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Mucolytic agent to thin and break down heavy, sticky chest mucus and phlegm in productive coughs.',
      fa: 'خلط‌آور و موکولیتیک جهت رقیق‌کردن و تخلیه ترشحات غلیظ سینه در سرفه‌های خلط‌دار.',
    },
    counselingPoints: [
      {
        en: '5mL three times daily with plenty of water. Adequate hydration enhances mucus clearance.',
        fa: '۵ میلی‌لیتر ۳ بار در روز همراه با نوشیدن آب فراوان مصرف شود تا خلط‌ها راحت‌تر دفع شوند.',
      },
    ],
  },
  {
    id: 'prod-ventolin-inhaler',
    brandName: 'Ventolin CFC-Free Inhaler 100mcg',
    genericName: 'Salbutamol',
    activeIngredients: 'Salbutamol sulfate 100mcg per actuation',
    packSize: '200 Doses MDI Inhaler',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Asmol 100'],
    calLabels: ['CAL-17'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'برونکودیلاتور نجات‌بخش و انتخابی در تمام مراحل بارداری و حملات حاد آسم (Category A).',
      en: 'Reliever of choice; completely safe and essential in all trimesters of pregnancy for asthma control (Category A).',
    },
    indications: {
      en: 'Short-acting beta-2 agonist (SABA) for rapid relief of acute asthma symptoms, bronchospasm, and wheezing.',
      fa: 'برونکودیلاتور سریع‌الاثر (SABA) برای تسکین فوری حملات آسم، تنگی نفس و خس‌خس سینه.',
    },
    counselingPoints: [
      {
        en: '1-2 puffs as required for acute symptoms (using a spacer optimizes lung delivery). If using >2 days/week, review preventer.',
        fa: '۱ تا ۲ پاف در زمان تنگی نفس (ترجیحاً با اسپیسر). مصرف بیش از ۲ روز در هفته نشانه عدم کنترل آسم است.',
      },
    ],
  },
  {
    id: 'prod-nicorette-gum-4mg',
    brandName: 'Nicorette Gum 4mg',
    genericName: 'Nicotine Polacrilex',
    activeIngredients: 'Nicotine 4mg per piece',
    packSize: '30 Pieces Chewing Gum',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'D',
    pregnancyAdvice: {
      fa: 'روش‌های غیردارویی ترک سیگار در بارداری اولویت دارند؛ اما NRT خوراکی کوتاه‌اثر نسبت به ادامه مصرف سیگار بسیار کم‌خطرتر است.',
      en: 'Non-pharmacological cessation preferred; oral short-acting NRT is substantially safer than continued tobacco smoking in pregnancy.',
    },
    indications: {
      en: 'Nicotine replacement therapy (NRT) for smoking cessation in smokers of >20 cigarettes/day.',
      fa: 'درمان جایگزین نیکوتین (NRT) برای ترک سیگار در افراد با مصرف بیش از ۲۰ نخ در روز.',
    },
    counselingPoints: [
      {
        en: 'Use "Chew and Park" technique: chew slowly until tingling, then park between cheek and gum for 30 min. Avoid acidic drinks 15m prior.',
        fa: 'روش "جویدن و پارک": آهسته بجوید تا احساس سوزن‌سوزن شدن کند، سپس بین لثه و گونه نگه دارید (۱۵ دقیقه قبل آبمیوه ترش مصرف نشود).',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-5: Gastrointestinal (دستگاه گوارش، اسید، یبوست و اسهال)
  // -------------------------------------------------------------
  {
    id: 'prod-nexium-24hr',
    brandName: 'Nexium 24HR 20mg',
    genericName: 'Esomeprazole Magnesium',
    activeIngredients: 'Esomeprazole 20mg tablet',
    packSize: '14 Tablets',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Somac Heartburn Relief (Pantoprazole)', 'Chemist Own Esomeprazole'],
    calLabels: ['CAL-6', 'CAL-B'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'در صورت عدم پاسخ به آنتی‌اسیدها و H2RAها در بارداری با نظر پزشک مصرف شود.',
      en: 'Second-line after antacids and H2-receptor antagonists for severe refractory reflux in pregnancy.',
    },
    indications: {
      en: 'Lasting relief of frequent heartburn, acid regurgitation, and gastro-oesophageal reflux disease (GORD).',
      fa: 'تسکین پایدار سوزش سر دل مکرر، برگشت اسید معده و ریفلاکس گوارشی (GORD).',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet daily in the morning 30-60 minutes before breakfast. Swallow whole, do not crush or chew.',
        fa: 'روزی ۱ قرص صبح‌ها ۳۰ تا ۶۰ دقیقه قبل از صبحانه میل شود. کامل بلعیده شده و خرد نشود.',
      },
    ],
  },
  {
    id: 'prod-gaviscon-dual-action',
    brandName: 'Gaviscon Dual Action Liquid',
    genericName: 'Sodium Alginate + Sodium Bicarbonate + Calcium Carbonate',
    activeIngredients: 'Sodium alginate 500mg + Sodium bicarbonate 213mg + Calcium carbonate 325mg per 10mL',
    packSize: '300 mL Liquid Suspension',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'آنتی‌اسید آلژینات خط اول و کاملاً ایمن برای سوزش سر دل در تمام مراحل بارداری (Category A).',
      en: 'First-line alginate barrier therapy; safe throughout all trimesters of pregnancy (Category A).',
    },
    indications: {
      en: 'Fast soothing raft formation to block acid reflux and neutralise excess gastric acid in heartburn and indigestion.',
      fa: 'ایجاد لایه ژلی محافظ شناور روی محتویات معده و خنثی‌سازی سریع اسید در سوزش سر دل و سوءهاضمه.',
    },
    counselingPoints: [
      {
        en: '10-20mL after meals and at bedtime (up to 4 times daily). Separate from other oral medications by at least 2 hours.',
        fa: '۱۰ تا ۲۰ میلی‌لیتر پس از غذا و قبل از خواب؛ حداقل ۲ ساعت فاصله زمانی با سایر داروها رعایت شود.',
      },
    ],
  },
  {
    id: 'prod-gastro-stop-2mg',
    brandName: 'Gastro-Stop 2mg',
    genericName: 'Loperamide Hydrochloride',
    activeIngredients: 'Loperamide HCl 2mg capsule',
    packSize: '20 Capsules',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Imodium', 'Chemist Own Loperamide'],
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'آبرسانی و ORS خط اول است؛ لوپرامید در دوران بارداری توصیه نمی‌شود مگر با ضرورت قطعی بالینی.',
      en: 'Oral rehydration is first-line; avoid loperamide in pregnancy unless clinically essential.',
    },
    indications: {
      en: 'Symptomatic control of acute non-specific diarrhea in adults and children 12 years and over.',
      fa: 'مهار علامتی اسهال حاد غیرعفونی و غیرخونی در افراد بالای ۱۲ سال.',
    },
    counselingPoints: [
      {
        en: 'Take 2 capsules initially, then 1 capsule after each loose unformed bowel motion (maximum 8 capsules / 16mg in 24 hours). Drink ORS fluids.',
        fa: 'در ابتدا ۲ کپسول، سپس ۱ کپسول بعد از هر بار دفع شل (حداکثر ۸ کپسول در ۲۴ ساعت). همراه با محلول ORS مصرف شود.',
      },
      {
        en: 'Contraindicated if blood in stool, high fever, or dysentery.',
        fa: 'در صورت وجود خون در مدفوع، تب بالا یا اسهال خونی باکتریایی ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-hydralyte-effervescent',
    brandName: 'Hydralyte Electrolyte Effervescent Tablets',
    genericName: 'Oral Rehydration Salts (ORS)',
    activeIngredients: 'Sodium chloride, Potassium chloride, Citric acid, Glucose',
    packSize: '20 Effervescent Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-7'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'محلول آبرسانی الکترولیتی؛ کاملاً ایمن و ضروری در بارداری، شیردهی و اطفال.',
      en: 'Oral rehydration solution; completely safe and essential during pregnancy, lactation and pediatrics.',
    },
    indications: {
      en: 'Rapid rehydration and electrolyte replenishment during diarrhea, vomiting, fever, and heat exhaustion.',
      fa: 'جایگزینی سریع آب و الکترولیت‌های از دست رفته در اسهال، استفراغ، تب و گرمازدگی.',
    },
    counselingPoints: [
      {
        en: 'Dissolve 2 tablets in 200mL of fresh cold drinking water. Sip small volumes frequently.',
        fa: '۲ قرص جوشان در ۲۰۰ میلی‌لیتر آب تمیز حل شده و به تدریج نوشیده شود.',
      },
    ],
  },
  {
    id: 'prod-movicol-sachets',
    brandName: 'Movicol Sachets (Flavour Free)',
    genericName: 'Macrogol 3350 + Electrolytes',
    activeIngredients: 'Macrogol 3350 13.125g + Electrolytes per sachet',
    packSize: '30 Sachets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Osmolax', 'Coloxyl & Senna'],
    calLabels: ['CAL-7'],
    tgaPregnancyCategory: 'B1',
    pregnancyAdvice: {
      fa: 'ملین اسمزی انتخابی و ایمن خط اول برای یبوست بارداری (به دلیل عدم جذب سیستمیک).',
      en: 'Osmotic laxative of choice in pregnancy due to negligible systemic absorption.',
    },
    indications: {
      en: 'Effective, gentle osmotic treatment of chronic and acute constipation and faecal impaction.',
      fa: 'درمان ملایم و اسموتیک یبوست حاد و مزمن و انسداد مدفوعی بدون ایجاد تنبلی روده.',
    },
    counselingPoints: [
      {
        en: 'Dissolve 1 sachet in 125mL of water 1-3 times daily according to severity. Maintain high daily fluid intake.',
        fa: '۱ ساشه در ۱۲۵ میلی‌لیتر آب حل و ۱ تا ۳ بار در روز مصرف شود. نوشیدن آب کافی در طول روز ضروری است.',
      },
    ],
  },
  {
    id: 'prod-dulcolax-5mg',
    brandName: 'Dulcolax 5mg Tablets',
    genericName: 'Bisacodyl',
    activeIngredients: 'Bisacodyl 5mg enteric-coated tablet',
    packSize: '40 Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Chemist Own Bisacodyl'],
    calLabels: ['CAL-6', 'CAL-B'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'ملین محرک خط دوم؛ برای مصرف کوتاه‌مدت در بارداری در صورت عدم پاسخ به ملین‌های فیبری و اسمزی.',
      en: 'Stimulant laxative for short-term use in pregnancy if bulk-forming/osmotic laxatives are ineffective.',
    },
    indications: {
      en: 'Stimulant laxative for predictable overnight relief of acute constipation.',
      fa: 'ملین محرک برای تسکین شبانه یبوست حاد طی ۶ تا ۱۲ ساعت.',
    },
    counselingPoints: [
      {
        en: '1-2 tablets at bedtime with water. Do not take with milk or antacids (enteric coating protection).',
        fa: '۱ تا ۲ قرص هنگام خواب میل شود. همراه با شیر یا آنتی‌اسید مصرف نشود تا پوشش روده محافظت گردد.',
      },
    ],
  },
  {
    id: 'prod-buscopan-forte',
    brandName: 'Buscopan Forte 20mg',
    genericName: 'Hyoscine Butylbromide',
    activeIngredients: 'Hyoscine butylbromide 20mg tablet',
    packSize: '10 Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Chemist Own Hyoscine'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B2',
    pregnancyAdvice: {
      fa: 'در بارداری فقط با نظر و دستور مستقیم پزشک مصرف شود.',
      en: 'Use only under direct medical advice during pregnancy.',
    },
    indications: {
      en: 'Targeted antispasmodic relief for abdominal cramps, IBS spasms, and painful period cramps.',
      fa: 'ضداسپاسم عضلات صاف دستگاه گوارش برای دردهای کولیکی شکم و سندرم روده تحریک‌پذیر (IBS).',
    },
    counselingPoints: [
      {
        en: '1 tablet swallowed whole four times daily as required. Peripheral action causes minimal CNS drowsiness.',
        fa: '۱ قرص تا ۴ بار در روز هنگام اسپاسم بلعیده شود. به علت عدم عبور از سد خونی-مغزی خواب‌آلودگی ایجاد نمی‌کند.',
      },
    ],
  },
  {
    id: 'prod-travacalm-original',
    brandName: 'Travacalm Original',
    genericName: 'Dimenhydrinate + Hyoscine Hydrobromide + Caffeine',
    activeIngredients: 'Dimenhydrinate 50mg + Hyoscine HBr 0.2mg + Caffeine 20mg',
    packSize: '10 Tablets',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-2'],
    tgaPregnancyCategory: 'B2',
    pregnancyAdvice: {
      fa: 'به دلیل ترکیبات سه‌گانه در بارداری توصیه نمی‌شود؛ ویتامین B6 (پیریدوکسین) یا زنجبیل برای تهوع بارداری ارجح است.',
      en: 'Avoid combination in pregnancy; pyridoxine (vitamin B6) or ginger is preferred for pregnancy nausea.',
    },
    indications: {
      en: 'Prevention and treatment of motion sickness (car, sea, air travel) and nausea.',
      fa: 'پیشگیری و درمان بیماری حرکت (ماشین‌گرفتگی، دریازدگی و سفرهای هوایی) و تهوع.',
    },
    counselingPoints: [
      {
        en: 'Take 1-2 tablets 30 minutes before departure. May cause drowsiness; avoid driving and alcohol.',
        fa: '۱ تا ۲ قرص ۳۰ دقیقه قبل از حرکت مصرف شود. ممکن است خواب‌آلودگی ایجاد کند.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-6: Dermatology & Skin Care (مراقبت‌های پوستی، درماتیت و اگزما)
  // -------------------------------------------------------------
  {
    id: 'prod-dermaid-1-cream',
    brandName: 'Dermaid 1% Cream',
    genericName: 'Hydrocortisone',
    activeIngredients: 'Hydrocortisone 10mg/g (1%) dissolved cream',
    packSize: '30g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Sigmacort 1%', 'Chemist Own Hydrocortisone'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'کورتیکواستروئید موضعی خفیف خط اول و ایمن در بارداری برای اگزمای پوستی (Category A).',
      en: 'Mild topical corticosteroid of choice in pregnancy for eczema and dermatitis (Category A).',
    },
    indications: {
      en: 'Temporary relief of itching, redness, and inflammation associated with mild eczema, dermatitis, and insect bites.',
      fa: 'تسکین موقت خارش، قرمزی و التهاب در اگزمای خفیف، درماتیت، گزیدگی حشرات و آفتاب‌سوختگی.',
    },
    counselingPoints: [
      {
        en: 'Apply thinly 1-2 times daily using Fingertip Units (FTU). Do not use on broken infected skin or viral herpes sores.',
        fa: '۱ تا ۲ بار در روز به مقدار کم روی ضایعه مالیده شود. روی پوست عفونی، زخمی یا تبخال استفاده نشود.',
      },
    ],
  },
  {
    id: 'prod-ego-qv-cream',
    brandName: 'QV Cream 500g Pump',
    genericName: 'Emollient & Barrier Cream (Glycerol + Liquid Paraffin)',
    activeIngredients: 'Glycerol 10% + Light liquid paraffin 10% + Soft white paraffin 5%',
    packSize: '500g Pump Bottle',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'کرم نرم‌کننده و امولینت پایه؛ کاملاً ایمن در تمام دوران بارداری و شیردهی.',
      en: 'Emollient barrier moisturizer; completely safe throughout pregnancy and breastfeeding.',
    },
    indications: {
      en: 'Rich moisturising barrier cream for relief and daily management of dry skin, eczema, psoriasis, and dermatitis.',
      fa: 'کرم نرم‌کننده و بازسازی‌کننده لایه چربی محافظ پوست برای مدیریت روزانه خشکی پوست، اگزما و پسوریازیس.',
    },
    counselingPoints: [
      {
        en: 'Apply liberally to affected areas as often as required, especially after bathing or showering while skin is damp.',
        fa: 'به میزان سخاوتمندانه چندین بار در طول روز و به‌ویژه بلافاصله پس از استحمام روی پوست مرطوب استفاده شود.',
      },
    ],
  },
  {
    id: 'prod-benzac-ac-5-gel',
    brandName: 'Benzac AC 5% Gel',
    genericName: 'Benzoyl Peroxide',
    activeIngredients: 'Benzoyl peroxide 50mg/g (5%) in acrylates copolymer',
    packSize: '50g Tube',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B1',
    pregnancyAdvice: {
      fa: 'درمان موضعی آکنه با جذب بسیار ناچیز؛ جایگزین ایمن برای رتینوئیدها در دوران بارداری.',
      en: 'Topical acne therapy with minimal systemic absorption; safe alternative to retinoids in pregnancy.',
    },
    indications: {
      en: 'Topical antibacterial and keratolytic treatment for mild-to-moderate acne vulgaris.',
      fa: 'درمان آنتی‌باکتریال و لایه‌بردار موضعی برای آکنه ولگاریس و جوش‌های سرسیاه و سرسفید.',
    },
    counselingPoints: [
      {
        en: 'Apply once daily at night, gradually increasing to twice daily if tolerated. May bleach hair and colored fabrics.',
        fa: 'شبی یک بار مصرف و در صورت تحمل به ۲ بار افزایش یابد. می‌تواند رنگ حوله و لباس را سفید کند.',
      },
    ],
  },
  {
    id: 'prod-zovirax-cold-sore-cream',
    brandName: 'Zovirax Cold Sore Cream 5%',
    genericName: 'Aciclovir',
    activeIngredients: 'Aciclovir 50mg/g (5%) with MAC-P enhancer',
    packSize: '2g Pump',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Chemist Own Antiviral Cold Sore Cream'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'آسیکلوویر موضعی با جذب سیستمیک ناچیز در بارداری برای تبخال لب قابل مصرف است.',
      en: 'Topical aciclovir has negligible systemic absorption and can be used in pregnancy.',
    },
    indications: {
      en: 'Treatment of herpes labialis (cold sores) on the lips and face.',
      fa: 'درمان تبخال لب و صورت (ویروس هرپس سیمپلکس).',
    },
    counselingPoints: [
      {
        en: 'Apply at the very first sign of tingle/burn 5 times daily (every 4 hours) for 4 days. Wash hands after application.',
        fa: 'با اولین احساس سوزش و گزگز ۵ بار در روز (هر ۴ ساعت) به مدت ۴ روز استفاده شود. پس از مصرف دست‌ها شسته شود.',
      },
    ],
  },
  {
    id: 'prod-sudocrem-healing-cream',
    brandName: 'Sudocrem Healing Cream',
    genericName: 'Zinc Oxide + Benzyl Benzoate',
    activeIngredients: 'Zinc oxide 15.25% + Benzyl benzoate 1.01% + Anhydrous hypoallergenic lanolin',
    packSize: '125g Tub',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'پماد محافظتی زینک؛ کاملاً ایمن در بارداری و برای ادرارسوختگی نوزادان.',
      en: 'Zinc barrier cream; completely safe during pregnancy and for infant nappy rash.',
    },
    indications: {
      en: 'Soothing protective barrier cream for nappy rash, cuts, grazes, minor burns, and pressure areas.',
      fa: 'کرم محافظ و التیام‌بخش برای ادرار سوختگی پای نوزاد (Nappy Rash)، بریدگی‌های جزئی و خراش‌های پوستی.',
    },
    counselingPoints: [
      {
        en: 'Apply a thin layer to clean dry skin at every nappy change. Forms a water-repellent protective layer.',
        fa: 'در هر تعویض پوشک لایه نازکی روی پوست تمیز و خشک نوزاد مالیده شود تا لایه ضدآب محافظ ایجاد گردد.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-1-7: Women's & Men's Health & Emergency Contraception
  // -------------------------------------------------------------
  {
    id: 'prod-postinor-1',
    brandName: 'Postinor-1 1.5mg',
    genericName: 'Levonorgestrel',
    activeIngredients: 'Levonorgestrel 1.5mg tablet',
    packSize: '1 Oral Tablet',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-7',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['NorLevo-1', 'Escapelle', 'Chemist Own Levonorgestrel'],
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'قرص اورژانسی هورمونی؛ در صورت وجود بارداری مستقر قبلی به جنین آسیبی نمی‌زند و سقط‌آور نیست.',
      en: 'Emergency contraception; does not harm an established pregnancy or act as an abortifacient.',
    },
    indications: {
      en: 'Emergency contraception within 72 hours (3 days) of unprotected sexual intercourse or contraceptive failure.',
      fa: 'پیشگیری اضطراری از بارداری تا حداکثر ۷۲ ساعت (۳ روز) پس از نزدیکی محافظت‌نشده.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet as soon as possible (ideally within 24 hours). If vomiting occurs within 2 hours, repeat dose. In BMI >30 / weight >70kg, double dose (3mg) or ulipristal is recommended.',
        fa: 'هر چه سریع‌تر مصرف شود (ترجیحاً زیر ۲۴ ساعت). در صورت استفراغ تا ۲ ساعت دوز باید تکرار شود. در وزن بالای ۷۰ کیلوگرم دوز دوبل یا اولیپریستال توصیه می‌شود.',
      },
    ],
  },
  {
    id: 'prod-ellaone-30mg',
    brandName: 'EllaOne 30mg',
    genericName: 'Ulipristal Acetate',
    activeIngredients: 'Ulipristal acetate 30mg tablet',
    packSize: '1 Oral Tablet',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-7',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'B3',
    pregnancyAdvice: {
      fa: 'در صورت شک به بارداری مستقر منع مصرف دارد؛ در صورت شیردهی، تا ۱ هفته شیر دوشیده و دور ریخته شود.',
      en: 'Contraindicated in established pregnancy; express and discard breast milk for 7 days post-dose.',
    },
    indications: {
      en: 'Emergency contraception within 120 hours (5 days) of unprotected intercourse (preferred if between 72-120 hours or higher BMI).',
      fa: 'پیشگیری اضطراری از بارداری تا ۱۲۰ ساعت (۵ روز) پس از نزدیکی (انتخاب ارجح در فواصل ۷۲ تا ۱۲۰ ساعت یا BMI بالا).',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet as soon as possible up to 120 hours. If hormonal contraception is restarted, use condoms for next 14 days.',
        fa: 'تا حداکثر ۵ روز قابل مصرف است؛ در صورت شروع مجدد قرص‌های ضدبارداری، تا ۱۴ روز استفاده از کاندوم الزامی است.',
      },
    ],
  },
  {
    id: 'prod-ural-sachets',
    brandName: 'Ural Effervescent Granules',
    genericName: 'Urinary Alkaliniser (Sodium Bicarbonate + Tartaric Acid + Citric Acid)',
    activeIngredients: 'Sodium bicarbonate 1.76g + Tartaric acid 890mg + Citric acid 720mg + Sodium citrate 630mg per sachet',
    packSize: '28 Sachets',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-7',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-7'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'در سوزش ادرار بارداری قابل مصرف است اما علائم UTI در بارداری نیازمند ارجاع فوری به GP جهت درمان آنتی‌بیوتیکی است.',
      en: 'Safe in pregnancy (Category A); however, any urinary infection symptoms in pregnancy require urgent GP referral.',
    },
    indications: {
      en: 'Symptomatic relief of burning and stinging pain associated with acute urinary tract infections (cystitis).',
      fa: 'تسکین فوری سوزش، تکرر و درد ناشی از عفونت مجاری ادراری (سیستیت) با قلیایی کردن ادرار.',
    },
    counselingPoints: [
      {
        en: 'Dissolve 1-2 sachets in a glass of water up to 4 times daily. Does not treat underlying bacterial infection; refer if fever or loin pain occurs.',
        fa: '۱ تا ۲ ساشه در یک لیوان آب حل و تا ۴ بار در روز میل شود. به تنهایی باکتری را درمان نمی‌کند و در صورت تب و درد پهلو ارجاع فوری نیاز است.',
      },
    ],
  },
  {
    id: 'prod-canesten-vaginal-pessary',
    brandName: 'Canesten 1-Day Pessary 500mg',
    genericName: 'Clotrimazole (Vaginal)',
    activeIngredients: 'Clotrimazole 500mg vaginal pessary + 10g cream',
    packSize: '1 Pessary with Applicator + 10g Soothing Cream',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-7',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Clonea 1 Day', 'Chemist Own Thrush 1-Day'],
    calLabels: ['CAL-A'],
    tgaPregnancyCategory: 'A',
    pregnancyAdvice: {
      fa: 'درمان خط اول و ایمن کاندیدیاز واژینال بارداری؛ با دست جاگذاری شود و از اپلیکاتور عمیق استفاده نشود.',
      en: 'First-line vaginal candidiasis treatment in pregnancy (Category A); insert manually without deep applicator.',
    },
    indications: {
      en: 'Single-dose local treatment for vaginal candidiasis (thrush). Safe in pregnancy (insert pessary manually without applicator).',
      fa: 'درمان موضعی تک‌دوز کاندیدیازیس و برفک واژینال. در بارداری ایمن است (پژاری بدون اپلیکاتور با دست قرار داده شود).',
    },
    counselingPoints: [
      {
        en: 'Insert pessary high into vagina at bedtime using applicator (or finger if pregnant). May reduce effectiveness of latex condoms.',
        fa: 'هنگام خواب در واژن قرار داده شود (در بارداری با دست و بدون اپلیکاتور). می‌تواند مقاومت کاندوم لاتکس را کاهش دهد.',
      },
    ],
  },
  {
    id: 'prod-bonjela-teething-gel',
    brandName: 'Bonjela Teething Gel',
    genericName: 'Choline Salicylate + Cetalkonium Chloride',
    activeIngredients: 'Choline salicylate 8.7% + Cetalkonium chloride 0.01%',
    packSize: '15g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-7',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-12'],
    tgaPregnancyCategory: 'C',
    pregnancyAdvice: {
      fa: 'در سه‌ماهه سوم بارداری منع مصرف دارد؛ در کودکان زیر ۱۶ سال به دلیل خطر سندرم ری ممنوع است.',
      en: 'Avoid in 3rd trimester; contraindicated in children <16 years (Reye syndrome risk).',
    },
    indications: {
      en: 'Pain relief and antiseptic soothing for mouth ulcers, denture sores, and infant teething.',
      fa: 'تسکین درد و ضدعفونی‌کننده آفت دهان، زخم ناشی از پروتز و دندان درآوردن کودکان بالای ۴ ماه.',
    },
    counselingPoints: [
      {
        en: 'Massage a small pea-sized amount onto the sore area every 3 hours as needed. Do not exceed recommended dose.',
        fa: 'به اندازه یک نخود روی موضع مالیده شود (هر ۳ ساعت در صورت نیاز). از مصرف بیش از حد مجاز خودداری گردد.',
      },
    ],
  },
  // CAT 2: Cardiovascular & Renal
  // -------------------------------------------------------------
  // sub-2-1: Hypertension & RAAS (پرفشاری خون و سیستم رنین-آنژیوتانسین)
  // -------------------------------------------------------------
  {
    id: 'prod-pritor-80mg',
    brandName: 'Pritor 80mg',
    genericName: 'Telmisartan',
    activeIngredients: 'Telmisartan 80mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Micardis', 'Telmisartan Sandoz', 'Telmisartan GH'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Treatment of essential hypertension and reduction of cardiovascular morbidity in high-risk patients.',
      fa: 'درمان فشار خون اولیه و کاهش حوادث قلبی عروقی در بیماران پرخطر.',
    },
    counselingPoints: [
      {
        en: 'Contraindicated in pregnancy (Category D - fetotoxic).',
        fa: 'در دوران بارداری اکیداً ممنوع است (تراتوژن و آسیب‌رسان به کلیه جنین).',
      },
      {
        en: 'Monitor renal function and serum potassium within 1-2 weeks of initiation.',
        fa: 'عملکرد کلیوی و سطح پتاسیم خون باید ۱ تا ۲ هفته پس از شروع مصرف بررسی شود.',
      },
    ],
  },
  {
    id: 'prod-coversyl-5mg',
    brandName: 'Coversyl 5mg',
    genericName: 'Perindopril Arginine',
    activeIngredients: 'Perindopril arginine 5mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Perindopril GH', 'Coversyl Plus (with Indapamide)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'First-line treatment of hypertension, heart failure, and stable coronary artery disease.',
      fa: 'خط اول درمان فشار خون بالا، نارسایی قلبی و بیماری پایدار عروق کرونر.',
    },
    counselingPoints: [
      {
        en: 'Take once daily in the morning before food. Report persistent dry cough (bradykinin class effect); switch to an ARB if intolerable.',
        fa: 'صبح‌ها قبل از غذا میل شود. در صورت بروز سرفه خشک و آزاردهنده (ناشی از برادی‌کینین) اطلاع دهید تا به ARB تغییر داده شود.',
      },
    ],
  },
  {
    id: 'prod-atacand-16mg',
    brandName: 'Atacand 16mg',
    genericName: 'Candesartan Cilexetil',
    activeIngredients: 'Candesartan cilexetil 16mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Candesartan Sandoz', 'Atacand Plus (with HCTZ)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Management of hypertension and heart failure with reduced ejection fraction (HFrEF).',
      fa: 'کنترل فشار خون و درمان نارسایی قلبی همراه با کاهش کسر تخلیه‌ای (HFrEF).',
    },
    counselingPoints: [
      {
        en: 'Take once daily with or without food. Avoid potassium supplements or potassium-based salt substitutes without medical advice.',
        fa: 'روزی یک بار با یا بدون غذا مصرف شود. از مصرف مکمل‌های پتاسیم یا نمک رژیمی پتاسیم‌دار بدون نظر پزشک خودداری گردد.',
      },
    ],
  },
  {
    id: 'prod-norvasc-5mg',
    brandName: 'Norvasc 5mg',
    genericName: 'Amlodipine Besylate',
    activeIngredients: 'Amlodipine besylate 5mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Amlodipine Sandoz', 'Amlodipine GH', 'Perindo/Amlo combos'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Dihydropyridine calcium channel blocker for hypertension and chronic stable angina pectoris.',
      fa: 'مسدودکننده کانال کلسیمی دی‌هیدروپیریدینی برای درمان فشار خون بالا و آنژین صدری پایدار.',
    },
    counselingPoints: [
      {
        en: 'Take once daily. Common dose-dependent side effect is peripheral ankle swelling (edema); elevate legs when resting.',
        fa: 'روزی یک بار مصرف شود. ورم مچ پا (ادم محیطی) شایع است؛ هنگام استراحت پاها را بالاتر قرار دهید.',
      },
    ],
  },
  {
    id: 'prod-dithiazide-25mg',
    brandName: 'Dithiazide 25mg',
    genericName: 'Hydrochlorothiazide',
    activeIngredients: 'Hydrochlorothiazide 25mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Chlotride', 'HCTZ combos (Karvezide, Co-Diovan)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Thiazide diuretic for mild-to-moderate hypertension and fluid retention/edema.',
      fa: 'دیورتیک تیازیدی برای درمان فشار خون خفیف تا متوسط و احتباس مایعات (ادم).',
    },
    counselingPoints: [
      {
        en: 'Take in the morning with breakfast to avoid nocturia (waking up to urinate). Monitor for electrolyte changes (hypokalemia, hyponatremia).',
        fa: 'صبح‌ها همراه با صبحانه مصرف شود تا مانع از شب‌ادراری و بیداری شبانه شود. الکترولیت‌های خون (پتاسیم و سدیم) پایش شوند.',
      },
    ],
  },
  {
    id: 'prod-trandate-100mg',
    brandName: 'Trandate 100mg',
    genericName: 'Labetalol Hydrochloride',
    activeIngredients: 'Labetalol HCl 100mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Alpha/beta-blocker indicated for moderate-to-severe hypertension, especially gestational hypertension and pre-eclampsia.',
      fa: 'مسدودکننده گیرنده‌های آلفا و بتا؛ داروی خط اول و انتخابی فشار خون بالا در دوران بارداری و پره‌اکلامپسی.',
    },
    counselingPoints: [
      {
        en: 'Take with food to enhance absorption. First-line safe antihypertensive throughout pregnancy and breastfeeding.',
        fa: 'همراه با غذا میل شود. داروی استاندارد و ایمن فشار خون در طول دوران بارداری و شیردهی.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-2-2: Anticoagulants, Antiplatelets & Thrombosis
  // -------------------------------------------------------------
  {
    id: 'prod-coumadin-3mg',
    brandName: 'Coumadin 3mg',
    genericName: 'Warfarin Sodium',
    activeIngredients: 'Warfarin Sodium 3mg tablet',
    packSize: '50 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-2',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    brandSubstitutionNotice: {
      en: 'Do not substitute with Marevan. Coumadin and Marevan brands are not bioequivalent and cannot be interchanged without INR re-titration.',
      fa: 'با برند Marevan تعویض نشود! این دو برند زیست‌فراهمی متفاوت دارند و جابجایی آنها بدون آزمایش مجدد INR خطر خونریزی حاد دارد.',
    },
    calLabels: ['CAL-10', 'CAL-A'],
    indications: {
      en: 'Prophylaxis and treatment of venous thromboembolism, PE, and thromboembolic complications associated with AF and cardiac valve replacement.',
      fa: 'پیشگیری و درمان ترومبوآمبولی وریدی (DVT)، آمبولی ریه (PE) و سکته در فیبریلاسیون دهلیزی و دریچه‌های مکانیکی قلب.',
    },
    counselingPoints: [
      {
        en: 'Strict Narrow Therapeutic Index (NTI). Maintain consistent daily vitamin K intake in diet.',
        fa: 'داروی با پنجره درمانی باریک (NTI): مصرف روزانه ویتامین K در رژیم غذایی باید یکنواخت بماند.',
      },
      {
        en: 'Regular INR monitoring required (target typically 2.0 - 3.0, or 2.5 - 3.5 for mechanical valves).',
        fa: 'انجام منظم آزمایش INR الزامی است (معمولاً هدف ۲ الی ۳، در دریچه‌های قلبی ۲.۵ الی ۳.۵).',
      },
    ],
  },
  {
    id: 'prod-xarelto-20mg',
    brandName: 'Xarelto 20mg',
    genericName: 'Rivaroxaban',
    activeIngredients: 'Rivaroxaban 20mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Rivaroxaban Sandoz', 'Rivaroxaban GH'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Direct Factor Xa inhibitor for stroke prevention in non-valvular AF and treatment/secondary prevention of DVT and PE.',
      fa: 'مهارکننده مستقیم فاکتور Xa انعقادی جهت پیشگیری از سکته مغزی در AF غیردریچه‌ای و درمان لخته DVT/PE.',
    },
    counselingPoints: [
      {
        en: 'Take the 15mg and 20mg tablets strictly WITH food to ensure optimal absorption and bioavailability.',
        fa: 'قرص‌های دوز ۱۵ و ۲۰ میلی‌گرم باید حتماً همراه با غذا میل شوند تا جذب کامل صورت گیرد.',
      },
      {
        en: 'Dose adjustment required in renal impairment (CrCl 15-49 mL/min: reduce to 15mg once daily).',
        fa: 'در اختلال کلیوی نیاز به کاهش دوز به ۱۵ میلی‌گرم روزانه وجود دارد.',
      },
    ],
  },
  {
    id: 'prod-eliquis-5mg',
    brandName: 'Eliquis 5mg',
    genericName: 'Apixaban',
    activeIngredients: 'Apixaban 5mg tablet',
    packSize: '60 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Apixaban Sandoz', 'Apixaban GH'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Direct Factor Xa inhibitor for stroke prophylaxis in non-valvular AF and management of VTE.',
      fa: 'ضدانعقاد خوراکی مستقیم (DOAC) مهارکننده فاکتور Xa برای پیشگیری از سکته در AF و ترومبوز وریدی.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet twice daily with or without food. Standard dose 5mg BD; reduce to 2.5mg BD if ≥2 of: age ≥80, weight ≤60kg, serum creatinine ≥133 µmol/L.',
        fa: 'روزی ۲ بار (صبح و شب). در صورت داشتن حداقل ۲ شرط از این ۳ مورد دوز به ۲.۵ میلی‌گرم ۲ بار در روز کاهش می‌یابد: سن بالای ۸۰، وزن زیر ۶۰ کیلوگرم، یا کراتینین بالای ۱۳۳.',
      },
    ],
  },
  {
    id: 'prod-plavix-75mg',
    brandName: 'Plavix 75mg',
    genericName: 'Clopidogrel Hydrogen Sulfate',
    activeIngredients: 'Clopidogrel 75mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Iscover', 'Clopidogrel Sandoz', 'Coplavix (with Aspirin)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'P2Y12 platelet inhibitor for prevention of atherothrombotic events post-myocardial infarction, stroke, or acute coronary syndrome (ACS).',
      fa: 'مهارکننده تجمع پلاکتی P2Y12 برای پیشگیری ثانویه پس از سکته قلبی، سکته مغزی، استنت‌گذاری و سندرم حاد کرونری.',
    },
    counselingPoints: [
      {
        en: 'Take once daily with or without food. Avoid omeprazole or esomeprazole as they inhibit CYP2C19 activation; use pantoprazole instead if PPI is required.',
        fa: 'روزی یک بار مصرف شود. از مصرف همزمان امپرازول خودداری شود (فعال‌سازی دارو را مهار می‌کند)؛ در صورت نیاز به محافظ معده از پنتوپرازول استفاده شود.',
      },
    ],
  },
  {
    id: 'prod-cartia-100mg',
    brandName: 'Cartia 100mg Duentric',
    genericName: 'Aspirin (Low Dose Antiplatelet)',
    activeIngredients: 'Aspirin 100mg enteric coated tablet',
    packSize: '84 Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Astrix 100mg', 'Cardiprin 100mg'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Secondary prevention of cardiovascular events, transient ischemic attack (TIA), and ischemic stroke in high-risk patients.',
      fa: 'پیشگیری ثانویه از حوادث قلبی عروقی، حملات ایسکمیک گذرا (TIA) و سکته مغزی در بیماران پرخطر.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet daily with food. Swallow whole, do not crush or chew (duentric coating protects stomach lining).',
        fa: 'روزی ۱ قرص همراه با غذا بلعیده شود. خرد یا جویده نشود تا پوشش محافظ معده آن حفظ گردد.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-2-3: Heart Failure & Antiarrhythmics
  // -------------------------------------------------------------
  {
    id: 'prod-lanoxin-pg-62-5mcg',
    brandName: 'Lanoxin-PG 62.5mcg',
    genericName: 'Digoxin',
    activeIngredients: 'Digoxin 62.5 micrograms tablet',
    packSize: '200 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Management of chronic heart failure and rate control in persistent/permanent atrial fibrillation.',
      fa: 'درمان نارسایی مزمن قلبی و کنترل ضربان قلب در فیبریلاسیون دهلیزی (AF).',
    },
    counselingPoints: [
      {
        en: 'Narrow Therapeutic Index (NTI). Hypokalemia increases toxicity risk substantially.',
        fa: 'داروی با پنجره درمانی باریک (NTI): افت پتاسیم ناشی از دیورتیک‌ها خطر سمیت قلبی را به شدت بالا می‌برد.',
      },
      {
        en: 'Report toxicity signs: nausea, loss of appetite, visual halos (yellow-green), and severe bradycardia.',
        fa: 'علائم سمیت: تهوع، بی‌اشتهایی، دیدن هاله‌های زرد-سبز و کندی شدید ضربان قلب.',
      },
    ],
  },
  {
    id: 'prod-concor-5mg',
    brandName: 'Concor 5mg',
    genericName: 'Bisoprolol Fumarate',
    activeIngredients: 'Bisoprolol fumarate 5mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Biprole', 'Bisoprolol Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Cardioselective beta-1 blocker for heart failure with reduced ejection fraction (HFrEF), hypertension, and angina.',
      fa: 'مسدودکننده اختصاصی گیرنده بتا-۱ برای نارسایی قلبی (HFrEF)، فشار خون بالا و آنژین صدری.',
    },
    counselingPoints: [
      {
        en: 'Take once daily in the morning with food. Do not stop abruptly as rebound tachycardia and ischemia may occur.',
        fa: 'صبح‌ها همراه با صبحانه مصرف شود. قطع ناگهانی دارو به دلیل خطر بازگشت شدید تپش قلب و فشارخون ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-aldactone-25mg',
    brandName: 'Aldactone 25mg',
    genericName: 'Spironolactone',
    activeIngredients: 'Spironolactone 25mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Spiractin', 'Spironolactone Sandoz'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Mineralocorticoid receptor antagonist (MRA) for heart failure with reduced ejection fraction, resistant hypertension, and edema/ascites.',
      fa: 'آنتاگونیست گیرنده آلدوسترون (MRA) و دیورتیک نگه‌دارنده پتاسیم در نارسایی قلبی و فشارخون مقاوم.',
    },
    counselingPoints: [
      {
        en: 'Take in the morning with food. Avoid potassium-rich supplements and monitor for hyperkalemia, especially when combined with ACEI/ARB.',
        fa: 'صبح‌ها همراه غذا میل شود. سطح پتاسیم خون و کراتینین به خصوص در ترکیب با ACEI/ARB باید پایش شود.',
      },
    ],
  },
  {
    id: 'prod-cordarone-x-200mg',
    brandName: 'Cordarone X 200mg',
    genericName: 'Amiodarone Hydrochloride',
    activeIngredients: 'Amiodarone HCl 200mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-18', 'CAL-A'],
    indications: {
      en: 'Class III antiarrhythmic for severe ventricular arrhythmias, supraventricular tachycardias, and rhythm/rate control in AF.',
      fa: 'داروی ضدآریتمی کلاس ۳ برای آریتمی‌های شدید بطنی، تاکی‌کاردی فوق بطنی و کنترل ریتم در فیبریلاسیون دهلیزی.',
    },
    counselingPoints: [
      {
        en: 'Extremely long half-life (~50 days). Requires regular thyroid function tests (TFT), liver function tests (LFT), chest X-ray, and eye exams.',
        fa: 'نیمه‌عمر بسیار طولانی (~۵۰ روز). نیازمند آزمایش‌های دوره‌ای تیروئید، کبد، عکس قفسه سینه (خطر فیبروز ریه) و معاینه چشم است.',
      },
      {
        en: 'Causes photosensitivity (CAL-18): protect skin from sunlight and avoid UV exposure.',
        fa: 'حساسیت شدید به نور خورشید ایجاد می‌کند؛ استفاده از ضدآفتاب و لباس پوشیده الزامی است.',
      },
    ],
  },
  {
    id: 'prod-nitrolingual-spray',
    brandName: 'Nitrolingual Pumpspray 400mcg',
    genericName: 'Glyceryl Trinitrate (GTN)',
    activeIngredients: 'Glyceryl trinitrate 400 micrograms per metered spray',
    packSize: '200 Doses Sublingual Spray',
    schedule: 'S3',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Rapid sublingual treatment and prophylaxis of acute angina pectoris attacks.',
      fa: 'تسکین سریع زیرزبانی و پیشگیری از حملات حاد آنژین صدری (درد قلبی).',
    },
    counselingPoints: [
      {
        en: 'Sit down before spraying under the tongue to prevent fainting (postural hypotension). Spray 1-2 puffs; if pain persists after 5 mins, repeat. If still present at 10 mins, call 000 ambulance immediately.',
        fa: 'قبل از مصرف حتماً بنشینید (به علت افت فشار خون). ۱ الی ۲ پاف زیر زبان؛ در صورت ادامه درد پس از ۵ دقیقه تکرار شود؛ اگر بعد از ۱۰ دقیقه درد باقی ماند فوراً با اورژانس تماس بگیرید.',
      },
      {
        en: 'Strictly contraindicated with phosphodiesterase-5 (PDE5) inhibitors like sildenafil or tadalafil (fatal hypotension risk).',
        fa: 'مصرف همزمان با داروهای ناتوانی جنسی مانند سیلدنافیل یا تادالافیل اکیداً ممنوع و مرگبار است.',
      },
    ],
  },
  {
    id: 'prod-forxiga-10mg',
    brandName: 'Forxiga 10mg',
    genericName: 'Dapagliflozin',
    activeIngredients: 'Dapagliflozin 10mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Jardiance (Empagliflozin)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'SGLT2 inhibitor indicated for heart failure across all ejection fractions (HFrEF/HFpEF), chronic kidney disease (CKD), and type 2 diabetes.',
      fa: 'مهارکننده SGLT2، ستون اصلی درمان نارسایی قلبی (کسر تخلیه‌ای کاهش‌یافته و حفظ‌شده)، بیماری مزمن کلیه (CKD) و دیابت نوع ۲.',
    },
    counselingPoints: [
      {
        en: 'Take once daily in the morning. Maintain good hydration and genital hygiene (risk of mycotic genital infections and euglycemic DKA during illness/surgery).',
        fa: 'صبح‌ها روزی ۱ بار مصرف شود. نوشیدن آب کافی و بهداشت فردی رعایت شود؛ در بیماری‌های حاد و جراحی‌ها به دلیل خطر DKA باید موقتاً قطع شود.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-2-4: Lipid-Lowering & Statins
  // -------------------------------------------------------------
  {
    id: 'prod-lipitor-20mg',
    brandName: 'Lipitor 20mg',
    genericName: 'Atorvastatin Calcium',
    activeIngredients: 'Atorvastatin 20mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Lorstat', 'Atorvachol', 'Trovas'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Reduction of LDL cholesterol and prevention of cardiovascular events in hypercholesterolemia and CAD.',
      fa: 'کاهش کلسترول LDL و پیشگیری از حوادث قلبی عروقی در هایپرکلسترولمی و بیماران پرخطر.',
    },
    counselingPoints: [
      {
        en: 'Report any unexplained muscle pain, tenderness, weakness, or dark brown urine immediately.',
        fa: 'در صورت احساس درد، کوفتگی یا ضعف عضلانی بدون دلیل و یا تیره شدن رنگ ادرار فوراً به پزشک اطلاع داده شود.',
      },
      {
        en: 'Avoid excessive grapefruit juice as it inhibits CYP3A4 metabolism, increasing myopathy risk.',
        fa: 'از مصرف زیاد آب گریپ‌فروت خودداری شود زیرا غلظت خونی دارو و خطر آسیب عضلانی را بالا می‌برد.',
      },
    ],
  },
  {
    id: 'prod-crestor-10mg',
    brandName: 'Crestor 10mg',
    genericName: 'Rosuvastatin Calcium',
    activeIngredients: 'Rosuvastatin calcium 10mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Rosuva', 'Chemist Own Rosuvastatin', 'Rosuvastatin Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Potent hydrophilic statin for primary hypercholesterolemia, mixed dyslipidemia, and atherosclerotic risk reduction.',
      fa: 'استاتین پرقدرت هیدروفیلیک برای درمان کلسترول بالا، دیس‌لیپیدمی مختلط و پیشگیری از تصلب شرایین.',
    },
    counselingPoints: [
      {
        en: 'Can be taken at any time of the day with or without food (long half-life ~19h). Minimal CYP3A4 interaction compared to other statins.',
        fa: 'در هر زمان از شبانه‌روز با یا بدون غذا قابل مصرف است (نیمه‌عمر طولانی ۱۹ ساعت) و تداخلات سیتوکرومی کمتری دارد.',
      },
    ],
  },
  {
    id: 'prod-ezetrol-10mg',
    brandName: 'Ezetrol 10mg',
    genericName: 'Ezetimibe',
    activeIngredients: 'Ezetimibe 10mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Ezemibe', 'Rosuzet / Atozet (combination with statin)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Selective inhibitor of intestinal cholesterol absorption (NPC1L1) used alone or added to a statin when LDL targets are unmet.',
      fa: 'مهارکننده انتخابی جذب کلسترول در روده (NPC1L1) به تنهایی یا همراه با استاتین جهت رسیدن به هدف LDL.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet daily with or without food. If taking a bile acid sequestrant (cholestyramine), take ezetimibe at least 2 hours before or 4 hours after.',
        fa: 'روزی ۱ قرص با یا بدون غذا مصرف شود؛ در صورت مصرف کلستیرامین، حداقل ۲ ساعت قبل یا ۴ ساعت بعد مصرف گردد.',
      },
    ],
  },
  {
    id: 'prod-lipirex-145mg',
    brandName: 'Lipirex 145mg',
    genericName: 'Fenofibrate (Nanoparticle)',
    activeIngredients: 'Fenofibrate 145mg nanoparticle tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Fenofibrate Sandoz', 'Lipanthyl'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'PPAR-alpha activator for severe hypertriglyceridemia (reduces pancreatitis risk) and mixed hyperlipidemia.',
      fa: 'فعال‌کننده گیرنده PPAR-alpha برای کاهش شدید تری‌گلیسرید خون و پیشگیری از پانکراتیت حاد.',
    },
    counselingPoints: [
      {
        en: 'The 145mg nanoparticle formulation can be taken with or without food. Monitor serum creatinine and muscle symptoms if co-prescribed with a statin.',
        fa: 'فرمولاسیون نانوذره ۱۴۵ میلی‌گرم با یا بدون غذا قابل مصرف است. در مصرف همزمان با استاتین عملکرد کلیه و عضلات بررسی شود.',
      },
    ],
  },
  {
    id: 'prod-zocor-20mg',
    brandName: 'Zocor 20mg',
    genericName: 'Simvastatin',
    activeIngredients: 'Simvastatin 20mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-2',
    subcategoryId: 'sub-2-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Roximycin', 'Simvastatin Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'HMG-CoA reductase inhibitor for primary hypercholesterolemia and coronary heart disease.',
      fa: 'مهارکننده آنزیم HMG-CoA ردوکتاز برای کاهش کلسترول و پیشگیری از بیماری عروق کرونر.',
    },
    counselingPoints: [
      {
        en: 'Take in the evening or at bedtime (short half-life ~2-3 hours coincides with peak hepatic cholesterol synthesis at night). Avoid grapefruit juice.',
        fa: 'حتماً شب‌ها هنگام خواب مصرف شود زیرا نیمه‌عمر کوتاهی دارد و بیشترین ساخت کلسترول در کبد هنگام شب است.',
      },
    ],
  },
  // CAT 3: CNS & Mental Health
  // -------------------------------------------------------------
  // sub-3-1: Antidepressants, SSRIs, SNRIs & Mood
  // -------------------------------------------------------------
  {
    id: 'prod-lexapro-10mg',
    brandName: 'Lexapro 10mg',
    genericName: 'Escitalopram',
    activeIngredients: 'Escitalopram Oxalate 10mg tablet',
    packSize: '28 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Esipram', 'Loxalate', 'Cipralex'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Treatment of major depressive disorder, generalized anxiety disorder (GAD), panic disorder, and social phobia.',
      fa: 'درمان اختلال افسردگی اساسی، اختلال اضطراب فراگیر (GAD)، اختلال پانیک و اضطراب اجتماعی.',
    },
    counselingPoints: [
      {
        en: 'Full therapeutic antidepressant effect typically takes 2 to 4 weeks.',
        fa: 'اثرات درمانی کامل معمولاً ۲ الی ۴ هفته پس از شروع مصرف منظم ظاهر می‌شود.',
      },
      {
        en: 'Do not discontinue abruptly; taper gradually to avoid discontinuation syndrome (electric shock sensations, dizziness).',
        fa: 'از قطع ناگهانی خودداری شود؛ کاهش تدریجی دوز جهت پیشگیری از علائم ترک (حس شوک الکتریکی، سرگیجه) الزامی است.',
      },
    ],
  },
  {
    id: 'prod-efexor-xr-75mg',
    brandName: 'Efexor-XR 75mg',
    genericName: 'Venlafaxine Hydrochloride',
    activeIngredients: 'Venlafaxine HCl 75mg extended-release capsule',
    packSize: '28 Extended-Release Capsules',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Eleva', 'Venlafaxine Sandoz', 'Venlafaxine GH'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Serotonin and noradrenaline reuptake inhibitor (SNRI) for major depressive disorder, GAD, social anxiety, and panic disorder.',
      fa: 'مهارکننده بازجذب سروتونین و نوراپی‌نفرین (SNRI) برای افسردگی اساسی، اضطراب فراگیر، فوبیای اجتماعی و پانیک.',
    },
    counselingPoints: [
      {
        en: 'Take once daily with food, at approximately the same time each day. Swallow whole, do not crush, chew, or dissolve.',
        fa: 'روزی یک بار همراه با غذا میل شود. کپسول را به طور کامل ببلعید و از خرد کردن یا جویدن دانه‌های داخل آن خودداری نمایید.',
      },
      {
        en: 'Monitor blood pressure regularly (dose-dependent noradrenergic hypertension risk, especially >150mg/day).',
        fa: 'فشار خون باید به طور منظم پایش شود (خطر افزایش وابسته به دوز فشار خون ناشی از اثر نوراپی‌نفرین).',
      },
    ],
  },
  {
    id: 'prod-endep-25mg',
    brandName: 'Endep 25mg',
    genericName: 'Amitriptyline Hydrochloride',
    activeIngredients: 'Amitriptyline HCl 25mg tablet',
    packSize: '50 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Entrip', 'Amitriptyline Sandoz'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Tricyclic antidepressant (TCA) for major depression, neuropathic pain management, and migraine/tension headache prophylaxis.',
      fa: 'ضدافسردگی سه‌حلقه‌ای (TCA) برای درمان افسردگی، دردهای نوروپاتیک مزمن و پیشگیری از سردردهای میگرنی و تنشی.',
    },
    counselingPoints: [
      {
        en: 'Take at bedtime due to pronounced sedative properties. Anticholinergic effects common: dry mouth, constipation, blurred vision, urinary retention.',
        fa: 'به دلیل خاصیت خواب‌آوری قوی ترجیحاً شب‌ها قبل از خواب میل شود. عوارض آنتی‌کولینرژیک شایع: خشکی دهان، یبوست و تاری دید.',
      },
      {
        en: 'Highly cardiotoxic in overdose (fatal QTc prolongation, arrhythmias, and seizures).',
        fa: 'مصرف بیش از حد (اوردوز) به شدت برای قلب سمی و کشنده است (خطر آریتمی و ایست قلبی).',
      },
    ],
  },
  {
    id: 'prod-avanza-30mg',
    brandName: 'Avanza 30mg (SolTab / Film-Coated)',
    genericName: 'Mirtazapine',
    activeIngredients: 'Mirtazapine 30mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Avanza SolTab', 'Mirtazapine Sandoz', 'Mirtazon'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Noradrenergic and specific serotonergic antidepressant (NaSSA) for major depressive episodes, particularly with prominent insomnia and weight loss.',
      fa: 'ضدافسردگی NaSSA انتخابی برای درمان افسردگی اساسی همراه با بی‌خوابی شدید و کاهش وزن.',
    },
    counselingPoints: [
      {
        en: 'Take as a single dose strictly at bedtime due to prominent H1-antihistamine sedative effect. Sedation is often paradoxically more intense at lower doses (7.5-15mg).',
        fa: 'حتماً شب‌ها هنگام خواب مصرف شود. خواب‌آوری دارو در دوزهای پایین‌تر (۷.۵ تا ۱۵ میلی‌گرم) به دلیل اثر آنتی‌هیستامینی بیشتر است.',
      },
      {
        en: 'Appetite stimulation and significant weight gain are common class side effects.',
        fa: 'افزایش اشتها و افزایش وزن از عوارض جانبی شایع و برجسته این دارو هستند.',
      },
    ],
  },
  {
    id: 'prod-prozac-20mg',
    brandName: 'Prozac 20mg',
    genericName: 'Fluoxetine Hydrochloride',
    activeIngredients: 'Fluoxetine HCl 20mg capsule',
    packSize: '28 Capsules',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Lovan', 'Zactin', 'Fluohexal'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'SSRI indicated for major depression, obsessive-compulsive disorder (OCD), and bulimia nervosa.',
      fa: 'داروی SSRI برای درمان افسردگی اساسی، اختلال وسواس جبری (OCD) و پرخوری عصبی (بولیمیا).',
    },
    counselingPoints: [
      {
        en: 'Take in the morning with breakfast as it can be activating and cause insomnia if taken late.',
        fa: 'صبح‌ها همراه با صبحانه مصرف شود زیرا اثرات انرژی‌بخش دارد و در صورت مصرف شبانه مانع خواب می‌شود.',
      },
      {
        en: 'Very long elimination half-life (active metabolite norfluoxetine ~7-15 days). Requires a 5-week washout period before initiating an MAOI.',
        fa: 'نیمه‌عمر بسیار طولانی دارد (متابولیت فعال تا ۲ هفته در بدن می‌ماند)؛ قبل از شروع داروی مهارکننده MAO حداقل ۵ هفته فاصله زمانی نیاز است.',
      },
    ],
  },
  {
    id: 'prod-lithicarb-250mg',
    brandName: 'Lithicarb 250mg',
    genericName: 'Lithium Carbonate',
    activeIngredients: 'Lithium Carbonate 250mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-1',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Mood stabilizer for acute mania and maintenance treatment/prophylaxis of bipolar affective disorder; reduces suicide risk.',
      fa: 'تثبیت‌کننده خلق برای درمان فاز حاد مانیا، پیشگیری از عود اختلال دوقطبی و کاهش خطرات خودکشی.',
    },
    counselingPoints: [
      {
        en: 'Strict Narrow Therapeutic Index (NTI). 12-hour post-dose serum trough level target is strictly 0.6 - 0.8 mmol/L (acute mania 0.8 - 1.0 mmol/L).',
        fa: 'داروی با پنجره درمانی بسیار باریک (NTI): سطح خونی ۱۲ ساعت پس از مصرف باید دقیقاً بین ۰.۶ تا ۰.۸ میلی‌مول در لیتر پایش شود.',
      },
      {
        en: 'Maintain steady fluid and dietary sodium intake; dehydration, NSAIDs, ACE inhibitors, and diuretics drastically increase lithium levels and toxicity.',
        fa: 'میزان مصرف آب و نمک در رژیم غذایی باید یکنواخت باشد؛ کم‌آبی و مصرف داروهای NSAID، کاپتوپریل/انالاپریل و دیورتیک‌ها خطر سمیت مرگبار را به شدت افزایش می‌دهند.',
      },
      {
        en: 'Toxicity signs: coarse hand tremor, vomiting, diarrhea, slurred speech, ataxia, confusion. Seek urgent medical care.',
        fa: 'علائم مسمومیت: لرزش درشت دست‌ها، اسهال و استفراغ، اختلال تکلم، عدم تعادل و گیجی.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-3-2: Antiepileptics & Neuropathic Pain
  // -------------------------------------------------------------
  {
    id: 'prod-epilim-500mg',
    brandName: 'Epilim 500mg EC',
    genericName: 'Sodium Valproate',
    activeIngredients: 'Sodium Valproate 500mg enteric coated tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-2',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Treatment of primary generalized epilepsy, partial seizures, and mania associated with bipolar disorder.',
      fa: 'درمان انواع تشنج و صرع، و مدیریت فاز شیدایی (مانیا) در اختلال دوقطبی.',
    },
    counselingPoints: [
      {
        en: 'Strictly contraindicated in pregnancy and women of childbearing potential unless Pregnancy Prevention Program is in place.',
        fa: 'در دوران بارداری و زنان در سنین باروری به دلیل خطر تراتوژنیسیته بسیار بالا اکیداً ممنوع است.',
      },
      {
        en: 'Swallow whole with a full glass of water; do not crush or chew.',
        fa: 'قرص‌ها باید به صورت کامل با یک لیوان آب بلعیده شوند؛ از جویدن یا خرد کردن پرهیز شود.',
      },
    ],
  },
  {
    id: 'prod-lyrica-75mg',
    brandName: 'Lyrica 75mg',
    genericName: 'Pregabalin',
    activeIngredients: 'Pregabalin 75mg capsule',
    packSize: '56 Capsules',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Pregabalin Sandoz', 'Pregabalin GH'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'First-line therapy for peripheral neuropathic pain (diabetic peripheral neuropathy, post-herpetic neuralgia) and generalized anxiety disorder (GAD).',
      fa: 'خط اول درمان دردهای نوروپاتیک محیطی (نوروپاتی دیابتی، دردهای پس از زونا) و اختلال اضطراب فراگیر.',
    },
    counselingPoints: [
      {
        en: 'Take twice daily with or without food. Common initial side effects include dizziness, somnolence, and peripheral edema.',
        fa: 'روزی ۲ بار با یا بدون غذا میل شود. سرگیجه، خواب‌آلودگی و ورم اندام‌ها در شروع درمان شایع است.',
      },
      {
        en: 'Monitored medicine (SafeScript/QScript in Australia) due to potential misuse and dependence. Do not stop abruptly.',
        fa: 'تحت نظارت سامانه‌های مانیتورینگ دارویی؛ به هیچ عنوان نباید به طور ناگهانی قطع شود.',
      },
    ],
  },
  {
    id: 'prod-tegretol-200mg',
    brandName: 'Tegretol 200mg',
    genericName: 'Carbamazepine',
    activeIngredients: 'Carbamazepine 200mg tablet',
    packSize: '200 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-2',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'First-line anticonvulsant for focal (partial) seizures, primary treatment of trigeminal neuralgia, and bipolar prophylaxis.',
      fa: 'داروی خط اول صرع و تشنج‌های کانونی، درمان اختصاصی نورالژی عصب سه‌قلو (Trigeminal Neuralgia) و دوقطبی.',
    },
    counselingPoints: [
      {
        en: 'Potent CYP3A4 auto-inducer and inducer of other hepatic enzymes; lowers efficacy of oral contraceptives and warfarin.',
        fa: 'القاکننده قوی آنزیم‌های کبدی (CYP)؛ اثر قرص‌های ضدبارداری و وارفارین را به شدت کاهش می‌دهد.',
      },
      {
        en: 'Report any fever, sore throat, or skin rash immediately (severe cutaneous adverse reactions SJS/TEN; HLA-B*1502 screening in Asian descent).',
        fa: 'در صورت بروز هرگونه راش پوستی، تب یا گلودرد فوراً مصرف قطع و به پزشک مراجعه شود (خطر سندرم مرگبار استیونز-جانسون).',
      },
    ],
  },
  {
    id: 'prod-lamictal-50mg',
    brandName: 'Lamictal 50mg',
    genericName: 'Lamotrigine',
    activeIngredients: 'Lamotrigine 50mg dispersible/chewable tablet',
    packSize: '56 Dispersible Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Lamotrigine Sandoz', 'Lamotrigine GH'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Broad-spectrum antiepileptic for focal and generalized seizures, and prevention of depressive episodes in bipolar I disorder.',
      fa: 'داروی ضدتشنج وسیع‌الطیف برای صرع کانونی و جنرالیزه، و پیشگیری از فازهای افسردگی در اختلال دوقطبی نوع ۱.',
    },
    counselingPoints: [
      {
        en: 'Strict slow dose escalation required to minimize the risk of serious, potentially life-threatening skin rashes (SJS/TEN).',
        fa: 'افزایش دوز دارو باید بسیار آهسته و طبق برنامه مشخص انجام شود تا خطر بروز راش‌های پوستی خطرناک (SJS) به حداقل برسد.',
      },
      {
        en: 'Significant drug interaction with sodium valproate (valproate inhibits lamotrigine glucuronidation, doubling lamotrigine levels; requires >50% dose reduction).',
        fa: 'تداخل دارویی شدید با سدیم والپروات دارد (والپروات غلظت لاموتریژین را دو برابر می‌کند و دوز لاموتریژین باید به نصف کاهش یابد).',
      },
    ],
  },
  {
    id: 'prod-keppra-500mg',
    brandName: 'Keppra 500mg',
    genericName: 'Levetiracetam',
    activeIngredients: 'Levetiracetam 500mg film-coated tablet',
    packSize: '60 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Levetiracetam Sandoz', 'Levetiracetam GH'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Anticonvulsant for focal onset seizures with or without secondary generalization, myoclonic seizures, and primary generalized tonic-clonic seizures.',
      fa: 'داروی ضدصرع برای تشنج‌های فوکال، تشنج‌های میوکلونیک و تونیک-کلونیک جنرالیزه.',
    },
    counselingPoints: [
      {
        en: 'Take twice daily with or without food. Minimal hepatic CYP metabolism (eliminated primarily unchanged by kidneys).',
        fa: 'روزی ۲ بار با یا بدون غذا مصرف شود. تداخلات سیتوکرومی کبدی بسیار اندکی دارد و عمدتاً از طریق کلیه دفع می‌شود.',
      },
      {
        en: 'Monitor for behavioral and psychiatric adverse effects including irritability, mood swings, aggression, depression, or suicidal ideation.',
        fa: 'از نظر تغییرات خلقی، پرخاشگری، تحریک‌پذیری عصبی و افسردگی باید بیمار تحت نظر باشد.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-3-3: Sedatives, Hypnotics & Anxiolytics
  // -------------------------------------------------------------
  {
    id: 'prod-valium-5mg',
    brandName: 'Valium 5mg',
    genericName: 'Diazepam',
    activeIngredients: 'Diazepam 5mg tablet',
    packSize: '50 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Antenex', 'Diazepam Sandoz', 'Ducene'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Long-acting benzodiazepine for short-term relief of severe anxiety, muscle spasm, and acute alcohol withdrawal symptoms.',
      fa: 'بنزودیازپین طولانی‌اثر برای درمان کوتاه‌مدت اضطراب شدید، اسپاسم‌های عضلانی حاد و کنترل علائم ترک الکل.',
    },
    counselingPoints: [
      {
        en: 'Strictly for short-term use (2 to 4 weeks maximum) to prevent physical dependence, tolerance, and addiction.',
        fa: 'حداکثر برای مصرف کوتاه‌مدت ۲ تا ۴ هفته توصیه می‌شود تا از وابستگی جسمی، تحمل و اعتیاد دارویی پیشگیری شود.',
      },
      {
        en: 'Do not drink alcohol or combine with opioids/other sedatives (high risk of fatal respiratory depression).',
        fa: 'همزمان با الکل یا داروهای ضددرد مخدر مصرف نشود (خطر مرگبار ایست تنفسی و کوما).',
      },
    ],
  },
  {
    id: 'prod-stilnox-10mg',
    brandName: 'Stilnox 10mg',
    genericName: 'Zolpidem Tartrate',
    activeIngredients: 'Zolpidem Tartrate 10mg tablet',
    packSize: '14 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Dormizol', 'Zolpibell'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Non-benzodiazepine hypnotic (Z-drug) for the short-term treatment of debilitating insomnia in adults.',
      fa: 'داروی خواب‌آور غیربنزودیازپینی (Z-drug) برای درمان کوتاه‌مدت بی‌خوابی شدید در بزرگسالان.',
    },
    counselingPoints: [
      {
        en: 'Take immediately before going to bed on an empty stomach. Ensure at least 7-8 hours of uninterrupted sleep.',
        fa: 'دقیقاً قبل از رفتن به رختخواب با معده خالی مصرف شود. باید شرایط حداقل ۷ تا ۸ ساعت خواب پیوسته فراهم باشد.',
      },
      {
        en: 'Warning: Can cause complex sleep-related behaviors (sleepwalking, sleep-driving, preparing food while asleep with amnesia). Discontinue immediately if experienced.',
        fa: 'هشدار: ممکن است رفتارهای پیچیده در خواب (مانند راه رفتن یا رانندگی در خواب بدون هوشیاری) ایجاد کند؛ در صورت بروز فوراً قطع شود.',
      },
    ],
  },
  {
    id: 'prod-temaze-10mg',
    brandName: 'Temaze 10mg',
    genericName: 'Temazepam',
    activeIngredients: 'Temazepam 10mg tablet',
    packSize: '25 Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Normison', 'Temazepam Sandoz'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Intermediate-acting benzodiazepine for short-term management of transient and severe insomnia.',
      fa: 'بنزودیازپین با اثر متوسط برای درمان کوتاه‌مدت بی‌خوابی گذرا و شدید.',
    },
    counselingPoints: [
      {
        en: 'Take 30 minutes before retiring to bed. Limit use to consecutive 7-14 days. Avoid next-day driving if feeling drowsy or hungover.',
        fa: 'نیم ساعت قبل از خواب میل شود. دوره مصرف به ۷ تا ۱۴ روز محدود گردد. در صورت احساس خواب‌آلودگی صبحگاهی از رانندگی خودداری شود.',
      },
    ],
  },
  {
    id: 'prod-circadin-2mg',
    brandName: 'Circadin 2mg PR',
    genericName: 'Melatonin (Prolonged Release)',
    activeIngredients: 'Melatonin 2mg prolonged-release tablet',
    packSize: '30 Prolonged-Release Tablets',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Monotherapy for the short-term treatment of primary insomnia characterized by poor quality of sleep in patients aged 55 or older.',
      fa: 'ملاتونین آهسته‌رهش برای درمان بی‌خوابی اولیه ناشی از اختلال ریتم شبانه‌روزی به ویژه در افراد بالای ۵۵ سال.',
    },
    counselingPoints: [
      {
        en: 'Take 1 tablet 1 to 2 hours before bedtime after food. Swallow whole; do not crush or chew (prolonged-release matrix).',
        fa: '۱ قرص ۱ تا ۲ ساعت قبل از خواب پس از غذا مصرف شود. قرص را کامل ببلعید و از خرد کردن یا جویدن آن خودداری کنید.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-3-4: Opioid Analgesia & Pain Management
  // -------------------------------------------------------------
  {
    id: 'prod-nyxoid-nasal-spray',
    brandName: 'Nyxoid Nasal Spray 1.8mg',
    genericName: 'Naloxone Hydrochloride',
    activeIngredients: 'Naloxone HCl 1.8mg single-dose nasal spray',
    packSize: '2 Single-Dose Dispensers',
    schedule: 'S3',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Emergency treatment for known or suspected opioid overdose with respiratory depression.',
      fa: 'پادزهر و درمان اورژانسی مسمومیت و تضعیف تنفسی ناشی از مصرف بیش از حد اپیوئیدها.',
    },
    counselingPoints: [
      {
        en: 'Administer 1 spray into one nostril immediately if opioid overdose is suspected. Call 000 ambulance immediately.',
        fa: 'در صورت شک به اوردوز اپیوئید، بلافاصله یک پاف در یک سوراخ بینی اسپری کرده و با آمبولانس ۰۰۰ تماس بگیرید.',
      },
      {
        en: 'If no response within 2-3 minutes, administer the second spray in the other nostril.',
        fa: 'اگر بیمار طی ۲ تا ۳ دقیقه پاسخ نداد، اسپری دوم را در سوراخ دیگر بینی تخلیه کنید.',
      },
    ],
  },
  {
    id: 'prod-durogesic-25mcg',
    brandName: 'Durogesic 25mcg/hr Patch',
    genericName: 'Fentanyl (Transdermal)',
    activeIngredients: 'Fentanyl 4.2mg transdermal patch (releases 25 micrograms/hour over 72 hours)',
    packSize: '5 Transdermal Patches',
    schedule: 'S8',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-4',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Schedule 8 Controlled Drug for chronic intractable cancer and non-cancer pain in opioid-tolerant patients ONLY.',
      fa: 'داروی مخدر کنترل‌شده (Schedule 8) برای دردهای مزمن شدید و سرطانی منحصراً در بیماران مقاوم به اپیوئید (Opioid-Tolerant).',
    },
    counselingPoints: [
      {
        en: 'Apply to clean, dry, non-hairy skin of upper torso. Change every 72 hours (3 days). Rotate application sites.',
        fa: 'روی پوست تمیز، خشک و بدون مو در بالاتنه چسبانده شود. هر ۷۲ ساعت (۳ روز یک بار) تعویض و محل چسباندن چرخانده شود.',
      },
      {
        en: 'DANGER: Keep strictly away from direct external heat (electric blankets, hot baths, saunas, fever) as heat drastically accelerates lethal fentanyl release and absorption.',
        fa: 'خطر مرگبار: از قرار دادن هرگونه منبع گرما (پتو برقی، کیسه آب گرم، سونا، حمام داغ یا تب بالا) بر روی پچ اکیداً خودداری شود چون آزادسازی ناگهانی و کشنده دارو رخ می‌دهد.',
      },
      {
        en: 'Fold used patch in half (adhesive sides sticking together) and dispose of safely out of reach of children.',
        fa: 'پچ مصرف‌شده را از وسط تا کنید تا طرف‌های چسبناک به هم بچسبند و آن را در محلی دور از دسترس کودکان و حیوانات امحا کنید.',
      },
    ],
  },
  {
    id: 'prod-targin-10-5mg',
    brandName: 'Targin 10mg/5mg PR',
    genericName: 'Oxycodone Hydrochloride + Naloxone Hydrochloride',
    activeIngredients: 'Oxycodone HCl 10mg + Naloxone HCl 5mg prolonged-release tablet',
    packSize: '28 Prolonged-Release Tablets',
    schedule: 'S8',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Schedule 8 strong opioid combination for severe chronic pain; naloxone blocks local gut opioid receptors to prevent opioid-induced constipation (OIC).',
      fa: 'داروی مسکن مخدر S8 ترکیبی جهت درمان دردهای مزمن؛ نالوکسون گیرنده‌های اپیوئیدی روده را مسدود کرده و از یبوست شدید پیشگیری می‌کند.',
    },
    counselingPoints: [
      {
        en: 'Take strictly 12 hours apart with or without food. Swallow whole; do NOT break, chew, or crush, as this destroys the controlled-release mechanism and causes fatal overdose.',
        fa: 'دقیقاً هر ۱۲ ساعت یک بار مصرف شود. قرص را کاملاً درسته ببلعید؛ از شکستن، جویدن یا حل کردن آن خودداری کنید زیرا باعث آزادسازی ناگهانی و مسمومیت کشنده می‌شود.',
      },
    ],
  },
  {
    id: 'prod-endone-5mg',
    brandName: 'Endone 5mg',
    genericName: 'Oxycodone Hydrochloride (Immediate Release)',
    activeIngredients: 'Oxycodone HCl 5mg tablet',
    packSize: '20 Tablets',
    schedule: 'S8',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['OxyNorm 5mg', 'Proladone'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Schedule 8 opioid for short-term management of moderate to severe acute pain or breakthrough pain in palliative care.',
      fa: 'مسکن مخدر سریع‌الاثر S8 برای تسکین کوتاه‌مدت دردهای حاد شدید پس از جراحی یا تروما و دردهای پیش‌رونده تسکینی.',
    },
    counselingPoints: [
      {
        en: 'Take every 4 to 6 hours as needed for severe acute pain. Limit duration of therapy to the minimum necessary.',
        fa: 'در صورت نیاز هر ۴ تا ۶ ساعت برای درد حاد مصرف شود. مدت مصرف باید به کوتاه‌ترین زمان ممکن محدود گردد.',
      },
      {
        en: 'Always co-prescribe or recommend a stimulant laxative plus stool softener (e.g., Coloxyl with Senna) to prevent constipation.',
        fa: 'برای جلوگیری از یبوست ناشی از دارو مصرف ملین محرک به همراه نرم‌کننده مدفوع توصیه می‌شود.',
      },
    ],
  },
  {
    id: 'prod-tramal-50mg',
    brandName: 'Tramal 50mg',
    genericName: 'Tramadol Hydrochloride',
    activeIngredients: 'Tramadol HCl 50mg capsule',
    packSize: '20 Capsules',
    schedule: 'S4',
    categoryId: 'cat-3',
    subcategoryId: 'sub-3-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Zydol', 'Tramedo', 'Tramadol Sandoz'],
    calLabels: ['CAL-1', 'CAL-A'],
    indications: {
      en: 'Dual-action analgesic (weak mu-opioid receptor agonist + SNRI reuptake inhibitor) for moderate to severe pain.',
      fa: 'مسکن با مکانیسم دوگانه (آگونیست اپیوئیدی ضعیف + مهارکننده بازجذب سروتونین و نوراپی‌نفرین) برای دردهای متوسط تا شدید.',
    },
    counselingPoints: [
      {
        en: 'Take every 4 to 6 hours as needed (maximum 400mg in 24 hours). Lowers seizure threshold in susceptible patients.',
        fa: 'در صورت نیاز هر ۴ تا ۶ ساعت میل شود (حداکثر ۴۰۰ میلی‌گرم در ۲۴ ساعت). آستانه تشنج را کاهش می‌دهد.',
      },
      {
        en: 'High risk of life-threatening Serotonin Syndrome when combined with SSRIs, SNRIs, MAOIs, or St John’s Wort.',
        fa: 'خطر بالای بروز سندرم سروتونین در صورت مصرف همزمان با داروهای ضدافسردگی SSRI/SNRI و گیاه سنت جان ورت.',
      },
    ],
  },
  // CAT 4: Endocrine & Metabolic
  // -------------------------------------------------------------
  // sub-4-1: Diabetes Mellitus, Insulin, SGLT2i & GLP-1
  // -------------------------------------------------------------
  {
    id: 'prod-diabex-500mg',
    brandName: 'Diabex 500mg',
    genericName: 'Metformin Hydrochloride',
    activeIngredients: 'Metformin HCl 500mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Diaformin', 'Metex XR', 'Formet'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'First-line oral treatment of Type 2 Diabetes Mellitus in adults and children over 10 years.',
      fa: 'درمان دارویی خط اول در دیابت نوع ۲ در بزرگسالان و کودکان بالای ۱۰ سال.',
    },
    counselingPoints: [
      {
        en: 'Take with or immediately after meals to reduce stomach upset and nausea.',
        fa: 'همراه یا بلافاصله پس از غذا میل شود تا عوارض گوارشی و تهوع کاهش یابد.',
      },
      {
        en: 'Withhold before iodinated contrast radiology procedures due to lactic acidosis risk.',
        fa: 'قبل از تصویربرداری با ماده حاجب یددار به دلیل خطر اسیدوز لاکتیک باید قطع شود.',
      },
    ],
  },
  {
    id: 'prod-jardiance-10mg',
    brandName: 'Jardiance 10mg',
    genericName: 'Empagliflozin',
    activeIngredients: 'Empagliflozin 10mg film-coated tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Forxiga (Dapagliflozin)', 'Glyxambi (with Linagliptin)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'SGLT2 inhibitor for glycemic control in T2DM, cardiovascular mortality reduction, and heart failure / chronic kidney disease protection.',
      fa: 'مهارکننده SGLT2 برای کنترل قند خون دیابت نوع ۲، کاهش مرگ‌ومیر قلبی عروقی و محافظت از کلیه و نارسایی قلبی.',
    },
    counselingPoints: [
      {
        en: 'Take once daily in the morning with or without food. Drink plenty of water throughout the day to avoid dehydration.',
        fa: 'صبح‌ها روزی یک بار با یا بدون غذا مصرف شود. جهت جلوگیری از کم‌آبی در طول روز آب فراوان بنوشید.',
      },
      {
        en: 'Follow Sick Day Rules: temporarily withhold Jardiance during acute illness (fever, vomiting, diarrhea) or prior to surgery to prevent euglycemic DKA.',
        fa: 'قوانین روز بیماری (Sick Day Rules): در بیماری‌های حاد تب‌دار، اسهال و استفراغ شدید یا قبل از جراحی به دلیل خطر کتواسیدوز دیابتی یوگلیسمیک (euDKA) موقتاً قطع شود.',
      },
      {
        en: 'Practice good genital hygiene; prompt treatment for genital fungal infections (candida).',
        fa: 'بهداشت ناحیه تناسلی رعایت شود؛ در صورت بروز سوزش و ترشحات قارچی فوراً اقدام به درمان شود.',
      },
    ],
  },
  {
    id: 'prod-ozempic-0-5mg',
    brandName: 'Ozempic 0.5mg Pen',
    genericName: 'Semaglutide',
    activeIngredients: 'Semaglutide 1.34 mg/mL pre-filled pen (delivers 0.25mg or 0.5mg weekly doses)',
    packSize: '1 Pre-filled Pen + 6 NovoFine Plus Needles',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'GLP-1 receptor agonist indicated for the treatment of adults with insufficiently controlled Type 2 Diabetes and cardiovascular risk reduction.',
      fa: 'آگونیست گیرنده GLP-1 برای کنترل دیابت نوع ۲ و کاهش حوادث قلبی عروقی در بیماران پرخطر.',
    },
    counselingPoints: [
      {
        en: 'Inject subcutaneously once weekly into the abdomen, thigh, or upper arm on the same day each week, with or without meals.',
        fa: 'هفته‌ای یک بار به صورت زیرجلدی در شکم، ران یا بازو در روز مشخصی از هفته با یا بدون غذا تزریق شود.',
      },
      {
        en: 'Cold chain storage: Store unopened pens in refrigerator (2°C - 8°C). Once in use, the pen can be kept at room temperature (<30°C) or in the fridge for up to 56 days.',
        fa: 'زنجیره سرما: قلم‌های بازنشده در یخچال (۲ تا ۸ درجه) نگهداری شوند. قلم در حال استفاده تا ۵۶ روز در دمای اتاق زیر ۳۰ درجه قابل نگهداری است.',
      },
      {
        en: 'Common side effects include nausea, vomiting, and diarrhea, which typically lessen over time. Eat smaller meals and stay hydrated.',
        fa: 'تهوع و علائم گوارشی در شروع درمان شایع است؛ صرف وعده‌های غذایی کم‌حجم به کاهش آن کمک می‌کند.',
      },
    ],
  },
  {
    id: 'prod-diamicron-60mg-mr',
    brandName: 'Diamicron 60mg MR',
    genericName: 'Gliclazide',
    activeIngredients: 'Gliclazide 60mg modified-release tablet',
    packSize: '60 Modified-Release Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Glyade MR', 'Gliclazide Sandoz MR'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Second-generation sulfonylurea secretagogue for Type 2 Diabetes Mellitus when dietary measures and metformin alone are inadequate.',
      fa: 'سولفونیل‌اوره نسل دوم برای تحریک ترشح انسولین در دیابت نوع ۲ در صورت عدم کنترل کافی با متفورمین.',
    },
    counselingPoints: [
      {
        en: 'Take strictly with breakfast. Swallow whole; do not crush or chew.',
        fa: 'حتماً همراه با صبحانه مصرف شود. قرص را کامل ببلعید و از خرد کردن یا جویدن آن خودداری نمایید.',
      },
      {
        en: 'Risk of hypoglycemia (blood glucose < 4.0 mmol/L): Carry fast-acting carbohydrates (jelly beans, glucose tablets, fruit juice).',
        fa: 'خطر افت قند خون (هیپوگلیسمی زیر ۴): همیشه کربوهیدرات سریع‌الجذب (قرص گلوکز، آبمیوه، آبنبات) همراه داشته باشید.',
      },
    ],
  },
  {
    id: 'prod-lantus-solostar',
    brandName: 'Lantus SoloStar 100 U/mL',
    genericName: 'Insulin Glargine (Long-Acting Analog)',
    activeIngredients: 'Insulin glargine 100 units/mL solution in a 3mL pre-filled SoloStar pen',
    packSize: '5 x 3mL Pre-filled Pens',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Once-daily basal insulin analog for diabetes mellitus in adults, adolescents, and children aged 2 years and above.',
      fa: 'انسولین طولانی‌اثر پایه (بیزال) بدون پیک برای دیابت نوع ۱ و نوع ۲ یک بار در شبانه‌روز.',
    },
    counselingPoints: [
      {
        en: 'Inject subcutaneously once daily at the same time each day. Rotate injection sites systematically (abdomen, thighs, upper arms) to prevent lipohypertrophy.',
        fa: 'روزی یک بار در زمان مشخصی از شبانه‌روز تزریق زیرجلدی شود. محل تزریق را مرتباً تغییر دهید تا از ایجاد توده چربی (لیپوهیپرتروفی) پیشگیری شود.',
      },
      {
        en: 'Cold chain storage: Unopened pens stored at 2°C - 8°C (do NOT freeze). In-use pen stored at room temperature (<30°C) for up to 28 days.',
        fa: 'زنجیره سرما: قلم‌های بازنشده در یخچال (۲ تا ۸ درجه)؛ قلم در حال استفاده تا ۲۸ روز در دمای اتاق زیر ۳۰ درجه قابل نگهداری است.',
      },
      {
        en: 'Rule of 15 for Hypoglycemia: If BGL < 4.0 mmol/L, consume 15g fast carbs, wait 15 minutes, re-check BGL.',
        fa: 'قانون ۱۵ برای هیپوگلیسمی: در صورت قند زیر ۴، مصرف ۱۵ گرم قند ساده، ۱۵ دقیقه صبر و اندازه‌گیری مجدد قند خون.',
      },
    ],
  },
  {
    id: 'prod-novorapid-flexpen',
    brandName: 'NovoRapid FlexPen 100 U/mL',
    genericName: 'Insulin Aspart (Rapid-Acting Analog)',
    activeIngredients: 'Insulin aspart 100 units/mL solution in a 3mL FlexPen',
    packSize: '5 x 3mL Pre-filled FlexPens',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-1',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Rapid-acting mealtime (prandial) insulin analog for diabetes mellitus in adults and children.',
      fa: 'انسولین سریع‌الاثر سر وعده غذایی (پراندیال) برای کنترل جهش قند خون بعد از غذا در دیابت نوع ۱ و ۲.',
    },
    counselingPoints: [
      {
        en: 'Inject subcutaneously immediately (5-10 minutes) before a meal, or soon after starting the meal.',
        fa: 'بلافاصله (۵ تا ۱۰ دقیقه) قبل از شروع غذا یا بلافاصله پس از شروع غذا تزریق شود.',
      },
      {
        en: 'In-use pen can be kept at room temperature (<30°C) for up to 28 days. Protect from direct heat and sunlight.',
        fa: 'قلم در حال مصرف تا ۲۸ روز در دمای اتاق زیر ۳۰ درجه قابل نگهداری است؛ دور از تابش مستقیم آفتاب قرار گیرد.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-4-2: Osteoporosis & Bone Metabolism
  // -------------------------------------------------------------
  {
    id: 'prod-fosamax-70mg-once-weekly',
    brandName: 'Fosamax 70mg Once Weekly',
    genericName: 'Alendronate Sodium',
    activeIngredients: 'Alendronate Sodium 70mg tablet',
    packSize: '4 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Alendro', 'Osteomax', 'Fosamax Plus (with Vitamin D3)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Treatment and prevention of postmenopausal osteoporosis and osteoporosis in men to reduce vertebral and hip fracture risk.',
      fa: 'درمان و پیشگیری از پوکی استخوان (استئوپروز) در زنان یائسه و مردان جهت کاهش خطر شکستگی مهره و لگن.',
    },
    counselingPoints: [
      {
        en: 'Take first thing in the morning on an empty stomach with a full glass (≥200 mL) of plain tap water (not mineral water, tea, or juice).',
        fa: 'صبح ناشتا به محض بیدار شدن با یک لیوان کامل آب لوله‌کشی معمولی (حداقل ۲۰۰ میلی‌لیتر) میل شود؛ با چای یا آب معدنی مصرف نشود.',
      },
      {
        en: 'Remain strictly upright (sitting or standing) for at least 30 minutes and until after your first meal to prevent severe chemical esophagitis and ulceration.',
        fa: 'حداقل ۳۰ دقیقه پس از مصرف نباید دراز بکشید و باید در وضعیت کاملاً نشسته یا ایستاده بمانید تا از آسیب مری جلوگیری شود.',
      },
      {
        en: 'Do not eat, drink, or take any other medicines for at least 30 minutes after taking alendronate.',
        fa: 'تا حداقل ۳۰ دقیقه بعد از مصرف قرص، هیچ غذا، نوشیدنی یا داروی دیگری مصرف نکنید.',
      },
    ],
  },
  {
    id: 'prod-prolia-60mg-syringe',
    brandName: 'Prolia 60mg Pre-filled Syringe',
    genericName: 'Denosumab',
    activeIngredients: 'Denosumab 60mg in 1.0 mL solution for injection',
    packSize: '1 Pre-filled Syringe with needle guard',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Human monoclonal antibody (RANKL inhibitor) for osteoporosis in postmenopausal women and men at increased risk of fractures.',
      fa: 'آنتی‌بادی مونوکلونال مهارکننده RANKL برای درمان پوکی استخوان در افراد با خطر بالای شکستگی.',
    },
    counselingPoints: [
      {
        en: 'Administer as a single subcutaneous injection strictly every 6 months into the thigh, abdomen, or upper arm.',
        fa: 'هر ۶ ماه یک بار به صورت یک تزریق زیرجلدی در ران، شکم یا بازو تجویز می‌شود.',
      },
      {
        en: 'CRITICAL: Must not delay or miss doses. Discontinuation causes a rapid rebound in bone turnover and multiple vertebral fractures.',
        fa: 'بسیار حیاتی: تزریق نباید به تعویق بیفتد یا فراموش شود؛ قطع ناگهانی دنوزوماب باعث افزایش شدید تحلیل استخوان و شکستگی‌های مکرر مهره‌ها می‌شود.',
      },
      {
        en: 'Ensure adequate calcium and vitamin D intake. Inform dentist prior to invasive procedures (risk of Osteonecrosis of the Jaw - ONJ).',
        fa: 'مصرف کلسیم و ویتامین D کافی ضروری است. قبل از اعمال جراحی دندانپزشکی دندانپزشک را از مصرف دارو مطلع سازید (خطر استئونکروز فک).',
      },
    ],
  },
  {
    id: 'prod-actonel-35mg',
    brandName: 'Actonel 35mg Once-a-Week',
    genericName: 'Risedronate Sodium',
    activeIngredients: 'Risedronate Sodium 35mg film-coated tablet',
    packSize: '4 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Risedronate Sandoz', 'Actonel EC (Enteric Coated - taken with breakfast)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Pyridinyl bisphosphonate for the treatment of postmenopausal osteoporosis and Paget’s disease of bone.',
      fa: 'بیس‌فسفونات پیریدینیل برای درمان پوکی استخوان پس از یائسگی و بیماری پاژه استخوان.',
    },
    counselingPoints: [
      {
        en: 'Take once weekly in the morning with plain water, 30 minutes before food/drink, remaining upright for 30 minutes.',
        fa: 'هفته‌ای یک بار صبح ناشتا با آب معمولی، ۳۰ دقیقه قبل از صبحانه میل شود و تا ۳۰ دقیقه نباید دراز کشید.',
      },
    ],
  },
  {
    id: 'prod-caltrate-vitd-plus',
    brandName: 'Caltrate + Minerals & Vitamin D 1000IU',
    genericName: 'Calcium Carbonate + Colecalciferol',
    activeIngredients: 'Calcium Carbonate 1500mg (equiv. elemental calcium 600mg) + Colecalciferol 25 mcg (1000 IU)',
    packSize: '100 Tablets',
    schedule: 'Unscheduled',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Ostelin Calcium & Vitamin D3', 'Citracal'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Dietary supplement for prevention and treatment of calcium and vitamin D deficiency and adjunct in osteoporosis therapy.',
      fa: 'مکمل کلسیم و ویتامین D جهت پیشگیری و درمان کمبود کلسیم و درمان کمکی پوکی استخوان.',
    },
    counselingPoints: [
      {
        en: 'Take with food (calcium carbonate requires gastric acid for optimal dissolution and absorption).',
        fa: 'همراه با غذا میل شود (کربنات کلسیم برای جذب بهتر نیازمند اسید معده است).',
      },
      {
        en: 'Separate dosing by at least 2 hours from iron supplements, bisphosphonates, and tetracycline/quinolone antibiotics.',
        fa: 'با مکمل‌های آهن، بیس‌فسفونات‌ها و آنتی‌بیوتیک‌ها حداقل ۲ ساعت فاصله زمانی داشته باشد.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-4-3: Thyroid Disorders & Hormone Replacement
  // -------------------------------------------------------------
  {
    id: 'prod-eutroxsig-100mcg',
    brandName: 'Eutroxsig 100mcg',
    genericName: 'Levothyroxine Sodium',
    activeIngredients: 'Levothyroxine Sodium 100 micrograms tablet',
    packSize: '200 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-3',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    brandSubstitutionNotice: {
      en: 'Do not substitute with Oroxine without doctor consent. Levothyroxine is an NTI medicine requiring strict brand consistency.',
      fa: 'با برند Oroxine تعویض نشود! لووتیروکسین داروی NTI است و تعویض برند موجب به هم خوردن تنظیم TSH می‌شود.',
    },
    calLabels: ['CAL-4', 'CAL-A'],
    indications: {
      en: 'Thyroid hormone replacement therapy in primary, secondary, and tertiary hypothyroidism.',
      fa: 'درمان جایگزینی هورمون تیروئید در کم‌کاری تیروئید (هایپوتیروئیدیسم) اولیه و ثانویه.',
    },
    counselingPoints: [
      {
        en: 'Store in refrigerator (2°C - 8°C). Protect from light and moisture.',
        fa: 'در یخچال در دمای ۲ الی ۸ درجه سانتی‌گراد نگهداری شود.',
      },
      {
        en: 'Take once daily in the morning on an empty stomach with a full glass of water, at least 30-60 minutes before breakfast.',
        fa: 'صبح ناشتا با یک لیوان کامل آب، حداقل ۳۰ تا ۶۰ دقیقه قبل از صبحانه میل شود.',
      },
      {
        en: 'Separate by at least 4 hours from calcium, iron supplements, and antacids.',
        fa: 'با مکمل‌های کلسیم، آهن و آنتی‌اسیدها حداقل ۴ ساعت فاصله زمانی داشته باشد.',
      },
    ],
  },
  {
    id: 'prod-oroxine-100mcg',
    brandName: 'Oroxine 100mcg',
    genericName: 'Levothyroxine Sodium',
    activeIngredients: 'Levothyroxine Sodium 100 micrograms tablet',
    packSize: '200 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-3',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: false,
    brandSubstitutionNotice: {
      en: 'Do not substitute with Eutroxsig without doctor consent due to narrow therapeutic index.',
      fa: 'بدون هماهنگی با پزشک با Eutroxsig تعویض نشود (داروی NTI).',
    },
    calLabels: ['CAL-4', 'CAL-A'],
    indications: {
      en: 'Treatment of thyroid deficiency, congenital hypothyroidism, and TSH suppression in thyroid carcinoma.',
      fa: 'درمان کم‌کاری تیروئید و سرکوب TSH در کانسر تیروئید.',
    },
    counselingPoints: [
      {
        en: 'Keep refrigerated (2°C - 8°C). Consistent brand maintenance is mandatory.',
        fa: 'در یخچال نگهداری شود. حفظ مداوم برند مصرفی برای جلوگیری از نوسان هورمونی ضروری است.',
      },
      {
        en: 'Take first thing in the morning 30-60 minutes before food or caffeinated drinks.',
        fa: 'صبح ناشتا ۳۰ تا ۶۰ دقیقه قبل از غذا یا نوشیدنی‌های کافئین‌دار میل شود.',
      },
    ],
  },
  {
    id: 'prod-neo-mercazole-5mg',
    brandName: 'Neo-Mercazole 5mg',
    genericName: 'Carbimazole',
    activeIngredients: 'Carbimazole 5mg tablet',
    packSize: '100 Tablets',
    schedule: 'S4',
    categoryId: 'cat-4',
    subcategoryId: 'sub-4-3',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Carbimazole Sandoz', 'PTU (Propylthiouracil in 1st trimester pregnancy)'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Antithyroid agent for the management of hyperthyroidism (Graves’ disease, toxic nodular goitre) and preparation for thyroidectomy.',
      fa: 'داروی ضدتیروئید برای درمان پرکاری تیروئید (بیماری گریوز، گواتر سمی) و آمادگی قبل از جراحی تیروئید.',
    },
    counselingPoints: [
      {
        en: 'URGENT RED FLAG: Immediately report any sore throat, mouth ulcers, fever, or unexplained illness. Requires an urgent Full Blood Count (FBC) to rule out life-threatening agranulocytosis.',
        fa: 'هشدار قرمز فوری: در صورت بروز گلودرد، آفت‌های دهانی، تب یا هرگونه بیماری عفونی بلافاصله مصرف قطع و آزمایش خون (FBC) جهت بررسی آگرانولوسیتوز اورژانسی انجام شود.',
      },
      {
        en: 'Take with food to minimize nausea. Avoid during the first trimester of pregnancy if possible (switch to Propylthiouracil / PTU).',
        fa: 'همراه با غذا میل شود. در سه‌ماهه اول بارداری ترجیحاً به پروپیل‌تیواوراسیل (PTU) تغییر داده شود.',
      },
    ],
  },
  // CAT 5: Anti-Infectives & Immunisation
  // -------------------------------------------------------------
  // sub-5-1: Antibacterial Agents (Penicillins, Cephalosporins, Macrolides, Tetracyclines)
  // -------------------------------------------------------------
  {
    id: 'prod-flopen-500mg',
    brandName: 'Flopen 500mg',
    genericName: 'Flucloxacillin Sodium',
    activeIngredients: 'Flucloxacillin Sodium 500mg capsule',
    packSize: '24 Capsules',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Staphylex', 'Flucloxacillin Sandoz'],
    calLabels: ['CAL-A', 'CAL-4'],
    indications: {
      en: 'Treatment of suspected or confirmed staphylococcal skin and soft tissue infections (MSSA cellulitis, boils, impetigo, wound infections).',
      fa: 'درمان خط اول عفونت‌های پوستی و بافت نرم استافیلوکوکی (سلولیت، کورک، زردزخم و زخم‌های عفونی).',
    },
    counselingPoints: [
      {
        en: 'Take on an empty stomach at least 30 minutes before food or 2 hours after meals with a full glass of water.',
        fa: 'با معده خالی (حداقل نیم ساعت قبل از غذا یا دو ساعت پس از آن) با یک لیوان کامل آب مصرف شود.',
      },
      {
        en: 'Complete the full prescribed course. Seek medical care if experiencing severe watery diarrhea (C. diff risk) or yellowing of eyes/skin (delayed cholestatic jaundice).',
        fa: 'دوره درمان را کامل کنید. در صورت اسهال شدید یا زردی چشم و پوست (یرقان انسدادی تاخیری) فوراً به پزشک اطلاع دهید.',
      },
    ],
  },
  {
    id: 'prod-augmentin-duo-forte',
    brandName: 'Augmentin Duo Forte 875/125mg',
    genericName: 'Amoxicillin + Clavulanic Acid',
    activeIngredients: 'Amoxicillin 875mg + Clavulanic Acid (as potassium clavulanate) 125mg tablet',
    packSize: '10 Tablets',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Amoxil Duo Forte', 'Curam Duo 875/125', 'Amoxicillin/Clavulanate Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Broad-spectrum beta-lactamase resistant penicillin for animal/human bites, complicated sinusitis, community-acquired pneumonia, and mixed intra-abdominal infections.',
      fa: 'آنتی‌بیوتیک وسیع‌الطیف مقاوم به بتالاکتاماز برای گازگرفتگی حیوانات/انسان، سینوزیت باکتریایی شدید، پنومونی و عفونت‌های پیچیده.',
    },
    counselingPoints: [
      {
        en: 'Take at the start of a meal to enhance clavulanate absorption and minimize gastrointestinal distress/nausea.',
        fa: 'دقیقاً در ابتدای غذا میل شود تا جذب بهتر انجام شده و عوارض گوارشی و تهوع کاهش یابد.',
      },
      {
        en: 'Common side effect: diarrhea and loose stools. Consider probiotics spaced 2 hours away.',
        fa: 'عارضه شایع: اسهال؛ مصرف پروبیوتیک‌ها با فاصله حداقل ۲ ساعت از دارو مفید است.',
      },
    ],
  },
  {
    id: 'prod-keflex-500mg',
    brandName: 'Keflex 500mg',
    genericName: 'Cephalexin',
    activeIngredients: 'Cephalexin 500mg capsule',
    packSize: '20 Capsules',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Ibilex 500mg', 'Cephalexin Sandoz', 'Cephalexin GH'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'First-generation cephalosporin for uncomplicated urinary tract infections (UTI), mild skin and soft tissue infections, and mastitis.',
      fa: 'سفالوسپورین نسل اول برای عفونت‌های ادراری ساده (UTI)، عفونت‌های ملایم پوست و ماستیت شیردهی.',
    },
    counselingPoints: [
      {
        en: 'Take every 6 to 12 hours as prescribed, with or without food. Safe in pregnancy and lactation.',
        fa: 'طبق دستور هر ۶ تا ۱۲ ساعت با یا بدون غذا مصرف شود. در دوران بارداری و شیردهی ایمن است.',
      },
      {
        en: 'Inform pharmacist if you have an immediate severe anaphylactic penicillin allergy (cross-reactivity ~1-2%).',
        fa: 'در صورت داشتن سابقه حساسیت آنافیلاکسی شدید به پنی‌سیلین حتماً به داروساز اطلاع دهید.',
      },
    ],
  },
  {
    id: 'prod-doryx-100mg',
    brandName: 'Doryx 100mg',
    genericName: 'Doxycycline Hyclate',
    activeIngredients: 'Doxycycline (as hyclate modified-release pellets) 100mg tablet',
    packSize: '21 Tablets',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Doxy-100', 'Doxycycline Sandoz'],
    calLabels: ['CAL-18', 'CAL-A'],
    indications: {
      en: 'Tetracycline antibiotic for acne vulgaris, rosacea, chlamydia genital infections, Q fever, and malaria prophylaxis.',
      fa: 'آنتی‌بیوتیک تتراسایکلینی برای آکنه ولگاریس، روزاسه، عفونت‌های کلامیدیا و پیشگیری از مالاریا.',
    },
    counselingPoints: [
      {
        en: 'Take strictly with a large glass of water and remain upright for at least 30 minutes to prevent severe esophageal ulceration.',
        fa: 'حتماً با یک لیوان کامل آب میل شود و تا ۳۰ دقیقه بعد دراز نکشید تا از سوزش و زخم مری پیشگیری گردد.',
      },
      {
        en: 'Causes severe photosensitivity (CAL-18): apply broad-spectrum SPF 50+ sunscreen and wear sun-protective clothing.',
        fa: 'حساسیت شدید به نور خورشید ایجاد می‌کند؛ استفاده از ضدآفتاب قوی SPF 50+ و کلاه و لباس پوشیده ضروری است.',
      },
      {
        en: 'Contraindicated in pregnancy and children under 8 years of age (permanent teeth discoloration and bone growth inhibition).',
        fa: 'در دوران بارداری و کودکان زیر ۸ سال به دلیل تغییر رنگ دائمی دندان‌ها و اختلال در رشد استخوان ممنوع است.',
      },
      {
        en: 'Separate by at least 2 hours from iron supplements, calcium, antacids, and dairy products.',
        fa: 'با مکمل‌های آهن، کلسیم، لبنیات و آنتی‌اسیدها حداقل ۲ ساعت فاصله زمانی داشته باشد.',
      },
    ],
  },
  {
    id: 'prod-klacid-250mg',
    brandName: 'Klacid 250mg',
    genericName: 'Clarithromycin',
    activeIngredients: 'Clarithromycin 250mg tablet',
    packSize: '14 Tablets',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Clarac', 'Clarithromycin Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Macrolide antibiotic for upper and lower respiratory tract infections, Helicobacter pylori eradication (triple therapy), and non-tuberculous mycobacterial infections.',
      fa: 'آنتی‌بیوتیک ماکرولیدی برای عفونت‌های تنفسی، ریشه‌کنی هلیکوباکتر پیلوری (درمان سه‌دارویی) و عفونت‌های اتیپیک.',
    },
    counselingPoints: [
      {
        en: 'Take with food to minimize GI discomfort. Altered taste sensation (metallic taste) is very common and transient.',
        fa: 'همراه با غذا میل شود. احساس طعم فلزی در دهان در طول دوره درمان شایع و گذرا است.',
      },
      {
        en: 'Potent CYP3A4 inhibitor: check for severe drug interactions (statins, colchicine, carbamazepine, DOACs).',
        fa: 'مهارکننده بسیار قوی CYP3A4: خطر تداخلات شدید با استاتین‌ها (سیمواستاتین/آتورواستاتین)، کلشی‌سین و رقیق‌کننده‌های خون وجود دارد.',
      },
    ],
  },
  {
    id: 'prod-flagyl-400mg',
    brandName: 'Flagyl 400mg',
    genericName: 'Metronidazole',
    activeIngredients: 'Metronidazole 400mg tablet',
    packSize: '21 Tablets',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Metrogyl 400mg', 'Metronidazole Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Nitroimidazole antiprotozoal and anaerobic antibacterial for bacterial vaginosis (BV), Giardiasis, trichomoniasis, and anaerobic intra-abdominal infections.',
      fa: 'داروی ضد بی‌هوازی و تک‌یاخته برای واژینوز باکتریال (BV)، ژیاردیا، تریکومونیازیس و عفونت‌های بی‌هوازی دندان و شکم.',
    },
    counselingPoints: [
      {
        en: 'STRICTLY AVOID ALCOHOL during treatment and for at least 48 hours after the last dose (causes a severe disulfiram-like reaction: violent vomiting, flushing, tachycardia, and hypotension).',
        fa: 'پرهیز اکید از هرگونه الکل در طول درمان و تا ۴۸ ساعت پس از پایان دارو (ایجاد واکنش شبه دی‌سولفیرام: تهوع و استفراغ شدید، تپش قلب و افت فشار).',
      },
      {
        en: 'Take with food. May cause dark or reddish-brown discoloration of urine (benign and harmless).',
        fa: 'همراه با غذا مصرف شود. ممکن است رنگ ادرار تیره یا قهوه‌ای مایل به قرمز شود که کاملاً بی‌خطر است.',
      },
    ],
  },

  // -------------------------------------------------------------
  // sub-5-2: Antiviral Agents & Vaccines
  // -------------------------------------------------------------
  {
    id: 'prod-valtrex-500mg',
    brandName: 'Valtrex 500mg',
    genericName: 'Valaciclovir',
    activeIngredients: 'Valaciclovir Hydrochloride 500mg tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Valpam', 'Valaciclovir Sandoz', 'Zelitrex'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Prodrug of aciclovir for treatment of herpes zoster (shingles), episodic treatment and suppression of genital herpes, and prevention of cytomegalovirus (CMV).',
      fa: 'پیش‌داروی آسیکلوویر برای درمان زونا (شینگلز)، درمان دوره‌ای و پیشگیری از هرپس تناسلی و تبخال‌های شدید.',
    },
    counselingPoints: [
      {
        en: 'Initiate treatment as soon as possible after symptom onset (ideally within 72 hours of shingles rash onset).',
        fa: 'درمان باید در سریع‌ترین زمان ممکن (ترجیحاً در ۷۲ ساعت اول شروع ضایعات تاول‌دار زونا) آغاز شود.',
      },
      {
        en: 'Maintain high fluid intake throughout therapy to avoid renal crystalluria and nephrotoxicity.',
        fa: 'در طول دوره درمان آب و مایعات فراوان بنوشید تا از رسوب کریستالی دارو در کلیه‌ها جلوگیری گردد.',
      },
    ],
  },
  {
    id: 'prod-tamiflu-75mg',
    brandName: 'Tamiflu 75mg',
    genericName: 'Oseltamivir Phosphate',
    activeIngredients: 'Oseltamivir Phosphate 75mg capsule',
    packSize: '10 Capsules',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Oseltamivir Sandoz'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Neuraminidase inhibitor for treatment of acute, uncomplicated Influenza A and B infection, and post-exposure prophylaxis.',
      fa: 'مهارکننده آنزیم نورآمینیداز برای درمان آنفولانزای حاد A و B و پیشگیری پس از تماس در افراد پرخطر.',
    },
    counselingPoints: [
      {
        en: 'Must be initiated within 48 hours of the first onset of influenza symptoms for meaningful clinical benefit.',
        fa: 'برای اثربخشی بالینی باید حتماً در ۴۸ ساعت اول پس از شروع علائم آنفولانزا مصرف دارو آغاز شود.',
      },
      {
        en: 'Standard treatment course is 1 capsule twice daily for 5 days. Take with food to reduce nausea and vomiting.',
        fa: 'دوره استاندارد: ۱ کپسول دو بار در روز به مدت ۵ روز؛ برای کاهش حالت تهوع همراه غذا میل شود.',
      },
    ],
  },
  {
    id: 'prod-shingrix-vaccine',
    brandName: 'Shingrix Adjuvanted Vaccine',
    genericName: 'Recombinant Varicella Zoster Virus Glycoprotein E Vaccine',
    activeIngredients: 'Recombinant VZV glycoprotein E (50 mcg) with AS01B adjuvant system (2-vial kit)',
    packSize: '1 Dose Kit (Antigen vial + Adjuvant vial)',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Non-live recombinant adjuvanted vaccine for prevention of herpes zoster (shingles) and post-herpetic neuralgia (PHN) in adults ≥50 years and immunocompromised adults ≥18 years.',
      fa: 'واکسن غیرزنده نوترکیب با ادجوانت جهت پیشگیری از زونا و دردهای عصبی پس از زونا (PHN) در افراد بالای ۵۰ سال و افراد با نقص ایمنی بالای ۱۸ سال.',
    },
    counselingPoints: [
      {
        en: 'Administer strictly as a 2-dose intramuscular series into the deltoid: 2nd dose given 2 to 6 months after the 1st dose.',
        fa: 'به صورت یک دوره ۲ دوزی تزریق عضلانی در عضله دلتوئید: دوز دوم ۲ تا ۶ ماه پس از دوز اول تزریق می‌شود.',
      },
      {
        en: 'Cold Chain Storage: Store in refrigerator (2°C - 8°C). Do NOT freeze. Administer promptly after reconstitution.',
        fa: 'زنجیره سرما: در دمای یخچال (۲ تا ۸ درجه) نگهداری شود و هرگز فریز نشود. بلافاصله پس از آماده‌سازی تزریق گردد.',
      },
      {
        en: 'Inform patient that temporary injection-site pain, fatigue, myalgia, headache, and low-grade fever are common and indicate a robust immune response.',
        fa: 'به بیمار اطلاع داده شود که درد محل تزریق، خستگی، تب خفیف و کوفتگی تا ۲-۳ روز طبیعی و نشان‌دهنده پاسخ ایمنی قوی است.',
      },
    ],
  },
  {
    id: 'prod-fluvax-quadrivalent',
    brandName: 'FluQuadri / Fluarix Tetra (Inactivated Quadrivalent Influenza Vaccine)',
    genericName: 'Influenza Virus Vaccine (Surface Antigen / Split Virion, Inactivated)',
    activeIngredients: 'Quadrivalent inactivated influenza surface antigens (60 mcg total HA, 15 mcg per each of 4 strains)',
    packSize: '1 Pre-filled Syringe 0.5 mL',
    schedule: 'S4',
    categoryId: 'cat-5',
    subcategoryId: 'sub-5-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'Annual seasonal immunization against influenza A (H1N1, H3N2) and influenza B strains in adults and children from 6 months of age.',
      fa: 'واکسیناسیون سالانه فصلی آنفولانزای ۴ ظرفیتی برای بزرگسالان و کودکان بالای ۶ ماه.',
    },
    counselingPoints: [
      {
        en: 'Administer as a single 0.5 mL intramuscular injection into the deltoid annually (autumn / pre-winter in Australia).',
        fa: 'سالانه به صورت یک تزریق عضلانی ۰.۵ میلی‌لیتر در عضله بازو (در پاییز پیش از شروع زمستان استرالیا) تزریق می‌شود.',
      },
      {
        en: 'Cold chain storage: Strictly maintain at 2°C - 8°C, protected from light.',
        fa: 'زنجیره سرما: دقیقاً در دمای ۲ تا ۸ درجه سانتی‌گراد و دور از نور نگهداری شود.',
      },
      {
        en: 'Egg allergy is NOT a contraindication for standard egg-based influenza vaccines according to the Australian Immunisation Handbook.',
        fa: 'طبق کتابچه ملی ایمن‌سازی استرالیا (AIH)، حساسیت به تخم‌مرغ منعی برای دریافت واکسن آنفولانزا نیست.',
      },
    ],
  },

  // -------------------------------------------------------------
  // CLINICAL GUIDELINE EXPANSIONS: FIRST-LINE & ESSENTIAL THERAPIES
  // -------------------------------------------------------------

  // Anal Fissure & Proctology (sub-1-4 Gastro / Rectal)
  {
    id: 'prod-rectogesic-gtn',
    brandName: 'Rectogesic 0.2% Rectal Ointment',
    genericName: 'Glyceryl Trinitrate (GTN) 0.2%',
    activeIngredients: 'Glyceryl trinitrate 2mg/g (0.2% w/w) in paraffin base',
    packSize: '30g Tube with measuring guide',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A', 'CAL-1'],
    indications: {
      en: 'First-line non-surgical treatment for pain relief and healing of acute and chronic anal fissures.',
      fa: 'خط اول درمان غیرجراحی جهت تسکین درد و ترمیم شقاق مقعدی حاد و مزمن.',
    },
    counselingPoints: [
      {
        en: 'Apply a 1cm to 1.5cm strip of ointment into the anal canal every 8 hours (3 times daily) using a finger covering or glove.',
        fa: 'یک نوار ۱ تا ۱.۵ سانتی‌متری از پماد هر ۸ ساعت (۳ بار در روز) به داخل کانال مقعد مالیده شود.',
      },
      {
        en: 'Throbbing headache and mild dizziness are common initial side effects due to vasodilation. Sitting down while applying helps prevent orthostasis.',
        fa: 'سردرد ضربان‌دار و سرگیجه خفیف به دلیل اتساع عروقی شایع است؛ استعمال در حالت نشسته از افت فشار جلوگیری می‌کند.',
      },
      {
        en: 'STRICTLY CONTRAINDICATED with PDE-5 inhibitors (sildenafil, tadalafil) within 24-48 hours due to risk of fatal hypotension.',
        fa: 'مصرف همزمان با داروهای تقویت جنسی (سیلدنافیل، تادالافیل) تا ۲۴-۴۸ ساعت به دلیل افت شدید و مرگبار فشار خون اکیداً ممنوع است.',
      },
    ],
  },
  {
    id: 'prod-proctosedyl-oint',
    brandName: 'Proctosedyl Ointment / Suppositories',
    genericName: 'Hydrocortisone 5mg/g + Cinchocaine HCl 5mg/g',
    activeIngredients: 'Hydrocortisone 0.5% + Cinchocaine hydrochloride 0.5%',
    packSize: '30g Tube / 12 Suppositories',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Proctosedyl Suppositories', 'Anusol Plus'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Short-term relief of pain, inflammation, and pruritus associated with hemorrhoids, anal pruritus, and mild perianal irritation.',
      fa: 'تسکین کوتاه‌مدت درد، التهاب و خارش ناشی از هموروئید، خارش مقعدی و تحریکات پره‌آنال.',
    },
    counselingPoints: [
      {
        en: 'Apply a small amount morning, night, and after each bowel motion (maximum 7 consecutive days).',
        fa: 'مقدار کمی صبح، شب و پس از هر بار دفع مصرف شود (حداکثر به مدت ۷ روز متوالی).',
      },
      {
        en: 'Do not use for longer than 7 days without medical review due to risk of perianal skin thinning (steroid atrophy).',
        fa: 'به دلیل خطر نازک شدن پوست (آتروفی کورتونی) مصرف بیش از ۷ روز بدون نظر پزشک مجاز نیست.',
      },
    ],
  },

  // Dermatology: Acne, Rosacea & Psoriasis (sub-1-5 Dermatology)
  {
    id: 'prod-benzac-ac-wash',
    brandName: 'Benzac AC 5% Wash / Gel',
    genericName: 'Benzoyl Peroxide 5%',
    activeIngredients: 'Benzoyl peroxide 50mg/g (5% w/w) in water-based gel/wash',
    packSize: '200mL Wash / 50g Gel',
    schedule: 'Unscheduled',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Benzac Daily Wash', 'Oxy 5', 'Curash Anti-Acne'],
    calLabels: ['CAL-A', 'CAL-13'],
    indications: {
      en: 'First-line topical antibacterial and comedolytic treatment for mild to moderate acne vulgaris on face, chest, and back.',
      fa: 'خط اول درمان آنتی‌باکتریال و کومدولیتیک موضعی برای آکنه ولگاریس خفیف تا متوسط در صورت، سینه و پشت.',
    },
    counselingPoints: [
      {
        en: 'Wash or apply once daily initially, increasing to twice daily if tolerated. Efficacy requires 6-8 weeks of consistent use.',
        fa: 'در ابتدا روزی ۱ بار و پس از ۱ هفته به روزی ۲ بار افزایش یابد؛ دوره ارزیابی اثربخشی حداقل ۶ تا ۸ هفته است.',
      },
      {
        en: 'Warning: Bleaches coloured fabrics, towels, bedding, and hair. Wash hands thoroughly after application.',
        fa: 'هشدار: باعث سفید شدن و رنگ‌زدایی پارچه‌ها، حوله، ملحفه و مو می‌شود. پس از مصرف دست‌ها را کاملاً بشویید.',
      },
    ],
  },
  {
    id: 'prod-azclear-lotion',
    brandName: 'Azclear Action Medicated Lotion 20%',
    genericName: 'Azelaic Acid 20%',
    activeIngredients: 'Azelaic acid 200mg/g (20% w/w)',
    packSize: '25g Tube',
    schedule: 'S2',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Finacea 15% Gel'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Topical antibacterial and anti-inflammatory treatment for acne vulgaris and post-inflammatory hyperpigmentation; suitable for sensitive skin.',
      fa: 'درمان موضعی ضدالتهاب و ضدباکتری برای آکنه ولگاریس، روزاسه و لکه‌های تیره پس از جوش؛ مناسب برای پوست‌های حساس.',
    },
    counselingPoints: [
      {
        en: 'Apply thinly twice daily to affected areas after washing with soap-free cleanser. Slight transient tingling may occur initially.',
        fa: 'روزی ۲ بار پس از شستشو با پاک‌کننده غیرصابونی روی موضع مالیده شود. سوزش خفیف و گذرا در ابتدای مصرف طبیعی است.',
      },
      {
        en: 'Non-bleaching alternative to benzoyl peroxide that also helps fade dark post-acne marks (hyperpigmentation).',
        fa: 'برخلاف بنزوئیل پروکساید لباس را رنگ‌زدایی نمی‌کند و به محو شدن لکه‌های تیره جای جوش کمک می‌نماید.',
      },
    ],
  },
  {
    id: 'prod-daivobet-gel',
    brandName: 'Daivobet 50/500 Gel / Ointment',
    genericName: 'Calcipotriol 50mcg/g + Betamethasone Dipropionate 500mcg/g',
    activeIngredients: 'Calcipotriol 50 micrograms/g (as monohydrate) + Betamethasone 0.5mg/g (as dipropionate)',
    packSize: '30g Tube',
    schedule: 'S4',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-5',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A'],
    indications: {
      en: 'First-line topical combination therapy for stable plaque psoriasis vulgaris in adults.',
      fa: 'خط اول درمان ترکیبی موضعی برای پسوریازیس پلاکی پایدار در بزرگسالان.',
    },
    counselingPoints: [
      {
        en: 'Apply once daily to affected plaques for up to 4 weeks. Maximum weekly dose is 100g to avoid hypercalcemia and steroid systemic absorption.',
        fa: 'روزی ۱ بار تا حداکثر ۴ هفته روی پلاک‌های پسوریازیس مالیده شود. حداکثر مصرف هفتگی ۱۰۰ گرم است.',
      },
      {
        en: 'Do not apply to face, flexures, or intertriginous areas. Wash hands after applying.',
        fa: 'از مالیدن به پوست صورت و چین‌های پوستی خودداری شود. پس از مصرف دست‌ها شسته شود.',
      },
    ],
  },

  // Respiratory & ENT: Allergy, GORD & Asthma (sub-1-6 Respiratory)
  {
    id: 'prod-dymista-spray',
    brandName: 'Dymista 125/50 Nasal Spray',
    genericName: 'Azelastine HCl 137mcg + Fluticasone Propionate 50mcg per actuation',
    activeIngredients: 'Azelastine hydrochloride 125 micrograms + Fluticasone propionate 50 micrograms per spray',
    packSize: '120 Metered Sprays Bottle',
    schedule: 'S4',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: false,
    calLabels: ['CAL-A', 'CAL-1'],
    indications: {
      en: 'Rapid-onset first-line combination therapy for moderate to severe seasonal and perennial allergic rhinitis.',
      fa: 'درمان ترکیبی خط اول با شروع اثر سریع (ظرف ۱۵ دقیقه) برای رینیت آلرژیک فصلی و دائمی متوسط تا شدید.',
    },
    counselingPoints: [
      {
        en: '1 spray in each nostril twice daily (morning and evening). Shake gently before use; blow nose prior to spraying.',
        fa: '۱ پاف در هر سوراخ بینی ۲ بار در روز (صبح و شب). قبل از مصرف به آرامی تکان داده شود و سر کمی به جلو خم شود.',
      },
      {
        en: 'Keep head tilted forward slightly during actuation to avoid bitter taste entering the throat.',
        fa: 'هنگام اسپری کردن سر را کمی به جلو متمایل نگه دارید تا از ورود طعم تلخ به گلو جلوگیری شود.',
      },
    ],
  },
  {
    id: 'prod-ventolin-inhaler',
    brandName: 'Ventolin / Asmol 100mcg CFC-Free Inhaler',
    genericName: 'Salbutamol Sulfate 100mcg/actuation',
    activeIngredients: 'Salbutamol sulfate 100 micrograms per metered actuation',
    packSize: '200 Metered Inhalations (MDI)',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-6',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Asmol 100 Inhaler', 'Zempreon 100'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Short-acting beta-2 agonist (SABA) reliever for acute bronchospasm, asthma symptoms, and exercise-induced asthma prophylaxis.',
      fa: 'داروی تسکین‌دهنده سریع‌الاثر (Reliever) برای حملات حاد تنگی نفس، علائم آسم و پیشگیری از آسم ناشی از ورزش.',
    },
    counselingPoints: [
      {
        en: 'Adult dose: 1-2 inhalations as required for acute relief (maximum 8 inhalations daily in routine care). Always recommend a spacer for optimal lung deposition.',
        fa: 'دوز بزرگسالان: ۱ تا ۲ پاف در صورت بروز تنگی نفس؛ استفاده از دم‌یار (Spacer) جذب ریوی را تا ۲ برابر افزایش می‌دهد.',
      },
      {
        en: 'If needing reliever inhaler >2 days per week, the patient has suboptimal asthma control and requires preventer therapy review.',
        fa: 'نیاز به مصرف بیش از ۲ روز در هفته نشانه کنترل ضعیف آسم است و نیازمند بررسی درمان نگهدارنده (Preventer) می‌باشد.',
      },
    ],
  },

  // Pain & Gout (sub-1-1 Analgesics / Musculoskeletal)
  {
    id: 'prod-colgout-tablets',
    brandName: 'Colgout 500mcg Tablets',
    genericName: 'Colchicine 500mcg',
    activeIngredients: 'Colchicine 500 micrograms per tablet',
    packSize: '30 Tablets',
    schedule: 'S4',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: true,
    aFlagBioequivalent: true,
    equivalentBrands: ['Lengout 500'],
    calLabels: ['CAL-A', 'CAL-12'],
    indications: {
      en: 'First-line therapy for acute gout flares and prophylaxis during initiation of allopurinol urate-lowering therapy.',
      fa: 'خط اول درمان حملات حاد نقرس و پیشگیری از عود حمله هنگام شروع آلوپورینول.',
    },
    counselingPoints: [
      {
        en: 'Acute gout regimen: 1mg (2 tablets) stat, followed by 500mcg (1 tablet) 1 hour later (maximum 1.5mg total per attack cycle). Do NOT exceed 1.5mg.',
        fa: 'رژیم حمله حاد: ۲ قرص (۱ میلی‌گرم) در ابتدا، سپس ۱ قرص (۵۰۰ میکروگرم) یک ساعت بعد (حداکثر ۱.۵ میلی‌گرم در کل دوره حمله).',
      },
      {
        en: 'Narrow Therapeutic Index: Toxicity risk. Stop immediately and seek medical attention if severe diarrhea, nausea, vomiting, or muscle weakness occurs.',
        fa: 'پنجره درمانی باریک (NTI): در صورت بروز اسهال شدید، تهوع یا ضعف عضلانی فوراً مصرف قطع و به پزشک مراجعه شود.',
      },
      {
        en: 'CYP3A4 & P-gp interactions: Strictly avoid grapefruit juice and check co-prescribed statins, macrolides, and diltiazem.',
        fa: 'تداخلات شدید با آب گریپ‌فروت، کلاریترومایسین، دیلتیازم و استاتین‌ها که سطح دارویی را به شدت افزایش می‌دهند.',
      },
    ],
  },
  {
    id: 'prod-allosig-tablets',
    brandName: 'Allosig / Zyloprim (Allopurinol 100mg / 300mg)',
    genericName: 'Allopurinol',
    activeIngredients: 'Allopurinol 100mg or 300mg tablets',
    packSize: '60 Tablets',
    schedule: 'S4',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-1',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Progout 100/300', 'Zyloprim'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Long-term urate-lowering therapy (xanthine oxidase inhibitor) for chronic gout, hyperuricemia, and prevention of recurrent uric acid nephrolithiasis.',
      fa: 'مهارکننده گزانتین اکسیداز و درمان طولانی‌مدت کاهش اسید اوریک در نقرس مزمن و پیشگیری از سنگ کلیه اسید اوریکی.',
    },
    counselingPoints: [
      {
        en: 'Start low (100mg daily) and titrate monthly to target serum urate <0.36 mmol/L (<0.30 mmol/L if tophi present). Take with or immediately after food.',
        fa: 'با دوز کم (۱۰۰ میلی‌گرم روزانه) شروع شده و تا رسیدن اسید اوریک سرم به زیر ۰.۳۶ میلی‌مول بر لیتر تنظیم می‌شود. همراه یا بعد از غذا میل شود.',
      },
      {
        en: 'Co-prescribe colchicine 500mcg daily or low-dose NSAID for the first 3-6 months to prevent paradoxical gout flare precipitation.',
        fa: 'در ۳ تا ۶ ماه اول شروع برای پیشگیری از شعله‌ور شدن حملات نقرس باید کلشی‌سین یا NSAID روزانه همزمان تجویز شود.',
      },
      {
        en: 'WARNING: Discontinue immediately at first sign of skin rash or hypersensitivity (risk of Stevens-Johnson syndrome / DRESS).',
        fa: 'هشدار مهم: در صورت بروز هرگونه راش پوستی مصرف فوراً قطع شود (خطر سندروم استیونز-جانسون).',
      },
    ],
  },

  // Gastrointestinal: GORD & Reflux (sub-1-4 Gastrointestinal)
  {
    id: 'prod-nexium-24hr',
    brandName: 'Nexium 24HR 20mg Tablets',
    genericName: 'Esomeprazole 20mg (as magnesium trihydrate)',
    activeIngredients: 'Esomeprazole 20mg enteric-coated tablets',
    packSize: '14 Tablets (S2) / 28 Tablets (S3)',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-4',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Somac Control 20', 'Pariet 20', 'Chemist Own Esomeprazole'],
    calLabels: ['CAL-A', 'CAL-13'],
    indications: {
      en: 'Proton Pump Inhibitor (PPI) for short-term symptomatic relief of frequent heartburn and acid reflux in adults.',
      fa: 'مهارکننده پمپ پروتون (PPI) جهت تسکین علامتی سوزش سردل مکرر و رفلاکس اسید معده به مری در بزرگسالان.',
    },
    counselingPoints: [
      {
        en: 'Swallow whole with a glass of water at least 30 to 60 minutes before breakfast. Do not crush or chew the tablets.',
        fa: 'قرص حداقل ۳۰ تا ۶۰ دقیقه قبل از صبحانه با یک لیوان پر آب به صورت کامل بلعیده شود و جویده یا خرد نشود.',
      },
      {
        en: 'May take 1 to 4 days for maximum acid suppression; antacids or alginates (Gaviscon) can be used concurrently for immediate breakthrough relief.',
        fa: 'رسیدن به حداکثر اثر مهاری اسید ۱ تا ۴ روز زمان می‌برد؛ برای تسکین آنی در روزهای اول می‌توان گاویزکون همزمان مصرف کرد.',
      },
    ],
  },

  // Women's Health & Oral Care (sub-1-2 / sub-1-3)
  {
    id: 'prod-canesten-once',
    brandName: 'Canesten Once 500mg Pessary + 1% Cream',
    genericName: 'Clotrimazole 500mg Pessary',
    activeIngredients: 'Clotrimazole 500mg vaginal pessary + Clotrimazole 10mg/g external cream',
    packSize: '1 Pessary with applicator + 10g Cream',
    schedule: 'S3',
    categoryId: 'cat-1',
    subcategoryId: 'sub-1-2',
    isNarrowTherapeuticIndex: false,
    aFlagBioequivalent: true,
    equivalentBrands: ['Chemist Own Clotrimazole 500', 'Clocreme 500'],
    calLabels: ['CAL-A'],
    indications: {
      en: 'Single-dose antifungal treatment for acute vulvovaginal candidiasis (thrush).',
      fa: 'درمان تک‌دوز ضدقارچ برای برفک و کاندیدیازیس حاد واژینال همراه با کرم تسکین خارش خارجی.',
    },
    counselingPoints: [
      {
        en: 'Insert pessary high into the vagina at bedtime using the applicator (or manually without applicator if pregnant).',
        fa: 'شیاف هنگام خواب با اپلیکاتور به داخل واژن گذاشته شود (در دوران بارداری بدون اپلیکاتور و با دست قرار داده شود).',
      },
      {
        en: 'May damage latex condoms and diaphragms; avoid intercourse or use alternative non-latex contraception during treatment and for 3 days post-treatment.',
        fa: 'کرم و شیاف ممکن است کاندوم لاتکس را تخریب کنند؛ تا ۳ روز پس از مصرف از کاندوم لاتکس استفاده نشود.',
      },
    ],
  },
];

