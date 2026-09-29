import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  uid: "account-a",
  listAll: vi.fn(),
  getMetadata: vi.fn(),
  getDownloadURL: vi.fn(),
  deleteObject: vi.fn(),
  uploadBytesResumable: vi.fn(),
}));

vi.mock("@/lib/firebase", () => ({ auth: { currentUser: { uid: mocks.uid } } }));
vi.mock("@/lib/arshApi", () => ({
  ARSH_API_BASE: "",
  arshFetch: vi.fn(),
  ArshApiError: class ArshApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));
vi.mock("firebase/storage", () => ({
  getStorage: () => ({}),
  ref: (_storage: unknown, fullPath: string) => ({ fullPath, name: fullPath.split("/").pop() }),
  listAll: mocks.listAll,
  getMetadata: mocks.getMetadata,
  getDownloadURL: mocks.getDownloadURL,
  deleteObject: mocks.deleteObject,
  uploadBytesResumable: mocks.uploadBytesResumable,
}));

import { deleteAttachment, listAttachments, uploadAttachment } from "./attachmentUpload";

describe("Firebase cloud task attachments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.listAll.mockResolvedValue({ items: [] });
    mocks.getMetadata.mockResolvedValue({
      contentType: "application/pdf", size: 100, customMetadata: { fileName: "report.pdf", source: "device" },
      timeCreated: "2026-09-29T00:00:00.000Z",
    });
    mocks.getDownloadURL.mockResolvedValue("https://storage.example/report.pdf");
    mocks.deleteObject.mockResolvedValue(undefined);
  });

  it("uploads bytes directly under the signed-in owner's task folder", async () => {
    mocks.uploadBytesResumable.mockImplementation((_ref, _file, _metadata) => ({
      on: (_event: string, progress: (snapshot: { totalBytes: number; bytesTransferred: number }) => void,
        _error: unknown, complete: () => void) => {
        progress({ totalBytes: 100, bytesTransferred: 50 });
        complete();
      },
    }));
    const progress = vi.fn();
    const file = new File([new Uint8Array(100)], "report.pdf", { type: "application/pdf" });

    const result = await uploadAttachment("task-1", file, progress);

    expect(mocks.uploadBytesResumable).toHaveBeenCalledWith(
      expect.objectContaining({ fullPath: expect.stringMatching(/^users\/account-a\/task-attachments\/task-1\/[^/]+$/) }),
      file,
      { contentType: "application/pdf", customMetadata: { fileName: "report.pdf", source: "device" } },
    );
    expect(progress).toHaveBeenCalledWith(0.5);
    expect(result).toMatchObject({ file_name: "report.pdf", view_url: "https://storage.example/report.pdf", kind: "pdf" });
  });

  it("lists and deletes only files in the owner's Firebase path", async () => {
    mocks.listAll.mockResolvedValue({ items: [{ fullPath: "users/account-a/task-attachments/task-1/file_report.pdf", name: "file_report.pdf" }] });

    const items = await listAttachments("task-1");
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe("firebase:users/account-a/task-attachments/task-1/file_report.pdf");
    await deleteAttachment(items[0].id);
    expect(mocks.deleteObject).toHaveBeenCalledWith(expect.objectContaining({ fullPath: "users/account-a/task-attachments/task-1/file_report.pdf" }));
    await expect(deleteAttachment("firebase:users/account-b/task-attachments/task-1/other.pdf")).rejects.toThrow("another account");
  });
});
