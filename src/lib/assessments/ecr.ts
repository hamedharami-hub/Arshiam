// ECR-R (Experiences in Close Relationships-Revised, Fraley et al., 2000) - Bilingual
// 36 items: 18 anxiety + 18 avoidance, 7-point Likert (1=Strongly Disagree .. 7=Strongly Agree).
// Scoring: average per dimension (1..7). Reverse where noted (8 - raw).
// Quadrant cutoffs: Brennan, Clark & Shaver (1998) boundary at 3.5.

export interface EcrItem {
  id: number;
  text: string;
  text_en?: string;
  dim: "anxiety" | "avoidance";
  reverse: boolean;
}

export const ECR_ITEMS: EcrItem[] = [
  // Anxiety (1-18)
  { id: 1, text: "می‌ترسم شریکم دیگر مرا دوست نداشته باشد.", text_en: "I'm afraid that I will lose my partner's love.", dim: "anxiety", reverse: false },
  { id: 2, text: "اغلب نگرانم که شریکم مرا ترک کند.", text_en: "I often worry that my partner will not want to stay with me.", dim: "anxiety", reverse: false },
  { id: 3, text: "نگرانم که به اندازه‌ای که من به شریکم اهمیت می‌دهم، او به من اهمیت ندهد.", text_en: "I worry that romantic partners won't care about me as much as I care about them.", dim: "anxiety", reverse: false },
  { id: 4, text: "وقتی شریکم در دسترس نیست، احساس ناراحتی و بی‌قراری می‌کنم.", text_en: "I feel anxious when romantic partners are not around or unavailable.", dim: "anxiety", reverse: false },
  { id: 5, text: "نیاز دارم به‌طور مکرر اطمینان حاصل کنم که دوستم دارد.", text_en: "I find that my partners don't want to get as close as I would like.", dim: "anxiety", reverse: false },
  { id: 6, text: "اگر نتوانم شریکم را وادار به ابراز علاقه کنم، ناراحت می‌شوم.", text_en: "I get frustrated if romantic partners are not available when I need them.", dim: "anxiety", reverse: false },
  { id: 7, text: "وقتی شریکم با دیگران وقت می‌گذراند، حسادت یا ناامنی می‌کنم.", text_en: "I sometimes feel resentful when my partner spends time with others.", dim: "anxiety", reverse: false },
  { id: 8, text: "نگرانی‌ام درباره روابطم بیشتر از دیگران است.", text_en: "I worry a lot about my relationships compared to other people.", dim: "anxiety", reverse: false },
  { id: 9, text: "ترس از طرد شدن، رفتار من را در رابطه شکل می‌دهد.", text_en: "My desire to be very close sometimes scares people away.", dim: "anxiety", reverse: false },
  { id: 10, text: "گاهی احساس می‌کنم شریکم را با احساساتم دور می‌کنم.", text_en: "I need a lot of reassurance that I am loved by my partner.", dim: "anxiety", reverse: false },
  { id: 11, text: "وقتی پاسخی فوری از شریکم نمی‌گیرم، نگران می‌شوم.", text_en: "If I can't reach my partner, I find myself worrying whether something is wrong.", dim: "anxiety", reverse: false },
  { id: 12, text: "از تنها بودن و تنهایی عاطفی می‌ترسم.", text_en: "I do not often worry about being abandoned.", dim: "anxiety", reverse: true },
  { id: 13, text: "به ندرت نگران رابطه‌ام هستم.", text_en: "I rarely worry about my partner leaving me.", dim: "anxiety", reverse: true },
  { id: 14, text: "اغلب احساس می‌کنم به اطمینان بیشتری از طرف شریکم نیاز دارم.", text_en: "I feel comfortable depending on romantic partners.", dim: "anxiety", reverse: true },
  { id: 15, text: "حتی نشانه‌های کوچک سرد شدن، مرا مضطرب می‌کند.", text_en: "I am hyper-alert to subtle signs that my partner might be cooling down.", dim: "anxiety", reverse: false },
  { id: 16, text: "دوست دارم احساساتم با احساسات شریکم کاملاً همسو باشد.", text_en: "I want to get very close, but I worry about getting hurt.", dim: "anxiety", reverse: false },
  { id: 17, text: "وقتی شریکم سرد رفتار می‌کند، فکر می‌کنم تقصیر من است.", text_en: "When my partner behaves distantly, I automatically assume it is my fault.", dim: "anxiety", reverse: false },
  { id: 18, text: "نیازم به نزدیکی، گاهی شریکم را می‌ترساند.", text_en: "I suspect that my high need for closeness can overwhelm my partner.", dim: "anxiety", reverse: false },

  // Avoidance (19-36)
  { id: 19, text: "ترجیح می‌دهم به شریکم بیش از حد نزدیک نشوم.", text_en: "I prefer not to show a partner how I feel deep down.", dim: "avoidance", reverse: false },
  { id: 20, text: "وقتی شریکم می‌خواهد خیلی نزدیک شود، احساس ناراحتی می‌کنم.", text_en: "I feel uncomfortable when a partner wants to be very close.", dim: "avoidance", reverse: false },
  { id: 21, text: "ابراز احساسات عمیق به شریکم برایم سخت است.", text_en: "I find it difficult to allow myself to depend on romantic partners.", dim: "avoidance", reverse: false },
  { id: 22, text: "ترجیح می‌دهم به دیگران تکیه نکنم.", text_en: "I prefer not to depend on others for emotional support.", dim: "avoidance", reverse: false },
  { id: 23, text: "وابسته شدن برایم دشوار و ناخوشایند است.", text_en: "I am uncomfortable being close to others or depending on them.", dim: "avoidance", reverse: false },
  { id: 24, text: "صحبت درباره مشکلات و دردهایم با شریکم سخت است.", text_en: "I tell my partner just about everything.", dim: "avoidance", reverse: true },
  { id: 25, text: "ترجیح می‌دهم احساساتم را برای خودم نگه دارم.", text_en: "I usually discuss my problems and concerns with my partner.", dim: "avoidance", reverse: true },
  { id: 26, text: "احساس می‌کنم استقلالم از هر چیزی برایم مهم‌تر است.", text_en: "It helps to turn to my partner in times of need.", dim: "avoidance", reverse: true },
  { id: 27, text: "نزدیکی بیش از حد، مرا کلافه و مضطرب می‌کند.", text_en: "I find it relatively easy to get close to my partner.", dim: "avoidance", reverse: true },
  { id: 28, text: "راحت می‌توانم به شریکم نزدیک شوم.", text_en: "I am nervous when partners get too close to me.", dim: "avoidance", reverse: false },
  { id: 29, text: "اعتماد کامل به شریکم برایم آسان است.", text_en: "I feel comfortable sharing my private thoughts and feelings with my partner.", dim: "avoidance", reverse: true },
  { id: 30, text: "از ابراز محبت صمیمانه ابایی ندارم.", text_en: "I am very comfortable being affectionate with my partner.", dim: "avoidance", reverse: true },
  { id: 31, text: "وقتی به کمک نیاز دارم، به‌راحتی به شریکم می‌گویم.", text_en: "It is easy for me to be emotionally open with my partner.", dim: "avoidance", reverse: true },
  { id: 32, text: "صمیمیت عاطفی، احساس امنیت به من می‌دهد.", text_en: "Emotional intimacy gives me deep peace and grounding.", dim: "avoidance", reverse: true },
  { id: 33, text: "از در آغوش گرفته شدن و صمیمیت فیزیکی لذت می‌برم.", text_en: "I naturally enjoy physical warmth and emotional embraces.", dim: "avoidance", reverse: true },
  { id: 34, text: "احساسات منفی‌ام را با شریکم به اشتراک می‌گذارم.", text_en: "I talk things over with my partner when I feel frustrated.", dim: "avoidance", reverse: true },
  { id: 35, text: "ترجیح می‌دهم خودم مشکلاتم را حل کنم تا کمک بخواهم.", text_en: "I prefer to tackle all hardships alone rather than ask for assistance.", dim: "avoidance", reverse: false },
  { id: 36, text: "اظهار آسیب‌پذیری و ضعف برایم بسیار دشوار است.", text_en: "Showing vulnerability or weakness feels intolerable for me.", dim: "avoidance", reverse: false },
];

