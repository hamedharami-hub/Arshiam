import { authenticateOwner, revokeGrant } from "../_lib/assistantAccess";
import { handleCors, sendError, sendJson } from "../_lib/response";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  if ((req.method || "").toUpperCase() !== "DELETE") return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use DELETE.");
  try {
    const userId = await authenticateOwner(req, res);
    if (!userId) return;
    const id = typeof req.query?.id === "string" ? req.query.id : "";
    if (!/^[a-f0-9]{32}$/.test(id)) return sendError(res, 400, "BAD_REQUEST", "Invalid grant ID.");
    if (!(await revokeGrant(userId, id))) return sendError(res, 404, "NOT_FOUND", "Access grant not found.");
    return sendJson(res, 200, { success: true });
  } catch (error) {
    console.error("Assistant access revocation failed", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Could not revoke assistant access.");
  }
}
