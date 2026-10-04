import { describe, expect, it } from "vitest";
import { CATEGORIES, TOOLS, getTopic, matchTopicsLocal } from "./tree";
import { METHODS, getMethod } from "./methods";
import { SELF_CHECKS, getSelfCheck, scoreSelfCheck } from "./selfChecks";

const SCREENERS = ["phq9", "gad7", "who5", "burnout"];

describe("needs tree integrity", () => {
  it("has the nine main categories incl. the free-write one", () => {
    expect(CATEGORIES.map((c) => c.id)).toEqual(["problem", "planning", "mood", "relationships", "work", "body", "growth", "daily", "unknown"]);
    expect(CATEGORIES.find((c) => c.id === "unknown")?.topics).toHaveLength(0);
  });

  it("every topic only references methods, checks and tools that exist", () => {
    for (const c of CATEGORIES) {
      for (const t of c.topics) {
        expect(t.methods.length, `${t.id} needs methods`).toBeGreaterThan(0);
        t.methods.forEach((m) => expect(getMethod(m), `${t.id} -> method ${m}`).toBeTruthy());
        t.checks.forEach((k) => expect(SCREENERS.includes(k) || getSelfCheck(k), `${t.id} -> check ${k}`).toBeTruthy());
        t.tools.forEach((x) => expect(TOOLS[x], `${t.id} -> tool ${x}`).toBeTruthy());
        expect(t.title.fa && t.title.en && t.question.fa && t.question.en).toBeTruthy();
      }
      c.questions.forEach((q) => expect(q.fa && q.en).toBeTruthy());
    }
  });

  it("topic ids are unique inside the tree", () => {
    const ids = CATEGORIES.flatMap((c) => c.topics.map((t) => `${c.id}/${t.id}`));
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every method has bilingual steps and no phone numbers", () => {
    for (const m of METHODS) {
      expect(m.steps.length).toBeGreaterThanOrEqual(3);
      const all = JSON.stringify(m);
      expect(/\d{3,}/.test(all.replace(/[\u06f0-\u06f9]/g, "")), `${m.id} should have no long numbers`).toBe(false);
      m.steps.forEach((s) => expect(s.fa && s.en).toBeTruthy());
    }
    expect(new Set(METHODS.map((m) => m.id)).size).toBe(METHODS.length);
  });

  it("sensitive topics exist (sadness, anxiety, grief)", () => {
    ["mood/sadness", "mood/anxiety", "growth/grief"].forEach((p) => {
      const [c, t] = p.split("/");
      expect(getTopic(c, t)?.sensitive).toBe(true);
    });
  });
});

describe("offline topic matcher", () => {
  it("maps Persian and English free text to topics", () => {
    expect(matchTopicsLocal("من خیلی اهمال کاری دارم")[0]).toEqual({ cat: "planning", topic: "procrastination" });
    expect(matchTopicsLocal("I can't sleep, insomnia every night")[0]?.topic).toBe("sleep");
    expect(matchTopicsLocal("zzzz qqqq")).toEqual([]);
  });
});

describe("self-checks", () => {
  it("has nine checks, each with 5+ bilingual items and ordered bands", () => {
    expect(SELF_CHECKS).toHaveLength(9);
    for (const c of SELF_CHECKS) {
      expect(c.items.length).toBeGreaterThanOrEqual(5);
      c.items.forEach((i) => expect(i.text.fa && i.text.en).toBeTruthy());
      expect(c.bands.map((b) => b.max)).toEqual([33, 66, 100]);
      c.bands.forEach((b) => b.methods.forEach((m) => expect(getMethod(m), `${c.id} band method ${m}`).toBeTruthy()));
    }
  });

  it("scores with reverse items and picks the band", () => {
    const stress = getSelfCheck("stress")!;
    const worst = stress.items.map((i) => (i.reverse ? 0 : 4));
    expect(scoreSelfCheck(stress, worst)).toMatchObject({ pct: 100 });
    expect(scoreSelfCheck(stress, worst).band.label.en).toBe("High");
    const best = stress.items.map((i) => (i.reverse ? 4 : 0));
    expect(scoreSelfCheck(stress, best)).toMatchObject({ pct: 0 });
    expect(scoreSelfCheck(stress, best).band.label.en).toBe("Low");
  });
});
