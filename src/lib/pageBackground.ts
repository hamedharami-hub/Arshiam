import { useCallback, useEffect, useState } from "react";
import { markUiPrefsChanged } from "./uiPrefsSync";

export const PAGE_COLORS = [
  { id: "rose", fa: "رز", en: "Rose", accent: "hsl(350 80% 60%)" },
  { id: "amber", fa: "کهربایی", en: "Amber", accent: "hsl(40 90% 55%)" },
  { id: "emerald", fa: "زمردی", en: "Emerald", accent: "hsl(150 60% 42%)" },
  { id: "sky", fa: "آسمانی", en: "Sky", accent: "hsl(200 85% 55%)" },
  { id: "violet", fa: "بنفش", en: "Violet", accent: "hsl(265 65% 62%)" },
  { id: "slate", fa: "خاکستری", en: "Slate", accent: "hsl(220 15% 50%)" },
] as const;

export type PageColorId = (typeof PAGE_COLORS)[number]["id"];
export type PageColorChoice = PageColorId | "none";
type PageBgMap = Record<string, PageColorChoice>;

const TASK_PAGES = new Set(["today", "inbox", "tomorrow", "next7", "smart", "tag", "kanban", "buckets", "calendar", "stats", "widgets", "pomodoro", "habits"]);
const KNOWLEDGE_PAGES = new Set(["knowledge", "notes", "diary", "pharmacy", "pharmacy-products", "pharmacy-scenario-practice", "pharmacy-fred-practice", "pharmacy-cyp", "interactive-study", "review", "continue"]);
const MIND_PAGES = new Set(["mind", "checkin", "thoughts", "abc", "socratic", "breathing", "sleep", "values", "life-architect", "worry", "cycle", "self", "about-me", "garden", "screener"]);

/** Gentle suggested tint per app section; users can override or turn it off per page. */
export function defaultPageColor(pageKey: string | null): PageColorId | null {
  if (!pageKey) return null;
  const first = pageKey.split(":")[0];
  if (TASK_PAGES.has(first)) return "sky";
  if (KNOWLEDGE_PAGES.has(first)) return "emerald";
  if (MIND_PAGES.has(first)) return "violet";
  return null;
}

const EVENT = "arshnaz:page-bg-updated";
const storageKey = (userId?: string | null) => `arshnaz_page_bg_v1_${userId || "guest"}`;

export function readPageBackgrounds(userId?: string | null): PageBgMap {
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey(userId)) || "{}");
    return parsed && typeof parsed === "object" ? (parsed as PageBgMap) : {};
  } catch {
    return {};
  }
}

export function savePageBackground(userId: string | null | undefined, pageKey: string, color: PageColorChoice | null) {
  const map = readPageBackgrounds(userId);
  if (color) map[pageKey] = color; else delete map[pageKey];
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
    markUiPrefsChanged(userId);
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

/** Soft tint that adapts to light, dark and OLED themes because it mixes into the theme background. */
export function pageTint(color: PageColorId | null | undefined, strength = 10): string | undefined {
  const entry = PAGE_COLORS.find((c) => c.id === color);
  return entry ? `color-mix(in srgb, ${entry.accent} ${strength}%, hsl(var(--background)))` : undefined;
}

export function usePageBackground(userId: string | null | undefined, pageKey: string | null) {
  const read = useCallback((): PageColorChoice | null => (pageKey ? readPageBackgrounds(userId)[pageKey] ?? null : null), [userId, pageKey]);
  const [stored, setStored] = useState<PageColorChoice | null>(read);
  useEffect(() => {
    const sync = () => setStored(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [read]);
  const suggested = defaultPageColor(pageKey);
  const color: PageColorId | null = stored === "none" ? null : stored ?? suggested;
  const isDefault = stored === null;
  const set = useCallback((next: PageColorChoice | null) => { if (pageKey) savePageBackground(userId, pageKey, next); }, [userId, pageKey]);
  return { color, stored, suggested, isDefault, set };
}

export function pageKeyForPath(pathname: string): string | null {
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return null;
  const [first, second] = parts;
  if (first === "folder" || first === "tasks" || first === "auth") return null;
  if (first === "tag" && second) return `tag:${second}`;
  return first;
}
