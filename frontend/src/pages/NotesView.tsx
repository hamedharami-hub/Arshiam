import { createDebouncedWrites, readNoteDraft, writeNoteDraft, clearNoteDraft, type NoteDraftRecord } from "@/lib/debouncedWrites";
import { useResizableSplit } from "@/hooks/useResizableSplit";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import { filterNotesForList, noteListPreview } from "@/lib/notesList";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { HeaderActionsPortal } from "@/components/HeaderActionsPortal";
import { useCallback, useEffect, useMemo, useState, useRef } from "react";
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
  Eye, PanelLeftClose, PanelLeftOpen, Minimize2, Inbox, ListPlus,
  Copy, Save,
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
import { Textarea } from "@/components/ui/textarea";
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
import { MetaTile } from "@/components/task-detail/MetaTile";
import { NoteEditorTabs } from "@/components/NoteEditorTabs";
import { NoteTaskLinkPills } from "@/components/NoteTaskLinkPills";
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getNoteTemplates, type NoteTemplate } from "@/lib/noteTemplates";
import { suggestNoteActionItem } from "@/lib/noteActionItems";
import { persistNoteActionItem } from "@/lib/noteActionItemService";
import { getNoteTaskLinks, type NoteTaskLink } from "@/lib/noteTaskLinkService";

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
type ActionItemDraft = { id: string; ownerId: string; noteId: string; createdAt: string; title: string; description: string };
type NoteAIProposal = { noteId: string; ownerId: string; baseRevision: number; action: string; md: string; html: string };

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
  const [noteTaskLinks, setNoteTaskLinks] = useState<NoteTaskLink[]>([]);
  const [linkedTaskTitles, setLinkedTaskTitles] = useState<Map<string, string>>(() => new Map());
  const notesRef = useRef(notes);
  notesRef.current = notes;
  const accountRef = useRef(user?.id);
  accountRef.current = user?.id;
  const [writes] = useState(() => createDebouncedWrites());
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null); // null = all, '__none__' = uncategorized, or folderId
  const [selectedTag, setSelectedTag] = useState<string | null>(null); // null = all, or tagId
  const [selected, setSelected] = useState<Note | null>(null);
  const [snap, setSnap] = useState<number | string>(0.55);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<{ html: string; md: string } | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [actionItemDraft, setActionItemDraft] = useState<ActionItemDraft | null>(null);
  const [creatingActionItem, setCreatingActionItem] = useState(false);
  const creatingActionItemRef = useRef(false);
  const [confirmDel, setConfirmDel] = useState<Note | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiProposal, setAiProposal] = useState<NoteAIProposal | null>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [contentRevision, setContentRevision] = useState(0);
  const [noteSaveState, setNoteSaveState] = useState<"idle" | "saving" | "device" | "failed">("idle");
  const contentRevisionRef = useRef(0);
  const noteRevisionsRef = useRef<Map<string, number>>(new Map());
  const selectedIdRef = useRef<string | undefined>(undefined);
  const durableCopyRef = useRef(true);
  const unsyncedEditsRef = useRef(false);
  const retainedEditsRef = useRef(new Map<string, { revision: number | undefined; durable: boolean }>());
  const pendingDraftsRef = useRef(new Map<string, NoteDraftRecord>());
  const [recoveryChoice, setRecoveryChoice] = useState<NoteDraftRecord | null>(null);
  const [recoveredPendingSave, setRecoveredPendingSave] = useState(false);
  const recoveredNoteRef = useRef<string | null>(null);
  const deviceWritesRef = useRef(new Map<string, Promise<unknown>>());
  const previousOwnerRef = useRef(user?.id);
  useEffect(() => {
    for (const noteId of pendingDraftsRef.current.keys()) writes.cancel(noteId);
    retainedEditsRef.current.clear();
    pendingDraftsRef.current.clear();
    noteRevisionsRef.current.clear();
    if (previousOwnerRef.current !== user?.id) { setSelected(null); setDraft(null); setNotes([]); }
    previousOwnerRef.current = user?.id;
  }, [user?.id, writes]);
  const aiControllerRef = useRef<AbortController | null>(null);
  selectedIdRef.current = selected?.id;
  const bumpContentRevision = useCallback(() => {
    contentRevisionRef.current += 1;
    setContentRevision(contentRevisionRef.current);
    return contentRevisionRef.current;
  }, []);
  const [aiLang, setAiLang] = useState<AILanguage>(getAILanguage());
  const [moveOpen, setMoveOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [quickTagName, setQuickTagName] = useState("");
  const [editorMode, setEditorMode] = useState<"visual" | "markdown" | "preview">("visual");
  useEffect(() => {
    setSelectedText("");
    setActionItemDraft(null);
    setAiProposal(null);
    aiControllerRef.current?.abort();
    aiControllerRef.current = null;
    setAiBusy(false);
    setNoteSaveState("idle");
    durableCopyRef.current = true;
    unsyncedEditsRef.current = false;
    setRecoveryChoice(null);
    setRecoveredPendingSave(false);
    recoveredNoteRef.current = null;
    const pending = selected?.id ? pendingDraftsRef.current.get(selected.id) : undefined;
    if (pending) {
      durableCopyRef.current = retainedEditsRef.current.get(pending.noteId)?.durable ?? false;
      unsyncedEditsRef.current = true;
      setNoteSaveState(durableCopyRef.current ? "device" : "failed");
    }
  }, [selected?.id, user?.id]);

  // Recover a device-only draft that was retained when the cloud write failed.
  useEffect(() => {
    const noteId = selected?.id;
    const accountId = user?.id;
    if (!noteId || !accountId) return;
    let active = true;
    const revisionAtStart = contentRevisionRef.current;
    void readNoteDraft(accountId, noteId).then((record) => {
      if (!active || accountRef.current !== accountId || selectedIdRef.current !== noteId) return;
      if (contentRevisionRef.current !== revisionAtStart) return; // newer typing wins
      const note = notesRef.current.find((item) => item.id === noteId);
      if (record && (record.md !== (note?.content ?? "") || (record.title !== undefined && record.title !== note?.title))) {
        // Recovery is a choice, never an unsolicited write over the current cloud copy.
        setRecoveryChoice(record);
      }
    }).catch(() => undefined);
    return () => { active = false; };
  }, [selected?.id, user?.id, bumpContentRevision]);

  useRecoverableExit(
    () => [...retainedEditsRef.current.values()].some((edit) => !edit.durable),
    T("نسخه‌ای از تغییرات ذخیره نشده است. با خروج ممکن است متن از بین برود. ادامه می‌دهی؟", "These edits have no recoverable copy. Leaving may lose your text. Continue?"),
  );
  // Folder / tag pickers open inline under the note header (one at a time; Escape closes).
  const [notePanel, setNotePanel] = useState<"folder" | "tags" | null>(null);
  useEffect(() => {
    if (!notePanel) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setNotePanel(null); } };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [notePanel]);

  const [listHidden, setListHidden] = useState(() => { try { return localStorage.getItem("notes-list-hidden") === "true"; } catch { return false; } });
  const [fullScreen, setFullScreen] = useState(false);
  const { splitRatio, containerRef, handlePointerDown, handlePointerMove, handlePointerUp } = useResizableSplit({
    storageKey: "notes-list-ratio", direction: isEn ? "ltr" : "rtl", defaultRatio: 30, minRatio: 18, maxRatio: 55,
  });
  const toggleList = () => setListHidden((current) => {
    const next = !current;
    try { localStorage.setItem("notes-list-hidden", String(next)); } catch { /* Keep the session preference. */ }
    return next;
  });
  useEffect(() => {
    if (!fullScreen) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setFullScreen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [fullScreen]);

  const { canEdit, isOwner } = useShareAccess("note", selected?.id, selected?.user_id);

  const NOTES_CACHE_KEY = `notes:all:${user?.id}`;

  const folderMap = useMemo(() => new Map(folders.map((f) => [f.id, f])), [folders]);
  const tagMap = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags]);

  const taskIdsByNote = useMemo(() => {
    const linked = new Map<string, string[]>();
    const add = (noteId: string, taskId: string) => {
      const taskIds = linked.get(noteId) || [];
      if (!taskIds.includes(taskId)) linked.set(noteId, [...taskIds, taskId]);
    };
    for (const link of noteTaskLinks) add(link.note_id, link.task_id);
    // Older notes used a single task_id column instead of note_task_links.
    for (const note of notes) if (note.task_id) add(note.id, note.task_id);
    return linked;
  }, [notes, noteTaskLinks]);

  const linkedTaskIds = useMemo(() => [...new Set([
    ...noteTaskLinks.map((link) => link.task_id),
    ...notes.map((note) => note.task_id).filter((taskId): taskId is string => Boolean(taskId)),
  ].filter(Boolean))], [notes, noteTaskLinks]);

  useEffect(() => {
    const ownerId = user?.id;
    if (!ownerId) {
      setNoteTaskLinks([]);
      setLinkedTaskTitles(new Map());
      return;
    }

    let active = true;
    setNoteTaskLinks([]);
    setLinkedTaskTitles(new Map());
    void getNoteTaskLinks(ownerId)
      .then((links) => { if (active) setNoteTaskLinks(links.filter((link) => link.user_id === ownerId)); })
      .catch(() => undefined);

    return () => { active = false; };
  }, [user?.id]);

  useEffect(() => {
    const ownerId = user?.id;
    if (!ownerId || !linkedTaskIds.length) { setLinkedTaskTitles(new Map()); return; }
    let active = true;
    void (async () => {
      try {
        const titles = new Map<string, string>();
        for (let index = 0; index < linkedTaskIds.length; index += 100) {
          const { data, error } = await firebaseStore
            .from("tasks")
            .select("id,title")
            .eq("user_id", ownerId)
            .in("id", linkedTaskIds.slice(index, index + 100));
          if (!active) return;
          if (!error) for (const task of (data || []) as Array<{ id: string; title: string }>) titles.set(task.id, task.title);
        }
        if (active) setLinkedTaskTitles(titles);
      } catch {
        // Keep the links visible with a generic label when task titles are unavailable.
      }
    })();
    return () => { active = false; };
  }, [user?.id, linkedTaskIds]);

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
    const ownerId = user.id;
    let base = (await cacheGet<Note[]>(NOTES_CACHE_KEY)) || [];
    // 1. Try Firebase Firestore
    try {
      const { liveRows } = await import("@/lib/firestoreLive");
      let items = (await liveRows(user.id, "notes")) as Note[] | null;
      if (!items) {
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        const snap = await getDocs(collection(db, "users", user.id, "notes"));
        items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      }
      if (items.length) {
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
    if (accountRef.current !== ownerId) return;
    setNotes(merged);
  }, [user, NOTES_CACHE_KEY, applyNoteQueue]);

  useEffect(() => {
    if (!user) return;
    load();
    const fsUnsub = subscribeNotes(user.id, async (fsNotes) => {
      const merged = await applyNoteQueue((fsNotes || []) as Note[]);
      if (accountRef.current !== user.id) return;
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

  const create = async (template?: Pick<NoteTemplate, "title" | "content">) => {
    if (!user) return;
    const initialContent = template?.content || "";
    const note: Note = {
      id: generateId(),
      user_id: user.id,
      title: template?.title || T("نوت جدید", "New note"),
      content: initialContent,
      pinned: false,
      updated_at: new Date().toISOString(),
      task_id: null,
      folder_id: selectedFolder && selectedFolder !== "__none__" ? selectedFolder : null,
      tag_ids: selectedTag ? [selectedTag] : [],
    };
    setNotes((prev) => [note, ...prev]);
    setSelected(note);
    setDraft({ html: markdownToHtml(initialContent), md: initialContent });
    setSelectedText("");

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

  const openActionItemDraft = () => {
    if (!user) {
      toast.error(T("برای ساخت تسک وارد حساب شوید", "Sign in to create a task"));
      return;
    }
    const suggestion = suggestNoteActionItem(selectedText);
    if (!suggestion) {
      toast.error(T("ابتدا بخشی از متن را انتخاب کن", "Select some text first"));
      return;
    }
    if (!selected) return;
    setActionItemDraft({ id: generateId(), ownerId: user.id, noteId: selected.id, createdAt: new Date().toISOString(), ...suggestion });
  };

  const createActionItem = async () => {
    const pendingDraft = actionItemDraft;
    const ownerId = user?.id;
    const title = pendingDraft?.title.trim();
    if (!pendingDraft || !ownerId || ownerId !== pendingDraft.ownerId || !title || creatingActionItemRef.current) return;
    creatingActionItemRef.current = true;
    setCreatingActionItem(true);
    try {
      const result = await persistNoteActionItem({ ...pendingDraft, title });
      if (accountRef.current !== pendingDraft.ownerId) return;
      if (result === "failed") {
        toast.error(T("تسک ذخیره نشد؛ پیش‌نویس باز می‌ماند تا دوباره تلاش کنی", "Task was not saved. The draft is still open so you can retry."));
        return;
      }
      window.dispatchEvent(new Event("tasks-changed"));
      setActionItemDraft(null);
      setSelectedText("");
      toast[result === "queued" ? "info" : "success"](
        result === "queued"
          ? T("تسک در صف همگام‌سازی ذخیره شد", "Task saved and queued to sync")
          : T("تسک ساخته شد", "Task created"),
      );
    } catch {
      if (accountRef.current === pendingDraft.ownerId) {
        toast.error(T("تسک ذخیره نشد؛ پیش‌نویس باز می‌ماند تا دوباره تلاش کنی", "Task was not saved. The draft is still open so you can retry."));
      }
    } finally {
      creatingActionItemRef.current = false;
      setCreatingActionItem(false);
    }
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

  const persistNote = async (target: Note, patch: Partial<Note>, accountId: string, editable: boolean): Promise<boolean> => {
    if (accountRef.current !== accountId || !editable) return false;
    const latest = notesRef.current.find(note => note.id === target.id) ?? target;
    const updated = { ...latest, ...patch, updated_at: new Date().toISOString() };
    const nextNotes = notesRef.current.map(note => note.id === target.id ? updated : note);
    notesRef.current = nextNotes;
    setNotes(nextNotes);
    setSelected(current => current?.id === target.id ? { ...current, ...patch, updated_at: updated.updated_at } : current);
    try {
      const saved = await upsertNote(accountId, updated);
      if (!saved) throw new Error("Save failed");
      if (accountRef.current !== accountId) return true;
      await cacheSet(NOTES_CACHE_KEY, notesRef.current);
      window.dispatchEvent(new Event("notes-changed"));
      return true;
    } catch {
      if (accountRef.current === accountId) toast.error(T("تغییر ذخیره نشد؛ متن در نوت باقی است و دوباره تلاش کنید", "Change was not saved; the text remains in the note. Please retry"));
      return false;
    }
  };

  const save = async (patch: Partial<Note>): Promise<boolean> => {
    if (!selected || !user || !canEdit) return false;
    await writes.flush(selected.id);
    return persistNote(selected, patch, user.id, canEdit);
  };

  // Title edits update the screen at once and reach the cloud after typing pauses.
  const saveTitleSoon = (title: string) => {
    if (!selected || !user || !canEdit || recoveryChoice) return;
    const target = selected;
    const accountId = user.id;
    const md = draft?.md ?? target.content ?? "";
    const html = draft?.html ?? markdownToHtml(md);
    const revision = bumpContentRevision();
    noteRevisionsRef.current.set(target.id, revision);
    unsyncedEditsRef.current = true;
    setSelected(current => current?.id === target.id ? { ...current, title } : current);
    stageLocalDraft(target.id, accountId, md, html, title);
    scheduleCloudContent(target.id, accountId, md, target, revision);
  };

  // Flush the previous document before its editor disappears; writes retain their own record/account.
  useEffect(() => {
    const id = selected?.id;
    return () => { if (id) { void writes.flush(id).catch(() => undefined); void writes.flush(`${id}:title`).catch(() => undefined); } };
  }, [selected?.id, writes]);
  useEffect(() => () => { void writes.flushAll(); }, [writes]);

  const del = async (id: string) => {
    writes.cancel(id);
    writes.cancel(`${id}:title`);
    await writes.settle(id).catch(() => undefined);
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
      retainedEditsRef.current.delete(id);
       pendingDraftsRef.current.delete(id);
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
    retainedEditsRef.current.delete(id);
    pendingDraftsRef.current.delete(id);
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

  // Write the device-only copy first so a failed cloud write never loses text.
  const stageLocalDraft = (noteId: string, accountId: string, md: string, html: string, title?: string) => {
    durableCopyRef.current = false;
    const revision = noteRevisionsRef.current.get(noteId);
    retainedEditsRef.current.set(noteId, { revision, durable: false });
    const previous = pendingDraftsRef.current.get(noteId);
    const target = selected?.id === noteId ? selected : notesRef.current.find(note => note.id === noteId);
    const record: NoteDraftRecord = {
      accountId, noteId, md, html, title: title ?? previous?.title ?? target?.title ?? "", revision, updatedAt: Date.now(),
      base: previous?.base ?? { title: target?.title ?? "", md: target?.content ?? "", updatedAt: target?.updated_at },
    };
    pendingDraftsRef.current.set(noteId, record);
    setNoteSaveState("saving");
    const deviceKey = `${accountId}:${noteId}`;
    const operation = (deviceWritesRef.current.get(deviceKey) ?? Promise.resolve()).catch(() => undefined)
      .then(() => writeNoteDraft(record));
    deviceWritesRef.current.set(deviceKey, operation);
    void operation.then((durable) => {
      if (accountRef.current !== accountId) return;
      const pending = retainedEditsRef.current.get(noteId);
      if (pending && pending.revision === revision) pending.durable = durable;
      if (selectedIdRef.current !== noteId) return;
      if (noteRevisionsRef.current.get(noteId) !== revision || !unsyncedEditsRef.current) return;
      durableCopyRef.current = durable;
      setNoteSaveState(durable ? "device" : "failed");
    }).catch(() => {
      if (accountRef.current === accountId && selectedIdRef.current === noteId && noteRevisionsRef.current.get(noteId) === revision && unsyncedEditsRef.current) {
        durableCopyRef.current = false;
        setNoteSaveState("failed");
      }
    });
  };

  // Debounced cloud write; the draft clears only for the newest acknowledged revision.
  const scheduleCloudContent = (noteId: string, accountId: string, md: string, target: Note, revision: number, explicitlySaveRecovery = false) => {
    if (recoveredNoteRef.current === noteId && !explicitlySaveRecovery) return;
    const record = pendingDraftsRef.current.get(noteId);
    writes.schedule(noteId, async () => {
      if (accountRef.current !== accountId || noteRevisionsRef.current.get(noteId) !== revision) return true;
      const saved = await persistNote(target, { content: md, title: record?.title ?? target.title }, accountId, true);
      if (accountRef.current !== accountId) return saved;
      if (saved && noteRevisionsRef.current.get(noteId) === revision) {
        // Serialize removal with retention writes: an old acknowledgement must
        // not erase a newer device draft written while deletion is in flight.
        const deviceKey = `${accountId}:${noteId}`;
        const clear = (deviceWritesRef.current.get(deviceKey) ?? Promise.resolve()).catch(() => undefined).then(async () => {
          if (accountRef.current === accountId && noteRevisionsRef.current.get(noteId) === revision) await clearNoteDraft(accountId, noteId);
        });
        deviceWritesRef.current.set(deviceKey, clear);
        await clear;
        if (accountRef.current !== accountId || noteRevisionsRef.current.get(noteId) !== revision) return saved;
        retainedEditsRef.current.delete(noteId);
        pendingDraftsRef.current.delete(noteId);
        if (selectedIdRef.current === noteId) {
          durableCopyRef.current = true;
          unsyncedEditsRef.current = false;
          setNoteSaveState("idle");
          recoveredNoteRef.current = null;
          setRecoveredPendingSave(false);
        }
      } else if (!saved && selectedIdRef.current === noteId && noteRevisionsRef.current.get(noteId) === revision) {
        setNoteSaveState("failed");
      }
      return saved;
    });
  };

  const retryNoteSave = () => {
    if (!selected || !user || !canEdit) return;
    const noteId = selected.id;
    const accountId = user.id;
    const md = draft?.md ?? selected.content ?? "";
    const html = draft?.html ?? markdownToHtml(md);
    const target = notesRef.current.find((item) => item.id === noteId) ?? selected;
    const revision = bumpContentRevision();
    noteRevisionsRef.current.set(noteId, revision);
    unsyncedEditsRef.current = true;
    stageLocalDraft(noteId, accountId, md, html);
    scheduleCloudContent(noteId, accountId, md, target, revision, true);
  };

  const useDeviceDraft = () => {
    const record = recoveryChoice;
    if (!record || !selected || record.accountId !== user?.id || record.noteId !== selected.id) return;
    const revision = bumpContentRevision();
    noteRevisionsRef.current.set(record.noteId, revision);
    pendingDraftsRef.current.set(record.noteId, { ...record, revision });
    retainedEditsRef.current.set(record.noteId, { revision, durable: true });
    setSelected(current => current?.id === record.noteId ? { ...current, title: record.title ?? current.title, content: record.md } : current);
    setDraft({ md: record.md, html: record.html });
    setEditorRevision(value => value + 1);
    durableCopyRef.current = true;
    unsyncedEditsRef.current = true;
    recoveredNoteRef.current = record.noteId;
    setRecoveredPendingSave(true);
    setNoteSaveState("device");
    setRecoveryChoice(null);
    // Keep the cloud copy untouched until the explicit Save recovered draft action.
  };

  const copyDraft = async () => {
    try {
      await navigator.clipboard.writeText(`${selected?.title ?? ""}\n\n${draft?.md ?? selected?.content ?? ""}`);
      toast.success(T("کپی شد", "Copied"));
    } catch {
      toast.error(T("کپی نشد", "Copy failed"));
    }
  };

  const runNoteAI = async (action: string) => {
    if (!selected) return;
    if (!canEdit) {
      toast(T("دسترسی ویرایش ندارید", "You don't have edit permission"));
      return;
    }
    const ownerId = user?.id;
    if (!ownerId) return;
    const noteId = selected.id;
    const baseRevision = contentRevisionRef.current;
    const md = (draft?.md ?? selected.content ?? "").trim();
    if (!md) return toast.error(T("نوت خالی است", "Note is empty"));
    aiControllerRef.current?.abort();
    const controller = new AbortController();
    aiControllerRef.current = controller;
    setAiBusy(true);
    setAiProposal(null);
    try {
      const r = await callAI("inline_edit", md, undefined, action, aiLang, { signal: controller.signal });
      if (controller.signal.aborted || aiControllerRef.current !== controller) return;
      if (accountRef.current !== ownerId || selectedIdRef.current !== noteId) return;
      const newMd = (r.text || "").trim();
      if (!newMd) throw new Error(T("نتیجه خالی", "Empty result"));
      // Reviewable proposal: nothing is written until Apply.
      setAiProposal({ noteId, ownerId, baseRevision, action, md: newMd, html: markdownToHtml(newMd) });
    } catch (e) {
      if (!(e instanceof Error && e.name === "AbortError") && accountRef.current === ownerId) {
        toast.error(e instanceof Error ? e.message : T("خطا", "Error"));
      }
    } finally {
      if (aiControllerRef.current === controller) {
        aiControllerRef.current = null;
        setAiBusy(false);
      }
    }
  };

  const applyAiProposal = () => {
    const proposal = aiProposal;
    if (!proposal || !selected) return;
    if (accountRef.current !== proposal.ownerId || selected.id !== proposal.noteId) {
      setAiProposal(null);
      toast(T("نوت تغییر کرده؛ پیشنهاد لغو شد", "The note changed; the suggestion was discarded"));
      return;
    }
    if (contentRevisionRef.current !== proposal.baseRevision) {
      toast.error(T("از زمان ساخت پیشنهاد، متن تغییر کرده؛ دوباره تولید کن", "The text changed since this suggestion was created; regenerate it."));
      return;
    }
    setAiProposal(null);
    const { noteId, ownerId, md, html } = proposal;
    setDraft({ md, html });
    setEditorRevision((current) => current + 1);
    const nextNotes = notesRef.current.map((note) => note.id === noteId ? { ...note, content: md } : note);
    notesRef.current = nextNotes;
    setNotes(nextNotes);
    setSelected((current) => current?.id === noteId ? { ...current, content: md } : current);
    const target = nextNotes.find((note) => note.id === noteId) ?? selected;
    const revision = bumpContentRevision();
    noteRevisionsRef.current.set(noteId, revision);
    unsyncedEditsRef.current = true;
    stageLocalDraft(noteId, ownerId, md, html);
    scheduleCloudContent(noteId, ownerId, md, target, revision);
    toast.success(T("اعمال شد ✨", "Applied ✨"));
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
          .insert({ user_id: user.id, name: trimmed, color: "hsl(var(--primary))" })
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

  const filtered = useMemo(
    () => filterNotesForList(notes, search, selectedFolder, selectedTag),
    [notes, search, selectedFolder, selectedTag],
  );
  const [visibleNoteCount, setVisibleNoteCount] = useState(50);
  useEffect(() => { setVisibleNoteCount(50); }, [search, selectedFolder, selectedTag]);
  const previewCacheRef = useRef(new Map<string, { content: string; preview: string }>());
  const notePreview = (note: Note) => {
    const cached = previewCacheRef.current.get(note.id);
    if (cached?.content === note.content) return cached.preview;
    const preview = noteListPreview(note.content);
    previewCacheRef.current.set(note.id, { content: note.content, preview });
    return preview;
  };
  useEffect(() => {
    const ids = new Set(notes.map((note) => note.id));
    for (const id of previewCacheRef.current.keys()) if (!ids.has(id)) previewCacheRef.current.delete(id);
  }, [notes]);

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

  const proposalStale = aiProposal !== null && contentRevision !== aiProposal.baseRevision;

  const editor = selected ? (
    <div className="px-2 sm:px-4 py-1 w-full min-h-0 flex flex-col">
      {/* 1. Sleek, minimal Title & primary Actions row */}
      <div className="flex items-center gap-2 mb-1">
        <AutoTextarea
          value={selected.title}
          onChange={(e) => saveTitleSoon(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              (e.currentTarget as HTMLTextAreaElement).blur();
            }
          }}
          disabled={!canEdit || Boolean(recoveryChoice)}
          aria-label={T("عنوان نوت", "Note title")}
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
            onTranscript={(text) => saveTitleSoon(selected.title ? selected.title.trimEnd() + " " + text : text)}
            disabled={!canEdit || Boolean(recoveryChoice)}
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
              <DropdownMenuItem onClick={openActionItemDraft} disabled={!user || !selectedText.trim()} className="gap-2">
                <ListPlus className="w-3.5 h-3.5" />
                <span>{T("تبدیل متن انتخاب‌شده به تسک", "Turn selected text into a task")}</span>
              </DropdownMenuItem>
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
          <MetaTile icon={currentFolder ? FolderIcon : Inbox} label={T("پوشه", "Folder")} value={currentFolder ? currentFolder.name : null}
            active={!!currentFolder} open={notePanel === "folder"} aria-expanded={notePanel === "folder"} disabled={!canEdit}
            iconStyle={currentFolder?.color ? { color: currentFolder.color } : undefined}
            onClick={() => setNotePanel(notePanel === "folder" ? null : "folder")} data-testid="note-meta-folder" />
          <MetaTile icon={TagIcon} label={T("برچسب", "Tags")}
            value={(selected.tag_ids || []).length ? (selected.tag_ids || []).map((tid) => tagMap.get(tid)?.name || tid).join(isEn ? ", " : "، ") : null}
            active={(selected.tag_ids || []).length > 0} open={notePanel === "tags"} aria-expanded={notePanel === "tags"} disabled={!canEdit}
            onClick={() => setNotePanel(notePanel === "tags" ? null : "tags")} data-testid="note-meta-tags" />
          <NoteTaskLinkPills taskIds={taskIdsByNote.get(selected.id) || []} taskTitles={linkedTaskTitles} />
        </div>

        {/* Right: Note Type Switcher ("انتخاب نوع نوت") */}
        <div className="flex items-center p-0.5 rounded-lg bg-muted/50 border border-border/40 shrink-0">
          <button
            type="button"
            onClick={() => { setSelectedText(""); setEditorMode("visual"); }}
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
            onClick={() => { setSelectedText(""); setEditorMode("markdown"); }}
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
            onClick={() => { setSelectedText(""); setEditorMode("preview"); }}
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

      {notePanel && canEdit && (
        <div className="mb-2 rounded-lg border border-border/70 bg-card p-2.5 shadow-sm" role="region" data-testid="note-inline-panel" data-panel={notePanel}
          aria-label={notePanel === "folder" ? T("پوشه", "Folder") : T("برچسب", "Tags")}>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{notePanel === "folder" ? T("پوشه", "Folder") : T("برچسب", "Tags")}</span>
            <button type="button" onClick={() => setNotePanel(null)} aria-label={T("بستن", "Close")} data-testid="note-inline-panel-close"
              className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><X className="h-3.5 w-3.5" /></button>
          </div>
          <div className="max-h-[min(45dvh,18rem)] space-y-0.5 overflow-y-auto overscroll-contain">
            {notePanel === "folder" ? (
              <>
                {[{ id: null as string | null, name: T("بدون پوشه", "No folder"), color: undefined as string | undefined }, ...folders.map((f) => ({ id: f.id as string | null, name: f.name, color: f.color as string | undefined }))].map((f) => {
                  const active = (selected.folder_id ?? null) === f.id;
                  return (
                    <button key={f.id ?? "none"} type="button" onClick={() => { save({ folder_id: f.id }); setNotePanel(null); }} aria-pressed={active}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition-colors ${active ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}
                      data-testid={`note-folder-option-${f.id ?? "none"}`}>
                      {f.id ? <FolderIcon className="h-4 w-4 shrink-0" style={{ color: f.color || undefined }} /> : <Inbox className="h-4 w-4 shrink-0" />}
                      <span className="min-w-0 flex-1 truncate text-start"><bdi>{f.name}</bdi></span>
                      {active && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </>
            ) : (
              <>
                <div className="mb-1 flex items-center gap-1 rounded-md bg-muted/40 p-1">
                  <Input placeholder={T("برچسب تازه…", "New tag…")} value={quickTagName} onChange={(e) => setQuickTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreateAndAttachTag(); } }}
                    className="h-8 border-0 bg-transparent text-sm focus-visible:ring-0" data-testid="note-tag-create-input" />
                  <Button size="icon" variant="ghost" onClick={handleCreateAndAttachTag} disabled={!quickTagName.trim()} className="h-7 w-7" data-testid="note-tag-create-submit"><Plus className="h-4 w-4" /></Button>
                </div>
                {tags.length === 0 && <p className="px-2.5 py-1.5 text-xs text-muted-foreground">{T("هنوز برچسبی نساخته‌ای.", "No tags yet.")}</p>}
                {tags.map((tg) => {
                  const hasTag = (selected.tag_ids || []).includes(tg.id);
                  return (
                    <button key={tg.id} type="button" aria-pressed={hasTag} data-testid={`note-tag-option-${tg.id}`}
                      onClick={() => { const cur = selected.tag_ids || []; save({ tag_ids: hasTag ? cur.filter((x) => x !== tg.id) : [...cur, tg.id] }); }}
                      className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-start text-sm transition-colors ${hasTag ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: tg.color || "hsl(var(--primary))" }} />
                      <span className="min-w-0 flex-1 truncate text-start"><bdi>{tg.name}</bdi></span>
                      {hasTag && <Check className="h-4 w-4 shrink-0" />}
                    </button>
                  );
                })}
              </>
            )}
          </div>
        </div>
      )}

      {recoveryChoice && recoveryChoice.accountId === user?.id && recoveryChoice.noteId === selected.id && (
        <section role="region" aria-label={T("بازیابی پیش‌نویس نوت", "Recover note draft")} data-testid="note-draft-recovery" className="mb-2 space-y-2 rounded-lg border border-primary/40 bg-primary/5 p-3 text-xs">
          <p>{T("پیش‌نویس همین دستگاه با نسخهٔ فعلی متفاوت است. هر دو نسخه حفظ شده‌اند؛ انتخاب شما چیزی را در ابر ذخیره نمی‌کند.", "This device has a draft different from the current version. Both copies are kept; choosing one does not save anything to the cloud.")}</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <div><h3 className="font-semibold">{T("پیش‌نویس دستگاه", "Device draft")}</h3><p>{recoveryChoice.title ?? selected.title}</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap">{recoveryChoice.md}</pre></div>
            <div><h3 className="font-semibold">{T("نسخهٔ فعلی", "Current version")}</h3><p>{(notesRef.current.find(note => note.id === selected.id) ?? selected).title}</p><pre className="max-h-32 overflow-auto whitespace-pre-wrap">{(notesRef.current.find(note => note.id === selected.id) ?? selected).content}</pre></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={useDeviceDraft}>{T("ویرایش پیش‌نویس دستگاه", "Use device draft")}</Button>
            <Button size="sm" variant="outline" onClick={() => setRecoveryChoice(null)}>{T("نگه‌داشتن نسخهٔ فعلی و حفظ پیش‌نویس", "Keep current version and retain draft")}</Button>
            <Button size="sm" variant="ghost" onClick={() => { void navigator.clipboard.writeText(`${recoveryChoice.title ?? selected.title}\n\n${recoveryChoice.md}`).catch(() => toast.error(T("کپی نشد", "Copy failed"))); }}>{T("کپی پیش‌نویس", "Copy device draft")}</Button>
          </div>
        </section>
      )}

      {aiProposal && aiProposal.noteId === selected.id && (
        <div role="region" aria-label={T("پیشنهاد هوش مصنوعی", "AI suggestion")} data-testid="note-ai-proposal" className="mb-2 rounded-lg border border-primary/40 bg-primary/5 p-2.5 text-xs">
          <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1 font-medium text-primary"><Sparkles className="h-3.5 w-3.5" />{T("پیشنهاد هوش مصنوعی", "AI suggestion")}</span>
            <span className="text-[11px] text-muted-foreground">{proposalStale ? T("متن از زمان ساخت تغییر کرده", "Text changed since generated") : T("بررسی و اعمال کن", "Review and apply")}</span>
          </div>
          <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-words rounded-md bg-background/70 p-2 text-[11px] leading-5" dir="auto">{aiProposal.md}</pre>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button size="sm" className="h-7 px-2 text-xs" onClick={applyAiProposal} disabled={proposalStale} data-testid="note-ai-apply">{T("اعمال", "Apply")}</Button>
            <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setAiProposal(null)} data-testid="note-ai-discard">{T("صرف‌نظر", "Discard")}</Button>
            <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => void runNoteAI(aiProposal.action)} disabled={aiBusy} data-testid="note-ai-regenerate">{T("تولید دوباره", "Regenerate")}</Button>
          </div>
        </div>
      )}

      {canEdit && noteSaveState !== "idle" && (
        <div
          role="status"
          data-testid="note-save-status"
          data-state={noteSaveState}
          className="sticky top-0 z-20 -mx-2 mb-1 flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-background/95 px-2 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur"
        >
          {noteSaveState === "saving" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          <span className="min-w-0 flex-1">
            {noteSaveState === "saving"
              ? T("در حال ذخیره…", "Saving…")
              : noteSaveState === "device"
                ? T("روی این دستگاه ذخیره شد · در انتظار همگام‌سازی", "Saved on this device · Awaiting sync")
                : durableCopyRef.current
                  ? T("همگام‌سازی ناموفق؛ روی این دستگاه ذخیره شده", "Sync failed; saved on this device")
                  : T("ذخیره ناموفق؛ متن هنوز روی این دستگاه ذخیره نشده", "Save failed; not yet saved on this device")}
          </span>
          {recoveredPendingSave && <span>{T("ذخیرهٔ صریح، نسخهٔ فعلی را با این پیش‌نویس جایگزین می‌کند.", "Explicitly saving will replace the current version with this draft.")}</span>}
          {(noteSaveState === "failed" || recoveredPendingSave) && (
            <>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={retryNoteSave} data-testid="note-save-retry">{recoveredPendingSave ? T("ذخیرهٔ پیش‌نویس بازیابی‌شده", "Save recovered draft") : T("تلاش دوباره", "Retry")}</Button>
              <Button size="sm" variant="ghost" className="h-6 px-2 text-[11px]" onClick={() => void copyDraft()} data-testid="note-save-copy"><Copy className="h-3 w-3 me-1" />{T("کپی", "Copy")}</Button>
            </>
          )}
        </div>
      )}

      <NoteEditorTabs
        noteId={selected.id}
        markdown={draft?.md ?? selected.content ?? ""}
        contentRevision={editorRevision}
        onChange={(md, html) => {
          if (recoveryChoice) return;
          setDraft({ html, md });
          if (!user || !canEdit) return;
          const accountId = user.id;
          const noteId = selected.id;
          bumpContentRevision();
          const nextNotes = notesRef.current.map(note => note.id === noteId ? { ...note, content: md } : note);
          notesRef.current = nextNotes;
          setNotes(nextNotes);
          setSelected(current => current?.id === noteId ? { ...current, content: md } : current);
          const target = nextNotes.find(note => note.id === noteId) ?? selected;
          const revision = contentRevisionRef.current;
          noteRevisionsRef.current.set(noteId, revision);
          unsyncedEditsRef.current = true;
          stageLocalDraft(noteId, accountId, md, html);
          scheduleCloudContent(noteId, accountId, md, target, revision);
        }}
        readOnly={!canEdit || Boolean(recoveryChoice)}
        mode={editorMode}
        onModeChange={setEditorMode}
        onSelectedTextChange={setSelectedText}
        hideTabsList={true}
      />
    </div>
  ) : null;

  return (
    <div ref={containerRef} dir={isEn ? "ltr" : "rtl"} className={fullScreen ? "fixed inset-0 z-40 flex flex-col bg-background" : "study-workspace flex flex-col min-h-0"}>
      <HeaderTitlePortal title={T("نوت‌ها", "Notes")} />
      <HeaderActionsPortal>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex h-9 w-9" onClick={toggleList} aria-label={listHidden ? T("نمایش فهرست نوت‌ها", "Show note list") : T("مخفی کردن فهرست نوت‌ها", "Hide note list")}>
          {listHidden ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!selected} onClick={() => setFullScreen((current) => !current)} aria-label={fullScreen ? T("خروج از تمام‌صفحه", "Exit full screen") : T("نوت تمام‌صفحه", "Full screen note")}>
          {fullScreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </HeaderActionsPortal>
      {fullScreen && <div className="flex justify-end border-b p-2"><Button variant="ghost" size="sm" onClick={() => setFullScreen(false)}><Minimize2 className="h-4 w-4 me-2" />{T("خروج از تمام‌صفحه", "Exit full screen")}</Button></div>}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row overflow-hidden" data-testid="notes-split-layout">
      {/* Sidebar / Notes list panel */}
      <div style={{ "--note-list-width": `clamp(220px, ${splitRatio}%, 55%)` } as React.CSSProperties} className={`${listHidden || fullScreen ? "md:hidden" : "md:w-[var(--note-list-width)]"} ${fullScreen ? "hidden" : ""} w-full min-h-0 md:shrink-0 border-e flex flex-col bg-card`} data-testid="notes-list-panel">
        <div className="p-3 border-b space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">{T("فهرست نوت‌ها", "Note list")}</span>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" className="gap-1">
                  <Plus className="w-4 h-4" />
                  <span className="text-xs">{T("نوت جدید", "New")}</span>
                  <ChevronDown className="w-3 h-3 opacity-70" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => void create()}>
                  <FileText className="me-2 h-4 w-4" />{T("نوت خالی", "Blank note")}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-xs text-muted-foreground">{T("شروع با قالب", "Start from a template")}</DropdownMenuLabel>
                {getNoteTemplates(isEn).map((template) => (
                  <DropdownMenuItem key={template.id} onClick={() => void create(template)}>{template.title}</DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute start-2 top-2.5 text-muted-foreground" />
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
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all ${
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
                className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all ${
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
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium shrink-0 transition-all ${
                      active
                        ? "bg-primary text-primary-foreground shadow-xs"
                        : "bg-muted/70 hover:bg-muted text-muted-foreground"
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: f.color || "hsl(var(--primary))" }}
                    />
                    <span className="truncate max-w-[140px]">{f.name}</span>
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
                      className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-all ${
                        active
                          ? "bg-foreground text-background shadow-xs"
                          : "bg-muted/60 hover:bg-muted text-muted-foreground"
                      }`}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color || "hsl(var(--primary))" }}
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
          {filtered.slice(0, visibleNoteCount).map((n) => {
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
                        text={notePreview(n)}
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
                                style={{ backgroundColor: fItem.color || "hsl(var(--primary))" }}
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
                              <PinOff className="w-4 h-4 me-2 text-muted-foreground" />
                              <span>{T("برداشتن سنجاق", "Unpin note")}</span>
                            </>
                          ) : (
                            <>
                              <Pin className="w-4 h-4 me-2 text-primary" />
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
                          <FolderInput className="w-4 h-4 me-2 text-muted-foreground" />
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
                          <Trash2 className="w-4 h-4 me-2" />
                          <span>{T("حذف نوت", "Delete note")}</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </SwipeableRow>
            );
          })}
          {filtered.length > 50 && <div className="space-y-2 p-3 text-center">
            <p role="status" className="text-xs text-muted-foreground">{T(`نمایش ${Math.min(visibleNoteCount, filtered.length)} از ${filtered.length} نوت؛ جستجو در همهٔ نوت‌ها انجام می‌شود.`, `Showing ${Math.min(visibleNoteCount, filtered.length)} of ${filtered.length} notes. Search covers all notes.`)}</p>
            {visibleNoteCount < filtered.length && <Button variant="outline" size="sm" onClick={() => setVisibleNoteCount((count) => count + 50)}>{T("نمایش ۵۰ نوت بعدی", "Load 50 more notes")}</Button>}
          </div>}
        </div>
      </div>

      {/* Editor Panel */}
      {!listHidden && !fullScreen && <div role="separator" aria-orientation="vertical" aria-label={T("تغییر عرض فهرست و نوت", "Resize note columns")} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="hidden md:flex w-2 shrink-0 cursor-col-resize touch-none items-center justify-center hover:bg-muted"><span className="h-10 w-px bg-border" /></div>}
      <div className={`${fullScreen ? "flex" : "hidden md:flex"} flex-1 min-h-0 min-w-0 overflow-y-auto`} data-testid="note-editor-panel">
        {selected ? editor : emptyState}
      </div>
      </div>

      {/* Mobile Drawer Editor */}
      {selected && isMobile && !fullScreen && (
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
                className="h-10 w-10"
                onClick={() => setFullScreen(true)}
                title={T("فول اسکرین", "Full screen")}
              >
                <Maximize2 className="w-4 h-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-10 w-10"
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
      <Dialog
        open={!!actionItemDraft}
        onOpenChange={(open) => {
          if (!open && !creatingActionItem) {
            setActionItemDraft(null);
            setSelectedText("");
          }
        }}
      >
        <DialogContent className="w-[calc(100%-1.5rem)] max-w-lg" dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle>{T("پیش‌نویس تسک از نوت", "Task draft from note")}</DialogTitle>
            <DialogDescription>
              {T("عنوان و توضیح را بررسی و ویرایش کن. نوت اصلی تغییر نمی‌کند.", "Review and edit the title and details. The original note will not change.")}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">{T("عنوان", "Title")}</span>
              <Input
                value={actionItemDraft?.title || ""}
                onChange={(event) => setActionItemDraft((current) => current ? { ...current, title: event.target.value } : null)}
                maxLength={200}
                autoFocus
                dir="auto"
                data-testid="note-action-item-title"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">{T("توضیحات", "Details")}</span>
              <Textarea
                value={actionItemDraft?.description || ""}
                onChange={(event) => setActionItemDraft((current) => current ? { ...current, description: event.target.value } : null)}
                maxLength={2000}
                rows={5}
                dir="auto"
                data-testid="note-action-item-description"
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={creatingActionItem} onClick={() => {
              setActionItemDraft(null);
              setSelectedText("");
            }}>{T("لغو", "Cancel")}</Button>
            <Button type="button" disabled={creatingActionItem || !actionItemDraft?.title.trim()} onClick={() => void createActionItem()} data-testid="note-action-item-create">
              {creatingActionItem ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <ListPlus className="me-2 h-4 w-4" />}
              {creatingActionItem ? T("در حال ذخیره", "Saving") : T("ساخت تسک", "Create task")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
