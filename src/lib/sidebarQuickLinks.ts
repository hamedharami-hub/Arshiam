import { useCallback, useEffect, useState } from "react";

export type SidebarQuickLink = {
  url: string;
  labelFa: string;
  labelEn: string;
  required?: boolean;
};

export const SIDEBAR_QUICK_LINKS_KEY = "arshnaz_sidebar_quick_links_v1";
export const SIDEBAR_QUICK_LINKS_EVENT = "arshnaz:sidebar-quick-links-changed";

// Today remains reachable in the compact rail; Settings is permanently available in the footer.
export const SIDEBAR_QUICK_LINK_OPTIONS: SidebarQuickLink[] = [
  { url: "/app/today", labelFa: "امروز", labelEn: "Today", required: true },
  { url: "/app/inbox", labelFa: "صندوق ورودی", labelEn: "Inbox" },
  { url: "/app/tomorrow", labelFa: "فردا", labelEn: "Tomorrow" },
  { url: "/app/next7", labelFa: "۷ روز آینده", labelEn: "Next 7 Days" },
  { url: "/app/calendar", labelFa: "تقویم", labelEn: "Calendar" },
  { url: "/app/notes", labelFa: "نوت‌ها", labelEn: "Notes" },
  { url: "/app/habits", labelFa: "عادت‌ها", labelEn: "Habits" },
  { url: "/app/mind", labelFa: "داشبورد ذهن", labelEn: "Mind Dashboard" },
  { url: "/app/life-architect", labelFa: "معمار زندگی", labelEn: "Life Architect" },
  { url: "/app/pomodoro", labelFa: "پومودورو", labelEn: "Pomodoro" },
  { url: "/app/stats", labelFa: "آمار و خلاصه", labelEn: "Stats & Summary" },
];

const DEFAULT_QUICK_LINKS = [
  "/app/today", "/app/inbox", "/app/next7", "/app/calendar", "/app/notes", "/app/habits", "/app/mind", "/app/stats",
];

function normalize(urls: unknown): string[] {
  const allowed = new Set(SIDEBAR_QUICK_LINK_OPTIONS.map((item) => item.url));
  const chosen = Array.isArray(urls)
    ? urls.filter((url): url is string => typeof url === "string" && allowed.has(url))
    : DEFAULT_QUICK_LINKS;
  const withToday = chosen.includes("/app/today") ? chosen : ["/app/today", ...chosen];
  return SIDEBAR_QUICK_LINK_OPTIONS.map((item) => item.url).filter((url) => withToday.includes(url));
}

export function getSidebarQuickLinks(): string[] {
  if (typeof window === "undefined") return DEFAULT_QUICK_LINKS;
  try {
    const raw = localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY);
    return raw ? normalize(JSON.parse(raw)) : DEFAULT_QUICK_LINKS;
  } catch {
    return DEFAULT_QUICK_LINKS;
  }
}

export function setSidebarQuickLinks(urls: string[]): void {
  const next = normalize(urls);
  try { localStorage.setItem(SIDEBAR_QUICK_LINKS_KEY, JSON.stringify(next)); } catch { /* storage is optional */ }
  window.dispatchEvent(new CustomEvent(SIDEBAR_QUICK_LINKS_EVENT, { detail: next }));
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
  return { quickLinks, setQuickLinks: update };
}
