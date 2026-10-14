import { describe, expect, it } from "vitest";
import { assessmentCompletedLabel, deduplicateAssessmentHistory } from "./ScreenerView";
import type { AssessmentResultItem } from "@/lib/firestoreDataService";

describe("ScreenerView history deduplication", () => {
  it("preserves distinct historical records even with equal totals within 10 seconds", () => {
    const now = Date.now();
    const items: AssessmentResultItem[] = [
      {
        id: "scr-1",
        assessment_type: "phq9",
        completed_at: new Date(now).toISOString(),
        scores: { raw: 14, normalized: 51, maxPossible: 27 },
        answers: {},
      },
      // Equal totals are not proof of duplicate answers/writes.
      {
        id: "scr-2",
        assessment_type: "phq9",
        completed_at: new Date(now + 1000).toISOString(),
        scores: { raw: 14, normalized: 51, maxPossible: 27 },
        answers: {},
      },
      // Legitimate separate test 1 day later
      {
        id: "scr-3",
        assessment_type: "phq9",
        completed_at: new Date(now + 86400000).toISOString(),
        scores: { raw: 14, normalized: 51, maxPossible: 27 },
        answers: {},
      },
      // Different assessment at the same time
      {
        id: "scr-4",
        assessment_type: "gad7",
        completed_at: new Date(now).toISOString(),
        scores: { raw: 14, normalized: 66, maxPossible: 21 },
        answers: {},
      },
    ];

    const deduplicated = deduplicateAssessmentHistory(items);
    expect(deduplicated).toHaveLength(4);
    expect(deduplicated).toEqual(items);
    expect(deduplicated[0]).toBe(items[0]);
  });

  it("only collapses repeated document identities, not owners/types or unknown IDs", () => {
    const base = { id: "same", user_id: "A", assessment_type: "phq9", scores: { raw: 0 } };
    const records = [base, base, { ...base, user_id: "B" }, { ...base, assessment_type: "gad7" }, { ...base, id: "" }, { ...base, id: "" }];
    expect(deduplicateAssessmentHistory(records)).toHaveLength(5);
    expect(records).toHaveLength(6);
  });

  it("does not fabricate completion dates from created_at or today", () => {
    const record = { id: "old", assessment_type: "who5", scores: { raw: 0 }, created_at: "2026-10-15T12:00:00Z" };
    expect(assessmentCompletedLabel(record, true)).toBe("Completion date unknown");
    expect(assessmentCompletedLabel({ ...record, completed_at: "invalid" }, true)).toBe("Completion date unknown");
    expect(assessmentCompletedLabel({ ...record, completed_at: "2020-01-02T12:00:00Z" }, true)).toContain("2020");
  });
});
