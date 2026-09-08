import { describe, it, expect } from "vitest";
import {
  generateLocalBuster,
  buildAIBusterPrompt,
  parseAIBusterResponse,
  PROCRASTINATION_BARRIERS,
} from "@/lib/procrastinationEngine";

describe("procrastinationEngine", () => {
  it("has all 4 CBT barriers defined with Persian metadata", () => {
    expect(PROCRASTINATION_BARRIERS.perfectionism).toBeDefined();
    expect(PROCRASTINATION_BARRIERS.overwhelm).toBeDefined();
    expect(PROCRASTINATION_BARRIERS.low_energy).toBeDefined();
    expect(PROCRASTINATION_BARRIERS.anxiety).toBeDefined();
    expect(PROCRASTINATION_BARRIERS.perfectionism.reframeFa.length).toBeGreaterThan(10);
  });

  it("detects study/reading tasks and produces tailored micro-steps", () => {
    const res = generateLocalBuster("مطالعه فصل ۴ کتاب اقتصاد", "", "overwhelm");
    expect(res.steps.length).toBeGreaterThanOrEqual(3);
    expect(res.steps.some((s) => s.text.includes("کتاب") || s.text.includes("منبع") || s.text.includes("بخوان"))).toBe(true);
    expect(res.steps.every((s) => s.estMinutes > 0)).toBe(true);
  });

  it("detects coding tasks and produces technical tailored steps", () => {
    const res = generateLocalBuster("رفع باگ ریکت و ریداکس در لاگین", "", "overwhelm");
    expect(res.steps.length).toBeGreaterThanOrEqual(3);
    expect(res.steps.some((s) => s.text.includes("محیط") || s.text.includes("فایل") || s.text.includes("لاگیک"))).toBe(true);
  });

  it("adjusts strategy for perfectionism barrier (Shitty First Draft / Good Enough)", () => {
    const res = generateLocalBuster("نوشتن مقاله دانشگاهی", "", "perfectionism");
    expect(res.steps.some((s) => s.text.includes("Shitty") || s.text.includes("پیش‌نویس") || s.text.includes("بدون ویرایش"))).toBe(true);
  });

  it("builds a rich CBT prompt for AI", () => {
    const prompt = buildAIBusterPrompt("تکمیل گزارش مالی", "پایان ماه", "anxiety");
    expect(prompt).toContain("تکمیل گزارش مالی");
    expect(prompt).toContain("CBT");
    expect(prompt).toContain("JSON");
  });

  it("parses valid JSON response from AI and enriches the result", () => {
    const fallback = generateLocalBuster("خرید لپتاپ", "", "overwhelm");
    const aiJson = JSON.stringify({
      barrier_insight: "ابهام در انتخاب مدل مناسب",
      cbt_reframe: "نیازی نیست همه مدل‌های دنیا را بررسی کنی",
      quick_win: "مشخص کردن بودجه در یک خط",
      recommended_sprint_minutes: 10,
      steps: [
        { text: "تعیین حداکثر سقف بودجه", est_minutes: 3 },
        { text: "فیلتر کردن ۳ مدل پرفروش در دیجیکالا", est_minutes: 7 },
      ],
    });

    const parsed = parseAIBusterResponse(aiJson, fallback);
    expect(parsed.barrierInsight).toBe("ابهام در انتخاب مدل مناسب");
    expect(parsed.quickWin).toBe("مشخص کردن بودجه در یک خط");
    expect(parsed.steps.length).toBe(2);
    expect(parsed.steps[0].text).toBe("تعیین حداکثر سقف بودجه");
    expect(parsed.steps[0].estMinutes).toBe(3);
  });
});
