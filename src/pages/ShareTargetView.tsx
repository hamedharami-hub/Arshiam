import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ListTodo, FileText, Type, AlignLeft, Share2, ArrowRight, ArrowLeft, Wand2, ClipboardPaste } from "lucide-react";
import { toast } from "sonner";
import { useBilingual } from "@/hooks/useBilingual";

const URL_RE = /https?:\/\/[^\s<>"'{}|\\`[\]]+/i;

export default function ShareTargetView() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { T, isEn } = useBilingual();
  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  const incoming = useMemo(() => {
    const title = params.get("title") || "";
    const text = params.get("text") || "";
    const url = params.get("url") || "";
    return [title, text, url].filter(Boolean).join("\n").trim();
  }, [params]);

  const [content, setContent] = useState(incoming);
  const [target, setTarget] = useState<"task" | "note" | "article">("task");
  const [field, setField] = useState<"title" | "body">(() =>
    incoming.length > 80 || incoming.includes("\n") ? "body" : "title",
  );

  const urlInContent = useMemo(() => content.match(URL_RE)?.[0] || "", [content]);

  const paste = async () => {
    try {
      const s = await navigator.clipboard.readText();
      if (!s) return;
      setContent((prev) => (prev ? prev + "\n" + s : s));
    } catch {
      toast.error(T("دسترسی به کلیپ‌بورد داده نشد.", "Clipboard access denied."));
    }
  };

  const submit = () => {
    const text = content.trim();
    if (!text) {
      navigate("/app/today", { replace: true });
      return;
    }

    if (target === "article") {
      const qp = new URLSearchParams();
      if (urlInContent) qp.set("url", urlInContent);
      qp.set("text", text);
      navigate(`/app/rewrite-article?${qp.toString()}`, { replace: true });
      return;
    }

    const qp = new URLSearchParams();
    if (field === "title") {
      qp.set("title", text.slice(0, 200));
    } else {
      // Use first non-empty line as title fallback, rest as body
      const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
      const titleGuess =
        lines[0]?.slice(0, 120) ||
        (target === "task" ? T("تسک از share", "Task from share") : T("نوت از share", "Note from share"));
      qp.set("title", titleGuess);
      qp.set(target === "task" ? "description" : "content", text);
    }
    const path = target === "task" ? "/app/new/task" : "/app/new/note";
    navigate(`${path}?${qp.toString()}`, { replace: true });
  };

  return (
    <div dir={isEn ? "ltr" : "rtl"} className="min-h-screen bg-background p-4 pb-24 page-enter">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/app/today", { replace: true })} className="gap-1">
            <BackIcon className="w-4 h-4" /> {T("لغو", "Cancel")}
          </Button>
          <h1 className="text-base font-bold flex items-center gap-2">
            <Share2 className="w-4 h-4 text-primary" /> {T("ذخیره در ارشناز", "Save to ARSHNAZ")}
          </h1>
          <span className="w-12" />
        </div>

        <Card className="p-4 space-y-5">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">{T("متن دریافتی:", "Received text:")}</div>
            <Button type="button" size="sm" variant="outline" onClick={paste} className="gap-1 h-7 text-xs">
              <ClipboardPaste className="w-3.5 h-3.5" /> {T("چسباندن", "Paste")}
            </Button>
          </div>

          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            dir="auto"
            rows={6}
            className="text-sm"
            placeholder={T("متن share شده...", "Shared text...")}
          />

          {/* 1. destination */}
          <div>
            <div className="text-xs text-muted-foreground mb-2">
              {T("۱. کجا ذخیره بشه؟", "1. Where to save?")}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setTarget("task")}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                  target === "task"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <ListTodo className="w-5 h-5" />
                <span className="text-sm font-medium">{T("تسک", "Task")}</span>
              </button>
              <button
                type="button"
                onClick={() => setTarget("note")}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                  target === "note"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-sm font-medium">{T("نوت", "Note")}</span>
              </button>
              <button
                type="button"
                onClick={() => setTarget("article")}
                className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                  target === "article"
                    ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                    : "border-border hover:bg-accent/40"
                }`}
              >
                <Wand2 className="w-5 h-5" />
                <span className="text-sm font-medium">{T("بازنویسی", "Rewrite")}</span>
              </button>
            </div>
          </div>

          {target !== "article" && (
            <div>
              <div className="text-xs text-muted-foreground mb-2">
                {T("۲. متن در کجا قرار بگیره؟", "2. Where should the text go?")}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setField("title")}
                  className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                    field === "title"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-sm font-medium">{T("عنوان", "Title")}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setField("body")}
                  className={`rounded-xl border p-3 flex flex-col items-center gap-1 transition-all ${
                    field === "body"
                      ? "border-primary bg-primary/10 ring-2 ring-primary/30"
                      : "border-border hover:bg-accent/40"
                  }`}
                >
                  <AlignLeft className="w-5 h-5" />
                  <span className="text-sm font-medium">
                    {target === "task" ? T("توضیحات", "Description") : T("محتوا", "Content")}
                  </span>
                </button>
              </div>
            </div>
          )}

          {target === "article" && !urlInContent && (
            <p className="text-xs text-muted-foreground">
              {T("هیچ لینکی در متن پیدا نشد. لطفاً یک URL اضافه کنید.", "No URL found in the text. Please add a valid link.")}
            </p>
          )}

          <Button onClick={submit} className="w-full" disabled={!content.trim() || (target === "article" && !urlInContent)}>
            {target === "article" ? T("بازنویسی خبر", "Rewrite Article") : T("ادامه", "Continue")}
          </Button>
        </Card>
      </div>
    </div>
  );
}
