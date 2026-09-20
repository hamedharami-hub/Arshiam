import { useCallback, useEffect, useState } from "react";

export type SidebarQuickLinkGroup = "core" | "do" | "grow" | "mind" | "me";

export type SidebarQuickLink = {
  url: string;
  labelFa: string;
  labelEn: string;
  group: SidebarQuickLinkGroup;
  required?: boolean;
};

export const GROUP_LABELS: Record<SidebarQuickLinkGroup, { fa: string; en: string }> = {
  core: { fa: "اصلی و ساختار", en: "Core & Structure" },
  do: { fa: "انجام دادن", en: "Do" },
  grow: { fa: "رشد", en: "Grow" },
  mind: { fa: "ذهن", en: "Mind" },
  me: { fa: "خودِ من", en: "Me" },
};

export const SIDEBAR_QUICK_LINKS_KEY = "arshnaz_sidebar_quick_links_v1";
export const SIDEBAR_QUICK_LINKS_EVENT = "arshnaz:sidebar-quick-links-changed";

// Today and Menu remain permanently pinned at the top of the compact rail.
export const SIDEBAR_QUICK_LINK_OPTIONS: SidebarQuickLink[] = [
  // 1. Core / Structure
  { url: "/app/today", labelFa: "امروز", labelEn: "Today", group: "core", required: true },
  { url: "__folders", labelFa: "فولدرها", labelEn: "Folders", group: "core" },
  { url: "__tags", labelFa: "تگ‌ها", labelEn: "Tags", group: "core" },

  // 2. Do (انجام دادن)
  { url: "/app/inbox", labelFa: "صندوق ورودی", labelEn: "Inbox", group: "do" },
  { url: "/app/tomorrow", labelFa: "فردا", labelEn: "Tomorrow", group: "do" },
  { url: "/app/next7", labelFa: "۷ روز آینده", labelEn: "Next 7 Days", group: "do" },
  { url: "/app/calendar", labelFa: "تقویم", labelEn: "Calendar", group: "do" },
  { url: "/app/widgets", labelFa: "ویجت‌ها", labelEn: "Widgets", group: "do" },
  { url: "/app/buckets", labelFa: "بازه‌های کلی", labelEn: "Time Buckets", group: "do" },
  { url: "/app/smart", labelFa: "لیست‌های هوشمند", labelEn: "Smart Lists", group: "do" },
  { url: "/app/pomodoro", labelFa: "پومودورو", labelEn: "Pomodoro", group: "do" },
  { url: "/app/stats", labelFa: "آمار و خلاصه", labelEn: "Stats & Summary", group: "do" },

  // 3. Grow (رشد)
  { url: "/app/life-architect", labelFa: "معمار زندگی", labelEn: "Life Architect", group: "grow" },
  { url: "/app/garden", labelFa: "باغ رشد", labelEn: "Garden", group: "grow" },
  { url: "/app/habits", labelFa: "عادت‌ها", labelEn: "Habits", group: "grow" },
  { url: "/app/notes", labelFa: "نوت‌ها", labelEn: "Notes", group: "grow" },
  { url: "/app/cycle", labelFa: "سیکل پریود", labelEn: "Period Cycle", group: "grow" },

  // 4. Mind (ذهن)
  { url: "/app/mind", labelFa: "داشبورد ذهن", labelEn: "Mind Dashboard", group: "mind" },
  { url: "/app/checkin", labelFa: "چک‌این روزانه", labelEn: "Daily Check-in", group: "mind" },
  { url: "/app/thoughts", labelFa: "ثبت افکار (CBT)", labelEn: "Thought Records (CBT)", group: "mind" },
  { url: "/app/abc", labelFa: "مدل ABC", labelEn: "ABC Model", group: "mind" },
  { url: "/app/socratic", labelFa: "چت سقراطی", labelEn: "Socratic Chat", group: "mind" },
  { url: "/app/breathing", labelFa: "تمرین تنفس ۳بعدی", labelEn: "3D Breathing", group: "mind" },

  // 5. Me (خودِ من)
  { url: "/app/about-me", labelFa: "درباره من", labelEn: "About Me", group: "me" },
  { url: "/app/self", labelFa: "خودشناسی", labelEn: "Self-Knowledge", group: "me" },
  { url: "/app/shared", labelFa: "اشتراک‌ها", labelEn: "Shared with me", group: "me" },
];

