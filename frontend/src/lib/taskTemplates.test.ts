import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildTaskFromTemplate, buildWorkflowTasksFromTemplate, createTaskFromTemplate, deleteTaskTemplate, listTaskTemplates, saveTaskTemplate } from "./taskTemplates";

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: mocks.from } }));

function resultQuery(result: { data?: unknown; error?: Error | null }) {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    order: vi.fn(() => query),
    delete: vi.fn(() => query),
    then: (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => Promise.resolve({ data: result.data ?? null, error: result.error ?? null }).then(resolve, reject),
  };
  return query;
}

describe("task templates", () => {
  beforeEach(() => mocks.from.mockReset());

  it("freezes only an explicitly chosen relative date and strips source-task identity fields", () => {
    const reference = new Date("2026-10-07T09:30:00.000Z");
    const template = {
      id: "template-1",
      user_id: "user-1",
      title: "Prepare report",
      description: "**Preserve formatting**",
      priority: "high",
      folder_id: "folder-1",
      due_offset_hours: 0,
      recurrence: "weekly",
      recurrence_rule: { freq: "weekly", interval: 2, byweekday: ["TU", "FR"], byhour: 10, byminute: 15 },
      tag_ids: ["tag-1", "tag-1", ""],
      payload: { parent_id: "parent-task", is_avoidance: true, location: "Office", completed: true },
      completed: true,
      status: "done",
      completed_at: "2026-01-01T00:00:00.000Z",
    } as any;

    const built = buildTaskFromTemplate(template, reference);

    expect(built).toEqual({
      title: "Prepare report",
      description: "**Preserve formatting**",
      priority: "high",
      folder_id: "folder-1",
      work_date: reference.toISOString(),
      recurrence: "weekly",
      recurrence_rule: { freq: "weekly", interval: 2, byweekday: ["TU", "FR"], byhour: 10, byminute: 15 },
      is_avoidance: true,
      location: "Office",
      tag_ids: ["tag-1"],
    });
    expect(built).not.toHaveProperty("id");
    expect(built).not.toHaveProperty("user_id");
    expect(built).not.toHaveProperty("parent_id");
    expect(built).not.toHaveProperty("completed");
    expect(built).not.toHaveProperty("status");
    expect(built).not.toHaveProperty("completed_at");
  });

  it("does not add any schedule when no relative offset was selected", () => {
    const built = buildTaskFromTemplate({ id: "template-2", title: "Read", priority: "none", due_offset_hours: null } as any, new Date("2026-10-07T09:30:00.000Z"));
    expect(built).not.toHaveProperty("work_date");
  });

  it("calculates a selected nonzero offset once from the use-time preview", () => {
    const reference = new Date("2026-10-07T09:30:00.000Z");
    const built = buildTaskFromTemplate({ id: "template-3", title: "Send report", priority: "none", due_offset_hours: 24 } as any, reference);
    expect(built.work_date).toBe("2026-10-08T09:30:00.000Z");
    reference.setDate(reference.getDate() + 1);
    expect(built.work_date).toBe("2026-10-08T09:30:00.000Z");
  });

  it("saves a whitelist with a stable id and persists zero and nonzero offsets distinctly", async () => {
    const savedRow = {
      id: "stable-template-id", user_id: "user-1", title: "Prepare", priority: "medium", folder_id: null,
      due_offset_hours: 0, recurrence: "none", recurrence_rule: null, tag_ids: ["tag-2"],
      payload: { is_avoidance: true },
    };
    const mutation = { select: vi.fn(() => mutation), single: vi.fn().mockResolvedValue({ data: savedRow, error: null }) };
    const query = { upsert: vi.fn((_row: unknown, _options: unknown) => mutation) };
    mocks.from.mockReturnValue(query);

    await saveTaskTemplate("user-1", {
      title: "Draft title", priority: "medium", folder_id: null,
      recurrence: "none", is_avoidance: true,
    } as any, { title: "Prepare", dueOffsetHours: 0, tagIds: ["tag-2"], id: "stable-template-id" });

    expect(mocks.from).toHaveBeenCalledWith("task_templates", "user-1");
    expect(query.upsert).toHaveBeenCalledWith(expect.objectContaining({
      id: "stable-template-id", user_id: "user-1", title: "Prepare", due_offset_hours: 0,
      recurrence: "none", tag_ids: ["tag-2"], payload: { is_avoidance: true },
    }), { onConflict: "id" });
    const row = query.upsert.mock.calls[0][0];
    expect(row).not.toHaveProperty("parent_id");
    expect(row).not.toHaveProperty("completed");
    expect(row).not.toHaveProperty("status");
    expect(row).not.toHaveProperty("work_date");
  });

  it("round-trips workflow items while dropping sample identity and state fields", async () => {
    const savedRow = {
      id: "workflow-template-1", user_id: "user-1", title: "Prepare event", priority: "none", folder_id: null,
      due_offset_hours: null, recurrence: "none", recurrence_rule: null, tag_ids: [],
      payload: { workflow_tasks: [
        { id: "definition-1", title: "Book room", priority: "high", folder_id: "folder-1", description: "Call the venue", parent_id: "sample-parent", status: "done", completed: true },
        { id: "definition-2", title: "Send invitations", priority: "medium", folder_id: null, user_id: "foreign-user", task_id: "sample-task" },
      ] },
    };
    const mutation = { select: vi.fn(() => mutation), single: vi.fn().mockResolvedValue({ data: savedRow, error: null }) };
    const query = { upsert: vi.fn((_row: unknown, _options: unknown) => mutation) };
    mocks.from.mockReturnValue(query);

    const saved = await saveTaskTemplate("user-1", { title: "Prepare event", priority: "none" }, {
      id: "workflow-template-1",
      workflowTasks: [
        { id: "definition-1", title: "Book room", priority: "high", folder_id: "folder-1", description: "Call the venue", parent_id: "sample-parent", status: "done" } as any,
        { id: "definition-2", title: "Send invitations", priority: "medium", folder_id: null, user_id: "foreign-user", task_id: "sample-task" } as any,
      ],
    });

    const persisted = query.upsert.mock.calls[0][0] as any;
    expect(persisted.payload.workflow_tasks).toEqual([
      { id: "definition-1", title: "Book room", priority: "high", folder_id: "folder-1", description: "Call the venue" },
      { id: "definition-2", title: "Send invitations", priority: "medium", folder_id: null },
    ]);
    expect(persisted).not.toHaveProperty("work_date");
    expect(saved?.payload?.workflow_tasks).toEqual(persisted.payload.workflow_tasks);
    expect(buildWorkflowTasksFromTemplate(saved as any)).toEqual(persisted.payload.workflow_tasks);
  });

  it("scopes listing to the active owner and drops records with a different owner", async () => {
    const query = resultQuery({ data: [
      { id: "mine", user_id: "user-1", title: "Mine", priority: "urgent", recurrence: "daily" },
      { id: "other", user_id: "user-2", title: "Other", priority: "high" },
    ] });
    mocks.from.mockReturnValue(query);

    const templates = await listTaskTemplates("user-1");

    expect(mocks.from).toHaveBeenCalledWith("task_templates", "user-1");
    expect(query.eq).toHaveBeenCalledWith("user_id", "user-1");
    expect(templates).toHaveLength(1);
    expect(templates[0].title).toBe("Mine");
    expect(templates[0].recurrence_rule).toEqual({ freq: "daily", interval: 1 });
  });

  it("deletes only from the supplied owner's template collection", async () => {
    const query = resultQuery({ data: [] });
    mocks.from.mockReturnValue(query);

    await deleteTaskTemplate("user-1", "template-1");

    expect(mocks.from).toHaveBeenCalledWith("task_templates", "user-1");
    expect(query.delete).toHaveBeenCalled();
    expect(query.eq).toHaveBeenNthCalledWith(1, "id", "template-1");
    expect(query.eq).toHaveBeenNthCalledWith(2, "user_id", "user-1");
  });

  it("creates from a template with a retryable id and rejects copied task identity fields", async () => {
    const savedTask = { id: "stable-task-id", user_id: "user-1", title: "New task", status: "todo", completed: false };
    const mutation = { select: vi.fn(() => mutation), single: vi.fn().mockResolvedValue({ data: savedTask, error: null }) };
    const query = { upsert: vi.fn((_row: unknown, _options: unknown) => mutation) };
    mocks.from.mockReturnValue(query);

    await createTaskFromTemplate("user-1", {
      id: "template-1", title: "New task", priority: "high", payload: { parent_id: "sample-parent" },
    } as any, {
      id: "sample-task-id", user_id: "foreign-user", parent_id: "sample-parent", status: "done",
      completed: true, completed_at: "2026-01-01T00:00:00Z", title: "New task",
    } as any, "stable-task-id");

    expect(mocks.from).toHaveBeenCalledWith("tasks", "user-1");
    const [rawRow, options] = query.upsert.mock.calls[0];
    const row = rawRow as Record<string, unknown>;
    expect(options).toEqual({ onConflict: "id" });
    expect(row).toEqual(expect.objectContaining({
      id: "stable-task-id", user_id: "user-1", title: "New task", parent_id: null,
      status: "todo", completed: false, completed_at: null,
    }));
    expect(row).not.toHaveProperty("sample-parent");
    expect(row).not.toHaveProperty("sample-task-id");
    expect(row.user_id).not.toBe("foreign-user");
  });
});
