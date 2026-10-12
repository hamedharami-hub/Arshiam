import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebase", () => ({
  deleteField: () => ({ _methodName: "deleteField" }),
}));

import { applyLegacySchedule, legacySchedulePreview, normalizeTaskSchedule, supportedTaskPatch } from "./taskScheduleMigration";
import { taskScheduleApplyWrite, taskScheduleWrite } from "./taskScheduleWrite";
import { taskWorkDate, workDatePatch } from "./taskDate";

describe("saved task schedule migration", () => {
  it("keeps a legacy schedule while removing unsupported fields", () => {
    const saved = { id: "old", due_date: "2026-10-05T09:30:00Z", start_at: "2026-10-05T08:00:00Z", end_at: "2026-10-05T10:00:00Z", estimated_minutes: 120, due_at: "2026-10-05T09:30:00Z", is_exact: true };
    expect(normalizeTaskSchedule(saved)).toEqual({ id: "old", work_date: saved.due_date });
    expect(saved).toHaveProperty("end_at");
    expect(taskWorkDate(saved)).toBe(saved.due_date);
  });
  it("keeps the explicit work day and ignores a former independent deadline", () => {
    expect(normalizeTaskSchedule({ work_date: "2026-10-05", due_date: "2026-10-08" })).toEqual({ work_date: "2026-10-05" });
    expect(normalizeTaskSchedule({ work_date: null, due_date: "2026-10-08" })).toEqual({ work_date: null });
  });
  it("converts a former part-of-day bucket into its calendar day", () => {
    expect(normalizeTaskSchedule({ bucket_kind: "morning", bucket_anchor: "2026-10-05", bucket_calendar: "jalali" })).toEqual({ work_date: "2026-10-05" });
  });
  it("preserves weekly planning and an explicit empty schedule", () => {
    expect(normalizeTaskSchedule({ work_date: null, bucket_kind: "week", bucket_anchor: "2026-10-05" })).toEqual({ work_date: null, bucket_kind: "week", bucket_anchor: "2026-10-05" });
  });
  it("clears a schedule without reviving its former day period as planning", () => {
    const scheduled = { work_date: "2026-10-05", horizon: "day" as const, period_start: "2026-10-05", period_end: "2026-10-05" };
    expect(workDatePatch(scheduled, null)).toEqual({ work_date: null, horizon: null, period_start: null, period_end: null });
    const legacy = { due_date: "2026-10-05", is_exact: true, horizon: "day", period_start: "2026-10-05", period_end: "2026-10-05" };
    expect(normalizeTaskSchedule(legacy)).toEqual({ work_date: "2026-10-05" });
  });
  it("does not clear a schedule when patching an unrelated field", () => {
    expect(supportedTaskPatch({ title: "New title" })).toEqual({ title: "New title" });
    expect(supportedTaskPatch({ work_date: null })).toEqual({ work_date: null });
    expect(supportedTaskPatch({ start_at: "2026-10-05T09:00:00Z", end_at: "2026-10-05T10:00:00Z" })).toEqual({ work_date: "2026-10-05T09:00:00Z" });
  });
});

describe("legacy schedule preview and apply", () => {
  it("does not mutate the input", () => {
    const saved = { id: "old", due_date: "2026-10-05T09:30:00Z", start_at: "2026-10-05T08:00:00Z", end_at: "2026-10-05T10:00:00Z", estimated_minutes: 120, due_at: "2026-10-05T09:30:00Z", is_exact: true };
    const snapshot = { ...saved };
    const preview = legacySchedulePreview(saved);
    applyLegacySchedule(saved);
    expect(saved).toEqual(snapshot);
    expect(preview.patch).not.toHaveProperty("schedule_legacy");
    expect(preview.patch).not.toHaveProperty("deadline_date");
    expect(saved).toHaveProperty("end_at");
  });

  it("does not revive an explicit empty work date from due_date", () => {
    const task = { work_date: null, due_date: "2026-10-08", deadline_date: "2026-10-20" };
    const preview = legacySchedulePreview(task);
    expect(preview.needed).toBe(true);
    expect(preview.conflict).toBe(false);
    expect(preview.patch).toMatchObject({ work_date: null, schedule_v: 2 });
    expect(preview.patch).not.toHaveProperty("deadline_date");
    expect(preview.patch?.work_date).toBeNull();
    const applied = applyLegacySchedule(task);
    expect(applied?.work_date).toBeNull();
    expect(applied?.schedule_legacy).toEqual({ due_date: "2026-10-08" });
    expect(applied).not.toHaveProperty("deadline_date");
    expect(task).toEqual({ work_date: null, due_date: "2026-10-08", deadline_date: "2026-10-20" });
  });

  it("yields no apply patch when a work day and a period both exist", () => {
    const task = {
      work_date: "2026-10-05",
      planning_horizon: "week",
      planning_start: "2026-10-03",
      planning_end: "2026-10-09",
      due_date: "2026-10-01",
    };
    const preview = legacySchedulePreview(task);
    expect(preview.needed).toBe(true);
    expect(preview.conflict).toBe(true);
    expect(preview.patch).toBeNull();
    expect(preview.labelFa).toContain("انتخابگر");
    expect(preview.labelEn).toMatch(/picker/i);
    expect(applyLegacySchedule(task)).toBeNull();
    expect(taskScheduleApplyWrite(task)).toBeNull();
    expect(task.planning_horizon).toBe("week");
    expect(task.work_date).toBe("2026-10-05");
  });

  it("archives present legacy keys on the apply patch and does not set a deadline", () => {
    const task = { due_date: "2026-10-05", is_exact: true, horizon: "day", period_start: "2026-10-05", period_end: "2026-10-05", estimated_minutes: 30 };
    const applied = applyLegacySchedule(task);
    expect(applied?.schedule_v).toBe(2);
    expect(applied?.schedule_legacy).toEqual({
      due_date: "2026-10-05",
      is_exact: true,
      estimated_minutes: 30,
      horizon: "day",
      period_start: "2026-10-05",
      period_end: "2026-10-05",
    });
    expect(applied).not.toHaveProperty("deadline_date");
    expect(applied).not.toHaveProperty("due_date");
    expect(applied?.work_date).toBe("2026-10-05");

    const written = taskScheduleApplyWrite(task);
    expect(written?.schedule_v).toBe(2);
    expect(written?.schedule_legacy).toEqual(applied?.schedule_legacy);
    expect(written).not.toHaveProperty("deadline_date");
    expect(written?.due_date).toEqual({ _methodName: "deleteField" });
    expect(written?.is_exact).toEqual({ _methodName: "deleteField" });
    expect(written?.estimated_minutes).toEqual({ _methodName: "deleteField" });
    expect(written?.horizon).toEqual({ _methodName: "deleteField" });
    expect(written).not.toHaveProperty("due_at");
    expect(written).not.toHaveProperty("start_at");
  });

  it("does not add deleteField when a normal work_date patch is not an apply", () => {
    const written = taskScheduleWrite({ work_date: "2026-10-05", title: "Keep" });
    expect(written).toEqual({ work_date: "2026-10-05", title: "Keep" });
    expect(written).not.toHaveProperty("schedule_legacy");
    expect(written).not.toHaveProperty("deadline_date");
    for (const key of ["due_date", "due_at", "is_exact", "start_at", "end_at", "estimated_minutes"]) {
      expect(written).not.toHaveProperty(key);
    }
    expect(JSON.stringify(written)).not.toContain("deleteField");
  });
});
