// VIA-72 Character Strengths (Peterson & Seligman, 2004) - Bilingual
// 3 items per strength, 24 strengths, 5-point Likert (1=Very Much Unlike Me, 5=Very Much Like Me).
// Scoring: sum per strength (3..15), then ranked 1..24. Top 5 are signature strengths.

export type ViaStrength =
  | "creativity" | "curiosity" | "judgment" | "love_of_learning" | "perspective"
  | "bravery" | "perseverance" | "honesty" | "zest"
  | "love" | "kindness" | "social_intelligence"
  | "teamwork" | "fairness" | "leadership"
  | "forgiveness" | "humility" | "prudence" | "self_regulation"
  | "appreciation_of_beauty" | "gratitude" | "hope" | "humor" | "spirituality";

export interface ViaItem {
  id: number;
  text: string;
  text_en?: string;
  strength: ViaStrength;
}

const STRENGTH_TEMPLATES: Record<ViaStrength, [ { fa: string; en: string }, { fa: string; en: string }, { fa: string; en: string } ]> = {
  creativity: [
    { fa: "اغلب راه‌حل‌های نوآورانه برای مشکلات پیدا می‌کنم.", en: "I frequently come up with novel, inventive solutions to complex problems." },
    { fa: "از فکر کردن به ایده‌های غیرمعمول لذت می‌برم.", en: "I genuinely enjoy brainstorming unconventional and original ideas." },
    { fa: "دوست دارم چیزهای جدید و بدیع بسازم.", en: "I love designing, creating, or building brand new things." },
  ],
  curiosity: [
    { fa: "همیشه دنبال یاد گرفتن چیزهای جدید هستم.", en: "I am constantly seeking to explore and learn new topics." },
    { fa: "موضوعات گوناگون برایم جذاب و انگیزاننده‌اند.", en: "A wide variety of subjects and mysteries fascinate me." },
    { fa: "از کاوش در مسائل ناآشنا انرژی مضاعف می‌گیرم.", en: "Exploring unfamiliar territories fills me with energy." },
  ],
  judgment: [
    { fa: "قبل از تصمیم‌گیری، همه جوانب را بی‌طرفانه می‌سنجم.", en: "I rigorously weigh all sides and evidence before making a decision." },
    { fa: "به ادعاها بدون مدرک و استدلال اعتماد نمی‌کنم.", en: "I don't accept claims blindly without sound reasoning or proof." },
    { fa: "تمایل دارم پیش‌فرض‌هایم را زیر سؤال ببرم.", en: "I am willing to challenge and revise my own assumptions." },
  ],
  love_of_learning: [
    { fa: "از مطالعه عمیق درباره موضوعات مورد علاقه‌ام لذت می‌برم.", en: "I take profound joy in studying deeply about subjects I love." },
    { fa: "حتی بدون پاداش بیرونی، یادگیری برایم ارزشمند و لذت‌بخش است.", en: "Learning is intrinsically rewarding for me, regardless of external rewards." },
    { fa: "همیشه در حال افزودن دانش و مهارت جدید به خود هستم.", en: "I am perpetually upgrading my personal toolkit with new skills." },
  ],
  perspective: [
    { fa: "دیگران معمولاً برای راهنمایی و تصمیم‌گیری از من مشورت می‌گیرند.", en: "People frequently seek my counsel when facing complicated dilemmas." },
    { fa: "می‌توانم تصویر بزرگ‌تر و کلان را به‌خوبی ببینم.", en: "I excel at stepping back to see the overarching big picture." },
    { fa: "در شرایط پیچیده، دیدگاهی خردمندانه و متعادل ارائه می‌دهم.", en: "In heated or tangled situations, I offer balanced, wise perspectives." },
  ],
  bravery: [
    { fa: "حتی اگر بترسم، کاری که درست و اخلاقی است را انجام می‌دهم.", en: "I do what is right and courageous even when feeling afraid." },
    { fa: "از دفاع از باورهایم در برابر مخالفت‌ها ابایی ندارم.", en: "I am not afraid to stand up for my convictions against pushback." },
    { fa: "در شرایط چالش‌برانگیز، با اراده اقدام می‌کنم.", en: "I take bold action when confronting adversity." },
  ],
  perseverance: [
    { fa: "تا کاری را تمام نکرده‌ام، رهایش نمی‌کنم.", en: "I stick with a task until it is thoroughly completed." },
    { fa: "موانع و سختی‌ها انگیزه‌ام را از بین نمی‌برند.", en: "Obstacles do not dampen my drive; they fuel my persistence." },
    { fa: "در پروژه‌های طولانی و زمان‌بر پایداری بالایی دارم.", en: "I maintain steady focus and grit on long-haul marathons." },
  ],
  honesty: [
    { fa: "همیشه حقیقت را می‌گویم حتی وقتی به ضررم باشد.", en: "I tell the truth with integrity even when it comes at a personal cost." },
    { fa: "وفادار به اصول اخلاقی و صداقت درونم هستم.", en: "I remain faithful to my ethical core and authenticity." },
    { fa: "خودم را همان‌طور که هستم، بی‌نقاب نشان می‌دهم.", en: "I present myself genuinely without masks or false pretenses." },
  ],
  zest: [
    { fa: "با انرژی، نشاط و اشتیاق به کارهایم می‌پردازم.", en: "I approach everyday life with enthusiasm, energy, and excitement." },
    { fa: "صبح‌ها با انگیزه و طراوت از خواب بیدار می‌شوم.", en: "I wake up feeling eager and excited about the day ahead." },
    { fa: "زندگی را یک ماجراجویی پرشور می‌بینم.", en: "I view life as a vibrant adventure full of vitality." },
  ],
  love: [
    { fa: "روابط عمیق و صمیمانه‌ای با عزیزانم دارم.", en: "I cherish deep, intimate, reciprocal bonds with people I love." },
    { fa: "ابراز محبت و پذیرش دیگران برایم طبیعی و آسان است.", en: "Expressing genuine affection and warmth comes naturally to me." },
    { fa: "ارزش بسیار بالایی برای پیوند قلبی قائلم.", en: "I place enormous value on emotional closeness and care." },
  ],
  kindness: [
    { fa: "از کمک کردن و تسهیل کار دیگران لذت می‌برم.", en: "I take real pleasure in helping and supporting others." },
    { fa: "حتی به غریبه‌ها در صورت نیاز مهربانی می‌کنم.", en: "I show warmth and generosity even toward complete strangers." },
    { fa: "بدون انتظار جبران، خوبی و فداکاری می‌کنم.", en: "I do good deeds without expecting reciprocity or praise." },
  ],
  social_intelligence: [
    { fa: "احساسات و انگیزه‌های پنهان دیگران را به‌خوبی درک می‌کنم.", en: "I readily sense how others feel and understand social subtexts." },
    { fa: "می‌دانم در موقعیت‌های مختلف اجتماعی چگونه رفتار کنم.", en: "I know how to fit in and communicate comfortably in diverse settings." },
    { fa: "چه عواملی باعث واکنش افراد می‌شود را سریع درمی‌یابم.", en: "I quickly figure out what makes people tick and what motivates them." },
  ],
  teamwork: [
    { fa: "در کارهای گروهی بهترین نسخه خودم را ارائه می‌دهم.", en: "I do my best work when collaborating as an active team player." },
    { fa: "به موفقیت جمعی تیم بیش از درخشش فردی اهمیت می‌دهم.", en: "I value collective team victory over solitary spotlight." },
    { fa: "همیشه به تعهداتم در قبال اعضای گروه وفادارم.", en: "I pull my weight reliably and stand loyal to my teammates." },
  ],
  fairness: [
    { fa: "به همه افراد فرصت و احترامی برابر می‌دهم.", en: "I treat all people with equal respect, fairness, and justice." },
    { fa: "تعصبات شخصی‌ام را در قضاوت درباره دیگران مهار می‌کنم.", en: "I actively check my personal biases to remain objective." },
    { fa: "دیدن بی‌عدالتی و تبعیض مرا عمیقاً آزار می‌دهد.", en: "Witnessing injustice or favoritism genuinely upsets me." },
  ],
  leadership: [
    { fa: "می‌توانم گروهی را به سمت هدفی معنادار هدایت کنم.", en: "I can effectively organize and guide a group toward meaningful goals." },
    { fa: "دیگران به‌طور طبیعی برای راهبری و هماهنگی به من نگاه می‌کنند.", en: "People naturally look to me for coordination and direction." },
    { fa: "در ایجاد انگیزه و همدلی میان اعضای تیم توانمندم.", en: "I excel at fostering morale and unity among collaborators." },
  ],
  forgiveness: [
    { fa: "کینه به دل نمی‌گیرم و کینه‌توزی را بی‌ثمر می‌دانم.", en: "I let go of grudges and believe resentment only poisons the holder." },
    { fa: "به دیگران فرصت دوباره برای اصلاح اشتباه می‌دهم.", en: "I believe in giving people second chances to make amends." },
    { fa: "بخشش را آسان‌تر و آرامش‌بخش‌تر از انتقام می‌یابم.", en: "I find forgiving far healthier and more liberating than revenge." },
  ],
  humility: [
    { fa: "از به رخ کشیدن دستاوردها یا موقعیتم پرهیز می‌کنم.", en: "I let my achievements speak for themselves without boasting." },
    { fa: "خودم را بالاتر یا برتر از دیگر انسان‌ها نمی‌بینم.", en: "I do not regard myself as intrinsically superior to anyone." },
    { fa: "اعتبار موفقیت‌ها را منصفانه با دیگران تقسیم می‌کنم.", en: "I gladly share the credit for victories with those who helped." },
  ],
  prudence: [
    { fa: "از پذیرش ریسک‌های بی‌پروا و نسنجیده پرهیز می‌کنم.", en: "I avoid reckless, shortsighted risks and exercise wise caution." },
    { fa: "قبل از اقدام، عواقب و پیامدهای احتمالی را بررسی می‌کنم.", en: "I carefully anticipate consequences before committing to action." },
    { fa: "در گفتار و انتخاب‌های مهم زندگی دوراندیشم.", en: "I am prudent, disciplined, and measured in word and deed." },
  ],
  self_regulation: [
    { fa: "احساسات، تکانه‌ها و رفتارم را به‌خوبی مدیریت می‌کنم.", en: "I practice strong emotional control and manage impulses effectively." },
    { fa: "در برابر وسوسه‌های آنی مقاومت می‌کنم.", en: "I easily resist short-term temptations for long-term values." },
    { fa: "نظم فردی‌ام را حتی در شرایط سخت حفظ می‌کنم.", en: "I sustain personal discipline even amid chaos or fatigue." },
  ],
  appreciation_of_beauty: [
    { fa: "از شگفتی‌های طبیعت، هنر و معماری عمیقاً لذت می‌برم.", en: "I am deeply moved by the sublime beauty of nature, art, and craft." },
    { fa: "لحظات کوچک زیبا در زندگی روزمره را با تمام وجود حس می‌کنم.", en: "I notice and savor subtle moments of wonder in daily life." },
    { fa: "مهارت و تعالی انسان‌ها در هر زمینه‌ای مرا به وجد می‌آورد.", en: "Mastery and excellence in any human endeavor inspires me." },
  ],
  gratitude: [
    { fa: "بابت موهبت‌های کوچک و بزرگ زندگی همواره سپاسگزارم.", en: "I actively appreciate both the simple blessings and major gifts of life." },
    { fa: "هر روز چیزهایی برای قدردانی و شکرگزاری پیدا می‌کنم.", en: "Every day I identify moments and people I am truly grateful for." },
    { fa: "ابراز تشکر و قدردانی از دیگران برایم بسیار راحت است.", en: "Expressing heartfelt gratitude to others comes easily to me." },
  ],
  hope: [
    { fa: "آینده را روشن، امیدوارکننده و دست‌یافتنی می‌بینم.", en: "I look forward to the future with robust optimism and hope." },
    { fa: "حتی در تاریک‌ترین روزها، باور دارم راهی رو به جلو هست.", en: "Even in adversity, I firmly believe there is always a way forward." },
    { fa: "باور دارم که تلاش و پشتکارم نتیجه‌بخش خواهد بود.", en: "I trust that sustained, honest effort will yield positive outcomes." },
  ],
  humor: [
    { fa: "از خندیدن و نشاط بخشیدن به دیگران لذت می‌برم.", en: "I bring joy, laughter, and lightheartedness to those around me." },
    { fa: "در موقعیت‌های دشوار و پرتنش، جنبه طنزآمیز را پیدا می‌کنم.", en: "I use tasteful humor to defuse tension and illuminate perspective." },
    { fa: "شوخ‌طبعی و خوش‌رویی بخش جدایی‌ناپذیر طبیعتم است.", en: "A playful, cheerful sense of humor is central to my nature." },
  ],
  spirituality: [
    { fa: "به معنا و مقصدی فراتر از مادیات در هستی باور دارم.", en: "I believe in a transcendent purpose and profound meaning to existence." },
    { fa: "احساس پیوستگی و اتصال با کلی بزرگ‌تر از خودم دارم.", en: "I feel an intimate connection to something larger than myself." },
    { fa: "زندگی روزمره‌ام را بر پایه اصولی عمیق و معنابخش می‌سازم.", en: "My choices are anchored in spiritual grounding and moral depth." },
  ],
};

