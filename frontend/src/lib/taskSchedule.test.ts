import { describe, expect, it } from "vitest";
import type { Task } from "./taskTypes";
import {
  dateTimeSchedule, isCustomRange, legacySchedule, nextPlanPeriod, readSchedule, scheduleInView, scheduleLabel,
  scheduleMigrationPatch, schedulePatch, isScheduledOn,
} from "./taskSchedule";
import { carryOver, itemsInPeriod, planPatch, progressOf, childrenMap, topLevelItems, unplanned } from "./planCascade";
import { periodFor, type TimeSettings } from "./timeHorizon";
import { taskWorkDate, workDatePatch } from "./taskDate";
import { planningPatch } from "./taskPlanning";
import { reviewDue } from "@/components/planning/PeriodReview";
import { plannedGoalIds } from "@/components/planning/ValuesGoalsPanel";
import { legacyLocalReviews } from "./planReviewService";

const G: TimeSettings = { calendar: "gregorian", weekStart: "mon", seasonsEnabled: true };
const J: TimeSettings = { calendar: "jalali", weekStart: "sat", seasonsEnabled: true };
const now = new Date(2026, 5, 17, 12); // Wed 17 Jun 2026
const t = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, completed: false, status: "todo", priority: "none", parent_id: null, ...extra } as Task);
const apply = (task: Task, patch: Partial<Task>): Task => ({ ...task, ...patch } as Task);

describe("single task schedule", () => {
  it("distinguishes none, period, day and day+time", () => {
    expect(readSchedule(t("a", schedulePatch({ kind: "none" }, G)), G).kind).toBe("none");
    expect(readSchedule(t("b", planningPatch(periodFor("week", now, G), G)), G).kind).toBe("period");
    expect(readSchedule(t("c", workDatePatch({}, "2026-06-18")), G)).toEqual({ kind: "day", date: "2026-06-18" });
    const timed = readSchedule(t("d", schedulePatch(dateTimeSchedule("2026-06-18", "15:00"), G)), G);
    expect(timed.kind).toBe("datetime");
  });

  it("acceptance: this week → tomorrow 15:00 is one schedule, counted once per view, then cleared for good", () => {
    let task = t("x", planningPatch(periodFor("week", now, G), G));
    const today = periodFor("day", now, G);
    expect(itemsInPeriod([task], periodFor("week", now, G), G)).toHaveLength(1);
    expect(itemsInPeriod([task], today, G)).toHaveLength(0);
    task = apply(task, schedulePatch(dateTimeSchedule("2026-06-18", "15:00"), G));
    expect(task.planning_horizon).toBeNull();
    expect(new Date(taskWorkDate(task)!).getHours()).toBe(15);
    expect(itemsInPeriod([task], periodFor("week", now, G), G)).toHaveLength(1);
    expect(itemsInPeriod([task], periodFor("month", now, G), G)).toHaveLength(1);
    expect(itemsInPeriod([task], periodFor("day", new Date(2026, 5, 18), G), G)).toHaveLength(1);
    // clear: no comeback from legacy fields that an old client might still have on the doc
    task = apply({ ...task, bucket_kind: "week", bucket_anchor: "2026-06-15", horizon: "week", period_start: "2026-06-15", period_end: "2026-06-21", due_date: "2026-06-18" } as Task, schedulePatch({ kind: "none" }, G));
    expect(readSchedule(task, G).kind).toBe("none");
    expect(unplanned([task], G)).toHaveLength(1);
    // the same values on a v2 doc are ignored even if re-written by an old screen
    expect(readSchedule({ ...task, horizon: "week", period_start: "2026-06-15", period_end: "2026-06-21" }, G).kind).toBe("none");
  });

  it("a month plan without a day never enters today", () => {
    const m = t("m", planningPatch(periodFor("month", now, G), G));
    expect(itemsInPeriod([m], periodFor("day", now, G), G)).toHaveLength(0);
    expect(isScheduledOn(readSchedule(m, G), "2026-06-17")).toBe(false);
    expect(itemsInPeriod([m], periodFor("month", now, G), G)).toHaveLength(1);
  });

  it("a custom range shows in every overlapping week (10 Jun – 10 Jul is in the week of 17 Jun)", () => {
    const range = { horizon: "week" as const, start: "2026-06-10", end: "2026-07-10" };
    const r = t("r", planningPatch(range, G));
    expect(isCustomRange(range, G)).toBe(true);
    for (const d of [new Date(2026, 5, 10), new Date(2026, 5, 17), new Date(2026, 6, 10)]) {
      expect(scheduleInView(readSchedule(r, G), periodFor("week", d, G))).toBe(true);
    }
    expect(scheduleInView(readSchedule(r, G), periodFor("week", new Date(2026, 6, 13), G))).toBe(false);
    expect(scheduleInView(readSchedule(r, G), periodFor("day", now, G))).toBe(false);
  });

  it("next range keeps the inclusive length and starts the day after", () => {
    expect(nextPlanPeriod({ horizon: "week", start: "2026-06-10", end: "2026-07-10" }, G)).toEqual({ horizon: "week", start: "2026-07-11", end: "2026-08-10" });
    expect(nextPlanPeriod(periodFor("month", now, G), G)).toEqual({ horizon: "month", start: "2026-07-01", end: "2026-07-31" });
    // Jalali month boundary (Khordad has 31 days, Tir 31)
    const kh = periodFor("month", now, J);
    expect(nextPlanPeriod(kh, J).start > kh.end).toBe(true);
  });

  it("a date without time never shifts through UTC; a time keeps its instant across DST", () => {
    const day = t("d", workDatePatch({}, "2026-03-29"));
    expect(readSchedule(day, G)).toEqual({ kind: "day", date: "2026-03-29" });
    const dst = dateTimeSchedule("2026-03-29", "15:00");
    if (dst.kind !== "datetime") throw new Error("expected datetime");
    expect(new Date(dst.at).getHours()).toBe(15);
    expect(dst.date).toBe("2026-03-29");
  });

  it("labels yesterday, today, tomorrow and periods differently", () => {
    const lbl = (p: Partial<Task>) => scheduleLabel(readSchedule(t("l", p), G), G, "en", now);
    expect(lbl(workDatePatch({}, "2026-06-16"))).toBe("Yesterday");
    expect(lbl(workDatePatch({}, "2026-06-17"))).toBe("Today");
    expect(lbl(workDatePatch({}, "2026-06-18"))).toBe("Tomorrow");
    expect(lbl(planningPatch(periodFor("week", now, G), G))).toBe("This week");
    expect(lbl(planningPatch(periodFor("week", new Date(2026, 5, 24), G), G))).toBe("Next week");
    expect(lbl(planningPatch(periodFor("month", now, G), G))).toBe("This month");
    expect(scheduleLabel(readSchedule(t("f", workDatePatch({}, "2026-06-17")), G), G, "fa", now)).toBe("امروز");
    expect(lbl({})).toBeNull();
  });
});

