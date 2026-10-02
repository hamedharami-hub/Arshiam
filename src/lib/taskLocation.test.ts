import { describe, expect, it } from "vitest";
import { TaskLocationError, taskLocationErrorMessage } from "./taskLocation";

describe("task location errors", () => {
  it("explains permission, support, unavailable and timeout failures", () => {
    for (const code of ["permission_denied", "unsupported", "unavailable", "timeout"] as const) {
      expect(taskLocationErrorMessage(new TaskLocationError(code), true)).not.toBe("Location lookup failed.");
      expect(taskLocationErrorMessage(new TaskLocationError(code), false).length).toBeGreaterThan(10);
    }
  });
});
