import { describe, expect, it } from "vitest";
import { getAccessibleMobileTabs, ALL_MOBILE_TAB_OPTIONS } from "./mobileBottomBarSettings";
import type { ModulesState } from "./appModules";

const lockedModules: ModulesState = {
  ready: true,
  unlocked: [],
  installed: [],
  isAdmin: false,
  isOwner: false,
};

describe("mobile bottom navigation options", () => {
  it("replaces tabs for uninstalled modules with accessible core tabs", () => {
    const tabs = getAccessibleMobileTabs(["mind", "knowledge", "today"], lockedModules);
    expect(tabs.map((tab) => tab.key)).toEqual(["today", "calendar", "notes"]);
  });

  it("keeps installed module tabs and marks crisis support as part of Mind", () => {
    const installedModules: ModulesState = { ...lockedModules, unlocked: ["mind", "study"], installed: ["mind", "study"] };
    const tabs = getAccessibleMobileTabs(["mind", "knowledge", "today"], installedModules);
    expect(tabs.map((tab) => tab.key)).toEqual(["mind", "knowledge", "today"]);
    expect(ALL_MOBILE_TAB_OPTIONS.mind.match("/app/crisis")).toBe(true);
  });
});
