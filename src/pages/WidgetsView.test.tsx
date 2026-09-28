import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";
import WidgetsView from "./WidgetsView";

// Mock dependencies
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { uid: "test-uid-123" } }),
}));

vi.mock("@/features/tasks/taskService", () => ({
  fetchTasks: vi.fn().mockResolvedValue([
    { id: "t1", title: "تسک آزمایشی اول", completed: false, status: "todo", priority: "high", due_date: new Date().toISOString().split("T")[0] },
    { id: "t2", title: "تسک آزمایشی دوم", completed: true, status: "done", priority: "low", due_date: new Date().toISOString().split("T")[0] },
  ]),
  saveTask: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/androidWidget", () => ({
  refreshAndroidWidgets: vi.fn().mockResolvedValue({ agendaWidgets: 1, dashboardWidgets: 1 }),
  getWidgetDiagnostics: () => ({
    isNative: false,
    platform: "web",
    readyUid: "test-uid-123",
    hasSession: true,
    lastSyncTimestamp: Date.now(),
    cachedCount: 2,
  }),
}));

vi.mock("@/lib/nativeExperience", () => ({
  isAndroid: () => true,
}));

vi.mock("@/lib/haptics", () => ({
  haptic: vi.fn(),
}));

import i18n, { LANGUAGE_STORAGE_KEY } from "@/i18n";

describe("WidgetsView Studio", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.setItem(LANGUAGE_STORAGE_KEY, "fa");
    await i18n.changeLanguage("fa");
  });

  it("renders the Widgets Studio title and header", async () => {
    render(
      <MemoryRouter>
        <WidgetsView />
      </MemoryRouter>
    );

    expect(screen.getByText("استودیوی ویجت‌ها و نمای تعاملی")).toBeInTheDocument();
    expect(screen.getByText("ARSHNAZ WIDGET STUDIO")).toBeInTheDocument();
    expect(screen.getByText("همگام‌سازی فوری ویجت‌ها")).toBeInTheDocument();
  });

  it("renders all widget selector options", async () => {
    render(
      <MemoryRouter>
        <WidgetsView />
      </MemoryRouter>
    );

    expect(screen.getByText("Agenda (دستور کار روز)")).toBeInTheDocument();
    expect(screen.getByText("Compact (تک تسک متمرکز)")).toBeInTheDocument();
    expect(screen.getByText("Focus Timer (تایمر تمرکز)")).toBeInTheDocument();
    expect(screen.getByText("Quick Actions Hub")).toBeInTheDocument();
    expect(screen.getByText("Mind Reset (تنظیم ذهن)")).toBeInTheDocument();
    expect(screen.getByText("Problem Solver (حل مسئله)")).toBeInTheDocument();
  });

  it("switches to Focus Timer widget and shows 25:00 countdown", async () => {
    render(
      <MemoryRouter>
        <WidgetsView />
      </MemoryRouter>
    );

    const focusBtn = screen.getByText("Focus Timer (تایمر تمرکز)");
    fireEvent.click(focusBtn);

    expect(screen.getByText("25:00")).toBeInTheDocument();
    expect(screen.getByText("شروع تمرکز")).toBeInTheDocument();
  });

  it("triggers sync when sync button is clicked", async () => {
    const { refreshAndroidWidgets } = await import("@/lib/androidWidget");
    render(
      <MemoryRouter>
        <WidgetsView />
      </MemoryRouter>
    );

    const syncBtn = screen.getByText("همگام‌سازی فوری ویجت‌ها");
    fireEvent.click(syncBtn);

    await waitFor(() => {
      expect(refreshAndroidWidgets).toHaveBeenCalled();
    });
  });
});
