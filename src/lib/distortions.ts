// Cognitive distortion detection — A4
// 10 classic CBT distortions with rich Persian keyword patterns + intensity scoring.
export type Distortion =
  | "overgeneralization" | "all_or_nothing" | "mental_filter" | "discounting_positive"
  | "jumping_to_conclusions" | "magnification" | "emotional_reasoning" | "shoulds"
  | "labeling" | "personalization";

export const DISTORTION_LABELS: Record<Distortion, string> = {
  overgeneralization: "تعمیم افراطی",
  all_or_nothing: "تفکر دوقطبی",
  mental_filter: "فیلتر ذهنی",
  discounting_positive: "نادیده گرفتن مثبت",
  jumping_to_conclusions: "نتیجه‌گیری شتاب‌زده",
  magnification: "بزرگ‌نمایی / فاجعه‌سازی",
  emotional_reasoning: "استدلال احساسی",
  shoulds: "بایدها",
  labeling: "برچسب‌زنی",
  personalization: "شخصی‌سازی",
};

export const DISTORTION_HINTS: Record<Distortion, string> = {
  overgeneralization: "کلمات «همیشه/هرگز/هیچ‌کس» الگوی تعمیم است. ۳ مثال نقض پیدا کن.",
  all_or_nothing: "آیا یک حالت میانی هم قابل تصور است؟ از ۰ تا ۱۰۰ کجاست؟",
  mental_filter: "آیا اتفاق مثبتی در همان موقعیت بوده که نادیده گرفتی؟",
  discounting_positive: "اگر همین برای دوستت می‌افتاد، آن را بی‌اهمیت می‌شمردی؟",
  jumping_to_conclusions: "این نتیجه‌گیری بر چه داده عینی استوار است؟ ذهن‌خوانی یا پیش‌بینی؟",
  magnification: "در مقیاس ۰-۱۰، این واقعاً چقدر بد است؟ بدترین حالت چقدر محتمل است؟",
  emotional_reasoning: "احساس یک داده است، نه اثبات. چه شواهد دیگری داری؟",
  shoulds: "این «باید» از کجا می‌آید؟ قانون شخصی است یا واقعی؟",
  labeling: "این یک برچسب است یا توصیف یک رفتار خاص؟",
  personalization: "چه عوامل دیگری (خارج از کنترل تو) در کار بودند؟",
};

// Each pattern carries weight = intensity contribution
type Pat = { d: Distortion; rx: RegExp; w: number };

const PATTERNS: Pat[] = [
  // Overgeneralization
  { d: "overgeneralization", rx: /(همیشه|هرگز|هیچ‌?کس|هیچ‌?وقت|هیچ وقت|همه‌?ی? مردم|همه چیز|هیچ‌?چیز)/g, w: 1 },
  { d: "overgeneralization", rx: /(دوباره|باز هم|مثل همیشه|مثل دفعات قبل)/g, w: 0.6 },

  // All-or-nothing
  { d: "all_or_nothing", rx: /(کاملاً? شکست|کاملاً? موفق|صفر|صد در صد|۱۰۰٪|یا .* یا)/g, w: 1 },
  { d: "all_or_nothing", rx: /(یا الان|حتماً? باید|بی‌نقص|کامل|بی عیب)/g, w: 0.5 },

  // Mental filter
  { d: "mental_filter", rx: /(فقط .* بد|تنها چیز بد|هیچ نکته خوبی|هیچ چیز خوبی)/g, w: 1 },

  // Discounting positive
  { d: "discounting_positive", rx: /(مهم نیست|شانس بود|اتفاقی بود|هر کسی می‌?توانست|کار خاصی نکردم)/g, w: 1 },

  // Jumping to conclusions (mind reading + fortune telling)
  { d: "jumping_to_conclusions", rx: /(حتماً? فکر می‌?کند|قطعاً? می‌?داند|معلومه که|مطمئنم که)/g, w: 1 },
  { d: "jumping_to_conclusions", rx: /(آینده‌ام تمام|قطعاً? اتفاق|بدون شک خواهد|هیچ شانسی ندارم)/g, w: 1 },

  // Magnification / catastrophizing
  { d: "magnification", rx: /(فاجعه|افتضاح|نابودی|نابود|وحشتناک|بدترین حالت|بدترین چیز)/g, w: 1 },
  { d: "magnification", rx: /(دیگر تمام شد|آخر دنیا|نمی‌?توانم تحمل کنم|غیر قابل تحمل)/g, w: 0.8 },

  // Emotional reasoning
  { d: "emotional_reasoning", rx: /(احساس می‌?کنم پس|چون احساس می‌?کنم|چون می‌?ترسم پس|حسم می‌?گوید پس)/g, w: 1 },

  // Shoulds
  { d: "shoulds", rx: /(باید|نباید|مجبور(م|ی|ه)?|حتماً? باید|واجب است)/g, w: 0.7 },

  // Labeling
  { d: "labeling", rx: /(بازنده|ضعیف(م|ی|ه)?|احمق(م|ی|ه)?|بی‌?عرضه|بی‌?لیاقت|آدم بدی|آدم خوبی نیستم)/g, w: 1 },

  // Personalization
  { d: "personalization", rx: /(تقصیر من|به خاطر من|بخاطر من|من باعث شدم|اگر من نبودم)/g, w: 1 },
];

export function detectDistortions(text: string): Distortion[] {
  return Object.entries(scoreDistortions(text))
    .filter(([, s]) => s > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => d as Distortion);
}

export function scoreDistortions(text: string): Record<Distortion, number> {
  const scores: Record<Distortion, number> = {
    overgeneralization: 0, all_or_nothing: 0, mental_filter: 0, discounting_positive: 0,
    jumping_to_conclusions: 0, magnification: 0, emotional_reasoning: 0, shoulds: 0,
    labeling: 0, personalization: 0,
  };
  for (const p of PATTERNS) {
    const m = text.match(p.rx);
    if (m) scores[p.d] += m.length * p.w;
  }
  // Round
  for (const k of Object.keys(scores) as Distortion[]) scores[k] = Math.round(scores[k] * 10) / 10;
  return scores;
}

// Returns highlighted-segment info for visual emphasis in UI.
export function highlightSegments(text: string): { start: number; end: number; distortion: Distortion }[] {
  const out: { start: number; end: number; distortion: Distortion }[] = [];
  for (const p of PATTERNS) {
    const rx = new RegExp(p.rx.source, "g");
    let m;
    while ((m = rx.exec(text)) !== null) {
      out.push({ start: m.index, end: m.index + m[0].length, distortion: p.d });
    }
  }
  // sort & merge overlaps (keep first)
  out.sort((a, b) => a.start - b.start);
  const merged: typeof out = [];
  for (const seg of out) {
    const last = merged[merged.length - 1];
    if (last && seg.start < last.end) continue;
    merged.push(seg);
  }
  return merged;
}
