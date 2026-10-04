import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jalali", () => ({ getCalendarSystem: () => "gregorian" }));

import {
  addDaysLocal, childPeriods, fromLocalISO, getTaskTime, isOverdue, nextPeriod, periodFor, periodLabel,
  postponeFields, prevPeriod, timePatch, toLocalISO, type TimeSettings,
} from "./timeHorizon";

const G_SAT: TimeSettings = { calendar: "gregorian", weekStart: "sat", seasonsEnabled: true };
const G_MON: TimeSettings = { calendar: "gregorian", weekStart: "mon", seasonsEnabled: true };
const J_SAT: TimeSettings = { calendar: "jalali", weekStart: "sat", seasonsEnabled: true };
const d = (s: string) => fromLocalISO(s);

describe("week start", () => {
  it("Saturday start (default)", () => {
    expect(periodFor("week", d("2026-06-10"), G_SAT)).toEqual({ horizon: "week", start: "2026-06-06", end: "2026-06-12" });
  });
  it("Monday start", () => {
    expect(periodFor("week", d("2026-06-10"), G_MON)).toEqual({ horizon: "week", start: "2026-06-08", end: "2026-06-14" });
  });
  it("a Saturday is the first day of its own week with Saturday start", () => {
    expect(periodFor("week", d("2026-06-13"), G_SAT).start).toBe("2026-06-13");
    expect(periodFor("week", d("2026-06-13"), G_MON).start).toBe("2026-06-08");
  });
});

describe("month / quarter / year", () => {
  it("gregorian calendar quarters are Q1..Q4", () => {
    expect(periodFor("quarter", d("2026-05-15"), G_SAT)).toMatchObject({ start: "2026-04-01", end: "2026-06-30" });
    expect(periodLabel(periodFor("quarter", d("2026-05-15"), G_SAT), G_SAT, "en")).toBe("Q2 2026");
  });
  it("jalali month, season and year", () => {
    expect(periodFor("month", d("2026-06-10"), J_SAT)).toMatchObject({ start: "2026-05-22", end: "2026-06-21" });
    expect(periodFor("quarter", d("2026-06-10"), J_SAT)).toMatchObject({ start: "2026-03-21", end: "2026-06-21" });
    expect(periodFor("year", d("2026-06-10"), J_SAT)).toMatchObject({ start: "2026-03-21", end: "2027-03-20" });
  });
  it("next / prev period", () => {
    const m = periodFor("month", d("2026-01-31"), G_SAT);
    expect(nextPeriod(m, G_SAT)).toMatchObject({ start: "2026-02-01", end: "2026-02-28" });
    expect(prevPeriod(m, G_SAT)).toMatchObject({ start: "2025-12-01", end: "2025-12-31" });
  });
});

describe("nested children (one level down)", () => {
  it("month -> weeks, with shared weeks flagged at both edges", () => {
    const weeks = childPeriods(periodFor("month", d("2026-06-10"), G_SAT), G_SAT);
    expect(weeks[0]).toMatchObject({ horizon: "week", start: "2026-05-30", end: "2026-06-05", shared: true });
    expect(weeks.at(-1)).toMatchObject({ start: "2026-06-27", end: "2026-07-03", shared: true });
    expect(weeks.slice(1, -1).every((w) => !w.shared)).toBe(true);
    // the same week shows up (shared) in July too
    const july = childPeriods(periodFor("month", d("2026-07-10"), G_SAT), G_SAT);
    expect(july[0]).toMatchObject({ start: "2026-06-27", shared: true });
  });
  it("week -> 7 days, quarter -> 3 months", () => {
    expect(childPeriods(periodFor("week", d("2026-06-10"), G_SAT), G_SAT)).toHaveLength(7);
    expect(childPeriods(periodFor("quarter", d("2026-06-10"), G_SAT), G_SAT).map((p) => p.horizon)).toEqual(["month", "month", "month"]);
  });
  it("year -> seasons, or months when seasons are off", () => {
    expect(childPeriods(periodFor("year", d("2026-06-10"), G_SAT), G_SAT)).toHaveLength(4);
    const off = { ...G_SAT, seasonsEnabled: false };
    const months = childPeriods(periodFor("year", d("2026-06-10"), off), off);
    expect(months).toHaveLength(12);
    expect(months[0].horizon).toBe("month");
  });
});

