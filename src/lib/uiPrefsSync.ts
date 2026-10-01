import type { CloudBinding } from "./cloudStateSync";

const PAGE_BG_PREFIX = "arshnaz_page_bg_v1_";
const FOLDER_PREFIX = "arshnaz_folder_prefs_v1_";
const stampKey = (userId: string) => `arshnaz_ui_prefs_sync_${userId}`;

let binding: CloudBinding | null = null;
let boundUser: string | null = null;

/** Call after any local change to page colors or folder prefs so other devices pick it up. */
export function markUiPrefsChanged(userId: string | null | undefined) {
  if (!userId || typeof localStorage === "undefined") return;
  try { localStorage.setItem(stampKey(userId), String(Date.now())); } catch {}
  if (boundUser === userId) binding?.push();
}

function folderKeys(userId: string): string[] {
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(FOLDER_PREFIX) && k.endsWith(`_${userId}`)) keys.push(k);
  }
  return keys;
}

export function startUiPrefsCloudSync(userId: string | null) {
  if (boundUser === userId) return;
  binding?.stop();
  binding = null;
  boundUser = userId;
  if (!userId || typeof window === "undefined" || import.meta.env.MODE === "test") return;
  void import("./cloudStateSync").then(({ bindCloudState }) => {
    if (boundUser !== userId) return;
    binding = bindCloudState(userId, "ui_prefs", {
      read: () => {
        const pageBg = localStorage.getItem(`${PAGE_BG_PREFIX}${userId}`);
        const folders: Record<string, unknown> = {};
        folderKeys(userId).forEach((k) => { try { folders[k] = JSON.parse(localStorage.getItem(k) || "{}"); } catch {} });
        if (!pageBg && !Object.keys(folders).length) return null;
        return {
          updatedAt: Number(localStorage.getItem(stampKey(userId)) || 0),
          data: { pageBg: pageBg ? JSON.parse(pageBg) : {}, folders },
        };
      },
      apply: (data, updatedAt) => {
        const d = (data || {}) as { pageBg?: Record<string, string>; folders?: Record<string, unknown> };
        localStorage.setItem(`${PAGE_BG_PREFIX}${userId}`, JSON.stringify(d.pageBg || {}));
        Object.entries(d.folders || {}).forEach(([k, v]) => {
          if (!k.startsWith(FOLDER_PREFIX) || !k.endsWith(`_${userId}`)) return;
          localStorage.setItem(k, JSON.stringify(v));
          const folderId = k.slice(FOLDER_PREFIX.length, k.length - userId.length - 1);
          window.dispatchEvent(new CustomEvent("arshnaz-folder-prefs-updated", { detail: { folderId, userId, prefs: v } }));
        });
        localStorage.setItem(stampKey(userId), String(updatedAt));
        window.dispatchEvent(new CustomEvent("arshnaz:page-bg-updated"));
      },
    });
  });
}
