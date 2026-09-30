import { describe, expect, it } from "vitest";
import { isContactDate, validateContactDates } from "./contactDates";

describe("contact occasions", () => {
  it("accepts leap birthdays and multiple yearly or one-time occasions", () => {
    expect(isContactDate("2000-02-29")).toBe(true);
    expect(() => validateContactDates({ birthday: "2000-02-29", occasions: [
      { id: "anniversary", label: "Wedding", date: "2020-05-12", annual: true },
      { id: "graduation", label: "Graduation", date: "2026-09-30", annual: false },
    ] })).not.toThrow();
  });
  it("rejects rolled-over dates and incomplete occasions before saving", () => {
    expect(isContactDate("2025-02-29")).toBe(false);
    expect(isContactDate("2026-04-31")).toBe(false);
    expect(() => validateContactDates({ occasions: [{ id: "one", label: "", date: "2026-09-30", annual: true }] })).toThrow();
  });
  it("allows clearing a birthday and all occasions without breaking older contacts", () => {
    expect(() => validateContactDates({ birthday: "", occasions: [] })).not.toThrow();
    expect(() => validateContactDates({})).not.toThrow();
  });
});
