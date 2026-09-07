// HEXACO-60 (Ashton & Lee, 2009) - Persian translation
// Each item: { id, text, factor: H|E|X|A|C|O, reverse: boolean }
// Scoring: 5-point Likert (1=کاملاً مخالف, 5=کاملاً موافق). Reverse: 6-x.
// Each factor has 10 items. Final score per factor = sum (range 10..50).

export type HexacoFactor = "H" | "E" | "X" | "A" | "C" | "O";

export interface HexacoItem {
  id: number;
  text: string;
  factor: HexacoFactor;
  reverse: boolean;
}

export const HEXACO_ITEMS: HexacoItem[] = [
  // Honesty-Humility (H)
  { id: 1, text: "اگر مطمئن باشم کسی متوجه نمی‌شود، حاضرم چیز گران‌قیمتی را بدزدم.", factor: "H", reverse: true },
  { id: 2, text: "ترجیح می‌دهم پول زیادی داشته باشم تا در میان مردم خاص دیده شوم.", factor: "H", reverse: true },
  { id: 3, text: "هیچ‌گاه از کسی چاپلوسی نمی‌کنم تا چیزی به دست آورم.", factor: "H", reverse: false },
  { id: 4, text: "اگر فرصتی پیش بیاید، حاضرم برای پیشرفت شغلی‌ام به دیگران آسیب بزنم.", factor: "H", reverse: true },
  { id: 5, text: "احساس می‌کنم استحقاق احترام بیشتری از دیگران را دارم.", factor: "H", reverse: true },
  { id: 6, text: "حتی اگر کسی متوجه نشود، حاضر نیستم تقلب کنم.", factor: "H", reverse: false },
  { id: 7, text: "ثروت یا شهرت برای من جذابیت چندانی ندارد.", factor: "H", reverse: false },
  { id: 8, text: "اگر بدانم مجازاتی در کار نیست، ممکن است قانون را زیر پا بگذارم.", factor: "H", reverse: true },
  { id: 9, text: "هرگز سعی نمی‌کنم خودم را برتر از دیگران نشان دهم.", factor: "H", reverse: false },
  { id: 10, text: "گاهی برای رسیدن به هدفم، دیگران را فریب می‌دهم.", factor: "H", reverse: true },

  // Emotionality (E)
  { id: 11, text: "وقتی در شرایط خطرناک قرار می‌گیرم، احساس ترس شدیدی می‌کنم.", factor: "E", reverse: false },
  { id: 12, text: "نگرانی‌های روزمره به‌ندرت باعث ناراحتی من می‌شود.", factor: "E", reverse: true },
  { id: 13, text: "در مواجهه با درد فیزیکی، خیلی حساس هستم.", factor: "E", reverse: false },
  { id: 14, text: "وقتی از عزیزانم دور می‌شوم، احساس دلتنگی شدید می‌کنم.", factor: "E", reverse: false },
  { id: 15, text: "به‌ندرت برای کمک عاطفی به دیگران تکیه می‌کنم.", factor: "E", reverse: true },
  { id: 16, text: "وقتی فیلم غم‌انگیزی می‌بینم، به‌راحتی اشک می‌ریزم.", factor: "E", reverse: false },
  { id: 17, text: "در شرایط استرس‌زا آرامش خود را حفظ می‌کنم.", factor: "E", reverse: true },
  { id: 18, text: "نگرانی برای اعضای خانواده، ذهن مرا مشغول می‌کند.", factor: "E", reverse: false },
  { id: 19, text: "حتی در سختی، به ندرت احساس درماندگی می‌کنم.", factor: "E", reverse: true },
  { id: 20, text: "به آسانی از کوچک‌ترین مشکلات احساسی متأثر می‌شوم.", factor: "E", reverse: false },

  // eXtraversion (X)
  { id: 21, text: "احساس می‌کنم آدم محبوبی هستم.", factor: "X", reverse: false },
  { id: 22, text: "در جمع‌های شلوغ، انرژی زیادی می‌گیرم.", factor: "X", reverse: false },
  { id: 23, text: "ترجیح می‌دهم بیشتر وقتم را تنها بگذرانم.", factor: "X", reverse: true },
  { id: 24, text: "در گفت‌وگوهای گروهی به ندرت پیش‌قدم می‌شوم.", factor: "X", reverse: true },
  { id: 25, text: "اعتماد به نفس بالایی در موقعیت‌های اجتماعی دارم.", factor: "X", reverse: false },
  { id: 26, text: "بیشتر اوقات احساس شادی و سرزندگی می‌کنم.", factor: "X", reverse: false },
  { id: 27, text: "حضور در کانون توجه را دوست دارم.", factor: "X", reverse: false },
  { id: 28, text: "در میان غریبه‌ها احساس ناراحتی می‌کنم.", factor: "X", reverse: true },
  { id: 29, text: "از معاشرت با تعداد زیادی از مردم لذت می‌برم.", factor: "X", reverse: false },
  { id: 30, text: "در ابراز نظراتم در جمع، محتاطم.", factor: "X", reverse: true },

  // Agreeableness (A)
  { id: 31, text: "اگر کسی به من بدی کند، به‌سرعت می‌بخشم.", factor: "A", reverse: false },
  { id: 32, text: "وقتی با دیگران اختلاف نظر دارم، تا تسلیم آنها نشوم رها نمی‌کنم.", factor: "A", reverse: true },
  { id: 33, text: "نسبت به اشتباهات دیگران صبور هستم.", factor: "A", reverse: false },
  { id: 34, text: "به‌سرعت از دست دیگران عصبانی می‌شوم.", factor: "A", reverse: true },
  { id: 35, text: "حتی با کسانی که با من بد رفتار کرده‌اند، مهربان می‌مانم.", factor: "A", reverse: false },
  { id: 36, text: "در روابط تمایل دارم انتقاد کنم.", factor: "A", reverse: true },
  { id: 37, text: "معمولاً در برابر فشار دیگران انعطاف نشان می‌دهم.", factor: "A", reverse: false },
  { id: 38, text: "کینه‌توز هستم و دیر فراموش می‌کنم.", factor: "A", reverse: true },
  { id: 39, text: "از همکاری گروهی بیشتر از رقابت لذت می‌برم.", factor: "A", reverse: false },
  { id: 40, text: "اگر احساس کنم به من ظلم شده، به سختی می‌بخشم.", factor: "A", reverse: true },

  // Conscientiousness (C)
  { id: 41, text: "محیط کار و زندگی‌ام منظم است.", factor: "C", reverse: false },
  { id: 42, text: "تصمیم‌هایم را پس از بررسی دقیق می‌گیرم.", factor: "C", reverse: false },
  { id: 43, text: "در انجام وظایفم اهمال‌کاری می‌کنم.", factor: "C", reverse: true },
  { id: 44, text: "تا کاری را به بهترین شکل انجام نداده‌ام، رهایش نمی‌کنم.", factor: "C", reverse: false },
  { id: 45, text: "قبل از شروع کار، برنامه‌ریزی دقیق می‌کنم.", factor: "C", reverse: false },
  { id: 46, text: "گاهی بدون فکر تصمیم می‌گیرم.", factor: "C", reverse: true },
  { id: 47, text: "تا زمانی که هدفم محقق نشود، تلاش می‌کنم.", factor: "C", reverse: false },
  { id: 48, text: "وسایلم را اغلب گم می‌کنم.", factor: "C", reverse: true },
  { id: 49, text: "روی جزئیات کارها وسواس دارم.", factor: "C", reverse: false },
  { id: 50, text: "زمانم را به‌خوبی مدیریت نمی‌کنم.", factor: "C", reverse: true },

  // Openness (O)
  { id: 51, text: "از دیدن آثار هنری و موسیقی نو لذت می‌برم.", factor: "O", reverse: false },
  { id: 52, text: "به موضوعات فلسفی و انتزاعی علاقه‌مندم.", factor: "O", reverse: false },
  { id: 53, text: "ترجیح می‌دهم مسیرهای آشنا را تجربه کنم تا تجربه‌های جدید.", factor: "O", reverse: true },
  { id: 54, text: "دوست دارم درباره ایده‌های نامتعارف بیشتر بدانم.", factor: "O", reverse: false },
  { id: 55, text: "از سفر به مکان‌های ناآشنا لذت می‌برم.", factor: "O", reverse: false },
  { id: 56, text: "گاهی به موضوعاتی فکر می‌کنم که در زندگی روزمره کاربرد ندارند.", factor: "O", reverse: false },
  { id: 57, text: "شعر و ادبیات برایم جذابیتی ندارد.", factor: "O", reverse: true },
  { id: 58, text: "از کشف فرهنگ‌های متفاوت لذت می‌برم.", factor: "O", reverse: false },
  { id: 59, text: "خلاقیت یکی از مشخصه‌های اصلی من است.", factor: "O", reverse: false },
  { id: 60, text: "تغییرات بزرگ در زندگی، مرا مضطرب می‌کند.", factor: "O", reverse: true },
];

