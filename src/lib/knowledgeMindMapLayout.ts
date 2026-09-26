export type KnowledgeMindMapNodeKind = "root" | "folder" | "subfolder" | "doc" | "card";
export type KnowledgeMindMapNodeDensity = "detailed" | "compact";

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

export type KnowledgeMindMapCanvasLayoutMode = "horizontal" | "vertical" | "radial" | "matrix";
export type KnowledgeMindMapConnectorStyle =
  | "auto"
  | "smooth_bezier"
  | "orthogonal_step"
  | "straight"
  | "polar_radial";

/**
 * Map each visible node to the center of its hierarchy root. The visited set
 * keeps malformed legacy cycles safe and lets radial connectors remain stable.
 */
export function buildMindMapRootCenterByNodeId<TNode extends KnowledgeMindMapCanvasNode>(
  nodes: readonly TNode[],
): ReadonlyMap<string, { x: number; y: number }> {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const centers = new Map<string, { x: number; y: number }>();

  for (const node of nodes) {
    if (centers.has(node.id)) continue;
    let root = node;
    let inheritedCenter: { x: number; y: number } | undefined;
    const visited = new Set<string>();

    while (root.parentId && !visited.has(root.id)) {
      visited.add(root.id);
      const parent = nodeById.get(root.parentId);
      if (!parent) break;
      root = parent;
      const cachedCenter = centers.get(root.id);
      if (cachedCenter) {
        inheritedCenter = cachedCenter;
        break;
      }
    }

    const center = inheritedCenter ?? { x: root.x + root.width / 2, y: root.y + root.height / 2 };
    for (const id of visited) centers.set(id, center);
    centers.set(root.id, center);
    centers.set(node.id, center);
  }

  return centers;
}

