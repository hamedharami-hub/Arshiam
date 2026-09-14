// Validated brief mental-health screeners (Persian).
// Items are simplified plain-language renderings of public-domain scales
// for self-monitoring only — NOT diagnostic. Always pair with clinical advice.

export type ScreenerType = "phq9" | "gad7" | "who5" | "burnout";

export interface ScreenerItem { id: number; text: string; text_en?: string; reverse?: boolean; }

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
}

// PHQ-9 — Depression (0..3, 9 items, range 0..27)
export const PHQ9: ScreenerMeta = {
  type: "phq9",
  title: "PHQ-9 — افسردگی",
  title_en: "PHQ-9 — Depression Screener",
  subtitle: "در ۲ هفته گذشته چقدر این مشکلات تو را اذیت کرده؟",
  subtitle_en: "Over the last 2 weeks, how often have you been bothered by any of the following?",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر روزها", "تقریباً هر روز"],
  labels_en: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "کم‌علاقگی یا بی‌میلی به انجام کارها", text_en: "Little interest or pleasure in doing things" },
    { id: 2, text: "احساس غم، افسردگی یا ناامیدی", text_en: "Feeling down, depressed, or hopeless" },
    { id: 3, text: "مشکل در خواب: کم خوابیدن، زیاد خوابیدن یا ادامه‌ندادن خواب", text_en: "Trouble falling or staying asleep, or sleeping too much" },
    { id: 4, text: "احساس خستگی یا کم‌انرژی بودن", text_en: "Feeling tired or having little energy" },
    { id: 5, text: "بی‌اشتهایی یا پرخوری", text_en: "Poor appetite or overeating" },
    { id: 6, text: "احساس بد دربارهٔ خود — شکست، یا ناامید کردن خود/خانواده", text_en: "Feeling bad about yourself — or that you are a failure or have let yourself or your family down" },
    { id: 7, text: "مشکل در تمرکز روی چیزها (مطالعه، تلویزیون، گفت‌وگو)", text_en: "Trouble concentrating on things, such as reading or conversations" },
    { id: 8, text: "آهسته بودن حرکات/گفتار، یا برعکس بی‌قراری شدید", text_en: "Moving or speaking slowly, or being unusually fidgety or restless" },
    { id: 9, text: "افکاری دربارهٔ اینکه بهتر است نباشی یا به خود آسیب بزنی", text_en: "Thoughts that you would be better off dead, or of hurting yourself" },
  ],
};

// GAD-7 — Anxiety (0..3, 7 items, range 0..21)
export const GAD7: ScreenerMeta = {
  type: "gad7",
  title: "GAD-7 — اضطراب",
  title_en: "GAD-7 — Anxiety Screener",
  subtitle: "در ۲ هفته گذشته چقدر این علائم را تجربه کردی؟",
  subtitle_en: "Over the last 2 weeks, how often have you been bothered by the following problems?",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر روزها", "تقریباً هر روز"],
  labels_en: ["Not at all", "Several days", "More than half the days", "Nearly every day"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "احساس عصبانیت، اضطراب یا لبه‌ای بودن", text_en: "Feeling nervous, anxious, or on edge" },
    { id: 2, text: "ناتوانی در توقف یا کنترل نگرانی", text_en: "Not being able to stop or control worrying" },
    { id: 3, text: "نگرانی بیش از حد دربارهٔ موضوعات مختلف", text_en: "Worrying too much about different things" },
    { id: 4, text: "مشکل در آرام شدن", text_en: "Trouble relaxing" },
    { id: 5, text: "بی‌قراری به‌حدی که نشستن سخت می‌شود", text_en: "Being so restless that it's hard to sit still" },
    { id: 6, text: "زود رنجیدن یا تحریک‌پذیری", text_en: "Becoming easily annoyed or irritable" },
    { id: 7, text: "ترس از اینکه اتفاق بدی بیفتد", text_en: "Feeling afraid, as if something awful might happen" },
  ],
};

