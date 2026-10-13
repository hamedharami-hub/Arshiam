import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { getDailyExtrasSettings, setDailyExtrasSettings } from "./dailyExtrasSettings";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
describe("daily extras preferences", () => {
  it("defaults network features to off and persists independent switches", () => {
    expect(getDailyExtrasSettings()).toMatchObject({ weather: false, calendarWeather: false, news: false, inspiration: false });
    expect(setDailyExtrasSettings({ calendarWeather: true })).toBe(true);
    expect(getDailyExtrasSettings()).toMatchObject({ weather: false, calendarWeather: true });
  });
  it("rejects corrupt stored types", () => {
    localStorage.setItem("arsh_daily_extras_v1", '{"weather":"true","news":1}');
    expect(getDailyExtrasSettings()).toMatchObject({ weather: false, news: false });
  });
  it("does not report success for inaccessible storage", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("full"); });
    expect(setDailyExtrasSettings({ weather: true })).toBe(false);
  });
});
