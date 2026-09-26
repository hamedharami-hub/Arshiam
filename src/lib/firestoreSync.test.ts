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

  it("does not write when the current remote version cannot be read", async () => {
    getDocMock.mockRejectedValue(new Error("permission or network failure"));

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-unverified",
      { id: "doc-unverified", updated_at: "2026-09-25T12:00:00.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("uses application edit timestamps before Firestore sync receipt timestamps", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:01.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "knowledge_documents",
      "doc-2",
      {
        id: "doc-2",
        updated_at: "2026-09-25T00:00:06.000Z",
        updatedAt: "2026-09-25T00:00:02.000Z",
      },
    );

    expect(saved).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it("keeps camel-case-only legacy entities on stale-write protection", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({ updatedAt: "2026-09-25T00:00:02.000Z" }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "settings",
      "settings-1",
      { id: "settings-1", updatedAt: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });

  it("compares interactive-study drafts by their version timestamp, not later sync receipt time", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:00.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "interactive_study_sessions",
      "session-1",
      { id: "session-1", updated_at: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(true);
    expect(setDocMock).toHaveBeenCalledOnce();
  });

  it("still rejects an interactive-study draft older than the saved application version", async () => {
    getDocMock.mockResolvedValue({
      exists: () => true,
      data: () => ({
        updated_at: "2026-09-25T00:00:02.000Z",
        updatedAt: "2026-09-25T00:00:05.000Z",
      }),
    });

    const saved = await saveEntityToFirestore(
      "user-sync-test",
      "interactive_study_sessions",
      "session-1",
      { id: "session-1", updated_at: "2026-09-25T00:00:01.000Z" },
    );

    expect(saved).toBe(false);
    expect(setDocMock).not.toHaveBeenCalled();
  });
});
