import { adminDb, testStore, tokenHash } from "./assistantAccess.js";
import { checkRateLimit } from "./rateLimiter.js";

/** Serverless instances share a bounded per-grant/per-IP fixed-window counter. */
export async function mcpRateLimit(identity: string, limit = 60): Promise<boolean> {
  const window = Math.floor(Date.now() / 60000);
  const key = tokenHash(`${identity}:${window}`);
  if (testStore.enabled) return checkRateLimit(`mcp:${key}`, limit).allowed;
  const ref = adminDb().doc(`mcp_rate_limits/${key}`);
  return adminDb().runTransaction(async tx => {
    const data = (await tx.get(ref)).data();
    const count = data?.count || 0;
    if (count >= limit) return false;
    tx.set(ref, { count: count + 1, expiresAt: new Date((window + 2) * 60000) });
    return true;
  });
}