export interface EcrScores {
  anxiety: number;
  avoidance: number;
}

export function scoreEcr(responses: Record<number, number>): EcrScores {
  let aSum = 0, aN = 0, vSum = 0, vN = 0;
  for (const item of ECR_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw !== "number") continue;
    const v = item.reverse ? 8 - raw : raw;
    if (item.dim === "anxiety") {
      aSum += v;
      aN++;
    } else {
      vSum += v;
      vN++;
    }
  }
  return {
    anxiety: aN ? +(aSum / aN).toFixed(2) : 0,
    avoidance: vN ? +(vSum / vN).toFixed(2) : 0,
  };
}

export type AttachmentQuadrant = "secure" | "preoccupied" | "dismissive" | "fearful";

export function attachmentQuadrant(s: EcrScores): AttachmentQuadrant {
  const lowAnx = s.anxiety < 3.5;
  const lowAvo = s.avoidance < 3.5;
  if (lowAnx && lowAvo) return "secure";
  if (!lowAnx && lowAvo) return "preoccupied";
  if (lowAnx && !lowAvo) return "dismissive";
  return "fearful";
}

export const QUADRANT_LABELS: Record<AttachmentQuadrant, string> = {
  secure: "ایمن (Secure)",
  preoccupied: "مضطرب-دل‌مشغول (Anxious-Preoccupied)",
  dismissive: "اجتنابی-بی‌اعتنا (Dismissive-Avoidant)",
  fearful: "اجتنابی-ترس‌خورده (Fearful-Avoidant)",
};

