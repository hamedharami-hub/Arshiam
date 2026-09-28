import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, Sparkles, Share2, Loader2, Bold, Italic, Underline, Languages, Wand2, ListTree, FileText, Quote } from "lucide-react";
import { toast } from "sonner";
import { callAI, getAILanguage } from "@/lib/ai";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel } from "@/components/ui/dropdown-menu";

/**
 * Floating selection toolbar that appears whenever the user selects text inside
 * any element marked with `data-rich-selection`. Provides app-specific actions
 * (Copy, AI inline edit, Share) instead of relying on the browser/Android system menu.
 *
 * Note: Browsers/Android cannot fully prevent the native context menu from
 * appearing on long-press selection in WebView. This toolbar is positioned with
 * a high z-index and large hit area so it's always reachable.
 */

type Pos = { top: number; left: number; width: number };

const AI_ACTIONS: { key: string; label: string; icon: any }[] = [
  { key: "improve",      label: "✨ Improve writing",        icon: Wand2 },
  { key: "fix_grammar",  label: "✏️ Fix grammar & spelling", icon: Wand2 },
  { key: "summarize",    label: "📝 Summarize",              icon: FileText },
  { key: "expand",       label: "📖 Expand",                 icon: FileText },
  { key: "to_list",      label: "• Turn into list",          icon: ListTree },
  { key: "translate_fa", label: "🇮🇷 Translate to فارسی",     icon: Languages },
  { key: "translate_en", label: "🇬🇧 Translate to English",   icon: Languages },
  { key: "tone_formal",  label: "👔 More formal",            icon: Quote },
  { key: "tone_casual",  label: "😊 More casual",            icon: Quote },
  { key: "explain",      label: "💡 Explain this",           icon: Sparkles },
];

function getSelectionRect(): { rect: DOMRect; container: Element } | null {
  // 1) Native window selection (contenteditable, regular text)
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed && sel.rangeCount > 0) {
    const range = sel.getRangeAt(0);
    const text = sel.toString().trim();
    if (text.length === 0) return null;
    const node = range.commonAncestorContainer;
    const el = (node.nodeType === 1 ? node : node.parentElement) as Element | null;
    if (!el) return null;
    const container = el.closest("[data-rich-selection]");
    if (!container) return null;
    const rect = range.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return null;
    return { rect, container };
  }
  // 2) Textarea / input selection
  const ae = document.activeElement as HTMLElement | null;
  if (ae && (ae.tagName === "TEXTAREA" || (ae.tagName === "INPUT" && (ae as HTMLInputElement).type === "text"))) {
    const ta = ae as HTMLTextAreaElement | HTMLInputElement;
    const container = ta.closest("[data-rich-selection]");
    if (!container) return null;
    const start = ta.selectionStart ?? 0;
    const end = ta.selectionEnd ?? 0;
    if (end - start <= 0) return null;
    return { rect: ta.getBoundingClientRect(), container };
  }
  return null;
}

function getSelectedText(): string {
  const sel = window.getSelection();
  if (sel && !sel.isCollapsed) return sel.toString();
  const ae = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
  if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) {
    const s = ae.selectionStart ?? 0;
    const e = ae.selectionEnd ?? 0;
    return (ae.value || "").slice(s, e);
  }
  return "";
}

function replaceSelectedText(newText: string) {
  const ae = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
  if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) {
    const s = ae.selectionStart ?? 0;
    const e = ae.selectionEnd ?? 0;
    const v = ae.value || "";
    const next = v.slice(0, s) + newText + v.slice(e);
    // Use setter so React picks up the change
    const proto = ae.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")!.set!;
    setter.call(ae, next);
    ae.dispatchEvent(new Event("input", { bubbles: true }));
    ae.setSelectionRange(s, s + newText.length);
    return true;
  }
  // contenteditable
  const sel = window.getSelection();
  if (sel && sel.rangeCount > 0) {
    document.execCommand("insertText", false, newText);
    return true;
  }
  return false;
}

function wrapSelection(prefix: string, suffix = prefix) {
  const ae = document.activeElement as HTMLTextAreaElement | HTMLInputElement | null;
  if (ae && (ae.tagName === "TEXTAREA" || ae.tagName === "INPUT")) {
    const text = getSelectedText();
    if (!text) return;
    replaceSelectedText(prefix + text + suffix);
    return;
  }
  // contenteditable: just wrap text
  const text = getSelectedText();
  if (text) replaceSelectedText(prefix + text + suffix);
}

export function SelectionActionToolbar() {
  const [pos, setPos] = useState<Pos | null>(null);
  const [busy, setBusy] = useState(false);
  const lastSelRef = useRef<string>("");

  useEffect(() => {
    let raf = 0;
    const update = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const info = getSelectionRect();
        if (!info) {
          setPos(null);
          lastSelRef.current = "";
          return;
        }
        const r = info.rect;
        lastSelRef.current = getSelectedText();
        const top = Math.max(8, r.top - 52);
        const left = Math.min(window.innerWidth - 16, Math.max(8, r.left + r.width / 2));
        setPos({ top, left, width: r.width });
      });
    };
    document.addEventListener("selectionchange", update);
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
      cancelAnimationFrame(raf);
    };
  }, []);

  if (!pos) return null;

  const doCopy = async () => {
    const text = getSelectedText();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Copied");
    } catch { toast.error("Copy failed"); }
  };

  const doShare = async () => {
    const text = getSelectedText();
    if (!text) return;
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
      }
    } catch { /* user cancelled */ }
  };

  const runAI = async (action: string) => {
    const text = lastSelRef.current || getSelectedText();
    if (!text.trim()) return;
    setBusy(true);
    const tid = toast.loading("AI is thinking...");
    try {
      const r = await callAI("inline_edit", text, undefined, action, getAILanguage());
      const out = (r.text || "").trim();
      if (!out) throw new Error("Empty result");
      if (action === "explain") {
        // Just show the explanation, don't replace
        toast.success("AI", { id: tid, description: out.slice(0, 400), duration: 8000 });
      } else {
        replaceSelectedText(out);
        toast.success("Applied ✨", { id: tid });
      }
    } catch (e: any) {
      toast.error(e.message || "AI error", { id: tid });
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div
      style={{ top: pos.top, left: pos.left, transform: "translateX(-50%)" }}
      className="fixed z-[2147483646] flex items-center gap-1 rounded-full border bg-background/95 backdrop-blur shadow-elegant px-1.5 py-1 animate-in fade-in slide-in-from-bottom-2"
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <button className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent" title="Bold" onClick={() => wrapSelection("**")}><Bold className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent" title="Italic" onClick={() => wrapSelection("*")}><Italic className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent" title="Underline" onClick={() => wrapSelection("<u>", "</u>")}><Underline className="w-4 h-4" /></button>
      <div className="w-px h-5 bg-border mx-0.5" />
      <button className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent" title="Copy" onClick={doCopy}><Copy className="w-4 h-4" /></button>
      <button className="h-8 w-8 grid place-items-center rounded-full hover:bg-accent" title="Share" onClick={doShare}><Share2 className="w-4 h-4" /></button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-8 px-2 grid place-items-center rounded-full bg-primary text-primary-foreground hover:opacity-90 gap-1 inline-flex" title="AI">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span className="text-xs font-semibold">AI</span>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-80 overflow-y-auto z-[2147483647]">
          <DropdownMenuLabel>AI on selection</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {AI_ACTIONS.map((a) => (
            <DropdownMenuItem key={a.key} onClick={() => runAI(a.key)}>
              <a.icon className="w-3.5 h-3.5 me-2 opacity-70" />
              {a.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>,
    document.body
  );
}
