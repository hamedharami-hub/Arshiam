export const KNOWLEDGE_MIND_MAP_COLORS = [
  "default",
  "violet",
  "blue",
  "emerald",
  "amber",
  "rose",
] as const;

export const KNOWLEDGE_MIND_MAP_SHAPES = ["rounded", "soft-square", "square"] as const;

export type KnowledgeMindMapColor = (typeof KNOWLEDGE_MIND_MAP_COLORS)[number];
export type KnowledgeMindMapShape = (typeof KNOWLEDGE_MIND_MAP_SHAPES)[number];

export interface KnowledgeMindMapNodeStyle {
  color: KnowledgeMindMapColor;
  shape: KnowledgeMindMapShape;
}

export type KnowledgeMindMapNodeStyles = Readonly<Record<string, KnowledgeMindMapNodeStyle>>;

const DEFAULT_STYLE: KnowledgeMindMapNodeStyle = {
  color: "default",
  shape: "rounded",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isColor(value: unknown): value is KnowledgeMindMapColor {
  return typeof value === "string" && KNOWLEDGE_MIND_MAP_COLORS.includes(value as KnowledgeMindMapColor);
}

function isShape(value: unknown): value is KnowledgeMindMapShape {
  return typeof value === "string" && KNOWLEDGE_MIND_MAP_SHAPES.includes(value as KnowledgeMindMapShape);
}

function storageKey(userId: string): string {
  return `arshnaz.knowledge-mindmap-node-styles.v1:${encodeURIComponent(userId)}`;
}

/** Loads validated, device-local presentation preferences without trusting stored JSON. */
export function loadKnowledgeMindMapNodeStyles(userId: string): Record<string, KnowledgeMindMapNodeStyle> {
  if (!userId || typeof localStorage === "undefined") return Object.create(null);

  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return Object.create(null);
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) return Object.create(null);

    const styles: Record<string, KnowledgeMindMapNodeStyle> = Object.create(null);
    for (const [nodeId, value] of Object.entries(parsed)) {
      if (!nodeId || !isRecord(value)) continue;
      const color = isColor(value.color) ? value.color : DEFAULT_STYLE.color;
      const shape = isShape(value.shape) ? value.shape : DEFAULT_STYLE.shape;
      if (color !== DEFAULT_STYLE.color || shape !== DEFAULT_STYLE.shape) {
        styles[nodeId] = { color, shape };
      }
    }
    return styles;
  } catch {
    return Object.create(null);
  }
}

/** Saves presentation-only settings on this device; it never writes lesson or folder data. */
export function saveKnowledgeMindMapNodeStyles(
  userId: string,
  nodeStyles: KnowledgeMindMapNodeStyles,
): boolean {
  if (!userId || typeof localStorage === "undefined") return false;

  try {
    const validated: Record<string, KnowledgeMindMapNodeStyle> = Object.create(null);
    for (const [nodeId, value] of Object.entries(nodeStyles)) {
      if (!nodeId || !value) continue;
      const color = isColor(value.color) ? value.color : DEFAULT_STYLE.color;
      const shape = isShape(value.shape) ? value.shape : DEFAULT_STYLE.shape;
      if (color !== DEFAULT_STYLE.color || shape !== DEFAULT_STYLE.shape) {
        validated[nodeId] = { color, shape };
      }
    }

    const key = storageKey(userId);
    if (Object.keys(validated).length === 0) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(validated));
    return true;
  } catch {
    return false;
  }
}
