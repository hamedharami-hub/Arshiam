import { describe, expect, it } from "vitest";
import { getMethod, METHODS } from "./methods";

describe("Mind methods content safeguards", () => {
  it("preserves the complete core method registry and gives every method a bilingual optional finish", () => {
    expect(METHODS).toHaveLength(39);
    for (const method of METHODS) {
      const finish = method.steps[method.steps.length - 1];
      expect(finish.en).toContain("Finishing without a task or habit is valid");
      expect(finish.fa).toContain("پایان بدون ساخت تسک یا عادت");
      expect(finish.en).toContain("approximate");
    }
  });
  it("does not assure a root cause or force five repetitions", () => {
    expect(getMethod("five-whys")?.summary.en).toContain("does not guarantee");
    expect(getMethod("five-whys")?.steps[1].en).toContain("not required");
    expect(getMethod("five-whys")?.steps[2].en).toContain("hypotheses");
  });
  it("does not turn every brain dump group into tasks or force a due date", () => {
    expect(getMethod("brain-dump")?.steps[2].en).toContain("do not have to become tasks");
    expect(getMethod("small-steps")?.steps[3].en).toContain("choose a due date only if useful");
    expect(getMethod("five-min-step")?.steps[2].fa).toBe("وقتی تایمر تمام شد، آزادی متوقف شوی یا ادامه بدهی.");
  });
  it("corrects guaranteed motivation, muscle safety and incompatible three-daily-checkin advice", () => {
    expect(getMethod("behavioral-activation")?.summary.en).toContain("not guaranteed");
    expect(getMethod("progressive-relaxation")?.steps[0].en).toContain("skip painful or injured");
    expect(getMethod("energy-audit")?.steps[0].en).toContain("one daily record");
  });
});
