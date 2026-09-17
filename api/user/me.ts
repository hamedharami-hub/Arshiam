import { authenticateRequest } from "../_lib/auth";
import { handleCors, sendError, sendJson } from "../_lib/response";

export default async function handler(req: any, res: any) {
  if (handleCors(req, res)) return;

  if (req.method !== "GET") {
    sendError(res, 405, "METHOD_NOT_ALLOWED", `Method ${req.method} not allowed`);
    return;
  }

  try {
    const user = await authenticateRequest(req, res);
    if (!user) return;

    sendJson(res, 200, {
      success: true,
      data: {
        userId: user.userId,
        email: user.email || null,
        displayName: user.displayName || null,
      },
    });
  } catch (error: any) {
    console.error("[API /api/user/me error]:", error);
    sendError(
      res,
      500,
      "INTERNAL_ERROR",
      error?.message || "An unexpected error occurred."
    );
  }
}
