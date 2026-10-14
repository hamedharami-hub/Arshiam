import { beforeEach, describe, expect, it, vi } from "vitest";
import { convertSuggestion, deleteSession, localResult, makeQuestions, makeResult, needsDestinationId, saveSession, subscribeSessions, suggestTopics } from "./service";
import type { NeedsSession } from "./types";
import { getMethod } from "./methods";

const mocks = vi.hoisted(() => ({ ai: vi.fn(), transaction: vi.fn(), set: vi.fn(), snapshot: vi.fn(), upsert: vi.fn(), exists: false, records: new Map<string, unknown>() }));
vi.mock("@/lib/firebase", () => ({ db: {} }));
vi.mock("@/lib/ai", () => ({ callAI: mocks.ai }));
vi.mock("@/lib/aiSettings", () => ({ getOpConfig: () => ({ provider: "gemini", model: "test-model", apiKey: "test-key" }) }));
vi.mock("@/lib/aiProviders", () => ({ getProviderKey: () => "test-key" }));
vi.mock("@/lib/firestoreDataService", () => ({ upsertHabit: mocks.upsert, upsertNote: mocks.upsert, upsertTask: mocks.upsert }));
vi.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => args, doc: (_db: unknown, ...parts: string[]) => parts.join("/"),
  query: (...args: unknown[]) => args, orderBy: vi.fn(), onSnapshot: mocks.snapshot,
  setDoc: mocks.set, deleteDoc: vi.fn(), runTransaction: mocks.transaction,
}));
const session: NeedsSession = { id: "need-test", category: "unknown", topic: null, detail: null, text: "Private writing", qa: [], questions: [], result: null, lang: "en", created_at: "2026-10-15", updated_at: "2026-10-15" };

