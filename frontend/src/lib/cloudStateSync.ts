import { doc, onSnapshot, runTransaction } from "firebase/firestore";
import { db } from "./firebase";

export type CloudSnapshot = { updatedAt: number; data: unknown };

export interface CloudBinding {
  push: () => void;
  stop: () => void;
}

function isPermanentCloudError(error: unknown): boolean {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code?: unknown }).code || "")
    : "";
  return ["permission-denied", "unauthenticated", "invalid-argument", "failed-precondition", "not-found"].includes(code);
}

/**
 * Mirrors one localStorage-backed JSON blob to users/{uid}/app_state/{name}.
 * Last writer wins by `updatedAt`; a device with no local copy adopts the cloud copy first.
 * Uploads read the cloud revision inside a transaction first, so a device that was
 * offline cannot overwrite a cloud copy that another device wrote afterwards.
 */
export function bindCloudState(
  userId: string,
  name: string,
  opts: {
    read: () => CloudSnapshot | null;
    apply: (data: unknown, updatedAt: number, local: CloudSnapshot | null) => void;
    /** Rebase explicit local edits over cloud state before uploading. Return null if none apply. */
    reconcilePending?: (remote: CloudSnapshot, local: CloudSnapshot) => CloudSnapshot | null;
    /** Called once a valid server document or our own write acknowledges initial cloud state. */
    onCloudInitialized?: (remote: CloudSnapshot) => void;
  },
): CloudBinding {
  const ref = doc(db, "users", userId, "app_state", name);
  const hadLocalAtBind = opts.read() !== null;
  let ready = false;
  let cloudInitialized = false;
  let pendingPush = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  // Backoff for an upload that could not reach the server (see `flush`).
  let retryDelay = 0;

  const flush = async () => {
    timer = null;
    const local = opts.read();
    if (!local || stopped) return;
    let adopted: CloudSnapshot | null = null;
    let rebased: CloudSnapshot | null = null;
    let wrote = false;
    try {
      // Version-aware write: read the cloud revision in the same transaction that
      // writes, so the check cannot be invalidated by a concurrent remote write.
      await runTransaction(db, async (transaction) => {
        // Firestore may retry the callback; keep the outcome tied to its final run.
        adopted = null;
        rebased = null;
        wrote = false;
        const snap = await transaction.get(ref);
        if (snap.exists()) {
          const remote = snap.data() as { updatedAt?: number; json?: string };
          const remoteAt = Number(remote.updatedAt || 0);
          if (remoteAt > local.updatedAt) {
            let remoteData: unknown = null;
            try { remoteData = remote.json ? JSON.parse(remote.json) : null; } catch { remoteData = null; }
            // An unreadable newer copy is never overwritten; the local edit stays
            // pending and the next snapshot decides.
            if (remoteData === null) return;
            const remoteSnapshot = { updatedAt: remoteAt, data: remoteData };
            // Keep this device's explicit edits when the binder can rebase them
            // over the cloud copy, exactly like the snapshot handler does.
            const candidate = opts.reconcilePending?.(remoteSnapshot, local);
            if (candidate && candidate.updatedAt > remoteAt) {
              rebased = candidate;
              transaction.set(ref, { updatedAt: candidate.updatedAt, json: JSON.stringify(candidate.data) });
              return;
            }
            // No rebase policy (or nothing pending to rebase): the newer cloud copy
            // wins. It is adopted through `apply` after the transaction instead of
            // being silently dropped, so the caller persists and publishes it.
            adopted = remoteSnapshot;
            return;
          }
        }
        transaction.set(ref, { updatedAt: local.updatedAt, json: JSON.stringify(local.data) });
        wrote = true;
      });
    } catch (e) {
      console.warn(`[cloudState] could not upload ${name}`, e);
      if (stopped) return;
      // Keep the local snapshot for a later explicit edit or account sync, but
      // do not retry authorization/schema failures forever in the background.
      if (isPermanentCloudError(e)) {
        retryDelay = 0;
        return;
      }
      // Firestore cannot queue a rejected transaction the way a plain `setDoc` was
      // queued, so retry with backoff instead of dropping this offline edit.
      retryDelay = retryDelay ? Math.min(retryDelay * 2, 60_000) : 4_000;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void flush(), retryDelay);
      return;
    }
    retryDelay = 0;
    if (rebased) {
      opts.apply(rebased.data, rebased.updatedAt, local);
      pendingPush = false;
      return;
    }
    if (adopted) {
      console.warn(`[cloudState] ${name}: cloud copy is newer; adopting it instead of overwriting`);
      opts.apply(adopted.data, adopted.updatedAt, local);
      pendingPush = false;
      return;
    }
    if (wrote) {
      // The transaction itself acknowledges the local write even if the initial
      // snapshot listener has already failed and cannot deliver an echo snapshot.
      pendingPush = false;
      markCloudInitialized(local);
    }
  };

  const push = () => {
    if (!ready) { pendingPush = true; return; }
    if (!cloudInitialized) pendingPush = true;
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void flush(), 1200);
  };

  const markCloudInitialized = (remote: CloudSnapshot) => {
    if (cloudInitialized) return;
    cloudInitialized = true;
    opts.onCloudInitialized?.(remote);
  };

  const unsubscribe = onSnapshot(
    ref,
    (snap) => {
      if (snap.metadata.hasPendingWrites) return;
      const first = !ready;
      ready = true;
      const local = opts.read();
      if (!snap.exists()) {
        if (local) push();
        return;
      }
      const remote = snap.data() as { updatedAt?: number; json?: string };
      const remoteAt = Number(remote.updatedAt || 0);
      let data: unknown = null;
      try { data = remote.json ? JSON.parse(remote.json) : null; } catch { data = null; }
      if (data === null) return;
      const remoteSnapshot = { updatedAt: remoteAt, data };
      if (pendingPush && local && remoteAt >= local.updatedAt && remote.json === JSON.stringify(local.data)) {
        if (timer) { clearTimeout(timer); timer = null; }
        opts.apply(data, remoteAt, local);
        pendingPush = false;
        markCloudInitialized(remoteSnapshot);
        return;
      }
      if (pendingPush && local && opts.reconcilePending) {
        const rebased = opts.reconcilePending(remoteSnapshot, local);
        if (rebased) {
          opts.apply(rebased.data, rebased.updatedAt, local);
          pendingPush = false;
          markCloudInitialized(remoteSnapshot);
          push();
          return;
        }
      }
      // Binders without a rebase policy keep the original timestamp-based
      // adoption rule. Callers with field-aware pending edits reconcile above.
      const adoptRemote = !local || (first && !hadLocalAtBind) || remoteAt > local.updatedAt;
      if (adoptRemote) {
        if (timer) { clearTimeout(timer); timer = null; }
        opts.apply(data, remoteAt, local);
        pendingPush = false;
      } else if (local.updatedAt > remoteAt || pendingPush) {
        pendingPush = false;
        push();
      }
      markCloudInitialized(remoteSnapshot);
    },
    (err) => {
      ready = true;
      console.warn(`[cloudState] listen failed for ${name}`, err);
      const permanent = isPermanentCloudError(err);
      // A listener can terminate before the first snapshot. Preserve local work
      // and push it through the transaction path when the error may be transient.
      if (pendingPush || opts.read()) {
        pendingPush = true;
        if (!permanent) push();
      }
    },
  );

  return {
    push,
    stop: () => {
      if (timer) { clearTimeout(timer); void flush(); }
      stopped = true;
      unsubscribe();
    },
  };
}
