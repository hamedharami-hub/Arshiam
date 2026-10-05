import { firebaseStore } from "@/lib/firebaseStore";
import { callAI } from "@/lib/ai";
import { generateUUID, type GoalKanban, type TimeHorizon, type GoalPriority } from "@/lib/kanbanGoals";
import { saveMindValues, upsertMindGoal, type MindGoalItem } from "@/lib/firestoreDataService";
import { dayPatch } from "@/lib/taskSchedule";
import { toLocalISO } from "@/lib/timeHorizon";

/** Explicit, lossless mapping from a Life Architect goal level to a Mind goal level. */
export function mindGoalHorizon(h: string | null | undefined): MindGoalItem["horizon"] | null {
  switch (h) {
    case "yearly": return "year";
    case "quarterly": return "quarter";
    case "monthly": return "month";
    case "weekly": return "week";
    default: return null;
  }
}

export type RoleArchetype =
  | "freelancer"
  | "corporate"
  | "student"
  | "creator"
  | "homemaker"
  | "transition"
  | "balanced";

export type LifeObstacle =
  | "procrastination"
  | "overwhelm"
  | "distraction"
  | "consistency"
  | "work_life_balance";

export type LifeDomainKey =
  | "career"
  | "health"
  | "mind"
  | "growth"
  | "finance"
  | "relationships";

export type Chronotype = "morning" | "afternoon" | "night" | "flexible";

export type EnergyCapacity = "recovery" | "steady" | "sprint";

export type CoreValueKey =
  | "peace"
  | "freedom"
  | "growth"
  | "impact"
  | "discipline"
  | "love"
  | "security"
  | "courage";

export interface CoreValueMeta {
  key: CoreValueKey;
  labelFa: string;
  labelEn: string;
  icon: string;
  quoteFa: string;
  quoteEn: string;
  descFa: string;
  descEn: string;
}

export const CORE_VALUES_LIST: CoreValueMeta[] = [
  {
    key: "peace",
    labelFa: "آرامش و تعادل درونی",
    labelEn: "Peace & Inner Balance",
    icon: "🕊️",
    quoteFa: "«آرامش، نداشتن طوفان نیست؛ آرام بودن در دل طوفان است.»",
    quoteEn: "“Peace is not the absence of storm, but calm within the storm.”",
    descFa: "رهایی از نشخوار فکری، آرامش روان، کاهش استرس و پذیرش خردمندانه",
    descEn: "Freedom from rumination, mental tranquility, and mindful acceptance",
  },
  {
    key: "freedom",
    labelFa: "آزادی و استقلال شخصی",
    labelEn: "Freedom & Autonomy",
    icon: "🦅",
    quoteFa: "«بزرگ‌ترین دارایی، توانایی مدیریت زمان و زیستن طبق ارزش‌های خود است.»",
    quoteEn: "“The highest form of wealth is the ability to wake up and own your day.”",
    descFa: "اختیار در زمان، تصمیم‌گیری مستقل، رهایی مالی و خودفرمانی",
    descEn: "Sovereignty over time, independent choices, and self-direction",
  },
  {
    key: "growth",
    labelFa: "رشد مداوم و دانایی",
    labelEn: "Growth & Wisdom",
    icon: "🌱",
    quoteFa: "«بهتر شدن ۱ درصدی روزانه، سالانه ۳۷ برابر ارتقا ایجاد می‌کند.»",
    quoteEn: "“Getting 1% better every day compounds into 37x growth in a year.”",
    descFa: "کنجکاوی ذهنی، مطالعه مستمر، کسب مهارت‌های کاربردی و توسعه ظرفیت فردی",
    descEn: "Intellectual curiosity, continuous reading, and expanding mental bandwidth",
  },
  {
    key: "impact",
    labelFa: "اثرگذاری و ارزش‌آفرینی",
    labelEn: "Impact & Creation",
    icon: "⚡",
    quoteFa: "«معنای زندگی در حل مسائل معنادار و گره‌گشایی برای دیگران است.»",
    quoteEn: "“The purpose of life is to create meaningful value and solve real problems.”",
    descFa: "خلق آثار ماندگار، حل مسائل عمیق کاری و اجتماعی، الهام‌بخشی به دیگران",
    descEn: "Building enduring work, solving deep problems, and elevating others",
  },
  {
    key: "discipline",
    labelFa: "انضباط و تسلط شخصی",
    labelEn: "Discipline & Self-Mastery",
    icon: "💎",
    quoteFa: "«انضباط یعنی انتخاب میان آنچه اکنون می‌خواهی و آنچه بیشتر از همه می‌خواهی.»",
    quoteEn: "“Discipline is choosing between what you want now and what you want most.”",
    descFa: "وفاداری به تعهدات، اراده پایدار، مهار لذت‌های آنی و غلبه بر تنبلی",
    descEn: "Honoring commitments, grit, delaying gratification, and overcoming impulse",
  },
  {
    key: "love",
    labelFa: "عشق، خانواده و صمیمیت",
    labelEn: "Love, Family & Warmth",
    icon: "❤️",
    quoteFa: "«در پایان روز، آنچه ماندگار است کیفیت پیوندهای اصیل قلبی است.»",
    quoteEn: "“At the end of the day, what truly endures is the quality of authentic bonds.”",
    descFa: "حضور باکیفیت برای عزیزان، محبت بی‌قیدوشرط و ساخت آشیانه‌ای گرم و امن",
    descEn: "Quality presence with loved ones, unconditional warmth, and deep connection",
  },
  {
    key: "security",
    labelFa: "امنیت، نظم و ثبات پایدار",
    labelEn: "Security & Stability",
    icon: "🛡️",
    quoteFa: "«پایه‌های محکم، اجازه می‌دهد شاخه‌ها بدون ترس به آسمان رشد کنند.»",
    quoteEn: "“Strong roots allow branches to reach toward the sky without fear.”",
    descFa: "انضباط مالی، مدیریت ریسک‌ها، شفافیت محیطی و آرامش خاطر از فردا",
    descEn: "Financial safety, smart risk mitigation, structural order, and foresight",
  },
  {
    key: "courage",
    labelFa: "شجاعت و عبور از ترس‌ها",
    labelEn: "Courage & Boldness",
    icon: "🎯",
    quoteFa: "«شجاعت غیبتِ ترس نیست، بلکه اقدام کردن با وجود حضور ترس است.»",
    quoteEn: "“Courage is not the absence of fear, but taking action despite it.”",
    descFa: "خروج از محدوده امن، آزمایش فرصت‌های نوین، پذیرش چالش‌ها و آغازهای بزرگ",
    descEn: "Leaving comfort zones, testing novel horizons, and embarking on bold starts",
  },
];

export interface EnergyCapacityMeta {
  key: EnergyCapacity;
  labelFa: string;
  labelEn: string;
  icon: string;
  badgeFa: string;
  badgeEn: string;
  descFa: string;
  descEn: string;
  strategyFa: string;
  strategyEn: string;
}

