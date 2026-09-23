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
