import React, { useEffect, useRef, useState } from "react";
import { ExternalLink, FileVideo2, HardDrive, Image, Loader2, Link2Off, Plus, ShieldCheck, Upload, X } from "lucide-react";
import { toast } from "sonner";
import type { KnowledgeDocument, KnowledgeMediaAttachment } from "@/lib/knowledgeTypes";
import { updateKnowledgeDocumentWithPersistence } from "@/lib/knowledgeService";
import {
  getGoogleDriveMediaErrorMessage,
  getGoogleDrivePreviewUrl,
  getGoogleDriveViewUrl,
  findUnlinkedGoogleDriveMedia,
  loadGoogleIdentityServices,
  requestGoogleDriveAccessToken,
  uploadGoogleDriveMedia,
} from "@/lib/googleDriveMedia";

interface KnowledgeDriveAttachmentsProps {
  document: KnowledgeDocument;
  userId: string;
  isEn: boolean;
  onDocumentUpdated?: (document: KnowledgeDocument) => void;
}

function formatFileSize(bytes: number, isEn: boolean): string {
  const units = isEn ? ["B", "KB", "MB", "GB"] : ["بایت", "کیلوبایت", "مگابایت", "گیگابایت"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${new Intl.NumberFormat(isEn ? "en-AU" : "fa-IR", { maximumFractionDigits: 1 }).format(size)} ${units[unit]}`;
}

export const KnowledgeDriveAttachments: React.FC<KnowledgeDriveAttachmentsProps> = ({
  document,
  userId,
  isEn,
  onDocumentUpdated,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isIdentityReady, setIsIdentityReady] = useState(false);
  const [isIdentityLoading, setIsIdentityLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDetaching, setIsDetaching] = useState(false);
  const [isSearchingFiles, setIsSearchingFiles] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pendingAttachment, setPendingAttachment] = useState<KnowledgeMediaAttachment | null>(null);
  const [error, setError] = useState("");
  const [attachments, setAttachments] = useState<KnowledgeMediaAttachment[]>(document.attachments || []);
  const [unlinkedFiles, setUnlinkedFiles] = useState<KnowledgeMediaAttachment[]>([]);
  const isIdentityReadyRef = useRef(false);
  const accessTokenRef = useRef<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const hasDriveFiles = attachments.some(item => item.provider === "google_drive");

  useEffect(() => {
    setAttachments(document.attachments || []);
  }, [document.id, document.attachments]);

  useEffect(() => {
    setUnlinkedFiles([]);
    setPendingAttachment(null);
    setSelectedFile(null);
    setUploadProgress(0);
    abortControllerRef.current?.abort();
  }, [document.id]);

  useEffect(() => {
    accessTokenRef.current = null;
    setIsConnected(false);
  }, [userId]);

  useEffect(() => {
    if (!isOpen || isIdentityReadyRef.current) return;
    let active = true;
    setIsIdentityLoading(true);
    void loadGoogleIdentityServices()
      .then(() => {
        if (active) {
          isIdentityReadyRef.current = true;
          setIsIdentityReady(true);
        }
      })
      .catch((loadError) => {
        if (active) setError(getGoogleDriveMediaErrorMessage(loadError, isEn));
      })
      .finally(() => {
        if (active) setIsIdentityLoading(false);
      });
    return () => {
      active = false;
    };
  }, [isOpen, isEn]);

  useEffect(() => () => {
    accessTokenRef.current = null;
    abortControllerRef.current?.abort();
  }, []);

  const connectDrive = async () => {
    setError("");
    setIsConnecting(true);
    try {
      // The token request happens in this explicit click handler, not on page load.
      accessTokenRef.current = await requestGoogleDriveAccessToken();
      setIsConnected(true);
      toast.success(isEn ? "Google Drive connected for this tab session" : "Drive تا پایان این نشست مرورگر متصل شد");
    } catch (connectError) {
      accessTokenRef.current = null;
      setIsConnected(false);
      setError(getGoogleDriveMediaErrorMessage(connectError, isEn));
    } finally {
      setIsConnecting(false);
    }
  };

  const findPreviousUploads = async () => {
    const token = accessTokenRef.current;
    if (!token) {
      setIsConnected(false);
      setError(isEn ? "Reconnect Google Drive before searching." : "برای جست‌وجو دوباره Drive را متصل کنید.");
      return;
    }
    setError("");
    setIsSearchingFiles(true);
    try {
      const files = await findUnlinkedGoogleDriveMedia(
        document.id,
        attachments.map((attachment) => attachment.file_id),
        token,
      );
      setUnlinkedFiles(files);
      if (files.length === 0) {
        toast.info(isEn ? "No unlinked uploads were found for this lesson" : "فایلِ پیوندنشده‌ای برای این درس پیدا نشد");
      }
    } catch (searchError) {
      if ((searchError as { code?: string })?.code === "authorization_expired") {
        accessTokenRef.current = null;
        setIsConnected(false);
      }
      setError(getGoogleDriveMediaErrorMessage(searchError, isEn));
    } finally {
      setIsSearchingFiles(false);
    }
  };

  const persistAttachment = async (attachment: KnowledgeMediaAttachment) => {
    const nextAttachments = [
      ...attachments.filter((item) => item.file_id !== attachment.file_id),
      attachment,
    ];
    const { document: updated, persistence } = await updateKnowledgeDocumentWithPersistence(
      userId,
      document.id,
      { attachments: nextAttachments },
    );
    setAttachments(updated.attachments || nextAttachments);
    setPendingAttachment(null);
    setSelectedFile(null);
    setUnlinkedFiles((files) => files.filter((item) => item.file_id !== attachment.file_id));
    if (fileInputRef.current) fileInputRef.current.value = "";
    onDocumentUpdated?.(updated);
    if (persistence === "queued") {
      toast.info(isEn
        ? "Media attached on this device; waiting to sync to the cloud."
        : "رسانه در این دستگاه به درس پیوند شد؛ در انتظار همگام‌سازی ابری است.");
    } else {
      toast.success(isEn ? "Media attached to the lesson" : "رسانه به درس پیوند شد");
    }
  };

  const uploadSelectedFile = async () => {
    if (pendingAttachment) {
      setError("");
      setIsUploading(true);
      try {
        await persistAttachment(pendingAttachment);
      } catch {
        setError(isEn
          ? "The file is already in Drive, but saving its lesson link failed. Retry; the file has not been deleted."
          : "فایل در Drive بارگذاری شده، اما ذخیرهٔ پیوند آن در درس ناموفق بود. دوباره تلاش کنید؛ فایل حذف نشده است.");
      } finally {
        setIsUploading(false);
      }
      return;
    }

    const token = accessTokenRef.current;
    if (!token) {
      setIsConnected(false);
      setError(isEn ? "Reconnect Google Drive before uploading." : "پیش از بارگذاری دوباره Drive را متصل کنید.");
      return;
    }
    if (!selectedFile) {
      setError(isEn ? "Choose an image or video first." : "ابتدا یک تصویر یا ویدیو انتخاب کنید.");
      return;
    }
    if (!userId || userId === "guest") {
      setError(isEn ? "Sign in to ARSHNAZ before attaching lesson media." : "برای افزودن رسانه، ابتدا وارد حساب ARSHNAZ شوید.");
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    setError("");
    setUploadProgress(0);
    setIsUploading(true);
    try {
      const uploaded = await uploadGoogleDriveMedia(
        selectedFile,
        document.id,
        token,
        controller.signal,
        (uploadedBytes, totalBytes) => {
          setUploadProgress(totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0);
        },
      );
      setPendingAttachment(uploaded);
      await persistAttachment(uploaded);
    } catch (uploadError) {
      if (uploadError instanceof DOMException && uploadError.name === "AbortError") {
        setError(isEn ? "Upload cancelled. No lesson link was saved." : "بارگذاری لغو شد؛ پیوندی در درس ذخیره نشد.");
      } else if ((uploadError as { code?: string })?.code === "authorization_expired") {
        accessTokenRef.current = null;
        setIsConnected(false);
        setError(getGoogleDriveMediaErrorMessage(uploadError, isEn));
      } else {
        setError(getGoogleDriveMediaErrorMessage(uploadError, isEn));
      }
    } finally {
      if (abortControllerRef.current === controller) abortControllerRef.current = null;
      setIsUploading(false);
    }
  };

  const detachAttachment = async (fileId: string) => {
    setError("");
    setIsDetaching(true);
    try {
      const nextAttachments = attachments.filter((item) => item.file_id !== fileId);
      const { document: updated, persistence } = await updateKnowledgeDocumentWithPersistence(
        userId,
        document.id,
        { attachments: nextAttachments },
      );
      setAttachments(updated.attachments || nextAttachments);
      onDocumentUpdated?.(updated);
      if (persistence === "queued") {
        toast.info(isEn
          ? "Removed on this device; waiting to sync. The Drive file was kept."
          : "از این دستگاه جدا شد و در انتظار همگام‌سازی است؛ فایل در Drive باقی ماند.");
      } else {
        toast.success(isEn
          ? "Removed from this lesson; the Drive file was kept"
          : "از این درس جدا شد؛ فایل در Drive باقی ماند");
      }
    } catch (detachError) {
      setError(isEn
        ? `The lesson link could not be removed. The Drive file was kept. ${getGoogleDriveMediaErrorMessage(detachError, isEn)}`
        : `پیوند درس حذف نشد؛ فایل در Drive باقی ماند. ${getGoogleDriveMediaErrorMessage(detachError, isEn)}`);
    } finally {
      setIsDetaching(false);
    }
  };

  return (
    <section className="mb-3" aria-label={isEn ? "Google Drive lesson media" : "رسانهٔ درس در Google Drive"}>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => {
            setError("");
            setIsOpen((open) => !open);
          }}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={isOpen ? (isEn ? "Close media" : "بستن رسانه‌ها") : (isEn ? "Add or view lesson media" : "افزودن یا دیدن رسانه‌های درس")}
          title={isOpen ? (isEn ? "Close media" : "بستن رسانه‌ها") : (isEn ? "Add or view lesson media" : "افزودن یا دیدن رسانه‌های درس")}
        >
          {isOpen ? <X className="h-4 w-4" aria-hidden="true" /> : <Plus className="h-4 w-4" aria-hidden="true" />}
        </button>
        <span className="relative inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary" aria-label={isEn ? `${attachments.length} lesson media files` : `${attachments.length} رسانهٔ درس`} title={isEn ? "Lesson media" : "رسانه‌های درس"}>
          <Image className="h-4 w-4" aria-hidden="true" />
          {hasDriveFiles && <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">{attachments.length}</span>}
        </span>
      </div>

      {isOpen && (
        <div className="mt-2 space-y-3 rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
          {userId && userId !== "guest" ? (
            <div className="flex flex-wrap items-center gap-2">
              {!isConnected ? (
                <button
                  type="button"
                  disabled={isIdentityLoading || isConnecting || !isIdentityReady}
                  onClick={() => void connectDrive()}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3.5 py-2 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {isIdentityLoading || isConnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
                  {isIdentityLoading
                    ? isEn ? "Preparing Google connection…" : "در حال آماده‌سازی اتصال گوگل…"
                    : isConnecting
                      ? isEn ? "Waiting for Google…" : "در انتظار پاسخ گوگل…"
                      : isEn ? "Connect Google Drive" : "اتصال Google Drive"}
                </button>
              ) : (
                <div className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-800 dark:text-emerald-200">
                  <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                  {isEn ? "Connected for this tab session" : "متصل در این نشست مرورگر"}
                </div>
              )}

              {isConnected && (
                <>
                  <button
                    type="button"
                    disabled={isSearchingFiles || isUploading || isDetaching}
                    onClick={() => void findPreviousUploads()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
                  >
                    {isSearchingFiles ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4 text-primary" />}
                    {isSearchingFiles
                      ? isEn ? "Searching Drive…" : "در حال جست‌وجو در Drive…"
                      : isEn ? "Find previous uploads" : "یافتن بارگذاری‌های قبلی"}
                  </button>
                  <label className={`inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition hover:bg-muted focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ${isUploading ? "pointer-events-none opacity-50" : ""}`}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*,video/*"
                      aria-label={isEn ? "Choose image or video" : "انتخاب تصویر یا ویدیو"}
                      className="sr-only"
                      disabled={isUploading || Boolean(pendingAttachment)}
                      onChange={(event) => {
                        setError("");
                        setUploadProgress(0);
                        setSelectedFile(event.target.files?.[0] || null);
                      }}
                    />
                    <Plus className="h-4 w-4 text-primary" aria-hidden="true" />
                    {isEn ? "Choose image/video" : "انتخاب تصویر/ویدیو"}
                  </label>
                  {selectedFile && !pendingAttachment && (
                    <span className="max-w-full truncate rounded-lg bg-muted px-2.5 py-2 text-xs text-foreground" title={selectedFile.name}>
                      {selectedFile.name} · {formatFileSize(selectedFile.size, isEn)}
                    </span>
                  )}
                  {(selectedFile || pendingAttachment) && (
                    <button
                      type="button"
                      disabled={isUploading}
                      onClick={() => void uploadSelectedFile()}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/30 bg-primary/10 px-3 py-2 text-xs font-bold text-primary transition hover:bg-primary/15 disabled:opacity-50"
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      {isUploading
                        ? pendingAttachment
                          ? isEn ? "Saving lesson link…" : "در حال ذخیرهٔ پیوند درس…"
                          : isEn ? `Uploading ${uploadProgress}%…` : `بارگذاری ${new Intl.NumberFormat("fa-IR").format(uploadProgress)}٪…`
                        : pendingAttachment
                          ? isEn ? "Retry linking to lesson" : "تلاش دوباره برای پیوند به درس"
                          : isEn ? "Upload and attach" : "بارگذاری و پیوند به درس"}
                    </button>
                  )}
                  {isUploading && !pendingAttachment && (
                    <div
                      className="w-full space-y-1.5"
                      role="progressbar"
                      aria-label={isEn ? "Google Drive upload progress" : "پیشرفت بارگذاری Google Drive"}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={uploadProgress}
                    >
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>{isEn ? "Uploading to Drive" : "بارگذاری در Drive"}</span>
                        <span>{new Intl.NumberFormat(isEn ? "en-AU" : "fa-IR").format(uploadProgress)}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${uploadProgress}%` }} />
                      </div>
                    </div>
                  )}
                  {isUploading && !pendingAttachment && (
                    <button
                      type="button"
                      onClick={() => abortControllerRef.current?.abort()}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      {isEn ? "Cancel upload" : "لغو بارگذاری"}
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <p role="status" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-5 text-foreground">
              {isEn ? "Sign in to ARSHNAZ to attach lesson media." : "برای افزودن رسانه به درس، وارد ARSHNAZ شوید."}
            </p>
          )}

          {pendingAttachment && (
            <p role="status" className="rounded-xl border border-amber-400/30 bg-amber-500/10 p-3 text-xs leading-5 text-foreground">
              {isEn
                ? "The upload reached Drive, but its link is not yet saved in this lesson. Retry linking; the Drive file is being kept."
                : "فایل در Drive بارگذاری شده، اما پیوند آن هنوز در درس ذخیره نشده است. برای ذخیره دوباره تلاش کنید؛ فایل حذف نمی‌شود."}
            </p>
          )}

          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-xs leading-5 text-destructive">{error}</p>}

          {hasDriveFiles && (
            <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
              {attachments.filter(item => item.provider === "google_drive").map((attachment) => {
                const previewUrl = getGoogleDrivePreviewUrl(attachment.file_id);
                const viewUrl = getGoogleDriveViewUrl(attachment.file_id);
                const isVideo = attachment.mime_type.startsWith("video/");
                return (
                  <li key={attachment.file_id} className="min-w-0 rounded-xl border border-border bg-background p-3">
                    <div className="flex items-start gap-2.5">
                      <span className="mt-0.5 text-primary">
                        {isVideo ? <FileVideo2 className="h-4 w-4" aria-hidden="true" /> : <Image className="h-4 w-4" aria-hidden="true" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="break-words text-xs font-semibold leading-5 text-foreground">{attachment.name}</p>
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {isVideo ? isEn ? "Video" : "ویدیو" : isEn ? "Image" : "تصویر"} · {formatFileSize(attachment.size_bytes, isEn)}
                        </p>
                      </div>
                      {viewUrl && (
                        <a
                          href={viewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-lg px-2 text-[11px] font-semibold text-primary hover:bg-primary/5"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                          {isEn ? "Drive" : "Drive"}
                        </a>
                      )}
                    </div>
                    {previewUrl && (
                      <details className="mt-2 rounded-lg border border-border/70">
                        <summary className="cursor-pointer px-3 py-2 text-[11px] font-semibold text-muted-foreground">
                          {isEn ? "Preview in lesson" : "پیش‌نمایش در درس"}
                        </summary>
                        <div className="aspect-video overflow-hidden rounded-b-lg bg-muted">
                          <iframe
                            title={`${isEn ? "Preview" : "پیش‌نمایش"}: ${attachment.name}`}
                            src={previewUrl}
                            className="h-full w-full border-0"
                            loading="lazy"
                            allow="autoplay; fullscreen"
                            allowFullScreen
                          />
                        </div>
                      </details>
                    )}
                    <button
                      type="button"
                      disabled={isDetaching || !userId || userId === "guest"}
                      onClick={() => void detachAttachment(attachment.file_id)}
                      className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[11px] font-medium text-muted-foreground transition hover:bg-destructive/5 hover:text-destructive disabled:opacity-50"
                    >
                      {isDetaching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Link2Off className="h-3.5 w-3.5" aria-hidden="true" />}
                      {isEn ? "Detach from lesson" : "جداکردن از درس"}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {unlinkedFiles.length > 0 && (
            <div className="space-y-2 rounded-xl border border-amber-400/30 bg-amber-500/5 p-3">
              <p className="text-xs font-semibold text-foreground">
                {isEn ? "Uploads not linked to this lesson" : "بارگذاری‌هایی که هنوز به این درس پیوند نشده‌اند"}
              </p>
              <ul className="space-y-2">
                {unlinkedFiles.map((attachment) => (
                  <li key={attachment.file_id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background p-2.5">
                    <span className="min-w-0 flex-1 break-words text-xs text-foreground">
                      {attachment.name} · {formatFileSize(attachment.size_bytes, isEn)}
                    </span>
                    <button
                      type="button"
                      disabled={isUploading || isSearchingFiles || isDetaching}
                      onClick={() => {
                        setError("");
                        setIsUploading(true);
                        void persistAttachment(attachment)
                          .catch((linkError) => setError(getGoogleDriveMediaErrorMessage(linkError, isEn)))
                          .finally(() => setIsUploading(false));
                      }}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary/10 px-2.5 py-1.5 text-[11px] font-bold text-primary hover:bg-primary/15 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      {isEn ? "Attach to lesson" : "پیوند به درس"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
