import { useEffect, useRef, useState } from "react";
import { ImagePlus, Link2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { uploadMedia } from "@/lib/uploadMedia";
import { DIARY_BACKGROUNDS, type DiaryEntry } from "@/lib/diary";

type Props = {
  entry: DiaryEntry;
  onChange: (patch: Partial<DiaryEntry>) => void;
};

export function DiaryBackgroundPicker({ entry, onChange }: Props) {
  const { user } = useAuth();
  const { T, isEn } = useBilingual();
  const targetRef = useRef(""); targetRef.current = `${user?.id ?? ""}:${entry.id}`;
  const mountedRef = useRef(true);
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [urlDraft, setUrlDraft] = useState(entry.diary_background === "custom" ? entry.diary_photo_url || "" : "");

  const uploadOwn = async (file: File) => {
    if (!user?.id) return;
    setUploading(true);
    try {
      const target = targetRef.current;
      const url = await uploadMedia(file, user.id);
      if (!mountedRef.current || targetRef.current !== target) return;
      onChange({ diary_background: "custom", diary_photo_url: url });
      setUrlDraft(url);
      toast.success(T("پس‌زمینهٔ شخصی اضافه شد", "Custom background added"));
    } catch (error: any) {
      toast.error(error?.message || T("آپلود ناموفق بود", "Upload failed"));
    } finally {
      setUploading(false);
    }
  };

  const applyUrl = () => {
    const url = urlDraft.trim();
    if (!/^https?:\/\//i.test(url)) { toast.error(T("نشانی تصویر معتبر نیست", "Image URL is not valid")); return; }
    onChange({ diary_background: "custom", diary_photo_url: url });
  };

  return (
    <div className="space-y-4" data-testid="diary-background-picker">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {DIARY_BACKGROUNDS.map((item) => {
          const active = entry.diary_background === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-testid={`diary-bg-${item.id}`}
              onClick={() => onChange({ diary_background: item.id })}
              title={isEn ? item.en : item.fa}
              className={`group relative aspect-[4/3] overflow-hidden rounded-xl border-2 transition-transform hover:-translate-y-0.5 ${active ? "border-primary ring-2 ring-primary/30" : "border-border/60"}`}
            >
              {item.src ? <img src={item.src} alt={isEn ? item.en : item.fa} className="h-full w-full object-cover" loading="lazy" /> : <div className={`h-full w-full ${item.tint}`} />}
              <span className="absolute inset-x-0 bottom-0 bg-black/45 px-1 py-0.5 text-[10px] text-white">{isEn ? item.en : item.fa}</span>
            </button>
          );
        })}
        <button
          type="button"
          data-testid="diary-bg-upload"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className={`flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed text-[11px] text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary ${entry.diary_background === "custom" ? "border-primary text-primary" : "border-border/70"}`}
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {T("عکس خودم", "My photo")}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadOwn(file); event.target.value = ""; }} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Link2 className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          data-testid="diary-bg-url-input"
          type="url"
          dir="ltr"
          value={urlDraft}
          onChange={(event) => setUrlDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); applyUrl(); } }}
          placeholder={T("نشانی مستقیم تصویر (https://…)", "Direct image URL (https://…)")}
          className="h-9 flex-1 min-w-48 bg-background/80 text-xs"
        />
        <button type="button" data-testid="diary-bg-url-apply" onClick={applyUrl} className="inline-flex h-9 items-center gap-1 rounded-lg border bg-background/80 px-3 text-xs font-medium hover:bg-primary/5 hover:text-primary">
          <ImagePlus className="h-3.5 w-3.5" />{T("اعمال", "Apply")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-xs">
          <span className="flex justify-between"><span>{T("شفافیت تصویر", "Image opacity")}</span><span data-testid="diary-opacity-value" className="tabular-nums text-muted-foreground">{entry.diary_opacity}%</span></span>
          <Slider data-testid="diary-opacity-slider" min={5} max={100} step={5} value={[entry.diary_opacity]} onValueChange={([value]) => onChange({ diary_opacity: value })} />
        </label>
        <label className="space-y-2 text-xs">
          <span className="flex justify-between"><span>{T("محو کردن پس‌زمینه", "Background blur")}</span><span className="tabular-nums text-muted-foreground">{entry.diary_blur ?? 0}px</span></span>
          <Slider data-testid="diary-blur-slider" min={0} max={12} step={1} value={[entry.diary_blur ?? 0]} onValueChange={([value]) => onChange({ diary_blur: value })} />
        </label>
      </div>
    </div>
  );
}
