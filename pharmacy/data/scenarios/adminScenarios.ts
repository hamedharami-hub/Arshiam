import { Scenario } from './types';

export const ADMIN_SCENARIOS: Scenario[] = [
  // ==========================================
  // TIER 1: MODE A - OPERATIONAL & ADMIN DIALOGUES
  // ==========================================
  {
    id: 'admin-lost-escript-mysl',
    mode: 'MODE_A_ADMIN',
    title: {
      fa: 'A1. استعلام نسخه الکترونیک گم‌شده در MySL (Lost eScript / Active Script List)',
      en: 'A1. Lost eScript SMS & Active Script List (MySL) Lookup',
    },
    category: { fa: 'خدمات دیجیتال و MySL (Digital Health)', en: 'Digital Health & MySL' },
    patientProfile: {
      name: 'Liam Henderson',
      age: 42,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'سلام رفیق (G\'day mate)، پزشکم یک نسخه الکترونیک (eScript) به موبایلم فرستاده بود، اما اشتباهاً پیامک (SMS) حاوی توکن را پاک کردم! آیا می‌توانید از طریق MySL (Active Script List) نسخه مرا بررسی کنید؟',
        en: "G'day mate, my GP sent an eScript to my mobile, but I accidentally deleted the SMS with the token. Can you check my MySL (Active Script List) and pull it up?",
      },
    },
    redFlags: [
      { fa: 'دسترسی به MySL بدون اخذ رضایت آگاهانه و معتبر بیمار (Informed Consent)', en: 'Accessing MySL without valid patient consent & IHI verification' },
      { fa: 'احتمال ابطال، تعلیق یا قفل شدن توکن (Locked Token) توسط داروخانه دیگر', en: 'Token locked or dispensed by another dispensary' },
      { fa: 'عدم تطبیق شناسه هویتی IHI بیمار با مشخصات کارت مدیکر', en: 'Mismatch in Individual Healthcare Identifier (IHI) and Medicare details' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و رضایت MySL؟', en: 'W - Patient & MySL Consent?' },
        question: { fa: 'آیا کارت مدیکر همراه دارید و اجازه دسترسی به پروفایل MySL خود را به داروخانه می‌دهید؟', en: 'Do you have your Medicare card/IHI, and do you grant verbal consent for us to access your MySL profile?' },
        answer: {
          fa: 'بله حتماً، این کارت سبز مدیکر من است و رضایت کامل دارم که پروفایل دارویی‌ام را در MySL باز کنید.',
          en: 'Yes definitely, here is my green Medicare card and I give full verbal consent to view my Active Script List.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - زمان صدور و نام دارو؟', en: 'H - Issue time & medication?' },
        question: { fa: 'پزشک چه زمانی نسخه را صادر کرده و داروی تجویزی چیست؟', en: 'When did your GP issue the prescription and what was the medication?' },
        answer: {
          fa: 'همین امروز صبح دکترم برای فشار خون و کلسترول قرص Coversyl 5mg و Atorvastatin 20mg تجویز کرد.',
          en: 'Just this morning my GP prescribed Coversyl 5mg and Atorvastatin 20mg for blood pressure and cholesterol.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - برنامه‌های موبایل دارویی؟', en: 'A - Mobile script apps?' },
        question: { fa: 'آیا قبلاً در اپلیکیشن‌های موبایلی داروخانه (مانند MedAdvisor یا Scripts Plus) ثبت‌نام کرده‌اید؟', en: 'Have you registered on any pharmacy digital apps like MedAdvisor or Scripts Plus?' },
        answer: {
          fa: 'خیر، تا الان فقط از پیامک‌های تکی استفاده می‌کردم و بلد نبودم چطور نسخه‌هایم را در برنامه ببینم.',
          en: 'No, I only relied on individual SMS text links and was unsure how MySL centralizes scripts.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - مراجعه به داروخانه دیگر؟', en: 'T - Other pharmacies?' },
        question: { fa: 'آیا این نسخه در داروخانه دیگری رزرو یا آماده‌سازی شده است؟', en: 'Was this prescription locked or prepared at any other pharmacy?' },
        answer: {
          fa: 'خیر، مستقیماً از مطب دکتر به این داروخانه آمدم.',
          en: 'No, I came straight here from the medical centre.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'a1_opt1',
        text: {
          fa: 'رد کردن درخواست و گفتن به بیمار که داروخانه بدون داشتن پیامک حاوی بارکد هیچ کاری نمی‌تواند بکند و باید دوباره در صف مطب GP بنشیند.',
          en: 'Refuse service and inform patient that without the SMS link, the dispensary cannot help and he must wait at the GP clinic again.',
        },
        patientReply: {
          fa: 'واقعاً باید دوباره ۳ ساعت در مطب منتظر نوبت دکتر بمانم؟ آیا سیستم MySL داروخانه‌ها برای حل همین مشکل گم شدن پیامک‌ها ایجاد نشده است؟',
          en: 'Do I really have to wait another 3 hours at the medical clinic? Isn\'t MySL specifically built to prevent lost SMS hassles?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'a1_opt2',
        text: {
          fa: 'اجرای پروتکل رسمی استعلام MySL: ۱) ثبت رضایت آگاهانه بیمار (Informed Verbal Consent) و استعلام خودکار شناسه IHI از طریق مدیکر در Fred Dispense. ۲) فراخوانی توکن‌های فعال Coversyl و Atorvastatin مستقیماً از مخزن ملی MySL بدون نیاز به پیامک مفقود. ۳) دیسپنس نسخه و آموزش فعال‌سازی MySL دائمی در گوشی جهت دسترسی آسان بدون نیاز به ذخیره ده‌ها پیامک.',
          en: 'Execute Australian MySL Access Protocol: 1) Record patient verbal consent and verify Medicare/IHI in Fred Dispense Plus. 2) Retrieve active eScript tokens for Coversyl 5mg and Atorvastatin 20mg directly from the national MySL repository. 3) Dispense scripts and counsel patient on how Active Script List keeps all repeat prescriptions centralized in one secure profile.',
        },
        patientReply: {
          fa: 'فوق‌العاده است رفیق (Brilliant mate)! از این که بدون نیاز به بازگشت به مطب، نسخه‌ام را از MySL بالا آوردید و آماده کردید بی‌نهایت سپاسگزارم.',
          en: 'Brilliant mate! Thank you so much for pulling my prescription from MySL and saving me a trip back to the doctor.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید استعلام موفق MySL، پذیرش توکن الکترونیک و دیسپنس نسخه‌ها در Fred Dispense Plus',
        en: 'Approved MySL Profile Access, Token Retrieval & Successful Dispense',
      },
      explanation: {
        fa: 'سامانه Active Script List (MySL) در استرالیا راهکاری ملی برای مدیریت متمرکز نسخه‌های الکترونیک است. در صورت پاک شدن ناخواسته SMS حاوی توکن بارکد، داروساز با اخذ رضایت بیمار (Patient Consent) و استعلام IHI، نسخه‌های معتبر را مستقیماً از MySL فراخوانی کرده و دیسپنس می‌نماید.',
        en: 'The Australian Active Script List (MySL) enables pharmacists to view and dispense active eScripts directly from the national repository upon patient consent and IHI verification, resolving lost SMS issues effortlessly.',
      },
    },
    aussieContext: {
      fa: 'در استرالیا، بیمار ممکن است بگوید: "I deleted my eScript token" یا "Can you look me up on MySL?". طبق قوانین ADHA، اخذ رضایت آگاهانه (Informed Consent) قبل از باز کردن MySL الزامی است.',
      en: 'In Australian practice, MySL (Active Script List) eliminates the need for individual token management. Always verify 2 patient identifiers and confirm verbal consent before accessing the national registry.',
      keyPhrases: [
        { phrase: "G'day mate / deleted the SMS", meaningFa: 'اصطلاح عامیانه استرالیایی برای احوالپرسی و گم کردن پیامک بارکد', meaningEn: 'Informal Aussie greeting and accidental SMS deletion' },
        { phrase: 'MySL (Active Script List)', meaningFa: 'سامانه متمرکز ملی نسخه‌های فعال الکترونیک در استرالیا', meaningEn: 'National repository of active Australian eScripts' },
        { phrase: 'IHI (Individual Healthcare Identifier)', meaningFa: 'شناسه ۱۶ رقمی یکتای سلامت هر شهروند در استرالیا', meaningEn: '16-digit unique healthcare identifier linked to Medicare' },
      ],
      adminRule: {
        fa: 'ماده قانونی ADHA: داروساز موظف است رضایت صریح بیمار را ثبت کند و توکن‌های دیسپنس شده به طور خودکار از MySL سایر داروخانه‌ها قفل می‌شوند.',
        en: 'ADHA Requirement: Explicit consent is recorded. Once dispensed, the token is automatically marked as in-progress to prevent double dispensing.',
      },
    },
  },

  {
    id: 'admin-third-party-pickup',
    mode: 'MODE_A_ADMIN',
    title: {
      fa: 'A2. تحویل داروی عضو سالخورده خانواده توسط شخص ثالث (Picking up for Elderly Family Member)',
      en: 'A2. Third-Party Script Collection for Elderly Family Member',
    },
    category: { fa: 'قوانین تحویل و احراز هویت (Dispensing & ID)', en: 'Dispensing & Identification' },
    patientProfile: {
      name: 'Chloe Taylor (Daughter of Margaret Taylor)',
      age: 36,
      gender: 'زن (Female)',
      presentation: {
        fa: 'سلام، من برای تحویل قرص‌های فشار خون مادرم (Margaret Taylor) آمده‌ام. آیا کارت مدیکر او را لازم دارید یا کارت شناسایی (ID) خودم را بررسی می‌کنید؟',
        en: "Hi there, I’m here to pick up my mum's blood pressure tablets (Margaret Taylor). Do you need her Medicare card or my ID?",
      },
    },
    redFlags: [
      { fa: 'تحویل دارو به شخص ثالث بدون تطبیق حداقل ۲ شناسه هویتی معتبر بیمار (نام کامل + آدرس یا تاریخ تولد)', en: 'Dispensing to a third-party agent without verifying 2 patient identifiers (Full Name + Address/DOB)' },
      { fa: 'وجود تغییر دوز جدید (Dose Titration: 5mg -> 10mg) بدون اطمینان از آگاهی بیمار اصلی', en: 'Uncommunicated dose alteration without verifying patient awareness' },
      { fa: 'عدم بررسی خطر مصرف دوبرابر قرص‌های قبلی باقی‌مانده در منزل (Double-Dosing Hazard)', en: 'Risk of patient taking leftover old strength alongside newly dispensed higher strength' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - مشخصات بیمار و تحویل‌گیرنده؟', en: 'W - Patient & Collector Identity?' },
        question: { fa: 'نام کامل، تاریخ تولد و آدرس محل سکونت مادرتان را بفرمایید و آیا مدرک شناسایی همراه دارید؟', en: 'Could you please confirm your mum’s full name, date of birth, and residential address?' },
        answer: {
          fa: 'مادرم Margaret Taylor، متولد ۱۲ می ۱۹۴۸، ساکن 14 High St است و این گواهینامه رانندگی عکس‌دار من است.',
          en: 'My mum is Margaret Taylor, DOB 12/05/1948, living at 14 High St. Here is my driver licence.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - سابقه و تغییر دوز جدید؟', en: 'H - History & dose change?' },
        question: { fa: 'آیا مادرتان مدتی طولانی است این دارو را مصرف می‌کند یا پزشک دوز آن را اخیراً افزایش داده است؟', en: 'Has she been taking this medication long-term, or has the doctor adjusted the dose recently?' },
        answer: {
          fa: 'پزشک دیروز دوز داروی Amlodipine او را از ۵ میلی‌گرم به ۱۰ میلی‌گرم افزایش داد.',
          en: 'The GP increased her Amlodipine dose from 5mg to 10mg just yesterday.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - قرص‌های ۵mg باقی‌مانده در منزل؟', en: 'A - Leftover 5mg stock?' },
        question: { fa: 'آیا مادرتان در خانه قرص‌های ۵ میلی‌گرمی قبلی دارد که ممکن است اشتباهاً همزمان مصرف کند؟', en: 'Does she have leftover 5mg tablets at home that could cause accidental double-dosing?' },
        answer: {
          fa: 'بله چند تا دارد، حتماً جعبه قبلی را جمع‌آوری می‌کنم یا برای امحا به داروخانه می‌آورم.',
          en: 'Yes a few. I will collect and return or dispose of the older 5mg box to avoid mistakes.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - نیاز به تماس مشاوره داروساز؟', en: 'T - Pharmacist phone consult?' },
        question: { fa: 'آیا نیاز است داروساز تلفنی با مادرتان صحبت کند و عوارض احتمالی ورم پا (Ankle Oedema) را توضیح دهد؟', en: 'Would you like the pharmacist to phone your mother to discuss the dose increase and check for ankle oedema?' },
        answer: {
          fa: 'بسیار عالی می‌شود، او همیشه توصیه‌های داروساز را به دقت رعایت می‌کند.',
          en: 'That would be fantastic, she really appreciates personal pharmacist check-ins.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'a2_opt1',
        text: {
          fa: 'تحویل سریع دارو به شخص مراجعه‌کننده بدون پرسیدن آدرس/تاریخ تولد بیمار و بدون اشاره به دو برابر شدن دوز آملودیپین.',
          en: 'Hand over medication instantly without confirming 2 patient identifiers and without addressing the dose increase.',
        },
        patientReply: {
          fa: 'آیا نباید نام و آدرس مادرم را با پرونده تطبیق دهید؟ و آیا نباید درباره نحوه مصرف دوز جدید ۱۰mg راهنمایی کنید؟',
          en: 'Shouldn\'t you confirm my mum\'s address and explain how she should handle the new 10mg strength?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'a2_opt2',
        text: {
          fa: 'اجرای پروتکل تحویل شخص ثالث (Third-Party Collection & Titration Protocol): ۱) تطبیق قطعی ۲ شناسه هویتی بیمار (نام کامل + تاریخ تولد/آدرس) در سیستم Fred Dispense. ۲) نصب لیبل هشدار تغییر دوزینگ (Dose Change Alert: 5mg -> 10mg) روی جعبه دارو. ۳) ثبت یادداشت بالینی و تنظیم تماس تلفنی پیگیری داروساز (Follow-up Call) برای مادر جهت پایش افت فشار وضعیتی و ورم مچ پا (Peripheral Oedema).',
          en: 'Execute Third-Party Agent Protocol: 1) Verify 2 unique patient identifiers (Full Name, DOB, Address). 2) Affix Dose Change Warning Label (Amlodipine 5mg -> 10mg). 3) Provide patient handout and arrange a pharmacist follow-up call to check blood pressure response and ankle swelling.',
        },
        patientReply: {
          fa: 'بسیار از دقت بالینی و پیگیری شما سپاسگزارم. جعبه‌های ۵mg قبلی را کنار می‌گذارم و به مادرم اطلاع می‌دهم که منتظر تماس داروساز باشد.',
          en: 'Thank you so much for your clinical care! I will clear out the older 5mg box and tell mum to expect the pharmacist phone call.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید هویت شخص ثالث، تحویل Amlodipine 10mg با لیبل تغییر دوز و ثبت تماس پیگیری',
        en: 'Approved Third-Party Handout with 2-Identifier Match & Dose Change Counseling',
      },
      explanation: {
        fa: 'طبق استانداردهای Pharmacy Board of Australia و PSA، تحویل دارو به نماینده بیمار مجاز است به شرطی که ۲ شناسه هویتی مستقل تایید شود. در صورت تغییر دوز (Dose Titration)، داروساز باید تدابیر پیشگیرانه جهت جلوگیری از خطای مصرف دوبرابر (Double Dosing) را به کار گیرد.',
        en: 'Australian dispensing standards permit third-party collection provided 2 patient identifiers are verified. When titration occurs (Amlodipine 5mg to 10mg), pharmacist intervention prevents accidental double dosing.',
      },
    },
    aussieContext: {
      fa: 'در استرالیا، تحویل دارو توسط اعضای خانواده (Third-Party Collection) بسیار متداول است. داروساز باید نام و آدرس/تاریخ تولد بیمار اصلی را بپرسد و در موارد افزایش دوز، برچسب هشدار الصاق کند.',
      en: 'Third-party collection is standard in Australian community pharmacy. Always confirm 2 identifiers (Name + DOB/Address) and highlight any recent regimen alterations.',
      keyPhrases: [
        { phrase: "Picking up for my mum / Third-party collection", meaningFa: 'تحویل داروی بیمار توسط فرزند یا مراقب در استرالیا', meaningEn: 'Agent or family member picking up prescribed medication' },
        { phrase: '2 Patient Identifiers', meaningFa: 'الزام قانونی تطبیق حداقل دو مشخصه (نام + تاریخ تولد یا آدرس)', meaningEn: 'Mandatory standard to match Name and DOB/Address' },
        { phrase: 'Dose Change Alert', meaningFa: 'برچسب هشدار زرد رنگ تغییر دوز دارو روی جعبه', meaningEn: 'Warning sticker alerting patient to changed medication strength' },
      ],
      adminRule: {
        fa: 'قانون PSA: در تحویل شخص ثالث، رضایت بیمار مفروض است ولی اطلاعات محرمانه غیرمرتبط نباید فاش شود.',
        en: 'PSA Standard: Implied patient consent applies for routine pickup, but sensitive medical history must remain confidential.',
      },
    },
  },

  {
    id: 'admin-medicare-copayment-safetynet',
    mode: 'MODE_A_ADMIN',
    title: {
      fa: 'A3. ابهام فرانشیز مدیکر: تفاوت General $31.60 و Concession $7.70 و سقف Safety Net',
      en: 'A3. Medicare Concession vs General Co-Payment & PBS Safety Net',
    },
    category: { fa: 'قیمت‌گذاری و سقف Safety Net (PBS Pricing)', en: 'PBS Pricing & Safety Net' },
    patientProfile: {
      name: 'Robert O\'Connor',
      age: 68,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'سلام داروساز عزیز، چرا ماه گذشته برای همین قرص فشار خون مبلغ ۳۱.۶۰ دلار پرداخت کردم، اما امروز دستیار شما فقط ۷.۷۰ دلار از من گرفت؟ آیا اشتباهی در حسابرسی رخ داده است؟',
        en: "Hi pharmacist, why was this $31.60 last month, but today your assistant charged me only $7.70? Is there a mistake in your billing system?",
      },
    },
    redFlags: [
      { fa: 'ابهام بیمار در مورد ثبت شدن کارت تخفیف بازنشستگی (Pensioner Concession Card) یا رسیدن به سقف Safety Net', en: 'Patient confusion regarding newly registered Concession Card or reaching PBS Safety Net threshold' },
      { fa: 'عدم اتصال پرونده دارویی همسر به کارت Safety Net خانوادگی (Family Safety Net Entitlement)', en: 'Failure to link spouse profile for joint annual PBS Safety Net accumulation' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - کارت بازنشستگی و تخفیف؟', en: 'W - Concession / Pensioner Card?' },
        question: { fa: 'آیا اخیراً کارت Pensioner Concession Card یا Commonwealth Seniors Health Card از Centrelink دریافت کرده‌اید؟', en: 'Did you recently receive a Pensioner Concession Card or Seniors Health Card from Services Australia / Centrelink?' },
        answer: {
          fa: 'بله! دو هفته پیش ۶۸ ساله شدم و کارتم از Centrelink آمد و به دستیار شما نشان دادم.',
          en: 'Yes! I turned 68 two weeks ago and received my Pensioner Concession Card from Centrelink, which I showed to your assistant.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - ثبت قبلی در داروخانه؟', en: 'H - Prior registration status?' },
        question: { fa: 'آیا در مراجعات قبلی این کارت در سیستم ثبت شده بود؟', en: 'Was this concession card recorded in our dispensary software on your previous visit?' },
        answer: {
          fa: 'خیر، ماه گذشته هنوز کارتم صادر نشده بود و فقط کارت سبز مدیکر معمولی داشتم.',
          en: 'No, last month I only had my standard green Medicare card.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - مفهوم سقف Safety Net؟', en: 'A - Safety Net tracking?' },
        question: { fa: 'آیا اطلاع دارید که تمام پرداخت‌های ۷.۷۰ دلاری شما برای سقف سالانه Safety Net ذخیره می‌شود؟', en: 'Are you aware that your PBS co-payments accumulate towards the annual PBS Safety Net threshold?' },
        answer: {
          fa: 'اسم Safety Net را شنیده‌ام ولی نمی‌دانم اعداد و شرایط آن دقیقاً چگونه محاسبه می‌شود.',
          en: 'I have heard of the Safety Net, but don’t know the exact rules and dollar thresholds.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - اعضای خانواده در کارت؟', en: 'T - Family safety net link?' },
        question: { fa: 'آیا مایلید پرونده همسرتان را به پرونده دارویی شما متصل کنیم تا سقف سالانه Safety Net خانوادگی سریع‌تر پر شود؟', en: 'Would you like us to link your wife’s prescription profile so your family reaches the free Safety Net threshold faster?' },
        answer: {
          fa: 'بله حتماً، همسرم نیز داروهای قلبی روزانه مصرف می‌کند.',
          en: 'Yes please, my wife also takes daily cardiac medications.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'a3_opt1',
        text: {
          fa: 'گفتن این که احتمالاً کارخانه دارو تخفیف حراجی گذاشته است و نیازی به توضیح قوانین دولتی فرانشیز PBS نیست.',
          en: 'State that the drug manufacturer had a special promotional sale and dismiss the co-payment distinction.',
        },
        patientReply: {
          fa: 'اما داروهای تجویزی با نظارت رسمی دولت فدرال قیمت‌گذاری می‌شوند! آیا قیمت داروی نسخه‌ای حراجی است؟',
          en: 'Aren\'t PBS prescription prices regulated by the Federal Government? Prescription medicines are not on clearance sales!',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'a3_opt2',
        text: {
          fa: 'توضیح کامل ساختار تعرفه‌های مصوب PBS استرالیا: ۱) مبالغ قانونی: تعرفه عمومی (General Patient) تا سقف ۳۱.۶۰ دلار است، در حالی که با ثبت کارت معتبر Pensioner/Health Care Card تعرفه تخفیفی (Concessional Patient) دقیقاً ۷.۷۰ دلار می‌شود. ۲) سقف Safety Net: توضیح اینکه پس از رسیدن به سقف سالانه کانشنال (Safety Net Concession Threshold: ۳۶ نسخه معادل ۲۷۷.۲۰ دلار)، تمام داروهای تجویزی بعدی تا پایان سال تقویمی کاملاً رایگان ($0.00) خواهد بود. ۳) اتصال پرونده همسر جهت تجمیع امتیازات Safety Net خانوادگی.',
          en: 'Explain Official PBS Co-Payment & Safety Net Framework: 1) Regulated Fees: General rate is capped up to $31.60, whereas Concessional cardholders pay only $7.70 per PBS script. 2) Safety Net Threshold: Once 36 concessional scripts are reached ($277.20), scripts become $0.00 (FREE) for the remainder of the calendar year. 3) Link spouse onto PBS Safety Net 20-Day Rule family profile.',
        },
        patientReply: {
          fa: 'بسیار متشکرم! الان کاملاً متوجه شدم که کارت بازنشستگی من در سیستم ثبت شده و سیستم Safety Net چقدر به مدیریت هزینه‌های ما کمک می‌کند.',
          en: 'Thank you so much! That clarifies everything perfectly regarding my Centrelink card and the PBS Safety Net benefits.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید اعمال نرخ Concession $7.70 و فعال‌سازی تجمیع خانوادگی Safety Net',
        en: 'Approved Concessional Co-Payment Rate ($7.70) & Family Safety Net Linking',
      },
      explanation: {
        fa: 'در طرح دارویی استرالیا (PBS)، بیماران General سقف فرانشیز تا ۳۱.۶۰ دلار و دارندگان کارت‌های تخفیف رسمی (Pensioner / Health Care / Seniors) نرخ ثابت ۷.۷۰ دلار پرداخت می‌کنند. داروساز موظف است شفافیت مالی و قوانین حدنصاب سالانه Safety Net را برای مراجعین تبیین نماید.',
        en: 'Under the Australian PBS, General patients pay up to $31.60 co-payment while Concessional patients pay $7.70. Pharmacists must explain PBS Safety Net thresholds to ensure patients maximize statutory entitlements.',
      },
    },
    aussieContext: {
      fa: 'در استرالیا، هزینه‌های دارویی توسط طرح مزایای دارویی (PBS) یارانه‌گذاری می‌شود. رسیدن به سقف Safety Net هزینه‌ها را به صفر دلار (برای کانشنال) کاهش می‌دهد.',
      en: 'PBS co-payments are indexed annually on January 1st. General ($31.60 max) vs Concessional ($7.70). Once Safety Net threshold is met, scripts are either discounted or free ($0.00).',
      keyPhrases: [
        { phrase: 'General Co-Payment ($31.60)', meaningFa: 'حداکثر سهم پرداخت بیمار عادی بدون کارت تخفیف در سال جاری', meaningEn: 'Maximum statutory co-payment for general PBS patients' },
        { phrase: 'Concessional Co-Payment ($7.70)', meaningFa: 'تعرفه دولتی دارندگان کارت بازنشستگی یا کارت خدمات درمانی', meaningEn: 'Subsidised rate for Pensioner and Health Care cardholders' },
        { phrase: 'PBS Safety Net Threshold', meaningFa: 'حدنصاب سالانه که پس از آن داروها رایگان یا نیم‌بها می‌شوند', meaningEn: 'Annual expenditure limit after which PBS medicines become free or cheaper' },
      ],
      adminRule: {
        fa: 'قانون PBS Safety Net: داروها باید طبق قاعده ۲۰ روزه (20-Day Rule) مصرف شوند تا در احتساب حدنصاب ذخیره شوند.',
        en: 'PBS Safety Net Rule: Repeat prescriptions within 20 days for chronic medicines may not count towards the Safety Net threshold.',
      },
    },
  },

  {
    id: 'admin-tax-invoice-sick-leave',
    mode: 'MODE_A_ADMIN',
    title: {
      fa: 'A4. فاکتور رسمی بیمه تکمیلی و صدور گواهی استعلاجی میگرن (Tax Invoice & Leave Certificate)',
      en: 'A4. Private Health Fund Tax Invoice & Pharmacist Leave Certificate',
    },
    category: { fa: 'حیطه اختیارات و گواهی استعلاجی (Scope of Practice)', en: 'Scope of Practice & Certificates' },
    patientProfile: {
      name: 'Emma Watson',
      age: 31,
      gender: 'زن (Female)',
      presentation: {
        fa: 'سلام، آیا می‌توانید یک رسید رسمی با Pharmacy Provider Number برای بیمه تکمیلی من (Bupa / Medibank Private) صادر کنید؟ و آیا داروساز می‌تواند برای حمله شدید میگرن امروزم یک گواهی استعلاجی معتبر برای محل کارم (Absence from Work Certificate) بنویسد؟',
        en: "Hi, can I get an official itemised tax invoice with your pharmacy provider number for my private health fund (Bupa/Medibank)? And can the pharmacist issue an Absence from Work Certificate for my acute migraine today?",
      },
    },
    redFlags: [
      { fa: 'صدور گواهی استعلاجی برای بیماری‌های پیچیده خارج از حیطه مجاز داروساز یا صدور گواهی با تاریخ گذشته (Backdating is strictly illegal under Fair Work Act 2009)', en: 'Issuing leave certificates outside scope, for >2 days, or backdating (illegal under Australian Fair Work Act)' },
      { fa: 'عدم درج شماره نظام داروسازی AHPRA و امضای رسمی داروساز مسئول', en: 'Omission of pharmacist AHPRA registration number and statutory declaration signature' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و نوع شغل؟', en: 'W - Patient & Employment?' },
        question: { fa: 'گواهی استعلاجی را برای چه کسی و برای چه نوع شغلی نیاز دارید؟', en: 'Who is the leave certificate for and what type of employment duties do you perform?' },
        answer: {
          fa: 'برای خودم است؛ من برنامه‌نویس کامپیوتر هستم و به دلیل سردرد میگرنی و حساسیت شدید به نور نمی‌توانم به مانیتور نگاه کنم.',
          en: 'For myself; I am a software developer and the migraine photophobia makes it impossible to look at screens.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - شروع سردرد و علائم؟', en: 'H - Onset & symptoms?' },
        question: { fa: 'سردرد از چه زمانی شروع شده و چه علائمی مانند تهوع یا اختلال بینایی (Aura) دارید؟', en: 'When did the migraine start and do you have nausea, vomiting or visual aura?' },
        answer: {
          fa: 'از ساعت ۶ صبح با دیدن جرقه‌های نوری و حالت تهوع شروع شد و الان یک‌طرف سرم تیر می‌کشد.',
          en: 'It started at 6am with visual zig-zags (aura), nausea, and intense unilateral throbbing pain.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - داروی میگرن مصرفی؟', en: 'A - Migraine treatment?' },
        question: { fa: 'آیا سابقه تشخیص میگرن توسط پزشک دارید و داروی تریپتان (مانند Sumatriptan) مصرف کرده‌اید؟', en: 'Have you been diagnosed with migraine by a GP previously, and do you take triptans (e.g. Sumatriptan S3)?' },
        answer: {
          fa: 'بله سابقه میگرن دارم و برای حمله امروز قرص Sumatriptan 50mg خریدم.',
          en: 'Yes, diagnosed 3 years ago and I took Sumatriptan 50mg this morning.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - مدت زمان گواهی؟', en: 'T - Certificate duration?' },
        question: { fa: 'برای چند روز نیاز به گواهی استراحت پزشکی دارید؟', en: 'How many days of absence from work are you requesting?' },
        answer: {
          fa: 'فقط برای امروز (۱ روز) نیاز دارم تا در اتاق تاریک استراحت کنم و فردا به کار برمی‌گردم.',
          en: 'Just for today (1 day) so I can rest in a dark quiet room, and I will be back at work tomorrow.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'a4_opt1',
        text: {
          fa: 'رد کردن هر دو درخواست و اعلام نادرست این که داروسازان استرالیا هرگز حق صدور گواهی استعلاجی شغلی ندارند.',
          en: 'Refuse both requests and falsely state that Australian pharmacists have no legal authority to issue sick leave certificates.',
        },
        patientReply: {
          fa: 'اما در وب‌سایت اتحادیه داروسازان (PSA) و قانون Fair Work نوشته شده داروسازان مجاز به صدور گواهی استعلاجی در حیطه صلاحیت خود هستند!',
          en: 'Under Fair Work Act 2009 and PSA professional practice standards, pharmacists can legally issue Absence from Work certificates within their scope!',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'a4_opt2',
        text: {
          fa: 'انجام ارزیابی بالینی و اجرای پروتکل قانونی گواهی داروساز: ۱) بررسی بالینی علائم میگرن و اطمینان از قرار داشتن در حیطه مجاز داروسازی (Within Pharmacist Scope of Practice). ۲) صدور رسمی گواهی Absence from Work Certificate طبق قانون Fair Work Act 2009 برای مدت ۱ روز کاری همراه با شماره نظام داروسازی AHPRA و امضای معتبر (با تاکید بر ممنوعیت صدور گواهی برای گذشته/No Backdating). ۳) صدور فاکتور تفکیک‌شده رسمی (Itemised Tax Invoice) با درج ABN داروخانه، کد اقلام و شماره Provider Number جهت بازپرداخت توسط بیمه تکمیلی (Bupa/Medibank).',
          en: 'Execute Pharmacist Certificate & Tax Invoice Protocol: 1) Perform clinical triage of acute migraine (confirming it is strictly within pharmacist scope). 2) Issue valid statutory Absence from Work Certificate under Fair Work Act 2009 for 1 day with AHPRA registration number and signature (strictly no backdating). 3) Generate an official Itemised Pharmacy Tax Invoice featuring ABN, item codes, and Pharmacy Provider Number for Private Health Fund rebate.',
        },
        patientReply: {
          fa: 'فوق‌العاده عالی و حرفه‌ای! رسید رسمی تفکیک‌شده و گواهی استعلاجی با شماره AHPRA را دریافت کردم و بلافاصله برای کارفرما و بیمه تکمیلی ارسال می‌کنم.',
          en: 'Outstanding and professional! Thank you for the itemised tax receipt and the Fair Work Absence from Work Certificate.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید صدور فاکتور تفکیک‌شده بیمه تکمیلی + صدور گواهی استعلاجی ۱ روزه میگرن طبق Fair Work Act',
        en: 'Approved Itemised Tax Invoice & 1-Day Absence from Work Certificate within Pharmacist Scope',
      },
      explanation: {
        fa: 'طبق قانون Fair Work Act 2009 و استانداردهای صنفی PSA در استرالیا، داروسازان ثبت‌شده مجاز به صدور گواهی استعلاجی (Absence from Work Certificate) برای بیماری‌های در حیطه صلاحیت خود (نظیر میگرن، گاستروانتریت خفیف، دیسمنوره و سرماخوردگی) حداکثر به مدت ۱ تا ۲ روز هستند. صدور گواهی برای گذشته (Backdating) غیرقانونی است.',
        en: 'Under the Australian Fair Work Act 2009 and PSA guidelines, pharmacists can issue Absence from Work Certificates for conditions within their scope (acute migraine, minor ailments) for up to 1-2 days. Backdating is strictly illegal. Official tax invoices must contain ABN and provider info.',
      },
    },
    aussieContext: {
      fa: 'بسیاری از کارفرمایان در استرالیا گواهی استعلاجی صادره توسط داروسازان (Pharmacist Sick Certificate) را می‌پذیرند. بیمه‌های تکمیلی (Private Health Funds) نیز به فاکتور تفکیک‌شده با شماره Pharmacy Approval / Provider Number نیاز دارند.',
      en: 'Pharmacists in Australia can issue sick certificates for employees under the Fair Work Act. Private Health Funds (Bupa, Medibank, HCF) require itemised tax invoices with ABN and store numbers for non-PBS prescription rebates.',
      keyPhrases: [
        { phrase: 'Absence from Work Certificate', meaningFa: 'گواهی استعلاجی قانونی صادره توسط داروساز طبق قانون روابط کار استرالیا', meaningEn: 'Statutory sick leave certificate issued by a registered Australian pharmacist' },
        { phrase: 'Itemised Tax Invoice with Provider Number', meaningFa: 'فاکتور مالیاتی تفکیک‌شده با شناسه داروخانه جهت بیمه تکمیلی', meaningEn: 'Detailed tax receipt with provider code for health fund rebate' },
        { phrase: 'Strictly No Backdating', meaningFa: 'ممنوعیت قانونی صدور گواهی استعلاجی برای روزهای گذشته', meaningEn: 'Illegal under Fair Work Act to certify dates prior to the actual consultation' },
      ],
      adminRule: {
        fa: 'قانون Fair Work Act: گواهی داروساز سندی قانونی است و تنها برای بیماری‌های در حیطه مجاز داروسازی و حداکثر ۱ تا ۲ روز معتبر است.',
        en: 'Fair Work Act 2009: Pharmacist certificate is legal proof of illness for single-day or short acute episodes within professional competency.',
      },
    },
  },
];
