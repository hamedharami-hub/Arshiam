import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import {
  Blocks, Check, Code2, Copy, Download, Eye, FileUp, Lightbulb,
  History, LayoutTemplate, Loader2, Play, Plus, Save, ShieldCheck, Trash2,
} from "lucide-react";
import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useBilingual } from "@/hooks/useBilingual";
import { bindCloudState, type CloudBinding } from "@/lib/cloudStateSync";
import {
  applyMiniAppsCloud, createMiniAppId, loadMiniApps, MAX_MINI_APP_HTML_BYTES,
  MINI_APPS_UPDATED_EVENT, readMiniAppsSnapshot,
  saveMiniAppsLocal, type MiniApp,
} from "@/lib/miniAppsStore";
import { buildMiniAppPreview, type MiniAppContext } from "@/lib/miniAppsSandbox";
import { inspectMiniAppHtml, unwrapHtmlCodeFence, type HtmlWarning } from "@/lib/miniAppsHtml";
import { toast } from "sonner";
import { HtmlCodeEditor } from "@/components/mini-apps/HtmlCodeEditor";
import { MiniAppHistoryDialog } from "@/components/mini-apps/MiniAppHistoryDialog";
import { MiniAppPreviewControls, MiniAppPreviewViewport, type MiniAppDevice } from "@/components/mini-apps/MiniAppPreviewViewport";
import { MINI_APP_TEMPLATES, buildMiniAppTemplate, type MiniAppTemplateId } from "@/lib/miniAppsTemplates";
import { previewLocationToSource } from "@/lib/miniAppsEditing";
import {
  MINI_APPS_HISTORY_EVENT, applyMiniAppsHistoryCloud, loadMiniAppsHistory,
  readMiniAppsHistorySnapshot, reconcileMiniAppsHistory, recordMiniAppVersions,
  removeMiniAppHistory, type MiniAppVersion, type MiniAppsHistoryState, type VersionKind,
} from "@/lib/miniAppsHistory";

type BridgeAction =
  ({ kind: "copyText"; text: string }
  | { kind: "createTask"; title: string; description: string }) & { token: string; userId: string };

const STARTER_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ابزارک تازه</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font: 16px/1.7 system-ui, sans-serif; }
    main { max-width: 720px; margin: 8vh auto; padding: 24px; border: 1px solid hsl(var(--line)); border-radius: 20px; background: hsl(var(--surface)); color: hsl(var(--ink)); }
    button { border: 0; border-radius: 12px; padding: 10px 16px; background: hsl(var(--accent)); color: white; font: inherit; cursor: pointer; }
  </style>
</head>
<body>
  <main>
    <h1>ابزارک من</h1>
    <p>این صفحه را با HTML، CSS و JavaScript کامل کن.</p>
    <button id="copy">کپی یک متن آزمایشی</button>
    <button id="task">ساخت یک کار</button>
  </main>
  <script>
    const theme = window.Arshiam.getContext();
    document.documentElement.lang = theme.language;
    document.documentElement.dir = theme.direction;
    document.documentElement.style.setProperty('--surface', theme.colors.surface);
    document.documentElement.style.setProperty('--ink', theme.colors.foreground);
    document.documentElement.style.setProperty('--line', theme.colors.border);
    document.documentElement.style.setProperty('--accent', theme.colors.primary);
    document.getElementById('copy').addEventListener('click', () => window.Arshiam.copyText('متن آمادهٔ کپی'));
    document.getElementById('task').addEventListener('click', () => window.Arshiam.createTask({ title: 'کار ساخته‌شده از ابزارک' }));
  </script>
</body>
</html>`;

function readThemeContext(isEn: boolean): MiniAppContext {
  const root = document.documentElement;
  const style = getComputedStyle(root);
  const css = (key: string, fallback: string) => style.getPropertyValue(key).trim() || fallback;
  const language = (root.lang || (isEn ? "en" : "fa")).startsWith("en") ? "en" : "fa";
  return {
    language,
    direction: (root.dir === "ltr" || language === "en") ? "ltr" : "rtl",
    theme: root.classList.contains("dark") ? "dark" : "light",
    colors: {
      background: css("--background", "0 0% 100%"),
      foreground: css("--foreground", "222 47% 11%"),
      surface: css("--card", css("--background", "0 0% 100%")),
      primary: css("--primary", "222 47% 11%"),
      muted: css("--muted", "210 40% 96%"),
      border: css("--border", "214 32% 91%"),
      radius: css("--radius", "0.75rem"),
    },
  };
}

function buildAiPrompt(app: MiniApp | null, isEn: boolean): string {
  const request = app?.aiRequest?.trim();
  const source = app?.html?.trim();
  if (isEn) {
    return [
      "You are building a small, self-contained HTML tool for the Arshiam task app's personal code library.",
      "Return one complete HTML file only. Do not use Markdown fences or explanations outside the file.",
      "Make the interface polished, responsive, accessible, and usable on a phone. Support Persian and RTL when the user's language is Persian; do not hard-code layout direction when the app context can provide it.",
      "Use inline CSS and JavaScript. Do not load packages, fonts, images, scripts, or styles from the network. Do not use fetch, XMLHttpRequest, WebSocket, service workers, localStorage, cookies, eval, or dynamic code loading. Keep all tool data within this page.",
      "The page runs in an isolated sandbox. The only app integration is window.Arshiam: getContext() returns language, direction, theme, and color tokens; copyText(text) asks the app to confirm before copying; createTask({title, description}) asks the app to confirm and opens its normal task form. Do not assume any other app API or direct database access.",
      "Native form submission is disabled. Use type=button and explicit click or Enter key handlers for tool actions; do not rely on submit events. Keep the complete file within 120,000 UTF-8 bytes.",
      "Use the app's colors from getContext() where helpful. Color token values are HSL components, so use them as hsl(value), for example hsl(context.colors.primary). Prefer graceful behavior if an integration method is unavailable.",
      "The muted color token is a background color, not muted text. Use foreground or another contrasting text color for readable hints and descriptions.",
      request ? `USER'S REQUEST:\n${request}` : "USER'S REQUEST: Create a useful small or medium tool based on the context above.",
      source ? `CURRENT HTML TO IMPROVE (preserve its existing useful behavior unless the request asks otherwise):\n${source}` : "There is no existing HTML to preserve.",
    ].join("\n\n");
  }
  return [
    "تو برای کتابخانهٔ شخصی کد در برنامهٔ مدیریت کار «ارشیام» یک ابزارک HTML کوچک یا متوسط می‌سازی.",
    "خروجی را فقط به صورت یک فایل کامل HTML بده؛ توضیح بیرون از فایل، قالب‌بندی مارک‌داون و حصار کد ننویس.",
    "رابط را تمیز، امروزی، واکنش‌گرا، دسترس‌پذیر و مناسب گوشی طراحی کن. زبان و جهت فارسی و راست‌به‌چپ را پشتیبانی کن؛ جهت صفحه را در صورت امکان از زمینهٔ برنامه بگیر و متن را به زبان کاربر نمایش بده.",
    "همهٔ CSS و JavaScript باید داخل همان فایل باشد. کتابخانه، قلم، تصویر، اسکریپت یا سبک را از اینترنت بارگیری نکن. از fetch، XMLHttpRequest، WebSocket، service worker، localStorage، کوکی، eval و بارگذاری پویای کد استفاده نکن. دادهٔ ابزارک فقط در خود صفحه بماند.",
    "صفحه در محیط جدا و محدود اجرا می‌شود. تنها راه ارتباط با برنامه، window.Arshiam است: getContext() زبان، جهت، پوسته و رنگ‌ها را می‌دهد؛ copyText(text) از برنامه درخواست کپی می‌کند و برنامه پیش از کپی از کاربر تأیید می‌گیرد؛ createTask({title, description}) از برنامه می‌خواهد پس از تأیید، فرم معمول افزودن کار را باز کند. هیچ رابط دیگری برای برنامه یا دسترسی مستقیم به داده‌ها وجود ندارد.",
    "ارسال native فرم مجاز نیست. عملیات ابزارک را با دکمه type=button و رویداد click یا Enter انجام بده و به submit تکیه نکن. حجم فایل کامل حداکثر ۱۲۰٬۰۰۰ بایت UTF-8 باشد.",
    "در صورت نیاز از رنگ‌های getContext() استفاده کن. مقدار رنگ‌ها اجزای HSL است و باید به شکل hsl(value) در CSS قرار بگیرد؛ مثلاً hsl(context.colors.primary). اگر یکی از رابط‌های برنامه در دسترس نبود، ابزارک باید بدون خطا به کار خود ادامه دهد.",
    "رنگ muted مخصوص زمینه است، نه متن کم‌رنگ. برای توضیحات و نکته‌ها از foreground یا رنگ متن با کنتراست خوانا استفاده کن.",
    request ? `درخواست من:\n${request}` : "درخواست من: بر اساس توضیح بالا یک ابزار کوچک و کاربردی بساز.",
    source ? `کد HTML فعلی برای بهبود (رفتارهای مفید فعلی را نگه دار، مگر درخواست تغییرشان را بخواهد):\n${source}` : "کد HTML قبلی وجود ندارد.",
  ].join("\n\n");
}

