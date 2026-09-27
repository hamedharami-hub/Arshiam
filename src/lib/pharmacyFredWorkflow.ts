import type { PharmacyFredPracticeEntry } from "./pharmacyFredPractice";
import type { PharmacyProductCatalogEntry } from "./pharmacyProductCatalog";

/** PBS amounts from 1 Jan 2026 (checked 2026-09-27). Editable in the UI because they change yearly. */
export const PBS_2026_RATES = {
  generalCopay: 25.0,
  concessionCopay: 7.7,
  generalThreshold: 1748.2,
  concessionThreshold: 277.2,
  sourceUrl: "https://www.pbs.gov.au/about/what-is-the-pbs/what-are-the-current-patient-fees-and-charges",
  thresholdSourceUrl: "https://www.servicesaustralia.gov.au/pbs-safety-net-thresholds?context=22016",
} as const;

export interface PbsRates { generalCopay: number; concessionCopay: number; generalThreshold: number; concessionThreshold: number }

export interface SafetyNetInput {
  category: "general" | "concessional";
  runningTotal: number;
  entitlementHeld: boolean;
  dispensedPrice: number;
  premium: number;
}

export interface SafetyNetResult {
  copayment: number;
  patientPays: number;
  countsTowardThreshold: number;
  threshold: number;
  newTotal: number;
  remainingAfter: number;
  crossesThreshold: boolean;
  underCopayment: boolean;
}

const cents = (value: number) => Math.round(value * 100) / 100;

export function calculateSafetyNet(input: SafetyNetInput, rates: PbsRates = PBS_2026_RATES): SafetyNetResult | null {
  const values = [input.runningTotal, input.dispensedPrice, input.premium, rates.generalCopay, rates.concessionCopay, rates.generalThreshold, rates.concessionThreshold];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return null;
  const general = input.category === "general";
  const threshold = general ? rates.generalThreshold : rates.concessionThreshold;
  const cap = input.entitlementHeld ? (general ? rates.concessionCopay : 0) : general ? rates.generalCopay : rates.concessionCopay;
  const copayment = cents(Math.min(cap, input.dispensedPrice));
  // Brand/therapeutic premiums are paid by the patient but never count toward the threshold.
  const countsTowardThreshold = input.entitlementHeld ? 0 : copayment;
  const newTotal = cents(input.runningTotal + countsTowardThreshold);
  return {
    copayment,
    patientPays: cents(copayment + input.premium),
    countsTowardThreshold,
    threshold,
    newTotal,
    remainingAfter: cents(Math.max(0, threshold - newTotal)),
    crossesThreshold: !input.entitlementHeld && input.runningTotal < threshold && newTotal >= threshold,
    underCopayment: !input.entitlementHeld && input.dispensedPrice < cap,
  };
}

export interface FredLabelDraft {
  directions: string;
  quantity: number;
  repeats: number;
  calCodes: string[];
}

