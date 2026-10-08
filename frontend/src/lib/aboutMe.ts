import { firebaseStore } from "@/lib/firebaseStore";

export type AboutAnswer = string | string[] | number | null;

export type AboutMeRow = {
  user_id: string;
  answers: Record<string, AboutAnswer>;
  free_text: string | null;
  ai_analysis: { summary?: string; themes?: string[]; strengths?: string[]; risks?: string[] } | null;
  ai_suggestions: { folders?: string[]; tags?: string[]; tasks?: { title: string; folder?: string; priority?: "none"|"low"|"medium"|"high" }[] } | null;
  analyzed_at: string | null;
  updated_at: string;
};

export type AboutQuestion =
  | { key: string; type: "text" | "longtext"; label: string; placeholder?: string }
  | { key: string; type: "single"; label: string; options: string[] }
  | { key: string; type: "multi"; label: string; options: string[] };

export const ABOUT_SECTIONS: { id: string; title: string; emoji: string; questions: AboutQuestion[] }[] = [
  {
    id: "identity", title: "هویت و کلیات", emoji: "👤",
    questions: [
      { key: "age_range", type: "single", label: "بازه سنی شما؟", options: ["زیر ۱۸", "۱۸-۲۵", "۲۶-۳۵", "۳۶-۴۵", "۴۶-۶۰", "بالای ۶۰"] },
      { key: "occupation", type: "text", label: "شغل/تحصیل فعلی شما؟", placeholder: "مثلاً مهندس نرم‌افزار، دانشجو..." },
      { key: "city", type: "text", label: "شهر یا کشور محل زندگی؟", placeholder: "اختیاری" },
    ],
  },
  {
    id: "goals", title: "اهداف و رؤیاها", emoji: "🎯",
    questions: [
      { key: "main_goal", type: "longtext", label: "مهم‌ترین هدف شما در ۶-۱۲ ماه آینده چیست؟" },
      { key: "life_areas", type: "multi", label: "روی کدام حوزه‌های زندگی تمرکز داری؟", options: ["شغل", "تحصیل", "سلامت", "خانواده", "روابط", "مالی", "هنر/خلاقیت", "معنوی", "ورزش"] },
      { key: "long_dream", type: "longtext", label: "اگر هیچ محدودیتی نبود، در ۵ سال آینده می‌خواستی کجا باشی؟" },
    ],
  },
  {
    id: "family", title: "خانواده و روابط", emoji: "👨‍👩‍👧",
    questions: [
      { key: "marital", type: "single", label: "وضعیت تأهل؟", options: ["مجرد", "متأهل", "در رابطه", "ترجیح می‌دهم نگویم"] },
      { key: "kids", type: "single", label: "آیا فرزند داری؟", options: ["خیر", "بله، یک فرزند", "بله، دو یا بیشتر", "ترجیح می‌دهم نگویم"] },
      { key: "support_circle", type: "longtext", label: "چه کسانی در زندگی‌ت بیشترین حمایت رو می‌دن؟" },
    ],
  },
  {
    id: "interests", title: "علایق و سبک زندگی", emoji: "🎨",
    questions: [
      { key: "hobbies", type: "longtext", label: "چه چیزهایی را در اوقات فراغت دوست داری؟" },
      { key: "energy_time", type: "single", label: "چه زمانی از روز بیشترین انرژی رو داری؟", options: ["صبح زود", "صبح", "ظهر", "بعدازظهر", "شب"] },
      { key: "learning_style", type: "multi", label: "چطور بهتر یاد می‌گیری؟", options: ["خواندن", "ویدیو", "تمرین عملی", "گفتگو", "نوشتن"] },
    ],
  },
  {
    id: "challenges", title: "چالش‌ها و موانع", emoji: "⚡",
    questions: [
      { key: "biggest_challenge", type: "longtext", label: "بزرگ‌ترین چالش الان زندگی‌ت چیه؟" },
      { key: "blockers", type: "multi", label: "چه چیزهایی معمولاً مانع پیشرفت‌ت می‌شن؟", options: ["بی‌انگیزگی", "اضطراب", "کمبود وقت", "حواس‌پرتی", "ترس از شکست", "کمال‌گرایی", "خستگی", "روابط منفی"] },
      { key: "stress_level", type: "single", label: "سطح استرس روزانه‌ت معمولاً چقدره؟", options: ["خیلی کم", "کم", "متوسط", "زیاد", "خیلی زیاد"] },
    ],
  },
  {
    id: "values", title: "ارزش‌ها و معنا", emoji: "💎",
    questions: [
      { key: "core_values", type: "multi", label: "کدام ارزش‌ها برای تو مهم‌ترن؟", options: ["صداقت", "خانواده", "آزادی", "موفقیت", "آرامش", "خلاقیت", "یادگیری", "خدمت", "ماجراجویی", "معنویت"] },
      { key: "meaning", type: "longtext", label: "چه چیزی به زندگی‌ت معنا می‌ده؟" },
    ],
  },
];

