import { describe, expect, it } from "vitest";
import { safeInternalPath } from "@/lib/safeNavigation";

describe("safeInternalPath", () => {
  it("keeps valid internal routes", () => {
    expect(safeInternalPath("/app/today?focus=1#task")).toBe("/app/today?focus=1#task");
  });

  it.each([
    "https://evil.example/path",
    "//evil.example/path",
    "/\\evil.example/path",
    "\\evil.example/path",
  ])("rejects an unsafe redirect: %s", (path) => {
    expect(safeInternalPath(path)).toBe("/app/today");
  });
});
