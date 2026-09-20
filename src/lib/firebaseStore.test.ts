import { describe, it, expect, beforeEach, vi } from "vitest";

// In-memory Firestore simulation
const mockDocStore = new Map<string, Record<string, any>>();
let mockCurrentUser: { uid: string; email?: string } | null = { uid: "user_test_123", email: "test@example.com" };

vi.mock("@/lib/firebase", () => {
  return {
    db: {},
    auth: {
      get currentUser() {
        return mockCurrentUser;
      },
    },
    fbSignOut: vi.fn(async () => {
      mockCurrentUser = null;
    }),
    doc: vi.fn((_db, ...parts: string[]) => parts.join("/")),
    collection: vi.fn((_db, ...parts: string[]) => parts.join("/")),
    getDoc: vi.fn(async (path: string) => {
      const exists = mockDocStore.has(path);
      const data = exists ? mockDocStore.get(path) : undefined;
      return {
        id: path.split("/").pop(),
        exists: () => exists,
        data: () => (data ? { ...data } : undefined),
      };
    }),
    getDocs: vi.fn(async (colOrQuery: any) => {
      const colPath = typeof colOrQuery === "string" ? colOrQuery : colOrQuery.path;
      const docs: Array<{ id: string; data: () => Record<string, any> }> = [];
      for (const [key, val] of mockDocStore.entries()) {
        const parts = key.split("/");
        const docCol = parts.slice(0, -1).join("/");
        if (docCol === colPath) {
          docs.push({ id: parts[parts.length - 1], data: () => ({ ...val }) });
        }
      }
      return {
        docs,
        empty: docs.length === 0,
        size: docs.length,
      };
    }),
    setDoc: vi.fn(async (path: string, val: any, options?: { merge?: boolean }) => {
      const existing = mockDocStore.get(path) || {};
      mockDocStore.set(path, options?.merge ? { ...existing, ...val } : { ...val });
    }),
    updateDoc: vi.fn(async (path: string, patch: any) => {
      if (!mockDocStore.has(path)) throw new Error("Document does not exist");
      const current = mockDocStore.get(path)!;
      mockDocStore.set(path, { ...current, ...patch });
    }),
    deleteDoc: vi.fn(async (path: string) => {
      mockDocStore.delete(path);
    }),
    query: vi.fn((colRef: string, ...constraints: any[]) => ({
      path: colRef,
      constraints,
    })),
    where: vi.fn((field: string, op: string, val: any) => ({ type: "where", field, op, val })),
    orderBy: vi.fn((field: string, dir = "asc") => ({ type: "orderBy", field, dir })),
    limit: vi.fn((n: number) => ({ type: "limit", count: n })),
  };
});

vi.mock("firebase/storage", () => {
  return {
    getStorage: vi.fn(() => ({})),
    ref: vi.fn((_storage: any, path: string) => path),
    uploadBytes: vi.fn(async () => {}),
    getDownloadURL: vi.fn(async (path: string) => `https://storage.googleapis.com/test/${path}`),
    deleteObject: vi.fn(async () => {}),
  };
});

import { firebaseStore, FirestoreQuery, FirestoreMutation } from "./firebaseStore";

