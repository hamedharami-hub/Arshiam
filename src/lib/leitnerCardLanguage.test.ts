import { describe, expect, it } from "vitest";
import type { LeitnerCard } from "./leitnerTypes";
import { resolveLeitnerCardContent, resolveLeitnerCardText } from "./leitnerCardLanguage";

const baseCard: LeitnerCard = {
  id: "card-1",
  user_id: "user-1",
  front: "مکانیسم اثر چیست؟",
  back: "مهار انتخابی بازجذب سروتونین.",
  box: 1,
  next_review_at: "2026-09-25T00:00:00.000Z",
  review_count: 0,
  lapse_count: 0,
  created_at: "2026-09-25T00:00:00.000Z",
  updated_at: "2026-09-25T00:00:00.000Z",
};

describe("Leitner card language resolution", () => {
  it("shows explicitly stored translations and keeps each side's direction independent", () => {
    const card = {
      ...baseCard,
      front_en: "What is the mechanism of action?",
      back_en: "Selective serotonin reuptake inhibition.",
    };

    expect(resolveLeitnerCardContent(card, "en")).toEqual({
      front: { text: card.front_en, language: "en", translationMissing: false },
      back: { text: card.back_en, language: "en", translationMissing: false },
    });
    expect(resolveLeitnerCardText(card, "front", "fa")).toEqual({
      text: baseCard.front,
      language: "fa",
      translationMissing: false,
    });
  });

  it("preserves legacy front/back cards and clearly signals when translation is absent", () => {
    expect(resolveLeitnerCardText(baseCard, "front", "en")).toEqual({
      text: baseCard.front,
      language: "fa",
      translationMissing: true,
    });
    expect(resolveLeitnerCardText(baseCard, "back", "fa")).toEqual({
      text: baseCard.back,
      language: "fa",
      translationMissing: false,
    });
  });

  it("uses a valid translation even if the legacy fallback uses another language", () => {
    const card = { ...baseCard, front_fa: "پرسش فارسی" };
    expect(resolveLeitnerCardText(card, "front", "fa")).toEqual({
      text: "پرسش فارسی",
      language: "fa",
      translationMissing: false,
    });
  });
});