export const ENERGY_CAPACITY_OPTIONS: EnergyCapacityMeta[] = [
  {
    key: "recovery",
    labelFa: "حالت بازیابی و تجدید قوا (کم‌فشار و مهربان)",
    labelEn: "Recovery & Replenishment (Gentle & Low Friction)",
    icon: "🌿",
    badgeFa: "کاهش بار شناختی",
    badgeEn: "Low Cognitive Load",
    descFa: "در دوره فرسودگی، خستگی مفرط یا استرس بالا هستید. تمرکز روی ریکاوری بدون احساس گناه.",
    descEn: "Recovering from burnout, illness, or high life stress. Focus on guilt-free rest and minimal friction.",
    strategyFa: "فقط ۱ عادت آرام‌بخش + تسک‌های ریزِ زیر ۵ دقیقه برای شکستن سد شروع بدون فشار عصبی.",
    strategyEn: "Only 1 gentle habit + micro-tasks under 5 minutes to restore dopamine without mental overload.",
  },
  {
    key: "steady",
    labelFa: "حالت پایداری و ریتم متوازن (پیشنهادی)",
    labelEn: "Steady & Balanced Rhythm (Recommended)",
    icon: "⚖️",
    badgeFa: "پیوستگی پایدار",
    badgeEn: "Sustainable Consistency",
    descFa: "انرژی و زمان طبیعی دارید و هدف، ساختن یک روتین پیوسته، پایدار و قابل‌حفظ در بلندمدت است.",
    descEn: "Normal energy and schedule; goal is establishing a solid, sustainable routine that lasts.",
    strategyFa: "ترکیب ۲ تا ۳ عادت مکمل (اولویت صبح، مانع‌زدایی و ورزش) همراه با اهداف فصلی واقع‌گرایانه.",
    strategyEn: "Combination of 2-3 keystone habits (Morning MIT, anti-friction, and body vitality) with clear quarterly targets.",
  },
  {
    key: "sprint",
    labelFa: "حالت اسپرینت و جهش رشد (انرژی و انگیزه حداکثری)",
    labelEn: "High-Growth Sprint (Full Drive)",
    icon: "🚀",
    badgeFa: "سرعت و پیشرفت حداکثری",
    badgeEn: "Maximum Velocity",
    descFa: "انرژی و انگیزه بالایی دارید و آماده‌اید در یک بازه زمانی معین، جهش بزرگی در کار یا اهدافتان ایجاد کنید.",
    descEn: "Peak motivation and energy; ready to push limits and accomplish high-velocity milestones.",
    strategyFa: "سیستم پومودوروهای عمیق روزانه، اهداف جاه‌طلبانه و پایش دقیق پیوستگی در باغ رشد.",
    strategyEn: "Deep daily focus blocks, ambitious milestones, strict discipline, and active habit compounding.",
  },
];

export interface DomainMetaInfo {
  nameFa: string;
  nameEn: string;
  icon: string;
  color: string;
  descFa: string;
  descEn: string;
  reflectionFa: string;
  reflectionEn: string;
}

export const LIFE_DOMAINS_INFO: Record<LifeDomainKey, DomainMetaInfo> = {
  career: {
    nameFa: "کار، شغل و پروژه‌ها",
    nameEn: "Career & Projects",
    icon: "💼",
    color: "#3b82f6",
    descFa: "پیشرفت حرفه‌ای، اعتبار کاری، تحویل به موقع تعهدات و درآمدزایی",
    descEn: "Professional growth, execution excellence, client delivery, and revenue",
    reflectionFa: "چقدر از پیشرفت کاری، ثمردهی تلاش‌ها و احساس موثر بودن خود خرسندید؟",
    reflectionEn: "How satisfied are you with your career momentum and professional impact?",
  },
  health: {
    nameFa: "تندرستی، ورزش و خواب عمیق",
    nameEn: "Health, Fitness & Sleep",
    icon: "🏃‍♂️",
    color: "#10b981",
    descFa: "سوخت بدنی، خواب باکیفیت، تحرک منظم و سطح نشاط و شادابی در طول روز",
    descEn: "Physical vitality, restorative sleep, regular movement, and daily vigor",
    reflectionFa: "سطح انرژی بدنی، کیفیت خواب شبانه و مراقبت جسمانی شما چطور است؟",
    reflectionEn: "How do you rate your physical energy, sleep quality, and fitness habits?",
  },
  mind: {
    nameFa: "آرامش ذهن، خودشناسی و روان",
    nameEn: "Peace of Mind & Resilience",
    icon: "🧠",
    color: "#8b5cf6",
    descFa: "مدیریت استرس، تمرین حضور در لحظه، چک‌این روزانه و رهایی از اضطراب",
    descEn: "Stress resilience, mindful presence, emotional grounding, and inner peace",
    reflectionFa: "در برابر تنش‌های زندگی، چقدر احساس آرامش و تاب‌آوری درونی دارید؟",
    reflectionEn: "How peaceful, present, and resilient do you feel amid life's pressures?",
  },
  growth: {
    nameFa: "یادگیری، مهارت‌ها و مطالعه",
    nameEn: "Learning & Skill Mastery",
    icon: "📚",
    color: "#f59e0b",
    descFa: "کتاب‌خوانی، یادگیری مهارت‌های تازه، زبان‌های جدید و رشد هوشی",
    descEn: "Reading, acquiring high-value skills, languages, and expanding knowledge",
    reflectionFa: "چقدر در مسیر ارتقای ذهن، یادگیری منظم و پرورش دانایی حرکت می‌کنید؟",
    reflectionEn: "How consistently are you learning, reading, and upgrading your skills?",
  },
  finance: {
    nameFa: "انضباط مالی، بودجه و پس‌انداز",
    nameEn: "Financial Discipline & Wealth",
    icon: "💰",
    color: "#06b6d4",
    descFa: "کنترل دخل و خرج، بودجه‌بندی هوشمند، پس‌انداز و استقلال مالی",
    descEn: "Cash flow control, smart budgeting, strategic saving, and financial independence",
    reflectionFa: "احساس کنترل، امنیت و برنامه‌ریزی آینده در مورد امور مالی چقدر است؟",
    reflectionEn: "How in control, disciplined, and secure do you feel regarding your finances?",
  },
  relationships: {
    nameFa: "خانواده، عشق و صمیمیت",
    nameEn: "Relationships & Heart Bonds",
    icon: "👨‍👩‍👧",
    color: "#ec4899",
    descFa: "وقت باکیفیت برای عزیزان، صمیمیت عاطفی و پیوندهای اصیل اجتماعی",
    descEn: "Quality time with loved ones, emotional warmth, and authentic connections",
    reflectionFa: "کیفیت حضور عاطفی و عمق ارتباط شما با نزدیک‌ترین افراد زندگی‌تان چیست؟",
    reflectionEn: "How deep, warm, and meaningful are your connections with loved ones?",
  },
};

export interface UserAnswers {
  role: RoleArchetype;
  wheelRatings?: Record<LifeDomainKey, number>;
  domains: LifeDomainKey[];
  coreValues?: CoreValueKey[];
  obstacle: LifeObstacle;
  energyCapacity?: EnergyCapacity;
  chronotype: Chronotype;
  customGoals?: string;
  isAuditMode?: boolean;
}

