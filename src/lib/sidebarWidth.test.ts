import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clampSidebarWidth,
  getSidebarWidth,
  setSidebarWidth,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  SIDEBAR_WIDTH_EVENT,
  SIDEBAR_WIDTH_KEY,
  SIDEBAR_WIDTH_PRESETS,
  SIDEBAR_WIDTH_PRESET_MAP,
} from "./sidebarWidth";

describe("sidebarWidth module", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("clamps sidebar width within min and max boundaries", () => {
    expect(clampSidebarWidth(100)).toBe(SIDEBAR_MIN_WIDTH);
    expect(clampSidebarWidth(600)).toBe(SIDEBAR_MAX_WIDTH);
    expect(clampSidebarWidth(280)).toBe(280);
    expect(clampSidebarWidth(NaN)).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("returns default width when nothing is stored", () => {
    expect(getSidebarWidth()).toBe(SIDEBAR_DEFAULT_WIDTH);
  });

  it("sets and gets sidebar width correctly and dispatches custom event", () => {
    const listener = vi.fn();
    window.addEventListener(SIDEBAR_WIDTH_EVENT as any, listener);

    setSidebarWidth(SIDEBAR_WIDTH_PRESET_MAP.wide);
    expect(getSidebarWidth()).toBe(340);
    expect(localStorage.getItem(SIDEBAR_WIDTH_KEY)).toBe("340");
    expect(listener).toHaveBeenCalled();

    window.removeEventListener(SIDEBAR_WIDTH_EVENT as any, listener);
  });

  it("handles presets correctly", () => {
    expect(SIDEBAR_WIDTH_PRESET_MAP.narrow).toBe(220);
    expect(SIDEBAR_WIDTH_PRESET_MAP.standard).toBe(260);
    expect(SIDEBAR_WIDTH_PRESET_MAP.wide).toBe(340);
    expect(SIDEBAR_WIDTH_PRESET_MAP.extraWide).toBe(420);

    expect(SIDEBAR_WIDTH_PRESETS.length).toBe(4);
    expect(SIDEBAR_WIDTH_PRESETS.map((p) => p.width)).toEqual([220, 260, 340, 420]);
  });
});
