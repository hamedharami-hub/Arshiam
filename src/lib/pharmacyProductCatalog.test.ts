import { describe, expect, it } from "vitest";
import { PHARMACY_PRODUCT_CATALOG } from "@/lib/pharmacyProductCatalogData";
import { PHARMACY_SEED_DOCUMENTS } from "@/lib/pharmacySeedData";
import {
  filterPharmacyProducts,
  getPharmacyProductCategories,
  normalizePharmacyCatalogText,
} from "@/lib/pharmacyProductCatalog";

describe("Pharmacy product catalog index", () => {
  it("contains unique metadata-only entries mapped to the matching imported monograph IDs", () => {
    const ids = PHARMACY_PRODUCT_CATALOG.map((product) => product.id);
    const knowledgeDocumentIds = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    expect(PHARMACY_PRODUCT_CATALOG).toHaveLength(121);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.documentId === `doc-product-${product.id}`)).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => knowledgeDocumentIds.has(product.documentId))).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.contentReviewStatus === "unreviewed")).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.every((product) => product.sourceUrl.includes("/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/"))).toBe(true);

    const forbiddenFields = ["counselling", "counseling", "dosing", "pregnancy", "warning", "triage", "safety"];
    for (const product of PHARMACY_PRODUCT_CATALOG) {
      for (const key of Object.keys(product)) {
        expect(forbiddenFields.some((forbidden) => key.toLowerCase().includes(forbidden))).toBe(false);
      }
    }
  });

  it("normalizes Arabic keyboard variants for Persian search", () => {
    expect(normalizePharmacyCatalogText("كِتاب يَك")).toBe("کتاب یک");
    expect(normalizePharmacyCatalogText("۵۰۰ ٤٢")).toBe("500 42");
  });

  it("filters by schedule and category without mutating source entries", () => {
    const originalIds = PHARMACY_PRODUCT_CATALOG.map((product) => product.id);
    const first = PHARMACY_PRODUCT_CATALOG[0];
    const categoryRows = filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, {
      schedule: first.schedule,
      categoryId: first.categoryId ?? undefined,
    });

    expect(categoryRows.length).toBeGreaterThan(0);
    expect(categoryRows.every((product) => product.schedule === first.schedule)).toBe(true);
    expect(categoryRows.every((product) => product.categoryId === first.categoryId)).toBe(true);
    expect(PHARMACY_PRODUCT_CATALOG.map((product) => product.id)).toEqual(originalIds);
  });

  it("searches across brand and generic labels and builds locale-specific category choices", () => {
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "panadol" }).length).toBeGreaterThan(0);
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "paracetamol" }).length).toBeGreaterThan(0);
    expect(filterPharmacyProducts(PHARMACY_PRODUCT_CATALOG, { query: "no matching product" })).toEqual([]);

    const faCategories = getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, "fa");
    const enCategories = getPharmacyProductCategories(PHARMACY_PRODUCT_CATALOG, "en");
    expect(faCategories.length).toBeGreaterThan(0);
    expect(new Set(faCategories.map((category) => category.id)).size).toBe(faCategories.length);
    expect(enCategories.find((category) => category.id === "cat-1")?.label).toBe("Primary Care, OTC & First Aid");
  });
});
