import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { clearMindDeviceData, exportMindDeviceData, importMindDeviceData, listMindDeviceDrafts, readMindRecoveryCandidates } from "./deviceData";
import { beginMindSession, listMindSessionsChecked } from "./sessionService";
import { workspaceDraftKey } from "./workspaceDraft";
import { recordMindFeedback } from "./feedback";
function store(owner: string, text: string) {
  localStorage.setItem(workspaceDraftKey(owner, "home"), JSON.stringify({ version: 1, owner, slot: "home", updatedAt: 1, value: { text, mood: null, energy: null, evidence: ["all", "fields"] } }));
}
function backup(owner: string) {
  const result = exportMindDeviceData(owner);
  if (result.ok === false) throw new Error(result.reason);
  return result.value;
}
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());
it("exports only the exact owner's full drafts, shared sessions and feedback", () => {
  store("a", "mine"); store("b", "foreign");
  beginMindSession("a", "concern", "fa"); beginMindSession("b", "other concern", "en");
  recordMindFeedback("a", { toolId: "breathing", toolVersion: "1", sessionId: "x", response: "uncomfortable" });
  const raw = backup("a");
  expect(raw).toContain("mine"); expect(raw).toContain("uncomfortable"); expect(raw).toContain("all");
  expect(raw).not.toContain("foreign"); expect(raw).not.toContain("other concern");
});
it("restores complete records idempotently into a fresh device store", () => {
  store("a", "private"); beginMindSession("a", "concern", "en");
  const raw = backup("a"); localStorage.clear();
  expect(importMindDeviceData("a", raw)).toMatchObject({ ok: true, value: { conflicts: 0 } });
  expect(importMindDeviceData("a", raw)).toMatchObject({ ok: true, value: { imported: 0, conflicts: 0 } });
  expect(listMindDeviceDrafts("a")).toMatchObject({ ok: true, value: [{ value: { text: "private", evidence: ["all", "fields"] } }] });
  expect(listMindSessionsChecked("a")).toMatchObject({ ok: true, value: [{ text: "concern" }] });
});
it("rejects a foreign-owner file before any write", () => {
  store("a", "private"); const raw = backup("a"); localStorage.clear();
  expect(importMindDeviceData("b", raw)).toMatchObject({ ok: false, reason: "owner-mismatch" });
  expect(localStorage.length).toBe(0);
});
it.each(["fields", "timestamp"])("rejects malformed restored %s before exposing a draft to an editor", fault => {
  store("a", "valid"); const data = JSON.parse(backup("a"));
  if (fault === "fields") data.drafts[0].value.text = null;
  else data.drafts[0].updatedAt = 1e100;
  localStorage.clear();
  expect(importMindDeviceData("a", JSON.stringify(data)).ok).toBe(false);
  expect(localStorage.length).toBe(0);
});
it("preserves conflicting imported versions without replacing visible drafts or duplicating retry candidates", () => {
  store("a", "old"); const raw = backup("a"); store("a", "working");
  expect(importMindDeviceData("a", raw)).toMatchObject({ ok: true, value: { conflicts: 1 } });
  expect(localStorage.getItem(workspaceDraftKey("a", "home"))).toContain("working");
  importMindDeviceData("a", raw);
  expect(readMindRecoveryCandidates("a")).toMatchObject({ ok: true, value: [{ raw: expect.stringContaining("old") }] });
  expect(backup("a")).toContain("recoveries");
  expect(backup("a")).toContain("old");
});
it("does not silently export an unreadable or foreign envelope as an empty backup", () => {
  localStorage.setItem(workspaceDraftKey("a", "home"), "broken");
  expect(exportMindDeviceData("a").ok).toBe(false);
  store("a", "x");
  const key = workspaceDraftKey("a", "home");
  localStorage.setItem(key, localStorage.getItem(key)!.replace('"owner":"a"', '"owner":"b"'));
  expect(exportMindDeviceData("a").ok).toBe(false);
});
it("quota failure refuses restore success and leaves the working copy intact", () => {
  store("a", "old"); const raw = backup("a"); store("a", "working");
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("quota"); });
  expect(importMindDeviceData("a", raw).ok).toBe(false);
  expect(localStorage.getItem(workspaceDraftKey("a", "home"))).toContain("working");
});
it("privacy deletion clears only Mind data for the selected owner", () => {
  store("a", "mine"); store("b", "foreign"); beginMindSession("a", "concern", "en");
  localStorage.setItem("tasks:all:a", "tasks"); localStorage.setItem("api-key", "secret");
  expect(clearMindDeviceData("a")).toBe(true);
  expect(localStorage.getItem(workspaceDraftKey("a", "home"))).toBeNull();
  expect(localStorage.getItem(workspaceDraftKey("b", "home"))).toContain("foreign");
  expect(localStorage.getItem("tasks:all:a")).toBe("tasks"); expect(localStorage.getItem("api-key")).toBe("secret");
});
