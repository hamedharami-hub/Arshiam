import { describe, expect, it } from "vitest";
import { filterCardsForDocuments, filterKnowledgeForFolderBranch } from "./reviewScope";

describe("review folder scope", () => {
  const folders = [
    { id: "pharmacy", parent_id: null, name: "Pharmacy" },
    { id: "otc", parent_id: "pharmacy", name: "OTC" },
    { id: "personal", parent_id: null, name: "Personal" },
  ] as any[];
  const documents = [
    { id: "p1", folder_id: "pharmacy", title: "Pharmacy root" },
    { id: "p2", folder_id: "otc", title: "OTC" },
    { id: "x1", folder_id: "personal", title: "Personal" },
  ] as any[];

  it("includes the selected root and all descendants only", () => {
    const scoped = filterKnowledgeForFolderBranch(folders, documents, "pharmacy");
    expect(scoped.folders.map((folder) => folder.id)).toEqual(["pharmacy", "otc"]);
    expect(scoped.documents.map((document) => document.id)).toEqual(["p1", "p2"]);
  });

  it("keeps only cards attached to documents in the branch", () => {
    const scoped = filterKnowledgeForFolderBranch(folders, documents, "pharmacy");
    const cards = [{ id: "c1", document_id: "p1" }, { id: "c2", document_id: "x1" }, { id: "c3" }] as any[];
    expect(filterCardsForDocuments(cards, scoped.documents).map((card) => card.id)).toEqual(["c1"]);
  });
});
