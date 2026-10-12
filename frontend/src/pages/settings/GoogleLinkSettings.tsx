import { useEffect, useState } from "react";
import { HardDrive, Loader2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { SectionCard } from "./SectionCard";
import { useBilingual } from "@/hooks/useBilingual";
import { connectGoogle, disconnectGoogle, getGoogleStatus, type GoogleStatus } from "@/lib/googleLink";

export function GoogleLinkSettings() {
  const { T } = useBilingual();
  const [status, setStatus] = useState<GoogleStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const refresh = async () => {
    setChecking(true);
    setCheckFailed(false);
    try {
      setStatus(await getGoogleStatus(true));
    } catch {
      setStatus(null);
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  };
  useEffect(() => {
    void refresh();
    const result = new URLSearchParams(window.location.search).get("google");
    if (result === "connected") toast.success(T("حساب گوگل وصل شد", "Google account connected"));
    else if (result) toast.error(result === "missing_scopes"
      ? T("همهٔ دسترسی‌ها تأیید نشد؛ دوباره وصل شو و هر دو تیک را بزن", "Not all permissions were granted; connect again and allow both")
      : T("اتصال گوگل انجام نشد", "Google connection was not completed"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try { await fn(); await refresh(); } catch (e: any) {
      const message = e?.message || T("خطا", "Error");
      setActionError(message);
      toast.error(message);
    } finally { setBusy(false); }
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
        {checking ? (
          <p className="text-xs text-muted-foreground" data-testid="google-link-status">{T("در حال بررسی…", "Checking…")}</p>
        ) : checkFailed || !status ? (
          <div className="space-y-2" data-testid="google-link-error">
            <p className="text-xs text-destructive rounded-lg bg-destructive/5 border border-destructive/30 p-3">
              {T("بررسی وضعیت اتصال گوگل انجام نشد.", "Could not check the Google connection status.")}
            </p>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => void refresh()} className="gap-1 rounded-full" data-testid="google-link-retry">
              <RefreshCw className="w-3 h-3" /> {T("تلاش دوباره", "Try again")}
            </Button>
          </div>
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
        {actionError && (
          <p className="text-xs text-destructive" data-testid="google-link-action-error">{actionError}</p>
        )}
      </div>
    </SectionCard>
  );
}
