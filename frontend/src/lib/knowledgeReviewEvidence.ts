import type { KnowledgeContentReviewEvidence, KnowledgeDocument } from "./knowledgeTypes";

export type KnowledgeReviewState = "unreviewed" | "missing-evidence" | "recorded" | "not-required";

// The Pharmacy seed uses immutable, namespaced IDs. These identify legacy
// Firestore imports that predate source_url/content_review_status metadata.
const PHARMACY_SEED_DOCUMENT_ID = /^doc-(?:cal-|clinical-domain-|concept-|core-disease-|cyp-|disease-|mechanism-|m\d+-sec\d+(?:-|$)|practice-question-|product-|scenario-|script-(?:case|type)-|storage-|study-track-)/;

export function isPharmacyKnowledgeDocument(
  document: Pick<KnowledgeDocument, "id" | "source_url">,
): boolean {
  return document.source_url?.includes("github.com/hamedharami-hub/pharmacy/blob/") === true ||
    PHARMACY_SEED_DOCUMENT_ID.test(document.id);
}

function isValidCalendarDate(value: string, now: Date): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 &&
    parsed.getDate() === day && parsed.getTime() <= today.getTime();
}

export function getSafeKnowledgeExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.username || url.password) return null;
    return url.href;
  } catch {
    return null;
  }
}

function isSafeReferenceUrl(value: string): boolean {
  return getSafeKnowledgeExternalUrl(value)?.startsWith("https://") === true;
}

export function hasCompleteKnowledgeReviewEvidence(
  evidence: KnowledgeContentReviewEvidence | undefined,
  now = new Date(),
): boolean {
  if (!evidence || typeof evidence !== "object") return false;
  if (typeof evidence.reviewer_role !== "string" || !evidence.reviewer_role.trim() ||
    typeof evidence.jurisdiction !== "string" || !evidence.jurisdiction.trim() ||
    typeof evidence.scope !== "string" || !evidence.scope.trim()) {
    return false;
  }
  if (!isValidCalendarDate(evidence.reviewed_at, now) ||
    !Array.isArray(evidence.references) || evidence.references.length === 0) return false;

  return evidence.references.every((reference) => {
    if (!reference || typeof reference !== "object") return false;
    return typeof reference.title === "string" && Boolean(reference.title.trim()) &&
      typeof reference.url === "string" && isSafeReferenceUrl(reference.url) &&
      typeof reference.accessed_at === "string" && isValidCalendarDate(reference.accessed_at, now);
  });
}

export function getKnowledgeReviewState(
  document: Pick<KnowledgeDocument, "content_review_status" | "content_review_evidence">,
  isImportedPharmacyDocument = false,
  now = new Date(),
): KnowledgeReviewState {
  if (document.content_review_status === "reviewed") {
    return hasCompleteKnowledgeReviewEvidence(document.content_review_evidence, now)
      ? "recorded"
      : "missing-evidence";
  }

  if (document.content_review_status === "unreviewed" || isImportedPharmacyDocument) {
    return "unreviewed";
  }

  return "not-required";
}
