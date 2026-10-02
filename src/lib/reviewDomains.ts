import { PHARMACY_ROOT_FOLDER_ID } from "@/lib/pharmacyConstants";

/** Single registry of review domains; adding a domain here makes it filter queue, stats, Leitner and map alike. */
export const REVIEW_DOMAINS = [{ id: "pharmacy", fa: "فارماسی", en: "Pharmacy", rootFolderId: PHARMACY_ROOT_FOLDER_ID }] as const;
export type ReviewDomainId = (typeof REVIEW_DOMAINS)[number]["id"] | "all";

export function resolveReviewScope(domainParam: string | null | undefined, topicParam: string | null | undefined): { domain: ReviewDomainId; scopeRootFolderId: string | undefined; topic: string | null } {
  const found = REVIEW_DOMAINS.find(d => d.id === domainParam);
  if (!found) return { domain: "all", scopeRootFolderId: undefined, topic: null };
  const topic = topicParam?.trim() || null;
  return { domain: found.id, scopeRootFolderId: topic ?? found.rootFolderId, topic };
}
