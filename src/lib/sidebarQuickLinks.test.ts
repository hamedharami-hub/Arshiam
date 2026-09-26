import { beforeEach, describe, expect, it } from "vitest";
import {
  getSidebarQuickLinks,
  SIDEBAR_QUICK_LINKS_KEY,
  setSidebarQuickLinks,
  toggleSidebarQuickLink,
  moveSidebarQuickLink,
  resetSidebarQuickLinks,
  DEFAULT_SIDEBAR_QUICK_LINKS,
  SIDEBAR_QUICK_LINK_OPTIONS,
} from "./sidebarQuickLinks";

describe("sidebar quick links", () => {
  beforeEach(() => localStorage.clear());

  it("keeps Today available and rejects unknown routes", () => {
    setSidebarQuickLinks(["/app/notes", "/app/not-a-route"]);

    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/notes"]);
    expect(localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY)).toContain("/app/today");
    expect(localStorage.getItem(SIDEBAR_QUICK_LINKS_KEY)).not.toContain("not-a-route");
  });

  it("toggles quick links correctly while keeping Today pinned at 0", () => {
    setSidebarQuickLinks(["/app/today", "/app/mind", "/app/notes"]);
    
    // Disable notes
    toggleSidebarQuickLink("/app/notes", false);
    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/mind"]);

    // Enable calendar
    toggleSidebarQuickLink("/app/calendar", true);
    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/mind", "/app/calendar"]);

    // Cannot disable today
    toggleSidebarQuickLink("/app/today", false);
    expect(getSidebarQuickLinks()).toContain("/app/today");
    expect(getSidebarQuickLinks()[0]).toBe("/app/today");
  });

  it("moves quick links up and down while keeping Today pinned at index 0", () => {
    setSidebarQuickLinks(["/app/today", "/app/mind", "/app/notes", "/app/habits"]);

    // Move notes up (should swap with mind)
    moveSidebarQuickLink("/app/notes", "up");
    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/notes", "/app/mind", "/app/habits"]);

    // Move notes up again (already at top after today, should not swap with today)
    moveSidebarQuickLink("/app/notes", "up");
    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/notes", "/app/mind", "/app/habits"]);

    // Move notes down
    moveSidebarQuickLink("/app/notes", "down");
    expect(getSidebarQuickLinks()).toEqual(["/app/today", "/app/mind", "/app/notes", "/app/habits"]);

    // Today cannot be moved down
    moveSidebarQuickLink("/app/today", "down");
    expect(getSidebarQuickLinks()[0]).toBe("/app/today");
  });

  it("resets quick links to default configuration", () => {
    setSidebarQuickLinks(["/app/today", "/app/notes"]);
    resetSidebarQuickLinks();
    expect(getSidebarQuickLinks()).toEqual(DEFAULT_SIDEBAR_QUICK_LINKS);
  });

  it("supports adding, toggling, and reordering folders and tags quick links", () => {
    // Enable __folders and __tags
    toggleSidebarQuickLink("__folders", true);
    toggleSidebarQuickLink("__tags", true);

    const links = getSidebarQuickLinks();
    expect(links).toContain("__folders");
    expect(links).toContain("__tags");

    // Move __folders up
    moveSidebarQuickLink("__folders", "up");
    const updated = getSidebarQuickLinks();
    const folderIdx = updated.indexOf("__folders");
    const tagIdx = updated.indexOf("__tags");
    expect(folderIdx).toBeLessThan(tagIdx);

    // Disable __folders
    toggleSidebarQuickLink("__folders", false);
    expect(getSidebarQuickLinks()).not.toContain("__folders");
    expect(getSidebarQuickLinks()).toContain("__tags");
  });

  it("offers the Pharmacy product index as an optional, non-default quick link", () => {
    const urls = ["/app/pharmacy-products", "/app/pharmacy-scenario-practice"];
    for (const url of urls) {
      expect(SIDEBAR_QUICK_LINK_OPTIONS.some((option) => option.url === url)).toBe(true);
      expect(DEFAULT_SIDEBAR_QUICK_LINKS).not.toContain(url);
      toggleSidebarQuickLink(url, true);
    }
    expect(getSidebarQuickLinks()).toEqual(expect.arrayContaining(urls));
  });
});
