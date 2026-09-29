// HEXACO-60 (Ashton & Lee, 2009) - Bilingual Persian / English
// Each item: { id, text, text_en, factor: H|E|X|A|C|O, reverse: boolean }
// Scoring: 5-point Likert (1=Strongly Disagree, 5=Strongly Agree). Reverse: 6-x.
// Each factor has 10 items. Final score per factor = sum (range 10..50).

export type HexacoFactor = "H" | "E" | "X" | "A" | "C" | "O";

export interface HexacoItem {
  id: number;
  text: string;
  text_en?: string;
  factor: HexacoFactor;
  reverse: boolean;
}

export const HEXACO_ITEMS: HexacoItem[] = [
  // Honesty-Humility (H)
  { id: 1, text: "اگر مطمئن باشم کسی متوجه نمی‌شود، حاضرم چیز گران‌قیمتی را بدزدم.", text_en: "I would be willing to steal something expensive if I knew no one would find out.", factor: "H", reverse: true },
  { id: 2, text: "ترجیح می‌دهم پول زیادی داشته باشم تا در میان مردم خاص دیده شوم.", text_en: "I would like to have a lot of money to be seen as special among others.", factor: "H", reverse: true },
  { id: 3, text: "هیچ‌گاه از کسی چاپلوسی نمی‌کنم تا چیزی به دست آورم.", text_en: "I wouldn't use flattery to get a favor, even if it were effective.", factor: "H", reverse: false },
  { id: 4, text: "اگر فرصتی پیش بیاید، حاضرم برای پیشرفت شغلی‌ام به دیگران آسیب بزنم.", text_en: "If the chance arose, I would hurt others to get ahead in my career.", factor: "H", reverse: true },
  { id: 5, text: "احساس می‌کنم استحقاق احترام بیشتری از دیگران را دارم.", text_en: "I feel that I am entitled to more respect than the average person.", factor: "H", reverse: true },
  { id: 6, text: "حتی اگر کسی متوجه نشود، حاضر نیستم تقلب کنم.", text_en: "I wouldn't pretend to be someone else or cheat, even if undiscovered.", factor: "H", reverse: false },
  { id: 7, text: "ثروت یا شهرت برای من جذابیت چندانی ندارد.", text_en: "Wealth, status, and luxury hold little allure for me.", factor: "H", reverse: false },
  { id: 8, text: "اگر بدانم مجازاتی در کار نیست، ممکن است قانون را زیر پا بگذارم.", text_en: "I might break the law if I knew there was no punishment.", factor: "H", reverse: true },
  { id: 9, text: "هرگز سعی نمی‌کنم خودم را برتر از دیگران نشان دهم.", text_en: "I never try to make myself appear superior to others.", factor: "H", reverse: false },
  { id: 10, text: "گاهی برای رسیدن به هدفم، دیگران را فریب می‌دهم.", text_en: "I sometimes manipulate or deceive others to reach my goals.", factor: "H", reverse: true },

  // Emotionality (E)
  { id: 11, text: "وقتی در شرایط خطرناک قرار می‌گیرم، احساس ترس شدیدی می‌کنم.", text_en: "I experience intense fear when facing physically dangerous situations.", factor: "E", reverse: false },
  { id: 12, text: "نگرانی‌های روزمره به‌ندرت باعث ناراحتی من می‌شود.", text_en: "Everyday worries rarely bother or distress me.", factor: "E", reverse: true },
  { id: 13, text: "در مواجهه با درد فیزیکی، خیلی حساس هستم.", text_en: "I am very sensitive to physical pain.", factor: "E", reverse: false },
  { id: 14, text: "وقتی از عزیزانم دور می‌شوم، احساس دلتنگی شدید می‌کنم.", text_en: "I feel intense longing and sadness when away from loved ones.", factor: "E", reverse: false },
  { id: 15, text: "به‌ندرت برای کمک عاطفی به دیگران تکیه می‌کنم.", text_en: "I rarely rely on others for emotional reassurance.", factor: "E", reverse: true },
  { id: 16, text: "وقتی فیلم غم‌انگیزی می‌بینم، به‌راحتی اشک می‌ریزم.", text_en: "I easily cry when watching sad movies or emotional stories.", factor: "E", reverse: false },
  { id: 17, text: "در شرایط استرس‌زا آرامش خود را حفظ می‌کنم.", text_en: "I remain remarkably calm in highly stressful circumstances.", factor: "E", reverse: true },
  { id: 18, text: "نگرانی برای اعضای خانواده، ذهن مرا مشغول می‌کند.", text_en: "Worrying about family members' wellbeing frequently preoccupies my mind.", factor: "E", reverse: false },
  { id: 19, text: "حتی در سختی، به ندرت احساس درماندگی می‌کنم.", text_en: "Even in severe hardship, I rarely feel completely helpless.", factor: "E", reverse: true },
  { id: 20, text: "به آسانی از کوچک‌ترین مشکلات احساسی متأثر می‌شوم.", text_en: "I am easily affected by minor emotional tensions.", factor: "E", reverse: false },

  // eXtraversion (X)
  { id: 21, text: "احساس می‌کنم آدم محبوبی هستم.", text_en: "I feel that I am generally well-liked by people.", factor: "X", reverse: false },
  { id: 22, text: "در جمع‌های شلوغ، انرژی زیادی می‌گیرم.", text_en: "I gain a lot of vitality and energy in lively social gatherings.", factor: "X", reverse: false },
  { id: 23, text: "ترجیح می‌دهم بیشتر وقتم را تنها بگذرانم.", text_en: "I prefer spending most of my free time alone.", factor: "X", reverse: true },
  { id: 24, text: "در گفت‌وگوهای گروهی به ندرت پیش‌قدم می‌شوم.", text_en: "I rarely take the lead in group discussions.", factor: "X", reverse: true },
  { id: 25, text: "اعتماد به نفس بالایی در موقعیت‌های اجتماعی دارم.", text_en: "I have high self-confidence in unfamiliar social situations.", factor: "X", reverse: false },
  { id: 26, text: "بیشتر اوقات احساس شادی و سرزندگی می‌کنم.", text_en: "Most of the time I feel cheerful, optimistic, and lively.", factor: "X", reverse: false },
  { id: 27, text: "حضور در کانون توجه را دوست دارم.", text_en: "I enjoy being the center of attention.", factor: "X", reverse: false },
  { id: 28, text: "در میان غریبه‌ها احساس ناراحتی می‌کنم.", text_en: "I feel somewhat awkward or ill-at-ease around strangers.", factor: "X", reverse: true },
  { id: 29, text: "از معاشرت با تعداد زیادی از مردم لذت می‌برم.", text_en: "I genuinely enjoy mingling with large groups of people.", factor: "X", reverse: false },
  { id: 30, text: "در ابراز نظراتم در جمع، محتاطم.", text_en: "I am rather reserved about expressing my opinions openly in groups.", factor: "X", reverse: true },

  // Agreeableness (A)
  { id: 31, text: "اگر کسی به من بدی کند، به‌سرعت می‌بخشم.", text_en: "I quickly forgive people who have wronged or offended me.", factor: "A", reverse: false },
  { id: 32, text: "وقتی با دیگران اختلاف نظر دارم، تا تسلیم آنها نشوم رها نمی‌کنم.", text_en: "When in disagreements, I push relentlessly until others yield.", factor: "A", reverse: true },
  { id: 33, text: "نسبت به اشتباهات دیگران صبور هستم.", text_en: "I am patient with other people's flaws and shortcomings.", factor: "A", reverse: false },
  { id: 34, text: "به‌سرعت از دست دیگران عصبانی می‌شوم.", text_en: "I can easily lose my temper with people.", factor: "A", reverse: true },
  { id: 35, text: "حتی با کسانی که با من بد رفتار کرده‌اند، مهربان می‌مانم.", text_en: "I remain polite and kind even toward people who mistreat me.", factor: "A", reverse: false },
  { id: 36, text: "در روابط تمایل دارم انتقاد کنم.", text_en: "I tend to be quite critical and judgmental of others.", factor: "A", reverse: true },
  { id: 37, text: "معمولاً در برابر فشار دیگران انعطاف نشان می‌دهم.", text_en: "I usually show flexibility and compromise in negotiations.", factor: "A", reverse: false },
  { id: 38, text: "کینه‌توز هستم و دیر فراموش می‌کنم.", text_en: "I hold grudges and find it hard to let go of past slights.", factor: "A", reverse: true },
  { id: 39, text: "از همکاری گروهی بیشتر از رقابت لذت می‌برم.", text_en: "I enjoy cooperative teamwork far more than zero-sum competition.", factor: "A", reverse: false },
  { id: 40, text: "اگر احساس کنم به من ظلم شده، به سختی می‌بخشم.", text_en: "If I feel unfairly wronged, forgiveness comes very hard for me.", factor: "A", reverse: true },

  // Conscientiousness (C)
  { id: 41, text: "محیط کار و زندگی‌ام منظم است.", text_en: "My living and work spaces are always clean and organized.", factor: "C", reverse: false },
  { id: 42, text: "تصمیم‌هایم را پس از بررسی دقیق می‌گیرم.", text_en: "I make major decisions only after rigorous deliberation.", factor: "C", reverse: false },
  { id: 43, text: "در انجام وظایفم اهمال‌کاری می‌کنم.", text_en: "I frequently procrastinate on difficult or routine tasks.", factor: "C", reverse: true },
  { id: 44, text: "تا کاری را به بهترین شکل انجام نداده‌ام، رهایش نمی‌کنم.", text_en: "I won't let go of a project until it meets exacting high standards.", factor: "C", reverse: false },
  { id: 45, text: "قبل از شروع کار، برنامه‌ریزی دقیق می‌کنم.", text_en: "I construct thorough action plans before embarking on tasks.", factor: "C", reverse: false },
  { id: 46, text: "گاهی بدون فکر تصمیم می‌گیرم.", text_en: "I sometimes make impulsive decisions without weighing consequences.", factor: "C", reverse: true },
  { id: 47, text: "تا زمانی که هدفم محقق نشود، تلاش می‌کنم.", text_en: "I persevere with grit until my goal is fully realized.", factor: "C", reverse: false },
  { id: 48, text: "وسایلم را اغلب گم می‌کنم.", text_en: "I frequently misplace keys, notes, or everyday personal items.", factor: "C", reverse: true },
  { id: 49, text: "روی جزئیات کارها وسواس دارم.", text_en: "I pay painstaking attention to minute details and accuracy.", factor: "C", reverse: false },
  { id: 50, text: "زمانم را به‌خوبی مدیریت نمی‌کنم.", text_en: "I struggle to manage my daily time effectively.", factor: "C", reverse: true },

  // Openness to Experience (O)
  { id: 51, text: "از دیدن آثار هنری و موسیقی نو لذت می‌برم.", text_en: "I deeply appreciate fine art, diverse music, and aesthetics.", factor: "O", reverse: false },
  { id: 52, text: "به موضوعات فلسفی و انتزاعی علاقه‌مندم.", text_en: "I am fascinated by philosophical, abstract, and existential queries.", factor: "O", reverse: false },
  { id: 53, text: "ترجیح می‌دهم مسیرهای آشنا را تجربه کنم تا تجربه‌های جدید.", text_en: "I prefer familiar, well-trodden routines over novelty and surprise.", factor: "O", reverse: true },
  { id: 54, text: "دوست دارم درباره ایده‌های نامتعارف بیشتر بدانم.", text_en: "I enjoy researching unconventional, innovative ideas and theories.", factor: "O", reverse: false },
  { id: 55, text: "از سفر به مکان‌های ناآشنا لذت می‌برم.", text_en: "I love traveling to unfamiliar cultures and unexplored regions.", factor: "O", reverse: false },
  { id: 56, text: "گاهی به موضوعاتی فکر می‌کنم که در زندگی روزمره کاربرد ندارند.", text_en: "I often ponder questions that have little direct practical utility.", factor: "O", reverse: false },
  { id: 57, text: "شعر و ادبیات برایم جذابیتی ندارد.", text_en: "Poetry, literature, and metaphorical art hold little interest for me.", factor: "O", reverse: true },
  { id: 58, text: "از کشف فرهنگ‌های متفاوت لذت می‌برم.", text_en: "I find great joy in discovering cultural traditions different from my own.", factor: "O", reverse: false },
  { id: 59, text: "خلاقیت یکی از مشخصه‌های اصلی من است.", text_en: "Originality and creative expression are central hallmarks of who I am.", factor: "O", reverse: false },
  { id: 60, text: "تغییرات بزرگ در زندگی، مرا مضطرب می‌کند.", text_en: "Sweeping shifts and radical changes in life make me uneasy.", factor: "O", reverse: true },
];

