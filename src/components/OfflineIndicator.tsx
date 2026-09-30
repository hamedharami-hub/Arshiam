import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw, CloudOff, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { canReplayForOwner, getQueue, onQueueChange, flushQueue, getQueuedOpOwnerId } from "@/lib/offlineQueue";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import OfflineConflictReviewDialog from "@/components/OfflineConflictReviewDialog";
import SyncIssuesDialog from "@/components/SyncIssuesDialog";
import type { QueuedOp } from "@/lib/offlineQueue";

const DISMISS_KEY = "arshnaz_sync_bar_dismissed";

function readDismissed(): string {
  try { return sessionStorage.getItem(DISMISS_KEY) || ""; } catch { return ""; }
}

export default function OfflineIndicator() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<QueuedOp[]>([]);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [dismissed, setDismissed] = useState(readDismissed);

  useEffect(() => {
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    const refresh = async () => setQueue(await getQueue());
    refresh();
    const off = onQueueChange(refresh);
    const t = setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("online", onOn);
      window.removeEventListener("offline", onOff);
      off();
      clearInterval(t);
    };
  }, []);

  useEffect(() => {
    if (!justSynced) return;
    const t = setTimeout(() => setJustSynced(false), 3000);
    return () => clearTimeout(t);
  }, [justSynced]);

  const pending = queue.length;
  const conflicts = queue.filter((item) => item.conflictReason && canReplayForOwner(item, user?.id));
  const unattributedItems = queue.filter((item) => !getQueuedOpOwnerId(item));
  const failedItems = queue.filter((item) => item.lastError && !item.conflictReason && canReplayForOwner(item, user?.id));
  const issueItems = [...failedItems, ...unattributedItems];
  const quotaExceeded = failedItems.some((item) => /resource.exhausted|quota.exceeded|free daily read units/i.test(item.lastError || ""));

  // The bar re-appears only when the set of problems changes after the user dismissed it.
  const signature = online ? `${pending}:${failedItems.length}:${conflicts.length}:${unattributedItems.length}` : "offline";

  const dismiss = () => {
    setDismissed(signature);
    try { sessionStorage.setItem(DISMISS_KEY, signature); } catch { /* ignore */ }
  };

  const sync = async () => {
    setSyncing(true);
    try {
      const { ok } = await flushQueue({ retryConflicts: true, forceRetry: true });
      if (ok > 0) {
        try { localStorage.setItem("arshnaz_last_sync", String(Date.now())); } catch { /* ignore */ }
      }
      const next = await getQueue();
      setQueue(next);
      if (next.length === 0) setJustSynced(true);
    } finally {
      setSyncing(false);
    }
  };

  const openConflictReview = () => {
    setReviewItems(conflicts);
    setReviewOpen(true);
  };

  const hasProblem = !online || pending > 0;
  const visible = (hasProblem && dismissed !== signature) || justSynced;

  return (
    <>
      {visible && (
        <div
          data-testid="sync-status-bar"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+4.75rem)] left-1/2 z-50 flex max-w-[calc(100vw-1.5rem)] -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-card py-1 pe-1 ps-3 text-xs shadow-md md:bottom-4"
        >
          {!online ? (
            <>
              <WifiOff className="h-3.5 w-3.5 shrink-0 text-destructive" />
              <span className="truncate">{T("آفلاین — تغییرات ذخیره می‌شود", "Offline — changes saved")}</span>
            </>
          ) : pending > 0 ? (
            <>
              {conflicts.length > 0 || issueItems.length > 0 ? (
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              ) : (
                <CloudOff className="h-3.5 w-3.5 shrink-0 text-primary" />
              )}
              <span className="shrink-0 tabular-nums">{`${pending} ${T("تغییر در صف", "pending")}`}</span>
              {quotaExceeded && (
                <span role="status" className="hidden truncate text-amber-700 dark:text-amber-400 sm:inline">
                  {T("سهمیهٔ Firestore پر شده؛ تغییرات روی این دستگاه محفوظ‌اند", "Firestore quota reached; changes remain safe on this device")}
                </span>
              )}
              {!quotaExceeded && failedItems.length > 0 && (
                <span role="status" className="hidden truncate text-amber-700 dark:text-amber-400 sm:inline">
                  {T("همگام‌سازی ناموفق بود؛ تغییرات محفوظ‌اند", "Sync failed; changes remain saved locally")}
                </span>
              )}
              {unattributedItems.length > 0 && (
                <span role="status" className="hidden truncate text-amber-700 dark:text-amber-400 sm:inline">
                  {T(
                    `${unattributedItems.length} تغییر قدیمی بدون مالک مشخص نگه داشته شده و خودکار همگام نمی‌شود`,
                    `${unattributedItems.length} legacy change(s) have no clear owner and will not sync automatically`,
                  )}
                </span>
              )}
              {issueItems.length > 0 && (
                <Button size="sm" variant="outline" className="h-6 rounded-full px-2 text-[11px]" onClick={() => setIssuesOpen(true)} data-testid="sync-status-details">
                  {T("جزئیات", "Details")}
                </Button>
              )}
              {conflicts.length > 0 && (
                <Button size="sm" variant="outline" className="h-6 gap-1 rounded-full px-2 text-[11px]" onClick={openConflictReview}>
                  <AlertTriangle className="h-3 w-3" />
                  {T(`بررسی تعارض (${conflicts.length})`, `Review conflicts (${conflicts.length})`)}
                </Button>
              )}
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 rounded-full"
                aria-label={T("همگام‌سازی تغییرات", "Sync changes")}
                disabled={syncing}
                onClick={sync}
                data-testid="sync-status-retry"
              >
                <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
              </Button>
            </>
          ) : (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span className="pe-2">{T("همه چیز همگام شد", "All changes synced")}</span>
            </>
          )}
          {hasProblem && (
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 rounded-full text-muted-foreground"
              aria-label={T("بستن", "Dismiss")}
              title={T("بستن", "Dismiss")}
              onClick={dismiss}
              data-testid="sync-status-dismiss"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
      <OfflineConflictReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        ownerId={user?.id || ""}
        items={reviewItems}
      />
      <SyncIssuesDialog
        open={issuesOpen}
        onOpenChange={setIssuesOpen}
        items={issueItems}
        isEn={isEn}
        syncing={syncing}
        onRetry={sync}
      />
    </>
  );
}
