import { describe, it, expect } from "vitest";
import { pearson, confidenceLabel, describeCorr } from "@/lib/correlation";

describe("correlation", () => {
  it("returns null for too-small sample", () => {
    expect(pearson([1, 2], [1, 2])).toBeNull();
  });

  it("perfect positive correlation = 1", () => {
    const r = pearson([1, 2, 3, 4, 5], [2, 4, 6, 8, 10])!;
    expect(r).toBeCloseTo(1, 5);
  });

  it("perfect negative correlation = -1", () => {
    const r = pearson([1, 2, 3, 4, 5], [10, 8, 6, 4, 2])!;
    expect(r).toBeCloseTo(-1, 5);
  });

  it("returns null when one series is constant", () => {
    expect(pearson([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });

  it("confidenceLabel reflects sample size and r", () => {
    expect(confidenceLabel(3, 0.9)).toBe("نمونه ناکافی");
    expect(confidenceLabel(20, 0.6)).toBe("قوی");
    expect(confidenceLabel(12, 0.4)).toBe("متوسط");
  });

  it("describeCorr produces direction + strength text", () => {
    expect(describeCorr("خواب-خلق", 0.7)).toMatch(/مثبت/);
    expect(describeCorr("استرس-تمرکز", -0.6)).toMatch(/منفی/);
  });
});
