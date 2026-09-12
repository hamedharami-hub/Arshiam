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
      return id ? "/app/tasks/" + encodeURIComponent(id) : "/app/today";
    }
    if (route === "complete-task") {
      const id = url.searchParams.get("taskId");
      return "/app/today" + (id ? "?completeTaskId=" + encodeURIComponent(id) : "");
    }
    return ["today","tomorrow","next7","inbox","notes","checkin","garden","pomodoro","settings","mind","thoughts","abc","socratic","breathing","worry","life-architect"].includes(route) ? "/app/" + route : null;
  } catch { return null; }
}
