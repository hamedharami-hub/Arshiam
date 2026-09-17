import { authenticateRequest } from "../_lib/auth";
import {
  deleteUserTask,
  getUserTaskById,
  updateUserTask,
} from "../_lib/firestore";
import { handleCors, parseBody, sendError, sendJson } from "../_lib/response";

function extractTaskId(req: any): string | null {
  if (req.query?.id && typeof req.query.id === "string") {
    return req.query.id;
  }
  const url = req.url ? req.url.split("?")[0] : "";
  const parts = url.split("/").filter(Boolean);
  const last = parts[parts.length - 1];
  return last && last !== "tasks" && last !== "[id]" ? last : null;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  const method = (req.method || "GET").toUpperCase();

  if (method !== "GET" && method !== "PATCH" && method !== "DELETE") {
    sendError(res, 405, "METHOD_NOT_ALLOWED", `Method ${method} not allowed`);
    return;
  }

  const taskId = extractTaskId(req);
  if (!taskId) {
    sendError(res, 400, "BAD_REQUEST", "Task ID parameter is required.");
    return;
  }

  try {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    if (method === "GET") {
      const task = await getUserTaskById(user, taskId);
      if (!task) {
        sendError(
          res,
          404,
          "NOT_FOUND",
          `Task '${taskId}' not found or not owned by the authenticated user.`
        );
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: task,
      });
      return;
    }

    if (method === "PATCH") {
      const body = await parseBody(req);
      const updated = await updateUserTask(user, taskId, body);

      if (!updated) {
        sendError(
          res,
          404,
          "NOT_FOUND",
          `Task '${taskId}' not found or not owned by the authenticated user.`
        );
        return;
      }

      sendJson(res, 200, {
        success: true,
        data: updated,
      });
      return;
    }

    if (method === "DELETE") {
      const deleted = await deleteUserTask(user, taskId);

      if (!deleted) {
        sendError(
          res,
          404,
          "NOT_FOUND",
          `Task '${taskId}' not found or not owned by the authenticated user.`
        );
        return;
      }

      sendJson(res, 200, {
        success: true,
        message: "Task deleted successfully",
      });
      return;
    }
  } catch (error: any) {
    console.error(`[API /api/tasks/${taskId} error]:`, error);
    sendError(
      res,
      500,
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred while processing the task."
    );
  }
}