export interface HexacoScores {
  H: number; E: number; X: number; A: number; C: number; O: number;
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

export interface HexacoAnalysis {
  patterns: string[];
  ai_tone: "data_driven" | "gentle_analytical" | "exploratory" | "neutral";
  attention_points: string[];
}

export function analyzeHexaco(s: HexacoScores): HexacoAnalysis {
  const patterns: string[] = [];
  const attention: string[] = [];

  if (s.C > 40 && s.E < 25) {
    patterns.push("High-Functioning Analytical");
    attention.push("هیجان‌پذیری پایین تو به معنای «استرس نداشتن» نیست؛ علائم دیر ظاهر می‌شوند. سیستم برایت نشانه‌های زودهنگام (افت خواب، کاهش تمرکز) را ردیابی می‌کند.");
  }
  if (s.C > 40 && s.O > 40) patterns.push("Systematic Innovator");
  if (s.E > 35 && s.A > 35) {
    patterns.push("Empathic Responder");
    attention.push("جذب احساسات محیط؛ در دوره‌های فشار به فضای شخصی بیشتر نیاز داری.");
  }
  if (s.H < 25 && s.X > 35) patterns.push("Strategic Social");
  if (s.C > 40) attention.push("وظیفه‌شناسی بالا → ریسک Overcommitment. آستانه بار شناختی بعد از ۲ هفته داده، کالیبره می‌شود.");
  if (s.O > 40) attention.push("گشودگی بالا → از تنوع روش‌ها بهره می‌بری؛ پیشنهادها متنوع ارائه می‌شوند.");

  let ai_tone: HexacoAnalysis["ai_tone"] = "neutral";
  if (s.E < 25 && s.C > 40) ai_tone = "data_driven";
  else if (s.E > 35) ai_tone = "gentle_analytical";
  else if (s.O > 40) ai_tone = "exploratory";

  return { patterns, ai_tone, attention_points: attention };
}

export const HEXACO_LABELS: Record<HexacoFactor, string> = {
  H: "صداقت-تواضع", E: "هیجان‌پذیری", X: "برون‌گرایی",
  A: "توافق‌پذیری", C: "وظیفه‌شناسی", O: "گشودگی",
};
