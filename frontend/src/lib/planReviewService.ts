/**
 * Period reviews are uid-owned Firestore pointers with append-only revision documents.
 * A local mirror contains only confirmed server writes; editable/offline notes live in a
 * separate uid-scoped draft store and never count as a completed review.
 */
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";
import { getTimeSettings, type Horizon, type Period } from "@/lib/timeHorizon";
import type { CalendarSystem } from "@/lib/jalali";

export type PlanReviewItem = { id: string; title: string; status: "done" | "open" | "set_aside" };
export type ReviewSnapshot = { done: PlanReviewItem[]; open: PlanReviewItem[]; set_aside: PlanReviewItem[] };
export type PlanReview = {
  id: string; horizon: Horizon; start: string; end: string; calendar?: CalendarSystem | "legacy";
  note: string;
  /** Set only on a committed review, never on a local draft. */
  reviewed_at?: string | null;
  /** Frozen record of the period at the moment the review was finished. */
  snapshot?: ReviewSnapshot | null;
  revision?: number;
  latest_revision_id?: string;
  previous_revision_id?: string | null;
  updated_at?: string;
  /** Local-only status. This field is never written to the confirmed mirror/cloud pointer. */
  draft_status?: "editing" | "pending" | "error" | "conflict";
};

type ReviewDraft = {
  id: string; horizon: Horizon; start: string; end: string; calendar: CalendarSystem | "legacy";
  note: string; intent_id: string; base_revision: number; status: "editing" | "pending" | "error" | "conflict";
  reviewed_at?: string | null; snapshot?: ReviewSnapshot | null; updated_at: string;
};

export const reviewId = (p: Pick<Period, "horizon" | "start" | "end">, calendar: CalendarSystem | "legacy" = getTimeSettings().calendar) =>
  `${p.horizon}_${p.start}_${p.end}_${calendar}`;
const LEGACY_PREFIX = "arsh_plan_review_v1:";
const mirrorKey = (uid: string) => `arsh_plan_reviews_v3:${uid}`;
const draftKey = (uid: string) => `arsh_plan_review_drafts_v1:${uid}`;
const migratedKey = (uid: string) => `arsh_plan_review_v1_migrated:${uid}`;
const revisionOf = (review?: PlanReview | null) => review?.revision ?? (review?.reviewed_at || review?.note ? 1 : 0);
const pointerRef = (uid: string, id: string) => doc(db, "users", uid, "plan_reviews", id);
const revisionRef = (uid: string, id: string, revisionId: string) => doc(db, "users", uid, "plan_reviews", id, "revisions", revisionId);

const dispatchLocal = (uid: string) => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("arsh:plan-reviews-local", { detail: uid }));
};
function readObject<T>(key: string): T {
  try { return JSON.parse(localStorage.getItem(key) || "{}") as T || {} as T; } catch { return {} as T; }
}
function readMirror(uid: string): Record<string, PlanReview> { return readObject<Record<string, PlanReview>>(mirrorKey(uid)); }
function writeMirror(uid: string, all: Record<string, PlanReview>) {
  try { localStorage.setItem(mirrorKey(uid), JSON.stringify(all)); } catch { /* storage full */ }
}
function readDrafts(uid: string): Record<string, ReviewDraft> { return readObject<Record<string, ReviewDraft>>(draftKey(uid)); }
function writeDrafts(uid: string, all: Record<string, ReviewDraft>) {
  try { localStorage.setItem(draftKey(uid), JSON.stringify(all)); } catch { /* storage full */ }
  dispatchLocal(uid);
}
function clone<T>(value: T): T { return value == null ? value : JSON.parse(JSON.stringify(value)) as T; }
function newIntent() {
  try { return crypto.randomUUID(); } catch { return `review_${Date.now()}_${Math.random().toString(36).slice(2)}`; }
}
function hashText(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(36);
}

