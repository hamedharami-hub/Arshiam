import { auth } from "@/lib/firebase";

/**
 * Base URL of the ARSHNAZ FastAPI service.
 * Web preview: same origin ("/api/arsh" is routed to FastAPI).
 * Android (Capacitor) / Vercel builds: set VITE_ARSH_API_URL to the deployed service origin.
 */
export const ARSH_API_BASE = ((import.meta.env.VITE_ARSH_API_URL as string) || "").replace(/\/$/, "");

export function arshUrl(path: string): string {
  if (/^https?:\/\//.test(path)) return path;
  return `${ARSH_API_BASE}${path}`;
}

export function absoluteArshUrl(path: string): string {
  const url = arshUrl(path);
  if (/^https?:\/\//.test(url)) return url;
  return new URL(url, window.location.origin).toString();
}

export async function arshAuthHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new ArshApiError(401, "برای این کار باید وارد حساب شوید");
  return { Authorization: `Bearer ${token}` };
}

export class ArshApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function arshFetch<T>(path: string, init: RequestInit = {}, authed = true): Promise<T> {
  const headers: Record<string, string> = {
    ...(init.body && !(init.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    ...(authed ? await arshAuthHeader() : {}),
    ...((init.headers as Record<string, string>) || {}),
  };
  const res = await fetch(arshUrl(path), { ...init, headers });
  if (!res.ok) {
    let detail = res.statusText;
    try {
      const body = await res.json();
      detail = typeof body?.detail === "string" ? body.detail : detail;
    } catch {}
    throw new ArshApiError(res.status, detail);
  }
  return res.json() as Promise<T>;
}
