/** Shared validation for every public task-write surface. */
export class InvalidTaskInputError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidTaskInputError"; }
}

const statuses = new Set(["todo", "in_progress", "waiting", "done", "wont_do"]);

function isCalendarDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return false;
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

export function validateTaskInput(input: any): void {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new InvalidTaskInputError("Task input must be an object.");
  }
  if (input.title !== undefined && (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 500)) {
    throw new InvalidTaskInputError("A task title of 1 to 500 characters is required.");
  }
  if (input.description !== undefined && input.description !== null && typeof input.description !== "string") {
    throw new InvalidTaskInputError("description must be a string or null.");
  }
  for (const field of ["completed", "pinned"]) {
    if (input[field] !== undefined && typeof input[field] !== "boolean") {
      throw new InvalidTaskInputError(`${field} must be a boolean.`);
    }
  }
  if (input.status !== undefined && !statuses.has(input.status)) {
    throw new InvalidTaskInputError("Invalid task status.");
  }
  if (input.folder_id !== undefined && input.folder_id !== null && typeof input.folder_id !== "string") {
    throw new InvalidTaskInputError("folder_id must be a string or null.");
  }
  if (input.deadline_date !== undefined && input.deadline_date !== null && !isCalendarDate(input.deadline_date)) {
    throw new InvalidTaskInputError("deadline_date must be a real YYYY-MM-DD calendar date or null.");
  }
  if (input.completed !== undefined && input.status !== undefined && input.completed !== (input.status === "done")) {
    throw new InvalidTaskInputError("completed and status disagree.");
  }
}

/** Derive the other half of task completion, without changing metadata-only patches. */
export function taskCompletionWrite(input: any, creating = false): { completed?: boolean; status?: string } {
  validateTaskInput(input);
  if (input.status !== undefined) return { status: input.status, completed: input.status === "done" };
  if (input.completed !== undefined) return { completed: input.completed, status: input.completed ? "done" : "todo" };
  return creating ? { completed: false, status: "todo" } : {};
}
