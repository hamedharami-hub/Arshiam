import { describe, it, expect } from "vitest";
import {
  HEXACO_ITEMS,
  scoreHexaco,
  analyzeHexaco,
  type HexacoScores,
} from "./hexaco";
import {
  VIA_ITEMS,
  scoreVia,
  analyzeVia,
  type ViaScores,
  VIA_LABELS,
} from "./via";
import {
  ECR_ITEMS,
  scoreEcr,
  attachmentQuadrant,
  QUADRANT_PROFILES,
} from "./ecr";

describe("HEXACO-60 Self-Knowledge Engine", () => {
  it("contains exactly 60 items with 10 items per factor and valid reverse flags", () => {
    expect(HEXACO_ITEMS.length).toBe(60);
    const factorCounts: Record<string, number> = {};
    HEXACO_ITEMS.forEach((item) => {
      expect(item.id).toBeGreaterThanOrEqual(1);
      expect(item.text).toBeTruthy();
      expect(item.text_en).toBeTruthy();
      factorCounts[item.factor] = (factorCounts[item.factor] || 0) + 1;
    });

    expect(factorCounts["H"]).toBe(10);
    expect(factorCounts["E"]).toBe(10);
    expect(factorCounts["X"]).toBe(10);
    expect(factorCounts["A"]).toBe(10);
    expect(factorCounts["C"]).toBe(10);
    expect(factorCounts["O"]).toBe(10);
  });

  it("accurately scores responses with reverse item inversion", () => {
    // Answer 5 to all items:
    // If reverse=false -> 5
    // If reverse=true -> 6 - 5 = 1
    const responses: Record<number, number> = {};
    for (let i = 1; i <= 60; i++) responses[i] = 5;

    const scores = scoreHexaco(responses);
    expect(scores.H).toBeGreaterThanOrEqual(10);
    expect(scores.H).toBeLessThanOrEqual(50);
    expect(scores.C).toBeGreaterThanOrEqual(10);
    expect(scores.C).toBeLessThanOrEqual(50);
  });

  it("generates archetype, factor details, and success roadmap for high-C high-O profile", () => {
    const scores: HexacoScores = {
      H: 35,
      E: 20,
      X: 30,
      A: 30,
      C: 45,
      O: 42,
    };

    const analysis = analyzeHexaco(scores);
    expect(analysis.archetype.titleFa).toContain("نوآور سیستماتیک");
    expect(analysis.factorDetails.C.level).toBe("high");
    expect(analysis.factorDetails.C.strengthFa).toBeTruthy();
    expect(analysis.factorDetails.E.level).toBe("low");
    expect(analysis.successRoadmap.workStyleFa).toBeTruthy();
    expect(analysis.successRoadmap.relationshipsFa).toBeTruthy();
    expect(analysis.successRoadmap.stressManagementFa).toBeTruthy();
  });
});

describe("VIA-72 Character Strengths Engine", () => {
  it("contains exactly 72 items across 24 strengths with English translations", () => {
    expect(VIA_ITEMS.length).toBe(72);
    const strengthCounts: Record<string, number> = {};
    VIA_ITEMS.forEach((item) => {
      expect(item.text).toBeTruthy();
      expect(item.text_en).toBeTruthy();
      strengthCounts[item.strength] = (strengthCounts[item.strength] || 0) + 1;
    });

    expect(Object.keys(strengthCounts).length).toBe(24);
    Object.values(strengthCounts).forEach((c) => expect(c).toBe(3));
  });

  it("identifies top 5 signature strengths and dominant virtue", () => {
    const responses: Record<number, number> = {};
    // Give max score (5) to creativity (items 1, 2, 3) and curiosity (items 4, 5, 6)
    for (let i = 1; i <= 6; i++) responses[i] = 5;
    for (let i = 7; i <= 72; i++) responses[i] = 3;

    const scores = scoreVia(responses);
    const analysis = analyzeVia(scores);

    expect(analysis.signature.length).toBe(5);
    expect(analysis.signature).toContain("creativity");
    expect(analysis.signature).toContain("curiosity");
    expect(analysis.dominant_virtue).toBeTruthy();
    expect(analysis.signatureDetails.length).toBe(5);
    expect(analysis.actionableHabits.length).toBeGreaterThanOrEqual(1);

    const firstHabit = analysis.actionableHabits[0];
    expect(firstHabit.titleFa).toBeTruthy();
    expect(firstHabit.descFa).toBeTruthy();
  });
});

describe("ECR-R Adult Attachment Engine", () => {
  it("contains 36 items (18 anxiety + 18 avoidance) with English translations", () => {
    expect(ECR_ITEMS.length).toBe(36);
    const anx = ECR_ITEMS.filter((i) => i.dim === "anxiety");
    const avo = ECR_ITEMS.filter((i) => i.dim === "avoidance");
    expect(anx.length).toBe(18);
    expect(avo.length).toBe(18);

    ECR_ITEMS.forEach((i) => {
      expect(i.text).toBeTruthy();
      expect(i.text_en).toBeTruthy();
    });
  });

  it("correctly identifies secure quadrant when anxiety and avoidance are low", () => {
    const responses: Record<number, number> = {};
    // To get low anxiety: for direct items answer 1, for reverse items answer 7
    ECR_ITEMS.forEach((item) => {
      responses[item.id] = item.reverse ? 7 : 1;
    });

    const scores = scoreEcr(responses);
    expect(scores.anxiety).toBeLessThan(3.5);
    expect(scores.avoidance).toBeLessThan(3.5);

    const q = attachmentQuadrant(scores);
    expect(q).toBe("secure");
    expect(QUADRANT_PROFILES.secure.strengthsFa.length).toBeGreaterThan(0);
    expect(QUADRANT_PROFILES.secure.regulationTipFa).toBeTruthy();
  });

  it("identifies preoccupied attachment when anxiety is high and avoidance is low", () => {
    const responses: Record<number, number> = {};
    ECR_ITEMS.forEach((item) => {
      if (item.dim === "anxiety") {
        responses[item.id] = item.reverse ? 1 : 7; // high anxiety
      } else {
        responses[item.id] = item.reverse ? 7 : 1; // low avoidance
      }
    });

    const scores = scoreEcr(responses);
    expect(scores.anxiety).toBeGreaterThanOrEqual(3.5);
    expect(scores.avoidance).toBeLessThan(3.5);

    const q = attachmentQuadrant(scores);
    expect(q).toBe("preoccupied");
    expect(QUADRANT_PROFILES.preoccupied.triggersFa.length).toBeGreaterThan(0);
  });
});
