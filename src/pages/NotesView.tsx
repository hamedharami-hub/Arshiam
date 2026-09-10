import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Plus, Pin, Trash2, Search, Sparkles, Loader2, FolderInput, PinOff, Share2, X, Maximize2, FileText } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import ShareDialog from "@/components/ShareDialog";
import SwipeableRow from "@/components/gestures/SwipeableRow";
import { MoveToDialog } from "@/components/MoveToDialog";
import { startItemDrag } from "@/lib/dragToFolder";
import { firebaseStore } from "@/lib/firebaseStore";
import { subscribeNotes, upsertNote, deleteNote as fsDeleteNote } from "@/lib/firestoreDataService";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { markdownToHtml } from "@/lib/markdown";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { BidiText } from "@/components/BidiText";
import { callAI, getAILanguage, type AILanguage } from "@/lib/ai";
import { AILangToggle } from "@/components/AILangToggle";
import { pushUndo } from "@/lib/undoStack";
import { pushDeleted } from "@/lib/recentlyDeleted";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useShareAccess } from "@/hooks/useShareAccess";
import { useIsMobile } from "@/hooks/use-mobile";
import { cacheGet, cacheSet, enqueueOp, getPendingOps } from "@/lib/offlineQueue";



type Note = { id: string; user_id?: string; title: string; content: string; pinned: boolean; updated_at: string; task_id?: string | null; folder_id?: string | null };

