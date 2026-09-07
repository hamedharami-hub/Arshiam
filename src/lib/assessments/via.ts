// VIA-72 simplified: 3 items per strength, 24 strengths, 5-point Likert.
// Scoring: sum per strength (3..15), then rank 1..24.

export type ViaStrength =
  | "creativity" | "curiosity" | "judgment" | "love_of_learning" | "perspective"
  | "bravery" | "perseverance" | "honesty" | "zest"
  | "love" | "kindness" | "social_intelligence"
  | "teamwork" | "fairness" | "leadership"
  | "forgiveness" | "humility" | "prudence" | "self_regulation"
  | "appreciation_of_beauty" | "gratitude" | "hope" | "humor" | "spirituality";

export interface ViaItem { id: number; text: string; strength: ViaStrength; }

const STRENGTH_TEMPLATES: Record<ViaStrength, [string, string, string]> = {
  creativity: [
    "اغلب راه‌حل‌های نوآورانه برای مشکلات پیدا می‌کنم.",
    "از فکر کردن به ایده‌های غیرمعمول لذت می‌برم.",
    "دوست دارم چیزهای جدید بسازم.",
  ],
  curiosity: [
    "همیشه دنبال یاد گرفتن چیزهای جدید هستم.",
    "موضوعات گوناگون برایم جذاب است.",
    "از کاوش در مسائل ناآشنا انرژی می‌گیرم.",
  ],
  judgment: [
    "قبل از تصمیم‌گیری، همه جوانب را می‌سنجم.",
    "به ادعاها بدون مدرک اعتماد نمی‌کنم.",
    "تمایل دارم پیش‌فرض‌هایم را زیر سؤال ببرم.",
  ],
  love_of_learning: [
    "از مطالعه عمیق درباره موضوعات مورد علاقه‌ام لذت می‌برم.",
    "حتی بدون پاداش بیرونی، یادگیری برایم ارزشمند است.",
    "همیشه در حال افزودن دانش جدید هستم.",
  ],
  perspective: [
    "دیگران از من برای راهنمایی مشورت می‌گیرند.",
    "می‌توانم تصویر بزرگ‌تر را ببینم.",
    "در شرایط پیچیده، دیدگاه متعادلی ارائه می‌دهم.",
  ],
  bravery: [
    "حتی اگر بترسم، کاری که درست است را انجام می‌دهم.",
    "از دفاع از باورهایم در برابر مخالفت ابایی ندارم.",
    "در شرایط خطرناک، عمل می‌کنم.",
  ],
  perseverance: [
    "تا کاری را تمام نکرده‌ام، رها نمی‌کنم.",
    "موانع، انگیزه‌ام را از بین نمی‌برند.",
    "در پروژه‌های طولانی پایداری می‌کنم.",
  ],
  honesty: [
    "همیشه راست می‌گویم حتی وقتی به ضررم باشد.",
    "وفادار به اصول اخلاقی‌ام هستم.",
    "خودم را همان‌طور که هستم نشان می‌دهم.",
  ],
  zest: [
    "با انرژی و اشتیاق به کارهایم می‌پردازم.",
    "صبح‌ها با انگیزه از خواب بیدار می‌شوم.",
    "زندگی را یک ماجراجویی می‌بینم.",
  ],
  love: [
    "روابط عمیقی با عزیزانم دارم.",
    "ابراز محبت برایم آسان است.",
    "ارزش زیادی برای صمیمیت قائلم.",
  ],
  kindness: [
    "از کمک کردن به دیگران لذت می‌برم.",
    "حتی به غریبه‌ها مهربانی می‌کنم.",
    "بدون انتظار بازگشت، خوبی می‌کنم.",
  ],
  social_intelligence: [
    "احساسات دیگران را به‌خوبی درک می‌کنم.",
    "می‌دانم در موقعیت‌های مختلف چگونه رفتار کنم.",
    "انگیزه‌های پنهان رفتارها را تشخیص می‌دهم.",
  ],
  teamwork: [
    "در گروه بهترین نسخه خودم هستم.",
    "به موفقیت تیم بیش از موفقیت فردی اهمیت می‌دهم.",
    "وفادار به اعضای گروهم هستم.",
  ],
  fairness: [
    "به همه فرصت برابر می‌دهم.",
    "تعصبات شخصی‌ام را در قضاوت کنترل می‌کنم.",
    "از بی‌عدالتی ناراحت می‌شوم.",
  ],
  leadership: [
    "می‌توانم گروهی را به سمت هدف هدایت کنم.",
    "دیگران به طبیعی به من برای رهبری نگاه می‌کنند.",
    "در سازماندهی فعالیت‌ها قوی‌ام.",
  ],
  forgiveness: [
    "کینه به دل نمی‌گیرم.",
    "به دیگران فرصت دوباره می‌دهم.",
    "بخشش را راحت‌تر از انتقام می‌یابم.",
  ],
  humility: [
    "از به رخ کشیدن دستاوردهایم پرهیز می‌کنم.",
    "خودم را برتر از دیگران نمی‌بینم.",
    "اعتبار را با دیگران تقسیم می‌کنم.",
  ],
  prudence: [
    "ریسک‌های غیرضروری نمی‌پذیرم.",
    "قبل از عمل، عواقب را می‌سنجم.",
    "در تصمیمات مهم محتاطم.",
  ],
  self_regulation: [
    "احساسات و رفتارم را به‌خوبی کنترل می‌کنم.",
    "وسوسه‌ها را مدیریت می‌کنم.",
    "نظم خود را در شرایط سخت حفظ می‌کنم.",
  ],
  appreciation_of_beauty: [
    "از زیبایی‌های طبیعت و هنر عمیقاً لذت می‌برم.",
    "لحظات شگفت‌انگیز را تشخیص می‌دهم.",
    "به جزئیات زیبایی توجه دارم.",
  ],
  gratitude: [
    "بابت چیزهای کوچک هم سپاسگزارم.",
    "هر روز چیزی را که قدردانی‌اش را می‌کنم می‌یابم.",
    "تشکر کردن برایم آسان است.",
  ],
  hope: [
    "آینده را روشن می‌بینم.",
    "حتی در سختی، خوش‌بین می‌مانم.",
    "باور دارم که تلاشم نتیجه می‌دهد.",
  ],
  humor: [
    "از خنداندن دیگران لذت می‌برم.",
    "در موقعیت‌های دشوار جنبه طنز را پیدا می‌کنم.",
    "شوخ‌طبعی بخشی از طبیعتم است.",
  ],
  spirituality: [
    "به معنایی فراتر از خودم باور دارم.",
    "احساس ارتباط با چیزی بزرگ‌تر دارم.",
    "زندگی برایم هدفمند است.",
  ],
};