describe("plan views and review", () => {
  it("yesterday's open day task is in carry-over of today (not moved automatically)", () => {
    const y = t("y", { work_date: "2026-06-16" });
    const legacyY = t("ly", { due_date: "2026-06-16" });
    const today = periodFor("day", now, G);
    expect(carryOver([y, legacyY], today, G).map((x) => x.id)).toEqual(["y", "ly"]);
    expect(y.work_date).toBe("2026-06-16");
    expect(carryOver([{ ...y, completed: true, status: "done" } as Task], today, G)).toHaveLength(0);
  });

  it("a child shown under its plan-parent is not listed (or counted) twice", () => {
    const week = periodFor("week", now, G);
    const parent = t("p", planPatch(week, G));
    const child = t("c", { ...planPatch(periodFor("day", now, G), G, "p") });
    const items = itemsInPeriod([parent, child], week, G);
    expect(items).toHaveLength(2);
    expect(topLevelItems(items).map((x) => x.id)).toEqual(["p"]);
  });

  it("set-aside work never counts as done", () => {
    const parent = t("p");
    const a = t("a", { plan_parent_id: "p", status: "wont_do" });
    const b = t("b", { plan_parent_id: "p", completed: true, status: "done" });
    const c = t("c", { plan_parent_id: "p" });
    expect(progressOf(parent, childrenMap([parent, a, b, c]))).toMatchObject({ done: 1, total: 2, ratio: 0.5 });
    expect(progressOf(t("w", { status: "wont_do" }), new Map()).ratio).toBe(0);
  });

  it("review is due from the account record, not the device", () => {
    const week = periodFor("week", new Date(2026, 5, 21), G);
    const prev = periodFor("week", new Date(2026, 5, 14), G);
    const lastDay = new Date(2026, 5, 21, 10);
    expect(reviewDue({}, true, week, prev, false, lastDay)).toEqual(week);
    const reviews = { [`week_${week.start}_${week.end}`]: { id: "x", horizon: "week" as const, start: week.start, end: week.end, note: "n", reviewed_at: "2026-06-21T09:00:00Z" } };
    expect(reviewDue(reviews, true, week, prev, false, lastDay)).toBeNull();
    expect(reviewDue({}, false, week, prev, false, lastDay)).toBeNull();
  });

  it("finds device-only review notes of this user only", () => {
    const store = new Map<string, string>([
      ["arsh_plan_review_v1:u1:week:2026-06-15", JSON.stringify({ at: "2026-06-21T10:00:00Z", note: "kept" })],
      ["arsh_plan_review_v1:u2:week:2026-06-15", JSON.stringify({ at: "x", note: "other user" })],
    ]);
    const storage = { get length() { return store.size; }, key: (i: number) => [...store.keys()][i] ?? null, getItem: (k: string) => store.get(k) ?? null } as unknown as Storage;
    const found = legacyLocalReviews("u1", storage);
    expect(found).toHaveLength(1);
    expect(found[0]).toMatchObject({ horizon: "week", start: "2026-06-15", note: "kept" });
  });

  it("a goal is 'in the plan' only through a live, current task", () => {
    const live = t("a", { source_type: "values_goal", source_id: "g1", ...planningPatch(periodFor("year", now, G), G) });
    const setAside = t("b", { source_type: "values_goal", source_id: "g2", status: "wont_do", ...planningPatch(periodFor("year", now, G), G) });
    const cleared = t("c", { source_type: "values_goal", source_id: "g3", ...schedulePatch({ kind: "none" }, G) });
    const lastYear = t("d", { source_type: "values_goal", source_id: "g4", ...planningPatch(periodFor("year", new Date(2025, 5, 1), G), G) });
    const nextYear = t("e", { source_type: "values_goal", source_id: "g5", ...planningPatch(periodFor("year", new Date(2027, 5, 1), G), G) });
    const done = t("f", { source_type: "values_goal", source_id: "g6", status: "done", completed: true, ...planningPatch(periodFor("year", now, G), G) });
    const tasks = [live, setAside, cleared, lastYear, nextYear, done];
    const ids = plannedGoalIds(tasks, periodFor("year", now, G), G);
    expect([...ids]).toEqual(["g1"]);
    expect([...plannedGoalIds(tasks, periodFor("year", new Date(2027, 5, 1), G), G)]).toEqual(["g5"]);
  });
});

