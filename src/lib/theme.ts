export type AppTheme = "system" | "paper-light" | "paper-dark" | "oled";
export type AccentColor = "indigo" | "olive" | "amber" | "steel" | "rose" | "brick";

export const APP_THEMES: AppTheme[] = ["system", "paper-light", "paper-dark", "oled"];
export const ACCENT_COLORS: AccentColor[] = ["indigo", "olive", "amber", "steel", "rose", "brick"];
export const DEFAULT_THEME: AppTheme = "paper-light";
export const DEFAULT_ACCENT: AccentColor = "indigo";

// Swatch previews (light-mode accent values) used by the settings picker.
export const ACCENT_SWATCH: Record<AccentColor, string> = {
  indigo: "hsl(232 38% 48%)",
  olive: "hsl(78 30% 36%)",
  amber: "hsl(36 70% 42%)",
  steel: "hsl(208 35% 42%)",
  rose: "hsl(350 32% 50%)",
  brick: "hsl(12 55% 45%)",
};

const THEME_KEY = "arshnaz-theme";
const ACCENT_KEY = "arshnaz-accent";

// Legacy theme ids (v1 aurora/pink/TickTick) → paper theme + closest accent.
const LEGACY_THEMES: Record<string, { theme: AppTheme; accent: AccentColor }> = {
  light: { theme: "paper-light", accent: "indigo" },
  dark: { theme: "paper-dark", accent: "indigo" },
  "ticktick-light": { theme: "paper-light", accent: "brick" },
  "arshnaz-light": { theme: "paper-light", accent: "rose" },
  "arshnaz-dark": { theme: "paper-dark", accent: "rose" },
};

export function normalizeTheme(t: string | null | undefined): AppTheme {
  if (!t) return DEFAULT_THEME;
  if ((APP_THEMES as string[]).includes(t)) return t as AppTheme;
  return LEGACY_THEMES[t]?.theme ?? DEFAULT_THEME;
}

export function getStoredAccent(): AccentColor {
  try {
    const raw = localStorage.getItem(ACCENT_KEY);
    if (raw && (ACCENT_COLORS as string[]).includes(raw)) return raw as AccentColor;
  } catch { void 0; }
  return DEFAULT_ACCENT;
}

export function applyAccent(accent: AccentColor | string | null | undefined) {
  const next = accent && (ACCENT_COLORS as string[]).includes(accent) ? (accent as AccentColor) : DEFAULT_ACCENT;
  document.documentElement.setAttribute("data-accent", next);
  try { localStorage.setItem(ACCENT_KEY, next); } catch { void 0; }
}

// Adopt the accent saved in cloud settings (chosen on another device).
export function syncAccentFromSettings(accent: string | null | undefined): boolean {
  if (!accent || !(ACCENT_COLORS as string[]).includes(accent) || accent === getStoredAccent()) return false;
  applyAccent(accent);
  return true;
}

function migrateLegacyAccent(t: string) {
  const legacy = LEGACY_THEMES[t];
  if (!legacy) return;
  let hasAccent = false;
  try { hasAccent = Boolean(localStorage.getItem(ACCENT_KEY)); } catch { void 0; }
  if (!hasAccent) applyAccent(legacy.accent);
}

export function applyTheme(t: AppTheme | string | null | undefined) {
  const root = document.documentElement;
  if (t) migrateLegacyAccent(t);
  const theme = normalizeTheme(t);
  root.classList.remove("theme-arshnaz", "theme-ticktick", "theme-oled");
  const prefersDark = typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  const dark = theme === "paper-dark" || theme === "oled" || (theme === "system" && prefersDark);
  root.classList.toggle("dark", dark);
  if (theme === "oled") root.classList.add("theme-oled");
  root.setAttribute("data-accent", getStoredAccent());
  try { localStorage.setItem(THEME_KEY, theme); } catch { void 0; }
}

export function getStoredTheme(): AppTheme | null {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) migrateLegacyAccent(raw);
    return raw ? normalizeTheme(raw) : null;
  } catch {
    return null;
  }
}

export function getBaseTheme(t: AppTheme | string | null | undefined): "light" | "dark" | "system" {
  const theme = normalizeTheme(t);
  if (theme === "system") return "system";
  return theme === "paper-light" ? "light" : "dark";
}
