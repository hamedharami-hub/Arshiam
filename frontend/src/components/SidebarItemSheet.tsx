import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { Pencil, Trash2, Sparkles, FolderPlus, Copy, Palette, Share2, Folder as FolderIcon } from "lucide-react";
import { useState, type ComponentType } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { firebaseStore } from "@/lib/firebaseStore";
import { toast } from "sonner";
import ShareDialog from "@/components/ShareDialog";
import { useShareAccess } from "@/hooks/useShareAccess";
import { useAuth } from "@/hooks/useAuth";
import { isFeatureEnabled } from "@/lib/capabilities";

type Item = { id: string; user_id?: string; name: string; color?: string; emoji?: string | null };
type Kind = "folder" | "tag";

interface Props {
  item: Item | null;
  kind: Kind;
  onOpenChange: (open: boolean) => void;
  onDelete: () => void;
  onAIChat?: () => void;
  onAddSubfolder?: () => void;
  onChanged?: (patch?: Pick<Partial<Item>, "color" | "emoji">) => void;
}

const COLORS = ["#94a3b8", "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];
const FOLDER_EMOJIS = ["📁", "📂", "💼", "🏠", "🏢", "🎯", "📚", "💡", "🧠", "🎨", "🛠️", "💻", "💰", "❤️", "🌱", "✈️", "🏃", "🛒", "🎵", "📦", "🔖", "⭐", "🌙", "☀️"];

export default function SidebarItemSheet({ item, kind, onOpenChange, onDelete, onAIChat, onAddSubfolder, onChanged }: Props) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState("");
  const [shareOpen, setShareOpen] = useState(false);
  const { user } = useAuth();
  const { isOwner } = useShareAccess(kind === "folder" ? "folder" : "folder", kind === "folder" && item ? item.id : "", item?.user_id);
  const owns = kind === "tag" ? item?.user_id === user?.id : isOwner;
  const { prefersDialog } = useDeviceFormFactor();
  if (!item) return null;
  const table = kind === "folder" ? "folders" : "tags";
  const customColorValue = /^#[\da-f]{6}$/i.test(item.color || "") ? item.color! : "#94a3b8";

  const Item = ({ icon: Icon, label, onClick, danger, disabled }: {
    icon: ComponentType<{ className?: string }>;
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  }) => (
    <button
      onClick={disabled ? undefined : () => { onClick(); }}
      disabled={disabled}
      className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg transition text-start ${
        disabled ? "opacity-40 cursor-not-allowed" : "hover:bg-accent active:scale-[0.98]"
      } ${danger ? "text-destructive" : ""}`}
    >
      <Icon className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </button>
  );

  const submitRename = async () => {
    if (!owns) { toast(T("فقط صاحب می‌تواند نام را تغییر دهد", "Only the owner can rename")); return; }
    const v = name.trim();
    if (!v) return;
    const { error } = await firebaseStore.from(table).update({ name: v }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { toast.success(T("تغییر نام شد", "Renamed")); setRenaming(false); onChanged?.(); onOpenChange(false); }
  };

  const setColor = async (c: string) => {
    if (!owns) { toast(T("فقط صاحب می‌تواند رنگ را تغییر دهد", "Only the owner can change color")); return; }
    const { error } = await firebaseStore.from(table).update({ color: c }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { onChanged?.({ color: c }); }
  };

  const setEmoji = async (emoji: string | null) => {
    if (kind !== "folder") return;
    if (!owns) { toast(T("فقط صاحب می‌تواند نشانه را تغییر دهد", "Only the owner can change the marker")); return; }
    const { error } = await firebaseStore.from("folders").update({ emoji }).eq("id", item.id);
    if (error) toast.error(error.message);
    else { onChanged?.({ emoji }); }
  };

  const bodyContent = renaming ? (
    <div className="mt-3 flex items-center gap-2">
      <Input autoFocus defaultValue={item.name} onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submitRename()}
        placeholder={T(`نام ${kind === "folder" ? "فولدر" : "تگ"}`, `${kind === "folder" ? "Folder" : "Tag"} name`)} />
      <Button onClick={submitRename} size="sm">{T("ذخیره", "Save")}</Button>
    </div>
  ) : (
    <div className="mt-3 space-y-1">
      <Item icon={Pencil} label={T("تغییر نام", "Rename")} disabled={!owns} onClick={() => { setName(item.name); setRenaming(true); }} />
      {kind === "folder" && isFeatureEnabled("sharing") && (
        <Item icon={Share2} label={T("اشتراک‌گذاری…", "Share…")} disabled={!owns} onClick={() => setShareOpen(true)} />
      )}
      {kind === "folder" && onAIChat && (
        <Item icon={Sparkles} label={T("چت AI روی این فولدر", "AI chat on this folder")} disabled={!owns} onClick={() => { onAIChat(); onOpenChange(false); }} />
      )}
      {kind === "folder" && onAddSubfolder && (
        <Item icon={FolderPlus} label={T("افزودن زیرفولدر", "Add subfolder")} disabled={!owns} onClick={() => { onAddSubfolder(); onOpenChange(false); }} />
      )}
      <Item icon={Copy} label={T("کپی نام", "Copy name")} onClick={async () => {
        try { await navigator.clipboard.writeText(item.name); toast.success(T("کپی شد", "Copied")); } catch { /* noop */ }
        onOpenChange(false);
      }} />
      <div className="px-3 py-3 rounded-lg">
        <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
          <Palette className="w-4 h-4" /> {T("رنگ", "Color")}
        </div>
        <div className="flex flex-wrap gap-2">
          {COLORS.map((c) => (
            <button key={c} onClick={() => setColor(c)} disabled={!owns} aria-label={c}
              className={`w-7 h-7 rounded-full ring-2 ring-transparent transition ${owns ? "hover:ring-primary active:scale-90" : "opacity-40 cursor-not-allowed"}`}
              style={{ backgroundColor: c, borderColor: item.color === c ? "white" : "transparent" }} />
          ))}
          {kind === "folder" && (
            <label className={`flex h-8 items-center gap-2 rounded-full border border-border px-2 text-xs text-muted-foreground ${owns ? "cursor-pointer hover:bg-accent" : "cursor-not-allowed opacity-40"}`}>
              <input
                type="color"
                value={customColorValue}
                disabled={!owns}
                onChange={(event) => void setColor(event.target.value)}
                aria-label={T("انتخاب رنگ دلخواه", "Choose a custom color")}
                className="h-5 w-5 cursor-pointer rounded-full border-0 bg-transparent p-0 disabled:cursor-not-allowed"
              />
              <span>{T("دلخواه", "Custom")}</span>
            </label>
          )}
        </div>
      </div>
      {kind === "folder" && (
        <div className="px-3 py-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
            <FolderIcon className="w-4 h-4" /> {T("نشانهٔ فولدر", "Folder marker")}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            <button
              type="button"
              onClick={() => void setEmoji(null)}
              disabled={!owns}
              aria-label={T("نشانهٔ پیش‌فرض", "Default folder icon")}
              aria-pressed={!item.emoji}
              className={`grid h-9 place-items-center rounded-lg border text-muted-foreground transition hover:bg-accent disabled:opacity-40 ${!item.emoji ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border"}`}
            >
              <FolderIcon className="h-4 w-4" style={{ color: item.color || undefined }} />
            </button>
            {FOLDER_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => void setEmoji(emoji)}
                disabled={!owns}
                aria-label={`${T("انتخاب نشانهٔ", "Select marker")} ${emoji}`}
                aria-pressed={item.emoji === emoji}
                className={`grid h-9 place-items-center rounded-lg border text-lg transition hover:bg-accent disabled:opacity-40 ${item.emoji === emoji ? "border-primary bg-primary/10 ring-1 ring-primary/30" : "border-border"}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
      <Item icon={Trash2} label={T("حذف", "Delete")} danger disabled={!owns} onClick={() => { onOpenChange(false); onDelete(); }} />
    </div>
  );

  return (
    <>
    {prefersDialog ? (
      <Dialog open={!!item && !shareOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md max-h-[75vh] flex flex-col overflow-hidden p-6">
          <DialogHeader>
            <DialogTitle className="text-start text-base truncate flex items-center gap-2">
              {kind === "folder" && item.emoji ? <span className="text-base">{item.emoji}</span> : <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color || "#94a3b8" }} />}
              {item.name}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {item.name} actions
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 pe-1">
            {bodyContent}
          </div>
        </DialogContent>
      </Dialog>
    ) : (
      <Sheet open={!!item && !shareOpen} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-6">
          <SheetHeader>
            <SheetTitle className="text-start text-base truncate flex items-center gap-2">
              {kind === "folder" && item.emoji ? <span className="text-base">{item.emoji}</span> : <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: item.color || "#94a3b8" }} />}
              {item.name}
            </SheetTitle>
          </SheetHeader>
          {bodyContent}
        </SheetContent>
      </Sheet>
    )}
    {kind === "folder" && isFeatureEnabled("sharing") && (
      <ShareDialog
        open={shareOpen}
        onOpenChange={(v) => { setShareOpen(v); if (!v) onOpenChange(false); }}
        resourceType="folder"
        resourceId={item.id}
        resourceTitle={item.name}
      />
    )}
    </>
  );
}
