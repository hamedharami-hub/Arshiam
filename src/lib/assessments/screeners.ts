// Validated mental-health screeners & personal self-report forms.
// Personal forms are for self-monitoring only — NOT diagnostic.
// Standard instruments (PHQ-9, GAD-7, WHO-5) use validated published scales.

export type ScreenerType = "phq9" | "gad7" | "who5" | "burnout";

export interface ScreenerItem {
  id: number;
  text: string;
  text_en?: string;
  reverse?: boolean;
}

export interface ScreenerMeta {
  type: ScreenerType;
  title: string;
  title_en: string;
  subtitle: string;
  subtitle_en: string;
  scale: number; // number of options (e.g. 4 for 0..3)
  scaleStart: 0 | 1; // smallest value
  labels: string[]; // length === scale
  labels_en: string[];
  items: ScreenerItem[];
  // Higher is worse for distress scales, higher is better for wellbeing.
  higherIsBetter: boolean;
  // Provenance & Standard instrument metadata
  isStandardized: boolean;
  instrumentVersion: string;
  scoringVersion: string;
  sourceUrl: string;
  sourceCitation: string;
  timeframe: string;
  timeframe_en: string;
}

// PHQ-9 — Depression (0..3, 9 items, range 0..27)
// Source: Kroenke K, Spitzer RL, Williams JB. The PHQ-9: validity of a brief depression severity measure. J Gen Intern Med. 2001;16(9):606-613.
export const PHQ9: ScreenerMeta = {
  type: "phq9",
  title: "PHQ-9 — غربالگری خلق و افسردگی",
  title_en: "PHQ-9 — Depression Screener",
  subtitle: "در ۲ هفته گذشته، چقدر هر یک از این مشکلات تو را آزار داده است؟",
  subtitle_en: "Over the last 2 weeks, how often have you been bothered by any of the following problems?",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر از نصف روزها", "تقریباً هر روز"],
  labels_en: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
  higherIsBetter: false,
  isStandardized: true,
  instrumentVersion: "1.0",
  scoringVersion: "kroenke-2001",
  sourceUrl: "https://www.phqscreeners.com",
  sourceCitation: "Kroenke et al. (2001). J Gen Intern Med, 16(9), 606-613.",
  timeframe: "۲ هفته گذشته",
  timeframe_en: "Last 2 weeks",
  items: [
    { id: 1, text: "کم‌علاقگی یا بی‌میلی به انجام کارها", text_en: "Little interest or pleasure in doing things" },
    { id: 2, text: "احساس غمگینی، افسردگی یا ناامیدی", text_en: "Feeling down, depressed, or hopeless" },
    { id: 3, text: "مشکل در به خواب رفتن یا ادامه خواب، یا خوابیدن بیش از حد", text_en: "Trouble falling or staying asleep, or sleeping too much" },
    { id: 4, text: "احساس خستگی یا کمبود انرژی", text_en: "Feeling tired or having little energy" },
    { id: 5, text: "بی‌اشتهایی یا پرخوری", text_en: "Poor appetite or overeating" },
    { id: 6, text: "احساس بد درباره خود — اینکه فکر کنی شکست‌خورده‌ای یا خودت یا خانواده‌ات را ناامید کرده‌ای", text_en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down" },
    { id: 7, text: "مشکل در تمرکز بر امور روزمره، مثل مطالعه یا تماشای تلویزیون", text_en: "Trouble concentrating on things, such as reading or watching television" },
    { id: 8, text: "آهسته حرکت کردن یا آرام صحبت کردن به‌نحوی که دیگران متوجه شوند؛ یا برعکس بی‌قراری به‌گونه‌ای که مدام در حال جنب‌وجوش باشی", text_en: "Moving or speaking so slowly that other people could have noticed. Or the opposite — being so fidgety or restless that you have been moving around a lot more than usual" },
    { id: 9, text: "افکاری درباره اینکه بهتر بود مرده بودی، یا افکار آسیب رساندن به خود", text_en: "Thoughts that you would be better off dead, or of hurting yourself in some way" },
  ],
};

// GAD-7 — Anxiety (0..3, 7 items, range 0..21)
// Source: Spitzer RL, Kroenke K, Williams JB, Löwe B. A brief measure for assessing generalized anxiety disorder: the GAD-7. Arch Intern Med. 2006;166(10):1092-1097.
export const GAD7: ScreenerMeta = {
  type: "gad7",
  title: "GAD-7 — غربالگری اضطراب",
  title_en: "GAD-7 — Anxiety Screener",
  subtitle: "در ۲ هفته گذشته، چقدر هر یک از این مشکلات تو را آزار داده است؟",
  subtitle_en: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر از نصف روزها", "تقریباً هر روز"],
  labels_en: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
  higherIsBetter: false,
  isStandardized: true,
  instrumentVersion: "1.0",
  scoringVersion: "spitzer-2006",
  sourceUrl: "https://www.phqscreeners.com",
  sourceCitation: "Spitzer et al. (2006). Arch Intern Med, 166(10), 1092-1097.",
  timeframe: "۲ هفته گذشته",
  timeframe_en: "Last 2 weeks",
  items: [
    { id: 1, text: "احساس عصبی بودن، اضطراب یا بی‌قراری شدید", text_en: "Feeling nervous, anxious, or on edge" },
    { id: 2, text: "ناتوانی در متوقف کردن یا کنترل نگرانی", text_en: "Not being able to stop or control worrying" },
    { id: 3, text: "نگرانی بیش از حد درباره مسائل مختلف", text_en: "Worrying too much about different things" },
    { id: 4, text: "مشکل در آرام شدن و ریلکس کردن", text_en: "Trouble relaxing" },
    { id: 5, text: "آن‌قدر بی‌قرار بودن که آرام نشستن برایت دشوار باشد", text_en: "Being so restless that it is hard to sit still" },
    { id: 6, text: "زودرنجی، کلافگی یا تحریک‌پذیری آسان", text_en: "Becoming easily annoyed or irritable" },
    { id: 7, text: "احساس ترس شدید، گویی اتفاق ناگواری در شرف وقوع است", text_en: "Feeling afraid, as if something awful might happen" },
  ],
};

// WHO-5 — Wellbeing Index (0..5, 5 items, raw 0..25 → ×4 = 0..100)
// Source: WHO (1998). Use of Well-Being Measures in Primary Health Care - The DepCare Project.
export const WHO5: ScreenerMeta = {
  type: "who5",
  title: "WHO-5 — شاخص رفاه ذهنی",
  title_en: "WHO-5 — Wellbeing Index",
  subtitle: "لطفاً مشخص کن در ۲ هفته گذشته، هر یک از این حالت‌ها را چقدر تجربه کرده‌ای:",
  subtitle_en: "Please indicate for each of the 5 statements which is closest to how you have been feeling over the last 2 weeks:",
  scale: 6,
  scaleStart: 0,
  labels: ["اصلاً و هیچ‌وقت", "بعضی اوقات", "کمتر از نیمی از اوقات", "بیشتر از نیمی از اوقات", "بیشتر اوقات", "تمام اوقات"],
  labels_en: ["At no time", "Some of the time", "Less than half the time", "More than half the time", "Most of the time", "All of the time"],
  higherIsBetter: true, // Higher score = better well-being!
  isStandardized: true,
  instrumentVersion: "1998",
  scoringVersion: "who-1998",
  sourceUrl: "https://www.who-5.org",
  sourceCitation: "World Health Organization (1998). Info Package: Mastering Depression in Primary Care.",
  timeframe: "۲ هفته گذشته",
  timeframe_en: "Last 2 weeks",
  items: [
    { id: 1, text: "احساس شادی و روحیه خوب داشتم", text_en: "I have felt cheerful and in good spirits" },
    { id: 2, text: "احساس آرامش و راحتی داشتم", text_en: "I have felt calm and relaxed" },
    { id: 3, text: "احساس فعال بودن و پرانرژی بودن داشتم", text_en: "I have felt active and vigorous" },
    { id: 4, text: "با احساس تازگی و استراحت‌کافی از خواب بیدار شدم", text_en: "I woke up feeling fresh and rested" },
    { id: 5, text: "زندگی روزمره‌ام سرشار از چیزهای جالب برای من بود", text_en: "My daily life has been filled with things that interest me" },
  ],
};

// Personal Self-Reported Fatigue & Exhaustion (Self-reflection checklist, NOT standard CBI)
export const BURNOUT: ScreenerMeta = {
  type: "burnout",
  title: "خستگی و فرسودگی خودگزارش‌شده",
  title_en: "Self-Reported Fatigue & Exhaustion",
  subtitle: "ارزیابی شخصی میزان خستگی و تخلیه انرژی در فعالیت‌های روزمره (فرم خودارزیابی شخصی)",
  subtitle_en: "Personal self-reflection on daily exhaustion and fatigue levels (self-monitoring form)",
  scale: 5,
  scaleStart: 0,
  labels: ["هرگز", "به‌ندرت", "گاهی", "اغلب", "همیشه"],
  labels_en: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  higherIsBetter: false,
  isStandardized: false,
  instrumentVersion: "self-report-v1",
  scoringVersion: "descriptive-v1",
  sourceUrl: "",
  sourceCitation: "فرم خودپایشی تجربی برگرفته از نشانه‌های عمومی فرسودگی فردی (فاقد رتبه‌بندی بالینی CBI).",
  timeframe: "روزهای اخیر",
  timeframe_en: "Recent days",
  items: [
    { id: 1, text: "احساس فرسودگی و خستگی مداوم می‌کنم", text_en: "I feel worn out and chronically exhausted" },
    { id: 2, text: "از نظر جسمی احساس تخلیه انرژی دارم", text_en: "I feel physically exhausted" },
    { id: 3, text: "از نظر هیجانی و روانی احساس تخلیه انرژی دارم", text_en: "I feel emotionally exhausted" },
    { id: 4, text: "با خود فکر می‌کنم: «دیگر توان ادامه ندارم»", text_en: "I think to myself: 'I cannot take it anymore'" },
    { id: 5, text: "احساس فرسایش و آسیب‌پذیری انرژی می‌کنم", text_en: "I feel depleted and vulnerable" },
    { id: 6, text: "صبح‌ها با احساس خستگی و بی‌رمقی از خواب بیدار می‌شوم", text_en: "I wake up in the morning lacking energy" },
  ],
};

export const SCREENERS: Record<ScreenerType, ScreenerMeta> = {
  phq9: PHQ9,
  gad7: GAD7,
  who5: WHO5,
  burnout: BURNOUT,
};

// ---------- Answer Validation ----------

export interface ScreenerValidationResult {
  isValid: boolean;
  isComplete: boolean;
  answeredCount: number;
  totalCount: number;
  errors: string[];
  cleanAnswers: Record<number, number>;
}

export function validateScreenerAnswers(
  type: ScreenerType,
  answers: Record<number, any>
): ScreenerValidationResult {
  const meta = SCREENERS[type];
  if (!meta) {
    return {
      isValid: false,
      isComplete: false,
      answeredCount: 0,
      totalCount: 0,
      errors: ["نوع آزمون نامعتبر است."],
      cleanAnswers: {},
    };
  }

  const cleanAnswers: Record<number, number> = {};
  const errors: string[] = [];
  let answeredCount = 0;

  const minVal = meta.scaleStart;
  const maxVal = meta.scaleStart + meta.scale - 1;

  for (const item of meta.items) {
    const rawVal = answers[item.id];
    if (rawVal === undefined || rawVal === null || rawVal === "") {
      // Unanswered item
      continue;
    }

    const num = Number(rawVal);
    if (isNaN(num) || !Number.isInteger(num)) {
      errors.push(`پاسخ سؤال ${item.id} باید عدد صحیح باشد.`);
      continue;
    }

    if (num < minVal || num > maxVal) {
      errors.push(`پاسخ سؤال ${item.id} خارج از محدوده مجاز (${minVal} تا ${maxVal}) است.`);
      continue;
    }

    cleanAnswers[item.id] = num;
    answeredCount++;
  }

  const isComplete = answeredCount === meta.items.length;
  const isValid = errors.length === 0;

  return {
    isValid,
    isComplete,
    answeredCount,
    totalCount: meta.items.length,
    errors,
    cleanAnswers,
  };
}

// ---------- Scoring & Interpretation ----------

export interface ScreenerResult {
  raw: number | null; // null if incomplete
  normalized: number | null; // 0..100 for comparability, or null if incomplete
  severity: "minimal" | "mild" | "moderate" | "moderately_severe" | "severe" | "good" | "low" | "incomplete";
  severityLabel: string;
  severityLabel_en: string;
  recommendation: string;
  recommendation_en: string;
  flags: string[]; // e.g. ["suicidal_ideation"] for PHQ-9 item 9
  isComplete: boolean;
  answeredCount: number;
  totalCount: number;
  instrumentVersion: string;
  scoringVersion: string;
  sourceUrl: string;
  sourceCitation: string;
  timeframe: string;
  timeframe_en: string;
}

export function scoreScreener(
  type: ScreenerType,
  answers: Record<number, any>
): ScreenerResult {
  const meta = SCREENERS[type];
  const validation = validateScreenerAnswers(type, answers);
  const flags: string[] = [];

  // Critical Safety Rule: PHQ-9 Item 9 (thoughts of self-harm / suicide)
  // Must be checked independently of completeness or total score!
  if (type === "phq9") {
    const item9Val = validation.cleanAnswers[9];
    if (item9Val !== undefined && item9Val >= 1) {
      flags.push("suicidal_ideation");
    }
  }

  // If incomplete or invalid, do NOT issue a valid clinical score!
  if (!validation.isValid || !validation.isComplete) {
    return {
      raw: null,
      normalized: null,
      severity: "incomplete",
      severityLabel: "تکمیل‌نشده (بدون نمره معتبر)",
      severityLabel_en: "Incomplete (No valid score)",
      recommendation: "برای دریافت نتیجه معتبر و قابل استناد، لطفاً تمام سؤالات این ابزار را تکمیل کن.",
      recommendation_en: "To receive an interpretable score, please complete all items in this instrument.",
      flags,
      isComplete: false,
      answeredCount: validation.answeredCount,
      totalCount: validation.totalCount,
      instrumentVersion: meta.instrumentVersion,
      scoringVersion: meta.scoringVersion,
      sourceUrl: meta.sourceUrl,
      sourceCitation: meta.sourceCitation,
      timeframe: meta.timeframe,
      timeframe_en: meta.timeframe_en,
    };
  }

  // Sum raw values from validated cleanAnswers
  const values = meta.items.map((it) => validation.cleanAnswers[it.id]);
  const raw = values.reduce((a, b) => a + b, 0);
  const max = meta.items.length * (meta.scale - 1 + meta.scaleStart);
  const normalized = max > 0 ? Math.round((raw / max) * 100) : 0;

  if (type === "phq9") {
    let sev: ScreenerResult["severity"];
    if (raw <= 4) sev = "minimal";
    else if (raw <= 9) sev = "mild";
    else if (raw <= 14) sev = "moderate";
    else if (raw <= 19) sev = "moderately_severe";
    else sev = "severe";

    return {
      raw,
      normalized,
      severity: sev,
      flags,
      severityLabel: PHQ_LABELS[sev],
      severityLabel_en: PHQ_LABELS_EN[sev],
      recommendation: PHQ_RECS[sev],
      recommendation_en: PHQ_RECS_EN[sev],
      isComplete: true,
      answeredCount: validation.answeredCount,
      totalCount: validation.totalCount,
      instrumentVersion: meta.instrumentVersion,
      scoringVersion: meta.scoringVersion,
      sourceUrl: meta.sourceUrl,
      sourceCitation: meta.sourceCitation,
      timeframe: meta.timeframe,
      timeframe_en: meta.timeframe_en,
    };
  }

  if (type === "gad7") {
    let sev: ScreenerResult["severity"];
    if (raw <= 4) sev = "minimal";
    else if (raw <= 9) sev = "mild";
    else if (raw <= 14) sev = "moderate";
    else sev = "severe";

    return {
      raw,
      normalized,
      severity: sev,
      flags,
      severityLabel: GAD_LABELS[sev as keyof typeof GAD_LABELS],
      severityLabel_en: GAD_LABELS_EN[sev as keyof typeof GAD_LABELS_EN],
      recommendation: GAD_RECS[sev as keyof typeof GAD_RECS],
      recommendation_en: GAD_RECS_EN[sev as keyof typeof GAD_RECS_EN],
      isComplete: true,
      answeredCount: validation.answeredCount,
      totalCount: validation.totalCount,
      instrumentVersion: meta.instrumentVersion,
      scoringVersion: meta.scoringVersion,
      sourceUrl: meta.sourceUrl,
      sourceCitation: meta.sourceCitation,
      timeframe: meta.timeframe,
      timeframe_en: meta.timeframe_en,
    };
  }

  if (type === "who5") {
    // Official WHO-5 score: raw * 4 = 0..100 (Higher = Better Wellbeing)
    const score100 = raw * 4;
    let sev: ScreenerResult["severity"];
    if (score100 >= 70) sev = "good";
    else if (score100 >= 50) sev = "moderate";
    else if (score100 >= 28) sev = "low";
    else sev = "severe";

    if (score100 <= 50) {
      flags.push("possible_depression_screening");
    }

    return {
      raw,
      normalized: score100,
      severity: sev,
      flags,
      severityLabel: WHO_LABELS[sev as keyof typeof WHO_LABELS],
      severityLabel_en: WHO_LABELS_EN[sev as keyof typeof WHO_LABELS_EN],
      recommendation: WHO_RECS[sev as keyof typeof WHO_RECS],
      recommendation_en: WHO_RECS_EN[sev as keyof typeof WHO_RECS_EN],
      isComplete: true,
      answeredCount: validation.answeredCount,
      totalCount: validation.totalCount,
      instrumentVersion: meta.instrumentVersion,
      scoringVersion: meta.scoringVersion,
      sourceUrl: meta.sourceUrl,
      sourceCitation: meta.sourceCitation,
      timeframe: meta.timeframe,
      timeframe_en: meta.timeframe_en,
    };
  }

  // Personal Burnout / Fatigue self-reflection (descriptive, not clinical CBI)
  const pct = Math.round((raw / 24) * 100);
  let sev: ScreenerResult["severity"];
  if (pct < 25) sev = "minimal";
  else if (pct < 50) sev = "mild";
  else if (pct < 75) sev = "moderate";
  else sev = "severe";

  return {
    raw,
    normalized: pct,
    severity: sev,
    flags,
    severityLabel: BURN_LABELS[sev as keyof typeof BURN_LABELS],
    severityLabel_en: BURN_LABELS_EN[sev as keyof typeof BURN_LABELS_EN],
    recommendation: BURN_RECS[sev as keyof typeof BURN_RECS],
    recommendation_en: BURN_RECS_EN[sev as keyof typeof BURN_RECS_EN],
    isComplete: true,
    answeredCount: validation.answeredCount,
    totalCount: validation.totalCount,
    instrumentVersion: meta.instrumentVersion,
    scoringVersion: meta.scoringVersion,
    sourceUrl: meta.sourceUrl,
    sourceCitation: meta.sourceCitation,
    timeframe: meta.timeframe,
    timeframe_en: meta.timeframe_en,
  };
}

export const PHQ_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  moderately_severe: "نسبتاً شدید (۱۵–۱۹)",
  severe: "شدید (۲۰–۲۷)",
  incomplete: "تکمیل‌نشده",
} as const;

