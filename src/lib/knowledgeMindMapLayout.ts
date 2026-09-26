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

export interface KnowledgeMindMapCanvasNode {
  id: string;
  parentId?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color?: string;
  type?: string;
}

export interface KnowledgeMindMapCanvasLink {
  id: string;
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: string;
  isDashed?: boolean;
}

export interface KnowledgeMindMapCanvasBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
}

export interface KnowledgeMindMapCanvasLayout<TNode extends KnowledgeMindMapCanvasNode> {
  nodes: TNode[];
  links: KnowledgeMindMapCanvasLink[];
  bounds: KnowledgeMindMapCanvasBounds;
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

// Canvas nodes reserve space for a leading icon and a trailing action menu;
// use a conservative text width so long bilingual lines do not overlap siblings.
const BODY_CHARACTERS_PER_LINE = 30;

/** Estimate an expanded canvas node size so wrapped titles are not clipped. */
export function getMindMapNodeDimensions(
  type: KnowledgeMindMapNodeKind,
  title: string,
  subtitle?: string,
  secondaryTitle?: string,
): MindMapNodeDimensions {
  const config = NODE_SIZE_CONFIG[type];
  const titleLines = Math.max(1, Math.ceil(Array.from(title.trim()).length / config.titleCharactersPerLine));
  const secondaryTitleLines = secondaryTitle
    ? Math.max(1, Math.ceil(Array.from(secondaryTitle.trim()).length / BODY_CHARACTERS_PER_LINE))
    : 0;
  const subtitleLines = subtitle
    ? Math.max(1, Math.ceil(Array.from(subtitle.trim()).length / BODY_CHARACTERS_PER_LINE))
    : 0;
  const contentHeight = 24 + titleLines * 16 + secondaryTitleLines * 12 + subtitleLines * 12;

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

/**
 * Lay out the visible knowledge tree top-to-bottom without changing node IDs,
 * hierarchy, or order. Child subtrees reserve their full width so long branches
 * do not collide with neighboring branches.
 */
export function layoutKnowledgeMindMapVertical<TNode extends KnowledgeMindMapCanvasNode>(
  sourceNodes: TNode[],
  direction: "ltr" | "rtl" = "ltr",
): KnowledgeMindMapCanvasLayout<TNode> {
  const nodeById = new Map<string, TNode>();
  for (const node of sourceNodes) {
    if (!nodeById.has(node.id)) nodeById.set(node.id, node);
  }

  const nodesInCanvasOrder = [...nodeById.values()].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
  const rawChildrenByParent = new Map<string, TNode[]>();
  const roots = nodesInCanvasOrder.filter(
    (node) => !node.parentId || !nodeById.has(node.parentId),
  );
  for (const node of nodesInCanvasOrder) {
    if (!node.parentId || !nodeById.has(node.parentId)) continue;
    const siblings = rawChildrenByParent.get(node.parentId) || [];
    siblings.push(node);
    rawChildrenByParent.set(node.parentId, siblings);
  }

  // Build a spanning forest. This keeps malformed cyclic legacy relationships
  // visible without allowing a cycle to recurse forever or produce a link loop.
  const childrenByParent = new Map<string, TNode[]>();
  const layoutParentById = new Map<string, string>();
  const assigned = new Set<string>();
  const includeSubtree = (node: TNode, path: Set<string>) => {
    if (assigned.has(node.id) || path.has(node.id)) return;
    assigned.add(node.id);
    const nextPath = new Set(path).add(node.id);
    const safeChildren: TNode[] = [];
    for (const child of rawChildrenByParent.get(node.id) || []) {
      if (assigned.has(child.id) || nextPath.has(child.id)) continue;
      safeChildren.push(child);
      layoutParentById.set(child.id, node.id);
      includeSubtree(child, nextPath);
    }
    childrenByParent.set(node.id, safeChildren);
  };

  for (const root of roots) includeSubtree(root, new Set());
  for (const node of nodesInCanvasOrder) {
    if (assigned.has(node.id)) continue;
    roots.push(node);
    includeSubtree(node, new Set());
  }

  if (nodeById.size === 0) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 },
    };
  }

  const horizontalGap = 72;
  const rootGap = 96;
  const rowGap = 84;
  const widthById = new Map<string, number>();
  const measureSubtree = (node: TNode): number => {
    const cached = widthById.get(node.id);
    if (cached !== undefined) return cached;
    const children = childrenByParent.get(node.id) || [];
    const childrenWidth = children.reduce(
      (total, child) => total + measureSubtree(child),
      Math.max(0, children.length - 1) * horizontalGap,
    );
    const width = Math.max(node.width, childrenWidth);
    widthById.set(node.id, width);
    return width;
  };
  roots.forEach(measureSubtree);

  const depthHeights = new Map<number, number>();
  const depthById = new Map<string, number>();
  const registerDepth = (node: TNode, depth: number) => {
    if (depthById.has(node.id)) return;
    depthById.set(node.id, depth);
    depthHeights.set(depth, Math.max(depthHeights.get(depth) || 0, node.height));
    for (const child of childrenByParent.get(node.id) || []) registerDepth(child, depth + 1);
  };
  roots.forEach((root) => registerDepth(root, 0));

  const yByDepth = new Map<number, number>();
  let nextY = 64;
  const maxDepth = Math.max(...depthHeights.keys());
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    yByDepth.set(depth, nextY);
    nextY += (depthHeights.get(depth) || 0) + rowGap;
  }

  const positionById = new Map<string, { x: number; y: number }>();
  const placeSubtree = (node: TNode, left: number, depth: number) => {
    const slotWidth = widthById.get(node.id) || node.width;
    positionById.set(node.id, {
      x: left + (slotWidth - node.width) / 2,
      y: yByDepth.get(depth) || 64,
    });

    const children = childrenByParent.get(node.id) || [];
    const childrenWidth = children.reduce(
      (total, child) => total + (widthById.get(child.id) || child.width),
      Math.max(0, children.length - 1) * horizontalGap,
    );
    let childLeft = left + (slotWidth - childrenWidth) / 2;
    for (const child of children) {
      const childWidth = widthById.get(child.id) || child.width;
      placeSubtree(child, childLeft, depth + 1);
      childLeft += childWidth + horizontalGap;
    }
  };

  let rootLeft = 64;
  for (const root of roots) {
    const rootWidth = widthById.get(root.id) || root.width;
    placeSubtree(root, rootLeft, 0);
    rootLeft += rootWidth + rootGap;
  }

  let placedNodes = nodesInCanvasOrder.map((node) => {
    const position = positionById.get(node.id);
    return position ? { ...node, ...position } : node;
  });
  if (direction === "rtl" && placedNodes.length > 0) {
    const minX = Math.min(...placedNodes.map((node) => node.x));
    const maxX = Math.max(...placedNodes.map((node) => node.x + node.width));
    placedNodes = placedNodes.map((node) => ({
      ...node,
      x: minX + maxX - node.x - node.width,
    }));
  }

  const placedById = new Map(placedNodes.map((node) => [node.id, node]));
  const links: KnowledgeMindMapCanvasLink[] = [];
  for (const [childId, parentId] of layoutParentById) {
    const child = placedById.get(childId);
    const parent = placedById.get(parentId);
    if (!child || !parent) continue;
    links.push({
      id: `link-${parent.id}-${child.id}`,
      sourceId: parent.id,
      targetId: child.id,
      startX: parent.x + parent.width / 2,
      startY: parent.y + parent.height,
      endX: child.x + child.width / 2,
      endY: child.y,
      color: child.color || "hsl(var(--primary))",
      isDashed: child.type === "card",
    });
  }

  const padding = 64;
  const minX = Math.min(...placedNodes.map((node) => node.x));
  const minY = Math.min(...placedNodes.map((node) => node.y));
  const maxX = Math.max(...placedNodes.map((node) => node.x + node.width));
  const maxY = Math.max(...placedNodes.map((node) => node.y + node.height));
  const boundsMinX = Math.min(0, minX - padding);
  const boundsMinY = Math.min(0, minY - padding);
  const boundsMaxX = maxX + padding;
  const boundsMaxY = maxY + padding;

  return {
    nodes: placedNodes,
    links,
    bounds: {
      minX: boundsMinX,
      minY: boundsMinY,
      maxX: boundsMaxX,
      maxY: boundsMaxY,
      width: boundsMaxX - boundsMinX,
      height: boundsMaxY - boundsMinY,
    },
  };
}
