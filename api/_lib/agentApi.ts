import { InvalidTaskInputError, taskCompletionWrite, validateTaskInput } from "./taskInput.js";
import { InvalidTaskPriorityError, InvalidTaskScheduleError, normalizeTaskPriority, normalizeTaskScheduleInput, normalizeTimeZone, scheduleWrite, stripRemovedTaskTimeFields, taskDateOf, taskDayOf } from "./taskSchedule.js";
import { randomBytes, createHash } from "node:crypto";
import {
  adminDb,
  AssistantConfigurationError,
  authenticateAssistant,
  testStore,
  type AssistantGrant,
} from "./assistantAccess.js";
import { handleCors, parseBody, sendError, sendJson, sendRequestBodyError } from "./response.js";
import { checkRateLimit } from "./rateLimiter.js";

// In-memory idempotency cache (key -> response payload)
const idempotencyCache = new Map<string, { body: any; status: number; timestamp: number }>();

function getIdempotencyKey(req: any, body: any): string | null {
  const header =
    req.headers?.["idempotency-key"] ||
    req.headers?.["Idempotency-Key"] ||
    req.headers?.["x-idempotency-key"] ||
    body?.idempotency_key;
  return typeof header === "string" && header.trim().length > 0 ? header.trim() : null;
}

function checkIdempotency(cacheKey: string): { body: any; status: number } | null {
  const entry = idempotencyCache.get(cacheKey);
  if (!entry) return null;
  // Expire after 24 hours
  if (Date.now() - entry.timestamp > 86400000) {
    idempotencyCache.delete(cacheKey);
    return null;
  }
  return { body: entry.body, status: entry.status };
}

function saveIdempotency(cacheKey: string, status: number, body: any) {
  idempotencyCache.set(cacheKey, { body, status, timestamp: Date.now() });
}

