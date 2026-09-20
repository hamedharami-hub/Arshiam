import { beforeEach, describe, expect, it } from "vitest";
import {
  getSidebarQuickLinks,
  SIDEBAR_QUICK_LINKS_KEY,
  setSidebarQuickLinks,
} from "./sidebarQuickLinks";

describe("sidebar quick links", () => {
  beforeEach(() => localStorage.clear());

  it("keeps Today available and rejects unknown routes", () => {
    setSidebarQuickLinks(["/app/notes", "/app/not-a-route"]);

    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/notes"]);
    expect(localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY)).toContain("/app/today");
    expect(localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY)).not.toContain("not-a-route");
  });
});
