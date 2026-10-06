import { InvalidTaskInputError } from "../_lib/taskInput.js";
import { authenticateRequest } from "../_lib/auth.js";
import {
  deleteUserTask,
  getUserTaskById,
  updateUserTask,
  InvalidTaskPatchError,
} from "../_lib/firestore.js";
import { handleCors, parseBody, sendError, sendJson, sendRequestBodyError } from "../_lib/response.js";
import { InvalidTaskPriorityError, InvalidTaskScheduleError } from "../_lib/taskSchedule.js";

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
    if (sendRequestBodyError(res, error)) return;
    if (error instanceof InvalidTaskInputError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    console.error(`[API /api/tasks/${taskId} error]:`, error);
    if (error instanceof InvalidTaskPatchError) {
      sendError(res, 400, "VALIDATION_ERROR", error.message);
      return;
    }
    if (error instanceof InvalidTaskScheduleError) {
      sendError(res, 400, "VALIDATION_ERROR", error.message);
      return;
    }
    if (error instanceof InvalidTaskPriorityError) {
      sendError(res, 400, "VALIDATION_ERROR", error.message);
      return;
    }
    sendError(
      res,
      500,
      "INTERNAL_ERROR",
      "An unexpected error occurred while processing the task."
    );
  }
}
