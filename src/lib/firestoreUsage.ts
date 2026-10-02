// Device-side estimate of Firestore billing units and quota back-off.
const USAGE_KEY = "arsh_fs_usage_v1";
const PAUSE_KEY = "arsh_fs_quota_pause_v1";

export type UsageDay = { day: string; reads: number; writes: number; bySource: Record<string, number> };

/** Firestore daily quotas reset at midnight America/Los_Angeles. */
export function quotaDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(now);
}

export function nextQuotaReset(now = new Date()): number {
  const today = quotaDay(now);
  let t = now.getTime();
  // step forward in 15 min increments until the Pacific date changes (max 25h)
  for (let i = 0; i < 100 && quotaDay(new Date(t)) === today; i++) t += 15 * 60_000;
  return t + 2 * 60_000;
}

export function getUsage(): UsageDay {
  const day = quotaDay();
  try {
    const raw = JSON.parse(localStorage.getItem(USAGE_KEY) || "null");
    if (raw && raw.day === day) return { bySource: {}, ...raw };
  } catch { /* ignore */ }
  return { day, reads: 0, writes: 0, bySource: {} };
}

let pending: UsageDay | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
function bump(kind: "reads" | "writes", n: number, source: string) {
  if (n <= 0 || typeof localStorage === "undefined") return;
  const cur = pending && pending.day === quotaDay() ? pending : getUsage();
  cur[kind] += n;
  const key = `${kind === "reads" ? "r" : "w"}:${source}`;
  cur.bySource[key] = (cur.bySource[key] || 0) + n;
  pending = cur;
  if (!flushTimer) {
    flushTimer = setTimeout(() => {
      flushTimer = null;
      try { if (pending) localStorage.setItem(USAGE_KEY, JSON.stringify(pending)); } catch { /* ignore */ }
      window.dispatchEvent(new Event("arsh:fs-usage"));
    }, 1500);
  }
}
export const trackRead = (n: number, source: string) => bump("reads", n, source);
export const trackWrite = (n: number, source: string) => bump("writes", n, source);

export function isQuotaError(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  const text = `${e?.code || ""} ${e?.message || String(error || "")}`;
  return /resource.exhausted|quota.exceeded|free daily (read|write) units/i.test(text);
}

export function markQuotaExhausted(): number {
  const until = nextQuotaReset();
  try { localStorage.setItem(PAUSE_KEY, String(until)); } catch { /* ignore */ }
  window.dispatchEvent(new Event("arsh:fs-usage"));
  return until;
}

export function quotaPausedUntil(now = Date.now()): number | null {
  try {
    const until = Number(localStorage.getItem(PAUSE_KEY) || 0);
    if (until > now) return until;
    if (until) localStorage.removeItem(PAUSE_KEY);
  } catch { /* ignore */ }
  return null;
}

export function clearQuotaPause() {
  try { localStorage.removeItem(PAUSE_KEY); } catch { /* ignore */ }
}
