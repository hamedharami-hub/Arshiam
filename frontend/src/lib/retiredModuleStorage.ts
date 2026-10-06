/** Remove only data whose local keys prove ownership and exclusive use by retired modules. */
export function clearRetiredModuleStorage(uid: string): void {
  if (!uid || ["guest", "anonymous-kb-user", "anonymous-review-user"].includes(uid)) return;
  const keys = [
    `arshnaz:pharmacy:records:${uid}`, `arshnaz:pharmacy:starred-phrases:${uid}`,
    `arshnaz:pharmacy:referral-letters:${uid}`, `arshnaz:pharmacy:scenario-progress:${uid}`,
    `arshnaz:fred-progress:v2:${uid}`, `arshnaz:fred-outbox:v2:${uid}`,
    `arshnaz:fred-understanding:v1:${uid}`, `arshnaz:fred-progress-legacy:v1:${uid}`,
    `arsh_review_days_v1:${uid}`,
  ];
  // Device-global settings and Knowledge/cards may be shared or ownerless; retain them.
  try { for (const key of keys) localStorage.removeItem(key); } catch { /* retry at next account sync */ }
}
