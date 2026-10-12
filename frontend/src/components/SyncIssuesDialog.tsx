import { useState } from "react";
import { Trash2, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  canReplayForOwner, discardQueuedOp, enqueueOp, type EnqueueOpInput, type QueuedOp,
} from "@/lib/offlineQueue";

const TABLE_LABELS: Record<string, [string, string]> = {
  tasks: ["تسک", "Task"],
  notes: ["نوت", "Note"],
  folders: ["فولدر", "Folder"],
  tags: ["تگ", "Tag"],
  habits: ["عادت", "Habit"],
  contacts: ["مخاطب", "Contact"],
};

function itemLabel(item: QueuedOp): string {
  const p = (item.payload && typeof item.payload === "object" ? item.payload : {}) as Record<string, unknown>;
  const name = p.title || p.name || p.id || item.match?.id;
  return typeof name === "string" && name ? name : "—";
}

/** Translate the raw transport error into a short, actionable category. */
function errorCategory(raw: string | undefined, isEn: boolean): string | null {
  if (!raw) return null;
  const text = raw.toLowerCase();
  const label = (fa: string, en: string) => (isEn ? en : fa);
  if (/network|offline|failed to fetch|fetch failed|unavailable/.test(text)) {
    return label("دسترسی به شبکه نبود؛ با اتصال اینترنت دوباره تلاش کن.", "The network was unreachable; retry when you are online.");
  }
  if (/quota|resource-exhausted|exhausted|limit exceeded/.test(text)) {
    return label("سهمیه‌ی روزانه‌ی همگام‌سازی پر شده؛ بعداً دوباره تلاش کن.", "The daily sync quota is used up; try again later.");
  }
  if (/permission|denied|unauthorized|unauthenticated/.test(text)) {
    return label("اجازه‌ی دسترسی رد شد؛ ممکن است لازم باشد دوباره وارد شوی.", "Access was denied; you may need to sign in again.");
  }
  if (/conflict|newer revision|remote-newer|already exists/.test(text)) {
    return label("نسخه‌ی جدیدتری در ابر وجود دارد؛ پیش از تلاش دوباره بررسی کن.", "A newer copy exists in the cloud; review before retrying.");
  }
  return null;
}

/** Rebuild the minimum input needed to re-queue a change (used by the undo action). */
function toEnqueueInput(item: QueuedOp): EnqueueOpInput {
  return {
    table: item.table,
    op: item.op,
    payload: item.payload,
    match: item.match,
    upsertOptions: item.upsertOptions,
    ownerId: item.ownerId,
    expectedRevision: item.expectedRevision,
    mutationId: item.mutationId,
  };
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: QueuedOp[];
  ownerId: string;
  isEn: boolean;
  syncing: boolean;
  onRetry: () => void;
}

