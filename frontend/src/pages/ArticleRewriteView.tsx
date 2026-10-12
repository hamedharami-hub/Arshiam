import { HeaderTitlePortal } from "@/components/HeaderTitlePortal";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { firebaseStore } from "@/lib/firebaseStore";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { streamAI } from "@/lib/aiStream";
import { useBilingual } from "@/hooks/useBilingual";
import { useRecoverableExit } from "@/hooks/useRecoverableExit";
import {
  ArrowRight,
  ArrowLeft,
  Loader2,
  Wand2,
  Copy,
  Save,
  ListTodo,
  RotateCw,
  ClipboardPaste,
  X,
  Check,
} from "lucide-react";

const URL_RE = /https?:\/\/[^\s<>"'{}|\\`[\]]+/i;

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

const draftKey = (uid: string) => `article-rewrite:draft:v2:${uid}`;
type ArticleDraft = { url: string; text: string; title: string; content: string; updatedAt: number };

function readArticleDraft(uid: string): ArticleDraft | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(draftKey(uid)) || "null");
    if (parsed && typeof parsed.content === "string" && typeof parsed.title === "string") {
      return { url: typeof parsed.url === "string" ? parsed.url : "", text: typeof parsed.text === "string" ? parsed.text : "", title: parsed.title, content: parsed.content, updatedAt: Number(parsed.updatedAt) || 0 };
    }
  } catch { /* storage can be unavailable */ }
  return null;
}

function writeArticleDraft(uid: string, draft: ArticleDraft): boolean {
  try {
    const serialized = JSON.stringify(draft);
    localStorage.setItem(draftKey(uid), serialized);
    return localStorage.getItem(draftKey(uid)) === serialized;
  } catch { return false; }
}

function clearArticleDraft(uid: string) {
  try { localStorage.removeItem(draftKey(uid)); } catch { /* storage can be unavailable */ }
}

