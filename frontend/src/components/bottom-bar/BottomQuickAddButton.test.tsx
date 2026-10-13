import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BottomQuickAddButton } from "./BottomQuickAddButton";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (_key: string, fallback: string) => fallback, i18n: { language: "en" } }) }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("./MobileSpeedDialMenu", () => ({ MobileSpeedDialMenu: ({ open }: { open: boolean }) => open ? <div role="dialog" aria-label="More actions" /> : null }));

afterEach(() => vi.useRealTimers());

describe("BottomQuickAddButton", () => {
  it("floats one 44px add target above the right edge, without an arrow button", () => {
    render(<BottomQuickAddButton />);
    const quick = screen.getByRole("button", { name: "افزودن سریع" });
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(quick).toHaveClass("h-11", "w-11", "shrink-0");
    expect(quick.parentElement).toHaveClass("absolute", "right-0", "bottom-[calc(100%+12px)]");
    expect(quick).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(quick, { key: "F10", shiftKey: true });
    expect(quick).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("dialog", { name: "More actions" })).toBeInTheDocument();
  });

  it("opens capture only on quick add and suppresses the click after a long press", () => {
    vi.useFakeTimers();
    const capture = vi.fn();
    window.addEventListener("lov:open-quick-capture", capture);
    try {
      render(<BottomQuickAddButton />);
      const quick = screen.getByRole("button", { name: "افزودن سریع" });
      fireEvent.click(quick);
      expect(capture).toHaveBeenCalledTimes(1);
      fireEvent.touchStart(quick, { touches: [{ clientX: 10, clientY: 10 }] });
      act(() => vi.advanceTimersByTime(450));
      fireEvent.touchEnd(quick, { touches: [] });
      fireEvent.click(quick);
      expect(capture).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("dialog", { name: "More actions" })).toBeInTheDocument();
    } finally {
      window.removeEventListener("lov:open-quick-capture", capture);
    }
  });

  it("cancels a hold when the finger moves or touch is cancelled", () => {
    vi.useFakeTimers();
    render(<BottomQuickAddButton />);
    const quick = screen.getByRole("button", { name: "افزودن سریع" });
    fireEvent.touchStart(quick, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchMove(quick, { touches: [{ clientX: 40, clientY: 10 }] });
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.touchStart(quick, { touches: [{ clientX: 10, clientY: 10 }] });
    fireEvent.touchCancel(quick);
    act(() => vi.advanceTimersByTime(500));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
