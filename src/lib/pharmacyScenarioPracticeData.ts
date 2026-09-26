// Generated from Pharmacy main at 5b4f7d2443a3ed97aea752c1d0d18583ce6d0067; do not edit by hand.
import type { PharmacyPracticeScenario } from './pharmacyScenarioPractice';

export const PHARMACY_PRACTICE_SCENARIOS: PharmacyPracticeScenario[] = [
  {
    "id": "slang-ibuprofen-brand-vs-generic",
    "documentId": "doc-scenario-slang-slang-ibuprofen-brand-vs-generic",
    "titleFa": "B1. برند در برابر ژنریک: Chemist Brand Ibuprofen در برابر Nurofen (Brand vs Generic Debate)",
    "titleEn": "B1. Chemist Brand Ibuprofen vs Nurofen (Brand vs Generic Debate)",
    "mode": "MODE_B_SLANG",
    "categoryFa": "مسکن و داروی ژنریک (Analgesics & Generics)",
    "categoryEn": "Analgesics & Generics",
    "presentationFa": "سلام رفیق (G'day mate)، آیا این ایبوپروفن ارزان برند داروخانه (Chemist brand) دقیقاً عین نوروفن (Nurofen) است؟ چرا نوروفن دو برابر گران‌تر است؟ آیا پولم هدر می‌رود (Am I getting ripped off) یا نوروفن واقعاً کیفیت بالاتری دارد؟",
    "presentationEn": "G'day mate, is this cheap chemist-brand ibuprofen exactly the same stuff as Nurofen? Why is Nurofen double the price? Am I getting ripped off?",
    "patientName": "Jack Cooper",
    "patientAge": 36,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و علت مصرف؟",
        "labelEn": "W - Who is the patient & indication?",
        "questionFa": "ایبوپروفن را برای چه کسی و چه دردی می‌خواهید؟",
        "questionEn": "Who is the ibuprofen for and what pain are you treating?",
        "answerFa": "برای خودم است؛ بعد از تمرین سنگین بدنسازی دیروز دچار گرفتگی عضلانی و سردرد خفیف شده‌ام.",
        "answerEn": "For myself. Got a sore back and mild headache after a heavy gym workout yesterday."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و شدت درد؟",
        "labelEn": "H - Duration & severity?",
        "questionFa": "چند وقت است درد دارید و چقدر شدید است؟",
        "questionEn": "How long have you had the pain and how severe is it?",
        "answerFa": "از دیروز بعدازظهر شروع شده، درد خفیف تا متوسط عضلانی است.",
        "answerEn": "Started yesterday afternoon, mild to moderate muscular ache."
      },
      {
        "key": "A",
        "labelFa": "A - داروهای مصرفی و مقایسه قیمت؟",
        "labelEn": "A - Action taken & price comparison?",
        "questionFa": "آیا داروی دیگری مصرف کرده‌اید و چرا این دو جعبه را مقایسه می‌کنید؟",
        "questionEn": "Have you taken anything else and what caught your eye on the shelf?",
        "answerFa": "هنوز چیزی نخورده‌ام، اما روی قفسه دیدم ایبوپروفن برند داروخانه ۳.۵۰ دلار است ولی نوروفن ۹.۵۰ دلار! می‌خواستم بدانم واقعاً فرقی دارند؟",
        "answerEn": "Haven't taken anything yet. Saw the Chemist Brand is $3.50 while Nurofen is $9.50. Wondering if there's a real difference."
      },
      {
        "key": "T",
        "labelFa": "T - سابقه بیماری گوارشی، آسم و داروها؟",
        "labelEn": "T - Medical history, ulcers & asthma?",
        "questionFa": "آیا سابقه زخم معده، آسم یا داروی تجویزی روزانه دارید؟",
        "questionEn": "Any history of stomach ulcers, asthma, or regular prescribed meds?",
        "answerFa": "خیر، هیچ مشکل معده یا آسمی ندارم و داروی دیگری هم مصرف نمی‌کنم.",
        "answerEn": "No stomach issues, no asthma, not on any other medication."
      }
    ],
    "redFlags": [
      {
        "fa": "سابقه فعال زخم معده یا خونریزی گوارشی (Active GI ulcer / bleeding) و نارسایی حاد کلیه",
        "en": "Active peptic ulcer disease, GI bleeding or severe renal impairment"
      },
      {
        "fa": "آسم ناشی از آسپیرین/NSAID و سابقه واکنش‌های حساسیتی شدید",
        "en": "Aspirin/NSAID-exacerbated respiratory disease (AERD)"
      },
      {
        "fa": "مصرف همزمان چند فرآورده NSAID مختلف به طور همزمان یا با معده خالی",
        "en": "Concomitant multiple NSAID use or ingestion on empty stomach"
      }
    ],
    "dialogueOptions": [
      {
        "id": "bg1",
        "textFa": "به بیمار بگویید نوروفن چون برند اصلی انگلیسی است خلوص بسیار بالاتری دارد و حتماً پول بیشتری برای برند اصلی بپردازد.",
        "textEn": "Tell the patient Nurofen has secret superior ingredients and higher purity, so paying double for the originator brand is always mandatory.",
        "patientReplyFa": "آیا واقعاً سازمان TGA اجازه می‌دهد داروی بی‌کیفیت و ضعیف‌تر تحت عنوان برند داروخانه به فروش برسد؟",
        "patientReplyEn": "Does the TGA really allow lower quality generics on Australian pharmacy shelves?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "bg2",
        "textFa": "مشاوره علمی هم‌ارزی زیستی (Bioequivalence) و استانداردهای سختگیرانه TGA: ۱) هم‌ارزی دارویی: هر دو فرآورده حاوی مولکول دارویی یکسان (Ibuprofen 200mg) با خلوص و اثربخشی زیستی معادل (Bioequivalent) بر اساس استانداردهای سختگیرانه سازمان TGA هستند. ۲) علت تفاوت قیمت: تفاوت قیمت صرفاً ناشی از هزینه‌های تبلیغات تلویزیونی، بازاریابی تجاری و بسته‌بندی پر زرق و برق برند Nurofen است نه تفاوت در اثر درمانی. ۳) تفاوت فرمولاسیون‌های خاص: شکل استاندارد قرص هر دو برند اثر یکسان دارد؛ صرفاً فرمولاسیون‌های کپسول مایع (Liquid Capsules) یا Ibuprofen Sodium Dihydrate (Nurofen Zavance) حدود ۱۰-۱۵ دقیقه سریع‌تر حل می‌شوند اما نهایت اثر تسکین درد کاملاً برابر است. ۴) مشاوره مصرف: مصرف همواره همراه غذا یا یک لیوان شیر جهت محافظت از مخاط معده و اطمینان‌بخشی به بیمار برای صرفه‌جویی مالی با خرید برند ژنریک.",
        "textEn": "Explain Bioequivalence & Australian TGA Standards: 1) Therapeutic Equivalence: Both Chemist-brand Ibuprofen and standard Nurofen tablets contain the exact identical active drug substance (Ibuprofen 200mg) manufactured to the exact same bioequivalence standards mandated by the Australian TGA. 2) Price Difference Explained: The premium price of Nurofen is solely driven by global brand marketing, television advertising, and packaging, not clinical superiority. 3) Formulation Nuances: While liquid-filled capsules (e.g., Nurofen Zavance / liquid capsules) dissolve 10-15 mins faster, standard generic tablets deliver identical analgesic efficacy and pain relief duration. 4) Patient Counseling: Reassure the patient they achieve identical relief saving money with generic, and advise always taking NSAIDs with food or milk to safeguard gastric mucosa.",
        "patientReplyFa": "بسیار ممنون رفیق! از این توضیح شفاف و نجات دادن جیبم از هزینه اضافه بسیار سپاسگزارم. حتماً برند داروخانه را با غذا می‌خورم.",
        "patientReplyEn": "Legend! Thanks for saving me a few bucks and explaining how bioequivalence works under the TGA. I'll grab the Chemist Brand and take it with food.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید انتخاب ایبوپروفن ژنریک (Chemist Brand Ibuprofen 200mg) با تضمین هم‌ارزی زیستی TGA و مشاوره مصرف با غذا",
      "recommendationEn": "Approved Chemist-Brand Ibuprofen 200mg Selection with TGA Bioequivalence Reassurance & Gastric Protection Counseling",
      "explanationFa": "سازمان TGA استرالیا تضمین می‌کند که تمامی داروهای ژنریک ثبت‌شده (AUST R) از نظر فراهمی زیستی و کارایی بالینی با برند مرجع هم‌ارز هستند (دامنه اطمینان ۹۰٪ در بازه ۸۰-۱۲۵٪). داروساز با آموزش بیمار درباره علل بازاریابی اختلاف قیمت، ضمن ارتقای سواد دارویی، در هزینه‌های بیمار صرفه‌جویی می‌کند.",
      "explanationEn": "Under Australian TGA regulations, generic medicines registered with an AUST R number are rigorously tested for bioequivalence against the innovator brand. Educating patients on brand marketing costs vs therapeutic equivalence fosters trust and reduces out-of-pocket healthcare expenses."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/slangScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "slang-severe-hayfever-bunged-nose",
    "documentId": "doc-scenario-slang-slang-severe-hayfever-bunged-nose",
    "titleFa": "B2. تب یونجه شدید، چشم‌های خیس و گرفتگی کامل بینی (Severe Hay Fever & Bunged-Up Nose)",
    "titleEn": "B2. Severe Hay Fever & Bunged-Up Nose (Oral Antihistamine vs INCS vs Decongestant Spray)",
    "mode": "MODE_B_SLANG",
    "categoryFa": "آلرژی و دستگاه تنفسی (Allergy & Rhinitis)",
    "categoryEn": "Allergy & Rhinitis",
    "presentationFa": "رفیق (Mate)، امروز تب یونجه (Hayfever) وحشتناکی گرفتم، چشمانم پر از آب و خارش است و بینی‌ام کاملاً کیپ شده (Bunged up). قوی‌ترین دارویی که پشت پیشخوان داری و گیج و خواب‌آلودم نمی‌کنه چیه؟",
    "presentationEn": "Mate, I've got shocking hayfever today, eyes streaming and nose completely bunged up with the spring pollen. What's the absolute strongest one you've got behind the counter that won't make me drowsy?",
    "patientName": "Craig Davies",
    "patientAge": 45,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و شغل؟",
        "labelEn": "W - Patient & Occupation?",
        "questionFa": "داروی آلرژی را برای چه کسی می‌خواهید و شغل شما چیست؟",
        "questionEn": "Who is the medicine for and what do you do for work?",
        "answerFa": "برای خودم است؛ من سرپرست کارگاه ساختمانی هستم و باید تمام روز در محیط باز باشم و رانندگی کنم.",
        "answerEn": "For myself. I work as a construction site supervisor outdoors and drive all day."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و ماهیت علائم؟",
        "labelEn": "H - Duration & symptoms?",
        "questionFa": "چند روز است علائم دارید و شدت گرفتگی بینی چقدر است؟",
        "questionEn": "How long have you had symptoms and how blocked is your nose?",
        "answerFa": "۳ روز است با افزایش گرده‌های بهاری شروع شده؛ چشمانم مدام اشک می‌ریزد، عطسه‌های رگباری دارم و هر دو مجرای بینی‌ام کاملاً مسدود است و شب‌ها نمی‌توانم بخوابم.",
        "answerEn": "Started 3 days ago with the spring grass pollen. Eyes streaming, non-stop sneezing, and both nostrils are totally blocked so I can't sleep."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات و داروهای قبلی؟",
        "labelEn": "A - Actions & past meds?",
        "questionFa": "تاکنون چه اقداماتی انجام داده‌اید؟",
        "questionEn": "What treatments have you tried so far?",
        "answerFa": "اسپری سرم نمکی استفاده کردم، کمی مجرا را شست اما بینی‌ام همچنان متورم و کیپ است.",
        "answerEn": "Used a saline nasal flush. It cleared some mucus but my nose is still swollen shut."
      },
      {
        "key": "T",
        "labelFa": "T - بیماری زمینه‌ای و داروها؟",
        "labelEn": "T - Medical history & meds?",
        "questionFa": "آیا فشار خون بالا، گلوکوم یا داروی تجویزی دیگری دارید؟",
        "questionEn": "Any high blood pressure, glaucoma, or other daily medications?",
        "answerFa": "خیر، فشار خونم طبیعی است و هیچ داروی دیگری مصرف نمی‌کنم.",
        "answerEn": "No high blood pressure, no eye issues, no other medications."
      }
    ],
    "redFlags": [
      {
        "fa": "مصرف طولانی‌مدت اسپری‌های دکونژستانت موضعی (Otrivin/Drixine بیش از ۳ تا ۵ روز) و خطر احتقان راجعه (Rhinitis Medicamentosa)",
        "en": "Prolonged topical decongestant spray use (>3-5 days) risking rhinitis medicamentosa"
      },
      {
        "fa": "انسداد یک‌طرفه مداوم بینی (Unilateral obstruction)، ترشح بدبو، درد سینوسی شدید یا خونریزی مکرر (Epistaxis)",
        "en": "Unilateral nasal blockage, foul discharge, facial pain, or epistaxis"
      },
      {
        "fa": "خطر خواب‌آلودگی داروهای نسل اول در افراد نیازمند هوشیاری کامل",
        "en": "1st-gen antihistamine sedation risk in machinery operators / drivers"
      }
    ],
    "dialogueOptions": [
      {
        "id": "hf1",
        "textFa": "تحویل اسپری دکونژستانت Otrivin و توصیه به مصرف مداوم آن برای ۳ تا ۴ هفته متوالی بدون کورتون بینی.",
        "textEn": "Dispense Otrivin decongestant spray and advise continuous daily use for 3-4 weeks without an anti-inflammatory spray.",
        "patientReplyFa": "آیا مصرف مداوم اسپری اوتریوین برای یک ماه باعث آسیب به بافت بینی و کیپ شدن بدتر آن نمی‌شود؟",
        "patientReplyEn": "Won't using Otrivin spray continuously for a month ruin my nasal lining and cause rebound blockage?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "hf2",
        "textFa": "ارائه پروتکل استاندارد دوگانه خط اول درمان آلرژی استرالیا: ۱) آنتی‌هیستامین خوراکی غیرخواب‌آلود نسل دوم (Telfast 180mg / Fexofenadine یا Zyrtec / Cetirizine) روزی ۱ عدد برای کنترل فوری و سریع خارش چشم، آبریزش و عطسه. ۲) اسپری استروئیدی داخل بینی (INCS) مانند Rhinocort (Budesonide) یا Nasonex (Mometasone) به عنوان درمان طلایی و خط اول برطرف‌کننده التهاب و گرفتگی شدید بینی (Bunged-up nose) با مصرف منظم روزانه. ۳) آموزش تکنیک صحیح اسپری کورتون: سر متمایل به جلو، اسپری به سمت دیواره خارجی بینی (دور از سپتوم بینی) جهت پیشگیری از خونریزی پرده بینی. ۴) کنترل احتقان حاد: در صورت نیاز به باز شدن فوری در روز اول، مصرف اسپری Otrivin (Xylometazoline) صرفاً برای حداکثر ۳ تا ۵ روز مجاز است تا از احتقان بازگشتی شدید (Rhinitis Medicamentosa) جلوگیری شود.",
        "textEn": "Australian Gold Standard Allergic Rhinitis Dual Protocol: 1) Oral 2nd-Generation Non-Sedating Antihistamine (Fexofenadine / Telfast 180mg once daily) for rapid control of streaming eyes, itchy palate, and violent sneezing. 2) Intranasal Corticosteroid Spray (INCS - Rhinocort / Budesonide or Nasonex / Mometasone) as 1st-line anti-inflammatory anchor for profound nasal obstruction (bunged-up nose), emphasizing regular daily adherence. 3) Correct INCS Administration Technique: Head slightly forward, spray directed laterally towards the ear (away from nasal septum) to prevent mucosal drying and epistaxis. 4) Acute Decongestant Counseling: If instant unblocking needed today, Otrivin spray may be used as an adjunct strictly capped at 3 to 5 consecutive days to avoid severe rebound congestion (Rhinitis Medicamentosa).",
        "patientReplyFa": "خیلی ممنون رفیق! از توضیح کامل درباره ترکیب تلفاست با اسپری رینوکورت و هشدار مهم در مورد عدم مصرف طولانی اوتریوین بسیار متشکرم.",
        "patientReplyEn": "Brilliant advice mate! Pairing Telfast with the Rhinocort spray and knowing the 5-day limit on Otrivin clears up everything.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید پروتکل ترکیبی Telfast 180mg + اسپری کورتون بینی Rhinocort با آموزش تکنیک صحیح و محدودسازی اسپری بازکننده به ۳-۵ روز",
      "recommendationEn": "Approved Dual Protocol: Oral Telfast 180mg + INCS Rhinocort Spray + 3-5 Day Otrivin Caution",
      "explanationFa": "طبق راهنماهای بالینی استرالیا (ASCIA & Therapeutic Guidelines)، در رینیت آلرژیک با گرفتگی شدید بینی، اسپری‌های کورتون داخل بینی (INCS) موثرترین درمان ضدالتهاب هستند. ترکیب با آنتی‌هیستامین نسل دوم سریع‌الاثر علائم چشمی و عطسه را مهار می‌کند. محدودیت مصرف ۳ تا ۵ روزه دکونژستانت‌های موضعی جهت پیشگیری از رینیت دارویی (Rhinitis Medicamentosa) الزامی است.",
      "explanationEn": "ASCIA and Therapeutic Guidelines designate Intranasal Corticosteroids (INCS) as the most effective monotherapy for moderate-to-severe allergic rhinitis with nasal congestion. Adding a 2nd-generation non-drowsy oral antihistamine targets ocular and sneezing symptoms. Topical decongestants must never exceed 3-5 days to avoid rebound vasodilation."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/slangScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "slang-motion-sickness-boat",
    "documentId": "doc-scenario-slang-slang-motion-sickness-boat",
    "titleFa": "B3. پیشگیری از دریازدگی قایق‌سواری: Kwells در برابر Travacalm و Phenergan (Motion Sickness for Boat Trip)",
    "titleEn": "B3. Motion Sickness for Boat Trip (Travacalm vs Phenergan vs Kwells)",
    "mode": "MODE_B_SLANG",
    "categoryFa": "بیماری حرکت و گوارش (Motion Sickness)",
    "categoryEn": "Motion Sickness",
    "presentationFa": "این آخر هفته با یک قایق تفریحی ماهیگیری (Fishing charter) به سمت آب‌های آزاد سیدنی می‌روم و شدیداً دریازده می‌شوم (Seasick). دارویی می‌خواهم که واقعاً مانع تهوع شود ولی مرا کاملاً بیهوش و خواب‌آلود (Knock me out flat) نکند.",
    "presentationEn": "Heading out on a fishing charter boat out of Sydney Harbour this weekend and I get terrible seasickness. Need something that actually works but won't completely knock me out flat.",
    "patientName": "Ben Miller",
    "patientAge": 31,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و نوع سفر؟",
        "labelEn": "W - Who is the patient & trip details?",
        "questionFa": "دارو را برای چه کسی می‌خواهید و مدت زمان سفر با قایق چقدر است؟",
        "questionEn": "Who is the medication for and how long is the boat trip?",
        "answerFa": "برای خودم است؛ یک تور ۶ ساعته ماهیگیری در اقیانوس آزاد از صبح زود شنبه.",
        "answerEn": "For myself. It is a 6-hour deep-sea fishing trip starting early Saturday morning."
      },
      {
        "key": "H",
        "labelFa": "H - سابقه و شدت دریازدگی؟",
        "labelEn": "H - Seasickness history & severity?",
        "questionFa": "قبلاً چه علائمی از دریازدگی داشته‌اید؟",
        "questionEn": "What symptoms have you experienced on boats in the past?",
        "answerFa": "در سفرهای قبلی به محض مواجهه با امواج بلند، دچار تعریق سرد، تهوع شدید و استفراغ روی عرشه شدم.",
        "answerEn": "On previous trips, as soon as the boat hits choppy ocean swells, I get cold sweats, severe nausea, and end up spewing over the side."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Previous remedies tried?",
        "questionFa": "قبلاً داروی ضد دریازدگی استفاده کرده‌اید؟",
        "questionEn": "Have you tried motion sickness tablets before?",
        "answerFa": "قرص زنجبیل خوردم که هیچ فایده‌ای نداشت؛ یکی از دوستانم Phenergan پیشنهاد داد اما شنیدم تا ۲۴ ساعت آدم را خواب‌آلود و گیج می‌کند.",
        "answerEn": "Tried ginger pills which did nothing. A mate suggested Phenergan, but I heard it makes you a zombie for 24 hours."
      },
      {
        "key": "T",
        "labelFa": "T - بیماری زمینه‌ای، پروستات و داروها؟",
        "labelEn": "T - Glaucoma, prostate & meds?",
        "questionFa": "آیا سابقه گلوکوم (آب سیاه)، مشکلات پروستات یا داروی تجویزی دیگری دارید؟",
        "questionEn": "Any history of glaucoma, enlarged prostate, or other medications?",
        "answerFa": "خیر، هیچ بیماری چشمی یا پروستات ندارم و داروی دیگری مصرف نمی‌کنم.",
        "answerEn": "No glaucoma, no prostate trouble, not taking any other meds."
      }
    ],
    "redFlags": [
      {
        "fa": "سابقه گلوکوم زاویه بسته (Narrow-angle glaucoma) یا انسداد مجاری ادراری / هایپرتروفی پروستات (منع مصرف داروهای آنتی‌کولینرژیک)",
        "en": "Narrow-angle glaucoma, prostatic hypertrophy or urinary retention"
      },
      {
        "fa": "خواب‌آلودگی شدید و افت هوشیاری با پرومتازین (برچسب هشدار CAL 1 و تداخل با الکل)",
        "en": "Severe CNS depression / drowsiness with Promethazine (CAL 1 warning)"
      },
      {
        "fa": "مصرف دارو پس از شروع تهوع و استفراغ (داروهای بیماری حرکت باید حتماً قبل از مواجهه مصرف شوند)",
        "en": "Taking prophylaxis after onset of emesis (ineffective gastric emptying)"
      }
    ],
    "dialogueOptions": [
      {
        "id": "ms1",
        "textFa": "تجویز دوز بالای Promethazine (Phenergan 25mg) درست در لحظه سوار شدن به قایق همراه با مصرف نوشیدنی‌های الکلی.",
        "textEn": "Recommend high-dose Phenergan (Promethazine 25mg) right upon boarding and drinking alcohol on deck.",
        "patientReplyFa": "آیا پرومتازین مرا تمام روز خواب‌آلود و گیج نمی‌کند و لذت ماهیگیری را از بین نمی‌برد؟",
        "patientReplyEn": "Won't high-dose Phenergan knock me out for the entire trip and ruin my fishing day?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "ms2",
        "textFa": "تفکیک جامع گزینه‌های ضد دریازدگی استرالیا و آموزش زمان‌بندی طلایی مصرف: ۱) مقایسه گزینه‌ها: الف) هیوسین هیدروبوماید (Kwells 300mcg - قرص جویدنی): سریع‌ترین شروع اثر (۳۰ دقیقه)، بسیار موثر در سرکوب دستگاه دهلیزی گوش میانی، ایجاد خشکی دهان و خواب‌آلودگی خفیف. ب) ترکیب تراواکالم (Travacalm Original - دیمن‌هیدرینات + هیوسین + کافئین): کافئین موجود در آن با خواب‌آلودگی مقابله کرده و هوشیاری را حفظ می‌کند. ج) پرومتازین (Phenergan): طولانی‌اثرترین گزینه اما دارای خواب‌آلودگی بسیار شدید و سنگین (برچسب CAL 1) و احساس گیجی روز بعد. ۲) زمان‌بندی طلایی مصرف: داروهای بیماری حرکت باید حتماً ۳۰ تا ۶۰ دقیقه قبل از سوار شدن به قایق مصرف شوند؛ پس از شروع تهوع و استفراغ، جذب گوارشی متوقف شده و دارو بی‌اثر خواهد بود. ۳) توصیه‌های رفتاری: پرهیز از الکل و غذاهای چرب سنگین، استقرار در وسط قایق (کمترین نوسان)، تنفس هوای آزاد روی عرشه و خیره شدن به خط افق ثابت.",
        "textEn": "Australian Motion Sickness Prophylaxis Differentiation & Timing Protocol: 1) Product Comparison: a) Hyoscine hydrobromide (Kwells 300mcg chewable tablets) — fastest onset (30 mins), chewable without water, highly effective vestibular suppressor with mild anticholinergic effects (dry mouth, mild sedation). b) Dimenhydrinate + Hyoscine + Caffeine (Travacalm Original) — balanced combination where caffeine counteracts antihistaminic drowsiness to maintain fishing alertness. c) Promethazine (Phenergan) — very long-acting and potent but causes severe sedation (mandatory CAL 1 warning) and next-day hangover. 2) Critical Timing: Prophylaxis MUST be ingested 30 to 60 minutes BEFORE stepping onto the boat; once motion sickness nausea and gastric stasis commence, oral tablets cannot be absorbed. 3) Behavioral Advice: Avoid alcohol and greasy meals, sit amidships (lowest oscillation), stay in fresh air on deck, and fix gaze steadily on the distant horizon.",
        "patientReplyFa": "عالی بود داروساز عزیز! قرص Kwells را انتخاب می‌کنم و حتماً نیم ساعت قبل از حرکت قایق مصرف می‌کنم تا در دریا حالم خوب بماند.",
        "patientReplyEn": "Spot on mate! I will grab the chewable Kwells, take it 45 minutes before stepping onto the boat, and stay out on deck.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید انتخاب Kwells 300mcg یا Travacalm Original با تاکید بر مصرف ۳۰-۶۰ دقیقه پیش از سوار شدن به قایق",
      "recommendationEn": "Approved Kwells 300mcg or Travacalm Original Prophylaxis with 30-60 Min Pre-Departure Timing",
      "explanationFa": "داروهای بیماری حرکت با مهار گیرنده‌های موسکارینی و هیستامینی H1 در هسته‌های دهلیزی مغز از ارسال سیگنال‌های تهوع جلوگیری می‌کنند. شروع اثر پیشگیرانه حیاتی است، زیرا پس از شروع تهوع حرکتی، تخلیه معده مهار شده و جذب خوراکی مختل می‌گردد.",
      "explanationEn": "Motion sickness medications act via central vestibular anticholinergic and H1-antihistaminic pathways. Pre-emptive administration (30-60 mins prior to motion stimulus) is critical because acute motion sickness causes gastric stasis, rendering post-onset oral dosing ineffective."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/slangScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "slang-toddler-bark-panadol-baby",
    "documentId": "doc-scenario-slang-slang-toddler-bark-panadol-baby",
    "titleFa": "B4. سرفه خس‌خس نوپا، تب بالا و منع شربت سرفه زیر ۶ سال (Toddler Chesty Bark & Panadol Baby Triage)",
    "titleEn": "B4. Toddler Chesty Bark & High Temp (Panadol Baby & Cough Triage)",
    "mode": "MODE_B_SLANG",
    "categoryFa": "اطفال و سیستم تنفسی (Pediatric Care)",
    "categoryEn": "Pediatric Care & Triage",
    "presentationFa": "سلام (G'day)، پسر ۳ ساله کوچولوی من (Little tacker) سرفه خشن و خشک شبیه پارس کردن (Chesty bark) داره و تبش ۳۸.۵ درجه است. می‌شه یک شربت سرفه قوی یا Dimetapp به من بدید تا سرفه‌اش قطع بشه و بتونه بخوابه؟",
    "presentationEn": "G'day, my little 3-year-old tacker has a nasty chesty bark and a temp of 38.5. Can you give me some strong cough syrup or Dimetapp to stop the cough so he can sleep?",
    "patientName": "Chloe Adams (مادر Archie)",
    "patientAge": 29,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار، سن و وزن دقیق؟",
        "labelEn": "W - Child, age & weight?",
        "questionFa": "سن و وزن دقیق کودک شما چقدر است؟",
        "questionEn": "What is your child's exact age and weight?",
        "answerFa": "پسرم آرچی (Archie) ۳ سال دارد و وزنش دقیقاً ۱۴ کیلوگرم است.",
        "answerEn": "My son Archie is 3 years old and weighs exactly 14 kg."
      },
      {
        "key": "H",
        "labelFa": "H - خصوصیات سرفه و تب؟",
        "labelEn": "H - Cough nature & fever?",
        "questionFa": "سرفه از چه زمانی شروع شده و دمای تب چقدر است؟",
        "questionEn": "When did the cough start and what was the measured temperature?",
        "answerFa": "از دیشب ناگهان با سرفه خشن و صدایی شبیه پارس شروع شد؛ تبش را با دماسنج گوش اندازه گرفتم ۳۸.۵ درجه بود و کمی آبریزش شفاف دارد.",
        "answerEn": "Started suddenly last night with a harsh seal-like barking cough. Temp was 38.5°C on the ear thermometer, mild clear runny nose."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات و داروهای خانگی؟",
        "labelEn": "A - Actions & remedies given?",
        "questionFa": "تاکنون دارویی به کودک داده‌اید؟",
        "questionEn": "Have you administered any medicines at home?",
        "answerFa": "فقط به او آب دادم و در کمد داروها دنبال شربت سرفه Dimetapp برادر بزرگترش می‌گشتم.",
        "answerEn": "Just gave him water sips and was looking in the medicine cabinet for his older brother's Dimetapp syrup."
      },
      {
        "key": "T",
        "labelFa": "T - علائم دیسترس تنفسی و آسم؟",
        "labelEn": "T - Respiratory distress & history?",
        "questionFa": "آیا صدای خرخر و خس‌خس در نفس کشیدن عادی یا فرورفتگی قفسه سینه دارد؟ سابقه آسم دارد؟",
        "questionEn": "Any noisy breathing (stridor) while resting, chest sinking in, or asthma history?",
        "answerFa": "خیر، هنگام آرامش صدای خرخر ندارد و فرورفتگی سینه ندارد؛ سابقه آسم هم ندارد.",
        "answerEn": "No stridor when resting quietly, no chest sinking in, no asthma history."
      }
    ],
    "redFlags": [
      {
        "fa": "منع قانونی TGA: فروش هرگونه شربت سرفه و سرماخوردگی بدون نسخه برای کودکان زیر ۶ سال اکیداً ممنوع است!",
        "en": "TGA statutory contraindication: OTC cough and cold medicines prohibited under 6 years"
      },
      {
        "fa": "علائم دیسترس تنفسی و کروپ شدید (Croup): صدای تنفسی استریدور (Stridor) در حال استراحت، فرورفتگی قفسه سینه (Intercostal retractions) و رنگ‌پریدگی",
        "en": "Severe Croup / Respiratory Distress: Inspiratory stridor at rest, chest indrawing/retractions"
      },
      {
        "fa": "بی‌حالی شدید (Lethargy)، ناتوانی در نوشیدن مایعات، تب بالای ۳۹ درجه یا کم‌آبی (Dry nappies >8h)",
        "en": "Marked lethargy, inability to drink fluids, high fever, severe dehydration"
      }
    ],
    "dialogueOptions": [
      {
        "id": "pk1",
        "textFa": "فروش شربت سرماخوردگی Dimetapp حاوی آنتی‌هیستامین و دکسترومتورفان به کودک ۳ ساله.",
        "textEn": "Dispense Dimetapp pediatric cough mixture or sedating antihistamine syrup to the 3-year-old child.",
        "patientReplyFa": "مگر سازمان TGA استرالیا مصرف شربت‌های سرفه و ضد احتقان را در کودکان زیر ۶ سال ممنوع نکرده است؟",
        "patientReplyEn": "Hasn't the TGA banned OTC cough and cold syrups for children under 6 years old?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "pk2",
        "textFa": "آموزش ممنوعیت قانونی TGA برای زیر ۶ سال و ارائه راهکار ایمن بر اساس وزن: ۱) ممنوعیت TGA: طبق مصوبه سازمان TGA استرالیا، مصرف کلیه شربت‌های ضد سرفه، دکونژستانت و آنتی‌هیستامین در کودکان زیر ۶ سال به دلیل عدم اثربخشی اثبات‌شده و خطرات جدی مسمومیت و سرکوب تنفسی اکیداً ممنوع است. ۲) کنترل تب و بی‌قراری بر اساس وزن دقیق (۱۴ کیلوگرم): الف) شربت Children's Panadol (Paracetamol 24mg/mL): دوز استاندارد ۱۵mg/kg = ۲۱۰mg معادل ۸.۷۵ میلی‌لیتر هر ۴ تا ۶ ساعت (حداکثر ۴ بار در ۲۴ ساعت). ب) یا شربت Nurofen for Children (Ibuprofen 20mg/mL): دوز ۱۰mg/kg = ۱۴۰mg معادل ۷ میلی‌لیتر هر ۶ تا ۸ ساعت همراه شیر/غذا. ۳) درمان‌های حمایتی ایمن: مایعات فراوان، قطره/اسپری سالین بینی (Fess Little Noses)، دستگاه بخور مرطوب، و ۱ تا ۲ قاشق چای‌خوری عسل طبیعی قبل خواب (ایمن برای بالای ۱ سال). ۴) غربالگری پرچم قرمز کروپ (Croup): سرفه با صدای پارس (Barking cough) علامت کروپ ویروسی است؛ در صورت بروز صدای خشن هنگام دم (Stridor) در حالت استراحت، فرورفتگی عضلات دنده‌ها در تنفس، یا بی‌حالی شدید، فوراً به اورژانس بیمارستان یا GP مراجعه شود.",
        "textEn": "TGA Under-6 Mandate Counseling & Weight-Based Pediatric Protocol: 1) TGA Statutory Contraindication: All OTC cough and cold medicines (antihistamines, antitussives, decongestants) are strictly contraindicated in children under 6 years due to lack of clinical efficacy and established risks of severe toxicity/respiratory depression. 2) Weight-Based Antipyretic Dosing (Weight: 14 kg): a) Children's Panadol (Paracetamol 24mg/mL): 15 mg/kg = 210 mg = 8.75 mL every 4-6 hours (max 4 doses in 24 hours). b) Children's Nurofen (Ibuprofen 20mg/mL): 10 mg/kg = 140 mg = 7 mL every 6-8 hours with feeds. 3) Safe Supportive Measures: Frequent fluid hydration, saline nasal drops/spray (Fess Little Noses), cool mist vaporiser, 1-2 teaspoons of pure honey before bed (proven safe and effective for children >1 year). 4) Croup Red Flag Screen: Barking seal-like cough suggests viral croup; mother must seek immediate emergency medical care if stridor at rest, chest indrawing/retractions, respiratory rate >40/min, or lethargy occurs.",
        "patientReplyFa": "بسیار سپاسگزارم داروساز عزیز! از قانون TGA مطلع نبودم. حتماً دوز پاراستامول را با سرنگ بر اساس وزن ۱۴ کیلوگرم (۸.۷۵ میلی‌لیتر) اندازه می‌گیرم و علائم تنفسی پسرم را به دقت زیر نظر می‌گیرم.",
        "patientReplyEn": "Thank you so much pharmacist! I wasn't aware of the under-6 rule. I will accurately measure Panadol using the oral syringe based on his 14kg weight and keep an eye on his breathing.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "منع مصرف شربت سرفه OTC برای کودک زیر ۶ سال طبق مصوبه TGA + تنظیم دوز Panadol بر اساس وزن دقیق (14kg = 8.75mL) و غربالگری کروپ",
      "recommendationEn": "OTC Cough Syrups Prohibited Under 6 Years (TGA Mandate); Approved Weight-Based Panadol Dosing (14kg = 8.75mL) & Croup Monitoring",
      "explanationFa": "سازمان TGA استرالیا مصرف تمامی داروهای ضد سرفه و سرماخوردگی OTC را در کودکان زیر ۶ سال به دلیل ریسک عوارض خطرناک ممنوع کرده است. تب و ناآرامی باید با پاراستامول یا ایبوپروفن دقیقاً محاسبه‌شده بر اساس وزن کودک (نه سن) کنترل شود. سرفه پارسی نیازمند پایش از نظر کروپ و استریدور تنفسی است.",
      "explanationEn": "The TGA strictly prohibits OTC cough/cold preparations in children under 6 years. Pediatric antipyretics must always be dosed by weight (15mg/kg paracetamol, 10mg/kg ibuprofen) using oral syringes. A barking cough warrants close surveillance for croup and inspiratory stridor."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/slangScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "cough-triage",
    "documentId": "doc-scenario-clinical-cough-triage",
    "titleFa": "B5. سرفه مزمن، خلط خونی و تنگی نفس (Chronic Cough >8wks, Hemoptysis & Dyspnea)",
    "titleEn": "B5. Chronic Cough, Hemoptysis & Dyspnea Triage",
    "mode": "MODE_B_SLANG",
    "categoryFa": "دستگاه تنفسی (Respiratory)",
    "categoryEn": "Respiratory System",
    "presentationFa": "بیمار با سرفه شدید خلط‌دار به مدت بیش از ۸ هفته مراجعه کرده و درخواست شربت سرفه اکسپکتورانت قوی بدون نسخه دارد.",
    "presentationEn": "Patient presents requesting a strong OTC cough mixture for a persistent productive cough lasting over 8 weeks.",
    "patientName": "Michael Vance",
    "patientAge": 54,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "داروی سرفه را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the cough medicine for?",
        "answerFa": "برای خودم است.",
        "answerEn": "It is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - مدت زمان و خصوصیات سرفه؟",
        "labelEn": "H - Duration & cough characteristics?",
        "questionFa": "چند وقت است سرفه می‌کنید و آیا سرفه خلط‌دار است یا خونی؟",
        "questionEn": "How long have you had this cough and is there blood or pus?",
        "answerFa": "حدود ۹ هفته است که سرفه می‌کنم و طی ۲ روز گذشته خلط چرکی زرد پررنگ همراه رگه‌های خون دیده‌ام و هنگام بالا رفتن از پله تنگی نفس دارم.",
        "answerEn": "About 9 weeks now. In the past 2 days I noticed yellow purulent sputum with blood streaks and shortness of breath."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Action taken?",
        "questionFa": "تاکنون چه فرآورده‌ای استفاده کرده‌اید؟",
        "questionEn": "What remedies have you tried?",
        "answerFa": "یک شربت سرفه معمولی اکسپکتورانت خریدم اما هیچ تاثیری در قطع سرفه و بهبود تنگی نفسم نداشت.",
        "answerEn": "I bought a standard OTC expectorant syrup, but it had no effect."
      },
      {
        "key": "T",
        "labelFa": "T - داروها و بیماری‌های زمینه‌ای؟",
        "labelEn": "T - Medical history & meds?",
        "questionFa": "آیا داروی تجویزی دیگری مصرف می‌کنید؟",
        "questionEn": "Are you taking any prescribed medications?",
        "answerFa": "برای کنترل فشار خون روزانه قرص Ramipril (داروی ACE Inhibitor) مصرف می‌کنم.",
        "answerEn": "I take Ramipril daily for high blood pressure."
      }
    ],
    "redFlags": [
      {
        "fa": "سرفه مداوم بیش از ۳ تا ۸ هفته (Chronic Cough >8 weeks)",
        "en": "Cough duration > 8 weeks"
      },
      {
        "fa": "مشاهده خلط خونی (Hemoptysis) یا تنگی نفس شدید (Dyspnea)",
        "en": "Hemoptysis or severe dyspnea"
      },
      {
        "fa": "خلط چرکی زرد/سبز، تب، کاهش وزن ناگهانی و مصرف داروی ACEi (Ramipril)",
        "en": "Purulent sputum, fever, weight loss & ACEi therapy"
      }
    ],
    "dialogueOptions": [
      {
        "id": "c1",
        "textFa": "تحویل شربت سرفه اکسپکتورانت (Benadryl/Bisolvon) و توصیه به نوشیدن مایعات گرم.",
        "textEn": "Dispense OTC expectorant cough syrup and recommend warm fluids.",
        "patientReplyFa": "آیا تحویل شربت معمولی برای سرفه ۹ هفته‌ای همراه خلط خونی و تنگی نفس کافی است؟",
        "patientReplyEn": "Is an OTC syrup appropriate for a 9-week cough with blood streaks and shortness of breath?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "c2",
        "textFa": "شناسایی پرچم قرمز بالینی: عدم فروش OTC و ارجاع فوری به GP همراه با نامه رسمی به دلیل سرفه >۸ هفته، خلط خونی (Hemoptysis)، تنگی نفس (Dyspnea)، خلط چرکی و ارزیابی عارضه سرفه ACEi (Ramipril).",
        "textEn": "Red Flag Alert: Refuse OTC supply. Urgent GP Referral for Chest X-ray, sputum microscopy, dyspnea assessment & ACE-inhibitor cough review.",
        "patientReplyFa": "بسیار ممنون داروساز گرامی! فوراً برای معاینه ریه نزد پزشک عمومی می‌روم و نامه ارجاع شما را تحویل می‌دهم.",
        "patientReplyEn": "Thank you pharmacist! I will see my GP urgently today with your referral letter.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "منع فروش OTC - ارجاع فوری به پزشک عمومی جهت رادیوگرافی ریه (CXR) و بررسی بالینی",
      "recommendationEn": "Refuse OTC Supply - Urgent GP Referral for Chest Radiography & Pulmonary Review",
      "explanationFa": "سرفه بیش از ۸ هفته (Chronic Cough)، وجود رگه‌های خون در خلط (Hemoptysis)، خلط چرکی (Purulent Sputum)، تنگی نفس (Dyspnea) و مصرف داروهای ACE Inhibitor (Ramipril) از پرچم‌های قرمز قطعی ارجاع بالینی هستند. فروش داروی OTC در این شرایط باعث تاخیر در تشخیص بیماری‌های جدی ریوی یا عفونت‌های باکتریایی عمیق می‌شود.",
      "explanationEn": "Cough duration >8 weeks combined with hemoptysis, dyspnea, purulent sputum, and ACEi therapy represent critical Red Flags requiring urgent GP assessment, CXR, and sputum culture."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "hayfever-triage",
    "documentId": "doc-scenario-clinical-hayfever-triage",
    "titleFa": "۲. آلرژی فصلی، رانندگان و تمایز Telfast در برابر اسپری Rhinocort (Allergic Rhinitis)",
    "titleEn": "2. Allergic Rhinitis: Telfast vs INCS Rhinocort Triage",
    "mode": "MODE_B_SLANG",
    "categoryFa": "آلرژی و ایمونولوژی (Allergy)",
    "categoryEn": "Allergy & Rhinitis",
    "presentationFa": "بیمار که راننده ماشین‌آلات سنگین است با عطسه شدید، گرفتگی بینی و خارش چشم فصلی مراجعه کرده و داروی ضدآلرژی بدون خواب‌آلودگی می‌خواهد.",
    "presentationEn": "Patient who is a heavy machinery operator presents with severe seasonal rhinitis requesting non-drowsy allergy relief.",
    "patientName": "Mark Stevens",
    "patientAge": 39,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و شغل؟",
        "labelEn": "W - Patient & Occupation?",
        "questionFa": "شغل شما چیست و حساسیت به خواب‌آلودگی دارید؟",
        "questionEn": "What is your job and concern regarding drowsiness?",
        "answerFa": "من اپراتور جرثقیل و راننده تریلی هستم؛ خواب‌آلودگی برایم خطرساز و مرگبار است!",
        "answerEn": "I operate heavy cranes and drive trucks. Drowsiness is extremely dangerous for me!"
      },
      {
        "key": "H",
        "labelFa": "H - مدت و شدت علائم؟",
        "labelEn": "H - Duration & severity?",
        "questionFa": "علائم شما چقدر شدید است و آیا گرفتگی بینی مانع خواب و کار شما می‌شود؟",
        "questionEn": "How severe are your symptoms and does congestion disrupt your sleep?",
        "answerFa": "هر بهار ۴ هفته گرفتار می‌شوم؛ الان گرفتگی شدید بینی دارم به طوری که شب‌ها نمی‌توانم از بینی نفس بکشم.",
        "answerEn": "Every spring for 4 weeks. Currently my nasal congestion is severe and blocks nocturnal breathing."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Previous medication?",
        "questionFa": "قبلاً چه دارویی مصرف کرده‌اید؟",
        "questionEn": "What medications have you taken before?",
        "answerFa": "پارسال قرص Phenergan خوردم که گیج شدم؛ امسال می‌خواهم بدانم تفاوت قرص آلرژی با اسپری بینی چیست.",
        "answerEn": "Last year I took Phenergan which caused severe drowsiness."
      },
      {
        "key": "T",
        "labelFa": "T - علائم یک‌طرفه یا درد سینوس؟",
        "labelEn": "T - Unilateral symptoms?",
        "questionFa": "آیا گرفتگی بینی فقط در یک سمت است؟",
        "questionEn": "Is the congestion restricted to one nostril?",
        "answerFa": "خیر، هر دو طرف بینی گرفته است.",
        "answerEn": "No, both nostrils are congested."
      }
    ],
    "redFlags": [
      {
        "fa": "انسداد یک‌طرفه کامل بینی (Unilateral nasal obstruction) یا خونریزی شدید بینی (Epistaxis)",
        "en": "Unilateral nasal obstruction or severe epistaxis"
      },
      {
        "fa": "خواب‌آلودگی شدید ناشی از آنتی‌هیستامین‌های نسل اول (Phenergan/Promethazine) در رانندگان",
        "en": "Sedation risk of 1st gen antihistamines in drivers"
      }
    ],
    "dialogueOptions": [
      {
        "id": "h1",
        "textFa": "تجویز آنتی‌هیستامین نسل اول Phenergan (Promethazine) به همراه قطره خوراکی ضد احتقان.",
        "textEn": "Dispense 1st-generation sedating antihistamine (Phenergan).",
        "patientReplyFa": "اما من اپراتور جرثقیل هستم! Phenergan باعث خواب‌آلودگی و خطر تصادف می‌شود.",
        "patientReplyEn": "I operate heavy machinery! Phenergan causes severe sedation and accident risks.",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "h2",
        "textFa": "راهنمایی بالینی بر اساس شدت: ۱) برای آلرژی خفیف/مقطعی: آنتی‌هیستامین غیرخواب‌آلود نسل دوم مانند Telfast 180mg (Fexofenadine) روزی ۱ عدد. ۲) برای آلرژی متوسط/شدید همراه گرفتگی بینی (Nasal Congestion): اسپری کورتون استروئیدی بینی (INCS) مانند Rhinocort (Budesonide) یا Nasonex (Mometasone) به عنوان خط اول درمان + آموزش تکنیک صحیح اسپری زدن (سر متمایل به جلو، اسپری به سمت دیواره خارجی بینی جهت جلوگیری از خونریزی پرده بینی).",
        "textEn": "Select 2nd-gen non-sedating antihistamine Telfast 180mg (Fexofenadine) for mild intermittent symptoms OR Intranasal Corticosteroid Spray INCS Rhinocort/Nasonex as 1st-line for moderate-to-severe congestion + INCS administration technique counseling (head tilted forward, spray directed away from septum).",
        "patientReplyFa": "بسیار ممنون! توضیحات دقیق شما درباره شروع اسپری Rhinocort برای گرفتگی بینی و تکنیک صحیح مصرف عالی بود.",
        "patientReplyEn": "Thank you! The explanation regarding INCS spray for blockage and proper spray technique was extremely helpful.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید انتخاب اسپری کورتون بینی (INCS Rhinocort) + قرص Telfast 180mg غیرخواب‌آلود",
      "recommendationEn": "Approved INCS Nasal Spray Rhinocort & Telfast 180mg Non-Sedating Protocol",
      "explanationFa": "بر اساس گایدلاین‌های رینیت آلرژیک استرالیا، آنتی‌هیستامین‌های نسل اول خواب‌آلودکننده در رانندگان و اپراتورهای ماشین‌آلات کاملاً منع مصرف دارند. برای آلرژی‌های همراه با گرفتگی بینی (Nasal blockage)، اسپری کورتون بینی (INCS) خط اول درمان است. آموزش تکنیک صحیح (سر متمایل به جلو، اسپری به سمت دیواره خارجی) از خونریزی پرده بینی (Septal epistaxis) جلوگیری می‌کند.",
      "explanationEn": "1st-generation antihistamines are strictly contraindicated for drivers. For allergic rhinitis with prominent nasal congestion, INCS sprays (Budesonide/Mometasone) are 1st-line therapy. Correct spray technique prevents septal irritation."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "s3-pseudoephedrine",
    "documentId": "doc-scenario-clinical-s3-pseudoephedrine",
    "titleFa": "۳. احتقان بینی و ارزیابی سودوافدرین S3 در NSW",
    "titleEn": "3. Nasal congestion & pseudoephedrine S3 assessment in NSW",
    "mode": "MODE_C_CONFLICT",
    "categoryFa": "ارزیابی بالینی و الزامات محلی S3",
    "categoryEn": "Clinical assessment & local S3 requirements",
    "presentationFa": "سناریو در NSW و بر اساس منابع بررسی‌شده در ۲۶ سپتامبر ۲۰۲۶ است؛ خریدار برای داروساز شناخته‌شده نیست. بیمار با احتقان شدید سینوسی مراجعه کرده و درخواست قرص Sudafed 60mg (Pseudoephedrine S3) بدون نسخه دارد.",
    "presentationEn": "This scenario is set in NSW and reflects sources checked on 26 September 2026; the purchaser is not known to the pharmacist. Patient presents requesting oral Sudafed 60mg (Pseudoephedrine S3) for severe sinus congestion.",
    "patientName": "Sarah Jenkins",
    "patientAge": 29,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "قرص سودوافدرین را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the Sudafed for?",
        "answerFa": "برای خودم است.",
        "answerEn": "It is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - مدت علامت؟",
        "labelEn": "H - Duration?",
        "questionFa": "چند روز است احتقان بینی دارید؟",
        "questionEn": "How long have you had sinus congestion?",
        "answerFa": "از ۲ روز پیش گرفتگی شدید سینوسی دارم.",
        "answerEn": "For 2 days with severe sinus pressure."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "آیا داروی ضداحتقان یا داروی دیگری، از جمله مهارکنندهٔ MAO، مصرف کرده‌اید؟",
        "questionEn": "Have you used another decongestant or any other medicine, including an MAOI?",
        "answerFa": "فقط سرم نمکی استفاده کرده‌ام؛ داروی دیگری یا مهارکنندهٔ MAO مصرف نمی‌کنم.",
        "answerEn": "Only saline; I take no other medicines and no MAOI."
      },
      {
        "key": "T",
        "labelFa": "T - بارداری و فشار خون؟",
        "labelEn": "T - Pregnancy & blood pressure?",
        "questionFa": "باردار هستید یا سابقهٔ فشار خون بالا، بیماری قلبی، پرکاری تیروئید یا مصرف مهارکنندهٔ MAO دارید؟",
        "questionEn": "Are you pregnant, or do you have hypertension, heart disease, hyperthyroidism or MAOI use?",
        "answerFa": "خیر؛ باردار نیستم و فشار خون، بیماری قلبی یا تیروئید ندارم و مهارکنندهٔ MAO هم مصرف نمی‌کنم.",
        "answerEn": "No pregnancy, hypertension, heart disease or thyroid disease, and no MAOI use."
      }
    ],
    "redFlags": [
      {
        "fa": "فشار خون بالای کنترل‌نشده، بیماری ایسکمیک قلبی یا مصرف همزمان MAOI",
        "en": "Uncontrolled hypertension, ischemic heart disease or MAOI therapy"
      },
      {
        "fa": "درخواست‌های تکراری یا الگوی نگران‌کننده را بی‌طرفانه و بر اساس شواهد و رویهٔ محلی بررسی کنید؛ تکرار خرید به‌تنهایی سوءمصرف را ثابت نمی‌کند.",
        "en": "Review repeat requests or a concerning pattern impartially using evidence and local procedures; repeat purchasing alone does not prove misuse."
      }
    ],
    "dialogueOptions": [
      {
        "id": "p1",
        "textFa": "برای پایان‌دادن به گفتگو، بدون ارزیابی درمانی یا رعایت الزام ثبتِ محل عرضه دارو را فوراً تحویل بدهم.",
        "textEn": "To end the conversation, supply immediately without therapeutic assessment or the recording required at the place of supply.",
        "patientReplyFa": "پس لازم نیست وضعیت سلامتی یا مقررات محل را بررسی کنیم؟",
        "patientReplyEn": "So we do not need to check my health or the local requirements?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "p2",
        "textFa": "ابتدا نیاز درمانی، علائم هشدار، داروهای هم‌زمان و برچسب فرآورده را ارزیابی کنید. در این موردِ NSW، تا ۴ نوامبر ۲۰۲۶ فروش را هنگام عرضه در Project STOP ثبت کنید؛ چون خریدار برای داروساز ناشناس است، شناسهٔ مدرک عکس‌دار را نیز ثبت کنید. مدت مصرف را از برچسب همان فرآورده بگویید و قانون جاری را دوباره بررسی کنید.",
        "textEn": "First assess therapeutic need, red flags, concurrent medicines and the product label. In this NSW case, through 4 November 2026, record the sale in Project STOP at supply; because the purchaser is not known to the pharmacist, also record the photo-ID reference. Use this product’s label for duration advice and re-check current law.",
        "patientReplyFa": "ممنون که پیش از تصمیم‌گیری هم وضعیت من و هم مقررات NSW را بررسی کردید.",
        "patientReplyEn": "Thank you for checking both my health and the NSW requirements before deciding.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "ارزیابی کامل بیمار؛ در صورت مناسب‌بودن، ثبت فروش و احراز هویت طبق قانون جاری NSW و مشاوره بر اساس برچسب فرآورده",
      "recommendationEn": "Complete patient assessment; if appropriate, record the sale and verify identity under current NSW law, then counsel using the product label",
      "explanationFa": "سناریو در NSW و بر اساس منابع بررسی‌شده در ۲۶ سپتامبر ۲۰۲۶ است؛ خریدار برای داروساز شناخته‌شده نیست. NSW Health می‌گوید فروش OTC سودوافدرین تا ۴ نوامبر ۲۰۲۶ باید هنگام عرضه در فرم آنلاین و بلادرنگِ تأییدشده ثبت شود؛ اگر هویت خریدار برای داروساز شناخته‌شده نیست، شناسهٔ مدرک عکس‌دار ثبت می‌شود. از ۵ نوامبر ۲۰۲۶ ثبت فروش S3 سودوافدرین در NSW لازم نخواهد بود؛ این تغییر ارزیابی درمانی و سایر الزامات S3 را حذف نمی‌کند. آستانهٔ مقدار بسته برای طبقه‌بندی Schedule را با سقف خرید فردی/تراکنش اشتباه نگیرید. اصلاح تحریریه بر پایهٔ منابع رسمیِ بررسی‌شده در 26 September 2026؛ بازبینی بالینی واجدصلاحیت هنوز انجام نشده است. این متن جایگزین قانون جاری ایالت/قلمرو، سیاست داروخانه یا ارزیابی بیمار نیست.",
      "explanationEn": "This scenario is set in NSW and reflects sources checked on 26 September 2026; the purchaser is not known to the pharmacist. NSW Health says OTC pseudoephedrine sales must be recorded in the approved online, real-time form at supply through 4 November 2026; the photo-ID reference is recorded when the purchaser is not known to the pharmacist. From 5 November 2026, recording S3 pseudoephedrine sales in NSW will no longer be required; this does not remove therapeutic assessment or other S3 requirements. Do not confuse a primary-pack scheduling threshold with an individual or transaction purchase cap. Editorial correction based on official sources accessed 26 September 2026; qualified clinical review has not occurred. This does not replace current state/territory law, pharmacy policy, or patient assessment."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "coldsore-triage",
    "documentId": "doc-scenario-clinical-coldsore-triage",
    "titleFa": "۴. تبخال لب در مرحله اولیه و کرم آکلوویر ۵٪ (Cold Sore / Herpes Labialis)",
    "titleEn": "4. Cold Sore Prodromal Triage & Acyclovir 5% Regimen",
    "mode": "MODE_B_SLANG",
    "categoryFa": "ویروسی و پوست (Viral & Dermatology)",
    "categoryEn": "Viral & Dermatology",
    "presentationFa": "بیمار با سوزش و سوزن‌سوزن شدن اولیه در حاشیه لب مراجعه کرده و قبل از تاول زدن فرآورده درمان تبخال می‌خواهد.",
    "presentationEn": "Patient presents with early tingling and burning on the lip margin before blister formation, requesting cold sore cream.",
    "patientName": "Chloe Bennett",
    "patientAge": 26,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "فرآورده تبخال را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the cold sore treatment for?",
        "answerFa": "برای خودم است.",
        "answerEn": "It is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - مرحله و زمان شروع؟",
        "labelEn": "H - Stage & onset timing?",
        "questionFa": "احساس سوزن‌سوزن شدن از چه زمانی شروع شده و آیا تاول ایجاد شده است؟",
        "questionEn": "When did the tingling start and are blisters present?",
        "answerFa": "حدود ۳ ساعت پیش حس سوزش و سوزن‌سوزن شدن (Prodromal stage) روی لبم شروع شد و هنوز تاول باز نشده است.",
        "answerEn": "About 3 hours ago I felt tingling on my lip. No open blisters yet."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "تاکنون دارویی روی لب زده‌اید؟",
        "questionEn": "Have you applied any cream yet?",
        "answerFa": "خیر، هیچ کرمی نزدم.",
        "answerEn": "No, nothing yet."
      },
      {
        "key": "T",
        "labelFa": "T - علائم چشمی یا بیماری ایمنی؟",
        "labelEn": "T - Eye symptoms?",
        "questionFa": "آیا خارش یا سوزش در چشم دارید؟",
        "questionEn": "Do you have any eye irritation or redness?",
        "answerFa": "خیر، چشم‌هایم کاملاً سالم و بدون علامت است.",
        "answerEn": "No, my eyes feel completely fine."
      }
    ],
    "redFlags": [
      {
        "fa": "ضایعات نزدیک یا داخل چشم (Ocular Herpes - خطر آسیب قرنیه و کوری!)",
        "en": "Lesions in or near the eye (Ocular Herpes risk!)"
      },
      {
        "fa": "تداوم ضایعات بیش از ۱۴ روز، انتشار وسیع پوستی یا بیمار مبتلا به نقص ایمنی",
        "en": "Duration >14 days, widespread skin lesions, or immunocompromised patient"
      }
    ],
    "dialogueOptions": [
      {
        "id": "cs1",
        "textFa": "تحویل کرم کورتون Hydrocortisone 1% روی تبخال لب.",
        "textEn": "Dispense Hydrocortisone 1% cream for lip cold sore.",
        "patientReplyFa": "آیا زدن کورتون تک‌دارویی روی عفونت ویروسی تبخال باعث تکثیر بیشتر ویروس نمی‌شود؟",
        "patientReplyEn": "Doesn't applying a steroid alone on viral herpes cause the virus to proliferate?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "cs2",
        "textFa": "تجویز کرم ضدویروس Acyclovir 5% (Zovirax/Cold Sore Cream) در مرحله پروڈرومال اولیه: مصرف هر ۴ ساعت یک‌بار (۵ بار در روز) به مدت ۵ روز + آموزش رعایت بهداشت دست (شستشوی دست قبل و بعد از مصرف جهت جلوگیری از انتقال ویروس به چشم و افراد دیگر) + استفاده از ضدآفتاب لب (Lip Balm SPF30+).",
        "textEn": "Recommend Acyclovir 5% topical cream (Zovirax) at early prodromal stage: Apply every 4 hours (5 times daily) for 5 days + Hand hygiene counseling (wash hands before/after application to prevent ocular autoinoculation) + Recommend Lip Balm SPF30+.",
        "patientReplyFa": "خیلی ممنون از شروع به موقع درمان ضدویروس آکلوویر ۵٪ و آموزش بهداشت شستشوی دست!",
        "patientReplyEn": "Thank you for recommending prompt Acyclovir 5% antiviral cream and hand hygiene advice!",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید درمان کرم ضدویروس Acyclovir 5% (۵ بار در روز x ۵ روز) + آموزش شستشوی دست",
      "recommendationEn": "Approved Topical Acyclovir 5% Regimen & Hand Hygiene Counseling",
      "explanationFa": "درمان موضعی تبخال (Herpes Labialis) با کرم آکلوویر ۵٪ در صورت شروع در مرحله اولیه پروڈرومال (سوزن‌سوزن شدن) بیشترین کارایی را دارد. دستور دوزینگ استاندارد هر ۴ ساعت (۵ بار در روز) به مدت ۵ روز است. رعایت شستشوی دست جهت جلوگیری از انتقال به چشم (Ocular Herpes) حیاتی است.",
      "explanationEn": "Topical Acyclovir 5% applied during early prodrome reduces healing time and viral shedding. Standard regimen is 5 times daily for 5 days. Hand hygiene prevents autoinoculation to eyes."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "chickenpox-advisory",
    "documentId": "doc-scenario-clinical-chickenpox-advisory",
    "titleFa": "۵. آبله‌مرغان کودک: تسکین علائم و تفاوت راهنماهای ایبوپروفن",
    "titleEn": "5. Childhood Chickenpox: Symptom Relief & Conflicting Ibuprofen Advice",
    "mode": "MODE_B_SLANG",
    "categoryFa": "ویروسی کودکان (Pediatric Viral)",
    "categoryEn": "Pediatric Infections",
    "presentationFa": "مادر کودک ۵ ساله (Leo) با ضایعات تاولی خارش‌دار آبله‌مرغان مراجعه کرده و می‌پرسد آیا حمام آب گرم با روغن یا کرم سنگین برای خارش خوب است و چه مسکنی بدهد.",
    "presentationEn": "Mother of 5yo child presenting with itchy chickenpox vesicles asking about warm baths, bath oils, and fever relief options.",
    "patientName": "Sarah Jenkins (Mother of Leo)",
    "patientAge": 31,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "کودک شما چند سال دارد؟",
        "questionEn": "How old is your child?",
        "answerFa": "پسرم Leo ۵ ساله است.",
        "answerEn": "My son Leo is 5 years old."
      },
      {
        "key": "H",
        "labelFa": "H - مدت ضایعات و خارش؟",
        "labelEn": "H - Duration of vesicles?",
        "questionFa": "تاول‌ها از چه زمانی ظاهر شده‌اند؟",
        "questionEn": "When did the blisters appear?",
        "answerFa": "از دیروز تاول‌های خارش‌دار روی سینه و صورتش درآمده و شدیداً بی‌قراری می‌کند.",
        "answerEn": "They started 2 days ago on his chest and face, intensely itchy."
      },
      {
        "key": "A",
        "labelFa": "A - تصمیمات مادر؟",
        "labelEn": "A - Planned remedies?",
        "questionFa": "چه برنامه‌ای برای حمام و تب کودک داشتید؟",
        "questionEn": "What was your plan for bathing and fever?",
        "answerFa": "می‌خواستم او را در وان آب داغ با روغن بدن ماساژ دهم و شربت ایبوپروفن (Nurofen) بدهم.",
        "answerEn": "I planned a hot bath with body oils and giving Nurofen (Ibuprofen) for fever."
      },
      {
        "key": "T",
        "labelFa": "T - علائم تب و تنفس؟",
        "labelEn": "T - Fever & breathing?",
        "questionFa": "تب کودک چقدر است و آیا تنفس طبیعی دارد؟",
        "questionEn": "What is his temperature and breathing status?",
        "answerFa": "تبش ۳۸.۱ درجه است و تنفسش کاملاً طبیعی است.",
        "answerEn": "His temperature is 38.1C with normal breathing."
      }
    ],
    "redFlags": [
      {
        "fa": "تفاوت راهنمای NSAID: راهنمای RCH و Healthdirect از مصرف ایبوپروفن/NSAID در آبله‌مرغان پرهیز می‌دهند؛ برگهٔ به‌روز شبکهٔ بیمارستان‌های کودکان NSW (۱۳ آوریل ۲۰۲۶) ایبوپروفن یا پاراستامول را برای تب/درد ذکر می‌کند. از تعمیم یک حکم مطلق بدون بررسی راهنمای بالینی محلی پرهیز کنید.",
        "en": "NSAID guidance differs: RCH and Healthdirect advise avoiding ibuprofen/NSAIDs in chickenpox; the Sydney Children’s Hospitals Network factsheet (13 April 2026) lists ibuprofen or paracetamol for fever/pain. Do not generalise a blanket rule without checking current local clinical guidance."
      },
      {
        "fa": "مناطق بزرگ، دردناک و قرمز اطراف تاول‌ها؛ تب بالا، بدحالی یا خواب‌آلودگی فزاینده، تنفس دشوار، کم‌آبی، درد گردن، درد/تغییر بینایی یا ناتوانی در نوشیدن نیازمند ارزیابی پزشکی است؛ در علائم شدید، کمک فوری بگیرید.",
        "en": "Large, sore, red areas around blisters; high fever, worsening illness or drowsiness, breathing difficulty, dehydration, neck pain, eye pain/vision changes, or inability to drink need medical assessment; seek urgent care for severe symptoms."
      },
      {
        "fa": "حمام و فرآورده‌های پوستی را بر پایهٔ راحتی و راهنمای محصول انتخاب کنید؛ منابع بررسی‌شده از ادعای اینکه هر روغن حمام گرما را حبس می‌کند یا عفونت باکتریایی ایجاد می‌کند پشتیبانی نمی‌کنند. آب بسیار داغ را اگر ناراحتی را بدتر می‌کند به‌کار نبرید.",
        "en": "Choose bathing and skin products based on comfort and product guidance; the sources reviewed do not support a claim that all bath oils trap heat or cause bacterial infection. Avoid very hot water if it worsens discomfort."
      }
    ],
    "dialogueOptions": [
      {
        "id": "cp1",
        "textFa": "تایید حمام آب داغ با روغن بدن و دادن شربت ایبوپروفن (Nurofen) برای تب.",
        "textEn": "Approve hot baths with oils and prescribe Ibuprofen (Nurofen) for fever.",
        "patientReplyFa": "آیا حمام داغ و ایبوپروفن در آبله‌مرغان خطرناک نیستند؟",
        "patientReplyEn": "Aren't hot baths and ibuprofen dangerous in chickenpox?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "cp2",
        "textFa": "۱) راهنمای مناسب سن کودک و محل کار را بررسی کنید: RCH و Healthdirect در آبله‌مرغان از NSAIDها مثل ایبوپروفن پرهیز می‌دهند، اما برگهٔ به‌روز Sydney Children’s Hospitals Network در NSW، ایبوپروفن یا پاراستامول را برای تب/درد فهرست می‌کند. چون راهنمای رسمی اختلاف دارد، فقط با اتکا به این سناریو ایبوپروفن ندهید؛ راهنمای جاری محل و سابقهٔ کودک را با پزشک/داروساز بررسی کنید. ۲) اگر کودک به‌دلیل درد یا تب ناراحت است، پاراستامول را فقط طبق دوز سنی/وزنی و برچسب محصول در نظر بگیرید؛ به کودک آسپیرین ندهید. ۳) برای خارش از فرآوردهٔ تسکین‌دهندهٔ مناسب با راهنمایی داروساز استفاده کنید؛ Healthdirect لوسیون‌های تسکین‌دهنده را ذکر می‌کند و Better Health Channel می‌گوید حمام جو دوسر کلوئیدی ممکن است کمک کند. حمام و روغن را منع مطلق ندانید و ادعای افزایش عفونت باکتریایی به‌علت روغن را تکرار نکنید. ۴) مایعات و استراحت را تشویق کنید و ناخن‌ها را کوتاه نگه دارید. برای قرمزی/درد گسترده اطراف تاول، تب بالا، بی‌حالی، تنفس دشوار، کم‌آبی یا علائم چشم/گردن ارزیابی فوری بگیرید.",
        "textEn": "1) Check age-appropriate guidance for the child and your jurisdiction: RCH and Healthdirect advise avoiding NSAIDs such as ibuprofen in chickenpox, while the updated Sydney Children’s Hospitals Network factsheet in NSW lists ibuprofen or paracetamol for fever/pain. Because official guidance differs, do not give ibuprofen based on this scenario alone; check current local guidance and the child’s history with a doctor/pharmacist. 2) If fever or pain is making the child uncomfortable, consider paracetamol only according to the age/weight directions and product label; do not give aspirin. 3) For itch, choose a suitable soothing product with pharmacist advice; Healthdirect mentions soothing lotions and Better Health Channel says colloidal oatmeal baths may help. Do not describe all baths or oils as absolutely prohibited, and do not repeat the unsupported claim that oils increase bacterial infection. 4) Encourage fluids and rest and keep nails short. Seek urgent assessment for extensive painful redness around blisters, high fever, drowsiness, breathing difficulty, dehydration, or eye/neck symptoms.",
        "patientReplyFa": "متوجه شدم؛ دربارهٔ ایبوپروفن راهنماها یکسان نیستند، پس پیش از تصمیم از داروساز یا پزشک می‌پرسم و برای خارش از گزینهٔ تسکین‌دهندهٔ مناسب راهنمایی می‌گیرم.",
        "patientReplyEn": "I understand. The guidance on ibuprofen differs, so I will check with a pharmacist or doctor before deciding and ask about a suitable soothing option for the itch.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "ایبوپروفن را فقط بر پایهٔ این سناریو توصیه نکنید: منابع استرالیایی بررسی‌شده در توصیهٔ مربوط به آبله‌مرغان اختلاف دارند. تا تأیید راهنمای جاری و وضعیت کودک، با GP/داروساز مشورت کنید؛ برای ناراحتی، پاراستامول را فقط طبق برچسب در نظر بگیرید و آسپیرین ندهید. برای خارش از روش تسکین‌دهندهٔ مناسب استفاده کنید و علائم هشدار را پایش کنید.",
      "recommendationEn": "Do not recommend ibuprofen from this scenario alone: the Australian sources reviewed differ in their chickenpox advice. Check current local guidance and the child’s situation with a GP/pharmacist; for discomfort, consider paracetamol only as labelled and do not give aspirin. Use an appropriate itch-relief measure and monitor for red flags.",
      "explanationFa": "Healthdirect (بازبینی مه ۲۰۲۵) و RCH (بازبینی ژوئیهٔ ۲۰۲۱) توصیه می‌کنند در آبله‌مرغان از NSAID/ایبوپروفن پرهیز شود و به افزایش خطر عوارض اشاره می‌کنند. در مقابل، برگهٔ Sydney Children’s Hospitals Network در NSW که ۱۳ آوریل ۲۰۲۶ به‌روز شده، داروی بدون نسخه مثل پاراستامول یا ایبوپروفن را برای تب/درد ذکر می‌کند. بنابراین عبارت «ایبوپروفن در همهٔ موارد منع قطعی است» یا ادعای خطر اثبات‌شدهٔ نکروز فاشیا برای هر مصرف، بدون حل این اختلاف دقیق نیست. دربارهٔ حمام و روغن نیز منابع این ممیزی می‌گویند لوسیون تسکین‌دهنده و حمام جو دوسر ممکن است به خارش کمک کند؛ آن‌ها ادعای حبس گرما/ایجاد عفونت به‌وسیلهٔ همهٔ روغن‌ها را تأیید نمی‌کنند. این اختلاف باید پیش از ارتقای محتوا توسط بازبین بالینی و با تعیین حوزهٔ قضایی حل شود.",
      "explanationEn": "Healthdirect (reviewed May 2025) and RCH advise avoiding NSAIDs/ibuprofen in chickenpox and note increased complication risk. The RCH parent factsheet was reviewed in July 2021 and updated in July 2025; its clinical practice guideline (last updated July 2021) says to avoid NSAIDs because of increased invasive group A Streptococcus risk. In contrast, the Sydney Children’s Hospitals Network NSW factsheet, updated 13 April 2026, lists OTC medicine such as paracetamol or ibuprofen for fever/pain. Therefore, “ibuprofen is absolutely contraindicated in every case” or a proven risk of necrotising fasciitis from any use is not accurate without resolving this discrepancy. For bathing and oils, the reviewed sources say soothing lotions and colloidal oatmeal baths may help itching; they do not support a claim that all oils trap heat or cause infection. A qualified clinical reviewer must resolve this conflict and define jurisdiction before the content can be upgraded."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "hydrocortisone-triage",
    "documentId": "doc-scenario-clinical-hydrocortisone-triage",
    "titleFa": "۶. تریاژ کورتون‌های موضعی: Dermaid 0.5% در برابر Dermaid 1% و Hydrozole S3 (Topical Steroids)",
    "titleEn": "6. Topical Hydrocortisone Triage: Dermaid 0.5% vs 1% vs Hydrozole S3",
    "mode": "MODE_B_SLANG",
    "categoryFa": "درماتولوژی و استروئید (Dermatology)",
    "categoryEn": "Dermatology & Steroids",
    "presentationFa": "بیمار با ضایعه قرمز، ملتهب و خارش‌دار در چین پوستی زیر سینه (Intertrigo) مراجعه کرده و می‌خواهد بداند کدام کرم هیدروکورتیزول (Dermaid 0.5% یا 1% یا Hydrozole) مناسب است.",
    "presentationEn": "Patient presents with an inflamed, itchy red rash in the submammary skin fold asking for guidance between Dermaid 0.5%, Dermaid 1%, and Hydrozole S3.",
    "patientName": "Emma Watson",
    "patientAge": 32,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "کرم پوستی را برای کدام ناحیه بدن می‌خواهید؟",
        "questionEn": "Where is the skin irritation located?",
        "answerFa": "برای زیر سینه‌ام است.",
        "answerEn": "It is in my submammary skin fold."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و ظاهر ضایعه؟",
        "labelEn": "H - Duration & appearance?",
        "questionFa": "چند روز است التهاب دارید و ضایعه چه شکلی دارد؟",
        "questionEn": "How long has it been present and how does it look?",
        "answerFa": "حدود ۱ هفته است قرمزی، سوزش و بوی خفیف در چین پوستی دارم و حاشیه‌هایش لکه‌های قرمز کوچک (Satellite lesions) دارد.",
        "answerEn": "For 1 week with redness, soreness, and satellite papules along the margins."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "تاکنون چه کرمی استفاده کرده‌اید؟",
        "questionEn": "What creams have you applied?",
        "answerFa": "فقط مرطوب‌کننده زدم ولی بدتر شد.",
        "answerEn": "Only moisturizer which made it moist and worse."
      },
      {
        "key": "T",
        "labelFa": "T - چرک یا دیابت؟",
        "labelEn": "T - Pus or diabetes?",
        "questionFa": "آیا چرک زرد رنگ یا سابقه دیابت دارید؟",
        "questionEn": "Is there yellow pus or diabetes history?",
        "answerFa": "چرک ندارد، دیابت هم ندارم.",
        "answerEn": "No pus, no diabetes."
      }
    ],
    "redFlags": [
      {
        "fa": "ضایعه پوستی همراه با ترشحات چرکی زرد رنگ (عفونت باکتریایی ثانویه)",
        "en": "Skin lesion with purulent yellow exudate"
      },
      {
        "fa": "استفاده طولانی‌مدت کورتون‌های قوی روی صورت یا چین‌های پوستی (خطر آتروفی پوست)",
        "en": "Long-term potent steroid use on face or intertriginous skin"
      }
    ],
    "dialogueOptions": [
      {
        "id": "hc1",
        "textFa": "توصیه به مصرف Dermaid 0.5% به تنهایی برای چین پوستی عفونی.",
        "textEn": "Recommend Dermaid 0.5% monotherapy for infected intertrigo.",
        "patientReplyFa": "آیا کورتون تک‌دارویی روی عفونت قارچی چین پوستی باعث گسترش قارچ نمی‌شود؟",
        "patientReplyEn": "Doesn't steroid alone on a fungal intertrigo rash make the fungus spread?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "hc2",
        "textFa": "آموزش تمایز فرآورده‌های هیدروکورتیزون: ۱) Dermaid 0.5% (S2): مخصوص اگزمای خفیف صورت یا پوست نازک کودکان. ۲) Dermaid 1% 30g (S2): مخصوص اگزما و درماتیت غیرعفونی بدن. ۳) Hydrozole S3 (Hydrocortisone 1% + Clotrimazole 1%): انتخاب صحیح بالینی برای ضایعات قارچی همراه التهاب شدید (Intertrigo/Tinea) — مصرف روزی ۲ بار حداکثر به مدت ۷ روز، سپس ادامه درمان با ضدقارچ ساده (Clotrimazole) تا بهبود کامل.",
        "textEn": "Guide Steroid Product Selection: 1) Dermaid 0.5% (S2): Mild facial/infantile eczema. 2) Dermaid 1% (S2): Non-infected body dermatitis. 3) Hydrozole S3 (Hydrocortisone 1% + Clotrimazole 1%): Correct clinical choice for inflamed fungal intertrigo — apply twice daily for max 7 days, then step down to plain antifungal (Clotrimazole) until clear.",
        "patientReplyFa": "خیلی ممنون از تمایز دقیق داروساز! فرآورده ترکیبی Hydrozole S3 را به مدت ۷ روز استفاده می‌کنم و چین پوستی را خشک نگه می‌دارم.",
        "patientReplyEn": "Thank you for explaining the exact differences! I will use Hydrozole S3 for 7 days and keep the skin fold dry.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید انتخاب کرم ترکیبی Hydrozole S3 به مدت حداکثر ۷ روز + آموزش خشک نگه داشتن چین پوستی",
      "recommendationEn": "Approved Hydrozole S3 Combined Antifungal/Steroid Protocol (Max 7 Days)",
      "explanationFa": "ضایعات چین پوستی (Intertrigo) با ضایعات اقماری (Satellite lesions) نشان‌دهنده عفونت قارچی کاندیدایی همراه التهاب است. استفاده از کورتون تنها (Dermaid) باعث Tinea Incognito و گسترش قارچ می‌شود. Hydrozole S3 (Hydrocortisone + Clotrimazole) التهاب شدید را سریع مهار کرده و قارچ را درمان می‌کند (حداکثر ۷ روز مصرف استروئید).",
      "explanationEn": "Fungal intertrigo with satellite papules requires combination therapy. Hydrocortisone monotherapy (Dermaid) is contraindicated as it exacerbates fungal growth. Hydrozole S3 treats both inflammation and fungal pathogen safely for up to 7 days."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "pinworm-triage",
    "documentId": "doc-scenario-clinical-pinworm-triage",
    "titleFa": "۷. انگل کرمک کودکان، مبندازول و تکرار الزامی دوز بعد ۲ هفته (Pinworm / Threadworm Protocol)",
    "titleEn": "7. Pediatric Pinworm: Mebendazole Single & 2-Week Repeat Dose Protocol",
    "mode": "MODE_B_SLANG",
    "categoryFa": "عفونت‌های انگلی (Parasitic Infections)",
    "categoryEn": "Parasitic Infections",
    "presentationFa": "مادر کودک ۶ ساله (Toby) با شکایت از خارش شدید مقعدی کودک در شب مراجعه کرده و داروی کرمک (Vermox / Mebendazole) می‌خواهد.",
    "presentationEn": "Mother of 6yo child presenting with nocturnal perianal itching requesting Vermox (Mebendazole 100mg).",
    "patientName": "Jessica Brown (Mother of Toby)",
    "patientAge": 28,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و سن؟",
        "labelEn": "W - Who is the patient & age?",
        "questionFa": "کودک شما چند سال دارد و آیا بقیه اعضای خانواده علائم دارند؟",
        "questionEn": "How old is your child and are other family members affected?",
        "answerFa": "پسرم ۶ ساله است و خانواده ۴ نفره هستیم.",
        "answerEn": "My son is 6 years old. We are a family of 4."
      },
      {
        "key": "H",
        "labelFa": "H - زمان و خصوصیات خارش؟",
        "labelEn": "H - Symptom timing?",
        "questionFa": "خارش چه زمانی شدیدتر است و آیا کرم سفید دیده‌اید؟",
        "questionEn": "When is itching worse and have you seen white threadworms?",
        "answerFa": "شب‌ها هنگام خواب از شدت خارش مقعد گریه می‌کند و دیشب نخ‌های سفید کوچک متحرک دیدم.",
        "answerEn": "At night he cries from severe anal itch. I saw tiny white thread-like worms last night."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "تاکنون چه دارویی داده‌اید؟",
        "questionEn": "Have you given any treatment yet?",
        "answerFa": "هیچ دارویی ندادم.",
        "answerEn": "No treatment given yet."
      },
      {
        "key": "T",
        "labelFa": "T - سایر اعضای خانواده؟",
        "labelEn": "T - Other family members?",
        "questionFa": "آیا قصد درمان تمام اعضای خانواده را دارید؟",
        "questionEn": "Are you planning to treat the whole household?",
        "answerFa": "فکر می‌کردم فقط باید به کودک مبتلا قرص بدهم!",
        "answerEn": "I thought I only needed to treat the affected child!"
      }
    ],
    "redFlags": [
      {
        "fa": "کودک زیر ۲ سال یا وزن زیر ۱۰ کیلوگرم (نیازمند ارزیابی دوز دقیق یا نظر پزشک)",
        "en": "Child age <2 years or weight <10kg"
      },
      {
        "fa": "عفونت باکتریایی ثانویه شدید پوست مقعد ناشی از خاراندن مداوم",
        "en": "Severe secondary bacterial skin infection from scratching"
      }
    ],
    "dialogueOptions": [
      {
        "id": "pw1",
        "textFa": "تحویل ۱ عدد قرص Vermox (Mebendazole 100mg) فقط برای کودک مبتلا بدون تکرار دوز.",
        "textEn": "Dispense 1 tablet Vermox 100mg for the child only without a 2-week repeat dose.",
        "patientReplyFa": "آیا دادن ۱ قرص به کودک بدون درمان خانواده و بدون تکرار دوز باعث بازگشت کرمک نمی‌شود؟",
        "patientReplyEn": "Won't treating only one child without repeat dosing cause the pinworms to return?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "pw2",
        "textFa": "آموزش پروتکل کامل درمان کرمک (Pinworm / Threadworm): ۱) مصرف ۱ عدد قرص Mebendazole 100mg (Vermox) همزمان برای تمام اعضای خانواده (چه علامت داشته باشند چه نداشته باشند). ۲) تکرار الزامی دوز دوم ۱۰۰ میلی‌گرمی پس از ۲ هفته (۱۴ روز) برای همه: مبندازول کرم‌های بالغ را می‌کشد اما تخم‌های کرمک را نمی‌کشد؛ دوز دوم کرم‌های تازه متولد شده را قبل از تخم‌گذاری مجدد نابود می‌کند. ۳) اقدامات بهداشتی: شستشوی ملحفه‌ها و لباس خواب با آب گرم، کوتاه نگه داشتن ناخن‌ها و شستشوی دست‌ها قبل از غذا.",
        "textEn": "Full Pinworm Mebendazole Protocol: 1) Single 100mg dose Mebendazole (Vermox) simultaneously for ALL household family members (asymptomatic members carry eggs). 2) MANDATORY repeat 100mg dose in 2 weeks (14 days) for everyone — Mebendazole kills adult worms but NOT eggs; 2nd dose kills newly hatched worms before they mature and reproduce. 3) Hygiene measures: Hot water wash of bedding/pajamas, short fingernails, hand washing.",
        "patientReplyFa": "خیلی ممنون از آموزش کامل! بسته ۴ عددی ورماکس می‌خرم، همه خانواده امروز می‌خوریم و ۲ هفته دیگر دوز دوم را تکرار می‌کنیم.",
        "patientReplyEn": "Thank you for the complete guidance! I will buy the family pack, treat everyone today, and repeat in 14 days.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید درمان همزمان تمام اعضای خانواده با Mebendazole 100mg + تکرار الزامی دوز بعد ۱۴ روز",
      "recommendationEn": "Approved Family Household Mebendazole Protocol with Mandatory 2-Week Repeat Dose",
      "explanationFa": "در درمان کرمک (Enterobius vermicularis)، درمان همزمان تمامی اعضای خانواده ضروری است زیرا تخم‌های میکروسکوپی در محیط خانه پخش می‌شوند. مبندازول (Mebendazole 100mg) فقط کرم بالغ را نابود می‌کند و روی تخم‌ها بی‌اثر است؛ لذا تکرار دوز پس از ۲ هفته برای کشتن کرم‌های تازه از تخم درآمده و قطع چرخه انتقال الزامی است.",
      "explanationEn": "Pinworm eggs spread easily across household bedding. Mebendazole 100mg kills adult worms but not eggs. Treating all family members and repeating the dose at 14 days eradicates newly hatched larvae before egg deposition resumes."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "thrush-triage",
    "documentId": "doc-scenario-clinical-thrush-triage",
    "titleFa": "۸. برفک واژینال در بارداری: تأیید تشخیص و انتخاب درمان",
    "titleEn": "8. Vaginal Thrush in Pregnancy: Confirm Diagnosis & Individualise Treatment",
    "mode": "MODE_B_SLANG",
    "categoryFa": "سلامت زنان و ضدقارچ (Womens Health)",
    "categoryEn": "Womens Health",
    "presentationFa": "بیمار با سوزش، خارش شدید واژینال و ترشحات سفید پنپه‌ای مراجعه کرده و تقاضای کپسول خوراکی تک‌دوز Diflucan (Fluconazole 150mg S3) دارد.",
    "presentationEn": "Patient presents with severe vulvovaginal itching and thick white discharge requesting oral Diflucan (Fluconazole 150mg S3).",
    "patientName": "Laura Martinez",
    "patientAge": 28,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "کپسول فلوکونازول را برای خودتان می‌خواهید؟",
        "questionEn": "Is the Diflucan capsule for yourself?",
        "answerFa": "بله، برای خودم است.",
        "answerEn": "Yes, for myself."
      },
      {
        "key": "H",
        "labelFa": "H - علائم و ترشحات؟",
        "labelEn": "H - Symptoms & discharge?",
        "questionFa": "ترشحات شما چه رنگ و شکلی دارد؟",
        "questionEn": "What does the discharge look like?",
        "answerFa": "ترشحات کاملاً سفید تکه‌تکه‌ای شبیه پنیر (Cottage cheese) بدون بوی بد و با خارش شدید دارم.",
        "answerEn": "Thick white cottage-cheese discharge, very itchy, no foul odor."
      },
      {
        "key": "A",
        "labelFa": "A - وضعیت بارداری؟ (CRITICAL)",
        "labelEn": "A - PREGNANCY STATUS?",
        "questionFa": "آیا باردار هستید یا احتمال بارداری وجود دارد؟",
        "questionEn": "Are you currently pregnant or trying to conceive?",
        "answerFa": "بله! من ۱۴ هفته است که باردار هستم.",
        "answerEn": "Yes! I am 14 weeks pregnant."
      },
      {
        "key": "T",
        "labelFa": "T - درد یا خونریزی؟",
        "labelEn": "T - Pain or bleeding?",
        "questionFa": "آیا درد زیر شکم یا خونریزی دارید؟",
        "questionEn": "Do you have pelvic pain or abnormal bleeding?",
        "answerFa": "خیر، فقط خارش و سوزش موضعی است.",
        "answerEn": "No, only local itching."
      },
      {
        "key": "N",
        "labelFa": "N - نخستین بروز یا سابقهٔ تشخیص؟",
        "labelEn": "N - First episode or previously diagnosed?",
        "questionFa": "آیا پیش از این توسط پزشک تشخیص برفک گرفته‌اید یا این نخستین بار است؟",
        "questionEn": "Have you previously had thrush diagnosed by a doctor, or is this your first episode?",
        "answerFa": "این نخستین بار است و قبلاً تشخیص پزشکی نداشته‌ام.",
        "answerEn": "This is my first episode and I have not had a previous medical diagnosis."
      }
    ],
    "redFlags": [
      {
        "fa": "بارداری (هفتهٔ ۱۴) و نخستین بروز علائم: خودتشخیصی قابل اتکا نیست؛ پیش از شروع درمان، تشخیص را با پزشک یا ماما تأیید کنید و در صورت نیاز بررسی/سواب انجام شود.",
        "en": "Pregnancy (14 weeks) with a first episode: self-diagnosis is unreliable; confirm the diagnosis with a doctor or midwife before treatment, with testing or a swab if needed."
      },
      {
        "fa": "فلوکونازول خوراکی را برای خوددرمانی توصیه یا عرضه نکنید. Healthdirect می‌گوید در بارداری از آن پرهیز شود مگر پزشک توصیه کند؛ MotherSafe آن را پس از سه‌ماههٔ اول، فقط در شرایط مشخص، گزینهٔ خط دوم می‌داند.",
        "en": "Do not recommend or supply oral fluconazole for self-treatment. Healthdirect advises avoiding it in pregnancy unless a doctor recommends it; MotherSafe considers it a possible second-line option after the first trimester in specific circumstances."
      },
      {
        "fa": "درد لگنی، خونریزی غیرطبیعی، عود یا عدم پاسخ به درمان نیازمند ارزیابی پزشکی است؛ علائم مشابه ممکن است علت دیگری داشته باشند.",
        "en": "Pelvic pain, abnormal bleeding, recurrence, or failure to improve needs medical assessment; similar symptoms can have another cause."
      }
    ],
    "dialogueOptions": [
      {
        "id": "vt1",
        "textFa": "تحویل کپسول خوراکی Diflucan (Fluconazole 150mg S3) به خانم باردار.",
        "textEn": "Dispense oral Fluconazole 150mg capsule to the pregnant patient.",
        "patientReplyFa": "آیا مصرف قرص خوراکی فلوکونازول در هفته ۱۴ بارداری برای جنین خطرناک نیست؟",
        "patientReplyEn": "Is taking oral fluconazole safe during week 14 of pregnancy for the fetus?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "vt2",
        "textFa": "۱) چون باردارید و این نخستین بروز علائم است، ظاهر ترشحات به‌تنهایی تشخیص را قطعی نمی‌کند؛ پیش از درمان با GP یا ماما مشورت کنید، چون ممکن است معاینه یا سواب لازم باشد. ۲) فلوکونازول خوراکی را برای خوددرمانی توصیه یا عرضه نکنید؛ Healthdirect می‌گوید در بارداری از آن پرهیز شود مگر پزشک توصیه کند. ۳) ضدقارچ واژینال مانند کلوتریمازول یا نیستاتین معمولاً گزینهٔ ترجیحی بارداری است. MotherSafe NSW برای کلوتریمازول ۱٪ کرم یا پِساری ۱۰۰ میلی‌گرم، شبانه به‌مدت ۶ روز را ذکر می‌کند و می‌گوید اپلیکاتور با احتیاط قابل استفاده است. انتخاب محصول را با ارزیابی فردی و راهنمای جاری انجام دهید. ۴) ممنوعیت مطلق برای هر تک‌دوز فلوکونازول بیان نکنید: MotherSafe آن را پس از سه‌ماههٔ اول، در صورت شکست یا عدم تحمل درمان موضعی، گزینهٔ خط دوم می‌داند؛ این به معنی خوددرمانی یا عرضه بدون توصیهٔ حرفه‌ای نیست. ۵) برای درد لگنی، خونریزی غیرطبیعی، عود یا عدم پاسخ، ارزیابی پزشکی لازم است.",
        "textEn": "1) Because you are pregnant and this is your first episode, symptoms alone cannot confirm thrush; speak with your GP or midwife before treatment because examination or a swab may be needed. 2) Do not recommend or supply oral fluconazole for self-treatment; Healthdirect advises avoiding it in pregnancy unless a doctor recommends it. 3) Vaginal antifungals such as clotrimazole or nystatin are generally preferred in pregnancy. MotherSafe NSW lists clotrimazole 1% cream or a 100 mg pessary nightly for 6 days and says vaginal applicators may be used with care. Select a product after individual assessment and against current guidance. 4) Do not describe every single fluconazole dose as absolutely contraindicated: MotherSafe considers it a possible second-line option after the first trimester if topical treatment fails or is not tolerated; this does not mean self-treatment or supply without professional advice. 5) Pelvic pain, abnormal bleeding, recurrence, or failure to improve needs medical assessment.",
        "patientReplyFa": "متوجه شدم؛ پیش از شروع درمان با پزشک یا ماما دربارهٔ تأیید تشخیص و گزینهٔ مناسب بارداری صحبت می‌کنم.",
        "patientReplyEn": "I understand. I will speak with my doctor or midwife to confirm the diagnosis and choose an appropriate treatment in pregnancy before starting therapy.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "به‌دلیل بارداری و نخستین بروز علائم، بیمار را برای تأیید تشخیص و انتخاب درمان به GP یا ماما ارجاع دهید. فلوکونازول را برای خوددرمانی توصیه نکنید؛ درمان موضعی معمولاً ترجیح دارد و هر گزینه باید طبق راهنمای جاری و ارزیابی فردی انتخاب شود.",
      "recommendationEn": "Because the patient is pregnant and this is a first episode, arrange GP or midwife review to confirm the diagnosis and select treatment. Do not recommend fluconazole for self-treatment; topical therapy is generally preferred and any option requires individual assessment under current guidance.",
      "explanationFa": "Healthdirect توصیه می‌کند فرد باردار پیش از شروع درمان با پزشک یا داروساز مشورت کند و برای برفک در بارداری از فلوکونازول پرهیز کند مگر پزشک توصیه کرده باشد. MotherSafe NSW درمان واژینال را ترجیح می‌دهد، اما فلوکونازول را پس از سه‌ماههٔ اول در صورت شکست یا عدم تحمل درمان موضعی خط دوم می‌داند؛ همچنین اپلیکاتور را با احتیاط قابل استفاده می‌داند. پایگاه TGA گزارش‌های مربوط به ۱۵۰ میلی‌گرم در سه‌ماههٔ اول و خطر دوزهای مکرر بالا را ذکر می‌کند. بنابراین عبارت «منع مطلق برای هر تک‌دوز» یا «افزایش اثبات‌شدهٔ خطر در همهٔ موارد» دقیق نیست. این سناریو بازبینی‌نشده است و جایگزین ارزیابی بالینی، اطلاعات محصول یا راهنمای جاری نیست.",
      "explanationEn": "Healthdirect advises pregnant people to speak with a doctor or pharmacist before starting treatment and to avoid fluconazole unless advised by a doctor. MotherSafe NSW prefers vaginal treatment but considers oral fluconazole a possible second-line option after the first trimester if topical treatment fails or is not tolerated; it also says applicators may be used with care. The TGA database notes reports involving 150 mg in the first trimester and concerns with repeated high doses. Therefore, “absolutely contraindicated for every single dose” or “proven increased risk in every case” is not accurate. This scenario remains unreviewed and does not replace clinical assessment, product information, or current guidance."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "shingrix-vaccine",
    "documentId": "doc-scenario-clinical-shingrix-vaccine",
    "titleFa": "۹. واکسن زونا شینگریکس و فواصل دوزینگ در افراد سالم و نقص ایمنی (Shingrix Zoster Vaccine)",
    "titleEn": "9. Shingrix Zoster Vaccine Schedule Advisory",
    "mode": "MODE_B_SLANG",
    "categoryFa": "واکسیناسیون و ایمونولوژی (Vaccines)",
    "categoryEn": "Vaccines & Immunology",
    "presentationFa": "بیمار ۵۶ ساله مراجعه کرده و درباره نحوه تزریق واکسن زونا (Shingrix)، تعداد دوزها و فاصله زمانی بین دوز اول و دوم سوال می‌کند.",
    "presentationEn": "56yo patient presenting to ask about the Shingrix zoster vaccine dosing schedule and intervals.",
    "patientName": "Robert Taylor",
    "patientAge": 56,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و سن؟",
        "labelEn": "W - Who is the patient & age?",
        "questionFa": "واکسن زونا برای چه کسی است و چند سال دارد؟",
        "questionEn": "Who is the shingles vaccine for and what is their age?",
        "answerFa": "برای خودم است و ۵۶ سال دارم.",
        "answerEn": "It is for myself, I am 56 years old."
      },
      {
        "key": "H",
        "labelFa": "H - سابقه زونا یا واکسن قبلی؟",
        "labelEn": "H - Shingles or prior vaccine history?",
        "questionFa": "آیا قبلاً ابتلا به زونا یا واکسن زوستاوکس داشته‌اید؟",
        "questionEn": "Have you had shingles or the Zostavax vaccine before?",
        "answerFa": "خیر، اما دوستم زونا گرفت و دردهای عصبی شدیدی داشت، می‌خواهم واکسن Shingrix بزنم.",
        "answerEn": "No, but my friend had severe nerve pain from shingles, so I want Shingrix protection."
      },
      {
        "key": "A",
        "labelFa": "A - وضعیت سیستم ایمنی؟",
        "labelEn": "A - Immune status?",
        "questionFa": "آیا مبتلا به نقص ایمنی هستید یا داروی تضعیف‌کننده ایمنی مصرف می‌کنید؟",
        "questionEn": "Are you immunocompromised or taking immunosuppressive drugs?",
        "answerFa": "خیر، کاملاً سالم هستم؛ اما می‌خواستم بدانم تفاوت زمان‌بندی افراد سالم با افراد نقص ایمنی چیست.",
        "answerEn": "No, immunocompetent. But I want to know the dosing gap for immunocompetent vs immunocompromised."
      },
      {
        "key": "T",
        "labelFa": "T - بیماری تب‌دار فعلی؟",
        "labelEn": "T - Current illness?",
        "questionFa": "آیا امروز تب یا بیماری عفونی حاد دارید؟",
        "questionEn": "Do you have a fever or acute illness today?",
        "answerFa": "خیر، حالم کاملاً خوب است.",
        "answerEn": "No, feeling completely fine."
      }
    ],
    "redFlags": [
      {
        "fa": "بیماری تب‌دار حاد شدید (تعویق تزریق واکسن تا بهبودی کامل)",
        "en": "Severe acute febrile illness (defer vaccination)"
      },
      {
        "fa": "سابقه حساسیت مفرط و آنفولاکسی شدید به اجزای واکسن Shingrix",
        "en": "History of severe anaphylaxis to Shingrix components"
      }
    ],
    "dialogueOptions": [
      {
        "id": "sv1",
        "textFa": "توضیح اشتباه: Shingrix تک‌دوز است و نیازی به دوز دوم ندارد.",
        "textEn": "Incorrectly state Shingrix is a single-dose vaccine.",
        "patientReplyFa": "مگر شینگریکس واکسن ۲ دوزه نیست؟",
        "patientReplyEn": "Isn't Shingrix a 2-dose recombinant vaccine series?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "sv2",
        "textFa": "مشاوره جامع زمان‌بندی تزریق واکسن غیرزنده نوترکیب Shingrix (۲ دوز عضلانی): ۱) برای افراد با ایمنی طبیعی (Immunocompetent ≥50 سال): فواصل استاندارد دوز اول در ماه ۰ و دوز دوم بین ۲ تا ۶ ماه بعد است. ۲) برای افراد مبتلا به نقص ایمنی (Immunocompromised ≥18 سال): زمان‌بندی فشرده Accelerate دوز اول در ماه ۰ و دوز دوم بین ۱ تا ۲ ماه بعد است. ۳) یادآوری ایمنی: Shingrix غیرزنده است و ایمنی بالای ۹۰٪ در برابر زونا و دردهای عصبی (Post-Herpetic Neuralgia) ایجاد می‌کند.",
        "textEn": "Comprehensive Shingrix (Recombinant Zoster Vaccine) Schedule Counseling: 1) Immunocompetent adults (≥50yo): Standard 2-dose schedule with Dose 1 at Month 0 and Dose 2 at 2 to 6 months. 2) Immunocompromised adults (≥18yo): Accelerated 2-dose schedule with Dose 1 at Month 0 and Dose 2 at 1 to 2 months. 3) Reassure non-live recombinant safety and >90% efficacy against PHN.",
        "patientReplyFa": "بسیار ممنون از مشاوره دقیق داروساز! دوز اول Shingrix را امروز تزریق می‌کنم و دوز دوم را برای ۳ ماه بعد تنظیم می‌کنم.",
        "patientReplyEn": "Thank you for the clear 2-dose Shingrix schedule explanation! I will get Dose 1 today and schedule Dose 2 in 3 months.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید مشاوره ۲ دوزه Shingrix (فاصله ۲ تا ۶ ماه برای افراد سالم / ۱ تا ۲ ماه برای نقص ایمنی)",
      "recommendationEn": "Approved Shingrix 2-Dose Schedule Counseling (2-6 Months Immunocompetent / 1-2 Months Immunocompromised)",
      "explanationFa": "واکسن Shingrix یک واکسن نوترکیب غیرزنده ۲ دوزه برای پیشگیری از زونا است. طبق گایدلاین‌های ایمن‌سازی استرالیا (Australian Immunisation Handbook)، فاصله دوز دوم برای افراد با ایمنی سالم ۵۰ سال به بالا ۲ تا ۶ ماه است، در حالی که در افراد ۱۸ سال به بالا با نقص ایمنی به ۱ تا ۲ ماه کاهش می‌یابد.",
      "explanationEn": "Shingrix is a recombinant subunit non-live 2-dose vaccine. The Australian Immunisation Handbook specifies a 2 to 6-month interval for immunocompetent adults ≥50yo, shortened to 1 to 2 months for immunocompromised individuals ≥18yo."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "ear-triage",
    "documentId": "doc-scenario-clinical-ear-triage",
    "titleFa": "۱۰. درد گوش و پارگی پرده گوش (Ear Pain & TM Perforation Contraindication)",
    "titleEn": "10. Ear Pain & Tympanic Perforation",
    "mode": "MODE_B_SLANG",
    "categoryFa": "گوش، حلق و بینی (ENT)",
    "categoryEn": "ENT & Otology",
    "presentationFa": "بیمار با درد شدید گوش راست و ترشح زرد رنگ جهت خرید قطره جرم‌گیر گوش (Waxsol / Cerumol) مراجعه کرده است.",
    "presentationEn": "Patient presents with severe right ear pain requesting OTC ear drops (Waxsol) for wax removal.",
    "patientName": "David Miller",
    "patientAge": 42,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "قطره گوش را برای چه کسی می‌خواهید؟",
        "questionEn": "Who are the ear drops for?",
        "answerFa": "برای خودم است.",
        "answerEn": "They are for myself."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و ترشح؟",
        "labelEn": "H - Duration & discharge?",
        "questionFa": "درد گوش از چه زمانی شروع شده است؟",
        "questionEn": "When did the ear pain start?",
        "answerFa": "از ۲ روز پیش درد شدید داشتم و دیشب مایع زرد رنگ از گوشم خارج شد.",
        "answerEn": "Severe pain for 2 days with yellowish discharge last night."
      },
      {
        "key": "A",
        "labelFa": "A - سابقه پرده گوش؟",
        "labelEn": "A - Eardrum history?",
        "questionFa": "آیا سابقه پارگی پرده گوش داشته‌اید؟",
        "questionEn": "Do you have a history of a ruptured eardrum?",
        "answerFa": "بله، ۳ سال پیش به دلیل عفونت شدید پرده گوشم پاره شد.",
        "answerEn": "Yes, I had a ruptured eardrum 3 years ago."
      },
      {
        "key": "T",
        "labelFa": "T - مسکن‌ها؟",
        "labelEn": "T - Analgesics?",
        "questionFa": "آیا مسکن خورده‌اید؟",
        "questionEn": "Have you taken analgesics?",
        "answerFa": "پاراستامول خوردم.",
        "answerEn": "Only Paracetamol."
      }
    ],
    "redFlags": [
      {
        "fa": "ترشح زرد یا خونی گوش (Otorrhea) یا سابقه پارگی پرده گوش (TM Perforation)",
        "en": "Ear discharge (Otorrhea) or history of perforated eardrum"
      },
      {
        "fa": "تب بالای ۳۸.۵ یا کاهش شنوایی ناگهانی",
        "en": "Fever >38.5C or sudden hearing loss"
      }
    ],
    "dialogueOptions": [
      {
        "id": "e1",
        "textFa": "تحویل قطره Waxsol و بگویم روزی ۲ بار بچکاند.",
        "textEn": "Dispense Waxsol ear drops.",
        "patientReplyFa": "آیا قطره گوش با وجود ترشح و سابقه پارگی پرده گوش خطرناک نیست؟",
        "patientReplyEn": "Aren't ear drops dangerous with ear discharge and eardrum perforation history?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "e2",
        "textFa": "منع کامل قطره‌های OTC و ارجاع فوری به GP جهت اتوسکوپی: وجود ترشح (Otorrhea) و سابقه پارگی پرده گوش، تمام قطره‌های جرم‌گیر را کاملاً منع مصرف می‌کند (خطر سمیت اتوتوکسیک در گوش میانگاهی).",
        "textEn": "Absolute Contraindication: Refuse OTC ear drops & urgent GP referral for otoscopy. Ceruminolytics are contraindicated in perforated eardrums due to ototoxicity risks.",
        "patientReplyFa": "ممنون که منعیات مصرف را هشدار دادید. فوراً نزد پزشک عمومی می‌روم.",
        "patientReplyEn": "Thank you for explaining the contraindication. I will visit my GP immediately.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "منع قطعی قطره‌های OTC - ارجاع فوری به پزشک عمومی جهت اتوسکوپی",
      "recommendationEn": "Absolute OTC Ear Drops Contraindication - Urgent GP Referral",
      "explanationFa": "ترشح گوش (Otorrhea) یا سابقه پارگی پرده گوش (Tympanic Membrane Perforation) منع مصرف مطلق قطره‌های نرم‌کننده جرم گوش (Waxsol/Cerumol) است، زیرا نفوذ آن‌ها به گوش میانی خطر آسیب شنوایی و اتوتوکسیسیته دارد.",
      "explanationEn": "Ear discharge or perforated tympanic membrane history strictly contraindicates OTC ceruminolytic ear drops due to risk of middle ear ototoxicity."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "dyspepsia-triage",
    "documentId": "doc-scenario-clinical-dyspepsia-triage",
    "titleFa": "۱۱. سوزش معده، گیر کردن غذا در گلو و مدفوع تیره (Dyspepsia, Dysphagia & Melena)",
    "titleEn": "11. Dyspepsia, Dysphagia & Melena Triage",
    "mode": "MODE_B_SLANG",
    "categoryFa": "دستگاه گوارش (Gastrointestinal)",
    "categoryEn": "Gastrointestinal",
    "presentationFa": "بیمار با سوزش شدید معده مراجعه کرده و قرص اس‌امپرازول (Nexium 20mg S3) بدون نسخه می‌خواهد.",
    "presentationEn": "Patient presents requesting OTC Esomeprazole 20mg (Nexium S3) for persistent severe heartburn.",
    "patientName": "Andrew Scott",
    "patientAge": 58,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "دارو را برای خودتان می‌خواهید؟",
        "questionEn": "Is the medicine for yourself?",
        "answerFa": "بله، ۵۸ ساله هستم و برای خودم است.",
        "answerEn": "Yes, I am 58 and it is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و گیر کردن غذا؟",
        "labelEn": "H - Duration & swallowing?",
        "questionFa": "چند وقت است سوزش معده دارید و آیا موقع بلع مشکلی دارید؟",
        "questionEn": "How long have you had heartburn and any difficulty swallowing?",
        "answerFa": "حدود ۶ هفته است سوزش مداوم دارم و جدیداً لقمه جامد در گلویم گیر می‌کند.",
        "answerEn": "For 6 weeks daily. Recently solid food gets stuck when I swallow."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "چه دارویی مصرف کرده‌اید؟",
        "questionEn": "What antacids have you taken?",
        "answerFa": "شربت Mylanta خوردم فایده نداشت.",
        "answerEn": "Mylanta gave only temporary relief."
      },
      {
        "key": "T",
        "labelFa": "T - رنگ مدفوع و وزن؟",
        "labelEn": "T - Stool color & weight?",
        "questionFa": "آیا مدفوع تیره یا کاهش وزن داشته‌اید؟",
        "questionEn": "Have you noticed dark stools or weight loss?",
        "answerFa": "مدفوعم کاملاً تیره شبیه قیر شده و ۴ کیلو هم بی‌دلیل وزن کم کرده‌ام.",
        "answerEn": "My stools look dark and tarry, and I lost 4kg unintentionally."
      }
    ],
    "redFlags": [
      {
        "fa": "دشواری در بلع غذا (Dysphagia) یا گیر کردن لقمه در گلو",
        "en": "Difficulty swallowing (Dysphagia) or food impaction"
      },
      {
        "fa": "مدفوع تیره قیری (Melena) یا کاهش وزن ناخواسته بالای ۵۵ سال",
        "en": "Melena (dark tarry stools) or unexplained weight loss >55yo"
      }
    ],
    "dialogueOptions": [
      {
        "id": "g1",
        "textFa": "تحویل یک بسته ۱۴ عددی Nexium 20mg S3 و توصیه به مصرف روزانه.",
        "textEn": "Dispense a 14-day pack of Nexium 20mg S3.",
        "patientReplyFa": "آیا اس‌امپرازول مشکل گیر کردن غذا در گلو و مدفوع سیاهم را درمان می‌کند؟",
        "patientReplyEn": "Will Esomeprazole fix my difficulty swallowing and dark stools?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "g2",
        "textFa": "شناسایی پرچم قرمز بالینی: عدم فروش OTC و ارجاع فوری به GP جهت آندوسکوپی فوقانی (Gastroscopy): وجود Dysphagia (گیر کردن غذا)، Melena (مدفوع تیره) و کاهش وزن در سن بالای ۵۵ سال، پرچم‌های قرمز قطعی سرطانی یا خونریزی گوارشی هستند.",
        "textEn": "Red Flag Alert: Refuse OTC PPI & urgent GP referral for upper GI endoscopy (gastroscopy) due to Dysphagia, Melena, and unexplained weight loss in a 58yo patient.",
        "patientReplyFa": "خیلی ممنون از تشخیص دقیق! فوراً نزد پزشک عمومی می‌روم.",
        "patientReplyEn": "Thank you for spotting these alarming red flags. I will see my GP immediately.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "منع فروش OTC - ارجاع فوری به GP جهت آندوسکوپی فوقانی (Gastroscopy)",
      "recommendationEn": "Do NOT Supply OTC PPI - Urgent GP Referral for Gastroscopy",
      "explanationFa": "بروز Dysphagia (دشواری بلع)، Melena (مدفوع تیره قیری)، کاهش وزن ناخواسته و علائم جدید گوارشی در سن بالای ۵۵ سال، پرچم‌های قرمز خطرساز خونریزی گوارش یا زخم و بدخیمی مری/معده هستند و نیازمند آندوسکوپی فوری می‌باشند.",
      "explanationEn": "New-onset dyspepsia with dysphagia, melena, and weight loss in patients >55 are major GI red flags requiring urgent endoscopic evaluation."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "sunburn-triage",
    "documentId": "doc-scenario-clinical-sunburn-triage",
    "titleFa": "۱۲. آفتاب‌سوختگی شدید، تاول‌های وسیع و تب (Severe Sunburn & Systemic Toxicity)",
    "titleEn": "12. Severe Sunburn & Systemic Toxicity",
    "mode": "MODE_B_SLANG",
    "categoryFa": "پوست و سوختگی (Dermatology)",
    "categoryEn": "Dermatology & Burns",
    "presentationFa": "بیمار با آفتاب‌سوختگی بسیار شدید، تاول‌های وسیع و لرز پس از ساحل مراجعه کرده و اسپری بی‌حسی Solarcaine می‌خواهد.",
    "presentationEn": "Patient presents with severe painful sunburn and extensive blistering after a beach day requesting Solarcaine spray.",
    "patientName": "Jessica Brown",
    "patientAge": 24,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "درمان آفتاب‌سوختگی برای چه کسی است؟",
        "questionEn": "Who is the sunburn treatment for?",
        "answerFa": "برای خودم است.",
        "answerEn": "It is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - زمان مواجهه؟",
        "labelEn": "H - Exposure timing?",
        "questionFa": "چند ساعت زیر آفتاب بوده‌اید؟",
        "questionEn": "How long were you in the sun?",
        "answerFa": "دیروز ۶ ساعت بدون ضدآفتاب در ساحل بودم.",
        "answerEn": "Yesterday 6 hours at the beach without sunscreen."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "چه اقدامی انجام داده‌اید؟",
        "questionEn": "What treatment have you applied?",
        "answerFa": "دوش آب سرد گرفتم فایده نداشت.",
        "answerEn": "Cold shower gave no relief."
      },
      {
        "key": "T",
        "labelFa": "T - تاول و تب؟",
        "labelEn": "T - Blisters & fever?",
        "questionFa": "آیا تاول یا تب دارید؟",
        "questionEn": "Do you have blisters or fever?",
        "answerFa": "تمام پشتم تاول‌های بزرگ زده، تب ۳۸.۸ دارم و شديداً می‌لرزم.",
        "answerEn": "My whole back is covered in fluid blisters, fever 38.8C and severe chills."
      }
    ],
    "redFlags": [
      {
        "fa": "تاول‌های پوشاننده بیش از ۲۰٪ سطح بدن (BSA >20%)",
        "en": "Widespread blistering covering >20% body surface area"
      },
      {
        "fa": "علائم مسمومیت سیستمیک (تب بالای ۳۸.۵، لرز شدید، سرگیجه و دهیدراتاسیون)",
        "en": "Systemic toxicity (fever >38.5C, chills, dizziness & dehydration)"
      }
    ],
    "dialogueOptions": [
      {
        "id": "s1",
        "textFa": "تحویل اسپری Solarcaine و توصیه به ترکاندن تاول‌ها.",
        "textEn": "Dispense Solarcaine spray and advise popping blisters.",
        "patientReplyFa": "آیا اسپری بی‌حسی با وجود تب ۳۸.۸ و تاول‌های وسیع کافی است؟",
        "patientReplyEn": "Is a topical spray enough with 38.8C fever and extensive blisters?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "s2",
        "textFa": "شناسایی پرچم قرمز: منع فرآورده‌های بی‌حسی موضعی OTC؛ ارجاع فوری به اورژانس بیمارستان (ED) به دلیل مسمومیت سیستمیک آفتاب (Sun Poisoning)، تاول‌های وسیع (>۲۰٪ سطح بدن) و دهیدراتاسیون.",
        "textEn": "Red Flag Alert: Avoid OTC topical anesthetics. Immediate ED referral for IV rehydration and 2nd-degree burn care due to sun poisoning and >20% BSA blisters.",
        "patientReplyFa": "متشکرم. حالت تهوع و لرز شدیدی دارم و فوراً به اورژانس مراجعه می‌کنم.",
        "patientReplyEn": "Thank you. I feel shaky and nauseous, I will go to the Emergency Department right away.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "منع درمان OTC - ارجاع فوری به بخش اورژانس بیمارستان (ED Referral)",
      "recommendationEn": "Refuse OTC Therapy - Urgent Emergency Department Referral",
      "explanationFa": "تاول‌های وسيع سوختگی (>۲۰٪ سطح بدن) همراه با تب، لرز و دهیدراتاسیون نشان‌دهنده مسمومیت سیستمیک آفتاب (Sun Poisoning) و سوختگی درجه ۲ وسیع است که نیازمند سرم‌تراپی بیمارستانی است.",
      "explanationEn": "Extensive 2nd-degree sunburn blisters covering >20% BSA with systemic signs represent sun poisoning requiring fluid resuscitation and hospital burn care."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "musculoskeletal-triage",
    "documentId": "doc-scenario-clinical-musculoskeletal-triage",
    "titleFa": "۱۳. پیچ‌خوردگی مچ پا، قانون Ottawa Ankle Rules و پروتکل RICER (Soft Tissue Injury)",
    "titleEn": "13. Ankle Injury: Ottawa Ankle Rules & RICER Protocol",
    "mode": "MODE_B_SLANG",
    "categoryFa": "عضلانی و اسکلتی (Musculoskeletal)",
    "categoryEn": "Musculoskeletal & Pain",
    "presentationFa": "بیمار با پیچ‌خوردگی شدید مچ پا طی بسکتبال مراجعه کرده و قرص Panadol Osteo (Paracetamol MR 665mg S3) می‌خواهد.",
    "presentationEn": "Patient presents with an acute ankle sprain requesting Panadol Osteo (Paracetamol MR 665mg S3).",
    "patientName": "Liam Davis",
    "patientAge": 35,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "آسیب مچ پا برای چه کسی پیش آمده است؟",
        "questionEn": "Who injured their ankle?",
        "answerFa": "برای خودم است.",
        "answerEn": "It is for myself."
      },
      {
        "key": "H",
        "labelFa": "H - زمان و نحوه حادثه؟",
        "labelEn": "H - Timing & mechanism?",
        "questionFa": "حادثه چه زمانی اتفاق افتاد؟",
        "questionEn": "When did the injury happen?",
        "answerFa": "۳ ساعت پیش هنگام پریدن مچ پایم پیچ خورد و فوراً متورم شد.",
        "answerEn": "3 hours ago landing from a jump, swelled up immediately."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی؟",
        "labelEn": "A - Actions taken?",
        "questionFa": "چه اقدامی انجام داده‌اید؟",
        "questionEn": "What treatment have you applied?",
        "answerFa": "پایم را داخل وان آب گرم گذاشتم اما تورمش خیلی بیشتر شد!",
        "answerEn": "I put my foot in hot water, but swelling worsened!"
      },
      {
        "key": "T",
        "labelFa": "T - توانایی راه رفتن؟",
        "labelEn": "T - Walking ability?",
        "questionFa": "آیا می‌توانید روی پا بایستید یا ۴ گام بردارید؟",
        "questionEn": "Can you bear weight or walk 4 steps?",
        "answerFa": "به هیچ وجه! اصلاً نمی‌توانم پایم را روی زمین بگذارم.",
        "answerEn": "No way! Complete inability to bear weight."
      }
    ],
    "redFlags": [
      {
        "fa": "عدم توانایی در تحمل وزن یا عدم توانایی در برداشتن ۴ گام (Ottawa Ankle Rules Positive)",
        "en": "Inability to bear weight or walk 4 steps (Ottawa Ankle Rules positive)"
      },
      {
        "fa": "دفرمیتی استخوانی شدید یا بی‌حسی اندام",
        "en": "Deformity or bone tenderness"
      }
    ],
    "dialogueOptions": [
      {
        "id": "m1",
        "textFa": "تحویل Panadol Osteo و توصیه به ادامه گرم کردن مچ پا.",
        "textEn": "Dispense Panadol Osteo and advise hot compresses.",
        "patientReplyFa": "آیا آب گرم و قرص آرتروز بدون عکسبرداری مچ پا درست است؟",
        "patientReplyEn": "Is applying heat and taking osteoarthritis pills without an X-ray correct?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "m2",
        "textFa": "شناسایی پرچم قرمز: ارجاع فوری به GP جهت عکسبرداری X-Ray (قانون Ottawa Ankle Rules مثبت به دلیل عدم توانایی در تحمل وزن) + آموزش پروتکل RICER (Rest, Ice 20min/2h, Compression, Elevation, Referral) و پرهیز از عوامل HARM (No Heat, Alcohol, Running, Massage) + تمایز Paracetamol IR حاد در برابر Paracetamol MR (Panadol Osteo S3 مخصوص آرتروز).",
        "textEn": "Red Flag Alert: Immediate GP Referral for X-ray (Ottawa Ankle Rules positive due to inability to bear weight) + RICER Protocol + Avoid HARM (No Heat, Alcohol, Running, Massage) + Differentiate Paracetamol IR vs Paracetamol MR (Panadol Osteo S3 for Osteoarthritis).",
        "patientReplyFa": "بسیار ممنون! از گرم کردن پایم دست برمی‌دارم، کمپرس یخ می‌گذارم و فوراً برای عکسبرداری نزد پزشک می‌روم.",
        "patientReplyEn": "Thank you! I will stop applying heat, use an ice pack, and see the GP for an X-ray.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": true,
      "recommendationFa": "منع فروش OTC - ارجاع فوری به GP جهت رادیوگرافی (Ottawa Ankle Rules Positive)",
      "recommendationEn": "Refuse OTC Supply - Urgent GP Referral for X-ray (Ottawa Ankle Rules)",
      "explanationFa": "ناتوانی در تحمل وزن و برداشتن ۴ گام پس از آسیب مچ پا طبق Ottawa Ankle Rules نیازمند رادیوگرافی (X-ray) جهت رد شکستگی است. گرما در ۴۸ ساعت اول (Heat) تورم را بدتر می‌کند. Panadol Osteo S3 داروی مخصوص آرتروز است و برای آسیب حاد خط اول نیست.",
      "explanationEn": "Inability to bear weight triggers Ottawa Ankle Rules requiring X-ray to exclude fracture. Heat within 48 hours breaks HARM guidelines by worsening edema."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "diarrhea-triage",
    "documentId": "doc-scenario-clinical-diarrhea-triage",
    "titleFa": "۱۴. اسهال حاد کودکان، محلول Hydralyte ORS و منع لوپرامید (Acute Diarrhea & Hydralyte ORS)",
    "titleEn": "14. Pediatric Diarrhea: Hydralyte ORS & Loperamide Rules",
    "mode": "MODE_B_SLANG",
    "categoryFa": "گوارش کودکان (Pediatric GI)",
    "categoryEn": "Pediatric GI & ORS",
    "presentationFa": "مادر کودک ۳ ساله (Noah) با شکایت از اسهال آبکی مراجعه کرده و قرص لوپرامید (Gastro-Stop) می‌خواهد.",
    "presentationEn": "Mother requesting Loperamide (Gastro-Stop) for her 3yo child experiencing acute watery diarrhea.",
    "patientName": "Emma Watson (Mother of Noah)",
    "patientAge": 32,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و سن؟",
        "labelEn": "W - Who is the patient & age?",
        "questionFa": "کودک شما چند سال دارد؟",
        "questionEn": "How old is your child?",
        "answerFa": "پسرم Noah ۳ ساله است.",
        "answerEn": "My son Noah is 3 years old."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و تعداد دفعات؟",
        "labelEn": "H - Duration & frequency?",
        "questionFa": "اسهال چند وقت است شروع شده؟",
        "questionEn": "How long has diarrhea been present?",
        "answerFa": "۳۶ ساعت است شروع شده و امروز ۶ بار دفع آبکی داشته است.",
        "answerEn": "36 hours duration with 6 watery episodes today."
      },
      {
        "key": "A",
        "labelFa": "A - مایعات مصرفی؟",
        "labelEn": "A - Fluid intake?",
        "questionFa": "چه مایعاتی به او داده‌اید؟",
        "questionEn": "What fluids have you given?",
        "answerFa": "فقط آب شیر دادم و می‌خواستم لوپرامید بدهم.",
        "answerEn": "Only plain tap water, and wanted Loperamide."
      },
      {
        "key": "T",
        "labelFa": "T - ادرار و خون در مدفوع؟",
        "labelEn": "T - Wet nappies & blood?",
        "questionFa": "آیا ادرار داشته یا خونی در مدفوع دیده‌اید؟",
        "questionEn": "Has he produced wet nappies or blood in stool?",
        "answerFa": "پوشکش خیس بوده و خونی در مدفوع نیست.",
        "answerEn": "Has wet nappies, no blood in stool."
      }
    ],
    "redFlags": [
      {
        "fa": "خون یا مخاط در مدفوع (Melena / Dysentery)",
        "en": "Blood or mucus in stool"
      },
      {
        "fa": "دهیدراتاسیون شدید (خشکی دهان، عدم ادرار >۶ ساعت، بی‌حالی شدید) یا سن زیر ۲ سال",
        "en": "Severe dehydration (dry mouth, no wet nappies >6 hours, lethargy) or age <2yo"
      }
    ],
    "dialogueOptions": [
      {
        "id": "d1",
        "textFa": "تحویل قرص Gastro-Stop (Loperamide) برای کودک ۳ ساله.",
        "textEn": "Dispense Loperamide (Gastro-Stop) for 3yo child.",
        "patientReplyFa": "آیا لوپرامید برای کودک ۳ ساله ایمن است؟",
        "patientReplyEn": "Is Loperamide safe for a 3-year-old toddler?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "d2",
        "textFa": "قدغن بودن لوپرامید: مصرف داروهای ضدتحرک مانند Loperamide در کودکان زیر ۶ سال شدیداً قدغن است (خطر فلج روده Toxic Megacolon و تضعیف تنفسی) + تجویز محلول هیپواسمولار بازجذب خوراکی (Hydralyte ORS) جهت جایگزینی آب و الکترولیت‌ها + ادامه تغذیه عادی و ارجاع به GP در صورت عدم بهبود.",
        "textEn": "Loperamide Contraindication: Anti-motility agents are strictly contraindicated in children under 6 years (risk of toxic megacolon & CNS depression) + Prescribe Oral Rehydration Salts (Hydralyte ORS) to replace fluid/electrolytes.",
        "patientReplyFa": "خیلی ممنون که جلوی مصرف لوپرامید را گرفتید! فوراً محلول Hydralyte ORS را آماده می‌کنم.",
        "patientReplyEn": "Thank you for stopping me from giving Loperamide to my toddler! I will start Hydralyte ORS sips immediately.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید پروتکل بازجذب Hydralyte ORS + منع قطعی لوپرامید در کودکان زیر ۶ سال",
      "recommendationEn": "Approved Hydralyte ORS Protocol & Loperamide Contraindication Guidance",
      "explanationFa": "داروهای ضداسهال anti-motility مانند لوپرامید در کودکان زیر ۶ سال به دلیل خطرات فلج روده (Toxic Megacolon) و تضعیف مرکز تنفسی کاملاً ممنوع هستند. درمان اصلی، جبران آب و الکترولیت‌ها با محلول هیپواسمولار ORS (Hydralyte) است.",
      "explanationEn": "Anti-motility drugs like Loperamide are strictly contraindicated in children under 6 due to risk of toxic megacolon and CNS depression. Standard management relies exclusively on Oral Rehydration Therapy (ORS)."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "heartburn-gord-triage",
    "documentId": "doc-scenario-clinical-heartburn-gord-triage",
    "titleFa": "۱۵. سوزش معده و رفلاکس (GORD)، آنتی‌اسید Mylanta در برابر PPI (Nexium 24HR / Somac) + قانون فاصله ۲ ساعته",
    "titleEn": "15. Heartburn & GORD: Mylanta vs PPI (Nexium 24HR / Somac) & 2-Hour Separation Rule",
    "mode": "MODE_B_SLANG",
    "categoryFa": "دستگاه گوارش (Gastrointestinal & GORD)",
    "categoryEn": "Gastrointestinal & GORD",
    "presentationFa": "بیمار با شکایت از سوزش شدید پشت جناغ (Heartburn) و رفلاکس اسید پس از وعده‌های غذایی مراجعه کرده و می‌پرسد آیا شربت آنتی‌اسید Mylanta کافی است یا قرص Nexium 24HR (Esomeprazole 20mg S3) مصرف کند.",
    "presentationEn": "Patient presents with frequent retrosternal heartburn asking whether to continue antacid syrup (Mylanta) or start daily Esomeprazole 20mg (Nexium 24HR S3).",
    "patientName": "Michael Scott",
    "patientAge": 45,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "داروی سوزش معده را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the heartburn medication for?",
        "answerFa": "برای خودم است، ۴۵ ساله هستم.",
        "answerEn": "It is for myself, I am 45 years old."
      },
      {
        "key": "H",
        "labelFa": "H - فراوانی و زمان بروز علائم؟",
        "labelEn": "H - Frequency & timing?",
        "questionFa": "چند بار در هفته دچار سوزش معده می‌شوید و چه زمانی رخ می‌دهد؟",
        "questionEn": "How many times a week do you get heartburn and when does it occur?",
        "answerFa": "حدود ۴ بار در هفته، معمولاً نیم ساعت بعد از غذا یا هنگام دراز کشیدن در شب سوزش شدید دارم.",
        "answerEn": "About 4 times a week, usually 30 minutes after heavy meals or lying down at night."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی و آنتی‌اسید؟",
        "labelEn": "A - Actions taken & antacids?",
        "questionFa": "چه فرآورده‌ای تاکنون مصرف کرده‌اید؟",
        "questionEn": "What remedies have you used so far?",
        "answerFa": "شربت Mylanta می‌خورم؛ فوراً در ۱۰ دقیقه سوزش را آرام می‌کند اما پس از ۲ ساعت دوباره سوزش برمی‌گردد!",
        "answerEn": "I take Mylanta syrup. It gives instant relief for 10 mins, but heartburn recurs after 2 hours."
      },
      {
        "key": "T",
        "labelFa": "T - سایر داروها و قانون فاصله زمانی؟",
        "labelEn": "T - Other medications & 2-hour rule?",
        "questionFa": "آیا داروهای تجویزی دیگری مانند مکمل آهن یا قرص فشار خون مصرف می‌کنید؟",
        "questionEn": "Do you take other prescribed medicines like iron supplements or BP pills?",
        "answerFa": "روزانه مکمل آهن (Ferrous Sulfate) و قرص فشار خون مصرف می‌کنم و می‌خواهم بدانم همزمان با Mylanta مشکلی ندارد؟",
        "answerEn": "I take daily Ferrous Sulfate iron tablets and blood pressure medication."
      }
    ],
    "redFlags": [
      {
        "fa": "دشواری در بلع غذا (Dysphagia) یا احساس گیر کردن غذا در گلو",
        "en": "Difficulty swallowing (Dysphagia) or food impaction"
      },
      {
        "fa": "مدفوع تیره قیری (Melena)، تهوع/استفراغ خونی یا کاهش وزن ناخواسته",
        "en": "Melena (dark tarry stools), hematemesis or unexplained weight loss"
      }
    ],
    "dialogueOptions": [
      {
        "id": "hg1",
        "textFa": "توصیه به مصرف مداوم شربت Mylanta بدون محدودیت و بلعیدن قرص Nexium بلافاصله بعد از شام سنگین.",
        "textEn": "Advise continuous Mylanta syrup as sole treatment and tell patient to take Nexium immediately after a heavy dinner.",
        "patientReplyFa": "آیا خوردن Mylanta همزمان با مکمل آهن جذب آهن را مختل نمی‌کند؟ و آیا Nexium نباید قبل از صبحانه خورده شود؟",
        "patientReplyEn": "Doesn't taking Mylanta at the same time as iron block iron absorption? And shouldn't Nexium be taken before breakfast?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "hg2",
        "textFa": "تریاژ بالینی گوارش: ۱) تمایز تسکین سریع مقطعی (Mylanta antacid / Gastrogel) در برابر درمان اساسی روزانه (PPI Nexium 24HR / Somac 20mg): برای رفلاکس مکرر (>۲ بار در هفته)، دوره ۱۴ روزه PPI انتخاب اول است. ۲) زمان‌بندی صحیح مصرف PPI: کپسول Nexium 24HR (Esomeprazole 20mg) باید روزی ۱ عدد، ناشتا و ۳۰ تا ۶۰ دقیقه قبل از صبحانه با یک لیوان آب بلعیده شود تا پمپ‌های اسید فعال را مهار کند. ۳) قانون فاصله ۲ ساعته آنتی‌اسید (Mylanta 2-Hour Rule): شربت Mylanta به دلیل ترکیب آلومینیوم/منیزیم، جذب مکمل آهن و سایر داروها را کاهش می‌دهد؛ باید حداقل ۲ ساعت فاصله زمانی رعایت شود.",
        "textEn": "GI Clinical Triage: 1) Breakthrough Antacid Relief (Mylanta) vs Daily PPI Therapy (Nexium 24HR / Somac 20mg): For frequent GORD (>2 days/week), 14-day PPI course is 1st-line. 2) PPI Administration Timing: Take Esomeprazole 20mg once daily 30-60 minutes BEFORE breakfast on an empty stomach for maximum acid pump inhibition. 3) Mylanta 2-Hour Separation Rule: Antacids bind oral iron and prescribed drugs; enforce mandatory 2-hour gap between antacid and other oral medications.",
        "patientReplyFa": "بسیار سپاسگزارم! کپسول Nexium 24HR را ۳۰ دقیقه قبل از صبحانه می‌خورم و فاصله ۲ ساعته شربت Mylanta با قرص آخنم را دقیقاً رعایت می‌کنم.",
        "patientReplyEn": "Thank you! I will take Nexium 24HR 30-60 mins before breakfast and observe the 2-hour gap between Mylanta and my iron pills.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید پروتکل ۱۴ روزه Nexium 24HR (مصرف ۳۰-۶۰ دقیقه قبل صبحانه) + رعایت فاصله ۲ ساعته Mylanta از سایر داروها",
      "recommendationEn": "Approved 14-Day Nexium 24HR PPI Regimen (30-60 Min Pre-Breakfast) & Mylanta 2-Hour Drug Separation Rule",
      "explanationFa": "در رفلاکس مکرر (GORD)، آنتی‌اسیدهای مایع (Mylanta) فقط اثر لحظه‌ای دارند. مصرف داروی PPI (Esomeprazole 20mg) به مدت ۱۴ روز اسید معده را مهار می‌کند. برای بیشترین اثربخشی، PPI باید ۳۰ تا ۶۰ دقیقه قبل از اولین وعده غذایی (صبحانه) مصرف شود. آنتی‌اسیدهای حاوی کاتیون‌های فلزی (Mylanta) نباید همزمان با مکمل‌های آهن یا آنتی‌بیوتیک‌ها مصرف شوند (حداقل ۲ ساعت فاصله الزامی است).",
      "explanationEn": "Frequent heartburn (>2 days/week) warrants a 14-day OTC PPI course (Esomeprazole 20mg). PPIs must be ingested 30-60 minutes prior to breakfast for optimal proton pump inhibition. Multivalent antacids (Mylanta) require a strict 2-hour separation from oral iron to prevent chelation and malabsorption."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "laxative-triage",
    "documentId": "doc-scenario-clinical-laxative-triage",
    "titleFa": "۱۶. تریاژ ملین‌ها (Laxative Triage): تمایز Metamucil (حجم‌دهنده)، Movicol (اسموتیک) و Coloxyl with Senna (محرک)",
    "titleEn": "16. Laxative Triage: Bulk-Forming (Metamucil) vs Osmotic (Movicol) vs Stimulant (Coloxyl)",
    "mode": "MODE_B_SLANG",
    "categoryFa": "دستگاه گوارش و یبوست (GI & Laxatives)",
    "categoryEn": "GI & Laxative Protocol",
    "presentationFa": "بیمار ۶۲ ساله پس از جراحی تعویض مفصل ران و مصرف مسکن‌های مخدر (Endone / Oxycodone)، با یبوست شدید ۲ هفته‌ای مراجعه کرده و می‌پرسد کدام ملین (Metamucil، Movicol یا Coloxyl) مناسب است.",
    "presentationEn": "Post-hip surgery 62yo patient taking prescription opioid analgesics (Endone) presenting with 2-week opioid-induced constipation asking for the right laxative.",
    "patientName": "Helen Miller",
    "patientAge": 62,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و علت یبوست؟",
        "labelEn": "W - Patient & cause?",
        "questionFa": "آیا داروی جدیدی مانند مسکن‌های قوی مصرف می‌کنید؟",
        "questionEn": "Are you taking new medications like strong pain relievers?",
        "answerFa": "بله، قرص Endone (Oxycodone) برای درد جراحی ران مصرف می‌کنم.",
        "answerEn": "Yes, Endone (Oxycodone) for post-surgical hip pain."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و شکل مدفوع؟",
        "labelEn": "H - Duration & stool texture?",
        "questionFa": "چند وقت است دچار یبوست شده‌اید و مدفوع چه شکلی دارد؟",
        "questionEn": "How long has constipation lasted and what is stool consistency?",
        "answerFa": "حدود ۲ هفته است؛ مدفوع بسیار سفت، خشک و گلوله‌ای شده و دفع آن بسیار دردناک است.",
        "answerEn": "For 2 weeks now. Stools are extremely hard, dry, and pellet-like."
      },
      {
        "key": "A",
        "labelFa": "A - مصرف ملین قبلی و میزان آب؟",
        "labelEn": "A - Previous laxatives & fluid intake?",
        "questionFa": "آیا فرآورده‌ای مانند پودر فیبر Metamucil مصرف کرده‌اید؟",
        "questionEn": "Have you tried fiber powders like Metamucil?",
        "answerFa": "پودر Metamucil خوردم اما چون آب کم خوردم دل‌درد شدید و باد شکم گرفتم!",
        "answerEn": "I tried Metamucil powder, but I drank very little water and got severe bloating!"
      },
      {
        "key": "T",
        "labelFa": "T - علائم انسداد یا چرک؟",
        "labelEn": "T - Obstruction signs?",
        "questionFa": "آیا تهوع شدید، تهوع یا خون در مدفوع دارید؟",
        "questionEn": "Do you have vomiting, severe nausea, or blood in stool?",
        "answerFa": "خیر، فقط فشار و سفت بودن مدفوع اذیتم می‌کند.",
        "answerEn": "No blood or vomiting, just painful straining."
      }
    ],
    "redFlags": [
      {
        "fa": "درد شدید و حاد شکمی، انسداد روده یا خونریزی روشن/تیره مقعدی",
        "en": "Severe acute abdominal pain, bowel obstruction or rectal bleeding"
      },
      {
        "fa": "کاهش وزن ناخواسته، استفراغ مداوم یا عدم دفع گاز و مدفوع بیش از ۵ روز",
        "en": "Unexplained weight loss, persistent vomiting or inability to pass gas/stool >5 days"
      }
    ],
    "dialogueOptions": [
      {
        "id": "lax1",
        "textFa": "توصیه به افزایش دوز پودر فیبر Metamucil بدون تاکید بر نوشیدن آب و مصرف طولانی‌مدت سنوتیک‌ها.",
        "textEn": "Advise doubling Metamucil fiber powder without emphasizing water intake, or long-term stimulant laxative use.",
        "patientReplyFa": "اما پودر Metamucil بدون آب زیاد باعث انسداد روده نمی‌شود؟",
        "patientReplyEn": "Doesn't taking fiber powder like Metamucil without plenty of water worsen intestinal blockage?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "lax2",
        "textFa": "آموزش بالینی و تمایز ۳ دسته اصلی ملین‌ها: ۱) ملین‌های حجم‌دهنده (Metamucil / Psyllium): نیازمند نوشیدن الزامی حداقل یک لیوان بزرگ آب (۲۵۰ml) همراه هر دوز هستند؛ در یبوست ناشی از اپیوئید یا بدون مصرف آب کافی کاملاً خطرناک بوده و باعث انسداد روده (Fecal Impaction) می‌شوند. ۲) ملین‌های اسموتیک (Movicol / OsmoLax / Polyethylene Glycol): کشنده آب به درون روده، انتخاب اول و ایمن برای یبوست ناشی از اپیوئیدها (Opioid-Induced Constipation) و مصرف طولانی‌مدت. ۳) ملین‌های محرک (Coloxyl with Senna / Dulcolax): تحریک مستقیم حرکات دودی روده؛ عالی برای تسکین سریع شبانه (شروع اثر ۸ تا ۱۲ ساعت)، اما نباید به مدت مداوم طولانی مصرف شوند تا باعث تنبلی روده نگردند. تجویز: ساشه Movicol روزی ۱ تا ۲ عدد همراه مصرف مایعات کافی.",
        "textEn": "Clinical Laxative Triage: 1) Bulk-Forming Laxatives (Metamucil/Psyllium): Require MANDATORY full glass of water (250mL) per dose; contraindicated in opioid-induced constipation without fluid intake due to risk of fecal impaction. 2) Osmotic Laxatives (Movicol/Polyethylene Glycol): Draws water into bowel, 1st-line safe choice for Opioid-Induced Constipation (OIC). 3) Stimulant Laxatives (Coloxyl with Senna/Docusate + Senna): Direct peristalsis stimulator, ideal for short-term fast overnight relief (8-12h onset); limit prolonged use to prevent bowel dependence. Recommend Movicol sashes.",
        "patientReplyFa": "بسیار متشکرم! ساشه Movicol را با حل کردن در یک لیوان آب مصرف می‌کنم و متوجه خطرات Metamucil بدون آب شدم.",
        "patientReplyEn": "Thank you so much! I will use Movicol sachets dissolved in water and now understand why Metamucil without water caused bloating.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید انتخاب ملین اسموتیک Movicol + آموزش الزامی مصرف آب فراوان و پرهیز از Metamucil بدون مایعات",
      "recommendationEn": "Approved Osmotic Laxative Movicol Protocol & Fluid Counseling; Metamucil Bulk Fiber Guidance",
      "explanationFa": "داروهای مسکن اپیوئیدی (Oxycodone) حرکات روده را کند کرده و آب مدفوع را جذب می‌کنند. فیبرهای حجم‌دهنده (Metamucil) بدون مصرف مایعات فراوان باعث انسداد روده (Fecal impaction) می‌شوند. ملین‌های اسموتیک (Movicol/Polyethylene Glycol) خط اول درمان یبوست ناشی از اپیوئیدها هستند. ملین‌های محرک (Coloxyl with Senna) برای مصرف کوتاه‌مدت مناسب می‌باشند.",
      "explanationEn": "Opioids slow intestinal transit and increase water absorption. Bulk-forming laxatives (Metamucil) without fluid intake exacerbate fecal impaction in opioid-induced constipation. Osmotic laxatives (Movicol) are 1st-line, pulling water back into the stool safely."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "panadol-osteo-triage",
    "documentId": "doc-scenario-clinical-panadol-osteo-triage",
    "titleFa": "۱۷. درد آرتروز زانو: تمایز Paracetamol MR 665mg (Panadol Osteo S3) در برابر IR 500mg معمولی",
    "titleEn": "17. Osteoarthritis Pain: Paracetamol MR 665mg (Panadol Osteo S3) vs IR 500mg Dosing",
    "mode": "MODE_B_SLANG",
    "categoryFa": "عضلانی و مسکن (Analgesia & Osteoarthritis)",
    "categoryEn": "Analgesia & Osteoarthritis",
    "presentationFa": "بیمار ۶۸ ساله با درد مزمن آرتروز زانو (Knee Osteoarthritis) مراجعه کرده و تقاضای خرید قرص Panadol Osteo 665mg (Schedule 3 Pharmacist Only) دارد.",
    "presentationEn": "68yo patient with persistent knee osteoarthritis pain requesting Schedule 3 Panadol Osteo 665mg (Paracetamol Modified Release).",
    "patientName": "Arthur Pendelton",
    "patientAge": 68,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و سن؟",
        "labelEn": "W - Patient & age?",
        "questionFa": "قرص Panadol Osteo را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the Panadol Osteo for?",
        "answerFa": "برای خودم است، ۶۸ ساله هستم و آرتروز شدید زانو دارم.",
        "answerEn": "For myself, I am 68 with knee osteoarthritis."
      },
      {
        "key": "H",
        "labelFa": "H - الگوی درد و مصرف قبلی؟",
        "labelEn": "H - Pain pattern & current use?",
        "questionFa": "درد زانوی شما چگونه است و قبلاً چه مسکنی مصرف می‌کردید؟",
        "questionEn": "How is your knee pain and what painkillers have you been taking?",
        "answerFa": "دردم مداوم است؛ قرص Panadol 500mg معمولی را هر ۴ ساعت می‌خوردم اما زرق و اثرش زود تمام می‌شد و فراموش می‌کردم.",
        "answerEn": "Constant aching pain. I took standard Panadol 500mg every 4 hours, but relief wore off quickly and I forgot doses."
      },
      {
        "key": "A",
        "labelFa": "A - نحوه بلع و خرد کردن قرص؟",
        "labelEn": "A - Tablet swallowing & crushing?",
        "questionFa": "آیا قرص را کامل می‌بلعید یا آن را نصف و خرد می‌کنید؟",
        "questionEn": "Do you swallow tablets whole or crush/halve them?",
        "answerFa": "می‌خواستم بدانم اگر قرص Panadol Osteo را خرد کنم تا راحت‌تر ببلعم مشکلی دارد؟",
        "answerEn": "I wanted to know if crushing Panadol Osteo tablets to swallow easier is fine?"
      },
      {
        "key": "T",
        "labelFa": "T - چک سایر فرآورده‌های پاراستامول؟",
        "labelEn": "T - Paracetamol check?",
        "questionFa": "آیا داروی سرماخوردگی یا مسکن دیگری همزمان مصرف می‌کنید؟",
        "questionEn": "Are you taking any other cold/flu or pain medicines containing paracetamol?",
        "answerFa": "خیر، هیچ داروی دیگری نمی‌خورم.",
        "answerEn": "No, no other medicines."
      }
    ],
    "redFlags": [
      {
        "fa": "مصرف همزمان سایر فرآورده‌های حاوی پاراستامول (خطر مسمومیت کبد Overdose!)",
        "en": "Concomitant paracetamol-containing cold/flu products (liver toxicity risk!)"
      },
      {
        "fa": "نارسایی شدید کبدی، مصرف الکل سنگین یا وزن زیر ۵۰ کیلوگرم",
        "en": "Severe hepatic impairment, heavy alcohol use or body weight <50kg"
      }
    ],
    "dialogueOptions": [
      {
        "id": "po1",
        "textFa": "تایید خرد کردن قرص Panadol Osteo 665mg و توصیه به مصرف آن هر ۴ ساعت مانند پاراستامول معمولی.",
        "textEn": "Approve crushing Panadol Osteo 665mg and advise taking it every 4 hours like standard paracetamol.",
        "patientReplyFa": "آیا خرد کردن قرص‌های پیوسته رهش باعث رهاسازی یکباره (Dose dumping) و مسمومیت نمی‌شود؟",
        "patientReplyEn": "Doesn't crushing modified-release tablets cause dose dumping and toxicity?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "po2",
        "textFa": "مشاوره دقیق داروساز برای داروی S3 Panadol Osteo (Paracetamol MR 665mg): ۱) تمایز فرمولاسیون فوری رهش (IR 500mg - شروع اثر سریع، طول اثر ۴-۶ ساعت، دوز ۲ قرص هر ۴ تا ۶ ساعت) در برابر فرمولاسیون آهسته‌رهش پیوسته (MR 665mg - دو لایه: یک لایه فوری + یک لایه آهسته‌رهش با طول اثر ۸ ساعت). ۲) دستور دوزینگ استاندارد Panadol Osteo: دقیقا ۲ قرص، ۳ بار در روز (هر ۸ ساعت یک‌بار - مثلاً ۷ صبح، ۳ بعدازظهر، ۱۱ شب). حداکثر دوز روزانه ۶ قرص = ۳۹۹۰mg. ۳) هشدار حیاتی منع خرد کردن: قرص‌های MR باید کاملاً سالم بلعیده شوند؛ خرد کردن یا جویدن ماتریس آهسته‌رهش را تخریب کرده و باعث آزادسازی ناگهانی (Dose Dumping) و خطر مسمومیت کبدی می‌شود.",
        "textEn": "S3 Pharmacist Counseling for Panadol Osteo (Paracetamol MR 665mg): 1) Differentiate IR Paracetamol (500mg: 4-6 hour duration) vs Modified-Release (665mg: dual-layer matrix providing sustained 8-hour relief). 2) Standard Dosing: 2 tablets THREE times daily (every 8 hours, e.g., 7am, 3pm, 11pm). Maximum daily dose = 6 tablets (3990mg/day). 3) DO NOT CRUSH WARNING: MR tablets must be swallowed whole; crushing or chewing destroys the modified-release matrix causing dose dumping and liver toxicity risks.",
        "patientReplyFa": "بسیار متشکرم! قرص‌ها را کاملاً سالم هر ۸ ساعت (روزی ۳ بار) می‌بلعم و هرگز آن‌ها را خرد نمی‌کنم.",
        "patientReplyEn": "Thank you very much! I will swallow 2 tablets whole every 8 hours (3 times daily) and never crush them.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید تحویل S3 Panadol Osteo 665mg (دوز ۲ قرص هر ۸ ساعت - روزی ۳ بار) + منع قطعی خرد کردن قرص",
      "recommendationEn": "Approved S3 Panadol Osteo 665mg Supply (2 Tabs TID Every 8 Hours) & Do Not Crush Counseling",
      "explanationFa": "فرمولاسیون Paracetamol MR 665mg (Panadol Osteo S3) مخصوص دردهای مزمن مانند آرتروز است. فاصله دوزینگ آن هر ۸ ساعت (روزی ۳ بار، حداکثر ۶ قرص = ۳۹۹۰mg) است. به دلیل ساختار ماتریسی پیوسته رهش، قرص‌ها باید کاملاً سالم بلعیده شوند و خرد کردن آن‌ها موجب دوز دامپینگ و مسمومیت کبد می‌گردد.",
      "explanationEn": "Paracetamol MR 665mg (Panadol Osteo S3) features a dual-layer matrix providing 8-hour sustained pain relief for osteoarthritis. Dosing is 2 tablets TID (every 8 hours, max 3990mg/day). Tablets must be swallowed whole to preserve the modified-release profile."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "ankle-ricer-protocol",
    "documentId": "doc-scenario-clinical-ankle-ricer-protocol",
    "titleFa": "۱۸. آسیب بافت نرم مچ پا: پروتکل RICER (Rest, Ice, Compression, Elevation, Referral) و ایمنی NSAID",
    "titleEn": "18. Soft Tissue Ankle Injury: RICER Protocol & NSAID Timing in Acute Phase",
    "mode": "MODE_B_SLANG",
    "categoryFa": "عضلانی و اسکلتی (Musculoskeletal & RICER)",
    "categoryEn": "Musculoskeletal & RICER",
    "presentationFa": "ورزشکار ۲۸ ساله که ۴ ساعت پیش طی مسابقه فوتبال مچ پایش پیچ خورده، با تورم و درد مراجعه کرده و درخواست کیسه آب گرم و قرص قوی ایبوپروفن دارد.",
    "presentationEn": "28yo athlete presenting 4 hours after an acute ankle inversion injury during soccer with swelling, requesting a hot pack and high-dose ibuprofen.",
    "patientName": "Daniel Cooper",
    "patientAge": 28,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و نوع ورزش؟",
        "labelEn": "W - Patient & activity?",
        "questionFa": "حادثه چگونه اتفاق افتاد؟",
        "questionEn": "How did the injury occur?",
        "answerFa": "هنگام پریدن برای سر زدن در فوتبال، مچ پای راستم به سمت داخل پیچ خورد.",
        "answerEn": "Landed awkwardly on my right ankle during soccer."
      },
      {
        "key": "H",
        "labelFa": "H - زمان حادثه و توانایی راه رفتن؟",
        "labelEn": "H - Onset timing & walking ability?",
        "questionFa": "چند ساعت گذشته و آیا می‌توانید روی پایتان ۴ گام بردارید؟",
        "questionEn": "How many hours ago and can you walk 4 steps on it?",
        "answerFa": "۴ ساعت پیش افتاد؛ با کمی لنگیدن می‌توانم ۴ گام بردارم اما متورم و داغ است.",
        "answerEn": "4 hours ago. I can limp and take 4 steps, but it is swollen and warm."
      },
      {
        "key": "A",
        "labelFa": "A - اقدامات قبلی و گرم کردن؟",
        "labelEn": "A - Actions taken & heat?",
        "questionFa": "آیا تا الان پای خود را گرم کرده‌اید یا ماساژ داده‌اید؟",
        "questionEn": "Have you applied heat or massaged the ankle?",
        "answerFa": "می‌خواستم کیسه آب گرم بگذارم و ماساژ محکم بدهم تا گرفتگی باز شود!",
        "answerEn": "I wanted to put a hot water bottle and massage it firmly to release tension!"
      },
      {
        "key": "T",
        "labelFa": "T - بررسی حساسیت و آسم؟",
        "labelEn": "T - Asthma & allergy check?",
        "questionFa": "آیا سابقه آسم یا زخم معده دارید؟",
        "questionEn": "Do you have a history of asthma or stomach ulcers?",
        "answerFa": "خیر، هیچ سابقه بیماری ندارم.",
        "answerEn": "No medical history."
      }
    ],
    "redFlags": [
      {
        "fa": "عدم توانایی در تحمل وزن یا عدم توانایی در برداشتن ۴ گام (Ottawa Ankle Rules Positive)",
        "en": "Inability to bear weight or walk 4 steps (Ottawa Ankle Rules Positive)"
      },
      {
        "fa": "دفرمیتی استخوانی شدید، زخم باز یا بی‌حسی در انگشتان پا",
        "en": "Visible bone deformity, open wound or distal numbness"
      }
    ],
    "dialogueOptions": [
      {
        "id": "ricer1",
        "textFa": "تایید گذاشتن کیسه آب گرم و ماساژ محکم مچ پا به همراه تجویز دوز بالای NSAID خوراکی در ساعت اول.",
        "textEn": "Approve hot water pack, deep tissue massage, and immediate high-dose oral NSAIDs.",
        "patientReplyFa": "آیا گرما و ماساژ در ۴۸ ساعت اول باعث خونریزی بیشتر و افزایش تورم نمی‌شود؟",
        "patientReplyEn": "Doesn't heat and massage in the first 48 hours increase internal bleeding and edema?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "ricer2",
        "textFa": "آموزش کامل پروتکل بالینی RICER و پرهیز از HARM: ۱) پروتکل ۵ مرحله‌ای RICER: R = Rest (استراحت و عدم اعمال وزن سنگین)، I = Ice (کمپرس یخ ۲۰ دقیقه هر ۲ ساعت برای ۴۸ ساعت اول)، C = Compression (بانداژ کشی محکم اما بدون قطع گردش خون)، E = Elevation (بالا نگه داشتن پا بالاتر از سطح قلب)، R = Referral (ارجاع به فیزیوتراپی/پزشک در صورت عدم بهبود). ۲) پرهیز اکید از عوامل HARM در ۴۸ ساعت اول: H = Heat (گرما خونرسانی و تورم را تشدید می‌کند)، A = Alcohol (الکل)، R = Running (دویدن)، M = Massage (ماساژ بافت آسیب‌دیده را تخریب می‌کند). ۳) مدیریت دارویی: شروع Paracetamol یا ژل موضعی Voltaren؛ پرهیز از NSAID خوراکی سنگین در ۲۴ ساعت اول اگر احتمال خونریزی حاد بافتی وجود دارد.",
        "textEn": "Comprehensive RICER Protocol & Anti-HARM Counseling: 1) RICER Protocol: R = Rest (unweight joint), I = Ice (apply ice pack for 20 mins every 2 hours for 48 hours), C = Compression (supportive elastic bandage), E = Elevation (elevate above heart level), R = Referral (refer to physio/GP if no response). 2) Avoid HARM Factors for 48 Hours: No Heat, No Alcohol, No Running, No Massage (heat/massage exacerbate acute tissue edema and hematoma). 3) Pharmacotherapy: Paracetamol IR/topical Voltaren emulgel initial choice.",
        "patientReplyFa": "خیلی ممنون از توضیحات عالی! کیسه آب گرم را کنار می‌گذارم، کمپرس یخ ۲۰ دقیقه‌ای می‌گذارم، پا را بالا نگه می‌دارم و از ماساژ دادن پرهیز می‌کنم.",
        "patientReplyEn": "Thank you! I will avoid heat and massage, apply ice packs for 20 minutes, elevate my leg, and use compression.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید اجرای پروتکل RICER + آموزش پرهیز از عوامل HARM (گرما، الکل، دویدن، ماساژ) در ۴۸ ساعت اول",
      "recommendationEn": "Approved RICER Protocol & Anti-HARM Guidelines (No Heat, Alcohol, Running, Massage for 48 Hours)",
      "explanationFa": "در آسیب‌های حاد بافت نرم (Soft tissue sprain)، اعمال گرما (Heat) و ماساژ در ۴۸ ساعت اول باعث گشاد شدن عروق، افزایش خونریزی بافتی (Hematoma) و تورم شدیدتر می‌شود. پروتکل RICER (استراحت، یخ، فشار، بالا نگه‌داشتن و ارجاع) استاندارد طلایی درمان اولیه است.",
      "explanationEn": "In acute soft tissue trauma, applying heat or massaging within the first 48 hours breaches HARM principles by dilating vessels and aggravating tissue hematoma and edema. Management requires strict adherence to the RICER protocol."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "nsaid-safety-check",
    "documentId": "doc-scenario-clinical-nsaid-safety-check",
    "titleFa": "۱۹. غربالگری ایمنی NSAIDها: آسم، زخم معده، کلیوی و تداخل Spironolactone با Meloxicam / Nurofen",
    "titleEn": "19. NSAID Safety Screening: Asthma, Peptic Ulcers, Renal Impairment & Spironolactone Interaction",
    "mode": "MODE_B_SLANG",
    "categoryFa": "مسکن و ایمنی دارو (Analgesia & NSAID Safety)",
    "categoryEn": "Analgesia & NSAID Safety",
    "presentationFa": "بیمار ۶۴ ساله با کمردرد حاد مراجعه کرده و خواستار خرید مسکن قوی Nurofen (Ibuprofen 400mg) یا Meloxicam است.",
    "presentationEn": "64yo patient with acute lower back pain requesting strong OTC oral NSAIDs (Nurofen 400mg / Meloxicam).",
    "patientName": "Margaret Vance",
    "patientAge": 64,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و سوابق؟",
        "labelEn": "W - Patient & medical history?",
        "questionFa": "آیا سابقه بیماری‌های کلیوی، قلبی یا آسم دارید؟",
        "questionEn": "Do you have any kidney, heart failure, or asthma history?",
        "answerFa": "بله، من نارسایی خفیف کلیه و نارسایی قلبی دارم و داروی تجویزی مصرف می‌کنم.",
        "answerEn": "Yes, I have mild renal impairment and heart failure."
      },
      {
        "key": "H",
        "labelFa": "H - مدت و شدت کمردرد؟",
        "labelEn": "H - Back pain duration?",
        "questionFa": "کمردرد شما از چه زمانی شروع شده است؟",
        "questionEn": "When did the back pain start?",
        "answerFa": "از ۲ روز پیش هنگام بلند کردن جعبه سنگین شروع شد.",
        "answerEn": "2 days ago after lifting a heavy box."
      },
      {
        "key": "A",
        "labelFa": "A - مسکن‌های مصرفی؟",
        "labelEn": "A - Painkillers tried?",
        "questionFa": "چه دارویی استفاده کرده‌اید؟",
        "questionEn": "What pain relievers have you used?",
        "answerFa": "فقط یک قرص پاراستامول خوردم که کم بود.",
        "answerEn": "Took one Paracetamol tablet with partial relief."
      },
      {
        "key": "T",
        "labelFa": "T - لیست دقیق داروها (TRIPLE WHAMMY)?",
        "labelEn": "T - Full medication list?",
        "questionFa": "دقیقاً چه داروهای تجویزی روزانه مصرف می‌کنید؟",
        "questionEn": "What exact daily prescription medications do you take?",
        "answerFa": "روزانه قرص Ramipril (داروی ACEi) و قرص Spironolactone (دیورتیک نگه‌دارنده پتاسیم) مصرف می‌کنم.",
        "answerEn": "I take daily Ramipril (ACE inhibitor) and Spironolactone (potassium-sparing diuretic)."
      }
    ],
    "redFlags": [
      {
        "fa": "سابقه زخم یا خونریزی گوارشی (Peptic Ulcer / GI Bleed)",
        "en": "History of peptic ulcer disease or GI bleeding"
      },
      {
        "fa": "نارسایی کلیوی، حملات آسم با آسپیرین یا مصرف همزمان Triple Whammy (ACEi + Diuretic + NSAID)",
        "en": "Renal impairment, Aspirin-sensitive asthma, or Triple Whammy drug interaction"
      }
    ],
    "dialogueOptions": [
      {
        "id": "ns1",
        "textFa": "تحویل قرص Ibuprofen 400mg بدون توجه به مصرف Spironolactone و Ramipril.",
        "textEn": "Dispense Ibuprofen 400mg without screening for Spironolactone and Ramipril interaction.",
        "patientReplyFa": "آیا ترکیب ایبوپروفن با رمپریل و اسپیرونولاکتون باعث آسیب حاد کلیه و بالا رفتن پتاسیم نمی‌شود؟",
        "patientReplyEn": "Doesn't combining ibuprofen with Ramipril and Spironolactone cause acute kidney injury and hyperkalemia?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "ns2",
        "textFa": "ارزیابی جامع ایمنی NSAIDها و منع مصرف به دلیل تداخل خطرساز Triple Whammy: ۱) غربالگری ۴ گانه NSAIDها: الف) سابقه آسم ناشی از آسپیرین (Aspirin-Exacerbated Respiratory Disease)، ب) زخم و خونریزی گوارشی، ج) نارسایی کلیوی و قلبی (NSAIDها باعث احتباس آب و سدیم می‌شوند)، د) تداخلات دارویی. ۲) تداخل خطرساز Triple Whammy: ترکیب همزمان ۱. داروی ضد فشار خون ACEi/ARB (Ramipril) + ۲. داروی مدر/دیورتیک (Spironolactone) + ۳. داروی ضدالتهاب NSAID (Ibuprofen/Meloxicam) باعث افت شدید خونرسانی گلومرولی، نارسایی حاد کلیه (Acute Kidney Injury) و هایپرکالمی شدید (Hyperkalemia) می‌شود! ۳) جایگزین ایمن: منع کامل NSAID خوراکی؛ پیشنهاد Paracetamol MR (Panadol Osteo) + ژل موضعی Voltaren Emulgel (که جذب سیستمیک کلیوی بسیار ناچیزی دارد).",
        "textEn": "NSAID Safety Screening & Triple Whammy Contraindication: 1) 4-Point NSAID Screen: Asthma sensitivity, Peptic Ulcer Disease, Renal/Heart Failure (NSAIDs cause sodium/water retention), Drug Interactions. 2) Triple Whammy Alert: Concomitant ACEi/ARB (Ramipril) + Diuretic (Spironolactone) + NSAID (Ibuprofen) severely reduces glomerular filtration, precipitating Acute Kidney Injury (AKI) and life-threatening Hyperkalemia. 3) Safe Alternative: Absolute contraindication for oral NSAID; recommend Paracetamol MR (Panadol Osteo) + topical Voltaren Emulgel.",
        "patientReplyFa": "بسیار ممنون داروساز هوشمند! از خطر بزرگ آسیب کلیوی آگاه شدم و به جای ایبوپروفن از ژل موضعی ولتارن و پاراستامول استفاده می‌کنم.",
        "patientReplyEn": "Thank you so much! I was completely unaware of the Triple Whammy kidney risk and will safely use topical Voltaren gel and Paracetamol instead.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "منع مطلق NSAID خوراکی به دلیل تداخل Triple Whammy (Ramipril + Spironolactone + NSAID) + جایگزینی با ژل موضعی Voltaren و Paracetamol",
      "recommendationEn": "Oral NSAID Contraindicated due to Triple Whammy Interaction (ACEi + Diuretic + NSAID); Switch to Topical Voltaren & Paracetamol",
      "explanationFa": "مصرف همزمان داروهای NSAID با داروهای ACE Inhibitor (Ramipril) و دیورتیک‌ها (Spironolactone) تحت عنوان Triple Whammy شناخته می‌شود. این ترکیب با تنگ کردن آرتریول آفرانت و گشاد کردن آرتریول افانت کلیه، فشار هیدرواستاتیک گلومرول را تخریب کرده و منجر به نارسایی حاد کلیوی (AKI) و هایپرکالمی کشنده می‌شود.",
      "explanationEn": "The \"Triple Whammy\" combination (ACEi/ARB + Diuretic + NSAID) constricts afferent renal arterioles and dilates efferent arterioles, destroying renal autoregulation and inducing acute renal failure and severe hyperkalemia. Oral NSAIDs are strictly contraindicated."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "smoking-cessation-5as",
    "documentId": "doc-scenario-clinical-smoking-cessation-5as",
    "titleFa": "۲۰. مشاوره ترک سیگار با چارچوب 5A's، ارزیابی وابستگی نیکوتین و درمان ترکیبی NRT",
    "titleEn": "20. Smoking Cessation Consultation: 5A's Framework, Nicotine Dependence & Combination NRT Protocol",
    "mode": "MODE_B_SLANG",
    "categoryFa": "سلامت و ترک سیگار (Smoking Cessation & 5A's)",
    "categoryEn": "Smoking Cessation & 5A's",
    "presentationFa": "بیمار ۴۲ ساله با سابقه ۱۵ سال سیگار کشیدن (روزی ۲۰ نخ) مراجعه کرده و می‌خواهد سیگار را ترک کند و درباره جایگزین‌های نیکوتین (NRT Patches, Gums, Inhaler) مشاوره می‌خواهد.",
    "presentationEn": "42yo smoker of 20 cigarettes/day for 15 years presenting requesting assistance and advice on Nicotine Replacement Therapy (NRT).",
    "patientName": "James Wilson",
    "patientAge": 42,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و تعداد سیگار؟",
        "labelEn": "W - Patient & cigarette count?",
        "questionFa": "روزانه چند نخ سیگار می‌کشید و چند سال است سیگاری هستید؟",
        "questionEn": "How many cigarettes do you smoke daily and for how long?",
        "answerFa": "روزانه ۲۰ نخ سیگار (۱ پاکت کامل) می‌کشم و ۱۵ سال است سیگاری هستم.",
        "answerEn": "20 cigarettes daily (1 full pack) for 15 years."
      },
      {
        "key": "H",
        "labelFa": "H - ارزیابی وابستگی (زمان اولین سیگار)?",
        "labelEn": "H - Nicotine dependence (1st cigarette time)?",
        "questionFa": "چند دقیقه پس از بیدار شدن در صبح اولین سیگار را روشن می‌کنید؟",
        "questionEn": "How many minutes after waking do you smoke your first cigarette?",
        "answerFa": "کمتر از ۵ دقیقه پس از بیدار شدن! حتی شب‌ها هم با وسوسه نیکوتین از خواب بیدار می‌شوم.",
        "answerEn": "Within 5 minutes of waking up! I even wake up at night with intense cravings."
      },
      {
        "key": "A",
        "labelFa": "A - تجربیات قبلی ترک؟",
        "labelEn": "A - Previous quit attempts?",
        "questionFa": "آیا قبلاً سابقه اقدام به ترک داشته‌اید؟",
        "questionEn": "Have you attempted to quit previously?",
        "answerFa": "یک‌بار یک‌باره (Cold turkey) قطع کردم اما دچار بیخوابی، بی‌قراری شدید و اضطراب شدم و شکست خوردم.",
        "answerEn": "I tried cold turkey once, but suffered severe withdrawal insomnia, irritability, and relapsed."
      },
      {
        "key": "T",
        "labelFa": "T - بیماری قلبی عروقی حاد؟",
        "labelEn": "T - Recent CV events?",
        "questionFa": "آیا سابقه سکته قلبی در ۲ هفته اخیر داشته‌اید؟",
        "questionEn": "Any recent heart attack or unstable angina in the past 2 weeks?",
        "answerFa": "خیر، هیچ مشکل قلبی ندارم.",
        "answerEn": "No heart issues."
      }
    ],
    "redFlags": [
      {
        "fa": "حمله قلبی اخیر (MI در ۲ هفته گذشته)، آریتمی شدید یا آنژین ناپایدار (نیازمند احتیاط در NRT و نظر پزشک)",
        "en": "Recent Myocardial Infarction (<2 weeks), severe arrhythmia or unstable angina"
      },
      {
        "fa": "بارداری یا شیردهی (نیازمند مشاوره ترجیحی NRT سریع‌الاثر غیرپیوسته)",
        "en": "Pregnancy or breastfeeding (prefer intermittent oral NRT under medical supervision)"
      }
    ],
    "dialogueOptions": [
      {
        "id": "sc1",
        "textFa": "توصیه به استفاده از آدامس نیکوتین کم‌دوز ۲mg به تنهایی و جویدن آن مانند آدامس معمولی خوراکی.",
        "textEn": "Recommend low-dose 2mg Nicotine Gum monotherapy and advise chewing it continuously like regular bubblegum.",
        "patientReplyFa": "آیا جویدن مداوم آدامس نیکوتین باعث سوزش معده و دل‌درد نمی‌شود؟ و آیا دوز تک‌دارویی ۲mg برای فردی که ۲۰ نخ سیگار می‌کشد کافی است؟",
        "patientReplyEn": "Doesn't chewing nicotine gum continuously cause hiccups and stomach upset? And is 2mg monotherapy enough for a 20-cig/day smoker?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "sc2",
        "textFa": "اجرای کامل پروتکل ۵ مرحله‌ای 5A's و مشاوره درمان ترکیبی NRT: ۱) پروتکل 5A's: Ask (پرسش سابقه)، Advise (توصیه قاطع به ترک)، Assess (ارزیابی آمادگی و میزان وابستگی)، Assist (کمک و تجویز NRT)، Arrange (تنظیم پیگیری و تماس با Quitline 13 78 48). ۲) تشخیص وابستگی شدید: کشیدن سیگار ظرف ۵ دقیقه پس از بیداری نشان‌دهنده وابستگی بالا (High Nicotine Dependence) است. ۳) درمان ترکیبی NRT (Combination NRT Protocol): استفاده همزمان از پچ پوستی ۲۴ ساعته (Nicorette Step 1 21mg/24h یا 15mg/16h) برای تامین سطح پایه نیکوتین + فرآورده سریع‌الاثر خوراکی (آدامس نیکوتین 4mg یا اسپری/استنشاقی) برای کنترل وسوسه‌های ناگهانی (Breakthrough Cravings). ۴) تکنیک صحیح مصرف آدامس نیکوتین (Chew and Park Technique): جویدن آرام تا احساس طعم تند/سوزش، سپس پارک کردن آدامس بین دیواره گونه و لثه به مدت ۱ دقیقه جهت جذب مخاطی؛ جویدن مداوم و بلعیدن نیکوتین باعث دل‌درد، سکسکه و سوزش معده می‌شود.",
        "textEn": "Comprehensive 5A's Smoking Cessation & Combination NRT Protocol: 1) 5A's Framework: Ask, Advise, Assess, Assist, Arrange (refer to Quitline 13 78 48). 2) Dependence Stratification: First cigarette <5 minutes post-waking confirms High Nicotine Dependence. 3) Combination NRT Protocol: Combine 24-Hour Transdermal Patch (Nicorette Step 1 21mg/24h) for baseline nicotine levels PLUS Fast-Acting Oral NRT (Nicotine Gum 4mg or Inhaler/Mouth Spray) for acute breakthrough cravings. 4) Correct \"Chew and Park\" Gum Technique: Chew slowly until peppery taste/tingle, then park between cheek and gum for 1 minute for transmucosal absorption; continuous chewing causes nicotine swallowing, hiccups, and dyspepsia.",
        "patientReplyFa": "بسیار سپاسگزارم! پچ ۲۴ ساعته نیکوتین را همراه آدامس ۴mg با تکنیک درست \"جویدن و پارک کردن\" استفاده می‌کنم و با شماره Quitline تماس می‌گیرم.",
        "patientReplyEn": "Thank you so much! I will combine the 24-hour patch with 4mg gum using the correct \"chew and park\" technique and call Quitline.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید پروتکل درمان ترکیبی NRT (پچ پوستی ۲۴ ساعته Step 1 + آدامس/استنشاقی سریع‌الاثر) + آموزش تکنیک Chew & Park و ارجاع به Quitline",
      "recommendationEn": "Approved Combination NRT Protocol (24h Step 1 Patch + Fast-Acting Oral NRT) & Chew & Park Technique Counseling",
      "explanationFa": "در افراد با وابستگی شدید به نیکوتین (مصرف سیگار ظرف ۵ دقیقه پس از بیدار شدن / بیش از ۲۰ نخ در روز)، تک‌درمانی با NRT نرخ شکست بالایی دارد. پروتکل استاندارد، درمان ترکیبی (Combination NRT) شامل پچ پوستی ۲۴ ساعته برای دوز پایه + فرآورده سریع‌الاثر (آدامس ۴mg یا اسپری) برای هوس‌های ناگهانی است. آموزش تکنیک \"جویدن و پارک کردن\" برای جذب درست از مخاط دهان الزامی است.",
      "explanationEn": "High nicotine dependence (1st cigarette <5 mins post-waking) requires Combination NRT (24-hour transdermal patch for basal levels plus fast-acting oral NRT for acute cravings) according to Australian RACGP guidelines. The \"chew and park\" technique avoids nicotine swallowing and dyspepsia."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "s3-pseudoephedrine-conflict",
    "documentId": "doc-scenario-clinical-s3-pseudoephedrine-conflict",
    "titleFa": "C1. مدیریت تعارض و ثبت حوزه‌محور سودوافدرین S3 در NSW",
    "titleEn": "C1. De-escalation & jurisdiction-specific pseudoephedrine S3 recording in NSW",
    "mode": "MODE_C_CONFLICT",
    "categoryFa": "ارزیابی بالینی و الزامات محلی S3",
    "categoryEn": "Clinical assessment & local S3 requirements",
    "presentationFa": "سناریو در NSW و بر اساس منابع بررسی‌شده در ۲۶ سپتامبر ۲۰۲۶ است؛ خریدار برای داروساز شناخته‌شده نیست. من همیشه از اینجا قرص Sudafed 60mg می‌خرم! چرا امروز گواهینامه رانندگی من را می‌خواهی و آدرسم را توی کامپیوتر ثبت می‌کنی؟ من خلافکار یا تولیدکننده مواد نیستم (I am not a criminal)! همین یک جعبه را بده برم!",
    "presentationEn": "This scenario is set in NSW and reflects sources checked on 26 September 2026; the purchaser is not known to the pharmacist. I always buy Sudafed 60mg here! Why are you asking for my driver's licence and logging my address today? I am not a criminal! Just give me the box!",
    "patientName": "Brett Henderson",
    "patientAge": 44,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار کیست؟",
        "labelEn": "W - Who is the patient?",
        "questionFa": "قرص سودوافدرین را برای چه کسی می‌خواهید؟",
        "questionEn": "Who is the Sudafed 60mg intended for?",
        "answerFa": "برای خودم است؛ احتقان و گرفتگی شدید سینوسی به خاطر سرماخوردگی اخیر دارم.",
        "answerEn": "For myself. Got bad sinus congestion from a head cold."
      },
      {
        "key": "H",
        "labelFa": "H - مدت گرفتگی و علائم؟",
        "labelEn": "H - Duration & symptoms?",
        "questionFa": "چند روز است گرفتگی دارید؟",
        "questionEn": "How long have you had the sinus pressure?",
        "answerFa": "حدود ۳ روز است.",
        "answerEn": "About 3 days."
      },
      {
        "key": "A",
        "labelFa": "A - داروهای امتحان شده؟",
        "labelEn": "A - Actions & previous meds?",
        "questionFa": "آیا داروی ضداحتقان یا داروی دیگری، از جمله مهارکنندهٔ MAO، مصرف کرده‌اید؟",
        "questionEn": "Have you used another decongestant or any other medicine, including an MAOI?",
        "answerFa": "فقط سرم نمکی استفاده کرده‌ام؛ داروی دیگری یا مهارکنندهٔ MAO مصرف نمی‌کنم.",
        "answerEn": "Only saline; I take no other medicines and no MAOI."
      },
      {
        "key": "T",
        "labelFa": "T - فشار خون، قلبی و احراز هویت؟",
        "labelEn": "T - Cardiovascular history & ID check?",
        "questionFa": "سابقهٔ فشار خون بالا، بیماری قلبی، پرکاری تیروئید یا مصرف مهارکنندهٔ MAO دارید؟",
        "questionEn": "Do you have hypertension, heart disease, hyperthyroidism or MAOI use?",
        "answerFa": "خیر؛ فشار خون، بیماری قلبی یا تیروئید ندارم و مهارکنندهٔ MAO هم مصرف نمی‌کنم.",
        "answerEn": "No hypertension, heart disease or thyroid disease, and no MAOI use."
      }
    ],
    "redFlags": [
      {
        "fa": "فشار خون کنترل‌نشده، بیماری ایسکمیک قلبی حاد، هایپرتیروئیدیسم یا مصرف مهارکننده‌های MAO در ۱۴ روز اخیر (منع مطلق سمپاتومیمتیک‌های خوراکی)",
        "en": "Uncontrolled hypertension, severe coronary artery disease, MAOI use within 14 days"
      },
      {
        "fa": "خریدهای مکرر یا الگوی نگران‌کننده را بر اساس شواهد و رویهٔ محلی ارزیابی کنید؛ صرفِ ناراحتی یا پرسش دربارهٔ مدرک هویتی اثبات سوءمصرف نیست.",
        "en": "Assess repeated purchases or a concerning pattern using evidence and local procedures; discomfort or a question about ID alone does not establish misuse."
      },
      {
        "fa": "نیاز درمانی، منع مصرف و تناسب فرآورده را ارزیابی کنید؛ احراز هویت و ثبت فروش تابع قانون جاری همان ایالت/قلمرو است.",
        "en": "Assess therapeutic need, contraindications and product suitability; identity and recording requirements follow current state/territory law."
      }
    ],
    "dialogueOptions": [
      {
        "id": "ps1",
        "textFa": "برای پایان‌دادن به گفتگو، بدون ارزیابی درمانی یا رعایت الزام ثبتِ محل عرضه دارو را فوراً تحویل بدهم.",
        "textEn": "To end the conversation, supply immediately without therapeutic assessment or the recording required at the place of supply.",
        "patientReplyFa": "پس لازم نیست وضعیت سلامتی یا مقررات محل را بررسی کنیم؟",
        "patientReplyEn": "So we do not need to check my health or the local requirements?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "ps2",
        "textFa": "با آرامش همدلی کنید و توضیح دهید که هدف، ارزیابی ایمنی و اجرای مقررات محل عرضه است، نه متهم‌کردن مشتری. در این سناریوی NSW، تا ۴ نوامبر ۲۰۲۶ ثبت آنلاین و بلادرنگ در فرم تأییدشدهٔ Project STOP لازم است؛ چون مشتری برای داروساز ناشناس است، مدرک عکس‌دار و شناسهٔ آن را طبق مقررات بررسی/ثبت کنید. دربارهٔ محرمانگی یا سقف خرید وعدهٔ کلی ندهید؛ به سیاست حریم خصوصی داروخانه و منبع رسمی ارجاع دهید. ارزیابی درمانی را کامل کنید و فقط در صورت مناسب‌بودن، مطابق برچسب فرآورده اقدام کنید.",
        "textEn": "Respond calmly and explain that the purpose is safety assessment and compliance with the place-of-supply rules, not an accusation. In this NSW case, through 4 November 2026, online real-time recording in the approved Project STOP form is required; because the customer is not known to the pharmacist, check and record photo-ID details as required. Make no blanket promises about privacy or purchase limits; refer to the pharmacy privacy policy and official guidance. Complete the therapeutic assessment and proceed only if appropriate, following the product label.",
        "patientReplyFa": "از توضیحتان ممنونم؛ لطفاً سیاست حریم خصوصی داروخانه را هم برایم توضیح دهید.",
        "patientReplyEn": "Thank you for explaining. Please also explain the pharmacy privacy policy.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "مدیریت محترمانهٔ تعارض، ارزیابی درمانی و رعایت الزامات جاری NSW در تاریخ عرضه؛ بدون فرض سقف ملی خرید یا تضمین کلی حریم خصوصی",
      "recommendationEn": "Respectful de-escalation, therapeutic assessment and compliance with NSW requirements in force on the supply date; no assumed national purchase cap or blanket privacy assurance",
      "explanationFa": "سناریو در NSW و بر اساس منابع بررسی‌شده در ۲۶ سپتامبر ۲۰۲۶ است؛ خریدار برای داروساز شناخته‌شده نیست. NSW Health می‌گوید فروش OTC سودوافدرین تا ۴ نوامبر ۲۰۲۶ باید هنگام عرضه در فرم آنلاین و بلادرنگِ تأییدشده ثبت شود؛ اگر هویت خریدار برای داروساز شناخته‌شده نیست، شناسهٔ مدرک عکس‌دار ثبت می‌شود. از ۵ نوامبر ۲۰۲۶ ثبت فروش S3 سودوافدرین در NSW لازم نخواهد بود؛ این تغییر ارزیابی درمانی و سایر الزامات S3 را حذف نمی‌کند. آستانهٔ مقدار بسته برای طبقه‌بندی Schedule را با سقف خرید فردی/تراکنش اشتباه نگیرید. اصلاح تحریریه بر پایهٔ منابع رسمیِ بررسی‌شده در 26 September 2026؛ بازبینی بالینی واجدصلاحیت هنوز انجام نشده است. این متن جایگزین قانون جاری ایالت/قلمرو، سیاست داروخانه یا ارزیابی بیمار نیست.",
      "explanationEn": "This scenario is set in NSW and reflects sources checked on 26 September 2026; the purchaser is not known to the pharmacist. NSW Health says OTC pseudoephedrine sales must be recorded in the approved online, real-time form at supply through 4 November 2026; the photo-ID reference is recorded when the purchaser is not known to the pharmacist. From 5 November 2026, recording S3 pseudoephedrine sales in NSW will no longer be required; this does not remove therapeutic assessment or other S3 requirements. Do not confuse a primary-pack scheduling threshold with an individual or transaction purchase cap. Editorial correction based on official sources accessed 26 September 2026; qualified clinical review has not occurred. This does not replace current state/territory law, pharmacy policy, or patient assessment."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "emergency-supply-continued-dispensing",
    "documentId": "doc-scenario-clinical-emergency-supply-continued-dispensing",
    "titleFa": "C2. اتمام داروی فشار خون در تعطیلات و درخواست تحویل اضطراری (Emergency Supply / Continued Dispensing)",
    "titleEn": "C2. Emergency Supply / Continued Dispensing Demand (GP Closed)",
    "mode": "MODE_C_CONFLICT",
    "categoryFa": "تحویل اضطراری و Continued Dispensing (Emergency Supply)",
    "categoryEn": "Continued Dispensing & Emergency Supply",
    "presentationFa": "قرص‌های فشار خون و چربی من (Norvasc 5mg و Lipitor 20mg) کاملاً تمام شده و مطب دکترم تا روز دوشنبه تعطیل است! آیا می‌توانید یک بسته به من بدهید تا آخر هفته تعطیلات بدون دارو نمانم؟ بدون قرص فشار خونم خطرناک بالا می‌رود!",
    "presentationEn": "I've completely run out of my blood pressure and cholesterol tablets (Norvasc 5mg and Lipitor 20mg) and my GP clinic is shut until Monday. Can you just hand me a pack to get me through the long weekend? My blood pressure will skyrocket!",
    "patientName": "Helen Patterson",
    "patientAge": 62,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و داروها؟",
        "labelEn": "W - Patient & chronic medications?",
        "questionFa": "چه داروهایی مصرف می‌کنید و دوز دقیق آنها چیست؟",
        "questionEn": "What exact medications and doses have you been taking?",
        "answerFa": "قرص آملودیپین (Norvasc 5mg روزی ۱ عدد) و آتورواستاتین (Lipitor 20mg شب‌ها) که بیش از ۳ سال است مصرف می‌کنم.",
        "answerEn": "Amlodipine (Norvasc 5mg once daily) and Atorvastatin (Lipitor 20mg at night) for over 3 years."
      },
      {
        "key": "H",
        "labelFa": "H - تاریخچه مصرف در این داروخانه؟",
        "labelEn": "H - Dispensing history in this pharmacy?",
        "questionFa": "آیا قبلاً این داروها را از همین داروخانه تحویل گرفته‌اید؟",
        "questionEn": "Have you had these prescriptions dispensed at our pharmacy previously?",
        "answerFa": "بله، پرونده دارم و ماه گذشته تکرار آخر نسخه‌ام را همین‌جا تحویل گرفتم.",
        "answerEn": "Yes, I am a regular patient here and filled my last repeat at this counter last month."
      },
      {
        "key": "A",
        "labelFa": "A - دسترسی به پزشک و گزینه‌های اورژانسی؟",
        "labelEn": "A - Prescriber access & urgent care?",
        "questionFa": "آیا امکان دریافت نسخه الکترونیک (eScript) از طریق تلفن یا کلینیک شبانه‌روزی وجود دارد؟",
        "questionEn": "Have you attempted a telehealth consultation or after-hours GP service?",
        "answerFa": "کلینیک معمولم تعطیل است و سرویس آنلاین تا ۲ روز دیگر وقت خالی ندارد.",
        "answerEn": "My regular GP is away for the long weekend and online telehealth is fully booked until Monday."
      },
      {
        "key": "T",
        "labelFa": "T - علائم فشار خون و احساس سرگیجه؟",
        "labelEn": "T - Blood pressure symptoms?",
        "questionFa": "آیا سردرد شدید، تاری دید یا درد سینه دارید؟",
        "questionEn": "Any severe occipital headache, visual blurring, or chest pain?",
        "answerFa": "خیر، هیچ علامت حادی ندارم فقط نگران قطع دارو در این ۳ روز هستم.",
        "answerEn": "No acute symptoms, just anxious about missing doses over the long weekend."
      }
    ],
    "redFlags": [
      {
        "fa": "درخواست داروی غیرمجاز (مانند داروهای Schedule 8 مواد مخدر یا بنزودیازپین‌های S4 که مشمول Continued Dispensing نیستند)",
        "en": "Ineligible drug classes: Schedule 8 controlled drugs or S4 psychotropics/benzodiazepines"
      },
      {
        "fa": "بیمار فاقد سابقه مصرف قبلی پایدار یا عدم وجود پرونده دیسپنسینگ قبلی در سیستم داروخانه",
        "en": "No previous stable dispensing history or unverified prescription regimen"
      },
      {
        "fa": "وجود علائم حاد بالینی خطرناک (درد قفسه سینه، تنگی نفس شدید یا فشار خون بالای 180/120)",
        "en": "Severe hypertensive crisis symptoms (chest pain, dyspnea, BP >180/120)"
      }
    ],
    "dialogueOptions": [
      {
        "id": "es1",
        "textFa": "رد کامل درخواست و فرستادن بیمار بدون دارو به اورژانس شلوغ بیمارستان برای گرفتن یک نسخه ساده.",
        "textEn": "Refuse all emergency assistance and direct the stabilized patient to hospital emergency department for a routine refill.",
        "patientReplyFa": "آیا طبق مقررات Continued Dispensing و Emergency Supply داروسازان استرالیا نمی‌توانند درمان پایدار را تامین کنند؟",
        "patientReplyEn": "Can't Australian pharmacists supply ongoing chronic therapy under PBS Continued Dispensing arrangements?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "es2",
        "textFa": "اجرای پروتکل رسمی PBS Continued Dispensing / Emergency Supply استرالیا: ۱) بررسی معیارهای قانونی صلاحیت (Eligibility Criteria): الف) نیاز فوری درمانی (Immediate clinical need) و عدم دسترسی به پزشک در تعطیلات، ب) درمان پایدار قبلی تاییدشده در سوابق سیستم داروخانه ظرف ۶ ماه گذشته، ج) داروی واجد شرایط در فهرست Continued Dispensing (داروهای ضد فشار خون و کاهنده چربی خون مشمول هستند). ۲) صدور داروی استاندارد: تحویل یک بسته استاندارد دارویی تحت پوشش یارانه دولتی PBS Continued Dispensing (یا تحویل اضطراری Emergency Supply طبق قوانین ایالتی). ۳) ثبت اسناد و اطلاع‌رسانی: ثبت کامل در سامانه نرم‌افزاری، پرینت لیبل با ذکر Continued Dispensing و ارسال نوتیفیکیشن مکتوب به پزشک عمومی بیمار (GP Notification within 7 days). ۴) اطمینان‌بخشی و مشاوره: پایش فشار خون فعلی در داروخانه و تاکید بر مراجعه به پزشک در روز دوشنبه برای دریافت نسخه الکترونیک جدید.",
        "textEn": "Australian PBS Continued Dispensing & Emergency Supply Execution Protocol: 1) Regulatory Eligibility Verification: a) Immediate clinical necessity and unviable prescriber access during long weekend, b) Verified prior stable therapy dispensed within the previous 6 months on pharmacy dispensing records, c) Eligible PBS Continued Dispensing therapeutic classes (Statins & Antihypertensives are fully eligible). 2) Compliant Dispensing: Supply a standard PBS maximum quantity pack under PBS Continued Dispensing arrangements (or state Emergency Supply provisions). 3) Mandatory Documentation & Prescriber Notification: Record continued dispensing entry, apply compliant dispensing labels, and issue written notification to the patient's regular GP within 7 days. 4) Clinical Care: Measure baseline in-pharmacy BP, reassure the patient, and advise booking a routine GP appointment on Monday for fresh eScripts.",
        "patientReplyFa": "بی‌نهایت از شما متشکرم داروساز گرامی! از اینکه با استفاده از اختیارات قانونی‌تان نگذاشتید درمانم قطع شود بسیار قدردانم.",
        "patientReplyEn": "Thank you so much pharmacist! You have given me complete peace of mind over the long weekend. I will see my GP on Monday.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید تحویل یک بسته استاندارد تحت مقررات PBS Continued Dispensing + ارسال نوتیفیکیشن به GP بیمار",
      "recommendationEn": "Approved PBS Continued Dispensing Supply of Norvasc 5mg & Lipitor 20mg + Formal GP Notification",
      "explanationFa": "برنامه Continued Dispensing استرالیا به داروسازان اجازه می‌دهد در صورت عدم دسترسی به پزشک، برای داروهای مزمن واجد شرایط (مانند داروهای قلبی، فشار خون، دیابت و آسم) که قبلاً پایدار بوده‌اند، یک بسته استاندارد دارویی با پوشش PBS تحویل دهند تا زنجیره درمان قطع نشود.",
      "explanationEn": "Under Australian PBS Continued Dispensing provisions, registered pharmacists can supply a single standard PBS quantity of eligible chronic medicines to ensure continuity of care when the prescriber is unavailable and stable prior therapy is confirmed."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "angry-wait-time-deescalation",
    "documentId": "doc-scenario-clinical-angry-wait-time-deescalation",
    "titleFa": "C3. اعتراض پرخاشگرانه به زمان معطلی تحویل نسخه و آرام‌سازی (Angry Wait Time & De-escalation)",
    "titleEn": "C3. Patient Angry About Dispensing Wait Time",
    "mode": "MODE_C_CONFLICT",
    "categoryFa": "مدیریت تعارض و خدمات مشتریان (Conflict Resolution)",
    "categoryEn": "Conflict De-escalation & Clinical Safety",
    "presentationFa": "چرا ۲۵ دقیقه است معطل یک برچسب چسباندن روی یک جعبه آماده هستم؟ سه نفر پشت آن میز ایستاده‌اید و فقط حرف می‌زنید! این چه وضع خدماتی است؟ نسخه من فقط ۲ تا قلم داروی ساده بود!",
    "presentationEn": "Why is it taking 25 minutes just to slap a sticky label on a pre-made box? There are three of you standing behind that bench doing nothing! My script was just two simple boxes!",
    "patientName": "Darren Fletcher",
    "patientAge": 48,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - هویت و نسخه بیمار؟",
        "labelEn": "W - Patient verification?",
        "questionFa": "نام و نام خانوادگی و تاریخ تولد شما چیست؟",
        "questionEn": "May I confirm your full name and date of birth?",
        "answerFa": "دارن فلچر (Darren Fletcher)، متولد ۱۲ مارس ۱۹۷۸.",
        "answerEn": "Darren Fletcher, 12th March 1978."
      },
      {
        "key": "H",
        "labelFa": "H - داروهای نسخه شده؟",
        "labelEn": "H - Prescribed items?",
        "questionFa": "نسخه شما شامل چه داروهایی است؟",
        "questionEn": "What medications were on your prescription today?",
        "answerFa": "قرص وارفارین (Coumadin 2mg) و آنتی‌بیوتیک جدید Bactrim DS برای عفونت ادراری.",
        "answerEn": "Warfarin (Coumadin 2mg) and a new antibiotic Bactrim DS."
      },
      {
        "key": "A",
        "labelFa": "A - علت تاخیر و بررسی بالینی؟",
        "labelEn": "A - Reason for clinical delay?",
        "questionFa": "آیا داروساز در حال بررسی تداخل دارویی نسخه شما با پزشک بود؟",
        "questionEn": "Was the pharmacist currently checking a major drug interaction?",
        "answerFa": "نمی‌دانم، فقط دیدم داروساز تلفن به دست است و به مانیتور نگاه می‌کند.",
        "answerEn": "I do not know, I just saw the pharmacist on the phone looking at the screen."
      },
      {
        "key": "T",
        "labelFa": "T - آرام‌سازی و توضیح تداخل؟",
        "labelEn": "T - De-escalation & interaction review?",
        "questionFa": "آیا متوجه شدید که ترکیب باکتریم با وارفارین می‌تواند خطر خونریزی شدید ایجاد کند؟",
        "questionEn": "Were you aware that Bactrim significantly enhances Warfarin toxicity and bleeding?",
        "answerFa": "واقعاً؟ نمی‌دانستم این دو دارو ممکن است با هم تداخل داشته باشند!",
        "answerEn": "Really? I had no idea those two tablets could interact dangerously!"
      }
    ],
    "redFlags": [
      {
        "fa": "خطر تنش فیزیکی یا رفتارهای پرخاشگرانه شدید نیازمند رعایت ایمنی کارکنان و فضای آرام‌سازی",
        "en": "Aggressive escalations risking staff safety requiring de-escalation protocols"
      },
      {
        "fa": "فدا کردن کنترل‌های بالینی و ایمنی بیمار به خاطر عجله و سرعت بخشیدن غیرایمن به فرایند دیسپنسینگ",
        "en": "Bypassing clinical safety verification steps due to time pressure"
      },
      {
        "fa": "عدم انجام مشاوره تحویل نهایی و احراز هویت دوتایی به دلیل عصبانیت مشتری",
        "en": "Omitting 2-identifier patient handover due to customer frustration"
      }
    ],
    "dialogueOptions": [
      {
        "id": "wt1",
        "textFa": "پاسخ تند و توهین‌آمیز به مشتری: «اگر ناراحتید بروید جای دیگر، ما کلی کار مهم‌تر داریم!»",
        "textEn": "Aggressive counter-argument: \"If you don't like the wait, go elsewhere, we have more important things to do!\"",
        "patientReplyFa": "آیا برخورد پرخاشگرانه داروساز نقض فاحش آیین اخلاق حرفه‌ای شورای داروسازی استرالیا نیست؟",
        "patientReplyEn": "Isn't aggressive arguing a severe breach of PBA professional communication standards?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "wt2",
        "textFa": "مدیریت حرفه‌ای تعارض با تکنیک HEAT (Hear, Empathise, Apologise, Take action) و توضیح بررسی بالینی: ۱) شنیدن و همدلی: «آقای فلچر، کاملاً حق با شماست که معطل شدید و من صمیمانه بابت این تاخیر ۲۵ دقیقه‌ای از شما عذرخواهی می‌کنم؛ وقت شما بسیار باارزش است.» ۲) توضیح ارزش بالینی فراتر از برچسب‌زنی: «دلیل این تاخیر این بود که داروساز مسئول ما متوجه یک تداخل بالینی خطرساز بین آنتی‌بیوتیک جدید شما (Bactrim DS) و قرص وارفارین (Coumadin) شد؛ باکتریم اثر وارفارین را به شدت تقویت کرده و خطر خونریزی حاد داخلی ایجاد می‌کند. داروساز ما در حال تماس تلفنی مستقیم با پزشک معالج شما بود تا دوز وارفارین را تعدیل کرده و آزمایش INR فوق‌العاده تنظیم کند تا سلامت شما به خطر نیفتد.» ۳) تحویل محترمانه و مشاوره اختصاصی: احراز هویت دوتایی، ارائه دستورالعمل جدید INR و تحویل دارو در فضایی آرام و محترمانه.",
        "textEn": "Professional HEAT De-escalation (Hear, Empathise, Apologise, Take Action) & Clinical Safety Education: 1) Active Listening & Empathy: \"Mr. Fletcher, I completely understand your frustration regarding the 25-minute wait, and I sincerely apologise for delaying your schedule; your time is truly valuable.\" 2) Transparent Clinical Explanation Beyond \"Label Slapping\": \"The critical reason for this delay was that our clinical pharmacist identified a life-threatening drug interaction between your new antibiotic (Bactrim DS) and your blood thinner (Warfarin). Bactrim dramatically inhibits Warfarin metabolism, risking dangerous internal hemorrhages. Our pharmacist was personally liaising with your prescribing GP to safely adjust your Warfarin dose and schedule an urgent INR blood test to protect your safety.\" 3) Compliant Handover: Verify 2 patient identifiers, provide clear interaction counseling, and ensure respectful customer closure.",
        "patientReplyFa": "خدای من! من واقعاً متاسفم که زود قضاوت کردم. فکر می‌کردم کار فقط برچسب زدن است، نمی‌دانستم جانم را از خونریزی خطرناک نجات دادید. از دقت و صبوری‌تان بی‌نهایت ممنونم.",
        "patientReplyEn": "Blimey, I am so sorry for losing my temper. I genuinely thought it was just printing stickers. Thank you for protecting my life and sorting out that blood thinner interaction with my GP.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "مدیریت موفق تعارض با تکنیک HEAT + توضیح شفاف ایمنی بالینی تداخل Warfarin-Bactrim + تحویل ایمن",
      "recommendationEn": "Approved HEAT De-escalation Protocol & Life-Threatening Warfarin-Bactrim Interaction Resolution",
      "explanationFa": "دیسپنسینگ دارو در استرالیا صرفاً یک فرایند فنی نیست بلکه شامل بررسی دقیق تداخلات دارویی، مناسب بودن دوز، آلرژی‌ها و استانداردهای بالینی است. پاسخ‌دهی همدلانه و تشریح فرایند بالینی نجات‌بخش (مانند تداخل وارفارین و کوتریموکسازول) خشم بیمار را به قدردانی عمیق تبدیل می‌کند.",
      "explanationEn": "Community dispensing incorporates critical clinical evaluation, drug interaction screening, and prescriber liaison. Empathetic de-escalation that transparently communicates clinical safety checks (such as life-threatening Warfarin-Trimethoprim interactions) transforms patient frustration into trust and collaboration."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "safescript-early-refill-s8",
    "documentId": "doc-scenario-clinical-safescript-early-refill-s8",
    "titleFa": "C4. هشدار SafeScript و درخواست جایگزینی زودهنگام داروی S8/S4 (NSW)",
    "titleEn": "C4. SafeScript Alert & Early Replacement Request (NSW; S8/S4)",
    "mode": "MODE_C_CONFLICT",
    "categoryFa": "پایش نسخ SafeScript و داروهای S8 (SafeScript & S8 Monitoring)",
    "categoryEn": "Real-Time Prescription Monitoring & S8 Compliance",
    "presentationFa": "من جعبه قرص‌های اکسیکودون (Endone 5mg) و تمازپام (Temazepam 10mg) خودم را دیروز توی قطار جا گذاشتم و گم شد! همین الان باید این تکرار نسخه من را بپیچید. چرا به پزشکم زنگ می‌زنید و به من مشکوک شدید؟ من درد شدید دارم!",
    "presentationEn": "I lost my box of Endone 5mg and Temazepam on the train yesterday and I need this repeat filled right now. Why are you calling my doctor and treating me like a suspect? I'm in agony!",
    "patientName": "Shane Donovan",
    "patientAge": 39,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - هویت و سوابق نسخه؟",
        "labelEn": "W - Patient & prescription history?",
        "questionFa": "نام کامل شما چیست و آخرین بار چه تاریخی این نسخه را دریافت کردید؟",
        "questionEn": "What is your full name and when was this prescription last dispensed?",
        "answerFa": "شین داناوان هستم؛ ۵ روز پیش یک جعبه ۲۰ تایی Endone گرفتم اما دیروز توی قطار گم شد!",
        "answerEn": "Shane Donovan. I filled a 20-tablet pack of Endone 5 days ago, but lost the entire box on the train."
      },
      {
        "key": "H",
        "labelFa": "H - هشدار سامانه SafeScript؟",
        "labelEn": "H - SafeScript RTPM Status?",
        "questionFa": "آیا در روزهای اخیر از داروخانه دیگری داروی مشابه دریافت کرده‌اید؟",
        "questionEn": "Have you had monitored medicines supplied at another pharmacy recently?",
        "answerFa": "فقط ۳ روز پیش یک کلینیک دیگر رفتم و چند تا قرص گرفتم چون درد داشتم.",
        "answerEn": "Just visited an after-hours GP 3 days ago for extra tablets because of severe pain."
      },
      {
        "key": "A",
        "labelFa": "A - جزئیات هشدار و ارزیابی مصرف هم‌زمان؟",
        "labelEn": "A - Alert details and co-use assessment?",
        "questionFa": "لطفاً جزئیات هشدار ثبت‌شده را بررسی کنیم: آخرین بار چه زمانی اکسی‌کودون و تمازپام مصرف کردید و آیا اکنون خواب‌آلودگی غیرعادی یا دشواری تنفس دارید؟",
        "questionEn": "Can we review the actual alert and check when you last took oxycodone and temazepam, and whether you have unusual drowsiness or breathing difficulty now?",
        "answerFa": "شب‌ها تمازپام مصرف می‌کنم؛ باید زمان دقیق آخرین مصرف اکسی‌کودون را بررسی کنم. هنوز دربارهٔ علائم فعلی از من سؤال نشده است.",
        "answerEn": "I take temazepam at night; I need to check exactly when I last took oxycodone. I have not yet been asked about current symptoms."
      },
      {
        "key": "T",
        "labelFa": "T - ارزیابی بالینی درد و خطرات؟",
        "labelEn": "T - Clinical pain & overdose risk?",
        "questionFa": "آیا از خطرات کشنده مصرف همزمان مسکن قوی با تمازپام مطلع هستید؟",
        "questionEn": "Are you aware of the severe respiratory sedation risks of opioids with Temazepam?",
        "answerFa": "من سال‌هاست این‌ها را می‌خورم و بدنم عادت کرده است.",
        "answerEn": "I have been taking them for a while, my body is used to it."
      }
    ],
    "redFlags": [
      {
        "fa": "هشدار SafeScript یک علامت برای بررسی است، نه دستور یا منع خودکار عرضه. متن واقعی هشدار و سابقهٔ ثبت‌شده را بررسی کنید؛ درخواست زودهنگام به‌تنهایی وجود هشدار قرمز را ثابت نمی‌کند.",
        "en": "A SafeScript alert is a prompt for review, not an instruction or automatic prohibition on supply. Check the actual alert and recorded history; an early request alone does not establish a red alert."
      },
      {
        "fa": "مصرف هم‌زمان اکسی‌کودون و تمازپام می‌تواند خطر سرکوب تنفسی و آسیب جدی را افزایش دهد. مقدار و زمان مصرف، هم‌زمانی داروها، سطح هوشیاری و تنفس بیمار را ارزیابی کنید.",
        "en": "Concurrent oxycodone and temazepam can increase the risk of respiratory depression and serious harm. Assess doses, timing, co-use, alertness, and breathing."
      },
      {
        "fa": "خواب‌آلودگی شدید، دشواری تنفس، بیدار نشدن یا کاهش هوشیاری نشانهٔ نیاز به ارزیابی اورژانسی است؛ این سناریو جایگزین قضاوت بالینی نیست.",
        "en": "Marked sedation, difficulty breathing, inability to wake, or reduced consciousness requires urgent emergency assessment; this scenario does not replace clinical judgment."
      }
    ],
    "dialogueOptions": [
      {
        "id": "ss1",
        "textFa": "نادیده گرفتن هشدار قرمز SafeScript و تحویل زودهنگام داروی S8 اکسیکودون بدون تماس با پزشک معالج.",
        "textEn": "Override SafeScript Red Alert and dispense early S8 oxycodone without prescriber confirmation.",
        "patientReplyFa": "آیا تحویل زودهنگام داروی کنترل‌شده S8 با وجود هشدار قرمز مانیتورینگ بدون تایید پزشک خلاف صریح قانون نیست؟",
        "patientReplyEn": "Isn't dispensing an early S8 repeat despite a SafeScript Red Alert a direct breach of poisons legislation?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "ss2",
        "textFa": "مدیریت بی‌قضاوت و مبتنی بر ارزیابی موردی: ۱) نگرانی بیمار را با همدلی بشنوید و او را متهم نکنید. ۲) جزئیات هشدار واقعی SafeScript، نسخه و دستور مصرف معتبر، سوابق تحویل و زمان‌بندی را بررسی کنید؛ صرف درخواست زودهنگام را با وجود هشدار قرمز یا ممنوعیت قانونی یکی ندانید. ۳) در این پرونده، ادعای مفقودی، دریافت اخیر دارو و مصرف هم‌زمان اکسی‌کودون و تمازپام، ارزیابی دقیق خطر و تماس با نسخه‌نویس را در صورت اقتضای بالینی مهم می‌کند. هوشیاری، تنفس، دوزها و زمان مصرف را بسنجید و در علائم حاد، ارجاع اورژانسی دهید. ۴) راهنمای NSW می‌گوید بیمار لازم نیست مفقودی داروی تحویلی را به Pharmaceutical Services گزارش کند؛ گزارش پلیس الزام همگانی یا پیش‌شرط خودکار جایگزینی نیست و فرد می‌تواند در صورت نگرانی با پلیس تماس بگیرد. داروساز ممکن است بسته به نوع دارو، سابقه و شرایط بتواند یا نتواند جایگزین بدهد. بدون بررسی نسخه، مقررات جاری NSW و شرایط بیمار، دربارهٔ تحویل یا مسکن جایگزین وعده ندهید؛ تصمیم و علت را مستند کنید.",
        "textEn": "Use a non-judgmental, case-specific safety assessment: 1) Acknowledge the patient’s concern without treating them as a suspect. 2) Review the actual SafeScript alert, valid prescription and directions, dispensing history, and timing; do not equate an early request with proof of a red alert or a legal prohibition. 3) In this case, the reported loss, recent supply, and oxycodone–temazepam combination warrant careful risk assessment and prescriber liaison when clinically indicated. Check alertness, breathing, doses, and timing; escalate urgently if acute symptoms are present. 4) NSW patient guidance says a person does not need to notify Pharmaceutical Services about lost or stolen dispensed medicine. A police report is not a universal prerequisite for replacement; the patient may contact police if concerned. Depending on the medicine, history, and circumstances, a pharmacist may or may not be able to provide a replacement. Do not promise supply or interim analgesia before checking the prescription, current NSW requirements, and individual suitability; document the decision and rationale.",
        "patientReplyFa": "متوجه شدم؛ ممنون که موضوع را بدون قضاوت بررسی می‌کنید. لطفاً هشدار و سابقه را ببینید و اگر لازم بود با پزشکم هماهنگ کنید.",
        "patientReplyEn": "I understand. Thank you for reviewing this without judgment. Please check the alert and history, and contact my prescriber if needed.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": false
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "پیش از تصمیم دربارهٔ جایگزینی، هشدار و سوابق واقعی، نسخه و دستور مصرف و خطر مصرف هم‌زمان را بررسی کنید؛ در صورت نیاز بالینی با نسخه‌نویس هماهنگ و تصمیم را مستند کنید.",
      "recommendationEn": "Before deciding about replacement, review the actual alert and dispensing history, prescription and directions, and co-use risks; liaise with the prescriber when clinically indicated and document the decision.",
      "explanationFa": "طبق راهنمای NSW، هشدار SafeScript به‌تنهایی دستور یا منع عرضه نیست و تصمیم را باید متخصص با توجه به ایمنی و تناسب بالینی بگیرد. در این پرونده، ترکیب اپیوئید و بنزودیازپین یک خطر بالینی مهم است؛ اما نه مفقودی ادعاشده و نه نبود گزارش پلیس به‌تنهایی پاسخ قانونی یا بالینی را تعیین نمی‌کند.",
      "explanationEn": "NSW guidance states that a SafeScript alert is not itself an order or prohibition; the practitioner decides whether supply is clinically safe and appropriate. The opioid–benzodiazepine combination is a material clinical risk in this case, but neither a reported loss nor the absence of a police report alone determines the legal or clinical decision."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/clinicalScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "admin-lost-escript-mysl",
    "documentId": "doc-scenario-admin-admin-lost-escript-mysl",
    "titleFa": "A1. توکن نسخهٔ الکترونیک گم‌شده: مسیر ASL/MySL و بازیابی",
    "titleEn": "A1. Lost eScript Token: ASL/MySL Eligibility & Recovery",
    "mode": "MODE_A_ADMIN",
    "categoryFa": "خدمات دیجیتال و MySL (Digital Health)",
    "categoryEn": "Digital Health & MySL",
    "presentationFa": "سلام رفیق (G'day mate)، پزشکم یک نسخه الکترونیک (eScript) به موبایلم فرستاده بود، اما اشتباهاً پیامک (SMS) حاوی توکن را پاک کردم! آیا می‌توانید از طریق MySL (Active Script List) نسخه مرا بررسی کنید؟",
    "presentationEn": "G'day mate, my GP sent an eScript to my mobile, but I accidentally deleted the SMS with the token. Can you check my MySL (Active Script List) and pull it up?",
    "patientName": "Liam Henderson",
    "patientAge": 42,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - هویت و ثبت‌نام ASL؟",
        "labelEn": "W - Identity and ASL registration?",
        "questionFa": "طبق روند احراز هویت داروخانه، آیا قبلاً برای Active Script List (ASL/MySL) ثبت‌نام کرده‌اید؟",
        "questionEn": "After we verify your identity under pharmacy policy, have you already registered for an Active Script List (ASL/MySL)?",
        "answerFa": "کارت مدیکر و مدرک شناسایی دارم، اما تا حالا فقط توکن‌ها را با پیامک گرفته‌ام و مطمئن نیستم ASL داشته باشم.",
        "answerEn": "I have my Medicare card and photo ID, but I have only received prescription tokens by SMS and do not think I have registered for an ASL."
      },
      {
        "key": "H",
        "labelFa": "H - زمان صدور و نام دارو؟",
        "labelEn": "H - Issue time & medication?",
        "questionFa": "پزشک چه زمانی نسخه را صادر کرده و داروی تجویزی چیست؟",
        "questionEn": "When did your GP issue the prescription and what was the medication?",
        "answerFa": "همین امروز صبح دکترم برای فشار خون و کلسترول قرص Coversyl 5mg و Atorvastatin 20mg تجویز کرد.",
        "answerEn": "Just this morning my GP prescribed Coversyl 5mg and Atorvastatin 20mg for blood pressure and cholesterol."
      },
      {
        "key": "A",
        "labelFa": "A - دسترسی قبلی داروخانه به ASL؟",
        "labelEn": "A - Has this pharmacy been granted ASL access?",
        "questionFa": "اگر ASL دارید، آیا قبلاً این داروخانه را برای دسترسی انتخاب کرده‌اید یا درخواست دسترسی جدید را در برنامه تأیید کرده‌اید؟",
        "questionEn": "If you have an ASL, has this pharmacy already been granted access, or have you confirmed a new access request in the system?",
        "answerFa": "فکر نمی‌کنم ASL ثبت‌نام کرده باشم و درخواست دسترسی پیامکی یا ایمیلی را هم تأیید نکرده‌ام.",
        "answerEn": "I do not think I have an ASL, and I have not confirmed an access request by SMS or email."
      },
      {
        "key": "T",
        "labelFa": "T - توکن اصلی یا تکرار نسخه؟",
        "labelEn": "T - Original or repeat token?",
        "questionFa": "این توکن مربوط به نسخهٔ اصلیِ تازه‌صادرشده است یا توکن تکراری که داروخانه‌ای قبلاً صادر کرده؟",
        "questionEn": "Is this the original token for a newly issued prescription, or a repeat token previously issued by a pharmacy?",
        "answerFa": "نسخهٔ اصلی را پزشکم همین امروز صادر کرد؛ تکرار نسخه نیست.",
        "answerEn": "My GP issued the original prescription this morning; it is not a repeat."
      }
    ],
    "redFlags": [
      {
        "fa": "باز کردن ASL پیش از احراز هویت مصرف‌کننده و تأیید ثبت‌نام/دسترسی مجاز و رضایت لازم در workflow نرم‌افزار.",
        "en": "Opening an ASL before identity checks and confirmation of registration, authorised access and required consent in the dispensing-software workflow."
      },
      {
        "fa": "فرض اینکه هر توکن پیامکیِ حذف‌شده، حتی بدون ثبت‌نام ASL، خودکار در MySL قابل بازیابی است.",
        "en": "Assuming every deleted SMS token is automatically retrievable in MySL even when the consumer is not registered for an ASL."
      },
      {
        "fa": "دیسپنس پیش از بازیابی واقعی، اعتبارسنجی نسخه و بررسی الزامات مرتبط.",
        "en": "Dispensing before the prescription is retrieved, validated and checked against applicable requirements."
      }
    ],
    "dialogueOptions": [
      {
        "id": "a1_opt1",
        "textFa": "رد کردن درخواست و گفتن به بیمار که داروخانه بدون داشتن پیامک حاوی بارکد هیچ کاری نمی‌تواند بکند و باید دوباره در صف مطب GP بنشیند.",
        "textEn": "Refuse service and inform patient that without the SMS link, the dispensary cannot help and he must wait at the GP clinic again.",
        "patientReplyFa": "متوجه شدم. می‌توانید اول بررسی کنید آیا برای ASL ثبت‌نام کرده‌ام و داروخانه به فهرستم دسترسی مجاز دارد؟ اگر نه، برای همین نسخه چه راهی دارم؟",
        "patientReplyEn": "I understand. Could you first check whether I am registered for an ASL and whether your pharmacy has authorised access? If not, what can I do for this prescription?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "a1_opt2",
        "textFa": "مسیر درست را بدون وعدهٔ بازیابی خودکار توضیح دهید: ۱) ابتدا هویت بیمار را طبق سیاست جاری داروخانه احراز کنید. ASL/MySL فقط وقتی جای توکن را می‌گیرد که مصرف‌کننده برای ASL ثبت شده و نسخهٔ فعالِ واجدشرایط در آن قابل مشاهده باشد. ۲) اگر ASL ثبت است و داروخانه قبلاً دسترسی مجاز دارد، جزئیات نسخه را از نرم‌افزار دیسپنسینگ بررسی کنید. اگر دسترسی ندارید، درخواست دسترسی را از workflow نرم‌افزار ارسال کنید و فقط پس از تأیید رضایت مصرف‌کننده از مسیر پیامک/ایمیل و اعطای دسترسی، فهرست را باز کنید. رضایت شفاهی به‌تنهایی جای این تأیید سامانه‌ای را نمی‌گیرد. ۳) اگر بیمار ASL ندارد—همان‌طور که در این پرونده می‌گوید—فرض نکنید توکن پیامکیِ حذف‌شده اکنون در MySL قابل بازیابی است. برای توکن نسخهٔ اصلیِ گم‌شده، با نسخه‌نویس تماس بگیرید تا توکن را دوباره ارسال کند؛ برای توکن تکرار، با داروخانهٔ صادرکننده تماس بگیرید. ۴) می‌توانید برای آینده، در صورت تمایل بیمار، ثبت‌نام ASL را از راه نرم‌افزار و با احراز هویت، دریافت/تأیید IHI از HI Service و رضایت‌های لازم توضیح دهید؛ ثبت‌نام یا دسترسی را کامل‌شده فرض نکنید. نسخه را فقط پس از بازیابی و اعتبارسنجی واقعی و رعایت مقررات مرتبط دیسپنس کنید.",
        "textEn": "Explain the correct path without promising automatic recovery: 1) First verify the consumer’s identity under current pharmacy policy. ASL/MySL replaces the need to present a token only when the consumer is registered for an ASL and the active prescription is available there. 2) If an ASL is already registered and this pharmacy has authorised access, check the prescription in the dispensing software. If access is not already granted, request it through the software workflow and open the list only after the consumer confirms consent through the required SMS/email process and access is granted; verbal consent alone does not replace this system confirmation. 3) This patient says they do not have an ASL, so do not assume the deleted SMS token is now retrievable from MySL. For a lost token for an original prescription, contact the prescriber to resend it; for a repeat token, contact the pharmacy that issued it. 4) If the patient wishes, explain assisted ASL registration for future use. The dispensing software must complete the identity, IHI/HI Service and consent steps; do not imply registration or access is already complete. Dispense only after the prescription has actually been retrieved and validated and all applicable requirements are met.",
        "patientReplyFa": "متوجه شدم. لطفاً برای همین نسخه با پزشکم تماس بگیرید و اگر بخواهم، مراحل ثبت‌نام ASL را هم برای دفعات بعد توضیح دهید.",
        "patientReplyEn": "I understand. Please contact my GP about this prescription, and explain ASL registration for future prescriptions if I choose to use it.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "برای این نسخهٔ اصلیِ فاقد توکن، با نسخه‌نویس تماس بگیرید؛ ASL را فقط پس از تأیید ثبت‌نام، هویت و دسترسی مجاز بررسی کنید. پیش از بازیابی و اعتبارسنجی نسخه، دیسپنس نکنید.",
      "recommendationEn": "For this original prescription with no token and no registered ASL, contact the prescriber. Use ASL only after confirming registration, identity and authorised access. Do not dispense until the prescription is retrieved and validated.",
      "explanationFa": "راهنمای ADHA می‌گوید ASL یک راهکار مدیریت توکن است. دسترسی به نسخهٔ فعال به ثبت ASL و دسترسی/رضایت لازم وابسته است؛ اگر دسترسی جدید درخواست شود، مصرف‌کننده باید تأیید پیامکی/ایمیلی مقرر را انجام دهد. راهنمای مصرف‌کننده برای توکنِ نسخهٔ اصلیِ گم‌شده، تماس با نسخه‌نویس و برای توکن تکرار، تماس با داروخانهٔ صادرکننده را پیشنهاد می‌کند. این سناریو بازبینی‌نشده است و جایگزین راهنمای نرم‌افزار، سیاست محل کار یا مقررات جاری نیست.",
      "explanationEn": "ADHA describes an ASL as a token-management solution. Access to an active prescription depends on ASL registration and the required access/consent; if new access is requested, the consumer must complete the required SMS/email confirmation. ADHA consumer guidance says to contact the prescriber for a lost original token and the issuing pharmacy for a lost repeat token. This scenario remains unreviewed and does not replace dispensing-software guidance, workplace policy or current requirements."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/adminScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "admin-third-party-pickup",
    "documentId": "doc-scenario-admin-admin-third-party-pickup",
    "titleFa": "A2. تحویل داروی عضو سالخورده خانواده توسط شخص ثالث (Picking up for Elderly Family Member)",
    "titleEn": "A2. Third-Party Script Collection for Elderly Family Member",
    "mode": "MODE_A_ADMIN",
    "categoryFa": "قوانین تحویل و احراز هویت (Dispensing & ID)",
    "categoryEn": "Dispensing & Identification",
    "presentationFa": "سلام، من برای تحویل قرص‌های فشار خون مادرم (Margaret Taylor) آمده‌ام. آیا کارت مدیکر او را لازم دارید یا کارت شناسایی (ID) خودم را بررسی می‌کنید؟",
    "presentationEn": "Hi there, I’m here to pick up my mum's blood pressure tablets (Margaret Taylor). Do you need her Medicare card or my ID?",
    "patientName": "Chloe Taylor (Daughter of Margaret Taylor)",
    "patientAge": 36,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - مشخصات بیمار و تحویل‌گیرنده؟",
        "labelEn": "W - Patient & Collector Identity?",
        "questionFa": "نام کامل، تاریخ تولد و آدرس محل سکونت مادرتان را بفرمایید و آیا مدرک شناسایی همراه دارید؟",
        "questionEn": "Could you please confirm your mum’s full name, date of birth, and residential address?",
        "answerFa": "مادرم Margaret Taylor، متولد ۱۲ می ۱۹۴۸، ساکن 14 High St است و این گواهینامه رانندگی عکس‌دار من است.",
        "answerEn": "My mum is Margaret Taylor, DOB 12/05/1948, living at 14 High St. Here is my driver licence."
      },
      {
        "key": "H",
        "labelFa": "H - سابقه و تغییر دوز جدید؟",
        "labelEn": "H - History & dose change?",
        "questionFa": "آیا مادرتان مدتی طولانی است این دارو را مصرف می‌کند یا پزشک دوز آن را اخیراً افزایش داده است؟",
        "questionEn": "Has she been taking this medication long-term, or has the doctor adjusted the dose recently?",
        "answerFa": "پزشک دیروز دوز داروی Amlodipine او را از ۵ میلی‌گرم به ۱۰ میلی‌گرم افزایش داد.",
        "answerEn": "The GP increased her Amlodipine dose from 5mg to 10mg just yesterday."
      },
      {
        "key": "A",
        "labelFa": "A - قرص‌های ۵mg باقی‌مانده در منزل؟",
        "labelEn": "A - Leftover 5mg stock?",
        "questionFa": "آیا مادرتان در خانه قرص‌های ۵ میلی‌گرمی قبلی دارد که ممکن است اشتباهاً همزمان مصرف کند؟",
        "questionEn": "Does she have leftover 5mg tablets at home that could cause accidental double-dosing?",
        "answerFa": "بله چند تا دارد، حتماً جعبه قبلی را جمع‌آوری می‌کنم یا برای امحا به داروخانه می‌آورم.",
        "answerEn": "Yes a few. I will collect and return or dispose of the older 5mg box to avoid mistakes."
      },
      {
        "key": "T",
        "labelFa": "T - نیاز به تماس مشاوره داروساز؟",
        "labelEn": "T - Pharmacist phone consult?",
        "questionFa": "آیا نیاز است داروساز تلفنی با مادرتان صحبت کند و عوارض احتمالی ورم پا (Ankle Oedema) را توضیح دهد؟",
        "questionEn": "Would you like the pharmacist to phone your mother to discuss the dose increase and check for ankle oedema?",
        "answerFa": "بسیار عالی می‌شود، او همیشه توصیه‌های داروساز را به دقت رعایت می‌کند.",
        "answerEn": "That would be fantastic, she really appreciates personal pharmacist check-ins."
      }
    ],
    "redFlags": [
      {
        "fa": "تحویل دارو به شخص ثالث بدون تطبیق حداقل ۲ شناسه هویتی معتبر بیمار (نام کامل + آدرس یا تاریخ تولد)",
        "en": "Dispensing to a third-party agent without verifying 2 patient identifiers (Full Name + Address/DOB)"
      },
      {
        "fa": "وجود تغییر دوز جدید (Dose Titration: 5mg -> 10mg) بدون اطمینان از آگاهی بیمار اصلی",
        "en": "Uncommunicated dose alteration without verifying patient awareness"
      },
      {
        "fa": "عدم بررسی خطر مصرف دوبرابر قرص‌های قبلی باقی‌مانده در منزل (Double-Dosing Hazard)",
        "en": "Risk of patient taking leftover old strength alongside newly dispensed higher strength"
      }
    ],
    "dialogueOptions": [
      {
        "id": "a2_opt1",
        "textFa": "تحویل سریع دارو به شخص مراجعه‌کننده بدون پرسیدن آدرس/تاریخ تولد بیمار و بدون اشاره به دو برابر شدن دوز آملودیپین.",
        "textEn": "Hand over medication instantly without confirming 2 patient identifiers and without addressing the dose increase.",
        "patientReplyFa": "آیا نباید نام و آدرس مادرم را با پرونده تطبیق دهید؟ و آیا نباید درباره نحوه مصرف دوز جدید ۱۰mg راهنمایی کنید؟",
        "patientReplyEn": "Shouldn't you confirm my mum's address and explain how she should handle the new 10mg strength?",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "a2_opt2",
        "textFa": "اجرای پروتکل تحویل شخص ثالث (Third-Party Collection & Titration Protocol): ۱) تطبیق قطعی ۲ شناسه هویتی بیمار (نام کامل + تاریخ تولد/آدرس) در سیستم Fred Dispense. ۲) نصب لیبل هشدار تغییر دوزینگ (Dose Change Alert: 5mg -> 10mg) روی جعبه دارو. ۳) ثبت یادداشت بالینی و تنظیم تماس تلفنی پیگیری داروساز (Follow-up Call) برای مادر جهت پایش افت فشار وضعیتی و ورم مچ پا (Peripheral Oedema).",
        "textEn": "Execute Third-Party Agent Protocol: 1) Verify 2 unique patient identifiers (Full Name, DOB, Address). 2) Affix Dose Change Warning Label (Amlodipine 5mg -> 10mg). 3) Provide patient handout and arrange a pharmacist follow-up call to check blood pressure response and ankle swelling.",
        "patientReplyFa": "بسیار از دقت بالینی و پیگیری شما سپاسگزارم. جعبه‌های ۵mg قبلی را کنار می‌گذارم و به مادرم اطلاع می‌دهم که منتظر تماس داروساز باشد.",
        "patientReplyEn": "Thank you so much for your clinical care! I will clear out the older 5mg box and tell mum to expect the pharmacist phone call.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید هویت شخص ثالث، تحویل Amlodipine 10mg با لیبل تغییر دوز و ثبت تماس پیگیری",
      "recommendationEn": "Approved Third-Party Handout with 2-Identifier Match & Dose Change Counseling",
      "explanationFa": "طبق استانداردهای Pharmacy Board of Australia و PSA، تحویل دارو به نماینده بیمار مجاز است به شرطی که ۲ شناسه هویتی مستقل تایید شود. در صورت تغییر دوز (Dose Titration)، داروساز باید تدابیر پیشگیرانه جهت جلوگیری از خطای مصرف دوبرابر (Double Dosing) را به کار گیرد.",
      "explanationEn": "Australian dispensing standards permit third-party collection provided 2 patient identifiers are verified. When titration occurs (Amlodipine 5mg to 10mg), pharmacist intervention prevents accidental double dosing."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/adminScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "admin-medicare-copayment-safetynet",
    "documentId": "doc-scenario-admin-admin-medicare-copayment-safetynet",
    "titleFa": "A3. ابهام فرانشیز مدیکر: تفاوت General $31.60 و Concession $7.70 و سقف Safety Net",
    "titleEn": "A3. Medicare Concession vs General Co-Payment & PBS Safety Net",
    "mode": "MODE_A_ADMIN",
    "categoryFa": "قیمت‌گذاری و سقف Safety Net (PBS Pricing)",
    "categoryEn": "PBS Pricing & Safety Net",
    "presentationFa": "سلام داروساز عزیز، چرا ماه گذشته برای همین قرص فشار خون مبلغ ۳۱.۶۰ دلار پرداخت کردم، اما امروز دستیار شما فقط ۷.۷۰ دلار از من گرفت؟ آیا اشتباهی در حسابرسی رخ داده است؟",
    "presentationEn": "Hi pharmacist, why was this $31.60 last month, but today your assistant charged me only $7.70? Is there a mistake in your billing system?",
    "patientName": "Robert O'Connor",
    "patientAge": 68,
    "patientGender": "مرد (Male)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - کارت بازنشستگی و تخفیف؟",
        "labelEn": "W - Concession / Pensioner Card?",
        "questionFa": "آیا اخیراً کارت Pensioner Concession Card یا Commonwealth Seniors Health Card از Centrelink دریافت کرده‌اید؟",
        "questionEn": "Did you recently receive a Pensioner Concession Card or Seniors Health Card from Services Australia / Centrelink?",
        "answerFa": "بله! دو هفته پیش ۶۸ ساله شدم و کارتم از Centrelink آمد و به دستیار شما نشان دادم.",
        "answerEn": "Yes! I turned 68 two weeks ago and received my Pensioner Concession Card from Centrelink, which I showed to your assistant."
      },
      {
        "key": "H",
        "labelFa": "H - ثبت قبلی در داروخانه؟",
        "labelEn": "H - Prior registration status?",
        "questionFa": "آیا در مراجعات قبلی این کارت در سیستم ثبت شده بود؟",
        "questionEn": "Was this concession card recorded in our dispensary software on your previous visit?",
        "answerFa": "خیر، ماه گذشته هنوز کارتم صادر نشده بود و فقط کارت سبز مدیکر معمولی داشتم.",
        "answerEn": "No, last month I only had my standard green Medicare card."
      },
      {
        "key": "A",
        "labelFa": "A - مفهوم سقف Safety Net؟",
        "labelEn": "A - Safety Net tracking?",
        "questionFa": "آیا اطلاع دارید که تمام پرداخت‌های ۷.۷۰ دلاری شما برای سقف سالانه Safety Net ذخیره می‌شود؟",
        "questionEn": "Are you aware that your PBS co-payments accumulate towards the annual PBS Safety Net threshold?",
        "answerFa": "اسم Safety Net را شنیده‌ام ولی نمی‌دانم اعداد و شرایط آن دقیقاً چگونه محاسبه می‌شود.",
        "answerEn": "I have heard of the Safety Net, but don’t know the exact rules and dollar thresholds."
      },
      {
        "key": "T",
        "labelFa": "T - اعضای خانواده در کارت؟",
        "labelEn": "T - Family safety net link?",
        "questionFa": "آیا مایلید پرونده همسرتان را به پرونده دارویی شما متصل کنیم تا سقف سالانه Safety Net خانوادگی سریع‌تر پر شود؟",
        "questionEn": "Would you like us to link your wife’s prescription profile so your family reaches the free Safety Net threshold faster?",
        "answerFa": "بله حتماً، همسرم نیز داروهای قلبی روزانه مصرف می‌کند.",
        "answerEn": "Yes please, my wife also takes daily cardiac medications."
      }
    ],
    "redFlags": [
      {
        "fa": "ابهام بیمار در مورد ثبت شدن کارت تخفیف بازنشستگی (Pensioner Concession Card) یا رسیدن به سقف Safety Net",
        "en": "Patient confusion regarding newly registered Concession Card or reaching PBS Safety Net threshold"
      },
      {
        "fa": "عدم اتصال پرونده دارویی همسر به کارت Safety Net خانوادگی (Family Safety Net Entitlement)",
        "en": "Failure to link spouse profile for joint annual PBS Safety Net accumulation"
      }
    ],
    "dialogueOptions": [
      {
        "id": "a3_opt1",
        "textFa": "گفتن این که احتمالاً کارخانه دارو تخفیف حراجی گذاشته است و نیازی به توضیح قوانین دولتی فرانشیز PBS نیست.",
        "textEn": "State that the drug manufacturer had a special promotional sale and dismiss the co-payment distinction.",
        "patientReplyFa": "اما داروهای تجویزی با نظارت رسمی دولت فدرال قیمت‌گذاری می‌شوند! آیا قیمت داروی نسخه‌ای حراجی است؟",
        "patientReplyEn": "Aren't PBS prescription prices regulated by the Federal Government? Prescription medicines are not on clearance sales!",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "a3_opt2",
        "textFa": "توضیح کامل ساختار تعرفه‌های مصوب PBS استرالیا: ۱) مبالغ قانونی: تعرفه عمومی (General Patient) تا سقف ۳۱.۶۰ دلار است، در حالی که با ثبت کارت معتبر Pensioner/Health Care Card تعرفه تخفیفی (Concessional Patient) دقیقاً ۷.۷۰ دلار می‌شود. ۲) سقف Safety Net: توضیح اینکه پس از رسیدن به سقف سالانه کانشنال (Safety Net Concession Threshold: ۳۶ نسخه معادل ۲۷۷.۲۰ دلار)، تمام داروهای تجویزی بعدی تا پایان سال تقویمی کاملاً رایگان ($0.00) خواهد بود. ۳) اتصال پرونده همسر جهت تجمیع امتیازات Safety Net خانوادگی.",
        "textEn": "Explain Official PBS Co-Payment & Safety Net Framework: 1) Regulated Fees: General rate is capped up to $31.60, whereas Concessional cardholders pay only $7.70 per PBS script. 2) Safety Net Threshold: Once 36 concessional scripts are reached ($277.20), scripts become $0.00 (FREE) for the remainder of the calendar year. 3) Link spouse onto PBS Safety Net 20-Day Rule family profile.",
        "patientReplyFa": "بسیار متشکرم! الان کاملاً متوجه شدم که کارت بازنشستگی من در سیستم ثبت شده و سیستم Safety Net چقدر به مدیریت هزینه‌های ما کمک می‌کند.",
        "patientReplyEn": "Thank you so much! That clarifies everything perfectly regarding my Centrelink card and the PBS Safety Net benefits.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید اعمال نرخ Concession $7.70 و فعال‌سازی تجمیع خانوادگی Safety Net",
      "recommendationEn": "Approved Concessional Co-Payment Rate ($7.70) & Family Safety Net Linking",
      "explanationFa": "در طرح دارویی استرالیا (PBS)، بیماران General سقف فرانشیز تا ۳۱.۶۰ دلار و دارندگان کارت‌های تخفیف رسمی (Pensioner / Health Care / Seniors) نرخ ثابت ۷.۷۰ دلار پرداخت می‌کنند. داروساز موظف است شفافیت مالی و قوانین حدنصاب سالانه Safety Net را برای مراجعین تبیین نماید.",
      "explanationEn": "Under the Australian PBS, General patients pay up to $31.60 co-payment while Concessional patients pay $7.70. Pharmacists must explain PBS Safety Net thresholds to ensure patients maximize statutory entitlements."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/adminScenarios.ts",
    "contentReviewStatus": "unreviewed"
  },
  {
    "id": "admin-tax-invoice-sick-leave",
    "documentId": "doc-scenario-admin-admin-tax-invoice-sick-leave",
    "titleFa": "A4. فاکتور رسمی بیمه تکمیلی و صدور گواهی استعلاجی میگرن (Tax Invoice & Leave Certificate)",
    "titleEn": "A4. Private Health Fund Tax Invoice & Pharmacist Leave Certificate",
    "mode": "MODE_A_ADMIN",
    "categoryFa": "حیطه اختیارات و گواهی استعلاجی (Scope of Practice)",
    "categoryEn": "Scope of Practice & Certificates",
    "presentationFa": "سلام، آیا می‌توانید یک رسید رسمی با Pharmacy Provider Number برای بیمه تکمیلی من (Bupa / Medibank Private) صادر کنید؟ و آیا داروساز می‌تواند برای حمله شدید میگرن امروزم یک گواهی استعلاجی معتبر برای محل کارم (Absence from Work Certificate) بنویسد؟",
    "presentationEn": "Hi, can I get an official itemised tax invoice with your pharmacy provider number for my private health fund (Bupa/Medibank)? And can the pharmacist issue an Absence from Work Certificate for my acute migraine today?",
    "patientName": "Emma Watson",
    "patientAge": 31,
    "patientGender": "زن (Female)",
    "questions": [
      {
        "key": "W",
        "labelFa": "W - بیمار و نوع شغل؟",
        "labelEn": "W - Patient & Employment?",
        "questionFa": "گواهی استعلاجی را برای چه کسی و برای چه نوع شغلی نیاز دارید؟",
        "questionEn": "Who is the leave certificate for and what type of employment duties do you perform?",
        "answerFa": "برای خودم است؛ من برنامه‌نویس کامپیوتر هستم و به دلیل سردرد میگرنی و حساسیت شدید به نور نمی‌توانم به مانیتور نگاه کنم.",
        "answerEn": "For myself; I am a software developer and the migraine photophobia makes it impossible to look at screens."
      },
      {
        "key": "H",
        "labelFa": "H - شروع سردرد و علائم؟",
        "labelEn": "H - Onset & symptoms?",
        "questionFa": "سردرد از چه زمانی شروع شده و چه علائمی مانند تهوع یا اختلال بینایی (Aura) دارید؟",
        "questionEn": "When did the migraine start and do you have nausea, vomiting or visual aura?",
        "answerFa": "از ساعت ۶ صبح با دیدن جرقه‌های نوری و حالت تهوع شروع شد و الان یک‌طرف سرم تیر می‌کشد.",
        "answerEn": "It started at 6am with visual zig-zags (aura), nausea, and intense unilateral throbbing pain."
      },
      {
        "key": "A",
        "labelFa": "A - داروی میگرن مصرفی؟",
        "labelEn": "A - Migraine treatment?",
        "questionFa": "آیا سابقه تشخیص میگرن توسط پزشک دارید و داروی تریپتان (مانند Sumatriptan) مصرف کرده‌اید؟",
        "questionEn": "Have you been diagnosed with migraine by a GP previously, and do you take triptans (e.g. Sumatriptan S3)?",
        "answerFa": "بله سابقه میگرن دارم و برای حمله امروز قرص Sumatriptan 50mg خریدم.",
        "answerEn": "Yes, diagnosed 3 years ago and I took Sumatriptan 50mg this morning."
      },
      {
        "key": "T",
        "labelFa": "T - مدت زمان گواهی؟",
        "labelEn": "T - Certificate duration?",
        "questionFa": "برای چند روز نیاز به گواهی استراحت پزشکی دارید؟",
        "questionEn": "How many days of absence from work are you requesting?",
        "answerFa": "فقط برای امروز (۱ روز) نیاز دارم تا در اتاق تاریک استراحت کنم و فردا به کار برمی‌گردم.",
        "answerEn": "Just for today (1 day) so I can rest in a dark quiet room, and I will be back at work tomorrow."
      }
    ],
    "redFlags": [
      {
        "fa": "صدور گواهی استعلاجی برای بیماری‌های پیچیده خارج از حیطه مجاز داروساز یا صدور گواهی با تاریخ گذشته (Backdating is strictly illegal under Fair Work Act 2009)",
        "en": "Issuing leave certificates outside scope, for >2 days, or backdating (illegal under Australian Fair Work Act)"
      },
      {
        "fa": "عدم درج شماره نظام داروسازی AHPRA و امضای رسمی داروساز مسئول",
        "en": "Omission of pharmacist AHPRA registration number and statutory declaration signature"
      }
    ],
    "dialogueOptions": [
      {
        "id": "a4_opt1",
        "textFa": "رد کردن هر دو درخواست و اعلام نادرست این که داروسازان استرالیا هرگز حق صدور گواهی استعلاجی شغلی ندارند.",
        "textEn": "Refuse both requests and falsely state that Australian pharmacists have no legal authority to issue sick leave certificates.",
        "patientReplyFa": "اما در وب‌سایت اتحادیه داروسازان (PSA) و قانون Fair Work نوشته شده داروسازان مجاز به صدور گواهی استعلاجی در حیطه صلاحیت خود هستند!",
        "patientReplyEn": "Under Fair Work Act 2009 and PSA professional practice standards, pharmacists can legally issue Absence from Work certificates within their scope!",
        "sourceMarksRecommended": false,
        "sourceMarksRedFlagResponse": false
      },
      {
        "id": "a4_opt2",
        "textFa": "انجام ارزیابی بالینی و اجرای پروتکل قانونی گواهی داروساز: ۱) بررسی بالینی علائم میگرن و اطمینان از قرار داشتن در حیطه مجاز داروسازی (Within Pharmacist Scope of Practice). ۲) صدور رسمی گواهی Absence from Work Certificate طبق قانون Fair Work Act 2009 برای مدت ۱ روز کاری همراه با شماره نظام داروسازی AHPRA و امضای معتبر (با تاکید بر ممنوعیت صدور گواهی برای گذشته/No Backdating). ۳) صدور فاکتور تفکیک‌شده رسمی (Itemised Tax Invoice) با درج ABN داروخانه، کد اقلام و شماره Provider Number جهت بازپرداخت توسط بیمه تکمیلی (Bupa/Medibank).",
        "textEn": "Execute Pharmacist Certificate & Tax Invoice Protocol: 1) Perform clinical triage of acute migraine (confirming it is strictly within pharmacist scope). 2) Issue valid statutory Absence from Work Certificate under Fair Work Act 2009 for 1 day with AHPRA registration number and signature (strictly no backdating). 3) Generate an official Itemised Pharmacy Tax Invoice featuring ABN, item codes, and Pharmacy Provider Number for Private Health Fund rebate.",
        "patientReplyFa": "فوق‌العاده عالی و حرفه‌ای! رسید رسمی تفکیک‌شده و گواهی استعلاجی با شماره AHPRA را دریافت کردم و بلافاصله برای کارفرما و بیمه تکمیلی ارسال می‌کنم.",
        "patientReplyEn": "Outstanding and professional! Thank you for the itemised tax receipt and the Fair Work Absence from Work Certificate.",
        "sourceMarksRecommended": true,
        "sourceMarksRedFlagResponse": true
      }
    ],
    "outcome": {
      "requiresReferral": false,
      "recommendationFa": "تایید صدور فاکتور تفکیک‌شده بیمه تکمیلی + صدور گواهی استعلاجی ۱ روزه میگرن طبق Fair Work Act",
      "recommendationEn": "Approved Itemised Tax Invoice & 1-Day Absence from Work Certificate within Pharmacist Scope",
      "explanationFa": "طبق قانون Fair Work Act 2009 و استانداردهای صنفی PSA در استرالیا، داروسازان ثبت‌شده مجاز به صدور گواهی استعلاجی (Absence from Work Certificate) برای بیماری‌های در حیطه صلاحیت خود (نظیر میگرن، گاستروانتریت خفیف، دیسمنوره و سرماخوردگی) حداکثر به مدت ۱ تا ۲ روز هستند. صدور گواهی برای گذشته (Backdating) غیرقانونی است.",
      "explanationEn": "Under the Australian Fair Work Act 2009 and PSA guidelines, pharmacists can issue Absence from Work Certificates for conditions within their scope (acute migraine, minor ailments) for up to 1-2 days. Backdating is strictly illegal. Official tax invoices must contain ABN and provider info."
    },
    "sourceUrl": "https://github.com/hamedharami-hub/pharmacy/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/data/scenarios/adminScenarios.ts",
    "contentReviewStatus": "unreviewed"
  }
];
