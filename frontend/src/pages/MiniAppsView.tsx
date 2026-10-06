import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Blocks, Check, Code2, Copy, Download, Eye, FileUp, Lightbulb,
  Loader2, Play, Plus, Save, ShieldCheck, Trash2,
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
  MINI_APPS_UPDATED_EVENT, measureHtmlBytes, readMiniAppsSnapshot,
  saveMiniAppsLocal, type MiniApp,
} from "@/lib/miniAppsStore";
import { buildMiniAppPreview, type MiniAppContext } from "@/lib/miniAppsSandbox";
import { toast } from "sonner";

type BridgeAction =
  | { kind: "copyText"; text: string }
  | { kind: "createTask"; title: string; description: string };

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
      "Use the app's colors from getContext() where helpful. Color token values are HSL components, so use them as hsl(value), for example hsl(context.colors.primary). Prefer graceful behavior if an integration method is unavailable.",
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
    "در صورت نیاز از رنگ‌های getContext() استفاده کن. مقدار رنگ‌ها اجزای HSL است و باید به شکل hsl(value) در CSS قرار بگیرد؛ مثلاً hsl(context.colors.primary). اگر یکی از رابط‌های برنامه در دسترس نبود، ابزارک باید بدون خطا به کار خود ادامه دهد.",
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

