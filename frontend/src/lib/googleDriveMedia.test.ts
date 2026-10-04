import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GoogleDriveMediaError,
  getGoogleDrivePreviewUrl,
  getGoogleDriveViewUrl,
  findUnlinkedGoogleDriveMedia,
  loadGoogleIdentityServices,
  requestGoogleDriveAccessToken,
  uploadGoogleDriveMedia,
} from "./googleDriveMedia";

describe("Google Drive lesson media", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    delete window.google;
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("requests only drive.file after the caller's explicit connection action and never persists the token", async () => {
    const requestAccessToken = vi.fn();
    const initTokenClient = vi.fn((options: { scope: string; callback: (response: { access_token: string }) => void }) => {
      return {
        requestAccessToken: requestAccessToken.mockImplementation(() => options.callback({ access_token: "temporary-access-token" })),
      };
    });
    window.google = { accounts: { oauth2: { initTokenClient } } };

    await expect(requestGoogleDriveAccessToken()).resolves.toBe("temporary-access-token");

    expect(initTokenClient).toHaveBeenCalledWith(expect.objectContaining({
      client_id: expect.stringContaining(".apps.googleusercontent.com"),
      scope: "https://www.googleapis.com/auth/drive.file",
    }));
    expect(requestAccessToken).toHaveBeenCalledWith({ prompt: "" });
    expect(localStorage.length).toBe(0);
  });

  it("uses a resumable upload in an app-owned folder and returns metadata without saving a public URL", async () => {
    const response = (body: unknown, options: { status?: number; location?: string; range?: string } = {}) => ({
      ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
      status: options.status || 200,
      headers: { get: (key: string) => key.toLowerCase() === "location" ? options.location || null : key.toLowerCase() === "range" ? options.range || null : null },
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Response);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response({ files: [] }))
      .mockResolvedValueOnce(response({ id: "arshnaz-folder_12345", name: "ARSHNAZ Lesson Media" }))
      .mockResolvedValueOnce(response({}, { location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=session-1" }))
      .mockResolvedValueOnce(response({}, { status: 308, range: "bytes=0-1" }))
      .mockResolvedValueOnce(response({
        id: "drive-video_12345",
        name: "lecture.mp4",
        mimeType: "video/mp4",
        size: "3",
        createdTime: "2026-09-27T00:00:00.000Z",
      }));
    const file = new File([new Uint8Array([1, 2, 3])], "lecture.mp4", { type: "video/mp4" });

    const attachment = await uploadGoogleDriveMedia(file, "lesson-123", "temporary-token");

    expect(attachment).toEqual({
      provider: "google_drive",
      file_id: "drive-video_12345",
      name: "lecture.mp4",
      mime_type: "video/mp4",
      size_bytes: 3,
      added_at: "2026-09-27T00:00:00.000Z",
    });
    expect(attachment).not.toHaveProperty("access_token");
    expect(attachment).not.toHaveProperty("download_url");
    expect(fetchMock).toHaveBeenCalledTimes(5);
    const folderQuery = String(fetchMock.mock.calls[0][0]);
    expect(folderQuery).toContain("appProperties");
    const folderMetadata = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    expect(folderMetadata.mimeType).toBe("application/vnd.google-apps.folder");
    const uploadStart = fetchMock.mock.calls[2];
    expect(String(uploadStart[0])).toContain("uploadType=resumable");
    expect(JSON.parse(String(uploadStart[1]?.body))).toMatchObject({
      name: "lecture.mp4",
      mimeType: "video/mp4",
      parents: ["arshnaz-folder_12345"],
      appProperties: { arshnazDocumentId: "lesson-123" },
    });
    expect(fetchMock.mock.calls[3][1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({ "Content-Range": "bytes 0-2/3" }),
      body: file.slice(0, 3),
    });
    expect(fetchMock.mock.calls[4][1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({ "Content-Range": "bytes 2-2/3" }),
      body: file.slice(2, 3),
    });
  });

  it("queries Drive after a network interruption and resumes only the unreceived bytes", async () => {
    const response = (body: unknown, options: { status?: number; location?: string; range?: string } = {}) => ({
      ok: (options.status || 200) >= 200 && (options.status || 200) < 300,
      status: options.status || 200,
      headers: { get: (key: string) => key.toLowerCase() === "location" ? options.location || null : key.toLowerCase() === "range" ? options.range || null : null },
      json: vi.fn().mockResolvedValue(body),
    } as unknown as Response);
    const fetchMock = vi.mocked(fetch);
    fetchMock
      .mockResolvedValueOnce(response({ files: [] }))
      .mockResolvedValueOnce(response({ id: "arshnaz-folder_12345", name: "ARSHNAZ Lesson Media" }))
      .mockResolvedValueOnce(response({}, { location: "https://www.googleapis.com/upload/drive/v3/files?upload_id=session-retry" }))
      .mockRejectedValueOnce(new TypeError("Connection interrupted"))
      .mockResolvedValueOnce(response({}, { status: 308, range: "bytes=0-0" }))
      .mockResolvedValueOnce(response({
        id: "drive-resumed_12345",
        name: "lecture.mp4",
        mimeType: "video/mp4",
        size: "3",
      }));
    const file = new File([new Uint8Array([1, 2, 3])], "lecture.mp4", { type: "video/mp4" });
    const onProgress = vi.fn();

    await expect(uploadGoogleDriveMedia(file, "lesson-123", "temporary-token", undefined, onProgress))
      .resolves.toMatchObject({ file_id: "drive-resumed_12345", size_bytes: 3 });

    expect(fetchMock).toHaveBeenCalledTimes(6);
    expect(fetchMock.mock.calls[4][1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({ "Content-Range": "bytes */3" }),
    });
    expect(fetchMock.mock.calls[5][1]).toMatchObject({
      method: "PUT",
      headers: expect.objectContaining({ "Content-Range": "bytes 1-2/3" }),
      body: file.slice(1, 3),
    });
    expect(onProgress).toHaveBeenLastCalledWith(3, 3);
  });

  it("rejects non-media before any Drive API call", async () => {
    const file = new File(["<script>alert(1)</script>"], "lesson.html", { type: "text/html" });
    await expect(uploadGoogleDriveMedia(file, "lesson-123", "token")).rejects.toMatchObject({
      code: "invalid_media",
    } satisfies Partial<GoogleDriveMediaError>);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("recovers only unlinked images/videos tagged to the selected lesson", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ files: [
        { id: "drive-new_12345", name: "new diagram.png", mimeType: "image/png", size: "1024", createdTime: "2026-09-26" },
        { id: "drive-linked_12345", name: "already attached.jpg", mimeType: "image/jpeg", size: "2048" },
        { id: "drive-doc_12345", name: "lesson.html", mimeType: "text/html", size: "100" },
      ] }),
    } as Response);

    await expect(findUnlinkedGoogleDriveMedia("lesson-123", ["drive-linked_12345"], "temporary-token"))
      .resolves.toEqual([{
        provider: "google_drive",
        file_id: "drive-new_12345",
        name: "new diagram.png",
        mime_type: "image/png",
        size_bytes: 1024,
        added_at: "2026-09-26",
      }]);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toContain("arshnazDocumentId");
  });

  it("accepts only safe Drive file identifiers when constructing preview links", () => {
    expect(getGoogleDrivePreviewUrl("drive-file_12345")).toBe("https://drive.google.com/file/d/drive-file_12345/preview");
    expect(getGoogleDriveViewUrl("drive-file_12345")).toBe("https://drive.google.com/file/d/drive-file_12345/view");
    expect(getGoogleDrivePreviewUrl("https://evil.example/x")).toBeNull();
  });

  it("times out a stalled Identity Services load and allows a later retry without removing an existing script", async () => {
    vi.useFakeTimers();
    const existingScript = document.createElement("script");
    existingScript.src = "https://accounts.google.com/gsi/client";
    document.head.appendChild(existingScript);

    const loading = loadGoogleIdentityServices();
    const rejection = expect(loading).rejects.toMatchObject({ code: "identity_library_unavailable" });
    await vi.advanceTimersByTimeAsync(15_000);
    await rejection;

    expect(existingScript.isConnected).toBe(true);
    window.google = {
      accounts: {
        oauth2: {
          initTokenClient: () => ({ requestAccessToken: vi.fn() }),
        },
      },
    };
    await expect(loadGoogleIdentityServices()).resolves.toBeUndefined();
  });
});
