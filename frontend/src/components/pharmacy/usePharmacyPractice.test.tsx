import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uid: "a",
  resolveA: null as null | (() => void),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: mocks.uid } }) }));
vi.mock("@/lib/pharmacyPracticeSync", () => ({
  readPracticeRecords: (uid: string) => ({ [uid]: { id: uid, kind: "starred_phrase", key: uid, deleted: false, data: { id: uid, scenarioId: "s", textEn: uid, textFa: "", createdAt: "2026-01-01" } } }),
  pullPracticeRecords: (uid: string) => uid === "a" ? new Promise((resolve) => { mocks.resolveA = () => resolve({ a: { id: "a", kind: "starred_phrase", key: "a", deleted: false, data: { id: "a", scenarioId: "s", textEn: "a", textFa: "", createdAt: "2026-01-01" } } }); }) : Promise.resolve({ b: { id: "b", kind: "starred_phrase", key: "b", deleted: false, data: { id: "b", scenarioId: "s", textEn: "b", textFa: "", createdAt: "2026-01-01" } } }),
  savePracticeRecord: vi.fn(),
  selectStarredPhrases: (records: Record<string, { data: unknown }>) => Object.values(records).map((record) => record.data),
  selectReferralLetters: () => ({}),
  selectScenarioProgress: () => ({}),
}));

import { usePharmacyPractice } from "./usePharmacyPractice";

describe("usePharmacyPractice account isolation", () => {
  afterEach(() => { mocks.uid = "a"; mocks.resolveA = null; });

  it("ignores a previous account's late pull after switching users", async () => {
    const { result, rerender } = renderHook(() => usePharmacyPractice());
    expect(result.current.starred[0].textEn).toBe("a");
    mocks.uid = "b";
    rerender();
    expect(result.current.starred[0].textEn).toBe("b");
    await act(async () => { mocks.resolveA?.(); await Promise.resolve(); });
    expect(result.current.starred[0].textEn).toBe("b");
  });
});
