import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadMediaFull, deleteMediaPath } from "./uploadMedia";

const mocks = vi.hoisted(() => ({
  auth: { currentUser: { uid: "owner" } as { uid: string } | null },
  upload: vi.fn().mockResolvedValue({}), url: vi.fn().mockResolvedValue("https://example.test/private-photo"),
  ref: vi.fn((_storage, path) => ({ path })), remove: vi.fn().mockResolvedValue({ error: null }),
  compress: vi.fn(async (file: File) => file), delete: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/firebase", () => ({ auth: mocks.auth }));
vi.mock("./imageCompression", () => ({ compressImage: mocks.compress }));
vi.mock("./attachmentUpload", () => ({ validateAttachmentFile: (file: File) => ({ ok: file.size > 0, mime: file.type }) }));
vi.mock("@/lib/firebaseStore", () => ({ firebaseStore: { storage: { from: () => ({ remove: mocks.remove }) } } }));
vi.mock("firebase/storage", () => ({ getStorage: () => ({}), ref: mocks.ref, uploadBytes: mocks.upload, getDownloadURL: mocks.url, deleteObject: mocks.delete }));

beforeEach(() => { vi.clearAllMocks(); mocks.auth.currentUser = { uid: "owner" }; mocks.compress.mockImplementation(async file => file); });
describe("private inline media", () => {
  it("uploads compressed bytes in the existing owner-protected namespace", async () => {
    const optimized = new File(["small"], "portrait.webp", { type: "image/webp" });
    mocks.compress.mockResolvedValueOnce(optimized);
    const uploaded = await uploadMediaFull(new File(["original"], "portrait.jpg", { type: "image/jpeg" }), "owner");
    expect(uploaded).toMatchObject({ name: "portrait.webp", kind: "image", size: 5 });
    expect(uploaded.path).toMatch(/^users\/owner\/task-attachments\/note-media\//);
    expect(mocks.upload).toHaveBeenCalledWith(expect.anything(), optimized, expect.objectContaining({ contentType: "image/webp" }));
  });
  it("stops before uploading when the account changes during compression", async () => {
    mocks.compress.mockImplementationOnce(async file => { mocks.auth.currentUser = { uid: "another" }; return file; });
    await expect(uploadMediaFull(new File(["photo"], "photo.jpg", { type: "image/jpeg" }), "owner")).rejects.toThrow("Account changed");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("rejects removing another owner's media", async () => {
    await expect(deleteMediaPath("users/another/task-attachments/note-media/photo")).rejects.toThrow("denied");
    expect(mocks.delete).not.toHaveBeenCalled();
  });
});
