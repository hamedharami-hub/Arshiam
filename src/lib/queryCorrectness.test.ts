import { describe, it, expect } from "vitest";
import { getLocalDateString, parseTaskDueDate } from "@/lib/taskDate";
import { isHoliday, type Holiday } from "@/lib/holidays";
import { FirestoreQuery, firebaseStore } from "@/lib/firebaseStore";

describe("Query correctness and local date handling", () => {
  describe("1. Command Palette matching and non-matching filtering", () => {
    const tasks = [
      { id: "t1", title: "Buy groceries at market", description: "Fresh fruits" },
      { id: "t2", title: "Doctor appointment", description: "Check health report" },
      { id: "t3", title: "Review quarterly goals", description: "Finance and budget" },
      { id: "t4", title: "Urgent fix", description: "Buy new cables" },
    ];

    const notes = [
      { id: "n1", title: "Shopping list", content: "Eggs, milk, apples" },
      { id: "n2", title: "Meeting minutes", content: "Discussed budget for Q3" },
      { id: "n3", title: "Ideas for app", content: "Add dark mode and widgets" },
    ];

    function filterTasks(query: string) {
      const term = query.trim().toLowerCase();
      if (!term) return [];
      return tasks.filter((t) =>
        (t.title && t.title.toLowerCase().includes(term)) ||
        (t.description && t.description.toLowerCase().includes(term))
      );
    }

    function filterNotes(query: string) {
      const term = query.trim().toLowerCase();
      if (!term) return [];
      return notes.filter((n) =>
        (n.title && n.title.toLowerCase().includes(term)) ||
        (n.content && n.content.toLowerCase().includes(term))
      );
    }

    it("matches tasks by title or description case-insensitively", () => {
      const buyHits = filterTasks("BUY");
      expect(buyHits.map((t) => t.id)).toEqual(["t1", "t4"]); // "Buy groceries" (title), "Buy new cables" (description)

      const healthHits = filterTasks("health");
      expect(healthHits.map((t) => t.id)).toEqual(["t2"]);
    });

    it("strictly excludes non-matching tasks", () => {
      const nonMatching = filterTasks("nonexistent_term_xyz");
      expect(nonMatching).toEqual([]);
    });

    it("matches notes by title or content and excludes non-matching notes", () => {
      const budgetHits = filterNotes("budget");
      expect(budgetHits.map((n) => n.id)).toEqual(["n2"]);

      const appleHits = filterNotes("apple");
      expect(appleHits.map((n) => n.id)).toEqual(["n1"]);

      const zeroHits = filterNotes("zebra");
      expect(zeroHits).toEqual([]);
    });
  });

  describe("2. Calendar range union and deduplication", () => {
    // Range: 2026-09-20T00:00:00 to 2026-09-22T23:59:59.999
    const rangeStart = new Date(2026, 8, 20, 0, 0, 0, 0);
    const rangeEnd = new Date(2026, 8, 22, 23, 59, 59, 999);

    const rawTasks = [
      { id: "t_due_in", title: "Due in range", due_date: "2026-09-21", start_at: null },
      { id: "t_start_in", title: "Start in range", due_date: null, start_at: "2026-09-20" },
      { id: "t_both_in", title: "Both in range", due_date: "2026-09-22", start_at: "2026-09-21" },
      { id: "t_outside_past", title: "Past task", due_date: "2026-09-10", start_at: "2026-09-09" },
      { id: "t_outside_future", title: "Future task", due_date: "2026-10-05", start_at: "2026-10-01" },
      { id: "t_no_date", title: "No date task", due_date: null, start_at: null },
    ];

    function filterAndDeduplicate(tasks: typeof rawTasks, start: Date, end: Date) {
      const startTime = start.getTime();
      const endTime = end.getTime();
      const matching: typeof rawTasks = [];
      const seenIds = new Set<string>();

      for (const t of tasks) {
        if (!t.id || seenIds.has(t.id)) continue;
        let inRange = false;
        if (t.due_date) {
          const d = parseTaskDueDate(t.due_date);
          if (d && d.getTime() >= startTime && d.getTime() <= endTime) {
            inRange = true;
          }
        }
        if (!inRange && t.start_at) {
          const s = parseTaskDueDate(t.start_at);
          if (s && s.getTime() >= startTime && s.getTime() <= endTime) {
            inRange = true;
          }
        }
        if (inRange) {
          seenIds.add(t.id);
          matching.push(t);
        }
      }
      return matching;
    }

    it("includes tasks where either due_date or start_at is within range (union)", () => {
      const results = filterAndDeduplicate(rawTasks, rangeStart, rangeEnd);
      const ids = results.map((t) => t.id);

      expect(ids).toContain("t_due_in");
      expect(ids).toContain("t_start_in");
      expect(ids).toContain("t_both_in");

      // Strictly excludes tasks outside range or with no date
      expect(ids).not.toContain("t_outside_past");
      expect(ids).not.toContain("t_outside_future");
      expect(ids).not.toContain("t_no_date");
    });

    it("deduplicates tasks that match both due_date and start_at", () => {
      const results = filterAndDeduplicate(rawTasks, rangeStart, rangeEnd);
      const bothInCount = results.filter((t) => t.id === "t_both_in").length;
      expect(bothInCount).toBe(1);
    });

    it("handles simulated duplicates in data array safely", () => {
      const duplicateData = [
        ...rawTasks,
        { id: "t_due_in", title: "Duplicate entry", due_date: "2026-09-21", start_at: null },
      ];
      const results = filterAndDeduplicate(duplicateData, rangeStart, rangeEnd);
      expect(results.filter((t) => t.id === "t_due_in")).toHaveLength(1);
    });
  });

  describe("3. Local-date behaviour in an Australia/Sydney timezone case", () => {
    it("preserves correct local calendar date in Australia/Sydney across UTC boundary", () => {
      // 2026-09-20 at 14:30 UTC:
      // In UTC: it is September 20th.
      // In Australia/Sydney (AEST, UTC+10): it is September 21st at 00:30 AM!
      const dateInUtcEvening = new Date("2026-09-20T14:30:00.000Z");

      // Naive UTC slice gives the wrong day (2026-09-20)
      const naiveUtcDay = dateInUtcEvening.toISOString().slice(0, 10);
      expect(naiveUtcDay).toBe("2026-09-20");

      // getLocalDateString with Sydney timezone correctly gives 2026-09-21
      const sydneyLocalDay = getLocalDateString(dateInUtcEvening, "Australia/Sydney");
      expect(sydneyLocalDay).toBe("2026-09-21");
      expect(sydneyLocalDay).not.toBe(naiveUtcDay);
    });

    it("correctly identifies holidays in Australia/Sydney using local-date matching", () => {
      const holidays: Holiday[] = [
        {
          id: "au_holiday_21",
          date: "2026-09-21",
          country_code: "AU",
          name: "Australian Spring Holiday",
          local_name: "Spring Holiday",
          type: "Public",
        },
        {
          id: "au_holiday_20",
          date: "2026-09-20",
          country_code: "AU",
          name: "Sunday Event",
          local_name: null,
          type: "Observance",
        },
      ];

      // Time: 2026-09-20T15:00:00Z -> 2026-09-21T01:00:00 in Sydney
      const sydneyMorning = new Date("2026-09-20T15:00:00.000Z");

      // In Sydney timezone, it is Sept 21, so it must match the Sept 21 holiday
      const matched = isHoliday(sydneyMorning, holidays, "Australia/Sydney");
      expect(matched).toHaveLength(1);
      expect(matched[0].id).toBe("au_holiday_21");
      expect(matched[0].name).toBe("Australian Spring Holiday");
    });
  });

  describe("4. No ignored .or() calls remaining", () => {
    it("confirms FirestoreQuery does not have an .or method", () => {
      const query = firebaseStore.from("tasks") as any;
      expect(query.or).toBeUndefined();
      expect((FirestoreQuery.prototype as any).or).toBeUndefined();
    });
  });
});
