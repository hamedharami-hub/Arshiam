import { describe, expect, it } from "vitest";
import { toSaveStatus } from "./saveFeedback";

describe("toSaveStatus", () => {
  it.each([["saved", "saved"], ["queued", "queued"], ["failed", "failed"]] as const)("preserves the explicit %s result", (input, expected) => {
    expect(toSaveStatus(input)).toBe(expected);
  });

  it("fails closed for boolean, void, and unknown results", () => {
    expect(toSaveStatus(true)).toBe("failed");
    expect(toSaveStatus(false)).toBe("failed");
    expect(toSaveStatus(undefined)).toBe("failed");
    expect(toSaveStatus(null)).toBe("failed");
    expect(toSaveStatus({})).toBe("failed");
  });
});
