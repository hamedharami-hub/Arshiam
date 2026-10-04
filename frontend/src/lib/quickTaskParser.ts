/**
 * Offline (no-AI) quick-add parser, Persian + English.
 *   "کار هفته بعد !بالا #تگ /فولدر"  ->  title "کار", next week, high, tag "تگ", folder "فولدر"
 *   "Call Sam tomorrow at 5pm !high #work /Office"
 */
import type { Priority } from "@/lib/priority";
import {
  addDaysLocal, fieldsForExact, fieldsForPeriod, nextPeriod, periodFor,
  type Horizon, type TimeFields, type TimeSettings,
} from "@/lib/timeHorizon";

export type ParsedQuickTask = {
  title: string;
  time: TimeFields | null;
  priority: Priority | null;
  tags: string[];
  folder: string | null;
  /** human-readable pieces that were recognised (for the live preview) */
  tokens: { kind: "time" | "priority" | "tag" | "folder"; text: string }[];
};

const PRIORITY_WORDS: Record<string, Priority> = {
  "فوری": "urgent", "خیلی‌فوری": "urgent", "urgent": "urgent", "!": "urgent", "1": "urgent",
  "بالا": "high", "زیاد": "high", "مهم": "high", "high": "high", "2": "high",
  "متوسط": "medium", "medium": "medium", "med": "medium", "3": "medium",
  "پایین": "low", "کم": "low", "low": "low", "4": "low",
};

const toLatinDigits = (s: string) =>
  s.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

type PhraseRule = { re: RegExp; horizon: Horizon; offset: number; dayOffset?: number };

// Order matters: longer phrases first.
const PHRASES: PhraseRule[] = [
  { re: /(?:^|\s)(پس[\s‌]?فردا|day after tomorrow)(?=\s|$)/i, horizon: "day", offset: 0, dayOffset: 2 },
  { re: /(?:^|\s)(فردا|tomorrow|tmr)(?=\s|$)/i, horizon: "day", offset: 0, dayOffset: 1 },
  { re: /(?:^|\s)(امروز|today|tod)(?=\s|$)/i, horizon: "day", offset: 0, dayOffset: 0 },
  { re: /(?:^|\s)(هفته[\s‌]?(?:ی[\s‌])?(?:بعد|بعدی|آینده|دیگه|دیگر)|next week)(?=\s|$)/i, horizon: "week", offset: 1 },
  { re: /(?:^|\s)(این[\s‌]هفته|this week)(?=\s|$)/i, horizon: "week", offset: 0 },
  { re: /(?:^|\s)(ماه[\s‌]?(?:ی[\s‌])?(?:بعد|بعدی|آینده|دیگه|دیگر)|next month)(?=\s|$)/i, horizon: "month", offset: 1 },
  { re: /(?:^|\s)(این[\s‌]ماه|this month)(?=\s|$)/i, horizon: "month", offset: 0 },
  { re: /(?:^|\s)(فصل[\s‌]?(?:ی[\s‌])?(?:بعد|بعدی|آینده)|next quarter)(?=\s|$)/i, horizon: "quarter", offset: 1 },
  { re: /(?:^|\s)(این[\s‌]فصل|this quarter)(?=\s|$)/i, horizon: "quarter", offset: 0 },
  { re: /(?:^|\s)(سال[\s‌]?(?:ی[\s‌])?(?:بعد|بعدی|آینده|دیگه)|next year)(?=\s|$)/i, horizon: "year", offset: 1 },
  { re: /(?:^|\s)(امسال|this year)(?=\s|$)/i, horizon: "year", offset: 0 },
];

// JS getDay(): 0=Sun..6=Sat
const WEEKDAYS: Record<string, number> = {
  "یکشنبه": 0, "یک‌شنبه": 0, "دوشنبه": 1, "سه‌شنبه": 2, "سهشنبه": 2, "چهارشنبه": 3, "پنجشنبه": 4, "پنج‌شنبه": 4, "جمعه": 5, "شنبه": 6,
  sunday: 0, sun: 0, monday: 1, mon: 1, tuesday: 2, tue: 2, wednesday: 3, wed: 3, thursday: 4, thu: 4, friday: 5, fri: 5, saturday: 6, sat: 6,
};

const TIME_RE = /(?:^|\s)(?:(?:ساعت|at|@)\s*)(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm|صبح|عصر|شب|بعدازظهر|ظهر)?(?=\s|$)|(?:^|\s)(\d{1,2})(?:[:.](\d{2}))?\s*(am|pm)(?=\s|$)/i;

