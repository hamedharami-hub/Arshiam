export type TreasuryEntry = { id: string; kind: "quote" | "story" | "lesson"; fa: string; en: string; source: string };
const KEY = "arsh_daily_treasury_v1";
export const TREASURY_EVENT = "arsh:treasury";
export function parseTreasury(text: string): TreasuryEntry[] {
  const entries: unknown = JSON.parse(text);
  if (!Array.isArray(entries) || entries.length === 0 || entries.length > 5000) throw new Error("Expected 1–5000 entries.");
  const ids = new Set<string>();
  return entries.map(entry => {
    if (!entry || typeof entry !== "object") throw new Error("Invalid entry.");
    const item = entry as TreasuryEntry;
    if (!["quote", "story", "lesson"].includes(item.kind) || [item.id, item.fa, item.en, item.source].some(value => typeof value !== "string" || !value.trim()) || item.fa.length > 12000 || item.en.length > 12000 || item.id.length > 100 || item.source.length > 1000 || ids.has(item.id)) throw new Error("Each entry needs a unique id, kind, Persian/English text and source.");
    ids.add(item.id);
    return { id: item.id, kind: item.kind, fa: item.fa.trim(), en: item.en.trim(), source: item.source.trim() };
  });
}
export function readTreasury(): TreasuryEntry[] {
  try { return parseTreasury(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function importTreasury(text: string): number {
  const entries = parseTreasury(text);
  const raw = JSON.stringify(entries);
  localStorage.setItem(KEY, raw);
  if (localStorage.getItem(KEY) !== raw) throw new Error("Treasury could not be saved.");
  window.dispatchEvent(new Event(TREASURY_EVENT));
  return entries.length;
}
export function treasuryForDate(entries: TreasuryEntry[], date: string): TreasuryEntry | null {
  if (!entries.length || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const day = Math.floor(Date.parse(`${date}T00:00:00Z`) / 86400000);
  if (!Number.isFinite(day)) return null;
  return entries[((day % entries.length) + entries.length) % entries.length];
}
