import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  upsertDailyCheckin,
  upsertAssessmentResult,
  type DailyCheckinItem,
  type AssessmentResultItem,
} from "./firestoreDataService";
import { awardDailyCheckinDrops, getGardenState, saveGardenState } from "./garden";
import { createTaskFromMind } from "./taskFromMind";

// Mock firebase
vi.mock("./firebase", () => {
  const store = new Map<string, any>();
  return {
    db: {},
    collection: vi.fn((_db, ...pathSegments) => pathSegments.join("/")),
    doc: vi.fn((_db, ...pathSegments) => pathSegments.join("/")),
    setDoc: vi.fn(async (docPath: string, data: any, options?: { merge?: boolean }) => {
      const existing = store.get(docPath) || {};
      store.set(docPath, options?.merge ? { ...existing, ...data } : data);
    }),
    getDoc: vi.fn(async (docPath: string) => ({
      exists: () => store.has(docPath),
      data: () => store.get(docPath),
      id: docPath.split("/").pop(),
    })),
    getDocs: vi.fn(async (colPath: string) => {
      const docs: any[] = [];
      for (const [key, value] of store.entries()) {
        if (key.startsWith(colPath) && key.split("/").length === colPath.split("/").length + 1) {
          docs.push({ id: key.split("/").pop(), data: () => value });
        }
      }
      return { docs, empty: docs.length === 0 };
    }),
    deleteDoc: vi.fn(async (docPath: string) => {
      store.delete(docPath);
    }),
    onSnapshot: vi.fn(() => () => {}),
    __mockStore: store,
  };
});

// Mock offlineQueue cache
vi.mock("./offlineQueue", () => {
  const cache = new Map<string, any>();
  return {
    cacheGet: vi.fn(async (key: string) => cache.get(key) ?? null),
    cacheSet: vi.fn(async (key: string, val: any) => cache.set(key, val)),
    enqueueOp: vi.fn(async () => {}),
    __mockCache: cache,
  };
});

describe("Canonical data writes and idempotency", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("Check-in writes & Garden rewards", () => {
    it("updates existing checkin on retry with same date, without duplicate entries", async () => {
      const userId = "user_test_123";
      const today = "2026-09-20";

      const checkin1: DailyCheckinItem = {
        id: today,
        user_id: userId,
        checkin_date: today,
        mood: 7,
        energy: 6,
        focus: null,
        sleep_quality: null,
        stress: null,
        sleep_hours: null,
        notes: "First attempt",
      };

      const res1 = await upsertDailyCheckin(userId, checkin1);
      expect(res1).toBe(true);

      // Retry/update on the same day
      const checkin2: DailyCheckinItem = {
        ...checkin1,
        mood: 8,
        notes: "Updated checkin notes",
      };

      const res2 = await upsertDailyCheckin(userId, checkin2);
      expect(res2).toBe(true);

      // Verify via getDailyCheckin that the single document was updated
      const { getDailyCheckin } = await import("./firestoreDataService");
      const doc = await getDailyCheckin(userId, today);
      expect(doc).toBeDefined();
      expect(doc?.mood).toBe(8);
      expect(doc?.notes).toBe("Updated checkin notes");

      // Verify that only 1 document exists for this date in the mock store
      const { __mockStore } = (await import("./firebase")) as any;
      const checkinDocs = Array.from(__mockStore.keys()).filter((k: any) =>
        k.startsWith(`users/${userId}/daily_checkins`)
      );
      expect(checkinDocs).toHaveLength(1);
    });

    it("prevents duplicate garden drops on retry or multiple checkins on same date", () => {
      const today = "2026-09-20";

      // First check-in reward
      const res1 = awardDailyCheckinDrops(today, 20, "Daily check-in logged");
      expect(res1.awarded).toBe(true);
      const initialDrops = res1.drops;

      // Second check-in on the same date (e.g. retry or edit)
      const res2 = awardDailyCheckinDrops(today, 20, "Daily check-in logged");
      expect(res2.awarded).toBe(false);
      expect(res2.drops).toBe(initialDrops); // Drops count unchanged!

      // Next day check-in
      const res3 = awardDailyCheckinDrops("2026-09-21", 20, "Daily check-in logged");
      expect(res3.awarded).toBe(true);
      expect(res3.drops).toBe(initialDrops + 20);
    });
  });

  describe("Screener result writes", () => {
    it("upserts assessment result with stable ID to prevent duplicates on submit retry", async () => {
      const userId = "user_test_456";
      const stableId = "result_phq9_idempotent_1";

      const payload: Partial<AssessmentResultItem> = {
        id: stableId,
        assessment_type: "phq9",
        completed_at: new Date().toISOString(),
        scores: { raw: 5, normalized: 19 },
        analysis: { severity: "mild" },
      };

      const saved1 = await upsertAssessmentResult(userId, payload);
      expect(saved1?.id).toBe(stableId);

      // Simulating a network retry with the exact same ID
      const retryPayload: Partial<AssessmentResultItem> = {
        ...payload,
        scores: { raw: 5, normalized: 19 },
      };

      const saved2 = await upsertAssessmentResult(userId, retryPayload);
      expect(saved2?.id).toBe(stableId);
      expect(saved2?.scores.raw).toBe(5);
    });
  });

  describe("createTaskFromMind writes", () => {
    it("creates task via canonical single write path without error", async () => {
      const userId = "user_test_789";
      const customTaskId = "task_mind_cbt_1";

      const res = await createTaskFromMind({
        id: customTaskId,
        user_id: userId,
        title: "Go for a mindful walk",
        due_in_days: 1,
        source_type: "cbt_thought",
        source_id: "thought_123",
      });

      expect(res.ok).toBe(true);
      expect(res.task?.id).toBe(customTaskId);
      expect(res.task?.title).toBe("Go for a mindful walk");
      expect(res.task?.source_type).toBe("cbt_thought");
    });
  });
});
