import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { adminDb, createGrant, grantAllows, listGrants, tokenHash, type AssistantGrant, type AssistantScope } from "./assistantAccess.js";

export const MCP_SCOPES: AssistantScope[] = ["tasks:read", "tasks:create", "tasks:update", "folders:read", "notes:read", "notes:create", "notes:update"];
export function mcpOrigin() {
  const url = new URL(process.env.MCP_PUBLIC_ORIGIN || "https://arshiam.vercel.app");
  if (url.protocol !== "https:" || url.pathname !== "/" || url.search || url.hash || url.username) throw new Error("Invalid MCP public origin");
  return url.origin;
}
export const oauthTestStore = { enabled: false, records: new Map<string, any>() };
const random = () => randomBytes(32).toString("base64url");
const ref = (table: string, id: string) => adminDb().doc(`${table}/${tokenHash(id)}`);
async function put(table: string, id: string, value: any) {
  if (oauthTestStore.enabled) { oauthTestStore.records.set(`${table}:${tokenHash(id)}`, value); return; }
  await ref(table, id).set(value);
}
async function get(table: string, id: string) {
  if (oauthTestStore.enabled) return oauthTestStore.records.get(`${table}:${tokenHash(id)}`);
  return (await ref(table, id).get()).data();
}
async function consume(table: string, id: string, validate: (data: any) => boolean) {
  if (oauthTestStore.enabled) {
    const key = `${table}:${tokenHash(id)}`, data = oauthTestStore.records.get(key);
    if (!data || data.expiresAt <= Date.now() || !validate(data)) return null;
    oauthTestStore.records.delete(key); return data;
  }
  return adminDb().runTransaction(async tx => {
    const record = ref(table, id), snapshot = await tx.get(record), data = snapshot.data();
    if (!data || data.expiresAt <= Date.now() || !validate(data)) return null;
    tx.delete(record); return data;
  });
}
export function requestedScopes(value: unknown): AssistantScope[] {
  const scopes = typeof value === "string" ? value.split(/\s+/).filter(Boolean) : ["tasks:read"];
  if (!scopes.length || scopes.some(scope => !MCP_SCOPES.includes(scope as AssistantScope))) throw new Error("invalid_scope");
  return [...new Set(scopes)] as AssistantScope[];
}
const redirects = ["https://chatgpt.com/connector_platform_oauth_redirect"];
export function validRedirect(uri: string) {
  return redirects.includes(uri) || /^https:\/\/chatgpt\.com\/connector\/oauth\/[a-zA-Z0-9_-]+$/.test(uri);
}
export async function registerClient(body: any) {
  if (!body || typeof body !== "object") throw new Error("invalid_client_metadata");
  if (!Array.isArray(body.redirect_uris) || !body.redirect_uris.length || body.redirect_uris.length > 5 || body.redirect_uris.some((uri: unknown) => typeof uri !== "string" || !validRedirect(uri))) throw new Error("invalid_redirect_uri");
  if (body.token_endpoint_auth_method && body.token_endpoint_auth_method !== "none") throw new Error("invalid_client_metadata");
  const clientId = `arshiam_client_${random()}`;
  await put("mcp_oauth_clients", clientId, { redirectUris: body.redirect_uris, createdAt: Date.now() });
  return { client_id: clientId, client_name: "ChatGPT", redirect_uris: body.redirect_uris, token_endpoint_auth_method: "none", grant_types: ["authorization_code", "refresh_token"], response_types: ["code"] };
}
async function validateClient(clientId: string, redirectUri: string) {
  const client = await get("mcp_oauth_clients", clientId);
  if (!client || !client.redirectUris.includes(redirectUri) || !validRedirect(redirectUri)) throw new Error("invalid_client");
}
export async function authorizationRequest(query: any) {
  const clientId = String(query.client_id || ""), redirectUri = String(query.redirect_uri || "");
  await validateClient(clientId, redirectUri);
  if (query.response_type !== "code" || query.code_challenge_method !== "S256" || !/^[A-Za-z0-9_-]{43}$/.test(query.code_challenge || "")) throw new Error("invalid_request");
  if (query.resource !== `${mcpOrigin()}/api/mcp`) throw new Error("invalid_target");
  if (query.state && (typeof query.state !== "string" || query.state.length > 2048)) throw new Error("invalid_request");
  return { clientId, redirectUri, challenge: query.code_challenge, resource: query.resource, scopes: requestedScopes(query.scope), state: query.state || "" };
}
export async function authorizeOwner(userId: string, query: any) {
  const request = await authorizationRequest(query);
  const { grant, secret } = await createGrant(userId, "ChatGPT MCP", request.scopes, new Date(Date.now() + 30 * 86400000).toISOString());
  // PAT secret is deliberately discarded; OAuth credentials cannot be used as REST PATs.
  if (!oauthTestStore.enabled) {
    const batch = adminDb().batch();
    batch.update(adminDb().doc(`users/${userId}/assistant_grants/${grant.id}`), { audience: request.resource });
    batch.delete(adminDb().doc(`assistant_token_index/${tokenHash(secret)}`));
    await batch.commit();
  } else { const { testStore } = await import("./assistantAccess.js"); testStore.tokenIndex.delete(tokenHash(secret)); }
  grant.audience = request.resource;
  const code = random();
  await put("mcp_oauth_codes", code, { ...request, grantId: grant.id, userId, expiresAt: Date.now() + 120000 });
  const destination = new URL(request.redirectUri);
  destination.searchParams.set("code", code); destination.searchParams.set("iss", mcpOrigin());
  if (request.state) destination.searchParams.set("state", request.state);
  return destination.href;
}
async function activeGrant(userId: string, id: string) {
  const grant = (await listGrants(userId)).find(item => item.id === id);
  if (!grant || grant.revokedAt || !Number.isFinite(Date.parse(grant.expiresAt)) || Date.parse(grant.expiresAt) <= Date.now() || grant.audience !== `${mcpOrigin()}/api/mcp`) throw new Error("invalid_grant");
  return grant;
}
async function issueTokens(data: any) {
  const grant = await activeGrant(data.userId, data.grantId);
  const access = `arshiam_mcp_${random()}`, refresh = `arshiam_refresh_${random()}`;
  const base = { userId: data.userId, grantId: data.grantId, clientId: data.clientId, resource: data.resource, scopes: data.scopes };
  await put("mcp_oauth_access", access, { ...base, expiresAt: Math.min(Date.now() + 900000, Date.parse(grant.expiresAt)) });
  await put("mcp_oauth_refresh", refresh, { ...base, expiresAt: Date.parse(grant.expiresAt) });
  return { access_token: access, token_type: "Bearer", expires_in: Math.max(0, Math.min(900, Math.floor((Date.parse(grant.expiresAt) - Date.now()) / 1000))), refresh_token: refresh, scope: data.scopes.join(" ") };
}
export async function exchangeToken(body: any) {
  if (!body || typeof body !== "object") throw new Error("invalid_request");
  if (body.resource !== `${mcpOrigin()}/api/mcp`) throw new Error("invalid_target");
  const clientId = String(body.client_id || "");
  if (body.grant_type === "authorization_code") {
    await validateClient(clientId, String(body.redirect_uri || ""));
    const verifier = String(body.code_verifier || "");
    if (!/^[A-Za-z0-9._~-]{43,128}$/.test(verifier)) throw new Error("invalid_grant");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const data = await consume("mcp_oauth_codes", String(body.code || ""), data => data.clientId === clientId && data.redirectUri === body.redirect_uri && data.resource === body.resource && data.challenge.length === challenge.length && timingSafeEqual(Buffer.from(data.challenge), Buffer.from(challenge)));
    if (!data) throw new Error("invalid_grant");
    return issueTokens(data);
  }
  if (body.grant_type === "refresh_token") {
    const data = await consume("mcp_oauth_refresh", String(body.refresh_token || ""), data => data.clientId === clientId && data.resource === body.resource);
    if (!data) throw new Error("invalid_grant");
    if (body.scope && body.scope !== data.scopes.join(" ")) throw new Error("invalid_scope");
    return issueTokens(data);
  }
  throw new Error("unsupported_grant_type");
}
export async function validateMcpAccess(token: string): Promise<AssistantGrant> {
  if (!token.startsWith("arshiam_mcp_")) throw new Error("invalid_token");
  const record = await get("mcp_oauth_access", token);
  if (!record || record.expiresAt <= Date.now() || record.resource !== `${mcpOrigin()}/api/mcp`) throw new Error("invalid_token");
  const grant = await activeGrant(record.userId, record.grantId);
  if (record.scopes.some((scope: AssistantScope) => !grantAllows(grant.userId, grant, scope))) throw new Error("invalid_token");
  return { ...grant, scopes: record.scopes, audience: record.resource };
}
