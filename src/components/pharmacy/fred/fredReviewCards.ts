import { createKnowledgeFolder, getKnowledgeFolders } from "@/lib/knowledgeService";
import { createLeitnerCard, getLeitnerCards, updateLeitnerCard } from "@/lib/leitnerService";
import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";
import type { FredLesson } from "./fredLessons";

export const FRED_PARENT_FOLDER_NAME = "FRED · درس‌های داروخانه / Pharmacy lessons";
export const fredLessonFolderName = (lesson: FredLesson) => `FRED · ${lesson.title[0].split(":")[0].trim()} / ${lesson.title[1].split(":")[0].trim()}`;

const markerKey = (uid: string) => `arshnaz:fred-cards:v2:${uid}`;
let inflight: Promise<unknown> = Promise.resolve();

function readMarkers(uid: string): string[] {
  try { const v: unknown = JSON.parse(localStorage.getItem(markerKey(uid)) ?? "[]"); return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
}

/** Finds or creates the lesson's own review topic (a Knowledge folder under the Pharmacy root). Falls back to the Pharmacy root when that root is missing. */
export async function ensureFredLessonFolder(uid: string, lesson: FredLesson): Promise<string> {
  const folders = await getKnowledgeFolders(uid);
  if (!folders.some(f => f.id === PHARMACY_ROOT_FOLDER_ID)) return PHARMACY_ROOT_FOLDER_ID;
  let parent = folders.find(f => f.parent_id === PHARMACY_ROOT_FOLDER_ID && f.name === FRED_PARENT_FOLDER_NAME);
  parent ??= await createKnowledgeFolder(uid, { name: FRED_PARENT_FOLDER_NAME, parent_id: PHARMACY_ROOT_FOLDER_ID });
  const name = fredLessonFolderName(lesson);
  const existing = folders.find(f => f.parent_id === parent.id && f.name === name);
  return (existing ?? await createKnowledgeFolder(uid, { name, parent_id: parent.id })).id;
}

export interface KeyPointCardsResult { added: number; moved: number; already: boolean; folderId: string }

async function run(uid: string, lesson: FredLesson): Promise<KeyPointCardsResult> {
  const folderId = await ensureFredLessonFolder(uid, lesson);
  const markers = readMarkers(uid);
  if (markers.includes(lesson.id)) return { added: 0, moved: 0, already: true, folderId };
  const existing = await getLeitnerCards(uid);
  let added = 0;
  let moved = 0;
  for (const kp of lesson.keyPoints) {
    const match = existing.find(c => (c.front_en ?? c.front) === kp.front[1] && !c.document_id);
    if (match) {
      if (match.folder_id !== folderId) { await updateLeitnerCard(uid, match.id, { folder_id: folderId }); moved++; }
      continue;
    }
    await createLeitnerCard(uid, {
      front: kp.front[0], back: kp.back[0], front_fa: kp.front[0], back_fa: kp.back[0], front_en: kp.front[1], back_en: kp.back[1],
      folder_id: folderId, document_id: null,
    });
    added++;
  }
  try { localStorage.setItem(markerKey(uid), JSON.stringify([...markers, lesson.id])); } catch { /* marker is best-effort */ }
  return { added, moved, already: false, folderId };
}

/** Puts a lesson's 3 key points in its own review topic once; cards from the earlier version (Pharmacy root) are moved, never duplicated. */
export function addKeyPointCards(uid: string, lesson: FredLesson): Promise<KeyPointCardsResult> {
  const next = inflight.then(() => run(uid, lesson), () => run(uid, lesson));
  inflight = next.catch(() => undefined);
  return next;
}
