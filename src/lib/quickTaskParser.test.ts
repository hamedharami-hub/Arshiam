import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/jalali", () => ({ getCalendarSystem: () => "gregorian" }));

import { parseQuickTask, parseQuickTaskLines } from "./quickTaskParser";
import type { TimeSettings } from "./timeHorizon";

const S: TimeSettings = { calendar: "gregorian", weekStart: "sat", seasonsEnabled: true };
const now = new Date(2026, 5, 10, 10, 0); // Wed 10 Jun 2026, 10:00

describe("parseQuickTask", () => {
  it("parses the Persian example from the plan", () => {
    const r = parseQuickTask("کار هفته بعد !بالا #تگ /فولدر", S, now);
    expect(r.title).toBe("کار");
    expect(r.priority).toBe("high");
    expect(r.tags).toEqual(["تگ"]);
    expect(r.folder).toBe("فولدر");
    expect(r.time).toMatchObject({ horizon: "week", period_start: "2026-06-13", period_end: "2026-06-19", is_exact: false });
  });

  it("parses English with exact time", () => {
    const r = parseQuickTask("Call Sam tomorrow at 5pm !urgent #work", S, now);
    expect(r.title).toBe("Call Sam");
    expect(r.priority).toBe("urgent");
    const due = new Date(r.time!.due_at!);
    expect(r.time).toMatchObject({ horizon: "day", period_start: "2026-06-11", is_exact: true });
    expect(due.getHours()).toBe(17);
  });

  it("understands Persian digits and ساعت", () => {
    const r = parseQuickTask("جلسه فردا ساعت ۹:۳۰", S, now);
    expect(r.title).toBe("جلسه");
    const due = new Date(r.time!.due_at!);
    expect([due.getDate(), due.getHours(), due.getMinutes()]).toEqual([11, 9, 30]);
  });

  it("maps month / season / year phrases", () => {
    expect(parseQuickTask("گزارش این ماه", S, now).time).toMatchObject({ horizon: "month", period_start: "2026-06-01" });
    expect(parseQuickTask("budget next quarter", S, now).time).toMatchObject({ horizon: "quarter", period_start: "2026-07-01" });
    expect(parseQuickTask("سفر امسال", S, now).time).toMatchObject({ horizon: "year", period_start: "2026-01-01" });
    expect(parseQuickTask("سفر سال بعد", S, now).time).toMatchObject({ horizon: "year", period_start: "2027-01-01" });
  });

  it("weekday names go to the next occurrence", () => {
    expect(parseQuickTask("gym friday", S, now).time).toMatchObject({ horizon: "day", period_start: "2026-06-12" });
    expect(parseQuickTask("خرید شنبه", S, now).time).toMatchObject({ period_start: "2026-06-13" });
  });

  it("leaves plain text and slash-dates alone", () => {
    const r = parseQuickTask("read 1405/03/10 notes", S, now);
    expect(r.title).toBe("read 1405/03/10 notes");
    expect(r.time).toBeNull();
    expect(r.folder).toBeNull();
    expect(parseQuickTask("hello !unknown", S, now).title).toBe("hello !unknown");
  });

  it("splits multi-line input into separate tasks", () => {
    const list = parseQuickTaskLines("- milk today\n\n2) bread #shop\n  eggs  ", S, now);
    expect(list.map((x) => x.title)).toEqual(["milk", "bread", "eggs"]);
    expect(list[1].tags).toEqual(["shop"]);
  });
});
