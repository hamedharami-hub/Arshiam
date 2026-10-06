import { useSyncExternalStore } from "react";
import { clearRetiredModuleStorage } from "./retiredModuleStorage";

export type ModuleId = "study" | "mind";

const arshFetch = async <T,>(path: string, init?: RequestInit): Promise<T> => (await import("@/lib/arshApi")).arshFetch<T>(path, init);

type ModuleDef = { titleFa: string; titleEn: string; descFa: string; descEn: string; paths: string[]; prefetch: () => Promise<unknown> };

/** Everything that belongs to a hidden module. A path owned by several modules is visible if any is installed. */
export const APP_MODULES: Record<ModuleId, ModuleDef> = {
  study: {
    titleFa: "استودیوی مطالعه", titleEn: "Study studio",
    descFa: "کتابخانهٔ دانش، مطالعهٔ تعاملی، مایندمپ", descEn: "Knowledge library, interactive study, mind map",
    paths: ["/app/knowledge", "/app/interactive-study", "/app/knowledge-mindmap", "/app/continue"],
    prefetch: () => Promise.all([import("@/pages/KnowledgeBaseView"), import("@/pages/InteractiveStudyView")]),
  },
  mind: {
    titleFa: "ذهن", titleEn: "Mind",
    descFa: "داشبورد ذهن، حال امروز، بررسی فکر، آرام‌شدن، تنفس و نگرانی", descEn: "Mind dashboard, daily mood, thought check, calming, breathing and worry",
    paths: ["/app/mind", "/app/checkin", "/app/thoughts", "/app/abc", "/app/calm", "/app/sleep", "/app/breathing", "/app/screener", "/app/worry"],
    prefetch: () => Promise.all([import("@/pages/MindView"), import("@/pages/CheckinView")]),
  },
};
export const MODULE_IDS = Object.keys(APP_MODULES) as ModuleId[];

export type ModulesState = { ready: boolean; unlocked: ModuleId[]; installed: ModuleId[]; isAdmin: boolean; isOwner: boolean };

const EMPTY: ModulesState = { ready: false, unlocked: [], installed: [], isAdmin: false, isOwner: false };
let state: ModulesState = EMPTY;
let cacheKey: string | null = null;
const listeners = new Set<() => void>();
let retiredCleanupRetry: { uid: string; handler: () => void } | null = null;

function emit(next: ModulesState) {
  state = next;
  if (cacheKey && next.ready) {
    try { localStorage.setItem(cacheKey, JSON.stringify(next)); } catch { /* storage full */ }
  }
  listeners.forEach((l) => l());
}

export function setModulesState(next: Partial<ModulesState>) {
  emit({ ...state, ready: true, ...next });
}

export function getModulesState() {
  return state;
}

export function useModules(): ModulesState {
  return useSyncExternalStore((l) => { listeners.add(l); return () => listeners.delete(l); }, () => state, () => state);
}

async function cleanRetiredModuleData(uid: string): Promise<boolean> {
  const { retireOwnedModuleData } = await import("@/lib/offlineQueue");
  const queued = await retireOwnedModuleData(uid);
  const { auth } = await import("@/lib/firebase");
  if (auth.currentUser?.uid !== uid) throw new Error("The active account does not own retired-module cleanup.");
  const { purgeRetiredModuleCloudData } = await import("@/lib/retiredModuleCloudPurge");
  const cloud = await purgeRetiredModuleCloudData(uid);
  if (queued.incomplete) console.warn("[appModules] Retired-module queue cleanup is incomplete; ambiguous items were preserved.");
  return !queued.incomplete && !cloud.incomplete;
}

function clearRetiredModuleCleanupRetry(uid: string): void {
  if (retiredCleanupRetry?.uid !== uid) return;
  if (typeof window !== "undefined") window.removeEventListener("online", retiredCleanupRetry.handler);
  retiredCleanupRetry = null;
}

function startRetiredModuleCloudPurge(uid: string, queueIncomplete: boolean): void {
  void import("@/lib/firebase").then(({ auth }) => {
    if (cacheKey !== `arshnaz:modules:${uid}` || auth.currentUser?.uid !== uid) return null;
    return import("@/lib/retiredModuleCloudPurge").then(({ purgeRetiredModuleCloudData }) => purgeRetiredModuleCloudData(uid));
  }).then((result) => {
    if (!result || cacheKey !== `arshnaz:modules:${uid}`) return;
    if (result.incomplete || queueIncomplete) scheduleRetiredModuleCleanupRetry(uid);
    else clearRetiredModuleCleanupRetry(uid);
  }).catch((error) => {
    if (cacheKey !== `arshnaz:modules:${uid}`) return;
    console.warn("[appModules] Retired-module cloud purge could not be verified.", error);
    scheduleRetiredModuleCleanupRetry(uid);
  });
}

function scheduleRetiredModuleCleanupRetry(uid: string): void {
  if (typeof window === "undefined") return;
  if (retiredCleanupRetry?.uid === uid) return;
  if (retiredCleanupRetry) window.removeEventListener("online", retiredCleanupRetry.handler);

  const handler = () => {
    if (retiredCleanupRetry?.handler === handler) retiredCleanupRetry = null;
    void cleanRetiredModuleData(uid).then((complete) => {
      if (complete) clearRetiredModuleCleanupRetry(uid);
      else scheduleRetiredModuleCleanupRetry(uid);
    }).catch((error) => {
      console.warn("[appModules] Retired-module cleanup retry failed.", error);
      scheduleRetiredModuleCleanupRetry(uid);
    });
  };
  retiredCleanupRetry = { uid, handler };
  window.addEventListener("online", handler, { once: true });
}

