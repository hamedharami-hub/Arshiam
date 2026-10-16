import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { isLinkableNote, noteLinkUrl, type NoteLinkScope } from "@/lib/noteLinks";
import { noteListPreview } from "@/lib/notesList";

export function NoteLinkPreview({ id, scope, children }: { id: string; scope: NoteLinkScope; children: ReactNode }) {
  const { T, isEn } = useBilingual();
  const note = scope.notes.find(item => item.id === id && isLinkableNote(item, scope.ownerId));
  const unavailable = scope.status === "synced" ? T("یادداشت در دسترس نیست", "Note unavailable") : T("یادداشت در این دستگاه در دسترس نیست", "Note unavailable on this device");
  return <span className="inline-flex max-w-full items-baseline gap-1" data-note-link-target={id}>
    {note ? <a href={noteLinkUrl(id)} onClick={event => { event.preventDefault(); scope.onOpen(id); }} className="text-primary underline break-words"><bdi>{children}</bdi></a>
      : <span aria-disabled="true" title={unavailable} className="text-muted-foreground underline decoration-dotted"><bdi>{children}</bdi> ({unavailable})</span>}
    {note && <Popover><PopoverTrigger asChild><button type="button" className="rounded px-1 text-xs text-muted-foreground hover:bg-muted focus-visible:ring-2" aria-label={T(`پیش‌نمایش ${note.title}`, `Preview ${note.title}`)}>ⓘ</button></PopoverTrigger>
      <PopoverContent dir={isEn ? "ltr" : "rtl"} className="w-72 max-w-[calc(100vw-2rem)] space-y-2">
        <bdi className="block break-words font-medium">{note.title || T("بدون عنوان", "Untitled")}</bdi>
        <p className="text-xs text-muted-foreground">{scope.folders?.get(note.folder_id || "")?.name || T("بدون پوشه", "No folder")}</p>
        <p className="text-sm break-words">{noteListPreview(note.content.slice(0, 1200))}</p>
        <Button className="min-h-11" onClick={() => scope.onOpen(id)}>{T("بازکردن یادداشت", "Open note")}</Button>
      </PopoverContent></Popover>}
  </span>;
}
