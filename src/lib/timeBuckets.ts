// Time-bucket categorization for tasks.
// A bucket = (kind, calendar, anchor-date). It marks a task as belonging to a
// fuzzy time window (today, this week, this month, this quarter, this year, …)
// without committing to a specific clock time.

import {
  startOfWeek as gStartOfWeek,
  startOfMonth as gStartOfMonth,
  startOfQuarter as gStartOfQuarter,
  startOfYear as gStartOfYear,
  endOfWeek as gEndOfWeek,
  endOfMonth as gEndOfMonth,
  endOfQuarter as gEndOfQuarter,
  endOfYear as gEndOfYear,
  format as gFormat,
  addDays,
} from "date-fns";
import {
  startOfWeek as jStartOfWeek,
  startOfMonth as jStartOfMonth,
  startOfQuarter as jStartOfQuarter,
  startOfYear as jStartOfYear,
  endOfWeek as jEndOfWeek,
  endOfMonth as jEndOfMonth,
  endOfQuarter as jEndOfQuarter,
  endOfYear as jEndOfYear,
  format as jFormat,
} from "date-fns-jalali";
import { getCalendarSystem, toPersianDigits, type CalendarSystem } from "@/lib/jalali";

export type BucketKind = "day" | "week" | "month" | "quarter" | "year";

export const ALL_BUCKET_KINDS: BucketKind[] = ["day", "week", "month", "quarter", "year"];

const ENABLED_KEY = "enabled_time_buckets_v1";

export function getEnabledBuckets(): BucketKind[] {
  try {
    const raw = localStorage.getItem(ENABLED_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.filter((x) => ALL_BUCKET_KINDS.includes(x));
    }
  } catch {}
  return ALL_BUCKET_KINDS;
}

export function setEnabledBuckets(arr: BucketKind[]) {
  try { localStorage.setItem(ENABLED_KEY, JSON.stringify(arr)); } catch {}
}

function isoDate(d: Date) {
  // local date as yyyy-mm-dd (avoid TZ drift)
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Anchor date for the current period of the given kind in the given calendar. */
export function currentAnchor(kind: BucketKind, calendar: CalendarSystem = getCalendarSystem()): string {
  const now = new Date();
  if (kind === "day") return isoDate(now);
  if (calendar === "jalali") {
    if (kind === "week") return isoDate(jStartOfWeek(now, { weekStartsOn: 6 }));
    if (kind === "month") return isoDate(jStartOfMonth(now));
    if (kind === "quarter") return isoDate(jStartOfQuarter(now));
    return isoDate(jStartOfYear(now));
  }
  if (kind === "week") return isoDate(gStartOfWeek(now, { weekStartsOn: 1 }));
  if (kind === "month") return isoDate(gStartOfMonth(now));
  if (kind === "quarter") return isoDate(gStartOfQuarter(now));
  return isoDate(gStartOfYear(now));
}

/** End anchor (last day) of the bucket the anchor belongs to. */
export function endOfBucket(kind: BucketKind, calendar: CalendarSystem, anchor: string): string {
  const d = new Date(anchor + "T00:00:00");
  if (kind === "day") return isoDate(d);
  if (calendar === "jalali") {
    if (kind === "week") return isoDate(jEndOfWeek(d, { weekStartsOn: 6 }));
    if (kind === "month") return isoDate(jEndOfMonth(d));
    if (kind === "quarter") return isoDate(jEndOfQuarter(d));
    return isoDate(jEndOfYear(d));
  }
  if (kind === "week") return isoDate(gEndOfWeek(d, { weekStartsOn: 1 }));
  if (kind === "month") return isoDate(gEndOfMonth(d));
  if (kind === "quarter") return isoDate(gEndOfQuarter(d));
  return isoDate(gEndOfYear(d));
}

/** Human-readable name. */
export function bucketLabel(
  kind: BucketKind,
  calendar: CalendarSystem,
  anchor: string,
  lang: "fa" | "en" = "fa",
): string {
  const d = new Date(anchor + "T00:00:00");
  const fa = lang === "fa";
  if (kind === "day") {
    const today = isoDate(new Date());
    const tomorrow = isoDate(addDays(new Date(), 1));
    if (anchor === today) return fa ? "امروز" : "Today";
    if (anchor === tomorrow) return fa ? "فردا" : "Tomorrow";
    return calendar === "jalali"
      ? toPersianDigits(jFormat(d, "d MMMM"))
      : gFormat(d, "d MMM");
  }
  if (kind === "week") {
    const end = endOfBucket(kind, calendar, anchor);
    const a = new Date(anchor + "T00:00:00");
    const b = new Date(end + "T00:00:00");
    if (calendar === "jalali") {
      return `${toPersianDigits(jFormat(a, "d"))} – ${toPersianDigits(jFormat(b, "d MMMM"))}`;
    }
    return `${gFormat(a, "d")} – ${gFormat(b, "d MMM")}`;
  }
  if (kind === "month") {
    return calendar === "jalali"
      ? toPersianDigits(jFormat(d, "MMMM yyyy"))
      : gFormat(d, "MMMM yyyy");
  }
  if (kind === "quarter") {
    if (calendar === "jalali") {
      // Persian seasons by quarter index
      const q = Math.floor(d.getMonth() / 3); // jalali quarter via date-fns-jalali alignment
      const seasons = ["بهار", "تابستان", "پاییز", "زمستان"];
      const yr = toPersianDigits(jFormat(d, "yyyy"));
      return `${seasons[q]} ${yr}`;
    }
    return gFormat(d, "QQQ yyyy");
  }
  // year
  return calendar === "jalali"
    ? toPersianDigits(jFormat(d, "yyyy"))
    : gFormat(d, "yyyy");
}

export function kindLabel(kind: BucketKind, lang: "fa" | "en" = "fa"): string {
  if (lang === "en") {
    return { day: "Day", week: "Week", month: "Month", quarter: "Quarter", year: "Year" }[kind];
  }
  return { day: "روز", week: "این هفته", month: "این ماه", quarter: "این فصل", year: "امسال" }[kind];
}
