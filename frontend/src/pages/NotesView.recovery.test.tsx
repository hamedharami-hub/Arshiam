import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter, Link } from "react-router-dom";
import NotesView from "./NotesView";
import type { NoteLinkScope } from "@/lib/noteLinks";

const mocks = vi.hoisted(() => ({
  user: { id: "u" },
  note: { id: "n", user_id: "u", title: "Note", content: "Original", pinned: false, updated_at: "2026-01-01" },
  retain: vi.fn(), read: vi.fn(), save: vi.fn(), clear: vi.fn(),
  notes: [] as unknown[], preview: vi.fn(),
  recovery: vi.fn(),
  mobile: false,
  emit: (_notes: unknown[], _status?: "cache" | "synced") => {},
}));
vi.mock("@/lib/undoStack", () => ({ pushUndo: mocks.recovery }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("react-i18next", async (importOriginal) => ({ ...await importOriginal<typeof import("react-i18next")>(), useTranslation: () => ({ t: (key: string) => key, i18n: { language: "en" } }) }));
vi.mock("@/hooks/useShareAccess", () => ({ useShareAccess: () => ({ canEdit: true, isOwner: true }) }));
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => mocks.mobile }));
vi.mock("@/components/HeaderTitlePortal", () => ({ HeaderTitlePortal: () => null }));
vi.mock("@/components/HeaderActionsPortal", () => ({ HeaderActionsPortal: () => null }));
vi.mock("@/components/VoiceInputButton", () => ({ VoiceInputButton: () => null }));
vi.mock("@/components/NoteEditorTabs", () => ({ NoteEditorTabs: (props: { markdown: string; onChange: (md: string, html: string) => void; noteLinks?: NoteLinkScope }) => <>
  <textarea aria-label="Note body" value={props.markdown || ""} onChange={(event) => props.onChange(event.target.value, event.target.value)} />
  {props.noteLinks?.notes.some(note => note.id === "b") && <button onClick={() => props.noteLinks!.onOpen("b")}>Open linked target</button>}
</> }));
vi.mock("@/lib/firestoreDataService", () => ({
  subscribeNotes: (_uid: string, callback: (notes: unknown[], status?: "cache" | "synced") => void) => { mocks.emit = callback; callback(mocks.notes, "synced"); return () => {}; },
  upsertNote: mocks.save, deleteNote: vi.fn(),
}));
vi.mock("@/lib/firestoreLive", () => ({ liveRows: async () => mocks.notes }));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: async () => mocks.notes, cacheSet: vi.fn().mockResolvedValue(undefined), getPendingOps: async () => [] }));
vi.mock("@/lib/noteTaskLinkService", () => ({ getNoteTaskLinks: async () => [] }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: {
  from: () => ({ select: () => ({ order: async () => ({ data: [] }) }) }),
  channel: () => ({ on: () => ({ subscribe: () => ({}) }) }), removeChannel: vi.fn(),
} }));
vi.mock("@/lib/debouncedWrites", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/lib/debouncedWrites")>(),
  writeNoteDraft: mocks.retain, readNoteDraft: mocks.read, clearNoteDraft: mocks.clear,
}));
vi.mock("@/lib/notesList", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/notesList")>();
  return { ...original, noteListPreview: (content: string) => { mocks.preview(content); return original.noteListPreview(content); } };
});

