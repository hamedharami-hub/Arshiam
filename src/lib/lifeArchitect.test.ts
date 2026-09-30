import { describe, it, expect } from "vitest";
import {
  WIZARD_QUESTIONS,
  CORE_VALUES_LIST,
  ENERGY_CAPACITY_OPTIONS,
  LIFE_DOMAINS_INFO,
  generateDeterministicBlueprint,
  type UserAnswers,
} from "./lifeArchitect";

describe("Life Architect Core Engine", () => {
  it("has valid questions with scientific insights and comprehensive options", () => {
    expect(WIZARD_QUESTIONS.length).toBeGreaterThanOrEqual(4);
    WIZARD_QUESTIONS.forEach((q) => {
      expect(q.titleFa).toBeTruthy();
      expect(q.scientificInsightFa).toBeTruthy();
      expect(q.options.length).toBeGreaterThanOrEqual(3);
    });
  });

  it("provides rich core values and energy capacity definitions", () => {
    expect(CORE_VALUES_LIST.length).toBe(8);
    CORE_VALUES_LIST.forEach((val) => {
      expect(val.labelFa).toBeTruthy();
      expect(val.quoteFa).toBeTruthy();
      expect(val.icon).toBeTruthy();
    });

    expect(ENERGY_CAPACITY_OPTIONS.length).toBe(3);
    const recovery = ENERGY_CAPACITY_OPTIONS.find((e) => e.key === "recovery");
    expect(recovery?.badgeFa).toContain("کاهش بار");
  });

  it("generates deterministic blueprint for a freelancer with procrastination", () => {
    const answers: UserAnswers = {
      role: "freelancer",
      obstacle: "procrastination",
      domains: ["career", "health", "finance"],
      chronotype: "morning",
      customGoals: "راه‌اندازی محصول دیجیتال جدید",
    };

    const bp = generateDeterministicBlueprint(answers);

    expect(bp.title).toContain("فریلنسر");
    expect(bp.folders.length).toBe(3);
    expect(bp.goals.length).toBe(3);

    // Check procrastination habit
    const procHabit = bp.habits.find((h) => h.name.includes("۲ دقیقه"));
    expect(procHabit).toBeDefined();

    // Check morning chronotype MIT habit
    const mitHabit = bp.habits.find((h) => h.name.includes("MIT"));
    expect(mitHabit).toBeDefined();
    expect(mitHabit?.reminder_time).toBe("07:30");

    // Check custom goal task
    const customTask = bp.tasks.find((t) => t.title.includes("محصول دیجیتال جدید"));
    expect(customTask).toBeDefined();
  });

  it("adjusts habits for distraction and night chronotype", () => {
    const answers: UserAnswers = {
      role: "student",
      obstacle: "distraction",
      domains: ["growth", "health"],
      chronotype: "night",
    };

    const bp = generateDeterministicBlueprint(answers);

    // Distraction habit should be Pomodoro
    const pomodoroHabit = bp.habits.find((h) => h.name.includes("پومودورو"));
    expect(pomodoroHabit).toBeDefined();

    // Night chronotype MIT habit reminder time should be later
    const mitHabit = bp.habits.find((h) => h.name.includes("MIT"));
    expect(mitHabit?.reminder_time).toBe("11:00");
  });

  it("paces habits according to energy capacity (recovery vs sprint)", () => {
    const recoveryAnswers: UserAnswers = {
      role: "balanced",
      obstacle: "work_life_balance",
      domains: ["health", "mind"],
      chronotype: "morning",
      energyCapacity: "recovery",
    };
    const recoveryBp = generateDeterministicBlueprint(recoveryAnswers);
    // In recovery mode, health/growth 3rd habit is skipped to prevent cognitive overload
    expect(recoveryBp.habits.length).toBeLessThanOrEqual(2);

    const sprintAnswers: UserAnswers = {
      role: "corporate",
      obstacle: "overwhelm",
      domains: ["career", "health"],
      chronotype: "morning",
      energyCapacity: "sprint",
    };
    const sprintBp = generateDeterministicBlueprint(sprintAnswers);
    expect(sprintBp.habits.length).toBeGreaterThanOrEqual(3);
  });

  it("injects revitalization goals when a domain rating in Wheel of Life is critically low (<= 4)", () => {
    const answers: UserAnswers = {
      role: "creator",
      obstacle: "consistency",
      domains: ["health", "career"],
      chronotype: "flexible",
      wheelRatings: {
        health: 2, // very low satisfaction
        career: 8,
        mind: 6,
        growth: 7,
        finance: 6,
        relationships: 7,
      },
    };

    const bp = generateDeterministicBlueprint(answers);
    const healthGoal = bp.goals.find((g) => g.title.includes("احیای سوخت"));
    expect(healthGoal).toBeDefined();
    expect(healthGoal?.priority).toBe("urgent");

    const rescueTask = bp.tasks.find((t) => t.title.includes("حرکت اضطراری برای احیای حوزه"));
    expect(rescueTask).toBeDefined();
  });
});
