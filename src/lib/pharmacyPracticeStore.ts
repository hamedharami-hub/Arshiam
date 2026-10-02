import type { PharmacyPracticeScenario, PharmacyReferralLetterTemplate } from "./pharmacyScenarioPractice";

export interface PharmacyStarredPhrase {
  id: string;
  scenarioId: string;
  textEn: string;
  textFa: string;
  createdAt: string;
}

export interface PharmacyReferralLetterDraft extends PharmacyReferralLetterTemplate {
  notes: string;
  updatedAt: string;
}

export interface PharmacyScenarioProgress {
  completedAt: string;
  decision: "supply" | "refer";
  matchesSourceLabel: boolean | null;
  redFlagsScreened: number;
  redFlagsTotal: number;
}

export const getStarredPhraseId = (scenarioId: string, textEn: string, textFa: string) =>
  `${scenarioId}::${(textEn || textFa).trim().toLocaleLowerCase()}`;

export function formatReferralLetter(
  scenario: Pick<PharmacyPracticeScenario, "patientName" | "patientAge" | "titleEn">,
  draft: Omit<PharmacyReferralLetterDraft, "updatedAt">,
): string {
  const patient = [scenario.patientName, scenario.patientAge !== null ? `${scenario.patientAge}y` : ""].filter(Boolean).join(", ");
  return [
    `To: ${draft.to}`,
    `Re: ${patient || "Patient"} (educational practice case: ${scenario.titleEn})`,
    `Reason for referral: ${draft.reason}`,
    `Presenting symptoms: ${draft.symptomSummary}`,
    `Current medicines: ${draft.currentMeds}`,
    `Suggested action: ${draft.suggestedAction}`,
    draft.notes ? `Pharmacist notes: ${draft.notes}` : "",
  ].filter(Boolean).join("\n");
}
