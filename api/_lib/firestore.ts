import firebaseConfig from "../../firebase-applet-config.json";
import type { AuthUser } from "./auth";

const PROJECT_ID =
  process.env.FIREBASE_PROJECT_ID || (firebaseConfig as any).projectId;
const DATABASE_ID =
  process.env.FIREBASE_DATABASE_ID ||
  (firebaseConfig as any).firestoreDatabaseId ||
  "(default)";

export const BASE_FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents`;

/**
 * Encodes a JavaScript primitive or object to Firestore REST typed value
 */
export function encodeValue(val: any): any {
  if (val === null || val === undefined) {
    return { nullValue: null };
  }
  if (typeof val === "boolean") {
    return { booleanValue: val };
  }
  if (typeof val === "number") {
    if (Number.isInteger(val)) {
      return { integerValue: String(val) };
    }
    return { doubleValue: val };
  }
  if (typeof val === "string") {
    return { stringValue: val };
  }
  if (Array.isArray(val)) {
    return {
      arrayValue: {
        values: val.map(encodeValue),
      },
    };
  }
  if (typeof val === "object") {
    const fields: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) {
        fields[k] = encodeValue(v);
      }
    }
    return { mapValue: { fields } };
  }
  return { stringValue: String(val) };
}

/**
 * Encodes a flat or nested JavaScript object into Firestore fields map
 */
export function encodeFirestoreFields(
  data: Record<string, any>
): Record<string, any> {
  const fields: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      fields[key] = encodeValue(value);
    }
  }
  return fields;
}

/**
 * Decodes a Firestore REST typed value to a JavaScript value
 */
export function decodeValue(val: any): any {
  if (!val || typeof val !== "object") return null;
  if ("stringValue" in val) return val.stringValue;
  if ("booleanValue" in val) return val.booleanValue;
  if ("integerValue" in val) return parseInt(val.integerValue, 10);
  if ("doubleValue" in val) return parseFloat(val.doubleValue);
  if ("nullValue" in val) return null;
  if ("timestampValue" in val) return val.timestampValue;
  if ("arrayValue" in val) {
    return (val.arrayValue.values || []).map(decodeValue);
  }
  if ("mapValue" in val) {
    return decodeFirestoreFields(val.mapValue.fields || {});
  }
  return null;
}

/**
 * Decodes Firestore fields map to regular JavaScript object
 */
export function decodeFirestoreFields(
  fields: Record<string, any>
): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields || {})) {
    result[key] = decodeValue(value);
  }
  return result;
}

/**
 * Parses a Firestore document response into a Task object with id, created_at, updated_at
 */
export function parseFirestoreDoc(doc: any): any {
  if (!doc) return null;
  const decoded = decodeFirestoreFields(doc.fields || {});
  const idFromPath = doc.name ? doc.name.split("/").pop() : "";
  return {
    id: decoded.id || idFromPath,
    ...decoded,
    created_at: decoded.created_at || doc.createTime,
    updated_at: decoded.updated_at || doc.updateTime,
  };
}

/**
 * Gets HTTP request headers including Bearer token if user.idToken is available
 */
export function getHeaders(user: AuthUser): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (user.idToken) {
    headers["Authorization"] = `Bearer ${user.idToken}`;
  }
  return headers;
}

/**
 * Lists tasks for the authenticated user with optional filters
 */
export async function listUserTasks(
  user: AuthUser,
  options?: {
    completed?: boolean;
    priority?: string;
    status?: string;
    folder_id?: string;
    search?: string;
    limit?: number;
  }
): Promise<any[]> {
  const url = `${BASE_FIRESTORE_URL}/users/${encodeURIComponent(
    user.userId
  )}/tasks?pageSize=100`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(user),
  });

  if (!res.ok) {
    if (res.status === 404) return [];
    const errText = await res.text();
    console.error("[Firestore] listUserTasks failed:", res.status, errText);
    throw new Error(`Firestore query error: ${res.statusText}`);
  }

  const data: any = await res.json();
  let tasks = (data.documents || []).map(parseFirestoreDoc);

  // Filter completed
  if (options?.completed !== undefined) {
    tasks = tasks.filter(
      (t: any) => Boolean(t.completed) === options.completed
    );
  }

  // Filter priority
  if (options?.priority) {
    tasks = tasks.filter((t: any) => t.priority === options.priority);
  }

  // Filter status
  if (options?.status) {
    tasks = tasks.filter((t: any) => t.status === options.status);
  }

  // Filter folder
  if (options?.folder_id) {
    tasks = tasks.filter((t: any) => t.folder_id === options.folder_id);
  }

  // Search query
  if (options?.search) {
    const q = options.search.toLowerCase();
    tasks = tasks.filter(
      (t: any) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Sort: pinned first, then due_date ascending, then created_at desc
  tasks.sort((a: any, b: any) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    const dateA = a.due_date || "9999-12-31";
    const dateB = b.due_date || "9999-12-31";
    if (dateA !== dateB) return dateA.localeCompare(dateB);
    return (
      new Date(b.created_at || 0).getTime() -
      new Date(a.created_at || 0).getTime()
    );
  });

  const limit = options?.limit && options.limit > 0 ? options.limit : 50;
  return tasks.slice(0, limit);
}

/**
 * Gets a specific task by ID, verifying user ownership
 */
export async function getUserTaskById(
  user: AuthUser,
  taskId: string
): Promise<any | null> {
  if (!taskId) return null;
  const url = `${BASE_FIRESTORE_URL}/users/${encodeURIComponent(
    user.userId
  )}/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: "GET",
    headers: getHeaders(user),
  });

  if (res.status === 404) {
    return null;
  }
  if (!res.ok) {
    const errText = await res.text();
    console.error("[Firestore] getUserTaskById failed:", res.status, errText);
    throw new Error(`Firestore error: ${res.statusText}`);
  }

  const doc = await res.json();
  return parseFirestoreDoc(doc);
}

