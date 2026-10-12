import { beforeEach, describe, expect, it, vi } from "vitest";
import { navigationInteractionBlocked, readLastRoute, rememberLastRoute, safeLastRoute } from "./appNavigation";

beforeEach(() => { localStorage.clear(); document.body.innerHTML = ""; vi.restoreAllMocks(); });
describe("durable account-owned last route", () => {
  it("preserves allowlisted context, not actions or payloads", () => {
    expect(safeLastRoute("/app/knowledge?docId=abc&folderId=xyz&new=1&text=secret#edit")).toBe("/app/knowledge?docId=abc&folderId=xyz");
    expect(safeLastRoute("/app/notes?folder=abc&new=1&select=note-1")).toBe("/app/notes?folder=abc&select=note-1");
    expect(safeLastRoute("/app/today?completeTaskId=abc")).toBe("/app/today");
  });
  it.each(["/app/new/task", "/app/tasks/123", "/app/recall?docId=1", "/app/share-target", "/app/self/test/test", "/app/mind/session/123", "/app/unknown", "//evil/app/today", "/app/../auth", "/app/notes\\evil"])("rejects %s", (raw) => {
    expect(safeLastRoute(raw)).toBeNull();
  });
  it("never attributes a legacy route or another owner's route to the current user", () => {
    localStorage.setItem("last_route", "/app/notes?select=private");
    expect(readLastRoute("second")).toBeNull();
    rememberLastRoute("first", "/app/notes?select=private");
    expect(readLastRoute("first")).toBe("/app/notes?select=private");
    expect(readLastRoute("second")).toBeNull();
    rememberLastRoute("first", "/app/new/task");
    expect(readLastRoute("first")).toBe("/app/notes?select=private");
  });
  it("survives unavailable storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readLastRoute("owner")).toBeNull();
    expect(() => rememberLastRoute("owner", "/app/today")).not.toThrow();
  });
});
describe("navigation interaction guard", () => {
  it("blocks an active editor, selection and open modal but not a closed dialog", () => {
    const input = document.createElement("input"); document.body.append(input); input.focus();
    expect(navigationInteractionBlocked()).toBe(true);
    input.blur(); input.remove();
    const dialog = document.createElement("div"); dialog.setAttribute("role", "dialog"); document.body.append(dialog);
    expect(navigationInteractionBlocked()).toBe(true);
    dialog.dataset.state = "closed";
    expect(navigationInteractionBlocked()).toBe(false);
    vi.spyOn(document, "getSelection").mockReturnValue({ toString: () => "selected" } as Selection);
    expect(navigationInteractionBlocked()).toBe(true);
  });
});
