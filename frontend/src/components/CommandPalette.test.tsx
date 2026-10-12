import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CommandPalette from "./CommandPalette";

const mocks = vi.hoisted(() => ({
  user: { id: "alice" } as { id: string } | null,
  navigate: vi.fn(),
  cacheGet: vi.fn(),
  T: (_fa: string, en: string) => en,
  requests: [] as { table: string; owner: string; resolve: (value: any) => void; reject: (error: Error) => void }[],
}));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: mocks.T, isEn: true }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => mocks.navigate }));
vi.mock("@/lib/offlineQueue", () => ({ cacheGet: mocks.cacheGet }));
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: (table: string) => ({
      select: () => ({
        eq: (_key: string, owner: string) => new Promise((resolve, reject) => {
          mocks.requests.push({ table, owner, resolve, reject });
        }),
      }),
    }),
  },
}));

// Deliberately use the real cmdk components/filter and real dialog, not UI stubs.
const originalScrollIntoView = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollIntoView");
beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  vi.stubGlobal("ResizeObserver", class { observe() {} unobserve() {} disconnect() {} });
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", { configurable: true, value: vi.fn() });
  mocks.user = { id: "alice" };
  mocks.requests = [];
  mocks.navigate.mockReset();
  mocks.cacheGet.mockReset().mockResolvedValue([]);
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  if (originalScrollIntoView) Object.defineProperty(HTMLElement.prototype, "scrollIntoView", originalScrollIntoView);
  else delete (HTMLElement.prototype as Partial<HTMLElement>).scrollIntoView;
});

async function openPalette() {
  await act(async () => { window.dispatchEvent(new Event("arshnaz:open-search")); });
}

async function search(query: string) {
  await act(async () => { fireEvent.change(screen.getByRole("combobox"), { target: { value: query } }); });
}

async function debounce() {
  await act(async () => { await vi.advanceTimersByTimeAsync(250); });
  return mocks.requests.splice(0);
}

async function resolveBatch(requests: typeof mocks.requests, rows: Record<string, any[]> = {}, error: Error | null = null) {
  await act(async () => {
    requests.forEach((request) => request.resolve({ data: rows[request.table] || [], error }));
  });
}