/** Device-only notes written by the previous version, for this user only. */
export function legacyLocalReviews(uid: string, storage: Storage = localStorage): PlanReview[] {
  const out: PlanReview[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key || !key.startsWith(`${LEGACY_PREFIX}${uid}:`)) continue;
    const [, , horizon, start] = key.split(":");
    try {
      const v = JSON.parse(storage.getItem(key) || "null") as { at?: string; note?: string } | null;
      if (!v || !horizon || !start) continue;
      // Old keys did not carry period end/calendar. Preserve them as detached legacy records.
      const period = { horizon: horizon as Horizon, start, end: start };
      out.push({ id: reviewId(period, "legacy"), ...period, calendar: "legacy", note: v.note || "", reviewed_at: v.at || null, snapshot: null });
    } catch { /* ignore corrupt entry */ }
  }
  return out;
}

function mergeDrafts(uid: string, committed: Record<string, PlanReview>): Record<string, PlanReview> {
  const merged = { ...committed };
  for (const [id, draft] of Object.entries(readDrafts(uid))) {
    const saved = merged[id];
    const status = saved && revisionOf(saved) !== draft.base_revision ? "conflict" : draft.status;
    merged[id] = {
      ...(saved || { id, horizon: draft.horizon, start: draft.start, end: draft.end, calendar: draft.calendar, note: "" }),
      note: draft.note,
      draft_status: status,
    };
  }
  return merged;
}

function setDraft(uid: string, id: string, draft: ReviewDraft) {
  const drafts = readDrafts(uid);
  drafts[id] = draft;
  writeDrafts(uid, drafts);
}

/** Persist text as a uid/period-scoped draft immediately; cloud snapshots cannot replace it. */
export function savePlanReviewDraft(
  uid: string,
  period: Period,
  note: string,
  previous?: PlanReview | null,
  calendar: CalendarSystem = getTimeSettings().calendar,
) {
  if (!uid) return;
  const id = reviewId(period, calendar);
  const drafts = readDrafts(uid);
  const old = drafts[id];
  if (old?.note === note) return;
  setDraft(uid, id, {
    id, horizon: period.horizon, start: period.start, end: period.end, calendar,
    note, intent_id: newIntent(), base_revision: revisionOf(previous),
    status: "editing", updated_at: new Date().toISOString(),
  });
}

function statusDraft(uid: string, draft: ReviewDraft, status: ReviewDraft["status"]) {
  setDraft(uid, draft.id, { ...draft, status, updated_at: new Date().toISOString() });
}

function isTransientNetworkError(err: unknown) {
  const code = String((err as { code?: unknown })?.code || "");
  return /unavailable|deadline-exceeded|network-request-failed|cancelled/i.test(code);
}

async function commitReview(uid: string, review: PlanReview, baseRevision: number, intentId: string): Promise<"saved" | "conflict"> {
  const id = review.id;
  const pRef = pointerRef(uid, id);
  const rRef = revisionRef(uid, id, intentId);
  return runTransaction(db, async (tx) => {
    const pSnap = await tx.get(pRef);
    const sameIntent = await tx.get(rRef);
    const current = pSnap.exists() ? pSnap.data() as PlanReview : null;
    if (sameIntent.exists() && current?.latest_revision_id === intentId) {
      const committed = sameIntent.data() as PlanReview;
      return committed.note === review.note
        && committed.reviewed_at === review.reviewed_at
        && JSON.stringify(committed.snapshot || null) === JSON.stringify(review.snapshot || null)
        ? "saved"
        : "conflict";
    }
    const currentRevision = revisionOf(current);
    if (currentRevision !== baseRevision) return "conflict";

    const previousId = current?.latest_revision_id || (currentRevision ? `legacy_${currentRevision}` : null);
    let legacyRef: ReturnType<typeof revisionRef> | null = null;
    let legacyExists = false;
    if (current && currentRevision > 0 && !current.latest_revision_id) {
      legacyRef = revisionRef(uid, id, previousId!);
      legacyExists = (await tx.get(legacyRef)).exists();
    }
    const revision = {
      ...clone(review), id, user_id: uid, intent_id: intentId,
      revision: currentRevision + 1, base_revision: currentRevision,
      previous_revision_id: previousId, updated_at: new Date().toISOString(),
    };
    if (legacyRef && !legacyExists && current) {
      tx.set(legacyRef, { ...clone(current), id, user_id: uid, intent_id: previousId, revision: currentRevision, base_revision: Math.max(0, currentRevision - 1), previous_revision_id: null, snapshot: current.snapshot || null, legacy_import: true });
    }
    tx.set(rRef, revision);
    tx.set(pRef, { ...revision, latest_revision_id: intentId });
    return "saved";
  });
}