export const VIA_LABELS: Record<ViaStrength, string> = {
  creativity: "خلاقیت و نوآوری",
  curiosity: "کنجکاوی و کاوشگری",
  judgment: "تفکر انتقادی و داوری",
  love_of_learning: "عشق به یادگیری",
  perspective: "خرد و دیدگاه کلان",
  bravery: "شجاعت و دلیری",
  perseverance: "پشتکار و سرسختی",
  honesty: "صداقت و اصالت",
  zest: "شور زیستی و سرزندگی",
  love: "عشق و صمیمیت",
  kindness: "مهربانی و سخاوت",
  social_intelligence: "هوش اجتماعی و عاطفی",
  teamwork: "کار تیمی و شهروندی",
  fairness: "انصاف و عدالت‌ورزی",
  leadership: "رهبری و سازماندهی",
  forgiveness: "بخشش و گذشت",
  humility: "تواضع و فروتنی",
  prudence: "احتیاط و دوراندیشی",
  self_regulation: "خودتنظیمی و مهار نفس",
  appreciation_of_beauty: "قدردانی از زیبایی و تعالی",
  gratitude: "شکرگزاری و سپاس",
  hope: "امید و خوش‌بینی",
  humor: "طنز و شوخ‌طبعی",
  spirituality: "معنویت و هدفمندی",
};

