import { afterEach, describe, expect, it, vi } from "vitest";
import { createDebouncedWrites } from "./debouncedWrites";
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
});
