import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { WifiOff, RefreshCw, CloudOff, CheckCircle2, AlertTriangle } from "lucide-react";
import { canReplayForOwner, getQueue, onQueueChange, flushQueue, getQueuedOpOwnerId } from "@/lib/offlineQueue";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import OfflineConflictReviewDialog from "@/components/OfflineConflictReviewDialog";
import type { QueuedOp } from "@/lib/offlineQueue";

const formatTime = (ts: number, isEn: boolean) => {
  try {
    return new Intl.DateTimeFormat(isEn ? "en-US" : "fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(ts));
  } catch {
    return "";
  }
};

export default function OfflineIndicator() {
  const { user } = useAuth();
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => (isEn ? en : fa);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [queue, setQueue] = useState<QueuedOp[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItems, setReviewItems] = useState<QueuedOp[]>([]);
  const [lastSync, setLastSync] = useState<number | null>(() => {
    try {
      const v = localStorage.getItem("arshnaz_last_sync");
      return v ? parseInt(v, 10) : null;
    } catch {
      return null;
    }
  });

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

  const pending = queue.length;
  const conflicts = queue.filter((item) => item.conflictReason && canReplayForOwner(item, user?.id));
  const unattributed = queue.filter((item) => !getQueuedOpOwnerId(item)).length;
  const failedItems = queue.filter((item) => item.lastError && canReplayForOwner(item, user?.id));
  const quotaExceeded = failedItems.some((item) => /resource.exhausted|quota.exceeded|free daily read units/i.test(item.lastError || ""));

  const sync = async () => {
    setSyncing(true);
    try {
      const { ok } = await flushQueue({ retryConflicts: true, forceRetry: true });
      if (ok > 0) {
        const now = Date.now();
        setLastSync(now);
        try {
          localStorage.setItem("arshnaz_last_sync", String(now));
        } catch { /* ignore */ }
      }
      setQueue(await getQueue());
    } finally {
      setSyncing(false);
    }
  };

  const openConflictReview = () => {
    setReviewItems(conflicts);
    setReviewOpen(true);
  };

  if (online && pending === 0 && !lastSync && !reviewOpen) return null;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 flex max-w-[calc(100vw-1rem)] -translate-x-1/2 flex-wrap items-center justify-center gap-2 rounded-2xl border bg-card/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
        {!online ? (
          <>
            <WifiOff className="h-3.5 w-3.5 text-destructive" />
            <span>{T("آفلاین — تغییرات ذخیره می‌شود", "Offline — changes saved")}</span>
          </>
        ) : pending > 0 ? (
          <>
            {conflicts.length > 0 ? (
              <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
            ) : (
              <CloudOff className="h-3.5 w-3.5 text-primary" />
            )}
            <span>{`${pending} ${T("تغییر در صف", "pending changes")}`}</span>
            {quotaExceeded && (
              <span role="status" className="text-amber-700 dark:text-amber-400">
                {T("سهمیهٔ Firestore پر شده؛ تغییرات روی این دستگاه محفوظ‌اند", "Firestore quota reached; changes remain safe on this device")}
              </span>
            )}
            {!quotaExceeded && failedItems.length > 0 && (
              <span role="status" className="text-amber-700 dark:text-amber-400">
                {T("همگام‌سازی ناموفق بود؛ تغییرات محفوظ‌اند", "Sync failed; changes remain saved locally")}
              </span>
            )}
            {unattributed > 0 && (
              <span role="status" className="text-amber-700 dark:text-amber-400">
                {T(
                  `${unattributed} تغییر قدیمی بدون مالک مشخص نگه داشته شده و خودکار همگام نمی‌شود`,
                  `${unattributed} legacy change(s) have no clear owner and will not sync automatically`,
                )}
              </span>
            )}
            {conflicts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="h-6 gap-1 px-2"
                onClick={openConflictReview}
              >
                <AlertTriangle className="h-3 w-3" />
                {T(`بررسی تعارض (${conflicts.length})`, `Review conflicts (${conflicts.length})`)}
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              aria-label={T("همگام‌سازی تغییرات", "Sync changes")}
              disabled={syncing}
              onClick={sync}
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
            <span>{T("آنلاین", "Online")}{lastSync ? ` · ${T(`آخرین همگام‌سازی ${formatTime(lastSync, isEn)}`, `Last sync ${formatTime(lastSync, isEn)}`)}` : ""}</span>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2"
              aria-label={T("همگام‌سازی تغییرات", "Sync changes")}
              disabled={syncing}
              onClick={sync}
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? "animate-spin" : ""}`} />
            </Button>
          </>
        )}
      </div>
      <OfflineConflictReviewDialog
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        ownerId={user?.id || ""}
        items={reviewItems}
      />
    </>
  );
}
