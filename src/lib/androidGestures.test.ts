import { describe, it, expect } from "vitest";
import { swipeAction } from "./androidGestures";
describe("Android gesture arbitration", () => {
  it("opens and closes only in the drawer direction", () => {
    expect(
      swipeAction({ x: 350, y: 100, time: 0, mode: "open" }, 250, 105, 300),
    ).toBe("open");
    expect(
      swipeAction({ x: 100, y: 100, time: 0, mode: "close" }, 200, 105, 300),
    ).toBe("close");
    expect(
      swipeAction({ x: 350, y: 100, time: 0, mode: "open" }, 450, 105, 300),
    ).toBeNull();
  });
  it("does not consume vertical scrolling or long drags", () => {
    expect(
      swipeAction({ x: 200, y: 100, time: 0, mode: "navigate" }, 100, 250, 300),
    ).toBeNull();
    expect(
      swipeAction(
        { x: 200, y: 100, time: 0, mode: "navigate" },
        100,
        110,
        1300,
      ),
    ).toBeNull();
    expect(
      swipeAction({ x: 200, y: 100, time: 0, mode: "navigate" }, 150, 100, 300),
    ).toBeNull();
  });
  it("supports next and previous", () => {
    expect(
      swipeAction({ x: 200, y: 100, time: 0, mode: "navigate" }, 100, 105, 300),
    ).toBe("next");
    expect(
      swipeAction({ x: 200, y: 100, time: 0, mode: "navigate" }, 300, 105, 300),
    ).toBe("previous");
  });
});
