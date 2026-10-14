import { memo, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import { clearMindDeviceData, exportMindDeviceData, importMindDeviceData, listMindDeviceDrafts, readMindRecoveryCandidates } from "@/lib/mind/deviceData";
import { listMindSessionsChecked } from "@/lib/mind/sessionService";
import { migrateLegacyMindDraft } from "@/lib/mind/legacyAdapters";

function download(raw: string, name: string) {
  const url = URL.createObjectURL(new Blob([raw], { type: "application/json" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = name; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function draftRoute(slot: string): string | null {
  if (slot === "thoughts" || slot === "worry") return `/app/${slot}`;
  if (slot.startsWith("thoughts:") || slot.startsWith("worry:")) { const split = slot.indexOf(":"); return `/app/${slot.slice(0, split)}?session=${encodeURIComponent(slot.slice(split + 1))}`; }
  if (slot.startsWith("needs:new:")) return `/app/mind/session/new?${slot.slice("needs:new:".length)}`;
  if (slot.startsWith("needs:")) return `/app/mind/session/${encodeURIComponent(slot.slice(6))}`;
  if (slot.startsWith("selfcheck:")) return `/app/mind/check/${encodeURIComponent(slot.slice(10))}`;
  return null;
}

function DeviceDraftsInner({ ownerId }: { ownerId?: string }) {
  const { T, isEn } = useBilingual();
  const [revision, setRevision] = useState(0);
  const [limit, setLimit] = useState(8);
  const [importing, setImporting] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    const update = () => setRevision(n => n + 1);
    window.addEventListener("arshiam:mind-device-data", update);
    window.addEventListener("storage", update);
    window.addEventListener("arshiam:mind-session", update);
    return () => { alive.current = false; window.removeEventListener("arshiam:mind-device-data", update); window.removeEventListener("storage", update); window.removeEventListener("arshiam:mind-session", update); };
  }, []);
  if (!ownerId) return null;
  const drafts = listMindDeviceDrafts(ownerId);
  const sessions = listMindSessionsChecked(ownerId);
  const candidates = readMindRecoveryCandidates(ownerId);
  const activeDrafts = drafts.ok ? drafts.value.filter(draft => draftRoute(draft.slot) && /[^\s]/.test(JSON.stringify(draft.value))) : [];
  const activeSessions = sessions.ok ? sessions.value.filter(session => session.status === "draft" || session.status === "paused") : [];
  return <details className="surface-card p-4" data-testid="mind-device-drafts" data-revision={revision} onToggle={event => { if (event.currentTarget.open) setRevision(n => n + 1); }}>
    <summary className="min-h-11 cursor-pointer text-sm font-semibold">{T("ادامه و داده‌های Mind روی این دستگاه", "Continue & Mind data on this device")}</summary>
    <div className="mt-3 space-y-3">
      <p className="text-xs leading-5 text-muted-foreground">{T("پیش‌نویس‌های کامل و جلسات مشترک فعلاً محلی‌اند؛ روی دستگاه دیگر خودکار ظاهر نمی‌شوند و رمزنگاری نشده‌اند. فایل پشتیبان خصوصی را امن نگه دار. خروج حساب این داده‌ها را خودکار پاک نمی‌کند.", "Full drafts and shared sessions are device-local, not automatically available on another device and not encrypted. Keep the private backup safe. Signing out does not automatically erase them.")}</p>
      {(drafts.ok === false || sessions.ok === false) && <p role="alert" className="text-xs text-destructive">{T("بخشی از دادهٔ دستگاه قابل خواندن نیست؛ به‌عنوان فهرست خالی گزارش نمی‌شود.", "Some device data is unreadable; it is not being reported as empty.")}</p>}
      {activeSessions.slice(0, limit).map(session => <div key={session.id} className="flex flex-wrap items-center gap-2 border-b pb-2 text-xs">
        <Link className="inline-flex min-h-11 items-center text-primary" to={`/app/thoughts?session=${encodeURIComponent(session.id)}`}>{T("ادامهٔ دغدغه", "Continue concern")}</Link>
        <time dateTime={new Date(session.updatedAt).toISOString()}>{new Date(session.updatedAt).toLocaleString(isEn ? "en-GB" : "fa-IR")}</time>
        <span>{T("روی دستگاه", "On device")}</span>
      </div>)}
      {activeDrafts.slice(0, limit).map(draft => <div key={draft.slot} className="flex flex-wrap items-center gap-2 text-xs">
        <Link className="inline-flex min-h-11 items-center text-primary" to={draftRoute(draft.slot)!}>{T("ادامهٔ پیش‌نویس ابزار", "Continue tool draft")} · {draft.slot.split(":")[0]}</Link>
        <time dateTime={new Date(draft.updatedAt).toISOString()}>{new Date(draft.updatedAt).toLocaleString(isEn ? "en-GB" : "fa-IR")}</time>
      </div>)}
      {(activeDrafts.length > limit || activeSessions.length > limit) && <Button variant="ghost" onClick={() => setLimit(n => n + 8)}>{T("نمایش بیشتر", "Show more")}</Button>}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={() => { const result = exportMindDeviceData(ownerId); if (result.ok) download(result.value, "mind-private-device-backup.json"); else toast.error(T("پشتیبان ساخته نشد؛ دادهٔ خراب حذف نشده است.", "Backup failed; unreadable data was not deleted.")); }}>{T("پشتیبان خصوصی Mind", "Private Mind backup")}</Button>
        <Button variant="outline" disabled={importing} onClick={() => input.current?.click()}>{T("بازیابی همین حساب", "Restore this account")}</Button>
        <Button variant="ghost" onClick={() => { const result = migrateLegacyMindDraft(ownerId); if (result.ok) { setRevision(n => n + 1); toast.success(T("نوشتهٔ قدیمی به جلسه پیوند خورد؛ نسخهٔ اصلی حذف نشد.", "Legacy note linked to a session; the original was not deleted.")); } else toast.error(T("انتقال انجام نشد؛ ممکن است نوشته‌ای نباشد یا نسخه تغییر کرده باشد.", "Migration was not completed; the draft may be absent or changed.")); }}>{T("پیوند نوشتهٔ قدیمی", "Link legacy note")}</Button>
      </div>
      <input ref={input} type="file" accept="application/json,.json" className="sr-only" aria-label={T("فایل پشتیبان Mind", "Mind backup file")} onChange={async event => {
        const file = event.target.files?.[0]; event.target.value = "";
        if (!file || importing) return;
        if (file.size > 20 * 1024 * 1024) { toast.error(T("فایل بیش از حد بزرگ است.", "The file is too large.")); return; }
        setImporting(true);
        try {
          const raw = await file.text();
          if (!alive.current) return;
          const result = importMindDeviceData(ownerId, raw);
          if (result.ok) { setRevision(n => n + 1); toast.success(T(`بازیابی: ${result.value.imported} مورد؛ ${result.value.conflicts} تعارض بدون جایگزینی حفظ شد.`, `Restored ${result.value.imported}; preserved ${result.value.conflicts} conflicts without replacing existing data.`)); }
          else toast.error(T("بازیابی تأیید نشد؛ فایل باید متعلق به همین حساب باشد. بخشی از نوشتن ممکن است انجام شده باشد؛ تلاش مجدد امن است.", "Restore was not confirmed; the file must belong to this account. Some writes may have succeeded; retry is safe."));
        } catch { if (alive.current) toast.error(T("فایل خوانده نشد.", "Could not read the file.")); }
        finally { if (alive.current) setImporting(false); }
      }} />
      {candidates.ok && candidates.value.length > 0 && <details className="rounded border p-3"><summary className="min-h-11 cursor-pointer text-xs">{T("نسخه‌های بازیابی‌شدهٔ دارای تعارض", "Recovered conflicting versions")}</summary>
        <p className="text-xs text-muted-foreground">{T("نسخهٔ فعلی عوض نشده است. نسخهٔ دلخواه را دانلود و متنش را با انتخاب خودت کپی کن؛ پشتیبان کامل نیز این نسخه‌ها را شامل می‌شود.", "The current copy was not replaced. Download the version you want and copy its text deliberately; full backups also include these versions.")}</p>
        {candidates.value.map((candidate, index) => <Button key={index} variant="ghost" className="min-h-11" onClick={() => download(candidate.raw, `mind-recovered-${index + 1}.json`)}>{T("دریافت نسخه", "Download version")} {index + 1}</Button>)}
      </details>}
      <Button variant="ghost" className="text-destructive" disabled={importing} onClick={() => {
        if (!window.confirm(T("همهٔ پیش‌نویس‌ها، جلسات و بازخورد Mind این حساب روی این دستگاه پاک شوند؟ این کار برگشت‌پذیر نیست مگر پشتیبان داشته باشی. دادهٔ ابری، تسک‌ها و یادداشت‌ها حذف نمی‌شوند.", "Erase this account's Mind drafts, sessions and feedback on this device? This cannot be undone without a backup. Cloud data, tasks and notes will not be deleted."))) return;
        if (clearMindDeviceData(ownerId)) { setRevision(n => n + 1); toast.success(T("دادهٔ محلی Mind پاک شد؛ تب‌های باز را ببند یا نسخهٔ ذخیره‌شده را دوباره بخوان.", "Local Mind data erased; close open editors or reload their stored version.")); }
        else toast.error(T("پاک‌کردن کامل تأیید نشد؛ دوباره بررسی کن.", "Complete deletion was not confirmed; check again."));
      }}>{T("پاک‌کردن دادهٔ محلی Mind", "Erase local Mind data")}</Button>
    </div>
  </details>;
}
export const DeviceDrafts = memo(DeviceDraftsInner);
