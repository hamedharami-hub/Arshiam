import { describe, expect, it } from "vitest";
import {
  PBS_2026_RATES,
  calculateSafetyNet,
  compareCalSelection,
  evaluateFinalCheck,
  findProductForScript,
  getFinalCheckItems,
  summarizeOdtLog,
  validateOdtEntry,
  type OdtLogEntry,
} from "./pharmacyFredWorkflow";
import { PHARMACY_FRED_PRACTICE_SCENARIOS } from "./pharmacyFredPracticeData";
import { PHARMACY_PRODUCT_CATALOG } from "./pharmacyProductCatalogData";

const base = { category: "general" as const, runningTotal: 0, entitlementHeld: false, dispensedPrice: 60, premium: 0 };

describe("PBS Safety Net calculator", () => {
  it("uses the 2026 general co-payment and counts it toward the threshold", () => {
    const result = calculateSafetyNet({ ...base, runningTotal: 1725.3 })!;
    expect(result.copayment).toBe(25);
    expect(result.newTotal).toBe(1750.3);
    expect(result.crossesThreshold).toBe(true);
    expect(result.remainingAfter).toBe(0);
  });

  it("charges the dispensed price when under co-payment", () => {
    const result = calculateSafetyNet({ ...base, dispensedPrice: 12.4 })!;
    expect(result).toMatchObject({ copayment: 12.4, underCopayment: true, countsTowardThreshold: 12.4 });
  });

  it("excludes premiums from the threshold and applies entitlement rules", () => {
    expect(calculateSafetyNet({ ...base, premium: 3.5 })).toMatchObject({ patientPays: 28.5, countsTowardThreshold: 25 });
    expect(calculateSafetyNet({ ...base, entitlementHeld: true })).toMatchObject({ copayment: PBS_2026_RATES.concessionCopay, countsTowardThreshold: 0, crossesThreshold: false });
    expect(calculateSafetyNet({ ...base, category: "concessional", entitlementHeld: true })).toMatchObject({ copayment: 0 });
    expect(calculateSafetyNet({ ...base, category: "concessional", runningTotal: 145 })).toMatchObject({ copayment: 7.7, newTotal: 152.7, remainingAfter: 124.5, crossesThreshold: false });
  });

  it("rejects negative or invalid input", () => {
    expect(calculateSafetyNet({ ...base, dispensedPrice: -1 })).toBeNull();
    expect(calculateSafetyNet({ ...base, runningTotal: Number.NaN })).toBeNull();
  });
});

describe("labelling and final check", () => {
  const script = PHARMACY_FRED_PRACTICE_SCENARIOS[0];

  it("links a script to its shelf product when one exists", () => {
    const product = findProductForScript(script, PHARMACY_PRODUCT_CATALOG);
    expect(product === null || product.genericName.length > 0).toBe(true);
    expect(compareCalSelection(["CAL 1", "CAL 9"], ["CAL 1", "CAL 12"])).toEqual({ missing: ["CAL 12"], extra: ["CAL 9"] });
  });

  it("expects release only when the label matches and every item is checked", () => {
    const label = { directions: script.directions.toUpperCase(), quantity: script.quantity, repeats: script.repeats, calCodes: [] };
    const all = new Set(getFinalCheckItems(script));
    expect(evaluateFinalCheck(script, label, all)).toMatchObject({ issues: [], expectedDecision: "release" });
    expect(evaluateFinalCheck(script, { ...label, quantity: 60 }, all).issues).toContain("quantity-mismatch");
    expect(evaluateFinalCheck(script, label, new Set()).expectedDecision).toBe("hold");
  });

  it("always holds an expired S8 script and adds the S8 register item", () => {
    const expired = PHARMACY_FRED_PRACTICE_SCENARIOS.find((entry) => entry.isExpiredS8)!;
    expect(getFinalCheckItems(expired)).toContain("s8-register");
    const label = { directions: expired.directions, quantity: expired.quantity, repeats: expired.repeats, calCodes: [] };
    expect(evaluateFinalCheck(expired, label, new Set(getFinalCheckItems(expired)))).toMatchObject({ issues: ["expired-s8"], expectedDecision: "hold" });
  });
});

describe("ODT dosing log", () => {
  const entry = { date: "2026-08-10", doseMg: 60, type: "supervised" as const, idChecked: true, signed: true, takeawayLabel: false };

  it("validates dose, identity, signature, duplicates and takeaway labels", () => {
    expect(validateOdtEntry(entry, [])).toEqual([]);
    const log: OdtLogEntry[] = [{ ...entry, id: "1" }];
    expect(validateOdtEntry({ ...entry, doseMg: 70, type: "takeaway", signed: false, idChecked: false }, log)).toEqual(["dose-mismatch", "duplicate-date", "id-not-checked", "not-signed", "takeaway-without-label"]);
    expect(validateOdtEntry({ ...entry, date: "10/08/2026" }, [])).toContain("invalid-date");
    expect(validateOdtEntry({ ...entry, date: "2026-02-30" }, [])).toContain("invalid-date");
    expect(validateOdtEntry({ ...entry, date: "2024-02-29" }, [])).toEqual([]);
  });

  it("summarises totals and missed-day gaps", () => {
    const summary = summarizeOdtLog([
      { ...entry, id: "a", date: "2026-08-14" },
      { ...entry, id: "b", date: "2026-08-10" },
      { ...entry, id: "c", date: "2026-08-11", type: "takeaway", takeawayLabel: true },
    ]);
    expect(summary).toMatchObject({ totalMg: 180, supervised: 2, takeaway: 1 });
    expect(summary.gaps).toEqual([{ after: "2026-08-11", before: "2026-08-14", missedDays: 2 }]);
  });
});
