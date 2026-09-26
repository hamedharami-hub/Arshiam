import { isPersianText } from "./bilingualHelper";
import type { LeitnerCard } from "./leitnerTypes";

export type StudyContentLanguage = "fa" | "en" | "bilingual";
export type ResolvedContentLanguage = Exclude<StudyContentLanguage, "bilingual">;
export type LeitnerCardSide = "front" | "back";

export interface ResolvedLeitnerCardText {
  text: string;
  language: ResolvedContentLanguage;
  secondaryText?: string;
  secondaryLanguage?: ResolvedContentLanguage;
  translationMissing: boolean;
}

export interface ResolvedLeitnerCardContent {
  front: ResolvedLeitnerCardText;
  back: ResolvedLeitnerCardText;
}

export function detectTextLanguageKind(text: string | null | undefined): "fa-only" | "en-only" | "mixed" {
  if (!text) return "mixed";
  const hasPersian = /[\u0600-\u06FF\uFB50-\uFDFF\uFE70-\uFEFF]/.test(text);
  const hasLatin = /[a-zA-Z]/.test(text);
  if (hasPersian && !hasLatin) return "fa-only";
  if (hasLatin && !hasPersian) return "en-only";
  return "mixed";
}

export function resolveLeitnerCardText(
  card: LeitnerCard,
  side: LeitnerCardSide,
  requestedLanguage: StudyContentLanguage,
): ResolvedLeitnerCardText {
  const originalText = card[side]?.trim() || "";
  const explicitFa = card[`${side}_fa`]?.trim() || "";
  const explicitEn = card[`${side}_en`]?.trim() || "";
  const hasExplicitFa = Boolean(explicitFa);
  const hasExplicitEn = Boolean(explicitEn);
  const hasExplicit = hasExplicitFa || hasExplicitEn;
  const originalKind = detectTextLanguageKind(originalText);

  // 1. Explicit separated fields always take priority
  if (hasExplicit) {
    if (requestedLanguage === "bilingual") {
      if (hasExplicitFa && hasExplicitEn) {
        return {
          text: explicitFa,
          language: "fa",
          secondaryText: explicitEn,
          secondaryLanguage: "en",
          translationMissing: false,
        };
      }
      if (hasExplicitFa) {
        const canUseOriginalAsEn = originalText && originalKind === "en-only";
        return {
          text: explicitFa,
          language: "fa",
          ...(canUseOriginalAsEn ? { secondaryText: originalText, secondaryLanguage: "en" as const } : {}),
          translationMissing: !canUseOriginalAsEn,
        };
      }
      // hasExplicitEn
      const canUseOriginalAsFa = originalText && originalKind === "fa-only";
      return {
        text: canUseOriginalAsFa ? originalText : explicitEn,
        language: canUseOriginalAsFa ? "fa" : "en",
        ...(canUseOriginalAsFa ? { secondaryText: explicitEn, secondaryLanguage: "en" as const } : {}),
        translationMissing: !canUseOriginalAsFa,
      };
    }

    if (requestedLanguage === "fa") {
      if (hasExplicitFa) {
        return { text: explicitFa, language: "fa", translationMissing: false };
      }
      if (!originalText && hasExplicitEn) {
        return {
          text: explicitEn,
          language: isPersianText(explicitEn) ? "fa" : "en",
          translationMissing: true,
        };
      }
      const originalIsFaOrMixed = originalText && originalKind !== "en-only";
      return {
        text: originalText || explicitEn,
        language: isPersianText(originalText) ? "fa" : "en",
        translationMissing: !originalIsFaOrMixed,
      };
    }

    // requestedLanguage === "en"
    if (hasExplicitEn) {
      return { text: explicitEn, language: "en", translationMissing: false };
    }
    if (!originalText && hasExplicitFa) {
      return {
        text: explicitFa,
        language: isPersianText(explicitFa) ? "fa" : "en",
        translationMissing: true,
      };
    }
    const originalIsEnOrMixed = originalText && originalKind !== "fa-only";
    return {
      text: originalText || explicitFa,
      language: isPersianText(originalText) ? "fa" : "en",
      translationMissing: !originalIsEnOrMixed,
    };
  }

  // 2. Legacy cards without explicit _fa/_en fields:
  // Never shorten, split, translate, or rewrite. Keep originalText in all modes.
  const kind = originalKind;
  const detectedLanguage: ResolvedContentLanguage = isPersianText(originalText) ? "fa" : "en";

  if (requestedLanguage === "bilingual") {
    // Only warn when the source is confidently single-language; never warn on mixed/uncertain legacy text
    const translationMissing = kind === "fa-only" || kind === "en-only";
    return {
      text: originalText,
      language: detectedLanguage,
      translationMissing,
    };
  }

  if (requestedLanguage === "fa") {
    const translationMissing = kind === "en-only";
    return {
      text: originalText,
      language: detectedLanguage,
      translationMissing,
    };
  }

  // requestedLanguage === "en"
  const translationMissing = kind === "fa-only";
  return {
    text: originalText,
    language: detectedLanguage,
    translationMissing,
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
    if (value === "fa" || value === "en" || value === "bilingual") return value;
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
