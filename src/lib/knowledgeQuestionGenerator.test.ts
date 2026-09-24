import { describe, it, expect, vi } from "vitest";
import {
  extractJsonFromResponse,
  generateOfflineQuestions,
  generateQuestionsFromText,
} from "./knowledgeQuestionGenerator";

vi.mock("./ai", () => ({
  callAI: vi.fn(),
}));

describe("knowledgeQuestionGenerator", () => {
  it("extracts json from raw text or markdown code blocks", () => {
    const rawJson = '[{"front":"سوال 1","back":"پاسخ 1"}]';
    expect(extractJsonFromResponse(rawJson)).toEqual([{ front: "سوال 1", back: "پاسخ 1" }]);

    const markdownBlock = 'Here are cards:\n```json\n[{"front":"Q2","back":"A2","clue":"H2"}]\n```\nGood luck!';
    expect(extractJsonFromResponse(markdownBlock)).toEqual([{ front: "Q2", back: "A2", clue: "H2" }]);
  });

  it("generates deterministic questions from offline text with definitions and warnings", () => {
    const text = `
فلوکستین: یک داروی ضد افسردگی از دسته مهارکننده انتخابی بازجذب سروتونین است.
هشدار: مصرف همزمان این دارو با مهارکننده‌های MAO کاملاً ممنوع است زیرا ممکن است باعث سندرم سروتونین شود.
مکانیسم اثر دارو افزایش غلظت سروتونین در سیناپس‌های مغزی است.
    `;

    const cards = generateOfflineQuestions(text, "فلوکستین");
    expect(cards.length).toBeGreaterThanOrEqual(2);
    expect(cards[0].front).toContain("فلوکستین");
    expect(cards[0].back.length).toBeGreaterThan(10);
    expect(cards[0].selected).toBe(true);

    const warningCard = cards.find((c) => c.type === "warning");
    expect(warningCard).toBeDefined();
    expect(warningCard?.back).toContain("ممنوع");
  });

  it("extracts concise labelled facts from flattened bilingual source text", () => {
    const text = "مسیر متابولیک و اهمیت بالینی: CYP2C19 🚫 مهارکننده‌ها (Inhibitors): Omeprazole / Esomeprazole Fluoxetine / Fluvoxamine ⚡ القاکننده‌ها (Inducers): Rifampicin 🎯 سوبستراها (Substrates): Clopidogrel Hepatic Metabolic Pathway &amp; Clinical Significance: CYP2C19 🚫 Potent Inhibitors: Omeprazole / Esomeprazole Fluoxetine / Fluvoxamine ⚠️ زوج‌های تداخلی پرتکرار: Clopidogrel + Omeprazole (high)";
    const cards = generateOfflineQuestions(text, "CYP2C19");
    expect(cards.length).toBeGreaterThanOrEqual(3);
    const inhibitors = cards.find((card) => card.back.includes("Omeprazole"));
    expect(inhibitors?.front).toContain("مهارکننده");
    expect(inhibitors?.back).not.toContain("Rifampicin");
    expect(inhibitors?.back).not.toContain("Clinical Significance");
    expect(cards.some((card) => card.back.includes("&amp;"))).toBe(false);
    const interaction = cards.find((card) => card.back.includes("Clopidogrel + Omeprazole"));
    expect(interaction?.back).toBe("Clopidogrel + Omeprazole (high)");
  });

  it("rejects AI cards that copy most of the source and uses the source-grounded fallback", async () => {
    const { callAI } = await import("./ai");
    const text = "Warnings: Avoid concurrent use with an MAO inhibitor due to serotonin syndrome. Inhibitors: Fluoxetine and fluvoxamine.";
    vi.mocked(callAI).mockResolvedValueOnce({
      text: JSON.stringify([{ front: "What is the warning?", back: text }]),
    });

    const result = await generateQuestionsFromText({ text, documentTitle: "Interactions" });

    expect(result.length).toBeGreaterThan(0);
    expect(result.every((card) => card.back !== text)).toBe(true);
    expect(result.some((card) => card.back.includes("MAO inhibitor"))).toBe(true);
  });

  it("falls back to offline generator when callAI throws an error", async () => {
    const { callAI } = await import("./ai");
    vi.mocked(callAI).mockRejectedValueOnce(new Error("Network offline"));

    const text = "Aspirin: An irreversible cyclooxygenase inhibitor used for antiplatelet therapy.";
    const result = await generateQuestionsFromText({
      text,
      documentTitle: "Aspirin",
    });

    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].front).toContain("Aspirin");
    expect(result[0].back).toContain("cyclooxygenase");
    expect(result[0].selected).toBe(true);
  });
});
