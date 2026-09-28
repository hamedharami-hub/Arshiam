import type { PharmacyPracticeScenario } from "./pharmacyScenarioPractice";
import type { PharmacyProductCatalogEntry } from "./pharmacyProductCatalog";
import type { PharmacyDocumentSearchEntry } from "./pharmacySearchIndexData";

export type PharmacySearchKind = "pharmacy-scenario" | "pharmacy-product" | "pharmacy-doc";

export interface PharmacySearchHit {
  kind: PharmacySearchKind;
  id: string;
  title: string;
  subtitle: string;
  to: string;
}

export interface PharmacySearchSources {
  scenarios: readonly PharmacyPracticeScenario[];
  products: readonly PharmacyProductCatalogEntry[];
  documents: readonly PharmacyDocumentSearchEntry[];
}

let sourcesPromise: Promise<PharmacySearchSources> | null = null;

/** Lazy, cached: the palette only pays for Pharmacy data after the first Pharmacy-worthy query. */
export function loadPharmacySearchSources(): Promise<PharmacySearchSources> {
  sourcesPromise ??= Promise.all([
    import("./pharmacyScenarioPracticeData"),
    import("./pharmacyProductCatalogData"),
    import("./pharmacySearchIndexData"),
  ]).then(([scenarios, products, index]) => ({
    scenarios: scenarios.PHARMACY_PRACTICE_SCENARIOS,
    products: products.PHARMACY_PRODUCT_CATALOG,
    documents: index.PHARMACY_DOCUMENT_SEARCH_INDEX.filter((doc) => !doc.id.startsWith("doc-product-") && !doc.id.startsWith("doc-scenario-")),
  })).catch((error) => {
    sourcesPromise = null;
    throw error;
  });
  return sourcesPromise;
}

export function normalizeSearchText(value: string): string {
  return value
    .toLocaleLowerCase()
    .normalize("NFKD")
    .replace(/[\u064B-\u065F\u0670\u0300-\u036f]/g, "")
    .replace(/\u200c/g, " ")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\s+/g, " ")
    .trim();
}

function score(fields: readonly string[], term: string): number | null {
  let best: number | null = null;
  for (const field of fields) {
    const text = normalizeSearchText(field);
    if (!text) continue;
    const rank = text.startsWith(term) ? 0 : text.includes(` ${term}`) ? 1 : text.includes(term) ? 2 : null;
    if (rank !== null && (best === null || rank < best)) best = rank;
  }
  return best;
}

function top<T>(items: readonly T[], fields: (item: T) => string[], term: string, limit: number): Array<{ item: T; rank: number }> {
  return items
    .map((item) => ({ item, rank: score(fields(item), term) }))
    .filter((entry): entry is { item: T; rank: number } => entry.rank !== null)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit);
}

export function searchPharmacy(sources: PharmacySearchSources, query: string, language: "fa" | "en"): PharmacySearchHit[] {
  const term = normalizeSearchText(query);
  if (term.length < 2) return [];
  const isEn = language === "en";
  const scenarios = top(sources.scenarios, (s) => [s.titleEn, s.titleFa, s.categoryEn, s.categoryFa], term, 4).map(({ item: s, rank }) => ({ rank, hit: {
    kind: "pharmacy-scenario",
    id: s.id,
    title: isEn ? s.titleEn : s.titleFa || s.titleEn,
    subtitle: isEn ? s.categoryEn : s.categoryFa,
    to: `/app/pharmacy-scenario-practice?scenario=${encodeURIComponent(s.id)}`,
  } as PharmacySearchHit }));
  const products = top(sources.products, (p) => [p.brandName, p.genericName, p.activeIngredients], term, 5).map(({ item: p, rank }) => ({ rank, hit: {
    kind: "pharmacy-product",
    id: p.id,
    title: p.brandName,
    subtitle: `${p.genericName} · ${p.schedule}`,
    to: `/app/pharmacy-products?product=${encodeURIComponent(p.id)}`,
  } as PharmacySearchHit }));
  const documents = top(sources.documents, (d) => [d.titleEn, d.title], term, 5).map(({ item: d, rank }) => ({ rank, hit: {
    kind: "pharmacy-doc",
    id: d.id,
    title: isEn ? d.titleEn || d.title : d.title || d.titleEn,
    subtitle: "Knowledge",
    to: `/app/knowledge?docId=${encodeURIComponent(d.id)}`,
  } as PharmacySearchHit }));
  // Stable sort keeps kind order within the same match quality.
  return [...products, ...scenarios, ...documents].sort((a, b) => a.rank - b.rank).map((entry) => entry.hit);
}