export const PHQ_LABELS_EN = {
  minimal: "Minimal (0–4)",
  mild: "Mild (5–9)",
  moderate: "Moderate (10–14)",
  moderately_severe: "Moderately Severe (15–19)",
  severe: "Severe (20–27)",
  incomplete: "Incomplete",
} as const;

export const PHQ_RECS = {
  minimal: "نشانه‌ای از علائم افسردگی گزارش نشده است. پایش خودآگاهی دوره‌ای برای حفظ تعادل توصیه می‌شود.",
  mild: "نشانه‌های خفیف گزارش شده است. تقویت خودمراقبتی، نظم خواب، تحرک بدنی و ثبت Check-in روزانه کمک‌کننده است.",
  moderate: "نشانه‌های متوسط گزارش شده است. گفت‌وگو با یک مشاور یا روان‌شناس برای بررسی شیوه‌های مدیریت استرس و CBT پیشنهاد می‌شود.",
  moderately_severe: "نشانه‌های نسبتاً شدید گزارش شده است. ارزیابی توسط متخصص سلامت روان توصیه می‌شود.",
  severe: "نشانه‌های قابل‌توجه و شدید گزارش شده است. توصیه می‌شود با یک متخصص سلامت روان یا پزشک مشورت کنی.",
  incomplete: "برای ارزیابی کامل، پاسخ به تمام موارد ضروری است.",
} as const;

