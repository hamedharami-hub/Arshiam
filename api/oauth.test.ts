import { beforeEach, expect, it } from "vitest";
import handler from "./oauth.js";
import { testStore } from "./_lib/assistantAccess.js";
import { oauthTestStore } from "./_lib/mcpOAuth.js";

beforeEach(() => { testStore.enabled = true; testStore.reset(); oauthTestStore.enabled = true; oauthTestStore.records.clear(); });
async function request(action: string, method = "GET", body?: any) {
  let status = 0, data: any; const headers = new Map();
  await handler({ method, query: { action }, headers: {}, body }, { setHeader: (key: string, value: string) => headers.set(key, value), set statusCode(value: number) { status = value; }, end: (raw: string) => { if (raw) data = JSON.parse(raw); } });
  return { status, data, headers };
}
it("advertises discoverable OAuth endpoints, S256 and the exact MCP resource", async () => {
  const metadata = await request("metadata");
  expect(metadata.status).toBe(200); expect(metadata.data.code_challenge_methods_supported).toEqual(["S256"]);
  const resource = await request("resource");
  expect(resource.data.resource).toBe("https://arshiam.vercel.app/api/mcp");
  expect(resource.data.scopes_supported).toEqual(["tasks:read"]);
});
it("requires an authenticated Arshiam owner before issuing a consent code", async () => {
  expect((await request("consent", "POST", {})).status).toBe(401);
  expect((await request("register", "POST", { redirect_uris: ["https://evil.test"] })).status).toBe(400);
});
