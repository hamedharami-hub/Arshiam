// Validated brief mental-health screeners (Persian).
// Items are simplified plain-language renderings of public-domain scales
// for self-monitoring only — NOT diagnostic. Always pair with clinical advice.

export type ScreenerType = "phq9" | "gad7" | "who5" | "burnout";

export interface ScreenerItem { id: number; text: string; reverse?: boolean; }

export interface ScreenerMeta {
  type: ScreenerType;
  title: string;
  subtitle: string;
  scale: number; // number of options (e.g. 4 for 0..3)
  scaleStart: 0 | 1; // smallest value
  labels: string[]; // length === scale
  items: ScreenerItem[];
  // Higher is worse for distress scales, higher is better for wellbeing.
  higherIsBetter: boolean;
}

// PHQ-9 — Depression (0..3, 9 items, range 0..27)
export const PHQ9: ScreenerMeta = {
  type: "phq9",
  title: "PHQ-9 — افسردگی",
  subtitle: "در ۲ هفته گذشته چقدر این مشکلات تو را اذیت کرده؟",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر روزها", "تقریباً هر روز"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "کم‌علاقگی یا بی‌میلی به انجام کارها" },
    { id: 2, text: "احساس غم، افسردگی یا ناامیدی" },
    { id: 3, text: "مشکل در خواب: کم خوابیدن، زیاد خوابیدن یا ادامه‌ندادن خواب" },
    { id: 4, text: "احساس خستگی یا کم‌انرژی بودن" },
    { id: 5, text: "بی‌اشتهایی یا پرخوری" },
    { id: 6, text: "احساس بد دربارهٔ خود — شکست، یا ناامید کردن خود/خانواده" },
    { id: 7, text: "مشکل در تمرکز روی چیزها (مطالعه، تلویزیون، گفت‌وگو)" },
    { id: 8, text: "آهسته بودن حرکات/گفتار، یا برعکس بی‌قراری شدید" },
    { id: 9, text: "افکاری دربارهٔ اینکه بهتر است نباشی یا به خود آسیب بزنی" },
  ],
};

// GAD-7 — Anxiety (0..3, 7 items, range 0..21)
export const GAD7: ScreenerMeta = {
  type: "gad7",
  title: "GAD-7 — اضطراب",
  subtitle: "در ۲ هفته گذشته چقدر این علائم را تجربه کردی؟",
  scale: 4,
  scaleStart: 0,
  labels: ["اصلاً", "چند روز", "بیشتر روزها", "تقریباً هر روز"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "احساس عصبانیت، اضطراب یا لبه‌ای بودن" },
    { id: 2, text: "ناتوانی در توقف یا کنترل نگرانی" },
    { id: 3, text: "نگرانی بیش از حد دربارهٔ موضوعات مختلف" },
    { id: 4, text: "مشکل در آرام شدن" },
    { id: 5, text: "بی‌قراری به‌حدی که نشستن سخت می‌شود" },
    { id: 6, text: "زود رنجیدن یا تحریک‌پذیری" },
    { id: 7, text: "ترس از اینکه اتفاق بدی بیفتد" },
  ],
};

// WHO-5 — Wellbeing (0..5, 5 items, raw 0..25 → ×4 = 0..100)
export const WHO5: ScreenerMeta = {
  type: "who5",
  title: "WHO-5 — رفاه ذهنی",
  subtitle: "در ۲ هفته گذشته…",
  scale: 6,
  scaleStart: 0,
  labels: ["هیچ‌وقت", "بعضی‌اوقات", "کمتر از نیم", "بیشتر از نیم", "بیشتر اوقات", "همیشه"],
  higherIsBetter: true,
  items: [
    { id: 1, text: "احساس شادی و سرزندگی کردم" },
    { id: 2, text: "احساس آرامش و راحتی کردم" },
    { id: 3, text: "احساس فعال و پرانرژی بودن کردم" },
    { id: 4, text: "هنگام بیدار شدن احساس تازگی و آمادگی داشتم" },
    { id: 5, text: "زندگی روزمره‌ام پر از چیزهای جالب بود" },
  ],
};