// WHO-5 — Wellbeing (0..5, 5 items, raw 0..25 → ×4 = 0..100)
export const WHO5: ScreenerMeta = {
  type: "who5",
  title: "WHO-5 — رفاه ذهنی",
  title_en: "WHO-5 — Wellbeing Index",
  subtitle: "در ۲ هفته گذشته…",
  subtitle_en: "Over the past 2 weeks…",
  scale: 6,
  scaleStart: 0,
  labels: ["هیچ‌وقت", "بعضی‌اوقات", "کمتر از نیم", "بیشتر از نیم", "بیشتر اوقات", "همیشه"],
  labels_en: ["At no time", "Some of the time", "Less than half", "More than half", "Most of the time", "All of the time"],
  higherIsBetter: true,
  items: [
    { id: 1, text: "احساس شادی و سرزندگی کردم", text_en: "I have felt cheerful and in good spirits" },
    { id: 2, text: "احساس آرامش و راحتی کردم", text_en: "I have felt calm and relaxed" },
    { id: 3, text: "احساس فعال و پرانرژی بودن کردم", text_en: "I have felt active and vigorous" },
    { id: 4, text: "هنگام بیدار شدن احساس تازگی و آمادگی داشتم", text_en: "I woke up feeling fresh and rested" },
    { id: 5, text: "زندگی روزمره‌ام پر از چیزهای جالب بود", text_en: "My daily life has been filled with things that interest me" },
  ],
};

// Burnout (Copenhagen-style 6-item personal burnout, 0..4, range 0..24)
export const BURNOUT: ScreenerMeta = {
  type: "burnout",
  title: "Burnout — فرسودگی شخصی",
  title_en: "Burnout — Personal Exhaustion",
  subtitle: "چقدر این تجربه را در زندگی روزمره داری؟",
  subtitle_en: "How often do you experience these in your daily routine?",
  scale: 5,
  scaleStart: 0,
  labels: ["هرگز", "به‌ندرت", "گاهی", "اغلب", "همیشه"],
  labels_en: ["Never", "Rarely", "Sometimes", "Often", "Always"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "احساس فرسودگی و خستگی مزمن می‌کنم", text_en: "I feel worn out and chronically exhausted" },
    { id: 2, text: "از نظر جسمی تخلیه‌ام", text_en: "I am physically exhausted" },
    { id: 3, text: "از نظر هیجانی تخلیه‌ام", text_en: "I am emotionally exhausted" },
    { id: 4, text: "فکر می‌کنم: «دیگر تحمل ندارم»", text_en: "I think: 'I cannot take it anymore'" },
    { id: 5, text: "ضعف و آسیب‌پذیری احساس می‌کنم", text_en: "I feel vulnerable and depleted" },
    { id: 6, text: "صبح‌ها بدون انرژی از خواب بیدار می‌شوم", text_en: "I wake up in the morning lacking energy" },
  ],
};

export const SCREENERS: Record<ScreenerType, ScreenerMeta> = {
  phq9: PHQ9, gad7: GAD7, who5: WHO5, burnout: BURNOUT,
};

// ---------- Scoring & interpretation ----------

export interface ScreenerResult {
  raw: number;            // sum of raw answers
  normalized: number;     // 0..100 for comparability
  severity: "minimal" | "mild" | "moderate" | "moderately_severe" | "severe" | "good" | "low" | "high";
  severityLabel: string;
  severityLabel_en: string;
  recommendation: string;
  recommendation_en: string;
  flags: string[];        // e.g. ["suicidal_ideation"] for PHQ-9 item 9
}