function canonicalJson(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().filter((key) => value[key] !== undefined && key !== "idempotency_key")
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

async function createTaskIdempotently(grant: AssistantGrant, key: string, requestBody: any, taskData: any) {
  const identity = createHash("sha256").update(`task_create\0${grant.id}\0${key}`).digest("hex");
  const requestHash = createHash("sha256").update(canonicalJson(requestBody)).digest("hex");
  const recordId = `${grant.userId}:${identity}`;
  const response = { data: stripRemovedTaskTimeFields(taskData), meta: { action: "created", timestamp: taskData.created_at } };
  const expiresAt = Date.now() + 86400000;
  if (testStore.enabled) {
    const previous = testStore.idempotency.get(recordId);
    if (previous && previous.expiresAt > Date.now()) {
      return previous.requestHash === requestHash ? { status: 201, body: previous.response } : { status: 409, body: null };
    }
    testStore.tasks.set(taskData.id, taskData);
    testStore.audit.push({ grantId: grant.id, userId: grant.userId, action: "tasks:create", entityId: taskData.id, safeSummary: taskData.title, timestamp: taskData.created_at });
    testStore.idempotency.set(recordId, { requestHash, response, expiresAt });
    return { status: 201, body: response };
  }

  const db = adminDb();
  const recordRef = db.doc(`users/${grant.userId}/assistant_idempotency/${identity}`);
  return db.runTransaction(async (transaction) => {
    const previous = await transaction.get(recordRef);
    const record = previous.data();
    if (record && record.expiresAt > Date.now()) {
      return record.requestHash === requestHash
        ? { status: 201, body: record.response }
        : { status: 409, body: null };
    }
    transaction.create(db.doc(`users/${grant.userId}/tasks/${taskData.id}`), taskData);
    transaction.set(recordRef, { requestHash, response, expiresAt });
    transaction.create(db.collection(`users/${grant.userId}/assistant_audit`).doc(), {
      grantId: grant.id, userId: grant.userId, action: "tasks:create", entityId: taskData.id,
      safeSummary: taskData.title, timestamp: taskData.created_at,
    });
    return { status: 201, body: response };
  });
}

export function resetIdempotencyCache() {
  idempotencyCache.clear();
}

/** Record safe audit log without leaking sensitive notes, diary or mental health content */
async function auditLog(
  grant: AssistantGrant,
  action: string,
  entityId: string,
  safeSummary?: string
) {
  const record = {
    grantId: grant.id,
    userId: grant.userId,
    action,
    entityId,
    safeSummary: safeSummary || null,
    timestamp: new Date().toISOString(),
  };

  if (testStore.enabled) {
    testStore.audit.push(record);
    return;
  }

  try {
    await adminDb().collection(`users/${grant.userId}/assistant_audit`).add(record);
  } catch (err) {
    console.warn("[AgentAudit] Failed to record audit log", err);
  }
}

// -------------------------------------------------------------
// Database Access Helpers (Firestore / TestStore)
// -------------------------------------------------------------

async function getCollectionDocs(grant: AssistantGrant, collectionName: string): Promise<any[]> {
  if (testStore.enabled) {
    const storeMap: Map<string, any> =
      collectionName === "tasks"
        ? testStore.tasks
        : collectionName === "folders"
        ? testStore.folders
        : testStore.notes;

    const rows = Array.from(storeMap.values()).filter((item) => item.user_id === grant.userId);
    return collectionName === "tasks" ? rows.map(stripRemovedTaskTimeFields) : rows;
  }

  const snapshot = await adminDb().collection(`users/${grant.userId}/${collectionName}`).get();
  const rows = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  return collectionName === "tasks" ? rows.map(stripRemovedTaskTimeFields) : rows;
}

async function getDocById(grant: AssistantGrant, collectionName: string, id: string): Promise<any | null> {
  if (testStore.enabled) {
    const storeMap: Map<string, any> =
      collectionName === "tasks"
        ? testStore.tasks
        : collectionName === "folders"
        ? testStore.folders
        : testStore.notes;

    const item = storeMap.get(id);
    if (!item || item.user_id !== grant.userId) return null;
    return collectionName === "tasks" ? stripRemovedTaskTimeFields(item) : item;
  }

  const doc = await adminDb().doc(`users/${grant.userId}/${collectionName}/${id}`).get();
  if (!doc.exists) return null;
  const item = { id: doc.id, ...doc.data() };
  return collectionName === "tasks" ? stripRemovedTaskTimeFields(item) : item;
}

async function saveDoc(
  grant: AssistantGrant,
  collectionName: string,
  id: string,
  data: any,
  isUpdate = false
): Promise<any> {
  if (testStore.enabled) {
    const storeMap: Map<string, any> =
      collectionName === "tasks"
        ? testStore.tasks
        : collectionName === "folders"
        ? testStore.folders
        : testStore.notes;

    const existing = storeMap.get(id);
    const finalDoc = isUpdate ? { ...existing, ...data, id, user_id: grant.userId } : { ...data, id, user_id: grant.userId };
    storeMap.set(id, finalDoc);
    return collectionName === "tasks" ? stripRemovedTaskTimeFields(finalDoc) : finalDoc;
  }

  const ref = adminDb().doc(`users/${grant.userId}/${collectionName}/${id}`);
  if (isUpdate) {
    await ref.update(data);
    const updated = await ref.get();
    const result = { id, ...updated.data() };
    return collectionName === "tasks" ? stripRemovedTaskTimeFields(result) : result;
  } else {
    await ref.set(data);
    const result = { id, ...data };
    return collectionName === "tasks" ? stripRemovedTaskTimeFields(result) : result;
  }
}

// -------------------------------------------------------------
// Pagination Helper
// -------------------------------------------------------------

function paginateList(items: any[], page = 1, pageSize = 50) {
  const p = Math.max(1, Number.isFinite(page) ? Math.floor(page) : 1);
  const ps = Math.min(100, Math.max(1, Number.isFinite(pageSize) ? Math.floor(pageSize) : 50));
  const total = items.length;
  const start = (p - 1) * ps;
  const slice = items.slice(start, start + ps);
  const hasMore = start + ps < total;
  const nextCursor = hasMore ? String(p + 1) : null;

  return {
    data: slice,
    pagination: {
      page: p,
      page_size: ps,
      total,
      has_more: hasMore,
      next_cursor: nextCursor,
    },
  };
}

// -------------------------------------------------------------
// Tasks Handlers
// -------------------------------------------------------------

async function handleGetTasks(grant: AssistantGrant, query: any, res: any) {
  const allTasks = await getCollectionDocs(grant, "tasks");
  const userTimeZone = query.time_zone === undefined ? undefined : normalizeTimeZone(query.time_zone);
  if (query.time_zone !== undefined && !userTimeZone) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid IANA 'time_zone' query parameter.");
  }

  let filtered = allTasks;

  if (query.status) {
    filtered = filtered.filter((t) => t.status === query.status);
  }
  if (query.priority) {
    const requestedPriority = normalizeTaskPriority(query.priority);
    filtered = filtered.filter((t) => normalizeTaskPriority(t.priority) === requestedPriority);
  }
  if (query.completed !== undefined) {
    const isCompleted = query.completed === "true" || query.completed === true;
    filtered = filtered.filter((t) => Boolean(t.completed) === isCompleted);
  }
  if (query.folder_id) {
    filtered = filtered.filter((t) => t.folder_id === query.folder_id);
  }
  if (query.due_date) {
    filtered = filtered.filter((t) => (taskDayOf(t, userTimeZone) || "").startsWith(query.due_date));
  }
  if (query.from_date) {
    filtered = filtered.filter((t) => { const day = taskDayOf(t, userTimeZone); return day !== null && day >= query.from_date; });
  }
  if (query.to_date) {
    filtered = filtered.filter((t) => { const day = taskDayOf(t, userTimeZone); return day !== null && day <= query.to_date; });
  }
  if (query.search) {
    const q = String(query.search).toLowerCase();
    filtered = filtered.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }

  // Sort by created_at desc
  filtered.sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));

  const page = Number(query.page || 1);
  const pageSize = Number(query.page_size || 50);

  return sendJson(res, 200, paginateList(filtered, page, pageSize));
}

async function handleGetTask(grant: AssistantGrant, taskId: string, res: any) {
  const task = await getDocById(grant, "tasks", taskId);
  if (!task) {
    return sendError(res, 404, "NOT_FOUND", "Task not found.");
  }
  return sendJson(res, 200, { data: task });
}

