import { createServer } from "node:http";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createHash } from "node:crypto";
import handler from "./mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { testStore, revokeGrant } from "./_lib/assistantAccess.js";
import { oauthTestStore, registerClient, authorizeOwner, exchangeToken, validateMcpAccess } from "./_lib/mcpOAuth.js";

beforeEach(() => { testStore.enabled = true; testStore.reset(); oauthTestStore.enabled = true; oauthTestStore.records.clear(); });
afterEach(() => { testStore.enabled = false; oauthTestStore.enabled = false; });
it("serves initialize/list/call via stateless HTTP, rejects bad origins and rechecks revoked credentials", async () => {
  const registered = await registerClient({ redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"] });
  const verifier = "a".repeat(43), resource = "https://arshiam.vercel.app/api/mcp";
  const request = { client_id: registered.client_id, redirect_uri: registered.redirect_uris[0], resource, response_type: "code", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url"), scope: "tasks:read" };
  const url = new URL(await authorizeOwner("u", request));
  const tokens = await exchangeToken({ grant_type: "authorization_code", code: url.searchParams.get("code"), code_verifier: verifier, client_id: request.client_id, redirect_uri: request.redirect_uri, resource });
  const server = createServer((req, res) => { void handler(req, res).catch(() => { res.statusCode = 500; res.end(); }); });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const address = server.address() as { port: number };
  const endpoint = new URL(`http://127.0.0.1:${address.port}/api/mcp`);
  const client = new Client({ name: "integration", version: "1.0.0" });
  try {
    const badOrigin = await fetch(endpoint, { method: "POST", headers: { Origin: "https://evil.test" } });
    expect(badOrigin.status).toBe(403);
    const missing = await fetch(endpoint, { method: "POST" });
    expect(missing.status).toBe(401); expect(missing.headers.get("www-authenticate")).toContain("resource_metadata");
    const transport = new StreamableHTTPClientTransport(endpoint, { requestInit: { headers: { Authorization: `Bearer ${tokens.access_token}` } } });
    await client.connect(transport);
    expect((await client.listTools()).tools.some(tool => tool.name === "list_tasks")).toBe(true);
    const profile = await client.callTool({ name: "get_profile", arguments: {} });
    expect(profile.structuredContent).toEqual({ id: "u" });
    const grant = await validateMcpAccess(tokens.access_token);
    await revokeGrant("u", grant.id);
    const revoked = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${tokens.access_token}` } });
    expect(revoked.status).toBe(401);
  } finally { await client.close(); await new Promise<void>(resolve => server.close(() => resolve())); }
});
