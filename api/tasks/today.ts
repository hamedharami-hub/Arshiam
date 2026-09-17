import { authenticateRequest } from "../_lib/auth";
import { getTodayTasks } from "../_lib/firestore";
import { handleCors, sendError, sendJson } from "../_lib/response";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  const method = (req.method || "GET").toUpperCase();

  if (method !== "GET") {
    sendError(res, 405, "METHOD_NOT_ALLOWED", `Method ${method} not allowed`);
    return;
  }

  try {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    const data = await getTodayTasks(user);

    sendJson(res, 200, {
      success: true,
      data,
    });
  } catch (error: any) {
    console.error("[API /api/tasks/today error]:", error);
    sendError(
      res,
      500,
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred while fetching today's tasks."
    );
  }
}
