import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  doc: vi.fn((_db: unknown, ...path: string[]) => path.join("/")),
  onSnapshot: vi.fn(),
  setDoc: vi.fn(),
}));

vi.mock("firebase/firestore", () => ({
  doc: mocks.doc,
  onSnapshot: mocks.onSnapshot,
  setDoc: mocks.setDoc,
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
});
