import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_MOBILE_BOTTOM_TABS, resetMobileBottomTabs, useMobileBottomTabs } from "@/lib/mobileBottomBarSettings";
import { MobileBottomBarSettings } from "./MobileBottomBarSettings";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

describe("MobileBottomBarSettings", () => {
  beforeEach(() => act(() => resetMobileBottomTabs()));
  afterEach(() => act(() => resetMobileBottomTabs()));

  it("updates a selected slot and keeps the three configured tabs unique", () => {
    render(<MobileBottomBarSettings isEn />);

    fireEvent.click(screen.getByTestId("mobile-bottom-tab-option-0-mind"));
    expect(screen.getByTestId("mobile-bottom-tab-option-0-mind")).toHaveAttribute("aria-pressed", "true");
    expect(renderHook(() => useMobileBottomTabs()).result.current).toEqual(["mind", ...DEFAULT_MOBILE_BOTTOM_TABS.slice(1)]);
  });
});
