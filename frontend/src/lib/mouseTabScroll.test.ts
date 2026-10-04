import { afterEach, describe, expect, it, vi } from "vitest";
import { installMouseTabScroll } from "./mouseTabScroll";

let cleanup = () => {};
afterEach(() => { cleanup(); document.body.innerHTML = ""; });
const fixture = () => {
  const row = document.createElement("div"); row.className = "overflow-x-auto";
  row.innerHTML = "<button>Goal</button>";
  Object.defineProperties(row, { scrollWidth: { value: 900 }, clientWidth: { value: 300 }, clientHeight: { value: 40 } });
  document.body.append(row); cleanup = installMouseTabScroll();
  return { row, button: row.querySelector("button")! };
};
const pointer = (target: Element, type: string, x: number, pointerType = "mouse") => {
  const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, button: 0 });
  Object.defineProperty(event, "pointerType", { value: pointerType }); target.dispatchEvent(event);
};
describe("mouse scrolling horizontal tabs", () => {
  it("scrolls by dragging and suppresses accidental tab selection after a drag", () => {
    const { row, button } = fixture(); const selected = vi.fn(); button.addEventListener("click", selected);
    pointer(button, "pointerdown", 200); pointer(button, "pointermove", 100); pointer(button, "pointerup", 100);
    expect(row.scrollLeft).toBe(100); button.click(); expect(selected).not.toHaveBeenCalled();
    button.click(); expect(selected).toHaveBeenCalledTimes(1);
  });
  it("preserves normal clicks and leaves touch scrolling to the browser", () => {
    const { row, button } = fixture(); const selected = vi.fn(); button.addEventListener("click", selected);
    pointer(button, "pointerdown", 100); pointer(button, "pointerup", 100); button.click();
    expect(selected).toHaveBeenCalledTimes(1);
    pointer(button, "pointerdown", 200, "touch"); pointer(button, "pointermove", 100, "touch");
    expect(row.scrollLeft).toBe(0);
  });
  it("supports the mouse wheel and removes listeners when disposed", () => {
    const { row, button } = fixture(); button.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 50 }));
    expect(row.scrollLeft).toBe(50); cleanup();
    button.dispatchEvent(new WheelEvent("wheel", { bubbles: true, deltaY: 50 })); expect(row.scrollLeft).toBe(50);
  });
});
