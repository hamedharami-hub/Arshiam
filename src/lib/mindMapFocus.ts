/** Pure helpers for mind-map focus mode and progressive (step-by-step) branch reveal. */

export type LinkLike = { sourceId: string; targetId: string };

/** Focused node + all its ancestors + all its descendants. */
export function focusSet(focusId: string | null, links: LinkLike[]): Set<string> | null {
  if (!focusId) return null;
  const parent = new Map<string, string>();
  const kids = new Map<string, string[]>();
  for (const l of links) {
    parent.set(l.targetId, l.sourceId);
    kids.set(l.sourceId, [...(kids.get(l.sourceId) || []), l.targetId]);
  }
  const out = new Set<string>([focusId]);
  for (let p = parent.get(focusId); p && !out.has(p); p = parent.get(p)) out.add(p);
  const stack = [...(kids.get(focusId) || [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    stack.push(...(kids.get(id) || []));
  }
  return out;
}

/**
 * Next node whose next hidden child should be revealed (depth-first: the most
 * recently reached node with hidden children wins). `order` is the layout visit order.
 */
export function nextRevealTarget(
  order: string[],
  totals: Record<string, number>,
  revealed: Record<string, number>,
  isExpanded: (id: string) => boolean,
): string | null {
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i];
    if (isExpanded(id) && (revealed[id] ?? 0) < (totals[id] ?? 0)) return id;
  }
  return null;
}

export function revealProgress(order: string[], totals: Record<string, number>, revealed: Record<string, number>) {
  let shown = 0;
  let total = 0;
  for (const id of order) {
    total += totals[id] ?? 0;
    shown += Math.min(revealed[id] ?? 0, totals[id] ?? 0);
  }
  return { shown, total };
}
