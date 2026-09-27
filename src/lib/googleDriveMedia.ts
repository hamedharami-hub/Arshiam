import appConfig from "../../firebase-applet-config.json";
import type { KnowledgeMediaAttachment } from "./knowledgeTypes";

const GOOGLE_IDENTITY_SCRIPT = "https://accounts.google.com/gsi/client";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";
const APP_FOLDER_NAME = "ARSHNAZ Lesson Media";
const APP_PROPERTY_KEY = "arshnazApp";
const APP_PROPERTY_VALUE = "knowledge-media";
const DRIVE_FILE_ID_PATTERN = /^[A-Za-z0-9_-]{5,200}$/;
const MEDIA_MIME_PATTERN = /^(image|video)\/[a-z0-9.+-]+$/i;
const DRIVE_UPLOAD_CHUNK_BYTES = 8 * 1024 * 1024; // 32 × Drive's 256 KiB chunk alignment.
const IDENTITY_SCRIPT_LOAD_TIMEOUT_MS = 15_000;

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

type GoogleTokenClient = {
  requestAccessToken: (options?: { prompt?: string }) => void;
};

type GoogleDriveIdentity = {
  accounts?: {
    oauth2?: {
      initTokenClient: (options: {
        client_id: string;
        scope: string;
        callback: (response: GoogleTokenResponse) => void;
        error_callback?: (error: { type?: string; message?: string }) => void;
      }) => GoogleTokenClient;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleDriveIdentity;
  }
}

export type GoogleDriveErrorCode =
  | "client_id_missing"
  | "identity_library_unavailable"
  | "authorization_cancelled"
  | "authorization_failed"
  | "authorization_expired"
  | "drive_api_disabled"
  | "drive_permission_denied"
  | "invalid_media"
  | "upload_failed"
  | "network_failed";

export class GoogleDriveMediaError extends Error {
  constructor(readonly code: GoogleDriveErrorCode, message?: string) {
    super(message || code);
    this.name = "GoogleDriveMediaError";
  }
}

type DriveApiErrorBody = {
  error?: {
    message?: string;
    status?: string;
    errors?: Array<{ reason?: string }>;
  };
};

type DriveFileResponse = {
  id?: string;
  name?: string;
  mimeType?: string;
  size?: string;
  createdTime?: string;
};

let identityScriptPromise: Promise<void> | null = null;

function getClientId(): string {
  return typeof appConfig.oAuthClientId === "string" ? appConfig.oAuthClientId.trim() : "";
}

function getIdentityApi() {
  return typeof window === "undefined" ? undefined : window.google?.accounts?.oauth2;
}

export function loadGoogleIdentityServices(): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return Promise.reject(new GoogleDriveMediaError("identity_library_unavailable"));
  }
  if (getIdentityApi()) return Promise.resolve();
  if (identityScriptPromise) return identityScriptPromise;

  identityScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    const ownsScriptElement = !existing;
    let settled = false;
    const timeoutId = window.setTimeout(
      () => finish(new GoogleDriveMediaError("identity_library_unavailable")),
      IDENTITY_SCRIPT_LOAD_TIMEOUT_MS,
    );
    const finish = (error?: GoogleDriveMediaError) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      script.removeEventListener("load", onLoad);
      script.removeEventListener("error", onError);
      if (error) {
        if (ownsScriptElement) script.remove();
        identityScriptPromise = null;
        reject(error);
      } else {
        resolve();
      }
    };
    const onLoad = () => {
      if (getIdentityApi()) finish();
      else finish(new GoogleDriveMediaError("identity_library_unavailable"));
    };
    const onError = () => finish(new GoogleDriveMediaError("identity_library_unavailable"));

    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
    if (!existing) {
      script.src = GOOGLE_IDENTITY_SCRIPT;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
  });

  return identityScriptPromise;
}

