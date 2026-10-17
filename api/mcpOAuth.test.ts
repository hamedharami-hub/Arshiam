import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { testStore, revokeGrant } from "./_lib/assistantAccess.js";
import { authorizationRequest, authorizeOwner, exchangeToken, oauthTestStore, registerClient, validateMcpAccess } from "./_lib/mcpOAuth.js";

const verifier = "a".repeat(43);
let request: any;
beforeEach(async () => {
  testStore.enabled = true; testStore.reset(); oauthTestStore.enabled = true; oauthTestStore.records.clear();
  const client = await registerClient({ redirect_uris: ["https://chatgpt.com/connector_platform_oauth_redirect"], token_endpoint_auth_method: "none" });
  request = { client_id: client.client_id, redirect_uri: client.redirect_uris[0], resource: "https://arshiam.vercel.app/api/mcp", response_type: "code", code_challenge_method: "S256", code_challenge: createHash("sha256").update(verifier).digest("base64url"), state: "original-state", scope: "tasks:read notes:read" };
});
describe("MCP OAuth boundary", () => {
  it("validates PKCE, binds account/resource/client, rotates refresh and honors revocation", async () => {
    const redirect = new URL(await authorizeOwner("user-a", request));
    expect(redirect.searchParams.get("state")).toBe("original-state");
    expect(redirect.searchParams.get("iss")).toBe("https://arshiam.vercel.app");
    const exchange = { grant_type: "authorization_code", code: redirect.searchParams.get("code"), code_verifier: verifier, redirect_uri: request.redirect_uri, client_id: request.client_id, resource: request.resource };
    await expect(exchangeToken({ ...exchange, code_verifier: "b".repeat(43) })).rejects.toThrow("invalid_grant");
    const tokens = await exchangeToken(exchange);
    const grant = await validateMcpAccess(tokens.access_token);
    expect(testStore.tokenIndex.size).toBe(0);
    expect(grant.userId).toBe("user-a"); expect(grant.scopes).toEqual(["tasks:read", "notes:read"]);
    await expect(exchangeToken(exchange)).rejects.toThrow("invalid_grant");
    const refresh = { grant_type: "refresh_token", refresh_token: tokens.refresh_token, resource: request.resource, client_id: request.client_id };
    const rotated = await exchangeToken(refresh);
    await expect(exchangeToken(refresh)).rejects.toThrow("invalid_grant");
    await revokeGrant("user-a", grant.id);
    await expect(validateMcpAccess(rotated.access_token)).rejects.toThrow("invalid_grant");
  });
  it("rejects arbitrary callbacks, missing audience, diary scopes and unsupported auth", async () => {
    await expect(registerClient({ redirect_uris: ["https://evil.test/callback"] })).rejects.toThrow();
    await expect(registerClient({ redirect_uris: [request.redirect_uri], token_endpoint_auth_method: "client_secret_post" })).rejects.toThrow();
    await expect(authorizationRequest({ ...request, resource: "https://evil.test" })).rejects.toThrow("invalid_target");
    await expect(authorizationRequest({ ...request, scope: "diary:read" })).rejects.toThrow("invalid_scope");
    await expect(validateMcpAccess("arshnaz_pat_example")).rejects.toThrow("invalid_token");
  });
});