beforeEach(() => {
  vi.clearAllMocks();
  mocks.user = { id: "u" };
  mocks.mobile = false;
  window.history.replaceState({ idx: 0 }, "", "/app/notes?select=n");
  mocks.read.mockResolvedValue(null); mocks.save.mockResolvedValue(false);
  mocks.clear.mockResolvedValue(undefined);
  mocks.notes = [mocks.note];
});
afterEach(() => vi.restoreAllMocks());
const mount = () => render(<BrowserRouter><Link to="/other">Leave notes</Link><NotesView /></BrowserRouter>);
describe("linked note navigation and accepted backlinks", () => {
  const target = { id: "b", user_id: "u", title: "Target", content: "Target text", pinned: false, updated_at: "2026-01-01" };
  it("preserves a device draft when following a link and returning with browser Back", async () => {
    mocks.retain.mockResolvedValue(true);
    mocks.notes = [mocks.note, target];
    mount();
    fireEvent.change(await screen.findByLabelText("Note body"), { target: { value: "My unsynced linked draft" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Open linked target"));
    await waitFor(() => expect(screen.getByLabelText("Note title")).toHaveValue("Target"));
    expect(window.location.search).toContain("select=b");
    await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 30)); });
    await waitFor(() => expect(screen.getByLabelText("Note body")).toHaveValue("My unsynced linked draft"));
  });
  it("does not follow a link when the only draft copy failed to persist", async () => {
    mocks.retain.mockResolvedValue(false); mocks.notes = [mocks.note, target];
    mount();
    fireEvent.change(await screen.findByLabelText("Note body"), { target: { value: "At risk" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Open linked target"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Draft not saved");
    expect(screen.getByLabelText("Note body")).toHaveValue("At risk");
    expect(window.location.search).toContain("select=n");
  });
  it("returns from a linked mobile drawer on the Escape dispatched by Android Back", async () => {
    mocks.mobile = true; mocks.notes = [mocks.note, target];
    mount();
    await screen.findByLabelText("Note body");
    expect(screen.getAllByLabelText("Note body")).toHaveLength(1);
    fireEvent.click(screen.getByText("Open linked target"));
    await waitFor(() => expect(screen.getByLabelText("Note title")).toHaveValue("Target"));
    await act(async () => { document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true })); await new Promise(resolve => setTimeout(resolve, 50)); });
    await waitFor(() => expect(screen.getByLabelText("Note title")).toHaveValue("Note"));
  });
  it("never replaces the active draft when another snapshot of the same URL arrives", async () => {
    mocks.retain.mockResolvedValue(true); mount();
    fireEvent.change(await screen.findByLabelText("Note body"), { target: { value: "Typing now" } });
    await act(async () => mocks.emit([{ ...mocks.note, content: "Remote copy" }], "synced"));
    expect(screen.getByLabelText("Note body")).toHaveValue("Typing now");
  });
  it("does not publish a rejected draft as a backlink", async () => {
    mocks.retain.mockResolvedValue(true); mocks.save.mockResolvedValue(false); mocks.notes = [mocks.note, target];
    mount();
    fireEvent.change(await screen.findByLabelText("Note body"), { target: { value: "[Target](/app/notes?select=b)" } });
    await waitFor(() => expect(mocks.save).toHaveBeenCalled(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Open linked target"));
    await waitFor(() => expect(screen.getByLabelText("Note title")).toHaveValue("Target"));
    await waitFor(() => expect(screen.getByTestId("note-backlinks")).toHaveTextContent("No backlinks yet"));
  });
  it("publishes accepted links, removes deleted sources and keeps private sources out", async () => {
    mocks.retain.mockResolvedValue(true); mocks.save.mockResolvedValue(true); mocks.notes = [mocks.note, target];
    mount();
    fireEvent.change(await screen.findByLabelText("Note body"), { target: { value: "[Target](/app/notes?select=b)" } });
    await waitFor(() => expect(mocks.save).toHaveBeenCalled(), { timeout: 5000 });
    fireEvent.click(screen.getByText("Open linked target"));
    await waitFor(() => expect(screen.getByLabelText("Note title")).toHaveValue("Target"));
    await waitFor(() => expect(screen.getByTestId("note-backlinks").querySelectorAll("button")).toHaveLength(1));
    await act(async () => mocks.emit([target, { ...mocks.note, id: "diary", kind: "diary", content: "[Target](/app/notes?select=b)" }], "synced"));
    await waitFor(() => expect(screen.getByTestId("note-backlinks")).toHaveTextContent("No backlinks yet"));
  });
  it("rejects direct URLs to private notes and accepts a late-loaded general destination", async () => {
    mocks.notes = [{ ...mocks.note, kind: "diary" }];
    const view = mount();
    expect(await screen.findByRole("alert")).toHaveTextContent("Note unavailable");
    expect(screen.queryByLabelText("Note body")).not.toBeInTheDocument();
    view.unmount();
    window.history.replaceState({}, "", "/app/notes?select=b");
    mocks.notes = [];
    mount();
    await screen.findByRole("alert");
    // A fresh navigation retries after the target becomes available.
    await act(async () => { mocks.emit([target], "synced"); window.history.pushState({}, "", "/app/notes?select=b"); window.dispatchEvent(new PopStateEvent("popstate")); });
    await waitFor(() => expect(screen.getByLabelText("Note body")).toHaveValue("Target text"));
  });
});
describe("Notes failed retention exit", () => {
  it("blocks SPA departure when device retention fails, not only browser reload", async () => {
    mocks.retain.mockResolvedValue(false);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    const body = await screen.findByLabelText("Note body");
    fireEvent.change(body, { target: { value: "At-risk text" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalled());
    fireEvent.click(screen.getByText("Leave notes"));
    expect(window.location.pathname).toBe("/app/notes");
    expect(confirm).toHaveBeenCalledOnce();
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(true);
  });
  it("does not prompt for verified durable text even while cloud saving is unavailable", async () => {
    mocks.retain.mockResolvedValue(true);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    const body = await screen.findByLabelText("Note body");
    fireEvent.change(body, { target: { value: "Retained text" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalled());
    // Let the retention acknowledgement reach the exit-time refs.
    await act(async () => { await Promise.resolve(); });
    fireEvent.click(screen.getByText("Leave notes"));
    expect(window.location.pathname).toBe("/other");
    expect(confirm).not.toHaveBeenCalled();
  });
  it("bounds the actual list, caches unchanged previews during edits, and keeps all notes searchable", async () => {
    mocks.retain.mockResolvedValue(true);
    mocks.notes = [mocks.note, ...Array.from({ length: 119 }, (_, index) => ({ ...mocks.note, id: `n${index + 1}`, title: `List note ${index + 1}`, content: `Content ${index + 1}` }))];
    mount();
    const body = await screen.findByLabelText("Note body", {}, { timeout: 15000 });
    expect(screen.getByText("List note 49")).toBeInTheDocument();
    expect(screen.queryByText("List note 50")).not.toBeInTheDocument();
    expect(screen.getByText(/Showing 50 of 120 notes/)).toBeInTheDocument();
    mocks.preview.mockClear();
    fireEvent.change(body, { target: { value: "Changed selected note" } });
    await act(async () => { await Promise.resolve(); });
    expect(mocks.preview).toHaveBeenCalledOnce();
    expect(mocks.preview).toHaveBeenCalledWith("Changed selected note");
    fireEvent.click(screen.getByRole("button", { name: "Load 50 more notes" }));
    expect(screen.getByText("List note 99")).toBeInTheDocument();
    expect(screen.queryByText("List note 100")).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Search notes..."), { target: { value: "List note 119" } });
    expect(screen.getByText("List note 119")).toBeInTheDocument();
  });
  it("retains title-only failure with the body and permits safe exit only after device acknowledgement", async () => {
    let retain!: (durable: boolean) => void;
    mocks.retain.mockImplementation(() => new Promise<boolean>(resolve => { retain = resolve; }));
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount();
    fireEvent.change(await screen.findByLabelText("Note title"), { target: { value: "Unsynced title" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalledWith(expect.objectContaining({ accountId: "u", noteId: "n", title: "Unsynced title", md: "Original" })));
    fireEvent.click(screen.getByText("Leave notes"));
    expect(confirm).toHaveBeenCalledOnce();
    await act(async () => retain(true));
    await waitFor(() => expect(screen.getByTestId("note-save-status")).toHaveAttribute("data-state", "device"));
    fireEvent.click(screen.getByText("Leave notes"));
    expect(window.location.pathname).toBe("/other");
    expect(confirm).toHaveBeenCalledOnce();
  });
  it("offers both reload copies and never autosaves the retained title/body over a newer remote version", async () => {
    mocks.read.mockResolvedValue({ accountId: "u", noteId: "n", title: "Device title", md: "Device body", html: "Device body", updatedAt: 1, base: { title: "Older remote", md: "Older body" } });
    mocks.retain.mockResolvedValue(true);
    mount();
    const recovery = await screen.findByTestId("note-draft-recovery");
    expect(recovery).toHaveTextContent("Device title");
    expect(recovery).toHaveTextContent("Device body");
    expect(recovery).toHaveTextContent("Original");
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Use device draft" }));
    expect(screen.getByLabelText("Note title")).toHaveValue("Device title");
    expect(screen.getByLabelText("Note body")).toHaveValue("Device body");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 1300)); });
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Save recovered draft" }));
    await waitFor(() => expect(mocks.save).toHaveBeenCalledWith("u", expect.objectContaining({ title: "Device title", content: "Device body" })), { timeout: 3000 });
    expect(mocks.clear).not.toHaveBeenCalled(); // failure keeps the device copy
  });
  it("keeps the remote selection without consuming the stored draft", async () => {
    mocks.read.mockResolvedValue({ accountId: "u", noteId: "n", title: "Retained", md: "Retained body", html: "Retained body", updatedAt: 1 });
    mount(); await screen.findByTestId("note-draft-recovery");
    fireEvent.click(screen.getByRole("button", { name: "Keep current version and retain draft" }));
    expect(screen.getByLabelText("Note title")).toHaveValue("Note");
    expect(screen.getByLabelText("Note body")).toHaveValue("Original");
    expect(mocks.save).not.toHaveBeenCalled(); expect(mocks.clear).not.toHaveBeenCalled();
  });
  it("limits replacement Undo to the same unedited note and preserves explicit cloud save", async () => {
    mocks.read.mockResolvedValue({ accountId: "u", noteId: "n", title: "Recovered title", md: "Recovered body", html: "Recovered body", updatedAt: 1 });
    mocks.retain.mockResolvedValue(true);
    mount(); await screen.findByTestId("note-draft-recovery");
    fireEvent.click(screen.getByRole("button", { name: "Use device draft" }));
    const entry = mocks.recovery.mock.calls[0][0];
    expect(entry.importance).toBe("replace");
    await act(async () => { entry.undo(); await Promise.resolve(); });
    expect(screen.getByLabelText("Note title")).toHaveValue("Note");
    expect(screen.getByLabelText("Note body")).toHaveValue("Original");
    expect(screen.getByRole("button", { name: "Save recovered draft" })).toBeInTheDocument();
    expect(mocks.save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Newer text" } });
    expect(() => entry.undo()).toThrow(/newer edits/);
    expect(screen.getByLabelText("Note body")).toHaveValue("Newer text");
    await act(async () => { await Promise.resolve(); });
  });
  it("guards title and body when retention fails and ignores stale retention acknowledgements", async () => {
    let acknowledgeOld!: (durable: boolean) => void;
    mocks.retain.mockImplementationOnce(() => new Promise<boolean>(resolve => { acknowledgeOld = resolve; })).mockResolvedValue(false);
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    mount(); const title = await screen.findByLabelText("Note title");
    fireEvent.change(title, { target: { value: "First title" } });
    await waitFor(() => expect(mocks.retain).toHaveBeenCalledOnce());
    fireEvent.change(title, { target: { value: "Newest title" } });
    fireEvent.change(screen.getByLabelText("Note body"), { target: { value: "Newest body" } });
    await act(async () => acknowledgeOld(true));
    await waitFor(() => expect(mocks.retain).toHaveBeenLastCalledWith(expect.objectContaining({ title: "Newest title", md: "Newest body" })));
    expect(screen.getByTestId("note-save-status")).toHaveAttribute("data-state", "failed");
    expect(screen.getByTestId("note-save-status")).toHaveTextContent("not yet saved on this device");
    fireEvent.click(screen.getByText("Leave notes")); expect(confirm).toHaveBeenCalledOnce();
    const unload = new Event("beforeunload", { cancelable: true }); act(() => window.dispatchEvent(unload));
    expect(unload.defaultPrevented).toBe(true);
  });
  it("ignores a late recovery read after typing or changing accounts", async () => {
    let recover!: (record: unknown) => void;
    mocks.read.mockImplementationOnce(() => new Promise(resolve => { recover = resolve; })).mockResolvedValue(null);
    mocks.retain.mockResolvedValue(true);
    const view = mount();
    fireEvent.change(await screen.findByLabelText("Note title"), { target: { value: "New typing" } });
    await act(async () => recover({ accountId: "u", noteId: "n", title: "Old title", md: "Old body", html: "Old body", updatedAt: 1 }));
    expect(screen.queryByTestId("note-draft-recovery")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Note title")).toHaveValue("New typing");
    mocks.user = { id: "other" }; mocks.notes = [{ ...mocks.note, user_id: "other", title: "Other owner's note" }];
    view.rerender(<BrowserRouter><Link to="/other">Leave notes</Link><NotesView /></BrowserRouter>);
    await waitFor(() => expect(screen.queryByLabelText("Note title")).not.toBeInTheDocument());
    expect(mocks.save).not.toHaveBeenCalledWith("other", expect.objectContaining({ title: "New typing" }));
  });
});
