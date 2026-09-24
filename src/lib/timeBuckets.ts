// Time-bucket categorization for tasks.
// A bucket = (kind, calendar, anchor-date). It marks a task as belonging to a
// fuzzy time window (sub-day: morning/noon/afternoon/night, or multi-day: today, this week, this month, this quarter, this year)
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

export type SubDayBucketKind = "morning" | "noon" | "afternoon" | "night";
export type MultiDayBucketKind = "day" | "week" | "month" | "quarter" | "year";
export type BucketKind = MultiDayBucketKind | SubDayBucketKind;

export const SUB_DAY_BUCKET_KINDS: SubDayBucketKind[] = ["morning", "noon", "afternoon", "night"];
export const MULTI_DAY_BUCKET_KINDS: MultiDayBucketKind[] = ["day", "week", "month", "quarter", "year"];

export const ALL_BUCKET_KINDS: BucketKind[] = [
  "morning",
  "noon",
  "afternoon",
  "night",
  "day",
  "week",
  "month",
  "quarter",
  "year",
];

export const BUCKET_LEVEL: Record<BucketKind, number> = {
  morning: 1,
  noon: 1,
  afternoon: 1,
  night: 1,
  day: 2,
  week: 3,
  month: 4,
  quarter: 5,
  year: 6,
};

export function isSubDayBucket(kind: BucketKind): kind is SubDayBucketKind {
  return SUB_DAY_BUCKET_KINDS.includes(kind as SubDayBucketKind);
}

export function isMultiDayBucket(kind: BucketKind): kind is MultiDayBucketKind {
  return MULTI_DAY_BUCKET_KINDS.includes(kind as MultiDayBucketKind);
}

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
  try {
    localStorage.setItem(ENABLED_KEY, JSON.stringify(arr));
  } catch {}
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
  if (isSubDayBucket(kind) || kind === "day") return isoDate(now);

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
  if (isSubDayBucket(kind) || kind === "day") return isoDate(d);

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

/** Returns exact start and end ISO dates (yyyy-mm-dd) of the bucket period. */
export function bucketRange(
  kind: BucketKind,
  calendar: CalendarSystem,
  anchor: string
): { start: string; end: string } {
  return {
    start: anchor,
    end: endOfBucket(kind, calendar, anchor),
  };
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
  const today = isoDate(new Date());
  const tomorrow = isoDate(addDays(new Date(), 1));

  // Sub-day buckets
  if (isSubDayBucket(kind)) {
    const subLabels: Record<SubDayBucketKind, { fa: string; en: string }> = {
      morning: { fa: "صبح", en: "Morning" },
      noon: { fa: "ظهر", en: "Noon" },
      afternoon: { fa: "عصر", en: "Afternoon" },
      night: { fa: "شب", en: "Night" },
    };
    const sl = subLabels[kind];
    if (anchor === today) {
      return fa ? `${sl.fa} امروز` : `${sl.en} Today`;
    }
    if (anchor === tomorrow) {
      return fa ? `${sl.fa} فردا` : `${sl.en} Tomorrow`;
    }
    const dateFormatted = calendar === "jalali"
      ? toPersianDigits(jFormat(d, "d MMMM"))
      : gFormat(d, "d MMM");
    return fa ? `${sl.fa} (${dateFormatted})` : `${sl.en} (${dateFormatted})`;
  }

  // Day bucket
  if (kind === "day") {
    if (anchor === today) return fa ? "امروز" : "Today";
    if (anchor === tomorrow) return fa ? "فردا" : "Tomorrow";
    return calendar === "jalali"
      ? toPersianDigits(jFormat(d, "d MMMM"))
      : gFormat(d, "d MMM");
  }

  // Week bucket
  if (kind === "week") {
    const end = endOfBucket(kind, calendar, anchor);
    const a = new Date(anchor + "T00:00:00");
    const b = new Date(end + "T00:00:00");
    if (calendar === "jalali") {
      return `${toPersianDigits(jFormat(a, "d"))} – ${toPersianDigits(jFormat(b, "d MMMM"))}`;
    }
    return `${gFormat(a, "d")} – ${gFormat(b, "d MMM")}`;
  }

  // Month bucket
  if (kind === "month") {
    return calendar === "jalali"
      ? toPersianDigits(jFormat(d, "MMMM yyyy"))
      : gFormat(d, "MMMM yyyy");
  }

  // Quarter bucket
  if (kind === "quarter") {
    if (calendar === "jalali") {
      const q = Math.floor(d.getMonth() / 3);
      const seasons = ["بهار", "تابستان", "پاییز", "زمستان"];
      const yr = toPersianDigits(jFormat(d, "yyyy"));
      return `${seasons[q]} ${yr}`;
    }
    return gFormat(d, "QQQ yyyy");
  }

  // Year bucket
  return calendar === "jalali"
    ? toPersianDigits(jFormat(d, "yyyy"))
    : gFormat(d, "yyyy");
}

