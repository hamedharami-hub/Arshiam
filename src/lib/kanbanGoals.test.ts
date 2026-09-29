import { describe, expect, it, beforeEach } from "vitest";
import {
  getKanbanGoals,
  saveKanbanGoals,
  generateUUID,
  type GoalKanban,
} from "./kanbanGoals";

describe("kanbanGoals management and settings", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads default main goal when storage is empty", () => {
    const goals = getKanbanGoals(null, "user_1");
    expect(goals.length).toBeGreaterThan(0);
    const rootGoal = goals.find((g) => g.parentId === null);
    expect(rootGoal).toBeDefined();
    expect(rootGoal?.title).toBeTruthy();
  });

  it("allows renaming the main goal and modifying all its settings", () => {
    const goals = getKanbanGoals(null, "user_1");
    const rootGoal = goals.find((g) => g.parentId === null)!;

    const updatedRoot: GoalKanban = {
      ...rootGoal,
      title: "هدف اصلی اختصاصی من",
      icon: "🚀",
      description: "برنامه استراتژیک بلندمدت",
      color: "#ec4899",
      timeHorizon: "yearly",
      priority: "urgent",
      updatedAt: new Date().toISOString(),
    };

    const nextGoals = goals.map((g) => (g.id === rootGoal.id ? updatedRoot : g));
    saveKanbanGoals(nextGoals, null, "user_1");

    // Re-fetch from storage
    const reloaded = getKanbanGoals(null, "user_1");
    const reloadedRoot = reloaded.find((g) => g.id === rootGoal.id);

    expect(reloadedRoot).toBeDefined();
    expect(reloadedRoot?.title).toBe("هدف اصلی اختصاصی من");
    expect(reloadedRoot?.icon).toBe("🚀");
    expect(reloadedRoot?.description).toBe("برنامه استراتژیک بلندمدت");
    expect(reloadedRoot?.color).toBe("#ec4899");
    expect(reloadedRoot?.timeHorizon).toBe("yearly");
    expect(reloadedRoot?.priority).toBe("urgent");
    expect(reloadedRoot?.parentId).toBeNull();
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

  it("creates fallback main goal if empty list is encountered", () => {
    localStorage.setItem("arshnaz_kanban_goals_v3_user_1", JSON.stringify([]));
    const goals = getKanbanGoals(null, "user_1");
    expect(goals.length).toBeGreaterThan(0);
    expect(goals[0].parentId).toBeNull();
  });

  it("enforces strictly ONE root goal even if multiple root goals are passed", () => {
    const rootId = "11111111-1111-4111-8111-111111111111";
    const secondRootId = "22222222-2222-4222-8222-222222222222";
    const multiRootGoals: GoalKanban[] = [
      {
        id: rootId,
        title: "ریشه اول",
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
        title: "ریشه دوم قبلی",
        parentId: null,
        timeHorizon: "monthly",
        priority: "medium",
        color: "#10b981",
        icon: "💼",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    saveKanbanGoals(multiRootGoals, null, "user_single_root");
    const reloaded = getKanbanGoals(null, "user_single_root");

    const roots = reloaded.filter((g) => g.parentId === null);
    expect(roots.length).toBe(1);
    expect(roots[0].id).toBe(rootId);

    const child = reloaded.find((g) => g.id === secondRootId);
    expect(child?.parentId).toBe(rootId);
  });
});
