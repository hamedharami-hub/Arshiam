export * from "./mindMapProgressSync";
export type { MindMapStudyStatus, MindMapStudyProgress } from "./mindMapProgressState";
import type { MindMapStudyProgress } from "./mindMapProgressState";

export function mindMapProgressCounts(documentIds: string[], progress: MindMapStudyProgress) {
  return documentIds.reduce((counts, id) => {
    const status = progress[id] || "later";
    counts[status] += 1;
    return counts;
  }, { later: 0, studying: 0, done: 0 });
}