async function handleCreateTask(grant: AssistantGrant, body: any, req: any, res: any) {
  if (typeof body?.title !== "string" || !body.title.trim()) {
    return sendError(res, 400, "VALIDATION_ERROR", "Task title is required.");
  }
  if (body.title.trim().length > 500) {
    return sendError(res, 400, "VALIDATION_ERROR", "Task title cannot exceed 500 characters.");
  }

  const idempotencyKey = getIdempotencyKey(req, body);
  if (idempotencyKey && idempotencyKey.length > 2048) {
    return sendError(res, 400, "VALIDATION_ERROR", "Idempotency key is too long.");
  }

  const now = new Date().toISOString();
  const id = `task_${Date.now()}_${randomBytes(8).toString("hex")}`;
  const completion = taskCompletionWrite(body, true);

  const taskData: any = {
    id,
    user_id: grant.userId,
    title: body.title.trim(),
    description: typeof body.description === "string" ? body.description.trim() : null,
    priority: normalizeTaskPriority(body.priority),
    ...completion,
    ...(normalizeTaskScheduleInput(body, body.schedule_timezone) || scheduleWrite(null)),
    folder_id: body.folder_id || null,
    pinned: Boolean(body.pinned),
    recurrence: body.recurrence || "none",
    created_at: now,
    updated_at: now,
  };

  if (idempotencyKey) {
    const result = await createTaskIdempotently(grant, idempotencyKey, body, taskData);
    if (result.status === 409) return sendError(res, 409, "IDEMPOTENCY_CONFLICT", "The idempotency key was already used with different task input.");
    return sendJson(res, result.status, result.body);
  }

  const created = await saveDoc(grant, "tasks", id, taskData, false);
  await auditLog(grant, "tasks:create", id, taskData.title);

  const responseBody = {
    data: created,
    meta: {
      action: "created",
      timestamp: now,
    },
  };

  return sendJson(res, 201, responseBody);
}

async function handlePatchTask(grant: AssistantGrant, taskId: string, body: any, res: any) {
  validateTaskInput(body);
  const existing = await getDocById(grant, "tasks", taskId);
  if (!existing) {
    return sendError(res, 404, "NOT_FOUND", "Task not found.");
  }

  const allowedUpdates = [
    "title",
    "description",
    "priority",
    "status",
    "completed",
    "folder_id",
    "pinned",
    "recurrence",
  ];

  const patch: Record<string, any> = {};
  for (const field of allowedUpdates) {
    if (body[field] !== undefined) {
      patch[field] = body[field];
    }
  }
  if (body.priority !== undefined) patch.priority = normalizeTaskPriority(body.priority);
  // One schedule: a new day/instant replaces any earlier schedule (legacy `due_date` accepted).
  const schedule = normalizeTaskScheduleInput(body, existing.schedule_timezone);
  if (schedule) Object.assign(patch, schedule);

  if (typeof patch.title === "string") {
    patch.title = patch.title.trim();
    if (!patch.title) {
      return sendError(res, 400, "VALIDATION_ERROR", "Task title cannot be empty.");
    }
  }

  Object.assign(patch, taskCompletionWrite(body));

  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "No valid editable fields provided.");
  }

  const now = new Date().toISOString();
  patch.updated_at = now;

  const updated = await saveDoc(grant, "tasks", taskId, patch, true);
  await auditLog(grant, "tasks:update", taskId, patch.title || existing.title);

  return sendJson(res, 200, {
    data: updated,
    meta: {
      action: "updated",
      timestamp: now,
    },
  });
}

async function handleCompleteTask(grant: AssistantGrant, taskId: string, res: any) {
  const existing = await getDocById(grant, "tasks", taskId);
  if (!existing) return sendError(res, 404, "NOT_FOUND", "Task not found.");

  const now = new Date().toISOString();
  const patch = {
    completed: true,
    status: "done",
    completed_at: now,
    updated_at: now,
  };

  const updated = await saveDoc(grant, "tasks", taskId, patch, true);
  await auditLog(grant, "tasks:complete", taskId, existing.title);

  return sendJson(res, 200, {
    data: updated,
    meta: { action: "completed", timestamp: now },
  });
}

async function handleReopenTask(grant: AssistantGrant, taskId: string, res: any) {
  const existing = await getDocById(grant, "tasks", taskId);
  if (!existing) return sendError(res, 404, "NOT_FOUND", "Task not found.");

  const now = new Date().toISOString();
  const patch = {
    completed: false,
    status: "todo",
    completed_at: null,
    updated_at: now,
  };

  const updated = await saveDoc(grant, "tasks", taskId, patch, true);
  await auditLog(grant, "tasks:reopen", taskId, existing.title);

  return sendJson(res, 200, {
    data: updated,
    meta: { action: "reopened", timestamp: now },
  });
}

// -------------------------------------------------------------
// Folders Handlers
// -------------------------------------------------------------

async function handleGetFolders(grant: AssistantGrant, query: any, res: any) {
  const [folders, tasks] = await Promise.all([
    getCollectionDocs(grant, "folders"),
    getCollectionDocs(grant, "tasks"),
  ]);

  const taskCounts: Record<string, number> = {};
  for (const t of tasks) {
    if (t.folder_id) {
      taskCounts[t.folder_id] = (taskCounts[t.folder_id] || 0) + 1;
    }
  }

  const enriched = folders.map((f) => ({
    ...f,
    task_count: taskCounts[f.id] || 0,
  }));

  enriched.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  const page = Number(query.page || 1);
  const pageSize = Number(query.page_size || 50);

  return sendJson(res, 200, paginateList(enriched, page, pageSize));
}

