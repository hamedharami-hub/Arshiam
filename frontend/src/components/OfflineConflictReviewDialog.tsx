import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { AlertTriangle, Cloud, LaptopMinimal, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getFirestoreConflictSnapshot } from "@/lib/firestoreSync";
import { exportQueuedChange } from "@/lib/queueRecovery";
import { canReplayForOwner, type QueuedOp } from "@/lib/offlineQueue";

type ConflictSnapshot = Awaited<ReturnType<typeof getFirestoreConflictSnapshot>>;
type ReviewResult =
  | { status: "loaded"; snapshot: ConflictSnapshot }
  | { status: "unavailable" }
  | { status: "error" };

interface OfflineConflictReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ownerId: string;
  items: QueuedOp[];
}

function getDocumentId(item: QueuedOp): string | undefined {
  const payload = item.payload && typeof item.payload === "object"
    ? item.payload as Record<string, unknown>
    : undefined;
  const id = payload?.id ?? item.match?.id;
  return typeof id === "string" && id ? id : undefined;
}

function formatJson(value: unknown): string {
  try {
    return JSON.stringify(value ?? null, null, 2) ?? "null";
  } catch {
    return "[This value cannot be displayed as JSON]";
  }
}

function getKey(item: QueuedOp): string {
  return `${item.ownerId ?? "unknown"}:${item.table}:${getDocumentId(item) ?? "no-id"}:${item.createdAt}:${item.id ?? "no-queue-id"}`;
}

function text(isEn: boolean, fa: string, en: string): string {
  return isEn ? en : fa;
}

function ConflictReviewCard({ item, ownerId, isEn }: { item: QueuedOp; ownerId: string; isEn: boolean }) {
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [loading, setLoading] = useState(false);
  const id = getDocumentId(item);

  const loadCloudCopy = async () => {
    if (!id || !canReplayForOwner(item, ownerId)) {
      setResult({ status: "unavailable" });
      return;
    }
    setLoading(true);
    try {
      const snapshot = await getFirestoreConflictSnapshot(ownerId, item.table, id);
      setResult({ status: "loaded", snapshot });
    } catch {
      setResult({ status: "error" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border bg-card/60 p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="rounded-md bg-muted px-2 py-1 font-mono">{item.table}</span>
        <span className="text-muted-foreground">{item.op}</span>
        <span className="ms-auto text-muted-foreground">
          {new Intl.DateTimeFormat(isEn ? "en-US" : "fa-IR", {
            dateStyle: "medium",
            timeStyle: "short",
          }).format(new Date(item.createdAt))}
        </span>
      </div>

      <Button size="sm" variant="outline" onClick={() => exportQueuedChange(item)}>{text(isEn, "دریافت نسخهٔ محلی برای بازیابی", "Download local copy for recovery")}</Button>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="min-w-0 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <LaptopMinimal className="h-4 w-4 text-primary" />
            {text(isEn, "تغییر محلیِ در صف", "Queued local change")}
          </h3>
          <pre dir="ltr" className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-xs leading-5">
            {formatJson(item.payload ?? item.match)}
          </pre>
        </div>

        <div className="min-w-0 space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Cloud className="h-4 w-4 text-emerald-600" />
            {text(isEn, "نسخهٔ فعلی ابر", "Current cloud version")}
          </h3>
          {!id && (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              {text(isEn, "شناسهٔ سند برای مقایسه در دسترس نیست؛ تغییر محلی همچنان در صف باقی می‌ماند.", "A document ID is unavailable for comparison; the local change remains queued.")}
            </p>
          )}
          {id && !result && (
            <Button size="sm" variant="outline" className="h-auto min-h-9 whitespace-normal text-start" disabled={loading} onClick={() => void loadCloudCopy()}>
              {loading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Cloud className="h-4 w-4" />}
              {text(isEn, "خواندن نسخهٔ ابری", "Load cloud copy")}
            </Button>
          )}
          {result?.status === "loaded" && result.snapshot.exists && (
            <pre dir="ltr" className="max-h-64 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-muted/60 p-3 text-xs leading-5">
              {formatJson(result.snapshot.data)}
            </pre>
          )}
          {result?.status === "loaded" && !result.snapshot.exists && (
            <p className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm text-muted-foreground">
              {text(isEn, "این سند در مسیر ابری پیدا نشد؛ تغییر محلی را از صف حذف نکنید.", "The cloud document was not found; do not discard the queued local change.")}
            </p>
          )}
          {result?.status === "error" && (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {text(isEn, "نسخهٔ ابری خوانده نشد. تغییر محلی محفوظ است؛ اتصال یا حساب را بررسی کنید.", "Could not read the cloud copy. The local change is retained; check the connection or account.")}
            </p>
          )}
          {result?.status === "unavailable" && (
            <p className="rounded-lg border bg-muted/40 p-3 text-sm text-muted-foreground">
              {text(isEn, "شناسهٔ سند برای مقایسه در دسترس نیست؛ تغییر محلی همچنان در صف باقی می‌ماند.", "A document ID is unavailable for comparison; the local change remains queued.")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

export default function OfflineConflictReviewDialog({
  open,
  onOpenChange,
  ownerId,
  items,
}: OfflineConflictReviewDialogProps) {
  const { i18n } = useTranslation();
  const isEn = (i18n.language || "fa").startsWith("en");
  const T = (fa: string, en: string) => isEn ? en : fa;
  const visibleItems = useMemo(() => items.filter((item) => canReplayForOwner(item, ownerId)), [items, ownerId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85dvh] w-[calc(100%-1.5rem)] max-w-4xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0 text-start">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            {T("بررسی تعارض‌های همگام‌سازی", "Review sync conflicts")}
          </DialogTitle>
          <DialogDescription>
            {T(
              "نسخهٔ تازه‌ترِ ابری محافظت شده و تغییر محلی شما همچنان در صف است. با انتخاب «خواندن نسخهٔ ابری» فقط همان سند خوانده می‌شود؛ چیزی بازنویسی یا حذف نمی‌شود.",
              "A newer cloud version was protected and your local change remains queued. Select “Load cloud copy” to read just that document; nothing is overwritten or deleted.",
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pe-1">
          {visibleItems.map((item) => (
            <ConflictReviewCard key={getKey(item)} item={item} ownerId={ownerId} isEn={isEn} />
          ))}

          {visibleItems.length === 0 && (
            <p className="rounded-xl border p-4 text-sm text-muted-foreground">
              {T("تعارضی برای این حساب باقی نمانده است.", "No conflicts remain for this account.")}
            </p>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t pt-3">
          <DialogClose asChild>
            <Button variant="outline">{T("بستن", "Close")}</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
