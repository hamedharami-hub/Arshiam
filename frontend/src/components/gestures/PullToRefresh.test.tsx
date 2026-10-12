import { act, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PullToRefresh from "./PullToRefresh";
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
function touch(type: string, y: number, x = 150) {
  const point = { clientX: x, clientY: y, identifier: 1 };
  const event = new Event(type, { bubbles: true });
  Object.defineProperties(event, { touches: { value: type === "touchend" || type === "touchcancel" ? [] : [point] }, changedTouches: { value: [point] } });
  fireEvent(screen.getByText("Content"), event);
}
function mount(refresh = vi.fn()) {
  render(<main style={{ overflowY: "auto" }}><PullToRefresh onRefresh={refresh}><p>Content</p></PullToRefresh></main>);
  return refresh;
}
describe("pull-to-refresh final release", () => {
  it.each(["cancel", "retreat", "release-retreat", "horizontal"])("does not refresh after %s", (failure) => {
    const refresh = mount(); touch("touchstart", 100); touch("touchmove", 300);
    if (failure === "cancel") touch("touchcancel", 300);
    else if (failure === "retreat") { touch("touchmove", 110); touch("touchend", 110); }
    else touch("touchend", failure === "release-retreat" ? 110 : 300, failure === "horizontal" ? 260 : 150);
    expect(refresh).not.toHaveBeenCalled();
  });
  it("releases busy state after a failed refresh and can refresh again", async () => {
    const refresh = mount(vi.fn().mockRejectedValue(new Error("offline")));
    touch("touchstart", 100); touch("touchmove", 300);
    await act(async () => { touch("touchend", 300); });
    touch("touchstart", 100);
    await act(async () => { touch("touchend", 300); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
  it("does not refresh underneath a modal", () => {
    const refresh = mount(); touch("touchstart", 100); touch("touchmove", 300);
    const modal = document.createElement("div"); modal.setAttribute("role", "dialog"); document.body.append(modal);
    touch("touchend", 300); modal.remove(); expect(refresh).not.toHaveBeenCalled();
  });
});