async function handleGetFolder(grant: AssistantGrant, folderId: string, res: any) {
  const folder = await getDocById(grant, "folders", folderId);
  if (!folder) return sendError(res, 404, "NOT_FOUND", "Folder not found.");

  const tasks = await getCollectionDocs(grant, "tasks");
  const folderTasks = tasks.filter((t) => t.folder_id === folderId);

  return sendJson(res, 200, {
    data: {
      ...folder,
      task_count: folderTasks.length,
      tasks: folderTasks,
    },
  });
}

async function handleCreateFolder(grant: AssistantGrant, body: any, res: any) {
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  if (!name) {
    return sendError(res, 400, "VALIDATION_ERROR", "Folder name is required.");
  }
  if (name.length > 100) {
    return sendError(res, 400, "VALIDATION_ERROR", "Folder name cannot exceed 100 characters.");
  }

  const id = `folder_${Date.now()}_${randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const folderData = {
    id,
    user_id: grant.userId,
    name,
    parent_id: body.parent_id || null,
    color: body.color || "blue",
    position: typeof body.position === "number" ? body.position : 0,
    created_at: now,
    updated_at: now,
  };

  const created = await saveDoc(grant, "folders", id, folderData, false);
  await auditLog(grant, "folders:create", id, name);

  return sendJson(res, 201, {
    data: created,
    meta: { action: "created", timestamp: now },
  });
}

async function handlePatchFolder(grant: AssistantGrant, folderId: string, body: any, res: any) {
  const existing = await getDocById(grant, "folders", folderId);
  if (!existing) return sendError(res, 404, "NOT_FOUND", "Folder not found.");

  const patch: Record<string, any> = {};
  if (typeof body.name === "string") {
    const name = body.name.trim();
    if (!name) return sendError(res, 400, "VALIDATION_ERROR", "Folder name cannot be empty.");
    patch.name = name;
  }
  if (body.color !== undefined) patch.color = body.color;
  if (body.parent_id !== undefined) patch.parent_id = body.parent_id || null;
  if (typeof body.position === "number") patch.position = body.position;

  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "No editable fields supplied.");
  }

  const now = new Date().toISOString();
  patch.updated_at = now;

  const updated = await saveDoc(grant, "folders", folderId, patch, true);
  await auditLog(grant, "folders:update", folderId, patch.name || existing.name);

  return sendJson(res, 200, {
    data: updated,
    meta: { action: "updated", timestamp: now },
  });
}

// -------------------------------------------------------------
// Memories & Notes Handlers (خاطرات و یادداشت‌ها)
// -------------------------------------------------------------

async function handleGetMemories(grant: AssistantGrant, query: any, res: any) {
  const allNotes = await getCollectionDocs(grant, "notes");

  let filtered = allNotes;

  if (query.kind === "diary") {
    filtered = filtered.filter((n) => n.kind === "diary");
  } else if (query.kind === "note") {
    filtered = filtered.filter((n) => n.kind !== "diary");
  }

  if (query.date) {
    filtered = filtered.filter((n) => n.diary_date === query.date || n.created_at?.startsWith(query.date));
  }
  if (query.folder_id) {
    filtered = filtered.filter((n) => n.folder_id === query.folder_id);
  }
  if (query.task_id) {
    filtered = filtered.filter((n) => n.task_id === query.task_id);
  }
  if (query.search) {
    const q = String(query.search).toLowerCase();
    filtered = filtered.filter(
      (n) =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q))
    );
  }

  filtered.sort((a, b) => String(b.updated_at || b.created_at || "").localeCompare(String(a.updated_at || a.created_at || "")));

  const page = Number(query.page || 1);
  const pageSize = Number(query.page_size || 50);

  return sendJson(res, 200, paginateList(filtered, page, pageSize));
}

async function handleGetMemory(grant: AssistantGrant, memoryId: string, res: any) {
  const memory = await getDocById(grant, "notes", memoryId);
  if (!memory) return sendError(res, 404, "NOT_FOUND", "Memory or note not found.");
  return sendJson(res, 200, { data: memory });
}

async function handleCreateMemory(grant: AssistantGrant, body: any, req: any, res: any) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";

  if (!title && !content) {
    return sendError(res, 400, "VALIDATION_ERROR", "Either title or content must be provided.");
  }

  const idempotencyKey = getIdempotencyKey(req, body);
  if (idempotencyKey) {
    const cacheKey = `memory_create_${grant.userId}_${idempotencyKey}`;
    const cached = checkIdempotency(cacheKey);
    if (cached) return sendJson(res, cached.status, cached.body);
  }

  const id = `note_${Date.now()}_${randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();
  const isDiary = body.kind === "diary";

  const noteData: any = {
    id,
    user_id: grant.userId,
    title,
    content,
    kind: isDiary ? "diary" : "note",
    pinned: Boolean(body.pinned),
    task_id: body.task_id || null,
    folder_id: body.folder_id || null,
    created_at: now,
    updated_at: now,
  };

  if (isDiary) {
    noteData.diary_date = body.diary_date || now.slice(0, 10);
    noteData.diary_mood = body.diary_mood || null;
    noteData.diary_background = body.diary_background || "paper";
  }

  const created = await saveDoc(grant, "notes", id, noteData, false);
  // Audit log safely without storing private reflection content
  await auditLog(grant, isDiary ? "memories:create_diary" : "memories:create_note", id, title || "Diary Entry");

  const responseBody = {
    data: created,
    meta: { action: "created", timestamp: now },
  };

  if (idempotencyKey) {
    saveIdempotency(`memory_create_${grant.userId}_${idempotencyKey}`, 201, responseBody);
  }

  return sendJson(res, 201, responseBody);
}

async function handlePatchMemory(grant: AssistantGrant, memoryId: string, body: any, res: any) {
  const existing = await getDocById(grant, "notes", memoryId);
  if (!existing) return sendError(res, 404, "NOT_FOUND", "Memory or note not found.");

  const patch: Record<string, any> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.content !== undefined) patch.content = String(body.content).trim();
  if (body.pinned !== undefined) patch.pinned = Boolean(body.pinned);
  if (body.task_id !== undefined) patch.task_id = body.task_id || null;
  if (body.folder_id !== undefined) patch.folder_id = body.folder_id || null;
  if (body.diary_date !== undefined) patch.diary_date = body.diary_date;
  if (body.diary_mood !== undefined) patch.diary_mood = body.diary_mood;

  if (Object.keys(patch).length === 0) {
    return sendError(res, 400, "VALIDATION_ERROR", "No editable fields supplied.");
  }

  const now = new Date().toISOString();
  patch.updated_at = now;

  const updated = await saveDoc(grant, "notes", memoryId, patch, true);
  await auditLog(grant, "memories:update", memoryId, patch.title || existing.title || "Note");

  return sendJson(res, 200, {
    data: updated,
    meta: { action: "updated", timestamp: now },
  });
}