export const PHQ_RECS_EN = {
  minimal: "Scores indicate minimal or no depressive symptoms reported. Continued routine self-monitoring is supportive.",
  mild: "Mild symptoms reported. Focusing on self-care, restorative sleep routines, and daily check-ins may be beneficial.",
  moderate: "Moderate symptoms reported. Consulting a mental healthcare professional for personalized guidance is recommended.",
  moderately_severe: "Moderately severe symptoms reported. Professional clinical evaluation is recommended.",
  severe: "Notable severe symptoms reported. Reaching out to a healthcare professional or clinical specialist is advised.",
  incomplete: "Please complete all items for an interpretable summary.",
} as const;

export const GAD_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  severe: "شدید (۱۵–۲۱)",
  incomplete: "تکمیل‌نشده",
} as const;

export const GAD_LABELS_EN = {
  minimal: "Minimal (0–4)",
  mild: "Mild (5–9)",
  moderate: "Moderate (10–14)",
  severe: "Severe (15–21)",
  incomplete: "Incomplete",
} as const;

export const GAD_RECS = {
  minimal: "نشانه‌های اضطراب در محدوده حداقلی است.",
  mild: "نشانه‌های خفیف اضطراب. تمرین‌های تنفس آرام‌بخش، grounding و مدیریت زمان و کافئین می‌تواند مفید باشد.",
  moderate: "نشانه‌های متوسط اضطراب. تمرین‌های CBT و استفاده از درخت نگرانی برای تفکیک مسائل قابل اقدام پیشنهاد می‌شود.",
  severe: "نشانه‌های قابل‌توجه اضطراب. مشاوره و بررسی تخصصی توسط کارشناس سلامت روان توصیه می‌شود.",
  incomplete: "برای ارزیابی کامل، پاسخ به تمام موارد ضروری است.",
} as const;

