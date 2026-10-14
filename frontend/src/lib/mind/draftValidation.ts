const object = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const strings = (value: unknown) => Array.isArray(value) && value.every(item => typeof item === "string");
const numberOrNull = (value: unknown) => value === null || (typeof value === "number" && Number.isFinite(value));
export const validMindTimestamp = (value: number) => Number.isFinite(value) && value >= 0 && value <= 8640000000000000;

/** Reject broken editor shapes without discarding their raw stored content.
 * Unknown slots remain inert in backups; known editors must never receive a
 * malformed value merely because its envelope has the correct owner.
 */
export function validMindDraftValue(slot: string, value: unknown): value is Record<string, unknown> {
  if (!object(value)) return false;
  if (slot === "home" || slot.startsWith("home:")) return typeof value.text === "string" && numberOrNull(value.mood) && numberOrNull(value.energy);
  if (slot === "thoughts" || slot.startsWith("thoughts:")) {
    const form = value.form;
    return object(form) && ["situation", "automatic_thought", "alternative_thought", "takeaway", "next_step"].every(key => typeof form[key] === "string")
      && ["emotions", "evidence_for", "evidence_against", "distortions"].every(key => strings(form[key]))
      && numberOrNull(form.emotion_intensity_before) && numberOrNull(form.emotion_intensity_after)
      && typeof value.recordId === "string" && ["full", "short"].includes(String(value.mode));
  }
  if (slot === "worry" || slot.startsWith("worry:")) return typeof value.worry === "string" && typeof value.stage === "string" && strings(value.solutions)
    && ["controllablePart", "uncontrollablePart", "acceptanceText", "problem", "taskTitle", "taskDescription", "clarification"].every(key => typeof value[key] === "string")
    && numberOrNull(value.chosenSolution) && typeof value.sessionId === "string";
  if (slot.startsWith("needs:")) {
    if (typeof value.answer !== "string" || typeof value.stage !== "string" || !Array.isArray(value.matches)) return false;
    const session = value.s;
    if (session === null) return true;
    if (!object(session) || typeof session.id !== "string" || typeof session.text !== "string" || !Array.isArray(session.qa) || !Array.isArray(session.questions)) return false;
    if (!session.qa.every(item => object(item) && typeof item.q === "string" && typeof item.a === "string") || !strings(session.questions)) return false;
    const result = session.result;
    return result === null || (object(result) && typeof result.summary === "string" && ["methodIds", "checkIds", "causes", "reflections"].every(key => strings(result[key])) && Array.isArray(result.suggestions)
      && result.suggestions.every(item => object(item) && typeof item.text === "string" && ["task", "note", "habit"].includes(String(item.kind))));
  }
  if (slot.startsWith("selfcheck:")) return Array.isArray(value.answers) && value.answers.every(numberOrNull) && typeof value.reflection === "string" && typeof value.reviewed === "boolean";
  if (slot.startsWith("method:")) return object(value.done) && Object.values(value.done).every(item => typeof item === "boolean") && ["title", "due", "privateNotes"].every(key => typeof value[key] === "string") && typeof value.preview === "boolean";
  if (slot.startsWith("checkin:")) return object(value.form) && ["quick", "full"].includes(String(value.mode)) && typeof value.dirty === "boolean"
    && ["mood", "energy", "focus", "sleep_quality", "stress"].every(key => numberOrNull(value.form[key])) && typeof value.form.sleep_hours === "string" && typeof value.form.notes === "string";
  return true;
}