// -------------------------------------------------------------
// Schedule & Calendar Handlers (برنامه‌ریزی و تقویم)
// -------------------------------------------------------------

/** A task with an explicit time (not a whole day) inside [start, end). */
function isTimedAt(t: any, start: string, end: string): boolean {
  const v = taskDateOf(t);
  if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const at = Date.parse(v);
  if (Number.isNaN(at)) return false;
  const a = Date.parse(start);
  const b = Date.parse(end || start);
  return at >= a && (b > a ? at < b : at === a);
}

async function handleGetSchedule(grant: AssistantGrant, type: "day" | "week" | "month", query: any, res: any) {
  const tasks = await getCollectionDocs(grant, "tasks");
  const baseDate = query.date ? new Date(query.date) : new Date();

  let startTime: number;
  let endTime: number;

  if (type === "day") {
    const d = new Date(baseDate);
    d.setHours(0, 0, 0, 0);
    startTime = d.getTime();
    d.setHours(23, 59, 59, 999);
    endTime = d.getTime();
  } else if (type === "week") {
    const d = new Date(baseDate);
    const dayOfWeek = d.getDay(); // 0 is Sunday
    d.setDate(d.getDate() - dayOfWeek);
    d.setHours(0, 0, 0, 0);
    startTime = d.getTime();
    d.setDate(d.getDate() + 6);
    d.setHours(23, 59, 59, 999);
    endTime = d.getTime();
  } else {
    // month
    const year = baseDate.getFullYear();
    const month = baseDate.getMonth();
    startTime = new Date(year, month, 1, 0, 0, 0).getTime();
    endTime = new Date(year, month + 1, 0, 23, 59, 59, 999).getTime();
  }

  const matching = tasks.filter((t) => {
    let tTime: number | null = null;
    if (taskDateOf(t)) tTime = Date.parse(taskDateOf(t)!);

    if (tTime && !isNaN(tTime)) {
      return tTime >= startTime && tTime <= endTime;
    }
    return false;
  });

  matching.sort((a, b) => {
    const timeA = Date.parse(taskDateOf(a) || "") || 0;
    const timeB = Date.parse(taskDateOf(b) || "") || 0;
    return timeA - timeB;
  });

  return sendJson(res, 200, {
    data: matching,
    meta: {
      type,
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString(),
      count: matching.length,
    },
  });
}

async function handleGetCalendarEvents(grant: AssistantGrant, query: any, res: any) {
  const startStr = query.start;
  const endStr = query.end;

  if (!startStr || !endStr) {
    return sendError(res, 400, "VALIDATION_ERROR", "Query parameters 'start' and 'end' in ISO 8601 are required.");
  }

  const startTime = Date.parse(startStr);
  const endTime = Date.parse(endStr);
  if (isNaN(startTime) || isNaN(endTime) || startTime > endTime) {
    return sendError(res, 400, "VALIDATION_ERROR", "Invalid start or end date range.");
  }

  const tasks = await getCollectionDocs(grant, "tasks");
  const events = tasks.filter((t) => {
    const eventStart = taskDateOf(t) ? Date.parse(taskDateOf(t)!) : null;
    const eventEnd = eventStart;

    if (!eventStart) return false;
    return (eventStart >= startTime && eventStart <= endTime) || (eventEnd && eventEnd >= startTime && eventEnd <= endTime);
  });

  events.sort((a, b) => {
    const timeA = Date.parse(taskDateOf(a) || "") || 0;
    const timeB = Date.parse(taskDateOf(b) || "") || 0;
    return timeA - timeB;
  });

  return sendJson(res, 200, {
    data: events,
    meta: {
      start: new Date(startTime).toISOString(),
      end: new Date(endTime).toISOString(),
      count: events.length,
    },
  });
}

