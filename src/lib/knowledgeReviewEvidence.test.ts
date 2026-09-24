import { describe, expect, it } from "vitest";
import {
  getKnowledgeReviewState,
  hasCompleteKnowledgeReviewEvidence,
  isPharmacyKnowledgeDocument,
} from "./knowledgeReviewEvidence";
import type { KnowledgeContentReviewEvidence } from "./knowledgeTypes";

const now = new Date("2026-09-25T00:00:00.000Z");

const completeEvidence: KnowledgeContentReviewEvidence = {
  reviewer_role: "Registered pharmacist",
  jurisdiction: "NSW, Australia",
  scope: "Clinical triage and source currency",
  reviewed_at: "2026-09-20",
  references: [{
    title: "NSW Health clinical guidance",
    url: "https://health.example.gov.au/clinical-guidance",
    accessed_at: "2026-09-19",
  }],
};

describe("knowledge review evidence", () => {
  it("recognizes existing Pharmacy seed imports even when legacy metadata is absent", () => {
    expect(isPharmacyKnowledgeDocument({ id: "doc-scenario-clinical-safescript-early-refill-s8" })).toBe(true);
    expect(isPharmacyKnowledgeDocument({ id: "doc-m1-sec2" })).toBe(true);
    expect(isPharmacyKnowledgeDocument({ id: "personal-study-note-123" })).toBe(false);
    expect(isPharmacyKnowledgeDocument({
      id: "personal-study-note-123",
      source_url: "https://github.com/hamedharami-hub/pharmacy/blob/abc/data/example.ts",
    })).toBe(true);
  });

  it("requires a recorded reviewer, jurisdiction, scope, dates, and at least one HTTPS source", () => {
    expect(hasCompleteKnowledgeReviewEvidence(completeEvidence, now)).toBe(true);
    expect(hasCompleteKnowledgeReviewEvidence(undefined, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({ ...completeEvidence, references: [] }, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({ ...completeEvidence, reviewer_role: " " }, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({
      ...completeEvidence,
      references: [{ ...completeEvidence.references[0], url: "javascript:alert(1)" }],
    }, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({
      ...completeEvidence,
      references: [{ ...completeEvidence.references[0], url: "http://health.example.gov.au/guidance" }],
    }, now)).toBe(false);
  });

  it("rejects invalid or future review and access dates", () => {
    expect(hasCompleteKnowledgeReviewEvidence({ ...completeEvidence, reviewed_at: "2026-02-30" }, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({ ...completeEvidence, reviewed_at: "2026-09-26" }, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({
      ...completeEvidence,
      references: [{ ...completeEvidence.references[0], accessed_at: "2026-09-26" }],
    }, now)).toBe(false);
  });

  it("does not treat a bare reviewed status as evidence and keeps imported content unreviewed", () => {
    expect(getKnowledgeReviewState({ content_review_status: "reviewed" }, true, now)).toBe("missing-evidence");
    expect(getKnowledgeReviewState({ content_review_status: "unreviewed" }, false, now)).toBe("unreviewed");
    expect(getKnowledgeReviewState({ content_review_status: undefined }, true, now)).toBe("unreviewed");
    expect(getKnowledgeReviewState({ content_review_status: undefined }, false, now)).toBe("not-required");
  });

  it("only reports a review record when the evidence structure is complete", () => {
    expect(getKnowledgeReviewState({
      content_review_status: "reviewed",
      content_review_evidence: completeEvidence,
    }, true, now)).toBe("recorded");
  });

  it("fails closed for malformed Firestore evidence values", () => {
    expect(hasCompleteKnowledgeReviewEvidence({
      ...completeEvidence,
      references: null,
    } as unknown as KnowledgeContentReviewEvidence, now)).toBe(false);
    expect(hasCompleteKnowledgeReviewEvidence({
      ...completeEvidence,
      reviewer_role: null,
    } as unknown as KnowledgeContentReviewEvidence, now)).toBe(false);
  });
});