export const GAD_RECS_EN = {
  minimal: "Anxiety symptoms reported are within the minimal range.",
  mild: "Mild anxiety indicators. Calming breath exercises, grounding techniques, and routine pacing can help.",
  moderate: "Moderate anxiety indicators. Evidence-based CBT techniques and structured worry-tree problem solving are suggested.",
  severe: "Notable anxiety indicators. Professional consultation with a healthcare specialist is advised.",
  incomplete: "Please complete all items for an interpretable summary.",
} as const;

export const WHO_LABELS = {
  good: "مطلوب و مناسب (≥۷۰)",
  moderate: "متوسط و قابل‌قبول (۵۰–۶۹)",
  low: "پایین (۲۸–۴۹)",
  severe: "خیلی پایین (<۲۸)",
  incomplete: "تکمیل‌نشده",
} as const;

export const WHO_LABELS_EN = {
  good: "Optimal / Good (≥70)",
  moderate: "Acceptable / Moderate (50–69)",
  low: "Low Wellbeing (28–49)",
  severe: "Very Low Wellbeing (<28)",
  incomplete: "Incomplete",
} as const;

export const WHO_RECS = {
  good: "رفاه ذهنی و شادابی در سطح مطلوب ارزیابی می‌شود. ادامه عادات و مراقبت‌های مثبت فعلی پیشنهاد می‌شود.",
  moderate: "رفاه ذهنی در سطح قابل قبول است. توجه به فعالیت‌های انرژی‌بخش و تعادل کار و زندگی کمک‌کننده است.",
  low: "شاخص رفاه ذهنی نشان‌دهنده کاهش نشاط و شادابی است. ارزیابی با ابزار PHQ-9 و توجه بیشتر به خواب و استراحت توصیه می‌شود.",
  severe: "شاخص رفاه ذهنی بسیار پایین است. توصیه می‌شود با یک متخصص یا مشاور سلامت روان درباره وضعیت خود صحبت کنی.",
  incomplete: "برای محاسبه نمره، پاسخ به تمام سوالات لازم است.",
} as const;

