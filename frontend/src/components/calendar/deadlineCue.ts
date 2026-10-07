const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

export type DeadlineCue = { state: "approaching" | "overdue"; daysRemaining: number };

function civilDayNumber(value: string): number | null {
  const match = DATE_ONLY.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const timestamp = Date.UTC(year, month - 1, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month - 1 || parsed.getUTCDate() !== day) return null;
  return Math.floor(timestamp / DAY_MS);
}

/** Compares date-only values as local civil dates; no UTC instant is parsed from the deadline. */
export function deadlineCue(
  deadlineDate: string | null | undefined,
  task: { completed?: boolean; status?: string },
  now = new Date(),
): DeadlineCue | null {
  if (!deadlineDate || task.completed || task.status === "done" || task.status === "wont_do") return null;
  const deadlineDay = civilDayNumber(deadlineDate);
  if (deadlineDay == null) return null;
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
  const todayDay = civilDayNumber(today);
  if (todayDay == null) return null;
  const daysRemaining = deadlineDay - todayDay;
  if (daysRemaining < 0) return { state: "overdue", daysRemaining };
  if (daysRemaining <= 7) return { state: "approaching", daysRemaining };
  return null;
}
