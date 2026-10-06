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
  if (!uid) { cacheKey = null; emit(EMPTY); return; }
  clearRetiredModuleStorage(uid);
  cacheKey = `arshnaz:modules:${uid}`;
  let cached: ModulesState | null = null;
  try { cached = JSON.parse(localStorage.getItem(cacheKey) || "null"); } catch { cached = null; }
  emit(cached?.ready ? { ...cached, ...fromServer({ unlocked: cached.unlocked || [], installed: cached.installed || [], is_admin: cached.isAdmin, is_owner: cached.isOwner }) } : EMPTY);
  try {
    const r = await arshFetch<ServerState>("/api/arsh/modules/me");
    if (cacheKey === `arshnaz:modules:${uid}`) setModulesState(fromServer(r));
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
