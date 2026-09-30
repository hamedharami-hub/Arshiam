import { describe, expect, it } from "vitest";
import {
  normalizeTriggerId,
  normalizeConsequenceId,
  getTriggerLabel,
  getConsequenceLabel,
} from "./ABCView";

describe("ABCView normalization and localization", () => {
  it("normalizes Persian trigger labels to canonical IDs", () => {
    expect(normalizeTriggerId("گیر کردن روی مسئله")).toBe("stuck");
    expect(normalizeTriggerId("دریافت پیام")).toBe("message");
    expect(normalizeTriggerId("خستگی فیزیکی")).toBe("fatigue");
    expect(normalizeTriggerId("unknown_trigger")).toBe("unknown_trigger");
  });

  it("normalizes English trigger labels to canonical IDs", () => {
    expect(normalizeTriggerId("Stuck on a problem")).toBe("stuck");
    expect(normalizeTriggerId("Incoming message")).toBe("message");
    expect(normalizeTriggerId("stuck")).toBe("stuck");
  });

  it("normalizes consequence labels properly", () => {
    expect(normalizeConsequenceId("باز کردن شبکه اجتماعی")).toBe("social_media");
    expect(normalizeConsequenceId("Opening social media")).toBe("social_media");
    expect(normalizeConsequenceId("social_media")).toBe("social_media");
  });

  it("translates labels correctly between Persian and English", () => {
    expect(getTriggerLabel("stuck", false)).toBe("گیر کردن روی مسئله");
    expect(getTriggerLabel("stuck", true)).toBe("Stuck on a problem");
    expect(getConsequenceLabel("social_media", false)).toBe("باز کردن شبکه اجتماعی");
    expect(getConsequenceLabel("social_media", true)).toBe("Opening social media");
  });
});
