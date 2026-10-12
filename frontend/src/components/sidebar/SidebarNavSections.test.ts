import { describe, expect, it } from "vitest";
import { NAV_ITEMS, SECTIONS, EN_LABELS, filterNavByModules } from "./SidebarNavSections";
import { findFeature, getFeatureNavigation } from "@/lib/featureRegistry";
import type { ModulesState } from "@/lib/appModules";

const locked: ModulesState = { ready: true, installed: [], unlocked: ["study", "mind"], isAdmin: false, isOwner: false };

describe("Knowledge navigation hierarchy", () => {
  it("uses registry routes, bilingual labels and icons without expanding the curated sidebar", () => {
    for (const item of NAV_ITEMS) {
      const feature = findFeature(item.url!)!;
      expect(feature).toBeDefined();
      expect(item.label).toBe(feature.nameFa);
      expect(EN_LABELS[item.label]).toBe(feature.nameEn);
      expect(item.icon).toBe(feature.icon);
    }
    expect(NAV_ITEMS).toHaveLength(29);
  });

  it("filters nested module destinations by installed (not merely unlocked) modules", () => {
    const grow = SECTIONS.find((section) => section.id === "grow")!;
    const filtered = filterNavByModules(grow.items, locked);
    expect(filtered.find((item) => item.label === "دانش")?.children?.map((item) => item.url)).toEqual(["/app/recall"]);
    const installed = filterNavByModules(grow.items, { ...locked, installed: ["study"] });
    expect(installed.find((item) => item.label === "دانش")?.children).toHaveLength(4);
    expect(filterNavByModules([{ icon: grow.icon, label: "Empty", children: [getFeatureNavigation("/app/knowledge")] }], locked)).toEqual([]);
  });

  it("preserves core crisis access and role-gates the admin item", () => {
    const items = [getFeatureNavigation("/app/mind"), getFeatureNavigation("/app/crisis"), getFeatureNavigation("/app/admin")];
    expect(filterNavByModules(items, locked).map((item) => item.url)).toEqual(["/app/crisis"]);
    expect(filterNavByModules(items, locked, true).map((item) => item.url)).toEqual(["/app/crisis", "/app/admin"]);
  });
  it("preserves shared Knowledge learning without retired module entrypoints", () => {
    const knowledge = SECTIONS.find(section => section.id === "grow")?.items.find(item => item.label === "دانش");
    expect(knowledge?.children?.map(item => item.url)).toEqual([
      "/app/knowledge", "/app/recall", "/app/interactive-study", "/app/continue",
    ]);
    const urls = NAV_ITEMS.map(item => item.url).filter((url): url is string => Boolean(url));
    expect(urls).toContain("/app/knowledge");
    expect(urls).toContain("/app/interactive-study");
    expect(urls.some(url => url.startsWith("/app/pharmacy") || url.startsWith("/app/review"))).toBe(false);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("places the daily diary in Do while preserving its route", () => {
    const doSection = SECTIONS.find((section) => section.id === "do");
    const grow = SECTIONS.find((section) => section.id === "grow");
    expect(doSection?.items.some((item) => item.url === "/app/diary")).toBe(true);
    expect(grow?.items.some((item) => item.url === "/app/diary")).toBe(false);
    expect(NAV_ITEMS.filter((item) => item.url === "/app/diary")).toHaveLength(1);
  });

  it("keeps Planning in primary navigation and removes the global Kanban entry", () => {
    const primary = NAV_ITEMS.slice(0, 4).map((item) => item.url);
    expect(primary).not.toContain("/app/buckets");
    expect(primary).not.toContain("/app/kanban");
    expect(primary).toContain("/app/planning");
    const doSection = SECTIONS.find((section) => section.id === "do");
    expect(doSection?.items.some((item) => item.url === "/app/kanban")).toBe(false);
    expect(doSection?.items.some((item) => item.url === "/app/buckets")).toBe(false);
  });
});