export interface PlannedFolder {
  id: string;
  name: string;
  color: string;
  icon?: string;
  description: string;
}

export interface PlannedGoal {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  timeHorizon: TimeHorizon;
  priority: GoalPriority;
  color?: string;
  icon?: string;
  parentId?: string | null;
  anchorValue?: CoreValueKey;
}

export interface PlannedHabit {
  name: string;
  description?: string;
  frequency: "daily" | "weekly";
  target_days?: number[];
  reminder_time?: string;
  icon?: string;
  color?: string;
  category?: string;
}

export interface PlannedTask {
  title: string;
  description?: string;
  folderId?: string;
  kanbanColumnId?: string;
  priority?: "urgent" | "high" | "medium" | "low" | "none";
  dueDaysOffset?: number;
}

export interface LifeBlueprint {
  title: string;
  summary: string;
  scientificInsight: string;
  coreValues?: CoreValueKey[];
  energyCapacity?: EnergyCapacity;
  folders: PlannedFolder[];
  goals: PlannedGoal[];
  habits: PlannedHabit[];
  tasks: PlannedTask[];
  recommendedWorkflow: "kanban" | "list";
}

export interface SystemAuditResult {
  totalTasks: number;
  totalFolders: number;
  totalHabits: number;
  wheelBalance: Record<LifeDomainKey, number>;
  healthScore: number;
  strengths: string[];
  gaps: string[];
  recommendations: {
    addFolders: PlannedFolder[];
    addHabits: PlannedHabit[];
    addGoals: PlannedGoal[];
    tips: string[];
  };
}

export interface WizardQuestion {
  id: keyof UserAnswers;
  titleFa: string;
  titleEn: string;
  subtitleFa: string;
  subtitleEn: string;
  scientificInsightFa: string;
  scientificInsightEn: string;
  isMultiSelect?: boolean;
  options: {
    value: string;
    labelFa: string;
    labelEn: string;
    icon: string;
    badge?: string;
    badgeEn?: string;
    descFa: string;
    descEn: string;
  }[];
}

