import { describe, expect, it } from "vitest";
import { DEFAULT_FILTERS } from "./TaskFilterSheet";

describe("task completion visibility", () => {
  it("keeps completed tasks visible by default so they can be reopened", () => {
    expect(DEFAULT_FILTERS.show_completed).toBe(true);
  });
});
