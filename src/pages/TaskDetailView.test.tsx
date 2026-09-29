import React, { forwardRef } from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import TaskDetailView from "./TaskDetailView";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const mockUser = { id: "user-123" };
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: mockUser }),
}));

vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({
            data: { id: "task-1", user_id: "user-123", title: "Test Task 1", completed: false },
          }),
        }),
      }),
    }),
  },
}));

vi.mock("@/components/TaskDetail", () => ({
  TaskDetail: forwardRef(({ task, onClose, onBack }: any, _ref) => (
    <div data-testid="mock-task-detail">
      <span>{task.title}</span>
      <button onClick={onClose} data-testid="detail-close-btn">Close</button>
      <button onClick={onBack} data-testid="detail-back-btn">Back</button>
    </div>
  )),
}));

describe("TaskDetailView navigation and exit behavior", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({ idx: 0 }, "");
  });

  it("navigates back to returnTo when search parameter returnTo is specified", async () => {
    render(
      <MemoryRouter initialEntries={["/app/tasks/task-1?returnTo=%2Fapp%2Fbuckets"]}>
        <Routes>
          <Route path="/app/tasks/:id" element={<TaskDetailView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-task-detail")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("detail-close-btn"));
    expect(mockNavigate).toHaveBeenCalledWith("/app/buckets", { replace: true });
  });

  it("navigates with -1 when in-app history exists and returnTo is not present", async () => {
    window.history.replaceState({ idx: 2 }, "");
    render(
      <MemoryRouter initialEntries={["/app/tasks/task-1"]}>
        <Routes>
          <Route path="/app/tasks/:id" element={<TaskDetailView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-task-detail")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("detail-close-btn"));
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });

  it("falls back to /app/today only when there is no returnTo and no prior in-app history", async () => {
    window.history.replaceState({ idx: 0 }, "");
    render(
      <MemoryRouter initialEntries={["/app/tasks/task-1"]}>
        <Routes>
          <Route path="/app/tasks/:id" element={<TaskDetailView />} />
        </Routes>
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByTestId("mock-task-detail")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId("detail-close-btn"));
    expect(mockNavigate).toHaveBeenCalledWith("/app/today", { replace: true });
  });
});
