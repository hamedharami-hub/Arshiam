import { beforeEach, describe, expect, it } from "vitest";
import { applyTheme, getBaseTheme, getStoredAccent, getStoredTheme, normalizeTheme } from "./theme";

describe("paper theme migration", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-accent");
  });

  it("maps legacy theme ids to the new paper themes", () => {
    expect(normalizeTheme("arshnaz-light")).toBe("paper-light");
    expect(normalizeTheme("arshnaz-dark")).toBe("paper-dark");
    expect(normalizeTheme("ticktick-light")).toBe("paper-light");
    expect(normalizeTheme("dark")).toBe("paper-dark");
    expect(normalizeTheme("oled")).toBe("oled");
    expect(normalizeTheme(null)).toBe("paper-light");
  });

  it("migrates a stored legacy theme to the matching accent once", () => {
    localStorage.setItem("arshnaz-theme", "arshnaz-dark");
    expect(getStoredTheme()).toBe("paper-dark");
    expect(getStoredAccent()).toBe("rose");
    applyTheme("ticktick-light");
    expect(getStoredAccent()).toBe("rose");
  });

  it("applies OLED as a dark theme with its own class", () => {
    applyTheme("oled");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.classList.contains("theme-oled")).toBe(true);
    expect(getBaseTheme("oled")).toBe("dark");
    expect(document.documentElement.getAttribute("data-accent")).toBe("indigo");
  });
});

describe("accent sync", () => {
  it("adopts a valid accent from cloud settings and ignores unknown values", async () => {
    const { syncAccentFromSettings } = await import("./theme");
    localStorage.clear();
    expect(syncAccentFromSettings("steel")).toBe(true);
    expect(getStoredAccent()).toBe("steel");
    expect(document.documentElement.getAttribute("data-accent")).toBe("steel");
    expect(syncAccentFromSettings("steel")).toBe(false);
    expect(syncAccentFromSettings("neon")).toBe(false);
    expect(getStoredAccent()).toBe("steel");
  });
});