/** Return the SVG path for a selected, real connector style. */
export function getKnowledgeMindMapConnectorPath(
  link: Pick<KnowledgeMindMapCanvasLink, "startX" | "startY" | "endX" | "endY">,
  layout: KnowledgeMindMapCanvasLayoutMode,
  style: KnowledgeMindMapConnectorStyle = "auto",
  rootCenter?: { x: number; y: number },
): string {
  const { startX, startY, endX, endY } = link;
  const straightPath = `M ${startX} ${startY} L ${endX} ${endY}`;

  if (style === "straight") return straightPath;

  if (style === "orthogonal_step") {
    if (layout === "vertical") {
      const middleY = (startY + endY) / 2;
      return `M ${startX} ${startY} L ${startX} ${middleY} L ${endX} ${middleY} L ${endX} ${endY}`;
    }
    const middleX = (startX + endX) / 2;
    return `M ${startX} ${startY} L ${middleX} ${startY} L ${middleX} ${endY} L ${endX} ${endY}`;
  }

  const usePolarCurve = style === "polar_radial" || (style === "smooth_bezier" && layout === "radial");
  if (usePolarCurve && rootCenter) {
    const startAngle = Math.atan2(startY - rootCenter.y, startX - rootCenter.x);
    const endAngle = Math.atan2(endY - rootCenter.y, endX - rootCenter.x);
    const startRadius = Math.hypot(startX - rootCenter.x, startY - rootCenter.y);
    const endRadius = Math.hypot(endX - rootCenter.x, endY - rootCenter.y);
    if (startRadius > 1 && endRadius > 1) {
      let angleDelta = endAngle - startAngle;
      while (angleDelta > Math.PI) angleDelta -= Math.PI * 2;
      while (angleDelta < -Math.PI) angleDelta += Math.PI * 2;
      const controlAngle = startAngle + angleDelta / 2;
      const controlRadius = Math.max(startRadius, endRadius) + Math.min(36, Math.abs(endRadius - startRadius) * 0.2 + 12);
      const controlX = rootCenter.x + Math.cos(controlAngle) * controlRadius;
      const controlY = rootCenter.y + Math.sin(controlAngle) * controlRadius;
      return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`;
    }
    return straightPath;
  }

  if (layout === "vertical") {
    const controlOffset = (endY - startY) / 2;
    return `M ${startX} ${startY} C ${startX} ${startY + controlOffset}, ${endX} ${endY - controlOffset}, ${endX} ${endY}`;
  }
  if (layout === "radial") return straightPath;

  const controlOffset = Math.max(30, Math.abs(endX - startX) * 0.5) * (endX >= startX ? 1 : -1);
  return `M ${startX} ${startY} C ${startX + controlOffset} ${startY}, ${endX - controlOffset} ${endY}, ${endX} ${endY}`;
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
  density: KnowledgeMindMapNodeDensity = "detailed",
): MindMapNodeDimensions {
  const config = NODE_SIZE_CONFIG[type];
  const titleLines = Math.max(1, Math.ceil(Array.from(title.trim()).length / config.titleCharactersPerLine));
  const secondaryTitleLines = secondaryTitle
    ? Math.max(1, Math.ceil(Array.from(secondaryTitle.trim()).length / BODY_CHARACTERS_PER_LINE))
    : 0;
  const subtitleLines = subtitle && density === "detailed"
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

interface KnowledgeMindMapCanvasForest<TNode extends KnowledgeMindMapCanvasNode> {
  nodesInCanvasOrder: TNode[];
  roots: TNode[];
  childrenByParent: Map<string, TNode[]>;
  layoutParentById: Map<string, string>;
}

function buildSafeKnowledgeMindMapCanvasForest<TNode extends KnowledgeMindMapCanvasNode>(
  sourceNodes: TNode[],
): KnowledgeMindMapCanvasForest<TNode> {
  const nodeById = new Map<string, TNode>();
  for (const node of sourceNodes) {
    if (!nodeById.has(node.id)) nodeById.set(node.id, node);
  }

  const nodesInCanvasOrder = [...nodeById.values()].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id),
  );
  const roots = nodesInCanvasOrder.filter(
    (node) => !node.parentId || !nodeById.has(node.parentId),
  );
  const rawChildrenByParent = new Map<string, TNode[]>();
  for (const node of nodesInCanvasOrder) {
    if (!node.parentId || !nodeById.has(node.parentId)) continue;
    const siblings = rawChildrenByParent.get(node.parentId) || [];
    siblings.push(node);
    rawChildrenByParent.set(node.parentId, siblings);
  }

  // Convert possibly malformed parent pointers into a spanning forest so
  // cycles and disconnected legacy nodes remain visible without recursion loops.
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

  return { nodesInCanvasOrder, roots, childrenByParent, layoutParentById };
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
  const { nodesInCanvasOrder, roots, childrenByParent, layoutParentById } =
    buildSafeKnowledgeMindMapCanvasForest(sourceNodes);
  if (nodesInCanvasOrder.length === 0) {
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

/**
 * Place each hierarchy depth in its own matrix column. A node occupies the
 * vertical span of its leaf descendants, which keeps sibling branches grouped
 * without changing IDs or parent relationships.
 */
export function layoutKnowledgeMindMapMatrix<TNode extends KnowledgeMindMapCanvasNode>(
  sourceNodes: TNode[],
  direction: "rtl" | "ltr" = "ltr",
): KnowledgeMindMapCanvasLayout<TNode> {
  const { nodesInCanvasOrder, roots, childrenByParent, layoutParentById } =
    buildSafeKnowledgeMindMapCanvasForest(sourceNodes);
  if (nodesInCanvasOrder.length === 0) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 },
    };
  }

  const traversal: Array<{ node: TNode; depth: number }> = [];
  const depthById = new Map<string, number>();
  const stack = roots.slice().reverse().map((node) => ({ node, depth: 0 }));
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (depthById.has(current.node.id)) continue;
    depthById.set(current.node.id, current.depth);
    traversal.push(current);
    const children = childrenByParent.get(current.node.id) || [];
    for (let index = children.length - 1; index >= 0; index -= 1) {
      stack.push({ node: children[index], depth: current.depth + 1 });
    }
  }

  const leafSlotsById = new Map<string, number>();
  const widthByDepth = new Map<number, number>();
  const maxNodeHeight = nodesInCanvasOrder.reduce((max, node) => Math.max(max, node.height), 0);
  for (const { node, depth } of traversal) {
    widthByDepth.set(depth, Math.max(widthByDepth.get(depth) || 0, node.width));
  }
  for (let index = traversal.length - 1; index >= 0; index -= 1) {
    const { node } = traversal[index];
    const children = childrenByParent.get(node.id) || [];
    const slots = children.length === 0
      ? 1
      : children.reduce((total, child) => total + (leafSlotsById.get(child.id) || 1), 0);
    leafSlotsById.set(node.id, slots);
  }

  const columnGap = 96;
  const rowGap = 48;
  const topPadding = 64;
  const rowStep = maxNodeHeight + rowGap;
  const maxDepth = Math.max(...depthById.values());
  const xByDepth = new Map<number, number>();
  let nextX = 64;
  for (let depth = 0; depth <= maxDepth; depth += 1) {
    xByDepth.set(depth, nextX);
    nextX += (widthByDepth.get(depth) || 0) + columnGap;
  }

  const startSlotByRoot = new Map<string, number>();
  let nextRootSlot = 0;
  for (const root of roots) {
    startSlotByRoot.set(root.id, nextRootSlot);
    nextRootSlot += (leafSlotsById.get(root.id) || 1) + 1;
  }

  const positionById = new Map<string, { x: number; y: number }>();
  const placementStack = roots.slice().reverse().map((node) => ({
    node,
    startSlot: startSlotByRoot.get(node.id) || 0,
  }));
  while (placementStack.length > 0) {
    const { node, startSlot } = placementStack.pop()!;
    const depth = depthById.get(node.id) || 0;
    const span = leafSlotsById.get(node.id) || 1;
    const centerSlot = startSlot + (span - 1) / 2;
    positionById.set(node.id, {
      x: (xByDepth.get(depth) || 64) + ((widthByDepth.get(depth) || node.width) - node.width) / 2,
      y: topPadding + centerSlot * rowStep + (maxNodeHeight - node.height) / 2,
    });

    const children = childrenByParent.get(node.id) || [];
    let childStartSlot = startSlot;
    const childPlacements = children.map((child) => {
      const placement = { node: child, startSlot: childStartSlot };
      childStartSlot += leafSlotsById.get(child.id) || 1;
      return placement;
    });
    for (let index = childPlacements.length - 1; index >= 0; index -= 1) {
      placementStack.push(childPlacements[index]);
    }
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
  const isRtl = direction === "rtl";
  for (const [childId, parentId] of layoutParentById) {
    const child = placedById.get(childId);
    const parent = placedById.get(parentId);
    if (!child || !parent) continue;
    links.push({
      id: `link-${parent.id}-${child.id}`,
      sourceId: parent.id,
      targetId: child.id,
      startX: isRtl ? parent.x : parent.x + parent.width,
      startY: parent.y + parent.height / 2,
      endX: isRtl ? child.x + child.width : child.x,
      endY: child.y + child.height / 2,
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

/**
 * Lay out each visible knowledge tree around its root. Ring radii account for
 * the narrowest angular separation and each node's full bounding diagonal, so
 * expanded branches remain readable instead of inheriting fixed Pharmacy radii.
 */
export function layoutKnowledgeMindMapRadial<TNode extends KnowledgeMindMapCanvasNode>(
  sourceNodes: TNode[],
  direction: "rtl" | "ltr" = "ltr",
): KnowledgeMindMapCanvasLayout<TNode> {
  const forest = buildSafeKnowledgeMindMapCanvasForest(sourceNodes);
  const { nodesInCanvasOrder, roots, childrenByParent, layoutParentById } = forest;
  if (nodesInCanvasOrder.length === 0) {
    return {
      nodes: [],
      links: [],
      bounds: { minX: 0, minY: 0, maxX: 800, maxY: 600, width: 800, height: 600 },
    };
  }

  const nodeById = new Map(nodesInCanvasOrder.map((node) => [node.id, node]));
  const subtreeWeightById = new Map<string, number>();
  const subtreeWeight = (node: TNode): number => {
    const cached = subtreeWeightById.get(node.id);
    if (cached !== undefined) return cached;
    const children = childrenByParent.get(node.id) || [];
    const weight = children.length
      ? children.reduce((sum, child) => sum + subtreeWeight(child), 0)
      : 1;
    subtreeWeightById.set(node.id, weight);
    return weight;
  };

  const angleById = new Map<string, number>();
  const depthById = new Map<string, number>();
  const idsByComponent = new Map<string, string[]>();
  const assignChildSectors = (
    node: TNode,
    depth: number,
    sectorStart: number,
    sectorEnd: number,
    componentIds: string[],
  ) => {
    depthById.set(node.id, depth);
    componentIds.push(node.id);
    const children = childrenByParent.get(node.id) || [];
    if (children.length === 0) return;

    const totalWeight = children.reduce((sum, child) => sum + subtreeWeight(child), 0);
    const sectorSpan = sectorEnd - sectorStart;
    let cursor = sectorStart;
    for (const child of children) {
      const childSpan = sectorSpan * subtreeWeight(child) / totalWeight;
      const childEnd = cursor + childSpan;
      angleById.set(child.id, (cursor + childEnd) / 2);
      assignChildSectors(child, depth + 1, cursor, childEnd, componentIds);
      cursor = childEnd;
    }
  };

  for (const root of roots) {
    const componentIds: string[] = [];
    depthById.set(root.id, 0);
    componentIds.push(root.id);
    const rootChildren = childrenByParent.get(root.id) || [];
    if (rootChildren.length > 0) {
      const totalWeight = rootChildren.reduce((sum, child) => sum + subtreeWeight(child), 0);
      const fullCircleStart = -Math.PI * 1.5;
      const fullCircleSpan = Math.PI * 2;
      let cursor = fullCircleStart;
      for (const child of rootChildren) {
        const childEnd = cursor + fullCircleSpan * subtreeWeight(child) / totalWeight;
        angleById.set(child.id, (cursor + childEnd) / 2);
        assignChildSectors(child, 1, cursor, childEnd, componentIds);
        cursor = childEnd;
      }
    }
    idsByComponent.set(root.id, componentIds);
  }

  const positionById = new Map<string, { x: number; y: number }>();
  const componentGap = 180;
  let packedComponentStartX = 0;

  for (const root of roots) {
    const componentIds = idsByComponent.get(root.id) || [root.id];
    const nodesByDepth = new Map<number, TNode[]>();
    const anglesByDepth = new Map<number, number[]>();
    for (const id of componentIds) {
      const node = nodeById.get(id);
      const depth = depthById.get(id);
      if (!node || depth === undefined) continue;
      const depthNodes = nodesByDepth.get(depth) || [];
      depthNodes.push(node);
      nodesByDepth.set(depth, depthNodes);
      const angle = angleById.get(id);
      if (angle !== undefined) {
        const depthAngles = anglesByDepth.get(depth) || [];
        depthAngles.push(angle);
        anglesByDepth.set(depth, depthAngles);
      }
    }

    const maxDepth = Math.max(...nodesByDepth.keys());
    const maxHalfDiagonalByDepth = new Map<number, number>();
    for (const [depth, depthNodes] of nodesByDepth) {
      maxHalfDiagonalByDepth.set(depth, Math.max(...depthNodes.map((node) =>
        Math.hypot(node.width, node.height) / 2,
      )));
    }

    const radiusByDepth = new Map<number, number>([[0, 0]]);
    const ringGap = 96;
    const tangentialGap = 64;
    for (let depth = 1; depth <= maxDepth; depth += 1) {
      const depthNodes = nodesByDepth.get(depth) || [];
      const depthAngles = anglesByDepth.get(depth) || [];
      const currentHalfDiagonal = maxHalfDiagonalByDepth.get(depth) || 0;
      const previousHalfDiagonal = maxHalfDiagonalByDepth.get(depth - 1) || 0;
      const previousRadius = radiusByDepth.get(depth - 1) || 0;
      const radialMinimum = previousRadius + previousHalfDiagonal + currentHalfDiagonal + ringGap;

      let tangentialMinimum = 0;
      if (depthAngles.length > 1) {
        const fullCircle = Math.PI * 2;
        const sortedAngles = depthAngles
          .map((angle) => (angle % fullCircle + fullCircle) % fullCircle)
          .sort((a, b) => a - b);
        let smallestGap = fullCircle;
        for (let index = 0; index < sortedAngles.length; index += 1) {
          const next = sortedAngles[(index + 1) % sortedAngles.length];
          const gap = (next - sortedAngles[index] + fullCircle) % fullCircle;
          smallestGap = Math.min(smallestGap, gap);
        }
        const chordFactor = Math.max(0.001, 2 * Math.sin(smallestGap / 2));
        tangentialMinimum = (2 * currentHalfDiagonal + tangentialGap) / chordFactor;
      }

      radiusByDepth.set(depth, Math.max(radialMinimum, tangentialMinimum));
    }

    const localPositions = new Map<string, { x: number; y: number }>();
    for (const id of componentIds) {
      const node = nodeById.get(id);
      const depth = depthById.get(id);
      if (!node || depth === undefined) continue;
      if (depth === 0) {
        localPositions.set(id, { x: -node.width / 2, y: -node.height / 2 });
        continue;
      }
      const angle = angleById.get(id) ?? 0;
      const radius = radiusByDepth.get(depth) ?? 0;
      const directionSign = direction === "rtl" ? -1 : 1;
      localPositions.set(id, {
        x: radius * Math.cos(angle) * directionSign - node.width / 2,
        y: radius * Math.sin(angle) - node.height / 2,
      });
    }

    const componentPositions = [...localPositions.entries()];
    const minX = Math.min(...componentPositions.map(([, position]) => position.x));
    const maxX = Math.max(...componentPositions.map(([id, position]) => position.x + (nodeById.get(id)?.width || 0)));
    const shiftX = roots.length > 1 ? packedComponentStartX - minX : 0;
    for (const [id, position] of componentPositions) {
      positionById.set(id, { x: position.x + shiftX, y: position.y });
    }
    if (roots.length > 1) packedComponentStartX += maxX - minX + componentGap;
  }

  const nodes = nodesInCanvasOrder.map((node) => {
    const position = positionById.get(node.id);
    return position ? { ...node, ...position } : node;
  });
  const placedById = new Map(nodes.map((node) => [node.id, node]));
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
      startY: parent.y + parent.height / 2,
      endX: child.x + child.width / 2,
      endY: child.y + child.height / 2,
      color: child.color || "hsl(var(--primary))",
      isDashed: child.type === "card",
    });
  }

  const padding = 64;
  const contentMinX = Math.min(...nodes.map((node) => node.x));
  const contentMinY = Math.min(...nodes.map((node) => node.y));
  const contentMaxX = Math.max(...nodes.map((node) => node.x + node.width));
  const contentMaxY = Math.max(...nodes.map((node) => node.y + node.height));
  const centerX = (contentMinX + contentMaxX) / 2;
  const centerY = (contentMinY + contentMaxY) / 2;
  const width = Math.max(800, contentMaxX - contentMinX + padding * 2);
  const height = Math.max(600, contentMaxY - contentMinY + padding * 2);

  return {
    nodes,
    links,
    bounds: {
      minX: centerX - width / 2,
      minY: centerY - height / 2,
      maxX: centerX + width / 2,
      maxY: centerY + height / 2,
      width,
      height,
    },
  };
}
