import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {} }));
vi.mock("@/lib/firestoreDataService", () => ({ persistTask: vi.fn() }));
vi.mock("@/lib/jalali", () => ({ formatDate: (d: string) => d.slice(0, 10) }));

import { mergeCommentsIntoDescription } from "./commentMigration";

describe("mergeCommentsIntoDescription", () => {
  const c = (text: string, created_at: string) => ({ text, created_at });

  it("dates a comment that was already appended without a date", () => {
    const out = mergeCommentsIntoDescription("Buy milk\n\ncall mom first", [c("call mom first", "2026-05-01T10:00:00Z")]);
    expect(out).toBe("Buy milk\n\n— 2026-05-01: call mom first");
  });

  it("appends a comment missing from the description", () => {
    expect(mergeCommentsIntoDescription("Body", [c("new note", "2026-05-02T10:00:00Z")])).toBe("Body\n\n— 2026-05-02: new note");
    expect(mergeCommentsIntoDescription(null, [c("only", "2026-05-02T10:00:00Z")])).toBe("— 2026-05-02: only");
  });

  it("is idempotent", () => {
    const once = mergeCommentsIntoDescription("Body", [c("x", "2026-05-02T10:00:00Z")]);
    expect(mergeCommentsIntoDescription(once, [c("x", "2026-05-02T10:00:00Z")])).toBe(once);
  });
});
