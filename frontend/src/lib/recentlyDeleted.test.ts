import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TaskCascadeRecovery } from "@/features/tasks/taskService";

const mocks = vi.hoisted(() => ({ auth: { currentUser: { uid: "owner" } as { uid: string } | null }, persist: vi.fn(), insert: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: mocks.persist }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ insert: mocks.insert }) } }));

const bundle = {
  tasks: [{ id: "task", user_id: "owner", title: "Task" }],
  tagLinks: [{ id: "tag-link", user_id: "owner", task_id: "task", tag_id: "tag", custom: "keep" }],
  knowledgeLinks: [{ id: "knowledge-link", user_id: "owner", task_id: "task", knowledge_id: "knowledge", relation_type: "reference" }],
  noteTaskLinks: [{ id: "note-link", user_id: "owner", task_id: "task", note_id: "note", created_at: "date" }],
} as unknown as TaskCascadeRecovery;

describe("owner-scoped device task recovery", () => {
  beforeEach(() => {
    vi.restoreAllMocks(); vi.resetModules(); localStorage.clear();
    mocks.auth.currentUser = { uid: "owner" };
    mocks.persist.mockReset().mockResolvedValue("saved");
    mocks.insert.mockReset().mockResolvedValue({ error: null });
  });
  it("survives module reload without serializing closures and restores every relation field", async () => {
    const tray = await import("./recentlyDeleted");
    expect(tray.pushDeletedTask("owner", "Task", bundle)).toBe(true);
    const id = tray.listDeleted()[0].id;
    const stored = localStorage.getItem("arshnaz:recently-deleted:tasks:v1:owner")!;
    expect(stored).not.toContain("restore");
    vi.resetModules();
    const reloaded = await import("./recentlyDeleted");
    expect(reloaded.listDeleted()[0].recoveryMode).toBe("device");
    expect(await reloaded.restoreDeleted(id)).toBe(true);
    expect(mocks.persist).toHaveBeenCalledWith("owner", bundle.tasks[0]);
    for (const rows of [bundle.tagLinks, bundle.knowledgeLinks, bundle.noteTaskLinks]) expect(mocks.insert).toHaveBeenCalledWith(rows);
    expect(reloaded.listDeleted()).toEqual([]);
  });
  it("does not expose, clear or restore another owner's bundle", async () => {
    const tray = await import("./recentlyDeleted");
    tray.pushDeletedTask("owner", "Task", bundle);
    const id = tray.listDeleted()[0].id;
    mocks.auth.currentUser = { uid: "other" };
    expect(tray.listDeleted()).toEqual([]);
    expect(await tray.restoreDeleted(id)).toBe(false);
    tray.clearDeleted();
    mocks.auth.currentUser = { uid: "owner" };
    expect(tray.listDeleted()).toHaveLength(1);
    expect(mocks.persist).not.toHaveBeenCalled();
  });
  it("retains a bundle when relation restoration fails so it can be retried", async () => {
    const tray = await import("./recentlyDeleted");
    tray.pushDeletedTask("owner", "Task", bundle);
    const id = tray.listDeleted()[0].id;
    mocks.insert.mockResolvedValueOnce({ error: new Error("permission denied") });
    await expect(tray.restoreDeleted(id)).rejects.toThrow("item was kept");
    expect(tray.listDeleted()).toHaveLength(1);
    expect(await tray.restoreDeleted(id)).toBe(true);
  });
  it("reports session-only fallback when device storage is unavailable", async () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    const tray = await import("./recentlyDeleted");
    expect(tray.pushDeletedTask("owner", "Task", bundle)).toBe(false);
    expect(tray.listDeleted()[0].recoveryMode).toBe("session");
    vi.resetModules();
    expect((await import("./recentlyDeleted")).listDeleted()).toEqual([]);
  });
  it("expires device bundles at the documented ten-minute boundary", async () => {
    const now = Date.now();
    const time = vi.spyOn(Date, "now").mockReturnValue(now);
    const tray = await import("./recentlyDeleted");
    tray.pushDeletedTask("owner", "Task", bundle);
    time.mockReturnValue(now + 10 * 60 * 1000 + 1);
    expect(tray.listDeleted()).toEqual([]);
  });
  it.each(["owner", "owner:% exotic_نام"])("supports account-data cleanup for UID %s without clearing another account", async (uid) => {
    mocks.auth.currentUser = { uid };
    const tray = await import("./recentlyDeleted");
    expect(tray.pushDeletedTask(uid, "Task", bundle)).toBe(true);
    localStorage.setItem("arshnaz:recently-deleted:tasks:v1:other", JSON.stringify([{ ownerId: "other" }]));
    const { clearUserLocalData } = await import("./offlineQueue");
    expect(await clearUserLocalData(uid)).toBe(true);
    expect(localStorage.getItem(`arshnaz:recently-deleted:tasks:v1:${uid}`)).toBeNull();
    expect(localStorage.getItem("arshnaz:recently-deleted:tasks:v1:other")).not.toBeNull();
  });
});
