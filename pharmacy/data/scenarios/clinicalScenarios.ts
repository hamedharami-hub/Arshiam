import { Scenario } from './types';

export const CLINICAL_SCENARIOS: Scenario[] = [
  {
id: 'cough-triage',
    mode: 'MODE_B_SLANG',
    title: {
      fa: 'B5. سرفه مزمن، خلط خونی و تنگی نفس (Chronic Cough >8wks, Hemoptysis & Dyspnea)',
      en: 'B5. Chronic Cough, Hemoptysis & Dyspnea Triage',
    },
    category: { fa: 'دستگاه تنفسی (Respiratory)', en: 'Respiratory System' },
    patientProfile: {
      name: 'Michael Vance',
      age: 54,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار با سرفه شدید خلط‌دار به مدت بیش از ۸ هفته مراجعه کرده و درخواست شربت سرفه اکسپکتورانت قوی بدون نسخه دارد.',
        en: 'Patient presents requesting a strong OTC cough mixture for a persistent productive cough lasting over 8 weeks.',
      },
    },
    redFlags: [
      { fa: 'سرفه مداوم بیش از ۳ تا ۸ هفته (Chronic Cough >8 weeks)', en: 'Cough duration > 8 weeks' },
      { fa: 'مشاهده خلط خونی (Hemoptysis) یا تنگی نفس شدید (Dyspnea)', en: 'Hemoptysis or severe dyspnea' },
      { fa: 'خلط چرکی زرد/سبز، تب، کاهش وزن ناگهانی و مصرف داروی ACEi (Ramipril)', en: 'Purulent sputum, fever, weight loss & ACEi therapy' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'داروی سرفه را برای چه کسی می‌خواهید؟', en: 'Who is the cough medicine for?' },
        answer: { fa: 'برای خودم است.', en: 'It is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت زمان و خصوصیات سرفه؟', en: 'H - Duration & cough characteristics?' },
        question: { fa: 'چند وقت است سرفه می‌کنید و آیا سرفه خلط‌دار است یا خونی؟', en: 'How long have you had this cough and is there blood or pus?' },
        answer: {
          fa: 'حدود ۹ هفته است که سرفه می‌کنم و طی ۲ روز گذشته خلط چرکی زرد پررنگ همراه رگه‌های خون دیده‌ام و هنگام بالا رفتن از پله تنگی نفس دارم.',
          en: 'About 9 weeks now. In the past 2 days I noticed yellow purulent sputum with blood streaks and shortness of breath.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Action taken?' },
        question: { fa: 'تاکنون چه فرآورده‌ای استفاده کرده‌اید؟', en: 'What remedies have you tried?' },
        answer: {
          fa: 'یک شربت سرفه معمولی اکسپکتورانت خریدم اما هیچ تاثیری در قطع سرفه و بهبود تنگی نفسم نداشت.',
          en: 'I bought a standard OTC expectorant syrup, but it had no effect.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - داروها و بیماری‌های زمینه‌ای؟', en: 'T - Medical history & meds?' },
        question: { fa: 'آیا داروی تجویزی دیگری مصرف می‌کنید؟', en: 'Are you taking any prescribed medications?' },
        answer: {
          fa: 'برای کنترل فشار خون روزانه قرص Ramipril (داروی ACE Inhibitor) مصرف می‌کنم.',
          en: 'I take Ramipril daily for high blood pressure.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'c1',
        text: {
          fa: 'تحویل شربت سرفه اکسپکتورانت (Benadryl/Bisolvon) و توصیه به نوشیدن مایعات گرم.',
          en: 'Dispense OTC expectorant cough syrup and recommend warm fluids.',
        },
        patientReply: {
          fa: 'آیا تحویل شربت معمولی برای سرفه ۹ هفته‌ای همراه خلط خونی و تنگی نفس کافی است؟',
          en: 'Is an OTC syrup appropriate for a 9-week cough with blood streaks and shortness of breath?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'c2',
        text: {
          fa: 'شناسایی پرچم قرمز بالینی: عدم فروش OTC و ارجاع فوری به GP همراه با نامه رسمی به دلیل سرفه >۸ هفته، خلط خونی (Hemoptysis)، تنگی نفس (Dyspnea)، خلط چرکی و ارزیابی عارضه سرفه ACEi (Ramipril).',
          en: 'Red Flag Alert: Refuse OTC supply. Urgent GP Referral for Chest X-ray, sputum microscopy, dyspnea assessment & ACE-inhibitor cough review.',
        },
        patientReply: {
          fa: 'بسیار ممنون داروساز گرامی! فوراً برای معاینه ریه نزد پزشک عمومی می‌روم و نامه ارجاع شما را تحویل می‌دهم.',
          en: 'Thank you pharmacist! I will see my GP urgently today with your referral letter.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'منع فروش OTC - ارجاع فوری به پزشک عمومی جهت رادیوگرافی ریه (CXR) و بررسی بالینی',
        en: 'Refuse OTC Supply - Urgent GP Referral for Chest Radiography & Pulmonary Review',
      },
      explanation: {
        fa: 'سرفه بیش از ۸ هفته (Chronic Cough)، وجود رگه‌های خون در خلط (Hemoptysis)، خلط چرکی (Purulent Sputum)، تنگی نفس (Dyspnea) و مصرف داروهای ACE Inhibitor (Ramipril) از پرچم‌های قرمز قطعی ارجاع بالینی هستند. فروش داروی OTC در این شرایط باعث تاخیر در تشخیص بیماری‌های جدی ریوی یا عفونت‌های باکتریایی عمیق می‌شود.',
        en: 'Cough duration >8 weeks combined with hemoptysis, dyspnea, purulent sputum, and ACEi therapy represent critical Red Flags requiring urgent GP assessment, CXR, and sputum culture.',
      },
      referralLetterTemplate: {
        to: 'Attending General Practitioner',
        reason: 'Chronic Cough (>8 weeks), Hemoptysis, Dyspnea & ACEi Therapy Review',
        symptomSummary: '54yo male presenting with a 9-week persistent productive cough, yellow purulent sputum with visible blood streaks over the last 2 days, and exertional dyspnea.',
        currentMeds: 'Ramipril 5mg daily (ACE Inhibitor)',
        suggestedAction: 'Urgent medical examination, chest X-ray (CXR), sputum microbiology culture, and evaluation for ACEi-induced cough vs pulmonary pathology.',
      },
    },
  },

  {
    id: 'hayfever-triage',
    title: {
      fa: '۲. آلرژی فصلی، رانندگان و تمایز Telfast در برابر اسپری Rhinocort (Allergic Rhinitis)',
      en: '2. Allergic Rhinitis: Telfast vs INCS Rhinocort Triage',
    },
    category: { fa: 'آلرژی و ایمونولوژی (Allergy)', en: 'Allergy & Rhinitis' },
    patientProfile: {
      name: 'Mark Stevens',
      age: 39,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار که راننده ماشین‌آلات سنگین است با عطسه شدید، گرفتگی بینی و خارش چشم فصلی مراجعه کرده و داروی ضدآلرژی بدون خواب‌آلودگی می‌خواهد.',
        en: 'Patient who is a heavy machinery operator presents with severe seasonal rhinitis requesting non-drowsy allergy relief.',
      },
    },
    redFlags: [
      { fa: 'انسداد یک‌طرفه کامل بینی (Unilateral nasal obstruction) یا خونریزی شدید بینی (Epistaxis)', en: 'Unilateral nasal obstruction or severe epistaxis' },
      { fa: 'خواب‌آلودگی شدید ناشی از آنتی‌هیستامین‌های نسل اول (Phenergan/Promethazine) در رانندگان', en: 'Sedation risk of 1st gen antihistamines in drivers' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و شغل؟', en: 'W - Patient & Occupation?' },
        question: { fa: 'شغل شما چیست و حساسیت به خواب‌آلودگی دارید؟', en: 'What is your job and concern regarding drowsiness?' },
        answer: { fa: 'من اپراتور جرثقیل و راننده تریلی هستم؛ خواب‌آلودگی برایم خطرساز و مرگبار است!', en: 'I operate heavy cranes and drive trucks. Drowsiness is extremely dangerous for me!' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و شدت علائم؟', en: 'H - Duration & severity?' },
        question: { fa: 'علائم شما چقدر شدید است و آیا گرفتگی بینی مانع خواب و کار شما می‌شود؟', en: 'How severe are your symptoms and does congestion disrupt your sleep?' },
        answer: {
          fa: 'هر بهار ۴ هفته گرفتار می‌شوم؛ الان گرفتگی شدید بینی دارم به طوری که شب‌ها نمی‌توانم از بینی نفس بکشم.',
          en: 'Every spring for 4 weeks. Currently my nasal congestion is severe and blocks nocturnal breathing.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Previous medication?' },
        question: { fa: 'قبلاً چه دارویی مصرف کرده‌اید؟', en: 'What medications have you taken before?' },
        answer: {
          fa: 'پارسال قرص Phenergan خوردم که گیج شدم؛ امسال می‌خواهم بدانم تفاوت قرص آلرژی با اسپری بینی چیست.',
          en: 'Last year I took Phenergan which caused severe drowsiness.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم یک‌طرفه یا درد سینوس؟', en: 'T - Unilateral symptoms?' },
        question: { fa: 'آیا گرفتگی بینی فقط در یک سمت است؟', en: 'Is the congestion restricted to one nostril?' },
        answer: { fa: 'خیر، هر دو طرف بینی گرفته است.', en: 'No, both nostrils are congested.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'h1',
        text: {
          fa: 'تجویز آنتی‌هیستامین نسل اول Phenergan (Promethazine) به همراه قطره خوراکی ضد احتقان.',
          en: 'Dispense 1st-generation sedating antihistamine (Phenergan).',
        },
        patientReply: {
          fa: 'اما من اپراتور جرثقیل هستم! Phenergan باعث خواب‌آلودگی و خطر تصادف می‌شود.',
          en: 'I operate heavy machinery! Phenergan causes severe sedation and accident risks.',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'h2',
        text: {
          fa: 'راهنمایی بالینی بر اساس شدت: ۱) برای آلرژی خفیف/مقطعی: آنتی‌هیستامین غیرخواب‌آلود نسل دوم مانند Telfast 180mg (Fexofenadine) روزی ۱ عدد. ۲) برای آلرژی متوسط/شدید همراه گرفتگی بینی (Nasal Congestion): اسپری کورتون استروئیدی بینی (INCS) مانند Rhinocort (Budesonide) یا Nasonex (Mometasone) به عنوان خط اول درمان + آموزش تکنیک صحیح اسپری زدن (سر متمایل به جلو، اسپری به سمت دیواره خارجی بینی جهت جلوگیری از خونریزی پرده بینی).',
          en: 'Select 2nd-gen non-sedating antihistamine Telfast 180mg (Fexofenadine) for mild intermittent symptoms OR Intranasal Corticosteroid Spray INCS Rhinocort/Nasonex as 1st-line for moderate-to-severe congestion + INCS administration technique counseling (head tilted forward, spray directed away from septum).',
        },
        patientReply: {
          fa: 'بسیار ممنون! توضیحات دقیق شما درباره شروع اسپری Rhinocort برای گرفتگی بینی و تکنیک صحیح مصرف عالی بود.',
          en: 'Thank you! The explanation regarding INCS spray for blockage and proper spray technique was extremely helpful.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید انتخاب اسپری کورتون بینی (INCS Rhinocort) + قرص Telfast 180mg غیرخواب‌آلود',
        en: 'Approved INCS Nasal Spray Rhinocort & Telfast 180mg Non-Sedating Protocol',
      },
      explanation: {
        fa: 'بر اساس گایدلاین‌های رینیت آلرژیک استرالیا، آنتی‌هیستامین‌های نسل اول خواب‌آلودکننده در رانندگان و اپراتورهای ماشین‌آلات کاملاً منع مصرف دارند. برای آلرژی‌های همراه با گرفتگی بینی (Nasal blockage)، اسپری کورتون بینی (INCS) خط اول درمان است. آموزش تکنیک صحیح (سر متمایل به جلو، اسپری به سمت دیواره خارجی) از خونریزی پرده بینی (Septal epistaxis) جلوگیری می‌کند.',
        en: '1st-generation antihistamines are strictly contraindicated for drivers. For allergic rhinitis with prominent nasal congestion, INCS sprays (Budesonide/Mometasone) are 1st-line therapy. Correct spray technique prevents septal irritation.',
      },
    },
  },

  {
    id: 's3-pseudoephedrine',
    title: {
      fa: '۳. احتقان شدید و سودوافدرین S3 با استعلام Project Stop (Pseudoephedrine S3)',
      en: '3. Pseudoephedrine S3 & Project Stop Real-Time Verification',
    },
    category: { fa: 'داروهای S3 و احراز هویت (S3 Medicines)', en: 'S3 & Identification' },
    patientProfile: {
      name: 'Sarah Jenkins',
      age: 29,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار با احتقان شدید سینوسی مراجعه کرده و درخواست قرص Sudafed 60mg (Pseudoephedrine S3) بدون نسخه دارد.',
        en: 'Patient presents requesting oral Sudafed 60mg (Pseudoephedrine S3) for severe sinus congestion.',
      },
    },
    redFlags: [
      { fa: 'فشار خون بالای کنترل‌نشده، بیماری ایسکمیک قلبی یا مصرف همزمان MAOI', en: 'Uncontrolled hypertension, ischemic heart disease or MAOI therapy' },
      { fa: 'علائم مصرف سوء یا خریدهای مکرر غیرعادی سودوافدرین', en: 'Signs of pseudoephedrine misuse or frequent repeat purchases' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'قرص سودوافدرین را برای چه کسی می‌خواهید؟', en: 'Who is the Sudafed for?' },
        answer: { fa: 'برای خودم است.', en: 'It is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت علامت؟', en: 'H - Duration?' },
        question: { fa: 'چند روز است احتقان بینی دارید؟', en: 'How long have you had sinus congestion?' },
        answer: { fa: 'از ۲ روز پیش گرفتگی شدید سینوسی دارم.', en: 'For 2 days with severe sinus pressure.' },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'آیا داروی ضد احتقان دیگری مصرف کرده‌اید؟', en: 'Have you taken other decongestants?' },
        answer: { fa: 'فقط سرم نمکی شستشو دادم اما باز نشد.', en: 'Only saline spray.' },
      },
      {
        key: 'T',
        label: { fa: 'T - بارداری و فشار خون؟', en: 'T - Pregnancy & blood pressure?' },
        question: { fa: 'آیا باردار هستید یا فشار خون بالا دارید؟', en: 'Are you pregnant or do you have high blood pressure?' },
        answer: { fa: 'خیر، باردار نیستم و فشار خونم کاملاً نرمال است.', en: 'No pregnancy, blood pressure is normal.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'p1',
        text: {
          fa: 'تحویل سودوافدرین بدون دریافت کارت شناسایی عکس‌دار و بدون استعلام در Project Stop.',
          en: 'Dispense Sudafed without requesting photo ID or recording in Project Stop.',
        },
        patientReply: {
          fa: 'آیا طبق قوانین داروخانه‌های استرالیا ارائه مدرک شناسایی برای سودوافدرین الزامی نیست؟',
          en: 'Isn\'t recording photo ID mandatory for Sudafed under Australian pharmacy law?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'p2',
        text: {
          fa: 'اجرای پروتکل داروی S3 Pharmacist Only: درخواست کارت شناسایی عکس‌دار معتبر (گواهینامه رانندگی یا پاسپورت)، ثبت استعلام زنده در سامانه آنلاین Project Stop جهت پیشگیری از انحراف غیرقانونی + ارائه مشاوره داروساز (مصرف حداکثر ۵ روز، عدم مصرف نزدیک زمان خواب به دلیل بی خوابی insomnia).',
          en: 'S3 Pharmacist Only Protocol: Request valid photo ID (Driver License/Passport), perform real-time verification in Project Stop system + Pharmacist counseling on max 5-day use & avoiding bedtime dosing due to insomnia risk.',
        },
        patientReply: {
          fa: 'بفرمایید، این گواهینامه رانندگی معتبر من است. ممنون از مشاوره نحوه مصرف و رعایت قوانین Project Stop.',
          en: 'Here is my valid driver license. Thank you for checking Project Stop and providing usage advice.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید تحویل S3 Sudafed 60mg پس از ثبت هویت در Project Stop و مشاوره داروساز',
        en: 'Approved S3 Sudafed Supply Post Project Stop ID Verification & Counseling',
      },
      explanation: {
        fa: 'سودوافدرین (Sudafed 60mg) داروی جدول Schedule 3 (Pharmacist Only) است. طبق قوانین استرالیا، تحویل آن مستلزم احراز هویت با مدرک عکس‌دار معتبر، ثبت در سامانه کشوری Project Stop و مشاوره مستقیم داروساز درباره طول درمان (حداکثر ۵ روز) و عوارض سمپاتومیمتیک است.',
        en: 'Pseudoephedrine S3 requires mandatory photo ID verification and Project Stop online database recording prior to supply to curb illicit diversion, alongside mandatory pharmacist counseling on max 5-day duration.',
      },
    },
  },

  {
    id: 'coldsore-triage',
    title: {
      fa: '۴. تبخال لب در مرحله اولیه و کرم آکلوویر ۵٪ (Cold Sore / Herpes Labialis)',
      en: '4. Cold Sore Prodromal Triage & Acyclovir 5% Regimen',
    },
    category: { fa: 'ویروسی و پوست (Viral & Dermatology)', en: 'Viral & Dermatology' },
    patientProfile: {
      name: 'Chloe Bennett',
      age: 26,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار با سوزش و سوزن‌سوزن شدن اولیه در حاشیه لب مراجعه کرده و قبل از تاول زدن فرآورده درمان تبخال می‌خواهد.',
        en: 'Patient presents with early tingling and burning on the lip margin before blister formation, requesting cold sore cream.',
      },
    },
    redFlags: [
      { fa: 'ضایعات نزدیک یا داخل چشم (Ocular Herpes - خطر آسیب قرنیه و کوری!)', en: 'Lesions in or near the eye (Ocular Herpes risk!)' },
      { fa: 'تداوم ضایعات بیش از ۱۴ روز، انتشار وسیع پوستی یا بیمار مبتلا به نقص ایمنی', en: 'Duration >14 days, widespread skin lesions, or immunocompromised patient' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'فرآورده تبخال را برای چه کسی می‌خواهید؟', en: 'Who is the cold sore treatment for?' },
        answer: { fa: 'برای خودم است.', en: 'It is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مرحله و زمان شروع؟', en: 'H - Stage & onset timing?' },
        question: { fa: 'احساس سوزن‌سوزن شدن از چه زمانی شروع شده و آیا تاول ایجاد شده است؟', en: 'When did the tingling start and are blisters present?' },
        answer: {
          fa: 'حدود ۳ ساعت پیش حس سوزش و سوزن‌سوزن شدن (Prodromal stage) روی لبم شروع شد و هنوز تاول باز نشده است.',
          en: 'About 3 hours ago I felt tingling on my lip. No open blisters yet.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'تاکنون دارویی روی لب زده‌اید؟', en: 'Have you applied any cream yet?' },
        answer: { fa: 'خیر، هیچ کرمی نزدم.', en: 'No, nothing yet.' },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم چشمی یا بیماری ایمنی؟', en: 'T - Eye symptoms?' },
        question: { fa: 'آیا خارش یا سوزش در چشم دارید؟', en: 'Do you have any eye irritation or redness?' },
        answer: { fa: 'خیر، چشم‌هایم کاملاً سالم و بدون علامت است.', en: 'No, my eyes feel completely fine.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'cs1',
        text: {
          fa: 'تحویل کرم کورتون Hydrocortisone 1% روی تبخال لب.',
          en: 'Dispense Hydrocortisone 1% cream for lip cold sore.',
        },
        patientReply: {
          fa: 'آیا زدن کورتون تک‌دارویی روی عفونت ویروسی تبخال باعث تکثیر بیشتر ویروس نمی‌شود؟',
          en: 'Doesn\'t applying a steroid alone on viral herpes cause the virus to proliferate?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'cs2',
        text: {
          fa: 'تجویز کرم ضدویروس Acyclovir 5% (Zovirax/Cold Sore Cream) در مرحله پروڈرومال اولیه: مصرف هر ۴ ساعت یک‌بار (۵ بار در روز) به مدت ۵ روز + آموزش رعایت بهداشت دست (شستشوی دست قبل و بعد از مصرف جهت جلوگیری از انتقال ویروس به چشم و افراد دیگر) + استفاده از ضدآفتاب لب (Lip Balm SPF30+).',
          en: 'Recommend Acyclovir 5% topical cream (Zovirax) at early prodromal stage: Apply every 4 hours (5 times daily) for 5 days + Hand hygiene counseling (wash hands before/after application to prevent ocular autoinoculation) + Recommend Lip Balm SPF30+.',
        },
        patientReply: {
          fa: 'خیلی ممنون از شروع به موقع درمان ضدویروس آکلوویر ۵٪ و آموزش بهداشت شستشوی دست!',
          en: 'Thank you for recommending prompt Acyclovir 5% antiviral cream and hand hygiene advice!',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید درمان کرم ضدویروس Acyclovir 5% (۵ بار در روز x ۵ روز) + آموزش شستشوی دست',
        en: 'Approved Topical Acyclovir 5% Regimen & Hand Hygiene Counseling',
      },
      explanation: {
        fa: 'درمان موضعی تبخال (Herpes Labialis) با کرم آکلوویر ۵٪ در صورت شروع در مرحله اولیه پروڈرومال (سوزن‌سوزن شدن) بیشترین کارایی را دارد. دستور دوزینگ استاندارد هر ۴ ساعت (۵ بار در روز) به مدت ۵ روز است. رعایت شستشوی دست جهت جلوگیری از انتقال به چشم (Ocular Herpes) حیاتی است.',
        en: 'Topical Acyclovir 5% applied during early prodrome reduces healing time and viral shedding. Standard regimen is 5 times daily for 5 days. Hand hygiene prevents autoinoculation to eyes.',
      },
    },
  },

  {
    id: 'chickenpox-advisory',
    title: {
      fa: '۵. آبله‌مرغان کودک، منع حمام گرم/روغن و منع ایبوپروفن (Chickenpox Bath & Fever Advisory)',
      en: '5. Pediatric Chickenpox: Bathing, Oil & NSAID Contraindications',
    },
    category: { fa: 'ویروسی کودکان (Pediatric Viral)', en: 'Pediatric Infections' },
    patientProfile: {
      name: 'Sarah Jenkins (Mother of Leo)',
      age: 31,
      gender: 'زن (Female)',
      presentation: {
        fa: 'مادر کودک ۵ ساله (Leo) با ضایعات تاولی خارش‌دار آبله‌مرغان مراجعه کرده و می‌پرسد آیا حمام آب گرم با روغن یا کرم سنگین برای خارش خوب است و چه مسکنی بدهد.',
        en: 'Mother of 5yo child presenting with itchy chickenpox vesicles asking about warm baths, bath oils, and fever relief options.',
      },
    },
    redFlags: [
      { fa: 'عفونت باکتریایی ثانویه پوست (سلولیت پیشرونده، تاول‌های چرکی زرد و تاول‌های بزرگ Bullae)', en: 'Secondary bacterial skin infection (spreading cellulitis, bullous impetigo)' },
      { fa: 'تب بالای ۳۹ درجه، بی‌حالی شدید، تنگی نفس یا ناهماهنگی حرکتی (Ataxia/Encephalitis)', en: 'High fever >39C, severe lethargy, dyspnea or ataxia' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'کودک شما چند سال دارد؟', en: 'How old is your child?' },
        answer: { fa: 'پسرم Leo ۵ ساله است.', en: 'My son Leo is 5 years old.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت ضایعات و خارش؟', en: 'H - Duration of vesicles?' },
        question: { fa: 'تاول‌ها از چه زمانی ظاهر شده‌اند؟', en: 'When did the blisters appear?' },
        answer: {
          fa: 'از دیروز تاول‌های خارش‌دار روی سینه و صورتش درآمده و شدیداً بی‌قراری می‌کند.',
          en: 'They started 2 days ago on his chest and face, intensely itchy.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - تصمیمات مادر؟', en: 'A - Planned remedies?' },
        question: { fa: 'چه برنامه‌ای برای حمام و تب کودک داشتید؟', en: 'What was your plan for bathing and fever?' },
        answer: {
          fa: 'می‌خواستم او را در وان آب داغ با روغن بدن ماساژ دهم و شربت ایبوپروفن (Nurofen) بدهم.',
          en: 'I planned a hot bath with body oils and giving Nurofen (Ibuprofen) for fever.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم تب و تنفس؟', en: 'T - Fever & breathing?' },
        question: { fa: 'تب کودک چقدر است و آیا تنفس طبیعی دارد؟', en: 'What is his temperature and breathing status?' },
        answer: { fa: 'تبش ۳۸.۱ درجه است و تنفسش کاملاً طبیعی است.', en: 'His temperature is 38.1C with normal breathing.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'cp1',
        text: {
          fa: 'تایید حمام آب داغ با روغن بدن و دادن شربت ایبوپروفن (Nurofen) برای تب.',
          en: 'Approve hot baths with oils and prescribe Ibuprofen (Nurofen) for fever.',
        },
        patientReply: {
          fa: 'آیا حمام داغ و ایبوپروفن در آبله‌مرغان خطرناک نیستند؟',
          en: 'Aren\'t hot baths and ibuprofen dangerous in chickenpox?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'cp2',
        text: {
          fa: 'ارائه هشدارهای حیاتی بالینی: ۱) منع قطعی حمام آب گرم/داغ و ماساژ روغن: گرمای داغ و پمادهای چرب گرما را حبس کرده، خارش را شدیدتر می‌کنند و خطر عفونت باکتریایی ثانویه را بالا می‌برند. توصیه به حمام خنک/ولرم با پودر جو دوسر (DermaVeen) یا Pinetarsol و خشک کردن با حوله به صورت ضربه‌ای آرام. ۲) منع قطعی ایبوپروفن/NSAIDs: ایبوپروفن در آبله‌مرغان به دلیل خطر اثبات‌شده عفونت‌های شدید باکتریایی عمقی پوست (Necrotising Fasciitis) اکیداً ممنوع است! مصرف Paracetamol برای کنترل تب پیشنهاد می‌شود.',
          en: 'CRITICAL CLINICAL WARNINGS: 1) Warm/hot baths and oils are CONTRAINDICATED (traps heat, worsens itch & increases bacterial infection risk). Recommend cool/lukewarm baths with colloidal oatmeal (DermaVeen) or Pinetarsol + patting dry. 2) Ibuprofen/NSAIDs are strictly CONTRAINDICATED in Varicella due to increased risk of severe necrotising fasciitis! Paracetamol ONLY for fever control.',
        },
        patientReply: {
          fa: 'بسیار ممنون که جلوی خطر حمام داغ و مصرف ایبوپروفن را گرفتید! فقط حمام ولرم پینتارسل و شربت پاراستامول استفاده می‌کنم.',
          en: 'Thank you for warning me against hot baths and ibuprofen! I will use cool Pinetarsol baths and Paracetamol syrup only.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید حمام خنک Pinetarsol + Paracetamol و منع قطعی ایبوپروفن و حمام داغ',
        en: 'Approved Cool Pinetarsol Bath & Paracetamol Protocol; Ibuprofen Contraindicated',
      },
      explanation: {
        fa: 'در آبله‌مرغان (Varicella)، حمام گرم و روغن‌های چرب به دلیل حبس حرارت خارش را تشدید کرده و ریسک عفونت ثانویه استافیلوکوکی/استرپتوکوکی را بالا می‌برند. ایبوپروفن و داروهای NSAID در آبله‌مرغان به دلیل ارتباط مستقیم با بروز عفونت کشنده بافت نرم (Necrotising Fasciitis) کاملاً منع مصرف دارند و پاراستامول تنهای مسکن مجاز است.',
        en: 'Hot baths and occlusive oils worsen varicella pruritus and bacterial superinfection risks. NSAIDs (Ibuprofen) are strictly contraindicated in varicella due to heightened risk of invasive Group A Strep necrotising fasciitis. Paracetamol is the sole antipyretic of choice.',
      },
    },
  },

  {
    id: 'hydrocortisone-triage',
    title: {
      fa: '۶. تریاژ کورتون‌های موضعی: Dermaid 0.5% در برابر Dermaid 1% و Hydrozole S3 (Topical Steroids)',
      en: '6. Topical Hydrocortisone Triage: Dermaid 0.5% vs 1% vs Hydrozole S3',
    },
    category: { fa: 'درماتولوژی و استروئید (Dermatology)', en: 'Dermatology & Steroids' },
    patientProfile: {
      name: 'Emma Watson',
      age: 32,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار با ضایعه قرمز، ملتهب و خارش‌دار در چین پوستی زیر سینه (Intertrigo) مراجعه کرده و می‌خواهد بداند کدام کرم هیدروکورتیزول (Dermaid 0.5% یا 1% یا Hydrozole) مناسب است.',
        en: 'Patient presents with an inflamed, itchy red rash in the submammary skin fold asking for guidance between Dermaid 0.5%, Dermaid 1%, and Hydrozole S3.',
      },
    },
    redFlags: [
      { fa: 'ضایعه پوستی همراه با ترشحات چرکی زرد رنگ (عفونت باکتریایی ثانویه)', en: 'Skin lesion with purulent yellow exudate' },
      { fa: 'استفاده طولانی‌مدت کورتون‌های قوی روی صورت یا چین‌های پوستی (خطر آتروفی پوست)', en: 'Long-term potent steroid use on face or intertriginous skin' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'کرم پوستی را برای کدام ناحیه بدن می‌خواهید؟', en: 'Where is the skin irritation located?' },
        answer: { fa: 'برای زیر سینه‌ام است.', en: 'It is in my submammary skin fold.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و ظاهر ضایعه؟', en: 'H - Duration & appearance?' },
        question: { fa: 'چند روز است التهاب دارید و ضایعه چه شکلی دارد؟', en: 'How long has it been present and how does it look?' },
        answer: {
          fa: 'حدود ۱ هفته است قرمزی، سوزش و بوی خفیف در چین پوستی دارم و حاشیه‌هایش لکه‌های قرمز کوچک (Satellite lesions) دارد.',
          en: 'For 1 week with redness, soreness, and satellite papules along the margins.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'تاکنون چه کرمی استفاده کرده‌اید؟', en: 'What creams have you applied?' },
        answer: { fa: 'فقط مرطوب‌کننده زدم ولی بدتر شد.', en: 'Only moisturizer which made it moist and worse.' },
      },
      {
        key: 'T',
        label: { fa: 'T - چرک یا دیابت؟', en: 'T - Pus or diabetes?' },
        question: { fa: 'آیا چرک زرد رنگ یا سابقه دیابت دارید؟', en: 'Is there yellow pus or diabetes history?' },
        answer: { fa: 'چرک ندارد، دیابت هم ندارم.', en: 'No pus, no diabetes.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'hc1',
        text: {
          fa: 'توصیه به مصرف Dermaid 0.5% به تنهایی برای چین پوستی عفونی.',
          en: 'Recommend Dermaid 0.5% monotherapy for infected intertrigo.',
        },
        patientReply: {
          fa: 'آیا کورتون تک‌دارویی روی عفونت قارچی چین پوستی باعث گسترش قارچ نمی‌شود؟',
          en: 'Doesn\'t steroid alone on a fungal intertrigo rash make the fungus spread?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'hc2',
        text: {
          fa: 'آموزش تمایز فرآورده‌های هیدروکورتیزون: ۱) Dermaid 0.5% (S2): مخصوص اگزمای خفیف صورت یا پوست نازک کودکان. ۲) Dermaid 1% 30g (S2): مخصوص اگزما و درماتیت غیرعفونی بدن. ۳) Hydrozole S3 (Hydrocortisone 1% + Clotrimazole 1%): انتخاب صحیح بالینی برای ضایعات قارچی همراه التهاب شدید (Intertrigo/Tinea) — مصرف روزی ۲ بار حداکثر به مدت ۷ روز، سپس ادامه درمان با ضدقارچ ساده (Clotrimazole) تا بهبود کامل.',
          en: 'Guide Steroid Product Selection: 1) Dermaid 0.5% (S2): Mild facial/infantile eczema. 2) Dermaid 1% (S2): Non-infected body dermatitis. 3) Hydrozole S3 (Hydrocortisone 1% + Clotrimazole 1%): Correct clinical choice for inflamed fungal intertrigo — apply twice daily for max 7 days, then step down to plain antifungal (Clotrimazole) until clear.',
        },
        patientReply: {
          fa: 'خیلی ممنون از تمایز دقیق داروساز! فرآورده ترکیبی Hydrozole S3 را به مدت ۷ روز استفاده می‌کنم و چین پوستی را خشک نگه می‌دارم.',
          en: 'Thank you for explaining the exact differences! I will use Hydrozole S3 for 7 days and keep the skin fold dry.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید انتخاب کرم ترکیبی Hydrozole S3 به مدت حداکثر ۷ روز + آموزش خشک نگه داشتن چین پوستی',
        en: 'Approved Hydrozole S3 Combined Antifungal/Steroid Protocol (Max 7 Days)',
      },
      explanation: {
        fa: 'ضایعات چین پوستی (Intertrigo) با ضایعات اقماری (Satellite lesions) نشان‌دهنده عفونت قارچی کاندیدایی همراه التهاب است. استفاده از کورتون تنها (Dermaid) باعث Tinea Incognito و گسترش قارچ می‌شود. Hydrozole S3 (Hydrocortisone + Clotrimazole) التهاب شدید را سریع مهار کرده و قارچ را درمان می‌کند (حداکثر ۷ روز مصرف استروئید).',
        en: 'Fungal intertrigo with satellite papules requires combination therapy. Hydrocortisone monotherapy (Dermaid) is contraindicated as it exacerbates fungal growth. Hydrozole S3 treats both inflammation and fungal pathogen safely for up to 7 days.',
      },
    },
  },

  {
    id: 'pinworm-triage',
    title: {
      fa: '۷. انگل کرمک کودکان، مبندازول و تکرار الزامی دوز بعد ۲ هفته (Pinworm / Threadworm Protocol)',
      en: '7. Pediatric Pinworm: Mebendazole Single & 2-Week Repeat Dose Protocol',
    },
    category: { fa: 'عفونت‌های انگلی (Parasitic Infections)', en: 'Parasitic Infections' },
    patientProfile: {
      name: 'Jessica Brown (Mother of Toby)',
      age: 28,
      gender: 'زن (Female)',
      presentation: {
        fa: 'مادر کودک ۶ ساله (Toby) با شکایت از خارش شدید مقعدی کودک در شب مراجعه کرده و داروی کرمک (Vermox / Mebendazole) می‌خواهد.',
        en: 'Mother of 6yo child presenting with nocturnal perianal itching requesting Vermox (Mebendazole 100mg).',
      },
    },
    redFlags: [
      { fa: 'کودک زیر ۲ سال یا وزن زیر ۱۰ کیلوگرم (نیازمند ارزیابی دوز دقیق یا نظر پزشک)', en: 'Child age <2 years or weight <10kg' },
      { fa: 'عفونت باکتریایی ثانویه شدید پوست مقعد ناشی از خاراندن مداوم', en: 'Severe secondary bacterial skin infection from scratching' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و سن؟', en: 'W - Who is the patient & age?' },
        question: { fa: 'کودک شما چند سال دارد و آیا بقیه اعضای خانواده علائم دارند؟', en: 'How old is your child and are other family members affected?' },
        answer: { fa: 'پسرم ۶ ساله است و خانواده ۴ نفره هستیم.', en: 'My son is 6 years old. We are a family of 4.' },
      },
      {
        key: 'H',
        label: { fa: 'H - زمان و خصوصیات خارش؟', en: 'H - Symptom timing?' },
        question: { fa: 'خارش چه زمانی شدیدتر است و آیا کرم سفید دیده‌اید؟', en: 'When is itching worse and have you seen white threadworms?' },
        answer: {
          fa: 'شب‌ها هنگام خواب از شدت خارش مقعد گریه می‌کند و دیشب نخ‌های سفید کوچک متحرک دیدم.',
          en: 'At night he cries from severe anal itch. I saw tiny white thread-like worms last night.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'تاکنون چه دارویی داده‌اید؟', en: 'Have you given any treatment yet?' },
        answer: { fa: 'هیچ دارویی ندادم.', en: 'No treatment given yet.' },
      },
      {
        key: 'T',
        label: { fa: 'T - سایر اعضای خانواده؟', en: 'T - Other family members?' },
        question: { fa: 'آیا قصد درمان تمام اعضای خانواده را دارید؟', en: 'Are you planning to treat the whole household?' },
        answer: {
          fa: 'فکر می‌کردم فقط باید به کودک مبتلا قرص بدهم!',
          en: 'I thought I only needed to treat the affected child!',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'pw1',
        text: {
          fa: 'تحویل ۱ عدد قرص Vermox (Mebendazole 100mg) فقط برای کودک مبتلا بدون تکرار دوز.',
          en: 'Dispense 1 tablet Vermox 100mg for the child only without a 2-week repeat dose.',
        },
        patientReply: {
          fa: 'آیا دادن ۱ قرص به کودک بدون درمان خانواده و بدون تکرار دوز باعث بازگشت کرمک نمی‌شود؟',
          en: 'Won\'t treating only one child without repeat dosing cause the pinworms to return?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'pw2',
        text: {
          fa: 'آموزش پروتکل کامل درمان کرمک (Pinworm / Threadworm): ۱) مصرف ۱ عدد قرص Mebendazole 100mg (Vermox) همزمان برای تمام اعضای خانواده (چه علامت داشته باشند چه نداشته باشند). ۲) تکرار الزامی دوز دوم ۱۰۰ میلی‌گرمی پس از ۲ هفته (۱۴ روز) برای همه: مبندازول کرم‌های بالغ را می‌کشد اما تخم‌های کرمک را نمی‌کشد؛ دوز دوم کرم‌های تازه متولد شده را قبل از تخم‌گذاری مجدد نابود می‌کند. ۳) اقدامات بهداشتی: شستشوی ملحفه‌ها و لباس خواب با آب گرم، کوتاه نگه داشتن ناخن‌ها و شستشوی دست‌ها قبل از غذا.',
          en: 'Full Pinworm Mebendazole Protocol: 1) Single 100mg dose Mebendazole (Vermox) simultaneously for ALL household family members (asymptomatic members carry eggs). 2) MANDATORY repeat 100mg dose in 2 weeks (14 days) for everyone — Mebendazole kills adult worms but NOT eggs; 2nd dose kills newly hatched worms before they mature and reproduce. 3) Hygiene measures: Hot water wash of bedding/pajamas, short fingernails, hand washing.',
        },
        patientReply: {
          fa: 'خیلی ممنون از آموزش کامل! بسته ۴ عددی ورماکس می‌خرم، همه خانواده امروز می‌خوریم و ۲ هفته دیگر دوز دوم را تکرار می‌کنیم.',
          en: 'Thank you for the complete guidance! I will buy the family pack, treat everyone today, and repeat in 14 days.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید درمان همزمان تمام اعضای خانواده با Mebendazole 100mg + تکرار الزامی دوز بعد ۱۴ روز',
        en: 'Approved Family Household Mebendazole Protocol with Mandatory 2-Week Repeat Dose',
      },
      explanation: {
        fa: 'در درمان کرمک (Enterobius vermicularis)، درمان همزمان تمامی اعضای خانواده ضروری است زیرا تخم‌های میکروسکوپی در محیط خانه پخش می‌شوند. مبندازول (Mebendazole 100mg) فقط کرم بالغ را نابود می‌کند و روی تخم‌ها بی‌اثر است؛ لذا تکرار دوز پس از ۲ هفته برای کشتن کرم‌های تازه از تخم درآمده و قطع چرخه انتقال الزامی است.',
        en: 'Pinworm eggs spread easily across household bedding. Mebendazole 100mg kills adult worms but not eggs. Treating all family members and repeating the dose at 14 days eradicates newly hatched larvae before egg deposition resumes.',
      },
    },
  },

  {
    id: 'thrush-triage',
    title: {
      fa: '۸. کاندیدیازیس واژینال، فلوکونازول و پرچم قرمز بارداری (Vaginal Candidiasis & Pregnancy Red Flag)',
      en: '8. Vaginal Thrush: Oral Fluconazole S3 vs Pregnancy Red Flag Triage',
    },
    category: { fa: 'سلامت زنان و ضدقارچ (Womens Health)', en: 'Womens Health' },
    patientProfile: {
      name: 'Laura Martinez',
      age: 28,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار با سوزش، خارش شدید واژینال و ترشحات سفید پنپه‌ای مراجعه کرده و تقاضای کپسول خوراکی تک‌دوز Diflucan (Fluconazole 150mg S3) دارد.',
        en: 'Patient presents with severe vulvovaginal itching and thick white discharge requesting oral Diflucan (Fluconazole 150mg S3).',
      },
    },
    redFlags: [
      { fa: 'بارداری یا شیردهی (منع مطلق مصرف فلوکونازول خوراکی به دلیل خطر سقط و ناهنجاری جنین!)', en: 'PREGNANCY (Oral Fluconazole strictly contraindicated!)' },
      { fa: 'سن زیر ۱۶ یا بالای ۶۰ سال، خونریزی غیرطبیعی واژینال یا درد لگنی (Pelvic pain)', en: 'Age <16 or >60, abnormal bleeding or pelvic pain' },
      { fa: 'عدم پاسخ به درمان یا عود بیش از ۲ بار در ۶ ماه اخیر (Recurrent Thrush)', en: 'Recurrent thrush (>2 episodes in 6 months)' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'کپسول فلوکونازول را برای خودتان می‌خواهید؟', en: 'Is the Diflucan capsule for yourself?' },
        answer: { fa: 'بله، برای خودم است.', en: 'Yes, for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - علائم و ترشحات؟', en: 'H - Symptoms & discharge?' },
        question: { fa: 'ترشحات شما چه رنگ و شکلی دارد؟', en: 'What does the discharge look like?' },
        answer: {
          fa: 'ترشحات کاملاً سفید تکه‌تکه‌ای شبیه پنیر (Cottage cheese) بدون بوی بد و با خارش شدید دارم.',
          en: 'Thick white cottage-cheese discharge, very itchy, no foul odor.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - وضعیت بارداری؟ (CRITICAL)', en: 'A - PREGNANCY STATUS?' },
        question: { fa: 'آیا باردار هستید یا احتمال بارداری وجود دارد؟', en: 'Are you currently pregnant or trying to conceive?' },
        answer: {
          fa: 'بله! من ۱۴ هفته است که باردار هستم.',
          en: 'Yes! I am 14 weeks pregnant.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - درد یا خونریزی؟', en: 'T - Pain or bleeding?' },
        question: { fa: 'آیا درد زیر شکم یا خونریزی دارید؟', en: 'Do you have pelvic pain or abnormal bleeding?' },
        answer: { fa: 'خیر، فقط خارش و سوزش موضعی است.', en: 'No, only local itching.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'vt1',
        text: {
          fa: 'تحویل کپسول خوراکی Diflucan (Fluconazole 150mg S3) به خانم باردار.',
          en: 'Dispense oral Fluconazole 150mg capsule to the pregnant patient.',
        },
        patientReply: {
          fa: 'آیا مصرف قرص خوراکی فلوکونازول در هفته ۱۴ بارداری برای جنین خطرناک نیست؟',
          en: 'Is taking oral fluconazole safe during week 14 of pregnancy for the fetus?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'vt2',
        text: {
          fa: 'هشدار پرچم قرمز بارداری: مصرف آزول‌های خوراکی (Fluconazole 150mg) در دوران بارداری به دلیل افزایش اثبات‌شده خطر سقط جنین و ناهنجاری‌های مادرزادی اکیداً ممنوع است! جایگزینی فوری با درمان موضعی ایمن: شیاف/کرم واژینال ۶ روزه Clotrimazole (Canesten 100mg 6-day cream) با احتیاط در جاگذاری دستی شیاف بدون استفاده از اپلیکاتور عمیق.',
          en: 'PREGNANCY RED FLAG ALERT: Oral azoles (Fluconazole 150mg) are strictly CONTRAINDICATED in pregnancy due to risks of spontaneous abortion and congenital anomalies! Switch immediately to safe topical therapy: Clotrimazole 6-day vaginal cream/pessaries (Canesten 100mg 6-day) with cautious manual insertion (avoid deep applicator insertion).',
        },
        patientReply: {
          fa: 'خیلی ممنون از هشدارهای حیاتی داروساز! از خرید قرص خوراکی انصراف می‌دهم و کرم واژینال ۶ روزه کلوتریمازول را مصرف می‌کنم.',
          en: 'Thank you so much for the vital pregnancy warning! I will use the safe 6-day topical Clotrimazole cream instead.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'منع قطعی فلوکونازول خوراکی در بارداری - تجویز کرم موضعی ۶ روزه Clotrimazole (Canesten)',
        en: 'Oral Fluconazole Contraindicated in Pregnancy; Approved 6-Day Topical Clotrimazole Regimen',
      },
      explanation: {
        fa: 'مصرف فلوکونازول خوراکی (Fluconazole 150mg) در دوران بارداری طبق گایدلاین‌های TGA به دلیل خطر سقط جنین و ناهنجاری‌های قلبی عروقی ممنوع است. خط اول و ایمن درمان برفک واژینال در بارداری، ضدقارچ‌های موضعی مانند Clotrimazole به مدت حداقل ۶ روز است. اپلیکاتور نباید عمیق وارد شود.',
        en: 'Oral fluconazole is strictly contraindicated during pregnancy due to increased risks of spontaneous abortion and cardiac defects. Topical clotrimazole 6-day therapy is the safe gold standard for gestational vulvovaginal candidiasis.',
      },
    },
  },

  {
    id: 'shingrix-vaccine',
    title: {
      fa: '۹. واکسن زونا شینگریکس و فواصل دوزینگ در افراد سالم و نقص ایمنی (Shingrix Zoster Vaccine)',
      en: '9. Shingrix Zoster Vaccine Schedule Advisory',
    },
    category: { fa: 'واکسیناسیون و ایمونولوژی (Vaccines)', en: 'Vaccines & Immunology' },
    patientProfile: {
      name: 'Robert Taylor',
      age: 56,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار ۵۶ ساله مراجعه کرده و درباره نحوه تزریق واکسن زونا (Shingrix)، تعداد دوزها و فاصله زمانی بین دوز اول و دوم سوال می‌کند.',
        en: '56yo patient presenting to ask about the Shingrix zoster vaccine dosing schedule and intervals.',
      },
    },
    redFlags: [
      { fa: 'بیماری تب‌دار حاد شدید (تعویق تزریق واکسن تا بهبودی کامل)', en: 'Severe acute febrile illness (defer vaccination)' },
      { fa: 'سابقه حساسیت مفرط و آنفولاکسی شدید به اجزای واکسن Shingrix', en: 'History of severe anaphylaxis to Shingrix components' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و سن؟', en: 'W - Who is the patient & age?' },
        question: { fa: 'واکسن زونا برای چه کسی است و چند سال دارد؟', en: 'Who is the shingles vaccine for and what is their age?' },
        answer: { fa: 'برای خودم است و ۵۶ سال دارم.', en: 'It is for myself, I am 56 years old.' },
      },
      {
        key: 'H',
        label: { fa: 'H - سابقه زونا یا واکسن قبلی؟', en: 'H - Shingles or prior vaccine history?' },
        question: { fa: 'آیا قبلاً ابتلا به زونا یا واکسن زوستاوکس داشته‌اید؟', en: 'Have you had shingles or the Zostavax vaccine before?' },
        answer: {
          fa: 'خیر، اما دوستم زونا گرفت و دردهای عصبی شدیدی داشت، می‌خواهم واکسن Shingrix بزنم.',
          en: 'No, but my friend had severe nerve pain from shingles, so I want Shingrix protection.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - وضعیت سیستم ایمنی؟', en: 'A - Immune status?' },
        question: { fa: 'آیا مبتلا به نقص ایمنی هستید یا داروی تضعیف‌کننده ایمنی مصرف می‌کنید؟', en: 'Are you immunocompromised or taking immunosuppressive drugs?' },
        answer: {
          fa: 'خیر، کاملاً سالم هستم؛ اما می‌خواستم بدانم تفاوت زمان‌بندی افراد سالم با افراد نقص ایمنی چیست.',
          en: 'No, immunocompetent. But I want to know the dosing gap for immunocompetent vs immunocompromised.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - بیماری تب‌دار فعلی؟', en: 'T - Current illness?' },
        question: { fa: 'آیا امروز تب یا بیماری عفونی حاد دارید؟', en: 'Do you have a fever or acute illness today?' },
        answer: { fa: 'خیر، حالم کاملاً خوب است.', en: 'No, feeling completely fine.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'sv1',
        text: {
          fa: 'توضیح اشتباه: Shingrix تک‌دوز است و نیازی به دوز دوم ندارد.',
          en: 'Incorrectly state Shingrix is a single-dose vaccine.',
        },
        patientReply: {
          fa: 'مگر شینگریکس واکسن ۲ دوزه نیست؟',
          en: 'Isn\'t Shingrix a 2-dose recombinant vaccine series?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'sv2',
        text: {
          fa: 'مشاوره جامع زمان‌بندی تزریق واکسن غیرزنده نوترکیب Shingrix (۲ دوز عضلانی): ۱) برای افراد با ایمنی طبیعی (Immunocompetent ≥50 سال): فواصل استاندارد دوز اول در ماه ۰ و دوز دوم بین ۲ تا ۶ ماه بعد است. ۲) برای افراد مبتلا به نقص ایمنی (Immunocompromised ≥18 سال): زمان‌بندی فشرده Accelerate دوز اول در ماه ۰ و دوز دوم بین ۱ تا ۲ ماه بعد است. ۳) یادآوری ایمنی: Shingrix غیرزنده است و ایمنی بالای ۹۰٪ در برابر زونا و دردهای عصبی (Post-Herpetic Neuralgia) ایجاد می‌کند.',
          en: 'Comprehensive Shingrix (Recombinant Zoster Vaccine) Schedule Counseling: 1) Immunocompetent adults (≥50yo): Standard 2-dose schedule with Dose 1 at Month 0 and Dose 2 at 2 to 6 months. 2) Immunocompromised adults (≥18yo): Accelerated 2-dose schedule with Dose 1 at Month 0 and Dose 2 at 1 to 2 months. 3) Reassure non-live recombinant safety and >90% efficacy against PHN.',
        },
        patientReply: {
          fa: 'بسیار ممنون از مشاوره دقیق داروساز! دوز اول Shingrix را امروز تزریق می‌کنم و دوز دوم را برای ۳ ماه بعد تنظیم می‌کنم.',
          en: 'Thank you for the clear 2-dose Shingrix schedule explanation! I will get Dose 1 today and schedule Dose 2 in 3 months.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید مشاوره ۲ دوزه Shingrix (فاصله ۲ تا ۶ ماه برای افراد سالم / ۱ تا ۲ ماه برای نقص ایمنی)',
        en: 'Approved Shingrix 2-Dose Schedule Counseling (2-6 Months Immunocompetent / 1-2 Months Immunocompromised)',
      },
      explanation: {
        fa: 'واکسن Shingrix یک واکسن نوترکیب غیرزنده ۲ دوزه برای پیشگیری از زونا است. طبق گایدلاین‌های ایمن‌سازی استرالیا (Australian Immunisation Handbook)، فاصله دوز دوم برای افراد با ایمنی سالم ۵۰ سال به بالا ۲ تا ۶ ماه است، در حالی که در افراد ۱۸ سال به بالا با نقص ایمنی به ۱ تا ۲ ماه کاهش می‌یابد.',
        en: 'Shingrix is a recombinant subunit non-live 2-dose vaccine. The Australian Immunisation Handbook specifies a 2 to 6-month interval for immunocompetent adults ≥50yo, shortened to 1 to 2 months for immunocompromised individuals ≥18yo.',
      },
    },
  },

  {
    id: 'ear-triage',
    title: {
      fa: '۱۰. درد گوش و پارگی پرده گوش (Ear Pain & TM Perforation Contraindication)',
      en: '10. Ear Pain & Tympanic Perforation',
    },
    category: { fa: 'گوش، حلق و بینی (ENT)', en: 'ENT & Otology' },
    patientProfile: {
      name: 'David Miller',
      age: 42,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار با درد شدید گوش راست و ترشح زرد رنگ جهت خرید قطره جرم‌گیر گوش (Waxsol / Cerumol) مراجعه کرده است.',
        en: 'Patient presents with severe right ear pain requesting OTC ear drops (Waxsol) for wax removal.',
      },
    },
    redFlags: [
      { fa: 'ترشح زرد یا خونی گوش (Otorrhea) یا سابقه پارگی پرده گوش (TM Perforation)', en: 'Ear discharge (Otorrhea) or history of perforated eardrum' },
      { fa: 'تب بالای ۳۸.۵ یا کاهش شنوایی ناگهانی', en: 'Fever >38.5C or sudden hearing loss' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'قطره گوش را برای چه کسی می‌خواهید؟', en: 'Who are the ear drops for?' },
        answer: { fa: 'برای خودم است.', en: 'They are for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و ترشح؟', en: 'H - Duration & discharge?' },
        question: { fa: 'درد گوش از چه زمانی شروع شده است؟', en: 'When did the ear pain start?' },
        answer: { fa: 'از ۲ روز پیش درد شدید داشتم و دیشب مایع زرد رنگ از گوشم خارج شد.', en: 'Severe pain for 2 days with yellowish discharge last night.' },
      },
      {
        key: 'A',
        label: { fa: 'A - سابقه پرده گوش؟', en: 'A - Eardrum history?' },
        question: { fa: 'آیا سابقه پارگی پرده گوش داشته‌اید؟', en: 'Do you have a history of a ruptured eardrum?' },
        answer: { fa: 'بله، ۳ سال پیش به دلیل عفونت شدید پرده گوشم پاره شد.', en: 'Yes, I had a ruptured eardrum 3 years ago.' },
      },
      {
        key: 'T',
        label: { fa: 'T - مسکن‌ها؟', en: 'T - Analgesics?' },
        question: { fa: 'آیا مسکن خورده‌اید؟', en: 'Have you taken analgesics?' },
        answer: { fa: 'پاراستامول خوردم.', en: 'Only Paracetamol.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'e1',
        text: {
          fa: 'تحویل قطره Waxsol و بگویم روزی ۲ بار بچکاند.',
          en: 'Dispense Waxsol ear drops.',
        },
        patientReply: {
          fa: 'آیا قطره گوش با وجود ترشح و سابقه پارگی پرده گوش خطرناک نیست؟',
          en: 'Aren\'t ear drops dangerous with ear discharge and eardrum perforation history?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'e2',
        text: {
          fa: 'منع کامل قطره‌های OTC و ارجاع فوری به GP جهت اتوسکوپی: وجود ترشح (Otorrhea) و سابقه پارگی پرده گوش، تمام قطره‌های جرم‌گیر را کاملاً منع مصرف می‌کند (خطر سمیت اتوتوکسیک در گوش میانگاهی).',
          en: 'Absolute Contraindication: Refuse OTC ear drops & urgent GP referral for otoscopy. Ceruminolytics are contraindicated in perforated eardrums due to ototoxicity risks.',
        },
        patientReply: {
          fa: 'ممنون که منعیات مصرف را هشدار دادید. فوراً نزد پزشک عمومی می‌روم.',
          en: 'Thank you for explaining the contraindication. I will visit my GP immediately.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'منع قطعی قطره‌های OTC - ارجاع فوری به پزشک عمومی جهت اتوسکوپی',
        en: 'Absolute OTC Ear Drops Contraindication - Urgent GP Referral',
      },
      explanation: {
        fa: 'ترشح گوش (Otorrhea) یا سابقه پارگی پرده گوش (Tympanic Membrane Perforation) منع مصرف مطلق قطره‌های نرم‌کننده جرم گوش (Waxsol/Cerumol) است، زیرا نفوذ آن‌ها به گوش میانی خطر آسیب شنوایی و اتوتوکسیسیته دارد.',
        en: 'Ear discharge or perforated tympanic membrane history strictly contraindicates OTC ceruminolytic ear drops due to risk of middle ear ototoxicity.',
      },
      referralLetterTemplate: {
        to: 'Attending General Practitioner / ENT Specialist',
        reason: 'Otalgia, Otorrhea & Prior Tympanic Membrane Perforation History',
        symptomSummary: '42yo male presenting with severe right ear pain for 2 days, yellowish purulent discharge, and a prior history of perforated tympanic membrane.',
        currentMeds: 'Paracetamol 500mg PRN',
        suggestedAction: 'Otoscopic examination, assessment for otitis media/externa, and appropriate oral/non-ototoxic medical management.',
      },
    },
  },

  {
    id: 'dyspepsia-triage',
    title: {
      fa: '۱۱. سوزش معده، گیر کردن غذا در گلو و مدفوع تیره (Dyspepsia, Dysphagia & Melena)',
      en: '11. Dyspepsia, Dysphagia & Melena Triage',
    },
    category: { fa: 'دستگاه گوارش (Gastrointestinal)', en: 'Gastrointestinal' },
    patientProfile: {
      name: 'Andrew Scott',
      age: 58,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار با سوزش شدید معده مراجعه کرده و قرص اس‌امپرازول (Nexium 20mg S3) بدون نسخه می‌خواهد.',
        en: 'Patient presents requesting OTC Esomeprazole 20mg (Nexium S3) for persistent severe heartburn.',
      },
    },
    redFlags: [
      { fa: 'دشواری در بلع غذا (Dysphagia) یا گیر کردن لقمه در گلو', en: 'Difficulty swallowing (Dysphagia) or food impaction' },
      { fa: 'مدفوع تیره قیری (Melena) یا کاهش وزن ناخواسته بالای ۵۵ سال', en: 'Melena (dark tarry stools) or unexplained weight loss >55yo' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'دارو را برای خودتان می‌خواهید؟', en: 'Is the medicine for yourself?' },
        answer: { fa: 'بله، ۵۸ ساله هستم و برای خودم است.', en: 'Yes, I am 58 and it is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و گیر کردن غذا؟', en: 'H - Duration & swallowing?' },
        question: { fa: 'چند وقت است سوزش معده دارید و آیا موقع بلع مشکلی دارید؟', en: 'How long have you had heartburn and any difficulty swallowing?' },
        answer: {
          fa: 'حدود ۶ هفته است سوزش مداوم دارم و جدیداً لقمه جامد در گلویم گیر می‌کند.',
          en: 'For 6 weeks daily. Recently solid food gets stuck when I swallow.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'چه دارویی مصرف کرده‌اید؟', en: 'What antacids have you taken?' },
        answer: { fa: 'شربت Mylanta خوردم فایده نداشت.', en: 'Mylanta gave only temporary relief.' },
      },
      {
        key: 'T',
        label: { fa: 'T - رنگ مدفوع و وزن؟', en: 'T - Stool color & weight?' },
        question: { fa: 'آیا مدفوع تیره یا کاهش وزن داشته‌اید؟', en: 'Have you noticed dark stools or weight loss?' },
        answer: {
          fa: 'مدفوعم کاملاً تیره شبیه قیر شده و ۴ کیلو هم بی‌دلیل وزن کم کرده‌ام.',
          en: 'My stools look dark and tarry, and I lost 4kg unintentionally.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'g1',
        text: {
          fa: 'تحویل یک بسته ۱۴ عددی Nexium 20mg S3 و توصیه به مصرف روزانه.',
          en: 'Dispense a 14-day pack of Nexium 20mg S3.',
        },
        patientReply: {
          fa: 'آیا اس‌امپرازول مشکل گیر کردن غذا در گلو و مدفوع سیاهم را درمان می‌کند؟',
          en: 'Will Esomeprazole fix my difficulty swallowing and dark stools?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'g2',
        text: {
          fa: 'شناسایی پرچم قرمز بالینی: عدم فروش OTC و ارجاع فوری به GP جهت آندوسکوپی فوقانی (Gastroscopy): وجود Dysphagia (گیر کردن غذا)، Melena (مدفوع تیره) و کاهش وزن در سن بالای ۵۵ سال، پرچم‌های قرمز قطعی سرطانی یا خونریزی گوارشی هستند.',
          en: 'Red Flag Alert: Refuse OTC PPI & urgent GP referral for upper GI endoscopy (gastroscopy) due to Dysphagia, Melena, and unexplained weight loss in a 58yo patient.',
        },
        patientReply: {
          fa: 'خیلی ممنون از تشخیص دقیق! فوراً نزد پزشک عمومی می‌روم.',
          en: 'Thank you for spotting these alarming red flags. I will see my GP immediately.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'منع فروش OTC - ارجاع فوری به GP جهت آندوسکوپی فوقانی (Gastroscopy)',
        en: 'Do NOT Supply OTC PPI - Urgent GP Referral for Gastroscopy',
      },
      explanation: {
        fa: 'بروز Dysphagia (دشواری بلع)، Melena (مدفوع تیره قیری)، کاهش وزن ناخواسته و علائم جدید گوارشی در سن بالای ۵۵ سال، پرچم‌های قرمز خطرساز خونریزی گوارش یا زخم و بدخیمی مری/معده هستند و نیازمند آندوسکوپی فوری می‌باشند.',
        en: 'New-onset dyspepsia with dysphagia, melena, and weight loss in patients >55 are major GI red flags requiring urgent endoscopic evaluation.',
      },
      referralLetterTemplate: {
        to: 'Attending General Practitioner / Gastroenterologist',
        reason: 'Dyspepsia, Dysphagia, Melena & Unexplained Weight Loss',
        symptomSummary: '58yo male presenting with 6-week progressive heartburn, solid food dysphagia, dark tarry stools (melena), and 4kg weight loss.',
        currentMeds: 'Mylanta PRN',
        suggestedAction: 'Urgent medical assessment, full blood count (anemia check), and expedited upper GI endoscopy (gastroscopy).',
      },
    },
  },

  {
    id: 'sunburn-triage',
    title: {
      fa: '۱۲. آفتاب‌سوختگی شدید، تاول‌های وسیع و تب (Severe Sunburn & Systemic Toxicity)',
      en: '12. Severe Sunburn & Systemic Toxicity',
    },
    category: { fa: 'پوست و سوختگی (Dermatology)', en: 'Dermatology & Burns' },
    patientProfile: {
      name: 'Jessica Brown',
      age: 24,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار با آفتاب‌سوختگی بسیار شدید، تاول‌های وسیع و لرز پس از ساحل مراجعه کرده و اسپری بی‌حسی Solarcaine می‌خواهد.',
        en: 'Patient presents with severe painful sunburn and extensive blistering after a beach day requesting Solarcaine spray.',
      },
    },
    redFlags: [
      { fa: 'تاول‌های پوشاننده بیش از ۲۰٪ سطح بدن (BSA >20%)', en: 'Widespread blistering covering >20% body surface area' },
      { fa: 'علائم مسمومیت سیستمیک (تب بالای ۳۸.۵، لرز شدید، سرگیجه و دهیدراتاسیون)', en: 'Systemic toxicity (fever >38.5C, chills, dizziness & dehydration)' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'درمان آفتاب‌سوختگی برای چه کسی است؟', en: 'Who is the sunburn treatment for?' },
        answer: { fa: 'برای خودم است.', en: 'It is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - زمان مواجهه؟', en: 'H - Exposure timing?' },
        question: { fa: 'چند ساعت زیر آفتاب بوده‌اید؟', en: 'How long were you in the sun?' },
        answer: { fa: 'دیروز ۶ ساعت بدون ضدآفتاب در ساحل بودم.', en: 'Yesterday 6 hours at the beach without sunscreen.' },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'چه اقدامی انجام داده‌اید؟', en: 'What treatment have you applied?' },
        answer: { fa: 'دوش آب سرد گرفتم فایده نداشت.', en: 'Cold shower gave no relief.' },
      },
      {
        key: 'T',
        label: { fa: 'T - تاول و تب؟', en: 'T - Blisters & fever?' },
        question: { fa: 'آیا تاول یا تب دارید؟', en: 'Do you have blisters or fever?' },
        answer: {
          fa: 'تمام پشتم تاول‌های بزرگ زده، تب ۳۸.۸ دارم و شديداً می‌لرزم.',
          en: 'My whole back is covered in fluid blisters, fever 38.8C and severe chills.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 's1',
        text: {
          fa: 'تحویل اسپری Solarcaine و توصیه به ترکاندن تاول‌ها.',
          en: 'Dispense Solarcaine spray and advise popping blisters.',
        },
        patientReply: {
          fa: 'آیا اسپری بی‌حسی با وجود تب ۳۸.۸ و تاول‌های وسیع کافی است؟',
          en: 'Is a topical spray enough with 38.8C fever and extensive blisters?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 's2',
        text: {
          fa: 'شناسایی پرچم قرمز: منع فرآورده‌های بی‌حسی موضعی OTC؛ ارجاع فوری به اورژانس بیمارستان (ED) به دلیل مسمومیت سیستمیک آفتاب (Sun Poisoning)، تاول‌های وسیع (>۲۰٪ سطح بدن) و دهیدراتاسیون.',
          en: 'Red Flag Alert: Avoid OTC topical anesthetics. Immediate ED referral for IV rehydration and 2nd-degree burn care due to sun poisoning and >20% BSA blisters.',
        },
        patientReply: {
          fa: 'متشکرم. حالت تهوع و لرز شدیدی دارم و فوراً به اورژانس مراجعه می‌کنم.',
          en: 'Thank you. I feel shaky and nauseous, I will go to the Emergency Department right away.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'منع درمان OTC - ارجاع فوری به بخش اورژانس بیمارستان (ED Referral)',
        en: 'Refuse OTC Therapy - Urgent Emergency Department Referral',
      },
      explanation: {
        fa: 'تاول‌های وسيع سوختگی (>۲۰٪ سطح بدن) همراه با تب، لرز و دهیدراتاسیون نشان‌دهنده مسمومیت سیستمیک آفتاب (Sun Poisoning) و سوختگی درجه ۲ وسیع است که نیازمند سرم‌تراپی بیمارستانی است.',
        en: 'Extensive 2nd-degree sunburn blisters covering >20% BSA with systemic signs represent sun poisoning requiring fluid resuscitation and hospital burn care.',
      },
      referralLetterTemplate: {
        to: 'Emergency Department Medical Officer',
        reason: 'Extensive 2nd-Degree Sunburn (>20% BSA) with Systemic Toxicity',
        symptomSummary: '24yo female presenting with superficial partial-thickness burns with extensive fluid blisters across back (>20% BSA), fever 38.8C, rigors, and nausea.',
        currentMeds: 'None',
        suggestedAction: 'Urgent medical evaluation, IV rehydration, fluid electrolyte monitoring, sterile burn wound care, and systemic analgesia.',
      },
    },
  },

  {
    id: 'musculoskeletal-triage',
    title: {
      fa: '۱۳. پیچ‌خوردگی مچ پا، قانون Ottawa Ankle Rules و پروتکل RICER (Soft Tissue Injury)',
      en: '13. Ankle Injury: Ottawa Ankle Rules & RICER Protocol',
    },
    category: { fa: 'عضلانی و اسکلتی (Musculoskeletal)', en: 'Musculoskeletal & Pain' },
    patientProfile: {
      name: 'Liam Davis',
      age: 35,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار با پیچ‌خوردگی شدید مچ پا طی بسکتبال مراجعه کرده و قرص Panadol Osteo (Paracetamol MR 665mg S3) می‌خواهد.',
        en: 'Patient presents with an acute ankle sprain requesting Panadol Osteo (Paracetamol MR 665mg S3).',
      },
    },
    redFlags: [
      { fa: 'عدم توانایی در تحمل وزن یا عدم توانایی در برداشتن ۴ گام (Ottawa Ankle Rules Positive)', en: 'Inability to bear weight or walk 4 steps (Ottawa Ankle Rules positive)' },
      { fa: 'دفرمیتی استخوانی شدید یا بی‌حسی اندام', en: 'Deformity or bone tenderness' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'آسیب مچ پا برای چه کسی پیش آمده است؟', en: 'Who injured their ankle?' },
        answer: { fa: 'برای خودم است.', en: 'It is for myself.' },
      },
      {
        key: 'H',
        label: { fa: 'H - زمان و نحوه حادثه؟', en: 'H - Timing & mechanism?' },
        question: { fa: 'حادثه چه زمانی اتفاق افتاد؟', en: 'When did the injury happen?' },
        answer: { fa: '۳ ساعت پیش هنگام پریدن مچ پایم پیچ خورد و فوراً متورم شد.', en: '3 hours ago landing from a jump, swelled up immediately.' },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Actions taken?' },
        question: { fa: 'چه اقدامی انجام داده‌اید؟', en: 'What treatment have you applied?' },
        answer: { fa: 'پایم را داخل وان آب گرم گذاشتم اما تورمش خیلی بیشتر شد!', en: 'I put my foot in hot water, but swelling worsened!' },
      },
      {
        key: 'T',
        label: { fa: 'T - توانایی راه رفتن؟', en: 'T - Walking ability?' },
        question: { fa: 'آیا می‌توانید روی پا بایستید یا ۴ گام بردارید؟', en: 'Can you bear weight or walk 4 steps?' },
        answer: { fa: 'به هیچ وجه! اصلاً نمی‌توانم پایم را روی زمین بگذارم.', en: 'No way! Complete inability to bear weight.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'm1',
        text: {
          fa: 'تحویل Panadol Osteo و توصیه به ادامه گرم کردن مچ پا.',
          en: 'Dispense Panadol Osteo and advise hot compresses.',
        },
        patientReply: {
          fa: 'آیا آب گرم و قرص آرتروز بدون عکسبرداری مچ پا درست است؟',
          en: 'Is applying heat and taking osteoarthritis pills without an X-ray correct?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'm2',
        text: {
          fa: 'شناسایی پرچم قرمز: ارجاع فوری به GP جهت عکسبرداری X-Ray (قانون Ottawa Ankle Rules مثبت به دلیل عدم توانایی در تحمل وزن) + آموزش پروتکل RICER (Rest, Ice 20min/2h, Compression, Elevation, Referral) و پرهیز از عوامل HARM (No Heat, Alcohol, Running, Massage) + تمایز Paracetamol IR حاد در برابر Paracetamol MR (Panadol Osteo S3 مخصوص آرتروز).',
          en: 'Red Flag Alert: Immediate GP Referral for X-ray (Ottawa Ankle Rules positive due to inability to bear weight) + RICER Protocol + Avoid HARM (No Heat, Alcohol, Running, Massage) + Differentiate Paracetamol IR vs Paracetamol MR (Panadol Osteo S3 for Osteoarthritis).',
        },
        patientReply: {
          fa: 'بسیار ممنون! از گرم کردن پایم دست برمی‌دارم، کمپرس یخ می‌گذارم و فوراً برای عکسبرداری نزد پزشک می‌روم.',
          en: 'Thank you! I will stop applying heat, use an ice pack, and see the GP for an X-ray.',
        },
        isRedFlagDetector: true,
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'منع فروش OTC - ارجاع فوری به GP جهت رادیوگرافی (Ottawa Ankle Rules Positive)',
        en: 'Refuse OTC Supply - Urgent GP Referral for X-ray (Ottawa Ankle Rules)',
      },
      explanation: {
        fa: 'ناتوانی در تحمل وزن و برداشتن ۴ گام پس از آسیب مچ پا طبق Ottawa Ankle Rules نیازمند رادیوگرافی (X-ray) جهت رد شکستگی است. گرما در ۴۸ ساعت اول (Heat) تورم را بدتر می‌کند. Panadol Osteo S3 داروی مخصوص آرتروز است و برای آسیب حاد خط اول نیست.',
        en: 'Inability to bear weight triggers Ottawa Ankle Rules requiring X-ray to exclude fracture. Heat within 48 hours breaks HARM guidelines by worsening edema.',
      },
      referralLetterTemplate: {
        to: 'Attending General Practitioner / Emergency Officer',
        reason: 'Acute Ankle Injury - Inability to Bear Weight (Ottawa Ankle Rules Positive)',
        symptomSummary: '35yo male presenting with acute right ankle inversion injury 3 hours ago, localized malleolar tenderness, edema, and inability to bear weight or walk 4 steps.',
        currentMeds: 'None',
        suggestedAction: 'Urgent ankle radiography (X-ray) to exclude malleolar fracture, immobilization, acute pain management, and review.',
      },
    },
  },

  {
    id: 'diarrhea-triage',
    title: {
      fa: '۱۴. اسهال حاد کودکان، محلول Hydralyte ORS و منع لوپرامید (Acute Diarrhea & Hydralyte ORS)',
      en: '14. Pediatric Diarrhea: Hydralyte ORS & Loperamide Rules',
    },
    category: { fa: 'گوارش کودکان (Pediatric GI)', en: 'Pediatric GI & ORS' },
    patientProfile: {
      name: 'Emma Watson (Mother of Noah)',
      age: 32,
      gender: 'زن (Female)',
      presentation: {
        fa: 'مادر کودک ۳ ساله (Noah) با شکایت از اسهال آبکی مراجعه کرده و قرص لوپرامید (Gastro-Stop) می‌خواهد.',
        en: 'Mother requesting Loperamide (Gastro-Stop) for her 3yo child experiencing acute watery diarrhea.',
      },
    },
    redFlags: [
      { fa: 'خون یا مخاط در مدفوع (Melena / Dysentery)', en: 'Blood or mucus in stool' },
      { fa: 'دهیدراتاسیون شدید (خشکی دهان، عدم ادرار >۶ ساعت، بی‌حالی شدید) یا سن زیر ۲ سال', en: 'Severe dehydration (dry mouth, no wet nappies >6 hours, lethargy) or age <2yo' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و سن؟', en: 'W - Who is the patient & age?' },
        question: { fa: 'کودک شما چند سال دارد؟', en: 'How old is your child?' },
        answer: { fa: 'پسرم Noah ۳ ساله است.', en: 'My son Noah is 3 years old.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و تعداد دفعات؟', en: 'H - Duration & frequency?' },
        question: { fa: 'اسهال چند وقت است شروع شده؟', en: 'How long has diarrhea been present?' },
        answer: { fa: '۳۶ ساعت است شروع شده و امروز ۶ بار دفع آبکی داشته است.', en: '36 hours duration with 6 watery episodes today.' },
      },
      {
        key: 'A',
        label: { fa: 'A - مایعات مصرفی؟', en: 'A - Fluid intake?' },
        question: { fa: 'چه مایعاتی به او داده‌اید؟', en: 'What fluids have you given?' },
        answer: { fa: 'فقط آب شیر دادم و می‌خواستم لوپرامید بدهم.', en: 'Only plain tap water, and wanted Loperamide.' },
      },
      {
        key: 'T',
        label: { fa: 'T - ادرار و خون در مدفوع؟', en: 'T - Wet nappies & blood?' },
        question: { fa: 'آیا ادرار داشته یا خونی در مدفوع دیده‌اید؟', en: 'Has he produced wet nappies or blood in stool?' },
        answer: { fa: 'پوشکش خیس بوده و خونی در مدفوع نیست.', en: 'Has wet nappies, no blood in stool.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'd1',
        text: {
          fa: 'تحویل قرص Gastro-Stop (Loperamide) برای کودک ۳ ساله.',
          en: 'Dispense Loperamide (Gastro-Stop) for 3yo child.',
        },
        patientReply: {
          fa: 'آیا لوپرامید برای کودک ۳ ساله ایمن است؟',
          en: 'Is Loperamide safe for a 3-year-old toddler?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'd2',
        text: {
          fa: 'قدغن بودن لوپرامید: مصرف داروهای ضدتحرک مانند Loperamide در کودکان زیر ۶ سال شدیداً قدغن است (خطر فلج روده Toxic Megacolon و تضعیف تنفسی) + تجویز محلول هیپواسمولار بازجذب خوراکی (Hydralyte ORS) جهت جایگزینی آب و الکترولیت‌ها + ادامه تغذیه عادی و ارجاع به GP در صورت عدم بهبود.',
          en: 'Loperamide Contraindication: Anti-motility agents are strictly contraindicated in children under 6 years (risk of toxic megacolon & CNS depression) + Prescribe Oral Rehydration Salts (Hydralyte ORS) to replace fluid/electrolytes.',
        },
        patientReply: {
          fa: 'خیلی ممنون که جلوی مصرف لوپرامید را گرفتید! فوراً محلول Hydralyte ORS را آماده می‌کنم.',
          en: 'Thank you for stopping me from giving Loperamide to my toddler! I will start Hydralyte ORS sips immediately.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید پروتکل بازجذب Hydralyte ORS + منع قطعی لوپرامید در کودکان زیر ۶ سال',
        en: 'Approved Hydralyte ORS Protocol & Loperamide Contraindication Guidance',
      },
      explanation: {
        fa: 'داروهای ضداسهال anti-motility مانند لوپرامید در کودکان زیر ۶ سال به دلیل خطرات فلج روده (Toxic Megacolon) و تضعیف مرکز تنفسی کاملاً ممنوع هستند. درمان اصلی، جبران آب و الکترولیت‌ها با محلول هیپواسمولار ORS (Hydralyte) است.',
        en: 'Anti-motility drugs like Loperamide are strictly contraindicated in children under 6 due to risk of toxic megacolon and CNS depression. Standard management relies exclusively on Oral Rehydration Therapy (ORS).',
      },
    },
  },

  {
    id: 'heartburn-gord-triage',
    title: {
      fa: '۱۵. سوزش معده و رفلاکس (GORD)، آنتی‌اسید Mylanta در برابر PPI (Nexium 24HR / Somac) + قانون فاصله ۲ ساعته',
      en: '15. Heartburn & GORD: Mylanta vs PPI (Nexium 24HR / Somac) & 2-Hour Separation Rule',
    },
    category: { fa: 'دستگاه گوارش (Gastrointestinal & GORD)', en: 'Gastrointestinal & GORD' },
    patientProfile: {
      name: 'Michael Scott',
      age: 45,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار با شکایت از سوزش شدید پشت جناغ (Heartburn) و رفلاکس اسید پس از وعده‌های غذایی مراجعه کرده و می‌پرسد آیا شربت آنتی‌اسید Mylanta کافی است یا قرص Nexium 24HR (Esomeprazole 20mg S3) مصرف کند.',
        en: 'Patient presents with frequent retrosternal heartburn asking whether to continue antacid syrup (Mylanta) or start daily Esomeprazole 20mg (Nexium 24HR S3).',
      },
    },
    redFlags: [
      { fa: 'دشواری در بلع غذا (Dysphagia) یا احساس گیر کردن غذا در گلو', en: 'Difficulty swallowing (Dysphagia) or food impaction' },
      { fa: 'مدفوع تیره قیری (Melena)، تهوع/استفراغ خونی یا کاهش وزن ناخواسته', en: 'Melena (dark tarry stools), hematemesis or unexplained weight loss' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'داروی سوزش معده را برای چه کسی می‌خواهید؟', en: 'Who is the heartburn medication for?' },
        answer: { fa: 'برای خودم است، ۴۵ ساله هستم.', en: 'It is for myself, I am 45 years old.' },
      },
      {
        key: 'H',
        label: { fa: 'H - فراوانی و زمان بروز علائم؟', en: 'H - Frequency & timing?' },
        question: { fa: 'چند بار در هفته دچار سوزش معده می‌شوید و چه زمانی رخ می‌دهد؟', en: 'How many times a week do you get heartburn and when does it occur?' },
        answer: {
          fa: 'حدود ۴ بار در هفته، معمولاً نیم ساعت بعد از غذا یا هنگام دراز کشیدن در شب سوزش شدید دارم.',
          en: 'About 4 times a week, usually 30 minutes after heavy meals or lying down at night.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی و آنتی‌اسید؟', en: 'A - Actions taken & antacids?' },
        question: { fa: 'چه فرآورده‌ای تاکنون مصرف کرده‌اید؟', en: 'What remedies have you used so far?' },
        answer: {
          fa: 'شربت Mylanta می‌خورم؛ فوراً در ۱۰ دقیقه سوزش را آرام می‌کند اما پس از ۲ ساعت دوباره سوزش برمی‌گردد!',
          en: 'I take Mylanta syrup. It gives instant relief for 10 mins, but heartburn recurs after 2 hours.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - سایر داروها و قانون فاصله زمانی؟', en: 'T - Other medications & 2-hour rule?' },
        question: { fa: 'آیا داروهای تجویزی دیگری مانند مکمل آهن یا قرص فشار خون مصرف می‌کنید؟', en: 'Do you take other prescribed medicines like iron supplements or BP pills?' },
        answer: {
          fa: 'روزانه مکمل آهن (Ferrous Sulfate) و قرص فشار خون مصرف می‌کنم و می‌خواهم بدانم همزمان با Mylanta مشکلی ندارد؟',
          en: 'I take daily Ferrous Sulfate iron tablets and blood pressure medication.',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'hg1',
        text: {
          fa: 'توصیه به مصرف مداوم شربت Mylanta بدون محدودیت و بلعیدن قرص Nexium بلافاصله بعد از شام سنگین.',
          en: 'Advise continuous Mylanta syrup as sole treatment and tell patient to take Nexium immediately after a heavy dinner.',
        },
        patientReply: {
          fa: 'آیا خوردن Mylanta همزمان با مکمل آهن جذب آهن را مختل نمی‌کند؟ و آیا Nexium نباید قبل از صبحانه خورده شود؟',
          en: 'Doesn\'t taking Mylanta at the same time as iron block iron absorption? And shouldn\'t Nexium be taken before breakfast?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'hg2',
        text: {
          fa: 'تریاژ بالینی گوارش: ۱) تمایز تسکین سریع مقطعی (Mylanta antacid / Gastrogel) در برابر درمان اساسی روزانه (PPI Nexium 24HR / Somac 20mg): برای رفلاکس مکرر (>۲ بار در هفته)، دوره ۱۴ روزه PPI انتخاب اول است. ۲) زمان‌بندی صحیح مصرف PPI: کپسول Nexium 24HR (Esomeprazole 20mg) باید روزی ۱ عدد، ناشتا و ۳۰ تا ۶۰ دقیقه قبل از صبحانه با یک لیوان آب بلعیده شود تا پمپ‌های اسید فعال را مهار کند. ۳) قانون فاصله ۲ ساعته آنتی‌اسید (Mylanta 2-Hour Rule): شربت Mylanta به دلیل ترکیب آلومینیوم/منیزیم، جذب مکمل آهن و سایر داروها را کاهش می‌دهد؛ باید حداقل ۲ ساعت فاصله زمانی رعایت شود.',
          en: 'GI Clinical Triage: 1) Breakthrough Antacid Relief (Mylanta) vs Daily PPI Therapy (Nexium 24HR / Somac 20mg): For frequent GORD (>2 days/week), 14-day PPI course is 1st-line. 2) PPI Administration Timing: Take Esomeprazole 20mg once daily 30-60 minutes BEFORE breakfast on an empty stomach for maximum acid pump inhibition. 3) Mylanta 2-Hour Separation Rule: Antacids bind oral iron and prescribed drugs; enforce mandatory 2-hour gap between antacid and other oral medications.',
        },
        patientReply: {
          fa: 'بسیار سپاسگزارم! کپسول Nexium 24HR را ۳۰ دقیقه قبل از صبحانه می‌خورم و فاصله ۲ ساعته شربت Mylanta با قرص آخنم را دقیقاً رعایت می‌کنم.',
          en: 'Thank you! I will take Nexium 24HR 30-60 mins before breakfast and observe the 2-hour gap between Mylanta and my iron pills.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید پروتکل ۱۴ روزه Nexium 24HR (مصرف ۳۰-۶۰ دقیقه قبل صبحانه) + رعایت فاصله ۲ ساعته Mylanta از سایر داروها',
        en: 'Approved 14-Day Nexium 24HR PPI Regimen (30-60 Min Pre-Breakfast) & Mylanta 2-Hour Drug Separation Rule',
      },
      explanation: {
        fa: 'در رفلاکس مکرر (GORD)، آنتی‌اسیدهای مایع (Mylanta) فقط اثر لحظه‌ای دارند. مصرف داروی PPI (Esomeprazole 20mg) به مدت ۱۴ روز اسید معده را مهار می‌کند. برای بیشترین اثربخشی، PPI باید ۳۰ تا ۶۰ دقیقه قبل از اولین وعده غذایی (صبحانه) مصرف شود. آنتی‌اسیدهای حاوی کاتیون‌های فلزی (Mylanta) نباید همزمان با مکمل‌های آهن یا آنتی‌بیوتیک‌ها مصرف شوند (حداقل ۲ ساعت فاصله الزامی است).',
        en: 'Frequent heartburn (>2 days/week) warrants a 14-day OTC PPI course (Esomeprazole 20mg). PPIs must be ingested 30-60 minutes prior to breakfast for optimal proton pump inhibition. Multivalent antacids (Mylanta) require a strict 2-hour separation from oral iron to prevent chelation and malabsorption.',
      },
    },
  },

  {
    id: 'laxative-triage',
    title: {
      fa: '۱۶. تریاژ ملین‌ها (Laxative Triage): تمایز Metamucil (حجم‌دهنده)، Movicol (اسموتیک) و Coloxyl with Senna (محرک)',
      en: '16. Laxative Triage: Bulk-Forming (Metamucil) vs Osmotic (Movicol) vs Stimulant (Coloxyl)',
    },
    category: { fa: 'دستگاه گوارش و یبوست (GI & Laxatives)', en: 'GI & Laxative Protocol' },
    patientProfile: {
      name: 'Helen Miller',
      age: 62,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار ۶۲ ساله پس از جراحی تعویض مفصل ران و مصرف مسکن‌های مخدر (Endone / Oxycodone)، با یبوست شدید ۲ هفته‌ای مراجعه کرده و می‌پرسد کدام ملین (Metamucil، Movicol یا Coloxyl) مناسب است.',
        en: 'Post-hip surgery 62yo patient taking prescription opioid analgesics (Endone) presenting with 2-week opioid-induced constipation asking for the right laxative.',
      },
    },
    redFlags: [
      { fa: 'درد شدید و حاد شکمی، انسداد روده یا خونریزی روشن/تیره مقعدی', en: 'Severe acute abdominal pain, bowel obstruction or rectal bleeding' },
      { fa: 'کاهش وزن ناخواسته، استفراغ مداوم یا عدم دفع گاز و مدفوع بیش از ۵ روز', en: 'Unexplained weight loss, persistent vomiting or inability to pass gas/stool >5 days' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و علت یبوست؟', en: 'W - Patient & cause?' },
        question: { fa: 'آیا داروی جدیدی مانند مسکن‌های قوی مصرف می‌کنید؟', en: 'Are you taking new medications like strong pain relievers?' },
        answer: { fa: 'بله، قرص Endone (Oxycodone) برای درد جراحی ران مصرف می‌کنم.', en: 'Yes, Endone (Oxycodone) for post-surgical hip pain.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و شکل مدفوع؟', en: 'H - Duration & stool texture?' },
        question: { fa: 'چند وقت است دچار یبوست شده‌اید و مدفوع چه شکلی دارد؟', en: 'How long has constipation lasted and what is stool consistency?' },
        answer: {
          fa: 'حدود ۲ هفته است؛ مدفوع بسیار سفت، خشک و گلوله‌ای شده و دفع آن بسیار دردناک است.',
          en: 'For 2 weeks now. Stools are extremely hard, dry, and pellet-like.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - مصرف ملین قبلی و میزان آب؟', en: 'A - Previous laxatives & fluid intake?' },
        question: { fa: 'آیا فرآورده‌ای مانند پودر فیبر Metamucil مصرف کرده‌اید؟', en: 'Have you tried fiber powders like Metamucil?' },
        answer: {
          fa: 'پودر Metamucil خوردم اما چون آب کم خوردم دل‌درد شدید و باد شکم گرفتم!',
          en: 'I tried Metamucil powder, but I drank very little water and got severe bloating!',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم انسداد یا چرک؟', en: 'T - Obstruction signs?' },
        question: { fa: 'آیا تهوع شدید، تهوع یا خون در مدفوع دارید؟', en: 'Do you have vomiting, severe nausea, or blood in stool?' },
        answer: { fa: 'خیر، فقط فشار و سفت بودن مدفوع اذیتم می‌کند.', en: 'No blood or vomiting, just painful straining.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'lax1',
        text: {
          fa: 'توصیه به افزایش دوز پودر فیبر Metamucil بدون تاکید بر نوشیدن آب و مصرف طولانی‌مدت سنوتیک‌ها.',
          en: 'Advise doubling Metamucil fiber powder without emphasizing water intake, or long-term stimulant laxative use.',
        },
        patientReply: {
          fa: 'اما پودر Metamucil بدون آب زیاد باعث انسداد روده نمی‌شود؟',
          en: 'Doesn\'t taking fiber powder like Metamucil without plenty of water worsen intestinal blockage?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'lax2',
        text: {
          fa: 'آموزش بالینی و تمایز ۳ دسته اصلی ملین‌ها: ۱) ملین‌های حجم‌دهنده (Metamucil / Psyllium): نیازمند نوشیدن الزامی حداقل یک لیوان بزرگ آب (۲۵۰ml) همراه هر دوز هستند؛ در یبوست ناشی از اپیوئید یا بدون مصرف آب کافی کاملاً خطرناک بوده و باعث انسداد روده (Fecal Impaction) می‌شوند. ۲) ملین‌های اسموتیک (Movicol / OsmoLax / Polyethylene Glycol): کشنده آب به درون روده، انتخاب اول و ایمن برای یبوست ناشی از اپیوئیدها (Opioid-Induced Constipation) و مصرف طولانی‌مدت. ۳) ملین‌های محرک (Coloxyl with Senna / Dulcolax): تحریک مستقیم حرکات دودی روده؛ عالی برای تسکین سریع شبانه (شروع اثر ۸ تا ۱۲ ساعت)، اما نباید به مدت مداوم طولانی مصرف شوند تا باعث تنبلی روده نگردند. تجویز: ساشه Movicol روزی ۱ تا ۲ عدد همراه مصرف مایعات کافی.',
          en: 'Clinical Laxative Triage: 1) Bulk-Forming Laxatives (Metamucil/Psyllium): Require MANDATORY full glass of water (250mL) per dose; contraindicated in opioid-induced constipation without fluid intake due to risk of fecal impaction. 2) Osmotic Laxatives (Movicol/Polyethylene Glycol): Draws water into bowel, 1st-line safe choice for Opioid-Induced Constipation (OIC). 3) Stimulant Laxatives (Coloxyl with Senna/Docusate + Senna): Direct peristalsis stimulator, ideal for short-term fast overnight relief (8-12h onset); limit prolonged use to prevent bowel dependence. Recommend Movicol sashes.',
        },
        patientReply: {
          fa: 'بسیار متشکرم! ساشه Movicol را با حل کردن در یک لیوان آب مصرف می‌کنم و متوجه خطرات Metamucil بدون آب شدم.',
          en: 'Thank you so much! I will use Movicol sachets dissolved in water and now understand why Metamucil without water caused bloating.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید انتخاب ملین اسموتیک Movicol + آموزش الزامی مصرف آب فراوان و پرهیز از Metamucil بدون مایعات',
        en: 'Approved Osmotic Laxative Movicol Protocol & Fluid Counseling; Metamucil Bulk Fiber Guidance',
      },
      explanation: {
        fa: 'داروهای مسکن اپیوئیدی (Oxycodone) حرکات روده را کند کرده و آب مدفوع را جذب می‌کنند. فیبرهای حجم‌دهنده (Metamucil) بدون مصرف مایعات فراوان باعث انسداد روده (Fecal impaction) می‌شوند. ملین‌های اسموتیک (Movicol/Polyethylene Glycol) خط اول درمان یبوست ناشی از اپیوئیدها هستند. ملین‌های محرک (Coloxyl with Senna) برای مصرف کوتاه‌مدت مناسب می‌باشند.',
        en: 'Opioids slow intestinal transit and increase water absorption. Bulk-forming laxatives (Metamucil) without fluid intake exacerbate fecal impaction in opioid-induced constipation. Osmotic laxatives (Movicol) are 1st-line, pulling water back into the stool safely.',
      },
    },
  },

  {
    id: 'panadol-osteo-triage',
    title: {
      fa: '۱۷. درد آرتروز زانو: تمایز Paracetamol MR 665mg (Panadol Osteo S3) در برابر IR 500mg معمولی',
      en: '17. Osteoarthritis Pain: Paracetamol MR 665mg (Panadol Osteo S3) vs IR 500mg Dosing',
    },
    category: { fa: 'عضلانی و مسکن (Analgesia & Osteoarthritis)', en: 'Analgesia & Osteoarthritis' },
    patientProfile: {
      name: 'Arthur Pendelton',
      age: 68,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار ۶۸ ساله با درد مزمن آرتروز زانو (Knee Osteoarthritis) مراجعه کرده و تقاضای خرید قرص Panadol Osteo 665mg (Schedule 3 Pharmacist Only) دارد.',
        en: '68yo patient with persistent knee osteoarthritis pain requesting Schedule 3 Panadol Osteo 665mg (Paracetamol Modified Release).',
      },
    },
    redFlags: [
      { fa: 'مصرف همزمان سایر فرآورده‌های حاوی پاراستامول (خطر مسمومیت کبد Overdose!)', en: 'Concomitant paracetamol-containing cold/flu products (liver toxicity risk!)' },
      { fa: 'نارسایی شدید کبدی، مصرف الکل سنگین یا وزن زیر ۵۰ کیلوگرم', en: 'Severe hepatic impairment, heavy alcohol use or body weight <50kg' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و سن؟', en: 'W - Patient & age?' },
        question: { fa: 'قرص Panadol Osteo را برای چه کسی می‌خواهید؟', en: 'Who is the Panadol Osteo for?' },
        answer: { fa: 'برای خودم است، ۶۸ ساله هستم و آرتروز شدید زانو دارم.', en: 'For myself, I am 68 with knee osteoarthritis.' },
      },
      {
        key: 'H',
        label: { fa: 'H - الگوی درد و مصرف قبلی؟', en: 'H - Pain pattern & current use?' },
        question: { fa: 'درد زانوی شما چگونه است و قبلاً چه مسکنی مصرف می‌کردید؟', en: 'How is your knee pain and what painkillers have you been taking?' },
        answer: {
          fa: 'دردم مداوم است؛ قرص Panadol 500mg معمولی را هر ۴ ساعت می‌خوردم اما زرق و اثرش زود تمام می‌شد و فراموش می‌کردم.',
          en: 'Constant aching pain. I took standard Panadol 500mg every 4 hours, but relief wore off quickly and I forgot doses.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - نحوه بلع و خرد کردن قرص؟', en: 'A - Tablet swallowing & crushing?' },
        question: { fa: 'آیا قرص را کامل می‌بلعید یا آن را نصف و خرد می‌کنید؟', en: 'Do you swallow tablets whole or crush/halve them?' },
        answer: {
          fa: 'می‌خواستم بدانم اگر قرص Panadol Osteo را خرد کنم تا راحت‌تر ببلعم مشکلی دارد؟',
          en: 'I wanted to know if crushing Panadol Osteo tablets to swallow easier is fine?',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - چک سایر فرآورده‌های پاراستامول؟', en: 'T - Paracetamol check?' },
        question: { fa: 'آیا داروی سرماخوردگی یا مسکن دیگری همزمان مصرف می‌کنید؟', en: 'Are you taking any other cold/flu or pain medicines containing paracetamol?' },
        answer: { fa: 'خیر، هیچ داروی دیگری نمی‌خورم.', en: 'No, no other medicines.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'po1',
        text: {
          fa: 'تایید خرد کردن قرص Panadol Osteo 665mg و توصیه به مصرف آن هر ۴ ساعت مانند پاراستامول معمولی.',
          en: 'Approve crushing Panadol Osteo 665mg and advise taking it every 4 hours like standard paracetamol.',
        },
        patientReply: {
          fa: 'آیا خرد کردن قرص‌های پیوسته رهش باعث رهاسازی یکباره (Dose dumping) و مسمومیت نمی‌شود؟',
          en: 'Doesn\'t crushing modified-release tablets cause dose dumping and toxicity?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'po2',
        text: {
          fa: 'مشاوره دقیق داروساز برای داروی S3 Panadol Osteo (Paracetamol MR 665mg): ۱) تمایز فرمولاسیون فوری رهش (IR 500mg - شروع اثر سریع، طول اثر ۴-۶ ساعت، دوز ۲ قرص هر ۴ تا ۶ ساعت) در برابر فرمولاسیون آهسته‌رهش پیوسته (MR 665mg - دو لایه: یک لایه فوری + یک لایه آهسته‌رهش با طول اثر ۸ ساعت). ۲) دستور دوزینگ استاندارد Panadol Osteo: دقیقا ۲ قرص، ۳ بار در روز (هر ۸ ساعت یک‌بار - مثلاً ۷ صبح، ۳ بعدازظهر، ۱۱ شب). حداکثر دوز روزانه ۶ قرص = ۳۹۹۰mg. ۳) هشدار حیاتی منع خرد کردن: قرص‌های MR باید کاملاً سالم بلعیده شوند؛ خرد کردن یا جویدن ماتریس آهسته‌رهش را تخریب کرده و باعث آزادسازی ناگهانی (Dose Dumping) و خطر مسمومیت کبدی می‌شود.',
          en: 'S3 Pharmacist Counseling for Panadol Osteo (Paracetamol MR 665mg): 1) Differentiate IR Paracetamol (500mg: 4-6 hour duration) vs Modified-Release (665mg: dual-layer matrix providing sustained 8-hour relief). 2) Standard Dosing: 2 tablets THREE times daily (every 8 hours, e.g., 7am, 3pm, 11pm). Maximum daily dose = 6 tablets (3990mg/day). 3) DO NOT CRUSH WARNING: MR tablets must be swallowed whole; crushing or chewing destroys the modified-release matrix causing dose dumping and liver toxicity risks.',
        },
        patientReply: {
          fa: 'بسیار متشکرم! قرص‌ها را کاملاً سالم هر ۸ ساعت (روزی ۳ بار) می‌بلعم و هرگز آن‌ها را خرد نمی‌کنم.',
          en: 'Thank you very much! I will swallow 2 tablets whole every 8 hours (3 times daily) and never crush them.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید تحویل S3 Panadol Osteo 665mg (دوز ۲ قرص هر ۸ ساعت - روزی ۳ بار) + منع قطعی خرد کردن قرص',
        en: 'Approved S3 Panadol Osteo 665mg Supply (2 Tabs TID Every 8 Hours) & Do Not Crush Counseling',
      },
      explanation: {
        fa: 'فرمولاسیون Paracetamol MR 665mg (Panadol Osteo S3) مخصوص دردهای مزمن مانند آرتروز است. فاصله دوزینگ آن هر ۸ ساعت (روزی ۳ بار، حداکثر ۶ قرص = ۳۹۹۰mg) است. به دلیل ساختار ماتریسی پیوسته رهش، قرص‌ها باید کاملاً سالم بلعیده شوند و خرد کردن آن‌ها موجب دوز دامپینگ و مسمومیت کبد می‌گردد.',
        en: 'Paracetamol MR 665mg (Panadol Osteo S3) features a dual-layer matrix providing 8-hour sustained pain relief for osteoarthritis. Dosing is 2 tablets TID (every 8 hours, max 3990mg/day). Tablets must be swallowed whole to preserve the modified-release profile.',
      },
    },
  },

  {
    id: 'ankle-ricer-protocol',
    title: {
      fa: '۱۸. آسیب بافت نرم مچ پا: پروتکل RICER (Rest, Ice, Compression, Elevation, Referral) و ایمنی NSAID',
      en: '18. Soft Tissue Ankle Injury: RICER Protocol & NSAID Timing in Acute Phase',
    },
    category: { fa: 'عضلانی و اسکلتی (Musculoskeletal & RICER)', en: 'Musculoskeletal & RICER' },
    patientProfile: {
      name: 'Daniel Cooper',
      age: 28,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'ورزشکار ۲۸ ساله که ۴ ساعت پیش طی مسابقه فوتبال مچ پایش پیچ خورده، با تورم و درد مراجعه کرده و درخواست کیسه آب گرم و قرص قوی ایبوپروفن دارد.',
        en: '28yo athlete presenting 4 hours after an acute ankle inversion injury during soccer with swelling, requesting a hot pack and high-dose ibuprofen.',
      },
    },
    redFlags: [
      { fa: 'عدم توانایی در تحمل وزن یا عدم توانایی در برداشتن ۴ گام (Ottawa Ankle Rules Positive)', en: 'Inability to bear weight or walk 4 steps (Ottawa Ankle Rules Positive)' },
      { fa: 'دفرمیتی استخوانی شدید، زخم باز یا بی‌حسی در انگشتان پا', en: 'Visible bone deformity, open wound or distal numbness' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و نوع ورزش؟', en: 'W - Patient & activity?' },
        question: { fa: 'حادثه چگونه اتفاق افتاد؟', en: 'How did the injury occur?' },
        answer: { fa: 'هنگام پریدن برای سر زدن در فوتبال، مچ پای راستم به سمت داخل پیچ خورد.', en: 'Landed awkwardly on my right ankle during soccer.' },
      },
      {
        key: 'H',
        label: { fa: 'H - زمان حادثه و توانایی راه رفتن؟', en: 'H - Onset timing & walking ability?' },
        question: { fa: 'چند ساعت گذشته و آیا می‌توانید روی پایتان ۴ گام بردارید؟', en: 'How many hours ago and can you walk 4 steps on it?' },
        answer: {
          fa: '۴ ساعت پیش افتاد؛ با کمی لنگیدن می‌توانم ۴ گام بردارم اما متورم و داغ است.',
          en: '4 hours ago. I can limp and take 4 steps, but it is swollen and warm.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی و گرم کردن؟', en: 'A - Actions taken & heat?' },
        question: { fa: 'آیا تا الان پای خود را گرم کرده‌اید یا ماساژ داده‌اید؟', en: 'Have you applied heat or massaged the ankle?' },
        answer: {
          fa: 'می‌خواستم کیسه آب گرم بگذارم و ماساژ محکم بدهم تا گرفتگی باز شود!',
          en: 'I wanted to put a hot water bottle and massage it firmly to release tension!',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - بررسی حساسیت و آسم؟', en: 'T - Asthma & allergy check?' },
        question: { fa: 'آیا سابقه آسم یا زخم معده دارید؟', en: 'Do you have a history of asthma or stomach ulcers?' },
        answer: { fa: 'خیر، هیچ سابقه بیماری ندارم.', en: 'No medical history.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'ricer1',
        text: {
          fa: 'تایید گذاشتن کیسه آب گرم و ماساژ محکم مچ پا به همراه تجویز دوز بالای NSAID خوراکی در ساعت اول.',
          en: 'Approve hot water pack, deep tissue massage, and immediate high-dose oral NSAIDs.',
        },
        patientReply: {
          fa: 'آیا گرما و ماساژ در ۴۸ ساعت اول باعث خونریزی بیشتر و افزایش تورم نمی‌شود؟',
          en: 'Doesn\'t heat and massage in the first 48 hours increase internal bleeding and edema?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'ricer2',
        text: {
          fa: 'آموزش کامل پروتکل بالینی RICER و پرهیز از HARM: ۱) پروتکل ۵ مرحله‌ای RICER: R = Rest (استراحت و عدم اعمال وزن سنگین)، I = Ice (کمپرس یخ ۲۰ دقیقه هر ۲ ساعت برای ۴۸ ساعت اول)، C = Compression (بانداژ کشی محکم اما بدون قطع گردش خون)، E = Elevation (بالا نگه داشتن پا بالاتر از سطح قلب)، R = Referral (ارجاع به فیزیوتراپی/پزشک در صورت عدم بهبود). ۲) پرهیز اکید از عوامل HARM در ۴۸ ساعت اول: H = Heat (گرما خونرسانی و تورم را تشدید می‌کند)، A = Alcohol (الکل)، R = Running (دویدن)، M = Massage (ماساژ بافت آسیب‌دیده را تخریب می‌کند). ۳) مدیریت دارویی: شروع Paracetamol یا ژل موضعی Voltaren؛ پرهیز از NSAID خوراکی سنگین در ۲۴ ساعت اول اگر احتمال خونریزی حاد بافتی وجود دارد.',
          en: 'Comprehensive RICER Protocol & Anti-HARM Counseling: 1) RICER Protocol: R = Rest (unweight joint), I = Ice (apply ice pack for 20 mins every 2 hours for 48 hours), C = Compression (supportive elastic bandage), E = Elevation (elevate above heart level), R = Referral (refer to physio/GP if no response). 2) Avoid HARM Factors for 48 Hours: No Heat, No Alcohol, No Running, No Massage (heat/massage exacerbate acute tissue edema and hematoma). 3) Pharmacotherapy: Paracetamol IR/topical Voltaren emulgel initial choice.',
        },
        patientReply: {
          fa: 'خیلی ممنون از توضیحات عالی! کیسه آب گرم را کنار می‌گذارم، کمپرس یخ ۲۰ دقیقه‌ای می‌گذارم، پا را بالا نگه می‌دارم و از ماساژ دادن پرهیز می‌کنم.',
          en: 'Thank you! I will avoid heat and massage, apply ice packs for 20 minutes, elevate my leg, and use compression.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید اجرای پروتکل RICER + آموزش پرهیز از عوامل HARM (گرما، الکل، دویدن، ماساژ) در ۴۸ ساعت اول',
        en: 'Approved RICER Protocol & Anti-HARM Guidelines (No Heat, Alcohol, Running, Massage for 48 Hours)',
      },
      explanation: {
        fa: 'در آسیب‌های حاد بافت نرم (Soft tissue sprain)، اعمال گرما (Heat) و ماساژ در ۴۸ ساعت اول باعث گشاد شدن عروق، افزایش خونریزی بافتی (Hematoma) و تورم شدیدتر می‌شود. پروتکل RICER (استراحت، یخ، فشار، بالا نگه‌داشتن و ارجاع) استاندارد طلایی درمان اولیه است.',
        en: 'In acute soft tissue trauma, applying heat or massaging within the first 48 hours breaches HARM principles by dilating vessels and aggravating tissue hematoma and edema. Management requires strict adherence to the RICER protocol.',
      },
    },
  },

  {
    id: 'nsaid-safety-check',
    title: {
      fa: '۱۹. غربالگری ایمنی NSAIDها: آسم، زخم معده، کلیوی و تداخل Spironolactone با Meloxicam / Nurofen',
      en: '19. NSAID Safety Screening: Asthma, Peptic Ulcers, Renal Impairment & Spironolactone Interaction',
    },
    category: { fa: 'مسکن و ایمنی دارو (Analgesia & NSAID Safety)', en: 'Analgesia & NSAID Safety' },
    patientProfile: {
      name: 'Margaret Vance',
      age: 64,
      gender: 'زن (Female)',
      presentation: {
        fa: 'بیمار ۶۴ ساله با کمردرد حاد مراجعه کرده و خواستار خرید مسکن قوی Nurofen (Ibuprofen 400mg) یا Meloxicam است.',
        en: '64yo patient with acute lower back pain requesting strong OTC oral NSAIDs (Nurofen 400mg / Meloxicam).',
      },
    },
    redFlags: [
      { fa: 'سابقه زخم یا خونریزی گوارشی (Peptic Ulcer / GI Bleed)', en: 'History of peptic ulcer disease or GI bleeding' },
      { fa: 'نارسایی کلیوی، حملات آسم با آسپیرین یا مصرف همزمان Triple Whammy (ACEi + Diuretic + NSAID)', en: 'Renal impairment, Aspirin-sensitive asthma, or Triple Whammy drug interaction' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و سوابق؟', en: 'W - Patient & medical history?' },
        question: { fa: 'آیا سابقه بیماری‌های کلیوی، قلبی یا آسم دارید؟', en: 'Do you have any kidney, heart failure, or asthma history?' },
        answer: {
          fa: 'بله، من نارسایی خفیف کلیه و نارسایی قلبی دارم و داروی تجویزی مصرف می‌کنم.',
          en: 'Yes, I have mild renal impairment and heart failure.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و شدت کمردرد؟', en: 'H - Back pain duration?' },
        question: { fa: 'کمردرد شما از چه زمانی شروع شده است؟', en: 'When did the back pain start?' },
        answer: { fa: 'از ۲ روز پیش هنگام بلند کردن جعبه سنگین شروع شد.', en: '2 days ago after lifting a heavy box.' },
      },
      {
        key: 'A',
        label: { fa: 'A - مسکن‌های مصرفی؟', en: 'A - Painkillers tried?' },
        question: { fa: 'چه دارویی استفاده کرده‌اید؟', en: 'What pain relievers have you used?' },
        answer: { fa: 'فقط یک قرص پاراستامول خوردم که کم بود.', en: 'Took one Paracetamol tablet with partial relief.' },
      },
      {
        key: 'T',
        label: { fa: 'T - لیست دقیق داروها (TRIPLE WHAMMY)?', en: 'T - Full medication list?' },
        question: { fa: 'دقیقاً چه داروهای تجویزی روزانه مصرف می‌کنید؟', en: 'What exact daily prescription medications do you take?' },
        answer: {
          fa: 'روزانه قرص Ramipril (داروی ACEi) و قرص Spironolactone (دیورتیک نگه‌دارنده پتاسیم) مصرف می‌کنم.',
          en: 'I take daily Ramipril (ACE inhibitor) and Spironolactone (potassium-sparing diuretic).',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'ns1',
        text: {
          fa: 'تحویل قرص Ibuprofen 400mg بدون توجه به مصرف Spironolactone و Ramipril.',
          en: 'Dispense Ibuprofen 400mg without screening for Spironolactone and Ramipril interaction.',
        },
        patientReply: {
          fa: 'آیا ترکیب ایبوپروفن با رمپریل و اسپیرونولاکتون باعث آسیب حاد کلیه و بالا رفتن پتاسیم نمی‌شود؟',
          en: 'Doesn\'t combining ibuprofen with Ramipril and Spironolactone cause acute kidney injury and hyperkalemia?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'ns2',
        text: {
          fa: 'ارزیابی جامع ایمنی NSAIDها و منع مصرف به دلیل تداخل خطرساز Triple Whammy: ۱) غربالگری ۴ گانه NSAIDها: الف) سابقه آسم ناشی از آسپیرین (Aspirin-Exacerbated Respiratory Disease)، ب) زخم و خونریزی گوارشی، ج) نارسایی کلیوی و قلبی (NSAIDها باعث احتباس آب و سدیم می‌شوند)، د) تداخلات دارویی. ۲) تداخل خطرساز Triple Whammy: ترکیب همزمان ۱. داروی ضد فشار خون ACEi/ARB (Ramipril) + ۲. داروی مدر/دیورتیک (Spironolactone) + ۳. داروی ضدالتهاب NSAID (Ibuprofen/Meloxicam) باعث افت شدید خونرسانی گلومرولی، نارسایی حاد کلیه (Acute Kidney Injury) و هایپرکالمی شدید (Hyperkalemia) می‌شود! ۳) جایگزین ایمن: منع کامل NSAID خوراکی؛ پیشنهاد Paracetamol MR (Panadol Osteo) + ژل موضعی Voltaren Emulgel (که جذب سیستمیک کلیوی بسیار ناچیزی دارد).',
          en: 'NSAID Safety Screening & Triple Whammy Contraindication: 1) 4-Point NSAID Screen: Asthma sensitivity, Peptic Ulcer Disease, Renal/Heart Failure (NSAIDs cause sodium/water retention), Drug Interactions. 2) Triple Whammy Alert: Concomitant ACEi/ARB (Ramipril) + Diuretic (Spironolactone) + NSAID (Ibuprofen) severely reduces glomerular filtration, precipitating Acute Kidney Injury (AKI) and life-threatening Hyperkalemia. 3) Safe Alternative: Absolute contraindication for oral NSAID; recommend Paracetamol MR (Panadol Osteo) + topical Voltaren Emulgel.',
        },
        patientReply: {
          fa: 'بسیار ممنون داروساز هوشمند! از خطر بزرگ آسیب کلیوی آگاه شدم و به جای ایبوپروفن از ژل موضعی ولتارن و پاراستامول استفاده می‌کنم.',
          en: 'Thank you so much! I was completely unaware of the Triple Whammy kidney risk and will safely use topical Voltaren gel and Paracetamol instead.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'منع مطلق NSAID خوراکی به دلیل تداخل Triple Whammy (Ramipril + Spironolactone + NSAID) + جایگزینی با ژل موضعی Voltaren و Paracetamol',
        en: 'Oral NSAID Contraindicated due to Triple Whammy Interaction (ACEi + Diuretic + NSAID); Switch to Topical Voltaren & Paracetamol',
      },
      explanation: {
        fa: 'مصرف همزمان داروهای NSAID با داروهای ACE Inhibitor (Ramipril) و دیورتیک‌ها (Spironolactone) تحت عنوان Triple Whammy شناخته می‌شود. این ترکیب با تنگ کردن آرتریول آفرانت و گشاد کردن آرتریول افانت کلیه، فشار هیدرواستاتیک گلومرول را تخریب کرده و منجر به نارسایی حاد کلیوی (AKI) و هایپرکالمی کشنده می‌شود.',
        en: 'The "Triple Whammy" combination (ACEi/ARB + Diuretic + NSAID) constricts afferent renal arterioles and dilates efferent arterioles, destroying renal autoregulation and inducing acute renal failure and severe hyperkalemia. Oral NSAIDs are strictly contraindicated.',
      },
    },
  },

  {
    id: 'smoking-cessation-5as',
    title: {
      fa: '۲۰. مشاوره ترک سیگار با چارچوب 5A\'s، ارزیابی وابستگی نیکوتین و درمان ترکیبی NRT',
      en: '20. Smoking Cessation Consultation: 5A\'s Framework, Nicotine Dependence & Combination NRT Protocol',
    },
    category: { fa: 'سلامت و ترک سیگار (Smoking Cessation & 5A\'s)', en: 'Smoking Cessation & 5A\'s' },
    patientProfile: {
      name: 'James Wilson',
      age: 42,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'بیمار ۴۲ ساله با سابقه ۱۵ سال سیگار کشیدن (روزی ۲۰ نخ) مراجعه کرده و می‌خواهد سیگار را ترک کند و درباره جایگزین‌های نیکوتین (NRT Patches, Gums, Inhaler) مشاوره می‌خواهد.',
        en: '42yo smoker of 20 cigarettes/day for 15 years presenting requesting assistance and advice on Nicotine Replacement Therapy (NRT).',
      },
    },
    redFlags: [
      { fa: 'حمله قلبی اخیر (MI در ۲ هفته گذشته)، آریتمی شدید یا آنژین ناپایدار (نیازمند احتیاط در NRT و نظر پزشک)', en: 'Recent Myocardial Infarction (<2 weeks), severe arrhythmia or unstable angina' },
      { fa: 'بارداری یا شیردهی (نیازمند مشاوره ترجیحی NRT سریع‌الاثر غیرپیوسته)', en: 'Pregnancy or breastfeeding (prefer intermittent oral NRT under medical supervision)' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و تعداد سیگار؟', en: 'W - Patient & cigarette count?' },
        question: { fa: 'روزانه چند نخ سیگار می‌کشید و چند سال است سیگاری هستید؟', en: 'How many cigarettes do you smoke daily and for how long?' },
        answer: { fa: 'روزانه ۲۰ نخ سیگار (۱ پاکت کامل) می‌کشم و ۱۵ سال است سیگاری هستم.', en: '20 cigarettes daily (1 full pack) for 15 years.' },
      },
      {
        key: 'H',
        label: { fa: 'H - ارزیابی وابستگی (زمان اولین سیگار)?', en: 'H - Nicotine dependence (1st cigarette time)?' },
        question: { fa: 'چند دقیقه پس از بیدار شدن در صبح اولین سیگار را روشن می‌کنید؟', en: 'How many minutes after waking do you smoke your first cigarette?' },
        answer: {
          fa: 'کمتر از ۵ دقیقه پس از بیدار شدن! حتی شب‌ها هم با وسوسه نیکوتین از خواب بیدار می‌شوم.',
          en: 'Within 5 minutes of waking up! I even wake up at night with intense cravings.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - تجربیات قبلی ترک؟', en: 'A - Previous quit attempts?' },
        question: { fa: 'آیا قبلاً سابقه اقدام به ترک داشته‌اید؟', en: 'Have you attempted to quit previously?' },
        answer: {
          fa: 'یک‌بار یک‌باره (Cold turkey) قطع کردم اما دچار بیخوابی، بی‌قراری شدید و اضطراب شدم و شکست خوردم.',
          en: 'I tried cold turkey once, but suffered severe withdrawal insomnia, irritability, and relapsed.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - بیماری قلبی عروقی حاد؟', en: 'T - Recent CV events?' },
        question: { fa: 'آیا سابقه سکته قلبی در ۲ هفته اخیر داشته‌اید؟', en: 'Any recent heart attack or unstable angina in the past 2 weeks?' },
        answer: { fa: 'خیر، هیچ مشکل قلبی ندارم.', en: 'No heart issues.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'sc1',
        text: {
          fa: 'توصیه به استفاده از آدامس نیکوتین کم‌دوز ۲mg به تنهایی و جویدن آن مانند آدامس معمولی خوراکی.',
          en: 'Recommend low-dose 2mg Nicotine Gum monotherapy and advise chewing it continuously like regular bubblegum.',
        },
        patientReply: {
          fa: 'آیا جویدن مداوم آدامس نیکوتین باعث سوزش معده و دل‌درد نمی‌شود؟ و آیا دوز تک‌دارویی ۲mg برای فردی که ۲۰ نخ سیگار می‌کشد کافی است؟',
          en: 'Doesn\'t chewing nicotine gum continuously cause hiccups and stomach upset? And is 2mg monotherapy enough for a 20-cig/day smoker?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'sc2',
        text: {
          fa: 'اجرای کامل پروتکل ۵ مرحله‌ای 5A\'s و مشاوره درمان ترکیبی NRT: ۱) پروتکل 5A\'s: Ask (پرسش سابقه)، Advise (توصیه قاطع به ترک)، Assess (ارزیابی آمادگی و میزان وابستگی)، Assist (کمک و تجویز NRT)، Arrange (تنظیم پیگیری و تماس با Quitline 13 78 48). ۲) تشخیص وابستگی شدید: کشیدن سیگار ظرف ۵ دقیقه پس از بیداری نشان‌دهنده وابستگی بالا (High Nicotine Dependence) است. ۳) درمان ترکیبی NRT (Combination NRT Protocol): استفاده همزمان از پچ پوستی ۲۴ ساعته (Nicorette Step 1 21mg/24h یا 15mg/16h) برای تامین سطح پایه نیکوتین + فرآورده سریع‌الاثر خوراکی (آدامس نیکوتین 4mg یا اسپری/استنشاقی) برای کنترل وسوسه‌های ناگهانی (Breakthrough Cravings). ۴) تکنیک صحیح مصرف آدامس نیکوتین (Chew and Park Technique): جویدن آرام تا احساس طعم تند/سوزش، سپس پارک کردن آدامس بین دیواره گونه و لثه به مدت ۱ دقیقه جهت جذب مخاطی؛ جویدن مداوم و بلعیدن نیکوتین باعث دل‌درد، سکسکه و سوزش معده می‌شود.',
          en: 'Comprehensive 5A\'s Smoking Cessation & Combination NRT Protocol: 1) 5A\'s Framework: Ask, Advise, Assess, Assist, Arrange (refer to Quitline 13 78 48). 2) Dependence Stratification: First cigarette <5 minutes post-waking confirms High Nicotine Dependence. 3) Combination NRT Protocol: Combine 24-Hour Transdermal Patch (Nicorette Step 1 21mg/24h) for baseline nicotine levels PLUS Fast-Acting Oral NRT (Nicotine Gum 4mg or Inhaler/Mouth Spray) for acute breakthrough cravings. 4) Correct "Chew and Park" Gum Technique: Chew slowly until peppery taste/tingle, then park between cheek and gum for 1 minute for transmucosal absorption; continuous chewing causes nicotine swallowing, hiccups, and dyspepsia.',
        },
        patientReply: {
          fa: 'بسیار سپاسگزارم! پچ ۲۴ ساعته نیکوتین را همراه آدامس ۴mg با تکنیک درست "جویدن و پارک کردن" استفاده می‌کنم و با شماره Quitline تماس می‌گیرم.',
          en: 'Thank you so much! I will combine the 24-hour patch with 4mg gum using the correct "chew and park" technique and call Quitline.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید پروتکل درمان ترکیبی NRT (پچ پوستی ۲۴ ساعته Step 1 + آدامس/استنشاقی سریع‌الاثر) + آموزش تکنیک Chew & Park و ارجاع به Quitline',
        en: 'Approved Combination NRT Protocol (24h Step 1 Patch + Fast-Acting Oral NRT) & Chew & Park Technique Counseling',
      },
      explanation: {
        fa: 'در افراد با وابستگی شدید به نیکوتین (مصرف سیگار ظرف ۵ دقیقه پس از بیدار شدن / بیش از ۲۰ نخ در روز)، تک‌درمانی با NRT نرخ شکست بالایی دارد. پروتکل استاندارد، درمان ترکیبی (Combination NRT) شامل پچ پوستی ۲۴ ساعته برای دوز پایه + فرآورده سریع‌الاثر (آدامس ۴mg یا اسپری) برای هوس‌های ناگهانی است. آموزش تکنیک "جویدن و پارک کردن" برای جذب درست از مخاط دهان الزامی است.',
        en: 'High nicotine dependence (1st cigarette <5 mins post-waking) requires Combination NRT (24-hour transdermal patch for basal levels plus fast-acting oral NRT for acute cravings) according to Australian RACGP guidelines. The "chew and park" technique avoids nicotine swallowing and dyspepsia.',
      },
    },
  },

  // ==========================================
  // TIER 3: MODE C - CHALLENGING & CONFLICT SCENARIOS
  // ==========================================
  {
    id: 's3-pseudoephedrine-conflict',
    mode: 'MODE_C_CONFLICT',
    title: {
      fa: 'C1. الزام قانونی استعلام هویت سودوافدرین و تنش با مشتری (Pseudoephedrine S3 ID Check & Project Stop)',
      en: 'C1. Pseudoephedrine S3 ID Check & Project Stop Frustration',
    },
    category: { fa: 'قوانین S3 و مدیریت تعارض (S3 Legal & Project Stop)', en: 'S3 Compliance & Conflict De-escalation' },
    patientProfile: {
      name: 'Brett Henderson',
      age: 44,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'من همیشه از اینجا قرص Sudafed 60mg می‌خرم! چرا امروز گواهینامه رانندگی من را می‌خواهی و آدرسم را توی کامپیوتر ثبت می‌کنی؟ من خلافکار یا تولیدکننده مواد نیستم (I am not a criminal)! همین یک جعبه را بده برم!',
        en: "I always buy Sudafed 60mg here! Why are you asking for my driver's licence and logging my address today? I am not a criminal! Just give me the box!",
      },
    },
    redFlags: [
      { fa: 'فشار خون کنترل‌نشده، بیماری ایسکمیک قلبی حاد، هایپرتیروئیدیسم یا مصرف مهارکننده‌های MAO در ۱۴ روز اخیر (منع مطلق سمپاتومیمتیک‌های خوراکی)', en: 'Uncontrolled hypertension, severe coronary artery disease, MAOI use within 14 days' },
      { fa: 'علائم مشکوک به انحراف دارویی (Diversion): امتناع پرخاشگرانه از ارائه کارت شناسایی، خریدهای مکرر از داروخانه‌های مختلف در سامانه Project Stop', en: 'Suspicious diversion pattern: aggressive refusal of photo ID or rapid multi-pharmacy purchasing' },
      { fa: 'تحویل داروی S3 صرفاً توسط داروساز واجد شرایط با احراز هویت و ارزیابی درمانی الزامی است.', en: 'S3 Pharmacist-Only supply requires personal therapeutic assessment by a registered pharmacist.' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار کیست؟', en: 'W - Who is the patient?' },
        question: { fa: 'قرص سودوافدرین را برای چه کسی می‌خواهید؟', en: 'Who is the Sudafed 60mg intended for?' },
        answer: { fa: 'برای خودم است؛ احتقان و گرفتگی شدید سینوسی به خاطر سرماخوردگی اخیر دارم.', en: 'For myself. Got bad sinus congestion from a head cold.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت گرفتگی و علائم؟', en: 'H - Duration & symptoms?' },
        question: { fa: 'چند روز است گرفتگی دارید؟', en: 'How long have you had the sinus pressure?' },
        answer: { fa: 'حدود ۳ روز است.', en: 'About 3 days.' },
      },
      {
        key: 'A',
        label: { fa: 'A - داروهای امتحان شده؟', en: 'A - Actions & previous meds?' },
        question: { fa: 'آیا داروی دیگری استفاده کرده‌اید؟', en: 'Have you used any saline flushes or oral analgesics?' },
        answer: { fa: 'اسپری نرمال سالین زدم اما کامل باز نشد؛ به همین خاطر سودوافدرین ۶۰ میلی‌گرم می‌خواهم.', en: 'Used saline spray but need stronger oral decongestant.' },
      },
      {
        key: 'T',
        label: { fa: 'T - فشار خون، قلبی و احراز هویت؟', en: 'T - Cardiovascular history & ID check?' },
        question: { fa: 'آیا فشار خون بالا، مشکل قلبی یا تیروئید دارید؟', en: 'Do you have high blood pressure, heart disease, or thyroid issues?' },
        answer: { fa: 'خیر، فشار خونم کاملاً نرمال است و بیماری قلبی ندارم.', en: 'No high blood pressure, heart is healthy.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'ps1',
        text: {
          fa: 'ترسیدن از پرخاش بیمار و تحویل فوری Sudafed 60mg بدون ثبت کارت شناسایی در سامانه Project Stop.',
          en: 'Yield to patient aggression and hand over Sudafed 60mg without recording photo ID in Project Stop.',
        },
        patientReply: {
          fa: 'آیا نقض قانون فدرال استرالیا و واگذاری سودوافدرین بدون ثبت Project Stop تخلف انتظامی سنگین نیست؟',
          en: 'Isn\'t dispensing S3 pseudoephedrine without Project Stop recording an illegal breach of pharmacy regulations?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'ps2',
        text: {
          fa: 'آرام‌سازی محترمانه تنش (De-escalation)، توضیح الزام قانونی ملی و تکمیل ارزیابی درمانی: ۱) همدلی و حفظ آرامش: «کاملاً درک می‌کنم که ثبت مدارک ممکن است ناخوشایند به نظر برسد و اصلاً قصد جسارت به شما را ندارم.» ۲) توضیح قانون استرالیا (Project Stop): «طبق قوانین ملی و ایالتی استرالیا، سودوافدرین در طبقه Pharmacist-Only (S3) قرار دارد و داروسازان قانوناً موظفند کارت شناسایی عکس‌دار معتبر را در سامانه آنلاین ملی Project Stop ثبت نمایند تا از خریدهای انبوه و سوءاستفاده غیرقانونی پیشگیری شود؛ اطلاعات شما کاملاً محرمانه در سیستم سلامت حفظ می‌شود.» ۳) ارزیابی بالینی ایمنی: بررسی فشار خون و رد بیماری‌های ایسکمیک قلبی. ۴) تکمیل تحویل استاندارد: ثبت شناسه گواهینامه در Project Stop، تحویل حداکثر ۱ جعبه Sudafed 60mg (حداکثر ۷۲۰mg سودوافدرین مجاز) با توصیه به عدم مصرف در ساعات پایانی شب جهت جلوگیری از بی‌خوابی.',
          en: 'Professional De-escalation, Legal Compliance & Therapeutic Assessment Protocol: 1) Empathetic De-escalation: "I completely understand this feels frustrating, and I assure you we do not consider you a criminal in any way." 2) Australian Statutory Mandate (Project Stop): "Under Australian Federal and State legislation, pseudoephedrine is an S3 Pharmacist-Only substance. Pharmacists are legally mandated to verify a valid photo ID (e.g. Driver Licence) and log the transaction into the national Project Stop database to prevent illicit precursor diversion. Your personal information is strictly confidential and protected under the Privacy Act." 3) Cardiovascular & Therapeutic Screening: Confirm absence of uncontrolled hypertension or MAOI interactions. 4) Compliant Supply: Record ID, supply single packet (max 720mg pseudoephedrine threshold), and counsel to take with water avoiding late evening dosing to prevent insomnia.',
        },
        patientReply: {
          fa: 'عذرخواهی می‌کنم رفیق، نمی‌دانستم این قانون اجباری همه داروخانه‌هاست. بفرمایید این گواهینامه رانندگی من است. ممنون از برخورد حرفه‌ای شما.',
          en: 'Sorry mate, I did not realise it was a strict legal mandate for every pharmacy. Here is my driver\'s licence. Thanks for staying calm and explaining.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'مدیریت حرفه‌ای تعارض + ثبت قانونی کارت شناسایی در سامانه Project Stop + تحویل Sudafed 60mg با مشاوره بالینی',
        en: 'Approved De-escalation & Mandatory Project Stop ID Verification; Compliant S3 Supply & Night Insomnia Counseling',
      },
      explanation: {
        fa: 'بر اساس راهنماهای شورای داروسازی استرالیا (Pharmacy Board Guidelines) و استانداردهای PSA، تحویل فرآورده‌های S3 سودوافدرین نیازمند ارزیابی بالینی مستقیم توسط داروساز و ثبت اجباری مشخصات هویتی خریدار در سامانه Project Stop است. برخورد محترمانه و توضیح مبنای قانونی، تعارض بیمار را برطرف کرده و پایبندی به قانون را تضمین می‌کند.',
        en: 'Pharmacy Board of Australia Guidelines on Schedule 3 Pseudoephedrine mandate direct pharmacist therapeutic assessment and mandatory real-time electronic logging in Project Stop. Calm, professional communication resolves customer friction while strictly upholding statutory pre-cursor control laws.',
      },
    },
    aussieContext: {
      fa: 'درخواست Sudafed و واکنش تند مشتریان به استعلام مدارک شناسایی از متداول‌ترین چالش‌های تعارضی روزانه در داروخانه‌های استرالیا است.',
      en: 'Customer pushback against mandatory photo ID checks for S3 pseudoephedrine is a classic real-world Australian pharmacy conflict scenario.',
      keyPhrases: [
        { phrase: 'Project Stop', meaningFa: 'سامانه ملی آنلاین استرالیا برای ثبت و پایش خریدهای فرآورده‌های حاوی سودوافدرین', meaningEn: 'National online database used by Australian pharmacies to track S3 pseudoephedrine sales' },
        { phrase: 'I am not a criminal', meaningFa: 'واکنش احساسی رایج مشتریان به هنگام درخواست ارائه کارت شناسایی', meaningEn: 'Common defensive customer reaction during mandatory regulatory identity checks' },
        { phrase: 'Pharmacist-Only (S3)', meaningFa: 'داروهای جدول ۳ که تحویل آنها مستلزم ارزیابی مستقیم و تایید داروساز است', meaningEn: 'Schedule 3 medicines requiring personal assessment and supply by a registered pharmacist' },
      ],
      adminRule: {
        fa: 'مقررات قانونی S3: ثبت کارت شناسایی عکس‌دار معتبر در Project Stop پیش از تحویل سودوافدرین الزامی است و بیش از یک بسته نباید تحویل گردد.',
        en: 'PBA & Poisons Standard: Real-time Project Stop logging of valid photo ID is mandatory prior to supplying S3 pseudoephedrine.',
      },
    },
  },

  {
    id: 'emergency-supply-continued-dispensing',
    mode: 'MODE_C_CONFLICT',
    title: {
      fa: 'C2. اتمام داروی فشار خون در تعطیلات و درخواست تحویل اضطراری (Emergency Supply / Continued Dispensing)',
      en: 'C2. Emergency Supply / Continued Dispensing Demand (GP Closed)',
    },
    category: { fa: 'تحویل اضطراری و Continued Dispensing (Emergency Supply)', en: 'Continued Dispensing & Emergency Supply' },
    patientProfile: {
      name: 'Helen Patterson',
      age: 62,
      gender: 'زن (Female)',
      presentation: {
        fa: 'قرص‌های فشار خون و چربی من (Norvasc 5mg و Lipitor 20mg) کاملاً تمام شده و مطب دکترم تا روز دوشنبه تعطیل است! آیا می‌توانید یک بسته به من بدهید تا آخر هفته تعطیلات بدون دارو نمانم؟ بدون قرص فشار خونم خطرناک بالا می‌رود!',
        en: "I've completely run out of my blood pressure and cholesterol tablets (Norvasc 5mg and Lipitor 20mg) and my GP clinic is shut until Monday. Can you just hand me a pack to get me through the long weekend? My blood pressure will skyrocket!",
      },
    },
    redFlags: [
      { fa: 'درخواست داروی غیرمجاز (مانند داروهای Schedule 8 مواد مخدر یا بنزودیازپین‌های S4 که مشمول Continued Dispensing نیستند)', en: 'Ineligible drug classes: Schedule 8 controlled drugs or S4 psychotropics/benzodiazepines' },
      { fa: 'بیمار فاقد سابقه مصرف قبلی پایدار یا عدم وجود پرونده دیسپنسینگ قبلی در سیستم داروخانه', en: 'No previous stable dispensing history or unverified prescription regimen' },
      { fa: 'وجود علائم حاد بالینی خطرناک (درد قفسه سینه، تنگی نفس شدید یا فشار خون بالای 180/120)', en: 'Severe hypertensive crisis symptoms (chest pain, dyspnea, BP >180/120)' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و داروها؟', en: 'W - Patient & chronic medications?' },
        question: { fa: 'چه داروهایی مصرف می‌کنید و دوز دقیق آنها چیست؟', en: 'What exact medications and doses have you been taking?' },
        answer: {
          fa: 'قرص آملودیپین (Norvasc 5mg روزی ۱ عدد) و آتورواستاتین (Lipitor 20mg شب‌ها) که بیش از ۳ سال است مصرف می‌کنم.',
          en: 'Amlodipine (Norvasc 5mg once daily) and Atorvastatin (Lipitor 20mg at night) for over 3 years.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - تاریخچه مصرف در این داروخانه؟', en: 'H - Dispensing history in this pharmacy?' },
        question: { fa: 'آیا قبلاً این داروها را از همین داروخانه تحویل گرفته‌اید؟', en: 'Have you had these prescriptions dispensed at our pharmacy previously?' },
        answer: {
          fa: 'بله، پرونده دارم و ماه گذشته تکرار آخر نسخه‌ام را همین‌جا تحویل گرفتم.',
          en: 'Yes, I am a regular patient here and filled my last repeat at this counter last month.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - دسترسی به پزشک و گزینه‌های اورژانسی؟', en: 'A - Prescriber access & urgent care?' },
        question: { fa: 'آیا امکان دریافت نسخه الکترونیک (eScript) از طریق تلفن یا کلینیک شبانه‌روزی وجود دارد؟', en: 'Have you attempted a telehealth consultation or after-hours GP service?' },
        answer: {
          fa: 'کلینیک معمولم تعطیل است و سرویس آنلاین تا ۲ روز دیگر وقت خالی ندارد.',
          en: 'My regular GP is away for the long weekend and online telehealth is fully booked until Monday.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم فشار خون و احساس سرگیجه؟', en: 'T - Blood pressure symptoms?' },
        question: { fa: 'آیا سردرد شدید، تاری دید یا درد سینه دارید؟', en: 'Any severe occipital headache, visual blurring, or chest pain?' },
        answer: { fa: 'خیر، هیچ علامت حادی ندارم فقط نگران قطع دارو در این ۳ روز هستم.', en: 'No acute symptoms, just anxious about missing doses over the long weekend.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'es1',
        text: {
          fa: 'رد کامل درخواست و فرستادن بیمار بدون دارو به اورژانس شلوغ بیمارستان برای گرفتن یک نسخه ساده.',
          en: 'Refuse all emergency assistance and direct the stabilized patient to hospital emergency department for a routine refill.',
        },
        patientReply: {
          fa: 'آیا طبق مقررات Continued Dispensing و Emergency Supply داروسازان استرالیا نمی‌توانند درمان پایدار را تامین کنند؟',
          en: 'Can\'t Australian pharmacists supply ongoing chronic therapy under PBS Continued Dispensing arrangements?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'es2',
        text: {
          fa: 'اجرای پروتکل رسمی PBS Continued Dispensing / Emergency Supply استرالیا: ۱) بررسی معیارهای قانونی صلاحیت (Eligibility Criteria): الف) نیاز فوری درمانی (Immediate clinical need) و عدم دسترسی به پزشک در تعطیلات، ب) درمان پایدار قبلی تاییدشده در سوابق سیستم داروخانه ظرف ۶ ماه گذشته، ج) داروی واجد شرایط در فهرست Continued Dispensing (داروهای ضد فشار خون و کاهنده چربی خون مشمول هستند). ۲) صدور داروی استاندارد: تحویل یک بسته استاندارد دارویی تحت پوشش یارانه دولتی PBS Continued Dispensing (یا تحویل اضطراری Emergency Supply طبق قوانین ایالتی). ۳) ثبت اسناد و اطلاع‌رسانی: ثبت کامل در سامانه نرم‌افزاری، پرینت لیبل با ذکر Continued Dispensing و ارسال نوتیفیکیشن مکتوب به پزشک عمومی بیمار (GP Notification within 7 days). ۴) اطمینان‌بخشی و مشاوره: پایش فشار خون فعلی در داروخانه و تاکید بر مراجعه به پزشک در روز دوشنبه برای دریافت نسخه الکترونیک جدید.',
          en: 'Australian PBS Continued Dispensing & Emergency Supply Execution Protocol: 1) Regulatory Eligibility Verification: a) Immediate clinical necessity and unviable prescriber access during long weekend, b) Verified prior stable therapy dispensed within the previous 6 months on pharmacy dispensing records, c) Eligible PBS Continued Dispensing therapeutic classes (Statins & Antihypertensives are fully eligible). 2) Compliant Dispensing: Supply a standard PBS maximum quantity pack under PBS Continued Dispensing arrangements (or state Emergency Supply provisions). 3) Mandatory Documentation & Prescriber Notification: Record continued dispensing entry, apply compliant dispensing labels, and issue written notification to the patient\'s regular GP within 7 days. 4) Clinical Care: Measure baseline in-pharmacy BP, reassure the patient, and advise booking a routine GP appointment on Monday for fresh eScripts.',
        },
        patientReply: {
          fa: 'بی‌نهایت از شما متشکرم داروساز گرامی! از اینکه با استفاده از اختیارات قانونی‌تان نگذاشتید درمانم قطع شود بسیار قدردانم.',
          en: 'Thank you so much pharmacist! You have given me complete peace of mind over the long weekend. I will see my GP on Monday.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید تحویل یک بسته استاندارد تحت مقررات PBS Continued Dispensing + ارسال نوتیفیکیشن به GP بیمار',
        en: 'Approved PBS Continued Dispensing Supply of Norvasc 5mg & Lipitor 20mg + Formal GP Notification',
      },
      explanation: {
        fa: 'برنامه Continued Dispensing استرالیا به داروسازان اجازه می‌دهد در صورت عدم دسترسی به پزشک، برای داروهای مزمن واجد شرایط (مانند داروهای قلبی، فشار خون، دیابت و آسم) که قبلاً پایدار بوده‌اند، یک بسته استاندارد دارویی با پوشش PBS تحویل دهند تا زنجیره درمان قطع نشود.',
        en: 'Under Australian PBS Continued Dispensing provisions, registered pharmacists can supply a single standard PBS quantity of eligible chronic medicines to ensure continuity of care when the prescriber is unavailable and stable prior therapy is confirmed.',
      },
    },
    aussieContext: {
      fa: 'درخواست داروی اضطراری در روزهای تعطیل و آخر هفته از پرتکرارترین مراجعات داروخانه‌ای در استرالیا است که چارچوب قانونی Continued Dispensing را می‌طلبد.',
      en: 'Holiday and weekend emergency refill requests are a critical daily feature of community pharmacy practice under Australian Continued Dispensing rules.',
      keyPhrases: [
        { phrase: 'Continued Dispensing', meaningFa: 'طرح قانونی ملی استرالیا برای تحویل داروهای مزمن پایدار بدون نسخه در شرایط اضطراری تحت پوشش PBS', meaningEn: 'National Australian framework allowing PBS supply of eligible chronic medicines without a new script' },
        { phrase: 'Emergency Supply (3-day)', meaningFa: 'اختیار قانونی داروساز برای تحویل تا ۳ روز دارو در شرایط اضطراری طبق قوانین سموم ایالتی', meaningEn: 'State poisons legislation allowing pharmacists to supply short-term emergency medicine' },
        { phrase: 'GP Notification', meaningFa: 'ارسال نامه رسمی به پزشک عمومی بیمار جهت اطلاع‌رسانی تحویل اضطراری دارو ظرف ۷ روز', meaningEn: 'Mandatory written notice sent to patient’s GP following continued dispensing' },
      ],
      adminRule: {
        fa: 'دستورالعمل Continued Dispensing: داروهای جدول ۸ و روان‌گردان‌ها مطلقاً مشمول تحویل Continued Dispensing نمی‌شوند.',
        en: 'PBS Rules: Schedule 8 controlled drugs and psychotropic substances are strictly excluded from Continued Dispensing arrangements.',
      },
    },
  },

  {
    id: 'angry-wait-time-deescalation',
    mode: 'MODE_C_CONFLICT',
    title: {
      fa: 'C3. اعتراض پرخاشگرانه به زمان معطلی تحویل نسخه و آرام‌سازی (Angry Wait Time & De-escalation)',
      en: 'C3. Patient Angry About Dispensing Wait Time',
    },
    category: { fa: 'مدیریت تعارض و خدمات مشتریان (Conflict Resolution)', en: 'Conflict De-escalation & Clinical Safety' },
    patientProfile: {
      name: 'Darren Fletcher',
      age: 48,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'چرا ۲۵ دقیقه است معطل یک برچسب چسباندن روی یک جعبه آماده هستم؟ سه نفر پشت آن میز ایستاده‌اید و فقط حرف می‌زنید! این چه وضع خدماتی است؟ نسخه من فقط ۲ تا قلم داروی ساده بود!',
        en: "Why is it taking 25 minutes just to slap a sticky label on a pre-made box? There are three of you standing behind that bench doing nothing! My script was just two simple boxes!",
      },
    },
    redFlags: [
      { fa: 'خطر تنش فیزیکی یا رفتارهای پرخاشگرانه شدید نیازمند رعایت ایمنی کارکنان و فضای آرام‌سازی', en: 'Aggressive escalations risking staff safety requiring de-escalation protocols' },
      { fa: 'فدا کردن کنترل‌های بالینی و ایمنی بیمار به خاطر عجله و سرعت بخشیدن غیرایمن به فرایند دیسپنسینگ', en: 'Bypassing clinical safety verification steps due to time pressure' },
      { fa: 'عدم انجام مشاوره تحویل نهایی و احراز هویت دوتایی به دلیل عصبانیت مشتری', en: 'Omitting 2-identifier patient handover due to customer frustration' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - هویت و نسخه بیمار؟', en: 'W - Patient verification?' },
        question: { fa: 'نام و نام خانوادگی و تاریخ تولد شما چیست؟', en: 'May I confirm your full name and date of birth?' },
        answer: { fa: 'دارن فلچر (Darren Fletcher)، متولد ۱۲ مارس ۱۹۷۸.', en: 'Darren Fletcher, 12th March 1978.' },
      },
      {
        key: 'H',
        label: { fa: 'H - داروهای نسخه شده؟', en: 'H - Prescribed items?' },
        question: { fa: 'نسخه شما شامل چه داروهایی است؟', en: 'What medications were on your prescription today?' },
        answer: {
          fa: 'قرص وارفارین (Coumadin 2mg) و آنتی‌بیوتیک جدید Bactrim DS برای عفونت ادراری.',
          en: 'Warfarin (Coumadin 2mg) and a new antibiotic Bactrim DS.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - علت تاخیر و بررسی بالینی؟', en: 'A - Reason for clinical delay?' },
        question: { fa: 'آیا داروساز در حال بررسی تداخل دارویی نسخه شما با پزشک بود؟', en: 'Was the pharmacist currently checking a major drug interaction?' },
        answer: {
          fa: 'نمی‌دانم، فقط دیدم داروساز تلفن به دست است و به مانیتور نگاه می‌کند.',
          en: 'I do not know, I just saw the pharmacist on the phone looking at the screen.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - آرام‌سازی و توضیح تداخل؟', en: 'T - De-escalation & interaction review?' },
        question: { fa: 'آیا متوجه شدید که ترکیب باکتریم با وارفارین می‌تواند خطر خونریزی شدید ایجاد کند؟', en: 'Were you aware that Bactrim significantly enhances Warfarin toxicity and bleeding?' },
        answer: {
          fa: 'واقعاً؟ نمی‌دانستم این دو دارو ممکن است با هم تداخل داشته باشند!',
          en: 'Really? I had no idea those two tablets could interact dangerously!',
        },
      },
    ],
    dialogueOptions: [
      {
        id: 'wt1',
        text: {
          fa: 'پاسخ تند و توهین‌آمیز به مشتری: «اگر ناراحتید بروید جای دیگر، ما کلی کار مهم‌تر داریم!»',
          en: 'Aggressive counter-argument: "If you don\'t like the wait, go elsewhere, we have more important things to do!"',
        },
        patientReply: {
          fa: 'آیا برخورد پرخاشگرانه داروساز نقض فاحش آیین اخلاق حرفه‌ای شورای داروسازی استرالیا نیست؟',
          en: 'Isn\'t aggressive arguing a severe breach of PBA professional communication standards?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'wt2',
        text: {
          fa: 'مدیریت حرفه‌ای تعارض با تکنیک HEAT (Hear, Empathise, Apologise, Take action) و توضیح بررسی بالینی: ۱) شنیدن و همدلی: «آقای فلچر، کاملاً حق با شماست که معطل شدید و من صمیمانه بابت این تاخیر ۲۵ دقیقه‌ای از شما عذرخواهی می‌کنم؛ وقت شما بسیار باارزش است.» ۲) توضیح ارزش بالینی فراتر از برچسب‌زنی: «دلیل این تاخیر این بود که داروساز مسئول ما متوجه یک تداخل بالینی خطرساز بین آنتی‌بیوتیک جدید شما (Bactrim DS) و قرص وارفارین (Coumadin) شد؛ باکتریم اثر وارفارین را به شدت تقویت کرده و خطر خونریزی حاد داخلی ایجاد می‌کند. داروساز ما در حال تماس تلفنی مستقیم با پزشک معالج شما بود تا دوز وارفارین را تعدیل کرده و آزمایش INR فوق‌العاده تنظیم کند تا سلامت شما به خطر نیفتد.» ۳) تحویل محترمانه و مشاوره اختصاصی: احراز هویت دوتایی، ارائه دستورالعمل جدید INR و تحویل دارو در فضایی آرام و محترمانه.',
          en: 'Professional HEAT De-escalation (Hear, Empathise, Apologise, Take Action) & Clinical Safety Education: 1) Active Listening & Empathy: "Mr. Fletcher, I completely understand your frustration regarding the 25-minute wait, and I sincerely apologise for delaying your schedule; your time is truly valuable." 2) Transparent Clinical Explanation Beyond "Label Slapping": "The critical reason for this delay was that our clinical pharmacist identified a life-threatening drug interaction between your new antibiotic (Bactrim DS) and your blood thinner (Warfarin). Bactrim dramatically inhibits Warfarin metabolism, risking dangerous internal hemorrhages. Our pharmacist was personally liaising with your prescribing GP to safely adjust your Warfarin dose and schedule an urgent INR blood test to protect your safety." 3) Compliant Handover: Verify 2 patient identifiers, provide clear interaction counseling, and ensure respectful customer closure.',
        },
        patientReply: {
          fa: 'خدای من! من واقعاً متاسفم که زود قضاوت کردم. فکر می‌کردم کار فقط برچسب زدن است، نمی‌دانستم جانم را از خونریزی خطرناک نجات دادید. از دقت و صبوری‌تان بی‌نهایت ممنونم.',
          en: "Blimey, I am so sorry for losing my temper. I genuinely thought it was just printing stickers. Thank you for protecting my life and sorting out that blood thinner interaction with my GP.",
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'مدیریت موفق تعارض با تکنیک HEAT + توضیح شفاف ایمنی بالینی تداخل Warfarin-Bactrim + تحویل ایمن',
        en: 'Approved HEAT De-escalation Protocol & Life-Threatening Warfarin-Bactrim Interaction Resolution',
      },
      explanation: {
        fa: 'دیسپنسینگ دارو در استرالیا صرفاً یک فرایند فنی نیست بلکه شامل بررسی دقیق تداخلات دارویی، مناسب بودن دوز، آلرژی‌ها و استانداردهای بالینی است. پاسخ‌دهی همدلانه و تشریح فرایند بالینی نجات‌بخش (مانند تداخل وارفارین و کوتریموکسازول) خشم بیمار را به قدردانی عمیق تبدیل می‌کند.',
        en: 'Community dispensing incorporates critical clinical evaluation, drug interaction screening, and prescriber liaison. Empathetic de-escalation that transparently communicates clinical safety checks (such as life-threatening Warfarin-Trimethoprim interactions) transforms patient frustration into trust and collaboration.',
      },
    },
    aussieContext: {
      fa: 'اعتراض به معطلی در داروخانه از شایع‌ترین چالش‌های ارتباطی است که داروساز با شفاف‌سازی نقش بالینی خود تعارض را حل می‌کند.',
      en: 'Managing customer impatience regarding dispensing wait times is a standard daily communication challenge in high-volume community pharmacies.',
      keyPhrases: [
        { phrase: 'Slap a sticky label', meaningFa: 'تصور نادرست عامیانه مبنی بر اینکه کار داروخانه صرفاً چسباندن برچسب روی جعبه است', meaningEn: 'Common misconception that dispensing is merely sticking labels on pre-packed boxes' },
        { phrase: 'HEAT De-escalation Model', meaningFa: 'تکنیک استاندارد مدیریت تعارض شامل شنیدن، همدلی، پوزش و اقدام عملی', meaningEn: 'Hear, Empathise, Apologise, Take action communication framework' },
        { phrase: 'Clinical Verification', meaningFa: 'بررسی علمی تداخلات، دوزاژ و ایمنی بالینی پیش از تحویل دارو', meaningEn: 'Pharmacist cognitive review of patient history, safety, and drug interactions' },
      ],
      adminRule: {
        fa: 'استاندارد PBA: داروساز موظف است در تمام شرایط حتی فشارهای زمانی، کنترل‌های بالینی و احراز هویت دوتایی بیمار را بدون افت کیفیت انجام دهد.',
        en: 'PBA Professional Practice Standard: Pharmacists must never compromise clinical dispensing checks or patient counseling under commercial or time pressure.',
      },
    },
  },

  {
    id: 'safescript-early-refill-s8',
    mode: 'MODE_C_CONFLICT',
    title: {
      fa: 'C4. هشدار سامانه مانیتورینگ SafeScript برای تکرار زودهنگام داروی S8/S4 (SafeScript NSW Red Alert & Early Refill)',
      en: 'C4. Early Refill / Suspicious S4/S8 Prescription (SafeScript Alert)',
    },
    category: { fa: 'پایش نسخ SafeScript و داروهای S8 (SafeScript & S8 Monitoring)', en: 'Real-Time Prescription Monitoring & S8 Compliance' },
    patientProfile: {
      name: 'Shane Donovan',
      age: 39,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'من جعبه قرص‌های اکسیکودون (Endone 5mg) و تمازپام (Temazepam 10mg) خودم را دیروز توی قطار جا گذاشتم و گم شد! همین الان باید این تکرار نسخه من را بپیچید. چرا به پزشکم زنگ می‌زنید و به من مشکوک شدید؟ من درد شدید دارم!',
        en: "I lost my box of Endone 5mg and Temazepam on the train yesterday and I need this repeat filled right now. Why are you calling my doctor and treating me like a suspect? I'm in agony!",
      },
    },
    redFlags: [
      { fa: 'هشدار قرمز در سامane مانیتورینگ آنلاین SafeScript (Red Traffic Light Alert): تحویل مکرر مسکن‌های اپیوئیدی و بنزودیازپین‌ها از چند پزشک یا داروخانه مختلف در بازه کوتاه', en: 'SafeScript Red Alert: High-risk multi-prescriber or multi-pharmacy opioid/benzodiazepine early refill' },
      { fa: 'ادعای مکرر مفقودی یا سرقت داروهای Schedule 8 بدون گزارش پلیس (Police Event Report)', en: 'Recurrent claims of lost/stolen Schedule 8 medications without police report' },
      { fa: 'خطر دپرسیون تنفسی کشنده و مسمومیت در اثر مصرف همزمان دوزهای بالای اپیوئید با بنزودیازپین', en: 'Fatal respiratory depression risk from concurrent high-dose opioid + benzodiazepine combination' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - هویت و سوابق نسخه؟', en: 'W - Patient & prescription history?' },
        question: { fa: 'نام کامل شما چیست و آخرین بار چه تاریخی این نسخه را دریافت کردید؟', en: 'What is your full name and when was this prescription last dispensed?' },
        answer: {
          fa: 'شین داناوان هستم؛ ۵ روز پیش یک جعبه ۲۰ تایی Endone گرفتم اما دیروز توی قطار گم شد!',
          en: 'Shane Donovan. I filled a 20-tablet pack of Endone 5 days ago, but lost the entire box on the train.',
        },
      },
      {
        key: 'H',
        label: { fa: 'H - هشدار سامانه SafeScript؟', en: 'H - SafeScript RTPM Status?' },
        question: { fa: 'آیا در روزهای اخیر از داروخانه دیگری داروی مشابه دریافت کرده‌اید؟', en: 'Have you had monitored medicines supplied at another pharmacy recently?' },
        answer: {
          fa: 'فقط ۳ روز پیش یک کلینیک دیگر رفتم و چند تا قرص گرفتم چون درد داشتم.',
          en: 'Just visited an after-hours GP 3 days ago for extra tablets because of severe pain.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - گزارش پلیس برای داروی گم‌شده S8؟', en: 'A - Police lost property report?' },
        question: { fa: 'آیا برای داروی گم‌شده جدول ۸ گزارش پلیس ثبت کرده‌اید؟', en: 'Did you obtain a Police Event Number for the lost Schedule 8 medication?' },
        answer: { fa: 'خیر، وقت نداشتم به اداره پلیس بروم.', en: 'No, I haven\'t had time to go to the police station.' },
      },
      {
        key: 'T',
        label: { fa: 'T - ارزیابی بالینی درد و خطرات؟', en: 'T - Clinical pain & overdose risk?' },
        question: { fa: 'آیا از خطرات کشنده مصرف همزمان مسکن قوی با تمازپام مطلع هستید؟', en: 'Are you aware of the severe respiratory sedation risks of opioids with Temazepam?' },
        answer: { fa: 'من سال‌هاست این‌ها را می‌خورم و بدنم عادت کرده است.', en: 'I have been taking them for a while, my body is used to it.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'ss1',
        text: {
          fa: 'نادیده گرفتن هشدار قرمز SafeScript و تحویل زودهنگام داروی S8 اکسیکودون بدون تماس با پزشک معالج.',
          en: 'Override SafeScript Red Alert and dispense early S8 oxycodone without prescriber confirmation.',
        },
        patientReply: {
          fa: 'آیا تحویل زودهنگام داروی کنترل‌شده S8 با وجود هشدار قرمز مانیتورینگ بدون تایید پزشک خلاف صریح قانون نیست؟',
          en: 'Isn\'t dispensing an early S8 repeat despite a SafeScript Red Alert a direct breach of poisons legislation?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'ss2',
        text: {
          fa: 'مدیریت بالینی و قانونی مطابق استانداردهای SafeScript و مراقبت بدون پیش‌داوری: ۱) عدم قضاوت و آرام‌سازی بیمار: «آقای داناوان، ما به شما به عنوان متهم نگاه نمی‌کنیم و هدف ما صرفاً حفظ ایمنی سلامت شماست.» ۲) الزام قانونی سامانه Real-Time Prescription Monitoring (SafeScript): «طبق قانون استرالیا، تمام داروهای جدول ۸ و آرام‌بخش‌ها در سامانه برخط ملی SafeScript ثبت می‌شوند. سیستم امروز به دلیل فاصله زمانی بسیار کوتاه (۵ روز به جای ۲۰ روز) و دریافت همزمان دارو از پزشکان مختلف، هشدار ایمنی قرمز (Red Alert) ثبت کرده است و داروساز قانوناً اجازه تحویل بدون هماهنگی با پزشک صادرکننده را ندارد.» ۳) تماس حرفه‌ای با پزشک معالج (GP Liaison): بررسی صحت ادعای مفقودی، استعلام لزوم نیاز به گزارش مفقودی پلیس و بررسی برنامه کاهش دوز یا بازبینی درمان درد. ۴) ارائه راهکار حمایتی ایمن: پیشنهاد مسکن‌های غیرمخدر مجاز (مانند Paracetamol/Topical NSAID) تا زمان تعیین تکلیف با پزشک.',
          en: 'Australian SafeScript RTPM Compliance & Non-Judgmental Duty of Care Protocol: 1) Non-Judgmental Communication: "Mr. Donovan, we are not treating you as a suspect in any way; our paramount legal and clinical duty is ensuring your medical safety." 2) SafeScript Regulatory Mandate: "Under Australian law, all Schedule 8 and monitored medicines are tracked in real-time via SafeScript. The system has generated a high-risk Red Traffic Light Alert due to an early refill request (5 days into a 20-day supply) combined with multi-prescriber history. As a registered pharmacist, I am legally and ethically required to consult your prescribing doctor before any S8 supply can take place." 3) Prescriber Liaison: Contact the primary prescriber to verify whether an early replacement is authorised, check requirement for a Police Event Number for lost S8 drugs, and discuss safe pain management. 4) Supportive Care: Offer safe non-monitored interim pain relief (e.g. Paracetamol) while coordinating directly with the doctor.',
        },
        patientReply: {
          fa: 'متوجه شدم؛ ممنون که بدون بی‌احترامی قانون را برایم روشن کردید. لطفاً با پزشکم صحبت کنید تا ببینیم چه تصمیمی می‌گیرد.',
          en: 'I understand now. Thanks for not treating me like a criminal and explaining the SafeScript rules. Please speak to my doctor.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: true,
      recommendation: {
        fa: 'توقف تحویل زودهنگام S8 تا زمان تایید رسمی با پزشک معالج + ثبت در سامانه SafeScript و ارائه راهکار حمایتی',
        en: 'Withhold Early S8 Supply Pending Prescriber Consultation; SafeScript Compliance & Supportive Care',
      },
      explanation: {
        fa: 'سامانه Real-Time Prescription Monitoring (SafeScript/QScript/ScriptCheck) جهت جلوگیری از مسمومیت‌های کشنده اپیوئیدی و انحراف دارویی در استرالیا الزامی است. در صورت بروز هشدار قرمز، داروساز موظف به بررسی بالینی، امتناع از تحویل زودهنگام غیرموجه و هماهنگی مستقیم با پزشک معالج است.',
        en: 'Real-Time Prescription Monitoring (SafeScript) mandates that pharmacists review high-risk alerts before dispensing monitored drugs. An early refill of Schedule 8 opioids combined with benzodiazepines requires strict prescriber liaison to prevent fatal overdose and diversion.',
      },
      referralLetterTemplate: {
        to: 'Prescribing General Practitioner / Pain Specialist',
        reason: 'SafeScript High-Risk Red Alert & Early Refill Request (Schedule 8 Oxycodone)',
        symptomSummary: '39yo male requesting repeat of Endone 5mg (dispensed 5 days ago) claiming previous supply was lost on public transport. SafeScript shows concurrent multi-prescriber supply.',
        currentMeds: 'Endone 5mg PRN, Temazepam 10mg nocte',
        suggestedAction: 'Review opioid stewardship, verify legitimacy of lost medication, check need for Police Event Report, and confirm whether early supply is clinically indicated.',
      },
    },
    aussieContext: {
      fa: 'پایش نسخه‌های مخدر S8 در سامانه SafeScript و مدیریت درخواست‌های تکرار زودهنگام از حساس‌ترین آزمون‌های عملی داروسازی بالینی در استرالیا است.',
      en: 'Real-time prescription monitoring (SafeScript) and early Schedule 8 refills represent a crucial clinical and regulatory competency in Australian pharmacy practice.',
      keyPhrases: [
        { phrase: 'SafeScript / RTPM', meaningFa: 'سامانه نظارت برخط و لحظه‌ای بر تجویز و تحویل داروهای پرخطر و مخدر در استرالیا', meaningEn: 'Real-Time Prescription Monitoring database tracking high-risk monitored medicines' },
        { phrase: 'Red Traffic Light Alert', meaningFa: 'هشدار سطح بالای قرمز در سامانه SafeScript که نشان‌دهنده ریسک بالای مسمومیت یا دریافت چندگانه است', meaningEn: 'High-risk clinical alert in SafeScript indicating potential harm, early refill, or multi-prescriber activity' },
        { phrase: 'Schedule 8 (S8) Controlled Drug', meaningFa: 'داروهای تحت کنترل شدید و مواد مخدر نیازمند ثبت در دفتر ثبت سموم و نگهداری در گاوصندوق', meaningEn: 'Controlled substances requiring strict storage in dangerous drug safes and precise register logging' },
      ],
      adminRule: {
        fa: 'قانون سموم و داروهای تحت کنترل: تحویل زودهنگام داروی S8 با ادعای گم‌شدن بدون تایید صریح پزشک و ثبت اسناد قانونی تخلف انتظامی محسوب می‌شود.',
        en: 'Poisons & Therapeutic Goods Regulation: Dispensing early S8 repeats on lost script grounds without prescriber approval is strictly unlawful.',
      },
    },
  },
];
