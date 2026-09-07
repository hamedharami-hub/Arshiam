import { supabase } from "@/integrations/supabase/client";

export type Holiday = {
  id: string;
  date: string; // YYYY-MM-DD
  country_code: string;
  name: string;
  local_name: string | null;
  type: string | null;
};

let cache: Record<string, Holiday[]> = {};

export async function getHolidaysForRange(start: Date, end: Date, countries: string[] = ["IR", "AU"]): Promise<Holiday[]> {
  const startStr = start.toISOString().slice(0, 10);
  const endStr = end.toISOString().slice(0, 10);
  const cacheKey = `${startStr}_${endStr}_${countries.join(",")}`;
  if (cache[cacheKey]) return cache[cacheKey];

  // ensure years are seeded
  const years = new Set<number>();
  let cur = new Date(start);
  while (cur <= end) { years.add(cur.getFullYear()); cur.setMonth(cur.getMonth() + 1); }

  for (const y of years) {
    for (const c of countries) {
      await ensureYearLoaded(y, c);
    }
  }

  const { data } = await supabase
    .from("holidays")
    .select("*")
    .in("country_code", countries)
    .gte("date", startStr)
    .lte("date", endStr);

  const result = (data || []) as Holiday[];
  cache[cacheKey] = result;
  return result;
}

const seededYears = new Set<string>();

async function ensureYearLoaded(year: number, country: string) {
  const key = `${year}_${country}`;
  if (seededYears.has(key)) return;
  seededYears.add(key);
  // Check if any rows exist for that year/country
  const { count } = await supabase
    .from("holidays")
    .select("id", { count: "exact", head: true })
    .eq("country_code", country)
    .gte("date", `${year}-01-01`)
    .lte("date", `${year}-12-31`);
  if ((count || 0) > 0) return;
  // Trigger fetch from edge function
  try {
    await supabase.functions.invoke("fetch-holidays", {
      body: { year, country },
    });
  } catch (e) {
    console.error("fetch-holidays failed", e);
  }
}

export function isHoliday(date: Date, holidays: Holiday[]): Holiday[] {
  const d = date.toISOString().slice(0, 10);
  return holidays.filter(h => h.date === d);
}
