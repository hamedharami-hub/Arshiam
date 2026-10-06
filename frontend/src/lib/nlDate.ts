// Lightweight natural-language date parser for the quick-add box.
// Understands common Persian and English phrases like "فردا ساعت ۵",
// "پس‌فردا", "next monday", "in 3 days at 9am" and returns a task date
// plus the title with the recognised words stripped out.

export type ParsedDate = {
  /** Local YYYY-MM-DD when only a day is named, or an ISO instant when an exact time is explicit. */
  dueDate: string | null;
  /** The input title with recognised date/time words removed. */
  cleanedTitle: string;
};

const FA_DIGITS: Record<string, string> = {
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
};

function normalizeDigits(s: string): string {
  return s.replace(/[۰-۹٠-٩]/g, (d) => FA_DIGITS[d] ?? d);
}

const PERSIAN_NUMBER_WORDS = ["یک", "یه", "دو", "سه", "چهار", "پنج", "شش", "شیش", "هفت", "هشت", "نه", "ده"];
const ENGLISH_NUMBER_WORDS: Record<string, number> = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10 };
const PERSIAN_NUMBER_VALUES: Record<string, number> = {
  "یک": 1, "یه": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5,
  "شش": 6, "شیش": 6, "هفت": 7, "هشت": 8, "نه": 9, "ده": 10,
};
const NUMBER_WORD_PATTERN = PERSIAN_NUMBER_WORDS.join("|");
const REPEATING_TASK_TEXT = /\b(?:every|each)\s+(?:(?:\d+|two|three|four|five)\s+)?(?:days?|weeks?|months?|years?|mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?)\b|\b(?:daily|weekly|monthly|yearly|annually)\b|روزانه|هفتگی|ماهانه|سالانه|هر\s+(?:(?:\d+|یک|یه|دو|سه|چهار|پنج|شش|شیش|هفت|هشت|نه|ده)\s*)?(?:روز|هفته|ماه|سال|دوشنبه|سه\u200cشنبه|چهارشنبه|پنج\u200cشنبه|جمعه|شنبه|یکشنبه)/i;

/** Whether task text explicitly describes a repeating cadence instead of a one-off date. */
export function hasExplicitRecurrenceText(value: string): boolean {
  return REPEATING_TASK_TEXT.test(normalizeDigits(value));
}

// JS getDay(): 0=Sunday … 6=Saturday
const WEEKDAYS: { day: number; names: string[] }[] = [
  { day: 6, names: ["شنبه", "saturday", "sat"] },
  { day: 0, names: ["یکشنبه", "یک‌شنبه", "sunday", "sun"] },
  { day: 1, names: ["دوشنبه", "دو‌شنبه", "monday", "mon"] },
  { day: 2, names: ["سه‌شنبه", "سه شنبه", "سهشنبه", "tuesday", "tue"] },
  { day: 3, names: ["چهارشنبه", "چهار‌شنبه", "wednesday", "wed"] },
  { day: 4, names: ["پنجشنبه", "پنج‌شنبه", "پنج شنبه", "thursday", "thu"] },
  { day: 5, names: ["جمعه", "friday", "fri"] },
];

function nextWeekday(from: Date, target: number, forceNext: boolean): Date {
  const d = new Date(from);
  d.setHours(0, 0, 0, 0);
  let delta = (target - d.getDay() + 7) % 7;
  if (delta === 0) delta = forceNext ? 7 : 7; // always the upcoming one, not today
  d.setDate(d.getDate() + delta);
  return d;
}

/**
 * Parses a task title for natural-language date/time hints.
 * Non-destructive: if nothing is recognised, returns the original title and a
 * null date. `now` is injectable for testing.
 */
