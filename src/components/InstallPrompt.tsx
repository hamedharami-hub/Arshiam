import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "pwa_install_dismissed_v1";

export default function InstallPrompt() {
  const [evt, setEvt] = useState<BIPEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(DISMISS_KEY)) return;
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // @ts-ignore
      window.navigator.standalone === true;
    if (isStandalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIPEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS Safari has no beforeinstallprompt — show manual hint
    const ua = navigator.userAgent;
    const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
    if (isIOS) {
      setIosHint(true);
      setVisible(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  };

  return (
    <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-50 rounded-xl border bg-card p-4 shadow-xl">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-primary/10 p-2">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">نصب ARSHNAZ روی دستگاه</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {iosHint
              ? "روی دکمه Share در سافاری بزنید و «Add to Home Screen» را انتخاب کنید."
              : "آفلاین کار می‌کند + با نگه‌داشتن آیکون، میانبر «امروز / Check-in / Pomodoro / SOS» داری."}
          </p>
          {!iosHint && (
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={async () => {
                  if (!evt) return;
                  await evt.prompt();
                  await evt.userChoice;
                  dismiss();
                }}
              >
                نصب
              </Button>
              <Button size="sm" variant="ghost" onClick={dismiss}>
                بعداً
              </Button>
            </div>
          )}
        </div>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
