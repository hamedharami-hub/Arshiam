import { beforeEach, describe, expect, it, vi } from "vitest";
import { preserveSourceRevision, readSourceRevisions, sameSourceDocument, sourceFingerprint, sourceRestorePatch } from "./knowledgeSourceRevisions";
import type { KnowledgeDocument } from "./knowledgeTypes";
const doc = { id: "lesson", user_id: "owner", title: "Title", content_html: "Original", content_en: "", updated_at: "v1" } as KnowledgeDocument;
describe("device source recovery", () => {
  beforeEach(() => localStorage.clear());
  it("retains empty fields, isolates accounts and bounds history to ten changes", () => {
    for (let i = 0; i < 12; i++) preserveSourceRevision("owner", doc, { content_en: `Translation ${i}` });
    const rows = readSourceRevisions("owner", doc.id);
    expect(rows).toHaveLength(10);
    expect(rows[0].source.content_en).toBe("");
    expect(rows[0].source.title_en).toBe("");
    expect(rows.at(-1)?.expectedSource).toBe(sourceFingerprint({ ...doc, content_en: "Translation 11" }));
    expect(readSourceRevisions("other", doc.id)).toEqual([]);
  });
  it("rejects another owner and fails closed if recovery cannot be stored", () => {
    expect(() => preserveSourceRevision("other", doc, {})).toThrow();
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(() => preserveSourceRevision("owner", doc, {})).toThrow("quota");
    write.mockRestore();
  });
  it("rejects a storage implementation that silently fails to retain the snapshot", () => {
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {});
    expect(() => preserveSourceRevision("owner", doc, {})).toThrow("could not be stored");
    write.mockRestore();
  });
  it("detects changed source, document, owner and revision", () => {
    expect(sameSourceDocument(doc, { ...doc })).toBe(true);
    for (const patch of [{ content_en: "new" }, { id: "other" }, { user_id: "other" }, { updated_at: "v2" }]) expect(sameSourceDocument(doc, { ...doc, ...patch })).toBe(false);
  });
  it("restores only the expected source for its owner, with a guarded write", () => {
    const revision = preserveSourceRevision("owner", doc, { content_en: "Translated" });
    const current = { ...doc, content_en: "Translated", updated_at: "v2" };
    expect(sourceRestorePatch("owner", current, revision)).toMatchObject({ content_en: "", _expected_document_updated_at: "v2" });
    expect(() => sourceRestorePatch("other", current, revision)).toThrow("owner");
    expect(() => sourceRestorePatch("owner", { ...current, id: "other" }, revision)).toThrow("another lesson");
    expect(() => sourceRestorePatch("owner", { ...current, content_html: "Later edit" }, revision)).toThrow("changed");
  });
  it("uses the account cleanup suffix and migrates an earlier v2 key without losing snapshots", () => {
    const revision = preserveSourceRevision("owner", doc, { content_en: "Translated" });
    localStorage.removeItem("arshnaz:knowledge-source-revisions:v2:lesson:owner");
    localStorage.setItem("arshnaz:knowledge-source-revisions:v2:owner:lesson", JSON.stringify([revision]));
    expect(readSourceRevisions("owner", "lesson")).toEqual([revision]);
    expect(localStorage.getItem("arshnaz:knowledge-source-revisions:v2:owner:lesson")).toBeNull();
    expect(localStorage.getItem("arshnaz:knowledge-source-revisions:v2:lesson:owner")).not.toBeNull();
  });
  it("does not delete earlier v2 recovery data when migration storage fails", () => {
    localStorage.setItem("arshnaz:knowledge-source-revisions:v2:owner:lesson", "[]");
    const write = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    readSourceRevisions("owner", "lesson");
    expect(localStorage.getItem("arshnaz:knowledge-source-revisions:v2:owner:lesson")).toBe("[]");
    write.mockRestore();
  });
  it("allows production account cleanup to remove only that account's snapshots", async () => {
    preserveSourceRevision("owner", doc, { content_en: "Translation" });
    preserveSourceRevision("other", { ...doc, user_id: "other" }, { content_en: "Other translation" });
    const { clearUserLocalData } = await import("./offlineQueue");
    await clearUserLocalData("owner");
    expect(readSourceRevisions("owner", doc.id)).toEqual([]);
    expect(readSourceRevisions("other", doc.id)).toHaveLength(1);
  });
});
