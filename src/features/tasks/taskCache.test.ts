import { describe, expect, it } from "vitest";
import {
  TASK_CACHE_TTL_MS,
  createTaskCacheEnvelope,
  isTaskCacheFresh,
  readTaskCacheEnvelope,
} from "./taskCache";

const now = 1_700_000_000_000;

describe("task cache", () => {
  it("creates a versioned cache envelope", () => {
    const tasks = [{ id: "t1" }] as never[];
    expect(createTaskCacheEnvelope(tasks, now)).toEqual({ tasks, cachedAt: now });
  });

  it("accepts fresh envelopes and rejects expired envelopes", () => {
    const fresh = readTaskCacheEnvelope({ tasks: [], cachedAt: now }, now + TASK_CACHE_TTL_MS);
    const stale = readTaskCacheEnvelope({ tasks: [], cachedAt: now }, now + TASK_CACHE_TTL_MS + 1);
    expect(fresh?.fresh).toBe(true);
    expect(stale?.fresh).toBe(false);
  });

  it("supports legacy array cache values during migration", () => {
    const result = readTaskCacheEnvelope([{ id: "legacy" }], now);
    expect(result?.tasks).toEqual([{ id: "legacy" }]);
    expect(result?.fresh).toBe(false);
  });

  it("rejects invalid cache values and future timestamps", () => {
    expect(readTaskCacheEnvelope(null, now)).toBeNull();
    expect(readTaskCacheEnvelope({ tasks: "bad", cachedAt: now }, now)).toBeNull();
    expect(isTaskCacheFresh(now + 1, now)).toBe(false);
  });
});
