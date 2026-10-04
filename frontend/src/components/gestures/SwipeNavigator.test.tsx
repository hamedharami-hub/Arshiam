import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SwipeNavigator from "./SwipeNavigator";

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ setOpenMobile: vi.fn() }),
}));

function PathProbe() {
  const loc = useLocation();
  return <div data-testid="path">{loc.pathname}</div>;
}

/** jsdom has no Touch/TouchEvent constructors; mimic the fields the navigator reads. */
function swipeLeftOn(target: Element, fromX = 330, toX = 180, y = 240) {
  const start = new Event("touchstart", { bubbles: true });
  Object.assign(start, { touches: [{ clientX: fromX, clientY: y }] });
  target.dispatchEvent(start);
  const end = new Event("touchend", { bubbles: true });
  Object.assign(end, { changedTouches: [{ clientX: toX, clientY: y }] });
  target.dispatchEvent(end);
}

function mountOverlay(dataset: Record<string, string>) {
  const overlay = document.createElement("div");
  for (const [key, value] of Object.entries(dataset)) overlay.setAttribute(key, value);
  const surface = document.createElement("div");
  overlay.appendChild(surface);
  document.body.appendChild(overlay);
  return surface;
}

describe("SwipeNavigator day-scope navigation on mobile", () => {
  beforeEach(() => {
    Object.defineProperty(window, "innerWidth", { value: 420, writable: true, configurable: true });
  });

  afterEach(() => {
    document.body.querySelectorAll('[role="dialog"],[role="alertdialog"],[role="menu"],[data-vaul-drawer]').forEach((n) => n.remove());
  });

  function renderAt(path: string) {
    return render(
      <MemoryRouter initialEntries={[path]}>
        <SwipeNavigator />
        <Routes>
          <Route path="/app/:scope" element={<PathProbe />} />
        </Routes>
      </MemoryRouter>,
    );
  }

  it("advances to the next scope with a horizontal swipe when nothing is open", () => {
    renderAt("/app/today");
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");

    act(() => { swipeLeftOn(document.body); });

    expect(screen.getByTestId("path")).toHaveTextContent("/app/tomorrow");
  });

  it("ignores swipes while the task drawer (vaul) is open", () => {
    renderAt("/app/today");
    const surface = mountOverlay({ "data-vaul-drawer": "" });

    act(() => { swipeLeftOn(surface); });

    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
  });

  it("ignores swipes while a modal dialog is open anywhere on the page", () => {
    renderAt("/app/today");
    mountOverlay({ role: "dialog" });

    act(() => { swipeLeftOn(document.body); });

    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
  });

  it("still navigates when the mobile sidebar dialog is open (parity with AndroidGestures)", () => {
    renderAt("/app/today");
    const surface = mountOverlay({ role: "dialog", "data-sidebar": "sidebar" });

    act(() => { swipeLeftOn(surface); });

    expect(screen.getByTestId("path")).toHaveTextContent("/app/tomorrow");
  });
});