/** Must be called directly from a user gesture. The token is returned to the caller and never persisted. */
export function requestGoogleDriveAccessToken(): Promise<string> {
  const clientId = getClientId();
  if (!clientId) return Promise.reject(new GoogleDriveMediaError("client_id_missing"));
  const identity = getIdentityApi();
  if (!identity) return Promise.reject(new GoogleDriveMediaError("identity_library_unavailable"));

  return new Promise<string>((resolve, reject) => {
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new GoogleDriveMediaError("authorization_failed"));
    }, 120_000);
    const finish = (error?: GoogleDriveMediaError, token?: string) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      if (error) reject(error);
      else if (token) resolve(token);
      else reject(new GoogleDriveMediaError("authorization_failed"));
    };

    try {
      const tokenClient = identity.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (response) => {
          if (response.error) {
            finish(new GoogleDriveMediaError(
              response.error === "access_denied" ? "authorization_cancelled" : "authorization_failed",
              response.error_description,
            ));
            return;
          }
          finish(undefined, response.access_token);
        },
        error_callback: (error) => {
          finish(new GoogleDriveMediaError(
            error.type === "popup_closed" ? "authorization_cancelled" : "authorization_failed",
            error.message,
          ));
        },
      });
      // GIS shows account/consent UI only when needed; this method is invoked by the explicit Connect button.
      tokenClient.requestAccessToken({ prompt: "" });
    } catch (error) {
      finish(error instanceof GoogleDriveMediaError ? error : new GoogleDriveMediaError("authorization_failed"));
    }
  });
}

export function getGoogleDrivePreviewUrl(fileId: string): string | null {
  if (!DRIVE_FILE_ID_PATTERN.test(fileId)) return null;
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/preview`;
}

export function getGoogleDriveViewUrl(fileId: string): string | null {
  if (!DRIVE_FILE_ID_PATTERN.test(fileId)) return null;
  return `https://drive.google.com/file/d/${encodeURIComponent(fileId)}/view`;
}

function ensureAccessToken(accessToken: string): void {
  if (!accessToken.trim()) throw new GoogleDriveMediaError("authorization_expired");
}

function errorFromDriveResponse(status: number, body: DriveApiErrorBody): GoogleDriveMediaError {
  const reason = body.error?.errors?.map((item) => item.reason || "").join(" ").toLowerCase() || "";
  const message = (body.error?.message || "").toLowerCase();
  if (status === 401) return new GoogleDriveMediaError("authorization_expired");
  if (status === 403 && (
    reason.includes("accessnotconfigured") ||
    reason.includes("servicedisabled") ||
    message.includes("has not been used") ||
    message.includes("disabled")
  )) return new GoogleDriveMediaError("drive_api_disabled");
  if (status === 403) return new GoogleDriveMediaError("drive_permission_denied");
  if (status === 0 || status >= 500) return new GoogleDriveMediaError("network_failed");
  return new GoogleDriveMediaError("upload_failed");
}

async function parseDriveError(response: Response): Promise<GoogleDriveMediaError> {
  let body: DriveApiErrorBody = {};
  try {
    body = await response.json() as DriveApiErrorBody;
  } catch {
    // Some upload errors have an empty or non-JSON body.
  }
  return errorFromDriveResponse(response.status, body);
}

