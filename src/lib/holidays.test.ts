import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("@/lib/arshApi", () => ({
  arshFetch: vi.fn(async () => ({
    items: [
      { date: "2026-01-26", name: "Australia Day", local_name: "Australia Day", national: true, region: null },
      { date: "2026-08-03", name: "Bank Holiday", local_name: "Bank Holiday", national: false, region: "NSW" },
    ],
  })),
}));

import { arshFetch } from "@/lib/arshApi";
import { dominantKind, getAuState, getHolidaysForRange, iranHolidaysForRange, isDayOff, setAuState } from "./holidays";

describe("Iranian holidays (@doranjs/holidays)", () => {
  it("Nowruz 1405 falls on 21–24 March 2026 and is a day off", () => {
    const list = iranHolidaysForRange(new Date(2026, 2, 20), new Date(2026, 2, 25));
    const dates = list.filter((h) => h.kind === "off").map((h) => h.date);
    expect(dates).toEqual(expect.arrayContaining(["2026-03-21", "2026-03-22", "2026-03-23", "2026-03-24"]));
  });
  it("lunar holidays are flagged approximate with their own kind", () => {
    const year = iranHolidaysForRange(new Date(2026, 2, 21), new Date(2027, 2, 20));
    const lunar = year.filter((h) => h.kind === "lunar");
    expect(lunar.length).toBeGreaterThan(0);
    expect(lunar.every((h) => h.approximate)).toBe(true);
    expect(year.some((h) => h.kind === "occasion")).toBe(true);
  });
});

describe("Australian holidays", () => {
  beforeEach(() => localStorage.clear());
  it("defaults to NSW and can be switched to national only", () => {
    expect(getAuState()).toBe("NSW");
    setAuState("");
    expect(getAuState()).toBe("");
  });
  it("requests the chosen state and falls back to the offline cache", async () => {
    const r1 = await getHolidaysForRange(new Date(2026, 0, 1), new Date(2026, 11, 31), ["AU"]);
    expect(r1.filter((h) => h.type !== "observance").map((h) => h.name)).toEqual(["Australia Day", "Bank Holiday"]);
    expect(r1.some((h) => h.type === "observance" && h.name === "Mother's Day")).toBe(true);
    expect(vi.mocked(arshFetch).mock.calls[0][0]).toContain("state=NSW");
    vi.mocked(arshFetch).mockRejectedValueOnce(new Error("offline"));
    setAuState("NSW"); // clears memo
    const r2 = await getHolidaysForRange(new Date(2026, 0, 1), new Date(2026, 11, 31), ["AU"]);
    expect(r2.filter((h) => h.type !== "observance")).toHaveLength(2);
  });
  it("day-off and dominant colour helpers", () => {
    const off = { kind: "off", official: true } as any;
    const occ = { kind: "occasion", official: false } as any;
    expect(isDayOff([occ])).toBe(false);
    expect(dominantKind([occ, off])).toBe("off");
    expect(dominantKind([])).toBeNull();
  });
});
