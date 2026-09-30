import { describe, expect, it, beforeEach } from "vitest";
import {
  getKanbanGoals,
  saveKanbanGoals,
  getUserOwnGoals,
  getAllKanbanGoals,
  isAutoDefaultGoal,
  type GoalKanban,
} from "./kanbanGoals";

const makeGoal = (id: string, title: string): GoalKanban => ({
  id,
  title,
  parentId: null,
  timeHorizon: "monthly",
  priority: "medium",
  color: "#3b82f6",
  icon: "🎯",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe("kanbanGoals management and settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("never seeds sample goals into the global kanban", () => {
    expect(getKanbanGoals(null, "user_1")).toEqual([]);
  });

  it("hides legacy sample goals that were stored earlier", () => {
    const legacy = makeGoal("a0000000-0000-4000-8000-000000000002", "زبان و مکالمه");
    const mine = makeGoal("33333333-3333-4333-8333-333333333333", "هدف من");
    localStorage.setItem("arshnaz_kanban_goals_v3_user_1", JSON.stringify([legacy, mine]));
    expect(getKanbanGoals(null, "user_1").map((g) => g.id)).toEqual([mine.id]);
  });

  it("collects goals defined inside folders and drops untouched auto defaults", () => {
    const userGoal = makeGoal("44444444-4444-4444-8444-444444444444", "پروژه وب‌سایت");
    saveKanbanGoals([userGoal], "folder_a", "user_1");
    getKanbanGoals("folder_b", "user_1");
    const own = getUserOwnGoals([{ id: "folder_a", name: "کار" }, { id: "folder_b", name: "خانه" }], "user_1");
    expect(own.find((g) => g.id === userGoal.id)).toMatchObject({ folderId: "folder_a", folderName: "کار" });
    expect(own.filter(isAutoDefaultGoal)).toHaveLength(1);
    expect(getAllKanbanGoals([{ id: "folder_a" }, { id: "folder_b" }], "user_1").map((g) => g.id)).toEqual([userGoal.id]);
  });

  it("handles folder-scoped kanban goals and renaming root goal of folder", () => {
    const folderId = "folder_abc";
    const goals = getKanbanGoals(folderId, "user_1");
    expect(goals.length).toBe(1);
    expect(goals[0].title).toBe("هدف اصلی این بخش");

    const renamed: GoalKanban = {
      ...goals[0],
      title: "پروژه لانچ وب‌سایت جدید",
      icon: "🌐",
      color: "#10b981",
      priority: "urgent",
      timeHorizon: "quarterly",
      updatedAt: new Date().toISOString(),
    };

    saveKanbanGoals([renamed], folderId, "user_1");

    const reloaded = getKanbanGoals(folderId, "user_1");
    expect(reloaded[0].title).toBe("پروژه لانچ وب‌سایت جدید");
    expect(reloaded[0].icon).toBe("🌐");
    expect(reloaded[0].color).toBe("#10b981");
    expect(reloaded[0].priority).toBe("urgent");
    expect(reloaded[0].timeHorizon).toBe("quarterly");
  });

  it("preserves all goals as equal flat primary goals with parentId null", () => {
    const rootId = "11111111-1111-4111-8111-111111111111";
    const secondRootId = "22222222-2222-4222-8222-222222222222";
    const multiRootGoals: GoalKanban[] = [
      {
        id: rootId,
        title: "هدف اول",
        parentId: null,
        timeHorizon: "yearly",
        priority: "high",
        color: "#3b82f6",
        icon: "🎯",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: secondRootId,
        title: "هدف دوم",
        parentId: null,
        timeHorizon: "monthly",
        priority: "medium",
        color: "#10b981",
        icon: "💼",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    saveKanbanGoals(multiRootGoals, null, "user_flat_goals");
    const reloaded = getKanbanGoals(null, "user_flat_goals");

    expect(reloaded.length).toBe(2);
    expect(reloaded.every((g) => g.parentId === null)).toBe(true);
    expect(reloaded.find((g) => g.id === rootId)?.title).toBe("هدف اول");
    expect(reloaded.find((g) => g.id === secondRootId)?.title).toBe("هدف دوم");
  });
});
