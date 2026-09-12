import { describe, it, expect } from "vitest";
import { nativeRoute } from "./nativeRoutes";
describe("Android deep links", () => {
  it("opens today, tomorrow and a task without double-encoding", () => {
    expect(nativeRoute("arshnaz://tomorrow")).toBe("/app/tomorrow");
    expect(nativeRoute("arshnaz://task?taskId=A%26B&owner=u", "u")).toBe(
      "/app/tasks/A%26B",
    );
    expect(nativeRoute("arshnaz://complete-task?taskId=A%26B")).toBe(
      "/app/today?completeTaskId=A%26B",
    );
  });
  it("rejects foreign schemes and cross-account task links", () => {
    expect(nativeRoute("https://example.com/new-task")).toBeNull();
    expect(nativeRoute("arshnaz://task?taskId=secret&owner=A", "B")).toBe(
      "/app/today",
    );
    expect(nativeRoute("arshnaz://nottoday")).toBeNull();
  });
  it("allows the native mind and problem-solving widget routes", () => {
    expect(nativeRoute("arshnaz://mind")).toBe("/app/mind");
    expect(nativeRoute("arshnaz://socratic")).toBe("/app/socratic");
    expect(nativeRoute("arshnaz://life-architect")).toBe("/app/life-architect");
  });
});
