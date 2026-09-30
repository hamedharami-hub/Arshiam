import { useEffect, useState } from "react";
import { CloudUpload, HardDrive, Images, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useBilingual } from "@/hooks/useBilingual";
import type { RemoteAttachment } from "@/lib/attachmentUpload";
import { getGoogleStatus, importDriveFiles, openExternal, pickFromDrive, pickFromPhotos, uploadAttachmentToDrive, type GoogleStatus } from "@/lib/googleLink";

/** "From Drive" / "From Photos" buttons; hidden until Google is configured on the server. */
export function GoogleImportButtons({ taskId, onImported }: { taskId: string; onImported: (items: RemoteAttachment[]) => void }) {
  const { T } = useBilingual();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState<"drive" | "photos" | null>(null);

  useEffect(() => { getGoogleStatus().then(setStatus).catch(() => setStatus(null)); }, []);
  if (!status?.configured) return null;

  const report = (r: { items: RemoteAttachment[]; errors: Array<{ detail: string }> }) => {
    if (r.items.length) { onImported(r.items); toast.success(T(`${r.items.length} فایل در فضای ابری اپ کپی شد`, `${r.items.length} file(s) copied to app storage`)); }
    r.errors.forEach((e) => toast.error(e.detail));
  };

  const run = async (kind: "drive" | "photos") => {
    if (!status.connected) { toast.message(T("اول در تنظیمات › تسک‌ها حساب گوگل را وصل کن", "Connect Google first in Settings › Tasks")); return; }
    setBusy(kind);
    try {
      if (kind === "drive") {
        const ids = await pickFromDrive();
        if (ids.length) report(await importDriveFiles(taskId, ids));
      } else {
        toast.message(T("عکس‌ها را در صفحهٔ گوگل فوتوز انتخاب کن و Done را بزن", "Pick photos in Google Photos, then tap Done"));
        report(await pickFromPhotos(taskId));
      }
    } catch (e: any) {
      toast.error(e?.status === 408 ? T("زمان انتخاب تمام شد", "Selection timed out") : e?.message || T("خطا", "Error"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="flex gap-2 mb-2" data-testid="google-import-buttons">
      {status.picker_ready && (
        <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-[11px]" disabled={!!busy} onClick={() => run("drive")} data-testid="attach-from-drive-btn">
          {busy === "drive" ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />} {T("از درایو", "From Drive")}
        </Button>
      )}
      <Button size="sm" variant="ghost" className="h-7 gap-1 rounded-full text-[11px]" disabled={!!busy} onClick={() => run("photos")} data-testid="attach-from-photos-btn">
        {busy === "photos" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Images className="w-3 h-3" />} {T("از گوگل فوتوز", "From Photos")}
      </Button>
    </div>
  );
}

/** Copies an app attachment into the user's "Arshnaz" folder in Google Drive. */
export function SaveToDriveButton({ attachmentId }: { attachmentId: string }) {
  const { T } = useBilingual();
  const [connected, setConnected] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { getGoogleStatus().then((s) => setConnected(s.configured && s.connected)).catch(() => setConnected(false)); }, []);
  if (!connected) return null;

  const save = async () => {
    setBusy(true);
    try {
      const r = await uploadAttachmentToDrive(attachmentId);
      toast.success(T("در پوشهٔ Arshnaz درایو ذخیره شد", "Saved to the Arshnaz folder in Drive"), r.web_view_link
        ? { action: { label: T("باز کردن", "Open"), onClick: () => openExternal(r.web_view_link!) } } : undefined);
    } catch (e: any) {
      toast.error(e?.message || T("خطا", "Error"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button size="icon" variant="ghost" onClick={save} disabled={busy} data-testid="attachment-save-to-drive-btn" aria-label={T("ذخیره در درایو", "Save to Drive")}>
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CloudUpload className="w-3 h-3" />}
    </Button>
  );
}