describe("CommandPalette search ownership and real cmdk filtering", () => {
  it("shows cached body-only task/note matches with matching snippets and working navigation", async () => {
    mocks.cacheGet.mockImplementation(async (key: string) => key === "tasks:all:alice"
      ? [{ id: "t1", title: "Trip checklist", description: `${"prefix ".repeat(30)}NEBULA telescope booking` }]
      : key === "notes:all:alice" ? [{ id: "n1", title: "Research log", content: "<p>Remember the nebula observation</p>" }] : []);
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    expect(screen.getByRole("option", { name: /Trip checklist/ })).toBeVisible();
    expect(screen.getByRole("option", { name: /Research log/ })).toBeVisible();
    expect(screen.getByText(/NEBULA telescope booking/)).toBeVisible();
    expect(screen.getByText("Remember the nebula observation")).toBeVisible();
    expect(screen.queryByText("No results found for your query.")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("option", { name: /Research log/ }));
    expect(mocks.navigate).toHaveBeenCalledWith("/app/notes?select=n1");
  });

  it("shows remote body-only matches through the real cmdk filter", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    const requests = await debounce();
    await resolveBatch(requests, {
      tasks: [{ id: "t1", title: "Trip checklist", description: "Book nebula observation" }],
      notes: [{ id: "n1", title: "Research log", content: "Remember the NEBULA telescope" }],
    });
    expect(screen.getByRole("option", { name: /Trip checklist/ })).toBeVisible();
    expect(screen.getByRole("option", { name: /Research log/ })).toBeVisible();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("ignores a delayed old query response after the newer response", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    const old = await debounce();
    await search("quasar");
    const current = await debounce();
    await resolveBatch(current, { tasks: [{ id: "new", title: "quasar current" }] });
    await resolveBatch(old, { tasks: [{ id: "old", title: "quasar stale", description: "nebula" }] });
    expect(screen.getByRole("option", { name: /quasar current/ })).toBeVisible();
    expect(screen.queryByText("quasar stale")).not.toBeInTheDocument();
  });

  it("clears old-account hits immediately and ignores its late response", async () => {
    mocks.cacheGet.mockImplementation(async (key: string) => key === "tasks:all:alice"
      ? [{ id: "a", title: "nebula Alice cached" }] : []);
    const view = render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    expect(screen.getByText("nebula Alice cached")).toBeVisible();
    const old = await debounce();
    mocks.user = { id: "bob" };
    await act(async () => { view.rerender(<CommandPalette />); });
    expect(screen.queryByText("nebula Alice cached")).not.toBeInTheDocument();
    const current = await debounce();
    expect(current.every((request) => request.owner === "bob")).toBe(true);
    await resolveBatch(current, { notes: [{ id: "b", title: "nebula Bob" }] });
    await resolveBatch(old, { notes: [{ id: "a", title: "nebula Alice remote" }] });
    expect(screen.getByRole("option", { name: /nebula Bob/ })).toBeVisible();
    expect(screen.queryByText("nebula Alice remote")).not.toBeInTheDocument();
  });

  it("invalidates requests on close even when reopening with the same owner/query", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    const old = await debounce();
    await act(async () => { fireEvent.keyDown(window, { key: "k", ctrlKey: true }); });
    await openPalette();
    const current = await debounce();
    await resolveBatch(current, { tasks: [{ id: "new", title: "nebula reopened" }] });
    await resolveBatch(old, { tasks: [{ id: "old", title: "nebula closed request" }] });
    expect(screen.getByRole("option", { name: /nebula reopened/ })).toBeVisible();
    expect(screen.queryByText("nebula closed request")).not.toBeInTheDocument();
  });

  it("ignores a delayed local cache read after sign-out", async () => {
    let resolveCache!: (rows: any[]) => void;
    mocks.cacheGet.mockImplementation((key: string) => key === "tasks:all:alice"
      ? new Promise((resolve) => { resolveCache = resolve; }) : Promise.resolve([]));
    const view = render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    const old = await debounce();
    mocks.user = null;
    await act(async () => { view.rerender(<CommandPalette />); });
    await act(async () => { resolveCache([{ id: "a", title: "nebula signed-out private cache" }]); });
    await resolveBatch(old, { tasks: [{ id: "a", title: "nebula signed-out remote" }] });
    expect(screen.queryByText(/nebula signed-out/)).not.toBeInTheDocument();
    expect(screen.getByText("No results found for your query.")).toBeVisible();
  });

  it("merges slow local reads before remote publication instead of overwriting remote hits", async () => {
    let resolveCache!: (rows: any[]) => void;
    mocks.cacheGet.mockImplementation((key: string) => key === "tasks:all:alice"
      ? new Promise((resolve) => { resolveCache = resolve; }) : Promise.resolve([]));
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    await resolveBatch(await debounce(), { tasks: [{ id: "remote", title: "nebula remote" }] });
    expect(screen.getByText("Searching…")).toBeVisible();
    await act(async () => { resolveCache([{ id: "cached", title: "nebula cached" }]); });
    expect(screen.getByRole("option", { name: /nebula remote/ })).toBeVisible();
    expect(screen.getByRole("option", { name: /nebula cached/ })).toBeVisible();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
  });

  it("cancels the remote debounce on close and never reuses another owner's legacy cache", async () => {
    mocks.cacheGet.mockImplementation(async (key: string) => key === "tasks"
      ? [{ id: "private", user_id: "bob", title: "nebula Bob legacy task" }] : []);
    localStorage.setItem("notes", JSON.stringify([{ id: "private", user_id: "bob", title: "nebula Bob legacy note" }]));
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    expect(screen.queryByText(/nebula Bob legacy/)).not.toBeInTheDocument();
    await act(async () => { fireEvent.keyDown(window, { key: "k", ctrlKey: true }); });
    expect(await debounce()).toHaveLength(0);
  });

  it("separates pending, completed empty, and returned errors while keeping cached hits", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    expect(screen.getByText("Searching…")).toBeVisible();
    expect(screen.queryByText("No results found for your query.")).not.toBeInTheDocument();
    await resolveBatch(await debounce());
    expect(screen.getByText("No results found for your query.")).toBeVisible();
    mocks.cacheGet.mockImplementation(async (key: string) => key === "notes:all:alice"
      ? [{ id: "n", title: "Quasar notes", content: "nebula2 cached" }] : []);
    await search("nebula2");
    await resolveBatch(await debounce(), {}, new Error("Offline"));
    expect(screen.getByText("Cloud search failed; cached results are still available.")).toBeVisible();
    expect(screen.getByRole("option", { name: /Quasar notes/ })).toBeVisible();
    expect(screen.queryByText("Searching…")).not.toBeInTheDocument();
    expect(screen.queryByText("No results found for your query.")).not.toBeInTheDocument();
  });

  it("ignores stale rejected requests and exposes a current network rejection", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("nebula");
    const old = await debounce();
    await search("quasar");
    const current = await debounce();
    await act(async () => { old.forEach((request) => request.reject(new Error("Old failure"))); });
    expect(screen.queryByText("Cloud search failed; cached results are still available.")).not.toBeInTheDocument();
    expect(screen.getByText("Searching…")).toBeVisible();
    await act(async () => { current.forEach((request) => request.reject(new Error("Network failure"))); });
    expect(screen.getByText("Cloud search failed; cached results are still available.")).toBeVisible();
  });

  it("preserves registry aliases and quick actions in the shared matching policy", async () => {
    render(<CommandPalette />);
    await openPalette();
    await search("code vault");
    expect(screen.getByRole("option", { name: "Tools Library" })).toBeVisible();
    await search("new task");
    expect(screen.getByRole("option", { name: /Create New Task/ })).toBeVisible();
    fireEvent.click(screen.getByRole("option", { name: /Create New Task/ }));
    expect(mocks.navigate).toHaveBeenCalledWith("/app/inbox");
    const listener = vi.fn();
    window.addEventListener("lov:open-quick-capture", listener);
    await act(async () => { await vi.advanceTimersByTimeAsync(100); });
    expect(listener).toHaveBeenCalledOnce();
    window.removeEventListener("lov:open-quick-capture", listener);
  });
});
