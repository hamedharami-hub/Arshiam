import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookHeart, CalendarDays, Check, Cloud, Images, Loader2, Palette, Paperclip, Plus, Save, Trash2, Mic } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { deleteNote, subscribeNotes, upsertNote } from "@/lib/firestoreDataService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DiaryBackgroundPicker } from "@/components/diary/DiaryBackgroundPicker";
import { DiaryAttachments } from "@/components/diary/DiaryAttachments";
import { DiaryGooglePhotos } from "@/components/diary/DiaryGooglePhotos";
import { DiaryAiTools } from "@/components/diary/DiaryAiTools";
import { DiaryEntryList, MOOD_ICON } from "@/components/diary/DiaryEntryList";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import type { RichEditorHandle } from "@/components/RichEditor";
import { DIARY_MOODS, formatDiaryDate, newDiaryEntry, resolveBackground, wordCount, type DiaryEntry } from "@/lib/diary";
import { markdownToHtml } from "@/lib/markdown";
import "./DailyDiaryView.css";

const RichEditor = lazy(() => import("@/components/RichEditor").then((module) => ({ default: module.RichEditor })));

function normalizeEntry(raw: DiaryEntry): DiaryEntry {
  const legacy = raw.diary_google_photos_url?.trim();
  const links = raw.diary_google_photos ?? [];
  return {
    ...raw,
    diary_date: raw.diary_date || raw.updated_at.slice(0, 10),
    diary_background: raw.diary_background || "paper",
    diary_opacity: typeof raw.diary_opacity === "number" ? raw.diary_opacity : 35,
    diary_attachments: raw.diary_attachments ?? [],
    diary_google_photos: legacy && !links.includes(legacy) ? [...links, legacy] : links,
  };
}

function stripUndefined<T extends object>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as T;
}

