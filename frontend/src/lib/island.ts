// "My Island" (جزیرهٔ من) – a penalty-free isometric building game.
// Points are earned from real activities (tasks, habits, focus, check-ins) and are NEVER
// deducted automatically. The only way points leave the wallet is when the user chooses to
// build something, and removing a building always refunds its full cost.

export type MaterialId = "wood" | "stone" | "brick" | "glass" | "marble" | "gold";
export type BuildingType =
  | "tree" | "palm" | "hut" | "well" | "house" | "windmill"
  | "market" | "lighthouse" | "fountain" | "tower" | "palace"
  | GiftType;
export type GiftType = "flowerbed" | "lantern" | "bench" | "statue" | "arch";

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
  gift?: boolean;
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
  /** Activities finished since the residents last celebrated. */
  pendingCheers?: number;
  week?: { key: string; tasks: number; claimed: boolean };
  gifts?: Partial<Record<GiftType, number>>;
  giftsEarned?: number;
  /** Custom names chosen by the user, by resident index. */
  residentNames?: string[];
  /** Show the mini island card on the Today page (default on). */
  showOnToday?: boolean;
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

/** Special, free decorations earned from the weekly gift (5 tasks in a week). */
export const GIFTS: BuildingSpec[] = [
  { type: "flowerbed", fa: "باغچهٔ گل", en: "Flowerbed", cost: 0, material: "wood", gift: true, descFa: "هدیهٔ یک هفتهٔ پرتلاش", descEn: "A gift for a busy week" },
  { type: "lantern", fa: "فانوس کوچه", en: "Street Lantern", cost: 0, material: "wood", gift: true, descFa: "شب‌های جزیره را روشن می‌کند", descEn: "Lights up island nights" },
  { type: "bench", fa: "نیمکت", en: "Bench", cost: 0, material: "wood", gift: true, descFa: "جایی برای نفس تازه کردن", descEn: "A place to catch your breath" },
  { type: "statue", fa: "تندیس افتخار", en: "Pride Statue", cost: 0, material: "wood", gift: true, descFa: "یادبود پیوستگی شما", descEn: "A monument to your consistency" },
  { type: "arch", fa: "طاق رنگین‌کمان", en: "Rainbow Arch", cost: 0, material: "wood", gift: true, descFa: "دروازه‌ای شاد به جزیره", descEn: "A joyful gateway" },
];
export const WEEKLY_GOAL = 5;

export const ISLAND_LEVELS = [0, 3, 7, 12, 18, 25, 34, 45];

export function getBuildingSpec(type: BuildingType): BuildingSpec {
  return BUILDINGS.find((b) => b.type === type) || GIFTS.find((b) => b.type === type) || BUILDINGS[0];
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
export const ISLAND_UNLOCK_EVENT = "arshnaz-island-unlock";
export const ISLAND_CHEER_EVENT = "arshnaz-island-cheer";

export type DayPhase = "morning" | "day" | "sunset" | "night";
/** Real-time lighting phase for the island. */
export function getDayPhase(date = new Date()): DayPhase {
  const h = date.getHours();
  if (h >= 5 && h < 11) return "morning";
  if (h >= 11 && h < 17) return "day";
  if (h >= 17 && h < 20) return "sunset";
  return "night";
}

/** Materials newly unlocked when lifetime points go from `before` to `after`. */
export function getNewlyUnlocked(before: number, after: number): Material[] {
  return MATERIALS.filter((m) => m.unlockAt > before && m.unlockAt <= after);
}

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
  const unlocked = getNewlyUnlocked(current.lifetime, next.lifetime);
  if (unlocked.length) {
    try { window.dispatchEvent(new CustomEvent(ISLAND_UNLOCK_EVENT, { detail: unlocked })); } catch { /* non-browser */ }
  }
  return next;
}

export type BuildResult = { ok: true; state: IslandState } | { ok: false; reason: "locked" | "points" | "occupied" | "bounds" };

