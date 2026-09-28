import { lazy, Suspense, useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { ArrowRight, ArrowLeft, Loader2, FolderInput, Pin } from "lucide-react";
import { toast } from "sonner";
import { VoiceInputButton } from "@/components/VoiceInputButton";
import { useBilingual } from "@/hooks/useBilingual";

const RichEditor = lazy(() =>
  import("@/components/RichEditor").then((m) => ({ default: m.RichEditor }))
);

type Folder = { id: string; name: string };

export default function NewNoteView() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { T, isEn } = useBilingual();

  const [title, setTitle] = useState(params.get("title") || "");
  const [content, setContent] = useState(params.get("content") || "");
  const [folderId, setFolderId] = useState<string | null>(params.get("folder_id"));
  const [pinned, setPinned] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    firebaseStore.from("folders").select("id,name").eq("user_id", user.id).order("position")
      .then(({ data }) => setFolders((data || []) as any));
  }, [user]);

  const submit = async () => {
    if (!user || !title.trim()) {
      toast.error(T("عنوان الزامی است", "Title is required"));
      return;
    }
    setBusy(true);
    try {
      const { error } = await firebaseStore.from("notes").insert({
        user_id: user.id,
        title: title.trim(),
        content,
        folder_id: folderId,
        pinned,
      });
      if (error) throw error;
      toast.success(T("نوت ساخته شد", "Note created"));
      navigate("/app/notes");
    } catch (e: any) {
      toast.error(e.message || T("خطا در ذخیره نوت", "Error saving note"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="p-4 md:p-6 max-w-3xl mx-auto pb-24">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1">
          {isEn ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          {T("برگشت", "Back")}
        </Button>
        <h1 className="text-lg font-bold">{T("نوت جدید", "New Note")}</h1>
        <Button onClick={submit} disabled={busy || !title.trim()} size="sm">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : T("ذخیره", "Save")}
        </Button>
      </div>

      <Card className="p-4 space-y-4">
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

        <div className="grid grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <FolderInput className="w-3 h-3" /> {T("فولدر", "Folder")}
            </label>
            <select
              value={folderId || ""}
              onChange={(e) => setFolderId(e.target.value || null)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">{T("📥 بدون فولدر", "📥 No Folder")}</option>
              {folders.map((f) => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant={pinned ? "default" : "outline"}
            onClick={() => setPinned(!pinned)}
            className="gap-1"
          >
            <Pin className="w-4 h-4" /> {pinned ? T("پین شده", "Pinned") : T("پین", "Pin")}
          </Button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs text-muted-foreground">{T("محتوا", "Content")}</label>
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
            <RichEditor initialMarkdown={content} onChange={(_html, md) => setContent(md)} />
          </Suspense>
        </div>
      </Card>
    </div>
  );
}