export const VIA_LABELS_EN: Record<ViaStrength, string> = {
  creativity: "Creativity & Innovation",
  curiosity: "Curiosity & Exploration",
  judgment: "Critical Thinking & Judgment",
  love_of_learning: "Love of Learning",
  perspective: "Wisdom & Perspective",
  bravery: "Bravery & Courage",
  perseverance: "Perseverance & Grit",
  honesty: "Honesty & Authenticity",
  zest: "Zest & Vitality",
  love: "Love & Deep Attachment",
  kindness: "Kindness & Generosity",
  social_intelligence: "Social & Emotional Intelligence",
  teamwork: "Teamwork & Citizenship",
  fairness: "Fairness & Equity",
  leadership: "Leadership & Stewardship",
  forgiveness: "Forgiveness & Mercy",
  humility: "Humility & Modesty",
  prudence: "Prudence & Foresight",
  self_regulation: "Self-Regulation & Discipline",
  appreciation_of_beauty: "Appreciation of Beauty",
  gratitude: "Gratitude & Thanksgiving",
  hope: "Hope & Optimism",
  humor: "Humor & Playfulness",
  spirituality: "Spirituality & Purpose",
};

export const VIA_VIRTUES: Record<string, ViaStrength[]> = {
  "خرد و دانش": ["creativity", "curiosity", "judgment", "love_of_learning", "perspective"],
  "شجاعت": ["bravery", "perseverance", "honesty", "zest"],
  "انسانیت": ["love", "kindness", "social_intelligence"],
  "عدالت": ["teamwork", "fairness", "leadership"],
  "اعتدال": ["forgiveness", "humility", "prudence", "self_regulation"],
  "تعالی": ["appreciation_of_beauty", "gratitude", "hope", "humor", "spirituality"],
};

