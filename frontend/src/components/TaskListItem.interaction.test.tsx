import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskListItem, type TaskListItemProps } from "./TaskListItem";
import type { Task } from "@/lib/taskTypes";
import { setTaskSwipeSettings } from "@/lib/taskSwipeSettings";

vi.mock("./TaskScheduleSheet", () => ({ TaskScheduleSheet: ({ children }: { children: React.ReactNode }) => children }));
vi.mock("@/lib/haptics", () => ({ haptic: vi.fn() }));
const task = { id: "gesture-task", user_id: "gesture-owner", title: "Gesture task", completed: false, status: "todo", priority: "none" } as Task;
const props = (): TaskListItemProps => ({
  t: task, userId: task.user_id, subs: [], open: false, onToggleExpand: vi.fn(), onSelectTask: vi.fn(), onToggleTask: vi.fn(),
  onActionTask: vi.fn(), onDeleteTask: vi.fn(), onPatchTask: vi.fn(), isSelected: false, splitView: false, layout: "compact", isEn: false,
  T: (fa) => fa, navigate: vi.fn(), outcomeByTaskId: {}, outcomeById: {}, childrenMap: {}, expanded: {}, getProgress: () => ({ done: 0, total: 0 }), taskMap: new Map(),
});
afterEach(() => vi.useRealTimers());
const touch = (x: number, y = 20) => ({ touches: [{ clientX: x, clientY: y }] });

describe("task row gesture and action access", () => {
  it("uses requested safe default gestures and supports disabling both directions", async () => {
    const options = props();
    setTaskSwipeSettings(task.user_id, { left: "complete", right: "today" });
    const swipe = vi.fn();
    render(<TaskListItem {...options} onSwipeTask={swipe} />);
    const title = screen.getByText(task.title);
    fireEvent.touchStart(title, touch(200)); fireEvent.touchMove(title, touch(130)); fireEvent.touchEnd(title);
    await waitFor(() => expect(swipe).toHaveBeenCalledWith(task, "complete"));
    fireEvent.touchStart(title, touch(100)); fireEvent.touchMove(title, touch(170)); fireEvent.touchEnd(title);
    await waitFor(() => expect(swipe).toHaveBeenCalledWith(task, "today"));
    expect(options.onDeleteTask).not.toHaveBeenCalled();
    act(() => setTaskSwipeSettings(task.user_id, { left: "none", right: "none" }));
    swipe.mockClear();
    fireEvent.touchStart(title, touch(100)); fireEvent.touchMove(title, touch(170)); fireEvent.touchEnd(title);
    expect(swipe).not.toHaveBeenCalled();
  });

  it("opens the same task actions through right click and keyboard without navigating", () => {
    const options = props();
    render(<TaskListItem {...options} />);
    const title = screen.getByText(task.title);
    fireEvent.contextMenu(title);
    fireEvent.keyDown(title.closest("button")!, { key: "F10", shiftKey: true });
    expect(options.onActionTask).toHaveBeenCalledTimes(2);
    expect(options.onActionTask).toHaveBeenCalledWith(task);
    expect(options.onSelectTask).not.toHaveBeenCalled();
  });

  it("opens actions on a hold and suppresses the resulting navigation tap", () => {
    vi.useFakeTimers();
    const options = props();
    render(<TaskListItem {...options} />);
    const title = screen.getByText(task.title);
    fireEvent.touchStart(title, touch(100));
    act(() => vi.advanceTimersByTime(500));
    fireEvent.touchEnd(title);
    fireEvent.click(title);
    expect(options.onActionTask).toHaveBeenCalledTimes(1);
    expect(options.onSelectTask).not.toHaveBeenCalled();
  });
});
