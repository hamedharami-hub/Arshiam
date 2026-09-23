import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "owner-1" } }) }));
vi.mock("@/hooks/useShareAccess", () => ({
  useShareAccess: () => ({ canEdit: true, canComment: true, isOwner: true }),
}));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "en" }, t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: vi.fn() },
}));
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
  it("opens the full task page with its editor without a reference error", () => {
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
    expect(html).not.toContain("Description");
  });
});
