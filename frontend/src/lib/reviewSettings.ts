/** Retention preference shared by Knowledge cards. */

const RETENTION_KEY = "arsh_review_desired_retention_v1";
export const REVIEW_SETTINGS_EVENT = "arsh:review-settings";

export const MIN_RETENTION = 0.7;
export const MAX_RETENTION = 0.97;

export function clampRetention(v: number): number {
  if (!Number.isFinite(v)) return 0.9;
  return Math.min(MAX_RETENTION, Math.max(MIN_RETENTION, Math.round(v * 100) / 100));
}

export function getDesiredRetention(): number {
  try {
    const raw = localStorage.getItem(RETENTION_KEY);
    return raw ? clampRetention(Number(raw)) : 0.9;
  } catch {
    return 0.9;
  }
}

export function setDesiredRetention(v: number) {
  try { localStorage.setItem(RETENTION_KEY, String(clampRetention(v))); window.dispatchEvent(new Event(REVIEW_SETTINGS_EVENT)); } catch {}
}