export async function loadAboutMe(userId: string): Promise<AboutMeRow | null> {
  const { data, error } = await firebaseStore.from("about_me" as any, userId).select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return (data as any) || null;
}

export async function saveAboutMe(userId: string, patch: Partial<AboutMeRow>) {
  const { error } = await firebaseStore
    .from("about_me" as any, userId)
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}

export function formatAboutMeForAI(row: AboutMeRow | null | undefined, lang: "fa" | "en" = "fa"): string[] {
  if (!row) return [];
  const parts: string[] = [];
  const ans = row.answers || {};

  // 1. Identity & Context
  const idParts: string[] = [];
  if (ans.occupation) {
    idParts.push(lang === "en" ? `Role/Study: ${ans.occupation}` : `شغل/تحصیل: ${ans.occupation}`);
  }
  if (ans.age_range) {
    idParts.push(lang === "en" ? `Age bracket: ${ans.age_range}` : `بازه سنی: ${ans.age_range}`);
  }
  if (ans.city) {
    idParts.push(lang === "en" ? `Location: ${ans.city}` : `محل زندگی: ${ans.city}`);
  }
  if (idParts.length > 0) {
    parts.push(lang === "en" ? `👤 Identity & Context: ${idParts.join(" | ")}` : `👤 هویت و زمینه: ${idParts.join(" | ")}`);
  }

  // 2. Goals & Vision
  if (ans.main_goal) {
    parts.push(lang === "en" ? `🎯 Main 6-12M Goal: ${ans.main_goal}` : `🎯 مهم‌ترین هدف (۶-۱۲ ماه آینده): ${ans.main_goal}`);
  }
  if (Array.isArray(ans.life_areas) && ans.life_areas.length > 0) {
    parts.push(lang === "en" ? `📌 Priority Life Areas: ${ans.life_areas.join(", ")}` : `📌 حوزه‌های اولویت‌دار زندگی: ${ans.life_areas.join("، ")}`);
  }
  if (ans.long_dream) {
    parts.push(lang === "en" ? `🌟 5-Year Vision / Dream: ${ans.long_dream}` : `🌟 چشم‌انداز و رؤیای ۵ ساله: ${ans.long_dream}`);
  }

  // 3. Work & Energy Habits
  const workHabits: string[] = [];
  if (ans.energy_time) {
    workHabits.push(lang === "en" ? `Peak Energy Time: ${ans.energy_time}` : `زمان اوج انرژی روزانه: ${ans.energy_time}`);
  }
  if (Array.isArray(ans.learning_style) && ans.learning_style.length > 0) {
    workHabits.push(lang === "en" ? `Learning Style: ${ans.learning_style.join(", ")}` : `سبک یادگیری ترجیحی: ${ans.learning_style.join("، ")}`);
  }
  if (ans.hobbies) {
    workHabits.push(lang === "en" ? `Hobbies: ${ans.hobbies}` : `علایق و اوقات فراغت: ${ans.hobbies}`);
  }
  if (workHabits.length > 0) {
    parts.push(lang === "en" ? `⚡ Energy & Learning Habits: ${workHabits.join(" | ")}` : `⚡ ریتم انرژی و عادات: ${workHabits.join(" | ")}`);
  }

  // 4. Challenges, Blockers & Stress
  const challengeParts: string[] = [];
  if (ans.biggest_challenge) {
    challengeParts.push(lang === "en" ? `Current Challenge: ${ans.biggest_challenge}` : `چالش اصلی فعلی: ${ans.biggest_challenge}`);
  }
  if (Array.isArray(ans.blockers) && ans.blockers.length > 0) {
    challengeParts.push(lang === "en" ? `Common Blockers: ${ans.blockers.join(", ")}` : `موانع پیشرفت: ${ans.blockers.join("، ")}`);
  }
  if (ans.stress_level) {
    challengeParts.push(lang === "en" ? `Daily Stress Level: ${ans.stress_level}` : `سطح استرس روزمره: ${ans.stress_level}`);
  }
  if (challengeParts.length > 0) {
    parts.push(lang === "en" ? `🚧 Challenges & Blockers: ${challengeParts.join(" | ")}` : `🚧 چالش‌ها و موانع: ${challengeParts.join(" | ")}`);
  }

  // 5. Core Values & Meaning
  const valParts: string[] = [];
  if (Array.isArray(ans.core_values) && ans.core_values.length > 0) {
    valParts.push(lang === "en" ? `Core Values: ${ans.core_values.join(", ")}` : `ارزش‌های بنیادین: ${ans.core_values.join("، ")}`);
  }
  if (ans.meaning) {
    valParts.push(lang === "en" ? `Life Meaning: ${ans.meaning}` : `معنابخش زندگی: ${ans.meaning}`);
  }
  if (valParts.length > 0) {
    parts.push(lang === "en" ? `💎 Core Values & Purpose: ${valParts.join(" | ")}` : `💎 ارزش‌ها و معنای زندگی: ${valParts.join(" | ")}`);
  }

  // 6. Relationships & Support
  const rels: string[] = [];
  if (ans.marital) rels.push(lang === "en" ? `Marital: ${ans.marital}` : `وضعیت تأهل: ${ans.marital}`);
  if (ans.kids) rels.push(lang === "en" ? `Kids: ${ans.kids}` : `فرزند: ${ans.kids}`);
  if (ans.support_circle) rels.push(lang === "en" ? `Support Circle: ${ans.support_circle}` : `حامیان زندگی: ${ans.support_circle}`);
  if (rels.length > 0) {
    parts.push(lang === "en" ? `👨‍👩‍👧 Social Support Context: ${rels.join(" | ")}` : `👨‍👩‍👧 بستر روابط و حامیان: ${rels.join(" | ")}`);
  }

  // 7. Free text note from user
  if (row.free_text?.trim()) {
    parts.push(lang === "en" ? `📝 User Self-Note: ${row.free_text.trim()}` : `📝 یادداشت تکمیلی کاربر: ${row.free_text.trim()}`);
  }

  // 8. AI Analysis results (if available)
  if (row.ai_analysis) {
    const a = row.ai_analysis;
    if (a.summary) {
      parts.push(lang === "en" ? `📋 AI Profile Summary: ${a.summary}` : `📋 خلاصه تحلیل پیشین درباره من: ${a.summary}`);
    }
    if (a.themes?.length) {
      parts.push(lang === "en" ? `🏷️ Key Life Themes: ${a.themes.join(", ")}` : `🏷️ تم‌های محوری: ${a.themes.join("، ")}`);
    }
    if (a.strengths?.length) {
      parts.push(lang === "en" ? `💪 Strengths: ${a.strengths.join(", ")}` : `💪 نقاط قوت کلیدی: ${a.strengths.join("، ")}`);
    }
    if (a.risks?.length) {
      parts.push(lang === "en" ? `⚠️ Identified Friction Areas: ${a.risks.join(", ")}` : `⚠️ نقاط اصطکاک و چالش: ${a.risks.join("، ")}`);
    }
  }

  return parts;
}

