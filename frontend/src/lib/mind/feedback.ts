export type MindFeedbackResponse = "helpful" | "no_change" | "uncomfortable" | "unsure";
export type MindFeedbackInput = { toolId: string; toolVersion: string; sessionId: string; response: MindFeedbackResponse };
export type MindFeedback = MindFeedbackInput & { id: string; createdAt: string };
const responses = new Set<MindFeedbackResponse>(["helpful", "no_change", "uncomfortable", "unsure"]);
const key = (ownerId: string) => `arshiam:mind:feedback:v1:${encodeURIComponent(ownerId)}`;

function parse(raw: string | null, ownerId: string): MindFeedback[] | null {
  if (raw === null) return [];
  try {
    const data = JSON.parse(raw);
    if (data?.version !== 1 || data.ownerId !== ownerId || !Array.isArray(data.items)) return null;
    if (!data.items.every((item: MindFeedback) => item && typeof item.id === "string" && typeof item.toolId === "string"
      && typeof item.toolVersion === "string" && typeof item.sessionId === "string" && responses.has(item.response)
      && typeof item.createdAt === "string" && Number.isFinite(Date.parse(item.createdAt)))) return null;
    return data.items;
  } catch { return null; }
}

/** Device-local self-report, not evidence of efficacy; no text or AI output is stored. */
export function readMindFeedback(ownerId: string): MindFeedback[] {
  if (!ownerId) return [];
  try { return parse(localStorage.getItem(key(ownerId)), ownerId) ?? []; } catch { return []; }
}

export function recordMindFeedback(ownerId: string, input: MindFeedbackInput): boolean {
  if (!ownerId || !input.toolId || !input.toolVersion || !input.sessionId || !responses.has(input.response)) return false;
  try {
    const storageKey = key(ownerId);
    const raw = localStorage.getItem(storageKey);
    const items = parse(raw, ownerId);
    // Invalid old storage is not silently destroyed by a new write.
    if (!items) return false;
    const id = `${input.sessionId}:${input.toolId}:${input.toolVersion}`;
    const item: MindFeedback = { ...input, id, createdAt: new Date().toISOString() };
    const next = JSON.stringify({ version: 1, ownerId, items: [...items.filter(x => x.id !== id), item] });
    if (localStorage.getItem(storageKey) !== raw) return false;
    localStorage.setItem(storageKey, next);
    if (localStorage.getItem(storageKey) !== next) return false;
    window.dispatchEvent(new CustomEvent("arshiam:mind-feedback", { detail: { ownerId } }));
    return true;
  } catch { return false; }
}

export function clearMindFeedback(ownerId: string): boolean {
  if (!ownerId) return false;
  try {
    localStorage.removeItem(key(ownerId));
    if (localStorage.getItem(key(ownerId)) !== null) return false;
    window.dispatchEvent(new CustomEvent("arshiam:mind-feedback", { detail: { ownerId } }));
    return true;
  } catch { return false; }
}
