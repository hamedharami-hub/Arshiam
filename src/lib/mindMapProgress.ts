export type MindMapStudyStatus = "later" | "studying" | "done";
export type MindMapStudyProgress = Record<string, MindMapStudyStatus>;

const keyFor = (userId: string) => `arsh_mind_map_progress_v1:${userId}`;

export function loadMindMapStudyProgress(userId: string): MindMapStudyProgress {
  if (typeof localStorage === "undefined" || !userId) return {};
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(userId)) || "{}");
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value).filter(([, status]) => ["later", "studying", "done"].includes(String(status)))) as MindMapStudyProgress;
  } catch {
    return {};
  }
}

export function saveMindMapStudyStatus(userId: string, documentId: string, status: MindMapStudyStatus): MindMapStudyProgress {
  const next = { ...loadMindMapStudyProgress(userId), [documentId]: status };
  if (typeof localStorage !== "undefined") localStorage.setItem(keyFor(userId), JSON.stringify(next));
  return next;
}

export function mindMapProgressCounts(documentIds: string[], progress: MindMapStudyProgress) {
  return documentIds.reduce((counts, id) => {
    const status = progress[id] || "later";
    counts[status] += 1;
    return counts;
  }, { later: 0, studying: 0, done: 0 });
}
