import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, ArrowLeft, Loader2, FolderInput, Pin, Tag as TagIcon, Plus, Check } from "lucide-react";
import { toast } from "sonner";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useBilingual } from "@/hooks/useBilingual";
import { persistNote } from "@/lib/firestoreDataService";

const RichEditor = lazy(() =>
  import("@/components/RichEditor").then((m) => ({ default: m.RichEditor }))
);

type FolderItem = { id: string; name: string; color?: string };
type TagItem = { id: string; name: string; color?: string };

export default function NewNoteView() {
  const { user } = useAuth();
  return <NewNoteForm key={user?.id || "signed-out"} />;
}

function NewNoteForm() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { T, isEn } = useBilingual();

  const [title, setTitle] = useState(params.get("title") || "");
  const [content, setContent] = useState(params.get("content") || "");
  const [folderId, setFolderId] = useState<string | null>(params.get("folder_id"));
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [pinned, setPinned] = useState(false);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [newTagName, setNewTagName] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [busy, setBusy] = useState(false);
  const saving = useRef(false);
  const pendingId = useRef<string | null>(null);
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

  const toggleTag = (id: string) => {
    setTagIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleCreateTag = async () => {
    const trimmed = newTagName.trim();
    if (!trimmed || !user) return;
    const existing = tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      if (!tagIds.includes(existing.id)) setTagIds((prev) => [...prev, existing.id]);
      setNewTagName("");
      setShowTagInput(false);
      return;
    }

    try {
      const { data, error } = await firebaseStore
        .from("tags")
        .insert({ user_id: user.id, name: trimmed, color: "#6366f1" })
        .select()
        .single();
      if (!error && data) {
        const created = data as TagItem;
        setTags((prev) => [...prev, created]);
        setTagIds((prev) => [...prev, created.id]);
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

  const submit = async () => {
    if (!user || !title.trim()) {
      toast.error(T("عنوان الزامی است", "Title is required"));
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    const ownerId = user.id;
    const newId = pendingId.current || generateId();
    pendingId.current = newId;
    const noteData = {
      id: newId,
      user_id: user.id,
      title: title.trim(),
      content,
      folder_id: folderId || null,
      tag_ids: tagIds,
      pinned,
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
      navigate(`/app/notes?select=${newId}`);
    } catch (e: any) {
      if (activeOwner.current === ownerId) toast.error(e.message || T("خطا در ذخیره نوت", "Error saving note"));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="page-shell page-shell--narrow pb-24">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          {T("برگشت", "Back")}
        </Button>
        <HeaderTitlePortal title={T("نوت جدید", "New Note")} />
        <Button onClick={submit} disabled={busy || !title.trim()} size="sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : T("ذخیره نوت", "Save Note")}
        </Button>
      </div>

      <Card className="p-4">
        <fieldset disabled={busy} className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            autoFocus
            placeholder={T("عنوان نوت...", "Note title...")}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            dir="auto"
            className="text-lg font-semibold flex-1"
          />
          <VoiceInputButton
            onTranscript={(text) => setTitle((prev) => (prev ? prev.trimEnd() + " " + text : text))}
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
            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">{T("📥 بدون پوشه (اینباکس نوت‌ها)", "📥 No Folder (Inbox)")}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>
                  📁 {f.name}
                </option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant={pinned ? "default" : "outline"}
            onClick={() => setPinned(!pinned)}
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
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: t.color || "#6366f1" }}
                  />
                  <span>#{t.name}</span>
                  {active && <Check className="w-3 h-3 ml-0.5" />}
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
                  className="h-7 text-xs w-28 px-2"
                />
                <Button size="sm" variant="ghost" onClick={handleCreateTag} className="h-7 px-2 text-xs">
                  <Check className="w-3 h-3" />
                </Button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowTagInput(true)}
                className="h-7 text-xs gap-1 border-dashed"
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
              onTranscript={(text) => setContent((c) => (c ? `${c} ${text}` : text))}
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
            <RichEditor initialMarkdown={content} readOnly={busy} onChange={(_html, md) => setContent(md)} />
          </Suspense>
        </div>
        </fieldset>
      </Card>
    </div>
  );
}
