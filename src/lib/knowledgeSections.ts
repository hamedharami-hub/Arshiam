export type KnowledgeSection = { id: string; title: string; html: string };
/** Slice presentation only. Range clones preserve nested wrappers, links, IDs and scientific text. */
export function splitKnowledgeSections(safeHtml: string): { introduction: string; sections: KnowledgeSection[] } {
  const root = document.createElement("div"); root.innerHTML = safeHtml;
  let headings = [...root.querySelectorAll("h2")];
  if (headings.length < 2) headings = [...root.querySelectorAll("h3")];
  // Headings inside tables and quotations are content, not navigation boundaries.
  headings = headings.filter(heading => !heading.closest("table, blockquote, pre"));
  if (headings.length < 2) return { introduction: "", sections: [] };
  const slice = (start: Element | null, end: Element | null) => {
    const range = document.createRange();
    if (start) range.setStartBefore(start); else range.setStart(root, 0);
    if (end) range.setEndBefore(end); else range.setEnd(root, root.childNodes.length);
    const container = document.createElement("div"); container.append(range.cloneContents());
    return container.innerHTML;
  };
  return {
    introduction: slice(null, headings[0]),
    sections: headings.map((heading, index) => ({ id: `section-${index}`, title: heading.textContent?.trim() || `${index + 1}`, html: slice(heading, headings[index + 1] ?? null) })),
  };
}
