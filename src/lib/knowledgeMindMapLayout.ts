export type KnowledgeMindMapNodeKind = "root" | "folder" | "subfolder" | "doc" | "card";

export interface MindMapNodeDimensions {
  width: number;
  height: number;
}

interface PositionedOutlineNode {
  id: string;
  parentId?: string;
  y: number;
}

export interface MindMapOutlineEntry<TNode> {
  node: TNode;
  children: MindMapOutlineEntry<TNode>[];
}

const NODE_SIZE_CONFIG: Record<KnowledgeMindMapNodeKind, {
  width: number;
  minimumHeight: number;
  titleCharactersPerLine: number;
}> = {
  root: { width: 272, minimumHeight: 58, titleCharactersPerLine: 25 },
  folder: { width: 272, minimumHeight: 54, titleCharactersPerLine: 25 },
  subfolder: { width: 272, minimumHeight: 54, titleCharactersPerLine: 25 },
  doc: { width: 284, minimumHeight: 58, titleCharactersPerLine: 27 },
  card: { width: 272, minimumHeight: 50, titleCharactersPerLine: 25 },
};

/** Estimate an expanded canvas node size so wrapped titles are not clipped. */
export function getMindMapNodeDimensions(
  type: KnowledgeMindMapNodeKind,
  title: string,
  subtitle?: string,
): MindMapNodeDimensions {
  const config = NODE_SIZE_CONFIG[type];
  const titleLines = Math.max(1, Math.ceil(Array.from(title.trim()).length / config.titleCharactersPerLine));
  const subtitleLines = subtitle
    ? Math.max(1, Math.ceil(Array.from(subtitle.trim()).length / 38))
    : 0;
  const contentHeight = 24 + titleLines * 16 + subtitleLines * 12;

  return {
    width: config.width,
    height: Math.max(config.minimumHeight, contentHeight),
  };
}

/**
 * Rebuild the visible, already-expanded canvas nodes as an ordered outline.
 * Missing-parent and cyclic legacy nodes stay discoverable as extra roots.
 */
export function buildMindMapOutline<TNode extends PositionedOutlineNode>(
  nodes: TNode[],
): MindMapOutlineEntry<TNode>[] {
  const nodeById = new Map<string, TNode>();
  const childrenByParent = new Map<string, TNode[]>();

  for (const node of nodes) {
    if (!nodeById.has(node.id)) nodeById.set(node.id, node);
  }

  for (const node of nodeById.values()) {
    if (!node.parentId || !nodeById.has(node.parentId)) continue;
    const siblings = childrenByParent.get(node.parentId) || [];
    siblings.push(node);
    childrenByParent.set(node.parentId, siblings);
  }

  const compareByCanvasOrder = (a: TNode, b: TNode) => a.y - b.y || a.id.localeCompare(b.id);
  for (const siblings of childrenByParent.values()) siblings.sort(compareByCanvasOrder);

  const visited = new Set<string>();
  const buildEntry = (node: TNode): MindMapOutlineEntry<TNode> | null => {
    if (visited.has(node.id)) return null;
    visited.add(node.id);
    return {
      node,
      children: (childrenByParent.get(node.id) || [])
        .map(buildEntry)
        .filter((entry): entry is MindMapOutlineEntry<TNode> => Boolean(entry)),
    };
  };

  const roots = [...nodeById.values()]
    .filter((node) => !node.parentId || !nodeById.has(node.parentId))
    .sort(compareByCanvasOrder);
  const outline = roots.map(buildEntry).filter((entry): entry is MindMapOutlineEntry<TNode> => Boolean(entry));

  for (const node of [...nodeById.values()].sort(compareByCanvasOrder)) {
    if (!visited.has(node.id)) {
      const orphanedTree = buildEntry(node);
      if (orphanedTree) outline.push(orphanedTree);
    }
  }

  return outline;
}