export interface HexacoScores {
  H: number;
  E: number;
  X: number;
  A: number;
  C: number;
  O: number;
}

export function scoreHexaco(responses: Record<number, number>): HexacoScores {
  const totals: HexacoScores = { H: 0, E: 0, X: 0, A: 0, C: 0, O: 0 };
  for (const item of HEXACO_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw !== "number") continue;
    const v = item.reverse ? 6 - raw : raw;
    totals[item.factor] += v;
  }
  return totals;
}

export type FactorLevel = "low" | "moderate" | "high";

export function getFactorLevel(score: number): FactorLevel {
  if (score >= 38) return "high";
  if (score <= 23) return "low";
  return "moderate";
}

export interface FactorInterpretation {
  factor: HexacoFactor;
  score: number;
  level: FactorLevel;
  titleFa: string;
  titleEn: string;
  summaryFa: string;
  summaryEn: string;
  strengthFa: string;
  strengthEn: string;
  growthTipFa: string;
  growthTipEn: string;
}

export interface HexacoAnalysis {
  archetype: {
    titleFa: string;
    titleEn: string;
    descFa: string;
    descEn: string;
  };
  patterns: string[];
  ai_tone: "data_driven" | "gentle_analytical" | "exploratory" | "neutral";
  attention_points: string[];
  factorDetails: Record<HexacoFactor, FactorInterpretation>;
  successRoadmap: {
    workStyleFa: string;
    workStyleEn: string;
    relationshipsFa: string;
    relationshipsEn: string;
    stressManagementFa: string;
    stressManagementEn: string;
  };
}