async function handleCreateCalendarEvent(grant: AssistantGrant, body: any, req: any, res: any) {
  const title = typeof body?.title === "string" ? body.title.trim() : "";
  const startAt = typeof body?.start_at === "string" ? body.start_at : null;
  const endAt = typeof body?.end_at === "string" ? body.end_at : null;

  if (!title) return sendError(res, 400, "VALIDATION_ERROR", "Event title is required.");
  if (!startAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(startAt) || isNaN(Date.parse(startAt))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Valid 'start_at' timestamp in ISO 8601 is required.");
  }
  if (endAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(endAt) || isNaN(Date.parse(endAt)) || Date.parse(endAt) <= Date.parse(startAt))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Optional 'end_at' must be a valid instant after 'start_at'.");
  }

  // `end_at` is an optional, request-only conflict interval. With no explicit end,
  // this API checks only for another task at the same instant; nothing is stored.
  const effectiveEndAt = endAt || startAt;

  // Conflict detection
  const checkConflict = body.check_conflict !== false;
  if (checkConflict) {
    const tasks = await getCollectionDocs(grant, "tasks");
    const conflicting = tasks.filter((t) => isTimedAt(t, startAt, effectiveEndAt));

    if (conflicting.length > 0 && !body.force) {
      return sendJson(res, 409, {
        error: {
          code: "TIME_CONFLICT",
          message: "An overlapping event or task exists in this time interval.",
          details: {
            conflicting_events: conflicting.map((c) => ({
              id: c.id,
              title: c.title,
              work_date: taskDateOf(c),
            })),
          },
        },
      });
    }
  }

  const idempotencyKey = getIdempotencyKey(req, body);
  if (idempotencyKey) {
    const cacheKey = `calendar_create_${grant.userId}_${idempotencyKey}`;
    const cached = checkIdempotency(cacheKey);
    if (cached) return sendJson(res, cached.status, cached.body);
  }

  const id = `event_${Date.now()}_${randomBytes(6).toString("hex")}`;
  const now = new Date().toISOString();

  const eventData: any = {
    id,
    user_id: grant.userId,
    title,
    description: body.description || null,
    // One schedule: the event is a task at an explicit time (no time block / end time is stored).
    ...normalizeTaskScheduleInput({ work_date: startAt, schedule_timezone: body.schedule_timezone })!,
    completed: false,
    status: "todo",
    priority: normalizeTaskPriority(body.priority),
    folder_id: body.folder_id || null,
    created_at: now,
    updated_at: now,
  };

  const created = await saveDoc(grant, "tasks", id, eventData, false);
  await auditLog(grant, "calendar:create_event", id, title);

  const responseBody = {
    data: created,
    meta: { action: "created", timestamp: now },
  };

  if (idempotencyKey) {
    saveIdempotency(`calendar_create_${grant.userId}_${idempotencyKey}`, 201, responseBody);
  }

  return sendJson(res, 201, responseBody);
}

async function handlePatchCalendarEvent(grant: AssistantGrant, eventId: string, body: any, res: any) {
  const existing = await getDocById(grant, "tasks", eventId);
  if (!existing) return sendError(res, 404, "NOT_FOUND", "Event not found.");

  const newAt = typeof body.work_date === "string" ? body.work_date : typeof body.start_at === "string" ? body.start_at : null;
  const startAt = newAt || taskDateOf(existing);
  const endAt = typeof body.end_at === "string" ? body.end_at : startAt;

  if (body.end_at !== undefined && (!newAt || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(body.end_at) || isNaN(Date.parse(body.end_at)) || Date.parse(body.end_at) <= Date.parse(startAt || ""))) {
    return sendError(res, 400, "VALIDATION_ERROR", "Optional 'end_at' requires a new start instant and must be later than it.");
  }

  if (newAt) {
    if (newAt && (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/i.test(newAt) || isNaN(Date.parse(newAt)))) {
      return sendError(res, 400, "VALIDATION_ERROR", "Valid 'start_at' / 'work_date' in ISO 8601 is required.");
    }
    if (body.check_conflict !== false) {
      const tasks = await getCollectionDocs(grant, "tasks");
      const conflicting = tasks.filter((t) => t.id !== eventId && isTimedAt(t, startAt!, endAt!));

      if (conflicting.length > 0 && !body.force) {
        return sendJson(res, 409, {
          error: {
            code: "TIME_CONFLICT",
            message: "Time overlap detected with existing event.",
            details: {
              conflicting_events: conflicting.map((c) => ({
                id: c.id,
                title: c.title,
                work_date: taskDateOf(c),
              })),
            },
          },
        });
      }
    }
  }

  const patch: Record<string, any> = {};
  if (body.title !== undefined) patch.title = String(body.title).trim();
  if (body.description !== undefined) patch.description = body.description;
  if (newAt) Object.assign(patch, normalizeTaskScheduleInput({ work_date: newAt, schedule_timezone: body.schedule_timezone }, existing.schedule_timezone)!);
  else if (body.work_date === null) Object.assign(patch, scheduleWrite(null));
  if (body.status !== undefined) patch.status = body.status;
  if (body.completed !== undefined) patch.completed = Boolean(body.completed);

  const now = new Date().toISOString();
  patch.updated_at = now;

  const updated = await saveDoc(grant, "tasks", eventId, patch, true);
  await auditLog(grant, "calendar:update_event", eventId, patch.title || existing.title);

  return sendJson(res, 200, {
    data: updated,
    meta: { action: "updated", timestamp: now },
  });
}

