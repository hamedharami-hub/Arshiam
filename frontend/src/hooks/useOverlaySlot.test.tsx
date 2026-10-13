import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useOverlaySlot } from "./useOverlaySlot";

function Slot({ id, order, visible = true }: { id: string; order: number; visible?: boolean }) {
  const ref = useOverlaySlot(id, order, visible);
  return visible ? <div ref={ref} data-testid={id}>Status</div> : null;
}
afterEach(() => vi.restoreAllMocks());
describe("measured overlay stack", () => {
  it("stacks focus, sync and installation above navigation and releases space", () => {
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function(this: HTMLElement) {
      return { top: this.hasAttribute("data-bottom-bar") ? window.innerHeight - 70 : 0, height: 50 } as DOMRect;
    });
    const view = render(<><div data-bottom-bar="true" /><Slot id="focus" order={0} /><Slot id="sync" order={1} /><Slot id="install" order={2} /></>);
    // jsdom's CSS parser does not support env(); inspect the measured offset.
    expect(screen.getByTestId("focus").style.getPropertyValue("--overlay-bottom")).toBe("82px");
    expect(screen.getByTestId("sync").style.getPropertyValue("--overlay-bottom")).toBe("144px");
    expect(screen.getByTestId("install").style.getPropertyValue("--overlay-bottom")).toBe("206px");
    view.rerender(<><div data-bottom-bar="true" /><Slot id="focus" order={0} /><Slot id="sync" order={1} visible={false} /><Slot id="install" order={2} /></>);
    expect(screen.getByTestId("install").style.getPropertyValue("--overlay-bottom")).toBe("144px");
    view.unmount();
    expect(document.documentElement.style.getPropertyValue("--floating-overlay-space")).toBe("0px");
  });
  it("moves the stack above the keyboard and limits panel height", () => {
    const viewport = new EventTarget();
    Object.assign(viewport, { height: 300, offsetTop: 0 });
    vi.stubGlobal("visualViewport", viewport);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({ top: 0, height: 44 } as DOMRect);
    const view = render(<><Slot id="focus" order={0} /><Slot id="sync" order={1} /><Slot id="install" order={2} /></>);
    expect(screen.getByTestId("focus").style.getPropertyValue("--overlay-bottom")).toBe(`${window.innerHeight - 300 + 16}px`);
    expect(parseFloat(screen.getByTestId("install").style.maxHeight)).toBeLessThan(100);
    Object.assign(viewport, { height: 400 });
    act(() => viewport.dispatchEvent(new Event("resize")));
    expect(screen.getByTestId("focus").style.getPropertyValue("--overlay-bottom")).toBe(`${window.innerHeight - 400 + 16}px`);
    view.unmount(); vi.unstubAllGlobals();
  });
});
