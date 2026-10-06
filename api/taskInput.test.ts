import { describe, expect, it } from "vitest";
import { InvalidTaskInputError, taskCompletionWrite, validateTaskInput } from "./_lib/taskInput";

describe("public task state writes", () => {
  it("derives a consistent pair on creation and preserves metadata-only patches", () => {
    expect(taskCompletionWrite({}, true)).toEqual({ completed: false, status: "todo" });
    expect(taskCompletionWrite({ status: "done" }, true)).toEqual({ completed: true, status: "done" });
    expect(taskCompletionWrite({ completed: true })).toEqual({ completed: true, status: "done" });
    expect(taskCompletionWrite({ completed: false })).toEqual({ completed: false, status: "todo" });
    expect(taskCompletionWrite({ status: "waiting" })).toEqual({ completed: false, status: "waiting" });
    expect(taskCompletionWrite({ title: "Rename" })).toEqual({});
  });

  it.each([
    { completed: true, status: "todo" },
    { completed: false, status: "done" },
    { completed: "false" }, { completed: null },
    { status: "unknown" }, { status: null },
    { title: 42 }, { title: "  " }, { title: "x".repeat(501) },
    { description: { text: "Unexpected object" } },
    { folder_id: { id: "folder" } }, { pinned: "false" },
    null, [],
  ])("rejects invalid input before a data write: %j", (input) => {
    expect(() => taskCompletionWrite(input, true)).toThrow(InvalidTaskInputError);
  });

  it("accepts all existing application statuses and valid rich HTML", () => {
    for (const status of ["todo", "in_progress", "waiting", "done", "wont_do"]) {
      expect(taskCompletionWrite({ status })).toEqual({ status, completed: status === "done" });
    }
    expect(() => validateTaskInput({ description: '<p><strong>متن</strong><img src="https://example.test/image.png"></p>', folder_id: null })).not.toThrow();
  });
});
