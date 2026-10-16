import type { CloudSnapshot } from "@/lib/cloudStateSync";
import { createMiniAppId, sanitizeMiniApps, type MiniApp } from "@/lib/miniAppsStore";

export const MINI_APPS_HISTORY_EVENT = "arshnaz:mini-apps-history-updated";
export const MAX_MINI_APP_VERSIONS = 10;
export const MAX_MINI_APPS_HISTORY_BYTES = 550_000;
const MAX_HISTORY_ENTRIES = 100;
const PREFIX = "arshnaz_mini_apps_history_v1_";
export type VersionKind = "initial" | "save" | "checkpoint" | "restore";
export interface MiniAppVersion { id: string; appId: string; app: MiniApp; savedAt: number; kind: VersionKind }
interface DeletedApp { appId: string; deletedAt: number }
export interface MiniAppsHistoryState { versions: MiniAppVersion[]; deletedApps: DeletedApp[] }
export interface MiniAppsHistorySnapshot extends CloudSnapshot { data: MiniAppsHistoryState }
const emptyState = (): MiniAppsHistoryState => ({ versions: [], deletedApps: [] });
const bytes = (value: unknown) => new TextEncoder().encode(JSON.stringify(value)).byteLength;
const key = (userId: string) => `${PREFIX}${userId}`;

function sameApp(a: MiniApp, b: MiniApp): boolean {
  return a.id === b.id && a.html === b.html && a.name === b.name && a.emoji === b.emoji && a.description === b.description && a.aiRequest === b.aiRequest;
}

/** Bound hostile/cloud payloads, deduplicate, and trim oldest history only (never live app code). */
export function sanitizeMiniAppsHistory(value: unknown): MiniAppsHistoryState {
  if (!value || typeof value !== "object") return emptyState();
  const row = value as Record<string, unknown>;
  const deleted = new Map<string, DeletedApp>();
  if (Array.isArray(row.deletedApps)) for (const item of row.deletedApps) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.appId !== "string" || !entry.appId.trim() || entry.appId.length > 100 || typeof entry.deletedAt !== "number" || !Number.isSafeInteger(entry.deletedAt) || entry.deletedAt < 0) continue;
    const previous = deleted.get(entry.appId);
    if (!previous || previous.deletedAt < entry.deletedAt) deleted.set(entry.appId, { appId: entry.appId, deletedAt: entry.deletedAt });
  }
  // Never silently forget deletion fences: a disconnected device can hold an old
  // copy indefinitely. If fences alone exhaust the budget, fail rather than revive code.
  const deletedApps = [...deleted.values()].sort((a, b) => b.deletedAt - a.deletedAt || a.appId.localeCompare(b.appId));
  if (bytes({ versions: [], deletedApps }) > MAX_MINI_APPS_HISTORY_BYTES) throw Object.assign(new Error("History deletion fences exceed the storage budget"), { code: "failed-precondition" });
  const candidates: MiniAppVersion[] = [];
  if (Array.isArray(row.versions)) for (const item of row.versions) {
    if (!item || typeof item !== "object") continue;
    const entry = item as Record<string, unknown>;
    if (typeof entry.id !== "string" || !entry.id.trim() || entry.id.length > 100 || typeof entry.appId !== "string" || typeof entry.savedAt !== "number" || !Number.isSafeInteger(entry.savedAt) || entry.savedAt < 0 || !["initial", "save", "checkpoint", "restore"].includes(String(entry.kind))) continue;
    const app = sanitizeMiniApps([entry.app])[0];
    if (!app || app.id !== entry.appId || deleted.has(app.id)) continue;
    candidates.push({ id: entry.id, appId: app.id, app, savedAt: entry.savedAt, kind: entry.kind as VersionKind });
  }
  candidates.sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id));
  const state: MiniAppsHistoryState = { versions: [], deletedApps };
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (const version of candidates) {
    if (seen.has(version.id) || (counts.get(version.appId) ?? 0) >= MAX_MINI_APP_VERSIONS) continue;
    if (state.versions.length >= MAX_HISTORY_ENTRIES) break;
    const candidate = { ...state, versions: [...state.versions, version] };
    if (bytes(candidate) > MAX_MINI_APPS_HISTORY_BYTES) continue;
    state.versions.push(version);
    seen.add(version.id);
    counts.set(version.appId, (counts.get(version.appId) ?? 0) + 1);
  }
  return state;
}

