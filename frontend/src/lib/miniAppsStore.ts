import type { CloudSnapshot } from "@/lib/cloudStateSync";

export interface MiniApp {
  id: string;
  name: string;
  emoji: string;
  description: string;
  aiRequest: string;
  html: string;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_PREFIX = "arshnaz_mini_apps_v1_";
export const MINI_APPS_UPDATED_EVENT = "arshnaz:mini-apps-updated";
export const MAX_MINI_APPS = 40;
export const MAX_MINI_APP_HTML_BYTES = 120_000;
export const MAX_MINI_APPS_STATE_BYTES = 600_000;

const storageKey = (userId: string) => `${STORAGE_PREFIX}${userId}`;

function byteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}

function shortText(value: unknown, maxLength: number): string {
  return typeof value === "string" ? value.slice(0, maxLength) : "";
}

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return `mini-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
  }
}

/** Accept only bounded, plain data from local storage or the cloud snapshot. */
export function sanitizeMiniApps(value: unknown): MiniApp[] {
  if (!Array.isArray(value)) return [];
  const clean: MiniApp[] = [];
  const ids = new Set<string>();

  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const id = shortText(row.id, 100).trim();
    const name = shortText(row.name, 80).trim();
    const html = row.html;
    if (
      !id || !name || ids.has(id) || typeof html !== "string" ||
      byteLength(html) > MAX_MINI_APP_HTML_BYTES
    ) continue;

    const app: MiniApp = {
      id,
      name,
      emoji: shortText(row.emoji, 16) || "🧩",
      description: shortText(row.description, 2_000),
      aiRequest: shortText(row.aiRequest, 4_000),
      html,
      createdAt: shortText(row.createdAt, 40) || new Date(0).toISOString(),
      updatedAt: shortText(row.updatedAt, 40) || new Date(0).toISOString(),
    };
    const candidate = [...clean, app];
    if (clean.length >= MAX_MINI_APPS) break;
    if (byteLength(JSON.stringify(candidate)) > MAX_MINI_APPS_STATE_BYTES) continue;
    clean.push(app);
    ids.add(id);
  }

  return clean;
}

export function readMiniAppsSnapshot(userId: string): CloudSnapshot | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { updatedAt?: unknown; data?: unknown };
    const updatedAt = Number(parsed?.updatedAt);
    if (!Number.isFinite(updatedAt) || !Array.isArray(parsed?.data)) return null;
    const data = sanitizeMiniApps(parsed.data);
    return { updatedAt, data };
  } catch {
    return null;
  }
}

export function loadMiniApps(userId: string): MiniApp[] {
  return readMiniAppsSnapshot(userId)?.data as MiniApp[] || [];
}

export function saveMiniAppsLocal(userId: string, items: MiniApp[]): CloudSnapshot {
  const data = sanitizeMiniApps(items);
  if (items.length > MAX_MINI_APPS) throw new Error(`حداکثر ${MAX_MINI_APPS} ابزارک می‌توانی ذخیره کنی.`);
  if (data.length !== items.length) throw new Error("اطلاعات یکی از ابزارک‌ها معتبر نیست یا از اندازهٔ مجاز بیشتر است.");

  const updatedAt = Date.now();
  const snapshot: CloudSnapshot = { updatedAt, data };
  const serialized = JSON.stringify(snapshot);
  if (byteLength(serialized) > MAX_MINI_APPS_STATE_BYTES) {
    throw new Error("حجم کل مخزن زیاد شده است. کد چند ابزارک را کوتاه یا بخشی را حذف کن.");
  }

  localStorage.setItem(storageKey(userId), serialized);
  window.dispatchEvent(new CustomEvent(MINI_APPS_UPDATED_EVENT, { detail: { userId } }));
  return snapshot;
}

export function applyMiniAppsCloud(userId: string, value: unknown, updatedAt: number): MiniApp[] {
  const data = sanitizeMiniApps(value);
  const snapshot: CloudSnapshot = { updatedAt, data };
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
  } catch (error) {
    console.warn("Could not save the mini-app cloud copy locally", error);
  }
  window.dispatchEvent(new CustomEvent(MINI_APPS_UPDATED_EVENT, { detail: { userId } }));
  return data;
}

export function createMiniAppId(): string {
  return makeId();
}

export function measureHtmlBytes(html: string): number {
  return byteLength(html);
}