async function findOrCreateAppFolder(accessToken: string, signal?: AbortSignal): Promise<string> {
  const query = [
    `name = '${APP_FOLDER_NAME}'`,
    "mimeType = 'application/vnd.google-apps.folder'",
    "trashed = false",
    `appProperties has { key='${APP_PROPERTY_KEY}' and value='${APP_PROPERTY_VALUE}' }`,
  ].join(" and ");
  const params = new URLSearchParams({
    q: query,
    spaces: "drive",
    pageSize: "10",
    fields: "files(id,name)",
  });
  let response: Response;
  try {
    response = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GoogleDriveMediaError("network_failed");
  }
  if (!response.ok) throw await parseDriveError(response);
  const listing = await response.json() as { files?: Array<{ id?: string }> };
  const existingId = listing.files?.find((file) => typeof file.id === "string" && DRIVE_FILE_ID_PATTERN.test(file.id))?.id;
  if (existingId) return existingId;

  try {
    response = await fetch(`${DRIVE_API}/files?fields=id,name`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: APP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
        appProperties: { [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE },
      }),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GoogleDriveMediaError("network_failed");
  }
  if (!response.ok) throw await parseDriveError(response);
  const folder = await response.json() as { id?: string };
  if (!folder.id || !DRIVE_FILE_ID_PATTERN.test(folder.id)) throw new GoogleDriveMediaError("upload_failed");
  return folder.id;
}

function validateMedia(file: File): void {
  if (!(file instanceof File) || file.size <= 0 || !MEDIA_MIME_PATTERN.test(file.type)) {
    throw new GoogleDriveMediaError("invalid_media");
  }
  const hasControlCharacter = Array.from(file.name).some((character) => {
    const code = character.charCodeAt(0);
    return code < 32 || code === 127;
  });
  if (!file.name.trim() || file.name.length > 255 || hasControlCharacter) {
    throw new GoogleDriveMediaError("invalid_media");
  }
}

