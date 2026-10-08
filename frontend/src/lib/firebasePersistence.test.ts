import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: { name: "persistent-firestore" },
  initializeFirestore: vi.fn(),
  terminate: vi.fn(),
  clearIndexedDbPersistence: vi.fn(),
}));

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "app" })),
  getApps: vi.fn(() => []),
  getApp: vi.fn(() => ({ name: "app" })),
}));

vi.mock("firebase/firestore", () => ({
  getFirestore: vi.fn(() => mocks.db),
  collection: vi.fn(), doc: vi.fn(), getDoc: vi.fn(), getDocs: vi.fn(),
  getDocFromServer: vi.fn(), getDocsFromServer: vi.fn(), setDoc: vi.fn(),
  writeBatch: vi.fn(), addDoc: vi.fn(), updateDoc: vi.fn(), deleteDoc: vi.fn(),
  runTransaction: vi.fn(), query: vi.fn(), where: vi.fn(), orderBy: vi.fn(),
  limit: vi.fn(), onSnapshot: vi.fn(), serverTimestamp: vi.fn(),
  initializeFirestore: mocks.initializeFirestore,
  persistentLocalCache: vi.fn(() => ({})), persistentMultipleTabManager: vi.fn(() => ({})),
  clearIndexedDbPersistence: mocks.clearIndexedDbPersistence,
  terminate: mocks.terminate,
  connectFirestoreEmulator: vi.fn(),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  GoogleAuthProvider: class {},
  signInWithPopup: vi.fn(), signInWithRedirect: vi.fn(), getRedirectResult: vi.fn(),
  signInWithEmailAndPassword: vi.fn(), createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(), signOut: vi.fn(), onAuthStateChanged: vi.fn(),
  connectAuthEmulator: vi.fn(),
}));

describe("persistent Firestore cache cleanup", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("MODE", "development");
    mocks.initializeFirestore.mockReset().mockReturnValue(mocks.db);
    mocks.terminate.mockReset().mockResolvedValue(undefined);
    mocks.clearIndexedDbPersistence.mockReset().mockResolvedValue(undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("terminates Firestore before clearing its IndexedDB persistence", async () => {
    const { clearFirestorePersistence, db } = await import("./firebase");

    await expect(clearFirestorePersistence(db)).resolves.toBe(true);

    expect(mocks.terminate).toHaveBeenCalledWith(db);
    expect(mocks.clearIndexedDbPersistence).toHaveBeenCalledWith(db);
  });

  it("reports incomplete cleanup when another persistence owner prevents clearing", async () => {
    mocks.clearIndexedDbPersistence.mockRejectedValueOnce(new Error("persistence is still in use"));
    const { clearFirestorePersistence, db } = await import("./firebase");

    await expect(clearFirestorePersistence(db)).resolves.toBe(false);
  });

  it("does not try to clear IndexedDB when persistent cache was not enabled", async () => {
    const { clearPersistentFirestoreCache } = await import("./firebase");

    await expect(clearPersistentFirestoreCache()).resolves.toBe(true);
    expect(mocks.terminate).not.toHaveBeenCalled();
    expect(mocks.clearIndexedDbPersistence).not.toHaveBeenCalled();
  });
});
