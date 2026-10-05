import { describe, expect, it } from "vitest";
import { applyPatchResolution, beginTaskPatch, createTaskPatchJournal, resolveTaskPatch } from "./taskPatchJournal";

describe("task patch journal", () => {
  it("does not let an older failed write roll back a newer edit", () => {
    const journal = createTaskPatchJournal();
    const original = { title: "Before", priority: "low" };
    const older = beginTaskPatch(journal, "u1:t1", original, { title: "Old edit" });
    const newer = beginTaskPatch(journal, "u1:t1", { ...original, title: "Old edit" }, { title: "New edit" });

    const afterOldFailure = applyPatchResolution({ ...original, title: "New edit" }, resolveTaskPatch(journal, "u1:t1", older, false));
    expect(afterOldFailure.title).toBe("New edit");
    const afterNewSave = applyPatchResolution(afterOldFailure, resolveTaskPatch(journal, "u1:t1", newer, true));
    expect(afterNewSave.title).toBe("New edit");
  });

  it("rolls a newer failed edit back to the latest earlier saved value", () => {
    const journal = createTaskPatchJournal();
    const original = { title: "Before" };
    const first = beginTaskPatch(journal, "u1:t1", original, { title: "First" });
    const second = beginTaskPatch(journal, "u1:t1", { title: "First" }, { title: "Second" });

    const whileSecondPending = applyPatchResolution({ title: "Second" }, resolveTaskPatch(journal, "u1:t1", first, true));
    expect(whileSecondPending.title).toBe("Second");
    const afterSecondFails = applyPatchResolution(whileSecondPending, resolveTaskPatch(journal, "u1:t1", second, false));
    expect(afterSecondFails.title).toBe("First");
  });

  it("rolls back only failed fields and preserves unrelated newer edits", () => {
    const journal = createTaskPatchJournal();
    const original = { title: "Original", priority: "low" };
    const failedTitle = beginTaskPatch(journal, "u1:t1", original, { title: "Unsaved" });
    const savedPriority = beginTaskPatch(journal, "u1:t1", { title: "Unsaved", priority: "low" }, { priority: "high" });
    const afterFailure = applyPatchResolution({ title: "Unsaved", priority: "high" }, resolveTaskPatch(journal, "u1:t1", failedTitle, false));
    const final = applyPatchResolution(afterFailure, resolveTaskPatch(journal, "u1:t1", savedPriority, true));

    expect(final).toEqual({ title: "Original", priority: "high" });
  });
});
