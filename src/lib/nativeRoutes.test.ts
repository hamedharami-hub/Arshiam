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
    expect(nativeRoute("arshnaz://widgets")).toBe("/app/widgets");
    expect(nativeRoute("arshnaz://crisis")).toBe("/app/crisis");
    expect(nativeRoute("arshnaz://sos")).toBe("/app/crisis");
  });

  it("sequences Task A then Task B reliably without stale destination", () => {
    const routeA = nativeRoute("arshnaz://task?taskId=task-A&owner=user-1", "user-1");
    expect(routeA).toBe("/app/tasks/task-A");

    const routeB = nativeRoute("arshnaz://task?taskId=task-B&owner=user-1", "user-1");
    expect(routeB).toBe("/app/tasks/task-B");
    expect(routeB).not.toBe(routeA);
  });

  it("safely handles task IDs with quotes, slashes, and unicode characters", () => {
    const specialId = "task-\"quoted\"-'single'/with-slash & فارسی";
    const encodedUri = "arshnaz://task?taskId=" + encodeURIComponent(specialId) + "&owner=user-1";
    const resolved = nativeRoute(encodedUri, "user-1");
    expect(resolved).toBe("/app/tasks/" + encodeURIComponent(specialId));
  });

  it("strictly enforces owner validation to prevent cross-account task exposure", () => {
    // Foreign owner returns /app/today instead of leaking the task ID
    expect(nativeRoute("arshnaz://task?taskId=secret-123&owner=victim-user", "attacker-user")).toBe("/app/today");
    // Same owner resolves cleanly
    expect(nativeRoute("arshnaz://task?taskId=secret-123&owner=victim-user", "victim-user")).toBe("/app/tasks/secret-123");
    // No owner specified allows resolution for the current authenticated user
    expect(nativeRoute("arshnaz://task?taskId=secret-123", "any-user")).toBe("/app/tasks/secret-123");
  });

  it("simulates delayed WebView queueing for cold-start deep links", () => {
    const fakeWindow: any = {
      __arshnazPendingUrl: "arshnaz://task?taskId=task-cold-start&owner=u",
    };
    let navigated = "";
    const dispatch = (event: { url?: string } | null | undefined) => {
      if (event?.url) {
        navigated = nativeRoute(event.url, "u") || "";
      }
    };
    fakeWindow.__arshnazDispatchUrl = dispatch;
    if (typeof fakeWindow.__arshnazPendingUrl === "string") {
      const pending = fakeWindow.__arshnazPendingUrl;
      delete fakeWindow.__arshnazPendingUrl;
      fakeWindow.__arshnazDispatchUrl({ url: pending });
    }
    expect(navigated).toBe("/app/tasks/task-cold-start");
    expect(fakeWindow.__arshnazPendingUrl).toBeUndefined();
  });

  it("preserves fromWidget query param when arriving from Android widget", () => {
    expect(nativeRoute("arshnaz://task?taskId=task-w1&fromWidget=1&owner=u", "u")).toBe(
      "/app/tasks/task-w1?fromWidget=1"
    );
  });
});