export const WIZARD_QUESTIONS: WizardQuestion[] = [
  {
    id: "role",
    titleFa: "نقش و سبک زندگی اصلی شما در این روزها چیست؟",
    titleEn: "What is your primary role and lifestyle these days?",
    subtitleFa: "این بخش اسکلت‌بندی پوشه‌ها، ریتم کاری و افق برنامه‌ریزی شما را تعیین می‌کند.",
    subtitleEn: "This establishes the core structure of your folders and planning horizons.",
    scientificInsightFa:
      "تحقیقات آزمایشگاه طراحی زندگی استنفورد نشان می‌دهد تطابق ساختار وظایف با نقش واقعی، خستگی تصمیم‌گیری (Decision Fatigue) را تا ۴۰٪ کاهش داده و تمرکز عمیق را پایدار می‌سازد.",
    scientificInsightEn:
      "Stanford Life Design Lab research shows that aligning tasks with your actual life role cuts decision fatigue by up to 40% and sustains deep focus.",
    options: [
      {
        value: "freelancer",
        labelFa: "کارآفرین / فریلنسر / سولوپرنور",
        labelEn: "Entrepreneur / Freelancer / Solopreneur",
        icon: "🚀",
        badge: "پروژه‌محور و مستقل",
        badgeEn: "Project-Based",
        descFa: "مدیریت مشتریان، درآمدهای چندگانه، پایپ‌لاین پروژه‌ها و نیاز به خودانضباطی بالا",
        descEn: "Client management, diverse revenue, delivery pipelines, and self-directed grit",
      },
      {
        value: "corporate",
        labelFa: "کارمند / مدیر / متخصص سازمانی",
        labelEn: "Employee / Manager / Team Specialist",
        icon: "🏢",
        badge: "جلسات و خروجی فصلی",
        badgeEn: "Team & Outcomes",
        descFa: "همکاری تیمی، ددلاین‌های سازمان، اهداف فصلی (OKRs) و ضرورت مرزبندی کار و زندگی",
        descEn: "Team collaboration, corporate deadlines, OKRs, and healthy work-life boundaries",
      },
      {
        value: "student",
        labelFa: "دانشجو / پژوهشگر / داوطلب آزمون",
        labelEn: "Student / Researcher / Test Candidate",
        icon: "🎓",
        badge: "مطالعه و ددلاین",
        badgeEn: "Study & Deadlines",
        descFa: "امتحانات، فازهای پژوهش، خلاصه‌نویسی فعال و زمان‌بندی مرور مطالب",
        descEn: "Exams, research milestones, structured notes, and active recall schedules",
      },
      {
        value: "creator",
        labelFa: "تولیدکننده محتوا / طراح / نویسنده",
        labelEn: "Content Creator / Designer / Writer",
        icon: "🎨",
        badge: "پایپ‌لاین خلاقیت",
        badgeEn: "Creative Pipeline",
        descFa: "ایده‌پردازی، پیش‌تولید، تدوین، انتشار منظم و غلبه بر بلوک‌های خلاقانه ذهنی",
        descEn: "Ideation, production flow, regular publishing, and defeating creative blocks",
      },
      {
        value: "homemaker",
        labelFa: "مدیریت خانه و خانواده",
        labelEn: "Home & Family Manager",
        icon: "🏠",
        badge: "نظم آرامش‌بخش خانه",
        badgeEn: "Family & Space",
        descFa: "هماهنگی امور خانه، سلامت و برنامه اعضای خانواده، بودجه منزل و روتین‌های روزمره",
        descEn: "Household balance, family health, routines, budgeting, and a peaceful environment",
      },
      {
        value: "transition",
        labelFa: "دوران تغییر مسیر یا بازآفرینی زندگی",
        labelEn: "Life Transition / Reinvention",
        icon: "🔄",
        badge: "هدف‌گذاری نو",
        badgeEn: "New Direction",
        descFa: "کشف فرصت‌های تازه، ساخت عادات نو، بازسازی اولویت‌ها و عبور از بلاتکلیفی",
        descEn: "Exploring fresh paths, resetting priorities, and building foundational habits",
      },
      {
        value: "balanced",
        labelFa: "توسعه فردی و سبک زندگی ۳۶۰ درجه",
        labelEn: "Personal Growth & 360° Living",
        icon: "🌱",
        badge: "رشد متعادل",
        badgeEn: "Holistic Growth",
        descFa: "ایجاد توازن پایدار میان سلامتی، ورزش، ذهن‌آگاهی، مطالعه و امور مالی",
        descEn: "Harmonizing physical health, mindfulness, reading, career, and relationships",
      },
    ],
  },
  {
    id: "domains",
    titleFa: "حداکثر ۳ حوزه اصلی را برای تمرکز این فصل انتخاب کنید",
    titleEn: "Select up to 3 core domains to prioritize this season",
    subtitleFa: "قانون طلایی تمرکز: تلاش برای پیشرفت در همه‌جا، یعنی درجا زدن در همه‌جا.",
    subtitleEn: "The Golden Rule of Focus: Trying to conquer everything simultaneously leads to conquering nothing.",
    scientificInsightFa:
      "قانون وارن بافت (5/25 Rule) و اصل پارتو اثبات می‌کنند تمرکز همزمان بر بیش از ۳ جبهه عمده، احتمال تحقق اهداف را تا ۶۰٪ تضعیف می‌کند.",
    scientificInsightEn:
      "Warren Buffett's rule and behavioral science prove that focusing on more than 3 major fronts drops execution velocity by up to 60%.",
    isMultiSelect: true,
    options: Object.entries(LIFE_DOMAINS_INFO).map(([key, info]) => ({
      value: key,
      labelFa: info.nameFa,
      labelEn: info.nameEn,
      icon: info.icon,
      descFa: info.descFa,
      descEn: info.descEn,
    })),
  },
  {
    id: "obstacle",
    titleFa: "بزرگ‌ترین مانع یا نقطه اصطکاک شما در اجرای برنامه‌ها چیست؟",
    titleEn: "What is your biggest obstacle or point of friction when taking action?",
    subtitleFa: "سیستم به‌صورت خودکار پادزهر رفتاری مناسب برای مهار این اصطکاک را در روتین شما تعبیه می‌کند.",
    subtitleEn: "Targeted behavioral antidotes will be embedded into your routine to dissolve this friction.",
    scientificInsightFa:
      "روانشناسی شناختی-رفتاری (CBT) نشان می‌دهد شکست در عمل نتیجه کمبود اراده نیست؛ بلکه نتیجه اصطکاک بالا در لحظه شروع است. پادزهر رفتاری، اصطکاک شروع را به صفر نزدیک می‌کند.",
    scientificInsightEn:
      "Cognitive Behavioral Therapy (CBT) shows friction at initiation causes task failure, not lack of willpower. Behavioral antidotes lower the start barrier to near zero.",
    options: [
      {
        value: "procrastination",
        labelFa: "سختی در شروع کردن (اهمال‌کاری و تنبلی)",
        labelEn: "Getting Started (Procrastination & Hesitation)",
        icon: "⏳",
        badge: "پادزهر: قانون ۲ دقیقه جیمز کلیر",
        badgeEn: "Antidote: 2-Minute Rule",
        descFa: "عقب انداختن کارهای مهم، سخت بودن برداشتن قدم اول و انتظار برای حس و انگیزه",
        descEn: "Delaying tasks, struggling with the first step, and waiting for mood or inspiration",
      },
      {
        value: "overwhelm",
        labelFa: "حجم زیاد کارها و احساس سردرگمی (Overwhelm)",
        labelEn: "Heavy Task Volume & Brain Fog (Overwhelm)",
        icon: "🤯",
        badge: "پادزهر: ۳ اولویت طلایی (MIT)",
        badgeEn: "Antidote: Daily Most Important Tasks",
        descFa: "ندانستن اینکه اول باید چه کاری کرد و استرس شدید از لیست‌های بی‌پایان وظایف",
        descEn: "Not knowing what to tackle first and chronic stress from sprawling to-do lists",
      },
      {
        value: "distraction",
        labelFa: "پرت شدن مداوم حواس، پیام‌ها و گوشی",
        labelEn: "Constant Distractions & Attention Fragmentation",
        icon: "🎯",
        badge: "پادزهر: پومودورو بصری و کار عمیق",
        badgeEn: "Antidote: Visual Pomodoro & Deep Work",
        descFa: "نوتیفیکیشن‌ها، شبکه‌های اجتماعی و دشواری در نگه‌داشتن تمرکز روی یک کار به مدت ۲۰ دقیقه",
        descEn: "Phone notifications, social media urges, and difficulty sustaining attention for 20 minutes",
      },
      {
        value: "consistency",
        labelFa: "شروع‌های طوفانی اما رها کردن بعد از چند روز",
        labelEn: "Enthusiastic Starts that Fizzle Out (Consistency)",
        icon: "🏃‍♂️",
        badge: "پادزهر: پیوستگی در باغ رشد (Streak)",
        badgeEn: "Antidote: Growth Garden Compounding",
        descFa: "انگیزه بالا در روز اول، اما تحلیل رفتن توان و قطع شدن پیوستگی بعد از چند روز",
        descEn: "High initial burst that fades away within days without an anchored habit loop",
      },
      {
        value: "work_life_balance",
        labelFa: "غرق شدن در کار و فراموشی سلامتی و خود",
        labelEn: "Overwork & Neglecting Health and Personal Life",
        icon: "⚖️",
        badge: "پادزهر: آیین قطع اتصال شبانه (Shutdown)",
        badgeEn: "Antidote: Evening Shutdown Ritual",
        descFa: "نداشتن وقت برای ورزش، خانواده و استراحت، و کار کردن تا لحظه خوابیدن",
        descEn: "No time left for fitness, presence, or recovery; working until right before sleep",
      },
    ],
  },
  {
    id: "energyCapacity",
    titleFa: "سطح ظرفیت انرژی و زمان شما در این برهه چگونه است؟",
    titleEn: "What is your current energy capacity and bandwidth right now?",
    subtitleFa: "معمار هوشمند، حجم وظایف و تعداد عادات را متناسب با ظرفیت واقعی شما کالیبره می‌کند تا دچار فرسودگی نشوید.",
    subtitleEn: "The system calibrates task load and habit volume to your actual bandwidth to prevent burnout.",
    scientificInsightFa:
      "پژوهش جیم لوهر در زمینه مدیریت انرژی نشان می‌دهد تحمیل حجم بالای تکالیف به ذهن خسته، احتمال رهاسازی کل سیستم را تا ۸۵٪ افزایش می‌دهد. سیستم هوشمند سرعت را با روان شما تطبیق می‌دهد.",
    scientificInsightEn:
      "Jim Loehr's research on energy management shows that overloading an exhausted system increases total abandon rate by 85%. Pacing to real bandwidth is critical.",
    options: ENERGY_CAPACITY_OPTIONS.map((e) => ({
      value: e.key,
      labelFa: e.labelFa,
      labelEn: e.labelEn,
      icon: e.icon,
      badge: e.badgeFa,
      badgeEn: e.badgeEn,
      descFa: e.descFa,
      descEn: e.descEn,
    })),
  },
  {
    id: "chronotype",
    titleFa: "ساعت طلایی انرژی و اوج تمرکز شبانه‌روزی شما چه زمانی است؟",
    titleEn: "When is your peak cognitive window and energy rhythm?",
    subtitleFa: "کارهای عمیق و عادت‌های کلیدی شما دقیقا بر اساس ساعت زیستی بدنتان چیده می‌شوند.",
    subtitleEn: "Deep work blocks and keystone habits will be timed precisely to your biological clock.",
    scientificInsightFa:
      "کرونوبیولوژی و پژوهش‌های عصب‌شناختی دکتر هیوبرمن اثبات می‌کنند همگام‌سازی کارهای سنگین تحلیلی با اوج دمای بدن و ترشح طبیعی دوپامین، کارایی پردازش مغز را تا ۲ برابر ارتقا می‌دهد.",
    scientificInsightEn:
      "Chronobiology shows that synchronizing demanding analytical tasks with peak body temperature and dopamine doubles cognitive output.",
    options: [
      {
        value: "morning",
        labelFa: "سحرخیز و صبحگاهی (۶ تا ۱۱ صبح)",
        labelEn: "Early Bird & Morning Focused (6 to 11 AM)",
        icon: "🌅",
        badge: "طراوت صبحگاهی",
        badgeEn: "Morning Clarity",
        descFa: "بیشترین شفافیت فکری قبل از شلوغی‌های روزمره و تماس‌های بیرونی",
        descEn: "Peak mental clarity before incoming noise and external demands arrive",
      },
      {
        value: "afternoon",
        labelFa: "اوج تمرکز بعدازظهر (۲ تا ۶ عصر)",
        labelEn: "Afternoon Deep Work (2 to 6 PM)",
        icon: "🌆",
        badge: "انرژی نیمه دوم روز",
        badgeEn: "Midday Power",
        descFa: "صبح‌ها صرف ارتباطات و کارهای سبک، و بعدازظهرها برای کارهای سنگین و متمرکز",
        descEn: "Mornings for lightweight coordination, afternoons for uninterrupted deep work",
      },
      {
        value: "night",
        labelFa: "جغد شب و آرامش شبانه (۹ شب به بعد)",
        labelEn: "Night Owl & Evening Calm (9 PM onward)",
        icon: "🌙",
        badge: "سکوت شبانه",
        badgeEn: "Night Immersion",
        descFa: "بیشترین قدرت خلاقیت و غوطه‌وری زمانی که همه جا ساکت و آرام است",
        descEn: "Peak creativity and immersion when the surrounding environment is tranquil",
      },
      {
        value: "flexible",
        labelFa: "شناور و وابسته به شرایط روزانه",
        labelEn: "Flexible & Fluid Routine",
        icon: "⚡",
        badge: "انعطاف‌پذیر",
        badgeEn: "Adaptive",
        descFa: "نیازمند ساختاری چابک بر اساس بلوک‌های ۲۵ دقیقه‌ای پومودورو در طول روز",
        descEn: "Needs an agile setup based on 25-minute Pomodoro sprints across the day",
      },
    ],
  },
];