export default function MiniAppsView() {
  const { user, loading: authLoading } = useAuth();
  const { T, isEn } = useBilingual();
  const navigate = useNavigate();
  const [items, setItems] = useState<MiniApp[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<MiniApp | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState("");
  const [previewDocument, setPreviewDocument] = useState("");
  const [previewVersion, setPreviewVersion] = useState(0);
  const [bridgeAction, setBridgeAction] = useState<BridgeAction | null>(null);
  const [busy, setBusy] = useState(false);
  const bindingRef = useRef<CloudBinding | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewFrameRef = useRef<HTMLIFrameElement | null>(null);
  const previewTokenRef = useRef("");
  const bridgeActionRef = useRef<BridgeAction | null>(null);
  const bridgeCooldownUntilRef = useRef(0);
  const selectedIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);

  const t = useCallback((fa: string, en: string) => T(fa, en), [T]);
  const clearBridgeAction = useCallback(() => {
    bridgeActionRef.current = null;
    bridgeCooldownUntilRef.current = Date.now() + 1_000;
    setBridgeAction(null);
  }, []);
  const setActive = useCallback((app: MiniApp | null) => {
    selectedIdRef.current = app?.id || null;
    setSelectedId(app?.id || null);
    setDraft(app ? { ...app } : null);
    setDirty(false);
    dirtyRef.current = false;
    setPreviewDocument("");
    previewTokenRef.current = "";
  }, []);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) {
      setItems([]);
      setActive(null);
      setLoaded(!authLoading);
      return;
    }

    setLoaded(false);
    const initial = loadMiniApps(userId);
    setItems(initial);
    setActive(initial[0] || null);
    setLoaded(true);

    const binding = bindCloudState(userId, "mini_apps_v1", {
      read: () => readMiniAppsSnapshot(userId),
      apply: (data, updatedAt) => {
        const remote = applyMiniAppsCloud(userId, data, updatedAt);
        setItems(remote);
        if (!dirtyRef.current) {
          const activeId = selectedIdRef.current;
          const active = remote.find((item) => item.id === activeId) || remote[0] || null;
          setActive(active);
        }
      },
    });
    bindingRef.current = binding;

    const onStorage = (event: StorageEvent) => {
      if (event.key !== `arshnaz_mini_apps_v1_${userId}`) return;
      const refreshed = loadMiniApps(userId);
      setItems(refreshed);
      if (!dirtyRef.current) {
        const activeId = selectedIdRef.current;
        setActive(refreshed.find((item) => item.id === activeId) || refreshed[0] || null);
      }
    };
    const onLocalUpdate = (event: Event) => {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId !== userId) return;
      setItems(loadMiniApps(userId));
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(MINI_APPS_UPDATED_EVENT, onLocalUpdate);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(MINI_APPS_UPDATED_EVENT, onLocalUpdate);
      binding.stop();
      if (bindingRef.current === binding) bindingRef.current = null;
    };
  }, [authLoading, setActive, user?.id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent<unknown>) => {
      const frame = previewFrameRef.current;
      if (!frame?.contentWindow || event.source !== frame.contentWindow) return;
      // An untrusted preview can request one action at a time. Keep a ref so
      // several messages in the same event turn cannot queue/replace dialogs.
      if (bridgeActionRef.current || Date.now() < bridgeCooldownUntilRef.current) return;
      if (!event.data || typeof event.data !== "object") return;
      const data = event.data as Record<string, unknown>;
      if (data.channel !== "arshiam-mini-app" || data.token !== previewTokenRef.current) return;
      const payload = data.payload;
      if (!payload || typeof payload !== "object") return;
      const value = payload as Record<string, unknown>;
      if (data.action === "copyText") {
        if (typeof value.text !== "string" || value.text.length > 20_000) return;
        const action: BridgeAction = { kind: "copyText", text: value.text };
        bridgeActionRef.current = action;
        setBridgeAction(action);
      } else if (data.action === "createTask") {
        if (typeof value.title !== "string" || value.title.trim().length < 1 || value.title.length > 160) return;
        if (typeof value.description !== "string" || value.description.length > 5_000) return;
        const action: BridgeAction = { kind: "createTask", title: value.title.trim(), description: value.description };
        bridgeActionRef.current = action;
        setBridgeAction(action);
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  const visibleItems = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase();
    return needle ? items.filter((item) => `${item.name} ${item.description}`.toLocaleLowerCase().includes(needle)) : items;
  }, [items, search]);
  const htmlBytes = draft ? measureHtmlBytes(draft.html) : 0;

  const updateDraft = (patch: Partial<MiniApp>) => {
    setDraft((current) => {
      if (!current) return current;
      return { ...current, ...patch, updatedAt: new Date().toISOString() };
    });
    setDirty(true);
    dirtyRef.current = true;
  };

  const saveList = (next: MiniApp[]) => {
    if (!user?.id) return false;
    try {
      saveMiniAppsLocal(user.id, next);
      setItems(next);
      bindingRef.current?.push();
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("ذخیره انجام نشد.", "Could not save."));
      return false;
    }
  };

  const discardOrContinue = () => !dirtyRef.current || window.confirm(t("تغییرات ذخیره‌نشده از بین می‌روند. ادامه می‌دهی؟", "Unsaved changes will be discarded. Continue?"));

  const createApp = () => {
    if (!discardOrContinue() || !user?.id) return;
    const now = new Date().toISOString();
    const app: MiniApp = {
      id: createMiniAppId(),
      name: t("ابزارک تازه", "New mini app"),
      emoji: "🧩",
      description: "",
      aiRequest: "",
      html: STARTER_HTML,
      createdAt: now,
      updatedAt: now,
    };
    if (!saveList([...items, app])) return;
    setActive(app);
    toast.success(t("ابزارک ساخته شد.", "Mini app created."));
  };

  const saveDraft = () => {
    if (!draft || !user?.id) return;
    if (measureHtmlBytes(draft.html) > MAX_MINI_APP_HTML_BYTES) {
      toast.error(t("حجم فایل HTML بیش از حد مجاز است.", "The HTML file is larger than the allowed limit."));
      return;
    }
    const nextApp = { ...draft, name: draft.name.trim() || t("بدون نام", "Untitled"), updatedAt: new Date().toISOString() };
    const next = items.some((item) => item.id === nextApp.id)
      ? items.map((item) => item.id === nextApp.id ? nextApp : item)
      : [...items, nextApp];
    if (!saveList(next)) return;
    setDraft(nextApp);
    setDirty(false);
    dirtyRef.current = false;
    toast.success(t("تغییرات ذخیره شد.", "Changes saved."));
  };

  const runPreview = () => {
    if (!draft) return;
    if (measureHtmlBytes(draft.html) > MAX_MINI_APP_HTML_BYTES) {
      toast.error(t("حجم فایل HTML بیش از حد مجاز است.", "The HTML file is larger than the allowed limit."));
      return;
    }
    const token = randomToken();
    previewTokenRef.current = token;
    bridgeCooldownUntilRef.current = 0;
    setPreviewDocument(buildMiniAppPreview(draft.html, token, readThemeContext(isEn)));
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
    const now = new Date().toISOString();
    const copy: MiniApp = { ...draft, id: createMiniAppId(), name: `${draft.name} (${t("نسخه", "copy")})`, createdAt: now, updatedAt: now };
    const savedCurrent = items.some((item) => item.id === draft.id)
      ? items.map((item) => item.id === draft.id ? draft : item)
      : [...items, draft];
    if (!saveList([...savedCurrent, copy])) return;
    setActive(copy);
  };

  const deleteApp = () => {
    if (!draft || !user?.id) return;
    if (!window.confirm(t(`«${draft.name}» و کد ذخیره‌شدهٔ آن پاک شود؟`, `Delete “${draft.name}” and its saved code?`))) return;
    const next = items.filter((item) => item.id !== draft.id);
    if (!saveList(next)) return;
    setActive(next[0] || null);
    toast.success(t("ابزارک پاک شد.", "Mini app deleted."));
  };

  const importHtml = async (file?: File) => {
    if (!file || !user?.id) return;
    if (!/\.html?$/i.test(file.name)) {
      toast.error(t("فقط فایل HTML وارد کن.", "Choose an HTML file."));
      return;
    }
    if (file.size > MAX_MINI_APP_HTML_BYTES) {
      toast.error(t("حجم فایل بیش از ۱۲۰ کیلوبایت است.", "The file is larger than 120 KB."));
      return;
    }
    setBusy(true);
    try {
      const html = await file.text();
      if (measureHtmlBytes(html) > MAX_MINI_APP_HTML_BYTES) {
        toast.error(t("حجم فایل بیش از ۱۲۰ کیلوبایت است.", "The file is larger than 120 KB."));
        return;
      }
      // Confirm at the commit boundary so edits made while the file is being
      // read cannot be discarded without a fresh confirmation.
      if (!discardOrContinue()) return;
      const now = new Date().toISOString();
      const app: MiniApp = {
        id: createMiniAppId(),
        name: fileBaseName(file.name),
        emoji: "🧩",
        description: "",
        aiRequest: "",
        html,
        createdAt: now,
        updatedAt: now,
      };
      if (saveList([...items, app])) {
        setActive(app);
        toast.success(t("فایل به مخزن اضافه شد.", "HTML file added to the library."));
      }
    } catch {
      toast.error(t("خواندن فایل انجام نشد.", "Could not read the file."));
    } finally {
      setBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const confirmBridgeAction = async () => {
    if (!bridgeAction) return;
    if (bridgeAction.kind === "copyText") {
      try {
        await copyToClipboard(bridgeAction.text);
        toast.success(t("متن ابزارک کپی شد.", "Text copied from the mini app."));
        clearBridgeAction();
      } catch {
        toast.error(t("کپی نشد؛ اجازهٔ حافظهٔ موقت را بررسی کن.", "Copy failed; check clipboard permission."));
      }
      return;
    }
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
          <Button onClick={createApp}><Plus className="me-2 size-4" />{t("ساخت ابزارک", "Create a mini app")}</Button>
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
          {(items.length > 0 || draft) && <Button variant="outline" onClick={() => void copyPrompt()}><Copy className="me-2 size-4" />{t("کپی دستور هماهنگی", "Copy AI prompt")}</Button>}
          {(items.length > 0 || draft) && <Button onClick={createApp}><Plus className="me-2 size-4" />{t("ابزارک تازه", "New mini app")}</Button>}
        </div>
      </header>

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
                      <Button size="sm" variant="outline" onClick={runPreview}><Play className="me-2 size-4" />{t("اجرا", "Run")}</Button>
                      <Button size="sm" onClick={saveDraft} disabled={!dirty}><Save className="me-2 size-4" />{t("ذخیره", "Save")}</Button>
                    </div>
                  </div>

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
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="ghost" onClick={copySource}><Copy className="me-1 size-4" />{t("کپی کد", "Copy")}</Button>
                        <Button size="sm" variant="ghost" onClick={exportHtml}><Download className="me-1 size-4" />{t("دریافت فایل", "Download")}</Button>
                        <Button size="sm" variant="ghost" onClick={duplicateApp}><Copy className="me-1 size-4" />{t("تکثیر", "Duplicate")}</Button>
                        <Button size="sm" variant="ghost" onClick={deleteApp} className="text-destructive hover:text-destructive"><Trash2 className="me-1 size-4" />{t("حذف", "Delete")}</Button>
                      </div>
                    </div>
                    <Textarea
                      id="mini-app-html"
                      value={draft.html}
                      onChange={(event) => updateDraft({ html: event.target.value })}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
                          event.preventDefault();
                          saveDraft();
                        }
                      }}
                      dir="ltr"
                      spellCheck={false}
                      autoCapitalize="off"
                      autoCorrect="off"
                      className="min-h-[360px] resize-y rounded-xl bg-muted/30 font-mono text-xs leading-6 sm:min-h-[440px]"
                      aria-label={t("ویرایش کد HTML", "Edit HTML source")}
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                      <span>{t("کد در یک فایل HTML ذخیره می‌شود؛ کتابخانه یا سرور لازم نیست.", "Saved as a single HTML file; no package or server required.")}</span>
                      <span className={htmlBytes > MAX_MINI_APP_HTML_BYTES ? "text-destructive" : ""}>{Math.ceil(htmlBytes / 1024)} / 120 KB</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 pb-3">
                  <CardTitle className="flex items-center gap-2 text-base"><Eye className="size-4" />{t("پیش‌نمایش زنده", "Live preview")}</CardTitle>
                  <Button size="sm" variant="outline" onClick={runPreview}><Play className="me-2 size-4" />{t("اجرای آخرین کد", "Run latest source")}</Button>
                </CardHeader>
                <CardContent>
                  {previewDocument ? (
                    <iframe
                      key={previewVersion}
                      ref={previewFrameRef}
                      title={`${draft.name} — ${t("پیش‌نمایش", "preview")}`}
                      srcDoc={previewDocument}
                      sandbox="allow-scripts"
                      referrerPolicy="no-referrer"
                      className="h-[min(72vh,720px)] min-h-[420px] w-full rounded-xl border bg-background"
                    />
                  ) : (
                    <div className="grid min-h-[260px] place-items-center rounded-xl border border-dashed bg-muted/20 p-5 text-center">
                      <div className="space-y-3">
                        <Eye className="mx-auto size-8 text-muted-foreground/70" />
                        <p className="text-sm text-muted-foreground">{t("برای دیدن نتیجه، کد را اجرا کن.", "Run the source to see the result.")}</p>
                        <Button variant="outline" onClick={runPreview}><Play className="me-2 size-4" />{t("اجرای پیش‌نمایش", "Run preview")}</Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </> : emptyPrompt}
          </main>
        </div>
      )}

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
