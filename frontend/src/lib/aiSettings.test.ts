import { describe, expect, it } from "vitest";
import { OPERATIONS, OP_RECOMMENDED, type AIOperation } from "./aiSettings";

describe("AI settings coverage", () => {
  it("exposes every configured operation in Settings exactly once", () => {
    const configured = Object.keys(OP_RECOMMENDED).sort();
    const visible = OPERATIONS.map((operation) => operation.key).sort();
    expect(visible).toEqual(configured);
    expect(new Set(visible).size).toBe(visible.length);
    for (const operation of OPERATIONS) {
      expect(operation.labelEn.trim()).not.toBe("");
      expect(operation.labelFa.trim()).not.toBe("");
      expect(OP_RECOMMENDED[operation.key as AIOperation]).toBeDefined();
    }
  });
});
