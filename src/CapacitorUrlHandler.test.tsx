import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, fireEvent, screen } from "@testing-library/react";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { CapacitorUrlHandler } from "./App";
import { App as CapApp } from "@capacitor/app";
import { auth } from "@/lib/firebase";

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
    getLaunchUrl: vi.fn(),
  },
}));

vi.mock("@/lib/firebase", () => ({
  auth: {
    authStateReady: vi.fn(),
    currentUser: { uid: "test-user" },
  },
}));

// Test harness component to observe current location and navigate via buttons
function TestApp() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div>
      <CapacitorUrlHandler />
      <span data-testid="current-path">{location.pathname + location.search}</span>
      <button onClick={() => navigate("/app/notes")}>Go to Notes</button>
      <button onClick={() => navigate("/app/calendar")}>Go to Calendar</button>
      <button onClick={() => navigate("/app/today")}>Go to Today</button>
    </div>
  );
}

describe("CapacitorUrlHandler widget navigation", () => {
  let appUrlOpenCallback: ((event: { url?: string }) => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).Capacitor = {
      isNativePlatform: () => true,
    };
    appUrlOpenCallback = null;

    (CapApp.addListener as any).mockImplementation((event: string, callback: any) => {
      if (event === "appUrlOpen") {
        appUrlOpenCallback = callback;
      }
      return Promise.resolve({ remove: vi.fn() });
    });

    (CapApp.getLaunchUrl as any).mockResolvedValue(null);
    (auth.authStateReady as any).mockResolvedValue(undefined);
    (auth as any).currentUser = { uid: "test-user" };
  });

  afterEach(() => {
    delete (window as any).__arshnazPendingUrl;
    delete (window as any).__arshnazDispatchUrl;
    delete (window as any).Capacitor;
  });

  it("does not revert to /app/today when user navigates to /app/notes while cold-start widget URL is in-flight", async () => {
    let resolveAuth: () => void = () => {};
    const deferredAuth = new Promise<void>((resolve) => {
      resolveAuth = resolve;
    });
    (auth.authStateReady as any).mockReturnValue(deferredAuth);

    (window as any).__arshnazPendingUrl = "arshnaz://today";

    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TestApp />
      </MemoryRouter>
    );

    expect(screen.getByTestId("current-path").textContent).toBe("/app/today");

    // User navigates manually to Notes while authStateReady is still pending
    await act(async () => {
      fireEvent.click(screen.getByText("Go to Notes"));
    });
    expect(screen.getByTestId("current-path").textContent).toBe("/app/notes");

    // Now authStateReady resolves for the earlier widget launch
    await act(async () => {
      resolveAuth();
      await deferredAuth;
    });

    // The route MUST NOT revert to /app/today
    expect(screen.getByTestId("current-path").textContent).toBe("/app/notes");
  });

  it("consumes initial cold-start launch URL only once and does not overwrite user navigation later", async () => {
    let resolveLaunchUrl: (val: any) => void = () => {};
    const launchPromise = new Promise((resolve) => {
      resolveLaunchUrl = resolve;
    });
    (CapApp.getLaunchUrl as any).mockReturnValue(launchPromise);

    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TestApp />
      </MemoryRouter>
    );

    // User navigates to Calendar
    await act(async () => {
      fireEvent.click(screen.getByText("Go to Calendar"));
    });
    expect(screen.getByTestId("current-path").textContent).toBe("/app/calendar");

    // Later, delayed launch URL resolves with arshnaz://today
    await act(async () => {
      resolveLaunchUrl({ url: "arshnaz://today" });
      await launchPromise;
    });

    // User remains on /app/calendar and is not yanked to Today
    expect(screen.getByTestId("current-path").textContent).toBe("/app/calendar");
  });

  it("navigates to /app/today when user taps widget header while currently on /app/notes (live warm widget tap)", async () => {
    render(
      <MemoryRouter initialEntries={["/app/notes"]}>
        <TestApp />
      </MemoryRouter>
    );

    expect(screen.getByTestId("current-path").textContent).toBe("/app/notes");

    // Live widget header tap dispatches arshnaz://today
    await act(async () => {
      (window as any).__arshnazDispatchUrl({ url: "arshnaz://today" });
    });

    expect(screen.getByTestId("current-path").textContent).toBe("/app/today");
  });

  it("navigates to the exact task route when user taps a task in the widget", async () => {
    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TestApp />
      </MemoryRouter>
    );

    await act(async () => {
      (window as any).__arshnazDispatchUrl({
        url: "arshnaz://task?taskId=task-999&owner=test-user&fromWidget=1",
      });
    });

    expect(screen.getByTestId("current-path").textContent).toBe("/app/tasks/task-999?fromWidget=1");
  });

  it("invalidates in-flight live widget deep links if user navigates manually before resolution", async () => {
    let resolveAuth: () => void = () => {};
    const deferredAuth = new Promise<void>((resolve) => {
      resolveAuth = resolve;
    });
    (auth.authStateReady as any).mockReturnValue(deferredAuth);

    render(
      <MemoryRouter initialEntries={["/app/today"]}>
        <TestApp />
      </MemoryRouter>
    );

    // Live deep link arrives for Mind view
    await act(async () => {
      (window as any).__arshnazDispatchUrl({ url: "arshnaz://mind" });
    });

    // User manually navigates to Calendar while link is resolving
    await act(async () => {
      fireEvent.click(screen.getByText("Go to Calendar"));
    });
    expect(screen.getByTestId("current-path").textContent).toBe("/app/calendar");

    // Auth resolves for the widget link
    await act(async () => {
      resolveAuth();
      await deferredAuth;
    });

    // Route remains Calendar and does not switch to Mind
    expect(screen.getByTestId("current-path").textContent).toBe("/app/calendar");
  });
});
