import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import {
  beginMindSession, createOrResumeConcern, getActiveMindSession, getMindSession, readMindSession,
  listMindSessions, listMindSessionsChecked, updateMindSession, attachMindTool, transitionMindSession,
  reconcileMindSession, listMindSessionVersions, mindSessionKey, exportMindSessions, importMindSessions,
} from "./sessionService";
import { migrateLegacyMindDraft, legacyMindDraftKey, attachLegacyMindTool } from "./legacyAdapters";
import type { MindSaveResult, MindSession } from "./sessionTypes";

function saved(result: MindSaveResult): MindSession {
  expect(result.ok, JSON.stringify(result)).toBe(true);
  if (result.ok === false) throw new Error(result.reason);
  return result.session;
}
function backup(ownerId: string): string {
  const result = exportMindSessions(ownerId);
  if (result.ok === false) throw new Error(result.reason);
  return result.value;
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("local authoritative concern sessions", () => {
  it("emits owner-only refresh events after verified heads, not failed or conflict saves", () => {
    const dispatch = vi.spyOn(window, "dispatchEvent");
    const original = saved(beginMindSession("a", "private concern", "fa"));
    expect(dispatch).toHaveBeenCalledTimes(1);
    const event = dispatch.mock.calls[0][0] as CustomEvent;
    expect(event.type).toBe("arshiam:mind-session");
    expect(event.detail).toEqual({ ownerId: "a" });
    expect(getMindSession("a", original.id)).toEqual(original);
    const current = saved(updateMindSession("a", { ...original, text: "private update" }, original.revision));
    expect(dispatch).toHaveBeenCalledTimes(2);
    updateMindSession("a", original, original.revision);
    expect(dispatch).toHaveBeenCalledTimes(2);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(updateMindSession("a", current, current.revision).ok).toBe(false);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
  it("creates separate concerns for identical text and resumes only explicit IDs", () => {
    const a = saved(beginMindSession("a", "same", "fa"));
    const b = saved(createOrResumeConcern("a", "same", "fa"));
    expect(a.id).not.toBe(b.id);
    expect(listMindSessions("a")).toHaveLength(2);
    expect(saved(createOrResumeConcern("a", "not a replacement", "en", a.id)).text).toBe("same");
    expect(getActiveMindSession("a")).not.toBeNull();
    expect(getMindSession("b", a.id)).toBeNull();
    expect(listMindSessions("b")).toEqual([]);
    expect(updateMindSession("b", a, a.revision).ok).toBe(false);
    expect(createOrResumeConcern("b", "same", "fa", a.id).ok).toBe(false);
  });
  it("persists complete steps, suggestions, action and feedback references", () => {
    let session = saved(beginMindSession("a", "concern", "en"));
    session = saved(attachMindTool("a", session.id, "thought", "thought:one", { toolVersion: "2" }));
    const next: MindSession = { ...session, goal: "clarify", intensity: "explore", steps: session.steps.map(s => ({
      ...s, answers: { text: "thought", evidence: ["one", "two"], details: { intensity: 3, unknown: null } }, status: "completed",
    })), suggestions: [{ id: "suggestion", source: "local", reason: "your goal", text: "try", inputRevision: session.revision, choice: "selected" }],
    actions: [{ id: "action", suggestionId: "suggestion", destination: "task", destinationId: "task-1", status: "converted" }],
    feedback: [{ id: "feedback", sessionId: session.id, toolId: "thought", toolVersion: "2", at: Date.now(), response: "uncertain" }] };
    session = saved(updateMindSession("a", next, session.revision));
    expect(getMindSession("a", session.id)).toEqual(session);
    expect(session).not.toHaveProperty("persistenceStatus");
    expect(updateMindSession("a", { ...session, actions: session.actions.map(a => ({ ...a, status: "pending" })) }, session.revision).ok).toBe(false);
    expect(updateMindSession("a", { ...session, feedback: [] }, session.revision).ok).toBe(false);
    expect(updateMindSession("a", { ...session, actions: [...session.actions, { ...session.actions[0], id: "second" }] }, session.revision).ok).toBe(false);
    expect(updateMindSession("a", { ...session, feedback: [{ ...session.feedback[0], sessionId: "foreign" }] }, session.revision).ok).toBe(false);
    expect(updateMindSession("a", { ...session, suggestions: [{ ...session.suggestions[0], inputRevision: 100 }] }, session.revision).ok).toBe(false);
    expect(updateMindSession("a", { ...session, suggestions: [{ ...session.suggestions[0], text: "changed meaning" }] }, session.revision).ok).toBe(false);
  });
  it("attaches several tools to the same ID idempotently without replacing immutable refs", () => {
    const session = saved(beginMindSession("a", "text", "fa"));
    const ref = { ownerId: "a", collection: "worry", recordId: "old" };
    const attached = saved(attachLegacyMindTool("a", session.id, "worry", "one", ref));
    const retry = saved(attachLegacyMindTool("a", session.id, "worry", "one", ref));
    expect(retry.revision).toBe(attached.revision);
    const second = saved(attachMindTool("a", session.id, "calm", "two"));
    expect(second.steps).toHaveLength(2);
    expect(second.steps.every(s => s.sessionId === session.id)).toBe(true);
    expect(attachLegacyMindTool("a", session.id, "worry", "one", { ...ref, recordId: "different" }).ok).toBe(false);
    expect(attachLegacyMindTool("a", session.id, "worry", "foreign", { ...ref, ownerId: "b" }).ok).toBe(false);
    expect(updateMindSession("a", { ...second, steps: [] }, second.revision).ok).toBe(false);
  });
  it("transitions content status independently, allowing finish without action and explicit reopen", () => {
    const session = saved(beginMindSession("a", "just writing", "en"));
    const finished = saved(transitionMindSession("a", session.id, "finished", session.revision));
    expect(finished.actions).toEqual([]);
    expect(getActiveMindSession("a")).toBeNull();
    const paused = saved(transitionMindSession("a", session.id, "paused", finished.revision));
    expect(getActiveMindSession("a")?.id).toBe(paused.id);
  });
  it("retains both stale and current versions and reconciles only with expected revision", () => {
    const original = saved(beginMindSession("a", "original", "fa"));
    const remote = saved(updateMindSession("a", { ...original, text: "remote" }, original.revision));
    const local = { ...original, text: "local" };
    const conflict = updateMindSession("a", local, original.revision);
    expect(conflict).toMatchObject({ ok: false, reason: "conflict", preserved: true, current: remote, proposed: { text: "local" } });
    expect(getMindSession("a", original.id)?.text).toBe("remote");
    const versions = listMindSessionVersions("a", original.id);
    expect(versions.ok && versions.value.map(v => v.session.text).sort()).toEqual(["local", "original", "remote"]);
    const reconciled = saved(reconcileMindSession("a", local, remote.revision));
    expect(reconciled.revision).toBe(3);
    const after = listMindSessionVersions("a", original.id);
    expect(after.ok && after.value.some(v => v.session.text === "remote")).toBe(true);
  });
  it("refuses malformed, foreign-owner and future storage without overwriting it", () => {
    const session = saved(beginMindSession("a", "original", "fa"));
    for (const raw of ["broken", JSON.stringify({ ...session, schemaVersion: 9 }), JSON.stringify({ ...session, ownerId: "b" })]) {
      localStorage.setItem(mindSessionKey("a", session.id), raw);
      expect(readMindSession("a", session.id).ok).toBe(false);
      expect(listMindSessionsChecked("a").ok).toBe(false);
      expect(updateMindSession("a", session, session.revision).ok).toBe(false);
      expect(beginMindSession("a", "new", "en").ok).toBe(false);
      expect(localStorage.getItem(mindSessionKey("a", session.id))).toBe(raw);
      expect(exportMindSessions("a").ok).toBe(false);
    }
  });
  it("preserves stale text even when the remote revision has attached another tool", () => {
    const original = saved(beginMindSession("a", "original", "fa"));
    const remote = saved(attachMindTool("a", original.id, "calm", "calm"));
    const conflict = updateMindSession("a", { ...original, text: "stale private edit" }, original.revision);
    expect(conflict).toMatchObject({ ok: false, reason: "conflict", preserved: true });
    expect(getMindSession("a", original.id)).toEqual(remote);
    const versions = listMindSessionVersions("a", original.id);
    expect(versions.ok && versions.value.some(v => v.session.text === "stale private edit")).toBe(true);
    // Explicit text reconciliation retains the remote artifact identities.
    expect(saved(reconcileMindSession("a", { ...remote, text: "stale private edit" }, remote.revision)).steps).toEqual(remote.steps);
  });
  it("does not claim success for quota or read-back failure", () => {
    const session = saved(beginMindSession("a", "original", "fa"));
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(updateMindSession("a", { ...session, text: "keep" }, session.revision)).toMatchObject({ ok: false, reason: "storage-write-failed", proposed: { text: "keep" }, preserved: false });
    expect(getMindSession("a", session.id)?.text).toBe("original");
    spy.mockImplementation(() => {});
    expect(beginMindSession("a", "not durable", "fa").ok).toBe(false);
  });
  it("append-before-head keeps a candidate when another writer changes the baseline", () => {
    const original = saved(beginMindSession("a", "original", "fa"));
    const key = mindSessionKey("a", original.id);
    const set = Storage.prototype.setItem;
    let raced = false;
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k, value) {
      set.call(this, k, value);
      if (!raced && k.includes(":version:")) {
        raced = true;
        set.call(this, key, JSON.stringify({ ...original, text: "racing", revision: 2 }));
      }
    });
    expect(updateMindSession("a", { ...original, text: "candidate" }, 1)).toMatchObject({ ok: false, reason: "conflict", preserved: true });
    expect(getMindSession("a", original.id)?.text).toBe("racing");
    const versions = listMindSessionVersions("a", original.id);
    expect(versions.ok && versions.value.some(v => v.session.text === "candidate")).toBe(true);
  });
});

describe("non-destructive migration and exact local backup", () => {
  it("notifies successful head and history-only imports but not rejected imports", () => {
    const session = saved(beginMindSession("a", "private backup", "fa"));
    const raw = backup("a");
    localStorage.clear();
    const dispatch = vi.spyOn(window, "dispatchEvent");
    expect(importMindSessions("b", raw).ok).toBe(false);
    expect(dispatch).not.toHaveBeenCalled();
    expect(importMindSessions("a", raw).ok).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect((dispatch.mock.calls[0][0] as CustomEvent).detail).toEqual({ ownerId: "a" });
    expect(getMindSession("a", session.id)).toEqual(session);
    expect(importMindSessions("a", raw).ok).toBe(true);
    expect(dispatch).toHaveBeenCalledTimes(2);
  });
  it("migrates only available text/path with unknown historical language and is idempotent", () => {
    const raw = JSON.stringify({ text: "old private text", path: "worry", updatedAt: 123 });
    localStorage.setItem(legacyMindDraftKey("a"), raw);
    const migrated = saved(migrateLegacyMindDraft("a"));
    expect(migrated.language).toBeNull();
    expect(migrated.steps).toEqual([]);
    expect(migrated.suggestions).toEqual([]);
    expect(migrated.legacyDraft).toEqual({ migrationVersion: 1, sourceKey: legacyMindDraftKey("a"), text: "old private text", path: "worry" });
    expect(migrated.createdAt).not.toBe(123);
    expect(saved(migrateLegacyMindDraft("a")).id).toBe(migrated.id);
    expect(listMindSessions("a")).toHaveLength(1);
    expect(localStorage.getItem(legacyMindDraftKey("a"))).toBe(raw);
    expect(migrateLegacyMindDraft("b").ok).toBe(false);
  });
  it("stops on unknown legacy data and resumes interrupted migration without duplicate ID", () => {
    localStorage.setItem(legacyMindDraftKey("a"), JSON.stringify({ text: "old", path: "unsupported" }));
    expect(migrateLegacyMindDraft("a").ok).toBe(false);
    expect(listMindSessions("a")).toEqual([]);
    localStorage.setItem(legacyMindDraftKey("a"), JSON.stringify({ text: "old", path: "think" }));
    const set = Storage.prototype.setItem;
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(function (this: Storage, k, v) {
      if (!k.includes(":version:")) throw new Error("interrupted");
      set.call(this, k, v);
    });
    expect(migrateLegacyMindDraft("a").ok).toBe(false);
    const versions = listMindSessionVersions("a");
    if (versions.ok === false) throw new Error(versions.reason);
    expect(versions.value).toHaveLength(1);
    spy.mockRestore();
    expect(saved(migrateLegacyMindDraft("a")).id).toBe(versions.value[0].session.id);
    expect(listMindSessions("a")).toHaveLength(1);
  });
  it("does not silently merge changed legacy text into a migrated concern after rollback", () => {
    localStorage.setItem(legacyMindDraftKey("a"), JSON.stringify({ text: "first", path: null }));
    const migrated = saved(migrateLegacyMindDraft("a"));
    const changed = JSON.stringify({ text: "new independent text", path: "worry" });
    localStorage.setItem(legacyMindDraftKey("a"), changed);
    expect(migrateLegacyMindDraft("a")).toEqual({ ok: false, reason: "legacy-draft-changed" });
    expect(getMindSession("a", migrated.id)?.text).toBe("first");
    expect(localStorage.getItem(legacyMindDraftKey("a"))).toBe(changed);
    expect(listMindSessions("a")).toHaveLength(1);
  });
  it("round-trips exact owner/schema/revision and conflict snapshots; retry is additive", () => {
    const a = saved(beginMindSession("a", "first", "fa"));
    const current = saved(updateMindSession("a", { ...a, text: "current" }, 1));
    updateMindSession("a", { ...a, text: "conflict" }, 1);
    const raw = backup("a");
    const parsed = JSON.parse(raw);
    localStorage.clear();
    expect(importMindSessions("b", raw)).toEqual({ ok: false, reason: "owner-mismatch" });
    expect(importMindSessions("a", raw)).toMatchObject({ ok: true, value: { imported: 1, conflicts: [] } });
    expect(getMindSession("a", a.id)).toEqual(current);
    expect(JSON.parse(backup("a")).versions).toEqual(expect.arrayContaining(parsed.versions));
    expect(importMindSessions("a", raw)).toMatchObject({ ok: true, value: { imported: 0, conflicts: [] } });
  });
  it("preserves both backup and current heads and refuses foreign/future backups", () => {
    const a = saved(beginMindSession("a", "backup", "fa"));
    const raw = backup("a");
    const current = saved(updateMindSession("a", { ...a, text: "current" }, 1));
    expect(importMindSessions("a", raw)).toMatchObject({ ok: true, value: { imported: 0, conflicts: [a.id] } });
    expect(getMindSession("a", a.id)).toEqual(current);
    const before = backup("a");
    const bad = JSON.parse(raw);
    bad.sessions[0].ownerId = "b";
    expect(importMindSessions("a", JSON.stringify(bad)).ok).toBe(false);
    bad.sessions[0].ownerId = "a";
    bad.schemaVersion = 2;
    expect(importMindSessions("a", JSON.stringify(bad)).ok).toBe(false);
    expect(backup("a")).toBe(before);
  });
  it("returns failure without deleting existing data on interrupted import", () => {
    saved(beginMindSession("a", "backup", "fa"));
    const raw = backup("a");
    localStorage.clear();
    const other = saved(beginMindSession("b", "unrelated", "en"));
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
    expect(importMindSessions("a", raw).ok).toBe(false);
    expect(getMindSession("b", other.id)).toEqual(other);
  });
});
