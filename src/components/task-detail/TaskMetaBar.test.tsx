import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TaskMetaBar, type TaskMetaBarProps } from "./TaskMetaBar";

vi.mock("./TaskSchedulingSheet", () => ({ TaskSchedulingSheet: () => null }));

function props(isOwner = true): TaskMetaBarProps {
  return {
    t: { id: "task", folder_id: "nested", priority: "none" },
    canEdit: true, isOwner, folderOpen: true,
    folders: [
      { id: "root", name: "Work", parent_id: null },
      { id: "nested", name: "Project", parent_id: "middle" },
      { id: "orphan", name: "Earlier folder", parent_id: "missing" },
    ],
    folderName: (id: string) => id === "nested" ? "Work / Project" : id === "orphan" ? "Earlier folder" : "Work",
    setFolderOpen: vi.fn(), save: vi.fn().mockResolvedValue(undefined),
    tags: [], taskTagIds: [], TAG_COLORS: [],
    T: (_fa: string, en: string) => en,
  } as unknown as TaskMetaBarProps;
}

describe("Task folder selection", () => {
  it("offers deeply nested and orphan folders, selects one and closes the picker", async () => {
    const input = props();
    render(<TaskMetaBar {...input} />);
    expect(screen.getByRole("button", { name: "Work / Project" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Earlier folder" }));
    await waitFor(() => expect(input.save).toHaveBeenCalledWith({ folder_id: "orphan" }));
    expect(input.setFolderOpen).toHaveBeenCalledWith(false);
  });

  it("prevents a shared-task editor from assigning the owner's folders", () => {
    render(<TaskMetaBar {...props(false)} />);
    expect(screen.getByRole("button", { name: "Work / Project" })).toBeDisabled();
    expect(screen.getByRole("button", { name: /No folder/ })).toBeDisabled();
  });
});
