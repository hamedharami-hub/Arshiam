import { describe, expect, it } from "vitest";
import { NAV_ITEMS, SECTIONS } from "./SidebarNavSections";

describe("Knowledge navigation hierarchy", () => {
  it("exposes Pharmacy as a top-level section with all pharmacy tools reachable", () => {
    const pharmacy = SECTIONS.find((section) => section.id === "pharmacy");
    expect(pharmacy).toBeDefined();
    expect(pharmacy?.defaultOpen).toBe(true);
    expect(pharmacy?.items.map((item) => item.url)).toEqual([
      "/app/pharmacy",
      "/app/pharmacy-products",
      "/app/pharmacy-scenario-practice",
      "/app/pharmacy-fred-practice",
      "/app/pharmacy-cyp",
    ]);
  });

  it("keeps Knowledge base, interactive study and review grouped under Grow", () => {
    const grow = SECTIONS.find((section) => section.id === "grow");
    const knowledge = grow?.items.find((item) => item.label === "دانش");
    expect(knowledge).toBeDefined();
    expect(knowledge?.children?.map((item) => item.url)).toEqual([
      "/app/knowledge",
      "/app/interactive-study",
      "/app/review",
    ]);
  });

  it("preserves unique routes for collapsed sidebar and quick navigation", () => {
    const urls = NAV_ITEMS.map((item) => item.url).filter((url): url is string => Boolean(url));
    expect(urls).toContain("/app/knowledge");
    expect(urls).toContain("/app/review");
    expect(urls).toContain("/app/interactive-study");
    expect(urls).toContain("/app/pharmacy-products");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("places the daily diary in Do while preserving its route", () => {
    const doSection = SECTIONS.find((section) => section.id === "do");
    const grow = SECTIONS.find((section) => section.id === "grow");
    expect(doSection?.items.some((item) => item.url === "/app/diary")).toBe(true);
    expect(grow?.items.some((item) => item.url === "/app/diary")).toBe(false);
    expect(NAV_ITEMS.filter((item) => item.url === "/app/diary")).toHaveLength(1);
  });
});
