import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
  runTransaction: vi.fn(),
  remoteDoc: null as Record<string, unknown> | null,
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  onSnapshot: mocks.onSnapshot,
  setDoc: mocks.setDoc,
  runTransaction: mocks.runTransaction,
}));
vi.mock("./firebase", () => ({ db: {} }));

import { bindCloudState } from "./cloudStateSync";

describe("bindCloudState initial cloud snapshot", () => {
  let emitSnapshot: ((snapshot: { metadata: { hasPendingWrites: boolean }; exists: () => boolean; data: () => unknown }) => void) | undefined;
  let unsubscribe: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    emitSnapshot = undefined;
    unsubscribe = vi.fn();
    mocks.onSnapshot.mockImplementation((_ref: unknown, onUpdate: typeof emitSnapshot) => {
      emitSnapshot = onUpdate;
      return unsubscribe;
    });
    mocks.setDoc.mockResolvedValue(undefined);
    mocks.remoteDoc = null;
    // Minimal transaction double: the version check reads the server copy and any
    // `set` is recorded through the same setDoc mock the tests assert on.
    mocks.runTransaction.mockImplementation(async (_db: unknown, update: (tx: any) => Promise<unknown>) => {
      const writes: Array<{ path: string; data: Record<string, unknown> }> = [];
      const result = await update({
        get: async () => ({ exists: () => mocks.remoteDoc !== null, data: () => mocks.remoteDoc }),
        set: (path: string, data: Record<string, unknown>) => { writes.push({ path, data }); },
      });
      for (const write of writes) await mocks.setDoc(write.path, write.data);
      return result;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps an explicit local edit when the caller rebases it before the first snapshot", async () => {
    let local: { updatedAt: number; data: unknown } | null = null;
    const apply = vi.fn((data: unknown, updatedAt: number) => { local = { data, updatedAt }; });
    const binding = bindCloudState("uid-a", "today_planning", {
      read: () => local,
      apply,
      reconcilePending: (remote, currentLocal) => ({
        updatedAt: Math.max(Date.now(), remote.updatedAt + 1),
        data: currentLocal.data,
      }),
    });

    const explicitLocal = { updatedAt: 5, data: { nextTaskId: "explicit-choice" } };
    local = explicitLocal;
    binding.push();
    emitSnapshot?.({
      metadata: { hasPendingWrites: false },
      exists: () => true,
      data: () => ({ updatedAt: 99, json: JSON.stringify({ nextTaskId: "old-cloud-choice" }) }),
    });

    expect(apply).toHaveBeenCalledWith(explicitLocal.data, expect.any(Number), explicitLocal);
    await vi.advanceTimersByTimeAsync(1200);
    expect(mocks.setDoc).toHaveBeenCalledWith("users/uid-a/app_state/today_planning", {
      updatedAt: expect.any(Number),
      json: JSON.stringify({ nextTaskId: "explicit-choice" }),
    });
    binding.stop();
  });

  it("preserves timestamp-based adoption for binders without a rebase policy", () => {
    const local = { updatedAt: 5, data: { source: "local" } };
    const apply = vi.fn();
    const binding = bindCloudState("uid-default", "garden", { read: () => local, apply });
    binding.push();
    emitSnapshot?.({
      metadata: { hasPendingWrites: false },
      exists: () => true,
      data: () => ({ updatedAt: 99, json: JSON.stringify({ source: "cloud" }) }),
    });
    expect(apply).toHaveBeenCalledWith({ source: "cloud" }, 99, local);
    binding.stop();
  });

  it("uses the caller's field-level rebase to keep unrelated cloud values", async () => {
    let local = { updatedAt: 5, data: { nextTaskId: null, wipEnabled: true } };
    const apply = vi.fn((data: unknown, updatedAt: number) => { local = { data: data as typeof local.data, updatedAt }; });
    const binding = bindCloudState("uid-c", "today_planning", {
      read: () => local,
      apply,
      reconcilePending: (remote, currentLocal) => ({
        updatedAt: Math.max(Date.now(), remote.updatedAt + 1),
        data: {
          ...(remote.data as { nextTaskId: string | null }),
          wipEnabled: (currentLocal.data as { wipEnabled: boolean }).wipEnabled,
        },
      }),
    });

    binding.push();
    emitSnapshot?.({
      metadata: { hasPendingWrites: false },
      exists: () => true,
      data: () => ({ updatedAt: 99, json: JSON.stringify({ nextTaskId: "cloud-next", wipEnabled: false }) }),
    });

    const merged = { nextTaskId: "cloud-next", wipEnabled: true };
    expect(apply).toHaveBeenCalledWith(merged, expect.any(Number), expect.objectContaining({ data: { nextTaskId: null, wipEnabled: true } }));
    await vi.advanceTimersByTimeAsync(1200);
    expect(mocks.setDoc).toHaveBeenCalledWith("users/uid-c/app_state/today_planning", {
      updatedAt: expect.any(Number),
      json: JSON.stringify(merged),
    });
    binding.stop();
  });

  it("adopts the initial remote snapshot when there is no local edit", () => {
    const apply = vi.fn();
    const binding = bindCloudState("uid-b", "today_planning", {
      read: () => null,
      apply,
    });

    emitSnapshot?.({
      metadata: { hasPendingWrites: false },
      exists: () => true,
      data: () => ({ updatedAt: 12, json: JSON.stringify({ nextTaskId: "cloud-choice" }) }),
    });

    expect(apply).toHaveBeenCalledWith({ nextTaskId: "cloud-choice" }, 12, null);
    binding.stop();
  });

  it("never overwrites a newer cloud copy: the upload adopts it instead", async () => {
    let local = { updatedAt: 5, data: { source: "local" } };
    const apply = vi.fn((data: unknown, updatedAt: number) => { local = { data: data as { source: string }, updatedAt }; });
    const binding = bindCloudState("uid-d", "garden", { read: () => local, apply });
    // The listener answers first (no cloud document yet), which makes push() schedule an upload.
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => false, data: () => undefined });
    // Another device wrote after this device's local copy (e.g. while it was offline).
    mocks.remoteDoc = { updatedAt: 99, json: JSON.stringify({ source: "cloud" }) };

    await vi.advanceTimersByTimeAsync(1200);

    expect(mocks.setDoc).not.toHaveBeenCalled();
    expect(apply).toHaveBeenCalledWith({ source: "cloud" }, 99, expect.objectContaining({ updatedAt: 5 }));
    binding.stop();
  });

  it("rebases pending local edits over a newer cloud copy before uploading", async () => {
    let local = { updatedAt: 5, data: { nextTaskId: null as string | null, wipEnabled: true } };
    const apply = vi.fn((data: unknown, updatedAt: number) => { local = { data: data as typeof local.data, updatedAt }; });
    const binding = bindCloudState("uid-e", "today_planning", {
      read: () => local,
      apply,
      reconcilePending: (remote, currentLocal) => ({
        updatedAt: remote.updatedAt + 1,
        data: {
          ...(remote.data as { nextTaskId: string | null }),
          wipEnabled: (currentLocal.data as { wipEnabled: boolean }).wipEnabled,
        },
      }),
    });
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => false, data: () => undefined });
    mocks.remoteDoc = { updatedAt: 99, json: JSON.stringify({ nextTaskId: "cloud-next", wipEnabled: false }) };

    await vi.advanceTimersByTimeAsync(1200);

    const merged = { nextTaskId: "cloud-next", wipEnabled: true };
    expect(mocks.setDoc).toHaveBeenCalledWith("users/uid-e/app_state/today_planning", {
      updatedAt: 100,
      json: JSON.stringify(merged),
    });
    expect(apply).toHaveBeenCalledWith(merged, 100, expect.objectContaining({ updatedAt: 5 }));
    binding.stop();
  });

  it("keeps an upload that could not reach the server pending and retries it", async () => {
    const local = { updatedAt: 5, data: { source: "local" } };
    const binding = bindCloudState("uid-f", "garden", { read: () => local, apply: vi.fn() });
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => false, data: () => undefined });
    mocks.runTransaction.mockRejectedValueOnce(new Error("client is offline"));

    await vi.advanceTimersByTimeAsync(1200);
    expect(mocks.setDoc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(4000);
    expect(mocks.runTransaction).toHaveBeenCalledTimes(2);
    expect(mocks.setDoc).toHaveBeenCalledTimes(1);
    binding.stop();
  });

  it.each([4, 5, 99])("merges independent additive snapshots without pending edits (remote time %s)", async remoteAt => {
    let local = { updatedAt: 5, data: ["local"] };
    const apply = vi.fn((data: unknown, updatedAt: number) => { local = { data: data as string[], updatedAt }; });
    const binding = bindCloudState("history-owner", "mini_apps_history_v1", {
      read: () => local, apply, reconcileAllRevisions: true,
      reconcilePending: (remote, current) => {
        const data = [...new Set([...(remote.data as string[]), ...(current.data as string[])])].sort();
        return JSON.stringify(data) === JSON.stringify(remote.data) ? null : { data, updatedAt: Math.max(remote.updatedAt, current.updatedAt) + 1 };
      },
    });
    mocks.remoteDoc = { updatedAt: remoteAt, json: JSON.stringify(["remote"]) };
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => true, data: () => mocks.remoteDoc });
    expect(local.data).toEqual(["local", "remote"]);
    expect(local.updatedAt).toBeGreaterThan(remoteAt);
    await vi.advanceTimersByTimeAsync(1200);
    expect(mocks.setDoc).toHaveBeenCalledWith("users/history-owner/app_state/mini_apps_history_v1", { updatedAt: expect.any(Number), json: JSON.stringify(["local", "remote"]) });
    binding.stop();
  });

  it.each([4, 5])("merges an additive revision discovered inside the transaction (remote time %s)", async remoteAt => {
    let local = { updatedAt: 5, data: ["local"] };
    const binding = bindCloudState("transaction-owner", "mini_apps_history_v1", {
      read: () => local,
      apply: (data, updatedAt) => { local = { data: data as string[], updatedAt }; },
      reconcileAllRevisions: true,
      reconcilePending: (remote, current) => ({ data: [...new Set([...(remote.data as string[]), ...(current.data as string[])])].sort(), updatedAt: Math.max(remote.updatedAt, current.updatedAt) + 1 }),
    });
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => false, data: () => undefined });
    mocks.remoteDoc = { updatedAt: remoteAt, json: JSON.stringify(["remote"]) };
    await vi.advanceTimersByTimeAsync(1200);
    expect(local.data).toEqual(["local", "remote"]);
    expect(mocks.setDoc).toHaveBeenCalledWith("users/transaction-owner/app_state/mini_apps_history_v1", { updatedAt: expect.any(Number), json: JSON.stringify(["local", "remote"]) });
    binding.stop();
  });

  it("does not change older-revision handling for field-level pending policies", async () => {
    const local = { updatedAt: 5, data: { source: "local" } };
    const policy = vi.fn(() => ({ data: { source: "rebased" }, updatedAt: 6 }));
    const binding = bindCloudState("default-owner", "today_planning", { read: () => local, apply: vi.fn(), reconcilePending: policy });
    mocks.remoteDoc = { updatedAt: 4, json: JSON.stringify({ source: "remote" }) };
    emitSnapshot?.({ metadata: { hasPendingWrites: false }, exists: () => true, data: () => mocks.remoteDoc });
    await vi.advanceTimersByTimeAsync(1200);
    expect(policy).not.toHaveBeenCalled();
    expect(mocks.setDoc).toHaveBeenCalledWith("users/default-owner/app_state/today_planning", { updatedAt: 5, json: JSON.stringify(local.data) });
    binding.stop();
  });
});