// -------------------------------------------------------------
// Agent Me & Audit Log
// -------------------------------------------------------------

async function handleGetMe(grant: AssistantGrant, res: any) {
  return sendJson(res, 200, {
    data: {
      agent_id: grant.id,
      name: grant.name,
      scopes: grant.scopes,
      created_at: grant.createdAt,
      expires_at: grant.expiresAt,
      last_used_at: grant.lastUsedAt || null,
      status: grant.revokedAt ? "revoked" : Date.parse(grant.expiresAt) <= Date.now() ? "expired" : "active",
    },
  });
}

async function handleGetAuditLog(grant: AssistantGrant, query: any, res: any) {
  let logs: any[] = [];
  if (testStore.enabled) {
    logs = testStore.audit.filter((a) => a.userId === grant.userId && a.grantId === grant.id);
  } else {
    try {
      const snap = await adminDb()
        .collection(`users/${grant.userId}/assistant_audit`)
        .where("grantId", "==", grant.id)
        .limit(100)
        .get();
      logs = snap.docs.map((d) => d.data());
    } catch {
      logs = [];
    }
  }

  logs.sort((a, b) => String(b.timestamp || "").localeCompare(String(a.timestamp || "")));
  const page = Number(query.page || 1);
  const pageSize = Number(query.page_size || 50);

  return sendJson(res, 200, paginateList(logs, page, pageSize));
}

// -------------------------------------------------------------
// Unified Dispatcher: handleAgentRequest
// -------------------------------------------------------------

