import { useEffect, useState } from "react";
import { HardDrive, Loader2, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./SectionCard";
import { useBilingual } from "@/hooks/useBilingual";
import { connectGoogle, disconnectGoogle, getGoogleStatus, type GoogleStatus } from "@/lib/googleLink";

export function GoogleLinkSettings() {
  const { T } = useBilingual();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = () => getGoogleStatus().then(setStatus).catch(() => setStatus(null));
  useEffect(() => { void refresh(); }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    try { await fn(); await refresh(); } catch (e: any) { toast.error(e?.message || T("خطا", "Error")); } finally { setBusy(false); }
  };

  return (
    <SectionCard
      icon={HardDrive}
      title={T("گوگل درایو و فوتوز", "Google Drive & Photos")}
      description={T(
        "فایل‌های انتخابی از درایو و عکس‌های فوتوز فوراً در فضای ابری خود اپ کپی می‌شوند. توکن‌ها رمزنگاری‌شده روی سرور می‌مانند.",
        "Files picked from Drive and Photos are copied into the app's own cloud storage. Tokens are stored encrypted on the server.",
      )}
    >
      <div data-testid="google-link-settings" className="space-y-3">
        {!status ? (
          <p className="text-xs text-muted-foreground" data-testid="google-link-status">{T("در حال بررسی…", "Checking…")}</p>
        ) : !status.configured ? (
          <p className="text-xs text-amber-700 dark:text-amber-300 rounded-lg bg-amber-500/10 p-3" data-testid="google-link-not-configured">
            {T("اتصال گوگل هنوز روی سرور تنظیم نشده است (Client ID و Secret لازم است).", "Google is not configured on the server yet (Client ID and Secret required).")}
          </p>
        ) : status.connected ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 px-3 py-1.5" data-testid="google-link-connected">
              {T("متصل", "Connected")}{status.email ? ` · ${status.email}` : ""}
            </span>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => run(disconnectGoogle)} className="gap-1 rounded-full" data-testid="google-disconnect-btn">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Unlink className="w-3 h-3" />} {T("قطع اتصال", "Disconnect")}
            </Button>
          </div>
        ) : (
          <Button size="sm" disabled={busy} onClick={() => run(connectGoogle)} className="gap-1 rounded-full" data-testid="google-connect-btn">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <HardDrive className="w-3 h-3" />} {T("اتصال حساب گوگل", "Connect Google account")}
          </Button>
        )}
      </div>
    </SectionCard>
  );
}
