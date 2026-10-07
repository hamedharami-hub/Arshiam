import { InvalidTaskInputError, taskCompletionWrite, validateTaskInput } from "./taskInput.js";
import { createHash, randomBytes } from "node:crypto";
import { adminDb, type AssistantGrant } from "./assistantAccess.js";
import { normalizeTaskPriority, normalizeTaskScheduleInput, scheduleWrite, stripRemovedTaskTimeFields } from "./taskSchedule.js";

// One schedule per task: `work_date` (day or instant). `due_date` is still accepted from older callers and
// stored as work_date. Time block (start_at/end_at/estimated_minutes) is no longer part of the model.
const allowedFields = ["title", "description", "priority", "status", "completed", "folder_id", "pinned", "deadline_date"] as const;
const writeFields = new Set<string>(allowedFields);

export function assistantTaskCollectionPath(grant: AssistantGrant) {
  return `users/${grant.userId}/tasks`;
}

function collection(grant: AssistantGrant) {
  return adminDb().collection(assistantTaskCollectionPath(grant));
}

function auditData(grant: AssistantGrant, action: string, taskId: string, before?: Record<string, unknown>) {
  return {
    grantId: grant.id, action, taskId, at: new Date().toISOString(), ...(before ? { before } : {}),
  };
}

export async function listAssistantTasks(grant: AssistantGrant, search?: string, limit = 100) {
  const snapshot = await collection(grant).get();
  const needle = (search || "").toLocaleLowerCase();
  const pageSize = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 100) : 100;
  return snapshot.docs.map((doc) => stripRemovedTaskTimeFields({ id: doc.id, ...doc.data() }))
    .filter((task: any) => !needle || `${task.title || ""} ${task.description || ""}`.toLocaleLowerCase().includes(needle))
    .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, pageSize);
}

export async function getAssistantTask(grant: AssistantGrant, id: string) {
  const doc = await collection(grant).doc(id).get();
  return doc.exists ? stripRemovedTaskTimeFields({ id: doc.id, ...doc.data() }) : null;
}

export async function createAssistantTask(grant: AssistantGrant, input: any) {
  const completion = taskCompletionWrite(input, true);
  const externalRef = typeof input.external_ref === "string" ? input.external_ref.trim() : "";
  if (externalRef.length > 2048) throw new InvalidTaskInputError("External reference is too long.");
  const id = externalRef
    ? `task_ai_${createHash("sha256").update(`${grant.userId}\0${externalRef}`).digest("hex").slice(0, 32)}`
    : `task_${Date.now()}_${randomBytes(8).toString("hex")}`;
  if (externalRef) {
    const existing = await collection(grant).doc(id).get();
    if (existing.exists) return stripRemovedTaskTimeFields({ id, ...existing.data(), alreadyExists: true });
  }
  const now = new Date().toISOString();
  const task: Record<string, unknown> = {
    id, user_id: grant.userId, title: input.title.trim(), description: input.description || null,
    ...completion, priority: normalizeTaskPriority(input.priority),
    ...(normalizeTaskScheduleInput(input, input.schedule_timezone) || scheduleWrite(null)),
    ...(Object.prototype.hasOwnProperty.call(input, "deadline_date") ? { deadline_date: input.deadline_date } : {}),
    folder_id: input.folder_id || null, pinned: Boolean(input.pinned),
    created_at: now, updated_at: now, ...(externalRef ? { external_ref: externalRef } : {}),
  };
  const batch = adminDb().batch();
  batch.create(collection(grant).doc(id), task);
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_audit`).doc(), auditData(grant, "create", id));
  try {
    await batch.commit();
  } catch (error) {
    // A concurrent request with the same external reference may have created the
    // deterministic ID after the initial read. Return that task on this one race.
    if (externalRef) {
      const existing = await collection(grant).doc(id).get();
      if (existing.exists) return stripRemovedTaskTimeFields({ id, ...existing.data(), alreadyExists: true });
    }
    throw error;
  }
  return task;
}

export async function updateAssistantTask(grant: AssistantGrant, id: string, input: any) {
  validateTaskInput(input);
  const ref = collection(grant).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (writeFields.has(key)) patch[key] = value;
  }
  const schedule = normalizeTaskScheduleInput(input || {}, snapshot.data()?.schedule_timezone);
  if (schedule) Object.assign(patch, schedule);
  if (typeof patch.title === "string") patch.title = patch.title.trim();
  if (input?.priority !== undefined) patch.priority = normalizeTaskPriority(input.priority);
  Object.assign(patch, taskCompletionWrite(input));
  if (Object.keys(patch).length === 0) throw new InvalidTaskInputError("No editable fields supplied.");
  patch.updated_at = new Date().toISOString();
  const batch = adminDb().batch();
  batch.update(ref, patch);
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_audit`).doc(), auditData(grant, "update", id, snapshot.data()));
  await batch.commit();
  return stripRemovedTaskTimeFields({ id, ...snapshot.data(), ...patch });
}

export async function deleteAssistantTask(grant: AssistantGrant, id: string) {
  const ref = collection(grant).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return false;
  const backup = { id, ...snapshot.data(), deletedAt: new Date().toISOString(), grantId: grant.id };
  const batch = adminDb().batch();
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_trash`).doc(), backup);
  batch.delete(ref);
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_audit`).doc(), auditData(grant, "delete", id));
  await batch.commit();
  return true;
}
