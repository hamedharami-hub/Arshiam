import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FocusRuntime from "./FocusRuntime";

const runtime = vi.hoisted(() => ({ tick: vi.fn(), flush: vi.fn() }));
vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
vi.mock("@/hooks/useFocusSession", () => ({ useFocusSession: () => ({ userId: "u", session: { id: "s", startedAt: 1, endAt: 999, mode: "work", remaining: 300, taskTitle: "Focus" }, prefs: {}, pending: 0 }) }));
vi.mock("@/lib/focusSession", () => ({ tickFocus: runtime.tick, flushFocusSessions: runtime.flush, toggleFocus: vi.fn(), finishFocus: vi.fn(), refreshFocusFromStorage: vi.fn() }));
vi.mock("@/lib/focusAudio", () => ({ playFocusAudio: vi.fn(), stopFocusAudio: vi.fn() }));
vi.mock("@/lib/focusNotifications", () => ({ focusBackgroundDisclosure: () => ({}), requestFocusNotificationPermission: vi.fn(), syncFocusNotification: vi.fn().mockResolvedValue(undefined) }));
afterEach(() => vi.clearAllMocks());
describe("global focus mini surface", () => {
  it("hides only for a rendered Today runtime and keeps lifecycle running", async () => {
    const view = render(<MemoryRouter initialEntries={["/app/today"]}><FocusRuntime /><div data-testid="today-next-action" data-focus-runtime="true">Inline timer</div></MemoryRouter>);
    await waitFor(() => expect(screen.queryByTestId("focus-mini-controller")).not.toBeInTheDocument());
    expect(runtime.tick).toHaveBeenCalled();
    act(() => window.dispatchEvent(new Event("online")));
    expect(runtime.flush).toHaveBeenCalled();
    view.rerender(<MemoryRouter initialEntries={["/app/today"]}><FocusRuntime /><div data-testid="today-next-action">Choose next task</div></MemoryRouter>);
    await waitFor(() => expect(screen.getByTestId("focus-mini-controller")).toBeInTheDocument());
  });
  it("keeps the global controller on Today while its inline runtime is absent", () => {
    render(<MemoryRouter initialEntries={["/app/today"]}><FocusRuntime /></MemoryRouter>);
    expect(screen.getByTestId("focus-mini-controller")).toBeInTheDocument();
  });
  it("does not hide for an unrelated runtime row on other routes", () => {
    render(<MemoryRouter initialEntries={["/app/notes"]}><FocusRuntime /><div data-testid="today-next-action" data-focus-runtime="true">Inline timer</div></MemoryRouter>);
    expect(screen.getByTestId("focus-mini-controller")).toBeInTheDocument();
  });
});
