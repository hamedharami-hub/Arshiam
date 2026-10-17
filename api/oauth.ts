import { authenticateOwner, AssistantConfigurationError } from "./_lib/assistantAccess.js";
import { authorizationRequest, authorizeOwner, exchangeToken, mcpOrigin, MCP_SCOPES, registerClient } from "./_lib/mcpOAuth.js";
import { parseBody, sendJson } from "./_lib/response.js";
import { mcpRateLimit } from "./_lib/mcpRateLimit.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  const action = req.query?.action;
  try {
    if (action !== "metadata" && action !== "resource" && !(await mcpRateLimit(`oauth:${req.headers?.["x-forwarded-for"] || req.socket?.remoteAddress || "unknown"}`, 30))) return sendJson(res, 429, { error: "temporarily_unavailable" });
    if (action === "metadata" && req.method === "GET") return sendJson(res, 200, {
      issuer: mcpOrigin(), authorization_endpoint: `${mcpOrigin()}/api/oauth?action=authorize`, token_endpoint: `${mcpOrigin()}/api/oauth?action=token`,
      registration_endpoint: `${mcpOrigin()}/api/oauth?action=register`, response_types_supported: ["code"], grant_types_supported: ["authorization_code", "refresh_token"],
      token_endpoint_auth_methods_supported: ["none"], code_challenge_methods_supported: ["S256"], scopes_supported: MCP_SCOPES, authorization_response_iss_parameter_supported: true,
    });
    if (action === "resource" && req.method === "GET") return sendJson(res, 200, { resource: `${mcpOrigin()}/api/mcp`, authorization_servers: [mcpOrigin()], scopes_supported: ["tasks:read"] });
    if (action === "register" && req.method === "POST") return sendJson(res, 201, await registerClient(await parseBody(req)));
    if (action === "authorize" && req.method === "GET") {
      await authorizationRequest(req.query);
      const url = new URL(`${mcpOrigin()}/app/connect/chatgpt`);
      for (const [key, value] of Object.entries(req.query)) if (key !== "action" && typeof value === "string") url.searchParams.set(key, value);
      res.statusCode = 302; res.setHeader("Location", url.href); return res.end();
    }
    if (action === "consent" && req.method === "POST") {
      const userId = await authenticateOwner(req, res); if (!userId) return;
      const body = await parseBody(req);
      return sendJson(res, 200, { redirect: await authorizeOwner(userId, body) });
    }
    if (action === "token" && req.method === "POST") {
      let body = req.body;
      if ((req.headers?.["content-type"] || "").includes("application/x-www-form-urlencoded")) {
        if (!body) { let raw = ""; for await (const chunk of req) { raw += chunk; if (raw.length > 16000) throw new Error("invalid_request"); } body = raw; }
        if (typeof body === "string") body = Object.fromEntries(new URLSearchParams(body));
      } else body = await parseBody(req);
      return sendJson(res, 200, await exchangeToken(body));
    }
    return sendJson(res, 405, { error: "invalid_request" });
  } catch (error) {
    const code = error instanceof Error ? error.message : "server_error";
    if (error instanceof AssistantConfigurationError) return sendJson(res, 503, { error: "temporarily_unavailable" });
    return sendJson(res, 400, { error: ["invalid_scope", "invalid_client", "invalid_request", "invalid_target", "invalid_grant", "invalid_redirect_uri", "invalid_client_metadata", "unsupported_grant_type"].includes(code) ? code : "server_error" });
  }
}
