import { describe, it, expect, vi, beforeEach } from "vitest";
import fs from "fs";
import path from "path";
import {
  extractBearerToken,
  verifyToken,
  authenticateRequest,
} from "./_lib/auth";
import {
  encodeValue,
  decodeValue,
  encodeFirestoreFields,
  decodeFirestoreFields,
  parseFirestoreDoc,
  listUserTasks,
  getUserTaskById,
  createUserTask,
  updateUserTask,
  deleteUserTask,
  getTodayTasks,
} from "./_lib/firestore";
import userMeHandler from "./user/me";
import tasksIndexHandler from "./tasks/index";
import tasksTodayHandler from "./tasks/today";
import taskDetailHandler from "./tasks/[id]";
import { localDayOf, normalizeTaskPriority, normalizeTaskScheduleInput } from "./_lib/taskSchedule";

function createMockRes() {
  const res: any = {
    statusCode: 200,
    headers: {},
    body: "",
    setHeader(name: string, value: string) {
      this.headers[name] = value;
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
  return res;
}

describe("OpenAPI 3.1.0 Specification (public/openapi.json)", () => {
  const openApiPath = path.resolve(__dirname, "../frontend/public/openapi.json");

  it("exists in the public directory and is valid JSON", () => {
    expect(fs.existsSync(openApiPath)).toBe(true);
    const content = fs.readFileSync(openApiPath, "utf-8");
    const parsed = JSON.parse(content);
    expect(parsed).toBeDefined();
    expect(parsed.openapi).toBe("3.1.0");
  });

  it("contains all required endpoints for task CRUD and user profile", () => {
    const parsed = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
    const paths = parsed.paths;

    expect(paths["/api/user/me"]).toBeDefined();
    expect(paths["/api/user/me"].get).toBeDefined();

    expect(paths["/api/tasks"]).toBeDefined();
    expect(paths["/api/tasks"].get).toBeDefined();
    expect(paths["/api/tasks"].post).toBeDefined();

    expect(paths["/api/tasks/today"]).toBeDefined();
    expect(paths["/api/tasks/today"].get).toBeDefined();

    expect(paths["/api/tasks/{id}"]).toBeDefined();
    expect(paths["/api/tasks/{id}"].get).toBeDefined();
    expect(paths["/api/tasks/{id}"].patch).toBeDefined();
    expect(paths["/api/tasks/{id}"].delete).toBeDefined();
  });

  it("contains required security schemes: bearerAuth and oauth2", () => {
    const parsed = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
    const securitySchemes = parsed.components?.securitySchemes;

    expect(securitySchemes).toBeDefined();
    expect(securitySchemes.bearerAuth).toBeDefined();
    expect(securitySchemes.bearerAuth.type).toBe("http");
    expect(securitySchemes.bearerAuth.scheme).toBe("bearer");
    expect(securitySchemes.bearerAuth.bearerFormat).toBe("JWT");

    expect(securitySchemes.oauth2).toBeDefined();
    expect(securitySchemes.oauth2.type).toBe("oauth2");
    expect(
      securitySchemes.oauth2.flows?.authorizationCode?.authorizationUrl
    ).toContain("accounts.google.com");
    expect(
      securitySchemes.oauth2.flows?.authorizationCode?.tokenUrl
    ).toContain("oauth2.googleapis.com");
  });

  it("defines comprehensive schemas for Task and UserProfile", () => {
    const parsed = JSON.parse(fs.readFileSync(openApiPath, "utf-8"));
    const schemas = parsed.components?.schemas;

    expect(schemas.UserProfile).toBeDefined();
    expect(schemas.Task).toBeDefined();
    expect(schemas.CreateTaskInput).toBeDefined();
    expect(schemas.UpdateTaskInput).toBeDefined();
    expect(schemas.ErrorResponse).toBeDefined();
  });
});

describe("canonical task schedule and priority API adapters", () => {
  it("accepts complete v2 day/instant/period schedules and uses work_date:null as the clear intent", () => {
    expect(normalizeTaskScheduleInput({ work_date: "2026-10-05" })).toMatchObject({ schedule_v: 2, work_date: "2026-10-05" });
    expect(normalizeTaskScheduleInput({ work_date: "2026-10-05T23:59:00-07:00", schedule_timezone: "America/Los_Angeles" })).toMatchObject({ work_date: "2026-10-05T23:59:00-07:00", schedule_timezone: "America/Los_Angeles" });
    expect(normalizeTaskScheduleInput({ work_date: null, planning_horizon: "week", planning_start: "2026-10-05", planning_end: "2026-10-11", planning_calendar: "gregorian" })).toMatchObject({ work_date: null, planning_horizon: "week", planning_start: "2026-10-05" });
    expect(normalizeTaskScheduleInput({ work_date: null })).toMatchObject({ schedule_v: 2, work_date: null, planning_horizon: null });
  });

  it("rejects malformed/partial schedules instead of guessing, and leaves metadata-only patches alone", () => {
    expect(normalizeTaskScheduleInput({ title: "Rename" })).toBeNull();
    expect(() => normalizeTaskScheduleInput({ work_date: "2026-02-30" })).toThrow(/work_date/);
    expect(() => normalizeTaskScheduleInput({ work_date: "2026-10-05T23:59:00" })).toThrow(/offset/);
    expect(() => normalizeTaskScheduleInput({ planning_horizon: "week", planning_start: "2026-10-05" })).toThrow(/complete valid/);
    expect(() => normalizeTaskScheduleInput({ planning_horizon: null })).toThrow(/complete valid/);
    expect(() => normalizeTaskScheduleInput({ work_date: null, planning_horizon: "week", planning_start: "2026-10-05" })).toThrow(/complete valid/);
    expect(() => normalizeTaskScheduleInput({ work_date: null, planning_horizon: "week", planning_start: "2026-10-05", planning_end: "2026-10-11", planning_calendar: "hijri" })).toThrow(/planning_calendar/);
    expect(() => normalizeTaskScheduleInput({ work_date: null, due_date: "2026-10-05" })).toThrow(/disagree/);
    expect(() => normalizeTaskScheduleInput({ work_date: "2026-10-06", due_date: "2026-10-05" })).toThrow(/disagree/);
  });

  it("maps old API priority values conservatively to the current frontend model", () => {
    expect(["p1", "p2", "p3", "p4"].map((priority) => normalizeTaskPriority(priority))).toEqual(["high", "medium", "low", "none"]);
    expect(normalizeTaskPriority("urgent")).toBe("urgent");
    expect(normalizeTaskPriority(undefined)).toBe("none");
    const legacyTask = parseFirestoreDoc({ fields: encodeFirestoreFields({
      priority: "p1", start_at: "2026-10-05T09:00:00Z", end_at: "2026-10-05T10:00:00Z",
      estimated_minutes: 60, time_of_day: "morning", part_of_day: "morning", deadline: "2026-10-06",
      schedule_legacy: { version: 2, fields: { start_at: "2026-10-05T09:00:00Z" } },
    }) });
    expect(legacyTask.priority).toBe("high");
    for (const field of ["start_at", "end_at", "estimated_minutes", "time_of_day", "part_of_day", "deadline"]) {
      expect(legacyTask).not.toHaveProperty(field);
    }
    expect(legacyTask.schedule_legacy.fields.start_at).toBe("2026-10-05T09:00:00Z");
  });

  it("keeps metadata PATCHes schedule-neutral, clears the full schedule on work_date:null, and validates before write", async () => {
    const originalFetch = global.fetch;
    const captured: Array<{ method: string; body: any; url: string }> = [];
    global.fetch = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
      captured.push({ method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null, url });
      if (init.method === "PATCH") return { ok: true, json: async () => ({ name: `${url.split("?")[0]}`, fields: encodeFirestoreFields({ id: "task-1", title: "Updated", work_date: null, schedule_v: 2 }) }) };
      return { ok: true, json: async () => ({ name: "projects/p/databases/d/documents/users/u1/tasks/task-1", fields: encodeFirestoreFields({ id: "task-1", title: "Original", work_date: "2026-10-05", schedule_v: 2, planning_horizon: null }) }) };
    }) as any;
    try {
      await updateUserTask({ userId: "u1" }, "task-1", { title: "Renamed" });
      const metadataWrite = captured.find((call) => call.method === "PATCH")!;
      expect(Object.keys(metadataWrite.body.fields).sort()).toEqual(["title", "updated_at"]);

      captured.length = 0;
      await updateUserTask({ userId: "u1" }, "task-1", { work_date: null });
      const clearWrite = captured.find((call) => call.method === "PATCH")!;
      const clearFields = decodeFirestoreFields(clearWrite.body.fields);
      expect(clearFields).toMatchObject({ schedule_v: 2, work_date: null, planning_horizon: null, planning_start: null, planning_end: null, due_date: null });

      captured.length = 0;
      await expect(updateUserTask({ userId: "u1" }, "task-1", { work_date: "2026-02-30" })).rejects.toThrow(/work_date/);
      expect(captured.filter((call) => call.method === "PATCH")).toHaveLength(0);
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("Authentication & Security Layer (_lib/auth.ts)", () => {
  it("extracts Bearer token correctly from authorization header", () => {
    expect(
      extractBearerToken({
        headers: { authorization: "Bearer valid_jwt_token_here_1234567890" },
      })
    ).toBe("valid_jwt_token_here_1234567890");

    expect(
      extractBearerToken({
        headers: { Authorization: "bearer token_lowercase_prefix_1234567890" },
      })
    ).toBe("token_lowercase_prefix_1234567890");

    expect(extractBearerToken({ headers: {} })).toBeNull();
    expect(
      extractBearerToken({ headers: { authorization: "Basic credentials" } })
    ).toBeNull();
  });

  it("rejects unauthenticated requests with 401", async () => {
    const req = { headers: {} };
    const res = createMockRes();

    const user = await authenticateRequest(req, res);
    expect(user).toBeNull();
    expect(res.statusCode).toBe(401);
    const body = JSON.parse(res.body);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNAUTHORIZED");
  });

  it("verifies Firebase ID Token and returns authenticated user", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) {
        return {
          ok: true,
          json: async () => ({
            users: [
              {
                localId: "user_firebase_123",
                email: "test@example.com",
                displayName: "Test User",
              },
            ],
          }),
        };
      }
      return { ok: false, status: 400, text: async () => "error" };
    }) as any;

    try {
      const user = await verifyToken("valid_firebase_id_token");
      expect(user).not.toBeNull();
      expect(user?.userId).toBe("user_firebase_123");
      expect(user?.email).toBe("test@example.com");
      expect(user?.displayName).toBe("Test User");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("verifies Google OAuth access token via signInWithIdp fallback", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) {
        return { ok: false, status: 400 };
      }
      if (url.includes("accounts:signInWithIdp")) {
        return {
          ok: true,
          json: async () => ({
            localId: "google_user_456",
            email: "gemini@example.com",
            displayName: "Gemini Agent",
            idToken: "exchanged_firebase_token",
          }),
        };
      }
      return { ok: false, status: 400 };
    }) as any;

    try {
      const user = await verifyToken("valid_oauth_access_token");
      expect(user).not.toBeNull();
      expect(user?.userId).toBe("google_user_456");
      expect(user?.email).toBe("gemini@example.com");
      expect(user?.displayName).toBe("Gemini Agent");
      expect(user?.idToken).toBe("exchanged_firebase_token");
    } finally {
      global.fetch = originalFetch;
    }
  });
});

