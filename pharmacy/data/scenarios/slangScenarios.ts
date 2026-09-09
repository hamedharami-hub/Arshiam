import { Scenario } from './types';

export const SLANG_SCENARIOS: Scenario[] = [
  // ==========================================
  // TIER 2: MODE B - EVERYDAY OTC & AUSSIE SLANG
  // ==========================================
  {
    id: 'slang-ibuprofen-brand-vs-generic',
    mode: 'MODE_B_SLANG',
    title: {
      fa: 'B1. برند در برابر ژنریک: Chemist Brand Ibuprofen در برابر Nurofen (Brand vs Generic Debate)',
      en: 'B1. Chemist Brand Ibuprofen vs Nurofen (Brand vs Generic Debate)',
    },
    category: { fa: 'مسکن و داروی ژنریک (Analgesics & Generics)', en: 'Analgesics & Generics' },
    patientProfile: {
      name: 'Jack Cooper',
      age: 36,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'سلام رفیق (G\'day mate)، آیا این ایبوپروفن ارزان برند داروخانه (Chemist brand) دقیقاً عین نوروفن (Nurofen) است؟ چرا نوروفن دو برابر گران‌تر است؟ آیا پولم هدر می‌رود (Am I getting ripped off) یا نوروفن واقعاً کیفیت بالاتری دارد؟',
        en: "G'day mate, is this cheap chemist-brand ibuprofen exactly the same stuff as Nurofen? Why is Nurofen double the price? Am I getting ripped off?",
      },
    },
    redFlags: [
      { fa: 'سابقه فعال زخم معده یا خونریزی گوارشی (Active GI ulcer / bleeding) و نارسایی حاد کلیه', en: 'Active peptic ulcer disease, GI bleeding or severe renal impairment' },
      { fa: 'آسم ناشی از آسپیرین/NSAID و سابقه واکنش‌های حساسیتی شدید', en: 'Aspirin/NSAID-exacerbated respiratory disease (AERD)' },
      { fa: 'مصرف همزمان چند فرآورده NSAID مختلف به طور همزمان یا با معده خالی', en: 'Concomitant multiple NSAID use or ingestion on empty stomach' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و علت مصرف؟', en: 'W - Who is the patient & indication?' },
        question: { fa: 'ایبوپروفن را برای چه کسی و چه دردی می‌خواهید؟', en: 'Who is the ibuprofen for and what pain are you treating?' },
        answer: { fa: 'برای خودم است؛ بعد از تمرین سنگین بدنسازی دیروز دچار گرفتگی عضلانی و سردرد خفیف شده‌ام.', en: 'For myself. Got a sore back and mild headache after a heavy gym workout yesterday.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و شدت درد؟', en: 'H - Duration & severity?' },
        question: { fa: 'چند وقت است درد دارید و چقدر شدید است؟', en: 'How long have you had the pain and how severe is it?' },
        answer: { fa: 'از دیروز بعدازظهر شروع شده، درد خفیف تا متوسط عضلانی است.', en: 'Started yesterday afternoon, mild to moderate muscular ache.' },
      },
      {
        key: 'A',
        label: { fa: 'A - داروهای مصرفی و مقایسه قیمت؟', en: 'A - Action taken & price comparison?' },
        question: { fa: 'آیا داروی دیگری مصرف کرده‌اید و چرا این دو جعبه را مقایسه می‌کنید؟', en: 'Have you taken anything else and what caught your eye on the shelf?' },
        answer: {
          fa: 'هنوز چیزی نخورده‌ام، اما روی قفسه دیدم ایبوپروفن برند داروخانه ۳.۵۰ دلار است ولی نوروفن ۹.۵۰ دلار! می‌خواستم بدانم واقعاً فرقی دارند؟',
          en: 'Haven\'t taken anything yet. Saw the Chemist Brand is $3.50 while Nurofen is $9.50. Wondering if there\'s a real difference.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - سابقه بیماری گوارشی، آسم و داروها؟', en: 'T - Medical history, ulcers & asthma?' },
        question: { fa: 'آیا سابقه زخم معده، آسم یا داروی تجویزی روزانه دارید؟', en: 'Any history of stomach ulcers, asthma, or regular prescribed meds?' },
        answer: { fa: 'خیر، هیچ مشکل معده یا آسمی ندارم و داروی دیگری هم مصرف نمی‌کنم.', en: 'No stomach issues, no asthma, not on any other medication.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'bg1',
        text: {
          fa: 'به بیمار بگویید نوروفن چون برند اصلی انگلیسی است خلوص بسیار بالاتری دارد و حتماً پول بیشتری برای برند اصلی بپردازد.',
          en: 'Tell the patient Nurofen has secret superior ingredients and higher purity, so paying double for the originator brand is always mandatory.',
        },
        patientReply: {
          fa: 'آیا واقعاً سازمان TGA اجازه می‌دهد داروی بی‌کیفیت و ضعیف‌تر تحت عنوان برند داروخانه به فروش برسد؟',
          en: 'Does the TGA really allow lower quality generics on Australian pharmacy shelves?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'bg2',
        text: {
          fa: 'مشاوره علمی هم‌ارزی زیستی (Bioequivalence) و استانداردهای سختگیرانه TGA: ۱) هم‌ارزی دارویی: هر دو فرآورده حاوی مولکول دارویی یکسان (Ibuprofen 200mg) با خلوص و اثربخشی زیستی معادل (Bioequivalent) بر اساس استانداردهای سختگیرانه سازمان TGA هستند. ۲) علت تفاوت قیمت: تفاوت قیمت صرفاً ناشی از هزینه‌های تبلیغات تلویزیونی، بازاریابی تجاری و بسته‌بندی پر زرق و برق برند Nurofen است نه تفاوت در اثر درمانی. ۳) تفاوت فرمولاسیون‌های خاص: شکل استاندارد قرص هر دو برند اثر یکسان دارد؛ صرفاً فرمولاسیون‌های کپسول مایع (Liquid Capsules) یا Ibuprofen Sodium Dihydrate (Nurofen Zavance) حدود ۱۰-۱۵ دقیقه سریع‌تر حل می‌شوند اما نهایت اثر تسکین درد کاملاً برابر است. ۴) مشاوره مصرف: مصرف همواره همراه غذا یا یک لیوان شیر جهت محافظت از مخاط معده و اطمینان‌بخشی به بیمار برای صرفه‌جویی مالی با خرید برند ژنریک.',
          en: 'Explain Bioequivalence & Australian TGA Standards: 1) Therapeutic Equivalence: Both Chemist-brand Ibuprofen and standard Nurofen tablets contain the exact identical active drug substance (Ibuprofen 200mg) manufactured to the exact same bioequivalence standards mandated by the Australian TGA. 2) Price Difference Explained: The premium price of Nurofen is solely driven by global brand marketing, television advertising, and packaging, not clinical superiority. 3) Formulation Nuances: While liquid-filled capsules (e.g., Nurofen Zavance / liquid capsules) dissolve 10-15 mins faster, standard generic tablets deliver identical analgesic efficacy and pain relief duration. 4) Patient Counseling: Reassure the patient they achieve identical relief saving money with generic, and advise always taking NSAIDs with food or milk to safeguard gastric mucosa.',
        },
        patientReply: {
          fa: 'بسیار ممنون رفیق! از این توضیح شفاف و نجات دادن جیبم از هزینه اضافه بسیار سپاسگزارم. حتماً برند داروخانه را با غذا می‌خورم.',
          en: "Legend! Thanks for saving me a few bucks and explaining how bioequivalence works under the TGA. I'll grab the Chemist Brand and take it with food.",
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید انتخاب ایبوپروفن ژنریک (Chemist Brand Ibuprofen 200mg) با تضمین هم‌ارزی زیستی TGA و مشاوره مصرف با غذا',
        en: 'Approved Chemist-Brand Ibuprofen 200mg Selection with TGA Bioequivalence Reassurance & Gastric Protection Counseling',
      },
      explanation: {
        fa: 'سازمان TGA استرالیا تضمین می‌کند که تمامی داروهای ژنریک ثبت‌شده (AUST R) از نظر فراهمی زیستی و کارایی بالینی با برند مرجع هم‌ارز هستند (دامنه اطمینان ۹۰٪ در بازه ۸۰-۱۲۵٪). داروساز با آموزش بیمار درباره علل بازاریابی اختلاف قیمت، ضمن ارتقای سواد دارویی، در هزینه‌های بیمار صرفه‌جویی می‌کند.',
        en: 'Under Australian TGA regulations, generic medicines registered with an AUST R number are rigorously tested for bioequivalence against the innovator brand. Educating patients on brand marketing costs vs therapeutic equivalence fosters trust and reduces out-of-pocket healthcare expenses.',
      },
    },
    aussieContext: {
      fa: 'بحث پیرامون داروی ژنریک در برابر برند مرجع (Chemist Brand vs Nurofen) از رایج‌ترین مکالمات روزمره در داروخانه‌های استرالیا است.',
      en: 'Brand vs generic debate is one of the most frequent daily OTC interactions in community pharmacy across Australia.',
      keyPhrases: [
        { phrase: 'Chemist Brand / Generic', meaningFa: 'داروهای ژنریک با بسته‌بندی داروخانه که قیمت بسیار پایین‌تری دارند', meaningEn: 'Pharmacy house-brand generics containing identical active ingredients at lower cost' },
        { phrase: 'Getting ripped off', meaningFa: 'اصطلاح عامیانه استرالیایی برای ضرر مالی، گران خریدن یا هزینه ناموجه پرداختن', meaningEn: 'Aussie slang for paying an unfairly inflated price or being overcharged' },
        { phrase: 'Exact same stuff', meaningFa: 'همان ماده موثره و مولکول دارویی با استاندارد کیفی برابر', meaningEn: 'Colloquial term for bioequivalent therapeutic formulation' },
      ],
      adminRule: {
        fa: 'استاندارد TGA: تمام داروهای ژنریک دارای کد AUST R دارای مجوز، استانداردهای سختگیرانه کیفیت، خلوص و هم‌ارزی زیستی را پشت سر گذاشته‌اند.',
        en: 'Therapeutic Goods Administration (TGA): All AUST R approved generic medicines meet strict Australian bioequivalence, safety, and GMP manufacturing standards.',
      },
    },
  },

  {
    id: 'slang-severe-hayfever-bunged-nose',
    mode: 'MODE_B_SLANG',
    title: {
      fa: 'B2. تب یونجه شدید، چشم‌های خیس و گرفتگی کامل بینی (Severe Hay Fever & Bunged-Up Nose)',
      en: 'B2. Severe Hay Fever & Bunged-Up Nose (Oral Antihistamine vs INCS vs Decongestant Spray)',
    },
    category: { fa: 'آلرژی و دستگاه تنفسی (Allergy & Rhinitis)', en: 'Allergy & Rhinitis' },
    patientProfile: {
      name: 'Craig Davies',
      age: 45,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'رفیق (Mate)، امروز تب یونجه (Hayfever) وحشتناکی گرفتم، چشمانم پر از آب و خارش است و بینی‌ام کاملاً کیپ شده (Bunged up). قوی‌ترین دارویی که پشت پیشخوان داری و گیج و خواب‌آلودم نمی‌کنه چیه؟',
        en: "Mate, I've got shocking hayfever today, eyes streaming and nose completely bunged up with the spring pollen. What's the absolute strongest one you've got behind the counter that won't make me drowsy?",
      },
    },
    redFlags: [
      { fa: 'مصرف طولانی‌مدت اسپری‌های دکونژستانت موضعی (Otrivin/Drixine بیش از ۳ تا ۵ روز) و خطر احتقان راجعه (Rhinitis Medicamentosa)', en: 'Prolonged topical decongestant spray use (>3-5 days) risking rhinitis medicamentosa' },
      { fa: 'انسداد یک‌طرفه مداوم بینی (Unilateral obstruction)، ترشح بدبو، درد سینوسی شدید یا خونریزی مکرر (Epistaxis)', en: 'Unilateral nasal blockage, foul discharge, facial pain, or epistaxis' },
      { fa: 'خطر خواب‌آلودگی داروهای نسل اول در افراد نیازمند هوشیاری کامل', en: '1st-gen antihistamine sedation risk in machinery operators / drivers' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و شغل؟', en: 'W - Patient & Occupation?' },
        question: { fa: 'داروی آلرژی را برای چه کسی می‌خواهید و شغل شما چیست؟', en: 'Who is the medicine for and what do you do for work?' },
        answer: { fa: 'برای خودم است؛ من سرپرست کارگاه ساختمانی هستم و باید تمام روز در محیط باز باشم و رانندگی کنم.', en: 'For myself. I work as a construction site supervisor outdoors and drive all day.' },
      },
      {
        key: 'H',
        label: { fa: 'H - مدت و ماهیت علائم؟', en: 'H - Duration & symptoms?' },
        question: { fa: 'چند روز است علائم دارید و شدت گرفتگی بینی چقدر است؟', en: 'How long have you had symptoms and how blocked is your nose?' },
        answer: {
          fa: '۳ روز است با افزایش گرده‌های بهاری شروع شده؛ چشمانم مدام اشک می‌ریزد، عطسه‌های رگباری دارم و هر دو مجرای بینی‌ام کاملاً مسدود است و شب‌ها نمی‌توانم بخوابم.',
          en: 'Started 3 days ago with the spring grass pollen. Eyes streaming, non-stop sneezing, and both nostrils are totally blocked so I can\'t sleep.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات و داروهای قبلی؟', en: 'A - Actions & past meds?' },
        question: { fa: 'تاکنون چه اقداماتی انجام داده‌اید؟', en: 'What treatments have you tried so far?' },
        answer: {
          fa: 'اسپری سرم نمکی استفاده کردم، کمی مجرا را شست اما بینی‌ام همچنان متورم و کیپ است.',
          en: 'Used a saline nasal flush. It cleared some mucus but my nose is still swollen shut.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - بیماری زمینه‌ای و داروها؟', en: 'T - Medical history & meds?' },
        question: { fa: 'آیا فشار خون بالا، گلوکوم یا داروی تجویزی دیگری دارید؟', en: 'Any high blood pressure, glaucoma, or other daily medications?' },
        answer: { fa: 'خیر، فشار خونم طبیعی است و هیچ داروی دیگری مصرف نمی‌کنم.', en: 'No high blood pressure, no eye issues, no other medications.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'hf1',
        text: {
          fa: 'تحویل اسپری دکونژستانت Otrivin و توصیه به مصرف مداوم آن برای ۳ تا ۴ هفته متوالی بدون کورتون بینی.',
          en: 'Dispense Otrivin decongestant spray and advise continuous daily use for 3-4 weeks without an anti-inflammatory spray.',
        },
        patientReply: {
          fa: 'آیا مصرف مداوم اسپری اوتریوین برای یک ماه باعث آسیب به بافت بینی و کیپ شدن بدتر آن نمی‌شود؟',
          en: 'Won\'t using Otrivin spray continuously for a month ruin my nasal lining and cause rebound blockage?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'hf2',
        text: {
          fa: 'ارائه پروتکل استاندارد دوگانه خط اول درمان آلرژی استرالیا: ۱) آنتی‌هیستامین خوراکی غیرخواب‌آلود نسل دوم (Telfast 180mg / Fexofenadine یا Zyrtec / Cetirizine) روزی ۱ عدد برای کنترل فوری و سریع خارش چشم، آبریزش و عطسه. ۲) اسپری استروئیدی داخل بینی (INCS) مانند Rhinocort (Budesonide) یا Nasonex (Mometasone) به عنوان درمان طلایی و خط اول برطرف‌کننده التهاب و گرفتگی شدید بینی (Bunged-up nose) با مصرف منظم روزانه. ۳) آموزش تکنیک صحیح اسپری کورتون: سر متمایل به جلو، اسپری به سمت دیواره خارجی بینی (دور از سپتوم بینی) جهت پیشگیری از خونریزی پرده بینی. ۴) کنترل احتقان حاد: در صورت نیاز به باز شدن فوری در روز اول، مصرف اسپری Otrivin (Xylometazoline) صرفاً برای حداکثر ۳ تا ۵ روز مجاز است تا از احتقان بازگشتی شدید (Rhinitis Medicamentosa) جلوگیری شود.',
          en: 'Australian Gold Standard Allergic Rhinitis Dual Protocol: 1) Oral 2nd-Generation Non-Sedating Antihistamine (Fexofenadine / Telfast 180mg once daily) for rapid control of streaming eyes, itchy palate, and violent sneezing. 2) Intranasal Corticosteroid Spray (INCS - Rhinocort / Budesonide or Nasonex / Mometasone) as 1st-line anti-inflammatory anchor for profound nasal obstruction (bunged-up nose), emphasizing regular daily adherence. 3) Correct INCS Administration Technique: Head slightly forward, spray directed laterally towards the ear (away from nasal septum) to prevent mucosal drying and epistaxis. 4) Acute Decongestant Counseling: If instant unblocking needed today, Otrivin spray may be used as an adjunct strictly capped at 3 to 5 consecutive days to avoid severe rebound congestion (Rhinitis Medicamentosa).',
        },
        patientReply: {
          fa: 'خیلی ممنون رفیق! از توضیح کامل درباره ترکیب تلفاست با اسپری رینوکورت و هشدار مهم در مورد عدم مصرف طولانی اوتریوین بسیار متشکرم.',
          en: 'Brilliant advice mate! Pairing Telfast with the Rhinocort spray and knowing the 5-day limit on Otrivin clears up everything.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید پروتکل ترکیبی Telfast 180mg + اسپری کورتون بینی Rhinocort با آموزش تکنیک صحیح و محدودسازی اسپری بازکننده به ۳-۵ روز',
        en: 'Approved Dual Protocol: Oral Telfast 180mg + INCS Rhinocort Spray + 3-5 Day Otrivin Caution',
      },
      explanation: {
        fa: 'طبق راهنماهای بالینی استرالیا (ASCIA & Therapeutic Guidelines)، در رینیت آلرژیک با گرفتگی شدید بینی، اسپری‌های کورتون داخل بینی (INCS) موثرترین درمان ضدالتهاب هستند. ترکیب با آنتی‌هیستامین نسل دوم سریع‌الاثر علائم چشمی و عطسه را مهار می‌کند. محدودیت مصرف ۳ تا ۵ روزه دکونژستانت‌های موضعی جهت پیشگیری از رینیت دارویی (Rhinitis Medicamentosa) الزامی است.',
        en: 'ASCIA and Therapeutic Guidelines designate Intranasal Corticosteroids (INCS) as the most effective monotherapy for moderate-to-severe allergic rhinitis with nasal congestion. Adding a 2nd-generation non-drowsy oral antihistamine targets ocular and sneezing symptoms. Topical decongestants must never exceed 3-5 days to avoid rebound vasodilation.',
      },
    },
    aussieContext: {
      fa: 'تب یونجه (Hay Fever) در فصل گرده‌افشانی بهار در استرالیا بسیار شایع است و مراجعان به دنبال داروهای قوی بدون افت هوشیاری هستند.',
      en: 'Spring hayfever in Australia frequently triggers severe ocular and nasal symptoms among outdoor workers seeking non-drowsy relief.',
      keyPhrases: [
        { phrase: 'Shocking hayfever', meaningFa: 'آلرژی فصلی بسیار شدید و طاقت‌فرسا', meaningEn: 'Severe allergic rhinitis flare-up triggered by high pollen count' },
        { phrase: 'Bunged up', meaningFa: 'اصطلاح عامیانه برای کیپ شدن و انسداد کامل حفرات بینی', meaningEn: 'Australian slang for heavily congested, blocked nasal passages' },
        { phrase: 'Won\'t make me drowsy', meaningFa: 'داروی آنتی‌هیستامین نسل دوم بدون اثر خواب‌آلودگی', meaningEn: 'Non-sedating antihistamines safe for daytime activities and driving' },
      ],
      adminRule: {
        fa: 'دستورالعمل PSA: اسپری‌های دکونژستانت موضعی (Otrivin/Drixine) به دلیل خطر وابستگی مخاطی و احتقان راجعه نباید بیش از ۳ تا ۵ روز مصرف شوند.',
        en: 'PSA Practice Standard: Topical sympathomimetic nasal sprays must be labeled and counseled with a strict 3-5 day maximum duration warning.',
      },
    },
  },

  {
    id: 'slang-motion-sickness-boat',
    mode: 'MODE_B_SLANG',
    title: {
      fa: 'B3. پیشگیری از دریازدگی قایق‌سواری: Kwells در برابر Travacalm و Phenergan (Motion Sickness for Boat Trip)',
      en: 'B3. Motion Sickness for Boat Trip (Travacalm vs Phenergan vs Kwells)',
    },
    category: { fa: 'بیماری حرکت و گوارش (Motion Sickness)', en: 'Motion Sickness' },
    patientProfile: {
      name: 'Ben Miller',
      age: 31,
      gender: 'مرد (Male)',
      presentation: {
        fa: 'این آخر هفته با یک قایق تفریحی ماهیگیری (Fishing charter) به سمت آب‌های آزاد سیدنی می‌روم و شدیداً دریازده می‌شوم (Seasick). دارویی می‌خواهم که واقعاً مانع تهوع شود ولی مرا کاملاً بیهوش و خواب‌آلود (Knock me out flat) نکند.',
        en: "Heading out on a fishing charter boat out of Sydney Harbour this weekend and I get terrible seasickness. Need something that actually works but won't completely knock me out flat.",
      },
    },
    redFlags: [
      { fa: 'سابقه گلوکوم زاویه بسته (Narrow-angle glaucoma) یا انسداد مجاری ادراری / هایپرتروفی پروستات (منع مصرف داروهای آنتی‌کولینرژیک)', en: 'Narrow-angle glaucoma, prostatic hypertrophy or urinary retention' },
      { fa: 'خواب‌آلودگی شدید و افت هوشیاری با پرومتازین (برچسب هشدار CAL 1 و تداخل با الکل)', en: 'Severe CNS depression / drowsiness with Promethazine (CAL 1 warning)' },
      { fa: 'مصرف دارو پس از شروع تهوع و استفراغ (داروهای بیماری حرکت باید حتماً قبل از مواجهه مصرف شوند)', en: 'Taking prophylaxis after onset of emesis (ineffective gastric emptying)' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار و نوع سفر؟', en: 'W - Who is the patient & trip details?' },
        question: { fa: 'دارو را برای چه کسی می‌خواهید و مدت زمان سفر با قایق چقدر است؟', en: 'Who is the medication for and how long is the boat trip?' },
        answer: { fa: 'برای خودم است؛ یک تور ۶ ساعته ماهیگیری در اقیانوس آزاد از صبح زود شنبه.', en: 'For myself. It is a 6-hour deep-sea fishing trip starting early Saturday morning.' },
      },
      {
        key: 'H',
        label: { fa: 'H - سابقه و شدت دریازدگی؟', en: 'H - Seasickness history & severity?' },
        question: { fa: 'قبلاً چه علائمی از دریازدگی داشته‌اید؟', en: 'What symptoms have you experienced on boats in the past?' },
        answer: {
          fa: 'در سفرهای قبلی به محض مواجهه با امواج بلند، دچار تعریق سرد، تهوع شدید و استفراغ روی عرشه شدم.',
          en: 'On previous trips, as soon as the boat hits choppy ocean swells, I get cold sweats, severe nausea, and end up spewing over the side.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات قبلی؟', en: 'A - Previous remedies tried?' },
        question: { fa: 'قبلاً داروی ضد دریازدگی استفاده کرده‌اید؟', en: 'Have you tried motion sickness tablets before?' },
        answer: {
          fa: 'قرص زنجبیل خوردم که هیچ فایده‌ای نداشت؛ یکی از دوستانم Phenergan پیشنهاد داد اما شنیدم تا ۲۴ ساعت آدم را خواب‌آلود و گیج می‌کند.',
          en: 'Tried ginger pills which did nothing. A mate suggested Phenergan, but I heard it makes you a zombie for 24 hours.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - بیماری زمینه‌ای، پروستات و داروها؟', en: 'T - Glaucoma, prostate & meds?' },
        question: { fa: 'آیا سابقه گلوکوم (آب سیاه)، مشکلات پروستات یا داروی تجویزی دیگری دارید؟', en: 'Any history of glaucoma, enlarged prostate, or other medications?' },
        answer: { fa: 'خیر، هیچ بیماری چشمی یا پروستات ندارم و داروی دیگری مصرف نمی‌کنم.', en: 'No glaucoma, no prostate trouble, not taking any other meds.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'ms1',
        text: {
          fa: 'تجویز دوز بالای Promethazine (Phenergan 25mg) درست در لحظه سوار شدن به قایق همراه با مصرف نوشیدنی‌های الکلی.',
          en: 'Recommend high-dose Phenergan (Promethazine 25mg) right upon boarding and drinking alcohol on deck.',
        },
        patientReply: {
          fa: 'آیا پرومتازین مرا تمام روز خواب‌آلود و گیج نمی‌کند و لذت ماهیگیری را از بین نمی‌برد؟',
          en: 'Won\'t high-dose Phenergan knock me out for the entire trip and ruin my fishing day?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'ms2',
        text: {
          fa: 'تفکیک جامع گزینه‌های ضد دریازدگی استرالیا و آموزش زمان‌بندی طلایی مصرف: ۱) مقایسه گزینه‌ها: الف) هیوسین هیدروبوماید (Kwells 300mcg - قرص جویدنی): سریع‌ترین شروع اثر (۳۰ دقیقه)، بسیار موثر در سرکوب دستگاه دهلیزی گوش میانی، ایجاد خشکی دهان و خواب‌آلودگی خفیف. ب) ترکیب تراواکالم (Travacalm Original - دیمن‌هیدرینات + هیوسین + کافئین): کافئین موجود در آن با خواب‌آلودگی مقابله کرده و هوشیاری را حفظ می‌کند. ج) پرومتازین (Phenergan): طولانی‌اثرترین گزینه اما دارای خواب‌آلودگی بسیار شدید و سنگین (برچسب CAL 1) و احساس گیجی روز بعد. ۲) زمان‌بندی طلایی مصرف: داروهای بیماری حرکت باید حتماً ۳۰ تا ۶۰ دقیقه قبل از سوار شدن به قایق مصرف شوند؛ پس از شروع تهوع و استفراغ، جذب گوارشی متوقف شده و دارو بی‌اثر خواهد بود. ۳) توصیه‌های رفتاری: پرهیز از الکل و غذاهای چرب سنگین، استقرار در وسط قایق (کمترین نوسان)، تنفس هوای آزاد روی عرشه و خیره شدن به خط افق ثابت.',
          en: 'Australian Motion Sickness Prophylaxis Differentiation & Timing Protocol: 1) Product Comparison: a) Hyoscine hydrobromide (Kwells 300mcg chewable tablets) — fastest onset (30 mins), chewable without water, highly effective vestibular suppressor with mild anticholinergic effects (dry mouth, mild sedation). b) Dimenhydrinate + Hyoscine + Caffeine (Travacalm Original) — balanced combination where caffeine counteracts antihistaminic drowsiness to maintain fishing alertness. c) Promethazine (Phenergan) — very long-acting and potent but causes severe sedation (mandatory CAL 1 warning) and next-day hangover. 2) Critical Timing: Prophylaxis MUST be ingested 30 to 60 minutes BEFORE stepping onto the boat; once motion sickness nausea and gastric stasis commence, oral tablets cannot be absorbed. 3) Behavioral Advice: Avoid alcohol and greasy meals, sit amidships (lowest oscillation), stay in fresh air on deck, and fix gaze steadily on the distant horizon.',
        },
        patientReply: {
          fa: 'عالی بود داروساز عزیز! قرص Kwells را انتخاب می‌کنم و حتماً نیم ساعت قبل از حرکت قایق مصرف می‌کنم تا در دریا حالم خوب بماند.',
          en: 'Spot on mate! I will grab the chewable Kwells, take it 45 minutes before stepping onto the boat, and stay out on deck.',
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'تایید انتخاب Kwells 300mcg یا Travacalm Original با تاکید بر مصرف ۳۰-۶۰ دقیقه پیش از سوار شدن به قایق',
        en: 'Approved Kwells 300mcg or Travacalm Original Prophylaxis with 30-60 Min Pre-Departure Timing',
      },
      explanation: {
        fa: 'داروهای بیماری حرکت با مهار گیرنده‌های موسکارینی و هیستامینی H1 در هسته‌های دهلیزی مغز از ارسال سیگنال‌های تهوع جلوگیری می‌کنند. شروع اثر پیشگیرانه حیاتی است، زیرا پس از شروع تهوع حرکتی، تخلیه معده مهار شده و جذب خوراکی مختل می‌گردد.',
        en: 'Motion sickness medications act via central vestibular anticholinergic and H1-antihistaminic pathways. Pre-emptive administration (30-60 mins prior to motion stimulus) is critical because acute motion sickness causes gastric stasis, rendering post-onset oral dosing ineffective.',
      },
    },
    aussieContext: {
      fa: 'قایق‌سواری و تورهای ماهیگیری در آب‌های اقیانوسی استرالیا به دلیل امواج بلند نیازمند مدیریت پیشگیرانه دریازدگی بدون خواب‌آلودگی شدید هستند.',
      en: 'Deep sea fishing charters and ferry rides across open Australian coastal waters generate frequent OTC motion sickness requests.',
      keyPhrases: [
        { phrase: 'Fishing charter', meaningFa: 'تورهای قایق‌سواری و ماهیگیری در اقیانوس آزاد', meaningEn: 'Commercial boat hire for open ocean recreational fishing' },
        { phrase: 'Knock me out flat', meaningFa: 'خواب‌آلودگی شدید که فرد را ناتوان و بیهوش کند', meaningEn: 'Australian idiom for profound sedation rendering someone asleep or incapacitated' },
        { phrase: 'Seasick / Spew over the side', meaningFa: 'تهوع و استفراغ ناشی از تلاطم امواج دریا', meaningEn: 'Colloquial term for acute motion sickness emesis on a vessel' },
      ],
      adminRule: {
        fa: 'استاندارد برچسب‌گذاری استرالیا (CAL Labels): پرومتازین الزاماً نیازمند برچسب هشدار خواب‌آلودگی و منع رانندگی (CAL 1) است.',
        en: 'Australian Cautionary Advisory Labels (CAL): Promethazine requires mandatory CAL 1 (drowsiness and alcohol warnings).',
      },
    },
  },

  {
    id: 'slang-toddler-bark-panadol-baby',
    mode: 'MODE_B_SLANG',
    title: {
      fa: 'B4. سرفه خس‌خس نوپا، تب بالا و منع شربت سرفه زیر ۶ سال (Toddler Chesty Bark & Panadol Baby Triage)',
      en: 'B4. Toddler Chesty Bark & High Temp (Panadol Baby & Cough Triage)',
    },
    category: { fa: 'اطفال و سیستم تنفسی (Pediatric Care)', en: 'Pediatric Care & Triage' },
    patientProfile: {
      name: 'Chloe Adams (مادر Archie)',
      age: 29,
      gender: 'زن (Female)',
      presentation: {
        fa: 'سلام (G\'day)، پسر ۳ ساله کوچولوی من (Little tacker) سرفه خشن و خشک شبیه پارس کردن (Chesty bark) داره و تبش ۳۸.۵ درجه است. می‌شه یک شربت سرفه قوی یا Dimetapp به من بدید تا سرفه‌اش قطع بشه و بتونه بخوابه؟',
        en: "G'day, my little 3-year-old tacker has a nasty chesty bark and a temp of 38.5. Can you give me some strong cough syrup or Dimetapp to stop the cough so he can sleep?",
      },
    },
    redFlags: [
      { fa: 'منع قانونی TGA: فروش هرگونه شربت سرفه و سرماخوردگی بدون نسخه برای کودکان زیر ۶ سال اکیداً ممنوع است!', en: 'TGA statutory contraindication: OTC cough and cold medicines prohibited under 6 years' },
      { fa: 'علائم دیسترس تنفسی و کروپ شدید (Croup): صدای تنفسی استریدور (Stridor) در حال استراحت، فرورفتگی قفسه سینه (Intercostal retractions) و رنگ‌پریدگی', en: 'Severe Croup / Respiratory Distress: Inspiratory stridor at rest, chest indrawing/retractions' },
      { fa: 'بی‌حالی شدید (Lethargy)، ناتوانی در نوشیدن مایعات، تب بالای ۳۹ درجه یا کم‌آبی (Dry nappies >8h)', en: 'Marked lethargy, inability to drink fluids, high fever, severe dehydration' },
    ],
    whatQuestions: [
      {
        key: 'W',
        label: { fa: 'W - بیمار، سن و وزن دقیق؟', en: 'W - Child, age & weight?' },
        question: { fa: 'سن و وزن دقیق کودک شما چقدر است؟', en: 'What is your child\'s exact age and weight?' },
        answer: { fa: 'پسرم آرچی (Archie) ۳ سال دارد و وزنش دقیقاً ۱۴ کیلوگرم است.', en: 'My son Archie is 3 years old and weighs exactly 14 kg.' },
      },
      {
        key: 'H',
        label: { fa: 'H - خصوصیات سرفه و تب؟', en: 'H - Cough nature & fever?' },
        question: { fa: 'سرفه از چه زمانی شروع شده و دمای تب چقدر است؟', en: 'When did the cough start and what was the measured temperature?' },
        answer: {
          fa: 'از دیشب ناگهان با سرفه خشن و صدایی شبیه پارس شروع شد؛ تبش را با دماسنج گوش اندازه گرفتم ۳۸.۵ درجه بود و کمی آبریزش شفاف دارد.',
          en: 'Started suddenly last night with a harsh seal-like barking cough. Temp was 38.5°C on the ear thermometer, mild clear runny nose.',
        },
      },
      {
        key: 'A',
        label: { fa: 'A - اقدامات و داروهای خانگی؟', en: 'A - Actions & remedies given?' },
        question: { fa: 'تاکنون دارویی به کودک داده‌اید؟', en: 'Have you administered any medicines at home?' },
        answer: {
          fa: 'فقط به او آب دادم و در کمد داروها دنبال شربت سرفه Dimetapp برادر بزرگترش می‌گشتم.',
          en: 'Just gave him water sips and was looking in the medicine cabinet for his older brother\'s Dimetapp syrup.',
        },
      },
      {
        key: 'T',
        label: { fa: 'T - علائم دیسترس تنفسی و آسم؟', en: 'T - Respiratory distress & history?' },
        question: { fa: 'آیا صدای خرخر و خس‌خس در نفس کشیدن عادی یا فرورفتگی قفسه سینه دارد؟ سابقه آسم دارد؟', en: 'Any noisy breathing (stridor) while resting, chest sinking in, or asthma history?' },
        answer: { fa: 'خیر، هنگام آرامش صدای خرخر ندارد و فرورفتگی سینه ندارد؛ سابقه آسم هم ندارد.', en: 'No stridor when resting quietly, no chest sinking in, no asthma history.' },
      },
    ],
    dialogueOptions: [
      {
        id: 'pk1',
        text: {
          fa: 'فروش شربت سرماخوردگی Dimetapp حاوی آنتی‌هیستامین و دکسترومتورفان به کودک ۳ ساله.',
          en: 'Dispense Dimetapp pediatric cough mixture or sedating antihistamine syrup to the 3-year-old child.',
        },
        patientReply: {
          fa: 'مگر سازمان TGA استرالیا مصرف شربت‌های سرفه و ضد احتقان را در کودکان زیر ۶ سال ممنوع نکرده است؟',
          en: 'Hasn\'t the TGA banned OTC cough and cold syrups for children under 6 years old?',
        },
        isCorrectAdvice: false,
      },
      {
        id: 'pk2',
        text: {
          fa: 'آموزش ممنوعیت قانونی TGA برای زیر ۶ سال و ارائه راهکار ایمن بر اساس وزن: ۱) ممنوعیت TGA: طبق مصوبه سازمان TGA استرالیا، مصرف کلیه شربت‌های ضد سرفه، دکونژستانت و آنتی‌هیستامین در کودکان زیر ۶ سال به دلیل عدم اثربخشی اثبات‌شده و خطرات جدی مسمومیت و سرکوب تنفسی اکیداً ممنوع است. ۲) کنترل تب و بی‌قراری بر اساس وزن دقیق (۱۴ کیلوگرم): الف) شربت Children\'s Panadol (Paracetamol 24mg/mL): دوز استاندارد ۱۵mg/kg = ۲۱۰mg معادل ۸.۷۵ میلی‌لیتر هر ۴ تا ۶ ساعت (حداکثر ۴ بار در ۲۴ ساعت). ب) یا شربت Nurofen for Children (Ibuprofen 20mg/mL): دوز ۱۰mg/kg = ۱۴۰mg معادل ۷ میلی‌لیتر هر ۶ تا ۸ ساعت همراه شیر/غذا. ۳) درمان‌های حمایتی ایمن: مایعات فراوان، قطره/اسپری سالین بینی (Fess Little Noses)، دستگاه بخور مرطوب، و ۱ تا ۲ قاشق چای‌خوری عسل طبیعی قبل خواب (ایمن برای بالای ۱ سال). ۴) غربالگری پرچم قرمز کروپ (Croup): سرفه با صدای پارس (Barking cough) علامت کروپ ویروسی است؛ در صورت بروز صدای خشن هنگام دم (Stridor) در حالت استراحت، فرورفتگی عضلات دنده‌ها در تنفس، یا بی‌حالی شدید، فوراً به اورژانس بیمارستان یا GP مراجعه شود.',
          en: 'TGA Under-6 Mandate Counseling & Weight-Based Pediatric Protocol: 1) TGA Statutory Contraindication: All OTC cough and cold medicines (antihistamines, antitussives, decongestants) are strictly contraindicated in children under 6 years due to lack of clinical efficacy and established risks of severe toxicity/respiratory depression. 2) Weight-Based Antipyretic Dosing (Weight: 14 kg): a) Children\'s Panadol (Paracetamol 24mg/mL): 15 mg/kg = 210 mg = 8.75 mL every 4-6 hours (max 4 doses in 24 hours). b) Children\'s Nurofen (Ibuprofen 20mg/mL): 10 mg/kg = 140 mg = 7 mL every 6-8 hours with feeds. 3) Safe Supportive Measures: Frequent fluid hydration, saline nasal drops/spray (Fess Little Noses), cool mist vaporiser, 1-2 teaspoons of pure honey before bed (proven safe and effective for children >1 year). 4) Croup Red Flag Screen: Barking seal-like cough suggests viral croup; mother must seek immediate emergency medical care if stridor at rest, chest indrawing/retractions, respiratory rate >40/min, or lethargy occurs.',
        },
        patientReply: {
          fa: 'بسیار سپاسگزارم داروساز عزیز! از قانون TGA مطلع نبودم. حتماً دوز پاراستامول را با سرنگ بر اساس وزن ۱۴ کیلوگرم (۸.۷۵ میلی‌لیتر) اندازه می‌گیرم و علائم تنفسی پسرم را به دقت زیر نظر می‌گیرم.',
          en: "Thank you so much pharmacist! I wasn't aware of the under-6 rule. I will accurately measure Panadol using the oral syringe based on his 14kg weight and keep an eye on his breathing.",
        },
        isCorrectAdvice: true,
      },
    ],
    clinicalOutcome: {
      requiresReferral: false,
      recommendation: {
        fa: 'منع مصرف شربت سرفه OTC برای کودک زیر ۶ سال طبق مصوبه TGA + تنظیم دوز Panadol بر اساس وزن دقیق (14kg = 8.75mL) و غربالگری کروپ',
        en: 'OTC Cough Syrups Prohibited Under 6 Years (TGA Mandate); Approved Weight-Based Panadol Dosing (14kg = 8.75mL) & Croup Monitoring',
      },
      explanation: {
        fa: 'سازمان TGA استرالیا مصرف تمامی داروهای ضد سرفه و سرماخوردگی OTC را در کودکان زیر ۶ سال به دلیل ریسک عوارض خطرناک ممنوع کرده است. تب و ناآرامی باید با پاراستامول یا ایبوپروفن دقیقاً محاسبه‌شده بر اساس وزن کودک (نه سن) کنترل شود. سرفه پارسی نیازمند پایش از نظر کروپ و استریدور تنفسی است.',
        en: 'The TGA strictly prohibits OTC cough/cold preparations in children under 6 years. Pediatric antipyretics must always be dosed by weight (15mg/kg paracetamol, 10mg/kg ibuprofen) using oral syringes. A barking cough warrants close surveillance for croup and inspiratory stridor.',
      },
    },
    aussieContext: {
      fa: 'مدیریت تب و سرفه در کودکان خردسال از پرتکرارترین مراجعات داروخانه‌ای در استرالیا است که نیازمند تبیین قانون TGA و دوزینگ میلی‌لیتری دقیق با سرنگ مدرج است.',
      en: 'Managing toddler fevers and colds is a daily staple of Australian community pharmacy, requiring strict adherence to TGA pediatric bans and oral syringe weight-dosing.',
      keyPhrases: [
        { phrase: 'Little tacker', meaningFa: 'اصطلاح عامیانه استرالیایی برای کودک خردسال یا نوپا', meaningEn: 'Aussie slang for a young child or toddler' },
        { phrase: 'Chesty bark / Barking cough', meaningFa: 'سرفه خشن شبیه صدای سگ یا خوک آبی که در لارنگوتراکئیت (کروپ) دیده می‌شود', meaningEn: 'Harsh seal-like barking cough characteristic of pediatric croup' },
        { phrase: 'TGA Under-6 Mandate', meaningFa: 'ممنوعیت قانونی سازمان TGA برای فروش شربت‌های سرفه به کودکان زیر ۶ سال', meaningEn: 'Mandatory Australian regulatory restriction banning OTC cough/cold syrups for children <6 years' },
      ],
      adminRule: {
        fa: 'دستورالعمل TGA و دوزینگ استرالیا: داروی پاراستامول در اطفال الزاماً باید بر اساس وزن دقیق کودک (۱۵ میلی‌گرم به ازای هر کیلوگرم) با سرنگ مدرج خوراکی دوزبندی شود، نه بر اساس سن.',
        en: 'TGA Pediatric Standard: Paracetamol must always be calculated by exact body weight (15 mg/kg every 4-6h, max 60 mg/kg/day) using calibrated oral dosing syringes.',
      },
    },
  },
];