export default function DailyDiaryView() {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [draft, setDraft] = useState<DiaryEntry | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorVersion, setEditorVersion] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const draftRef = useRef<DiaryEntry | null>(null);
  const pageRef = useRef<HTMLElement | null>(null);
  const editorRef = useRef<RichEditorHandle>(null);
  const revisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const pendingSavesRef = useRef(0);
  draftRef.current = draft;

  useEffect(() => {
    if (!user?.id) return;
    return subscribeNotes(user.id, (notes) => {
      setEntries((notes as DiaryEntry[]).filter((note) => note.kind === "diary").map(normalizeEntry));
    });
  }, [user?.id]);

  const ordered = useMemo(() => [...entries].sort((a, b) => (b.diary_date || "").localeCompare(a.diary_date || "") || b.updated_at.localeCompare(a.updated_at)), [entries]);
  const background = draft ? resolveBackground(draft) : null;
  const words = draft ? wordCount(draft.content) : 0;

  const patch = useCallback((changes: Partial<DiaryEntry>) => {
    revisionRef.current += 1;
    setDraft((current) => (current ? { ...current, ...changes } : current));
    setDirty(true);
    setSaveFailed(false);
  }, []);

  const persist = useCallback(async (entry: DiaryEntry, silent = false) => {
    if (!user?.id) return false;
    if (!entry.title.trim() && !entry.content.trim() && !entry.diary_attachments?.length && !entry.diary_google_photos?.length && !entry.diary_mood) {
      if (!silent) toast.error(T("عنوان یا متن خاطره را بنویس", "Write a title or some text first"));
      return false;
    }
    const revision = revisionRef.current;
    pendingSavesRef.current += 1;
    setSaving(true);
    const next: DiaryEntry = stripUndefined({ ...entry, title: entry.title.trim() || T("خاطرهٔ روزانه", "Daily entry"), updated_at: new Date().toISOString() });
    const operation = saveQueueRef.current.catch(() => undefined).then(async () => {
      try {
        const ok = await upsertNote(user.id, next);
        if (!ok) {
          if (draftRef.current?.id === next.id) setSaveFailed(true);
          if (!silent) toast.error(T("خاطره ذخیره نشد؛ دوباره تلاش کن", "Entry was not saved; please retry"));
          return false;
        }
        setEntries((previous) => [next, ...previous.filter((item) => item.id !== next.id)]);
        if (draftRef.current?.id === next.id && revisionRef.current === revision) {
          setDraft((current) => (current ? { ...current, title: next.title, updated_at: next.updated_at } : current));
          setDirty(false);
          setSaveFailed(false);
        }
        if (!silent) toast.success(T("خاطره ذخیره شد", "Entry saved"));
        return true;
      } catch {
        if (draftRef.current?.id === next.id) setSaveFailed(true);
        if (!silent) toast.error(T("خاطره ذخیره نشد؛ دوباره تلاش کن", "Entry was not saved; please retry"));
        return false;
      } finally {
        pendingSavesRef.current -= 1;
        if (pendingSavesRef.current === 0) setSaving(false);
      }
    });
    saveQueueRef.current = operation;
    return operation;
  }, [user?.id, T]);

  useEffect(() => {
    if (!dirty || !draft) return;
    const timer = setTimeout(() => { void persist(draft, true); }, 3500);
    return () => clearTimeout(timer);
  }, [dirty, draft, persist]);

  useEffect(() => {
    if (!draft?.id || typeof window.matchMedia !== "function" || !window.matchMedia("(max-width: 640px)").matches) return;
    pageRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }, [draft?.id]);

  const openEntry = (entry: DiaryEntry) => {
    if (dirty && draft) void persist(draft, true);
    revisionRef.current += 1;
    setDraft(entry);
    setDirty(false);
    setSaveFailed(false);
    setInterimTranscript("");
    setEditorVersion((value) => value + 1);
  };

  const createEntry = () => {
    if (!user?.id) return;
    if (dirty && draft) void persist(draft, true);
    revisionRef.current += 1;
    setDraft(newDiaryEntry(user.id));
    setDirty(false);
    setSaveFailed(false);
    setInterimTranscript("");
    setEditorVersion((value) => value + 1);
  };

  const removeEntry = async () => {
    if (!user?.id || !draft) return;
    const ok = await deleteNote(user.id, draft.id);
    setConfirmDelete(false);
    if (!ok) { toast.error(T("حذف انجام نشد", "Could not delete")); return; }
    setEntries((previous) => previous.filter((item) => item.id !== draft.id));
    setDraft(null);
    setDirty(false);
    toast.success(T("خاطره حذف شد", "Entry deleted"));
  };

  const applyAiContent = (markdown: string) => {
    patch({ content: markdown, diary_html: markdownToHtml(markdown) });
    setEditorVersion((value) => value + 1);
  };

  const isNewDraft = Boolean(draft && !entries.some((entry) => entry.id === draft.id));

  return (
    <main className="diary-workspace mx-auto w-full max-w-7xl space-y-5 px-3 py-5 sm:px-5" dir={isEn ? "ltr" : "rtl"} data-testid="daily-diary-view">
      <header className="diary-header">
        <div className="relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div className="flex items-center gap-4">
            <span className="diary-header-mark"><BookHeart className="h-6 w-6" /></span>
            <div>
              <HeaderTitlePortal title={T("دفتر خاطرات روزانه", "Daily Diary")} />
              <p className="mt-1 text-sm text-muted-foreground">{T("جایی آرام برای نوشتن و نگه‌داشتن لحظه‌های روز", "A quiet place to write and remember your day")}</p>
              <p className="mt-2 text-xs text-muted-foreground" data-testid="diary-stats">{T(`${ordered.length} خاطره`, `${ordered.length} entries`)}</p>
            </div>
          </div>
          <Button onClick={createEntry} disabled={!user?.id} className="diary-primary-action gap-2" data-testid="diary-new-entry-btn"><Plus className="h-4 w-4" />{T("خاطرهٔ تازه", "New entry")}</Button>
        </div>
      </header>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="diary-entry-rail lg:sticky lg:top-4 lg:max-h-[82vh]">
          <DiaryEntryList entries={ordered} selectedId={draft?.id} onSelect={openEntry} />
        </aside>

        {draft && background ? (
          <section ref={pageRef} data-testid="diary-page" className={`diary-page relative min-w-0 overflow-hidden ${background.tint}`}>
            {background.src && (
              <div
                data-testid="diary-page-background"
                className="pointer-events-none absolute inset-0 bg-cover bg-center transition-opacity duration-500"
                style={{ backgroundImage: `url("${background.src.replace(/"/g, '%22')}")`, opacity: draft.diary_opacity / 100, filter: draft.diary_blur ? `blur(${draft.diary_blur}px)` : undefined, transform: draft.diary_blur ? "scale(1.05)" : undefined }}
              />
            )}
            <div className="relative space-y-4 p-4 sm:p-6">
              <div className="diary-page-toolbar flex flex-wrap items-center gap-2 p-2 backdrop-blur-sm">
                <label className="inline-flex items-center gap-1.5 text-xs">
                  <CalendarDays className="h-4 w-4 text-primary" aria-hidden="true" />
                  <Input data-testid="diary-date-input" type="date" aria-label={T("تاریخ خاطره", "Entry date")} value={draft.diary_date} onChange={(event) => patch({ diary_date: event.target.value })} className="h-8 w-36 bg-background/80 text-xs" />
                </label>
                <span className="hidden text-xs text-muted-foreground sm:inline" data-testid="diary-date-label">{formatDiaryDate(draft.diary_date, isEn)}</span>
                <div className="flex items-center gap-0.5 rounded-full border bg-background/80 p-0.5" role="radiogroup" aria-label={T("حال امروز", "Today's mood")}>
                  {DIARY_MOODS.map((mood) => {
                    const Icon = MOOD_ICON[mood.id];
                    const active = draft.diary_mood === mood.id;
                    return <button key={mood.id} type="button" role="radio" aria-checked={active} title={isEn ? mood.en : mood.fa} data-testid={`diary-mood-${mood.id}`} onClick={() => patch({ diary_mood: active ? null : mood.id })} className={`rounded-full p-1.5 transition-transform hover:scale-110 ${active ? `bg-primary/15 ${mood.color}` : "text-muted-foreground"}`}><Icon className="h-4 w-4" /></button>;
                  })}
                </div>
                <div className="ms-auto flex flex-wrap items-center gap-1.5">
                  <DiaryAiTools content={draft.content} title={draft.title} onApplyContent={applyAiContent} onApplyTitle={(title) => patch({ title })} />
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground" data-testid="diary-save-status" role="status">
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saveFailed || dirty || isNewDraft ? <Cloud className="h-3.5 w-3.5" /> : <Check className="h-3.5 w-3.5 text-emerald-500" />}
                    {saving ? T("در حال ذخیره…", "Saving…") : saveFailed ? T("ذخیره ناموفق؛ دوباره تلاش کن", "Save failed; please retry") : dirty ? T("تغییرات ذخیره‌نشده", "Unsaved changes") : isNewDraft ? T("پیش‌نویس تازه", "New draft") : T("ذخیره شده", "Saved")}
                  </span>
                  <Button size="sm" onClick={() => void persist(draft)} disabled={saving} className="gap-1.5" data-testid="diary-save-btn"><Save className="h-4 w-4" />{T("ذخیره", "Save")}</Button>
                  {entries.some((item) => item.id === draft.id) && (
                    <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(true)} className="text-muted-foreground hover:text-destructive" aria-label={T("حذف خاطره", "Delete entry")} data-testid="diary-delete-btn"><Trash2 className="h-4 w-4" /></Button>
                  )}
                </div>
              </div>

              <Input data-testid="diary-title-input" value={draft.title} onChange={(event) => patch({ title: event.target.value })} placeholder={T("عنوان این روز…", "A title for today…")} className="h-auto border-0 bg-transparent px-1 text-2xl font-bold shadow-none placeholder:text-foreground/40 focus-visible:ring-0 sm:text-3xl" dir="auto" />

              <div className="diary-writing-surface p-2 backdrop-blur-sm sm:p-3" data-testid="diary-editor">
                <Suspense fallback={<div className="flex h-48 items-center justify-center text-sm text-muted-foreground"><Loader2 className="me-2 h-4 w-4 animate-spin" />{T("در حال بارگذاری ویرایشگر…", "Loading editor…")}</div>}>
                  <RichEditor
                    key={`${draft.id}-${editorVersion}`}
                    ref={editorRef}
                    initialMarkdown={draft.content}
                    placeholder={T("امروز چه گذشت؟ چه چیزی را نمی‌خواهی فراموش کنی؟", "What happened today? What don't you want to forget?")}
                    onChange={(html, markdown) => patch({ content: markdown, diary_html: html })}
                    showVoiceButton={false}
                  />
                </Suspense>
                <p className="mt-1 px-1 text-[11px] text-muted-foreground" data-testid="diary-word-count">
                  {T(`${words} کلمه`, `${words} words`)}
                </p>
              </div>

              <div className="diary-dictation" data-testid="diary-dictation">
                <span className="diary-dictation-icon" aria-hidden="true"><Mic className="h-5 w-5" /></span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{T("نوشتن با صدا", "Write with your voice")}</p>
                  <p className="text-xs text-muted-foreground">{T("متن گفتار مستقیم به خاطره اضافه می‌شود؛ فایل صوتی جداگانه در پیوست‌ها ضبط می‌شود.", "Speech becomes text in this entry; record an audio file separately in attachments.")}</p>
                  {interimTranscript && <p className="mt-1 text-xs text-primary" role="status" data-testid="diary-interim-transcript">{interimTranscript}</p>}
                </div>
                <VoiceInputButton
                  key={draft.id}
                  continuous
                  onTranscript={(text) => {
                    if (draftRef.current?.id !== draft.id) return;
                    setInterimTranscript("");
                    if (editorRef.current) editorRef.current.insertText(text);
                    else if (draftRef.current) patch({ content: `${draftRef.current.content} ${text}`.trim() });
                  }}
                  onInterim={(text) => { if (draftRef.current?.id === draft.id) setInterimTranscript(text); }}
                  className="diary-dictation-button"
                  title={T("شروع یا توقف نوشتن با صدا", "Start or stop voice dictation")}
                />
              </div>

              <Tabs defaultValue="look" className="diary-extras p-3 backdrop-blur-sm">
                <TabsList className="flex w-full flex-wrap justify-start bg-muted/60">
                  <TabsTrigger value="look" data-testid="diary-tab-look" className="gap-1.5"><Palette className="h-4 w-4" />{T("ظاهر صفحه", "Page look")}</TabsTrigger>
                  <TabsTrigger value="media" data-testid="diary-tab-media" className="gap-1.5"><Paperclip className="h-4 w-4" />{T("صدا و ویدیو", "Audio & video")} {draft.diary_attachments?.length ? `(${draft.diary_attachments.length})` : ""}</TabsTrigger>
                  <TabsTrigger value="gphotos" data-testid="diary-tab-gphotos" className="gap-1.5"><Images className="h-4 w-4" />Google Photos {draft.diary_google_photos?.length ? `(${draft.diary_google_photos.length})` : ""}</TabsTrigger>
                </TabsList>
                <TabsContent value="look" className="mt-3"><DiaryBackgroundPicker entry={draft} onChange={patch} /></TabsContent>
                <TabsContent value="media" className="mt-3"><DiaryAttachments attachments={draft.diary_attachments ?? []} onChange={(next) => patch({ diary_attachments: next })} /></TabsContent>
                <TabsContent value="gphotos" className="mt-3"><DiaryGooglePhotos links={draft.diary_google_photos ?? []} onChange={(next) => patch({ diary_google_photos: next })} /></TabsContent>
              </Tabs>
            </div>
          </section>
        ) : (
          <div className="relative flex min-h-[420px] items-center justify-center overflow-hidden rounded-3xl border border-dashed text-center" data-testid="diary-empty-state">
            <img src="/diary-bg/watercolor.jpg" alt="" className="absolute inset-0 h-full w-full object-cover opacity-50 dark:opacity-20" />
            <div className="relative max-w-sm space-y-3 p-6">
              <BookHeart className="mx-auto h-10 w-10 text-primary" />
              <p className="text-base font-semibold">{T("دفترت منتظر امروز است", "Your journal is waiting for today")}</p>
              <p className="text-sm text-muted-foreground">{T("یک صفحه را از فهرست باز کن یا صفحهٔ تازه‌ای بساز؛ پس‌زمینه، حال‌وهوا، صدا و عکس‌هایت را به آن اضافه کن.", "Open a page from the list or start a new one; add a background, your mood, voice notes and photos.")}</p>
              <Button onClick={createEntry} className="gap-2" data-testid="diary-empty-new-btn"><Plus className="h-4 w-4" />{T("نوشتن خاطرهٔ امروز", "Write today's entry")}</Button>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"} data-testid="diary-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>{T("این صفحه از دفتر حذف شود؟", "Delete this page from the journal?")}</AlertDialogTitle>
            <AlertDialogDescription>{T("متن، پیوست‌ها و لینک‌های این خاطره حذف می‌شوند و قابل بازگشت نیستند.", "The text, attachments and links of this entry will be removed permanently.")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="diary-delete-cancel">{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction data-testid="diary-delete-confirm" className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={(event) => { event.preventDefault(); void removeEntry(); }}>{T("حذف", "Delete")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
