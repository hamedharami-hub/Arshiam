import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import OfflineIndicator from "./OfflineIndicator";

const mocks = vi.hoisted(() => ({
  getQueue: vi.fn(),
  onQueueChange: vi.fn(() => () => {}),
  flushQueue: vi.fn(),
  canReplayForOwner: (item: { ownerId?: string; payload?: unknown; match?: Record<string, unknown> }, userId?: string) => {
    if (!userId) return false;
    const payload = item.payload && typeof item.payload === "object" ? item.payload as Record<string, unknown> : undefined;
    const claims = [item.ownerId, payload?.user_id, payload?.userId, item.match?.user_id]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return claims.length > 0 && claims.every((claim) => claim === userId);
  },
  getQueuedOpOwnerId: (item: { ownerId?: string; payload?: unknown; match?: Record<string, unknown> }) => {
    const payload = item.payload && typeof item.payload === "object" ? item.payload as Record<string, unknown> : undefined;
    const claims = [item.ownerId, payload?.user_id, payload?.userId, item.match?.user_id]
      .filter((value): value is string => typeof value === "string" && value.length > 0);
    return claims.length > 0 && claims.every((claim) => claim === claims[0]) ? claims[0] : undefined;
  },
  getFirestoreConflictSnapshot: vi.fn(),
}));

vi.mock("@/lib/offlineQueue", () => ({
  getQueue: mocks.getQueue,
  onQueueChange: mocks.onQueueChange,
  flushQueue: mocks.flushQueue,
  canReplayForOwner: mocks.canReplayForOwner,
  getQueuedOpOwnerId: mocks.getQueuedOpOwnerId,
  discardQueuedOp: vi.fn(),
}));
vi.mock("@/lib/firestoreSync", () => ({
  getFirestoreConflictSnapshot: mocks.getFirestoreConflictSnapshot,
}));
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: { id: "user-123" } }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ i18n: { language: "fa" }, t: (k: string) => k }),
  initReactI18next: { type: "3rdParty", init: () => undefined },
}));

const conflict = {
  id: 1,
  ownerId: "user-123",
  table: "tasks",
  op: "upsert" as const,
  payload: { id: "task-1", title: "Local version" },
  createdAt: 1_790_000_000_000,
  attempts: 1,
  conflictReason: "remote-newer" as const,
};

describe("OfflineIndicator conflict review", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    localStorage.removeItem("arshnaz_last_sync");
    mocks.getQueue.mockReset().mockResolvedValue([conflict]);
    mocks.onQueueChange.mockClear();
    mocks.flushQueue.mockReset().mockResolvedValue({ ok: 0, failed: 0 });
    mocks.getFirestoreConflictSnapshot.mockReset().mockResolvedValue({
      exists: true,
      data: { id: "task-1", title: "Cloud version" },
    });
  });

  it("opens a read-only side-by-side comparison and does not replay the queue", async () => {
    render(<OfflineIndicator />);

    fireEvent.click(await screen.findByRole("button", { name: /بررسی تعارض/ }));

    expect(await screen.findByText(/Local version/)).toBeInTheDocument();
    expect(mocks.getFirestoreConflictSnapshot).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "خواندن نسخهٔ ابری" }));
    expect(await screen.findByText(/Cloud version/)).toBeInTheDocument();
    expect(screen.getByText(/چیزی بازنویسی یا حذف نمی‌شود/)).toBeInTheDocument();
    expect(mocks.getFirestoreConflictSnapshot).toHaveBeenCalledWith("user-123", "tasks", "task-1");
    expect(mocks.flushQueue).not.toHaveBeenCalled();
  });

  it("retains the queued local copy and explains when the cloud copy cannot be read", async () => {
    mocks.getFirestoreConflictSnapshot.mockRejectedValueOnce(new Error("offline"));
    render(<OfflineIndicator />);

    fireEvent.click(await screen.findByRole("button", { name: /بررسی تعارض/ }));

    expect(await screen.findByText(/Local version/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "خواندن نسخهٔ ابری" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("تغییر محلی محفوظ است");
    expect(mocks.flushQueue).not.toHaveBeenCalled();
  });

  it("warns about legacy queue entries with no safely identifiable owner", async () => {
    mocks.getQueue.mockResolvedValueOnce([{ ...conflict, ownerId: undefined, payload: { id: "old-task" } }]);
    render(<OfflineIndicator />);

    expect(await screen.findByRole("status")).toHaveTextContent("بدون مالک مشخص");
  });

  it("explains a quota failure without discarding queued changes", async () => {
    mocks.getQueue.mockResolvedValueOnce([{ ...conflict, conflictReason: undefined, lastError: "RESOURCE_EXHAUSTED: Free daily read units per project" }]);
    render(<OfflineIndicator />);
    expect(await screen.findByRole("status")).toHaveTextContent("سقف روزانهٔ رایگان Firebase پر شده");
    expect(mocks.flushQueue).not.toHaveBeenCalled();
  });

  it("can be dismissed so a persistent sync failure does not cover the screen", async () => {
    sessionStorage.clear();
    mocks.getQueue.mockResolvedValue([{ ...conflict, conflictReason: undefined, lastError: "permission-denied" }]);
    render(<OfflineIndicator />);
    fireEvent.click(await screen.findByTestId("sync-status-dismiss"));
    expect(screen.queryByTestId("sync-status-bar")).not.toBeInTheDocument();
  });
});
