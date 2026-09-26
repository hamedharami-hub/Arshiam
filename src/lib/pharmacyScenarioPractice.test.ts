import { describe, expect, it } from "vitest";
import { PHARMACY_SEED_DOCUMENTS } from "@/lib/pharmacySeedData";
import { PHARMACY_PRACTICE_SCENARIOS } from "@/lib/pharmacyScenarioPracticeData";
import { filterPharmacyPracticeScenarios } from "@/lib/pharmacyScenarioPractice";

describe("Pharmacy triage practice scenarios", () => {
  it("preserves 32 unique, source-pinned, explicitly unreviewed cases and document links", () => {
    const documentIds = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    const ids = PHARMACY_PRACTICE_SCENARIOS.map((scenario) => scenario.id);
    expect(PHARMACY_PRACTICE_SCENARIOS).toHaveLength(32);
    expect(new Set(ids).size).toBe(ids.length);
    expect(PHARMACY_PRACTICE_SCENARIOS.every((scenario) => documentIds.has(scenario.documentId))).toBe(true);
    expect(PHARMACY_PRACTICE_SCENARIOS.every((scenario) => scenario.contentReviewStatus === "unreviewed")).toBe(true);
    expect(PHARMACY_PRACTICE_SCENARIOS.every((scenario) => scenario.sourceUrl.includes("/blob/5b4f7d2443a3ed97aea752c1d0d18583ce6d0067/"))).toBe(true);
  });

  it("searches and filters cases without changing source values", () => {
    const originalTitles = PHARMACY_PRACTICE_SCENARIOS.map((scenario) => scenario.titleEn);
    const cases = filterPharmacyPracticeScenarios(PHARMACY_PRACTICE_SCENARIOS, "hayfever");
    expect(cases.length).toBeGreaterThan(0);
    expect(cases.every((scenario) => /hayfever|hay fever|allergic rhinitis/i.test(`${scenario.titleEn} ${scenario.categoryEn}`))).toBe(true);

    const adminCases = filterPharmacyPracticeScenarios(PHARMACY_PRACTICE_SCENARIOS, "", "MODE_A_ADMIN");
    expect(adminCases).toHaveLength(4);
    expect(adminCases.every((scenario) => scenario.mode === "MODE_A_ADMIN")).toBe(true);
    expect(PHARMACY_PRACTICE_SCENARIOS.map((scenario) => scenario.titleEn)).toEqual(originalTitles);
  });
});
