import { describe, expect, it } from "vitest";
import { getTaskSwipeSettings, setTaskSwipeSettings, type TaskSwipeSettings } from "./taskSwipeSettings";

describe("account-scoped safe task gesture settings", () => {
  it("defaults left to completion and right to today", () => {
    expect(getTaskSwipeSettings("swipe-new")).toEqual({ left: "complete", right: "today" });
  });
  it("keeps another account's settings separate", () => {
    setTaskSwipeSettings("swipe-account-a", { left: "none", right: "tomorrow" });
    expect(getTaskSwipeSettings("swipe-account-a")).toEqual({ left: "none", right: "tomorrow" });
    expect(getTaskSwipeSettings("swipe-account-b")).toEqual({ left: "complete", right: "today" });
  });
  it("rejects deletion and malformed values from older/imported preferences", () => {
    setTaskSwipeSettings("swipe-invalid", { left: "delete", right: null } as unknown as TaskSwipeSettings);
    expect(getTaskSwipeSettings("swipe-invalid")).toEqual({ left: "complete", right: "today" });
  });
});
