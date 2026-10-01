import { describe, it, expect, beforeEach } from "vitest";
import {
  ALL_BUCKET_KINDS,
  SUB_DAY_BUCKET_KINDS,
  MULTI_DAY_BUCKET_KINDS,
  isSubDayBucket,
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

  it("distinguishes sub-day and multi-day bucket kinds", () => {
    expect(isSubDayBucket("morning")).toBe(true);
    expect(isSubDayBucket("noon")).toBe(true);
    expect(isSubDayBucket("afternoon")).toBe(true);
    expect(isSubDayBucket("night")).toBe(true);
    expect(isSubDayBucket("week")).toBe(false);

    expect(isMultiDayBucket("day")).toBe(true);
    expect(isMultiDayBucket("week")).toBe(true);
    expect(isMultiDayBucket("month")).toBe(true);
    expect(isMultiDayBucket("quarter")).toBe(true);
    expect(isMultiDayBucket("year")).toBe(true);
    expect(isMultiDayBucket("morning")).toBe(false);
  });

  it("calculates current anchors and ranges properly", () => {
    const today = currentAnchor("day", "gregorian");
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    const morningAnchor = currentAnchor("morning", "gregorian");
    expect(morningAnchor).toBe(today);

    const weekAnchor = currentAnchor("week", "gregorian");
    const weekRange = bucketRange("week", "gregorian", weekAnchor);
    expect(weekRange.start).toBe(weekAnchor);
    expect(weekRange.end >= weekRange.start).toBe(true);
  });

  it("generates correct kind labels in Persian and English", () => {
    expect(kindLabel("morning", "fa")).toBe("صبح");
    expect(kindLabel("morning", "en")).toBe("Morning");
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

    // 1. Morning task belongs inside Week and Month
    const morningTask = {
      bucket_kind: "morning" as const,
      bucket_anchor: today,
    };
    const resWeek = doesTaskMatchBucketScope(morningTask, {
      scopeKind: "week",
      calendar: "gregorian",
    });
    expect(resWeek.matches).toBe(true);
    expect(resWeek.matchReason).toBe("nested_bucket");

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
    const morningTask = {
      bucket_kind: "morning" as const,
      bucket_anchor: today,
    };

    // When hierarchical is false, week scope should NOT include morningTask
    const res = doesTaskMatchBucketScope(morningTask, {
      scopeKind: "week",
      calendar: "gregorian",
      hierarchical: false,
    });
    expect(res.matches).toBe(false);
  });

  it("persists filter settings in localStorage", () => {
    const initial = getBucketFilterSettings();
    expect(initial.hierarchical).toBe(true);
    expect(initial.activeCategory).toBe("multi_day");

    saveBucketFilterSettings({
      hierarchical: false,
      activeCategory: "sub_day",
      strictKinds: ["morning", "night"],
    });

    const updated = getBucketFilterSettings();
    expect(updated.hierarchical).toBe(false);
    expect(updated.activeCategory).toBe("sub_day");
    expect(updated.strictKinds).toEqual(["morning", "night"]);
  });
});