export function generateDeterministicBlueprint(answers: UserAnswers): LifeBlueprint {
  const {
    role,
    obstacle,
    domains,
    chronotype,
    customGoals,
    energyCapacity = "steady",
    coreValues = ["peace", "growth"],
    wheelRatings = { career: 6, health: 6, mind: 6, growth: 6, finance: 6, relationships: 6 },
  } = answers;

  const folders: PlannedFolder[] = [];
  const goals: PlannedGoal[] = [];
  const habits: PlannedHabit[] = [];
  const tasks: PlannedTask[] = [];

  const activeDomains = domains.length >= 1 ? domains : (["career", "health", "growth"] as LifeDomainKey[]);

  // Find matching core value anchor
  const primaryValue = coreValues[0] || "growth";
  const primaryValueMeta = CORE_VALUES_LIST.find((v) => v.key === primaryValue);

  activeDomains.forEach((dom) => {
    const meta = LIFE_DOMAINS_INFO[dom];
    if (!meta) return;

    const folderId = generateUUID();
    folders.push({
      id: folderId,
      name: `${meta.icon} ${meta.nameFa}`,
      color: meta.color,
      icon: meta.icon,
      description: meta.descFa,
    });

    const rootGoalId = generateUUID();
    const score = wheelRatings[dom] ?? 6;

    let goalTitle = `تمرکز فصلی: ${meta.nameFa}`;
    let goalDescription = `هدف‌گذاری متوازن با تکیه بر ارزش «${primaryValueMeta?.labelFa || "رشد"}»`;

    if (score <= 4) {
      // Urgent revitalization goal
      if (dom === "health") {
        goalTitle = "احیای سوخت زیستی و بازگرداندن خواب عمیق";
        goalDescription = "اولویت فوری: بالا بردن انرژی روزانه از طریق خواب منظم و تحرک سبک";
      } else if (dom === "career") {
        goalTitle = "سازمان‌دهی و بازسازی ثبات کاری";
        goalDescription = "پاکسازی تعهدات معوق و ایجاد روال تحویل شفاف پروژه‌ها";
      } else if (dom === "mind") {
        goalTitle = "کاهش استرس حاد و بازیابی آرامش ذهن";
        goalDescription = "کاهش بار روانی از طریق چک‌این روزانه و رهایی از نشخوار فکری";
      } else if (dom === "finance") {
        goalTitle = "ایجاد شفافیت و کنترل کامل هزینه‌های ماهانه";
        goalDescription = "ثبت شفاف مخارج و مهار خریدهای ناخواسته";
      } else if (dom === "relationships") {
        goalTitle = "احیای کیفیت وقت‌گذرانی با عزیزان";
        goalDescription = "تخصیص زمان بدون گوشی برای خانواده و دوستان صمیمی";
      } else if (dom === "growth") {
        goalTitle = "بازگشت به یادگیری منظم با روزی ۱۰ دقیقه";
        goalDescription = "آغاز مطالعه یک کتاب اثرگذار بدون کمال‌گرایی";
      }
    } else {
      if (dom === "career") {
        if (role === "freelancer") goalTitle = "توسعه مشتریان باکیفیت و تحویل بی‌نقص پروژه‌ها";
        else if (role === "corporate") goalTitle = "دستیابی برجسته به اهداف فصلی تیم (OKRs)";
        else if (role === "student") goalTitle = "تسلط بر سرفصل‌های کلیدی و معدل عالی";
        else if (role === "creator") goalTitle = "تولید و انتشار منظم محتوا با کیفیت استاندارد";
        else goalTitle = "پیشرفت هدفمند در وظایف درآمدزا و شغلی";
      } else if (dom === "health") {
        goalTitle = "پایداری روتین ورزشی، تغذیه سالم و خواب ۷.۵ ساعته";
      } else if (dom === "mind") {
        goalTitle = "تقویت تاب‌آوری درونی، آرامش خاطر و ذهن‌آگاهی";
      } else if (dom === "growth") {
        goalTitle = "مطالعه ۳ کتاب کلیدی و یادگیری ۱ مهارت اثرگذار";
      } else if (dom === "finance") {
        goalTitle = "انضباط بودجه‌بندی و پس‌انداز هدفمند فصلی";
      } else if (dom === "relationships") {
        goalTitle = "تقویت پیوندهای خانوادگی و وقت باکیفیت هفتگی";
      }
    }

    goals.push({
      id: rootGoalId,
      folderId,
      title: goalTitle,
      description: goalDescription,
      timeHorizon: energyCapacity === "sprint" ? "quarterly" : "quarterly",
      priority: score <= 4 ? "urgent" : "high",
      color: meta.color,
      icon: meta.icon,
      parentId: null,
      anchorValue: primaryValue,
    });

    tasks.push({
      title: `تعیین ۳ گام عملیاتی برای «${goalTitle}»`,
      description: "این هدف را به گام‌های هفتگی ملموس بشکن و در پوشه قرار بده.",
      folderId,
      kanbanColumnId: rootGoalId,
      priority: score <= 4 ? "urgent" : "medium",
      dueDaysOffset: 1,
    });
  });

  // Calculate reminder times based on chronotype
  const mitReminder =
    chronotype === "morning" ? "07:30" : chronotype === "afternoon" ? "12:30" : chronotype === "night" ? "11:00" : "09:00";
  const eveningReminder =
    chronotype === "night" ? "23:00" : "21:30";

  // Keystone Habit 1: Always add the MIT habit unless in deep recovery
  habits.push({
    name: "بررسی برنامه و اولویت‌بندی ۳ کار مهم روز (MIT)",
    description: "هر روز قبل از درگیر شدن با پیام‌ها و ایمیل‌ها، مهم‌ترین ۳ وظیفه اثرگذار روز را مشخص کن.",
    frequency: "daily",
    reminder_time: mitReminder,
    icon: "🎯",
    color: "#3b82f6",
    category: "focus",
  });

  // Keystone Habit 2: Anti-Obstacle protocol
  if (obstacle === "procrastination") {
    habits.push({
      name: "شروع با قانون ۲ دقیقه (ضد اهمال‌کاری)",
      description: "برای شروع سخت‌ترین کار، فقط به اندازه ۲ دقیقه دست‌به‌کار شو؛ بعد تصمیم بگیر ادامه دهی یا نه.",
      frequency: "daily",
      reminder_time: chronotype === "morning" ? "09:00" : "15:00",
      icon: "⚡",
      color: "#f59e0b",
      category: "mindset",
    });
  } else if (obstacle === "overwhelm") {
    habits.push({
      name: "شفاف‌سازی ذهنی و پاکسازی اینباکس در پایان روز",
      description: "کارهای نیمه‌کاره فردا را در اینباکس یادداشت کن تا شب‌ها با ذهنی آرام بخوابی.",
      frequency: "daily",
      reminder_time: eveningReminder,
      icon: "🌙",
      color: "#8b5cf6",
      category: "reflection",
    });
  } else if (obstacle === "distraction") {
    habits.push({
      name: "یک بلوک پومودورو ۲۵ دقیقه‌ای بدون گوشی و نوتیفیکیشن",
      description: "گوشی در حالت بیصدا، بستن تب‌های اضافه و تمرکز مطلق روی ۱ وظیفه معین.",
      frequency: "daily",
      reminder_time: chronotype === "morning" ? "09:30" : "16:00",
      icon: "⏱️",
      color: "#ef4444",
      category: "focus",
    });
  } else if (obstacle === "consistency") {
    habits.push({
      name: "آبیاری باغ رشد و ثبت تیک پیوستگی در پایان روز",
      description: "با انجام حداقل ۱ کار کوچک، زنجیره پیوستگی (Streak) خود را حفظ کن و قطره آب بگیر.",
      frequency: "daily",
      reminder_time: eveningReminder,
      icon: "🌱",
      color: "#10b981",
      category: "gamification",
    });
  } else {
    // work_life_balance
    habits.push({
      name: "آیین پایان کار (Shutdown Ritual) و قطع ارتباط شبانه",
      description: "در یک ساعت مشخص کار را ببند و مابقی زمان را به استراحت و خانواده اختصاص بده.",
      frequency: "daily",
      reminder_time: eveningReminder,
      icon: "⚖️",
      color: "#ec4899",
      category: "balance",
    });
  }

  // Keystone Habit 3: Based on Energy Capacity & Health/Mind
  if (energyCapacity !== "recovery") {
    if (activeDomains.includes("health")) {
      habits.push({
        name: "۲۰ دقیقه تحرک / پیاده‌روی / تمرین بدنی",
        description: "فعالیت جسمی برای پمپاژ خون به مغز و بازتنظیم دوپامین و نشاط زیستی.",
        frequency: "daily",
        reminder_time: chronotype === "morning" ? "07:00" : "18:00",
        icon: "🏃‍♂️",
        color: "#10b981",
        category: "vitality",
      });
    } else if (activeDomains.includes("growth")) {
      habits.push({
        name: "۱۵ دقیقه مطالعه کتاب یا یادگیری مهارتی",
        description: "حفظ ریتم یادگیری حتی با خواندن چند صفحه قبل از شروع روز یا پیش از خواب.",
        frequency: "daily",
        reminder_time: "21:00",
        icon: "📖",
        color: "#f59e0b",
        category: "learning",
      });
    }
  }

  // Starter Task 1: Inbox zero / brain dump
  tasks.unshift({
    title: "آشنایی با سیستم جدید و تخلیه ذهن در اینباکس (Brain Dump)",
    description: "تمام کارهای معلق در سرت را در اینباکس بنویس تا خیالت راحت شود و ظرفیت مغزت آزاد گردد.",
    priority: "urgent",
    dueDaysOffset: 0,
  });

  // Starter Task 2: Custom goal from user
  if (customGoals && customGoals.trim()) {
    tasks.push({
      title: `اقدام اولیه برای هدف اختصاصی: ${customGoals.trim().slice(0, 50)}`,
      description: customGoals.trim(),
      priority: "high",
      dueDaysOffset: 2,
    });
  }

  // Low score rescue task
  const lowestDomainEntry = Object.entries(wheelRatings).sort((a, b) => a[1] - b[1])[0];
  if (lowestDomainEntry && lowestDomainEntry[1] <= 4) {
    const lowKey = lowestDomainEntry[0] as LifeDomainKey;
    const lowMeta = LIFE_DOMAINS_INFO[lowKey];
    tasks.push({
      title: `حرکت اضطراری برای احیای حوزه «${lowMeta?.nameFa || lowKey}»`,
      description: "یک تصمیم ساده اما قطعی برای جلوگیری از فرسایش این حوزه در این هفته اتخاذ کن.",
      priority: "high",
      dueDaysOffset: 1,
    });
  }

  const roleTitles: Record<RoleArchetype, string> = {
    freelancer: "معماری بهره‌وری فریلنسر و سولوپرنور",
    corporate: "سیستم مدیریت هدفمند کاری و سازمانی",
    student: "پایگاه یادگیری عمیق و موفقیت تحصیلی",
    creator: "سیستم جریان خلاقیت و تولید پیوسته",
    homemaker: "مدیریت آرامش‌بخش خانه و خانواده",
    transition: "طرح راهبردی تغییر مسیر و بازآفرینی فردی",
    balanced: "سیستم‌عامل جامع رشد متوازن و سلامت ۳۶۰ درجه",
  };

  const capacityNotes: Record<EnergyCapacity, string> = {
    recovery: "ضرب‌آهنگ بازیابی (Low Friction): تمرکز بر بازگشت تدریجی انرژی بدون فشار اضافه.",
    steady: "ضرب‌آهنگ پایداری و تعادل: ساخت عادات ریشه‌دار و پیشروی مداوم.",
    sprint: "ضرب‌آهنگ اسپرینت جهش: تمرکز حداکثری و دستیابی پرسرعت به دستاوردهای فصلی.",
  };

  return {
    title: roleTitles[role] || "نقشه اختصاصی معماری زندگی",
    summary: `این ساختار بر پایه هویت «${roleTitles[role]}»، مهار اصطکاک «${obstacle}»، ریتم زیستی «${chronotype}» و ${capacityNotes[energyCapacity]} مهندسی شده است.`,
    scientificInsight:
      "با پیاده‌سازی این سیستم، قشر پیش‌پیشانی مغز (Prefrontal Cortex) از بار طاقت‌فرسای به‌خاطرسپاری کارهای معلق آزاد شده و ۱۰۰٪ ظرفیت شناختی شما به اقدام روان و تمرکز عمیق اختصاص می‌یابد.",
    coreValues,
    energyCapacity,
    folders,
    goals,
    habits,
    tasks,
    recommendedWorkflow: role === "freelancer" || role === "creator" ? "kanban" : "list",
  };
}

