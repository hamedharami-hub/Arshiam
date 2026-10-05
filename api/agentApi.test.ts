import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  createGrant,
  listGrants,
  revokeGrant,
  authenticateAssistant,
  testStore,
  type AssistantGrant,
} from "./_lib/assistantAccess";
import { handleAgentRequest, resetIdempotencyCache } from "./_lib/agentApi";
import { checkRateLimit, resetRateLimits } from "./_lib/rateLimiter";

function createMockReqRes(options: {
  method?: string;
  url: string;
  token?: string;
  body?: any;
  headers?: Record<string, string>;
  query?: Record<string, any>;
}) {
  const req: any = {
    method: options.method || "GET",
    url: options.url,
    headers: {
      ...(options.token ? { authorization: `Bearer ${options.token}` } : {}),
      ...(options.headers || {}),
    },
    query: options.query || {},
    body: options.body || null,
  };

  const res: any = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name.toLowerCase()] = value;
    },
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(data: any) {
      this.body = JSON.stringify(data);
      return this;
    },
    end(data?: any) {
      if (data) this.body = typeof data === "string" ? data : JSON.stringify(data);
    },
  };

  return { req, res };
}

describe("AI Agent Personal Access Token & Isolation", () => {
  beforeEach(() => {
    testStore.enabled = true;
    testStore.reset();
    resetRateLimits();
    resetIdempotencyCache();
  });

  afterEach(() => {
    testStore.reset();
    testStore.enabled = false;
  });

  it("creates, hashes and validates agent token without storing raw secret", async () => {
    const { grant, secret } = await createGrant(
      "user_alpha",
      "Claude Agent",
      ["tasks:read", "tasks:write"],
      new Date(Date.now() + 86400000 * 30).toISOString()
    );

    expect(secret.startsWith("arshnaz_pat_")).toBe(true);
    expect(grant.userId).toBe("user_alpha");

    // The raw secret is NOT stored in grant
    expect((grant as any).secret).toBeUndefined();

    // Verification via Authorization header works
    const { req, res } = createMockReqRes({
      url: "/api/v1/agent/me",
      token: secret,
    });

    const authenticated = await authenticateAssistant(req, res, "tasks:read");
    expect(authenticated).not.toBeNull();
    expect(authenticated?.id).toBe(grant.id);
    expect(authenticated?.userId).toBe("user_alpha");
  });

  it("rejects expired and revoked agent tokens", async () => {
    // Expired token
    const { secret: expiredSecret } = await createGrant(
      "user_alpha",
      "Expired Agent",
      ["tasks:read"],
      new Date(Date.now() - 1000).toISOString()
    );

    const { req: req1, res: res1 } = createMockReqRes({
      url: "/api/v1/agent/me",
      token: expiredSecret,
    });
    const authExpired = await authenticateAssistant(req1, res1, "tasks:read");
    expect(authExpired).toBeNull();
    expect(res1.statusCode).toBe(401);

    // Revoked token
    const { grant: validGrant, secret: validSecret } = await createGrant(
      "user_alpha",
      "To be revoked",
      ["tasks:read"],
      new Date(Date.now() + 86400000).toISOString()
    );

    await revokeGrant("user_alpha", validGrant.id);

    const { req: req2, res: res2 } = createMockReqRes({
      url: "/api/v1/agent/me",
      token: validSecret,
    });
    const authRevoked = await authenticateAssistant(req2, res2, "tasks:read");
    expect(authRevoked).toBeNull();
    expect(res2.statusCode).toBe(401);
  });

  it("strictly enforces account isolation: Token of User A cannot access or mutate User B", async () => {
    // Create token for User A
    const { secret: tokenA } = await createGrant(
      "user_A",
      "Agent A",
      ["tasks:read", "tasks:write"],
      new Date(Date.now() + 86400000).toISOString()
    );

    // Pre-populate a task for User B
    testStore.tasks.set("task_B_secret", {
      id: "task_B_secret",
      user_id: "user_B",
      title: "User B Private Project",
      status: "todo",
    });

    // User A tries to GET User B's task
    const { req: getReq, res: getRes } = createMockReqRes({
      url: "/api/v1/agent/tasks/task_B_secret",
      token: tokenA,
    });
    await handleAgentRequest(getReq, getRes);
    expect(getRes.statusCode).toBe(404);

    // User A lists tasks: should only see User A's tasks
    const { req: listReq, res: listRes } = createMockReqRes({
      url: "/api/v1/agent/tasks",
      token: tokenA,
    });
    await handleAgentRequest(listReq, listRes);
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data).toHaveLength(0);
  });

  it("rejects invalid priority before create and filters legacy p1 tasks as high", async () => {
    const { secret } = await createGrant(
      "priority-user",
      "Priority Agent",
      ["tasks:read", "tasks:write"],
      new Date(Date.now() + 86400000).toISOString(),
    );
    const { req: createReq, res: createRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token: secret,
      body: { title: "Bad priority", priority: "p5" },
    });
    await handleAgentRequest(createReq, createRes);
    expect(createRes.statusCode).toBe(400);
    expect(JSON.parse(createRes.body).error.code).toBe("VALIDATION_ERROR");
    expect(testStore.tasks.size).toBe(0);

    testStore.tasks.set("legacy-p1", {
      id: "legacy-p1", user_id: "priority-user", title: "Legacy high priority",
      priority: "p1", status: "todo", completed: false,
      start_at: "2026-10-05T09:00:00Z", end_at: "2026-10-05T10:00:00Z",
    });
    const { req: listReq, res: listRes } = createMockReqRes({
      url: "/api/v1/agent/tasks",
      token: secret,
      query: { priority: "high" },
    });
    await handleAgentRequest(listReq, listRes);
    expect(listRes.statusCode).toBe(200);
    const filtered = JSON.parse(listRes.body).data;
    expect(filtered.map((task: any) => task.id)).toEqual(["legacy-p1"]);
    expect(filtered[0]).not.toHaveProperty("start_at");
    expect(filtered[0]).not.toHaveProperty("end_at");
  });

  it("enforces scope authorization: read-only token cannot write tasks", async () => {
    const { secret: readOnlyToken } = await createGrant(
      "user_alpha",
      "Read Only Agent",
      ["tasks:read"],
      new Date(Date.now() + 86400000).toISOString()
    );

    const { req, res } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token: readOnlyToken,
      body: { title: "Illegal Write" },
    });

    await handleAgentRequest(req, res);
    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.error.code).toBe("FORBIDDEN");
  });
});

