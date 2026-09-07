import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Paperclip, Trash2, FileText, Image as ImageIcon, Music, Video, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { uploadMediaFull, deleteMediaPath, type MediaKind } from "@/lib/uploadMedia";
import { callAI } from "@/lib/ai";

type Attachment = {
  id: string;
  url: string;
  storage_path: string;
  file_name: string;
  mime_type: string | null;
  kind: MediaKind;
  size_bytes: number | null;
  created_at: string;
};

const ACCEPT = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/x-m4a", "audio/m4a",
  "video/mp4", "video/quicktime",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
].join(",");

type ImageAction = "attach" | "extract" | "summarize" | "research" | "tasks" | "scheduled_tasks";

export function TaskAttachments({ taskId }: { taskId: string }) {
  const { user } = useAuth();
  const [items, setItems] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [pendingImage, setPendingImage] = useState<Attachment | null>(null);
  const [processing, setProcessing] = useState<ImageAction | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pickAccept, setPickAccept] = useState<string>(ACCEPT);

  const load = async () => {
    const { data } = await supabase
      .from("task_attachments")
      .select("*")
      .eq("task_id", taskId)
      .order("created_at", { ascending: false });
    setItems((data || []) as any);
  };
  useEffect(() => { load(); }, [taskId]);

  // External rail trigger: open native picker with a specific accept filter
  useEffect(() => {
    const onPick = (e: Event) => {
      const det = (e as CustomEvent).detail || {};
      if (det.accept) setPickAccept(det.accept);
      setTimeout(() => fileRef.current?.click(), 30);
    };
    const onRefresh = () => load();
    window.addEventListener(`lov:attach-pick:${taskId}`, onPick as any);
    window.addEventListener(`lov:attach-refresh:${taskId}`, onRefresh as any);
    return () => {
      window.removeEventListener(`lov:attach-pick:${taskId}`, onPick as any);
      window.removeEventListener(`lov:attach-refresh:${taskId}`, onRefresh as any);
    };
  }, [taskId]);

  const onPick = () => { setPickAccept(ACCEPT); fileRef.current?.click(); };


  const onFiles = async (files: FileList | null) => {
    if (!files || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`فایل ${file.name} بزرگ‌تر از ۵۰ مگابایت است`);
          continue;
        }
        const up = await uploadMediaFull(file, user.id);
        const { data, error } = await supabase.from("task_attachments").insert({
          user_id: user.id,
          task_id: taskId,
          url: up.url,
          storage_path: up.path,
          file_name: up.name,
          mime_type: up.mime,
          kind: up.kind,
          size_bytes: up.size,
        }).select().single();
        if (error) { toast.error(error.message); continue; }
        const att = data as any as Attachment;
        setItems((prev) => [att, ...prev]);
        if (att.kind === "image") setPendingImage(att);
      }
    } catch (e: any) {
      toast.error(e?.message || "خطا در آپلود");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const removeItem = async (a: Attachment) => {
    await supabase.from("task_attachments").delete().eq("id", a.id);
    await deleteMediaPath(a.storage_path).catch(() => {});
    setItems((prev) => prev.filter((x) => x.id !== a.id));
  };

  const runImageAction = async (action: ImageAction) => {
    if (!pendingImage || !user) return;
    if (action === "attach") { setPendingImage(null); return; }
    setProcessing(action);
    try {
      const modeMap: Record<Exclude<ImageAction, "attach" | "tasks" | "scheduled_tasks">, string> = {
        extract: "image_extract",
        summarize: "image_summarize",
        research: "image_research",
      };
      if (action === "tasks" || action === "scheduled_tasks") {
        const text = action === "scheduled_tasks"
          ? "Extract actionable tasks from this image. Suggest a reasonable due_date (ISO 8601) for each based on visible cues. Return tasks via the tool."
          : "Extract actionable tasks from this image. Return tasks via the tool.";
        const res = await callAI("image_to_tasks" as any, { imageUrl: pendingImage.url, text });
        const tasks = (res.data?.tasks || []) as any[];
        if (!tasks.length) { toast.error("تسکی پیدا نشد"); return; }
        for (const t of tasks) {
          await supabase.from("tasks").insert({
            user_id: user.id,
            title: t.title,
            description: t.description || null,
            priority: t.priority || "none",
            due_date: t.due_date || null,
            parent_id: taskId,
          });
        }
        toast.success(`${tasks.length} تسک ساخته شد`);
      } else {
        const titles: Record<typeof action, string> = {
          extract: "متن استخراج‌شده از تصویر",
          summarize: "خلاصه/بسط تصویر",
          research: "یادداشت پژوهشی",
        } as any;
        const res = await callAI(modeMap[action] as any, {
          imageUrl: pendingImage.url,
          text: "Process this image as instructed.",
        });
        const content = res.text || "";
        if (!content.trim()) { toast.error("نتیجه‌ای دریافت نشد"); return; }
        const { error } = await supabase.from("notes").insert({
          user_id: user.id,
          task_id: taskId,
          title: titles[action] || "نوت تصویر",
          content,
        });
        if (error) { toast.error(error.message); return; }
        toast.success("نوت ساخته شد");
      }
      setPendingImage(null);
    } catch (e: any) {
      toast.error(e?.message || "خطا در پردازش");
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-medium flex items-center gap-1">
          <Paperclip className="w-4 h-4" /> Attachments ({items.length})
        </label>
        <Button size="sm" variant="outline" onClick={onPick} disabled={uploading} className="gap-1 rounded-full">
          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Paperclip className="w-3 h-3" />}
          Add file
        </Button>
        <input ref={fileRef} type="file" accept={pickAccept} multiple className="hidden"
          onChange={(e) => onFiles(e.target.files)} />
      </div>


      {items.length === 0 ? null : (
        <div className="space-y-2">
          {items.map((a) => (
            <Card key={a.id} className="p-2">
              <div className="flex items-start gap-2">
                <div className="shrink-0 mt-0.5 text-muted-foreground">
                  {a.kind === "image" ? <ImageIcon className="w-4 h-4" /> :
                   a.kind === "audio" ? <Music className="w-4 h-4" /> :
                   a.kind === "video" ? <Video className="w-4 h-4" /> :
                   <FileText className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <a href={a.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs font-medium truncate block hover:underline" dir="auto">
                    {a.file_name}
                  </a>
                  {a.kind === "image" && (
                    <a href={a.url} target="_blank" rel="noopener noreferrer">
                      <img src={a.url} alt={a.file_name}
                        className="mt-2 max-h-64 rounded-md object-contain border" loading="lazy" />
                    </a>
                  )}
                  {a.kind === "audio" && (
                    <audio controls src={a.url} className="mt-2 w-full" preload="metadata" />
                  )}
                  {a.kind === "video" && (
                    <video controls src={a.url} className="mt-2 w-full max-h-64 rounded-md border" preload="metadata" />
                  )}
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeItem(a)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!pendingImage} onOpenChange={(v) => !v && !processing && setPendingImage(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> با این تصویر چه کنیم؟
            </DialogTitle>
            <DialogDescription>یکی از گزینه‌ها را انتخاب کن</DialogDescription>
          </DialogHeader>
          {pendingImage && (
            <img src={pendingImage.url} alt="" className="max-h-40 rounded mx-auto object-contain" />
          )}
          <div className="grid grid-cols-1 gap-2 mt-2">
            <ActionBtn label="فقط ضمیمه شود" onClick={() => runImageAction("attach")} disabled={!!processing} />
            <ActionBtn label="استخراج متن و افزودن به‌عنوان نوت" onClick={() => runImageAction("extract")}
              loading={processing === "extract"} disabled={!!processing && processing !== "extract"} />
            <ActionBtn label="خلاصه / بسط محتوا" onClick={() => runImageAction("summarize")}
              loading={processing === "summarize"} disabled={!!processing && processing !== "summarize"} />
            <ActionBtn label="پژوهش بر اساس این تصویر" onClick={() => runImageAction("research")}
              loading={processing === "research"} disabled={!!processing && processing !== "research"} />
            <ActionBtn label="ساخت تسک از این تصویر" onClick={() => runImageAction("tasks")}
              loading={processing === "tasks"} disabled={!!processing && processing !== "tasks"} />
            <ActionBtn label="ساخت تسک با تاریخ پیشنهادی" onClick={() => runImageAction("scheduled_tasks")}
              loading={processing === "scheduled_tasks"} disabled={!!processing && processing !== "scheduled_tasks"} />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ActionBtn({ label, onClick, loading, disabled }: {
  label: string; onClick: () => void; loading?: boolean; disabled?: boolean;
}) {
  return (
    <Button variant="outline" className="justify-start gap-2 h-auto py-2" onClick={onClick} disabled={disabled}>
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 opacity-60" />}
      <span className="text-sm">{label}</span>
    </Button>
  );
}
