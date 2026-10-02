import { describe, expect, it } from "vitest";
import { buildCypDrugIndex, checkCypInteractions, searchCypDrugs, splitCypEntryName } from "./pharmacyCyp";
import { PHARMACY_CYP_ENZYMES, PHARMACY_CYP_PAIR_INTERACTIONS } from "./pharmacyCypData";
import { PHARMACY_SEED_DOCUMENTS } from "./pharmacySeedData";

const drugs = buildCypDrugIndex(PHARMACY_CYP_ENZYMES);
const pick = (...names: string[]) => names.map((name) => drugs.find((drug) => drug.key === name.toLowerCase())!);

describe("pharmacy CYP matrix and checker", () => {
  it("splits grouped source labels into individual medicines", () => {
    expect(splitCypEntryName("Clarithromycin / Erythromycin")).toEqual(["Clarithromycin", "Erythromycin"]);
    expect(splitCypEntryName("NSAIDs (Celecoxib, Meloxicam, Ibuprofen, Diclofenac)")).toEqual(["Celecoxib", "Meloxicam", "Ibuprofen", "Diclofenac"]);
    expect(splitCypEntryName("Rifampicin (Rifampin)")).toEqual(["Rifampicin"]);
    expect(splitCypEntryName("Trimethoprim + Sulfamethoxazole (Bactrim)")).toEqual(["Trimethoprim + Sulfamethoxazole"]);
  });

  it("links every enzyme to an existing seed document", () => {
    const ids = new Set(PHARMACY_SEED_DOCUMENTS.map((document) => document.id));
    for (const enzyme of PHARMACY_CYP_ENZYMES) expect(ids.has(enzyme.documentId)).toBe(true);
  });

  it("finds medicines by name", () => {
    expect(searchCypDrugs(drugs, "simva").map((drug) => drug.name)).toContain("Simvastatin");
    expect(searchCypDrugs(drugs, "").length).toBe(drugs.length);
  });

  it("flags a strong inhibitor with a CYP3A4 substrate and matches the source pair", () => {
    const result = checkCypInteractions(pick("Clarithromycin", "Simvastatin"), PHARMACY_CYP_PAIR_INTERACTIONS);
    expect(result.ruleFindings.some((finding) => finding.perpetrator === "Clarithromycin" && finding.victim === "Simvastatin" && finding.enzymeId === "CYP3A4" && finding.effect === "inhibition")).toBe(true);
    expect(result.sourcePairs.map((pair) => pair.drugA)).toContain("Simvastatin");
  });

  it("marks prodrug activation and induction separately", () => {
    const prodrug = checkCypInteractions(pick("Omeprazole", "Clopidogrel"), PHARMACY_CYP_PAIR_INTERACTIONS);
    expect(prodrug.ruleFindings.find((finding) => finding.victim === "Clopidogrel")?.prodrug).toBe(true);
    const induction = checkCypInteractions(pick("Rifampicin", "Simvastatin"), []);
    expect(induction.ruleFindings.some((finding) => finding.effect === "induction")).toBe(true);
  });

  it("returns nothing for a single medicine", () => {
    expect(checkCypInteractions(pick("Simvastatin"), PHARMACY_CYP_PAIR_INTERACTIONS)).toEqual({ sourcePairs: [], ruleFindings: [] });
  });
});
