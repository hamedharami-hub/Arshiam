import { useEffect, useMemo, useState } from "react";
import { BookHeart, Plus, Save, ImagePlus, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { subscribeNotes, upsertNote, type NoteItem } from "@/lib/firestoreDataService";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

type DiaryEntry = NoteItem & {
  kind?: "diary";
  diary_date?: string;
  diary_background?: string;
  diary_opacity?: number;
  diary_photo_url?: string;
  diary_google_photos_url?: string;
  diary_html?: string;
};

const BACKGROUNDS = [
  { id: "paper", className: "bg-amber-50 dark:bg-amber-950/20" },
  { id: "lavender", className: "bg-violet-100 dark:bg-violet-950/30" },
  { id: "sea", className: "bg-cyan-50 dark:bg-cyan-950/25" },
  { id: "rose", className: "bg-rose-50 dark:bg-rose-950/25" },
];

function newEntry(userId: string): DiaryEntry {
  const now = new Date();
  return {
    id: crypto.randomUUID(), user_id: userId, title: "", content: "", pinned: false,
    created_at: now.toISOString(), updated_at: now.toISOString(), task_id: null,
    kind: "diary", diary_date: now.toLocaleDateString("en-CA"),
    diary_background: "paper", diary_opacity: 25, diary_photo_url: "", diary_google_photos_url: "", diary_html: "",
  };
}

export default function DailyDiaryView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [draft, setDraft] = useState<DiaryEntry | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    return subscribeNotes(user.id, (notes) => setEntries((notes as DiaryEntry[]).filter((note) => note.kind === "diary")));
  }, [user?.id]);

  const ordered = useMemo(() => [...entries].sort((a, b) => (b.diary_date || b.updated_at).localeCompare(a.diary_date || a.updated_at)), [entries]);
  const background = BACKGROUNDS.find((item) => item.id === draft?.diary_background) || BACKGROUNDS[0];

  const save = async () => {
    if (!user?.id || !draft || busy) return;
    if (!draft.title.trim() && !draft.content.trim()) {
      toast.error(T("عنوان یا متن خاطره را بنویس", "Write a title or diary entry first"));
      return;
    }
    setBusy(true);
    const next = { ...draft, title: draft.title.trim() || T("خاطرهٔ روزانه", "Daily diary"), updated_at: new Date().toISOString() };
    const ok = await upsertNote(user.id, next);
    setBusy(false);
    if (!ok) { toast.error(T("خاطره ذخیره نشد؛ دوباره تلاش کن", "Diary entry was not saved; please retry")); return; }
    setEntries((previous) => [next, ...previous.filter((item) => item.id !== next.id)]);
    setDraft(next);
    toast.success(T("خاطره ذخیره شد", "Diary entry saved"));
  };

  return <main className="mx-auto max-w-6xl space-y-5 px-3 py-5 sm:px-5" dir={isEn ? "ltr" : "rtl"}>
    <header className="rounded-3xl border bg-gradient-to-br from-violet-100/70 via-rose-50 to-amber-50 p-5 text-slate-900 dark:from-violet-950/50 dark:via-slate-900 dark:to-amber-950/20 dark:text-foreground">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3"><BookHeart className="h-7 w-7 text-violet-600" /><div>
          <h1 className="text-2xl font-bold">{T("دفتر خاطرات روزانه", "Daily Diary")}</h1>
          <p className="text-sm opacity-75">{T("نوشته‌ها، تصویرها و لحظه‌های هر روز در یک دفتر شخصی", "Writing, images and moments in one personal journal")}</p>
        </div></div>
        <Button onClick={() => user?.id && setDraft(newEntry(user.id))} className="gap-2"><Plus className="h-4 w-4" />{T("خاطرهٔ جدید", "New entry")}</Button>
      </div>
    </header>

    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-2xl border bg-card p-3 lg:sticky lg:top-4 lg:max-h-[75vh] lg:overflow-y-auto">
        <h2 className="mb-2 text-sm font-semibold">{T("ورق‌های دفتر", "Journal pages")}</h2>
        {ordered.length === 0 && <p className="text-xs text-muted-foreground">{T("هنوز خاطره‌ای ثبت نشده", "No entries yet")}</p>}
        <div className="space-y-1">{ordered.map((entry) => <button key={entry.id} type="button" onClick={() => setDraft(entry)} className={`w-full rounded-xl px-3 py-2 text-start text-sm hover:bg-muted ${draft?.id === entry.id ? "bg-primary/10 text-primary" : ""}`}>
          <span className="block text-xs opacity-65">{entry.diary_date || entry.updated_at.slice(0, 10)}</span><span className="line-clamp-2 font-medium">{entry.title || T("بدون عنوان", "Untitled")}</span>
        </button>)}</div>
      </aside>

      {draft ? <section className={`relative min-w-0 overflow-hidden rounded-3xl border shadow-sm ${background.className}`}>
        {draft.diary_photo_url && <div className="absolute inset-0 pointer-events-none bg-cover bg-center" style={{ backgroundImage: `url(${JSON.stringify(draft.diary_photo_url).slice(1, -1)})`, opacity: (draft.diary_opacity ?? 25) / 100 }} />}
        <div className="relative space-y-4 bg-background/30 p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Input type="date" aria-label={T("تاریخ خاطره", "Entry date")} value={draft.diary_date || ""} onChange={(event) => setDraft({ ...draft, diary_date: event.target.value })} className="w-40 bg-background/80" />
            <div className="ms-auto flex gap-1">{BACKGROUNDS.map((item) => <button key={item.id} type="button" onClick={() => setDraft({ ...draft, diary_background: item.id })} aria-label={item.id} title={item.id} className={`h-7 w-7 rounded-full border-2 ${item.className} ${draft.diary_background === item.id ? "border-primary" : "border-border"}`} />)}</div>
          </div>
          <Input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={T("عنوان این روز...", "A title for today...")} className="border-0 bg-transparent px-0 text-xl font-semibold shadow-none" dir="auto" />
          <details className="rounded-xl border bg-background/70 p-3 text-xs"><summary className="cursor-pointer font-medium"><ImagePlus className="me-1 inline h-4 w-4" />{T("پس‌زمینه و تصویر", "Background and photo")}</summary>
            <div className="mt-3 space-y-2"><Input type="url" value={draft.diary_photo_url || ""} onChange={(event) => setDraft({ ...draft, diary_photo_url: event.target.value })} placeholder={T("نشانی مستقیم تصویر", "Direct image URL")} />
              <label className="block">{T("شدت نمایش تصویر", "Image visibility")}: {draft.diary_opacity ?? 25}%<input className="mt-1 w-full" type="range" min="0" max="80" value={draft.diary_opacity ?? 25} onChange={(event) => setDraft({ ...draft, diary_opacity: Number(event.target.value) })} /></label>
            </div></details>
          <div className="rounded-2xl border bg-background/80 p-3 sm:p-4"><NoteEditorTabs noteId={draft.id} markdown={draft.content} onChange={(markdown, html) => setDraft((current) => current ? { ...current, content: markdown, diary_html: html } : current)} /></div>
          <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground">{T("برای عکس، صدا، ویدیو و ویرایش AI از ابزارهای ویرایشگر استفاده کن.", "Use the editor toolbar for images, audio, video and AI edits.")}</p><Button onClick={() => void save()} disabled={busy} className="gap-2"><Save className="h-4 w-4" />{T("ذخیرهٔ خاطره", "Save entry")}</Button></div>
          <div className="space-y-2 rounded-xl border bg-background/70 p-3 text-xs"><label className="font-medium">Google Photos</label><Input type="url" value={draft.diary_google_photos_url || ""} onChange={(event) => setDraft({ ...draft, diary_google_photos_url: event.target.value })} placeholder="https://photos.app.goo.gl/..." />
            {/^https:\/\/(photos\.app\.goo\.gl|photos\.google\.com)\//i.test(draft.diary_google_photos_url || "") && <a href={draft.diary_google_photos_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline"><ExternalLink className="h-3 w-3" />{T("نمایش آلبوم در Google Photos", "Open in Google Photos")}</a>}
            <p className="text-muted-foreground">{T("لینک اشتراک را ذخیره کن؛ نمایش مستقیم رسانه به مجوز و نوع لینک Google Photos بستگی دارد.", "Save a share link. Inline display depends on Google Photos access and link type.")}</p>
          </div>
        </div>
      </section> : <div className="flex min-h-72 items-center justify-center rounded-3xl border border-dashed bg-card/40 p-6 text-center text-sm text-muted-foreground">{T("یک خاطره را باز کن یا صفحهٔ تازه بساز", "Open an entry or start a new page")}</div>}
    </div>
  </main>;
}
