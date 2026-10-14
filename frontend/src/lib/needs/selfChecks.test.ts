import { describe, expect, it } from "vitest";
import { getSelfCheck, reviewSelfCheck, scoreSelfCheck, SELF_CHECKS, selfCheckPresentation } from "./selfChecks";

describe("versioned personal self-check presentation", () => {
  it("preserves legacy reverse scoring and bands for every check at reference endpoints and midpoint", () => {
    for (const def of SELF_CHECKS) {
      const low = def.items.map((item) => item.reverse ? 4 : 0);
      const high = def.items.map((item) => item.reverse ? 0 : 4);
      expect(scoreSelfCheck(def, low).pct).toBe(0);
      expect(scoreSelfCheck(def, high).pct).toBe(100);
      expect(scoreSelfCheck(def, def.items.map(() => 2)).pct).toBe(50);
      expect(def.bands.map((band) => band.max)).toEqual([33, 66, 100]);
      expect(selfCheckPresentation(def).items.map((item) => item.reverse)).toEqual(def.items.map((item) => item.reverse));
    }
    expect(scoreSelfCheck(getSelfCheck("stress")!, [4, 4, 4, 4, 4, 4]).pct).toBe(83);
  });

  it("only corrects future copy, without mutating historical definitions or item order", () => {
    const before = JSON.stringify(SELF_CHECKS);
    expect(selfCheckPresentation(getSelfCheck("stress")!).items[4].text.fa).toBe("با وجود کارها و فکرها خوب می‌خوابم.");
    expect(selfCheckPresentation(getSelfCheck("self-esteem")!).title.fa).toBe("ارزش‌گذاری به خود");
    expect(selfCheckPresentation(getSelfCheck("relationship-satisfaction")!).items[1].text.fa).toBe("می‌توانم نیازهایم را بیان کنم.");
    expect(JSON.stringify(SELF_CHECKS)).toBe(before);
  });

  it("describes the actual selected response even for reversed items, with no severity band", () => {
    const review = reviewSelfCheck(getSelfCheck("stress")!, [0, 1, 2, 3, 4, 0]);
    expect(review).toMatchObject({ version: "responses-v2", complete: true });
    expect(review.responses.map((response) => response.answer?.en)).toEqual(["Never", "Rarely", "Sometimes", "Often", "Always", "Never"]);
    expect(review).not.toHaveProperty("band");
    expect(new Set(review.methods).size).toBe(review.methods.length);
  });

  it.each([[], [0, 0, 0, 0, null, 0], [0, 0, 0, 0, 5, 0], [0, 0, 0, 0, -1, 0], [0, 0, 0, 0, 1.5, 0]].map((answers) => ({ answers })))("does not invent responses for incomplete or invalid values: $answers", ({ answers }) => {
    const review = reviewSelfCheck(getSelfCheck("stress")!, answers);
    expect(review.complete).toBe(false);
    expect(review.responses.every((response) => response.answer === null)).toBe(true);
  });
});
