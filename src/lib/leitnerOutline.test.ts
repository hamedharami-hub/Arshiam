import { describe, expect, it } from "vitest";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { buildLeitnerOutline, filterLeitnerCards, type LeitnerOutlineNode } from "./leitnerOutline";

const makeCard = (overrides: Partial<LeitnerCard> & Pick<LeitnerCard, "id">): LeitnerCard => ({
  user_id: "user-1",
  document_id: null,
  folder_id: null,
  front: `Question ${overrides.id}`,
  back: `Answer ${overrides.id}`,
  box: 1,
  next_review_at: "2026-09-25T00:00:00.000Z",
  review_count: 0,
  lapse_count: 0,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const makeFolder = (overrides: Partial<KnowledgeFolder> & Pick<KnowledgeFolder, "id" | "name">): KnowledgeFolder => ({
  user_id: "user-1",
  parent_id: null,
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

const makeDocument = (
  overrides: Partial<KnowledgeDocument> & Pick<KnowledgeDocument, "id" | "title">,
): KnowledgeDocument => ({
  user_id: "user-1",
  folder_id: null,
  content_html: "",
  created_at: "2026-09-01T00:00:00.000Z",
  updated_at: "2026-09-01T00:00:00.000Z",
  ...overrides,
});

function collectCardIds(nodes: LeitnerOutlineNode[]): string[] {
  return nodes.flatMap((node) => node.type === "document"
    ? node.cards.map((card) => card.id)
    : [
        ...node.cards.map((card) => card.id),
        ...collectCardIds(node.children),
      ]);
}

describe("Leitner outline helpers", () => {
  it("filters by query, box, due state, and lapse without changing cards", () => {
    const cards = [
      makeCard({ id: "due-lapsed", front: "Aspirin dose", box: 2, lapse_count: 1 }),
      makeCard({ id: "upcoming", front: "Ibuprofen dose", box: 2 }),
      makeCard({ id: "other-box", front: "Aspirin safety", box: 3, lapse_count: 2 }),
    ];

    expect(filterLeitnerCards(cards, {
      query: "ASPIRIN",
      box: 2,
      due: "due",
      lapsedOnly: true,
      dueCardIds: new Set(["due-lapsed", "other-box"]),
    }).map((card) => card.id)).toEqual(["due-lapsed"]);
    expect(cards[0].box).toBe(2);
  });

  it("groups each card once under its linked lesson and nested folder path", () => {
    const folders = [
      makeFolder({ id: "folder-root", name: "Pharmacology", position: 1 }),
      makeFolder({ id: "folder-child", name: "Cardiovascular", parent_id: "folder-root", position: 1 }),
    ];
    const documents = [makeDocument({ id: "doc-1", title: "Hypertension", folder_id: "folder-child" })];
    const cards = [makeCard({ id: "card-1", document_id: "doc-1", folder_id: "folder-root" })];

    const outline = buildLeitnerOutline(cards, folders, documents, new Set(["card-1"]));
    const root = outline.nodes[0];
    expect(root.type).toBe("folder");
    if (root.type !== "folder") return;
    expect(root.name).toBe("Pharmacology");
    expect(root.cardCount).toBe(1);
    expect(root.dueCardCount).toBe(1);
    expect(root.children[0].type).toBe("folder");
    if (root.children[0].type !== "folder") return;
    expect(root.children[0].children).toEqual([
      expect.objectContaining({ type: "document", id: "doc-1", cards: [cards[0]], dueCardCount: 1 }),
    ]);
    expect(collectCardIds(outline.nodes)).toEqual(["card-1"]);
    expect(outline.unfiledCards).toEqual([]);
  });

  it("keeps broken document links visible in a valid folder and unknown links unfiled", () => {
    const cards = [
      makeCard({ id: "fallback", document_id: "deleted-doc", folder_id: "folder-1" }),
      makeCard({ id: "orphan", document_id: "missing-doc", folder_id: "missing-folder" }),
    ];
    const outline = buildLeitnerOutline(cards, [makeFolder({ id: "folder-1", name: "General" })], []);

    expect(collectCardIds(outline.nodes)).toEqual(["fallback"]);
    expect(outline.unfiledCards.map((card) => card.id)).toEqual(["orphan"]);
  });

  it("breaks malformed folder cycles deterministically and keeps their cards reachable", () => {
    const folders = [
      makeFolder({ id: "cycle-a", name: "A", parent_id: "cycle-b" }),
      makeFolder({ id: "cycle-b", name: "B", parent_id: "cycle-a" }),
    ];
    const cards = [makeCard({ id: "cycle-card", folder_id: "cycle-b" })];

    const outline = buildLeitnerOutline(cards, folders, []);
    expect(collectCardIds(outline.nodes)).toEqual(["cycle-card"]);
    expect(outline.nodes.some((node) => node.type === "folder" && node.id === "cycle-a")).toBe(true);
  });
});
