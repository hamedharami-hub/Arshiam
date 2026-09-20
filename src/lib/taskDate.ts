/** Parse task dates consistently in the user's local timezone.
 * Date-only Firestore values must not go through Date.parse (UTC), otherwise
 * they can move to the previous day in negative timezones.
 */
export function parseTaskDueDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly
    ? (() => { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day); })()
    : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function taskDueTimestamp(value: string | null | undefined): number {
  return parseTaskDueDate(value)?.getTime() ?? Number.POSITIVE_INFINITY;
}

/** Get a YYYY-MM-DD string in the user's local timezone (or specified timezone), never shifting day due to UTC */
export function getLocalDateString(date: Date = new Date(), timeZone?: string): string {
  if (isNaN(date.getTime())) return "";
  if (timeZone) {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

