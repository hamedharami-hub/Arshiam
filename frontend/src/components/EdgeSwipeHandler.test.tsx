import { fireEvent, render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EdgeSwipeHandler from "./EdgeSwipeHandler";
import BackButtonHandler from "./BackButtonHandler";

const mocks = vi.hoisted(() => ({ open: vi.fn(), navigate: vi.fn(), native: false, side: "left" }));
vi.mock("@/components/ui/sidebar", () => ({ useSidebar: () => ({ isMobile: true, openMobile: false, setOpenMobile: mocks.open, side: mocks.side }) }));
vi.mock("@capacitor/core", () => ({ Capacitor: { isNativePlatform: () => mocks.native } }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
vi.mock("react-router-dom", async (original) => ({ ...await original<typeof import("react-router-dom")>(), useNavigate: () => mocks.navigate }));

function touch(type: string, x: number, y = 100) {
  const point = { clientX: x, clientY: y, identifier: 1 };
  const event = new Event(type);
  Object.defineProperties(event, { touches: { value: type === "touchend" || type === "touchcancel" ? [] : [point] }, changedTouches: { value: [point] } });
  fireEvent(window, event);
}
beforeEach(() => {
  vi.clearAllMocks(); mocks.native = false; mocks.side = "left";
  window.history.replaceState({ idx: 1 }, "");
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 400 });
});
function mount(path = "/app/today") { return render(<MemoryRouter initialEntries={[path]}><EdgeSwipeHandler /></MemoryRouter>); }
describe("single web edge owner", () => {
  it("commits only once on release, never when threshold is crossed", () => {
    mount(); touch("touchstart", 5); touch("touchmove", 100);
    expect(mocks.open).not.toHaveBeenCalled();
    touch("touchend", 100); touch("touchend", 100);
    expect(mocks.open).toHaveBeenCalledTimes(1); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it.each(["touchcancel", "retreat", "vertical"])("cancels %s", (failure) => {
    mount(); touch("touchstart", 5); touch("touchmove", 100);
    if (failure === "touchcancel") touch("touchcancel", 100);
    else touch("touchend", failure === "retreat" ? 10 : 100, failure === "vertical" ? 200 : 100);
    expect(mocks.open).not.toHaveBeenCalled(); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("uses the opposite edge for back only with app history", () => {
    mount("/app/settings"); touch("touchstart", 395); touch("touchend", 280);
    expect(mocks.navigate).toHaveBeenCalledWith(-1); expect(mocks.open).not.toHaveBeenCalled();
    mocks.navigate.mockClear(); window.history.replaceState({ idx: 0 }, "");
    touch("touchstart", 395); touch("touchend", 280); expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("cancels when a modal opens during the gesture", () => {
    mount(); touch("touchstart", 5);
    const modal = document.createElement("div"); modal.setAttribute("role", "dialog"); document.body.append(modal);
    touch("touchend", 100); modal.remove(); expect(mocks.open).not.toHaveBeenCalled();
  });
  it("respects sidebar side changes and cancels multitouch", () => {
    mocks.side = "right"; mount();
    touch("touchstart", 395); touch("touchend", 300); expect(mocks.open).toHaveBeenCalledOnce();
    mocks.open.mockClear(); touch("touchstart", 395);
    const event = new Event("touchmove");
    Object.defineProperty(event, "touches", { value: [{ clientX: 300, clientY: 100, identifier: 1 }, { clientX: 200, clientY: 100, identifier: 2 }] });
    fireEvent(window, event); touch("touchend", 300);
    expect(mocks.open).not.toHaveBeenCalled();
  });
  it("does not commit back after cancellation or retreat", () => {
    mount("/app/settings"); touch("touchstart", 395); touch("touchmove", 280); touch("touchcancel", 280); touch("touchend", 280);
    expect(mocks.navigate).not.toHaveBeenCalled();
    touch("touchstart", 395); touch("touchmove", 280); touch("touchend", 390);
    expect(mocks.navigate).not.toHaveBeenCalled();
  });
  it("leaves native gestures and browser history alone", () => {
    mocks.native = true; mount(); touch("touchstart", 5); touch("touchend", 100); expect(mocks.open).not.toHaveBeenCalled();
    const push = vi.spyOn(window.history, "pushState"); render(<BackButtonHandler />);
    fireEvent.popState(window); expect(push).not.toHaveBeenCalled();
  });
});
