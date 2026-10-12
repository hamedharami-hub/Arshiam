import { useEffect, useState } from "react";
import { CloudUpload, HardDrive, Images, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import type { RemoteAttachment } from "@/lib/attachmentUpload";
import { connectGoogle, getGoogleStatus, importDriveFiles, openExternal, pickFromDrive, pickFromPhotos, uploadAttachmentToDrive, type GoogleStatus } from "@/lib/googleLink";

function useGoogleConnection() {
  const { T } = useBilingual();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const refresh = async (fresh = true) => {
    setLoading(true);
    setError("");
    try { setStatus(await getGoogleStatus(fresh)); }
    catch (e) { setError(e instanceof Error ? e.message : T("بررسی اتصال گوگل ناموفق بود", "Could not check Google connection")); }
    finally { setLoading(false); }
  };
  const connect = async () => {
    setLoading(true);
    setError("");
    try { await connectGoogle(); }
    catch (e) { setError(e instanceof Error ? e.message : T("اتصال گوگل ناموفق بود", "Could not connect Google")); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    void refresh(false);
    // Native OAuth returns through the external browser; check the connection on return.
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);
  return { status, error, loading, refresh, connect };
}

function GoogleConnectionRecovery({ connection }: { connection: ReturnType<typeof useGoogleConnection> }) {
  const { T } = useBilingual();
  return <div className="space-y-1">
    {connection.error && <p role="alert" className="text-xs text-destructive">{connection.error}</p>}
    {connection.status?.configured && !connection.status.connected && <p className="text-xs text-muted-foreground">{T("برای ادامه حساب گوگل را وصل کنید.", "Connect your Google account to continue.")}</p>}
    {connection.error && <Button size="sm" variant="outline" disabled={connection.loading} onClick={() => void connection.refresh()}>{T("تلاش دوباره", "Retry")}</Button>}
    {connection.status?.configured && !connection.status.connected && <Button size="sm" variant="outline" disabled={connection.loading} onClick={() => void connection.connect()}>{T("اتصال گوگل", "Connect Google")}</Button>}
  </div>;
}

/** "From Drive" / "From Photos" buttons; hidden until Google is configured on the server. */
export function GoogleImportButtons({ taskId, onImported }: { taskId: string; onImported: (items: RemoteAttachment[]) => void }) {
  const { T } = useBilingual();
  const connection = useGoogleConnection();
  const { status } = connection;
  const [busy, setBusy] = useState<"drive" | "photos" | null>(null);
  const [importError, setImportError] = useState("");
  const [retryKind, setRetryKind] = useState<"drive" | "photos" | null>(null);

  if (status && !status.configured && !connection.error) return null;

  const report = (r: { items: RemoteAttachment[]; errors: Array<{ detail: string }> }) => {
    if (r.items.length) { onImported(r.items); toast.success(T(`${r.items.length} فایل در فضای ابری اپ کپی شد`, `${r.items.length} file(s) copied to app storage`)); }
    r.errors.forEach((e) => toast.error(e.detail));
    if (r.errors.length) setImportError(T(
      `${r.items.length} فایل ذخیره شد؛ بعضی فایل‌ها وارد نشدند. فقط فایل‌های ناموفق را دوباره انتخاب کنید. `,
      `${r.items.length} files saved; some files were not imported. Select only the failed files again. `
    ) + r.errors.map(e => e.detail).join("; "));
  };

  const run = async (kind: "drive" | "photos") => {
    if (!status?.connected) { await connection.connect(); return; }
    setBusy(kind);
    setImportError("");
    setRetryKind(kind);
    try {
      if (kind === "drive") {
        const ids = await pickFromDrive();
        if (ids.length) report(await importDriveFiles(taskId, ids));
      } else {
        toast.message(T("عکس‌ها را در صفحهٔ گوگل فوتوز انتخاب کن و Done را بزن", "Pick photos in Google Photos, then tap Done"));
        report(await pickFromPhotos(taskId));
      }
    } catch (e: any) {
      const message = e?.status === 408 ? T("زمان انتخاب تمام شد", "Selection timed out") : e?.message || T("خطا", "Error");
      setImportError(message);
      toast.error(message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-1 mb-2" data-testid="google-import-buttons">
      <GoogleConnectionRecovery connection={connection} />
      {importError && <div className="space-y-1"><p role="alert" className="text-xs text-destructive">{importError}</p><Button size="sm" variant="outline" disabled={!!busy || connection.loading} onClick={() => retryKind && void run(retryKind)}>{T("تلاش دوباره (انتخاب فایل)", "Retry (choose files)")}</Button></div>}
      <div className="flex gap-2">
      {status?.connected && status.picker_ready && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-[11px]" disabled={!!busy} onClick={() => run("drive")} data-testid="attach-from-drive-btn">
          {busy === "drive" ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />} {T("از درایو", "From Drive")}
        </Button>
      )}
      {status?.connected && <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-[11px]" disabled={!!busy} onClick={() => run("photos")} data-testid="attach-from-photos-btn">
        {busy === "photos" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Images className="w-3 h-3" />} {T("از گوگل فوتوز", "From Photos")}
      </Button>}
      </div>
    </div>
  );
}

/** Copies an app attachment into the user's "Arshnaz" folder in Google Drive. */
export function SaveToDriveButton({ attachmentId }: { attachmentId: string }) {
  const { T } = useBilingual();
  const connection = useGoogleConnection();
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  if (connection.status && !connection.status.configured && !connection.error) return null;

  const save = async () => {
    setBusy(true);
    setSaveError("");
    try {
      const r = await uploadAttachmentToDrive(attachmentId);
      toast.success(T("در پوشهٔ Arshnaz درایو ذخیره شد", "Saved to the Arshnaz folder in Drive"), r.web_view_link
        ? { action: { label: T("باز کردن", "Open"), onClick: () => openExternal(r.web_view_link!) } } : undefined);
    } catch (e: any) {
      setSaveError(e?.message || T("خطا", "Error"));
      toast.error(e?.message || T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-1">
    <GoogleConnectionRecovery connection={connection} />
    {saveError && <div><p role="alert" className="text-xs text-destructive">{saveError}</p><Button size="sm" variant="outline" disabled={busy} onClick={() => void save()}>{T("تلاش دوباره", "Retry")}</Button></div>}
    {connection.status?.connected &&
    <Button size="icon" variant="ghost" onClick={save} disabled={busy} data-testid="attachment-save-to-drive-btn" aria-label={T("ذخیره در درایو", "Save to Drive")}>
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
    </Button>}
    </div>
  );
}
