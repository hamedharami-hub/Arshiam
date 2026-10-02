import { describe, it, expect, vi } from "vitest";
import { hasSubstantialPersianInEnglish, isPersianText, detectDirection, getTextDirClasses, generateBilingualLesson } from "./bilingualHelper";

vi.mock("./ai", () => ({
  callAI: vi.fn(),
}));

describe("bilingualHelper", () => {
  it("flags substantial Persian passages in an English field without counting markup or scripts", () => {
    const persian = "ارزیابی بیمار و بررسی سابقه دارویی در داروخانه ".repeat(10);
    const english = "Review the patient's medication history and assess the reported symptoms. ".repeat(10);
    expect(hasSubstantialPersianInEnglish(`<section><p>${english}</p><p dir="rtl">${persian}</p></section>`)).toBe(true);
    expect(hasSubstantialPersianInEnglish(`<script>${persian}</script><p>${english}</p>`)).toBe(false);
    expect(hasSubstantialPersianInEnglish("<p>Paracetamol 500 mg (پاراستامول)</p>")).toBe(false);
    expect(hasSubstantialPersianInEnglish(undefined)).toBe(false);
  });

  it("detects Persian text correctly", () => {
    expect(isPersianText("فلوکستین ۲۰ میلی‌گرم")).toBe(true);
    expect(isPersianText("Fluoxetine 20mg")).toBe(false);
    expect(isPersianText("درمان Depression با دارو")).toBe(true);
    expect(isPersianText("")).toBe(false);
    expect(isPersianText(null)).toBe(false);
  });

  it("detects text reading direction (RTL vs LTR)", () => {
    expect(detectDirection("سلام دنیا")).toBe("rtl");
    expect(detectDirection("Hello world")).toBe("ltr");
    expect(detectDirection("ACEi vs ARB in hypertension")).toBe("ltr");
  });

  it("returns proper direction and text alignment classes", () => {
    const persianResult = getTextDirClasses("مهارکننده ACE");
    expect(persianResult.dir).toBe("rtl");
    expect(persianResult.textAlign).toBe("text-right");
    expect(persianResult.className).toContain("dir-rtl");

    const englishResult = getTextDirClasses("Sertraline 50mg");
    expect(englishResult.dir).toBe("ltr");
    expect(englishResult.textAlign).toBe("text-left");
    expect(englishResult.className).toContain("dir-ltr");
  });

  it("generates fallback bilingual lesson when AI returns empty or fails", async () => {
    const { callAI } = await import("./ai");
    vi.mocked(callAI).mockRejectedValueOnce(new Error("Network offline"));

    const result = await generateBilingualLesson({
      title: "آسپرین",
      content: "<p>داروی ضد پلاکت</p>",
    });

    expect(result.title_en).toContain("آسپرین");
    expect(result.content_en).toContain("English");
  });
});
