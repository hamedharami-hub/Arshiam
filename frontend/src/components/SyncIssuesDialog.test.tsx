import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import SyncIssuesDialog from "./SyncIssuesDialog";
import { discardQueuedOp, type QueuedOp } from "@/lib/offlineQueue";

vi.mock("@/lib/offlineQueue", () => ({ canReplayForOwner: (item: QueuedOp, owner: string) => item.ownerId === owner, discardQueuedOp: vi.fn().mockResolvedValue(undefined), enqueueOp: vi.fn() }));

describe("SyncIssuesDialog", () => {
  it("requires confirmation for a single discard and preserves the queue on cancel", async () => {
    const items = [{ id: 1, table: "tasks", ownerId: "user", payload: { title: "First" }, createdAt: 1 }, { id: 2, table: "tasks", ownerId: "user", payload: { title: "Second" }, createdAt: 2 }] as QueuedOp[];
    render(<SyncIssuesDialog open onOpenChange={vi.fn()} items={items} ownerId="user" isEn syncing={false} onRetry={vi.fn()} />);
    fireEvent.click(screen.getByTestId("sync-issue-discard-0"));
    const confirmation = screen.getByRole("alertdialog");
    expect(confirmation).toHaveTextContent("1 change for this account");
    expect(discardQueuedOp).not.toHaveBeenCalled();
    fireEvent.click(within(confirmation).getByRole("button", { name: "Cancel" }));
    expect(discardQueuedOp).not.toHaveBeenCalled();
    fireEvent.click(screen.getByTestId("sync-issue-discard-0"));
    fireEvent.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: "Remove from queue" }));
    await waitFor(() => expect(discardQueuedOp).toHaveBeenCalledWith(items[0]));
    expect(discardQueuedOp).toHaveBeenCalledOnce();
  });
});
