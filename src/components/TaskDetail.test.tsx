import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner-1" } }) }));
vi.mock("@/hooks/useShareAccess", () => ({
  useShareAccess: () => ({ canEdit: true, canComment: true, isOwner: true }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { language: "en" } }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => vi.fn() }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {} }));
vi.mock("@/components/TaskSubtasksInline", () => ({ TaskSubtasksInline: () => null }));
vi.mock("@/components/TaskDescriptionEditor", () => ({ TaskDescriptionEditor: () => null }));
vi.mock("@/components/TaskActionSheet", () => ({ default: () => null }));
vi.mock("@/components/PomodoroSheet", () => ({ default: () => null }));
vi.mock("@/components/TaskOutcomeSheet", () => ({ TaskOutcomeSheet: () => null }));
vi.mock("@/components/TaskAIPanel", () => ({ TaskAIPanel: () => null }));

import { TaskDetail } from "./TaskDetail";

describe("TaskDetail initial render", () => {
  it("opens an ordinary task without taking space for progress", () => {
    const task = {
      id: "task-1", user_id: "owner-1", title: "Plan tomorrow",
      description: "A clear next step", completed: false, status: "todo",
      priority: "none", folder_id: null, parent_id: null, due_date: null,
    } as Task;
    const html = renderToString(
      <TaskDetail task={task} mode="page" onClose={() => {}} onChanged={() => {}} setConfirm={() => {}} />,
    );
    expect(html).toContain("Plan tomorrow");
    expect(html).not.toContain("Task progress");
    expect(html).not.toContain('aria-label="Subtasks"');
    expect(html).toContain("Description");
  });

  it("renders the selected subtask section on that task", () => {
    const task = {
      id: "task-3", user_id: "owner-1", title: "Project",
      description: null, completed: false, status: "todo",
      priority: "none", folder_id: null, parent_id: null, due_date: null,
      show_subtasks: true,
    } as Task;
    const html = renderToString(
      <TaskDetail task={task} mode="page" onClose={() => {}} onChanged={() => {}} setConfirm={() => {}} />,
    );
    expect(html).toContain('aria-label="Subtasks"');
  });

  it("shows progress only for a task that opted in", () => {
    const task = {
      id: "task-2", user_id: "owner-1", title: "Project",
      description: null, completed: false, status: "todo",
      priority: "none", folder_id: null, parent_id: null, due_date: null,
      show_progress: true,
    } as Task;
    const html = renderToString(
      <TaskDetail task={task} mode="page" onClose={() => {}} onChanged={() => {}} setConfirm={() => {}} />,
    );
    expect(html).toContain("Task progress");
  });

  it("lets the new-task route own the only visible save toolbar", () => {
    const task = {
      id: "draft-1", user_id: "owner-1", title: "", description: null,
      completed: false, status: "todo", priority: "none",
      folder_id: null, parent_id: null, due_date: null,
    } as Task;
    const html = renderToString(
      <TaskDetail task={task} mode="page" hidePageToolbar onClose={() => {}} onChanged={() => {}} setConfirm={() => {}} />,
    );
    expect(html).not.toContain("Task progress");
    expect(html).not.toContain("Save</button>");
    expect(html).not.toContain("Saved</span>");
  });
});
