import { describe, expect, it } from "vitest";
import { addDays } from "date-fns";
import { buildGroupedTasks, type TaskGroup } from "./TaskDueDateGroups";
import { getLocalDateString } from "@/lib/taskDate";
import type { Task } from "@/lib/taskTypes";

const T = (fa: string, _en: string) => fa;
const day = (offset: number) => getLocalDateString(addDays(new Date(), offset));
const task = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  user_id: "u1",
  title: id,
  completed: false,
  status: "todo" as Task["status"],
  priority: "none" as Task["priority"],
  ...extra,
} as Task);

const flatten = (groups: TaskGroup[] | null) => (groups ?? []).flatMap((g) => g.tasks.map((t) => t.id));
const groupKeyOf = (groups: TaskGroup[] | null, id: string) =>
  groups?.find((g) => g.tasks.some((t) => t.id === id))?.key;

describe("buildGroupedTasks (Next 7 Days list grouping)", () => {
  it("groups dates into overdue / missed plan / today / tomorrow / dated", () => {
    const list = [
      task("overdue", { due_date: day(-2) }),
      task("missed", { planning_horizon: "day", planning_start: day(-1), planning_end: day(-1) }),
      task("today", { due_date: day(0) }),
      task("tomorrow", { due_date: day(1) }),
      task("later", { due_date: day(4) }),
    ];
    const groups = buildGroupedTasks(list, "next7", false, T);
    expect(groupKeyOf(groups, "overdue")).toBe("overdue");
    expect(groupKeyOf(groups, "missed")).toBe("missed");
    expect(groupKeyOf(groups, "today")).toBe("today");
    expect(groupKeyOf(groups, "tomorrow")).toBe("tomorrow");
    expect(groupKeyOf(groups, "later")).toBe(day(4));
  });

  it("labels a current-week fuzzy plan as this-week instead of dropping it", () => {
    const list = [
      task("week-plan", { planning_horizon: "week", planning_start: day(-3), planning_end: day(3) }),
      task("week-bucket", { bucket_kind: "week", bucket_anchor: day(0), bucket_calendar: "gregorian" }),
    ];
    const groups = buildGroupedTasks(list, "next7", false, T);
    expect(groupKeyOf(groups, "week-plan")).toBe("week-plan");
    expect(groupKeyOf(groups, "week-bucket")).toBe("week-plan");
  });

  it("keeps an older week bucket visible without dressing it as missed or this-week", () => {
    const list = [task("old-week", { bucket_kind: "week", bucket_anchor: day(-9), bucket_calendar: "gregorian" })];
    const groups = buildGroupedTasks(list, "next7", false, T);
    const key = groupKeyOf(groups, "old-week");
    expect(key).toBeTruthy();
    expect(key).not.toBe("missed");
    expect(key).not.toBe("week-plan");
  });

  it("ignores a legacy part-of-day value left on an old task", () => {
    const list = [task("morning", { bucket_kind: "morning" as never, bucket_anchor: day(0), bucket_calendar: "gregorian" })];
    const groups = buildGroupedTasks(list, "next7", false, T);
    expect(groupKeyOf(groups, "morning")).toBe("undated");
  });

  it("renders every scoped task exactly once (count never lies)", () => {
    const inWindow = [
      task("a", { due_date: day(0) }),
      task("b", { due_date: day(1) }),
      task("c", { work_date: day(0) }),
      task("d", { planning_horizon: "week", planning_start: day(-1), planning_end: day(4) }),
      task("e", { bucket_kind: "night" as never, bucket_anchor: day(1), bucket_calendar: "gregorian" }),
      task("f", { due_date: day(6) }),
      task("g", { due_date: day(-5) }),
    ];
    const groups = buildGroupedTasks(inWindow, "next7", false, T);
    const flat = flatten(groups);
    expect(flat).toHaveLength(inWindow.length);
    expect(new Set(flat).size).toBe(inWindow.length);
    expect([...flat].sort()).toEqual(inWindow.map((t) => t.id).sort());
  });

  it("only groups the date-scoped lists", () => {
    const list = [task("x", { due_date: day(0) })];
    expect(buildGroupedTasks(list, "inbox", false, T)).toBeNull();
    expect(buildGroupedTasks(list, "tomorrow", false, T)).toBeNull();
    expect(buildGroupedTasks(list, "folder", false, T)).toBeNull();
  });
});
