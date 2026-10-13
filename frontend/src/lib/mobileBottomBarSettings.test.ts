import { afterEach, describe, expect, it, vi } from "vitest";
import { getAccessibleMobileTabs, ALL_MOBILE_TAB_OPTIONS, DEFAULT_MOBILE_BOTTOM_TABS, resetMobileBottomTabs, setMobileBottomTabs, setMobileTabHoldEnabled, useMobileBottomTabs } from "./mobileBottomBarSettings";
import { act, renderHook } from "@testing-library/react";
afterEach(() => vi.restoreAllMocks());
import type { ModulesState } from "./appModules";

const lockedModules: ModulesState = {
  ready: true,
  unlocked: [],
  installed: [],
  isAdmin: false,
  isOwner: false,
};

describe("mobile bottom navigation options", () => {
  it("migrates three saved tabs without losing order and refreshes across tabs", () => {
    localStorage.setItem("arshnaz_mobile_bottom_tabs", JSON.stringify(["mind", "notes", "today"]));
    const { result } = renderHook(() => useMobileBottomTabs());
    expect(result.current).toEqual(["mind", "notes", "today", "calendar"]);
    act(() => {
      localStorage.setItem("arshnaz_mobile_bottom_tabs", JSON.stringify(["knowledge", "pomodoro", "inbox"]));
      window.dispatchEvent(new StorageEvent("storage", { key: "arshnaz_mobile_bottom_tabs" }));
    });
    expect(result.current).toEqual(["knowledge", "pomodoro", "inbox", "today"]);
    act(() => {
      localStorage.removeItem("arshnaz_mobile_bottom_tabs");
      window.dispatchEvent(new StorageEvent("storage", { key: null }));
    });
    expect(result.current).toEqual(DEFAULT_MOBILE_BOTTOM_TABS);
  });
  it("does not update subscribers or announce saves when storage silently rejects writes", () => {
    resetMobileBottomTabs();
    const { result } = renderHook(() => useMobileBottomTabs());
    const saved = vi.fn();
    window.addEventListener("arshnaz:bottom-tabs-changed", saved);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    act(() => expect(setMobileBottomTabs(["mind", "calendar", "notes", "inbox"])).toBe(false));
    expect(result.current).toEqual(DEFAULT_MOBILE_BOTTOM_TABS);
    expect(saved).not.toHaveBeenCalled();
    window.removeEventListener("arshnaz:bottom-tabs-changed", saved);
  });
  it("does not report success for duplicate slots or storage failures", () => {
    expect(setMobileBottomTabs(["today", "today", "notes", "inbox"])).toBe(false);
    expect(setMobileBottomTabs(["constructor", "calendar", "notes", "inbox"])).toBe(false);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(setMobileBottomTabs(["today", "calendar", "notes", "inbox"])).toBe(false);
    expect(setMobileTabHoldEnabled(true)).toBe(false);
  });
  it("treats inherited object property names as invalid saved destinations", () => {
    localStorage.setItem("arshnaz_mobile_bottom_tabs", JSON.stringify(["__proto__", "calendar", "notes", "inbox"]));
    expect(renderHook(() => useMobileBottomTabs()).result.current).toEqual(DEFAULT_MOBILE_BOTTOM_TABS);
    expect(getAccessibleMobileTabs(["constructor", "__proto__", "today"], lockedModules).map(tab => tab.key)).toEqual(DEFAULT_MOBILE_BOTTOM_TABS);
  });
  it("replaces tabs for uninstalled modules with accessible core tabs", () => {
    const tabs = getAccessibleMobileTabs(["mind", "knowledge", "today"], lockedModules);
    expect(tabs.map((tab) => tab.key)).toEqual(["today", "calendar", "notes", "inbox"]);
  });

  it("keeps installed module tabs and marks crisis support as part of Mind", () => {
    const installedModules: ModulesState = { ...lockedModules, unlocked: ["mind", "study"], installed: ["mind", "study"] };
    const tabs = getAccessibleMobileTabs(["mind", "knowledge", "today"], installedModules);
    expect(tabs.map((tab) => tab.key)).toEqual(["mind", "knowledge", "today", "calendar"]);
    expect(ALL_MOBILE_TAB_OPTIONS.mind.match("/app/crisis")).toBe(true);
  });
});
