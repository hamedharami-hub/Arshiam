import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import SwipeNavigator from "./SwipeNavigator";

const gestureMocks = vi.hoisted(() => ({ native: false, language: "fa", setOpenMobile: vi.fn() }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => gestureMocks.native } }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: gestureMocks.language, resolvedLanguage: gestureMocks.language, dir: (language: string) => language === "fa" ? "rtl" : "ltr" } }),
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ setOpenMobile: gestureMocks.setOpenMobile }),
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

function dispatchTouch(type: string, x: number, y = 240, count = 1, target: Element = document.body) {
  const event = new Event(type, { bubbles: true });
  const point = { clientX: x, clientY: y };
  Object.assign(event, { touches: type === "touchend" || type === "touchcancel" ? [] : Array.from({ length: count }, () => point), changedTouches: [point] });
  target.dispatchEvent(event);
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
    gestureMocks.native = false;
    gestureMocks.language = "fa";
    vi.clearAllMocks();
    Object.defineProperty(window, "innerWidth", { value: 420, writable: true, configurable: true });
  });

  afterEach(() => {
    vi.restoreAllMocks();
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

  it("never navigates on a spurious end after touchcancel", () => {
    renderAt("/app/today");
    act(() => {
      dispatchTouch("touchstart", 330);
      dispatchTouch("touchmove", 180);
      dispatchTouch("touchcancel", 180);
      dispatchTouch("touchend", 180);
    });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
    expect(gestureMocks.setOpenMobile).not.toHaveBeenCalled();
  });

  it.each(["multitouch", "vertical", "retreat"])("does not commit after %s", (failure) => {
    renderAt("/app/today");
    act(() => {
      dispatchTouch("touchstart", 330);
      dispatchTouch("touchmove", 180, failure === "vertical" ? 350 : 240, failure === "multitouch" ? 2 : 1);
      dispatchTouch("touchend", failure === "retreat" ? 320 : 180);
    });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
  });

  it.each([
    ["fa", 330, 180, "/app/tomorrow", "/app/next7"],
    ["fa", 180, 330, "/app/tomorrow", "/app/today"],
    ["en", 180, 330, "/app/tomorrow", "/app/next7"],
    ["en", 330, 180, "/app/tomorrow", "/app/today"],
  ])("maps %s swipe %s → %s correctly", (language, from, to, initial, expected) => {
    gestureMocks.language = language; renderAt(initial);
    act(() => { swipeLeftOn(document.body, from, to); });
    expect(screen.getByTestId("path")).toHaveTextContent(expected);
  });

  it("reacts to a language switch and discards the previous in-progress swipe", () => {
    const view = () => <MemoryRouter initialEntries={["/app/today"]}><SwipeNavigator /><PathProbe /></MemoryRouter>;
    const { rerender } = render(view());
    act(() => { dispatchTouch("touchstart", 330); });
    gestureMocks.language = "en"; rerender(view());
    act(() => { dispatchTouch("touchend", 180); });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
    act(() => { swipeLeftOn(document.body, 180, 330); });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/tomorrow");
  });

  it.each(["fa", "en"])("opens the sidebar past the last scope in %s", (language) => {
    gestureMocks.language = language; renderAt("/app/inbox");
    act(() => { swipeLeftOn(document.body, language === "fa" ? 330 : 180, language === "fa" ? 180 : 330); });
    expect(gestureMocks.setOpenMobile).toHaveBeenCalledExactlyOnceWith(true);
    expect(screen.getByTestId("path")).toHaveTextContent("/app/inbox");
  });

  it("does not install duplicate gesture handlers under native ownership", () => {
    gestureMocks.native = true;
    const listen = vi.spyOn(window, "addEventListener");
    renderAt("/app/today");
    expect(listen.mock.calls.filter(([event]) => event.startsWith("touch"))).toHaveLength(0);
    act(() => { swipeLeftOn(document.body); });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
    expect(gestureMocks.setOpenMobile).not.toHaveBeenCalled();
  });

  it.each(["button", "a", "input", "textarea", "select", "editor"])("ignores %s surfaces", (kind) => {
    renderAt("/app/today");
    const surface = document.createElement(kind === "editor" ? "div" : kind);
    if (kind === "editor") surface.setAttribute("contenteditable", "true");
    document.body.append(surface);
    act(() => { swipeLeftOn(surface); }); surface.remove();
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
  });

  it("ignores text selection", () => {
    renderAt("/app/today");
    vi.spyOn(window, "getSelection").mockReturnValue({ toString: () => "selected" } as Selection);
    act(() => { swipeLeftOn(document.body); });
    expect(screen.getByTestId("path")).toHaveTextContent("/app/today");
  });
});