export function analyzeHexaco(s: HexacoScores): HexacoAnalysis {
  const patterns: string[] = [];
  const attention: string[] = [];

  // Determine factor interpretations
  const factorDetails: Record<HexacoFactor, FactorInterpretation> = {
    H: {
      factor: "H",
      score: s.H,
      level: getFactorLevel(s.H),
      titleFa: "صداقت و تواضع",
      titleEn: "Honesty-Humility",
      summaryFa: s.H >= 38 ? "صداقت بالا، عدم تمایل به بهره‌کشی از دیگران و بی‌نیازی از تظاهر به برتری." : s.H <= 23 ? "عمل‌گرایی منفعت‌محور، تمایل به استفاده از فرصت‌ها و اهمیت به موقعیت اجتماعی." : "تعادل منطقی میان صداقت اخلاقی و حفظ منافع شخصی معقول.",
      summaryEn: s.H >= 38 ? "High sincerity, low desire for status posturing or manipulative leverage." : s.H <= 23 ? "Strategic self-interest, opportunistic mindset, and high regard for status." : "Pragmatic balance between ethical standards and legitimate self-interest.",
      strengthFa: s.H >= 38 ? "جلب اعتماد عمیق همکاران و شرکا، پایداری اخلاقی" : "مهارت در مذاکره و پیشبرد موقعیت فردی",
      strengthEn: s.H >= 38 ? "Deep trustworthiness and unwavering integrity" : "Astute negotiation and assertive self-advocacy",
      growthTipFa: s.H >= 38 ? "مراقب باش تواضع زیاد مانع دیده شدن دستاوردهای واقعی‌ات نشود." : "مراقب باش زیر پا گذاشتن اعتماد دیگران در بلندمدت سرمایه اجتماعی‌ات را تخریب نکند.",
      growthTipEn: s.H >= 38 ? "Ensure your humility does not prevent your legitimate accomplishments from being recognized." : "Safeguard against compromising social capital and long-term reputation.",
    },
    E: {
      factor: "E",
      score: s.E,
      level: getFactorLevel(s.E),
      titleFa: "هیجان‌پذیری و حساسیت عاطفی",
      titleEn: "Emotionality",
      summaryFa: s.E >= 38 ? "حساسیت بالا به استرس و همدلی عمیق با دیگران، نیاز به امنیت عاطفی." : s.E <= 23 ? "تاب‌آوری بالا در برابر استرس، خونسردی در بحران و استقلال عاطفی بالا." : "سطح نرمال اضطراب و مدیریت متعادل فشارهای هیجانی روزمره.",
      summaryEn: s.E >= 38 ? "High empathy, heightened stress reactivity, and strong emotional attachment." : s.E <= 23 ? "High composure under pressure, low fearfulness, and emotional detachment." : "Balanced emotional responsiveness and moderate stress tolerance.",
      strengthFa: s.E >= 38 ? "هوش هیجانی و حس‌کردن زودهنگام نیازهای اطرافیان" : "آرامش پولادین و تصمیم‌گیری خونسرد در بحران‌ها",
      strengthEn: s.E >= 38 ? "Deep emotional intuition and warmth" : "Stoic calm and unshakeable poise during crises",
      growthTipFa: s.E >= 38 ? "از ابزارهای تنفس آگاهانه و بازنگری افکار CBT برای تخلیه بار استرس استفاده کن." : "خونسردی ظاهری به معنای عدم نیاز به خواب و استراحت نیست؛ نشانه‌های خستگی را نادیده نگیر.",
      growthTipEn: s.E >= 38 ? "Use mindful breathwork and CBT thought logging to decompress emotional tension." : "Being calm doesn't mean your nervous system doesn't need sleep and restoration.",
    },
    X: {
      factor: "X",
      score: s.X,
      level: getFactorLevel(s.X),
      titleFa: "برون‌گرایی و سرزندگی",
      titleEn: "Extraversion",
      summaryFa: s.X >= 38 ? "انرژی بالا در تعاملات اجتماعی، رهبری طبیعی جمع و اعتماد به نفس بالا." : s.X <= 23 ? "درون‌گرایی، تمایل به تنهایی و تمرکز در سکوت، مصرف سریع‌تر باتری اجتماعی." : "تعادل میان معاشرت و خلوت فردی، انعطاف‌پذیری در جمع و تنهایی.",
      summaryEn: s.X >= 38 ? "High social vitality, expressive energy, and natural social confidence." : s.X <= 23 ? "Introspective depth, preference for solitude, and deep focus in quiet spaces." : "Balanced ambivert rhythm between social engagements and restorative solitude.",
      strengthFa: s.X >= 38 ? "شبکه‌سازی پرانرژی و الهام‌بخشی به دیگران" : "تمرکز عمیق پایدار در کارهای انفرادی بدون نیاز به محرک‌های بیرونی",
      strengthEn: s.X >= 38 ? "Dynamic networking and infectious enthusiasm" : "Prolonged uninterrupted solitary focus and self-reliance",
      growthTipFa: s.X >= 38 ? "برای تفکر عمیق و برنامه‌ریزی استراتژیک، زمان‌های سکوت قطعی در تقویم رزرو کن." : "در جلسات و مذاکرات مهم، نظراتت را صریح‌تر بیان کن تا توانمندی‌هایت کشف شوند.",
      growthTipEn: s.X >= 38 ? "Block non-negotiable quiet time for deep reflection and long-range planning." : "Speak up proactively in high-stakes discussions to let your expertise shine.",
    },
    A: {
      factor: "A",
      score: s.A,
      level: getFactorLevel(s.A),
      titleFa: "توافق‌پذیری و مدارا",
      titleEn: "Agreeableness",
      summaryFa: s.A >= 38 ? "بخشندگی بالا، صبر در برابر اشتباهات دیگران، پرهیز از درگیری و روحیه همکاری." : s.A <= 23 ? "سخت‌گیری، انعطاف‌ناپذیری در برابر بی‌کفایتی، روحیه انتقادی بالا و پایداری در نزاع." : "تعادل میان انعطاف و قاطعیت؛ سازگاری همراه با دفاع از خطوط قرمز.",
      summaryEn: s.A >= 38 ? "High tolerance, swift forgiveness, cooperative nature, and reluctance to fight." : s.A <= 23 ? "Demanding standards, confrontational resilience, and rigorous skepticism." : "Constructive balance between empathy and asserting healthy boundaries.",
      strengthFa: s.A >= 38 ? "تیم‌سازی صمیمانه، حل بدون خشونت اختلافات" : "قاطعیت در اجرای استانداردها و نپذیرفتن خروجی‌های بی‌کیفیت",
      strengthEn: s.A >= 38 ? "Harmonious team stewardship and restorative conflict resolution" : "Rigorous quality enforcement and unyielding assertiveness",
      growthTipFa: s.A >= 38 ? "نه گفتن را تمرین کن؛ مهربانی نباید به قربانی کردن زمان و سلامت خودت منجر شود." : "صبر و درک زاویه دید دیگران را تقویت کن تا همکاری‌های تیمی دچار اصطکاک نشوند.",
      growthTipEn: s.A >= 38 ? "Practice setting boundaries; kindness shouldn't compromise your own sanity and calendar." : "Cultivate empathy to prevent interpersonal friction from hindering teamwork.",
    },
    C: {
      factor: "C",
      score: s.C,
      level: getFactorLevel(s.C),
      titleFa: "وظیفه‌شناسی و انضباط",
      titleEn: "Conscientiousness",
      summaryFa: s.C >= 38 ? "نظم مثال‌زدنی، دقت در جزئیات، مدیریت زمان دقیق و تعهد بالا به ددلاین‌ها." : s.C <= 23 ? "خودانگیختگی، رهایی از قیدوبندهای سفت و سخت، گرایش به اهمال‌کاری در صورت نبود ساختار بیرونی." : "انجام منظم وظایف با حفظ انعطاف‌پذیری و پرهیز از کمال‌گرایی وسواس‌گونه.",
      summaryEn: s.C >= 38 ? "Exacting organization, laser-focus on deadlines, high grit, and meticulous execution." : s.C <= 23 ? "Spontaneous fluidity, aversion to rigid checklists, and vulnerability to drift." : "Reliable delivery balanced with pragmatic flexibility.",
      strengthFa: s.C >= 38 ? "قابلیت اتکای صددرصد، تبدیل برنامه‌ها به خروجی‌های ملموس" : "انعطاف در شرایط غیرمنتظره و سازگاری سریع با تغییرات",
      strengthEn: s.C >= 38 ? "Unrivaled dependability and consistent execution follow-through" : "Agile adaptability in volatile, shifting circumstances",
      growthTipFa: s.C >= 38 ? "مراقب فرسودگی و تعهد بیش از حد (Overcommitment) باش؛ استراحت هم یک تسک حیاتی است." : "از ابزارهای دیداری ارشناز (یادآورها، تایم‌باکت و چک‌لیست‌های کوتاه) برای محافظت از زمانت استفاده کن.",
      growthTipEn: s.C >= 38 ? "Guard against perfectionist burnout; restorative downtime is an essential KPI." : "Leverage ARSHNAZ widgets, time buckets, and short checklists to create structure.",
    },
    O: {
      factor: "O",
      score: s.O,
      level: getFactorLevel(s.O),
      titleFa: "گشودگی به تجربه و خلاقیت",
      titleEn: "Openness to Experience",
      summaryFa: s.O >= 38 ? "کنجکاوی ذهنی شدید، علاقه به هنر، فلسفه و راه‌حل‌های غیرمتعارف، تفکر نوآورانه." : s.O <= 23 ? "تمرکز بر راه‌حل‌های آزموده‌شده، عمل‌گرایی سنتی، پرهیز از مباحث انتزاعی و پیچیده‌سازی." : "تعادل میان استقبال از ایده‌های جدید و تکیه بر روش‌های کاربردی اثبات‌شده.",
      summaryEn: s.O >= 38 ? "Voracious intellectual curiosity, deep aesthetic sensibility, and out-of-the-box thinking." : s.O <= 23 ? "Grounded pragmatism, preference for proven methods, and skepticism toward abstract theory." : "Healthy balance between embracing innovation and valuing proven playbooks.",
      strengthFa: s.O >= 38 ? "کشف فرصت‌های نوین، تفکر افقی و خلق محصولات پیشرو" : "اجرای بدون حاشیه و تمرکز بر روش‌های امتحان‌پَس‌داده",
      strengthEn: s.O >= 38 ? "Lateral ideation, breakthrough creativity, and cross-domain synthesis" : "Reliable execution of battle-tested systems without distraction",
      growthTipFa: s.O >= 38 ? "مراقب سندروم «شئی براق بعدی» باش؛ ایده‌ها را تا مرحله نهایی اجرا و تحویل ببر." : "گاهی مسیرهای جدید را امتحان کن تا فرصت‌های نوآورانه را از دست ندهی.",
      growthTipEn: s.O >= 38 ? "Beware of Shiny Object Syndrome; finish current initiatives before starting new ones." : "Periodically experiment with novel approaches to prevent stagnation.",
    },
  };

  // Determine Archetype
  let archetype = {
    titleFa: "عمل‌گرای انطباق‌پذیر (Adaptive Pragmatist)",
    titleEn: "Adaptive Pragmatist",
    descFa: "شخصیتی متعادل با انعطاف‌پذیری بالا در انطباق با موقعیت‌های کاری و اجتماعی گوناگون.",
    descEn: "A balanced profile demonstrating high behavioral agility across diverse environments.",
  };

  if (s.C >= 38 && s.O >= 38) {
    archetype = {
      titleFa: "نوآور سیستماتیک (Systematic Innovator)",
      titleEn: "Systematic Innovator",
      descFa: "ترکیب نادر خلاقیت ایده‌پرداز با انضباط بالای مهندسی؛ ایده‌های بزرگ را به واقعیت اجرایی تبدیل می‌کنید.",
      descEn: "Rare blend of visionary creativity and operational discipline; turns bold ideas into structured reality.",
    };
    patterns.push("Systematic Innovator");
  } else if (s.C >= 38 && s.E <= 25) {
    archetype = {
      titleFa: "تحلیل‌گر عمل‌گرا (High-Functioning Analytical)",
      titleEn: "High-Functioning Analytical",
      descFa: "خونسردی پولادین در برابر فشار همراه با دقت اجرایی بالا؛ ستون اتکای هر تیم در روزهای بحرانی.",
      descEn: "Unshakeable composure under fire coupled with relentless execution; a bedrock of reliability.",
    };
    patterns.push("High-Functioning Analytical");
    attention.push("هیجان‌پذیری پایین به معنای نبود خستگی نیست؛ سیستم نشانه‌های زودهنگام افت خواب و انرژی را برایت پایش می‌کند.");
  } else if (s.X >= 38 && s.A >= 38) {
    archetype = {
      titleFa: "رهبر همدل و پیونددهنده (Empathic Connector)",
      titleEn: "Empathic Connector",
      descFa: "کاریزمای اجتماعی همراه با صمیمیت و همدلی؛ محیط‌های پیرامون خود را گرم و پرانگیزه نگه می‌دارید.",
      descEn: "Social magnetism coupled with genuine warmth; naturally builds trust and energizes communities.",
    };
    patterns.push("Empathic Connector");
  } else if (s.H >= 38 && s.A >= 38) {
    archetype = {
      titleFa: "حامی اخلاق‌مدار (Ethical Guardian)",
      titleEn: "Ethical Guardian",
      descFa: "پایبندی عمیق به عدالت، تواضع و صداقت؛ قطب‌نمای اخلاقی و معتمدترین مشاور در هر ارتباط و پروژه‌ای.",
      descEn: "Deep dedication to fairness, humility, and authentic stewardship; a trusted moral anchor.",
    };
    patterns.push("Ethical Guardian");
  } else if (s.O >= 38 && s.C <= 25) {
    archetype = {
      titleFa: "کاوشگر آزاداندیش (Free-form Explorer)",
      titleEn: "Free-form Explorer",
      descFa: "خلاقیت رها از چارچوب‌های سفت و سخت؛ نیاز به سیستم‌های دیداری نرم برای جلوگیری از اتلاف انرژی.",
      descEn: "Unbounded creativity that resists rigid checklists; thrives with fluid visual guardrails.",
    };
    patterns.push("Free-form Explorer");
  } else if (s.E >= 35 && s.A >= 35) {
    archetype = {
      titleFa: "پاسخ‌دهنده همدل و حساس (Empathic Responder)",
      titleEn: "Empathic Responder",
      descFa: "حسگرهای احساسی بسیار دقیق؛ درک عمیق دیگران اما نیازمند محافظت از مرزهای انرژی فردی.",
      descEn: "Highly attuned emotional antenna; deeply compassionate but requires careful energetic boundaries.",
    };
    patterns.push("Empathic Responder");
    attention.push("جذب سریع احساسات محیط؛ در دوره‌های پرفشار، زمان‌های خلوت و بازیابی ذهنی را حتماً در برنامه‌ات قفل کن.");
  } else if (s.H <= 25 && s.X >= 35) {
    archetype = {
      titleFa: "استراتژیست اجتماعی (Strategic Influencer)",
      titleEn: "Strategic Influencer",
      descFa: "عمل‌گرایی بالا در دستیابی به اهداف و نفوذ اجتماعی؛ توانمند در مذاکره و پیشبرد موقعیت حرفه‌ای.",
      descEn: "Pragmatic ambition coupled with sharp social acuity; formidable in negotiations and market positioning.",
    };
    patterns.push("Strategic Influencer");
  }

  // Attention Points
  if (s.C >= 40) {
    attention.push("وظیفه‌شناسی بسیار بالا → ریسک فرسودگی ناشی از تعهد بیش از حد (Overcommitment). استراحت را به عنوان یک وظیفه در برنامه بگذار.");
  }
  if (s.O >= 40) {
    attention.push("گشودگی بالا → تنوع در روش‌ها برایت سوخت است؛ سیستم برای تو متدهای پویا و متنوع ارائه می‌دهد.");
  }
  if (s.E >= 38) {
    attention.push("حساسیت عاطفی بالا → به امنیت روانی در محیط کار اهمیت بده و از ابزارهای پایش استرس ارشناز استفاده کن.");
  }
  if (s.X <= 22) {
    attention.push("درون‌گرایی عمیق → برای بازدهی حداکثری، بلوک‌های کاری انفرادی و عمیق (Deep Work) را صبح‌ها بچین.");
  }
  if (attention.length === 0) {
    attention.push("پروفایل شخصیتی شما از تعادل متناسبی در ابعاد مختلف برخوردار است و انعطاف‌پذیری رفتاری بالایی را در مواجهه با چالش‌ها به همراه دارد.");
  }

  // Calibrate AI tone
  let ai_tone: HexacoAnalysis["ai_tone"] = "neutral";
  if (s.E <= 25 && s.C >= 38) ai_tone = "data_driven";
  else if (s.E >= 35) ai_tone = "gentle_analytical";
  else if (s.O >= 38) ai_tone = "exploratory";

  // Success Roadmap
  const successRoadmap = {
    workStyleFa: s.C >= 35 ? "مدیریت مبتنی بر اهداف واضح، بلوک‌های کاری متمرکز پومودورو و ردیابی پیشرفت فصلی." : "سیستم‌های دیداری کم‌فشار مانند تابلوهای کانبان رنگی و کپسول‌های ۵ دقیقه‌ای ضد اهمال‌کاری.",
    workStyleEn: s.C >= 35 ? "Milestone-driven workflows, focused Pomodoro sprints, and structured quarterly horizons." : "Low-friction visual boards, agile Kanban columns, and 5-minute anti-procrastination capsules.",
    relationshipsFa: s.A >= 35 ? "ارتباطات شفاف و مشارکتی با رعایت مرزهای سالم برای پیشگیری از سوءاستفاده از حسن‌نیت." : "تمرین گوش دادن فعال و صبوری در برابر تفاوت دیدگاه‌های تیمی.",
    relationshipsEn: s.A >= 35 ? "Cooperative collaboration protected by healthy boundaries to avoid people-pleasing." : "Active listening practices and deliberate patience with diverse team working styles.",
    stressManagementFa: s.E >= 35 ? "ثبت روزانه افکار در ابزار CBT، تنفس ۴-۷-۸ و ورزش سبک پیش از شروع روز." : "پایش دوره‌ای کیفیت خواب و روتین‌های ریکاوری حتی در زمانی که احساس فشار روانی نمی‌کنید.",
    stressManagementEn: s.E >= 35 ? "Daily CBT journaling, 4-7-8 grounding breathwork, and early morning movement." : "Routine sleep tracking and proactive recovery habits even when cognitive stress feels low.",
  };

  return {
    archetype,
    patterns,
    ai_tone,
    attention_points: attention,
    factorDetails,
    successRoadmap,
  };
}

export const HEXACO_LABELS: Record<HexacoFactor, string> = {
  H: "صداقت-تواضع",
  E: "هیجان‌پذیری",
  X: "برون‌گرایی",
  A: "توافق‌پذیری",
  C: "وظیفه‌شناسی",
  O: "گشودگی به تجربه",
};

export const HEXACO_LABELS_EN: Record<HexacoFactor, string> = {
  H: "Honesty-Humility",
  E: "Emotionality",
  X: "Extraversion",
  A: "Agreeableness",
  C: "Conscientiousness",
  O: "Openness to Experience",
};
