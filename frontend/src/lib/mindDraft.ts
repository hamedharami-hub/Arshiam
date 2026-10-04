import { useCallback, useEffect, useState } from "react";

export type MindDraftPath = "think" | "worry";
export interface MindDraft { text: string; path: MindDraftPath | null; updatedAt: number }

const EVENT = "arshnaz:mind-draft";
const key = (userId?: string | null) => `mind_draft_v1_${userId || "guest"}`;

export function getMindDraft(userId?: string | null): MindDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(key(userId)) || "null");
    if (!parsed || typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    return { text: parsed.text, path: parsed.path === "think" || parsed.path === "worry" ? parsed.path : null, updatedAt: Number(parsed.updatedAt) || 0 };
  } catch {
    return null;
  }
}

export function setMindDraft(userId: string | null | undefined, patch: Partial<Pick<MindDraft, "text" | "path">>) {
  const current = (() => { try { return JSON.parse(localStorage.getItem(key(userId)) || "null") || {}; } catch { return {}; } })();
  const next = { text: current.text || "", path: current.path ?? null, ...patch, updatedAt: Date.now() };
  try {
    if (!String(next.text).trim() && !next.path) localStorage.removeItem(key(userId));
    else localStorage.setItem(key(userId), JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {}
}

export function clearMindDraft(userId?: string | null) {
  try { localStorage.removeItem(key(userId)); window.dispatchEvent(new CustomEvent(EVENT)); } catch {}
}

export function useMindDraft(userId?: string | null) {
  const [draft, setDraft] = useState<MindDraft | null>(() => getMindDraft(userId));
  useEffect(() => {
    const sync = () => setDraft(getMindDraft(userId));
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => { window.removeEventListener(EVENT, sync); window.removeEventListener("storage", sync); };
  }, [userId]);
  const save = useCallback((patch: Partial<Pick<MindDraft, "text" | "path">>) => setMindDraft(userId, patch), [userId]);
  const clear = useCallback(() => clearMindDraft(userId), [userId]);
  return { draft, save, clear };
}
