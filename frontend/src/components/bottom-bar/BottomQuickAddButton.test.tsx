import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomQuickAddButton } from "./BottomQuickAddButton";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: "en" } }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("./MobileSpeedDialMenu", () => ({ MobileSpeedDialMenu: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="More actions" /> : null }));

afterEach(() => vi.useRealTimers());

describe("BottomQuickAddButton", () => {
  it("keeps two sibling 44px targets in a non-overlapping flex row", () => {
    render(<BottomQuickAddButton />);
    const quick = screen.getByRole("button", { name: "افزودن سریع" });
    const more = screen.getByRole("button", { name: "More actions" });
    for (const button of [quick, more]) {
      expect(button).toHaveClass("h-11", "w-11", "shrink-0");
      expect(button).not.toHaveClass("absolute");
    }
    expect(quick.parentElement).toBe(more.parentElement);
    expect(quick.parentElement).toHaveClass("flex", "gap-1");
    expect(more).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(more);
    expect(more).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "More actions" })).toBeInTheDocument();
  });

  it("opens capture only on quick add and suppresses the click after a long press", () => {
    vi.useFakeTimers();
    const capture = vi.fn();
    window.addEventListener("lov:open-quick-capture", capture);
    try {
      render(<BottomQuickAddButton />);
      const quick = screen.getByRole("button", { name: "افزودن سریع" });
      fireEvent.click(screen.getByRole("button", { name: "More actions" }));
      expect(capture).not.toHaveBeenCalled();
      fireEvent.click(quick);
      expect(capture).toHaveBeenCalledTimes(1);
      fireEvent.touchStart(quick, { touches: [{ clientX: 10, clientY: 10 }] });
      act(() => vi.advanceTimersByTime(450));
      fireEvent.touchEnd(quick, { touches: [] });
      fireEvent.click(quick);
      expect(capture).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("lov:open-quick-capture", capture);
    }
  });
});
