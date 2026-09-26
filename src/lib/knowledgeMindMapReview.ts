import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";

export type KnowledgeMindMapReviewScope =
  | { kind: "all" }
  | { kind: "folder"; id: string }
  | { kind: "document"; id: string };

export interface KnowledgeMindMapReviewableScopeIds {
  documentIds: ReadonlySet<string>;
  folderIds: ReadonlySet<string>;
}

/** Builds the set of lessons/folders that contain cards using Leitner's valid-link precedence. */
export function getKnowledgeMindMapReviewableScopeIds(
  cards: LeitnerCard[],
  folders: KnowledgeFolder[],
  documents: KnowledgeDocument[],
): KnowledgeMindMapReviewableScopeIds {
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const documentIds = new Set<string>();
  const folderIds = new Set<string>();

  for (const card of cards) {
    const linkedDocument = card.document_id ? documentById.get(card.document_id) : undefined;
    if (linkedDocument) documentIds.add(linkedDocument.id);

    // A valid lesson link is authoritative; use legacy folder_id only when
    // the referenced lesson is missing, matching Leitner's folder filtering.
    const effectiveFolderId = linkedDocument ? linkedDocument.folder_id : card.folder_id;
    let folder = effectiveFolderId ? folderById.get(effectiveFolderId) : undefined;
    const visited = new Set<string>();
    while (folder && !visited.has(folder.id)) {
      visited.add(folder.id);
      folderIds.add(folder.id);
      folder = folder.parent_id ? folderById.get(folder.parent_id) : undefined;
    }
  }

  return { documentIds, folderIds };
}

export function resolveKnowledgeMindMapReviewScope(
  node: { type: "root" | "folder" | "subfolder" | "doc" | "card"; dataId?: string },
  hasCards: boolean,
  reviewableScopeIds: KnowledgeMindMapReviewableScopeIds,
): KnowledgeMindMapReviewScope | null {
  if (node.type === "root") return hasCards ? { kind: "all" } : null;
  if ((node.type === "folder" || node.type === "subfolder") && node.dataId) {
    return reviewableScopeIds.folderIds.has(node.dataId)
      ? { kind: "folder", id: node.dataId }
      : null;
  }
  if (node.type === "doc" && node.dataId) {
    return reviewableScopeIds.documentIds.has(node.dataId)
      ? { kind: "document", id: node.dataId }
      : null;
  }
  return null;
}