export const WHO_RECS_EN = {
  good: "Mental wellbeing and vitality are evaluated at an optimal level. Maintaining current positive routines is encouraged.",
  moderate: "Wellbeing is within an acceptable range. Prioritizing restful activities and work-life balance can help.",
  low: "Wellbeing index indicates reduced vitality. Taking the PHQ-9 screening and reviewing sleep/rest routines is suggested.",
  severe: "Wellbeing index is notably low. Speaking with a mental health professional or counselor is recommended.",
  incomplete: "Please complete all items to calculate the index.",
} as const;

export const BURN_LABELS = {
  minimal: "خستگی حداقلی",
  mild: "نشانه‌های خستگی اولیه",
  moderate: "خستگی متوسط",
  severe: "خستگی و فرسودگی بالا",
  incomplete: "تکمیل‌نشده",
} as const;

export const BURN_LABELS_EN = {
  minimal: "Minimal Fatigue",
  mild: "Early Fatigue Signs",
  moderate: "Moderate Fatigue",
  severe: "High Fatigue / Exhaustion",
  incomplete: "Incomplete",
} as const;

export const BURN_RECS = {
  minimal: "میزان خستگی در حد معمول است. حفظ مرزهای کاری و استراحت روزانه توصیه می‌شود.",
  mild: "نشانه‌هایی از افت انرژی و خستگی دیده می‌شود. بازنگری در ساعات کاری و زمان‌های خواب و استراحت مفید است.",
  moderate: "سطح خستگی نیاز به توجه دارد. استراحت کوتاه، کاهش موقت فشار کار و کمک گرفتن از دیگران پیشنهاد می‌شود.",
  severe: "سطح گزارش‌شده خستگی بالاست. استراحت جدی، تغییر در حجم فعالیت‌ها و مشورت با مشاور برای بازیابی انرژی ضروری است.",
  incomplete: "برای ارزیابی کامل، پاسخ به تمام موارد ضروری است.",
} as const;

export const BURN_RECS_EN = {
  minimal: "Fatigue reported is at a minimal everyday level. Maintain restorative boundaries.",
  mild: "Early fatigue signs noted. Reviewing workload, sleep consistency, and recovery windows is suggested.",
  moderate: "Fatigue level calls for conscious attention. Consider a brief break, workload adjustment, and pacing.",
  severe: "High exhaustion reported. Dedicated rest, workload recalibration, and consultation with a counselor are advised.",
  incomplete: "Please complete all items for a full reflection.",
} as const;

export function severityColor(sev: ScreenerResult["severity"]): string {
  switch (sev) {
    case "minimal":
    case "good":
      return "hsl(142 70% 45%)";
    case "mild":
    case "moderate":
    case "low":
      return "hsl(40 90% 55%)";
    case "moderately_severe":
      return "hsl(20 90% 55%)";
    case "severe":
      return "hsl(0 80% 55%)";
    case "incomplete":
    default:
      return "hsl(var(--muted-foreground))";
  }
}
