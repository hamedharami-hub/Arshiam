import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./i18n";
import { initOfflineSync } from "@/lib/offlineQueue";
import { bootApplyUIPrefs } from "@/lib/uiScale";
import { initStatusBarTheme } from "@/lib/statusBarTheme";
import { startVersionWatcher, clearAllAppCaches } from "@/lib/versionCheck";

type CapacitorGlobal = {
  isNativePlatform?: () => boolean;
  isNative?: boolean;
};

try {
  bootApplyUIPrefs();
} catch (e) {
  console.warn("bootApplyUIPrefs error:", e);
}

try {
  initStatusBarTheme();
} catch (e) {
  console.warn("initStatusBarTheme error:", e);
}

// Guard: Detect if running inside an iframe, preview host, or native Capacitor app
const isInIframe = (() => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
})();
const host = typeof window !== "undefined" ? window.location.hostname : "";
const isPreviewHost =
  host.includes("id-preview--") ||
  host.includes("run.app") ||
  host.includes("googleusercontent.com");

const capacitor =
  typeof window !== "undefined"
    ? (window as Window & { Capacitor?: CapacitorGlobal }).Capacitor
    : undefined;
const isNativeCapacitor = Boolean(
  typeof window !== "undefined" &&
    (capacitor?.isNativePlatform?.() ||
      capacitor?.isNative ||
      window.location.protocol === "capacitor:")
);

if (isNativeCapacitor) {
  void (async () => {
    try {
      const { StatusBar, Style } = await import("@capacitor/status-bar");
      await StatusBar.setOverlaysWebView({ overlay: true });
      await StatusBar.setStyle({ style: Style.Dark });
    } catch {
      // Status bar configuration is unavailable outside native Capacitor.
    }
  })();
}

if (isInIframe || isNativeCapacitor) {
  // Inside the live editor preview iframe or native Capacitor APKs, avoid aggressive SW caching
  if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
    try {
      navigator.serviceWorker
        .getRegistrations()
        .then((rs) => rs.forEach((r) => r.unregister()))
        .catch(() => {});
    } catch {}
  }
} else if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
  // Standalone browser tab, desktop/mobile PWA: register service worker with offline caching
  import("virtual:pwa-register")
    .then(({ registerSW }) => {
      const updateSW = registerSW({
        immediate: true,
        onNeedRefresh() {
          (window as unknown as { __applyPwaUpdate?: () => void }).__applyPwaUpdate = async () => {
            await clearAllAppCaches();
            updateSW(true);
          };
          window.dispatchEvent(new CustomEvent("pwa-update-available"));
        },
        onRegisteredSW(_swUrl, registration) {
          if (registration) {
            // Poll service worker registration for updates every 30s
            setInterval(() => {
              registration.update().catch(() => {});
            }, 30 * 1000);
          }
        },
        onRegisterError(error) {
          console.warn("SW registration notice:", error);
        },
      });

      // Expose helper to apply update immediately
      (window as unknown as { __applyPwaUpdate?: () => void }).__applyPwaUpdate = async () => {
        await clearAllAppCaches();
        updateSW(true);
      };

      // Reload smoothly when new service worker takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
      });
    })
    .catch((err) => {
      console.warn("PWA registration notice:", err);
    });

  // Start background version watcher
  try {
    startVersionWatcher();
  } catch {}
}

try {
  initOfflineSync();
} catch (e) {
  console.warn("initOfflineSync error:", e);
}

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
