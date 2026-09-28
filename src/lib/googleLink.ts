import { Capacitor } from "@capacitor/core";
import { arshFetch, ArshApiError } from "@/lib/arshApi";
import type { RemoteAttachment } from "@/lib/attachmentUpload";

export type GoogleStatus = { configured: boolean; picker_ready: boolean; connected: boolean; email?: string | null; connected_at?: string | null };
type ImportResult = { items: RemoteAttachment[]; errors: Array<{ detail: string }> };

export const getGoogleStatus = () => arshFetch<GoogleStatus>("/api/arsh/google/status");

export function openExternal(url: string) {
  // Capacitor opens external URLs in the system browser (Google blocks OAuth inside WebViews).
  window.open(url, Capacitor.isNativePlatform() ? "_system" : "_blank", "noopener");
}

export async function connectGoogle(): Promise<void> {
  const platform = Capacitor.isNativePlatform() ? "android" : "web";
  const { authorization_url } = await arshFetch<{ authorization_url: string }>("/api/arsh/google/connect", {
    method: "POST", body: JSON.stringify({ platform }),
  });
  if (platform === "web") window.location.assign(authorization_url);
  else openExternal(authorization_url);
}

export const disconnectGoogle = () => arshFetch("/api/arsh/google/disconnect", { method: "POST" });

export const uploadAttachmentToDrive = (attachmentId: string) =>
  arshFetch<{ drive_file_id: string; web_view_link?: string }>("/api/arsh/google/drive/upload", {
    method: "POST", body: JSON.stringify({ attachment_id: attachmentId }),
  });

// ---------- Drive: Google Picker ----------

type PickerDoc = { id: string };
declare global {
  interface Window { gapi?: any; google?: any }
}

let pickerLoader: Promise<void> | null = null;
function loadPicker(): Promise<void> {
  if (window.google?.picker) return Promise.resolve();
  pickerLoader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://apis.google.com/js/api.js";
    s.onload = () => window.gapi.load("picker", { callback: () => resolve(), onerror: () => reject(new Error("picker")) });
    s.onerror = () => { pickerLoader = null; reject(new ArshApiError(0, "Google Picker could not load")); };
    document.head.appendChild(s);
  });
  return pickerLoader;
}

export async function pickFromDrive(): Promise<string[]> {
  const cfg = await arshFetch<{ access_token: string; api_key: string; app_id: string }>("/api/arsh/google/picker-config");
  await loadPicker();
  const gp = window.google.picker;
  return new Promise<string[]>((resolve) => {
    const picker = new gp.PickerBuilder()
      .addView(new gp.DocsView().setIncludeFolders(false))
      .enableFeature(gp.Feature.MULTISELECT_ENABLED)
      .setOAuthToken(cfg.access_token)
      .setDeveloperKey(cfg.api_key)
      .setAppId(cfg.app_id)
      .setCallback((data: { action: string; docs?: PickerDoc[] }) => {
        if (data.action === gp.Action.PICKED) resolve((data.docs || []).map((d) => d.id));
        else if (data.action === gp.Action.CANCEL) resolve([]);
      })
      .build();
    picker.setVisible(true);
  });
}

export const importDriveFiles = (taskId: string, fileIds: string[]) =>
  arshFetch<ImportResult>("/api/arsh/google/drive/import", { method: "POST", body: JSON.stringify({ task_id: taskId, file_ids: fileIds }) });

// ---------- Photos: Picker API session ----------

const secs = (v?: string) => (v ? parseFloat(v) : 0);

export async function pickFromPhotos(taskId: string, signal?: AbortSignal): Promise<ImportResult> {
  const session = await arshFetch<{ id: string; picker_uri: string; polling: { pollInterval?: string; timeoutIn?: string } }>(
    "/api/arsh/google/photos/session", { method: "POST" },
  );
  openExternal(session.picker_uri);
  const interval = Math.max(2, secs(session.polling.pollInterval) || 3) * 1000;
  const deadline = Date.now() + (secs(session.polling.timeoutIn) || 600) * 1000;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new DOMException("aborted", "AbortError");
    await new Promise((r) => setTimeout(r, interval));
    const s = await arshFetch<{ done: boolean }>(`/api/arsh/google/photos/session/${encodeURIComponent(session.id)}`);
    if (s.done) {
      return arshFetch<ImportResult>("/api/arsh/google/photos/import", {
        method: "POST", body: JSON.stringify({ task_id: taskId, session_id: session.id }),
      });
    }
  }
  throw new ArshApiError(408, "timeout");
}