export const VIA_VIRTUES_EN: Record<string, string> = {
  "خرد و دانش": "Wisdom & Knowledge",
  "شجاعت": "Courage",
  "انسانیت": "Humanity",
  "عدالت": "Justice",
  "اعتدال": "Temperance",
  "تعالی": "Transcendence",
};

export const VIA_ITEMS: ViaItem[] = (() => {
  const items: ViaItem[] = [];
  let id = 1;
  for (const strength of Object.keys(STRENGTH_TEMPLATES) as ViaStrength[]) {
    for (const t of STRENGTH_TEMPLATES[strength]) {
      items.push({ id: id++, text: t.fa, text_en: t.en, strength });
    }
  }
  return items;
})();

export type ViaScores = Record<ViaStrength, number>;

export function scoreVia(responses: Record<number, number>): ViaScores {
  const totals = Object.fromEntries(
    Object.keys(STRENGTH_TEMPLATES).map((s) => [s, 0])
  ) as ViaScores;
  for (const item of VIA_ITEMS) {
    const v = responses[item.id];
    if (typeof v === "number") totals[item.strength] += v;
  }
  return totals;
}

export interface SignatureStrengthDetail {
  strength: ViaStrength;
  nameFa: string;
  nameEn: string;
  score: number;
  virtueFa: string;
  virtueEn: string;
  dailyApplicationFa: string;
  dailyApplicationEn: string;
  shadowWarningFa: string;
  shadowWarningEn: string;
  recommendedHabitFa: string;
  recommendedHabitEn: string;
}

export interface ViaAnalysis {
  ranking: { strength: ViaStrength; score: number }[];
  signature: ViaStrength[]; // top 5
  signatureDetails: SignatureStrengthDetail[];
  dominant_virtue: string;
  dominant_virtue_en: string;
  virtueAverages: Record<string, number>;
  actionableHabits: {
    titleFa: string;
    titleEn: string;
    descFa: string;
    descEn: string;
    icon: string;
  }[];
}

const STRENGTH_GUIDE: Record<
  ViaStrength,
  {
    virtue: string;
    virtueEn: string;
    appFa: string;
    appEn: string;
    shadowFa: string;
    shadowEn: string;
    habitFa: string;
    habitEn: string;
    icon: string;
  }
