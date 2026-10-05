import { doc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type CloudSnapshot = { updatedAt: number; data: unknown };

export interface CloudBinding {
  push: () => void;
  stop: () => void;
}

/**
 * Mirrors one localStorage-backed JSON blob to users/{uid}/app_state/{name}.
 * Last writer wins by `updatedAt`; a device with no local copy adopts the cloud copy first.
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

  const flush = async () => {
    timer = null;
    const local = opts.read();
    if (!local || stopped) return;
    try {
      await setDoc(ref, { updatedAt: local.updatedAt, json: JSON.stringify(local.data) });
    } catch (e) {
      console.warn(`[cloudState] could not upload ${name}`, e);
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
