/** Shared validation for every public task-write surface. */
export class InvalidTaskInputError extends Error {
  constructor(message: string) { super(message); this.name = "InvalidTaskInputError"; }
}

const statuses = new Set(["todo", "in_progress", "waiting", "done", "wont_do"]);

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