describe("Firestore Encoding & User Isolation (_lib/firestore.ts)", () => {
  it("encodes and decodes values with type fidelity", () => {
    expect(encodeValue("hello")).toEqual({ stringValue: "hello" });
    expect(encodeValue(true)).toEqual({ booleanValue: true });
    expect(encodeValue(42)).toEqual({ integerValue: "42" });
    expect(encodeValue(3.14)).toEqual({ doubleValue: 3.14 });
    expect(encodeValue(null)).toEqual({ nullValue: null });
    expect(encodeValue(["a", "b"])).toEqual({
      arrayValue: { values: [{ stringValue: "a" }, { stringValue: "b" }] },
    });

    const doc = {
      title: "Plan project",
      completed: false,
      priority: "p1",
      estimated_minutes: 60,
    };
    const encoded = encodeFirestoreFields(doc);
    const decoded = decodeFirestoreFields(encoded);
    expect(decoded.title).toBe("Plan project");
    expect(decoded.completed).toBe(false);
    expect(decoded.priority).toBe("p1");
    expect(decoded.estimated_minutes).toBe(60);
  });

  it("strictly scopes Firestore URLs to /users/{userId}/tasks", async () => {
    const originalFetch = global.fetch;
    const fetchCalls: string[] = [];

    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      fetchCalls.push(url);
      return {
        ok: true,
        json: async () => ({ documents: [] }),
      };
    }) as any;

    try {
      const authUser = { userId: "isolated_user_999" };
      await listUserTasks(authUser);

      expect(fetchCalls.length).toBe(1);
      expect(fetchCalls[0]).toContain("/users/isolated_user_999/tasks");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("calculates today and overdue task metrics accurately", async () => {
    const originalFetch = global.fetch;
    const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const todayStr = localDayOf(new Date(), userTimeZone)!;

    const mockTasks = [
      {
        name: "projects/p/databases/d/documents/users/u1/tasks/t1",
        fields: encodeFirestoreFields({
          title: "Due Today",
          due_date: todayStr,
          completed: false,
        }),
      },
      {
        name: "projects/p/databases/d/documents/users/u1/tasks/t2",
        fields: encodeFirestoreFields({
          title: "Due Today Done",
          due_date: todayStr,
          completed: true,
        }),
      },
      {
        name: "projects/p/databases/d/documents/users/u1/tasks/t3",
        fields: encodeFirestoreFields({
          title: "Overdue",
          due_date: "2020-01-01",
          completed: false,
        }),
      },
    ];

    global.fetch = vi.fn().mockImplementation(async () => {
      return {
        ok: true,
        json: async () => ({ documents: mockTasks }),
      };
    }) as any;

    try {
      const result = await getTodayTasks({ userId: "u1" }, userTimeZone);
      expect(result.today.length).toBe(2);
      expect(result.overdue.length).toBe(1);
      expect(result.summary.totalToday).toBe(2);
      expect(result.summary.completedCount).toBe(1);
      expect(result.summary.totalOverdue).toBe(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("uses the supplied user zone for both today's date and scheduled instants", async () => {
    const originalFetch = global.fetch;
    const records = [
      { id: "local-day", work_date: "2026-10-05", schedule_v: 2, completed: false },
      { id: "local-instant", work_date: "2026-10-04T13:30:00.000Z", schedule_v: 2, schedule_timezone: "America/Los_Angeles", completed: false },
      { id: "yesterday", work_date: "2026-10-04", schedule_v: 2, completed: false },
      { id: "tomorrow", work_date: "2026-10-06", schedule_v: 2, completed: false },
    ];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ documents: records.map((row) => ({
        name: `projects/p/databases/d/documents/users/u1/tasks/${row.id}`,
        fields: encodeFirestoreFields(row),
      })) }),
    }) as any;
    try {
      const result = await getTodayTasks({ userId: "u1" }, "Australia/Sydney", new Date("2026-10-04T13:30:00.000Z"));
      expect(result.today.map((task) => task.id).sort()).toEqual(["local-day", "local-instant"]);
      expect(result.overdue.map((task) => task.id)).toEqual(["yesterday"]);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("requires a valid explicit IANA zone for local-day calculations", async () => {
    await expect(getTodayTasks({ userId: "u1" }, "not/a-zone")).rejects.toThrow(/valid IANA time zone/i);
  });
});

describe("API Route Handlers", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("GET /api/user/me returns authenticated user details", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) {
        return {
          ok: true,
          json: async () => ({
            users: [
              {
                localId: "uid_me_789",
                email: "me@example.com",
                displayName: "Arshia",
              },
            ],
          }),
        };
      }
      return { ok: false, status: 400 };
    }) as any;

    try {
      const req = {
        method: "GET",
        headers: { authorization: "Bearer valid_token_1234567890" },
      };
      const res = createMockRes();

      await userMeHandler(req, res);

      expect(res.statusCode).toBe(200);
      const parsed = JSON.parse(res.body);
      expect(parsed.success).toBe(true);
      expect(parsed.data.userId).toBe("uid_me_789");
      expect(parsed.data.email).toBe("me@example.com");
      expect(parsed.data.displayName).toBe("Arshia");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("POST /api/tasks validates required title", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) {
        return {
          ok: true,
          json: async () => ({
            users: [{ localId: "uid_test" }],
          }),
        };
      }
      return { ok: false, status: 400 };
    }) as any;

    try {
      const req = {
        method: "POST",
        headers: { authorization: "Bearer valid_token_1234567890" },
        body: { description: "Missing title" },
      };
      const res = createMockRes();

      await tasksIndexHandler(req, res);

      expect(res.statusCode).toBe(400);
      const parsed = JSON.parse(res.body);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe("VALIDATION_ERROR");
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("POST /api/tasks maps invalid schedule writes to VALIDATION_ERROR before Firestore write", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) return { ok: true, json: async () => ({ users: [{ localId: "uid_test" }] }) };
      return { ok: false, status: 400 };
    });
    global.fetch = fetchMock as any;
    try {
      const req = {
        method: "POST",
        headers: { authorization: "Bearer valid_token_1234567890" },
        body: { title: "Malformed schedule", work_date: "2026-02-30" },
      };
      const res = createMockRes();
      await tasksIndexHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_ERROR");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("POST /api/tasks maps invalid priority writes to VALIDATION_ERROR before Firestore write", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async () => ({ ok: true, json: async () => ({ users: [{ localId: "uid_test" }] }) }));
    global.fetch = fetchMock as any;
    try {
      const req = {
        method: "POST",
        headers: { authorization: "Bearer valid_token_1234567890" },
        body: { title: "Invalid priority", priority: "p5" },
      };
      const res = createMockRes();
      await tasksIndexHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_ERROR");
      expect(fetchMock).toHaveBeenCalledTimes(1);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("PATCH /api/tasks/{id} maps invalid schedule input to 400 before Firestore PATCH", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (url: string, init: any = {}) => {
      if (url.includes("accounts:lookup")) return { ok: true, json: async () => ({ users: [{ localId: "uid_test" }] }) };
      if (init.method === "GET") return { ok: true, json: async () => ({ name: "projects/p/databases/d/documents/users/uid_test/tasks/task-1", fields: encodeFirestoreFields({ id: "task-1", work_date: "2026-10-05", schedule_v: 2 }) }) };
      return { ok: false, status: 500 };
    });
    global.fetch = fetchMock as any;
    try {
      const req = {
        method: "PATCH",
        headers: { authorization: "Bearer valid_token_1234567890" },
        query: { id: "task-1" },
        body: { work_date: "2026-02-30" },
      };
      const res = createMockRes();
      await taskDetailHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_ERROR");
      expect(fetchMock.mock.calls.some((call: any[]) => call[1]?.method === "PATCH")).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("PATCH /api/tasks/{id} maps invalid priority input to 400 before Firestore PATCH", async () => {
    const originalFetch = global.fetch;
    const fetchMock = vi.fn().mockImplementation(async (_url: string, init: any = {}) => {
      if (String(_url).includes("accounts:lookup")) return { ok: true, json: async () => ({ users: [{ localId: "uid_test" }] }) };
      if (init.method === "GET") return { ok: true, json: async () => ({ name: "projects/p/databases/d/documents/users/uid_test/tasks/task-1", fields: encodeFirestoreFields({ id: "task-1", priority: "none" }) }) };
      return { ok: false, status: 500 };
    });
    global.fetch = fetchMock as any;
    try {
      const req = {
        method: "PATCH",
        headers: { authorization: "Bearer valid_token_1234567890" },
        query: { id: "task-1" },
        body: { priority: "p5" },
      };
      const res = createMockRes();
      await taskDetailHandler(req, res);
      expect(res.statusCode).toBe(400);
      expect(JSON.parse(res.body).error.code).toBe("VALIDATION_ERROR");
      expect(fetchMock.mock.calls.some((call: any[]) => call[1]?.method === "PATCH")).toBe(false);
    } finally {
      global.fetch = originalFetch;
    }
  });

  it("GET /api/tasks/{id} returns 404 for non-existent or other user task", async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url.includes("accounts:lookup")) {
        return {
          ok: true,
          json: async () => ({
            users: [{ localId: "uid_test" }],
          }),
        };
      }
      if (url.includes("/users/uid_test/tasks/non_existent")) {
        return { ok: false, status: 404 };
      }
      return { ok: false, status: 400 };
    }) as any;

    try {
      const req = {
        method: "GET",
        headers: { authorization: "Bearer valid_token_1234567890" },
        query: { id: "non_existent" },
      };
      const res = createMockRes();

      await taskDetailHandler(req, res);

      expect(res.statusCode).toBe(404);
      const parsed = JSON.parse(res.body);
      expect(parsed.success).toBe(false);
      expect(parsed.error.code).toBe("NOT_FOUND");
    } finally {
      global.fetch = originalFetch;
    }
  });
});
