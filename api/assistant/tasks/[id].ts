import { InvalidTaskInputError } from "../../_lib/taskInput.js";
import { authenticateAssistant } from "../../_lib/assistantAccess.js";
import { deleteAssistantTask, getAssistantTask, updateAssistantTask } from "../../_lib/assistantTasks.js";
import { handleCors, parseBody, sendError, sendJson } from "../../_lib/response.js";
import { InvalidTaskPriorityError, InvalidTaskScheduleError } from "../../_lib/taskSchedule.js";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;
  const method = (req.method || "GET").toUpperCase();
  const scope = { GET: "tasks:read", PATCH: "tasks:update", DELETE: "tasks:delete" } as const;
  if (!(method in scope)) return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET, PATCH or DELETE.");
  const id = typeof req.query?.id === "string" ? req.query.id : "";
  if (!/^[A-Za-z0-9_-]{1,120}$/.test(id)) return sendError(res, 400, "BAD_REQUEST", "Invalid task ID.");
  try {
    const grant = await authenticateAssistant(req, res, scope[method as keyof typeof scope]);
    if (!grant) return;
    res.setHeader("Cache-Control", "no-store");
    if (method === "GET") {
      const task = await getAssistantTask(grant, id);
      return task ? sendJson(res, 200, { success: true, data: task }) : sendError(res, 404, "NOT_FOUND", "Task not found.");
    }
    if (method === "PATCH") {
      const task = await updateAssistantTask(grant, id, await parseBody(req));
      return task ? sendJson(res, 200, { success: true, data: task }) : sendError(res, 404, "NOT_FOUND", "Task not found.");
    }
    return (await deleteAssistantTask(grant, id)) ? sendJson(res, 200, { success: true }) : sendError(res, 404, "NOT_FOUND", "Task not found.");
  } catch (error) {
    if (error instanceof InvalidTaskInputError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    console.error("Assistant task detail request failed", error);
    if (error instanceof InvalidTaskScheduleError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    if (error instanceof InvalidTaskPriorityError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    return sendError(res, 500, "INTERNAL_ERROR", "Assistant task request failed.");
  }
}
