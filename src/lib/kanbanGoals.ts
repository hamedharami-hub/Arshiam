export type TimeHorizon = "yearly" | "quarterly" | "monthly" | "weekly" | "none";
export type GoalPriority = "urgent" | "high" | "medium" | "low" | "none";

export interface GoalKanban {
  id: string;
  title: string;
  description?: string;
  parentId: string | null;
  timeHorizon: TimeHorizon;
  priority: GoalPriority;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export function generateUUID(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isValidUUID(str?: string | null): boolean {
  if (!str) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

export const TIME_HORIZONS: { id: TimeHorizon; labelFa: string; labelEn: string; icon: string; days: number }[] = [
  { id: "yearly", labelFa: "سالانه", labelEn: "Yearly", icon: "🗓️", days: 365 },
  { id: "quarterly", labelFa: "فصلی", labelEn: "Quarterly", icon: "🍂", days: 90 },
  { id: "monthly", labelFa: "ماهانه", labelEn: "Monthly", icon: "🌙", days: 30 },
  { id: "weekly", labelFa: "هفتگی", labelEn: "Weekly", icon: "⚡", days: 7 },
  { id: "none", labelFa: "بدون بازه", labelEn: "No Horizon", icon: "♾️", days: 0 },
];

export const GOAL_PRIORITIES: { id: GoalPriority; labelFa: string; labelEn: string; color: string; badge: string }[] = [
  { id: "urgent", labelFa: "فوری", labelEn: "Urgent", color: "#ef4444", badge: "🔴" },
  { id: "high", labelFa: "زیاد", labelEn: "High", color: "#f97316", badge: "🟠" },
  { id: "medium", labelFa: "متوسط", labelEn: "Medium", color: "#eab308", badge: "🟡" },
  { id: "low", labelFa: "کم", labelEn: "Low", color: "#3b82f6", badge: "🔵" },
  { id: "none", labelFa: "بدون اولویت", labelEn: "No priority", color: "#64748b", badge: "⚪" },
];

const GOALS_STORAGE_KEY = "arshnaz_kanban_goals_v3";

// Legacy sample goals; kept only so they can be recognised and hidden.
const INITIAL_GOALS: GoalKanban[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    title: "هدف اصلی کانبان",
    description: "توسعه فردی، یادگیری مهارت‌های جدید و رشد ذهن",
    parentId: null,
    timeHorizon: "yearly",
    priority: "high",
    color: "#3b82f6",
    icon: "🎯",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    title: "زبان و مکالمه",
    description: "تمرین روزمره زبان، تقویت اسپیکینگ و دایره واژگان",
    parentId: null,
    timeHorizon: "monthly",
    priority: "urgent",
    color: "#06b6d4",
    icon: "🗣️",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    title: "خواندن و آموزش با هوش مصنوعی",
    description: "مطالعه کتاب‌های تخصصی و تمرین مکالمه هوش مصنوعی",
    parentId: null,
    timeHorizon: "weekly",
    priority: "medium",
    color: "#8b5cf6",
    icon: "🤖",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    title: "کسب‌وکار و پروژه‌ها",
    description: "توسعه محصول، ارتقای اپلیکیشن و اهداف مالی",
    parentId: null,
    timeHorizon: "yearly",
    priority: "urgent",
    color: "#10b981",
    icon: "💼",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "a0000000-0000-4000-8000-000000000005",
    title: "سلامت و آرامش ذهن",
    description: "ورزش، تمرین تنفس، خواب منظم و چک‌این روزانه",
    parentId: null,
    timeHorizon: "quarterly",
    priority: "high",
    color: "#ec4899",
    icon: "🫀",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

export function flattenGoals(goals: GoalKanban[]): GoalKanban[] {
  return goals.map((g) => ({ ...g, parentId: null }));
}

export function enforceSingleRoot(goals: GoalKanban[]): GoalKanban[] {
  return flattenGoals(goals);
}

function sanitizeGoalsUUIDs(goals: GoalKanban[]): GoalKanban[] {
  const idMap = new Map<string, string>();

  // Map invalid UUIDs to valid UUIDs
  goals.forEach((g) => {
    if (!isValidUUID(g.id)) {
      idMap.set(g.id, generateUUID());
    }
  });

  return goals.map((g) => ({
    ...g,
    id: idMap.get(g.id) || g.id,
    parentId: null,
  }));
}

export const DEFAULT_FOLDER_GOAL_TITLE = "هدف اصلی این بخش";
const DEFAULT_FOLDER_GOAL_DESC = "هدف کلی و مسیر پیشرفت این بخش";
const LEGACY_DEFAULT_IDS = new Set(INITIAL_GOALS.map((g) => g.id));

// Built-in sample goals or the untouched auto-created folder goal.
export function isAutoDefaultGoal(g: GoalKanban): boolean {
  if (LEGACY_DEFAULT_IDS.has(g.id)) return true;
  return g.title === DEFAULT_FOLDER_GOAL_TITLE && (g.description || "") === DEFAULT_FOLDER_GOAL_DESC;
}

function goalsKey(folderId?: string | null, userId?: string) {
  const baseKey = folderId ? `${GOALS_STORAGE_KEY}_folder_${folderId}` : GOALS_STORAGE_KEY;
  return { baseKey, key: userId ? `${baseKey}_${userId}` : baseKey };
}

// Read stored goals without creating defaults (global list never contains the sample goals).
export function readStoredGoals(folderId?: string | null, userId?: string): GoalKanban[] {
  const { baseKey, key } = goalsKey(folderId, userId);
  try {
    let raw = localStorage.getItem(key);
    if (!raw && !folderId && userId) raw = localStorage.getItem(`${GOALS_STORAGE_KEY}_folder_${userId}`);
    if (!raw && userId) raw = localStorage.getItem(baseKey);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    const list = sanitizeGoalsUUIDs(parsed);
    return folderId ? list : list.filter((g) => !LEGACY_DEFAULT_IDS.has(g.id));
  } catch {
    return [];
  }
}

export function getKanbanGoals(folderId?: string | null, userId?: string): GoalKanban[] {
  const { key } = goalsKey(folderId, userId);
  const stored = readStoredGoals(folderId, userId);
  if (stored.length > 0 || !folderId) return stored;
  const now = new Date().toISOString();
  const defaults: GoalKanban[] = [
    {
      id: generateUUID(),
      title: DEFAULT_FOLDER_GOAL_TITLE,
      description: DEFAULT_FOLDER_GOAL_DESC,
      parentId: null,
      timeHorizon: "monthly",
      priority: "high",
      color: "#3b82f6",
      icon: "🎯",
      createdAt: now,
      updatedAt: now,
    },
  ];
  try { localStorage.setItem(key, JSON.stringify(defaults)); } catch { void 0; }
  return defaults;
}

export type OwnedGoal = GoalKanban & { folderId: string | null; folderName?: string };

// All goals the user keeps: their own global goals + every folder's goals.
export function getUserOwnGoals(folders: Array<{ id: string; name?: string }>, userId?: string): OwnedGoal[] {
  const out: OwnedGoal[] = [];
  const seen = new Set<string>();
  const push = (list: GoalKanban[], folderId: string | null, folderName?: string) => {
    list.forEach((g) => {
      if (seen.has(g.id)) return;
      seen.add(g.id);
      out.push({ ...g, folderId, folderName });
    });
  };
  folders.forEach((f) => f?.id && push(readStoredGoals(f.id, userId), f.id, f.name));
  push(readStoredGoals(null, userId), null);
  return out;
}

export function saveKanbanGoals(goals: GoalKanban[], folderId?: string | null, userId?: string) {
  const sanitized = sanitizeGoalsUUIDs(goals);
  const { key } = goalsKey(folderId, userId);
  try {
    localStorage.setItem(key, JSON.stringify(sanitized));
    window.dispatchEvent(new CustomEvent("arshnaz-goals-updated", { detail: { folderId, goals: sanitized } }));
  } catch (e) {
    console.error("Failed to save kanban goals:", e);
  }
}

export function getChildGoals(goals: GoalKanban[], parentId: string | null): GoalKanban[] {
  return goals.filter((g) => g.parentId === parentId);
}

export function getGoalById(goals: GoalKanban[], id: string): GoalKanban | undefined {
  return goals.find((g) => g.id === id);
}

export function getGoalPath(goals: GoalKanban[], goalId: string): GoalKanban[] {
  const path: GoalKanban[] = [];
  let current = getGoalById(goals, goalId);
  while (current) {
    path.unshift(current);
    current = current.parentId ? getGoalById(goals, current.parentId) : undefined;
  }
  return path;
}

export function getAllKanbanGoals(folders?: Array<{ id: string; name?: string }>, userId?: string): GoalKanban[] {
  return getUserOwnGoals(folders || [], userId).filter((g) => !isAutoDefaultGoal(g));
}
