import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Loader2, FolderInput, Pin, Tag as TagIcon, Plus, Check, Undo2, Redo2 } from "lucide-react";
import { toast } from "sonner";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useBilingual } from "@/hooks/useBilingual";
import { persistNote } from "@/lib/firestoreDataService";
import { useLearningDraft } from "@/hooks/useLearningDraft";
import { markdownToHtml } from "@/lib/markdown";

const RichEditor = lazy(() =>
  import("@/components/RichEditor").then((m) => ({ default: m.RichEditor }))
);

type FolderItem = { id: string; name: string; color?: string };
type TagItem = { id: string; name: string; color?: string };
type NewNoteDraft = { id: string | null; title: string; content: string; html: string; folderId: string | null; tagIds: string[]; pinned: boolean };
const isNewNoteDraft = (value: unknown): value is NewNoteDraft => {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<NewNoteDraft>;
  return (draft.id === null || typeof draft.id === "string") && typeof draft.title === "string" && typeof draft.content === "string" && typeof draft.html === "string" && (draft.folderId === null || typeof draft.folderId === "string") && Array.isArray(draft.tagIds) && draft.tagIds.every(id => typeof id === "string") && typeof draft.pinned === "boolean";
};

export default function NewNoteView() {
  const { user } = useAuth();
  return <NewNoteForm key={user?.id || "signed-out"} />;
}

function NewNoteForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { T, isEn } = useBilingual();

  const initialContent = params.get("content") || "";
  const initialDraft: NewNoteDraft = {
    id: null, title: params.get("title") || "", content: initialContent,
    html: markdownToHtml(initialContent), folderId: params.get("folder_id"), tagIds: [], pinned: false,
  };
  const draft = useLearningDraft(`new-note:${user?.id || "signed-out"}`, initialDraft, "new-note-v1", isNewNoteDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const { title, content, folderId, tagIds, pinned } = draft.value;
  const updateDraft = (patch: Partial<NewNoteDraft> | ((current: NewNoteDraft) => Partial<NewNoteDraft>), groupTyping = false) => draft.change(current => ({ ...current, ...(typeof patch === "function" ? patch(current) : patch) }), groupTyping);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const activeOwner = useRef(user?.id);
  activeOwner.current = user?.id;
  useEffect(() => { activeOwner.current = user?.id; return () => { activeOwner.current = undefined; }; }, [user?.id]);

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

  const toggleTag = (id: string) => updateDraft({ tagIds: tagIds.includes(id) ? tagIds.filter(x => x !== id) : [...tagIds, id] });

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || !user) return;
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!tagIds.includes(existing.id)) updateDraft({ tagIds: [...tagIds, existing.id] });
      setNewTagName("");
      setShowTagInput(false);
      return;
    }

    try {
      const { data, error } = await firebaseStore
        .from("tags")
        .insert({ user_id: user.id, name: trimmed, color: "hsl(var(--primary))" })
        .select()
        .single();
      if (!error && data) {
        const created = data as TagItem;
        setTags((prev) => [...prev, created]);
        updateDraft(current => ({ tagIds: current.tagIds.includes(created.id) ? current.tagIds : [...current.tagIds, created.id] }));
      }
    } catch {}
    setNewTagName("");
    setShowTagInput(false);
  };

  const generateId = () => {
    try {
      return crypto.randomUUID();
    } catch {
      return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
    }
  };

  const handleBack = async () => {
    if (!draft.ready || busy) return;
    if (draft.conflict) { navigate(-1); return; }
    if (!(await draft.flush())) {
      toast.error(T("پیش‌نویس ذخیره نشد؛ متن را کپی کنید و دوباره تلاش کنید", "Draft could not be saved. Copy your text and try again."));
      return;
    }
    navigate(-1);
  };

  const submit = async () => {
    if (!user || !draft.ready || draft.conflict || !title.trim()) {
      toast.error(T("عنوان الزامی است", "Title is required"));
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    const ownerId = user.id;
    const newId = draft.value.id || generateId();
    const snapshot = { ...draft.value, id: newId };
    updateDraft({ id: newId });
    const noteData = {
      id: newId,
      user_id: user.id,
      title: snapshot.title.trim(),
      content: snapshot.content,
      folder_id: snapshot.folderId,
      tag_ids: snapshot.tagIds,
      pinned: snapshot.pinned,
      updated_at: new Date().toISOString(),
    };

    try {
      const outcome = await persistNote(ownerId, noteData);
      if (activeOwner.current !== ownerId) return;
      if (outcome === "failed") {
        toast.error(T("نوت ذخیره نشد؛ متن حفظ شده، دوباره تلاش کنید", "Note was not saved; your text is kept. Please retry."));
        return;
      }
      window.dispatchEvent(new Event("notes-changed"));
      if (outcome === "synced") {
        toast.success(T("نوت ساخته شد و ذخیره گردید", "Note created and synced"));
      } else {
        toast.info(T("نوت در صف آفلاین ذخیره شد", "Note queued for sync"));
      }
      await draft.clear();
      if (activeOwner.current === ownerId) navigate(`/app/notes?select=${newId}`);
    } catch (e: any) {
      if (activeOwner.current === ownerId) toast.error(e.message || T("خطا در ذخیره نوت", "Error saving note"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!draft.ready) return;
    const flush = () => {
      const current = draftRef.current;
      if (!current.conflict) void current.flush();
    };
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [draft.ready]);

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--narrow pb-safe-bottom">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={handleBack} disabled={!draft.ready || busy} className="gap-1">
          {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          {T("برگشت", "Back")}
        </Button>
        <HeaderTitlePortal title={T("نوت جدید", "New Note")} />
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" size="icon" aria-label={T("واگرد", "Undo")} title={T("واگرد", "Undo")} disabled={!draft.ready || !draft.canUndo || busy} onClick={draft.undo}><Undo2 className="h-4 w-4" /></Button>
          <Button type="button" variant="ghost" size="icon" aria-label={T("ازنو", "Redo")} title={T("ازنو", "Redo")} disabled={!draft.ready || !draft.canRedo || busy} onClick={draft.redo}><Redo2 className="h-4 w-4" /></Button>
          <Button onClick={submit} disabled={busy || !draft.ready || Boolean(draft.conflict) || !title.trim()} size="sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : T("ذخیره نوت", "Save Note")}
          </Button>
        </div>
      </div>

      {draft.conflict && <Card className="mb-3 flex items-center justify-between gap-3 border-amber-500/40 p-3 text-sm">
        <span>{T("یک پیش‌نویس قبلی پیدا شد. برای بازیابی نوشته و واگردها آن را برگردانید.", "A previous draft was found. Restore it to recover its text and undo history.")}</span>
        <Button size="sm" onClick={draft.restore}>{T("بازیابی پیش‌نویس", "Restore draft")}</Button>
      </Card>}

      <Card className="p-4">
        <fieldset disabled={busy || !draft.ready || Boolean(draft.conflict)} className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder={T("عنوان نوت...", "Note title...")}
            value={title}
            onChange={(e) => updateDraft({ title: e.target.value }, true)}
            dir="auto"
            className="text-lg font-semibold flex-1"
          />
          <VoiceInputButton
            onTranscript={(text) => updateDraft({ title: title ? title.trimEnd() + " " + text : text })}
            size="icon"
            className="h-10 w-10 shrink-0"
          />
        </div>

        {/* Folders & Pin row */}
        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1">
              <FolderInput className="w-3.5 h-3.5 text-primary" />
              <span>{T("پوشه / فولدر", "Folder")}</span>
            </label>
            <Select value={folderId || "__inbox__"} onValueChange={(v) => updateDraft({ folderId: v === "__inbox__" ? null : v })}>
              <SelectTrigger className="w-full h-10">
                <SelectValue placeholder={T("بدون پوشه (اینباکس نوت‌ها)", "No Folder (Inbox)")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__inbox__">{T("بدون پوشه (اینباکس نوت‌ها)", "No Folder (Inbox)")}</SelectItem>
                {folders.map((f) => (
                  <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant={pinned ? "default" : "outline"}
            onClick={() => updateDraft({ pinned: !pinned })}
            className="gap-1.5 h-10"
          >
            <Pin className={`w-4 h-4 ${pinned ? "fill-current" : ""}`} />
            <span>{pinned ? T("سنجاق‌شده", "Pinned") : T("سنجاق", "Pin")}</span>
          </Button>
        </div>

        {/* Tags section */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs text-muted-foreground flex items-center gap-1">
            <TagIcon className="w-3.5 h-3.5 text-primary" />
            <span>{T("تگ‌ها و برچسب‌ها", "Tags")}</span>
          </label>
          <div className="flex flex-wrap gap-1.5 items-center">
            {tags.map((t) => {
              const active = tagIds.includes(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleTag(t.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color || "hsl(var(--primary))" }}
                  />
                  <span>#{t.name}</span>
                  {active && <Check className="w-3 h-3 ms-0.5" />}
                </button>
              );
            })}

            {showTagInput ? (
              <div className="inline-flex items-center gap-1">
                <Input
                  autoFocus
                  placeholder={T("نام تگ جدید...", "New tag name...")}
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateTag();
                    }
                    if (e.key === "Escape") setShowTagInput(false);
                  }}
                  className="h-9 text-xs w-28 px-2"
                />
                <Button size="sm" variant="ghost" onClick={handleCreateTag} className="h-9 px-2 text-xs">
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTagInput(true)}
                className="h-9 text-xs gap-1 border-dashed"
              >
                <Plus className="w-3 h-3" />
                <span>{T("تگ جدید", "New tag")}</span>
              </Button>
            )}
          </div>
        </div>

        {/* Content Editor */}
        <div className="pt-2">
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">{T("محتوای نوت", "Note Content")}</label>
            <VoiceInputButton
              onTranscript={(text) => {
                const next = content ? `${content} ${text}` : text;
                updateDraft({ content: next, html: markdownToHtml(next) });
              }}
              className="h-8 w-8"
              title={isEn ? "Voice input" : "ضبط صوتی"}
            />
          </div>
          <Suspense
            fallback={
              <div className="h-48 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground rounded-lg border border-dashed border-border/60 bg-muted/20">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span>{T("در حال بارگذاری ویرایشگر...", "Loading editor...")}</span>
              </div>
            }
          >
            <RichEditor initialMarkdown={content} controlledHtml={draft.value.html} readOnly={busy || !draft.ready || Boolean(draft.conflict)} onChange={(html, md) => updateDraft({ content: md, html }, true)} />
          </Suspense>
        </div>
        </fieldset>
        <p role="status" className="pt-2 text-xs text-muted-foreground">
          {draft.status === "saved" ? T("پیش‌نویس روی این دستگاه ذخیره شد", "Draft saved on this device") : draft.status === "unavailable" ? T("ذخیرهٔ پیش‌نویس این دستگاه در دسترس نیست", "This device cannot save the draft") : T("در حال ذخیرهٔ پیش‌نویس…", "Saving draft…")}
        </p>
      </Card>
    </div>
  );
}
