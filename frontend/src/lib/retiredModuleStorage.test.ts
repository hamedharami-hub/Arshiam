import { beforeEach, describe, expect, it } from "vitest";
import { clearRetiredModuleStorage } from "./retiredModuleStorage";
beforeEach(() => localStorage.clear());
describe("retired module local storage", () => {
  it("removes only the active owner's dedicated data and preserves shared/ownerless records", () => {
    const removed = ["arshnaz:pharmacy:records:u", "arshnaz:fred-outbox:v2:u", "arsh_review_days_v1:u"];
    const kept = ["arshnaz:pharmacy:records:v", "arshnaz:fred-outbox:v2:v", "arshnaz:fred-outbox:v2:", "arsh_review_desired_retention_v1", "knowledge-last-study:u", "notes:u"];
    for (const key of [...removed, ...kept]) localStorage.setItem(key, "data");
    clearRetiredModuleStorage("u"); clearRetiredModuleStorage("u");
    for (const key of removed) expect(localStorage.getItem(key)).toBeNull();
    for (const key of kept) expect(localStorage.getItem(key)).toBe("data");
  });
  it("leaves guest and ownerless data for ownership inspection", () => {
    localStorage.setItem("arshnaz:pharmacy:records:guest", "data"); clearRetiredModuleStorage("guest"); clearRetiredModuleStorage("");
    expect(localStorage.getItem("arshnaz:pharmacy:records:guest")).toBe("data");
  });
});
