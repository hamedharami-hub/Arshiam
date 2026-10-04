/** Review (FSRS) user preferences, stored locally per device. */
import type { LeitnerRating } from "./leitnerTypes";

const RETENTION_KEY = "arsh_review_desired_retention_v1";
const GOAL_KEY = "arsh_review_daily_goal_v1";
const GESTURES_KEY = "arsh_review_gestures_v1";
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

export function getDailyGoal(): number {
  try {
    const n = Number(localStorage.getItem(GOAL_KEY));
    return Number.isFinite(n) && n > 0 ? Math.min(500, Math.round(n)) : 20;
  } catch {
    return 20;
  }
}

export function setDailyGoal(n: number) {
  try { localStorage.setItem(GOAL_KEY, String(Math.min(500, Math.max(1, Math.round(n))))); window.dispatchEvent(new Event(REVIEW_SETTINGS_EVENT)); } catch {}
}

export type SwipeDir = "right" | "left" | "up" | "down";
export type GestureSettings = {
  enabled: boolean;
  swipe: Record<SwipeDir, LeitnerRating | null>;
  doubleTapFlip: boolean;
  longPressEdit: boolean;
};

export const DEFAULT_GESTURES: GestureSettings = {
  enabled: true,
  swipe: { right: 3, left: 1, up: 4, down: 2 },
  doubleTapFlip: true,
  longPressEdit: true,
};

export function getGestureSettings(): GestureSettings {
  try {
    const raw = localStorage.getItem(GESTURES_KEY);
    if (!raw) return DEFAULT_GESTURES;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_GESTURES, ...parsed, swipe: { ...DEFAULT_GESTURES.swipe, ...(parsed.swipe || {}) } };
  } catch {
    return DEFAULT_GESTURES;
  }
}

export function setGestureSettings(g: GestureSettings) {
  try { localStorage.setItem(GESTURES_KEY, JSON.stringify(g)); window.dispatchEvent(new Event(REVIEW_SETTINGS_EVENT)); } catch {}
}

/** Pure: which swipe direction does a drag offset/velocity represent? */
export function detectSwipe(dx: number, dy: number, vx = 0, vy = 0, threshold = 90): SwipeDir | null {
  const horizontal = Math.abs(dx) >= Math.abs(dy);
  const d = horizontal ? dx : dy;
  const v = horizontal ? vx : vy;
  if (Math.abs(d) < threshold && Math.abs(v) < 600) return null;
  if (horizontal) return d > 0 ? "right" : "left";
  return d > 0 ? "down" : "up";
}
