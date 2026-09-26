export type PharmacyProductSchedule = "Unscheduled" | "S2" | "S3" | "S4" | "S8";
export type PharmacyProductScheduleFilter = "all" | PharmacyProductSchedule;

/**
 * A metadata-only index entry. It is not a substitute for the source monograph
 * and intentionally contains no counselling, dosing, safety, or triage fields.
 */
export interface PharmacyProductCatalogEntry {
  id: string;
  documentId: string;
  brandName: string;
  genericName: string;
  activeIngredients: string;
  packSize: string;
  schedule: PharmacyProductSchedule;
  categoryId: string | null;
  categoryFa: string;
  categoryEn: string;
  subcategoryId: string | null;
  subcategoryFa: string;
  subcategoryEn: string;
  sourceUrl: string;
  contentReviewStatus: "unreviewed";
}

export interface PharmacyProductCategory {
  id: string;
  label: string;
}

export interface PharmacyProductCatalogFilters {
  query?: string;
  schedule?: PharmacyProductScheduleFilter;
  categoryId?: string;
}

const SEARCH_FIELDS = [
  "brandName",
  "genericName",
  "activeIngredients",
  "packSize",
  "categoryFa",
  "categoryEn",
  "subcategoryFa",
  "subcategoryEn",
  "schedule",
] as const;

/** Normalize common Persian/Arabic variants while preserving the visible source text. */
export function normalizePharmacyCatalogText(value: string | null | undefined): string {
  return (value ?? "")
    .normalize("NFKC")
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\u06F0-\u06F9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .toLocaleLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

export function getPharmacyProductCategories(
  products: readonly PharmacyProductCatalogEntry[],
  language: "fa" | "en",
): PharmacyProductCategory[] {
  const categories = new Map<string, string>();
  for (const product of products) {
    if (!product.categoryId) continue;
    const label = language === "en" ? product.categoryEn : product.categoryFa;
    if (label.trim() && !categories.has(product.categoryId)) categories.set(product.categoryId, label);
  }

  return [...categories.entries()]
    .map(([id, label]) => ({ id, label }))
    .sort((a, b) => a.label.localeCompare(b.label, language === "fa" ? "fa" : "en"));
}

export function filterPharmacyProducts(
  products: readonly PharmacyProductCatalogEntry[],
  filters: PharmacyProductCatalogFilters = {},
): PharmacyProductCatalogEntry[] {
  const query = normalizePharmacyCatalogText(filters.query);
  return products.filter((product) => {
    if (filters.schedule && filters.schedule !== "all" && product.schedule !== filters.schedule) return false;
    if (filters.categoryId && filters.categoryId !== "all" && product.categoryId !== filters.categoryId) return false;
    if (!query) return true;

    return SEARCH_FIELDS.some((field) => normalizePharmacyCatalogText(product[field]).includes(query));
  });
}
