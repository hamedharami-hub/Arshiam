import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { bindCloudState } from "./cloudStateSync";
import i18n from "@/i18n";
import { dateLocale, EN_JALALI_KEY, setEnglishUsesJalali } from "./localeFormat";
import { startUiPrefsCloudSync } from "./uiPrefsSync";

const cloud = vi.hoisted(() => ({ bind: vi.fn<typeof bindCloudState>(), push: vi.fn(), stop: vi.fn() }));
vi.mock("./cloudStateSync", () => ({ bindCloudState: cloud.bind }));

beforeEach(async () => {
  startUiPrefsCloudSync(null);
  localStorage.clear();
  vi.clearAllMocks();
  vi.stubEnv("MODE", "development");
  cloud.bind.mockReturnValue({ push: cloud.push, stop: cloud.stop });
  await i18n.changeLanguage("en");
});
afterEach(async () => {
  startUiPrefsCloudSync(null);
  vi.unstubAllEnvs();
  await i18n.changeLanguage("fa");
});

async function bind() {
  startUiPrefsCloudSync("test-user");
  await vi.waitFor(() => expect(cloud.bind).toHaveBeenCalledOnce());
  return cloud.bind.mock.calls[0][2];
}

describe("remote locale preferences", () => {
  it.each([true, false])("publishes the local date-format event for remote enJalali=%s without echoing a push", async (on) => {
    const options = await bind();
    const updates: string[] = [];
    const listener = () => updates.push(dateLocale("en"));
    window.addEventListener("arshnaz:date-format-changed", listener);
    try {
      options.apply({ enJalali: on, lang: "fa" }, 123, null);
      expect(localStorage.getItem(EN_JALALI_KEY)).toBe(on ? "1" : "0");
      expect(updates).toEqual([on ? "en-US-u-ca-persian" : "en-US"]);
      expect(i18n.language).toBe("fa");
      expect(cloud.push).not.toHaveBeenCalled();
      expect(localStorage.getItem("arshnaz_ui_prefs_sync_test-user")).toBe("123");
      setEnglishUsesJalali(!on);
      expect(cloud.push).toHaveBeenCalledOnce();
    } finally { window.removeEventListener("arshnaz:date-format-changed", listener); }
  });

  it("does not change date format when the remote preference is absent", async () => {
    localStorage.setItem(EN_JALALI_KEY, "1");
    const options = await bind();
    const listener = vi.fn();
    window.addEventListener("arshnaz:date-format-changed", listener);
    try {
      options.apply({ lang: "en" }, 124, null);
      expect(localStorage.getItem(EN_JALALI_KEY)).toBe("1");
      expect(listener).not.toHaveBeenCalled();
      expect(cloud.push).not.toHaveBeenCalled();
    } finally { window.removeEventListener("arshnaz:date-format-changed", listener); }
  });
});