export default function NotesView() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = useCallback((fa: string, en: string) => (isEn ? en : fa), [isEn]);

  const aiGroups = useMemo(() => [
    {
      label: T("بهبود نگارش", "Improve writing"),
      items: [
        { key: "improve", label: T("✨ بهبود کلی نگارش", "✨ General improvement") },
        { key: "fix_grammar", label: T("✏️ اصلاح املا و گرامر", "✏️ Fix spelling & grammar") },
        { key: "make_concise", label: T("🎯 موجز و فشرده‌تر", "🎯 Make concise") },
      ],
    },
    {
      label: T("ساختار و فرمت", "Structure & format"),
      items: [
        { key: "auto_format", label: T("🪄 فرمت‌بندی هوشمند (سرتیتر، Bold، لیست)", "🪄 Auto format (headings, bold, lists)") },
        { key: "add_headings", label: T("📑 اضافه کردن سرتیتر مناسب", "📑 Add proper headings") },
        { key: "bold_keywords", label: T("🅱️ Bold کردن نکات کلیدی", "🅱️ Bold key points") },
        { key: "to_list", label: T("• تبدیل به لیست", "• Convert to list") },
        { key: "to_outline", label: T("🗂 ساختار Outline", "🗂 Outline structure") },
      ],
    },
    {
      label: T("خلاصه و گسترش", "Summarize & expand"),
      items: [
        { key: "summarize", label: T("📝 خلاصه کن", "📝 Summarize") },
        { key: "expand", label: T("📖 گسترش بده", "📖 Expand") },
        { key: "continue_writing", label: T("✍️ ادامه‌ی متن را بنویس", "✍️ Continue writing") },
        { key: "tldr", label: T("⚡ TL;DR در ۳ خط", "⚡ TL;DR in 3 lines") },
      ],
    },
    {
      label: T("سبک و لحن", "Tone & style"),
      items: [
        { key: "tone_formal", label: T("👔 رسمی و حرفه‌ای", "👔 Formal & professional") },
        { key: "tone_casual", label: T("😊 صمیمی و دوستانه", "😊 Casual & friendly") },
        { key: "tone_academic", label: T("🎓 آکادمیک", "🎓 Academic") },
        { key: "tone_motivational", label: T("🔥 انگیزشی", "🔥 Motivational") },
        { key: "simplify", label: T("🧒 ساده برای همه‌فهم", "🧒 Simplify") },
      ],
    },
    {
      label: T("ترجمه", "Translate"),
      items: [
        { key: "translate_fa", label: T("🇮🇷 ترجمه به فارسی", "🇮🇷 Translate to Persian") },
        { key: "translate_en", label: T("🇬🇧 ترجمه به انگلیسی", "🇬🇧 Translate to English") },
      ],
    },
  ], [T]);

  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [selected, setSelected] = useState<Note | null>(null);
  const [snap, setSnap] = useState<number | string>(0.55);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<{ html: string; md: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Note | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const [moveOpen, setMoveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const { canEdit, isOwner } = useShareAccess("note", selected?.id, selected?.user_id);

  const NOTES_CACHE_KEY = `notes:all:${user?.id}`;

  const applyNoteQueue = async (base: Note[]): Promise<Note[]> => {
    const ops = await getPendingOps("notes");
    const inserts = new Map<string, Note>();
    const deletes = new Set<string>();
    const updates = new Map<string, Partial<Note>>();
    for (const op of ops) {
      if (op.op === "insert" && op.payload) {
        const p = op.payload as Note;
        if (p?.id) inserts.set(p.id, p);
      } else if (op.op === "delete" && op.match?.id) {
        deletes.add(op.match.id as string);
      } else if (op.op === "update" && op.match?.id && op.payload) {
        const id = op.match.id as string;
        updates.set(id, { ...(updates.get(id) || {}), ...(op.payload as Partial<Note>) });
      }
    }
    let next = base.filter(n => !deletes.has(n.id));
    for (const n of inserts.values()) {
      if (!next.some(x => x.id === n.id)) next = [n, ...next];
    }
    next = next.map(n => updates.has(n.id) ? { ...n, ...updates.get(n.id) } : n);
    return next;
  };

  const load = async () => {
    if (!user) return;
    let base = (await cacheGet<Note[]>(NOTES_CACHE_KEY)) || [];
    // 1. Try Firebase Firestore
    try {
      const { collection, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");
      const snap = await getDocs(collection(db, "users", user.id, "notes"));
      if (!snap.empty) {
        const items: Note[] = [];
        snap.forEach((d) => items.push({ id: d.id, ...(d.data() as any) }));
        items.sort((a, b) => {
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
          return new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime();
        });
        base = items;
        await cacheSet(NOTES_CACHE_KEY, base);
      }
    } catch {
      // 2. Try firebaseStore fallback
      try {
        const { data, error } = await firebaseStore.from("notes").select("*")
          .is("task_id", null)
          .order("pinned", { ascending: false }).order("updated_at", { ascending: false });
        if (!error && data && data.length) {
          base = ((data || []) as unknown) as Note[];
          await cacheSet(NOTES_CACHE_KEY, base);
        }
      } catch {}
    }
    const merged = await applyNoteQueue(base);
    setNotes(merged);
  };

  useEffect(() => {
    if (!user) return;
    load();
    const fsUnsub = subscribeNotes(user.id, async (fsNotes) => {
      // An empty remote snapshot is meaningful: it must clear stale local data.
      const merged = await applyNoteQueue((fsNotes || []) as Note[]);
      setNotes(merged);
      await cacheSet(NOTES_CACHE_KEY, merged);
    });
    const ch = firebaseStore.channel("notes-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, load).subscribe();
    return () => {
      fsUnsub();
      firebaseStore.removeChannel(ch);
    };
  }, [user]);

  const preselectId = searchParams.get("select");
  useEffect(() => {
    if (!preselectId || notes.length === 0) return;
    const found = notes.find(n => n.id === preselectId);
    if (found) {
      setSelected(found);
      setDraft({ html: markdownToHtml(found.content || ""), md: found.content || "" });
    }
    setSearchParams({}, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectId, notes]);

  const generateId = () => {
    try { return crypto.randomUUID(); } catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`; }
  };

  const create = async () => {
    if (!user) return;
    const note: Note = {
      id: generateId(),
      user_id: user.id,
      title: T("نوت جدید", "New note"),
      content: "",
      pinned: false,
      updated_at: new Date().toISOString(),
      task_id: null,
      folder_id: null,
    };
    setNotes(prev => [note, ...prev]);
    setSelected(note);
    setDraft({ html: "", md: "" });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "notes", op: "insert", payload: note });
      await cacheSet(NOTES_CACHE_KEY, [note, ...notes]);
      toast.info(T("نوت ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Note saved — will sync when online"));
      return;
    }

    // 1. Primary write to Firestore
    try {
      await upsertNote(user.id, note);
    } catch {}

    // 2. Best-effort mirror to firebaseStore
    try {
      const { data } = await firebaseStore.from("notes").insert({
        id: note.id,
        user_id: user.id,
        title: note.title,
        content: "",
      }).select().single();
      if (data) {
        const saved = data as Note;
        setNotes(prev => [saved, ...prev.filter(n => n.id !== note.id)]);
        setSelected(saved);
        await cacheSet(NOTES_CACHE_KEY, [saved, ...notes.filter(n => n.id !== note.id)]);
        return;
      }
    } catch {}
    await cacheSet(NOTES_CACHE_KEY, [note, ...notes.filter(n => n.id !== note.id)]);
  };

  const save = async (patch: Partial<Note>) => {
    if (!selected) return;
    if (!canEdit) { toast(T("دسترسی ویرایش ندارید", "You don't have edit permission")); return; }
    const updated = { ...selected, ...patch, updated_at: new Date().toISOString() };
    setSelected(updated);
    setNotes(prev => prev.map(n => n.id === selected.id ? updated : n));
    const nextNotes = notes.map(n => n.id === selected.id ? updated : n);
    await cacheSet(NOTES_CACHE_KEY, nextNotes);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "notes", op: "update", payload: patch, match: { id: selected.id } });
      return;
    }

    if (user) {
      await upsertNote(user.id, updated);
    }
    try {
      await firebaseStore.from("notes").update(patch).eq("id", selected.id);
    } catch {}
  };

  useEffect(() => {
    if (!draft || !selected) return;
    const t = setTimeout(() => { save({ content: draft.md }); }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [draft?.md]);

  const del = async (id: string) => {
    const note = notes.find(n => n.id === id);
    if (note && note.user_id !== user?.id) { toast(T("فقط صاحب نوت می‌تواند حذف کند", "Only the note owner can delete")); return; }
    const previous = [...notes];
    setNotes(prev => prev.filter(n => n.id !== id));
    await cacheSet(NOTES_CACHE_KEY, previous.filter(n => n.id !== id));

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "notes", op: "delete", match: { id } });
      if (selected?.id === id) { setSelected(null); setDraft(null); }
      if (note) {
        const restore = async () => {
          setNotes(prev => [note, ...prev]);
          await enqueueOp({ table: "notes", op: "insert", payload: note });
        };
        pushUndo({ label: T(`نوت «${note.title || T("بدون عنوان", "Untitled")}» حذف شد`, `Note "${note.title || T("بدون عنوان", "Untitled")}" deleted`), undo: restore });
        pushDeleted({ kind: "note", label: note.title || T("بدون عنوان", "Untitled"), restore });
      }
      return;
    }

    if (user) {
      await fsDeleteNote(user.id, id);
    }
    try {
      await firebaseStore.from("notes").delete().eq("id", id);
    } catch {}
    if (selected?.id === id) { setSelected(null); setDraft(null); }
    if (note) {
      const restore = async () => {
        await firebaseStore.from("notes").insert(note as never);
        load();
      };
      pushUndo({ label: T(`نوت «${note.title || T("بدون عنوان", "Untitled")}» حذف شد`, `Note "${note.title || T("بدون عنوان", "Untitled")}" deleted`), undo: restore });
      pushDeleted({ kind: "note", label: note.title || T("بدون عنوان", "Untitled"), restore });
    }
  };

  const runNoteAI = async (action: string) => {
    if (!selected) return;
    if (!canEdit) { toast(T("دسترسی ویرایش ندارید", "You don't have edit permission")); return; }
    const md = (draft?.md ?? selected.content ?? "").trim();
    if (!md) return toast.error(T("نوت خالی است", "Note is empty"));
    setAiBusy(true);
    try {
      const r = await callAI("inline_edit", md, undefined, action, aiLang);
      const newMd = (r.text || "").trim();
      if (!newMd) throw new Error(T("نتیجه خالی", "Empty result"));
      setDraft({ md: newMd, html: markdownToHtml(newMd) });
      await save({ content: newMd });
      toast.success(T("اعمال شد ✨", "Applied ✨"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    } finally {
      setAiBusy(false);
    }
  };

  const togglePin = async (n: Note) => {
    const patch = { pinned: !n.pinned, updated_at: new Date().toISOString() };
    const next = notes.map(x => x.id === n.id ? { ...x, ...patch } : x);
    setNotes(next);
    await cacheSet(NOTES_CACHE_KEY, next);

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOp({ table: "notes", op: "update", payload: patch, match: { id: n.id } });
      return;
    }
    await firebaseStore.from("notes").update(patch).eq("id", n.id);
    load();
  };

  const filtered = notes.filter((n) =>
    n.title.toLowerCase().includes(search.toLowerCase()) ||
    n.content.toLowerCase().includes(search.toLowerCase())
  );

  // Plain-preview helper (strip MD chars) for sidebar
  const stripMd = (s: string) => (s || "").replace(/[#*`>_![\]()~-]+/g, "").replace(/\n+/g, " ").slice(0, 80);

  const emptyState = (
    <div className="flex items-center justify-center h-full p-8">
      <EmptyState
        icon={FileText}
        title={T("یک نوت انتخاب کن یا جدید بساز", "Select a note or create a new one")}
        description={T("ایده‌ها، یادداشت‌های کاری، چک‌لیست‌ها و افکارت رو ثبت و سازماندهی کن.", "Capture and organize ideas, work notes, checklists and thoughts.")}
        action={{
          label: T("نوت جدید", "New note"),
          icon: Plus,
          onClick: create,
        }}
        className="max-w-md w-full"
      />
    </div>
  );

  const editor = selected ? (
    <div className="px-3 sm:px-4 py-2 w-full min-h-0 flex flex-col">
      <div className="flex items-start gap-2 mb-3 flex-wrap">
        <AutoTextarea
          value={selected.title}
          onChange={(e) => save({ title: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
          disabled={!canEdit}
          className="text-xl font-bold border-none focus-visible:ring-0 px-0 flex-1 min-w-[120px] py-1"
          dir="auto"
          rows={1}
          minHeight={36}
          maxHeight={200}
        />
        <VoiceInputButton
          onTranscript={(text) => save({ title: selected.title ? selected.title.trimEnd() + " " + text : text })}
          disabled={!canEdit}
          size="icon"
          className="h-9 w-9 shrink-0"
        />
        <AILangToggle value={aiLang} onChange={setAiLang} />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="default" className="gap-1" disabled={aiBusy || !canEdit}>
              {aiBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              AI
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto w-64">
            {aiGroups.map((g, gi) => (
              <div key={g.label}>
                {gi > 0 && <DropdownMenuSeparator />}
                <DropdownMenuLabel className="text-xs text-muted-foreground">{g.label}</DropdownMenuLabel>
                {g.items.map((it) => (
                  <DropdownMenuItem key={it.key} onClick={() => runNoteAI(it.key)} disabled={!canEdit}>
                    {it.label}
                  </DropdownMenuItem>
                ))}
              </div>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button size="icon" variant="ghost" onClick={() => save({ pinned: !selected.pinned })} disabled={!canEdit}>
          <Pin className={`w-4 h-4 ${selected.pinned ? "text-primary fill-primary" : ""}`} />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setMoveOpen(true)} title={T("انتقال به فولدر", "Move to folder")} disabled={!canEdit}>
          <FolderInput className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setShareOpen(true)} title={T("اشتراک‌گذاری", "Share")} disabled={!isOwner}>
          <Share2 className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => setConfirmDel(selected)} disabled={!isOwner}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      <NoteEditorTabs
        noteId={selected.id}
        markdown={draft?.md ?? selected.content ?? ""}
        onChange={(md, html) => setDraft({ html, md })}
        readOnly={!canEdit}
      />
    </div>
  ) : null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      <div className="md:w-80 border-s md:border-s border-e-0 md:border-e flex flex-col bg-card/30">
        <div dir="rtl" className="p-3 border-b space-y-2">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold">{T("نوت‌ها", "Notes")}</h2>
            <Button size="sm" onClick={create}><Plus className="w-4 h-4" /></Button>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input placeholder={T("جستجو...", "Search...")} value={search} onChange={(e) => setSearch(e.target.value)} className="ps-8" dir="auto" />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-xs leading-relaxed">
              {search
                ? T("نوتی با این مشخصات یافت نشد.", "No notes found matching search.")
                : T("هنوز نوتی ننوشتی. با دکمه + بالا اولین نوتت رو بساز!", "No notes yet. Click + above to create your first note!")}
            </div>
          )}
          {filtered.map((n) => (
            <SwipeableRow
              key={n.id}
              onComplete={async () => togglePin(n)}
              onDelete={() => del(n.id)}
              isCompleted={n.pinned}
              rightLabel={T("پین", "Pin")}
              rightLabelAlt={T("حذف پین", "Unpin")}
              RightIcon={n.pinned ? PinOff : Pin}
              rightColor="amber"
            >
              <div
                draggable
                onDragStart={(e) => startItemDrag(e, { kind: "note", id: n.id, title: n.title })}
                className="border-b bg-card"
                title={T("Drag روی فولدر سایدبار برای انتقال", "Drag onto a folder in the sidebar to move")}
              >
                <button onClick={() => { setSelected(n); setDraft({ html: markdownToHtml(n.content || ""), md: n.content || "" }); }}
                  className={`w-full text-end p-3 hover:bg-accent/40 transition cursor-grab active:cursor-grabbing ${selected?.id === n.id ? "bg-accent/60" : ""}`}>
                  <div className="flex items-center gap-1">
                    {n.pinned && <Pin className="w-3 h-3 text-primary" />}
                    <BidiText as="span" text={n.title} className="font-medium text-sm truncate flex-1" />
                  </div>
                  <BidiText as="p" text={stripMd(n.content)} className="text-xs text-muted-foreground mt-1 line-clamp-3 whitespace-pre-wrap break-words" />
                </button>
              </div>
            </SwipeableRow>
          ))}
          
        </div>
      </div>

      <div className="hidden md:flex flex-1 min-w-0 overflow-y-auto">
        {selected ? editor : emptyState}
      </div>

      {selected && isMobile && (
        <Drawer open={true} onOpenChange={(v) => !v && setSelected(null)} snapPoints={[0.55, 1]} activeSnapPoint={snap} setActiveSnapPoint={setSnap} shouldScaleBackground={false}>
          <DrawerContent className="max-h-[95vh] flex flex-col" aria-describedby="note-drawer-desc">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{selected.title}</DrawerTitle>
            </DrawerHeader>
            <div className="flex items-center justify-end px-3 pt-3 pb-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSnap(1)} title={T("فول اسکرین", "Full screen")}>
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelected(null)} title={T("بستن", "Close")}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-4">
              {editor}
            </div>
            <p id="note-drawer-desc" className="sr-only">{T("جزئیات و ویرایش نوت", "Note details and editor")}</p>
          </DrawerContent>
        </Drawer>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("حذف نوت؟", "Delete note?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(`آیا مطمئنی می‌خوای «${confirmDel?.title || T("این مورد", "this item")}» را حذف کنی؟ این عمل قابل بازگشت نیست.`, `Are you sure you want to delete "${confirmDel?.title || T("این مورد", "this item")}"? This action cannot be undone.`)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => { if (confirmDel) await del(confirmDel.id); setConfirmDel(null); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {T("حذف", "Delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selected && (
        <>
          <MoveToDialog
            open={moveOpen}
            onOpenChange={setMoveOpen}
            kind="note"
            itemId={selected.id}
            currentFolderId={selected.folder_id ?? null}
            onMoved={(fid) => { setSelected((prev) => prev ? { ...prev, folder_id: fid } : null); load(); }}
          />
          <ShareDialog
            open={shareOpen}
            onOpenChange={setShareOpen}
            resourceType="note"
            resourceId={selected.id}
            resourceTitle={selected.title}
          />
        </>
      )}
    </div>
  );
}
