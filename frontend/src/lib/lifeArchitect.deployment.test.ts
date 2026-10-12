import { beforeEach, describe, expect, it, vi } from "vitest";
import { deployLifeBlueprint, previewLifeBlueprint, type LifeBlueprint } from "./lifeArchitect";

const mocks = vi.hoisted(() => ({
  getDoc: vi.fn(), saveValues: vi.fn(), upsertGoal: vi.fn(), insert: vi.fn(),
}));
vi.mock("@/lib/ai", () => ({ callAI: vi.fn() }));
vi.mock("@/lib/firebase", () => ({ db: {}, doc: vi.fn(), getDoc: mocks.getDoc }));
vi.mock("@/lib/firestoreDataService", () => ({ saveMindValues: mocks.saveValues, upsertMindGoal: mocks.upsertGoal }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: (table: string) => ({ insert: (data: unknown) => {
  mocks.insert(table, data);
  return { error: null, select: () => ({ single: async () => ({ data: { id: "real-folder" } }) }) };
} }) } }));

const blueprint: LifeBlueprint = {
  title: "Test", summary: "", scientificInsight: "", recommendedWorkflow: "list",
  folders: [{ id: "f", name: "Folder", color: "blue", description: "" }],
  goals: [{ id: "g", folderId: "f", title: "Goal", timeHorizon: "quarterly", priority: "high" }],
  coreValues: ["peace"], habits: [], tasks: [],
};
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear();
  mocks.getDoc.mockResolvedValue({ exists: () => true, data: () => ({ values: { peace: { importance: 9, consistency: 4, value: "My reflection" } } }) });
  mocks.saveValues.mockResolvedValue(true); mocks.upsertGoal.mockResolvedValue(true);
});
describe("reviewed Life Architect deployment", () => {
  it("creates no goals or values for explicit empty selections and matches the preview", async () => {
    const expected = previewLifeBlueprint(blueprint, { goalIds: new Set(), valueKeys: new Set() });
    const actual = await deployLifeBlueprint(blueprint, "u", undefined, undefined, undefined, new Set(), new Set());
    expect(actual).toEqual(expected);
    expect(mocks.upsertGoal).not.toHaveBeenCalled(); expect(mocks.saveValues).not.toHaveBeenCalled();
  });
  it("does not count orphan goals when their folder cannot be deployed", () => {
    const orphan = { ...blueprint, folders: [] };
    expect(previewLifeBlueprint(orphan).goalsCount).toBe(0);
    expect(previewLifeBlueprint(blueprint, { folderIds: new Set() }).goalsCount).toBe(0);
  });
  it("preserves existing ratings when merging selected values", async () => {
    await deployLifeBlueprint(blueprint, "u", new Set(), undefined, undefined, new Set(), new Set(["peace"]));
    expect(mocks.saveValues).toHaveBeenCalledWith("u", { peace: { importance: 9, consistency: 4, value: "My reflection" } });
  });
  it("never overwrites unknown values after a failed read", async () => {
    mocks.getDoc.mockRejectedValue(new Error("offline"));
    const result = await deployLifeBlueprint(blueprint, "u", new Set(), undefined, undefined, new Set(), new Set(["peace"]));
    expect(result.valuesCount).toBe(0); expect(mocks.saveValues).not.toHaveBeenCalled();
  });
  it("does not report successful goal creation if either promised surface fails", async () => {
    mocks.upsertGoal.mockResolvedValue(false);
    expect((await deployLifeBlueprint(blueprint, "u", undefined, undefined, undefined, new Set(["g"]), new Set())).goalsCount).toBe(0);
    mocks.upsertGoal.mockResolvedValue(true);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    try {
      expect((await deployLifeBlueprint(blueprint, "u", undefined, undefined, undefined, new Set(["g"]), new Set())).goalsCount).toBe(0);
    } finally { vi.restoreAllMocks(); }
  });
});
