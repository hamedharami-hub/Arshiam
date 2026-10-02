// "My Island" (جزیرهٔ من) – a penalty-free isometric building game.
// Points are earned from real activities (tasks, habits, focus, check-ins) and are NEVER
// deducted automatically. The only way points leave the wallet is when the user chooses to
// build something, and removing a building always refunds its full cost.

export type MaterialId = "wood" | "stone" | "brick" | "glass" | "marble" | "gold";
export type BuildingType =
  | "tree" | "palm" | "hut" | "well" | "house" | "windmill"
  | "market" | "lighthouse" | "fountain" | "tower" | "palace";

export interface Material {
  id: MaterialId;
  fa: string;
  en: string;
  unlockAt: number; // lifetime points required
  color: string;
}

export interface BuildingSpec {
  type: BuildingType;
  fa: string;
  en: string;
  cost: number;
  material: MaterialId;
  descFa: string;
  descEn: string;
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number;
  y: number;
  placedAt: string;
}

export interface IslandLogItem {
  reason: string;
  points: number;
  date: string;
}

export interface IslandState {
  points: number;
  lifetime: number;
  buildings: PlacedBuilding[];
  log: IslandLogItem[];
  updatedAt?: number;
}

export const GRID_SIZE = 8;

export const MATERIALS: Material[] = [
  { id: "wood", fa: "چوب", en: "Wood", unlockAt: 0, color: "#a0703f" },
  { id: "stone", fa: "سنگ", en: "Stone", unlockAt: 100, color: "#8d96a0" },
  { id: "brick", fa: "آجر", en: "Brick", unlockAt: 250, color: "#c0674a" },
  { id: "glass", fa: "شیشه", en: "Glass", unlockAt: 500, color: "#7fc4d8" },
  { id: "marble", fa: "مرمر", en: "Marble", unlockAt: 900, color: "#e8e2d6" },
  { id: "gold", fa: "طلا", en: "Gold", unlockAt: 1500, color: "#d9a93a" },
];

export const BUILDINGS: BuildingSpec[] = [
  { type: "tree", fa: "درخت", en: "Tree", cost: 5, material: "wood", descFa: "سایه‌ای برای استراحت", descEn: "Shade for a calm break" },
  { type: "palm", fa: "نخل", en: "Palm", cost: 8, material: "wood", descFa: "حال‌وهوای ساحلی", descEn: "A touch of beach vibes" },
  { type: "hut", fa: "کلبه", en: "Hut", cost: 20, material: "wood", descFa: "اولین خانهٔ جزیره", descEn: "Your island's first home" },
  { type: "well", fa: "چاه آب", en: "Well", cost: 30, material: "stone", descFa: "منبع زندگی ساکنان", descEn: "Fresh water for everyone" },
  { type: "windmill", fa: "آسیاب بادی", en: "Windmill", cost: 55, material: "stone", descFa: "انرژی از باد", descEn: "Energy from the wind" },
  { type: "house", fa: "خانه", en: "House", cost: 45, material: "brick", descFa: "خانه‌ای گرم و محکم", descEn: "A warm, sturdy home" },
  { type: "market", fa: "بازارچه", en: "Market", cost: 70, material: "brick", descFa: "قلب تپندهٔ شهر", descEn: "The beating heart of town" },
  { type: "lighthouse", fa: "فانوس دریایی", en: "Lighthouse", cost: 90, material: "glass", descFa: "راهنمای کشتی‌ها", descEn: "Guides ships home" },
  { type: "fountain", fa: "فواره", en: "Fountain", cost: 80, material: "marble", descFa: "میدانی آرام", descEn: "A peaceful square" },
  { type: "tower", fa: "برج", en: "Tower", cost: 120, material: "marble", descFa: "نماد پشتکار", descEn: "A symbol of persistence" },
  { type: "palace", fa: "کاخ", en: "Palace", cost: 200, material: "gold", descFa: "شاهکار جزیرهٔ شما", descEn: "Your island's masterpiece" },
];

export const ISLAND_LEVELS = [0, 3, 7, 12, 18, 25, 34, 45];

export function getBuildingSpec(type: BuildingType): BuildingSpec {
  return BUILDINGS.find((b) => b.type === type) || BUILDINGS[0];
}

export function getMaterial(id: MaterialId): Material {
  return MATERIALS.find((m) => m.id === id) || MATERIALS[0];
}

export function isMaterialUnlocked(id: MaterialId, lifetime: number): boolean {
  return lifetime >= getMaterial(id).unlockAt;
}

export function getNextMaterial(lifetime: number): Material | null {
  return MATERIALS.find((m) => m.unlockAt > lifetime) || null;
}

export function getIslandLevel(buildingCount: number): { level: number; current: number; next: number | null } {
  let level = 1;
  ISLAND_LEVELS.forEach((need, i) => { if (buildingCount >= need) level = i + 1; });
  const next = ISLAND_LEVELS[level] ?? null;
  return { level, current: ISLAND_LEVELS[level - 1], next };
}

