import { afterEach, describe, expect, it, vi } from "vitest";
import { createDebouncedWrites, noteDraftKey, readNoteDraft, writeNoteDraft } from "./debouncedWrites";
const storage = vi.hoisted(() => ({ db: new Map<string, unknown>(), corruptTitle: false }));
vi.mock("@/lib/offlineDb", () => ({ CACHE_STORE: "cache", getDB: async () => ({
  put: async (_store: string, value: Record<string, unknown>, key: string) => storage.db.set(key, storage.corruptTitle ? { ...value, title: "Wrong title" } : value),
  get: async (_store: string, key: string) => storage.db.get(key),
}) }));
describe("note autosave navigation", () => {
  afterEach(() => vi.useRealTimers());
  it("flushes the last edit of each note even when switching before the debounce expires", async () => {
    vi.useFakeTimers(); const queue = createDebouncedWrites(); const save = vi.fn().mockResolvedValue(true);
    queue.schedule("a", () => save("a", "old")); queue.schedule("a", () => save("a", "latest"));
    const leaving = queue.flush("a"); queue.schedule("b", () => save("b", "different note"));
    await leaving; expect(save).toHaveBeenCalledExactlyOnceWith("a", "latest");
    await queue.flushAll(); expect(save).toHaveBeenLastCalledWith("b", "different note");
  });
  it("serializes a newer edit behind an in-flight write", async () => {
    vi.useFakeTimers(); const queue = createDebouncedWrites(); const events: string[] = [];
    let finish!: () => void;
    queue.schedule("a", () => new Promise<void>(resolve => { events.push("first"); finish = resolve; }));
    const first = queue.flush("a"); await Promise.resolve(); await Promise.resolve();
    queue.schedule("a", async () => { events.push("second"); }); const second = queue.flush("a");
    expect(events).toEqual(["first"]); finish(); await first; await second;
    expect(events).toEqual(["first", "second"]);
  });
  it("cancels an unsaved pending edit before deleting its record", async () => {
    vi.useFakeTimers(); const queue = createDebouncedWrites(); const save = vi.fn();
    queue.schedule("a", save); queue.cancel("a"); await vi.runAllTimersAsync();
    expect(save).not.toHaveBeenCalled();
  });
  it("retains false and rejected jobs for an explicit retry", async () => {
    vi.useFakeTimers(); const queue = createDebouncedWrites();
    const save = vi.fn().mockResolvedValueOnce(false).mockRejectedValueOnce(new Error("offline")).mockResolvedValue(true);
    queue.schedule("a", save);
    expect(await queue.flush("a")).toBe(false);
    await expect(queue.flush("a")).rejects.toThrow("offline");
    expect(await queue.flush("a")).toBe(true);
    await queue.flush("a");
    expect(save).toHaveBeenCalledTimes(3);
  });
  it("does not resurrect an old failed job over a newer edit or after cancellation", async () => {
    vi.useFakeTimers(); const queue = createDebouncedWrites();
    let fail!: (saved: boolean) => void;
    const old = vi.fn(() => new Promise<boolean>(resolve => { fail = resolve; }));
    const latest = vi.fn().mockResolvedValue(true);
    queue.schedule("a", old); const first = queue.flush("a");
    await Promise.resolve(); await Promise.resolve();
    queue.schedule("a", latest); fail(false); await first;
    await queue.flushAll(); expect(latest).toHaveBeenCalledOnce();
    queue.schedule("a", old); const cancelled = queue.flush("a");
    await Promise.resolve(); await Promise.resolve();
    queue.cancel("a"); fail(false); await cancelled; await queue.flushAll();
    expect(old).toHaveBeenCalledTimes(2);
  });
});

describe("account/note title and body retention", () => {
  afterEach(() => { storage.db.clear(); storage.corruptTitle = false; localStorage.clear(); vi.restoreAllMocks(); });
  const record = { accountId: "u", noteId: "n", title: "Edited title", md: "Edited body", html: "<p>Edited body</p>", updatedAt: 12, revision: 4, base: { title: "Old", md: "Original", updatedAt: "2026-01-01" } };
  it("round-trips the whole verified draft, not just its body", async () => {
    expect(await writeNoteDraft(record)).toBe(true);
    expect(await readNoteDraft("u", "n")).toEqual(record);
    expect(await readNoteDraft("other", "n")).toBeNull();
  });
  it("does not call a body-only read-back a durable title acknowledgement", async () => {
    storage.corruptTitle = true;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(await writeNoteDraft(record)).toBe(false);
  });
  it("rejects a mismatched owner/document inside a stored draft", async () => {
    storage.db.set(noteDraftKey("u", "n"), { ...record, accountId: "other" });
    expect(await readNoteDraft("u", "n")).toBeNull();
  });
});
