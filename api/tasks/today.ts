import { authenticateRequest } from "../_lib/auth.js";
import { getTodayTasks } from "../_lib/firestore.js";
import { handleCors, sendError, sendJson } from "../_lib/response.js";
import { normalizeTimeZone } from "../_lib/taskSchedule.js";

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

    const rawTimeZone = typeof req.query?.time_zone === "string"
      ? req.query.time_zone
      : new URL(req.url || "/", "http://localhost").searchParams.get("time_zone");
    const timeZone = normalizeTimeZone(rawTimeZone);
    if (!timeZone) {
      sendError(res, 400, "VALIDATION_ERROR", "A valid IANA 'time_zone' query parameter is required.");
      return;
    }

    const data = await getTodayTasks(user, timeZone);

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
