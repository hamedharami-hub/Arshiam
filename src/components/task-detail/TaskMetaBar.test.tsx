import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskMetaBar, type TaskMetaBarProps } from "./TaskMetaBar";

vi.mock("./TaskSchedulingSheet", () => ({ TaskScheduleBody: () => null }));
vi.mock("@/components/TaskPlanningPicker", () => ({ TaskPlanningBody: () => null, useTaskPlanningLabel: () => null }));

function props(isOwner = true, panel: TaskMetaBarProps["panel"] = "folder"): TaskMetaBarProps {
  return {
    t: { id: "task", folder_id: "nested", priority: "none" },
    canEdit: true, isOwner, isEn: true, panel,
    folders: [
      { id: "root", name: "Work", parent_id: null },
      { id: "nested", name: "Project", parent_id: "middle" },
      { id: "orphan", name: "Earlier folder", parent_id: "missing" },
    ],
    folderName: (id: string) => id === "nested" ? "Work / Project" : id === "orphan" ? "Earlier folder" : "Work",
    setPanel: vi.fn(), save: vi.fn().mockResolvedValue(undefined), goals: [],
    tags: [], taskTagIds: [], TAG_COLORS: [],
    T: (_fa: string, en: string) => en,
  } as unknown as TaskMetaBarProps;
}

describe("Task folder selection (inline panel)", () => {
  it("offers deeply nested and orphan folders, selects one and closes the panel", async () => {
    const input = props();
    render(<TaskMetaBar {...input} />);
    expect(screen.getByTestId("task-inline-panel")).toHaveAttribute("data-panel", "folder");
    expect(screen.getByRole("button", { name: "Work / Project" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Earlier folder" }));
    await waitFor(() => expect(input.save).toHaveBeenCalledWith({ folder_id: "orphan" }));
    await waitFor(() => expect(input.setPanel).toHaveBeenCalledWith(null));
  });

  it("prevents a shared-task editor from assigning the owner's folders", () => {
    render(<TaskMetaBar {...props(false)} />);
    expect(screen.getByRole("button", { name: "Work / Project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Inbox/ })).toBeDisabled();
  });

  it("shows only icons for unset items and toggles one panel at a time", () => {
    const input = props(true, null);
    render(<TaskMetaBar {...input} />);
    expect(screen.queryByTestId("task-inline-panel")).toBeNull();
    expect(screen.getByTestId("task-meta-priority").querySelector(".truncate")).toBeNull();
    fireEvent.click(screen.getByTestId("task-meta-priority"));
    expect(input.setPanel).toHaveBeenCalledWith("priority");
  });

  it("closes the open panel on Escape", () => {
    const input = props(true, "tags");
    render(<TaskMetaBar {...input} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(input.setPanel).toHaveBeenCalledWith(null);
  });
});
