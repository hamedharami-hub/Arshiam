import { supabase } from "@/integrations/supabase/client";

export type StreakStats = {
  /** Consecutive days (ending today or yesterday) with at least one completed task. */
  streak: number;
  /** Whether the user has already completed a task today. */
  activeToday: boolean;
  /** Number of tasks completed in the current week (last 7 days incl. today). */
  weekCompleted: number;
  /** Completed tasks per day for the last 7 days, oldest → newest. */
  last7: number[];
};

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Computes the current completion streak and weekly stats from a user's
 * completed tasks. A day "counts" toward the streak if at least one task was
 * completed on it. The streak stays alive if today has no completions yet but
 * yesterday did (so the user isn't punished mid-day).
 */
export async function computeStreak(userId: string): Promise<StreakStats> {
  const since = new Date();
  since.setHours(0, 0, 0, 0);
  since.setDate(since.getDate() - 60);

  const { data, error } = await supabase
    .from("tasks")
    .select("completed_at")
    .eq("user_id", userId)
    .eq("completed", true)
    .gte("completed_at", since.toISOString())
    .limit(2000);

  if (error || !data) {
    return { streak: 0, activeToday: false, weekCompleted: 0, last7: [0, 0, 0, 0, 0, 0, 0] };
  }

  const perDay = new Map<string, number>();
  for (const row of data) {
    const iso = (row as { completed_at: string | null }).completed_at;
    if (!iso) continue;
    const key = dayKey(new Date(iso));
    perDay.set(key, (perDay.get(key) || 0) + 1);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayKey = dayKey(today);
  const activeToday = (perDay.get(todayKey) || 0) > 0;

  // Walk backwards from today counting consecutive active days.
  let streak = 0;
  const cursor = new Date(today);
  // If today has no completion yet, start counting from yesterday.
  if (!activeToday) cursor.setDate(cursor.getDate() - 1);
  while ((perDay.get(dayKey(cursor)) || 0) > 0) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const last7: number[] = [];
  let weekCompleted = 0;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const c = perDay.get(dayKey(d)) || 0;
    last7.push(c);
    weekCompleted += c;
  }

  return { streak, activeToday, weekCompleted, last7 };
}
