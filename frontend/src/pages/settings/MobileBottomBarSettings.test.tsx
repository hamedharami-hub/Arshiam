import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_MOBILE_BOTTOM_TABS, resetMobileBottomTabs, setMobileTabHoldEnabled, useMobileBottomTabs } from "@/lib/mobileBottomBarSettings";
import { toast } from "sonner";
import { MobileBottomBarSettings } from "./MobileBottomBarSettings";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe("MobileBottomBarSettings", () => {
  beforeEach(() => { act(() => { resetMobileBottomTabs(); setMobileTabHoldEnabled(false); }); vi.clearAllMocks(); });
  afterEach(() => { vi.restoreAllMocks(); act(() => resetMobileBottomTabs()); });

  it("updates a selected slot and keeps four configured tabs unique", () => {
    render(<MobileBottomBarSettings isEn />);

    fireEvent.click(screen.getByTestId("mobile-bottom-tab-option-0-mind"));
    expect(screen.getByTestId("mobile-bottom-tab-option-0-mind")).toHaveAttribute("aria-pressed", "true");
    expect(renderHook(() => useMobileBottomTabs()).result.current).toEqual(["mind", ...DEFAULT_MOBILE_BOTTOM_TABS.slice(1)]);
  });
  it("does not claim success or change selected settings when persistence fails", () => {
    render(<MobileBottomBarSettings isEn />);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    fireEvent.click(screen.getByTestId("mobile-bottom-tab-option-0-mind"));
    fireEvent.click(screen.getByRole("switch", { name: "Tab long press" }));
    fireEvent.click(screen.getByRole("button", { name: "Reset Defaults" }));
    expect(screen.getByTestId("mobile-bottom-tab-option-0-today")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("switch", { name: "Tab long press" })).toHaveAttribute("aria-checked", "false");
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledTimes(3);
  });
});
