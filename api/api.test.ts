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
  const openApiPath = path.resolve(__dirname, "../public/openapi.json");

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
    const todayStr = new Date().toISOString().slice(0, 10);

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
      const result = await getTodayTasks({ userId: "u1" });
      expect(result.today.length).toBe(2);
      expect(result.overdue.length).toBe(1);
      expect(result.summary.totalToday).toBe(2);
      expect(result.summary.completedCount).toBe(1);
      expect(result.summary.totalOverdue).toBe(1);
    } finally {
      global.fetch = originalFetch;
    }
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