export async function enhanceBlueprintWithAI(
  answers: UserAnswers,
  baseBlueprint: LifeBlueprint
): Promise<LifeBlueprint> {
  try {
    const prompt = `
نقش شما: معمار ارشد سیستم‌های زندگی، روانشناس رفتاری و مربی زبده بهره‌وری فردی است.
کاربر یک فرایند عمیق معماری زندگی را تکمیل کرده است:
- نقش زندگی: ${answers.role}
- مانع و اصطکاک اصلی: ${answers.obstacle}
- حوزه‌های اولویت فصلی: ${answers.domains.join(", ")}
- ارزیابی چرخ زندگی: ${JSON.stringify(answers.wheelRatings || {})}
- ارزش‌های هدایت‌گر بنیادین: ${(answers.coreValues || []).join(", ")}
- ظرفیت انرژی و سرعت اجرا: ${answers.energyCapacity || "steady"}
- ریتم ساعت اوج: ${answers.chronotype}
- هدف / چشم‌انداز اختصاصی: ${answers.customGoals || "ذکر نشده"}

ما یک نقشه ساختاری اولیه داریم:
${JSON.stringify(baseBlueprint, null, 2)}

لطفاً این نقشه را با خردمندی و قلم گرم، متین و انگیزه‌بخش فارسی صیقل بده:
1. عناوین پوشه‌ها، اهداف فصلی و عادات روزانه را کاملاً زنده، دقیق و سازگار با ارزش‌های فرد بنویس.
2. اگر کاربر در بخش هدف اختصاصی توضیحی نوشته، حتماً یک هدف فصلی ملموس و حداقل ۲ اقدام شفاف برایش بگنجان.
3. یک بینش علمی و روحیه‌بخش عمیق (حداکثر ۲ جمله) اختصاصاً برای وضعیت او بنویس.

خروجی باید صرفاً یک آبجکت JSON معتبر و بدون مارک‌داون اضافی مطابق ساختار LifeBlueprint باشد.
    `;

    const res = await callAI("chat" as any, prompt, undefined, undefined, "fa");
    if (!res) return baseBlueprint;

    let jsonStr = typeof res === "string" ? res : (res as any).text || "";
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) jsonStr = jsonMatch[0];

    const parsed = JSON.parse(jsonStr);
    if (parsed && Array.isArray(parsed.folders) && Array.isArray(parsed.habits)) {
      return {
        ...baseBlueprint,
        title: parsed.title || baseBlueprint.title,
        summary: parsed.summary || baseBlueprint.summary,
        scientificInsight: parsed.scientificInsight || baseBlueprint.scientificInsight,
        folders: parsed.folders.length > 0 ? parsed.folders : baseBlueprint.folders,
        goals: parsed.goals && parsed.goals.length > 0 ? parsed.goals : baseBlueprint.goals,
        habits: parsed.habits.length > 0 ? parsed.habits : baseBlueprint.habits,
        tasks: parsed.tasks && parsed.tasks.length > 0 ? parsed.tasks : baseBlueprint.tasks,
        coreValues: baseBlueprint.coreValues,
        energyCapacity: baseBlueprint.energyCapacity,
      };
    }
  } catch (err) {
    console.warn("AI enhancement skipped, using deterministic blueprint:", err);
  }
  return baseBlueprint;
}

