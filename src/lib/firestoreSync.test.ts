import { afterEach, describe, expect, it, vi } from "vitest";

const { getDocMock, setDocMock } = vi.hoisted(() => ({
  getDocMock: vi.fn(),
  setDocMock: vi.fn(),
}));

vi.mock("./firebase", () => ({
  auth: { currentUser: { uid: "user-sync-test" } },
  db: {},
  collection: vi.fn(),
  doc: vi.fn(() => ({ path: "mock-doc" })),
  getDoc: getDocMock,
  getDocs: vi.fn(),
  setDoc: setDocMock,
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(),
}));

vi.mock("./firebaseStore", () => ({ firebaseStore: { from: vi.fn() } }));
vi.mock("./offlineDb", () => ({ cacheGet: vi.fn(), cacheSet: vi.fn() }));
vi.mock("@/features/tasks/taskCache", () => ({
  extractTasksFromCache: vi.fn(() => []),
  createTaskCacheEnvelope: vi.fn((tasks) => tasks),
}));

import { saveEntityToFirestore } from "./firestoreSync";

describe("Firestore stale-write protection", () => {
  afterEach(() => vi.clearAllMocks());

  it("rejects stale writes as unconfirmed so callers keep the mutation pending", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ updatedAt: "2026-09-24T12:00:00.000Z" }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-1",
      { id: "doc-1", updated_at: "2026-09-23T12:00:00.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
