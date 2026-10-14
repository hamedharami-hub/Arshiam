import { describe, it, expect } from "vitest";
import {
  scoreScreener,
  validateScreenerAnswers,
  SCREENERS,
  SCREENER_PROVENANCE,
  type ScreenerType,
} from "@/lib/assessments/screeners";

describe("Screener Validation & Missing Data Handling", () => {
  it("empty answers are NOT treated as 0 and yield an incomplete result without a valid clinical score", () => {
    const emptyResult = scoreScreener("phq9", {});
    expect(emptyResult.isComplete).toBe(false);
    expect(emptyResult.raw).toBeNull();
    expect(emptyResult.normalized).toBeNull();
    expect(emptyResult.severity).toBe("incomplete");
    expect(emptyResult.answeredCount).toBe(0);
  });

  it("partially answered screener does NOT fabricate scores from 0", () => {
    const partial: Record<number, number> = { 1: 2, 2: 3 }; // Only 2 out of 9 answered
    const res = scoreScreener("phq9", partial);
    expect(res.isComplete).toBe(false);
    expect(res.raw).toBeNull();
    expect(res.answeredCount).toBe(2);
    expect(res.totalCount).toBe(9);
  });

  it("rejects NaN, floats, and out-of-range inputs", () => {
    const invalidAnswers: Record<number, any> = {
      1: "not a number",
      2: 2.5,
      3: -1,
      4: 99,
    };
    const validation = validateScreenerAnswers("phq9", invalidAnswers);
    expect(validation.isValid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });

  it("PHQ-9 item 9 (self-harm) triggers crisis support INDEPENDENTLY of total score or completeness", () => {
    // Only item 9 answered with 1 (several days)
    const res = scoreScreener("phq9", { 9: 1 });
    expect(res.flags).toContain("suicidal_ideation");
    expect(res.isComplete).toBe(false); // Incomplete, but flag is STILL raised!

    // Full PHQ-9 with minimal total score (e.g. 1 point total on item 9)
    const allZeroExcept9 = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 0]));
    allZeroExcept9[9] = 1;
    const fullRes = scoreScreener("phq9", allZeroExcept9);
    expect(fullRes.raw).toBe(1);
    expect(fullRes.severity).toBe("minimal"); // Total score is minimal
    expect(fullRes.flags).toContain("suicidal_ideation"); // But crisis flag is present!
  });
});

// Arithmetic reference fixtures for published summation/cutoffs, not evidence
// that the app's current wording or translation has been validated.
function answersWithTotal(type: ScreenerType, total: number) {
  const max = SCREENERS[type].scale - 1;
  return Object.fromEntries(SCREENERS[type].items.map((item) => {
    const value = Math.min(max, total);
    total -= value;
    return [item.id, value];
  }));
}

describe("Published summation examples and unchanged historical contracts", () => {
  it.each([
    [0, "minimal"], [4, "minimal"], [5, "mild"], [9, "mild"],
    [10, "moderate"], [14, "moderate"], [15, "moderately_severe"],
    [19, "moderately_severe"], [20, "severe"], [27, "severe"],
  ])("PHQ-9 (Kroenke 2001): total %i is %s", (total, severity) => {
    const result = scoreScreener("phq9", answersWithTotal("phq9", Number(total)));
    expect(result.raw).toBe(total);
    expect(result.severity).toBe(severity);
  });

  it.each([[0, "minimal"], [4, "minimal"], [5, "mild"], [9, "mild"], [10, "moderate"], [14, "moderate"], [15, "severe"], [21, "severe"]])(
    "GAD-7 (Spitzer 2006): total %i is %s", (total, severity) => {
      const result = scoreScreener("gad7", answersWithTotal("gad7", Number(total)));
      expect(result.raw).toBe(total);
      expect(result.severity).toBe(severity);
    }
  );

  it.each([0, 6, 7, 12, 13, 17, 18, 25])("WHO-5 summation: raw %i multiplies by four; legacy app bands remain untouched", (raw) => {
    const result = scoreScreener("who5", answersWithTotal("who5", raw));
    expect(result.raw).toBe(raw);
    expect(result.normalized).toBe(raw * 4);
    expect(result.severity).toBe(raw >= 18 ? "good" : raw >= 13 ? "moderate" : raw >= 7 ? "low" : "severe");
    expect(result.flags.includes("possible_depression_screening")).toBe(raw <= 12);
  });

  it("WHO-5 worked response example is 3+2+4+1+5 = 15 raw, 60/100, not a percentage diagnosis", () => {
    expect(scoreScreener("who5", { 1: 3, 2: 2, 3: 4, 4: 1, 5: 5 })).toMatchObject({ raw: 15, normalized: 60 });
  });

  it.each([[0, "minimal"], [5, "minimal"], [6, "mild"], [11, "mild"], [12, "moderate"], [17, "moderate"], [18, "severe"], [24, "severe"]])(
    "personal burnout legacy total %i keeps %s in storage (not a validated cutoff)", (raw, severity) => {
      expect(scoreScreener("burnout", answersWithTotal("burnout", Number(raw)))).toMatchObject({ raw, severity });
    }
  );

  it("preserves every existing standard item, answer option, timeframe and scoring identifier", () => {
    expect(["phq9", "gad7", "who5"].map((type) => {
      const meta = SCREENERS[type as ScreenerType];
      return { type, items: meta.items, labels: meta.labels, labels_en: meta.labels_en, subtitle: meta.subtitle, subtitle_en: meta.subtitle_en, scale: meta.scale, scaleStart: meta.scaleStart, timeframe: meta.timeframe, timeframe_en: meta.timeframe_en, instrumentVersion: meta.instrumentVersion, scoringVersion: meta.scoringVersion };
    })).toMatchSnapshot();
  });

  it("does not mutate answer records or silently validate translation/licensing", () => {
    const answers = Object.freeze({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 0, 6: 1, 7: 2, 8: 3, 9: 0 });
    scoreScreener("phq9", answers);
    expect(answers).toEqual({ 1: 0, 2: 1, 3: 2, 4: 3, 5: 0, 6: 1, 7: 2, 8: 3, 9: 0 });
    Object.values(SCREENER_PROVENANCE).forEach((meta) => {
      expect(meta.translationValidation).toBe("unknown");
      expect(meta.permissionStatus).toBe("unknown");
    });
    expect(SCREENER_PROVENANCE.burnout.originalVersion_en).toContain("not a version of MBI or CBI");
  });
});