describe("AI Agent API Endpoints (/api/v1/agent/*)", () => {
  let token: string;
  const userId = "test_user_777";

  beforeEach(async () => {
    testStore.enabled = true;
    testStore.reset();
    resetRateLimits();
    resetIdempotencyCache();

    const created = await createGrant(
      userId,
      "Master Agent",
      [
        "tasks:read",
        "tasks:write",
        "folders:read",
        "folders:write",
        "memories:read",
        "memories:write",
        "calendar:read",
        "calendar:write",
      ],
      new Date(Date.now() + 86400000 * 30).toISOString()
    );
    token = created.secret;
  });

  afterEach(() => {
    testStore.reset();
    testStore.enabled = false;
  });

  it("accepts granular create and update task grants", async () => {
    const expires = new Date(Date.now() + 86400000).toISOString();
    const { secret: createToken } = await createGrant(userId, "Creator", ["tasks:create"], expires);
    const create = createMockReqRes({ method: "POST", url: "/api/v1/agent/tasks", token: createToken, body: { title: "Granular" } });
    await handleAgentRequest(create.req, create.res);
    expect(create.res.statusCode).toBe(201);
    const taskId = JSON.parse(create.res.body).data.id;
    const { secret: updateToken } = await createGrant(userId, "Updater", ["tasks:update"], expires);
    const update = createMockReqRes({ method: "PATCH", url: `/api/v1/agent/tasks/${taskId}`, token: updateToken, body: { completed: true } });
    await handleAgentRequest(update.req, update.res);
    expect(update.res.statusCode).toBe(200);
    expect(JSON.parse(update.res.body).data.status).toBe("done");
  });

  it("1. GET /api/v1/agent/me returns agent metadata", async () => {
    const { req, res } = createMockReqRes({
      url: "/api/v1/agent/me",
      token,
    });
    await handleAgentRequest(req, res);
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.data.name).toBe("Master Agent");
    expect(body.data.status).toBe("active");
    expect(body.data.scopes).toContain("tasks:read");
  });

  it("2. Tasks CRUD, complete, reopen, search & pagination", async () => {
    // Create Task
    const { req: createReq, res: createRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token,
      body: {
        title: "Review Financial Report",
        description: "Verify Q3 numbers",
        priority: "p1",
        due_date: "2026-10-01",
      },
    });
    await handleAgentRequest(createReq, createRes);
    expect(createRes.statusCode).toBe(201);
    const createdTask = JSON.parse(createRes.body).data;
    expect(createdTask.id).toBeDefined();
    expect(createdTask.title).toBe("Review Financial Report");
    expect(createdTask.priority).toBe("high");

    // Get Single Task
    const { req: getReq, res: getRes } = createMockReqRes({
      url: `/api/v1/agent/tasks/${createdTask.id}`,
      token,
    });
    await handleAgentRequest(getReq, getRes);
    expect(getRes.statusCode).toBe(200);
    expect(JSON.parse(getRes.body).data.title).toBe("Review Financial Report");

    // Patch Task
    const { req: patchReq, res: patchRes } = createMockReqRes({
      method: "PATCH",
      url: `/api/v1/agent/tasks/${createdTask.id}`,
      token,
      body: { priority: "p2", description: "Updated Q3 details" },
    });
    await handleAgentRequest(patchReq, patchRes);
    expect(patchRes.statusCode).toBe(200);
    expect(JSON.parse(patchRes.body).data.priority).toBe("medium");

    // Complete Task
    const { req: completeReq, res: completeRes } = createMockReqRes({
      method: "POST",
      url: `/api/v1/agent/tasks/${createdTask.id}/complete`,
      token,
    });
    await handleAgentRequest(completeReq, completeRes);
    expect(completeRes.statusCode).toBe(200);
    expect(JSON.parse(completeRes.body).data.completed).toBe(true);
    expect(JSON.parse(completeRes.body).data.status).toBe("done");

    // Reopen Task
    const { req: reopenReq, res: reopenRes } = createMockReqRes({
      method: "POST",
      url: `/api/v1/agent/tasks/${createdTask.id}/reopen`,
      token,
    });
    await handleAgentRequest(reopenReq, reopenRes);
    expect(reopenRes.statusCode).toBe(200);
    expect(JSON.parse(reopenRes.body).data.completed).toBe(false);
    expect(JSON.parse(reopenRes.body).data.status).toBe("todo");

    // List Tasks with search filter
    const { req: listReq, res: listRes } = createMockReqRes({
      url: "/api/v1/agent/tasks?search=financial",
      token,
      query: { search: "financial" },
    });
    await handleAgentRequest(listReq, listRes);
    expect(listRes.statusCode).toBe(200);
    const listBody = JSON.parse(listRes.body);
    expect(listBody.data).toHaveLength(1);
    expect(listBody.pagination).toBeDefined();
    expect(listBody.pagination.page).toBe(1);
  });

  it("3. Folders CRUD & folder tasks inspection", async () => {
    // Create Folder
    const { req: fCreateReq, res: fCreateRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/folders",
      token,
      body: { name: "Project Titan", color: "emerald" },
    });
    await handleAgentRequest(fCreateReq, fCreateRes);
    expect(fCreateRes.statusCode).toBe(201);
    const folder = JSON.parse(fCreateRes.body).data;

    // Create a task inside this folder
    const { req: tCreateReq, res: tCreateRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token,
      body: { title: "Titan Spec", folder_id: folder.id },
    });
    await handleAgentRequest(tCreateReq, tCreateRes);
    expect(tCreateRes.statusCode).toBe(201);

    // List Folders (should include task_count: 1)
    const { req: fListReq, res: fListRes } = createMockReqRes({
      url: "/api/v1/agent/folders",
      token,
    });
    await handleAgentRequest(fListReq, fListRes);
    expect(fListRes.statusCode).toBe(200);
    const foldersData = JSON.parse(fListRes.body).data;
    const foundFolder = foldersData.find((f: any) => f.id === folder.id);
    expect(foundFolder).toBeDefined();
    expect(foundFolder.task_count).toBe(1);

    // Get Folder details with tasks
    const { req: fGetReq, res: fGetRes } = createMockReqRes({
      url: `/api/v1/agent/folders/${folder.id}`,
      token,
    });
    await handleAgentRequest(fGetReq, fGetRes);
    expect(fGetRes.statusCode).toBe(200);
    const folderDetail = JSON.parse(fGetRes.body).data;
    expect(folderDetail.tasks).toHaveLength(1);
    expect(folderDetail.tasks[0].title).toBe("Titan Spec");
  });

  it("4. Memories & Diary Notes CRUD", async () => {
    // Create a Diary Entry (خاطره)
    const { req: dCreateReq, res: dCreateRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/memories",
      token,
      body: {
        kind: "diary",
        title: "A calm evening",
        content: "Reflected on progress today.",
        diary_mood: "great",
        diary_date: "2026-09-29",
      },
    });
    await handleAgentRequest(dCreateReq, dCreateRes);
    expect(dCreateRes.statusCode).toBe(201);
    const diary = JSON.parse(dCreateRes.body).data;
    expect(diary.kind).toBe("diary");
    expect(diary.diary_mood).toBe("great");

    // Create a regular Note
    const { req: nCreateReq, res: nCreateRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/memories",
      token,
      body: {
        kind: "note",
        title: "Architecture Decisions",
        content: "Use personal agent tokens with SHA-256.",
      },
    });
    await handleAgentRequest(nCreateReq, nCreateRes);
    expect(nCreateRes.statusCode).toBe(201);

    // List memories filtered by kind=diary
    const { req: dListReq, res: dListRes } = createMockReqRes({
      url: "/api/v1/agent/memories?kind=diary",
      token,
      query: { kind: "diary" },
    });
    await handleAgentRequest(dListReq, dListRes);
    expect(dListRes.statusCode).toBe(200);
    const diaryList = JSON.parse(dListRes.body).data;
    expect(diaryList).toHaveLength(1);
    expect(diaryList[0].title).toBe("A calm evening");
  });

  it("5. Schedule & Calendar Events with Time Conflict Detection", async () => {
    // Create Calendar Event 1
    const { req: e1Req, res: e1Res } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/calendar/events",
      token,
      body: {
        title: "Team Standup",
        start_at: "2026-10-05T09:00:00Z",
        end_at: "2026-10-05T09:30:00Z",
      },
    });
    await handleAgentRequest(e1Req, e1Res);
    expect(e1Res.statusCode).toBe(201);

    // Attempt overlapping Event without force -> Should return 409 Conflict
    const { req: conflictReq, res: conflictRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/calendar/events",
      token,
      body: {
        title: "Conflicting Client Call",
        // One schedule per task: a conflict is another task timed inside this window (no time blocks).
        start_at: "2026-10-05T08:45:00Z",
        end_at: "2026-10-05T09:30:00Z",
      },
    });
    await handleAgentRequest(conflictReq, conflictRes);
    expect(conflictRes.statusCode).toBe(409);
    const conflictBody = JSON.parse(conflictRes.body);
    expect(conflictBody.error.code).toBe("TIME_CONFLICT");
    expect(conflictBody.error.details.conflicting_events).toHaveLength(1);

    // With force: true -> Allowed
    const { req: forceReq, res: forceRes } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/calendar/events",
      token,
      body: {
        title: "Conflicting Client Call",
        // One schedule per task: a conflict is another task timed inside this window (no time blocks).
        start_at: "2026-10-05T08:45:00Z",
        end_at: "2026-10-05T09:30:00Z",
        force: true,
      },
    });
    await handleAgentRequest(forceReq, forceRes);
    expect(forceRes.statusCode).toBe(201);

    // Read day schedule for 2026-10-05
    const { req: dayReq, res: dayRes } = createMockReqRes({
      url: "/api/v1/agent/schedule/day?date=2026-10-05",
      token,
      query: { date: "2026-10-05" },
    });
    await handleAgentRequest(dayReq, dayRes);
    expect(dayRes.statusCode).toBe(200);
    const daySchedule = JSON.parse(dayRes.body);
    expect(daySchedule.data.length).toBeGreaterThanOrEqual(2);
  });

  it("treats end_at as an optional request-only conflict interval and stores no duration fields", async () => {
    testStore.tasks.set("existing-exact", {
      id: "existing-exact", user_id: userId, title: "Existing exact instant",
      work_date: "2026-10-06T10:15:00.000Z", schedule_v: 2, status: "todo", completed: false,
    });

    const { req: createReq, res: createRes } = createMockReqRes({
      method: "POST", url: "/api/v1/agent/calendar/events", token,
      body: { title: "No implicit half hour", start_at: "2026-10-06T10:00:00.000Z" },
    });
    await handleAgentRequest(createReq, createRes);
    expect(createRes.statusCode).toBe(201);
    const created = JSON.parse(createRes.body).data;
    expect(created).toMatchObject({ work_date: "2026-10-06T10:00:00.000Z", schedule_v: 2 });
    expect(created).not.toHaveProperty("end_at");
    expect(created).not.toHaveProperty("start_at");
    expect(created).not.toHaveProperty("estimated_minutes");

    const { req: exactConflictReq, res: exactConflictRes } = createMockReqRes({
      method: "POST", url: "/api/v1/agent/calendar/events", token,
      body: { title: "Same instant", start_at: "2026-10-06T10:15:00.000Z" },
    });
    await handleAgentRequest(exactConflictReq, exactConflictRes);
    expect(exactConflictRes.statusCode).toBe(409);
    expect(JSON.parse(exactConflictRes.body).error.code).toBe("TIME_CONFLICT");
  });

  it("6. Idempotency Key prevents duplicate creation", async () => {
    const key = "unique_client_idempotency_123";

    const { req: req1, res: res1 } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token,
      headers: { "idempotency-key": key },
      body: { title: "Idempotent Task" },
    });
    await handleAgentRequest(req1, res1);
    expect(res1.statusCode).toBe(201);
    const firstId = JSON.parse(res1.body).data.id;

    // A new function instance has no process-local cache, while Firestore keeps
    // the idempotency record. The test store models that persistent record.
    resetIdempotencyCache();

    // Resend same idempotency key
    const { req: req2, res: res2 } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/tasks",
      token,
      headers: { "idempotency-key": key },
      body: { title: "Idempotent Task" },
    });
    await handleAgentRequest(req2, res2);
    expect(res2.statusCode).toBe(201);
    const secondId = JSON.parse(res2.body).data.id;

    // Identical task ID returned, no duplicate in database
    expect(secondId).toBe(firstId);
    expect(Array.from(testStore.tasks.values())).toHaveLength(1);

    const different = createMockReqRes({
      method: "POST", url: "/api/v1/agent/tasks", token,
      headers: { "idempotency-key": key }, body: { title: "Different task" },
    });
    await handleAgentRequest(different.req, different.res);
    expect(different.res.statusCode).toBe(409);
    expect(Array.from(testStore.tasks.values())).toHaveLength(1);
  });

  it("7. Rate limiting blocks excessive requests with 429", async () => {
    const limitedKey = "rate_limit_test_token";

    for (let i = 0; i < 60; i++) {
      expect(checkRateLimit(limitedKey, 60).allowed).toBe(true);
    }

    // 61st request should be blocked
    const blocked = checkRateLimit(limitedKey, 60);
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.resetInSeconds).toBeGreaterThan(0);
  });

  it("8. Audit log records mutating actions without leaking sensitive contents", async () => {
    // Mutate a diary entry
    const { req, res } = createMockReqRes({
      method: "POST",
      url: "/api/v1/agent/memories",
      token,
      body: {
        kind: "diary",
        title: "Confidential thought",
        content: "Highly sensitive personal reflections.",
      },
    });
    await handleAgentRequest(req, res);
    expect(res.statusCode).toBe(201);

    // Check audit log
    const { req: auditReq, res: auditRes } = createMockReqRes({
      url: "/api/v1/agent/audit-log",
      token,
    });
    await handleAgentRequest(auditReq, auditRes);
    expect(auditRes.statusCode).toBe(200);
    const logs = JSON.parse(auditRes.body).data;
    expect(logs.length).toBeGreaterThan(0);

    // Private diary content is NOT in the audit log
    const serialized = JSON.stringify(logs);
    expect(serialized).not.toContain("Highly sensitive personal reflections");
  });
});
