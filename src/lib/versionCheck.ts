/**
 * Version checking & cache invalidation utility
 * Periodically polls /version.json and compares buildId with running app.
 * If a new build is detected, safely updates PWA/ServiceWorker caches and reloads.
 */

const CURRENT_BUILD_ID = (import.meta.env.VITE_BUILD_ID as string) || "";
const LAST_CHECK_KEY = "arshnaz_last_version_check";

export async function clearAllAppCaches(): Promise<void> {
  try {
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("Failed to clear caches:", e);
  }
}

export async function checkForAppUpdates(force = false): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const now = Date.now();
  let lastCheck = 0;
  try {
    lastCheck = Number(sessionStorage.getItem(LAST_CHECK_KEY) || 0);
    if (!force && now - lastCheck < 30_000) {
      return false;
    }
    sessionStorage.setItem(LAST_CHECK_KEY, String(now));
  } catch {}

  try {
    const res = await fetch(`/version.json?_t=${now}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
    });
    if (!res.ok) return false;

    const data = await res.json();
    const serverBuildId = data?.buildId;
    const serverCommit = data?.commit;

    if (
      (serverBuildId && CURRENT_BUILD_ID && serverBuildId !== CURRENT_BUILD_ID) ||
      (serverCommit && import.meta.env.VITE_GIT_COMMIT && serverCommit !== import.meta.env.VITE_GIT_COMMIT)
    ) {
      console.log("[AppUpdate] New version detected:", data);
      window.dispatchEvent(new CustomEvent("pwa-update-available", { detail: data }));
      return true;
    }
  } catch {
    // Ignore network errors when offline
  }
  return false;
}

export function startVersionWatcher(): () => void {
  if (typeof window === "undefined") return () => {};

  const onVisibilityChange = () => {
    if (document.visibilityState === "visible") {
      checkForAppUpdates().catch(() => {});
    }
  };
  const onFocus = () => {
    checkForAppUpdates().catch(() => {});
  };

  try {
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onFocus);
  } catch {}

  const interval = setInterval(() => {
    checkForAppUpdates().catch(() => {});
  }, 60_000);

  setTimeout(() => {
    checkForAppUpdates().catch(() => {});
  }, 3000);

  return () => {
    try {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onFocus);
      clearInterval(interval);
    } catch {}
  };
}
