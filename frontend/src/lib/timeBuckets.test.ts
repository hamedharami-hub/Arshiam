import { describe, it, expect, beforeEach } from "vitest";
import {
  ALL_BUCKET_KINDS,
  MULTI_DAY_BUCKET_KINDS,
  isMultiDayBucket,
  currentAnchor,
  bucketRange,
  bucketLabel,
  kindLabel,
  doesTaskMatchBucketScope,
  getBucketFilterSettings,
  saveBucketFilterSettings,
} from "./timeBuckets";

describe("timeBuckets", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("only offers whole-day and longer bucket kinds (no part-of-day)", () => {
    expect(ALL_BUCKET_KINDS).toEqual(MULTI_DAY_BUCKET_KINDS);
    expect(ALL_BUCKET_KINDS).not.toContain("morning" as never);
    expect(isMultiDayBucket("day")).toBe(true);
    expect(isMultiDayBucket("week")).toBe(true);
    expect(isMultiDayBucket("month")).toBe(true);
    expect(isMultiDayBucket("quarter")).toBe(true);
    expect(isMultiDayBucket("year")).toBe(true);
    expect(isMultiDayBucket("morning" as never)).toBe(false);
  });

  it("calculates current anchors and ranges properly", () => {
    const today = currentAnchor("day", "gregorian");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const weekAnchor = currentAnchor("week", "gregorian");
    const weekRange = bucketRange("week", "gregorian", weekAnchor);
    expect(weekRange.start).toBe(weekAnchor);
    expect(weekRange.end >= weekRange.start).toBe(true);
  });

  it("generates correct kind labels in Persian and English", () => {
    expect(kindLabel("week", "fa")).toBe("این هفته");
    expect(kindLabel("week", "en")).toBe("This Week");
    expect(kindLabel("month", "fa")).toBe("این ماه");
    expect(kindLabel("quarter", "fa")).toBe("این فصل");
    expect(kindLabel("year", "fa")).toBe("امسال");
  });

  it("matches tasks with exact due dates inside the bucket period", () => {
    const weekAnchor = currentAnchor("week", "gregorian");
    const res = doesTaskMatchBucketScope(
      { due_date: `${weekAnchor}T14:30:00Z` },
      { scopeKind: "week", calendar: "gregorian", anchor: weekAnchor }
    );
    expect(res.matches).toBe(true);
    expect(res.matchReason).toBe("exact_due_date");
  });

  it("matches tasks with direct bucket assignment", () => {
    const weekAnchor = currentAnchor("week", "gregorian");
    const res = doesTaskMatchBucketScope(
      { bucket_kind: "week", bucket_anchor: weekAnchor },
      { scopeKind: "week", calendar: "gregorian", anchor: weekAnchor }
    );
    expect(res.matches).toBe(true);
    expect(res.matchReason).toBe("direct_bucket");
    expect(res.displayBadge).toBe("این هفته");
  });

  it("hierarchically includes smaller nested buckets into larger scopes", () => {
    const today = currentAnchor("day", "gregorian");
    const monthAnchor = currentAnchor("month", "gregorian");

    // 1. A day task belongs inside Week and Month
    const dayTask = {
      bucket_kind: "day" as const,
      bucket_anchor: today,
    };
    const resWeek = doesTaskMatchBucketScope(dayTask, {
      scopeKind: "week",
      calendar: "gregorian",
    });
    expect(resWeek.matches).toBe(true);
    // a one-day bucket is now the task's day, so it matches as a dated task
    expect(["nested_bucket", "exact_due_date"]).toContain(resWeek.matchReason);

    // 2. Weekly task belongs inside Month
    const weekAnchor = currentAnchor("week", "gregorian");
    const weekTask = {
      bucket_kind: "week" as const,
      bucket_anchor: weekAnchor,
    };
    const resMonth = doesTaskMatchBucketScope(weekTask, {
      scopeKind: "month",
      calendar: "gregorian",
      anchor: monthAnchor,
    });
    expect(resMonth.matches).toBe(true);
    expect(resMonth.matchReason).toBe("nested_bucket");
  });

  it("includes a week across the month boundary only in months it overlaps", () => {
    const task = { bucket_kind: "week" as const, bucket_anchor: "2026-09-28" };
    for (const anchor of ["2026-09-01", "2026-10-01"]) {
      expect(doesTaskMatchBucketScope(task, { scopeKind: "month", calendar: "gregorian", anchor }).matches).toBe(true);
    }
    expect(doesTaskMatchBucketScope(task, { scopeKind: "month", calendar: "gregorian", anchor: "2026-11-01" }).matches).toBe(false);
    expect(doesTaskMatchBucketScope(task, { scopeKind: "month", calendar: "gregorian", anchor: "2026-10-01", hierarchical: false }).matches).toBe(false);
  });

  it("includes a Saturday-based week across a Jalali month boundary", () => {
    const task = { bucket_kind: "week" as const, bucket_anchor: "2026-09-19" };
    for (const anchor of ["2026-08-23", "2026-09-23"]) {
      expect(doesTaskMatchBucketScope(task, { scopeKind: "month", calendar: "jalali", anchor }).matches).toBe(true);
    }
    expect(doesTaskMatchBucketScope(task, { scopeKind: "month", calendar: "jalali", anchor: "2026-10-23" }).matches).toBe(false);
  });

  it("preserves a task's calendar when finding overlap with a different calendar scope", () => {
    const gregorianWeek = { bucket_kind: "week" as const, bucket_calendar: "gregorian" as const, bucket_anchor: "2026-08-17" };
    expect(doesTaskMatchBucketScope(gregorianWeek, { scopeKind: "month", calendar: "jalali", anchor: "2026-08-23" }).matches).toBe(true);
    const jalaliWeek = { bucket_kind: "week" as const, bucket_calendar: "jalali" as const, bucket_anchor: "2026-08-29" };
    expect(doesTaskMatchBucketScope(jalaliWeek, { scopeKind: "month", calendar: "gregorian", anchor: "2026-09-01" }).matches).toBe(true);
  });

  it("respects strict filter mode (hierarchical: false) to show only exact matching buckets", () => {
    const today = currentAnchor("day", "gregorian");
    const dayTask = {
      bucket_kind: "day" as const,
      bucket_anchor: today,
    };

    // When hierarchical is false, week scope should NOT include the day task
    const res = doesTaskMatchBucketScope(dayTask, {
      scopeKind: "week",
      calendar: "gregorian",
      hierarchical: false,
    });
    expect(res.matches).toBe(false);
  });

  it("persists filter settings in localStorage", () => {
    const initial = getBucketFilterSettings();
    expect(initial.hierarchical).toBe(true);

    saveBucketFilterSettings({
      hierarchical: false,
      strictKinds: ["day", "week"],
    });

    const updated = getBucketFilterSettings();
    expect(updated.hierarchical).toBe(false);
    expect(updated.strictKinds).toEqual(["day", "week"]);
  });
});