describe("firebaseStore adapter and query builder", () => {
  beforeEach(() => {
    mockDocStore.clear();
    mockCurrentUser = { uid: "user_test_123", email: "test@example.com" };
    vi.clearAllMocks();
  });

  describe("query creation and .returns<T>() support", () => {
    it("creates a FirestoreQuery from firebaseStore.from()", () => {
      const query = firebaseStore.from("tasks");
      expect(query).toBeInstanceOf(FirestoreQuery);
    });

    it("supports .returns<T>() method and resolves typed data cleanly", async () => {
      // Seed test task in mock storage
      mockDocStore.set("users/user_test_123/tasks/task_1", {
        id: "task_1",
        title: "Test Task",
        completed: false,
        priority: "high",
      });

      interface MyTask {
        id: string;
        title: string;
        completed: boolean;
        priority: string;
      }

      // 1. Calling .returns<MyTask[]>() chained to query
      const query = firebaseStore
        .from("tasks")
        .select("id,title,completed,priority")
        .eq("priority", "high")
        .returns<MyTask[]>();

      // Returns instance of query
      expect(query).toBeInstanceOf(FirestoreQuery);

      const res = await query;
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
      expect(res.data).toHaveLength(1);
      expect(res.data![0].title).toBe("Test Task");
      expect(res.data![0].priority).toBe("high");
    });

    it("supports .returns<T>() combined with .single() and .maybeSingle()", async () => {
      mockDocStore.set("users/user_test_123/shares/share_1", {
        id: "share_1",
        resource_type: "task",
        resource_id: "task_abc",
        permission: "edit",
      });

      interface ShareRow {
        id: string;
        resource_type: string;
        resource_id: string;
        permission: string;
      }

      // .single() with returns
      const singleRes = await firebaseStore
        .from("shares")
        .select()
        .eq("id", "share_1")
        .returns<ShareRow>()
        .single();

      expect(singleRes.error).toBeNull();
      expect(singleRes.data).toBeDefined();
      expect(singleRes.data?.permission).toBe("edit");

      // .maybeSingle() when record not found
      const maybeNotFound = await firebaseStore
        .from("shares")
        .select()
        .eq("id", "non_existent")
        .returns<ShareRow>()
        .maybeSingle();

      expect(maybeNotFound.error).toBeNull();
      expect(maybeNotFound.data).toBeNull();
    });

    it("supports .returns<T>() on FirestoreMutation", async () => {
      interface CustomRow {
        id: string;
        name: string;
        user_id: string;
      }

      const mut = firebaseStore
        .from("tags")
        .insert({ id: "tag_xyz", name: "Urgent" })
        .select()
        .maybeSingle()
        .returns<CustomRow>();

      expect(mut).toBeInstanceOf(FirestoreMutation);

      const res = await mut;
      expect(res.error).toBeNull();
      expect(res.data?.name).toBe("Urgent");
      expect(res.data?.id).toBe("tag_xyz");
    });
  });

  describe("filter operators", () => {
    beforeEach(() => {
      // Seed sample items
      const items = [
        { id: "item_1", name: "Apple", count: 10, active: true, desc: "Fresh apple" },
        { id: "item_2", name: "Banana", count: 20, active: false, desc: "Sweet banana" },
        { id: "item_3", name: "Cherry", count: 30, active: true, desc: null },
      ];
      for (const item of items) {
        mockDocStore.set(`users/user_test_123/fruits/${item.id}`, item);
      }
    });

    it("handles .eq() filter", async () => {
      const { data } = await firebaseStore.from("fruits").select().eq("name", "Apple");
      expect(data).toHaveLength(1);
      expect(data![0].name).toBe("Apple");
    });

    it("handles .neq() filter", async () => {
      const { data } = await firebaseStore.from("fruits").select().neq("name", "Apple");
      expect(data).toHaveLength(2);
      expect(data?.map((d) => d.name)).not.toContain("Apple");
    });

    it("handles .is() filter for null/boolean", async () => {
      const { data } = await firebaseStore.from("fruits").select().is("desc", null);
      expect(data).toHaveLength(1);
      expect(data![0].name).toBe("Cherry");
    });

    it("handles .in() filter", async () => {
      const { data } = await firebaseStore.from("fruits").select().in("name", ["Apple", "Cherry"]);
      expect(data).toHaveLength(2);
      expect(data?.map((d) => d.name).sort()).toEqual(["Apple", "Cherry"]);
    });

    it("handles .gte(), .gt(), .lte(), .lt() range filters", async () => {
      const gteRes = await firebaseStore.from("fruits").select().gte("count", 20);
      expect(gteRes.data?.map((d) => d.name).sort()).toEqual(["Banana", "Cherry"]);

      const gtRes = await firebaseStore.from("fruits").select().gt("count", 20);
      expect(gtRes.data?.map((d) => d.name)).toEqual(["Cherry"]);

      const lteRes = await firebaseStore.from("fruits").select().lte("count", 20);
      expect(lteRes.data?.map((d) => d.name).sort()).toEqual(["Apple", "Banana"]);

      const ltRes = await firebaseStore.from("fruits").select().lt("count", 20);
      expect(ltRes.data?.map((d) => d.name)).toEqual(["Apple"]);
    });

    it("handles .ilike() filter", async () => {
      const { data } = await firebaseStore.from("fruits").select().ilike("desc", "%SWEET%");
      expect(data).toHaveLength(1);
      expect(data![0].name).toBe("Banana");
    });

    it("handles .not() filter", async () => {
      const { data } = await firebaseStore.from("fruits").select().not("active", "is", false);
      expect(data).toHaveLength(2);
      expect(data?.every((d) => d.active === true)).toBe(true);
    });

    it("handles .or() as a non-breaking noop / fallback", async () => {
      const res = await firebaseStore.from("fruits").select().or("name.eq.Apple,name.eq.Banana");
      expect(res.error).toBeNull();
      expect(res.data).toBeDefined();
    });
  });

  describe("sorting, pagination, and projection", () => {
    beforeEach(() => {
      for (let i = 1; i <= 5; i++) {
        mockDocStore.set(`users/user_test_123/scores/s_${i}`, {
          id: `s_${i}`,
          points: i * 10,
          rank: 6 - i,
        });
      }
    });

    it("supports .order() ascending and descending", async () => {
      const asc = await firebaseStore.from("scores").select().order("points", { ascending: true });
      expect(asc.data?.map((d) => d.points)).toEqual([10, 20, 30, 40, 50]);

      const desc = await firebaseStore.from("scores").select().order("points", { ascending: false });
      expect(desc.data?.map((d) => d.points)).toEqual([50, 40, 30, 20, 10]);
    });

    it("supports .limit()", async () => {
      const res = await firebaseStore.from("scores").select().order("points", { ascending: true }).limit(2);
      expect(res.data).toHaveLength(2);
      expect(res.data?.map((d) => d.points)).toEqual([10, 20]);
    });

    it("supports .range()", async () => {
      const res = await firebaseStore.from("scores").select().order("points", { ascending: true }).range(0, 2);
      expect(res.data).toHaveLength(3);
      expect(res.data?.map((d) => d.points)).toEqual([10, 20, 30]);
    });

    it("supports .select() options for count and head", async () => {
      const countRes = await firebaseStore.from("scores").select("*", { count: "exact" });
      expect(countRes.count).toBe(5);
      expect(countRes.data).toHaveLength(5);

      const headRes = await firebaseStore.from("scores").select("*", { count: "exact", head: true });
      expect(headRes.count).toBe(5);
      expect(headRes.data).toBeNull();
    });
  });

  describe("mutations: insert, upsert, update, delete", () => {
    it("inserts a single document and creates generated ID if missing", async () => {
      const res = await firebaseStore.from("notes").insert({ title: "My Note" });
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(1);
      const inserted = res.data![0];
      expect(inserted.title).toBe("My Note");
      expect(inserted.id).toBeDefined();
      expect(inserted.user_id).toBe("user_test_123");
      expect(inserted.created_at).toBeDefined();
      expect(inserted.updated_at).toBeDefined();
    });

    it("inserts multiple documents in batch", async () => {
      const res = await firebaseStore.from("notes").insert([
        { id: "note_1", title: "Note 1" },
        { id: "note_2", title: "Note 2" },
      ]);
      expect(res.error).toBeNull();
      expect(res.data).toHaveLength(2);
      expect(mockDocStore.has("users/user_test_123/notes/note_1")).toBe(true);
      expect(mockDocStore.has("users/user_test_123/notes/note_2")).toBe(true);
    });

    it("upserts with onConflict resolution", async () => {
      // First insert
      await firebaseStore.from("settings").insert({ id: "set_1", key: "theme", value: "dark" });

      // Upsert by key
      const res = await firebaseStore
        .from("settings")
        .upsert({ key: "theme", value: "light" }, { onConflict: "key" });

      expect(res.error).toBeNull();
      expect(res.data![0].value).toBe("light");
      expect(res.data![0].id).toBe("set_1");
    });

    it("updates document with .update().eq()", async () => {
      mockDocStore.set("users/user_test_123/tasks/task_up", {
        id: "task_up",
        title: "Old Title",
        completed: false,
      });

      const res = await firebaseStore
        .from("tasks")
        .update({ title: "Updated Title", completed: true })
        .eq("id", "task_up");

      expect(res.error).toBeNull();
      expect(mockDocStore.get("users/user_test_123/tasks/task_up")?.title).toBe("Updated Title");
      expect(mockDocStore.get("users/user_test_123/tasks/task_up")?.completed).toBe(true);
    });

    it("deletes document with .delete().eq()", async () => {
      mockDocStore.set("users/user_test_123/tasks/task_del", { id: "task_del", title: "To Delete" });

      const res = await firebaseStore.from("tasks").delete().eq("id", "task_del");
      expect(res.error).toBeNull();
      expect(mockDocStore.has("users/user_test_123/tasks/task_del")).toBe(false);
    });

    it("dispatches firebase-store-changed event on window during mutations", async () => {
      let eventFired = false;
      const listener = () => {
        eventFired = true;
      };
      window.addEventListener("firebase-store-changed", listener);

      await firebaseStore.from("tasks").insert({ id: "evt_task", title: "Event Task" });
      expect(eventFired).toBe(true);

      window.removeEventListener("firebase-store-changed", listener);
    });
  });

  describe("promise protocol and catch handling", () => {
    it("supports .then() and .catch() on FirestoreQuery", async () => {
      const q = firebaseStore.from("tasks").select();
      expect(typeof q.then).toBe("function");
      expect(typeof q.catch).toBe("function");

      const data = await q.then((r) => r.data);
      expect(Array.isArray(data)).toBe(true);
    });

    it("supports .catch() on FirestoreMutation", async () => {
      const m = firebaseStore.from("tasks").insert({ id: "test" });
      expect(typeof m.then).toBe("function");
      expect(typeof m.catch).toBe("function");

      let caught = false;
      await m.catch(() => {
        caught = true;
      });
      expect(caught).toBe(false);
    });
  });

  describe("auth, rpc, functions, storage, and realtime channel", () => {
    it("returns currentUser from firebaseStore.auth.getUser()", async () => {
      const res = await firebaseStore.auth.getUser();
      expect(res.data.user?.uid).toBe("user_test_123");
    });

    it("signs out through firebaseStore.auth.signOut()", async () => {
      const res = await firebaseStore.auth.signOut();
      expect(res.error).toBeNull();
      expect(mockCurrentUser).toBeNull();
    });

    it("returns unauthenticated error when currentUser is null", async () => {
      mockCurrentUser = null;
      const res = await firebaseStore.from("tasks").select();
      expect(res.data).toBeNull();
      expect(res.error?.message).toContain("برای دسترسی به داده وارد شوید");

      const writeRes = await firebaseStore.from("tasks").insert({ title: "No Auth" });
      expect(writeRes.data).toBeNull();
      expect(writeRes.error?.message).toContain("برای ذخیره وارد شوید");
    });

    it("returns disabled notice for rpc and functions", async () => {
      const rpcRes = await firebaseStore.rpc("custom_proc");
      expect(rpcRes.data).toBeNull();
      expect(rpcRes.error?.message).toContain("هنوز برای Firebase پیکربندی نشده است");

      const fnRes = await firebaseStore.functions.invoke("custom-fn");
      expect(fnRes.data).toBeNull();
      expect(fnRes.error?.message).toContain("هنوز برای Firebase پیکربندی نشده است");
    });

    it("supports storage upload, getSignedUrl, and remove", async () => {
      const bucket = firebaseStore.storage.from("attachments");
      const blob = new Blob(["hello"], { type: "text/plain" });

      const upRes = await bucket.upload("file.txt", blob);
      expect(upRes.error).toBeNull();

      const urlRes = await bucket.createSignedUrl("file.txt", 3600);
      expect(urlRes.error).toBeNull();
      expect(urlRes.data?.signedUrl).toContain("https://storage.googleapis.com");

      const rmRes = await bucket.remove(["file.txt"]);
      expect(rmRes.error).toBeNull();
    });

    it("supports channels and subscription to firebase-store-changed", () => {
      let triggered = 0;
      const ch = firebaseStore.channel("custom-ch");
      ch.on("postgres_changes", {}, () => {
        triggered++;
      });
      ch.subscribe();

      window.dispatchEvent(new Event("firebase-store-changed"));
      expect(triggered).toBe(1);

      firebaseStore.removeChannel(ch);
      window.dispatchEvent(new Event("firebase-store-changed"));
      expect(triggered).toBe(1); // Unsubscribed, so not incremented
    });
  });
});