describe("Needs service safety", () => {
  beforeEach(() => {
    mocks.ai.mockReset(); mocks.set.mockReset(); mocks.upsert.mockReset(); mocks.records.clear(); mocks.snapshot.mockReset();
    mocks.transaction.mockReset().mockImplementation(async (_db, fn) => fn({
      get: async (ref: string) => ({ exists: () => mocks.records.has(ref), data: () => mocks.records.get(ref) }),
      set: (ref: string, value: unknown) => { mocks.set(ref, value); mocks.records.set(ref, value); },
    }));
  });

  it("defaults to local for every entry point even with a configured key", async () => {
    await suggestTopics("I can't sleep", "en");
    await makeQuestions(session);
    const result = await makeResult(session);
    expect(mocks.ai).not.toHaveBeenCalled();
    expect(result.source).toBe("local");
    expect(result.methodIds.length).toBeGreaterThan(0);
    expect(result.suggestions.every((s) => !s.text.includes(session.text))).toBe(true);
  });

  it.each([
    ["calm", "usual", "grounding"], ["clarify", "usual", "define-problem"], ["step", "usual", "small-steps"],
    ["calm", "low", "grounding"], ["clarify", "low", "five-min-step"], ["step", "low", "five-min-step"],
  ] as const)("uses declared %s/%s choices for the %s library branch", (goal, capacity, firstMethod) => {
    const result = localResult({ ...session, preferences: { goal, capacity } });
    expect(result.suggestions[0].methodId).toBe(firstMethod);
    expect(result.suggestions.every((suggestion) => !!suggestion.reason && suggestion.source === "local")).toBe(true);
    if (capacity === "low") {
      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].kind).toBe("note");
      expect(result.suggestions[0].text).toBe(`${getMethod(firstMethod)!.title.en}: ${getMethod(firstMethod)!.steps[0].en}`);
      expect(result.methodIds).toEqual([]); expect(result.checkIds).toEqual([]);
    }
    expect(mocks.ai).not.toHaveBeenCalled();
  });

  it("does not infer goal, capacity or conclusions from private text or reflective answers", () => {
    const first = localResult(session);
    const second = localResult({ ...session, text: "I have low energy and want a task", qa: [{ q: "Goal?", a: "Please calm me down" }] });
    expect(second.suggestions).toEqual(first.suggestions);
    expect(second.summary).toBe(first.summary);
    expect(first.summary).toContain("not an interpretation or diagnosis");
    expect(first.summary).not.toContain(session.text);
  });

  it.each(["irrelevant", "other", "no_energy"] as const)("%s feedback changes local options without changing the original result", (feedback) => {
    const original = localResult({ ...session, preferences: { goal: "step", capacity: "usual" } });
    const snapshot = JSON.stringify(original);
    const suggestion = original.suggestions[0];
    const result = localResult({ ...session, preferences: { goal: "step", capacity: "usual" }, result: original, decisionHistory: [{ suggestionId: suggestion.id!, feedback, suggestion, alternative: null, created_at: "2026-10-15" }] });
    expect(result.suggestions[0].id).not.toBe(suggestion.id);
    expect(original.suggestions.map((s) => s.id)).not.toContain(result.suggestions[0].id);
    expect(JSON.stringify(original)).toBe(snapshot);
    if (feedback === "no_energy") {
      expect(result.suggestions[0].methodId).toBe("five-min-step");
      expect(result.suggestions[0].kind).toBe("note"); expect(result.suggestions).toHaveLength(1);
    }
    expect(mocks.ai).not.toHaveBeenCalled();
  });

  it("ends the low-capacity branch instead of recycling rejected options", () => {
    const small = localResult({ ...session, preferences: { goal: "calm", capacity: "low" } }).suggestions[0];
    const firstDecision = { suggestionId: small.id!, feedback: "other" as const, suggestion: small, alternative: null, created_at: "2026-10-15" };
    const nextSession = { ...session, preferences: { goal: "calm" as const, capacity: "low" as const }, result: { ...localResult(session), suggestions: [small] }, decisionHistory: [firstDecision] };
    const next = localResult(nextSession).suggestions[0];
    expect(next.methodId).toBe("five-min-step");
    expect(localResult({ ...nextSession, decisionHistory: [firstDecision, { ...firstDecision, suggestionId: next.id!, suggestion: next }] }).suggestions).toEqual([]);
  });

  it("validates optional AI reasons and leaves local preferences/decisions out of the AI payload", async () => {
    mocks.ai.mockResolvedValue({ data: { summary: "Tentative", suggestions: [
      { text: "One", kind: "note", reason: "  Might be useful  " },
      { text: "Two", kind: "task", reason: { private: "Do not stringify" } },
      { text: "Three", kind: "note", reason: " " },
    ] } });
    const result = await makeResult({ ...session, preferences: { goal: "calm", capacity: "low" }, decisionHistory: [] }, { useAI: true });
    expect(result.suggestions[0].reason).toBe("Might be useful");
    expect(result.suggestions[1].reason).toBe("A possible idea, not a diagnosis.");
    expect(result.suggestions[2].reason).toBe("A possible idea, not a diagnosis.");
    expect(mocks.ai.mock.calls[0][1]).toEqual({ situation: session.text, answers: [] });
    expect(mocks.ai.mock.calls[0][5].systemPromptOverride).toContain("reasons are optional");
  });

  it("requires opt-in and excludes general personalization in all requests", async () => {
    mocks.ai.mockResolvedValue({ data: {} });
    const signal = new AbortController().signal;
    await suggestTopics(session.text, "en", { useAI: true, signal });
    await makeQuestions(session, { useAI: true, signal });
    await makeResult(session, { useAI: true, signal });
    expect(mocks.ai).toHaveBeenCalledTimes(3);
    for (const call of mocks.ai.mock.calls) expect(call[5]).toMatchObject({ skipPersonalization: true, signal });
  });

  it("rejects malformed arrays and objects without crashing or copying them", async () => {
    mocks.ai.mockResolvedValue({ data: { matches: {}, questions: [null, {}, " "], summary: {}, suggestions: [{ text: {}, kind: "task" }] } });
    expect(await suggestTopics("zzzz qqqq", "en", { useAI: true })).toEqual([]);
    expect(await makeQuestions(session, { useAI: true })).toEqual([]);
    expect((await makeResult(session, { useAI: true })).source).toBe("local");
    mocks.ai.mockResolvedValue({ data: { summary: "Tentative", causes: [null, {}, "One"], suggestions: [null, {}, { text: "safe", kind: "unknown" }], reflections: {}, method_ids: {} } });
    const result = await makeResult(session, { useAI: true });
    expect(result.causes).toEqual(["One"]);
    expect(result.suggestions.some((s) => s.text.includes("[object Object]"))).toBe(false);
  });

  it("rejects aborted output instead of applying it or silently falling back", async () => {
    const controller = new AbortController();
    mocks.ai.mockImplementation(async () => { controller.abort(); return { data: { summary: "Stale" } }; });
    await expect(makeResult(session, { useAI: true, signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  });

  it("reports subscription errors through the error channel, not as empty data", () => {
    const data = vi.fn(); const error = vi.fn();
    subscribeSessions("owner-A", data, error);
    mocks.snapshot.mock.calls[0][2](new Error("Offline"));
    expect(data).not.toHaveBeenCalled(); expect(error).toHaveBeenCalledOnce();
  });

  it("deletes private content while fencing late saves against resurrection", async () => {
    expect(await saveSession("A", session)).toBe(true);
    expect(await deleteSession("A", session.id)).toBe(true);
    const ref = `users/A/need_sessions/${session.id}`;
    expect(mocks.records.get(ref)).toMatchObject({ id: session.id, user_id: "A", deleted_at: expect.any(String) });
    expect(mocks.records.get(ref)).not.toHaveProperty("text");
    expect(await saveSession("A", { ...session, text: "Late save" })).toBe(false);
    const data = vi.fn(); subscribeSessions("A", data);
    mocks.snapshot.mock.calls[0][1]({ docs: [{ id: session.id, data: () => mocks.records.get(ref) }] });
    expect(data).toHaveBeenCalledWith([]);
  });

  it("creates a stable task with no due date/private details and never resets an existing task", async () => {
    const suggestion = { text: "Small step", kind: "task" as const };
    const options = { suggestionId: "suggestion-1" };
    expect(await convertSuggestion("owner-A", suggestion, session.id, options)).toBe(true);
    const [ref, task] = mocks.set.mock.calls[0];
    expect(task).toMatchObject({ due_date: null, description: null, source_type: "mind_need", source_id: session.id });
    mocks.records.set(ref, { ...task, completed: true, status: "done", title: "Edited later" });
    expect(await convertSuggestion("owner-A", suggestion, session.id, options)).toBe(true);
    expect(mocks.set).toHaveBeenCalledTimes(1);
    expect(mocks.records.get(ref)).toMatchObject({ completed: true, title: "Edited later" });
    expect(mocks.upsert).not.toHaveBeenCalled();
  });

  it("requires explicit habit recurrence and preserves the existing habit on retry", async () => {
    const habit = { kind: "habit" as const, text: "Reflect" };
    expect(await convertSuggestion("A", habit, "session", { suggestionId: "h" })).toBe(false);
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(await convertSuggestion("A", habit, "session", { suggestionId: "h", frequency: "weekly" })).toBe(true);
    expect(mocks.set.mock.calls[0][1]).toMatchObject({ frequency: "weekly", completedDates: [] });
    await convertSuggestion("A", habit, "session", { suggestionId: "h", frequency: "daily" });
    expect(mocks.set).toHaveBeenCalledOnce();
  });

  it("keeps identities distinct, and transaction failures are honest", async () => {
    expect(needsDestinationId("a_b", "c", "task")).not.toBe(needsDestinationId("a", "b_c", "task"));
    mocks.transaction.mockRejectedValue(new Error("Offline"));
    expect(await convertSuggestion("A", { text: "step", kind: "task" }, "s", { suggestionId: "1" })).toBe(false);
    expect(localResult(session).suggestions.every((s) => !!s.id)).toBe(true);
  });
});
