import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useDeviceFormFactor } from "@/hooks/useDeviceFormFactor";
import { useEffect, useState } from "react";
import { listDeleted, restoreDeleted, subscribeDeleted, clearDeleted, type DeletedEntry } from "@/lib/recentlyDeleted";
import { Button } from "@/components/ui/button";
import { RotateCcw, Trash2, Inbox } from "lucide-react";
import { toast } from "sonner";
import { haptic } from "@/lib/haptics";

interface Props { open: boolean; onOpenChange: (v: boolean) => void; }

function timeAgo(ms: number) {
  const s = Math.floor((Date.now() - ms) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  return `${m}m`;
}

export default function RecentlyDeletedSheet({ open, onOpenChange }: Props) {
  const { prefersDialog } = useDeviceFormFactor();
  const [items, setItems] = useState<DeletedEntry[]>([]);

  useEffect(() => {
    if (!open) return;
    setItems(listDeleted());
    const unsub = subscribeDeleted(() => setItems(listDeleted()));
    const t = window.setInterval(() => setItems(listDeleted()), 5000);
    return () => { unsub(); window.clearInterval(t); };
  }, [open]);

  const handleRestore = async (e: DeletedEntry) => {
    haptic("success");
    try {
      await restoreDeleted(e.id);
      toast.success(`بازگردانی شد: ${e.label}`);
    } catch (err: any) {
      toast.error(err?.message || "خطا در بازگردانی");
    }
  };

  const headerTitle = (
    <span className="text-start text-base flex items-center gap-2">
      <Trash2 className="w-4 h-4" />
      حذف‌شده‌های اخیر
      <span className="text-xs text-muted-foreground font-normal me-auto">۱۰ دقیقه نگه‌داری</span>
    </span>
  );

  const bodyContent = items.length === 0 ? (
    <div className="py-10 flex flex-col items-center text-muted-foreground gap-2">
      <Inbox className="w-8 h-8 opacity-50" />
      <span className="text-sm">چیزی برای بازگردانی نیست</span>
    </div>
  ) : (
    <>
      <div className="mt-3 space-y-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
            <span className="text-[10px] uppercase opacity-60 w-12">{e.kind}</span>
            <span className="text-sm truncate flex-1">{e.label}</span>
            <span className="text-[10px] text-muted-foreground tabular-nums">{timeAgo(e.deletedAt)}</span>
            <Button size="sm" variant="ghost" onClick={() => handleRestore(e)} className="h-7 px-2">
              <RotateCcw className="w-3.5 h-3.5 me-1" /> بازگردانی
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
          onClick={() => { clearDeleted(); toast("لیست پاک شد"); }}>
          پاک‌سازی لیست
        </Button>
      </div>
    </>
  );

  if (prefersDialog) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="w-full max-w-md max-h-[75vh] flex flex-col p-4 sm:p-5 overflow-hidden rounded-2xl">
          <DialogHeader className="px-0">
            <DialogTitle asChild>
              {headerTitle}
            </DialogTitle>
            <DialogDescription className="sr-only">
              لیست آیتم‌های حذف‌شده اخیر جهت بازگردانی
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-y-auto min-h-0 flex-1 pe-1">
            {bodyContent}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-6 max-h-[70vh] overflow-auto">
        <SheetHeader>
          <SheetTitle asChild>
            {headerTitle}
          </SheetTitle>
        </SheetHeader>
        {bodyContent}
      </SheetContent>
    </Sheet>
  );
}
