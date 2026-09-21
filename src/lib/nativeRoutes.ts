/** Exact route allowlist; IDs are decoded once, then encoded for React Router. */
export function nativeRoute(raw: string, currentUid?: string | null): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "arshnaz:") return null;
    const route = url.hostname;
    const owner = url.searchParams.get("owner");
    if (owner && owner !== currentUid) return "/app/today";
    if (route === "new-task" || route === "add_task") return "/app/new/task";
    if (route === "task") {
      const id = url.searchParams.get("taskId");
      if (!id) return "/app/today";
      const fromWidget = url.searchParams.get("fromWidget");
      const query = fromWidget ? `?fromWidget=${encodeURIComponent(fromWidget)}` : "";
      return "/app/tasks/" + encodeURIComponent(id) + query;
    }
    if (route === "complete-task") {
      const id = url.searchParams.get("taskId");
      return "/app/today" + (id ? "?completeTaskId=" + encodeURIComponent(id) : "");
    }
    if (route === "sos" || route === "crisis") return "/app/crisis";
    return ["today","tomorrow","next7","inbox","notes","checkin","garden","pomodoro","settings","mind","crisis","thoughts","abc","socratic","breathing","worry","life-architect","widgets","habits","calendar","kanban","self","stats"].includes(route) ? "/app/" + route : null;
  } catch { return null; }
}
