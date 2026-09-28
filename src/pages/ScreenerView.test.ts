import { describe, expect, it } from "vitest";
import { deduplicateAssessmentHistory } from "./ScreenerView";
import type { AssessmentResultItem } from "@/lib/firestoreDataService";

describe("ScreenerView history deduplication", () => {
  it("deduplicates results with same assessment_type and raw score within 10 seconds", () => {
    const now = Date.now();
    const items: AssessmentResultItem[] = [
      {
        id: "scr-1",
        assessment_type: "phq9",
        completed_at: new Date(now).toISOString(),
        scores: { raw: 14, normalized: 51, maxPossible: 27 },
        answers: {},
      },
      // Duplicate write 1 second later
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
    expect(deduplicated).toHaveLength(3);
    expect(deduplicated.map((d) => d.id)).toEqual(["scr-1", "scr-3", "scr-4"]);
  });
});
