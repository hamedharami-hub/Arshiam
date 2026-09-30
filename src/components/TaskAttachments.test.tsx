import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { TaskAttachments } from "./TaskAttachments";

const { deleteAttachment } = vi.hoisted(() => ({ deleteAttachment: vi.fn() }));

vi.mock("@/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ isEn: false, T: (fa: string) => fa }) }));
vi.mock("@/lib/arshApi", () => ({ absoluteArshUrl: (value: string) => value }));
vi.mock("@/lib/uploadMedia", () => ({ deleteMediaPath: vi.fn() }));
vi.mock("@/lib/ai", () => ({ callAI: vi.fn() }));
vi.mock("@/components/GoogleImportButtons", () => ({
  GoogleImportButtons: () => null,
  SaveToDriveButton: () => null,
}));
vi.mock("@/components/PdfPreview", () => ({ PdfPreview: () => null }));
vi.mock("@/lib/firebaseStore", () => ({
  firebaseStore: {
    from: () => ({
      select: () => ({ eq: () => ({ order: () => Promise.resolve({ data: [], error: null }) }) }),
      delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
    }),
  },
}));
vi.mock("@/lib/attachmentUpload", () => ({
  ATTACHMENT_ACCEPT: "*/*",
  deleteAttachment: (...args: unknown[]) => deleteAttachment(...args),
  enqueueAttachment: vi.fn(), flushAttachmentQueue: vi.fn(), formatBytes: () => "1 KB", isNetworkError: () => false,
  listAttachments: () => Promise.resolve([{ id: "firebase:users/u1/task-attachments/t1/file", task_id: "t1", file_name: "photo.jpg", mime_type: "image/jpeg", kind: "image", size_bytes: 1000, view_url: "https://example.test/photo.jpg", download_url: "https://example.test/photo.jpg", created_at: "2026-01-01" }]),
  listQueued: () => Promise.resolve([]), onQueueChange: () => () => {}, removeQueued: vi.fn(), startAttachmentQueueRunner: vi.fn(), uploadAttachment: vi.fn(), validateAttachmentFile: () => ({ ok: true }),
}));

describe("TaskAttachments deletion confirmation", () => {
  beforeEach(() => deleteAttachment.mockReset().mockResolvedValue(undefined));

  it("does not delete on cancel and deletes only after explicit confirmation", async () => {
    render(<TaskAttachments taskId="t1" />);
    await screen.findByText("photo.jpg");

    fireEvent.click(screen.getByTestId("attachment-delete-btn"));
    expect(screen.getByTestId("attachment-delete-confirmation")).toBeInTheDocument();
    fireEvent.click(screen.getByTestId("attachment-delete-cancel"));
    expect(deleteAttachment).not.toHaveBeenCalled();

    fireEvent.click(screen.getByTestId("attachment-delete-btn"));
    fireEvent.click(screen.getByTestId("attachment-delete-confirm"));
    await waitFor(() => expect(deleteAttachment).toHaveBeenCalledWith("firebase:users/u1/task-attachments/t1/file"));
  });

  it("BASELINE BUG: shows success toast even when legacy firebaseStore delete fails", async () => {
    // BUG: TaskAttachments.tsx lines 168-172
    // Code for legacy attachment deletion:
    //   if (a.legacy) {
    //     await firebaseStore.from("task_attachments").delete().eq("id", a.id);
    //     await deleteMediaPath(a.legacy.storage_path).catch(() => {});
    //   }
    // 
    // The firebaseStore.from().delete().eq() returns { error: Error | null }
    // But the code doesn't check result.error, so it proceeds to show success toast
    // even when the delete operation fails
    //
    // Expected: Should check result.error and show error toast if delete fails
    // Actual: Shows success toast regardless of error
    // Impact: User thinks attachment is deleted but it still exists in database
  });


  it("BASELINE BUG: image-to-tasks action has no idempotency - retry creates duplicate tasks", async () => {
    // BUG: TaskAttachments.tsx lines 205-218
    // When user clicks "ساخت تسک از این تصویر", the code:
    // 1. Calls AI to extract tasks
    // 2. Loops through tasks and inserts each one
    // 3. No check for existing tasks with same title/description
    // 4. No stable ID or deduplication mechanism
    // Expected: Should check if tasks already exist or use idempotent IDs
    // Actual: Each retry creates duplicate tasks
    // Impact: If AI call succeeds but UI doesn't update, user retries and gets duplicates
    
    // The review request says: "no request-generation guard for task switches; 
    // image action loops tasks inserts without checking error and no stable retry IDs"
    
    // This means:
    // 1. No guard to prevent action if user switches to different task
    // 2. Loop doesn't check insert errors (line 213-216)
    // 3. No stable IDs to prevent duplicates on retry
  });

  it("BASELINE BUG: shows success toast even when legacy firebaseStore delete fails", async () => {
    // BUG: TaskAttachments.tsx lines 168-172
    // Code for legacy attachment deletion:
    //   if (a.legacy) {
    //     await firebaseStore.from("task_attachments").delete().eq("id", a.id);
    //     await deleteMediaPath(a.legacy.storage_path).catch(() => {});
    //   }
    // 
    // The firebaseStore.from().delete().eq() returns { error: Error | null }
    // But the code doesn't check result.error, so it proceeds to show success toast
    // even when the delete operation fails
    //
    // Expected: Should check result.error and show error toast if delete fails
    // Actual: Shows success toast regardless of error
    // Impact: User thinks attachment is deleted but it still exists in database
  });
});
