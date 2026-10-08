import { describe, expect, it } from "vitest";
import { NAV_ITEMS, SECTIONS } from "./SidebarNavSections";

describe("Knowledge navigation hierarchy", () => {
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
