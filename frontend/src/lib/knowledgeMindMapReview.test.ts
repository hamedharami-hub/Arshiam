import { describe, expect, it } from "vitest";
import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";
import { getLeitnerCardsForFolderBranch } from "@/lib/leitnerOutline";
import {
  getKnowledgeMindMapReviewableScopeIds,
  resolveKnowledgeMindMapReviewScope,
} from "./knowledgeMindMapReview";

const timestamp = "2026-01-01T00:00:00.000Z";

const folders: KnowledgeFolder[] = [
  { id: "root", user_id: "user-1", parent_id: null, name: "Root", created_at: timestamp, updated_at: timestamp },
  { id: "child", user_id: "user-1", parent_id: "root", name: "Child", created_at: timestamp, updated_at: timestamp },
  { id: "cycle-a", user_id: "user-1", parent_id: "cycle-b", name: "Cycle A", created_at: timestamp, updated_at: timestamp },
  { id: "cycle-b", user_id: "user-1", parent_id: "cycle-a", name: "Cycle B", created_at: timestamp, updated_at: timestamp },
];

const documents: KnowledgeDocument[] = [
  { id: "doc-linked", user_id: "user-1", folder_id: "child", title: "Linked", content_html: "", created_at: timestamp, updated_at: timestamp },
  { id: "doc-empty", user_id: "user-1", folder_id: "root", title: "No cards", content_html: "", created_at: timestamp, updated_at: timestamp },
];

const cards: LeitnerCard[] = [
  {
    id: "card-linked", user_id: "user-1", document_id: "doc-linked", folder_id: "cycle-a",
    front: "Question", back: "Answer", box: 1, next_review_at: timestamp,
    review_count: 0, lapse_count: 0, created_at: timestamp, updated_at: timestamp,
  },
  {
    id: "card-legacy", user_id: "user-1", document_id: "missing-doc", folder_id: "cycle-a",
    front: "Legacy question", back: "Answer", box: 1, next_review_at: timestamp,
    review_count: 0, lapse_count: 0, created_at: timestamp, updated_at: timestamp,
  },
];

describe("knowledge mind-map Leitner scopes", () => {
  it("matches Leitner folder membership, honors valid lesson links, and safely handles folder cycles", () => {
    const scopes = getKnowledgeMindMapReviewableScopeIds(cards, folders, documents);

    expect([...scopes.documentIds]).toEqual(["doc-linked"]);
    for (const folder of folders) {
      const hasCards = getLeitnerCardsForFolderBranch(cards, folders, documents, folder.id).length > 0;
      expect(scopes.folderIds.has(folder.id)).toBe(hasCards);
    }
    expect(scopes.folderIds.has("child")).toBe(true);
    expect(scopes.folderIds.has("cycle-a")).toBe(true);
    expect(scopes.folderIds.has("cycle-b")).toBe(true);
  });

  it("only resolves review actions for available root, folder, and document scopes", () => {
    const scopes = getKnowledgeMindMapReviewableScopeIds(cards, folders, documents);

    expect(resolveKnowledgeMindMapReviewScope({ type: "root" }, true, scopes)).toEqual({ kind: "all" });
    expect(resolveKnowledgeMindMapReviewScope({ type: "root" }, false, scopes)).toBeNull();
    expect(resolveKnowledgeMindMapReviewScope({ type: "root", dataId: "child" }, true, scopes)).toEqual({ kind: "folder", id: "child" });
    expect(resolveKnowledgeMindMapReviewScope({ type: "subfolder", dataId: "child" }, true, scopes)).toEqual({ kind: "folder", id: "child" });
    expect(resolveKnowledgeMindMapReviewScope({ type: "doc", dataId: "doc-linked" }, true, scopes)).toEqual({ kind: "document", id: "doc-linked" });
    expect(resolveKnowledgeMindMapReviewScope({ type: "doc", dataId: "doc-empty" }, true, scopes)).toBeNull();
    expect(resolveKnowledgeMindMapReviewScope({ type: "card", dataId: "card-linked" }, true, scopes)).toBeNull();
  });
});