/** Save a finished review. The same intent can be retried safely after an uncertain response. */
export async function savePlanReview(
  uid: string,
  period: Period,
  patch: Partial<PlanReview>,
  previous?: PlanReview | null,
  calendar: CalendarSystem | "legacy" = getTimeSettings().calendar,
  suppliedIntentId?: string,
): Promise<TaskPersistenceStatus> {
  if (!uid) return "failed";
  const id = reviewId(period, calendar);
  const existingDraft = readDrafts(uid)[id];
  const intentId = suppliedIntentId || (existingDraft?.note === patch.note && patch.note !== undefined ? existingDraft.intent_id : newIntent());
  const baseRevision = existingDraft?.intent_id === intentId ? existingDraft.base_revision : revisionOf(previous);
  const draft: ReviewDraft = {
    id, horizon: period.horizon, start: period.start, end: period.end, calendar,
    note: patch.note ?? existingDraft?.note ?? previous?.note ?? "", intent_id: intentId, base_revision: baseRevision,
    status: "pending", reviewed_at: patch.reviewed_at !== undefined ? patch.reviewed_at : new Date().toISOString(),
    snapshot: clone(patch.snapshot || null), updated_at: new Date().toISOString(),
  };
  setDraft(uid, id, draft);
  const review: PlanReview = {
    id, horizon: period.horizon, start: period.start, end: period.end, calendar,
    note: draft.note, reviewed_at: draft.reviewed_at, snapshot: draft.snapshot,
  };

  if (typeof navigator !== "undefined" && !navigator.onLine) return "queued";
  try {
    const committed = await commitReview(uid, review, baseRevision, intentId);
    if (committed === "conflict") {
      statusDraft(uid, draft, "conflict");
      return "failed";
    }
    const all = readMirror(uid);
    all[id] = { ...review, revision: baseRevision + 1, latest_revision_id: intentId, previous_revision_id: baseRevision ? previous?.latest_revision_id || `legacy_${baseRevision}` : null, updated_at: new Date().toISOString() };
    writeMirror(uid, all);
    const drafts = readDrafts(uid);
    if (drafts[id]?.intent_id === intentId) delete drafts[id];
    writeDrafts(uid, drafts);
    return "saved";
  } catch (err) {
    console.warn("[PlanReview] save failed:", err);
    statusDraft(uid, draft, isTransientNetworkError(err) ? "pending" : "error");
    return isTransientNetworkError(err) ? "queued" : "failed";
  }
}

async function retryPendingDrafts(uid: string) {
  if (typeof navigator !== "undefined" && !navigator.onLine) return;
  for (const draft of Object.values(readDrafts(uid))) {
    if (draft.status !== "pending") continue;
    const period: Period = { horizon: draft.horizon, start: draft.start, end: draft.end };
    await savePlanReview(uid, period, { note: draft.note, reviewed_at: draft.reviewed_at, snapshot: draft.snapshot }, readMirror(uid)[draft.id], draft.calendar, draft.intent_id);
  }
}

