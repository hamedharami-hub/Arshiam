/**
 * Period reviews live in the user's account: users/{uid}/plan_reviews/{horizon}_{start}_{end}.
 * Firestore's persistent cache keeps offline writes and syncs them later; a local mirror gives instant reads.
 * Older device-only notes (localStorage `arsh_plan_review_v1:*`) are copied into the account once, never deleted.
 */
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import type { Horizon, Period } from "@/lib/timeHorizon";

export type PlanReviewItem = { id: string; title: string; status: "done" | "open" | "set_aside" };
export type PlanReview = {
  id: string; horizon: Horizon; start: string; end: string;
  note: string;
  /** Set when the user pressed "Finish review". */
  reviewed_at?: string | null;
  /** Frozen record of the period at the moment the review was finished (later moves never rewrite it). */
  snapshot?: { done: PlanReviewItem[]; open: PlanReviewItem[]; set_aside: PlanReviewItem[] } | null;
  /** Increases each time a finished review is edited again, so corrections are visible. */
  revision?: number;
  updated_at?: string;
};

export const reviewId = (p: Pick<Period, "horizon" | "start" | "end">) => `${p.horizon}_${p.start}_${p.end}`;
const LEGACY_PREFIX = "arsh_plan_review_v1:";
const mirrorKey = (uid: string) => `arsh_plan_reviews_v2:${uid}`;
const migratedKey = (uid: string) => `arsh_plan_review_v1_migrated:${uid}`;

function readMirror(uid: string): Record<string, PlanReview> {
  try { return JSON.parse(localStorage.getItem(mirrorKey(uid)) || "{}") || {}; } catch { return {}; }
}
function writeMirror(uid: string, all: Record<string, PlanReview>) {
  try { localStorage.setItem(mirrorKey(uid), JSON.stringify(all)); } catch { /* storage full */ }
}

/** Device-only reviews written by the previous version, for this user only. */
export function legacyLocalReviews(uid: string, storage: Storage = localStorage): PlanReview[] {
  const out: PlanReview[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(`${LEGACY_PREFIX}${uid}:`)) continue;
    const [, , horizon, start] = key.split(":");
    try {
      const v = JSON.parse(storage.getItem(key) || "null") as { at?: string; note?: string } | null;
      if (!v || !horizon || !start) continue;
      out.push({ id: `${horizon}_${start}_legacy`, horizon: horizon as Horizon, start, end: start, note: v.note || "", reviewed_at: v.at || null });
    } catch { /* ignore corrupt entry */ }
  }
  return out;
}

async function writeReview(uid: string, review: PlanReview): Promise<TaskPersistenceStatus> {
  const all = readMirror(uid);
  all[review.id] = review;
  writeMirror(uid, all);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("arsh:plan-reviews-local", { detail: uid }));
  try {
    const write = setDoc(doc(db, "users", uid, "plan_reviews", review.id), { ...review, user_id: uid }, { merge: true });
    if (typeof navigator !== "undefined" && !navigator.onLine) { write.catch(() => {}); return "queued"; }
    const result = await Promise.race([write.then(() => "saved" as const), new Promise<"queued">((r) => setTimeout(() => r("queued"), 6000))]);
    return result;
  } catch (err) {
    console.warn("[PlanReview] save failed:", err);
    return "failed";
  }
}

export function savePlanReview(uid: string, period: Period, patch: Partial<PlanReview>, previous?: PlanReview | null): Promise<TaskPersistenceStatus> {
  const id = reviewId(period);
  const now = new Date().toISOString();
  const base: PlanReview = previous || { id, horizon: period.horizon, start: period.start, end: period.end, note: "" };
  const revision = previous?.reviewed_at && patch.reviewed_at ? (previous.revision || 0) + 1 : previous?.revision || 0;
  return writeReview(uid, { ...base, ...patch, id, horizon: period.horizon, start: period.start, end: period.end, revision, updated_at: now });
}

/** Reviews of the signed-in user (cloud + local mirror). Resets on account switch. */
export function usePlanReviews(uid: string | undefined) {
  const [reviews, setReviews] = useState<Record<string, PlanReview>>({});
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    setReviews({}); setLoaded(false);
    if (!uid) return;
    setReviews(readMirror(uid));
    const onLocal = (e: Event) => { if ((e as CustomEvent).detail === uid) setReviews(readMirror(uid)); };
    window.addEventListener("arsh:plan-reviews-local", onLocal);
    let migrated = false;
    const unsub = onSnapshot(collection(db, "users", uid, "plan_reviews"), (snap) => {
      const cloud: Record<string, PlanReview> = {};
      snap.forEach((d) => { cloud[d.id] = { ...(d.data() as PlanReview), id: d.id }; });
      const merged = { ...readMirror(uid) };
      for (const [id, r] of Object.entries(cloud)) {
        const local = merged[id];
        if (!local || String(r.updated_at || "") >= String(local.updated_at || "")) merged[id] = r;
      }
      writeMirror(uid, merged);
      setReviews(merged);
      setLoaded(true);
      if (!migrated && !snap.metadata.fromCache) { migrated = true; void migrateLegacyReviews(uid, merged); }
    }, (err) => { console.warn("[PlanReview] subscribe failed:", err); setLoaded(true); });
    return () => { unsub(); window.removeEventListener("arsh:plan-reviews-local", onLocal); };
  }, [uid]);
  return { reviews, loaded };
}

/** Copy device-only notes into the account once (the old local entries stay as they were). */
async function migrateLegacyReviews(uid: string, existing: Record<string, PlanReview>) {
  try { if (localStorage.getItem(migratedKey(uid))) return; } catch { return; }
  const legacy = legacyLocalReviews(uid);
  let ok = true;
  for (const r of legacy) {
    const match = Object.values(existing).find((e) => e.horizon === r.horizon && e.start === r.start);
    if (match && (match.note || !r.note)) continue;
    const id = match?.id || `${r.horizon}_${r.start}_${r.end}`;
    const status = await writeReview(uid, { ...(match || r), id, note: r.note, reviewed_at: match?.reviewed_at || r.reviewed_at, updated_at: new Date().toISOString() });
    if (status === "failed") ok = false;
  }
  if (ok) try { localStorage.setItem(migratedKey(uid), new Date().toISOString()); } catch { /* ignore */ }
}

/** The review for a period (legacy ids matched by level + start). */
export function reviewFor(reviews: Record<string, PlanReview>, p: Period): PlanReview | null {
  return reviews[reviewId(p)] || Object.values(reviews).find((r) => r.horizon === p.horizon && r.start === p.start) || null;
}
