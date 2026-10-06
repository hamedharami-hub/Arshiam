import { fireEvent, render, screen } from "@testing-library/react";
import { Check, Calendar } from "lucide-react";
import { describe, expect, it, vi } from "vitest";
import SwipeableRow from "./SwipeableRow";

vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));

function setup() {
  const left = vi.fn();
  const right = vi.fn();
  const open = vi.fn();
  const { container } = render(<div dir="rtl"><SwipeableRow
    leftActions={[{ id: "complete", label: "Complete", icon: Check, fullSwipe: true, onActivate: left }]}
    rightActions={[{ id: "today", label: "Today", icon: Calendar, fullSwipe: true, onActivate: right }]}>
    <button data-task-row-open onClick={open}>Task title</button>
    <button data-no-swipe>Expand children</button>
  </SwipeableRow></div>);
  const surface = container.querySelectorAll("[data-no-swipe-nav]")[1];
  return { left, right, open, surface };
}
const touch = (x: number, y = 20) => ({ touches: [{ clientX: x, clientY: y }] });

describe("task row physical gestures", () => {
  it("keeps physical left/right independent of right-to-left layout and suppresses navigation after a swipe", () => {
    const { left, right, open } = setup();
    const title = screen.getByText("Task title");
    fireEvent.touchStart(title, touch(200));
    fireEvent.touchMove(title, touch(130));
    fireEvent.touchEnd(title);
    expect(left).toHaveBeenCalledTimes(1);
    expect(right).not.toHaveBeenCalled();
    fireEvent.click(title);
    expect(open).not.toHaveBeenCalled();
    fireEvent.touchStart(title, touch(100));
    fireEvent.touchMove(title, touch(170));
    fireEvent.touchEnd(title);
    expect(right).toHaveBeenCalledTimes(1);
  });

  it("commits a full swipe once, even when the action strip is narrower than the row", () => {
    const { left } = setup();
    const title = screen.getByText("Task title");
    fireEvent.touchStart(title, touch(300));
    fireEvent.touchMove(title, touch(40));
    fireEvent.touchMove(title, touch(20));
    fireEvent.touchEnd(title);
    expect(left).toHaveBeenCalledTimes(1);
  });

  it("leaves vertical scrolling, child controls and cancelled gestures untouched", () => {
    const { left, right, surface } = setup();
    const title = screen.getByText("Task title");
    fireEvent.touchStart(title, touch(200));
    fireEvent.touchMove(title, touch(175, 120));
    fireEvent.touchEnd(title);
    fireEvent.touchStart(screen.getByText("Expand children"), touch(200));
    fireEvent.touchMove(surface, touch(120));
    fireEvent.touchEnd(surface);
    fireEvent.touchStart(title, touch(200));
    fireEvent.touchMove(title, touch(140));
    fireEvent.touchCancel(title);
    expect(left).not.toHaveBeenCalled();
    expect(right).not.toHaveBeenCalled();
  });
});
