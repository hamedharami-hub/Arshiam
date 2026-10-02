import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KnowledgeFolder } from "@/lib/knowledgeTypes";
import { FRED_LESSONS } from "./fredLessons";
import { FRED_PARENT_FOLDER_NAME, addKeyPointCards, fredLessonFolderName } from "./fredReviewCards";
import { filterCardsForDocuments } from "@/lib/reviewScope";

const m = vi.hoisted(() => ({ folders: [] as KnowledgeFolder[], cards: [] as Record<string, unknown>[], seq: 0 }));
vi.mock("@/lib/knowledgeService", () => ({
  getKnowledgeFolders: async () => [...m.folders],
  createKnowledgeFolder: async (_u: string, d: { name: string; parent_id: string }) => { const f = { id: `f${++m.seq}`, name: d.name, parent_id: d.parent_id, user_id: "u", position: 1, created_at: "", updated_at: "" } as KnowledgeFolder; m.folders.push(f); return f; },
}));
vi.mock("@/lib/leitnerService", () => ({
  getLeitnerCards: async () => [...m.cards],
  createLeitnerCard: async (_u: string, d: Record<string, unknown>) => { m.cards.push({ id: `c${++m.seq}`, ...d }); },
  updateLeitnerCard: async (_u: string, id: string, p: Record<string, unknown>) => { Object.assign(m.cards.find(c => c.id === id)!, p); },
}));
const root = { id: "folder-pharmacy-root", name: "Pharmacy", parent_id: null, user_id: "u", position: 0, created_at: "", updated_at: "" } as KnowledgeFolder;
beforeEach(() => { localStorage.clear(); m.folders = [root]; m.cards = []; m.seq = 0; });

describe("FRED key-point cards live in the lesson's own review topic", () => {
  it("creates a lesson folder under the Pharmacy root and puts the 3 cards in it", async () => {
    const lesson = FRED_LESSONS[1];
    const r = await addKeyPointCards("u", lesson);
    const parent = m.folders.find(f => f.name === FRED_PARENT_FOLDER_NAME)!;
    const own = m.folders.find(f => f.name === fredLessonFolderName(lesson))!;
    expect(parent.parent_id).toBe("folder-pharmacy-root");
    expect(own.parent_id).toBe(parent.id);
    expect(r).toMatchObject({ added: 3, folderId: own.id, already: false });
    expect(m.cards.every(c => c.folder_id === own.id)).toBe(true);
  });
  it("gives each lesson a different topic and does not duplicate on repeat", async () => {
    const a = await addKeyPointCards("u", FRED_LESSONS[0]);
    const b = await addKeyPointCards("u", FRED_LESSONS[1]);
    expect(a.folderId).not.toBe(b.folderId);
    const again = await addKeyPointCards("u", FRED_LESSONS[0]);
    expect(again).toMatchObject({ already: true, added: 0, folderId: a.folderId });
    expect(m.cards).toHaveLength(6);
    expect(m.folders.filter(f => f.name === FRED_PARENT_FOLDER_NAME)).toHaveLength(1);
  });
  it("moves cards created by the earlier version from the Pharmacy root instead of duplicating them", async () => {
    const lesson = FRED_LESSONS[2];
    m.cards = lesson.keyPoints.map((kp, i) => ({ id: `old${i}`, front: kp.front[0], front_en: kp.front[1], folder_id: "folder-pharmacy-root", document_id: null }));
    const r = await addKeyPointCards("u", lesson);
    expect(r).toMatchObject({ added: 0, moved: 3 });
    expect(m.cards).toHaveLength(3);
    expect(m.cards.every(c => c.folder_id === r.folderId)).toBe(true);
  });
  it("review scope for the lesson topic includes its cards and excludes other lessons' cards", async () => {
    const a = await addKeyPointCards("u", FRED_LESSONS[0]);
    await addKeyPointCards("u", FRED_LESSONS[1]);
    const branch = m.folders.filter(f => f.id === a.folderId);
    const scoped = filterCardsForDocuments(m.cards as never[], [], branch);
    expect(scoped).toHaveLength(3);
  });
  it("falls back to the Pharmacy root when the root folder does not exist", async () => {
    m.folders = [];
    const r = await addKeyPointCards("u", FRED_LESSONS[0]);
    expect(r.folderId).toBe("folder-pharmacy-root");
    expect(m.folders).toHaveLength(0);
  });
});
