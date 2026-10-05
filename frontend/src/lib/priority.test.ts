import { describe, expect, it } from "vitest";
import { normalizeTaskPriority } from "./priority";

describe("legacy API priority compatibility", () => {
  it("maps p1…p4 conservatively into the current priority vocabulary", () => {
    expect(["p1", "p2", "p3", "p4"].map(normalizeTaskPriority)).toEqual(["high", "medium", "low", "none"]);
    expect(normalizeTaskPriority("urgent")).toBe("urgent");
  });

  it("renders unknown stored values safely as no priority", () => {
    expect(normalizeTaskPriority("unexpected" as any)).toBe("none");
    expect(normalizeTaskPriority(null)).toBe("none");
  });
});