export default function ArticleRewriteView() {
  const { user } = useAuth();
  const uid = user?.id ?? "guest";
  return <ArticleRewrite key={uid} uid={uid} />;
}
function ArticleRewrite({ uid }: { uid: string }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { T, isEn } = useBilingual();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const initialUrl = params.get("url") || "";
  const initialText = params.get("text") || "";

  const [restored] = useState(() => readArticleDraft(uid));
  const [url, setUrl] = useState(initialUrl || restored?.url || "");
  const [text, setText] = useState(initialText || restored?.text || "");
  const [title, setTitle] = useState(restored?.title || "");
  const [content, setContent] = useState(restored?.content || "");
  const [streamed, setStreamed] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [retained, setRetained] = useState(true);
  const [retentionAttempt, setRetentionAttempt] = useState(0);
  const activeRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);
  const titleRef = useRef(title);
  const streamedRef = useRef("");
  useRecoverableExit(
    () => (!retained && Boolean(url || text || title || content)) || loading || Boolean(streamed),
    T("نسخهٔ قابل بازیابی از این تغییرات نداریم. از بازنویسی خارج می‌شوی؟", "These changes have no recoverable copy. Leave the rewrite?"),
  );

  const source = useMemo(() => {
    if (url) return url;
    const m = text.match(URL_RE);
    return m ? m[0] : "";
  }, [url, text]);

  useEffect(() => {
    titleRef.current = title;
  }, [title]);

  // Recover the accepted draft after a reload or a failed save.
  useEffect(() => {
    if (!url && !text && !content && !title) return;
    setRetained(writeArticleDraft(uid, { url, text, title, content, updatedAt: Date.now() }));
  }, [uid, url, text, title, content, retentionAttempt]);

  useEffect(() => {
    if (retained && !streamed && !loading) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [retained, content, streamed, loading]);

  useEffect(() => {
    activeRef.current = true;
    if (initialUrl && !content) {
      void rewrite(initialUrl);
    }
    return () => {
      activeRef.current = false;
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rewrite = async (fromUrl?: string) => {
    const targetUrl = fromUrl || url || source;
    if (!targetUrl) {
      toast.error(T("ابتدا یک لینک وارد کنید.", "Please enter a URL first."));
      return;
    }
    if (loading) return; // one regeneration at a time
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setLoading(true);
    // Stream into a separate buffer; the accepted result is kept until accepted.
    streamedRef.current = "";
    setStreamed("");
    try {
      await streamAI({
        mode: "article_rewrite",
        input: { url: targetUrl, text: text || undefined },
        language: isEn ? "en" : "fa",
        signal: ctrl.signal,
        onDelta: (chunk) => { if (!activeRef.current || ctrl.signal.aborted || abortRef.current !== ctrl) return; streamedRef.current += chunk; setStreamed(streamedRef.current); },
      });
      if (ctrl.signal.aborted) return;
    } catch (e) {
      if (activeRef.current && !ctrl.signal.aborted && !isAbortError(e)) {
        toast.error(getErrorMessage(e) || T("خطا در بازنویسی", "Error during rewrite"));
      }
    } finally {
      if (activeRef.current && abortRef.current === ctrl) {
        abortRef.current = null;
        setLoading(false);
      }
    }
  };

  const acceptStreamed = () => {
    const next = streamedRef.current.trim();
    if (!next) return;
    setContent(next);
    if (!titleRef.current) {
      const first = next.split("\n").find((line) => line.trim()) || "";
      if (first) setTitle(first.replace(/^#+\s*/, "").slice(0, 120));
    }
    streamedRef.current = "";
    setStreamed("");
  };

  const discardStreamed = () => {
    streamedRef.current = "";
    setStreamed("");
  };

  const cancelRewrite = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setLoading(false);
    discardStreamed();
  };

  const paste = async () => {
    try {
      const s = await navigator.clipboard.readText();
      if (!s) return;
      const m = s.match(URL_RE);
      if (m) {
        setUrl(m[0]);
        setText(s.replace(m[0], "").trim());
      } else {
        setText(s);
      }
    } catch {
      toast.error(T("دسترسی به کلیپ‌بورد داده نشد.", "Clipboard access denied."));
    }
  };

  const saveNote = async () => {
    if (!user) {
      toast.error(T("ابتدا وارد شوید.", "Please sign in first."));
      return;
    }
    if (!title.trim()) {
      toast.error(T("عنوان الزامی است.", "Title is required."));
      return;
    }
    setSaving(true);
    try {
      const { error } = await firebaseStore.from("notes").insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
      });
      if (error) throw error;
      if (!activeRef.current) return;
      toast.success(T("نوت ذخیره شد.", "Note saved."));
      clearArticleDraft(uid);
      navigate("/app/notes");
    } catch (e) {
      if (!activeRef.current) return;
      toast.error(getErrorMessage(e) || T("خطا در ذخیره", "Error saving"));
    } finally {
      setSaving(false);
    }
  };

  const saveTask = () => {
    const qp = new URLSearchParams();
    qp.set("title", title.trim() || T("خبر", "Article"));
    qp.set("description", content.trim());
    navigate(`/app/new/task?${qp.toString()}`);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      toast.success(T("کپی شد.", "Copied."));
    } catch {
      toast.error(T("کپی نشد.", "Failed to copy."));
    }
  };
  const downloadDraft = () => {
    const blob = new Blob([`${title}\n\n${content}${streamed ? `\n\n--- Unaccepted candidate ---\n${streamed}` : ""}`], { type: "text/plain;charset=utf-8" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = href; link.download = "article-rewrite-draft.txt"; link.click();
    URL.revokeObjectURL(href);
  };
  const leave = () => {
    if ((!retained && (content || title)) || streamed || loading) {
      if (!window.confirm(T("متن ذخیره‌نشده از دست می‌رود. ابتدا آن را کپی یا دانلود کن. با این حال خارج می‌شوی؟", "Unretained text or a candidate will be lost. Copy or download it first. Leave anyway?"))) return;
    }
    navigate(-1);
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="min-h-screen bg-background p-4 pb-safe-bottom page-enter">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={leave} className="gap-1">
            <BackIcon className="w-4 h-4" /> {T("برگشت", "Back")}
          </Button>
          <HeaderTitlePortal title={T("بازنویسی خبر/مقاله", "Article / News Rewrite")} />
          <span className="w-12" />
        </div>
        {!retained && <div role="alert" className="space-y-2 rounded-lg border border-destructive p-3 text-sm"><p>{T("پیش‌نویس در این دستگاه ذخیره نشد. پیش از خروج کپی یا دانلود کن.", "The draft could not be retained on this device. Copy or download it before leaving.")}</p><Button variant="outline" onClick={() => setRetentionAttempt(value => value + 1)}>{T("تلاش دوباره برای ذخیره", "Retry retention")}</Button><Button variant="outline" onClick={downloadDraft}>{T("دانلود پیش‌نویس", "Download draft")}</Button><Button variant="outline" onClick={copy}>{T("کپی", "Copy")}</Button></div>}

        <Card className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{T("لینک", "URL")}</label>
            <div className="flex gap-2">
              <Input
                dir="ltr"
                placeholder="https://..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1 text-sm"
              />
              <Button type="button" size="icon" variant="outline" onClick={paste} title={T("چسباندن از کلیپ‌بورد", "Paste from clipboard")}>
                <ClipboardPaste className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-muted-foreground">{T("متن همراه (اختیاری)", "Accompanying text (optional)")}</label>
            <Textarea
              placeholder={T("متن share شده یا توضیحات...", "Shared text or comments...")}
              value={text}
              onChange={(e) => setText(e.target.value)}
              dir="auto"
              rows={3}
              className="text-sm"
            />
          </div>

          <Button
            onClick={() => rewrite()}
            disabled={!source || loading}
            className="w-full gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? T("در حال بازنویسی...", "Rewriting...") : T("بازنویسی کن", "Rewrite")}
          </Button>
        </Card>

        {streamed && (
          <Card className="p-4 space-y-3 border-primary/40">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs text-muted-foreground flex items-center gap-1">
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Wand2 className="w-4 h-4 text-primary" />}
                {loading ? T("پیش‌نویس در حال تولید…", "Generating candidate…") : T("پیش‌نویس جدید (پذیرفته‌نشده)", "New candidate (not yet accepted)")}
              </label>
              {loading && <Button size="sm" variant="outline" onClick={cancelRewrite} className="gap-1"><X className="w-4 h-4" />{T("لغو", "Cancel")}</Button>}
            </div>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/40 p-3 text-sm leading-7" dir="auto">{streamed}</pre>
            {!loading && (
              <div className="flex flex-wrap gap-2">
                <Button onClick={acceptStreamed} className="gap-1"><Check className="w-4 h-4" />{T("پذیرش", "Accept")}</Button>
                <Button variant="outline" onClick={discardStreamed} className="gap-1">{T("دورانداختن", "Discard")}</Button>
              </div>
            )}
          </Card>
        )}

        {content && (
          <Card className="p-4 space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{T("عنوان", "Title")}</label>
              <Input
                placeholder={T("عنوان بازنویسی‌شده", "Rewritten title")}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-base font-semibold"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-muted-foreground">{T("متن", "Content")}</label>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                dir="auto"
                rows={16}
                className="text-sm leading-7"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={saveNote} disabled={saving || !title.trim()} className="gap-1 flex-1 sm:flex-none">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {T("ذخیره نوت", "Save Note")}
              </Button>
              <Button variant="secondary" onClick={saveTask} className="gap-1 flex-1 sm:flex-none">
                <ListTodo className="w-4 h-4" /> {T("تسک", "Task")}
              </Button>
              <Button variant="outline" onClick={copy} className="gap-1 flex-1 sm:flex-none">
                <Copy className="w-4 h-4" /> {T("کپی", "Copy")}
              </Button>
              <Button variant="outline" onClick={() => rewrite()} disabled={!source || loading} className="gap-1 flex-1 sm:flex-none">
                <RotateCw className="w-4 h-4" /> {T("دوباره", "Retry")}
              </Button>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
