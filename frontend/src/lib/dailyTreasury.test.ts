import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { importTreasury, parseTreasury, readTreasury, treasuryForDate } from "./dailyTreasury";
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
const items = [{ id: "1", kind: "lesson", fa: "متن آزمایشی", en: "Test fixture", source: "Unit test" }, { id: "2", kind: "story", fa: "نمونهٔ دوم", en: "Second fixture", source: "Unit test" }];
it("validates and stores bilingual entries without HTML execution", () => {
  expect(importTreasury(JSON.stringify(items))).toBe(2);
  expect(readTreasury()).toHaveLength(2);
  expect(() => parseTreasury(JSON.stringify([items[0], items[0]]))).toThrow();
  expect(() => parseTreasury('[{"id":"1"}]')).toThrow();
});
it("selects consistently for a date and rotates the next day", () => {
  const entries = parseTreasury(JSON.stringify(items));
  expect(treasuryForDate(entries, "2026-10-13")).toEqual(treasuryForDate(entries, "2026-10-13"));
  expect(treasuryForDate(entries, "2026-10-14")?.id).not.toBe(treasuryForDate(entries, "2026-10-13")?.id);
  expect(treasuryForDate([], "2026-10-13")).toBeNull();
});
it("preserves the old collection when the replacement is invalid or storage fails", () => {
  importTreasury(JSON.stringify(items));
  expect(() => importTreasury('[{"id":"bad"}]')).toThrow();
  expect(readTreasury()).toHaveLength(2);
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(() => importTreasury(JSON.stringify([items[0]]))).toThrow("quota");
  expect(readTreasury()).toHaveLength(2);
});