describe("overdue + postpone", () => {
  const now = new Date(2026, 5, 10, 12, 0); // Wed 10 Jun 2026 12:00 local
  it("fuzzy task is overdue only after its period ends", () => {
    const week = periodFor("week", d("2026-06-03"), G_SAT); // 30 May – 5 Jun
    const t = { completed: false, status: "todo" as const, horizon: "week" as const, period_start: week.start, period_end: week.end, is_exact: false };
    expect(isOverdue(t, G_SAT, now)).toBe(true);
    const cur = periodFor("week", now, G_SAT);
    expect(isOverdue({ ...t, period_start: cur.start, period_end: cur.end }, G_SAT, now)).toBe(false);
    expect(isOverdue({ ...t, completed: true }, G_SAT, now)).toBe(false);
  });
  it("exact tasks become overdue once their date and time have passed", () => {
    const due = new Date(2026, 5, 10, 11, 0).toISOString();
    expect(isOverdue({ completed: false, horizon: "day", period_start: "2026-06-10", period_end: "2026-06-10", is_exact: true, due_at: due }, G_SAT, new Date(2026, 5, 10, 10, 0))).toBe(false);
    expect(isOverdue({ completed: false, horizon: "day", period_start: "2026-06-10", period_end: "2026-06-10", is_exact: true, due_at: due }, G_SAT, new Date(2026, 5, 10, 11, 30))).toBe(true);
    expect(isOverdue({ completed: false, horizon: "day", period_start: "2026-06-10", period_end: "2026-06-10", is_exact: true, due_at: due }, G_SAT, new Date(2026, 5, 11, 0, 1))).toBe(true);
  });
  it("postpone moves to the next period of the same horizon and counts", () => {
    const cur = periodFor("month", now, G_SAT);
    const r = postponeFields({ horizon: "month", period_start: cur.start, period_end: cur.end, is_exact: false, postpone_count: 2 }, G_SAT, now)!;
    expect(r).toMatchObject({ horizon: "month", period_start: "2026-07-01", period_end: "2026-07-31", postpone_count: 3 });
  });
  it("a long-overdue task postpones into the current period, never still overdue", () => {
    const old = periodFor("week", d("2026-04-01"), G_SAT);
    const r = postponeFields({ horizon: "week", period_start: old.start, period_end: old.end, is_exact: false }, G_SAT, now)!;
    expect(r).toMatchObject({ period_start: "2026-06-06", period_end: "2026-06-12", postpone_count: 1 });
  });
  it("timePatch mirrors legacy fields so older screens keep working", () => {
    const p = timePatch({ horizon: "week", period_start: "2026-06-06", period_end: "2026-06-12", due_at: null, is_exact: false, postpone_count: 0 }, G_SAT);
    expect(p).toMatchObject({ bucket_kind: "week", bucket_anchor: "2026-06-06", due_date: null });
    expect(getTaskTime(p, G_SAT)).toMatchObject({ horizon: "week", period_start: "2026-06-06" });
  });
  it("reads legacy bucket and due_date tasks", () => {
    expect(getTaskTime({ bucket_kind: "month", bucket_anchor: "2026-06-01", bucket_calendar: "gregorian" }, G_SAT)).toMatchObject({ horizon: "month", period_end: "2026-06-30" });
    expect(getTaskTime({ due_date: "2026-06-12" }, G_SAT)).toMatchObject({ horizon: "day", period_start: "2026-06-12", is_exact: false });
    expect(getTaskTime({ due_date: new Date(2026, 5, 12, 15, 30).toISOString() }, G_SAT)).toMatchObject({ is_exact: true });
    expect(getTaskTime({}, G_SAT)).toBeNull();
  });
  it("legacy edits made by older screens win over stale v2 fields", () => {
    const t = { horizon: "week" as const, period_start: "2026-06-06", period_end: "2026-06-12", is_exact: false, bucket_kind: "month" as const, bucket_anchor: "2026-07-01", bucket_calendar: "gregorian" as const };
    expect(getTaskTime(t, G_SAT)).toMatchObject({ horizon: "month", period_start: "2026-07-01" });
  });
});

describe("daylight saving (Australia/Sydney)", () => {
  const prevTZ = process.env.TZ;
  beforeAll(() => { process.env.TZ = "Australia/Sydney"; });
  afterAll(() => { process.env.TZ = prevTZ; });

  it("DST start day (4 Oct 2026, 23h long) keeps day boundaries", () => {
    expect(toLocalISO(addDaysLocal(d("2026-10-03"), 1))).toBe("2026-10-04");
    expect(toLocalISO(addDaysLocal(d("2026-10-04"), 1))).toBe("2026-10-05");
    expect(nextPeriod(periodFor("day", d("2026-10-04"), G_SAT), G_SAT).start).toBe("2026-10-05");
    expect(periodFor("week", d("2026-10-04"), G_SAT)).toMatchObject({ start: "2026-10-03", end: "2026-10-09" });
  });
  it("DST end day (5 Apr 2026, 25h long) keeps day boundaries", () => {
    expect(toLocalISO(addDaysLocal(d("2026-04-05"), 1))).toBe("2026-04-06");
    expect(periodFor("week", d("2026-04-05"), G_MON)).toMatchObject({ start: "2026-03-30", end: "2026-04-05" });
  });
  it("overdue flips exactly at local midnight across the DST change", () => {
    const t = { completed: false, horizon: "day" as const, period_start: "2026-10-04", period_end: "2026-10-04", is_exact: false };
    expect(isOverdue(t, G_SAT, new Date(2026, 9, 4, 23, 30))).toBe(false);
    expect(isOverdue(t, G_SAT, new Date(2026, 9, 5, 0, 10))).toBe(true);
  });
  it("postponing an exact task over the DST change keeps its wall-clock time", () => {
    const due = new Date(2026, 9, 3, 9, 0);
    const r = postponeFields({ horizon: "day", period_start: "2026-10-03", period_end: "2026-10-03", is_exact: true, due_at: due.toISOString() }, G_SAT, new Date(2026, 9, 3, 8, 0))!;
    const nd = new Date(r.due_at!);
    expect(nd.getHours()).toBe(9);
    expect(toLocalISO(nd)).toBe("2026-10-04");
    expect(nd.getTime() - due.getTime()).toBe(23 * 3600 * 1000);
  });
});
