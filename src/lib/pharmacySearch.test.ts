import { describe, expect, it } from "vitest";
import { loadPharmacySearchSources, normalizeSearchText, searchPharmacy } from "./pharmacySearch";

describe("pharmacy search", () => {
  it("normalizes Arabic letters, ZWNJ and case", () => {
    expect(normalizeSearchText("  ايبوپروفن\u200cها ")).toBe("ایبوپروفن ها");
    expect(normalizeSearchText("NUROFEN")).toBe("nurofen");
  });

  it("finds products, scenarios and knowledge documents with routes", async () => {
    const sources = await loadPharmacySearchSources();
    const products = searchPharmacy(sources, "panadol", "en");
    expect(products[0]).toMatchObject({ kind: "pharmacy-product", to: expect.stringContaining("/app/pharmacy-products?product=") });

    const scenario = sources.scenarios[0];
    const scenarioHits = searchPharmacy(sources, scenario.titleEn.slice(0, 12), "en");
    expect(scenarioHits.some((hit) => hit.kind === "pharmacy-scenario" && hit.id === scenario.id)).toBe(true);

    const docHits = searchPharmacy(sources, "CYP3A4", "en");
    expect(docHits.some((hit) => hit.kind === "pharmacy-doc" && hit.to.startsWith("/app/knowledge?docId="))).toBe(true);
    expect(docHits.every((hit) => !hit.id.startsWith("doc-product-"))).toBe(true);
  });

  it("ignores one-character queries", async () => {
    expect(searchPharmacy(await loadPharmacySearchSources(), "a", "en")).toEqual([]);
  });
});
