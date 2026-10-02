import { describe, it, expect, vi, beforeEach } from "vitest";
import { duplicateTaskCascade } from "./taskDuplicateService";
import type { Task } from "./taskTypes";

const mockUpsertTask = vi.fn();
const mockGetCachedTasks = vi.fn();
const mockGetTaskNotes = vi.fn();
const mockCreateTaskNote = vi.fn();
const mockListAttachments = vi.fn();
const mockListQueued = vi.fn();
const mockEnqueueAttachment = vi.fn();
const mockPersistTaskTagChange = vi.fn();
const mockGetTaskKnowledgeLinks = vi.fn();
const mockLinkTaskKnowledge = vi.fn();
const mockLogTaskActivity = vi.fn();

const mockFrom = vi.fn();

vi.mock("./firestoreDataService", () => ({
  upsertTask: (...args: any[]) => mockUpsertTask(...args),
}));

vi.mock("@/features/tasks/taskService", () => ({
  getCachedTasks: (...args: any[]) => mockGetCachedTasks(...args),
}));

vi.mock("./taskNotesService", () => ({
  getTaskNotes: (...args: any[]) => mockGetTaskNotes(...args),
  createTaskNote: (...args: any[]) => mockCreateTaskNote(...args),
}));

vi.mock("./attachmentUpload", () => ({
  listAttachments: (...args: any[]) => mockListAttachments(...args),
  listQueued: (...args: any[]) => mockListQueued(...args),
  enqueueAttachment: (...args: any[]) => mockEnqueueAttachment(...args),
}));

vi.mock("./taskTagService", () => ({
  persistTaskTagChange: (...args: any[]) => mockPersistTaskTagChange(...args),
}));

vi.mock("./taskKnowledgeService", () => ({
  getTaskKnowledgeLinks: (...args: any[]) => mockGetTaskKnowledgeLinks(...args),
  linkTaskKnowledge: (...args: any[]) => mockLinkTaskKnowledge(...args),
}));

vi.mock("./taskActivity", () => ({
  logTaskActivity: (...args: any[]) => mockLogTaskActivity(...args),
}));

vi.mock("./firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => mockFrom(table),
  },
}));

