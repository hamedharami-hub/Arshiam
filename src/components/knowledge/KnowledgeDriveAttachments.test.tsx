import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { KnowledgeDocument, KnowledgeMediaAttachment } from "@/lib/knowledgeTypes";

const mocks = vi.hoisted(() => ({
  loadGoogleIdentityServices: vi.fn(),
  requestGoogleDriveAccessToken: vi.fn(),
  uploadGoogleDriveMedia: vi.fn(),
  findUnlinkedGoogleDriveMedia: vi.fn(),
  updateKnowledgeDocumentWithPersistence: vi.fn(),
  toast: { info: vi.fn(), success: vi.fn(), error: vi.fn() },
  getGoogleDriveMediaErrorMessage: vi.fn((_error: unknown, isEn: boolean) => isEn ? "Drive error" : "خطای Drive"),
  getGoogleDrivePreviewUrl: vi.fn((fileId: string) => `https://drive.google.com/file/d/${fileId}/preview`),
  getGoogleDriveViewUrl: vi.fn((fileId: string) => `https://drive.google.com/file/d/${fileId}/view`),
}));

vi.mock("@/lib/googleDriveMedia", () => mocks);
vi.mock("@/lib/knowledgeService", () => ({
  updateKnowledgeDocumentWithPersistence: mocks.updateKnowledgeDocumentWithPersistence,
}));
vi.mock("sonner", () => ({ toast: mocks.toast }));

import { KnowledgeDriveAttachments } from "./KnowledgeDriveAttachments";

const baseDocument: KnowledgeDocument = {
  id: "lesson-123",
  user_id: "user-123",
  folder_id: null,
  title: "Lesson with media",
  content_html: "<p>Lesson content</p>",
  source_url: "https://example.org/source",
  tags: ["study"],
  created_at: "2026-09-27T00:00:00.000Z",
  updated_at: "2026-09-27T00:00:00.000Z",
};

const uploadedAttachment: KnowledgeMediaAttachment = {
  provider: "google_drive",
  file_id: "drive-image_12345",
  name: "diagram.png",
  mime_type: "image/png",
  size_bytes: 4096,
  added_at: "2026-09-27T00:00:00.000Z",
};