/** Uploads images/videos with Drive's resumable protocol and returns safe metadata only. */
export async function uploadGoogleDriveMedia(
  file: File,
  documentId: string,
  accessToken: string,
  signal?: AbortSignal,
  onProgress?: (uploadedBytes: number, totalBytes: number) => void,
): Promise<KnowledgeMediaAttachment> {
  validateMedia(file);
  if (!documentId.trim()) throw new GoogleDriveMediaError("invalid_media");
  ensureAccessToken(accessToken);

  try {
    const parentId = await findOrCreateAppFolder(accessToken, signal);
    const metadata = {
      name: file.name,
      mimeType: file.type,
      parents: [parentId],
      appProperties: {
        [APP_PROPERTY_KEY]: APP_PROPERTY_VALUE,
        arshnazDocumentId: documentId,
      },
    };
    const startUrl = `${DRIVE_UPLOAD_API}/files?uploadType=resumable&fields=id%2Cname%2CmimeType%2Csize%2CcreatedTime`;
    const startResponse = await fetch(startUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": file.type,
        "X-Upload-Content-Length": String(file.size),
      },
      body: JSON.stringify(metadata),
      signal,
    });
    if (!startResponse.ok) throw await parseDriveError(startResponse);

    const uploadUrl = startResponse.headers.get("Location");
    if (!uploadUrl) throw new GoogleDriveMediaError("upload_failed");
    const parsedUploadUrl = new URL(uploadUrl);
    if (parsedUploadUrl.origin !== "https://www.googleapis.com" || !parsedUploadUrl.pathname.startsWith("/upload/drive/v3/files")) {
      throw new GoogleDriveMediaError("upload_failed");
    }

    const sessionUrl = parsedUploadUrl.toString();
    const asAttachment = (uploaded: DriveFileResponse): KnowledgeMediaAttachment => {
      const sizeBytes = Number(uploaded.size ?? file.size);
      if (!uploaded.id || !DRIVE_FILE_ID_PATTERN.test(uploaded.id) ||
        !uploaded.name || !MEDIA_MIME_PATTERN.test(uploaded.mimeType || "") ||
        !Number.isSafeInteger(sizeBytes) || sizeBytes !== file.size) {
        throw new GoogleDriveMediaError("upload_failed");
      }
      return {
        provider: "google_drive",
        file_id: uploaded.id,
        name: uploaded.name,
        mime_type: uploaded.mimeType!,
        size_bytes: sizeBytes,
        added_at: uploaded.createdTime || new Date().toISOString(),
      };
    };
    const finishUpload = (uploaded: DriveFileResponse): KnowledgeMediaAttachment => {
      const attachment = asAttachment(uploaded);
      onProgress?.(file.size, file.size);
      return attachment;
    };
    const readUploadStatus = async (): Promise<{ offset: number; completed?: DriveFileResponse }> => {
      let statusResponse: Response;
      try {
        statusResponse = await fetch(sessionUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Range": `bytes */${file.size}`,
          },
          signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        throw new GoogleDriveMediaError("network_failed");
      }
      if (statusResponse.ok) {
        return { offset: file.size, completed: await statusResponse.json() as DriveFileResponse };
      }
      if (statusResponse.status === 308) {
        const range = statusResponse.headers.get("Range")?.match(/^bytes=0-(\d+)$/i);
        const lastAcceptedByte = range ? Number(range[1]) : -1;
        const offset = Number.isSafeInteger(lastAcceptedByte)
          ? Math.min(file.size, Math.max(0, lastAcceptedByte + 1))
          : 0;
        return { offset };
      }
      throw await parseDriveError(statusResponse);
    };

    let offset = 0;
    let retryWithoutProgress = 0;
    onProgress?.(0, file.size);
    while (offset < file.size) {
      const end = Math.min(offset + DRIVE_UPLOAD_CHUNK_BYTES, file.size);
      let uploadResponse: Response;
      try {
        uploadResponse = await fetch(sessionUrl, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": file.type,
            "Content-Range": `bytes ${offset}-${end - 1}/${file.size}`,
          },
          body: file.slice(offset, end),
          signal,
        });
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        if (retryWithoutProgress >= 2) throw new GoogleDriveMediaError("network_failed");
        const status = await readUploadStatus();
        if (status.completed) return finishUpload(status.completed);
        if (status.offset > offset) {
          offset = status.offset;
          retryWithoutProgress = 0;
          onProgress?.(offset, file.size);
        } else {
          retryWithoutProgress += 1;
        }
        continue;
      }

      if (uploadResponse.status === 308) {
        const range = uploadResponse.headers.get("Range")?.match(/^bytes=0-(\d+)$/i);
        const lastAcceptedByte = range ? Number(range[1]) : -1;
        const nextOffset = Number.isSafeInteger(lastAcceptedByte)
          ? Math.min(file.size, Math.max(0, lastAcceptedByte + 1))
          : 0;
        if (nextOffset <= offset) {
          if (retryWithoutProgress >= 2) throw new GoogleDriveMediaError("upload_failed");
          retryWithoutProgress += 1;
          continue;
        }
        offset = nextOffset;
        retryWithoutProgress = 0;
        onProgress?.(offset, file.size);
        if (offset === file.size) {
          const status = await readUploadStatus();
          if (status.completed) return finishUpload(status.completed);
          if (status.offset <= offset) throw new GoogleDriveMediaError("upload_failed");
          offset = status.offset;
        }
        continue;
      }

      if (uploadResponse.ok) {
        const uploaded = await uploadResponse.json() as DriveFileResponse;
        return finishUpload(uploaded);
      }

      if (uploadResponse.status >= 500) {
        if (retryWithoutProgress >= 2) throw new GoogleDriveMediaError("network_failed");
        const status = await readUploadStatus();
        if (status.completed) return finishUpload(status.completed);
        if (status.offset > offset) {
          offset = status.offset;
          retryWithoutProgress = 0;
          onProgress?.(offset, file.size);
        } else {
          retryWithoutProgress += 1;
        }
        continue;
      }

      throw await parseDriveError(uploadResponse);
    }

    const finalStatus = await readUploadStatus();
    if (finalStatus.completed) {
      return finishUpload(finalStatus.completed);
    }
    throw new GoogleDriveMediaError("upload_failed");
  } catch (error) {
    if (error instanceof GoogleDriveMediaError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GoogleDriveMediaError("network_failed");
  }
}

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

