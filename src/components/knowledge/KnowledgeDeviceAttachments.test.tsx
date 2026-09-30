import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { KnowledgeDeviceAttachments } from "./KnowledgeDeviceAttachments";
import type { KnowledgeDocument } from "@/lib/knowledgeTypes";
const mocks = vi.hoisted(() => ({ upload: vi.fn(), persist: vi.fn() }));
vi.mock("@/hooks/useBilingual", () => ({ useBilingual: () => ({ T: (_fa: string, en: string) => en }) }));
vi.mock("@/lib/knowledgeAttachmentUpload", () => ({ uploadKnowledgeAttachment: mocks.upload, getKnowledgeAttachmentUrl: vi.fn() }));
vi.mock("@/lib/knowledgeService", () => ({ updateKnowledgeDocumentWithPersistence: mocks.persist }));
const lesson = { id: "lesson", user_id: "owner", attachments: [], title: "Lesson" } as unknown as KnowledgeDocument;
const attachment = { provider: "firebase", file_id: "file-123", name: "source.pdf", storage_path: "users/owner/task-attachments/knowledge-lesson/file-123", mime_type: "application/pdf", size_bytes: 100, added_at: "2026-10-01" };
describe("device lesson attachments", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.upload.mockResolvedValue(attachment); mocks.persist.mockResolvedValue({ document: { ...lesson, attachments: [attachment] }, persistence: "synced" }); });
  it("uploads a local PDF without Google authorization and then persists its lesson metadata", async () => {
    const updated = vi.fn(); render(<KnowledgeDeviceAttachments document={lesson} userId="owner" onDocumentUpdated={updated} />);
    const file = new File(["PDF sample"], "source.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Choose a device file"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload to app cloud" }));
    await waitFor(() => expect(updated).toHaveBeenCalled());
    expect(mocks.upload).toHaveBeenCalledWith("owner", "lesson", file, expect.any(Function), expect.any(AbortSignal));
    expect(mocks.persist).toHaveBeenCalledWith("owner", "lesson", { attachments: [attachment] });
  });
  it("retries only the link after a successful upload and a failed metadata write", async () => {
    mocks.persist.mockRejectedValueOnce(new Error("network failed")); render(<KnowledgeDeviceAttachments document={lesson} userId="owner" />);
    fireEvent.change(screen.getByLabelText("Choose a device file"), { target: { files: [new File(["PDF"], "source.pdf", { type: "application/pdf" })] } });
    fireEvent.click(screen.getByRole("button", { name: "Upload to app cloud" }));
    await screen.findByRole("alert"); fireEvent.click(screen.getByRole("button", { name: "Save lesson link" }));
    await waitFor(() => expect(mocks.persist).toHaveBeenCalledTimes(2)); expect(mocks.upload).toHaveBeenCalledTimes(1);
  });
  it("rejects unsupported files before any cloud request", () => {
    render(<KnowledgeDeviceAttachments document={lesson} userId="owner" />);
    fireEvent.change(screen.getByLabelText("Choose a device file"), { target: { files: [new File(["script"], "unsafe.html", { type: "text/html" })] } });
    expect(screen.getByRole("alert")).toBeInTheDocument(); expect(mocks.upload).not.toHaveBeenCalled();
  });
});
