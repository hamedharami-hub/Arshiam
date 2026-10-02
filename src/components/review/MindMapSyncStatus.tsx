import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { getMindMapSyncState, MIND_MAP_PROGRESS_EVENT, retryMindMapStudyProgressSync } from "@/lib/mindMapProgress";

export function MindMapSyncStatus({ userId, isEn }: { userId: string; isEn: boolean }) {
  const [state, setState] = useState(() => ({ userId, value: getMindMapSyncState(userId) }));
  const [retrying, setRetrying] = useState(false);
  const sync = state.userId === userId ? state.value : getMindMapSyncState(userId);
  useEffect(() => {
    const update = () => setState({ userId, value: getMindMapSyncState(userId) });
    update();
    const changed = (event: Event) => { if ((event as CustomEvent).detail?.userId === userId) update(); };
    window.addEventListener(MIND_MAP_PROGRESS_EVENT, changed);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener(MIND_MAP_PROGRESS_EVENT, changed);
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, [userId]);
  const labels = {
    local: isEn ? "Saved on this device" : "ذخیره روی این دستگاه",
    pending: isEn ? `Saved on device · ${sync.pendingCount} pending` : `ذخیره روی دستگاه · ${sync.pendingCount} در انتظار همگام‌سازی`,
    synced: isEn ? "Synced" : "همگام‌شده",
    error: !sync.savedOnDevice
      ? (isEn ? "Device save failed — keep this page open" : "ذخیره روی دستگاه ناموفق بود؛ صفحه را نبندید")
      : (isEn ? "Sync failed — saved on device" : "همگام‌سازی ناموفق؛ روی دستگاه ذخیره است"),
  };
  return <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground" role="status" data-testid="mindmap-sync-status" data-state={sync.status}>
    <span>{labels[sync.status]}</span>
    {sync.error && <span className="text-destructive break-words" title={sync.error}>{sync.error}</span>}
    {(sync.status === "pending" || sync.status === "error") && <Button size="sm" variant="ghost" disabled={retrying} onClick={async () => {
      setRetrying(true);
      try { await retryMindMapStudyProgressSync(userId); } finally { setRetrying(false); }
    }}>{isEn ? "Retry sync" : "تلاش دوباره"}</Button>}
  </div>;
}
