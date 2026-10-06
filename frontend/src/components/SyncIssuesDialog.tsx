import { useState } from "react";
import { Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { canReplayForOwner, discardQueuedOp, type QueuedOp } from "@/lib/offlineQueue";

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
  const ownedItems = items.filter(item => canReplayForOwner(item, ownerId));

  const discard = async (list: QueuedOp[]) => {
    setBusy(true);
    try {
      for (const item of list.filter(item => canReplayForOwner(item, ownerId))) await discardQueuedOp(item);
    } finally {
      setBusy(false);
    }
    if (list.length === items.length && list.every(item => canReplayForOwner(item, ownerId))) onOpenChange(false);
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
            return (
              <li key={`${item.id ?? "x"}-${item.createdAt}-${i}`} className="flex items-start gap-3 rounded-md border border-border p-3" data-testid={`sync-issue-${i}`}>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">{T(fa, en)}</span>
                    <span dir="auto" className="truncate font-medium">{canReplayForOwner(item, ownerId) ? itemLabel(item) : T("تغییر قدیمی بدون مالک مشخص؛ محفوظ می‌ماند", "Legacy change with no clear owner; retained")}</span>
                  </div>
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
          <Button variant="ghost" className="text-destructive hover:bg-destructive/10" disabled={busy || ownedItems.length === 0} onClick={() => discard(ownedItems)} data-testid="sync-issues-discard-all">
            <Trash2 className="h-4 w-4" /> {T("حذف تغییرات این حساب از صف", "Remove this account’s changes")}
          </Button>
          <Button onClick={onRetry} disabled={syncing} data-testid="sync-issues-retry">
            <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /> {T("تلاش دوباره", "Retry")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