export async function auditExistingSystem(userId: string): Promise<SystemAuditResult> {
  const [tasksRes, foldersRes, habitsRes] = await Promise.all([
    firebaseStore.from("tasks").select("id,title,completed,folder_id,due_date,created_at").eq("user_id", userId),
    firebaseStore.from("folders").select("id,name,color").eq("user_id", userId),
    firebaseStore.from("habits").select("id,name,frequency").eq("user_id", userId),
  ]);

  const tasks = tasksRes.data || [];
  const folders = foldersRes.data || [];
  const habits = habitsRes.data || [];

  const totalTasks = tasks.length;
  const totalFolders = folders.length;
  const totalHabits = habits.length;

  const domainKeywords: Record<LifeDomainKey, string[]> = {
    career: ["کار", "پروژه", "جلسه", "کاری", "مشتری", "ارائه", "شغل", "work", "job", "project", "client"],
    health: ["ورزش", "باشگاه", "پیاده‌روی", "خواب", "دکتر", "سلامتی", "تغذیه", "gym", "health", "sleep"],
    mind: ["مراقبه", "تنفس", "مدیتیشن", "آرامش", "استرس", "فکر", "روان", "mind", "cbt", "mood"],
    growth: ["کتاب", "مطالعه", "آموزش", "زبان", "انگلیسی", "درس", "یادگیری", "book", "read", "study", "learn"],
    finance: ["پول", "خرید", "بانک", "قسط", "حساب", "مالی", "درآمد", "سرمایه", "money", "finance", "buy"],
    relationships: ["خانواده", "دوست", "مامان", "بابا", "همسر", "بچه", "تولد", "family", "friend", "home"],
  };

  const domainCounts: Record<LifeDomainKey, number> = {
    career: 0,
    health: 0,
    mind: 0,
    growth: 0,
    finance: 0,
    relationships: 0,
  };

  tasks.forEach((t) => {
    const text = (t.title || "").toLowerCase();
    Object.entries(domainKeywords).forEach(([dKey, kws]) => {
      if (kws.some((kw) => text.includes(kw))) {
        domainCounts[dKey as LifeDomainKey]++;
      }
    });
  });

  const maxCount = Math.max(...Object.values(domainCounts), 1);
  const wheelBalance: Record<LifeDomainKey, number> = {
    career: Math.round((domainCounts.career / maxCount) * 100),
    health: Math.round((domainCounts.health / maxCount) * 100),
    mind: Math.round((domainCounts.mind / maxCount) * 100),
    growth: Math.round((domainCounts.growth / maxCount) * 100),
    finance: Math.round((domainCounts.finance / maxCount) * 100),
    relationships: Math.round((domainCounts.relationships / maxCount) * 100),
  };

  const strengths: string[] = [];
  const gaps: string[] = [];
  const addFolders: PlannedFolder[] = [];
  const addHabits: PlannedHabit[] = [];
  const addGoals: PlannedGoal[] = [];
  const tips: string[] = [];

  let healthScore = 70;
  if (totalTasks > 5) healthScore += 10;
  if (totalFolders >= 3) healthScore += 10;
  if (totalHabits >= 2) healthScore += 10;

  const unfiledCount = tasks.filter((t) => !t.folder_id).length;
  if (unfiledCount > 8) {
    gaps.push(`${unfiledCount} تسک بدون پوشه در اینباکس داری که بار شناختی و خستگی ذهن ایجاد می‌کند.`);
    tips.push("انتقال وظایف معلق اینباکس به پوشه‌های معین، حس تسلط و آرامش فوق‌العاده‌ای به همراه می‌آورد.");
    healthScore -= 10;
  } else {
    strengths.push("اینباکس سازمان‌یافته با پوشه‌بندی مناسب و شفاف.");
  }

  const existingFolderNames = folders.map((f) => f.name.toLowerCase());
  if (domainCounts.health === 0 && !existingFolderNames.some((n) => n.includes("ورزش") || n.includes("سلامت"))) {
    gaps.push("هیچ تسک یا پوشه‌ای برای تندرستی، ورزش و خواب ثبت نشده است.");
    addFolders.push({
      id: generateUUID(),
      name: "🏃‍♂️ تندرستی و انرژی",
      color: "#10b981",
      icon: "🏃‍♂️",
      description: "حفظ سوخت جسمی و نشاط برای تحقق اهداف کاری و فردی",
    });
    addHabits.push({
      name: "۲۰ دقیقه پیاده‌روی یا ورزش سبک روزانه",
      frequency: "daily",
      reminder_time: "18:30",
      icon: "🏃‍♂️",
      color: "#10b981",
    });
  }

  if (domainCounts.growth === 0 && !existingFolderNames.some((n) => n.includes("کتاب") || n.includes("یادگیری"))) {
    gaps.push("حوزه یادگیری مهارت و مطالعه در سیستم شما کمرنگ است.");
    addFolders.push({
      id: generateUUID(),
      name: "📚 یادگیری و مطالعه",
      color: "#f59e0b",
      icon: "📚",
      description: "کتاب‌خوانی و ارتقای مهارت‌های کاربردی فردی",
    });
    addHabits.push({
      name: "۱۵ دقیقه مطالعه کتاب قبل از خواب",
      frequency: "daily",
      reminder_time: "22:00",
      icon: "📖",
      color: "#f59e0b",
    });
  }

  if (totalHabits === 0) {
    gaps.push("هنوز هیچ عادتی در بخش Habits فعال نکرده‌ای.");
    addHabits.push({
      name: "بررسی ۳ اولویت اصلی روز (MIT)",
      frequency: "daily",
      reminder_time: "08:00",
      icon: "🎯",
      color: "#3b82f6",
    });
  } else {
    strengths.push(`داری از سیستم عادات با ${totalHabits} عادت فعال استفاده می‌کنی.`);
  }

  healthScore = Math.max(30, Math.min(100, healthScore));

  return {
    totalTasks,
    totalFolders,
    totalHabits,
    wheelBalance,
    healthScore,
    strengths,
    gaps,
    recommendations: {
      addFolders,
      addHabits,
      addGoals,
      tips,
    },
  };
}