function randomToken(): string {
  try { return crypto.randomUUID(); }
  catch { return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`; }
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  textarea.remove();
  if (!copied) throw new Error("Clipboard permission unavailable");
}

function fileBaseName(value: string): string {
  return value.replace(/\.html?$/i, "").replace(/[\\/:*?"<>|]/g, "-").trim().slice(0, 64) || "mini-app";
}

const DRAFT_STORAGE_PREFIX = "arshnaz_mini_app_draft_v1_";

const draftStorageKey = (userId: string, appId: string) => `${DRAFT_STORAGE_PREFIX}${userId}_${appId}`;

/** Keep the in-progress edit on this device so leaving the route never loses it. */
function readStoredDraft(userId: string, appId: string): MiniApp | null {
  try {
    const raw = localStorage.getItem(draftStorageKey(userId, appId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MiniApp;
    if (!parsed || typeof parsed !== "object" || parsed.id !== appId ||
      ![parsed.html, parsed.name, parsed.emoji, parsed.description, parsed.aiRequest, parsed.createdAt, parsed.updatedAt].every(value => typeof value === "string")) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeStoredDraft(userId: string, app: MiniApp): boolean {
  try {
    const serialized = JSON.stringify(app);
    localStorage.setItem(draftStorageKey(userId, app.id), serialized);
    return localStorage.getItem(draftStorageKey(userId, app.id)) === serialized;
  } catch {
    return false;
  }
}

function clearStoredDraft(userId: string, appId: string): void {
  try {
    localStorage.removeItem(draftStorageKey(userId, appId));
  } catch {
    // ignore
  }
}

function draftDiffersFromSaved(draft: MiniApp, saved: MiniApp): boolean {
  return draft.html !== saved.html || draft.name !== saved.name || draft.emoji !== saved.emoji ||
    draft.description !== saved.description || draft.aiRequest !== saved.aiRequest;
}

export default function MiniAppsView() {
  const { user, loading: authLoading } = useAuth();
  const { T, isEn } = useBilingual();
  const languageRef = useRef(isEn);
  languageRef.current = isEn;
  const navigate = useNavigate();
  const [items, setItems] = useState<MiniApp[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MiniApp | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [retentionFailed, setRetentionFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"run" | "edit">("run");
  const viewModeRef = useRef<"run" | "edit">("run");
  const [previewSnapshot, setPreviewSnapshot] = useState<MiniApp | null>(null);
  const [bridgeAction, setBridgeAction] = useState<BridgeAction | null>(null);
  const [busy, setBusy] = useState(false);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteName, setPasteName] = useState("");
  const [pasteSource, setPasteSource] = useState("");
  const [previewErrors, setPreviewErrors] = useState<{ message: string; line: number; column: number }[]>([]);
  const [templateOpen, setTemplateOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyState, setHistoryState] = useState<MiniAppsHistoryState>({ versions: [], deletedApps: [] });
  const [historyWarning, setHistoryWarning] = useState("");
  const [previewDevice, setPreviewDevice] = useState<MiniAppDevice>("fit");
  const [editorJump, setEditorJump] = useState<{ line: number; column: number; requestId: number } | null>(null);
  const bindingRef = useRef<CloudBinding | null>(null);
  const historyBindingRef = useRef<CloudBinding | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewTokenRef = useRef("");
  const bridgeActionRef = useRef<BridgeAction | null>(null);
  const bridgeCooldownUntilRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  const durableDraftRef = useRef(true);
  const itemsRef = useRef(items);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const userIdRef = useRef(user?.id);
  userIdRef.current = user?.id;
  const importGenerationRef = useRef(0);
  const libraryGenerationRef = useRef(0);
  const savingLocallyRef = useRef(false);
  const invalidateImports = useCallback(() => { importGenerationRef.current++; }, []);
  const setLibrary = useCallback((next: MiniApp[]) => {
    itemsRef.current = next;
    setItems(next);
  }, []);

  const t = useCallback((fa: string, en: string) => T(fa, en), [T]);
  const clearBridgeAction = useCallback(() => {
    bridgeActionRef.current = null;
    bridgeCooldownUntilRef.current = Date.now() + 1_000;
    setBridgeAction(null);
  }, []);
  const setActive = useCallback((app: MiniApp | null, edit = false) => {
    clearBridgeAction();
    setPreviewErrors([]);
    setHistoryOpen(false);
    setEditorJump(null);
    bridgeCooldownUntilRef.current = 0;
    selectedIdRef.current = app?.id || null;
    setSelectedId(app?.id || null);
    const stored = app && user?.id ? readStoredDraft(user.id, app.id) : null;
    const next = stored ?? (app ? { ...app } : null);
    const restoredDirty = Boolean(stored && app && draftDiffersFromSaved(stored, app));
    if (stored && app && !restoredDirty && user?.id) clearStoredDraft(user.id, app.id);
    setDraft(next);
    setDirty(restoredDirty);
    dirtyRef.current = restoredDirty;
    durableDraftRef.current = true;
    setRetentionFailed(false);
    const nextMode = restoredDirty || edit ? "edit" : "run";
    viewModeRef.current = nextMode;
    setViewMode(nextMode);
    if (next && nextMode === "run" && !inspectMiniAppHtml(next.html).issue) {
      const token = randomToken();
      previewTokenRef.current = token;
      setPreviewDocument(buildMiniAppPreview(next.html, token, readThemeContext(languageRef.current)));
      setPreviewSnapshot({ ...next });
      setPreviewVersion((version) => version + 1);
    } else {
      setPreviewDocument("");
      setPreviewSnapshot(null);
      previewTokenRef.current = "";
    }
  }, [clearBridgeAction, user?.id]);

  useEffect(() => {
    const userId = user?.id;
    const generation = ++libraryGenerationRef.current;
    invalidateImports();
    setBusy(false);
    setPasteOpen(false);
    setPasteName("");
    setPasteSource("");
    setSearch("");
    setTemplateOpen(false);
    setHistoryWarning("");
    setPreviewDevice("fit");
    if (!userId) {
      setLibrary([]);
      setActive(null);
      setLoaded(!authLoading);
      return;
    }
    let active = true;
    const isCurrent = () => active && userIdRef.current === userId && libraryGenerationRef.current === generation;

    setLoaded(false);
    const initial = loadMiniApps(userId);
    setLibrary(initial);
    setActive(initial[0] || null);
    setLoaded(true);

    const binding = bindCloudState(userId, "mini_apps_v1", {
      read: () => readMiniAppsSnapshot(userId),
      apply: (data, updatedAt) => {
        if (!isCurrent()) return;
        const remote = applyMiniAppsCloud(userId, data, updatedAt);
        setLibrary(remote);
        if (!dirtyRef.current) {
          const activeId = selectedIdRef.current;
          const active = remote.find((item) => item.id === activeId) || remote[0] || null;
          setActive(active, viewModeRef.current === "edit");
        }
      },
    });
    bindingRef.current = binding;

    const onStorage = (event: StorageEvent) => {
      if (!isCurrent() || event.key !== `arshnaz_mini_apps_v1_${userId}`) return;
      const refreshed = loadMiniApps(userId);
      setLibrary(refreshed);
      if (!dirtyRef.current) {
        const activeId = selectedIdRef.current;
        setActive(refreshed.find((item) => item.id === activeId) || refreshed[0] || null, viewModeRef.current === "edit");
      }
    };
    const onLocalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (!isCurrent() || detail?.userId !== userId) return;
      const refreshed = loadMiniApps(userId);
      setLibrary(refreshed);
      // Our own Save must not rerun code or erase the stale-preview indicator.
      if (!savingLocallyRef.current && !dirtyRef.current) {
        const activeId = selectedIdRef.current;
        const next = refreshed.find(item => item.id === activeId) || refreshed[0] || null;
        const current = draftRef.current;
        if (next?.id !== current?.id || (next && current && draftDiffersFromSaved(next, current))) {
          setActive(next, viewModeRef.current === "edit");
        }
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MINI_APPS_UPDATED_EVENT, onLocalUpdate);
    return () => {
      active = false;
      invalidateImports();
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MINI_APPS_UPDATED_EVENT, onLocalUpdate);
      binding.stop();
      if (bindingRef.current === binding) bindingRef.current = null;
    };
  }, [authLoading, invalidateImports, setActive, setLibrary, user?.id]);

  useEffect(() => {
    const ownerId = user?.id;
    if (!ownerId) { setHistoryState({ versions: [], deletedApps: [] }); return; }
    let active = true;
    const isCurrent = () => active && userIdRef.current === ownerId;
    setHistoryState(loadMiniAppsHistory(ownerId));
    const binding = bindCloudState(ownerId, "mini_apps_history_v1", {
      read: () => readMiniAppsHistorySnapshot(ownerId),
      reconcilePending: reconcileMiniAppsHistory,
      reconcileAllRevisions: true,
      apply: (data, updatedAt) => {
        if (!isCurrent()) return;
        try {
          const snapshot = applyMiniAppsHistoryCloud(ownerId, data, updatedAt);
          setHistoryState(snapshot.data);
          if (snapshot.updatedAt > updatedAt) historyBindingRef.current?.push();
        } catch {
          setHistoryWarning(languageRef.current ? "History could not be retained locally. Copy or download code before replacing it." : "تاریخچه روی دستگاه نگهداری نشد. پیش از جایگزینی، کد را کپی یا دریافت کن.");
        }
      },
    });
    historyBindingRef.current = binding;
    const refresh = () => { if (isCurrent()) setHistoryState(loadMiniAppsHistory(ownerId)); };
    const onHistory = (event: Event) => { if ((event as CustomEvent<{ userId?: string }>).detail?.userId === ownerId) refresh(); };
    const onStorage = (event: StorageEvent) => { if (event.key === `arshnaz_mini_apps_history_v1_${ownerId}`) refresh(); };
    window.addEventListener(MINI_APPS_HISTORY_EVENT, onHistory);
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener(MINI_APPS_HISTORY_EVENT, onHistory);
      window.removeEventListener("storage", onStorage);
      binding.stop();
      if (historyBindingRef.current === binding) historyBindingRef.current = null;
    };
  }, [user?.id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const frame = previewFrameRef.current;
      if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
      // An untrusted preview can request one action at a time. Keep a ref so
      // several messages in the same event turn cannot queue/replace dialogs.
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (data.channel !== "arshiam-mini-app" || data.token !== previewTokenRef.current) return;
      const payload = data.payload;
      if (!payload || typeof payload !== "object") return;
      const value = payload as Record<string, unknown>;
      if (data.action === "runtimeError") {
        if (typeof value.message !== "string" || !value.message || value.message.length > 1_000) return;
        const coordinate = (value: unknown) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 10_000_000 ? value : 0;
        setPreviewErrors(current => current.length >= 5 ? current : [...current, { message: value.message as string, line: coordinate(value.line), column: coordinate(value.column) }]);
        return;
      }
      if (bridgeActionRef.current || Date.now() < bridgeCooldownUntilRef.current) return;
      if (data.action === "copyText") {
        if (typeof value.text !== "string" || value.text.length > 20_000) return;
        if (!userIdRef.current) return;
        const action: BridgeAction = { kind: "copyText", text: value.text, token: previewTokenRef.current, userId: userIdRef.current };
        bridgeActionRef.current = action;
        setBridgeAction(action);
      } else if (data.action === "createTask") {
        if (typeof value.title !== "string" || value.title.trim().length < 1 || value.title.length > 160) return;
        if (typeof value.description !== "string" || value.description.length > 5_000) return;
        if (!userIdRef.current) return;
        const action: BridgeAction = { kind: "createTask", title: value.title.trim(), description: value.description, token: previewTokenRef.current, userId: userIdRef.current };
        bridgeActionRef.current = action;
        setBridgeAction(action);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  useRecoverableExit(
    () => dirtyRef.current && !durableDraftRef.current,
    t("تغییرات روی دستگاه ذخیره نشده‌اند. خروج ممکن است آن‌ها را از بین ببرد. ادامه می‌دهی؟", "These edits could not be retained on this device. Leaving may lose them. Continue?"),
  );

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return needle ? items.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase().includes(needle)) : items;
  }, [items, search]);
  const htmlInspection = useMemo(() => inspectMiniAppHtml(draft?.html ?? ""), [draft?.html]);
  const pasteInspection = useMemo(() => inspectMiniAppHtml(unwrapHtmlCodeFence(pasteSource)), [pasteSource]);
  const htmlBytes = htmlInspection.bytes;
  const warningText = (warning: HtmlWarning) => ({
    "external-assets": t("منابع بیرونی مانند کتابخانه، تصویر یا CSS در پیش‌نمایش بارگیری نمی‌شوند؛ آن‌ها را داخل فایل قرار بده.", "External scripts, images or styles will not load in preview. Embed them in the file."),
    "network-api": t("درخواست شبکه در پیش‌نمایش مسدود است؛ ابزارک باید بدون اینترنت کار کند.", "Network requests are blocked in preview; the tool needs to work offline."),
    "storage-api": t("ذخیره‌سازی مرورگر در این محیط جدا در دسترس نیست؛ داده‌ها را در حافظه صفحه نگه دار.", "Browser storage is unavailable in this isolated preview; keep data in page memory."),
    "native-forms": t("ارسال native فرم در پیش‌نمایش مجاز نیست؛ برای عملیات از دکمه type=button و رویداد click یا Enter استفاده کن.", "Native form submission is disabled in preview. Use type=button with explicit click or Enter handlers."),
  })[warning];
  const validateHtml = (html: string): boolean => {
    const { issue } = inspectMiniAppHtml(html);
    if (!issue) return true;
    toast.error(issue === "empty"
      ? t("کد HTML خالی است. ابتدا کد را وارد کن.", "HTML source is empty. Add some code first.")
      : t("حجم کد HTML بیش از ۱۲۰٬۰۰۰ بایت است.", "HTML source exceeds 120,000 bytes."));
    return false;
  };

  const updateDraft = (patch: Partial<MiniApp>) => {
    if (!draft) return;
    const next = { ...draft, ...patch, updatedAt: new Date().toISOString() };
    durableDraftRef.current = Boolean(user?.id && writeStoredDraft(user.id, next));
    setRetentionFailed(!durableDraftRef.current);
    setDraft(next);
    setDirty(true);
    dirtyRef.current = true;
  };

  const saveList = (next: MiniApp[]) => {
    if (!user?.id) return false;
    try {
      savingLocallyRef.current = true;
      const saved = saveMiniAppsLocal(user.id, next);
      if (localStorage.getItem(`arshnaz_mini_apps_v1_${user.id}`) !== JSON.stringify(saved)) throw new Error(t("ذخیره روی دستگاه تأیید نشد.", "Device storage could not be verified."));
      setLibrary(saved.data as MiniApp[]);
      bindingRef.current?.push();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ذخیره انجام نشد.", "Could not save."));
      return false;
    } finally {
      savingLocallyRef.current = false;
    }
  };

  const captureHistory = (apps: MiniApp[], kind: VersionKind = "save"): boolean => {
    if (!user?.id || userIdRef.current !== user.id) return false;
    try {
      const snapshot = recordMiniAppVersions(user.id, apps, kind);
      setHistoryState(snapshot.data);
      historyBindingRef.current?.push();
      setHistoryWarning("");
      return true;
    } catch {
      const message = t("ثبت نسخه انجام نشد. کد جاری محفوظ است؛ قبل از جایگزینی، آن را کپی یا دریافت کن.", "The version could not be retained. Current code is unchanged; copy or download it before replacing.");
      setHistoryWarning(message);
      toast.error(message);
      return false;
    }
  };

  const discardOrContinue = () => {
    if (!dirtyRef.current || durableDraftRef.current) return true;
    const confirmed = window.confirm(t("تغییرات ذخیره‌نشده از بین می‌روند. ادامه می‌دهی؟", "Unsaved changes will be discarded. Continue?"));
    if (confirmed && draftRef.current && userIdRef.current) clearStoredDraft(userIdRef.current, draftRef.current.id);
    return confirmed;
  };

  const createApp = (templateId?: MiniAppTemplateId) => {
    if (!discardOrContinue() || !user?.id) return;
    const template = MINI_APP_TEMPLATES.find(item => item.id === templateId);
    const now = new Date().toISOString();
    const app: MiniApp = {
      id: createMiniAppId(),
      name: template ? template.name[isEn ? "en" : "fa"] : t("ابزارک تازه", "New mini app"),
      emoji: "🧩",
      description: template ? template.description[isEn ? "en" : "fa"] : "",
      aiRequest: "",
      html: templateId ? buildMiniAppTemplate(templateId, isEn ? "en" : "fa") : STARTER_HTML,
      createdAt: now,
      updatedAt: now,
    };
    if (!saveList([...itemsRef.current, app])) return;
    captureHistory([app], "initial");
    setActive(app, true);
    setTemplateOpen(false);
    toast.success(t("ابزارک ساخته شد.", "Mini app created."));
  };

  const saveDraft = () => {
    if (!draft || !user?.id) return;
    if (!validateHtml(draft.html)) return;
    const nextApp = { ...draft, name: draft.name.trim() || t("بدون نام", "Untitled"), updatedAt: new Date().toISOString() };
    const current = itemsRef.current;
    const previous = current.find(item => item.id === nextApp.id);
    // Capture before committing live code. A failed Save remains a checkpoint,
    // so both the original code and the attempted edit stay recoverable.
    if (!captureHistory(previous ? [previous, nextApp] : [nextApp], "checkpoint")) return;
    const next = current.some((item) => item.id === nextApp.id)
      ? current.map((item) => item.id === nextApp.id ? nextApp : item)
      : [...current, nextApp];
    if (!saveList(next)) return;
    const confirmed = itemsRef.current.find(item => item.id === nextApp.id);
    if (!confirmed) return;
    captureHistory([confirmed], "save");
    setDraft(confirmed);
    setDirty(false);
    dirtyRef.current = false;
    durableDraftRef.current = true;
    setRetentionFailed(false);
    if (user?.id) clearStoredDraft(user.id, confirmed.id);
    toast.success(t("تغییرات ذخیره شد.", "Changes saved."));
  };

  const captureCheckpoint = () => {
    if (!draft || !validateHtml(draft.html)) return;
    if (captureHistory([{ ...draft, name: draft.name.trim() || t("بدون نام", "Untitled") }], "checkpoint")) toast.success(t("نسخه روی دستگاه ثبت شد.", "Version retained on this device."));
  };

  const restoreVersion = (version: MiniAppVersion) => {
    if (!draft || !user?.id || userIdRef.current !== user.id || version.appId !== draft.id || !historyState.versions.some(item => item.id === version.id && item.appId === draft.id)) return;
    const current = { ...draft, name: draft.name.trim() || t("بدون نام", "Untitled") };
    if (!captureHistory([current], "checkpoint")) return;
    const patch = { html: version.app.html, name: version.app.name, emoji: version.app.emoji, description: version.app.description, aiRequest: version.app.aiRequest };
    updateDraft(patch);
    captureHistory([{ ...current, ...patch, updatedAt: new Date().toISOString() }], "restore");
    viewModeRef.current = "edit";
    setViewMode("edit");
    setHistoryOpen(false);
    setEditorJump(null);
    toast.success(t("نسخه به پیش‌نویس بازگشت. برای اعمال نهایی ذخیره کن؛ پیش‌نمایش اجرا نشده است.", "Version restored to draft. Save to apply it; preview was not rerun."));
  };

  const runPreview = () => {
    if (!draft) return;
    if (!validateHtml(draft.html)) return;
    clearBridgeAction();
    setPreviewErrors([]);
    const token = randomToken();
    previewTokenRef.current = token;
    bridgeCooldownUntilRef.current = 0;
    setPreviewDocument(buildMiniAppPreview(draft.html, token, readThemeContext(isEn)));
    setPreviewSnapshot({ ...draft });
    setPreviewVersion((current) => current + 1);
  };

  const copyPrompt = async () => {
    try {
      await copyToClipboard(buildAiPrompt(draft, isEn));
      toast.success(t("دستور هماهنگی برای هوش مصنوعی کپی شد.", "The AI alignment prompt was copied."));
    } catch {
      toast.error(t("کپی نشد؛ اجازهٔ دسترسی به حافظهٔ موقت را بررسی کن.", "Copy failed; check clipboard permission."));
    }
  };

  const copySource = async () => {
    if (!draft) return;
    try {
      await copyToClipboard(draft.html);
      toast.success(t("کد HTML کپی شد.", "HTML source copied."));
    } catch {
      toast.error(t("کپی کد انجام نشد.", "Could not copy the source."));
    }
  };

  const exportHtml = () => {
    if (!draft) return;
    const blob = new Blob([draft.html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${fileBaseName(draft.name)}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  };

  const duplicateApp = () => {
    if (!draft || !user?.id) return;
    if (!validateHtml(draft.html)) return;
    const now = new Date().toISOString();
    const suffix = ` (${t("نسخه", "copy")})`;
    const name = draft.name.trim() || t("بدون نام", "Untitled");
    const copy: MiniApp = { ...draft, id: createMiniAppId(), name: `${name.slice(0, 80 - suffix.length)}${suffix}`, createdAt: now, updatedAt: now };
    const current = itemsRef.current;
    const previous = current.find(item => item.id === draft.id);
    if (!captureHistory(previous ? [previous, { ...draft, name }] : [{ ...draft, name }], "checkpoint")) return;
    const savedCurrent = current.some((item) => item.id === draft.id)
      ? current.map((item) => item.id === draft.id ? { ...draft, name } : item)
      : [...current, { ...draft, name }];
    if (!saveList([...savedCurrent, copy])) return;
    const confirmed = itemsRef.current.find(item => item.id === draft.id);
    const confirmedCopy = itemsRef.current.find(item => item.id === copy.id);
    if (!confirmedCopy) return;
    captureHistory(confirmed ? [confirmed, confirmedCopy] : [confirmedCopy], "save");
    if (user?.id && draft.id) clearStoredDraft(user.id, draft.id);
    setActive(confirmedCopy, true);
  };

  const deleteApp = () => {
    if (!draft || !user?.id) return;
    if (!window.confirm(t(`«${draft.name}» و کد ذخیره‌شدهٔ آن پاک شود؟`, `Delete “${draft.name}” and its saved code?`))) return;
    const next = itemsRef.current.filter((item) => item.id !== draft.id);
    if (!saveList(next)) return;
    try {
      const snapshot = removeMiniAppHistory(user.id, draft.id);
      setHistoryState(snapshot.data);
      historyBindingRef.current?.push();
    } catch {
      setHistoryWarning(t("ابزارک حذف شد ولی پاک‌سازی تاریخچه تأیید نشد؛ ممکن است نسخه‌های قبلی باقی مانده باشند.", "The tool was deleted but history cleanup was not verified; old versions may remain."));
    }
    if (user?.id) clearStoredDraft(user.id, draft.id);
    setActive(next[0] || null);
    toast.success(t("ابزارک پاک شد.", "Mini app deleted."));
  };

  const addHtml = (source: string, name: string): boolean => {
    const html = unwrapHtmlCodeFence(source);
    if (!user?.id || !validateHtml(html) || !discardOrContinue()) return false;
    const now = new Date().toISOString();
    const app: MiniApp = {
      id: createMiniAppId(), name: fileBaseName(name), emoji: "🧩",
      description: "", aiRequest: "", html, createdAt: now, updatedAt: now,
    };
    // Rebase on the current library, not the render that started a file read.
    if (!saveList([...itemsRef.current, app])) return false;
    captureHistory([app], "initial");
    setActive(app, true);
    toast.success(t("HTML روی این دستگاه به مخزن اضافه شد.", "HTML added to the library on this device."));
    return true;
  };

  const importHtml = async (file?: File) => {
    // Reset before validation so selecting the same corrected file works again.
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (!file || !user?.id) return;
    if (!/\.html?$/i.test(file.name)) {
      toast.error(t("فقط فایل HTML وارد کن.", "Choose an HTML file."));
      return;
    }
    if (file.size > MAX_MINI_APP_HTML_BYTES) {
      toast.error(t("حجم فایل بیش از ۱۲۰٬۰۰۰ بایت است.", "The file exceeds 120,000 bytes."));
      return;
    }
    const ownerId = user.id;
    const generation = ++importGenerationRef.current;
    const isCurrent = () => userIdRef.current === ownerId && importGenerationRef.current === generation;
    setBusy(true);
    try {
      const html = await file.text();
      if (!isCurrent()) return;
      addHtml(html, file.name);
    } catch {
      if (isCurrent()) toast.error(t("خواندن فایل انجام نشد.", "Could not read the file."));
    } finally {
      if (isCurrent()) setBusy(false);
    }
  };

  const confirmBridgeAction = async () => {
    if (!bridgeAction || bridgeActionRef.current !== bridgeAction || bridgeAction.token !== previewTokenRef.current || bridgeAction.userId !== userIdRef.current) return;
    if (bridgeAction.kind === "copyText") {
      try {
        await copyToClipboard(bridgeAction.text);
        toast.success(t("متن ابزارک کپی شد.", "Text copied from the mini app."));
        if (bridgeActionRef.current === bridgeAction) clearBridgeAction();
      } catch {
        toast.error(t("کپی نشد؛ اجازهٔ حافظهٔ موقت را بررسی کن.", "Copy failed; check clipboard permission."));
      }
      return;
    }
    // The router exit guard handles at-risk edits once; durable drafts need no prompt.
    const params = new URLSearchParams();
    params.set("title", bridgeAction.title);
    if (bridgeAction.description) params.set("description", bridgeAction.description);
    clearBridgeAction();
    navigate(`/app/new/task?${params.toString()}`);
  };

  const emptyPrompt = !draft && (
    <Card>
      <CardContent className="flex flex-col items-center gap-4 px-6 py-12 text-center">
        <div className="grid size-14 place-items-center rounded-2xl bg-primary/10 text-primary"><Blocks className="size-7" /></div>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{t("مخزن ابزارک‌های HTML", "HTML mini-app library")}</h2>
          <p className="max-w-lg text-sm text-muted-foreground">{t("صفحه‌های کوچک خودت را بساز یا از هوش مصنوعی بگیر، نام‌گذاری و ذخیره کن و در محیط محدود اجرا کن.", "Create or generate small pages, name and save them, then run them in an isolated preview.")}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button onClick={() => createApp()}><Plus className="me-2 size-4" />{t("ساخت ابزارک", "Create a mini app")}</Button>
          <Button variant="outline" onClick={copyPrompt}><Copy className="me-2 size-4" />{t("کپی دستور هماهنگی", "Copy AI prompt")}</Button>
        </div>
      </CardContent>
    </Card>
  );

  if (authLoading || !loaded) {
    return <div className="page-shell flex min-h-[50vh] items-center justify-center"><Loader2 className="size-6 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="page-shell mx-auto w-full max-w-7xl space-y-4 px-3 pb-8 pt-4 sm:px-5" dir={isEn ? "ltr" : "rtl"}>
      <HeaderTitlePortal title={t("مخزن کد", "Code Library")} />
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Blocks className="size-5" /></div>
          <div className="min-w-0">
            <h1 className="text-xl font-semibold">{t("مخزن ابزارک‌ها", "Mini-app library")}</h1>
            <p className="text-sm text-muted-foreground">{t("کدهای HTML کوچک را ذخیره و در پیش‌نمایش محدود اجرا کن.", "Save small HTML tools and run them in an isolated preview.")}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileInputRef} type="file" accept=".html,.htm,text/html" className="hidden" onChange={(event) => void importHtml(event.target.files?.[0])} />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={busy}><FileUp className="me-2 size-4" />{t("واردکردن HTML", "Import HTML")}</Button>
          <Button variant="outline" onClick={() => setPasteOpen(true)} disabled={busy}><Code2 className="me-2 size-4" />{t("چسباندن HTML", "Paste HTML")}</Button>
          <Button variant="outline" onClick={() => setTemplateOpen(true)}><LayoutTemplate className="me-2 size-4" />{t("قالب‌های آماده", "Starter templates")}</Button>
          {busy && <span role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />{t("در حال خواندن فایل…", "Reading file…")}</span>}
          {(items.length > 0 || draft) && <Button variant="outline" onClick={() => void copyPrompt()}><Copy className="me-2 size-4" />{t("کپی دستور هماهنگی", "Copy AI prompt")}</Button>}
          {(items.length > 0 || draft) && <Button onClick={() => createApp()}><Plus className="me-2 size-4" />{t("ابزارک تازه", "New mini app")}</Button>}
        </div>
      </header>

      {historyWarning && !historyOpen && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{historyWarning}</p>}

      {!items.length && !draft ? emptyPrompt : (
        <div className="grid gap-4 lg:grid-cols-[17rem_minmax(0,1fr)]">
          <aside className="space-y-3">
            <Card>
              <CardHeader className="pb-3"><CardTitle className="text-base">{t("ابزارک‌های من", "My mini apps")}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("جست‌وجو…", "Search…")} aria-label={t("جست‌وجوی ابزارک‌ها", "Search mini apps")} />
                <div className="max-h-[50vh] space-y-1 overflow-y-auto">
                  {visibleItems.length ? visibleItems.map((item) => (
                    <button key={item.id} type="button" onClick={() => {
                      if (item.id === selectedId) return;
                      if (!discardOrContinue()) return;
                      setActive(item);
                    }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-start transition-colors ${item.id === selectedId ? "bg-primary/10 text-primary" : "hover:bg-muted"}`}>
                      <span className="text-xl" aria-hidden="true">{item.emoji}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{item.name}</span>
                        {item.description && <span className="block truncate text-xs text-muted-foreground">{item.description}</span>}
                      </span>
                    </button>
                  )) : <p className="py-4 text-center text-sm text-muted-foreground">{t("ابزارکی پیدا نشد.", "No mini apps found.")}</p>}
                </div>
                <div className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
                  <div className="mb-1 flex items-center gap-2 font-medium text-foreground"><ShieldCheck className="size-4 text-primary" />{t("اجرای محدود", "Isolated preview")}</div>
                  {t("درخواست‌های معمول شبکه و دسترسی مستقیم به داده‌های برنامه بسته است. کپی متن و ساخت کار با تأیید تو انجام می‌شود؛ رفتار بازشدن پیوند بیرونی ممکن است در مرورگرها فرق کند.", "Direct network requests and access to app data are blocked. Copying text and creating tasks require your confirmation; external navigation may vary by browser.")}
                </div>
              </CardContent>
            </Card>
          </aside>

          <main className="min-w-0 space-y-4">
            {draft ? <>
              <Card>
                <CardContent className="space-y-4 p-4 sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl" aria-hidden="true">{draft.emoji || "🧩"}</span>
                      <span className="font-semibold">{draft.name || t("ابزارک بدون نام", "Untitled mini app")}</span>
                      {dirty && <span className="rounded-full bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300">{t("ذخیره‌نشده", "Unsaved")}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" onClick={() => void copyPrompt()}><Lightbulb className="me-2 size-4" />{t("دستور هوش مصنوعی", "AI prompt")}</Button>
                       <Button size="sm" variant={viewMode === "run" ? "default" : "outline"} aria-pressed={viewMode === "run"} onClick={() => { viewModeRef.current = "run"; setViewMode("run"); }}><Play className="me-2 size-4" />{t("اجرا", "Run")}</Button>
                       <Button size="sm" variant={viewMode === "edit" ? "default" : "outline"} aria-pressed={viewMode === "edit"} onClick={() => { viewModeRef.current = "edit"; setViewMode("edit"); }}><Code2 className="me-2 size-4" />{t("ویرایش", "Edit")}</Button>
                      <Button size="sm" onClick={saveDraft} disabled={!dirty}><Save className="me-2 size-4" />{t("ذخیره", "Save")}</Button>
                    </div>
                  </div>

                  {retentionFailed && <p role="alert" className="text-sm text-destructive">{t("نسخهٔ قابل‌بازیابی ذخیره نشد. قبل از خروج کد را کپی یا دریافت کن، یا دوباره ذخیره کن.", "No recoverable copy was saved. Copy or download your code before leaving, or retry Save.")}</p>}

                  <div className="flex flex-wrap gap-1" aria-label={t("عملیات ابزارک", "Mini-app actions")}>
                    <Button size="sm" variant="ghost" onClick={copySource}><Copy className="me-1 size-4" />{t("کپی کد", "Copy")}</Button>
                    <Button size="sm" variant="ghost" onClick={exportHtml}><Download className="me-1 size-4" />{t("دریافت فایل", "Download")}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setHistoryOpen(true)}><History className="me-1 size-4" />{t("تاریخچه نسخه‌ها", "Version history")}</Button>
                    <Button size="sm" variant="ghost" onClick={duplicateApp}><Copy className="me-1 size-4" />{t("تکثیر", "Duplicate")}</Button>
                    <Button size="sm" variant="ghost" onClick={deleteApp} className="text-destructive hover:text-destructive"><Trash2 className="me-1 size-4" />{t("حذف", "Delete")}</Button>
                  </div>

                  {viewMode === "run" ? <div className="space-y-2 text-sm" data-testid="mini-app-metadata">
                    <p className="whitespace-pre-wrap text-muted-foreground">{draft.description || t("این ابزارک توضیحی ندارد.", "No description for this tool.")}</p>
                    <p className="text-xs text-muted-foreground">{t("آخرین تغییر:", "Last updated:")} <time dateTime={draft.updatedAt}>{draft.updatedAt}</time></p>
                  </div> : <div className="space-y-4" data-testid="mini-app-editor">

                  <div className="grid gap-3 sm:grid-cols-[5rem_minmax(0,1fr)]">
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">{t("نشانه", "Emoji")}</span>
                      <Input value={draft.emoji} maxLength={16} onChange={(event) => updateDraft({ emoji: event.target.value })} aria-label={t("نشانهٔ ابزارک", "Mini-app emoji")} className="text-center text-xl" />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-muted-foreground">{t("نام ابزارک", "Tool name")}</span>
                      <Input value={draft.name} maxLength={80} onChange={(event) => updateDraft({ name: event.target.value })} placeholder={t("مثلاً محاسبه‌گر هفتگی", "e.g. Weekly calculator")} />
                    </label>
                  </div>
                  <label className="block space-y-1 text-sm">
                    <span className="text-muted-foreground">{t("توضیح کوتاه", "Short description")}</span>
                    <Input value={draft.description} maxLength={2_000} onChange={(event) => updateDraft({ description: event.target.value })} placeholder={t("این ابزارک چه کاری انجام می‌دهد؟", "What does this tool do?")} />
                  </label>
                  <label className="block space-y-1 text-sm">
                    <span className="flex items-center gap-2 text-muted-foreground"><Lightbulb className="size-4" />{t("درخواستت از هوش مصنوعی", "What to ask the AI")}</span>
                    <Textarea value={draft.aiRequest} maxLength={4_000} onChange={(event) => updateDraft({ aiRequest: event.target.value })} rows={3} placeholder={t("مثلاً: یک برنامهٔ ساده برای محاسبهٔ بودجهٔ ماهانه بساز…", "For example: Make a simple monthly budget calculator…")} />
                  </label>

                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <label htmlFor="mini-app-html" className="flex items-center gap-2 text-sm font-medium"><Code2 className="size-4" />{t("کد کامل HTML", "Complete HTML source")}</label>
                      {unwrapHtmlCodeFence(draft.html) !== draft.html && <Button size="sm" variant="outline" onClick={() => updateDraft({ html: unwrapHtmlCodeFence(draft.html) })}>{t("حذف حصار کد", "Remove code fence")}</Button>}
                    </div>
                    <HtmlCodeEditor
                      key={`${user?.id}:${draft.id}`}
                      value={draft.html}
                      onChange={html => updateDraft({ html })}
                      onSave={saveDraft}
                      jumpTo={editorJump}
                      t={t}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{t("کد در یک فایل HTML ذخیره می‌شود؛ کتابخانه یا سرور لازم نیست.", "Saved as a single HTML file; no package or server required.")}</span>
                      <span className={htmlInspection.issue ? "text-destructive" : ""} dir="ltr">{(htmlBytes / 1000).toFixed(1)} / 120 KB</span>
                    </div>
                    {htmlInspection.issue && <p className="text-sm text-destructive">{htmlInspection.issue === "empty" ? t("کد HTML خالی است؛ قبل از ذخیره یا اجرا کد وارد کن.", "HTML is empty; add code before saving or running.") : t("حجم کد بیش از ۱۲۰٬۰۰۰ بایت است.", "Source exceeds 120,000 bytes.")}</p>}
                    {htmlInspection.warnings.length > 0 && <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
                      <p className="mb-1 font-medium">{t("نکته‌های سازگاری (بررسی اولیه، نه اعتبارسنجی کامل)", "Compatibility hints (not full validation)")}</p>
                      <ul className="list-inside list-disc space-y-1 text-muted-foreground">{htmlInspection.warnings.map(warning => <li key={warning}>{warningText(warning)}</li>)}</ul>
                    </div>}
                  </div>
                  </div>}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                   <CardTitle className="flex items-center gap-2 text-base"><Eye className="size-4" />{t("پیش‌نمایش محدود", "Isolated preview")}</CardTitle>
                  <Button size="sm" variant="outline" onClick={runPreview} disabled={Boolean(htmlInspection.issue)}><Play className="me-2 size-4" />{t("اجرای آخرین کد", "Run latest source")}</Button>
                </CardHeader>
                 <CardContent>
                   <MiniAppPreviewControls device={previewDevice} onChange={setPreviewDevice} t={t} />
                   {previewSnapshot && draftDiffersFromSaved(draft, previewSnapshot) && <p role="status" className="mb-3 text-sm text-amber-700 dark:text-amber-300">{t("پیش‌نمایش قدیمی است؛ تغییرات فعلی اجرا نشده‌اند. آخرین کد را اجرا کن.", "Preview is stale: current edits have not been run. Run latest source to refresh.")}</p>}
                   {previewSnapshot && !draftDiffersFromSaved(draft, previewSnapshot) && <p className="mb-3 text-xs text-muted-foreground">{t("نمایش آخرین کد اجراشده؛ پیش‌نمایش با تایپ تغییر نمی‌کند.", "Showing the last run source. Preview does not update as you type.")}</p>}
                  {previewErrors.length > 0 && <div role="alert" className="mb-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
                    <p className="font-medium">{t("خطاهای پیش‌نمایش", "Preview errors")}</p>
                    <p className="mb-2 text-xs text-muted-foreground">{t("این پیام‌ها از ابزارک اجراشده‌اند؛ شماره خط مربوط به سند پیش‌نمایش است و ممکن است با کد اصلی فرق کند.", "Reported by the running tool; line numbers refer to the preview document and may differ from source.")}</p>
                    <ul className="space-y-1">{previewErrors.map((error, index) => {
                      const location = previewLocationToSource(previewDocument, previewSnapshot?.html ?? "", error.line, error.column);
                      return <li key={index} className="break-words font-mono text-xs" dir="auto">{error.message}{error.line > 0 && <span> ({error.line}:{error.column})</span>}
                        {location && <Button size="sm" variant="link" disabled={draft.html !== previewSnapshot?.html} title={draft.html !== previewSnapshot?.html ? t("ابتدا آخرین کد را اجرا کن.", "Run latest source first.") : undefined} onClick={() => {
                          viewModeRef.current = "edit";
                          setViewMode("edit");
                          setEditorJump(previous => ({ ...location, requestId: (previous?.requestId ?? 0) + 1 }));
                        }}>{t(`رفتن به خط ${location.line} کد`, `Go to source line ${location.line}`)}</Button>}
                      </li>;
                    })}</ul>
                  </div>}
                  {previewDocument ? (
                    <MiniAppPreviewViewport device={previewDevice} t={t}>
                    <iframe
                      key={previewVersion}
                      ref={previewFrameRef}
                       title={`${previewSnapshot?.name || draft.name} — ${t("پیش‌نمایش", "preview")}`}
                      srcDoc={previewDocument}
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      className="h-[min(72vh,720px)] min-h-[420px] w-full rounded-xl border-0 bg-background"
                    />
                    </MiniAppPreviewViewport>
                  ) : (
                    <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
                      <div className="space-y-3">
                        <Eye className="mx-auto size-8 text-muted-foreground/70" />
                        <p className="text-sm text-muted-foreground">{htmlInspection.issue === "empty" ? t("کد HTML خالی است؛ برای افزودن کد، ویرایش را انتخاب کن.", "HTML is empty; choose Edit to add source.") : t("برای دیدن نتیجه، کد را اجرا کن.", "Run the source to see the result.")}</p>
                        <Button variant="outline" onClick={runPreview} disabled={Boolean(htmlInspection.issue)}><Play className="me-2 size-4" />{t("اجرای پیش‌نمایش", "Run preview")}</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </> : emptyPrompt}
          </main>
        </div>
      )}

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-h-[90dvh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("قالب‌های آماده آفلاین", "Offline starter templates")}</DialogTitle>
            <DialogDescription>{t("یک ابزارک تازه از قالب بساز. کد قبلی جایگزین نمی‌شود و قالب تا انتخاب اجرا، اجرا نمی‌شود. داده درون ابزارک با اجرای دوباره بازنشانی می‌شود.", "Create a new tool from a template. Existing code is not replaced and nothing runs until you choose preview. In-tool data resets on rerun.")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">{MINI_APP_TEMPLATES.map(template => <div key={template.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4">
            <div className="min-w-0 flex-1"><p className="font-medium">{template.name[isEn ? "en" : "fa"]}</p><p className="mt-1 text-sm text-muted-foreground">{template.description[isEn ? "en" : "fa"]}</p></div>
            <Button onClick={() => createApp(template.id)}><Plus className="me-1 size-4" />{t(`ساخت ${template.name.fa}`, `Create ${template.name.en}`)}</Button>
          </div>)}</div>
          <DialogFooter><Button variant="outline" onClick={() => setTemplateOpen(false)}>{t("بستن قالب‌ها", "Close templates")}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {historyOpen && draft && <MiniAppHistoryDialog key={`${user?.id}:${draft.id}`} versions={historyState.versions.filter(version => version.appId === draft.id)} draft={draft} isEn={isEn} t={t} onClose={() => setHistoryOpen(false)} onCheckpoint={captureCheckpoint} onRestore={restoreVersion} canCheckpoint={!htmlInspection.issue} warning={historyWarning} />}

      <Dialog open={pasteOpen} onOpenChange={setPasteOpen}>
        <DialogContent dir={isEn ? "ltr" : "rtl"} className="max-w-2xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t("افزودن HTML از کد", "Add HTML from source")}</DialogTitle>
            <DialogDescription>{t("کد را اینجا بچسبان. فایل یا قطعه HTML پذیرفته می‌شود؛ حصار کد هوش مصنوعی خودکار حذف می‌شود. کد تا انتخاب اجرا، اجرا نمی‌شود.", "Paste a full HTML file or fragment. AI code fences are removed automatically. Nothing runs until you choose preview.")}</DialogDescription>
          </DialogHeader>
          <label className="space-y-1 text-sm">
            <span>{t("نام HTML جدید", "New HTML name")}</span>
            <Input value={pasteName} maxLength={64} onChange={event => setPasteName(event.target.value)} placeholder={t("مثلاً محاسبه‌گر", "e.g. Calculator")} />
          </label>
          <label className="space-y-1 text-sm">
            <span>{t("کد HTML برای افزودن", "HTML source to add")}</span>
            <Textarea value={pasteSource} onChange={event => setPasteSource(event.target.value)} dir="ltr" spellCheck={false} autoCapitalize="off" autoCorrect="off" rows={12} className="font-mono text-xs" />
          </label>
          <p className={pasteInspection.issue === "too-large" ? "text-sm text-destructive" : "text-xs text-muted-foreground"} dir="ltr">{(pasteInspection.bytes / 1000).toFixed(1)} / 120 KB</p>
          {pasteInspection.issue === "too-large" && <p className="text-sm text-destructive">{t("کد بیش از حد مجاز است؛ آن را کوتاه‌تر کن.", "Source is too large; shorten it before adding.")}</p>}
          {pasteInspection.warnings.length > 0 && <ul className="list-inside list-disc space-y-1 text-xs text-muted-foreground">{pasteInspection.warnings.map(warning => <li key={warning}>{warningText(warning)}</li>)}</ul>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPasteOpen(false)}>{t("انصراف", "Cancel")}</Button>
            <Button disabled={Boolean(pasteInspection.issue) || busy} onClick={() => {
              if (!addHtml(pasteSource, pasteName.trim() || t("ابزارک تازه", "New mini app"))) return;
              setPasteOpen(false);
              setPasteName("");
              setPasteSource("");
            }}>{t("افزودن به مخزن", "Add to library")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(bridgeAction)} onOpenChange={(open) => { if (!open) clearBridgeAction(); }}>
        <DialogContent dir={isEn ? "ltr" : "rtl"}>
          <DialogHeader>
            <DialogTitle>{bridgeAction?.kind === "copyText" ? t("کپی متن از ابزارک", "Copy text from mini app") : t("افزودن کار از ابزارک", "Create task from mini app")}</DialogTitle>
            <DialogDescription>
              {bridgeAction?.kind === "copyText"
                ? t("این ابزارک درخواست کرده متن زیر در حافظهٔ موقت کپی شود.", "The mini app asks to copy this text to your clipboard.")
                : t("با تأیید تو، فرم عادی افزودن کار با این اطلاعات باز می‌شود.", "With your confirmation, the normal task form will open with these details.")}
            </DialogDescription>
          </DialogHeader>
          {bridgeAction?.kind === "copyText" ? (
            <Textarea value={bridgeAction.text} readOnly dir="auto" rows={5} className="max-h-56" />
          ) : bridgeAction?.kind === "createTask" ? (
            <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
              <p className="font-medium">{bridgeAction.title}</p>
              {bridgeAction.description && <p className="whitespace-pre-wrap text-muted-foreground">{bridgeAction.description}</p>}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={clearBridgeAction}>{t("انصراف", "Cancel")}</Button>
            <Button onClick={() => void confirmBridgeAction()}>{bridgeAction?.kind === "copyText" ? <><Copy className="me-2 size-4" />{t("کپی متن", "Copy text")}</> : <><Check className="me-2 size-4" />{t("ادامه و افزودن کار", "Continue to task form")}</>}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
