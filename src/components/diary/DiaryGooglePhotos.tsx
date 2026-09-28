import { useState } from "react";
import { ExternalLink, Images, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { isDirectGoogleImage, isGooglePhotosUrl } from "@/lib/diary";

type Props = {
  links: string[];
  onChange: (next: string[]) => void;
};

export function DiaryGooglePhotos({ links, onChange }: Props) {
  const { T } = useBilingual();
  const [draft, setDraft] = useState("");

  const add = () => {
    const url = draft.trim();
    if (!isGooglePhotosUrl(url)) {
      toast.error(T("لینک باید از Google Photos باشد (photos.app.goo.gl یا photos.google.com)", "Link must be a Google Photos link (photos.app.goo.gl or photos.google.com)"));
      return;
    }
    if (links.includes(url)) { toast.info(T("این لینک قبلاً اضافه شده", "This link is already added")); return; }
    onChange([...links, url]);
    setDraft("");
  };

  return (
    <div className="space-y-3" data-testid="diary-google-photos">
      <div className="flex flex-wrap items-center gap-2">
        <Images className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <Input
          data-testid="diary-gphotos-input"
          type="url"
          dir="ltr"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(); } }}
          placeholder="https://photos.app.goo.gl/…"
          className="h-9 min-w-48 flex-1 bg-background/80 text-xs"
        />
        <Button type="button" size="sm" variant="outline" className="gap-1 bg-background/80" data-testid="diary-gphotos-add" onClick={add}><Plus className="h-4 w-4" />{T("افزودن", "Add")}</Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {T("لینک اشتراک آلبوم یا عکس را از Google Photos کپی کن. لینک‌های مستقیم تصویر (lh3.googleusercontent.com) همین‌جا نمایش داده می‌شوند.", "Paste a shared album or photo link from Google Photos. Direct image links (lh3.googleusercontent.com) are shown inline.")}
      </p>
      {links.length > 0 && (
        <ul className="grid gap-2 sm:grid-cols-2">
          {links.map((url, index) => (
            <li key={url} data-testid={`diary-gphotos-item-${index}`} className="overflow-hidden rounded-xl border bg-background/85 shadow-sm">
              {isDirectGoogleImage(url) ? (
                <a href={url} target="_blank" rel="noopener noreferrer"><img src={url} alt="Google Photos" className="max-h-56 w-full object-cover" loading="lazy" /></a>
              ) : (
                <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-3 hover:bg-primary/5">
                  <span className="rounded-lg bg-gradient-to-br from-rose-400 via-amber-300 to-sky-400 p-2 text-white"><Images className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium">{T("آلبوم Google Photos", "Google Photos album")}</span>
                    <span className="block truncate text-[11px] text-muted-foreground" dir="ltr">{url}</span>
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-primary" />
                </a>
              )}
              <div className="flex justify-end border-t px-2 py-1">
                <button type="button" data-testid={`diary-gphotos-remove-${index}`} onClick={() => onChange(links.filter((item) => item !== url))} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] text-muted-foreground hover:bg-destructive/10 hover:text-destructive"><Trash2 className="h-3 w-3" />{T("حذف", "Remove")}</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
