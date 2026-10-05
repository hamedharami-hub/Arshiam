import { Capacitor } from "@capacitor/core";

const ACCOUNT_DELETE_PATH = "/api/user/delete-account";

/** The account endpoint is a Vercel function, not part of the FastAPI companion. */
export function resolveAccountDeletionUrl(webOrigin: string, native: boolean, configuredOrigin = ""): string {
  if (!native) return new URL(ACCOUNT_DELETE_PATH, webOrigin).toString();
  const configured = configuredOrigin.trim();
  if (!configured) throw new Error("Account deletion server is not configured (VITE_ACCOUNT_API_URL). / سرور حذف حساب تنظیم نشده است.");
  let url: URL;
  try { url = new URL(configured); }
  catch { throw new Error("VITE_ACCOUNT_API_URL must be an HTTPS server origin. / نشانی سرور حذف حساب باید HTTPS باشد."); }
  if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash || url.pathname !== "/") {
    throw new Error("VITE_ACCOUNT_API_URL must be an HTTPS server origin. / نشانی سرور حذف حساب باید HTTPS باشد.");
  }
  return `${url.origin}${ACCOUNT_DELETE_PATH}`;
}

export function accountDeletionUrl(): string {
  return resolveAccountDeletionUrl(
    window.location.origin,
    Capacitor.isNativePlatform(),
    (import.meta.env.VITE_ACCOUNT_API_URL as string | undefined) || "",
  );
}
