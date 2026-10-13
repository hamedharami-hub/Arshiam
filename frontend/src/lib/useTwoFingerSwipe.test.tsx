import { renderHook, fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTwoFingerSwipe } from "./useTwoFingerSwipe";
const history = vi.hoisted(() => ({ canUndo: vi.fn(), canRedo: vi.fn(), undoLast: vi.fn(), redoLast: vi.fn() }));
vi.mock("./undoStack", () => history);
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
const start = (target: Window | Element) => fireEvent.touchStart(target, { touches: [{ clientX: 200, clientY: 20 }, { clientX: 210, clientY: 20 }] });
const end = (target: Window | Element) => fireEvent.touchEnd(target, { touches: [], changedTouches: [{ clientX: 100, clientY: 20 }, { clientX: 110, clientY: 20 }] });
beforeEach(() => { vi.clearAllMocks(); history.canUndo.mockReturnValue(true); history.canRedo.mockReturnValue(true); });
describe("high-impact recovery gesture", () => {
  it("does not emit recovery feedback for empty history", () => {
    history.canUndo.mockReturnValue(false);
    renderHook(useTwoFingerSwipe); start(window); end(window);
    expect(history.undoLast).not.toHaveBeenCalled();
  });
  it("ignores text editors and cancellation but keeps deliberate recovery", () => {
    renderHook(useTwoFingerSwipe);
    const input = document.createElement("textarea"); document.body.append(input);
    start(input); end(input); expect(history.undoLast).not.toHaveBeenCalled();
    start(window); fireEvent.touchCancel(window); end(window); expect(history.undoLast).not.toHaveBeenCalled();
    start(window); end(window); expect(history.undoLast).toHaveBeenCalledOnce();
    input.remove();
  });
});
