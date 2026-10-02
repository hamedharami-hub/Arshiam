import { describe, expect, it } from "vitest";
import { getTaskPlanning, isTaskOverdue, planningPatch, buildPlanningProjection, planningScopeTasks, planningUnitNumber, planningOffset } from "./taskPlanning";
import { addDaysLocal, childPeriods, fieldsForPeriod, periodFor, type TimeSettings } from "./timeHorizon";
import type { Task } from "./taskTypes";
const settings: TimeSettings = { calendar: "gregorian", weekStart: "sat", seasonsEnabled: true };
const now = new Date(2026, 4, 3, 12);
const task = (id: string, h?: "week" | "month" | "year", date = now, parent_id: string | null = null): Task => ({ id, title: id, completed: false, status: "todo", priority: "none", parent_id, ...(h ? planningPatch(periodFor(h, date, settings), settings) : {}) });
const books = [task("book", "year"), task("book1", "month", now, "book"), task("book2", "month", new Date(2026, 10, 3), "book"), task("chapter1", "week", now, "book1"), task("chapter2", "week", new Date(2026, 4, 9), "book1"), task("unplanned")];
const projection = (h: "week" | "month" | "year", rows = books) => buildPlanningProjection(rows, periodFor(h, now, settings), settings, now);
describe("independent task planning", () => {
  it("preserves exact dates, reminders and time blocks when assigning or clearing planning", () => {
    const source = { ...task("both"), due_date: "2026-05-19T10:30:00Z", due_at: "2026-05-19T10:30:00Z", reminder_at: "2026-05-19T10:15:00Z", start_at: "2026-05-19T10:30:00Z" };
    const planned = { ...source, ...planningPatch(periodFor("month", now, settings), settings) };
    const cleared = { ...planned, ...planningPatch(null, settings) };
    expect(planned.due_date).toBe(source.due_date); expect(cleared.due_date).toBe(source.due_date);
    expect(cleared.due_at).toBe(source.due_at); expect(cleared.reminder_at).toBe(source.reminder_at); expect(cleared.start_at).toBe(source.start_at);
    expect(getTaskPlanning(cleared, settings)).toBeNull();
  });
  it("reads legacy fuzzy buckets and preserves explicit clears over legacy fields", () => {
    const legacy = { ...task("legacy"), ...fieldsForPeriod(periodFor("month", now, settings)) };
    expect(getTaskPlanning(legacy, settings)?.horizon).toBe("month");
    expect(getTaskPlanning({ ...legacy, planning_horizon: null }, settings)).toBeNull();
    expect(getTaskPlanning({ ...task("exact"), due_date: now.toISOString(), horizon: "day", is_exact: true }, settings)).toBeNull();
  });
  it("keeps overdue tasks on their original date and treats only earlier days as overdue", () => {
    const today = new Date(2026, 4, 3, 18);
    const yesterday = { ...task("yesterday"), due_date: "2026-05-02" };
    const missedTimeToday = { ...task("today"), due_date: "2026-05-03T09:00:00" };
    expect(isTaskOverdue(yesterday, settings, today)).toBe(true);
    expect(yesterday.due_date).toBe("2026-05-02");
    expect(isTaskOverdue(missedTimeToday, settings, today)).toBe(false);
    expect(isTaskOverdue({ ...yesterday, completed: true }, settings, today)).toBe(false);
  });
  it("marks expired daily plans overdue without treating longer planning buckets as deadlines", () => {
    const today = new Date(2026, 4, 3, 12);
    const oldDay = { ...task("old-day"), ...planningPatch(periodFor("day", new Date(2026, 4, 2), settings), settings) };
    const oldWeek = { ...task("old-week"), ...planningPatch(periodFor("week", new Date(2026, 3, 25), settings), settings) };
    const currentDay = { ...task("current-day"), ...planningPatch(periodFor("day", today, settings), settings) };
    expect(isTaskOverdue(oldDay, settings, today)).toBe(true);
    expect(isTaskOverdue(oldWeek, settings, today)).toBe(false);
    expect(isTaskOverdue(currentDay, settings, today)).toBe(false);
  });
  it("shows the annual book and its future monthly child, but not the current monthly branch", () => {
    expect(projection("year").map(t => [t.id, t.parent_id])).toEqual([["book", null], ["book2", "book"]]);
  });
  it("promotes book1 to the monthly root and attaches its future weekly chapter", () => {
    expect(projection("month").map(t => [t.id, t.parent_id])).toEqual([["book1", null], ["chapter2", "book1"]]);
  });
  it("promotes the current weekly chapter without its broader parents", () => {
    expect(projection("week").map(t => [t.id, t.parent_id])).toEqual([["chapter1", null]]);
  });
  it("shows a task planned two weeks later in monthly and in its own future week", () => {
    const later = task("later", "week", addDaysLocal(now, 14));
    expect(projection("month", [later]).map(t => t.id)).toEqual(["later"]);
    expect(buildPlanningProjection([later], periodFor("week", addDaysLocal(now, 14), settings), settings, now).map(t => t.id)).toEqual(["later"]);
    expect(projection("week", [later])).toEqual([]);
  });
  it("keeps unplanned tasks out and keeps originals unchanged so details retain every child", () => {
    const before = JSON.stringify(books); projection("month");
    expect(JSON.stringify(books)).toBe(before);
    expect(planningScopeTasks(books, ["book"]).map(t => t.id)).toEqual(["book", "book1", "book2", "chapter1", "chapter2"]);
    expect(projection("year").some(t => t.id === "unplanned")).toBe(false);
  });
  it("labels week 3 and calendar month independently of daylight-saving shifts", () => {
    const month = periodFor("month", now, settings);
    const week3 = childPeriods(month, settings)[2];
    expect(planningUnitNumber(week3, settings)).toBe(3);
    expect(planningUnitNumber(periodFor("month", new Date(2026, 10, 3), settings), settings)).toBe(11);
  });
  it("labels six months later with its offset as well as its calendar month", () => {
    const period = periodFor("month", new Date(2026, 10, 3), settings);
    expect(planningOffset(period, settings, now)).toBe(6);
    expect(planningUnitNumber(period, settings)).toBe(11);
  });
  it("breaks corrupt cached parent cycles instead of losing all visible rows", () => {
    const cyclic = [task("a", "month", now, "b"), task("b", "month", now, "a")];
    expect(projection("month", cyclic).every(task => !task.parent_id)).toBe(true);
  });
  it("supports Jalali periods without inferring planning from precise dates", () => {
    const jalali = { ...settings, calendar: "jalali" as const };
    const period = periodFor("month", new Date(2026, 2, 23), jalali);
    const planned = { ...task("jalali"), ...planningPatch(period, jalali), due_date: "2026-03-25T10:00:00Z" };
    expect(getTaskPlanning(planned, jalali)).toEqual(period);
    expect(planningUnitNumber(period, jalali)).toBe(1);
    expect(buildPlanningProjection([planned], period, jalali, new Date(2026, 2, 23))).toHaveLength(1);
  });
});