/** Reviews of the signed-in user (confirmed cloud + mirror + uid-scoped drafts). */
export function usePlanReviews(uid: string | undefined) {
  const [state, setState] = useState<{ uid?: string; reviews: Record<string, PlanReview>; loaded: boolean }>({ reviews: {}, loaded: false });
  useEffect(() => {
    let active = true;
    setState({ uid, reviews: uid ? mergeDrafts(uid, readMirror(uid)) : {}, loaded: false });
    if (!uid) return () => { active = false; };
    const sync = () => { if (active) setState((prev) => ({ uid, reviews: mergeDrafts(uid, readMirror(uid)), loaded: prev.uid === uid && prev.loaded })); };
    const onLocal = (e: Event) => { if ((e as CustomEvent).detail === uid) sync(); };
    window.addEventListener("arsh:plan-reviews-local", onLocal);
    const onOnline = () => { void retryPendingDrafts(uid); };
    window.addEventListener("online", onOnline);
    if (typeof navigator === "undefined" || navigator.onLine) void retryPendingDrafts(uid);
    let migrated = false;
    const unsub = onSnapshot(collection(db, "users", uid, "plan_reviews"), (snap) => {
      if (!active) return;
      const cloud: Record<string, PlanReview> = {};
      snap.forEach((d) => { cloud[d.id] = { ...(d.data() as PlanReview), id: d.id }; });
      const merged = { ...readMirror(uid) };
      for (const [id, r] of Object.entries(cloud)) {
        const local = merged[id];
        if (!local || (r.revision || 0) > (local.revision || 0) || ((r.revision || 0) === (local.revision || 0) && String(r.updated_at || "") >= String(local.updated_at || ""))) merged[id] = r;
      }
      writeMirror(uid, merged);
      setState({ uid, reviews: mergeDrafts(uid, merged), loaded: true });
      if (!migrated && !snap.metadata.fromCache) { migrated = true; void migrateLegacyReviews(uid, merged); }
    }, (err) => { console.warn("[PlanReview] subscribe failed:", err); if (active) setState({ uid, reviews: mergeDrafts(uid, readMirror(uid)), loaded: true }); });
    return () => { active = false; unsub(); window.removeEventListener("arsh:plan-reviews-local", onLocal); window.removeEventListener("online", onOnline); };
  // state is intentionally not a dependency; callbacks are fenced by uid and active.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid]);
  return state.uid === uid ? state : { uid, reviews: {}, loaded: false };
}

/** Copy only this uid's old device notes; retain source keys and never overwrite a different note. */
export async function migrateLegacyReviews(uid: string, existing: Record<string, PlanReview>) {
  try { if (localStorage.getItem(migratedKey(uid))) return; } catch { return; }
  const legacy = legacyLocalReviews(uid);
  let retryNeeded = false;
  for (const old of legacy) {
    const matching = Object.values(existing).find((r) => r.horizon === old.horizon && r.start === old.start && r.calendar !== "legacy");
    if (matching && old.note && matching.note !== old.note) {
      setDraft(uid, matching.id, { id: matching.id, horizon: matching.horizon, start: matching.start, end: matching.end, calendar: matching.calendar as CalendarSystem, note: old.note, intent_id: `legacy_${hashText(`${uid}:${old.id}`)}`, base_revision: matching.revision || 0, status: "conflict", updated_at: new Date().toISOString() });
      continue;
    }
    if (matching?.note === old.note || !old.note) continue;
    const period: Period = { horizon: old.horizon, start: old.start, end: old.end };
    const status = await savePlanReview(uid, period, { note: old.note, reviewed_at: old.reviewed_at || null, snapshot: null }, null, "legacy", `legacy_${hashText(`${uid}:${old.id}`)}`);
    if (status === "failed") retryNeeded = true;
  }
  if (!retryNeeded) try { localStorage.setItem(migratedKey(uid), new Date().toISOString()); } catch { /* retain source notes */ }
}

/** Find exact calendar period, then compatible old records by level/start. */
export function reviewFor(reviews: Record<string, PlanReview>, p: Period, calendar: CalendarSystem = getTimeSettings().calendar): PlanReview | null {
  return reviews[reviewId(p, calendar)]
    || Object.values(reviews).find((r) => r.horizon === p.horizon && r.start === p.start && r.end === p.end)
    || Object.values(reviews).find((r) => r.horizon === p.horizon && r.start === p.start && r.calendar === "legacy")
    || Object.values(reviews).find((r) => r.horizon === p.horizon && r.start === p.start && !r.calendar && !r.end)
    || null;
}
