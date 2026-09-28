import { authenticateRequest } from "../_lib/auth";
import { createUserTask, listUserTasks } from "../_lib/firestore";
import { handleCors, parseBody, sendError, sendJson } from "../_lib/response";

function parseQueryParams(req: any): Record<string, any> {
  if (req.query && typeof req.query === "object") {
    return req.query;
  }
  const url = req.url || "";
  const queryIndex = url.indexOf("?");
  if (queryIndex === -1) return {};

  const searchParams = new URLSearchParams(url.slice(queryIndex));
  const result: Record<string, any> = {};
  searchParams.forEach((val, key) => {
    result[key] = val;
  });
  return result;
}

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  const method = (req.method || "GET").toUpperCase();

  if (method !== "GET" && method !== "POST") {
    sendError(res, 405, "METHOD_NOT_ALLOWED", `Method ${method} not allowed`);
    return;
  }

  try {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    if (method === "GET") {
      const query = parseQueryParams(req);

      let completed: boolean | undefined = undefined;
      if (query.completed === "true" || query.completed === true) {
        completed = true;
      } else if (query.completed === "false" || query.completed === false) {
        completed = false;
      }

      const limitNum = query.limit ? parseInt(String(query.limit), 10) : 50;

      const tasks = await listUserTasks(user, {
        completed,
        priority: query.priority ? String(query.priority) : undefined,
        status: query.status ? String(query.status) : undefined,
        folder_id: query.folder_id ? String(query.folder_id) : undefined,
        search: query.search ? String(query.search) : undefined,
        limit: isNaN(limitNum) ? 50 : Math.min(Math.max(1, limitNum), 100),
      });

      sendJson(res, 200, {
        success: true,
        data: {
          tasks,
          total: tasks.length,
        },
      });
      return;
    }

    if (method === "POST") {
      const body = await parseBody(req);

      if (!body || !body.title || typeof body.title !== "string" || !body.title.trim()) {
        sendError(
          res,
          400,
          "VALIDATION_ERROR",
          "Task title is required and cannot be empty."
        );
        return;
      }

      const created = await createUserTask(user, {
        ...body,
        title: body.title.trim(),
      });

      sendJson(res, 201, {
        success: true,
        data: created,
      });
      return;
    }
  } catch (error: any) {
    console.error("[API /api/tasks error]:", error);
    sendError(
      res,
      500,
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred while processing tasks."
    );
  }
}
