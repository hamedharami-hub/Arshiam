/** Pure list operations shared by the production notes view and performance QA. */
export interface ListNote {
  title?: string;
  content?: string;
  kind?: string;
  folder_id?: string | null;
  tag_ids?: string[];
}
export function filterNotesForList<T extends ListNote>(notes: T[], search: string, folder: string | null, tag: string | null): T[] {
  const query = search.toLowerCase();
  return notes.filter(note => {
    if (note.kind === "diary") return false;
    if (query && !(note.title || "").toLowerCase().includes(query) && !(note.content || "").toLowerCase().includes(query)) return false;
    if (folder === "__none__" ? !!note.folder_id : !!folder && note.folder_id !== folder) return false;
    return !tag || !!note.tag_ids?.includes(tag);
  });
}
export function noteListPreview(source: string): string {
  return (source || "")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/\\([\\`*_{}\[\]()#+\-.!>~|])/g, "$1")
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]\s\[[ xX]\]|[-*+]|\d+\.)\s+/gm, "")
    .replace(/(\*\*|__|~~|`)/g, "")
    .replace(/\s+/g, " ").trim().slice(0, 120);
}
