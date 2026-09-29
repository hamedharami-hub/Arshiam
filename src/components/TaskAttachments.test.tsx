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
});
