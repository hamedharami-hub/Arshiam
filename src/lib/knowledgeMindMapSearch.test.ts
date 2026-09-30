import { describe, expect, it } from "vitest";
import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";
import {
  buildKnowledgeMindMapSearch,
  mindMapNodeMatchesSearch,
  normalizeKnowledgeSearchText,
} from "./knowledgeMindMapSearch";

const folder = (id: string, name: string, parentId: string | null): KnowledgeFolder => ({
  id,
  user_id: "user-1",
  parent_id: parentId,
  name,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

const document = (id: string, folderId: string): KnowledgeDocument => ({
  id,
  user_id: "user-1",
  folder_id: folderId,
  title: "CYP1A2",
  title_en: "Cytochrome interactions",
  content_html: "<p>مهارکننده سیپروفلوکساسین</p>",
  content_en: "<p>Smoking induces metabolism</p>",
  plain_text: "مهارکننده سیپروفلوکساسین",
  tags: ["Pharmacology"],
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

const card = (id: string, documentId: string): LeitnerCard => ({
  id,
  user_id: "user-1",
  document_id: documentId,
  folder_id: "leaf",
  front: "What inhibits CYP1A2?",
  back: "Ciprofloxacin",
  clue: "antibiotic interaction",
  box: 1,
  next_review_at: "2026-01-01T00:00:00.000Z",
  review_count: 0,
  lapse_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  updated_at: "2026-01-01T00:00:00.000Z",
});

describe("knowledge mind-map search", () => {
  const folders = [
    folder("root", "فارماکولوژی", null),
    folder("middle", "تداخلات", "root"),
    folder("leaf", "CYP enzymes", "middle"),
  ];
  const documents = [document("doc-1", "leaf")];
  const cards = [card("card-1", "doc-1")];

  it("normalizes Arabic/Persian variants, diacritics, and zero-width joins", () => {
    expect(normalizeKnowledgeSearchText("مُهار كننده")).toBe(normalizeKnowledgeSearchText("مهار‌ کننده"));
  });

  it("searches folder names and expands every ancestor", () => {
    const result = buildKnowledgeMindMapSearch("enzymes", folders, documents, cards);
    expect(result.folderIds.has("leaf")).toBe(true);
    expect(result.expandedNodeIds).toMatchObject({
      "root-kb": true,
      "folder-root": true,
      "folder-middle": true,
      "folder-leaf": true,
    });
  });

  it("searches document content, English body, tags, and highlights the document node", () => {
    for (const query of ["سیپروفلوکساسین", "Smoking induces", "Pharmacology"]) {
      const result = buildKnowledgeMindMapSearch(query, folders, documents, cards);
      expect(result.documentIds.has("doc-1")).toBe(true);
      expect(mindMapNodeMatchesSearch({ type: "doc", dataId: "doc-1" }, result)).toBe(true);
      expect(result.expandedNodeIds["folder-root"]).toBe(true);
      expect(result.expandedNodeIds["folder-middle"]).toBe(true);
      expect(result.expandedNodeIds["folder-leaf"]).toBe(true);
    }
  });

  it("searches card answers and clues, then expands its document and full folder path", () => {
    const result = buildKnowledgeMindMapSearch("Ciprofloxacin", folders, documents, cards);
    expect(result.cardIds.has("card-1")).toBe(true);
    expect(result.expandedNodeIds["doc-doc-1"]).toBe(true);
    expect(result.expandedNodeIds["folder-root"]).toBe(true);
    expect(result.expandedNodeIds["folder-middle"]).toBe(true);
    expect(result.expandedNodeIds["folder-leaf"]).toBe(true);
    expect(mindMapNodeMatchesSearch({ type: "card", dataId: "card-1" }, result)).toBe(true);
  });
});
