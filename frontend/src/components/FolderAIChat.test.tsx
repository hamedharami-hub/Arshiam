import { describe, expect, it } from "vitest";
import { buildFolderTaskContext, parseFolderTaskProposals } from "./FolderAIChat";
import { parseNaturalDate } from "@/lib/nlDate";

const OWNER = "owner-a";
const FOLDER = "folder-a";

describe("FolderAIChat bounded context and proposal validation", () => {
  it("includes only open task summaries owned by the selected folder and caps context at 40", () => {
    const rows = Array.from({ length: 41 }, (_, index) => ({
      id: `task-${index}`,
      user_id: OWNER,
      folder_id: FOLDER,
      title: `Task ${index}`,
      priority: "medium",
      status: "todo",
      completed: false,
    }));
    rows.push(
      { id: "foreign", user_id: "owner-b", folder_id: FOLDER, title: "Foreign task", priority: "high", status: "todo", completed: false },
      { id: "other-folder", user_id: OWNER, folder_id: "folder-b", title: "Other folder task", priority: "high", status: "todo", completed: false },
      { id: "done", user_id: OWNER, folder_id: FOLDER, title: "Done task", priority: "none", status: "done", completed: true },
    );

    const context = buildFolderTaskContext(rows, OWNER, FOLDER);

    expect(context.tasks).toHaveLength(40);
    expect(context.taskCount).toBe(41);
    expect(context.truncated).toBe(true);
    expect(context.tasks.some((task) => task.title.includes("Foreign") || task.title.includes("Other folder") || task.title.includes("Done"))).toBe(false);
  });

  it("keeps time-only AI due dates unset and accepts only a user-stated day", () => {
    const timeOnly = parseFolderTaskProposals({
      summary: "One task",
      tasks: [{ title: "Prepare the meeting", priority: "medium", due_date: "2026-10-09" }],
    }, ["Prepare for the meeting at 5pm"]);
    expect(timeOnly?.tasks[0].due_date).toBeUndefined();

    const tomorrow = parseNaturalDate("tomorrow").dueDate!;
    const explicit = parseFolderTaskProposals({
      summary: "One task",
      tasks: [{ title: "Prepare the meeting", priority: "medium", due_date: tomorrow }],
    }, ["Prepare for the meeting tomorrow"]);
    expect(explicit?.tasks[0].due_date).toBeDefined();
  });

  it("rejects responses that do not match the proposal schema", () => {
    expect(parseFolderTaskProposals({ tasks: [{ title: "Missing summary" }] }, ["Do work"])).toBeNull();
    expect(parseFolderTaskProposals({ summary: "No valid rows", tasks: [{ priority: "high" }] }, ["Do work"])).toBeNull();
  });
});
