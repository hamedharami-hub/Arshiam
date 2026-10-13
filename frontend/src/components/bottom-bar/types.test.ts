import { describe, expect, it } from "vitest";
import { withFeatureMetadata } from "./types";
import { ALL_MOBILE_TAB_OPTIONS, getAccessibleMobileTabs } from "@/lib/mobileBottomBarSettings";
import { findFeature } from "@/lib/featureRegistry";
import type { ModulesState } from "@/lib/appModules";

describe("registry-backed bottom tab metadata", () => {
  it("maps every existing tab while preserving tab-specific behavior and descriptions", () => {
    for (const option of Object.values(ALL_MOBILE_TAB_OPTIONS)) {
      const mapped = withFeatureMetadata(option);
      const feature = findFeature(option.to)!;
      expect(mapped.to).toBe(option.to);
      expect(mapped.labelFa).toBe(feature.nameFa);
      expect(mapped.labelEn).toBe(feature.nameEn);
      expect(mapped.icon).toBe(feature.icon);
      expect(mapped.key).toBe(option.key);
      expect(mapped.match).toBe(option.match);
      expect(mapped.shortcutKey).toBe(option.shortcutKey);
      expect(mapped.shortcutLabel).toBe(option.shortcutLabel);
      expect(mapped.descriptionFa).toBe(option.descriptionFa);
      expect(option.labelFa).toBe(ALL_MOBILE_TAB_OPTIONS[option.key].labelFa);
    }
  });

  it("keeps module fallback order and legacy active-route matching", () => {
    const modules: ModulesState = { ready: true, installed: [], unlocked: [], isAdmin: false, isOwner: false };
    const tabs = getAccessibleMobileTabs(["mind", "knowledge", "notes"], modules).map(withFeatureMetadata);
    expect(tabs.map((tab) => tab.key)).toEqual(["notes", "today", "calendar", "inbox"]);
    expect(withFeatureMetadata(ALL_MOBILE_TAB_OPTIONS.mind).match("/app/abc")).toBe(true);
    expect(withFeatureMetadata(ALL_MOBILE_TAB_OPTIONS.pomodoro).match("/app/focus")).toBe(true);
    expect(withFeatureMetadata(ALL_MOBILE_TAB_OPTIONS.today).match("/app")).toBe(true);
  });

  it("does not invent registry metadata for an unknown destination", () => {
    const option = { ...ALL_MOBILE_TAB_OPTIONS.today, to: "/custom" };
    expect(withFeatureMetadata(option)).toBe(option);
  });
});
