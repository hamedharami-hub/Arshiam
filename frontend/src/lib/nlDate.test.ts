import { describe, it, expect } from "vitest";
import { parseNaturalDate } from "./nlDate";

// Fixed reference: Wed 2026-07-15 10:00 local time.
const NOW = new Date(2026, 6, 15, 10, 0, 0, 0);

function parse(s: string) {
  return parseNaturalDate(s, NOW);
}

describe("parseNaturalDate", () => {
  it("returns null date when nothing recognised", () => {
    const r = parse("خرید نان");
    expect(r.dueDate).toBeNull();
    expect(r.cleanedTitle).toBe("خرید نان");
  });

  it("parses فردا with time and strips the words", () => {
    const r = parse("فردا ساعت ۵ خرید");
    expect(r.dueDate).not.toBeNull();
    const d = new Date(r.dueDate!);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(5);
    expect(r.cleanedTitle).toBe("خرید");
  });

  it("parses پس‌فردا", () => {
    const r = parse("پس‌فردا جلسه");
    expect(r.dueDate).toBe("2026-07-17");
    expect(r.cleanedTitle).toBe("جلسه");
  });

  it("keeps a day-only phrase date-only instead of inventing a 9am time", () => {
    const r = parse("امروز تماس");
    expect(r.dueDate).toBe("2026-07-15");
  });

  it("treats tonight as a day hint without inventing an 8pm time", () => {
    const r = parse("finish reading tonight");
    expect(r.dueDate).toBe("2026-07-15");
    expect(r.cleanedTitle).toBe("finish reading");
  });

  it("handles Persian afternoon meridiem", () => {
    const r = parse("فردا ساعت ۴ عصر دندانپزشک");
    const d = new Date(r.dueDate!);
    expect(d.getHours()).toBe(16);
    expect(r.cleanedTitle).toBe("دندانپزشک");
  });

  it("parses English tomorrow at 5pm", () => {
    const r = parse("call mom tomorrow at 5pm");
    const d = new Date(r.dueDate!);
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(17);
    expect(r.cleanedTitle.toLowerCase()).toContain("call mom");
  });

  it("parses 'in 3 days'", () => {
    const r = parse("submit report in 3 days");
    expect(r.dueDate).toBe("2026-07-18");
  });

  it("does not turn a broad next-week phrase into a guessed calendar day", () => {
    const r = parse("submit report next week");
    expect(r.dueDate).toBeNull();
    expect(r.cleanedTitle).toBe("submit report next week");
  });

  it("does not turn a repeating weekday into a one-off scheduled day", () => {
    expect(parse("Every Monday review the report")).toMatchObject({ dueDate: null, cleanedTitle: "Every Monday review the report" });
    expect(parse("هر دوشنبه گزارش را مرور کن")).toMatchObject({ dueDate: null, cleanedTitle: "هر دوشنبه گزارش را مرور کن" });
  });

  it("parses next weekday (friday) as upcoming occurrence", () => {
    const r = parse("جمعه ورزش");
    expect(r.dueDate).toBe("2026-07-17");
  });

  it("time-only in the past rolls to tomorrow", () => {
    const r = parse("ساعت ۸ صبح دارو");
    const d = new Date(r.dueDate!);
    // 8am already passed (now 10am) → tomorrow.
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(8);
  });
});
