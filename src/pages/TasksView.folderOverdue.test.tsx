import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import TasksView from "./TasksView";
import { isTaskOverdue } from "@/lib/taskPlanning";
import { getTimeSettings } from "@/lib/timeHorizon";

const allTasks = [
  { id: "task-overdue", title: "Overdue folder task", completed: false, status: "todo", priority: "none", parent_id: null, folder_id: "folder-1", due_date: "2020-01-01" },
  { id: "task-upcoming", title: "Upcoming folder task", completed: false, status: "todo", priority: "none", parent_id: null, folder_id: "folder-1", due_date: "2099-01-01" },
  { id: "task-done", title: "Done folder task", completed: true, status: "done", priority: "none", parent_id: null, folder_id: "folder-1", due_date: "2020-01-01" },
  { id: "task-other", title: "Other folder task", completed: false, status: "todo", priority: "none", parent_id: null, folder_id: "folder-2", due_date: "2020-01-01" },
];

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("@/hooks/useTasksData", () => ({
  useTasksData: () => ({ allTasks, setAllTasks: vi.fn(), taskTagsMap: {}, outcomeById: {}, outcomeByTaskId: {}, folderName: "", tagName: "", load: vi.fn() }),
}));
vi.mock("@/components/VirtualTaskList", () => ({ VirtualTaskList: ({ itemIds, renderItem }: any) => <>{itemIds.map(renderItem)}</> }));
vi.mock("@/lib/androidWidget", () => ({ syncAndroidWidget: async () => {} }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));

beforeEach(() => {
  document.body.insertAdjacentHTML("beforeend", '<div id="app-header-actions"></div>');
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.getElementById("app-header-actions")?.remove(); });

function renderFolder() {
  render(<MemoryRouter initialEntries={["/app/folders/folder-1"]}><Routes><Route path="/app/folders/:id" element={<TasksView scope="folder" />} /></Routes></MemoryRouter>);
}

describe("folder scope overdue behaviour", () => {
  it("marks the past-due fixture as overdue", () => {
    expect(isTaskOverdue(allTasks[0], getTimeSettings())).toBe(true);
    expect(isTaskOverdue(allTasks[1], getTimeSettings())).toBe(false);
  });

  it("renders overdue folder tasks in the main list (never hides them)", () => {
    renderFolder();
    expect(screen.getByText("Overdue folder task")).toBeInTheDocument();
    expect(screen.getByText("Upcoming folder task")).toBeInTheDocument();
  });

  it("shows completed folder tasks by default", () => {
    renderFolder();
    expect(screen.getByText("Done folder task")).toBeInTheDocument();
  });

  it("does not leak tasks from other folders", () => {
    renderFolder();
    expect(screen.queryByText("Other folder task")).not.toBeInTheDocument();
  });

  it("keeps the overdue task visible after toggling completed visibility", () => {
    renderFolder();
    fireEvent.click(screen.getByTestId("tasks-toggle-completed"));
    expect(screen.getByText("Overdue folder task")).toBeInTheDocument();
    expect(screen.queryByText("Done folder task")).not.toBeInTheDocument();
  });
});
