import { ASSISTANT_SCOPES, AssistantConfigurationError, authenticateOwner, createGrant, listGrants, type AssistantScope } from "../_lib/assistantAccess.js";
import { handleCors, parseBody, sendError, sendJson, sendRequestBodyError } from "../_lib/response.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
  try {
    const userId = await authenticateOwner(req, res);
    if (!userId) return;
    if (method === "GET") return sendJson(res, 200, { success: true, data: await listGrants(userId) });

    const body = await parseBody(req);
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scopes = body.scopes;
    const days = Number(body.expiresInDays);
    if (!name || name.length > 80 || !Array.isArray(scopes) || scopes.length === 0 ||
      scopes.some((scope: unknown) => !ASSISTANT_SCOPES.includes(scope as AssistantScope)) ||
      !Number.isInteger(days) || days < 1 || days > 365) {
      return sendError(res, 400, "VALIDATION_ERROR", "Provide a name, valid scopes and expiration of 1 to 365 days.");
    }
    const expiresAt = new Date(Date.now() + days * 86400000).toISOString();
    const { grant, secret } = await createGrant(userId, name, [...new Set(scopes)] as AssistantScope[], expiresAt);
    res.setHeader("Cache-Control", "no-store");
    return sendJson(res, 201, { success: true, data: grant, token: secret });
  } catch (error) {
    if (sendRequestBodyError(res, error)) return;
    if (error instanceof AssistantConfigurationError) return sendError(res, 503, "SERVICE_NOT_CONFIGURED", error.message);
    console.error("Assistant access request failed", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Assistant access is unavailable.");
  }
}
