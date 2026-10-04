import { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { TaskSplitScreen } from "./TaskSplitScreen";
import type { Task } from "@/lib/taskTypes";
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("./TaskDetail", () => ({ TaskDetail: ({ mode, onClose }: any) => <div data-testid="inspector" data-mode={mode}><button onClick={onClose}>Close</button></div> }));
let width = 1000;
function Page() {
  const [task, select] = useState<Task | null>(null);
  return <TaskSplitScreen task={task} onClose={() => select(null)} onChanged={() => {}}><button onClick={() => select({ id: "task" } as Task)}>Open task</button></TaskSplitScreen>;
}
beforeEach(() => {
  localStorage.clear(); localStorage.setItem("arshnaz_tasks_split_view", "false"); width = 1000;
  document.body.insertAdjacentHTML("beforeend", '<div id="app-header-actions"></div>');
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width } as DOMRect));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.getElementById("app-header-actions")?.remove(); });
describe("shared task split screen", () => {
  it("places the sole toggle in the header, splits on selection and restores full width on close", () => {
    render(<Page />);
    fireEvent.click(within(document.getElementById("app-header-actions")!).getByTestId("tasks-toggle-split"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    fireEvent.click(screen.getByText("Open task"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "true");
    expect(screen.getByTestId("inspector")).toHaveAttribute("data-mode", "embedded");
    expect(screen.getAllByTestId("tasks-toggle-split")).toHaveLength(1);
    fireEvent.click(screen.getByText("Close"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    expect(screen.getByTestId("tasks-toggle-split")).toHaveAttribute("aria-pressed", "true");
  });
  it("uses a drawer when disabled or the screen is narrow", () => {
    width = 500; render(<Page />);
    expect(screen.getByTestId("tasks-toggle-split")).toBeDisabled();
    fireEvent.click(screen.getByText("Open task"));
    expect(screen.getByTestId("inspector")).toHaveAttribute("data-mode", "drawer");
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
  });
});