export function parseNaturalDate(rawTitle: string, now: Date = new Date()): ParsedDate {
  const original = rawTitle;
  let working = normalizeDigits(rawTitle);
  // A weekday inside a repeating instruction ("every Monday") is not a
  // one-off due date. Leave recurrence to its own explicit field.
  if (hasExplicitRecurrenceText(working)) return { dueDate: null, cleanedTitle: original.trim() };
  let date: Date | null = null;
  let hasTime = false;
  let hours = 9;
  let minutes = 0;

  const strip = (re: RegExp) => {
    working = working.replace(re, " ");
  };

  const base = new Date(now);
  base.setHours(0, 0, 0, 0);

  // --- Relative day words ---
  if (/(پس\s*فردا|پس‌فردا)/.test(working) || /day after tomorrow/i.test(working)) {
    date = new Date(base); date.setDate(date.getDate() + 2);
    strip(/(پس\s*فردا|پس‌فردا)/g); strip(/day after tomorrow/gi);
  } else if (/فردا/.test(working) || /\btomorrow\b/i.test(working)) {
    date = new Date(base); date.setDate(date.getDate() + 1);
    strip(/فردا/g); strip(/\btomorrow\b/gi);
  } else if (/امروز/.test(working) || /\btoday\b/i.test(working) || /\btonight\b/i.test(working)) {
    date = new Date(base);
    strip(/امروز/g); strip(/\btoday\b/gi); strip(/\btonight\b/gi);
  }

  // --- "X روز دیگه/بعد" / "in X days" ---
  if (!date) {
    const faDays = working.match(new RegExp(`(${NUMBER_WORD_PATTERN}|\\d+)\\s*روز\\s*(دیگه|دیگر|بعد)`));
    const enDays = working.match(/in\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?/i);
    if (faDays) {
      const days = PERSIAN_NUMBER_VALUES[faDays[1]] ?? Number(faDays[1]);
      date = new Date(base); date.setDate(date.getDate() + days);
      strip(new RegExp(`(${NUMBER_WORD_PATTERN}|\\d+)\\s*روز\\s*(دیگه|دیگر|بعد)`, "g"));
    } else if (enDays) {
      const token = enDays[1].toLowerCase();
      const days = ENGLISH_NUMBER_WORDS[token] ?? Number(token);
      date = new Date(base); date.setDate(date.getDate() + days);
      strip(/in\s+(\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+days?/gi);
    }
  }

  // Explicit ISO calendar day. Preserve it as a day-only schedule unless the
  // user separately supplied a clock time below.
  if (!date) {
    const isoDay = working.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
    if (isoDay) {
      const year = Number(isoDay[1]); const month = Number(isoDay[2]); const day = Number(isoDay[3]);
      const candidate = new Date(year, month - 1, day);
      if (candidate.getFullYear() === year && candidate.getMonth() === month - 1 && candidate.getDate() === day) {
        date = candidate;
        strip(/\b\d{4}-\d{2}-\d{2}\b/g);
      }
    }
  }

  // --- Weekday names (optionally prefixed with next/بعد) ---
  // Persian letters break the ASCII \b boundary, so use Unicode-aware
  // lookarounds that also treat ZWNJ (\u200c) as part of a word.
  if (!date) {
    for (const wd of WEEKDAYS) {
      for (const name of wd.names) {
        const re = new RegExp(`(?<![\\p{L}\\u200c])(next\\s+)?${name}(?![\\p{L}\\u200c])`, "iu");
        if (re.test(working)) {
          date = nextWeekday(base, wd.day, true);
          strip(new RegExp(`(?<![\\p{L}\\u200c])(next\\s+)?${name}(?![\\p{L}\\u200c])`, "giu"));
          break;
        }
      }
      if (date) break;
    }
  }

  // --- Time: "ساعت ۵", "۵:۳۰", "at 5pm", "5:30" ---
  // Persian meridiem words
  const isPm = /(عصر|بعدازظهر|بعد از ظهر|شب)/.test(working);
  const isAm = /(صبح|بامداد)/.test(working);

  const faTime = working.match(/ساعت\s*(\d{1,2})(?:[:٫](\d{1,2}))?/);
  const enTime = working.match(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i)
    || working.match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/i);

  if (faTime) {
    hours = parseInt(faTime[1], 10);
    minutes = faTime[2] ? parseInt(faTime[2], 10) : 0;
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59 || hours > 23
      || ((isPm || isAm) && (hours < 1 || hours > 12))) {
      return { dueDate: null, cleanedTitle: original.trim() };
    }
    if (isPm && hours < 12) hours += 12;
    if (isAm && hours === 12) hours = 0;
    hasTime = true;
    strip(/ساعت\s*(\d{1,2})(?:[:٫](\d{1,2}))?/g);
    strip(/(عصر|بعدازظهر|بعد از ظهر|شب|صبح|بامداد)/g);
  } else if (enTime) {
    hours = parseInt(enTime[1], 10);
    minutes = enTime[2] ? parseInt(enTime[2], 10) : 0;
    const mer = (enTime[3] || "").toLowerCase();
    if (!Number.isInteger(hours) || !Number.isInteger(minutes) || minutes > 59 || hours > 23
      || (mer && (hours < 1 || hours > 12))) {
      return { dueDate: null, cleanedTitle: original.trim() };
    }
    if (mer === "pm" && hours < 12) hours += 12;
    if (mer === "am" && hours === 12) hours = 0;
    hasTime = true;
    strip(/\bat\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi);
    strip(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/gi);
  } else if (working.match(/ظهر|noon/)) {
    hasTime = true; hours = 12; minutes = 0;
    strip(/ظهر|noon/g);
  }

  // If a time was given but no date, assume today (or tomorrow if already past).
  if (!date && hasTime) {
    date = new Date(base);
    const candidate = new Date(base);
    candidate.setHours(hours, minutes, 0, 0);
    if (candidate.getTime() < now.getTime()) date.setDate(date.getDate() + 1);
  }

  if (!date) {
    return { dueDate: null, cleanedTitle: original.trim() };
  }

  const cleaned = working.replace(/\s{2,}/g, " ").replace(/\s+([،,.])/g, "$1").trim();
  if (!hasTime) {
    const day = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    return { dueDate: day, cleanedTitle: cleaned.length > 0 ? cleaned : original.trim() };
  }
  date.setHours(hours, minutes, 0, 0);
  return {
    dueDate: date.toISOString(),
    cleanedTitle: cleaned.length > 0 ? cleaned : original.trim(),
  };
}
