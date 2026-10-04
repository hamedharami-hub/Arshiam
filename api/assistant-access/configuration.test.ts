import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "./index";
import { handleAgentRequest } from "../_lib/agentApi";
import { testStore } from "../_lib/assistantAccess";

vi.mock("../_lib/auth", async (importOriginal) => {
  const original = await importOriginal<typeof import("../_lib/auth")>();
  return { ...original, verifyFirebaseIdToken: async (token: string) => token === "owner-session" ? { uid: "owner", email: null, email_verified: false } : null };
});
afterEach(() => vi.unstubAllEnvs());

describe("agent server configuration failures", () => {
  it("returns an actionable 503 to a signed-in owner when Admin credentials are absent", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
    testStore.enabled = false;
    const req: any = { method: "GET", headers: { authorization: "Bearer owner-session" } };
    const res: any = { setHeader() {}, end(value: string) { this.body = JSON.parse(value); } };
    await handler(req, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_NOT_CONFIGURED");
    expect(res.body.error.message).toContain("Firebase Admin");
  });

  it("still rejects unauthenticated owners before checking server configuration", async () => {
    const res: any = { setHeader() {}, end(value: string) { this.body = JSON.parse(value); } };
    await handler({ method: "GET", headers: {} }, res);
    expect(res.statusCode).toBe(401);
  });

  it("returns the same configuration status for the external agent API", async () => {
    vi.stubEnv("FIREBASE_SERVICE_ACCOUNT_JSON", "");
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "");
    testStore.enabled = false;
    const res: any = { setHeader() {}, end(value: string) { this.body = JSON.parse(value); } };
    await handleAgentRequest({ method: "GET", url: "/api/v1/agent/me", headers: { authorization: "Bearer arshnaz_pat_test" } }, res);
    expect(res.statusCode).toBe(503);
    expect(res.body.error.code).toBe("SERVICE_NOT_CONFIGURED");
  });
});
