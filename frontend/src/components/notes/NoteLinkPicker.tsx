import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { isLinkableNote, normalizeNoteSearch, type LinkableNote, type NoteLinkScope } from "@/lib/noteLinks";
import { noteListPreview } from "@/lib/notesList";

export function NoteLinkPicker({ scope, sourceId, onPick, onClose }: {
  scope: NoteLinkScope; sourceId?: string; onPick: (note: LinkableNote) => void; onClose: () => void;
}) {
  const { T, isEn } = useBilingual();
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [active, setActive] = useState(0);
  const [limit, setLimit] = useState(30);
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(normalizeNoteSearch(query)); setActive(0); setLimit(30); }, 120);
    return () => clearTimeout(timer);
  }, [query]);
  const candidates = useMemo(() => scope.notes.filter(note => note.id !== sourceId && isLinkableNote(note, scope.ownerId))
    .map(note => ({ note, search: normalizeNoteSearch(`${note.title} ${scope.folders?.get(note.folder_id || "")?.name || ""}`) })), [scope.notes, scope.ownerId, scope.folders, sourceId]);
  const results = useMemo(() => candidates.filter(item => !search || item.search.includes(search)).map(item => item.note), [candidates, search]);
  const shown = results.slice(0, limit);
  return <Dialog open onOpenChange={open => { if (!open) onClose(); }}>
    <DialogContent dir={isEn ? "ltr" : "rtl"} className="w-[calc(100%-2rem)] max-w-lg max-h-[80dvh] overflow-y-auto" onCloseAutoFocus={event => event.preventDefault()}>
      <DialogHeader><DialogTitle>{T("پیوند به یادداشت", "Link to note")}</DialogTitle>
        <DialogDescription>{T("یادداشت مقصد را انتخاب کن. عنوان‌های یکسان با پوشه مشخص می‌شوند.", "Choose a destination. Folders distinguish notes with the same title.")}</DialogDescription></DialogHeader>
      <Input autoFocus role="combobox" aria-expanded="true" aria-controls="note-link-results" aria-activedescendant={shown[active] ? `note-link-option-${active}` : undefined}
        aria-label={T("جست‌وجوی یادداشت مقصد", "Search destination notes")} value={query} onChange={event => setQuery(event.target.value)}
        onKeyDown={event => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault(); const next = Math.max(0, Math.min(shown.length - 1, active + (event.key === "ArrowDown" ? 1 : -1)));
            setActive(next); document.getElementById(`note-link-option-${next}`)?.scrollIntoView?.({ block: "nearest" });
          }
          if (event.key === "Enter" && shown[active]) { event.preventDefault(); onPick(shown[active]); }
        }} />
      <p className="text-xs text-muted-foreground" role="status">{scope.status === "loading" ? T("در حال بارگذاری…", "Loading…") : scope.status === "cache" ? T("یادداشت‌های موجود روی این دستگاه", "Notes available on this device") : T("یادداشت‌های این حساب", "Notes in this account")}</p>
      <div id="note-link-results" role="listbox" aria-label={T("یادداشت‌ها", "Notes")} className="space-y-1">
        {shown.map((note, i) => <button key={note.id} id={`note-link-option-${i}`} type="button" role="option" aria-selected={i === active}
          className={`block w-full min-h-11 rounded p-2 text-start ${i === active ? "bg-accent" : "hover:bg-muted"}`} onClick={() => onPick(note)}>
          <bdi className="block truncate font-medium">{note.title || T("بدون عنوان", "Untitled")}</bdi>
          <span className="block text-xs text-muted-foreground">{scope.folders?.get(note.folder_id || "")?.name || T("بدون پوشه", "No folder")}</span>
          <span className="block truncate text-xs text-muted-foreground">{noteListPreview(note.content.slice(0, 600))}</span>
        </button>)}
      </div>
      {!shown.length && <p>{T("یادداشتی پیدا نشد", "No notes found")}</p>}
      {results.length > limit && <Button variant="ghost" onClick={() => setLimit(value => value + 30)}>{T("نمایش بیشتر", "Show more")}</Button>}
      <Button variant="outline" onClick={onClose}>{T("لغو", "Cancel")}</Button>
    </DialogContent>
  </Dialog>;
}
