import { toast } from "sonner";
import type { TaskPersistenceStatus } from "@/lib/firestoreDataService";

/** Normalise whatever an update callback returns into the real save result. */
export function toSaveStatus(result: unknown): TaskPersistenceStatus {
  if (result === "queued" || result === "failed" || result === "saved") return result;
  return "failed";
}
/** Report the real outcome: saved, waiting in the offline queue, or failed. */
export function reportSave(status: TaskPersistenceStatus, fa: boolean, success?: string) {
  if (status === "failed") toast.error(fa ? "ذخیره نشد؛ دوباره تلاش کن" : "Not saved, please retry");
  else if (status === "queued") toast.info(fa ? "روی این دستگاه ذخیره شد؛ با اتصال اینترنت همگام می‌شود" : "Saved on this device — will sync when online");
  else if (success) toast.success(success);
}