const STORAGE_KEY = "arshnaz_island_v1";
const USER_KEY = "arshnaz_garden_user";
export const ISLAND_EVENT = "arshnaz-island-updated";

function userId(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}
function storageKey() {
  const uid = userId();
  return uid ? `${STORAGE_KEY}_${uid}` : STORAGE_KEY;
}

function defaultState(): IslandState {
  return {
    points: 40,
    lifetime: 40,
    buildings: [],
    log: [{ reason: "هدیهٔ خوش‌آمد جزیره", points: 40, date: new Date().toISOString() }],
  };
}

function hasStored(): boolean {
  try { return localStorage.getItem(storageKey()) !== null; } catch { return false; }
}

export function getIslandState(): IslandState {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as Partial<IslandState>;
    return { ...defaultState(), ...parsed, buildings: parsed.buildings || [], log: parsed.log || [] };
  } catch {
    return defaultState();
  }
}

function writeState(state: IslandState) {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(ISLAND_EVENT, { detail: state }));
  } catch { /* storage full or unavailable */ }
}

let cloud: { push: () => void; stop: () => void } | null = null;
let cloudUser: string | null = null;

export function startIslandCloudSync(uid: string | null) {
  if (cloudUser === uid) return;
  cloud?.stop();
  cloud = null;
  cloudUser = uid;
  if (!uid || typeof window === "undefined" || import.meta.env.MODE === "test") return;
  void import("./cloudStateSync")
    .then(({ bindCloudState }) => {
      if (cloudUser !== uid) return;
      cloud = bindCloudState(uid, "island", {
        read: () => (hasStored() ? { updatedAt: getIslandState().updatedAt || 0, data: getIslandState() } : null),
        apply: (data, updatedAt) => writeState({ ...defaultState(), ...(data as IslandState), updatedAt }),
      });
    })
    .catch(() => undefined);
}

export function saveIslandState(state: IslandState) {
  writeState({ ...state, updatedAt: Date.now() });
  cloud?.push();
}

/** Credit points earned from real activities. Never negative. */
export function creditIsland(amount: number, reason = "پاداش فعالیت"): IslandState {
  const safe = Math.max(0, Math.floor(amount));
  const current = getIslandState();
  if (!safe) return current;
  const next: IslandState = {
    ...current,
    points: current.points + safe,
    lifetime: current.lifetime + safe,
    log: [{ reason, points: safe, date: new Date().toISOString() }, ...current.log].slice(0, 30),
  };
  saveIslandState(next);
  return next;
}

export type BuildResult = { ok: true; state: IslandState } | { ok: false; reason: "locked" | "points" | "occupied" | "bounds" };

export function canBuild(state: IslandState, type: BuildingType): "ok" | "locked" | "points" {
  const spec = getBuildingSpec(type);
  if (!isMaterialUnlocked(spec.material, state.lifetime)) return "locked";
  if (state.points < spec.cost) return "points";
  return "ok";
}

function occupied(state: IslandState, x: number, y: number, ignoreId?: string) {
  return state.buildings.some((b) => b.x === x && b.y === y && b.id !== ignoreId);
}
function inBounds(x: number, y: number) {
  return x >= 0 && y >= 0 && x < GRID_SIZE && y < GRID_SIZE;
}

export function placeBuilding(type: BuildingType, x: number, y: number): BuildResult {
  const state = getIslandState();
  if (!inBounds(x, y)) return { ok: false, reason: "bounds" };
  if (occupied(state, x, y)) return { ok: false, reason: "occupied" };
  const check = canBuild(state, type);
  if (check !== "ok") return { ok: false, reason: check };
  const spec = getBuildingSpec(type);
  const id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `b-${Date.now()}-${Math.random()}`;
  const next: IslandState = {
    ...state,
    points: state.points - spec.cost,
    buildings: [...state.buildings, { id, type, x, y, placedAt: new Date().toISOString() }],
  };
  saveIslandState(next);
  return { ok: true, state: next };
}

export function moveBuilding(id: string, x: number, y: number): BuildResult {
  const state = getIslandState();
  if (!inBounds(x, y)) return { ok: false, reason: "bounds" };
  if (occupied(state, x, y, id)) return { ok: false, reason: "occupied" };
  const next = { ...state, buildings: state.buildings.map((b) => (b.id === id ? { ...b, x, y } : b)) };
  saveIslandState(next);
  return { ok: true, state: next };
}

/** Removing a building refunds its full cost – nothing is ever lost. */
export function removeBuilding(id: string): IslandState {
  const state = getIslandState();
  const target = state.buildings.find((b) => b.id === id);
  if (!target) return state;
  const next = {
    ...state,
    points: state.points + getBuildingSpec(target.type).cost,
    buildings: state.buildings.filter((b) => b.id !== id),
  };
  saveIslandState(next);
  return next;
}
