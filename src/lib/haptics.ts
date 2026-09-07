// Lightweight haptic feedback wrapper.
// Uses navigator.vibrate when available (Android Chrome / many WebViews).
// Silently no-ops on iOS Safari (which doesn't support Vibration API).
// Respects reduced-motion preference and a user opt-out flag in localStorage.

type HapticKind = "light" | "medium" | "success" | "warning" | "error";

const PATTERNS: Record<HapticKind, number | number[]> = {
  light: 8,
  medium: 14,
  success: [10, 40, 18],
  warning: [16, 60, 16],
  error: [22, 50, 22, 50, 22],
};

function isEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem("haptics_off") === "1") return false;
  } catch {}
  if (typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return false;
  try {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return false;
  } catch {}
  return true;
}

export function haptic(kind: HapticKind = "light") {
  if (!isEnabled()) return;
  try {
    navigator.vibrate(PATTERNS[kind]);
  } catch {}
}
