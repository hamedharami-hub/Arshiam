export type PharmacyScenarioMode = "MODE_A_ADMIN" | "MODE_B_SLANG" | "MODE_C_CONFLICT";
export type PharmacyScenarioModeFilter = "all" | PharmacyScenarioMode;

export interface PharmacyPracticeQuestion {
  key: string;
  labelFa: string;
  labelEn: string;
  questionFa: string;
  questionEn: string;
  answerFa: string;
  answerEn: string;
}

export interface PharmacyPracticeDialogueOption {
  id: string;
  textFa: string;
  textEn: string;
  patientReplyFa: string;
  patientReplyEn: string;
  /** A source-provided flag, not an independent clinical correctness judgment. */
  sourceMarksRecommended: boolean;
  sourceMarksRedFlagResponse: boolean;
}

export interface PharmacyPracticeOutcome {
  requiresReferral: boolean;
  recommendationFa: string;
  recommendationEn: string;
  explanationFa: string;
  explanationEn: string;
}

export interface PharmacyPracticeScenario {
  id: string;
  documentId: string;
  titleFa: string;
  titleEn: string;
  mode: PharmacyScenarioMode;
  categoryFa: string;
  categoryEn: string;
  presentationFa: string;
  presentationEn: string;
  patientName: string;
  patientAge: number | null;
  patientGender: string;
  questions: PharmacyPracticeQuestion[];
  redFlags: Array<{ fa: string; en: string }>;
  dialogueOptions: PharmacyPracticeDialogueOption[];
  outcome: PharmacyPracticeOutcome | null;
  sourceUrl: string;
  contentReviewStatus: "unreviewed";
}

const normalizeScenarioText = (value: string) =>
  value.normalize("NFKC").replace(/[\u064A\u0649]/g, "ی").replace(/\u0643/g, "ک").toLocaleLowerCase();

export function filterPharmacyPracticeScenarios(
  scenarios: readonly PharmacyPracticeScenario[],
  query: string,
  mode: PharmacyScenarioModeFilter = "all",
): PharmacyPracticeScenario[] {
  const normalizedQuery = normalizeScenarioText(query.trim());
  return scenarios.filter((scenario) => {
    if (mode !== "all" && scenario.mode !== mode) return false;
    if (!normalizedQuery) return true;
    const searchableText = normalizeScenarioText(`${scenario.titleFa} ${scenario.titleEn} ${scenario.categoryFa} ${scenario.categoryEn}`);
    return searchableText.includes(normalizedQuery)
      || searchableText.replace(/\s+/g, "").includes(normalizedQuery.replace(/\s+/g, ""));
  });
}
