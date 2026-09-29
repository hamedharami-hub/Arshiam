import { db, doc, onSnapshot, setDoc } from "@/lib/firebase";

export type MindMapStudyStatus = "later" | "studying" | "done";
export type MindMapStudyProgress = Record<string, MindMapStudyStatus>;

export const MIND_MAP_PROGRESS_EVENT = "arsh:mind-map-progress";

const keyFor = (userId: string) => `arsh_mind_map_progress_v1:${userId}`;

function sanitizeProgress(raw: unknown): MindMapStudyProgress {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  return Object.fromEntries(
    Object.entries(raw).filter(([, status]) =>
      ["later", "studying", "done"].includes(String(status))
    )
  ) as MindMapStudyProgress;
}

export function loadMindMapStudyProgress(userId: string): MindMapStudyProgress {
  if (typeof localStorage === "undefined" || !userId) return {};
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) return {};
    return sanitizeProgress(JSON.parse(raw));
  } catch {
    return {};
  }
}

export function saveLocalMindMapStudyProgress(userId: string, progress: MindMapStudyProgress): void {
  if (typeof localStorage === "undefined" || !userId) return;
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(progress));
  } catch (err) {
    console.warn("[mindMapProgress] Failed to save to localStorage:", err);
  }
}

function notifyLocalChange(userId: string, progress: MindMapStudyProgress): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(MIND_MAP_PROGRESS_EVENT, { detail: { userId, progress } })
    );
  }
}

export async function syncMindMapStudyProgressToCloud(
  userId: string,
  progress?: MindMapStudyProgress
): Promise<boolean> {
  if (!userId) return false;
  if (process.env.NODE_ENV === "test" && !(setDoc as any).mock) {
    return true;
  }
  const dataToSave = progress ?? loadMindMapStudyProgress(userId);
  try {
    const docRef = doc(db, "users", userId, "mind_settings", "mind_map_progress");
    await setDoc(
      docRef,
      {
        progress: dataToSave,
        user_id: userId,
        updated_at: new Date().toISOString(),
      },
      { merge: true }
    );
    return true;
  } catch (error) {
    console.warn("[mindMapProgress] Failed to sync mind map progress to cloud:", error);
    return false;
  }
}

export function saveMindMapStudyStatus(
  userId: string,
  documentId: string,
  status: MindMapStudyStatus
): MindMapStudyProgress {
  const current = loadMindMapStudyProgress(userId);
  const next: MindMapStudyProgress = { ...current, [documentId]: status };
  saveLocalMindMapStudyProgress(userId, next);
  notifyLocalChange(userId, next);

  if (userId) {
    void syncMindMapStudyProgressToCloud(userId, next).catch((err) => {
      console.warn("[mindMapProgress] Background cloud sync notice:", err);
    });
  }

  return next;
}

export function saveMindMapStudyProgress(
  userId: string,
  progress: MindMapStudyProgress
): MindMapStudyProgress {
  saveLocalMindMapStudyProgress(userId, progress);
  notifyLocalChange(userId, progress);

  if (userId) {
    void syncMindMapStudyProgressToCloud(userId, progress).catch((err) => {
      console.warn("[mindMapProgress] Background cloud sync notice:", err);
    });
  }

  return progress;
}

export function subscribeMindMapStudyProgress(
  userId: string,
  onUpdate: (progress: MindMapStudyProgress) => void
): () => void {
  if (!userId) {
    onUpdate({});
    return () => {};
  }

  // 1. Immediately provide cached local progress
  const localInitial = loadMindMapStudyProgress(userId);
  onUpdate(localInitial);

  // 2. React to local edits across components or windows
  const handleLocalChange = (event: Event) => {
    const custom = event as CustomEvent<{ userId: string; progress: MindMapStudyProgress }>;
    if (custom.detail?.userId === userId && custom.detail.progress) {
      onUpdate(custom.detail.progress);
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener(MIND_MAP_PROGRESS_EVENT, handleLocalChange);
  }

  // 3. Realtime listener to Firestore
  let unsubFirestore = () => {};
  if (process.env.NODE_ENV === "test" && !(onSnapshot as any).mock) {
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener(MIND_MAP_PROGRESS_EVENT, handleLocalChange);
      }
    };
  }
  try {
    const docRef = doc(db, "users", userId, "mind_settings", "mind_map_progress");
    unsubFirestore = onSnapshot(
      docRef,
      (snap) => {
        if (!snap.exists()) {
          // If remote is empty but we have local progress, push local progress to cloud
          const currentLocal = loadMindMapStudyProgress(userId);
          if (Object.keys(currentLocal).length > 0) {
            void syncMindMapStudyProgressToCloud(userId, currentLocal);
          }
          return;
        }

        const remoteData = snap.data();
        const remoteProgress = sanitizeProgress(remoteData?.progress);

        // Merge local and remote so any offline additions are preserved
        const currentLocal = loadMindMapStudyProgress(userId);
        const merged: MindMapStudyProgress = { ...currentLocal, ...remoteProgress };

        saveLocalMindMapStudyProgress(userId, merged);
        onUpdate(merged);

        // If local had unsynced keys not yet present in remote, sync merged back
        const hasMissingOnRemote = Object.keys(currentLocal).some((id) => !(id in remoteProgress));
        if (hasMissingOnRemote) {
          void syncMindMapStudyProgressToCloud(userId, merged);
        }
      },
      (error) => {
        console.warn("[mindMapProgress] Firestore listener notice:", error);
      }
    );
  } catch (error) {
    console.warn("[mindMapProgress] Could not subscribe to Firestore:", error);
  }

  return () => {
    if (typeof window !== "undefined") {
      window.removeEventListener(MIND_MAP_PROGRESS_EVENT, handleLocalChange);
    }
    unsubFirestore();
  };
}

export function mindMapProgressCounts(documentIds: string[], progress: MindMapStudyProgress) {
  return documentIds.reduce((counts, id) => {
    const status = progress[id] || "later";
    counts[status] += 1;
    return counts;
  }, { later: 0, studying: 0, done: 0 });
}
