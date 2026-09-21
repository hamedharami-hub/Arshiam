import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import AndroidBackButton from "./AndroidBackButton";
import { App as CapApp } from "@capacitor/app";
import { toast } from "sonner";

const mockNavigate = vi.fn();
let mockLocation = { pathname: "/app/today", search: "" };

vi.mock("react-router-dom", () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate,
}));

vi.mock("@/components/ui/sidebar", () => ({
  useSidebar: () => ({ openMobile: false, setOpenMobile: vi.fn() }),
}));

vi.mock("@capacitor/app", () => ({
  App: {
    addListener: vi.fn(),
    exitApp: vi.fn(),
  },
}));

vi.mock("sonner", () => ({
  toast: vi.fn(),
}));

describe("AndroidBackButton", () => {
  let backListener: (() => void) | null = null;

  beforeEach(() => {
    vi.clearAllMocks();
    (CapApp.addListener as any).mockImplementation((event: string, callback: () => void) => {
      if (event === "backButton") {
        backListener = callback;
      }
      return Promise.resolve({ remove: vi.fn() });
    });
  });

  it("navigates to /app/today with replace when on a standalone task route /app/tasks/:id", () => {
    mockLocation = { pathname: "/app/tasks/task-123", search: "" };
    render(<AndroidBackButton />);

    expect(backListener).toBeDefined();
    backListener?.();

    expect(mockNavigate).toHaveBeenCalledWith("/app/today", { replace: true });
  });

  it("navigates to parent task when from query parameter is present", () => {
    mockLocation = { pathname: "/app/tasks/subtask-456", search: "?from=parent-123" };
    render(<AndroidBackButton />);

    backListener?.();

    expect(mockNavigate).toHaveBeenCalledWith("/app/tasks/parent-123", { replace: true });
  });

  it("prompts to exit on first back press on /app/today and exits on second press within 2000ms", () => {
    mockLocation = { pathname: "/app/today", search: "" };
    render(<AndroidBackButton />);

    backListener?.();
    expect(toast).toHaveBeenCalledWith("برای خروج یک‌بار دیگر برگشت را بزن", { duration: 1800 });
    expect(CapApp.exitApp).not.toHaveBeenCalled();

    // Second press immediately after
    backListener?.();
    expect(CapApp.exitApp).toHaveBeenCalled();
  });

  it("prompts to exit on first back press and exits on second back press when fromWidget=1 on task route", () => {
    mockLocation = { pathname: "/app/tasks/task-123", search: "?fromWidget=1" };
    render(<AndroidBackButton />);

    backListener?.();
    expect(toast).toHaveBeenCalledWith("برای خروج یک‌بار دیگر برگشت را بزن", { duration: 1800 });
    expect(CapApp.exitApp).not.toHaveBeenCalled();

    // Second press immediately after
    backListener?.();
    expect(CapApp.exitApp).toHaveBeenCalled();
  });

  it("navigates to parent task preserving fromWidget when from query parameter is present", () => {
    mockLocation = { pathname: "/app/tasks/subtask-456", search: "?from=parent-123&fromWidget=1" };
    render(<AndroidBackButton />);

    backListener?.();
    expect(mockNavigate).toHaveBeenCalledWith("/app/tasks/parent-123?fromWidget=1", { replace: true });
  });

  it("navigates to /app/today when on another route with no prior history", () => {
    mockLocation = { pathname: "/app/calendar", search: "" };
    // window.history.state has no idx > 0
    window.history.replaceState({ idx: 0 }, "");
    render(<AndroidBackButton />);

    backListener?.();
    expect(mockNavigate).toHaveBeenCalledWith("/app/today", { replace: true });
  });
});
