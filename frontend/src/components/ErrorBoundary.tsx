import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, WifiOff, DownloadCloud } from "lucide-react";

type Props = { children: React.ReactNode; fallback?: React.ReactNode };
type State = {
  hasError: boolean;
  error: Error | null;
  online: boolean;
  recovering: boolean;
  recoveryTried: boolean;
};

/** Detect a stale-chunk/network failure without assuming it is the only cause. */
function isChunkErrorMessage(message: string): boolean {
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk [\w-]+ failed/i.test(message)
  );
}

function currentBuildId(): string {
  try {
    return (
      (import.meta.env.VITE_BUILD_ID as string) ||
      (import.meta.env.VITE_BUILD_NUMBER as string) ||
      (import.meta.env.VITE_APP_VERSION as string) ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

const STALE_BUILD_KEY = (build: string) => `__stale_build_recovery_${build}`;

export class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    online: typeof navigator === "undefined" ? true : navigator.onLine !== false,
    recovering: false,
    recoveryTried: false,
  };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidMount() {
    window.addEventListener("online", this.syncOnline);
    window.addEventListener("offline", this.syncOnline);
    this.syncOnline();
  }

  componentWillUnmount() {
    window.removeEventListener("online", this.syncOnline);
    window.removeEventListener("offline", this.syncOnline);
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error("[ErrorBoundary]", error, info);
    // Deliberately do NOT unregister service workers or delete Cache Storage here.
    // Those caches keep the app usable offline; clearing them can make a transient
    // network/chunk failure much worse. Recovery is offered explicitly below.
  }

  syncOnline = () => {
    this.setState({ online: typeof navigator === "undefined" ? true : navigator.onLine !== false });
  };

  reset = () => this.setState({ hasError: false, error: null, recovering: false });

  /** Consented, per-build stale-build recovery: nudge the SW to update and reload. */
  recoverStaleBuild = async () => {
    this.setState({ recovering: true, recoveryTried: true });
    try {
      sessionStorage.setItem(STALE_BUILD_KEY(currentBuildId()), String(Date.now()));
    } catch {
      // ignore
    }
    try {
      if ("serviceWorker" in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        await registration?.update().catch(() => {});
        // Activate a waiting worker if one exists; caches are intentionally kept.
        registration?.waiting?.postMessage({ type: "SKIP_WAITING" });
      }
    } catch {
      // A missing/failed worker must not block the reload.
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const isEn = (() => {
      try {
        const saved = localStorage.getItem("arshnaz_app_language") || localStorage.getItem("i18nextLng");
        return Boolean(saved?.startsWith("en"));
      } catch {
        return false;
      }
    })();

    const isOffline = !this.state.online;
    const isChunkError = isChunkErrorMessage(String(this.state.error?.message || ""));
    let alreadyRecoveredThisBuild = false;
    try {
      alreadyRecoveredThisBuild = Boolean(sessionStorage.getItem(STALE_BUILD_KEY(currentBuildId())));
    } catch {
      alreadyRecoveredThisBuild = false;
    }
    const canOfferRecovery = isChunkError && !alreadyRecoveredThisBuild && !this.state.recovering;

    return (
      <div dir={isEn ? "ltr" : "rtl"} className="min-h-[60vh] flex items-center justify-center p-6 page-enter">
        <Card role="alert" className="max-w-md w-full p-6 space-y-4 text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
            {isOffline ? (
              <WifiOff className="w-6 h-6 text-destructive" />
            ) : (
              <AlertTriangle className="w-6 h-6 text-destructive" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold">
              {isEn ? "An unexpected error occurred" : "یک خطای غیرمنتظره رخ داد"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isOffline
                ? (isEn
                    ? "You appear to be offline. Reconnect to the internet, then try again."
                    : "به نظر می‌رسد آفلاین هستید. اتصال اینترنت را برقرار کنید و دوباره تلاش کنید.")
                : (isEn
                    ? "Try again first. Reload the page only if that doesn't help — anything unsaved in this section may be lost."
                    : "ابتدا دوباره تلاش کن. فقط اگر مشکل ادامه داشت صفحه را دوباره بارگذاری کن؛ هر چیزی که در این بخش ذخیره نشده باشد ممکن است از بین برود.")}
            </p>
          </div>

          {canOfferRecovery && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-start text-xs leading-5 text-amber-800 dark:text-amber-300">
              <p className="font-semibold">
                {isEn ? "A newer version may be available" : "ممکن است نسخه‌ی جدیدتری موجود باشد"}
              </p>
              <p className="mt-0.5">
                {isEn
                  ? "If reloading keeps failing, fetch the latest version. Your offline files stay cached."
                  : "اگر بارگذاری دوباره ناموفق بود، آخرین نسخه را بگیر. فایل‌های آفلاین‌ات در حافظه‌ی موقت می‌مانند."}
              </p>
            </div>
          )}

          {(this.state.error?.stack || this.state.error?.message) && (
            <pre dir="ltr" className="text-xs text-start bg-muted/50 p-3 rounded border overflow-auto max-h-48 whitespace-pre-wrap font-mono select-all">
              {this.state.error?.stack || this.state.error?.message}
            </pre>
          )}

          <div className="flex flex-wrap gap-2 justify-center">
            <Button onClick={this.reset} variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 me-2" />
              {isEn ? "Try again" : "تلاش مجدد"}
            </Button>
            <Button onClick={() => window.location.reload()} size="sm">
              {isEn ? "Reload page" : "بارگذاری کامل صفحه"}
            </Button>
            {canOfferRecovery && (
              <Button onClick={this.recoverStaleBuild} disabled={this.state.recovering} size="sm" variant="secondary">
                <DownloadCloud className={`w-4 h-4 me-2 ${this.state.recovering ? "animate-pulse" : ""}`} />
                {isEn ? "Get the latest version" : "دریافت آخرین نسخه"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    );
  }
}

export default ErrorBoundary;
