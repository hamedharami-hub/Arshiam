import { beforeEach, expect, it, vi } from "vitest";
import type { Task } from "@/lib/taskTypes";
const mocks = vi.hoisted(() => ({ get: vi.fn(), set: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  doc: (_db: unknown, ...path: string[]) => path.join("/"),
  runTransaction: mocks.transaction,
}));
import { createMindTaskOnce } from "./createTaskOnce";
const task = { id: "stable", user_id: "a", title: "Step", completed: false, status: "todo", due_date: null } as Task;
beforeEach(() => {
  mocks.get.mockReset().mockResolvedValue({ exists: () => false });
  mocks.set.mockReset();
  mocks.transaction.mockReset().mockImplementation((_db, callback) => callback({ get: mocks.get, set: mocks.set }));
});
it("writes only a verified absent owner-scoped document inside the transaction", async () => {
  expect((await createMindTaskOnce("a", task)).ok).toBe(true);
  expect(mocks.get).toHaveBeenCalledWith("users/a/tasks/stable");
  expect(mocks.set).toHaveBeenCalledWith("users/a/tasks/stable", expect.objectContaining({ user_id: "a", created_at: expect.any(String) }));
});
it("preserves an existing completed task, including its edited title and due date", async () => {
  const existing = { ...task, completed: true, status: "done", title: "Edited", due_date: "2026-12-01" };
  mocks.get.mockResolvedValue({ exists: () => true, id: "stable", data: () => existing });
  expect(await createMindTaskOnce("a", task)).toEqual({ ok: true, task: existing });
  expect(mocks.set).not.toHaveBeenCalled();
});
it("a transaction replay after a remote create does not overwrite the destination", async () => {
  const existing = { ...task, completed: true, title: "Remote" };
  mocks.transaction.mockImplementation(async (_db, callback) => {
    await callback({ get: mocks.get, set: vi.fn() }); // aborted optimistic attempt
    mocks.get.mockResolvedValue({ exists: () => true, id: "stable", data: () => existing });
    return callback({ get: mocks.get, set: mocks.set });
  });
  expect(await createMindTaskOnce("a", task)).toEqual({ ok: true, task: existing });
  expect(mocks.set).not.toHaveBeenCalled();
});
it("read/transaction failure never falls back to an unverified upsert", async () => {
  mocks.get.mockRejectedValue(new Error("offline"));
  expect((await createMindTaskOnce("a", task)).ok).toBe(false);
  expect(mocks.set).not.toHaveBeenCalled();
});
it("rejects a mismatched owner in an existing row", async () => {
  mocks.get.mockResolvedValue({ exists: () => true, data: () => ({ ...task, user_id: "b" }) });
  expect((await createMindTaskOnce("a", task)).ok).toBe(false);
  expect(mocks.set).not.toHaveBeenCalled();
});
