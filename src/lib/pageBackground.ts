import { useCallback, useEffect, useState } from "react";

export const PAGE_COLORS = [
  { id: "rose", fa: "رز", en: "Rose", accent: "hsl(350 80% 60%)" },
  { id: "amber", fa: "کهربایی", en: "Amber", accent: "hsl(40 90% 55%)" },
  { id: "emerald", fa: "زمردی", en: "Emerald", accent: "hsl(150 60% 42%)" },
  { id: "sky", fa: "آسمانی", en: "Sky", accent: "hsl(200 85% 55%)" },
  { id: "violet", fa: "بنفش", en: "Violet", accent: "hsl(265 65% 62%)" },
  { id: "slate", fa: "خاکستری", en: "Slate", accent: "hsl(220 15% 50%)" },
] as const;

export type PageColorId = (typeof PAGE_COLORS)[number]["id"];
type PageBgMap = Record<string, PageColorId>;

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

export function savePageBackground(userId: string | null | undefined, pageKey: string, color: PageColorId | null) {
  const map = readPageBackgrounds(userId);
  if (color) map[pageKey] = color; else delete map[pageKey];
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(map));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

/** Soft tint that adapts to light, dark and OLED themes because it mixes into the theme background. */
export function pageTint(color: PageColorId | null | undefined): string | undefined {
  const entry = PAGE_COLORS.find((c) => c.id === color);
  return entry ? `color-mix(in srgb, ${entry.accent} 10%, hsl(var(--background)))` : undefined;
}

export function usePageBackground(userId: string | null | undefined, pageKey: string | null) {
  const [color, setColor] = useState<PageColorId | null>(() => (pageKey ? readPageBackgrounds(userId)[pageKey] ?? null : null));
  useEffect(() => {
    const sync = () => setColor(pageKey ? readPageBackgrounds(userId)[pageKey] ?? null : null);
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [userId, pageKey]);
  const set = useCallback((next: PageColorId | null) => { if (pageKey) savePageBackground(userId, pageKey, next); }, [userId, pageKey]);
  return { color, set };
}

export function pageKeyForPath(pathname: string): string | null {
  const parts = pathname.replace(/^\/app\/?/, "").split("/").filter(Boolean);
  if (!parts.length) return null;
  const [first, second] = parts;
  if (first === "folder" || first === "tasks" || first === "auth") return null;
  if (first === "tag" && second) return `tag:${second}`;
  return first;
}
