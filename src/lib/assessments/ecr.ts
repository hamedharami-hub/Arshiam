// ECR-R 36 items: 18 anxiety + 18 avoidance, 7-point Likert.
// Scoring: average per dimension (1..7). Reverse where noted.

export interface EcrItem { id: number; text: string; dim: "anxiety" | "avoidance"; reverse: boolean; }

export const ECR_ITEMS: EcrItem[] = [
  // Anxiety
  { id: 1, text: "می‌ترسم شریکم دیگر مرا دوست نداشته باشد.", dim: "anxiety", reverse: false },
  { id: 2, text: "اغلب نگرانم که شریکم مرا ترک کند.", dim: "anxiety", reverse: false },
  { id: 3, text: "نگرانم که به اندازه‌ای که من به شریکم اهمیت می‌دهم، او به من اهمیت ندهد.", dim: "anxiety", reverse: false },
  { id: 4, text: "وقتی شریکم در دسترس نیست، احساس ناراحتی می‌کنم.", dim: "anxiety", reverse: false },
  { id: 5, text: "نیاز دارم به‌طور مکرر اطمینان حاصل کنم که دوستم دارد.", dim: "anxiety", reverse: false },
  { id: 6, text: "اگر نتوانم شریکم را وادار به ابراز علاقه کنم، ناراحت می‌شوم.", dim: "anxiety", reverse: false },
  { id: 7, text: "وقتی شریکم با دیگران وقت می‌گذراند، حسادت می‌کنم.", dim: "anxiety", reverse: false },
  { id: 8, text: "نگرانی‌ام درباره روابطم بیشتر از دیگران است.", dim: "anxiety", reverse: false },
  { id: 9, text: "ترس از طرد شدن، رفتار من را در رابطه شکل می‌دهد.", dim: "anxiety", reverse: false },
  { id: 10, text: "گاهی احساس می‌کنم شریکم را با احساساتم دور می‌کنم.", dim: "anxiety", reverse: false },
  { id: 11, text: "وقتی پاسخی فوری از شریکم نمی‌گیرم، نگران می‌شوم.", dim: "anxiety", reverse: false },
  { id: 12, text: "از تنها بودن می‌ترسم.", dim: "anxiety", reverse: false },
  { id: 13, text: "به ندرت نگران رابطه‌ام هستم.", dim: "anxiety", reverse: true },
  { id: 14, text: "اغلب احساس می‌کنم به اطمینان بیشتری از طرف شریکم نیاز دارم.", dim: "anxiety", reverse: false },
  { id: 15, text: "حتی نشانه‌های کوچک سرد شدن، مرا مضطرب می‌کند.", dim: "anxiety", reverse: false },
  { id: 16, text: "دوست دارم احساساتم با احساسات شریکم همسو باشد.", dim: "anxiety", reverse: false },
  { id: 17, text: "وقتی شریکم سرد رفتار می‌کند، فکر می‌کنم تقصیر من است.", dim: "anxiety", reverse: false },
  { id: 18, text: "نیازم به نزدیکی، گاهی شریکم را می‌ترساند.", dim: "anxiety", reverse: false },

  // Avoidance
  { id: 19, text: "ترجیح می‌دهم به شریکم بیش از حد نزدیک نشوم.", dim: "avoidance", reverse: false },
  { id: 20, text: "وقتی شریکم می‌خواهد خیلی نزدیک شود، احساس ناراحتی می‌کنم.", dim: "avoidance", reverse: false },
  { id: 21, text: "ابراز احساسات عمیق به شریکم برایم سخت است.", dim: "avoidance", reverse: false },
  { id: 22, text: "ترجیح می‌دهم به دیگران تکیه نکنم.", dim: "avoidance", reverse: false },
  { id: 23, text: "وابسته شدن برایم دشوار است.", dim: "avoidance", reverse: false },
  { id: 24, text: "صحبت درباره مشکلاتم با شریکم سخت است.", dim: "avoidance", reverse: false },
  { id: 25, text: "ترجیح می‌دهم احساساتم را برای خودم نگه دارم.", dim: "avoidance", reverse: false },
  { id: 26, text: "احساس می‌کنم استقلالم برایم بسیار مهم است.", dim: "avoidance", reverse: false },
  { id: 27, text: "نزدیکی بیش از حد، مرا کلافه می‌کند.", dim: "avoidance", reverse: false },
  { id: 28, text: "راحت می‌توانم به شریکم نزدیک شوم.", dim: "avoidance", reverse: true },
  { id: 29, text: "اعتماد کامل به شریکم برایم آسان است.", dim: "avoidance", reverse: true },
  { id: 30, text: "از ابراز محبت ابایی ندارم.", dim: "avoidance", reverse: true },
  { id: 31, text: "وقتی به کمک نیاز دارم، به‌راحتی به شریکم می‌گویم.", dim: "avoidance", reverse: true },
  { id: 32, text: "صمیمیت عاطفی، احساس امنیت به من می‌دهد.", dim: "avoidance", reverse: true },
  { id: 33, text: "از در آغوش گرفته شدن لذت می‌برم.", dim: "avoidance", reverse: true },
  { id: 34, text: "احساسات منفی‌ام را با شریکم به اشتراک می‌گذارم.", dim: "avoidance", reverse: true },
  { id: 35, text: "ترجیح می‌دهم خودم مشکلاتم را حل کنم تا کمک بخواهم.", dim: "avoidance", reverse: false },
  { id: 36, text: "اظهار آسیب‌پذیری برایم دشوار است.", dim: "avoidance", reverse: false },
];

export interface EcrScores { anxiety: number; avoidance: number; }

export function scoreEcr(responses: Record<number, number>): EcrScores {
  let aSum = 0, aN = 0, vSum = 0, vN = 0;
  for (const item of ECR_ITEMS) {
    const raw = responses[item.id];
    if (typeof raw !== "number") continue;
    const v = item.reverse ? 8 - raw : raw;
    if (item.dim === "anxiety") { aSum += v; aN++; }
    else { vSum += v; vN++; }
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
  secure: "ایمن",
  preoccupied: "مضطرب-دل‌مشغول",
  dismissive: "اجتنابی-بی‌اعتنا",
  fearful: "اجتنابی-ترس‌خورده",
};

export const QUADRANT_DESC: Record<AttachmentQuadrant, string> = {
  secure: "راحتی با صمیمیت و استقلال؛ پایه‌ای محکم برای روابط.",
  preoccupied: "نیاز بالا به نزدیکی همراه با ترس از طرد؛ نوسانات هیجانی شدیدتر.",
  dismissive: "ارزش بالا برای استقلال و فاصله؛ کاهش ابراز احساسات.",
  fearful: "تمایل و ترس همزمان از صمیمیت؛ الگوی کشمکش درونی.",
};
