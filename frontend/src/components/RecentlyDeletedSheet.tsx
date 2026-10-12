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
  const [restoring, setRestoring] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setItems(listDeleted());
    const unsub = subscribeDeleted(() => setItems(listDeleted()));
    const t = window.setInterval(() => setItems(listDeleted()), 5000);
    return () => { unsub(); window.clearInterval(t); };
  }, [open]);

  const handleRestore = async (e: DeletedEntry) => {
    if (restoring) return;
    setRestoring(e.id);
    try {
      const restored = await restoreDeleted(e.id);
      if (restored === false) throw new Error("بازگردانی انجام نشد؛ حساب و وجود نسخهٔ بازیابی را بررسی کن.");
      haptic("success");
      toast.success(`بازگردانی شد: ${e.label}`);
    } catch (err: any) {
      toast.error(err?.message || "خطا در بازگردانی");
    } finally {
      setRestoring(null);
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
      <p className="mt-3 text-xs text-muted-foreground">نسخه‌های دستگاهی فقط در همین دستگاه تا ۱۰ دقیقه قابل بازگردانی‌اند؛ نسخه‌های موقت با بارگذاری مجدد از بین می‌روند. این فهرست پشتیبان ابری نیست.</p>
      <div className="mt-3 space-y-2">
        {items.map((e) => (
          <div key={e.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40">
            <span className="text-[10px] uppercase opacity-60 w-12">{e.kind}</span>
            <div className="min-w-0 flex-1"><span className="block text-sm truncate">{e.label}</span><span className="text-[10px] text-muted-foreground">{e.recoveryMode === "device" ? "نسخهٔ دستگاهی" : "موقت — فقط این نشست"}</span></div>
            <span className="text-[10px] text-muted-foreground tabular-nums">{timeAgo(e.deletedAt)}</span>
            <Button size="sm" variant="ghost" disabled={restoring !== null} onClick={() => handleRestore(e)} className="min-h-11 px-2">
              <RotateCcw className="w-3.5 h-3.5 me-1" /> بازگردانی
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <Button size="sm" variant="ghost" className="text-xs text-muted-foreground"
          disabled={restoring !== null}
          onClick={() => { if (!window.confirm("نسخه‌های بازیابی از این فهرست حذف شوند؟ پس از پاک‌سازی از اینجا قابل بازگردانی نیستند.")) return; clearDeleted(); toast("لیست پاک شد"); }}>
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
