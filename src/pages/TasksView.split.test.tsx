import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, Link } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import TasksView from "./TasksView";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useTasksData", () => {
  const tasks = [{ id: "task-1", title: "Sample task", completed: false, status: "todo", priority: "none", parent_id: null, due_date: new Date().toISOString() }];
  const folderTasks = tasks.map(task => ({ ...task, folder_id: "folder-1" }));
  return { useTasksData: ({ scope }: { scope: string }) => ({ allTasks: scope === "folder" ? folderTasks : tasks, setAllTasks: vi.fn(), taskTagsMap: {}, outcomeById: {}, outcomeByTaskId: {}, folderName: "", tagName: "", load: vi.fn() }) };
});
vi.mock("@/components/VirtualTaskList", () => ({ VirtualTaskList: ({ itemIds, renderItem }: any) => <>{itemIds.map(renderItem)}</> }));
vi.mock("@/lib/androidWidget", () => ({ syncAndroidWidget: async () => {} }));
vi.mock("@/components/TaskDetail", () => ({ TaskDetail: ({ onClose }: { onClose: () => void }) => <div data-testid="task-inspector"><button onClick={onClose}>Close task</button></div> }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));

let contentWidth = 1000;
beforeEach(() => {
  document.body.insertAdjacentHTML("beforeend", '<div id="app-header-actions"></div>');
  localStorage.clear();
  localStorage.setItem("arshnaz_tasks_split_view", "false");
  contentWidth = 1000;
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(() => ({ width: contentWidth, height: 800, top: 0, left: 0, right: contentWidth, bottom: 800, x: 0, y: 0, toJSON: () => ({}) }));
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.getElementById("app-header-actions")?.remove(); });

describe("task split toggle", () => {
  it.each(["inbox", "today", "folder"] as const)("splits only while a task is open in %s", scope => {
    render(<MemoryRouter initialEntries={[scope === "folder" ? "/app/folders/folder-1" : "/app/tasks"]}><Routes><Route path={scope === "folder" ? "/app/folders/:id" : "/app/tasks"} element={<TasksView scope={scope} />} /></Routes></MemoryRouter>);
    const toggle = screen.getByTestId("tasks-toggle-split");
    expect(toggle).not.toBeDisabled();
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    fireEvent.click(toggle);
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    expect(within(document.getElementById("app-header-actions")!).getByTestId("tasks-toggle-split")).toBe(toggle);
    fireEvent.click(screen.getByText("Sample task"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "true");
    fireEvent.click(screen.getByText("Close task"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(toggle);
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
  });
  it("clears the selected task when navigating from Inbox to another task page", () => {
    render(<MemoryRouter initialEntries={["/inbox"]}><Link to="/tomorrow">Tomorrow page</Link><Routes><Route path="/inbox" element={<TasksView scope="inbox" />} /><Route path="/tomorrow" element={<TasksView scope="tomorrow" />} /></Routes></MemoryRouter>);
    fireEvent.click(screen.getByTestId("tasks-toggle-split"));
    fireEvent.click(screen.getByText("Sample task"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "true");
    fireEvent.click(screen.getByText("Tomorrow page"));
    expect(document.querySelector("[data-task-split]")).toHaveAttribute("data-task-split", "false");
    expect(screen.queryByTestId("task-inspector")).not.toBeInTheDocument();
  });
  it("disables the toggle when the content cannot fit both panes", () => {
    contentWidth = 500;
    render(<MemoryRouter><TasksView scope="inbox" /></MemoryRouter>);
    expect(screen.getByTestId("tasks-toggle-split")).toBeDisabled();
  });
});
