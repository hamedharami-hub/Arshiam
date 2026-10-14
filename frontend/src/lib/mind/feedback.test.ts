import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { clearMindFeedback, readMindFeedback, recordMindFeedback } from "./feedback";
const input = { toolId: "breathing", toolVersion: "1", sessionId: "s1", response: "helpful" as const };
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it("isolates owners and replaces only the same session's explicit response", () => {
  expect(recordMindFeedback("a", input)).toBe(true);
  expect(recordMindFeedback("a", { ...input, response: "no_change" })).toBe(true);
  expect(readMindFeedback("a")).toHaveLength(1);
  expect(readMindFeedback("a")[0].response).toBe("no_change");
  expect(readMindFeedback("b")).toEqual([]);
  expect(recordMindFeedback("a", { ...input, sessionId: "s2" })).toBe(true);
  expect(readMindFeedback("a")).toHaveLength(2);
});
it("reports quota failure and retains previous feedback", () => {
  recordMindFeedback("a", input);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
  expect(recordMindFeedback("a", { ...input, response: "uncomfortable" })).toBe(false);
  expect(readMindFeedback("a")[0].response).toBe("helpful");
});
it("rejects corrupt storage rather than replacing it", () => {
  localStorage.setItem("arshiam:mind:feedback:v1:a", "broken");
  expect(recordMindFeedback("a", input)).toBe(false);
  expect(localStorage.getItem("arshiam:mind:feedback:v1:a")).toBe("broken");
});
it("deletes only the selected owner's local feedback with verified success", () => {
  recordMindFeedback("a", input); recordMindFeedback("b", input);
  expect(clearMindFeedback("a")).toBe(true);
  expect(readMindFeedback("a")).toEqual([]);
  expect(readMindFeedback("b")).toHaveLength(1);
});