> = {
  creativity: {
    virtue: "خرد و دانش", virtueEn: "Wisdom & Knowledge",
    appFa: "در پروژه‌ها و تسک‌های روزانه، حداقل یک رویکرد نامتعارف یا بهینه‌سازی جدید ابداع کن.",
    appEn: "Design at least one unconventional optimization or creative solution in daily tasks.",
    shadowFa: "پیچیده‌سازی افراطی مسائل ساده؛ تعهد بیش از حد به ایده‌های متعدد بدون تحویل نهایی.",
    shadowEn: "Over-complicating simple tasks; chasing new shiny ideas without finishing current ones.",
    habitFa: "۱۵ دقیقه طوفان فکری بدون قضاوت در یادداشت‌ها", habitEn: "15 minutes of unconstrained ideation journaling",
    icon: "🎨",
  },
  curiosity: {
    virtue: "خرد و دانش", virtueEn: "Wisdom & Knowledge",
    appFa: "کنجکاوی‌ات را صرف تحقیق عمیق در ابزارها و مهارت‌های کاری جدید کن.",
    appEn: "Channel curiosity into deep research on cutting-edge skills and work practices.",
    shadowFa: "پرت شدن حواس و رفتن به عمق موضوعات غیرضروری بدون ددلاین مشخص.",
    shadowEn: "Distraction by rabbit holes and losing track of immediate delivery timelines.",
    habitFa: "۲۰ دقیقه مطالعه یا کشف یک موضوع جدید", habitEn: "20 minutes of curiosity-driven reading",
    icon: "🔍",
  },
  judgment: {
    virtue: "خرد و دانش", virtueEn: "Wisdom & Knowledge",
    appFa: "بررسی تصمیمات مالی و استراتژیک با چک‌لیست معایب و مزایا.",
    appEn: "Evaluate financial and strategic moves using structured pros/cons analysis.",
    shadowFa: "تحلیل فلج‌کننده (Analysis Paralysis) و سخت‌گیری بیش از حد به خود و دیگران.",
    shadowEn: "Analysis paralysis and harsh skepticism that delays decisive action.",
    habitFa: "یادداشت هفتگی ۳ تصمیم کلیدی و دلایل آن", habitEn: "Weekly log of 3 critical decisions and rationale",
    icon: "⚖️",
  },
  love_of_learning: {
    virtue: "خرد و دانش", virtueEn: "Wisdom & Knowledge",
    appFa: "تقسیم کتاب‌ها و دوره‌های مهارتی به فصول کوچک در سیستم فلش‌کارت یا نوت‌ها.",
    appEn: "Deconstruct books and masterclasses into bite-sized note summaries.",
    shadowFa: "انباشت دانش بدون اقدام عملی (یادگیری به عنوان پوششی برای اهمال‌کاری).",
    shadowEn: "Hoarding theoretical knowledge as a subtle disguise for action procrastination.",
    habitFa: "ثبت ۳ نکته طلایی آموخته‌شده در روز", habitEn: "Daily log of 3 golden takeaways learned",
    icon: "📚",
  },
  perspective: {
    virtue: "خرد و دانش", virtueEn: "Wisdom & Knowledge",
    appFa: "کمک به تیم و دوستان در دیدن تصویر کلان و جلوگیری از غرق شدن در جزئیات ناچیز.",
    appEn: "Guide collaborators to maintain the 10,000-foot strategic vision.",
    shadowFa: "توصیه‌گری بیش از حد زمانی که فرد فقط نیاز به شنیده شدن دارد.",
    shadowEn: "Giving unprompted unsolicited advice when someone simply needs empathy.",
    habitFa: "مرور افق‌های زمانی در تایم‌باکت در ابتدای هفته", habitEn: "Weekly bird's-eye review of horizon buckets",
    icon: "🔭",
  },
  bravery: {
    virtue: "شجاعت", virtueEn: "Courage",
    appFa: "شروع سخت‌ترین تسک روز (Eat the Frog) بدون معطلی و مطرح کردن گفتگوهای دشوار.",
    appEn: "Tackle the most intimidating task first and initiate needed difficult conversations.",
    shadowFa: "ریسک‌های نسنجیده یا ماجراجویی بی‌ملاحظه در جایی که احتیاط لازم است.",
    shadowEn: "Reckless bravado in situations demanding patient prudence.",
    habitFa: "شروع روز با شجاعانه‌ترین وظیفه (MIT اول)", habitEn: "Start the day tackling your most daunting priority",
    icon: "🦁",
  },
  perseverance: {
    virtue: "شجاعت", virtueEn: "Courage",
    appFa: "تمام کردن پروژه‌های نیمه‌کاره با بلوک‌های تمرکز پیوسته و گیمیفیکیشن باغ رشد.",
    appEn: "Drive stalled projects across the finish line with Pomodoro deep work blocks.",
    shadowFa: "اصرار سرسختانه بر ادامه مسیری که مشخصاً شکست خورده یا بازدهی ندارد.",
    shadowEn: "Stubbornly clinging to a failing strategy long after pivot is required.",
    habitFa: "حفظ زنجیره پیوستگی (Streak) در باغ رشد ارشناز", habitEn: "Maintain daily streak in the Growth Garden",
    icon: "🛡️",
  },
  honesty: {
    virtue: "شجاعت", virtueEn: "Courage",
    appFa: "صداقت با خود درباره اولویت‌های واقعی و شفافیت تمام در تحویل کارها.",
    appEn: "Ruthless honesty with yourself about time capacity and transparent reporting.",
    shadowFa: "صراحت گزنده و بی‌رحمانه‌ای که احساسات عزیزان را جریحه‌دار می‌کند.",
    shadowEn: "Blunt, unvarnished candor that unnecessarily wounds sensitive collaborators.",
    habitFa: "چک‌این صادقانه پایان روز بدون انکار احساسات", habitEn: "Authentic evening check-in honoring true feelings",
    icon: "💎",
  },
  zest: {
    virtue: "شجاعت", virtueEn: "Courage",
    appFa: "تزریق نشاط و انرژی به محیط کار، همراه کردن تمرین‌های بدنی پرانرژی با روزمره.",
    appEn: "Infuse enthusiasm into teammates and power routines with energetic workouts.",
    shadowFa: "تخلیه زودهنگام باتری و مواجهه با فرود ناگهانی انرژی و خستگی مفرط.",
    shadowEn: "Running at 110% throttle until sudden crash and exhaustion hit.",
    habitFa: "۲۰ دقیقه ورزش هوازی یا تمرین پرانرژی صبحگاهی", habitEn: "20 minutes of energizing morning cardio",
    icon: "⚡",
  },
  love: {
    virtue: "انسانیت", virtueEn: "Humanity",
    appFa: "تخصیص زمان بدون گوشی برای عزیزان و ساختن پناهگاهی امن در روابط.",
    appEn: "Schedule dedicated screen-free connection time for loved ones.",
    shadowFa: "وابستگی افراطی و فراموش کردن حریم و اهداف رشد فردی.",
    shadowEn: "Emotional co-dependency and neglecting individual autonomy.",
    habitFa: "ارسال پیام محبت‌آمیز یا تماس تلفنی با یک عزیز", habitEn: "Daily thoughtful message or call to someone dear",
    icon: "❤️",
  },
  kindness: {
    virtue: "انسانیت", virtueEn: "Humanity",
    appFa: "کمک بی‌چشمداشت به یک همکار یا فرد نیازمند، آسان کردن مسیر دیگران.",
    appEn: "Perform spontaneous random acts of kindness without fanfare.",
    shadowFa: "ناتوانی در «نه» گفتن و خستگی شدید ناشی از فدا کردن اولویت‌های خود.",
    shadowEn: "Boundary erosion and burnout stemming from compulsive people-pleasing.",
    habitFa: "یک کار خیر یا تسهیل‌گر کوچک در روز", habitEn: "One small compassionate deed daily",
    icon: "🤝",
  },
  social_intelligence: {
    virtue: "انسانیت", virtueEn: "Humanity",
    appFa: "خواندن زبان بدن و نیازهای ناگفته در جلسات و ایجاد هماهنگی روانی در تیم.",
    appEn: "Read room dynamics and negotiate win-win alignment in team meetings.",
    shadowFa: "بیش‌تحلیل انگیزه‌های دیگران و ایجاد سوءظن یا اضطراب اجتماعی بی‌مورد.",
    shadowEn: "Over-analyzing others' hidden motives and generating social anxiety.",
    habitFa: "گوش دادن فعال به یک همکار بدون قضاوت", habitEn: "Active empathetic listening practice with a colleague",
    icon: "🧠",
  },
  teamwork: {
    virtue: "عدالت", virtueEn: "Justice",
    appFa: "تسهیل همکاری گروهی، به اشتراک گذاشتن آموخته‌ها و تقویت انسجام تیمی.",
    appEn: "Drive team cohesion and share useful knowledge openly across peers.",
    shadowFa: "محو شدن در خواسته‌های گروه و از دست رفتن هویت و تصمیم مستقل.",
    shadowEn: "Losing independent critical voice in favor of groupthink harmony.",
    habitFa: "بررسی و هماهنگی وظایف اشتراکی در آغاز هفته", habitEn: "Weekly sync on shared deliverables with teammates",
    icon: "👥",
  },
  fairness: {
    virtue: "عدالت", virtueEn: "Justice",
    appFa: "قضاوت بی‌طرفانه در مشاجرات، حمایت از حقوق تضییع‌شده و تقسیم عادلانه منابع.",
    appEn: "Impartial mediation in disputes and championing equitable resource sharing.",
    shadowFa: "عدالت‌طلبی خشک و حقوقی که انعطاف و بخشش را نادیده می‌گیرد.",
    shadowEn: "Dogmatic rigidity that leaves no room for grace or situational empathy.",
    habitFa: "بررسی بی‌طرفانه بازخوردهای دریافتی در پایان ماه", habitEn: "Monthly unbiased audit of received feedback",
    icon: "⚖️",
  },
  leadership: {
    virtue: "عدالت", virtueEn: "Justice",
    appFa: "تعیین جهت‌گیری شفاف پروژه‌ها، پذیرش مسئولیت نتایج و توانمندسازی اطرافیان.",
    appEn: "Set clear strategic trajectory, own team outcomes, and empower members.",
    shadowFa: "کنترل‌گری افراطی (Micromanagement) و دشواری در واگذاری اختیارات.",
    shadowEn: "Micromanagement and reluctance to delegate ownership to others.",
    habitFa: "روشن کردن ۱ اولویت استراتژیک تیمی در هر روز", habitEn: "Daily clarification of 1 strategic priority for the team",
    icon: "👑",
  },
  forgiveness: {
    virtue: "اعتدال", virtueEn: "Temperance",
    appFa: "رها کردن رنجش‌های گذشته، ایجاد فضای امن برای جبران اشتباهات در کار و زندگی.",
    appEn: "Release past grievances to preserve clean energy for creative execution.",
    shadowFa: "تحمل مکرر رفتارهای سمی و عدم برخورد قاطع با نقض مکرر مرزها.",
    shadowEn: "Tolerating repetitive toxic boundary violations under the guise of mercy.",
    habitFa: "نوشتن و رها کردن ۱ کینه در یادداشت‌های روزانه", habitEn: "Journaling and releasing 1 lingering resentment",
    icon: "🕊️",
  },
  humility: {
    virtue: "اعتدال", virtueEn: "Temperance",
    appFa: "استقبال صمیمانه از انتقاد سازنده، یادگیری از هر کسی بدون غرور.",
    appEn: "Receive constructive feedback with curiosity and learn from anyone.",
    shadowFa: "کم‌ارزش شمردن خود، سکوت در برابر تضییع حق و پنهان ماندن شایستگی‌ها.",
    shadowEn: "Imposter self-effacement and letting worthy achievements remain invisible.",
    habitFa: "تشکر از همکارانی که در خروجی‌هایت سهم داشتند", habitEn: "Publicly thanking collaborators who aided your output",
    icon: "🌱",
  },
  prudence: {
    virtue: "اعتدال", virtueEn: "Temperance",
    appFa: "مدیریت دقیق بودجه و ذخایر، پیش‌بینی بحران‌ها و اتخاذ تصمیمات پخته.",
    appEn: "Anticipate operational bottlenecks and allocate contingency reserves.",
    shadowFa: "ترس از اقدام، محافظه‌کاری بیش از حد و از دست رفتن فرصت‌های طلایی رشد.",
    shadowEn: "Risk-averse paralysis causing you to miss transformative growth windows.",
    habitFa: "بررسی ریسک‌های مالی و کاری در ابتدای هر ماه", habitEn: "Monthly risk assessment and contingency check",
    icon: "🧭",
  },
  self_regulation: {
    virtue: "اعتدال", virtueEn: "Temperance",
    appFa: "کنترل کامل بر استفاده از گوشی، تعهد آهنین به برنامه خواب و ورزش.",
    appEn: "Master screen time discipline and maintain unbending sleep schedules.",
    shadowFa: "سخت‌گیری مکانیکی و خودسرزنشی شدید در صورت کوچک‌ترین انحراف از رژیم.",
    shadowEn: "Rigid perfectionism and cruel self-rebuke over minor routine slips.",
    habitFa: "قانون بدون گوشی در اولین ساعت پس از بیداری", habitEn: "Strict no-phone rule for the first 60 minutes of the morning",
    icon: "🧘‍♂️",
  },
  appreciation_of_beauty: {
    virtue: "تعالی", virtueEn: "Transcendence",
    appFa: "توجه به زیبایی محیط کار، لذت بردن از پیاده‌روی در طبیعت و ارتقای حس زیبایی‌شناختی.",
    appEn: "Curate an inspiring aesthetic work environment and soak in natural wonders.",
    shadowFa: "فرار به دنیای فانتزی و انفعال در برابر کارهای خسته‌کننده اما لازم.",
    shadowEn: "Retreating into daydreaming while ignoring unglamorous practical duties.",
    habitFa: "۱۰ دقیقه پیاده‌روی آگاهانه در طبیعت بدون هندزفری", habitEn: "10 minutes of mindful, unplugged nature immersion",
    icon: "🌸",
  },
  gratitude: {
    virtue: "تعالی", virtueEn: "Transcendence",
    appFa: "ثبت ۳ داشته مثبت در Check-in روزانه، دیدن نیمه پر لیوان در چالش‌ها.",
    appEn: "Log 3 genuine blessings in daily check-in to re-wire neural optimism.",
    shadowFa: "مثبت‌اندیشی سمی و انکار مشکلات واقعی که نیازمند حل مسئله هستند.",
    shadowEn: "Toxic positivity that invalidates legitimate grief or operational failures.",
    habitFa: "ثبت ۳ نکته سپاسگزاری در انتهای هر روز", habitEn: "Evening check-in logging 3 moments of heartfelt gratitude",
    icon: "🙏",
  },
  hope: {
    virtue: "تعالی", virtueEn: "Transcendence",
    appFa: "ترسیم چشم‌اندازهای ۵ ساله الهام‌بخش و تزریق انگیزه به اطرافیان در سختی‌ها.",
    appEn: "Draft bold multi-year roadmaps and buoy team resilience through hurdles.",
    shadowFa: "خوش‌خیالی خام و کم‌اهمیت جلوه دادن خطرات عینی و واقعی.",
    shadowEn: "Wishful thinking that ignores harsh empirical constraints.",
    habitFa: "مرور اهداف سالانه و ستاره قطبی در ابتدای هر ماه", habitEn: "Monthly review of North Star aspirations and milestones",
    icon: "🌟",
  },
  humor: {
    virtue: "تعالی", virtueEn: "Transcendence",
    appFa: "شکستن جو سنگین جلسات با شوخ‌طبعی سالم و کاهش استرس با خنده.",
    appEn: "Defuse heavy meeting tension with warmth, wit, and cheerful perspective.",
    shadowFa: "شوخی نابجا در موقعیت‌های حساس و جدی نگرفتن مسائل مهم.",
    shadowEn: "Inappropriate levity in somber moments or using humor to evade intimacy.",
    habitFa: "به اشتراک گذاشتن یک نکته طنزآمیز با دوستان", habitEn: "Sharing a laugh or humorous moment with companions",
    icon: "😄",
  },
  spirituality: {
    virtue: "تعالی", virtueEn: "Transcendence",
    appFa: "پیوند زدن اهداف کاری به خدمت‌رسانی و معنای زندگی، انجام تمرین‌های آرامش و مراقبه.",
    appEn: "Anchor daily labor in service to a higher purpose and practice stillness.",
    shadowFa: "جدا شدن از واقعیت‌های ملموس زندگی و توجیه منفعل بودن با تقدیرگرایی.",
    shadowEn: "Spiritual bypassing: using metaphysics to justify practical apathy.",
    habitFa: "۱۰ دقیقه سکوت، مراقبه یا ارتباط با معنای زندگی", habitEn: "10 minutes of stillness, meditation, or soulful prayer",
    icon: "🌌",
  },
};