/** Lists only app-created media tagged to this lesson so interrupted saves can be recovered safely. */
export async function findUnlinkedGoogleDriveMedia(
  documentId: string,
  attachedFileIds: string[],
  accessToken: string,
  signal?: AbortSignal,
): Promise<KnowledgeMediaAttachment[]> {
  ensureAccessToken(accessToken);
  if (!documentId.trim()) throw new GoogleDriveMediaError("invalid_media");
  const query = [
    `appProperties has { key='arshnazDocumentId' and value='${escapeDriveQueryValue(documentId)}' }`,
    "trashed = false",
  ].join(" and ");
  const params = new URLSearchParams({
    q: query,
    spaces: "drive",
    pageSize: "100",
    fields: "files(id,name,mimeType,size,createdTime)",
  });
  let response: Response;
  try {
    response = await fetch(`${DRIVE_API}/files?${params.toString()}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new GoogleDriveMediaError("network_failed");
  }
  if (!response.ok) throw await parseDriveError(response);
  const result = await response.json() as { files?: DriveFileResponse[] };
  const attachedIds = new Set(attachedFileIds);
  return (result.files || []).flatMap((file) => {
    const sizeBytes = Number(file.size);
    if (!file.id || !DRIVE_FILE_ID_PATTERN.test(file.id) || attachedIds.has(file.id) ||
      !file.name || !MEDIA_MIME_PATTERN.test(file.mimeType || "") ||
      !Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return [];
    return [{
      provider: "google_drive" as const,
      file_id: file.id,
      name: file.name,
      mime_type: file.mimeType!,
      size_bytes: sizeBytes,
      added_at: file.createdTime || new Date().toISOString(),
    }];
  });
}

export function getGoogleDriveMediaErrorMessage(error: unknown, isEn: boolean): string {
  const code = error instanceof GoogleDriveMediaError ? error.code : "upload_failed";
  const messages: Record<GoogleDriveErrorCode, [string, string]> = {
    client_id_missing: ["شناسهٔ OAuth وب تنظیم نشده است؛ اتصال Drive فعلاً در دسترس نیست.", "Google Drive OAuth web client is not configured."],
    identity_library_unavailable: ["کتابخانهٔ امن ورود گوگل بارگذاری نشد؛ اتصال اینترنت و مسدودکننده‌ها را بررسی کنید.", "Google Identity Services could not load. Check your connection or browser blocking settings."],
    authorization_cancelled: ["اتصال لغو شد؛ هیچ فایلی بارگذاری نشد.", "Drive authorization was cancelled; no file was uploaded."],
    authorization_failed: ["اتصال Drive کامل نشد. دوباره تلاش کنید.", "Drive authorization did not complete. Please try again."],
    authorization_expired: ["اجازهٔ موقت Drive منقضی شده است؛ دوباره اتصال را تأیید کنید.", "The temporary Drive access expired. Reconnect and try again."],
    drive_api_disabled: ["Drive API در پروژهٔ Google Cloud فعال نیست یا هنوز منتشر نشده است.", "The Google Drive API is not enabled for this Google Cloud project."],
    drive_permission_denied: ["مجوز محدود drive.file داده نشد؛ اتصال را دوباره بررسی کنید.", "Drive denied the limited drive.file permission. Review the consent and OAuth setup."],
    invalid_media: ["فقط فایل تصویری یا ویدیوییِ معتبر و غیرخالی را انتخاب کنید.", "Choose a valid, non-empty image or video file."],
    upload_failed: ["بارگذاری یا ذخیرهٔ پیوند فایل ناموفق بود؛ وضعیت درس را دوباره بررسی کنید.", "Upload or lesson-link save failed. Check the lesson state before retrying."],
    network_failed: ["ارتباط با Drive قطع شد؛ فایل در این لحظه به درس اضافه نشد.", "Drive could not be reached. The file was not attached to this lesson."],
  };
  const message = messages[code];
  return message[isEn ? 1 : 0];
}
