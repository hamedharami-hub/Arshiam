import { useState } from "react";
import { useBilingual } from "@/hooks/useBilingual";
import type { NoteLinkScope } from "@/lib/noteLinks";
import type { NoteBacklink } from "@/lib/noteLinkIndex";
import { Button } from "@/components/ui/button";

export function NoteBacklinks({ targetId, scope, entries, indexing }: {
  targetId: string; scope: NoteLinkScope; entries: NoteBacklink[]; indexing: boolean;
}) {
  const { T } = useBilingual();
  const [limit, setLimit] = useState(10);
  const notes = new Map(scope.notes.map(note => [note.id, note]));
  const rows = entries.filter(row => notes.has(row.sourceId)).sort((a, b) =>
    (notes.get(b.sourceId)?.updated_at || "").localeCompare(notes.get(a.sourceId)?.updated_at || "") || a.sourceId.localeCompare(b.sourceId));
  return <details className="mt-6 border-t pt-3" data-testid="note-backlinks">
    <summary className="min-h-11 cursor-pointer text-sm font-medium">{T("ارجاع‌ها به این یادداشت", "Backlinks to this note")} {!indexing && `(${rows.length})`}</summary>
    <p role="status" className="text-xs text-muted-foreground mb-2">{indexing || scope.status === "loading" ? T("در حال بررسی ارجاع‌ها…", "Checking backlinks…") : scope.status === "cache" ? T("فقط یادداشت‌های موجود روی این دستگاه بررسی شده‌اند", "Only notes available on this device are included") : T("ارجاع‌های یادداشت‌های این حساب", "References from this account's notes")}</p>
    {!indexing && !rows.length && <p className="text-sm text-muted-foreground">{T("هنوز ارجاعی نیست", "No backlinks yet")}</p>}
    {!indexing && rows.slice(0, limit).map(row => <button key={row.sourceId} type="button" className="block w-full min-h-11 text-start rounded p-2 hover:bg-muted" onClick={() => scope.onOpen(row.sourceId, targetId)}>
      <bdi className="block font-medium break-words">{notes.get(row.sourceId)?.title || T("بدون عنوان", "Untitled")}</bdi>
      <span className="block text-xs text-muted-foreground break-words">{row.occurrences[0]?.snippet}</span>
      {row.occurrences.length > 1 && <span className="text-xs">{row.occurrences.length} {T("ارجاع در این یادداشت", "references in this note")}</span>}
    </button>)}
    {!indexing && rows.length > limit && <Button variant="ghost" onClick={() => setLimit(value => value + 10)}>{T("نمایش بیشتر", "Show more")}</Button>}
  </details>;
}
