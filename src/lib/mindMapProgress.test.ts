import { beforeEach, describe, expect, it } from "vitest";
import { loadMindMapStudyProgress, mindMapProgressCounts, saveMindMapStudyStatus } from "./mindMapProgress";

describe("mind map study progress", () => {
  beforeEach(() => localStorage.clear());

  it("stores per-document planning states and counts unfinished work", () => {
    saveMindMapStudyStatus("u1", "d1", "studying");
    saveMindMapStudyStatus("u1", "d2", "done");
    const progress = loadMindMapStudyProgress("u1");
    expect(progress).toEqual({ d1: "studying", d2: "done" });
    expect(mindMapProgressCounts(["d1", "d2", "d3"], progress)).toEqual({ later: 1, studying: 1, done: 1 });
  });
});