export function scoreScreener(type: ScreenerType, answers: Record<number, number>): ScreenerResult {
  const meta = SCREENERS[type];
  const values = meta.items.map((it) => Number(answers[it.id] ?? 0));
  const raw = values.reduce((a, b) => a + b, 0);
  const max = meta.items.length * (meta.scale - 1 + meta.scaleStart);
  const normalized = max > 0 ? Math.round((raw / max) * 100) : 0;
  const flags: string[] = [];

  if (type === "phq9") {
    if ((answers[9] ?? 0) >= 1) flags.push("suicidal_ideation");
    let sev: ScreenerResult["severity"];
    if (raw <= 4) sev = "minimal";
    else if (raw <= 9) sev = "mild";
    else if (raw <= 14) sev = "moderate";
    else if (raw <= 19) sev = "moderately_severe";
    else sev = "severe";
    return {
      raw, normalized, severity: sev, flags,
      severityLabel: PHQ_LABELS[sev],
      severityLabel_en: PHQ_LABELS_EN[sev],
      recommendation: PHQ_RECS[sev],
      recommendation_en: PHQ_RECS_EN[sev],
    };
  }
  if (type === "gad7") {
    let sev: ScreenerResult["severity"];
    if (raw <= 4) sev = "minimal";
    else if (raw <= 9) sev = "mild";
    else if (raw <= 14) sev = "moderate";
    else sev = "severe";
    return {
      raw, normalized, severity: sev, flags,
      severityLabel: GAD_LABELS[sev as keyof typeof GAD_LABELS],
      severityLabel_en: GAD_LABELS_EN[sev as keyof typeof GAD_LABELS_EN],
      recommendation: GAD_RECS[sev as keyof typeof GAD_RECS],
      recommendation_en: GAD_RECS_EN[sev as keyof typeof GAD_RECS_EN],
    };
  }
  if (type === "who5") {
    const score100 = raw * 4; // standard WHO-5 *4
    let sev: ScreenerResult["severity"];
    if (score100 >= 70) sev = "good";
    else if (score100 >= 50) sev = "moderate";
    else if (score100 >= 28) sev = "low";
    else sev = "severe";
    if (score100 <= 50) flags.push("possible_depression_screening");
    return {
      raw, normalized: score100, severity: sev, flags,
      severityLabel: WHO_LABELS[sev as keyof typeof WHO_LABELS],
      severityLabel_en: WHO_LABELS_EN[sev as keyof typeof WHO_LABELS_EN],
      recommendation: WHO_RECS[sev as keyof typeof WHO_RECS],
      recommendation_en: WHO_RECS_EN[sev as keyof typeof WHO_RECS_EN],
    };
  }
  // burnout: 0..24 → ×100/24
  const pct = Math.round((raw / 24) * 100);
  let sev: ScreenerResult["severity"];
  if (pct < 25) sev = "minimal";
  else if (pct < 50) sev = "mild";
  else if (pct < 75) sev = "moderate";
  else sev = "severe";
  return {
    raw, normalized: pct, severity: sev, flags,
    severityLabel: BURN_LABELS[sev as keyof typeof BURN_LABELS],
    severityLabel_en: BURN_LABELS_EN[sev as keyof typeof BURN_LABELS_EN],
    recommendation: BURN_RECS[sev as keyof typeof BURN_RECS],
    recommendation_en: BURN_RECS_EN[sev as keyof typeof BURN_RECS_EN],
  };
}

export const PHQ_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  moderately_severe: "نسبتاً شدید (۱۵–۱۹)",
  severe: "شدید (۲۰–۲۷)",
} as const;

export const PHQ_LABELS_EN = {
  minimal: "Minimal (0–4)",
  mild: "Mild (5–9)",
  moderate: "Moderate (10–14)",
  moderately_severe: "Moderately Severe (15–19)",
  severe: "Severe (20–27)",
} as const;

export const PHQ_RECS = {
  minimal: "نشانه‌ای از افسردگی نیست. ادامهٔ ردیابی هفتگی کافی است.",
  mild: "علائم خفیف. خودمراقبتی، خواب منظم، فعالیت بدنی و Check-in روزانه را تقویت کن.",
  moderate: "علائم متوسط. مشاوره حرفه‌ای را در نظر بگیر. CBT و رفتار-فعال‌سازی را شروع کن.",
  moderately_severe: "علائم نسبتاً شدید. مراجعه به متخصص توصیه می‌شود.",
  severe: "علائم شدید. لطفاً همین حالا با یک متخصص یا خط بحران تماس بگیر.",
} as const;

export const PHQ_RECS_EN = {
  minimal: "Scores indicate minimal or no depressive symptoms. Weekly self-tracking is recommended.",
  mild: "Mild symptoms. Emphasize self-care, consistent sleep routines, physical activity, and daily check-ins.",
  moderate: "Moderate symptoms. Consider consulting a mental healthcare professional. Engage in CBT exercises and behavioral activation.",
  moderately_severe: "Moderately severe symptoms. Clinical evaluation by a qualified specialist is strongly advised.",
  severe: "Severe symptoms. Please reach out to a healthcare professional or crisis helpline right away.",
} as const;

