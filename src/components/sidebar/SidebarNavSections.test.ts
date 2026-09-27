import { describe, expect, it } from "vitest";
import { NAV_ITEMS, SECTIONS } from "./SidebarNavSections";

describe("Knowledge navigation hierarchy", () => {
  it("groups Pharmacy and Review under Knowledge and keeps all pharmacy tools reachable", () => {
    const grow = SECTIONS.find((section) => section.id === "grow");
    const knowledge = grow?.items.find((item) => item.label === "دانش");
    const pharmacy = knowledge?.children?.find((item) => item.label === "فارماسی");
    const review = knowledge?.children?.find((item) => item.url === "/app/review");

    expect(knowledge).toBeDefined();
    expect(pharmacy?.url).toBe("/app/knowledge");
    expect(review?.label).toBe("مرور (SR)");
    expect(pharmacy?.children?.map((item) => item.url)).toEqual([
      "/app/interactive-study",
      "/app/pharmacy-products",
      "/app/pharmacy-scenario-practice",
      "/app/pharmacy-fred-practice",
      "/app/pharmacy-cyp",
    ]);
  });

  it("preserves unique routes for collapsed sidebar and quick navigation", () => {
    const urls = NAV_ITEMS.map((item) => item.url).filter((url): url is string => Boolean(url));
    expect(urls).toContain("/app/knowledge");
    expect(urls).toContain("/app/review");
    expect(urls).toContain("/app/interactive-study");
    expect(new Set(urls).size).toBe(urls.length);
  });
});