export function getAboutMeAIPromptDirectives(lang: "fa" | "en" = "fa"): string {
  if (lang === "en") {
    return [
      "AI Guidelines for Personalization & Decision Support:",
      "- Seamlessly adapt your tone, coaching style, and recommendations to the user's role, age bracket, and core values.",
      "- Schedule & Task Pacing: Schedule demanding cognitive tasks around the user's peak energy window whenever applicable.",
      "- Barrier Sensitivity: When breaking down tasks or coaching, proactively mitigate the user's reported blockers (e.g. perfectionism, anxiety, distraction) with bite-sized, low-friction starter steps.",
      "- Goal Alignment: Anchor suggestions and habit recommendations in their stated 6-12 month goals and 5-year vision.",
      "- Organic Application: Never awkwardly recite or parrot this profile verbatim; integrate it naturally and empathetically into your reasoning.",
    ].join("\n");
  }
  return [
    "دستورالعمل هوش مصنوعی برای بهره‌گیری از پروفایل «درباره من» در تصمیم‌گیری و پاسخ‌دهی:",
    "- لحن، پیشنهادات و سبک همراهی خود را با شغل، سن و ارزش‌های بنیادین کاربر همسو کن.",
    "- ریتم انرژی: تسک‌های نیازمند تمرکز عمیق را متناسب با زمان اوج انرژی روزانه کاربر پیشنهاد بده یا زمان‌بندی کن.",
    "- مدیریت موانع: هنگام خرد کردن اهداف یا ارائه مشورت، موانع اعلام‌شده کاربر (مانند کمال‌گرایی، خستگی یا اضطراب) را با ارائه گام‌های بسیار کوچک و بدون فشار مهار کن.",
    "- جهت‌گیری به سوی اهداف: تصمیم‌ها و اولویت‌بندی‌ها را به سمت هدف ۶-۱۲ ماهه و چشم‌انداز ۵ ساله او جهت بده.",
    "- رفتار طبیعی و همدلانه: اطلاعات پروفایل را به صورت ماشینی یا مستقیم برای کاربر بازگو نکن، بلکه اجازه بده در نوع استدلال و کلماتت به زیبایی حس شود.",
  ].join("\n");
}