function mergeStates(a: unknown, b: unknown): MiniAppsHistoryState {
  const left = sanitizeMiniAppsHistory(a);
  const right = sanitizeMiniAppsHistory(b);
  return sanitizeMiniAppsHistory({ versions: [...left.versions, ...right.versions], deletedApps: [...left.deletedApps, ...right.deletedApps] });
}

export function readMiniAppsHistorySnapshot(userId: string): MiniAppsHistorySnapshot | null {
  try {
    const raw = localStorage.getItem(key(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (typeof parsed.updatedAt !== "number" || !Number.isSafeInteger(parsed.updatedAt) || parsed.updatedAt < 0) return null;
    return { updatedAt: parsed.updatedAt, data: sanitizeMiniAppsHistory(parsed.data) };
  } catch { return null; }
}

export function loadMiniAppsHistory(userId: string): MiniAppsHistoryState {
  return readMiniAppsHistorySnapshot(userId)?.data ?? emptyState();
}

function persist(userId: string, snapshot: MiniAppsHistorySnapshot): MiniAppsHistorySnapshot {
  const serialized = JSON.stringify(snapshot);
  if (new TextEncoder().encode(serialized).byteLength > MAX_MINI_APPS_HISTORY_BYTES + 100) throw new Error("History exceeds its storage limit");
  localStorage.setItem(key(userId), serialized);
  if (localStorage.getItem(key(userId)) !== serialized) throw new Error("History storage could not be verified");
  window.dispatchEvent(new CustomEvent(MINI_APPS_HISTORY_EVENT, { detail: { userId } }));
  return snapshot;
}

/** Include the pre-save version and new version so the first edit remains reversible. */
export function recordMiniAppVersions(userId: string, apps: MiniApp[], kind: VersionKind = "save"): MiniAppsHistorySnapshot {
  const previous = readMiniAppsHistorySnapshot(userId);
  let state = previous?.data ?? emptyState();
  let savedAt = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);
  const addedIds: string[] = [];
  for (const candidate of apps) {
    const app = sanitizeMiniApps([candidate])[0];
    if (!app || state.deletedApps.some(entry => entry.appId === app.id)) throw new Error("Invalid or deleted app cannot be versioned");
    const latest = state.versions.find(version => version.appId === app.id);
    if (latest && sameApp(latest.app, app)) {
      if (kind === "save" && latest.kind === "checkpoint") {
        state = sanitizeMiniAppsHistory({ ...state, versions: state.versions.map(version => version.id === latest.id ? { ...version, app: { ...app }, kind: "save", savedAt: savedAt++ } : version) });
        addedIds.push(latest.id);
      }
      continue;
    }
    const version: MiniAppVersion = { id: createMiniAppId(), appId: app.id, app: { ...app }, savedAt: savedAt++, kind: latest ? kind : "initial" };
    addedIds.push(version.id);
    state = sanitizeMiniAppsHistory({ ...state, versions: [version, ...state.versions] });
  }
  if (!addedIds.length && previous) return previous;
  if (addedIds.some(id => !state.versions.some(version => version.id === id))) throw new Error("The version could not fit in history");
  return persist(userId, { updatedAt: savedAt, data: state });
}

export function removeMiniAppHistory(userId: string, appId: string): MiniAppsHistorySnapshot {
  const previous = readMiniAppsHistorySnapshot(userId);
  const deletedAt = Math.max(Date.now(), (previous?.updatedAt ?? 0) + 1);
  const state = sanitizeMiniAppsHistory({ versions: previous?.data.versions ?? [], deletedApps: [...(previous?.data.deletedApps ?? []), { appId, deletedAt }] });
  return persist(userId, { updatedAt: deletedAt, data: state });
}

/** Additive rebase preserves versions created independently on another device. */
export function reconcileMiniAppsHistory(remote: CloudSnapshot, local: CloudSnapshot): MiniAppsHistorySnapshot | null {
  const data = mergeStates(remote.data, local.data);
  if (JSON.stringify(data) === JSON.stringify(sanitizeMiniAppsHistory(remote.data))) return null;
  return { updatedAt: Math.max(Date.now(), remote.updatedAt, local.updatedAt) + 1, data };
}

export function applyMiniAppsHistoryCloud(userId: string, value: unknown, updatedAt: number): MiniAppsHistorySnapshot {
  if (!Number.isSafeInteger(updatedAt) || updatedAt < 0) throw new Error("Invalid history snapshot timestamp");
  const remote = { updatedAt, data: sanitizeMiniAppsHistory(value) };
  const local = readMiniAppsHistorySnapshot(userId);
  const merged = local ? reconcileMiniAppsHistory(remote, local) : null;
  return persist(userId, merged ?? remote);
}
