import type { NoteItem } from "@/lib/firestoreDataService";
import type { MediaKind } from "@/lib/uploadMedia";

export type DiaryMood = "great" | "good" | "okay" | "low" | "bad";

export interface DiaryAttachment {
  id: string;
  url: string;
  kind: MediaKind;
  name: string;
  path?: string;
}

export type DiaryEntry = NoteItem & {
  kind: "diary";
  diary_date: string;
  diary_mood?: DiaryMood | null;
  diary_background: string;
  diary_photo_url?: string;
  diary_opacity: number;
  diary_blur?: number;
  diary_html?: string;
  diary_attachments?: DiaryAttachment[];
  diary_google_photos?: string[];
  diary_google_photos_url?: string;
};

export const DIARY_BACKGROUNDS = [
  { id: "paper", fa: "کاغذ کاهی", en: "Vintage paper", src: "/diary-bg/paper.jpg", tint: "bg-amber-50 dark:bg-stone-900" },
  { id: "watercolor", fa: "آبرنگ", en: "Watercolor", src: "/diary-bg/watercolor.jpg", tint: "bg-rose-50 dark:bg-slate-900" },
  { id: "garden", fa: "باغ بهاری", en: "Spring garden", src: "/diary-bg/garden.jpg", tint: "bg-pink-50 dark:bg-slate-900" },
  { id: "sea", fa: "ساحل آرام", en: "Calm shore", src: "/diary-bg/sea.jpg", tint: "bg-cyan-50 dark:bg-slate-900" },
  { id: "night", fa: "شب پرستاره", en: "Starry night", src: "/diary-bg/night.jpg", tint: "bg-indigo-50 dark:bg-slate-950" },
  { id: "cafe", fa: "کافهٔ گرم", en: "Cozy cafe", src: "/diary-bg/cafe.jpg", tint: "bg-orange-50 dark:bg-stone-900" },
  { id: "none", fa: "بدون تصویر", en: "No image", src: "", tint: "bg-card" },
] as const;

export const DIARY_MOODS: { id: DiaryMood; fa: string; en: string; color: string }[] = [
  { id: "great", fa: "عالی", en: "Great", color: "text-emerald-500" },
  { id: "good", fa: "خوب", en: "Good", color: "text-lime-500" },
  { id: "okay", fa: "معمولی", en: "Okay", color: "text-amber-500" },
  { id: "low", fa: "کم‌حال", en: "Low", color: "text-orange-500" },
  { id: "bad", fa: "سخت", en: "Hard", color: "text-rose-500" },
];

export function resolveBackground(entry: Pick<DiaryEntry, "diary_background" | "diary_photo_url">) {
  if (entry.diary_background === "custom" && entry.diary_photo_url) {
    return { id: "custom", src: entry.diary_photo_url, tint: "bg-card" };
  }
  return DIARY_BACKGROUNDS.find((item) => item.id === entry.diary_background) || DIARY_BACKGROUNDS[0];
}

export function newDiaryEntry(userId: string): DiaryEntry {
  const now = new Date();
  return {
    id: crypto.randomUUID(), user_id: userId, title: "", content: "", pinned: false,
    created_at: now.toISOString(), updated_at: now.toISOString(), task_id: null,
    kind: "diary", diary_date: now.toLocaleDateString("en-CA"), diary_mood: null,
    diary_background: "paper", diary_photo_url: "", diary_opacity: 35, diary_blur: 0,
    diary_html: "", diary_attachments: [], diary_google_photos: [],
  };
}

export const GOOGLE_PHOTOS_PATTERN = /^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com|lh3\.googleusercontent\.com)\//i;

export function isGooglePhotosUrl(url: string) {
  return GOOGLE_PHOTOS_PATTERN.test(url.trim());
}

export function isDirectGoogleImage(url: string) {
  return /^https:\/\/lh3\.googleusercontent\.com\//i.test(url.trim());
}

export function formatDiaryDate(date: string, isEn: boolean) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString(isEn ? "en-GB" : "fa-IR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}

export function diaryMonthKey(date: string, isEn: boolean) {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date.slice(0, 7);
  return parsed.toLocaleDateString(isEn ? "en-GB" : "fa-IR", { month: "long", year: "numeric" });
}

export function plainTextOf(markdown: string) {
  return markdown.replace(/[#*_>`~\-[\]()!]/g, " ").replace(/\s+/g, " ").trim();
}

export function wordCount(markdown: string) {
  const text = plainTextOf(markdown);
  return text ? text.split(" ").length : 0;
}