describe("taskDuplicateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpsertTask.mockResolvedValue(true);
    mockGetCachedTasks.mockResolvedValue([]);
    mockGetTaskNotes.mockResolvedValue([]);
    mockCreateTaskNote.mockResolvedValue({ id: "new-note-id" });
    mockListAttachments.mockResolvedValue([]);
    mockListQueued.mockResolvedValue([]);
    mockEnqueueAttachment.mockResolvedValue({});
    mockPersistTaskTagChange.mockResolvedValue("saved");
    mockGetTaskKnowledgeLinks.mockResolvedValue([]);
    mockLinkTaskKnowledge.mockResolvedValue({});
    mockLogTaskActivity.mockResolvedValue(undefined);

    mockFrom.mockImplementation(() => {
      const createEqChain = (data: any[] = []): any => ({
        eq: vi.fn().mockImplementation(() => createEqChain(data)),
        then: (fn: any) => Promise.resolve({ data }).then(fn),
        data,
      });

      return {
        select: vi.fn().mockReturnValue(createEqChain([])),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });
  });

  it("duplicates root task with reset status and completed state", async () => {
    const originalTask: Task = {
      id: "orig-task-1",
      user_id: "user-1",
      title: "My Important Task",
      priority: "high",
      completed: true,
      status: "done",
      parent_id: null,
      created_at: "2026-09-01T00:00:00.000Z",
    };

    const res = await duplicateTaskCascade("user-1", originalTask, {
      newTitle: "My Important Task (کپی)",
    });

    expect(res.success).toBe(true);
    expect(res.newTaskId).toBeDefined();
    expect(res.newTaskId).not.toBe(originalTask.id);

    expect(mockUpsertTask).toHaveBeenCalledWith(
      "user-1",
      expect.objectContaining({
        id: res.newTaskId,
        title: "My Important Task (کپی)",
        completed: false,
        status: "todo",
        priority: "high",
        parent_id: null,
      })
    );
  });

  it("recursively duplicates subtasks maintaining hierarchical relationships", async () => {
    const parentTask: Task = {
      id: "parent-1",
      user_id: "user-1",
      title: "Main Project",
      priority: "medium",
      completed: true,
      status: "done",
      parent_id: null,
    };

    const subtask1: Task = {
      id: "sub-1",
      user_id: "user-1",
      title: "Subtask 1",
      priority: "medium",
      completed: true,
      status: "done",
      parent_id: "parent-1",
    };

    const subtask2: Task = {
      id: "sub-2",
      user_id: "user-1",
      title: "Nested Subtask 2",
      priority: "low",
      completed: true,
      status: "done",
      parent_id: "sub-1",
    };

    mockGetCachedTasks.mockResolvedValue([parentTask, subtask1, subtask2]);

    const res = await duplicateTaskCascade("user-1", parentTask);
    expect(res.success).toBe(true);
    const newRootId = res.newTaskId;

    // Total tasks saved: root + 2 subtasks = 3
    expect(mockUpsertTask).toHaveBeenCalledTimes(3);

    // Call 1: new root
    expect(mockUpsertTask).toHaveBeenNthCalledWith(
      1,
      "user-1",
      expect.objectContaining({
        id: newRootId,
        parent_id: null,
      })
    );

    // Call 2: new subtask1 with parent_id = newRootId
    const subtask1Call = mockUpsertTask.mock.calls[1][1];
    expect(subtask1Call.title).toBe("Subtask 1");
    expect(subtask1Call.parent_id).toBe(newRootId);
    expect(subtask1Call.completed).toBe(false);

    // Call 3: new subtask2 with parent_id = subtask1Call.id
    const subtask2Call = mockUpsertTask.mock.calls[2][1];
    expect(subtask2Call.title).toBe("Nested Subtask 2");
    expect(subtask2Call.parent_id).toBe(subtask1Call.id);
    expect(subtask2Call.completed).toBe(false);
  });

  it("duplicates task notes for the task and its subtasks", async () => {
    const task: Task = {
      id: "task-notes-1",
      user_id: "user-1",
      title: "Task With Notes",
      priority: "medium",
      completed: false,
      status: "todo",
    };

    mockGetTaskNotes.mockImplementation(async (taskId: string) => {
      if (taskId === "task-notes-1") {
        return [
          { id: "note-1", title: "Note One", content: "Details here" },
          { id: "note-2", title: "Note Two", content: "More info" },
        ];
      }
      return [];
    });

    const res = await duplicateTaskCascade("user-1", task);
    expect(res.success).toBe(true);

    expect(mockCreateTaskNote).toHaveBeenCalledTimes(2);
    expect(mockCreateTaskNote).toHaveBeenCalledWith("user-1", res.newTaskId, {
      title: "Note One",
      content: "Details here",
    });
    expect(mockCreateTaskNote).toHaveBeenCalledWith("user-1", res.newTaskId, {
      title: "Note Two",
      content: "More info",
    });
  });

  it("duplicates attachments (legacy, remote, and queued)", async () => {
    const task: Task = {
      id: "task-att-1",
      user_id: "user-1",
      title: "Task With Files",
      priority: "medium",
      completed: false,
      status: "todo",
    };

    const insertedAttachments: any[] = [];
    const createEqChain = (data: any[] = []): any => ({
      eq: vi.fn().mockImplementation(() => createEqChain(data)),
      then: (fn: any) => Promise.resolve({ data }).then(fn),
      data,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "task_attachments") {
        return {
          select: vi.fn().mockReturnValue(
            createEqChain([
              {
                id: "att-1",
                file_name: "document.pdf",
                mime_type: "application/pdf",
                kind: "pdf",
                size_bytes: 1024,
                url: "https://example.com/doc.pdf",
                storage_path: "path/to/doc.pdf",
              },
            ])
          ),
          insert: vi.fn().mockImplementation((payload) => {
            insertedAttachments.push(payload);
            return Promise.resolve({ error: null });
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue(createEqChain([])),
        insert: vi.fn().mockResolvedValue({ error: null }),
      };
    });

    mockListAttachments.mockResolvedValue([
      {
        id: "firebase:storage/photo.jpg",
        task_id: "task-att-1",
        file_name: "photo.jpg",
        mime_type: "image/jpeg",
        kind: "image",
        size_bytes: 2048,
        view_url: "https://storage.googleapis.com/photo.jpg",
        download_url: "https://storage.googleapis.com/photo.jpg",
      },
    ]);

    const fakeBlob = new Blob(["fake"]);
    mockListQueued.mockResolvedValue([
      {
        id: "q-1",
        taskId: "task-att-1",
        name: "offline.png",
        type: "image/png",
        size: 500,
        blob: fakeBlob,
      },
    ]);

    const res = await duplicateTaskCascade("user-1", task);
    expect(res.success).toBe(true);

    // Legacy attachment duplicated
    expect(insertedAttachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task_id: res.newTaskId,
          file_name: "document.pdf",
          url: "https://example.com/doc.pdf",
        }),
      ])
    );

    // Remote attachment duplicated into task_attachments
    expect(insertedAttachments).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          task_id: res.newTaskId,
          file_name: "photo.jpg",
          url: "https://storage.googleapis.com/photo.jpg",
        }),
      ])
    );

    // Queued attachment re-queued for the new task
    expect(mockEnqueueAttachment).toHaveBeenCalledWith(
      res.newTaskId,
      expect.objectContaining({ name: "offline.png" })
    );
  });
});