function pathOwners(path: string): ModuleId[] {
  const clean = path.split(/[?#]/)[0];
  return MODULE_IDS.filter((id) => APP_MODULES[id].paths.some((p) => clean === p || clean.startsWith(`${p}/`)));
}

export function isPathAllowed(path: string, s: ModulesState = state): boolean {
  const clean = path.split(/[?#]/)[0];
  if (/^\/app\/(?:pharmacy(?:-[^/]*)?|review)(?:\/|$)/.test(clean)) return false;
  const owners = pathOwners(path);
  return owners.length === 0 || owners.some((id) => s.installed.includes(id));
}

export function hasModule(id: ModuleId, s: ModulesState = state): boolean {
  return s.installed.includes(id);
}

type ServerState = { unlocked: ModuleId[]; installed: ModuleId[]; is_admin?: boolean; is_owner?: boolean };

function fromServer(r: ServerState): Partial<ModulesState> {
  const known = (xs: string[]) => xs.filter((x): x is ModuleId => (MODULE_IDS as string[]).includes(x));
  return { unlocked: known(r.unlocked), installed: known(r.installed), isAdmin: r.is_admin === true, isOwner: r.is_owner === true };
}

/** Called on sign-in / sign-out. Uses the per-account cache first so hidden sections never flash. */
export async function syncModulesForUser(uid: string | null): Promise<void> {
  if (!uid) {
    cacheKey = null;
    if (typeof window !== "undefined" && retiredCleanupRetry) window.removeEventListener("online", retiredCleanupRetry.handler);
    retiredCleanupRetry = null;
    emit(EMPTY);
    return;
  }
  if (typeof window !== "undefined" && retiredCleanupRetry?.uid !== uid && retiredCleanupRetry) {
    window.removeEventListener("online", retiredCleanupRetry.handler);
    retiredCleanupRetry = null;
  }
  const userCacheKey = `arshnaz:modules:${uid}`;
  cacheKey = userCacheKey;
  emit(EMPTY);
  clearRetiredModuleStorage(uid);
  try {
    const { retireOwnedModuleData } = await import("@/lib/offlineQueue");
    const queued = await retireOwnedModuleData(uid);
    if (queued.incomplete) console.warn("[appModules] Retired-module queue cleanup is incomplete; ambiguous items were preserved.");
    if (cacheKey === userCacheKey) startRetiredModuleCloudPurge(uid, queued.incomplete);
  } catch (error) {
    // Keep ambiguous queue entries and retry cleanup when connectivity returns.
    console.warn("[appModules] Retired-module cleanup could not be verified.", error);
    scheduleRetiredModuleCleanupRetry(uid);
  }
  if (cacheKey !== userCacheKey) return;
  let cached: ModulesState | null = null;
  try { cached = JSON.parse(localStorage.getItem(userCacheKey) || "null"); } catch { cached = null; }
  emit(cached?.ready ? { ...cached, ...fromServer({ unlocked: cached.unlocked || [], installed: cached.installed || [], is_admin: cached.isAdmin, is_owner: cached.isOwner }) } : EMPTY);
  try {
    const r = await arshFetch<ServerState>("/api/arsh/modules/me");
    if (cacheKey === userCacheKey) setModulesState(fromServer(r));
  } catch {
    if (!state.ready) setModulesState({});
  }
}

export async function redeemModuleCode(code: string): Promise<ModuleId[]> {
  const r = await arshFetch<ServerState & { newly_unlocked: ModuleId[] }>("/api/arsh/modules/redeem", { method: "POST", body: JSON.stringify({ code }) });
  setModulesState(fromServer(r));
  await Promise.all(r.newly_unlocked.map((id) => APP_MODULES[id]?.prefetch().catch(() => undefined)));
  return r.newly_unlocked;
}

export async function setModuleInstalled(id: ModuleId, installed: boolean): Promise<void> {
  const r = await arshFetch<ServerState>(`/api/arsh/modules/${id}/${installed ? "install" : "uninstall"}`, { method: "POST" });
  setModulesState(fromServer(r));
  if (installed) await APP_MODULES[id].prefetch().catch(() => undefined);
}

export type ModuleCode = { id: string; label: string; modules: string[]; max_uses: number | null; uses: number; expires_at: string | null; revoked: boolean; created_at: string; code?: string };

export const listModuleCodes = () => arshFetch<{ items: ModuleCode[] }>("/api/arsh/modules/admin/codes").then((r) => r.items);
export const createModuleCode = (body: { label: string; modules: string[]; max_uses?: number | null; expires_in_days?: number | null }) =>
  arshFetch<ModuleCode>("/api/arsh/modules/admin/codes", { method: "POST", body: JSON.stringify(body) });
export const revokeModuleCode = (id: string, withdrawAccess: boolean) =>
  arshFetch(`/api/arsh/modules/admin/codes/${id}/revoke`, { method: "POST", body: JSON.stringify({ withdraw_access: withdrawAccess }) });
