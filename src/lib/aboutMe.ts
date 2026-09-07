import { supabase } from "@/integrations/supabase/client";

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
  const { data } = await supabase.from("about_me" as any).select("*").eq("user_id", userId).maybeSingle();
  return (data as any) || null;
}

export async function saveAboutMe(userId: string, patch: Partial<AboutMeRow>) {
  const { error } = await supabase
    .from("about_me" as any)
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) throw error;
}