export async function handleAgentRequest(req: any, res: any): Promise<void> {
  if (handleCors(req, res)) return;

  const method = (req.method || "GET").toUpperCase();

  // HTTPS validation: in production headers
  const proto = req.headers?.["x-forwarded-proto"];
  if (proto && proto !== "https" && process.env.NODE_ENV === "production") {
    return sendError(res, 403, "HTTPS_REQUIRED", "Requests must be transmitted securely over HTTPS.");
  }

  // Rate Limiting
  const clientKey = req.headers?.authorization || req.socket?.remoteAddress || "global_client";
  const rateLimit = checkRateLimit(clientKey);
  res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
  if (!rateLimit.allowed) {
    res.setHeader("Retry-After", String(rateLimit.resetInSeconds));
    return sendError(res, 429, "RATE_LIMITED", "Too many requests. Please slow down.", {
      retry_after_seconds: rateLimit.resetInSeconds,
    });
  }

  // Extract path from req.url or req.query.path
  let pathname = "";
  try {
    const urlObj = new URL(req.url || "", "http://localhost");
    pathname = urlObj.pathname;
  } catch {
    pathname = req.url || "";
  }

  // If invoked via Vercel rewrite with query.path:
  if (req.query?.path) {
    const queryPath = Array.isArray(req.query.path) ? req.query.path.join("/") : req.query.path;
    if (queryPath) pathname = `/api/v1/agent/${queryPath}`;
  }

  // Normalize path by stripping trailing slash
  if (pathname.length > 1 && pathname.endsWith("/")) {
    pathname = pathname.slice(0, -1);
  }

  // Normalize relative path after /api/v1/agent
  const prefix = "/api/v1/agent";
  const subpath = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : pathname;
  const segments = subpath.split("/").filter(Boolean);

  res.setHeader("Cache-Control", "no-store");

  try {
    // 1. /api/v1/agent/me
    if (segments.length === 1 && segments[0] === "me" && method === "GET") {
      const grant = await authenticateAssistant(req, res);
      if (!grant) return;
      return handleGetMe(grant, res);
    }

    // 2. /api/v1/agent/audit-log
    if (segments.length === 1 && segments[0] === "audit-log" && method === "GET") {
      const grant = await authenticateAssistant(req, res, "tasks:read");
      if (!grant) return;
      return handleGetAuditLog(grant, req.query || {}, res);
    }

    // 3. /api/v1/agent/tasks...
    if (segments[0] === "tasks") {
      // GET /api/v1/agent/tasks
      if (segments.length === 1 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "tasks:read");
        if (!grant) return;
        return await handleGetTasks(grant, req.query || {}, res);
      }
      // POST /api/v1/agent/tasks
      if (segments.length === 1 && method === "POST") {
        const grant = await authenticateAssistant(req, res, "tasks:create");
        if (!grant) return;
        const body = await parseBody(req);
        return await handleCreateTask(grant, body, req, res);
      }
      // GET /api/v1/agent/tasks/:id
      if (segments.length === 2 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "tasks:read");
        if (!grant) return;
        return handleGetTask(grant, segments[1], res);
      }
      // PATCH /api/v1/agent/tasks/:id
      if (segments.length === 2 && method === "PATCH") {
        const grant = await authenticateAssistant(req, res, "tasks:update");
        if (!grant) return;
        const body = await parseBody(req);
        return await handlePatchTask(grant, segments[1], body, res);
      }
      // POST /api/v1/agent/tasks/:id/complete
      if (segments.length === 3 && segments[2] === "complete" && method === "POST") {
        const grant = await authenticateAssistant(req, res, "tasks:update");
        if (!grant) return;
        return handleCompleteTask(grant, segments[1], res);
      }
      // POST /api/v1/agent/tasks/:id/reopen
      if (segments.length === 3 && segments[2] === "reopen" && method === "POST") {
        const grant = await authenticateAssistant(req, res, "tasks:update");
        if (!grant) return;
        return handleReopenTask(grant, segments[1], res);
      }
    }

    // 4. /api/v1/agent/folders...
    if (segments[0] === "folders") {
      // GET /api/v1/agent/folders
      if (segments.length === 1 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "folders:read");
        if (!grant) return;
        return handleGetFolders(grant, req.query || {}, res);
      }
      // POST /api/v1/agent/folders
      if (segments.length === 1 && method === "POST") {
        const grant = await authenticateAssistant(req, res, "folders:write");
        if (!grant) return;
        const body = await parseBody(req);
        return handleCreateFolder(grant, body, res);
      }
      // GET /api/v1/agent/folders/:id
      if (segments.length === 2 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "folders:read");
        if (!grant) return;
        return handleGetFolder(grant, segments[1], res);
      }
      // PATCH /api/v1/agent/folders/:id
      if (segments.length === 2 && method === "PATCH") {
        const grant = await authenticateAssistant(req, res, "folders:write");
        if (!grant) return;
        const body = await parseBody(req);
        return handlePatchFolder(grant, segments[1], body, res);
      }
    }

    // 5. /api/v1/agent/memories...
    if (segments[0] === "memories") {
      // GET /api/v1/agent/memories
      if (segments.length === 1 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "memories:read");
        if (!grant) return;
        return handleGetMemories(grant, req.query || {}, res);
      }
      // POST /api/v1/agent/memories
      if (segments.length === 1 && method === "POST") {
        const grant = await authenticateAssistant(req, res, "memories:write");
        if (!grant) return;
        const body = await parseBody(req);
        return handleCreateMemory(grant, body, req, res);
      }
      // GET /api/v1/agent/memories/:id
      if (segments.length === 2 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "memories:read");
        if (!grant) return;
        return handleGetMemory(grant, segments[1], res);
      }
      // PATCH /api/v1/agent/memories/:id
      if (segments.length === 2 && method === "PATCH") {
        const grant = await authenticateAssistant(req, res, "memories:write");
        if (!grant) return;
        const body = await parseBody(req);
        return handlePatchMemory(grant, segments[1], body, res);
      }
    }

    // 6. /api/v1/agent/schedule...
    if (segments[0] === "schedule") {
      if (segments.length === 2 && (segments[1] === "day" || segments[1] === "week" || segments[1] === "month")) {
        if (method !== "GET") return sendError(res, 405, "METHOD_NOT_ALLOWED", "Use GET.");
        const grant = await authenticateAssistant(req, res, "calendar:read");
        if (!grant) return;
        return handleGetSchedule(grant, segments[1] as "day" | "week" | "month", req.query || {}, res);
      }
    }

    // 7. /api/v1/agent/calendar/events...
    if (segments[0] === "calendar" && segments[1] === "events") {
      // GET /api/v1/agent/calendar/events
      if (segments.length === 2 && method === "GET") {
        const grant = await authenticateAssistant(req, res, "calendar:read");
        if (!grant) return;
        return handleGetCalendarEvents(grant, req.query || {}, res);
      }
      // POST /api/v1/agent/calendar/events
      if (segments.length === 2 && method === "POST") {
        const grant = await authenticateAssistant(req, res, "calendar:write");
        if (!grant) return;
        const body = await parseBody(req);
        return await handleCreateCalendarEvent(grant, body, req, res);
      }
      // PATCH /api/v1/agent/calendar/events/:id
      if (segments.length === 3 && method === "PATCH") {
        const grant = await authenticateAssistant(req, res, "calendar:write");
        if (!grant) return;
        const body = await parseBody(req);
        return await handlePatchCalendarEvent(grant, segments[2], body, res);
      }
    }

    return sendError(res, 404, "NOT_FOUND", `Endpoint not found: ${method} ${pathname}`);
  } catch (error: any) {
    if (sendRequestBodyError(res, error)) return;
    if (error instanceof InvalidTaskInputError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    if (error instanceof InvalidTaskPriorityError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    if (error instanceof InvalidTaskScheduleError) return sendError(res, 400, "VALIDATION_ERROR", error.message);
    if (error instanceof AssistantConfigurationError) return sendError(res, 503, "SERVICE_NOT_CONFIGURED", error.message);
    console.error("[AgentApi] Internal server error", error);
    return sendError(res, 500, "INTERNAL_ERROR", "An unexpected error occurred.");
  }
}
