import { describe, expect, it } from "vitest";
import { NAV_ITEMS, SECTIONS } from "./SidebarNavSections";

describe("Knowledge navigation hierarchy", () => {
  it("places Pharmacy first under Knowledge and keeps its existing tools nested under the Pharmacy hub", () => {
    const grow = SECTIONS.find((section) => section.id === "grow");
    const knowledge = grow?.items.find((item) => item.label === "دانش");
    const pharmacy = knowledge?.children?.[0];
    expect(pharmacy).toMatchObject({ url: "/app/pharmacy", label: "فارماسی" });
    expect(pharmacy?.children?.map((item) => item.url)).toEqual([
      "/app/pharmacy-products",
      "/app/pharmacy-scenario-practice",
      "/app/pharmacy-fred-practice",
      "/app/pharmacy-cyp",
    ]);
  });

  it("places a distinct Review destination immediately after Pharmacy under Knowledge", () => {
    const grow = SECTIONS.find((section) => section.id === "grow");
    const knowledge = grow?.items.find((item) => item.label === "دانش");
    expect(knowledge?.children?.slice(0, 2)).toMatchObject([
      { url: "/app/pharmacy", label: "فارماسی" },
      { url: "/app/review", label: "مرور" },
    ]);
  });

  it("keeps Pharmacy, Review, Knowledge base, and interactive study grouped under Grow", () => {
    const grow = SECTIONS.find((section) => section.id === "grow");
    const knowledge = grow?.items.find((item) => item.label === "دانش");
    expect(knowledge).toBeDefined();
    expect(knowledge?.children?.map((item) => item.url)).toEqual([
      "/app/pharmacy",
      "/app/review",
      "/app/knowledge",
      "/app/interactive-study",
      "/app/continue",
    ]);
  });

  it("preserves unique routes for collapsed sidebar and quick navigation", () => {
    const urls = NAV_ITEMS.map((item) => item.url).filter((url): url is string => Boolean(url));
    expect(urls).toContain("/app/knowledge");
    expect(urls).toContain("/app/review");
    expect(urls).toContain("/app/interactive-study");
    expect(urls).toContain("/app/pharmacy");
    expect(urls).toContain("/app/pharmacy-products");
    expect(urls).toContain("/app/pharmacy-scenario-practice");
    expect(urls).toContain("/app/pharmacy-fred-practice");
    expect(urls).toContain("/app/pharmacy-cyp");
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("places the daily diary in Do while preserving its route", () => {
    const doSection = SECTIONS.find((section) => section.id === "do");
    const grow = SECTIONS.find((section) => section.id === "grow");
    expect(doSection?.items.some((item) => item.url === "/app/diary")).toBe(true);
    expect(grow?.items.some((item) => item.url === "/app/diary")).toBe(false);
    expect(NAV_ITEMS.filter((item) => item.url === "/app/diary")).toHaveLength(1);
  });

  it("shows Time Buckets in the primary nav and moves Kanban into Do", () => {
    const primary = NAV_ITEMS.slice(0, 4).map((item) => item.url);
    expect(primary).toContain("/app/buckets");
    expect(primary).not.toContain("/app/kanban");
    const doSection = SECTIONS.find((section) => section.id === "do");
    expect(doSection?.items.some((item) => item.url === "/app/kanban")).toBe(true);
    expect(doSection?.items.some((item) => item.url === "/app/buckets")).toBe(false);
  });
});