/**
 * Creates a new task in /users/{userId}/tasks
 */
export async function createUserTask(
  user: AuthUser,
  taskInput: any
): Promise<any> {
  const taskId =
    taskInput.id ||
    `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const now = new Date().toISOString();

  const taskData = {
    id: taskId,
    user_id: user.userId,
    title: taskInput.title,
    description: taskInput.description || null,
    completed: Boolean(taskInput.completed),
    priority: taskInput.priority || "p4",
    status:
      taskInput.status || (taskInput.completed ? "done" : "todo"),
    due_date: taskInput.due_date || null,
    folder_id: taskInput.folder_id || null,
    pinned: Boolean(taskInput.pinned),
    start_at: taskInput.start_at || null,
    end_at: taskInput.end_at || null,
    estimated_minutes:
      taskInput.estimated_minutes !== undefined
        ? taskInput.estimated_minutes
        : null,
    created_at: now,
    updated_at: now,
  };

  const url = `${BASE_FIRESTORE_URL}/users/${encodeURIComponent(
    user.userId
  )}/tasks?documentId=${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: getHeaders(user),
    body: JSON.stringify({
      fields: encodeFirestoreFields(taskData),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Firestore] createUserTask failed:", res.status, errText);
    throw new Error(`Firestore create error: ${res.statusText}`);
  }

  const doc = await res.json();
  return parseFirestoreDoc(doc) || taskData;
}

/**
 * Updates a task in /users/{userId}/tasks/{taskId}
 */
export async function updateUserTask(
  user: AuthUser,
  taskId: string,
  updates: Record<string, any>
): Promise<any | null> {
  const existing = await getUserTaskById(user, taskId);
  if (!existing) {
    return null;
  }

  const now = new Date().toISOString();
  const fieldsToUpdate: Record<string, any> = {
    ...updates,
    updated_at: now,
  };

  // Keep completed and status synchronized
  if (updates.completed !== undefined && updates.status === undefined) {
    fieldsToUpdate.status = updates.completed ? "done" : "todo";
  } else if (updates.status !== undefined && updates.completed === undefined) {
    fieldsToUpdate.completed = updates.status === "done";
  }

  // Prevent modifying immutable identifiers
  delete fieldsToUpdate.user_id;
  delete fieldsToUpdate.id;

  const fieldPaths = Object.keys(fieldsToUpdate);
  if (fieldPaths.length === 0) {
    return existing;
  }

  const updateMaskQuery = fieldPaths
    .map((f) => `updateMask.fieldPaths=${encodeURIComponent(f)}`)
    .join("&");

  const url = `${BASE_FIRESTORE_URL}/users/${encodeURIComponent(
    user.userId
  )}/tasks/${encodeURIComponent(taskId)}?${updateMaskQuery}`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: getHeaders(user),
    body: JSON.stringify({
      fields: encodeFirestoreFields(fieldsToUpdate),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[Firestore] updateUserTask failed:", res.status, errText);
    throw new Error(`Firestore update error: ${res.statusText}`);
  }

  const doc = await res.json();
  return parseFirestoreDoc(doc);
}

/**
 * Deletes a task from /users/{userId}/tasks/{taskId}
 */
export async function deleteUserTask(
  user: AuthUser,
  taskId: string
): Promise<boolean> {
  const url = `${BASE_FIRESTORE_URL}/users/${encodeURIComponent(
    user.userId
  )}/tasks/${encodeURIComponent(taskId)}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: getHeaders(user),
  });

  if (res.status === 404) {
    return false;
  }
  if (!res.ok) {
    const errText = await res.text();
    console.error("[Firestore] deleteUserTask failed:", res.status, errText);
    throw new Error(`Firestore delete error: ${res.statusText}`);
  }

  return true;
}

/**
 * Returns tasks scheduled for today and overdue incomplete tasks
 */
export async function getTodayTasks(user: AuthUser): Promise<{
  today: any[];
  overdue: any[];
  summary: {
    totalToday: number;
    totalOverdue: number;
    completedCount: number;
  };
}> {
  const allTasks = await listUserTasks(user, { limit: 100 });
  const todayStr = new Date().toISOString().slice(0, 10);

  const todayTasks: any[] = [];
  const overdueTasks: any[] = [];

  for (const t of allTasks) {
    if (!t.due_date) continue;
    const taskDueDate = t.due_date.slice(0, 10);
    if (taskDueDate === todayStr) {
      todayTasks.push(t);
    } else if (taskDueDate < todayStr && !t.completed) {
      overdueTasks.push(t);
    }
  }

  const completedToday = todayTasks.filter((t) => t.completed).length;

  return {
    today: todayTasks,
    overdue: overdueTasks,
    summary: {
      totalToday: todayTasks.length,
      totalOverdue: overdueTasks.length,
      completedCount: completedToday,
    },
  };
}
