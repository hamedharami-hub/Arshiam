import { describe, it, expect } from "vitest";
import { scoreDistortions, highlightSegments } from "@/lib/distortions";

describe("distortions", () => {
  it("detects overgeneralization keywords", () => {
    const s = scoreDistortions("همیشه شکست می‌خورم و هیچ‌کس به من اهمیت نمی‌دهد");
    expect(s.overgeneralization).toBeGreaterThan(0);
  });

  it("returns zero scores for neutral text", () => {
    const s = scoreDistortions("امروز هوا خوب است");
    expect(Object.values(s).every((v) => v === 0)).toBe(true);
  });

  it("highlightSegments returns sorted non-overlapping ranges", () => {
    const segs = highlightSegments("همیشه شکست می‌خورم و هیچ‌وقت موفق نمی‌شوم");
    expect(segs.length).toBeGreaterThan(0);
    for (let i = 1; i < segs.length; i++) {
      expect(segs[i].start).toBeGreaterThanOrEqual(segs[i - 1].end);
    }
  });
});
