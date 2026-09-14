import { describe, it, expect } from "vitest";
import {
  stripTitleFormatting,
  hasTitleFormatting,
  applyFormatting,
  TITLE_COLORS,
} from "./titleFormatting";

describe("titleFormatting utilities", () => {
  it("detects formatting accurately", () => {
    expect(hasTitleFormatting("تسک ساده")).toBe(false);
    expect(hasTitleFormatting("تسک با **بولد**")).toBe(true);
    expect(hasTitleFormatting("تسک با [red]{قرمز}")).toBe(true);
    expect(hasTitleFormatting("تسک با [color:blue]{آبی}")).toBe(true);
    expect(hasTitleFormatting("تسک با [#3b82f6]{هگز}")).toBe(true);
    expect(hasTitleFormatting("تسک با ==هایلایت==")).toBe(true);
  });

  it("strips title formatting cleanly for search or speech", () => {
    expect(stripTitleFormatting("خرید **شیر** و [red]{نان}")).toBe("خرید شیر و نان");
    expect(stripTitleFormatting("[color:blue]{جلسه مهم} راس ==ساعت ۱۰==")).toBe("جلسه مهم راس ساعت ۱۰");
    expect(stripTitleFormatting("[#ec4899]{پروژه پایانی} - **فوری**")).toBe("پروژه پایانی - فوری");
    expect(stripTitleFormatting("~~انجام نشد~~ و `کد ۱۲۳`")).toBe("انجام نشد و کد ۱۲۳");
    expect(stripTitleFormatting(null)).toBe("");
  });

  it("applies bold formatting to selected text in an input", () => {
    const input = document.createElement("textarea");
    input.value = "بررسی گزارش سالانه";
    // Select "گزارش" (chars 6 to 11)
    input.selectionStart = 6;
    input.selectionEnd = 11;

    const result = applyFormatting(input, "bold");
    expect(result).not.toBeNull();
    expect(result?.newText).toBe("بررسی **گزارش** سالانه");
  });

  it("toggles bold formatting off if already wrapped", () => {
    const input = document.createElement("textarea");
    input.value = "بررسی **گزارش** سالانه";
    input.selectionStart = 6;
    input.selectionEnd = 15; // "**گزارش**"

    const result = applyFormatting(input, "bold");
    expect(result).not.toBeNull();
    expect(result?.newText).toBe("بررسی گزارش سالانه");
  });

  it("applies color formatting to selected text", () => {
    const input = document.createElement("textarea");
    input.value = "تسک بسیار فوری";
    input.selectionStart = 10;
    input.selectionEnd = 14; // "فوری"

    const result = applyFormatting(input, "color", "red");
    expect(result).not.toBeNull();
    expect(result?.newText).toBe("تسک بسیار [red]{فوری}");
  });

  it("applies highlight formatting to selected text", () => {
    const input = document.createElement("textarea");
    input.value = "نکته کلیدی مهم";
    input.selectionStart = 5;
    input.selectionEnd = 10; // "کلیدی"

    const result = applyFormatting(input, "highlight");
    expect(result).not.toBeNull();
    expect(result?.newText).toBe("نکته ==کلیدی== مهم");
  });

  it("inserts placeholder when nothing is selected", () => {
    const input = document.createElement("textarea");
    input.value = "یادداشت جدید ";
    input.selectionStart = 13;
    input.selectionEnd = 13;

    const result = applyFormatting(input, "color", "emerald");
    expect(result).not.toBeNull();
    expect(result?.newText).toBe("یادداشت جدید [emerald]{کلمه}");
  });

  it("provides valid colors palette", () => {
    expect(TITLE_COLORS.length).toBeGreaterThanOrEqual(8);
    const red = TITLE_COLORS.find((c) => c.id === "red");
    expect(red).toBeDefined();
    expect(red?.bgHex).toBe("#f43f5e");
  });
});
