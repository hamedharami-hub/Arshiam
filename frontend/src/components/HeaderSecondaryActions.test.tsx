import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HeaderSecondaryActions } from "./HeaderSecondaryActions";
import { createPortal } from "react-dom";

describe("secondary header tools", () => {
  it("preserves the portal host, opens keyboard tools and returns focus on Escape", () => {
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => { callback(0); return 1; });
    vi.stubGlobal("cancelAnimationFrame", vi.fn());
    const view = render(<HeaderSecondaryActions isEn routeKey="notes"><div id="host" /><button>Theme</button></HeaderSecondaryActions>);
    const host = view.container.querySelector("#host");
    const trigger = screen.getByRole("button", { name: "More page actions" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: "Theme" })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Theme" }), { key: "Escape" });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(view.container.querySelector("#host")).toBe(host);
    fireEvent.click(trigger);
    view.rerender(<HeaderSecondaryActions isEn routeKey="tasks"><div id="host" /><button>Theme</button></HeaderSecondaryActions>);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    vi.unstubAllGlobals();
  });
  it("closes on outside interaction but permits nested portaled dialogs", () => {
    render(<HeaderSecondaryActions isEn><button>Theme</button></HeaderSecondaryActions>);
    const trigger = screen.getByRole("button", { name: "More page actions" });
    fireEvent.click(trigger);
    const dialog = document.createElement("div"); dialog.setAttribute("role", "dialog"); document.body.append(dialog);
    fireEvent.pointerDown(dialog);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    fireEvent.pointerDown(document.body);
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    dialog.remove();
  });
  it("handles Escape from page-owned portal actions", () => {
    const view = render(<HeaderSecondaryActions isEn><div id="portal-host" /></HeaderSecondaryActions>);
    const host = view.container.querySelector("#portal-host")!;
    const page = render(createPortal(<button>Page action</button>, host));
    const trigger = screen.getByRole("button", { name: "More page actions" });
    fireEvent.click(trigger);
    screen.getByRole("button", { name: "Page action" }).focus();
    fireEvent.keyDown(screen.getByRole("button", { name: "Page action" }), { key: "Escape" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
    page.unmount();
  });
});
