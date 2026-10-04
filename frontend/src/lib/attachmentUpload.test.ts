import { describe, expect, it } from "vitest";
import { MAX_ATTACHMENT_BYTES, formatBytes, resolveMime, validateAttachmentFile } from "./attachmentUpload";

describe("attachment validation", () => {
  it("accepts images and PDFs up to 25 MB", () => {
    expect(validateAttachmentFile({ name: "a.png", type: "image/png", size: 1000 }).ok).toBe(true);
    expect(validateAttachmentFile({ name: "a.pdf", type: "application/pdf", size: MAX_ATTACHMENT_BYTES }).ok).toBe(true);
  });

  it("rejects files larger than 25 MB", () => {
    const r = validateAttachmentFile({ name: "big.pdf", type: "application/pdf", size: MAX_ATTACHMENT_BYTES + 1 });
    expect(r).toMatchObject({ ok: false, reason: "too_large" });
  });

  it("rejects disallowed types and empty files", () => {
    expect(validateAttachmentFile({ name: "x.exe", type: "application/x-msdownload", size: 10 })).toMatchObject({ ok: false, reason: "type" });
    expect(validateAttachmentFile({ name: "x.png", type: "image/png", size: 0 })).toMatchObject({ ok: false, reason: "empty" });
  });

  it("falls back to the extension when the browser gives no MIME type (Android WebView)", () => {
    expect(resolveMime({ name: "scan.PDF", type: "" })).toBe("application/pdf");
    expect(resolveMime({ name: "photo.jpg", type: "" })).toBe("image/jpeg");
    expect(validateAttachmentFile({ name: "photo.heic", type: "", size: 10 }).ok).toBe(true);
  });

  it("formats byte sizes", () => {
    expect(formatBytes(500)).toBe("500 B");
    expect(formatBytes(2048)).toBe("2 KB");
    expect(formatBytes(3.5 * 1024 * 1024)).toBe("3.5 MB");
  });
});

describe("BASELINE: attachment queue security bugs", () => {
  it("BASELINE BUG: listQueued returns files from other accounts without filtering by ownerId", async () => {
    // This test documents the bug but cannot fully reproduce without real IndexedDB
    // BUG: attachmentUpload.ts line 214 - listQueued does not filter by ownerId
    // Code: return (await queueDb()).getAllFromIndex("queue", "taskId", taskId);
    // Expected: Should only return items where item.ownerId === current user
    // Actual: Returns all items for taskId regardless of ownerId
    // Security impact: User can see queued files from other accounts for same task
  });

  it("BASELINE BUG: flushAttachmentQueue captures uid once but upload uses current account each time", async () => {
    // BUG: attachmentUpload.ts lines 227-240
    // Code captures uid at line 227: const uid = auth.currentUser?.uid;
    // Then loops through items checking item.ownerId !== uid
    // But if user switches accounts during flush, the check uses stale uid
    // Expected: Should re-check auth.currentUser?.uid for each item
    // Actual: Uses captured uid from start of flush
    // Security impact: Files could be uploaded to wrong account after account switch
  });
});