describe("KnowledgeDriveAttachments", () => {
  beforeEach(() => {
    mocks.loadGoogleIdentityServices.mockReset().mockResolvedValue(undefined);
    mocks.requestGoogleDriveAccessToken.mockReset().mockResolvedValue("temporary-token");
    mocks.uploadGoogleDriveMedia.mockReset().mockResolvedValue(uploadedAttachment);
    mocks.findUnlinkedGoogleDriveMedia.mockReset().mockResolvedValue([uploadedAttachment]);
    mocks.updateKnowledgeDocumentWithPersistence.mockReset().mockImplementation(async (_userId, _docId, patch) => ({
      document: { ...baseDocument, ...patch },
      persistence: "synced",
    }));
    mocks.toast.info.mockReset();
    mocks.toast.success.mockReset();
    mocks.toast.error.mockReset();
    mocks.getGoogleDriveMediaErrorMessage.mockClear();
  });

  it("connects only after a click, uploads an image, and persists the attachment without changing lesson identity", async () => {
    const onDocumentUpdated = vi.fn();
    render(
      <KnowledgeDriveAttachments
        document={baseDocument}
        userId="user-123"
        isEn={false}
        onDocumentUpdated={onDocumentUpdated}
      />,
    );

    expect(mocks.requestGoogleDriveAccessToken).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "افزودن رسانه" }));
    await waitFor(() => expect(mocks.loadGoogleIdentityServices).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "اتصال Google Drive" }));
    await screen.findByText("متصل در این نشست مرورگر");

    fireEvent.change(screen.getByLabelText("انتخاب تصویر یا ویدیو"), {
      target: { files: [new File(["image"], "diagram.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "بارگذاری و پیوند به درس" }));

    await waitFor(() => expect(mocks.updateKnowledgeDocumentWithPersistence).toHaveBeenCalledWith(
      "user-123",
      "lesson-123",
      { attachments: [uploadedAttachment] },
    ));
    expect(mocks.uploadGoogleDriveMedia).toHaveBeenCalledWith(
      expect.objectContaining({ name: "diagram.png", type: "image/png" }),
      "lesson-123",
      "temporary-token",
      expect.any(AbortSignal),
      expect.any(Function),
    );
    expect(onDocumentUpdated).toHaveBeenCalledWith(expect.objectContaining({
      id: "lesson-123",
      content_html: baseDocument.content_html,
      source_url: baseDocument.source_url,
      tags: baseDocument.tags,
      attachments: [uploadedAttachment],
    }));
    expect(await screen.findByText("diagram.png")).toBeInTheDocument();
  });

  it("clearly distinguishes a locally queued lesson link from a cloud-synced link", async () => {
    mocks.updateKnowledgeDocumentWithPersistence.mockResolvedValueOnce({
      document: { ...baseDocument, attachments: [uploadedAttachment] },
      persistence: "queued",
    });
    render(<KnowledgeDriveAttachments document={baseDocument} userId="user-123" isEn />);

    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    await waitFor(() => expect(mocks.loadGoogleIdentityServices).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Drive" }));
    await screen.findByText("Connected for this tab session");
    mocks.toast.success.mockClear();
    fireEvent.change(screen.getByLabelText("Choose image or video"), {
      target: { files: [new File(["image"], "diagram.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload and attach" }));

    await waitFor(() => expect(mocks.toast.info).toHaveBeenCalledWith(
      "Media attached on this device; waiting to sync to the cloud.",
    ));
    expect(mocks.toast.success).not.toHaveBeenCalledWith("Media attached to the lesson");
    expect(await screen.findByText("diagram.png")).toBeInTheDocument();
  });

  it("announces byte-based upload progress accessibly", async () => {
    let finishUpload: (() => void) | undefined;
    mocks.uploadGoogleDriveMedia.mockImplementation((_file, _documentId, _token, _signal, onProgress) => new Promise((resolve) => {
      onProgress?.(1, 2);
      finishUpload = () => resolve(uploadedAttachment);
    }));

    render(<KnowledgeDriveAttachments document={baseDocument} userId="user-123" isEn />);
    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    await waitFor(() => expect(mocks.loadGoogleIdentityServices).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Drive" }));
    await screen.findByText("Connected for this tab session");
    fireEvent.change(screen.getByLabelText("Choose image or video"), {
      target: { files: [new File(["image"], "diagram.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload and attach" }));

    expect(await screen.findByRole("progressbar", { name: "Google Drive upload progress" }))
      .toHaveAttribute("aria-valuenow", "50");
    finishUpload?.();
    expect(await screen.findByText("diagram.png")).toBeInTheDocument();
  });

  it("keeps an uploaded file pending when lesson storage fails and retries linking without re-uploading", async () => {
    mocks.updateKnowledgeDocumentWithPersistence
      .mockRejectedValueOnce(new Error("storage unavailable"))
      .mockResolvedValueOnce({
        document: { ...baseDocument, attachments: [uploadedAttachment] },
        persistence: "synced",
      });
    render(<KnowledgeDriveAttachments document={baseDocument} userId="user-123" isEn />);

    fireEvent.click(screen.getByRole("button", { name: "Add media" }));
    await waitFor(() => expect(mocks.loadGoogleIdentityServices).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "Connect Google Drive" }));
    await screen.findByText("Connected for this tab session");
    fireEvent.change(screen.getByLabelText("Choose image or video"), {
      target: { files: [new File(["image"], "diagram.png", { type: "image/png" })] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Upload and attach" }));

    expect(await screen.findByRole("status")).toHaveTextContent(/upload reached Drive/i);
    expect(screen.getByRole("button", { name: "Retry linking to lesson" })).toBeInTheDocument();
    expect(mocks.uploadGoogleDriveMedia).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "Retry linking to lesson" }));
    await waitFor(() => expect(mocks.updateKnowledgeDocumentWithPersistence).toHaveBeenCalledTimes(2));
    expect(mocks.uploadGoogleDriveMedia).toHaveBeenCalledTimes(1);
    expect(await screen.findByText("diagram.png")).toBeInTheDocument();
  });

  it("detaches the lesson reference without deleting or changing the Drive file", async () => {
    const onDocumentUpdated = vi.fn();
    render(
      <KnowledgeDriveAttachments
        document={{ ...baseDocument, attachments: [uploadedAttachment] }}
        userId="user-123"
        isEn={false}
        onDocumentUpdated={onDocumentUpdated}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "نمایش / افزودن" }));
    fireEvent.click(screen.getByRole("button", { name: "جداکردن از درس" }));

    await waitFor(() => expect(mocks.updateKnowledgeDocumentWithPersistence).toHaveBeenCalledWith(
      "user-123",
      "lesson-123",
      { attachments: [] },
    ));
    expect(onDocumentUpdated).toHaveBeenCalledWith(expect.objectContaining({ id: "lesson-123", attachments: [] }));
    expect(mocks.uploadGoogleDriveMedia).not.toHaveBeenCalled();
  });

  it("lets the user recover and attach a prior Drive upload without uploading it again", async () => {
    render(
      <KnowledgeDriveAttachments
        document={baseDocument}
        userId="user-123"
        isEn={false}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "افزودن رسانه" }));
    await waitFor(() => expect(mocks.loadGoogleIdentityServices).toHaveBeenCalledTimes(1));
    fireEvent.click(await screen.findByRole("button", { name: "اتصال Google Drive" }));
    await screen.findByText("متصل در این نشست مرورگر");
    fireEvent.click(screen.getByRole("button", { name: "یافتن بارگذاری‌های قبلی" }));

    expect(await screen.findByText("diagram.png · ۴ کیلوبایت")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "پیوند به درس" }));

    await waitFor(() => expect(mocks.updateKnowledgeDocumentWithPersistence).toHaveBeenCalledWith(
      "user-123",
      "lesson-123",
      { attachments: [uploadedAttachment] },
    ));
    expect(mocks.findUnlinkedGoogleDriveMedia).toHaveBeenCalledWith("lesson-123", [], "temporary-token");
    expect(mocks.uploadGoogleDriveMedia).not.toHaveBeenCalled();
  });
});
