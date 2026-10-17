import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpServer } from "./_lib/mcpTools.js";
import { validateMcpAccess, mcpOrigin } from "./_lib/mcpOAuth.js";
import { parseBody, sendJson } from "./_lib/response.js";
import { mcpRateLimit } from "./_lib/mcpRateLimit.js";
import { AssistantConfigurationError } from "./_lib/assistantAccess.js";

export default async function handler(req: any, res: any) {
  res.setHeader("Cache-Control", "no-store");
  if (req.headers?.origin && req.headers.origin !== mcpOrigin() && req.headers.origin !== "https://chatgpt.com") return sendJson(res, 403, { error: "Origin denied" });
  if (req.method === "OPTIONS") { res.statusCode = 204; return res.end(); }
  if (req.method !== "POST") { res.setHeader("Allow", "POST, OPTIONS"); return sendJson(res, 405, { error: "Use POST; this server uses stateless JSON responses." }); }
  const bearer = /^Bearer (.+)$/i.exec(req.headers?.authorization || "")?.[1] || "";
  let grant;
  try { grant = await validateMcpAccess(bearer); } catch (error) {
    if (error instanceof AssistantConfigurationError) return sendJson(res, 503, { error: "Service not configured" });
    res.setHeader("WWW-Authenticate", `Bearer resource_metadata="${mcpOrigin()}/.well-known/oauth-protected-resource", scope="tasks:read"`);
    return sendJson(res, 401, { error: "Authentication required" });
  }
  if (!(await mcpRateLimit(`grant:${grant.id}`, 60))) { res.setHeader("Retry-After", "60"); return sendJson(res, 429, { error: "Rate limited" }); }
  const server = createMcpServer(grant);
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  try {
    await server.connect(transport);
    await transport.handleRequest(req, res, await parseBody(req));
  } catch {
    if (!res.headersSent) return sendJson(res, 400, { jsonrpc: "2.0", id: null, error: { code: -32600, message: "Invalid MCP request" } });
  } finally { await server.close(); }
}
