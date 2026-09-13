import { describe, expect, it } from "vitest";
import { canReplayForOwner, type QueuedOp } from "./offlineQueue";

describe("offline outbox ownership", () => {
  const item: Pick<QueuedOp, "ownerId"> = { ownerId: "account-a" };

  it("replays a change only for the account that created it", () => {
    expect(canReplayForOwner(item, "account-a")).toBe(true);
    expect(canReplayForOwner(item, "account-b")).toBe(false);
  });

  it("fails closed for a missing session or a legacy unowned change", () => {
    expect(canReplayForOwner(item, undefined)).toBe(false);
    expect(canReplayForOwner({}, "account-a")).toBe(false);
  });
});
