import { extractNoteLinks, type LinkableNote, type NoteLinkOccurrence } from "./noteLinks";

export type NoteBacklink = { sourceId: string; occurrences: NoteLinkOccurrence[] };

/** Reusable per-account cache. Content is parsed only when that source changes. */
export class NoteLinkIndex {
  constructor(readonly ownerId = "") {}
  private sources = new Map<string, { content: string; links: NoteLinkOccurrence[] }>();
  private incoming = new Map<string, Map<string, NoteLinkOccurrence[]>>();

  remove(sourceId: string) {
    const old = this.sources.get(sourceId);
    for (const link of old?.links || []) {
      const entries = this.incoming.get(link.targetId);
      entries?.delete(sourceId);
      if (!entries?.size) this.incoming.delete(link.targetId);
    }
    this.sources.delete(sourceId);
  }

  retain(ids: ReadonlySet<string>) {
    for (const id of this.sources.keys()) if (!ids.has(id)) this.remove(id);
  }

  update(note: LinkableNote) {
    if (this.sources.get(note.id)?.content === note.content) return;
    const links = extractNoteLinks(note.content);
    this.remove(note.id);
    this.sources.set(note.id, { content: note.content, links });
    for (const link of links) {
      if (link.targetId === note.id) continue;
      const entries = this.incoming.get(link.targetId) || new Map<string, NoteLinkOccurrence[]>();
      const occurrences = entries.get(note.id) || [];
      occurrences.push(link);
      entries.set(note.id, occurrences);
      this.incoming.set(link.targetId, entries);
    }
  }

  backlinks(targetId: string): NoteBacklink[] {
    return Array.from(this.incoming.get(targetId) || [], ([sourceId, occurrences]) => ({ sourceId, occurrences }));
  }
}