export function kindLabel(kind: BucketKind, lang: "fa" | "en" = "fa"): string {
  if (lang === "en") {
    return {
      morning: "Morning",
      noon: "Noon",
      afternoon: "Afternoon",
      night: "Night",
      day: "Today",
      week: "This Week",
      month: "This Month",
      quarter: "This Quarter",
      year: "This Year",
    }[kind];
  }
  return {
    morning: "صبح",
    noon: "ظهر",
    afternoon: "عصر",
    night: "شب",
    day: "امروز",
    week: "این هفته",
    month: "این ماه",
    quarter: "این فصل",
    year: "امسال",
  }[kind];
}

export interface BucketFilterOptions {
  scopeKind: BucketKind;
  calendar?: CalendarSystem;
  anchor?: string;
  hierarchical?: boolean; // default: true (includes nested sub-buckets and exact dated tasks)
  selectedBucketKinds?: BucketKind[]; // for strict multi-filtering
}

export interface BucketMatchResult {
  matches: boolean;
  matchReason: "exact_due_date" | "direct_bucket" | "nested_bucket" | "none";
  displayBadge?: string;
}

/**
 * Checks whether a task falls into a target time bucket scope.
 * Supports:
 * 1. Exact due_date falling into the time range
 * 2. Direct bucket assignment
 * 3. Hierarchical inclusion of smaller buckets (e.g. sub-day inside day/week, week inside month, month inside quarter)
 */
export function doesTaskMatchBucketScope(
  task: {
    due_date?: string | null;
    bucket_kind?: BucketKind | null;
    bucket_calendar?: CalendarSystem | null;
    bucket_anchor?: string | null;
  },
  options: BucketFilterOptions
): BucketMatchResult {
  const cal = options.calendar || getCalendarSystem();
  const anchor = options.anchor || currentAnchor(options.scopeKind, cal);
  const hierarchical = options.hierarchical ?? true;

  // 1. Strict filtering mode (when user selected specific filter kinds or disabled hierarchical inclusion)
  if (!hierarchical || (options.selectedBucketKinds && options.selectedBucketKinds.length > 0)) {
    const targetKinds = options.selectedBucketKinds && options.selectedBucketKinds.length > 0
      ? options.selectedBucketKinds
      : [options.scopeKind];

    if (task.bucket_kind && targetKinds.includes(task.bucket_kind)) {
      if (!task.bucket_anchor || task.bucket_anchor === anchor) {
        return {
          matches: true,
          matchReason: "direct_bucket",
          displayBadge: kindLabel(task.bucket_kind),
        };
      }
    }
    return { matches: false, matchReason: "none" };
  }

  // 2. Hierarchical & combined mode
  const scopeRange = bucketRange(options.scopeKind, cal, anchor);

  // A. Check exact due date
  if (task.due_date) {
    const taskDateStr = task.due_date.slice(0, 10);
    if (taskDateStr >= scopeRange.start && taskDateStr <= scopeRange.end) {
      return {
        matches: true,
        matchReason: "exact_due_date",
        displayBadge: undefined,
      };
    }
  }

  // B. Check direct bucket match
  if (task.bucket_kind === options.scopeKind) {
    if (!task.bucket_anchor || task.bucket_anchor === anchor) {
      return {
        matches: true,
        matchReason: "direct_bucket",
        displayBadge: kindLabel(task.bucket_kind),
      };
    }
  }

  // C. Check hierarchical inclusion of smaller nested buckets
  if (task.bucket_kind) {
    const taskLevel = BUCKET_LEVEL[task.bucket_kind];
    const scopeLevel = BUCKET_LEVEL[options.scopeKind];

    if (taskLevel < scopeLevel) {
      const taskAnchor = task.bucket_anchor || currentAnchor(task.bucket_kind, cal);
      if (taskAnchor >= scopeRange.start && taskAnchor <= scopeRange.end) {
        return {
          matches: true,
          matchReason: "nested_bucket",
          displayBadge: kindLabel(task.bucket_kind),
        };
      }
    }
  }

  return { matches: false, matchReason: "none" };
}

export interface BucketFilterSettings {
  hierarchical: boolean;
  activeCategory: "multi_day" | "sub_day";
  strictKinds: BucketKind[];
}

const BUCKET_SETTINGS_KEY = "arshnaz_bucket_filter_settings_v1";

export function getBucketFilterSettings(): BucketFilterSettings {
  try {
    const raw = localStorage.getItem(BUCKET_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        hierarchical: parsed.hierarchical ?? true,
        activeCategory: parsed.activeCategory === "sub_day" ? "sub_day" : "multi_day",
        strictKinds: Array.isArray(parsed.strictKinds)
          ? parsed.strictKinds.filter((k: any) => ALL_BUCKET_KINDS.includes(k))
          : [],
      };
    }
  } catch {}
  return {
    hierarchical: true,
    activeCategory: "multi_day",
    strictKinds: [],
  };
}

export function saveBucketFilterSettings(settings: Partial<BucketFilterSettings>): BucketFilterSettings {
  try {
    const current = getBucketFilterSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(BUCKET_SETTINGS_KEY, JSON.stringify(updated));
    return updated;
  } catch {}
  return {
    hierarchical: true,
    activeCategory: "multi_day",
    strictKinds: [],
  };
}
