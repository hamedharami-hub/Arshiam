import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MiniApp } from "./miniAppsStore";
import {
  applyMiniAppsHistoryCloud, loadMiniAppsHistory, MAX_MINI_APP_VERSIONS,
  MAX_MINI_APPS_HISTORY_BYTES, MINI_APPS_HISTORY_EVENT, readMiniAppsHistorySnapshot,
  reconcileMiniAppsHistory, recordMiniAppVersions, removeMiniAppHistory, sanitizeMiniAppsHistory,
} from "./miniAppsHistory";

const app: MiniApp = { id: "tool", name: "Tool", emoji: "", description: "", aiRequest: "", html: "<p>Original</p>", createdAt: "2026-01-01", updatedAt: "2026-01-01" };
beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("account-scoped HTML version history", () => {
  it("captures the original and new version before the first save", () => {
    recordMiniAppVersions("a", [app, { ...app, html: "<p>Changed</p>" }], "checkpoint");
    const state = loadMiniAppsHistory("a");
    expect(state.versions.map(version => version.app.html)).toEqual(["<p>Changed</p>", app.html]);
    expect(state.versions.map(version => version.kind)).toEqual(["checkpoint", "initial"]);
  });
  it("promotes an acknowledged checkpoint to a saved version without duplication", () => {
    recordMiniAppVersions("a", [app]);
    recordMiniAppVersions("a", [{ ...app, html: "<p>Changed</p>" }], "checkpoint");
    const id = loadMiniAppsHistory("a").versions[0].id;
    recordMiniAppVersions("a", [{ ...app, html: "<p>Changed</p>" }], "save");
    expect(loadMiniAppsHistory("a").versions).toHaveLength(2);
    expect(loadMiniAppsHistory("a").versions[0]).toMatchObject({ id, kind: "save" });
  });
  it("does not create versions for identical code and metadata", () => {
    const first = recordMiniAppVersions("a", [app]);
    recordMiniAppVersions("a", [{ ...app, updatedAt: "later" }]);
    expect(loadMiniAppsHistory("a").versions).toHaveLength(1);
    expect(readMiniAppsHistorySnapshot("a")?.updatedAt).toBe(first.updatedAt);
  });
  it("records metadata changes and isolates accounts", () => {
    recordMiniAppVersions("a", [app]);
    recordMiniAppVersions("a", [{ ...app, description: "New description" }]);
    recordMiniAppVersions("b", [{ ...app, name: "Other account" }]);
    expect(loadMiniAppsHistory("a").versions).toHaveLength(2);
    expect(loadMiniAppsHistory("b").versions).toHaveLength(1);
    expect(loadMiniAppsHistory("b").versions[0].app.name).toBe("Other account");
  });
  it("keeps at most ten latest versions per tool", () => {
    for (let i = 0; i < 15; i++) recordMiniAppVersions("a", [{ ...app, html: `<p>${i}</p>` }]);
    const versions = loadMiniAppsHistory("a").versions;
    expect(versions).toHaveLength(MAX_MINI_APP_VERSIONS);
    expect(versions[0].app.html).toBe("<p>14</p>");
    expect(versions.at(-1)?.app.html).toBe("<p>5</p>");
  });
  it("prunes old versions under the shared UTF-8 byte budget", () => {
    for (let i = 0; i < 10; i++) recordMiniAppVersions("a", [{ ...app, html: "س".repeat(50_000) + i }]);
    const state = loadMiniAppsHistory("a");
    expect(new TextEncoder().encode(JSON.stringify(state)).byteLength).toBeLessThanOrEqual(MAX_MINI_APPS_HISTORY_BYTES);
    expect(state.versions.length).toBeLessThan(MAX_MINI_APP_VERSIONS);
    expect(state.versions[0].app.html.endsWith("9")).toBe(true);
  });
  it.each(["throw", "silent"])("does not acknowledge failed local retention (%s)", mode => {
    const listener = vi.fn();
    window.addEventListener(MINI_APPS_HISTORY_EVENT, listener);
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { if (mode === "throw") throw new Error("quota"); });
    expect(() => recordMiniAppVersions("a", [app])).toThrow();
    expect(readMiniAppsHistorySnapshot("a")).toBeNull();
    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener(MINI_APPS_HISTORY_EVENT, listener);
  });
  it("rejects oversized version snapshots without changing existing history", () => {
    recordMiniAppVersions("a", [app]);
    const before = localStorage.getItem("arshnaz_mini_apps_history_v1_a");
    expect(() => recordMiniAppVersions("a", [{ ...app, html: "x".repeat(120_001) }])).toThrow();
    expect(localStorage.getItem("arshnaz_mini_apps_history_v1_a")).toBe(before);
  });
  it("sanitizes malformed cloud entries and duplicate version ids", () => {
    const version = recordMiniAppVersions("a", [app]).data.versions[0];
    const state = sanitizeMiniAppsHistory({ versions: [null, { id: "x" }, version, version, { ...version, id: "bad", appId: "other" }], deletedApps: [] });
    expect(state.versions).toHaveLength(1);
    expect(sanitizeMiniAppsHistory(null)).toEqual({ versions: [], deletedApps: [] });
  });
  it("merges independent device versions instead of replacing local history", () => {
    const local = recordMiniAppVersions("a", [app]);
    const remote = recordMiniAppVersions("b", [{ ...app, html: "<p>Remote version</p>" }]);
    const merged = applyMiniAppsHistoryCloud("a", remote.data, remote.updatedAt);
    expect(merged.data.versions).toHaveLength(2);
    expect(merged.updatedAt).toBeGreaterThan(Math.max(local.updatedAt, remote.updatedAt));
    expect(reconcileMiniAppsHistory(merged, merged)).toBeNull();
  });
  it("does not resurrect deleted app versions from an older cloud copy", () => {
    const old = recordMiniAppVersions("a", [app]);
    const removed = removeMiniAppHistory("a", app.id);
    expect(removed.data.versions).toHaveLength(0);
    const merged = applyMiniAppsHistoryCloud("a", old.data, old.updatedAt);
    expect(merged.data.versions).toHaveLength(0);
    expect(merged.data.deletedApps[0].appId).toBe(app.id);
    expect(() => recordMiniAppVersions("a", [app])).toThrow();
  });
  it("ignores corrupt local storage and invalid remote timestamps", () => {
    localStorage.setItem("arshnaz_mini_apps_history_v1_a", "not-json");
    expect(loadMiniAppsHistory("a").versions).toEqual([]);
    expect(() => applyMiniAppsHistoryCloud("a", {}, NaN)).toThrow();
    expect(() => applyMiniAppsHistoryCloud("a", {}, -1)).toThrow();
  });
});

describe("durable history deletion fences", () => {
  it("retains deletion fences beyond 200 tools without resurrecting older remote code", () => {
    const old = recordMiniAppVersions("a", [app]);
    removeMiniAppHistory("a", app.id);
    for (let i = 0; i < 205; i++) removeMiniAppHistory("a", `deleted-${i}`);
    expect(loadMiniAppsHistory("a").deletedApps.length).toBeGreaterThan(200);
    const merged = applyMiniAppsHistoryCloud("a", old.data, old.updatedAt);
    expect(merged.data.versions).toHaveLength(0);
    expect(merged.data.deletedApps.some(item => item.appId === app.id)).toBe(true);
  });
  it("fails closed when deletion fences alone exceed the byte budget", () => {
    recordMiniAppVersions("a", [app]);
    const before = localStorage.getItem("arshnaz_mini_apps_history_v1_a");
    const deletedApps = Array.from({ length: 8000 }, (_, i) => ({ appId: `${i}-` + "x".repeat(80), deletedAt: i }));
    expect(() => applyMiniAppsHistoryCloud("a", { versions: [], deletedApps }, 100)).toThrow("storage budget");
    expect(localStorage.getItem("arshnaz_mini_apps_history_v1_a")).toBe(before);
  });
});
