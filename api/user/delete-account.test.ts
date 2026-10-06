import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(), deleteUser: vi.fn(), recursiveDelete: vi.fn(),
  deleteFiles: vi.fn(), getFiles: vi.fn(), tokenIndexes: vi.fn(), tokenQuery: vi.fn(), tokenDelete: vi.fn(), tokenCommit: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({ getApps: () => [{}] }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: mocks.verifyIdToken, deleteUser: mocks.deleteUser }) }));
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({ deleteFiles: mocks.deleteFiles, getFiles: mocks.getFiles }) }) }));
vi.mock("../_lib/assistantAccess.js", () => ({
  adminDb: () => ({
    doc: (path: string) => path, recursiveDelete: mocks.recursiveDelete,
    collection: () => ({ where: (...args: any[]) => { mocks.tokenQuery(...args); return { limit: () => ({ get: mocks.tokenIndexes }) }; } }),
    batch: () => ({ delete: mocks.tokenDelete, commit: mocks.tokenCommit }),
  }),
  AssistantConfigurationError: class AssistantConfigurationError extends Error {},
}));

import handler from "./delete-account";

function response() {
  const res = {
    statusCode: 0,
    body: null as any,
    setHeader: vi.fn(),
    end: vi.fn((body: string) => { res.body = body ? JSON.parse(body) : null; }),
  };
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ARSH_API_BASE_URL", "https://fastapi.example");
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: true }) }));
  mocks.verifyIdToken.mockResolvedValue({ uid: "owner-123", auth_time: Math.floor(Date.now() / 1000) });
  mocks.deleteFiles.mockResolvedValue(undefined);
  mocks.getFiles.mockResolvedValue([[]]);
  mocks.recursiveDelete.mockResolvedValue(undefined);
  mocks.deleteUser.mockResolvedValue(undefined);
  mocks.tokenIndexes.mockResolvedValue({ empty: true, docs: [] });
  mocks.tokenCommit.mockResolvedValue(undefined);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("DELETE /api/user/delete-account", () => {
  it("requires a Firebase account token and does not trust a body UID", async () => {
    const denied = response();
    await handler({ method: "DELETE", headers: {}, body: { uid: "victim" } }, denied);
    expect(denied.statusCode).toBe(401);
    expect(mocks.recursiveDelete).not.toHaveBeenCalled();

    const allowed = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" }, body: { uid: "victim" } }, allowed);
    expect(allowed.statusCode).toBe(200);
    expect(mocks.recursiveDelete).toHaveBeenCalledWith("users/owner-123");
    expect(mocks.deleteUser).toHaveBeenCalledWith("owner-123");
    expect(mocks.tokenQuery).toHaveBeenCalledWith("userId", "==", "owner-123");
    expect(mocks.deleteFiles).toHaveBeenNthCalledWith(1, { prefix: "users/owner-123/" });
    expect(mocks.deleteFiles).toHaveBeenNthCalledWith(2, { prefix: "note-media/owner-123/" });
    expect(fetch).toHaveBeenCalledWith("https://fastapi.example/api/arsh/account/data", expect.objectContaining({
      method: "DELETE", headers: { Authorization: "Bearer account-token" },
    }));
    expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.recursiveDelete.mock.invocationCallOrder[0]);
  });

  it("requires recent sign-in before any destructive work", async () => {
    mocks.verifyIdToken.mockResolvedValue({ uid: "owner-123", auth_time: Math.floor(Date.now() / 1000) - 3600 });
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(403);
    expect(res.body.error.code).toBe("RECENT_LOGIN_REQUIRED");
    expect(mocks.deleteFiles).not.toHaveBeenCalled();
  });

  it.each(["", "http://untrusted.example", "https://account:secret@fastapi.example", "https://fastapi.example?redirect=other"])("diagnoses an absent or unsafe service address without deletion: %s", async (address) => {
    vi.stubEnv("ARSH_API_BASE_URL", address);
    vi.stubEnv("VITE_ARSH_API_URL", "");
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_NOT_CONFIGURED");
    expect(fetch).not.toHaveBeenCalled();
    expect(mocks.deleteFiles).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("retains authentication and other resources when the companion service does not confirm success", async () => {
    vi.mocked(fetch).mockResolvedValue({ ok: true, status: 200, json: async () => ({ ok: false }) } as Response);
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.details.stage).toBe("legacy-attachments");
    expect(mocks.deleteFiles).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("reports incomplete deletion and retains Auth when Storage fails so it can be retried", async () => {
    mocks.deleteFiles.mockRejectedValue(new Error("storage unavailable"));
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.code).toBe("DELETE_INCOMPLETE");
    expect(res.body.error.details.stage).toBe("storage");
    expect(mocks.recursiveDelete).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });

  it("removes only owned token indexes in bounded batches before Auth", async () => {
    mocks.tokenIndexes.mockResolvedValueOnce({ empty: false, docs: [{ ref: "index-1" }, { ref: "index-2" }] })
      .mockResolvedValueOnce({ empty: false, docs: [{ ref: "index-3" }] })
      .mockResolvedValueOnce({ empty: true, docs: [] });
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(200);
    expect(mocks.tokenDelete.mock.calls).toEqual([["index-1"], ["index-2"], ["index-3"]]);
    expect(mocks.tokenQuery).toHaveBeenCalledWith("userId", "==", "owner-123");
    expect(mocks.tokenCommit).toHaveBeenCalledTimes(2);
    expect(mocks.deleteUser.mock.invocationCallOrder[0]).toBeGreaterThan(mocks.tokenCommit.mock.invocationCallOrder[1]);
  });

  it("keeps account authentication available when external token-index deletion fails", async () => {
    mocks.tokenIndexes.mockResolvedValue({ empty: false, docs: [{ ref: "index-1" }] });
    mocks.tokenCommit.mockRejectedValue(new Error("index unavailable"));
    const res = response();
    await handler({ method: "DELETE", headers: { authorization: "Bearer account-token" } }, res);
    expect(res.statusCode).toBe(500);
    expect(res.body.error.details.stage).toBe("assistant-token-index");
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
});
