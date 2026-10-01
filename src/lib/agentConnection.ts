const PRODUCTION_ORIGIN = "https://arshiam.vercel.app";

/** The agent API is hosted by Vercel, separately from the FastAPI companion. */
export function agentServerOrigin(origin: string, configured = import.meta.env.VITE_AGENT_API_URL || ""): string {
  if (configured.trim()) {
    const url = new URL(configured.trim());
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
      throw new Error("VITE_AGENT_API_URL must be an HTTPS server origin, without a path or credentials.");
    }
    return url.origin;
  }
  const url = new URL(origin);
  // Vite and packaged Capacitor builds cannot execute Vercel API functions.
  if (["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) || !["http:", "https:"].includes(url.protocol)) {
    return PRODUCTION_ORIGIN;
  }
  return url.origin;
}

export async function readAgentResponse(response: Response, isEn: boolean) {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw new Error(isEn
      ? "The agent server did not return JSON. Check that the API is deployed and the server address is correct."
      : "سرور عامل پاسخ JSON نداد. آدرس سرور و انتشار API را بررسی کنید.");
  }
  let body: any;
  try {
    body = await response.json();
  } catch {
    throw new Error(isEn ? "The agent server returned an invalid response." : "پاسخ سرور عامل معتبر نیست.");
  }
  if (!response.ok) {
    throw new Error(body.error?.message || (isEn ? `Agent request failed (${response.status}).` : `درخواست عامل ناموفق بود (${response.status}).`));
  }
  return body;
}

export function agentInstructions(origin: string) {
  return `Connect to my ARSHNAZ account using the HTTPS REST API at ${origin}/api/v1/agent.
API schema: ${origin}/agent-openapi.json
Authenticate with Authorization: Bearer <ARSHNAZ_AGENT_TOKEN> on each API request. Obtain the token through the tool's secure credential configuration; never print it or include it in generated files or chat replies.
First call GET /me to verify the connection and inspect granted scopes. Read the relevant records before changing them, and perform only the changes I explicitly request. Never supply another user's ID.
Tasks: GET/POST /tasks, GET/PATCH /tasks/{id}, POST /tasks/{id}/complete or /reopen.
Folders: GET/POST /folders, GET/PATCH /folders/{id}.
Notes and diary: GET/POST /memories, GET/PATCH /memories/{id}.
Schedule: GET /schedule/day, /schedule/week or /schedule/month with a date query.
Calendar: GET/POST /calendar/events, PATCH /calendar/events/{id}. Use ISO 8601 timestamps with explicit timezone offsets. Ask me before overriding a 409 time conflict.
Use a fresh Idempotency-Key per intended create operation and reuse it only when retrying that operation. Stop on 401/403; report missing authentication or permissions. Respect Retry-After on 429. Verify changes by reading them back, then summarize actual results. These endpoints do not modify application source code.
If your environment cannot make HTTP requests, say so instead of claiming changes were made.`;
}
