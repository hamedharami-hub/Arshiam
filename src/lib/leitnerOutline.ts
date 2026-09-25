import type { KnowledgeDocument, KnowledgeFolder } from "@/lib/knowledgeTypes";
import type { LeitnerCard } from "@/lib/leitnerTypes";

export interface LeitnerOutlineDocumentNode {
  type: "document";
  id: string;
  title: string;
  cards: LeitnerCard[];
  cardCount: number;
  dueCardCount: number;
}

export interface LeitnerOutlineFolderNode {
  type: "folder";
  id: string;
  name: string;
  children: LeitnerOutlineNode[];
  cards: LeitnerCard[];
  cardCount: number;
  dueCardCount: number;
}

export type LeitnerOutlineNode = LeitnerOutlineFolderNode | LeitnerOutlineDocumentNode;

export interface LeitnerOutline {
  nodes: LeitnerOutlineNode[];
  unfiledCards: LeitnerCard[];
}

export interface LeitnerCardFilters {
  query?: string;
  box?: number | "all";
  due?: "all" | "due" | "not-due";
  lapsedOnly?: boolean;
  dueCardIds?: ReadonlySet<string>;
}

/** Applies inventory filters without changing card scheduling state. */
export function filterLeitnerCards(
  cards: LeitnerCard[],
  filters: LeitnerCardFilters = {},
): LeitnerCard[] {
  const query = filters.query?.trim().toLocaleLowerCase() ?? "";
  const dueCardIds = filters.dueCardIds ?? new Set<string>();

  return cards.filter((card) => {
    if (filters.box !== undefined && filters.box !== "all" && card.box !== filters.box) return false;
    if (filters.lapsedOnly && (card.lapse_count ?? 0) < 1) return false;
    if (filters.due === "due" && !dueCardIds.has(card.id)) return false;
    if (filters.due === "not-due" && dueCardIds.has(card.id)) return false;
    if (!query) return true;

    return [card.front, card.back, card.clue ?? ""].some((text) =>
      text.toLocaleLowerCase().includes(query),
    );
  });
}

function comparePositionAndName(
  a: { position?: number; name: string; id: string },
  b: { position?: number; name: string; id: string },
): number {
  return (a.position ?? 0) - (b.position ?? 0)
    || a.name.localeCompare(b.name)
    || a.id.localeCompare(b.id);
}

/**
 * Builds a single-parent folder → lesson → card outline. Valid document links
 * take precedence over a card's legacy folder_id, so a card is never duplicated.
 * Broken document links fall back to a valid folder and otherwise remain visible
 * in the unfiled group. Malformed folder cycles are cut deterministically.
 */
export function buildLeitnerOutline(
  cards: LeitnerCard[],
  folders: KnowledgeFolder[],
  documents: KnowledgeDocument[],
  dueCardIds: ReadonlySet<string> = new Set<string>(),
): LeitnerOutline {
  const folderById = new Map(folders.map((folder) => [folder.id, folder]));
  const documentById = new Map(documents.map((document) => [document.id, document]));
  const folderCards = new Map<string, LeitnerCard[]>();
  const documentCards = new Map<string, LeitnerCard[]>();
  const unfiledCards: LeitnerCard[] = [];

  for (const card of cards) {
    if (card.document_id && documentById.has(card.document_id)) {
      const groupedCards = documentCards.get(card.document_id) ?? [];
      groupedCards.push(card);
      documentCards.set(card.document_id, groupedCards);
      continue;
    }

    if (card.folder_id && folderById.has(card.folder_id)) {
      const groupedCards = folderCards.get(card.folder_id) ?? [];
      groupedCards.push(card);
      folderCards.set(card.folder_id, groupedCards);
      continue;
    }

    unfiledCards.push(card);
  }

  const parentById = new Map<string, string | null>();
  for (const folder of folders) {
    parentById.set(
      folder.id,
      folder.parent_id && folderById.has(folder.parent_id) ? folder.parent_id : null,
    );
  }

  // Break one edge per cycle. This keeps every card reachable and avoids a
  // recursive render loop if imported or older data contains cyclic folders.
  const checkedIds = new Set<string>();
  for (const folder of [...folders].sort((a, b) => a.id.localeCompare(b.id))) {
    const path: string[] = [];
    const indexById = new Map<string, number>();
    let cursor: string | null = folder.id;

    while (cursor && !checkedIds.has(cursor)) {
      const seenAt = indexById.get(cursor);
      if (seenAt !== undefined) {
        const cycleIds = path.slice(seenAt);
        const cutId = [...cycleIds].sort((a, b) => a.localeCompare(b))[0];
        if (cutId) parentById.set(cutId, null);
        break;
      }

      indexById.set(cursor, path.length);
      path.push(cursor);
      cursor = parentById.get(cursor) ?? null;
    }

    path.forEach((id) => checkedIds.add(id));
  }

  const folderNodes = new Map<string, LeitnerOutlineFolderNode>(
    folders.map((folder) => [folder.id, {
      type: "folder",
      id: folder.id,
      name: folder.name,
      children: [],
      cards: folderCards.get(folder.id) ?? [],
      cardCount: 0,
      dueCardCount: 0,
    }]),
  );
  const rootNodes: LeitnerOutlineNode[] = [];

  for (const folder of [...folders].sort(comparePositionAndName)) {
    const node = folderNodes.get(folder.id);
    if (!node) continue;
    const parentId = parentById.get(folder.id);
    const parent = parentId ? folderNodes.get(parentId) : undefined;
    if (parent) parent.children.push(node);
    else rootNodes.push(node);
  }

  for (const document of [...documents].sort((a, b) =>
    a.title.localeCompare(b.title) || a.id.localeCompare(b.id),
  )) {
    const documentCardList = documentCards.get(document.id);
    if (!documentCardList?.length) continue;

    const node: LeitnerOutlineDocumentNode = {
      type: "document",
      id: document.id,
      title: document.title,
      cards: documentCardList,
      cardCount: documentCardList.length,
      dueCardCount: documentCardList.reduce((count, card) => count + Number(dueCardIds.has(card.id)), 0),
    };
    const parent = document.folder_id ? folderNodes.get(document.folder_id) : undefined;
    if (parent) parent.children.push(node);
    else rootNodes.push(node);
  }

  const keepVisible = (node: LeitnerOutlineNode): boolean => {
    if (node.type === "document") return node.cards.length > 0;
    node.children = node.children.filter(keepVisible);
    node.cardCount = node.cards.length;
    node.dueCardCount = node.cards.reduce((count, card) => count + Number(dueCardIds.has(card.id)), 0);
    for (const child of node.children) {
      node.cardCount += child.cardCount;
      node.dueCardCount += child.dueCardCount;
    }
    return node.cardCount > 0;
  };

  return {
    nodes: rootNodes.filter(keepVisible),
    unfiledCards,
  };
}
