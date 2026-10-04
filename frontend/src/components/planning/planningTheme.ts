import type { Horizon } from "@/lib/timeHorizon";
import { toPersianDigits } from "@/lib/jalali";

/** "3 of 5" without the RTL slash reversal. */
export const frac = (done: number, total: number, fa: boolean) => (fa ? `${toPersianDigits(done)} از ${toPersianDigits(total)}` : `${done}/${total}`);

/** One calm, fixed tint per level so parent/child relations read at a glance. */
export const LEVEL_THEME: Record<Horizon, { dot: string; chip: string; bar: string; ring: string; edge: string }> = {
  year: { dot: "bg-amber-500", chip: "bg-amber-500/10 text-amber-800 dark:text-amber-300", bar: "bg-amber-500", ring: "ring-amber-500/40", edge: "border-s-amber-500" },
  quarter: { dot: "bg-emerald-500", chip: "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300", bar: "bg-emerald-500", ring: "ring-emerald-500/40", edge: "border-s-emerald-500" },
  month: { dot: "bg-sky-500", chip: "bg-sky-500/10 text-sky-800 dark:text-sky-300", bar: "bg-sky-500", ring: "ring-sky-500/40", edge: "border-s-sky-500" },
  week: { dot: "bg-indigo-500", chip: "bg-indigo-500/10 text-indigo-800 dark:text-indigo-300", bar: "bg-indigo-500", ring: "ring-indigo-500/40", edge: "border-s-indigo-500" },
  day: { dot: "bg-rose-500", chip: "bg-rose-500/10 text-rose-800 dark:text-rose-300", bar: "bg-rose-500", ring: "ring-rose-500/40", edge: "border-s-rose-500" },
};

export const LEVEL_NAME: Record<Horizon, { fa: string; en: string }> = {
  year: { fa: "سال", en: "Year" },
  quarter: { fa: "فصل", en: "Season" },
  month: { fa: "ماه", en: "Month" },
  week: { fa: "هفته", en: "Week" },
  day: { fa: "روز", en: "Day" },
};

export const LEVEL_PURPOSE: Record<Horizon, { fa: string; en: string }> = {
  year: { fa: "سال: ۳ تا ۵ هدف بزرگ که جهت کل سال را مشخص می‌کند.", en: "Year: 3–5 big goals that set the direction." },
  quarter: { fa: "فصل: هدف‌های سال را به نتیجه‌های این سه ماه تبدیل کن.", en: "Season: turn the year's goals into results for these three months." },
  month: { fa: "ماه: کارهای مهمی که هدف فصل را جلو می‌برد.", en: "Month: the important work that moves the season forward." },
  week: { fa: "هفته: ۳ تا ۵ کار مهم که هدف ماه را جلو می‌برد؛ بعد بین روزها پخششان کن.", en: "Week: 3–5 key tasks that move the month; then spread them over the days." },
  day: { fa: "روز: کارهای کوچک و مشخصی که امروز انجام می‌دهی.", en: "Day: the small, concrete things you do today." },
};

export const NOW_LABEL: Record<Horizon, { fa: string; en: string }> = {
  year: { fa: "امسال", en: "This year" },
  quarter: { fa: "این فصل", en: "This season" },
  month: { fa: "این ماه", en: "This month" },
  week: { fa: "این هفته", en: "This week" },
  day: { fa: "امروز", en: "Today" },
};
