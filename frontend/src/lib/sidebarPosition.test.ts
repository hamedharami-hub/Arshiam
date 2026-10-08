import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import i18n from "@/i18n";
import {
  getSidebarPosition,
  useSidebarPosition,
  setSidebarPosition,
  SIDEBAR_POSITION_STORAGE_KEY,
  hydrateSidebarPositionFromCloud,
} from "./sidebarPosition";

describe("sidebar position settings sync", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("fa");
  });

  afterEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("fa");
  });

  it("loads a legacy visible cloud position directly in RTL", () => {
    hydrateSidebarPositionFromCloud("left");

    expect(getSidebarPosition()).toBe("left");
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("left");
  });

  it("preserves a legacy visible cloud position while storing the local LTR equivalent", async () => {
    await i18n.changeLanguage("en");
    hydrateSidebarPositionFromCloud("right");

    expect(getSidebarPosition()).toBe("right");
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("left");
  });

  it("mirrors the local canonical side after a language change", async () => {
    await i18n.changeLanguage("en");
    hydrateSidebarPositionFromCloud("right");
    expect(getSidebarPosition()).toBe("right");

    await i18n.changeLanguage("fa");
    expect(getSidebarPosition()).toBe("left");
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("left");
  });

  it("keeps the selected physical side visible while canonicalizing only local storage", async () => {
    await i18n.changeLanguage("en");
    setSidebarPosition("right");

    expect(getSidebarPosition()).toBe("right");
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("left");
  });

  it("updates the live hook when language changes without rewriting cloud semantics", async () => {
    await i18n.changeLanguage("en");
    hydrateSidebarPositionFromCloud("right");
    const { result, unmount } = renderHook(() => useSidebarPosition());
    expect(result.current.sidebarPosition).toBe("right");

    await act(async () => { await i18n.changeLanguage("fa"); });

    expect(result.current.sidebarPosition).toBe("left");
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("left");
    unmount();
  });
});
