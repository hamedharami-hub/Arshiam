const DIGITS_FA = "۰۱۲۳۴۵۶۷۸۹";
const DIGITS_AR = "٠١٢٣٤٥٦٧٨٩";

/** Folds Arabic/Persian letter variants, digits, diacritics and ZWNJ so Persian search is forgiving. */
export function normalizeSearchText(input: string): string {
  return input
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[ۀة]/g, "ه")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/[۰-۹]/g, (d) => String(DIGITS_FA.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(DIGITS_AR.indexOf(d)))
    .replace(/\s+/g, " ")
    .toLowerCase()
    .trim();
}

export function matchesAllTokens(haystack: string, query: string): boolean {
  const tokens = normalizeSearchText(query).split(" ").filter(Boolean);
  return tokens.length > 0 && tokens.every((t) => haystack.includes(t));
}

/** Lower score = better. Title hits rank before tag hits before body hits. */
export function searchRank(title: string, tags: string[], query: string): number {
  const q = normalizeSearchText(query);
  const t = normalizeSearchText(title);
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(q)) return 2;
  if (tags.some((tag) => normalizeSearchText(tag).includes(q))) return 3;
  return 4;
}
