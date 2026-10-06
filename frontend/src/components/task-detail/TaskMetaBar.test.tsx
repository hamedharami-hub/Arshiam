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

  it("renders When/Planning/Priority as an inline panel instead of a bottom sheet", () => {
    const { rerender } = render(<TaskMetaBar {...props(true, "schedule")} />);
    expect(screen.getByTestId("task-inline-panel")).toHaveAttribute("data-panel", "schedule");
    expect(screen.queryByTestId("task-meta-sheet")).toBeNull();
    rerender(<TaskMetaBar {...props(true, "plan")} />);
    expect(screen.getByTestId("task-inline-panel")).toHaveAttribute("data-panel", "plan");
    rerender(<TaskMetaBar {...props(true, "priority")} />);
    expect(screen.getByTestId("task-inline-panel")).toHaveAttribute("data-panel", "priority");
  });

  it("closes the priority panel right after a choice", () => {
    const input = props(true, "priority");
    render(<TaskMetaBar {...input} />);
    fireEvent.click(screen.getByTestId("task-priority-urgent"));
    expect(input.save).toHaveBeenCalledWith({ priority: "urgent" });
    expect(input.setPanel).toHaveBeenCalledWith(null);
  });
});

describe("meta strip overflow affordance", () => {
  const rect = (left: number, right: number) => ({
    left, right, top: 0, bottom: 36, width: right - left, height: 36, x: left, y: 0, toJSON: () => ({}),
  }) as DOMRect;

  it("fades only the edge that hides a tile and keeps the tiles touch-sized", () => {
    render(<TaskMetaBar {...props(true, null)} />);
    const toolbar = screen.getByRole("toolbar");
    expect(toolbar.className).not.toContain("meta-strip-fade");

    // jsdom has no layout: hand the strip and its tiles the geometry a narrow screen produces.
    const tiles = Array.from(toolbar.children) as HTMLElement[];
    expect(tiles.length).toBeGreaterThan(1);
    toolbar.getBoundingClientRect = () => rect(0, 300);
    tiles[0].getBoundingClientRect = () => rect(0, 90);
    tiles[tiles.length - 1].getBoundingClientRect = () => rect(280, 360);
    fireEvent.scroll(toolbar);

    expect(toolbar.className).toContain("meta-strip-fade-right");
    expect(toolbar.className).not.toContain("meta-strip-fade-left");
    expect(screen.getByTestId("task-meta-pin")).toHaveClass("h-9");
  });

  it("fades both edges when tiles are hidden on both sides", () => {
    render(<TaskMetaBar {...props(true, null)} />);
    const toolbar = screen.getByRole("toolbar");
    const tiles = Array.from(toolbar.children) as HTMLElement[];
    toolbar.getBoundingClientRect = () => rect(0, 300);
    tiles[0].getBoundingClientRect = () => rect(280, 360);
    tiles[tiles.length - 1].getBoundingClientRect = () => rect(-60, 40);
    fireEvent.scroll(toolbar);

    expect(toolbar.className).toContain("meta-strip-fade-both");
  });
});
