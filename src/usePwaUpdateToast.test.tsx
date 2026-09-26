import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act } from "@testing-library/react";
import { usePwaUpdateToast, PWA_UPDATE_TOAST_ID } from "./App";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

function TestToastConsumer() {
  usePwaUpdateToast();
  return null;
}

describe("usePwaUpdateToast idempotence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it("passes fixed PWA_UPDATE_TOAST_ID to guarantee Sonner deduplication across repeated pwa-update-available events", () => {
    render(<TestToastConsumer />);

    act(() => {
      window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { buildId: "123" } }));
      window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { buildId: "123" } }));
      window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: { buildId: "124" } }));
    });

    expect(toast).toHaveBeenCalledTimes(3);
    for (let i = 0; i < 3; i++) {
      expect(toast).toHaveBeenNthCalledWith(
        i + 1,
        "نسخه‌ی جدید برنامه آماده است",
        expect.objectContaining({
          id: PWA_UPDATE_TOAST_ID,
          duration: Infinity,
          action: expect.objectContaining({
            label: "به‌روزرسانی",
            onClick: expect.any(Function),
          }),
        })
      );
    }
  });

  it("handles English locale correctly with the same fixed toast id", () => {
    localStorage.setItem("i18nextLng", "en-US");
    render(<TestToastConsumer />);

    act(() => {
      window.dispatchEvent(new CustomEvent("pwa-update-available"));
    });

    expect(toast).toHaveBeenCalledWith(
      "A new version is ready",
      expect.objectContaining({
        id: PWA_UPDATE_TOAST_ID,
        duration: Infinity,
        action: expect.objectContaining({
          label: "Update",
        }),
      })
    );
  });

  it("invokes window.__applyPwaUpdate if defined, or reloads window on action click", () => {
    const applyMock = vi.fn();
    (window as any).__applyPwaUpdate = applyMock;

    render(<TestToastConsumer />);

    act(() => {
      window.dispatchEvent(new CustomEvent("pwa-update-available"));
    });

    const callArgs = (toast as any).mock.calls[0];
    const action = callArgs[1].action;
    expect(action).toBeDefined();

    action.onClick();
    expect(applyMock).toHaveBeenCalledTimes(1);

    delete (window as any).__applyPwaUpdate;
  });

  it("cleans up the pwa-update-available listener on unmount", () => {
    const { unmount } = render(<TestToastConsumer />);
    unmount();

    act(() => {
      window.dispatchEvent(new CustomEvent("pwa-update-available"));
    });

    expect(toast).not.toHaveBeenCalled();
  });
});
