import { PharmacyCard, QuizQuestion } from '@/types/pharmacy';

export const PHARMACY_MODULES = [
  { id: 'mod1', name: { fa: 'ماژول ۱: سیستم سلامت استرالیا', en: 'Module 1: Healthcare System' } },
  { id: 'mod2', name: { fa: 'ماژول ۲: قوانین و جدول‌بندی', en: 'Module 2: Legislation & Schedules' } },
  { id: 'mod3', name: { fa: 'ماژول ۳: داروهای بدون نسخه (OTC)', en: 'Module 3: OTC Medicines' } },
  { id: 'mod4', name: { fa: 'ماژول ۴: مشاوره و خدمات بالینی', en: 'Module 4: Counseling & Clinical' } },
  { id: 'mod5', name: { fa: 'ماژول ۵: گزارش‌نویسی علمی', en: 'Module 5: Report Writing' } },
  { id: 'mod6', name: { fa: 'ماژول ۶: نسخه پیچی و دیسپنس', en: 'Module 6: Prescription Dispensing' } },
] as const;

export const ALL_PHARMACY_CARDS: PharmacyCard[] = [
  // ================= MODULE 1 =================
  {
    id: 'm1-sec2',
    module: 'mod1',
    category: { fa: 'بیمه همگانی Medicare', en: 'Medicare System' },
    categoryColor: 'amber',
    icon: 'CreditCard',
    title: {
      fa: 'طرح بیمه درمانی Medicare و تفاوت مدل‌های Bulk Billing با Mixed Billing',
      en: 'Universal Health Insurance: Medicare, Bulk Billing vs Mixed Billing & Gap Fees',
    },
    actionPearl: {
      fa: 'در سیستم Bulk Billing، پزشک فقط تعرفه دولتی را می‌پذیرد و هیچ پولی از جیب بیمار (Gap Fee) دریافت نمی‌شود.',
      en: 'In Bulk Billing, the doctor accepts the Medicare benefit as full payment, resulting in zero out-of-pocket costs for the patient.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>مدل صورتحساب (Billing Model)</th><th>نحوه عملکرد و سهم پرداختی بیمار (Out-of-Pocket Cost)</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Bulk Billing</td><td>پزشک مستقیماً صورتحساب را به مدیکر می‌فرستد و تعرفه مصوب (Medicare Benefit Schedule - MBS) را به عنوان هزینه کامل ویزیت می‌پذیرد. در نتیجه پرداختی از جیب بیمار (Gap Fee) <strong>صفر</strong> خواهد بود.</td></tr><tr><td class="font-bold text-emerald-400">Mixed / Private Billing</td><td>پزشک هزینه‌ای بالاتر از تعرفه مدیکر مطالبه می‌کند. بیمار باید کل مبلغ را پرداخت کند یا بخشی از آن را (MBS) از مدیکر پس بگیرد؛ اما مابه‌التفاوت (Gap Fee) را باید کاملاً از جیب خود پرداخت کند.</td></tr><tr><td class="font-bold text-rose-400">Public Hospital Care</td><td>برای تمامی شهروندان و دارندگان مدیکر استرالیا که به عنوان «بیمار عمومی» در بیمارستان‌های دولتی بستری شوند، خدمات <strong>کاملاً رایگان (۱۰۰٪ تحت پوشش)</strong> است.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>Billing Model</th><th>Mechanism & Patient Out-of-Pocket Cost</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Bulk Billing</td><td>The practitioner bills Medicare directly and accepts the Medicare Benefit Schedule (MBS) fee as full payment. Patient out-of-pocket gap fee is <strong>Zero ($0)</strong>.</td></tr><tr><td class="font-bold text-emerald-400">Mixed / Private Billing</td><td>The practitioner charges above the MBS fee. The patient pays the full fee (or claims the MBS rebate), but must pay the remaining out-of-pocket <strong>Gap Fee</strong> themselves.</td></tr><tr><td class="font-bold text-rose-400">Public Hospital Care</td><td>For all Australian citizens and Medicare cardholders treated as public patients in public hospitals, care is <strong>100% free of charge</strong>.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm1-sec3',
    module: 'mod1',
    category: { fa: 'مسیر تعاملی بیمار X', en: 'Patient X Journey' },
    categoryColor: 'teal',
    icon: 'GitCommit',
    title: {
      fa: 'سیر تعاملی بیمار X: ارجاع از GP به Phlebotomist، Specialist، داروخانه و اورژانس',
      en: 'Patient X Journey: GP, Phlebotomist, Endoc, SGLT2i, Allergy & Hospital ER',
    },
    actionPearl: {
      fa: 'این سناریو نحوه چرخش بیمار در سیستم درمانی و ارتباط میان Primary و Secondary Care را نشان می‌دهد.',
      en: 'This scenario maps the patient\'s movement across primary care, specialist referrals, pharmacy, and secondary hospital emergency care.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">مسیر درمان بیمار فرضی به نام Patient X گام‌به‌گام شبکه بین‌حرفه‌ای را نمایش می‌دهد:</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]"><div class="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200"><div class="font-bold text-sky-400 mb-1">۱. مراجعه به GP و تشخیص</div>بیمار با بدحالی به GP مراجعه کرده، خون‌گیری توسط نمونه‌گیر (Phlebotomist) انجام و دیابت نوع ۲ با HbA1c بالا گزارش می‌شود. پزشک متفورمین تجویز کرده و او را به آموزش‌دهنده دیابت ارجاع می‌دهد.</div><div class="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200"><div class="font-bold text-purple-400 mb-1">۲. ارجاع به متخصص غدد</div>پس از ۳ ماه، عدم کنترل دیابت مشخص می‌شود. GP با نامه ارجاع رسمی بیمار را به متخصص غدد (Endocrinologist) در کلینیک ثانویه ارجاع می‌دهد.</div><div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200"><div class="font-bold text-emerald-400 mb-1">۳. داروی SGLT2i و داروخانه</div>متخصص داروی Empagliflozin را تجویز می‌کند. بیمار در داروخانه جامعه دارو را دریافت می‌کند و داروساز سرویس Diabetes MedsCheck را به وی پیشنهاد می‌دهد.</div><div class="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200"><div class="font-bold text-rose-400 mb-1">۴. حساسیت شدید و اورژانس</div>بیمار دچار واکنش حساسیتی شده و با آمبولانس به اورژانس بیمارستان (Secondary Care) منتقل می‌شود. پزشک بیمارستان SGLT2i را قطع کرده و درمان را با Liraglutide جایگزین می‌کند.</div></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Step-by-step patient journey demonstrating interprofessional collaboration across care tiers:</p><div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]"><div class="p-2.5 rounded-xl bg-sky-950/40 border border-sky-500/30 text-sky-200"><div class="font-bold text-sky-400 mb-1">1. GP Visit & Diagnosis</div>Patient presents unwell to GP; blood drawn by a Phlebotomist confirms Type 2 Diabetes (elevated HbA1c). GP prescribes Metformin and refers to a Credentialed Diabetes Educator.</div><div class="p-2.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200"><div class="font-bold text-purple-400 mb-1">2. Endocrinologist Referral</div>After 3 months, glycemic control remains suboptimal. GP writes a formal referral to an Endocrinologist (Secondary Specialist Care).</div><div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-emerald-200"><div class="font-bold text-emerald-400 mb-1">3. SGLT2i & Community Pharmacy</div>Endocrinologist prescribes Empagliflozin. Patient fills script at community pharmacy, where the pharmacist offers a Diabetes MedsCheck review.</div><div class="p-2.5 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-200"><div class="font-bold text-rose-400 mb-1">4. Adverse Reaction & ER Care</div>Patient experiences severe hypersensitivity reaction and is transported via ambulance to Hospital ER (Secondary Care). ER physician ceases SGLT2i and switches to Liraglutide.</div></div></div>`,
    },
  },
  {
    id: 'm1-sec4',
    module: 'mod1',
    category: { fa: 'سازمان TGA و ثبت ARTG', en: 'TGA & ARTG Registration' },
    categoryColor: 'rose',
    icon: 'ShieldCheck',
    title: {
      fa: 'ارکان سه‌گانه TGA و ثبت دفترچه ARTG: تفاوت داروی AUST R با AUST L',
      en: 'TGA 3 Pillars & ARTG Registration: AUST R vs AUST L Medicines Matrix',
    },
    actionPearl: {
      fa: 'داروهای AUST R پرخطر بوده و اثربخشی بالینی آن‌ها قبل از ورود بررسی می‌شود؛ اما AUST L کم‌خطر و ویتامینی است.',
      en: 'AUST R medicines are high-risk and evaluated for efficacy. AUST L medicines are low-risk complementary items.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">اداره فرآورده‌های درمانی (TGA) تمام کالاهای درمانی استرالیا را ارزیابی می‌کند. محصولات تاییدشده وارد دفترچه ملی <strong>ARTG (Australian Register of Therapeutic Goods)</strong> می‌شوند:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>کد ثبت ARTG</th><th>سطح ریسک و طبقه دارویی</th><th>ارزیابی TGA قبل از ورود به بازار</th><th>برچسب روی جعبه</th></tr></thead><tbody><tr><td class="font-bold text-rose-400">AUST R (Registered)</td><td><strong>پرخطر (High Risk):</strong> شامل تمام داروهای نسخه‌ای (S4/S8)، داروهای S3 و S2.</td><td>ارزیابی کامل ۳ رکن: <strong>ایمنی (Safety)، کیفیت (Quality) و اثربخشی بالینی (Efficacy)</strong>.</td><td>کد ثبت به صورت <code>AUST R 123456</code> خک می‌شود.</td></tr><tr><td class="font-bold text-amber-400">AUST L (Listed)</td><td><strong>کم‌خطر (Low Risk):</strong> شامل مکمل‌های غذایی، ویتامین‌ها و فرآورده‌های گیاهی.</td><td>ارزیابی اولیه شامل <strong>ایمنی و کیفیت</strong> با اجزای از پیش‌تاییدشده (بدون ارزیابی پیش‌ازورود اثربخشی).</td><td>کد ثبت به صورت <code>AUST L 123456</code> درج می‌شود.</td></tr></tbody></table></div><ul class="list-disc pl-5 space-y-1 text-xs mt-2"><li><strong>پایش پس از بازار (Post-market ADRs):</strong> گزارش عوارض جانبی ناخواسته دارویی و فراخوان سراسری.</li><li><strong>گواهی تولید GMP:</strong> الزام اخذ لایسنس Good Manufacturing Practice برای تمام سازندگان داخلی و خارجی.</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">The Therapeutic Goods Administration (TGA) regulates all therapeutic goods via the <strong>ARTG (Australian Register of Therapeutic Goods)</strong>:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>ARTG Registration Code</th><th>Risk Profile & Scope</th><th>Pre-Market TGA Assessment</th><th>Label Identification</th></tr></thead><tbody><tr><td class="font-bold text-rose-400">AUST R (Registered)</td><td><strong>High Risk:</strong> Prescription (S4/S8), Pharmacist Only (S3) & Pharmacy (S2) medicines.</td><td>Full evaluation of 3 pillars: <strong>Safety, Quality, AND Clinical Efficacy</strong>.</td><td>Displays <code>AUST R 123456</code> on pack.</td></tr><tr><td class="font-bold text-amber-400">AUST L (Listed)</td><td><strong>Low Risk:</strong> Complementary medicines, vitamins, minerals & herbal formulations.</td><td>Evaluated for <strong>Safety & Quality</strong> using pre-approved ingredients (efficacy claims based on traditional evidence).</td><td>Displays <code>AUST L 123456</code> on pack.</td></tr></tbody></table></div><ul class="list-disc pl-5 space-y-1 text-xs mt-2"><li><strong>Post-Market ADR Surveillance:</strong> Monitoring adverse drug reactions and coordinating product recalls.</li><li><strong>GMP Licensing:</strong> Enforcing Good Manufacturing Practice standards for both domestic and overseas manufacturers.</li></ul></div>`,
    },
  },
  {
    id: 'm1-sec5',
    module: 'mod1',
    category: { fa: 'طرح یارانه PBS و PBAC', en: 'PBS & PBAC' },
    categoryColor: 'emerald',
    icon: 'Coins',
    title: {
      fa: 'طرح یارانه‌ای PBS و نقش مستقل کمیته مشورتی PBAC در تایید داروها',
      en: 'Pharmaceutical Benefits Scheme (PBS) & Independent PBAC Role',
    },
    actionPearl: {
      fa: 'کمیته PBAC به طور مستقل اثربخشی و صرفه اقتصادی داروها را ارزیابی کرده و سقف مجاز تجویز (Quantity/Repeats) را مشخص می‌کند.',
      en: 'The independent PBAC evaluates clinical and economic evidence to recommend listings, max quantities, and repeat limits on the PBS.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">طرح PBS تضمین می‌کند که داروهای ضروری و نجات‌بخش با قیمتی قابل‌دسترس در اختیار استرالیایی‌ها قرار گیرد. در حال حاضر بیش از ۵۲۰۰ محصول دارویی در لیست PBS قرار دارند.</p><p class="text-[11px] opacity-80 mt-1">کمیته مشورتی مزایای دارویی (<strong>PBAC</strong> - Pharmaceutical Benefits Advisory Committee) یک نهاد کاملاً مستقل متشکل از متخصصان است که داروها را برای ورود به PBS بررسی می‌کنند. آن‌ها نه تنها اثربخشی، بلکه محدودیت‌های تجویز شامل حداکثر تعداد قابل تحویل (Max Quantity) و تعداد تکرار مجاز (Repeats) را برای دولت تعیین می‌کنند.</p></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">The Pharmaceutical Benefits Scheme (PBS) subsidizes over 5,200 essential medicines to ensure affordable access for all Australians.</p><p class="text-[11px] opacity-80 mt-1">The <strong>PBAC (Pharmaceutical Benefits Advisory Committee)</strong> is an independent statutory body of experts evaluating clinical effectiveness, safety, and cost-effectiveness compared to alternative therapies. PBAC recommends PBS listings and sets prescribing restrictions including Maximum Quantities and Repeats.</p></div>`,
    },
  },
  {
    id: 'm1-sec6',
    module: 'mod1',
    category: { fa: 'حد نصاب Safety Net', en: 'PBS Safety Net' },
    categoryColor: 'sky',
    icon: 'HeartHandshake',
    title: {
      fa: 'کاهش هزینه‌های خانواده با طرح PBS Safety Net و کارت‌های حمایتی',
      en: 'PBS Safety Net: Family Unit Accumulation & Entitlement/Concession Cards',
    },
    actionPearl: {
      fa: 'با رسیدن مجموع پرداختی‌های یک خانواده به حد نصاب Safety Net در یک سال میلادی، داروهای بعدی رایگان یا با تخفیف بسیار زیاد همراه می‌شوند.',
      en: 'Once cumulative family PBS co-payments hit the annual Safety Net limit, subsequent scripts become heavily discounted or free.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>رده بیمار (Patient Category)</th><th>وضعیت تخفیف پس از رسیدن به حد نصاب Safety Net</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">General Patient (بیمار عمومی)</td><td>کارت <strong>Safety Net Concession Card</strong> صادر شده و هزینه دارو از نرخ عمومی به نرخ بسیار ارزان Concessional کاهش می‌یابد.</td></tr><tr><td class="font-bold text-emerald-400">Concession Card Holder (تخفیف‌دار)</td><td>کارت <strong>Safety Net Entitlement Card</strong> صادر شده و تمامی داروهای PBS برای مابقی سال میلادی ۱۰۰٪ <strong>رایگان</strong> می‌شوند.</td></tr></tbody></table></div><p class="text-xs opacity-80"><strong>تعریف قانونی واحد خانواده (Safety Net Family):</strong> شامل فرد، همسر رسمی یا همزیست دائمی (De facto) و هر فرزند وابسته تحت تکفل. هزینه‌های پرداختی کل اعضا با هم جمع می‌شود (از اول ژانویه تا پایان دسامبر).</p></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>Patient Category</th><th>Benefit Status Upon Reaching Safety Net Threshold</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">General Patient</td><td>Issued a <strong>Safety Net Concession Card</strong>; co-payment drops from the General rate down to the concessional rate for remainder of calendar year.</td></tr><tr><td class="font-bold text-emerald-400">Concession Card Holder</td><td>Issued a <strong>Safety Net Entitlement Card</strong>; all PBS prescriptions become <strong>100% Free ($0)</strong> for remainder of calendar year.</td></tr></tbody></table></div><p class="text-xs opacity-80"><strong>Safety Net Family Unit Definition:</strong> Includes the individual, spouse/de facto partner, and dependent children. Cumulative PBS co-payments combine across all family members from 1 January to 31 December.</p></div>`,
    },
  },
  {
    id: 'm1-sec7',
    module: 'mod1',
    category: { fa: 'نهادها و سازمان‌های داروسازی', en: 'Pharmacy Stakeholders' },
    categoryColor: 'purple',
    icon: 'Building2',
    title: {
      fa: 'متولیان قانونی استرالیا: AHPRA، PBA، Guild، PSA، APC، SHPA، PDL و مجوز Section 90',
      en: 'Key Stakeholders: AHPRA, PBA, Guild, PSA, APC, SHPA, PDL & Section 90 Approval',
    },
    actionPearl: {
      fa: 'مجوز Section 90 شماره تاییدیه رسمی داروخانه برای تحویل داروهای یارانه‌ای PBS بر اساس قوانین فاصله‌گذاری است.',
      en: 'Section 90 Approval is the statutory pharmacy approval number required to supply subsidized PBS medicines.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>نام سازمان / مجوز</th><th>وظیفه قانونی و نقش کلیدی در سیستم سلامت استرالیا</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">AHPRA</td><td>آژانس ملی ثبت تمام حرفه‌های سلامت استرالیا. مدیریت پرونده‌های انتظامی و پیگیری شکایات مردمی.</td></tr><tr><td class="font-bold text-emerald-400">PBA (Pharmacy Board)</td><td>بورد تخصصی زیرمجموعه AHPRA؛ تدوین ۵ استاندارد الزامی ثبت نام، و تعیین کد رفتار حرفه‌ای.</td></tr><tr><td class="font-bold text-amber-400">PSA (Pharmaceutical Society)</td><td>انجمن عالی داروسازان استرالیا؛ متولی تدوین کد اخلاق و استانداردهای عملکرد حرفه‌ای.</td></tr><tr><td class="font-bold text-rose-400">Pharmacy Guild</td><td>اتحادیه کارفرمایی مالکان داروخانه‌ها و مذاکره‌کننده موافقت‌نامه‌های مالی CPA.</td></tr><tr><td class="font-bold text-teal-400">APC (Pharmacy Council)</td><td>نهاد مستقل اعتبارسنجی دانشکده‌های داروسازی و دوره‌های اینترنی.</td></tr><tr><td class="font-bold text-indigo-400">SHPA</td><td>انجمن داروسازان بیمارستانی و تولیدکننده راهنماهای تخصصی بالینی بیمارستان.</td></tr><tr><td class="font-bold text-rose-300">PDL</td><td>سازمان حامی داروسازان؛ ارائه بیمه مسئولیت حرفه‌ای و مشاوره قانونی.</td></tr><tr><td class="font-bold text-sky-300">Section 90 Approval</td><td>مجوز وزارت سلامت برای عرضه داروهای یارانه‌ای PBS بر اساس قوانین موقعیت مکانی.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>Organization / Approval</th><th>Statutory duties and core role in Australian healthcare</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">AHPRA</td><td>Manages national registration and complaints for health professions.</td></tr><tr><td class="font-bold text-emerald-400">PBA</td><td>National board under AHPRA that sets registration standards and professional conduct requirements.</td></tr><tr><td class="font-bold text-amber-400">PSA</td><td>Peak professional body that authors ethics and practice standards.</td></tr><tr><td class="font-bold text-rose-400">Pharmacy Guild</td><td>Represents pharmacy owners and negotiates Community Pharmacy Agreements.</td></tr><tr><td class="font-bold text-teal-400">APC</td><td>Independent accreditation authority for pharmacy degrees and intern programs.</td></tr><tr><td class="font-bold text-indigo-400">SHPA</td><td>Produces hospital pharmacy clinical guidance.</td></tr><tr><td class="font-bold text-rose-300">PDL</td><td>Provides pharmacist support, professional indemnity cover, and incident advice.</td></tr><tr><td class="font-bold text-sky-300">Section 90 Approval</td><td>Department of Health approval for supplying subsidised PBS medicines.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm1-sec8',
    module: 'mod1',
    category: { fa: 'سلسله‌مراتب راهنماها و PPS', en: 'Guidance Hierarchy & PPS' },
    categoryColor: 'amber',
    icon: 'Layers',
    title: {
      fa: 'هرم راهنماهای داروسازی و ۵ جریان استانداردهای عملکرد حرفه‌ای (PPS)',
      en: 'Hierarchy of Guidance & The 5 Streams of Professional Practice Standards (PPS)',
    },
    actionPearl: {
      fa: 'قانون در راس هرم الزامات قرار دارد؛ پس از آن استانداردهای ثبت بورد، و سپس استانداردهای عملکرد PSA قرار می‌گیرند.',
      en: 'Legislation is at the pinnacle of the hierarchy, followed by PBA Registration Standards, PSA Code of Ethics, and PPS.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">داروسازان برای انجام وظایف خود تابع یک سلسله‌مراتب قانونی و حرفه‌ای هستند:</p><ol class="list-decimal pl-5 space-y-1 text-xs"><li><strong>Legislation (قوانین):</strong> بالاترین سطح شامل قوانین ملی (National Law) و ایالتی. عدم رعایت آن پیگرد کیفری دارد.</li><li><strong>Registration Standards (استانداردهای ثبت PBA):</strong> شامل الزامات CPD، بیمه PII، سابقه کار، عدم سوءپیشینه و مهارت زبان انگلیسی.</li><li><strong>Codes & Guidelines (کد اخلاق PSA):</strong> ارزش‌های حرفه‌ای برای دفاع از حقوق بیمار.</li><li><strong>PPS (استانداردهای عملکرد حرفه‌ای PSA):</strong> شامل ۱۶ استاندارد در ۵ جریان اصلی: ۱. پایه‌های عملکرد، ۲. ارائه کالاهای درمانی، ۳. ارائه اطلاعات سلامت، ۴. ارائه خدمات حرفه‌ای، ۵. مراقبت مشارکتی.</li><li><strong>Competency Standards (استانداردهای صلاحیت):</strong> دامنه‌های ۱ تا ۵ برای سنجش حداقل توانایی داروساز.</li></ol></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Pharmacists operate under a legal and professional hierarchy of guidance:</p><ol class="list-decimal pl-5 space-y-1 text-xs"><li><strong>Legislation:</strong> Commonwealth and State Acts/Regulations at the top. Non-compliance is a criminal offense.</li><li><strong>Registration Standards (PBA):</strong> Mandatory standards (CPD, PII, Recency of Practice, Criminal History, English Language).</li><li><strong>Codes & Guidelines (PSA Code of Ethics):</strong> Professional principles safeguarding patient welfare and ethical duties.</li><li><strong>PPS (PSA Professional Practice Standards):</strong> 16 standards across 5 streams: 1. Foundations, 2. Supply of Goods, 3. Health Information, 4. Professional Services, 5. Collaborative Care.</li><li><strong>Competency Standards:</strong> Domains 1–5 defining expected entry-level and advanced skills for pharmacists.</li></ol></div>`,
    },
  },
  {
    id: 'm1-sec9',
    module: 'mod1',
    category: { fa: 'فرمت‌های نسخه دارویی', en: 'Prescription Formats' },
    categoryColor: 'emerald',
    icon: 'FileText',
    title: {
      fa: 'انواع فرمت‌های معتبر نسخه در استرالیا (کامپیوترساز، دستی، الکترونیک و بیمارستانی)',
      en: 'Australian Prescription Formats: Computerized, Handwritten, eScripts & Hospital',
    },
    actionPearl: {
      fa: 'هر دو نیمه نسخه کامپیوترساز (Original و Duplicate) باید با خودکار توسط پزشک امضا شوند.',
      en: 'Both halves of a computer-generated prescription (original & duplicate) must be physically signed by the prescriber.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>فرمت نسخه (Format)</th><th>ویژگی‌های کلیدی و نحوه مدیریت در داروخانه</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Computer-generated</td><td>چاپ شده از نرم‌افزار مطب؛ شامل نیمه Original (راست) و نیمه Duplicate برای مدیکر (چپ). در صورت وجود تکرار، برگه Repeat Dispensing چاپ و به نیمه کپی الصاق می‌شود.</td></tr><tr><td class="font-bold text-amber-400">Handwritten Script</td><td>فرم زرد رنگ شامل برگه اصلی و کاغذ کاربنی برای ثبت Medicare. نسخه کاربنی برای دولت ارسال می‌شود.</td></tr><tr><td class="font-bold text-purple-400">Hospital Script</td><td>دارای ۳ کپی کاربنی است. کپی سوم در پرونده بیمارستانی می‌ماند. برخی از این نسخه‌ها مشمول دریافت یارانه PBS در داروخانه‌های بیرون هستند.</td></tr><tr><td class="font-bold text-rose-400">eScript (Electronic)</td><td>نسخه دیجیتال قانونی با ارسال توکن QR Code از طریق SMS/Email. داروساز بارکد را اسکن کرده و اطلاعات مستقیم دانلود می‌شود (بدون نیاز به کاغذ).</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>Prescription Format</th><th>Key Characteristics & Pharmacy Handling</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Computer-generated</td><td>Printed via medical software; features Original (right) and Medicare Duplicate (left). Both halves must be physically signed. Repeat forms are attached to the Duplicate.</td></tr><tr><td class="font-bold text-amber-400">Handwritten Script</td><td>Yellow prescription pad with carbon copy. The carbon duplicate is submitted to Medicare for PBS claiming.</td></tr><tr><td class="font-bold text-purple-400">Hospital Script</td><td>Triplicate carbon prescription. The 3rd copy remains in the hospital medical chart. Eligible outpatient scripts can be filled in community pharmacy under PBS.</td></tr><tr><td class="font-bold text-rose-400">eScript (Electronic)</td><td>Legal paperless digital prescription issued via SMS/Email QR Token. Pharmacist scans token to download script details directly from Script Exchange.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm1-sec10',
    module: 'mod1',
    category: { fa: 'سلامت دیجیتال', en: 'Digital Health Ecosystem' },
    categoryColor: 'rose',
    icon: 'Cpu',
    title: {
      fa: 'اکوسیستم سلامت دیجیتال: پایش بلادرنگ (RTPM)، ASL و پرونده My Health Record',
      en: 'Digital Health: Active Script List (ASL), SafeScript RTPM & My Health Record',
    },
    actionPearl: {
      fa: 'سیستم ASL تمام نسخه‌های بیمار را در یک لیست یکپارچه ابری نگهداری می‌کند تا نیازی به اسکن تک‌تک توکن‌های QR نباشد.',
      en: 'The Active Script List (ASL) consolidates all patient eScripts, meaning patients no longer need to manage multiple QR tokens.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Active Script List (ASL):</strong> راه‌حلی برای بیمارانی با داروهای متعدد (Polypharmacy). داروساز با اجازه بیمار به لیست تمام نسخه‌های فعال او دسترسی پیدا کرده و مستقیماً دانلود می‌کند.</li><li><strong>Real-Time Prescription Monitoring (RTPM):</strong> سیستمی (مانند SafeScript) که اطلاعات داروهای تحت کنترل (Monitored Medicines) را بلادرنگ به پزشک و داروساز می‌دهد تا از اوردوز و Doctor Shopping جلوگیری شود.</li><li><strong>My Health Record:</strong> پرونده الکترونیک سلامت شخصی استرالیایی‌ها (بر اساس مدل Opt-out) که حاوی خلاصه ترخیص بیمارستان، گزارش آسیب‌شناسی، آلرژی‌ها و لیست داروهای دیسپنس‌شده است.</li></ul></div>`,
      en: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Active Script List (ASL):</strong> Cloud-based system consolidating all active eScripts for polypharmacy patients. With patient consent, pharmacists access and dispense without individual QR tokens.</li><li><strong>Real-Time Prescription Monitoring (RTPM):</strong> State systems (e.g., SafeScript) alerting prescribers and pharmacists in real time when dispensing high-risk monitored medicines to prevent doctor shopping and overdose.</li><li><strong>My Health Record:</strong> National opt-out digital health summary containing hospital discharge summaries, pathology reports, allergies, and dispensing history across Australia.</li></ul></div>`,
    },
  },
  {
    id: 'm1-sec11',
    module: 'mod1',
    category: { fa: 'مراجع کلیدی داروسازی', en: 'Clinical References' },
    categoryColor: 'sky',
    icon: 'BookOpen',
    title: {
      fa: 'شناخت مراجع بالینی ضروری (AMH, Don\'t Rush to Crush, APF, eTG, MIMS)',
      en: 'Essential Clinical References: AMH, APF, eTG, MIMS & Don\'t Rush to Crush',
    },
    actionPearl: {
      fa: 'کتاب AMH مرجع اصلی و مستقل برای دوزهاست؛ راهنمای Don\'t Rush to Crush برای مشکلات بلع و لوله تغذیه بیماران سالمند حیاتی است.',
      en: 'AMH is the independent national drug reference. Don\'t Rush to Crush is vital for safe medication administration via enteral tubes.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>مرجع علمی بالینی (Reference)</th><th>کاربرد اصلی در عملکرد روزمره داروساز</th></tr></thead><tbody><tr><td class="font-bold text-emerald-400">AMH (Australian Medicines Handbook)</td><td>مرجع مستقل کشوری برای چک کردن دوز استاندارد، مکانیسم اثر، تداخلات و نکات کاربردی (Practice Points).</td></tr><tr><td class="font-bold text-amber-400">APF (Australian Pharmaceutical Formulary)</td><td>تولید شده توسط PSA؛ شامل فرمول‌های داروهای ترکیبی (Compounding)، اطلاعات لیبل‌های هشدار (CAL) و توصیه‌های OTC.</td></tr><tr><td class="font-bold text-rose-400">Don't Rush to Crush</td><td>کتاب تولید شده توسط SHPA جهت ایمنی خرد کردن، باز کردن و تجویز داروها از طریق لوله تغذیه در بیماران دیسفاژی.</td></tr><tr><td class="font-bold text-sky-400">eTG (Therapeutic Guidelines)</td><td>ارائه پروتکل‌های خط اول (First-line) و خط دوم درمان بیماری‌ها، آنتی‌بیوتیک‌تراپی و ایمنی داروها در بارداری/شیردهی.</td></tr><tr><td class="font-bold text-purple-400">MIMS Online</td><td>بانک اطلاعات تجاری که شامل لیست تعاملات دارویی، عکس محصولات و جستجوی اطلاعات دارویی مصرف‌کننده (CMI) است.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>Clinical Reference</th><th>Core Role in Daily Pharmacy Practice</th></tr></thead><tbody><tr><td class="font-bold text-emerald-400">AMH (Australian Medicines Handbook)</td><td>Independent national drug monograph reference for dosing, mechanism, interactions, and clinical Practice Points.</td></tr><tr><td class="font-bold text-amber-400">APF (Australian Pharmaceutical Formulary)</td><td>Published by PSA; contains extemporaneous compounding formulas, Cautionary Advisory Labels (CAL), and OTC treatment protocols.</td></tr><tr><td class="font-bold text-rose-400">Don't Rush to Crush</td><td>SHPA handbook guiding safe crushing, capsule opening, and enteral tube administration for dysphagic patients.</td></tr><tr><td class="font-bold text-sky-400">eTG (Therapeutic Guidelines)</td><td>Evidence-based 1st and 2nd line disease management pathways, antibiotic prescribing, and pregnancy/lactation safety.</td></tr><tr><td class="font-bold text-purple-400">MIMS Online</td><td>Commercial database providing drug interaction checking, pill identification photos, and Consumer Medicine Information (CMI).</td></tr></tbody></table></div></div>`,
    },
  },

  // ================= MODULE 2 =================
  {
    id: 'm2-sec1',
    module: 'mod2',
    category: { fa: 'قوانین ملی داروسازی', en: 'National Legislation' },
    categoryColor: 'amber',
    icon: 'Gavel',
    title: {
      fa: 'هرم راهنماهای داروسازی و دو قانون اصلی (TGA Act و National Health Act)',
      en: 'Hierarchy of Guidelines, Therapeutic Goods Act & National Health Act',
    },
    actionPearl: {
      fa: 'قانون (Legislation) در بالاترین نقطه هرم راهنماها قرار دارد؛ Therapeutic Goods ناظر بر ساخت کالا و National Health ناظر بر یارانه‌هاست.',
      en: 'Legislation is at the top of the hierarchy. TGA governs safety/manufacturing; National Health Act governs PBS/subsidies.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">هرم هدایت داروسازان در استرالیا (Hierarchy): ۱. قوانین ملی و ایالتی (Legislation) -> ۲. استانداردهای ثبت بورد -> ۳. کد اخلاق PSA -> ۴. استانداردهای صلاحیت و عملکرد (PPS). دو مجموعه قانون ملی تاثیرگذار بر داروسازی وجود دارد:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>قانون (Act & Regulations)</th><th>مفاهیم و الزامات اجرایی</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Therapeutic Goods Act</td><td>تمرکز بر تضمین کیفیت، ایمنی و اثربخشی فرآورده‌ها. شامل قوانین ساخت (Manufacturing)، لیبل‌زنی، کیفیت بسته‌بندی و تجهیزات پزشکی است.</td></tr><tr><td class="font-bold text-emerald-400">National Health Act</td><td>تنظیم‌کننده نحوه ارائه مزایای دارویی (Pharmaceutical Benefits). ناظر بر طرح یارانه PBS، تایید داروخانه‌ها و قوانین Section 90 است.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">The hierarchy starts with Legislation (Acts & Regulations), followed by PBA Registration Standards, PSA Code of Ethics, and Practice Standards. Two primary Commonwealth Acts govern pharmacy:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>Legislation (Act)</th><th>Core Purpose & Statutory Scope</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Therapeutic Goods Act 1989</td><td>Regulates pre-market and post-market safety, quality, efficacy, Good Manufacturing Practice (GMP), ARTG listings, and labeling/packaging standards.</td></tr><tr><td class="font-bold text-emerald-400">National Health Act 1953</td><td>Regulates the provision of Pharmaceutical Benefits (PBS), pharmacy approval numbers (Section 90), and community pharmacy supply rules.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm2-sec2',
    module: 'mod2',
    category: { fa: 'جدول‌بندی داروها', en: 'Medicine Scheduling' },
    categoryColor: 'sky',
    icon: 'Boxes',
    title: {
      fa: 'جدول‌بندی داروها (SUSMP): از فروش عمومی (Unscheduled) تا داروهای تحت کنترل (S8)',
      en: 'Medicine Scheduling (SUSMP): Unscheduled, S2, S3, S4, and S8',
    },
    actionPearl: {
      fa: 'یک داروی واحد بر اساس دوز و اندازه بسته می‌تواند در جداول مختلف (مثلاً Ibuprofen در S2 تا S4) قرار گیرد.',
      en: 'Schedules classify danger. A single active ingredient can fall under multiple schedules based on dose or pack size.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">جدول‌بندی استانداردهای سموم (Standard for the Uniform Scheduling of Medicines and Poisons - SUSMP) خطرات داروها را دسته‌بندی می‌کند:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>Schedule</th><th>توضیح و محدودیت عرضه</th></tr></thead><tbody><tr><td class="font-bold text-slate-300">Unscheduled</td><td>فروش عمومی آزاد (General Sale) در سوپرمارکت.</td></tr><tr><td class="font-bold text-sky-400">Schedule 2</td><td><strong>Pharmacy Medicine:</strong> فقط در داروخانه فروخته می‌شود. دسترسی داروساز برای مشاوره در صورت نیاز فراهم است.</td></tr><tr><td class="font-bold text-emerald-400">Schedule 3</td><td><strong>Pharmacist Only Medicine:</strong> فقط با نظارت و <strong>مشاوره مستقیم شخص داروساز</strong> قابل فروش است.</td></tr><tr><td class="font-bold text-purple-400">Schedule 4</td><td><strong>Prescription Only Medicine:</strong> تحویل فقط با نسخه معتبر پزشک.</td></tr><tr><td class="font-bold text-rose-400">Schedule 8</td><td><strong>Controlled Drug:</strong> داروهای اعتیادآور و خطرناک. نیازمند نگهداری در گاوصندوق فولادی و ثبت دقیق در دفترچه اختصاصی.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">The Standard for the Uniform Scheduling of Medicines and Poisons (SUSMP) classifies medicines into schedules based on potential risk:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>Schedule Classification</th><th>Description & Supply Controls</th></tr></thead><tbody><tr><td class="font-bold text-slate-300">Unscheduled</td><td>General Sale items available in supermarkets or convenience stores.</td></tr><tr><td class="font-bold text-sky-400">Schedule 2</td><td><strong>Pharmacy Medicine:</strong> Supply restricted to pharmacies with advice available if required.</td></tr><tr><td class="font-bold text-emerald-400">Schedule 3</td><td><strong>Pharmacist Only Medicine:</strong> Requires direct professional intervention and consultation by a registered pharmacist.</td></tr><tr><td class="font-bold text-purple-400">Schedule 4</td><td><strong>Prescription Only Medicine:</strong> Prescription required from an authorized prescriber.</td></tr><tr><td class="font-bold text-rose-400">Schedule 8</td><td><strong>Controlled Drug:</strong> High potential for dependence/abuse. Mandatory storage in locked steel safe and double-entry register ledger.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm2-sec3',
    module: 'mod2',
    category: { fa: 'تفاوت‌های ایالتی S2 و S3', en: 'State Storage Variations' },
    categoryColor: 'teal',
    icon: 'MapPin',
    title: {
      fa: 'تفاوت قوانین ایالتی: نحوه چیدمان داروهای S2 و الزامات ثبت S3 Pseudoephedrine',
      en: 'State Legislation Variations: S2 Storage Locations & S3 Pseudoephedrine Recording',
    },
    actionPearl: {
      fa: 'در ایالت‌های QLD و WA داروهای S2 باید پشت پیشخوان (دور از دسترس عموم) باشند، اما در NSW مجاز به چیدمان در سالن هستند.',
      en: 'S2 items must be kept strictly behind the counter in WA and QLD to prevent public self-selection.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">قوانین دارویی در هر ایالت استرالیا تفاوت‌های ظریفی با یکدیگر دارند. داروساز موظف است قوانین ایالت محل کار خود را بداند.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>ایالت (State)</th><th>قانون نگهداری S2 (Pharmacy Medicine)</th><th>قانون ثبت سودوافدرین (S3 Pseudoephedrine)</th></tr></thead><tbody><tr><td class="font-bold text-amber-400">WA & QLD</td><td>باید دور از دسترس عموم (Behind counter) باشند تا انتخاب شخصی مسدود شود.</td><td>در WA و QLD استفاده از سیستم <strong>Project Stop</strong> کاملاً الزامی است.</td></tr><tr><td class="font-bold text-sky-400">ACT & TAS</td><td>باید در فاصله کمتر از ۴ متری از کانتر دیسپنس و در دید مستقیم داروساز باشند.</td><td>ارائه کارت شناسایی عکس‌دار الزامی است.</td></tr><tr><td class="font-bold text-emerald-400">NSW</td><td>تنها باید در داروخانه فروخته شوند (محدودیت فاصله‌ای ندارد).</td><td>ثبت با کارت شناسایی عکس‌دار و ترجیحاً Project Stop انجام شود.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Poisons legislation is state-based, creating operational variations across jurisdictions:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>State / Territory</th><th>S2 Storage Mandate</th><th>S3 Pseudoephedrine Recording Rule</th></tr></thead><tbody><tr><td class="font-bold text-amber-400">WA & QLD</td><td>Must be kept behind the counter out of reach of the public to prevent self-selection.</td><td>Mandatory real-time electronic recording via <strong>Project Stop</strong> system.</td></tr><tr><td class="font-bold text-sky-400">ACT & TAS</td><td>Must be within 4 meters of the dispensary counter under direct pharmacist supervision.</td><td>Mandatory photo ID check and record keeping.</td></tr><tr><td class="font-bold text-emerald-400">NSW</td><td>Must be sold within pharmacy premises (no specific distance limit).</td><td>Photo ID check required, electronic Project Stop recording recommended.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm2-sec4',
    module: 'mod2',
    category: { fa: 'تفاوت‌های ایالتی S8', en: 'State S8 Regulations' },
    categoryColor: 'rose',
    icon: 'Scale',
    title: {
      fa: 'تفاوت قوانین ایالتی در داروهای S8: انبارگردانی فیزیکی و الزامات نسخه مجزا',
      en: 'State S8 Variations: Separate Prescriptions & Register Stocktake Frequencies',
    },
    actionPearl: {
      fa: 'انبارگردانی داروهای S8 در NSW سالی دو بار (مارس و سپتامبر) و در WA حداقل یک‌بار در ماه اجباری است.',
      en: 'NSW mandates S8 register stocktakes in March and September. WA mandates stocktakes at least once a month.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>ایالت (State)</th><th>قانون نگارش نسخه S8 (همراه با سایر داروها)</th><th>فرکانس الزام‌آور انبارگردانی فیزیکی S8 (Stocktake)</th></tr></thead><tbody><tr><td class="font-bold text-amber-400">Western Australia (WA)</td><td>باید در نسخه مجزا باشد (مگر اقلام مختلف همان داروی پایه باشند).</td><td>باید حداقل <strong>ماهی یک‌بار</strong> شمارش فیزیکی انجام شود.</td></tr><tr><td class="font-bold text-emerald-400">New South Wales (NSW)</td><td>داروی S8 باید کاملاً روی برگه جداگانه‌ای نوشته شود.</td><td>باید در ماه‌های <strong>مارس و سپتامبر (دو بار در سال)</strong> و هنگام تحویل مسئولیت انجام شود.</td></tr><tr><td class="font-bold text-purple-400">VIC, SA, ACT</td><td>نگارش داروی S8 همراه با داروهای دیگر روی یک نسخه مجاز است.</td><td>به صورت منظم طبق بهترین استانداردهای عملکرد (بدون ماه مشخص).</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>State / Jurisdiction</th><th>S8 Script Writing Requirement</th><th>Mandatory S8 Physical Register Stocktake Frequency</th></tr></thead><tbody><tr><td class="font-bold text-amber-400">Western Australia (WA)</td><td>Must be written on a separate prescription form (unless different strengths of same item).</td><td>Mandatory physical stock reconciliation at least <strong>once per calendar month</strong>.</td></tr><tr><td class="font-bold text-emerald-400">New South Wales (NSW)</td><td>S8 drug must be written on a separate prescription form.</td><td>Mandatory physical stock check twice yearly in <strong>March and September</strong> and upon change of PIC.</td></tr><tr><td class="font-bold text-purple-400">VIC, SA, ACT</td><td>S8 items can be included on the same prescription as S4 items.</td><td>Regular periodic stock checks recommended as good pharmacy practice.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm2-sec5',
    module: 'mod2',
    category: { fa: 'اخلاق و تبلیغات', en: 'Ethics & Advertising' },
    categoryColor: 'purple',
    icon: 'Megaphone',
    title: {
      fa: 'اخلاق داروسازی، تعارض با قانون و مقررات تبلیغات دارویی TGA',
      en: 'Pharmacy Ethics, Conflict with Law & TGA Medicine Advertising Framework',
    },
    actionPearl: {
      fa: 'در صورت تعارض اخلاق با قانون، قانون همیشه تقدم دارد؛ تبلیغ عمومی داروهای نسخه‌ای (S4/S8) ممنوع است.',
      en: 'In conflicts between Code of Ethics and Law, the Law takes precedence. Prescription meds cannot be advertised to public.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">در صورت تعارض اخلاق حرفه‌ای با قانون، همیشه قانون ارجحیت دارد. طبق مقررات TGA، تبلیغ عموم برای داروهای نسخه‌ای (S4 و S8) مطلقاً ممنوع است و فقط اطلاع‌رسانی علمی در مجلات پزشکی تخصصی مجاز می‌باشد. داروهای S2 و S3 طبق ضوابط TGA Advertising Code قابل تبلیغ عمومی هستند.</p></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">In any conflict between the professional Code of Ethics and Statutory Law, the <strong>Law strictly takes precedence</strong>. Under the TGA Therapeutic Goods Advertising Code, direct-to-consumer advertising of S4 (Prescription Only) and S8 (Controlled) medicines is prohibited. Non-prescription S2 and S3 medicines may be advertised to the public subject to specific TGA advertising rules.</p></div>`,
    },
  },
  {
    id: 'm2-sec6',
    module: 'mod2',
    category: { fa: 'تحویل اضطراری بدون نسخه', en: 'Emergency Supply Options' },
    categoryColor: 'rose',
    icon: 'Cross',
    title: {
      fa: 'سناریوی منقضی شدن نسخه، تحویل اضطراری (Emergency Supply) و Continued Dispensing',
      en: 'Expired Prescription Supply Options: Emergency Supply & Continued Dispensing',
    },
    actionPearl: {
      fa: 'در تحویل اضطراری (Emergency Supply) حداکثر ۳ روز درمان داده می‌شود؛ اما در Continued Dispensing یک بسته کامل PBS تحویل می‌شود.',
      en: 'Emergency Supply is limited to 3 days treatment. Continued dispensing allows for a full standard PBS quantity supply.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>روش تحویل داروی بدون نسخه معتبر</th><th>شرایط، الزامات و محدودیت‌های قانونی</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Emergency Supply (تامین اضطراری)</td><td>زمانی که پزشک در دسترس نیست و داروی S4 برای بیمار <strong>حیاتی</strong> است (قبلاً درمان ثابت داشته).<br>محدودیت: حداکثر <strong>۳ روز درمان</strong> (یا کوچکترین بسته استاندارد برای کرم‌ها/اسپری‌ها).</td></tr><tr><td class="font-bold text-emerald-400">Continued Dispensing (ادامه تحویل)</td><td>طبق National Health Continued Dispensing Determination 2022 برای داروهای مزمن خاص (استاتین‌ها، فشارخون، OCP و غیره).<br>محدودیت: تحویل <strong>یک مقدار کامل استاندارد PBS</strong> (سالی یک‌بار برای هر دارو).</td></tr><tr><td class="font-bold text-amber-400">Prescriber Phone Direction</td><td>اخذ دستور تلفنی یا فکس مستقیم از پزشک آنکال به داروساز.<br>محدودیت: تحویل طبق دستور پزشک انجام شده و پزشک قانوناً موظف است اصل نسخه را <strong>ظرف ۲۴ ساعت</strong> ارسال کند.</td></tr></tbody></table></div><p class="text-[11px] opacity-80 mt-2">توجه: همیشه پیش از تحویل، بررسی کنید که کدام گزینه از لحاظ قانونی مجاز و از لحاظ اخلاقی بهترین انتخاب برای ایمنی بیمار است. قانون همیشه بر اخلاق تقدم دارد.</p></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>Non-Prescription Supply Pathway</th><th>Legal Conditions, Requirements & Supply Limits</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Emergency Supply</td><td>When prescriber is unavailable and S4 medication is essential for continuous treatment.<br>Limit: Maximum <strong>3 days supply</strong> (or smallest standard pack for creams/inhalers). Private fee applies.</td></tr><tr><td class="font-bold text-emerald-400">Continued Dispensing</td><td>Under National Health Continued Dispensing Determination for eligible chronic meds (statins, antihypertensives, oral contraceptives).<br>Limit: <strong>1 full PBS standard quantity</strong> (once per medicine per 12-month period). Subsidized via PBS.</td></tr><tr><td class="font-bold text-amber-400">Prescriber Verbal Direction</td><td>Direct oral/verbal/fax instruction from the prescriber to the pharmacist.<br>Limit: Prescriber is legally required to forward the signed paper/eScript original within <strong>24 hours</strong>.</td></tr></tbody></table></div><p class="text-[11px] opacity-80 mt-2">Note: Always evaluate which pathway is legally valid and ethically appropriate for patient safety. Statutory law always overrides ethical preference.</p></div>`,
    },
  },

  // ================= MODULE 3 =================
  {
    id: 'm3-sec1',
    module: 'mod3',
    category: { fa: 'سرفه و سرماخوردگی', en: 'Coughs & Colds' },
    categoryColor: 'emerald',
    icon: 'Activity',
    title: {
      fa: 'تشخیص و ارجاع انواع سرفه: خشک، خلط‌دار و علائم هشدار ارجاع (Red Flags)',
      en: 'Cough Classification (Dry vs Chesty) & Red Flags for GP Referral',
    },
    actionPearl: {
      fa: 'سرفه مزمن بالای ۸ هفته یا وجود خلط خونی نیازمند ارجاع است؛ داروهای سرفه برای کودکان زیر ۶ سال ممنوع است.',
      en: 'Chronic cough >8 weeks requires referral. Cough medicines are contraindicated in children under 6 years of age.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">سرفه‌ها به دو گروه اصلی تقسیم می‌شوند: <strong>سرفه خشک (Dry Cough)</strong> که معمولاً بدون خلط، تحریک‌کننده و همراه با خارش گلو است؛ و <strong>سرفه خلط‌دار (Chesty Cough)</strong> که با تولید مخاط (Phlegm) همراه است. سرفه مزمن (Chronic) سرفه‌ای است که بیش از ۸ هفته طول بکشد.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>علائم هشدار ارجاع به پزشک (When to refer to GP)</th></tr></thead><tbody><tr><td>۱. سرفه غیرقابل توجیه که بیش از ۲ هفته ادامه یابد.</td></tr><tr><td>۲. خلط خونی (Hemoptysis)، تنگی نفس (Dyspnea)، درد سینه (Chest pain) یا خس‌خس سینه (Wheezing).</td></tr><tr><td>۳. علائم سیستمیک نظیر کاهش وزن بی‌دلیل یا تب.</td></tr><tr><td>۴. خلط تغییررنگ‌یافته یا چرکی (Purulent sputum) و گرفتگی شدید صدا (Persistent hoarseness).</td></tr><tr><td>۵. صدای غیرعادی تنفس مانند استریدور (Stridor - صدای سوت‌مانند بالا).</td></tr><tr><td>۶. سرفه خلط‌دار عودکننده در کودک (مخصوصاً در شب) یا مشکلات بلع و خفگی.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Cough is categorized as <strong>Dry Cough</strong> (non-productive, tickly, irritating) or <strong>Chesty Cough</strong> (productive with mucus/phlegm). Cough >8 weeks is classified as chronic.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>Red Flags Mandatory for GP Referral</th></tr></thead><tbody><tr><td>1. Unexplained cough lasting longer than 2 weeks.</td></tr><tr><td>2. Hemoptysis (blood-stained sputum), dyspnea (shortness of breath), chest pain, or wheezing.</td></tr><tr><td>3. Systemic symptoms such as unexplained weight loss, night sweats, or high fever.</td></tr><tr><td>4. Discolored or purulent sputum and persistent hoarseness (>3 weeks).</td></tr><tr><td>5. Abnormal breathing sounds such as stridor (high-pitched inspiratory sound).</td></tr><tr><td>6. Recurrent nocturnal cough in pediatric patients or dysphagia/choking history.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec2',
    module: 'mod3',
    category: { fa: 'درمان دارویی سرفه', en: 'Cough Medications' },
    categoryColor: 'sky',
    icon: 'Pill',
    title: {
      fa: 'درمان دارویی سرفه: Antitussives، Mucolytics و فراخوان کشوری Pholcodine',
      en: 'Cough Treatments: Antitussives, Mucolytics & Pholcodine Recall',
    },
    actionPearl: {
      fa: 'فولکودین به علت ایجاد واکنش متقاطع آنفولاکسی با داروهای بیهوشی (NMBAs) کلاً از بازار استرالیا جمع‌آوری شد.',
      en: 'Pholcodine was recalled due to perioperative NMBA cross-sensitization anaphylaxis risk during general anesthesia.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>نوع سرفه / دارو</th><th>ماده موثره و برندهای اصلی استرالیا</th><th>جدول قانونی (Schedule) و دوز استاندارد بزرگسال</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">سرفه خشک (Dry Cough)</td><td>Dextromethorphan (Robitussin Dry Cough)<br>Dihydrocodeine (Rikodeine Syrup)</td><td>Robitussin: S2 (۱۰ میلی‌گرم هر ۶-۸ ساعت)<br>Rikodeine: S3 (۵ تا ۱۰ میلی‌گرم هر ۴-۶ ساعت)</td></tr><tr><td class="font-bold text-amber-400">سرفه خلط‌دار (Chesty Cough)</td><td>Bromhexine (Bisolvon Chesty)<br>Ivy Leaf Extract (Prospan)</td><td>Bromhexine: S2 (۸ میلی‌گرم ۳ بار در روز)<br>Prospan: Unscheduled (۵ تا ۷.۵ میلی‌گرم ۳ بار در روز)</td></tr><tr><td class="font-bold text-rose-400">احتقان بینی (Decongestant)</td><td>Pseudoephedrine (Sudafed Single Ingredient)</td><td>S3 یا S4 (۶۰ میلی‌گرم هر ۴-۶ ساعت)؛ ثبت کارت شناسایی عکس‌دار در سیستم Project Stop الزامی است.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>Cough Type / Class</th><th>Active Ingredient & Common Australian Brands</th><th>Legal Schedule & Standard Adult Dose</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Dry Cough (Antitussive)</td><td>Dextromethorphan (Robitussin Dry Cough)<br>Dihydrocodeine (Rikodeine Syrup)</td><td>Robitussin: S2 (10mg q6-8h)<br>Rikodeine: S3 (5–10mg q4-6h)</td></tr><tr><td class="font-bold text-amber-400">Chesty Cough (Mucolytic)</td><td>Bromhexine (Bisolvon Chesty)<br>Ivy Leaf Extract (Prospan)</td><td>Bromhexine: S2 (8mg TDS)<br>Prospan: Unscheduled (5–7.5mg TDS)</td></tr><tr><td class="font-bold text-rose-400">Nasal Decongestant</td><td>Pseudoephedrine (Sudafed Single Ingredient)</td><td>S3/S4 (60mg q4-6h); mandatory photo ID check and electronic Project Stop recording.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec3',
    module: 'mod3',
    category: { fa: 'تب یونجه و آلرژی', en: 'Hay Fever & Allergy' },
    categoryColor: 'purple',
    icon: 'Sparkles',
    title: {
      fa: 'تب یونجه (Hay Fever)، آنتی‌هیستامین‌ها و اسپری‌های بینی استروئیدی',
      en: 'Allergic Rhinitis (Hay Fever), Oral Antihistamines & Corticosteroid Sprays',
    },
    actionPearl: {
      fa: 'آنتی‌هیستامین‌های نسل جدید غیرخواب‌آور خط اول درمان تب یونجه هستند؛ اسپری استروئیدی برای علائم متوسط/شدید کاربرد دارد.',
      en: 'Non-sedating antihistamines are 1st-line for mild/moderate Hay Fever. Intranasal steroids are for moderate/severe symptoms.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>کلاس دارویی</th><th>نام ژنریک و برند استرالیایی</th><th>دوز استاندارد روزانه و ویژگی بالینی</th></tr></thead><tbody><tr><td class="font-bold text-emerald-400">غیر خواب‌آور (Non-Sedating)</td><td>Fexofenadine (Tefast)<br>Loratadine (Claratyne)<br>Cetirizine (Zyrtec)</td><td>Tefast: 180mg daily (Unscheduled/S2)<br>Claratyne: 10mg daily (Unscheduled/S2)<br>Zyrtec: 10mg daily (Unscheduled/S2)</td></tr><tr><td class="font-bold text-rose-400">خواب‌آور (Sedating)</td><td>Promethazine (Phenergan)<br>Dexchlorpheniramine (Polaramine)</td><td>Phenergan: 25mg at night (S2/S3/S4)<br>Polaramine: 2mg at night (S2/S3)</td></tr><tr><td class="font-bold text-sky-400">اسپری بینی استروئیدی</td><td>Fluticasone (Flixonase)<br>Mometasone (Nasonex)</td><td>S2/S3. مصرف منظم روزانه ۲ پاف در هر سوراخ بینی برای آلرژی متوسط/شدید.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>Drug Class</th><th>Generic Name & Australian Brands</th><th>Standard Daily Dosage & Clinical Profile</th></tr></thead><tbody><tr><td class="font-bold text-emerald-400">Non-Sedating Antihistamines</td><td>Fexofenadine (Tefast)<br>Loratadine (Claratyne)<br>Cetirizine (Zyrtec)</td><td>Tefast: 180mg daily (Unscheduled/S2)<br>Claratyne: 10mg daily (Unscheduled/S2)<br>Zyrtec: 10mg daily (Unscheduled/S2)</td></tr><tr><td class="font-bold text-rose-400">Sedating Antihistamines</td><td>Promethazine (Phenergan)<br>Dexchlorpheniramine (Polaramine)</td><td>Phenergan: 25mg at night (S2/S3/S4)<br>Polaramine: 2mg at night (S2/S3)</td></tr><tr><td class="font-bold text-sky-400">Intranasal Steroid Sprays</td><td>Fluticasone (Flixonase)<br>Mometasone (Nasonex)</td><td>S2/S3. Regular daily use 2 sprays per nostril for moderate/severe allergic rhinitis.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec4',
    module: 'mod3',
    category: { fa: 'مسکن‌ها و درد', en: 'Analgesics & Pain' },
    categoryColor: 'amber',
    icon: 'Zap',
    title: {
      fa: 'مسکن‌های OTC (استامینوفن، ایبوپروفن، دیکلوفناک) و پروتکل RICER',
      en: 'OTC Analgesics, Slow-Release Paracetamol S3 Change & RICER Soft Tissue Protocol',
    },
    actionPearl: {
      fa: 'استامینوفن آهسته‌رهش (Panadol Osteo) به دلیل خطرات مسمومیت کبدی (Overdose) به جدول S3 انتقال یافت.',
      en: 'Slow-release Paracetamol was rescheduled to S3 in 2020 due to complex overdose management.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>مسکن ژنریک</th><th>برندهای رایج استرالیا</th><th>جدول قانونی (Schedule) و دوز استاندارد بزرگسال</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Paracetamol IR</td><td>Panadol, Panamax</td><td>Unscheduled (بسته ۲۰ تایی), S2 (بسته ۱۰۰ تایی). دوز: ۵۰۰mg تا ۱g هر ۴-۶ ساعت (حداکثر ۴g در روز).</td></tr><tr><td class="font-bold text-amber-400">Paracetamol MR</td><td>Panadol Osteo, Osteomol</td><td>Schedule 3 (Pharmacist Only) پس از سال ۲۰۲۰. دوز: ۲ قرص ۶۶۵mg سه بار در روز.</td></tr><tr><td class="font-bold text-emerald-400">Ibuprofen</td><td>Nurofen, Advil</td><td>Unscheduled (بسته ۲۴ تایی), S2, S3. دوز: ۲۰۰mg تا ۴۰۰mg ۳ تا ۴ بار در روز همراه غذا.</td></tr><tr><td class="font-bold text-rose-400">Diclofenac</td><td>Voltaren, Fenac</td><td>Unscheduled (ژل), S2 (قرص ۱۲.۵mg), S3 (قرص ۲۵mg). قرص ۵۰mg الزاماً S4 با نسخه است.</td></tr><tr><td class="font-bold text-purple-400">Aspirin (Low-Dose)</td><td>Cartia, Spren, Astrix</td><td>Unscheduled / S2. دوز: ۱۰۰mg روزانه جهت اثرات آنتی‌ترومبوتیک.</td></tr></tbody></table></div><div class="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200"><strong>پروتکل آسیب بافت نرم (RICER Protocol):</strong> Rest (استراحت) -> Ice (کمپرس یخ ۱۵-۲۰ دقیقه هر ۲-۴ ساعت) -> Compression (بانداژ محکم) -> Elevation (بالا نگه داشتن عضو) -> Referral (ارجاع به GP در صورت عدم بهبود ظرف ۷۲ ساعت).</div></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>Generic Analgesic</th><th>Common Australian Brands</th><th>Legal Schedule & Standard Adult Dosage</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Paracetamol Immediate Release</td><td>Panadol, Panamax</td><td>Unscheduled (20-pack), S2 (100-pack). Dosage: 500mg to 1g q4-6h (Max 4g daily).</td></tr><tr><td class="font-bold text-amber-400">Paracetamol Modified Release</td><td>Panadol Osteo, Osteomol</td><td>Schedule 3 (Pharmacist Only). Dosage: 2 tablets 665mg TDS (Max 3990mg daily).</td></tr><tr><td class="font-bold text-emerald-400">Ibuprofen</td><td>Nurofen, Advil</td><td>Unscheduled (24-pack), S2, S3. Dosage: 200mg to 400mg TDS/QID with food.</td></tr><tr><td class="font-bold text-rose-400">Diclofenac</td><td>Voltaren, Fenac</td><td>Unscheduled (gel), S2 (12.5mg tabs), S3 (25mg tabs). 50mg tabs are strictly S4.</td></tr><tr><td class="font-bold text-purple-400">Low-Dose Aspirin</td><td>Cartia, Spren, Astrix</td><td>Unscheduled / S2. Dosage: 100mg daily for antiplatelet effect.</td></tr></tbody></table></div><div class="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200"><strong>Soft Tissue Injury Management (RICER Protocol):</strong> Rest -> Ice (15–20 min every 2–4h) -> Compression (firm bandage) -> Elevation -> Referral (to GP if no improvement within 72 hours).</div></div>`,
    },
  },
  {
    id: 'm3-sec5',
    module: 'mod3',
    category: { fa: 'گوارش، یبوست و اسهال', en: 'GI Conditions' },
    categoryColor: 'teal',
    icon: 'CircleDot',
    title: {
      fa: 'مدیریت مشکلات گوارشی: سوءهاضمه، ملین‌ها (Laxatives)، ORS و PPIs',
      en: 'Gastrointestinal: Dyspepsia Red Flags, Laxative Classes, ORS & PPI Dosing',
    },
    actionPearl: {
      fa: 'در ملین‌های حجم‌دهنده (Metamucil) مصرف آب فراوان الزامی است؛ PPIها ابتدا ۲ هفته روزانه سپس در صورت نیاز مصرف می‌شوند.',
      en: 'Bulk-forming laxatives require high water intake. PPIs are taken daily for 2 weeks, then stepped down to PRN.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs text-rose-300"><li><strong>علائم ارجاع سوءهاضمه:</strong> دیسفاژی (سختی بلع)، بلع دردناک، خونریزی گوارشی، استفراغ مکرر، کاهش وزن بی‌دلیل، فشار در قفسه سینه.</li></ul><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>عارضه گوارشی</th><th>کلاس دارویی / برند استرالیایی</th><th>ماده موثره و دستور مصرف استاندارد</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">یبوست (Constipation)</td><td>Metamucil (Bulking Agent)<br>Coloxyl with Senna (Softener+Stimulant)<br>Movicol (Osmotic)</td><td>Metamucil: Psyllium Husk (۱ پیمانه با آب فراوان)<br>Coloxyl: Docusate + Cennoside (۱-۲ قرص شب‌ها)<br>Movicol: Macrogol + Electrolytes</td></tr><tr><td class="font-bold text-rose-400">اسهال (Diarrhea)</td><td>Hydralyte / Gastrolyte (ORS)<br>Imodium (Anti-diarrheal)</td><td>Hydralyte: ساشه/محلول سرم جبران الکترولیت (خط اول)<br>Imodium: Loperamide (۴mg ابتدا، سپس ۲mg پس از هر اسهال، max 16mg)</td></tr><tr><td class="font-bold text-emerald-400">سوء هاضمه و رفلاکس</td><td>Mylanta (Antacid)<br>Nexium / Somac (PPI)</td><td>Mylanta: Aluminum + Magnesium Hydroxide (۱۰ml بعد غذا)<br>Nexium: Esomeprazole 20mg (۱ قرص روزانه تا ۲ هفته)</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs text-rose-300"><li><strong>Dyspepsia Red Flags:</strong> Dysphagia (difficulty swallowing), odynophagia, GI bleeding, recurrent vomiting, unexplained weight loss, chest pressure.</li></ul><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>GI Condition</th><th>Drug Class / Brand</th><th>Active Ingredient & Standard Dosage Protocol</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Constipation</td><td>Metamucil (Bulk Agent)<br>Coloxyl with Senna (Softener+Stimulant)<br>Movicol (Osmotic Laxative)</td><td>Metamucil: Psyllium Husk (1 scoop with large glass of water)<br>Coloxyl: Docusate + Sennosides (1–2 tablets at bedtime)<br>Movicol: Macrogol + Electrolytes (1–3 sachets daily)</td></tr><tr><td class="font-bold text-rose-400">Diarrhea</td><td>Hydralyte / Gastrolyte (ORS)<br>Imodium (Antidiarrheal)</td><td>Hydralyte: Oral rehydration solution sachets (1st-line)<br>Imodium: Loperamide (4mg initial, then 2mg after loose stool, max 16mg)</td></tr><tr><td class="font-bold text-emerald-400">Dyspepsia & GORD</td><td>Mylanta (Antacid)<br>Nexium / Somac (PPI)</td><td>Mylanta: Aluminum + Magnesium Hydroxide (10–20mL PC)<br>Nexium: Esomeprazole 20mg (1 tablet daily for 14 days)</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec6',
    module: 'mod3',
    category: { fa: 'ترک سیگار NRT', en: 'Smoking Cessation NRT' },
    categoryColor: 'purple',
    icon: 'Flame',
    title: {
      fa: 'ترک سیگار، چارچوب 5A\'s، ارزیابی وابستگی به نیکوتین و فرآورده‌های NRT',
      en: 'Smoking Cessation 5A\'s Framework, Nicotine Dependence Levels & NRT Formulations',
    },
    actionPearl: {
      fa: 'بیمارانی که در طول شب برای سیگار بیدار می‌شوند یا ظرف ۵ دقیقه پس از بیداری سیگار می‌کشند، وابستگی شدید (High) دارند.',
      en: 'High dependence is characterized by waking at night to smoke or smoking within 5 minutes of waking.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">چارچوب ۵ گام ترک سیگار (5 A's): Ask -> Assess -> Advise -> Assist -> Arrange.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>سطح وابستگی</th><th>شاخص بالینی (زمان سیگار پس از بیداری)</th><th>فرآورده NRT پیشنهادی (Nicorette, Nicabate)</th></tr></thead><tbody><tr><td class="font-bold text-rose-400">High Dependence (وابستگی شدید)</td><td>مصرف سیگار ظرف ۵ دقیقه پس از بیداری؛ مصرف بالای ۳۰ سیگار در روز.</td><td>چسب نیکوتین بالاترین دوز (Step 1) یا ترکیب چسب با اسپری دهانی/آدامس.</td></tr><tr><td class="font-bold text-amber-400">Moderate Dependence (وابستگی متوسط)</td><td>مصرف سیگار ظرف ۳۰ دقیقه پس از بیداری؛ ۲۰ تا ۳۰ سیگار در روز.</td><td>چسب دوز متوسط یا آدامس ۴mg / لوزنج ۴mg.</td></tr><tr><td class="font-bold text-emerald-400">Low-Moderate Dependence</td><td>بدون نیاز به سیگار تا ۳۰ دقیقه پس از بیداری؛ ۱۰ تا ۲۰ سیگار در روز.</td><td>آدامس ۲mg / لوزنج ۱.۵ تا ۲mg / اینهالر ۱۵mg.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Smoking Cessation 5 A's Framework: Ask -> Assess -> Advise -> Assist -> Arrange.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-purple-950/40 text-purple-300"><th>Dependence Level</th><th>Clinical Indicator (Time to 1st cigarette)</th><th>Recommended NRT Product (Nicorette, Nicabate)</th></tr></thead><tbody><tr><td class="font-bold text-rose-400">High Dependence</td><td>Smokes within 5 minutes of waking; >30 cigarettes daily.</td><td>Nicotine Patch High Dose (Step 1 21mg/24h) or Combination Therapy (Patch + Gum/Spray).</td></tr><tr><td class="font-bold text-amber-400">Moderate Dependence</td><td>Smokes within 30 minutes of waking; 20–30 cigarettes daily.</td><td>Moderate dose Patch or 4mg Gum / 4mg Lozenge.</td></tr><tr><td class="font-bold text-emerald-400">Low-Moderate Dependence</td><td>First cigarette >30 minutes after waking; 10–20 cigarettes daily.</td><td>2mg Gum / 1.5–2mg Lozenge / 15mg Inhalator.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec7',
    module: 'mod3',
    category: { fa: 'گوش و پوست', en: 'Ear & Skin Care' },
    categoryColor: 'rose',
    icon: 'Thermometer',
    title: {
      fa: 'مدیریت تجمع جرم گوش (Cerumol)، درماتیت (Dermaid)، تینئا و عفونت قارچی',
      en: 'Ear Wax Buildup (Waxsol) & Skin Conditions (Dermatitis, Tinea, Hydrosole)',
    },
    actionPearl: {
      fa: 'کرم هیدروزول (Hydrosole) ترکیب کلوتریمازول ۱٪ با هیدروکورتیزون ۱٪ است که منحصراً برای عفونت‌های قارچی ملتهب کاربرد دارد.',
      en: 'Hydrosole cream combines Clotrimazole 1% with Hydrocortisone 1% for inflamed fungal skin infections.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs text-rose-300"><li><strong>علائم ارجاع در گوش:</strong> درد گوش، فشار/زنگ زدن، سابقه پارگی پرده گوش (Perforation)، یا ترشح/خونریزی در گوش (منع مصرف کامل قطره‌های OTC).</li></ul><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>عارضه پوستی/گوش</th><th>داروی انتخابی و برند</th><th>جدول قانونی (Schedule) و نحوه مصرف</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">جرم گوش (Ear Wax)</td><td>Cerumol / Waxsol</td><td>Unscheduled. به عنوان نرم‌کننده (Ceruminolytics).</td></tr><tr><td class="font-bold text-emerald-400">Dermatitis / Eczema Flare</td><td>Hydrocortisone 1% (Dermaid Cream)</td><td>S2, S3, S4. مصرف روزانه ۲ بار لایه باریک روی ضایعات ملتهب.</td></tr><tr><td class="font-bold text-amber-400">Tinea (Athlete's Foot / Groin)</td><td>Clotrimazole 1% (Canesten)<br>Terbinafine 1% (Solve Easy)</td><td>Clotrimazole: S2/S3 (۲ تا ۳ بار در روز)<br>Terbinafine: Unscheduled/S2 (روزی ۱ بار به مدت ۱ هفته)</td></tr><tr><td class="font-bold text-rose-400">Inflamed Fungal Infection</td><td>Hydrosole Cream (Clotrimazole + Hydrocortisone)</td><td>Schedule 3 / S4. مصرف ۲ تا ۳ بار در روز تا رفع التهاب.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><ul class="list-disc pl-5 space-y-1 text-xs text-rose-300"><li><strong>Ear Red Flags:</strong> Otalgia (severe ear pain), tinnitus, history of tympanic membrane perforation, purulent discharge, or bleeding (OTC drops strictly contraindicated).</li></ul><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>Condition</th><th>First-line Treatment & Brand</th><th>Legal Schedule & Directions</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Ear Wax Impaction</td><td>Cerumol / Waxsol Drops</td><td>Unscheduled. Ceruminolytic drops to soften wax prior to syringing.</td></tr><tr><td class="font-bold text-emerald-400">Dermatitis / Eczema Flare</td><td>Hydrocortisone 1% (Dermaid Cream)</td><td>S2/S3/S4. Apply thin layer BD for mild-moderate inflammatory flares.</td></tr><tr><td class="font-bold text-amber-400">Tinea (Athlete's Foot / Ringworm)</td><td>Clotrimazole 1% (Canesten)<br>Terbinafine 1% (Solve Easy)</td><td>Clotrimazole: S2/S3 (apply BD-TDS)<br>Terbinafine: Unscheduled/S2 (apply OD for 7 days)</td></tr><tr><td class="font-bold text-rose-400">Inflamed Fungal Infection</td><td>Hydrosole Cream (Clotrimazole + Hydrocortisone)</td><td>Schedule 3 / S4. Apply BD until acute inflammation subsides.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm3-sec8',
    module: 'mod3',
    category: { fa: 'تکنیسین داروخانه', en: 'Pharmacy Assistant Role' },
    categoryColor: 'indigo',
    icon: 'UserCheck',
    title: {
      fa: 'نقش، جایگاه و مسئولیت‌های قانونی دستیار/تکنیسین داروخانه در استرالیا',
      en: 'Role & Responsibilities of the Pharmacy Assistant in Australia',
    },
    actionPearl: {
      fa: 'تکنیسین داروخانه یک نیروی آموزش‌دیده است که قانوناً باید زیر نظر مستقیم داروساز ثبت‌شده فعالیت کند.',
      en: 'A pharmacy assistant is a trained professional who MUST work under the supervision of a registered pharmacist.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">دستیار داروخانه (Pharmacy Assistant) همکار حیاتی در داروخانه جامعه است. مسئولیت‌های کلیدی عبارتند از:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li>حمایت از داروساز در پردازش و دیسپنس نسخه‌ها.</li><li>ارائه مشاوره اولیه مصرف صحیح به بیماران برای داروهای Unscheduled و S2 (ارائه S3 منحصراً وظیفه شخص داروساز است).</li><li>مدیریت انبار (Inventory) و کنترل تاریخ انقضای داروها.</li><li>حفظ نظافت، بهداشت و سازماندهی محیط دیسپنسری.</li><li>ارجاع فوری بیماران دارای "علائم هشدار" (Red Flags) به شخص داروساز (Pharmacist intervention).</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">The Pharmacy Assistant is a vital member of the community pharmacy team operating under direct pharmacist supervision:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li>Assisting the registered pharmacist with processing and dispensing prescriptions.</li><li>Providing basic over-the-counter advice for Unscheduled and Schedule 2 items (Schedule 3 supply requires direct pharmacist consultation).</li><li>Inventory control, stock rotation, and managing expiry dates.</li><li>Maintaining dispensary cleanliness, hygiene, and organization.</li><li>Immediate referral of complex cases or Red Flags to the Pharmacist (Pharmacist Intervention).</li></ul></div>`,
    },
  },

  // ================= MODULE 4 =================
  {
    id: 'm4-sec1',
    module: 'mod4',
    category: { fa: 'اهمیت مشاوره بیمار', en: 'Importance of Counseling' },
    categoryColor: 'purple',
    icon: 'MessageSquare',
    title: {
      fa: 'اهمیت حیاتی مشاوره دارویی، حقوق بیمار و جلوگیری از خطای دیسپنس',
      en: 'Integral Role of Counseling, Patient Rights & Dispensing Error Detection',
    },
    actionPearl: {
      fa: 'بیمار حق دارد که به صورت خصوصی مشاوره دریافت کند، اما همچنین حق دارد که مشاوره را رد کند!',
      en: 'Patients have the right to expect private counseling, but they also reserve the right NOT to be counseled.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">ارائه اطلاعات حیاتی دارویی (Patient Counseling) جزء جدایی‌ناپذیر فرآیند دیسپنسینگ دارو است. این کار تضمین می‌کند که بیمار درک کافی از نحوه استفاده ایمن و موثر دارو یا دستگاه درمانی دارد.</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>حقوق بیمار:</strong> بیماران حق دارند از داروساز بخواهند که به صورت خصوصی به آن‌ها مشاوره دهد. با این حال، <strong>بیمار حق دارد از دریافت مشاوره امتناع کند</strong>. اما داروساز موظف است در هر تحویل دارو، پیشنهاد مشاوره را مطرح کند.</li><li><strong>آخرین مرحله کنترل:</strong> مشاوره در واقع فرآیند بررسی نهایی (Final checking process) است تا مطمئن شویم داروی درست به بیمار درست داده شده است.</li><li><strong>خطاهای دیسپنس:</strong> عدم انجام مشاوره، عامل اصلی و قابل‌توجه در بروز خطاهای دیسپنسینگ و عدم تشخیص (Detection) آن‌ها محسوب می‌شود.</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Patient counseling is an integral component of the dispensing process, ensuring the patient understands how to use their medicine safely and effectively.</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Patient Rights:</strong> Patients have the right to request private counseling in a consultation room. Crucially, <strong>patients also reserve the right to decline or refuse counseling</strong>, but the pharmacist must offer it proactively upon every supply.</li><li><strong>Final Safety Barrier:</strong> Counseling acts as the ultimate final checking step in the dispensing workflow to verify right drug, right patient, right dose, and right instructions.</li><li><strong>Dispensing Errors:</strong> Omitting patient counseling is a major contributing factor in dispensing errors and failure to detect near-miss errors.</li></ul></div>`,
    },
  },
  {
    id: 'm4-sec2',
    module: 'mod4',
    category: { fa: 'ارزیابی پایبندی دارویی', en: 'Assessing Adherence' },
    categoryColor: 'amber',
    icon: 'CheckCircle2',
    title: {
      fa: 'نحوه پرسشگری بدون قضاوت، ارزیابی Adherence و راهکارهای DAAs',
      en: 'Non-Judgmental Adherence Assessment, Questioning Techniques & DAAs',
    },
    actionPearl: {
      fa: 'در مواجهه با عدم مصرف صحیح دارو، هرگز بیمار را قضاوت نکنید؛ از ابزارهایی مانند DAA استفاده کنید.',
      en: 'Remain supportive and non-judgmental if patients do not take medicines correctly. Suggest dose administration aids (DAAs).',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">بسیاری از مردم به دلایل مختلف در مصرف صحیح داروهایشان مشکل دارند. داروساز برای ارزیابی درک و پایبندی (Adherence) بیمار به درمان، باید سوالات درستی بپرسد:</p><div class="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs space-y-1.5"><strong>سوالات کلیدی ارزیابی:</strong><ul class="list-disc pl-5"><li>«آیا در مصرف داروهایتان با سختی خاصی مواجه هستید؟» (Do you have any difficulty taking your medicines?)</li><li>«هر چند وقت یک‌بار پیش می‌آید که مصرف دارو را فراموش کنید؟» (How often would you say you miss taking your medicines?)</li></ul></div><ul class="list-disc pl-5 space-y-1 text-xs mt-2"><li><strong>عدم قضاوت (Non-judgmental):</strong> حفظ برخورد حمایتی (Supportive) و پرهیز از قضاوت در صورت مصرف نادرست دارو بسیار مهم است.</li><li><strong>تشویق عملکرد خوب:</strong> همواره شیوه‌های خوب مصرف دارو را در بیمار تقویت (Reinforce) کنید.</li><li><strong>ارائه راهکار عملی:</strong> در صورت لزوم، استفاده از ابزارهای کمک‌مصرف دارو مانند <strong>Dose Administration Aids (DAAs)</strong> یا بسته‌بندی‌های هفتگی را پیشنهاد دهید.</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Many patients encounter barriers to medication adherence. Pharmacists must elicit patient understanding and adherence using open, non-judgmental questioning techniques:</p><div class="p-2.5 rounded-xl bg-amber-950/20 border border-amber-800/40 text-amber-200 text-xs space-y-1.5"><strong>Key Assessment Questions:</strong><ul class="list-disc pl-5"><li>"Do you experience any difficulty taking your medicines?"</li><li>"How often would you say you miss taking your doses?"</li></ul></div><ul class="list-disc pl-5 space-y-1 text-xs mt-2"><li><strong>Non-Judgmental Approach:</strong> Maintain a supportive, empathetic tone without expressing frustration or disapproval.</li><li><strong>Positive Reinforcement:</strong> Always praise and reinforce good medication taking habits.</li><li><strong>Practical Solutions:</strong> Recommend Dose Administration Aids (DAAs) like Webster-paks or blister packs to organize weekly regimens.</li></ul></div>`,
    },
  },
  {
    id: 'm4-sec3',
    module: 'mod4',
    category: { fa: 'تاریخچه دارویی BPMH', en: 'BPMH Documentation' },
    categoryColor: 'emerald',
    icon: 'ClipboardList',
    title: {
      fa: 'جزئیات دقیق مستندسازی BPMH: هفت مشخصه الزامی لیست داروها',
      en: 'Best Possible Medication History (BPMH): The 7 Mandatory Medication Details',
    },
    actionPearl: {
      fa: 'در مستندسازی BPMH، لیست داروها فقط به نام دارو ختم نمی‌شود؛ باید ۷ پارامتر از جمله دوز، روت، و فرکانس ثبت شود.',
      en: 'BPMH documentation of medicines must include name, strength, dose, route, frequency, duration, and indication.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">اخذ «بهترین تاریخچه دارویی ممکن» (BPMH) نیازمند مستندسازی واضح، ترجیحاً الکترونیکی و با قابلیت دسترسی آسان است. برای موفقیت در این امر، موارد زیر باید دقیقاً مستند شوند:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>الزامات مستندسازی BPMH طبق ویدئو</th></tr></thead><tbody><tr><td>۱. مشخصات بیمار (Patient details) و تاریخ/زمان انجام مصاحبه.</td></tr><tr><td>۲. نام و اطلاعات تماس متخصص بالینی تکمیل‌کننده تاریخچه.</td></tr><tr><td class="font-bold text-sky-400">۳. لیست دقیق داروها شامل ۷ پارامتر: نام دارو، قدرت (Strength)، دوز مصرفی، مسیر تجویز (Route)، فرکانس مصرف، مدت زمان مصرف (Duration) و اندیکاسیون (مورد مصرف).</td></tr><tr><td>۴. منابع اطلاعاتی (Sources of information) استفاده شده.</td></tr><tr><td>۵. اطلاعات مربوط به واکنش‌های ناخواسته دارویی قبلی (Previous ADEs) یا آلرژی‌ها.</td></tr><tr><td>۶. داروهایی که اخیراً شروع شده‌اند (Recently started)، متوقف شده‌اند (Seized) یا تغییر یافته‌اند (Changed).</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Documenting the Best Possible Medication History (BPMH) requires clear, accessible, preferably electronic documentation including:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-emerald-950/40 text-emerald-300"><th>BPMH Mandatory Documentation Requirements</th></tr></thead><tbody><tr><td>1. Patient demographic details, date, and time of history taking.</td></tr><tr><td>2. Name and contact details of the clinician completing the history.</td></tr><tr><td class="font-bold text-sky-400">3. Comprehensive medication list covering 7 key parameters: Drug Name, Strength, Dose, Route, Frequency, Duration, and Indication.</td></tr><tr><td>4. Information sources utilized (e.g. patient interview, DAA, GP summary, community pharmacy).</td></tr><tr><td>5. History of previous Adverse Drug Events (ADEs) and allergies (with reaction descriptions).</td></tr><tr><td>6. Documenting recently started, ceased, or altered medication regimens.</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm4-sec4',
    module: 'mod4',
    category: { fa: 'راهنماهای معتبر مشاوره', en: 'Counseling Guidelines' },
    categoryColor: 'sky',
    icon: 'Bookmark',
    title: {
      fa: 'تاییدیه بورد (PBA) بر راهنماهای مشاوره PSA و SHPA و استفاده از CMI',
      en: 'PBA Endorsed Guidelines: PSA, SHPA & Consumer Medicines Information (CMI)',
    },
    actionPearl: {
      fa: 'بورد داروسازی استرالیا (PBA) راهنماهای مشاوره منتشر شده توسط PSA و SHPA را رسماً تایید می‌کند.',
      en: 'The Pharmacy Board endorses current patient counseling guidelines produced by PSA and SHPA.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">بورد داروسازی استرالیا (PBA - Pharmacy Board of Australia) به منظور کاهش خطاهای دیسپنس و ارتقای استاندارد مشاوره، راهنماهای مشاوره بیمار فعلی را که توسط نهادهای زیر تولید شده‌اند کاملاً تایید (Endorse) می‌کند:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>انجمن داروسازان استرالیا (PSA):</strong> که می‌توان راهنماهای آن را از طریق وب‌سایتشان دسترسی پیدا کرد.</li><li><strong>انجمن داروسازان بیمارستانی استرالیا (SHPA).</strong></li></ul><p class="text-xs opacity-80 mt-2">همچنین این راهنماها قویاً استفاده از <strong>Consumer Medicines Information (CMI)</strong> یا برگه‌های اطلاعات دارویی مخصوص مصرف‌کننده را به عنوان بخشی از پروسه مشاوره توصیه می‌کنند.</p></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">To minimize dispensing errors and promote clinical standards, the Pharmacy Board of Australia (PBA) formally endorses patient counseling guidelines produced by peak national professional bodies:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Pharmaceutical Society of Australia (PSA):</strong> Practice guidelines accessible via the PSA website portal.</li><li><strong>Society of Hospital Pharmacists of Australia (SHPA).</strong></li></ul><p class="text-xs opacity-80 mt-2">These standards explicitly advocate supplying <strong>Consumer Medicines Information (CMI)</strong> leaflets as a core element of structured patient counseling.</p></div>`,
    },
  },

  // ================= MODULE 5 =================
  {
    id: 'm5-sec1',
    module: 'mod5',
    category: { fa: 'داده‌های مقدماتی گزارش', en: 'Report Data Gathering' },
    categoryColor: 'teal',
    icon: 'PieChart',
    title: {
      fa: 'تفاوت داده‌های اپیدمیولوژیک و شواهد اثربخشی در مقدمه گزارش',
      en: 'Epidemiological Data vs Evidence of Efficacy in Report Introductions',
    },
    actionPearl: {
      fa: 'داده اپیدمیولوژیک به شیوع (Prevalence) بیماری می‌پردازد، اما شواهد اثربخشی نیازمند منابعی مانند مطالعات و AMH است.',
      en: 'Epidemiological data covers prevalence/demographics, while evidence of efficacy requires clinical studies and references like AMH.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">هنگام نگارش گزارش دارویی (برای جلوگیری از Plagiarism و اثبات Credibility)، به دو دسته اطلاعات نیاز داریم:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>نوع اطلاعات مورد نیاز</th><th>تعریف و مثال‌های کاربردی</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Epidemiological Data (داده‌های همه‌گیرشناسی)</td><td>تصویر کلی از موضوع. مثال برای دیابت: میزان شیوع (Prevalence) در استرالیا چقدر است؟ چند درصد مرد یا زن هستند؟ بازه سنی، ایالت، حومه شهر (Suburb)، زبان و وضعیت اقتصادی-اجتماعی آن‌ها چیست؟</td></tr><tr><td class="font-bold text-emerald-400">Evidence of Efficacy (شواهد اثربخشی)</td><td>برای مقایسه اثر یک دارو با داروی دیگر. این شواهد باید از منابع منتشرشده (مانند راهنماهای بالینی، مطالعات چاپ‌شده، و فرمولری‌ها مثل AMH) استخراج شوند.</td></tr></tbody></table></div></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">When compiling pharmacy research reports to avoid plagiarism and establish academic credibility, two distinct data categories are required:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-teal-950/40 text-teal-300"><th>Data Type Required</th><th>Definition & Practical Applications</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Epidemiological Data</td><td>Overview of disease burden. E.g., for Type 2 Diabetes: What is the prevalence in Australia? Gender distribution? Age bracket, state/territory, suburb, primary language, and socio-economic status (SES).</td></tr><tr><td class="font-bold text-emerald-400">Evidence of Efficacy</td><td>Comparative efficacy between therapeutic agents. Sourced from published peer-reviewed studies, clinical guidelines, and standard reference texts (e.g. AMH, Therapeutic Guidelines).</td></tr></tbody></table></div></div>`,
    },
  },
  {
    id: 'm5-sec2',
    module: 'mod5',
    category: { fa: 'روند مرور ادبیات', en: 'Literature Review Process' },
    categoryColor: 'purple',
    icon: 'BookMarked',
    title: {
      fa: 'روند مرور ادبیات تحقیق (Literature Review)، کلمات غیرقابل‌تغییر و یادداشت‌برداری',
      en: 'Literature Review Process, Unchangeable Terms & Note-taking Brackets',
    },
    actionPearl: {
      fa: 'در مرور ادبیات، کلماتی مانند نام‌های شیمیایی، فرآیندهای آزمایشگاهی (Chromatography) و تست‌های استاندارد نباید تغییر کنند.',
      en: 'Discipline-specific terms like "chromatography", chemical names, or standard tests cannot be replaced by other words.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">مرور ادبیات فرآیندی است شامل خواندن متون، استخراج اطلاعات و سپس نوشتن آن‌ها به زبان خودتان برای تکمیل بخش‌های Introduction و Discussion. نکات کلیدی استخراج متن در ویدئو به شرح زیر است:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>کلمات انحصاری رشته (Discipline Specific):</strong> برخی اصطلاحات قابل بیان با کلمات دیگر نیستند (مثل نام ترکیبات شیمیایی، تست‌های استاندارد و واژه <code>Chromatography</code>). این کلمات باید بدون تغییر استفاده شوند.</li><li><strong>تکنیک یادداشت‌برداری:</strong> به جای قطع کردن مداوم رشته افکار برای رفرنس دادن در حین خواندن، بهتر است اطلاعات را به زبان خود بنویسید و منبع را در یک کروشه کنار آن یادداشت کنید (مثلاً <code>[Hannah Moresy, 2020]</code>) و در انتها به سراغ اصلاح Citation (ارجاع‌دهی) بروید.</li><li><strong>تعمیق کلمات جستجو:</strong> خواندن عناوین مقالات می‌تواند کلمات کلیدی جدیدی به شما بدهد (مثلاً استفاده از <code>Remote</code> به جای <code>Rural</code> یا <code>Farmer</code>).</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Literature review involves reading, synthesizing information, and drafting sections in your own words:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Discipline-Specific Unchangeable Terms:</strong> Specific scientific terminology cannot be paraphrased (e.g., chemical compound names, standardized assays, and technical terms like <code>Chromatography</code>).</li><li><strong>Bracketed Note-Taking Technique:</strong> To preserve thought flow, draft notes in your own words while appending the source in brackets (e.g. <code>[Hannah Moresy, 2020]</code>), refining formal citations at the end.</li><li><strong>Expanding Search Keywords:</strong> Reading article titles reveals synonymic search terms (e.g. substituting <code>Remote</code> for <code>Rural</code> or <code>Regional</code>).</li></ul></div>`,
    },
  },
  {
    id: 'm5-sec3',
    module: 'mod5',
    category: { fa: 'ساختار پاراگراف TED', en: 'TED Paragraph Structure' },
    categoryColor: 'sky',
    icon: 'AlignLeft',
    title: {
      fa: 'استفاده از قانون TED برای نگارش پاراگراف‌های علمی',
      en: 'TED Paragraph Structure: Topic, Explanation & Discussion',
    },
    actionPearl: {
      fa: 'هر پاراگراف علمی استاندارد باید شامل Topic، بخش Explanation و در نهایت Discussion (بیان کاری که انجام شده) باشد.',
      en: 'TED stands for Topic introducer, Explanation/Summary of the topic, and Discussion of what was done and concluded.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">در زمان نوشتن بخش بحث (Discussion)، برای اینکه پیام اصلی مقاله اصلی گم نشود، از ساختار طلایی <strong>TED</strong> استفاده می‌کنیم:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>بخش ساختار TED</th><th>توضیح و مثال استاد در ویدئو</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">T - Topic (موضوع)</td><td>معرفی موضوع پاراگراف. (مثال: معرفی دیابت نوع ۲).</td></tr><tr><td class="font-bold text-amber-400">E - Explanation (توضیح)</td><td>خلاصه‌ای از اینکه منبع اصلی در مورد چه چیزی بود. (مثال: مطالعه‌ای برای بررسی اثربخشی و ایمنی متفورمین در مناطق روستایی استرالیا انجام شد).</td></tr><tr><td class="font-bold text-emerald-400">D - Discussion (بحث)</td><td>بیان اینکه محققین دقیقاً چه کاری انجام دادند، چگونه انجام دادند و در نهایت به چه نتیجه‌ای (Conclusion) رسیدند.</td></tr></tbody></table></div><p class="text-xs opacity-80">پس از اتمام پاراگراف، رفرنس دهی در ابتدا، وسط یا انتهای پاراگراف درج می‌شود. همیشه پس از خلاصه‌سازی باید مجدداً متن اصلی بازخوانی شود تا پیام نویسنده تغییر نکرده باشد.</p></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">When drafting discussion sections, follow the golden <strong>TED</strong> paragraph structure to preserve scientific clarity:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-sky-950/40 text-sky-300"><th>TED Element</th><th>Scientific Purpose & Application</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">T - Topic Introducer</td><td>Introduces the central subject of the paragraph (e.g. Type 2 Diabetes management in rural populations).</td></tr><tr><td class="font-bold text-amber-400">E - Explanation / Summary</td><td>Summarizes what the source study investigated (e.g. A trial evaluating Metformin adherence in regional Australia).</td></tr><tr><td class="font-bold text-emerald-400">D - Discussion & Synthesis</td><td>Elaborates on what researchers specifically did, how it was executed, and the final clinical conclusions derived.</td></tr></tbody></table></div><p class="text-xs opacity-80">Re-read the original paper after drafting to confirm the original author's intent has not been distorted.</p></div>`,
    },
  },
  {
    id: 'm5-sec4',
    module: 'mod5',
    category: { fa: 'خلاصه‌سازی و کوتیشن', en: 'Summarizing vs Quoting' },
    categoryColor: 'rose',
    icon: 'Quote',
    title: {
      fa: 'تفاوت خلاصه‌سازی، پارافریز (Paraphrasing)، کوتیشن مستقیم و بیان محدودیت‌ها',
      en: 'Summarizing, Paraphrasing, Direct Quoting Rules & Declaring Limitations',
    },
    actionPearl: {
      fa: 'در کوتیشن مستقیم، کلمات دقیقاً کپی شده، در علامت "" قرار گرفته و ایتالیک می‌شوند.',
      en: 'Direct quoting uses the exact words, placed inside quotation marks (""), and must be italicized.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>روش انتقال مفهوم</th><th>قوانین و ویژگی‌ها در استرالیا</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Summarizing (خلاصه‌سازی)</td><td>فقط بخش‌هایی از مقاله که مرتبط با سوال تحقیق شماست استخراج و کوتاه می‌شود (کل مقاله آورده نمی‌شود).</td></tr><tr><td class="font-bold text-emerald-400">Paraphrasing (پارافریز)</td><td>بیان اطلاعات و ایده‌های منبع دیگر <strong>با کلمات خودتان</strong>، در حالی که دقیقاً <strong>همان معنی</strong> حفظ شود.</td></tr><tr><td class="font-bold text-rose-400">Quoting (کوتیشن / نقل‌قول)</td><td>استفاده از ایده و <strong>کلمات دقیق</strong> نویسنده. باید بین دو علامت نقل‌قول (Quotation marks "") قرار گیرد و تمام حروف آن <strong>ایتالیک (Italicized)</strong> شود.</td></tr></tbody></table></div><p class="text-xs opacity-80"><strong>اعلام محدودیت‌ها (Declare Limitations):</strong> اگر در یافتن منابع معتبر دچار محدودیت بودید یا محدودیت تعداد کلمات (Word count) اجازه درج تمام رفرنس‌ها را نداد، این موارد را پنهان نکنید؛ بلکه رسماً در متن آن‌ها را Declare کرده و بحث کنید تا ممتحن متوجه آگاهی شما بشود.</p></div>`,
      en: `<div class="space-y-3"><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-rose-950/40 text-rose-300"><th>Method of Source Integration</th><th>Rules & Australian Academic Standards</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Summarizing</td><td>Extracting and condensing only the relevant sections of a study that directly address your research question.</td></tr><tr><td class="font-bold text-emerald-400">Paraphrasing</td><td>Rephrasing another author's ideas in <strong>your own words</strong> while strictly maintaining the <strong>exact original meaning</strong>.</td></tr><tr><td class="font-bold text-rose-400">Direct Quoting</td><td>Using the author's <strong>verbatim words</strong>. Must be enclosed in quotation marks ("") and rendered in <em>italics</em> with page reference.</td></tr></tbody></table></div><p class="text-xs opacity-80"><strong>Declaring Limitations:</strong> Always explicitly state any research limitations (e.g. database access constraints, word count limits) within the text to demonstrate academic transparency.</p></div>`,
    },
  },

  // ================= MODULE 6 =================
  {
    id: 'm6-sec1',
    module: 'mod6',
    category: { fa: 'محیط کار داروخانه', en: 'Pharmacy Work Environment' },
    categoryColor: 'sky',
    icon: 'Building',
    title: {
      fa: 'آشنایی با محیط داروخانه: Banner Group، داروخانه مستقل و چیدمان',
      en: 'Pharmacy Environment: Banner Groups, Independent & Layout',
    },
    actionPearl: {
      fa: 'هیچ دو داروخانه‌ای دقیقاً شبیه هم نیستند؛ حتی در یک زنجیره یکسان، چیدمان و سیستم‌های روزمره متفاوت است.',
      en: 'No pharmacy is the same. Even within the same franchise, layout and day-to-day systems differ.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">قبل از شروع کار باید بدانیم که داروخانه‌ها نام‌ها و ساختارهای متفاوتی دارند. آن‌ها ممکن است تحت گروه زنجیره‌ای (Banner group) باشند یا به صورت مستقل (Independent pharmacy) اداره شوند.</p><ul class="list-disc pl-5 space-y-1 text-xs"><li>هر داروخانه حتی با مالک یکسان ممکن است چیدمان (Layout) و سیستم‌های متفاوتی داشته باشد.</li><li>آشنایی با محیط کار و محل نگهداری داروها (مانند یخچال ۲ تا ۸ درجه، گاوصندوق S8 و قفسه‌های بخش دیسپنس) ضروری است.</li><li>هرچه بیشتر با محیط کار خود و موجودی کالا (Stock) آشنا باشید، اعتماد به نفس بیشتری در ارائه خدمات خواهید داشت.</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Pharmacies operate under various organizational models, including banner groups (franchises) and independent community pharmacies:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li>Every pharmacy features a unique physical layout and workflow system, even within the same banner group.</li><li>Familiarize yourself with key storage areas: cold chain refrigerators (2–8°C), locked S8 steel safes, and dispensary shelf organization.</li><li>Thorough stock knowledge enhances speed, accuracy, and confidence during dispensing.</li></ul></div>`,
    },
  },
  {
    id: 'm6-sec2',
    module: 'mod6',
    category: { fa: 'ورود اطلاعات در نرم‌افزار', en: 'Data Entry (Fred Dispense)' },
    categoryColor: 'amber',
    icon: 'Monitor',
    title: {
      fa: 'ورود اطلاعات در Fred Dispense: کد داروی PBS، برند معادل (A-Flag) و دستورات',
      en: 'Fred Dispense Entry: PBS Codes, A-Flag Equivalents & Script Instructions',
    },
    actionPearl: {
      fa: 'ستون A-Flag در نرم‌افزار نشان‌دهنده برندهای هم‌ارز (Equivalents) است که قابل جایگزینی هستند.',
      en: 'The A-flag column indicates bioequivalent brands available for generic substitution.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">در زمان پردازش نسخه در نرم‌افزار (مثل Fred Dispense)، ابتدا باید کد داروی PBS وارد شود و با نسخه تطابق داده شود. نرم‌افزار لیست تمام برندهای موجود و آن‌هایی که مشمول یارانه PBS هستند را نشان می‌دهد.</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>دستورالعمل نرم‌افزار</th><th>نحوه تایپ و کاربرد</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">تکرار استاندارد (Repeats / Dispensed)</td><td>اگر نسخه جدید است، فقط تعداد تکرار (مثلاً <code>5</code>) تایپ می‌شود. اگر دومین تحویل است، تعداد تکرار / دفعات تحویل تایپ می‌شود (مثلاً <code>5/1</code> یعنی ۵ تکرار داشته و ۱ بار تحویل شده است).</td></tr><tr><td class="font-bold text-emerald-400">تعویق نسخه (Defer Scripts)</td><td>با اضافه کردن حرف <code>D</code> بعد از تعداد تکرارها (مثلاً <code>5D</code>). نسخه فعلاً تحویل نمی‌شود و برگه تکرار برای آینده صادر می‌شود.</td></tr><tr><td class="font-bold text-rose-400">تحویل کامل یکجا (Regulation 24)</td><td>با اضافه کردن حرف <code>R</code> (مثلاً <code>5R</code>). تمام تکرارها (مثل داروی ۶ ماه) یکجا به بیمار داده می‌شود (مناسب برای بیماران در حال سفر یا مشکل دسترسی).</td></tr></tbody></table></div><p class="text-xs opacity-80">نکته: قیمت کل در روش Reg 24 مستقیماً به حد نصاب Safety net افزوده می‌شود. پیش از چاپ لیبل اصلی، پیش‌نمایش لیبل (Preview) باید با حروف اختصاری داروساز بررسی شود.</p></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">When processing prescriptions in software like Fred Dispense, match the PBS item code and verify bioequivalent brands via the A-flag column:</p><div class="mobile-table-wrapper"><table class="pretty-table border app-border"><thead><tr class="bg-amber-950/40 text-amber-300"><th>Software Dispensing Command</th><th>Syntax & Practical Application</th></tr></thead><tbody><tr><td class="font-bold text-sky-400">Standard Repeats</td><td>For new script: enter repeat count (e.g., <code>5</code>). For subsequent repeat: enter total repeats / count dispensed (e.g. <code>5/1</code> = 5 repeats total, 1 already dispensed).</td></tr><tr><td class="font-bold text-emerald-400">Defer Script</td><td>Append letter <code>D</code> after repeats (e.g., <code>5D</code>). Generates a repeat authorization form without dispensing medicine immediately.</td></tr><tr><td class="font-bold text-rose-400">Regulation 24 Supply</td><td>Append letter <code>R</code> after repeats (e.g., <code>5R</code>). Dispenses original quantity plus ALL repeats simultaneously for travelling/remote patients.</td></tr></tbody></table></div><p class="text-xs opacity-80">Note: Reg 24 total cost counts toward the patient's Safety Net threshold. Always preview dispensing labels prior to printing.</p></div>`,
    },
  },
  {
    id: 'm6-sec3',
    module: 'mod6',
    category: { fa: 'چک قانونی و بالینی', en: 'Legal & Clinical Checks' },
    categoryColor: 'rose',
    icon: 'ShieldAlert',
    title: {
      fa: 'الزامات قانونی و بالینی پیش از دیسپنس: بررسی سایت PBS و تداخلات',
      en: 'Legal & Clinical Considerations: State Poison Regs, PBS Website & Interactions',
    },
    actionPearl: {
      fa: 'پردازش نسخه‌ای که الزامات قانونی ایالت شما را نداشته باشد منجر به پیگرد قانونی و جریمه داروساز می‌شود.',
      en: 'Processing a prescription that does not meet the legal requirements of your jurisdiction can result in prosecution and fine.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">قوانین دارویی بین ایالت‌ها و قلمروها (States and Territories) متفاوت است. اطلاعات قانونی نسخه در مقررات سموم ایالتی (State Specific Poisons Regulation) یافت می‌شود.</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>بررسی اعتبار تجویزکننده (Prescriber Authorization):</strong> ابتدا باید تایید کنید که آیا پزشک مجاز به تجویز این داروی خاص هست یا خیر. این کار را می‌توان از طریق قوانین ایالتی یا <strong>وب‌سایت PBS</strong> انجام داد.</li><li><strong>بررسی بالینی (Clinical Check):</strong> داروساز موظف است تداخلات دارویی، مناسب بودن دوز تجویز شده برای بیمار، و شرایط بیماری را بررسی کند.</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">Medicines legislation varies across states and territories. Prescriptions must meet state poisons regulations:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>Prescriber Authorization Check:</strong> Verify whether the prescriber is legally authorized to prescribe the specific medicine via state legislation or the official PBS website portal.</li><li><strong>Clinical Verification:</strong> Pharmacists must check for drug interactions, therapeutic appropriateness, organ function dosage adjustments, and patient allergy history.</li></ul></div>`,
    },
  },
  {
    id: 'm6-sec4',
    module: 'mod6',
    category: { fa: 'تحویل به بیمار', en: 'Supply to Patient' },
    categoryColor: 'emerald',
    icon: 'PackageCheck',
    title: {
      fa: 'مراحل تحویل نهایی، یادداشت‌های ضمیمه و تایید ۲ شناسه هویتی',
      en: 'Final Handout, Attached Notes & 2-Identifier Verification',
    },
    actionPearl: {
      fa: 'شخص تحویل‌دهنده دارو باید همیشه ۲ شناسه (نام و آدرس یا تاریخ تولد) را با بیمار تقاطع‌سنجی (Cross-verify) کند.',
      en: 'The personnel handing out the prescription should ALWAYS cross-verify the patient’s name and address or date of birth.',
    },
    detailsHtml: {
      fa: `<div class="space-y-3"><p class="leading-relaxed">پس از آماده‌سازی، ممکن است داروساز یادداشت‌هایی (Notes) را به نسخه ضمیمه کند تا در زمان تحویل توسط پرسنل رعایت شود. این یادداشت‌ها شامل مواردی مثل جایگزینی ژنریک، شرایط نگهداری خاص یا نیاز به مداخله بالینی داروساز است.</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>تایید هویت دوگانه:</strong> هنگام تحویل (Handout)، پرسنل باید نام و (آدرس یا تاریخ تولد) را برای اطمینان از تحویل به شخص درست تایید کنند.</li><li><strong>داروهای تحت کنترل:</strong> هرگونه خروج داروهای Schedule 8 باید توسط داروساز در دفترچه مربوطه (Relevant Register) ثبت شود.</li><li><strong>راهنماهای مرجع:</strong> بورد داروسازی استرالیا (PBA) و بیمه مسئولیت (PDL) هر دو راهنمای دیسپنسینگ خوب (Good Dispensing Guides) منتشر کرده‌اند (دسترسی به نسخه PDL نیازمند عضویت است).</li></ul></div>`,
      en: `<div class="space-y-3"><p class="leading-relaxed">During final prescription handout to the patient, strict protocol must be maintained:</p><ul class="list-disc pl-5 space-y-1 text-xs"><li><strong>2-Identifier Patient Verification:</strong> Staff handing out medication MUST cross-verify at least 2 identifiers (Full Name + Date of Birth or Residential Address).</li><li><strong>Dispensing Notes & Flags:</strong> Address any attached notes regarding generic brand substitution, cold chain requirements, or mandatory pharmacist intervention.</li><li><strong>Schedule 8 Register Entry:</strong> Controlled drug supplies must be immediately logged into the official state S8 register ledger.</li><li><strong>Good Dispensing Practice Guides:</strong> Refer to PBA and Pharmaceutical Defence Limited (PDL) dispensing guidelines.</li></ul></div>`,
    },
  },
];

export const SAMPLE_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    moduleId: 'mod1',
    question: {
      fa: 'کدام نهاد در استرالیا مسئول ارزیابی مستقل اثربخشی بالینی و مقرون‌به‌صرفه بودن داروها جهت قرارگیری در لیست یارانه PBS است؟',
      en: 'Which independent statutory body in Australia evaluates the clinical efficacy and cost-effectiveness of medicines to recommend PBS listing?',
    },
    options: [
      { id: 'a', text: { fa: 'TGA (Therapeutic Goods Administration)', en: 'TGA (Therapeutic Goods Administration)' } },
      { id: 'b', text: { fa: 'PBAC (Pharmaceutical Benefits Advisory Committee)', en: 'PBAC (Pharmaceutical Benefits Advisory Committee)' } },
      { id: 'c', text: { fa: 'AHPRA', en: 'AHPRA' } },
      { id: 'd', text: { fa: 'Pharmacy Guild of Australia', en: 'Pharmacy Guild of Australia' } },
    ],
    correctOptionId: 'b',
    explanation: {
      fa: 'کمیته مشورتی PBAC یک نهاد کاملاً مستقل است که داروها را از نظر اثربخشی و صرفه اقتصادی بررسی کرده و به دولت توصیه می‌کند چه داروهایی و با چه سقف تکراری روی PBS قرار گیرند.',
      en: 'PBAC is an independent statutory committee that evaluates evidence of clinical efficacy and cost-effectiveness to advise the government on PBS listings.',
    },
  },
  {
    id: 'q2',
    moduleId: 'mod2',
    question: {
      fa: 'طبق قوانین استرالیا (SUSMP)، داروهای Schedule 3 در کدام طبقه قرار می‌گیرند و شرایط عرضه آن‌ها چیست؟',
      en: 'Under the Australian SUSMP, what is Schedule 3 classified as, and what is required for supply?',
    },
    options: [
      { id: 'a', text: { fa: 'General Sale - فروش در سوپرمارکت', en: 'General Sale in supermarkets' } },
      { id: 'b', text: { fa: 'Pharmacy Medicine - عرضه آزاد در محیط داروخانه', en: 'Pharmacy Medicine available on open shelves' } },
      { id: 'c', text: { fa: 'Pharmacist Only Medicine - نیازمند مشاوره مستقیم و نظارت شخص داروساز', en: 'Pharmacist Only Medicine - requires direct pharmacist intervention and advice' } },
      { id: 'd', text: { fa: 'Controlled Drug - نیازمند گاوصندوق فولادی S8', en: 'Controlled Drug requiring S8 safe storage' } },
    ],
    correctOptionId: 'c',
    explanation: {
      fa: 'داروهای Schedule 3 به عنوان "Pharmacist Only Medicine" شناخه می‌شوند و فروش آن‌ها منحصراً با مشاوره مستقیم و نظارت شخصی داروساز مجاز است.',
      en: 'Schedule 3 medicines are Pharmacist Only Medicines and strictly require personal oversight and advice by a registered pharmacist.',
    },
  },
  {
    id: 'q3',
    moduleId: 'mod3',
    question: {
      fa: 'در ایالت Western Australia (WA)، انبارگردانی فیزیکی دفترچه داروهای S8 (Controlled Drugs) با چه فرکانس زمانی اجباری است؟',
      en: 'In Western Australia (WA), how frequently must a physical stocktake of the Schedule 8 register be conducted?',
    },
    options: [
      { id: 'a', text: { fa: 'حداقل یک‌بار در ماه (Monthly)', en: 'At least once a month' } },
      { id: 'b', text: { fa: 'دو بار در سال در ماه‌های مارس و سپتامبر', en: 'Twice yearly in March and September' } },
      { id: 'c', text: { fa: 'سالانه یک‌بار', en: 'Once per year' } },
      { id: 'd', text: { fa: 'نیازی به انبارگردانی فیزیکی نیست', en: 'No physical stocktake is required' } },
    ],
    correctOptionId: 'a',
    explanation: {
      fa: 'در ایالت WA، انبارگردانی فیزیکی داروهای S8 حداقل یک‌بار در ماه الزام قانونی دارد. (در حالی که در NSW سالی دو بار در مارس و سپتامبر است).',
      en: 'WA legislation strictly mandates S8 register stocktakes at least once per month, whereas NSW mandates March and September.',
    },
  },
  {
    id: 'q4',
    moduleId: 'mod4',
    question: {
      fa: 'در مستندسازی BPMH (Best Possible Medication History)، چند مشخصه اجباری باید برای هر داروی مصرفی بیمار ثبت گردد؟',
      en: 'When documenting a patient’s BPMH, how many mandatory medication parameters must be recorded for each drug?',
    },
    options: [
      { id: 'a', text: { fa: '۳ مشخصه (نام، دوز، رنگ)', en: '3 details (Name, Dose, Color)' } },
      { id: 'b', text: { fa: '۵ مشخصه (نام، برند، قیمت، شرکت، تاریخ)', en: '5 details' } },
      { id: 'c', text: { fa: '۷ مشخصه (نام، قدرت، دوز، مسیر، فرکانس، مدت، اندیکاسیون)', en: '7 details (Name, Strength, Dose, Route, Frequency, Duration, Indication)' } },
      { id: 'd', text: { fa: '۱۰ مشخصه', en: '10 details' } },
    ],
    correctOptionId: 'c',
    explanation: {
      fa: 'ثبت ۷ پارامتر برای هر دارو شامل: نام، قدرت (Strength)، دوز مصرفی، مسیر تجویز (Route)، فرکانس، مدت زمان و اندیکاسیون (علت مصرف) در BPMH الزام استاندارد بالینی است.',
      en: 'BPMH standard requires 7 key parameters: drug name, strength, dose, route, frequency, duration, and indication.',
    },
  },
  {
    id: 'q5',
    moduleId: 'mod5',
    question: {
      fa: 'در نگارش بخش بحث (Discussion) گزارش‌های پژوهشی، ساختار سه مرحله‌ای TED مخفف کدام یک از گزینه‌های زیر است؟',
      en: 'In writing research report discussions, what does the golden 3-step TED acronym stand for?',
    },
    options: [
      { id: 'a', text: { fa: 'Title, Experiment, Data', en: 'Title, Experiment, Data' } },
      { id: 'b', text: { fa: 'Topic introducer, Explanation/Summary of paper, Discussion of what was done and concluded', en: 'Topic introducer, Explanation/Summary of paper, Discussion of what was done and concluded' } },
      { id: 'c', text: { fa: 'Toxicity, Efficacy, Dosage', en: 'Toxicity, Efficacy, Dosage' } },
      { id: 'd', text: { fa: 'Text, Editing, Draft', en: 'Text, Editing, Draft' } },
    ],
    correctOptionId: 'b',
    explanation: {
      fa: 'در ساختار TED: T معرفی موضوع (Topic)، E خلاصه‌ای از محتوای مقاله (Explanation)، و D بحث دقیق در مورد کارهای انجام شده و نتیجه‌گیری (Discussion) است.',
      en: 'TED stands for Topic introducer, Explanation of the source paper, and Discussion of what researchers did and concluded.',
    },
  },
  {
    id: 'q6',
    moduleId: 'mod6',
    question: {
      fa: 'در سیستم نرم‌افزاری Fred Dispense، وارد کردن کد `5R` در بخش تکرار نسخه (Repeats) چه معنایی دارد؟',
      en: 'In Fred Dispense, entering the code `5R` in the repeats field signifies which dispensing method?',
    },
    options: [
      { id: 'a', text: { fa: 'تعویق ۵ نسخه برای آینده (Defer Script)', en: 'Deferring 5 scripts for future supply' } },
      { id: 'b', text: { fa: 'تحویل یکجای تمامی ۵ تکرار طبق Regulation 24', en: 'Supplying all 5 repeats at once under Regulation 24' } },
      { id: 'c', text: { fa: 'ابطال نسخه با ۵ بار جریمه', en: 'Canceling the prescription' } },
      { id: 'd', text: { fa: 'تحویل اولین تکرار از ۵ تکرار', en: 'First repeat out of 5' } },
    ],
    correctOptionId: 'b',
    explanation: {
      fa: 'حرف R پس از تعداد تکرارها (مانند 5R) نشان‌دهنده قانون Regulation 24 است که تمام تکرارهای نسخه را یکجا و در یک روز تحویل بیمار می‌دهد.',
      en: 'Adding "R" after repeats (e.g. 5R) executes a Regulation 24 dispense, supplying all remaining repeats in a single event.',
    },
  },
  {
    id: 'q7',
    moduleId: 'mod3',
    question: {
      fa: 'علت جمع‌آوری کشوری فرآورده‌های حاوی فولکودین (Pholcodine) توسط سازمان TGA در استرالیا چه بود؟',
      en: 'What was the primary clinical reason for the national TGA recall of Pholcodine-containing cough products in Australia?',
    },
    options: [
      { id: 'a', text: { fa: 'ایجاد واکنش آنفولاکسی کشنده با داروهای شل‌کننده عضلانی (NMBAs) در حین بیهوشی عمومی', en: 'Risk of fatal anaphylaxis to neuromuscular blocking agents (NMBAs) during general anesthesia' } },
      { id: 'b', text: { fa: 'بروز مسمومیت کلیوی شدید', en: 'Severe nephrotoxicity' } },
      { id: 'c', text: { fa: 'عدم اثربخشی کامل در درمان سرفه', en: 'Complete lack of efficacy' } },
      { id: 'd', text: { fa: 'ایجاد آریتمی قلبی Torsades de pointes', en: 'Risk of Torsades de pointes arrhythmia' } },
    ],
    correctOptionId: 'a',
    explanation: {
      fa: 'فولکودین به دلیل ایجاد حساسیت متقاطع و خطر آنفولاکسی شدید به داروهای NMBAs در هنگام بیهوشی جراحی، توسط TGA کلاً فراخوان و لغو مجوز شد.',
      en: 'Pholcodine cross-sensitizes patients to neuromuscular blocking agents (NMBAs), causing severe anaphylaxis during surgery anesthesia.',
    },
  },
];
