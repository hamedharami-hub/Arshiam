import { differenceInCalendarDays, addDays, format } from "date-fns";

export type CycleProfile = {
  id: string;
  user_id: string;
  label: string;
  color: string;
  is_self: boolean;
  avg_cycle_length: number;
  avg_period_length: number;
  luteal_length: number;
  notify_period: boolean;
  notify_ovulation: boolean;
};

export type CycleLog = {
  id: string;
  user_id: string;
  profile_id: string;
  log_date: string; // yyyy-MM-dd
  event: "period_start" | "period_end" | null;
  flow: number | null;
  pain: number | null;
  mood: number | null;
  energy: number | null;
  symptoms: string[] | null;
  notes: string | null;
};

export type Phase = "period" | "follicular" | "ovulation" | "luteal" | "unknown";

export const PHASE_META: Record<Phase, { label: string; color: string; description: string }> = {
  period:     { label: "قاعدگی",     color: "#EF4444", description: "روزهای پریود" },
  follicular: { label: "فولیکولار",  color: "#F59E0B", description: "انرژی روبه‌بالا، تمرکز خوب" },
  ovulation:  { label: "تخمک‌گذاری", color: "#10B981", description: "پنجره باروری، اوج انرژی" },
  luteal:     { label: "لوتئال",     color: "#8B5CF6", description: "PMS احتمالی، آرام‌تر" },
  unknown:    { label: "—",          color: "#94A3B8", description: "" },
};

/** Pick the most recent period_start log on or before `date`. */
export function lastPeriodStartOnOrBefore(logs: CycleLog[], date: Date): CycleLog | null {
  const ds = format(date, "yyyy-MM-dd");
  const starts = logs
    .filter((l) => l.event === "period_start" && l.log_date <= ds)
    .sort((a, b) => (a.log_date < b.log_date ? 1 : -1));
  return starts[0] || null;
}

/** Compute phase + day of cycle for a given date based on cycle history & profile. */
export function computePhase(date: Date, logs: CycleLog[], profile: CycleProfile): {
  phase: Phase;
  dayOfCycle: number | null;
  predicted: boolean;
} {
  const last = lastPeriodStartOnOrBefore(logs, date);
  if (!last) return { phase: "unknown", dayOfCycle: null, predicted: false };
  const start = new Date(last.log_date + "T00:00:00");
  const day = differenceInCalendarDays(date, start) + 1; // 1-indexed
  if (day < 1) return { phase: "unknown", dayOfCycle: null, predicted: false };

  const cycleLen = profile.avg_cycle_length || 28;
  const periodLen = profile.avg_period_length || 5;
  const luteal = profile.luteal_length || 14;
  // wrap forward predicted cycles
  const cycleDay = ((day - 1) % cycleLen) + 1;
  const ovulationDay = cycleLen - luteal; // e.g. 28-14=14
  const predicted = day > cycleLen; // future cycle = prediction

  let phase: Phase;
  if (cycleDay <= periodLen) phase = "period";
  else if (cycleDay >= ovulationDay - 1 && cycleDay <= ovulationDay + 1) phase = "ovulation";
  else if (cycleDay < ovulationDay) phase = "follicular";
  else phase = "luteal";

  return { phase, dayOfCycle: cycleDay, predicted };
}

/** Predict next period start date given history. */
export function predictNextPeriod(logs: CycleLog[], profile: CycleProfile, from: Date = new Date()): Date | null {
  const last = lastPeriodStartOnOrBefore(logs, from);
  if (!last) return null;
  const start = new Date(last.log_date + "T00:00:00");
  let next = addDays(start, profile.avg_cycle_length || 28);
  while (next < from) next = addDays(next, profile.avg_cycle_length || 28);
  return next;
}

export const SYMPTOM_OPTIONS = [
  "سردرد", "کمردرد", "نفخ", "حساسیت سینه", "آکنه",
  "خستگی", "بی‌خوابی", "ولع غذایی", "اضطراب", "افسردگی خفیف", "تحریک‌پذیری",
];
