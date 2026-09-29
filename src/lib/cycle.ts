import { differenceInCalendarDays, addDays, format, startOfDay } from "date-fns";

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

export const DEFAULT_CYCLE_PROFILE = {
  color: "#ec4899",
  avg_cycle_length: 28,
  avg_period_length: 5,
  luteal_length: 14,
  notify_period: false,
  notify_ovulation: false,
} satisfies Pick<CycleProfile, "color" | "avg_cycle_length" | "avg_period_length" | "luteal_length" | "notify_period" | "notify_ovulation">;

export type FertileWindowEstimate = { start: Date; end: Date };

export function normalizeCycleSettings(profile: Pick<CycleProfile, "avg_cycle_length" | "avg_period_length" | "luteal_length">) {
  const cycleLength = Math.max(1, Math.round(profile.avg_cycle_length || 28));
  const periodLength = Math.min(cycleLength, Math.max(1, Math.round(profile.avg_period_length || 5)));
  const requestedLutealLength = Math.max(1, Math.round(profile.luteal_length || 14));
  const ovulationDay = Math.min(cycleLength, Math.max(periodLength + 1, cycleLength - requestedLutealLength));
  const lutealStartDay = Math.min(cycleLength, ovulationDay + 2);
  return { cycleLength, periodLength, requestedLutealLength, ovulationDay, lutealStartDay };
}

export const PHASE_META: Record<Phase, { label: string; label_en: string; color: string; description: string; description_en: string }> = {
  period:     { label: "قاعدگی",     label_en: "Menstruation", color: "#EF4444", description: "روزهای پریود", description_en: "Menstrual flow days" },
  follicular: { label: "فولیکولار",  label_en: "Follicular",   color: "#F59E0B", description: "انرژی روبه‌بالا، تمرکز خوب", description_en: "Rising energy, optimal focus" },
  ovulation:  { label: "نزدیک تخمک‌گذاری", label_en: "Near ovulation", color: "#10B981", description: "برآورد تقویمی نزدیک زمان تخمک‌گذاری", description_en: "Calendar estimate near ovulation" },
  luteal:     { label: "لوتئال",     label_en: "Luteal",       color: "#8B5CF6", description: "PMS احتمالی، آرام‌تر", description_en: "Potential PMS, time for gentle rest" },
  unknown:    { label: "دادهٔ کافی نیست", label_en: "Not enough data", color: "#94A3B8", description: "برای برآورد، شروع پریود را ثبت کنید.", description_en: "Log a period start to see estimates." },
};

export const SYMPTOM_MAP: Record<string, string> = {
  "سردرد": "Headache",
  "کمردرد": "Back pain",
  "نفخ": "Bloating",
  "حساسیت سینه": "Breast tenderness",
  "آکنه": "Acne",
  "خستگی": "Fatigue",
  "بی‌خوابی": "Insomnia",
  "ولع غذایی": "Food cravings",
  "اضطراب": "Anxiety",
  "افسردگی خفیف": "Mild low mood",
  "تحریک‌پذیری": "Irritability",
};

export function getSymptomLabel(s: string, isEn = false): string {
  if (!isEn) return s;
  return SYMPTOM_MAP[s] || s;
}

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

  const { cycleLength: cycleLen, periodLength: periodLen, ovulationDay } = normalizeCycleSettings(profile);
  // wrap forward predicted cycles
  const cycleDay = ((day - 1) % cycleLen) + 1;
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
  // Compare calendar dates, not timestamps: a period predicted for today at
  // midnight must not roll forward merely because `from` is later in the day.
  const today = startOfDay(from);
  while (next < today) next = addDays(next, profile.avg_cycle_length || 28);
  return next;
}

/** Estimate a six-day fertile window ending on the estimated ovulation day. */
export function predictFertileWindow(
  logs: CycleLog[],
  profile: CycleProfile,
  from: Date = new Date(),
): FertileWindowEstimate | null {
  const last = lastPeriodStartOnOrBefore(logs, from);
  if (!last) return null;

  const { cycleLength, ovulationDay } = normalizeCycleSettings(profile);
  let ovulationDate = addDays(new Date(last.log_date + "T00:00:00"), ovulationDay - 1);
  let start = addDays(ovulationDate, -5);
  let end = ovulationDate;

  while (differenceInCalendarDays(end, from) < 0) {
    ovulationDate = addDays(ovulationDate, cycleLength);
    start = addDays(start, cycleLength);
    end = addDays(end, cycleLength);
  }

  return { start, end };
}

export const SYMPTOM_OPTIONS = [
  "سردرد", "کمردرد", "نفخ", "حساسیت سینه", "آکنه",
  "خستگی", "بی‌خوابی", "ولع غذایی", "اضطراب", "افسردگی خفیف", "تحریک‌پذیری",
];
