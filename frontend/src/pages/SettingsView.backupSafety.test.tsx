import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import SettingsView from "./SettingsView";

const state = vi.hoisted(() => ({
  user: { id: "owner-a", email: "a@example.test" } as { id: string; email: string } | null,
  cache: new Map<string, any>(),
  restore: vi.fn(),
  cacheSet: vi.fn(),
}));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: state.user }) }));
vi.mock("react-i18next", async (importOriginal) => ({
  ...await importOriginal<typeof import("react-i18next")>(),
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }),
}));
vi.mock("@/lib/reminders", () => ({ loadSettings: async () => null, saveSettings: vi.fn(), ensureNotificationPermission: vi.fn() }));
vi.mock("@/lib/firestoreSync", () => ({ fetchFromFirestore: async () => ({ success: false, tasks: [], notes: [] }) }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { from: () => ({ select: async () => ({ data: [] }) }) } }));
vi.mock("@/lib/backupRestoreService", () => ({ restoreBackupRows: state.restore }));
vi.mock("@/lib/offlineQueue", () => ({
  cacheGet: async (key: string) => state.cache.get(key),
  cacheSet: state.cacheSet,
  getQueue: async () => [], onQueueChange: () => () => {}, canReplayForOwner: () => false,
  clearUserLocalData: vi.fn(),
}));
vi.mock("@/components/FirebaseSyncCard", () => ({ default: () => null }));
vi.mock("@/components/FirestoreUsageCard", () => ({ FirestoreUsageCard: () => null }));

function view() {
  return <MemoryRouter initialEntries={["/app/settings?tab=data"]}><SettingsView /></MemoryRouter>;
}

function chooseFile(text: Promise<string> = Promise.resolve(JSON.stringify({ tasks: [{ id: "imported-task" }], notes: [{ id: "imported-note" }] }))) {
  let input: HTMLInputElement | undefined;
  const click = vi.spyOn(HTMLInputElement.prototype, "click").mockImplementation(function (this: HTMLInputElement) { input = this; });
  fireEvent.click(screen.getByRole("button", { name: "settings.importJson" }));
  expect(input).toBeDefined();
  fireEvent.change(input!, { target: { files: [{ name: "backup.json", text: () => text }] } });
  click.mockRestore();
}