export function parseQuickTask(raw: string, s: TimeSettings, now: Date = new Date()): ParsedQuickTask {
  let text = ` ${toLatinDigits(raw).replace(/\s+/g, " ").trim()} `;
  const tokens: ParsedQuickTask["tokens"] = [];
  let priority: Priority | null = null;
  const tags: string[] = [];
  let folder: string | null = null;

  // priority: !word
  text = text.replace(/(?:^|\s)!([^\s!#/]+|!)(?=\s|$)/g, (m, w: string) => {
    const p = PRIORITY_WORDS[w.toLowerCase()];
    if (!p) return m;
    priority = p;
    tokens.push({ kind: "priority", text: `!${w}` });
    return " ";
  });
  // tags: #word
  text = text.replace(/(?:^|\s)#([^\s#!/]+)/g, (_m, w: string) => {
    tags.push(w);
    tokens.push({ kind: "tag", text: `#${w}` });
    return " ";
  });
  // folder: /word  (only at token start, so dates like 1405/03/10 are untouched)
  text = text.replace(/(?:^|\s)\/([^\s#!/]+)/g, (_m, w: string) => {
    folder = w;
    tokens.push({ kind: "folder", text: `/${w}` });
    return " ";
  });

  // clock time
  let hour: number | null = null;
  let minute = 0;
  const tm = text.match(TIME_RE);
  if (tm) {
    const h = Number(tm[1] ?? tm[4]);
    const mi = Number(tm[2] ?? tm[5] ?? 0);
    const suffix = (tm[3] ?? tm[6] ?? "").toLowerCase();
    if (h <= 23 && mi <= 59) {
      hour = h;
      minute = mi;
      if ((suffix === "pm" || suffix === "عصر" || suffix === "شب" || suffix === "بعدازظهر") && hour < 12) hour += 12;
      if (suffix === "ظهر" && hour < 12 && hour !== 0) hour = hour <= 5 ? hour + 12 : hour;
      if (suffix === "am" && hour === 12) hour = 0;
      tokens.push({ kind: "time", text: tm[0].trim() });
      text = text.replace(tm[0], " ");
    }
  }

  // date / period phrase
  let time: TimeFields | null = null;
  let day: Date | null = null;
  for (const rule of PHRASES) {
    const m = text.match(rule.re);
    if (!m) continue;
    tokens.push({ kind: "time", text: m[1] });
    text = text.replace(m[0], " ");
    if (rule.horizon === "day") {
      day = addDaysLocal(new Date(now.getFullYear(), now.getMonth(), now.getDate()), rule.dayOffset || 0);
    } else {
      let p = periodFor(rule.horizon, now, s);
      if (rule.offset) p = nextPeriod(p, s);
      time = fieldsForPeriod(p);
    }
    break;
  }
  if (!time && !day) {
    const wd = text.match(/(?:^|\s)([^\s]+)(?=\s|$)/g)?.map((w) => w.trim()).find((w) => WEEKDAYS[w.toLowerCase()] !== undefined);
    if (wd) {
      const target = WEEKDAYS[wd.toLowerCase()];
      const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const diff = (target - base.getDay() + 7) % 7 || 7;
      day = addDaysLocal(base, diff);
      tokens.push({ kind: "time", text: wd });
      text = text.replace(new RegExp(`(^|\\s)${wd}(?=\\s|$)`), " ");
    }
  }
  if (hour !== null) {
    const base = day || new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let at = new Date(base.getFullYear(), base.getMonth(), base.getDate(), hour, minute);
    if (!day && at.getTime() < now.getTime()) at = addDaysLocal(at, 1); // "at 9" when it's already 10 -> tomorrow
    time = fieldsForExact(at, "day", s);
  } else if (day) {
    time = fieldsForPeriod(periodFor("day", day, s));
  }

  return { title: text.replace(/\s+/g, " ").trim(), time, priority, tags, folder, tokens };
}

/** Multi-line paste: each non-empty line becomes its own task. */
export function parseQuickTaskLines(raw: string, s: TimeSettings, now: Date = new Date()): ParsedQuickTask[] {
  return raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, "").trim())
    .filter(Boolean)
    .map((l) => parseQuickTask(l, s, now))
    .filter((p) => p.title);
}
