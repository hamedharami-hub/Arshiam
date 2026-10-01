import React from "react";
import { HeaderActionsPortal } from "@/components/HeaderActionsPortal";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ImagePlus, ImageOff, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { uploadMediaFull } from "@/lib/uploadMedia";
import type { FolderPrefs } from "@/lib/folderPrefs";

export const FOLDER_BG_COLORS = [
  { label: "رز", value: "hsl(350 80% 96%)" },
  { label: "کهربایی", value: "hsl(42 90% 94%)" },
  { label: "زمردی", value: "hsl(150 55% 94%)" },
  { label: "آسمانی", value: "hsl(200 80% 94%)" },
  { label: "بنفش", value: "hsl(265 65% 95%)" },
  { label: "صورتی", value: "hsl(325 75% 95%)" },
  { label: "خاکستری", value: "hsl(220 15% 93%)" },
];

export const FOLDER_BG_IMAGES = [
  { label: "مه صبحگاهی", value: "linear-gradient(135deg, hsl(210 40% 96%), hsl(190 35% 90%))" },
  { label: "غروب آرام", value: "linear-gradient(135deg, hsl(20 70% 95%), hsl(280 50% 94%))" },
  { label: "باغ سبز", value: "linear-gradient(135deg, hsl(145 45% 94%), hsl(190 55% 93%))" },
  { label: "شب بنفش", value: "linear-gradient(135deg, hsl(250 35% 18%), hsl(285 30% 28%))" },
  { label: "نقطه‌ای", value: "radial-gradient(hsl(var(--muted-foreground) / 0.15) 1px, transparent 1px)" },
];

export interface TasksHeaderProps {
  title: string;
  isFolder: boolean;
  folderName: string;
  folderPrefs: FolderPrefs;
  updateFolderPrefs: (patch: Partial<FolderPrefs>) => void;
  setDelFolderOpen: (open: boolean) => void;
  T: (fa: string, en: string) => string;
}

export function TasksHeader({
  title,
  isFolder,
  folderPrefs,
  updateFolderPrefs,
  setDelFolderOpen,
  T,
}: TasksHeaderProps) {
  const { user } = useAuth();
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const [uploadingBg, setUploadingBg] = React.useState(false);
  const uploadBackground = async (file: File) => {
    if (!user) return;
    setUploadingBg(true);
    try {
      const media = await uploadMediaFull(file, user.id);
      if (media.kind !== "image") throw new Error(T("فقط تصویر انتخاب کنید", "Choose an image"));
      updateFolderPrefs({ bgImage: media.url });
      toast.success(T("تصویر پس‌زمینه ذخیره شد", "Background image saved"));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : T("بارگذاری ناموفق بود", "Upload failed"), {
        action: { label: T("تلاش دوباره", "Retry"), onClick: () => void uploadBackground(file) },
      });
    } finally {
      setUploadingBg(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };
  return (
    <>
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" data-testid="folder-bg-file-input"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadBackground(f); }} />
      <HeaderTitlePortal title={title} />
      {isFolder && (
        <HeaderActionsPortal>
          <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                aria-label={T("تنظیمات فولدر", "Folder settings")}
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={6} className="w-60 text-xs p-1.5 space-y-1">
              <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                {T("نمای فولدر", "Folder View")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={folderPrefs.view}
                onValueChange={(value) =>
                  updateFolderPrefs({ view: value as FolderPrefs["view"] })
                }
              >
                <DropdownMenuRadioItem value="list" className="rounded-lg cursor-pointer">
                  📋 {T("لیست تسک‌ها", "Task List")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="kanban-stream" className="rounded-lg cursor-pointer">
                  🎯 {T("اهداف و کانبان", "Goals & Kanban")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="kanban-columns" className="rounded-lg cursor-pointer">
                  🧱 {T("برد ستونی", "Columns Board")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                {T("ترتیب نمایش", "Sort Order")}
              </DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={folderPrefs.sortOrder}
                onValueChange={(value) =>
                  updateFolderPrefs({ sortOrder: value as FolderPrefs["sortOrder"] })
                }
              >
                <DropdownMenuRadioItem value="manual" className="rounded-lg cursor-pointer">
                  {T("دستی", "Manual")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="priority" className="rounded-lg cursor-pointer">
                  {T("بر اساس اولویت", "By Priority")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="due_date" className="rounded-lg cursor-pointer">
                  {T("بر اساس سررسید", "By Due Date")}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="alphabetical" className="rounded-lg cursor-pointer">
                  {T("الفبایی", "Alphabetical")}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>

              <DropdownMenuSeparator />

              <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground px-2 py-1">
                {T("رنگ پس‌زمینه", "Background Color")}
              </DropdownMenuLabel>
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 pt-1">
                {FOLDER_BG_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.label}
                    aria-label={color.label}
                    onClick={() => updateFolderPrefs({ bgColor: color.value })}
                    className={`h-6 w-6 rounded-full border border-border/60 transition-transform hover:scale-110 ${
                      folderPrefs.bgColor === color.value ? "ring-2 ring-primary ring-offset-1" : ""
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
                <button
                  type="button"
                  title={T("بدون رنگ", "No color")}
                  aria-label={T("بدون رنگ", "No color")}
                  onClick={() => updateFolderPrefs({ bgColor: null })}
                  className={`h-6 w-6 rounded-full border border-border/60 bg-background text-[10px] ${
                    folderPrefs.bgColor === null ? "ring-2 ring-primary ring-offset-1" : ""
                  }`}
                >
                  ×
                </button>
              </div>

              <DropdownMenuItem onSelect={() => imageInputRef.current?.click()} disabled={uploadingBg} className="rounded-lg cursor-pointer" data-testid="folder-bg-image-upload">
                {uploadingBg ? <Loader2 className="w-3.5 h-3.5 ms-1 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5 ms-1" />} {T("تصویر پس‌زمینه", "Background image")}
              </DropdownMenuItem>
              {folderPrefs.bgImage && (
                <DropdownMenuItem onSelect={() => updateFolderPrefs({ bgImage: null })} className="rounded-lg cursor-pointer" data-testid="folder-bg-image-remove">
                  <ImageOff className="w-3.5 h-3.5 ms-1" /> {T("حذف تصویر پس‌زمینه", "Remove background image")}
                </DropdownMenuItem>
              )}

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onSelect={() => setDelFolderOpen(true)}
                className="text-destructive focus:bg-destructive/10 rounded-lg cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 ms-1" /> {T("حذف فولدر", "Delete Folder")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </HeaderActionsPortal>
      )}
    </>
  );
}
