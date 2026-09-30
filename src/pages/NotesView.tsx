import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Plus,
  Pin,
  Trash2,
  Search,
  Sparkles,
  Loader2,
  FolderInput,
  PinOff,
  Share2,
  X,
  Maximize2,
  FileText,
  MoreHorizontal,
  MoreVertical,
  Tag as TagIcon,
  Check,
  Folder as FolderIcon,
  ChevronDown,
  BookOpen,
  FileCode,
  Eye,
} from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { AutoTextarea } from "@/components/ui/auto-textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { cacheGet, cacheSet, getPendingOps } from "@/lib/offlineQueue";
import { projectQueuedNotes } from "@/lib/noteQueueProjection";
import { isFeatureEnabled } from "@/lib/capabilities";

type Note = {
  id: string;
  user_id?: string;
  title: string;
  content: string;
  pinned: boolean;
  updated_at: string;
  created_at?: string;
  task_id?: string | null;
  folder_id?: string | null;
  tag_ids?: string[];
  kind?: string;
};

type FolderItem = { id: string; name: string; color?: string };
type TagItem = { id: string; name: string; color?: string };

export default function NotesView() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isMobile = useIsMobile();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = useCallback((fa: string, en: string) => (isEn ? en : fa), [isEn]);

  const aiGroups = useMemo(
    () => [
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
    ],
    [T]
  );

  const [searchParams, setSearchParams] = useSearchParams();
  const [notes, setNotes] = useState<Note[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all, '__none__' = uncategorized, or folderId
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // null = all, or tagId
  const [selected, setSelected] = useState<Note | null>(null);
  const [snap, setSnap] = useState<number | string>(0.55);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<{ html: string; md: string } | null>(null);
  const [confirmDel, setConfirmDel] = useState<Note | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const [moveOpen, setMoveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [quickTagName, setQuickTagName] = useState("");
  const [editorMode, setEditorMode] = useState<"visual" | "markdown" | "preview">("visual");

  const { canEdit, isOwner } = useShareAccess("note", selected?.id, selected?.user_id);

  const NOTES_CACHE_KEY = `notes:all:${user?.id}`;

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  // Load Folders & Tags
  useEffect(() => {
    if (!user) return;
    firebaseStore
      .from("folders")
      .select("id,name,color")
      .order("position")
      .then(({ data }) => setFolders((data || []) as FolderItem[]));

    firebaseStore
      .from("tags")
      .select("id,name,color")
      .order("name")
      .then(({ data }) => setTags((data || []) as TagItem[]));
  }, [user]);

  const applyNoteQueue = useCallback(
    async (base: Note[]): Promise<Note[]> => {
      if (!user?.id) return base;
      return projectQueuedNotes(base, await getPendingOps("notes"), user.id);
    },
    [user?.id]
  );

  const load = useCallback(async () => {
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
        const { data, error } = await firebaseStore
          .from("notes")
          .select("*")
          .is("task_id", null)
          .order("pinned", { ascending: false })
          .order("updated_at", { ascending: false });
        if (!error && data && data.length) {
          base = ((data || []) as unknown) as Note[];
          await cacheSet(NOTES_CACHE_KEY, base);
        }
      } catch {}
    }
    const merged = await applyNoteQueue(base);
    setNotes(merged);
  }, [user, NOTES_CACHE_KEY, applyNoteQueue]);

  useEffect(() => {
    if (!user) return;
    load();
    const fsUnsub = subscribeNotes(user.id, async (fsNotes) => {
      const merged = await applyNoteQueue((fsNotes || []) as Note[]);
      setNotes(merged);
      await cacheSet(NOTES_CACHE_KEY, merged);
    });
    const ch = firebaseStore
      .channel("notes-list")
      .on("postgres_changes", { event: "*", schema: "public", table: "notes" }, load)
      .subscribe();
    return () => {
      fsUnsub();
      firebaseStore.removeChannel(ch);
    };
  }, [user, load, NOTES_CACHE_KEY, applyNoteQueue]);

  const preselectId = searchParams.get("select");
  useEffect(() => {
    if (!preselectId || notes.length === 0) return;
    const found = notes.find((n) => n.id === preselectId);
    if (found) {
      setSelected(found);
      setDraft({ html: markdownToHtml(found.content || ""), md: found.content || "" });
    }
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselectId, notes]);

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }
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
      folder_id: selectedFolder && selectedFolder !== "__none__" ? selectedFolder : null,
      tag_ids: selectedTag ? [selectedTag] : [],
    };
    setNotes((prev) => [note, ...prev]);
    setSelected(note);
    setDraft({ html: "", md: "" });

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const queued = await upsertNote(user.id, note);
      if (!queued) {
        toast.error(T("نوت ذخیره نشد؛ در ویرایشگر باز می‌ماند تا دوباره تلاش کنید", "Note was not saved; it will stay open so you can retry"));
        return;
      }
      await cacheSet(NOTES_CACHE_KEY, [note, ...notes]);
      toast.info(T("نوت ذخیره شد؛ با اتصال اینترنت همگام می‌شود", "Note saved — will sync when online"));
      return;
    }

    let saved = false;
    try {
      saved = await upsertNote(user.id, note);
    } catch {}
    if (!saved) {
      toast.error(T("نوت ذخیره نشد؛ در ویرایشگر باز می‌ماند تا دوباره تلاش کنید", "Note was not saved; it will stay open so you can retry"));
      return;
    }
    await cacheSet(NOTES_CACHE_KEY, [note, ...notes.filter((n) => n.id !== note.id)]);
    window.dispatchEvent(new Event("notes-changed"));
    toast.success(T("نوت جدید ایجاد و همگام شد", "New note created and synced"));
  };

  // Check URL params for quick actions (?new=1, ?folder=xyz, ?tag=xyz)
  useEffect(() => {
    const shouldNew = searchParams.get("new");
    if (shouldNew === "1" || shouldNew === "true") {
      void create();
      const next = new URLSearchParams(searchParams);
      next.delete("new");
      setSearchParams(next, { replace: true });
    }
    const folderP = searchParams.get("folder");
    if (folderP) setSelectedFolder(folderP);
    const tagP = searchParams.get("tag");
    if (tagP) setSelectedTag(tagP);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const save = async (patch: Partial<Note>): Promise<boolean> => {
    if (!selected) return false;
    if (!user) {
      toast.error(T("برای ذخیره وارد حساب شوید", "Sign in to save this note"));
      return false;
    }
    if (!canEdit) {
      toast(T("دسترسی ویرایش ندارید", "You don't have edit permission"));
      return false;
    }
    const updated = { ...selected, ...patch, updated_at: new Date().toISOString() };
    setSelected(updated);
    setNotes((prev) => prev.map((n) => (n.id === selected.id ? updated : n)));
    const nextNotes = notes.map((n) => (n.id === selected.id ? updated : n));
    const saved = await upsertNote(user.id, updated);
    if (!saved) {
      toast.error(T("تغییر ذخیره نشد؛ متن در ویرایشگر باقی است و دوباره تلاش کنید", "Change was not saved; the text remains in the editor. Please retry"));
      return false;
    }
    await cacheSet(NOTES_CACHE_KEY, nextNotes);
    window.dispatchEvent(new Event("notes-changed"));
    return true;
  };

  useEffect(() => {
    if (!draft || !selected) return;
    const t = setTimeout(() => {
      save({ content: draft.md });
    }, 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [draft?.md]);

  const del = async (id: string) => {
    const note = notes.find((n) => n.id === id);
    if (!user) {
      toast.error(T("برای حذف وارد حساب شوید", "Sign in to delete this note"));
      return;
    }
    if (note && note.user_id !== user?.id) {
      toast(T("فقط صاحب نوت می‌تواند حذف کند", "Only the note owner can delete"));
      return;
    }
    const previous = [...notes];
    setNotes((prev) => prev.filter((n) => n.id !== id));
    await cacheSet(NOTES_CACHE_KEY, previous.filter((n) => n.id !== id));

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      const deleted = await fsDeleteNote(user.id, id);
      if (!deleted) {
        setNotes(previous);
        await cacheSet(NOTES_CACHE_KEY, previous);
        toast.error(T("حذف ذخیره نشد؛ نوت برگردانده شد", "Delete was not saved; the note was restored"));
        return;
      }
      await cacheSet(NOTES_CACHE_KEY, previous.filter((n) => n.id !== id));
      if (selected?.id === id) {
        setSelected(null);
        setDraft(null);
      }
      if (note) {
        const restore = async () => {
          const restored = await upsertNote(user.id, note);
          if (!restored) {
            toast.error(T("بازگردانی ذخیره نشد؛ دوباره تلاش کنید", "Restore was not saved; please try again"));
            return;
          }
          setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
          const cached = (await cacheGet<Note[]>(NOTES_CACHE_KEY)) || [];
          await cacheSet(NOTES_CACHE_KEY, [note, ...cached.filter((n) => n.id !== note.id)]);
        };
        pushUndo({ label: T(`نوت «${note.title || T("بدون عنوان", "Untitled")}» حذف شد`, `Note "${note.title || T("بدون عنوان", "Untitled")}" deleted`), undo: restore });
        pushDeleted({ kind: "note", label: note.title || T("بدون عنوان", "Untitled"), restore });
      }
      return;
    }

    const deleted = await fsDeleteNote(user.id, id);
    if (!deleted) {
      setNotes(previous);
      await cacheSet(NOTES_CACHE_KEY, previous);
      toast.error(T("حذف ذخیره نشد؛ نوت برگردانده شد", "Delete was not saved; the note was restored"));
      return;
    }
    await cacheSet(NOTES_CACHE_KEY, previous.filter((n) => n.id !== id));
    if (selected?.id === id) {
      setSelected(null);
      setDraft(null);
    }
    if (note) {
      const restore = async () => {
        const restored = await upsertNote(user.id, note);
        if (!restored) {
          toast.error(T("بازگردانی ذخیره نشد؛ دوباره تلاش کنید", "Restore was not saved; please try again"));
          return;
        }
        setNotes((prev) => [note, ...prev.filter((n) => n.id !== note.id)]);
        const cached = (await cacheGet<Note[]>(NOTES_CACHE_KEY)) || [];
        await cacheSet(NOTES_CACHE_KEY, [note, ...cached.filter((n) => n.id !== note.id)]);
      };
      pushUndo({ label: T(`نوت «${note.title || T("بدون عنوان", "Untitled")}» حذف شد`, `Note "${note.title || T("بدون عنوان", "Untitled")}" deleted`), undo: restore });
      pushDeleted({ kind: "note", label: note.title || T("بدون عنوان", "Untitled"), restore });
    }
  };

  const runNoteAI = async (action: string) => {
    if (!selected) return;
    if (!canEdit) {
      toast(T("دسترسی ویرایش ندارید", "You don't have edit permission"));
      return;
    }
    const md = (draft?.md ?? selected.content ?? "").trim();
    if (!md) return toast.error(T("نوت خالی است", "Note is empty"));
    setAiBusy(true);
    try {
      const r = await callAI("inline_edit", md, undefined, action, aiLang);
      const newMd = (r.text || "").trim();
      if (!newMd) throw new Error(T("نتیجه خالی", "Empty result"));
      setDraft({ md: newMd, html: markdownToHtml(newMd) });
      if (await save({ content: newMd })) toast.success(T("اعمال شد ✨", "Applied ✨"));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
    } finally {
      setAiBusy(false);
    }
  };

  const togglePin = async (n: Note) => {
    if (!user) {
      toast.error(T("برای تغییر سنجاق وارد حساب شوید", "Sign in to change the pin"));
      return;
    }
    const patch = { pinned: !n.pinned, updated_at: new Date().toISOString() };
    const updated = { ...n, ...patch };
    const next = notes.map((x) => (x.id === n.id ? updated : x));
    setNotes(next);
    if (selected?.id === n.id) setSelected(updated);
    const saved = await upsertNote(user.id, updated);
    if (!saved) {
      setNotes((current) => current.map((x) => (x.id === n.id ? n : x)));
      if (selected?.id === n.id) setSelected(n);
      const cached = (await cacheGet<Note[]>(NOTES_CACHE_KEY)) || notes;
      await cacheSet(NOTES_CACHE_KEY, cached.map((x) => (x.id === n.id ? n : x)));
      toast.error(T("تغییر سنجاق ذخیره نشد؛ به حالت قبلی برگشت", "Pin change was not saved; reverted to previous state"));
      return;
    }
    await cacheSet(NOTES_CACHE_KEY, next);
  };

  const handleCreateAndAttachTag = async () => {
    const trimmed = quickTagName.trim();
    if (!trimmed || !user || !selected) return;
    let targetTagId = "";
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      targetTagId = existing.id;
    } else {
      try {
        const { data, error } = await firebaseStore
          .from("tags")
          .insert({ user_id: user.id, name: trimmed, color: "#6366f1" })
          .select()
          .single();
        if (!error && data) {
          const created = data as TagItem;
          setTags((prev) => [...prev, created]);
          targetTagId = created.id;
        }
      } catch {}
    }

    if (targetTagId) {
      const cur = selected.tag_ids || [];
      if (!cur.includes(targetTagId)) {
        await save({ tag_ids: [...cur, targetTagId] });
      }
    }
    setQuickTagName("");
  };

  // Counts for Folders & Tags
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { __all__: 0, __none__: 0 };
    for (const n of notes) {
      if (n.kind === "diary") continue;
      counts.__all__++;
      if (!n.folder_id) counts.__none__ = (counts.__none__ || 0) + 1;
      else counts[n.folder_id] = (counts[n.folder_id] || 0) + 1;
    }
    return counts;
  }, [notes]);

  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of notes) {
      if (n.kind === "diary" || !n.tag_ids) continue;
      for (const tid of n.tag_ids) {
        counts[tid] = (counts[tid] || 0) + 1;
      }
    }
    return counts;
  }, [notes]);

  const searchLower = (search || "").toLowerCase();
  const filtered = useMemo(() => {
    return notes.filter((n) => {
      if (n.kind === "diary") return false;

      // 1. Text Search
      if (searchLower) {
        const matchesTitle = (n.title || "").toLowerCase().includes(searchLower);
        const matchesContent = (n.content || "").toLowerCase().includes(searchLower);
        if (!matchesTitle && !matchesContent) return false;
      }

      // 2. Folder filter
      if (selectedFolder === "__none__") {
        if (n.folder_id) return false;
      } else if (selectedFolder) {
        if (n.folder_id !== selectedFolder) return false;
      }

      // 3. Tag filter
      if (selectedTag) {
        if (!n.tag_ids || !n.tag_ids.includes(selectedTag)) return false;
      }

      return true;
    });
  }, [notes, searchLower, selectedFolder, selectedTag]);

  // Plain-preview helper (strip MD chars) for sidebar
  const stripMd = (s: string) => (s || "").replace(/[#*`>_![\]()~-]+/g, "").replace(/\n+/g, " ").slice(0, 80);

  const emptyState = (
    <div className="flex items-center justify-center h-full p-8">
      <EmptyState
        icon={FileText}
        title={T("یک نوت انتخاب کن یا جدید بساز", "Select a note or create a new one")}
        description={T(
          "ایده‌ها، یادداشت‌های کاری، چک‌لیست‌ها و افکارت رو ثبت و سازماندهی کن.",
          "Capture and organize ideas, work notes, checklists and thoughts."
        )}
        action={{
          label: T("نوت جدید", "New note"),
          icon: Plus,
          onClick: create,
        }}
        className="max-w-md w-full"
      />
    </div>
  );

  const currentFolder = selected?.folder_id ? folderMap.get(selected.folder_id) : null;

  const editor = selected ? (
    <div className="px-2 sm:px-4 py-1 w-full min-h-0 flex flex-col">
      {/* 1. Sleek, minimal Title & primary Actions row */}
      <div className="flex items-center gap-2 mb-1">
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
          placeholder={T("عنوان نوت...", "Note title...")}
          className="text-lg md:text-xl font-bold border-none focus-visible:ring-0 px-0 flex-1 min-w-[100px] py-0.5 leading-snug bg-transparent resize-none shadow-none text-foreground placeholder:text-muted-foreground/40"
          dir="auto"
          rows={1}
          minHeight={32}
          maxHeight={120}
        />

        {/* Minimal inline actions cluster */}
        <div className="flex items-center gap-0.5 shrink-0">
          <VoiceInputButton
            onTranscript={(text) => save({ title: selected.title ? selected.title.trimEnd() + " " + text : text })}
            disabled={!canEdit}
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
            title={T("تایپ صوتی عنوان", "Voice input for title")}
          />

          <Button
            size="icon"
            variant="ghost"
            onClick={() => save({ pinned: !selected.pinned })}
            disabled={!canEdit}
            className={`h-7 w-7 rounded-lg ${
              selected.pinned
                ? "text-primary fill-primary hover:text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={selected.pinned ? T("حذف سنجاق", "Unpin") : T("سنجاق کردن نوت", "Pin note")}
          >
            <Pin className={`w-3.5 h-3.5 ${selected.pinned ? "fill-primary" : ""}`} />
          </Button>

          {/* AI Tools menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs rounded-lg gap-1 text-primary bg-primary/10 hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                disabled={aiBusy || !canEdit}
              >
                {aiBusy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                <span>AI</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="max-h-[70vh] overflow-y-auto w-60">
              <div className="p-1 border-b">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] text-muted-foreground">
                  <span>{T("زبان خروجی AI", "AI Output Language")}</span>
                  <AILangToggle value={aiLang} onChange={setAiLang} />
                </div>
              </div>
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

          {/* More options menu (3-dots) */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg"
                title={T("گزینه‌های بیشتر", "More options")}
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              {isFeatureEnabled("sharing") && (
                <DropdownMenuItem onClick={() => setShareOpen(true)} disabled={!isOwner} className="gap-2">
                  <Share2 className="w-3.5 h-3.5" />
                  <span>{T("اشتراک‌گذاری", "Share")}</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setConfirmDel(selected)}
                disabled={!isOwner}
                className="gap-2 text-destructive focus:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{T("حذف نوت", "Delete note")}</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 2. Unified slim metadata strip: Folder + Tags + Type switcher */}
      <div className="flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-border/40 flex-wrap">
        {/* Left: Folder & Tags inline */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {/* Folder pill */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!canEdit}
                className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-full bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground transition border border-border/40 shrink-0 font-medium"
                title={T("تغییر پوشه", "Change folder")}
              >
                <FolderInput className="w-3 h-3 text-primary shrink-0" />
                {currentFolder ? (
                  <span className="flex items-center gap-1 max-w-[90px] truncate text-foreground">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: currentFolder.color || "#6366f1" }}
                    />
                    <span className="truncate">{currentFolder.name}</span>
                  </span>
                ) : (
                  <span className="text-muted-foreground/80">{T("بدون پوشه", "No folder")}</span>
                )}
                <ChevronDown className="w-2.5 h-2.5 opacity-50 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52 text-xs">
              <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                {T("انتقال به پوشه", "Move to folder")}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => save({ folder_id: null })}>
                <span>{T("📥 بدون پوشه (اینباکس)", "📥 No folder (Inbox)")}</span>
                {!selected.folder_id && <Check className="w-3.5 h-3.5 ms-auto text-primary" />}
              </DropdownMenuItem>
              {folders.map((f) => (
                <DropdownMenuItem key={f.id} onClick={() => save({ folder_id: f.id })}>
                  <span
                    className="w-2 h-2 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: f.color || "#6366f1" }}
                  />
                  <span className="truncate flex-1">{f.name}</span>
                  {selected.folder_id === f.id && <Check className="w-3.5 h-3.5 ms-auto text-primary" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Tags pills */}
          {(selected.tag_ids || []).map((tid) => {
            const tObj = tagMap.get(tid);
            return (
              <span
                key={tid}
                className="inline-flex items-center gap-1 h-6 px-2 text-[11px] rounded-full shrink-0 border"
                style={{
                  backgroundColor: tObj?.color ? `${tObj.color}15` : "var(--muted)",
                  color: tObj?.color || "inherit",
                  borderColor: tObj?.color ? `${tObj.color}35` : "transparent",
                }}
              >
                <span>#{tObj?.name || tid}</span>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const next = (selected.tag_ids || []).filter((x) => x !== tid);
                      save({ tag_ids: next });
                    }}
                    className="hover:opacity-75 p-0.5 -me-0.5 rounded-full"
                    title={T("حذف تگ", "Remove tag")}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            );
          })}

          {/* Add tag button */}
          {canEdit && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-0.5 h-6 px-1.5 text-[11px] rounded-full text-muted-foreground hover:text-foreground bg-muted/40 hover:bg-muted border border-dashed border-border/60 shrink-0 transition"
                  title={T("افزودن تگ", "Add tag")}
                >
                  <TagIcon className="w-2.5 h-2.5" />
                  <Plus className="w-2.5 h-2.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-52 max-h-64 overflow-y-auto text-xs">
                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                  {T("انتخاب تگ‌های نوت", "Select tags")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {tags.map((t) => {
                  const hasTag = (selected.tag_ids || []).includes(t.id);
                  return (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => {
                        const cur = selected.tag_ids || [];
                        const next = hasTag ? cur.filter((x) => x !== t.id) : [...cur, t.id];
                        save({ tag_ids: next });
                      }}
                    >
                      <span
                        className="w-2 h-2 rounded-full mr-2 shrink-0"
                        style={{ backgroundColor: t.color || "#6366f1" }}
                      />
                      <span className="truncate flex-1">{t.name}</span>
                      {hasTag && <Check className="w-3.5 h-3.5 ms-auto text-primary" />}
                    </DropdownMenuItem>
                  );
                })}
                <DropdownMenuSeparator />
                <div className="p-1.5">
                  <div className="flex items-center gap-1">
                    <Input
                      placeholder={T("تگ جدید...", "New tag...")}
                      value={quickTagName}
                      onChange={(e) => setQuickTagName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleCreateAndAttachTag();
                        }
                      }}
                      className="h-7 text-xs"
                    />
                    <Button size="sm" variant="ghost" onClick={handleCreateAndAttachTag} className="h-7 px-2 text-xs">
                      <Plus className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Right: Note Type Switcher ("انتخاب نوع نوت") */}
        <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => setEditorMode("visual")}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md transition font-medium ${
              editorMode === "visual"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={T("ویرایشگر بصری", "Visual editor")}
          >
            <BookOpen className="w-3 h-3" />
            <span>{T("ویژوال", "Visual")}</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("markdown")}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md transition font-medium ${
              editorMode === "markdown"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={T("کد خام مارک‌داون", "Raw Markdown")}
          >
            <FileCode className="w-3 h-3" />
            <span>MD</span>
          </button>
          <button
            type="button"
            onClick={() => setEditorMode("preview")}
            className={`flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md transition font-medium ${
              editorMode === "preview"
                ? "bg-background text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
            title={T("پیش‌نمایش نوت", "Preview note")}
          >
            <Eye className="w-3 h-3" />
            <span>{T("نمایش", "Preview")}</span>
          </button>
        </div>
      </div>

      <NoteEditorTabs
        noteId={selected.id}
        markdown={draft?.md ?? selected.content ?? ""}
        onChange={(md, html) => setDraft({ html, md })}
        readOnly={!canEdit}
        mode={editorMode}
        onModeChange={setEditorMode}
        hideTabsList={true}
      />
    </div>
  ) : null;

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Sidebar / Notes list panel */}
      <div className="md:w-84 border-s md:border-s border-e-0 md:border-e flex flex-col bg-card/30">
        <div dir="rtl" className="p-3 border-b space-y-2.5">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-base flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-primary" />
              <span>{T("نوت‌ها", "Notes")}</span>
            </h2>
            <Button size="sm" onClick={create} className="gap-1">
              <Plus className="w-4 h-4" />
              <span className="text-xs">{T("نوت جدید", "New")}</span>
            </Button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-2 top-2.5 text-muted-foreground" />
            <Input
              placeholder={T("جستجو در نوت‌ها...", "Search notes...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-8 h-9 text-xs"
              dir="auto"
            />
          </div>

          {/* Folder filter bar */}
          <div className="space-y-1">
            <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
              <span className="flex items-center gap-1">
                <FolderIcon className="w-3 h-3" />
                <span>{T("پوشه‌ها:", "Folders:")}</span>
              </span>
              {selectedFolder && (
                <button
                  type="button"
                  onClick={() => setSelectedFolder(null)}
                  className="text-[10px] text-primary hover:underline"
                >
                  {T("نمایش همه", "Show all")}
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
              <button
                type="button"
                onClick={() => setSelectedFolder(null)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  selectedFolder === null
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>{T("همه", "All")}</span>
                <span className="opacity-75 text-[10px]">({folderCounts.__all__ || 0})</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedFolder(selectedFolder === "__none__" ? null : "__none__")}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                  selectedFolder === "__none__"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "bg-muted/70 hover:bg-muted text-muted-foreground"
                }`}
              >
                <span>{T("بدون پوشه", "No folder")}</span>
                <span className="opacity-75 text-[10px]">({folderCounts.__none__ || 0})</span>
              </button>
              {folders.map((f) => {
                const count = folderCounts[f.id] || 0;
                const active = selectedFolder === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setSelectedFolder(active ? null : f.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: f.color || "#6366f1" }}
                    />
                    <span className="truncate max-w-[100px]">{f.name}</span>
                    <span className="opacity-75 text-[10px]">({count})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tags filter bar */}
          {tags.length > 0 && (
            <div className="space-y-1 pt-1 border-t border-border/40">
              <div className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <TagIcon className="w-3 h-3" />
                  <span>{T("تگ‌ها:", "Tags:")}</span>
                </span>
                {selectedTag && (
                  <button
                    type="button"
                    onClick={() => setSelectedTag(null)}
                    className="text-[10px] text-primary hover:underline"
                  >
                    {T("پاک‌سازی تگ", "Clear tag")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                {tags.map((t) => {
                  const count = tagCounts[t.id] || 0;
                  const active = selectedTag === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTag(active ? null : t.id)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium shrink-0 transition-all ${
                        active
                          ? "bg-foreground text-background shadow-xs"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || "#6366f1" }}
                      />
                      <span>#{t.name}</span>
                      <span className="opacity-70 text-[9px]">({count})</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 && (
            <div className="p-6 text-center text-muted-foreground text-xs leading-relaxed">
              {search || selectedFolder || selectedTag
                ? T("نوتی با این فیلترها یافت نشد.", "No notes found matching current filters.")
                : T("هنوز نوتی ننوشتی. با دکمه + بالا اولین نوتت رو بساز!", "No notes yet. Click + above to create your first note!")}
            </div>
          )}
          {filtered.map((n) => {
            const fItem = n.folder_id ? folderMap.get(n.folder_id) : null;
            return (
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
                  className="border-b bg-card transition-colors"
                  title={T("Drag روی فولدر سایدبار برای انتقال", "Drag onto a folder in the sidebar to move")}
                >
                  <div
                    className={`w-full text-end p-3 hover:bg-accent/40 transition flex items-start justify-between gap-2 ${
                      selected?.id === n.id ? "bg-accent/60" : ""
                    }`}
                  >
                    <button
                      onClick={() => {
                        setSelected(n);
                        setDraft({ html: markdownToHtml(n.content || ""), md: n.content || "" });
                      }}
                      className="flex-1 min-w-0 text-right cursor-grab active:cursor-grabbing"
                    >
                      <div className="flex items-center gap-1.5">
                        {n.pinned && <Pin className="w-3.5 h-3.5 text-primary shrink-0" />}
                        <BidiText as="span" text={n.title} className="font-medium text-sm truncate flex-1" />
                      </div>
                      <BidiText
                        as="p"
                        text={stripMd(n.content)}
                        className="text-xs text-muted-foreground mt-1 line-clamp-2 whitespace-pre-wrap break-words"
                      />

                      {/* Folder and Tag Pills on list item */}
                      {(fItem || (n.tag_ids && n.tag_ids.length > 0)) && (
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {fItem && (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded font-medium bg-muted/80 text-foreground"
                              title={fItem.name}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full"
                                style={{ backgroundColor: fItem.color || "#6366f1" }}
                              />
                              <span className="truncate max-w-[80px]">{fItem.name}</span>
                            </span>
                          )}
                          {(n.tag_ids || []).slice(0, 3).map((tid) => {
                            const tObj = tagMap.get(tid);
                            return (
                              <span
                                key={tid}
                                className="text-[10px] px-1.5 py-0.5 rounded text-muted-foreground bg-muted/50 font-normal"
                              >
                                #{tObj?.name || tid}
                              </span>
                            );
                          })}
                          {(n.tag_ids?.length || 0) > 3 && (
                            <span className="text-[9px] text-muted-foreground">
                              +{n.tag_ids!.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          onClick={(e) => e.stopPropagation()}
                          className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent/70 transition shrink-0"
                          title={T("عملیات نوت", "Note actions")}
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            void togglePin(n);
                          }}
                        >
                          {n.pinned ? (
                            <>
                              <PinOff className="w-4 h-4 mr-2 text-muted-foreground" />
                              <span>{T("برداشتن سنجاق", "Unpin note")}</span>
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 mr-2 text-primary" />
                              <span>{T("سنجاق کردن", "Pin note")}</span>
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelected(n);
                            setMoveOpen(true);
                          }}
                        >
                          <FolderInput className="w-4 h-4 mr-2 text-muted-foreground" />
                          <span>{T("انتقال به پوشه", "Move to folder")}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDel(n);
                          }}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          <span>{T("حذف نوت", "Delete note")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SwipeableRow>
            );
          })}
        </div>
      </div>

      {/* Editor Panel */}
      <div className="hidden md:flex flex-1 min-w-0 overflow-y-auto">
        {selected ? editor : emptyState}
      </div>

      {/* Mobile Drawer Editor */}
      {selected && isMobile && (
        <Drawer
          open={true}
          onOpenChange={(v) => !v && setSelected(null)}
          snapPoints={[0.55, 1]}
          activeSnapPoint={snap}
          setActiveSnapPoint={setSnap}
          shouldScaleBackground={false}
        >
          <DrawerContent className="max-h-[95vh] flex flex-col" aria-describedby="note-drawer-desc">
            <DrawerHeader className="sr-only">
              <DrawerTitle>{selected.title}</DrawerTitle>
            </DrawerHeader>
            <div className="flex items-center justify-end px-3 pt-3 pb-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setSnap(1)}
                title={T("فول اسکرین", "Full screen")}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                onClick={() => setSelected(null)}
                title={T("بستن", "Close")}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-4">{editor}</div>
            <p id="note-drawer-desc" className="sr-only">
              {T("جزئیات و ویرایش نوت", "Note details and editor")}
            </p>
          </DrawerContent>
        </Drawer>
      )}

      {/* Delete Confirmation */}
      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("حذف نوت؟", "Delete note?")}</AlertDialogTitle>
            <AlertDialogDescription>
              {T(
                `آیا مطمئنی می‌خوای «${confirmDel?.title || T("این مورد", "this item")}» را حذف کنی؟ این عمل قابل بازگشت نیست.`,
                `Are you sure you want to delete "${confirmDel?.title || T("این مورد", "this item")}"? This action cannot be undone.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (confirmDel) await del(confirmDel.id);
                setConfirmDel(null);
              }}
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
            onMoved={(fid) => {
              setSelected((prev) => (prev ? { ...prev, folder_id: fid } : null));
              load();
            }}
          />
          {isFeatureEnabled("sharing") && (
            <ShareDialog
              open={shareOpen}
              onOpenChange={setShareOpen}
              resourceType="note"
              resourceId={selected.id}
              resourceTitle={selected.title}
            />
          )}
        </>
      )}
    </div>
  );
}
