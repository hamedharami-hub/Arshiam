import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import i18n from "@/i18n";
import {
  getSidebarPosition,
  hydrateSidebarPositionFromCloud,
  SIDEBAR_POSITION_STORAGE_KEY,
} from "@/lib/sidebarPosition";
import type { UserSettings } from "@/lib/reminders";
import { AppearanceSettingsSection } from "./AppearanceSettingsSection";

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));

vi.mock("@/lib/theme", () => ({
  ACCENT_COLORS: ["indigo", "olive", "amber", "steel", "rose", "brick"],
  ACCENT_SWATCH: { indigo: "#000", olive: "#000", amber: "#000", steel: "#000", rose: "#000", brick: "#000" },
  applyAccent: vi.fn(),
  getStoredAccent: () => "indigo",
  normalizeTheme: (theme: string) => theme,
}));

vi.mock("@/components/CompletionFeedbackSettingsCard", () => ({
  CompletionFeedbackSettingsCard: () => null,
}));

vi.mock("@/components/ui/select", () => ({
  Select: ({ value, onValueChange, children }: any) => (
    <select value={value} onChange={(event) => onValueChange(event.target.value)}>{children}</select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ value, children }: any) => <option value={value}>{children}</option>,
  SelectTrigger: () => null,
  SelectValue: () => null,
}));

vi.mock("@/components/ui/slider", () => ({ Slider: () => null }));

describe("AppearanceSettingsSection accent radio keyboard controls", () => {
  const updateReminder = vi.fn();

  beforeEach(async () => {
    vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
    updateReminder.mockClear();
    localStorage.clear();
    await act(async () => { await i18n.changeLanguage("en"); });
  });
  afterEach(async () => {
    vi.unstubAllGlobals();
    localStorage.clear();
    await act(async () => { await i18n.changeLanguage("fa"); });
  });

  it("moves focus and selection with arrow keys in the appropriate direction", () => {
    render(
      <AppearanceSettingsSection
        isEn
        reminders={null}
        updateReminder={updateReminder}
        currentTheme="paper-light"
        setAppTheme={vi.fn()}
      />,
    );

    const indigo = screen.getByTestId("accent-option-indigo");
    fireEvent.keyDown(indigo, { key: "ArrowRight" });

    const olive = screen.getByTestId("accent-option-olive");
    expect(olive).toHaveFocus();
    expect(olive).toHaveAttribute("aria-checked", "true");
    expect(olive).toHaveAttribute("tabindex", "0");
    expect(indigo).toHaveAttribute("tabindex", "-1");
    expect(updateReminder).toHaveBeenCalledWith({ accent_color: "olive" });
  });

  it("reverses horizontal arrow movement for RTL layouts", () => {
    render(
      <AppearanceSettingsSection
        isEn={false}
        reminders={null}
        updateReminder={updateReminder}
        currentTheme="paper-light"
        setAppTheme={vi.fn()}
      />,
    );

    fireEvent.keyDown(screen.getByTestId("accent-option-indigo"), { key: "ArrowRight" });

    const brick = screen.getByTestId("accent-option-brick");
    expect(brick).toHaveFocus();
    expect(brick).toHaveAttribute("aria-checked", "true");
  });

  it("saves the selected visible side to cloud without canonicalizing the cloud value", async () => {
    const reminders: UserSettings = {
      user_id: "user-1",
      show_daily_checkin: true,
      checkin_reminder_enabled: true,
      checkin_reminder_time: "20:00",
      notifications_enabled: false,
      micro_prompt_enabled: false,
      theme: "paper-light",
      auto_create_daily_tasks: false,
      font_size: "medium",
      ui_scale: 1,
      task_card_layout: "compact",
      default_landing: "today",
      sidebar_position: "right",
      task_defaults: {},
    };
    hydrateSidebarPositionFromCloud("right");
    render(
      <AppearanceSettingsSection
        isEn
        reminders={reminders}
        updateReminder={updateReminder}
        currentTheme="paper-light"
        setAppTheme={vi.fn()}
      />,
    );

    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[selects.length - 1], { target: { value: "left" } });

    expect(getSidebarPosition()).toBe("left");
    expect(updateReminder).toHaveBeenCalledWith({ sidebar_position: "left" });
    expect(localStorage.getItem(SIDEBAR_POSITION_STORAGE_KEY)).toBe("right");
  });
});