const firstWord = (value: string) => value.toLocaleLowerCase().split(/[\s(]/)[0] ?? "";

/** Links a script to a shelf product by brand or generic first word; null when the source has no product. */
export function findProductForScript(entry: PharmacyFredPracticeEntry, products: readonly PharmacyProductCatalogEntry[]): PharmacyProductCatalogEntry | null {
  const word = firstWord(entry.prescribedDrug);
  if (!word) return null;
  return products.find((product) => firstWord(product.brandName) === word)
    ?? products.find((product) => firstWord(product.genericName) === word)
    ?? null;
}

export function compareCalSelection(selected: readonly string[], source: readonly string[]) {
  return {
    missing: source.filter((code) => !selected.includes(code)),
    extra: selected.filter((code) => !source.includes(code)),
  };
}

export type FinalCheckItemId = "patient" | "prescriber" | "drug" | "directions" | "quantity" | "cal" | "counselling" | "validity" | "s8-register";

export function getFinalCheckItems(entry: PharmacyFredPracticeEntry): FinalCheckItemId[] {
  const items: FinalCheckItemId[] = ["patient", "prescriber", "drug", "directions", "quantity", "cal", "counselling", "validity"];
  return entry.schedule === "S8" ? [...items, "s8-register"] : items;
}

export type FinalCheckIssue = "directions-mismatch" | "quantity-mismatch" | "repeats-mismatch" | "expired-s8" | "unchecked-items";

const normalizeDirections = (value: string) => value.toLocaleLowerCase().replace(/[.\s]+/g, " ").trim();

export function evaluateFinalCheck(entry: PharmacyFredPracticeEntry, label: FredLabelDraft, ticked: ReadonlySet<FinalCheckItemId>) {
  const issues: FinalCheckIssue[] = [];
  if (normalizeDirections(label.directions) !== normalizeDirections(entry.directions)) issues.push("directions-mismatch");
  if (label.quantity !== entry.quantity) issues.push("quantity-mismatch");
  if (label.repeats !== entry.repeats) issues.push("repeats-mismatch");
  if (entry.isExpiredS8) issues.push("expired-s8");
  const unchecked = getFinalCheckItems(entry).filter((item) => !ticked.has(item));
  if (unchecked.length) issues.push("unchecked-items");
  const expectedDecision: "release" | "hold" = issues.length ? "hold" : "release";
  return { issues, unchecked, expectedDecision };
}

export interface OdtPracticePatient {
  code: string;
  medicine: string;
  prescribedDoseMg: number;
  regimen: string;
}

export const ODT_PRACTICE_PATIENT: OdtPracticePatient = {
  code: "ODT-TRAIN-01 (fictional)",
  medicine: "Methadone oral liquid 5 mg/mL",
  prescribedDoseMg: 60,
  regimen: "Supervised Mon–Fri; takeaway Sat–Sun (fictional training order)",
};

export interface OdtLogEntry {
  id: string;
  date: string;
  doseMg: number;
  type: "supervised" | "takeaway";
  idChecked: boolean;
  signed: boolean;
  takeawayLabel: boolean;
}

export type OdtEntryIssue = "invalid-date" | "dose-mismatch" | "duplicate-date" | "id-not-checked" | "not-signed" | "takeaway-without-label";

export function validateOdtEntry(entry: Omit<OdtLogEntry, "id">, log: readonly OdtLogEntry[], patient: OdtPracticePatient = ODT_PRACTICE_PATIENT): OdtEntryIssue[] {
  const issues: OdtEntryIssue[] = [];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.date) || Number.isNaN(Date.parse(entry.date))) issues.push("invalid-date");
  if (entry.doseMg !== patient.prescribedDoseMg) issues.push("dose-mismatch");
  if (log.some((item) => item.date === entry.date)) issues.push("duplicate-date");
  if (!entry.idChecked) issues.push("id-not-checked");
  if (!entry.signed) issues.push("not-signed");
  if (entry.type === "takeaway" && !entry.takeawayLabel) issues.push("takeaway-without-label");
  return issues;
}

export function summarizeOdtLog(log: readonly OdtLogEntry[]) {
  const sorted = [...log].sort((a, b) => a.date.localeCompare(b.date));
  const gaps: Array<{ after: string; before: string; missedDays: number }> = [];
  for (let index = 1; index < sorted.length; index += 1) {
    const days = Math.round((Date.parse(sorted[index].date) - Date.parse(sorted[index - 1].date)) / 86_400_000);
    if (days > 1) gaps.push({ after: sorted[index - 1].date, before: sorted[index].date, missedDays: days - 1 });
  }
  return {
    sorted,
    totalMg: sorted.reduce((total, item) => total + item.doseMg, 0),
    supervised: sorted.filter((item) => item.type === "supervised").length,
    takeaway: sorted.filter((item) => item.type === "takeaway").length,
    gaps,
  };
}
