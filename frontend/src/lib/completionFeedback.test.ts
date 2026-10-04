import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getCompletionFeedbackSettings,
  setCompletionFeedbackSettings,
  playCompletionFeedback,
  previewCompletionSound,
  COMPLETION_SOUND_OPTIONS,
  type CompletionSoundId,
} from "./completionFeedback";
import * as hapticsModule from "./haptics";

vi.mock("./haptics", () => ({
  haptic: vi.fn(),
}));

describe("completionFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    setCompletionFeedbackSettings({
      soundEnabled: true,
      soundId: "pop",
      hapticEnabled: true,
      hapticKind: "selection",
    });
  });

  it("retrieves default settings when nothing is stored", () => {
    const s = getCompletionFeedbackSettings();
    expect(s.soundEnabled).toBe(true);
    expect(s.soundId).toBe("pop");
    expect(s.hapticEnabled).toBe(true);
    expect(s.hapticKind).toBe("selection");
  });

  it("updates settings and persists to localStorage", () => {
    setCompletionFeedbackSettings({
      soundEnabled: false,
      soundId: "ding",
      hapticKind: "medium",
    });

    const s = getCompletionFeedbackSettings();
    expect(s.soundEnabled).toBe(false);
    expect(s.soundId).toBe("ding");
    expect(s.hapticKind).toBe("medium");
    expect(s.hapticEnabled).toBe(true);
  });

  it("triggers haptic when hapticEnabled is true", () => {
    setCompletionFeedbackSettings({ hapticEnabled: true, hapticKind: "light" });
    playCompletionFeedback();
    expect(hapticsModule.haptic).toHaveBeenCalledWith("light");
  });

  it("does not trigger haptic when hapticEnabled is false", () => {
    setCompletionFeedbackSettings({ hapticEnabled: false });
    playCompletionFeedback();
    expect(hapticsModule.haptic).not.toHaveBeenCalled();
  });

  it("can audition all sound options without throwing", () => {
    for (const opt of COMPLETION_SOUND_OPTIONS) {
      expect(() => previewCompletionSound(opt.id, false)).not.toThrow();
    }
  });
});
