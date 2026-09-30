// Apply UI scale + font size globally.
// NOTE: CSS `zoom` was removed because on mobile Chrome it forces a full
// re-layout of every node on each scroll/repaint, hurting INP & FPS.
// We now scale only the root font-size, which Tailwind's rem-based spacing
// follows naturally — same visual effect, ~zero layout cost.

export type FontSize = "small" | "medium" | "large" | "xlarge";

const FONT_PX: Record<FontSize, number> = {
  small: 14,
  medium: 16,
  large: 18,
  xlarge: 20,
};

const LS_FONT = "ui_font_size_v1";
const LS_SCALE = "ui_scale_v1";

function currentBasePx(): number {
  const root = document.documentElement;
  const size = (root.dataset.fontSize as FontSize | undefined) ?? "medium";
  return FONT_PX[size] ?? 16;
}

export function applyUIScale(scale: number) {
  const s = Math.max(0.7, Math.min(1.5, Number(scale) || 1));
  const root = document.documentElement;
  // Clear any legacy zoom that older versions set.
  // @ts-ignore - non-standard
  if (root.style.zoom) root.style.zoom = "";
  root.dataset.uiScale = String(s);
  // Re-derive root font size = base * scale (rem cascade handles the rest).
  root.style.fontSize = `${currentBasePx() * s}px`;
  try { localStorage.setItem(LS_SCALE, String(s)); } catch {}
}

export function applyFontSize(size: FontSize) {
  const root = document.documentElement;
  root.dataset.fontSize = size;
  const scale = parseFloat(root.dataset.uiScale || "1") || 1;
  root.style.fontSize = `${FONT_PX[size] * scale}px`;
  try { localStorage.setItem(LS_FONT, size); } catch {}
}

/** Apply cached values immediately on app boot to avoid flicker. */
export function bootApplyUIPrefs() {
  try {
    const f = localStorage.getItem(LS_FONT) as FontSize | null;
    const s = localStorage.getItem(LS_SCALE);
    if (f) applyFontSize(f);
    if (s) applyUIScale(parseFloat(s));
  } catch { /* ignore */ }
}
