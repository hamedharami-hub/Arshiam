import { describe, expect, it } from "vitest";
import { compactTasksForAI, dateTimeSchedule, isTodayCommitment, normalizeTaskWrite, readSchedule, SCHEDULE_VERSION, schedulePatch } from "./taskSchedule";
import { doesTaskMatchTimeFilters } from "./smartListService";
import { mindGoalHorizon } from "./lifeArchitect";
import { toLocalISO } from "./timeHorizon";
import type { Task } from "./taskTypes";

const now = new Date(2026, 5, 17, 10, 0);
const today = toLocalISO(now);
const t = (over: Partial<Task>): Task => ({ id: "x", title: "T", completed: false, status: "todo", priority: "none", ...over } as Task);

describe("normalizeTaskWrite (legacy writers → single schedule)", () => {
  it("turns a legacy due_date write into work_date with schedule_v 2 and neutralises the plan", () => {
    const out = normalizeTaskWrite({ title: "a", due_date: "2026-06-18" }) as Record<string, unknown>;
    expect(out.due_date).toBeNull();
    expect(out.work_date).toBe("2026-06-18");
    expect(out.schedule_v).toBe(SCHEDULE_VERSION);
    expect(out.planning_horizon).toBeNull();
  });

  it("a legacy due_date:null clears the whole schedule", () => {
    const out = normalizeTaskWrite({ due_date: null }) as Record<string, unknown>;
    expect(out.work_date).toBeNull();
    expect(out.planning_horizon).toBeNull();
    expect(readSchedule(out as Partial<Task>).kind).toBe("none");
  });

  it("drops removed time-block / part-of-day / deadline values but keeps v2 writes untouched", () => {
    const out = normalizeTaskWrite({ schedule_v: 2, work_date: "2026-06-18", start_at: "2026-06-18T09:00:00Z", deadline: "2026-07-01", time_of_day: "morning" }) as Record<string, unknown>;
    expect(out.start_at).toBeUndefined();
    expect(out.deadline).toBeUndefined();
    expect(out.time_of_day).toBeUndefined();
    expect(out.work_date).toBe("2026-06-18");
  });

  it("keeps explicit nulls for removed fields (migration clears them)", () => {
    const out = normalizeTaskWrite({ schedule_v: 2, start_at: null, deadline: null }) as Record<string, unknown>;
    expect(out.start_at).toBeNull();
    expect(out.deadline).toBeNull();
  });

  it("keeps the optional deadline date independent from every schedule patch", () => {
    const task = { deadline_date: "2026-06-24", ...schedulePatch({ kind: "day", date: "2026-06-18" }) };
    const cleared = { ...task, ...schedulePatch({ kind: "none" }) };
    expect(cleared).toMatchObject({ deadline_date: "2026-06-24", work_date: null, planning_horizon: null });
    expect(normalizeTaskWrite({ deadline_date: null, work_date: "2026-06-18" })).toMatchObject({ deadline_date: null, work_date: "2026-06-18" });
    expect(() => normalizeTaskWrite({ deadline_date: "2026-02-30" })).toThrow(/deadline_date/);
    expect(() => normalizeTaskWrite({ deadline_date: "2026-6-3" })).toThrow(/deadline_date/);
  });

  it("accepts only unambiguous date and instant values on new schedule writes", () => {
    expect(normalizeTaskWrite({ work_date: "2026-06-18T10:30:00-07:00" }).work_date).toBe("2026-06-18T17:30:00.000Z");
    expect(() => normalizeTaskWrite({ work_date: "2026-06-18T10:30:00" })).toThrow(/explicit offset/);
    expect(() => dateTimeSchedule("2026-02-30", "10:00")).toThrow(/real/);
    expect(() => dateTimeSchedule("2026-06-18", "25:00")).toThrow(/HH:MM/);
  });

  it("does not silently move a local clock time that falls inside a daylight-saving gap", () => {
    const originalTimezone = process.env.TZ;
    process.env.TZ = "America/New_York";
    try {
      expect(() => dateTimeSchedule("2026-03-08", "02:30")).toThrow(/does not exist/);
    } finally {
      if (originalTimezone === undefined) delete process.env.TZ;
      else process.env.TZ = originalTimezone;
    }
  });
});

describe("isTodayCommitment (today's load / today list)", () => {
  it("counts only open tasks scheduled for this calendar day", () => {
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: today }), now)).toBe(true);
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: new Date(2026, 5, 17, 15, 0).toISOString() }), now)).toBe(true);
  });
  it("excludes a month plan without a day, future, undated, done and set-aside tasks", () => {
    expect(isTodayCommitment(t({ schedule_v: 2, planning_horizon: "month", planning_start: "2026-06-01", planning_end: "2026-06-30" }), now)).toBe(false);
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: "2026-06-18" }), now)).toBe(false);
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: null }), now)).toBe(false);
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: today, completed: true, status: "done" }), now)).toBe(false);
    expect(isTodayCommitment(t({ schedule_v: 2, work_date: today, status: "wont_do" }), now)).toBe(false);
  });
});

describe("side paths read the single schedule", () => {
  it("smart-list horizon filter does not resurrect a cleared plan from legacy fields", () => {
    const cleared = t({ schedule_v: 2, planning_horizon: null, horizon: "week", period_start: "2026-06-15", period_end: "2026-06-21" } as Partial<Task>);
    expect(doesTaskMatchTimeFilters(cleared, [], ["week"])).toBe(false);
    expect(doesTaskMatchTimeFilters(cleared, [], ["none"])).toBe(true);
  });

  it("AI context gets one 'when' per task", () => {
    const [a, b] = compactTasksForAI([
      t({ title: "dated", schedule_v: 2, work_date: "2026-06-18" }),
      t({ title: "planned", schedule_v: 2, planning_horizon: "month", planning_start: "2026-06-01", planning_end: "2026-06-30" }),
    ]);
    expect(a).toEqual({ title: "dated", priority: "none", completed: false, when: "2026-06-18" });
    expect(b.when).toBe("month 2026-06-01..2026-06-30");
    expect(Object.keys(a)).not.toContain("due_date");
  });

  it("Life Architect goal levels map to Mind goals without turning everything into a month", () => {
    expect(mindGoalHorizon("yearly")).toBe("year");
    expect(mindGoalHorizon("quarterly")).toBe("quarter");
    expect(mindGoalHorizon("weekly")).toBe("week");
    expect(mindGoalHorizon("monthly")).toBe("month");
    expect(mindGoalHorizon("none")).toBeNull();
  });
});
