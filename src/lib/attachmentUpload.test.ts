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
