import { describe, expect, it, beforeEach } from "vitest";
import {
  filterAndSortTasks,
  loadSmartListProfiles,
  saveSmartListProfiles,
  DEFAULT_FILTERS,
  PRESET_SMART_PROFILES,
  doesTaskMatchTimeFilters,
  doesTaskMatchGoalFilter,
} from "./smartListService";
import type { Task } from "./taskTypes";

const mockTask = (id: string, extra: Partial<Task> = {}): Task => ({
  id,
  user_id: "user-1",
  title: id,
  priority: "none",
  completed: false,
  status: "todo",
  position: 0,
  created_at: "2026-09-01T10:00:00Z",
  ...extra,
});

import { getLocalDateString } from "./taskDate";

describe("smartListService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default presets when localStorage is empty", () => {
    const profiles = loadSmartListProfiles();
    expect(profiles.length).toBeGreaterThanOrEqual(4);
    expect(profiles[0].name).toContain("اولویت");
  });

  it("saves and reloads custom profiles", () => {
    const custom = [
      {
        id: "custom-1",
        name: "پروژه ویژه",
        filters: { ...DEFAULT_FILTERS, priorities: ["urgent"] },
      },
    ];
    saveSmartListProfiles(custom);
    const loaded = loadSmartListProfiles();
    expect(loaded.length).toBe(1);
    expect(loaded[0].name).toBe("پروژه ویژه");
    expect(loaded[0].filters.priorities).toEqual(["urgent"]);
  });

  it("filters tasks by multiple folders including without folder (__none__)", () => {
    const tasks = [
      mockTask("t1", { folder_id: "f1" }),
      mockTask("t2", { folder_id: "f2" }),
      mockTask("t3", { folder_id: null }),
    ];

    // Filter f1 only
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, folder_ids: ["f1"] }).map((t) => t.id)
    ).toEqual(["t1"]);

    // Filter f1 and f2
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, folder_ids: ["f1", "f2"] }).map((t) => t.id)
    ).toEqual(["t1", "t2"]);

    // Filter without folder (__none__)
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, folder_ids: ["__none__"] }).map((t) => t.id)
    ).toEqual(["t3"]);
  });

  it("filters tasks by multiple tags including __none__", () => {
    const tasks = [mockTask("t1"), mockTask("t2"), mockTask("t3")];
    const tagsMap = {
      t1: ["tag-work"],
      t2: ["tag-personal", "tag-urgent"],
    };

    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, tag_ids: ["tag-urgent"] }, tagsMap).map(
        (t) => t.id
      )
    ).toEqual(["t2"]);

    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, tag_ids: ["__none__"] }, tagsMap).map(
        (t) => t.id
      )
    ).toEqual(["t3"]);
  });

  it("filters tasks by goals including child goals", () => {
    const goals = [
      {
        id: "goal-root",
        title: "هدف ریشه",
        parentId: null,
        timeHorizon: "quarterly" as const,
        priority: "high" as const,
        position: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
      {
        id: "goal-child",
        title: "زیر هدف",
        parentId: "goal-root",
        timeHorizon: "monthly" as const,
        priority: "medium" as const,
        position: 0,
        createdAt: "2026-09-01",
        updatedAt: "2026-09-01",
      },
    ];

    const tasks = [
      mockTask("t-root", { kanban_column_id: "goal-root" }),
      mockTask("t-child", { kanban_column_id: "goal-child" }),
      mockTask("t-none", { kanban_column_id: null }),
    ];

    // Filtering by goal-root includes child goal
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, goal_ids: ["goal-root"] }, {}, goals).map(
        (t) => t.id
      )
    ).toEqual(["t-root", "t-child"]);

    // Filtering by __none__
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, goal_ids: ["__none__"] }, {}, goals).map(
        (t) => t.id
      )
    ).toEqual(["t-none"]);
  });

  it("filters by time horizons and due windows", () => {
    const today = getLocalDateString(new Date());
    const past = "2020-01-01";
    const tasks = [
      mockTask("t-overdue", { due_date: past, completed: false }),
      mockTask("t-today", { due_date: today }),
      mockTask("t-nodate", { due_date: null }),
      mockTask("t-week-bucket", { planning_horizon: "week", planning_start: "2026-06-13", planning_end: "2026-06-19" }),
    ];

    // Filter overdue
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, due_windows: ["overdue"] }).map((t) => t.id)
    ).toEqual(["t-overdue"]);

    // Filter no due date
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, due_windows: ["no_date"] }).map((t) => t.id)
    ).toEqual(["t-nodate", "t-week-bucket"]);

    // Filter time horizon week
    expect(
      filterAndSortTasks(tasks, { ...DEFAULT_FILTERS, time_horizons: ["week"] }).map((t) => t.id)
    ).toEqual(["t-week-bucket"]);
  });

  it("applies two-level sorting (primary then secondary)", () => {
    const tasks = [
      mockTask("t1", { priority: "high", due_date: "2026-10-05" }),
      mockTask("t2", { priority: "high", due_date: "2026-10-01" }),
      mockTask("t3", { priority: "urgent", due_date: "2026-10-10" }),
    ];

    // Primary: priority asc (urgent first, then high), Secondary: due asc (earlier due first)
    const sorted = filterAndSortTasks(tasks, {
      ...DEFAULT_FILTERS,
      sort_primary: { key: "priority", dir: "asc" },
      sort_secondary: { key: "due", dir: "asc" },
    });

    expect(sorted.map((t) => t.id)).toEqual(["t3", "t2", "t1"]);
  });

  it("filters and sorts legacy p1 priority as high", () => {
    const tasks = [mockTask("legacy", { priority: "p1" as any }), mockTask("urgent", { priority: "urgent" })];
    const filtered = filterAndSortTasks(tasks, {
      ...DEFAULT_FILTERS,
      priorities: ["high"],
      sort_primary: { key: "priority", dir: "asc" },
      sort_secondary: { key: "title", dir: "asc" },
    });
    expect(filtered.map((task) => task.id)).toEqual(["legacy"]);
  });
});