// Burnout (Copenhagen-style 6-item personal burnout, 0..4, range 0..24)
export const BURNOUT: ScreenerMeta = {
  type: "burnout",
  title: "Burnout — فرسودگی شخصی",
  subtitle: "چقدر این تجربه را در زندگی روزمره داری؟",
  scale: 5,
  scaleStart: 0,
  labels: ["هرگز", "به‌ندرت", "گاهی", "اغلب", "همیشه"],
  higherIsBetter: false,
  items: [
    { id: 1, text: "احساس فرسودگی و خستگی مزمن می‌کنم" },
    { id: 2, text: "از نظر جسمی تخلیه‌ام" },
    { id: 3, text: "از نظر هیجانی تخلیه‌ام" },
    { id: 4, text: "فکر می‌کنم: «دیگر تحمل ندارم»" },
    { id: 5, text: "ضعف و آسیب‌پذیری احساس می‌کنم" },
    { id: 6, text: "صبح‌ها بدون انرژی از خواب بیدار می‌شوم" },
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
  recommendation: string;
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
      recommendation: PHQ_RECS[sev],
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
      recommendation: GAD_RECS[sev as keyof typeof GAD_RECS],
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
      recommendation: WHO_RECS[sev as keyof typeof WHO_RECS],
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
    recommendation: BURN_RECS[sev as keyof typeof BURN_RECS],
  };
}

const PHQ_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  moderately_severe: "نسبتاً شدید (۱۵–۱۹)",
  severe: "شدید (۲۰–۲۷)",
} as const;
const PHQ_RECS = {
  minimal: "نشانه‌ای از افسردگی نیست. ادامهٔ ردیابی هفتگی کافی است.",
  mild: "علائم خفیف. خودمراقبتی، خواب منظم، فعالیت بدنی و Check-in روزانه را تقویت کن.",
  moderate: "علائم متوسط. مشاوره حرفه‌ای را در نظر بگیر. CBT و رفتار-فعال‌سازی را شروع کن.",
  moderately_severe: "علائم نسبتاً شدید. مراجعه به متخصص توصیه می‌شود.",
  severe: "علائم شدید. لطفاً همین حالا با یک متخصص یا خط بحران تماس بگیر.",
} as const;

const GAD_LABELS = {
  minimal: "حداقلی (۰–۴)",
  mild: "خفیف (۵–۹)",
  moderate: "متوسط (۱۰–۱۴)",
  severe: "شدید (۱۵–۲۱)",
} as const;
const GAD_RECS = {
  minimal: "اضطراب در محدوده طبیعی است.",
  mild: "اضطراب خفیف. تمرینات تنفس، grounding و کاهش کافئین کمک می‌کند.",
  moderate: "اضطراب متوسط. CBT برای اضطراب و ابزار Worry/Problem-Solving را امتحان کن.",
  severe: "اضطراب شدید. مشاوره حرفه‌ای و در صورت نیاز ارزیابی دارویی توصیه می‌شود.",
} as const;

const WHO_LABELS = {
  good: "خوب (≥۷۰)",
  moderate: "متوسط (۵۰–۶۹)",
  low: "پایین (۲۸–۴۹)",
  severe: "خیلی پایین (<۲۸)",
} as const;
const WHO_RECS = {
  good: "رفاه ذهنی در سطح مطلوب.",
  moderate: "رفاه قابل قبول. عادات مثبت موجود را حفظ کن.",
  low: "رفاه پایین. PHQ-9 را هم بگیر و Check-in روزانه را جدی‌تر کن.",
  severe: "رفاه خیلی پایین. حتماً PHQ-9 را بگیر و در صورت لزوم با متخصص صحبت کن.",
} as const;

const BURN_LABELS = {
  minimal: "بدون فرسودگی",
  mild: "نشانه‌های اولیه",
  moderate: "فرسودگی متوسط",
  severe: "فرسودگی شدید",
} as const;
const BURN_RECS = {
  minimal: "وضعیت سالم. مرز کار/استراحت را حفظ کن.",
  mild: "نشانه‌های اولیه. ساعات کار، خواب و فعالیت ترمیمی را بازنگری کن.",
  moderate: "فرسودگی متوسط. مرخصی کوتاه، کاهش بار کاری و حمایت اجتماعی لازم است.",
  severe: "فرسودگی شدید. تغییر ساختاری و کمک حرفه‌ای ضروری است.",
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