export async function deployLifeBlueprint(
  blueprint: LifeBlueprint,
  userId: string,
  selectedFolderIds?: Set<string>,
  selectedHabitNames?: Set<string>,
  selectedTaskTitles?: Set<string>
): Promise<{ foldersCount: number; habitsCount: number; tasksCount: number }> {
  let foldersCount = 0;
  let habitsCount = 0;
  let tasksCount = 0;

  const folderIdMap = new Map<string, string>();

  // 1. Insert Folders into Firestore
  for (const f of blueprint.folders) {
    if (selectedFolderIds && !selectedFolderIds.has(f.id)) continue;
    const { data } = await firebaseStore
      .from("folders")
      .insert({
        user_id: userId,
        name: f.name,
        color: f.color,
      })
      .select("id")
      .single();

    if (data) {
      folderIdMap.set(f.id, data.id);
      foldersCount++;
    }
  }

  // 2. Insert Kanban Goals & ACT Mind Goals
  for (const g of blueprint.goals) {
    const realFolderId = folderIdMap.get(g.folderId);
    if (!realFolderId) continue;

    const goalId = generateUUID();
    const newGoal: GoalKanban = {
      id: goalId,
      title: g.title,
      description: g.description,
      parentId: null,
      timeHorizon: g.timeHorizon,
      priority: g.priority,
      color: g.color || "#3b82f6",
      icon: g.icon || "🎯",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Store in kanban storage
    const storageKey = `arshnaz_kanban_goals_v3_${realFolderId}`;
    try {
      const raw = localStorage.getItem(storageKey);
      const existing: GoalKanban[] = raw ? JSON.parse(raw) : [];
      localStorage.setItem(storageKey, JSON.stringify([...existing, newGoal]));
    } catch {}

    // Also sync to Mind Goals (ACT)
    try {
      await upsertMindGoal(userId, {
        id: goalId,
        user_id: userId,
        domain: g.folderId,
        text: g.title,
        ...(mindGoalHorizon(g.timeHorizon) ? { horizon: mindGoalHorizon(g.timeHorizon)! } : {}),
        created_at: new Date().toISOString(),
      });
    } catch {}
  }

  // 3. Sync Mind Values (ACT)
  if (blueprint.coreValues && blueprint.coreValues.length > 0) {
    try {
      const valuesMap: Record<string, any> = {};
      blueprint.coreValues.forEach((valKey) => {
        const meta = CORE_VALUES_LIST.find((v) => v.key === valKey);
        valuesMap[valKey] = {
          importance: 9,
          consistency: 7,
          value: meta?.descFa || meta?.labelFa || valKey,
        };
      });
      await saveMindValues(userId, valuesMap);
    } catch {}
  }

  // 4. Insert Habits into Firestore
  for (const h of blueprint.habits) {
    if (selectedHabitNames && !selectedHabitNames.has(h.name)) continue;
    const { error } = await firebaseStore.from("habits").insert({
      user_id: userId,
      name: h.name,
      description: h.description || "",
      frequency: h.frequency || "daily",
      target_days: h.target_days || [0, 1, 2, 3, 4, 5, 6],
      reminder_time: h.reminder_time || null,
    } as any);
    if (!error) habitsCount++;
  }

  // 5. Insert Tasks into Firestore
  for (const t of blueprint.tasks) {
    if (selectedTaskTitles && !selectedTaskTitles.has(t.title)) continue;
    const realFolderId = t.folderId ? folderIdMap.get(t.folderId) || null : null;
    const due = new Date();
    if (t.dueDaysOffset) due.setDate(due.getDate() + t.dueDaysOffset);

    const { error } = await firebaseStore.from("tasks").insert({
      user_id: userId,
      title: t.title,
      description: t.description || "",
      folder_id: realFolderId,
      priority: t.priority || "medium",
      ...dayPatch(toLocalISO(due)),
    });
    if (!error) tasksCount++;
  }

  // 6. Dispatch events
  window.dispatchEvent(new Event("tasks-changed"));
  window.dispatchEvent(new Event("habits-changed"));
  window.dispatchEvent(new Event("folders-changed"));
  window.dispatchEvent(new Event("goals-changed"));
  window.dispatchEvent(new Event("mind-values-changed"));

  return { foldersCount, habitsCount, tasksCount };
}
