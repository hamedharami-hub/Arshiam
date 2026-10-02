import { describe, expect, it } from "vitest";
import { withTaskCacheMutationLock } from "./taskCache";

describe("withTaskCacheMutationLock", () => {
  it("serializes cache mutations for one user without blocking another user", async () => {
    const events: string[] = [];
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });

    const first = withTaskCacheMutationLock("user-a", async () => {
      events.push("first-start");
      await firstGate;
      events.push("first-end");
    });
    const second = withTaskCacheMutationLock("user-a", () => {
      events.push("second");
    });
    const independent = withTaskCacheMutationLock("user-b", () => {
      events.push("independent");
    });

    await independent;
    expect(events).toEqual(["first-start", "independent"]);
    releaseFirst();
    await Promise.all([first, second]);
    expect(events).toEqual(["first-start", "independent", "first-end", "second"]);
  });

  it("releases the user's queue when one mutation rejects", async () => {
    await expect(withTaskCacheMutationLock("user-c", async () => {
      throw new Error("cache write failed");
    })).rejects.toThrow("cache write failed");

    await expect(withTaskCacheMutationLock("user-c", () => "next mutation"))
      .resolves.toBe("next mutation");
  });
});
