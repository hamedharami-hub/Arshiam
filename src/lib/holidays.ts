import { firebaseStore } from "@/lib/firebaseStore";
import { getLocalDateString } from "@/lib/taskDate";

export type Holiday = {
  id: string;
  date: string; // YYYY-MM-DD
  country_code: string;
  name: string;
  local_name: string | null;
  type: string | null;
};

let cache: Record<string, Holiday[]> = {};

/**
 * Fetch holidays for a date range from Firestore or return empty array.
 * Does not attempt to call disabled backend edge functions.
 */
export async function getHolidaysForRange(
  start: Date,
  end: Date,
  countries: string[] = ["IR", "AU"]
): Promise<Holiday[]> {
  const startStr = getLocalDateString(start);
  const endStr = getLocalDateString(end);
  const cacheKey = `${startStr}_${endStr}_${countries.join(",")}`;
  if (cache[cacheKey]) return cache[cacheKey];

  try {
    const { data } = await firebaseStore
      .from("holidays")
      .select("*")
      .in("country_code", countries)
      .gte("date", startStr)
      .lte("date", endStr);

    const result = (data || []) as Holiday[];
    cache[cacheKey] = result;
    return result;
  } catch {
    // If holidays are not seeded or offline, return empty list honestly
    return [];
  }
}

export function isHoliday(date: Date, holidays: Holiday[], timeZone?: string): Holiday[] {
  const d = getLocalDateString(date, timeZone);
  return holidays.filter((h) => h.date === d);
}