export function canBuild(state: IslandState, type: BuildingType): "ok" | "locked" | "points" {
  const spec = getBuildingSpec(type);
  if (spec.gift) return (state.gifts?.[type as GiftType] || 0) > 0 ? "ok" : "locked";
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
  const gifts = { ...(state.gifts || {}) };
  if (spec.gift) gifts[type as GiftType] = Math.max(0, (gifts[type as GiftType] || 0) - 1);
  const next: IslandState = {
    ...state,
    gifts,
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
  const spec = getBuildingSpec(target.type);
  const gifts = { ...(state.gifts || {}) };
  if (spec.gift) gifts[target.type as GiftType] = (gifts[target.type as GiftType] || 0) + 1;
  const next = {
    ...state,
    gifts,
    points: state.points + spec.cost,
    buildings: state.buildings.filter((b) => b.id !== id),
  };
  saveIslandState(next);
  return next;
}

// ---------- Weekly gift & resident cheers ----------

/** Week key (local date of the week's Saturday, Iranian week start). */
export function getWeekKey(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() - ((d.getDay() + 1) % 7));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function grantGift(state: IslandState): { state: IslandState; gift: GiftType } {
  const gift = GIFTS[(state.giftsEarned || 0) % GIFTS.length].type as GiftType;
  const gifts = { ...(state.gifts || {}) };
  gifts[gift] = (gifts[gift] || 0) + 1;
  return { state: { ...state, gifts, giftsEarned: (state.giftsEarned || 0) + 1 }, gift };
}

/** Rolls the week over. A reached-but-unclaimed gift from last week is granted automatically (nothing is lost). */
function rollWeek(state: IslandState, now = new Date()): { state: IslandState; autoGift: GiftType | null; changed: boolean } {
  const key = getWeekKey(now);
  if (state.week?.key === key) return { state, autoGift: null, changed: false };
  let next = state;
  let autoGift: GiftType | null = null;
  if (state.week && state.week.tasks >= WEEKLY_GOAL && !state.week.claimed) {
    const r = grantGift(state);
    next = r.state;
    autoGift = r.gift;
  }
  return { state: { ...next, week: { key, tasks: 0, claimed: false } }, autoGift, changed: true };
}

export function refreshIslandWeek(now = new Date()): { state: IslandState; autoGift: GiftType | null } {
  const r = rollWeek(getIslandState(), now);
  if (r.changed) saveIslandState(r.state);
  return { state: r.state, autoGift: r.autoGift };
}

export function getWeekProgress(state: IslandState, now = new Date()) {
  const current = state.week?.key === getWeekKey(now) ? state.week : { key: getWeekKey(now), tasks: 0, claimed: false };
  return { tasks: Math.min(current.tasks, WEEKLY_GOAL), goal: WEEKLY_GOAL, ready: current.tasks >= WEEKLY_GOAL && !current.claimed, claimed: current.claimed };
}

/** Called when a task (or subtask) is completed anywhere in the app. */
export function recordIslandTask(isSubtask = false, now = new Date()): IslandState {
  const { state } = rollWeek(getIslandState(), now);
  const week = state.week!;
  const next: IslandState = {
    ...state,
    pendingCheers: (state.pendingCheers || 0) + 1,
    week: isSubtask ? week : { ...week, tasks: week.tasks + 1 },
  };
  saveIslandState(next);
  try { window.dispatchEvent(new CustomEvent(ISLAND_CHEER_EVENT, { detail: next.pendingCheers })); } catch { /* non-browser */ }
  return next;
}

export function claimWeeklyGift(now = new Date()): GiftType | null {
  const { state } = rollWeek(getIslandState(), now);
  if (!state.week || state.week.tasks < WEEKLY_GOAL || state.week.claimed) return null;
  const r = grantGift(state);
  saveIslandState({ ...r.state, week: { ...state.week, claimed: true } });
  return r.gift;
}

/** Returns how many finished activities the residents should celebrate, then resets the counter. */
export function consumeCheers(): number {
  const state = getIslandState();
  const n = state.pendingCheers || 0;
  if (n) saveIslandState({ ...state, pendingCheers: 0 });
  return n;
}

// ---------- Residents: names & friendly lines ----------

export const MAX_RESIDENTS = 6;
const RESIDENT_HOMES: BuildingType[] = ["hut", "house", "market", "tower", "palace", "windmill", "lighthouse"];
const DEFAULT_NAMES = { fa: ["نیلو", "آرش", "مهتاب", "بردیا", "سارا", "کیان"], en: ["Nilo", "Arash", "Mahtab", "Bardia", "Sara", "Kian"] };

export function getResidentCount(buildings: PlacedBuilding[]): number {
  return Math.min(MAX_RESIDENTS, 1 + buildings.filter((b) => RESIDENT_HOMES.includes(b.type)).length);
}

export function getResidentName(state: IslandState, index: number, isEn: boolean): string {
  const custom = state.residentNames?.[index]?.trim();
  return custom || (isEn ? DEFAULT_NAMES.en : DEFAULT_NAMES.fa)[index % MAX_RESIDENTS];
}

export function setResidentName(index: number, name: string): IslandState {
  const state = getIslandState();
  const names = [...(state.residentNames || [])];
  while (names.length <= index) names.push("");
  names[index] = name.trim().slice(0, 20);
  const next = { ...state, residentNames: names };
  saveIslandState(next);
  return next;
}

export function setShowIslandOnToday(show: boolean): IslandState {
  const next = { ...getIslandState(), showOnToday: show };
  saveIslandState(next);
  return next;
}

/** A context-aware friendly line for a resident. `seed` rotates between lines. */
export function getResidentLine(state: IslandState, index: number, isEn: boolean, seed = 0, now = new Date()): string {
  const phase = getDayPhase(now);
  const week = getWeekProgress(state, now);
  const left = week.goal - week.tasks;
  const num = (n: number) => (isEn ? String(n) : String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]));
  const fa: string[] = [
    phase === "night" ? "شب بخیر! فردا با هم ادامه می‌دهیم." : phase === "morning" ? "صبح بخیر! امروز روز خوبی برای ساختن است." : phase === "sunset" ? "غروب جزیره چقدر قشنگ است، نه؟" : "روز آفتابی‌ای است، یک کار کوچک انجام بدهیم؟",
    week.claimed ? "هدیهٔ این هفته را گرفتی، به تو افتخار می‌کنیم!" : week.ready ? "هدیهٔ هفته آماده است، زودتر بازش کن!" : `فقط ${num(left)} تسک دیگر تا هدیهٔ هفته مانده.`,
    `جزیره ${num(state.buildings.length)} سازه دارد؛ هر قدم کوچک حسابش جداست.`,
    "یادت باشد: اینجا هیچ امتیازی از دست نمی‌رود.",
    "امروز یک کار کوچک هم کافی است. آرام و پیوسته!",
  ];
  const en: string[] = [
    phase === "night" ? "Good night! We'll keep going tomorrow." : phase === "morning" ? "Good morning! A great day to build." : phase === "sunset" ? "Isn't the island sunset lovely?" : "Sunny day! Shall we finish one small thing?",
    week.claimed ? "You got this week's gift — we're proud of you!" : week.ready ? "This week's gift is ready, go open it!" : `Only ${left} more ${left === 1 ? "task" : "tasks"} until the weekly gift.`,
    `The island has ${state.buildings.length} buildings — every small step counts.`,
    "Remember: no points are ever lost here.",
    "One small task today is enough. Slow and steady!",
  ];
  const lines = isEn ? en : fa;
  return lines[(index + seed) % lines.length];
}
