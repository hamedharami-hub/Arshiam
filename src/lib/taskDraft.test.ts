import { describe, expect, it } from "vitest";
import { taskPatch } from "@/lib/taskDraft";
import type { Task } from "@/lib/taskTypes";

const savedTask: Task = {
  id: "task-1", title: "عنوان قبلی", description: "متن قبلی", priority: "none",
  due_date: null, completed: false, status: "todo", folder_id: null, reminder_at: null,
  recurrence: "none", recurrence_rule: null, parent_id: null, pinned: false,
  start_at: null, end_at: null, estimated_minutes: null,
};

describe("taskPatch", () => {
  it("includes every changed task field in one save payload", () => {
    const current: Task = {
      ...savedTask,
      title: "عنوان جدید",
      description: "متن جدید",
      priority: "high",
      folder_id: "folder-2",
    };

    expect(taskPatch(current, savedTask)).toEqual({
      title: "عنوان جدید",
      description: "متن جدید",
      priority: "high",
      folder_id: "folder-2",
    });
  });

  it("returns an empty payload when nothing changed", () => {
    expect(taskPatch({ ...savedTask }, savedTask)).toEqual({});
  });
});
