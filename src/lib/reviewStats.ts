import type { LeitnerCard } from "./leitnerTypes";

function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type ForecastDay = { date: string; count: number };

/**
 * Predicted review load for the next `days` days (local calendar days).
 * Cards already overdue are counted on day 0 (today).
 */
export function forecastReviews(cards: Pick<LeitnerCard, "next_review_at">[], days = 14, now = new Date()): ForecastDay[] {
  const out: ForecastDay[] = [];
  const index = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    index.set(localKey(d), i);
    out.push({ date: localKey(d), count: 0 });
  }
  const today = localKey(now);
  for (const c of cards) {
    if (!c.next_review_at) continue;
    const due = new Date(c.next_review_at);
    if (Number.isNaN(due.getTime())) continue;
    const key = localKey(due);
    if (key <= today) out[0].count++;
    else {
      const i = index.get(key);
      if (i !== undefined) out[i].count++;
    }
  }
  return out;
}

export function reviewedTodayCount(cards: Pick<LeitnerCard, "last_reviewed_at">[], now = new Date()): number {
  const today = localKey(now);
  return cards.filter((c) => c.last_reviewed_at && localKey(new Date(c.last_reviewed_at)) === today).length;
}

/** Consecutive local days (ending today, or yesterday if nothing yet today) with ≥1 review. */
export function reviewStreak(reviewDates: string[], now = new Date()): number {
  const days = new Set(reviewDates.filter(Boolean).map((iso) => localKey(new Date(iso))));
  let cursor = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!days.has(localKey(cursor))) cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  let streak = 0;
  while (days.has(localKey(cursor))) {
    streak++;
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() - 1);
  }
  return streak;
}

/** Review-day log so streaks survive (cards only remember their latest review). */
const LOG_KEY = (uid: string) => `arsh_review_days_v1:${uid}`;
export function logReviewDay(uid: string, at = new Date()) {
  try {
    const list: string[] = JSON.parse(localStorage.getItem(LOG_KEY(uid)) || "[]");
    const key = localKey(at);
    if (!list.includes(key)) {
      list.push(key);
      localStorage.setItem(LOG_KEY(uid), JSON.stringify(list.slice(-400)));
    }
  } catch {}
}
export function getReviewDays(uid: string): string[] {
  try { return (JSON.parse(localStorage.getItem(LOG_KEY(uid)) || "[]") as string[]).map((k) => `${k}T12:00:00`); } catch { return []; }
}