export const VIA_LABELS: Record<ViaStrength, string> = {
  creativity: "خلاقیت", curiosity: "کنجکاوی", judgment: "تفکر انتقادی",
  love_of_learning: "عشق به یادگیری", perspective: "دیدگاه‌وسیع",
  bravery: "شجاعت", perseverance: "پشتکار", honesty: "صداقت", zest: "شور و اشتیاق",
  love: "عشق", kindness: "مهربانی", social_intelligence: "هوش اجتماعی",
  teamwork: "کار تیمی", fairness: "انصاف", leadership: "رهبری",
  forgiveness: "بخشش", humility: "تواضع", prudence: "احتیاط", self_regulation: "خودتنظیمی",
  appreciation_of_beauty: "قدردانی از زیبایی", gratitude: "سپاسگزاری",
  hope: "امید", humor: "طنز", spirituality: "معنویت",
};

export const VIA_VIRTUES: Record<string, ViaStrength[]> = {
  "خرد و دانش": ["creativity", "curiosity", "judgment", "love_of_learning", "perspective"],
  "شجاعت": ["bravery", "perseverance", "honesty", "zest"],
  "انسانیت": ["love", "kindness", "social_intelligence"],
  "عدالت": ["teamwork", "fairness", "leadership"],
  "اعتدال": ["forgiveness", "humility", "prudence", "self_regulation"],
  "تعالی": ["appreciation_of_beauty", "gratitude", "hope", "humor", "spirituality"],
};

export const VIA_ITEMS: ViaItem[] = (() => {
  const items: ViaItem[] = [];
  let id = 1;
  for (const strength of Object.keys(STRENGTH_TEMPLATES) as ViaStrength[]) {
    for (const text of STRENGTH_TEMPLATES[strength]) {
      items.push({ id: id++, text, strength });
    }
  }
  return items;
})();

export type ViaScores = Record<ViaStrength, number>;

export function scoreVia(responses: Record<number, number>): ViaScores {
  const totals = Object.fromEntries(
    Object.keys(STRENGTH_TEMPLATES).map((s) => [s, 0]),
  ) as ViaScores;
  for (const item of VIA_ITEMS) {
    const v = responses[item.id];
    if (typeof v === "number") totals[item.strength] += v;
  }
  return totals;
}

export interface ViaAnalysis {
  ranking: { strength: ViaStrength; score: number }[];
  signature: ViaStrength[]; // top 5
  dominant_virtue: string | null;
}

export function analyzeVia(scores: ViaScores): ViaAnalysis {
  const ranking = (Object.entries(scores) as [ViaStrength, number][])
    .map(([s, score]) => ({ strength: s, score }))
    .sort((a, b) => b.score - a.score);
  const signature = ranking.slice(0, 5).map((r) => r.strength);
  let dominant_virtue: string | null = null;
  for (const [virtue, strs] of Object.entries(VIA_VIRTUES)) {
    const density = strs.filter((s) => signature.includes(s)).length / 5;
    if (density >= 0.4) { dominant_virtue = virtue; break; }
  }
  return { ranking, signature, dominant_virtue };
}
