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
  it("groups exact dates into overdue / missed / today / tomorrow / dated", () => {
    const list = [
      task("overdue", { work_date: day(-2) }),
      task("missed", { work_date: day(-1) }),
      task("today", { work_date: day(0) }),
      task("tomorrow", { work_date: day(1) }),
      task("later", { work_date: day(4) }),
    ];
    const groups = buildGroupedTasks(list, "next7", false, T);
    expect(groupKeyOf(groups, "overdue")).toBe("missed");
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

  it("keeps a week plan out of today, a month plan out of today, and a dated task out of the week plan", () => {
    const list = [
      task("week-plan", { planning_horizon: "week", planning_start: day(-1), planning_end: day(3) }),
      task("month-plan", { planning_horizon: "month", planning_start: day(0), planning_end: day(20) }),
      task("dated-week", {
        work_date: day(0),
        planning_horizon: "week",
        planning_start: day(-1),
        planning_end: day(3),
      }),
    ];
    const groups = buildGroupedTasks(list, "today", false, T);
    expect(groupKeyOf(groups, "week-plan")).toBe("week-plan");
    expect(groupKeyOf(groups, "month-plan")).not.toBe("today");
    expect(groupKeyOf(groups, "dated-week")).toBe("today");
    expect(groups?.find((g) => g.key === "week-plan")?.tasks.map((t) => t.id)).not.toContain("dated-week");
    expect(groups?.filter((g) => g.tasks.some((t) => t.id === "dated-week"))).toHaveLength(1);
  });

  it("keeps a part-of-day bucket anchored today inside the today group", () => {
    const list = [task("morning", { bucket_kind: "day", bucket_anchor: day(0), bucket_calendar: "gregorian" })];
    const groups = buildGroupedTasks(list, "next7", false, T);
    expect(groupKeyOf(groups, "morning")).toBe("today");
  });

  it("renders every scoped task exactly once (count never lies)", () => {
    const inWindow = [
      task("a", { work_date: day(0) }),
      task("b", { work_date: day(1) }),
      task("c", { work_date: day(0) }),
      task("d", { planning_horizon: "week", planning_start: day(-1), planning_end: day(4) }),
      task("e", { bucket_kind: "day", bucket_anchor: day(1), bucket_calendar: "gregorian" }),
      task("f", { work_date: day(6) }),
      task("g", { work_date: day(-5) }),
    ];
    const groups = buildGroupedTasks(inWindow, "next7", false, T);
    const flat = flatten(groups);
    expect(flat).toHaveLength(inWindow.length);
    expect(new Set(flat).size).toBe(inWindow.length);
    expect([...flat].sort()).toEqual(inWindow.map((t) => t.id).sort());
  });

  it("only groups the date-scoped lists", () => {
    const list = [task("x", { work_date: day(0) })];
    expect(buildGroupedTasks(list, "inbox", false, T)).toBeNull();
    expect(buildGroupedTasks(list, "tomorrow", false, T)).toBeNull();
    expect(buildGroupedTasks(list, "folder", false, T)).toBeNull();
  });
});
