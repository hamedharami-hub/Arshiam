import { act, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Index from "./Index";
import { loadSettings } from "@/lib/reminders";

let currentUser: { id: string } | null = null;
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: currentUser, loading: false }) }));
vi.mock("@/lib/reminders", () => ({ loadSettings: vi.fn() }));

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

beforeEach(() => {
  currentUser = null;
  vi.clearAllMocks();
  localStorage.clear();
});

describe("Index landing route", () => {
  it("ignores settings from the previous account while the next account loads", async () => {
    const first = deferred<{ default_landing: string }>();
    const second = deferred<{ default_landing: string }>();
    vi.mocked(loadSettings).mockReturnValueOnce(first.promise as ReturnType<typeof loadSettings>).mockReturnValueOnce(second.promise as ReturnType<typeof loadSettings>);
    currentUser = { id: "first" };
    const view = () => (
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/app/today" element={<p>Today page</p>} />
          <Route path="/app/inbox" element={<p>Inbox page</p>} />
        </Routes>
      </MemoryRouter>
    );
    const { rerender } = render(view());
    currentUser = { id: "second" };
    rerender(view());
    await act(async () => { first.resolve({ default_landing: "last" }); });
    expect(screen.queryByText("Inbox page")).not.toBeInTheDocument();
    expect(screen.queryByText("Today page")).not.toBeInTheDocument();

    await act(async () => { second.resolve({ default_landing: "today" }); });
    expect(screen.getByText("Today page")).toBeInTheDocument();
  });
});