export const QUADRANT_LABELS_EN: Record<AttachmentQuadrant, string> = {
  secure: "Secure",
  preoccupied: "Anxious-Preoccupied",
  dismissive: "Dismissive-Avoidant",
  fearful: "Fearful-Avoidant",
};

export interface QuadrantProfile {
  titleFa: string;
  titleEn: string;
  summaryFa: string;
  summaryEn: string;
  strengthsFa: string[];
  strengthsEn: string[];
  triggersFa: string[];
  triggersEn: string[];
  regulationTipFa: string;
  regulationTipEn: string;
  recommendedPracticeFa: string;
  recommendedPracticeEn: string;
}

export const QUADRANT_PROFILES: Record<AttachmentQuadrant, QuadrantProfile> = {
  secure: {
    titleFa: "سبک دلبستگی ایمن (Secure)",
    titleEn: "Secure Attachment Style",
    summaryFa: "شما صمیمیت و استقلال را در تعادلی سالم زیست می‌کنید؛ با ابراز احساسات راحتید، تعارضات را بدون فاجعه‌سازی حل می‌کنید و به روابط به عنوان منبع آرامش نگاه می‌کنید.",
    summaryEn: "You experience emotional closeness and autonomy in healthy harmony; you communicate feelings clearly and handle conflict without catastrophizing.",
    strengthsFa: [
      "توانایی بالا در ابراز شفاف نیازها و مرزها بدون پرخاشگری یا فاصله گرفتن",
      "تاب‌آوری روانی در مواجهه با ناامیدی‌های گذرا در روابط",
      "ایجاد فضای امن روانی برای همکاران، اعضای خانواده و شریک زندگی",
    ],
    strengthsEn: [
      "Clear assertion of needs and healthy boundaries without aggression",
      "Psychological resilience when navigating temporary relational ruptures",
      "Fostering emotional safety for team members, friends, and partners",
    ],
    triggersFa: [
      "مواجهه طولانی با رفتارهای شدیداً غیرقابل پیش‌بینی یا پنهان‌کاری مداوم دیگران",
    ],
    triggersEn: [
      "Chronic exposure to manipulative opacity or extreme unpredictability",
    ],
    regulationTipFa: "از این ثبات درونی برای پروژه‌های طولانی، راهبری تیمی و پرورش پیوندهای عمیق بهره بگیرید.",
    regulationTipEn: "Leverage this psychological anchor for long-term collaborative leadership.",
    recommendedPracticeFa: "ثبت هفتگی قدردانی از پیوندهای مثبت و مربیگری آرام برای دیگران در ابزار Mind.",
    recommendedPracticeEn: "Weekly relationship gratitude logging and calm emotional stewardship in Mind.",
  },
  preoccupied: {
    titleFa: "سبک دلبستگی مضطرب-دل‌مشغول (Anxious-Preoccupied)",
    titleEn: "Anxious-Preoccupied Attachment Style",
    summaryFa: "میل شدیدی به صمیمیت دارید اما همواره با ترسی پس‌زمینه‌ای از طرد شدن، رها شدن یا کمتر دوست داشته شدن مواجهید. نشانه‌های ظریف سردی اطرافیان را بیش‌ازحد رصد می‌کنید.",
    summaryEn: "You have a deep yearning for closeness, often accompanied by background vigilance regarding rejection, abandonment, or fluctuating affection.",
    strengthsFa: [
      "تعهد و وفاداری بسیار بالا به روابط و افراد نزدیک",
      "حسگرهای احساسی عمیق برای همدلی و درک نیازهای عاطفی دیگران",
      "انگیزه قوی برای پیوند و حل سریع سوءتفاهم‌ها",
    ],
    strengthsEn: [
      "Exceptional loyalty, dedication, and warmth in relationships",
      "Acute empathic radar tuned to others' emotional states",
      "Strong motivation for connection and rapid reconciliation",
    ],
    triggersFa: [
      "پاسخ ندادن به پیام‌ها یا تأخیر طولانی در تماس‌ها",
      "احساس سردی، مبهم بودن لحن یا کناره‌گیری غیرمنتظره دیگران",
      "تغییر ناگهانی برنامه‌ها بدون توضیح شفاف",
    ],
    triggersEn: [
      "Delayed replies, unreturned messages, or ambiguous text tones",
      "Perceived emotional withdrawal or sudden relational distance",
      "Unexplained cancellations of plans",
    ],
    regulationTipFa: "پیش از هرگونه واکنش پیامکی یا پرس‌وجوی اضطرابی، ۳ دقیقه مکث کن، تکنیک تنفس جعبه‌ای را در ابزار تنفس ارشناز اجرا کن و با خودت مرور کن: «تأخیر در پاسخ به معنای طرد شدن نیست».",
    regulationTipEn: "Before sending anxious follow-ups, take a 3-minute pause with ARSHNAZ Box Breathing and remind yourself: 'Delay does not equal abandonment.'",
    recommendedPracticeFa: "تمرین خودآرام‌بخشی (Self-Soothing) و ثبت افکار اضطرابی در ابزار CBT پیش از واکنش آنی.",
    recommendedPracticeEn: "Self-soothing journaling and logging anxious assumptions in the CBT tool before reacting.",
  },
  dismissive: {
    titleFa: "سبک دلبستگی اجتنابی-بی‌اعتنا (Dismissive-Avoidant)",
    titleEn: "Dismissive-Avoidant Attachment Style",
    summaryFa: "استقلال شخصی را در بالاترین اولویت قرار می‌دهید و در برابر نزدیک شدن بیش‌ازحد یا ابراز احساسات آسیب‌پذیر احساس کلافگی می‌کنید. در چالش‌ها تمایل دارید غار تنهایی خود را بسازید.",
    summaryEn: "You prioritize self-reliance above all and feel suffocated when emotional demands escalate. In distress, your default reflex is retreating to your fortress.",
    strengthsFa: [
      "خودکفایی بسیار بالا و توانایی خیره‌کننده در حل مستقل بحران‌ها",
      "خونسردی و توانایی انجام وظایف پیچیده بدون نیاز به تأیید دائمی بیرونی",
      "مرزبندی قوی در مدیریت زمان و محافظت از فضای کاری فردی",
    ],
    strengthsEn: [
      "Formidable self-reliance and autonomous problem-solving under stress",
      "Unwavering operational focus free from constant external validation",
      "Strong time boundaries protecting dedicated personal focus",
    ],
    triggersFa: [
      "درخواست‌های هیجانی مکرر و احساس کنترل شدن توسط دیگران",
      "موقعیتی که نیازمند آسیب‌پذیری و اعتراف به نیاز به کمک باشد",
      "درام‌های احساسی طولانی یا مواجهه با افراد با اضطراب شدید",
    ],
    triggersEn: [
      "Demands for emotional disclosure or perceived micromanagement",
      "Scenarios requiring overt vulnerability and asking for help",
      "Prolonged emotional drama or high-anxiety confrontations",
    ],
    regulationTipFa: "استقلال یک ارزش بزرگ است اما انزوای کامل، انرژی شما را می‌فرساید. یاد بگیرید حداقل با یک فرد معتمد در میان بگذارید که چه در سر دارید.",
    regulationTipEn: "Autonomy is powerful, but absolute isolation burns cognitive reserves. Practice micro-disclosures of feelings with trusted companions.",
    recommendedPracticeFa: "ثبت روزانه احساسات در یادداشت‌های روزانه (Daily Diary) برای نرم‌تر کردن سپر دفاعی.",
    recommendedPracticeEn: "Daily emotion labeling in Daily Diary to gently bridge internal feelings with expression.",
  },
  fearful: {
    titleFa: "سبک دلبستگی اجتنابی-ترس‌خورده (Fearful-Avoidant / Disorganized)",
    titleEn: "Fearful-Avoidant Attachment Style",
    summaryFa: "شما با یک تضاد درونی مداوم روبرویید: همزمان تشنه صمیمیت و پذیرفته‌شدن هستید، اما از اینکه نزدیک شوید و آسیب ببینید وحشت دارید؛ لذا میان صمیمیت و عقب‌نشینی نوسان می‌کنید.",
    summaryEn: "You experience an internal push-pull conflict: deeply craving intimacy and safety, while simultaneously fearing betrayal, leading to oscillating approach and retreat.",
    strengthsFa: [
      "درک بسیار عمیق از رنج و پیچیدگی‌های احساسی انسان‌ها",
      "هوش هیجانی و حس زیبایی‌شناختی بالا در درک لایه‌های زیرین رفتارها",
      "ظرفیت شگفت‌انگیز برای شفقت به دیگران پس از بازسازی پایگاه درونی",
    ],
    strengthsEn: [
      "Profound sensitivity to human vulnerability and emotional nuances",
      "High aesthetic depth and intuitive grasp of complex motivations",
      "Transformative capacity for deep compassion once safety is anchored",
    ],
    triggersFa: [
      "صمیمیت خیلی سریع یا قرار گرفتن در شرایطی که کنترل اوضاع ناممکن باشد",
      "احساس بی‌ارزش شدن یا طرد زودهنگام در مواجهه با خطای دیگران",
      "تضاد میان حس نیاز به تکیه کردن و ترس از تسلیم شدن",
    ],
    triggersEn: [
      "Rapidly accelerating intimacy without predictable pacing",
      "Feeling trapped or helpless when relational boundaries blur",
      "Internal shame triggers when feeling exposed or judged",
    ],
    regulationTipFa: "امنیت را گام‌به‌گام بسازید. روتین‌های روزمره ثابت در ارشناز (خواب منظم، ورزش، اولویت‌های مشخص) امن‌ترین پایگاه برای بازآفرینی آرامش عصبی شما هستند.",
    regulationTipEn: "Build safety incrementally. Steady, predictable daily routines (sleep, movement, clear MITs) are your nervous system's best anchor.",
    recommendedPracticeFa: "استفاده از ابزارهای بازنگری شناختی (CBT Thoughts) و ساختن روتین‌های فوق‌العاده پایدار صبحگاهی.",
    recommendedPracticeEn: "Regular CBT Thought challenging and anchoring steadfast morning routines.",
  },
};

export const QUADRANT_DESC: Record<AttachmentQuadrant, string> = {
  secure: QUADRANT_PROFILES.secure.summaryFa,
  preoccupied: QUADRANT_PROFILES.preoccupied.summaryFa,
  dismissive: QUADRANT_PROFILES.dismissive.summaryFa,
  fearful: QUADRANT_PROFILES.fearful.summaryFa,
};

export const QUADRANT_DESC_EN: Record<AttachmentQuadrant, string> = {
  secure: QUADRANT_PROFILES.secure.summaryEn,
  preoccupied: QUADRANT_PROFILES.preoccupied.summaryEn,
  dismissive: QUADRANT_PROFILES.dismissive.summaryEn,
  fearful: QUADRANT_PROFILES.fearful.summaryEn,
};