export const DEFAULT_QUICK_LINKS: string[] = [
  "/app/today",
  "/app/mind",
  "/app/notes",
  "/app/habits",
  "/app/calendar",
  "/app/inbox",
  "/app/next7",
  "/app/stats",
];
export const DEFAULT_SIDEBAR_QUICK_LINKS = DEFAULT_QUICK_LINKS;

export function normalizeSidebarQuickLinks(urls: unknown): string[] {
  const allowed = new Set(SIDEBAR_QUICK_LINK_OPTIONS.map((item) => item.url));
  const rawList = Array.isArray(urls)
    ? urls.filter((url): url is string => typeof url === "string" && allowed.has(url))
    : DEFAULT_QUICK_LINKS;

  // Filter out today first to avoid duplication
  const withoutToday = rawList.filter((u) => u !== "/app/today");

  // Keep unique order
  const uniqueUrls: string[] = [];
  for (const u of withoutToday) {
    if (!uniqueUrls.includes(u)) {
      uniqueUrls.push(u);
    }
  }

  // Today is always pinned at the start
  return ["/app/today", ...uniqueUrls];
}

export function getSidebarQuickLinks(): string[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_LINKS;
  try {
    const raw = localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY);
    return raw ? normalizeSidebarQuickLinks(JSON.parse(raw)) : DEFAULT_QUICK_LINKS;
  } catch {
    return DEFAULT_QUICK_LINKS;
  }
}

export function setSidebarQuickLinks(urls: string[]): void {
  const next = normalizeSidebarQuickLinks(urls);
  try {
    localStorage.setItem(SIDEBAR_QUICK_LINKS_KEY, JSON.stringify(next));
  } catch {
    /* storage is optional */
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SIDEBAR_QUICK_LINKS_EVENT, { detail: next }));
  }
}

export function moveSidebarQuickLink(url: string, direction: "up" | "down"): string[] {
  if (url === "/app/today") return getSidebarQuickLinks(); // Today is pinned at index 0
  const current = getSidebarQuickLinks();
  const idx = current.indexOf(url);
  if (idx <= 1 && direction === "up") return current; // Cannot move before Today (index 0)
  if (idx === -1 || (idx === current.length - 1 && direction === "down")) return current;

  const next = [...current];
  const targetIdx = direction === "up" ? idx - 1 : idx + 1;
  const temp = next[idx];
  next[idx] = next[targetIdx];
  next[targetIdx] = temp;

  setSidebarQuickLinks(next);
  return next;
}

export function toggleSidebarQuickLink(url: string, enabled: boolean): string[] {
  if (url === "/app/today") return getSidebarQuickLinks(); // Today cannot be disabled
  const current = getSidebarQuickLinks();
  let next: string[];
  if (enabled) {
    if (!current.includes(url)) {
      next = [...current, url];
    } else {
      next = current;
    }
  } else {
    next = current.filter((u) => u !== url);
  }
  setSidebarQuickLinks(next);
  return next;
}

export function resetSidebarQuickLinks(): string[] {
  setSidebarQuickLinks(DEFAULT_QUICK_LINKS);
  return DEFAULT_QUICK_LINKS;
}

export function useSidebarQuickLinks() {
  const [quickLinks, setQuickLinks] = useState<string[]>(getSidebarQuickLinks);

  useEffect(() => {
    const refresh = () => setQuickLinks(getSidebarQuickLinks());
    window.addEventListener(SIDEBAR_QUICK_LINKS_EVENT, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(SIDEBAR_QUICK_LINKS_EVENT, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const update = useCallback((urls: string[]) => setSidebarQuickLinks(urls), []);
  const move = useCallback((url: string, direction: "up" | "down") => moveSidebarQuickLink(url, direction), []);
  const toggle = useCallback((url: string, enabled: boolean) => toggleSidebarQuickLink(url, enabled), []);
  const reset = useCallback(() => resetSidebarQuickLinks(), []);

  return { quickLinks, setQuickLinks: update, moveQuickLink: move, toggleQuickLink: toggle, resetQuickLinks: reset };
}
