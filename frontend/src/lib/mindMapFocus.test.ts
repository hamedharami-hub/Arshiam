import { describe, expect, it } from "vitest";
import { focusSet, nextRevealTarget, revealProgress } from "./mindMapFocus";

const links = [
  { sourceId: "root", targetId: "a" },
  { sourceId: "root", targetId: "b" },
  { sourceId: "a", targetId: "a1" },
  { sourceId: "a1", targetId: "a1x" },
  { sourceId: "b", targetId: "b1" },
];

describe("focus mode", () => {
  it("keeps ancestors and descendants of the focused node", () => {
    expect([...focusSet("a", links)!].sort()).toEqual(["a", "a1", "a1x", "root"]);
    expect(focusSet("b1", links)!.has("a")).toBe(false);
    expect(focusSet(null, links)).toBeNull();
  });
});

describe("progressive reveal", () => {
  it("reveals depth-first, one branch at a time", () => {
    const totals = { root: 2, a: 1, b: 1 };
    const all = () => true;
    // only root laid out, nothing revealed
    expect(nextRevealTarget(["root"], totals, {}, all)).toBe("root");
    // root revealed 1 child (a) -> a is last reached -> reveal inside a first
    expect(nextRevealTarget(["root", "a"], totals, { root: 1 }, all)).toBe("a");
    // a exhausted -> back to root for its second child
    expect(nextRevealTarget(["root", "a"], totals, { root: 1, a: 1 }, all)).toBe("root");
    // collapsed nodes are skipped
    expect(nextRevealTarget(["root", "a"], totals, { root: 2 }, (id) => id !== "a")).toBeNull();
  });
  it("reports progress", () => {
    expect(revealProgress(["root", "a"], { root: 2, a: 1 }, { root: 1 })).toEqual({ shown: 1, total: 3 });
  });
});
