export type SaveState = "idle" | "saving" | "saved" | "queued" | "error";

/** Acknowledges only writes completed by the caller, never initial defaults. */
export function SaveStatus({ state, isEn, local = false }: { state: SaveState; isEn: boolean; local?: boolean }) {
  const messages = {
    idle: isEn ? "Changes are saved when you change a setting." : "ذخیره با تغییر هر تنظیم انجام می‌شود.",
    saving: isEn ? "Saving…" : "در حال ذخیره…",
    saved: local ? (isEn ? "Saved on this device." : "روی این دستگاه ذخیره شد.") : (isEn ? "Settings save completed." : "ذخیرهٔ تنظیمات انجام شد."),
    queued: isEn ? "Saved on this device and queued for sync; cloud save is pending." : "روی دستگاه ذخیره و برای همگام‌سازی صف‌بندی شد؛ ذخیرهٔ ابری هنوز انجام نشده است.",
    error: isEn ? "Save failed. The latest change was not confirmed saved. Please try again." : "ذخیره ناموفق بود. ذخیرهٔ آخرین تغییر تأیید نشد؛ دوباره تلاش کن.",
  };
  return <p role={state === "error" ? "alert" : "status"} aria-live={state === "error" ? "assertive" : "polite"} className={`text-xs leading-6 ${state === "error" ? "text-destructive" : "text-muted-foreground"}`}>{messages[state]}</p>;
}
