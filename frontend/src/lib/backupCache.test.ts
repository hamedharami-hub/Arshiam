import { beforeEach, describe, expect, it, vi } from "vitest";
import { readBackupNotes, readBackupTasks } from "./backupCache";

const cache = vi.hoisted(() => new Map<string, any>());
vi.mock("./offlineQueue", () => ({ cacheGet: async (key: string) => cache.get(key) }));
beforeEach(() => { cache.clear(); localStorage.clear(); });

describe("backup cache ownership", () => {
  it("requires explicit user_id for legacy task arrays and envelopes", async () => {
    const tasks = [{ id: "foreign", user_id: "b" }, { id: "unknown" }, { id: "owned", user_id: "a" }];
    cache.set("tasks", tasks);
    expect((await readBackupTasks("a")).map(row => row.id)).toEqual(["owned"]);
    cache.set("tasks", { tasks, cachedAt: 0 });
    expect((await readBackupTasks("a")).map(row => row.id)).toEqual(["owned"]);
  });

  it("preserves scoped ownerless rows but rejects explicitly foreign rows and respects empty scoped caches", async () => {
    cache.set("tasks", [{ id: "legacy", user_id: "a" }]);
    cache.set("tasks:all:a", { tasks: [{ id: "scoped" }, { id: "foreign", user_id: "b" }] });
    expect((await readBackupTasks("a")).map(row => row.id)).toEqual(["scoped"]);
    cache.set("tasks:all:a", []);
    expect(await readBackupTasks("a")).toEqual([]);
    cache.set("notes:all:a", [{ id: "scoped" }, { id: "foreign", user_id: "b" }]);
    expect(await readBackupNotes("a")).toEqual([{ id: "scoped" }]);
  });

  it("reads both legacy note keys safely, including malformed data, without rewriting shared storage", async () => {
    localStorage.setItem("arshnaz_notes", "not-json");
    localStorage.setItem("notes", JSON.stringify([{ id: "foreign", user_id: "b" }, { id: "unknown" }, { id: "owned", user_id: "a" }]));
    expect(await readBackupNotes("a")).toEqual([{ id: "owned", user_id: "a" }]);
    expect(localStorage.getItem("arshnaz_notes")).toBe("not-json");
    cache.set("notes:all:a", []);
    expect(await readBackupNotes("a")).toEqual([]);
  });
});