describe("migration to schedule v2", () => {
  it("is idempotent, keeps a backup and never revives a cleared plan", () => {
    const legacy = t("l", { bucket_kind: "month", bucket_anchor: "2026-06-01", bucket_calendar: "gregorian", reminder_at: "2026-06-20T08:00:00Z", recurrence: "weekly" });
    const patch = scheduleMigrationPatch(legacy, G, now)!;
    const migrated = apply(legacy, patch);
    expect(readSchedule(migrated, G)).toEqual({ kind: "period", period: { horizon: "month", start: "2026-06-01", end: "2026-06-30" } });
    expect(migrated.schedule_legacy?.fields).toMatchObject({ bucket_kind: "month", bucket_anchor: "2026-06-01" });
    expect(migrated.reminder_at).toBe("2026-06-20T08:00:00Z");
    expect(migrated.recurrence).toBe("weekly");
    expect(scheduleMigrationPatch(migrated, G, now)).toBeNull();
    const cleared = apply(migrated, schedulePatch({ kind: "none" }, G));
    expect(scheduleMigrationPatch(cleared, G, now)).toBeNull();
    expect(readSchedule(cleared, G).kind).toBe("none");
  });

  it("an explicit planning null is a clear, not a reason to read old horizon fields", () => {
    const task = t("c", { planning_horizon: null, horizon: "week", period_start: "2026-06-15", period_end: "2026-06-21", is_exact: false });
    expect(legacySchedule(task, G).schedule.kind).toBe("none");
    // ...but a valid exact time next to it is kept
    const withTime = { ...task, work_date: new Date(2026, 5, 18, 15).toISOString() };
    expect(legacySchedule(withTime, G).schedule.kind).toBe("datetime");
  });

  it("keeps the more precise date when the old plan disagrees, recording the conflict", () => {
    const task = t("k", { work_date: "2026-07-03", planning_horizon: "week", planning_start: "2026-06-15", planning_end: "2026-06-21" });
    const res = legacySchedule(task, G);
    expect(res.schedule).toEqual({ kind: "day", date: "2026-07-03" });
    expect(res.conflict).toContain("2026-07-03");
    const patch = scheduleMigrationPatch(task, G, now)!;
    expect(patch.schedule_legacy?.conflict).toBeTruthy();
    expect(patch.planning_horizon).toBeNull();
  });

  it("moves time-block / part-of-day / deadline values into the backup only", () => {
    const task = t("tb", { work_date: "2026-06-18", due_date: "2026-06-25", start_at: "2026-06-18T09:00:00Z", end_at: "2026-06-18T10:00:00Z", estimated_minutes: 60 });
    const patch = scheduleMigrationPatch(task, G, now)!;
    expect(patch).toMatchObject({ work_date: "2026-06-18", due_date: null, start_at: null, end_at: null, estimated_minutes: null });
    expect(patch.schedule_legacy?.fields).toMatchObject({ due_date: "2026-06-25", start_at: "2026-06-18T09:00:00Z", estimated_minutes: 60 });
  });
});
