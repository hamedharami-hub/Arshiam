import { createHash, randomBytes } from "node:crypto";
import { adminDb, type AssistantGrant } from "./assistantAccess";

const allowedFields = ["title", "description", "priority", "status", "completed", "due_date", "folder_id", "pinned", "start_at", "end_at", "estimated_minutes"] as const;
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
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((task: any) => !needle || `${task.title || ""} ${task.description || ""}`.toLocaleLowerCase().includes(needle))
    .sort((a: any, b: any) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, pageSize);
}

export async function getAssistantTask(grant: AssistantGrant, id: string) {
  const doc = await collection(grant).doc(id).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

export async function createAssistantTask(grant: AssistantGrant, input: any) {
  const externalRef = typeof input.external_ref === "string" ? input.external_ref.trim() : "";
  if (externalRef.length > 2048) throw new Error("External reference is too long.");
  const id = externalRef
    ? `task_ai_${createHash("sha256").update(`${grant.userId}\0${externalRef}`).digest("hex").slice(0, 32)}`
    : `task_${Date.now()}_${randomBytes(8).toString("hex")}`;
  if (externalRef) {
    const existing = await collection(grant).doc(id).get();
    if (existing.exists) return { id, ...existing.data(), alreadyExists: true };
  }
  const now = new Date().toISOString();
  const task: Record<string, unknown> = {
    id, user_id: grant.userId, title: input.title.trim(), description: input.description || null,
    completed: Boolean(input.completed), priority: input.priority || "p4",
    status: input.status || (input.completed ? "done" : "todo"), due_date: input.due_date || null,
    folder_id: input.folder_id || null, pinned: Boolean(input.pinned), start_at: input.start_at || null,
    end_at: input.end_at || null, estimated_minutes: input.estimated_minutes ?? null,
    created_at: now, updated_at: now, ...(externalRef ? { external_ref: externalRef } : {}),
  };
  const batch = adminDb().batch();
  batch.create(collection(grant).doc(id), task);
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_audit`).doc(), auditData(grant, "create", id));
  await batch.commit();
  return task;
}

export async function updateAssistantTask(grant: AssistantGrant, id: string, input: any) {
  const ref = collection(grant).doc(id);
  const snapshot = await ref.get();
  if (!snapshot.exists) return null;
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (writeFields.has(key)) patch[key] = value;
  }
  if (typeof patch.title === "string") patch.title = patch.title.trim();
  if (patch.title === "") throw new Error("Task title cannot be empty.");
  if (Object.keys(patch).length === 0) throw new Error("No editable fields supplied.");
  patch.updated_at = new Date().toISOString();
  const batch = adminDb().batch();
  batch.update(ref, patch);
  batch.create(adminDb().collection(`users/${grant.userId}/assistant_audit`).doc(), auditData(grant, "update", id, snapshot.data()));
  await batch.commit();
  return { id, ...snapshot.data(), ...patch };
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
