import { describe, expect, it } from "vitest";
import { diffHtmlLines } from "./miniAppsDiff";

const project = (before: string, after: string) => {
  const diff = diffHtmlLines(before, after);
  expect(diff.lines.filter(line => line.kind !== "added").map(line => line.text).join("\n")).toBe(before);
  expect(diff.lines.filter(line => line.kind !== "removed").map(line => line.text).join("\n")).toBe(after);
  return diff;
};
describe("HTML version comparison", () => {
  it("marks a replacement without executing any HTML", () => {
    const diff = project('<p>Old</p>\n<script>alert(1)</script>', '<p>New</p>\n<script>alert(1)</script>');
    expect(diff.added).toBe(1);
    expect(diff.removed).toBe(1);
    expect(diff.lines[0]).toMatchObject({ kind: "removed", beforeLine: 1, afterLine: null });
    expect(diff.lines.at(-1)).toMatchObject({ kind: "same", beforeLine: 2, afterLine: 2 });
  });
  it("handles identical source, empty lines and final newline exactly", () => {
    expect(project("a\n", "a\n").added).toBe(0);
    project("", "a\n");
    project("a\n", "");
    project("\n\n", "\n");
    project("\r\n", "\n");
  });
  it("keeps both projections exact across insertions, removals and repeated lines", () => {
    const cases = ["", "a", "a\nb", "a\nb\na", "b\na\nb", "<p>سلام</p>\n", "a\n\nb"];
    for (const a of cases) for (const b of cases) project(a, b);
  });
  it("switches to bounded block comparison for large changes", () => {
    const before = Array.from({ length: 1000 }, (_, i) => `old ${i}`).join("\n");
    const after = Array.from({ length: 1000 }, (_, i) => `new ${i}`).join("\n");
    const diff = project(before, after);
    expect(diff.blockComparison).toBe(true);
    expect(diff.added).toBe(1000);
    expect(diff.removed).toBe(1000);
  });
  it("does not overflow the call stack on 150,000 changed lines", () => {
    const before = "\n".repeat(60_000) + "a\n".repeat(30_000);
    const after = "b\n".repeat(60_000);
    expect(project(before, after).blockComparison).toBe(true);
  });
});
