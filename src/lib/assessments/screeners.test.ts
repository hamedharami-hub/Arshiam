import { describe, it, expect } from "vitest";
import { scoreScreener, SCREENERS } from "@/lib/assessments/screeners";

describe("screeners scoring", () => {
  it("PHQ-9: all zeros = minimal", () => {
    const ans = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 0]));
    const r = scoreScreener("phq9", ans);
    expect(r.raw).toBe(0);
    expect(r.severity).toBe("minimal");
    expect(r.flags).not.toContain("suicidal_ideation");
  });

  it("PHQ-9: item 9 ≥1 raises suicidal_ideation flag", () => {
    const ans = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 0]));
    ans[9] = 2;
    const r = scoreScreener("phq9", ans);
    expect(r.flags).toContain("suicidal_ideation");
  });

  it("PHQ-9: severe range (≥20)", () => {
    const ans = Object.fromEntries(SCREENERS.phq9.items.map((i) => [i.id, 3]));
    const r = scoreScreener("phq9", ans);
    expect(r.raw).toBe(27);
    expect(r.severity).toBe("severe");
  });

  it("GAD-7: 10 → moderate", () => {
    const ans: Record<number, number> = {};
    SCREENERS.gad7.items.forEach((it, idx) => { ans[it.id] = idx < 5 ? 2 : 0; });
    const r = scoreScreener("gad7", ans);
    expect(r.raw).toBe(10);
    expect(r.severity).toBe("moderate");
  });

  it("WHO-5: max raw normalizes to 100", () => {
    const ans = Object.fromEntries(SCREENERS.who5.items.map((i) => [i.id, 5]));
    const r = scoreScreener("who5", ans);
    expect(r.raw).toBe(25);
    expect(r.normalized).toBe(100);
    expect(r.severity).toBe("good");
  });

  it("WHO-5: low score flags possible depression", () => {
    const ans = Object.fromEntries(SCREENERS.who5.items.map((i) => [i.id, 1]));
    const r = scoreScreener("who5", ans);
    expect(r.flags).toContain("possible_depression_screening");
  });

  it("Burnout: max raw → severe", () => {
    const ans = Object.fromEntries(SCREENERS.burnout.items.map((i) => [i.id, 4]));
    const r = scoreScreener("burnout", ans);
    expect(r.raw).toBe(24);
    expect(r.severity).toBe("severe");
  });
});
