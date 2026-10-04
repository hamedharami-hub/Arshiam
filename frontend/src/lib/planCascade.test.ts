import { describe, expect, it } from "vitest";
import type { Task } from "./taskTypes";
import { carryOver, childLevel, childrenMap, itemsInPeriod, levelsFor, parentLevel, planOf, planPatch, progressOf, unplanned, periodsWithin, defaultChildPeriod } from "./planCascade";
import { getTaskTime, nextPeriod, periodFor, prevPeriod, type TimeSettings } from "./timeHorizon";

const s: TimeSettings = { calendar: "gregorian", weekStart: "mon", seasonsEnabled: true };
const now = new Date(2026, 5, 10, 12);
const week = periodFor("week", now, s);
const month = periodFor("month", now, s);
const t = (id: string, extra: Partial<Task> = {}): Task => ({ id, title: id, completed: false, status: "todo", priority: "none", parent_id: null, ...extra } as Task);

describe("planCascade", () => {
  it("orders levels and skips seasons when disabled", () => {
    expect(levelsFor(s)).toEqual(["year", "quarter", "month", "week", "day"]);
    expect(parentLevel("month", { ...s, seasonsEnabled: false })).toBe("year");
    expect(childLevel("week", s)).toBe("day");
    expect(parentLevel("year", s)).toBeNull();
  });

  it("planning does not turn into a due period", () => {
    const planned = t("a", planPatch(week, s));
    expect(getTaskTime(planned, s)).toBeNull();
    expect(planOf(planned, s)).toEqual(week);
  });

  it("finds items of a period and treats due dates as day items", () => {
    const due = t("due", { due_date: "2026-06-10" });
    const tasks = [t("w", planPatch(week, s)), t("m", planPatch(month, s)), due];
    expect(itemsInPeriod(tasks, week, s).map((x) => x.id)).toEqual(["w"]);
    expect(itemsInPeriod(tasks, periodFor("day", now, s), s).map((x) => x.id)).toEqual(["due"]);
  });

  it("rolls progress up through the cascade", () => {
    const year = t("y", planPatch(periodFor("year", now, s), s));
    const m1 = t("m1", { ...planPatch(month, s, "y") });
    const m2 = t("m2", { ...planPatch(month, s, "y"), completed: true, status: "done" });
    const w1 = t("w1", { ...planPatch(week, s, "m1"), completed: true, status: "done" });
    const w2 = t("w2", planPatch(week, s, "m1"));
    const kids = childrenMap([year, m1, m2, w1, w2]);
    expect(progressOf(m1, kids)).toMatchObject({ done: 1, total: 2, ratio: 0.5 });
    expect(progressOf(year, kids)).toMatchObject({ done: 1, total: 2, ratio: 0.75 });
  });

  it("lists open items of earlier periods once and leaves the unplanned tray clean", () => {
    const old = t("old", planPatch(prevPeriod(week, s), s));
    const doneOld = t("doneOld", { ...planPatch(prevPeriod(week, s), s), completed: true });
    const future = t("future", planPatch(nextPeriod(week, s), s));
    const loose = t("loose");
    const child = t("child", { plan_parent_id: "x" });
    expect(carryOver([old, doneOld, future], week, s).map((x) => x.id)).toEqual(["old"]);
    expect(unplanned([old, loose, child], s).map((x) => x.id)).toEqual(["loose"]);
  });

  it("builds pickers and default child periods", () => {
    expect(periodsWithin("month", periodFor("year", now, s), s)).toHaveLength(12);
    expect(periodsWithin("quarter", periodFor("year", now, s), s)).toHaveLength(4);
    expect(defaultChildPeriod(week, "day", s, now).start).toBe("2026-06-10");
    expect(defaultChildPeriod(nextPeriod(week, s), "day", s, now).start).toBe(nextPeriod(week, s).start);
  });
});
