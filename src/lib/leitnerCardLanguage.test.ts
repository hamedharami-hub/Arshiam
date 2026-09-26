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

  it("returns separate Persian and English lines in bilingual mode", () => {
    const card = {
      ...baseCard,
      front_fa: "پرسش فارسی",
      front_en: "English question",
      back_fa: "پاسخ فارسی",
      back_en: "English answer",
    };

    expect(resolveLeitnerCardContent(card, "bilingual")).toEqual({
      front: {
        text: "پرسش فارسی",
        language: "fa",
        secondaryText: "English question",
        secondaryLanguage: "en",
        translationMissing: false,
      },
      back: {
        text: "پاسخ فارسی",
        language: "fa",
        secondaryText: "English answer",
        secondaryLanguage: "en",
        translationMissing: false,
      },
    });
  });

  it("keeps whichever language exists and marks a missing bilingual counterpart", () => {
    const card = { ...baseCard, front: "", front_en: "English only" };

    expect(resolveLeitnerCardText(card, "front", "bilingual")).toEqual({
      text: "English only",
      language: "en",
      translationMissing: true,
    });
  });

  it("preserves legacy mixed strings verbatim without dropping English text on Persian presence", () => {
    const legacyMixedCard: LeitnerCard = {
      ...baseCard,
      front: "Amoxicillin (500mg) - کاربرد در عفونت‌های باکتریایی گوش و حلق",
      back: "Take with or without food. همراه با آب فراوان مصرف شود.",
    };

    // Resolving front text in any mode preserves the full string without stripping English
    const resolvedFrontFa = resolveLeitnerCardText(legacyMixedCard, "front", "fa");
    expect(resolvedFrontFa.text).toBe("Amoxicillin (500mg) - کاربرد در عفونت‌های باکتریایی گوش و حلق");
    expect(resolvedFrontFa.translationMissing).toBe(false);

    const resolvedFrontEn = resolveLeitnerCardText(legacyMixedCard, "front", "en");
    expect(resolvedFrontEn.text).toBe("Amoxicillin (500mg) - کاربرد در عفونت‌های باکتریایی گوش و حلق");
    expect(resolvedFrontEn.translationMissing).toBe(false);

    const resolvedFrontBilingual = resolveLeitnerCardText(legacyMixedCard, "front", "bilingual");
    expect(resolvedFrontBilingual.text).toBe("Amoxicillin (500mg) - کاربرد در عفونت‌های باکتریایی گوش و حلق");
    expect(resolvedFrontBilingual.translationMissing).toBe(false);

    const resolvedBackFa = resolveLeitnerCardText(legacyMixedCard, "back", "fa");
    expect(resolvedBackFa.text).toBe("Take with or without food. همراه با آب فراوان مصرف شود.");
    expect(resolvedBackFa.translationMissing).toBe(false);

    const resolvedBackEn = resolveLeitnerCardText(legacyMixedCard, "back", "en");
    expect(resolvedBackEn.text).toBe("Take with or without food. همراه با آب فراوان مصرف شود.");
    expect(resolvedBackEn.translationMissing).toBe(false);

    const resolvedBackBilingual = resolveLeitnerCardText(legacyMixedCard, "back", "bilingual");
    expect(resolvedBackBilingual.text).toBe("Take with or without food. همراه با آب فراوان مصرف شود.");
    expect(resolvedBackBilingual.translationMissing).toBe(false);
  });

  it("handles pure Persian-only and pure English-only legacy cards accurately across all modes", () => {
    const pureFaCard: LeitnerCard = {
      ...baseCard,
      front: "مهارکننده پمپ پروتون چیست؟",
      back: "امپرازول",
    };
    expect(resolveLeitnerCardText(pureFaCard, "front", "fa")).toMatchObject({
      text: "مهارکننده پمپ پروتون چیست؟",
      language: "fa",
      translationMissing: false,
    });
    expect(resolveLeitnerCardText(pureFaCard, "front", "en")).toMatchObject({
      text: "مهارکننده پمپ پروتون چیست؟",
      language: "fa",
      translationMissing: true,
    });
    expect(resolveLeitnerCardText(pureFaCard, "front", "bilingual")).toMatchObject({
      text: "مهارکننده پمپ پروتون چیست؟",
      language: "fa",
      translationMissing: true,
    });

    const pureEnCard: LeitnerCard = {
      ...baseCard,
      front: "What is the indication for amlodipine?",
      back: "Hypertension and angina pectoris.",
    };
    expect(resolveLeitnerCardText(pureEnCard, "front", "en")).toMatchObject({
      text: "What is the indication for amlodipine?",
      language: "en",
      translationMissing: false,
    });
    expect(resolveLeitnerCardText(pureEnCard, "front", "fa")).toMatchObject({
      text: "What is the indication for amlodipine?",
      language: "en",
      translationMissing: true,
    });
    expect(resolveLeitnerCardText(pureEnCard, "front", "bilingual")).toMatchObject({
      text: "What is the indication for amlodipine?",
      language: "en",
      translationMissing: true,
    });
  });

  it("gives explicit separated fields priority over legacy front/back", () => {
    const cardWithBoth: LeitnerCard = {
      ...baseCard,
      front: "Legacy Front Text",
      back: "Legacy Back Text",
      front_fa: "پرسش به زبان فارسی",
      front_en: "Question in English",
      back_fa: "پاسخ به زبان فارسی",
      back_en: "Answer in English",
    };

    expect(resolveLeitnerCardText(cardWithBoth, "front", "fa")).toEqual({
      text: "پرسش به زبان فارسی",
      language: "fa",
      translationMissing: false,
    });
    expect(resolveLeitnerCardText(cardWithBoth, "front", "en")).toEqual({
      text: "Question in English",
      language: "en",
      translationMissing: false,
    });
    expect(resolveLeitnerCardText(cardWithBoth, "front", "bilingual")).toEqual({
      text: "پرسش به زبان فارسی",
      language: "fa",
      secondaryText: "Question in English",
      secondaryLanguage: "en",
      translationMissing: false,
    });
  });

  it("returns existing explicit text, preserves its actual language, and sets translationMissing=true when original text is empty", () => {
    // Direction 1: only explicit fa exists, original front/back is empty
    const onlyFaCard: LeitnerCard = {
      ...baseCard,
      front: "",
      back: "   ",
      front_fa: "پرسش فقط فارسی",
      back_fa: "پاسخ فقط فارسی",
    };

    // When requested language is "fa", it uses the explicit fa field
    expect(resolveLeitnerCardText(onlyFaCard, "front", "fa")).toEqual({
      text: "پرسش فقط فارسی",
      language: "fa",
      translationMissing: false,
    });

    // When requested language is "en", it falls back to explicit fa, preserves language "fa", translationMissing=true
    expect(resolveLeitnerCardText(onlyFaCard, "front", "en")).toEqual({
      text: "پرسش فقط فارسی",
      language: "fa",
      translationMissing: true,
    });
    expect(resolveLeitnerCardText(onlyFaCard, "back", "en")).toEqual({
      text: "پاسخ فقط فارسی",
      language: "fa",
      translationMissing: true,
    });

    // Direction 2: only explicit en exists, original front/back is empty
    const onlyEnCard: LeitnerCard = {
      ...baseCard,
      front: "",
      back: "",
      front_en: "English only question",
      back_en: "English only answer",
    };

    // When requested language is "en", it uses the explicit en field
    expect(resolveLeitnerCardText(onlyEnCard, "front", "en")).toEqual({
      text: "English only question",
      language: "en",
      translationMissing: false,
    });

    // When requested language is "fa", it falls back to explicit en, preserves language "en", translationMissing=true
    expect(resolveLeitnerCardText(onlyEnCard, "front", "fa")).toEqual({
      text: "English only question",
      language: "en",
      translationMissing: true,
    });
    expect(resolveLeitnerCardText(onlyEnCard, "back", "fa")).toEqual({
      text: "English only answer",
      language: "en",
      translationMissing: true,
    });
  });
});
