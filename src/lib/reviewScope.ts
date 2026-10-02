import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";

export function getFolderBranchIds(folders: KnowledgeFolder[], rootFolderId: string): Set<string> {
  const ids = new Set([rootFolderId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const folder of folders) {
      if (folder.parent_id && ids.has(folder.parent_id) && !ids.has(folder.id)) {
        ids.add(folder.id);
        changed = true;
      }
    }
  }
  return ids;
}

export function filterKnowledgeForFolderBranch(
  folders: KnowledgeFolder[],
  documents: KnowledgeDocument[],
  rootFolderId?: string,
) {
  if (!rootFolderId) return { folders, documents };
  const folderIds = getFolderBranchIds(folders, rootFolderId);
  return {
    folders: folders.filter((folder) => folderIds.has(folder.id)),
    documents: documents.filter((document) => Boolean(document.folder_id && folderIds.has(document.folder_id))),
  };
}

export function filterCardsForDocuments(cards: LeitnerCard[], documents: KnowledgeDocument[], folders: KnowledgeFolder[] = []): LeitnerCard[] {
  const documentIds = new Set(documents.map((document) => document.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  return cards.filter((card) => Boolean((card.document_id && documentIds.has(card.document_id)) || (!card.document_id && card.folder_id && folderIds.has(card.folder_id))));
}
