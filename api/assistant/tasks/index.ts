import { authenticateAssistant } from "../../_lib/assistantAccess";
import { createAssistantTask, listAssistantTasks } from "../../_lib/assistantTasks";
import { handleCors, parseBody, sendError, sendJson } from "../../_lib/response";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "POST") return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET or POST.");
  try {
    const grant = await authenticateAssistant(req, res, method === "GET" ? "tasks:read" : "tasks:create");
    if (!grant) return;
    res.setHeader("Cache-Control", "no-store");
    if (method === "GET") {
      const search = typeof req.query?.search === "string" ? req.query.search : undefined;
      const limit = Number(req.query?.limit || 100);
      return sendJson(res, 200, { success: true, data: await listAssistantTasks(grant, search, limit) });
    }
    const body = await parseBody(req);
    if (typeof body?.title !== "string" || !body.title.trim() || body.title.length > 500) {
      return sendError(res, 400, "VALIDATION_ERROR", "A task title of 1 to 500 characters is required.");
    }
    const task = await createAssistantTask(grant, body);
    return sendJson(res, task.alreadyExists ? 200 : 201, { success: true, data: task });
  } catch (error) {
    console.error("Assistant task request failed", error);
    return sendError(res, 500, "INTERNAL_ERROR", "Assistant task request failed.");
  }
}
