import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { HeaderActionsPortal } from "@/components/HeaderActionsPortal";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa_install_dismissed_v1";
const SESSION_KEY = "pwa_install_session_v1";

/**
 * Dismissal is remembered against a per-session id, so "Later" only hides the
 * prompt for the current session. A new session gets a new id, which keeps the
 * install entry available instead of suppressing it forever.
 */
function sessionId(): string {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

function dismissedThisSession(): boolean {
  const id = sessionId();
  if (!id) return false;
  try {
    return localStorage.getItem(DISMISS_KEY) === id;
  } catch {
    return false;
  }
}

export default function InstallPrompt() {
  const { i18n } = useTranslation();
  const isEn = i18n.language?.startsWith("en") ?? false;
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [installError, setInstallError] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    if (isStandalone) { setInstalled(true); return; }

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      if (!dismissedThisSession()) setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari has no beforeinstallprompt — show manual hint
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIOS) {
      setIosHint(true);
      setVisible(!dismissedThisSession());
    }

    const installedHandler = () => { setInstalled(true); setVisible(false); setEvt(null); };
    const open = () => setVisible(true);
    window.addEventListener("appinstalled", installedHandler);
    window.addEventListener("arshnaz:open-install", open);
    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", installedHandler);
      window.removeEventListener("arshnaz:open-install", open);
    };
  }, []);

  if (installed) return null;
  if (!visible) return (
    <HeaderActionsPortal><Button size="icon" variant="ghost" onClick={() => setVisible(true)} aria-label={isEn ? "Install app or view instructions" : "نصب برنامه یا راهنمای نصب"} title={isEn ? "Install app" : "نصب برنامه"}>
      <Download className="h-4 w-4" aria-hidden="true" />
    </Button></HeaderActionsPortal>
  );

  const dismiss = () => {
    const id = sessionId();
    if (id) {
      try { localStorage.setItem(DISMISS_KEY, id); } catch {}
    }
    setVisible(false);
  };

  return (
    <div role="region" aria-label={isEn ? "App installation" : "نصب برنامه"} className="fixed bottom-[calc(env(safe-area-inset-bottom)+5rem)] right-4 left-4 sm:left-auto sm:max-w-sm z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain rounded-xl border bg-card p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">{isEn ? "Install ARSHNAZ on your device" : "نصب ARSHNAZ روی دستگاه"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint
              ? (isEn ? "Tap Share in Safari, then choose Add to Home Screen." : "روی دکمه Share در سافاری بزنید و «Add to Home Screen» را انتخاب کنید.")
              : evt
                ? (isEn ? "Works offline. Long-press the icon for Today, Check-in, Pomodoro, and SOS shortcuts." : "آفلاین کار می‌کند + با نگه‌داشتن آیکون، میانبر «امروز / Check-in / Pomodoro / SOS» داری.")
                : (isEn ? "Open your browser menu and choose Install app or Add to Home Screen. If unavailable, try Chrome or Edge; on iPhone use Safari → Share → Add to Home Screen." : "از منوی مرورگر «نصب برنامه» یا «افزودن به صفحه اصلی» را انتخاب کنید. اگر موجود نیست، از کروم یا اج استفاده کنید؛ در آیفون: سافاری ← اشتراک‌گذاری ← افزودن به صفحه اصلی.")}
          </p>
          {installError && <p role="alert" className="mt-2 text-xs text-destructive">{isEn ? "Installation failed. Try again or use your browser's install menu." : "نصب انجام نشد. دوباره تلاش کنید یا از منوی نصب مرورگر استفاده کنید."}</p>}
          {!iosHint && evt && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={installing}
                onClick={async () => {
                  if (!evt) return;
                  setInstalling(true);
                  setInstallError(false);
                  try {
                    await evt.prompt();
                    const choice = await evt.userChoice;
                    setEvt(null); // browser install events are single-use
                    if (choice.outcome === "accepted") setInstalled(true);
                    dismiss();
                  } catch { setInstallError(true); setEvt(null); }
                  finally { setInstalling(false); }
                }}
              >
                {isEn ? "Install" : "نصب"}
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                {isEn ? "Later" : "بعداً"}
              </Button>
            </div>
          )}
        </div>
        <button type="button" onClick={dismiss} aria-label={isEn ? "Dismiss install prompt" : "بستن پیشنهاد نصب"} className="grid h-11 w-11 shrink-0 place-items-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
