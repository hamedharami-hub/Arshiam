// Only durable app destinations may be restored. Never replay creation,
// sharing, assessment/session or action URLs on a later launch.
const ROUTES = new Set([
  "today", "tomorrow", "next7", "inbox", "smart", "notes", "diary", "garden",
  "pomodoro", "calendar", "contacts", "knowledge", "knowledge-mindmap",
  "interactive-study", "continue", "stats", "planning", "mind", "crisis", "self",
  "checkin", "thoughts", "calm", "breathing", "sleep", "values", "life-architect",
  "worry", "cycle", "about-me", "settings", "shared", "widgets", "tools",
]);
const SAFE_QUERY: Record<string, string[]> = {
  notes: ["folder", "tag", "select"], knowledge: ["docId", "folderId"],
  "knowledge-mindmap": ["docId", "folderId"], "interactive-study": ["docId", "folderId"],
  settings: ["tab"], thoughts: ["mode", "record"], widgets: ["widget"],
};

export function safeLastRoute(raw: string | null): string | null {
  if (!raw || raw.length > 2048 || !raw.startsWith("/app/") || /[\\\u0000-\u0020]/.test(raw)) return null;
  try {
    const url = new URL(raw, "https://app.invalid");
    const route = url.pathname.slice(5);
    if (!ROUTES.has(route) && !/^(folder|tag)\/[A-Za-z0-9_-]+$/.test(route)) return null;
    const query = new URLSearchParams();
    for (const key of SAFE_QUERY[route] || []) {
      const value = url.searchParams.get(key);
      if (value && /^[\p{L}\p{N}_-]{1,128}$/u.test(value)) query.set(key, value);
    }
    const search = query.toString();
    return url.pathname + (search ? `?${search}` : "");
  } catch { return null; }
}

const routeKey = (owner: string) => `last_route:${encodeURIComponent(owner)}`;
export function rememberLastRoute(owner: string | undefined, raw: string) {
  if (!owner) return;
  const route = safeLastRoute(raw);
  try {
    // Unattributed legacy values cannot safely be migrated to any account.
    localStorage.removeItem("last_route");
    if (route) localStorage.setItem(routeKey(owner), route);
  } catch { /* Storage may be unavailable. Navigation must still work. */ }
}
export function readLastRoute(owner: string): string | null {
  try { return safeLastRoute(localStorage.getItem(routeKey(owner))); } catch { return null; }
}

export function navigationInteractionBlocked(target?: EventTarget | null): boolean {
  const editable = 'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-no-swipe-nav]';
  return Boolean(
    document.querySelector('[role="dialog"]:not([data-state="closed"]), [role="alertdialog"]:not([data-state="closed"]), [role="menu"]:not([data-state="closed"]), [aria-modal="true"], [data-vaul-drawer]:not([data-state="closed"])') ||
    document.body.style.pointerEvents === "none" ||
    document.getSelection()?.toString() ||
    document.activeElement?.closest(editable) ||
    (target instanceof Element && target.closest(editable))
  );
}

const TITLES: Record<string, [string, string]> = {
  today: ["امروز", "Today"], tomorrow: ["فردا", "Tomorrow"], inbox: ["صندوق ورودی", "Inbox"],
  next7: ["هفت روز آینده", "Next seven days"], notes: ["یادداشت‌ها", "Notes"],
  knowledge: ["پایگاه دانش", "Knowledge"], settings: ["تنظیمات", "Settings"],
  calendar: ["تقویم", "Calendar"], planning: ["برنامه‌ریزی", "Planning"],
  smart: ["فهرست هوشمند", "Smart list"], folder: ["پوشه", "Folder"], tag: ["برچسب", "Tag"],
  diary: ["دفتر روزانه", "Diary"], garden: ["باغ", "Garden"], pomodoro: ["تمرکز", "Focus timer"],
  contacts: ["مخاطبان", "Contacts"], "knowledge-mindmap": ["نقشه دانش", "Knowledge map"],
  "interactive-study": ["یادگیری تعاملی", "Interactive study"], continue: ["ادامه یادگیری", "Continue learning"],
  stats: ["آمار", "Statistics"], mind: ["ذهن", "Mind"], crisis: ["کمک فوری", "Crisis support"],
  self: ["خودشناسی", "Self knowledge"], checkin: ["ثبت حال", "Check-in"], thoughts: ["افکار", "Thought records"],
  calm: ["آرامش", "Calm"], breathing: ["تنفس", "Breathing"], sleep: ["خواب", "Sleep"],
  values: ["ارزش‌ها", "Values"], "life-architect": ["معمار زندگی", "Life architect"], worry: ["نگرانی", "Worry"],
  cycle: ["چرخه", "Cycle"], "about-me": ["درباره من", "About me"], shared: ["اشتراک‌ها", "Shared with me"],
  widgets: ["ابزارک‌ها", "Widgets"], widget: ["ابزارک", "Widget"], tools: ["ابزارها", "Tools"],
  tasks: ["جزئیات کار", "Task details"], new: ["ایجاد مورد جدید", "Create new item"],
  recall: ["مرور", "Recall"], screener: ["ارزیابی", "Assessment"], admin: ["مدیریت", "Administration"],
  "share-target": ["دریافت اشتراک", "Receive shared content"], "rewrite-article": ["بازنویسی مقاله", "Rewrite article"],
};
export function routeTitle(pathname: string, isEn: boolean): string {
  const key = pathname.split("/")[2];
  return TITLES[key]?.[isEn ? 1 : 0] || (isEn ? "Page content" : "محتوای صفحه");
}
