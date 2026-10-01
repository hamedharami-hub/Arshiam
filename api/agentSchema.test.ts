import { afterEach, beforeEach, describe, expect, it } from "vitest";
import schema from "../public/agent-openapi.json";
import { ASSISTANT_SCOPES, createGrant, testStore } from "./_lib/assistantAccess";
import { handleAgentRequest, resetIdempotencyCache } from "./_lib/agentApi";
import { resetRateLimits } from "./_lib/rateLimiter";

beforeEach(() => {
  testStore.enabled = true;
  testStore.reset();
  resetRateLimits();
  resetIdempotencyCache();
});
afterEach(() => { testStore.reset(); testStore.enabled = false; });

describe("personal agent OpenAPI contract", () => {
  it("allows a memories-only agent to verify its connection without granting task access", async () => {
    const { secret } = await createGrant("limited-user", "Notes agent", ["memories:read"], new Date(Date.now() + 86400000).toISOString());
    const res: any = { setHeader() {}, end(value: string) { this.body = JSON.parse(value); } };
    const headers = { authorization: `Bearer ${secret}` };
    await handleAgentRequest({ method: "GET", url: "/api/v1/agent/me", headers }, res);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.scopes).toEqual(["memories:read"]);
    await handleAgentRequest({ method: "GET", url: "/api/v1/agent/tasks", headers }, res);
    expect(res.statusCode).toBe(403);
  });

  it("allows idempotency headers in cross-origin tool requests", async () => {
    const headers: Record<string, string> = {};
    const res: any = { setHeader(key: string, value: string) { headers[key] = value; }, end() {} };
    await handleAgentRequest({ method: "OPTIONS", headers: {} }, res);
    expect(res.statusCode).toBe(204);
    expect(headers["Access-Control-Allow-Headers"]).toContain("Idempotency-Key");
  });
  it("uses personal Bearer authentication and unique operation IDs", () => {
    expect(schema.security).toEqual([{ agentBearer: [] }]);
    const ids = Object.values(schema.paths).flatMap((path) => Object.values(path).map((operation: any) => operation.operationId));
    expect(new Set(ids).size).toBe(ids.length);
    expect(Object.keys(schema.paths).every((path) => path.startsWith("/api/v1/agent/"))).toBe(true);
  });

  it("dispatches every advertised operation using a real scoped test grant", async () => {
    const { secret } = await createGrant("schema-user", "Schema agent", [...ASSISTANT_SCOPES], new Date(Date.now() + 86400000).toISOString());
    testStore.tasks.set("record", { id: "record", user_id: "schema-user", title: "Task", completed: false, start_at: "2026-01-01T09:00:00Z", end_at: "2026-01-01T10:00:00Z" });
    testStore.folders.set("record", { id: "record", user_id: "schema-user", name: "Folder" });
    testStore.notes.set("record", { id: "record", user_id: "schema-user", title: "Note", content: "Body" });
    for (const [path, methods] of Object.entries(schema.paths)) {
      for (const [method, operation] of Object.entries(methods)) {
        const body = path.includes("calendar/events") && method === "patch" ? { title: "Updated meeting" } : path.includes("calendar/events")
          ? { title: "Meeting", start_at: "2026-02-01T09:00:00Z", end_at: "2026-02-01T10:00:00Z" }
          : path.includes("folders") ? { name: "Folder" }
          : path.includes("memories") ? { title: "Note", content: "Text" }
          : { title: "Task" };
        const req: any = { method: method.toUpperCase(), url: path.replace("{id}", "record"), headers: { authorization: `Bearer ${secret}` }, query: { start: "2026-01-01T00:00:00Z", end: "2026-03-01T00:00:00Z" }, body };
        const res: any = { statusCode: 200, setHeader() {}, end(value: string) { this.body = JSON.parse(value); } };
        await handleAgentRequest(req, res);
        expect(res.statusCode, (operation as any).operationId).toBeGreaterThanOrEqual(200);
        expect(res.statusCode, `${(operation as any).operationId}: ${JSON.stringify(res.body)}`).toBeLessThan(300);
      }
    }
  });
});
