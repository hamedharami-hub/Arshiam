import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ user: { id: "owner" }, tasks: [] as Array<Record<string, unknown>>, upsert: vi.fn(), saveGoals: vi.fn(), error: vi.fn(), outcomes: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("react-i18next", async (original) => ({ ...await original<typeof import("react-i18next")>(), useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("@/lib/firestoreDataService", () => ({
  upsertTask: mocks.upsert,
  subscribeFolders: (_owner: string, update: (rows: unknown[]) => void) => { update([]); return () => {}; },
  persistTask: vi.fn(),
}));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: vi.fn().mockResolvedValue([]) }));
vi.mock("@/features/tasks/taskService", () => ({
  getCachedTasks: async () => mocks.tasks,
  applyPendingTaskOperations: async (tasks: unknown[]) => tasks,
}));
vi.mock("@/features/tasks/taskCompletion", () => ({ setTaskCompletion: vi.fn() }));
vi.mock("@/lib/taskOutcomes", () => ({ executeTaskOutcome: mocks.outcomes }));
vi.mock("@/lib/kanbanGoals", async (original) => ({
  ...await original<typeof import("@/lib/kanbanGoals")>(),
  getUserOwnGoals: () => [{ id: "goal", title: "Goal", parentId: null, priority: "medium", timeHorizon: "monthly", folderId: null }],
  readStoredGoals: () => [{ id: "goal", title: "Goal" }], saveKanbanGoals: mocks.saveGoals,
}));
vi.mock("sonner", () => ({ toast: { error: mocks.error, success: vi.fn(), info: vi.fn() } }));
vi.mock("@/components/TaskSplitScreen", () => ({ TaskSplitScreen: ({ children }: React.PropsWithChildren) => <>{children}</> }));
vi.mock("@/components/QuickAddTask", () => ({ QuickAddTask: () => null }));
vi.mock("@/components/SharedTaskRow", () => ({
  SharedTaskRowsProvider: ({ children }: React.PropsWithChildren) => <>{children}</>, SharedTaskRow: ({ task }: { task: { title: string } }) => <span>{task.title}</span>,
}));
vi.mock("@/components/kanban/GoalHeader", () => ({ GoalHeader: ({ onDelete, children }: React.PropsWithChildren<{ onDelete: () => void }>) => <><button onClick={onDelete}>Delete goal header</button>{children}</> }));
vi.mock("@/components/kanban/GoalEditorModal", () => ({ default: () => null }));
vi.mock("@/components/kanban/MultiTierTabs", () => ({ default: () => null }));
vi.mock("@/components/OutcomePicker", () => ({ OutcomePicker: () => null }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));

import KanbanView from "./KanbanView";

describe("Kanban goal reassignment safety", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.tasks = [{ id: "task", user_id: "owner", title: "Task", kanban_column_id: "goal", completed: false, status: "todo", parent_id: null }]; });
  it("keeps waiting and won't-do tasks visible in labeled sections in both layouts", async () => {
    mocks.tasks = ["waiting", "wont_do"].map(status => ({ id: status, user_id: "owner", title: `Task ${status}`, kanban_column_id: "goal", completed: false, status, parent_id: null }));
    render(<MemoryRouter><KanbanView /></MemoryRouter>);
    await screen.findByText("Task waiting");
    expect(screen.getByTestId("kanban-status-waiting")).toHaveTextContent("Waiting");
    expect(screen.getByTestId("kanban-status-wont_do")).toHaveTextContent("Won’t do");
    fireEvent.click(screen.getByTestId("kanban-layout-columns"));
    expect(screen.getByText("Task waiting")).toBeInTheDocument();
    expect(screen.getByText("Task wont_do")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Change status" })).toHaveLength(2);
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it.each(["false", "throw"])("keeps the goal and confirmation dialog when reassignment returns %s", async (failure) => {
    if (failure === "false") mocks.upsert.mockResolvedValue(false);
    else mocks.upsert.mockRejectedValue(new Error("write denied"));
    render(<MemoryRouter><KanbanView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Delete goal header" }));
    await screen.findByText(/1 task\(s\) are linked/);
    fireEvent.click(screen.getByRole("button", { name: "Delete goal" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalled());
    expect(mocks.saveGoals).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });
  it("removes the goal only after confirmed task reassignment", async () => {
    mocks.upsert.mockResolvedValue(true);
    render(<MemoryRouter><KanbanView /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Delete goal header" }));
    await screen.findByText(/1 task\(s\) are linked/);
    fireEvent.click(screen.getByRole("button", { name: "Delete goal" }));
    await waitFor(() => expect(mocks.saveGoals).toHaveBeenCalledWith([], null, "owner"));
    expect(mocks.upsert).toHaveBeenCalledWith("owner", { id: "task", kanban_column_id: null });
  });
});