describe("Standardized Instruments Scoring & Direction", () => {
  it("PHQ-9: all zeros = minimal (0-4), max = severe (20-27)", () => {
    const zeroAns = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 0]));
    const minRes = scoreScreener("phq9", zeroAns);
    expect(minRes.raw).toBe(0);
    expect(minRes.severity).toBe("minimal");
    expect(minRes.isComplete).toBe(true);

    const maxAns = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 3]));
    const maxRes = scoreScreener("phq9", maxAns);
    expect(maxRes.raw).toBe(27);
    expect(maxRes.severity).toBe("severe");
  });

  it("GAD-7: item 1 Persian text is natural and cutoffs match Spitzer (2006)", () => {
    expect(SCREENERS.gad7.items[0].text).toContain("بی‌قراری");
    expect(SCREENERS.gad7.items[0].text).not.toContain("لبه‌ای");

    const ans: Record<number, number> = {};
    SCREENERS.gad7.items.forEach((it, idx) => {
      ans[it.id] = idx < 5 ? 2 : 0;
    }); // 5*2 = 10
    const r = scoreScreener("gad7", ans);
    expect(r.raw).toBe(10);
    expect(r.severity).toBe("moderate"); // 10-14 is moderate
  });

  it("WHO-5: POSITIVE direction (higher = better wellbeing), raw * 4 = 0..100", () => {
    expect(SCREENERS.who5.higherIsBetter).toBe(true);

    // Max score = 25 raw -> 100% wellbeing -> "good"
    const maxAns = Object.fromEntries(SCREENERS.who5.items.map((i) => [i.id, 5]));
    const goodRes = scoreScreener("who5", maxAns);
    expect(goodRes.raw).toBe(25);
    expect(goodRes.normalized).toBe(100);
    expect(goodRes.severity).toBe("good");
    expect(goodRes.flags).not.toContain("possible_depression_screening");

    // Low score = 1 on each (5 raw -> 20%) -> flags depression screening
    const lowAns = Object.fromEntries(SCREENERS.who5.items.map((i) => [i.id, 1]));
    const lowRes = scoreScreener("who5", lowAns);
    expect(lowRes.raw).toBe(5);
    expect(lowRes.normalized).toBe(20);
    expect(lowRes.severity).toBe("severe"); // <28 is severe deficit in wellbeing
    expect(lowRes.flags).toContain("possible_depression_screening");
  });

  it("Burnout: reframed as personal self-reflection without ungrounded CBI claims", () => {
    expect(SCREENERS.burnout.isStandardized).toBe(false);
    expect(SCREENERS.burnout.title).toContain("خودگزارش‌شده");

    const ans = Object.fromEntries(SCREENERS.burnout.items.map((i) => [i.id, 4]));
    const r = scoreScreener("burnout", ans);
    expect(r.raw).toBe(24);
    expect(r.severity).toBe("severe");
  });

  it("preserves metadata including version, scoringVersion, and sourceUrl", () => {
    (["phq9", "gad7", "who5", "burnout"] as ScreenerType[]).forEach((type) => {
      const allZero = Object.fromEntries(SCREENERS[type].items.map((i) => [i.id, 0]));
      const r = scoreScreener(type, allZero);
      expect(r.instrumentVersion).toBeTruthy();
      expect(r.scoringVersion).toBeTruthy();
      expect(r.timeframe).toBeTruthy();
    });
  });
});
