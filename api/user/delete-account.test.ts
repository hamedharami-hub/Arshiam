import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  verifyIdToken: vi.fn(), deleteUser: vi.fn(), recursiveDelete: vi.fn(),
  deleteFiles: vi.fn(), getFiles: vi.fn(),
}));

vi.mock("firebase-admin/app", () => ({ getApps: () => [{}] }));
vi.mock("firebase-admin/auth", () => ({ getAuth: () => ({ verifyIdToken: mocks.verifyIdToken, deleteUser: mocks.deleteUser }) }));
vi.mock("firebase-admin/storage", () => ({ getStorage: () => ({ bucket: () => ({ deleteFiles: mocks.deleteFiles, getFiles: mocks.getFiles }) }) }));
vi.mock("../_lib/assistantAccess.js", () => ({
  adminDb: () => ({ doc: (path: string) => path, recursiveDelete: mocks.recursiveDelete }),
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
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, status: 200 }));
  mocks.verifyIdToken.mockResolvedValue({ uid: "owner-123", auth_time: Math.floor(Date.now() / 1000) });
  mocks.deleteFiles.mockResolvedValue(undefined);
  mocks.getFiles.mockResolvedValue([[]]);
  mocks.recursiveDelete.mockResolvedValue(undefined);
  mocks.deleteUser.mockResolvedValue(undefined);
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
});
