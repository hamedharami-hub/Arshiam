import { useEffect, useMemo, useState } from "react";
import { Camera, Download, Images, Share2, Trash2, TrendingUp, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useBilingual } from "@/hooks/useBilingual";
import { toPersianDigits } from "@/lib/jalali";
import { ALBUM_EVENT, listAlbum, removeFromAlbum, type AlbumEntry } from "@/lib/islandAlbum";
import { downloadBlob, shareBlob } from "@/lib/islandSnapshot";

type Shown = AlbumEntry & { thumbUrl: string };

export function IslandAlbum({ onCapture, capturing }: { onCapture: () => void; capturing: boolean }) {
  const { T, isEn } = useBilingual();
  const [entries, setEntries] = useState<Shown[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [fullUrl, setFullUrl] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    let urls: string[] = [];
    const load = async () => {
      const rows = await listAlbum().catch(() => []);
      if (!alive) return;
      urls.forEach((u) => URL.revokeObjectURL(u));
      const shown = rows.map((r) => ({ ...r, thumbUrl: URL.createObjectURL(r.thumb) }));
      urls = shown.map((r) => r.thumbUrl);
      setEntries(shown);
    };
    void load();
    window.addEventListener(ALBUM_EVENT, load);
    return () => { alive = false; window.removeEventListener(ALBUM_EVENT, load); urls.forEach((u) => URL.revokeObjectURL(u)); };
  }, []);

  const open = entries?.find((e) => e.id === openId) || null;
  const openIndex = open && entries ? entries.indexOf(open) : -1;
  useEffect(() => {
    if (!open) { setFullUrl(null); return; }
    const u = URL.createObjectURL(open.image);
    setFullUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [open]);

  const num = (n: number) => (isEn ? String(n) : toPersianDigits(n));
  const dateOf = (iso: string) => new Date(iso).toLocaleDateString(isEn ? "en-AU" : "fa-IR-u-ca-persian", { year: "numeric", month: "short", day: "numeric" });
  const growth = useMemo(() => {
    if (!entries || entries.length < 2) return null;
    return entries[entries.length - 1].buildings - entries[0].buildings;
  }, [entries]);
  const fileName = (e: AlbumEntry) => `arshnaz-island-${e.createdAt.slice(0, 10)}.png`;

  const handleDelete = async (e: AlbumEntry) => {
    await removeFromAlbum(e.id);
    setOpenId(null);
    toast.success(T("عکس از آلبوم حذف شد", "Snapshot removed from album"));
  };
  const handleShare = async (e: AlbumEntry) => {
    const ok = await shareBlob(e.image, fileName(e), T("جزیرهٔ من", "My Island"));
    if (!ok) downloadBlob(e.image, fileName(e));
  };

  return (
    <section className="rounded-3xl border bg-card p-4 md:p-5" data-testid="island-album" aria-label={T("آلبوم جزیره", "Island album")}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold"><Images className="size-5 text-primary" />{T("آلبوم جزیره", "Island album")}</h2>
          <p className="text-sm text-muted-foreground">
            {entries?.length
              ? T(`${num(entries.length)} عکس یادگاری${growth ? ` · ${growth > 0 ? "+" : ""}${num(growth)} سازه از اولین عکس` : ""}`, `${entries.length} ${entries.length === 1 ? "snapshot" : "snapshots"}${growth ? ` · ${growth > 0 ? "+" : ""}${growth} buildings since the first` : ""}`)
              : T("رشد جزیره‌تان را با عکس‌های یادگاری ثبت کنید.", "Capture snapshots to watch your island grow.")}
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={onCapture} disabled={capturing} data-testid="island-album-capture"><Camera className="size-4" />{T("عکس تازه", "New snapshot")}</Button>
      </div>

      {open && (
        <div className="island-pop mt-4 grid gap-4 rounded-2xl border bg-background p-3 md:grid-cols-[minmax(0,1fr)_240px]" data-testid="island-album-viewer">
          {fullUrl ? <img src={fullUrl} alt={T(`عکس جزیره در ${dateOf(open.createdAt)}`, `Island on ${dateOf(open.createdAt)}`)} className="mx-auto max-h-[60vh] w-auto max-w-full rounded-xl border object-contain" data-testid="island-album-full" /> : <Skeleton className="aspect-[5/4] w-full rounded-xl" />}
          <div className="flex flex-col gap-3">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="font-semibold">{dateOf(open.createdAt)}</p>
                <p className="text-sm text-muted-foreground">{T(`سطح ${num(open.level)} · ${num(open.buildings)} سازه`, `Level ${open.level} · ${open.buildings} buildings`)}</p>
              </div>
              <Button size="icon" variant="ghost" className="size-9" onClick={() => setOpenId(null)} aria-label={T("بستن", "Close")} data-testid="island-album-close"><X className="size-4" /></Button>
            </div>
            {openIndex > 0 && entries && (() => {
              const d = open.buildings - entries[openIndex - 1].buildings;
              const sign = d > 0 ? "+" : "";
              return d === 0 ? null : <Badge variant="secondary" className="w-fit gap-1" data-testid="island-album-growth"><TrendingUp className="size-3.5" />{T(`${sign}${num(d)} سازه نسبت به عکس قبلی`, `${sign}${d} buildings since previous`)}</Badge>;
            })()}
            <div className="mt-auto grid grid-cols-3 gap-2 md:grid-cols-1">
              <Button size="sm" onClick={() => downloadBlob(open.image, fileName(open))} data-testid="island-album-download"><Download className="size-4" />{T("ذخیره", "Save")}</Button>
              <Button size="sm" variant="outline" onClick={() => handleShare(open)} data-testid="island-album-share"><Share2 className="size-4" />{T("اشتراک", "Share")}</Button>
              <Button size="sm" variant="ghost" onClick={() => handleDelete(open)} data-testid="island-album-delete"><Trash2 className="size-4" />{T("حذف", "Delete")}</Button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        {entries === null ? (
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[5/4] rounded-xl" />)}</div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-6 text-center" data-testid="island-album-empty">
            <Images className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">{T("هنوز عکسی در آلبوم نیست. اولین عکس یادگاری را بگیرید!", "No snapshots yet. Take your first one!")}</p>
          </div>
        ) : (
          <ol className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6" data-testid="island-album-grid">
            {entries.map((e, i) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => setOpenId(e.id === openId ? null : e.id)}
                  aria-pressed={e.id === openId}
                  data-testid={`island-album-item-${i}`}
                  className={`group w-full overflow-hidden rounded-xl border text-start transition-[transform,opacity] duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${e.id === openId ? "border-primary ring-2 ring-primary/30" : ""}`}
                >
                  <img src={e.thumbUrl} alt="" className="aspect-[5/4] w-full object-cover" loading="lazy" />
                  <span className="block truncate px-2 py-1.5 text-xs text-muted-foreground">{dateOf(e.createdAt)} · {T(`سطح ${num(e.level)}`, `Lv ${e.level}`)}</span>
                </button>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