export function analyzeVia(scores: ViaScores): ViaAnalysis {
  const ranking = (Object.entries(scores) as [ViaStrength, number][])
    .map(([s, score]) => ({ strength: s, score }))
    .sort((a, b) => b.score - a.score);

  const signature = ranking.slice(0, 5).map((r) => r.strength);

  // Calculate average score per virtue
  const virtueAverages: Record<string, number> = {};
  for (const [virtue, strs] of Object.entries(VIA_VIRTUES)) {
    const total = strs.reduce((acc, s) => acc + (scores[s] || 0), 0);
    virtueAverages[virtue] = +(total / strs.length).toFixed(1);
  }

  // Find dominant virtue (by top 5 density or highest average)
  let dominant_virtue: string = "خرد و دانش";
  let maxDensity = 0;
  for (const [virtue, strs] of Object.entries(VIA_VIRTUES)) {
    const density = strs.filter((s) => signature.includes(s)).length / 5;
    if (density > maxDensity) {
      maxDensity = density;
      dominant_virtue = virtue;
    }
  }
  if (maxDensity === 0) {
    // Pick the virtue with highest average score
    dominant_virtue = Object.entries(virtueAverages).sort((a, b) => b[1] - a[1])[0][0];
  }

  // Generate detailed signature items
  const signatureDetails: SignatureStrengthDetail[] = signature.map((str) => {
    const meta = STRENGTH_GUIDE[str];
    return {
      strength: str,
      nameFa: VIA_LABELS[str],
      nameEn: VIA_LABELS_EN[str],
      score: scores[str],
      virtueFa: meta.virtue,
      virtueEn: meta.virtueEn,
      dailyApplicationFa: meta.appFa,
      dailyApplicationEn: meta.appEn,
      shadowWarningFa: meta.shadowFa,
      shadowWarningEn: meta.shadowEn,
      recommendedHabitFa: meta.habitFa,
      recommendedHabitEn: meta.habitEn,
    };
  });

  // Actionable Habits tailored to top 2-3 signature strengths
  const actionableHabits = signature.slice(0, 3).map((str) => {
    const meta = STRENGTH_GUIDE[str];
    return {
      titleFa: meta.habitFa,
      titleEn: meta.habitEn,
      descFa: `عادت الهام‌گرفته از نقطه قوت «${VIA_LABELS[str]}»: ${meta.appFa}`,
      descEn: `Habit anchored in strength "${VIA_LABELS_EN[str]}": ${meta.appEn}`,
      icon: meta.icon,
    };
  });

  return {
    ranking,
    signature,
    signatureDetails,
    dominant_virtue,
    dominant_virtue_en: VIA_VIRTUES_EN[dominant_virtue] || dominant_virtue,
    virtueAverages,
    actionableHabits,
  };
}
