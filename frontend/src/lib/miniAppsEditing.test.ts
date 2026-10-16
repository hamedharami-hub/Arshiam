import { describe, expect, it } from "vitest";
import { findTextMatches, indentHtmlSelection, previewLocationToSource, selectionForLine } from "./miniAppsEditing";

describe("HTML code editing helpers", () => {
  it("finds literal text without interpreting regex or replacement metacharacters", () => {
    expect(findTextMatches("<p>.*</p> .*", ".*")).toEqual([{ start: 3, end: 5 }, { start: 10, end: 12 }]);
    expect(findTextMatches("x", "")).toEqual([]);
    expect(findTextMatches("Hello hello HELLO", "hello")).toHaveLength(3);
    expect(findTextMatches("Hello hello HELLO", "hello", true)).toEqual([{ start: 6, end: 11 }]);
    expect(findTextMatches("سلام، سلام", "سلام")).toHaveLength(2);
  });
  it("keeps original Unicode offsets for case-insensitive matches", () => {
    const value = "İabc ABC";
    const matches = findTextMatches(value, "abc");
    expect(matches.map(match => value.slice(match.start, match.end))).toEqual(["abc", "ABC"]);
  });
  it("inserts two spaces at a caret without rewriting the rest of the source", () => {
    expect(indentHtmlSelection("<p>Text</p>", 3, 3)).toEqual({ value: "<p>  Text</p>", start: 5, end: 5 });
  });
  it("indents selected lines but not the following line at a boundary", () => {
    expect(indentHtmlSelection("a\nb\nc", 0, 4)).toEqual({ value: "  a\n  b\nc", start: 2, end: 8 });
  });
  it("outdents spaces or tabs without deleting content", () => {
    expect(indentHtmlSelection("  a\n\tb\nc", 0, 7, true)).toEqual({ value: "a\nb\nc", start: 0, end: 4 });
    expect(indentHtmlSelection("word", 2, 2, true)).toEqual({ value: "word", start: 2, end: 2 });
  });
  it("handles an initial blank line and empty source", () => {
    expect(indentHtmlSelection("\na", 0, 2).value).toBe("  \n  a");
    expect(indentHtmlSelection("", 0, 0).value).toBe("  ");
  });
  it("clamps line and column navigation to source bounds", () => {
    expect(selectionForLine("a\nbc\nd", 2, 2)).toEqual({ start: 3, end: 3 });
    expect(selectionForLine("a\nbc", 999, 999)).toEqual({ start: 4, end: 4 });
    expect(selectionForLine("", -2, -4)).toEqual({ start: 0, end: 0 });
  });
  it("subtracts bridge lines only for valid locations in the exact executed source", () => {
    const source = "<html>\n<script>\nthrow Error('broken')\n</script>";
    const preview = "bridge\npolicy\n" + source;
    expect(previewLocationToSource(preview, source, 5, 3)).toEqual({ line: 3, column: 3 });
    expect(previewLocationToSource(preview, source, 1, 3)).toBeNull();
    expect(previewLocationToSource(preview, "different", 5, 3)).toBeNull();
    expect(previewLocationToSource(preview, source, 999, 3)).toBeNull();
    expect(previewLocationToSource(preview, source, 3, 0)).toEqual({ line: 1, column: 1 });
  });
});