export const GAD_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  severe: "شدید (۱۵–۲۱)",
} as const;

export const GAD_LABELS_EN = {
  minimal: "Minimal (0–4)",
  mild: "Mild (5–9)",
  moderate: "Moderate (10–14)",
  severe: "Severe (15–21)",
} as const;

export const GAD_RECS = {
  minimal: "اضطراب در محدوده طبیعی است.",
  mild: "اضطراب خفیف. تمرینات تنفس، grounding و کاهش کافئین کمک می‌کند.",
  moderate: "اضطراب متوسط. CBT برای اضطراب و ابزار Worry/Problem-Solving را امتحان کن.",
  severe: "اضطراب شدید. مشاوره حرفه‌ای و در صورت نیاز ارزیابی دارویی توصیه می‌شود.",
} as const;

export const GAD_RECS_EN = {
  minimal: "Anxiety levels appear within normal limits.",
  mild: "Mild anxiety symptoms. Deep breathing exercises, grounding techniques, and caffeine moderation may be beneficial.",
  moderate: "Moderate anxiety symptoms. Consider evidence-based CBT interventions and using the Worry Tree problem-solver.",
  severe: "Severe anxiety symptoms. Professional assessment and clinical evaluation are recommended.",
} as const;

export const WHO_LABELS = {
  good: "خوب (≥۷۰)",
  moderate: "متوسط (۵۰–۶۹)",
  low: "پایین (۲۸–۴۹)",
  severe: "خیلی پایین (<۲۸)",
} as const;

export const WHO_LABELS_EN = {
  good: "Good (≥70)",
  moderate: "Moderate (50–69)",
  low: "Low (28–49)",
  severe: "Very Low (<28)",
} as const;

export const WHO_RECS = {
  good: "رفاه ذهنی در سطح مطلوب.",
  moderate: "رفاه قابل قبول. عادات مثبت موجود را حفظ کن.",
  low: "رفاه پایین. PHQ-9 را هم بگیر و Check-in روزانه را جدی‌تر کن.",
  severe: "رفاه خیلی پایین. حتماً PHQ-9 را بگیر و در صورت لزوم با متخصص صحبت کن.",
} as const;

export const WHO_RECS_EN = {
  good: "Mental wellbeing is at a thriving, optimal level.",
  moderate: "Acceptable wellbeing. Maintain existing positive habits and restorative activities.",
  low: "Low wellbeing. Consider completing the PHQ-9 screening and maintaining daily check-ins.",
  severe: "Very low wellbeing. We recommend taking the PHQ-9 screening and speaking with a counselor.",
} as const;

export const BURN_LABELS = {
  minimal: "بدون فرسودگی",
  mild: "نشانه‌های اولیه",
  moderate: "فرسودگی متوسط",
  severe: "فرسودگی شدید",
} as const;

export const BURN_LABELS_EN = {
  minimal: "No Burnout",
  mild: "Early Warning Signs",
  moderate: "Moderate Burnout",
  severe: "Severe Burnout",
} as const;

export const BURN_RECS = {
  minimal: "وضعیت سالم. مرز کار/استراحت را حفظ کن.",
  mild: "نشانه‌های اولیه. ساعات کار، خواب و فعالیت ترمیمی را بازنگری کن.",
  moderate: "فرسودگی متوسط. مرخصی کوتاه، کاهش بار کاری و حمایت اجتماعی لازم است.",
  severe: "فرسودگی شدید. تغییر ساختاری و کمک حرفه‌ای ضروری است.",
} as const;

export const BURN_RECS_EN = {
  minimal: "Healthy state. Maintain clear boundaries between work and rest.",
  mild: "Early indicators. Review work hours, sleep routines, and dedicated recovery periods.",
  moderate: "Moderate exhaustion. A brief break, workload reduction, and social support are strongly indicated.",
  severe: "Severe burnout. Structural lifestyle adjustments and professional guidance are essential.",
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
    case "high":
      return "hsl(0 80% 55%)";
  }
}
