import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  stored: new Map<string, any>(), commit: vi.fn(), authenticate: vi.fn(),
}));

vi.mock("./_lib/assistantAccess.js", () => ({
  authenticateAssistant: mocks.authenticate,
  adminDb: () => ({
    collection: (path: string) => ({ doc: (id = "audit") => ({
      path: `${path}/${id}`,
      get: async () => ({ exists: mocks.stored.has(`${path}/${id}`), data: () => mocks.stored.get(`${path}/${id}`) }),
    }) }),
    batch: () => {
      const writes: Array<() => void> = [];
      return {
        create: (ref: { path: string }, data: any) => writes.push(() => mocks.stored.set(ref.path, data)),
        update: (ref: { path: string }, data: any) => writes.push(() => mocks.stored.set(ref.path, { ...mocks.stored.get(ref.path), ...data })),
        commit: async () => { await mocks.commit(); writes.forEach((write) => write()); },
      };
    },
  }),
}));

import collectionHandler from "./assistant/tasks/index";
import detailHandler from "./assistant/tasks/[id]";

function response() {
  const res = { statusCode: 0, body: null as any, setHeader: vi.fn(), end: (raw: string) => { res.body = JSON.parse(raw); } };
  return res;
}

beforeEach(() => {
  mocks.stored.clear();
  mocks.commit.mockReset().mockResolvedValue(undefined);
  mocks.authenticate.mockReset().mockResolvedValue({ id: "grant", userId: "owner" });
});

describe("assistant task state route validation", () => {
  it("creates a completed task for status-only done", async () => {
    const res = response();
    await collectionHandler({ method: "POST", body: { title: "Finished", status: "done" } }, res);
    expect(res.statusCode).toBe(201);
    expect(res.body.data).toMatchObject({ status: "done", completed: true, user_id: "owner" });
    expect(mocks.commit).toHaveBeenCalledTimes(1);
  });

  it.each([{ completed: "false" }, { completed: false, status: "done" }, { status: "surprise" }])("rejects invalid creation %j without a commit", async (invalid) => {
    const res = response();
    await collectionHandler({ method: "POST", body: { title: "Invalid", ...invalid } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("returns an input error and leaves the saved task intact for disagreeing PATCH", async () => {
    const task = { id: "task-one", title: "Original", completed: false, status: "todo" };
    mocks.stored.set("users/owner/tasks/task-one", task);
    const res = response();
    await detailHandler({ method: "PATCH", query: { id: "task-one" }, body: { completed: true, status: "todo" } }, res);
    expect(res.statusCode).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(mocks.stored.get("users/owner/tasks/task-one")).toBe(task);
    expect(mocks.commit).not.toHaveBeenCalled();
  });

  it("updates status-only done to a consistent task", async () => {
    mocks.stored.set("users/owner/tasks/task-one", { id: "task-one", title: "Original", completed: false, status: "todo" });
    const res = response();
    await detailHandler({ method: "PATCH", query: { id: "task-one" }, body: { status: "done" } }, res);
    expect(res.statusCode).toBe(200);
    expect(mocks.stored.get("users/owner/tasks/task-one")).toMatchObject({ completed: true, status: "done" });
  });

  it("persists and clears deadline_date without changing the schedule", async () => {
    const create = response();
    await collectionHandler({ method: "POST", body: { title: "Deadline task", work_date: "2026-10-08", deadline_date: "2026-10-31" } }, create);
    expect(create.statusCode).toBe(201);
    expect(create.body.data).toMatchObject({ user_id: "owner", work_date: "2026-10-08", deadline_date: "2026-10-31" });

    mocks.stored.set("users/owner/tasks/task-one", { id: "task-one", title: "Original", work_date: "2026-10-05", schedule_v: 2, deadline_date: "2026-10-31" });
    const update = response();
    await detailHandler({ method: "PATCH", query: { id: "task-one" }, body: { deadline_date: null } }, update);
    expect(update.statusCode).toBe(200);
    expect(update.body.data).toMatchObject({ work_date: "2026-10-05", schedule_v: 2, deadline_date: null });

    const invalid = response();
    await detailHandler({ method: "PATCH", query: { id: "task-one" }, body: { deadline_date: "2026-02-30" } }, invalid);
    expect(invalid.statusCode).toBe(400);
    expect(mocks.stored.get("users/owner/tasks/task-one")).toMatchObject({ work_date: "2026-10-05", deadline_date: null });
  });
});
