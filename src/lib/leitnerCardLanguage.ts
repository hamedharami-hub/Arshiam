import { isPersianText } from "./bilingualHelper";
import type { LeitnerCard } from "./leitnerTypes";

export type StudyContentLanguage = "fa" | "en";
export type LeitnerCardSide = "front" | "back";

export interface ResolvedLeitnerCardText {
  text: string;
  language: StudyContentLanguage;
  translationMissing: boolean;
}

export interface ResolvedLeitnerCardContent {
  front: ResolvedLeitnerCardText;
  back: ResolvedLeitnerCardText;
}

export function resolveLeitnerCardText(
  card: LeitnerCard,
  side: LeitnerCardSide,
  requestedLanguage: StudyContentLanguage,
): ResolvedLeitnerCardText {
  const localizedText = card[`${side}_${requestedLanguage}`]?.trim();
  if (localizedText) {
    return { text: localizedText, language: requestedLanguage, translationMissing: false };
  }

  const originalText = card[side]?.trim() || "";
  const originalLanguage: StudyContentLanguage = isPersianText(originalText) ? "fa" : "en";
  return {
    text: originalText,
    language: originalLanguage,
    translationMissing: originalLanguage !== requestedLanguage,
  };
}

export function resolveLeitnerCardContent(
  card: LeitnerCard,
  requestedLanguage: StudyContentLanguage,
): ResolvedLeitnerCardContent {
  return {
    front: resolveLeitnerCardText(card, "front", requestedLanguage),
    back: resolveLeitnerCardText(card, "back", requestedLanguage),
  };
}

export function loadStudyContentLanguage(
  fallback: StudyContentLanguage = "fa",
): StudyContentLanguage {
  try {
    const value = localStorage.getItem("arshnaz.study-content-language.v1");
    if (value === "fa" || value === "en") return value;
  } catch {
    // Storage may be unavailable in private mode; the view still works in memory.
  }
  return fallback;
}

export function saveStudyContentLanguage(language: StudyContentLanguage): void {
  try {
    localStorage.setItem("arshnaz.study-content-language.v1", language);
  } catch {
    // Keep the current selection in React state even if persistence is unavailable.
  }
}
