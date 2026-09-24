import type { KnowledgeDocument, KnowledgeFolder } from "./knowledgeTypes";
import type { LeitnerCard } from "./leitnerTypes";

export interface KnowledgeMindMapSearchResult {
  folderIds: Set<string>;
  documentIds: Set<string>;
  cardIds: Set<string>;
  expandedNodeIds: Record<string, boolean>;
}

function plainText(value: string | undefined): string {
  return (value || "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ");
}

export function normalizeKnowledgeSearchText(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200C\u200D]/g, " ")
    .toLocaleLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function includesQuery(values: Array<string | undefined>, query: string): boolean {
  return values.some((value) => normalizeKnowledgeSearchText(plainText(value)).includes(query));
}

export function buildKnowledgeMindMapSearch(
  rawQuery: string,
  folders: KnowledgeFolder[],
  documents: KnowledgeDocument[],
  cards: LeitnerCard[],
): KnowledgeMindMapSearchResult {
  const query = normalizeKnowledgeSearchText(rawQuery);
  const result: KnowledgeMindMapSearchResult = {
    folderIds: new Set(),
    documentIds: new Set(),
    cardIds: new Set(),
    expandedNodeIds: {},
  };
  if (!query) return result;

  result.expandedNodeIds["root-kb"] = true;
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const documentById = new Map(documents.map((document) => [document.id, document]));

  const expandFolderPath = (folderId: string | null | undefined) => {
    const visited = new Set<string>();
    let currentId = folderId || undefined;
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId);
      result.expandedNodeIds[`folder-${currentId}`] = true;
      currentId = folderById.get(currentId)?.parent_id || undefined;
    }
  };

  for (const folder of folders) {
    if (includesQuery([folder.name], query)) {
      result.folderIds.add(folder.id);
      expandFolderPath(folder.id);
    }
  }

  for (const document of documents) {
    if (includesQuery([
      document.title,
      document.title_en,
      document.plain_text,
      document.content_plain,
      document.content_html,
      document.content_en,
      ...(document.tags || []),
    ], query)) {
      result.documentIds.add(document.id);
      expandFolderPath(document.folder_id);
    }
  }

  for (const card of cards) {
    if (!includesQuery([card.front, card.back, card.clue], query)) continue;
    result.cardIds.add(card.id);
    if (card.document_id) {
      result.expandedNodeIds[`doc-${card.document_id}`] = true;
      expandFolderPath(documentById.get(card.document_id)?.folder_id || card.folder_id);
    } else {
      expandFolderPath(card.folder_id);
    }
  }

  return result;
}

export function mindMapNodeMatchesSearch(
  node: { type: "root" | "folder" | "subfolder" | "doc" | "card"; dataId?: string },
  result: KnowledgeMindMapSearchResult,
): boolean {
  if (!node.dataId) return false;
  if (node.type === "folder" || node.type === "subfolder") return result.folderIds.has(node.dataId);
  if (node.type === "doc") return result.documentIds.has(node.dataId);
  if (node.type === "card") return result.cardIds.has(node.dataId);
  return false;
}