beforeEach(() => {
  state.user = { id: "owner-a", email: "a@example.test" };
  state.cache.clear();
  state.cacheSet.mockReset();
  state.restore.mockReset().mockImplementation(async (ownerId, _table, rows) => ({
    saved: rows.map((row: any) => ({ ...row, user_id: ownerId })), queued: [], failedIds: [], skipped: 0,
  }));
  localStorage.clear();
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

function seedLegacy() {
  state.cache.set("tasks", [
    { id: "foreign-task", user_id: "owner-b" }, { id: "unknown-task" }, { id: "owned-task", user_id: "owner-a" },
  ]);
  localStorage.setItem("arshnaz_notes", JSON.stringify([
    { id: "foreign-note", user_id: "owner-b" }, { id: "unknown-note" }, { id: "owned-note", user_id: "owner-a" },
  ]));
  localStorage.setItem("notes", JSON.stringify([{ id: "other-owned-note", user_id: "owner-a" }]));
}

describe("SettingsView backup account safety", () => {
  it("exports only verifiably owned legacy rows from shared task and note caches", async () => {
    seedLegacy();
    let exported: any;
    vi.stubGlobal("Blob", class { constructor(parts: string[]) { exported = JSON.parse(parts[0]); } });
    vi.stubGlobal("URL", class extends URL {
      static createObjectURL = vi.fn(() => "blob:backup");
      static revokeObjectURL = vi.fn();
    });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(view());
    fireEvent.click(screen.getByRole("button", { name: "settings.exportJson" }));
    await waitFor(() => expect(exported).toBeDefined());
    expect(exported.tasks.map((row: any) => row.id)).toEqual(["owned-task"]);
    expect(exported.notes.map((row: any) => row.id)).toEqual(["other-owned-note", "owned-note"]);
  });

  it("does not seed account restore caches with foreign or ownerless global rows", async () => {
    seedLegacy();
    const originalNotes = localStorage.getItem("arshnaz_notes");
    render(view());
    chooseFile();
    await screen.findByRole("dialog", { name: "Review restore" });
    fireEvent.click(screen.getByRole("button", { name: "Restore tasks & notes" }));
    await waitFor(() => expect(state.cacheSet).toHaveBeenCalledTimes(2));
    const taskRows = state.cacheSet.mock.calls.find(([key]) => key === "tasks:all:owner-a")![1].tasks;
    const noteRows = state.cacheSet.mock.calls.find(([key]) => key === "notes:all:owner-a")![1];
    expect(taskRows.map((row: any) => row.id)).toEqual(["owned-task", "imported-task"]);
    expect(noteRows.map((row: any) => row.id)).toEqual(["other-owned-note", "owned-note", "imported-note"]);
    expect(localStorage.getItem("arshnaz_notes")).toBe(originalNotes);
    expect(state.cache.get("tasks")[0].id).toBe("foreign-task");
  });

  it("preserves safe scoped rows without ownership metadata and does not fall back from empty scoped caches", async () => {
    seedLegacy();
    state.cache.set("tasks:all:owner-a", { tasks: [{ id: "scoped-task" }, { id: "wrong-scoped-task", user_id: "owner-b" }] });
    state.cache.set("notes:all:owner-a", []);
    render(view());
    chooseFile();
    await screen.findByRole("dialog", { name: "Review restore" });
    fireEvent.click(screen.getByRole("button", { name: "Restore tasks & notes" }));
    await waitFor(() => expect(state.cacheSet).toHaveBeenCalledTimes(2));
    expect(state.cacheSet.mock.calls[0][1].tasks.map((row: any) => row.id)).toEqual(["scoped-task", "imported-task"]);
    expect(state.cacheSet.mock.calls[1][1].map((row: any) => row.id)).toEqual(["imported-note"]);
  });

  it.each([false, true])("discards deferred parsing after owner switch (away/back: %s)", async (switchBack) => {
    let resolve!: (text: string) => void;
    const text = new Promise<string>(done => { resolve = done; });
    const mounted = render(view());
    chooseFile(text);
    state.user = { id: "owner-b", email: "b@example.test" };
    mounted.rerender(view());
    if (switchBack) {
      state.user = { id: "owner-a", email: "a@example.test" };
      mounted.rerender(view());
    }
    await act(async () => { resolve(JSON.stringify({ tasks: [{ id: "stale-task" }] })); await text; });
    expect(screen.queryByRole("dialog", { name: "Review restore" })).not.toBeInTheDocument();
    expect(state.restore).not.toHaveBeenCalled();
  });

  it("invalidates an already reviewed import on switching away and back, including stale apply handlers", async () => {
    const mounted = render(view());
    chooseFile();
    await screen.findByRole("dialog", { name: "Review restore" });
    const oldApply = screen.getByRole("button", { name: "Restore tasks & notes" });
    state.user = { id: "owner-b", email: "b@example.test" };
    mounted.rerender(view());
    expect(screen.queryByRole("dialog", { name: "Review restore" })).not.toBeInTheDocument();
    state.user = { id: "owner-a", email: "a@example.test" };
    mounted.rerender(view());
    fireEvent.click(oldApply);
    expect(screen.queryByRole("dialog", { name: "Review restore" })).not.toBeInTheDocument();
    expect(state.restore).not.toHaveBeenCalled();
    // The new session still permits a newly selected and reviewed backup.
    chooseFile();
    await screen.findByRole("dialog", { name: "Review restore" });
    fireEvent.click(screen.getByRole("button", { name: "Restore tasks & notes" }));
    await waitFor(() => expect(state.restore).toHaveBeenCalledTimes(2));
    expect(state.restore.mock.calls.every(([ownerId]) => ownerId === "owner-a")).toBe(true);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Review restore" })).not.toBeInTheDocument());
  });

  it("stops restore continuations after a switch without writing shared or new-owner caches", async () => {
    let finish!: (result: any) => void;
    state.restore.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const mounted = render(view());
    chooseFile();
    await screen.findByRole("dialog", { name: "Review restore" });
    fireEvent.click(screen.getByRole("button", { name: "Restore tasks & notes" }));
    expect(state.restore).toHaveBeenCalledWith("owner-a", "tasks", [{ id: "imported-task" }]);
    state.user = { id: "owner-b", email: "b@example.test" };
    mounted.rerender(view());
    await act(async () => { finish({ saved: [{ id: "imported-task", user_id: "owner-a" }], queued: [], failedIds: [], skipped: 0 }); });
    expect(state.restore).toHaveBeenCalledTimes(1);
    expect(state.cacheSet).not.toHaveBeenCalled();
  });
});
