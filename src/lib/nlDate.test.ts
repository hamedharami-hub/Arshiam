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
    const d = new Date(r.dueDate!);
    expect(d.getDate()).toBe(17);
    expect(r.cleanedTitle).toBe("جلسه");
  });

  it("parses امروز with default 9am", () => {
    const r = parse("امروز تماس");
    const d = new Date(r.dueDate!);
    expect(d.getDate()).toBe(15);
    expect(d.getHours()).toBe(9);
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
    const d = new Date(r.dueDate!);
    expect(d.getDate()).toBe(18);
  });

  it("parses next weekday (friday) as upcoming occurrence", () => {
    const r = parse("جمعه ورزش");
    const d = new Date(r.dueDate!);
    // From Wed 7/15, upcoming Friday is 7/17.
    expect(d.getDay()).toBe(5);
    expect(d.getDate()).toBe(17);
  });

  it("time-only in the past rolls to tomorrow", () => {
    const r = parse("ساعت ۸ صبح دارو");
    const d = new Date(r.dueDate!);
    // 8am already passed (now 10am) → tomorrow.
    expect(d.getDate()).toBe(16);
    expect(d.getHours()).toBe(8);
  });
});
