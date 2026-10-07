export type NoteActionItemSuggestion = {
  title: string;
  description: string;
};

/** Build a single editable task suggestion from the text the user selected. */
export function suggestNoteActionItem(selectedText: string): NoteActionItemSuggestion | null {
  const lines = selectedText.replace(/\r\n?/g, "\n").split("\n");
  const firstIndex = lines.findIndex((line) => line.trim().length > 0);
  if (firstIndex < 0) return null;

  const rawTitle = lines[firstIndex].trim();
  const title = rawTitle
    .replace(/^\s{0,3}#{1,6}\s+/, "")
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s*)?\[[ xX]\]\s*/, "")
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+|>\s*)/, "")
    .replace(/(?:\*\*|__|~~|`)/g, "")
    .trim()
    .slice(0, 200);
  if (!title) return null;

  const remainder = lines.filter((_line, index) => index !== firstIndex).join("\n").trim();
  return { title, description: remainder.slice(0, 2000) };
}
