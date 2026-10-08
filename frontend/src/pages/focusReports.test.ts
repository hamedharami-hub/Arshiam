import { describe, expect, it } from "vitest";
import {
  buildFocusHistoryPage,
  buildFocusMonthReport,
  focusHistoryStateForOwner,
  isCurrentFocusHistoryRequest,
  type FocusReportSession,
} from "./focusReports";

describe("focus month reports", () => {
  it("groups minutes by task and folder while preserving free and deleted tasks", () => {
    const sessions: FocusReportSession[] = [
      { id: "s1", task_id: "task-a", duration_minutes: 25, ended_at: "2026-10-01T08:00:00.000Z" },
      { id: "s2", task_id: "task-a", duration_minutes: 10, ended_at: "2026-10-02T08:00:00.000Z" },
      { id: "s3", task_id: "task-b", duration_minutes: 15, ended_at: "2026-10-03T08:00:00.000Z" },
      { id: "s4", task_id: null, duration_minutes: 5, ended_at: "2026-10-04T08:00:00.000Z" },
      { id: "s5", task_id: "deleted", duration_minutes: 5, ended_at: "2026-10-05T08:00:00.000Z" },
    ];
    const report = buildFocusMonthReport(
      sessions,
      [
        { id: "task-a", title: "Task A", folder_id: "folder-a" },
        { id: "task-b", title: "Task B", folder_id: "folder-b" },
      ],
      [{ id: "folder-a", name: "Folder A" }, { id: "folder-b", name: "Folder B" }],
      { deletedTask: "Deleted task", noTask: "No task", deletedFolder: "Deleted folder", noFolder: "No folder", unknownTaskFolder: "Unknown folder" },
    );

    expect(report.minutes).toBe(60);
    expect(report.sessions).toBe(5);
    expect(Object.fromEntries(report.byTask.map((item) => [item.id, item.minutes]))).toEqual({
      "task-a": 35,
      "task-b": 15,
      "__free__": 5,
      deleted: 5,
    });
    expect(Object.fromEntries(report.byFolder.map((item) => [item.id, item.minutes]))).toEqual({
      "folder-a": 35,
      "folder-b": 15,
      "__unfiled__": 5,
      "__unknown_task_folder__": 5,
    });
  });
});

describe("focus history timestamp pagination", () => {
  it("uses ended_at and document id together so timestamp ties page without gaps", () => {
    const sharedTimestamp = "2026-10-07T10:00:00.000Z";
    const rows: FocusReportSession[] = [
      ...Array.from({ length: 58 }, (_, index) => ({
        id: `session-${String(index + 1).padStart(3, "0")}`,
        task_id: null,
        duration_minutes: 1,
        ended_at: sharedTimestamp,
      })),
      ...Array.from({ length: 4 }, (_, index) => ({
        id: `older-${index}`,
        task_id: null,
        duration_minutes: 1,
        ended_at: `2026-10-06T0${index + 1}:00:00.000Z`,
      })),
    ];

    // Firestore query order: ended_at DESC, document id DESC, then startAfter both values.
    const ordered = [...rows].sort((a, b) =>
      (b.ended_at || "").localeCompare(a.ended_at || "") || (b.id || "").localeCompare(a.id || ""),
    );
    let candidates = ordered.slice(0, 26);
    let page = buildFocusHistoryPage(candidates, 25);
    const seen = [...page.rows.map((row) => row.id)];

    while (page.hasMore && page.cursor) {
      candidates = ordered.filter((row) =>
        (row.ended_at || "") < page.cursor!.endedAt ||
        (row.ended_at === page.cursor!.endedAt && (row.id || "") < page.cursor!.id),
      ).slice(0, 26);
      page = buildFocusHistoryPage(candidates, 25);
      seen.push(...page.rows.map((row) => row.id));
    }

    expect(seen).toHaveLength(rows.length);
    expect(new Set(seen).size).toBe(rows.length);
    expect(seen).toEqual(ordered.map((row) => row.id));
  });

  it("rejects pages from another account or an older reload", () => {
    const accountARequest = { ownerId: "account-a", generation: 4 };
    expect(isCurrentFocusHistoryRequest(accountARequest, "account-b", 4)).toBe(false);
    expect(isCurrentFocusHistoryRequest(accountARequest, "account-a", 5)).toBe(false);
    expect(isCurrentFocusHistoryRequest({ ownerId: "account-b", generation: 5 }, "account-b", 5)).toBe(true);
  });

  it("does not expose history rows while the signed-in owner changes", () => {
    const accountAState = { ownerId: "account-a", rows: [{ id: "private-a-row" }] };
    expect(focusHistoryStateForOwner(accountAState, "account-b")).toBeNull();
    expect(focusHistoryStateForOwner(accountAState, "account-a")?.rows).toEqual([{ id: "private-a-row" }]);
  });
});