export default function SyncIssuesDialog({ open, onOpenChange, items, ownerId, isEn, syncing, onRetry }: Props) {
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const ownedItems = items.filter(item => canReplayForOwner(item, ownerId));

  const undoDiscard = async (removed: QueuedOp[]) => {
    let restored = 0;
    for (const item of removed) {
      try {
        if (await enqueueOp(toEnqueueInput(item))) restored++;
      } catch { /* keep going; report at the end */ }
    }
    if (restored === removed.length) {
      toast.success(T("تغییرات دوباره به صف برگردانده شدند", "Changes returned to the queue"));
    } else if (restored > 0) {
      toast.warning(T(
        `فقط ${restored} مورد از ${removed.length} بازگردانده شد`,
        `Only ${restored} of ${removed.length} were restored`,
      ));
    } else {
      toast.error(T("بازگرداندن تغییرات ناموفق بود", "Could not restore the changes"));
    }
  };

  const discard = async (list: QueuedOp[], closeAfter = false) => {
    const targets = list.filter(item => canReplayForOwner(item, ownerId));
    if (targets.length === 0) return;
    setBusy(true);
    const removed: QueuedOp[] = [];
    try {
      for (const item of targets) {
        try {
          await discardQueuedOp(item);
          removed.push(item);
        } catch { /* skip items that failed to remove */ }
      }
    } finally {
      setBusy(false);
    }
    if (closeAfter && removed.length === targets.length && list.length === items.length) onOpenChange(false);
    if (removed.length === 0) {
      toast.error(T("حذف از صف انجام نشد", "Could not remove from the queue"));
      return;
    }
    toast(T(
      `${removed.length} تغییر از صف حذف شد`,
      `${removed.length} change${removed.length === 1 ? "" : "s"} removed from the queue`,
    ), {
      description: T("نسخه‌ی ابری تغییر نکرد. برای بازگرداندن، مهلت کوتاهی داری.", "The cloud copy was not changed. You have a short window to undo."),
      action: { label: T("بازگرداندن", "Undo"), onClick: () => void undoDiscard(removed) },
    });
  };

  const downloadRecoveryCopy = () => {
    const payload = {
      exported_at: new Date().toISOString(),
      owner_id: ownerId,
      pending_changes: items.map((item) => ({
        table: item.table,
        op: item.op,
        payload: item.payload,
        match: item.match,
        lastError: item.lastError,
        createdAt: item.createdAt,
        ownedByActiveAccount: canReplayForOwner(item, ownerId),
      })),
    };
    try {
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `arshnaz-unsynced-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(T("ساخت فایل بازیابی ناموفق بود", "Could not build the recovery file"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-lg max-h-[85vh] overflow-y-auto" data-testid="sync-issues-dialog">
        <DialogHeader>
          <DialogTitle>{T("تغییرات همگام‌نشده", "Unsynced changes")}</DialogTitle>
          <DialogDescription className="leading-6">
            {T(
              "این تغییرات روی همین دستگاه ذخیره شده‌اند ولی به فضای ابری نرسیده‌اند. می‌توانی دوباره تلاش کنی یا اگر دیگر لازم نیستند، از صف حذفشان کنی (نسخهٔ ابری تغییری نمی‌کند).",
              "These changes are saved on this device but did not reach the cloud. Retry, or remove them from the queue if you no longer need them (the cloud copy is not changed).",
            )}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-2">
          {items.map((item, i) => {
            const [fa, en] = TABLE_LABELS[item.table] || [item.table, item.table];
            const friendly = errorCategory(item.lastError, isEn);
            return (
              <li key={`${item.id ?? "x"}-${item.createdAt}-${i}`} className="flex items-start gap-3 rounded-md border border-border p-3" data-testid={`sync-issue-${i}`}>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{T(fa, en)}</span>
                    <span dir="auto" className="truncate font-medium">{canReplayForOwner(item, ownerId) ? itemLabel(item) : T("تغییر قدیمی بدون مالک مشخص؛ محفوظ می‌ماند", "Legacy change with no clear owner; retained")}</span>
                  </div>
                  {friendly && <p dir="auto" className="text-start text-[11px] leading-5 text-foreground/80">{friendly}</p>}
                  <p dir="ltr" className="break-words text-start text-[11px] leading-5 text-muted-foreground">
                    {item.lastError || T("مالک این تغییر مشخص نیست", "This change has no clear owner")}
                  </p>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                  disabled={busy || !canReplayForOwner(item, ownerId)}
                  onClick={() => discard([item])}
                  aria-label={T("حذف از صف", "Remove from queue")}
                  title={T("حذف از صف", "Remove from queue")}
                  data-testid={`sync-issue-discard-${i}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
        <DialogFooter className="gap-2 sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={busy || ownedItems.length === 0} onClick={() => setConfirmOpen(true)} data-testid="sync-issues-discard-all">
              <Trash2 className="h-4 w-4" /> {T("حذف تغییرات این حساب از صف", "Remove this account’s changes")}
            </Button>
            <Button variant="outline" disabled={items.length === 0} onClick={downloadRecoveryCopy} data-testid="sync-issues-download">
              <Download className="h-4 w-4" /> {T("فایل بازیابی", "Recovery copy")}
            </Button>
          </div>
          <Button onClick={onRetry} disabled={syncing} data-testid="sync-issues-retry">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {T("تلاش دوباره", "Retry")}
          </Button>
        </DialogFooter>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir={isEn ? "ltr" : "rtl"}>
          <AlertDialogHeader>
            <AlertDialogTitle>{T("حذف تغییرات همگام‌نشده؟", "Remove unsynced changes?")}</AlertDialogTitle>
            <AlertDialogDescription className="leading-6">
              {T(
                `${ownedItems.length} تغییر این حساب از صف حذف می‌شود. نسخهٔ ابری دست‌نخورده می‌ماند و بلافاصله پس از حذف، مهلت کوتاهی برای بازگرداندن داری.`,
                `${ownedItems.length} change${ownedItems.length === 1 ? "" : "s"} for this account will be removed from the queue. The cloud copy is left untouched, and you get a short window to undo right after.`,
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{T("انصراف", "Cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => void discard(ownedItems, true)}
            >
              <Trash2 className="h-4 w-4" /> {T("حذف از صف", "Remove from queue")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}
