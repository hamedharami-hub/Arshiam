import { useEffect, useMemo, useState } from "react";
import { isLinkableNote, type LinkableNote } from "@/lib/noteLinks";
import { NoteLinkIndex } from "@/lib/noteLinkIndex";

/** The caller supplies its existing reconciled subscription, never editor drafts. */
export function useNoteLinks(ownerId: string, acceptedNotes: readonly LinkableNote[]) {
  const notes = useMemo(() => acceptedNotes.filter(note => isLinkableNote(note, ownerId)), [ownerId, acceptedNotes]);
  const index = useMemo(() => new NoteLinkIndex(ownerId), [ownerId]);
  const [done, setDone] = useState<readonly LinkableNote[] | null>(null);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    index.retain(new Set(notes.map(note => note.id)));
    let cursor = 0;
    const process = () => {
      if (cancelled) return;
      const start = performance.now();
      while (cursor < notes.length && performance.now() - start < 8) index.update(notes[cursor++]);
      if (cursor < notes.length) timer = setTimeout(process, 0);
      else { setDone(notes); setRevision(value => value + 1); }
    };
    timer = setTimeout(process, 0);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [index, notes]);
  return { notes, index, indexing: done !== notes, revision };
}
