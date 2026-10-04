import { RRule, Frequency, Weekday } from "rrule";

export type RecurrenceRule = {
  freq: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  byweekday?: ("MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU")[];
  byhour?: number;
  byminute?: number;
};

const FREQ_MAP: Record<RecurrenceRule["freq"], Frequency> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
  yearly: RRule.YEARLY,
};

const WD_MAP: Record<NonNullable<RecurrenceRule["byweekday"]>[number], Weekday> = {
  MO: RRule.MO, TU: RRule.TU, WE: RRule.WE, TH: RRule.TH,
  FR: RRule.FR, SA: RRule.SA, SU: RRule.SU,
};

export function nextOccurrence(rule: RecurrenceRule, after: Date = new Date(), anchor: Date = after): Date | null {
  try {
    // RRule treats byhour and byweekday as UTC fields. Feed it floating local
    // calendar fields, then turn the result back into a local Date so a 09:00
    // repeat stays at 09:00 in every timezone (including DST transitions).
    const asFloating = (date: Date) => new Date(Date.UTC(
      date.getFullYear(), date.getMonth(), date.getDate(),
      date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds(),
    ));
    const floating = asFloating(after);
    const opts: any = {
      freq: FREQ_MAP[rule.freq],
      interval: Math.max(1, rule.interval || 1),
      dtstart: asFloating(anchor),
    };
    if (rule.byweekday?.length) opts.byweekday = rule.byweekday.map((d) => WD_MAP[d]);
    if (typeof rule.byhour === "number") opts.byhour = [rule.byhour];
    if (typeof rule.byminute === "number") opts.byminute = [rule.byminute];
    const r = new RRule(opts);
    const next = r.after(floating, false);
    return next ? new Date(
      next.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate(),
      next.getUTCHours(), next.getUTCMinutes(), next.getUTCSeconds(), next.getUTCMilliseconds(),
    ) : null;
  } catch (e) {
    console.error("rrule error", e);
    return null;
  }
}

export function describeRule(rule: RecurrenceRule | null, isEn = false): string {
  const freqMap = isEn
    ? { daily: "day", weekly: "week", monthly: "month", yearly: "year" }
    : { daily: "روز", weekly: "هفته", monthly: "ماه", yearly: "سال" };
  const every = isEn ? "Every" : "هر";
  const on = isEn ? " on " : " در ";
  const at = isEn ? " at " : " ساعت ";
  const none = isEn ? "No repeat" : "بدون تکرار";
  if (!rule) return none;
  const unit = `${freqMap[rule.freq]}${rule.interval > 1 && isEn ? "s" : ""}`;
  const intervalText = rule.interval > 1
    ? isEn ? `${every} ${rule.interval} ${unit}` : `${every} ${rule.interval} ${unit}`
    : `${every} ${unit}`;
  const wdNames: Record<string, string> = isEn
    ? { MO: "Mon", TU: "Tue", WE: "Wed", TH: "Thu", FR: "Fri", SA: "Sat", SU: "Sun" }
    : { MO: "دوشنبه", TU: "سه‌شنبه", WE: "چهارشنبه", TH: "پنج‌شنبه", FR: "جمعه", SA: "شنبه", SU: "یکشنبه" };
  const days = rule.byweekday?.length ? `${on}${rule.byweekday.map((d) => wdNames[d]).join(isEn ? ", " : "، ")}` : "";
  const time = typeof rule.byhour === "number" ? `${at}${String(rule.byhour).padStart(2, "0")}:${String(rule.byminute || 0).padStart(2, "0")}` : "";
  return `${intervalText}${days}${time}`;
}
